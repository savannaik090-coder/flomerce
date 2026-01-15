/**
 * Email Service
 * Handles sending emails for various purposes using Nodemailer
 */

const { createTransport } = require('./config');
const templates = require('./templates');

// Create a nodemailer transporter
const transporter = createTransport();

/**
 * Send an order confirmation email to the customer
 */
async function sendCustomerOrderConfirmation(orderData) {
  try {
    const { customer } = orderData;
    
    if (!customer || !customer.email) {
      throw new Error('Customer email is required to send order confirmation');
    }
    
    const htmlContent = templates.customerOrderTemplate(orderData);
    
    const mailOptions = {
      from: `"Royal Meenakari" <${process.env.EMAIL_USER || 'nazakatwebsite24@gmail.com'}>`,
      to: customer.email,
      subject: `Order Confirmation - ${orderData.orderReference}`,
      html: htmlContent,
      text: `Order Confirmation - ${orderData.orderReference}\n\nThank you for your order at Royal Meenakari!\n\nOrder Reference: ${orderData.orderReference}\nOrder Date: ${new Date(orderData.orderDate).toLocaleString()}\nTotal: ${orderData.userSelectedCurrency || 'INR'} ${orderData.orderTotal.toFixed(2)}\n\nYour order has been received and is being processed.\n\nIf you have any questions, please contact us at nazakat2407@gmail.com.`
    };
    
    console.log(`Sending order confirmation email to customer: ${customer.email}`);
    const result = await transporter.sendMail(mailOptions);
    console.log(`Order confirmation email sent to customer: ${result.messageId}`);
    
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending customer order confirmation email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send an order notification email to the store owner
 */
async function sendOwnerOrderNotification(orderData) {
  try {
    const ownerEmail = process.env.OWNER_EMAIL || 'nazakatwebsite24@gmail.com';
    
    if (!ownerEmail) {
      throw new Error('Owner email is required to send order notification');
    }
    
    const htmlContent = templates.ownerOrderTemplate(orderData);
    
    const mailOptions = {
      from: `"Royal Meenakari Orders" <${process.env.EMAIL_USER || 'nazakatwebsite24@gmail.com'}>`,
      to: ownerEmail,
      subject: `New Order - ${orderData.orderReference}`,
      html: htmlContent,
      text: `New Order - ${orderData.orderReference}\n\nA new order has been placed on your Royal Meenakari store.\n\nOrder Reference: ${orderData.orderReference}\nOrder Date: ${new Date(orderData.orderDate).toLocaleString()}\nCustomer: ${orderData.customer.firstName} ${orderData.customer.lastName}\nEmail: ${orderData.customer.email}\nPhone: ${orderData.customer.phone}\nTotal (INR): ₹${orderData.orderTotal.toFixed(2)}\n\nPlease log in to your dashboard to view the complete order details.`
    };
    
    console.log(`Sending order notification email to owner: ${ownerEmail}`);
    const result = await transporter.sendMail(mailOptions);
    console.log(`Order notification email sent to owner: ${result.messageId}`);
    
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending owner order notification email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send customer order cancellation email
 */
async function sendCustomerOrderCancellation(orderData) {
  try {
    const { customer } = orderData;
    
    if (!customer || !customer.email) {
      throw new Error('Customer email is required to send order cancellation');
    }
    
    const htmlContent = templates.customerCancellationTemplate(orderData);
    
    const mailOptions = {
      from: `"Royal Meenakari" <${process.env.EMAIL_USER || 'nazakatwebsite24@gmail.com'}>`,
      to: customer.email,
      subject: `Order Cancelled - ${orderData.orderReference}`,
      html: htmlContent,
      text: `Order Cancelled - ${orderData.orderReference}\n\nWe regret to inform you that your order has been cancelled.\n\nOrder Reference: ${orderData.orderReference}\nOrder Date: ${new Date(orderData.orderDate).toLocaleString()}\nTotal: ${orderData.userSelectedCurrency || 'INR'} ${orderData.orderTotal.toFixed(2)}\n${orderData.cancellationReason ? `Cancellation Reason: ${orderData.cancellationReason}\n` : ''}\nIf a refund is applicable, it will be processed within 5-7 business days.\n\nIf you have any questions, please contact us at nazakat2407@gmail.com.`
    };
    
    console.log(`Sending order cancellation email to customer: ${customer.email}`);
    const result = await transporter.sendMail(mailOptions);
    console.log(`Order cancellation email sent to customer: ${result.messageId}`);
    
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending customer order cancellation email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send owner order cancellation notification email
 */
async function sendOwnerOrderCancellation(orderData) {
  try {
    const ownerEmail = process.env.OWNER_EMAIL || 'nazakatwebsite24@gmail.com';
    
    if (!ownerEmail) {
      throw new Error('Owner email is required to send order cancellation notification');
    }
    
    const htmlContent = templates.ownerCancellationTemplate(orderData);
    
    const mailOptions = {
      from: `"Royal Meenakari Orders" <${process.env.EMAIL_USER || 'nazakatwebsite24@gmail.com'}>`,
      to: ownerEmail,
      subject: `Order Cancelled - ${orderData.orderReference}`,
      html: htmlContent,
      text: `Order Cancelled - ${orderData.orderReference}\n\nAn order has been cancelled in your Royal Meenakari store.\n\nOrder Reference: ${orderData.orderReference}\nOrder Date: ${new Date(orderData.orderDate).toLocaleString()}\nCustomer: ${orderData.customer.firstName} ${orderData.customer.lastName}\nEmail: ${orderData.customer.email}\nPhone: ${orderData.customer.phone}\nTotal (INR): ₹${orderData.orderTotal.toFixed(2)}\n${orderData.cancellationReason ? `Cancellation Reason: ${orderData.cancellationReason}\n` : ''}\nYou may need to process a refund for this cancelled order.`
    };
    
    console.log(`Sending order cancellation notification to owner: ${ownerEmail}`);
    const result = await transporter.sendMail(mailOptions);
    console.log(`Order cancellation notification sent to owner: ${result.messageId}`);
    
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending owner order cancellation notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send customer delivery confirmation email
 */
async function sendCustomerDeliveryConfirmation(orderData) {
  try {
    const { customer } = orderData;
    
    if (!customer || !customer.email) {
      throw new Error('Customer email is required to send delivery confirmation');
    }
    
    const htmlContent = templates.customerDeliveryTemplate(orderData);
    
    const mailOptions = {
      from: `"Royal Meenakari" <${process.env.EMAIL_USER || 'nazakatwebsite24@gmail.com'}>`,
      to: customer.email,
      subject: `Delivery Confirmed - ${orderData.orderReference}`,
      html: htmlContent,
      text: `Delivery Confirmed - ${orderData.orderReference}\n\nGreat news! Your order has been delivered successfully.\n\nOrder Reference: ${orderData.orderReference}\nOriginal Order Date: ${new Date(orderData.orderDate).toLocaleString()}\n${orderData.trackingNumber ? `Tracking Number: ${orderData.trackingNumber}\n` : ''}\nIf you have any questions, please contact us at nazakat2407@gmail.com.`
    };
    
    console.log(`Sending delivery confirmation email to customer: ${customer.email}`);
    const result = await transporter.sendMail(mailOptions);
    console.log(`Delivery confirmation email sent to customer: ${result.messageId}`);
    
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending customer delivery confirmation email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send owner delivery confirmation email
 */
async function sendOwnerDeliveryConfirmation(orderData) {
  try {
    const ownerEmail = process.env.OWNER_EMAIL || 'nazakatwebsite24@gmail.com';
    
    if (!ownerEmail) {
      throw new Error('Owner email is required to send delivery confirmation');
    }
    
    const htmlContent = templates.ownerDeliveryTemplate(orderData);
    
    const mailOptions = {
      from: `"Royal Meenakari Orders" <${process.env.EMAIL_USER || 'nazakatwebsite24@gmail.com'}>`,
      to: ownerEmail,
      subject: `Order Delivered - ${orderData.orderReference}`,
      html: htmlContent,
      text: `Order Delivered - ${orderData.orderReference}\n\nAn order has been successfully delivered to the customer.\n\nOrder Reference: ${orderData.orderReference}\nCustomer: ${orderData.customer.firstName} ${orderData.customer.lastName}\nEmail: ${orderData.customer.email}\n${orderData.trackingNumber ? `Tracking Number: ${orderData.trackingNumber}\n` : ''}`
    };
    
    console.log(`Sending delivery confirmation email to owner: ${ownerEmail}`);
    const result = await transporter.sendMail(mailOptions);
    console.log(`Delivery confirmation email sent to owner: ${result.messageId}`);
    
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending owner delivery confirmation email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send both customer and owner emails for an order
 */
async function sendOrderEmails(orderData) {
  try {
    if (orderData.status === 'cancelled') {
      const [customerResult, ownerResult] = await Promise.all([
        sendCustomerOrderCancellation(orderData),
        sendOwnerOrderCancellation(orderData)
      ]);
      
      return {
        success: customerResult.success && ownerResult.success,
        customer: customerResult,
        owner: ownerResult,
        type: 'cancellation'
      };
    } else if (orderData.status === 'delivered') {
      const [customerResult, ownerResult] = await Promise.all([
        sendCustomerDeliveryConfirmation(orderData),
        sendOwnerDeliveryConfirmation(orderData)
      ]);
      
      return {
        success: customerResult.success && ownerResult.success,
        customer: customerResult,
        owner: ownerResult,
        type: 'delivery'
      };
    } else {
      const [customerResult, ownerResult] = await Promise.all([
        sendCustomerOrderConfirmation(orderData),
        sendOwnerOrderNotification(orderData)
      ]);
      
      return {
        success: customerResult.success && ownerResult.success,
        customer: customerResult,
        owner: ownerResult,
        type: 'confirmation'
      };
    }
  } catch (error) {
    console.error('Error sending order emails:', error);
    return { success: false, error: error.message };
  }
}

// Export the email service functions
module.exports = {
  sendCustomerOrderConfirmation,
  sendOwnerOrderNotification,
  sendCustomerOrderCancellation,
  sendOwnerOrderCancellation,
  sendCustomerDeliveryConfirmation,
  sendOwnerDeliveryConfirmation,
  sendOrderEmails
};
