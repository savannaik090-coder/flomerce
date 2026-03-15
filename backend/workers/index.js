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
import { jsonResponse, errorResponse, corsHeaders, handleCORS } from '../utils/helpers.js';
import { ensureTablesExist } from '../utils/db-init.js';

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

      const siteResponse = await handleSiteRouting(request, env);
      if (siteResponse) {
        return siteResponse;
      }

      // www.fluxe.in is caught by the *.fluxe.in/* Worker route but belongs
      // to the Cloudflare Pages project. Proxy it through so Pages can serve it.
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

  let site = null;

  try {
    if (subdomain) {
      site = await env.DB.prepare(
        `SELECT s.id, s.subdomain, s.brand_name, s.category, s.template_id, 
                s.logo_url, s.favicon_url, s.primary_color, s.secondary_color,
                s.phone, s.email, s.address, s.social_links, s.settings,
                s.custom_domain, s.domain_status, s.domain_verification_token,
                s.seo_title, s.seo_description, s.seo_og_image, s.seo_robots, s.google_verification
         FROM sites s 
         WHERE LOWER(s.subdomain) = LOWER(?) AND s.is_active = 1`
      ).bind(subdomain).first();
    } else if (!hostname.endsWith('fluxe.in') && !hostname.endsWith('pages.dev') && !hostname.includes('localhost') && !hostname.includes('workers.dev')) {
      site = await env.DB.prepare(
        `SELECT s.id, s.subdomain, s.brand_name, s.category, s.template_id, 
                s.logo_url, s.favicon_url, s.primary_color, s.secondary_color,
                s.phone, s.email, s.address, s.social_links, s.settings,
                s.custom_domain, s.domain_status, s.domain_verification_token,
                s.seo_title, s.seo_description, s.seo_og_image, s.seo_robots, s.google_verification
         FROM sites s 
         WHERE s.custom_domain = ? AND s.domain_status = 'verified' AND s.is_active = 1`
      ).bind(hostname.toLowerCase()).first();
    }

    if (!site) {
      return errorResponse(subdomain ? 'Site not found' : 'Subdomain is required', subdomain ? 404 : 400);
    }

    let categoriesResult = [];
    try {
      const categories = await env.DB.prepare(
        'SELECT * FROM categories WHERE site_id = ? ORDER BY display_order'
      ).bind(site.id).all();
      categoriesResult = categories.results || [];
    } catch (catError) {
      console.error('Categories query failed, attempting to auto-create table:', catError);
      
      try {
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            site_id TEXT NOT NULL,
            name TEXT NOT NULL,
            slug TEXT NOT NULL,
            parent_id TEXT,
            description TEXT,
            image_url TEXT,
            display_order INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
            FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
            UNIQUE(site_id, slug)
          )
        `).run();
        
        await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_categories_site ON categories(site_id)').run();
        await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(site_id, slug)').run();
        await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id)').run();
        
        console.log('Categories table auto-created successfully');
      } catch (createError) {
        console.error('Failed to auto-create categories table:', createError);
      }
    }

    let socialLinks = {};
    let settings = {};
    try {
      if (site.social_links) socialLinks = JSON.parse(site.social_links);
    } catch (e) {}
    try {
      if (site.settings) settings = JSON.parse(site.settings);
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

    let pageSEOResult = [];
    try {
      const psResult = await env.DB.prepare(
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
      },
    });
  } catch (error) {
    console.error('Get site info error:', error);
    return errorResponse('Failed to fetch site info: ' + error.message, 500);
  }
}
