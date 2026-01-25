// Nazakat Analytics Tracking Script
// This script tracks visitor data and sends it to Firebase Firestore

(function() {
    'use strict';

    // Use the unified Firebase configuration from the main application
    // This ensures all analytics data goes to the same Firebase project
    const firebaseConfig = window.firebaseConfig || {
        // Fallback config if main config not loaded (unified nazakat project)
        apiKey: "AIzaSyAZw6AnBlQUJuF74pcP-VoliQtG6jLRIaI",
        authDomain: "nazakat-ae992.firebaseapp.com",
        projectId: "nazakat-ae992",
        storageBucket: "nazakat-ae992.firebasestorage.app",
        messagingSenderId: "313125797080",
        appId: "1:313125797080:web:c84bc281bbbabae0816bad",
        measurementId: "G-Y4QK5DGNK6"
    };

    let analytics = {
        initialized: false,
        sessionData: null,
        visitorId: null,
        heartbeatInterval: null,
        onlineSessionDoc: null
    };

    // Initialize Firebase (use existing app if available)
    function initFirebase() {
        try {
            // Check if Firebase is available
            if (typeof firebase === 'undefined') {
                console.warn('Firebase SDK not loaded - analytics will be disabled');
                return null;
            }

            // Use existing Firebase app if available, otherwise initialize
            let app;
            if (firebase.apps.length > 0) {
                app = firebase.apps[0];
                console.log('✅ Using existing Firebase app for analytics');
            } else {
                app = firebase.initializeApp(firebaseConfig);
                console.log('✅ Initialized new Firebase app for analytics');
            }
            
            return firebase.firestore();
        } catch (error) {
            console.error('❌ Failed to initialize Firebase for analytics:', error);
            return null;
        }
    }

    // Initialize Analytics
    function initAnalytics() {
        if (analytics.initialized) {
            console.log('⚠️ Nazakat Analytics already initialized');
            return;
        }

        console.log('🔄 Initializing Nazakat Analytics...');
        console.log('🔍 Checking Firebase availability...');

        const db = initFirebase();
        if (!db) {
            console.error('❌ Failed to initialize Firebase for analytics - retrying in 2 seconds');
            setTimeout(initAnalytics, 2000);
            return;
        }

        analytics.initialized = true;
        analytics.visitorId = getOrCreateVisitorId();
        analytics.sessionData = getOrCreateSession();

        console.log('📊 Analytics visitor ID:', analytics.visitorId);
        console.log('📊 Analytics session data:', analytics.sessionData);

        // Track initial page view
        trackPageView();

        // Track page visibility changes
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Track session duration
        window.addEventListener('beforeunload', updateSessionDuration);

        // Track scroll depth
        trackScrollDepth();

        // Start real-time visitor tracking
        startOnlineTracking();

        console.log('✅ Nazakat Analytics initialized with real-time tracking');
    }

    // Generate or retrieve visitor ID
    function getOrCreateVisitorId() {
        let visitorId = localStorage.getItem('nazakat_visitor_id');
        if (!visitorId) {
            visitorId = 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('nazakat_visitor_id', visitorId);
        }
        return visitorId;
    }

    // Get or create session
    function getOrCreateSession() {
        const existingSession = localStorage.getItem('nazakat_session_data');
        const now = Date.now();
        
        if (existingSession) {
            const session = JSON.parse(existingSession);
            // Check if session is still valid (less than 30 minutes old)
            if (now - session.lastActivity < 30 * 60 * 1000) {
                session.lastActivity = now;
                session.pageViews++;
                session.bounced = false; // Multiple pages viewed
                localStorage.setItem('nazakat_session_data', JSON.stringify(session));
                return session;
            }
        }

        // Create new session
        const newSession = {
            sessionId: 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            visitorId: analytics.visitorId,
            startTime: now,
            lastActivity: now,
            pageViews: 1,
            bounced: true,
            scrollDepth: 0,
            timeOnSite: 0
        };

        localStorage.setItem('nazakat_session_data', JSON.stringify(newSession));
        return newSession;
    }

    // Get visitor location data using IP geolocation
    async function getLocationData() {
        try {
            // Check if location is cached (valid for 1 hour)
            const cachedLocation = localStorage.getItem('nazakat_location_cache');
            if (cachedLocation) {
                const cached = JSON.parse(cachedLocation);
                if (Date.now() - cached.timestamp < 3600000) { // 1 hour
                    console.log('📍 Using cached location data');
                    return cached.data;
                }
            }

            console.log('📍 Fetching visitor location data...');
            
            // Use ipapi.co for geolocation (free tier: 1000 requests/day)
            const response = await fetch('https://ipapi.co/json/');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            const locationData = {
                country: data.country_name || 'Unknown',
                countryCode: data.country_code || 'XX',
                region: data.region || 'Unknown',
                city: data.city || 'Unknown',
                latitude: data.latitude || null,
                longitude: data.longitude || null,
                timezone: data.timezone || 'Unknown'
            };

            // Cache location data
            localStorage.setItem('nazakat_location_cache', JSON.stringify({
                data: locationData,
                timestamp: Date.now()
            }));

            console.log('📍 Location data fetched:', locationData);
            return locationData;
            
        } catch (error) {
            console.warn('📍 Failed to get location data:', error);
            // Return default location data
            return {
                country: 'Unknown',
                countryCode: 'XX',
                region: 'Unknown',
                city: 'Unknown',
                latitude: null,
                longitude: null,
                timezone: 'Unknown'
            };
        }
    }

    // Track page view
    async function trackPageView() {
        const db = initFirebase();
        if (!db) return;

        // Get location data before storing visitor data
        const locationData = await getLocationData();
        
        const visitorData = {
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            visitorId: analytics.visitorId,
            sessionId: analytics.sessionData.sessionId,
            page: window.location.pathname,
            pageTitle: document.title,
            referrer: document.referrer || 'direct',
            url: window.location.href,
            userAgent: navigator.userAgent,
            screenResolution: `${screen.width}x${screen.height}`,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            trafficSource: detectTrafficSource(document.referrer),
            deviceType: detectDeviceType(),
            browser: detectBrowser(),
            operatingSystem: detectOperatingSystem(),
            isNewVisitor: analytics.sessionData.pageViews === 1 && !localStorage.getItem('nazakat_returning_visitor'),
            pageLoadTime: performance.timing ? (performance.timing.loadEventEnd - performance.timing.navigationStart) : null,
            // Location data
            country: locationData.country,
            countryCode: locationData.countryCode,
            region: locationData.region,
            city: locationData.city,
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            geoTimezone: locationData.timezone
        };

        // Mark as returning visitor
        localStorage.setItem('nazakat_returning_visitor', 'true');

        // Store in Firestore
        db.collection('analytics_visits').add(visitorData)
            .then(docRef => {
                console.log('Page view tracked:', docRef.id);
            })
            .catch(error => {
                console.error('Error tracking page view:', error);
            });
    }

    // Detect traffic source
    function detectTrafficSource(referrer) {
        if (!referrer) return 'Direct';
        
        try {
            const domain = new URL(referrer).hostname.toLowerCase();
            
            // Search engines
            if (domain.includes('google')) return 'Google';
            if (domain.includes('bing')) return 'Bing';
            if (domain.includes('yahoo')) return 'Yahoo';
            if (domain.includes('duckduckgo')) return 'DuckDuckGo';
            
            // Social media
            if (domain.includes('facebook') || domain.includes('fb.')) return 'Facebook';
            if (domain.includes('instagram')) return 'Instagram';
            if (domain.includes('twitter') || domain.includes('t.co')) return 'Twitter';
            if (domain.includes('linkedin')) return 'LinkedIn';
            if (domain.includes('pinterest')) return 'Pinterest';
            if (domain.includes('youtube')) return 'YouTube';
            if (domain.includes('whatsapp')) return 'WhatsApp';
            if (domain.includes('telegram')) return 'Telegram';
            
            // Other platforms
            if (domain.includes('reddit')) return 'Reddit';
            if (domain.includes('quora')) return 'Quora';
            
            return 'Other Referral';
        } catch (e) {
            return 'Other Referral';
        }
    }

    // Detect device type
    function detectDeviceType() {
        const userAgent = navigator.userAgent.toLowerCase();
        
        if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone')) {
            return 'Mobile';
        }
        if (userAgent.includes('tablet') || userAgent.includes('ipad')) {
            return 'Tablet';
        }
        return 'Desktop';
    }

    // Detect browser
    function detectBrowser() {
        const userAgent = navigator.userAgent;
        
        if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
        if (userAgent.includes('Edg')) return 'Edge';
        if (userAgent.includes('Opera')) return 'Opera';
        
        return 'Other';
    }

    // Detect operating system
    function detectOperatingSystem() {
        const userAgent = navigator.userAgent;
        
        if (userAgent.includes('Windows')) return 'Windows';
        if (userAgent.includes('Mac OS')) return 'macOS';
        if (userAgent.includes('Linux')) return 'Linux';
        if (userAgent.includes('Android')) return 'Android';
        if (userAgent.includes('iOS')) return 'iOS';
        
        return 'Other';
    }

    // Track scroll depth
    function trackScrollDepth() {
        let maxScrollDepth = 0;
        let scrollDepthReported = false;
        
        function updateScrollDepth() {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = Math.round((scrollTop / docHeight) * 100);
            
            if (scrollPercent > maxScrollDepth) {
                maxScrollDepth = scrollPercent;
                
                // Update session data
                if (analytics.sessionData) {
                    analytics.sessionData.scrollDepth = maxScrollDepth;
                    localStorage.setItem('nazakat_session_data', JSON.stringify(analytics.sessionData));
                }
            }

            // Track significant scroll milestones
            if (!scrollDepthReported && (maxScrollDepth >= 75 || scrollPercent >= 90)) {
                trackScrollMilestone(maxScrollDepth);
                scrollDepthReported = true;
            }
        }

        // Throttled scroll listener
        let scrollTimeout;
        window.addEventListener('scroll', function() {
            if (scrollTimeout) clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(updateScrollDepth, 100);
        });
    }

    // Track scroll milestone
    function trackScrollMilestone(scrollDepth) {
        const db = initFirebase();
        if (!db) return;

        db.collection('analytics_engagement').add({
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            visitorId: analytics.visitorId,
            sessionId: analytics.sessionData.sessionId,
            page: window.location.pathname,
            eventType: 'scroll_depth',
            scrollDepth: scrollDepth,
            engaged: scrollDepth >= 50
        }).catch(error => {
            console.error('Error tracking scroll milestone:', error);
        });
    }

    // Handle visibility change
    function handleVisibilityChange() {
        if (document.hidden) {
            // Page hidden - pause heartbeat and update session duration
            if (analytics.heartbeatInterval) {
                clearInterval(analytics.heartbeatInterval);
                analytics.heartbeatInterval = null;
            }
            updateSessionDuration();
        } else {
            // Page visible - resume heartbeat and update last activity
            if (!analytics.heartbeatInterval && analytics.onlineSessionDoc) {
                analytics.heartbeatInterval = setInterval(updateHeartbeat, 30000);
                updateHeartbeat(); // Immediate update
            }
            if (analytics.sessionData) {
                analytics.sessionData.lastActivity = Date.now();
                localStorage.setItem('nazakat_session_data', JSON.stringify(analytics.sessionData));
            }
        }
    }

    // Update session duration
    function updateSessionDuration() {
        if (!analytics.sessionData) return;

        const now = Date.now();
        const timeOnSite = now - analytics.sessionData.startTime;
        analytics.sessionData.timeOnSite = timeOnSite;
        localStorage.setItem('nazakat_session_data', JSON.stringify(analytics.sessionData));

        // End online session
        endOnlineSession();

        // Track session end if significant time spent
        if (timeOnSite > 30000) { // 30 seconds
            const db = initFirebase();
            if (db) {
                db.collection('analytics_sessions').add({
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    visitorId: analytics.visitorId,
                    sessionId: analytics.sessionData.sessionId,
                    duration: timeOnSite,
                    pageViews: analytics.sessionData.pageViews,
                    bounced: analytics.sessionData.bounced,
                    maxScrollDepth: analytics.sessionData.scrollDepth || 0,
                    engaged: timeOnSite > 60000 || analytics.sessionData.pageViews > 1 || analytics.sessionData.scrollDepth > 50
                }).catch(error => {
                    console.error('Error tracking session:', error);
                });
            }
        }
    }

    // Real-time visitor tracking functions
    async function startOnlineTracking() {
        const db = initFirebase();
        if (!db) return;

        try {
            // Create online session document
            const onlineSessionData = {
                visitorId: analytics.visitorId,
                sessionId: analytics.sessionData.sessionId,
                page: window.location.pathname,
                pageTitle: document.title,
                deviceType: detectDeviceType(),
                browser: detectBrowser(),
                startTime: firebase.firestore.FieldValue.serverTimestamp(),
                lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
                isOnline: true
            };

            const docRef = await db.collection('online_sessions').add(onlineSessionData);
            analytics.onlineSessionDoc = docRef;
            
            // Start heartbeat every 30 seconds
            analytics.heartbeatInterval = setInterval(updateHeartbeat, 30000);
            
            console.log('🟢 Online visitor tracking started');
        } catch (error) {
            console.error('❌ Failed to start online tracking:', error);
        }
    }

    async function updateHeartbeat() {
        if (!analytics.onlineSessionDoc) return;
        
        try {
            await analytics.onlineSessionDoc.update({
                lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
                page: window.location.pathname,
                pageTitle: document.title
            });
            console.log('💓 Heartbeat updated');
        } catch (error) {
            console.error('❌ Failed to update heartbeat:', error);
        }
    }

    async function endOnlineSession() {
        if (!analytics.onlineSessionDoc) return;
        
        try {
            await analytics.onlineSessionDoc.update({
                isOnline: false,
                endTime: firebase.firestore.FieldValue.serverTimestamp(),
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Clear heartbeat
            if (analytics.heartbeatInterval) {
                clearInterval(analytics.heartbeatInterval);
                analytics.heartbeatInterval = null;
            }
            
            console.log('🔴 Online session ended');
        } catch (error) {
            console.error('❌ Failed to end online session:', error);
        }
    }

    // Track custom events
    function trackEvent(eventName, eventData = {}) {
        const db = initFirebase();
        if (!db || !analytics.initialized) return;

        db.collection('analytics_events').add({
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            visitorId: analytics.visitorId,
            sessionId: analytics.sessionData ? analytics.sessionData.sessionId : null,
            page: window.location.pathname,
            eventName: eventName,
            eventData: eventData
        }).catch(error => {
            console.error('Error tracking custom event:', error);
        });
    }

    // Public API
    window.NazakatAnalytics = {
        track: trackEvent,
        initialized: function() { return analytics.initialized; }
    };

    // Auto-initialize when DOM is ready or Firebase is available
    function autoInit() {
        console.log('🚀 Nazakat Analytics auto-init started');
        console.log('🔍 Firebase available:', typeof firebase !== 'undefined');
        console.log('🔍 Firebase apps:', typeof firebase !== 'undefined' ? firebase.apps.length : 'N/A');
        
        if (typeof firebase !== 'undefined') {
            console.log('✅ Firebase detected, initializing analytics...');
            initAnalytics();
        } else {
            console.log('⏳ Firebase not yet available, retrying in 1 second...');
            setTimeout(autoInit, 1000);
        }
    }

    // Start initialization
    console.log('📊 Nazakat Analytics script loaded');
    console.log('📊 Document ready state:', document.readyState);
    
    if (document.readyState === 'loading') {
        console.log('📊 Waiting for DOM to load...');
        document.addEventListener('DOMContentLoaded', autoInit);
        // Also try after a delay in case DOM event doesn't fire
        setTimeout(() => {
            if (!analytics.initialized) {
                console.log('📊 DOM event timeout, forcing auto-init...');
                autoInit();
            }
        }, 3000);
    } else {
        console.log('📊 DOM already loaded, starting auto-init...');
        autoInit();
    }
    
    // Additional fallback - force init after 5 seconds if still not initialized
    setTimeout(() => {
        if (!analytics.initialized) {
            console.log('🔧 Final fallback initialization attempt...');
            autoInit();
        }
    }, 5000);

})();