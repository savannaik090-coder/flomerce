const CURRENCY_SYMBOLS = {
  INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', CAD: 'CA$', AUD: 'A$', SAR: '﷼',
};

function formatCurrency(amount, currency = 'INR') {
  const sym = CURRENCY_SYMBOLS[currency] || currency + ' ';
  const num = Number(amount || 0);
  if (currency === 'INR') {
    return `${sym}${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${sym}${num.toFixed(2)}`;
}

function formatCurrencyHtml(amount, currency = 'INR') {
  if (currency === 'INR') {
    const num = Number(amount || 0);
    return `&#8377;${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return formatCurrency(amount, currency);
}

export async function sendEmail(env, to, subject, html, text) {
  try {
    const apiKey = (env.BREVO_API_KEY || '').trim();
    if (!apiKey) {
      console.error('EMAIL FAILED: BREVO_API_KEY is not set in env. Email NOT sent to:', to, 'Subject:', subject);
      console.error('Available env keys:', Object.keys(env).filter(k => !k.startsWith('__') && typeof env[k] !== 'object').join(', '));
      return 'No email provider configured';
    }

    const fromEmail = env.FROM_EMAIL || 'noreply@fluxe.in';

    const recipients = typeof to === 'string'
      ? [{ email: to }]
      : Array.isArray(to)
        ? to.map(e => typeof e === 'string' ? { email: e } : e)
        : [to];

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { email: fromEmail, name: 'Fluxe' },
        to: recipients.map(r => ({ email: r.email, name: r.name || '' })),
        subject,
        htmlContent: html,
        textContent: text,
      }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('Brevo API error:', JSON.stringify(body), 'Status:', response.status, 'To:', to, 'Subject:', subject);
      return body.message || 'Brevo API error';
    }
    console.log('Email sent via Brevo to:', recipients.map(r => r.email).join(', '), 'Subject:', subject);
    return true;
  } catch (error) {
    console.error('Send email exception:', error.message || error, 'To:', to, 'Subject:', subject);
    return error.message || 'Unknown email sending error';
  }
}

function formatSelectedOptions(selectedOptions, currency = 'INR') {
  if (!selectedOptions) return '';
  const parts = [];
  if (selectedOptions.color) parts.push(`Color: ${selectedOptions.color}`);
  if (selectedOptions.customOptions) {
    for (const [label, value] of Object.entries(selectedOptions.customOptions)) {
      parts.push(`${label}: ${value}`);
    }
  }
  if (selectedOptions.pricedOptions) {
    for (const [label, val] of Object.entries(selectedOptions.pricedOptions)) {
      const priceSuffix = Number(val.price || 0) > 0 ? ` (${formatCurrencyHtml(val.price, currency)})` : '';
      parts.push(`${label}: ${val.name}${priceSuffix}`);
    }
  }
  return parts.length > 0 ? `<div style="font-size: 12px; color: #888; margin-top: 2px;">${parts.join(' &bull; ')}</div>` : '';
}

function formatSelectedOptionsText(selectedOptions, currency = 'INR') {
  if (!selectedOptions) return '';
  const parts = [];
  if (selectedOptions.color) parts.push(`Color: ${selectedOptions.color}`);
  if (selectedOptions.customOptions) {
    for (const [label, value] of Object.entries(selectedOptions.customOptions)) {
      parts.push(`${label}: ${value}`);
    }
  }
  if (selectedOptions.pricedOptions) {
    for (const [label, val] of Object.entries(selectedOptions.pricedOptions)) {
      const priceSuffix = Number(val.price || 0) > 0 ? ` (${formatCurrency(val.price, currency)})` : '';
      parts.push(`${label}: ${val.name}${priceSuffix}`);
    }
  }
  return parts.length > 0 ? ` [${parts.join(' | ')}]` : '';
}

export function buildOrderConfirmationEmail(order, brandName, ownerEmail, currency = 'INR', options = {}) {
  const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
  const fmtH = (amt) => formatCurrencyHtml(amt, currency);
  const fmt = (amt) => formatCurrency(amt, currency);

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; font-size: 14px;">${item.name}${formatSelectedOptions(item.selectedOptions, currency)}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; text-align: center; font-size: 14px;">${item.quantity}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; text-align: right; font-size: 14px; font-weight: 600;">${fmtH(item.price)}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; text-align: right; font-size: 14px; font-weight: 600;">${fmtH(Number(item.price) * Number(item.quantity))}</td>
    </tr>
  `).join('');

  const shippingAddress = typeof order.shipping_address === 'string'
    ? JSON.parse(order.shipping_address)
    : order.shipping_address || order.shippingAddress;

  const addressHtml = shippingAddress ? `
    <div style="margin-top: 24px; padding: 16px; background: #f8f9fa; border-radius: 8px;">
      <h3 style="margin: 0 0 8px; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Shipping Address</h3>
      <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #333;">
        ${shippingAddress.name || order.customer_name || ''}<br>
        ${shippingAddress.address || ''}<br>
        ${shippingAddress.city || ''}, ${shippingAddress.state || ''} ${shippingAddress.pinCode || shippingAddress.pin_code || ''}<br>
        ${shippingAddress.phone || order.customer_phone || ''}
      </p>
    </div>
  ` : '';

  const trackingHtml = options.trackingUrl ? `
    <div style="margin-top: 20px; text-align: center;">
      <a href="${options.trackingUrl}" style="display: inline-block; background: #0f172a; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Track Your Order</a>
    </div>
  ` : '';

  const cancelHtml = options.cancelUrl ? `
    <div style="margin-top: 20px; padding: 16px; background: #fefce8; border: 1px solid #fef08a; border-radius: 8px;">
      <p style="margin: 0 0 8px; font-size: 13px; color: #854d0e; font-weight: 600;">Need to cancel your order?</p>
      <p style="margin: 0; font-size: 13px; color: #a16207; line-height: 1.5;">If you need to cancel this order, <a href="${options.cancelUrl}" style="color:#854d0e;font-weight:600;">click here</a>.</p>
    </div>
  ` : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #0f172a; color: #ffffff; padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">${brandName || 'Your Store'}</h1>
        </div>
        <div style="padding: 32px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="margin: 0 0 4px; font-size: 22px; color: #0f172a;">Order Confirmed!</h2>
            <p style="margin: 0; color: #64748b; font-size: 14px;">Order #${order.order_number || order.orderNumber || ''}</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
            <thead>
              <tr style="background: #f8f9fa;">
                <th style="padding: 12px 16px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Product</th>
                <th style="padding: 12px 16px; text-align: center; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Qty</th>
                <th style="padding: 12px 16px; text-align: right; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Price</th>
                <th style="padding: 12px 16px; text-align: right; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          ${(() => {
            const sub = Number(order.subtotal || order.total || 0);
            const disc = Number(order.discount || 0);
            const tot = Number(order.total || 0);
            const coupon = order.coupon_code || '';
            if (disc > 0) {
              return `<div style="padding: 16px; background: #f8f9fa; border-radius: 8px; margin-top: 16px; text-align: right;">
                <div style="font-size: 14px; color: #555; margin-bottom: 4px;">Subtotal: <strong>${fmtH(sub)}</strong></div>
                <div style="font-size: 14px; color: #16a34a; margin-bottom: 8px;">Coupon${coupon ? ` (${coupon})` : ''}: <strong>-${fmtH(disc)}</strong></div>
                <div style="font-size: 18px; font-weight: 700; color: #0f172a; border-top: 1px solid #e2e8f0; padding-top: 8px;">Total: ${fmtH(tot)}</div>
              </div>`;
            }
            return `<div style="text-align: right; padding: 16px; background: #f8f9fa; border-radius: 8px; margin-top: 16px;">
              <span style="font-size: 18px; font-weight: 700; color: #0f172a;">Total: ${fmtH(tot)}</span>
            </div>`;
          })()}

          <div style="margin-top: 16px; padding: 12px 16px; background: #eff6ff; border-radius: 8px; font-size: 14px; color: #1e40af;">
            Payment Method: <strong>${order.payment_method === 'cod' || order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</strong>
          </div>

          ${addressHtml}

          ${trackingHtml}

          ${cancelHtml}

          <p style="margin-top: 24px; color: #64748b; font-size: 14px; line-height: 1.6;">Your order has been confirmed and is now being prepared. We'll update you once it's packed and shipped. For any queries, reach out to us at ${ownerEmail ? `<a href="mailto:${ownerEmail}" style="color:#0f172a;">${ownerEmail}</a>` : brandName || 'the store'}.</p>
        </div>
        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">Thank you for shopping with ${brandName || 'us'}!</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const _disc = Number(order.discount || 0);
  const _coupon = order.coupon_code || '';
  const discountLine = _disc > 0 ? `\nSubtotal: ${fmt(Number(order.subtotal || order.total))}\nCoupon${_coupon ? ` (${_coupon})` : ''}: -${fmt(_disc)}` : '';
  const text = `Order Confirmation\n\nThank you for your order!\nOrder Number: ${order.order_number || order.orderNumber}${discountLine}\nTotal: ${fmt(order.total)}\nPayment: ${order.payment_method === 'cod' || order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}\n\nYour order has been confirmed and is now being prepared.`;

  return { html, text };
}

export function buildCancellationCustomerEmail(order, brandName, reason, ownerEmail, currency = 'INR') {
  const contactLine = ownerEmail
    ? `For any questions or to request a refund, please contact us at <a href="mailto:${ownerEmail}" style="color:#c0392b;">${ownerEmail}</a>.`
    : 'For any questions or to request a refund, please reply to this email.';
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #c0392b; color: #ffffff; padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">${brandName || 'Your Store'}</h1>
        </div>
        <div style="padding: 32px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="margin: 0 0 4px; font-size: 22px; color: #0f172a;">Order Cancelled</h2>
            <p style="margin: 0; color: #64748b; font-size: 14px;">Order #${order.order_number || order.orderNumber || ''}</p>
          </div>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">Hi ${order.customer_name || 'Customer'},</p>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">We're sorry to inform you that your order has been cancelled.</p>
          <div style="margin: 24px 0; padding: 16px; background: #fff5f5; border-left: 4px solid #c0392b; border-radius: 4px;">
            <div style="font-size: 13px; color: #888; text-transform: uppercase; font-weight: 600; margin-bottom: 6px;">Cancellation Reason</div>
            <div style="font-size: 15px; color: #333;">${reason || 'No reason provided'}</div>
          </div>
          <div style="padding: 16px; background: #f8f9fa; border-radius: 8px; font-size: 14px; color: #555;">
            <strong>Order Total:</strong> ${formatCurrencyHtml(order.total, currency)}<br>
            <strong>Payment Method:</strong> ${order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
          </div>
          <p style="margin-top: 24px; color: #64748b; font-size: 14px; line-height: 1.6;">If you paid online and a refund is applicable, it will be processed within 5–7 business days. ${contactLine}</p>
        </div>
        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">Thank you for shopping with ${brandName || 'us'}!</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `Order Cancelled\n\nYour order #${order.order_number || order.orderNumber} has been cancelled.\nReason: ${reason || 'No reason provided'}\nTotal: ${formatCurrency(order.total, currency)}\n\n${ownerEmail ? 'Contact us at: ' + ownerEmail : 'Please reply to this email for any queries.'}`;
  return { html, text };
}

export function buildDeliveryCustomerEmail(order, brandName, ownerEmail, currency = 'INR', options = {}) {
  let items = [];
  try {
    items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
    if (!Array.isArray(items)) items = [];
  } catch (_) { items = []; }
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 10px 16px; border-bottom: 1px solid #f0f0f0; font-size: 14px;">${item.name}${formatSelectedOptions(item.selectedOptions, currency)}</td>
      <td style="padding: 10px 16px; border-bottom: 1px solid #f0f0f0; text-align: center; font-size: 14px;">${item.quantity}</td>
      <td style="padding: 10px 16px; border-bottom: 1px solid #f0f0f0; text-align: right; font-size: 14px; font-weight: 600;">${formatCurrencyHtml(Number(item.price) * Number(item.quantity), currency)}</td>
    </tr>
  `).join('');
  const contactLine = ownerEmail
    ? `If you have any issues with your order, contact us at <a href="mailto:${ownerEmail}" style="color:#27ae60;">${ownerEmail}</a>.`
    : 'If you have any issues with your order, please reply to this email.';

  const returnHtml = options.returnUrl ? `
    <div style="margin-top: 20px; padding: 16px; background: #fefce8; border: 1px solid #fef08a; border-radius: 8px;">
      <p style="margin: 0 0 8px; font-size: 13px; color: #854d0e; font-weight: 600;">Need to return this order?</p>
      <p style="margin: 0; font-size: 13px; color: #a16207; line-height: 1.5;">If you need to request a return, <a href="${options.returnUrl}" style="color:#854d0e;font-weight:600;">click here</a>.</p>
    </div>
  ` : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #27ae60; color: #ffffff; padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">${brandName || 'Your Store'}</h1>
        </div>
        <div style="padding: 32px;">
          <div style="text-align: center; margin-bottom: 28px;">
            <div style="font-size: 52px; margin-bottom: 12px;">📦</div>
            <h2 style="margin: 0 0 6px; font-size: 24px; color: #0f172a;">Your Order Has Been Delivered!</h2>
            <p style="margin: 0; color: #64748b; font-size: 14px;">Order #${order.order_number || ''}</p>
          </div>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">Hi ${order.customer_name || 'Customer'}, we hope you love your purchase!</p>
          ${items.length > 0 ? `
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background: #f8f9fa;">
                <th style="padding: 10px 16px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">Product</th>
                <th style="padding: 10px 16px; text-align: center; font-size: 12px; color: #64748b; text-transform: uppercase;">Qty</th>
                <th style="padding: 10px 16px; text-align: right; font-size: 12px; color: #64748b; text-transform: uppercase;">Amount</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div style="text-align: right; padding: 12px 16px; background: #f0fdf4; border-radius: 8px; font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 24px;">
            Total Paid: ${formatCurrencyHtml(order.total, currency)}
          </div>` : ''}
          <div style="margin: 24px 0; padding: 20px; background: #f0fdf4; border-radius: 10px; text-align: center;">
            <p style="margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #166534;">Enjoying your purchase?</p>
            <p style="margin: 0; font-size: 14px; color: #555; line-height: 1.6;">We'd love to hear from you! Share your experience and leave a review — your feedback helps us serve you better and helps other shoppers make great choices.</p>
          </div>
          ${returnHtml}
          <p style="margin-top: 20px; color: #64748b; font-size: 14px; line-height: 1.6;">${contactLine}</p>
        </div>
        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">Thank you for shopping with ${brandName || 'us'}! We look forward to serving you again.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `Your order #${order.order_number} has been delivered!\n\nWe hope you love your purchase. We'd love to hear your feedback — please leave a review!\n\nTotal Paid: ${formatCurrency(order.total, currency)}\n\n${ownerEmail ? 'For any issues, contact: ' + ownerEmail : ''}`;
  return { html, text };
}

export function buildDeliveryOwnerEmail(order, brandName, currency = 'INR') {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #1a6b3a; color: #ffffff; padding: 24px 32px;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Order Delivered ✓</h1>
          <p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px;">${brandName || 'Your Store'} – Order #${order.order_number || ''}</p>
        </div>
        <div style="padding: 24px 32px;">
          <p style="color: #333; font-size: 15px;">Order <strong>#${order.order_number || ''}</strong> has been marked as delivered.</p>
          <div style="padding: 12px 16px; background: #f0fdf4; border-radius: 8px; font-size: 14px; line-height: 1.8; margin-top: 16px;">
            <strong>Customer:</strong> ${order.customer_name || 'N/A'}<br>
            <strong>Email:</strong> ${order.customer_email || 'N/A'}<br>
            <strong>Phone:</strong> ${order.customer_phone || 'N/A'}<br>
            <strong>Total:</strong> ${formatCurrencyHtml(order.total, currency)}<br>
            <strong>Payment:</strong> ${order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
          </div>
          <p style="margin-top: 20px; color: #64748b; font-size: 14px;">The customer has been notified and prompted to leave a review. Keep up the great work!</p>
        </div>
        <div style="background: #f8f9fa; padding: 16px 32px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">This is an automated notification from ${brandName || 'Fluxe'}.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `Order Delivered\n\nOrder #${order.order_number} has been marked as delivered.\nCustomer: ${order.customer_name || ''}\nTotal: ${formatCurrency(order.total, currency)}`;
  return { html, text };
}

export function buildCancellationOwnerEmail(order, brandName, reason, currency = 'INR') {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #7f1d1d; color: #ffffff; padding: 24px 32px;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Order Cancelled</h1>
          <p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px;">${brandName || 'Your Store'} - Order #${order.order_number || order.orderNumber || ''}</p>
        </div>
        <div style="padding: 24px 32px;">
          <p style="color: #333; font-size: 15px;">An order has been marked as cancelled.</p>
          <div style="margin: 20px 0; padding: 16px; background: #fff5f5; border-left: 4px solid #c0392b; border-radius: 4px;">
            <div style="font-size: 13px; color: #888; text-transform: uppercase; font-weight: 600; margin-bottom: 6px;">Cancellation Reason</div>
            <div style="font-size: 15px; color: #333;">${reason || 'No reason provided'}</div>
          </div>
          <div style="padding: 12px 16px; background: #f8f9fa; border-radius: 8px; font-size: 14px; line-height: 1.8;">
            <strong>Order #:</strong> ${order.order_number || order.orderNumber || ''}<br>
            <strong>Customer:</strong> ${order.customer_name || 'N/A'}<br>
            <strong>Email:</strong> ${order.customer_email || 'N/A'}<br>
            <strong>Phone:</strong> ${order.customer_phone || 'N/A'}<br>
            <strong>Total:</strong> ${formatCurrencyHtml(order.total, currency)}
          </div>
        </div>
        <div style="background: #f8f9fa; padding: 16px 32px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">This is an automated notification from ${brandName || 'Fluxe'}.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `Order Cancelled\n\nOrder #${order.order_number || order.orderNumber} has been cancelled.\nReason: ${reason || 'No reason provided'}\nCustomer: ${order.customer_name || ''}\nTotal: ${formatCurrency(order.total, currency)}`;
  return { html, text };
}

export function buildOwnerNotificationEmail(order, brandName, currency = 'INR') {
  const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 10px 16px; border-bottom: 1px solid #f0f0f0; font-size: 14px;">${item.name}${formatSelectedOptions(item.selectedOptions, currency)}</td>
      <td style="padding: 10px 16px; border-bottom: 1px solid #f0f0f0; text-align: center; font-size: 14px;">${item.quantity}</td>
      <td style="padding: 10px 16px; border-bottom: 1px solid #f0f0f0; text-align: right; font-size: 14px;">${formatCurrencyHtml(Number(item.price) * Number(item.quantity), currency)}</td>
    </tr>
  `).join('');

  const shippingAddress = typeof order.shipping_address === 'string'
    ? JSON.parse(order.shipping_address)
    : order.shipping_address || order.shippingAddress;

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #f59e0b; color: #ffffff; padding: 24px 32px;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 700;">New Order Received — Pending Review</h1>
          <p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px;">${brandName || 'Your Store'} - Order #${order.order_number || order.orderNumber || ''}</p>
        </div>
        <div style="padding: 24px 32px;">
          <div style="margin-bottom: 20px; padding: 14px 16px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px;">
            <p style="margin: 0; font-size: 14px; color: #92400e; font-weight: 600;">⏳ This order is pending. Please review and confirm it from your admin panel.</p>
          </div>

          <div style="display: flex; gap: 16px; margin-bottom: 20px;">
            <div style="padding: 12px 16px; background: #f0fdf4; border-radius: 8px; flex: 1;">
              <div style="font-size: 12px; color: #059669; text-transform: uppercase; font-weight: 600;">Total Amount</div>
              <div style="font-size: 22px; font-weight: 700; color: #0f172a;">${formatCurrencyHtml(order.total, currency)}</div>
              ${Number(order.discount || 0) > 0 ? `<div style="font-size: 12px; color: #16a34a; margin-top: 4px;">Coupon${order.coupon_code ? ` (${order.coupon_code})` : ''}: -${formatCurrencyHtml(order.discount, currency)} off</div>` : ''}
            </div>
          </div>

          <h3 style="font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin: 20px 0 8px;">Customer Details</h3>
          <div style="padding: 12px 16px; background: #f8f9fa; border-radius: 8px; font-size: 14px; line-height: 1.8;">
            <strong>Name:</strong> ${order.customer_name || (shippingAddress && shippingAddress.name) || 'N/A'}<br>
            <strong>Email:</strong> ${order.customer_email || (shippingAddress && shippingAddress.email) || 'N/A'}<br>
            <strong>Phone:</strong> ${order.customer_phone || (shippingAddress && shippingAddress.phone) || 'N/A'}<br>
            <strong>Payment:</strong> ${order.payment_method === 'cod' || order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
          </div>

          ${shippingAddress ? `
          <h3 style="font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin: 20px 0 8px;">Shipping Address</h3>
          <div style="padding: 12px 16px; background: #f8f9fa; border-radius: 8px; font-size: 14px; line-height: 1.6;">
            ${shippingAddress.address || ''}<br>
            ${shippingAddress.city || ''}, ${shippingAddress.state || ''} ${shippingAddress.pinCode || shippingAddress.pin_code || ''}
          </div>
          ` : ''}

          <h3 style="font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin: 20px 0 8px;">Order Items</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f8f9fa;">
                <th style="padding: 10px 16px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">Product</th>
                <th style="padding: 10px 16px; text-align: center; font-size: 12px; color: #64748b; text-transform: uppercase;">Qty</th>
                <th style="padding: 10px 16px; text-align: right; font-size: 12px; color: #64748b; text-transform: uppercase;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>
        <div style="background: #f8f9fa; padding: 16px 32px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">This is an automated notification from ${brandName || 'Fluxe'}.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `New Order Received — Pending Review\n\nOrder #${order.order_number || order.orderNumber}\nStatus: Pending — Please review and confirm from your admin panel.\nTotal: ${formatCurrency(order.total, currency)}\nCustomer: ${order.customer_name || ''}\nPhone: ${order.customer_phone || ''}\nPayment: ${order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment'}`;

  return { html, text };
}

export function buildOrderPackedEmail(order, brandName, ownerEmail, currency = 'INR') {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #7c3aed; color: #ffffff; padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">${brandName || 'Your Store'}</h1>
        </div>
        <div style="padding: 32px;">
          <div style="text-align: center; margin-bottom: 28px;">
            <div style="font-size: 52px; margin-bottom: 12px;">📦</div>
            <h2 style="margin: 0 0 6px; font-size: 24px; color: #0f172a;">Your Order Has Been Packed!</h2>
            <p style="margin: 0; color: #64748b; font-size: 14px;">Order #${order.order_number || ''}</p>
          </div>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">Hi ${order.customer_name || 'Customer'},</p>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">Great news! Your order has been packed and will be shipped soon. We'll notify you once it's on its way with tracking details.</p>
          <div style="padding: 16px; background: #f5f3ff; border-radius: 8px; font-size: 14px; color: #5b21b6; margin: 24px 0;">
            <strong>Order Total:</strong> ${formatCurrencyHtml(order.total, currency)}<br>
            <strong>Payment Method:</strong> ${order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
          </div>
          <p style="color: #64748b; font-size: 14px; line-height: 1.6;">For any queries, reach out to us at ${ownerEmail ? `<a href="mailto:${ownerEmail}" style="color:#7c3aed;">${ownerEmail}</a>` : brandName || 'the store'}.</p>
        </div>
        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">Thank you for shopping with ${brandName || 'us'}!</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `Your Order Has Been Packed!\n\nHi ${order.customer_name || 'Customer'},\n\nYour order #${order.order_number} has been packed and will be shipped soon.\n\nOrder Total: ${formatCurrency(order.total, currency)}\n\n${ownerEmail ? 'Contact: ' + ownerEmail : ''}`;
  return { html, text };
}

export function buildOrderShippedEmail(order, brandName, ownerEmail, currency = 'INR', options = {}) {
  const trackingHtml = (options.trackingNumber || options.carrier) ? `
    <div style="margin: 24px 0; padding: 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px;">
      <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #1e40af;">Shipment Details</p>
      ${options.carrier ? `<p style="margin: 0 0 4px; font-size: 14px; color: #334155;"><strong>Carrier:</strong> ${options.carrier}</p>` : ''}
      ${options.trackingNumber ? `<p style="margin: 0; font-size: 14px; color: #334155;"><strong>Tracking Number:</strong> ${options.trackingNumber}</p>` : ''}
    </div>
  ` : '';

  const trackingBtnHtml = options.trackingUrl ? `
    <div style="text-align: center; margin: 20px 0;">
      <a href="${options.trackingUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Track Your Order</a>
    </div>
  ` : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #2563eb; color: #ffffff; padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">${brandName || 'Your Store'}</h1>
        </div>
        <div style="padding: 32px;">
          <div style="text-align: center; margin-bottom: 28px;">
            <div style="font-size: 52px; margin-bottom: 12px;">🚚</div>
            <h2 style="margin: 0 0 6px; font-size: 24px; color: #0f172a;">Your Order Has Been Shipped!</h2>
            <p style="margin: 0; color: #64748b; font-size: 14px;">Order #${order.order_number || ''}</p>
          </div>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">Hi ${order.customer_name || 'Customer'},</p>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">Your order is on its way! It has been picked up by the shipping carrier and is headed to your delivery address.</p>
          ${trackingHtml}
          ${trackingBtnHtml}
          <div style="padding: 16px; background: #f8f9fa; border-radius: 8px; font-size: 14px; color: #555; margin-top: 16px;">
            <strong>Order Total:</strong> ${formatCurrencyHtml(order.total, currency)}<br>
            <strong>Payment Method:</strong> ${order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
          </div>
          <p style="margin-top: 24px; color: #64748b; font-size: 14px; line-height: 1.6;">For any queries, reach out to us at ${ownerEmail ? `<a href="mailto:${ownerEmail}" style="color:#2563eb;">${ownerEmail}</a>` : brandName || 'the store'}.</p>
        </div>
        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">Thank you for shopping with ${brandName || 'us'}!</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `Your Order Has Been Shipped!\n\nHi ${order.customer_name || 'Customer'},\n\nYour order #${order.order_number} is on its way!\n${options.carrier ? 'Carrier: ' + options.carrier + '\n' : ''}${options.trackingNumber ? 'Tracking: ' + options.trackingNumber + '\n' : ''}\nOrder Total: ${formatCurrency(order.total, currency)}\n\n${ownerEmail ? 'Contact: ' + ownerEmail : ''}`;
  return { html, text };
}
