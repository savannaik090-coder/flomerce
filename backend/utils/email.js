const CURRENCY_SYMBOLS = {
  INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', CAD: 'CA$', AUD: 'A$', SAR: '﷼',
};

function formatOrderDate(dateStr, timezone) {
  if (!dateStr) return '';
  let s = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) {
    s = s.replace(' ', 'T') + 'Z';
  } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(s)) {
    s = s + 'Z';
  }
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  const opts = { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true };
  if (timezone) opts.timeZone = timezone;
  try {
    return d.toLocaleString('en-IN', opts);
  } catch (e) {
    return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  }
}

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
      console.error('EMAIL FAILED: BREVO_API_KEY is not set. Email NOT sent to:', to, 'Subject:', subject);
      return 'No email provider configured';
    }

    const fromEmail = env.FROM_EMAIL || 'noreply@fluxe.in';

    const recipients = typeof to === 'string'
      ? [{ email: to }]
      : Array.isArray(to)
        ? to.map(e => typeof e === 'string' ? { email: e } : e)
        : [to];

    const toPayload = recipients.map(r => {
      const entry = { email: r.email };
      if (r.name) entry.name = r.name;
      return entry;
    });

    const payload = {
      sender: { email: fromEmail, name: 'Fluxe' },
      to: toPayload,
      subject,
      htmlContent: html,
    };
    if (text) payload.textContent = text;

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('Brevo API error:', JSON.stringify(body), 'Status:', response.status, 'To:', recipients.map(r => r.email).join(', '));
      return body.message || 'Brevo API error';
    }
    console.log('Email sent via Brevo to:', recipients.map(r => r.email).join(', '), 'Subject:', subject, 'MessageId:', body.messageId || '');
    return true;
  } catch (error) {
    console.error('Send email error:', error.message || error);
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

export function buildOrderConfirmationEmail(order, brandName, ownerEmail, currency = 'INR', options = {}, timezone = '') {
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
        ${shippingAddress.city || ''}${shippingAddress.state ? `, ${shippingAddress.state}` : ''} ${shippingAddress.pinCode || shippingAddress.pin_code || ''}<br>
        ${shippingAddress.country ? `${shippingAddress.country}<br>` : ''}
        ${shippingAddress.phone || order.customer_phone || ''}
      </p>
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
            ${order.created_at ? `<p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">Placed on ${formatOrderDate(order.created_at, timezone)}</p>` : ''}
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
            const ship = Number(order.shipping_cost || 0);
            const tot = Number(order.total || 0);
            const coupon = order.coupon_code || '';
            return `<div style="padding: 16px; background: #f8f9fa; border-radius: 8px; margin-top: 16px; text-align: right;">
              <div style="font-size: 14px; color: #555; margin-bottom: 4px;">Subtotal: <strong>${fmtH(sub)}</strong></div>
              ${disc > 0 ? `<div style="font-size: 14px; color: #16a34a; margin-bottom: 4px;">Coupon${coupon ? ` (${coupon})` : ''}: <strong>-${fmtH(disc)}</strong></div>` : ''}
              <div style="font-size: 14px; color: #555; margin-bottom: 8px;">Shipping: <strong>${ship > 0 ? fmtH(ship) : 'Free'}</strong></div>
              <div style="font-size: 18px; font-weight: 700; color: #0f172a; border-top: 1px solid #e2e8f0; padding-top: 8px;">Total: ${fmtH(tot)}</div>
            </div>`;
          })()}

          <div style="margin-top: 16px; padding: 12px 16px; background: #eff6ff; border-radius: 8px; font-size: 14px; color: #1e40af;">
            Payment Method: <strong>${order.payment_method === 'cod' || order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</strong>
          </div>

          ${addressHtml}

          ${options.trackingUrl ? `
          <div style="margin: 24px 0; text-align: center;">
            <a href="${options.trackingUrl}" style="display: inline-block; padding: 14px 32px; background: #0f172a; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px;">Track Your Order</a>
          </div>
          ` : ''}

          ${options.helpUrl ? `
          <div style="margin-top: 20px; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center;">
            <p style="margin: 0 0 6px; font-size: 14px; font-weight: 600; color: #334155;">Need help with your order?</p>
            <p style="margin: 0 0 12px; font-size: 13px; color: #64748b; line-height: 1.5;">For cancellations, changes, or any other queries about this order — we're here to help.</p>
            <a href="${options.helpUrl}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px;">Get Help With This Order</a>
          </div>
          ` : ''}

          <p style="margin-top: 24px; color: #64748b; font-size: 14px; line-height: 1.6;">Your order has been confirmed and is now being prepared. We'll update you once it's packed and on its way. For any queries, reach out to us at ${ownerEmail ? `<a href="mailto:${ownerEmail}" style="color:#0f172a;">${ownerEmail}</a>` : brandName || 'the store'}.</p>
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
  const text = `Order Confirmation\n\nThank you for your order!\nOrder Number: ${order.order_number || order.orderNumber}${discountLine}\nTotal: ${fmt(order.total)}\nPayment: ${order.payment_method === 'cod' || order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}\n\nYour order is now being prepared.`;

  return { html, text };
}

export function buildCancellationCustomerEmail(order, brandName, reason, ownerEmail, currency = 'INR', timezone = '', customerInitiated = false) {
  const contactLine = ownerEmail
    ? `For any questions or to request a refund, please contact us at <a href="mailto:${ownerEmail}" style="color:#c0392b;">${ownerEmail}</a>.`
    : 'For any questions or to request a refund, please reply to this email.';
  const heading = customerInitiated ? 'Cancellation Request Approved' : 'Order Cancelled';
  const message = customerInitiated
    ? 'Your cancellation request has been approved and your order has been cancelled.'
    : 'We\'re sorry to inform you that your order has been cancelled.';
  const reasonLabel = customerInitiated ? 'Your Reason' : 'Cancellation Reason';
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
            <h2 style="margin: 0 0 4px; font-size: 22px; color: #0f172a;">${heading}</h2>
            <p style="margin: 0; color: #64748b; font-size: 14px;">Order #${order.order_number || order.orderNumber || ''}</p>
            ${order.created_at ? `<p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">Placed on ${formatOrderDate(order.created_at, timezone)}</p>` : ''}
          </div>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">Hi ${order.customer_name || 'Customer'},</p>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">${message}</p>
          <div style="margin: 24px 0; padding: 16px; background: #fff5f5; border-left: 4px solid #c0392b; border-radius: 4px;">
            <div style="font-size: 13px; color: #888; text-transform: uppercase; font-weight: 600; margin-bottom: 6px;">${reasonLabel}</div>
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
  const textHeading = customerInitiated ? 'Cancellation Request Approved' : 'Order Cancelled';
  const text = `${textHeading}\n\nYour order #${order.order_number || order.orderNumber} has been cancelled.\nReason: ${reason || 'No reason provided'}\nTotal: ${formatCurrency(order.total, currency)}\n\n${ownerEmail ? 'Contact us at: ' + ownerEmail : 'Please reply to this email for any queries.'}`;
  return { html, text };
}

export function buildDeliveryCustomerEmail(order, brandName, ownerEmail, currency = 'INR', options = {}, timezone = '') {
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
            ${order.created_at ? `<p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">Placed on ${formatOrderDate(order.created_at, timezone)}</p>` : ''}
          </div>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">Hi ${order.customer_name || 'Customer'}, we hope you love your purchase! 🎉</p>
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
          ${options.helpUrl ? `
          <div style="margin-top: 20px; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center;">
            <p style="margin: 0 0 6px; font-size: 14px; font-weight: 600; color: #334155;">Need help with your order?</p>
            <p style="margin: 0 0 12px; font-size: 13px; color: #64748b; line-height: 1.5;">For returns, refunds, or any other queries about your order — we're here to help.</p>
            <a href="${options.helpUrl}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px;">Get Help With This Order</a>
          </div>
          ` : ''}
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

export function buildDeliveryOwnerEmail(order, brandName, currency = 'INR', timezone = '') {
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
            ${order.created_at ? `<br><strong>Ordered on:</strong> ${formatOrderDate(order.created_at, timezone)}` : ''}
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

export function buildCancellationOwnerEmail(order, brandName, reason, currency = 'INR', timezone = '') {
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
            ${order.created_at ? `<br><strong>Ordered on:</strong> ${formatOrderDate(order.created_at, timezone)}` : ''}
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

export function buildOwnerNotificationEmail(order, brandName, currency = 'INR', timezone = '') {
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
        <div style="background: #059669; color: #ffffff; padding: 24px 32px;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 700;">New Order Received!</h1>
          <p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px;">${brandName || 'Your Store'} - Order #${order.order_number || order.orderNumber || ''}</p>
          ${order.created_at ? `<p style="margin: 4px 0 0; opacity: 0.8; font-size: 13px;">${formatOrderDate(order.created_at, timezone)}</p>` : ''}
        </div>
        <div style="padding: 24px 32px;">
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
            ${shippingAddress.city || ''}${shippingAddress.state ? `, ${shippingAddress.state}` : ''} ${shippingAddress.pinCode || shippingAddress.pin_code || ''}
            ${shippingAddress.country ? `<br>${shippingAddress.country}` : ''}
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

  const text = `New Order Received!\n\nOrder #${order.order_number || order.orderNumber}\nTotal: ${formatCurrency(order.total, currency)}\nCustomer: ${order.customer_name || ''}\nPhone: ${order.customer_phone || ''}\nPayment: ${order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment'}`;

  return { html, text };
}

export function buildNewOrderReviewEmail(order, brandName, currency = 'INR', timezone = '') {
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
          <h1 style="margin: 0; font-size: 20px; font-weight: 700;">New Order - Review Required</h1>
          <p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px;">${brandName || 'Your Store'} - Order #${order.order_number || order.orderNumber || ''}</p>
          ${order.created_at ? `<p style="margin: 4px 0 0; opacity: 0.8; font-size: 13px;">${formatOrderDate(order.created_at, timezone)}</p>` : ''}
        </div>
        <div style="padding: 24px 32px;">
          <div style="padding: 14px 16px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 14px; color: #92400e; font-weight: 600;">This order is pending your review. Please confirm or cancel it from your admin panel.</p>
          </div>

          <div style="padding: 12px 16px; background: #f0fdf4; border-radius: 8px; margin-bottom: 20px;">
            <div style="font-size: 12px; color: #059669; text-transform: uppercase; font-weight: 600;">Total Amount</div>
            <div style="font-size: 22px; font-weight: 700; color: #0f172a;">${formatCurrencyHtml(order.total, currency)}</div>
            ${Number(order.discount || 0) > 0 ? `<div style="font-size: 12px; color: #16a34a; margin-top: 4px;">Coupon${order.coupon_code ? ` (${order.coupon_code})` : ''}: -${formatCurrencyHtml(order.discount, currency)} off</div>` : ''}
            <div style="font-size: 12px; color: #555; margin-top: 4px;">Shipping: ${Number(order.shipping_cost || 0) > 0 ? formatCurrencyHtml(order.shipping_cost, currency) : 'Free'}</div>
          </div>

          <h3 style="font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin: 20px 0 8px;">Customer Details</h3>
          <div style="padding: 12px 16px; background: #f8f9fa; border-radius: 8px; font-size: 14px; line-height: 1.8;">
            <strong>Name:</strong> ${order.customer_name || (shippingAddress && shippingAddress.name) || 'N/A'}<br>
            <strong>Email:</strong> ${order.customer_email || 'N/A'}<br>
            <strong>Phone:</strong> ${order.customer_phone || (shippingAddress && shippingAddress.phone) || 'N/A'}<br>
            <strong>Payment:</strong> ${order.payment_method === 'cod' || order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
          </div>

          ${shippingAddress ? `
          <h3 style="font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin: 20px 0 8px;">Shipping Address</h3>
          <div style="padding: 12px 16px; background: #f8f9fa; border-radius: 8px; font-size: 14px; line-height: 1.6;">
            ${shippingAddress.address || ''}<br>
            ${shippingAddress.city || ''}${shippingAddress.state ? `, ${shippingAddress.state}` : ''} ${shippingAddress.pinCode || shippingAddress.pin_code || ''}
            ${shippingAddress.country ? `<br>${shippingAddress.country}` : ''}
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

  const text = `New Order - Review Required\n\nOrder #${order.order_number || order.orderNumber}\nTotal: ${formatCurrency(order.total, currency)}\nCustomer: ${order.customer_name || ''}\nPhone: ${order.customer_phone || ''}\nPayment: ${order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment'}\n\nPlease review and confirm this order from your admin panel.`;

  return { html, text };
}

export function buildOrderPackedEmail(order, brandName, ownerEmail, currency = 'INR', options = {}, timezone = '') {
  const contactLine = ownerEmail
    ? `For any queries, contact us at <a href="mailto:${ownerEmail}" style="color:#7c3aed;">${ownerEmail}</a>.`
    : 'For any queries, please reply to this email.';
  const trackingHtml = options.trackingUrl ? `
    <div style="margin: 24px 0; text-align: center;">
      <a href="${options.trackingUrl}" style="display: inline-block; padding: 14px 32px; background: #7c3aed; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px;">Track Your Order</a>
    </div>
  ` : '';
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
            ${order.created_at ? `<p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">Placed on ${formatOrderDate(order.created_at, timezone)}</p>` : ''}
          </div>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">Hi ${order.customer_name || 'Customer'},</p>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">Great news! Your order has been packed and is getting ready to be shipped. We'll notify you once it's on the way.</p>
          <div style="padding: 16px; background: #f8f9fa; border-radius: 8px; font-size: 14px; color: #555; margin: 20px 0;">
            <strong>Order Total:</strong> ${formatCurrencyHtml(order.total, currency)}<br>
            <strong>Payment Method:</strong> ${order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
          </div>
          ${trackingHtml}
          <p style="margin-top: 20px; color: #64748b; font-size: 14px; line-height: 1.6;">${contactLine}</p>
        </div>
        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">Thank you for shopping with ${brandName || 'us'}!</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `Your Order Has Been Packed!\n\nOrder #${order.order_number}\nYour order has been packed and is getting ready to be shipped.\nTotal: ${formatCurrency(order.total, currency)}\n\n${ownerEmail ? 'Contact: ' + ownerEmail : ''}`;
  return { html, text };
}

export function buildOrderShippedEmail(order, brandName, ownerEmail, currency = 'INR', options = {}, timezone = '') {
  const contactLine = ownerEmail
    ? `For any queries, contact us at <a href="mailto:${ownerEmail}" style="color:#0284c7;">${ownerEmail}</a>.`
    : 'For any queries, please reply to this email.';
  const trackingDetails = (options.trackingNumber || options.carrier) ? `
    <div style="margin: 20px 0; padding: 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px;">
      <h3 style="margin: 0 0 8px; font-size: 14px; color: #1e40af; text-transform: uppercase; letter-spacing: 0.5px;">Shipping Details</h3>
      ${options.carrier ? `<p style="margin: 0 0 4px; font-size: 14px; color: #333;"><strong>Carrier:</strong> ${options.carrier}</p>` : ''}
      ${options.trackingNumber ? `<p style="margin: 0; font-size: 14px; color: #333;"><strong>Tracking Number:</strong> ${options.trackingNumber}</p>` : ''}
    </div>
  ` : '';
  const trackingHtml = options.trackingUrl ? `
    <div style="margin: 24px 0; text-align: center;">
      <a href="${options.trackingUrl}" style="display: inline-block; padding: 14px 32px; background: #0284c7; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px;">Track Your Order</a>
    </div>
  ` : '';
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #0284c7; color: #ffffff; padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">${brandName || 'Your Store'}</h1>
        </div>
        <div style="padding: 32px;">
          <div style="text-align: center; margin-bottom: 28px;">
            <div style="font-size: 52px; margin-bottom: 12px;">🚚</div>
            <h2 style="margin: 0 0 6px; font-size: 24px; color: #0f172a;">Your Order Is On The Way!</h2>
            <p style="margin: 0; color: #64748b; font-size: 14px;">Order #${order.order_number || ''}</p>
            ${order.created_at ? `<p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">Placed on ${formatOrderDate(order.created_at, timezone)}</p>` : ''}
          </div>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">Hi ${order.customer_name || 'Customer'},</p>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">Your order has been shipped and is on its way to you!</p>
          ${trackingDetails}
          <div style="padding: 16px; background: #f8f9fa; border-radius: 8px; font-size: 14px; color: #555; margin: 20px 0;">
            <strong>Order Total:</strong> ${formatCurrencyHtml(order.total, currency)}<br>
            <strong>Payment Method:</strong> ${order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
          </div>
          ${trackingHtml}
          <p style="margin-top: 20px; color: #64748b; font-size: 14px; line-height: 1.6;">${contactLine}</p>
        </div>
        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">Thank you for shopping with ${brandName || 'us'}!</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `Your Order Is On The Way!\n\nOrder #${order.order_number}\nYour order has been shipped.${options.carrier ? '\nCarrier: ' + options.carrier : ''}${options.trackingNumber ? '\nTracking: ' + options.trackingNumber : ''}\nTotal: ${formatCurrency(order.total, currency)}\n\n${ownerEmail ? 'Contact: ' + ownerEmail : ''}`;
  return { html, text };
}

export function buildCancellationRequestNotifyEmail(order, brandName, reason, reasonDetail) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f5f5f5;">
    <div style="max-width:600px;margin:0 auto;background:#fff;">
      <div style="background:#0f172a;color:#fff;padding:32px;text-align:center;">
        <h1 style="margin:0;font-size:24px;font-weight:700;">${brandName}</h1>
      </div>
      <div style="padding:32px;">
        <h2 style="margin:0 0 16px;font-size:20px;color:#ef4444;">New Cancellation Request</h2>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:20px;">
          <p style="margin:0 0 8px;font-size:14px;"><strong>Order:</strong> #${order.order_number}</p>
          <p style="margin:0 0 8px;font-size:14px;"><strong>Customer:</strong> ${order.customer_name || 'N/A'}</p>
          <p style="margin:0 0 8px;font-size:14px;"><strong>Email:</strong> ${order.customer_email || 'N/A'}</p>
          <p style="margin:0 0 8px;font-size:14px;"><strong>Reason:</strong> ${reason}</p>
          ${reasonDetail ? `<p style="margin:0;font-size:14px;"><strong>Details:</strong> ${reasonDetail}</p>` : ''}
        </div>
        <p style="color:#64748b;font-size:14px;">Please review this cancellation request in your admin panel. You can approve or reject it from the Orders > Cancellations tab.</p>
      </div>
    </div>
  </body></html>`;
  const text = `New Cancellation Request\nOrder: #${order.order_number}\nCustomer: ${order.customer_name}\nReason: ${reason}${reasonDetail ? '\nDetails: ' + reasonDetail : ''}`;
  return { html, text };
}

export function buildCancellationStatusEmail(request, brandName, status, adminNote) {
  const statusLabels = { approved: 'Approved', rejected: 'Rejected' };
  const statusColors = { approved: '#22c55e', rejected: '#ef4444' };
  const label = statusLabels[status] || status;
  const color = statusColors[status] || '#64748b';
  const approvedMsg = status === 'approved'
    ? '<p style="color:#333;font-size:14px;line-height:1.6;margin-top:16px;">Your order has been cancelled. If you paid online, your refund will be processed within 5-7 business days.</p>'
    : '<p style="color:#333;font-size:14px;line-height:1.6;margin-top:16px;">Your cancellation request has been reviewed and was not approved. If you have questions, please contact us.</p>';

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f5f5f5;">
    <div style="max-width:600px;margin:0 auto;background:#fff;">
      <div style="background:#0f172a;color:#fff;padding:32px;text-align:center;">
        <h1 style="margin:0;font-size:24px;font-weight:700;">${brandName}</h1>
      </div>
      <div style="padding:32px;">
        <h2 style="margin:0 0 16px;font-size:20px;color:#0f172a;">Cancellation Request Update</h2>
        <p style="color:#64748b;font-size:14px;margin-bottom:20px;">Your cancellation request for order <strong>#${request.order_number}</strong> has been updated.</p>
        <div style="text-align:center;margin:24px 0;">
          <span style="display:inline-block;background:${color};color:#fff;padding:8px 24px;border-radius:20px;font-weight:600;font-size:16px;">${label}</span>
        </div>
        ${approvedMsg}
        ${adminNote ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-top:16px;"><p style="margin:0 0 4px;font-size:12px;color:#64748b;font-weight:600;">Note from store:</p><p style="margin:0;font-size:14px;color:#334155;">${adminNote}</p></div>` : ''}
      </div>
    </div>
  </body></html>`;
  const text = `Cancellation Request Update\nOrder: #${request.order_number}\nStatus: ${label}${adminNote ? '\nNote: ' + adminNote : ''}`;
  return { html, text };
}
