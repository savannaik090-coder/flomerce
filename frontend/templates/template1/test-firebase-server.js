// Server-side Firebase test for analytics
const admin = require('firebase-admin');

// Test Firebase Admin connectivity
async function testFirebaseAnalytics() {
    try {
        console.log('🔥 Testing Firebase Admin connectivity for analytics...');
        
        // Check if Firebase Admin is already initialized
        let app;
        if (admin.apps.length === 0) {
            console.log('⚠️ Firebase Admin not initialized. Need to set up service account.');
            console.log('❌ Cannot test Firebase connectivity without proper setup.');
            return false;
        } else {
            app = admin.apps[0];
            console.log('✅ Using existing Firebase Admin app');
        }
        
        const db = admin.firestore();
        
        // Test read access to analytics_visits collection
        console.log('📊 Testing Firestore access to analytics_visits...');
        const snapshot = await db.collection('analytics_visits').limit(5).get();
        console.log(`📈 Found ${snapshot.size} analytics visits in database`);
        
        if (snapshot.size > 0) {
            snapshot.forEach(doc => {
                const data = doc.data();
                console.log(`📊 Visit: ${data.page} | ${data.trafficSource} | ${data.timestamp?.toDate ? data.timestamp.toDate() : data.timestamp}`);
            });
        } else {
            console.log('⚠️ No analytics visits found - this confirms the tracking system is broken');
        }
        
        // Test write access by adding a test analytics entry
        console.log('✍️ Testing analytics data write...');
        const testData = {
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            visitorId: 'server_test_' + Date.now(),
            sessionId: 'server_session_' + Date.now(),
            page: '/server-test',
            pageTitle: 'Server Test Page',
            referrer: 'server-test',
            url: 'http://localhost:5000/server-test',
            userAgent: 'Server Test Agent',
            screenResolution: '1920x1080',
            viewport: '1920x1080',
            language: 'en-US',
            trafficSource: 'Server Test',
            deviceType: 'Server',
            browser: 'Node.js',
            operatingSystem: 'Linux',
            isNewVisitor: true,
            pageLoadTime: 100
        };
        
        const docRef = await db.collection('analytics_visits').add(testData);
        console.log(`✅ Successfully wrote test analytics data! Document ID: ${docRef.id}`);
        
        // Check analytics_sessions collection too
        const sessionsSnapshot = await db.collection('analytics_sessions').limit(3).get();
        console.log(`📊 Found ${sessionsSnapshot.size} analytics sessions in database`);
        
        return true;
        
    } catch (error) {
        console.error('❌ Firebase Analytics test failed:', error.message);
        return false;
    }
}

// Run the test
testFirebaseAnalytics()
    .then(success => {
        if (success) {
            console.log('🎉 Firebase Analytics test completed successfully!');
        } else {
            console.log('💥 Firebase Analytics test failed!');
        }
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('💥 Test crashed:', error);
        process.exit(1);
    });