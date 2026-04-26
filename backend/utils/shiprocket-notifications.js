// Customer-facing notifications fired when a Shiprocket webhook flips an
// order status. Lives in /utils so both the shipping worker (which is the
// caller from the webhook handler) and any future caller can import it
// directly without going through orders-worker.js — keeping us out of a
// circular dependency between the two storefront workers.

import { resolveSiteDBById, getSiteConfig } from './site-db.js';
import {
  sendEmail,
  getOwnerRecipients,
  buildOrderShippedEmail,
  buildDeliveryCustomerEmail,
  buildDeliveryOwnerEmail,
} from './email.js';
import { translateString } from './email-i18n.js';
import {
  sendOrderWhatsApp,
  buildOrderShippedWA,
  buildOrderDeliveredWA,
  isWhatsAppConfigured,
} from './whatsapp.js';
import { PLATFORM_DOMAIN } from '../config.js';

// Fire customer-facing email + WhatsApp for a status flip driven by a
// Shiprocket webhook (no admin user/session in scope). Best-effort: errors
// are logged but never thrown.
export async function sendShiprocketStatusNotification(env, siteId, orderId, newStatus, table = 'orders') {
  try {
    const db = await resolveSiteDBById(env, siteId);
    const fullOrder = await db.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(orderId).first();
    if (!fullOrder) return;

    const config = await getSiteConfig(env, siteId);
    const siteBrandName = config.brand_name || 'Store';
    let settings = {};
    try { if (config.settings) settings = typeof config.settings === 'string' ? JSON.parse(config.settings) : config.settings; } catch {}
    const ownerEmail = settings.email || settings.ownerEmail || config.email;
    const currency = fullOrder.currency || settings.defaultCurrency || 'INR';
    const storeTz = settings.timezone || '';

    const site = await env.DB.prepare('SELECT subdomain, custom_domain FROM sites WHERE id = ?').bind(siteId).first();
    const domain = site?.custom_domain || `${site?.subdomain || 'store'}.${env.DOMAIN || PLATFORM_DOMAIN}`;
    const trackingUrl = `https://${domain}/order-track?orderId=${fullOrder.order_number}`;
    const placedLang = fullOrder.placed_in_language || null;

    const emailOrder = {
      order_number: fullOrder.order_number,
      customer_name: fullOrder.customer_name,
      customer_email: fullOrder.customer_email,
      customer_phone: fullOrder.customer_phone,
      total: fullOrder.total,
      payment_method: fullOrder.payment_method,
      items: fullOrder.items,
      shipping_address: fullOrder.shipping_address,
      subtotal: fullOrder.subtotal,
      discount: fullOrder.discount,
      shipping_cost: fullOrder.shipping_cost || 0,
      coupon_code: fullOrder.coupon_code,
      created_at: fullOrder.created_at,
    };

    if (fullOrder.customer_email) {
      try {
        if (newStatus === 'shipped') {
          const shipOptions = {
            trackingUrl,
            trackingNumber: fullOrder.shiprocket_awb || fullOrder.tracking_number,
            carrier: fullOrder.shiprocket_courier || fullOrder.carrier,
          };
          const { html, text } = await buildOrderShippedEmail(emailOrder, siteBrandName, ownerEmail, currency, shipOptions, storeTz, env, siteId, placedLang);
          const subj = await translateString(env, siteId, placedLang, `Your order #${fullOrder.order_number} has been shipped! - ${siteBrandName}`);
          await sendEmail(env, fullOrder.customer_email, subj, html, text, { senderName: siteBrandName, replyTo: ownerEmail || undefined }).catch(e => console.error('[shiprocket] shipped email:', e));
        } else if (newStatus === 'delivered') {
          const { html, text } = await buildDeliveryCustomerEmail(emailOrder, siteBrandName, ownerEmail, currency, {}, storeTz, env, siteId, placedLang);
          const subj = await translateString(env, siteId, placedLang, `Your order #${fullOrder.order_number} has been delivered! - ${siteBrandName}`);
          await sendEmail(env, fullOrder.customer_email, subj, html, text, { senderName: siteBrandName, replyTo: ownerEmail || undefined }).catch(e => console.error('[shiprocket] delivered email:', e));
        }
      } catch (e) { console.error('[shiprocket] customer email build error:', e); }
    }

    if (isWhatsAppConfigured(settings) && fullOrder.customer_phone && fullOrder.whatsapp_opted_in) {
      try {
        let waMsg = null;
        if (newStatus === 'shipped') {
          waMsg = await buildOrderShippedWA(emailOrder, siteBrandName, trackingUrl, currency, env, siteId, placedLang);
        } else if (newStatus === 'delivered') {
          waMsg = await buildOrderDeliveredWA(emailOrder, siteBrandName, currency, env, siteId, placedLang);
        }
        if (waMsg) await sendOrderWhatsApp(settings, fullOrder.customer_phone, waMsg);
      } catch (waErr) { console.error('[shiprocket] WhatsApp send error:', waErr); }
    }

    // Also fire owner notifications for delivered events (matches existing
    // manual-update behaviour where merchants get a delivery email).
    if (newStatus === 'delivered') {
      try {
        const ownerRecipients = getOwnerRecipients(settings, config);
        if (ownerRecipients.length) {
          const { html, text } = buildDeliveryOwnerEmail(emailOrder, siteBrandName, currency, storeTz);
          await sendEmail(env, ownerRecipients, `Order #${fullOrder.order_number} delivered - ${siteBrandName}`, html, text, { senderName: siteBrandName }).catch(() => {});
        }
      } catch (e) { console.error('[shiprocket] owner delivered email error:', e); }
    }
  } catch (e) {
    console.error('sendShiprocketStatusNotification error:', e);
  }
}
