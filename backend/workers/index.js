import { handleAuth } from './platform/auth-worker.js';
import { handleSites } from './platform/sites-worker.js';
import { handleProducts } from './storefront/products-worker.js';
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
import { handleUsageAPI } from '../utils/usage-tracker.js';
import { jsonResponse, errorResponse, corsHeaders, handleCORS } from '../utils/helpers.js';
import { ensureTablesExist } from '../utils/db-init.js';
import { resolveSiteDBById } from '../utils/site-db.js';

export default {
  async fetch(request, env, ctx) {
    const corsResponse = handleCORS(request);
    if (corsResponse) return corsResponse;

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      await ensureTablesExist(env);

      if (path.startsWith('/api/')) {
        return handleAPI(request, env, path);
      }

      if (path.startsWith('/auth/google/')) {
        return handleGoogleAuthFlow(request, env, path);
      }

      const siteResponse = await handleSiteRouting(request, env);
      if (siteResponse) {
        return siteResponse;
      }

      const hostname = url.hostname;
      if (hostname === 'www.fluxe.in' || hostname === 'fluxe.in') {
        const pagesHostname = env.PAGES_HOSTNAME || 'fluxe-8x1.pages.dev';
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
  },
};

async function handleAPI(request, env, path) {
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
      return handleSites(request, env, path);

    case 'products':
      return handleProducts(request, env, path);

    case 'orders':
      return handleOrders(request, env, path);

    case 'cart':
      return handleCart(request, env, path);

    case 'wishlist':
      return handleWishlist(request, env, path);

    case 'payments':
      return handlePayments(request, env, path);

    case 'email':
      return handleEmail(request, env, path);

    case 'categories':
      return handleCategories(request, env, path);

    case 'users':
      return handleUsers(request, env, path);

    case 'admin':
      return handleAdmin(request, env, path);

    case 'site-admin':
      return handleSiteAdmin(request, env, path);

    case 'customer-auth':
      return handleCustomerAuth(request, env, path);

    case 'upload':
      return handleUpload(request, env, path);

    case 'analytics':
      return handleAnalytics(request, env, path);

    case 'notifications':
      return handleNotifications(request, env, path);

    case 'usage':
      return handleUsageAPI(request, env, path);

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
                s.custom_domain, s.domain_status, s.domain_verification_token
         FROM sites s 
         WHERE LOWER(s.subdomain) = LOWER(?) AND s.is_active = 1`
      ).bind(subdomain).first();
    } else if (!hostname.endsWith('fluxe.in') && !hostname.endsWith('pages.dev') && !hostname.includes('localhost') && !hostname.includes('workers.dev')) {
      siteRow = await env.DB.prepare(
        `SELECT s.id, s.subdomain, s.brand_name, s.template_id,
                s.custom_domain, s.domain_status, s.domain_verification_token
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

    const { razorpayKeySecret, adminVerificationCode, ...publicSettings } = settings;

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

    return jsonResponse({
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
    });
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
    const domain = env.DOMAIN || 'fluxe.in';

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Sign in with Google - Fluxe</title>
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

    console.log('[Cleanup] Expired sessions and tokens cleaned up successfully');
  } catch (error) {
    console.error('[Cleanup] Error during cleanup:', error);
  }
}
