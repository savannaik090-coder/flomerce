import { generateId, jsonResponse, errorResponse, successResponse, handleCORS } from '../../utils/helpers.js';
import { validateAuth, validateAnyAuth } from '../../utils/auth.js';
import { resolveSiteDBById, checkMigrationLock } from '../../utils/site-db.js';
import { estimateRowBytes, trackD1Write, trackD1Delete } from '../../utils/usage-tracker.js';

export async function handleWishlist(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;

  const pathParts = path.split('/').filter(Boolean);
  const subAction = pathParts[2];
  const url = new URL(request.url);
  const siteId = url.searchParams.get('siteId');

  if (subAction === 'check') {
    return checkWishlist(request, env, siteId);
  }

  if (!siteId) {
    return errorResponse('Site ID is required');
  }

  const db = await resolveSiteDBById(env, siteId);
  const user = await validateAnyAuth(request, env, { siteId, db });
  if (!user) {
    return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const method = request.method;

  switch (method) {
    case 'GET':
      return getWishlist(env, user, siteId, db);
    case 'POST':
      return addToWishlist(request, env, user, siteId, db);
    case 'DELETE':
      return removeFromWishlist(request, env, user, siteId, db);
    default:
      return errorResponse('Method not allowed', 405);
  }
}

async function checkWishlist(request, env, siteId) {
  const url = new URL(request.url);
  if (!siteId) siteId = url.searchParams.get('siteId');
  const productId = url.searchParams.get('productId');

  if (!siteId || !productId) {
    return errorResponse('siteId and productId are required');
  }

  const db = await resolveSiteDBById(env, siteId);
  const user = await validateAnyAuth(request, env, { siteId, db });
  if (!user) {
    return successResponse({ inWishlist: false });
  }

  try {
    const existing = await db.prepare(
      'SELECT id FROM wishlists WHERE user_id = ? AND product_id = ? AND site_id = ?'
    ).bind(user.id, productId, siteId).first();

    return successResponse({ inWishlist: !!existing });
  } catch (error) {
    console.error('Check wishlist error:', error);
    return successResponse({ inWishlist: false });
  }
}

async function getWishlist(env, user, siteId, db) {
  try {
    const wishlistItems = await db.prepare(
      `SELECT w.id, w.product_id, w.created_at,
              p.name, p.price, p.compare_price, p.thumbnail_url, p.images, p.stock, p.is_active
       FROM wishlists w
       JOIN products p ON w.product_id = p.id
       WHERE w.user_id = ? AND w.site_id = ?
       ORDER BY w.created_at DESC`
    ).bind(user.id, siteId).all();

    const items = wishlistItems.results.map(item => {
      let imageUrl = item.thumbnail_url;
      if (!imageUrl && item.images) {
        try {
          const imgs = JSON.parse(item.images);
          if (Array.isArray(imgs) && imgs.length > 0) imageUrl = imgs[0];
        } catch {}
      }
      return {
        id: item.id,
        productId: item.product_id,
        name: item.name,
        price: item.price,
        comparePrice: item.compare_price,
        thumbnail: imageUrl,
        inStock: item.stock > 0,
        isActive: !!item.is_active,
        addedAt: item.created_at,
      };
    });

    return successResponse({
      items,
      count: items.length,
    });
  } catch (error) {
    console.error('Get wishlist error:', error);
    return errorResponse('Failed to fetch wishlist', 500);
  }
}

async function addToWishlist(request, env, user, siteId, db) {
  try {
    if (await checkMigrationLock(env, siteId)) {
      return errorResponse('Site is currently being migrated. Please try again shortly.', 423);
    }

    const { productId } = await request.json();

    if (!productId) {
      return errorResponse('Product ID is required');
    }

    const product = await db.prepare(
      'SELECT id FROM products WHERE id = ? AND site_id = ? AND is_active = 1'
    ).bind(productId, siteId).first();

    if (!product) {
      return errorResponse('Product not found', 404);
    }

    const existing = await db.prepare(
      'SELECT id FROM wishlists WHERE user_id = ? AND product_id = ? AND site_id = ?'
    ).bind(user.id, productId, siteId).first();

    if (existing) {
      return errorResponse('Product already in wishlist', 400, 'ALREADY_EXISTS');
    }

    const wishlistId = generateId();
    const rowData = { id: wishlistId, site_id: siteId, user_id: user.id, product_id: productId };
    const rowBytes = estimateRowBytes(rowData);

    await db.prepare(
      `INSERT INTO wishlists (id, site_id, user_id, product_id, row_size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    ).bind(wishlistId, siteId, user.id, productId, rowBytes).run();

    await trackD1Write(env, siteId, rowBytes);

    return successResponse({ id: wishlistId }, 'Added to wishlist');
  } catch (error) {
    console.error('Add to wishlist error:', error);
    return errorResponse('Failed to add to wishlist', 500);
  }
}

async function removeFromWishlist(request, env, user, siteId, db) {
  try {
    if (await checkMigrationLock(env, siteId)) {
      return errorResponse('Site is currently being migrated. Please try again shortly.', 423);
    }

    const url = new URL(request.url);
    const productId = url.searchParams.get('productId');

    if (!productId) {
      return errorResponse('Product ID is required');
    }

    const existing = await db.prepare(
      'SELECT id, row_size_bytes FROM wishlists WHERE user_id = ? AND product_id = ? AND site_id = ?'
    ).bind(user.id, productId, siteId).first();

    if (existing) {
      await db.prepare(
        'DELETE FROM wishlists WHERE user_id = ? AND product_id = ? AND site_id = ?'
      ).bind(user.id, productId, siteId).run();

      const bytesToRemove = existing.row_size_bytes || 0;
      if (bytesToRemove > 0) {
        await trackD1Delete(env, siteId, bytesToRemove);
      }
    }

    return successResponse(null, 'Removed from wishlist');
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    return errorResponse('Failed to remove from wishlist', 500);
  }
}
