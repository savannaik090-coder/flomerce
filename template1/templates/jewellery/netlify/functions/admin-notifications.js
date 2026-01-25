/**
 * Netlify Function: Admin Notifications
 * Manages notifications for admin dashboard including stock alerts
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

    console.log('Firebase Admin initialized for notifications');
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }

  try {
    const bucket = admin.storage().bucket();
    const notificationsFile = bucket.file('adminData/notifications.json');

    switch (event.httpMethod) {
      case 'GET':
        return await getNotifications(notificationsFile, headers);
      
      case 'POST':
        const requestData = JSON.parse(event.body);
        return await handleNotificationAction(notificationsFile, requestData, headers);
      
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'Method not allowed'
          })
        };
    }

  } catch (error) {
    console.error('Error in admin-notifications function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

/**
 * Get all notifications
 */
async function getNotifications(notificationsFile, headers) {
  try {
    let notifications = [];

    // Check if notifications file exists
    const [exists] = await notificationsFile.exists();
    
    if (exists) {
      const [fileContents] = await notificationsFile.download();
      notifications = JSON.parse(fileContents.toString());
    }

    // Sort by timestamp (newest first)
    notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    console.log(`Retrieved ${notifications.length} notifications`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        notifications: notifications
      })
    };

  } catch (error) {
    console.error('Error getting notifications:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        notifications: []
      })
    };
  }
}

/**
 * Handle notification actions (add, mark as read, delete)
 */
async function handleNotificationAction(notificationsFile, requestData, headers) {
  try {
    const { action, notification, notificationId } = requestData;

    // Load existing notifications
    let notifications = [];
    const [exists] = await notificationsFile.exists();
    
    if (exists) {
      const [fileContents] = await notificationsFile.download();
      notifications = JSON.parse(fileContents.toString());
    }

    switch (action) {
      case 'add':
        if (!notification) {
          throw new Error('Notification data required for add action');
        }
        
        notifications.unshift(notification); // Add to beginning of array
        console.log(`Added new notification: ${notification.type} - ${notification.title}`);
        break;

      case 'mark_read':
        if (!notificationId) {
          throw new Error('Notification ID required for mark_read action');
        }
        
        const readIndex = notifications.findIndex(n => n.id === notificationId);
        if (readIndex !== -1) {
          notifications[readIndex].read = true;
          console.log(`Marked notification ${notificationId} as read`);
        }
        break;

      case 'delete':
        if (!notificationId) {
          throw new Error('Notification ID required for delete action');
        }
        
        const deleteIndex = notifications.findIndex(n => n.id === notificationId);
        if (deleteIndex !== -1) {
          notifications.splice(deleteIndex, 1);
          console.log(`Deleted notification ${notificationId}`);
        }
        break;

      case 'mark_all_read':
        notifications.forEach(n => n.read = true);
        console.log('Marked all notifications as read');
        break;

      case 'clear_all':
        notifications = [];
        console.log('Cleared all notifications');
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Keep only last 100 notifications to prevent file from getting too large
    if (notifications.length > 100) {
      notifications = notifications.slice(0, 100);
    }

    // Save updated notifications
    await notificationsFile.save(JSON.stringify(notifications, null, 2), {
      metadata: {
        contentType: 'application/json',
        customMetadata: {
          lastUpdated: new Date().toISOString(),
          totalNotifications: notifications.length.toString()
        }
      }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully performed action: ${action}`,
        notifications: notifications
      })
    };

  } catch (error) {
    console.error('Error handling notification action:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
}