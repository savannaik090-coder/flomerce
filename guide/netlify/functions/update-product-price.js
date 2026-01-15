/**
 * Netlify Function: Update Product Price
 * Updates product price and triggers price-drop notifications
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
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs"
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "auric-a0c92.firebasestorage.app"
    });

    console.log('Firebase Admin initialized for price updates');
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, message: 'Method not allowed' })
    };
  }

  try {
    const { category, products, productId, oldPrice, newPrice } = JSON.parse(event.body);

    if (!category || !products || !productId || !oldPrice || !newPrice) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Missing required fields: category, products, productId, oldPrice, newPrice'
        })
      };
    }

    console.log(`Updating price for product ${productId} in category ${category}`);
    console.log(`Price change: ₹${oldPrice} -> ₹${newPrice}`);

    // Update product data in Firebase Storage
    const bucket = admin.storage().bucket();
    const filePath = `productData/${category}-products.json`;
    const file = bucket.file(filePath);

    const updatedData = JSON.stringify(products, null, 2);
    
    await file.save(updatedData, {
      metadata: {
        contentType: 'application/json',
        cacheControl: 'public, max-age=2592000',
        customMetadata: {
          lastPriceUpdate: new Date().toISOString(),
          updatedProduct: productId,
          priceChange: `${oldPrice}->${newPrice}`
        }
      }
    });

    console.log(`Successfully updated ${category} products file with new price for ${productId}`);

    // ✅ TRIGGER PRICE DROP NOTIFICATION (ONLY if price decreased)
    console.log(`\n🔔 PRICE UPDATE TRIGGER FIRED`);
    console.log(`   Product: ${productId}`);
    console.log(`   Price: ₹${oldPrice} → ₹${newPrice}`);
    
    if (newPrice < oldPrice) {
      try {
        const updatedProduct = products.find(p => p.id === productId || p.productId === productId);
        
        console.log(`   Product details found:`, !!updatedProduct);
        
        if (updatedProduct) {
          console.log(`\n📉 PRICE-DROP CONDITION MET - Calling automation function...`);
          console.log(`   Product name: ${updatedProduct.name || updatedProduct.productName}`);
          console.log(`   Discount: ${Math.round(((oldPrice - newPrice) / oldPrice) * 100)}%`);
          
          const priceDropResponse = await fetch('https://royalmeenakari.netlify.app/.netlify/functions/auto-price-drop-alerts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: productId,
              productName: updatedProduct.name || updatedProduct.productName,
              productImage: updatedProduct.image || updatedProduct.productImage || '',
              oldPrice: oldPrice,
              newPrice: newPrice
            })
          });
          
          const priceDropData = await priceDropResponse.json();
          console.log(`✅ Price-drop function response:`, priceDropData);
        } else {
          console.log(`❌ CRITICAL: Product details not found in products array`);
        }
      } catch (notifError) {
        console.error('Error sending price-drop notification:', notifError.message);
        // Don't fail the main operation
      }
    } else {
      console.log(`ℹ️ Price increase (not a price drop), no notification sent`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Price updated successfully for product ${productId}`,
        productId: productId,
        oldPrice: oldPrice,
        newPrice: newPrice,
        notificationSent: newPrice < oldPrice,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Error updating product price:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: `Failed to update product price: ${error.message}`,
        timestamp: new Date().toISOString()
      })
    };
  }
};
