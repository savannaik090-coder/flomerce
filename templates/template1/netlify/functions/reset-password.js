const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID || 'auric-a0c92',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}

const db = admin.firestore();
const auth = admin.auth();

exports.handler = async (event, context) => {
  console.log('Password reset function called');
  
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { email, token, newPassword } = JSON.parse(event.body);
    
    console.log('Processing password reset for:', email);

    // Validate input
    if (!email || !token || !newPassword) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: false,
          error: 'Missing required fields'
        })
      };
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: false,
          error: 'Password must be at least 6 characters long'
        })
      };
    }

    // Find user by email in Firestore
    const usersQuery = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (usersQuery.empty) {
      console.log('No user found with email:', email);
      return {
        statusCode: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: false,
          error: 'User not found'
        })
      };
    }

    const userDoc = usersQuery.docs[0];
    const userData = userDoc.data();

    // Validate reset token
    if (!userData.passwordResetToken || userData.passwordResetToken !== token) {
      console.log('Invalid reset token for user:', email);
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: false,
          error: 'Invalid or expired reset link'
        })
      };
    }

    // Check if token is expired
    const now = new Date();
    const expiry = userData.passwordResetTokenExpiry?.toDate();
    
    if (!expiry || now > expiry) {
      console.log('Reset token has expired for user:', email);
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: false,
          error: 'Reset link has expired. Please request a new one.'
        })
      };
    }

    try {
      // Update password in Firebase Auth
      const userRecord = await auth.getUserByEmail(email);
      await auth.updateUser(userRecord.uid, {
        password: newPassword
      });

      console.log('Password updated successfully for user:', email);

      // Clear reset token from Firestore
      await userDoc.ref.update({
        passwordResetToken: admin.firestore.FieldValue.delete(),
        passwordResetTokenExpiry: admin.firestore.FieldValue.delete(),
        passwordResetCompletedAt: admin.firestore.Timestamp.now()
      });

      console.log('Reset token cleared for user:', email);

      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: true,
          message: 'Password reset successfully! You can now log in with your new password.'
        })
      };

    } catch (authError) {
      console.error('Firebase Auth error during password update:', authError);
      
      // Handle specific Firebase Auth errors
      if (authError.code === 'auth/user-not-found') {
        return {
          statusCode: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            success: false,
            error: 'User account not found'
          })
        };
      } else if (authError.code === 'auth/weak-password') {
        return {
          statusCode: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            success: false,
            error: 'Password is too weak. Please choose a stronger password.'
          })
        };
      }
      
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: false,
          error: 'Failed to update password. Please try again.'
        })
      };
    }

  } catch (error) {
    console.error('Error in password reset function:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
};