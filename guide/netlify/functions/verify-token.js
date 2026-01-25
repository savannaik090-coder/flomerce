/**
 * Test a specific FCM token to verify if it's valid
 * POST /api/verify-token
 * Body: { token: "..." }
 */

const admin = require('firebase-admin');

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
  } catch (error) {
    console.error('Firebase init error:', error.message);
  }
}

const messaging = admin.messaging();

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
    const { token } = JSON.parse(event.body || '{}');

    if (!token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Token is required' })
      };
    }

    console.log(`\n🔍 VERIFYING TOKEN: ${token.substring(0, 40)}...`);
    console.log(`Token length: ${token.length}`);
    console.log(`Token format: ${token.includes(':') ? 'VALID (has :)' : 'INVALID (missing :)'}`);

    // Test by sending a test message
    console.log('\n📤 Attempting to send test message...');
    const response = await messaging.send({
      token: token,
      notification: {
        title: 'Token Verification',
        body: 'This is a test to verify your token is valid'
      },
      webpushConfig: {
        notification: {
          title: 'Token Verification',
          body: 'This is a test to verify your token is valid',
          icon: '/images/logos/royalmeenakari.png'
        }
      }
    });

    console.log(`✅ MESSAGE SENT SUCCESSFULLY`);
    console.log(`   Message ID: ${response}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'VALID',
        message: 'Token is legitimate and working',
        messageId: response,
        tokenInfo: {
          length: token.length,
          format: 'VALID_FCM_FORMAT',
          hasColon: token.includes(':'),
          startsWithAPA: token.includes('APA91b')
        }
      })
    };

  } catch (error) {
    console.error('❌ ERROR:', error.code);
    console.error('   Message:', error.message);

    // Map Firebase error codes
    const errorMap = {
      'messaging/invalid-registration-token': 'Token is INVALID - wrong format or expired',
      'messaging/mismatched-sender-id': 'Token is for DIFFERENT Firebase project',
      'messaging/message-rate-exceeded': 'Rate limit exceeded',
      'messaging/third-party-auth-error': 'Firebase auth failed',
      'messaging/instance-id-error': 'Token registration error'
    };

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        status: 'INVALID',
        error: error.code,
        message: errorMap[error.code] || error.message,
        details: {
          code: error.code,
          fullMessage: error.message
        }
      })
    };
  }
};
