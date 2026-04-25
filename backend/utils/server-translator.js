import { translateBatchWithCreds } from './translator.js';
import { resolveSiteDBById, ensureTranslationCacheTable } from './site-db.js';
import { decryptSecret } from './crypto.js';
import { generateId } from './helpers.js';

// Aligned with backend/workers/storefront/translate-worker.js so the same
// env.TRANSLATOR_DAILY_CAP override applies uniformly to every translation
// path (legacy /translate proxy AND the new server-composed payloads).
const DEFAULT_DAILY_CHAR_CAP = 100_000;
// Internal-use limits, intentionally higher than the user-facing /translate
// proxy (200 / 50_000) because server-composed payloads can pack many
// products' fields into a single batch (10 products × ~8 translatable fields
// × ~2 option values each can easily exceed 200 strings).
const MAX_TEXTS_PER_CALL = 1000;
const MAX_CHARS_PER_CALL = 200_000;
const LOOKUP_BATCH_SIZE = 50;

function ymdUTC(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(String(text));
  const buf = await crypto.subtle.digest('SHA-256', data);
  const arr = Array.from(new Uint8Array(buf));
  return arr.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Server-side translation helper for composing translated payloads inside
 * any storefront Worker endpoint. Mirrors the translate-worker semantics:
 *   - looks up shard `translation_cache` first (DB cache hit = free)
 *   - on miss, calls Microsoft with the merchant's credentials
 *   - persists new rows back to `translation_cache`
 *   - bumps `site_translator_usage` daily counter
 *   - enforces the daily char cap; past the cap returns originals
 *   - graceful degradation on every error path (NEVER throws to caller)
 *
 * Differs from the standalone /translate proxy in that it:
 *   - takes pre-loaded site row + db handle (no extra DB hops per request)
 *   - returns originals when target == content_language (no-op)
 *   - returns originals when translator disabled / not allowed
 *
 * Returns: {
 *   translations: string[],   // same length and order as input texts
 *   capped: boolean,          // hit the daily cap mid-request
 *   error: string|null,       // 'translator_disabled' | 'target_not_allowed' | 'translator_error' | null
 *   cacheHits: number,
 *   cacheMisses: number,
 *   charsBilled: number,
 * }
 *
 * Callers should treat `translations` as authoritative regardless of error.
 * Originals are always returned in error paths so the storefront keeps working.
 */
export async function translateContentBatch(env, siteId, texts, target, options = {}) {
  // options.bypassDailyCap: skip the per-site daily char ceiling. Used by
  // the pre-translated chrome/defaults bundle endpoint, which must be
  // able to warm a fresh language on cold cache without eating the
  // merchant's product-translation budget for the day. The bundle is
  // strictly bounded (~442 strings × allowed-langs, all permanently
  // D1-cached after one warm) so this is safe.
  const { bypassDailyCap = false } = options;
  const safeTexts = Array.isArray(texts)
    ? texts.map((t) => (typeof t === 'string' ? t : ''))
    : [];

  if (safeTexts.length === 0) {
    return { translations: [], capped: false, error: null, cacheHits: 0, cacheMisses: 0, charsBilled: 0 };
  }
  if (!siteId || !target || typeof target !== 'string') {
    return { translations: safeTexts, capped: false, error: 'invalid_args', cacheHits: 0, cacheMisses: 0, charsBilled: 0 };
  }

  const cleanTarget = target.trim();
  if (!cleanTarget) {
    return { translations: safeTexts, capped: false, error: 'invalid_args', cacheHits: 0, cacheMisses: 0, charsBilled: 0 };
  }

  const site = await env.DB.prepare(
    `SELECT id, content_language, translator_enabled, translator_region,
            translator_languages, translator_api_key_encrypted
     FROM sites WHERE id = ? AND is_active = 1`
  ).bind(siteId).first().catch(() => null);

  if (!site) {
    return { translations: safeTexts, capped: false, error: 'site_not_found', cacheHits: 0, cacheMisses: 0, charsBilled: 0 };
  }

  const contentLang = site.content_language || 'en';
  if (cleanTarget === contentLang) {
    return { translations: safeTexts, capped: false, error: null, cacheHits: safeTexts.length, cacheMisses: 0, charsBilled: 0 };
  }

  if (!site.translator_enabled || !site.translator_api_key_encrypted) {
    return { translations: safeTexts, capped: false, error: 'translator_disabled', cacheHits: 0, cacheMisses: 0, charsBilled: 0 };
  }

  let allowed = [];
  try {
    allowed = site.translator_languages ? JSON.parse(site.translator_languages) : [];
  } catch (e) { allowed = []; }
  if (!Array.isArray(allowed) || !allowed.includes(cleanTarget)) {
    return { translations: safeTexts, capped: false, error: 'target_not_allowed', cacheHits: 0, cacheMisses: 0, charsBilled: 0 };
  }

  if (safeTexts.length > MAX_TEXTS_PER_CALL) {
    return { translations: safeTexts, capped: false, error: 'too_many_texts', cacheHits: 0, cacheMisses: 0, charsBilled: 0 };
  }
  const totalChars = safeTexts.reduce((n, t) => n + t.length, 0);
  if (totalChars > MAX_CHARS_PER_CALL) {
    return { translations: safeTexts, capped: false, error: 'request_too_large', cacheHits: 0, cacheMisses: 0, charsBilled: 0 };
  }

  const sourceLang = 'auto';

  const dailyKey = ymdUTC();
  const dailyCap = Number(env.TRANSLATOR_DAILY_CAP || DEFAULT_DAILY_CHAR_CAP) || DEFAULT_DAILY_CHAR_CAP;
  let dailyUsed = 0;
  try {
    const row = await env.DB.prepare(
      'SELECT char_count FROM site_translator_usage WHERE site_id = ? AND year_month = ?'
    ).bind(siteId, dailyKey).first();
    dailyUsed = Number(row?.char_count || 0);
  } catch (e) {
    console.error('[server-translator] daily-usage lookup failed:', e.message || e);
  }

  if (!bypassDailyCap && dailyUsed >= dailyCap) {
    return { translations: safeTexts, capped: true, error: null, cacheHits: 0, cacheMisses: safeTexts.length, charsBilled: 0 };
  }

  let siteDB;
  try {
    siteDB = await resolveSiteDBById(env, siteId);
  } catch (e) {
    console.error('[server-translator] resolveSiteDB failed:', e.message || e);
    return { translations: safeTexts, capped: false, error: 'site_db_unavailable', cacheHits: 0, cacheMisses: 0, charsBilled: 0 };
  }
  await ensureTranslationCacheTable(siteDB, siteId);

  const hashes = await Promise.all(safeTexts.map(sha256Hex));
  const out = new Array(safeTexts.length).fill(null);
  let cacheHits = 0;

  for (let start = 0; start < hashes.length; start += LOOKUP_BATCH_SIZE) {
    const slice = hashes.slice(start, start + LOOKUP_BATCH_SIZE);
    const placeholders = slice.map(() => '?').join(',');
    try {
      const res = await siteDB.prepare(
        `SELECT text_hash, translated_text FROM translation_cache
         WHERE site_id = ? AND source_lang = ? AND target_lang = ?
           AND text_hash IN (${placeholders})`
      ).bind(siteId, sourceLang, cleanTarget, ...slice).all();
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
      console.error('[server-translator] cache lookup failed:', e.message || e);
    }
  }

  const missIdxs = [];
  const missTexts = [];
  for (let i = 0; i < out.length; i++) {
    if (out[i] === null) { missIdxs.push(i); missTexts.push(safeTexts[i]); }
  }

  let charsBilled = 0;
  let capped = false;

  if (missTexts.length === 0) {
    return { translations: out, capped: false, error: null, cacheHits, cacheMisses: 0, charsBilled: 0 };
  }

  const remaining = bypassDailyCap ? Infinity : Math.max(0, dailyCap - dailyUsed);
  const sliceForApi = [];
  let acc = 0;
  let cutoff = missTexts.length;
  for (let i = 0; i < missTexts.length; i++) {
    const cost = missTexts[i].length;
    if (acc + cost > remaining) { cutoff = i; capped = true; break; }
    acc += cost;
    sliceForApi.push(missTexts[i]);
  }

  if (sliceForApi.length === 0) {
    for (const i of missIdxs) if (out[i] === null) out[i] = safeTexts[i];
    return { translations: out, capped: true, error: null, cacheHits, cacheMisses: missTexts.length, charsBilled: 0 };
  }

  let apiKey;
  try {
    apiKey = await decryptSecret(env, site.translator_api_key_encrypted);
  } catch (e) {
    console.error('[server-translator] decrypt failed:', e.message || e);
    for (const i of missIdxs) if (out[i] === null) out[i] = safeTexts[i];
    return { translations: out, capped: false, error: 'translator_error', cacheHits, cacheMisses: missTexts.length, charsBilled: 0 };
  }

  let translated;
  try {
    translated = await translateBatchWithCreds(sliceForApi, cleanTarget, sourceLang, {
      apiKey,
      region: site.translator_region || null,
    });
  } catch (e) {
    console.error('[server-translator] MS error:', String(e?.message || e).slice(0, 300));
    for (const i of missIdxs) if (out[i] === null) out[i] = safeTexts[i];
    return { translations: out, capped: false, error: 'translator_error', cacheHits, cacheMisses: missTexts.length, charsBilled: 0 };
  } finally {
    apiKey = null;
  }

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
      ).bind(generateId(), siteId, hashes[idx], sourceLang, cleanTarget, xlated, text.length)
    );
  }

  if (cutoff < missTexts.length) {
    capped = true;
    for (let i = cutoff; i < missTexts.length; i++) {
      const idx = missIdxs[i];
      if (out[idx] === null) out[idx] = safeTexts[idx];
    }
  }

  if (insertStmts.length > 0) {
    try {
      await siteDB.batch(insertStmts);
    } catch (e) {
      console.error('[server-translator] cache insert failed:', e.message || e);
    }
  }

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
      console.error('[server-translator] usage bump failed:', e.message || e);
    }
  }

  for (let i = 0; i < out.length; i++) {
    if (out[i] === null) out[i] = safeTexts[i];
  }

  return { translations: out, capped, error: null, cacheHits, cacheMisses: missTexts.length, charsBilled };
}

/**
 * Convenience: translate a flat object of {key: string} where every value is a
 * string to translate. Returns a new object with the same keys and translated
 * values. Useful for translating a single record's fields in one call.
 *
 * Example:
 *   const t = await translateFields(env, siteId, { name: p.name, desc: p.description }, 'hi');
 *   p.name = t.fields.name; p.description = t.fields.desc;
 */
export async function translateFields(env, siteId, fieldsObj, target) {
  const keys = Object.keys(fieldsObj || {});
  if (keys.length === 0) {
    return { fields: {}, capped: false, error: null, cacheHits: 0, cacheMisses: 0, charsBilled: 0 };
  }
  const texts = keys.map((k) => fieldsObj[k]);
  const result = await translateContentBatch(env, siteId, texts, target);
  const fields = {};
  for (let i = 0; i < keys.length; i++) {
    fields[keys[i]] = result.translations[i];
  }
  return {
    fields,
    capped: result.capped,
    error: result.error,
    cacheHits: result.cacheHits,
    cacheMisses: result.cacheMisses,
    charsBilled: result.charsBilled,
  };
}

/**
 * Verify a target language is enabled & allowed on a site without doing any
 * translation work. Returns { ok, contentLang, error }. Cheap fast-path
 * callers can use to skip server-translator entirely when target == content
 * language or translator is off.
 */
export async function isTargetSupported(env, siteId, target) {
  if (!siteId || !target) return { ok: false, contentLang: null, error: 'invalid_args' };
  const site = await env.DB.prepare(
    'SELECT content_language, translator_enabled, translator_languages FROM sites WHERE id = ? AND is_active = 1'
  ).bind(siteId).first().catch(() => null);
  if (!site) return { ok: false, contentLang: null, error: 'site_not_found' };
  const contentLang = site.content_language || 'en';
  if (target === contentLang) return { ok: false, contentLang, error: null };
  if (!site.translator_enabled) return { ok: false, contentLang, error: 'translator_disabled' };
  let allowed = [];
  try { allowed = site.translator_languages ? JSON.parse(site.translator_languages) : []; }
  catch (e) { allowed = []; }
  if (!Array.isArray(allowed) || !allowed.includes(target)) {
    return { ok: false, contentLang, error: 'target_not_allowed' };
  }
  return { ok: true, contentLang, error: null };
}
