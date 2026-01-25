/**
 * Netlify Function: diagnose-tokens
 * Deep diagnostic of all stored tokens and their validity
 */

const admin = require('firebase-admin');

function initializeFirebase() {
  if (admin.apps.length > 0) {
    return true;
  }

  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const projectId = process.env.FIREBASE_PROJECT_ID || "auric-a0c92";
    
    if (!privateKey || !clientEmail) {
      console.error('❌ Missing Firebase credentials in diagnose endpoint');
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

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "auric-a0c92.firebasestorage.app"
    });
    return true;
  } catch (error) {
    console.error('❌ Firebase diagnose init failed:', error.message);
    return false;
  }
}

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
    console.log('\n🔬 DEEP TOKEN DIAGNOSTIC STARTING...\n');

    if (!initializeFirebase()) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Firebase initialization failed' })
      };
    }

    const db = admin.firestore();
    const messaging = admin.messaging();

    // Get all tokens
    const usersSnapshot = await db.collection('users').get();
    const guestSnapshot = await db.collection('guest_tokens').get();

    const diagnostics = {
      users: [],
      guests: [],
      analysis: {}
    };

    // Analyze user tokens
    console.log(`📊 Analyzing ${usersSnapshot.size} user documents...`);
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      const tokens = userData.pushTokens || [];
      console.log(`   User ${doc.id}: ${tokens.length} tokens`);
      
      tokens.forEach((token, idx) => {
        const analysis = {
          index: idx,
          type: typeof token,
          length: token?.length || 0,
          isString: typeof token === 'string',
          isEmpty: !token || token.length === 0,
          startsWith: token?.substring(0, 50) || 'NULL',
          endsWith: token?.substring(token.length - 20) || 'NULL',
          sampleFCMToken: token?.substring(0, 100) + (token?.length > 100 ? '...' : '')
        };
        
        diagnostics.users.push({
          uid: doc.id,
          ...analysis,
          raw: token // Store actual token for testing
        });

        console.log(`      Token ${idx}: length=${analysis.length}, type=${analysis.type}, valid=${analysis.isString && !analysis.isEmpty}`);
      });
    });

    // Analyze guest tokens
    console.log(`\n📊 Analyzing ${guestSnapshot.size} guest documents...`);
    guestSnapshot.forEach(doc => {
      const guestData = doc.data();
      const token = guestData.token;
      
      console.log(`   Guest ${doc.id}:`);
      console.log(`      token field type: ${typeof token}`);
      console.log(`      token value: ${token?.substring(0, 50) || 'NULL'}...`);
      console.log(`      full data keys: ${Object.keys(guestData).join(', ')}`);
      
      const analysis = {
        index: 0,
        type: typeof token,
        length: token?.length || 0,
        isString: typeof token === 'string',
        isEmpty: !token || token.length === 0,
        startsWith: token?.substring(0, 50) || 'NULL',
        endsWith: token?.substring(token.length - 20) || 'NULL',
        rawData: guestData,
        sampleFCMToken: token?.substring(0, 100) + (token?.length > 100 ? '...' : '')
      };

      diagnostics.guests.push({
        docId: doc.id,
        ...analysis,
        raw: token
      });
    });

    // Test sending to first valid token
    console.log(`\n🧪 Testing FCM send...\n`);
    
    const allTokens = [...diagnostics.users, ...diagnostics.guests]
      .filter(t => t.isString && !t.isEmpty && t.length > 100)
      .map(t => t.raw);

    console.log(`Found ${allTokens.length} valid tokens for testing`);

    if (allTokens.length > 0) {
      const testToken = allTokens[0];
      console.log(`Testing with first token: ${testToken.substring(0, 50)}...`);

      try {
        const response = await messaging.sendMulticast({
          tokens: [testToken],
          data: {
            test: 'diagnostic'
          },
          webpushConfig: {
            notification: {
              title: 'Diagnostic Test',
              body: 'Testing notification delivery'
            }
          }
        });

        console.log(`FCM Response: success=${response.successCount}, failed=${response.failureCount}`);
        
        diagnostics.analysis.fCMTest = {
          tokenTested: testToken.substring(0, 50) + '...',
          successCount: response.successCount,
          failureCount: response.failureCount,
          responses: response.responses.map((r, idx) => ({
            index: idx,
            success: r.success,
            errorCode: r.error?.code,
            errorMessage: r.error?.message
          }))
        };
      } catch (fcmError) {
        console.error(`FCM Error: ${fcmError.message}`);
        diagnostics.analysis.fCMTest = {
          error: fcmError.message,
          stack: fcmError.stack.substring(0, 200)
        };
      }
    }

    diagnostics.analysis.summary = {
      totalUsers: usersSnapshot.size,
      totalUserTokens: diagnostics.users.length,
      totalGuests: guestSnapshot.size,
      totalGuestTokens: diagnostics.guests.length,
      validUserTokens: diagnostics.users.filter(t => t.isString && !t.isEmpty).length,
      validGuestTokens: diagnostics.guests.filter(t => t.isString && !t.isEmpty).length
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(diagnostics, null, 2)
    };

  } catch (error) {
    console.error('❌ Diagnostic error:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        stack: error.stack
      })
    };
  }
};
