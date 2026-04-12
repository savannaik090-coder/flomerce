import { jsonResponse, errorResponse, successResponse, handleCORS } from './helpers.js';
import { validateAuth } from './auth.js';

const PLAN_LIMITS = {
  starter: {
    d1Bytes: 500 * 1024 * 1024, r2Bytes: 5 * 1024 * 1024 * 1024, allowOverage: false,
    maxSites: Infinity, maxStaff: 5, maxLocations: 2,
    coupons: true, reviews: false, blog: false,
    pushManual: false, pushAutomated: false,
    advancedSeo: false, revenue: false,
  },
  growth: {
    d1Bytes: 1 * 1024 * 1024 * 1024, r2Bytes: 50 * 1024 * 1024 * 1024, allowOverage: false,
    maxSites: Infinity, maxStaff: 25, maxLocations: 50,
    coupons: true, reviews: true, blog: true,
    pushManual: true, pushAutomated: false,
    advancedSeo: true, revenue: true,
  },
  pro: {
    d1Bytes: 2 * 1024 * 1024 * 1024, r2Bytes: 100 * 1024 * 1024 * 1024, allowOverage: false,
    maxSites: Infinity, maxStaff: Infinity, maxLocations: Infinity,
    coupons: true, reviews: true, blog: true,
    pushManual: true, pushAutomated: true,
    advancedSeo: true, revenue: true,
  },
  enterprise: {
    d1Bytes: 2 * 1024 * 1024 * 1024, r2Bytes: 100 * 1024 * 1024 * 1024, allowOverage: false,
    maxSites: Infinity, maxStaff: Infinity, maxLocations: Infinity,
    coupons: true, reviews: true, blog: true,
    pushManual: true, pushAutomated: true,
    advancedSeo: true, revenue: true,
  },
  trial: {
    d1Bytes: 500 * 1024 * 1024, r2Bytes: 5 * 1024 * 1024 * 1024, allowOverage: false,
    maxSites: 5, maxStaff: Infinity, maxLocations: Infinity,
    coupons: true, reviews: true, blog: true,
    pushManual: true, pushAutomated: true,
    advancedSeo: true, revenue: true,
  },
  free: {
    d1Bytes: 500 * 1024 * 1024, r2Bytes: 5 * 1024 * 1024 * 1024, allowOverage: false,
    maxSites: 0, maxStaff: 0, maxLocations: 0,
    coupons: false, reviews: false, blog: false,
    pushManual: false, pushAutomated: false,
    advancedSeo: false, revenue: false,
  },
};

const FEATURE_REQUIRED_PLAN = {
  reviews: 'growth',
  blog: 'growth',
  pushManual: 'growth',
  pushAutomated: 'pro',
  advancedSeo: 'growth',
  revenue: 'growth',
};

const DEFAULT_OVERAGE_RATES = {
  d1PerGB: 0.75,
  r2PerGB: 0.015,
};

async function getOverageRates(env) {
  try {
    const result = await env.DB.prepare(
      `SELECT setting_key, setting_value FROM platform_settings WHERE setting_key IN ('overage_rate_d1_per_gb', 'overage_rate_r2_per_gb')`
    ).all();
    const rates = { ...DEFAULT_OVERAGE_RATES };
    for (const row of (result.results || [])) {
      if (row.setting_key === 'overage_rate_d1_per_gb') {
        const v = parseFloat(row.setting_value);
        if (!isNaN(v) && v >= 0) rates.d1PerGB = v;
      }
      if (row.setting_key === 'overage_rate_r2_per_gb') {
        const v = parseFloat(row.setting_value);
        if (!isNaN(v) && v >= 0) rates.r2PerGB = v;
      }
    }
    return rates;
  } catch (e) {
    return { ...DEFAULT_OVERAGE_RATES };
  }
}

const ONE_MB = 1024 * 1024;

export function estimateRowBytes(data) {
  return Math.ceil(JSON.stringify(data).length * 1.2);
}

export async function trackD1Write(env, siteId, bytesAdded) {
  if (!siteId || !bytesAdded || bytesAdded <= 0) return;
  try {
    await env.DB.prepare(`
      INSERT INTO site_usage (site_id, d1_bytes_used, r2_bytes_used, baseline_bytes, last_updated)
      VALUES (?, ?, 0, 0, datetime('now'))
      ON CONFLICT(site_id) DO UPDATE SET
        d1_bytes_used = d1_bytes_used + ?,
        last_updated = datetime('now')
    `).bind(siteId, bytesAdded, bytesAdded).run();
  } catch (e) {
    console.error('trackD1Write error (non-fatal):', e.message || e);
  }
}

export async function trackD1Delete(env, siteId, bytesRemoved) {
  if (!siteId || !bytesRemoved || bytesRemoved <= 0) return;
  try {
    await env.DB.prepare(`
      INSERT INTO site_usage (site_id, d1_bytes_used, r2_bytes_used, baseline_bytes, last_updated)
      VALUES (?, 0, 0, 0, datetime('now'))
      ON CONFLICT(site_id) DO UPDATE SET
        d1_bytes_used = MAX(0, d1_bytes_used - ?),
        last_updated = datetime('now')
    `).bind(siteId, bytesRemoved).run();
  } catch (e) {
    console.error('trackD1Delete error (non-fatal):', e.message || e);
  }
}

export async function trackD1Update(env, siteId, oldBytes, newBytes) {
  if (!siteId) return;
  const delta = newBytes - oldBytes;
  if (delta === 0) return;
  try {
    await env.DB.prepare(`
      INSERT INTO site_usage (site_id, d1_bytes_used, r2_bytes_used, baseline_bytes, last_updated)
      VALUES (?, MAX(0, ?), 0, 0, datetime('now'))
      ON CONFLICT(site_id) DO UPDATE SET
        d1_bytes_used = MAX(0, d1_bytes_used + ?),
        last_updated = datetime('now')
    `).bind(siteId, Math.max(0, delta), delta).run();
  } catch (e) {
    console.error('trackD1Update error (non-fatal):', e.message || e);
  }
}

export async function trackD1Usage(env, siteId, byteDelta) {
  if (!siteId || byteDelta === 0) return;
  if (byteDelta > 0) {
    await trackD1Write(env, siteId, byteDelta);
  } else {
    await trackD1Delete(env, siteId, Math.abs(byteDelta));
  }
}

export async function trackR2Usage(env, siteId, byteDelta) {
  if (!siteId || byteDelta === 0) return;
  try {
    await env.DB.prepare(`
      INSERT INTO site_usage (site_id, d1_bytes_used, r2_bytes_used, baseline_bytes, last_updated)
      VALUES (?, 0, MAX(0, ?), 0, datetime('now'))
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

export async function getShardCorrectionFactor(env, siteId) {
  try {
    const result = await env.DB.prepare(
      `SELECT sh.correction_factor
       FROM sites s
       JOIN shards sh ON s.shard_id = sh.id
       WHERE s.id = ?`
    ).bind(siteId).first();
    return result?.correction_factor || 1.0;
  } catch (e) {
    return 1.0;
  }
}

export async function getSiteUsage(env, siteId) {
  try {
    const usage = await env.DB.prepare(
      'SELECT d1_bytes_used, r2_bytes_used, baseline_bytes, last_updated FROM site_usage WHERE site_id = ?'
    ).bind(siteId).first();

    const rawD1 = usage?.d1_bytes_used || 0;
    const baseline = usage?.baseline_bytes || 0;
    const r2BytesUsed = usage?.r2_bytes_used || 0;

    const correctionFactor = await getShardCorrectionFactor(env, siteId);

    const displayD1 = Math.ceil((baseline + rawD1) * correctionFactor);

    return {
      d1BytesUsed: displayD1,
      d1BytesRaw: rawD1,
      baselineBytes: baseline,
      correctionFactor,
      r2BytesUsed,
      lastUpdated: usage?.last_updated || new Date().toISOString(),
    };
  } catch (e) {
    console.error('getSiteUsage error:', e.message || e);
    return { d1BytesUsed: 0, d1BytesRaw: 0, baselineBytes: 0, correctionFactor: 1.0, r2BytesUsed: 0, lastUpdated: null };
  }
}

function getSitePlan(site) {
  const plan = (site.subscription_plan || 'free').toLowerCase();
  if (plan.includes('enterprise')) return 'enterprise';
  if (plan.includes('pro')) return 'pro';
  if (plan.includes('growth') || plan.includes('standard')) return 'growth';
  if (plan.includes('starter') || plan.includes('basic')) return 'starter';
  if (plan === 'trial') return 'trial';
  return 'free';
}

export function normalizePlanName(subscriptionPlan) {
  return getSitePlan({ subscription_plan: subscriptionPlan });
}

export function getPlanLimitsConfig(planKey) {
  return PLAN_LIMITS[planKey] || PLAN_LIMITS.free;
}

export async function resolveSitePlan(env, siteId) {
  try {
    const site = await env.DB.prepare(
      'SELECT subscription_plan FROM sites WHERE id = ?'
    ).bind(siteId).first();
    if (!site) return 'free';
    return getSitePlan(site);
  } catch (e) {
    return 'free';
  }
}

export async function checkFeatureAccess(env, siteId, featureName) {
  try {
    const planKey = await resolveSitePlan(env, siteId);
    const limits = PLAN_LIMITS[planKey] || PLAN_LIMITS.free;
    const allowed = !!limits[featureName];
    const requiredPlan = FEATURE_REQUIRED_PLAN[featureName] || null;
    return { allowed, planKey, requiredPlan };
  } catch (e) {
    console.error('checkFeatureAccess error (non-fatal):', e.message || e);
    return { allowed: true, planKey: 'unknown', requiredPlan: null };
  }
}

export async function checkCountLimit(env, siteId, limitType) {
  try {
    const planKey = await resolveSitePlan(env, siteId);
    const limits = PLAN_LIMITS[planKey] || PLAN_LIMITS.free;
    const maxAllowed = limits[limitType];
    if (maxAllowed === Infinity || maxAllowed === undefined) {
      return { allowed: true, limit: null, planKey };
    }
    let requiredPlan = null;
    if (limitType === 'maxStaff') requiredPlan = maxAllowed < 25 ? 'growth' : 'pro';
    if (limitType === 'maxLocations') requiredPlan = maxAllowed < 50 ? 'growth' : 'pro';
    return { allowed: true, limit: maxAllowed, planKey, requiredPlan };
  } catch (e) {
    console.error('checkCountLimit error (non-fatal):', e.message || e);
    return { allowed: true, limit: null, planKey: 'unknown', requiredPlan: null };
  }
}

export async function handlePlanLimitsAPI(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;

  if (request.method !== 'GET') return errorResponse('Method not allowed', 405);

  const url = new URL(request.url);
  const siteId = url.searchParams.get('siteId');
  if (!siteId) return errorResponse('siteId is required', 400);

  try {
    const site = await env.DB.prepare(
      'SELECT subscription_plan FROM sites WHERE id = ?'
    ).bind(siteId).first();
    if (!site) return errorResponse('Site not found', 404);

    const planKey = getSitePlan(site);
    const limits = PLAN_LIMITS[planKey] || PLAN_LIMITS.free;

    const safeLimit = (v) => v === Infinity ? -1 : v;

    return successResponse({
      plan: planKey,
      limits: {
        maxSites: safeLimit(limits.maxSites),
        maxStaff: safeLimit(limits.maxStaff),
        maxLocations: safeLimit(limits.maxLocations),
        coupons: limits.coupons,
        reviews: limits.reviews,
        blog: limits.blog,
        pushManual: limits.pushManual,
        pushAutomated: limits.pushAutomated,
        advancedSeo: limits.advancedSeo,
        revenue: limits.revenue,
      },
      featureRequiredPlan: FEATURE_REQUIRED_PLAN,
      storage: {
        d1Limit: limits.d1Bytes,
        r2Limit: limits.r2Bytes,
      },
    });
  } catch (error) {
    console.error('Plan limits API error:', error);
    return errorResponse('Failed to fetch plan limits', 500);
  }
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

    let isEnterpriseSite = false;
    try {
      const entCheck = await env.DB.prepare('SELECT site_id FROM enterprise_sites WHERE site_id = ?').bind(siteId).first();
      isEnterpriseSite = !!entCheck;
    } catch (_) {}

    if (isEnterpriseSite) {
      const overageBytes = Math.max(0, newTotal - limitBytes);
      const overageGB = overageBytes / (1024 * 1024 * 1024);
      const rates = await getOverageRates(env);
      const rate = resourceType === 'd1' ? rates.d1PerGB : rates.r2PerGB;
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

export async function reconcileShard(env, shardId) {
  try {
    const shard = await env.DB.prepare(
      'SELECT id, database_id, binding_name FROM shards WHERE id = ?'
    ).bind(shardId).first();

    if (!shard) return null;

    const { getDatabaseSize } = await import('./d1-manager.js');
    const actualSize = await getDatabaseSize(env, shard.database_id);

    const sitesResult = await env.DB.prepare(
      'SELECT site_id, d1_bytes_used, baseline_bytes FROM site_usage WHERE site_id IN (SELECT id FROM sites WHERE shard_id = ?)'
    ).bind(shardId).all();

    let totalEstimated = 0;
    for (const s of (sitesResult.results || [])) {
      totalEstimated += (s.d1_bytes_used || 0) + (s.baseline_bytes || 0);
    }

    let correctionFactor = 1.0;
    if (totalEstimated >= ONE_MB) {
      correctionFactor = actualSize / totalEstimated;
      correctionFactor = Math.min(Math.max(correctionFactor, 0.8), 1.5);
    }

    await env.DB.prepare(
      `UPDATE shards SET correction_factor = ?, last_reconciled_at = datetime('now') WHERE id = ?`
    ).bind(correctionFactor, shardId).run();

    return {
      shardId,
      actualSizeBytes: actualSize,
      totalEstimatedBytes: totalEstimated,
      correctionFactor,
      siteCount: (sitesResult.results || []).length,
    };
  } catch (e) {
    console.error('reconcileShard error:', e.message || e);
    return null;
  }
}

export async function handleUsageAPI(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;

  const user = await validateAuth(request, env);
  if (!user) {
    return errorResponse('Unauthorized', 401);
  }

  const url = new URL(request.url);
  const siteId = url.searchParams.get('siteId');

  if (!siteId) {
    return errorResponse('siteId is required', 400);
  }

  if (request.method === 'POST') {
    const action = url.searchParams.get('action');
    if (action === 'reconcile') {
      return handleReconcile(env, user, siteId);
    }
    return handleOverageToggle(request, env, user, siteId);
  }

  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const site = await env.DB.prepare(
      'SELECT id, subscription_plan FROM sites WHERE id = ? AND user_id = ?'
    ).bind(siteId, user.id).first();

    if (!site) {
      return errorResponse('Site not found or unauthorized', 404);
    }

    const usage = await getSiteUsage(env, siteId);

    if (usage.r2BytesUsed === 0) {
      try {
        const mediaTotal = await env.DB.prepare(
          'SELECT SUM(size_bytes) as total FROM site_media WHERE site_id = ?'
        ).bind(siteId).first();
        const r2FromMedia = mediaTotal?.total || 0;
        if (r2FromMedia > 0) {
          await env.DB.prepare(`
            INSERT INTO site_usage (site_id, d1_bytes_used, r2_bytes_used, baseline_bytes, last_updated)
            VALUES (?, 0, ?, 0, datetime('now'))
            ON CONFLICT(site_id) DO UPDATE SET
              r2_bytes_used = ?,
              last_updated = datetime('now')
          `).bind(siteId, r2FromMedia, r2FromMedia).run();
          usage.r2BytesUsed = r2FromMedia;
        }
      } catch (_) {}
    }

    const planKey = getSitePlan(site);
    const limits = PLAN_LIMITS[planKey] || PLAN_LIMITS.free;

    const d1OverageBytes = Math.max(0, usage.d1BytesUsed - limits.d1Bytes);
    const r2OverageBytes = Math.max(0, usage.r2BytesUsed - limits.r2Bytes);
    const d1OverageGB = d1OverageBytes / (1024 * 1024 * 1024);
    const r2OverageGB = r2OverageBytes / (1024 * 1024 * 1024);

    const rates = await getOverageRates(env);

    let isEnterprise = false;
    let enterpriseInvoices = [];
    try {
      const entCheck = await env.DB.prepare('SELECT site_id FROM enterprise_sites WHERE site_id = ?').bind(siteId).first();
      isEnterprise = !!entCheck;
      if (isEnterprise) {
        const invResult = await env.DB.prepare(
          'SELECT year_month, d1_overage_bytes, r2_overage_bytes, d1_cost_inr, r2_cost_inr, total_cost_inr, status, paid_at, snapshot_at FROM enterprise_usage_monthly WHERE site_id = ? ORDER BY year_month DESC LIMIT 12'
        ).bind(siteId).all();
        enterpriseInvoices = invResult.results || [];
      }
    } catch (_) {}

    let overageCostINR = 0;
    let d1CostINR = 0;
    let r2CostINR = 0;
    if (isEnterprise) {
      d1CostINR = d1OverageGB * rates.d1PerGB;
      r2CostINR = r2OverageGB * rates.r2PerGB;
      overageCostINR = d1CostINR + r2CostINR;
    }

    return successResponse({
      plan: planKey,
      isEnterprise,
      d1: {
        used: usage.d1BytesUsed,
        raw: usage.d1BytesRaw,
        baseline: usage.baselineBytes,
        correctionFactor: usage.correctionFactor,
        limit: limits.d1Bytes,
        percentage: limits.d1Bytes > 0 ? Math.min(100, (usage.d1BytesUsed / limits.d1Bytes) * 100) : 0,
        overageBytes: d1OverageBytes,
        overageCostINR: isEnterprise ? Math.round(d1CostINR * 100) / 100 : 0,
      },
      r2: {
        used: usage.r2BytesUsed,
        limit: limits.r2Bytes,
        percentage: limits.r2Bytes > 0 ? Math.min(100, (usage.r2BytesUsed / limits.r2Bytes) * 100) : 0,
        overageBytes: r2OverageBytes,
        overageCostINR: isEnterprise ? Math.round(r2CostINR * 100) / 100 : 0,
      },
      allowOverage: false,
      overageEnabled: false,
      overageCostINR: Math.round(overageCostINR * 100) / 100,
      overageRates: rates,
      enterpriseInvoices,
      lastUpdated: usage.lastUpdated,
    });
  } catch (error) {
    console.error('Usage API error:', error);
    return errorResponse('Failed to fetch usage data', 500);
  }
}

async function handleOverageToggle(request, env, user, siteId) {
  return errorResponse('Overage toggle is not available. Enterprise overage is managed by the platform admin.', 403);
}

async function handleReconcile(env, user, siteId) {
  try {
    const site = await env.DB.prepare(
      'SELECT id, shard_id FROM sites WHERE id = ? AND user_id = ?'
    ).bind(siteId, user.id).first();

    if (!site) {
      return errorResponse('Site not found or unauthorized', 404);
    }

    if (!site.shard_id) {
      return errorResponse('Site is not on a shard', 400);
    }

    const reconciled = await reconcileShard(env, site.shard_id);
    if (!reconciled) {
      return errorResponse('Failed to reconcile usage', 500);
    }

    const usage = await getSiteUsage(env, siteId);

    return successResponse({
      d1BytesUsed: usage.d1BytesUsed,
      r2BytesUsed: usage.r2BytesUsed,
      correctionFactor: reconciled.correctionFactor,
      shardActualSize: reconciled.actualSizeBytes,
    }, 'Usage reconciled successfully');
  } catch (error) {
    console.error('Reconcile error:', error);
    return errorResponse('Failed to reconcile usage', 500);
  }
}
