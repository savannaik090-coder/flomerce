import { generateId, generateOrderNumber, jsonResponse, errorResponse, successResponse, handleCORS } from '../../utils/helpers.js';
import { validateAuth, validateAnyAuth } from '../../utils/auth.js';
import { updateProductStock } from './products-worker.js';
import { deductStockByLocation } from './inventory-locations-worker.js';
import { sendEmail, buildOrderConfirmationEmail, buildOwnerNotificationEmail, buildCancellationCustomerEmail, buildCancellationOwnerEmail, buildDeliveryCustomerEmail, buildDeliveryOwnerEmail, buildNewOrderReviewEmail, buildOrderPackedEmail, buildOrderShippedEmail, buildCancellationRequestNotifyEmail, buildCancellationStatusEmail } from '../../utils/email.js';
import { checkUsageLimit, estimateRowBytes, trackD1Write, trackD1Update } from '../../utils/usage-tracker.js';
import { resolveSiteDBById, checkMigrationLock, getSiteConfig, ensureProductOptionsColumn } from '../../utils/site-db.js';
import { PLATFORM_DOMAIN } from '../../config.js';

export async function handleOrders(request, env, path, ctx) {
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;

  const method = request.method;
  const pathParts = path.split('/').filter(Boolean);
  const orderId = pathParts[2];
  const action = pathParts[3];

  if (orderId === 'returns' && !action) {
    return handleReturnsList(request, env);
  }

  if (orderId === 'returns' && action) {
    return handleReturnUpdate(request, env, action);
  }

  if (orderId === 'cancellations' && !action) {
    return handleCancellationsList(request, env);
  }

  if (orderId === 'cancellations' && action) {
    return handleCancellationUpdate(request, env, action);
  }

  if (orderId === 'validate-stock' && method === 'POST') {
    return validateStock(request, env);
  }

  if (action === 'guest') {
    return handleGuestOrder(request, env, method, orderId, ctx);
  }

  if (action === 'track') {
    return trackOrder(env, orderId, request);
  }

  if (action === 'cancel' && method === 'POST') {
    return createCancellationRequest(request, env, orderId);
  }

  if (action === 'cancel' && method === 'GET') {
    return getCancelStatus(request, env, orderId);
  }

  if (action === 'cancel-link' && method === 'POST') {
    return resendCancelLink(request, env, orderId);
  }

  if (action === 'return' && method === 'POST') {
    return createReturnRequest(request, env, orderId);
  }

  if (action === 'return' && method === 'GET') {
    return getReturnStatus(request, env, orderId);
  }

  if (action === 'return-link' && method === 'POST') {
    return resendReturnLink(request, env, orderId);
  }

  if (action === 'invoice' && method === 'GET') {
    return getInvoiceData(request, env, orderId);
  }

  if (orderId === 'public-invoice' && method === 'GET') {
    return getPublicInvoice(request, env);
  }

  if (orderId === 'analytics' && method === 'GET') {
    return getAnalytics(request, env);
  }

  const url = new URL(request.url);
  const siteId = url.searchParams.get('siteId');

  let db = null;
  if (siteId) {
    db = await resolveSiteDBById(env, siteId);
  }
  const user = await validateAnyAuth(request, env, { siteId, db });

  switch (method) {
    case 'GET':
      if (orderId) {
        return getOrder(env, user, orderId, request, db);
      }
      return getOrders(request, env, user, db);
    case 'POST':
      return createOrder(request, env, user, ctx);
    case 'PUT':
      return updateOrderStatus(request, env, user, orderId);
    default:
      return errorResponse('Method not allowed', 405);
  }
}

async function validateStock(request, env) {
  try {
    const { siteId, items } = await request.json();
    if (!siteId || !items || !items.length) {
      return errorResponse('siteId and items are required', 400);
    }

    const db = await resolveSiteDBById(env, siteId);
    const outOfStockItems = [];

    for (const item of items) {
      const productId = item.productId || item.product_id || item.id;
      if (!productId) continue;

      const product = await db.prepare(
        'SELECT id, name, stock FROM products WHERE id = ? AND site_id = ?'
      ).bind(productId, siteId).first();

      if (!product) {
        outOfStockItems.push({ productId, name: item.name || 'Unknown product', reason: 'not_found' });
        continue;
      }

      if (product.stock !== null && product.stock <= 0) {
        outOfStockItems.push({ productId, name: product.name, reason: 'out_of_stock', available: 0 });
      } else if (product.stock !== null && product.stock < (item.quantity || 1)) {
        outOfStockItems.push({ productId, name: product.name, reason: 'insufficient_stock', available: product.stock, requested: item.quantity || 1 });
      }
    }

    if (outOfStockItems.length > 0) {
      const names = outOfStockItems.map(i => {
        if (i.reason === 'out_of_stock' || i.reason === 'not_found') return `${i.name} is out of stock`;
        return `${i.name} — only ${i.available} left (you requested ${i.requested})`;
      });
      return jsonResponse({ success: false, error: names.join('; '), code: 'STOCK_VALIDATION_FAILED', outOfStockItems }, 400);
    }

    return successResponse({ valid: true }, 'All items are in stock');
  } catch (error) {
    console.error('Validate stock error:', error);
    return errorResponse('Failed to validate stock', 500);
  }
}

async function getOrders(request, env, user, preResolvedDb) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get('siteId');
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit')) || 50;
    const offset = parseInt(url.searchParams.get('offset')) || 0;

    const db = preResolvedDb || await resolveSiteDBById(env, siteId);

    let query = 'SELECT * FROM orders WHERE 1=1';
    const bindings = [];

    const authHeader = request.headers.get('Authorization');
    let isSiteAdmin = false;

    if (authHeader && authHeader.startsWith('SiteAdmin ') && siteId) {
      const { validateSiteAdmin, hasPermission } = await import('./site-admin-worker.js');
      const admin = await validateSiteAdmin(request, env, siteId);
      if (admin) {
        if (!hasPermission(admin, 'orders')) {
          return errorResponse('You do not have permission to access orders', 403);
        }
        isSiteAdmin = true;
      }
    }

    if (isSiteAdmin && siteId) {
      query += ' AND site_id = ?';
      bindings.push(siteId);
    } else if (user) {
      if (siteId) {
        if (user.type === 'owner') {
          const site = await env.DB.prepare(
            'SELECT id FROM sites WHERE id = ? AND user_id = ?'
          ).bind(siteId, user.id).first();

          if (site) {
            query += ' AND site_id = ?';
            bindings.push(siteId);
          } else {
            query += ' AND user_id = ? AND site_id = ?';
            bindings.push(user.id, siteId);
          }
        } else {
          query += ' AND user_id = ? AND site_id = ?';
          bindings.push(user.id, siteId);
        }
      } else {
        query += ' AND user_id = ?';
        bindings.push(user.id);
      }
    }

    if (status) {
      query += ' AND status = ?';
      bindings.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    bindings.push(limit, offset);

    const orders = await db.prepare(query).bind(...bindings).all();

    const parsedOrders = orders.results.map(order => ({
      ...order,
      items: JSON.parse(order.items),
      shipping_address: JSON.parse(order.shipping_address),
      billing_address: order.billing_address ? JSON.parse(order.billing_address) : null,
    }));

    return successResponse(parsedOrders);
  } catch (error) {
    console.error('Get orders error:', error);
    return errorResponse('Failed to fetch orders', 500);
  }
}

async function getOrder(env, user, orderId, request, preResolvedDb) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get('siteId');
    const db = preResolvedDb || await resolveSiteDBById(env, siteId);

    let query = 'SELECT * FROM orders WHERE (id = ? OR order_number = ?)';
    const bindings = [orderId, orderId];

    if (siteId) {
      query += ' AND site_id = ?';
      bindings.push(siteId);
    }

    const authHeader = request ? request.headers.get('Authorization') : null;
    if (authHeader && authHeader.startsWith('SiteAdmin ')) {
      const orderCheckQuery = siteId
        ? 'SELECT site_id FROM orders WHERE (id = ? OR order_number = ?) AND site_id = ?'
        : 'SELECT site_id FROM orders WHERE id = ? OR order_number = ?';
      const orderCheckBindings = siteId ? [orderId, orderId, siteId] : [orderId, orderId];
      const orderCheck = await db.prepare(orderCheckQuery).bind(...orderCheckBindings).first();
      if (orderCheck) {
        const { validateSiteAdmin, hasPermission } = await import('./site-admin-worker.js');
        const admin = await validateSiteAdmin(request, env, orderCheck.site_id);
        if (admin && hasPermission(admin, 'orders')) {
          query += ' AND site_id = ?';
          bindings.push(orderCheck.site_id);
        } else {
          return errorResponse('Order not found or unauthorized', 404, 'NOT_FOUND');
        }
      }
    } else if (user) {
      if (user.type === 'customer') {
        query += ' AND user_id = ?';
        bindings.push(user.id);
      } else {
        const userSiteIds = await env.DB.prepare(
          'SELECT id FROM sites WHERE user_id = ?'
        ).bind(user.id).all();
        const siteIds = (userSiteIds.results || []).map(s => s.id);
        if (siteIds.length > 0) {
          const placeholders = siteIds.map(() => '?').join(',');
          query += ` AND (user_id = ? OR site_id IN (${placeholders}))`;
          bindings.push(user.id, ...siteIds);
        } else {
          query += ' AND user_id = ?';
          bindings.push(user.id);
        }
      }
    } else {
      return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const order = await db.prepare(query).bind(...bindings).first();

    if (!order) {
      return errorResponse('Order not found', 404, 'NOT_FOUND');
    }

    return successResponse({
      ...order,
      items: JSON.parse(order.items),
      shipping_address: JSON.parse(order.shipping_address),
      billing_address: order.billing_address ? JSON.parse(order.billing_address) : null,
    });
  } catch (error) {
    console.error('Get order error:', error);
    return errorResponse('Failed to fetch order', 500);
  }
}

async function createOrder(request, env, user, ctx) {
  try {
    const data = await request.json();
    const { siteId, items, shippingAddress, billingAddress, customerName, customerEmail, customerPhone, paymentMethod, notes, couponCode, currency: orderCurrency } = data;

    const missingFields = [];
    if (!siteId) missingFields.push('siteId');
    if (!items || !items.length) missingFields.push('items');
    if (!shippingAddress) missingFields.push('shippingAddress');
    if (!customerName) missingFields.push('customerName');
    if (!customerPhone) missingFields.push('customerPhone');

    if (missingFields.length > 0) {
      console.error('Order missing fields:', missingFields.join(', '), 'Received data keys:', Object.keys(data).join(', '));
      return errorResponse(`Missing required fields: ${missingFields.join(', ')}`);
    }

    if (await checkMigrationLock(env, siteId)) {
      return errorResponse('Site is currently being migrated. Please try again shortly.', 423);
    }

    const db = await resolveSiteDBById(env, siteId);
    await ensureProductOptionsColumn(db, siteId);

    let siteDefaultCurrency = 'INR';
    try {
      const siteConf = await getSiteConfig(env, siteId);
      if (siteConf?.settings) {
        const s = typeof siteConf.settings === 'string' ? JSON.parse(siteConf.settings) : siteConf.settings;
        if (s.defaultCurrency) siteDefaultCurrency = s.defaultCurrency;
      }
    } catch (e) {}

    let subtotal = 0;
    const processedItems = [];

    for (const item of items) {
      const itemProductId = item.productId || item.product_id;
      if (!itemProductId) {
        return errorResponse('Invalid item: missing product ID', 400);
      }

      const product = await db.prepare(
        'SELECT id, name, price, stock, thumbnail_url, options, gst_rate, hsn_code FROM products WHERE id = ? AND site_id = ?'
      ).bind(itemProductId, siteId).first();

      if (!product) {
        return errorResponse(`Product not found: ${itemProductId}`, 400);
      }

      if (product.stock !== null && product.stock < item.quantity) {
        return errorResponse(`Insufficient stock for ${product.name}`, 400, 'INSUFFICIENT_STOCK');
      }

      let effectivePrice = product.price;
      const productOptions = product.options ? JSON.parse(product.options) : null;
      const validatedSelectedOptions = item.selectedOptions ? { ...item.selectedOptions } : null;
      if (validatedSelectedOptions?.pricedOptions && productOptions?.pricedOptions) {
        const validatedPriced = {};
        const pricedEntries = Object.entries(validatedSelectedOptions.pricedOptions);
        for (const [label, clientVal] of pricedEntries) {
          const optGroup = productOptions.pricedOptions.find(o => o.label === label);
          if (optGroup) {
            const dbVal = optGroup.values.find(v => v.name === clientVal.name);
            if (dbVal) {
              const serverPrice = Number(dbVal.price || 0);
              validatedPriced[label] = { name: dbVal.name, price: serverPrice };
            }
          }
        }
        validatedSelectedOptions.pricedOptions = validatedPriced;
        const lastEntry = pricedEntries[pricedEntries.length - 1];
        if (lastEntry) {
          const [label] = lastEntry;
          if (validatedPriced[label] && Number(validatedPriced[label].price) > 0) {
            effectivePrice = Number(validatedPriced[label].price);
          }
        }
      }

      const itemTotal = effectivePrice * item.quantity;
      subtotal += itemTotal;

      processedItems.push({
        productId: product.id,
        name: product.name,
        price: effectivePrice,
        basePrice: product.price,
        quantity: item.quantity,
        total: itemTotal,
        thumbnail: product.thumbnail_url,
        variant: item.variant || null,
        selectedOptions: validatedSelectedOptions,
        gst_rate: product.gst_rate || 0,
        hsn_code: product.hsn_code || '',
      });
    }

    let discount = 0;
    let appliedCouponCode = null;
    if (couponCode) {
      let coupon = null;
      try {
        coupon = await db.prepare(
          `SELECT * FROM coupons WHERE site_id = ? AND code = ? AND is_active = 1 
           AND (starts_at IS NULL OR starts_at <= datetime('now'))
           AND (expires_at IS NULL OR expires_at > datetime('now'))
           AND (usage_limit IS NULL OR used_count < usage_limit)`
        ).bind(siteId, couponCode.toUpperCase()).first();
      } catch (couponErr) {
        console.error('Coupon lookup error (table may not exist):', couponErr);
      }

      if (coupon && subtotal >= (coupon.min_order_value || 0)) {
        if (coupon.type === 'percentage') {
          discount = (subtotal * coupon.value) / 100;
          if (coupon.max_discount && discount > coupon.max_discount) {
            discount = coupon.max_discount;
          }
        } else {
          discount = coupon.value;
        }
        appliedCouponCode = couponCode.toUpperCase();
        const oldCouponRow = await db.prepare('SELECT row_size_bytes FROM coupons WHERE id = ?').bind(coupon.id).first();
        const oldCouponBytes = oldCouponRow?.row_size_bytes || 0;
        await db.prepare(
          'UPDATE coupons SET used_count = used_count + 1 WHERE id = ?'
        ).bind(coupon.id).run();
        const updatedCoupon = await db.prepare('SELECT * FROM coupons WHERE id = ?').bind(coupon.id).first();
        if (updatedCoupon) {
          const newCouponBytes = estimateRowBytes(updatedCoupon);
          await db.prepare('UPDATE coupons SET row_size_bytes = ? WHERE id = ?').bind(newCouponBytes, coupon.id).run();
          await trackD1Update(env, siteId, oldCouponBytes, newCouponBytes);
        }
      } else {
        try {
          const siteConfig = await getSiteConfig(env, siteId);
          if (siteConfig.settings) {
            let siteSettings = siteConfig.settings;
            if (typeof siteSettings === 'string') siteSettings = JSON.parse(siteSettings);
            const settingsCoupons = Array.isArray(siteSettings.coupons) ? siteSettings.coupons : [];
            const sc = settingsCoupons.find(c => c.active && c.code.toUpperCase() === couponCode.toUpperCase());
            if (sc) {
              const minOrder = parseFloat(sc.minOrder) || 0;
              const expOk = !sc.expiryDate || new Date(sc.expiryDate) >= new Date();
              if (subtotal >= minOrder && expOk) {
                if (sc.type === 'percent') {
                  discount = (subtotal * parseFloat(sc.value)) / 100;
                } else {
                  discount = parseFloat(sc.value) || 0;
                }
                discount = Math.min(discount, subtotal);
                appliedCouponCode = couponCode.toUpperCase();
              }
            }
          }
        } catch (settingsCouponErr) {
          console.error('Settings coupon lookup error:', settingsCouponErr);
        }
      }
    }

    let shippingCost = 0;
    try {
      const siteConf = await getSiteConfig(env, siteId);
      let s = {};
      if (siteConf?.settings) {
        s = typeof siteConf.settings === 'string' ? JSON.parse(siteConf.settings) : siteConf.settings;
      }
      const dc = s.deliveryConfig || {};
      if (dc.enabled) {
        const orderSubtotalAfterDiscount = Math.max(0, subtotal - discount);
        if (dc.freeAboveEnabled && dc.freeAbove > 0 && orderSubtotalAfterDiscount >= dc.freeAbove) {
          shippingCost = 0;
        } else {
          let matched = false;
          if (shippingAddress && Array.isArray(dc.regionRates)) {
            const customerCountry = shippingAddress.country || '';
            const customerState = shippingAddress.state || '';
            if (customerCountry && customerState) {
              const csMatch = dc.regionRates.find(r => r.country === customerCountry && r.state === customerState);
              if (csMatch && csMatch.rate !== '' && csMatch.rate != null) {
                shippingCost = Number(csMatch.rate) || 0;
                matched = true;
              }
            }
            if (!matched && customerCountry) {
              const cMatch = dc.regionRates.find(r => r.country === customerCountry && (!r.state || r.state === ''));
              if (cMatch && cMatch.rate !== '' && cMatch.rate != null) {
                shippingCost = Number(cMatch.rate) || 0;
                matched = true;
              }
            }
            if (!matched && customerState) {
              const legacyMatch = dc.regionRates.find(r => !r.country && r.state === customerState);
              if (legacyMatch && legacyMatch.rate !== '' && legacyMatch.rate != null) {
                shippingCost = Number(legacyMatch.rate) || 0;
                matched = true;
              }
            }
          }
          if (!matched) {
            shippingCost = Number(dc.flatRate) || 0;
          }
        }
      }
    } catch (e) {
      console.error('Shipping config error:', e);
    }
    let tax = 0;
    for (const pi of processedItems) {
      const rate = Number(pi.gst_rate) || 0;
      if (rate > 0) {
        tax += (pi.total * rate) / 100;
      }
    }
    tax = Math.round(tax * 100) / 100;
    const total = subtotal - discount + shippingCost + tax;

    const orderId = generateId();
    const orderNumber = generateOrderNumber();

    const isPendingPayment = paymentMethod === 'razorpay';
    const orderStatus = isPendingPayment ? 'pending_payment' : (data.status || 'pending');

    const rowData = { id: orderId, site_id: siteId, order_number: orderNumber, items: processedItems, subtotal, discount, total, payment_method: paymentMethod, shipping_address: shippingAddress, billing_address: billingAddress, customer_name: customerName, customer_email: customerEmail, customer_phone: customerPhone, coupon_code: appliedCouponCode, notes };
    const rowBytes = estimateRowBytes(rowData);

    const usageCheck = await checkUsageLimit(env, siteId, 'd1', rowBytes);
    if (!usageCheck.allowed) {
      return errorResponse(usageCheck.reason, 403, 'STORAGE_LIMIT');
    }

    const resolvedCurrency = orderCurrency || siteDefaultCurrency;
    await db.prepare(
      `INSERT INTO orders (id, site_id, user_id, order_number, items, subtotal, discount, shipping_cost, tax, total, currency, payment_method, status, shipping_address, billing_address, customer_name, customer_email, customer_phone, coupon_code, notes, row_size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      orderId,
      siteId,
      user ? user.id : null,
      orderNumber,
      JSON.stringify(processedItems),
      subtotal,
      discount,
      shippingCost,
      tax,
      total,
      resolvedCurrency,
      paymentMethod || 'pending',
      orderStatus,
      JSON.stringify(shippingAddress),
      billingAddress ? JSON.stringify(billingAddress) : null,
      customerName,
      customerEmail || null,
      customerPhone,
      appliedCouponCode || null,
      notes || null,
      rowBytes
    ).run();

    await trackD1Write(env, siteId, rowBytes);

    const orderDb = await resolveSiteDBById(env, siteId);
    for (const item of processedItems) {
      const locationDeducted = await deductStockByLocation(orderDb, siteId, item.productId, item.quantity);
      if (!locationDeducted) {
        await updateProductStock(env, item.productId, item.quantity, 'decrement', siteId, ctx);
      }
    }

    if (!isPendingPayment) {
      try {
        await sendOrderEmails(env, siteId, {
          orderId, orderNumber, processedItems, subtotal, discount, coupon_code: appliedCouponCode, shippingCost, total, paymentMethod, customerName, customerEmail, customerPhone, shippingAddress, isGuest: false, currency: resolvedCurrency, created_at: new Date().toISOString()
        });
      } catch (emailErr) {
        console.error('Order email notification error:', emailErr);
      }
    }

    return successResponse({
      id: orderId,
      orderNumber,
      total,
      items: processedItems,
    }, 'Order created successfully');
  } catch (error) {
    console.error('Create order error:', error.message || error, error.stack || '');
    return errorResponse('Failed to create order: ' + (error.message || 'Unknown error'), 500);
  }
}

async function updateOrderStatus(request, env, user, orderId) {
  if (!orderId) {
    return errorResponse('Order ID is required');
  }

  try {
    let order;
    let siteId = null;
    if (user && user.type === 'customer') {
      return errorResponse('Customers cannot update order status', 403);
    }

    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('SiteAdmin ')) {
      const { validateSiteAdmin, hasPermission } = await import('./site-admin-worker.js');
      const url = new URL(request.url);
      let adminSiteId = url.searchParams.get('siteId');
      if (!adminSiteId) {
        try {
          const cloned = request.clone();
          const body = await cloned.json();
          adminSiteId = body.siteId;
        } catch (e) {}
      }
      if (adminSiteId) {
        const admin = await validateSiteAdmin(request, env, adminSiteId);
        if (admin && hasPermission(admin, 'orders')) {
          const sdb = await resolveSiteDBById(env, adminSiteId);
          let found = await sdb.prepare('SELECT id, site_id, status, row_size_bytes FROM orders WHERE id = ? AND site_id = ?').bind(orderId, adminSiteId).first();
          if (!found) {
            found = await sdb.prepare('SELECT id, site_id, status, row_size_bytes FROM guest_orders WHERE id = ? AND site_id = ?').bind(orderId, adminSiteId).first();
          }
          if (found) {
            order = found;
            siteId = adminSiteId;
          }
        }
      }
    }

    if (!order && user) {
      const userSites = await env.DB.prepare(
        'SELECT id FROM sites WHERE user_id = ?'
      ).bind(user.id).all();
      
      for (const s of (userSites.results || [])) {
        const sdb = await resolveSiteDBById(env, s.id);
        let found = await sdb.prepare(
          'SELECT id, site_id, status, row_size_bytes FROM orders WHERE id = ? AND site_id = ?'
        ).bind(orderId, s.id).first();
        if (!found) {
          found = await sdb.prepare(
            'SELECT id, site_id, status, row_size_bytes FROM guest_orders WHERE id = ? AND site_id = ?'
          ).bind(orderId, s.id).first();
        }
        if (found) {
          order = found;
          siteId = s.id;
          break;
        }
      }
    }

    if (!order) {
      return errorResponse('Order not found or unauthorized', 404);
    }

    const resolvedSiteId = siteId || order.site_id;

    if (await checkMigrationLock(env, resolvedSiteId)) {
      return errorResponse('Site is currently being migrated. Please try again shortly.', 423);
    }

    const db = await resolveSiteDBById(env, resolvedSiteId);

    const { status, trackingNumber, carrier, cancellationReason } = await request.json();

    const updates = [];
    const values = [];

    if (status) {
      updates.push('status = ?');
      values.push(status);

      if (status === 'confirmed') {
        updates.push('confirmed_at = datetime("now")');
        try { await db.prepare(`ALTER TABLE orders ADD COLUMN confirmed_at TEXT`).run(); } catch {}
      } else if (status === 'packed') {
        updates.push('packed_at = datetime("now")');
        try { await db.prepare(`ALTER TABLE orders ADD COLUMN packed_at TEXT`).run(); } catch {}
      } else if (status === 'shipped') {
        updates.push('shipped_at = datetime("now")');
      } else if (status === 'delivered') {
        updates.push('delivered_at = datetime("now")');
      } else if (status === 'cancelled') {
        updates.push('cancelled_at = datetime("now")');
        if (cancellationReason) {
          try {
            await db.prepare(
              `ALTER TABLE orders ADD COLUMN cancellation_reason TEXT`
            ).run();
          } catch {}
          updates.push('cancellation_reason = ?');
          values.push(cancellationReason);
        }
      }
    }

    if (trackingNumber) {
      updates.push('tracking_number = ?');
      values.push(trackingNumber);
    }

    if (carrier) {
      updates.push('carrier = ?');
      values.push(carrier);
    }

    if (updates.length === 0) {
      return errorResponse('No valid fields to update');
    }

    const oldBytes = order.row_size_bytes || 0;

    updates.push('updated_at = datetime("now")');
    values.push(orderId);

    const isRegularOrder = await db.prepare('SELECT id FROM orders WHERE id = ?').bind(orderId).first();
    const tableName = isRegularOrder ? 'orders' : 'guest_orders';

    await db.prepare(
      `UPDATE ${tableName} SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    const updatedOrderRow = await db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).bind(orderId).first();
    const newBytes = updatedOrderRow ? estimateRowBytes(updatedOrderRow) : oldBytes;
    if (updatedOrderRow) {
      await db.prepare(`UPDATE ${tableName} SET row_size_bytes = ? WHERE id = ?`).bind(newBytes, orderId).run();
    }
    await trackD1Update(env, resolvedSiteId, oldBytes, newBytes);

    if (status === 'cancelled') {
      const prevStatus = order.status || order.prev_status;
      if (prevStatus && prevStatus !== 'cancelled') {
        try {
          let cancelledOrder = await db.prepare('SELECT items, site_id FROM orders WHERE id = ?').bind(orderId).first();
          if (!cancelledOrder) {
            cancelledOrder = await db.prepare('SELECT items, site_id FROM guest_orders WHERE id = ?').bind(orderId).first();
          }
          if (cancelledOrder) {
            const cancelItems = typeof cancelledOrder.items === 'string' ? JSON.parse(cancelledOrder.items) : cancelledOrder.items;
            for (const item of cancelItems) {
              await updateProductStock(env, item.productId, item.quantity, 'increment', cancelledOrder.site_id);
            }
          }
        } catch (stockRestoreErr) {
          console.error('Failed to restore stock on cancellation:', stockRestoreErr);
        }
      }
    }

    if (status === 'cancelled' && cancellationReason) {
      try {
        const fullOrder = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
        if (fullOrder) {
          const cancelConfig = await getSiteConfig(env, fullOrder.site_id);
          const siteBrandName = cancelConfig.brand_name || 'Store';
          let cancelSettings = {};
          try { if (cancelConfig.settings) cancelSettings = typeof cancelConfig.settings === 'string' ? JSON.parse(cancelConfig.settings) : cancelConfig.settings; } catch (e) {}
          const ownerEmail = cancelSettings.email || cancelSettings.ownerEmail || cancelConfig.email;
          const cancelCurrency = fullOrder.currency || cancelSettings.defaultCurrency || 'INR';

          const storeTz = cancelSettings.timezone || '';
          const emailOrder = {
            order_number: fullOrder.order_number,
            customer_name: fullOrder.customer_name,
            customer_email: fullOrder.customer_email,
            customer_phone: fullOrder.customer_phone,
            total: fullOrder.total,
            payment_method: fullOrder.payment_method,
            created_at: fullOrder.created_at,
          };

          const emailJobs = [];
          if (fullOrder.customer_email) {
            const { html, text } = buildCancellationCustomerEmail(emailOrder, siteBrandName, cancellationReason, ownerEmail, cancelCurrency, storeTz);
            emailJobs.push(sendEmail(env, fullOrder.customer_email, `Your order #${fullOrder.order_number} has been cancelled`, html, text).catch(e => console.error('Cancellation customer email error:', e)));
          }
          if (ownerEmail) {
            const { html, text } = buildCancellationOwnerEmail(emailOrder, siteBrandName, cancellationReason, cancelCurrency, storeTz);
            emailJobs.push(sendEmail(env, ownerEmail, `Order #${fullOrder.order_number} cancelled - ${siteBrandName}`, html, text).catch(e => console.error('Cancellation owner email error:', e)));
          }
          await Promise.all(emailJobs);
        }
      } catch (emailErr) {
        console.error('Failed to send cancellation emails:', emailErr);
      }
    }

    if (status === 'confirmed' || status === 'packed' || status === 'shipped') {
      try {
        const fullOrder = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
        if (fullOrder && fullOrder.customer_email) {
          const statusConfig = await getSiteConfig(env, fullOrder.site_id);
          const siteBrandName = statusConfig.brand_name || 'Store';
          let statusSettings = {};
          try { if (statusConfig.settings) statusSettings = typeof statusConfig.settings === 'string' ? JSON.parse(statusConfig.settings) : statusConfig.settings; } catch (e) {}
          const ownerEmail = statusSettings.email || statusSettings.ownerEmail || statusConfig.email;
          const statusCurrency = fullOrder.currency || statusSettings.defaultCurrency || 'INR';

          const site = await env.DB.prepare('SELECT subdomain, custom_domain FROM sites WHERE id = ?').bind(fullOrder.site_id).first();
          const domain = site?.custom_domain || `${site?.subdomain || 'store'}.${env.DOMAIN || PLATFORM_DOMAIN}`;

          const trackingUrl = `https://${domain}/order-track?orderId=${fullOrder.order_number}`;

          const storeTz = statusSettings.timezone || '';
          const emailOrder = {
            order_number: fullOrder.order_number,
            customer_name: fullOrder.customer_name,
            customer_email: fullOrder.customer_email,
            customer_phone: fullOrder.customer_phone,
            total: fullOrder.total,
            payment_method: fullOrder.payment_method,
            items: fullOrder.items,
            shipping_address: fullOrder.shipping_address,
            subtotal: fullOrder.subtotal,
            discount: fullOrder.discount,
            shipping_cost: fullOrder.shipping_cost || 0,
            coupon_code: fullOrder.coupon_code,
            created_at: fullOrder.created_at,
          };

          let emailOptions = { trackingUrl };
          if (status === 'confirmed' && statusSettings.cancellationEnabled && fullOrder.customer_email) {
            try {
              const cancelToken = generateReturnToken();
              try { await db.prepare(`ALTER TABLE orders ADD COLUMN cancel_token TEXT`).run(); } catch (e) {}
              await db.prepare(`UPDATE orders SET cancel_token = ? WHERE id = ?`).bind(cancelToken, orderId).run();
              emailOptions.helpUrl = `https://${domain}/order-help/${fullOrder.order_number}?cancelToken=${cancelToken}`;
            } catch (e) {
              console.error('Cancel token generation error:', e);
            }
          }

          if (status === 'confirmed' && statusSettings.gstInvoiceEmailEnabled && fullOrder.customer_email) {
            try {
              const invoiceToken = generateReturnToken();
              try { await db.prepare(`ALTER TABLE orders ADD COLUMN invoice_token TEXT`).run(); } catch (e) {}
              try { await db.prepare(`ALTER TABLE guest_orders ADD COLUMN invoice_token TEXT`).run(); } catch (e) {}
              const orderTable = (await db.prepare('SELECT id FROM orders WHERE id = ?').bind(orderId).first()) ? 'orders' : 'guest_orders';
              await db.prepare(`UPDATE ${orderTable} SET invoice_token = ? WHERE id = ?`).bind(invoiceToken, orderId).run();
              emailOptions.invoiceUrl = `https://${domain}/invoice?order=${fullOrder.order_number}&t=${invoiceToken}&subdomain=${encodeURIComponent(site?.subdomain || '')}`;
            } catch (e) {
              console.error('Invoice token generation error:', e);
            }
          }

          if (status === 'confirmed') {
            const { html, text } = buildOrderConfirmationEmail(emailOrder, siteBrandName, ownerEmail, statusCurrency, emailOptions, storeTz);
            await sendEmail(env, fullOrder.customer_email, `Order Confirmed #${fullOrder.order_number} - ${siteBrandName}`, html, text).catch(e => console.error('Confirmation email error:', e));
          } else if (status === 'packed') {
            const { html, text } = buildOrderPackedEmail(emailOrder, siteBrandName, ownerEmail, statusCurrency, { trackingUrl }, storeTz);
            await sendEmail(env, fullOrder.customer_email, `Your order #${fullOrder.order_number} has been packed! - ${siteBrandName}`, html, text).catch(e => console.error('Packed email error:', e));
          } else if (status === 'shipped') {
            const shipOptions = { trackingUrl, trackingNumber: fullOrder.tracking_number || trackingNumber, carrier: fullOrder.carrier || carrier };
            const { html, text } = buildOrderShippedEmail(emailOrder, siteBrandName, ownerEmail, statusCurrency, shipOptions, storeTz);
            await sendEmail(env, fullOrder.customer_email, `Your order #${fullOrder.order_number} has been shipped! - ${siteBrandName}`, html, text).catch(e => console.error('Shipped email error:', e));
          }
        }
      } catch (emailErr) {
        console.error('Failed to send status update email:', emailErr);
      }
    }

    if (status === 'delivered') {
      try {
        let fullOrder = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
        let isGuestOrder = false;
        if (!fullOrder) {
          fullOrder = await db.prepare('SELECT * FROM guest_orders WHERE id = ?').bind(orderId).first();
          isGuestOrder = true;
        }
        if (fullOrder) {
          const orderTable = isGuestOrder ? 'guest_orders' : 'orders';
          const deliveryConfig = await getSiteConfig(env, fullOrder.site_id);
          const siteBrandName = deliveryConfig.brand_name || 'Store';
          let deliverySettings = {};
          try { if (deliveryConfig.settings) deliverySettings = typeof deliveryConfig.settings === 'string' ? JSON.parse(deliveryConfig.settings) : deliveryConfig.settings; } catch (e) {}
          const ownerEmail = deliverySettings.email || deliverySettings.ownerEmail || deliveryConfig.email;
          const deliveryCurrency = fullOrder.currency || deliverySettings.defaultCurrency || 'INR';
          const storeTz = deliverySettings.timezone || '';

          const emailOrder = {
            order_number: fullOrder.order_number,
            customer_name: fullOrder.customer_name,
            customer_email: fullOrder.customer_email,
            customer_phone: fullOrder.customer_phone,
            total: fullOrder.total,
            payment_method: fullOrder.payment_method,
            items: fullOrder.items,
            created_at: fullOrder.created_at,
          };

          let deliveryEmailOptions = {};
          const site = await env.DB.prepare('SELECT subdomain, custom_domain FROM sites WHERE id = ?').bind(fullOrder.site_id).first();
          const delivDomain = site?.custom_domain || `${site?.subdomain || 'store'}.${env.DOMAIN || PLATFORM_DOMAIN}`;

          if (deliverySettings.returnsEnabled && fullOrder.customer_email) {
            try {
              const returnToken = generateReturnToken();
              try { await db.prepare(`ALTER TABLE ${orderTable} ADD COLUMN return_token TEXT`).run(); } catch (e) {}
              await db.prepare(`UPDATE ${orderTable} SET return_token = ? WHERE id = ?`).bind(returnToken, orderId).run();
              deliveryEmailOptions.helpUrl = `https://${delivDomain}/order-help/${fullOrder.order_number}?returnToken=${returnToken}`;
            } catch (e) {
              console.error('Return token generation error:', e);
            }
          }

          if (deliverySettings.reviewsEnabled !== false && fullOrder.customer_email) {
            try {
              const reviewToken = generateReturnToken();
              try { await db.prepare(`ALTER TABLE ${orderTable} ADD COLUMN review_token TEXT`).run(); } catch (e) {}
              await db.prepare(`UPDATE ${orderTable} SET review_token = ? WHERE id = ?`).bind(reviewToken, orderId).run();
              let orderItems = [];
              try { orderItems = typeof fullOrder.items === 'string' ? JSON.parse(fullOrder.items) : (fullOrder.items || []); } catch (e) {}
              deliveryEmailOptions.reviewUrl = `https://${delivDomain}/review/${fullOrder.id}?token=${reviewToken}`;
              deliveryEmailOptions.reviewItems = orderItems.slice(0, 3).map(item => ({
                name: item.name,
                image: item.image || item.thumbnail_url || '',
                slug: item.slug || '',
              }));
              deliveryEmailOptions.storeDomain = `https://${delivDomain}`;
            } catch (e) {
              console.error('Review token generation error:', e);
            }
          }

          const emailJobs = [];
          if (fullOrder.customer_email) {
            try {
              const { html, text } = buildDeliveryCustomerEmail(emailOrder, siteBrandName, ownerEmail, deliveryCurrency, deliveryEmailOptions, storeTz);
              emailJobs.push(sendEmail(env, fullOrder.customer_email, `Your order #${fullOrder.order_number} has been delivered!`, html, text).catch(e => console.error('Delivery customer email send error:', e)));
            } catch (buildErr) {
              console.error('Delivery customer email build error:', buildErr);
            }
          }
          if (ownerEmail) {
            try {
              const { html, text } = buildDeliveryOwnerEmail(emailOrder, siteBrandName, deliveryCurrency, storeTz);
              emailJobs.push(sendEmail(env, ownerEmail, `Order #${fullOrder.order_number} delivered - ${siteBrandName}`, html, text).catch(e => console.error('Delivery owner email send error:', e)));
            } catch (buildErr) {
              console.error('Delivery owner email build error:', buildErr);
            }
          }
          await Promise.all(emailJobs);
        }
      } catch (emailErr) {
        console.error('Failed to send delivery emails:', emailErr);
      }
    }

    return successResponse(null, 'Order updated successfully');
  } catch (error) {
    console.error('Update order error:', error);
    return errorResponse('Failed to update order', 500);
  }
}

async function handleGuestOrder(request, env, method, orderId, ctx) {
  if (method === 'POST') {
    return createGuestOrder(request, env, ctx);
  }
  if (method === 'GET' && orderId) {
    return getGuestOrder(env, orderId, request);
  }
  return errorResponse('Method not allowed', 405);
}

async function createGuestOrder(request, env, ctx) {
  try {
    const data = await request.json();
    const { siteId, items, shippingAddress, customerName, customerEmail, customerPhone, paymentMethod, currency: guestOrderCurrency } = data;

    const missingFields = [];
    if (!siteId) missingFields.push('siteId');
    if (!items || !items.length) missingFields.push('items');
    if (!shippingAddress) missingFields.push('shippingAddress');
    if (!customerName) missingFields.push('customerName');
    if (!customerPhone) missingFields.push('customerPhone');

    if (missingFields.length > 0) {
      console.error('Guest order missing fields:', missingFields.join(', '), 'Received data keys:', Object.keys(data).join(', '));
      return errorResponse(`Missing required fields: ${missingFields.join(', ')}`);
    }

    if (await checkMigrationLock(env, siteId)) {
      return errorResponse('Site is currently being migrated. Please try again shortly.', 423);
    }

    const db = await resolveSiteDBById(env, siteId);
    await ensureProductOptionsColumn(db, siteId);

    let guestSiteDefaultCurrency = 'INR';
    try {
      const siteConf = await getSiteConfig(env, siteId);
      if (siteConf?.settings) {
        const s = typeof siteConf.settings === 'string' ? JSON.parse(siteConf.settings) : siteConf.settings;
        if (s.defaultCurrency) guestSiteDefaultCurrency = s.defaultCurrency;
      }
    } catch (e) {}

    let subtotal = 0;
    const processedItems = [];

    for (const item of items) {
      const itemProductId = item.productId || item.product_id;
      if (!itemProductId) {
        return errorResponse('Invalid item: missing product ID', 400);
      }

      const product = await db.prepare(
        'SELECT id, name, price, stock, thumbnail_url, options, gst_rate, hsn_code FROM products WHERE id = ? AND site_id = ?'
      ).bind(itemProductId, siteId).first();

      if (!product) {
        return errorResponse(`Product not found: ${itemProductId}`, 400);
      }

      let effectivePrice = product.price;
      const productOptions = product.options ? JSON.parse(product.options) : null;
      const validatedSelectedOptions = item.selectedOptions ? { ...item.selectedOptions } : null;
      if (validatedSelectedOptions?.pricedOptions && productOptions?.pricedOptions) {
        const validatedPriced = {};
        const pricedEntries = Object.entries(validatedSelectedOptions.pricedOptions);
        for (const [label, clientVal] of pricedEntries) {
          const optGroup = productOptions.pricedOptions.find(o => o.label === label);
          if (optGroup) {
            const dbVal = optGroup.values.find(v => v.name === clientVal.name);
            if (dbVal) {
              const serverPrice = Number(dbVal.price || 0);
              validatedPriced[label] = { name: dbVal.name, price: serverPrice };
            }
          }
        }
        validatedSelectedOptions.pricedOptions = validatedPriced;
        const lastEntry = pricedEntries[pricedEntries.length - 1];
        if (lastEntry) {
          const [label] = lastEntry;
          if (validatedPriced[label] && Number(validatedPriced[label].price) > 0) {
            effectivePrice = Number(validatedPriced[label].price);
          }
        }
      }

      const itemTotal = effectivePrice * item.quantity;
      subtotal += itemTotal;

      processedItems.push({
        productId: product.id,
        name: product.name,
        price: effectivePrice,
        basePrice: product.price,
        quantity: item.quantity,
        total: itemTotal,
        thumbnail: product.thumbnail_url,
        selectedOptions: validatedSelectedOptions,
        gst_rate: product.gst_rate || 0,
        hsn_code: product.hsn_code || '',
      });
    }

    let guestShippingCost = 0;
    try {
      const siteConf2 = await getSiteConfig(env, siteId);
      let s2 = {};
      if (siteConf2?.settings) {
        s2 = typeof siteConf2.settings === 'string' ? JSON.parse(siteConf2.settings) : siteConf2.settings;
      }
      const dc2 = s2.deliveryConfig || {};
      if (dc2.enabled) {
        if (dc2.freeAboveEnabled && dc2.freeAbove > 0 && subtotal >= dc2.freeAbove) {
          guestShippingCost = 0;
        } else {
          let matched2 = false;
          if (shippingAddress && Array.isArray(dc2.regionRates)) {
            const customerCountry2 = shippingAddress.country || '';
            const customerState2 = shippingAddress.state || '';
            if (customerCountry2 && customerState2) {
              const csMatch2 = dc2.regionRates.find(r => r.country === customerCountry2 && r.state === customerState2);
              if (csMatch2 && csMatch2.rate !== '' && csMatch2.rate != null) {
                guestShippingCost = Number(csMatch2.rate) || 0;
                matched2 = true;
              }
            }
            if (!matched2 && customerCountry2) {
              const cMatch2 = dc2.regionRates.find(r => r.country === customerCountry2 && (!r.state || r.state === ''));
              if (cMatch2 && cMatch2.rate !== '' && cMatch2.rate != null) {
                guestShippingCost = Number(cMatch2.rate) || 0;
                matched2 = true;
              }
            }
            if (!matched2 && customerState2) {
              const legacyMatch2 = dc2.regionRates.find(r => !r.country && r.state === customerState2);
              if (legacyMatch2 && legacyMatch2.rate !== '' && legacyMatch2.rate != null) {
                guestShippingCost = Number(legacyMatch2.rate) || 0;
                matched2 = true;
              }
            }
          }
          if (!matched2) {
            guestShippingCost = Number(dc2.flatRate) || 0;
          }
        }
      }
    } catch (e) {
      console.error('Guest shipping config error:', e);
    }
    let guestTax = 0;
    for (const pi of processedItems) {
      const rate = Number(pi.gst_rate) || 0;
      if (rate > 0) {
        guestTax += (pi.total * rate) / 100;
      }
    }
    guestTax = Math.round(guestTax * 100) / 100;
    const total = subtotal + guestShippingCost + guestTax;
    const orderId = generateId();
    const orderNumber = generateOrderNumber();

    const rowData = { id: orderId, site_id: siteId, order_number: orderNumber, items: processedItems, subtotal, total, shipping_address: shippingAddress, customer_name: customerName, customer_email: customerEmail, customer_phone: customerPhone };
    const rowBytes = estimateRowBytes(rowData);

    const usageCheck = await checkUsageLimit(env, siteId, 'd1', rowBytes);
    if (!usageCheck.allowed) {
      return errorResponse(usageCheck.reason, 403, 'STORAGE_LIMIT');
    }

    const isPendingPayment = paymentMethod === 'razorpay';
    const orderStatus = isPendingPayment ? 'pending_payment' : 'pending';

    const resolvedGuestCurrency = guestOrderCurrency || guestSiteDefaultCurrency;
    await db.prepare(
      `INSERT INTO guest_orders (id, site_id, order_number, items, subtotal, shipping_cost, tax, total, currency, payment_method, status, shipping_address, customer_name, customer_email, customer_phone, row_size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      orderId, siteId, orderNumber, JSON.stringify(processedItems), subtotal, guestShippingCost, guestTax, total,
      resolvedGuestCurrency,
      paymentMethod || 'cod', orderStatus,
      JSON.stringify(shippingAddress), customerName, customerEmail || null, customerPhone,
      rowBytes
    ).run();

    await trackD1Write(env, siteId, rowBytes);

    const guestOrderDb = await resolveSiteDBById(env, siteId);
    for (const item of processedItems) {
      const locationDeducted = await deductStockByLocation(guestOrderDb, siteId, item.productId, item.quantity);
      if (!locationDeducted) {
        await updateProductStock(env, item.productId, item.quantity, 'decrement', siteId, ctx);
      }
    }

    if (!isPendingPayment) {
      try {
        await sendOrderEmails(env, siteId, {
          orderId, orderNumber, processedItems, subtotal, discount: 0, coupon_code: null, shippingCost: guestShippingCost, total, paymentMethod, customerName, customerEmail, customerPhone, shippingAddress, isGuest: true, currency: resolvedGuestCurrency, created_at: new Date().toISOString()
        });
      } catch (emailErr) {
        console.error('Guest order email notification error:', emailErr);
      }
    }

    return successResponse({
      id: orderId,
      orderNumber,
      total,
      items: processedItems,
    }, 'Guest order created successfully');
  } catch (error) {
    console.error('Create guest order error:', error.message || error, error.stack || '');
    return errorResponse('Failed to create guest order: ' + (error.message || 'Unknown error'), 500);
  }
}

async function getGuestOrder(env, orderId, request) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get('siteId');
    const db = await resolveSiteDBById(env, siteId);

    let query = 'SELECT * FROM guest_orders WHERE (id = ? OR order_number = ?)';
    const bindings = [orderId, orderId];

    if (siteId) {
      query += ' AND site_id = ?';
      bindings.push(siteId);
    }

    const order = await db.prepare(query).bind(...bindings).first();

    if (!order) {
      return errorResponse('Order not found', 404, 'NOT_FOUND');
    }

    return successResponse({
      ...order,
      items: JSON.parse(order.items),
      shipping_address: JSON.parse(order.shipping_address),
    });
  } catch (error) {
    console.error('Get guest order error:', error);
    return errorResponse('Failed to fetch order', 500);
  }
}

async function trackOrder(env, orderId, request) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get('siteId');
    const db = await resolveSiteDBById(env, siteId);

    let order = null;

    const siteClause = siteId ? ' AND site_id = ?' : '';

    for (const table of ['orders', 'guest_orders']) {
      if (order) break;
      const binds = siteId ? [orderId, orderId, siteId] : [orderId, orderId];
      try {
        order = await db.prepare(
          `SELECT id, order_number, status, tracking_number, carrier, confirmed_at, packed_at, shipped_at, delivered_at, created_at FROM ${table} WHERE (id = ? OR order_number = ?)${siteClause}`
        ).bind(...binds).first();
      } catch (colErr) {
        order = await db.prepare(
          `SELECT id, order_number, status, tracking_number, carrier, shipped_at, delivered_at, created_at FROM ${table} WHERE (id = ? OR order_number = ?)${siteClause}`
        ).bind(...binds).first();
      }
    }

    if (!order) {
      return errorResponse('Order not found', 404, 'NOT_FOUND');
    }

    return successResponse(order);
  } catch (error) {
    console.error('Track order error:', error);
    return errorResponse('Failed to track order', 500);
  }
}

async function ensureReturnRequestsTable(db) {
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS return_requests (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      order_id TEXT NOT NULL,
      order_number TEXT,
      items TEXT,
      reason TEXT NOT NULL,
      reason_detail TEXT,
      photos TEXT,
      resolution TEXT,
      status TEXT DEFAULT 'requested',
      admin_note TEXT,
      refund_amount REAL,
      refund_id TEXT,
      return_token TEXT,
      customer_name TEXT,
      customer_email TEXT,
      customer_phone TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`).run();
    try { await db.prepare(`ALTER TABLE return_requests ADD COLUMN resolution TEXT`).run(); } catch (e) {}
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_return_requests_site ON return_requests(site_id)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_return_requests_order ON return_requests(order_id)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_return_requests_token ON return_requests(return_token)').run();
  } catch (e) {}
}

function generateReturnToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(48);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => chars[b % chars.length]).join('');
}

async function createReturnRequest(request, env, orderId) {
  try {
    const data = await request.json();
    const { siteId, items, reason, reasonDetail, photos, resolution, returnToken } = data;
    if (!siteId || !orderId) return errorResponse('siteId and orderId are required');
    if (!reason) return errorResponse('Reason is required');

    const db = await resolveSiteDBById(env, siteId);
    await ensureReturnRequestsTable(db);

    const config = await getSiteConfig(env, siteId);
    let settings = {};
    try { if (config.settings) settings = typeof config.settings === 'string' ? JSON.parse(config.settings) : config.settings; } catch (e) {}
    if (!settings.returnsEnabled) return errorResponse('Returns are not enabled for this store', 403);

    let order = await db.prepare('SELECT * FROM orders WHERE (id = ? OR order_number = ?) AND site_id = ?').bind(orderId, orderId, siteId).first();
    let isGuest = false;
    if (!order) {
      order = await db.prepare('SELECT * FROM guest_orders WHERE (id = ? OR order_number = ?) AND site_id = ?').bind(orderId, orderId, siteId).first();
      isGuest = true;
    }
    if (!order) return errorResponse('Order not found', 404);

    if ((order.status || '').toLowerCase() !== 'delivered') {
      return errorResponse('Only delivered orders can be returned', 400);
    }

    const returnWindowDays = settings.returnWindowDays || 7;
    const deliveredAt = order.delivered_at || order.updated_at || order.created_at;
    if (deliveredAt) {
      const deliveryDate = new Date(deliveredAt);
      const now = new Date();
      const daysSinceDelivery = (now - deliveryDate) / (1000 * 60 * 60 * 24);
      if (daysSinceDelivery > returnWindowDays) {
        return errorResponse(`Return window of ${returnWindowDays} days has expired`, 400);
      }
    }

    if (isGuest) {
      if (!returnToken) return errorResponse('Return token is required for guest orders', 403);
      const storedToken = order.return_token;
      if (!storedToken || storedToken !== returnToken) {
        return errorResponse('Invalid return token', 403);
      }
    } else {
      if (returnToken) {
        const storedToken = order.return_token;
        if (!storedToken || storedToken !== returnToken) {
          return errorResponse('Invalid return token', 403);
        }
      } else {
        const user = await validateAnyAuth(request, env, { siteId, db });
        if (!user) return errorResponse('Authentication required', 401);
        if (order.user_id && order.user_id !== user.id) {
          return errorResponse('You can only return your own orders', 403);
        }
      }
    }

    const existing = await db.prepare('SELECT id FROM return_requests WHERE order_id = ? AND site_id = ?').bind(order.id, siteId).first();
    if (existing) return errorResponse('A return request already exists for this order', 409);

    const returnId = generateId();
    await db.prepare(
      `INSERT INTO return_requests (id, site_id, order_id, order_number, items, reason, reason_detail, photos, resolution, status, return_token, customer_name, customer_email, customer_phone, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'requested', ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      returnId, siteId, order.id, order.order_number,
      items ? JSON.stringify(items) : order.items,
      reason, reasonDetail || null,
      photos ? JSON.stringify(photos) : null,
      resolution || null,
      order.return_token || null,
      order.customer_name, order.customer_email || null, order.customer_phone || null
    ).run();

    try {
      const brandName = config.brand_name || 'Store';
      const ownerEmail = settings.email || settings.ownerEmail || config.email;
      if (ownerEmail) {
        const { html, text } = buildReturnRequestEmail(order, brandName, reason, reasonDetail);
        await sendEmail(env, ownerEmail, `Return Request #${order.order_number} - ${brandName}`, html, text).catch(() => {});
      }
    } catch (e) {}

    return successResponse({ id: returnId, status: 'requested' }, 'Return request submitted successfully');
  } catch (error) {
    console.error('Create return request error:', error);
    return errorResponse('Failed to create return request: ' + error.message, 500);
  }
}

async function getReturnStatus(request, env, orderId) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get('siteId');
    const returnToken = url.searchParams.get('token');
    if (!siteId) return errorResponse('siteId is required');

    const db = await resolveSiteDBById(env, siteId);
    await ensureReturnRequestsTable(db);

    const ret = await db.prepare(
      'SELECT * FROM return_requests WHERE (order_id = ? OR order_number = ?) AND site_id = ?'
    ).bind(orderId, orderId, siteId).first();

    if (!ret) return successResponse(null, 'No return request found');

    if (returnToken) {
      if (!ret.return_token || ret.return_token !== returnToken) {
        return errorResponse('Invalid token', 403);
      }
    }

    const safeRet = { id: ret.id, order_id: ret.order_id, order_number: ret.order_number, status: ret.status, admin_note: ret.admin_note, refund_amount: ret.refund_amount, reason: ret.reason, reason_detail: ret.reason_detail, resolution: ret.resolution, created_at: ret.created_at, updated_at: ret.updated_at };
    return successResponse(safeRet);
  } catch (error) {
    console.error('Get return status error:', error);
    return errorResponse('Failed to get return status', 500);
  }
}

async function handleReturnsList(request, env) {
  if (request.method !== 'GET') return errorResponse('Method not allowed', 405);

  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get('siteId');
    if (!siteId) return errorResponse('siteId is required');

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('SiteAdmin ')) {
      const user = await validateAnyAuth(request, env, { siteId });
      if (!user) return errorResponse('Authentication required', 401);
      const site = await env.DB.prepare('SELECT id FROM sites WHERE id = ? AND user_id = ?').bind(siteId, user.id).first();
      if (!site) return errorResponse('Unauthorized', 403);
    } else {
      const { validateSiteAdmin, hasPermission } = await import('./site-admin-worker.js');
      const admin = await validateSiteAdmin(request, env, siteId);
      if (!admin || !hasPermission(admin, 'orders')) return errorResponse('Unauthorized', 403);
    }

    const db = await resolveSiteDBById(env, siteId);
    await ensureReturnRequestsTable(db);

    const result = await db.prepare(
      'SELECT * FROM return_requests WHERE site_id = ? ORDER BY created_at DESC'
    ).bind(siteId).all();

    return successResponse(result.results || []);
  } catch (error) {
    console.error('List returns error:', error);
    return errorResponse('Failed to list returns', 500);
  }
}

async function handleReturnUpdate(request, env, returnId) {
  if (request.method !== 'PUT') return errorResponse('Method not allowed', 405);

  try {
    const data = await request.json();
    const { siteId, status, adminNote, refundAmount, refundId } = data;
    if (!siteId || !returnId) return errorResponse('siteId and returnId are required');

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('SiteAdmin ')) {
      const user = await validateAnyAuth(request, env, { siteId });
      if (!user) return errorResponse('Authentication required', 401);
      const site = await env.DB.prepare('SELECT id FROM sites WHERE id = ? AND user_id = ?').bind(siteId, user.id).first();
      if (!site) return errorResponse('Unauthorized', 403);
    } else {
      const { validateSiteAdmin, hasPermission } = await import('./site-admin-worker.js');
      const admin = await validateSiteAdmin(request, env, siteId);
      if (!admin || !hasPermission(admin, 'orders')) return errorResponse('Unauthorized', 403);
    }

    const db = await resolveSiteDBById(env, siteId);
    await ensureReturnRequestsTable(db);

    const ret = await db.prepare('SELECT * FROM return_requests WHERE id = ? AND site_id = ?').bind(returnId, siteId).first();
    if (!ret) return errorResponse('Return request not found', 404);

    const allowedStatuses = ['requested', 'approved', 'rejected', 'refunded', 'replaced'];
    if (status && !allowedStatuses.includes(status)) {
      return errorResponse('Invalid status. Allowed: ' + allowedStatuses.join(', '), 400);
    }

    const updates = ['updated_at = datetime("now")'];
    const values = [];
    if (status) { updates.push('status = ?'); values.push(status); }
    if (adminNote !== undefined) { updates.push('admin_note = ?'); values.push(adminNote); }
    if (refundAmount !== undefined) { updates.push('refund_amount = ?'); values.push(refundAmount); }
    if (refundId) { updates.push('refund_id = ?'); values.push(refundId); }

    values.push(returnId);
    await db.prepare(`UPDATE return_requests SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

    if (status && ret.customer_email) {
      try {
        const config = await getSiteConfig(env, siteId);
        const brandName = config.brand_name || 'Store';
        const updatedRet = { ...ret, status, admin_note: adminNote !== undefined ? adminNote : ret.admin_note, refund_amount: refundAmount !== undefined ? refundAmount : ret.refund_amount };
        const { html, text } = buildReturnStatusEmail(updatedRet, brandName, status, adminNote);
        await sendEmail(env, ret.customer_email, `Return Update #${ret.order_number} - ${brandName}`, html, text).catch(() => {});
      } catch (e) {}
    }

    return successResponse(null, 'Return request updated');
  } catch (error) {
    console.error('Update return error:', error);
    return errorResponse('Failed to update return request', 500);
  }
}

async function resendReturnLink(request, env, orderId) {
  try {
    const data = await request.json();
    const { siteId, email } = data;
    if (!siteId || !orderId || !email) return errorResponse('siteId, orderId and email are required');

    const db = await resolveSiteDBById(env, siteId);

    let order = await db.prepare('SELECT * FROM orders WHERE (id = ? OR order_number = ?) AND site_id = ? AND customer_email = ?').bind(orderId, orderId, siteId, email).first();
    let isGuest = false;
    if (!order) {
      order = await db.prepare('SELECT * FROM guest_orders WHERE (id = ? OR order_number = ?) AND site_id = ? AND customer_email = ?').bind(orderId, orderId, siteId, email).first();
      isGuest = true;
    }
    if (!order) return errorResponse('Order not found or email does not match', 404);

    let returnToken = order.return_token;
    if (!returnToken) {
      returnToken = generateReturnToken();
      const table = isGuest ? 'guest_orders' : 'orders';
      try { await db.prepare(`ALTER TABLE ${table} ADD COLUMN return_token TEXT`).run(); } catch (e) {}
      await db.prepare(`UPDATE ${table} SET return_token = ? WHERE id = ?`).bind(returnToken, order.id).run();
    }

    const site = await env.DB.prepare('SELECT subdomain, custom_domain FROM sites WHERE id = ?').bind(siteId).first();
    const domain = site?.custom_domain || `${site?.subdomain || 'store'}.${env.DOMAIN || PLATFORM_DOMAIN}`;
    const returnUrl = `https://${domain}/return/${order.order_number || order.id}?token=${returnToken}`;

    const config = await getSiteConfig(env, siteId);
    const brandName = config.brand_name || 'Store';

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f5f5f5;">
      <div style="max-width:600px;margin:0 auto;background:#fff;">
        <div style="background:#0f172a;color:#fff;padding:32px;text-align:center;">
          <h1 style="margin:0;font-size:24px;font-weight:700;">${brandName}</h1>
        </div>
        <div style="padding:32px;">
          <h2 style="margin:0 0 16px;font-size:20px;color:#0f172a;">Your Return Link</h2>
          <p style="color:#64748b;font-size:14px;line-height:1.6;">Use the link below to submit a return request for order <strong>#${order.order_number}</strong>:</p>
          <div style="margin:24px 0;text-align:center;">
            <a href="${returnUrl}" style="display:inline-block;background:#0f172a;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Request Return</a>
          </div>
          <p style="color:#94a3b8;font-size:12px;">If the button doesn't work, copy this link: ${returnUrl}</p>
        </div>
      </div>
    </body></html>`;
    const text = `Your return link for order #${order.order_number}: ${returnUrl}`;

    await sendEmail(env, email, `Return Link for Order #${order.order_number} - ${brandName}`, html, text);

    return successResponse(null, 'Return link sent to your email');
  } catch (error) {
    console.error('Resend return link error:', error);
    return errorResponse('Failed to send return link', 500);
  }
}

function buildReturnRequestEmail(order, brandName, reason, reasonDetail) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f5f5f5;">
    <div style="max-width:600px;margin:0 auto;background:#fff;">
      <div style="background:#0f172a;color:#fff;padding:32px;text-align:center;">
        <h1 style="margin:0;font-size:24px;font-weight:700;">${brandName}</h1>
      </div>
      <div style="padding:32px;">
        <h2 style="margin:0 0 16px;font-size:20px;color:#ef4444;">New Return Request</h2>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:20px;">
          <p style="margin:0 0 8px;font-size:14px;"><strong>Order:</strong> #${order.order_number}</p>
          <p style="margin:0 0 8px;font-size:14px;"><strong>Customer:</strong> ${order.customer_name || 'N/A'}</p>
          <p style="margin:0 0 8px;font-size:14px;"><strong>Email:</strong> ${order.customer_email || 'N/A'}</p>
          <p style="margin:0 0 8px;font-size:14px;"><strong>Reason:</strong> ${reason}</p>
          ${reasonDetail ? `<p style="margin:0;font-size:14px;"><strong>Details:</strong> ${reasonDetail}</p>` : ''}
        </div>
        <p style="color:#64748b;font-size:14px;">Please review this return request in your admin panel.</p>
      </div>
    </div>
  </body></html>`;
  const text = `New Return Request\nOrder: #${order.order_number}\nCustomer: ${order.customer_name}\nReason: ${reason}${reasonDetail ? '\nDetails: ' + reasonDetail : ''}`;
  return { html, text };
}

function buildReturnStatusEmail(ret, brandName, status, adminNote) {
  const statusLabels = { approved: 'Approved', rejected: 'Rejected', refunded: 'Refunded' };
  const statusColors = { approved: '#22c55e', rejected: '#ef4444', refunded: '#2563eb' };
  const label = statusLabels[status] || status;
  const color = statusColors[status] || '#64748b';

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f5f5f5;">
    <div style="max-width:600px;margin:0 auto;background:#fff;">
      <div style="background:#0f172a;color:#fff;padding:32px;text-align:center;">
        <h1 style="margin:0;font-size:24px;font-weight:700;">${brandName}</h1>
      </div>
      <div style="padding:32px;">
        <h2 style="margin:0 0 16px;font-size:20px;color:#0f172a;">Return Request Update</h2>
        <p style="color:#64748b;font-size:14px;margin-bottom:20px;">Your return request for order <strong>#${ret.order_number}</strong> has been updated.</p>
        <div style="text-align:center;margin:24px 0;">
          <span style="display:inline-block;background:${color};color:#fff;padding:8px 24px;border-radius:20px;font-weight:600;font-size:16px;">${label}</span>
        </div>
        ${adminNote ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-top:16px;"><p style="margin:0 0 4px;font-size:12px;color:#64748b;font-weight:600;">Note from store:</p><p style="margin:0;font-size:14px;color:#334155;">${adminNote}</p></div>` : ''}
        ${status === 'refunded' && ret.refund_amount ? `<p style="margin-top:16px;font-size:14px;color:#334155;">Refund amount: <strong>${ret.refund_amount}</strong></p>` : ''}
      </div>
    </div>
  </body></html>`;
  const text = `Return Request Update\nOrder: #${ret.order_number}\nStatus: ${label}${adminNote ? '\nNote: ' + adminNote : ''}`;
  return { html, text };
}

export async function sendOrderEmails(env, siteId, orderData) {
  try {
    const config = await getSiteConfig(env, siteId);

    if (!config.site_id) return;

    const siteBrandName = config.brand_name || 'Store';
    let siteSettings = {};
    try {
      if (config.settings) siteSettings = typeof config.settings === 'string' ? JSON.parse(config.settings) : config.settings;
    } catch (e) {}

    const ownerEmail = siteSettings.email || siteSettings.ownerEmail || config.email;
    const currency = orderData.currency || siteSettings.defaultCurrency || 'INR';
    const storeTz = siteSettings.timezone || '';

    const emailOrder = {
      order_number: orderData.orderNumber,
      items: orderData.processedItems,
      subtotal: orderData.subtotal,
      discount: orderData.discount || 0,
      coupon_code: orderData.coupon_code || null,
      shipping_cost: orderData.shippingCost || 0,
      total: orderData.total,
      payment_method: orderData.paymentMethod,
      customer_name: orderData.customerName,
      customer_email: orderData.customerEmail,
      customer_phone: orderData.customerPhone,
      shipping_address: orderData.shippingAddress,
      created_at: orderData.created_at,
    };

    const emailJobs = [];

    if (ownerEmail) {
      try {
        const { html, text } = buildNewOrderReviewEmail(emailOrder, siteBrandName, currency, storeTz);
        emailJobs.push(
          sendEmail(env, ownerEmail, `New Order #${orderData.orderNumber} - Review Required - ${siteBrandName}`, html, text)
            .catch(e => console.error('Owner email send error:', e))
        );
      } catch (buildErr) {
        console.error('Owner email build error:', buildErr);
      }
    }

    await Promise.all(emailJobs);
  } catch (error) {
    console.error('Send order emails error:', error);
  }
}

async function ensureCancellationRequestsTable(db) {
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS cancellation_requests (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      order_id TEXT NOT NULL,
      order_number TEXT,
      order_type TEXT DEFAULT 'order',
      reason TEXT NOT NULL,
      reason_detail TEXT,
      status TEXT DEFAULT 'requested',
      admin_note TEXT,
      customer_name TEXT,
      customer_email TEXT,
      customer_phone TEXT,
      cancel_token TEXT,
      row_size_bytes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`).run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_cancel_requests_site ON cancellation_requests(site_id)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_cancel_requests_order ON cancellation_requests(order_id)').run();
  } catch (e) {}
}

async function createCancellationRequest(request, env, orderId) {
  try {
    const data = await request.json();
    const { siteId, reason, reasonDetail, cancelToken } = data;
    if (!siteId || !orderId) return errorResponse('siteId and orderId are required');
    if (!reason) return errorResponse('Reason is required');

    const db = await resolveSiteDBById(env, siteId);
    await ensureCancellationRequestsTable(db);

    const config = await getSiteConfig(env, siteId);
    let settings = {};
    try { if (config.settings) settings = typeof config.settings === 'string' ? JSON.parse(config.settings) : config.settings; } catch (e) {}
    if (!settings.cancellationEnabled) return errorResponse('Cancellation is not available for this store', 403);

    let order = await db.prepare('SELECT * FROM orders WHERE (id = ? OR order_number = ?) AND site_id = ?').bind(orderId, orderId, siteId).first();
    let orderType = 'order';
    if (!order) {
      order = await db.prepare('SELECT * FROM guest_orders WHERE (id = ? OR order_number = ?) AND site_id = ?').bind(orderId, orderId, siteId).first();
      orderType = 'guest_order';
    }
    if (!order) return errorResponse('Order not found', 404);

    const statusLower = (order.status || '').toLowerCase();
    if (!['pending', 'confirmed'].includes(statusLower)) {
      return errorResponse('Only pending or confirmed orders can be cancelled', 400);
    }

    const windowHours = settings.cancellationWindowHours || 24;
    const orderCreated = new Date(order.created_at || order.createdAt);
    const hoursSinceOrder = (Date.now() - orderCreated.getTime()) / (1000 * 60 * 60);
    if (hoursSinceOrder > windowHours) {
      return errorResponse(`Cancellation window has expired. Orders can only be cancelled within ${windowHours} hours of placing the order.`, 400);
    }

    if (orderType === 'guest_order') {
      if (!cancelToken) return errorResponse('Cancel token is required for guest orders', 403);
      let storedToken = null;
      try { storedToken = order.cancel_token; } catch (e) {}
      if (!storedToken || storedToken !== cancelToken) {
        return errorResponse('Invalid cancel token', 403);
      }
    } else {
      if (cancelToken) {
        let storedToken = null;
        try { storedToken = order.cancel_token; } catch (e) {}
        if (!storedToken || storedToken !== cancelToken) {
          return errorResponse('Invalid cancel token', 403);
        }
      } else {
        const user = await validateAnyAuth(request, env, { siteId, db });
        if (!user) return errorResponse('Authentication required', 401);
        if (!order.user_id || order.user_id !== user.id) {
          return errorResponse('You can only cancel your own orders', 403);
        }
      }
    }

    const existing = await db.prepare('SELECT id FROM cancellation_requests WHERE order_id = ? AND site_id = ?').bind(order.id, siteId).first();
    if (existing) return errorResponse('A cancellation request already exists for this order', 409);

    const cancelId = generateId();
    await db.prepare(
      `INSERT INTO cancellation_requests (id, site_id, order_id, order_number, order_type, reason, reason_detail, status, cancel_token, customer_name, customer_email, customer_phone, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'requested', ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      cancelId, siteId, order.id, order.order_number, orderType,
      reason, reasonDetail || null,
      order.cancel_token || null,
      order.customer_name, order.customer_email || null, order.customer_phone || null
    ).run();

    try {
      const brandName = config.brand_name || 'Store';
      const ownerEmail = settings.email || settings.ownerEmail || config.email;
      if (ownerEmail) {
        const { html, text } = buildCancellationRequestNotifyEmail(order, brandName, reason, reasonDetail);
        await sendEmail(env, ownerEmail, `Cancellation Request #${order.order_number} - ${brandName}`, html, text).catch(() => {});
      }
    } catch (e) {}

    return successResponse({ id: cancelId, status: 'requested' }, 'Cancellation request submitted successfully');
  } catch (error) {
    console.error('Create cancellation request error:', error);
    return errorResponse('Failed to create cancellation request: ' + error.message, 500);
  }
}

async function getCancelStatus(request, env, orderId) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get('siteId');
    const cancelToken = url.searchParams.get('token');
    if (!siteId) return errorResponse('siteId is required');

    const db = await resolveSiteDBById(env, siteId);
    await ensureCancellationRequestsTable(db);

    const req = await db.prepare(
      'SELECT * FROM cancellation_requests WHERE (order_id = ? OR order_number = ?) AND site_id = ?'
    ).bind(orderId, orderId, siteId).first();

    if (!req) return successResponse(null, 'No cancellation request found');

    if (cancelToken) {
      if (!req.cancel_token || req.cancel_token !== cancelToken) {
        return errorResponse('Invalid token', 403);
      }
    }

    const safeReq = { id: req.id, order_id: req.order_id, order_number: req.order_number, status: req.status, admin_note: req.admin_note, reason: req.reason, reason_detail: req.reason_detail, created_at: req.created_at, updated_at: req.updated_at };
    return successResponse(safeReq);
  } catch (error) {
    console.error('Get cancel status error:', error);
    return errorResponse('Failed to get cancellation status', 500);
  }
}

async function handleCancellationsList(request, env) {
  if (request.method !== 'GET') return errorResponse('Method not allowed', 405);

  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get('siteId');
    if (!siteId) return errorResponse('siteId is required');

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('SiteAdmin ')) {
      const user = await validateAnyAuth(request, env, { siteId });
      if (!user) return errorResponse('Authentication required', 401);
      const site = await env.DB.prepare('SELECT id FROM sites WHERE id = ? AND user_id = ?').bind(siteId, user.id).first();
      if (!site) return errorResponse('Unauthorized', 403);
    } else {
      const { validateSiteAdmin, hasPermission } = await import('./site-admin-worker.js');
      const admin = await validateSiteAdmin(request, env, siteId);
      if (!admin || !hasPermission(admin, 'orders')) return errorResponse('Unauthorized', 403);
    }

    const db = await resolveSiteDBById(env, siteId);
    await ensureCancellationRequestsTable(db);

    const result = await db.prepare(
      'SELECT * FROM cancellation_requests WHERE site_id = ? ORDER BY created_at DESC'
    ).bind(siteId).all();

    return successResponse(result.results || []);
  } catch (error) {
    console.error('List cancellations error:', error);
    return errorResponse('Failed to list cancellations', 500);
  }
}

async function handleCancellationUpdate(request, env, cancelId) {
  if (request.method !== 'PUT') return errorResponse('Method not allowed', 405);

  try {
    const data = await request.json();
    const { siteId, status, adminNote } = data;
    if (!siteId || !cancelId) return errorResponse('siteId and cancelId are required');

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('SiteAdmin ')) {
      const user = await validateAnyAuth(request, env, { siteId });
      if (!user) return errorResponse('Authentication required', 401);
      const site = await env.DB.prepare('SELECT id FROM sites WHERE id = ? AND user_id = ?').bind(siteId, user.id).first();
      if (!site) return errorResponse('Unauthorized', 403);
    } else {
      const { validateSiteAdmin, hasPermission } = await import('./site-admin-worker.js');
      const admin = await validateSiteAdmin(request, env, siteId);
      if (!admin || !hasPermission(admin, 'orders')) return errorResponse('Unauthorized', 403);
    }

    const db = await resolveSiteDBById(env, siteId);
    await ensureCancellationRequestsTable(db);

    const req = await db.prepare('SELECT * FROM cancellation_requests WHERE id = ? AND site_id = ?').bind(cancelId, siteId).first();
    if (!req) return errorResponse('Cancellation request not found', 404);

    const allowedStatuses = ['requested', 'approved', 'rejected'];
    if (status && !allowedStatuses.includes(status)) {
      return errorResponse('Invalid status. Allowed: ' + allowedStatuses.join(', '), 400);
    }

    if (status && req.status !== 'requested') {
      return errorResponse(`Cannot change status from '${req.status}'. Only 'requested' cancellations can be approved or rejected.`, 400);
    }

    const updates = ['updated_at = datetime("now")'];
    const values = [];
    if (status) { updates.push('status = ?'); values.push(status); }
    if (adminNote !== undefined) { updates.push('admin_note = ?'); values.push(adminNote); }

    values.push(cancelId);
    await db.prepare(`UPDATE cancellation_requests SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

    if (status === 'approved') {
      try {
        const table = req.order_type === 'guest_order' ? 'guest_orders' : 'orders';
        const order = await db.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(req.order_id).first();
        if (order) {
          const reason = req.reason || adminNote || 'Cancellation approved';
          try { await db.prepare(`ALTER TABLE ${table} ADD COLUMN cancellation_reason TEXT`).run(); } catch (e) {}
          await db.prepare(`UPDATE ${table} SET status = 'cancelled', cancellation_reason = ? WHERE id = ?`).bind(reason, req.order_id).run();

          let items = [];
          try { items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []); } catch (e) {}
          for (const item of items) {
            const pid = item.productId || item.product_id;
            if (pid) {
              try { await updateProductStock(db, pid, item.quantity, 'increment', siteId); } catch (e) {}
            }
          }

          const config = await getSiteConfig(env, siteId);
          const brandName = config.brand_name || 'Store';
          let settings = {};
          try { if (config.settings) settings = typeof config.settings === 'string' ? JSON.parse(config.settings) : config.settings; } catch (e) {}
          const ownerEmail = settings.email || settings.ownerEmail || config.email;
          const currency = order.currency || settings.defaultCurrency || 'INR';
          const storeTz = settings.timezone || '';

          if (order.customer_email) {
            const emailOrder = { order_number: order.order_number, customer_name: order.customer_name, customer_email: order.customer_email, total: order.total, payment_method: order.payment_method, created_at: order.created_at };
            const { html, text } = buildCancellationCustomerEmail(emailOrder, brandName, reason, ownerEmail, currency, storeTz, true);
            await sendEmail(env, order.customer_email, `Cancellation approved - Order #${order.order_number} - ${brandName}`, html, text).catch(() => {});
          }
        }
      } catch (e) {
        console.error('Cancellation approval processing error:', e);
      }
    }

    if (status === 'rejected' && req.customer_email) {
      try {
        const config = await getSiteConfig(env, siteId);
        const brandName = config.brand_name || 'Store';
        const updatedReq = { ...req, status, admin_note: adminNote !== undefined ? adminNote : req.admin_note };
        const { html, text } = buildCancellationStatusEmail(updatedReq, brandName, status, adminNote);
        await sendEmail(env, req.customer_email, `Cancellation Update #${req.order_number} - ${brandName}`, html, text).catch(() => {});
      } catch (e) {}
    }

    return successResponse(null, 'Cancellation request updated');
  } catch (error) {
    console.error('Update cancellation error:', error);
    return errorResponse('Failed to update cancellation request', 500);
  }
}

async function resendCancelLink(request, env, orderId) {
  try {
    const data = await request.json();
    const { siteId, email } = data;
    if (!siteId || !orderId || !email) return errorResponse('siteId, orderId and email are required');

    const db = await resolveSiteDBById(env, siteId);

    let order = await db.prepare('SELECT * FROM orders WHERE (id = ? OR order_number = ?) AND site_id = ? AND customer_email = ?').bind(orderId, orderId, siteId, email).first();
    let isGuest = false;
    if (!order) {
      order = await db.prepare('SELECT * FROM guest_orders WHERE (id = ? OR order_number = ?) AND site_id = ? AND customer_email = ?').bind(orderId, orderId, siteId, email).first();
      isGuest = true;
    }
    if (!order) return errorResponse('Order not found or email does not match', 404);

    const statusLower = (order.status || '').toLowerCase();
    if (!['pending', 'confirmed'].includes(statusLower)) {
      return errorResponse('This order can no longer be cancelled', 400);
    }

    let cancelToken = null;
    try { cancelToken = order.cancel_token; } catch (e) {}
    if (!cancelToken) {
      cancelToken = generateReturnToken();
      const table = isGuest ? 'guest_orders' : 'orders';
      try { await db.prepare(`ALTER TABLE ${table} ADD COLUMN cancel_token TEXT`).run(); } catch (e) {}
      await db.prepare(`UPDATE ${table} SET cancel_token = ? WHERE id = ?`).bind(cancelToken, order.id).run();
    }

    const site = await env.DB.prepare('SELECT subdomain, custom_domain FROM sites WHERE id = ?').bind(siteId).first();
    const domain = site?.custom_domain || `${site?.subdomain || 'store'}.${env.DOMAIN || PLATFORM_DOMAIN}`;
    const cancelUrl = `https://${domain}/cancel/${order.order_number || order.id}?token=${cancelToken}`;

    const config = await getSiteConfig(env, siteId);
    const brandName = config.brand_name || 'Store';

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f5f5f5;">
      <div style="max-width:600px;margin:0 auto;background:#fff;">
        <div style="background:#0f172a;color:#fff;padding:32px;text-align:center;">
          <h1 style="margin:0;font-size:24px;font-weight:700;">${brandName}</h1>
        </div>
        <div style="padding:32px;">
          <h2 style="margin:0 0 16px;font-size:20px;color:#0f172a;">Your Cancellation Link</h2>
          <p style="color:#64748b;font-size:14px;line-height:1.6;">Use the link below to submit a cancellation request for order <strong>#${order.order_number}</strong>:</p>
          <div style="margin:24px 0;text-align:center;">
            <a href="${cancelUrl}" style="display:inline-block;background:#e53935;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Cancel Order</a>
          </div>
          <p style="color:#94a3b8;font-size:12px;">If the button doesn't work, copy this link: ${cancelUrl}</p>
        </div>
      </div>
    </body></html>`;
    const text = `Your cancellation link for order #${order.order_number}: ${cancelUrl}`;

    await sendEmail(env, email, `Cancellation Link for Order #${order.order_number} - ${brandName}`, html, text);

    return successResponse(null, 'Cancellation link sent to your email');
  } catch (error) {
    console.error('Resend cancel link error:', error);
    return errorResponse('Failed to send cancellation link', 500);
  }
}

async function getInvoiceData(request, env, orderId) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get('siteId');
    if (!siteId || !orderId) return errorResponse('siteId and orderId are required', 400);

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('SiteAdmin ')) {
      return errorResponse('Unauthorized', 401);
    }

    const { validateSiteAdmin } = await import('./site-admin-worker.js');
    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin) return errorResponse('Unauthorized', 401);

    const db = await resolveSiteDBById(env, siteId);
    let order = await db.prepare('SELECT * FROM orders WHERE id = ? AND site_id = ?').bind(orderId, siteId).first();
    let isGuest = false;
    if (!order) {
      order = await db.prepare('SELECT * FROM guest_orders WHERE id = ? AND site_id = ?').bind(orderId, siteId).first();
      isGuest = true;
    }
    if (!order) return errorResponse('Order not found', 404);

    let items = [];
    try { items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []); } catch (e) {}

    const enrichedItems = await Promise.all(items.map(async (item) => {
      let hsnCode = null;
      let gstRate = 0;
      try {
        if (item.productId || item.product_id || item.id) {
          const pid = item.productId || item.product_id || item.id;
          const prod = await db.prepare('SELECT hsn_code, gst_rate FROM products WHERE id = ? AND site_id = ?').bind(pid, siteId).first();
          if (prod) { hsnCode = prod.hsn_code; gstRate = prod.gst_rate || 0; }
        }
      } catch (e) {}
      return { ...item, hsnCode, gstRate };
    }));

    const config = await getSiteConfig(env, siteId);
    let settings = {};
    try { settings = typeof config.settings === 'string' ? JSON.parse(config.settings) : (config.settings || {}); } catch (e) {}

    const gstConfig = {
      gstin: settings.gstin || null,
      legalName: settings.gstLegalName || config.brand_name || '',
      state: settings.gstState || null,
      address: settings.gstAddress || config.address || '',
      brandName: config.brand_name || 'Store',
    };

    let shippingAddress = order.shipping_address;
    try { if (typeof shippingAddress === 'string') shippingAddress = JSON.parse(shippingAddress); } catch (e) {}

    return successResponse({
      order: {
        id: order.id,
        order_number: order.order_number,
        created_at: order.created_at,
        status: order.status,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_phone: order.customer_phone,
        customer_gstin: order.customer_gstin || null,
        shipping_address: shippingAddress,
        subtotal: order.subtotal,
        discount: order.discount || 0,
        shipping_cost: order.shipping_cost || 0,
        tax: order.tax || 0,
        total: order.total,
        currency: order.currency || 'INR',
        payment_method: order.payment_method,
        coupon_code: order.coupon_code || null,
        items: enrichedItems,
        isGuest,
      },
      gstConfig,
    });
  } catch (error) {
    console.error('Get invoice data error:', error);
    return errorResponse('Failed to fetch invoice data', 500);
  }
}

async function getPublicInvoice(request, env) {
  try {
    const url = new URL(request.url);
    const orderNumber = url.searchParams.get('orderNumber');
    const token = url.searchParams.get('t');
    const subdomain = url.searchParams.get('subdomain');

    if (!orderNumber || !token) return errorResponse('orderNumber and token are required', 400);

    let db = null;
    let siteId = null;

    if (subdomain) {
      const site = await env.DB.prepare('SELECT id FROM sites WHERE subdomain = ?').bind(subdomain).first();
      if (site) { siteId = site.id; db = await resolveSiteDBById(env, siteId); }
    }

    if (!db) return errorResponse('Store not found', 404);

    let order = await db.prepare('SELECT * FROM orders WHERE order_number = ? AND site_id = ? AND invoice_token = ?').bind(orderNumber, siteId, token).first();
    let isGuest = false;
    if (!order) {
      order = await db.prepare('SELECT * FROM guest_orders WHERE order_number = ? AND site_id = ? AND invoice_token = ?').bind(orderNumber, siteId, token).first();
      isGuest = true;
    }
    if (!order) return errorResponse('Invoice not found or invalid token', 404);

    let items = [];
    try { items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []); } catch (e) {}

    const enrichedItems = await Promise.all(items.map(async (item) => {
      let hsnCode = null;
      let gstRate = 0;
      try {
        const pid = item.productId || item.product_id || item.id;
        if (pid) {
          const prod = await db.prepare('SELECT hsn_code, gst_rate FROM products WHERE id = ? AND site_id = ?').bind(pid, siteId).first();
          if (prod) { hsnCode = prod.hsn_code; gstRate = prod.gst_rate || 0; }
        }
      } catch (e) {}
      return { ...item, hsnCode, gstRate };
    }));

    const config = await getSiteConfig(env, siteId);
    let settings = {};
    try { settings = typeof config.settings === 'string' ? JSON.parse(config.settings) : (config.settings || {}); } catch (e) {}

    const gstConfig = {
      gstin: settings.gstin || null,
      legalName: settings.gstLegalName || config.brand_name || '',
      state: settings.gstState || null,
      address: settings.gstAddress || config.address || '',
      brandName: config.brand_name || 'Store',
    };

    let shippingAddress = order.shipping_address;
    try { if (typeof shippingAddress === 'string') shippingAddress = JSON.parse(shippingAddress); } catch (e) {}

    return successResponse({
      order: {
        id: order.id,
        order_number: order.order_number,
        created_at: order.created_at,
        status: order.status,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_phone: order.customer_phone,
        customer_gstin: order.customer_gstin || null,
        shipping_address: shippingAddress,
        subtotal: order.subtotal,
        discount: order.discount || 0,
        shipping_cost: order.shipping_cost || 0,
        tax: order.tax || 0,
        total: order.total,
        currency: order.currency || 'INR',
        payment_method: order.payment_method,
        coupon_code: order.coupon_code || null,
        items: enrichedItems,
        isGuest,
      },
      gstConfig,
    });
  } catch (error) {
    console.error('Get public invoice error:', error);
    return errorResponse('Failed to fetch invoice', 500);
  }
}

async function getAnalytics(request, env) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get('siteId');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    if (!siteId) return errorResponse('siteId is required', 400);

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('SiteAdmin ')) {
      return errorResponse('Unauthorized', 401);
    }
    const { validateSiteAdmin, hasPermission } = await import('./site-admin-worker.js');
    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin) return errorResponse('Unauthorized', 401);
    if (!hasPermission(admin, 'analytics') && !hasPermission(admin, 'orders')) {
      return errorResponse('No permission', 403);
    }

    const db = await resolveSiteDBById(env, siteId);
    if (!db) return errorResponse('Site database not found', 404);

    const dateFilter = [];
    const dateBindings = [];
    if (from) { dateFilter.push("created_at >= ?"); dateBindings.push(from); }
    if (to) { dateFilter.push("created_at <= ?"); dateBindings.push(to + ' 23:59:59'); }
    const dateWhere = dateFilter.length ? ' AND ' + dateFilter.join(' AND ') : '';

    const revenueStatuses = "('confirmed','packed','shipped','delivered')";

    const summaryQuery = `
      SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(CASE WHEN status IN ${revenueStatuses} THEN total ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status IN ${revenueStatuses} THEN tax ELSE 0 END), 0) as total_tax,
        COALESCE(SUM(CASE WHEN status IN ${revenueStatuses} THEN shipping_cost ELSE 0 END), 0) as total_shipping,
        COALESCE(SUM(CASE WHEN status IN ${revenueStatuses} THEN discount ELSE 0 END), 0) as total_discount
      FROM (
        SELECT total, tax, shipping_cost, discount, status, created_at FROM orders WHERE site_id = ?${dateWhere}
        UNION ALL
        SELECT total, tax, shipping_cost, discount, status, created_at FROM guest_orders WHERE site_id = ?${dateWhere}
      )
    `;
    const summaryBindings = [siteId, ...dateBindings, siteId, ...dateBindings];
    const summary = await db.prepare(summaryQuery).bind(...summaryBindings).first();

    const revenueCount = summary.total_orders > 0 ?
      (await db.prepare(`
        SELECT COUNT(*) as c FROM (
          SELECT id FROM orders WHERE site_id = ? AND status IN ${revenueStatuses}${dateWhere}
          UNION ALL
          SELECT id FROM guest_orders WHERE site_id = ? AND status IN ${revenueStatuses}${dateWhere}
        )
      `).bind(siteId, ...dateBindings, siteId, ...dateBindings).first()).c : 0;

    const avgOrderValue = revenueCount > 0 ? Math.round((summary.total_revenue / revenueCount) * 100) / 100 : 0;

    const dailyQuery = `
      SELECT date(created_at) as day,
        SUM(CASE WHEN status IN ${revenueStatuses} THEN total ELSE 0 END) as revenue,
        COUNT(*) as orders
      FROM (
        SELECT total, status, created_at FROM orders WHERE site_id = ?${dateWhere}
        UNION ALL
        SELECT total, status, created_at FROM guest_orders WHERE site_id = ?${dateWhere}
      )
      GROUP BY date(created_at)
      ORDER BY day ASC
    `;
    const dailyResult = await db.prepare(dailyQuery).bind(siteId, ...dateBindings, siteId, ...dateBindings).all();

    const paymentQuery = `
      SELECT payment_method,
        COUNT(*) as order_count,
        COALESCE(SUM(CASE WHEN status IN ${revenueStatuses} THEN total ELSE 0 END), 0) as revenue
      FROM (
        SELECT payment_method, total, status, created_at FROM orders WHERE site_id = ?${dateWhere}
        UNION ALL
        SELECT payment_method, total, status, created_at FROM guest_orders WHERE site_id = ?${dateWhere}
      )
      GROUP BY payment_method
    `;
    const paymentResult = await db.prepare(paymentQuery).bind(siteId, ...dateBindings, siteId, ...dateBindings).all();

    const statusQuery = `
      SELECT status, COUNT(*) as count FROM (
        SELECT status, created_at FROM orders WHERE site_id = ?${dateWhere}
        UNION ALL
        SELECT status, created_at FROM guest_orders WHERE site_id = ?${dateWhere}
      )
      GROUP BY status
    `;
    const statusResult = await db.prepare(statusQuery).bind(siteId, ...dateBindings, siteId, ...dateBindings).all();

    const topProductsQuery = `
      SELECT items, status, created_at, shipping_address FROM orders WHERE site_id = ? AND status IN ${revenueStatuses}${dateWhere}
      UNION ALL
      SELECT items, status, created_at, shipping_address FROM guest_orders WHERE site_id = ? AND status IN ${revenueStatuses}${dateWhere}
    `;
    const itemsResult = await db.prepare(topProductsQuery).bind(siteId, ...dateBindings, siteId, ...dateBindings).all();

    let gstState = '';
    try {
      const siteConfGst = await getSiteConfig(env, siteId);
      if (siteConfGst?.settings) {
        const sg = typeof siteConfGst.settings === 'string' ? JSON.parse(siteConfGst.settings) : siteConfGst.settings;
        gstState = (sg.gstState || '').toLowerCase().trim();
      }
    } catch (e) {}

    const productMap = {};
    let totalCGST = 0, totalSGST = 0, totalIGST = 0;

    for (const row of itemsResult.results) {
      let items = [];
      try { items = JSON.parse(row.items); } catch {}
      let customerState = '';
      try {
        const addr = typeof row.shipping_address === 'string' ? JSON.parse(row.shipping_address) : row.shipping_address;
        customerState = (addr?.state || '').toLowerCase().trim();
      } catch {}
      const isIntraState = gstState && customerState && gstState === customerState;

      for (const item of items) {
        const key = item.productId || item.product_id || item.name || item.title;
        if (!productMap[key]) {
          productMap[key] = { name: item.name || item.title || 'Unknown', quantity: 0, revenue: 0, image: item.thumbnail || item.image || item.images?.[0] || null };
        }
        const qty = item.quantity || 1;
        const price = (item.price || 0) * qty;
        productMap[key].quantity += qty;
        productMap[key].revenue += price;

        const gstRate = Number(item.gst_rate) || 0;
        if (gstRate > 0) {
          const gstAmount = (price * gstRate) / 100;
          if (isIntraState) {
            totalCGST += gstAmount / 2;
            totalSGST += gstAmount / 2;
          } else {
            totalIGST += gstAmount;
          }
        }
      }
    }

    const topProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return successResponse({
      summary: {
        totalRevenue: summary.total_revenue,
        totalOrders: summary.total_orders,
        revenueOrders: revenueCount,
        avgOrderValue,
        totalTax: Math.round((totalCGST + totalSGST + totalIGST) * 100) / 100 || summary.total_tax,
        totalShipping: summary.total_shipping,
        totalDiscount: summary.total_discount,
      },
      dailyRevenue: dailyResult.results,
      paymentMethodSplit: paymentResult.results,
      statusBreakdown: statusResult.results,
      topProducts,
      gstBreakdown: {
        cgst: Math.round(totalCGST * 100) / 100,
        sgst: Math.round(totalSGST * 100) / 100,
        igst: Math.round(totalIGST * 100) / 100,
        total: Math.round((totalCGST + totalSGST + totalIGST) * 100) / 100,
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return errorResponse('Failed to fetch analytics', 500);
  }
}
