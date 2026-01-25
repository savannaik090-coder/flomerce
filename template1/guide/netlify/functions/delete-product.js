/**
 * Netlify Function: Delete Product
 * 
 * Handles deleting products from Firebase Storage product JSON files
 * Supports DELETE requests to /.netlify/functions/delete-product
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK using environment variables
if (!admin.apps.length) {
  try {
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID || "auric-a0c92",
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_CERT_URL
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'auric-a0c92.firebasestorage.app'
    });
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }

  // Allow both DELETE and POST requests for compatibility
  if (event.httpMethod !== 'DELETE' && event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Only DELETE and POST methods allowed'
      })
    };
  }

  try {
    // Parse request body
    const requestData = JSON.parse(event.body);
    const { productId, category } = requestData;

    if (!productId || !category) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Product ID and category are required'
        })
      };
    }

    console.log(`Deleting product ${productId} from ${category} category...`);

    // Get Firebase Storage bucket
    const bucket = admin.storage().bucket();
    
    // Load existing products
    const file = bucket.file(`productData/${category}-products.json`);
    
    let existingProducts = [];
    try {
      const [fileContents] = await file.download();
      existingProducts = JSON.parse(fileContents.toString());
    } catch (error) {
      if (error.code === 404) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'Product category file not found'
          })
        };
      }
      throw error;
    }

    // Find the product to delete
    const productIndex = existingProducts.findIndex(p => p.id === productId);
    if (productIndex === -1) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Product not found'
        })
      };
    }

    const productToDelete = existingProducts[productIndex];
    console.log(`Found product to delete: ${productToDelete.name}`);

    // Remove the product from the array
    existingProducts.splice(productIndex, 1);

    // Save updated product list
    const updatedData = JSON.stringify(existingProducts, null, 2);
    await file.save(updatedData, {
      metadata: {
        contentType: 'application/json',
        cacheControl: 'public, max-age=2592000'
      }
    });

    console.log(`Product ${productId} deleted successfully. Remaining products: ${existingProducts.length}`);

    // Optionally, clean up product images from Firebase Storage
    // (This is commented out to preserve images that might be referenced elsewhere)
    /*
    if (productToDelete.images && productToDelete.images.length > 0) {
      const imageDeletePromises = productToDelete.images.map(async (image) => {
        try {
          // Extract image path from URL
          const urlParts = image.url.split('/');
          const imagePath = urlParts[urlParts.length - 1].split('?')[0];
          const imageFile = bucket.file(`productImages/${imagePath}`);
          await imageFile.delete();
          console.log(`Deleted image: ${imagePath}`);
        } catch (imgError) {
          console.warn(`Could not delete image: ${image.url}`, imgError.message);
        }
      });
      
      await Promise.allSettled(imageDeletePromises);
    }
    */

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Product "${productToDelete.name}" deleted successfully`,
        deletedProduct: {
          id: productToDelete.id,
          name: productToDelete.name,
          category: category
        },
        remainingCount: existingProducts.length
      })
    };

  } catch (error) {
    console.error('Error deleting product:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        message: 'Failed to delete product'
      })
    };
  }
};