import { generateId, jsonResponse, errorResponse, successResponse, handleCORS } from '../../utils/helpers.js';
import { validateAuth } from '../../utils/auth.js';

export async function handleUsers(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;

  const user = await validateAuth(request, env);
  if (!user) {
    return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const pathParts = path.split('/').filter(Boolean);
  const action = pathParts[2];

  switch (action) {
    case 'profile':
      return handleProfile(request, env, user);
    case 'subscription':
      return handleSubscription(request, env, user);
    default:
      return errorResponse('Not found', 404);
  }
}

async function handleProfile(request, env, user) {
  if (request.method === 'GET') {
    return getProfile(env, user);
  }

  if (request.method === 'PUT' || request.method === 'PATCH') {
    return updateProfile(request, env, user);
  }

  return errorResponse('Method not allowed', 405);
}

async function checkAndExpireSubscription(env, userId) {
  try {
    const activeSubscription = await env.DB.prepare(
      `SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`
    ).bind(userId).first();

    if (activeSubscription) {
      if (activeSubscription.current_period_end && new Date(activeSubscription.current_period_end) < new Date()) {
        await env.DB.prepare(
          `UPDATE subscriptions SET status = 'expired', updated_at = datetime('now') WHERE id = ?`
        ).bind(activeSubscription.id).run();

        return { ...activeSubscription, status: 'expired' };
      }
      return activeSubscription;
    }

    const latestSubscription = await env.DB.prepare(
      `SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`
    ).bind(userId).first();

    return latestSubscription || null;
  } catch (e) {
    console.error('Check/expire subscription error:', e);
    return null;
  }
}

async function hasEverHadSubscription(env, userId) {
  try {
    const result = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM subscriptions WHERE user_id = ?`
    ).bind(userId).first();
    return (result?.count || 0) > 0;
  } catch (e) {
    return false;
  }
}

async function getProfile(env, user) {
  try {
    let profile = null;

    profile = await env.DB.prepare(
      `SELECT id, email, name, phone, email_verified FROM users WHERE id = ?`
    ).bind(user.id).first();

    if (!profile) {
      return errorResponse('User not found', 404);
    }

    let subscription = null;
    try {
      subscription = await checkAndExpireSubscription(env, user.id);
    } catch (subError) {
      console.error('Subscription query error (table may not exist):', subError);
    }

    const hadSubscription = await hasEverHadSubscription(env, user.id);

    return successResponse({
      id: profile.id,
      email: profile.email,
      name: profile.name,
      phone: profile.phone,
      emailVerified: !!profile.email_verified,
      plan: subscription?.plan || null,
      billingCycle: subscription?.billing_cycle || null,
      status: subscription?.status || 'none',
      trialStartDate: subscription?.current_period_start || null,
      trialEndDate: subscription?.current_period_end || null,
      hadSubscription: hadSubscription,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return errorResponse('Failed to fetch profile', 500);
  }
}

async function updateProfile(request, env, user) {
  try {
    const updates = await request.json();
    const { name, phone } = updates;

    await env.DB.prepare(
      `UPDATE users SET 
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        updated_at = datetime('now')
       WHERE id = ?`
    ).bind(name || null, phone || null, user.id).run();

    return successResponse(null, 'Profile updated successfully');
  } catch (error) {
    console.error('Update profile error:', error);
    return errorResponse('Failed to update profile', 500);
  }
}

async function handleSubscription(request, env, user) {
  if (request.method === 'GET') {
    return getSubscription(env, user);
  }

  if (request.method === 'PATCH' || request.method === 'PUT') {
    return updateSubscription(request, env, user);
  }

  return errorResponse('Method not allowed', 405);
}

async function getSubscription(env, user) {
  try {
    let subscription = null;
    
    try {
      subscription = await checkAndExpireSubscription(env, user.id);
    } catch (subError) {
      console.error('Subscription query error (table may not exist):', subError);
      return successResponse({
        plan: null,
        status: 'none',
        billingCycle: null,
      });
    }

    if (!subscription) {
      const hadSubscription = await hasEverHadSubscription(env, user.id);
      return successResponse({
        plan: null,
        status: hadSubscription ? 'expired' : 'none',
        billingCycle: null,
        hadSubscription: hadSubscription,
      });
    }

    return successResponse({
      id: subscription.id,
      plan: subscription.plan,
      billingCycle: subscription.billing_cycle,
      status: subscription.status,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    return errorResponse('Failed to fetch subscription', 500);
  }
}

async function ensureSubscriptionsTable(env) {
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
    return true;
  } catch (error) {
    console.error('Failed to ensure subscriptions table:', error);
    return false;
  }
}

async function updateSubscription(request, env, user) {
  try {
    const { plan } = await request.json();

    if (plan !== 'trial') {
      return errorResponse('Only trial activation is allowed through this endpoint. Use Razorpay for paid plans.', 403);
    }

    await ensureSubscriptionsTable(env);

    const hadPrevious = await hasEverHadSubscription(env, user.id);
    if (hadPrevious) {
      return errorResponse('Free trial is only available for new users. Please subscribe to a paid plan.', 400);
    }

    let existingActive = null;
    try {
      existingActive = await env.DB.prepare(
        `SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active'`
      ).bind(user.id).first();
    } catch (e) {
      console.error('Error checking existing subscription:', e);
    }

    if (existingActive) {
      return errorResponse('You already have an active subscription.', 400);
    }

    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 7);

    await env.DB.prepare(
      `INSERT INTO subscriptions (id, user_id, plan, billing_cycle, amount, status, current_period_start, current_period_end, created_at)
       VALUES (?, ?, 'trial', 'monthly', 0, 'active', datetime('now'), ?, datetime('now'))`
    ).bind(
      generateId(),
      user.id,
      periodEnd.toISOString()
    ).run();

    await env.DB.prepare(
      `UPDATE sites SET subscription_plan = 'trial', subscription_expires_at = ?, updated_at = datetime('now') WHERE user_id = ?`
    ).bind(periodEnd.toISOString(), user.id).run();

    return successResponse(null, 'Your 7-day free trial has started!');
  } catch (error) {
    console.error('Update subscription error:', error);
    return errorResponse('Failed to start trial', 500);
  }
}
