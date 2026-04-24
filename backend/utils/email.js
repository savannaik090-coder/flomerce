import { FROM_EMAIL } from '../config.js';
import { translateLabels } from './email-i18n.js';

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

export function getOwnerRecipients(settings = {}, config = {}) {
  const primary = (settings.email || settings.ownerEmail || config.email || '').trim();
  const ccRaw = Array.isArray(settings.notificationCcEmails) ? settings.notificationCcEmails : [];
  const seen = new Set();
  const out = [];
  const addEmail = (raw) => {
    if (!raw || typeof raw !== 'string') return;
    const e = raw.trim().toLowerCase();
    if (!e) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return;
    if (seen.has(e)) return;
    seen.add(e);
    out.push(e);
  };
  addEmail(primary);
  for (const cc of ccRaw.slice(0, 5)) addEmail(cc);
  return out;
}

export async function sendEmail(env, to, subject, html, text, options = {}) {
  try {
    const apiKey = (env.BREVO_API_KEY || '').trim();
    if (!apiKey) {
      console.error('EMAIL FAILED: BREVO_API_KEY is not set. Email NOT sent to:', to, 'Subject:', subject);
      return 'No email provider configured';
    }

    const fromEmail = env.FROM_EMAIL || FROM_EMAIL;
    const senderName = (options && options.senderName) ? options.senderName : 'Flomerce';

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
      sender: { email: fromEmail, name: senderName },
      to: toPayload,
      subject,
      htmlContent: html,
    };
    if (text) payload.textContent = text;
    if (options && options.replyTo) {
      payload.replyTo = typeof options.replyTo === 'string'
        ? { email: options.replyTo, name: senderName }
        : options.replyTo;
    }

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

export async function buildOrderConfirmationEmail(order, brandName, ownerEmail, currency = 'INR', options = {}, timezone = '', env = null, siteId = null, targetLang = null) {
  const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
  const fmtH = (amt) => formatCurrencyHtml(amt, currency);
  const fmt = (amt) => formatCurrency(amt, currency);

  const t = await translateLabels(env, siteId, targetLang, {
    YOUR_STORE: 'Your Store',
    ORDER_CONFIRMED: 'Order Confirmed!',
    PLACED_ON: 'Placed on',
    PRODUCT: 'Product',
    QTY: 'Qty',
    PRICE: 'Price',
    TOTAL: 'Total',
    SUBTOTAL: 'Subtotal',
    COUPON: 'Coupon',
    SHIPPING: 'Shipping',
    FREE: 'Free',
    PAYMENT_METHOD: 'Payment Method',
    COD: 'Cash on Delivery',
    ONLINE_PAYMENT: 'Online Payment',
    SHIPPING_ADDRESS: 'Shipping Address',
    TRACK_ORDER: 'Track Your Order',
    NEED_HELP: 'Need help with your order?',
    HELP_DESC: 'For cancellations, changes, or any other queries about this order — we\'re here to help.',
    GET_HELP_BTN: 'Get Help With This Order',
    NEED_INVOICE: 'Need a GST invoice for this order?',
    DOWNLOAD_INVOICE: 'Download Invoice',
    CONFIRMED_MSG: 'Your order has been confirmed and is now being prepared. We\'ll update you once it\'s packed and on its way.',
    QUERIES_REACH: 'For any queries, reach out to us at',
    THE_STORE: 'the store',
    THANK_YOU_SHOPPING: 'Thank you for shopping with',
    US: 'us',
    ORDER_LBL: 'Order',
    TXT_ORDER_CONF: 'Order Confirmation',
    TXT_THANK_YOU: 'Thank you for your order!',
    TXT_ORDER_NUMBER: 'Order Number',
    TXT_PAYMENT: 'Payment',
    TXT_PREPARING: 'Your order is now being prepared.',
  });

  const isCod = order.payment_method === 'cod' || order.paymentMethod === 'cod';
  const paymentLabel = isCod ? t.COD : t.ONLINE_PAYMENT;

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
      <h3 style="margin: 0 0 8px; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">${t.SHIPPING_ADDRESS}</h3>
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
          <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">${brandName || t.YOUR_STORE}</h1>
        </div>
        <div style="padding: 32px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="margin: 0 0 4px; font-size: 22px; color: #0f172a;">${t.ORDER_CONFIRMED}</h2>
            <p style="margin: 0; color: #64748b; font-size: 14px;">${t.ORDER_LBL} #${order.order_number || order.orderNumber || ''}</p>
            ${order.created_at ? `<p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">${t.PLACED_ON} ${formatOrderDate(order.created_at, timezone)}</p>` : ''}
          </div>

          <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
            <thead>
              <tr style="background: #f8f9fa;">
                <th style="padding: 12px 16px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">${t.PRODUCT}</th>
                <th style="padding: 12px 16px; text-align: center; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">${t.QTY}</th>
                <th style="padding: 12px 16px; text-align: right; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">${t.PRICE}</th>
                <th style="padding: 12px 16px; text-align: right; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">${t.TOTAL}</th>
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
              <div style="font-size: 14px; color: #555; margin-bottom: 4px;">${t.SUBTOTAL}: <strong>${fmtH(sub)}</strong></div>
              ${disc > 0 ? `<div style="font-size: 14px; color: #16a34a; margin-bottom: 4px;">${t.COUPON}${coupon ? ` (${coupon})` : ''}: <strong>-${fmtH(disc)}</strong></div>` : ''}
              <div style="font-size: 14px; color: #555; margin-bottom: 8px;">${t.SHIPPING}: <strong>${ship > 0 ? fmtH(ship) : t.FREE}</strong></div>
              <div style="font-size: 18px; font-weight: 700; color: #0f172a; border-top: 1px solid #e2e8f0; padding-top: 8px;">${t.TOTAL}: ${fmtH(tot)}</div>
            </div>`;
          })()}

          <div style="margin-top: 16px; padding: 12px 16px; background: #eff6ff; border-radius: 8px; font-size: 14px; color: #1e40af;">
            ${t.PAYMENT_METHOD}: <strong>${paymentLabel}</strong>
          </div>

          ${addressHtml}

          ${options.trackingUrl ? `
          <div style="margin: 24px 0; text-align: center;">
            <a href="${options.trackingUrl}" style="display: inline-block; padding: 14px 32px; background: #0f172a; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px;">${t.TRACK_ORDER}</a>
          </div>
          ` : ''}

          ${options.helpUrl ? `
          <div style="margin-top: 20px; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center;">
            <p style="margin: 0 0 6px; font-size: 14px; font-weight: 600; color: #334155;">${t.NEED_HELP}</p>
            <p style="margin: 0 0 12px; font-size: 13px; color: #64748b; line-height: 1.5;">${t.HELP_DESC}</p>
            <a href="${options.helpUrl}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px;">${t.GET_HELP_BTN}</a>
          </div>
          ` : ''}

          ${options.invoiceUrl ? `
          <div style="margin-top: 16px; padding: 14px 16px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; text-align: center;">
            <p style="margin: 0 0 10px; font-size: 13px; color: #0369a1;">${t.NEED_INVOICE}</p>
            <a href="${options.invoiceUrl}" style="display:inline-block;background:#0369a1;color:#fff;padding:9px 22px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px;">${t.DOWNLOAD_INVOICE}</a>
          </div>
          ` : ''}

          <p style="margin-top: 24px; color: #64748b; font-size: 14px; line-height: 1.6;">${t.CONFIRMED_MSG} ${t.QUERIES_REACH} ${ownerEmail ? `<a href="mailto:${ownerEmail}" style="color:#0f172a;">${ownerEmail}</a>` : brandName || t.THE_STORE}.</p>
        </div>
        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">${t.THANK_YOU_SHOPPING} ${brandName || t.US}!</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const _disc = Number(order.discount || 0);
  const _coupon = order.coupon_code || '';
  const discountLine = _disc > 0 ? `\n${t.SUBTOTAL}: ${fmt(Number(order.subtotal || order.total))}\n${t.COUPON}${_coupon ? ` (${_coupon})` : ''}: -${fmt(_disc)}` : '';
  const text = `${t.TXT_ORDER_CONF}\n\n${t.TXT_THANK_YOU}\n${t.TXT_ORDER_NUMBER}: ${order.order_number || order.orderNumber}${discountLine}\n${t.TOTAL}: ${fmt(order.total)}\n${t.TXT_PAYMENT}: ${paymentLabel}\n\n${t.TXT_PREPARING}`;

  return { html, text };
}

export async function buildCancellationCustomerEmail(order, brandName, reason, ownerEmail, currency = 'INR', timezone = '', customerInitiated = false, env = null, siteId = null, targetLang = null) {
  const t = await translateLabels(env, siteId, targetLang, {
    YOUR_STORE: 'Your Store',
    ORDER_LBL: 'Order',
    PLACED_ON: 'Placed on',
    CONTACT_OWNER: 'For any questions or to request a refund, please contact us at',
    CONTACT_REPLY: 'For any questions or to request a refund, please reply to this email.',
    HEADING_APPROVED: 'Cancellation Request Approved',
    HEADING_CANCELLED: 'Order Cancelled',
    MSG_APPROVED: 'Your cancellation request has been approved and your order has been cancelled.',
    MSG_CANCELLED: 'We\'re sorry to inform you that your order has been cancelled.',
    REASON_YOURS: 'Your Reason',
    REASON_GENERIC: 'Cancellation Reason',
    HI: 'Hi',
    CUSTOMER: 'Customer',
    NO_REASON: 'No reason provided',
    ORDER_TOTAL: 'Order Total',
    PAYMENT_METHOD: 'Payment Method',
    COD: 'Cash on Delivery',
    ONLINE_PAYMENT: 'Online Payment',
    REFUND_NOTE: 'If you paid online and a refund is applicable, it will be processed within 5–7 business days.',
    THANK_YOU_SHOPPING: 'Thank you for shopping with',
    US: 'us',
    TXT_CANCELLED: 'Order Cancelled',
    TXT_REASON: 'Reason',
    TXT_TOTAL: 'Total',
    TXT_CONTACT: 'Contact us at',
    TXT_REPLY: 'Please reply to this email for any queries.',
    TXT_ORDER_HASH: 'Your order',
    TXT_HAS_BEEN_CANCELLED: 'has been cancelled.',
  });
  const contactLine = ownerEmail
    ? `${t.CONTACT_OWNER} <a href="mailto:${ownerEmail}" style="color:#c0392b;">${ownerEmail}</a>.`
    : t.CONTACT_REPLY;
  const heading = customerInitiated ? t.HEADING_APPROVED : t.HEADING_CANCELLED;
  const message = customerInitiated ? t.MSG_APPROVED : t.MSG_CANCELLED;
  const reasonLabel = customerInitiated ? t.REASON_YOURS : t.REASON_GENERIC;
  const isCod = order.payment_method === 'cod';
  const paymentLabel = isCod ? t.COD : t.ONLINE_PAYMENT;
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #c0392b; color: #ffffff; padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">${brandName || t.YOUR_STORE}</h1>
        </div>
        <div style="padding: 32px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="margin: 0 0 4px; font-size: 22px; color: #0f172a;">${heading}</h2>
            <p style="margin: 0; color: #64748b; font-size: 14px;">${t.ORDER_LBL} #${order.order_number || order.orderNumber || ''}</p>
            ${order.created_at ? `<p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">${t.PLACED_ON} ${formatOrderDate(order.created_at, timezone)}</p>` : ''}
          </div>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">${t.HI} ${order.customer_name || t.CUSTOMER},</p>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">${message}</p>
          <div style="margin: 24px 0; padding: 16px; background: #fff5f5; border-left: 4px solid #c0392b; border-radius: 4px;">
            <div style="font-size: 13px; color: #888; text-transform: uppercase; font-weight: 600; margin-bottom: 6px;">${reasonLabel}</div>
            <div style="font-size: 15px; color: #333;">${reason || t.NO_REASON}</div>
          </div>
          <div style="padding: 16px; background: #f8f9fa; border-radius: 8px; font-size: 14px; color: #555;">
            <strong>${t.ORDER_TOTAL}:</strong> ${formatCurrencyHtml(order.total, currency)}<br>
            <strong>${t.PAYMENT_METHOD}:</strong> ${paymentLabel}
          </div>
          <p style="margin-top: 24px; color: #64748b; font-size: 14px; line-height: 1.6;">${t.REFUND_NOTE} ${contactLine}</p>
        </div>
        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">${t.THANK_YOU_SHOPPING} ${brandName || t.US}!</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const textHeading = customerInitiated ? t.HEADING_APPROVED : t.HEADING_CANCELLED;
  const text = `${textHeading}\n\n${t.TXT_ORDER_HASH} #${order.order_number || order.orderNumber} ${t.TXT_HAS_BEEN_CANCELLED}\n${t.TXT_REASON}: ${reason || t.NO_REASON}\n${t.TXT_TOTAL}: ${formatCurrency(order.total, currency)}\n\n${ownerEmail ? t.TXT_CONTACT + ': ' + ownerEmail : t.TXT_REPLY}`;
  return { html, text };
}

export async function buildDeliveryCustomerEmail(order, brandName, ownerEmail, currency = 'INR', options = {}, timezone = '', env = null, siteId = null, targetLang = null) {
  const t = await translateLabels(env, siteId, targetLang, {
    YOUR_STORE: 'Your Store',
    DELIVERED_TITLE: 'Your Order Has Been Delivered!',
    ORDER_LBL: 'Order',
    PLACED_ON: 'Placed on',
    HI: 'Hi',
    CUSTOMER: 'Customer',
    LOVE_PURCHASE: 'we hope you love your purchase! 🎉',
    PRODUCT: 'Product',
    QTY: 'Qty',
    AMOUNT: 'Amount',
    TOTAL_PAID: 'Total Paid',
    HOW_EXPERIENCE: 'How was your experience?',
    FEEDBACK_NOTE: 'Your feedback helps other shoppers and helps us improve.',
    WRITE_REVIEW: 'Write a Review',
    ENJOYING: 'Enjoying your purchase?',
    LOVE_HEAR: 'We\'d love to hear from you! Share your experience and leave a review — your feedback helps us serve you better and helps other shoppers make great choices.',
    NEED_HELP: 'Need help with your order?',
    HELP_DESC: 'For returns, refunds, or any other queries about your order — we\'re here to help.',
    GET_HELP_BTN: 'Get Help With This Order',
    CONTACT_OWNER: 'If you have any issues with your order, contact us at',
    CONTACT_REPLY: 'If you have any issues with your order, please reply to this email.',
    THANK_YOU_AGAIN: 'Thank you for shopping with',
    LOOK_FORWARD: 'We look forward to serving you again.',
    US: 'us',
    TXT_DELIVERED: 'Your order',
    TXT_DELIVERED2: 'has been delivered!',
    TXT_HOPE_LOVE: 'We hope you love your purchase.',
    TXT_LEAVE_REVIEW: 'Leave a review:',
    TXT_LOVE_FEEDBACK: 'We\'d love to hear your feedback — please leave a review!',
    TXT_TOTAL_PAID: 'Total Paid',
    TXT_FOR_ISSUES: 'For any issues, contact:',
  });
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
    ? `${t.CONTACT_OWNER} <a href="mailto:${ownerEmail}" style="color:#27ae60;">${ownerEmail}</a>.`
    : t.CONTACT_REPLY;
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #27ae60; color: #ffffff; padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">${brandName || t.YOUR_STORE}</h1>
        </div>
        <div style="padding: 32px;">
          <div style="text-align: center; margin-bottom: 28px;">
            <div style="font-size: 52px; margin-bottom: 12px;">📦</div>
            <h2 style="margin: 0 0 6px; font-size: 24px; color: #0f172a;">${t.DELIVERED_TITLE}</h2>
            <p style="margin: 0; color: #64748b; font-size: 14px;">${t.ORDER_LBL} #${order.order_number || ''}</p>
            ${order.created_at ? `<p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">${t.PLACED_ON} ${formatOrderDate(order.created_at, timezone)}</p>` : ''}
          </div>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">${t.HI} ${order.customer_name || t.CUSTOMER}, ${t.LOVE_PURCHASE}</p>
          ${items.length > 0 ? `
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background: #f8f9fa;">
                <th style="padding: 10px 16px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">${t.PRODUCT}</th>
                <th style="padding: 10px 16px; text-align: center; font-size: 12px; color: #64748b; text-transform: uppercase;">${t.QTY}</th>
                <th style="padding: 10px 16px; text-align: right; font-size: 12px; color: #64748b; text-transform: uppercase;">${t.AMOUNT}</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div style="text-align: right; padding: 12px 16px; background: #f0fdf4; border-radius: 8px; font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 24px;">
            ${t.TOTAL_PAID}: ${formatCurrencyHtml(order.total, currency)}
          </div>` : ''}
          ${options.reviewUrl ? `
          <div style="margin: 24px 0; padding: 24px; background: #f0fdf4; border-radius: 10px; text-align: center;">
            <p style="margin: 0 0 4px; font-size: 20px;">⭐</p>
            <p style="margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #166534;">${t.HOW_EXPERIENCE}</p>
            <p style="margin: 0 0 16px; font-size: 14px; color: #555; line-height: 1.6;">${t.FEEDBACK_NOTE}</p>
            ${(options.reviewItems && options.reviewItems.length > 0) ? `
            <div style="margin: 0 0 16px; display: inline-block;">
              ${options.reviewItems.map(item => `
              <div style="display: inline-block; margin: 0 8px 8px; text-align: center; vertical-align: top; max-width: 120px;">
                ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 64px; height: 64px; object-fit: cover; border-radius: 8px; border: 1px solid #e2e8f0;" />` : `<div style="width: 64px; height: 64px; background: #e2e8f0; border-radius: 8px; display: inline-block;"></div>`}
                <p style="margin: 6px 0 0; font-size: 12px; color: #475569; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.name}</p>
              </div>
              `).join('')}
            </div>
            ` : ''}
            <div>
              <a href="${options.reviewUrl}" style="display:inline-block;background:#166534;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">${t.WRITE_REVIEW}</a>
            </div>
          </div>
          ` : `
          <div style="margin: 24px 0; padding: 20px; background: #f0fdf4; border-radius: 10px; text-align: center;">
            <p style="margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #166534;">${t.ENJOYING}</p>
            <p style="margin: 0; font-size: 14px; color: #555; line-height: 1.6;">${t.LOVE_HEAR}</p>
          </div>
          `}
          ${options.helpUrl ? `
          <div style="margin-top: 20px; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center;">
            <p style="margin: 0 0 6px; font-size: 14px; font-weight: 600; color: #334155;">${t.NEED_HELP}</p>
            <p style="margin: 0 0 12px; font-size: 13px; color: #64748b; line-height: 1.5;">${t.HELP_DESC}</p>
            <a href="${options.helpUrl}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px;">${t.GET_HELP_BTN}</a>
          </div>
          ` : ''}
          <p style="margin-top: 20px; color: #64748b; font-size: 14px; line-height: 1.6;">${contactLine}</p>
        </div>
        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">${t.THANK_YOU_AGAIN} ${brandName || t.US}! ${t.LOOK_FORWARD}</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `${t.TXT_DELIVERED} #${order.order_number} ${t.TXT_DELIVERED2}\n\n${t.TXT_HOPE_LOVE}${options.reviewUrl ? '\n\n' + t.TXT_LEAVE_REVIEW + ' ' + options.reviewUrl : ' ' + t.TXT_LOVE_FEEDBACK}\n\n${t.TXT_TOTAL_PAID}: ${formatCurrency(order.total, currency)}\n\n${ownerEmail ? t.TXT_FOR_ISSUES + ' ' + ownerEmail : ''}`;
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
          <p style="margin: 0;">This is an automated notification from ${brandName || 'Flomerce'}.</p>
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
          <p style="margin: 0;">This is an automated notification from ${brandName || 'Flomerce'}.</p>
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
          <div style="padding: 12px 16px; background: #f0fdf4; border-radius: 8px; margin-bottom: 20px;">
            <div style="font-size: 12px; color: #059669; text-transform: uppercase; font-weight: 600;">Order Summary</div>
            <div style="font-size: 13px; color: #555; margin-top: 6px;">Subtotal: ${formatCurrencyHtml(order.subtotal || order.total, currency)}</div>
            ${Number(order.discount || 0) > 0 ? `<div style="font-size: 13px; color: #16a34a; margin-top: 2px;">Coupon${order.coupon_code ? ` (${order.coupon_code})` : ''}: -${formatCurrencyHtml(order.discount, currency)}</div>` : ''}
            <div style="font-size: 13px; color: #555; margin-top: 2px;">Shipping: ${Number(order.shipping_cost || 0) > 0 ? formatCurrencyHtml(order.shipping_cost, currency) : 'Free'}</div>
            <div style="font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 6px; border-top: 1px solid #d1fae5; padding-top: 6px;">Total: ${formatCurrencyHtml(order.total, currency)}</div>
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
          <p style="margin: 0;">This is an automated notification from ${brandName || 'Flomerce'}.</p>
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
          <p style="margin: 0;">This is an automated notification from ${brandName || 'Flomerce'}.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `New Order - Review Required\n\nOrder #${order.order_number || order.orderNumber}\nTotal: ${formatCurrency(order.total, currency)}\nCustomer: ${order.customer_name || ''}\nPhone: ${order.customer_phone || ''}\nPayment: ${order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment'}\n\nPlease review and confirm this order from your admin panel.`;

  return { html, text };
}

export async function buildOrderPackedEmail(order, brandName, ownerEmail, currency = 'INR', options = {}, timezone = '', env = null, siteId = null, targetLang = null) {
  const t = await translateLabels(env, siteId, targetLang, {
    YOUR_STORE: 'Your Store',
    PACKED_TITLE: 'Your Order Has Been Packed!',
    ORDER_LBL: 'Order',
    PLACED_ON: 'Placed on',
    HI: 'Hi',
    CUSTOMER: 'Customer',
    PACKED_BODY: 'Great news! Your order has been packed and is getting ready to be shipped. We\'ll notify you once it\'s on the way.',
    ORDER_TOTAL: 'Order Total',
    PAYMENT_METHOD: 'Payment Method',
    COD: 'Cash on Delivery',
    ONLINE_PAYMENT: 'Online Payment',
    TRACK_ORDER: 'Track Your Order',
    QUERIES_OWNER: 'For any queries, contact us at',
    QUERIES_REPLY: 'For any queries, please reply to this email.',
    THANK_YOU_SHOPPING: 'Thank you for shopping with',
    US: 'us',
    TXT_TOTAL: 'Total',
    TXT_CONTACT: 'Contact:',
    TXT_PACKED_BODY: 'Your order has been packed and is getting ready to be shipped.',
  });
  const isCod = order.payment_method === 'cod';
  const paymentLabel = isCod ? t.COD : t.ONLINE_PAYMENT;
  const contactLine = ownerEmail
    ? `${t.QUERIES_OWNER} <a href="mailto:${ownerEmail}" style="color:#7c3aed;">${ownerEmail}</a>.`
    : t.QUERIES_REPLY;
  const trackingHtml = options.trackingUrl ? `
    <div style="margin: 24px 0; text-align: center;">
      <a href="${options.trackingUrl}" style="display: inline-block; padding: 14px 32px; background: #7c3aed; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px;">${t.TRACK_ORDER}</a>
    </div>
  ` : '';
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #7c3aed; color: #ffffff; padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">${brandName || t.YOUR_STORE}</h1>
        </div>
        <div style="padding: 32px;">
          <div style="text-align: center; margin-bottom: 28px;">
            <div style="font-size: 52px; margin-bottom: 12px;">📦</div>
            <h2 style="margin: 0 0 6px; font-size: 24px; color: #0f172a;">${t.PACKED_TITLE}</h2>
            <p style="margin: 0; color: #64748b; font-size: 14px;">${t.ORDER_LBL} #${order.order_number || ''}</p>
            ${order.created_at ? `<p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">${t.PLACED_ON} ${formatOrderDate(order.created_at, timezone)}</p>` : ''}
          </div>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">${t.HI} ${order.customer_name || t.CUSTOMER},</p>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">${t.PACKED_BODY}</p>
          <div style="padding: 16px; background: #f8f9fa; border-radius: 8px; font-size: 14px; color: #555; margin: 20px 0;">
            <strong>${t.ORDER_TOTAL}:</strong> ${formatCurrencyHtml(order.total, currency)}<br>
            <strong>${t.PAYMENT_METHOD}:</strong> ${paymentLabel}
          </div>
          ${trackingHtml}
          <p style="margin-top: 20px; color: #64748b; font-size: 14px; line-height: 1.6;">${contactLine}</p>
        </div>
        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">${t.THANK_YOU_SHOPPING} ${brandName || t.US}!</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `${t.PACKED_TITLE}\n\n${t.ORDER_LBL} #${order.order_number}\n${t.TXT_PACKED_BODY}\n${t.TXT_TOTAL}: ${formatCurrency(order.total, currency)}\n\n${ownerEmail ? t.TXT_CONTACT + ' ' + ownerEmail : ''}`;
  return { html, text };
}

export async function buildOrderShippedEmail(order, brandName, ownerEmail, currency = 'INR', options = {}, timezone = '', env = null, siteId = null, targetLang = null) {
  const t = await translateLabels(env, siteId, targetLang, {
    YOUR_STORE: 'Your Store',
    SHIPPED_TITLE: 'Your Order Is On The Way!',
    ORDER_LBL: 'Order',
    PLACED_ON: 'Placed on',
    HI: 'Hi',
    CUSTOMER: 'Customer',
    SHIPPED_BODY: 'Your order has been shipped and is on its way to you!',
    SHIPPING_DETAILS: 'Shipping Details',
    CARRIER: 'Carrier',
    TRACKING_NUMBER: 'Tracking Number',
    ORDER_TOTAL: 'Order Total',
    PAYMENT_METHOD: 'Payment Method',
    COD: 'Cash on Delivery',
    ONLINE_PAYMENT: 'Online Payment',
    TRACK_ORDER: 'Track Your Order',
    QUERIES_OWNER: 'For any queries, contact us at',
    QUERIES_REPLY: 'For any queries, please reply to this email.',
    THANK_YOU_SHOPPING: 'Thank you for shopping with',
    US: 'us',
    TXT_SHIPPED_BODY: 'Your order has been shipped.',
    TXT_TOTAL: 'Total',
    TXT_CONTACT: 'Contact:',
    TXT_TRACKING: 'Tracking:',
  });
  const isCod = order.payment_method === 'cod';
  const paymentLabel = isCod ? t.COD : t.ONLINE_PAYMENT;
  const contactLine = ownerEmail
    ? `${t.QUERIES_OWNER} <a href="mailto:${ownerEmail}" style="color:#0284c7;">${ownerEmail}</a>.`
    : t.QUERIES_REPLY;
  const trackingDetails = (options.trackingNumber || options.carrier) ? `
    <div style="margin: 20px 0; padding: 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px;">
      <h3 style="margin: 0 0 8px; font-size: 14px; color: #1e40af; text-transform: uppercase; letter-spacing: 0.5px;">${t.SHIPPING_DETAILS}</h3>
      ${options.carrier ? `<p style="margin: 0 0 4px; font-size: 14px; color: #333;"><strong>${t.CARRIER}:</strong> ${options.carrier}</p>` : ''}
      ${options.trackingNumber ? `<p style="margin: 0; font-size: 14px; color: #333;"><strong>${t.TRACKING_NUMBER}:</strong> ${options.trackingNumber}</p>` : ''}
    </div>
  ` : '';
  const trackingHtml = options.trackingUrl ? `
    <div style="margin: 24px 0; text-align: center;">
      <a href="${options.trackingUrl}" style="display: inline-block; padding: 14px 32px; background: #0284c7; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px;">${t.TRACK_ORDER}</a>
    </div>
  ` : '';
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #0284c7; color: #ffffff; padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">${brandName || t.YOUR_STORE}</h1>
        </div>
        <div style="padding: 32px;">
          <div style="text-align: center; margin-bottom: 28px;">
            <div style="font-size: 52px; margin-bottom: 12px;">🚚</div>
            <h2 style="margin: 0 0 6px; font-size: 24px; color: #0f172a;">${t.SHIPPED_TITLE}</h2>
            <p style="margin: 0; color: #64748b; font-size: 14px;">${t.ORDER_LBL} #${order.order_number || ''}</p>
            ${order.created_at ? `<p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">${t.PLACED_ON} ${formatOrderDate(order.created_at, timezone)}</p>` : ''}
          </div>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">${t.HI} ${order.customer_name || t.CUSTOMER},</p>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">${t.SHIPPED_BODY}</p>
          ${trackingDetails}
          <div style="padding: 16px; background: #f8f9fa; border-radius: 8px; font-size: 14px; color: #555; margin: 20px 0;">
            <strong>${t.ORDER_TOTAL}:</strong> ${formatCurrencyHtml(order.total, currency)}<br>
            <strong>${t.PAYMENT_METHOD}:</strong> ${paymentLabel}
          </div>
          ${trackingHtml}
          <p style="margin-top: 20px; color: #64748b; font-size: 14px; line-height: 1.6;">${contactLine}</p>
        </div>
        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">${t.THANK_YOU_SHOPPING} ${brandName || t.US}!</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `${t.SHIPPED_TITLE}\n\n${t.ORDER_LBL} #${order.order_number}\n${t.TXT_SHIPPED_BODY}${options.carrier ? '\n' + t.CARRIER + ': ' + options.carrier : ''}${options.trackingNumber ? '\n' + t.TXT_TRACKING + ' ' + options.trackingNumber : ''}\n${t.TXT_TOTAL}: ${formatCurrency(order.total, currency)}\n\n${ownerEmail ? t.TXT_CONTACT + ' ' + ownerEmail : ''}`;
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

export async function buildCancellationStatusEmail(request, brandName, status, adminNote, env = null, siteId = null, targetLang = null) {
  const t = await translateLabels(env, siteId, targetLang, {
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    APPROVED_MSG: 'Your order has been cancelled. If you paid online, your refund will be processed within 5-7 business days.',
    REJECTED_MSG: 'Your cancellation request has been reviewed and was not approved. If you have questions, please contact us.',
    UPDATE_TITLE: 'Cancellation Request Update',
    UPDATE_BODY: 'Your cancellation request for order',
    UPDATE_BODY2: 'has been updated.',
    NOTE_FROM_STORE: 'Note from store:',
    TXT_ORDER: 'Order',
    TXT_STATUS: 'Status',
    TXT_NOTE: 'Note',
  });
  const statusLabels = { approved: t.APPROVED, rejected: t.REJECTED };
  const statusColors = { approved: '#22c55e', rejected: '#ef4444' };
  const label = statusLabels[status] || status;
  const color = statusColors[status] || '#64748b';
  const approvedMsg = status === 'approved'
    ? `<p style="color:#333;font-size:14px;line-height:1.6;margin-top:16px;">${t.APPROVED_MSG}</p>`
    : `<p style="color:#333;font-size:14px;line-height:1.6;margin-top:16px;">${t.REJECTED_MSG}</p>`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f5f5f5;">
    <div style="max-width:600px;margin:0 auto;background:#fff;">
      <div style="background:#0f172a;color:#fff;padding:32px;text-align:center;">
        <h1 style="margin:0;font-size:24px;font-weight:700;">${brandName}</h1>
      </div>
      <div style="padding:32px;">
        <h2 style="margin:0 0 16px;font-size:20px;color:#0f172a;">${t.UPDATE_TITLE}</h2>
        <p style="color:#64748b;font-size:14px;margin-bottom:20px;">${t.UPDATE_BODY} <strong>#${request.order_number}</strong> ${t.UPDATE_BODY2}</p>
        <div style="text-align:center;margin:24px 0;">
          <span style="display:inline-block;background:${color};color:#fff;padding:8px 24px;border-radius:20px;font-weight:600;font-size:16px;">${label}</span>
        </div>
        ${approvedMsg}
        ${adminNote ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-top:16px;"><p style="margin:0 0 4px;font-size:12px;color:#64748b;font-weight:600;">${t.NOTE_FROM_STORE}</p><p style="margin:0;font-size:14px;color:#334155;">${adminNote}</p></div>` : ''}
      </div>
    </div>
  </body></html>`;
  const text = `${t.UPDATE_TITLE}\n${t.TXT_ORDER}: #${request.order_number}\n${t.TXT_STATUS}: ${label}${adminNote ? '\n' + t.TXT_NOTE + ': ' + adminNote : ''}`;
  return { html, text };
}

export async function buildAbandonedCartEmail(customerName, brandName, items, cartTotal, storeUrl, currency = 'INR', env = null, siteId = null, targetLang = null) {
  const t = await translateLabels(env, siteId, targetLang, {
    YOUR_STORE: 'Your Store',
    LEFT_BEHIND: 'You left something behind!',
    HI: 'Hi',
    THERE: 'there',
    CART_WAITING: 'your cart at',
    IS_WAITING: 'is waiting for you',
    PRODUCT_GENERIC: 'Product',
    PRODUCT: 'Product',
    QTY: 'Qty',
    TOTAL: 'Total',
    AND_MORE: '...and',
    MORE_ITEMS: 'more item(s)',
    CART_TOTAL: 'Cart Total',
    COMPLETE_PURCHASE: 'Complete Your Purchase',
    IGNORE_NOTICE: 'If you\'ve already completed your purchase, please ignore this email.',
    RIGHTS_RESERVED: 'All rights reserved.',
    TXT_LEFT_ITEMS: 'you left items in your cart at',
    TXT_ITEMS: 'Items',
    TXT_COMPLETE_LINK: 'Complete your purchase:',
  });
  const fmtH = (amt) => formatCurrencyHtml(amt, currency);

  const itemsHtml = items.slice(0, 5).map(item => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; font-size: 14px;">${item.name || t.PRODUCT_GENERIC}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; text-align: center; font-size: 14px;">${item.quantity || 1}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; text-align: right; font-size: 14px; font-weight: 600;">${fmtH(Number(item.price || 0) * Number(item.quantity || 1))}</td>
    </tr>
  `).join('');

  const moreItems = items.length > 5 ? `<p style="color:#64748b;font-size:13px;text-align:center;">${t.AND_MORE} ${items.length - 5} ${t.MORE_ITEMS}</p>` : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #0f172a; color: #ffffff; padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">${brandName || t.YOUR_STORE}</h1>
        </div>
        <div style="padding: 32px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="font-size: 48px; margin-bottom: 12px;">🛒</div>
            <h2 style="margin: 0 0 8px; font-size: 22px; color: #0f172a;">${t.LEFT_BEHIND}</h2>
            <p style="margin: 0; color: #64748b; font-size: 14px;">${t.HI} ${customerName || t.THERE}, ${t.CART_WAITING} ${brandName} ${t.IS_WAITING}</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
            <thead>
              <tr style="background: #f8f9fa;">
                <th style="padding: 12px 16px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">${t.PRODUCT}</th>
                <th style="padding: 12px 16px; text-align: center; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">${t.QTY}</th>
                <th style="padding: 12px 16px; text-align: right; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">${t.TOTAL}</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          ${moreItems}

          <div style="text-align: right; padding: 16px; background: #f8f9fa; border-radius: 8px; margin: 16px 0;">
            <span style="font-size: 16px; font-weight: 700; color: #0f172a;">${t.CART_TOTAL}: ${fmtH(cartTotal)}</span>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${storeUrl}" style="display: inline-block; background: #0f172a; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">${t.COMPLETE_PURCHASE}</a>
          </div>

          <p style="text-align: center; color: #94a3b8; font-size: 13px; margin-top: 24px;">
            ${t.IGNORE_NOTICE}
          </p>
        </div>
        <div style="background: #f8f9fa; padding: 24px; text-align: center;">
          <p style="margin: 0; color: #94a3b8; font-size: 12px;">&copy; ${brandName || t.YOUR_STORE}. ${t.RIGHTS_RESERVED}</p>
        </div>
      </div>
    </body>
    </html>`;

  const itemsList = items.slice(0, 5).map(item => `${item.name} x${item.quantity}`).join(', ');
  const text = `${t.HI} ${customerName || t.THERE}, ${t.TXT_LEFT_ITEMS} ${brandName}! ${t.TXT_ITEMS}: ${itemsList}. ${t.CART_TOTAL}: ${formatCurrency(cartTotal, currency)}. ${t.TXT_COMPLETE_LINK} ${storeUrl}`;
  return { html, text };
}
