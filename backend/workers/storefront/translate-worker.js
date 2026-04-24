import { errorResponse, successResponse, handleCORS } from '../../utils/helpers.js';
import { validateSiteAdmin } from './site-admin-worker.js';
import { resolveSiteDBById, ensureTranslationCacheTable } from '../../utils/site-db.js';
import { translateContentBatch } from '../../utils/server-translator.js';

// Re-emit a successResponse with `X-Translator-Capped: 1` so clients
// can detect cap behavior from a header alone (in addition to the
// `capped:true` flag in the body).
function withCappedHeader(res) {
  return new Response(res.body, {
    status: res.status,
    headers: { ...Object.fromEntries(res.headers), 'X-Translator-Capped': '1' },
  });
}

// Hard per-request ceiling for the public /translate proxy. Tighter than the
// internal server-translator caps (1000 / 200_000) because this endpoint is
// publicly callable by shoppers and we want to prevent a single request from
// shoving a megabyte of text through Microsoft.
const MAX_TEXTS_PER_REQUEST = 200;
const MAX_CHARS_PER_REQUEST = 50_000;

function ymUTC(d = new Date()) {
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${d.getUTCFullYear()}-${m}`;
}
function ymdUTC(d = new Date()) {
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${d.getUTCFullYear()}-${m}-${day}`;
}

/**
 * POST /api/storefront/:siteId/translate
 * Body: { texts: string[], target: string }
 * Returns: { success, data: { translations, cacheHits, cacheMisses, charsBilled, capped } }
 *
 * Public endpoint — no auth needed. Anti-abuse via:
 *   - per-site daily char cap (returns originals + capped:true past the cap)
 *   - per-request size cap (rejects oversize payloads)
 *   - merchant must have explicitly enabled the feature with their own key
 *   - target must be in the merchant's allow-list
 */
export async function handleTranslateProxy(request, env, path, ctx) {
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405);

  const parts = path.split('/').filter(Boolean);
  // Expected: ['api', 'storefront', '<siteId>', 'translate']
  const siteId = parts[2];
  const action = parts[3];
  if (!siteId || action !== 'translate') return errorResponse('Not found', 404);

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return errorResponse('Invalid JSON body', 400);
  }

  const texts = Array.isArray(body?.texts) ? body.texts.filter((t) => typeof t === 'string' && t.length > 0) : [];
  const target = typeof body?.target === 'string' ? body.target.trim() : '';
  if (!target) return errorResponse('target is required', 400);
  if (texts.length === 0) return successResponse({ translations: [], cacheHits: 0, cacheMisses: 0, charsBilled: 0, capped: false });
  if (texts.length > MAX_TEXTS_PER_REQUEST) {
    return errorResponse(`Too many texts in one request (max ${MAX_TEXTS_PER_REQUEST}).`, 413);
  }
  const totalChars = texts.reduce((n, t) => n + t.length, 0);
  if (totalChars > MAX_CHARS_PER_REQUEST) {
    return errorResponse(`Request too large (max ${MAX_CHARS_PER_REQUEST} chars).`, 413);
  }

  // All heavy lifting (cache lookup, MS API call, daily cap, usage bump,
  // graceful degradation, key decrypt) lives in `translateContentBatch` —
  // shared with server-composed payloads (handleProducts/handleSiteInfo/etc).
  const result = await translateContentBatch(env, siteId, texts, target);

  // Map server-translator's structured errors back onto the public proxy's
  // legacy error contract so existing storefront clients keep working.
  if (result.error === 'site_not_found') {
    return errorResponse('Site not found', 404);
  }
  if (result.error === 'translator_disabled') {
    return errorResponse('Shopper translation is not enabled for this site.', 400, 'TRANSLATOR_DISABLED');
  }
  if (result.error === 'target_not_allowed') {
    return errorResponse('Target language is not enabled for this site.', 400, 'TARGET_NOT_ALLOWED');
  }
  if (result.error === 'site_db_unavailable') {
    return errorResponse('Site DB unavailable', 500);
  }

  const payload = {
    translations: result.translations,
    cacheHits: result.cacheHits,
    cacheMisses: result.cacheMisses,
    charsBilled: result.charsBilled,
    capped: !!result.capped,
  };
  if (result.error === 'translator_error') {
    payload.error = 'translator_error';
  }

  const res = successResponse(payload);
  return result.capped ? withCappedHeader(res) : res;
}

/**
 * POST /api/storefront/:siteId/translate/purge
 * Body (optional): { scope?: 'site' | 'lang', target?: string }
 * Auth: SiteAdmin token (owner only).
 *
 * Purges cached translations from the per-site `translation_cache` table.
 * Use cases:
 *   - merchant fixed a typo in a product description and the cache is
 *     stale (rare — content-addressed cache usually invalidates itself
 *     on edit, but bulk-imported content can confuse hashing)
 *   - merchant rotated their MS key and wants old translations re-done
 *   - QA / testing wants to force a fresh round-trip
 *
 * Response includes `X-Translator-Cache-Purged: 1` so the storefront
 * client can also wipe its sessionStorage layer on the next request.
 */
export async function handleTranslateCachePurge(request, env, path, ctx) {
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405);

  const parts = path.split('/').filter(Boolean);
  // Expected: ['api', 'storefront', '<siteId>', 'translate', 'purge']
  const siteId = parts[2];
  if (!siteId) return errorResponse('Site ID required', 400);

  const auth = await validateSiteAdmin(request, env, siteId);
  if (!auth) return errorResponse('Unauthorized', 401);
  if (!auth.isOwner) return errorResponse('Owner-only action', 403);

  let body = {};
  try { body = await request.json(); } catch (e) { /* allow empty body */ }
  const scope = body?.scope === 'lang' ? 'lang' : 'site';
  const target = typeof body?.target === 'string' ? body.target.trim() : '';
  if (scope === 'lang' && !target) {
    return errorResponse('target language required when scope=lang', 400);
  }

  let siteDB;
  try {
    siteDB = await resolveSiteDBById(env, siteId);
  } catch (e) {
    return errorResponse('Site DB unavailable', 500);
  }
  await ensureTranslationCacheTable(siteDB, siteId);

  let deleted = 0;
  try {
    if (scope === 'lang') {
      const res = await siteDB.prepare(
        'DELETE FROM translation_cache WHERE site_id = ? AND target_lang = ?'
      ).bind(siteId, target).run();
      deleted = Number(res?.meta?.changes || res?.changes || 0);
    } else {
      const res = await siteDB.prepare(
        'DELETE FROM translation_cache WHERE site_id = ?'
      ).bind(siteId).run();
      deleted = Number(res?.meta?.changes || res?.changes || 0);
    }
  } catch (e) {
    console.error('translate-purge failed:', e.message || e);
    return errorResponse('Failed to purge cache', 500);
  }

  const res = successResponse({ ok: true, scope, target: target || null, deleted });
  return new Response(res.body, {
    status: res.status,
    headers: { ...Object.fromEntries(res.headers), 'X-Translator-Cache-Purged': '1' },
  });
}

/**
 * Helper for the merchant settings UI: returns this month's character
 * usage so we can show "this month: N characters translated."
 */
export async function getSiteTranslatorUsage(env, siteId) {
  const monthKey = ymUTC();
  const dayKey = ymdUTC();
  const dailyCap = Number(env.TRANSLATOR_DAILY_CAP || DEFAULT_DAILY_CHAR_CAP) || DEFAULT_DAILY_CHAR_CAP;
  let monthChars = 0, dayChars = 0;
  try {
    // We only write per-day rows ('YYYY-MM-DD') — derive the monthly total
    // by summing this month's day-buckets. Any legacy monthly rows
    // ('YYYY-MM' exactly) are ignored to avoid double-counting from the
    // earlier dual-write implementation.
    const monthRow = await env.DB.prepare(
      `SELECT COALESCE(SUM(char_count), 0) AS total FROM site_translator_usage
        WHERE site_id = ? AND year_month LIKE ?`
    ).bind(siteId, `${monthKey}-%`).first();
    monthChars = Number(monthRow?.total || 0);
    const dayRow = await env.DB.prepare(
      'SELECT char_count FROM site_translator_usage WHERE site_id = ? AND year_month = ?'
    ).bind(siteId, dayKey).first();
    dayChars = Number(dayRow?.char_count || 0);
  } catch (e) {
    // If the table is missing, db-init will create it on the next worker
    // boot — return zeroes so the UI still renders.
  }
  return { month: monthKey, monthChars, day: dayKey, dayChars, dailyCap };
}
