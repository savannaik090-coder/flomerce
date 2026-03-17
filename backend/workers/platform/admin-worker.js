import { generateId, errorResponse, successResponse, handleCORS, validateEmail } from '../../utils/helpers.js';
import { validateAuth } from '../../utils/auth.js';
import { listAllSiteDatabases, getDatabaseSize, deleteDatabase, createDatabase, runSchemaOnDB, addBindingAndRedeploy } from '../../utils/d1-manager.js';
import { getSiteSchemaStatements } from '../../utils/site-schema.js';
import { reconcileShard, estimateRowBytes, trackD1Write } from '../../utils/usage-tracker.js';
import { resolveSiteDBById } from '../../utils/site-db.js';

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

      shards.push({
        ...shard,
        sizeBytes,
        sizeMB,
        siteCount: siteCount?.count || 0,
        sizeAlertGB: (sizeBytes / (1024 * 1024 * 1024)).toFixed(3),
        isNearLimit: sizeBytes > 8 * 1024 * 1024 * 1024,
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

    if (setActive !== false) {
      await env.DB.prepare('UPDATE shards SET is_active = 0').run();
    }

    await env.DB.prepare(
      `INSERT INTO shards (id, binding_name, database_id, database_name, is_active, correction_factor, created_at)
       VALUES (?, ?, ?, ?, ?, 1.0, datetime('now'))`
    ).bind(shardId, bindingName, databaseId, name, setActive !== false ? 1 : 0).run();

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
      isActive: setActive !== false,
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

const MIGRATION_TABLES = [
  'categories', 'products', 'product_variants', 'orders', 'guest_orders',
  'carts', 'wishlists', 'site_customers', 'site_customer_sessions',
  'customer_addresses', 'customer_password_resets', 'customer_email_verifications',
  'coupons', 'notifications', 'reviews', 'page_seo', 'site_media',
  'site_usage', 'activity_log', 'addresses',
];

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

    const migrationStats = {};
    let migrationError = null;

    try {
      for (const table of MIGRATION_TABLES) {
        let copied = 0;
        let offset = 0;
        const batchSize = 1000;

        while (true) {
          let rows;
          try {
            const result = await sourceDB.prepare(
              `SELECT * FROM ${table} WHERE site_id = ? LIMIT ? OFFSET ?`
            ).bind(siteId, batchSize, offset).all();
            rows = result.results || [];
          } catch (e) {
            break;
          }

          if (rows.length === 0) break;

          for (const row of rows) {
            const columns = Object.keys(row);
            const placeholders = columns.map(() => '?').join(', ');
            const values = columns.map(c => row[c]);
            try {
              await targetDB.prepare(
                `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`
              ).bind(...values).run();
              copied++;
            } catch (insertErr) {
              console.error(`Migration insert error for ${table}:`, insertErr.message);
            }
          }

          offset += batchSize;
          if (rows.length < batchSize) break;
        }

        migrationStats[table] = copied;
      }

      for (const table of MIGRATION_TABLES) {
        let sourceCount = 0;
        let targetCount = 0;
        try {
          const sc = await sourceDB.prepare(`SELECT COUNT(*) as c FROM ${table} WHERE site_id = ?`).bind(siteId).first();
          sourceCount = sc?.c || 0;
        } catch (e) {}
        try {
          const tc = await targetDB.prepare(`SELECT COUNT(*) as c FROM ${table} WHERE site_id = ?`).bind(siteId).first();
          targetCount = tc?.c || 0;
        } catch (e) {}

        if (sourceCount > 0 && targetCount < sourceCount) {
          throw new Error(`Verification failed for ${table}: source=${sourceCount}, target=${targetCount}`);
        }
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

      for (const table of MIGRATION_TABLES) {
        try {
          await sourceDB.prepare(`DELETE FROM ${table} WHERE site_id = ?`).bind(siteId).run();
        } catch (e) {}
      }

    } catch (err) {
      migrationError = err.message || 'Unknown migration error';
      console.error('Migration failed, rolling back:', migrationError);

      for (const table of MIGRATION_TABLES) {
        try {
          await targetDB.prepare(`DELETE FROM ${table} WHERE site_id = ?`).bind(siteId).run();
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
