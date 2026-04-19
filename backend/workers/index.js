import { handleAuth } from './platform/auth-worker.js';
import { handleSites } from './platform/sites-worker.js';
import { handleProducts, updateProductStock } from './storefront/products-worker.js';
import { handleOrders } from './storefront/orders-worker.js';
import { handleCart, mergeCarts, clearCart } from './storefront/cart-worker.js';
import { handleWishlist } from './storefront/wishlist-worker.js';
import { handlePayments, activateSubscription } from './platform/payments-worker.js';
import { handleEmail } from './platform/email-worker.js';
import { handleCategories } from './storefront/categories-worker.js';
import { handleUsers } from './platform/users-worker.js';
import { handleSiteRouting, resolveSiteFromRequest } from './site-router.js';
import { handleAdmin } from './platform/admin-worker.js';
import { handleSiteAdmin } from './storefront/site-admin-worker.js';
import { handleCustomerAuth } from './storefront/customer-auth-worker.js';
import { handleUpload } from './storefront/upload-worker.js';
import { handleAnalytics } from './storefront/analytics-worker.js';
import { handleNotifications } from './storefront/notifications-worker.js';
import { handleReviews } from './storefront/reviews-worker.js';
import { handleInventoryLocations } from './storefront/inventory-locations-worker.js';
import { handleBlog } from './storefront/blog-worker.js';
import { handleUsageAPI, handlePlanLimitsAPI } from '../utils/usage-tracker.js';
import { jsonResponse, errorResponse, corsHeaders, handleCORS } from '../utils/helpers.js';
import { cachedJsonResponse } from '../utils/cache.js';
import { PLATFORM_DOMAIN } from '../config.js';
import { ensureTablesExist } from '../utils/db-init.js';
import { resolveSiteDBById, getSiteConfig } from '../utils/site-db.js';

export default {
  async fetch(request, env, ctx) {
    const corsResponse = handleCORS(request);
    if (corsResponse) return corsResponse;

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      await ensureTablesExist(env);

      if (path.startsWith('/api/')) {
        return handleAPI(request, env, path, ctx);
      }

      if (path.startsWith('/auth/google/')) {
        return handleGoogleAuthFlow(request, env, path);
      }

      const siteResponse = await handleSiteRouting(request, env);
      if (siteResponse) {
        return siteResponse;
      }

      const hostname = url.hostname;
      const platformDomain = env.DOMAIN || PLATFORM_DOMAIN;
      if (hostname === `www.${platformDomain}` || hostname === platformDomain) {
        const pagesHostname = env.PAGES_HOSTNAME || 'flomerce.pages.dev';
        const pagesUrl = new URL(request.url);
        pagesUrl.hostname = pagesHostname;
        const pagesRequest = new Request(pagesUrl.toString(), {
          method: request.method,
          headers: request.headers,
          body: request.body,
          redirect: 'follow',
        });
        return fetch(pagesRequest);
      }

      if (env.ASSETS) {
        return env.ASSETS.fetch(request);
      }

      return new Response('Not Found', { status: 404 });
    } catch (error) {
      console.error('Worker error:', error);
      return errorResponse('Internal server error', 500);
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(cleanupExpiredData(env));
    ctx.waitUntil(processAbandonedCartReminders(env));
  },
};

async function handleAPI(request, env, path, ctx) {
  const pathParts = path.split('/').filter(Boolean);
  const apiVersion = pathParts[0];
  const resource = pathParts[1];

  if (apiVersion !== 'api') {
    return errorResponse('Invalid API path', 400);
  }

  switch (resource) {
    case 'auth':
      return handleAuth(request, env, path);

    case 'sites':
      return handleSites(request, env, path, ctx);

    case 'products':
      return handleProducts(request, env, path, ctx);

    case 'inventory-locations':
      return handleInventoryLocations(request, env, path, ctx);

    case 'orders':
      return handleOrders(request, env, path, ctx);

    case 'cart':
      return handleCart(request, env, path);

    case 'wishlist':
      return handleWishlist(request, env, path);

    case 'payments':
      return handlePayments(request, env, path, ctx);

    case 'email':
      return handleEmail(request, env, path);

    case 'categories':
      return handleCategories(request, env, path, ctx);

    case 'users':
      return handleUsers(request, env, path);

    case 'admin':
      return handleAdmin(request, env, path);

    case 'site-admin':
      return handleSiteAdmin(request, env, path, ctx);

    case 'customer-auth':
      return handleCustomerAuth(request, env, path);

    case 'upload':
      return handleUpload(request, env, path);

    case 'analytics':
      return handleAnalytics(request, env, path);

    case 'notifications':
      return handleNotifications(request, env, path);

    case 'reviews':
      return handleReviews(request, env, path, ctx);

    case 'blog':
      return handleBlog(request, env, path, ctx);

    case 'usage':
      return handleUsageAPI(request, env, path);

    case 'plan-limits':
      return handlePlanLimitsAPI(request, env, path);

    case 'health':
      return handleHealth(env);

    case 'site':
      return handleSiteInfo(request, env);

    default:
      return errorResponse('API endpoint not found', 404);
  }
}

async function handleHealth(env) {
  try {
    const dbCheck = await env.DB.prepare('SELECT 1 as ok').first();
    
    return jsonResponse({
      status: 'healthy',
      database: dbCheck ? 'connected' : 'error',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return jsonResponse({
      status: 'unhealthy',
      database: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
    }, 500);
  }
}

async function handleSiteInfo(request, env) {
  const url = new URL(request.url);
  const hostname = url.hostname;
  const subdomain = url.searchParams.get('subdomain');

  let siteRow = null;

  try {
    if (subdomain) {
      siteRow = await env.DB.prepare(
        `SELECT s.id, s.subdomain, s.brand_name, s.template_id,
                s.custom_domain, s.domain_status, s.domain_verification_token,
                s.subscription_plan
         FROM sites s 
         WHERE LOWER(s.subdomain) = LOWER(?) AND s.is_active = 1`
      ).bind(subdomain).first();
    } else if (!hostname.endsWith(env.DOMAIN || PLATFORM_DOMAIN) && !hostname.endsWith('pages.dev') && !hostname.includes('localhost') && !hostname.includes('workers.dev')) {
      siteRow = await env.DB.prepare(
        `SELECT s.id, s.subdomain, s.brand_name, s.template_id,
                s.custom_domain, s.domain_status, s.domain_verification_token,
                s.subscription_plan
         FROM sites s 
         WHERE s.custom_domain = ? AND s.domain_status = 'verified' AND s.is_active = 1`
      ).bind(hostname.toLowerCase()).first();
    }

    if (!siteRow) {
      return errorResponse(subdomain ? 'Site not found' : 'Subdomain is required', subdomain ? 404 : 400);
    }

    const siteDB = await resolveSiteDBById(env, siteRow.id);
    const config = await siteDB.prepare(
      'SELECT * FROM site_config WHERE site_id = ?'
    ).bind(siteRow.id).first();

    const { site_id: _sid, row_size_bytes: _rb, ...configData } = (config || {});
    const site = { ...siteRow, ...configData };

    let categoriesResult = [];
    try {
      const categories = await siteDB.prepare(
        'SELECT * FROM categories WHERE site_id = ? ORDER BY display_order'
      ).bind(site.id).all();
      const allCats = categories.results || [];
      const parents = allCats.filter(c => !c.parent_id);
      categoriesResult = parents.map(parent => {
        const directChildren = allCats.filter(c => c.parent_id === parent.id);
        return {
          ...parent,
          children: directChildren.map(child => ({
            ...child,
            children: allCats.filter(gc => gc.parent_id === child.id),
          })),
        };
      });
    } catch (catError) {
      console.error('Categories query failed:', catError);
    }

    let socialLinks = {};
    let settings = {};
    try {
      if (site.social_links) socialLinks = typeof site.social_links === 'string' ? JSON.parse(site.social_links) : site.social_links;
    } catch (e) {}
    try {
      if (site.settings) settings = typeof site.settings === 'string' ? JSON.parse(site.settings) : site.settings;
    } catch (e) {}

    if (settings.social) {
      const s = settings.social;
      const platforms = ['instagram', 'facebook', 'twitter', 'youtube'];
      for (const p of platforms) {
        if (p in s) {
          if (s[p]) {
            socialLinks[p] = s[p];
          } else {
            delete socialLinks[p];
          }
        }
      }
    }

    const { razorpayKeySecret, adminVerificationCode, whatsappAccessToken, whatsappApiKey, whatsappPhoneNumberId, ...publicSettings } = settings;

    const googleClientId = env.GOOGLE_CLIENT_ID || null;
    const vapidPublicKey = env.VAPID_PUBLIC_KEY || null;

    let pageSEOResult = [];
    try {
      const psResult = await siteDB.prepare(
        'SELECT page_type, seo_title, seo_description, seo_og_image FROM page_seo WHERE site_id = ?'
      ).bind(site.id).all();
      pageSEOResult = psResult.results || [];
    } catch {}

    const pageSEO = {};
    for (const ps of pageSEOResult) {
      pageSEO[ps.page_type] = {
        seo_title: ps.seo_title,
        seo_description: ps.seo_description,
        seo_og_image: ps.seo_og_image,
      };
    }

    return cachedJsonResponse({
      success: true,
      data: {
        ...site,
        socialLinks,
        settings: publicSettings,
        categories: categoriesResult,
        pageSEO,
        googleClientId,
        vapidPublicKey,
      },
    }, 200, request);
  } catch (error) {
    console.error('Get site info error:', error);
    return errorResponse('Failed to fetch site info: ' + error.message, 500);
  }
}

async function handleGoogleAuthFlow(request, env, path) {
  const url = new URL(request.url);
  const clientId = env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return new Response('Google Sign-In is not configured', { status: 500, headers: { 'Content-Type': 'text/plain' } });
  }

  if (path === '/auth/google/start') {
    const siteId = url.searchParams.get('siteId') || '';
    const returnUrl = url.searchParams.get('returnUrl') || '';
    const mode = url.searchParams.get('mode') || 'login';
    const domain = env.DOMAIN || PLATFORM_DOMAIN;

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Sign in with Google - Flomerce</title>
<style>
body{margin:0;font-family:'Lato',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8f9fa}
.container{text-align:center;background:#fff;padding:40px;border-radius:12px;box-shadow:0 2px 20px rgba(0,0,0,0.1);max-width:400px;width:90%}
h2{font-family:'Playfair Display',serif;color:#333;margin-bottom:8px}
p{color:#777;margin-bottom:24px}
.error{color:#e74c3c;background:rgba(231,76,60,0.1);border:1px solid #e74c3c;padding:12px;border-radius:6px;margin-top:16px;display:none}
.loading{color:#666;margin-top:16px;display:none}
#google-btn{min-height:44px;display:flex;justify-content:center}
</style>
<script src="https://accounts.google.com/gsi/client" async defer></script>
</head><body>
<div class="container">
<h2>${mode === 'signup' ? 'Sign Up' : 'Sign In'} with Google</h2>
<p>Choose your Google account to continue</p>
<div id="google-btn"></div>
<div class="loading" id="loading">Signing you in...</div>
<div class="error" id="error"></div>
</div>
<script>
const siteId="${siteId.replace(/"/g, '')}";
const returnUrl="${returnUrl.replace(/"/g, '')}";
const domain="${domain}";
function onCredential(r){
  document.getElementById('loading').style.display='block';
  document.getElementById('error').style.display='none';
  fetch('/api/customer-auth/google-login',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({siteId:siteId,credential:r.credential})
  }).then(function(res){return res.json()}).then(function(data){
    if(data.success&&data.data){
      var d=data.data;
      var token=d.token;
      var customer=d.customer;
      var sep=returnUrl.indexOf('?')>=0?'&':'?';
      var dest=returnUrl+sep+'google_auth_token='+encodeURIComponent(token)+'&google_auth_customer='+encodeURIComponent(JSON.stringify(customer));
      window.location.href=dest;
    }else{
      showError(data.message||data.error||'Sign-in failed');
    }
  }).catch(function(e){showError('Network error. Please try again.')});
}
function showError(msg){
  document.getElementById('loading').style.display='none';
  var el=document.getElementById('error');el.textContent=msg;el.style.display='block';
}
window.onload=function(){
  if(window.google&&window.google.accounts){
    google.accounts.id.initialize({client_id:"${clientId}",callback:onCredential,auto_select:false});
    google.accounts.id.renderButton(document.getElementById('google-btn'),{type:'standard',theme:'outline',size:'large',text:'${mode === 'signup' ? 'signup_with' : 'signin_with'}',width:340});
  }else{showError('Failed to load Google Sign-In. Please try again.')}
};
</script></body></html>`;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store',
        ...corsHeaders(),
      },
    });
  }

  return new Response('Not found', { status: 404 });
}

async function cleanupExpiredData(env) {
  try {
    try {
      await env.DB.prepare(
        `DELETE FROM sessions WHERE expires_at < datetime('now')`
      ).run();
    } catch (e) {
      console.error('[Cleanup] platform sessions:', e.message || e);
    }

    try {
      await env.DB.prepare(
        `DELETE FROM email_verifications WHERE (used = 1 OR expires_at < datetime('now'))`
      ).run();
    } catch (e) {
      console.error('[Cleanup] platform email_verifications:', e.message || e);
    }

    try {
      await env.DB.prepare(
        `DELETE FROM password_resets WHERE (used = 1 OR expires_at < datetime('now'))`
      ).run();
    } catch (e) {
      console.error('[Cleanup] platform password_resets:', e.message || e);
    }

    const allSites = await env.DB.prepare('SELECT id FROM sites').all();
    for (const site of (allSites.results || [])) {
      try {
        const db = await resolveSiteDBById(env, site.id);

        await db.prepare(
          `DELETE FROM site_customer_sessions WHERE expires_at < datetime('now')`
        ).run();

        await db.prepare(
          `DELETE FROM customer_password_resets WHERE (used = 1 OR expires_at < datetime('now'))`
        ).run();

        await db.prepare(
          `DELETE FROM customer_email_verifications WHERE (used = 1 OR expires_at < datetime('now'))`
        ).run();
      } catch (e) {
        console.error(`[Cleanup] shard for site ${site.id}:`, e.message || e);
      }
    }

    for (const site of (allSites.results || [])) {
      try {
        const db = await resolveSiteDBById(env, site.id);
        const staleOrders = await db.prepare(
          `SELECT id, items, site_id FROM orders WHERE status = 'pending_payment' AND created_at < datetime('now', '-30 minutes')`
        ).all();
        for (const staleOrder of (staleOrders.results || [])) {
          try {
            const orderItems = typeof staleOrder.items === 'string' ? JSON.parse(staleOrder.items) : staleOrder.items;
            for (const item of orderItems) {
              await updateProductStock(env, item.productId, item.quantity, 'increment', staleOrder.site_id);
            }
            await db.prepare(
              `UPDATE orders SET status = 'cancelled', cancelled_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
            ).bind(staleOrder.id).run();
          } catch (orderErr) {
            console.error(`[Cleanup] stale order ${staleOrder.id}:`, orderErr.message || orderErr);
          }
        }

        const staleGuestOrders = await db.prepare(
          `SELECT id, items, site_id FROM guest_orders WHERE status = 'pending_payment' AND created_at < datetime('now', '-30 minutes')`
        ).all();
        for (const staleOrder of (staleGuestOrders.results || [])) {
          try {
            const orderItems = typeof staleOrder.items === 'string' ? JSON.parse(staleOrder.items) : staleOrder.items;
            for (const item of orderItems) {
              await updateProductStock(env, item.productId, item.quantity, 'increment', staleOrder.site_id);
            }
            await db.prepare(
              `UPDATE guest_orders SET status = 'cancelled', cancelled_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
            ).bind(staleOrder.id).run();
          } catch (orderErr) {
            console.error(`[Cleanup] stale guest order ${staleOrder.id}:`, orderErr.message || orderErr);
          }
        }
      } catch (e) {
        console.error(`[Cleanup] stale orders for site ${site.id}:`, e.message || e);
      }
    }

    // Mark active subscriptions whose period has ended as expired (for paid subs not yet renewed).
    try {
      await env.DB.prepare(
        `UPDATE subscriptions SET status = 'expired', updated_at = datetime('now')
         WHERE status = 'active' AND current_period_end IS NOT NULL AND datetime(current_period_end) < datetime('now')`
      ).run();
    } catch (e) {
      console.error('[Cleanup] expire subscriptions:', e.message || e);
    }

    // Activate any scheduled (downgrade) subscriptions whose start time has arrived,
    // and reflect the new plan onto the site row.
    try {
      const dueScheduled = await env.DB.prepare(
        `SELECT id, site_id, plan, current_period_end FROM subscriptions
         WHERE status = 'scheduled' AND current_period_start IS NOT NULL AND datetime(current_period_start) <= datetime('now')`
      ).all();
      for (const s of (dueScheduled.results || [])) {
        await env.DB.prepare(
          `UPDATE subscriptions SET status = 'active', updated_at = datetime('now') WHERE id = ?`
        ).bind(s.id).run();
        if (s.site_id) {
          await env.DB.prepare(
            `UPDATE sites SET subscription_plan = ?, subscription_expires_at = ?, updated_at = datetime('now')
             WHERE id = ? AND COALESCE(subscription_plan, '') != 'enterprise'`
          ).bind(s.plan, s.current_period_end, s.site_id).run();
        }
      }
    } catch (e) {
      console.error('[Cleanup] activate scheduled subs:', e.message || e);
    }

    // Disable trial sites whose trial expired (do this before clearing the cached plan column).
    try {
      await env.DB.prepare(
        `UPDATE sites SET is_active = 0, updated_at = datetime('now')
         WHERE subscription_plan = 'trial'
           AND subscription_expires_at IS NOT NULL
           AND datetime(subscription_expires_at) < datetime('now')
           AND is_active = 1`
      ).run();
    } catch (e) {
      console.error('[Cleanup] disable expired trial sites:', e.message || e);
    }

    // ----- Sites <-> subscriptions reconciliation -----
    // The subscriptions table is the source of truth. Three sweeps:
    //   1) Sites with an active sub whose plan/expiry differs from the cache: sync forward.
    //   2) Sites whose cached paid plan has no matching active sub: clear the cache.
    //   3) Trial sites whose subscription_expires_at is in the past: clear the cache.
    // 'enterprise' is an admin override and is left alone.

    // 1) Forward-sync sites where the cached plan/expiry diverges from the active subscription.
    try {
      await env.DB.prepare(
        `UPDATE sites SET
            subscription_plan = (SELECT s.plan FROM subscriptions s WHERE s.site_id = sites.id AND s.status = 'active' ORDER BY s.created_at DESC LIMIT 1),
            subscription_expires_at = (SELECT s.current_period_end FROM subscriptions s WHERE s.site_id = sites.id AND s.status = 'active' ORDER BY s.created_at DESC LIMIT 1),
            updated_at = datetime('now')
         WHERE COALESCE(subscription_plan, '') != 'enterprise'
           AND EXISTS (
             SELECT 1 FROM subscriptions s WHERE s.site_id = sites.id AND s.status = 'active'
               AND (
                 COALESCE(s.plan, '') != COALESCE(sites.subscription_plan, '')
                 OR COALESCE(s.current_period_end, '') != COALESCE(sites.subscription_expires_at, '')
               )
           )`
      ).run();
    } catch (e) {
      console.error('[Cleanup] forward-sync site subscription:', e.message || e);
    }

    // 2) Clear cached paid plan on sites that have no active subscription. (Trial handled below.)
    // Race protection: only clear rows that haven't been touched in the last 5 minutes.
    // In-flight subscription transitions (cancel old -> insert new) update sites.updated_at,
    // so this grace window prevents the cron from clearing a row mid-transition before the
    // new active subscription has been written.
    try {
      await env.DB.prepare(
        `UPDATE sites SET subscription_plan = NULL, subscription_expires_at = NULL, updated_at = datetime('now')
         WHERE COALESCE(subscription_plan, '') NOT IN ('enterprise', '', 'trial')
           AND (updated_at IS NULL OR datetime(updated_at) < datetime('now', '-5 minutes'))
           AND NOT EXISTS (
             SELECT 1 FROM subscriptions s WHERE s.site_id = sites.id AND s.status IN ('active', 'scheduled')
           )`
      ).run();
    } catch (e) {
      console.error('[Cleanup] clear stale paid plan on sites:', e.message || e);
    }

    // 3) Clear expired trial cache (the disable-trial-site sweep above already set is_active=0).
    try {
      await env.DB.prepare(
        `UPDATE sites SET subscription_plan = NULL, subscription_expires_at = NULL, updated_at = datetime('now')
         WHERE subscription_plan = 'trial'
           AND subscription_expires_at IS NOT NULL
           AND datetime(subscription_expires_at) < datetime('now')`
      ).run();
    } catch (e) {
      console.error('[Cleanup] clear expired trial cache:', e.message || e);
    }

    // Delete pending_subscriptions older than 24h that never converted.
    try {
      await env.DB.prepare(
        `DELETE FROM pending_subscriptions WHERE created_at < datetime('now', '-24 hours')`
      ).run();
    } catch (e) {
      console.error('[Cleanup] orphaned pending_subscriptions:', e.message || e);
    }

    // Drop processed_webhooks rows older than 30 days to keep the idempotency table small.
    try {
      await env.DB.prepare(
        `DELETE FROM processed_webhooks WHERE processed_at < datetime('now', '-30 days')`
      ).run();
    } catch (e) {
      console.error('[Cleanup] processed_webhooks:', e.message || e);
    }

    console.log('[Cleanup] Expired sessions, tokens, stale orders, and subscriptions cleaned up successfully');
  } catch (error) {
    console.error('[Cleanup] Error during cleanup:', error);
  }
}

async function processAbandonedCartReminders(env) {
  const { sendEmail } = await import('../utils/email.js');
  const { buildAbandonedCartEmail } = await import('../utils/email.js');
  const { sendOrderWhatsApp, buildAbandonedCartWA, isWhatsAppConfigured } = await import('../utils/whatsapp.js');

  try {
    const allSites = await env.DB.prepare('SELECT id, brand_name, subdomain, custom_domain, domain_status FROM sites WHERE is_active = 1').all();

    for (const site of (allSites.results || [])) {
      try {
        const db = await resolveSiteDBById(env, site.id);
        const siteConfig = await getSiteConfig(env, site.id);
        if (!siteConfig.settings) continue;

        let settings = siteConfig.settings;
        if (typeof settings === 'string') settings = JSON.parse(settings);

        const acConfig = settings.abandonedCartConfig;
        if (!acConfig || !acConfig.enabled) continue;

        const delayHours = Number(acConfig.delayHours) || 1;
        const maxReminders = Number(acConfig.maxReminders) || 1;
        const sendWhatsApp = acConfig.whatsapp !== false;
        const sendEmailChannel = acConfig.email !== false;

        try {
          await db.prepare('ALTER TABLE carts ADD COLUMN reminder_sent_at TEXT').run();
        } catch (e) {}
        try {
          await db.prepare('ALTER TABLE carts ADD COLUMN reminder_count INTEGER DEFAULT 0').run();
        } catch (e) {}

        const abandonedCarts = await db.prepare(
          `SELECT c.id, c.site_id, c.user_id, c.items, c.subtotal, c.updated_at,
                  c.reminder_count, c.reminder_sent_at
           FROM carts c
           WHERE c.user_id IS NOT NULL
             AND c.items != '[]'
             AND c.items != ''
             AND (c.reminder_count IS NULL OR c.reminder_count < ?)
             AND c.updated_at < datetime('now', '-' || ? || ' hours')
           ORDER BY c.updated_at ASC
           LIMIT 50`
        ).bind(maxReminders, delayHours).all();

        if (!abandonedCarts.results || abandonedCarts.results.length === 0) continue;

        const brandName = site.brand_name || 'Store';
        const domain = env.DOMAIN || PLATFORM_DOMAIN;
        const storeUrl = (site.custom_domain && site.domain_status === 'verified')
          ? `https://${site.custom_domain}`
          : `https://${site.subdomain}.${domain}`;
        const currency = settings.defaultCurrency || settings.currency || 'INR';

        for (const cart of abandonedCarts.results) {
          try {
            const currentReminderCount = cart.reminder_count || 0;
            if (currentReminderCount > 0 && cart.reminder_sent_at) {
              const nextDelay = delayHours * Math.pow(2, currentReminderCount);
              const nextSendTime = new Date(new Date(cart.reminder_sent_at).getTime() + nextDelay * 60 * 60 * 1000);
              if (new Date() < nextSendTime) continue;
            }

            const recentOrder = await db.prepare(
              `SELECT id FROM orders WHERE user_id = ? AND site_id = ? AND created_at > ? LIMIT 1`
            ).bind(cart.user_id, cart.site_id, cart.updated_at).first();

            if (recentOrder) {
              await db.prepare(
                `UPDATE carts SET reminder_count = ?, reminder_sent_at = datetime('now') WHERE id = ?`
              ).bind(maxReminders, cart.id).run();
              continue;
            }

            const customer = await db.prepare(
              `SELECT name, email, phone FROM site_customers WHERE id = ? AND site_id = ?`
            ).bind(cart.user_id, cart.site_id).first();

            if (!customer) continue;
            if (!customer.email && !customer.phone) continue;

            let items = [];
            try {
              items = typeof cart.items === 'string' ? JSON.parse(cart.items) : cart.items;
            } catch (e) { continue; }
            if (!Array.isArray(items) || items.length === 0) continue;

            const enrichedItems = [];
            for (const item of items) {
              const product = await db.prepare(
                'SELECT name, price FROM products WHERE id = ? AND site_id = ?'
              ).bind(item.productId, cart.site_id).first();
              enrichedItems.push({
                name: item.name || product?.name || 'Product',
                price: item.price || product?.price || 0,
                quantity: item.quantity || 1,
              });
            }

            const cartTotal = cart.subtotal || enrichedItems.reduce((sum, item) =>
              sum + (Number(item.price) * Number(item.quantity)), 0);

            const itemsSummary = enrichedItems.slice(0, 5).map(item =>
              `${item.name} x${item.quantity}`
            ).join('\n');

            let emailSent = false;
            let whatsappSent = false;

            if (sendEmailChannel && customer.email) {
              try {
                const emailContent = buildAbandonedCartEmail(
                  customer.name, brandName, enrichedItems, cartTotal, storeUrl, currency
                );
                const result = await sendEmail(
                  env, customer.email,
                  `You left items in your cart - ${brandName}`,
                  emailContent.html, emailContent.text
                );
                emailSent = result === true;
              } catch (emailErr) {
                console.error(`[AbandonedCart] Email error for cart ${cart.id}:`, emailErr.message || emailErr);
              }
            }

            if (sendWhatsApp && customer.phone && isWhatsAppConfigured(settings)) {
              try {
                const waMessage = buildAbandonedCartWA(
                  customer.name, brandName, itemsSummary, cartTotal, storeUrl, currency
                );
                const result = await sendOrderWhatsApp(settings, customer.phone, waMessage);
                whatsappSent = result?.success === true;
              } catch (waErr) {
                console.error(`[AbandonedCart] WhatsApp error for cart ${cart.id}:`, waErr.message || waErr);
              }
            }

            if (emailSent || whatsappSent) {
              await db.prepare(
                `UPDATE carts SET reminder_count = ?, reminder_sent_at = datetime('now') WHERE id = ?`
              ).bind(currentReminderCount + 1, cart.id).run();
              console.log(`[AbandonedCart] Reminder #${currentReminderCount + 1} sent for cart ${cart.id} (email: ${emailSent}, whatsapp: ${whatsappSent})`);
            }
          } catch (cartErr) {
            console.error(`[AbandonedCart] Error processing cart ${cart.id}:`, cartErr.message || cartErr);
          }
        }
      } catch (siteErr) {
        console.error(`[AbandonedCart] Error for site ${site.id}:`, siteErr.message || siteErr);
      }
    }

    console.log('[AbandonedCart] Processing complete');
  } catch (error) {
    console.error('[AbandonedCart] Error:', error.message || error);
  }
}
