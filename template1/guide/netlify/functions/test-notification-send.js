/**
 * Test function to diagnose notification issues
 * Returns detailed error codes from Firebase FCM
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID || "auric-a0c92",
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
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "auric-a0c92.firebasestorage.app"
    });

    console.log('✅ Firebase Admin initialized');
  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
  }
}

const db = admin.firestore();
const messaging = admin.messaging();

exports.handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  try {
    console.log('\n🔍 DIAGNOSTIC TEST STARTING...\n');

    // 1. Check credentials
    console.log('1️⃣ Checking Firebase credentials:');
    console.log(`   Project ID: ${process.env.FIREBASE_PROJECT_ID || 'MISSING'}`);
    console.log(`   Client Email: ${process.env.FIREBASE_CLIENT_EMAIL ? '✅' : '❌ MISSING'}`);
    console.log(`   Private Key: ${process.env.FIREBASE_PRIVATE_KEY ? '✅' : '❌ MISSING'}`);
    console.log(`   VAPID Key: ${process.env.FIREBASE_VAPID_KEY ? '✅' : '❌ MISSING'}`);

    // 2. Fetch all tokens
    console.log('\n2️⃣ Fetching stored tokens:');
    const usersSnapshot = await db.collection('users').get();
    const guestSnapshot = await db.collection('guest_tokens').get();

    const allTokens = [];
    const tokenSources = [];

    usersSnapshot.forEach(doc => {
      const userTokens = doc.data().pushTokens || [];
      userTokens.forEach(token => {
        allTokens.push(token);
        tokenSources.push({ token: token.substring(0, 40) + '...', source: 'user', uid: doc.id });
      });
    });

    guestSnapshot.forEach(doc => {
      const token = doc.data().token;
      if (token) {
        allTokens.push(token);
        tokenSources.push({ token: token.substring(0, 40) + '...', source: 'guest', docId: doc.id });
      }
    });

    console.log(`   Found ${allTokens.length} total tokens:`);
    tokenSources.forEach(ts => {
      console.log(`   - ${ts.source}: ${ts.token}`);
    });

    if (allTokens.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'NO_TOKENS',
          message: 'No tokens found in Firestore',
          details: 'Users need to enable notifications first'
        })
      };
    }

    // 3. Test sending to first token only
    console.log('\n3️⃣ Testing FCM sendMulticast with first token:');
    const testToken = [allTokens[0]];
    
    console.log(`   Sending to token: ${testToken[0].substring(0, 40)}...`);
    console.log(`   Token length: ${testToken[0].length} characters`);

    const response = await messaging.sendMulticast({
      tokens: testToken,
      data: {
        title: 'Test Notification',
        body: 'Diagnostic test',
        timestamp: new Date().toISOString()
      },
      webpushConfig: {
        notification: {
          title: 'Test Title',
          body: 'Test Body',
          icon: '/images/logos/royalmeenakari.png',
          badge: '/images/logos/royalmeenakari.png'
        }
      }
    });

    console.log(`\n4️⃣ Firebase Response:`);
    console.log(`   Success: ${response.successCount}`);
    console.log(`   Failed: ${response.failureCount}`);
    console.log(`   Total: ${response.responses.length}`);

    // 4. Detailed error analysis
    console.log('\n5️⃣ Detailed Error Analysis:');
    const errors = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const error = resp.error;
        console.log(`\n   ❌ Token ${idx}:`);
        console.log(`      Code: ${error?.code || 'UNKNOWN'}`);
        console.log(`      Message: ${error?.message || 'No message'}`);
        console.log(`      Stack: ${error?.stack ? error.stack.substring(0, 100) : 'N/A'}`);
        
        errors.push({
          index: idx,
          code: error?.code,
          message: error?.message,
          fullError: JSON.stringify(error)
        });
      } else {
        console.log(`\n   ✅ Token ${idx}: SUCCESS`);
      }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'DIAGNOSTIC_COMPLETE',
        summary: {
          totalTokens: allTokens.length,
          testTokenSent: 1,
          successCount: response.successCount,
          failureCount: response.failureCount
        },
        credentials: {
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL ? 'set' : 'missing',
          privateKey: process.env.FIREBASE_PRIVATE_KEY ? 'set' : 'missing',
          vapidKey: process.env.FIREBASE_VAPID_KEY ? 'set' : 'missing'
        },
        tokens: tokenSources,
        errors: errors,
        recommendation: response.failureCount > 0 ? 'TOKENS_ARE_INVALID' : 'TOKENS_ARE_VALID'
      })
    };

  } catch (error) {
    console.error('❌ Diagnostic test error:', error.message);
    console.error('Stack:', error.stack);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        status: 'ERROR',
        error: error.message,
        stack: error.stack
      })
    };
  }
};
