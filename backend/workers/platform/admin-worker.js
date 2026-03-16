import { generateId, errorResponse, successResponse, handleCORS, validateEmail } from '../../utils/helpers.js';
import { validateAuth } from '../../utils/auth.js';
import { listAllSiteDatabases, getDatabaseSize, deleteDatabase, createDatabase, runSchemaOnDB, addBindingAndRedeploy } from '../../utils/d1-manager.js';
import { getSiteSchemaStatements } from '../../utils/site-schema.js';

const OWNER_EMAIL = 'savannaik090@gmail.com';

async function isOwner(user, env) {
  if (!user) return false;
  return user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
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
    case 'plans':
      return handlePlansManagement(request, env, pathParts);
    case 'settings':
      return handleSettingsManagement(request, env);
    case 'databases':
      return handleDatabaseManagement(request, env, pathParts);
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

    const ownerUser = users.find(u => u.email === OWNER_EMAIL) || null;

    return successResponse({
      users,
      sites,
      totalUsers: users.length,
      totalSites: sites.length,
      totalOrders,
      currentOwner: ownerUser ? { id: ownerUser.id, email: ownerUser.email, name: ownerUser.name } : { email: OWNER_EMAIL },
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
    if (currentUser.email !== OWNER_EMAIL) {
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

    return successResponse(
      { newOwner: { id: newOwner.id, email: newOwner.email, name: newOwner.name } },
      `To transfer ownership, update the OWNER_EMAIL constant in admin-worker.js to ${newOwner.email}`
    );
  } catch (error) {
    console.error('Transfer ownership error:', error);
    return errorResponse('Failed to transfer ownership', 500);
  }
}

async function ensurePlansTables(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS subscription_plans (
      id TEXT PRIMARY KEY,
      plan_name TEXT NOT NULL,
      billing_cycle TEXT NOT NULL,
      display_price REAL NOT NULL,
      razorpay_plan_id TEXT NOT NULL,
      features TEXT DEFAULT '[]',
      is_popular INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      display_order INTEGER DEFAULT 0,
      plan_tier INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `).run();

  try {
    await env.DB.prepare(`ALTER TABLE subscription_plans ADD COLUMN plan_tier INTEGER DEFAULT 1`).run();
  } catch (e) {}

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS platform_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `).run();
}

async function handlePlansManagement(request, env, pathParts) {
  await ensurePlansTables(env);
  const planId = pathParts[3];

  if (request.method === 'GET') {
    return getPlans(env);
  }

  if (request.method === 'POST') {
    return createPlan(request, env);
  }

  if (request.method === 'PUT' && planId) {
    return updatePlan(request, env, planId);
  }

  if (request.method === 'DELETE' && planId) {
    return deletePlan(env, planId);
  }

  return errorResponse('Method not allowed', 405);
}

async function getPlans(env) {
  try {
    const result = await env.DB.prepare(
      `SELECT * FROM subscription_plans ORDER BY display_order ASC, plan_name ASC`
    ).all();
    const plans = (result.results || []).map(p => ({
      ...p,
      features: (() => { try { return JSON.parse(p.features); } catch { return []; } })(),
    }));
    return successResponse(plans);
  } catch (error) {
    console.error('Get plans error:', error);
    return errorResponse('Failed to fetch plans', 500);
  }
}

async function createPlan(request, env) {
  try {
    const { plan_name, billing_cycle, display_price, razorpay_plan_id, features, is_popular, display_order, plan_tier } = await request.json();

    if (!plan_name || !billing_cycle || display_price === undefined || !razorpay_plan_id) {
      return errorResponse('Plan name, billing cycle, display price, and Razorpay Plan ID are required');
    }

    if (!plan_tier || plan_tier < 1 || plan_tier > 10) {
      return errorResponse('Plan tier is required (1-10)');
    }

    const validCycles = ['3months', '6months', 'yearly', '3years'];
    if (!validCycles.includes(billing_cycle)) {
      return errorResponse('Billing cycle must be 3months, 6months, yearly, or 3years');
    }

    const id = generateId();
    await env.DB.prepare(
      `INSERT INTO subscription_plans (id, plan_name, billing_cycle, display_price, razorpay_plan_id, features, is_popular, display_order, plan_tier, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      id,
      plan_name,
      billing_cycle,
      display_price,
      razorpay_plan_id,
      JSON.stringify(features || []),
      is_popular ? 1 : 0,
      display_order || 0,
      plan_tier
    ).run();

    return successResponse({ id }, 'Plan created successfully');
  } catch (error) {
    console.error('Create plan error:', error);
    return errorResponse('Failed to create plan', 500);
  }
}

async function updatePlan(request, env, planId) {
  try {
    const existing = await env.DB.prepare('SELECT * FROM subscription_plans WHERE id = ?').bind(planId).first();
    if (!existing) {
      return errorResponse('Plan not found', 404);
    }

    const updates = await request.json();
    const { plan_name, billing_cycle, display_price, razorpay_plan_id, features, is_popular, is_active, display_order, plan_tier } = updates;

    await env.DB.prepare(
      `UPDATE subscription_plans SET
        plan_name = ?,
        billing_cycle = ?,
        display_price = ?,
        razorpay_plan_id = ?,
        features = ?,
        is_popular = ?,
        is_active = ?,
        display_order = ?,
        plan_tier = ?,
        updated_at = datetime('now')
      WHERE id = ?`
    ).bind(
      plan_name ?? existing.plan_name,
      billing_cycle ?? existing.billing_cycle,
      display_price ?? existing.display_price,
      razorpay_plan_id ?? existing.razorpay_plan_id,
      features ? JSON.stringify(features) : existing.features,
      is_popular !== undefined ? (is_popular ? 1 : 0) : existing.is_popular,
      is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
      display_order ?? existing.display_order,
      (plan_tier != null && plan_tier >= 1 && plan_tier <= 10) ? plan_tier : (existing.plan_tier ?? 1),
      planId
    ).run();

    return successResponse(null, 'Plan updated successfully');
  } catch (error) {
    console.error('Update plan error:', error);
    return errorResponse('Failed to update plan', 500);
  }
}

async function deletePlan(env, planId) {
  try {
    const existing = await env.DB.prepare('SELECT * FROM subscription_plans WHERE id = ?').bind(planId).first();
    if (!existing) {
      return errorResponse('Plan not found', 404);
    }

    await env.DB.prepare('DELETE FROM subscription_plans WHERE id = ?').bind(planId).run();
    return successResponse(null, 'Plan deleted successfully');
  } catch (error) {
    console.error('Delete plan error:', error);
    return errorResponse('Failed to delete plan', 500);
  }
}

async function handleSettingsManagement(request, env) {
  await ensurePlansTables(env);

  if (request.method === 'GET') {
    return getSettings(env);
  }

  if (request.method === 'PUT') {
    return updateSettings(request, env);
  }

  return errorResponse('Method not allowed', 405);
}

async function getSettings(env) {
  try {
    const result = await env.DB.prepare(
      `SELECT setting_key, setting_value FROM platform_settings`
    ).all();

    const settings = {};
    for (const row of (result.results || [])) {
      settings[row.setting_key] = row.setting_value;
    }

    return successResponse(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    return errorResponse('Failed to fetch settings', 500);
  }
}

async function updateSettings(request, env) {
  try {
    const updates = await request.json();

    const allowedKeys = ['razorpay_key_id'];

    for (const [key, value] of Object.entries(updates)) {
      if (!allowedKeys.includes(key)) continue;

      await env.DB.prepare(
        `INSERT INTO platform_settings (setting_key, setting_value, updated_at) 
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(setting_key) DO UPDATE SET setting_value = ?, updated_at = datetime('now')`
      ).bind(key, value, value).run();
    }

    return successResponse(null, 'Settings updated successfully');
  } catch (error) {
    console.error('Update settings error:', error);
    return errorResponse('Failed to update settings', 500);
  }
}

async function handleDatabaseManagement(request, env, pathParts) {
  const subAction = pathParts[3];
  const method = request.method;

  if (method === 'GET' && !subAction) {
    return listSiteDatabases(env);
  }

  if (method === 'GET' && subAction === 'sizes') {
    return getSiteDatabaseSizes(env);
  }

  if (method === 'POST' && subAction === 'provision') {
    return provisionSiteDatabase(request, env);
  }

  if (method === 'DELETE' && subAction) {
    return deleteSiteDatabase(env, subAction);
  }

  return errorResponse('Database endpoint not found', 404);
}

async function listSiteDatabases(env) {
  try {
    const sites = await env.DB.prepare(
      `SELECT id, subdomain, brand_name, d1_database_id, d1_binding_name, created_at
       FROM sites WHERE is_active = 1 ORDER BY created_at DESC`
    ).all();

    const siteList = (sites.results || []).map(s => ({
      siteId: s.id,
      subdomain: s.subdomain,
      brandName: s.brand_name,
      d1DatabaseId: s.d1_database_id,
      d1BindingName: s.d1_binding_name,
      hasPerSiteDB: !!s.d1_database_id,
      createdAt: s.created_at,
    }));

    let cfDatabases = [];
    try {
      cfDatabases = await listAllSiteDatabases(env);
    } catch (e) {
      console.error('Failed to list CF databases:', e.message || e);
    }

    return successResponse({
      sites: siteList,
      cfDatabases,
      totalSites: siteList.length,
      sitesWithDB: siteList.filter(s => s.hasPerSiteDB).length,
      sitesWithoutDB: siteList.filter(s => !s.hasPerSiteDB).length,
    });
  } catch (error) {
    console.error('List site databases error:', error);
    return errorResponse('Failed to list databases', 500);
  }
}

async function getSiteDatabaseSizes(env) {
  try {
    const sites = await env.DB.prepare(
      `SELECT id, subdomain, d1_database_id FROM sites WHERE d1_database_id IS NOT NULL`
    ).all();

    const sizeResults = [];
    for (const site of (sites.results || [])) {
      try {
        const size = await getDatabaseSize(env, site.d1_database_id);
        sizeResults.push({
          siteId: site.id,
          subdomain: site.subdomain,
          d1DatabaseId: site.d1_database_id,
          sizeBytes: size,
          sizeMB: (size / (1024 * 1024)).toFixed(2),
        });
      } catch (e) {
        sizeResults.push({
          siteId: site.id,
          subdomain: site.subdomain,
          d1DatabaseId: site.d1_database_id,
          error: e.message || 'Failed to fetch size',
        });
      }
    }

    return successResponse(sizeResults);
  } catch (error) {
    console.error('Get database sizes error:', error);
    return errorResponse('Failed to get database sizes', 500);
  }
}

async function provisionSiteDatabase(request, env) {
  try {
    const { siteId } = await request.json();
    if (!siteId) return errorResponse('siteId is required');

    const site = await env.DB.prepare(
      'SELECT id, subdomain, d1_database_id FROM sites WHERE id = ?'
    ).bind(siteId).first();

    if (!site) return errorResponse('Site not found', 404);
    if (site.d1_database_id) return errorResponse('Site already has a per-site database', 400);

    const shortId = siteId.substring(0, 8);
    const dbName = `site-${site.subdomain}-${shortId}`;
    const d1BindingName = `SITE_DB_${shortId.toUpperCase()}`;

    const dbResult = await createDatabase(env, dbName);
    const d1DatabaseId = dbResult.id;

    const schemaStatements = getSiteSchemaStatements();
    await runSchemaOnDB(env, d1DatabaseId, schemaStatements);

    await env.DB.prepare(
      `UPDATE sites SET d1_database_id = ?, d1_binding_name = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(d1DatabaseId, d1BindingName, siteId).run();

    try {
      await addBindingAndRedeploy(env, siteId, d1DatabaseId, d1BindingName);
    } catch (redeployErr) {
      console.error('Redeploy failed (non-fatal):', redeployErr.message || redeployErr);
    }

    return successResponse({
      siteId,
      d1DatabaseId,
      d1BindingName,
      dbName,
    }, 'Database provisioned successfully');
  } catch (error) {
    console.error('Provision database error:', error);
    return errorResponse('Failed to provision database: ' + (error.message || 'Unknown error'), 500);
  }
}

async function deleteSiteDatabase(env, siteId) {
  try {
    const site = await env.DB.prepare(
      'SELECT id, d1_database_id FROM sites WHERE id = ?'
    ).bind(siteId).first();

    if (!site) return errorResponse('Site not found', 404);
    if (!site.d1_database_id) return errorResponse('Site has no per-site database', 400);

    await deleteDatabase(env, site.d1_database_id);

    await env.DB.prepare(
      `UPDATE sites SET d1_database_id = NULL, d1_binding_name = NULL, updated_at = datetime('now') WHERE id = ?`
    ).bind(siteId).run();

    return successResponse({ siteId }, 'Database deleted successfully');
  } catch (error) {
    console.error('Delete database error:', error);
    return errorResponse('Failed to delete database: ' + (error.message || 'Unknown error'), 500);
  }
}
