import { generateId, generateOrderNumber, jsonResponse, errorResponse, successResponse, handleCORS } from '../../utils/helpers.js';
import { validateAuth, validateAnyAuth } from '../../utils/auth.js';
import { updateProductStock } from './products-worker.js';
import { sendEmail, buildOrderConfirmationEmail, buildOwnerNotificationEmail, buildCancellationCustomerEmail, buildCancellationOwnerEmail, buildDeliveryCustomerEmail, buildDeliveryOwnerEmail } from '../../utils/email.js';
import { checkUsageLimit } from '../../utils/usage-tracker.js';
import { resolveSiteDBById } from '../../utils/site-db.js';

export async function handleOrders(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;

  const method = request.method;
  const pathParts = path.split('/').filter(Boolean);
  const orderId = pathParts[2];
  const action = pathParts[3];

  if (action === 'guest') {
    return handleGuestOrder(request, env, method, orderId);
  }

  if (action === 'track') {
    return trackOrder(env, orderId, request);
  }

  const user = await validateAnyAuth(request, env);

  switch (method) {
    case 'GET':
      if (orderId) {
        return getOrder(env, user, orderId, request);
      }
      return getOrders(request, env, user);
    case 'POST':
      return createOrder(request, env, user);
    case 'PUT':
      return updateOrderStatus(request, env, user, orderId);
    default:
      return errorResponse('Method not allowed', 405);
  }
}

async function getOrders(request, env, user) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get('siteId');
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit')) || 50;
    const offset = parseInt(url.searchParams.get('offset')) || 0;

    const db = await resolveSiteDBById(env, siteId);

    let query = 'SELECT * FROM orders WHERE 1=1';
    const bindings = [];

    const authHeader = request.headers.get('Authorization');
    let isSiteAdmin = false;

    if (authHeader && authHeader.startsWith('SiteAdmin ') && siteId) {
      const { validateSiteAdmin } = await import('./site-admin-worker.js');
      const admin = await validateSiteAdmin(request, env, siteId);
      if (admin) {
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

async function getOrder(env, user, orderId, request) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get('siteId');
    const db = await resolveSiteDBById(env, siteId);

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
        const { validateSiteAdmin } = await import('./site-admin-worker.js');
        const admin = await validateSiteAdmin(request, env, orderCheck.site_id);
        if (admin) {
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

async function createOrder(request, env, user) {
  try {
    const data = await request.json();
    const { siteId, items, shippingAddress, billingAddress, customerName, customerEmail, customerPhone, paymentMethod, notes, couponCode } = data;

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

    const db = await resolveSiteDBById(env, siteId);

    let subtotal = 0;
    const processedItems = [];

    for (const item of items) {
      const itemProductId = item.productId || item.product_id;
      if (!itemProductId) {
        return errorResponse('Invalid item: missing product ID', 400);
      }

      const product = await db.prepare(
        'SELECT id, name, price, stock, thumbnail_url FROM products WHERE id = ? AND site_id = ?'
      ).bind(itemProductId, siteId).first();

      if (!product) {
        return errorResponse(`Product not found: ${itemProductId}`, 400);
      }

      if (product.stock !== null && product.stock < item.quantity) {
        return errorResponse(`Insufficient stock for ${product.name}`, 400, 'INSUFFICIENT_STOCK');
      }

      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;

      processedItems.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        total: itemTotal,
        thumbnail: product.thumbnail_url,
        variant: item.variant || null,
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
        await db.prepare(
          'UPDATE coupons SET used_count = used_count + 1 WHERE id = ?'
        ).bind(coupon.id).run();
      } else {
        try {
          const site = await env.DB.prepare('SELECT settings FROM sites WHERE id = ?').bind(siteId).first();
          if (site?.settings) {
            let siteSettings = site.settings;
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

    const shippingCost = 0;
    const tax = 0;
    const total = subtotal - discount + shippingCost + tax;

    const orderId = generateId();
    const orderNumber = generateOrderNumber();

    const isPendingPayment = paymentMethod === 'razorpay';
    const orderStatus = isPendingPayment ? 'pending_payment' : (data.status || 'pending');

    const usageCheck = await checkUsageLimit(env, siteId, 'd1', 0);
    if (!usageCheck.allowed) {
      return errorResponse(usageCheck.reason, 403, 'STORAGE_LIMIT');
    }

    await db.prepare(
      `INSERT INTO orders (id, site_id, user_id, order_number, items, subtotal, discount, shipping_cost, tax, total, payment_method, status, shipping_address, billing_address, customer_name, customer_email, customer_phone, coupon_code, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
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
      paymentMethod || 'pending',
      orderStatus,
      JSON.stringify(shippingAddress),
      billingAddress ? JSON.stringify(billingAddress) : null,
      customerName,
      customerEmail || null,
      customerPhone,
      appliedCouponCode || null,
      notes || null
    ).run();

    if (!isPendingPayment) {
      for (const item of processedItems) {
        await updateProductStock(env, item.productId, item.quantity, 'decrement', siteId);
      }

      try {
        await sendOrderEmails(env, siteId, {
          orderNumber, processedItems, subtotal, discount, coupon_code: appliedCouponCode, total, paymentMethod, customerName, customerEmail, customerPhone, shippingAddress
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
      const { validateSiteAdmin } = await import('./site-admin-worker.js');
      const orderCheck = await env.DB.prepare('SELECT id, site_id FROM orders WHERE id = ?').bind(orderId).first();
      if (!orderCheck) {
        const allSites = await env.DB.prepare('SELECT id FROM sites').all();
        for (const s of (allSites.results || [])) {
          const sdb = await resolveSiteDBById(env, s.id);
          const found = await sdb.prepare('SELECT id, site_id FROM orders WHERE id = ?').bind(orderId).first();
          if (found) {
            order = found;
            siteId = s.id;
            break;
          }
        }
        if (order) {
          const admin = await validateSiteAdmin(request, env, siteId);
          if (!admin) order = null;
        }
      } else {
        siteId = orderCheck.site_id;
        const admin = await validateSiteAdmin(request, env, orderCheck.site_id);
        if (admin) {
          order = orderCheck;
        }
      }
    }

    if (!order && user) {
      const userSites = await env.DB.prepare(
        'SELECT id FROM sites WHERE user_id = ?'
      ).bind(user.id).all();
      
      for (const s of (userSites.results || [])) {
        const sdb = await resolveSiteDBById(env, s.id);
        const found = await sdb.prepare(
          'SELECT id, site_id FROM orders WHERE id = ? AND site_id = ?'
        ).bind(orderId, s.id).first();
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

    const db = await resolveSiteDBById(env, siteId || order.site_id);

    const { status, trackingNumber, carrier, cancellationReason } = await request.json();

    const updates = [];
    const values = [];

    if (status) {
      updates.push('status = ?');
      values.push(status);

      if (status === 'shipped') {
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

    updates.push('updated_at = datetime("now")');
    values.push(orderId);

    await db.prepare(
      `UPDATE orders SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    if (status === 'cancelled' && cancellationReason) {
      try {
        const fullOrder = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
        if (fullOrder) {
          const site = await env.DB.prepare('SELECT brand_name, email, settings FROM sites WHERE id = ?').bind(fullOrder.site_id).first();
          const siteBrandName = site?.brand_name || 'Store';
          const siteSettings = site?.settings ? JSON.parse(site.settings) : {};
          const ownerEmail = siteSettings.email || siteSettings.ownerEmail || site?.email;

          const emailOrder = {
            order_number: fullOrder.order_number,
            customer_name: fullOrder.customer_name,
            customer_email: fullOrder.customer_email,
            customer_phone: fullOrder.customer_phone,
            total: fullOrder.total,
            payment_method: fullOrder.payment_method,
          };

          const emailJobs = [];
          if (fullOrder.customer_email) {
            const { html, text } = buildCancellationCustomerEmail(emailOrder, siteBrandName, cancellationReason, ownerEmail);
            emailJobs.push(sendEmail(env, fullOrder.customer_email, `Your order #${fullOrder.order_number} has been cancelled`, html, text).catch(e => console.error('Cancellation customer email error:', e)));
          }
          if (ownerEmail) {
            const { html, text } = buildCancellationOwnerEmail(emailOrder, siteBrandName, cancellationReason);
            emailJobs.push(sendEmail(env, ownerEmail, `Order #${fullOrder.order_number} cancelled - ${siteBrandName}`, html, text).catch(e => console.error('Cancellation owner email error:', e)));
          }
          await Promise.all(emailJobs);
        }
      } catch (emailErr) {
        console.error('Failed to send cancellation emails:', emailErr);
      }
    }

    if (status === 'delivered') {
      try {
        const fullOrder = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
        if (fullOrder) {
          const site = await env.DB.prepare('SELECT brand_name, email, settings FROM sites WHERE id = ?').bind(fullOrder.site_id).first();
          const siteBrandName = site?.brand_name || 'Store';
          const siteSettings = site?.settings ? JSON.parse(site.settings) : {};
          const ownerEmail = siteSettings.email || siteSettings.ownerEmail || site?.email;

          const emailOrder = {
            order_number: fullOrder.order_number,
            customer_name: fullOrder.customer_name,
            customer_email: fullOrder.customer_email,
            customer_phone: fullOrder.customer_phone,
            total: fullOrder.total,
            payment_method: fullOrder.payment_method,
            items: fullOrder.items,
          };

          const emailJobs = [];
          if (fullOrder.customer_email) {
            try {
              const { html, text } = buildDeliveryCustomerEmail(emailOrder, siteBrandName, ownerEmail);
              emailJobs.push(sendEmail(env, fullOrder.customer_email, `Your order #${fullOrder.order_number} has been delivered!`, html, text).catch(e => console.error('Delivery customer email send error:', e)));
            } catch (buildErr) {
              console.error('Delivery customer email build error:', buildErr);
            }
          }
          if (ownerEmail) {
            try {
              const { html, text } = buildDeliveryOwnerEmail(emailOrder, siteBrandName);
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

async function handleGuestOrder(request, env, method, orderId) {
  if (method === 'POST') {
    return createGuestOrder(request, env);
  }
  if (method === 'GET' && orderId) {
    return getGuestOrder(env, orderId, request);
  }
  return errorResponse('Method not allowed', 405);
}

async function createGuestOrder(request, env) {
  try {
    const data = await request.json();
    const { siteId, items, shippingAddress, customerName, customerEmail, customerPhone, paymentMethod } = data;

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

    const db = await resolveSiteDBById(env, siteId);

    let subtotal = 0;
    const processedItems = [];

    for (const item of items) {
      const itemProductId = item.productId || item.product_id;
      if (!itemProductId) {
        return errorResponse('Invalid item: missing product ID', 400);
      }

      const product = await db.prepare(
        'SELECT id, name, price, stock, thumbnail_url FROM products WHERE id = ? AND site_id = ?'
      ).bind(itemProductId, siteId).first();

      if (!product) {
        return errorResponse(`Product not found: ${itemProductId}`, 400);
      }

      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;

      processedItems.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        total: itemTotal,
        thumbnail: product.thumbnail_url,
      });
    }

    const total = subtotal;
    const orderId = generateId();
    const orderNumber = generateOrderNumber();

    const isPendingPayment = paymentMethod === 'razorpay';
    const guestOrderStatus = isPendingPayment ? 'pending_payment' : 'confirmed';

    const guestUsageCheck = await checkUsageLimit(env, siteId, 'd1', 0);
    if (!guestUsageCheck.allowed) {
      return errorResponse(guestUsageCheck.reason, 403, 'STORAGE_LIMIT');
    }

    await db.prepare(
      `INSERT INTO guest_orders (id, site_id, order_number, items, subtotal, total, payment_method, status, shipping_address, customer_name, customer_email, customer_phone, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      orderId,
      siteId,
      orderNumber,
      JSON.stringify(processedItems),
      subtotal,
      total,
      paymentMethod || 'cod',
      guestOrderStatus,
      JSON.stringify(shippingAddress),
      customerName,
      customerEmail || null,
      customerPhone
    ).run();

    if (!isPendingPayment) {
      for (const item of processedItems) {
        await updateProductStock(env, item.productId, item.quantity, 'decrement', siteId);
      }

      try {
        await sendOrderEmails(env, siteId, {
          orderNumber, processedItems, total, paymentMethod, customerName, customerEmail, customerPhone, shippingAddress
        });
      } catch (emailErr) {
        console.error('Guest order email notification error:', emailErr);
      }
    }

    return successResponse({
      id: orderId,
      orderNumber,
      total,
    }, 'Guest order created successfully');
  } catch (error) {
    console.error('Create guest order error:', error.message || error, error.stack || '');
    return errorResponse('Failed to create order: ' + (error.message || 'Unknown error'), 500);
  }
}

async function getGuestOrder(env, orderNumber, request) {
  try {
    const url = request ? new URL(request.url) : null;
    const siteId = url ? url.searchParams.get('siteId') : null;
    const db = await resolveSiteDBById(env, siteId);

    let guestQuery = 'SELECT * FROM guest_orders WHERE order_number = ?';
    const guestBindings = [orderNumber];
    if (siteId) {
      guestQuery += ' AND site_id = ?';
      guestBindings.push(siteId);
    }
    guestQuery += ' LIMIT 1';
    const order = await db.prepare(guestQuery).bind(...guestBindings).first();

    if (!order) {
      return errorResponse('Order not found', 404);
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

export async function sendOrderEmails(env, siteId, orderDetails) {
  const { orderNumber, processedItems, total, paymentMethod, customerName, customerEmail, customerPhone, shippingAddress } = orderDetails;

  const site = await env.DB.prepare('SELECT brand_name, email, settings FROM sites WHERE id = ?').bind(siteId).first();
  const siteBrandName = site?.brand_name || 'Store';
  const siteSettings = site?.settings ? JSON.parse(site.settings) : {};
  const ownerEmail = siteSettings.email || siteSettings.ownerEmail || site?.email;

  console.log('Order email debug:', {
    customerEmail,
    ownerEmail,
    siteSettingsEmail: siteSettings.email,
    siteEmail: site?.email,
    hasResendKey: !!env.RESEND_API_KEY,
    hasSendGridKey: !!env.SENDGRID_API_KEY,
  });

  const orderForEmail = {
    order_number: orderNumber,
    items: processedItems,
    total,
    payment_method: paymentMethod || 'cod',
    customer_name: customerName,
    customer_email: customerEmail,
    customer_phone: customerPhone,
    shipping_address: shippingAddress,
  };

  const emailPromises = [];

  if (customerEmail) {
    const { html, text } = buildOrderConfirmationEmail(orderForEmail, siteBrandName, ownerEmail);
    emailPromises.push(
      sendEmail(env, customerEmail, `Order Confirmation - ${orderNumber}`, html, text).then(result => {
        console.log('Customer email result:', result);
        if (result !== true) console.error('Customer email failed:', result);
      }).catch(e => console.error('Customer email error:', e))
    );
  }

  if (ownerEmail) {
    const { html, text } = buildOwnerNotificationEmail(orderForEmail, siteBrandName);
    emailPromises.push(
      sendEmail(env, ownerEmail, `New Order #${orderNumber} - ${siteBrandName}`, html, text).then(result => {
        console.log('Owner email result:', result);
        if (result !== true) console.error('Owner email failed:', result);
      }).catch(e => console.error('Owner email error:', e))
    );
  }

  if (emailPromises.length > 0) {
    await Promise.all(emailPromises);
  }
}

async function trackOrder(env, orderNumber, request) {
  try {
    const url = request ? new URL(request.url) : null;
    const siteId = url ? url.searchParams.get('siteId') : null;
    const db = await resolveSiteDBById(env, siteId);

    let trackQuery = 'SELECT order_number, status, tracking_number, carrier, shipped_at, delivered_at, created_at FROM orders WHERE order_number = ?';
    const trackBindings = [orderNumber];
    if (siteId) {
      trackQuery += ' AND site_id = ?';
      trackBindings.push(siteId);
    }
    let order = await db.prepare(trackQuery).bind(...trackBindings).first();

    if (!order) {
      let guestTrackQuery = 'SELECT order_number, status, tracking_number, carrier, created_at FROM guest_orders WHERE order_number = ?';
      const guestTrackBindings = [orderNumber];
      if (siteId) {
        guestTrackQuery += ' AND site_id = ?';
        guestTrackBindings.push(siteId);
      }
      order = await db.prepare(guestTrackQuery).bind(...guestTrackBindings).first();
    }

    if (!order) {
      return errorResponse('Order not found', 404);
    }

    return successResponse(order);
  } catch (error) {
    console.error('Track order error:', error);
    return errorResponse('Failed to track order', 500);
  }
}
