import { translateLabels } from './email-i18n.js';

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
  if (cleaned.length < 7 || cleaned.length > 15) return null;
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

export async function buildOrderConfirmationWA(order, brandName, currency = 'INR', env = null, siteId = null, targetLang = null) {
  const t = await translateLabels(env, siteId, targetLang, {
    TITLE: 'Order Confirmed!',
    HI: 'Hi',
    THERE: 'there',
    YOUR_ORDER_FROM: 'Your order',
    FROM: 'from',
    HAS_BEEN_CONFIRMED: 'has been confirmed!',
    ITEMS: 'Items:',
    AND_MORE: '...and',
    MORE_ITEMS: 'more item(s)',
    TOTAL: 'Total:',
    PAYMENT: 'Payment:',
    COD: 'Cash on Delivery',
    ONLINE: 'Online Payment',
    CLOSING: 'We\'ll update you once your order is packed and on its way. Thank you for shopping with us!',
    CUSTOMER: 'Customer',
  });
  const items = parseItems(order.items);
  const itemsList = items.slice(0, 5).map(item =>
    `${item.name} x${item.quantity} - ${formatCurrency(Number(item.price) * Number(item.quantity), currency)}`
  ).join('\n');

  const total = formatCurrency(order.total, currency);
  const isCod = order.payment_method === 'cod' || order.paymentMethod === 'cod';
  const paymentMethod = isCod ? t.COD : t.ONLINE;

  const text = `🛍️ *${t.TITLE}*\n\n${t.HI} ${order.customer_name || t.THERE},\n\n${t.YOUR_ORDER_FROM} *#${order.order_number || order.orderNumber}* ${t.FROM} *${brandName}* ${t.HAS_BEEN_CONFIRMED}\n\n📦 *${t.ITEMS}*\n${itemsList}\n${items.length > 5 ? `${t.AND_MORE} ${items.length - 5} ${t.MORE_ITEMS}\n` : ''}\n💰 *${t.TOTAL}* ${total}\n💳 *${t.PAYMENT}* ${paymentMethod}\n\n${t.CLOSING}`;

  return {
    text,
    templateName: 'order_confirmation',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: order.customer_name || t.CUSTOMER },
          { type: 'text', text: order.order_number || order.orderNumber || '' },
          { type: 'text', text: brandName },
          { type: 'text', text: total },
          { type: 'text', text: paymentMethod },
        ],
      },
    ],
  };
}

export async function buildOrderShippedWA(order, brandName, trackingUrl, currency = 'INR', env = null, siteId = null, targetLang = null) {
  const t = await translateLabels(env, siteId, targetLang, {
    TITLE: 'Order Shipped!',
    HI: 'Hi',
    THERE: 'there',
    GREAT_NEWS: 'Great news! Your order',
    FROM: 'from',
    HAS_BEEN_SHIPPED: 'has been shipped!',
    COURIER: 'Courier:',
    TRACKING: 'Tracking:',
    TRACK_YOUR_ORDER: 'Track your order:',
    THANK_YOU: 'Thank you for shopping with us!',
    CUSTOMER: 'Customer',
    COURIER_FALLBACK: 'Courier',
  });
  const trackingNumber = order.tracking_number || order.trackingNumber || '';
  const carrier = order.carrier || '';

  const text = `📦 *${t.TITLE}*\n\n${t.HI} ${order.customer_name || t.THERE},\n\n${t.GREAT_NEWS} *#${order.order_number || order.orderNumber}* ${t.FROM} *${brandName}* ${t.HAS_BEEN_SHIPPED}\n\n${carrier ? `🚚 *${t.COURIER}* ${carrier}\n` : ''}${trackingNumber ? `📋 *${t.TRACKING}* ${trackingNumber}\n` : ''}\n${trackingUrl ? `🔗 *${t.TRACK_YOUR_ORDER}* ${trackingUrl}\n` : ''}\n${t.THANK_YOU}`;

  return {
    text,
    templateName: 'order_shipped',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: order.customer_name || t.CUSTOMER },
          { type: 'text', text: order.order_number || order.orderNumber || '' },
          { type: 'text', text: brandName },
          { type: 'text', text: carrier || t.COURIER_FALLBACK },
          { type: 'text', text: trackingNumber || 'N/A' },
        ],
      },
    ],
  };
}

export async function buildOrderDeliveredWA(order, brandName, reviewUrl, currency = 'INR', env = null, siteId = null, targetLang = null) {
  const t = await translateLabels(env, siteId, targetLang, {
    TITLE: 'Order Delivered!',
    HI: 'Hi',
    THERE: 'there',
    YOUR_ORDER: 'Your order',
    FROM: 'from',
    HAS_BEEN_DELIVERED: 'has been delivered!',
    TOTAL_PAID: 'Total Paid:',
    HOPE_LOVE: 'We hope you love your purchase! 🎉',
    SHARE_FEEDBACK: 'Share your feedback:',
    THANK_YOU: 'Thank you for shopping with us!',
    CUSTOMER: 'Customer',
  });
  const total = formatCurrency(order.total, currency);

  const text = `✅ *${t.TITLE}*\n\n${t.HI} ${order.customer_name || t.THERE},\n\n${t.YOUR_ORDER} *#${order.order_number || order.orderNumber}* ${t.FROM} *${brandName}* ${t.HAS_BEEN_DELIVERED}\n\n💰 *${t.TOTAL_PAID}* ${total}\n\n${t.HOPE_LOVE}\n${reviewUrl ? `\n⭐ *${t.SHARE_FEEDBACK}* ${reviewUrl}\n` : ''}\n${t.THANK_YOU}`;

  return {
    text,
    templateName: 'order_delivered',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: order.customer_name || t.CUSTOMER },
          { type: 'text', text: order.order_number || order.orderNumber || '' },
          { type: 'text', text: brandName },
          { type: 'text', text: total },
        ],
      },
    ],
  };
}

export async function buildOrderCancelledWA(order, brandName, reason, currency = 'INR', env = null, siteId = null, targetLang = null) {
  const t = await translateLabels(env, siteId, targetLang, {
    TITLE: 'Order Cancelled',
    HI: 'Hi',
    THERE: 'there',
    YOUR_ORDER: 'Your order',
    FROM: 'from',
    HAS_BEEN_CANCELLED: 'has been cancelled.',
    REASON: 'Reason:',
    ORDER_TOTAL: 'Order Total:',
    REFUND_NOTE: 'If you paid online, your refund will be processed within 5-7 business days.',
    CONTACT_US: 'For any queries, please contact us. Thank you!',
    NO_REASON: 'No reason provided',
    CUSTOMER: 'Customer',
  });
  const total = formatCurrency(order.total, currency);

  const text = `❌ *${t.TITLE}*\n\n${t.HI} ${order.customer_name || t.THERE},\n\n${t.YOUR_ORDER} *#${order.order_number || order.orderNumber}* ${t.FROM} *${brandName}* ${t.HAS_BEEN_CANCELLED}\n\n📝 *${t.REASON}* ${reason || t.NO_REASON}\n💰 *${t.ORDER_TOTAL}* ${total}\n\n${t.REFUND_NOTE}\n\n${t.CONTACT_US}`;

  return {
    text,
    templateName: 'order_cancelled',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: order.customer_name || t.CUSTOMER },
          { type: 'text', text: order.order_number || order.orderNumber || '' },
          { type: 'text', text: brandName },
          { type: 'text', text: reason || t.NO_REASON },
          { type: 'text', text: total },
        ],
      },
    ],
  };
}

export async function buildOrderPackedWA(order, brandName, env = null, siteId = null, targetLang = null) {
  const t = await translateLabels(env, siteId, targetLang, {
    TITLE: 'Order Packed!',
    HI: 'Hi',
    THERE: 'there',
    YOUR_ORDER: 'Your order',
    FROM: 'from',
    PACKED_READY: 'has been packed and is ready for dispatch!',
    CLOSING: 'We\'ll update you once it\'s shipped. Thank you for your patience!',
    CUSTOMER: 'Customer',
  });
  const text = `📦 *${t.TITLE}*\n\n${t.HI} ${order.customer_name || t.THERE},\n\n${t.YOUR_ORDER} *#${order.order_number || order.orderNumber}* ${t.FROM} *${brandName}* ${t.PACKED_READY}\n\n${t.CLOSING}`;

  return {
    text,
    templateName: 'order_packed',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: order.customer_name || t.CUSTOMER },
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

export async function buildAbandonedCartWA(customerName, brandName, itemsSummary, cartTotal, storeUrl, currency = 'INR', env = null, siteId = null, targetLang = null) {
  const t = await translateLabels(env, siteId, targetLang, {
    TITLE: 'Don\'t forget your cart!',
    HI: 'Hi',
    THERE: 'there',
    LEFT_ITEMS: 'You left some items in your cart at',
    YOUR_ITEMS: 'Your items:',
    CART_TOTAL: 'Cart Total:',
    COMPLETE_NOW: '👉 Complete your purchase now:',
    DONT_MISS: 'Don\'t miss out — your items are waiting for you!',
    CUSTOMER: 'Customer',
  });
  const total = formatCurrency(cartTotal, currency);

  const text = `🛒 *${t.TITLE}*\n\n${t.HI} ${customerName || t.THERE},\n\n${t.LEFT_ITEMS} *${brandName}*!\n\n📦 *${t.YOUR_ITEMS}*\n${itemsSummary}\n\n💰 *${t.CART_TOTAL}* ${total}\n\n${t.COMPLETE_NOW} ${storeUrl}\n\n${t.DONT_MISS}`;

  return {
    text,
    templateName: 'abandoned_cart_reminder',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: customerName || t.CUSTOMER },
          { type: 'text', text: brandName },
          { type: 'text', text: itemsSummary },
          { type: 'text', text: total },
          { type: 'text', text: storeUrl },
        ],
      },
    ],
  };
}

export function isWhatsAppConfigured(settings) {
  if (!settings || !settings.whatsappNotificationsEnabled) return false;
  const provider = settings.whatsappProvider || 'meta';
  if (provider === 'interakt') return !!settings.whatsappApiKey;
  return !!settings.whatsappAccessToken && !!settings.whatsappPhoneNumberId;
}
