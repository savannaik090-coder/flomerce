import { handleAuth } from './platform/auth-worker.js';
import { handleSites } from './platform/sites-worker.js';
import { handleTranslateProxy, handleTranslateCachePurge } from './storefront/translate-worker.js';
import { handleTranslationsBundle, TRANSLATIONS_MANIFEST_HASH } from './storefront/translations-bundle.js';
import { handleProducts, updateProductStock } from './storefront/products-worker.js';
import { handleOrders } from './storefront/orders-worker.js';
import { handleShipping, handleShiprocketWebhook } from './storefront/shipping-worker.js';
import { handleCart, mergeCarts, clearCart } from './storefront/cart-worker.js';
import { handleWishlist } from './storefront/wishlist-worker.js';
import { handlePayments, activateSubscription, handleStorefrontRazorpayWebhook } from './platform/payments-worker.js';
import { handleEmail } from './platform/email-worker.js';
import { handleCategories } from './storefront/categories-worker.js';
import { handleUsers } from './platform/users-worker.js';
import { handleSiteRouting, resolveSiteFromRequest } from './site-router.js';
import { handleAdmin, runMonthlyEnterpriseSnapshots } from './platform/admin-worker.js';
import { handleI18nPublic } from './platform/i18n-worker.js';
import { handleBilling } from './platform/billing-worker.js';
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
import { translateContentBatch, isTargetSupported } from '../utils/server-translator.js';
import { translateLabels } from '../utils/email-i18n.js';

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
        const isHTMLShell = pagesUrl.pathname === '/' ||
          pagesUrl.pathname.endsWith('/') ||
          pagesUrl.pathname.endsWith('.html') ||
          !pagesUrl.pathname.includes('.');
        return fetch(pagesRequest, isHTMLShell
          ? { cf: { cacheTtl: 0, cacheEverything: false } }
          : undefined);
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
    // Cloudflare delivers a separate scheduled event for each registered cron
    // pattern, with `event.cron` set to the matching expression. We dispatch
    // off that so each job keeps its own cadence — abandoned-cart reminders
    // run hourly (so a merchant's "1 hour delay" actually means ~1 hour), but
    // the daily cleanup and monthly snapshot do NOT run hourly.
    const cron = event && event.cron;

    if (cron === '0 * * * *') {
      // Hourly: abandoned-cart sweep only. The processor itself respects each
      // merchant's configured delayHours / maxReminders, so running hourly
      // does not over-send.
      ctx.waitUntil(
        processAbandonedCartReminders(env).catch(err =>
          console.error('[Cron] processAbandonedCartReminders failed:', err.message || err)
        )
      );
      return;
    }

    if (cron === '0 3 * * *') {
      // Daily cleanups (3 AM UTC).
      ctx.waitUntil(cleanupExpiredData(env));
      ctx.waitUntil(cleanupOrphanMedia(env));
      return;
    }

    if (cron === '5 0 1 * *') {
      // Monthly enterprise overage snapshot (00:05 UTC on the 1st).
      ctx.waitUntil(
        runMonthlyEnterpriseSnapshots(env).catch(err =>
          console.error('[Cron] runMonthlyEnterpriseSnapshots failed:', err.message || err)
        )
      );
      return;
    }

    // Unknown cron expression — fall back to the conservative daily set so a
    // misconfigured trigger never silently drops scheduled work.
    console.warn(`[Cron] Unknown cron "${cron}" — running daily cleanups as a fallback`);
    ctx.waitUntil(cleanupExpiredData(env));
    ctx.waitUntil(cleanupOrphanMedia(env));
  },
};

// Sweeps R2 for files that have no matching row in `site_media`.
// These come from edge cases the frontend deferred-delete hook can't catch
// (worker died after R2 put but before D1 insert, network drops on cleanup,
// pre-fix legacy uploads). Only objects older than the safety window are
// touched so an in-flight upload that hasn't been recorded yet is never
// killed mid-flight.
//
// Defense in depth — a candidate orphan is only deleted if ALL hold:
//   1. It lives under the site's own R2 prefix (sites/<id>/...).
//   2. It has no row in platform `site_media`.
//   3. It is not referenced anywhere in the site's shard DB
//      (categories, products, site_config, blog_posts, page_seo, ...).
//   4. It is older than SAFETY_WINDOW_MS.
//   5. The kill-switch flag is not set.
//   6. The site is not currently locked for migration.
//
// Per-site D1 cost: ~3 small reads (site_media, system_flags is global,
// shard URL bulk-fetch is one batch). Per-day cost is negligible.
async function cleanupOrphanMedia(env) {
  if (!env.STORAGE || !env.DB) return;

  // Kill switch — set system_flags.orphan_cleanup_enabled='false' to disable.
  try {
    const flag = await env.DB.prepare(
      "SELECT value FROM system_flags WHERE key = 'orphan_cleanup_enabled'"
    ).first();
    if (flag && String(flag.value).toLowerCase() === 'false') {
      console.log('[OrphanCleanup] disabled via system_flags kill switch — skipping run');
      return;
    }
  } catch {
    // Table missing or unreadable → fall through (default: enabled).
  }

  const SAFETY_WINDOW_MS = 24 * 60 * 60 * 1000;
  const MAX_KEYS_PER_SITE = 2000;
  const MAX_DELETES_PER_SITE = 500;
  const cutoff = Date.now() - SAFETY_WINDOW_MS;
  let totalDeleted = 0;

  try {
    // Pull each site with its shard binding so we can also scan shard tables.
    const allSites = await env.DB.prepare(
      `SELECT s.id, s.migration_locked,
              COALESCE(sh.binding_name, s.d1_binding_name) AS binding_name
       FROM sites s
       LEFT JOIN shards sh ON s.shard_id = sh.id`
    ).all();

    for (const site of (allSites.results || [])) {
      // Never touch a site mid-migration — its DBs/URLs may be in transit.
      if (site.migration_locked) continue;

      try {
        // (a) Known keys recorded in platform site_media.
        const knownRes = await env.DB.prepare(
          'SELECT storage_key FROM site_media WHERE site_id = ?'
        ).bind(site.id).all();
        const knownKeys = new Set((knownRes.results || []).map(r => r.storage_key));

        // (b) Belt-and-suspenders: also collect every storage_key actually
        // referenced in the site's shard DB. Even if site_media is wrong
        // (corrupted, stale, mid-migration), a key still referenced in any
        // content table will never be deleted.
        const shardDB = site.binding_name ? env[site.binding_name] : null;
        if (shardDB) {
          try {
            const referenced = await collectReferencedStorageKeys(shardDB, site.id);
            for (const k of referenced) knownKeys.add(k);
          } catch (refErr) {
            // If we cannot read the shard DB, fail SAFE: skip this site
            // entirely rather than risk nuking referenced files.
            console.error(`[OrphanCleanup] shard read failed for site ${site.id}, skipping site:`, refErr.message || refErr);
            continue;
          }
        } else {
          // No shard binding resolvable for this site — also fail safe.
          console.error(`[OrphanCleanup] no shard binding for site ${site.id}, skipping site`);
          continue;
        }

        const prefix = `sites/${site.id}/`;
        let cursor = undefined;
        let scanned = 0;
        const orphans = [];

        while (scanned < MAX_KEYS_PER_SITE && orphans.length < MAX_DELETES_PER_SITE) {
          const listing = await env.STORAGE.list({ prefix, cursor, limit: 200 });
          for (const obj of listing.objects || []) {
            scanned++;
            if (knownKeys.has(obj.key)) continue;
            // Safety: if we can't determine the upload time, never delete.
            // Better to leak storage than to nuke a legitimate file.
            const uploadedMs = obj.uploaded ? new Date(obj.uploaded).getTime() : NaN;
            if (!Number.isFinite(uploadedMs) || uploadedMs <= 0) continue;
            if (uploadedMs > cutoff) continue;
            orphans.push(obj.key);
            if (orphans.length >= MAX_DELETES_PER_SITE) break;
          }
          if (!listing.truncated) break;
          cursor = listing.cursor;
        }

        for (const key of orphans) {
          try {
            // TOCTOU guard: between the reference scan and now the admin may
            // have re-attached this key (e.g. saved a draft that re-uses it).
            // One last targeted check against site_media closes most of that
            // window for cheap.
            const stillReferenced = await env.DB.prepare(
              'SELECT 1 FROM site_media WHERE storage_key = ? LIMIT 1'
            ).bind(key).first();
            if (stillReferenced) continue;

            await env.STORAGE.delete(key);
            totalDeleted++;
          } catch (delErr) {
            console.error(`[OrphanCleanup] delete ${key}:`, delErr.message || delErr);
          }
        }

        if (orphans.length > 0) {
          console.log(`[OrphanCleanup] site ${site.id}: scanned ${scanned}, deleted ${orphans.length} orphan objects`);
        }
      } catch (siteErr) {
        console.error(`[OrphanCleanup] site ${site.id}:`, siteErr.message || siteErr);
      }
    }
    if (totalDeleted > 0) {
      console.log(`[OrphanCleanup] total deleted across all sites: ${totalDeleted}`);
    }
  } catch (e) {
    console.error('[OrphanCleanup] fatal:', e.message || e);
  }
}

// Pulls every URL/JSON-array column that may hold an upload reference from
// the site's shard DB and extracts the underlying R2 storage_key from each.
// Returns a Set of storage_key strings.
async function collectReferencedStorageKeys(shardDB, siteId) {
  // Each entry: SQL that returns one column of TEXT (URL or JSON array of URLs).
  // Wrapped in try/catch per query so a missing column on an older shard
  // never aborts the whole sweep.
  const queries = [
    // Single-URL columns
    { sql: 'SELECT image_url AS v FROM categories WHERE site_id = ?', json: false },
    { sql: 'SELECT seo_og_image AS v FROM categories WHERE site_id = ?', json: false },
    { sql: 'SELECT thumbnail_url AS v FROM products WHERE site_id = ?', json: false },
    { sql: 'SELECT seo_og_image AS v FROM products WHERE site_id = ?', json: false },
    { sql: 'SELECT image_url AS v FROM product_variants WHERE product_id IN (SELECT id FROM products WHERE site_id = ?)', json: false },
    { sql: 'SELECT seo_og_image AS v FROM page_seo WHERE site_id = ?', json: false },
    { sql: 'SELECT logo_url AS v FROM site_config WHERE site_id = ?', json: false },
    { sql: 'SELECT favicon_url AS v FROM site_config WHERE site_id = ?', json: false },
    { sql: 'SELECT seo_og_image AS v FROM site_config WHERE site_id = ?', json: false },
    { sql: 'SELECT og_image AS v FROM site_config WHERE site_id = ?', json: false },
    { sql: 'SELECT twitter_image AS v FROM site_config WHERE site_id = ?', json: false },
    { sql: 'SELECT cover_image AS v FROM blog_posts WHERE site_id = ?', json: false },
    { sql: 'SELECT featured_image AS v FROM blog_posts WHERE site_id = ?', json: false },
    { sql: 'SELECT seo_og_image AS v FROM blog_posts WHERE site_id = ?', json: false },
    // Free-text/HTML/JSON columns that may embed uploaded image URLs.
    // blog_posts.content is HTML — can contain <img src="/api/upload/...">.
    // orders.items / guest_orders.items are JSON line items with persisted
    // product thumbnails for historical invoice/order rendering.
    { sql: 'SELECT content AS v FROM blog_posts WHERE site_id = ?', json: false },
    { sql: 'SELECT items AS v FROM orders WHERE site_id = ?', json: false },
    { sql: 'SELECT items AS v FROM guest_orders WHERE site_id = ?', json: false },
    // JSON-array columns (TEXT holding a JSON list of URLs)
    { sql: 'SELECT images AS v FROM products WHERE site_id = ?', json: true },
    { sql: 'SELECT images AS v FROM reviews WHERE site_id = ?', json: true },
    { sql: 'SELECT photos AS v FROM return_requests WHERE site_id = ?', json: true },
    // site_config.settings is JSON; scan it as text for any embedded keys.
    { sql: 'SELECT settings AS v FROM site_config WHERE site_id = ?', json: false },
  ];

  const keys = new Set();
  for (const q of queries) {
    try {
      const rows = await shardDB.prepare(q.sql).bind(siteId).all();
      for (const row of (rows.results || [])) {
        const raw = row.v;
        if (!raw) continue;
        if (q.json) {
          try {
            const arr = JSON.parse(raw);
            if (Array.isArray(arr)) {
              for (const item of arr) addKeysFromValue(item, keys);
            } else {
              addKeysFromValue(raw, keys);
            }
          } catch {
            // Not valid JSON — fall back to raw scan.
            addKeysFromValue(raw, keys);
          }
        } else {
          addKeysFromValue(raw, keys);
        }
      }
    } catch {
      // Column or table missing on this shard — ignore and continue.
    }
  }
  return keys;
}

// Extracts every storage_key (sites/<id>/...) found inside a value, whether
// the value is a `/api/upload/image?key=...` URL, a raw key, or a JSON blob
// (or HTML) containing one of the above somewhere inside it.
function addKeysFromValue(value, outSet) {
  if (value == null) return;
  const s = typeof value === 'string' ? value : String(value);
  if (!s) return;

  const add = raw => {
    if (!raw) return;
    // Strip trailing punctuation that commonly appears in HTML/markdown/JSON
    // contexts (e.g. `sites/.../foo.jpg).` or `sites/.../foo.jpg",`).
    let key = raw.replace(/[)\]},.;:!?'"`>]+$/g, '');
    if (key.startsWith('sites/')) outSet.add(key);
  };

  // 1. `key=<...>` query param. Try repeated decoding to handle double-encoded
  // values that can occur when URLs are nested in JSON strings.
  const keyParam = /[?&]key=([^&"'\s]+)/g;
  let m;
  while ((m = keyParam.exec(s)) !== null) {
    let candidate = m[1];
    for (let i = 0; i < 3; i++) {
      try {
        const decoded = decodeURIComponent(candidate);
        if (decoded === candidate) break;
        candidate = decoded;
      } catch { break; }
    }
    add(candidate);
  }

  // 2. Raw `sites/<id>/...` references anywhere in the string. The character
  // class excludes URL/JSON/HTML separators; trailing punctuation is then
  // stripped by `add()`.
  const rawKey = /sites\/[A-Za-z0-9_-]+\/[^\s"'<>?&\\]+/g;
  while ((m = rawKey.exec(s)) !== null) {
    add(m[0]);
  }
}

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

    case 'webhooks':
      // Per-tenant Razorpay webhook (Setup B — merchant uses own Razorpay):
      // /api/webhooks/razorpay/:siteId
      if (pathParts[2] === 'razorpay' && pathParts[3]) {
        return handleStorefrontRazorpayWebhook(request, env, pathParts[3], ctx);
      }
      // Alias for the platform's global Razorpay webhook URL (subscriptions
      // and overage payments): /api/webhooks/razorpay → /api/payments/webhook
      if (pathParts[2] === 'razorpay') {
        return handlePayments(request, env, '/api/payments/webhook', ctx);
      }
      // Per-tenant Shiprocket webhook: /api/webhooks/shiprocket/:siteId
      if (pathParts[2] === 'shiprocket') {
        return handleShiprocketWebhook(request, env, path);
      }
      return errorResponse('Not found', 404);

    case 'shipping':
      return handleShipping(request, env, path, ctx);

    case 'billing':
      return handleBilling(request, env, path, ctx);

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

    case 'storefront':
      // Public storefront-scoped subresources. Currently only the per-site
      // shopper translation proxy lives here (System B). The proxy itself
      // enforces all auth/rate/feature checks.
      if (pathParts[3] === 'translate') {
        if (pathParts[4] === 'purge') {
          return handleTranslateCachePurge(request, env, path, ctx);
        }
        return handleTranslateProxy(request, env, path, ctx);
      }
      if (pathParts[3] === 'translations') {
        return handleTranslationsBundle(request, env, path, ctx);
      }
      return errorResponse('Not found', 404);

    case 'i18n':
      return handleI18nPublic(request, env, path, ctx);

    case 'manifest':
      return handlePWAManifest(request, env);

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
  const lang = url.searchParams.get('lang');

  let siteRow = null;

  try {
    if (subdomain) {
      siteRow = await env.DB.prepare(
        `SELECT s.id, s.subdomain, s.brand_name, s.template_id,
                s.custom_domain, s.domain_status, s.domain_verification_token,
                s.subscription_plan, s.content_language,
                s.translator_enabled, s.translator_languages
         FROM sites s 
         WHERE LOWER(s.subdomain) = LOWER(?) AND s.is_active = 1`
      ).bind(subdomain).first();
    } else if (!hostname.endsWith(env.DOMAIN || PLATFORM_DOMAIN) && !hostname.endsWith('pages.dev') && !hostname.includes('localhost') && !hostname.includes('workers.dev')) {
      siteRow = await env.DB.prepare(
        `SELECT s.id, s.subdomain, s.brand_name, s.template_id,
                s.custom_domain, s.domain_status, s.domain_verification_token,
                s.subscription_plan, s.content_language,
                s.translator_enabled, s.translator_languages
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

    const { razorpayKeySecret, adminVerificationCode, whatsappAccessToken, whatsappApiKey, whatsappPhoneNumberId, shiprocket: _shiprocketRaw, ...publicSettings } = settings;
    // Public storefront only needs to know if Shiprocket is enabled; never
    // expose encrypted credentials, the long-lived token, or the webhook key.
    if (_shiprocketRaw && typeof _shiprocketRaw === 'object') {
      publicSettings.shiprocketEnabled = !!_shiprocketRaw.enabled;
    }

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

    const responseData = {
      ...site,
      socialLinks,
      settings: publicSettings,
      categories: categoriesResult,
      pageSEO,
      googleClientId,
      vapidPublicKey,
      // Bundle URL cache-buster for the storefront's pre-translated chrome
      // bundle. Embeds the manifest hash (bumped on every code deploy that
      // adds a literal) plus the merchant's translator config (so toggling
      // off / changing allowed-languages invalidates immediately).
      translationsBundleVersion: TRANSLATIONS_MANIFEST_HASH +
        '.' + (site.translator_enabled ? '1' : '0'),
    };

    if (lang && site.id) {
      try {
        const supported = await isTargetSupported(env, site.id, lang);
        if (supported.ok) {
          await translateSiteInfoInPlace(env, site.id, lang, responseData);
        }
      } catch (e) {
        console.error('[site] translation skipped:', e.message || e);
      }
    }

    return cachedJsonResponse({
      success: true,
      data: responseData,
    }, 200, request);
  } catch (error) {
    console.error('Get site info error:', error);
    return errorResponse('Failed to fetch site info: ' + error.message, 500);
  }
}

// Returns a translated PWA Web App Manifest JSON for the resolved site.
// Reads ?subdomain= (preferred) or resolves by hostname; ?lang= chooses target.
// Translation failures are swallowed — manifest must always serve.
async function handlePWAManifest(request, env) {
  const url = new URL(request.url);
  const hostname = url.hostname;
  const subdomain = url.searchParams.get('subdomain');
  const lang = url.searchParams.get('lang');

  let siteRow = null;
  try {
    if (subdomain) {
      siteRow = await env.DB.prepare(
        `SELECT s.id, s.subdomain, s.brand_name, s.template_id, s.content_language
         FROM sites s WHERE LOWER(s.subdomain) = LOWER(?) AND s.is_active = 1`
      ).bind(subdomain).first();
    } else if (!hostname.endsWith(env.DOMAIN || PLATFORM_DOMAIN) && !hostname.endsWith('pages.dev') && !hostname.includes('localhost') && !hostname.includes('workers.dev')) {
      siteRow = await env.DB.prepare(
        `SELECT s.id, s.subdomain, s.brand_name, s.template_id, s.content_language
         FROM sites s WHERE s.custom_domain = ? AND s.domain_status = 'verified' AND s.is_active = 1`
      ).bind(hostname.toLowerCase()).first();
    }
  } catch (e) {
    console.error('[manifest] site lookup failed:', e?.message || e);
  }

  const brandName = siteRow?.brand_name || 'Store';
  let description = `${brandName} — online store`;
  let themeColor = '#000000';
  let backgroundColor = '#ffffff';
  let iconUrl = null;
  try {
    if (siteRow?.id) {
      const siteDB = await resolveSiteDBById(env, siteRow.id);
      const cfg = await siteDB.prepare('SELECT settings, logo_url FROM site_config WHERE site_id = ?').bind(siteRow.id).first();
      if (cfg) {
        if (cfg.logo_url) iconUrl = cfg.logo_url;
        let settings = {};
        try { settings = typeof cfg.settings === 'string' ? JSON.parse(cfg.settings) : (cfg.settings || {}); } catch {}
        if (typeof settings.tagline === 'string' && settings.tagline) description = settings.tagline;
        if (typeof settings.themeColor === 'string') themeColor = settings.themeColor;
        if (typeof settings.backgroundColor === 'string') backgroundColor = settings.backgroundColor;
      }
    }
  } catch (e) {
    console.error('[manifest] config lookup failed:', e?.message || e);
  }

  let nameOut = brandName;
  let shortOut = brandName.length > 12 ? brandName.slice(0, 12) : brandName;
  let descOut = description;
  if (lang && siteRow?.id) {
    try {
      const supported = await isTargetSupported(env, siteRow.id, lang);
      if (supported.ok) {
        const t = await translateLabels(env, siteRow.id, lang, {
          name: brandName,
          short_name: shortOut,
          description,
        });
        nameOut = t.name || nameOut;
        shortOut = t.short_name || shortOut;
        descOut = t.description || descOut;
      }
    } catch (e) {
      console.error('[manifest] translate skipped:', e?.message || e);
    }
  }

  const manifest = {
    name: nameOut,
    short_name: shortOut,
    description: descOut,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    theme_color: themeColor,
    background_color: backgroundColor,
    lang: lang || siteRow?.content_language || 'en',
    icons: iconUrl
      ? [
          { src: iconUrl, sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: iconUrl, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ]
      : [],
    categories: ['shopping'],
  };

  return new Response(JSON.stringify(manifest), {
    status: 200,
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      ...corsHeaders(request),
    },
  });
}

// Translates the merchant-facing strings on the /api/site payload in place.
// Covers: brand name, every translatable string leaf in settings (hero slides,
// reviews, watch-and-buy titles, brand story, section headers, etc.),
// recursive categories (name/description/subtitle), and pageSEO entries
// (seo_title/seo_description).
// Errors are swallowed — translation failure must never break /api/site.
async function translateSiteInfoInPlace(env, siteId, lang, data) {
  const slots = [];

  // brand_name is intentionally NOT translated. Brand names are proper nouns
  // (logos, packaging, social handles all use the original spelling) and
  // machine translators routinely mangle short brand strings. If a merchant
  // wants a localized brand label they can override per-language settings.

  // Deep-walk settings JSON, collecting every text-bearing leaf.
  // Keys whose name (case-insensitive) matches a known translatable
  // suffix get translated; keys that are clearly identifiers,
  // URLs, codes, contact details, or technical config are skipped.
  if (data.settings && typeof data.settings === 'object') {
    walkTranslatableLeaves(data.settings, slots);
  }

  function walkCats(cats) {
    if (!Array.isArray(cats)) return;
    for (const c of cats) {
      if (!c || typeof c !== 'object') continue;
      if (typeof c.name === 'string' && c.name) slots.push({ ref: c, key: 'name', value: c.name });
      if (typeof c.description === 'string' && c.description) slots.push({ ref: c, key: 'description', value: c.description });
      if (typeof c.subtitle === 'string' && c.subtitle) slots.push({ ref: c, key: 'subtitle', value: c.subtitle });
      if (Array.isArray(c.children)) walkCats(c.children);
    }
  }
  walkCats(data.categories);

  if (data.pageSEO && typeof data.pageSEO === 'object') {
    for (const key of Object.keys(data.pageSEO)) {
      const ps = data.pageSEO[key];
      if (!ps || typeof ps !== 'object') continue;
      if (typeof ps.seo_title === 'string' && ps.seo_title) slots.push({ ref: ps, key: 'seo_title', value: ps.seo_title });
      if (typeof ps.seo_description === 'string' && ps.seo_description) slots.push({ ref: ps, key: 'seo_description', value: ps.seo_description });
    }
  }

  if (slots.length === 0) return;

  const result = await translateContentBatch(env, siteId, slots.map((s) => s.value), lang);
  const translations = result.translations;
  for (let i = 0; i < slots.length; i++) {
    const t = translations[i];
    if (t === undefined || t === null) continue;
    try { slots[i].ref[slots[i].key] = t; } catch (e) {
      console.error('[site] splice failed:', slots[i].key, e.message || e);
    }
  }
}

// Keys whose value is human-readable copy that should be translated.
// We accept either an exact match (lowercased) or a suffix match so that
// composite keys like `reviewsSectionTitle` or `brandStoryHeadline` are
// caught alongside short keys like `title`, `text`, `name`.
const TRANSLATABLE_SUFFIXES = [
  'title', 'subtitle', 'description', 'headline', 'tagline', 'about',
  'caption', 'label', 'buttontext', 'ctatext', 'ctalabel', 'message',
  'messages', 'heading', 'body', 'copyright', 'text', 'name', 'role',
  'content', 'placeholder', 'tooltip', 'banner', 'banners', 'note',
  'notes', 'hours', 'address',
  // FAQ items + image alt text on merchant-defined sections.
  'question', 'answer', 'alt', 'summary',
];
// Substrings that, when present in the key (case-insensitive), force the
// field to be skipped — these keys carry URLs, identifiers, contact
// details, codes, or visual config that must never be sent to translation.
const NON_TRANSLATABLE_KEY_PARTS = [
  'url', 'link', 'href', 'src', 'image', 'img', 'logo', 'icon', 'video',
  'email', 'phone', 'sku', 'hash', 'token', 'secret', 'password',
  'color', 'hex', 'currency', 'timezone', 'gst', 'razorpay',
  'provider', 'slug', 'class', 'style',
];

function isTranslatableKey(key) {
  if (typeof key !== 'string' || !key) return false;
  const k = key.toLowerCase();
  if (k === 'id' || k.endsWith('id') || k.endsWith('ids')) return false;
  for (const bad of NON_TRANSLATABLE_KEY_PARTS) {
    if (k.includes(bad)) return false;
  }
  for (const ok of TRANSLATABLE_SUFFIXES) {
    if (k === ok || k.endsWith(ok)) return true;
  }
  return false;
}

function isTranslatableValue(v) {
  if (typeof v !== 'string') return false;
  if (v.length === 0 || v.length > 2000) return false;
  if (/^https?:\/\//i.test(v)) return false;
  if (/^\/[a-z0-9_\-/.]/i.test(v)) return false;
  if (/^data:/i.test(v)) return false;
  if (/^#[0-9a-f]{3,8}$/i.test(v)) return false;
  if (/^[\d\s.,+\-]+$/.test(v)) return false;
  if (/^[a-z0-9._%+\-]+@[a-z0-9.\-]+$/i.test(v)) return false;
  // Require at least one alphabetic character (covers Latin, Devanagari,
  // CJK, Cyrillic, Arabic, etc).
  if (!/[\p{L}]/u.test(v)) return false;
  return true;
}

function walkTranslatableLeaves(node, slots, depth = 0, parentKey = null) {
  if (depth > 8) return;
  if (Array.isArray(node)) {
    const arrayItemsAreTranslatable = parentKey && isTranslatableKey(parentKey);
    for (let i = 0; i < node.length; i++) {
      const item = node[i];
      if (typeof item === 'string') {
        // Plain-string array elements (e.g. settings.promoBanner = ['msg1', 'msg2'])
        // inherit translatability from the array's parent key.
        if (arrayItemsAreTranslatable && isTranslatableValue(item)) {
          slots.push({ ref: node, key: i, value: item });
        }
      } else if (item && typeof item === 'object') {
        walkTranslatableLeaves(item, slots, depth + 1, parentKey);
      }
    }
    return;
  }
  if (!node || typeof node !== 'object') return;
  for (const [k, v] of Object.entries(node)) {
    if (typeof v === 'string') {
      if (isTranslatableKey(k) && isTranslatableValue(v)) {
        slots.push({ ref: node, key: k, value: v });
      }
    } else if (v && typeof v === 'object') {
      walkTranslatableLeaves(v, slots, depth + 1, k);
    }
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

    // 2) Clear cached paid plan on sites that have no effectively-active subscription.
    // (Trial handled below.) "Effectively active" includes:
    //   - status='active'  or 'scheduled'                       (normal cases)
    //   - status='cancelled' AND current_period_end is in future (user cancelled but
    //     already paid through the end of the period — must keep access)
    //   - status='paused'    AND current_period_end is in future (Razorpay paused the
    //     auto-renewal but the current paid period is still valid)
    // Race protection: only clear rows that haven't been touched in the last 5 minutes
    // so in-flight transitions (cancel old -> insert new) aren't wiped mid-flight.
    try {
      await env.DB.prepare(
        `UPDATE sites SET subscription_plan = NULL, subscription_expires_at = NULL, updated_at = datetime('now')
         WHERE COALESCE(subscription_plan, '') NOT IN ('enterprise', '', 'trial')
           AND (updated_at IS NULL OR datetime(updated_at) < datetime('now', '-5 minutes'))
           AND NOT EXISTS (
             SELECT 1 FROM subscriptions s
             WHERE s.site_id = sites.id
               AND (
                 s.status IN ('active', 'scheduled')
                 OR (
                   s.status IN ('cancelled', 'paused')
                   AND s.current_period_end IS NOT NULL
                   AND datetime(s.current_period_end) > datetime('now')
                 )
               )
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

  // Single, loud, run-level warning when email is misconfigured. Without this
  // every cart fails silently inside sendEmail() and the only signal is missing
  // emails — which is exactly how this bug went undetected.
  const brevoConfigured = !!(env.BREVO_API_KEY && String(env.BREVO_API_KEY).trim());
  const fromEmailConfigured = !!(env.FROM_EMAIL && String(env.FROM_EMAIL).trim());
  if (!brevoConfigured || !fromEmailConfigured) {
    console.warn(
      `[AbandonedCart] Email misconfigured — emails will be skipped this run. ` +
      `BREVO_API_KEY=${brevoConfigured ? 'set' : 'MISSING'}, ` +
      `FROM_EMAIL=${fromEmailConfigured ? 'set' : 'MISSING'}. ` +
      `Set them via wrangler secret/vars to enable abandoned-cart email reminders.`
    );
  }

  // Run-level totals — printed once at the end so production logs surface a
  // single concise summary even when many sites are processed.
  const runSummary = {
    sitesScanned: 0,
    // Split so a merchant who turned the feature off is distinguishable from
    // one whose settings row simply doesn't exist yet — different remediation.
    sitesFeatureDisabled: 0,
    sitesNoSettings: 0,
    sitesWithCandidates: 0,
    candidates: 0,
    emailsSent: 0,
    whatsappSent: 0,
    skipped: {
      backoff: 0,
      recent_order: 0,
      no_contact: 0,
      no_customer: 0,
      empty_items: 0,
      parse_error: 0,
      no_channel_dispatched: 0,
      // Carts that have already received the merchant's configured maxReminders
      // are filtered out by the candidate-selection SQL (so they never enter
      // the per-cart loop). We count them here from a separate cheap query so
      // operators can still see "the job is healthy, these carts are simply
      // done" rather than wondering why nothing fired.
      max_reminders_reached: 0,
    },
    errors: 0,
  };

  try {
    const allSites = await env.DB.prepare('SELECT id, brand_name, subdomain, custom_domain, domain_status FROM sites WHERE is_active = 1').all();

    for (const site of (allSites.results || [])) {
      runSummary.sitesScanned++;
      try {
        const db = await resolveSiteDBById(env, site.id);
        const siteConfig = await getSiteConfig(env, site.id);
        if (!siteConfig.settings) { runSummary.sitesNoSettings++; continue; }

        let settings = siteConfig.settings;
        if (typeof settings === 'string') settings = JSON.parse(settings);

        const acConfig = settings.abandonedCartConfig;
        if (!acConfig || !acConfig.enabled) { runSummary.sitesFeatureDisabled++; continue; }

        const delayHours = Number(acConfig.delayHours) || 1;
        const maxReminders = Number(acConfig.maxReminders) || 1;
        const sendWhatsApp = acConfig.whatsapp !== false;
        const sendEmailChannel = acConfig.email !== false;

        // Per-site counters — printed once per site so a merchant's cart
        // funnel is debuggable from production logs.
        const siteStats = {
          candidates: 0,
          emailsSent: 0,
          whatsappSent: 0,
          skipped_backoff: 0,
          skipped_recent_order: 0,
          skipped_no_contact: 0,
          skipped_no_customer: 0,
          skipped_empty_items: 0,
          skipped_parse_error: 0,
          skipped_no_channel_dispatched: 0,
          skipped_max_reminders_reached: 0,
          errors: 0,
        };

        try {
          await db.prepare('ALTER TABLE carts ADD COLUMN reminder_sent_at TEXT').run();
        } catch (e) {}
        try {
          await db.prepare('ALTER TABLE carts ADD COLUMN reminder_count INTEGER DEFAULT 0').run();
        } catch (e) {}

        // Cheap aggregate count of carts that already received maxReminders
        // — these are filtered out of the candidate query, so without this
        // separate count an operator looking at a quiet log would have no
        // way to know "0 sent" means "all eligible carts are already done"
        // vs. "the job is broken". Failure here is non-fatal; counter stays 0.
        try {
          const maxedRow = await db.prepare(
            `SELECT COUNT(*) AS n
             FROM carts
             WHERE site_id = ?
               AND user_id IS NOT NULL
               AND items != '[]'
               AND items != ''
               AND reminder_count IS NOT NULL
               AND reminder_count >= ?`
          ).bind(site.id, maxReminders).first();
          const maxedN = Number(maxedRow && maxedRow.n) || 0;
          siteStats.skipped_max_reminders_reached = maxedN;
          runSummary.skipped.max_reminders_reached += maxedN;
        } catch (e) {
          // Don't fail the whole site for an observability counter.
        }

        const abandonedCarts = await db.prepare(
          `SELECT c.id, c.site_id, c.user_id, c.items, c.subtotal, c.updated_at,
                  c.reminder_count, c.reminder_sent_at, c.language
           FROM carts c
           WHERE c.user_id IS NOT NULL
             AND c.items != '[]'
             AND c.items != ''
             AND (c.reminder_count IS NULL OR c.reminder_count < ?)
             AND c.updated_at < datetime('now', '-' || ? || ' hours')
           ORDER BY c.updated_at ASC
           LIMIT 50`
        ).bind(maxReminders, delayHours).all();

        const candidateCount = (abandonedCarts.results || []).length;
        siteStats.candidates = candidateCount;
        runSummary.candidates += candidateCount;
        if (candidateCount === 0) continue;
        runSummary.sitesWithCandidates++;

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
              if (new Date() < nextSendTime) {
                siteStats.skipped_backoff++;
                runSummary.skipped.backoff++;
                continue;
              }
            }

            const recentOrder = await db.prepare(
              `SELECT id FROM orders WHERE user_id = ? AND site_id = ? AND created_at > ? LIMIT 1`
            ).bind(cart.user_id, cart.site_id, cart.updated_at).first();

            if (recentOrder) {
              await db.prepare(
                `UPDATE carts SET reminder_count = ?, reminder_sent_at = datetime('now') WHERE id = ?`
              ).bind(maxReminders, cart.id).run();
              siteStats.skipped_recent_order++;
              runSummary.skipped.recent_order++;
              continue;
            }

            const customer = await db.prepare(
              `SELECT name, email, phone, preferred_lang FROM site_customers WHERE id = ? AND site_id = ?`
            ).bind(cart.user_id, cart.site_id).first();

            if (!customer) {
              siteStats.skipped_no_customer++;
              runSummary.skipped.no_customer++;
              continue;
            }
            if (!customer.email && !customer.phone) {
              siteStats.skipped_no_contact++;
              runSummary.skipped.no_contact++;
              continue;
            }

            let items = [];
            try {
              items = typeof cart.items === 'string' ? JSON.parse(cart.items) : cart.items;
            } catch (e) {
              siteStats.skipped_parse_error++;
              runSummary.skipped.parse_error++;
              continue;
            }
            if (!Array.isArray(items) || items.length === 0) {
              siteStats.skipped_empty_items++;
              runSummary.skipped.empty_items++;
              continue;
            }

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

            let customerLang = cart.language || customer.preferred_lang || null;
            if (!customerLang) {
              try {
                const lastOrder = await db.prepare(
                  `SELECT placed_in_language FROM orders WHERE user_id = ? AND site_id = ? AND placed_in_language IS NOT NULL ORDER BY created_at DESC LIMIT 1`
                ).bind(cart.user_id, cart.site_id).first();
                customerLang = lastOrder?.placed_in_language || null;
              } catch (e) {}
            }

            // Skip the email branch entirely if Brevo/FROM_EMAIL aren't set —
            // we already logged the run-level warning at the top of the run,
            // so we don't need to re-fail per cart inside sendEmail().
            if (sendEmailChannel && customer.email && brevoConfigured && fromEmailConfigured) {
              try {
                const emailContent = await buildAbandonedCartEmail(
                  customer.name, brandName, enrichedItems, cartTotal, storeUrl, currency,
                  env, cart.site_id, customerLang
                );
                const { translateString } = await import('../utils/email-i18n.js');
                const cartSubject = await translateString(env, cart.site_id, customerLang, `You left items in your cart - ${brandName}`);
                const result = await sendEmail(
                  env, customer.email,
                  cartSubject,
                  emailContent.html, emailContent.text
                );
                emailSent = result === true;
              } catch (emailErr) {
                console.error(`[AbandonedCart] Email error for cart ${cart.id}:`, emailErr.message || emailErr);
              }
            }

            if (sendWhatsApp && customer.phone && isWhatsAppConfigured(settings)) {
              try {
                const waMessage = await buildAbandonedCartWA(
                  customer.name, brandName, itemsSummary, cartTotal, storeUrl, currency,
                  env, cart.site_id, customerLang
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
              if (emailSent) { siteStats.emailsSent++; runSummary.emailsSent++; }
              if (whatsappSent) { siteStats.whatsappSent++; runSummary.whatsappSent++; }
              console.log(`[AbandonedCart] Reminder #${currentReminderCount + 1} sent for cart ${cart.id} (email: ${emailSent}, whatsapp: ${whatsappSent})`);
            } else {
              siteStats.skipped_no_channel_dispatched++;
              runSummary.skipped.no_channel_dispatched++;
            }
          } catch (cartErr) {
            siteStats.errors++;
            runSummary.errors++;
            console.error(`[AbandonedCart] Error processing cart ${cart.id}:`, cartErr.message || cartErr);
          }
        }
        // Per-site summary — emit when there was something to report (live
        // candidates this run, OR carts that already exhausted their
        // reminders — the latter explains a quiet log to operators).
        if (siteStats.candidates > 0 || siteStats.skipped_max_reminders_reached > 0) {
          console.log(
            `[AbandonedCart] site=${site.id} (${site.subdomain || ''}) ` +
            `candidates=${siteStats.candidates} ` +
            `sent=email:${siteStats.emailsSent},wa:${siteStats.whatsappSent} ` +
            `skipped=backoff:${siteStats.skipped_backoff},` +
            `recent_order:${siteStats.skipped_recent_order},` +
            `no_contact:${siteStats.skipped_no_contact},` +
            `no_customer:${siteStats.skipped_no_customer},` +
            `empty_items:${siteStats.skipped_empty_items},` +
            `parse_error:${siteStats.skipped_parse_error},` +
            `no_channel_dispatched:${siteStats.skipped_no_channel_dispatched},` +
            `max_reminders_reached:${siteStats.skipped_max_reminders_reached} ` +
            `errors=${siteStats.errors} ` +
            `cfg=delayHours:${delayHours},maxReminders:${maxReminders},` +
            `email:${sendEmailChannel},whatsapp:${sendWhatsApp}`
          );
        }
      } catch (siteErr) {
        runSummary.errors++;
        console.error(`[AbandonedCart] Error for site ${site.id}:`, siteErr.message || siteErr);
      }
    }

    console.log(
      `[AbandonedCart] Run complete — ` +
      `sites=${runSummary.sitesScanned} ` +
      `feature_disabled=${runSummary.sitesFeatureDisabled} ` +
      `no_settings=${runSummary.sitesNoSettings} ` +
      `with_candidates=${runSummary.sitesWithCandidates} ` +
      `candidates=${runSummary.candidates} ` +
      `sent=email:${runSummary.emailsSent},wa:${runSummary.whatsappSent} ` +
      `skipped=${JSON.stringify(runSummary.skipped)} ` +
      `errors=${runSummary.errors}`
    );
  } catch (error) {
    console.error('[AbandonedCart] Error:', error.message || error);
  }
}
