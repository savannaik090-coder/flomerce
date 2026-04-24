import { generateId, generateSubdomain, sanitizeInput, jsonResponse, errorResponse, successResponse, handleCORS } from '../../utils/helpers.js';
import { PLATFORM_DOMAIN } from '../../config.js';
import { validateAuth } from '../../utils/auth.js';
import { validateSiteAdmin, handleStaffCRUD } from '../storefront/site-admin-worker.js';
import { registerCustomHostname, deleteCustomHostname, findCustomHostname } from '../../utils/cloudflare.js';
import { resolveSiteDBById, getSiteConfig, getSiteWithConfig } from '../../utils/site-db.js';
import { trackD1Write, trackD1Update, estimateRowBytes, normalizePlanName, getPlanLimitsConfig, recordMediaFile } from '../../utils/usage-tracker.js';
import { purgeStorefrontCache } from '../../utils/cache.js';
// English-only wizard seed (System A removed). The platform UI is English; the
// storefront uses on-demand translation (System B) at render time.
const SUPPORTED_LOCALES = new Set([
  'en', 'hi', 'es', 'zh-CN', 'ar',
  'fr', 'de', 'pt', 'pt-BR', 'it', 'ja', 'ko', 'ru', 'tr', 'pl', 'nl', 'sv',
  'th', 'vi', 'id', 'ms', 'fil', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml',
  'pa', 'ur', 'fa', 'he', 'el', 'cs', 'da', 'fi', 'no', 'ro', 'hu', 'uk',
  'zh-TW', 'en-GB',
]);

const EN_SEO_TITLE_TEMPLATES = {
  jewellery: '{{brand}} - Jewellery Store Online',
  clothing: '{{brand}} - Fashion & Clothing Store',
  beauty: '{{brand}} - Beauty & Cosmetics Store',
  general: '{{brand}} - Shop Online',
};
const EN_SEO_DESCRIPTION_TEMPLATES = {
  jewellery: 'Shop exquisite jewellery at {{brand}}. Explore rings, necklaces, earrings, bracelets & more. Secure payments & nationwide delivery.',
  clothing: 'Discover the latest fashion at {{brand}}. Shop clothing, accessories & more with easy returns & fast shipping.',
  beauty: 'Shop premium beauty & cosmetics at {{brand}}. Skincare, makeup & more with secure checkout & fast delivery.',
  general: 'Shop online at {{brand}}. Explore our curated collection with secure checkout, easy returns & fast delivery.',
};
const EN_DEFAULT_CATEGORIES = {
  jewellery: {
    c1: { name: 'New Arrivals', subtitle: 'Discover our latest exquisite collections' },
    c2: { name: 'Jewellery Collection', subtitle: 'Exquisite pieces for every occasion' },
    c3: { name: 'Featured Collection', subtitle: 'Handpicked favourites just for you' },
  },
  clothing: {
    c1: { name: 'New Arrivals', subtitle: 'Discover our latest fashion trends' },
    c2: { name: 'Clothing Collection', subtitle: 'Stylish wear for every occasion' },
    c3: { name: 'Featured Collection', subtitle: 'Handpicked favourites just for you' },
  },
  beauty: {
    c1: { name: 'New Arrivals', subtitle: 'Discover our latest beauty essentials' },
    c2: { name: 'Skincare', subtitle: 'Nourish and glow with our skincare range' },
    c3: { name: 'Makeup', subtitle: 'Premium makeup for every look' },
  },
  general: {
    c1: { name: 'New Arrivals', subtitle: 'Check out what just landed' },
    c2: { name: 'Our Collection', subtitle: 'Browse our complete product range' },
    c3: { name: 'Featured Products', subtitle: 'Handpicked favourites just for you' },
  },
};

function slugifyName(s) {
  return String(s || '').toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function getEnglishWizardSeed() {
  const sub = (tpl, brand) => String(tpl || '').replace(/\{\{\s*brand\s*\}\}/g, brand);
  return {
    seoTitle: (cat, brand) => sub(EN_SEO_TITLE_TEMPLATES[cat] || EN_SEO_TITLE_TEMPLATES.general, brand),
    seoDescription: (cat, brand) => sub(EN_SEO_DESCRIPTION_TEMPLATES[cat] || EN_SEO_DESCRIPTION_TEMPLATES.general, brand),
    defaultCategories: (cat) => {
      const enCats = EN_DEFAULT_CATEGORIES[cat] || EN_DEFAULT_CATEGORIES.general;
      return Object.keys(enCats).map((key) => {
        const enEntry = enCats[key] || {};
        return {
          name: enEntry.name || '',
          subtitle: enEntry.subtitle || null,
          slug: slugifyName(enEntry.name || key),
        };
      });
    },
  };
}
import { encryptSecret, decryptSecret, maskSecret } from '../../utils/crypto.js';
import { getSiteTranslatorUsage } from '../storefront/translate-worker.js';

export async function handleSites(request, env, path, ctx) {
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;

  const method = request.method;
  const pathParts = path.split('/').filter(Boolean);
  const siteId = pathParts[2];
  const subResource = pathParts[3];

  if (siteId && subResource === 'staff') {
    const staffId = pathParts[4] || null;
    return handleStaffCRUD(request, env, siteId, subResource, staffId);
  }

  if (siteId && subResource === 'convert-currency' && method === 'POST') {
    let authorized = false;
    const user = await validateAuth(request, env);
    if (user) {
      const ownedSite = await env.DB.prepare('SELECT id FROM sites WHERE id = ? AND user_id = ?').bind(siteId, user.id).first();
      if (ownedSite) authorized = true;
    }
    if (!authorized) {
      const siteAdmin = await validateSiteAdmin(request, env, siteId);
      if (!siteAdmin) return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }
    return handleConvertCurrency(request, env, siteId);
  }

  if (siteId && subResource === 'translator-settings') {
    // Owner-only: translator credentials are a billable secret. Staff sessions
    // (validateSiteAdmin with staff_id) must NOT be able to read, save, test,
    // or delete the merchant's Microsoft Translator key — only the site owner
    // (platform user who owns the site, OR the auto-issued owner SiteAdmin
    // session where isOwner === true).
    let authorized = false;
    const user = await validateAuth(request, env);
    if (user) {
      const ownedSite = await env.DB.prepare('SELECT id FROM sites WHERE id = ? AND user_id = ?').bind(siteId, user.id).first();
      if (ownedSite) authorized = true;
    }
    if (!authorized) {
      const siteAdmin = await validateSiteAdmin(request, env, siteId);
      if (siteAdmin && siteAdmin.isOwner) authorized = true;
    }
    if (!authorized) {
      return errorResponse('Forbidden: site owner only', 403, 'FORBIDDEN');
    }
    const action = pathParts[4];
    if (action === 'test' && method === 'POST') {
      return testSiteTranslator(request, env, siteId);
    }
    if (!action) {
      if (method === 'GET') return getSiteTranslatorSettings(env, siteId);
      if (method === 'PUT') return saveSiteTranslatorSettings(request, env, siteId, ctx);
      if (method === 'DELETE') return deleteSiteTranslatorSettings(env, siteId, ctx);
    }
    return errorResponse('Method not allowed', 405);
  }

  if (siteId && (subResource === 'custom-domain' || subResource === 'verify-domain' || subResource === 'rename-subdomain')) {
    let authorized = false;
    const user = await validateAuth(request, env);
    if (user) {
      const ownedSite = await env.DB.prepare('SELECT id FROM sites WHERE id = ? AND user_id = ?').bind(siteId, user.id).first();
      if (ownedSite) authorized = true;
    }
    if (!authorized) {
      const siteAdmin = await validateSiteAdmin(request, env, siteId);
      if (!siteAdmin) return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }

    if (subResource === 'custom-domain') {
      if (method === 'PUT') return handleSetCustomDomain(request, env, siteId);
      if (method === 'DELETE') return handleRemoveCustomDomain(env, siteId);
      return errorResponse('Method not allowed', 405);
    }
    if (subResource === 'verify-domain') {
      if (method === 'POST') return handleVerifyDomain(env, siteId);
      return errorResponse('Method not allowed', 405);
    }
    if (subResource === 'rename-subdomain') {
      if (method === 'PUT') return handleRenameSubdomain(request, env, siteId);
      return errorResponse('Method not allowed', 405);
    }
  }

  if (method === 'PUT' && siteId) {
    const user = await validateAuth(request, env);
    if (user) {
      return updateSite(request, env, user, siteId, ctx);
    }
    const siteAdmin = await validateSiteAdmin(request, env, siteId);
    if (siteAdmin) {
      return updateSiteAsAdmin(request, env, siteId, ctx);
    }
    return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const user = await validateAuth(request, env);
  if (!user) {
    return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
  }

  if (method === 'GET' && siteId === 'check-subdomain') {
    const url = new URL(request.url);
    const sub = url.searchParams.get('subdomain');
    return checkSubdomainAvailability(env, sub);
  }

  switch (method) {
    case 'GET':
      return siteId ? getSite(env, user, siteId) : getUserSites(env, user);
    case 'POST':
      return createSite(request, env, user);
    case 'DELETE':
      return deleteSite(env, user, siteId);
    default:
      return errorResponse('Method not allowed', 405);
  }
}

const RESERVED_SUBDOMAINS = new Set([
  'admin', 'api', 'www', 'support', 'help', 'mail', 'email', 'ftp',
  'blog', 'shop', 'store', 'app', 'dashboard', 'billing', 'status',
  'docs', 'developer', 'developers', 'dev', 'staging', 'test',
  'login', 'signup', 'register', 'account', 'accounts', 'settings',
  'profile', 'user', 'users', 'auth', 'oauth', 'sso',
  'cdn', 'assets', 'static', 'media', 'images', 'img',
  'payment', 'payments', 'checkout', 'cart', 'order', 'orders',
  'contact', 'about', 'terms', 'privacy', 'legal', 'security',
  'root', 'system', 'internal', 'platform', 'flomerce', 'buildflux',
  'ns1', 'ns2', 'mx', 'smtp', 'pop', 'imap', 'webmail',
  'cpanel', 'whm', 'plesk', 'server', 'host', 'hosting',
  'demo', 'example', 'sandbox', 'preview',
]);

function isReservedSubdomain(subdomain) {
  return RESERVED_SUBDOMAINS.has(subdomain.toLowerCase());
}

async function checkSubdomainAvailability(env, subdomain) {
  if (!subdomain || subdomain.length < 3) {
    return jsonResponse({ available: false, reason: 'Subdomain must be at least 3 characters' });
  }
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(subdomain) && subdomain.length > 1) {
    return jsonResponse({ available: false, reason: 'Only lowercase letters, numbers, and hyphens allowed' });
  }
  if (isReservedSubdomain(subdomain)) {
    return jsonResponse({ available: false, reason: 'This subdomain is reserved and cannot be used' });
  }
  try {
    const existing = await env.DB.prepare(
      'SELECT id FROM sites WHERE LOWER(subdomain) = ?'
    ).bind(subdomain.toLowerCase()).first();
    if (existing) {
      return jsonResponse({ available: false, reason: 'This subdomain is already taken' });
    }
    return jsonResponse({ available: true });
  } catch (error) {
    console.error('Check subdomain error:', error);
    return errorResponse('Failed to check subdomain', 500);
  }
}

/**
 * Reconcile sites.subscription_plan / subscription_expires_at against the
 * subscriptions table. The subscriptions table is the source of truth.
 * Mutates the passed-in `site` object in place so callers see the corrected values.
 *
 * Rules:
 *   - 'enterprise' on sites is an admin override and is never touched.
 *   - If an active subscription exists, sites.subscription_plan must equal sub.plan
 *     and subscription_expires_at must equal sub.current_period_end.
 *   - If no active subscription exists and sites.subscription_plan is set to a
 *     paid plan, clear it (the cached value is stale). Trial sites are left alone
 *     until their subscription_expires_at has passed.
 */
export async function reconcileSiteSubscription(env, site) {
  if (!site || !site.id) return site;
  if (site.subscription_plan === 'enterprise') return site;

  try {
    // A subscription is "effectively active" if status='active' OR it's been cancelled
    // but we're still inside the paid period the user already paid for. Either way,
    // sites.subscription_plan should reflect that plan so the user keeps full access
    // until the period truly ends.
    const activeSub = await env.DB.prepare(
      `SELECT plan, current_period_end FROM subscriptions
       WHERE site_id = ?
         AND (
           status = 'active'
           OR (status = 'cancelled' AND current_period_end IS NOT NULL AND current_period_end > datetime('now'))
         )
       ORDER BY
         CASE status WHEN 'active' THEN 0 ELSE 1 END,
         created_at DESC
       LIMIT 1`
    ).bind(site.id).first();

    if (activeSub) {
      const planMismatch = (site.subscription_plan || '') !== (activeSub.plan || '');
      const periodMismatch = (site.subscription_expires_at || '') !== (activeSub.current_period_end || '');
      if (planMismatch || periodMismatch) {
        await env.DB.prepare(
          `UPDATE sites SET subscription_plan = ?, subscription_expires_at = ?, updated_at = datetime('now')
           WHERE id = ? AND COALESCE(subscription_plan, '') != 'enterprise'`
        ).bind(activeSub.plan, activeSub.current_period_end, site.id).run();
        site.subscription_plan = activeSub.plan;
        site.subscription_expires_at = activeSub.current_period_end;
        console.log(`[Reconcile] site=${site.id}: synced to active sub plan=${activeSub.plan}`);
      }
      return site;
    }

    // No active sub. Clear any stale paid-plan cache, but leave trial alone unless expired.
    const cached = site.subscription_plan;
    if (!cached) return site;

    if (cached === 'trial') {
      const expiresAt = site.subscription_expires_at;
      if (expiresAt && new Date(expiresAt) < new Date()) {
        await env.DB.prepare(
          `UPDATE sites SET subscription_plan = NULL, subscription_expires_at = NULL, updated_at = datetime('now')
           WHERE id = ? AND COALESCE(subscription_plan, '') NOT IN ('enterprise')`
        ).bind(site.id).run();
        site.subscription_plan = null;
        site.subscription_expires_at = null;
        console.log(`[Reconcile] site=${site.id}: cleared expired trial`);
      }
      return site;
    }

    // Cached paid plan but no active subscription row — stale. Clear both the plan
    // and the cached expiry so callers don't see a half-stale state.
    await env.DB.prepare(
      `UPDATE sites SET subscription_plan = NULL, subscription_expires_at = NULL, updated_at = datetime('now')
       WHERE id = ? AND COALESCE(subscription_plan, '') NOT IN ('enterprise')`
    ).bind(site.id).run();
    site.subscription_plan = null;
    site.subscription_expires_at = null;
    console.log(`[Reconcile] site=${site.id}: cleared stale paid plan '${cached}' (no active sub)`);
  } catch (e) {
    console.error('reconcileSiteSubscription error:', e.message || e);
  }
  return site;
}

async function getUserSites(env, user) {
  try {
    const sites = await env.DB.prepare(
      `SELECT id, subdomain, brand_name, template_id,
              is_active, subscription_plan, subscription_expires_at, created_at,
              custom_domain, domain_status, content_language
       FROM sites 
       WHERE user_id = ? 
       ORDER BY created_at DESC`
    ).bind(user.id).all();

    const enrichedSites = [];
    for (const site of sites.results) {
      // Self-heal any sites/subscriptions divergence before computing the response.
      await reconcileSiteSubscription(env, site);

      const config = await getSiteConfig(env, site.id);

      let subscription = { plan: null, status: 'none', billingCycle: null, periodStart: null, periodEnd: null };
      try {
        if (site.subscription_plan === 'enterprise') {
          subscription = {
            plan: 'enterprise',
            status: 'active',
            billingCycle: null,
            periodStart: null,
            periodEnd: site.subscription_expires_at || '2099-12-31T23:59:59',
          };
        } else {
          // Prefer an active sub. Otherwise fall back to most recent (so the UI can show
          // "expired"/"cancelled" + a scheduled downgrade if any). Trial is recognised by
          // plan='trial' on the subscriptions row (we no longer trust sites.subscription_plan).
          const activeSub = await env.DB.prepare(
            `SELECT plan, status, billing_cycle, current_period_start, current_period_end, razorpay_subscription_id FROM subscriptions WHERE site_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`
          ).bind(site.id).first();
          const sub = activeSub || await env.DB.prepare(
            `SELECT plan, status, billing_cycle, current_period_start, current_period_end, razorpay_subscription_id FROM subscriptions WHERE site_id = ? AND status != 'enterprise_override' ORDER BY created_at DESC LIMIT 1`
          ).bind(site.id).first();

          if (sub) {
            let subStatus = sub.status;
            if (subStatus === 'active' && sub.current_period_end && new Date(sub.current_period_end) < new Date()) {
              subStatus = 'expired';
            }
            subscription = {
              plan: subStatus === 'active' ? sub.plan : null,
              latestPlan: sub.plan,
              status: subStatus,
              billingCycle: sub.billing_cycle,
              periodStart: sub.current_period_start,
              periodEnd: sub.current_period_end,
              hasRazorpay: !!sub.razorpay_subscription_id,
            };
          }

          // Surface any scheduled downgrade so the dashboard can show "switching to X on Y".
          const scheduled = await env.DB.prepare(
            `SELECT plan, billing_cycle, current_period_start FROM subscriptions WHERE site_id = ? AND status = 'scheduled' ORDER BY current_period_start ASC LIMIT 1`
          ).bind(site.id).first();
          if (scheduled) {
            subscription.scheduledPlan = scheduled.plan;
            subscription.scheduledBillingCycle = scheduled.billing_cycle;
            subscription.scheduledStartAt = scheduled.current_period_start;
          }
        }
      } catch (e) {}
      enrichedSites.push({
        ...site,
        brand_name: config.brand_name || site.brand_name,
        category: config.category || null,
        logo_url: config.logo_url || null,
        primary_color: config.primary_color || '#000000',
        subscription,
      });
    }

    return successResponse(enrichedSites);
  } catch (error) {
    console.error('Get sites error:', error);
    return errorResponse('Failed to fetch sites', 500);
  }
}

async function getSite(env, user, siteId) {
  try {
    const siteRow = await env.DB.prepare(
      `SELECT * FROM sites WHERE id = ? AND user_id = ?`
    ).bind(siteId, user.id).first();

    if (!siteRow) {
      return errorResponse('Site not found', 404, 'NOT_FOUND');
    }

    await reconcileSiteSubscription(env, siteRow);

    const site = await getSiteWithConfig(env, siteRow);

    const siteDB = await resolveSiteDBById(env, siteId);
    const categories = await siteDB.prepare(
      `SELECT * FROM categories WHERE site_id = ? ORDER BY display_order`
    ).bind(siteId).all();

    return successResponse({ ...site, categories: categories.results });
  } catch (error) {
    console.error('Get site error:', error);
    return errorResponse('Failed to fetch site', 500);
  }
}

async function createSite(request, env, user) {
  let siteId = null;
  let finalSubdomain = null;
  
  try {
    const body = await request.json();
    const { brandName, categories, templateId, phone, email, address, primaryColor, secondaryColor, theme } = body;
    let logoUrl = body.logoUrl || null;
    const logoBase64 = body.logo || null;
    const faviconBase64 = body.favicon || null;
    const category = body.category || 'general';
    const seoTitle = body.seoTitle || null;
    const seoDescription = body.seoDescription || null;
    const subdomain = (body.subdomain || generateSubdomain(brandName)).toLowerCase().trim();
    // Merchant-authored content language. Validated against the platform's
    // SUPPORTED_LOCALES allowlist (whitelist) — never trust the client. Defaults
    // to English so existing wizard flows stay backwards compatible.
    const contentLanguageRaw = (body.content_language || body.contentLanguage || 'en');
    const contentLanguage = typeof contentLanguageRaw === 'string' ? contentLanguageRaw.trim() : 'en';
    if (!SUPPORTED_LOCALES.has(contentLanguage)) {
      return errorResponse('Unsupported content language', 400, 'INVALID_CONTENT_LANGUAGE');
    }

    if (!brandName) {
      return errorResponse('Brand name is required');
    }

    const activeSub = await env.DB.prepare(
      `SELECT plan FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`
    ).bind(user.id).first();
    const userPlan = normalizePlanName(activeSub?.plan || 'free');
    const planConfig = getPlanLimitsConfig(userPlan);

    if (planConfig.maxSites !== Infinity) {
      const siteCount = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM sites WHERE user_id = ? AND is_active = 1'
      ).bind(user.id).first();
      if ((siteCount?.count || 0) >= planConfig.maxSites) {
        const limitMsg = userPlan === 'trial'
          ? `Trial plan allows up to ${planConfig.maxSites} websites. Upgrade to a paid plan to create more.`
          : `Your plan allows up to ${planConfig.maxSites} websites. Upgrade to create more.`;
        return errorResponse(limitMsg, 403, 'PLAN_LIMIT_REACHED');
      }
    }

    if (subdomain.length < 3) {
      return errorResponse('Subdomain must be at least 3 characters', 400, 'INVALID_SUBDOMAIN');
    }
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(subdomain)) {
      return errorResponse('Subdomain can only contain lowercase letters, numbers, and hyphens (not at start/end)', 400, 'INVALID_SUBDOMAIN');
    }
    if (isReservedSubdomain(subdomain)) {
      return errorResponse('This subdomain is reserved and cannot be used. Please choose a different name.', 400, 'SUBDOMAIN_RESERVED');
    }

    const existingSubdomain = await env.DB.prepare(
      'SELECT id FROM sites WHERE LOWER(subdomain) = ?'
    ).bind(subdomain).first();

    if (existingSubdomain) {
      return errorResponse('This subdomain is already taken. Please choose a different brand name.', 400, 'SUBDOMAIN_TAKEN');
    }

    const activeShard = await env.DB.prepare(
      'SELECT id FROM shards WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1'
    ).first();

    if (!activeShard) {
      return errorResponse('No active shard available. Please contact support.', 500);
    }

    finalSubdomain = subdomain;
    siteId = generateId();

    await env.DB.prepare(
      `INSERT INTO sites (id, user_id, subdomain, brand_name, category, template_id, shard_id, content_language, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`
    ).bind(
      siteId,
      user.id,
      finalSubdomain,
      sanitizeInput(brandName),
      category,
      templateId || 'storefront',
      activeShard.id,
      contentLanguage
    ).run();

    const siteDB = await resolveSiteDBById(env, siteId);

    if (logoBase64 && !logoUrl && logoBase64.startsWith('data:')) {
      try {
        const matches = logoBase64.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
          const mimeToExt = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' };
          if (allowedTypes.includes(mimeType)) {
            const binaryString = atob(base64Data);
            if (binaryString.length > 2 * 1024 * 1024) {
              console.error('Logo too large, skipping upload');
            } else {
            const buffer = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              buffer[i] = binaryString.charCodeAt(i);
            }
            const ext = mimeToExt[mimeType] || 'png';
            const key = `sites/${siteId}/images/${generateId()}.${ext}`;
            await env.STORAGE.put(key, buffer, {
              httpMetadata: { contentType: mimeType, cacheControl: 'public, max-age=31536000' },
            });
            await recordMediaFile(env, siteId, key, buffer.length, 'image');
            logoUrl = `/api/upload/image?key=${encodeURIComponent(key)}`;
            }
          }
        }
      } catch (e) {
        console.error('Failed to upload logo during site creation:', e);
      }
    }

    let faviconUrl = null;
    if (faviconBase64 && faviconBase64.startsWith('data:')) {
      try {
        const matches = faviconBase64.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/svg+xml'];
          const mimeToExt = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/x-icon': 'ico', 'image/vnd.microsoft.icon': 'ico', 'image/svg+xml': 'svg' };
          if (allowedTypes.includes(mimeType)) {
            const binaryString = atob(base64Data);
            if (binaryString.length > 2 * 1024 * 1024) {
              console.error('Favicon too large, skipping upload');
            } else {
            const buffer = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              buffer[i] = binaryString.charCodeAt(i);
            }
            const ext = mimeToExt[mimeType] || 'png';
            const key = `sites/${siteId}/images/favicon-${generateId()}.${ext}`;
            await env.STORAGE.put(key, buffer, {
              httpMetadata: { contentType: mimeType, cacheControl: 'public, max-age=31536000' },
            });
            await recordMediaFile(env, siteId, key, buffer.length, 'image');
            faviconUrl = `/api/upload/image?key=${encodeURIComponent(key)}`;
            }
          }
        }
      } catch (e) {
        console.error('Failed to upload favicon during site creation:', e);
      }
    }

    // Resolve localized SEO + category seed data from the cached wizard
    // catalog for the merchant's chosen content language. Falls back per
    // field to the bundled English source so unfilled locales still work.
    // English-only wizard seed (System A removed). Storefront chrome is
    // translated at render time via System B (<TranslatedText>) when the
    // shopper picks a language.
    const wizardSeed = getEnglishWizardSeed();
    const safeBrand = sanitizeInput(brandName);
    const finalSeoTitle = seoTitle || wizardSeed.seoTitle(category, safeBrand);
    const finalSeoDescription = seoDescription || wizardSeed.seoDescription(category, safeBrand);

    const configData = {
      site_id: siteId,
      brand_name: safeBrand,
      category,
      logo_url: logoUrl || null,
      favicon_url: faviconUrl || null,
      seo_title: finalSeoTitle,
      seo_description: finalSeoDescription,
      phone: phone || null,
      email: email || null,
      address: address || null,
      primary_color: primaryColor || '#000000',
      secondary_color: secondaryColor || '#ffffff',
    };
    const configBytes = estimateRowBytes(configData);

    const VALID_THEMES = ['classic', 'modern'];
    const initialSettings = {};
    if (theme && VALID_THEMES.includes(theme) && theme !== 'classic') {
      initialSettings.theme = theme;
    }
    const settingsJson = JSON.stringify(initialSettings);

    await siteDB.prepare(
      `INSERT INTO site_config (site_id, brand_name, category, logo_url, favicon_url, seo_title, seo_description, phone, email, address, primary_color, secondary_color, settings, row_size_bytes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      siteId,
      safeBrand,
      category,
      logoUrl || null,
      faviconUrl || null,
      finalSeoTitle,
      finalSeoDescription,
      phone || null,
      email || null,
      address || null,
      primaryColor || '#000000',
      secondaryColor || '#ffffff',
      settingsJson,
      configBytes
    ).run();
    await trackD1Write(env, siteId, configBytes);

    try {
      await env.DB.prepare(`
        INSERT INTO site_usage (site_id, d1_bytes_used, r2_bytes_used, baseline_bytes, last_updated)
        VALUES (?, 0, 0, 0, datetime('now'))
        ON CONFLICT(site_id) DO NOTHING
      `).bind(siteId).run();
    } catch (usageErr) {
      console.error('Usage init failed (non-fatal):', usageErr.message || usageErr);
    }

    try {
      if (categories && categories.length > 0) {
        await createUserCategories(env, siteDB, siteId, categories);
      } else if (category) {
        await createDefaultCategories(env, siteDB, siteId, category, wizardSeed);
      }
    } catch (catError) {
      console.error('Category creation failed (non-fatal):', catError.message || catError);
    }

    try {
      const activeSub = await env.DB.prepare(
        `SELECT id, plan, status, current_period_end, site_id FROM subscriptions WHERE user_id = ? AND status = 'active' AND site_id IS NULL ORDER BY created_at DESC LIMIT 1`
      ).bind(user.id).first();

      if (activeSub && activeSub.current_period_end && new Date(activeSub.current_period_end) > new Date()) {
        await env.DB.prepare(
          `UPDATE sites SET subscription_plan = ?, subscription_expires_at = ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(activeSub.plan, activeSub.current_period_end, siteId).run();

        await env.DB.prepare(
          `UPDATE subscriptions SET site_id = ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(siteId, activeSub.id).run();
      }
    } catch (subErr) {
      console.error('Check subscription for new site failed (non-fatal):', subErr);
    }

    return successResponse({ id: siteId, subdomain: finalSubdomain }, 'Site created successfully');
  } catch (error) {
    console.error('Create site error:', error);
    if (siteId) {
      try {
        await env.DB.prepare('DELETE FROM sites WHERE id = ?').bind(siteId).run();
        await env.DB.prepare('DELETE FROM site_usage WHERE site_id = ?').bind(siteId).run();
        console.log(`Rolled back partial site creation for site ${siteId}`);
      } catch (rollbackErr) {
        console.error('Rollback failed:', rollbackErr.message || rollbackErr);
      }
    }
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return errorResponse('Subdomain already taken', 400, 'SUBDOMAIN_TAKEN');
    }
    return errorResponse('Failed to create site: ' + error.message, 500);
  }
}

async function createDefaultCategories(env, db, siteId, businessCategory, wizardSeed) {
  // wizardSeed.defaultCategories(cat) returns a pre-localized array of
  // { name, subtitle, slug } items derived from the merchant's content
  // language (English fallback). Slugs always come from the English source
  // so URLs stay ASCII / stable across languages.
  const categories = wizardSeed.defaultCategories(businessCategory);
  let order = 0;

  for (const cat of categories) {
    const parentId = generateId();
    const parentData = { id: parentId, site_id: siteId, name: cat.name, slug: cat.slug, subtitle: cat.subtitle || null };
    const parentBytes = estimateRowBytes(parentData);
    await db.prepare(
      `INSERT INTO categories (id, site_id, name, slug, subtitle, show_on_home, display_order, row_size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(parentId, siteId, cat.name, cat.slug, cat.subtitle || null, 1, order++, parentBytes).run();
    await trackD1Write(env, siteId, parentBytes);
  }
}

async function createUserCategories(env, db, siteId, categories) {
  let order = 0;
  for (let cat of categories) {
    let categoryName = typeof cat === 'string' ? cat : (cat.name || cat.label);
    if (!categoryName) continue;
    
    // Derive an ASCII slug. Frontend may send an explicit slug (it derives
    // one from the EN source for default seeds), but we re-sanitize it
    // server-side so a malformed/non-ASCII client value cannot land in the
    // URL space. If both the explicit slug and the name-derived slug are
    // empty after sanitisation (e.g. Hindi/Arabic categories with no client
    // hint), fall back to an indexed placeholder.
    const sanitizeSlug = (s) => String(s || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    const explicitSlug = (typeof cat === 'object' && typeof cat.slug === 'string') ? sanitizeSlug(cat.slug) : '';
    let slug = explicitSlug || sanitizeSlug(categoryName);
    if (!slug) slug = `category-${order + 1}`;

    const subtitle = (typeof cat === 'object' && cat.subtitle) ? cat.subtitle : null;
    const showOnHome = (typeof cat === 'object' && cat.showOnHome !== undefined) ? (cat.showOnHome ? 1 : 0) : 1;
    
    const catId = generateId();
    const catData = { id: catId, site_id: siteId, name: categoryName, slug, subtitle };
    const catBytes = estimateRowBytes(catData);
    await db.prepare(
      `INSERT INTO categories (id, site_id, name, slug, subtitle, show_on_home, display_order, row_size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(catId, siteId, categoryName, slug, subtitle, showOnHome, order++, catBytes).run();
    await trackD1Write(env, siteId, catBytes);
  }
}

const CONFIG_FIELDS = ['brand_name', 'logo_url', 'favicon_url', 'primary_color', 'secondary_color', 'phone', 'email', 'address', 'social_links', 'settings', 'currency'];

async function updateSite(request, env, user, siteId, ctx) {
  if (!siteId) {
    return errorResponse('Site ID is required');
  }

  try {
    const site = await env.DB.prepare(
      'SELECT id FROM sites WHERE id = ? AND user_id = ?'
    ).bind(siteId, user.id).first();

    if (!site) {
      return errorResponse('Site not found', 404, 'NOT_FOUND');
    }

    const updates = await request.json();
    const siteDB = await resolveSiteDBById(env, siteId);
    const existingConfig = await siteDB.prepare(
      'SELECT * FROM site_config WHERE site_id = ?'
    ).bind(siteId).first();

    const setClause = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (CONFIG_FIELDS.includes(dbKey)) {
        if (dbKey === 'settings' && typeof value === 'object') {
          let existingSettings = {};
          try {
            if (existingConfig && existingConfig.settings) {
              existingSettings = JSON.parse(existingConfig.settings);
            }
          } catch (e) {}
          const incoming = { ...value };
          if ('notificationCcEmails' in incoming) {
            const arr = Array.isArray(incoming.notificationCcEmails) ? incoming.notificationCcEmails : [];
            const seen = new Set();
            const cleaned = [];
            for (const raw of arr) {
              if (typeof raw !== 'string') continue;
              const e = raw.trim().toLowerCase();
              if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) continue;
              if (seen.has(e)) continue;
              seen.add(e);
              cleaned.push(e);
              if (cleaned.length >= 5) break;
            }
            incoming.notificationCcEmails = cleaned;
          }
          const mergedSettings = { ...existingSettings, ...incoming };
          setClause.push(`${dbKey} = ?`);
          values.push(JSON.stringify(mergedSettings));
        } else {
          setClause.push(`${dbKey} = ?`);
          values.push(typeof value === 'object' ? JSON.stringify(value) : value);
        }
      }
    }

    if (setClause.length === 0) {
      return errorResponse('No valid fields to update');
    }

    setClause.push('updated_at = datetime("now")');
    values.push(siteId);

    const oldBytes = existingConfig?.row_size_bytes || 0;

    await siteDB.prepare(
      `UPDATE site_config SET ${setClause.join(', ')} WHERE site_id = ?`
    ).bind(...values).run();

    const updatedConfig = await siteDB.prepare(
      'SELECT * FROM site_config WHERE site_id = ?'
    ).bind(siteId).first();
    if (updatedConfig) {
      const newBytes = estimateRowBytes(updatedConfig);
      await siteDB.prepare('UPDATE site_config SET row_size_bytes = ? WHERE site_id = ?').bind(newBytes, siteId).run();
      await trackD1Update(env, siteId, oldBytes, newBytes);
    }

    const brandNameUpdate = Object.entries(updates).find(([key]) => {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      return dbKey === 'brand_name';
    });
    if (brandNameUpdate) {
      await env.DB.prepare(
        'UPDATE sites SET brand_name = ?, updated_at = datetime("now") WHERE id = ?'
      ).bind(brandNameUpdate[1], siteId).run();
    }

    if (ctx) ctx.waitUntil(purgeStorefrontCache(env, siteId, ['site']));

    return successResponse(null, 'Site updated successfully');
  } catch (error) {
    console.error('Update site error:', error);
    return errorResponse('Failed to update site', 500);
  }
}

async function updateSiteAsAdmin(request, env, siteId, ctx) {
  try {
    const updates = await request.json();
    const siteDB = await resolveSiteDBById(env, siteId);
    const existingConfig = await siteDB.prepare(
      'SELECT * FROM site_config WHERE site_id = ?'
    ).bind(siteId).first();

    const setClause = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (CONFIG_FIELDS.includes(dbKey)) {
        if (dbKey === 'settings' && typeof value === 'object') {
          let existingSettings = {};
          try {
            if (existingConfig && existingConfig.settings) {
              existingSettings = JSON.parse(existingConfig.settings);
            }
          } catch (e) {}
          const incoming = { ...value };
          if ('notificationCcEmails' in incoming) {
            const arr = Array.isArray(incoming.notificationCcEmails) ? incoming.notificationCcEmails : [];
            const seen = new Set();
            const cleaned = [];
            for (const raw of arr) {
              if (typeof raw !== 'string') continue;
              const e = raw.trim().toLowerCase();
              if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) continue;
              if (seen.has(e)) continue;
              seen.add(e);
              cleaned.push(e);
              if (cleaned.length >= 5) break;
            }
            incoming.notificationCcEmails = cleaned;
          }
          const mergedSettings = { ...existingSettings, ...incoming };
          setClause.push(`${dbKey} = ?`);
          values.push(JSON.stringify(mergedSettings));
        } else {
          setClause.push(`${dbKey} = ?`);
          values.push(typeof value === 'object' ? JSON.stringify(value) : value);
        }
      }
    }

    if (setClause.length === 0) {
      return errorResponse('No valid fields to update');
    }

    setClause.push('updated_at = datetime("now")');
    values.push(siteId);

    const oldBytes = existingConfig?.row_size_bytes || 0;

    await siteDB.prepare(
      `UPDATE site_config SET ${setClause.join(', ')} WHERE site_id = ?`
    ).bind(...values).run();

    const updatedConfig = await siteDB.prepare(
      'SELECT * FROM site_config WHERE site_id = ?'
    ).bind(siteId).first();
    if (updatedConfig) {
      const newBytes = estimateRowBytes(updatedConfig);
      await siteDB.prepare('UPDATE site_config SET row_size_bytes = ? WHERE site_id = ?').bind(newBytes, siteId).run();
      await trackD1Update(env, siteId, oldBytes, newBytes);
    }

    const brandNameUpdate = Object.entries(updates).find(([key]) => {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      return dbKey === 'brand_name';
    });
    if (brandNameUpdate) {
      await env.DB.prepare(
        'UPDATE sites SET brand_name = ?, updated_at = datetime("now") WHERE id = ?'
      ).bind(brandNameUpdate[1], siteId).run();
    }

    if (ctx) ctx.waitUntil(purgeStorefrontCache(env, siteId, ['site']));

    return successResponse(null, 'Site updated successfully');
  } catch (error) {
    console.error('Update site as admin error:', error);
    return errorResponse('Failed to update site', 500);
  }
}

async function deleteSite(env, user, siteId) {
  if (!siteId) {
    return errorResponse('Site ID is required');
  }

  try {
    const site = await env.DB.prepare(
      'SELECT id, subdomain, shard_id, d1_database_id FROM sites WHERE id = ? AND user_id = ?'
    ).bind(siteId, user.id).first();

    if (!site) {
      return errorResponse('Site not found', 404, 'NOT_FOUND');
    }

    if (site.shard_id) {
      try {
        const shardDB = await resolveSiteDBById(env, siteId);
        const fkCleanups = [
          { table: 'product_variants', fk: 'product_id', resolveFrom: 'products' },
          { table: 'addresses', fk: 'user_id', resolveFrom: 'site_customers' },
        ];
        for (const { table, fk, resolveFrom } of fkCleanups) {
          try {
            const parentResult = await shardDB.prepare(`SELECT id FROM ${resolveFrom} WHERE site_id = ?`).bind(siteId).all();
            const parentIds = (parentResult.results || []).map(r => r.id);
            if (parentIds.length > 0) {
              const ID_BATCH = 50;
              for (let i = 0; i < parentIds.length; i += ID_BATCH) {
                const batch = parentIds.slice(i, i + ID_BATCH);
                const ph = batch.map(() => '?').join(', ');
                try { await shardDB.prepare(`DELETE FROM ${table} WHERE ${fk} IN (${ph})`).bind(...batch).run(); } catch (e) {}
              }
            }
          } catch (e) {}
        }
        const siteTables = [
          'site_config',
          'activity_log', 'page_views', 'page_seo', 'reviews', 'notifications', 'coupons',
          'customer_email_verifications', 'customer_password_resets',
          'customer_addresses', 'site_customer_sessions', 'site_customers',
          'wishlists', 'carts', 'guest_orders', 'orders',
          'products', 'categories', 'site_media', 'site_usage', 'site_staff',
          'cancellation_requests', 'return_requests'
        ];
        for (const table of siteTables) {
          try {
            await shardDB.prepare(`DELETE FROM ${table} WHERE site_id = ?`).bind(siteId).run();
          } catch (e) {}
        }
        console.log(`Cleaned site data from shard for site ${siteId}`);
      } catch (shardErr) {
        console.error('Shard cleanup failed (non-fatal):', shardErr.message || shardErr);
      }
    }

    try {
      await env.DB.prepare('DELETE FROM site_usage WHERE site_id = ?').bind(siteId).run();
      await env.DB.prepare('DELETE FROM site_media WHERE site_id = ?').bind(siteId).run();
    } catch (e) {}

    await env.DB.prepare('DELETE FROM sites WHERE id = ?').bind(siteId).run();

    return successResponse({ subdomain: site.subdomain }, 'Site deleted successfully');
  } catch (error) {
    console.error('Delete site error:', error);
    return errorResponse('Failed to delete site', 500);
  }
}

export async function getSiteBySubdomain(env, subdomain) {
  try {
    const siteRow = await env.DB.prepare(
      `SELECT * FROM sites WHERE LOWER(subdomain) = LOWER(?) AND is_active = 1`
    ).bind(subdomain).first();

    if (!siteRow) return null;

    return await getSiteWithConfig(env, siteRow);
  } catch (error) {
    console.error('Get site by subdomain error:', error);
    return null;
  }
}

async function handleSetCustomDomain(request, env, siteId) {
  try {
    const body = await request.json();
    let { domain } = body;

    if (!domain || typeof domain !== 'string') {
      return errorResponse('Domain is required');
    }

    domain = domain.toLowerCase().trim();

    if (domain.startsWith('http://') || domain.startsWith('https://')) {
      domain = domain.replace(/^https?:\/\//, '');
    }
    domain = domain.replace(/\/+$/, '');

    const domainParts = domain.split('.');
    if (domainParts.length < 3 || domainParts[0] !== 'www') {
      return errorResponse('Only www subdomains are supported (e.g. www.mystore.com). Root domains like mystore.com are not supported.', 400, 'INVALID_DOMAIN');
    }

    const domainRegex = /^www\.[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z]{2,})+$/;
    if (!domainRegex.test(domain)) {
      return errorResponse('Invalid domain format. Please enter a valid domain like www.mystore.com', 400, 'INVALID_DOMAIN');
    }

    const existing = await env.DB.prepare(
      'SELECT id FROM sites WHERE custom_domain = ? AND id != ?'
    ).bind(domain, siteId).first();

    if (existing) {
      return errorResponse('This domain is already connected to another site', 409, 'DOMAIN_TAKEN');
    }

    const site = await env.DB.prepare(
      'SELECT id, custom_domain, domain_status, domain_verification_token FROM sites WHERE id = ?'
    ).bind(siteId).first();
    if (!site) {
      return errorResponse('Site not found', 404, 'NOT_FOUND');
    }

    if (site.custom_domain === domain && site.domain_verification_token) {
      return successResponse({
        custom_domain: domain,
        domain_status: site.domain_status || 'pending',
        domain_verification_token: site.domain_verification_token,
      }, 'Domain already configured. Use the existing verification token.');
    }

    const token = generateId().replace(/-/g, '');

    await env.DB.prepare(
      `UPDATE sites SET custom_domain = ?, domain_status = 'pending', domain_verification_token = ?, cf_hostname_id = NULL, updated_at = datetime('now') WHERE id = ?`
    ).bind(domain, token, siteId).run();

    return successResponse({
      custom_domain: domain,
      domain_status: 'pending',
      domain_verification_token: token,
    }, 'Custom domain saved. Please add the DNS records and verify.');
  } catch (error) {
    console.error('Set custom domain error:', error);
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return errorResponse('This domain is already connected to another site', 409, 'DOMAIN_TAKEN');
    }
    return errorResponse('Failed to set custom domain: ' + error.message, 500);
  }
}

async function resolveDnsA(hostname) {
  const res = await fetch(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=A`,
    { headers: { 'Accept': 'application/dns-json' } }
  );
  const data = await res.json();
  return (data.Answer || []).filter(r => r.type === 1).map(r => r.data);
}

async function handleVerifyDomain(env, siteId) {
  try {
    const site = await env.DB.prepare(
      'SELECT id, custom_domain, domain_verification_token FROM sites WHERE id = ?'
    ).bind(siteId).first();

    if (!site) {
      return errorResponse('Site not found', 404, 'NOT_FOUND');
    }

    if (!site.custom_domain) {
      return errorResponse('No custom domain configured for this site', 400);
    }

    const domain = site.custom_domain;
    const expectedToken = site.domain_verification_token;
    const errors = [];

    let txtVerified = false;
    try {
      const baseDomain = domain.replace(/^www\./, '');
      const txtHost = `_flomerce-verify.${baseDomain}`;
      const txtResponse = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(txtHost)}&type=TXT`,
        { headers: { 'Accept': 'application/dns-json' } }
      );
      const txtData = await txtResponse.json();
      if (txtData.Answer && txtData.Answer.length > 0) {
        for (const record of txtData.Answer) {
          const value = (record.data || '').replace(/"/g, '').trim();
          if (value === expectedToken) {
            txtVerified = true;
            break;
          }
        }
      }
      if (!txtVerified) {
        errors.push(`TXT record not found. Add a TXT record for _flomerce-verify.${baseDomain} with value: ${expectedToken}`);
      }
    } catch (dnsErr) {
      errors.push('Could not verify TXT record: ' + dnsErr.message);
    }

    let cnameVerified = false;
    try {
      const cnameResponse = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=CNAME`,
        { headers: { 'Accept': 'application/dns-json' } }
      );
      const cnameData = await cnameResponse.json();
      if (cnameData.Answer && cnameData.Answer.length > 0) {
        for (const record of cnameData.Answer) {
          const target = (record.data || '').replace(/\.$/, '').toLowerCase();
          if (target.endsWith(`.${env.DOMAIN || PLATFORM_DOMAIN}`) || target.endsWith('.pages.dev')) {
            cnameVerified = true;
            break;
          }
        }
      }

      if (!cnameVerified) {
        const aRecords = await resolveDnsA(domain);
        if (aRecords.length > 0) {
          cnameVerified = true;
        }
      }

      if (!cnameVerified) {
        errors.push(`CNAME record not found. Add a CNAME record for ${domain} pointing to your .${env.DOMAIN || PLATFORM_DOMAIN} subdomain.`);
      }
    } catch (dnsErr) {
      errors.push('Could not verify CNAME record: ' + dnsErr.message);
    }

    if (txtVerified && cnameVerified) {
      try {
        const cfResult = await registerCustomHostname(env, domain);
        if (cfResult && cfResult.id) {
          await env.DB.prepare(
            `UPDATE sites SET domain_status = 'verified', cf_hostname_id = ?, updated_at = datetime('now') WHERE id = ?`
          ).bind(cfResult.id, siteId).run();
        } else {
          await env.DB.prepare(
            `UPDATE sites SET domain_status = 'verified', updated_at = datetime('now') WHERE id = ?`
          ).bind(siteId).run();
        }
      } catch (cfErr) {
        console.error('CF hostname registration error:', cfErr);
        const existingHostname = await findCustomHostname(env, domain);
        if (existingHostname) {
          await env.DB.prepare(
            `UPDATE sites SET domain_status = 'verified', cf_hostname_id = ?, updated_at = datetime('now') WHERE id = ?`
          ).bind(existingHostname.id, siteId).run();
        } else {
          await env.DB.prepare(
            `UPDATE sites SET domain_status = 'verified', updated_at = datetime('now') WHERE id = ?`
          ).bind(siteId).run();
        }
      }

      return successResponse({
        custom_domain: domain,
        domain_status: 'verified',
        verified: true,
      }, 'Domain verified and activated successfully!');
    }

    return successResponse({
      custom_domain: domain,
      domain_status: 'pending',
      verified: false,
      errors,
      checks: { txt: txtVerified, cname: cnameVerified },
    }, 'Domain verification incomplete. Please check the errors below.');
  } catch (error) {
    console.error('Verify domain error:', error);
    return errorResponse('Failed to verify domain: ' + error.message, 500);
  }
}

async function handleRemoveCustomDomain(env, siteId) {
  try {
    const site = await env.DB.prepare(
      'SELECT id, custom_domain, cf_hostname_id FROM sites WHERE id = ?'
    ).bind(siteId).first();

    if (!site) {
      return errorResponse('Site not found', 404, 'NOT_FOUND');
    }

    if (!site.custom_domain) {
      return errorResponse('No custom domain configured for this site', 400);
    }

    if (site.cf_hostname_id) {
      try {
        await deleteCustomHostname(env, site.cf_hostname_id);
      } catch (cfErr) {
        console.error('Failed to delete CF hostname (non-fatal):', cfErr);
      }
    }

    await env.DB.prepare(
      `UPDATE sites SET custom_domain = NULL, domain_status = NULL, domain_verification_token = NULL, cf_hostname_id = NULL, updated_at = datetime('now') WHERE id = ?`
    ).bind(siteId).run();

    return successResponse(null, 'Custom domain removed successfully');
  } catch (error) {
    console.error('Remove custom domain error:', error);
    return errorResponse('Failed to remove custom domain', 500);
  }
}

async function handleRenameSubdomain(request, env, siteId) {
  try {
    const { subdomain } = await request.json();
    if (!subdomain) {
      return errorResponse('Subdomain is required', 400);
    }

    const newSubdomain = subdomain.toLowerCase().trim();

    if (newSubdomain.length < 3) {
      return errorResponse('Subdomain must be at least 3 characters', 400);
    }
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(newSubdomain) && newSubdomain.length > 1) {
      return errorResponse('Only lowercase letters, numbers, and hyphens allowed. Must start and end with a letter or number.', 400);
    }
    if (isReservedSubdomain(newSubdomain)) {
      return errorResponse('This subdomain is reserved and cannot be used', 400, 'SUBDOMAIN_RESERVED');
    }

    const site = await env.DB.prepare(
      'SELECT id, subdomain FROM sites WHERE id = ?'
    ).bind(siteId).first();

    if (!site) {
      return errorResponse('Site not found', 404, 'NOT_FOUND');
    }

    if (site.subdomain === newSubdomain) {
      return errorResponse('New subdomain is the same as current one', 400);
    }

    const existing = await env.DB.prepare(
      'SELECT id FROM sites WHERE LOWER(subdomain) = ? AND id != ?'
    ).bind(newSubdomain, siteId).first();

    if (existing) {
      return errorResponse('This subdomain is already taken', 400, 'SUBDOMAIN_TAKEN');
    }

    await env.DB.prepare(
      `UPDATE sites SET subdomain = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(newSubdomain, siteId).run();

    return successResponse({ subdomain: newSubdomain }, 'Subdomain renamed successfully');
  } catch (error) {
    console.error('Rename subdomain error:', error);
    return errorResponse('Failed to rename subdomain', 500);
  }
}

async function handleConvertCurrency(request, env, siteId) {
  try {
    const { fromCurrency, toCurrency, exchangeRate } = await request.json();

    if (!fromCurrency || !toCurrency || !exchangeRate) {
      return errorResponse('fromCurrency, toCurrency, and exchangeRate are required');
    }
    if (fromCurrency === toCurrency) {
      return errorResponse('Source and target currencies are the same');
    }
    if (typeof exchangeRate !== 'number' || exchangeRate <= 0) {
      return errorResponse('exchangeRate must be a positive number');
    }

    const siteDB = await resolveSiteDBById(env, siteId);

    const existingConfig = await siteDB.prepare(
      'SELECT settings FROM site_config WHERE site_id = ?'
    ).bind(siteId).first();
    let currentSettings = {};
    try {
      if (existingConfig && existingConfig.settings) {
        currentSettings = JSON.parse(existingConfig.settings);
      }
    } catch (e) {}
    const currentCurrency = currentSettings.defaultCurrency || 'INR';
    if (currentCurrency !== fromCurrency) {
      return errorResponse(`Currency mismatch: store is currently set to ${currentCurrency}, but conversion requested from ${fromCurrency}. Please refresh and try again.`);
    }

    const converted = { products: 0, variants: 0, coupons: 0 };

    const products = await siteDB.prepare(
      'SELECT id, price, compare_price, cost_price, row_size_bytes FROM products WHERE site_id = ?'
    ).bind(siteId).all();

    if (products.results && products.results.length > 0) {
      for (const product of products.results) {
        const newPrice = product.price != null ? Math.round(product.price * exchangeRate * 100) / 100 : null;
        const newComparePrice = product.compare_price != null ? Math.round(product.compare_price * exchangeRate * 100) / 100 : null;
        const newCostPrice = product.cost_price != null ? Math.round(product.cost_price * exchangeRate * 100) / 100 : null;

        const oldBytes = product.row_size_bytes || 0;
        await siteDB.prepare(
          `UPDATE products SET price = ?, compare_price = ?, cost_price = ?, updated_at = datetime('now') WHERE id = ? AND site_id = ?`
        ).bind(newPrice, newComparePrice, newCostPrice, product.id, siteId).run();

        const updatedRow = await siteDB.prepare('SELECT * FROM products WHERE id = ? AND site_id = ?').bind(product.id, siteId).first();
        if (updatedRow) {
          const newBytes = estimateRowBytes(updatedRow);
          await siteDB.prepare('UPDATE products SET row_size_bytes = ? WHERE id = ? AND site_id = ?').bind(newBytes, product.id, siteId).run();
          await trackD1Update(env, siteId, oldBytes, newBytes);
        }
        converted.products++;

        const variants = await siteDB.prepare(
          'SELECT id, price, compare_price, row_size_bytes FROM product_variants WHERE product_id = ?'
        ).bind(product.id).all();

        if (variants.results && variants.results.length > 0) {
          for (const variant of variants.results) {
            const newVarPrice = variant.price != null ? Math.round(variant.price * exchangeRate * 100) / 100 : null;
            const newVarComparePrice = variant.compare_price != null ? Math.round(variant.compare_price * exchangeRate * 100) / 100 : null;

            const oldVarBytes = variant.row_size_bytes || 0;
            await siteDB.prepare(
              `UPDATE product_variants SET price = ?, compare_price = ? WHERE id = ?`
            ).bind(newVarPrice, newVarComparePrice, variant.id).run();

            const updatedVar = await siteDB.prepare('SELECT * FROM product_variants WHERE id = ?').bind(variant.id).first();
            if (updatedVar) {
              const newVarBytes = estimateRowBytes(updatedVar);
              await siteDB.prepare('UPDATE product_variants SET row_size_bytes = ? WHERE id = ?').bind(newVarBytes, variant.id).run();
              await trackD1Update(env, siteId, oldVarBytes, newVarBytes);
            }
            converted.variants++;
          }
        }
      }
    }

    const coupons = await siteDB.prepare(
      'SELECT id, type, value, min_order_value, max_discount, row_size_bytes FROM coupons WHERE site_id = ?'
    ).bind(siteId).all();

    if (coupons.results && coupons.results.length > 0) {
      for (const coupon of coupons.results) {
        const newValue = (coupon.type === 'fixed' && coupon.value != null) ? Math.round(coupon.value * exchangeRate * 100) / 100 : coupon.value;
        const newMinOrder = coupon.min_order_value != null ? Math.round(coupon.min_order_value * exchangeRate * 100) / 100 : null;
        const newMaxDiscount = coupon.max_discount != null ? Math.round(coupon.max_discount * exchangeRate * 100) / 100 : null;

        const oldBytes = coupon.row_size_bytes || 0;
        await siteDB.prepare(
          `UPDATE coupons SET value = ?, min_order_value = ?, max_discount = ? WHERE id = ? AND site_id = ?`
        ).bind(newValue, newMinOrder, newMaxDiscount, coupon.id, siteId).run();

        const updatedRow = await siteDB.prepare('SELECT * FROM coupons WHERE id = ? AND site_id = ?').bind(coupon.id, siteId).first();
        if (updatedRow) {
          const newBytes = estimateRowBytes(updatedRow);
          await siteDB.prepare('UPDATE coupons SET row_size_bytes = ? WHERE id = ? AND site_id = ?').bind(newBytes, coupon.id, siteId).run();
          await trackD1Update(env, siteId, oldBytes, newBytes);
        }
        converted.coupons++;
      }
    }

    currentSettings.defaultCurrency = toCurrency;
    const oldConfigBytes = existingConfig?.row_size_bytes || 0;
    await siteDB.prepare(
      `UPDATE site_config SET settings = ?, updated_at = datetime('now') WHERE site_id = ?`
    ).bind(JSON.stringify(currentSettings), siteId).run();
    const updatedConfig = await siteDB.prepare('SELECT * FROM site_config WHERE site_id = ?').bind(siteId).first();
    if (updatedConfig) {
      const newConfigBytes = estimateRowBytes(updatedConfig);
      await siteDB.prepare('UPDATE site_config SET row_size_bytes = ? WHERE site_id = ?').bind(newConfigBytes, siteId).run();
      await trackD1Update(env, siteId, oldConfigBytes, newConfigBytes);
    }

    return successResponse({ converted, exchangeRate, fromCurrency, toCurrency }, 'Currency conversion completed successfully');
  } catch (error) {
    console.error('Currency conversion error:', error);
    return errorResponse('Failed to convert currency: ' + error.message, 500);
  }
}

const ALLOWED_TRANSLATOR_LOCALES = SUPPORTED_LOCALES;

function parseLanguagesField(raw) {
  if (!raw) return [];
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(arr)) return [];
    return arr.filter((c) => typeof c === 'string' && ALLOWED_TRANSLATOR_LOCALES.has(c));
  } catch {
    return [];
  }
}

async function getSiteTranslatorRow(env, siteId) {
  return await env.DB.prepare(
    'SELECT translator_api_key_encrypted, translator_region, translator_enabled, translator_languages FROM sites WHERE id = ?'
  ).bind(siteId).first();
}

async function getSiteTranslatorSettings(env, siteId) {
  try {
    const row = await getSiteTranslatorRow(env, siteId);
    if (!row) return errorResponse('Site not found', 404);
    const enc = row.translator_api_key_encrypted || '';
    let keyMasked = '';
    if (enc) {
      try {
        const plain = await decryptSecret(env, enc);
        keyMasked = maskSecret(plain);
      } catch (e) {
        console.error('Translator key decrypt failed:', e?.message || e);
        keyMasked = '••••••••••????';
      }
    }
    const usage = await getSiteTranslatorUsage(env, siteId);
    return successResponse({
      enabled: row.translator_enabled === 1,
      region: row.translator_region || '',
      languages: parseLanguagesField(row.translator_languages),
      hasKey: !!enc,
      keyMasked,
      usage,
    });
  } catch (e) {
    console.error('Get site translator settings error:', e);
    return errorResponse('Failed to load translator settings', 500);
  }
}

/**
 * Validate a candidate {apiKey, region} against Microsoft Translator with a
 * 1-character sample. Returns { ok, error?, status? } and never throws.
 */
async function probeTranslatorCreds(apiKey, region) {
  if (!apiKey) return { ok: false, error: 'Translator API key is required.' };
  if (!region) return { ok: false, error: 'Translator region is required (e.g. centralindia, eastus, global).' };
  try {
    const url = 'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=en&to=es';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Ocp-Apim-Subscription-Region': region,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ Text: 'a' }]),
    });
    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        errMsg = errJson?.error?.message || errMsg;
      } catch {
        try { errMsg = (await res.text()) || errMsg; } catch {}
      }
      return { ok: false, error: errMsg, status: res.status };
    }
    const data = await res.json();
    const translation = data?.[0]?.translations?.[0]?.text || '';
    return { ok: true, translation };
  } catch (e) {
    return { ok: false, error: e.message || 'Network error reaching Microsoft Translator.' };
  }
}

async function saveSiteTranslatorSettings(request, env, siteId, ctx) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body');
  }
  try {
    const existing = await getSiteTranslatorRow(env, siteId);
    if (!existing) return errorResponse('Site not found', 404);

    const incomingKey = body && typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
    const isMaskedPlaceholder = incomingKey && incomingKey.startsWith('•');
    const region = body && typeof body.region === 'string' ? body.region.trim() : (existing.translator_region || '');
    const enabled = !!(body && body.enabled);

    let languages = [];
    if (Array.isArray(body?.languages)) {
      const seen = new Set();
      for (const l of body.languages) {
        if (typeof l !== 'string') continue;
        const code = l.trim();
        if (!code || !ALLOWED_TRANSLATOR_LOCALES.has(code)) continue;
        if (seen.has(code)) continue;
        seen.add(code);
        languages.push(code);
      }
    }

    let newEncrypted = existing.translator_api_key_encrypted || '';

    if (incomingKey && !isMaskedPlaceholder) {
      // Validate the candidate key+region BEFORE encrypting & saving.
      const probe = await probeTranslatorCreds(incomingKey, region);
      if (!probe.ok) {
        return errorResponse(`Microsoft rejected the key: ${probe.error}`, 400);
      }
      try {
        newEncrypted = await encryptSecret(env, incomingKey);
      } catch (e) {
        if (e?.message?.includes('SETTINGS_ENCRYPTION_KEY')) {
          return errorResponse('Server is missing SETTINGS_ENCRYPTION_KEY. Configure it before saving the translator key.', 500);
        }
        throw e;
      }
    }

    if (enabled && !newEncrypted) {
      return errorResponse('Cannot enable shopper translation without saving a translator API key first.', 400);
    }

    await env.DB.prepare(
      `UPDATE sites SET
        translator_api_key_encrypted = ?,
        translator_region = ?,
        translator_enabled = ?,
        translator_languages = ?,
        updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      newEncrypted || null,
      region || null,
      enabled ? 1 : 0,
      JSON.stringify(languages),
      siteId
    ).run();

    if (ctx) ctx.waitUntil(purgeStorefrontCache(env, siteId, ['site']));

    return successResponse(null, 'Translator settings saved');
  } catch (e) {
    console.error('Save site translator settings error:', e);
    return errorResponse('Failed to save translator settings: ' + (e.message || 'Unknown error'), 500);
  }
}

async function testSiteTranslator(request, env, siteId) {
  let body = {};
  try { body = await request.json(); } catch {}

  let apiKey = body && typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
  let region = body && typeof body.region === 'string' ? body.region.trim() : '';

  // Empty apiKey or masked placeholder → use stored credentials.
  if (!apiKey || apiKey.startsWith('•')) {
    const row = await getSiteTranslatorRow(env, siteId);
    if (!row || !row.translator_api_key_encrypted) {
      return successResponse({ ok: false, error: 'No translator key saved yet. Paste a key + region above and click Test.' });
    }
    try {
      apiKey = await decryptSecret(env, row.translator_api_key_encrypted);
    } catch (e) {
      return successResponse({ ok: false, error: 'Stored key could not be decrypted. Re-enter the key.' });
    }
    if (!region) region = row.translator_region || '';
  }

  const probe = await probeTranslatorCreds(apiKey, region);
  return successResponse(probe);
}

async function deleteSiteTranslatorSettings(env, siteId, ctx) {
  try {
    const row = await getSiteTranslatorRow(env, siteId);
    if (!row) return errorResponse('Site not found', 404);
    await env.DB.prepare(
      `UPDATE sites SET
        translator_api_key_encrypted = NULL,
        translator_enabled = 0,
        updated_at = datetime('now')
       WHERE id = ?`
    ).bind(siteId).run();
    if (ctx) ctx.waitUntil(purgeStorefrontCache(env, siteId, ['site']));
    return successResponse(null, 'Translator key removed');
  } catch (e) {
    console.error('Delete site translator settings error:', e);
    return errorResponse('Failed to remove translator key', 500);
  }
}
