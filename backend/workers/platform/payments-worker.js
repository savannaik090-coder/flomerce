import { generateId, jsonResponse, errorResponse, successResponse, handleCORS } from '../../utils/helpers.js';
import { validateAuth } from '../../utils/auth.js';
import { updateProductStock } from '../storefront/products-worker.js';
import { sendOrderEmails } from '../storefront/orders-worker.js';
import { resolveSiteDBById, getSiteConfig } from '../../utils/site-db.js';
import { estimateRowBytes, trackD1Update } from '../../utils/usage-tracker.js';
import crypto from 'node:crypto';

export async function handlePayments(request, env, path, ctx) {
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;

  const pathParts = path.split('/').filter(Boolean);
  const action = pathParts[2];

  switch (action) {
    case 'create-order':
      return createRazorpayOrder(request, env);
    case 'verify':
      return verifyPayment(request, env);
    case 'subscription':
      return handleSubscription(request, env);
    case 'cancel-subscription':
      return handleCancelSubscription(request, env);
    case 'plans':
      return getPublicPlans(request, env);
    case 'webhook':
      return handleRazorpayWebhook(request, env);
    default:
      return errorResponse('Not found', 404);
  }
}

async function getRazorpayCredentials(env, siteId) {
  if (siteId) {
    try {
      const config = await getSiteConfig(env, siteId);
      if (config.settings) {
        let settings = config.settings;
        if (typeof settings === 'string') {
          try { settings = JSON.parse(settings); } catch {}
        }
        if (settings?.razorpayKeyId && settings?.razorpayKeySecret) {
          return { keyId: settings.razorpayKeyId, keySecret: settings.razorpayKeySecret, perSite: true };
        }
      }
    } catch (err) {
      console.error('Failed to load site Razorpay credentials:', err);
    }
  }
  const platformKeyId = await getPlatformRazorpayKeyId(env);
  return { keyId: platformKeyId || env.RAZORPAY_KEY_ID, keySecret: env.RAZORPAY_KEY_SECRET, perSite: false };
}

export async function getPlatformRazorpayKeyId(env) {
  try {
    const setting = await env.DB.prepare(
      `SELECT setting_value FROM platform_settings WHERE setting_key = 'razorpay_key_id'`
    ).first();
    return setting?.setting_value || null;
  } catch {
    return null;
  }
}

async function ensurePaymentTablesExist(env) {
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id TEXT PRIMARY KEY,
        site_id TEXT,
        user_id TEXT,
        order_id TEXT,
        subscription_id TEXT,
        razorpay_order_id TEXT,
        razorpay_payment_id TEXT,
        razorpay_signature TEXT,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'INR',
        status TEXT DEFAULT 'pending',
        payment_method TEXT,
        error_code TEXT,
        error_description TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL
      )
    `).run();
  } catch (err) {
    console.error('Failed to ensure payment tables:', err);
  }
}

async function createRazorpayOrder(request, env) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const { amount, currency, receipt, notes, orderId, type, siteId } = await request.json();

    if (!siteId) return errorResponse('siteId is required');
    if (!orderId) return errorResponse('orderId is required');

    // SECURITY: never trust the client-supplied amount. Look up the storefront
    // order in the per-site DB and use its server-side total. Also enforces that
    // we only create payment intents for real, pending orders that belong to
    // the supplied siteId.
    let serverAmount = null;
    let serverCurrency = null;
    try {
      const orderDb = await resolveSiteDBById(env, siteId);
      const order = await orderDb.prepare(
        `SELECT total_amount, currency, payment_status, status FROM orders WHERE id = ? AND site_id = ?`
      ).bind(orderId, siteId).first();
      if (!order) {
        const guest = await orderDb.prepare(
          `SELECT total_amount, currency, payment_status, status FROM guest_orders WHERE id = ? AND site_id = ?`
        ).bind(orderId, siteId).first();
        if (guest) {
          serverAmount = Number(guest.total_amount);
          serverCurrency = guest.currency || 'INR';
          if (guest.payment_status === 'paid') {
            return errorResponse('This order is already paid', 409);
          }
        }
      } else {
        serverAmount = Number(order.total_amount);
        serverCurrency = order.currency || 'INR';
        if (order.payment_status === 'paid') {
          return errorResponse('This order is already paid', 409);
        }
      }
    } catch (lookupErr) {
      console.error('Order lookup failed during create-order:', lookupErr);
      return errorResponse('Could not load order details', 500);
    }

    if (!serverAmount || serverAmount <= 0 || !Number.isFinite(serverAmount)) {
      return errorResponse('Order not found or has no payable amount', 404);
    }

    // Sanity-check the client-supplied amount, but the server value wins.
    if (typeof amount === 'number' && Math.abs(amount - serverAmount) > 0.01) {
      console.warn(`create-order amount mismatch: client=${amount} server=${serverAmount} order=${orderId}`);
    }

    const { keyId, keySecret } = await getRazorpayCredentials(env, siteId);

    if (!keyId || !keySecret) {
      return errorResponse('Razorpay credentials not configured. Please add Razorpay Key ID and Key Secret in your store settings.', 500);
    }

    const amountInPaise = Math.round(serverAmount * 100);
    const finalCurrency = serverCurrency || currency || 'INR';

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${keyId}:${keySecret}`),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: finalCurrency,
        receipt: receipt || `order_${Date.now()}`,
        notes: notes || {},
      }),
    });

    if (!response.ok) {
      let errorDetail = '';
      try {
        const error = await response.json();
        console.error('Razorpay API error:', JSON.stringify(error));
        errorDetail = error?.error?.description || 'Razorpay rejected the request';
      } catch {
        const errorText = await response.text();
        console.error('Razorpay error (non-JSON):', errorText);
        errorDetail = 'Razorpay returned an unexpected response';
      }
      return errorResponse(`Failed to create payment order: ${errorDetail}`, 500);
    }

    const razorpayOrder = await response.json();

    await ensurePaymentTablesExist(env);

    try {
      await env.DB.prepare(
        `INSERT INTO payment_transactions (id, site_id, order_id, razorpay_order_id, amount, currency, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))`
      ).bind(generateId(), siteId || null, orderId || null, razorpayOrder.id, serverAmount, finalCurrency).run();
    } catch (dbErr) {
      console.error('Failed to log payment transaction (non-fatal):', dbErr);
    }

    return successResponse({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId,
    });
  } catch (error) {
    console.error('Create payment order error:', error.message || error);
    return errorResponse('Failed to create payment order: ' + (error.message || 'Unknown error'), 500);
  }
}

async function verifyPayment(request, env) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    await ensurePaymentTablesExist(env);

    await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS subscriptions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            plan TEXT NOT NULL,
            billing_cycle TEXT NOT NULL,
            amount REAL NOT NULL,
            currency TEXT DEFAULT 'INR',
            status TEXT DEFAULT 'active',
            razorpay_subscription_id TEXT,
            current_period_start TEXT,
            current_period_end TEXT,
            cancelled_at TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `).run();

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, razorpay_subscription_id, planId, billingCycle, siteId, orderId } = await request.json();

    if (razorpay_subscription_id) {
      return verifySubscriptionPayment(request, env, { razorpay_subscription_id, razorpay_payment_id, razorpay_signature, planId, billingCycle });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return errorResponse('Missing payment verification data');
    }

    const { keySecret } = await getRazorpayCredentials(env, siteId);

    if (!keySecret) {
      return errorResponse('Razorpay credentials not configured', 500);
    }

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    
    const computedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body)
      .digest('hex');

    if (computedSignature !== razorpay_signature) {
      return errorResponse('Invalid payment signature', 400, 'INVALID_SIGNATURE');
    }

    const existingTx = await env.DB.prepare(
      `SELECT order_id, status FROM payment_transactions WHERE razorpay_order_id = ?`
    ).bind(razorpay_order_id).first();

    if (existingTx?.status === 'completed') {
      return successResponse({ verified: true, duplicate: true }, 'Payment already verified');
    }

    await env.DB.prepare(
      `UPDATE payment_transactions 
       SET razorpay_payment_id = ?, razorpay_signature = ?, status = 'completed', payment_method = 'razorpay'
       WHERE razorpay_order_id = ? AND status = 'pending'`
    ).bind(razorpay_payment_id, razorpay_signature, razorpay_order_id).run();

    const paymentTx = existingTx;
    const dbOrderId = paymentTx?.order_id || orderId || null;

    if (dbOrderId) {
      let order = null;
      let orderDb = null;
      let orderSiteId = siteId || null;

      if (orderSiteId) {
        orderDb = await resolveSiteDBById(env, orderSiteId);
        order = await orderDb.prepare('SELECT * FROM orders WHERE id = ?').bind(dbOrderId).first();
      }

      if (!order) {
        const allSites = await env.DB.prepare('SELECT id FROM sites').all();
        for (const s of (allSites.results || [])) {
          const sdb = await resolveSiteDBById(env, s.id);
          const found = await sdb.prepare('SELECT * FROM orders WHERE id = ?').bind(dbOrderId).first();
          if (found) {
            order = found;
            orderDb = sdb;
            orderSiteId = s.id;
            break;
          }
        }
      }

      if (order && orderDb) {
        const oldOrderBytes = order.row_size_bytes || 0;
        await orderDb.prepare(
          `UPDATE orders SET status = 'paid', payment_status = 'paid', payment_method = 'razorpay', razorpay_order_id = ?, razorpay_payment_id = ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(razorpay_order_id, razorpay_payment_id, dbOrderId).run();
        const updatedOrder = await orderDb.prepare('SELECT * FROM orders WHERE id = ?').bind(dbOrderId).first();
        if (updatedOrder && orderSiteId) {
          const newOrderBytes = estimateRowBytes(updatedOrder);
          await orderDb.prepare('UPDATE orders SET row_size_bytes = ? WHERE id = ?').bind(newOrderBytes, dbOrderId).run();
          await trackD1Update(env, orderSiteId, oldOrderBytes, newOrderBytes);
        }
        await processPostPaymentActions(env, order, ctx);
      } else {
        if (orderSiteId) {
          orderDb = orderDb || await resolveSiteDBById(env, orderSiteId);
        }
        try {
          let guestOrder = null;
          let guestDb = null;

          if (orderSiteId && orderDb) {
            guestOrder = await orderDb.prepare('SELECT * FROM guest_orders WHERE id = ?').bind(dbOrderId).first();
            if (guestOrder) guestDb = orderDb;
          }

          if (!guestOrder) {
            const allSites = await env.DB.prepare('SELECT id FROM sites').all();
            for (const s of (allSites.results || [])) {
              const sdb = await resolveSiteDBById(env, s.id);
              const found = await sdb.prepare('SELECT * FROM guest_orders WHERE id = ?').bind(dbOrderId).first();
              if (found) {
                guestOrder = found;
                guestDb = sdb;
                break;
              }
            }
          }

          if (guestOrder && guestDb) {
            const oldGuestBytes = guestOrder.row_size_bytes || 0;
            await guestDb.prepare(
              `UPDATE guest_orders SET status = 'paid', payment_status = 'paid', payment_method = 'razorpay', razorpay_order_id = ?, razorpay_payment_id = ?, updated_at = datetime('now') WHERE id = ?`
            ).bind(razorpay_order_id, razorpay_payment_id, dbOrderId).run();
            const updatedGuestOrder = await guestDb.prepare('SELECT * FROM guest_orders WHERE id = ?').bind(dbOrderId).first();
            if (updatedGuestOrder) {
              const newGuestBytes = estimateRowBytes(updatedGuestOrder);
              await guestDb.prepare('UPDATE guest_orders SET row_size_bytes = ? WHERE id = ?').bind(newGuestBytes, dbOrderId).run();
              const guestSiteId = guestOrder.site_id || updatedGuestOrder.site_id;
              if (guestSiteId) {
                await trackD1Update(env, guestSiteId, oldGuestBytes, newGuestBytes);
              }
            }
            await processPostPaymentActions(env, guestOrder, ctx);
          }
        } catch (guestUpdateErr) {
          console.error('Failed to update guest order status:', guestUpdateErr);
        }
      }
    }

    return successResponse({ verified: true }, 'Payment verified successfully');
  } catch (error) {
    console.error('Verify payment error:', error);
    return errorResponse('Payment verification failed', 500);
  }
}

async function fetchRazorpaySubscriptionEntity(env, subId) {
  try {
    const platformKeyId = await getPlatformRazorpayKeyId(env);
    const keyId = platformKeyId || env.RAZORPAY_KEY_ID;
    const keySecret = env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return null;
    const res = await fetch(`https://api.razorpay.com/v1/subscriptions/${subId}`, {
      headers: { 'Authorization': 'Basic ' + btoa(`${keyId}:${keySecret}`) },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error('fetchRazorpaySubscriptionEntity error:', e);
    return null;
  }
}

async function verifySubscriptionPayment(request, env, { razorpay_subscription_id, razorpay_payment_id, razorpay_signature }) {
  try {
    const keySecret = env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return errorResponse('Razorpay credentials not configured', 500);
    }

    const body = razorpay_payment_id + '|' + razorpay_subscription_id;
    const computedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body)
      .digest('hex');

    if (computedSignature !== razorpay_signature) {
      return errorResponse('Invalid subscription payment signature', 400, 'INVALID_SIGNATURE');
    }

    const user = await validateAuth(request, env);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    const existingActive = await env.DB.prepare(
      `SELECT id FROM subscriptions WHERE razorpay_subscription_id = ? AND status = 'active'`
    ).bind(razorpay_subscription_id).first();

    if (existingActive) {
      return successResponse({ verified: true, planActivated: true, duplicate: true }, 'Subscription already activated');
    }

    const pending = await env.DB.prepare(
      `SELECT ps.*, sp.plan_name, sp.billing_cycle, sp.display_price
       FROM pending_subscriptions ps
       JOIN subscription_plans sp ON ps.plan_id = sp.id
       WHERE ps.razorpay_subscription_id = ? AND ps.user_id = ?`
    ).bind(razorpay_subscription_id, user.id).first();

    if (!pending) {
      for (let attempt = 0; attempt < 3; attempt++) {
        await new Promise(r => setTimeout(r, 1500));
        const retryActive = await env.DB.prepare(
          `SELECT id FROM subscriptions WHERE razorpay_subscription_id = ? AND status = 'active'`
        ).bind(razorpay_subscription_id).first();
        if (retryActive) {
          return successResponse({ verified: true, planActivated: true, duplicate: true }, 'Subscription already activated');
        }
        const retryPending = await env.DB.prepare(
          `SELECT ps.*, sp.plan_name, sp.billing_cycle, sp.display_price
           FROM pending_subscriptions ps
           JOIN subscription_plans sp ON ps.plan_id = sp.id
           WHERE ps.razorpay_subscription_id = ? AND ps.user_id = ?`
        ).bind(razorpay_subscription_id, user.id).first();
        if (retryPending) {
          const retryEntity = await fetchRazorpaySubscriptionEntity(env, razorpay_subscription_id);
          const retryActivated = await activateSubscription(env, user.id, retryPending.plan_name, retryPending.billing_cycle, razorpay_payment_id, razorpay_subscription_id, retryPending.display_price, retryPending.site_id || null, retryEntity);
          if (retryActivated) {
            try { await env.DB.prepare(`DELETE FROM pending_subscriptions WHERE razorpay_subscription_id = ?`).bind(razorpay_subscription_id).run(); } catch {}
            return successResponse({ verified: true, planActivated: true }, 'Subscription payment verified and plan activated');
          }
        }
      }
      return errorResponse('No matching pending subscription found. If you were charged, your plan will activate shortly via webhook. Please refresh the page in a minute.', 400);
    }

    const subEntity = await fetchRazorpaySubscriptionEntity(env, razorpay_subscription_id);
    const activated = await activateSubscription(env, user.id, pending.plan_name, pending.billing_cycle, razorpay_payment_id, razorpay_subscription_id, pending.display_price, pending.site_id || null, subEntity);

    if (!activated) {
      return errorResponse('Failed to activate subscription', 500);
    }

    try {
      await env.DB.prepare(`DELETE FROM pending_subscriptions WHERE razorpay_subscription_id = ?`).bind(razorpay_subscription_id).run();
    } catch {}

    return successResponse({ verified: true, planActivated: true }, 'Subscription payment verified and plan activated');
  } catch (error) {
    console.error('Verify subscription payment error:', error);
    return errorResponse('Subscription payment verification failed', 500);
  }
}

async function processPostPaymentActions(env, order, ctx) {
  try {
    const orderItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    const shippingAddress = typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : order.shipping_address;
    await sendOrderEmails(env, order.site_id, {
      orderId: order.id,
      orderNumber: order.order_number,
      processedItems: orderItems,
      total: order.total,
      paymentMethod: 'razorpay',
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
      shippingAddress,
      isGuest: !!order.is_guest,
      currency: order.currency,
    });
  } catch (emailErr) {
    console.error('Failed to send order emails after payment:', emailErr);
  }

  // Auto-ship via Shiprocket if the merchant has the toggle enabled.
  // Run as a background task via ctx.waitUntil so payment verification responds
  // to the customer immediately even if Shiprocket is slow or down. Failures
  // are logged and persisted on the order's shiprocket_status/error columns.
  const autoShipTask = (async () => {
    try {
      const config = await getSiteConfig(env, order.site_id);
      let s = {};
      try { if (config.settings) s = typeof config.settings === 'string' ? JSON.parse(config.settings) : config.settings; } catch {}
      if (s?.shiprocket?.enabled && s?.shiprocket?.autoShipOnPayment) {
        const { shipOrderViaShiprocket } = await import('../storefront/shipping-worker.js');
        const r = await shipOrderViaShiprocket(env, order.site_id, order.id);
        if (!r?.ok) console.warn('[auto-ship paid] failed:', r);
      }
    } catch (e) {
      console.error('[auto-ship paid] hook error:', e);
    }
  })();
  if (ctx && typeof ctx.waitUntil === 'function') {
    ctx.waitUntil(autoShipTask);
  } else {
    // Best-effort: detach from the response. Errors are caught inside the task.
    autoShipTask.catch(() => {});
  }
}

async function handleSubscription(request, env) {
  const user = await validateAuth(request, env);
  if (!user) {
    return errorResponse('Unauthorized', 401);
  }

  if (request.method === 'GET') {
    return getUserSubscription(env, user);
  }

  if (request.method === 'POST') {
    return createRazorpaySubscription(request, env, user);
  }

  return errorResponse('Method not allowed', 405);
}

async function handleCancelSubscription(request, env) {
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405);

  const user = await validateAuth(request, env);
  if (!user) return errorResponse('Unauthorized', 401);

  try {
    const { siteId } = await request.json();
    if (!siteId) return errorResponse('siteId is required', 400);

    const site = await env.DB.prepare(
      `SELECT id FROM sites WHERE id = ? AND user_id = ?`
    ).bind(siteId, user.id).first();
    if (!site) return errorResponse('Site not found or you do not own this site', 403);

    const activeSub = await env.DB.prepare(
      `SELECT * FROM subscriptions WHERE site_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`
    ).bind(siteId).first();

    if (!activeSub) return errorResponse('No active subscription found for this site', 404);

    if (activeSub.plan === 'trial') return errorResponse('Trial subscriptions cannot be cancelled', 400);

    if (activeSub.razorpay_subscription_id) {
      const cancelled = await cancelRazorpaySubscription(env, activeSub.razorpay_subscription_id);
      if (!cancelled) {
        return errorResponse('Failed to cancel subscription with payment provider. Please try again.', 500);
      }
    }

    await env.DB.prepare(
      `UPDATE subscriptions SET status = 'cancelled', cancelled_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
    ).bind(activeSub.id).run();

    return successResponse({
      siteId,
      plan: activeSub.plan,
      periodEnd: activeSub.current_period_end,
    }, 'Subscription cancelled. You can continue using your plan until ' + (activeSub.current_period_end ? new Date(activeSub.current_period_end).toLocaleDateString() : 'the end of your billing period') + '.');
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return errorResponse('Failed to cancel subscription', 500);
  }
}

export async function cancelRazorpaySubscription(env, razorpaySubscriptionId) {
  try {
    const platformKeyId = await getPlatformRazorpayKeyId(env);
    const keyId = platformKeyId || env.RAZORPAY_KEY_ID;
    const keySecret = env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error('Razorpay credentials not configured for cancellation');
      return false;
    }

    const response = await fetch(`https://api.razorpay.com/v1/subscriptions/${razorpaySubscriptionId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${keyId}:${keySecret}`),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cancel_at_cycle_end: 1 }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Razorpay cancel error:', errorText);
      const errorData = (() => { try { return JSON.parse(errorText); } catch { return null; } })();
      if (errorData?.error?.code === 'BAD_REQUEST_ERROR' && errorText.includes('already cancelled')) {
        return true;
      }
      return false;
    }

    console.log('Razorpay subscription cancelled:', razorpaySubscriptionId);
    return true;
  } catch (error) {
    console.error('cancelRazorpaySubscription error:', error);
    return false;
  }
}

async function getUserSubscription(env, user) {
  try {
    const subscription = await env.DB.prepare(
      `SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`
    ).bind(user.id).first();

    if (subscription) {
      if (subscription.current_period_end && new Date(subscription.current_period_end) < new Date()) {
        await env.DB.prepare(
          `UPDATE subscriptions SET status = 'expired', updated_at = datetime('now') WHERE id = ?`
        ).bind(subscription.id).run();

        return successResponse({
          id: subscription.id,
          plan: subscription.plan,
          billingCycle: subscription.billing_cycle,
          status: 'expired',
          currentPeriodEnd: subscription.current_period_end,
          razorpaySubscriptionId: subscription.razorpay_subscription_id,
        });
      }

      return successResponse({
        id: subscription.id,
        plan: subscription.plan,
        billingCycle: subscription.billing_cycle,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        razorpaySubscriptionId: subscription.razorpay_subscription_id,
      });
    }

    const latestSub = await env.DB.prepare(
      `SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`
    ).bind(user.id).first();

    if (latestSub) {
      return successResponse({
        id: latestSub.id,
        plan: latestSub.plan,
        billingCycle: latestSub.billing_cycle,
        status: latestSub.status,
        currentPeriodEnd: latestSub.current_period_end,
        razorpaySubscriptionId: latestSub.razorpay_subscription_id,
      });
    }

    return successResponse({ plan: null, status: 'none' });
  } catch (error) {
    console.error('Get subscription error:', error);
    return errorResponse('Failed to fetch subscription', 500);
  }
}

async function createRazorpaySubscription(request, env, user) {
  try {
    const { planId, siteId } = await request.json();

    if (!planId) {
      return errorResponse('Plan ID is required');
    }

    const plan = await env.DB.prepare(
      `SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1`
    ).bind(planId).first();

    if (!plan) {
      return errorResponse('Plan not found or inactive');
    }

    if (!plan.razorpay_plan_id) {
      return errorResponse('This plan is not configured for payments yet');
    }

    if (siteId) {
      const site = await env.DB.prepare(
        `SELECT id FROM sites WHERE id = ? AND user_id = ?`
      ).bind(siteId, user.id).first();
      if (!site) {
        return errorResponse('Site not found or you do not own this site.', 403);
      }

      const alreadyScheduled = await env.DB.prepare(
        `SELECT plan, billing_cycle, current_period_start FROM subscriptions WHERE site_id = ? AND status = 'scheduled' ORDER BY current_period_start ASC LIMIT 1`
      ).bind(siteId).first();
      if (alreadyScheduled) {
        const dt = alreadyScheduled.current_period_start ? new Date(alreadyScheduled.current_period_start).toLocaleDateString() : 'the end of your current billing period';
        return errorResponse(`A plan change to "${alreadyScheduled.plan}" is already scheduled to start on ${dt}. Please wait for it to take effect or contact support to cancel it.`, 409, 'PLAN_CHANGE_PENDING');
      }
    }

    const platformKeyId = await getPlatformRazorpayKeyId(env);
    const keyId = platformKeyId || env.RAZORPAY_KEY_ID;
    const keySecret = env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return errorResponse('Razorpay credentials not configured', 500);
    }

    // Plan change handling: if the site already has a paid subscription that the
    // user has already paid for (period not yet over), schedule the NEW plan to
    // start at the end of that period via Razorpay's `start_at`. This applies to
    // BOTH downgrades and upgrades — it prevents double-billing (the user gave
    // money for the current month already) and avoids losing prepaid days.
    // Trial → paid stays immediate (trial is free, no money to lose).
    let scheduledStartAt = null;
    let isPlanChange = false;
    let oldSubToCancel = null;
    if (siteId) {
      const currentSub = await env.DB.prepare(
        `SELECT * FROM subscriptions
         WHERE site_id = ? AND status = 'active'
         ORDER BY created_at DESC LIMIT 1`
      ).bind(siteId).first();
      if (currentSub && currentSub.plan && currentSub.plan !== 'trial' && currentSub.current_period_end) {
        const periodEndMs = new Date(currentSub.current_period_end).getTime();
        if (periodEndMs > Date.now() + 60_000) {
          scheduledStartAt = Math.floor(periodEndMs / 1000);
          isPlanChange = true;
          oldSubToCancel = currentSub.razorpay_subscription_id || null;
        }
      }
    }

    const subBody = {
      plan_id: plan.razorpay_plan_id,
      total_count: plan.billing_cycle === 'monthly' ? 300 : plan.billing_cycle === '3months' ? 100 : plan.billing_cycle === '6months' ? 50 : 25,
      quantity: 1,
      notes: {
        userId: user.id,
        planId: plan.id,
        planName: plan.plan_name,
        billingCycle: plan.billing_cycle,
        siteId: siteId || '',
        scheduled: isPlanChange ? '1' : '',
      },
    };
    if (scheduledStartAt) subBody.start_at = scheduledStartAt;

    const response = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${keyId}:${keySecret}`),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try { errorData = JSON.parse(errorText); } catch { errorData = errorText; }
      console.error('Razorpay Subscription Error:', errorData);
      const errorMessage = errorData?.error?.description || 'Failed to create subscription';
      return errorResponse(`Razorpay error: ${errorMessage}`, 500);
    }

    const razorpaySub = await response.json();

    try {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS pending_subscriptions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          site_id TEXT,
          plan_id TEXT NOT NULL,
          razorpay_subscription_id TEXT NOT NULL UNIQUE,
          created_at TEXT DEFAULT (datetime('now'))
        )
      `).run();

      try {
        await env.DB.prepare(`ALTER TABLE pending_subscriptions ADD COLUMN site_id TEXT`).run();
      } catch (e) {}

      await env.DB.prepare(
        `INSERT INTO pending_subscriptions (id, user_id, site_id, plan_id, razorpay_subscription_id, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`
      ).bind(generateId(), user.id, siteId || null, plan.id, razorpaySub.id).run();
    } catch (dbErr) {
      console.error('Failed to store pending subscription (non-fatal):', dbErr);
    }

    // NOTE: We do NOT cancel the old higher-tier subscription here. If the user abandons
    // checkout, the existing plan must keep auto-renewing. The old sub is cancelled (with
    // cancel_at_cycle_end:1) only after the new scheduled sub is successfully activated
    // in `activateSubscription` after payment verification.

    return successResponse({
      subscriptionId: razorpaySub.id,
      razorpayPlanId: plan.razorpay_plan_id,
      keyId,
      planId: plan.id,
      planName: plan.plan_name,
      billingCycle: plan.billing_cycle,
      amount: plan.display_price,
      scheduled: isPlanChange,
      scheduledStartAt: scheduledStartAt ? new Date(scheduledStartAt * 1000).toISOString() : null,
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    return errorResponse('Failed to create subscription', 500);
  }
}

async function getPublicPlans(request, env) {
  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const plansResult = await env.DB.prepare(
      `SELECT id, plan_name, billing_cycle, display_price, original_price, features, is_popular, display_order, plan_tier, tagline 
       FROM subscription_plans WHERE is_active = 1 AND billing_cycle IN ('monthly', '3months', '6months', 'yearly') ORDER BY display_order ASC, plan_name ASC`
    ).all();

    const plans = (plansResult.results || []).map(p => ({
      ...p,
      features: (() => { try { return JSON.parse(p.features); } catch { return []; } })(),
    }));

    const platformKeyId = await getPlatformRazorpayKeyId(env);

    let enterpriseConfig = { enabled: false, message: '', email: '' };
    try {
      const settingsResult = await env.DB.prepare(
        `SELECT setting_key, setting_value FROM platform_settings WHERE setting_key IN ('enterprise_enabled', 'enterprise_message', 'enterprise_email')`
      ).all();
      for (const row of (settingsResult.results || [])) {
        if (row.setting_key === 'enterprise_enabled') enterpriseConfig.enabled = row.setting_value === 'true';
        if (row.setting_key === 'enterprise_message') enterpriseConfig.message = row.setting_value;
        if (row.setting_key === 'enterprise_email') enterpriseConfig.email = row.setting_value;
      }
    } catch (e) {}

    return successResponse({
      plans,
      razorpayKeyId: platformKeyId || env.RAZORPAY_KEY_ID || null,
      enterpriseConfig,
    });
  } catch (error) {
    console.error('Get public plans error:', error);
    return errorResponse('Failed to fetch plans', 500);
  }
}

async function handleRazorpayWebhook(request, env) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET;
    const body = await request.text();

    if (!webhookSecret) {
      console.error('RAZORPAY_WEBHOOK_SECRET not configured - rejecting webhook');
      return errorResponse('Webhook not configured', 500);
    }

    const signature = request.headers.get('x-razorpay-signature');
    if (!signature) {
      console.error('Missing x-razorpay-signature header');
      return errorResponse('Missing signature', 401);
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error('Webhook signature mismatch');
      return errorResponse('Invalid webhook signature', 401);
    }

    const payload = JSON.parse(body);
    const event = payload.event;
    // For payment.* events we want the payment entity directly (so we can read
    // its `order_id` and look up the matching overage invoice). For
    // subscription.* events we want the subscription entity.
    const isPaymentEvent = typeof event === 'string' && event.startsWith('payment.');
    const entity = isPaymentEvent
      ? (payload.payload?.payment?.entity || payload.payload?.subscription?.entity)
      : (payload.payload?.subscription?.entity || payload.payload?.payment?.entity);

    const eventId = request.headers.get('x-razorpay-event-id') || payload.id || `${event}:${entity?.id}:${payload.created_at || ''}`;

    // Claim the event id atomically. If another concurrent invocation is already
    // processing it, INSERT OR IGNORE returns 0 changes and we skip. We commit
    // (i.e. KEEP the row) only if the handler completes successfully; on failure
    // we delete it so Razorpay retries can re-process the event.
    let claimed = false;
    if (eventId) {
      try {
        const insertRes = await env.DB.prepare(
          `INSERT OR IGNORE INTO processed_webhooks (event_id, event_type, processed_at) VALUES (?, ?, datetime('now'))`
        ).bind(eventId, event || null).run();
        const changes = insertRes?.meta?.changes ?? insertRes?.changes ?? 0;
        if (!changes) {
          console.log('Duplicate webhook event ignored:', eventId, event);
          return jsonResponse({ status: 'ok', duplicate: true });
        }
        claimed = true;
      } catch (e) {
        console.error('Webhook idempotency check failed (continuing without dedupe):', e.message || e);
      }
    }

    console.log('Razorpay webhook event:', event, eventId);

    try {
      switch (event) {
        case 'subscription.activated':
          await handleSubscriptionActivated(env, entity);
          break;
        case 'subscription.charged':
          await handleSubscriptionCharged(env, entity, payload.payload?.payment?.entity);
          break;
        case 'subscription.cancelled':
        case 'subscription.completed':
          await handleSubscriptionCancelled(env, entity);
          break;
        case 'subscription.paused':
          await handleSubscriptionPaused(env, entity);
          break;
        case 'payment.captured':
          // We only care about overage-invoice payments here. Storefront
          // order payments are confirmed by the explicit verify endpoint, not
          // by this webhook. handleOverageInvoicePaid is a no-op when the
          // payment's order_id doesn't match an overage invoice.
          await handleOverageInvoicePaid(env, entity);
          break;
        default:
          console.log('Unhandled webhook event:', event);
      }
    } catch (handlerErr) {
      // Release the idempotency claim so Razorpay's retry can re-process this event.
      if (claimed && eventId) {
        try {
          await env.DB.prepare(`DELETE FROM processed_webhooks WHERE event_id = ?`).bind(eventId).run();
        } catch (delErr) {
          console.error('Failed to release webhook claim:', delErr.message || delErr);
        }
      }
      console.error('Webhook handler failed for event', event, eventId, ':', handlerErr.message || handlerErr);
      return errorResponse('Webhook processing failed', 500);
    }

    return jsonResponse({ status: 'ok' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return errorResponse('Webhook processing failed', 500);
  }
}

async function handleSubscriptionActivated(env, entity) {
  if (!entity) return;
  const subId = entity.id;

  try {
    const existingActive = await env.DB.prepare(
      `SELECT * FROM subscriptions WHERE razorpay_subscription_id = ? AND status = 'active'`
    ).bind(subId).first();

    if (existingActive) {
      console.log('Subscription already activated:', subId);
      return;
    }

    const pending = await env.DB.prepare(
      `SELECT ps.*, sp.plan_name, sp.billing_cycle, sp.display_price
       FROM pending_subscriptions ps
       JOIN subscription_plans sp ON ps.plan_id = sp.id
       WHERE ps.razorpay_subscription_id = ?`
    ).bind(subId).first();

    if (pending) {
      await activateSubscription(env, pending.user_id, pending.plan_name, pending.billing_cycle, null, subId, pending.display_price, pending.site_id || null, entity);
      try {
        await env.DB.prepare(`DELETE FROM pending_subscriptions WHERE razorpay_subscription_id = ?`).bind(subId).run();
      } catch {}
    } else {
      const notes = entity.notes || {};
      if (notes.userId && notes.planName) {
        await activateSubscription(env, notes.userId, notes.planName, notes.billingCycle || '3months', null, subId, null, notes.siteId || null, entity);
      } else {
        console.error('No pending subscription or notes found for:', subId);
      }
    }
  } catch (err) {
    console.error('handleSubscriptionActivated error:', err);
  }
}

async function handleSubscriptionCharged(env, subEntity, paymentEntity) {
  if (!subEntity) return;
  const subId = subEntity.id;

  try {
    const existingSub = await env.DB.prepare(
      `SELECT * FROM subscriptions WHERE razorpay_subscription_id = ? AND status = 'active'`
    ).bind(subId).first();

    if (existingSub) {
      let newEnd;
      if (subEntity.current_end) {
        newEnd = new Date(subEntity.current_end * 1000);
      } else {
        const periodMonths = existingSub.billing_cycle === 'monthly' ? 1 : existingSub.billing_cycle === '3months' ? 3 : existingSub.billing_cycle === '6months' ? 6 : 12;
        newEnd = new Date();
        newEnd.setMonth(newEnd.getMonth() + periodMonths);
      }

      let newStart;
      if (subEntity.current_start) {
        newStart = new Date(subEntity.current_start * 1000);
      }

      const existingEnd = existingSub.current_period_end ? new Date(existingSub.current_period_end).getTime() : 0;
      if (existingEnd && Math.abs(existingEnd - newEnd.getTime()) < 60000) {
        console.log('subscription.charged duplicate (period_end unchanged), skipping:', subId);
        return;
      }

      await env.DB.prepare(
        `UPDATE subscriptions SET current_period_start = COALESCE(?, current_period_start), current_period_end = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(newStart ? newStart.toISOString() : null, newEnd.toISOString(), existingSub.id).run();

      if (existingSub.site_id) {
        await env.DB.prepare(
          `UPDATE sites SET subscription_expires_at = ?, updated_at = datetime('now') WHERE id = ? AND COALESCE(subscription_plan, '') != 'enterprise'`
        ).bind(newEnd.toISOString(), existingSub.site_id).run();
      } else {
        await env.DB.prepare(
          `UPDATE sites SET subscription_expires_at = ?, updated_at = datetime('now') WHERE user_id = ? AND COALESCE(subscription_plan, '') != 'enterprise'`
        ).bind(newEnd.toISOString(), existingSub.user_id).run();
      }

      console.log('Subscription renewed:', subId);
    }
  } catch (err) {
    console.error('handleSubscriptionCharged error:', err);
  }
}

async function handleSubscriptionCancelled(env, entity) {
  if (!entity) return;
  const subId = entity.id;

  try {
    const sub = await env.DB.prepare(
      `SELECT * FROM subscriptions WHERE razorpay_subscription_id = ? AND status IN ('active', 'scheduled')`
    ).bind(subId).first();

    if (sub) {
      await env.DB.prepare(
        `UPDATE subscriptions SET status = 'cancelled', cancelled_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
      ).bind(sub.id).run();

      const periodEndCovered = sub.current_period_end && new Date(sub.current_period_end) > new Date();

      if (sub.site_id) {
        // Promote a waiting scheduled (downgrade) sub FIRST so the site never has a
        // moment where its plan is NULL between the old plan ending and the new one
        // starting. activateScheduledSubscription overwrites sites.subscription_plan
        // and subscription_expires_at to the new plan's values.
        const scheduled = await env.DB.prepare(
          `SELECT * FROM subscriptions WHERE site_id = ? AND status = 'scheduled' AND (current_period_start IS NULL OR datetime(current_period_start) <= datetime('now')) ORDER BY created_at ASC LIMIT 1`
        ).bind(sub.site_id).first();

        if (scheduled) {
          await activateScheduledSubscription(env, scheduled);
        } else {
          // No scheduled successor: clear the site plan. Preserve the original period_end
          // as subscription_expires_at when this is the natural cycle-end cancellation,
          // otherwise null it out (mid-cycle cancellation).
          await env.DB.prepare(
            `UPDATE sites SET subscription_plan = NULL, subscription_expires_at = ?, updated_at = datetime('now') WHERE id = ? AND COALESCE(subscription_plan, '') != 'enterprise'`
          ).bind(periodEndCovered ? sub.current_period_end : null, sub.site_id).run();
        }
      } else {
        await env.DB.prepare(
          `UPDATE sites SET subscription_plan = NULL, subscription_expires_at = NULL, updated_at = datetime('now') WHERE user_id = ? AND COALESCE(subscription_plan, '') != 'enterprise'`
        ).bind(sub.user_id).run();
      }
    }

    console.log('Subscription cancelled:', subId);
  } catch (err) {
    console.error('handleSubscriptionCancelled error:', err);
  }
}

export async function activateScheduledSubscription(env, sub) {
  try {
    await env.DB.prepare(
      `UPDATE subscriptions SET status = 'active', updated_at = datetime('now') WHERE id = ?`
    ).bind(sub.id).run();
    if (sub.site_id) {
      await env.DB.prepare(
        `UPDATE sites SET subscription_plan = ?, subscription_expires_at = ?, updated_at = datetime('now') WHERE id = ? AND COALESCE(subscription_plan, '') != 'enterprise'`
      ).bind(sub.plan, sub.current_period_end, sub.site_id).run();
    }
    console.log(`Activated scheduled subscription ${sub.id} (plan=${sub.plan}) for site=${sub.site_id || 'n/a'}`);
  } catch (e) {
    console.error('activateScheduledSubscription error:', e);
  }
}

async function handleSubscriptionPaused(env, entity) {
  if (!entity) return;
  const subId = entity.id;

  try {
    const sub = await env.DB.prepare(
      `SELECT * FROM subscriptions WHERE razorpay_subscription_id = ? AND status = 'active'`
    ).bind(subId).first();

    if (sub) {
      // Mark as paused but DO NOT immediately wipe site expiry. The user already
      // paid for this period; honor it. The sites.subscription_expires_at stays
      // as-is, and cron will expire it naturally when the date passes.
      await env.DB.prepare(
        `UPDATE subscriptions SET status = 'paused', updated_at = datetime('now') WHERE id = ?`
      ).bind(sub.id).run();
    }

    console.log('Subscription paused:', subId);
  } catch (err) {
    console.error('handleSubscriptionPaused error:', err);
  }
}

export async function activateSubscription(env, userId, planName, billingCycle, razorpayPaymentId, razorpaySubscriptionId, amount, siteId, razorpayEntity) {
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        site_id TEXT,
        plan TEXT NOT NULL,
        billing_cycle TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'INR',
        status TEXT DEFAULT 'active',
        razorpay_subscription_id TEXT,
        current_period_start TEXT,
        current_period_end TEXT,
        cancelled_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
      )
    `).run();

    try {
      await env.DB.prepare(`ALTER TABLE subscriptions ADD COLUMN site_id TEXT REFERENCES sites(id) ON DELETE CASCADE`).run();
    } catch (e) {}

    let periodStart, periodEnd;
    if (razorpayEntity?.current_start && razorpayEntity?.current_end) {
      periodStart = new Date(razorpayEntity.current_start * 1000);
      periodEnd = new Date(razorpayEntity.current_end * 1000);
    } else if (razorpayEntity?.start_at) {
      periodStart = new Date(razorpayEntity.start_at * 1000);
      const periodMonths = billingCycle === 'monthly' ? 1 : billingCycle === '3months' ? 3 : billingCycle === '6months' ? 6 : billingCycle === 'yearly' ? 12 : 1;
      periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + periodMonths);
    } else {
      const periodMonths = billingCycle === 'monthly' ? 1 : billingCycle === '3months' ? 3 : billingCycle === '6months' ? 6 : billingCycle === 'yearly' ? 12 : 1;
      periodStart = new Date();
      periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + periodMonths);
    }

    // Detect a scheduled (downgrade) activation: the new sub's start is in the future
    // because Razorpay was created with `start_at` so the higher-tier plan can run out first.
    const now = Date.now();
    const isScheduledStart = periodStart.getTime() > now + 60_000;
    const targetStatus = isScheduledStart ? 'scheduled' : 'active';

    // Compare plan tiers vs the current active sub for this site to decide whether to replace it.
    let isUpgradeOrSameTier = true;
    if (siteId) {
      try {
        const tierRow = await env.DB.prepare(
          `SELECT s.id, s.razorpay_subscription_id, sp_old.plan_tier AS old_tier, sp_new.plan_tier AS new_tier
           FROM subscriptions s
           LEFT JOIN subscription_plans sp_old ON sp_old.plan_name = s.plan AND sp_old.billing_cycle = s.billing_cycle
           LEFT JOIN subscription_plans sp_new ON sp_new.plan_name = ? AND sp_new.billing_cycle = ?
           WHERE s.site_id = ? AND s.status = 'active'
           ORDER BY s.created_at DESC LIMIT 1`
        ).bind(planName, billingCycle, siteId).first();
        if (tierRow && tierRow.old_tier != null && tierRow.new_tier != null && tierRow.new_tier < tierRow.old_tier) {
          isUpgradeOrSameTier = false;
        }
      } catch (e) {}
    }

    // Only cancel/replace the existing active sub for upgrades or same-tier swaps. For downgrades, leave it alone.
    if (siteId && isUpgradeOrSameTier && !isScheduledStart) {
      const oldSubs = (await env.DB.prepare(`SELECT id, razorpay_subscription_id FROM subscriptions WHERE site_id = ? AND status = 'active'`).bind(siteId).all()).results || [];

      for (const oldSub of oldSubs) {
        if (oldSub.razorpay_subscription_id && oldSub.razorpay_subscription_id !== razorpaySubscriptionId) {
          const cancelled = await cancelRazorpaySubscription(env, oldSub.razorpay_subscription_id);
          if (!cancelled) {
            console.error(`Failed to cancel old Razorpay subscription ${oldSub.razorpay_subscription_id} during plan upgrade to ${planName}. Aborting activation.`);
            return false;
          }
        }
      }

      await env.DB.prepare(
        `UPDATE subscriptions SET status = 'cancelled', cancelled_at = datetime('now') WHERE site_id = ? AND status = 'active'`
      ).bind(siteId).run();
    }

    const resolvedAmount = amount || 0;
    const newId = generateId();

    // Atomic insert: relies on UNIQUE index on razorpay_subscription_id to prevent duplicates.
    let inserted = true;
    if (razorpaySubscriptionId) {
      const insertRes = await env.DB.prepare(
        `INSERT OR IGNORE INTO subscriptions (id, user_id, site_id, plan, billing_cycle, amount, status, razorpay_subscription_id, current_period_start, current_period_end, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      ).bind(
        newId, userId, siteId || null, planName, billingCycle, resolvedAmount,
        targetStatus, razorpaySubscriptionId, periodStart.toISOString(), periodEnd.toISOString()
      ).run();
      const changes = insertRes?.meta?.changes ?? insertRes?.changes ?? 0;
      inserted = changes > 0;

      if (!inserted) {
        // Row already exists (race or retry). Reconcile fields, but don't downgrade an active sub back to scheduled.
        const existingSub = await env.DB.prepare(
          `SELECT id, status FROM subscriptions WHERE razorpay_subscription_id = ?`
        ).bind(razorpaySubscriptionId).first();
        if (existingSub) {
          if (existingSub.status === 'active') {
            console.log(`Subscription already active for razorpay_subscription_id=${razorpaySubscriptionId}, skipping duplicate`);
            if (siteId && !isScheduledStart) {
              await env.DB.prepare(
                `UPDATE sites SET subscription_plan = ?, subscription_expires_at = ?, updated_at = datetime('now') WHERE id = ? AND COALESCE(subscription_plan, '') != 'enterprise'`
              ).bind(planName, periodEnd.toISOString(), siteId).run();
            }
            return true;
          }
          await env.DB.prepare(
            `UPDATE subscriptions SET status = ?, plan = ?, billing_cycle = ?, amount = ?, site_id = ?, current_period_start = ?, current_period_end = ?, updated_at = datetime('now') WHERE id = ?`
          ).bind(targetStatus, planName, billingCycle, resolvedAmount, siteId || null, periodStart.toISOString(), periodEnd.toISOString(), existingSub.id).run();
          console.log(`Reconciled existing subscription row for razorpay_subscription_id=${razorpaySubscriptionId} → ${targetStatus}`);
        }
      }
    } else {
      await env.DB.prepare(
        `INSERT INTO subscriptions (id, user_id, site_id, plan, billing_cycle, amount, status, razorpay_subscription_id, current_period_start, current_period_end, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, datetime('now'))`
      ).bind(newId, userId, siteId || null, planName, billingCycle, resolvedAmount, targetStatus, periodStart.toISOString(), periodEnd.toISOString()).run();
    }

    await env.DB.prepare(
      `UPDATE users SET updated_at = datetime('now') WHERE id = ?`
    ).bind(userId).run();

    // Only update sites.subscription_plan when the new plan is actually live now
    // (active immediately). Scheduled downgrades wait for the cron/webhook to flip them.
    if (siteId && !isScheduledStart) {
      await env.DB.prepare(
        `UPDATE sites SET subscription_plan = ?, subscription_expires_at = ?, updated_at = datetime('now') WHERE id = ? AND COALESCE(subscription_plan, '') != 'enterprise'`
      ).bind(planName, periodEnd.toISOString(), siteId).run();
    }

    // For a confirmed downgrade (now that the new sub is in our DB), ask Razorpay to
    // cancel the existing higher-tier sub at the end of its current cycle so it does
    // not auto-renew. Done AFTER successful activation/insert so an abandoned checkout
    // never strands the user without a plan.
    if (isScheduledStart && siteId) {
      try {
        const oldActive = await env.DB.prepare(
          `SELECT id, razorpay_subscription_id FROM subscriptions
           WHERE site_id = ? AND status = 'active'
             AND COALESCE(razorpay_subscription_id, '') != COALESCE(?, '')
           ORDER BY created_at DESC LIMIT 1`
        ).bind(siteId, razorpaySubscriptionId || '').first();
        if (oldActive?.razorpay_subscription_id) {
          await cancelRazorpaySubscription(env, oldActive.razorpay_subscription_id);
        }
      } catch (e) {
        console.error('Failed to schedule old sub cancel for downgrade (post-activation):', e);
      }
    }

    console.log(`Subscription ${targetStatus}: user=${userId}, site=${siteId || 'all'}, plan=${planName}, cycle=${billingCycle}, startsAt=${periodStart.toISOString()}`);
    return true;
  } catch (error) {
    console.error('Activate subscription error:', error);
    if (error.message) console.error('Error message:', error.message);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Overage invoice payment handler (called from the Razorpay webhook).
// ---------------------------------------------------------------------------
// Marks an `enterprise_usage_monthly` row as paid when its `razorpay_order_id`
// matches the order_id on a captured payment. No-op if the payment is for
// anything else (storefront orders, subscriptions, etc.) so it is safe to
// always invoke on payment.captured events.
async function handleOverageInvoicePaid(env, paymentEntity) {
  if (!paymentEntity || !paymentEntity.order_id) return;

  const invoice = await env.DB.prepare(
    `SELECT id, status FROM enterprise_usage_monthly WHERE razorpay_order_id = ? LIMIT 1`
  ).bind(paymentEntity.order_id).first();
  if (!invoice) return; // not an overage invoice — ignore

  if (invoice.status === 'paid') {
    console.log('Overage invoice already paid, ignoring duplicate webhook:', invoice.id);
    return;
  }

  await env.DB.prepare(
    `UPDATE enterprise_usage_monthly
     SET status = 'paid', paid_at = datetime('now'),
         payment_ref = ?, payment_method = ?
     WHERE id = ?`
  ).bind(
    paymentEntity.id || null,
    paymentEntity.method || null,
    invoice.id
  ).run();

  console.log('Overage invoice paid via webhook:', invoice.id, 'payment:', paymentEntity.id);
}
