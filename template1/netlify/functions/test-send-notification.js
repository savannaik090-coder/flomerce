/**
 * Netlify Function: test-send-notification
 * Test endpoint to manually send a notification to users
 * Used to verify the notification system is working
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_CERT_URL
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });

    console.log('✅ Firebase Admin initialized for test');
  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
  }
}

let db = null;
let messaging = null;
let isInitialized = false;

function initializeFirebase() {
  if (isInitialized && admin.apps.length > 0) {
    return true;
  }

  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    
    if (!privateKey || !clientEmail) {
      console.error('❌ Missing Firebase credentials in test endpoint');
      return false;
    }

    const serviceAccount = {
      type: "service_account",
      project_id: projectId,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || "",
      private_key: privateKey.includes('\\n') ? privateKey.replace(/\\n/g, '\n') : privateKey,
      client_email: clientEmail,
      client_id: process.env.FIREBASE_CLIENT_ID || "",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_CERT_URL || ""
    };

    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });
    }

    db = admin.firestore();
    messaging = admin.messaging();
    isInitialized = true;
    
    console.log(`✅ Firebase test endpoint initialized`);
    return true;
  } catch (error) {
    console.error('❌ Firebase test init failed:', error.message);
    isInitialized = false;
    return false;
  }
}

exports.handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  try {
    console.log('\n🧪 MANUAL TEST NOTIFICATION STARTING...\n');

    if (!initializeFirebase()) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Firebase initialization failed' })
      };
    }

    // Get all tokens
    const usersSnapshot = await db.collection('users').get();
    const guestSnapshot = await db.collection('guest_tokens').get();

    const allTokens = [];
    const tokenDetails = [];

    // Collect user tokens
    usersSnapshot.forEach(doc => {
      const userTokens = doc.data().pushTokens || [];
      userTokens.forEach((token, idx) => {
        allTokens.push(token);
        tokenDetails.push({
          source: 'user',
          uid: doc.id,
          tokenIndex: idx,
          tokenPreview: token.substring(0, 40) + '...',
          tokenLength: token.length
        });
      });
    });

    // Collect guest tokens
    guestSnapshot.forEach(doc => {
      const token = doc.data().token;
      if (token) {
        allTokens.push(token);
        tokenDetails.push({
          source: 'guest',
          docId: doc.id,
          tokenPreview: token.substring(0, 40) + '...',
          tokenLength: token.length
        });
      }
    });

    console.log(`📊 Found ${allTokens.length} total tokens`);
    console.log(`   Users contributed: ${usersSnapshot.size} documents`);
    console.log(`   Guests contributed: ${guestSnapshot.size} documents`);

    if (allTokens.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          status: 'NO_TOKENS_FOUND',
          message: 'No user tokens found. Users need to enable notifications first.',
          instructions: '1. Go to any page on the website\n2. Click "Enable Notifications"\n3. Grant permission when prompted\n4. Then try sending a notification from admin panel',
          tokenCount: 0
        })
      };
    }

    // Send test notification
    const testMessage = {
      notification: {
        title: '🧪 Test Notification',
        body: 'If you see this, the notification system is working!'
      },
      data: {
        link: '/',
        timestamp: new Date().toISOString(),
        type: 'test'
      },
      webpushConfig: {
        headers: {
          'TTL': '86400'
        },
        notification: {
          title: '🧪 Test Notification',
          body: 'If you see this, the notification system is working!',
          icon: '/images/logos/royalmeenakari.png',
          badge: '/images/logos/royalmeenakari.png',
          tag: 'test-notification'
        },
        fcmOptions: {
          link: '/'
        }
      }
    };

    console.log('\n📤 Sending test notification to all tokens...');

    const batchSize = 500;
    let successCount = 0;
    let failureCount = 0;
    const errors = [];

    for (let i = 0; i < allTokens.length; i += batchSize) {
      const batch = allTokens.slice(i, i + batchSize);
      console.log(`   Batch ${Math.floor(i / batchSize) + 1}: Sending to ${batch.length} tokens...`);

      try {
        const response = await messaging.sendMulticast({
          tokens: batch,
          notification: testMessage.notification,
          data: testMessage.data,
          webpushConfig: testMessage.webpushConfig
        });

        successCount += response.successCount;
        failureCount += response.failureCount;

        console.log(`   ✅ Batch result: ${response.successCount} sent, ${response.failureCount} failed`);

        // Log detailed errors
        if (response.failureCount > 0) {
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              const token = batch[idx];
              const errorInfo = {
                tokenPreview: token.substring(0, 40) + '...',
                errorCode: resp.error?.code || 'UNKNOWN',
                errorMessage: resp.error?.message || 'Unknown error'
              };
              errors.push(errorInfo);
              console.warn(`      ❌ Error: ${errorInfo.errorCode} - ${errorInfo.errorMessage}`);
            }
          });
        }
      } catch (batchError) {
        console.error(`   ❌ Batch error:`, batchError.message);
        failureCount += batch.length;
        errors.push({
          batchError: batchError.message
        });
      }
    }

    console.log(`\n✨ TEST COMPLETE:`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${failureCount}`);
    console.log(`   📊 Total: ${allTokens.length}\n`);

    const success = successCount > 0;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success,
        status: success ? 'TEST_SUCCESSFUL' : 'TEST_FAILED',
        message: success 
          ? `Test notification sent successfully to ${successCount} users!` 
          : 'Test notification failed to send to any users',
        summary: {
          totalTokens: allTokens.length,
          successCount,
          failureCount,
          userTokens: usersSnapshot.size,
          guestTokens: guestSnapshot.size
        },
        tokenDetails: tokenDetails.slice(0, 10), // First 10 for debugging
        errors: errors.slice(0, 5), // First 5 errors
        recommendation: failureCount > 0 && successCount === 0 
          ? 'All tokens failed. Check if VAPID key is correct and tokens are still valid.'
          : successCount > 0 && failureCount > 0
          ? `${successCount} tokens are valid. ${failureCount} tokens may be expired and should be cleaned up.`
          : 'System working perfectly!'
      })
    };

  } catch (error) {
    console.error('❌ Test error:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        status: 'ERROR',
        error: error.message,
        stack: error.stack.substring(0, 200)
      })
    };
  }
};
