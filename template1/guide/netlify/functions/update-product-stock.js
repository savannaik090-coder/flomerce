/**
 * Netlify Function: Update Product Stock
 * Updates product stock in Firebase Storage after order placement
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
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
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs"
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "auric-a0c92.firebasestorage.app"
    });

    console.log('Firebase Admin initialized for stock updates');
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
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
    const requestData = JSON.parse(event.body);
    const { category, products, productId, previousStock, newStock, quantityReduced, cartProductImage, cartProductName } = requestData;

    if (!category || !products || !productId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Missing required fields: category, products, productId'
        })
      };
    }

    console.log(`Updating stock for product ${productId} in category ${category}`);
    console.log(`Stock change: ${previousStock} -> ${newStock} (reduced by ${quantityReduced})`);

    // Get Firebase Storage bucket
    const bucket = admin.storage().bucket();
    const filePath = `productData/${category}-products.json`;
    const file = bucket.file(filePath);

    // Upload updated products data to Firebase Storage
    const updatedData = JSON.stringify(products, null, 2);
    
    await file.save(updatedData, {
      metadata: {
        contentType: 'application/json',
        cacheControl: 'public, max-age=2592000', // 30 days cache
        customMetadata: {
          lastStockUpdate: new Date().toISOString(),
          updatedProduct: productId,
          stockChange: `${previousStock}->${newStock}`
        }
      }
    });

    console.log(`Successfully updated ${category} products file with new stock for ${productId}`);

    // ✅ TRIGGER NOTIFICATIONS FOR STOCK CHANGES
    try {
      // Find the updated product to get details
      const updatedProduct = products.find(p => p.id === productId || p.productId === productId);
      
      console.log(`\n🔔 STOCK CHANGE TRIGGER FIRED`);
      console.log(`   Product: ${productId}`);
      console.log(`   Stock: ${previousStock} → ${newStock}`);
      console.log(`   Product details found:`, !!updatedProduct);
      
      if (updatedProduct) {
        const productName = updatedProduct.name || updatedProduct.productName || cartProductName || 'Unknown Product';
        // Use cart product image as fallback if not found in products array
        const productImage = updatedProduct.image || updatedProduct.productImage || cartProductImage || '';
        
        console.log(`   Product name: ${productName}`);
        console.log(`   Product image: ${productImage ? productImage.substring(0, 50) + '...' : 'NO IMAGE FOUND'}`);
        console.log(`   Image source: ${updatedProduct.image || updatedProduct.productImage ? 'product data' : cartProductImage ? 'cart' : 'NONE'}`);
        
        // BACK-IN-STOCK: If stock went from 0 to available
        if (previousStock === 0 && newStock > 0) {
          console.log(`\n📦 BACK-IN-STOCK CONDITION MET - Calling automation function...`);
          try {
            const backInStockResponse = await fetch('https://royalmeenakari.netlify.app/.netlify/functions/auto-back-in-stock-alerts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                productId: productId,
                productName: productName,
                productImage: productImage
              })
            });
            const backInStockData = await backInStockResponse.json();
            console.log(`✅ Back-in-stock function response:`, backInStockData);
          } catch (notifError) {
            console.error('❌ Error sending back-in-stock notification:', notifError.message);
          }
        } else {
          console.log(`❌ BACK-IN-STOCK condition NOT met (previousStock: ${previousStock}, newStock: ${newStock})`);
        }
        
        // LOW-STOCK: If stock dropped to 3 or below AND was above 3 before (triggering threshold)
        if (previousStock > 3 && newStock <= 3 && newStock > 0) {
          console.log(`\n⚡ LOW-STOCK CONDITION MET - Calling automation function...`);
          try {
            const lowStockResponse = await fetch('https://royalmeenakari.netlify.app/.netlify/functions/auto-low-stock-alerts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                productId: productId,
                productName: productName,
                productImage: productImage,
                stockRemaining: newStock,
                threshold: 3
              })
            });
            const lowStockData = await lowStockResponse.json();
            console.log(`✅ Low-stock function response:`, lowStockData);
          } catch (notifError) {
            console.error('❌ Error sending low-stock notification:', notifError.message);
          }
        } else {
          console.log(`❌ LOW-STOCK condition NOT met (previousStock: ${previousStock}, newStock: ${newStock})`);
        }
      } else {
        console.log(`❌ CRITICAL: Product details not found in products array`);
      }
    } catch (notificationError) {
      console.error('Error triggering stock notifications:', notificationError.message);
      // Don't fail the main operation
    }

    // Log stock update for audit trail
    try {
      const auditLog = {
        timestamp: new Date().toISOString(),
        action: 'stock_update',
        productId: productId,
        category: category,
        previousStock: previousStock,
        newStock: newStock,
        quantityReduced: quantityReduced,
        source: 'order_placement'
      };

      // Save audit log to Firebase Storage
      const auditFile = bucket.file(`stockLogs/stock-update-${Date.now()}-${productId}.json`);
      await auditFile.save(JSON.stringify(auditLog, null, 2), {
        metadata: {
          contentType: 'application/json'
        }
      });

      console.log('Stock update audit log saved successfully');
    } catch (auditError) {
      console.error('Error saving audit log:', auditError);
      // Don't fail the main operation if audit logging fails
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Stock updated successfully for product ${productId}`,
        productId: productId,
        previousStock: previousStock,
        newStock: newStock,
        quantityReduced: quantityReduced,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Error updating product stock:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: `Failed to update product stock: ${error.message}`,
        timestamp: new Date().toISOString()
      })
    };
  }
};