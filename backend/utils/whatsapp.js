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

function cleanPhone(phone) {
  if (!phone) return null;
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('+')) cleaned = cleaned.slice(1);
  if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
    cleaned = '91' + cleaned;
  }
  return cleaned;
}

function parseItems(items) {
  if (!items) return [];
  if (typeof items === 'string') {
    try { return JSON.parse(items); } catch { return []; }
  }
  return Array.isArray(items) ? items : [];
}

export async function sendWhatsAppMessage(settings, to, templateName, components) {
  const provider = settings.whatsappProvider || 'meta';
  if (provider === 'interakt') {
    return sendViaInterakt(settings, to, templateName, components);
  }
  return sendViaMeta(settings, to, templateName, components);
}

async function sendViaMeta(settings, to, templateName, components) {
  const { whatsappAccessToken, whatsappPhoneNumberId } = settings;
  if (!whatsappAccessToken || !whatsappPhoneNumberId) {
    console.log('WhatsApp Meta: Missing credentials, skipping');
    return null;
  }

  const phone = cleanPhone(to);
  if (!phone) {
    console.log('WhatsApp Meta: Invalid phone number');
    return null;
  }

  const payload = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: settings.whatsappLanguage || 'en' },
    },
  };

  if (components && components.length > 0) {
    payload.template.components = components;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${whatsappPhoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whatsappAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('WhatsApp Meta API error:', JSON.stringify(body), 'Status:', response.status);
      return { success: false, error: body.error?.message || 'API error' };
    }

    console.log('WhatsApp message sent via Meta to:', phone, 'Template:', templateName, 'MessageId:', body.messages?.[0]?.id || '');
    return { success: true, messageId: body.messages?.[0]?.id };
  } catch (error) {
    console.error('WhatsApp Meta send error:', error.message || error);
    return { success: false, error: error.message };
  }
}

async function sendViaInterakt(settings, to, templateName, components) {
  const { whatsappApiKey } = settings;
  if (!whatsappApiKey) {
    console.log('WhatsApp Interakt: Missing API key, skipping');
    return null;
  }

  const phone = cleanPhone(to);
  if (!phone) {
    console.log('WhatsApp Interakt: Invalid phone number');
    return null;
  }

  const countryCode = phone.length > 10 ? phone.slice(0, phone.length - 10) : '91';
  const phoneNumber = phone.length > 10 ? phone.slice(-10) : phone;

  const bodyParams = [];
  if (components) {
    const bodyComp = components.find(c => c.type === 'body');
    if (bodyComp?.parameters) {
      bodyComp.parameters.forEach(p => {
        bodyParams.push(p.text || '');
      });
    }
  }

  const payload = {
    countryCode: countryCode,
    phoneNumber: phoneNumber,
    type: 'Template',
    template: {
      name: templateName,
      languageCode: settings.whatsappLanguage || 'en',
      bodyValues: bodyParams,
    },
  };

  try {
    const response = await fetch('https://api.interakt.ai/v1/public/message/', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${whatsappApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('WhatsApp Interakt API error:', JSON.stringify(body), 'Status:', response.status);
      return { success: false, error: body.message || 'API error' };
    }

    console.log('WhatsApp message sent via Interakt to:', phone, 'Template:', templateName);
    return { success: true, messageId: body.id || '' };
  } catch (error) {
    console.error('WhatsApp Interakt send error:', error.message || error);
    return { success: false, error: error.message };
  }
}

export async function sendWhatsAppText(settings, to, text) {
  const provider = settings.whatsappProvider || 'meta';
  if (provider !== 'meta') {
    console.log('WhatsApp text messages only supported via Meta Cloud API');
    return null;
  }

  const { whatsappAccessToken, whatsappPhoneNumberId } = settings;
  if (!whatsappAccessToken || !whatsappPhoneNumberId) return null;

  const phone = cleanPhone(to);
  if (!phone) return null;

  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${whatsappPhoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whatsappAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone,
          type: 'text',
          text: { body: text },
        }),
      }
    );

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('WhatsApp text error:', JSON.stringify(body));
      return { success: false, error: body.error?.message || 'API error' };
    }
    return { success: true, messageId: body.messages?.[0]?.id };
  } catch (error) {
    console.error('WhatsApp text send error:', error.message);
    return { success: false, error: error.message };
  }
}

export function buildOrderConfirmationWA(order, brandName, currency = 'INR') {
  const items = parseItems(order.items);
  const itemsList = items.slice(0, 5).map(item =>
    `${item.name} x${item.quantity} - ${formatCurrency(Number(item.price) * Number(item.quantity), currency)}`
  ).join('\n');

  const total = formatCurrency(order.total, currency);
  const paymentMethod = (order.payment_method === 'cod' || order.paymentMethod === 'cod') ? 'Cash on Delivery' : 'Online Payment';

  const text = `🛍️ *Order Confirmed!*\n\nHi ${order.customer_name || 'there'},\n\nYour order *#${order.order_number || order.orderNumber}* from *${brandName}* has been confirmed!\n\n📦 *Items:*\n${itemsList}\n${items.length > 5 ? `...and ${items.length - 5} more item(s)\n` : ''}\n💰 *Total:* ${total}\n💳 *Payment:* ${paymentMethod}\n\nWe'll update you once your order is packed and on its way. Thank you for shopping with us!`;

  return {
    text,
    templateName: 'order_confirmation',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: order.customer_name || 'Customer' },
          { type: 'text', text: order.order_number || order.orderNumber || '' },
          { type: 'text', text: brandName },
          { type: 'text', text: total },
          { type: 'text', text: paymentMethod },
        ],
      },
    ],
  };
}

export function buildOrderShippedWA(order, brandName, trackingUrl, currency = 'INR') {
  const trackingNumber = order.tracking_number || order.trackingNumber || '';
  const carrier = order.carrier || '';

  const text = `📦 *Order Shipped!*\n\nHi ${order.customer_name || 'there'},\n\nGreat news! Your order *#${order.order_number || order.orderNumber}* from *${brandName}* has been shipped!\n\n${carrier ? `🚚 *Courier:* ${carrier}\n` : ''}${trackingNumber ? `📋 *Tracking:* ${trackingNumber}\n` : ''}\n${trackingUrl ? `🔗 *Track your order:* ${trackingUrl}\n` : ''}\nThank you for shopping with us!`;

  return {
    text,
    templateName: 'order_shipped',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: order.customer_name || 'Customer' },
          { type: 'text', text: order.order_number || order.orderNumber || '' },
          { type: 'text', text: brandName },
          { type: 'text', text: carrier || 'Courier' },
          { type: 'text', text: trackingNumber || 'N/A' },
        ],
      },
    ],
  };
}

export function buildOrderDeliveredWA(order, brandName, reviewUrl, currency = 'INR') {
  const total = formatCurrency(order.total, currency);

  const text = `✅ *Order Delivered!*\n\nHi ${order.customer_name || 'there'},\n\nYour order *#${order.order_number || order.orderNumber}* from *${brandName}* has been delivered!\n\n💰 *Total Paid:* ${total}\n\nWe hope you love your purchase! 🎉\n${reviewUrl ? `\n⭐ *Share your feedback:* ${reviewUrl}\n` : ''}\nThank you for shopping with us!`;

  return {
    text,
    templateName: 'order_delivered',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: order.customer_name || 'Customer' },
          { type: 'text', text: order.order_number || order.orderNumber || '' },
          { type: 'text', text: brandName },
          { type: 'text', text: total },
        ],
      },
    ],
  };
}

export function buildOrderCancelledWA(order, brandName, reason, currency = 'INR') {
  const total = formatCurrency(order.total, currency);

  const text = `❌ *Order Cancelled*\n\nHi ${order.customer_name || 'there'},\n\nYour order *#${order.order_number || order.orderNumber}* from *${brandName}* has been cancelled.\n\n📝 *Reason:* ${reason || 'No reason provided'}\n💰 *Order Total:* ${total}\n\nIf you paid online, your refund will be processed within 5-7 business days.\n\nFor any queries, please contact us. Thank you!`;

  return {
    text,
    templateName: 'order_cancelled',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: order.customer_name || 'Customer' },
          { type: 'text', text: order.order_number || order.orderNumber || '' },
          { type: 'text', text: brandName },
          { type: 'text', text: reason || 'No reason provided' },
          { type: 'text', text: total },
        ],
      },
    ],
  };
}

export function buildOrderPackedWA(order, brandName) {
  const text = `📦 *Order Packed!*\n\nHi ${order.customer_name || 'there'},\n\nYour order *#${order.order_number || order.orderNumber}* from *${brandName}* has been packed and is ready for dispatch!\n\nWe'll update you once it's shipped. Thank you for your patience!`;

  return {
    text,
    templateName: 'order_packed',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: order.customer_name || 'Customer' },
          { type: 'text', text: order.order_number || order.orderNumber || '' },
          { type: 'text', text: brandName },
        ],
      },
    ],
  };
}

export async function sendOrderWhatsApp(settings, phone, messageData) {
  if (!settings.whatsappNotificationsEnabled) return null;

  const hasCredentials = settings.whatsappProvider === 'interakt'
    ? !!settings.whatsappApiKey
    : (!!settings.whatsappAccessToken && !!settings.whatsappPhoneNumberId);

  if (!hasCredentials) return null;
  if (!phone) return null;

  const { text, templateName, components } = messageData;

  if (settings.whatsappUseTemplates !== false) {
    return sendWhatsAppMessage(settings, phone, templateName, components);
  }

  return sendWhatsAppText(settings, phone, text);
}

export function isWhatsAppConfigured(settings) {
  if (!settings || !settings.whatsappNotificationsEnabled) return false;
  const provider = settings.whatsappProvider || 'meta';
  if (provider === 'interakt') return !!settings.whatsappApiKey;
  return !!settings.whatsappAccessToken && !!settings.whatsappPhoneNumberId;
}
