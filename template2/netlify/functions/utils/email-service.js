/**
 * Email Service for Netlify Functions
 * Handles sending emails for various purposes using Nodemailer
 */

const { createTransporter } = require('./email-config');
const templates = require('./email-templates');

// Currency symbol mapping
const currencySymbols = {
  'INR': '₹',
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'AED': 'د.إ',
  'CAD': 'C$',
  'AUD': 'A$'
};

// Exchange rates (base currency: INR)
const exchangeRates = {
  'INR': 1,
  'USD': 0.012,
  'EUR': 0.011,
  'GBP': 0.0095,
  'AED': 0.044,
  'CAD': 0.016,
  'AUD': 0.018
};

// Helper function to convert price from INR to target currency
function convertCurrencyPrice(priceInINR, targetCurrency = 'INR') {
  const rate = exchangeRates[targetCurrency] || 1;
  return priceInINR * rate;
}

/**
 * Generate cancellation email HTML content
 * CUSTOMER EMAIL - Shows prices in customer's selected currency
 */
function generateCancellationEmailContent(orderData) {
  const cancellationReason = orderData.cancellationReason || 'Order cancelled by store administrator';
  const cancellationNote = orderData.cancellationNote || '';
  const userSelectedCurrency = orderData.userSelectedCurrency || 'INR';
  const userSelectedCurrencySymbol = currencySymbols[userSelectedCurrency] || currencySymbols['INR'];

  console.log('Generating cancellation email with reason:', cancellationReason);
  console.log('Customer currency:', userSelectedCurrency);
  console.log('Currency symbol:', userSelectedCurrencySymbol);

  // Helper function to format price in customer's selected currency
  const formatCustomerPrice = (priceINR, priceDisplay) => {
    // Use pre-converted display price if available (matches checkout display)
    if (priceDisplay !== undefined && priceDisplay !== null && priceDisplay !== '') {
      const decimals = userSelectedCurrency === 'INR' ? 0 : 2;
      const formattedPrice = decimals === 0 
        ? Math.round(priceDisplay).toLocaleString('en-IN')
        : parseFloat(priceDisplay).toFixed(decimals);
      return `${userSelectedCurrencySymbol}${formattedPrice}`;
    }
    
    // Convert from INR to customer's selected currency
    const convertedPrice = convertCurrencyPrice(priceINR || 0, userSelectedCurrency);
    const decimals = userSelectedCurrency === 'INR' ? 0 : 2;
    const formatted = decimals === 0 
      ? Math.round(convertedPrice).toLocaleString('en-IN')
      : convertedPrice.toFixed(decimals);
    
    return `${userSelectedCurrencySymbol}${formatted}`;
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #dc2626; padding-bottom: 20px; }
            .logo { font-size: 28px; font-weight: bold; color: #dc2626; }
            .alert-box { background-color: #fee2e2; border: 1px solid #fecaca; color: #991b1b; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .order-details { background-color: #f8fafc; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">Royal Meenakari</div>
                <h2 style="color: #dc2626; margin: 10px 0;">Order Cancelled</h2>
            </div>

            <div class="alert-box">
                <h3 style="margin: 0 0 10px 0;">❌ Your order has been cancelled</h3>
                <p style="margin: 0 0 10px 0;"><strong>Reason:</strong> ${cancellationReason}</p>
                ${cancellationNote ? `<p style="margin: 0;"><strong>Additional Information:</strong> ${cancellationNote}</p>` : ''}
            </div>

            <p>Dear ${orderData.customer.firstName || 'Valued Customer'},</p>

            <p>We regret to inform you that your order has been cancelled. Here are the details:</p>

            <div class="order-details">
                <h3 style="margin: 0 0 15px 0; color: #374151;">Order Information</h3>
                <p><strong>Order Reference:</strong> ${orderData.orderReference}</p>
                <p><strong>Order Date:</strong> ${new Date(orderData.orderDate).toLocaleDateString('en-IN')}</p>
                <p><strong>Total Amount:</strong> ${formatCustomerPrice(orderData.orderTotal, orderData.orderTotalDisplay)}</p>
                <p><strong>Payment Method:</strong> ${orderData.paymentMethod}</p>

                <h4 style="margin: 20px 0 10px 0; color: #374151;">Items in this order:</h4>
                ${orderData.products.map(product => {
                    const productPrice = formatCustomerPrice(product.price || 0, product.priceDisplay);
                    return `
                    <div style="border-bottom: 1px solid #e5e7eb; padding: 10px 0;">
                        <p style="margin: 0;"><strong>${product.name || 'Product'}</strong></p>
                        <p style="margin: 0; color: #666;">Quantity: ${product.quantity || 1} × ${productPrice}</p>
                    </div>
                `;
                }).join('')}
            </div>

            <div style="background-color: #fffbeb; border: 1px solid #fbbf24; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #92400e;">💳 Refund Information</h3>
                <p style="margin: 0;">If you have already made the payment, a full refund will be processed within 5-7 business days to your original payment method.</p>
            </div>

            <p>We apologize for any inconvenience this may have caused. If you have any questions or would like to place a new order, please don't hesitate to contact us.</p>

            <div class="footer">
                <p>Thank you for choosing Royal Meenakari</p>
                <p>Email: nazakat2407@gmail.com | Phone: +91 93102 50047</p>
                <p style="font-size: 12px; color: #999;">This is an automated email. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
  `;
}

/**
 * Generate owner cancellation notification email content
 */
function generateOwnerCancellationContent(orderData) {
  const cancellationReason = orderData.cancellationReason || 'Order cancelled by store administrator';
  const cancellationNote = orderData.cancellationNote || '';

  // Owner always sees INR prices
  const formatOwnerPrice = (priceINR) => {
    const formatted = Math.round(priceINR || 0).toLocaleString('en-IN');
    return `₹${formatted}`;
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #dc2626; padding-bottom: 20px; }
            .alert-box { background-color: #fee2e2; border: 1px solid #fecaca; color: #991b1b; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .order-details { background-color: #f8fafc; padding: 20px; border-radius: 5px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="color: #dc2626; margin: 10px 0;">Order Cancelled Notification</h2>
            </div>

            <div class="alert-box">
                <h3 style="margin: 0 0 10px 0;">❌ Order ${orderData.orderReference} has been cancelled</h3>
                <p style="margin: 0 0 10px 0;"><strong>Reason:</strong> ${cancellationReason}</p>
                ${cancellationNote ? `<p style="margin: 0;"><strong>Additional Information:</strong> ${cancellationNote}</p>` : ''}
            </div>

            <div class="order-details">
                <h3 style="margin: 0 0 15px 0;">Order Details</h3>
                <p><strong>Order Reference:</strong> ${orderData.orderReference}</p>
                <p><strong>Customer:</strong> ${orderData.customer.firstName} ${orderData.customer.lastName}</p>
                <p><strong>Email:</strong> ${orderData.customer.email}</p>
                <p><strong>Phone:</strong> ${orderData.customer.phone}</p>
                <p><strong>Order Date:</strong> ${new Date(orderData.orderDate).toLocaleDateString('en-IN')}</p>
                <p><strong>Total Amount:</strong> ${formatOwnerPrice(orderData.orderTotal)}</p>

                <h4>Items in this order:</h4>
                ${orderData.products.map(product => `
                    <div style="border-bottom: 1px solid #e5e7eb; padding: 10px 0;">
                        <p style="margin: 0;"><strong>${product.name || 'Product'}</strong></p>
                        <p style="margin: 0; color: #666;">Quantity: ${product.quantity || 1} × ${formatOwnerPrice(product.price || 0)}</p>
                    </div>
                `).join('')}
            </div>

            <p><strong>Action Required:</strong> Customer has been notified about the cancellation. If payment was received, ensure refund is processed within 5-7 business days.</p>
        </div>
    </body>
    </html>
  `;
}

// Test the email configuration on load
console.log('Email service loaded, testing configuration...');
try {
  const testTransporter = createTransporter();
  console.log('Email transporter created successfully');
} catch (error) {
  console.error('Failed to create email transporter:', error);
}

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
      console.error('Customer data missing or incomplete:', { customer, orderData });
      throw new Error('Customer email is required to send order confirmation');
    }

    // Ensure required fields have default values
    const customerData = {
      firstName: customer.firstName || 'Valued',
      lastName: customer.lastName || 'Customer',
      email: customer.email,
      phone: customer.phone || 'Not provided',
      address: customer.address || 'Not provided',
      city: customer.city || '',
      state: customer.state || '',
      postalCode: customer.postalCode || ''
    };

    // Ensure order data has required fields
    const completeOrderData = {
      ...orderData,
      customer: customerData,
      orderReference: orderData.orderReference || 'ORD-' + Date.now(),
      orderDate: orderData.orderDate || new Date().toISOString(),
      orderTotal: orderData.orderTotal || 0,
      paymentMethod: orderData.paymentMethod || 'Not specified',
      products: orderData.products || []
    };

    console.log('Preparing customer email with complete data:', completeOrderData);

    const transporter = createTransporter();

    // Determine email type based on order status - prioritize explicit status
    let subject, htmlContent;

    console.log('Order status check:', {
      status: orderData.status,
      adminConfirmed: orderData.adminConfirmed,
      cancellationReason: orderData.cancellationReason
    });

    if (orderData.status && orderData.status.toLowerCase() === 'cancelled') {
      // Cancellation email - use the same template as confirmation (handles currency properly)
      subject = `❌ Order Cancelled - ${completeOrderData.orderReference}`;
      htmlContent = templates.customerOrderTemplate(completeOrderData);
      console.log('Generated cancellation email using customerOrderTemplate');
    } else if (orderData.status && orderData.status.toLowerCase() === 'confirmed') {
      // Confirmation email
      subject = `✅ Order Confirmed - ${completeOrderData.orderReference}`;
      htmlContent = templates.customerOrderTemplate(completeOrderData);
      console.log('Generated confirmation email');
    } else {
      // New order email (default)
      subject = `📋 Order Received - ${completeOrderData.orderReference}`;
      htmlContent = templates.customerOrderTemplate(completeOrderData);
      console.log('Generated new order email');
    }


    // Define email options
    const mailOptions = {
      from: `"Nazakat Team" <${process.env.EMAIL_USER || 'nazakatwebsite24@gmail.com'}>`,
      to: customerData.email,
      subject: subject,
      html: htmlContent,
      headers: {
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal',
        'X-Mailer': 'Nazakat E-commerce Platform v1.0',
        'List-Unsubscribe': '<mailto:nazakatwebsite24@gmail.com?subject=Unsubscribe>',
        'Reply-To': 'nazakatwebsite24@gmail.com',
        'Message-ID': `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@nazakat.com>`,
        'X-Entity-ID': 'nazakat-ecommerce',
        'Return-Path': process.env.EMAIL_USER || 'nazakatwebsite24@gmail.com',
        'Organization': 'Nazakat Jewelry'
      },
      // Text version for email clients that don't support HTML
      text: `Order Confirmation - ${completeOrderData.orderReference}

Thank you for your order at Nazakat!

Order Reference: ${completeOrderData.orderReference}
Order Date: ${new Date(completeOrderData.orderDate).toLocaleString()}
Total: ₹${completeOrderData.orderTotal.toFixed(2)}

Your order has been received and is being processed.

If you have any questions, please contact us at nazakatwebsite24@gmail.com.
      `
    };

    // Send the email
    console.log(`Sending order confirmation email to customer: ${customerData.email}`);
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
    const ownerEmail = process.env.OWNER_EMAIL || 'nazakatwebsite24@gmail.com';

    // Validate required data
    if (!ownerEmail) {
      throw new Error('Owner email is required to send order notification');
    }

    const transporter = createTransporter();

    // Determine email subject and content based on order data
    let subject, ownerContent;

    console.log('Owner email - Order status check:', {
      status: orderData.status,
      orderReference: orderData.orderReference
    });

    if (orderData.status && orderData.status.toLowerCase() === 'cancelled') {
      // Cancellation notification
      subject = `❌ Order Cancelled - ${orderData.orderReference}`;
      ownerContent = generateOwnerCancellationContent(orderData);
      console.log('Generated owner cancellation email');
    } else if (orderData.status && orderData.status.toLowerCase() === 'confirmed') {
      // Confirmation notification
      subject = `✅ Order Confirmed - ${orderData.orderReference}`;
      ownerContent = templates.ownerOrderTemplate(orderData);
      console.log('Generated owner confirmation email');
    } else {
      // New order notification
      subject = `🆕 New Order Received - ${orderData.orderReference}`;
      ownerContent = templates.ownerOrderTemplate(orderData);
      console.log('Generated owner new order email');
    }


    // Define email options
    const mailOptions = {
      from: `"Nazakat Orders" <${process.env.EMAIL_USER || 'nazakatwebsite24@gmail.com'}>`,
      to: ownerEmail,
      subject: subject,
      html: ownerContent,
      // Text version for email clients that don't support HTML
      text: `New Order - ${orderData.orderReference}

A new order has been placed on your Nazakat store.

Order Reference: ${orderData.orderReference}
Order Date: ${new Date(orderData.orderDate).toLocaleString()}
Customer: ${orderData.customer.firstName} ${orderData.customer.lastName}
Email: ${orderData.customer.email}
Phone: ${orderData.customer.phone}
Total: ₹${orderData.orderTotal.toFixed(2)}

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
 * Send customer delivery confirmation email
 */
async function sendCustomerDeliveryConfirmation(orderData) {
  try {
    const { customer } = orderData;

    if (!customer || !customer.email) {
      throw new Error('Customer email is required to send delivery confirmation');
    }

    const transporter = createTransporter();
    const htmlContent = templates.customerDeliveryTemplate(orderData);

    const mailOptions = {
      from: `"Nazakat Team" <${process.env.EMAIL_USER || 'nazakatwebsite24@gmail.com'}>`,
      to: customer.email,
      subject: `✅ Delivery Confirmed - ${orderData.orderReference}`,
      html: htmlContent,
      text: `Delivery Confirmed - ${orderData.orderReference}\n\nGreat news! Your order has been successfully delivered.\n\nOrder Reference: ${orderData.orderReference}\nIf you have any questions, please contact us at nazakat2407@gmail.com.`
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

    const transporter = createTransporter();
    const htmlContent = templates.ownerDeliveryTemplate(orderData);

    const mailOptions = {
      from: `"Nazakat Orders" <${process.env.EMAIL_USER || 'nazakatwebsite24@gmail.com'}>`,
      to: ownerEmail,
      subject: `✅ Order Delivered - ${orderData.orderReference}`,
      html: htmlContent,
      text: `Order Delivered - ${orderData.orderReference}\n\nAn order has been successfully delivered to the customer.\n\nOrder Reference: ${orderData.orderReference}\nCustomer: ${orderData.customer.firstName} ${orderData.customer.lastName}`
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
 *
 * @param {Object} orderData - Order data including customer information and products
 * @returns {Promise<Object>} - Results of both email sending operations
 */
async function sendOrderEmails(orderData) {
  try {
    console.log('Starting to send order emails for:', orderData.orderReference);

    // Check if this is a delivery confirmation email
    if (orderData.status && orderData.status.toLowerCase() === 'delivered') {
      const [customerResult, ownerResult] = await Promise.all([
        sendCustomerDeliveryConfirmation(orderData),
        sendOwnerDeliveryConfirmation(orderData)
      ]);

      console.log('Delivery confirmation emails sent:', { customerResult, ownerResult });

      return {
        success: customerResult.success && ownerResult.success,
        customer: customerResult,
        owner: ownerResult,
        type: 'delivery'
      };
    }

    // Send both emails in parallel
    const [customerResult, ownerResult] = await Promise.all([
      sendCustomerOrderConfirmation(orderData),
      sendOwnerOrderNotification(orderData)
    ]);

    console.log('Email sending results:', { customerResult, ownerResult });

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

/**
 * Send email verification email
 * @param {Object} emailData - Email data including customer info and verification URL
 * @returns {Promise<Object>} - Result of email sending operation
 */
async function sendVerificationEmail(emailData) {
  try {
    console.log('🔧 Starting verification email process...');
    
    const { customer, verificationUrl } = emailData;

    if (!customer || !customer.email) {
      console.error('❌ Missing customer data:', { customer, emailData });
      throw new Error('Customer email is required to send verification email');
    }

    console.log('📧 Attempting to send verification email to:', customer.email);
    console.log('🔗 Verification URL:', verificationUrl ? 'provided' : 'missing');

    let transporter;
    try {
      transporter = createTransporter();
      console.log('✅ Email transporter created successfully');
    } catch (configError) {
      console.error('❌ Failed to create email transporter:', configError);
      
      // In development or if email is not configured, return success but don't actually send
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔧 Development mode - skipping actual email send');
        return {
          success: true,
          messageId: 'dev-mode-' + Date.now(),
          note: 'Email not sent in development mode'
        };
      }
      
      throw configError;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
              .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #d4af37; padding-bottom: 20px; }
              .logo { font-size: 28px; font-weight: bold; color: #d4af37; }
              .verify-button { display: inline-block; background-color: #d4af37; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #666; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <div class="logo">Nazakat</div>
                  <h2 style="color: #d4af37; margin: 10px 0;">Verify Your Email Address</h2>
              </div>

              <p>Hello ${customer.firstName || 'Valued Customer'},</p>

              <p>Thank you for creating an account with Nazakat! To complete your registration and ensure the security of your account, please verify your email address.</p>

              <div style="text-align: center; margin: 30px 0;">
                  <a href="${verificationUrl}" class="verify-button">Verify My Email Address</a>
              </div>

              <p><strong>Important:</strong> You must verify your email before you can log in to your account.</p>

              <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 5px; font-family: monospace;">${verificationUrl}</p>

              <p>This verification link will expire in 24 hours for security reasons.</p>

              <p>If you didn't create this account, please ignore this email.</p>

              <div class="footer">
                  <p>Welcome to Nazakat - Your trusted jewelry destination</p>
                  <p>Email: nazakatwebsite24@gmail.com</p>
                  <p style="font-size: 12px; color: #999;">This is an automated email. Please do not reply to this email.</p>
              </div>
          </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"Nazakat Team" <${process.env.EMAIL_USER || 'nazakatwebsite24@gmail.com'}>`,
      to: customer.email,
      subject: '✅ Verify Your Email Address - Nazakat',
      html: htmlContent,
      headers: {
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal',
        'X-Mailer': 'Nazakat E-commerce Platform v1.0',
        'Reply-To': 'nazakatwebsite24@gmail.com',
        'Message-ID': `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@nazakat.com>`,
        'Return-Path': process.env.EMAIL_USER || 'nazakatwebsite24@gmail.com',
        'Organization': 'Nazakat Jewelry'
      }
    };

    console.log(`📤 Sending verification email to: ${customer.email}`);
    
    // Attempt to send email with proper error handling
    let result;
    try {
      // Test connection first
      await transporter.verify();
      console.log('✅ SMTP connection verified successfully');
      
      result = await transporter.sendMail(mailOptions);
      console.log(`📧 Verification email sent successfully: ${result.messageId}`);
      
      return {
        success: true,
        messageId: result.messageId,
        recipient: customer.email
      };
      
    } catch (sendError) {
      console.error('❌ Failed to send verification email:', {
        error: sendError.message,
        code: sendError.code,
        command: sendError.command,
        recipient: customer.email
      });
      
      // Provide specific error messages based on error type
      let userFriendlyMessage = 'Failed to send verification email. Please try again.';
      
      if (sendError.code === 'EAUTH') {
        userFriendlyMessage = 'Email authentication failed. Please contact support.';
      } else if (sendError.code === 'ECONNECTION') {
        userFriendlyMessage = 'Could not connect to email server. Please try again later.';
      } else if (sendError.responseCode === 550) {
        userFriendlyMessage = 'Email address rejected. Please check your email and try again.';
      }
      
      return {
        success: false,
        error: userFriendlyMessage,
        details: sendError.message,
        recipient: customer.email
      };
    }
    
  } catch (error) {
    console.error('💥 Critical error in verification email service:', error);
    return {
      success: false,
      error: 'Email service temporarily unavailable. Please try again later.',
      details: error.message
    };
  }
}

/**
 * Send password reset email
 * @param {Object} emailData - Email data including customer info and reset URL
 * @returns {Promise<Object>} - Result of email sending operation
 */
async function sendPasswordResetEmail(emailData) {
  try {
    const { customer, resetUrl } = emailData;

    if (!customer || !customer.email) {
      throw new Error('Customer email is required to send password reset email');
    }

    const transporter = createTransporter();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
              .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #dc3545; padding-bottom: 20px; }
              .logo { font-size: 28px; font-weight: bold; color: #dc3545; }
              .reset-button { display: inline-block; background-color: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
              .warning-box { background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #666; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <div class="logo">Nazakat</div>
                  <h2 style="color: #dc3545; margin: 10px 0;">🔐 Reset Your Password</h2>
              </div>

              <p>Hello ${customer.firstName || 'Valued Customer'},</p>

              <p>We received a request to reset the password for your Nazakat account. If you made this request, please click the button below to create a new password.</p>

              <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}" class="reset-button">Reset My Password</a>
              </div>

              <div class="warning-box">
                  <p><strong>⚠️ Security Notice:</strong></p>
                  <ul style="margin: 10px 0; padding-left: 20px;">
                      <li>This password reset link will expire in 1 hour for security reasons</li>
                      <li>You can only use this link once</li>
                      <li>If you didn't request this reset, please ignore this email</li>
                  </ul>
              </div>

              <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 5px; font-family: monospace;">${resetUrl}</p>

              <p><strong>Didn't request this?</strong> If you didn't ask to reset your password, you can safely ignore this email. Your password will remain unchanged.</p>

              <p>For your account security, never share this email or link with anyone.</p>

              <div class="footer">
                  <p>Nazakat - Your trusted jewelry destination</p>
                  <p>Email: nazakatwebsite24@gmail.com</p>
                  <p style="font-size: 12px; color: #999;">This is an automated email. Please do not reply to this email.</p>
              </div>
          </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"Nazakat Security" <${process.env.EMAIL_USER || 'nazakatwebsite24@gmail.com'}>`,
      to: customer.email,
      subject: '🔐 Reset Your Password - Nazakat',
      html: htmlContent,
      headers: {
        'X-Priority': '1', // High priority for security emails
        'X-MSMail-Priority': 'High',
        'X-Mailer': 'Nazakat E-commerce Platform v1.0',
        'Reply-To': 'nazakatwebsite24@gmail.com',
        'Message-ID': `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@nazakat.com>`,
        'Return-Path': process.env.EMAIL_USER || 'nazakatwebsite24@gmail.com',
        'Organization': 'Nazakat Jewelry'
      }
    };

    console.log(`Sending password reset email to: ${customer.email}`);
    const result = await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent: ${result.messageId}`);

    return {
      success: true,
      messageId: result.messageId
    };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send appointment booking email
 * @param {Object} appointmentData - Appointment booking data
 * @returns {Promise<Object>} - Result of email sending operation
 */
async function sendAppointmentEmail(appointmentData) {
  try {
    const { fullName, email, phone, appointmentDate, selectedTime, appointmentType, purpose, message } = appointmentData;

    if (!fullName || !email || !appointmentDate || !selectedTime) {
      throw new Error('Required appointment fields are missing');
    }

    const transporter = createTransporter();

    // Format date
    const formattedDate = new Date(appointmentDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Email to business owner/admin
    const adminEmailContent = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
              .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #9c7c38; padding-bottom: 20px; }
              .logo { font-size: 28px; font-weight: bold; color: #9c7c38; }
              .appointment-details { background-color: #f8fafc; padding: 20px; border-radius: 5px; margin: 20px 0; }
              .detail-row { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
              .detail-row:last-child { border-bottom: none; }
              .label { font-weight: bold; color: #374151; }
              .value { color: #6b7280; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #666; }
              .type-badge { display: inline-block; padding: 5px 15px; border-radius: 15px; font-size: 12px; font-weight: bold; }
              .in-store { background-color: #d4edda; color: #155724; }
              .virtual { background-color: #d1ecf1; color: #0c5460; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <div class="logo">Royal Meenakari</div>
                  <h2 style="color: #9c7c38; margin: 10px 0;">New Appointment Booking</h2>
              </div>

              <p>You have received a new appointment booking request:</p>

              <div class="appointment-details">
                  <div class="detail-row">
                      <span class="label">Appointment Type:</span>
                      <span class="type-badge ${appointmentType === 'in-store' ? 'in-store' : 'virtual'}">
                          ${appointmentType === 'in-store' ? '🏪 IN-STORE VISIT' : '💻 VIRTUAL CONSULTATION'}
                      </span>
                  </div>
                  <div class="detail-row">
                      <span class="label">Customer Name:</span>
                      <span class="value">${fullName}</span>
                  </div>
                  <div class="detail-row">
                      <span class="label">Email:</span>
                      <span class="value">${email}</span>
                  </div>
                  <div class="detail-row">
                      <span class="label">Phone:</span>
                      <span class="value">${phone}</span>
                  </div>
                  <div class="detail-row">
                      <span class="label">Date:</span>
                      <span class="value">${formattedDate}</span>
                  </div>
                  <div class="detail-row">
                      <span class="label">Time:</span>
                      <span class="value">${selectedTime}</span>
                  </div>
                  ${purpose ? `
                  <div class="detail-row">
                      <span class="label">Purpose:</span>
                      <span class="value">${purpose}</span>
                  </div>
                  ` : ''}
                  ${message ? `
                  <div class="detail-row">
                      <span class="label">Special Requests:</span>
                      <div class="value" style="margin-top: 10px;">${message}</div>
                  </div>
                  ` : ''}
              </div>

              <p><strong>Action Required:</strong> Please contact the customer to confirm this appointment.</p>

              <div class="footer">
                  <p>This email was automatically generated from the Royal Meenakari appointment booking system</p>
                  <p>Reply directly to: ${email}</p>
              </div>
          </div>
      </body>
      </html>
    `;

    // Email confirmation to customer
    const customerEmailContent = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
              .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #9c7c38; padding-bottom: 20px; }
              .logo { font-size: 28px; font-weight: bold; color: #9c7c38; }
              .confirmation-box { background-color: #e8f5e8; border: 1px solid #c3e6c3; color: #2d5a2d; padding: 15px; border-radius: 5px; margin: 20px 0; }
              .appointment-details { background-color: #f8fafc; padding: 20px; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #666; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <div class="logo">Royal Meenakari</div>
                  <h2 style="color: #9c7c38; margin: 10px 0;">Appointment Booking Confirmation</h2>
              </div>

              <div class="confirmation-box">
                  <h3 style="margin: 0 0 10px 0;">✅ Your appointment request has been received!</h3>
                  <p style="margin: 0;">We will contact you shortly to confirm your appointment.</p>
              </div>

              <p>Dear ${fullName},</p>

              <p>Thank you for booking an appointment with Royal Meenakari. Here are your appointment details:</p>

              <div class="appointment-details">
                  <p><strong>Appointment Type:</strong> ${appointmentType === 'in-store' ? 'In-Store Visit' : 'Virtual Consultation'}</p>
                  <p><strong>Date:</strong> ${formattedDate}</p>
                  <p><strong>Time:</strong> ${selectedTime}</p>
                  ${purpose ? `<p><strong>Purpose:</strong> ${purpose}</p>` : ''}
              </div>

              ${appointmentType === 'in-store' ? `
              <p><strong>Our Location:</strong><br>
              Chandni Chowk, New Delhi, Delhi 110006</p>
              ` : `
              <p><strong>Virtual Consultation:</strong><br>
              We will send you the video call link before your appointment.</p>
              `}

              <p>If you need to reschedule or have any questions, please contact us at:</p>
              <ul>
                  <li>Phone: +91 93102 50047</li>
                  <li>Email: nazakat2407@gmail.com</li>
              </ul>

              <p>We look forward to meeting you!</p>

              <div class="footer">
                  <p>Thank you for choosing Royal Meenakari - Where elegance meets tradition</p>
                  <p>Email: nazakat2407@gmail.com | Phone: +91 93102 50047</p>
                  <p style="font-size: 12px; color: #999;">This is an automated confirmation email.</p>
              </div>
          </div>
      </body>
      </html>
    `;

    // Send email to admin/owner
    const adminMailOptions = {
      from: `"Royal Meenakari Appointments" <${process.env.EMAIL_USER || 'nazakatwebsite24@gmail.com'}>`,
      to: process.env.OWNER_EMAIL || 'nazakatwebsite24@gmail.com',
      subject: `🗓️ New Appointment: ${fullName} - ${formattedDate} at ${selectedTime}`,
      html: adminEmailContent,
      replyTo: email
    };

    // Send confirmation email to customer
    const customerMailOptions = {
      from: `"Royal Meenakari" <${process.env.EMAIL_USER || 'nazakatwebsite24@gmail.com'}>`,
      to: email,
      subject: '✅ Appointment Confirmation - Royal Meenakari',
      html: customerEmailContent
    };

    // Send both emails in parallel
    console.log(`Sending appointment emails - Admin: ${adminMailOptions.to}, Customer: ${customerMailOptions.to}`);
    const [adminResult, customerResult] = await Promise.all([
      transporter.sendMail(adminMailOptions),
      transporter.sendMail(customerMailOptions)
    ]);

    console.log(`Appointment emails sent - Admin: ${adminResult.messageId}, Customer: ${customerResult.messageId}`);

    return {
      success: true,
      adminMessageId: adminResult.messageId,
      customerMessageId: customerResult.messageId
    };
  } catch (error) {
    console.error('Error sending appointment email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send contact form email
 * @param {Object} contactData - Contact form data
 * @returns {Promise<Object>} - Result of email sending operation
 */
async function sendContactEmail(contactData) {
  try {
    const { firstName, lastName, email, phone, subject, message } = contactData;

    if (!firstName || !lastName || !email || !subject || !message) {
      throw new Error('Required contact form fields are missing');
    }

    const transporter = createTransporter();

    // Email to business owner/admin
    const adminEmailContent = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
              .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #d4af37; padding-bottom: 20px; }
              .logo { font-size: 28px; font-weight: bold; color: #d4af37; }
              .contact-details { background-color: #f8fafc; padding: 20px; border-radius: 5px; margin: 20px 0; }
              .message-content { background-color: #fff8e1; border-left: 4px solid #d4af37; padding: 20px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #666; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <div class="logo">Nazakat</div>
                  <h2 style="color: #d4af37; margin: 10px 0;">New Contact Form Submission</h2>
              </div>

              <p>You have received a new contact form submission from your website:</p>

              <div class="contact-details">
                  <h3 style="margin: 0 0 15px 0; color: #374151;">Contact Information</h3>
                  <p><strong>Name:</strong> ${firstName} ${lastName}</p>
                  <p><strong>Email:</strong> ${email}</p>
                  ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
                  <p><strong>Subject:</strong> ${subject}</p>
                  <p><strong>Submitted:</strong> ${new Date().toLocaleString('en-IN')}</p>
              </div>

              <div class="message-content">
                  <h3 style="margin: 0 0 15px 0; color: #374151;">Message</h3>
                  <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
              </div>

              <p><strong>Action Required:</strong> Please respond to this inquiry promptly to maintain excellent customer service.</p>

              <div class="footer">
                  <p>This email was automatically generated from the Nazakat contact form</p>
                  <p>Reply directly to: ${email}</p>
              </div>
          </div>
      </body>
      </html>
    `;

    // Email confirmation to customer
    const customerEmailContent = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
              .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #d4af37; padding-bottom: 20px; }
              .logo { font-size: 28px; font-weight: bold; color: #d4af37; }
              .confirmation-box { background-color: #e8f5e8; border: 1px solid #c3e6c3; color: #2d5a2d; padding: 15px; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #666; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <div class="logo">Nazakat</div>
                  <h2 style="color: #d4af37; margin: 10px 0;">Thank You for Contacting Us!</h2>
              </div>

              <div class="confirmation-box">
                  <h3 style="margin: 0 0 10px 0;">✅ Message Received Successfully</h3>
                  <p style="margin: 0;">We have received your inquiry and will respond within 24 hours.</p>
              </div>

              <p>Dear ${firstName},</p>

              <p>Thank you for reaching out to Nazakat! We appreciate your interest in our handcrafted collections and traditional artistry.</p>

              <p>Here's a summary of your message:</p>
              <div style="background-color: #f8fafc; padding: 15px; border-radius: 5px; margin: 15px 0;">
                  <p><strong>Subject:</strong> ${subject}</p>
                  <p><strong>Your Message:</strong></p>
                  <p style="font-style: italic; border-left: 3px solid #d4af37; padding-left: 15px;">"${message.substring(0, 200)}${message.length > 200 ? '...' : ''}"</p>
              </div>

              <p>Our team will review your inquiry and get back to you as soon as possible. For urgent matters, you can also reach us via WhatsApp at +91 93102 50047.</p>

              <p>In the meantime, feel free to explore our latest collections and follow us on social media for the newest updates on traditional Indian wear and handloom artistry.</p>

              <div class="footer">
                  <p>Thank you for choosing Nazakat - Where elegance meets tradition</p>
                  <p>Email: info@nazakat.com | Phone: +91 93102 50047</p>
                  <p style="font-size: 12px; color: #999;">This is an automated confirmation email. Please do not reply to this email.</p>
              </div>
          </div>
      </body>
      </html>
    `;

    // Send email to admin/owner
    const adminMailOptions = {
      from: `"Nazakat Contact Form" <${process.env.EMAIL_USER || 'nazakatwebsite24@gmail.com'}>`,
      to: process.env.OWNER_EMAIL || 'nazakatwebsite24@gmail.com',
      subject: `New Contact Form: ${subject} - ${firstName} ${lastName}`,
      html: adminEmailContent,
      replyTo: email,
      headers: {
        'X-Priority': '2',
        'X-MSMail-Priority': 'High',
        'X-Mailer': 'Nazakat Contact System v1.0',
        'Reply-To': email,
        'Message-ID': `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@nazakat.com>`,
        'Return-Path': process.env.EMAIL_USER || 'nazakatwebsite24@gmail.com',
        'Organization': 'Nazakat'
      }
    };

    // Send confirmation email to customer
    const customerMailOptions = {
      from: `"Nazakat Team" <${process.env.EMAIL_USER || 'nazakatwebsite24@gmail.com'}>`,
      to: email,
      subject: '✅ Thank you for contacting Nazakat - We\'ll be in touch soon!',
      html: customerEmailContent,
      headers: {
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal',
        'X-Mailer': 'Nazakat Contact System v1.0',
        'Reply-To': process.env.OWNER_EMAIL || 'nazakatwebsite24@gmail.com',
        'Message-ID': `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@nazakat.com>`,
        'Return-Path': process.env.EMAIL_USER || 'nazakatwebsite24@gmail.com',
        'Organization': 'Nazakat'
      }
    };

    // Send both emails in parallel
    console.log(`Sending contact form emails - Admin: ${adminMailOptions.to}, Customer: ${customerMailOptions.to}`);
    const [adminResult, customerResult] = await Promise.all([
      transporter.sendMail(adminMailOptions),
      transporter.sendMail(customerMailOptions)
    ]);

    console.log(`Contact form emails sent - Admin: ${adminResult.messageId}, Customer: ${customerResult.messageId}`);

    return {
      success: true,
      adminMessageId: adminResult.messageId,
      customerMessageId: customerResult.messageId
    };
  } catch (error) {
    console.error('Error sending contact form email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export the email service functions
// Export the email service functions
module.exports = {
  sendCustomerOrderConfirmation,
  sendOwnerOrderNotification,
  sendCustomerDeliveryConfirmation,
  sendOwnerDeliveryConfirmation,
  sendOrderEmails,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendContactEmail,
  sendAppointmentEmail
};
