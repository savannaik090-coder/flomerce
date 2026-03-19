import { generateId, jsonResponse, errorResponse, successResponse, handleCORS } from '../../utils/helpers.js';
import { validateAuth, validateAnyAuth } from '../../utils/auth.js';
import { resolveSiteDBById, checkMigrationLock, ensureProductOptionsColumn } from '../../utils/site-db.js';
import { estimateRowBytes, trackD1Write, trackD1Update, trackD1Delete } from '../../utils/usage-tracker.js';


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

  const db = await resolveSiteDBById(env, siteId);
  const user = await validateAnyAuth(request, env, { siteId, db });
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
  const siteId = url.searchParams.get('siteId');
  const sessionId = url.searchParams.get('sessionId');

  if (!siteId) return errorResponse('Site ID is required');

  const db = await resolveSiteDBById(env, siteId);
  const user = await validateAnyAuth(request, env, { siteId, db });

  if (!user && !sessionId) return errorResponse('Authentication or session required');

  try {
    if (await checkMigrationLock(env, siteId)) {
      return errorResponse('Site is currently being migrated. Please try again shortly.', 423);
    }

    let cart = null;
    if (user) {
      cart = await db.prepare(
        'SELECT id, row_size_bytes FROM carts WHERE site_id = ? AND user_id = ?'
      ).bind(siteId, user.id).first();
    } else {
      cart = await db.prepare(
        'SELECT id, row_size_bytes FROM carts WHERE site_id = ? AND session_id = ?'
      ).bind(siteId, sessionId).first();
    }

    if (cart) {
      const oldBytes = cart.row_size_bytes || 0;
      const emptyCartData = { id: cart.id, site_id: siteId, items: '[]', subtotal: 0 };
      const newBytes = estimateRowBytes(emptyCartData);

      await db.prepare(
        `UPDATE carts SET items = '[]', subtotal = 0, row_size_bytes = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(newBytes, cart.id).run();

      await trackD1Update(env, siteId, oldBytes, newBytes);
    }

    return successResponse(null, 'Cart cleared');
  } catch (error) {
    console.error('Clear cart error:', error);
    return errorResponse('Failed to clear cart', 500);
  }
}

async function handleMergeCarts(request, env) {
  const url = new URL(request.url);
  const urlSiteId = url.searchParams.get('siteId');

  const clonedRequest = request.clone();
  const body = await clonedRequest.json();
  const siteId = urlSiteId || body.siteId;
  const sessionId = body.sessionId;

  if (!siteId || !sessionId) return errorResponse('siteId and sessionId are required');

  const db = await resolveSiteDBById(env, siteId);
  const user = await validateAnyAuth(request, env, { siteId, db });
  if (!user) return errorResponse('Authentication required', 401);

  try {
    await mergeCarts(env, siteId, user.id, sessionId);
    return successResponse(null, 'Carts merged');
  } catch (error) {
    console.error('Merge carts error:', error);
    return errorResponse('Failed to merge carts', 500);
  }
}

async function getOrCreateCart(db, env, siteId, user, sessionId) {
  let cart;

  if (user) {
    cart = await db.prepare(
      'SELECT * FROM carts WHERE site_id = ? AND user_id = ?'
    ).bind(siteId, user.id).first();
  } else {
    cart = await db.prepare(
      'SELECT * FROM carts WHERE site_id = ? AND session_id = ?'
    ).bind(siteId, sessionId).first();
  }

  if (!cart) {
    const cartId = generateId();
    const rowData = { id: cartId, site_id: siteId, user_id: user ? user.id : null, session_id: user ? null : sessionId, items: '[]' };
    const rowBytes = estimateRowBytes(rowData);

    await db.prepare(
      `INSERT INTO carts (id, site_id, user_id, session_id, items, subtotal, row_size_bytes, created_at)
       VALUES (?, ?, ?, ?, '[]', 0, ?, datetime('now'))`
    ).bind(cartId, siteId, user ? user.id : null, user ? null : sessionId, rowBytes).run();

    await trackD1Write(env, siteId, rowBytes);

    cart = { id: cartId, items: '[]', subtotal: 0, row_size_bytes: rowBytes };
  }

  return cart;
}

async function getCart(env, siteId, user, sessionId) {
  try {
    const db = await resolveSiteDBById(env, siteId);
    await ensureProductOptionsColumn(db, siteId);
    const cart = await getOrCreateCart(db, env, siteId, user, sessionId);
    const items = JSON.parse(cart.items);

    const enrichedItems = [];
    for (const item of items) {
      const product = await db.prepare(
        'SELECT id, name, price, stock, thumbnail_url, images, is_active, options FROM products WHERE id = ? AND site_id = ?'
      ).bind(item.productId, siteId).first();

      if (product && product.is_active) {
        let imageUrl = product.thumbnail_url;
        if (!imageUrl && product.images) {
          try {
            const imgs = JSON.parse(product.images);
            if (Array.isArray(imgs) && imgs.length > 0) imageUrl = imgs[0];
          } catch {}
        }
        let effectivePrice = product.price;
        const productOptions = product.options ? JSON.parse(product.options) : null;
        if (item.selectedOptions?.pricedOptions && productOptions?.pricedOptions) {
          const pricedEntries = Object.entries(item.selectedOptions.pricedOptions);
          const lastEntry = pricedEntries[pricedEntries.length - 1];
          if (lastEntry) {
            const [label, clientVal] = lastEntry;
            const optGroup = productOptions.pricedOptions.find(o => o.label === label);
            if (optGroup) {
              const dbVal = optGroup.values.find(v => v.name === clientVal.name);
              if (dbVal && Number(dbVal.price) > 0) effectivePrice = Number(dbVal.price);
            }
          }
        }
        enrichedItems.push({
          ...item,
          name: product.name,
          price: effectivePrice,
          basePrice: product.price,
          thumbnail: imageUrl,
          inStock: product.stock >= item.quantity,
          availableStock: product.stock,
          selectedOptions: item.selectedOptions || null,
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
    if (await checkMigrationLock(env, siteId)) {
      return errorResponse('Site is currently being migrated. Please try again shortly.', 423);
    }

    const { productId, quantity, variant, selectedOptions } = await request.json();

    if (!productId || !quantity || quantity < 1) {
      return errorResponse('Product ID and quantity are required');
    }

    const db = await resolveSiteDBById(env, siteId);

    const product = await db.prepare(
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

    const cart = await getOrCreateCart(db, env, siteId, user, sessionId);
    const items = JSON.parse(cart.items);
    const oldBytes = cart.row_size_bytes || 0;

    const optionsKey = selectedOptions ? JSON.stringify(selectedOptions) : null;
    const existingIndex = items.findIndex(item => 
      item.productId === productId && 
      JSON.stringify(item.variant) === JSON.stringify(variant) &&
      JSON.stringify(item.selectedOptions || null) === optionsKey
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
        selectedOptions: selectedOptions || null,
        addedAt: new Date().toISOString(),
      });
    }

    const newItemsStr = JSON.stringify(items);
    const newBytes = estimateRowBytes({ items: newItemsStr, cart_id: cart.id });

    await db.prepare(
      `UPDATE carts SET items = ?, row_size_bytes = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(newItemsStr, newBytes, cart.id).run();

    await trackD1Update(env, siteId, oldBytes, newBytes);

    return successResponse({ itemCount: items.reduce((sum, i) => sum + i.quantity, 0) }, 'Item added to cart');
  } catch (error) {
    console.error('Add to cart error:', error);
    return errorResponse('Failed to add item to cart', 500);
  }
}

async function updateCartItem(request, env, siteId, user, sessionId) {
  try {
    if (await checkMigrationLock(env, siteId)) {
      return errorResponse('Site is currently being migrated. Please try again shortly.', 423);
    }

    const { productId, quantity, variant, selectedOptions } = await request.json();

    if (!productId) {
      return errorResponse('Product ID is required');
    }

    const db = await resolveSiteDBById(env, siteId);
    const cart = await getOrCreateCart(db, env, siteId, user, sessionId);
    const items = JSON.parse(cart.items);
    const oldBytes = cart.row_size_bytes || 0;

    const optionsKey = selectedOptions ? JSON.stringify(selectedOptions) : null;
    const existingIndex = items.findIndex(item => 
      item.productId === productId && 
      JSON.stringify(item.variant) === JSON.stringify(variant) &&
      JSON.stringify(item.selectedOptions || null) === optionsKey
    );

    if (existingIndex < 0) {
      return errorResponse('Item not found in cart', 404);
    }

    if (quantity <= 0) {
      items.splice(existingIndex, 1);
    } else {
      const product = await db.prepare(
        'SELECT stock FROM products WHERE id = ? AND site_id = ?'
      ).bind(productId, siteId).first();

      if (product && quantity > product.stock) {
        return errorResponse('Insufficient stock', 400, 'INSUFFICIENT_STOCK');
      }

      items[existingIndex].quantity = quantity;
    }

    const newItemsStr = JSON.stringify(items);
    const newBytes = estimateRowBytes({ items: newItemsStr, cart_id: cart.id });

    await db.prepare(
      `UPDATE carts SET items = ?, row_size_bytes = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(newItemsStr, newBytes, cart.id).run();

    await trackD1Update(env, siteId, oldBytes, newBytes);

    return successResponse({ itemCount: items.reduce((sum, i) => sum + i.quantity, 0) }, 'Cart updated');
  } catch (error) {
    console.error('Update cart error:', error);
    return errorResponse('Failed to update cart', 500);
  }
}

async function removeFromCart(request, env, siteId, user, sessionId) {
  try {
    if (await checkMigrationLock(env, siteId)) {
      return errorResponse('Site is currently being migrated. Please try again shortly.', 423);
    }

    const url = new URL(request.url);
    const productId = url.searchParams.get('productId');
    const variant = url.searchParams.get('variant');
    const optionsParam = url.searchParams.get('selectedOptions');

    if (!productId) {
      return errorResponse('Product ID is required');
    }

    const db = await resolveSiteDBById(env, siteId);
    const cart = await getOrCreateCart(db, env, siteId, user, sessionId);
    const items = JSON.parse(cart.items);
    const oldBytes = cart.row_size_bytes || 0;

    const parsedVariant = variant ? variant : null;
    const parsedOptions = optionsParam ? optionsParam : null;
    const filteredItems = items.filter(item => {
      if (item.productId !== productId) return true;
      if (JSON.stringify(item.variant ?? null) !== JSON.stringify(parsedVariant)) return true;
      if (parsedOptions && JSON.stringify(item.selectedOptions || null) !== parsedOptions) return true;
      return false;
    });

    const newItemsStr = JSON.stringify(filteredItems);
    const newBytes = estimateRowBytes({ items: newItemsStr, cart_id: cart.id });

    await db.prepare(
      `UPDATE carts SET items = ?, row_size_bytes = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(newItemsStr, newBytes, cart.id).run();

    await trackD1Update(env, siteId, oldBytes, newBytes);

    return successResponse({ itemCount: filteredItems.reduce((sum, i) => sum + i.quantity, 0) }, 'Item removed from cart');
  } catch (error) {
    console.error('Remove from cart error:', error);
    return errorResponse('Failed to remove item from cart', 500);
  }
}

export async function mergeCarts(env, siteId, userId, sessionId) {
  try {
    const db = await resolveSiteDBById(env, siteId);

    const guestCart = await db.prepare(
      'SELECT * FROM carts WHERE site_id = ? AND session_id = ?'
    ).bind(siteId, sessionId).first();

    if (!guestCart) return;

    const userCart = await db.prepare(
      'SELECT * FROM carts WHERE site_id = ? AND user_id = ?'
    ).bind(siteId, userId).first();

    const guestItems = JSON.parse(guestCart.items);

    if (userCart) {
      const userItems = JSON.parse(userCart.items);
      const oldBytes = userCart.row_size_bytes || 0;

      for (const guestItem of guestItems) {
        const existingIndex = userItems.findIndex(item => 
          item.productId === guestItem.productId && 
          JSON.stringify(item.variant) === JSON.stringify(guestItem.variant) &&
          JSON.stringify(item.selectedOptions || null) === JSON.stringify(guestItem.selectedOptions || null)
        );

        if (existingIndex >= 0) {
          userItems[existingIndex].quantity += guestItem.quantity;
        } else {
          userItems.push(guestItem);
        }
      }

      const newItemsStr = JSON.stringify(userItems);
      const newBytes = estimateRowBytes({ items: newItemsStr, cart_id: userCart.id });

      await db.prepare(
        `UPDATE carts SET items = ?, row_size_bytes = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(newItemsStr, newBytes, userCart.id).run();

      await trackD1Update(env, siteId, oldBytes, newBytes);
    } else {
      await db.prepare(
        `UPDATE carts SET user_id = ?, session_id = NULL, updated_at = datetime('now') WHERE id = ?`
      ).bind(userId, guestCart.id).run();
      return;
    }

    const guestBytes = guestCart.row_size_bytes || 0;
    await db.prepare('DELETE FROM carts WHERE id = ?').bind(guestCart.id).run();
    if (guestBytes > 0) {
      await trackD1Delete(env, siteId, guestBytes);
    }
  } catch (error) {
    console.error('Merge carts error:', error);
  }
}

export async function clearCart(env, siteId, userId) {
  try {
    const db = await resolveSiteDBById(env, siteId);
    const cart = await db.prepare(
      'SELECT id, row_size_bytes FROM carts WHERE site_id = ? AND user_id = ?'
    ).bind(siteId, userId).first();

    if (cart) {
      const oldBytes = cart.row_size_bytes || 0;
      const newBytes = estimateRowBytes({ id: cart.id, site_id: siteId, items: '[]', subtotal: 0 });

      await db.prepare(
        `UPDATE carts SET items = '[]', subtotal = 0, row_size_bytes = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(newBytes, cart.id).run();

      await trackD1Update(env, siteId, oldBytes, newBytes);
    }
  } catch (error) {
    console.error('Clear cart error:', error);
  }
}
