
/**
 * Netlify Function: Send Contact Form Email
 * Handles contact form submissions and sends emails using Nodemailer
 */

const { sendContactEmail } = require('./utils/email-service');

exports.handler = async (event, context) => {
  // Set CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  // Only allow POST method
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ 
        success: false, 
        message: 'Method not allowed. Only POST requests are accepted.' 
      })
    };
  }

  try {
    console.log('Contact form submission received');
    
    // Parse the request body
    const formData = JSON.parse(event.body);
    console.log('Form data received:', {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      subject: formData.subject
    });

    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'subject', 'message'];
    const missingFields = requiredFields.filter(field => !formData[field] || formData[field].trim() === '');
    
    if (missingFields.length > 0) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`
        })
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          message: 'Please provide a valid email address.'
        })
      };
    }

    // Send the contact email
    console.log('Sending contact email...');
    const emailResult = await sendContactEmail(formData);
    
    if (emailResult.success) {
      console.log('Contact email sent successfully');
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          message: 'Thank you for your message! We will get back to you soon.',
          messageId: emailResult.messageId
        })
      };
    } else {
      console.error('Failed to send contact email:', emailResult.error);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          message: 'Sorry, there was an error sending your message. Please try again later.'
        })
      };
    }

  } catch (error) {
    console.error('Contact form submission error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        message: 'Internal server error. Please try again later.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};
