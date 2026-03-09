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
  return { keyId: env.RAZORPAY_KEY_ID, keySecret: env.RAZORPAY_KEY_SECRET, perSite: false };
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
    // Ensure tables exist as a safeguard
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
            FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
            FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
        )
    `).run();

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

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId, billingCycle, siteId } = await request.json();

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

    console.log('VerifyPayment: signature match?', computedSignature === razorpay_signature);
    console.log('VerifyPayment: receivedSignature:', razorpay_signature);
    console.log('VerifyPayment: computedSignature:', computedSignature);

    if (computedSignature !== razorpay_signature) {
      return errorResponse('Invalid payment signature', 400, 'INVALID_SIGNATURE');
    }

    const existingTx = await env.DB.prepare(
      `SELECT order_id, status FROM payment_transactions WHERE razorpay_order_id = ?`
    ).bind(razorpay_order_id).first();

    if (existingTx?.status === 'completed') {
      console.log('Payment already verified, skipping duplicate:', razorpay_order_id);
      return successResponse({ verified: true, duplicate: true }, 'Payment already verified');
    }

    await env.DB.prepare(
      `UPDATE payment_transactions 
       SET razorpay_payment_id = ?, razorpay_signature = ?, status = 'completed', payment_method = 'razorpay'
       WHERE razorpay_order_id = ? AND status = 'pending'`
    ).bind(razorpay_payment_id, razorpay_signature, razorpay_order_id).run();

    const paymentTx = existingTx;

    if (paymentTx?.order_id) {
      let order = null;

      order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(paymentTx.order_id).first();
      if (order) {
        const wasPendingPayment = order.status === 'pending_payment';
        await env.DB.prepare(
          `UPDATE orders SET status = 'paid', payment_status = 'paid', payment_method = 'razorpay', razorpay_order_id = ?, razorpay_payment_id = ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(razorpay_order_id, razorpay_payment_id, paymentTx.order_id).run();
        console.log('Order status updated to paid:', paymentTx.order_id);

        if (wasPendingPayment) {
          await processPostPaymentActions(env, order);
        }
      } else {
        try {
          order = await env.DB.prepare('SELECT * FROM guest_orders WHERE id = ?').bind(paymentTx.order_id).first();
          if (order) {
            const wasPendingPayment = order.status === 'pending_payment';
            await env.DB.prepare(
              `UPDATE guest_orders SET status = 'paid', payment_status = 'paid', payment_method = 'razorpay', razorpay_order_id = ?, razorpay_payment_id = ?, updated_at = datetime('now') WHERE id = ?`
            ).bind(razorpay_order_id, razorpay_payment_id, paymentTx.order_id).run();
            console.log('Guest order status updated to paid:', paymentTx.order_id);

            if (wasPendingPayment) {
              await processPostPaymentActions(env, order);
            }
          }
        } catch (guestUpdateErr) {
          console.error('Failed to update guest order status:', guestUpdateErr);
        }
      }
    }

    if (planId && billingCycle) {
      const user = await validateAuth(request, env);
      if (user) {
        console.log(`Activating subscription: user=${user.id}, plan=${planId}, cycle=${billingCycle}`);
        const activated = await activateSubscription(env, user.id, planId, billingCycle, razorpay_payment_id);
        if (!activated) {
          console.error('Failed to activate subscription in verifyPayment');
        } else {
          console.log('Subscription activated successfully');
        }
      } else {
        console.error('User not authenticated during payment verification');
      }
    }

    return successResponse({ verified: true, planActivated: true }, 'Payment verified and plan activated successfully');
  } catch (error) {
    console.error('Verify payment error:', error);
    return errorResponse('Payment verification failed', 500);
  }
}

async function processPostPaymentActions(env, order) {
  try {
    const orderItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    for (const item of orderItems) {
      await updateProductStock(env, item.productId, item.quantity, 'decrement');
    }
    console.log('Stock decremented after payment for order:', order.id);
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
    console.log('Order confirmation emails sent after payment for order:', order.id);
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
    return createSubscriptionOrder(request, env, user);
  }

  return errorResponse('Method not allowed', 405);
}

async function getUserSubscription(env, user) {
  try {
    const subscription = await env.DB.prepare(
      `SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`
    ).bind(user.id).first();

    if (!subscription) {
      return successResponse({ plan: 'free', status: 'none' });
    }

    return successResponse({
      id: subscription.id,
      plan: subscription.plan,
      billingCycle: subscription.billing_cycle,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    return errorResponse('Failed to fetch subscription', 500);
  }
}

async function createSubscriptionOrder(request, env, user) {
  try {
    const { planId, billingCycle } = await request.json();

    const plans = {
      basic: { monthly: 99, '6months': 499, yearly: 899 },
      premium: { monthly: 299, '6months': 1499, yearly: 2499 },
      pro: { monthly: 999, '6months': 4999, yearly: 8999 },
    };

    if (!plans[planId] || !plans[planId][billingCycle]) {
      return errorResponse('Invalid plan or billing cycle');
    }

    const amount = plans[planId][billingCycle];

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount * 100,
        currency: 'INR',
        receipt: `sub_${user.id.slice(0, 8)}_${Date.now().toString(36)}`,
        notes: {
          userId: user.id,
          planId,
          billingCycle,
          type: 'subscription',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = errorText;
      }
      console.error('Razorpay Error Response:', errorData);
      
      const errorMessage = (errorData && errorData.error && errorData.error.description) 
        ? `Razorpay error: ${errorData.error.description}`
        : 'Failed to create subscription order';
        
      return errorResponse(errorMessage, 500);
    }

    const razorpayOrder = await response.json();

    return successResponse({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: env.RAZORPAY_KEY_ID,
      planId,
      billingCycle,
    });
  } catch (error) {
    console.error('Create subscription order error:', error);
    return errorResponse('Failed to create subscription order', 500);
  }
}

export async function activateSubscription(env, userId, planId, billingCycle, razorpayPaymentId) {
  try {
    // Ensure subscriptions table exists before insert
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

    const userSub = await env.DB.prepare(
      `SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY current_period_end DESC LIMIT 1`
    ).bind(userId).first();

    const periodMonths = billingCycle === 'monthly' ? 1 : billingCycle === '6months' ? 6 : 12;
    let periodStart = new Date();
    
    // If user has an active subscription, extend from the current end date
    if (userSub && userSub.current_period_end) {
      const currentEnd = new Date(userSub.current_period_end);
      if (currentEnd > periodStart) {
        periodStart = currentEnd;
      }
    }

    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + periodMonths);

    // Cancel other active subscriptions if any (clean up)
    await env.DB.prepare(
      `UPDATE subscriptions SET status = 'cancelled', cancelled_at = datetime('now') WHERE user_id = ? AND status = 'active' AND id != ?`
    ).bind(userId, userSub?.id || '').run();

    const plans = {
      basic: { monthly: 99, '6months': 499, yearly: 899 },
      premium: { monthly: 299, '6months': 1499, yearly: 2499 },
      pro: { monthly: 999, '6months': 4999, yearly: 8999 },
    };

    await env.DB.prepare(
      `INSERT INTO subscriptions (id, user_id, plan, billing_cycle, amount, status, current_period_start, current_period_end, created_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?, datetime('now'))`
    ).bind(
      generateId(),
      userId,
      planId,
      billingCycle,
      plans[planId][billingCycle],
      periodStart.toISOString(),
      periodEnd.toISOString()
    ).run();

    console.log(`Inserted subscription record for user ${userId}`);

    // Update user table as well
    await env.DB.prepare(
      `UPDATE users SET updated_at = datetime('now') WHERE id = ?`
    ).bind(userId).run();

    // Ensure the sites table update uses the correct column name if needed
    await env.DB.prepare(
      `UPDATE sites SET subscription_plan = ?, subscription_expires_at = ?, updated_at = datetime('now') WHERE user_id = ?`
    ).bind(planId, periodEnd.toISOString(), userId).run();
    
    console.log(`Updated sites table for user ${userId}`);

    return true;
  } catch (error) {
    console.error('Activate subscription error:', error);
    // Log the error message to help debugging in production logs
    if (error.message) console.error('Error message:', error.message);
    return false;
  }
}
