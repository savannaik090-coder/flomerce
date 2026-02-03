import { generateId, jsonResponse, errorResponse, successResponse, handleCORS } from '../utils/helpers.js';
import { validateAuth } from '../utils/auth.js';
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

async function createRazorpayOrder(request, env) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const { amount, currency, receipt, notes, orderId, type } = await request.json();

    if (!amount) {
      return errorResponse('Amount is required');
    }

    const amountInPaise = Math.round(amount * 100);

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`),
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
      const error = await response.json();
      console.error('Razorpay error:', error);
      return errorResponse('Failed to create payment order', 500);
    }

    const razorpayOrder = await response.json();

    await env.DB.prepare(
      `INSERT INTO payment_transactions (id, order_id, razorpay_order_id, amount, currency, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))`
    ).bind(generateId(), orderId || null, razorpayOrder.id, amount, currency || 'INR').run();

    return successResponse({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('Create order error:', error);
    return errorResponse('Failed to create payment order', 500);
  }
}

async function verifyPayment(request, env) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  if (!env.RAZORPAY_KEY_SECRET || !env.RAZORPAY_KEY_ID) {
    return errorResponse('Razorpay credentials missing', 500);
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId, billingCycle } = await request.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return errorResponse('Missing payment verification data');
    }

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    
    const computedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    console.log('VerifyPayment: hasKeyId?', !!env.RAZORPAY_KEY_ID, 'hasSecret?', !!env.RAZORPAY_KEY_SECRET);

    if (computedSignature !== razorpay_signature) {
      return errorResponse('Invalid payment signature', 400, 'INVALID_SIGNATURE');
    }

    // Update payment record
    await env.DB.prepare(
      `UPDATE payment_transactions 
       SET razorpay_payment_id = ?, razorpay_signature = ?, status = 'completed', payment_method = 'razorpay'
       WHERE razorpay_order_id = ?`
    ).bind(razorpay_payment_id, razorpay_signature, razorpay_order_id).run();

    // If subscription plan details are provided, activate it immediately
    if (planId && billingCycle) {
      const user = await validateAuth(request, env);
      if (user) {
        const activated = await activateSubscription(env, user.id, planId, billingCycle, razorpay_payment_id);
        if (!activated) {
          console.error('Failed to activate subscription in verifyPayment');
        }
      }
    }

    return successResponse({ verified: true, planActivated: true }, 'Payment verified and plan activated successfully');
  } catch (error) {
    console.error('Verify payment error:', error);
    return errorResponse('Payment verification failed', 500);
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

    await env.DB.prepare(
      `UPDATE subscriptions SET status = 'cancelled', cancelled_at = datetime('now') WHERE user_id = ? AND status = 'active'`
    ).bind(userId).run();

    const periodMonths = billingCycle === 'monthly' ? 1 : billingCycle === '6months' ? 6 : 12;
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + periodMonths);

    const plans = {
      basic: { monthly: 99, '6months': 499, yearly: 899 },
      premium: { monthly: 299, '6months': 1499, yearly: 2499 },
      pro: { monthly: 999, '6months': 4999, yearly: 8999 },
    };

    await env.DB.prepare(
      `INSERT INTO subscriptions (id, user_id, plan, billing_cycle, amount, status, current_period_start, current_period_end, created_at)
       VALUES (?, ?, ?, ?, ?, 'active', datetime('now'), ?, datetime('now'))`
    ).bind(
      generateId(),
      userId,
      planId,
      billingCycle,
      plans[planId][billingCycle],
      periodEnd.toISOString()
    ).run();

    // Ensure the sites table update uses the correct column name if needed
    // Assuming subscription_plan and subscription_expires_at are correct based on current code
    await env.DB.prepare(
      `UPDATE sites SET subscription_plan = ?, subscription_expires_at = ?, updated_at = datetime('now') WHERE user_id = ?`
    ).bind(planId, periodEnd.toISOString(), userId).run();

    return true;
  } catch (error) {
    console.error('Activate subscription error:', error);
    // Log the error message to help debugging in production logs
    if (error.message) console.error('Error message:', error.message);
    return false;
  }
}
