/**
 * Email Service
 * Handles sending emails for various purposes using Nodemailer
 */

const { createTransport } = require('./config');
const templates = require('./templates');
const functions = require('firebase-functions');

// Create a nodemailer transporter
const transporter = createTransport();

/**
 * Send an order confirmation email to the customer
 * 
 * @param {Object} orderData - Order data including customer information and products
 * @returns {Promise<Object>} - Result of email sending operation
 */
async function sendCustomerOrderConfirmation(orderData) {
  try {
    const { customer } = orderData;
    
    // Validate required data
    if (!customer || !customer.email) {
      throw new Error('Customer email is required to send order confirmation');
    }
    
    // Get the HTML template for customer email
    const htmlContent = templates.customerOrderTemplate(orderData);
    
    // Define email options with anti-spam headers
    const mailOptions = {
      from: `"Nazakat Team" <${functions.config().email?.user || 'nazakatwebsite24@gmail.com'}>`,
      to: customer.email,
      subject: `✅ Order Confirmed: ${orderData.orderReference} - Thank You!`,
      html: htmlContent,
      headers: {
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal',
        'X-Mailer': 'Nazakat E-commerce Platform v1.0',
        'List-Unsubscribe': '<mailto:nazakatwebsite24@gmail.com?subject=Unsubscribe>',
        'X-Auto-Response-Suppress': 'OOF, DR, RN, NRN',
        'Reply-To': 'nazakatwebsite24@gmail.com',
        // Additional anti-spam headers
        'Message-ID': `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@nazakat.com>`,
        'X-Entity-ID': 'nazakat-ecommerce',
        'X-SenderID': 'Nazakat-Official',
        'Return-Path': 'nazakatwebsite24@gmail.com',
        'X-Original-From': 'nazakatwebsite24@gmail.com',
        'Precedence': 'bulk',
        'X-Spam-Status': 'No, score=0.0',
        'X-Campaign-ID': `order-confirmation-${Date.now()}`,
        'Organization': 'Nazakat Jewelry',
        'X-MC-Track': 'opens,clicks'
      },
      // Text version for email clients that don't support HTML
      text: `Dear ${customer.firstName} ${customer.lastName},

Thank you for your order with Nazakat!

ORDER CONFIRMATION DETAILS:
Order Reference: ${orderData.orderReference}
Order Date: ${new Date(orderData.orderDate).toLocaleString()}
Payment Method: ${orderData.paymentMethod}
Total Amount: ₹${orderData.orderTotal.toFixed(2)}

Your order has been successfully received and is currently being processed. You will receive a shipping confirmation with tracking details once your order is dispatched.

CUSTOMER SUPPORT:
For any questions about your order, please contact us:
Email: nazakatwebsite24@gmail.com
Phone: +91-XXXXXXXXXX

Thank you for choosing Nazakat!

Best regards,
The Nazakat Team

---
This email was sent to ${customer.email}
To unsubscribe, reply with "UNSUBSCRIBE" in the subject line.
      `
    };
    
    // Send the email
    console.log(`Sending order confirmation email to customer: ${customer.email}`);
    const result = await transporter.sendMail(mailOptions);
    console.log(`Order confirmation email sent to customer: ${result.messageId}`);
    
    return {
      success: true,
      messageId: result.messageId
    };
  } catch (error) {
    console.error('Error sending customer order confirmation email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send an order notification email to the store owner
 * 
 * @param {Object} orderData - Order data including customer information and products
 * @returns {Promise<Object>} - Result of email sending operation
 */
async function sendOwnerOrderNotification(orderData) {
  try {
    // Get the owner's email from environment variables
    const ownerEmail = functions.config().email?.owner || 'nazakatwebsite24@gmail.com';
    
    // Validate required data
    if (!ownerEmail) {
      throw new Error('Owner email is required to send order notification');
    }
    
    // Get the HTML template for owner email
    const htmlContent = templates.ownerOrderTemplate(orderData);
    
    // Define email options
    const mailOptions = {
      from: `"Nazakat Orders" <${functions.config().email?.user || 'nazakatwebsite24@gmail.com'}>`,
      to: ownerEmail,
      subject: `New Order - ${orderData.orderReference}`,
      html: htmlContent,
      // Text version for email clients that don't support HTML
      text: `New Order - ${orderData.orderReference}
        
A new order has been placed on your Nazakat store.
        
Order Reference: ${orderData.orderReference}
Order Date: ${new Date(orderData.orderDate).toLocaleString()}
Customer: ${orderData.customer.firstName} ${orderData.customer.lastName}
Email: ${orderData.customer.email}
Phone: ${orderData.customer.phone}
Total: $${orderData.orderTotal.toFixed(2)}
        
Please log in to your dashboard to view the complete order details.
      `
    };
    
    // Send the email
    console.log(`Sending order notification email to owner: ${ownerEmail}`);
    const result = await transporter.sendMail(mailOptions);
    console.log(`Order notification email sent to owner: ${result.messageId}`);
    
    return {
      success: true,
      messageId: result.messageId
    };
  } catch (error) {
    console.error('Error sending owner order notification email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send both customer and owner emails for an order
 * 
 * @param {Object} orderData - Order data including customer information and products
 * @returns {Promise<Object>} - Results of both email sending operations
 */
async function sendOrderEmails(orderData) {
  try {
    // Send both emails in parallel
    const [customerResult, ownerResult] = await Promise.all([
      sendCustomerOrderConfirmation(orderData),
      sendOwnerOrderNotification(orderData)
    ]);
    
    return {
      success: customerResult.success && ownerResult.success,
      customer: customerResult,
      owner: ownerResult
    };
  } catch (error) {
    console.error('Error sending order emails:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export the email service functions
module.exports = {
  sendCustomerOrderConfirmation,
  sendOwnerOrderNotification,
  sendOrderEmails
};