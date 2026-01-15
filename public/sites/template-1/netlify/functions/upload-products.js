
/**
 * Netlify Function: Upload Products
 * 
 * Handles uploading product JSON files to Firebase Storage
 * Supports the new multi-image product data structure
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
let adminApp;
try {
  // Check if default app already exists
  adminApp = admin.app();
  console.log('Using existing Firebase Admin app for upload');
} catch (error) {
  if (error.code === 'app/no-app') {
    // Initialize new app only if it doesn't exist
    try {
      // Use environment variables for Firebase Admin credentials
      const serviceAccount = {
        type: 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID || 'auric-a0c92',
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: process.env.FIREBASE_CERT_URL
      };

      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'auric-a0c92.firebasestorage.app'
      });
      console.log('Initialized new Firebase Admin app for upload');
    } catch (initError) {
      console.error('Firebase Admin initialization error:', initError);
    }
  } else {
    console.error('Firebase Admin app error:', error);
  }
}

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Method not allowed'
      })
    };
  }

  try {
    // Parse multipart form data
    const contentType = event.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      throw new Error('Content-Type must be multipart/form-data');
    }

    // For simplicity, we'll parse the base64 body manually
    // In a production environment, you might want to use a library like busboy
    const body = Buffer.from(event.body, 'base64').toString();
    const boundary = contentType.split('boundary=')[1];
    
    if (!boundary) {
      throw new Error('No boundary found in Content-Type');
    }

    // Parse the multipart data to extract the file
    const parts = body.split(`--${boundary}`);
    let fileContent = '';
    let fileName = '';

    for (const part of parts) {
      if (part.includes('Content-Disposition: form-data') && part.includes('filename=')) {
        const lines = part.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('filename=')) {
            fileName = lines[i].match(/filename="([^"]+)"/)?.[1] || '';
          }
          if (lines[i].trim() === '' && i + 1 < lines.length) {
            // File content starts after empty line
            fileContent = lines.slice(i + 1).join('\n').replace(/\r?\n$/, '');
            break;
          }
        }
        break;
      }
    }

    if (!fileName || !fileContent) {
      throw new Error('No file found in request');
    }

    console.log(`Uploading file: ${fileName}`);

    // Upload to Firebase Storage
    const bucket = admin.storage().bucket();
    const file = bucket.file(`productData/${fileName}`);

    await file.save(fileContent, {
      metadata: {
        contentType: 'application/json',
        cacheControl: 'public, max-age=2592000' // 30 days cache
      }
    });

    console.log(`File uploaded successfully: ${fileName}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Products uploaded successfully',
        filename: fileName
      })
    };

  } catch (error) {
    console.error('Error uploading products:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        message: 'Failed to upload products'
      })
    };
  }
};
