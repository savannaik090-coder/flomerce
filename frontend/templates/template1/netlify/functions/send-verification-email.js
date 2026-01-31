
const { sendVerificationEmail } = require('./utils/email-service');

exports.handler = async (event, context) => {
  console.log('🔧 Netlify verification email function called');
  console.log('Environment check:', {
    hasEmailUser: !!process.env.EMAIL_USER,
    hasEmailPass: !!process.env.EMAIL_PASS,
    nodeEnv: process.env.NODE_ENV
  });
  
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
      body: JSON.stringify({ 
        success: false,
        error: 'Method not allowed' 
      })
    };
  }

  try {
    let emailData;
    try {
      emailData = JSON.parse(event.body);
    } catch (parseError) {
      console.error('❌ Invalid JSON in request body:', parseError);
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: false,
          error: 'Invalid request format'
        })
      };
    }

    console.log('📧 Processing verification email request for:', emailData.customer?.email);

    if (!emailData.customer?.email) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: false,
          error: 'Customer email is required'
        })
      };
    }

    const result = await sendVerificationEmail(emailData);

    console.log('📧 Verification email result:', {
      success: result.success,
      recipient: emailData.customer.email,
      error: result.error || 'none'
    });

    return {
      statusCode: result.success ? 200 : 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(result)
    };
    
  } catch (error) {
    console.error('💥 Critical error in verification email function:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: 'Email service temporarily unavailable',
        details: error.message
      })
    };
  }
};
