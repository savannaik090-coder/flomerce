import { errorResponse, successResponse, handleCORS } from '../../utils/helpers.js';
import { validateAuth } from '../../utils/auth.js';

const OWNER_EMAIL = 'admin@fluxe.in';

async function isOwner(user, env) {
  if (!user) return false;
  if (user.email === OWNER_EMAIL) return true;
  if (user.role === 'admin' || user.role === 'owner') return true;
  return false;
}

export async function handleAdmin(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;

  const user = await validateAuth(request, env);
  if (!user) {
    return errorResponse('Unauthorized', 401);
  }

  const owner = await isOwner(user, env);
  if (!owner) {
    return errorResponse('Forbidden: Admin access required', 403);
  }

  const pathParts = path.split('/').filter(Boolean);
  const action = pathParts[2];

  switch (action) {
    case 'stats':
      return getAdminStats(env);
    case 'users':
      return handleUserAction(request, env, pathParts);
    default:
      return errorResponse('Admin endpoint not found', 404);
  }
}

async function getAdminStats(env) {
  try {
    let users = [];
    try {
      const usersResult = await env.DB.prepare(
        `SELECT u.id, u.name, u.email, u.created_at, u.email_verified,
                s.plan, s.status as subscription_status
         FROM users u
         LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
         ORDER BY u.created_at DESC
         LIMIT 100`
      ).all();
      users = usersResult.results || [];
    } catch (e) {
      const usersResult = await env.DB.prepare(
        'SELECT id, name, email, created_at, email_verified FROM users ORDER BY created_at DESC LIMIT 100'
      ).all();
      users = (usersResult.results || []).map(u => ({ ...u, plan: null }));
    }

    const sitesResult = await env.DB.prepare(
      'SELECT id, subdomain, brand_name, user_id, template_id, is_active, created_at FROM sites ORDER BY created_at DESC LIMIT 100'
    ).all();
    const sites = sitesResult.results || [];

    let totalOrders = 0;
    try {
      const ordersCount = await env.DB.prepare('SELECT COUNT(*) as count FROM orders').first();
      totalOrders = ordersCount?.count || 0;
    } catch (e) {}

    return successResponse({
      users,
      sites,
      totalUsers: users.length,
      totalSites: sites.length,
      totalOrders,
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    return errorResponse('Failed to fetch admin stats', 500);
  }
}

async function handleUserAction(request, env, pathParts) {
  const userId = pathParts[3];
  const action = pathParts[4];

  if (!userId) {
    return errorResponse('User ID is required');
  }

  if (action === 'block' && request.method === 'POST') {
    return blockUser(env, userId);
  }

  return errorResponse('Unknown user action', 404);
}

async function blockUser(env, userId) {
  try {
    const user = await env.DB.prepare('SELECT id, email FROM users WHERE id = ?').bind(userId).first();
    if (!user) {
      return errorResponse('User not found', 404);
    }

    await env.DB.prepare(
      'UPDATE sites SET is_active = 0 WHERE user_id = ?'
    ).bind(userId).run();

    await env.DB.prepare(
      'DELETE FROM sessions WHERE user_id = ?'
    ).bind(userId).run();

    return successResponse(null, `User ${user.email} has been blocked`);
  } catch (error) {
    console.error('Block user error:', error);
    return errorResponse('Failed to block user', 500);
  }
}
