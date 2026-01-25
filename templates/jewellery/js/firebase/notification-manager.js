/**
 * Notification Manager
 * Handles Firebase Cloud Messaging setup, token generation, and storage
 */

class NotificationManager {
  constructor() {
    this.messaging = null;
    this.vapidKey = null;
  }

  /**
   * Initialize notification system
   */
  async init() {
    try {
      console.log('🔔 Notification Manager: Initializing...');
      
      // Wait for Firebase to be initialized
      await this.waitForFirebase();
      
      // Check browser support
      if (!('serviceWorker' in navigator)) {
        console.warn('🚫 Service Workers not supported');
        return false;
      }

      if (!('Notification' in window)) {
        console.warn('🚫 Notifications API not supported');
        return false;
      }

      // Get VAPID key from environment
      try {
        const response = await fetch('/api/get-vapid-key');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        this.vapidKey = data.vapidKey;
        console.log('✅ VAPID key retrieved:', this.vapidKey.substring(0, 20) + '...');
      } catch (error) {
        console.warn('⚠️ Could not fetch VAPID key from /api/get-vapid-key:', error.message);
        console.warn('⚠️ Falling back to built-in VAPID key');
        // Fallback to built-in VAPID key if API fails
        this.vapidKey = 'BENFZQbE3p9n6YnjBdDwOySmVUao9Y9ryEH4_PJhsAKUMcUUfYDZV_c3BlZai6G77Rojwy2f0Ab540bfo5w2Mys';
        if (!this.vapidKey) {
          return false;
        }
      }

      if (!this.vapidKey) {
        console.warn('🚫 VAPID key is empty');
        return false;
      }

      // Initialize Firebase Messaging
      try {
        this.messaging = firebase.messaging();
        console.log('✅ Firebase Messaging initialized');
      } catch (error) {
        console.error('❌ Error initializing Firebase Messaging:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Notification Manager initialization error:', error);
      return false;
    }
  }

  /**
   * Wait for Firebase to be initialized
   */
  waitForFirebase() {
    return new Promise((resolve) => {
      // Check if Firebase SDK is loaded (not just messaging module)
      if (window.firebase && typeof window.firebase.app === 'function') {
        console.log('✅ Firebase SDK is available');
        resolve();
      } else {
        console.log('⏳ Waiting for Firebase SDK to load...');
        let attempts = 0;
        const interval = setInterval(() => {
          // Firebase app() function is the reliable indicator that Firebase is ready
          if (window.firebase && typeof window.firebase.app === 'function') {
            clearInterval(interval);
            console.log('✅ Firebase SDK became available');
            resolve();
          }
          attempts++;
          if (attempts > 100) {
            clearInterval(interval);
            console.warn('⚠️ Firebase not available after 10 seconds (100 attempts)');
            // Still resolve to let it try initialization anyway
            resolve();
          }
        }, 100);
      }
    });
  }

  /**
   * Register service worker for push notifications
   */
  async registerServiceWorker() {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/'
        });
        console.log('✅ Service Worker registered:', registration.scope);
        
        // CRITICAL FIX: Wait until the Service Worker is ACTIVE AND CONTROLLING THE PAGE
        // This is essential for Firebase Messaging to work properly
        return new Promise((resolve, reject) => {
          let timeoutId;
          let resolved = false;
          
          const checkReady = () => {
            if (resolved) return;
            
            // Check if SW is active AND is controlling this page
            if (registration.active && navigator.serviceWorker.controller) {
              console.log('✅ Service Worker is active AND controlling this page');
              resolved = true;
              clearTimeout(timeoutId);
              resolve(registration);
              return true;
            }
            return false;
          };
          
          // Immediate check
          if (checkReady()) return;
          
          // Poll every 100ms for faster detection
          const pollInterval = setInterval(() => {
            if (checkReady()) {
              clearInterval(pollInterval);
            }
          }, 100);
          
          // Timeout after 10 seconds (should not take this long)
          timeoutId = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              clearInterval(pollInterval);
              console.warn('⚠️ Service Worker registration timed out, but proceeding...');
              // Still resolve because in some cases the SW might be ready even without controller
              resolve(registration);
            }
          }, 10000);
          
          // Also listen for controller change events
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('📍 Controller change detected');
            if (checkReady()) {
              clearInterval(pollInterval);
            }
          });
        });
      }
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error.message);
      throw error;
    }
  }

  /**
   * Request notification permission and get token
   */
  async requestPermissionAndGetToken() {
    try {
      console.log('🔔 Requesting notification permission...');
      
      // STEP 1: Request permission from browser
      const permission = await Notification.requestPermission();
      console.log('📋 Permission result:', permission);
      
      if (permission !== 'granted') {
        console.log('⚠️ Notification permission denied');
        return null;
      }

      console.log('✅ Permission granted');
      
      // STEP 2: Register service worker and WAIT for it to be ACTIVE
      console.log('⏳ Registering and activating service worker...');
      const registration = await this.registerServiceWorker();
      
      // STEP 3: Brief delay for Firebase to recognize the active service worker controller
      await new Promise(resolve => setTimeout(resolve, 200));
      
      console.log('🔑 Getting FCM token...');
      
      // STEP 4: Now get the token - this should work because SW is active
      let token = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (!token && attempts < maxAttempts) {
        try {
          attempts++;
          console.log(`📌 Token retrieval attempt ${attempts}/${maxAttempts}...`);
          
          token = await this.messaging.getToken({
            vapidKey: this.vapidKey
          });
          
          if (token) {
            console.log('✅ FCM Token received:', token.substring(0, 20) + '...');
            break;
          } else {
            console.warn(`⚠️ Attempt ${attempts}: No token received, retrying...`);
            // Wait before retry
            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        } catch (tokenError) {
          console.error(`❌ Token error on attempt ${attempts}:`, tokenError.message);
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500));
          } else {
            throw tokenError;
          }
        }
      }
      
      if (!token) {
        console.error('❌ Failed to get token after all attempts');
        throw new Error('Could not obtain FCM token - service worker may not be properly activated');
      }

      return token;
    } catch (error) {
      console.error('❌ Error in requestPermissionAndGetToken:', error);
      console.error('   Error message:', error.message);
      console.error('   Error code:', error.code);
      throw error;
    }
  }

  /**
   * Save token to Firestore
   */
  async saveToken(token) {
    try {
      const db = firebase.firestore();
      const auth = firebase.auth();
      const currentUser = auth.currentUser;

      if (currentUser) {
        // Logged-in user - save to user document
        console.log('💾 Saving token for logged-in user:', currentUser.uid);
        
        // Check if token already exists
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const existingTokens = userDoc.data()?.pushTokens || [];
        
        if (!existingTokens.includes(token)) {
          await db.collection('users').doc(currentUser.uid).update({
            pushTokens: firebase.firestore.FieldValue.arrayUnion(token),
            lastTokenUpdate: new Date()
          });
          console.log('✅ Token saved to user document');
        } else {
          console.log('⚠️ Token already exists for this user');
        }
      } else {
        // Guest user - save to guest_tokens collection
        console.log('💾 Saving token for guest user');
        
        await db.collection('guest_tokens').add({
          token: token,
          createdAt: new Date(),
          userAgent: navigator.userAgent
        });
        console.log('✅ Token saved to guest_tokens collection');
      }

      return true;
    } catch (error) {
      console.error('❌ Error saving token:', error);
      throw error;
    }
  }

  /**
   * Setup message listener for foreground notifications
   */
  setupMessageListener(callback) {
    if (this.messaging) {
      console.log('👂 Setting up message listener...');
      
      this.messaging.onMessage((payload) => {
        console.log('📬 Message received in foreground:', payload);
        
        const notificationData = {
          title: payload.notification?.title || 'New Promotion',
          body: payload.notification?.body || 'Check out our latest offers!',
          icon: '/images/logos/royalmeenakari.png'
        };

        if (callback) {
          callback(notificationData);
        }

        // Also show browser notification if in foreground
        if (Notification.permission === 'granted') {
          new Notification(notificationData.title, {
            body: notificationData.body,
            icon: notificationData.icon,
            tag: 'auric-notification'
          });
        }
      });
    }
  }

  /**
   * Unsubscribe from notifications
   */
  async deleteToken() {
    try {
      if (this.messaging) {
        await this.messaging.deleteToken();
        console.log('✅ Token deleted');
        return true;
      }
    } catch (error) {
      console.error('❌ Error deleting token:', error);
      return false;
    }
  }
}

// Create global instance
const notificationManager = new NotificationManager();
