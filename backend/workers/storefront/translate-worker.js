import { errorResponse, successResponse, handleCORS, generateId } from '../../utils/helpers.js';
import { resolveSiteDBById, ensureTranslationCacheTable } from '../../utils/site-db.js';
import { decryptSecret } from '../../utils/crypto.js';
import { translateBatchWithCreds } from '../../utils/translator.js';

// Daily per-site character budget for shopper-driven translations. Keeps
// a runaway shopper or scraper from torching a merchant's free quota in
// one sitting. Configurable per-site by setting TRANSLATOR_DAILY_CAP env
// (string number); falls back to 100k.
const DEFAULT_DAILY_CHAR_CAP = 100_000;
// Hard ceiling on a single proxy request to prevent any one call from
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

async function sha256Hex(text) {
  const data = new TextEncoder().encode(String(text ?? ''));
  const buf = await crypto.subtle.digest('SHA-256', data);
  const arr = Array.from(new Uint8Array(buf));
  return arr.map((b) => b.toString(16).padStart(2, '0')).join('');
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

  // Load merchant translator config. Site row holds the encrypted key + the
  // allow-list; we never trust the client to tell us what target is allowed.
  const site = await env.DB.prepare(
    `SELECT id, content_language, translator_enabled, translator_region,
            translator_languages, translator_api_key_encrypted
     FROM sites WHERE id = ? AND is_active = 1`
  ).bind(siteId).first();
  if (!site) return errorResponse('Site not found', 404);

  if (!site.translator_enabled || !site.translator_api_key_encrypted) {
    return errorResponse('Shopper translation is not enabled for this site.', 400, 'TRANSLATOR_DISABLED');
  }

  // We always send `from=auto` to Microsoft and key the cache with
  // source_lang='auto'. This handles mixed-language merchant content
  // (e.g. an English store with a few Hindi product names) without
  // mistranslating, and it keeps the cache key stable across sites.
  const sourceLang = 'auto';
  const contentLang = site.content_language || 'en';

  // No-op when the shopper already picked the merchant's content
  // language — return originals at zero cost.
  if (target === contentLang) {
    return successResponse({ translations: texts, cacheHits: texts.length, cacheMisses: 0, charsBilled: 0, capped: false });
  }

  let allowed = [];
  try {
    allowed = site.translator_languages ? JSON.parse(site.translator_languages) : [];
  } catch (e) { allowed = []; }
  if (!Array.isArray(allowed) || !allowed.includes(target)) {
    return errorResponse('Target language is not enabled for this site.', 400, 'TARGET_NOT_ALLOWED');
  }

  // Daily cap check (uses today's UTC bucket from site_translator_usage's
  // year_month rollup is too coarse for daily — we keep a separate daily
  // counter via the year_month + day key concat). For simplicity we model
  // "today" as a year_month = 'YYYY-MM-DD' row and the monthly counter as
  // 'YYYY-MM'. Both rows live in the same table.
  const dailyKey = ymdUTC();
  const monthKey = ymUTC();
  const dailyCap = Number(env.TRANSLATOR_DAILY_CAP || DEFAULT_DAILY_CHAR_CAP) || DEFAULT_DAILY_CHAR_CAP;

  let dailyUsed = 0;
  try {
    const row = await env.DB.prepare(
      'SELECT char_count FROM site_translator_usage WHERE site_id = ? AND year_month = ?'
    ).bind(siteId, dailyKey).first();
    dailyUsed = Number(row?.char_count || 0);
  } catch (e) {
    // If the platform table is missing, db-init will create it on next boot.
    console.error('translate-proxy daily-usage lookup failed:', e.message || e);
  }

  if (dailyUsed >= dailyCap) {
    // Past the cap: degrade gracefully — never crash the storefront.
    // `capped:true` in the body is the contract the storefront reads.
    return successResponse({ translations: texts, cacheHits: 0, cacheMisses: 0, charsBilled: 0, capped: true });
  }

  // Cache lookup per text.
  let siteDB;
  try {
    siteDB = await resolveSiteDBById(env, siteId);
  } catch (e) {
    console.error('translate-proxy resolveSiteDB failed:', e.message || e);
    return errorResponse('Site DB unavailable', 500);
  }
  await ensureTranslationCacheTable(siteDB, siteId);

  const hashes = await Promise.all(texts.map(sha256Hex));
  const out = new Array(texts.length).fill(null);
  let cacheHits = 0;

  // Bulk-fetch cached rows. SQLite has a 100-param limit on IN(...) by
  // default, but D1 raises this; we still batch to be safe.
  const lookupBatchSize = 50;
  for (let start = 0; start < hashes.length; start += lookupBatchSize) {
    const slice = hashes.slice(start, start + lookupBatchSize);
    const placeholders = slice.map(() => '?').join(',');
    try {
      const res = await siteDB.prepare(
        `SELECT text_hash, translated_text FROM translation_cache
         WHERE site_id = ? AND source_lang = ? AND target_lang = ?
           AND text_hash IN (${placeholders})`
      ).bind(siteId, sourceLang, target, ...slice).all();
      const rows = res.results || [];
      const map = new Map();
      for (const r of rows) map.set(r.text_hash, r.translated_text);
      for (let i = 0; i < slice.length; i++) {
        const idx = start + i;
        if (map.has(slice[i])) {
          out[idx] = map.get(slice[i]);
          cacheHits += 1;
        }
      }
    } catch (e) {
      console.error('translate-proxy cache lookup failed:', e.message || e);
    }
  }

  // Identify cache misses to send to Microsoft.
  const missIdxs = [];
  const missTexts = [];
  for (let i = 0; i < out.length; i++) {
    if (out[i] === null) { missIdxs.push(i); missTexts.push(texts[i]); }
  }

  let charsBilled = 0;
  if (missTexts.length > 0) {
    // Enforce the cap on the *miss* portion so a half-served request still
    // saves what it can. If the miss exceeds remaining budget, translate
    // only the prefix that fits and return originals for the rest.
    const remaining = Math.max(0, dailyCap - dailyUsed);
    const sliceForApi = [];
    let acc = 0;
    let cutoff = missTexts.length;
    for (let i = 0; i < missTexts.length; i++) {
      const cost = missTexts[i].length;
      if (acc + cost > remaining) { cutoff = i; break; }
      acc += cost;
      sliceForApi.push(missTexts[i]);
    }

    if (sliceForApi.length === 0) {
      // No budget at all → return originals for misses, mark capped.
      for (const i of missIdxs) if (out[i] === null) out[i] = texts[i];
      return successResponse({ translations: out, cacheHits, cacheMisses: missTexts.length, charsBilled: 0, capped: true });
    }

    let apiKey;
    try {
      apiKey = await decryptSecret(env, site.translator_api_key_encrypted);
    } catch (e) {
      console.error('translate-proxy decrypt failed (misconfigured key):', e.message || e);
      // Don't crash the storefront — return originals.
      for (const i of missIdxs) if (out[i] === null) out[i] = texts[i];
      return successResponse({ translations: out, cacheHits, cacheMisses: missTexts.length, charsBilled: 0, capped: false });
    }

    let translated;
    try {
      translated = await translateBatchWithCreds(sliceForApi, target, sourceLang, {
        apiKey,
        region: site.translator_region || null,
      });
    } catch (e) {
      // Microsoft rejected — log a sanitized error (NEVER the key) and
      // gracefully fall back to originals. The storefront keeps working.
      console.error('translate-proxy MS error:', String(e?.message || e).slice(0, 300));
      for (const i of missIdxs) if (out[i] === null) out[i] = texts[i];
      return successResponse({ translations: out, cacheHits, cacheMisses: missTexts.length, charsBilled: 0, capped: false, error: 'translator_error' });
    }
    // Don't keep the decrypted key in scope any longer than necessary.
    apiKey = null;

    // Stitch translations back into out[] and persist new cache rows.
    const insertStmts = [];
    for (let i = 0; i < sliceForApi.length; i++) {
      const idx = missIdxs[i];
      const text = sliceForApi[i];
      const xlated = translated[i] ?? text;
      out[idx] = xlated;
      charsBilled += text.length;
      insertStmts.push(
        siteDB.prepare(
          `INSERT INTO translation_cache (id, site_id, text_hash, source_lang, target_lang, translated_text, char_count, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT(site_id, text_hash, source_lang, target_lang) DO NOTHING`
        ).bind(generateId(), siteId, hashes[idx], sourceLang, target, xlated, text.length)
      );
    }
    // Misses past the daily cap: return originals.
    let cappedThisCall = false;
    if (cutoff < missTexts.length) {
      cappedThisCall = true;
      for (let i = cutoff; i < missTexts.length; i++) {
        const idx = missIdxs[i];
        // `i` is an index into the miss-only arrays, so map back to the
        // original `texts[]` slot via missIdxs[i] before falling back.
        if (out[idx] === null) out[idx] = texts[idx];
      }
    }

    if (insertStmts.length > 0) {
      try {
        await siteDB.batch(insertStmts);
      } catch (e) {
        console.error('translate-proxy cache insert failed:', e.message || e);
      }
    }

    // Bump per-site usage. We store ONLY per-day rows ('YYYY-MM-DD'); the
    // monthly figure is derived by summing the day-rows of the current
    // month in getSiteTranslatorUsage. This avoids the previous double-
    // counting where both daily and monthly buckets recorded the same
    // characters.
    if (charsBilled > 0) {
      try {
        await env.DB.prepare(
          `INSERT INTO site_translator_usage (site_id, year_month, char_count, request_count, last_updated)
           VALUES (?, ?, ?, 1, datetime('now'))
           ON CONFLICT(site_id, year_month) DO UPDATE SET
             char_count = char_count + excluded.char_count,
             request_count = request_count + 1,
             last_updated = datetime('now')`
        ).bind(siteId, dailyKey, charsBilled).run();
      } catch (e) {
        console.error('translate-proxy usage upsert failed:', e.message || e);
      }
    }

    return successResponse({
      translations: out,
      cacheHits,
      cacheMisses: missTexts.length,
      charsBilled,
      capped: cappedThisCall,
    });
  }

  // All cache hits.
  return successResponse({ translations: out, cacheHits, cacheMisses: 0, charsBilled: 0, capped: false });
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
