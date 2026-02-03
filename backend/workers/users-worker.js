import { generateId, jsonResponse, errorResponse, successResponse, handleCORS } from '../utils/helpers.js';
import { validateAuth } from '../utils/auth.js';

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

async function getProfile(env, user) {
  try {
    let profile = null;
    let subscription = null;

    // First get user data (always works if user exists)
    profile = await env.DB.prepare(
      `SELECT id, email, name, phone, email_verified FROM users WHERE id = ?`
    ).bind(user.id).first();

    if (!profile) {
      return errorResponse('User not found', 404);
    }

    // Try to get subscription data (may fail if table doesn't exist)
    try {
      subscription = await env.DB.prepare(
        `SELECT plan, billing_cycle, status, current_period_start, current_period_end 
         FROM subscriptions 
         WHERE user_id = ? AND status = 'active' 
         ORDER BY created_at DESC 
         LIMIT 1`
      ).bind(user.id).first();
    } catch (subError) {
      console.error('Subscription query error (table may not exist):', subError);
      // Continue without subscription data
    }

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
      subscription = await env.DB.prepare(
        `SELECT * FROM subscriptions 
         WHERE user_id = ? AND status = 'active' 
         ORDER BY created_at DESC 
         LIMIT 1`
      ).bind(user.id).first();
    } catch (subError) {
      console.error('Subscription query error (table may not exist):', subError);
      // Return default if table doesn't exist
      return successResponse({
        plan: null,
        status: 'none',
        billingCycle: null,
      });
    }

    if (!subscription) {
      return successResponse({
        plan: null,
        status: 'none',
        billingCycle: null,
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
    const { plan, billingCycle, status } = await request.json();

    // Ensure subscriptions table exists
    await ensureSubscriptionsTable(env);

    const subscriptionPlans = {
      trial: { monthly: 0, '6months': 0, yearly: 0, rank: 0 },
      basic: { monthly: 99, '6months': 499, yearly: 899, rank: 1 },
      premium: { monthly: 299, '6months': 1499, yearly: 2499, rank: 2 },
      pro: { monthly: 999, '6months': 4999, yearly: 8999, rank: 3 },
    };

    let existingSubscription = null;
    try {
      existingSubscription = await env.DB.prepare(
        `SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active'`
      ).bind(user.id).first();
    } catch (e) {
      console.error('Error checking existing subscription:', e);
    }

    if (existingSubscription) {
      if (status === 'expired' || status === 'cancelled') {
        await env.DB.prepare(
          `UPDATE subscriptions SET status = ?, cancelled_at = datetime('now') WHERE id = ?`
        ).bind(status, existingSubscription.id).run();

        return successResponse(null, 'Subscription updated');
      }

      // Enforce downgrade rule: Block downgrade if active and not expired
      if (plan && subscriptionPlans[plan] && subscriptionPlans[existingSubscription.plan]) {
        const isDowngrade = subscriptionPlans[plan].rank < subscriptionPlans[existingSubscription.plan].rank;
        const isExpired = existingSubscription.current_period_end && new Date(existingSubscription.current_period_end) < new Date();
        
        if (isDowngrade && !isExpired) {
          return errorResponse('You can only downgrade after your current plan expires', 400);
        }
      }

      // Calculate new period if plan/cycle changes
      let periodEnd = existingSubscription.current_period_end;
      const newPlan = plan || existingSubscription.plan;
      const newCycle = billingCycle || existingSubscription.billing_cycle;
      
      if (plan || billingCycle) {
        let periodDays = 30;
        if (newCycle === '6months') periodDays = 180;
        if (newCycle === 'yearly') periodDays = 365;
        if (newPlan === 'trial') periodDays = 7;
        
        const date = new Date();
        date.setDate(date.getDate() + periodDays);
        periodEnd = date.toISOString();
      }

      const amount = newPlan === 'trial' ? 0 : (subscriptionPlans[newPlan]?.[newCycle] || 0);

      await env.DB.prepare(
        `UPDATE subscriptions SET 
          plan = COALESCE(?, plan),
          billing_cycle = COALESCE(?, billing_cycle),
          status = COALESCE(?, status),
          amount = ?,
          current_period_start = datetime('now'),
          current_period_end = ?,
          updated_at = datetime('now')
         WHERE id = ?`
      ).bind(plan || null, billingCycle || null, status || null, amount, periodEnd, existingSubscription.id).run();

      return successResponse(null, 'Subscription updated');
    }

    let periodDays = 30;
    if (billingCycle === '6months') periodDays = 180;
    if (billingCycle === 'yearly') periodDays = 365;
    if (plan === 'trial') periodDays = 7;

    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + periodDays);

    const amount = plan === 'trial' ? 0 : (subscriptionPlans[plan]?.[billingCycle] || 0);

    await env.DB.prepare(
      `INSERT INTO subscriptions (id, user_id, plan, billing_cycle, amount, status, current_period_start, current_period_end, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?, datetime('now'))`
    ).bind(
      generateId(),
      user.id,
      plan,
      billingCycle || 'monthly',
      amount,
      status || 'active',
      periodEnd.toISOString()
    ).run();

    return successResponse(null, 'Subscription created');
  } catch (error) {
    console.error('Update subscription error:', error);
    return errorResponse('Failed to update subscription', 500);
  }
}
