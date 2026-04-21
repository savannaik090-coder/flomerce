import { generateId, errorResponse, successResponse, handleCORS, validateEmail } from '../../utils/helpers.js';
import { validateAuth } from '../../utils/auth.js';
import { listAllSiteDatabases, getDatabaseSize, deleteDatabase, createDatabase, runSchemaOnDB, addBindingAndRedeploy } from '../../utils/d1-manager.js';
import { getSiteSchemaStatements } from '../../utils/site-schema.js';
import { reconcileShard, estimateRowBytes, trackD1Write, getSiteUsage, getPlanLimitsConfig } from '../../utils/usage-tracker.js';
import { resolveSiteDBById, getSiteConfig } from '../../utils/site-db.js';
import { cancelRazorpaySubscription } from './payments-worker.js';
import { sendEmail, getOwnerRecipients } from '../../utils/email.js';

const ADMIN_EMAILS = [
  'savannaik090@gmail.com',
  'xiyohe3598@indevgo.com',
];
 
async function isOwner(user, env) {
  if (!user) return false;
  return ADMIN_EMAILS.some(e => e.toLowerCase() === user.email?.toLowerCase());
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
    case 'shards':
      return handleShardManagement(request, env, pathParts);
    case 'enterprise':
      return handleEnterpriseManagement(request, env, pathParts, user);
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
      for (const s of sites) {
        try {
          const sdb = await resolveSiteDBById(env, s.id);
          const ordersCount = await sdb.prepare('SELECT COUNT(*) as count FROM orders WHERE site_id = ?').bind(s.id).first();
          totalOrders += ordersCount?.count || 0;
        } catch (e) {}
      }
    } catch (e) {}

    const ownerUser = users.find(u => ADMIN_EMAILS.some(e => e.toLowerCase() === u.email?.toLowerCase())) || null;

    return successResponse({
      users,
      sites,
      totalUsers: users.length,
      totalSites: sites.length,
      totalOrders,
      currentOwner: ownerUser ? { id: ownerUser.id, email: ownerUser.email, name: ownerUser.name } : { email: ADMIN_EMAILS[0] },
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
    if (currentUser.email.toLowerCase() !== ADMIN_EMAILS[0].toLowerCase()) {
      return errorResponse('Only the primary owner can transfer ownership', 403);
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
      `To transfer ownership, update the ADMIN_EMAILS array in admin-worker.js to include ${newOwner.email}`
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

  try {
    await env.DB.prepare(`ALTER TABLE subscription_plans ADD COLUMN original_price REAL DEFAULT NULL`).run();
  } catch (e) {}

  try {
    await env.DB.prepare(`ALTER TABLE subscription_plans ADD COLUMN tagline TEXT DEFAULT NULL`).run();
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

  if (request.method === 'POST' && planId === 'bulk') {
    return bulkSavePlan(request, env);
  }

  if (request.method === 'DELETE' && planId === 'bulk') {
    return bulkDeletePlan(request, env);
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
    try {
      const deprecated = await env.DB.prepare(
        `SELECT id FROM subscription_plans WHERE billing_cycle NOT IN ('monthly', '3months', '6months', 'yearly')`
      ).all();
      const deprecatedIds = (deprecated.results || []).map(r => r.id);
      if (deprecatedIds.length > 0) {
        await env.DB.prepare(
          `DELETE FROM subscription_plans WHERE billing_cycle NOT IN ('monthly', '3months', '6months', 'yearly')`
        ).run();
        console.log(`Cleaned up ${deprecatedIds.length} deprecated billing cycle plan(s)`);
      }
    } catch (cleanupErr) {
      console.error('Plan cleanup error (non-fatal):', cleanupErr.message);
    }

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
    const { plan_name, billing_cycle, display_price, original_price, razorpay_plan_id, features, is_popular, display_order, plan_tier } = await request.json();

    if (!plan_name || !billing_cycle || display_price === undefined || !razorpay_plan_id) {
      return errorResponse('Plan name, billing cycle, display price, and Razorpay Plan ID are required');
    }

    if (!plan_tier || plan_tier < 1 || plan_tier > 10) {
      return errorResponse('Plan tier is required (1-10)');
    }

    const validCycles = ['monthly', '3months', '6months', 'yearly'];
    if (!validCycles.includes(billing_cycle)) {
      return errorResponse('Billing cycle must be monthly, 3months, 6months, or yearly');
    }

    if (original_price != null && original_price !== '' && original_price !== 0) {
      const op = parseFloat(original_price);
      if (!isFinite(op) || op <= 0) return errorResponse('Original price must be a positive number');
      if (op <= parseFloat(display_price)) return errorResponse('Original price must be greater than the display (discounted) price');
    }

    const id = generateId();
    await env.DB.prepare(
      `INSERT INTO subscription_plans (id, plan_name, billing_cycle, display_price, original_price, razorpay_plan_id, features, is_popular, display_order, plan_tier, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      id,
      plan_name,
      billing_cycle,
      display_price,
      original_price || null,
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
    const { plan_name, billing_cycle, display_price, original_price, razorpay_plan_id, features, is_popular, is_active, display_order, plan_tier } = updates;

    const effectiveOriginal = original_price !== undefined ? original_price : existing.original_price;
    const effectiveDisplay = display_price ?? existing.display_price;
    if (effectiveOriginal != null && effectiveOriginal !== '' && effectiveOriginal !== 0) {
      const op = parseFloat(effectiveOriginal);
      if (!isFinite(op) || op <= 0) return errorResponse('Original price must be a positive number');
      if (op <= parseFloat(effectiveDisplay)) return errorResponse('Original price must be greater than the display (discounted) price');
    }

    await env.DB.prepare(
      `UPDATE subscription_plans SET
        plan_name = ?,
        billing_cycle = ?,
        display_price = ?,
        original_price = ?,
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
      original_price !== undefined ? (original_price || null) : (existing.original_price ?? null),
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

async function bulkSavePlan(request, env) {
  try {
    const { plan_name, plan_tier, features, is_popular, display_order, cycles, tagline, old_plan_name } = await request.json();

    if (!plan_name || !plan_tier || !cycles || !Array.isArray(cycles) || cycles.length === 0) {
      return errorResponse('Plan name, tier, and at least one billing cycle are required');
    }

    if (plan_tier < 1 || plan_tier > 10) {
      return errorResponse('Plan tier must be between 1 and 10');
    }

    const validCycles = ['monthly', '3months', '6months', 'yearly'];
    const featuresJson = JSON.stringify(features || []);

    const lookupName = old_plan_name || plan_name;
    const existingResult = await env.DB.prepare(
      `SELECT * FROM subscription_plans WHERE plan_name = ?`
    ).bind(lookupName).all();
    const existingByName = existingResult.results || [];
    const existingMap = {};
    for (const row of existingByName) {
      existingMap[row.billing_cycle] = row;
    }

    if (old_plan_name && old_plan_name !== plan_name) {
      try {
        await env.DB.prepare(
          `UPDATE subscriptions SET plan = ? WHERE plan = ?`
        ).bind(plan_name, old_plan_name).run();
        await env.DB.prepare(
          `UPDATE sites SET subscription_plan = ? WHERE subscription_plan = ?`
        ).bind(plan_name, old_plan_name).run();
      } catch (e) {
        console.error('Plan rename in subscriptions/sites failed (non-fatal):', e);
      }
    }

    const activeCycleKeys = [];
    const errors = [];

    for (const cycle of cycles) {
      if (!cycle.billing_cycle || !validCycles.includes(cycle.billing_cycle)) {
        errors.push(`Invalid billing cycle: ${cycle.billing_cycle}`);
        continue;
      }
      if (!cycle.display_price || !cycle.razorpay_plan_id) {
        errors.push(`${cycle.billing_cycle}: price and Razorpay Plan ID are required`);
        continue;
      }
      const dp = parseFloat(cycle.display_price);
      if (!isFinite(dp) || dp <= 0) {
        errors.push(`${cycle.billing_cycle}: display price must be a positive number`);
        continue;
      }
      const op = cycle.original_price ? parseFloat(cycle.original_price) : null;
      if (op != null && (!isFinite(op) || op <= 0 || op <= dp)) {
        errors.push(`${cycle.billing_cycle}: original price must be greater than display price`);
        continue;
      }
      activeCycleKeys.push({ key: cycle.billing_cycle, dp, op, razorpay_plan_id: cycle.razorpay_plan_id });
    }

    if (errors.length > 0) {
      return errorResponse('Validation failed: ' + errors.join('; '), 400);
    }

    if (activeCycleKeys.length === 0) {
      return errorResponse('At least one valid billing cycle is required', 400);
    }

    const statements = [];
    const activeCycleNames = activeCycleKeys.map(c => c.key);

    for (const cycle of activeCycleKeys) {
      const existing = existingMap[cycle.key];
      if (existing) {
        statements.push(env.DB.prepare(
          `UPDATE subscription_plans SET
            plan_name = ?, plan_tier = ?, display_price = ?, original_price = ?,
            razorpay_plan_id = ?, features = ?, is_popular = ?, display_order = ?,
            tagline = ?, is_active = 1, updated_at = datetime('now')
          WHERE id = ?`
        ).bind(
          plan_name, plan_tier, cycle.dp, cycle.op, cycle.razorpay_plan_id,
          featuresJson, is_popular ? 1 : 0, display_order || 0, tagline || null, existing.id
        ));
      } else {
        const id = generateId();
        statements.push(env.DB.prepare(
          `INSERT INTO subscription_plans (id, plan_name, billing_cycle, display_price, original_price, razorpay_plan_id, features, is_popular, display_order, plan_tier, tagline, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
        ).bind(
          id, plan_name, cycle.key, cycle.dp, cycle.op, cycle.razorpay_plan_id,
          featuresJson, is_popular ? 1 : 0, display_order || 0, plan_tier, tagline || null
        ));
      }
    }

    for (const [cycleKey, row] of Object.entries(existingMap)) {
      if (!activeCycleNames.includes(cycleKey)) {
        statements.push(env.DB.prepare(
          `UPDATE subscription_plans SET is_active = 0, updated_at = datetime('now') WHERE id = ?`
        ).bind(row.id));
      }
    }

    await env.DB.batch(statements);

    return successResponse(null, 'Plan saved successfully across all billing cycles');
  } catch (error) {
    console.error('Bulk save plan error:', error);
    return errorResponse('Failed to save plan', 500);
  }
}

async function bulkDeletePlan(request, env) {
  try {
    const { plan_name } = await request.json();
    if (!plan_name) return errorResponse('Plan name is required');

    await env.DB.prepare('DELETE FROM subscription_plans WHERE plan_name = ?').bind(plan_name).run();
    return successResponse(null, `All cycles of "${plan_name}" deleted successfully`);
  } catch (error) {
    console.error('Bulk delete plan error:', error);
    return errorResponse('Failed to delete plan', 500);
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

    const allowedKeys = ['razorpay_key_id', 'enterprise_enabled', 'enterprise_message', 'enterprise_email'];

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

  return errorResponse('Database endpoint not found', 404);
}

async function listSiteDatabases(env) {
  try {
    const sites = await env.DB.prepare(
      `SELECT s.id, s.subdomain, s.brand_name, s.shard_id, s.d1_database_id, s.d1_binding_name, s.created_at,
              sh.binding_name as shard_binding, sh.database_name as shard_name
       FROM sites s
       LEFT JOIN shards sh ON s.shard_id = sh.id
       WHERE s.is_active = 1 ORDER BY s.created_at DESC`
    ).all();

    const siteList = (sites.results || []).map(s => ({
      siteId: s.id,
      subdomain: s.subdomain,
      brandName: s.brand_name,
      shardId: s.shard_id,
      shardBinding: s.shard_binding,
      shardName: s.shard_name,
      d1DatabaseId: s.d1_database_id,
      d1BindingName: s.d1_binding_name,
      hasShardDB: !!s.shard_id,
      hasPerSiteDB: !!s.d1_database_id,
      createdAt: s.created_at,
    }));

    return successResponse({
      sites: siteList,
      totalSites: siteList.length,
      sitesOnShards: siteList.filter(s => s.hasShardDB).length,
      sitesOnPlatformDB: siteList.filter(s => !s.hasShardDB && !s.hasPerSiteDB).length,
    });
  } catch (error) {
    console.error('List site databases error:', error);
    return errorResponse('Failed to list databases', 500);
  }
}

async function getSiteDatabaseSizes(env) {
  try {
    const shards = await env.DB.prepare('SELECT id, database_id, database_name, binding_name FROM shards').all();

    const sizeResults = [];
    for (const shard of (shards.results || [])) {
      try {
        const size = await getDatabaseSize(env, shard.database_id);
        sizeResults.push({
          shardId: shard.id,
          databaseName: shard.database_name,
          bindingName: shard.binding_name,
          sizeBytes: size,
          sizeMB: (size / (1024 * 1024)).toFixed(2),
        });
      } catch (e) {
        sizeResults.push({
          shardId: shard.id,
          databaseName: shard.database_name,
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

async function handleShardManagement(request, env, pathParts) {
  const method = request.method;
  const shardId = pathParts[3];
  const subAction = pathParts[4];

  if (method === 'GET' && !shardId) {
    return listShards(env);
  }

  if (method === 'GET' && shardId === 'sites' && !subAction) {
    return errorResponse('Shard ID required', 400);
  }

  if (method === 'GET' && shardId && subAction === 'sites') {
    return listShardSites(env, shardId);
  }

  if (method === 'POST' && !shardId) {
    return createShard(request, env);
  }

  if (method === 'POST' && shardId === 'move-site') {
    return moveSiteBetweenShards(request, env);
  }

  if (method === 'POST' && shardId && subAction === 'reconcile') {
    return reconcileShardEndpoint(env, shardId);
  }

  if (method === 'POST' && shardId && subAction === 'set-active') {
    return setShardActive(request, env, shardId);
  }

  if (method === 'DELETE' && shardId) {
    return deleteShardEndpoint(env, shardId);
  }

  return errorResponse('Shard endpoint not found', 404);
}

async function listShards(env) {
  try {
    const result = await env.DB.prepare(
      'SELECT * FROM shards ORDER BY created_at ASC'
    ).all();

    const shards = [];
    for (const shard of (result.results || [])) {
      let sizeBytes = 0;
      let sizeMB = '0.00';
      try {
        sizeBytes = await getDatabaseSize(env, shard.database_id);
        sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);
      } catch (e) {}

      const siteCount = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM sites WHERE shard_id = ?'
      ).bind(shard.id).first();

      let bindingAvailable = false;
      try {
        const db = env[shard.binding_name];
        if (db) {
          await db.prepare('SELECT 1').first();
          bindingAvailable = true;
        }
      } catch (e) {}

      shards.push({
        ...shard,
        sizeBytes,
        sizeMB,
        siteCount: siteCount?.count || 0,
        sizeAlertGB: (sizeBytes / (1024 * 1024 * 1024)).toFixed(3),
        isNearLimit: sizeBytes > 8 * 1024 * 1024 * 1024,
        bindingAvailable,
      });
    }

    return successResponse(shards);
  } catch (error) {
    console.error('List shards error:', error);
    return errorResponse('Failed to list shards', 500);
  }
}

async function listShardSites(env, shardId) {
  try {
    const sites = await env.DB.prepare(
      `SELECT s.id, s.subdomain, s.brand_name, s.template_id, s.is_active, s.migration_locked, s.created_at,
              u.d1_bytes_used, u.r2_bytes_used, u.baseline_bytes
       FROM sites s
       LEFT JOIN site_usage u ON s.id = u.site_id
       WHERE s.shard_id = ?
       ORDER BY s.created_at DESC`
    ).bind(shardId).all();

    const shard = await env.DB.prepare('SELECT correction_factor FROM shards WHERE id = ?').bind(shardId).first();
    const factor = shard?.correction_factor || 1.0;

    const siteList = (sites.results || []).map(s => {
      const raw = s.d1_bytes_used || 0;
      const baseline = s.baseline_bytes || 0;
      const displayed = Math.ceil((baseline + raw) * factor);
      return {
        siteId: s.id,
        subdomain: s.subdomain,
        brandName: s.brand_name,
        templateId: s.template_id,
        isActive: s.is_active,
        migrationLocked: s.migration_locked,
        d1BytesRaw: raw,
        baselineBytes: baseline,
        d1BytesDisplayed: displayed,
        r2BytesUsed: s.r2_bytes_used || 0,
        createdAt: s.created_at,
      };
    });

    return successResponse({ sites: siteList, correctionFactor: factor });
  } catch (error) {
    console.error('List shard sites error:', error);
    return errorResponse('Failed to list shard sites', 500);
  }
}

async function createShard(request, env) {
  try {
    const { name, setActive } = await request.json();

    if (!name) {
      return errorResponse('Database name is required');
    }

    const existingCount = await env.DB.prepare('SELECT COUNT(*) as count FROM shards').first();
    const shardNumber = (existingCount?.count || 0) + 1;
    const bindingName = `SHARD_${shardNumber}`;

    const dbResult = await createDatabase(env, name);
    const databaseId = dbResult.id;
    console.log(`Created shard D1 database: ${name} (${databaseId})`);

    const schemaStatements = getSiteSchemaStatements();
    await runSchemaOnDB(env, databaseId, schemaStatements);
    console.log(`Schema applied to shard DB: ${name}`);

    const shardId = generateId();

    if (setActive === true) {
      await env.DB.prepare('UPDATE shards SET is_active = 0').run();
    }

    await env.DB.prepare(
      `INSERT INTO shards (id, binding_name, database_id, database_name, is_active, correction_factor, created_at)
       VALUES (?, ?, ?, ?, ?, 1.0, datetime('now'))`
    ).bind(shardId, bindingName, databaseId, name, setActive === true ? 1 : 0).run();

    let bindingAdded = false;
    try {
      await addBindingAndRedeploy(env, shardId, databaseId, bindingName);
      bindingAdded = true;
      console.log(`Worker redeployed with shard binding ${bindingName}`);
    } catch (redeployErr) {
      console.error('Worker redeploy warning:', redeployErr.message || redeployErr);
    }

    return successResponse({
      shardId,
      bindingName,
      databaseId,
      databaseName: name,
      isActive: setActive === true,
      bindingAdded,
      note: bindingAdded ? undefined : `Shard created but binding not auto-added. Add to wrangler.toml: [[d1_databases]] binding="${bindingName}" database_name="${name}" database_id="${databaseId}"`,
    }, `Shard "${name}" created successfully with binding ${bindingName}`);
  } catch (error) {
    console.error('Create shard error:', error);
    return errorResponse('Failed to create shard: ' + (error.message || 'Unknown error'), 500);
  }
}

async function setShardActive(request, env, shardId) {
  try {
    const shard = await env.DB.prepare('SELECT id FROM shards WHERE id = ?').bind(shardId).first();
    if (!shard) return errorResponse('Shard not found', 404);

    await env.DB.prepare('UPDATE shards SET is_active = 0').run();
    await env.DB.prepare('UPDATE shards SET is_active = 1 WHERE id = ?').bind(shardId).run();

    return successResponse({ shardId }, 'Shard set as active');
  } catch (error) {
    console.error('Set shard active error:', error);
    return errorResponse('Failed to set shard active', 500);
  }
}

async function reconcileShardEndpoint(env, shardId) {
  try {
    const result = await reconcileShard(env, shardId);
    if (!result) {
      return errorResponse('Failed to reconcile shard', 500);
    }

    return successResponse(result, 'Shard reconciled successfully');
  } catch (error) {
    console.error('Reconcile shard error:', error);
    return errorResponse('Failed to reconcile shard', 500);
  }
}

const MIGRATION_TABLES_SITE_ID = [
  'site_config',
  'categories', 'products', 'orders', 'guest_orders',
  'carts', 'wishlists', 'site_customers', 'site_customer_sessions',
  'customer_addresses', 'customer_password_resets', 'customer_email_verifications',
  'coupons', 'notifications', 'reviews', 'page_seo', 'site_media', 'site_staff',
  'cancellation_requests', 'return_requests',
  'site_usage', 'activity_log', 'page_views', 'blog_posts',
];

const MIGRATION_TABLES_FK = [
  { table: 'product_variants', fk: 'product_id', resolveFrom: 'products', resolveKey: 'site_id' },
  { table: 'addresses', fk: 'user_id', resolveFrom: 'site_customers', resolveKey: 'site_id' },
];

async function batchInsertRows(targetDB, table, rows) {
  const BATCH_SIZE = 25;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const stmts = batch.map(row => {
      const columns = Object.keys(row);
      const placeholders = columns.map(() => '?').join(', ');
      const values = columns.map(c => row[c]);
      return targetDB.prepare(
        `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`
      ).bind(...values);
    });
    try {
      await targetDB.batch(stmts);
      inserted += batch.length;
    } catch (batchErr) {
      for (const row of batch) {
        const columns = Object.keys(row);
        const placeholders = columns.map(() => '?').join(', ');
        const values = columns.map(c => row[c]);
        try {
          await targetDB.prepare(
            `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`
          ).bind(...values).run();
          inserted++;
        } catch (insertErr) {
          console.error(`Migration insert error for ${table}:`, insertErr.message);
        }
      }
    }
  }
  return inserted;
}

const AUTOINCREMENT_TABLES = new Set(['page_views', 'site_media']);

async function migrateTableBySiteId(sourceDB, targetDB, table, siteId) {
  let copied = 0;
  let offset = 0;
  const batchSize = 1000;
  const stripId = AUTOINCREMENT_TABLES.has(table);

  while (true) {
    const result = await sourceDB.prepare(
      `SELECT * FROM ${table} WHERE site_id = ? LIMIT ? OFFSET ?`
    ).bind(siteId, batchSize, offset).all();
    const rows = result.results || [];

    if (rows.length === 0) break;

    const processedRows = stripId
      ? rows.map(row => { const { id, ...rest } = row; return rest; })
      : rows;

    copied += await batchInsertRows(targetDB, table, processedRows);
    offset += batchSize;
    if (rows.length < batchSize) break;
  }

  return copied;
}

async function moveSiteBetweenShards(request, env) {
  try {
    const { siteId, targetShardId } = await request.json();

    if (!siteId || !targetShardId) {
      return errorResponse('siteId and targetShardId are required');
    }

    const site = await env.DB.prepare(
      'SELECT id, subdomain, shard_id, migration_locked FROM sites WHERE id = ?'
    ).bind(siteId).first();

    if (!site) return errorResponse('Site not found', 404);
    if (site.migration_locked) return errorResponse('Site is currently being migrated', 423);
    if (site.shard_id === targetShardId) return errorResponse('Site is already on this shard', 400);

    const targetShard = await env.DB.prepare(
      'SELECT id, binding_name, database_id FROM shards WHERE id = ?'
    ).bind(targetShardId).first();

    if (!targetShard) return errorResponse('Target shard not found', 404);

    const sourceShardId = site.shard_id;
    if (!sourceShardId) return errorResponse('Site is not on any shard (still on platform DB). Cannot migrate.', 400);

    const sourceShard = await env.DB.prepare(
      'SELECT id, binding_name FROM shards WHERE id = ?'
    ).bind(sourceShardId).first();

    if (!sourceShard) return errorResponse('Source shard not found', 404);

    const sourceDB = env[sourceShard.binding_name];
    const targetDB = env[targetShard.binding_name];

    if (!sourceDB) return errorResponse(`Source shard binding ${sourceShard.binding_name} not found in env`, 500);
    if (!targetDB) return errorResponse(`Target shard binding ${targetShard.binding_name} not found in env`, 500);

    await env.DB.prepare(
      'UPDATE sites SET migration_locked = 1, updated_at = datetime(\'now\') WHERE id = ?'
    ).bind(siteId).run();

    const schemaStatements = getSiteSchemaStatements();
    for (const sql of schemaStatements) {
      try {
        await targetDB.prepare(sql).run();
      } catch (e) {}
    }

    const migrationStats = {};
    const skippedTables = [];
    let migrationError = null;
    const allMigratedTables = [];

    try {
      for (const table of MIGRATION_TABLES_SITE_ID) {
        let tableExists = false;
        try {
          await sourceDB.prepare(`SELECT COUNT(*) as c FROM ${table} WHERE site_id = ?`).bind(siteId).first();
          tableExists = true;
        } catch (e) {
          const msg = (e.message || '').toLowerCase();
          if (msg.includes('no such table') || msg.includes('does not exist')) {
            skippedTables.push(table);
            continue;
          }
          throw new Error(`Failed to read table ${table} on source shard: ${e.message}`);
        }

        const copied = await migrateTableBySiteId(sourceDB, targetDB, table, siteId);
        migrationStats[table] = copied;
        allMigratedTables.push({ table, keyCol: 'site_id' });
      }

      for (const { table, fk, resolveFrom, resolveKey } of MIGRATION_TABLES_FK) {
        try {
          await sourceDB.prepare(`SELECT COUNT(*) as c FROM ${table} LIMIT 1`).first();
        } catch (e) {
          const msg = (e.message || '').toLowerCase();
          if (msg.includes('no such table') || msg.includes('does not exist')) {
            skippedTables.push(table);
            continue;
          }
          throw new Error(`Failed to read table ${table} on source shard: ${e.message}`);
        }

        const parentIdsResult = await sourceDB.prepare(
          `SELECT id FROM ${resolveFrom} WHERE ${resolveKey} = ?`
        ).bind(siteId).all();
        const parentIds = (parentIdsResult.results || []).map(r => r.id);

        if (parentIds.length === 0) {
          migrationStats[table] = 0;
          allMigratedTables.push({ table, keyCol: fk, parentIds: [] });
          continue;
        }

        let copied = 0;
        const ID_BATCH = 50;
        for (let i = 0; i < parentIds.length; i += ID_BATCH) {
          const idBatch = parentIds.slice(i, i + ID_BATCH);
          const placeholders = idBatch.map(() => '?').join(', ');
          const result = await sourceDB.prepare(
            `SELECT * FROM ${table} WHERE ${fk} IN (${placeholders})`
          ).bind(...idBatch).all();
          const rows = result.results || [];
          if (rows.length > 0) {
            copied += await batchInsertRows(targetDB, table, rows);
          }
        }

        migrationStats[table] = copied;
        allMigratedTables.push({ table, keyCol: fk, parentIds });
      }

      const verificationErrors = [];
      for (const { table, keyCol, parentIds } of allMigratedTables) {
        let sourceCount = 0;
        let targetCount = 0;

        if (keyCol === 'site_id') {
          const sc = await sourceDB.prepare(`SELECT COUNT(*) as c FROM ${table} WHERE site_id = ?`).bind(siteId).first();
          sourceCount = sc?.c || 0;
          const tc = await targetDB.prepare(`SELECT COUNT(*) as c FROM ${table} WHERE site_id = ?`).bind(siteId).first();
          targetCount = tc?.c || 0;
        } else if (parentIds && parentIds.length > 0) {
          const ID_BATCH = 50;
          for (let i = 0; i < parentIds.length; i += ID_BATCH) {
            const idBatch = parentIds.slice(i, i + ID_BATCH);
            const placeholders = idBatch.map(() => '?').join(', ');
            const sc = await sourceDB.prepare(`SELECT COUNT(*) as c FROM ${table} WHERE ${keyCol} IN (${placeholders})`).bind(...idBatch).first();
            sourceCount += sc?.c || 0;
            const tc = await targetDB.prepare(`SELECT COUNT(*) as c FROM ${table} WHERE ${keyCol} IN (${placeholders})`).bind(...idBatch).first();
            targetCount += tc?.c || 0;
          }
        }

        if (sourceCount > 0 && targetCount < sourceCount) {
          verificationErrors.push(`${table}: source=${sourceCount}, target=${targetCount}`);
        }
      }

      if (verificationErrors.length > 0) {
        throw new Error(`Verification failed: ${verificationErrors.join('; ')}`);
      }

      const usage = await env.DB.prepare(
        'SELECT d1_bytes_used, baseline_bytes FROM site_usage WHERE site_id = ?'
      ).bind(siteId).first();

      const oldBaseline = usage?.baseline_bytes || 0;
      const oldTracked = usage?.d1_bytes_used || 0;
      const newBaseline = oldBaseline + oldTracked;

      await env.DB.prepare(
        `UPDATE site_usage SET baseline_bytes = ?, d1_bytes_used = 0, baseline_updated_at = datetime('now'), last_updated = datetime('now') WHERE site_id = ?`
      ).bind(newBaseline, siteId).run();

      await env.DB.prepare(
        'UPDATE sites SET shard_id = ?, updated_at = datetime(\'now\') WHERE id = ?'
      ).bind(targetShardId, siteId).run();

      for (const { table, keyCol, parentIds } of allMigratedTables) {
        try {
          if (keyCol === 'site_id') {
            await sourceDB.prepare(`DELETE FROM ${table} WHERE site_id = ?`).bind(siteId).run();
          } else if (parentIds && parentIds.length > 0) {
            const ID_BATCH = 50;
            for (let i = 0; i < parentIds.length; i += ID_BATCH) {
              const idBatch = parentIds.slice(i, i + ID_BATCH);
              const placeholders = idBatch.map(() => '?').join(', ');
              await sourceDB.prepare(`DELETE FROM ${table} WHERE ${keyCol} IN (${placeholders})`).bind(...idBatch).run();
            }
          }
        } catch (e) {
          console.error(`Source cleanup error for ${table}:`, e.message);
        }
      }

    } catch (err) {
      migrationError = err.message || 'Unknown migration error';
      console.error('Migration failed, rolling back:', migrationError);

      for (const { table, keyCol, parentIds } of allMigratedTables) {
        try {
          if (keyCol === 'site_id') {
            await targetDB.prepare(`DELETE FROM ${table} WHERE site_id = ?`).bind(siteId).run();
          } else if (parentIds && parentIds.length > 0) {
            const ID_BATCH = 50;
            for (let i = 0; i < parentIds.length; i += ID_BATCH) {
              const idBatch = parentIds.slice(i, i + ID_BATCH);
              const placeholders = idBatch.map(() => '?').join(', ');
              await targetDB.prepare(`DELETE FROM ${table} WHERE ${keyCol} IN (${placeholders})`).bind(...idBatch).run();
            }
          }
        } catch (e) {}
      }
    }

    await env.DB.prepare(
      'UPDATE sites SET migration_locked = 0, updated_at = datetime(\'now\') WHERE id = ?'
    ).bind(siteId).run();

    if (migrationError) {
      return errorResponse(`Migration failed and was rolled back: ${migrationError}`, 500);
    }

    return successResponse({
      siteId,
      fromShard: sourceShardId,
      toShard: targetShardId,
      tables: migrationStats,
      skippedTables: skippedTables.length > 0 ? skippedTables : undefined,
    }, `Site ${site.subdomain} migrated successfully`);
  } catch (error) {
    console.error('Move site error:', error);

    try {
      const { siteId } = await request.clone().json();
      if (siteId) {
        await env.DB.prepare('UPDATE sites SET migration_locked = 0 WHERE id = ?').bind(siteId).run();
      }
    } catch (e) {}

    return errorResponse('Failed to move site: ' + (error.message || 'Unknown error'), 500);
  }
}

async function ensureEnterpriseTables(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS enterprise_sites (
      site_id TEXT PRIMARY KEY,
      assigned_at TEXT DEFAULT (datetime('now')),
      assigned_by TEXT,
      notes TEXT,
      FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
    )
  `).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS enterprise_usage_monthly (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id TEXT NOT NULL,
      year_month TEXT NOT NULL,
      d1_overage_bytes INTEGER DEFAULT 0,
      r2_overage_bytes INTEGER DEFAULT 0,
      d1_cost_inr REAL DEFAULT 0,
      r2_cost_inr REAL DEFAULT 0,
      total_cost_inr REAL DEFAULT 0,
      status TEXT DEFAULT 'unpaid',
      paid_at TEXT,
      notes TEXT,
      snapshot_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
      UNIQUE(site_id, year_month)
    )
  `).run();
}

async function handleEnterpriseManagement(request, env, pathParts, user) {
  await ensureEnterpriseTables(env);
  const subAction = pathParts[3];
  const method = request.method;

  if (method === 'GET' && !subAction) {
    return listEnterpriseSites(env);
  }

  if (method === 'GET' && subAction === 'rates') {
    return getOverageRates(env);
  }

  if (method === 'PUT' && subAction === 'rates') {
    return updateOverageRates(request, env);
  }

  if (method === 'GET' && subAction === 'usage') {
    const url = new URL(request.url);
    const siteId = url.searchParams.get('siteId');
    if (!siteId) return errorResponse('siteId required', 400);
    return getEnterpriseSiteUsage(env, siteId);
  }

  if (method === 'GET' && subAction === 'invoices') {
    const url = new URL(request.url);
    const siteId = url.searchParams.get('siteId');
    return getEnterpriseInvoices(env, siteId);
  }

  if (method === 'POST' && subAction === 'assign') {
    return assignEnterpriseSite(request, env, user);
  }

  if (method === 'POST' && subAction === 'remove') {
    return removeEnterpriseSite(request, env);
  }

  if (method === 'POST' && subAction === 'snapshot') {
    return snapshotEnterpriseUsage(request, env);
  }

  if (method === 'POST' && subAction === 'mark-paid') {
    return markInvoicePaid(request, env);
  }

  if (method === 'POST' && subAction === 'update-quota') {
    return updateEnterpriseQuota(request, env);
  }

  if (method === 'POST' && subAction === 'run-monthly-snapshots') {
    // Manual trigger for the monthly cron — useful for ops backfills.
    const { yearMonth } = await request.json().catch(() => ({}));
    const result = await runMonthlyEnterpriseSnapshots(env, yearMonth || null);
    return successResponse(result, 'Monthly snapshot run complete');
  }

  if (method === 'GET' && subAction === 'search') {
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').trim();
    if (!q || q.length < 2) return errorResponse('Search query must be at least 2 characters', 400);
    return searchSitesForEnterprise(env, q);
  }

  return errorResponse('Enterprise endpoint not found', 404);
}

async function getOverageRates(env) {
  try {
    const result = await env.DB.prepare(
      `SELECT setting_key, setting_value FROM platform_settings WHERE setting_key IN ('overage_rate_d1_per_gb', 'overage_rate_r2_per_gb')`
    ).all();
    const rates = { d1PerGB: 0.75, r2PerGB: 0.015 };
    for (const row of (result.results || [])) {
      if (row.setting_key === 'overage_rate_d1_per_gb') { const v = parseFloat(row.setting_value); if (!isNaN(v) && v >= 0) rates.d1PerGB = v; }
      if (row.setting_key === 'overage_rate_r2_per_gb') { const v = parseFloat(row.setting_value); if (!isNaN(v) && v >= 0) rates.r2PerGB = v; }
    }
    return successResponse(rates);
  } catch (e) {
    return successResponse({ d1PerGB: 0.75, r2PerGB: 0.015 });
  }
}

async function updateOverageRates(request, env) {
  try {
    const { d1PerGB, r2PerGB } = await request.json();
    await ensurePlansTables(env);

    if (d1PerGB !== undefined && (isNaN(parseFloat(d1PerGB)) || parseFloat(d1PerGB) < 0)) {
      return errorResponse('d1PerGB must be a non-negative number', 400);
    }
    if (r2PerGB !== undefined && (isNaN(parseFloat(r2PerGB)) || parseFloat(r2PerGB) < 0)) {
      return errorResponse('r2PerGB must be a non-negative number', 400);
    }

    if (d1PerGB !== undefined) {
      await env.DB.prepare(
        `INSERT INTO platform_settings (setting_key, setting_value, updated_at) VALUES ('overage_rate_d1_per_gb', ?, datetime('now'))
         ON CONFLICT(setting_key) DO UPDATE SET setting_value = ?, updated_at = datetime('now')`
      ).bind(String(d1PerGB), String(d1PerGB)).run();
    }
    if (r2PerGB !== undefined) {
      await env.DB.prepare(
        `INSERT INTO platform_settings (setting_key, setting_value, updated_at) VALUES ('overage_rate_r2_per_gb', ?, datetime('now'))
         ON CONFLICT(setting_key) DO UPDATE SET setting_value = ?, updated_at = datetime('now')`
      ).bind(String(r2PerGB), String(r2PerGB)).run();
    }

    return successResponse(null, 'Overage rates updated');
  } catch (error) {
    return errorResponse('Failed to update rates: ' + error.message, 500);
  }
}

// ---------------------------------------------------------------------------
// Enterprise quota helpers (single source of truth)
// ---------------------------------------------------------------------------
// Limits used for overage billing. Resolution order:
//   1. Per-site override stored on `enterprise_sites` (d1_bytes_limit / r2_bytes_limit)
//   2. PLAN_LIMITS.enterprise from utils/usage-tracker.js
// Pass the `enterprise_sites` row in if you already have it to avoid a re-fetch.
export function resolveEnterpriseLimits(entRow) {
  const planLimits = getPlanLimitsConfig('enterprise');
  const d1 = entRow && entRow.d1_bytes_limit != null ? Number(entRow.d1_bytes_limit) : planLimits.d1Bytes;
  const r2 = entRow && entRow.r2_bytes_limit != null ? Number(entRow.r2_bytes_limit) : planLimits.r2Bytes;
  return { d1Bytes: d1, r2Bytes: r2 };
}

async function loadOverageRates(env) {
  const ratesResult = await env.DB.prepare(
    `SELECT setting_key, setting_value FROM platform_settings WHERE setting_key IN ('overage_rate_d1_per_gb', 'overage_rate_r2_per_gb')`
  ).all();
  const rates = { d1PerGB: 0.75, r2PerGB: 0.015 };
  for (const row of (ratesResult.results || [])) {
    if (row.setting_key === 'overage_rate_d1_per_gb') { const v = parseFloat(row.setting_value); if (!isNaN(v) && v >= 0) rates.d1PerGB = v; }
    if (row.setting_key === 'overage_rate_r2_per_gb') { const v = parseFloat(row.setting_value); if (!isNaN(v) && v >= 0) rates.r2PerGB = v; }
  }
  return rates;
}

async function listEnterpriseSites(env) {
  try {
    const result = await env.DB.prepare(`
      SELECT es.site_id, es.assigned_at, es.assigned_by, es.notes,
             es.d1_bytes_limit, es.r2_bytes_limit,
             s.subdomain, s.brand_name, s.user_id,
             u.name as user_name, u.email as user_email,
             su.d1_bytes_used, su.r2_bytes_used, su.last_updated as usage_updated
      FROM enterprise_sites es
      JOIN sites s ON es.site_id = s.id
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN site_usage su ON es.site_id = su.site_id
      ORDER BY es.assigned_at DESC
    `).all();

    const rates = await loadOverageRates(env);

    const sites = await Promise.all((result.results || []).map(async (row) => {
      const usage = await getSiteUsage(env, row.site_id);
      const limits = resolveEnterpriseLimits(row);
      const d1Used = usage.d1BytesUsed;
      const r2Used = usage.r2BytesUsed;
      const d1Overage = Math.max(0, d1Used - limits.d1Bytes);
      const r2Overage = Math.max(0, r2Used - limits.r2Bytes);
      const d1Cost = (d1Overage / (1024 * 1024 * 1024)) * rates.d1PerGB;
      const r2Cost = (r2Overage / (1024 * 1024 * 1024)) * rates.r2PerGB;

      return {
        siteId: row.site_id,
        subdomain: row.subdomain,
        brandName: row.brand_name,
        userId: row.user_id,
        userName: row.user_name,
        userEmail: row.user_email,
        assignedAt: row.assigned_at,
        assignedBy: row.assigned_by,
        notes: row.notes,
        d1Used, r2Used,
        d1Limit: limits.d1Bytes,
        r2Limit: limits.r2Bytes,
        d1LimitOverride: row.d1_bytes_limit != null,
        r2LimitOverride: row.r2_bytes_limit != null,
        d1Overage, r2Overage,
        currentMonthCost: Math.round((d1Cost + r2Cost) * 100) / 100,
        d1CostINR: Math.round(d1Cost * 100) / 100,
        r2CostINR: Math.round(r2Cost * 100) / 100,
        usageUpdated: row.usage_updated,
      };
    }));

    return successResponse({ sites, rates });
  } catch (error) {
    console.error('List enterprise sites error:', error);
    return errorResponse('Failed to list enterprise sites', 500);
  }
}

function parseLimitGB(val) {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  if (!Number.isFinite(num) || num < 0) return undefined; // signal invalid
  return Math.round(num * 1024 * 1024 * 1024);
}

async function assignEnterpriseSite(request, env, user) {
  try {
    const { siteId, notes, d1LimitGB, r2LimitGB } = await request.json();
    if (!siteId) return errorResponse('siteId is required', 400);

    const d1Override = parseLimitGB(d1LimitGB);
    const r2Override = parseLimitGB(r2LimitGB);
    if (d1Override === undefined) return errorResponse('d1LimitGB must be a non-negative number', 400);
    if (r2Override === undefined) return errorResponse('r2LimitGB must be a non-negative number', 400);

    const site = await env.DB.prepare('SELECT id, subdomain, brand_name FROM sites WHERE id = ?').bind(siteId).first();
    if (!site) return errorResponse('Site not found', 404);

    const activeSub = await env.DB.prepare(
      `SELECT id, razorpay_subscription_id FROM subscriptions WHERE site_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`
    ).bind(siteId).first();

    if (activeSub?.razorpay_subscription_id) {
      const razorpayCancelled = await cancelRazorpaySubscription(env, activeSub.razorpay_subscription_id);
      if (!razorpayCancelled) {
        return errorResponse('Failed to cancel existing Razorpay subscription. Cannot assign enterprise until recurring billing is stopped. Please try again or cancel the subscription manually in the Razorpay dashboard first.', 500);
      }
    }

    await env.DB.prepare(`
      INSERT INTO enterprise_sites (site_id, assigned_at, assigned_by, notes, d1_bytes_limit, r2_bytes_limit)
      VALUES (?, datetime('now'), ?, ?, ?, ?)
      ON CONFLICT(site_id) DO UPDATE SET assigned_by = ?, notes = ?, assigned_at = datetime('now'),
        d1_bytes_limit = ?, r2_bytes_limit = ?
    `).bind(
      siteId, user.email, notes || null, d1Override, r2Override,
      user.email, notes || null, d1Override, r2Override
    ).run();

    await env.DB.prepare(
      `UPDATE sites SET subscription_plan = 'enterprise', subscription_expires_at = '2099-12-31T23:59:59', is_active = 1, updated_at = datetime('now') WHERE id = ?`
    ).bind(siteId).run();

    if (activeSub) {
      await env.DB.prepare(
        `UPDATE subscriptions SET status = 'enterprise_override', updated_at = datetime('now') WHERE site_id = ? AND status = 'active'`
      ).bind(siteId).run();
    }

    return successResponse({ siteId, subdomain: site.subdomain }, 'Site assigned as enterprise');
  } catch (error) {
    console.error('Assign enterprise error:', error);
    return errorResponse('Failed to assign enterprise: ' + error.message, 500);
  }
}

async function removeEnterpriseSite(request, env) {
  try {
    const { siteId } = await request.json();
    if (!siteId) return errorResponse('siteId is required', 400);

    await env.DB.prepare('DELETE FROM enterprise_sites WHERE site_id = ?').bind(siteId).run();

    await env.DB.prepare(
      `UPDATE subscriptions SET status = 'expired', updated_at = datetime('now') WHERE site_id = ? AND status = 'enterprise_override'`
    ).bind(siteId).run();

    await env.DB.prepare(
      `UPDATE sites SET subscription_plan = NULL, subscription_expires_at = NULL, updated_at = datetime('now') WHERE id = ?`
    ).bind(siteId).run();

    return successResponse({ siteId }, 'Enterprise status removed. The site has no active plan — the user will need to subscribe to a new plan.');
  } catch (error) {
    return errorResponse('Failed to remove enterprise: ' + error.message, 500);
  }
}

async function getEnterpriseSiteUsage(env, siteId) {
  try {
    const site = await env.DB.prepare(`
      SELECT es.site_id, es.d1_bytes_limit, es.r2_bytes_limit,
             s.subdomain, s.brand_name
      FROM enterprise_sites es
      JOIN sites s ON es.site_id = s.id
      WHERE es.site_id = ?
    `).bind(siteId).first();

    if (!site) return errorResponse('Enterprise site not found', 404);

    const usage = await getSiteUsage(env, siteId);
    const rates = await loadOverageRates(env);
    const limits = resolveEnterpriseLimits(site);

    const d1Used = usage.d1BytesUsed;
    const r2Used = usage.r2BytesUsed;
    const d1Overage = Math.max(0, d1Used - limits.d1Bytes);
    const r2Overage = Math.max(0, r2Used - limits.r2Bytes);
    const d1Cost = (d1Overage / (1024 * 1024 * 1024)) * rates.d1PerGB;
    const r2Cost = (r2Overage / (1024 * 1024 * 1024)) * rates.r2PerGB;

    const invoices = await env.DB.prepare(
      `SELECT * FROM enterprise_usage_monthly WHERE site_id = ? ORDER BY year_month DESC LIMIT 24`
    ).bind(siteId).all();

    return successResponse({
      siteId,
      subdomain: site.subdomain,
      brandName: site.brand_name,
      d1Used, r2Used,
      d1Limit: limits.d1Bytes,
      r2Limit: limits.r2Bytes,
      d1LimitOverride: site.d1_bytes_limit != null,
      r2LimitOverride: site.r2_bytes_limit != null,
      d1Overage, r2Overage,
      currentMonthCost: Math.round((d1Cost + r2Cost) * 100) / 100,
      d1CostINR: Math.round(d1Cost * 100) / 100,
      r2CostINR: Math.round(r2Cost * 100) / 100,
      rates,
      invoices: (invoices.results || []),
      usageUpdated: usage.lastUpdated,
    });
  } catch (error) {
    console.error('Get enterprise usage error:', error);
    return errorResponse('Failed to get enterprise usage', 500);
  }
}

async function updateEnterpriseQuota(request, env) {
  try {
    const { siteId, d1LimitGB, r2LimitGB } = await request.json();
    if (!siteId) return errorResponse('siteId is required', 400);

    const ent = await env.DB.prepare('SELECT site_id FROM enterprise_sites WHERE site_id = ?').bind(siteId).first();
    if (!ent) return errorResponse('Enterprise site not found', 404);

    const d1Override = parseLimitGB(d1LimitGB);
    const r2Override = parseLimitGB(r2LimitGB);
    if (d1Override === undefined) return errorResponse('d1LimitGB must be a non-negative number', 400);
    if (r2Override === undefined) return errorResponse('r2LimitGB must be a non-negative number', 400);

    await env.DB.prepare(
      `UPDATE enterprise_sites SET d1_bytes_limit = ?, r2_bytes_limit = ? WHERE site_id = ?`
    ).bind(d1Override, r2Override, siteId).run();

    return successResponse({ siteId, d1LimitBytes: d1Override, r2LimitBytes: r2Override }, 'Quota updated');
  } catch (error) {
    console.error('Update enterprise quota error:', error);
    return errorResponse('Failed to update quota: ' + error.message, 500);
  }
}

async function getEnterpriseInvoices(env, siteId) {
  try {
    let query = `SELECT eum.*, s.subdomain, s.brand_name
                 FROM enterprise_usage_monthly eum
                 JOIN sites s ON eum.site_id = s.id`;
    const bindings = [];

    if (siteId) {
      query += ' WHERE eum.site_id = ?';
      bindings.push(siteId);
    }
    query += ' ORDER BY eum.year_month DESC LIMIT 100';

    const stmt = bindings.length > 0
      ? env.DB.prepare(query).bind(...bindings)
      : env.DB.prepare(query);

    const result = await stmt.all();
    return successResponse({ invoices: result.results || [] });
  } catch (error) {
    return errorResponse('Failed to get invoices', 500);
  }
}

// ---------------------------------------------------------------------------
// Snapshot core: produces (or refreshes) the monthly invoice row for one site.
// ---------------------------------------------------------------------------
// Idempotent — safe to re-run for the same (site, month). On the first
// snapshot for a month we mint an invoice_number, invoice_token and due_date
// so the row is immediately payable. Subsequent re-snapshots only refresh the
// usage/cost numbers and do not rotate identifiers (so emailed links keep
// working) and do not change the status (so paid invoices stay paid).
//
// `opts.sendEmailIfBilled` (default false): if true and the snapshot has a
// non-zero overage AND the invoice has not been emailed yet, fire off the
// invoice email and stamp `emailed_at`.
//
// Returns: { siteId, yearMonth, totalCost, billed, invoiceNumber, emailed,
//            skippedReason? }.
export async function runEnterpriseSnapshot(env, siteId, yearMonth, opts = {}) {
  const ent = await env.DB.prepare(
    'SELECT site_id, d1_bytes_limit, r2_bytes_limit FROM enterprise_sites WHERE site_id = ?'
  ).bind(siteId).first();
  if (!ent) {
    return { siteId, yearMonth, skippedReason: 'not_enterprise', billed: false };
  }

  const limits = resolveEnterpriseLimits(ent);
  const usage = await getSiteUsage(env, siteId);
  const rates = await loadOverageRates(env);

  const d1Used = usage.d1BytesUsed;
  const r2Used = usage.r2BytesUsed;
  const d1Overage = Math.max(0, d1Used - limits.d1Bytes);
  const r2Overage = Math.max(0, r2Used - limits.r2Bytes);
  const d1Cost = (d1Overage / (1024 * 1024 * 1024)) * rates.d1PerGB;
  const r2Cost = (r2Overage / (1024 * 1024 * 1024)) * rates.r2PerGB;
  const totalCost = Math.round((d1Cost + r2Cost) * 100) / 100;
  const billed = totalCost > 0;

  const existing = await env.DB.prepare(
    'SELECT * FROM enterprise_usage_monthly WHERE site_id = ? AND year_month = ?'
  ).bind(siteId, yearMonth).first();

  // Once an invoice is paid it is financially finalized — never mutate its
  // cost/usage figures or status on a re-snapshot. We return the stored
  // values so callers still see a consistent shape.
  if (existing && existing.status === 'paid') {
    return {
      siteId,
      yearMonth,
      totalCost: existing.total_cost_inr || 0,
      billed: (existing.total_cost_inr || 0) > 0,
      invoiceNumber: existing.invoice_number,
      emailed: !!existing.emailed_at,
      skippedReason: 'already_paid',
    };
  }

  // Mint invoice identifiers only on first snapshot for this site+month.
  // Due date = 14 days from snapshot (configurable later if needed).
  const invoiceNumber = existing?.invoice_number || buildInvoiceNumber(yearMonth, siteId);
  const invoiceToken = existing?.invoice_token || generateId() + generateId();
  const dueDateISO = existing?.due_date || (() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 14);
    return d.toISOString();
  })();

  const d1CostR = Math.round(d1Cost * 100) / 100;
  const r2CostR = Math.round(r2Cost * 100) / 100;

  await env.DB.prepare(`
    INSERT INTO enterprise_usage_monthly (
      site_id, year_month, d1_overage_bytes, r2_overage_bytes,
      d1_cost_inr, r2_cost_inr, total_cost_inr, status, snapshot_at,
      invoice_number, invoice_token, due_date,
      d1_limit_bytes, r2_limit_bytes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 'unpaid', datetime('now'), ?, ?, ?, ?, ?)
    ON CONFLICT(site_id, year_month) DO UPDATE SET
      d1_overage_bytes = excluded.d1_overage_bytes,
      r2_overage_bytes = excluded.r2_overage_bytes,
      d1_cost_inr = excluded.d1_cost_inr,
      r2_cost_inr = excluded.r2_cost_inr,
      total_cost_inr = excluded.total_cost_inr,
      d1_limit_bytes = excluded.d1_limit_bytes,
      r2_limit_bytes = excluded.r2_limit_bytes,
      -- Backfill identifiers for legacy rows that pre-date 0016 (where these
      -- columns were null after the ALTER TABLE). COALESCE ensures we never
      -- rotate an existing invoice_number/token/due_date that's already in use.
      invoice_number = COALESCE(invoice_number, excluded.invoice_number),
      invoice_token = COALESCE(invoice_token, excluded.invoice_token),
      due_date = COALESCE(due_date, excluded.due_date),
      snapshot_at = datetime('now')
  `).bind(
    siteId, yearMonth, d1Overage, r2Overage,
    d1CostR, r2CostR, totalCost,
    invoiceNumber, invoiceToken, dueDateISO,
    limits.d1Bytes, limits.r2Bytes
  ).run();

  let emailed = !!existing?.emailed_at;
  if (opts.sendEmailIfBilled && billed && !existing?.emailed_at) {
    try {
      await sendOverageInvoiceEmail(env, siteId, {
        invoiceNumber, invoiceToken, yearMonth, totalCost,
        d1Overage, r2Overage, d1Cost: d1CostR, r2Cost: r2CostR,
        d1Limit: limits.d1Bytes, r2Limit: limits.r2Bytes,
        rates, dueDateISO,
      });
      await env.DB.prepare(
        `UPDATE enterprise_usage_monthly SET emailed_at = datetime('now') WHERE site_id = ? AND year_month = ?`
      ).bind(siteId, yearMonth).run();
      emailed = true;
    } catch (emailErr) {
      console.error('Overage invoice email failed for', siteId, yearMonth, ':', emailErr.message || emailErr);
    }
  }

  return { siteId, yearMonth, totalCost, billed, invoiceNumber, emailed };
}

function buildInvoiceNumber(yearMonth, siteId) {
  const shortId = String(siteId || '').replace(/-/g, '').slice(0, 6).toUpperCase();
  return `FLM-${yearMonth}-${shortId}`;
}

function previousYearMonth(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

// Cron entry point — invoked monthly from `scheduled()` in workers/index.js.
// Snapshots every enterprise site for the previous calendar month and emails
// the merchant when there is a non-zero invoice. Safe to re-run.
export async function runMonthlyEnterpriseSnapshots(env, yearMonth = null) {
  const month = yearMonth || previousYearMonth();
  const sitesResult = await env.DB.prepare(
    'SELECT site_id FROM enterprise_sites'
  ).all();
  const rows = sitesResult.results || [];

  const summary = { yearMonth: month, total: rows.length, billed: 0, emailed: 0, errors: 0, sites: [] };
  for (const row of rows) {
    try {
      const r = await runEnterpriseSnapshot(env, row.site_id, month, { sendEmailIfBilled: true });
      if (r.billed) summary.billed += 1;
      if (r.emailed) summary.emailed += 1;
      summary.sites.push(r);
    } catch (e) {
      summary.errors += 1;
      console.error('runMonthlyEnterpriseSnapshots site failed:', row.site_id, e.message || e);
    }
  }
  console.log('[Cron] Monthly enterprise snapshots:', JSON.stringify({
    yearMonth: summary.yearMonth, total: summary.total, billed: summary.billed,
    emailed: summary.emailed, errors: summary.errors,
  }));
  return summary;
}

async function snapshotEnterpriseUsage(request, env) {
  try {
    const { siteId, yearMonth, sendEmail: emailFlag } = await request.json();
    if (!siteId) return errorResponse('siteId is required', 400);

    const now = new Date();
    const month = yearMonth || `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

    const result = await runEnterpriseSnapshot(env, siteId, month, { sendEmailIfBilled: !!emailFlag });
    if (result.skippedReason === 'not_enterprise') {
      return errorResponse('Enterprise site not found', 404);
    }
    return successResponse(result, 'Usage snapshot saved');
  } catch (error) {
    console.error('Snapshot error:', error);
    return errorResponse('Failed to snapshot usage: ' + error.message, 500);
  }
}

async function sendOverageInvoiceEmail(env, siteId, ctx) {
  const site = await env.DB.prepare(
    'SELECT id, subdomain, brand_name FROM sites WHERE id = ?'
  ).bind(siteId).first();
  if (!site) return;

  const config = await getSiteConfig(env, siteId);
  let settings = config?.settings || {};
  if (typeof settings === 'string') {
    try { settings = JSON.parse(settings); } catch { settings = {}; }
  }
  const recipients = getOwnerRecipients(settings, config || {});
  if (!recipients.length) {
    console.warn('No owner email for enterprise site', siteId, '— skipping invoice email');
    return;
  }

  const platformDomain = env.DOMAIN || 'flomerce.com';
  const appUrl = env.APP_URL || `https://${platformDomain}`;
  const invoiceUrl = `${appUrl}/billing/invoice?invoice=${encodeURIComponent(ctx.invoiceNumber)}&t=${encodeURIComponent(ctx.invoiceToken)}&site=${encodeURIComponent(site.id)}`;

  const fmt = (n) => `&#8377;${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const gb = (b) => (Number(b || 0) / (1024 * 1024 * 1024)).toFixed(3);
  const due = new Date(ctx.dueDateISO).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const monthLabel = (() => {
    const [y, m] = ctx.yearMonth.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  })();

  const html = `
    <!DOCTYPE html><html><head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#f5f5f5;font-family:'Segoe UI',Arial,sans-serif;">
      <div style="max-width:600px;margin:0 auto;background:#fff;">
        <div style="background:#0f172a;color:#fff;padding:28px 32px;">
          <h1 style="margin:0;font-size:22px;font-weight:700;">Overage invoice — ${monthLabel}</h1>
          <p style="margin:4px 0 0;color:#cbd5e1;font-size:13px;">Invoice ${ctx.invoiceNumber}</p>
        </div>
        <div style="padding:28px 32px;color:#0f172a;">
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
            Hi ${site.brand_name || 'there'}, your enterprise site <strong>${site.subdomain}</strong> used storage
            beyond your included quota in ${monthLabel}. Here is the breakdown.
          </p>
          <table style="width:100%;border-collapse:collapse;margin:18px 0;font-size:14px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th align="left" style="padding:10px;border-bottom:1px solid #e2e8f0;">Resource</th>
                <th align="right" style="padding:10px;border-bottom:1px solid #e2e8f0;">Overage</th>
                <th align="right" style="padding:10px;border-bottom:1px solid #e2e8f0;">Rate</th>
                <th align="right" style="padding:10px;border-bottom:1px solid #e2e8f0;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding:10px;border-bottom:1px solid #f1f5f9;">D1 storage</td>
                <td align="right" style="padding:10px;border-bottom:1px solid #f1f5f9;">${gb(ctx.d1Overage)} GB</td>
                <td align="right" style="padding:10px;border-bottom:1px solid #f1f5f9;">${fmt(ctx.rates.d1PerGB)}/GB</td>
                <td align="right" style="padding:10px;border-bottom:1px solid #f1f5f9;">${fmt(ctx.d1Cost)}</td>
              </tr>
              <tr>
                <td style="padding:10px;border-bottom:1px solid #f1f5f9;">R2 storage</td>
                <td align="right" style="padding:10px;border-bottom:1px solid #f1f5f9;">${gb(ctx.r2Overage)} GB</td>
                <td align="right" style="padding:10px;border-bottom:1px solid #f1f5f9;">${fmt(ctx.rates.r2PerGB)}/GB</td>
                <td align="right" style="padding:10px;border-bottom:1px solid #f1f5f9;">${fmt(ctx.r2Cost)}</td>
              </tr>
              <tr>
                <td colspan="3" align="right" style="padding:14px 10px;font-weight:700;">Total due</td>
                <td align="right" style="padding:14px 10px;font-weight:700;font-size:16px;">${fmt(ctx.totalCost)}</td>
              </tr>
            </tbody>
          </table>
          <p style="margin:16px 0;color:#475569;font-size:14px;">Please pay by <strong>${due}</strong>.</p>
          <p style="text-align:center;margin:28px 0;">
            <a href="${invoiceUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;">View &amp; pay invoice</a>
          </p>
          <p style="font-size:12px;color:#94a3b8;line-height:1.6;margin-top:24px;">
            This is an automated invoice from Flomerce. If you believe this charge is incorrect,
            reply to this email and we'll look into it.
          </p>
        </div>
      </div>
    </body></html>
  `;

  const text = `Overage invoice ${ctx.invoiceNumber} — ${monthLabel}\nTotal due: ₹${ctx.totalCost.toFixed(2)} (due ${due})\nView & pay: ${invoiceUrl}`;
  const subject = `Flomerce overage invoice — ${monthLabel} — ₹${ctx.totalCost.toFixed(2)}`;

  await sendEmail(env, recipients, subject, html, text);
}

async function markInvoicePaid(request, env) {
  try {
    const { siteId, yearMonth, notes } = await request.json();
    if (!siteId || !yearMonth) return errorResponse('siteId and yearMonth required', 400);

    const invoice = await env.DB.prepare(
      'SELECT * FROM enterprise_usage_monthly WHERE site_id = ? AND year_month = ?'
    ).bind(siteId, yearMonth).first();

    if (!invoice) return errorResponse('Invoice not found', 404);

    await env.DB.prepare(
      `UPDATE enterprise_usage_monthly SET status = 'paid', paid_at = datetime('now'), notes = ? WHERE site_id = ? AND year_month = ?`
    ).bind(notes || null, siteId, yearMonth).run();

    return successResponse({ siteId, yearMonth }, 'Invoice marked as paid');
  } catch (error) {
    return errorResponse('Failed to mark paid: ' + error.message, 500);
  }
}

async function searchSitesForEnterprise(env, query) {
  try {
    const searchPattern = `%${query}%`;
    const result = await env.DB.prepare(`
      SELECT s.id, s.subdomain, s.brand_name, s.subscription_plan, s.is_active,
             u.name as user_name, u.email as user_email,
             CASE WHEN es.site_id IS NOT NULL THEN 1 ELSE 0 END as is_enterprise
      FROM sites s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN enterprise_sites es ON s.id = es.site_id
      WHERE s.subdomain LIKE ? OR s.brand_name LIKE ?
      ORDER BY s.brand_name ASC
      LIMIT 20
    `).bind(searchPattern, searchPattern).all();

    return successResponse({ sites: result.results || [] });
  } catch (error) {
    console.error('Search sites error:', error);
    return errorResponse('Failed to search sites', 500);
  }
}

async function deleteShardEndpoint(env, shardId) {
  try {
    const shard = await env.DB.prepare('SELECT * FROM shards WHERE id = ?').bind(shardId).first();
    if (!shard) return errorResponse('Shard not found', 404);

    const siteCount = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM sites WHERE shard_id = ?'
    ).bind(shardId).first();

    if (siteCount?.count > 0) {
      return errorResponse(`Cannot delete shard with ${siteCount.count} sites. Move all sites first.`, 400);
    }

    await deleteDatabase(env, shard.database_id);
    await env.DB.prepare('DELETE FROM shards WHERE id = ?').bind(shardId).run();

    return successResponse({ shardId }, 'Shard deleted successfully');
  } catch (error) {
    console.error('Delete shard error:', error);
    return errorResponse('Failed to delete shard: ' + (error.message || 'Unknown error'), 500);
  }
}
