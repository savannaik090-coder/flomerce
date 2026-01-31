import { handleAuth } from './auth-worker.js';
import { handleSites } from './sites-worker.js';
import { handleProducts } from './products-worker.js';
import { handleOrders } from './orders-worker.js';
import { handleCart, mergeCarts, clearCart } from './cart-worker.js';
import { handleWishlist } from './wishlist-worker.js';
import { handlePayments, activateSubscription } from './payments-worker.js';
import { handleEmail } from './email-worker.js';
import { handleCategories } from './categories-worker.js';
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

    const categories = await env.DB.prepare(
      'SELECT * FROM categories WHERE site_id = ? AND is_active = 1 ORDER BY display_order'
    ).bind(site.id).all();

    return jsonResponse({
      success: true,
      data: {
        ...site,
        socialLinks: site.social_links ? JSON.parse(site.social_links) : {},
        settings: site.settings ? JSON.parse(site.settings) : {},
        categories: categories.results,
      },
    });
  } catch (error) {
    console.error('Get site info error:', error);
    return errorResponse('Failed to fetch site info', 500);
  }
}
