import { handleAuth } from './auth-worker.js';
import { handleSites } from './sites-worker.js';
import { handleProducts } from './products-worker.js';
import { handleOrders } from './orders-worker.js';
import { handleCart, mergeCarts, clearCart } from './cart-worker.js';
import { handleWishlist } from './wishlist-worker.js';
import { handlePayments, activateSubscription } from './payments-worker.js';
import { handleEmail } from './email-worker.js';
import { handleCategories } from './categories-worker.js';
import { handleUsers } from './users-worker.js';
import { handleSiteRouting, resolveSiteFromRequest } from './site-router.js';
import { jsonResponse, errorResponse, corsHeaders, handleCORS } from '../utils/helpers.js';

export default {
  async fetch(request, env, ctx) {
    const corsResponse = handleCORS(request);
    if (corsResponse) return corsResponse;

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path.startsWith('/api/')) {
        return handleAPI(request, env, path);
      }

      const siteResponse = await handleSiteRouting(request, env);
      if (siteResponse) {
        return siteResponse;
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
  const subdomain = url.searchParams.get('subdomain');

  if (!subdomain) {
    return errorResponse('Subdomain is required');
  }

  try {
    const site = await env.DB.prepare(
      `SELECT s.id, s.subdomain, s.brand_name, s.category, s.template_id, 
              s.logo_url, s.favicon_url, s.primary_color, s.secondary_color,
              s.phone, s.email, s.address, s.social_links, s.settings
       FROM sites s 
       WHERE s.subdomain = ? AND s.is_active = 1`
    ).bind(subdomain).first();

    if (!site) {
      return errorResponse('Site not found', 404);
    }

    // Try to get categories, but don't fail if the table doesn't exist
    let categoriesResult = [];
    try {
      const categories = await env.DB.prepare(
        'SELECT * FROM categories WHERE site_id = ? ORDER BY display_order'
      ).bind(site.id).all();
      categoriesResult = categories.results || [];
    } catch (catError) {
      console.error('Categories query failed, attempting to auto-create table:', catError);
      
      // Auto-create categories table if it's missing
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

    // Safely parse JSON fields
    let socialLinks = {};
    let settings = {};
    try {
      if (site.social_links) socialLinks = JSON.parse(site.social_links);
    } catch (e) { /* ignore parse errors */ }
    try {
      if (site.settings) settings = JSON.parse(site.settings);
    } catch (e) { /* ignore parse errors */ }

    return jsonResponse({
      success: true,
      data: {
        ...site,
        socialLinks,
        settings,
        categories: categoriesResult,
      },
    });
  } catch (error) {
    console.error('Get site info error:', error);
    return errorResponse('Failed to fetch site info: ' + error.message, 500);
  }
}
