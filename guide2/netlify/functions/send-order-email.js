/**
 * Netlify Function: Send Order Email
 * 
 * Sends order confirmation emails to customer and shop owner
 * Handles POST requests to /.netlify/functions/send-order-email
 */

const emailService = require('./utils/email-service');
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

    console.log('Firebase Admin initialized for send-order-email');
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

/**
 * Fetch missing userSelectedCurrency from Firebase if not provided
 */
async function enrichOrderDataWithCurrency(orderData) {
  try {
    console.log('\n=== ENRICHMENT START ===');
    console.log('Input - userSelectedCurrency:', orderData.userSelectedCurrency);
    console.log('Input - status:', orderData.status);
    console.log('Input - orderReference:', orderData.orderReference);
    console.log('Input - products count:', orderData.products ? orderData.products.length : 0);
    
    // EARLY EXIT: If userSelectedCurrency is already set and we have priceDisplay/totalDisplay, we're good
    if (orderData.userSelectedCurrency && 
        orderData.products && 
        orderData.products.length > 0 && 
        orderData.products[0].priceDisplay !== undefined &&
        orderData.orderTotalDisplay !== undefined) {
      console.log('✓ Data is COMPLETE - userSelectedCurrency, priceDisplay, totalDisplay all present');
      console.log('=== ENRICHMENT END (complete) ===\n');
      return orderData;
    }

    // FOR CANCELLATIONS: Fetch complete original order from Firebase
    if (orderData.status && orderData.status.toLowerCase() === 'cancelled' && orderData.orderReference) {
      console.log('\n🔍 CANCELLATION DETECTED - Fetching original order from Firebase');
      
      const bucket = admin.storage().bucket();
      const ordersFile = bucket.file('orders/orders.json');
      const [exists] = await ordersFile.exists();
      
      if (exists) {
        const [fileContents] = await ordersFile.download();
        const allOrders = JSON.parse(fileContents.toString());
        console.log(`✓ Firebase has ${allOrders.length} orders`);
        
        const originalOrder = allOrders.find(o => o.orderReference === orderData.orderReference);
        
        if (originalOrder) {
          console.log('✓ FOUND original order in Firebase');
          console.log('  - userSelectedCurrency:', originalOrder.userSelectedCurrency);
          console.log('  - orderTotalDisplay:', originalOrder.orderTotalDisplay);
          console.log('  - products:', originalOrder.products ? originalOrder.products.length : 0);
          
          // CRITICAL FIX: Copy ALL currency-related fields from original order
          if (originalOrder.userSelectedCurrency) {
            orderData.userSelectedCurrency = originalOrder.userSelectedCurrency;
            console.log('  ✓ SET userSelectedCurrency to:', originalOrder.userSelectedCurrency);
          }
          
          if (originalOrder.orderTotalDisplay !== undefined) {
            orderData.orderTotalDisplay = originalOrder.orderTotalDisplay;
            console.log('  ✓ SET orderTotalDisplay to:', originalOrder.orderTotalDisplay);
          }
          
          if (originalOrder.orderTotal !== undefined) {
            orderData.orderTotal = originalOrder.orderTotal;
            console.log('  ✓ SET orderTotal to:', originalOrder.orderTotal);
          }
          
          // Replace entire products array with original to preserve all pricing fields
          if (originalOrder.products && originalOrder.products.length > 0) {
            orderData.products = originalOrder.products.map((product, idx) => {
              const enrichedProduct = {
                name: product.name || product.productName,
                price: product.price,
                quantity: product.quantity,
                priceDisplay: product.priceDisplay,
                totalDisplay: product.totalDisplay,
                total: product.total
              };
              console.log(`  ✓ Product ${idx}: price=${product.price}, priceDisplay=${product.priceDisplay}, totalDisplay=${product.totalDisplay}`);
              return enrichedProduct;
            });
            console.log(`✓ REPLACED products array with ${orderData.products.length} items from original`);
          }
        } else {
          console.warn('⚠️ Original order NOT found in Firebase with reference:', orderData.orderReference);
        }
      } else {
        console.warn('⚠️ orders.json does not exist in Firebase');
      }
    }

    // FALLBACK: If we still don't have userSelectedCurrency, try to infer from priceDisplay
    if (!orderData.userSelectedCurrency && orderData.products && orderData.products.length > 0) {
      const firstProduct = orderData.products[0];
      if (firstProduct.priceDisplay !== undefined && firstProduct.price !== undefined) {
        const ratio = firstProduct.priceDisplay / firstProduct.price;
        let inferredCurrency = 'INR';
        
        // Exchange rates for reference
        if (ratio > 0.009 && ratio < 0.013) inferredCurrency = 'USD';
        else if (ratio > 0.009 && ratio < 0.012) inferredCurrency = 'EUR';
        else if (ratio > 0.008 && ratio < 0.010) inferredCurrency = 'GBP';
        
        console.log(`⚠️ Inferred currency from price ratio: ${ratio} -> ${inferredCurrency}`);
        orderData.userSelectedCurrency = inferredCurrency;
      }
    }

    // FINAL FALLBACK: Default to INR
    if (!orderData.userSelectedCurrency) {
      console.warn('⚠️ FINAL FALLBACK: Setting currency to INR');
      orderData.userSelectedCurrency = 'INR';
    }

    console.log('\n✓ ENRICHMENT COMPLETE:');
    console.log('  - Final userSelectedCurrency:', orderData.userSelectedCurrency);
    console.log('  - Final orderTotalDisplay:', orderData.orderTotalDisplay);
    console.log('  - Final products:', orderData.products ? orderData.products.length : 0);
    if (orderData.products && orderData.products.length > 0) {
      console.log('  - First product priceDisplay:', orderData.products[0].priceDisplay);
      console.log('  - First product totalDisplay:', orderData.products[0].totalDisplay);
    }
    console.log('=== ENRICHMENT END ===\n');
    
    return orderData;
  } catch (error) {
    console.error('❌ CRITICAL ERROR in enrichOrderDataWithCurrency:', error);
    console.log('Defaulting to INR as fallback');
    orderData.userSelectedCurrency = orderData.userSelectedCurrency || 'INR';
    return orderData;
  }
}

exports.handler = async (event, context) => {
  // Set CORS headers - allow all origins for development
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
  
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204, // No content
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
    console.log('Environment check:', {
      emailUser: process.env.EMAIL_USER ? 'set' : 'missing',
      emailPass: process.env.EMAIL_PASS ? 'set' : 'missing',
      emailService: process.env.EMAIL_SERVICE || 'not set'
    });

    // Use hardcoded credentials if environment variables are not available
    if (!process.env.EMAIL_USER && !process.env.EMAIL_PASS) {
      console.log('Using fallback email credentials');
      process.env.EMAIL_USER = 'nazakatwebsite24@gmail.com';
      process.env.EMAIL_PASS = 'dhpn qlei gfoa iivm';
      process.env.EMAIL_SERVICE = 'gmail';
    }
    
    // Parse the request body
    let orderData;
    try {
      orderData = JSON.parse(event.body);
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Invalid request body format. JSON expected.'
        })
      };
    }
    
    // Validate required data
    // For delivery confirmations, products may be optional
    const isDeliveryConfirmation = orderData.status && orderData.status.toLowerCase() === 'delivered';
    
    if (!orderData || !orderData.customer) {
      console.error('Missing required order data:', {
        hasOrderData: !!orderData,
        hasCustomer: !!(orderData && orderData.customer),
        hasProducts: !!(orderData && orderData.products),
        isDeliveryConfirmation
      });
      
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Missing required order data',
          debug: {
            hasOrderData: !!orderData,
            hasCustomer: !!(orderData && orderData.customer),
            hasProducts: !!(orderData && orderData.products),
            isDeliveryConfirmation
          }
        })
      };
    }
    
    // For non-delivery orders, products are required
    if (!isDeliveryConfirmation && !orderData.products) {
      console.error('Missing products for order confirmation');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Missing products for order confirmation'
        })
      };
    }
    
    // Ensure products array exists (for delivery confirmations, it can be empty)
    if (!orderData.products) {
      orderData.products = [];
    }
    
    console.log('Received order email request for:', orderData.orderReference);
    console.log('Order status:', orderData.status);
    console.log('Is delivery confirmation:', orderData.status && orderData.status.toLowerCase() === 'delivered');
    console.log('Order data keys:', Object.keys(orderData));
    console.log('Initial userSelectedCurrency:', orderData.userSelectedCurrency);
    
    // Enrich order data with missing currency information from Firebase
    orderData = await enrichOrderDataWithCurrency(orderData);
    console.log('Final userSelectedCurrency after enrichment:', orderData.userSelectedCurrency);
    
    // Send emails
    console.log('Calling emailService.sendOrderEmails...');
    const result = await emailService.sendOrderEmails(orderData);
    
    console.log('Email service result:', result);
    
    if (result.success) {
      console.log('✅ Order emails sent successfully for:', orderData.orderReference);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Order emails sent successfully',
          result
        })
      };
    } else {
      console.error('❌ Failed to send order emails:', result.error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Failed to send order emails',
          error: result.error
        })
      };
    }
  } catch (error) {
    console.error('Error in send-order-email function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Server error while sending order emails',
        error: error.message
      })
    };
  }
};