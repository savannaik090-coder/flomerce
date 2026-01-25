/**
 * Netlify Function Image Proxy with CDN Caching
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
let adminApp;
try {
  adminApp = admin.app();
} catch (error) {
  if (error.code === 'app/no-app') {
    try {
      // Use environment variables for Firebase Admin credentials
      const serviceAccount = {
        type: 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: process.env.FIREBASE_CERT_URL
      };

      if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
        throw new Error('Missing required Firebase Admin credentials in environment variables');
      }

      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });
    } catch (initError) {
      console.error('Firebase Admin initialization error:', initError);
    }
  }
}

const bucket = adminApp ? admin.storage().bucket(process.env.FIREBASE_STORAGE_BUCKET) : null;

exports.handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  const imagePath = event.queryStringParameters?.path;
  if (!imagePath) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing path' }) };
  }

  if (!bucket) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Storage not configured' }) };
  }

  try {
    const file = bucket.file(imagePath);
    const [exists] = await file.exists();
    
    if (!exists) {
      return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Image not found' }) };
    }

    const [metadata] = await file.getMetadata();
    
    // Generate ETag from metadata for conditional requests
    const etag = `"${metadata.md5Hash || metadata.generation}"`;
    const ifNoneMatch = event.headers['if-none-match'];
    
    // Return 304 Not Modified if client has current version (saves bandwidth)
    if (ifNoneMatch && ifNoneMatch === etag) {
      console.log('Image not modified, returning 304');
      return {
        statusCode: 304,
        headers: {
          ...corsHeaders,
          'ETag': etag,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Netlify-CDN-Cache-Control': 'public, max-age=31536000, immutable'
        }
      };
    }

    const [buffer] = await file.download();

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': metadata.contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Netlify-CDN-Cache-Control': 'public, max-age=31536000, immutable',
        'ETag': etag
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true
    };
  } catch (error) {
    console.error('Proxy error:', error);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: error.message }) };
  }
};
