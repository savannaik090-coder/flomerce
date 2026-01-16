const express = require('express');
const path = require('path');
const cors = require('cors');
const ShiprocketService = require('./services/shiprocket');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Firebase Admin SDK
function initializeFirebaseAdmin() {
  try {
    if (!admin.apps.length) {
      let serviceAccount = null;
      
      // Try parsing FIREBASE_SERVICE_ACCOUNT_KEY first (combined JSON)
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        try {
          serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        } catch (e) {
          console.log('⚠️ FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON, trying individual env vars...');
        }
      }
      
      // If no combined key, try building from individual env vars
      if (!serviceAccount && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
        serviceAccount = {
          type: "service_account",
          project_id: process.env.FIREBASE_PROJECT_ID,
          private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '',
          private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          client_email: process.env.FIREBASE_CLIENT_EMAIL || '',
          client_id: process.env.FIREBASE_CLIENT_ID || '',
          auth_uri: "https://accounts.google.com/o/oauth2/auth",
          token_uri: "https://oauth2.googleapis.com/token",
          auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
          client_x509_cert_url: process.env.FIREBASE_CERT_URL || ''
        };
        console.log('✅ Built service account from individual env vars');
      }
      
      if (serviceAccount && serviceAccount.project_id) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log('✅ Firebase Admin SDK initialized successfully');
      } else {
        console.log('⚠️ Firebase Admin SDK not fully configured');
        console.log('💡 Set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, etc. or add FIREBASE_SERVICE_ACCOUNT_KEY');
      }
    }
  } catch (error) {
    console.log('⚠️ Firebase Admin SDK initialization error:', error.message);
  }
}

initializeFirebaseAdmin();

// Initialize Shiprocket service
let shiprocketService = null;
try {
  shiprocketService = new ShiprocketService();
  console.log('Shiprocket service initialized successfully');
} catch (error) {
  console.error('Failed to initialize Shiprocket service:', error.message);
}

// Enable CORS for all routes
app.use(cors());

// Parse JSON bodies for all routes
app.use(express.json());

// Serve static files from the current directory
app.use(express.static('.'));

// API route for new product notifications
app.post('/api/new-product-notification', async (req, res) => {
    try {
        const { productId, productName, productImage } = req.body;
        console.log('[API] New product notification received:', { productId, productName });

        if (!productId || !productName) {
            return res.status(400).json({ error: 'Missing productId or productName' });
        }

        // Get automatic notification preferences
        const db = admin.firestore();
        const settingsDoc = await db.collection('settings').doc('notifications').get();
        const settings = settingsDoc.data() || {};
        
        if (settings.autoNotifyNewProduct === false) {
            console.log('[API] New product notifications are disabled');
            return res.json({ message: 'New product notifications are disabled', sent: 0 });
        }

        // Fetch FCM tokens
        const userTokens = [];
        const guestTokens = [];

        const usersSnapshot = await db.collection('users').get();
        usersSnapshot.forEach(doc => {
            const fcmTokens = doc.data().fcmTokens || [];
            if (Array.isArray(fcmTokens) && fcmTokens.length > 0) {
                userTokens.push(...fcmTokens);
            }
        });

        const guestSnapshot = await db.collection('guest_tokens').get();
        guestSnapshot.forEach(doc => {
            const tokens = doc.data().tokens || [];
            if (Array.isArray(tokens) && tokens.length > 0) {
                guestTokens.push(...tokens);
            }
        });

        const allTokens = [...userTokens, ...guestTokens];
        console.log(`[API] Found ${allTokens.length} tokens (${userTokens.length} users, ${guestTokens.length} guests)`);

        if (allTokens.length === 0) {
            return res.json({ message: 'No tokens found', sent: 0, failed: 0 });
        }

        // Send notifications
        let sentCount = 0;
        let failedCount = 0;

        for (const token of allTokens) {
            try {
                await admin.messaging().send({
                    notification: {
                        title: '✨ New Product Added!',
                        body: `Check out our latest: ${productName}`
                    },
                    data: {
                        link: '/shop.html',
                        productId: productId,
                        notificationType: 'newProduct'
                    },
                    webpush: {
                        fcmOptions: { link: '/shop.html' }
                    },
                    token: token
                });
                sentCount++;
                console.log(`[API] Sent to token: ${token.substring(0, 10)}...`);
            } catch (error) {
                failedCount++;
                console.error(`[API] Failed to send to token: ${error.message}`);
                
                // Remove invalid tokens
                if (error.code === 'messaging/invalid-registration-token') {
                    try {
                        const userQuery = await db.collection('users').where('fcmTokens', 'array-contains', token).get();
                        userQuery.forEach(doc => {
                            doc.ref.update({ fcmTokens: admin.firestore.FieldValue.arrayRemove(token) });
                        });
                    } catch (e) {
                        console.error('[API] Error removing invalid token:', e);
                    }
                }
            }
        }

        console.log(`[API] Notification complete. Sent: ${sentCount}, Failed: ${failedCount}`);
        res.json({ 
            message: 'Notifications sent',
            sent: sentCount, 
            failed: failedCount,
            total: allTokens.length
        });
    } catch (error) {
        console.error('[API] Error:', error);
        res.status(500).json({ error: 'Failed to send notifications', details: error.message });
    }
});

// Netlify functions compatibility endpoint
app.get('/.netlify/functions/load-products', async (req, res) => {
  try {
    // Import the Netlify function
    const netlifyFunction = require('./netlify/functions/load-products');

    // Create mock Netlify event object
    const event = {
      queryStringParameters: req.query,
      headers: req.headers,
      httpMethod: 'GET',
      path: '/.netlify/functions/load-products'
    };

    // Create mock context
    const context = {};

    // Call the Netlify function
    const result = await netlifyFunction.handler(event, context);

    // Set response headers
    if (result.headers) {
      Object.keys(result.headers).forEach(key => {
        res.setHeader(key, result.headers[key]);
      });
    }

    // Send response
    res.status(result.statusCode || 200);

    if (result.body) {
      try {
        const body = JSON.parse(result.body);
        res.json(body);
      } catch (e) {
        res.send(result.body);
      }
    } else {
      res.end();
    }

  } catch (error) {
    console.error('Error in load-products function:', error);
    res.status(500).json({
      success: false,
      products: [],
      error: `Failed to load products: ${error.message}`,
      message: 'Please check configuration and try again'
    });
  }
});

// Update product stock endpoint
app.post('/.netlify/functions/update-product-stock', async (req, res) => {
  try {
    // Import the Netlify function
    const netlifyFunction = require('./netlify/functions/update-product-stock');

    // Create mock Netlify event object
    const event = {
      body: JSON.stringify(req.body),
      headers: req.headers,
      httpMethod: 'POST',
      path: '/.netlify/functions/update-product-stock'
    };

    // Create mock context
    const context = {};

    // Call the Netlify function
    const result = await netlifyFunction.handler(event, context);

    // Set response headers
    if (result.headers) {
      Object.keys(result.headers).forEach(key => {
        res.setHeader(key, result.headers[key]);
      });
    }

    // Send response
    res.status(result.statusCode || 200);

    if (result.body) {
      try {
        const body = JSON.parse(result.body);
        res.json(body);
      } catch (e) {
        res.send(result.body);
      }
    } else {
      res.end();
    }

  } catch (error) {
    console.error('Error in update-product-stock function:', error);
    res.status(500).json({
      success: false,
      error: `Failed to update product stock: ${error.message}`,
      message: 'Please check configuration and try again'
    });
  }
});

// Delete product endpoint
app.delete('/.netlify/functions/delete-product', async (req, res) => {
  try {
    // Import the Netlify delete function
    const netlifyFunction = require('./netlify/functions/delete-product');

    // Create mock Netlify event object
    const event = {
      body: JSON.stringify(req.body),
      headers: req.headers,
      httpMethod: 'DELETE',
      path: '/.netlify/functions/delete-product'
    };

    // Create mock context
    const context = {};

    // Call the Netlify function
    const result = await netlifyFunction.handler(event, context);

    // Set response headers
    if (result.headers) {
      Object.keys(result.headers).forEach(key => {
        res.setHeader(key, result.headers[key]);
      });
    }

    // Send response
    res.status(result.statusCode || 200);

    if (result.body) {
      try {
        const body = JSON.parse(result.body);
        res.json(body);
      } catch (e) {
        res.send(result.body);
      }
    } else {
      res.end();
    }

  } catch (error) {
    console.error('Error in delete-product function:', error);
    res.status(500).json({
      success: false,
      error: `Failed to delete product: ${error.message}`,
      message: 'Please check configuration and try again'
    });
  }
});

// Image proxy endpoint
app.get('/.netlify/functions/image-proxy', async (req, res) => {
  try {
    // Import the Netlify image-proxy function
    const imageProxyFunction = require('./netlify/functions/image-proxy');

    // Create mock Netlify event object
    const event = {
      queryStringParameters: req.query,
      headers: req.headers,
      httpMethod: 'GET',
      path: '/.netlify/functions/image-proxy'
    };

    // Create mock context
    const context = {};

    // Call the Netlify function
    const result = await imageProxyFunction.handler(event, context);

    // Set response headers
    if (result.headers) {
      Object.keys(result.headers).forEach(key => {
        res.setHeader(key, result.headers[key]);
      });
    }

    // Send response
    res.status(result.statusCode || 200);

    if (result.body) {
      // For binary data (images), we need to handle it differently
      if (result.isBase64Encoded) {
        const buffer = Buffer.from(result.body, 'base64');
        res.send(buffer);
      } else {
        try {
          const body = JSON.parse(result.body);
          res.json(body);
        } catch (e) {
          res.send(result.body);
        }
      }
    } else {
      res.end();
    }

  } catch (error) {
    console.error('Error in image-proxy function:', error);
    res.status(500).json({
      success: false,
      error: `Failed to proxy image: ${error.message}`,
      message: 'Please check configuration and try again'
    });
  }
});

// Direct email service for verification emails (bypassing Netlify function for local dev)
app.post('/.netlify/functions/send-verification-email', async (req, res) => {
  try {
    const nodemailer = require('nodemailer');
    const emailData = req.body;

    console.log('Sending verification email to:', emailData.customer.email);

    // Validate required data
    if (!emailData.customer || !emailData.customer.email) {
      throw new Error('Customer email is required to send verification email');
    }

    // Get email credentials
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    if (!emailUser || !emailPass) {
      console.error('Email credentials check:', {
        user: emailUser ? 'configured' : 'missing',
        pass: emailPass ? 'configured' : 'missing'
      });
      throw new Error('Email credentials not configured. Please set EMAIL_USER and EMAIL_PASS environment variables.');
    }

    // Create transporter
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass.replace(/\s+/g, ''), // Remove spaces from app password
      },
      debug: false,
      logger: false,
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    });

    const { customer, verificationUrl } = emailData;

    // Generate HTML content for verification email
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
              .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #28a745; padding-bottom: 20px; }
              .logo { font-size: 28px; font-weight: bold; color: #28a745; }
              .verify-button { display: inline-block; background-color: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
              .warning-box { background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #666; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <div class="logo">Nazakat</div>
                  <h2 style="color: #28a745; margin: 10px 0;">📧 Verify Your Email Address</h2>
              </div>

              <p>Hello ${customer.firstName || 'Valued Customer'},</p>

              <p>Welcome to Nazakat! We're excited to have you join our community of saree enthusiasts.</p>

              <p>To complete your account setup, please verify your email address by clicking the button below:</p>

              <div style="text-align: center; margin: 30px 0;">
                  <a href="${verificationUrl}" class="verify-button">Verify My Email</a>
              </div>

              <div class="warning-box">
                  <p><strong>⚠️ Important:</strong></p>
                  <ul style="margin: 10px 0; padding-left: 20px;">
                      <li>This verification link will expire in 24 hours for security reasons</li>
                      <li>You must verify your email before you can log in</li>
                      <li>If you didn't create this account, please ignore this email</li>
                  </ul>
              </div>

              <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 5px; font-family: monospace;">${verificationUrl}</p>

              <p>Thank you for choosing Nazakat for your saree collection needs!</p>

              <div class="footer">
                  <p>Nazakat - Your trusted saree destination</p>
                  <p>Email: nazakatwebsite24@gmail.com</p>
                  <p style="font-size: 12px; color: #999;">This is an automated email. Please do not reply to this email.</p>
              </div>
          </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"Nazakat - Email Verification" <${emailUser}>`,
      to: customer.email,
      subject: '📧 Please verify your email address - Nazakat',
      html: htmlContent,
      headers: {
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal',
        'X-Mailer': 'Nazakat E-commerce Platform v1.0',
        'Reply-To': 'nazakatwebsite24@gmail.com',
        'Message-ID': `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@nazakat.com>`,
        'Return-Path': emailUser,
        'Organization': 'Nazakat Jewelry'
      }
    };

    // Send the email
    const result = await transporter.sendMail(mailOptions);
    console.log('Verification email sent successfully:', result.messageId);

    res.status(200).json({
      success: true,
      messageId: result.messageId
    });

  } catch (error) {
    console.error('Error sending verification email:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Password reset email endpoint
app.post('/.netlify/functions/send-password-reset-email', async (req, res) => {
  try {
    // Clear require cache to ensure fresh module load with correct environment
    const functionPath = './netlify/functions/send-password-reset-email';
    delete require.cache[require.resolve(functionPath)];

    // Import the Netlify password reset email function
    const netlifyFunction = require(functionPath);

    // Create mock Netlify event object
    const event = {
      body: JSON.stringify(req.body),
      headers: req.headers,
      httpMethod: 'POST',
      path: '/.netlify/functions/send-password-reset-email'
    };

    // Create mock context with environment variables access
    const context = {
      env: process.env
    };

    // Ensure environment variables are available
    process.env.EMAIL_USER = process.env.EMAIL_USER;
    process.env.EMAIL_PASS = process.env.EMAIL_PASS;

    // Call the Netlify function
    const result = await netlifyFunction.handler(event, context);

    // Set response headers
    if (result.headers) {
      Object.keys(result.headers).forEach(key => {
        res.setHeader(key, result.headers[key]);
      });
    }

    // Send response
    res.status(result.statusCode || 200);

    if (result.body) {
      try {
        const body = JSON.parse(result.body);
        res.json(body);
      } catch (e) {
        res.send(result.body);
      }
    } else {
      res.end();
    }

  } catch (error) {
    console.error('Error in send-password-reset-email function:', error);
    res.status(500).json({
      success: false,
      error: `Failed to send password reset email: ${error.message}`,
      message: 'Please check email configuration and try again'
    });
  }
});

// Shiprocket API endpoints

// Create shipment endpoint
app.post('/api/shipping/create-order', async (req, res) => {
  try {
    if (!shiprocketService) {
      return res.status(500).json({
        success: false,
        error: 'Shipping service not available'
      });
    }

    const orderData = req.body;
    console.log('Creating shipment for order:', orderData.order_id);

    const result = await shiprocketService.createOrder(orderData);

    res.json({
      success: true,
      data: result,
      message: 'Shipment created successfully'
    });

  } catch (error) {
    console.error('Error creating shipment:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to create shipment'
    });
  }
});

// Track order endpoint
app.get('/api/shipping/track/:trackingId', async (req, res) => {
  try {
    if (!shiprocketService) {
      return res.status(500).json({
        success: false,
        error: 'Shipping service not available'
      });
    }

    const { trackingId } = req.params;
    console.log('Tracking order:', trackingId);

    const result = await shiprocketService.trackOrder(trackingId);

    res.json({
      success: true,
      data: result,
      message: 'Order tracking retrieved successfully'
    });

  } catch (error) {
    console.error('Error tracking order:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to track order'
    });
  }
});

// Get courier services endpoint
app.post('/api/shipping/courier-services', async (req, res) => {
  try {
    if (!shiprocketService) {
      return res.status(500).json({
        success: false,
        error: 'Shipping service not available'
      });
    }

    const { pickup_postcode, delivery_postcode, weight, cod } = req.body;
    console.log('Getting courier services for:', pickup_postcode, 'to', delivery_postcode);

    const result = await shiprocketService.getCourierServices(pickup_postcode, delivery_postcode, weight, cod);

    res.json({
      success: true,
      data: result,
      message: 'Courier services retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting courier services:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to get courier services'
    });
  }
});

// Generate AWB endpoint
app.post('/api/shipping/generate-awb', async (req, res) => {
  try {
    if (!shiprocketService) {
      return res.status(500).json({
        success: false,
        error: 'Shipping service not available'
      });
    }

    const { shipment_id, courier_id } = req.body;
    console.log('Generating AWB for shipment:', shipment_id, 'with courier:', courier_id);

    const result = await shiprocketService.generateAWB(shipment_id, courier_id);

    res.json({
      success: true,
      data: result,
      message: 'AWB generated successfully'
    });

  } catch (error) {
    console.error('Error generating AWB:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to generate AWB'
    });
  }
});

// Get orders endpoint
app.get('/api/shipping/orders', async (req, res) => {
  try {
    if (!shiprocketService) {
      return res.status(500).json({
        success: false,
        error: 'Shipping service not available'
      });
    }

    const page = req.query.page || 1;
    const per_page = req.query.per_page || 10;
    console.log('Getting orders - page:', page, 'per_page:', per_page);

    const result = await shiprocketService.getOrders(page, per_page);

    res.json({
      success: true,
      data: result,
      message: 'Orders retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting orders:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to get orders'
    });
  }
});

// Test Shiprocket connection endpoint
app.get('/api/shipping/test-connection', async (req, res) => {
  try {
    if (!shiprocketService) {
      return res.status(500).json({
        success: false,
        error: 'Shipping service not available'
      });
    }

    console.log('Testing Shiprocket connection...');

    // Try to authenticate
    await shiprocketService.authenticate();

    res.json({
      success: true,
      message: 'Shiprocket connection successful',
      test_mode: true
    });

  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to connect to Shiprocket'
    });
  }
});

// Manual AWB generation endpoint
app.post('/api/shipping/assign-awb', async (req, res) => {
  try {
    if (!shiprocketService) {
      return res.status(500).json({
        success: false,
        error: 'Shipping service not available'
      });
    }

    const { shipment_id, courier_id } = req.body;

    if (!shipment_id || !courier_id) {
      return res.status(400).json({
        success: false,
        error: 'shipment_id and courier_id are required'
      });
    }

    const result = await shiprocketService.generateAWB(shipment_id, courier_id);

    res.json({
      success: true,
      data: result,
      message: 'AWB assigned successfully'
    });

  } catch (error) {
    console.error('Error assigning AWB:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to assign AWB'
    });
  }
});

// Schedule pickup endpoint
app.post('/api/shipping/schedule-pickup', async (req, res) => {
  try {
    if (!shiprocketService) {
      return res.status(500).json({
        success: false,
        error: 'Shipping service not available'
      });
    }

    const { shipment_id } = req.body;

    if (!shipment_id) {
      return res.status(400).json({
        success: false,
        error: 'shipment_id is required'
      });
    }

    const result = await shiprocketService.schedulePickup(shipment_id);

    res.json({
      success: true,
      data: result,
      message: 'Pickup scheduled successfully'
    });

  } catch (error) {
    console.error('Error scheduling pickup:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to schedule pickup'
    });
  }
});

// Generate label endpoint
app.post('/api/shipping/generate-label', async (req, res) => {
  try {
    if (!shiprocketService) {
      return res.status(500).json({
        success: false,
        error: 'Shipping service not available'
      });
    }

    const { shipment_id } = req.body;

    if (!shipment_id) {
      return res.status(400).json({
        success: false,
        error: 'shipment_id is required'
      });
    }

    const result = await shiprocketService.generateLabel(shipment_id);

    res.json({
      success: true,
      data: result,
      message: 'Label generated successfully'
    });

  } catch (error) {
    console.error('Error generating label:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to generate label'
    });
  }
});

// Generate manifest endpoint
app.post('/api/shipping/generate-manifest', async (req, res) => {
  try {
    if (!shiprocketService) {
      return res.status(500).json({
        success: false,
        error: 'Shipping service not available'
      });
    }

    const { shipment_ids } = req.body;

    if (!shipment_ids || !Array.isArray(shipment_ids)) {
      return res.status(400).json({
        success: false,
        error: 'shipment_ids array is required'
      });
    }

    const result = await shiprocketService.generateManifest(shipment_ids);

    res.json({
      success: true,
      data: result,
      message: 'Manifest generated successfully'
    });

  } catch (error) {
    console.error('Error generating manifest:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to generate manifest'
    });
  }
});

// Account diagnostic endpoint
app.get('/api/shipping/diagnose', async (req, res) => {
  try {
    if (!shiprocketService) {
      return res.status(500).json({
        success: false,
        error: 'Shipping service not available'
      });
    }

    const diagnostics = {};

    try {
      await shiprocketService.ensureAuthenticated();
      diagnostics.authentication = 'SUCCESS';
    } catch (error) {
      diagnostics.authentication = `FAILED: ${error.message}`;
    }

    try {
      const pickupLocations = await shiprocketService.getPickupLocations();
      diagnostics.pickup_locations = pickupLocations;
      diagnostics.pickup_count = pickupLocations?.data?.shipping_address?.length || 0;
    } catch (error) {
      diagnostics.pickup_locations = `FAILED: ${error.message}`;
      diagnostics.pickup_count = 0;
    }

    try {
      const serviceability = await shiprocketService.checkServiceability('400001', '110001');
      diagnostics.serviceability_test = 'SUCCESS - Mumbai to Delhi test passed';
      diagnostics.available_couriers = serviceability?.data?.available_courier_companies?.length || 0;
    } catch (error) {
      diagnostics.serviceability_test = `FAILED: ${error.message}`;
      diagnostics.available_couriers = 0;
    }

    res.json({
      success: true,
      diagnostics,
      message: 'Account diagnostics completed'
    });

  } catch (error) {
    console.error('Diagnostic failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Diagnostic failed'
    });
  }
});

// Add shiprocket tracking Netlify function route
app.get('/.netlify/functions/shiprocket-track-order/:trackingId', async (req, res) => {
  try {
    // Import the Netlify function
    const netlifyFunction = require('./netlify/functions/shiprocket-track-order');

    // Create mock Netlify event object
    const event = {
      queryStringParameters: req.query,
      headers: req.headers,
      httpMethod: 'GET',
      path: `/.netlify/functions/shiprocket-track-order/${req.params.trackingId}`
    };

    // Create mock context
    const context = {};

    // Call the Netlify function
    const result = await netlifyFunction.handler(event, context);

    // Set response headers
    if (result.headers) {
      Object.keys(result.headers).forEach(key => {
        res.setHeader(key, result.headers[key]);
      });
    }

    // Send response
    res.status(result.statusCode || 200);

    if (result.body) {
      try {
        const body = JSON.parse(result.body);
        res.json(body);
      } catch (e) {
        res.send(result.body);
      }
    } else {
      res.end();
    }

  } catch (error) {
    console.error('Error in shiprocket-track-order function:', error);
    res.status(500).json({
      success: false,
      error: `Failed to track order: ${error.message}`,
      message: 'Please check configuration and try again'
    });
  }
});

// Add DTDC tracking Netlify function route
app.post('/.netlify/functions/dtdc-track-order', async (req, res) => {
  try {
    // Import the Netlify function
    const netlifyFunction = require('./netlify/functions/dtdc-track-order');

    // Create mock Netlify event object
    const event = {
      queryStringParameters: req.query,
      headers: req.headers,
      httpMethod: 'POST',
      path: '/.netlify/functions/dtdc-track-order',
      body: JSON.stringify(req.body)
    };

    // Create mock context
    const context = {};

    // Call the Netlify function
    const result = await netlifyFunction.handler(event, context);

    // Set response headers
    if (result.headers) {
      Object.keys(result.headers).forEach(key => {
        res.setHeader(key, result.headers[key]);
      });
    }

    // Send response
    res.status(result.statusCode || 200);

    if (result.body) {
      try {
        const body = JSON.parse(result.body);
        res.json(body);
      } catch (e) {
        res.send(result.body);
      }
    } else {
      res.end();
    }

  } catch (error) {
    console.error('Error in dtdc-track-order function:', error);
    res.status(500).json({
      success: false,
      error: `Failed to track DTDC order: ${error.message}`,
      message: 'Please check configuration and try again'
    });
  }
});

// Add debug Netlify function route
app.get('/.netlify/functions/debug-shiprocket', async (req, res) => {
  try {
    // Import the Netlify function
    const netlifyFunction = require('./netlify/functions/debug-shiprocket');

    // Create mock Netlify event object
    const event = {
      queryStringParameters: req.query,
      headers: req.headers,
      httpMethod: 'GET',
      path: '/.netlify/functions/debug-shiprocket'
    };

    // Create mock context
    const context = {};

    // Call the Netlify function
    const result = await netlifyFunction.handler(event, context);

    // Set response headers
    if (result.headers) {
      Object.keys(result.headers).forEach(key => {
        res.setHeader(key, result.headers[key]);
      });
    }

    // Send response
    res.status(result.statusCode || 200);

    if (result.body) {
      try {
        const body = JSON.parse(result.body);
        res.json(body);
      } catch (e) {
        res.send(result.body);
      }
    } else {
      res.end();
    }

  } catch (error) {
    console.error('Error in debug-shiprocket function:', error);
    res.status(500).json({
      success: false,
      error: `Failed to debug: ${error.message}`,
      message: 'Please check configuration and try again'
    });
  }
});

// Add email service for order notifications
app.post('/.netlify/functions/send-order-email', async (req, res) => {
  try {
    // Import the Netlify function
    const netlifyFunction = require('./netlify/functions/send-order-email');

    // Create mock Netlify event object
    const event = {
      body: JSON.stringify(req.body),
      headers: req.headers,
      httpMethod: 'POST',
      path: '/.netlify/functions/send-order-email'
    };

    // Create mock context
    const context = {};

    // Call the Netlify function
    const result = await netlifyFunction.handler(event, context);

    // Set response headers
    if (result.headers) {
      Object.keys(result.headers).forEach(key => {
        res.setHeader(key, result.headers[key]);
      });
    }

    // Send response
    res.status(result.statusCode || 200);

    if (result.body) {
      try {
        const body = JSON.parse(result.body);
        res.json(body);
      } catch (e) {
        res.send(result.body);
      }
    } else {
      res.end();
    }

  } catch (error) {
    console.error('Error in send-order-email function:', error);
    res.status(500).json({
      success: false,
      error: `Failed to send order email: ${error.message}`,
      message: 'Please check configuration and try again'
    });
  }
});

// Send Push Notifications endpoint
app.post('/api/send-notifications', async (req, res) => {
  try {
    const { title, body, link = '', imageUrl = '', buttonText = '', category = '', sendToUsers = true, sendToGuests = true } = req.body;

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title and body'
      });
    }

    if (!sendToUsers && !sendToGuests) {
      return res.status(400).json({
        success: false,
        error: 'Must send to at least one audience (users or guests)'
      });
    }

    const db = admin.firestore();
    const messaging = admin.messaging();

    const stats = {
      userTokenCount: 0,
      guestTokenCount: 0,
      totalSent: 0,
      userSuccess: 0,
      guestSuccess: 0,
      failedTokens: []
    };

    const allTokens = [];

    // Get user tokens
    if (sendToUsers) {
      try {
        const usersSnapshot = await db.collection('users').get();
        usersSnapshot.forEach(doc => {
          const userData = doc.data();
          const tokens = userData.pushTokens || [];
          tokens.forEach(token => {
            allTokens.push({
              token,
              type: 'user',
              userId: doc.id
            });
          });
        });
        stats.userTokenCount = allTokens.filter(t => t.type === 'user').length;
      } catch (error) {
        console.error('Error fetching user tokens:', error);
      }
    }

    // Get guest tokens
    if (sendToGuests) {
      try {
        const guestTokensSnapshot = await db.collection('guest_tokens').get();
        guestTokensSnapshot.forEach(doc => {
          const guestData = doc.data();
          const token = guestData.token;
          if (token) {
            allTokens.push({
              token,
              type: 'guest',
              guestId: doc.id
            });
          }
        });
        stats.guestTokenCount = allTokens.filter(t => t.type === 'guest').length;
      } catch (error) {
        console.error('Error fetching guest tokens:', error);
      }
    }

    stats.totalSent = allTokens.length;

    if (allTokens.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No tokens to send to',
        stats
      });
    }

    // Send with DATA ONLY payload - no notification payload
    // This allows the service worker to handle image and button display
    const data = {
      title: title,
      body: body,
      category: category || 'general',
      timestamp: Date.now().toString(),
      link: link || '/',
      click_action: link || '/',
      imageUrl: imageUrl,
      buttonText: buttonText || 'View'
    };

    const sendPromises = allTokens.map(async (tokenObj) => {
      try {
        const messagePayload = {
          data,
          token: tokenObj.token
        };

        const response = await messaging.send(messagePayload);
        
        if (tokenObj.type === 'user') {
          stats.userSuccess++;
        } else {
          stats.guestSuccess++;
        }

        console.log(`Notification sent to ${tokenObj.type}:`, response);
        return { success: true, token: tokenObj.token };
      } catch (error) {
        console.error(`Failed to send to ${tokenObj.type} token:`, error.message);
        stats.failedTokens.push({
          token: tokenObj.token,
          error: error.message,
          type: tokenObj.type
        });
        
        if (error.code === 'messaging/invalid-registration-token' || 
            error.code === 'messaging/registration-token-not-registered') {
          try {
            if (tokenObj.type === 'user') {
              await db.collection('users').doc(tokenObj.userId).update({
                pushTokens: admin.firestore.FieldValue.arrayRemove(tokenObj.token)
              });
            } else {
              await db.collection('guest_tokens').doc(tokenObj.guestId).delete();
            }
            console.log(`Removed invalid token: ${tokenObj.token}`);
          } catch (deleteError) {
            console.error('Error removing invalid token:', deleteError);
          }
        }

        return { success: false, token: tokenObj.token, error: error.message };
      }
    });

    await Promise.all(sendPromises);

    try {
      await db.collection('notification_history').add({
        title,
        body,
        link,
        imageUrl,
        buttonText,
        category,
        sentAt: new Date(),
        stats: {
          userTokenCount: stats.userTokenCount,
          guestTokenCount: stats.guestTokenCount,
          userSuccess: stats.userSuccess,
          guestSuccess: stats.guestSuccess
        }
      });
    } catch (error) {
      console.error('Error logging notification history:', error);
    }

    return res.status(200).json({
      success: true,
      message: 'Notifications sent successfully',
      stats
    });
  } catch (error) {
    console.error('Error in send-notifications:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error: ' + error.message
    });
  }
});

// Test Send Notification endpoint
app.post('/api/test-send-notification', async (req, res) => {
  try {
    const db = admin.firestore();
    const messaging = admin.messaging();

    const data = {
      title: '🎉 Test Notification',
      body: 'This is a test notification with image and action button',
      category: 'test',
      timestamp: Date.now().toString(),
      link: '/',
      imageUrl: 'https://firebasestorage.googleapis.com/v0/b/auric-a0c92.firebasestorage.app/o/productData%2Ftest-image.png?alt=media',
      buttonText: 'View More'
    };

    let testTokenCount = 0;
    let successCount = 0;
    let failureCount = 0;

    // Get first few user tokens for testing
    const usersSnapshot = await db.collection('users').limit(1).get();
    
    if (usersSnapshot.empty) {
      return res.status(200).json({
        success: false,
        status: 'NO_TOKENS_FOUND',
        message: 'No user tokens found for testing'
      });
    }

    const testTokens = [];
    usersSnapshot.forEach(doc => {
      const tokens = doc.data().pushTokens || [];
      tokens.forEach(token => {
        testTokens.push(token);
      });
    });

    testTokenCount = testTokens.length;

    if (testTokenCount === 0) {
      return res.status(200).json({
        success: false,
        status: 'NO_TOKENS_FOUND',
        message: 'No tokens found in selected users'
      });
    }

    const testPromises = testTokens.map(async (token) => {
      try {
        const messagePayload = {
          data,
          token
        };

        await messaging.send(messagePayload);
        successCount++;
        console.log('Test notification sent to:', token);
      } catch (error) {
        failureCount++;
        console.error('Test notification failed:', error.message);
      }
    });

    await Promise.all(testPromises);

    return res.status(200).json({
      success: true,
      message: 'Test notification sent',
      summary: {
        testTokenCount,
        successCount,
        failureCount
      }
    });
  } catch (error) {
    console.error('Error in test-send-notification:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error: ' + error.message
    });
  }
});

// Handle all other routes by serving index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Nazakat website server running on port ${PORT}`);
  console.log(`Visit: http://localhost:${PORT}`);
});
