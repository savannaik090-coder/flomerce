import { generateId, jsonResponse, errorResponse, successResponse, handleCORS } from '../../utils/helpers.js';
import { validateAuth } from '../../utils/auth.js';


export async function handleCart(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;

  const method = request.method;
  const url = new URL(request.url);
  const pathParts = path.split('/').filter(Boolean);
  const subAction = pathParts[2];

  if (subAction === 'clear') {
    return handleClearCart(request, env, url);
  }

  if (subAction === 'merge') {
    return handleMergeCarts(request, env);
  }

  const siteId = url.searchParams.get('siteId');

  if (!siteId) {
    return errorResponse('Site ID is required');
  }

  const user = await validateAuth(request, env);
  const sessionId = request.headers.get('X-Session-ID') || url.searchParams.get('sessionId');

  if (!user && !sessionId) {
    return errorResponse('User authentication or session ID required');
  }

  switch (method) {
    case 'GET':
      return getCart(env, siteId, user, sessionId);
    case 'POST':
      return addToCart(request, env, siteId, user, sessionId);
    case 'PUT':
      return updateCartItem(request, env, siteId, user, sessionId);
    case 'DELETE':
      return removeFromCart(request, env, siteId, user, sessionId);
    default:
      return errorResponse('Method not allowed', 405);
  }
}

async function handleClearCart(request, env, url) {
  const user = await validateAuth(request, env);
  const siteId = url.searchParams.get('siteId');
  const sessionId = url.searchParams.get('sessionId');

  if (!siteId) return errorResponse('Site ID is required');
  if (!user && !sessionId) return errorResponse('Authentication or session required');

  try {
    if (user) {
      await env.DB.prepare(
        `UPDATE carts SET items = '[]', subtotal = 0, updated_at = datetime('now') WHERE site_id = ? AND user_id = ?`
      ).bind(siteId, user.id).run();
    } else {
      await env.DB.prepare(
        `UPDATE carts SET items = '[]', subtotal = 0, updated_at = datetime('now') WHERE site_id = ? AND session_id = ?`
      ).bind(siteId, sessionId).run();
    }
    return successResponse(null, 'Cart cleared');
  } catch (error) {
    console.error('Clear cart error:', error);
    return errorResponse('Failed to clear cart', 500);
  }
}

async function handleMergeCarts(request, env) {
  const user = await validateAuth(request, env);
  if (!user) return errorResponse('Authentication required', 401);

  try {
    const { siteId, sessionId } = await request.json();
    if (!siteId || !sessionId) return errorResponse('siteId and sessionId are required');

    await mergeCarts(env, siteId, user.id, sessionId);
    return successResponse(null, 'Carts merged');
  } catch (error) {
    console.error('Merge carts error:', error);
    return errorResponse('Failed to merge carts', 500);
  }
}

async function getOrCreateCart(env, siteId, user, sessionId) {
  let cart;

  if (user) {
    cart = await env.DB.prepare(
      'SELECT * FROM carts WHERE site_id = ? AND user_id = ?'
    ).bind(siteId, user.id).first();
  } else {
    cart = await env.DB.prepare(
      'SELECT * FROM carts WHERE site_id = ? AND session_id = ?'
    ).bind(siteId, sessionId).first();
  }

  if (!cart) {
    const cartId = generateId();
    await env.DB.prepare(
      `INSERT INTO carts (id, site_id, user_id, session_id, items, subtotal, created_at)
       VALUES (?, ?, ?, ?, '[]', 0, datetime('now'))`
    ).bind(cartId, siteId, user ? user.id : null, user ? null : sessionId).run();

    cart = { id: cartId, items: '[]', subtotal: 0 };
  }

  return cart;
}

async function getCart(env, siteId, user, sessionId) {
  try {
    const cart = await getOrCreateCart(env, siteId, user, sessionId);
    const items = JSON.parse(cart.items);

    const enrichedItems = [];
    for (const item of items) {
      const product = await env.DB.prepare(
        'SELECT id, name, price, stock, thumbnail_url, is_active FROM products WHERE id = ?'
      ).bind(item.productId).first();

      if (product && product.is_active) {
        enrichedItems.push({
          ...item,
          name: product.name,
          price: product.price,
          thumbnail: product.thumbnail_url,
          inStock: product.stock >= item.quantity,
          availableStock: product.stock,
        });
      }
    }

    const subtotal = enrichedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return successResponse({
      id: cart.id,
      items: enrichedItems,
      itemCount: enrichedItems.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
    });
  } catch (error) {
    console.error('Get cart error:', error);
    return errorResponse('Failed to fetch cart', 500);
  }
}

async function addToCart(request, env, siteId, user, sessionId) {
  try {
    const { productId, quantity, variant } = await request.json();

    if (!productId || !quantity || quantity < 1) {
      return errorResponse('Product ID and quantity are required');
    }

    const product = await env.DB.prepare(
      'SELECT id, stock, is_active FROM products WHERE id = ? AND site_id = ?'
    ).bind(productId, siteId).first();

    if (!product) {
      return errorResponse('Product not found', 404);
    }

    if (!product.is_active) {
      return errorResponse('Product is not available', 400);
    }

    if (product.stock < quantity) {
      return errorResponse('Insufficient stock', 400, 'INSUFFICIENT_STOCK');
    }

    const cart = await getOrCreateCart(env, siteId, user, sessionId);
    const items = JSON.parse(cart.items);

    const existingIndex = items.findIndex(item => 
      item.productId === productId && 
      JSON.stringify(item.variant) === JSON.stringify(variant)
    );

    if (existingIndex >= 0) {
      const newQuantity = items[existingIndex].quantity + quantity;
      if (newQuantity > product.stock) {
        return errorResponse('Insufficient stock', 400, 'INSUFFICIENT_STOCK');
      }
      items[existingIndex].quantity = newQuantity;
    } else {
      items.push({
        productId,
        quantity,
        variant: variant || null,
        addedAt: new Date().toISOString(),
      });
    }

    await env.DB.prepare(
      `UPDATE carts SET items = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(JSON.stringify(items), cart.id).run();

    return successResponse({ itemCount: items.reduce((sum, i) => sum + i.quantity, 0) }, 'Item added to cart');
  } catch (error) {
    console.error('Add to cart error:', error);
    return errorResponse('Failed to add item to cart', 500);
  }
}

async function updateCartItem(request, env, siteId, user, sessionId) {
  try {
    const { productId, quantity, variant } = await request.json();

    if (!productId) {
      return errorResponse('Product ID is required');
    }

    const cart = await getOrCreateCart(env, siteId, user, sessionId);
    const items = JSON.parse(cart.items);

    const existingIndex = items.findIndex(item => 
      item.productId === productId && 
      JSON.stringify(item.variant) === JSON.stringify(variant)
    );

    if (existingIndex < 0) {
      return errorResponse('Item not found in cart', 404);
    }

    if (quantity <= 0) {
      items.splice(existingIndex, 1);
    } else {
      const product = await env.DB.prepare(
        'SELECT stock FROM products WHERE id = ?'
      ).bind(productId).first();

      if (product && quantity > product.stock) {
        return errorResponse('Insufficient stock', 400, 'INSUFFICIENT_STOCK');
      }

      items[existingIndex].quantity = quantity;
    }

    await env.DB.prepare(
      `UPDATE carts SET items = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(JSON.stringify(items), cart.id).run();

    return successResponse({ itemCount: items.reduce((sum, i) => sum + i.quantity, 0) }, 'Cart updated');
  } catch (error) {
    console.error('Update cart error:', error);
    return errorResponse('Failed to update cart', 500);
  }
}

async function removeFromCart(request, env, siteId, user, sessionId) {
  try {
    const url = new URL(request.url);
    const productId = url.searchParams.get('productId');
    const variant = url.searchParams.get('variant');

    if (!productId) {
      return errorResponse('Product ID is required');
    }

    const cart = await getOrCreateCart(env, siteId, user, sessionId);
    const items = JSON.parse(cart.items);

    const parsedVariant = variant ? variant : null;
    const filteredItems = items.filter(item => 
      !(item.productId === productId && JSON.stringify(item.variant ?? null) === JSON.stringify(parsedVariant))
    );

    await env.DB.prepare(
      `UPDATE carts SET items = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(JSON.stringify(filteredItems), cart.id).run();

    return successResponse({ itemCount: filteredItems.reduce((sum, i) => sum + i.quantity, 0) }, 'Item removed from cart');
  } catch (error) {
    console.error('Remove from cart error:', error);
    return errorResponse('Failed to remove item from cart', 500);
  }
}

export async function mergeCarts(env, siteId, userId, sessionId) {
  try {
    const guestCart = await env.DB.prepare(
      'SELECT * FROM carts WHERE site_id = ? AND session_id = ?'
    ).bind(siteId, sessionId).first();

    if (!guestCart) return;

    const userCart = await env.DB.prepare(
      'SELECT * FROM carts WHERE site_id = ? AND user_id = ?'
    ).bind(siteId, userId).first();

    const guestItems = JSON.parse(guestCart.items);

    if (userCart) {
      const userItems = JSON.parse(userCart.items);

      for (const guestItem of guestItems) {
        const existingIndex = userItems.findIndex(item => 
          item.productId === guestItem.productId && 
          JSON.stringify(item.variant) === JSON.stringify(guestItem.variant)
        );

        if (existingIndex >= 0) {
          userItems[existingIndex].quantity += guestItem.quantity;
        } else {
          userItems.push(guestItem);
        }
      }

      await env.DB.prepare(
        `UPDATE carts SET items = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(JSON.stringify(userItems), userCart.id).run();
    } else {
      await env.DB.prepare(
        `UPDATE carts SET user_id = ?, session_id = NULL, updated_at = datetime('now') WHERE id = ?`
      ).bind(userId, guestCart.id).run();
      return;
    }

    await env.DB.prepare('DELETE FROM carts WHERE id = ?').bind(guestCart.id).run();
  } catch (error) {
    console.error('Merge carts error:', error);
  }
}

export async function clearCart(env, siteId, userId) {
  try {
    await env.DB.prepare(
      `UPDATE carts SET items = '[]', subtotal = 0, updated_at = datetime('now') 
       WHERE site_id = ? AND user_id = ?`
    ).bind(siteId, userId).run();
  } catch (error) {
    console.error('Clear cart error:', error);
  }
}
