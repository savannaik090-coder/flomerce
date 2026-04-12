import { resolveSiteDBById } from '../../utils/site-db.js';
import { jsonResponse, errorResponse } from '../../utils/helpers.js';
import { validateSiteAdmin } from './site-admin-worker.js';
import { sendWebPush } from '../../utils/web-push.js';
import { trackD1Write, trackD1Delete, checkFeatureAccess } from '../../utils/usage-tracker.js';
import { PLATFORM_DOMAIN, VAPID_SUBJECT } from '../../config.js';

async function getSiteIcon(env, siteId) {
  try {
    const db = await resolveSiteDBById(env, siteId);
    const config = await db.prepare('SELECT favicon_url, logo_url FROM site_config WHERE site_id = ?').bind(siteId).first();
    if (config?.favicon_url) return config.favicon_url;
    if (config?.logo_url) return config.logo_url;
  } catch (e) {}
  try {
    const site = await env.DB.prepare('SELECT favicon_url, logo_url FROM sites WHERE id = ?').bind(siteId).first();
    if (site?.favicon_url) return site.favicon_url;
    if (site?.logo_url) return site.logo_url;
  } catch (e) {}
  return null;
}

export async function handleNotifications(request, env, path) {
  const url = new URL(request.url);
  const pathParts = path.split('/').filter(Boolean);
  const action = pathParts[2];

  switch (action) {
    case 'subscribe':
      if (request.method === 'POST') return handleSubscribe(request, env);
      break;
    case 'unsubscribe':
      if (request.method === 'POST' || request.method === 'DELETE') return handleUnsubscribe(request, env);
      break;
    case 'stats':
      if (request.method === 'GET') return handleStats(request, env);
      break;
    case 'send':
      if (request.method === 'POST') {
        const sendUrl = new URL(request.url);
        let sendSiteId = sendUrl.searchParams.get('siteId');
        if (!sendSiteId) {
          try { const b = await request.clone().json(); sendSiteId = b.siteId; } catch (e) {}
        }
        if (sendSiteId) {
          const access = await checkFeatureAccess(env, sendSiteId, 'pushManual');
          if (!access.allowed) {
            return errorResponse(`Push notifications are available on the ${(access.requiredPlan || 'growth').charAt(0).toUpperCase() + (access.requiredPlan || 'growth').slice(1)} plan. Upgrade to unlock.`, 403, 'FEATURE_LOCKED');
          }
        }
        return handleSend(request, env);
      }
      break;
    case 'settings':
      if (request.method === 'GET') return handleGetSettings(request, env);
      if (request.method === 'POST') return handleSaveSettings(request, env);
      break;
  }

  return errorResponse('Notifications endpoint not found', 404);
}

async function handleSubscribe(request, env) {
  try {
    const body = await request.json();
    const { siteId, endpoint, p256dh, auth, userId } = body;

    if (!siteId || !endpoint || !p256dh || !auth) {
      return errorResponse('siteId, endpoint, p256dh, and auth are required', 400);
    }

    const db = await resolveSiteDBById(env, siteId);

    const existing = await db.prepare(
      'SELECT id FROM notifications WHERE site_id = ? AND endpoint = ?'
    ).bind(siteId, endpoint).first();

    if (existing) {
      await db.prepare(
        `UPDATE notifications SET p256dh = ?, auth = ?, user_id = ?, is_active = 1
         WHERE site_id = ? AND endpoint = ?`
      ).bind(p256dh, auth, userId || null, siteId, endpoint).run();
      return jsonResponse({ success: true, message: 'Subscription updated' });
    }

    const id = crypto.randomUUID();
    const rowBytes = 200 + endpoint.length + p256dh.length + auth.length;

    await db.prepare(
      `INSERT INTO notifications (id, site_id, user_id, push_token, endpoint, p256dh, auth, is_active, row_size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'))`
    ).bind(id, siteId, userId || null, '', endpoint, p256dh, auth, rowBytes).run();

    await trackD1Write(env, siteId, rowBytes);

    return jsonResponse({ success: true, message: 'Subscribed successfully' });
  } catch (err) {
    console.error('[Notifications] Subscribe error:', err);
    return errorResponse('Failed to subscribe: ' + err.message, 500);
  }
}

async function handleUnsubscribe(request, env) {
  try {
    const body = await request.json();
    const { siteId, endpoint } = body;

    if (!siteId || !endpoint) {
      return errorResponse('siteId and endpoint are required', 400);
    }

    const db = await resolveSiteDBById(env, siteId);

    const existing = await db.prepare(
      'SELECT id, row_size_bytes FROM notifications WHERE site_id = ? AND endpoint = ?'
    ).bind(siteId, endpoint).first();

    if (existing) {
      await db.prepare(
        'DELETE FROM notifications WHERE site_id = ? AND endpoint = ?'
      ).bind(siteId, endpoint).run();
      await trackD1Delete(env, siteId, existing.row_size_bytes || 200);
    }

    return jsonResponse({ success: true, message: 'Unsubscribed successfully' });
  } catch (err) {
    console.error('[Notifications] Unsubscribe error:', err);
    return errorResponse('Failed to unsubscribe: ' + err.message, 500);
  }
}

async function handleStats(request, env) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get('siteId');
    if (!siteId) return errorResponse('siteId is required', 400);

    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin) return errorResponse('Admin authentication required', 401);

    const db = await resolveSiteDBById(env, siteId);

    const totalResult = await db.prepare(
      'SELECT COUNT(*) as count FROM notifications WHERE site_id = ? AND is_active = 1'
    ).bind(siteId).first();

    const loggedInResult = await db.prepare(
      'SELECT COUNT(*) as count FROM notifications WHERE site_id = ? AND is_active = 1 AND user_id IS NOT NULL'
    ).bind(siteId).first();

    const total = totalResult?.count || 0;
    const loggedIn = loggedInResult?.count || 0;
    const guests = total - loggedIn;

    return jsonResponse({ success: true, data: { total, loggedIn, guests } });
  } catch (err) {
    console.error('[Notifications] Stats error:', err);
    return errorResponse('Failed to fetch stats: ' + err.message, 500);
  }
}

async function handleSend(request, env) {
  try {
    const body = await request.json();
    const { siteId, title, message, imageUrl, link, target, buttonLabel, buttonLink } = body;

    if (!siteId || !title || !message) {
      return errorResponse('siteId, title, and message are required', 400);
    }

    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin) return errorResponse('Admin authentication required', 401);

    const vapidPublicKey = env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = env.VAPID_PRIVATE_KEY;
    const vapidSubject = env.VAPID_SUBJECT || VAPID_SUBJECT;

    if (!vapidPrivateKey) {
      return errorResponse('Push notifications not configured (VAPID_PRIVATE_KEY missing)', 500);
    }

    const db = await resolveSiteDBById(env, siteId);
    const siteIcon = await getSiteIcon(env, siteId);

    const site = await env.DB.prepare('SELECT subdomain, custom_domain FROM sites WHERE id = ?').bind(siteId).first();
    const domain = env.DOMAIN || PLATFORM_DOMAIN;
    const siteOrigin = site?.custom_domain
      ? `https://${site.custom_domain}`
      : `https://${site?.subdomain || 'store'}.${domain}`;

    function toAbsoluteUrl(url) {
      if (!url) return null;
      url = url.trim();
      if (/^https?:\/\//i.test(url)) return url;
      if (url.startsWith('//')) return 'https:' + url;
      return siteOrigin + (url.startsWith('/') ? url : '/' + url);
    }

    let query = 'SELECT endpoint, p256dh, auth FROM notifications WHERE site_id = ? AND is_active = 1';
    const params = [siteId];

    if (target === 'loggedin') {
      query += ' AND user_id IS NOT NULL';
    } else if (target === 'guests') {
      query += ' AND user_id IS NULL';
    }

    const subscriptionsResult = await db.prepare(query).bind(...params).all();
    const subscriptions = subscriptionsResult.results || [];

    if (subscriptions.length === 0) {
      return jsonResponse({ success: true, data: { sent: 0, failed: 0, message: 'No subscribers found' } });
    }

    const iconUrl = toAbsoluteUrl(siteIcon) || toAbsoluteUrl('/icon-192.png');
    const payload = { title, body: message, icon: iconUrl };
    if (imageUrl) payload.image = toAbsoluteUrl(imageUrl);
    if (link) payload.data = { url: link };

    if (buttonLabel && buttonLink) {
      payload.actions = [{ action: 'cta', title: buttonLabel }];
      payload.data = payload.data || {};
      payload.data.actionUrls = { cta: buttonLink };
      if (!payload.data.url) payload.data.url = buttonLink;
    }

    let sent = 0;
    let failed = 0;
    const expiredEndpoints = [];

    const batchSize = 50;
    for (let i = 0; i < subscriptions.length; i += batchSize) {
      const batch = subscriptions.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(async (sub) => {
          try {
            const res = await sendWebPush(sub, payload, vapidPublicKey, vapidPrivateKey, vapidSubject);
            if (res.status === 201 || res.status === 200) {
              sent++;
            } else if (res.status === 410 || res.status === 404) {
              expiredEndpoints.push(sub.endpoint);
              failed++;
            } else {
              const errBody = await res.text().catch(() => '');
              console.warn('[Notifications] Push failed:', res.status, errBody.substring(0, 200), 'endpoint:', sub.endpoint.substring(0, 60));
              failed++;
            }
          } catch (e) {
            console.error('[Notifications] Push send error:', e.message);
            failed++;
          }
        })
      );
    }

    if (expiredEndpoints.length > 0) {
      for (const ep of expiredEndpoints) {
        try {
          await db.prepare('DELETE FROM notifications WHERE site_id = ? AND endpoint = ?').bind(siteId, ep).run();
        } catch (e) {}
      }
    }

    return jsonResponse({
      success: true,
      data: { sent, failed, total: subscriptions.length, message: `Notification sent to ${sent} subscriber${sent !== 1 ? 's' : ''}` },
    });
  } catch (err) {
    console.error('[Notifications] Send error:', err);
    return errorResponse('Failed to send notifications: ' + err.message, 500);
  }
}

async function handleGetSettings(request, env) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get('siteId');
    if (!siteId) return errorResponse('siteId is required', 400);

    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin) return errorResponse('Admin authentication required', 401);

    const db = await resolveSiteDBById(env, siteId);

    let config = null;
    try {
      config = await db.prepare('SELECT settings FROM site_config WHERE site_id = ?').bind(siteId).first();
    } catch (e) {}

    let settings = {};
    try {
      if (config?.settings) settings = JSON.parse(config.settings);
    } catch (e) {}

    const notifSettings = settings.pushNotifications || {
      newProducts: true,
      priceDrops: true,
      backInStock: true,
    };

    return jsonResponse({ success: true, data: notifSettings });
  } catch (err) {
    console.error('[Notifications] Get settings error:', err);
    return errorResponse('Failed to get settings: ' + err.message, 500);
  }
}

async function handleSaveSettings(request, env) {
  try {
    const body = await request.json();
    const { siteId, newProducts, priceDrops, backInStock, lowStock } = body;
    if (!siteId) return errorResponse('siteId is required', 400);

    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin) return errorResponse('Admin authentication required', 401);

    const db = await resolveSiteDBById(env, siteId);

    let config = null;
    try {
      config = await db.prepare('SELECT settings FROM site_config WHERE site_id = ?').bind(siteId).first();
    } catch (e) {}

    let settings = {};
    try {
      if (config?.settings) settings = JSON.parse(config.settings);
    } catch (e) {}

    settings.pushNotifications = { newProducts: !!newProducts, priceDrops: !!priceDrops, backInStock: !!backInStock, lowStock: lowStock !== undefined ? !!lowStock : true };

    await db.prepare(
      `INSERT INTO site_config (site_id, settings) VALUES (?, ?)
       ON CONFLICT(site_id) DO UPDATE SET settings = excluded.settings`
    ).bind(siteId, JSON.stringify(settings)).run();

    return jsonResponse({ success: true, message: 'Settings saved' });
  } catch (err) {
    console.error('[Notifications] Save settings error:', err);
    return errorResponse('Failed to save settings: ' + err.message, 500);
  }
}

export async function triggerAutoNotification(env, siteId, type, payload) {
  try {
    const access = await checkFeatureAccess(env, siteId, 'pushAutomated');
    if (!access.allowed) return;

    const db = await resolveSiteDBById(env, siteId);

    let config = null;
    try {
      config = await db.prepare('SELECT settings FROM site_config WHERE site_id = ?').bind(siteId).first();
    } catch (e) {}

    let settings = {};
    try {
      if (config?.settings) settings = JSON.parse(config.settings);
    } catch (e) {}

    const notifSettings = settings.pushNotifications || { newProducts: true, priceDrops: true, backInStock: true, lowStock: true };

    const enabledMap = { newProduct: notifSettings.newProducts, priceDrop: notifSettings.priceDrops, backInStock: notifSettings.backInStock, lowStock: notifSettings.lowStock !== false };
    if (!enabledMap[type]) return;

    const site = await env.DB.prepare('SELECT subdomain, custom_domain FROM sites WHERE id = ?').bind(siteId).first();
    const domain = env.DOMAIN || PLATFORM_DOMAIN;
    const siteOrigin = site?.custom_domain
      ? `https://${site.custom_domain}`
      : `https://${site?.subdomain || 'store'}.${domain}`;

    function toAbsoluteUrl(url) {
      if (!url) return null;
      url = url.trim();
      if (/^https?:\/\//i.test(url)) return url;
      if (url.startsWith('//')) return 'https:' + url;
      return siteOrigin + (url.startsWith('/') ? url : '/' + url);
    }

    const siteIcon = await getSiteIcon(env, siteId);
    const iconUrl = toAbsoluteUrl(siteIcon) || toAbsoluteUrl('/icon-192.png');

    if (payload.image) {
      payload.image = toAbsoluteUrl(payload.image);
    }
    payload.icon = iconUrl;

    if (payload.data?.url) {
      payload.data.url = toAbsoluteUrl(payload.data.url);
    }

    const vapidPublicKey = env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = env.VAPID_PRIVATE_KEY;
    const vapidSubject = env.VAPID_SUBJECT || VAPID_SUBJECT;
    if (!vapidPrivateKey) return;

    const subscriptionsResult = await db.prepare(
      'SELECT endpoint, p256dh, auth FROM notifications WHERE site_id = ? AND is_active = 1'
    ).bind(siteId).all();
    const subscriptions = subscriptionsResult.results || [];

    if (subscriptions.length === 0) return;

    const expiredEndpoints = [];

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const res = await sendWebPush(sub, payload, vapidPublicKey, vapidPrivateKey, vapidSubject);
          if (res.status === 410 || res.status === 404) expiredEndpoints.push(sub.endpoint);
        } catch (e) {}
      })
    );

    for (const ep of expiredEndpoints) {
      try {
        await db.prepare('DELETE FROM notifications WHERE site_id = ? AND endpoint = ?').bind(siteId, ep).run();
      } catch (e) {}
    }
  } catch (err) {
    console.error('[Notifications] Auto-trigger error:', err);
  }
}

