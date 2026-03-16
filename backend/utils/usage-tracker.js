import { jsonResponse, errorResponse, successResponse, handleCORS } from './helpers.js';
import { validateAuth } from './auth.js';

const PLAN_LIMITS = {
  basic: { d1Bytes: 500 * 1024 * 1024, r2Bytes: 5 * 1024 * 1024 * 1024, allowOverage: false },
  pro: { d1Bytes: 1.5 * 1024 * 1024 * 1024, r2Bytes: 50 * 1024 * 1024 * 1024, allowOverage: false },
  premium: { d1Bytes: 3 * 1024 * 1024 * 1024, r2Bytes: 100 * 1024 * 1024 * 1024, allowOverage: true },
  trial: { d1Bytes: 500 * 1024 * 1024, r2Bytes: 5 * 1024 * 1024 * 1024, allowOverage: false },
  free: { d1Bytes: 500 * 1024 * 1024, r2Bytes: 5 * 1024 * 1024 * 1024, allowOverage: false },
};

const OVERAGE_RATES = {
  d1PerGB: 0.75,
  r2PerGB: 0.015,
};

export async function ensureUsageTables(env) {
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS site_usage (
        site_id TEXT PRIMARY KEY,
        d1_bytes_used INTEGER DEFAULT 0,
        r2_bytes_used INTEGER DEFAULT 0,
        last_updated TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
      )
    `).run();

    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS site_media (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site_id TEXT NOT NULL,
        storage_key TEXT NOT NULL UNIQUE,
        size_bytes INTEGER NOT NULL,
        media_type TEXT DEFAULT 'image',
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
      )
    `).run();

    await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_site_media_site ON site_media(site_id)').run();
    await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_site_media_key ON site_media(storage_key)').run();
  } catch (e) {
    console.error('ensureUsageTables error (non-fatal):', e.message || e);
  }
}

export function estimateRowBytes(fields) {
  let bytes = 100;
  for (const val of Object.values(fields)) {
    if (val === null || val === undefined) {
      bytes += 1;
    } else if (typeof val === 'number') {
      bytes += 8;
    } else if (typeof val === 'string') {
      bytes += val.length * 2;
    } else if (typeof val === 'boolean') {
      bytes += 1;
    } else {
      bytes += JSON.stringify(val).length * 2;
    }
  }
  return bytes;
}

export async function trackD1Usage(env, siteId, byteDelta) {
  if (!siteId || byteDelta === 0) return;
  try {
    await ensureUsageTables(env);
    await env.DB.prepare(`
      INSERT INTO site_usage (site_id, d1_bytes_used, r2_bytes_used, last_updated)
      VALUES (?, MAX(0, ?), 0, datetime('now'))
      ON CONFLICT(site_id) DO UPDATE SET
        d1_bytes_used = MAX(0, d1_bytes_used + ?),
        last_updated = datetime('now')
    `).bind(siteId, Math.max(0, byteDelta), byteDelta).run();
  } catch (e) {
    console.error('trackD1Usage error (non-fatal):', e.message || e);
  }
}

export async function trackR2Usage(env, siteId, byteDelta) {
  if (!siteId || byteDelta === 0) return;
  try {
    await ensureUsageTables(env);
    await env.DB.prepare(`
      INSERT INTO site_usage (site_id, d1_bytes_used, r2_bytes_used, last_updated)
      VALUES (?, 0, MAX(0, ?), datetime('now'))
      ON CONFLICT(site_id) DO UPDATE SET
        r2_bytes_used = MAX(0, r2_bytes_used + ?),
        last_updated = datetime('now')
    `).bind(siteId, Math.max(0, byteDelta), byteDelta).run();
  } catch (e) {
    console.error('trackR2Usage error (non-fatal):', e.message || e);
  }
}

export async function recordMediaFile(env, siteId, storageKey, sizeBytes, mediaType = 'image') {
  if (!siteId || !storageKey) return;
  try {
    await ensureUsageTables(env);
    const result = await env.DB.prepare(`
      INSERT OR IGNORE INTO site_media (site_id, storage_key, size_bytes, media_type, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).bind(siteId, storageKey, sizeBytes, mediaType).run();
    if (result?.meta?.changes > 0) {
      await trackR2Usage(env, siteId, sizeBytes);
    }
  } catch (e) {
    console.error('recordMediaFile error (non-fatal):', e.message || e);
  }
}

export async function removeMediaFile(env, siteId, storageKey) {
  if (!storageKey) return;
  try {
    await ensureUsageTables(env);
    const record = await env.DB.prepare(
      'SELECT size_bytes, site_id FROM site_media WHERE storage_key = ?'
    ).bind(storageKey).first();

    if (record) {
      const resolvedSiteId = siteId || record.site_id;
      await env.DB.prepare('DELETE FROM site_media WHERE storage_key = ?').bind(storageKey).run();
      await trackR2Usage(env, resolvedSiteId, -record.size_bytes);
    }
  } catch (e) {
    console.error('removeMediaFile error (non-fatal):', e.message || e);
  }
}

export async function getSiteUsage(env, siteId) {
  try {
    await ensureUsageTables(env);
    const usage = await env.DB.prepare(
      'SELECT d1_bytes_used, r2_bytes_used, last_updated FROM site_usage WHERE site_id = ?'
    ).bind(siteId).first();

    return {
      d1BytesUsed: usage?.d1_bytes_used || 0,
      r2BytesUsed: usage?.r2_bytes_used || 0,
      lastUpdated: usage?.last_updated || null,
    };
  } catch (e) {
    console.error('getSiteUsage error:', e.message || e);
    return { d1BytesUsed: 0, r2BytesUsed: 0, lastUpdated: null };
  }
}

function getSitePlan(site) {
  const plan = (site.subscription_plan || 'free').toLowerCase();
  if (plan.includes('premium')) return 'premium';
  if (plan.includes('pro')) return 'pro';
  if (plan.includes('basic')) return 'basic';
  if (plan === 'trial') return 'trial';
  return 'free';
}

export async function checkUsageLimit(env, siteId, resourceType = 'd1', additionalBytes = 0) {
  try {
    const site = await env.DB.prepare(
      'SELECT subscription_plan FROM sites WHERE id = ?'
    ).bind(siteId).first();
    if (!site) return { allowed: true, reason: null };

    const planKey = getSitePlan(site);
    const limits = PLAN_LIMITS[planKey] || PLAN_LIMITS.free;
    const usage = await getSiteUsage(env, siteId);

    const currentBytes = resourceType === 'd1' ? usage.d1BytesUsed : usage.r2BytesUsed;
    const limitBytes = resourceType === 'd1' ? limits.d1Bytes : limits.r2Bytes;
    const newTotal = currentBytes + additionalBytes;

    if (newTotal <= limitBytes) {
      return { allowed: true, reason: null };
    }

    if (limits.allowOverage) {
      const overageBytes = Math.max(0, newTotal - limitBytes);
      const overageGB = overageBytes / (1024 * 1024 * 1024);
      const rate = resourceType === 'd1' ? OVERAGE_RATES.d1PerGB : OVERAGE_RATES.r2PerGB;
      const overageCost = overageGB * rate;
      return { allowed: true, overage: true, overageBytes, overageCostINR: overageCost, reason: null };
    }

    const limitMB = (limitBytes / (1024 * 1024)).toFixed(0);
    const usedMB = (currentBytes / (1024 * 1024)).toFixed(1);
    return {
      allowed: false,
      reason: `Storage limit reached. ${resourceType.toUpperCase()} usage: ${usedMB}MB / ${limitMB}MB. Upgrade your plan for more storage.`,
    };
  } catch (e) {
    console.error('checkUsageLimit error (non-fatal):', e.message || e);
    return { allowed: true, reason: null };
  }
}

export async function reconcileSiteUsage(env, siteId) {
  try {
    await ensureUsageTables(env);

    const tables = ['products', 'categories', 'orders', 'guest_orders', 'site_customers', 'reviews', 'coupons'];
    let totalD1Bytes = 0;

    for (const table of tables) {
      try {
        const rows = await env.DB.prepare(
          `SELECT * FROM ${table} WHERE site_id = ?`
        ).bind(siteId).all();
        for (const row of (rows.results || [])) {
          totalD1Bytes += estimateRowBytes(row);
        }
      } catch (e) {}
    }

    let totalR2Bytes = 0;
    const mediaRows = await env.DB.prepare(
      'SELECT SUM(size_bytes) as total FROM site_media WHERE site_id = ?'
    ).bind(siteId).first();
    totalR2Bytes = mediaRows?.total || 0;

    await env.DB.prepare(`
      INSERT INTO site_usage (site_id, d1_bytes_used, r2_bytes_used, last_updated)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(site_id) DO UPDATE SET
        d1_bytes_used = ?,
        r2_bytes_used = ?,
        last_updated = datetime('now')
    `).bind(siteId, totalD1Bytes, totalR2Bytes, totalD1Bytes, totalR2Bytes).run();

    return { d1BytesUsed: totalD1Bytes, r2BytesUsed: totalR2Bytes };
  } catch (e) {
    console.error('reconcileSiteUsage error:', e.message || e);
    return null;
  }
}

export async function handleUsageAPI(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;

  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  const user = await validateAuth(request, env);
  if (!user) {
    return errorResponse('Unauthorized', 401);
  }

  const url = new URL(request.url);
  const siteId = url.searchParams.get('siteId');

  if (!siteId) {
    return errorResponse('siteId is required', 400);
  }

  try {
    const site = await env.DB.prepare(
      'SELECT id, subscription_plan FROM sites WHERE id = ? AND user_id = ?'
    ).bind(siteId, user.id).first();

    if (!site) {
      return errorResponse('Site not found or unauthorized', 404);
    }

    let usage = await getSiteUsage(env, siteId);

    if (usage.d1BytesUsed === 0 && usage.r2BytesUsed === 0 && !usage.lastUpdated) {
      const reconciled = await reconcileSiteUsage(env, siteId);
      if (reconciled) {
        usage = { d1BytesUsed: reconciled.d1BytesUsed, r2BytesUsed: reconciled.r2BytesUsed, lastUpdated: new Date().toISOString() };
      }
    }

    const planKey = getSitePlan(site);
    const limits = PLAN_LIMITS[planKey] || PLAN_LIMITS.free;

    const d1OverageBytes = Math.max(0, usage.d1BytesUsed - limits.d1Bytes);
    const r2OverageBytes = Math.max(0, usage.r2BytesUsed - limits.r2Bytes);
    const d1OverageGB = d1OverageBytes / (1024 * 1024 * 1024);
    const r2OverageGB = r2OverageBytes / (1024 * 1024 * 1024);

    let overageCostINR = 0;
    if (limits.allowOverage) {
      overageCostINR = (d1OverageGB * OVERAGE_RATES.d1PerGB) + (r2OverageGB * OVERAGE_RATES.r2PerGB);
    }

    return successResponse({
      plan: planKey,
      d1: {
        used: usage.d1BytesUsed,
        limit: limits.d1Bytes,
        percentage: limits.d1Bytes > 0 ? Math.min(100, (usage.d1BytesUsed / limits.d1Bytes) * 100) : 0,
        overageBytes: d1OverageBytes,
      },
      r2: {
        used: usage.r2BytesUsed,
        limit: limits.r2Bytes,
        percentage: limits.r2Bytes > 0 ? Math.min(100, (usage.r2BytesUsed / limits.r2Bytes) * 100) : 0,
        overageBytes: r2OverageBytes,
      },
      allowOverage: limits.allowOverage,
      overageCostINR: Math.round(overageCostINR * 100) / 100,
      overageRates: OVERAGE_RATES,
      lastUpdated: usage.lastUpdated,
    });
  } catch (error) {
    console.error('Usage API error:', error);
    return errorResponse('Failed to fetch usage data', 500);
  }
}
