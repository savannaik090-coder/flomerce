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
    const profile = await env.DB.prepare(
      `SELECT u.id, u.email, u.name, u.phone, u.email_verified,
              s.plan, s.billing_cycle, s.status, s.current_period_start, s.current_period_end
       FROM users u
       LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
       WHERE u.id = ?
       ORDER BY s.created_at DESC
       LIMIT 1`
    ).bind(user.id).first();

    if (!profile) {
      return errorResponse('User not found', 404);
    }

    return successResponse({
      id: profile.id,
      email: profile.email,
      name: profile.name,
      phone: profile.phone,
      emailVerified: !!profile.email_verified,
      plan: profile.plan || null,
      billingCycle: profile.billing_cycle || null,
      status: profile.status || 'none',
      trialStartDate: profile.current_period_start,
      trialEndDate: profile.current_period_end,
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
    const subscription = await env.DB.prepare(
      `SELECT * FROM subscriptions 
       WHERE user_id = ? AND status = 'active' 
       ORDER BY created_at DESC 
       LIMIT 1`
    ).bind(user.id).first();

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

async function updateSubscription(request, env, user) {
  try {
    const { plan, billingCycle, status } = await request.json();

    const existingSubscription = await env.DB.prepare(
      `SELECT id FROM subscriptions WHERE user_id = ? AND status = 'active'`
    ).bind(user.id).first();

    if (existingSubscription) {
      if (status === 'expired' || status === 'cancelled') {
        await env.DB.prepare(
          `UPDATE subscriptions SET status = ?, cancelled_at = datetime('now') WHERE id = ?`
        ).bind(status, existingSubscription.id).run();

        return successResponse(null, 'Subscription updated');
      }

      await env.DB.prepare(
        `UPDATE subscriptions SET 
          plan = COALESCE(?, plan),
          billing_cycle = COALESCE(?, billing_cycle),
          status = COALESCE(?, status)
         WHERE id = ?`
      ).bind(plan || null, billingCycle || null, status || null, existingSubscription.id).run();

      return successResponse(null, 'Subscription updated');
    }

    let periodDays = 30;
    if (billingCycle === '6months') periodDays = 180;
    if (billingCycle === 'yearly') periodDays = 365;
    if (plan === 'trial') periodDays = 7;

    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + periodDays);

    const plans = {
      trial: { monthly: 0, '6months': 0, yearly: 0 },
      basic: { monthly: 99, '6months': 499, yearly: 899 },
      premium: { monthly: 299, '6months': 1499, yearly: 2499 },
      pro: { monthly: 999, '6months': 4999, yearly: 8999 },
    };

    const amount = plan === 'trial' ? 0 : (plans[plan]?.[billingCycle] || 0);

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
