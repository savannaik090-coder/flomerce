
/**
 * Netlify Function: Send Appointment Email
 * Sends appointment booking notifications to the owner
 */

const { sendAppointmentEmail } = require('./utils/email-service');

exports.handler = async (event, context) => {
  // Set CORS headers
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
    console.log('Appointment booking received');
    
    // Parse the request body
    const appointmentData = JSON.parse(event.body);
    console.log('Appointment data received:', {
      name: appointmentData.fullName,
      email: appointmentData.email,
      date: appointmentData.appointmentDate,
      time: appointmentData.selectedTime,
      type: appointmentData.appointmentType
    });

    // Validate required fields
    const requiredFields = ['appointmentType', 'fullName', 'email', 'phone', 'appointmentDate', 'selectedTime'];
    const missingFields = requiredFields.filter(field => !appointmentData[field]);
    
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

    // Send the appointment notification email
    console.log('Sending appointment notification email...');
    const emailResult = await sendAppointmentEmail(appointmentData);
    
    if (emailResult.success) {
      console.log('Appointment email sent successfully');
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          message: 'Appointment booked successfully. Confirmation email sent.',
          messageId: emailResult.messageId
        })
      };
    } else {
      console.error('Failed to send appointment email:', emailResult.error);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          message: 'Appointment saved but email notification failed.'
        })
      };
    }

  } catch (error) {
    console.error('Appointment booking error:', error);
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
