/**
 * Email Templates Module
 * 
 * This module contains HTML templates for different types of emails sent by the system.
 * Each template is a function that takes data parameters and returns formatted HTML.
 */

// Format date to IST timezone (UTC+5:30)
function formatToIST(dateString) {
  const date = new Date(dateString);
  const istFormatter = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Kolkata'
  });
  return istFormatter.format(date);
}

// Currency formatter
const currencySymbols = {
  'INR': { symbol: '₹', decimals: 0 },
  'USD': { symbol: '$', decimals: 2 },
  'EUR': { symbol: '€', decimals: 2 },
  'GBP': { symbol: '£', decimals: 2 },
  'AED': { symbol: 'د.إ', decimals: 2 },
  'CAD': { symbol: 'C$', decimals: 2 },
  'AUD': { symbol: 'A$', decimals: 2 }
};

const exchangeRates = {
  'INR': 1, 'USD': 0.012, 'EUR': 0.011, 'GBP': 0.0095, 'AED': 0.044, 'CAD': 0.016, 'AUD': 0.018
};

function formatCurrencyPrice(priceInINR, currency = 'INR') {
  const rate = exchangeRates[currency] || 1;
  const converted = priceInINR * rate;
  const currencyInfo = currencySymbols[currency] || currencySymbols['INR'];
  const { symbol, decimals } = currencyInfo;
  const formatted = decimals === 0 ? Math.round(converted).toLocaleString() : converted.toFixed(decimals);
  return `${symbol}${formatted}`;
}

/**
 * Customer Order Confirmation Email Template
 * 
 * @param {Object} data - Order data
 * @param {Object} data.customer - Customer information
 * @param {Array} data.products - Products in the order
 * @param {String} data.orderReference - Order reference number
 * @param {String} data.orderDate - Order date
 * @param {Number} data.orderTotal - Order total
 * @param {String} data.userSelectedCurrency - User's selected currency (defaults to 'INR')
 * @returns {String} - HTML email content
 */
function customerOrderTemplate(data) {
  const { customer, products, orderReference, orderDate, orderTotal, paymentMethod, status, cancellationReason, userSelectedCurrency = 'INR' } = data;

  // Format date to IST timezone
  const orderDateFormatted = formatToIST(orderDate);

  // Format the products into an HTML table with user's selected currency
  // CRITICAL: Use pre-converted prices from frontend (priceDisplay/totalDisplay) to match checkout display
  const productsHTML = products.map(product => {
    // Get currency symbol
    const currencyInfo = currencySymbols[userSelectedCurrency] || currencySymbols['INR'];
    const { symbol } = currencyInfo;
    
    // Use pre-converted display prices if available (these use frontend's live exchange rates)
    // Otherwise fall back to re-converting using backend rates (legacy fallback)
    const priceDisplay = product.priceDisplay !== undefined 
      ? `${symbol}${product.priceDisplay.toFixed(2)}` 
      : formatCurrencyPrice(product.price || 0, userSelectedCurrency);
    const totalDisplay = product.totalDisplay !== undefined 
      ? `${symbol}${product.totalDisplay.toFixed(2)}` 
      : formatCurrencyPrice(product.total || product.price * product.quantity || 0, userSelectedCurrency);
    
    return `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e1e1e1;">${product.name || product.productName || 'Product'}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e1e1e1; text-align: center;">${product.quantity || 1}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e1e1e1; text-align: right;">${priceDisplay}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e1e1e1; text-align: right;">${totalDisplay}</td>
    </tr>
  `;
  }).join('');

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${status === 'cancelled' ? 'Order Cancelled' : status === 'confirmed' ? 'Order Confirmed' : 'Order Confirmation'} - Royal Meenakari</title>
    <style>
      body { 
        font-family: Arial, sans-serif; 
        line-height: 1.6; 
        color: #333;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
      }
      .header {
        text-align: center;
        padding: 20px 0;
        background-color: #f8f9fa;
      }
      .logo {
        font-size: 24px;
        font-weight: bold;
        color: #000;
        text-decoration: none;
      }
      .alert-box {
        background-color: #fee2e2;
        border: 1px solid #fecaca;
        color: #991b1b;
        padding: 15px;
        border-radius: 5px;
        margin: 20px 0;
      }
      .order-info {
        margin: 20px 0;
        padding: 15px;
        background-color: #f8f9fa;
        border-radius: 5px;
      }
      .refund-box {
        background-color: #fffbeb;
        border: 1px solid #fbbf24;
        padding: 15px;
        border-radius: 5px;
        margin: 20px 0;
      }
      .products-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
      }
      .products-table th {
        background-color: #f1f1f1;
        padding: 10px;
        text-align: left;
      }
      .total-row {
        font-weight: bold;
        background-color: #f8f9fa;
      }
      .footer {
        margin-top: 30px;
        text-align: center;
        padding: 20px 0;
        font-size: 12px;
        color: #999;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="logo">Royal Meenakari</div>
      </div>

      ${status === 'cancelled' ? `
        <h2 style="color: #dc2626;">Order Cancelled</h2>
        <div class="alert-box">
          <h3 style="margin: 0 0 10px 0;">❌ Your order has been cancelled</h3>
          <p style="margin: 0 0 10px 0;"><strong>Reason:</strong> ${data.cancellationReason || 'Order cancelled by store administrator'}</p>
          ${data.cancellationNote ? `<p style="margin: 0;"><strong>Additional Information:</strong> ${data.cancellationNote}</p>` : ''}
        </div>
      ` : `
        <h2>Order ${status === 'confirmed' ? 'Confirmed' : 'Confirmation'}</h2>
      `}
      
      <p>Dear ${customer.firstName || ''} ${customer.lastName || ''},</p>
      <p>${status === 'cancelled' ? 'We regret to inform you that your order has been cancelled. Here are the details:' : 'Thank you for your order. We\'re pleased to confirm that we\'ve received your order and it\'s being processed.'}</p>

      <div class="order-info">
        <p><strong>Order Reference:</strong> ${orderReference || 'N/A'}</p>
        <p><strong>Order Date:</strong> ${orderDateFormatted}</p>
        <p><strong>Payment Method:</strong> ${paymentMethod || 'N/A'}</p>
      </div>

      <h3>Order Summary</h3>
      <table class="products-table">
        <thead>
          <tr>
            <th>Product</th>
            <th style="text-align: center;">Quantity</th>
            <th style="text-align: right;">Price</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${productsHTML}
          <tr class="total-row">
            <td colspan="3" style="padding: 10px; text-align: right;"><strong>Total:</strong></td>
            <td style="padding: 10px; text-align: right;">${
              data.orderTotalDisplay !== undefined 
                ? (() => {
                    const currencyInfo = currencySymbols[userSelectedCurrency] || currencySymbols['INR'];
                    const { symbol } = currencyInfo;
                    return `${symbol}${data.orderTotalDisplay.toFixed(2)}`;
                  })()
                : formatCurrencyPrice(orderTotal || 0, userSelectedCurrency)
            }</td>
          </tr>
        </tbody>
      </table>

      ${status !== 'cancelled' ? `
        <h3>Shipping Information</h3>
        <p>${customer.firstName || ''} ${customer.lastName || ''}<br>
        ${customer.address || 'N/A'}<br>
        ${customer.city ? customer.city + ', ' : ''}${customer.state ? customer.state + ' ' : ''}${customer.postalCode || ''}<br>
        Phone: ${customer.phone || 'N/A'}</p>
      ` : `
        <div class="refund-box">
          <h3 style="margin: 0 0 10px 0; color: #92400e;">💳 Refund Information</h3>
          <p style="margin: 0;">If you have already made the payment, a full refund will be processed within 5-7 business days to your original payment method.</p>
        </div>
      `}

      <p>If you have any questions${status === 'cancelled' ? ' or would like to place a new order' : ' about your order'}, please contact our customer service team at <a href="mailto:nazakat2407@gmail.com">nazakat2407@gmail.com</a> or call us at +91 93102 50047.</p>

      <p>Thank you for ${status === 'cancelled' ? 'your understanding' : 'shopping with Royal Meenakari'}!</p>

      <div class="footer">
        <p>&copy; 2025 Royal Meenakari. All Rights Reserved.</p>
        <p>This email was sent to ${customer.email || 'customer'}</p>
        <p>Contact us: nazakat2407@gmail.com | +91 93102 50047</p>
      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * Store Owner Order Notification Email Template
 * 
 * @param {Object} data - Order data
 * @param {Object} data.customer - Customer information
 * @param {Array} data.products - Products in the order
 * @param {String} data.orderReference - Order reference number
 * @param {String} data.orderDate - Order date
 * @param {Number} data.orderTotal - Order total
 * @param {String} data.userSelectedCurrency - User's selected currency (IGNORED - owner always gets INR)
 * @returns {String} - HTML email content
 */
function ownerOrderTemplate(data) {
  const { customer, products, orderReference, orderDate, orderTotal, paymentMethod, notes } = data;

  // Format date to IST timezone
  const orderDateFormatted = formatToIST(orderDate);

  // Format the products into an HTML table - OWNER ALWAYS GETS INR PRICES
  // The owner must see original INR prices, not customer's selected currency
  const productsHTML = products.map(product => {
    // CRITICAL: Owner email always shows INR, never customer's selected currency
    const currencyInfo = currencySymbols['INR'];
    const { symbol } = currencyInfo;
    
    // Always show original INR prices to owner (no currency conversion)
    // Use original price field which is in INR
    const priceINR = product.price || 0;
    const totalINR = product.total || (priceINR * (product.quantity || 1));
    
    return `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e1e1e1;">${product.name || product.productName || 'Product'}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e1e1e1; text-align: center;">${product.quantity || 1}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e1e1e1; text-align: right;">${symbol}${Math.round(priceINR).toLocaleString()}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e1e1e1; text-align: right;">${symbol}${Math.round(totalINR).toLocaleString()}</td>
    </tr>
  `;
  }).join('');

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Order Notification - Royal Meenakari</title>
    <style>
      body { 
        font-family: Arial, sans-serif; 
        line-height: 1.6; 
        color: #333;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
      }
      .header {
        text-align: center;
        padding: 20px 0;
        background-color: #f8f9fa;
      }
      .logo {
        font-size: 24px;
        font-weight: bold;
        color: #000;
        text-decoration: none;
      }
      .order-info {
        margin: 20px 0;
        padding: 15px;
        background-color: #f8f9fa;
        border-radius: 5px;
      }
      .products-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
      }
      .products-table th {
        background-color: #f1f1f1;
        padding: 10px;
        text-align: left;
      }
      .total-row {
        font-weight: bold;
        background-color: #f8f9fa;
      }
      .customer-info {
        background-color: #f8f9fa;
        padding: 15px;
        border-radius: 5px;
        margin: 20px 0;
      }
      .notes {
        background-color: #fff8e1;
        padding: 15px;
        border-radius: 5px;
        margin: 20px 0;
        border-left: 4px solid #ffc107;
      }
      .footer {
        margin-top: 30px;
        text-align: center;
        padding: 20px 0;
        font-size: 12px;
        color: #999;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="logo">Royal Meenakari</div>
      </div>

      <h2>New Order Received</h2>
      <p>A new order has been placed on your store.</p>

      <div class="order-info">
        <p><strong>Order Reference:</strong> ${orderReference || 'N/A'}</p>
        <p><strong>Order Date:</strong> ${orderDateFormatted}</p>
        <p><strong>Payment Method:</strong> ${paymentMethod || 'N/A'}</p>
      </div>

      <h3>Customer Information</h3>
      <div class="customer-info">
        <p><strong>Name:</strong> ${customer.firstName || ''} ${customer.lastName || ''}</p>
        <p><strong>Email:</strong> ${customer.email || 'N/A'}</p>
        <p><strong>Phone:</strong> ${customer.phone || 'N/A'}</p>
        <p><strong>Address:</strong><br>
        ${customer.address || 'N/A'}<br>
        ${customer.city ? customer.city + ', ' : ''}${customer.state ? customer.state + ' ' : ''}${customer.postalCode || ''}</p>
      </div>

      ${notes ? `
      <h3>Order Notes</h3>
      <div class="notes">
        <p>${notes}</p>
      </div>
      ` : ''}

      <h3>Order Items</h3>
      <table class="products-table">
        <thead>
          <tr>
            <th>Product</th>
            <th style="text-align: center;">Quantity</th>
            <th style="text-align: right;">Price</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${productsHTML}
          <tr class="total-row">
            <td colspan="3" style="padding: 10px; text-align: right;"><strong>Total:</strong></td>
            <td style="padding: 10px; text-align: right;">₹${Math.round(orderTotal || 0).toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      <p>Please process this order as soon as possible.</p>

      <div class="footer">
        <p>&copy; 2025 Royal Meenakari. All Rights Reserved.</p>
        <p>This is an automated email from your Royal Meenakari website.</p>
      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * Customer Delivery Confirmation Email Template
 */
function customerDeliveryTemplate(data) {
  const { customer, orderReference, orderDate, trackingNumber, userSelectedCurrency = 'INR' } = data;
  const orderDateFormatted = formatToIST(orderDate);

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Delivery Confirmed - Royal Meenakari</title>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { text-align: center; padding: 20px 0; background-color: #f8f9fa; }
      .logo { font-size: 24px; font-weight: bold; color: #000; }
      .success-box { background-color: #e8f5e9; border: 2px solid #4caf50; color: #2e7d32; padding: 20px; border-radius: 5px; margin: 20px 0; }
      .order-info { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
      .footer { margin-top: 30px; text-align: center; padding: 20px 0; font-size: 12px; color: #999; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="logo">Royal Meenakari</div>
      </div>

      <h2 style="color: #4caf50; text-align: center;">✅ Your Order Has Been Delivered!</h2>
      <p>Dear ${customer.firstName || ''} ${customer.lastName || ''},</p>
      <p>Great news! Your order has been successfully delivered. We hope you enjoy your beautiful jewelry from Royal Meenakari.</p>

      <div class="success-box">
        <h3 style="margin: 0 0 10px 0;">Delivery Confirmed</h3>
        <p style="margin: 0;">Your order has reached you safely.</p>
      </div>

      <div class="order-info">
        <p><strong>Order Reference:</strong> ${orderReference || 'N/A'}</p>
        <p><strong>Original Order Date:</strong> ${orderDateFormatted}</p>
        ${trackingNumber ? `<p><strong>Tracking Number:</strong> ${trackingNumber}</p>` : ''}
      </div>

      <p>If you have any questions about your order or need any assistance, please don't hesitate to contact us at <a href="mailto:nazakat2407@gmail.com">nazakat2407@gmail.com</a> or call us at +91 93102 50047.</p>

      <p>We'd love to hear from you! Please share your feedback and help us improve your shopping experience.</p>

      <div class="footer">
        <p>&copy; 2025 Royal Meenakari. All Rights Reserved.</p>
        <p>Thank you for shopping with us!</p>
        <p>Contact us: nazakat2407@gmail.com | +91 93102 50047</p>
      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * Owner Delivery Confirmation Email Template
 */
function ownerDeliveryTemplate(data) {
  const { customer, orderReference, trackingNumber } = data;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Delivered Notification</title>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { text-align: center; padding: 20px 0; background-color: #f8f9fa; }
      .logo { font-size: 24px; font-weight: bold; color: #000; }
      .success-box { background-color: #e8f5e9; border: 2px solid #4caf50; color: #2e7d32; padding: 20px; border-radius: 5px; margin: 20px 0; }
      .order-info { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
      .footer { margin-top: 30px; text-align: center; padding: 20px 0; font-size: 12px; color: #999; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="logo">Royal Meenakari</div>
      </div>

      <h2 style="color: #4caf50; text-align: center;">✅ Order Delivered</h2>
      <p>An order has been successfully delivered to the customer.</p>

      <div class="success-box">
        <h3 style="margin: 0 0 10px 0;">Delivery Confirmed</h3>
        <p style="margin: 0;">Order Reference: <strong>${orderReference}</strong></p>
      </div>

      <div class="order-info">
        <p><strong>Customer:</strong> ${customer.firstName || ''} ${customer.lastName || ''}</p>
        <p><strong>Email:</strong> ${customer.email || 'N/A'}</p>
        <p><strong>Phone:</strong> ${customer.phone || 'N/A'}</p>
        ${trackingNumber ? `<p><strong>Tracking Number:</strong> ${trackingNumber}</p>` : ''}
      </div>

      <p>The customer has been notified of the successful delivery.</p>

      <div class="footer">
        <p>&copy; 2025 Royal Meenakari. All Rights Reserved.</p>
        <p>This is an automated email from your Royal Meenakari website.</p>
      </div>
    </div>
  </body>
  </html>
  `;
}

module.exports = {
  customerOrderTemplate,
  ownerOrderTemplate,
  customerDeliveryTemplate,
  ownerDeliveryTemplate
};