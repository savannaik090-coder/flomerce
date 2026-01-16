/**
 * Firebase Cloud Functions for Auric Jewelry
 * 
 * This file provides serverless functions to replace the Express server:
 * 1. Email sending functionality for order confirmations
 * 2. Razorpay payment integration
 * 3. Push notifications to users
 * 4. Health check endpoint
 */

const functions = require('firebase-functions');
const cors = require('cors')({origin: true});
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

// Import email service
const emailService = require('./email/service');

/**
 * Send order confirmation emails
 * Sends emails to both the customer and store owner
 */
exports.sendOrderEmail = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      // Get order data from request body
      const orderData = req.body;
      
      // Validate required data
      if (!orderData || !orderData.customer || !orderData.products) {
        return res.status(400).json({
          success: false,
          message: 'Missing required order data'
        });
      }
      
      console.log('Received order email request for:', orderData.orderReference);
      
      // Send emails
      const result = await emailService.sendOrderEmails(orderData);
      
      if (result.success) {
        return res.status(200).json({
          success: true,
          message: 'Order emails sent successfully',
          result
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Failed to send order emails',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error in sendOrderEmail function:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error while sending order emails',
        error: error.message
      });
    }
  });
});

/**
 * Create a Razorpay order
 */
exports.createRazorpayOrder = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      // Import Razorpay
      const Razorpay = require('razorpay');
      
      // Create a Razorpay instance
      const razorpay = new Razorpay({
        key_id: functions.config().razorpay?.key_id,
        key_secret: functions.config().razorpay?.key_secret
      });
      
      // Get order details from request body
      const { amount, currency = 'INR', receipt, notes } = req.body;
      
      // Validate required data
      if (!amount) {
        return res.status(400).json({
          success: false,
          message: 'Missing required order data (amount)'
        });
      }
      
      console.log('Creating Razorpay order for amount:', amount);
      
      // Convert amount to paise (Razorpay uses smallest currency unit)
      const amountInPaise = Math.round(amount * 100);
      
      // Create order
      const order = await razorpay.orders.create({
        amount: amountInPaise,
        currency,
        receipt,
        notes
      });
      
      // Return order details
      return res.status(200).json({
        success: true,
        order,
        key_id: functions.config().razorpay?.key_id
      });
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create Razorpay order',
        error: error.message
      });
    }
  });
});

/**
 * Verify Razorpay payment
 */
exports.verifyRazorpayPayment = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      // Get payment details from request body
      const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
      
      // Validate required data
      if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        return res.status(400).json({
          success: false,
          message: 'Missing required payment verification data'
        });
      }
      
      console.log('Verifying Razorpay payment:', razorpay_payment_id);
      
      // Create the signature verification data
      const crypto = require('crypto');
      const secret = functions.config().razorpay?.key_secret;
      const generated_signature = crypto
        .createHmac('sha256', secret)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest('hex');
      
      // Verify the signature
      if (generated_signature === razorpay_signature) {
        return res.status(200).json({
          success: true,
          message: 'Payment verified successfully'
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Payment verification failed'
        });
      }
    } catch (error) {
      console.error('Error verifying Razorpay payment:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error while verifying payment',
        error: error.message
      });
    }
  });
});

/**
 * Send Push Notifications
 * Sends push notifications to subscribed users and guest users
 * This is the core notification function that was missing!
 */
exports.sendNotifications = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      // Extract data from request
      const { title, body, link = '', imageUrl = '', buttonText = '', category = '', sendToUsers = true, sendToGuests = true } = req.body;

      // Validate required data
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

      // Collect all tokens
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

      // If no tokens found, return success with 0 sent
      if (allTokens.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'No tokens to send to',
          stats
        });
      }

      // Prepare notification payload - send ONLY data payload
      // This allows the service worker to handle the complete display with image and button
      const data = {
        title: title,
        body: body,
        category: category || 'general',
        timestamp: Date.now().toString(),
        link: link,
        imageUrl: imageUrl,
        buttonText: buttonText || 'View'
      };

      // Send notifications to all tokens
      const sendPromises = allTokens.map(async (tokenObj) => {
        try {
          const messagePayload = {
            data,
            token: tokenObj.token
          };

          // Send the message
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
          
          // If token is invalid, remove it from database
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

      // Wait for all sends
      await Promise.all(sendPromises);

      // Log the notification to history
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
      console.error('Error in sendNotifications function:', error);
      return res.status(500).json({
        success: false,
        error: 'Server error: ' + error.message
      });
    }
  });
});

/**
 * Health check endpoint
 * Used to verify functions are running properly
 */
exports.healthCheck = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: 'Firebase Cloud Functions',
      emailConfig: {
        service: functions.config().email?.service || 'Not set',
        user: functions.config().email?.user ? 'Set' : 'Not set',
        pass: functions.config().email?.pass ? 'Set' : 'Not set'
      },
      razorpayConfig: {
        key_id: functions.config().razorpay?.key_id ? 'Set' : 'Not set',
        key_secret: functions.config().razorpay?.key_secret ? 'Set' : 'Not set'
      }
    });
  });
});