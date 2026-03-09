import { generateId, generateOrderNumber, jsonResponse, errorResponse, successResponse, handleCORS } from '../../utils/helpers.js';
import { validateAuth, validateAnyAuth } from '../../utils/auth.js';
import { updateProductStock } from './products-worker.js';
import { sendEmail, buildOrderConfirmationEmail, buildOwnerNotificationEmail } from '../../utils/email.js';

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
    return trackOrder(env, orderId);
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

    const orders = await env.DB.prepare(query).bind(...bindings).all();

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
    let query = 'SELECT * FROM orders WHERE (id = ? OR order_number = ?)';
    const bindings = [orderId, orderId];

    const authHeader = request ? request.headers.get('Authorization') : null;
    if (authHeader && authHeader.startsWith('SiteAdmin ')) {
      const orderCheck = await env.DB.prepare(
        'SELECT site_id FROM orders WHERE id = ? OR order_number = ?'
      ).bind(orderId, orderId).first();
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
        query += ' AND (user_id = ? OR site_id IN (SELECT id FROM sites WHERE user_id = ?))';
        bindings.push(user.id, user.id);
      }
    } else {
      return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const order = await env.DB.prepare(query).bind(...bindings).first();

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

    let subtotal = 0;
    const processedItems = [];

    for (const item of items) {
      const itemProductId = item.productId || item.product_id;
      if (!itemProductId) {
        return errorResponse('Invalid item: missing product ID', 400);
      }

      const product = await env.DB.prepare(
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
    if (couponCode) {
      let coupon = null;
      try {
        coupon = await env.DB.prepare(
          `SELECT * FROM coupons WHERE site_id = ? AND code = ? AND is_active = 1 
           AND (starts_at IS NULL OR starts_at <= datetime('now'))
           AND (expires_at IS NULL OR expires_at > datetime('now'))
           AND (usage_limit IS NULL OR used_count < usage_limit)`
        ).bind(siteId, couponCode.toUpperCase()).first();
      } catch (couponErr) {
        console.error('Coupon lookup error (table may not exist):', couponErr);
      }

      if (coupon && subtotal >= coupon.min_order_value) {
        if (coupon.type === 'percentage') {
          discount = (subtotal * coupon.value) / 100;
          if (coupon.max_discount && discount > coupon.max_discount) {
            discount = coupon.max_discount;
          }
        } else {
          discount = coupon.value;
        }

        await env.DB.prepare(
          'UPDATE coupons SET used_count = used_count + 1 WHERE id = ?'
        ).bind(coupon.id).run();
      }
    }

    const shippingCost = 0;
    const tax = 0;
    const total = subtotal - discount + shippingCost + tax;

    const orderId = generateId();
    const orderNumber = generateOrderNumber();

    const isPendingPayment = paymentMethod === 'razorpay';
    const orderStatus = isPendingPayment ? 'pending_payment' : (data.status || 'confirmed');

    await env.DB.prepare(
      `INSERT INTO orders (id, site_id, user_id, order_number, items, subtotal, discount, shipping_cost, tax, total, payment_method, status, shipping_address, billing_address, customer_name, customer_email, customer_phone, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
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
      notes || null
    ).run();

    if (!isPendingPayment) {
      for (const item of processedItems) {
        await updateProductStock(env, item.productId, item.quantity, 'decrement');
      }

      try {
        await sendOrderEmails(env, siteId, {
          orderNumber, processedItems, total, paymentMethod, customerName, customerEmail, customerPhone, shippingAddress
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
    if (user && user.type === 'customer') {
      return errorResponse('Customers cannot update order status', 403);
    }

    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('SiteAdmin ')) {
      const { validateSiteAdmin } = await import('./site-admin-worker.js');
      const orderCheck = await env.DB.prepare('SELECT id, site_id FROM orders WHERE id = ?').bind(orderId).first();
      if (orderCheck) {
        const admin = await validateSiteAdmin(request, env, orderCheck.site_id);
        if (admin) {
          order = orderCheck;
        }
      }
    }

    if (!order && user) {
      order = await env.DB.prepare(
        `SELECT o.id, o.site_id FROM orders o 
         JOIN sites s ON o.site_id = s.id 
         WHERE o.id = ? AND s.user_id = ?`
      ).bind(orderId, user.id).first();
    }

    if (!order) {
      return errorResponse('Order not found or unauthorized', 404);
    }

    const { status, trackingNumber, carrier } = await request.json();

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

    await env.DB.prepare(
      `UPDATE orders SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

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
    return getGuestOrder(env, orderId);
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

    let subtotal = 0;
    const processedItems = [];

    for (const item of items) {
      const itemProductId = item.productId || item.product_id;
      if (!itemProductId) {
        return errorResponse('Invalid item: missing product ID', 400);
      }

      const product = await env.DB.prepare(
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

    await env.DB.prepare(
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
        await updateProductStock(env, item.productId, item.quantity, 'decrement');
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

async function getGuestOrder(env, orderNumber) {
  try {
    const order = await env.DB.prepare(
      'SELECT * FROM guest_orders WHERE order_number = ? LIMIT 1'
    ).bind(orderNumber).first();

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
    const { html, text } = buildOrderConfirmationEmail(orderForEmail, siteBrandName);
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

async function trackOrder(env, orderNumber) {
  try {
    let order = await env.DB.prepare(
      'SELECT order_number, status, tracking_number, carrier, shipped_at, delivered_at, created_at FROM orders WHERE order_number = ?'
    ).bind(orderNumber).first();

    if (!order) {
      order = await env.DB.prepare(
        'SELECT order_number, status, tracking_number, carrier, created_at FROM guest_orders WHERE order_number = ?'
      ).bind(orderNumber).first();
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
