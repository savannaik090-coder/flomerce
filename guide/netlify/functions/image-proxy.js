/**
 * Netlify Function Image Proxy with CDN Caching
 * 
 * This function serves as a proxy between Firebase Storage and your users,
 * implementing proper CDN caching to reduce Firebase Storage bandwidth costs.
 * 
 * Features:
 * - Fetches images from Firebase Storage
 * - Implements long-term CDN caching with Cache-Control headers
 * - Uses Netlify's durable cache for persistence across deploys
 * - Handles binary content correctly with base64 encoding
 * - Provides proper error handling for missing images
 * 
 * Usage: /.netlify/functions/image-proxy?path=productImages/image.jpg
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
let adminApp;
try {
  // Check if default app already exists
  adminApp = admin.app();
  console.log('Using existing Firebase Admin app');
} catch (error) {
  if (error.code === 'app/no-app') {
    // Initialize new app only if it doesn't exist
    try {
      // Use environment variables for Firebase Admin credentials
      const serviceAccount = {
        type: 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID || 'auric-a0c92',
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '6f1ca73b9b4d70574d21eebfb42034fe179467bf',
        private_key: (process.env.FIREBASE_PRIVATE_KEY || `-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCePWdT/LnhkBTe\nrVnfdwYVphLrErwRc+VkmWT7DgIZHlEI40ZBfGvmUX9B9q+/tAjfXaY+xw6USO4g\nNgoz8U6PIq8xbuETE5kWCzTb73DpbCJpSqTAHHWTYf6ozcD783zDizIIcwNNKUz2\nMElvfbHYDtHzav33OynJKdVv59qDNAR6w4Mgd06Mxein71M/aOmd3uoKUrbbKpca\nSnr4ruatetnlxPZNuwX9nM557Ej6f6FpqHRs9aiWs8vctQBfB1kAzd4znN5TqVnI\nhl6Hz6r0uOhH7EdzqvsHTR1S3XB5mv3jk5PFWeK7RyBQVO/Kq1OPt7XJ1Wtf7L2K\nzt0Ki1EVAgMBAAECggEABvjOniky6WjHOp5pqMpeNsL372qGZcB0+W82v0b5ObEX\nwev9kvIP8PhjQn1Ddg9RGsJOClML5eWmtD2dSneVzgGptWRcv1HsO0foHs6Ya3hr\ntbbntl0qowE8zqQuHgu20gjGfg/PM+2fafNrsOFZXhsdDfwHT4bISwgwUrtk6cXl\nqqw/AM/3lcpB94l2NC1JlxTbhHW+hIPZwf6QaXWMLtXYk9RaTOdycJ9xaXKEBgR8\nMnJDIImH/Zucc8DbvOfINStjgyA2kMg/fodgQFwVEJJDr79HgIiSxo0z7zzCyKfU\nLmJZ7rfVOANhTeEJXvjaoMJPJTa07tvhQw6a1BjIAQKBgQDYLg8VnIeU8+Y1lpMX\nsu0t+INusDS5kj6b/RYqEuZUI9p0iEw/eR+EomIF7e8XqOu/9UcO3tHYgGgX/iIE\nOKIAO+znglfSyYsdhsptCSs9JTmvFTiNgx2v1QmYkmc6fUIbnp9fIxvX0eESo582\n5cfGz6ln1jxbwg1heJWMngy1FQKBgQC7Yy/1BiIi2xIq3OzmsNV5vYVz4GksYjN1\nm948xSkycVTpUSd97wFud0zd1aA8wKpWInbNFMwgqjZrW/QQ9hNT/F7A1NiOFr8J\nV7BCjTJr5AlUaj/UBY6j+expzhkHiU2u34a6rbM1s+3Zbp54v89TsFMckSgCT+oT\nmU5hbaMsAQKBgD+hPvtjeVzUdVwsl9sP5VP0o+r+nmZIr3kGg3Ga4oS9kN1gCOFd\n63MEwMlyAT/7jniP33x3BVkuYnU9bhHEAZsECHUUHnmCrRnhxM9XNYzn2hS4sE6m\n2yQYFpz76rqCh+TNSaedE+LweckctA5aj/TqxrgzjMyNT5bzAUHEe4UJAoGBAJKo\n/dba9wqqxRxRDwU678m5gGKCCC7ZqQbqeFS9xxGYy+lUQAF7d3Za3wlccm46KNcD\nYFIAbgc+0RrTvEEuJ1B7XDm2HMuQl/Ia9HQSCJ2Su46bHdu2gb5rFBJ3YPWaC/fL\nMKqY2oM0kPq1bkh5by5D+biJD3RH0Z+HRGZSpfwBAoGAR7aNEPWoNKRx94Tiq0bT\nIhdBb2ynVu2wk/1guqa6Xn2G8azLNVHoYrzIFO5nEWhW7P3zSiDhP+AFOu1/u8mK\n75sN+nKOBgnkaYzDsgQqRlb/UyT9YpJlEuTz1OFcQ3jR4len2Vqh60MZYsVShoue\n2fx+0iyTmC2kAgXrXXS9dj4=\n-----END PRIVATE KEY-----\n`).replace(/\\n/g, '\n'),
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
      console.log('Initialized new Firebase Admin app');
    } catch (initError) {
      console.error('Firebase Admin initialization error:', initError);
    }
  } else {
    console.error('Firebase Admin app error:', error);
  }
}

const bucket = adminApp ? admin.storage().bucket(process.env.FIREBASE_STORAGE_BUCKET || 'auric-a0c92.firebasestorage.app') : null;

/**
 * Netlify Function Handler
 */
exports.handler = async (event, context) => {
  // Enable CORS for all origins
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Get the image path from query parameters first
  const imagePath = event.queryStringParameters?.path;

  if (!imagePath) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Missing image path',
        usage: '/.netlify/functions/image-proxy?path=productImages/image.jpg'
      })
    };
  }

  // Check if Firebase is properly initialized
  if (!adminApp || !bucket) {
    console.log('Firebase Admin SDK not configured, proxying image through Netlify CDN');

    try {
      // Fetch image from Firebase Storage and serve through Netlify CDN
      const directUrl = `https://firebasestorage.googleapis.com/v0/b/auric-a0c92.firebasestorage.app/o/${encodeURIComponent(imagePath)}?alt=media`;

      const response = await fetch(directUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const imageBuffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'image/jpeg';

      // Serve image through Netlify CDN with proper caching
      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable', // 1 year cache
          'Netlify-CDN-Cache-Control': 'public, max-age=31536000, durable', // Netlify CDN specific
        },
        body: Buffer.from(imageBuffer).toString('base64'),
        isBase64Encoded: true
      };

    } catch (error) {
      console.error('Error proxying image:', error);
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Image not found',
          path: imagePath,
          details: error.message
        })
      };
    }
  }

  try {
    // Get file reference
    const file = bucket.file(imagePath);

    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Image not found',
          path: imagePath
        })
      };
    }

    // Download file content
    const [fileBuffer] = await file.download();
    const [metadata] = await file.getMetadata();

    // Determine content type
    const contentType = metadata.contentType || 'application/octet-stream';

    // Generate cache key based on file metadata
    const lastModified = metadata.updated || metadata.timeCreated;
    const etag = metadata.etag || metadata.md5Hash;

    // Check if client has cached version (ETag validation)
    const clientETag = event.headers['if-none-match'];
    if (clientETag && clientETag === etag) {
      return {
        statusCode: 304,
        headers: {
          ...corsHeaders,
          'ETag': etag,
          'Cache-Control': 'public, max-age=0, must-revalidate',
          'Netlify-CDN-Cache-Control': 'public, max-age=31536000, durable, must-revalidate'
        },
        body: ''
      };
    }

    // Return image with proper caching headers
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'ETag': etag,
        'Last-Modified': new Date(lastModified).toUTCString(),

        // Browser cache: Always revalidate to check for updates
        'Cache-Control': 'public, max-age=0, must-revalidate',

        // CDN cache: Long-term caching with durable storage
        // This is the key to bandwidth savings - CDN serves cached images
        'Netlify-CDN-Cache-Control': 'public, max-age=31536000, durable, must-revalidate',

        // Cache tags for selective invalidation
        'Netlify-Cache-Tag': 'images,firebase-storage',

        // Additional performance headers
        'Vary': 'Accept-Encoding'
      },
      body: fileBuffer.toString('base64'),
      isBase64Encoded: true
    };

  } catch (error) {
    console.error('Error fetching image from Firebase Storage:', error);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Failed to retrieve image',
        details: error.message
      })
    };
  }
};