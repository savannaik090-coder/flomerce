import { generateId, jsonResponse, errorResponse, successResponse, handleCORS } from '../../utils/helpers.js';
import { validateAuth, validateAnyAuth } from '../../utils/auth.js';

export async function handleWishlist(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;

  const pathParts = path.split('/').filter(Boolean);
  const subAction = pathParts[2];

  if (subAction === 'check') {
    return checkWishlist(request, env);
  }

  const user = await validateAnyAuth(request, env);
  if (!user) {
    return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const method = request.method;
  const url = new URL(request.url);
  const siteId = url.searchParams.get('siteId');

  if (!siteId) {
    return errorResponse('Site ID is required');
  }

  switch (method) {
    case 'GET':
      return getWishlist(env, user, siteId);
    case 'POST':
      return addToWishlist(request, env, user, siteId);
    case 'DELETE':
      return removeFromWishlist(request, env, user, siteId);
    default:
      return errorResponse('Method not allowed', 405);
  }
}

async function checkWishlist(request, env) {
  const user = await validateAnyAuth(request, env);
  if (!user) {
    return successResponse({ inWishlist: false });
  }

  const url = new URL(request.url);
  const siteId = url.searchParams.get('siteId');
  const productId = url.searchParams.get('productId');

  if (!siteId || !productId) {
    return errorResponse('siteId and productId are required');
  }

  try {
    const existing = await env.DB.prepare(
      'SELECT id FROM wishlists WHERE user_id = ? AND product_id = ? AND site_id = ?'
    ).bind(user.id, productId, siteId).first();

    return successResponse({ inWishlist: !!existing });
  } catch (error) {
    console.error('Check wishlist error:', error);
    return successResponse({ inWishlist: false });
  }
}

async function getWishlist(env, user, siteId) {
  try {
    const wishlistItems = await env.DB.prepare(
      `SELECT w.id, w.product_id, w.created_at,
              p.name, p.price, p.compare_price, p.thumbnail_url, p.stock, p.is_active
       FROM wishlists w
       JOIN products p ON w.product_id = p.id
       WHERE w.user_id = ? AND w.site_id = ?
       ORDER BY w.created_at DESC`
    ).bind(user.id, siteId).all();

    const items = wishlistItems.results.map(item => ({
      id: item.id,
      productId: item.product_id,
      name: item.name,
      price: item.price,
      comparePrice: item.compare_price,
      thumbnail: item.thumbnail_url,
      inStock: item.stock > 0,
      isActive: !!item.is_active,
      addedAt: item.created_at,
    }));

    return successResponse({
      items,
      count: items.length,
    });
  } catch (error) {
    console.error('Get wishlist error:', error);
    return errorResponse('Failed to fetch wishlist', 500);
  }
}

async function addToWishlist(request, env, user, siteId) {
  try {
    const { productId } = await request.json();

    if (!productId) {
      return errorResponse('Product ID is required');
    }

    const product = await env.DB.prepare(
      'SELECT id FROM products WHERE id = ? AND site_id = ? AND is_active = 1'
    ).bind(productId, siteId).first();

    if (!product) {
      return errorResponse('Product not found', 404);
    }

    const existing = await env.DB.prepare(
      'SELECT id FROM wishlists WHERE user_id = ? AND product_id = ? AND site_id = ?'
    ).bind(user.id, productId, siteId).first();

    if (existing) {
      return errorResponse('Product already in wishlist', 400, 'ALREADY_EXISTS');
    }

    const wishlistId = generateId();
    await env.DB.prepare(
      `INSERT INTO wishlists (id, site_id, user_id, product_id, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    ).bind(wishlistId, siteId, user.id, productId).run();

    return successResponse({ id: wishlistId }, 'Added to wishlist');
  } catch (error) {
    console.error('Add to wishlist error:', error);
    return errorResponse('Failed to add to wishlist', 500);
  }
}

async function removeFromWishlist(request, env, user, siteId) {
  try {
    const url = new URL(request.url);
    const productId = url.searchParams.get('productId');

    if (!productId) {
      return errorResponse('Product ID is required');
    }

    await env.DB.prepare(
      'DELETE FROM wishlists WHERE user_id = ? AND product_id = ? AND site_id = ?'
    ).bind(user.id, productId, siteId).run();

    return successResponse(null, 'Removed from wishlist');
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    return errorResponse('Failed to remove from wishlist', 500);
  }
}
