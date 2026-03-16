import { errorResponse, successResponse, handleCORS, validateEmail } from '../../utils/helpers.js';
import { validateAuth } from '../../utils/auth.js';

async function isOwner(user, env) {
  if (!user) return false;
  const dbUser = await env.DB.prepare('SELECT role FROM users WHERE id = ?').bind(user.id).first();
  if (dbUser && (dbUser.role === 'admin' || dbUser.role === 'owner')) return true;
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
    case 'transfer-ownership':
      return handleTransferOwnership(request, env, user);
    default:
      return errorResponse('Admin endpoint not found', 404);
  }
}

async function getAdminStats(env) {
  try {
    let users = [];
    try {
      const usersResult = await env.DB.prepare(
        `SELECT u.id, u.name, u.email, u.role, u.created_at, u.email_verified,
                s.plan, s.status as subscription_status
         FROM users u
         LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
         ORDER BY u.created_at DESC
         LIMIT 100`
      ).all();
      users = usersResult.results || [];
    } catch (e) {
      const usersResult = await env.DB.prepare(
        'SELECT id, name, email, role, created_at, email_verified FROM users ORDER BY created_at DESC LIMIT 100'
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

    const currentOwner = users.find(u => u.role === 'owner') || null;

    return successResponse({
      users,
      sites,
      totalUsers: users.length,
      totalSites: sites.length,
      totalOrders,
      currentOwner: currentOwner ? { id: currentOwner.id, email: currentOwner.email, name: currentOwner.name } : null,
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

async function handleTransferOwnership(request, env, currentUser) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const dbUser = await env.DB.prepare('SELECT role FROM users WHERE id = ?').bind(currentUser.id).first();
    if (!dbUser || dbUser.role !== 'owner') {
      return errorResponse('Only the current owner can transfer ownership', 403);
    }

    const { newOwnerEmail } = await request.json();

    if (!newOwnerEmail) {
      return errorResponse('New owner email is required');
    }

    if (!validateEmail(newOwnerEmail)) {
      return errorResponse('Invalid email format');
    }

    const newOwner = await env.DB.prepare(
      'SELECT id, email, name FROM users WHERE email = ?'
    ).bind(newOwnerEmail.toLowerCase()).first();

    if (!newOwner) {
      return errorResponse('No user found with that email. They must register first.', 404);
    }

    if (newOwner.id === currentUser.id) {
      return errorResponse('You are already the owner');
    }

    await env.DB.batch([
      env.DB.prepare("UPDATE users SET role = 'user' WHERE id = ?").bind(currentUser.id),
      env.DB.prepare("UPDATE users SET role = 'owner' WHERE id = ?").bind(newOwner.id),
    ]);

    return successResponse(
      { newOwner: { id: newOwner.id, email: newOwner.email, name: newOwner.name } },
      `Ownership transferred to ${newOwner.email}`
    );
  } catch (error) {
    console.error('Transfer ownership error:', error);
    return errorResponse('Failed to transfer ownership', 500);
  }
}
