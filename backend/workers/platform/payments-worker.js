import { generateId, jsonResponse, errorResponse, successResponse, handleCORS } from '../../utils/helpers.js';
import { validateAuth } from '../../utils/auth.js';
import { updateProductStock } from '../storefront/products-worker.js';
import { sendOrderEmails } from '../storefront/orders-worker.js';
import crypto from 'node:crypto';

export async function handlePayments(request, env, path) {
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
      const site = await env.DB.prepare('SELECT settings FROM sites WHERE id = ?').bind(siteId).first();
      if (site?.settings) {
        let settings = site.settings;
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

async function getPlatformRazorpayKeyId(env) {
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

    if (!amount) {
      return errorResponse('Amount is required');
    }

    const { keyId, keySecret } = await getRazorpayCredentials(env, siteId);

    if (!keyId || !keySecret) {
      return errorResponse('Razorpay credentials not configured. Please add Razorpay Key ID and Key Secret in your store settings.', 500);
    }

    const amountInPaise = Math.round(amount * 100);

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${keyId}:${keySecret}`),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: currency || 'INR',
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
      ).bind(generateId(), siteId || null, orderId || null, razorpayOrder.id, amount, currency || 'INR').run();
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
      order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(dbOrderId).first();
      if (order) {
        await env.DB.prepare(
          `UPDATE orders SET status = 'paid', payment_status = 'paid', payment_method = 'razorpay', razorpay_order_id = ?, razorpay_payment_id = ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(razorpay_order_id, razorpay_payment_id, dbOrderId).run();
        await processPostPaymentActions(env, order);
      } else {
        try {
          order = await env.DB.prepare('SELECT * FROM guest_orders WHERE id = ?').bind(dbOrderId).first();
          if (order) {
            await env.DB.prepare(
              `UPDATE guest_orders SET status = 'paid', payment_status = 'paid', payment_method = 'razorpay', razorpay_order_id = ?, razorpay_payment_id = ?, updated_at = datetime('now') WHERE id = ?`
            ).bind(razorpay_order_id, razorpay_payment_id, dbOrderId).run();
            await processPostPaymentActions(env, order);
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

    const pending = await env.DB.prepare(
      `SELECT ps.*, sp.plan_name, sp.billing_cycle, sp.display_price
       FROM pending_subscriptions ps
       JOIN subscription_plans sp ON ps.plan_id = sp.id
       WHERE ps.razorpay_subscription_id = ? AND ps.user_id = ?`
    ).bind(razorpay_subscription_id, user.id).first();

    if (!pending) {
      return errorResponse('No matching pending subscription found. Payment may have been tampered with.', 400);
    }

    const existingActive = await env.DB.prepare(
      `SELECT id FROM subscriptions WHERE razorpay_subscription_id = ? AND status = 'active'`
    ).bind(razorpay_subscription_id).first();

    if (existingActive) {
      return successResponse({ verified: true, planActivated: true, duplicate: true }, 'Subscription already activated');
    }

    const activated = await activateSubscription(env, user.id, pending.plan_name, pending.billing_cycle, razorpay_payment_id, razorpay_subscription_id, pending.display_price);

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

async function processPostPaymentActions(env, order) {
  try {
    const orderItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    for (const item of orderItems) {
      await updateProductStock(env, item.productId, item.quantity, 'decrement');
    }
  } catch (stockErr) {
    console.error('Failed to decrement stock after payment:', stockErr);
  }

  try {
    const orderItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    const shippingAddress = typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : order.shipping_address;
    await sendOrderEmails(env, order.site_id, {
      orderNumber: order.order_number,
      processedItems: orderItems,
      total: order.total,
      paymentMethod: 'razorpay',
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
      shippingAddress,
    });
  } catch (emailErr) {
    console.error('Failed to send order emails after payment:', emailErr);
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

async function getUserSubscription(env, user) {
  try {
    const subscription = await env.DB.prepare(
      `SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`
    ).bind(user.id).first();

    if (!subscription) {
      return successResponse({ plan: null, status: 'none' });
    }

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
  } catch (error) {
    console.error('Get subscription error:', error);
    return errorResponse('Failed to fetch subscription', 500);
  }
}

async function createRazorpaySubscription(request, env, user) {
  try {
    const { planId } = await request.json();

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

    const platformKeyId = await getPlatformRazorpayKeyId(env);
    const keyId = platformKeyId || env.RAZORPAY_KEY_ID;
    const keySecret = env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return errorResponse('Razorpay credentials not configured', 500);
    }

    const response = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${keyId}:${keySecret}`),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan_id: plan.razorpay_plan_id,
        total_count: plan.billing_cycle === 'monthly' ? 12 : plan.billing_cycle === '6months' ? 4 : 1,
        quantity: 1,
        notes: {
          userId: user.id,
          planId: plan.id,
          planName: plan.plan_name,
          billingCycle: plan.billing_cycle,
        },
      }),
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
          plan_id TEXT NOT NULL,
          razorpay_subscription_id TEXT NOT NULL UNIQUE,
          created_at TEXT DEFAULT (datetime('now'))
        )
      `).run();

      await env.DB.prepare(
        `INSERT INTO pending_subscriptions (id, user_id, plan_id, razorpay_subscription_id, created_at) VALUES (?, ?, ?, ?, datetime('now'))`
      ).bind(generateId(), user.id, plan.id, razorpaySub.id).run();
    } catch (dbErr) {
      console.error('Failed to store pending subscription (non-fatal):', dbErr);
    }

    return successResponse({
      subscriptionId: razorpaySub.id,
      razorpayPlanId: plan.razorpay_plan_id,
      keyId,
      planId: plan.id,
      planName: plan.plan_name,
      billingCycle: plan.billing_cycle,
      amount: plan.display_price,
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
      `SELECT id, plan_name, billing_cycle, display_price, features, is_popular, display_order 
       FROM subscription_plans WHERE is_active = 1 ORDER BY display_order ASC, plan_name ASC`
    ).all();

    const plans = (plansResult.results || []).map(p => ({
      ...p,
      features: (() => { try { return JSON.parse(p.features); } catch { return []; } })(),
    }));

    const platformKeyId = await getPlatformRazorpayKeyId(env);

    return successResponse({
      plans,
      razorpayKeyId: platformKeyId || env.RAZORPAY_KEY_ID || null,
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
    const entity = payload.payload?.subscription?.entity || payload.payload?.payment?.entity;

    console.log('Razorpay webhook event:', event);

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
      default:
        console.log('Unhandled webhook event:', event);
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
      await activateSubscription(env, pending.user_id, pending.plan_name, pending.billing_cycle, null, subId, pending.display_price);
      try {
        await env.DB.prepare(`DELETE FROM pending_subscriptions WHERE razorpay_subscription_id = ?`).bind(subId).run();
      } catch {}
    } else {
      const notes = entity.notes || {};
      if (notes.userId && notes.planName) {
        await activateSubscription(env, notes.userId, notes.planName, notes.billingCycle || 'monthly', null, subId, null);
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
      const periodMonths = existingSub.billing_cycle === 'monthly' ? 1 : existingSub.billing_cycle === '6months' ? 6 : 12;
      const newEnd = new Date();
      newEnd.setMonth(newEnd.getMonth() + periodMonths);

      await env.DB.prepare(
        `UPDATE subscriptions SET current_period_end = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(newEnd.toISOString(), existingSub.id).run();

      await env.DB.prepare(
        `UPDATE sites SET subscription_expires_at = ?, updated_at = datetime('now') WHERE user_id = ?`
      ).bind(newEnd.toISOString(), existingSub.user_id).run();

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
      `SELECT * FROM subscriptions WHERE razorpay_subscription_id = ? AND status = 'active'`
    ).bind(subId).first();

    if (sub) {
      await env.DB.prepare(
        `UPDATE subscriptions SET status = 'cancelled', cancelled_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
      ).bind(sub.id).run();

      await env.DB.prepare(
        `UPDATE sites SET subscription_expires_at = datetime('now'), updated_at = datetime('now') WHERE user_id = ?`
      ).bind(sub.user_id).run();
    }

    console.log('Subscription cancelled:', subId);
  } catch (err) {
    console.error('handleSubscriptionCancelled error:', err);
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
      await env.DB.prepare(
        `UPDATE subscriptions SET status = 'paused', updated_at = datetime('now') WHERE id = ?`
      ).bind(sub.id).run();

      await env.DB.prepare(
        `UPDATE sites SET subscription_expires_at = datetime('now'), updated_at = datetime('now') WHERE user_id = ?`
      ).bind(sub.user_id).run();
    }

    console.log('Subscription paused:', subId);
  } catch (err) {
    console.error('handleSubscriptionPaused error:', err);
  }
}

export async function activateSubscription(env, userId, planName, billingCycle, razorpayPaymentId, razorpaySubscriptionId, amount) {
  try {
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

    const periodMonths = billingCycle === 'monthly' ? 1 : billingCycle === '6months' ? 6 : 12;
    const periodStart = new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + periodMonths);

    await env.DB.prepare(
      `UPDATE subscriptions SET status = 'cancelled', cancelled_at = datetime('now') WHERE user_id = ? AND status = 'active'`
    ).bind(userId).run();

    const resolvedAmount = amount || 0;

    await env.DB.prepare(
      `INSERT INTO subscriptions (id, user_id, plan, billing_cycle, amount, status, razorpay_subscription_id, current_period_start, current_period_end, created_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, datetime('now'))`
    ).bind(
      generateId(),
      userId,
      planName,
      billingCycle,
      resolvedAmount,
      razorpaySubscriptionId || null,
      periodStart.toISOString(),
      periodEnd.toISOString()
    ).run();

    await env.DB.prepare(
      `UPDATE users SET updated_at = datetime('now') WHERE id = ?`
    ).bind(userId).run();

    await env.DB.prepare(
      `UPDATE sites SET subscription_plan = ?, subscription_expires_at = ?, updated_at = datetime('now') WHERE user_id = ?`
    ).bind(planName, periodEnd.toISOString(), userId).run();

    console.log(`Subscription activated: user=${userId}, plan=${planName}, cycle=${billingCycle}`);
    return true;
  } catch (error) {
    console.error('Activate subscription error:', error);
    if (error.message) console.error('Error message:', error.message);
    return false;
  }
}
