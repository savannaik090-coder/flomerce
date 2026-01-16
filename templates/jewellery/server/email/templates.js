/**
 * Email Templates Module
 * 
 * This module contains HTML templates for different types of emails sent by the system.
 * Each template is a function that takes data parameters and returns formatted HTML.
 */

/**
 * Helper function to convert date to IST timezone
 */
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

/**
 * Helper function to format price based on currency
 */
function formatPrice(priceInINR, currency = 'INR') {
  const EXCHANGE_RATES = {
    'INR': 1,
    'USD': 0.012,
    'EUR': 0.011,
    'GBP': 0.0095,
    'AED': 0.044,
    'CAD': 0.016,
    'AUD': 0.018
  };

  const CURRENCY_SYMBOLS = {
    'INR': { symbol: '₹', decimals: 0 },
    'USD': { symbol: '$', decimals: 2 },
    'EUR': { symbol: '€', decimals: 2 },
    'GBP': { symbol: '£', decimals: 2 },
    'AED': { symbol: 'د.إ', decimals: 2 },
    'CAD': { symbol: 'C$', decimals: 2 },
    'AUD': { symbol: 'A$', decimals: 2 }
  };

  const rate = EXCHANGE_RATES[currency] || 1;
  const convertedPrice = priceInINR * rate;
  const currencyInfo = CURRENCY_SYMBOLS[currency] || CURRENCY_SYMBOLS['INR'];
  const { symbol, decimals } = currencyInfo;

  let formattedPrice;
  if (decimals === 0) {
    formattedPrice = Math.round(convertedPrice).toLocaleString('en-IN');
  } else {
    formattedPrice = convertedPrice.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  return `${symbol}${formattedPrice}`;
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
 * @param {String} data.selectedCurrency - Customer's selected currency (default: INR)
 * @returns {String} - HTML email content
 */
function customerOrderTemplate(data) {
  const { customer, products, orderReference, orderDate, orderTotal, paymentMethod, userSelectedCurrency = 'INR' } = data;

  // Format date to IST
  const orderDateFormatted = formatToIST(orderDate);

  // Format the products into an HTML table with customer's selected currency
  const productsHTML = products.map(product => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e1e1e1;">${product.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e1e1e1; text-align: center;">${product.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e1e1e1; text-align: right;">${formatPrice(product.price, selectedCurrency)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e1e1e1; text-align: right;">${formatPrice(product.total, selectedCurrency)}</td>
    </tr>
  `).join('');

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation - Royal Meenakari</title>
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

      <h2>Order Confirmation</h2>
      <p>Dear ${customer.firstName} ${customer.lastName},</p>
      <p>Thank you for your order. We're pleased to confirm that we've received your order and it's being processed.</p>

      <div class="order-info">
        <p><strong>Order Reference:</strong> ${orderReference}</p>
        <p><strong>Order Date:</strong> ${orderDateFormatted} IST</p>
        <p><strong>Payment Method:</strong> ${paymentMethod}</p>
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
            <td style="padding: 10px; text-align: right;">${formatPrice(orderTotal, selectedCurrency)}</td>
          </tr>
        </tbody>
      </table>

      <h3>Shipping Information</h3>
      <p>${customer.firstName} ${customer.lastName}<br>
      ${customer.address}<br>
      ${customer.city ? customer.city + ', ' : ''}${customer.state ? customer.state + ' ' : ''}${customer.postalCode || ''}<br>
      Phone: ${customer.phone}</p>

      <p>If you have any questions about your order, please contact our customer service team at <a href="mailto:nazakatwebsite24@gmail.com">nazakatwebsite24@gmail.com</a>.</p>

      <p>Thank you for shopping with Royal Meenakari!</p>

      <div class="footer">
        <p>&copy; 2025 Royal Meenakari. All Rights Reserved.</p>
        <p>This email was sent to ${customer.email}</p>
        <p>Contact us: nazakat2407@gmail.com | +91 93102 50047</p>
      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * Store Owner Order Notification Email Template
 * (Always in INR)
 * 
 * @param {Object} data - Order data
 * @returns {String} - HTML email content
 */
function ownerOrderTemplate(data) {
  const { customer, products, orderReference, orderDate, orderTotal, paymentMethod, notes, userSelectedCurrency = 'INR' } = data;

  // Format date to IST
  const orderDateFormatted = formatToIST(orderDate);

  // Format the products into an HTML table - always in INR for owner
  const productsHTML = products.map(product => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e1e1e1;">${product.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e1e1e1; text-align: center;">${product.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e1e1e1; text-align: right;">${formatPrice(product.price, 'INR')}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e1e1e1; text-align: right;">${formatPrice(product.total, 'INR')}</td>
    </tr>
  `).join('');

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
      .currency-note {
        background-color: #e3f2fd;
        padding: 10px;
        border-radius: 5px;
        border-left: 4px solid #2196F3;
        margin: 15px 0;
        font-size: 12px;
        color: #1565c0;
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

      <div class="currency-note">
        <strong>Note:</strong> All prices below are in INR. Customer paid in ${userSelectedCurrency}.
      </div>

      <div class="order-info">
        <p><strong>Order Reference:</strong> ${orderReference}</p>
        <p><strong>Order Date:</strong> ${orderDateFormatted} IST</p>
        <p><strong>Payment Method:</strong> ${paymentMethod}</p>
        <p><strong>Customer Currency:</strong> ${userSelectedCurrency}</p>
      </div>

      <h3>Customer Information</h3>
      <div class="customer-info">
        <p><strong>Name:</strong> ${customer.firstName} ${customer.lastName}</p>
        <p><strong>Email:</strong> ${customer.email}</p>
        <p><strong>Phone:</strong> ${customer.phone}</p>
        <p><strong>Address:</strong><br>
        ${customer.address}<br>
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
            <th style="text-align: right;">Price (INR)</th>
            <th style="text-align: right;">Total (INR)</th>
          </tr>
        </thead>
        <tbody>
          ${productsHTML}
          <tr class="total-row">
            <td colspan="3" style="padding: 10px; text-align: right;"><strong>Total (INR):</strong></td>
            <td style="padding: 10px; text-align: right;">${formatPrice(orderTotal, 'INR')}</td>
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
 * Customer Order Cancellation Email Template
 * 
 * @param {Object} data - Order data
 * @param {String} data.selectedCurrency - Customer's selected currency
 * @returns {String} - HTML email content
 */
function customerCancellationTemplate(data) {
  const { customer, products, orderReference, orderDate, orderTotal, paymentMethod, cancellationReason, userSelectedCurrency = 'INR' } = data;

  // Format date to IST
  const orderDateFormatted = formatToIST(orderDate);

  // Format the products into an HTML table with customer's selected currency
  const productsHTML = products.map(product => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e1e1e1;">${product.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e1e1e1; text-align: center;">${product.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e1e1e1; text-align: right;">${formatPrice(product.price, userSelectedCurrency)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e1e1e1; text-align: right;">${formatPrice(product.total, userSelectedCurrency)}</td>
    </tr>
  `).join('');

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Cancellation - Royal Meenakari</title>
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
        background-color: #fee2e2;
        border-radius: 8px;
        margin-bottom: 20px;
      }
      .logo {
        font-size: 24px;
        font-weight: bold;
        color: #dc2626;
        text-decoration: none;
      }
      .order-info {
        margin: 20px 0;
        padding: 15px;
        background-color: #f8fafc;
        border-radius: 5px;
        border-left: 4px solid #dc2626;
      }
      .cancellation-notice {
        background-color: #fee2e2;
        color: #991b1b;
        padding: 15px;
        border-radius: 5px;
        margin: 20px 0;
        text-align: center;
        font-weight: bold;
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
        background-color: #f8fafc;
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
        <h1 class="logo">Royal Meenakari</h1>
        <h2 style="color: #dc2626; margin: 10px 0;">Order Cancelled</h2>
      </div>

      <div class="cancellation-notice">
        Your order has been cancelled
      </div>

      <p>Dear ${customer.firstName} ${customer.lastName},</p>

      <p>We regret to inform you that your order has been cancelled. Below are the details of your cancelled order:</p>

      <div class="order-info">
        <p><strong>Order Reference:</strong> ${orderReference}</p>
        <p><strong>Order Date:</strong> ${orderDateFormatted} IST</p>
        <p><strong>Payment Method:</strong> ${paymentMethod}</p>
        <p><strong>Total Amount:</strong> ${formatPrice(orderTotal, userSelectedCurrency)}</p>
        ${cancellationReason ? `<p><strong>Cancellation Reason:</strong> ${cancellationReason}</p>` : ''}
      </div>

      <h3>Cancelled Items</h3>
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
            <td style="padding: 10px; text-align: right;">${formatPrice(orderTotal, userSelectedCurrency)}</td>
          </tr>
        </tbody>
      </table>

      <p>If a refund is applicable, it will be processed within 5-7 business days to your original payment method.</p>

      <p>If you have any questions about this cancellation, please contact our customer service team at <a href="mailto:nazakat2407@gmail.com">nazakat2407@gmail.com</a>.</p>

      <p>Thank you for your understanding.</p>

      <div class="footer">
        <p>&copy; 2025 Royal Meenakari. All Rights Reserved.</p>
        <p>This email was sent to ${customer.email}</p>
        <p>Contact us: nazakat2407@gmail.com | +91 93102 50047</p>
      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * Owner Order Cancellation Notification Email Template
 * (Always in INR)
 * 
 * @param {Object} data - Order data
 * @returns {String} - HTML email content
 */
function ownerCancellationTemplate(data) {
  const { customer, products, orderReference, orderDate, orderTotal, paymentMethod, notes, cancellationReason, userSelectedCurrency = 'INR' } = data;

  // Format date to IST
  const orderDateFormatted = formatToIST(orderDate);

  // Format the products into an HTML table - always in INR for owner
  const productsHTML = products.map(product => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e1e1e1;">${product.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e1e1e1; text-align: center;">${product.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e1e1e1; text-align: right;">${formatPrice(product.price, 'INR')}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e1e1e1; text-align: right;">${formatPrice(product.total, 'INR')}</td>
    </tr>
  `).join('');

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Cancellation Notification - Royal Meenakari</title>
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
        background-color: #fee2e2;
        border-radius: 8px;
        margin-bottom: 20px;
      }
      .logo {
        font-size: 24px;
        font-weight: bold;
        color: #dc2626;
        text-decoration: none;
      }
      .order-info {
        margin: 20px 0;
        padding: 15px;
        background-color: #f8fafc;
        border-radius: 5px;
        border-left: 4px solid #dc2626;
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
        background-color: #f8fafc;
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
        <h1 class="logo">Royal Meenakari</h1>
        <h2 style="color: #dc2626; margin: 10px 0;">Order Cancellation</h2>
      </div>

      <p>An order has been cancelled in your Royal Meenakari store.</p>

      <div class="order-info">
        <p><strong>Order Reference:</strong> ${orderReference}</p>
        <p><strong>Order Date:</strong> ${orderDateFormatted} IST</p>
        <p><strong>Customer:</strong> ${customer.firstName} ${customer.lastName}</p>
        <p><strong>Email:</strong> ${customer.email}</p>
        <p><strong>Phone:</strong> ${customer.phone}</p>
        <p><strong>Payment Method:</strong> ${paymentMethod}</p>
        <p><strong>Total Amount (INR):</strong> ${formatPrice(orderTotal, 'INR')}</p>
        ${cancellationReason ? `<p><strong>Cancellation Reason:</strong> ${cancellationReason}</p>` : ''}
        ${notes ? `<p><strong>Order Notes:</strong> ${notes}</p>` : ''}
      </div>

      <h3>Cancelled Items</h3>
      <table class="products-table">
        <thead>
          <tr>
            <th>Product</th>
            <th style="text-align: center;">Quantity</th>
            <th style="text-align: right;">Price (INR)</th>
            <th style="text-align: right;">Total (INR)</th>
          </tr>
        </thead>
        <tbody>
          ${productsHTML}
          <tr class="total-row">
            <td colspan="3" style="padding: 10px; text-align: right;"><strong>Total (INR):</strong></td>
            <td style="padding: 10px; text-align: right;">${formatPrice(orderTotal, 'INR')}</td>
          </tr>
        </tbody>
      </table>

      <p>You may need to process a refund for this cancelled order if payment was already collected.</p>

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
 * 
 * @param {Object} data - Order data
 * @param {String} data.selectedCurrency - Customer's selected currency
 * @returns {String} - HTML email content
 */
function customerDeliveryTemplate(data) {
  const { customer, orderReference, orderDate, orderTotal, userSelectedCurrency = 'INR', trackingNumber, deliveryDate } = data;

  const orderDateFormatted = formatToIST(orderDate);
  const deliveryDateFormatted = deliveryDate ? formatToIST(deliveryDate) : 'Today';

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Delivery Confirmation - Royal Meenakari</title>
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
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        border-radius: 8px;
        margin-bottom: 20px;
        color: white;
      }
      .logo {
        font-size: 24px;
        font-weight: bold;
        color: white;
        text-decoration: none;
      }
      .success-badge {
        background-color: #d1fae5;
        color: #065f46;
        padding: 15px;
        border-radius: 5px;
        margin: 20px 0;
        text-align: center;
        font-weight: bold;
      }
      .order-info {
        margin: 20px 0;
        padding: 15px;
        background-color: #f0fdf4;
        border-radius: 5px;
        border-left: 4px solid #10b981;
      }
      .info-row {
        margin: 10px 0;
        padding: 10px;
        background-color: white;
        border-radius: 3px;
      }
      .label {
        font-weight: bold;
        color: #059669;
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
        <h2 style="margin: 10px 0; font-size: 18px;">Package Delivered!</h2>
      </div>

      <div class="success-badge">
        ✓ Your order has been delivered successfully
      </div>

      <p>Dear ${customer.firstName} ${customer.lastName},</p>

      <p>Great news! Your order has been delivered to your address. We hope you enjoy your beautiful jewelry from Royal Meenakari!</p>

      <div class="order-info">
        <div class="info-row">
          <span class="label">Order Reference:</span> ${orderReference}
        </div>
        <div class="info-row">
          <span class="label">Original Order Date:</span> ${orderDateFormatted} IST
        </div>
        <div class="info-row">
          <span class="label">Delivered On:</span> ${deliveryDateFormatted} IST
        </div>
        ${trackingNumber ? `<div class="info-row">
          <span class="label">Tracking Number:</span> ${trackingNumber}
        </div>` : ''}
        <div class="info-row">
          <span class="label">Order Total:</span> ${formatPrice(orderTotal, selectedCurrency)}
        </div>
      </div>

      <h3>Next Steps</h3>
      <p>If you have any questions about your order or need to report any issues with the delivered items, please don't hesitate to contact us:</p>
      <ul>
        <li>Email: <a href="mailto:nazakat2407@gmail.com">nazakat2407@gmail.com</a></li>
        <li>Phone: +91 93102 50047</li>
      </ul>

      <p>We appreciate your business and look forward to serving you again!</p>

      <div class="footer">
        <p>&copy; 2025 Royal Meenakari. All Rights Reserved.</p>
        <p>This email was sent to ${customer.email}</p>
        <p>Contact us: nazakat2407@gmail.com | +91 93102 50047</p>
      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * Owner Delivery Confirmation Email Template
 * 
 * @param {Object} data - Order data
 * @returns {String} - HTML email content
 */
function ownerDeliveryTemplate(data) {
  const { customer, orderReference, orderDate, orderTotal, trackingNumber, deliveryDate } = data;

  const orderDateFormatted = formatToIST(orderDate);
  const deliveryDateFormatted = deliveryDate ? formatToIST(deliveryDate) : 'Today';

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Delivery Confirmation - Royal Meenakari</title>
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
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        border-radius: 8px;
        margin-bottom: 20px;
        color: white;
      }
      .logo {
        font-size: 24px;
        font-weight: bold;
        color: white;
        text-decoration: none;
      }
      .order-info {
        margin: 20px 0;
        padding: 15px;
        background-color: #f0fdf4;
        border-radius: 5px;
        border-left: 4px solid #10b981;
      }
      .info-row {
        margin: 10px 0;
        padding: 10px;
        background-color: white;
        border-radius: 3px;
      }
      .label {
        font-weight: bold;
        color: #059669;
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
        <h2 style="margin: 10px 0; font-size: 18px;">Order Delivered</h2>
      </div>

      <p>An order has been successfully delivered to the customer.</p>

      <div class="order-info">
        <div class="info-row">
          <span class="label">Order Reference:</span> ${orderReference}
        </div>
        <div class="info-row">
          <span class="label">Customer:</span> ${customer.firstName} ${customer.lastName}
        </div>
        <div class="info-row">
          <span class="label">Customer Email:</span> ${customer.email}
        </div>
        <div class="info-row">
          <span class="label">Original Order Date:</span> ${orderDateFormatted} IST
        </div>
        <div class="info-row">
          <span class="label">Delivery Confirmed On:</span> ${deliveryDateFormatted} IST
        </div>
        ${trackingNumber ? `<div class="info-row">
          <span class="label">Tracking Number:</span> ${trackingNumber}
        </div>` : ''}
        <div class="info-row">
          <span class="label">Order Total (INR):</span> ${formatPrice(orderTotal, 'INR')}
        </div>
      </div>

      <p>The customer has been notified about the delivery via email.</p>

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
  customerCancellationTemplate,
  ownerCancellationTemplate,
  customerDeliveryTemplate,
  ownerDeliveryTemplate
};
