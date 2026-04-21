import { handleCORS, successResponse, errorResponse, jsonResponse, corsHeaders } from '../../utils/helpers.js';
import { validateAuth } from '../../utils/auth.js';
import { isOwner } from './admin-worker.js';
import { translateCatalog } from '../../utils/translator.js';
import EN_CATALOG from '../../i18n-en.json';

const SUPPORTED_LOCALES = new Set([
  'en', 'hi', 'es', 'zh-CN', 'ar',
  // Long-tail allowlist of locales the platform will lazy-generate on demand.
  // Anything outside this set falls back to English to bound spend.
  'fr', 'de', 'pt', 'pt-BR', 'it', 'ja', 'ko', 'ru', 'tr', 'pl', 'nl', 'sv',
  'th', 'vi', 'id', 'ms', 'fil', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml',
  'pa', 'ur', 'fa', 'he', 'el', 'cs', 'da', 'fi', 'no', 'ro', 'hu', 'uk',
  'zh-TW', 'en-GB',
]);
const RATE_LIMIT_PER_DAY = 5;
const R2_PREFIX = 'locales/';

function r2Key(lang) {
  return `${R2_PREFIX}${lang}.json`;
}

function isValidLocale(lang) {
  return typeof lang === 'string' && /^[a-zA-Z]{2,3}(-[a-zA-Z]{2,4})?$/.test(lang) && lang.length <= 12;
}

async function readCachedLocale(env, lang) {
  if (!env.STORAGE) return null;
  try {
    const obj = await env.STORAGE.get(r2Key(lang));
    if (!obj) return null;
    const text = await obj.text();
    return { data: JSON.parse(text), uploaded: obj.uploaded, size: obj.size };
  } catch (e) {
    console.warn('[i18n] readCachedLocale error:', e.message || e);
    return null;
  }
}

async function writeCachedLocale(env, lang, data) {
  if (!env.STORAGE) throw new Error('R2 STORAGE binding missing');
  await env.STORAGE.put(r2Key(lang), JSON.stringify(data), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
  });
}

async function checkRateLimit(env, lang) {
  if (!env.DB) return { ok: true };
  try {
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS i18n_regen_log (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         lang TEXT NOT NULL,
         day TEXT NOT NULL,
         count INTEGER NOT NULL DEFAULT 0,
         updated_at INTEGER NOT NULL,
         UNIQUE(lang, day)
       )`
    ).run();
  } catch {}
  const day = new Date().toISOString().slice(0, 10);
  const row = await env.DB.prepare(
    `SELECT count FROM i18n_regen_log WHERE lang = ? AND day = ?`
  ).bind(lang, day).first();
  const used = Number(row?.count || 0);
  if (used >= RATE_LIMIT_PER_DAY) {
    return { ok: false, used, limit: RATE_LIMIT_PER_DAY };
  }
  return { ok: true, used, limit: RATE_LIMIT_PER_DAY, day };
}

async function bumpRateLimit(env, lang, day) {
  if (!env.DB) return;
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO i18n_regen_log (lang, day, count, updated_at)
     VALUES (?, ?, 1, ?)
     ON CONFLICT(lang, day) DO UPDATE SET count = count + 1, updated_at = excluded.updated_at`
  ).bind(lang, day, now).run();
}

async function generateAndCache(env, lang) {
  const data = await translateCatalog(env, EN_CATALOG, lang);
  await writeCachedLocale(env, lang, data);
  return data;
}

/**
 * GET /api/i18n/locale/:lang  → public, returns cached JSON or lazy-generates.
 * en is served from the bundled catalog.
 */
export async function handleI18nPublic(request, env, path, ctx) {
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;

  const parts = path.split('/').filter(Boolean);
  // /api/i18n/locale/:lang
  if (parts[2] !== 'locale' || !parts[3]) {
    return errorResponse('Not found', 404);
  }
  const lang = parts[3];
  if (!isValidLocale(lang)) {
    return errorResponse('Invalid locale code', 400);
  }

  if (lang === 'en') {
    return cachedJson(request, { success: true, message: 'Success', data: EN_CATALOG });
  }

  // Try cached first — instant path for any locale ever generated.
  const cached = await readCachedLocale(env, lang);
  if (cached) {
    return cachedJson(request, { success: true, message: 'Success', data: cached.data });
  }

  // Bound spend: only locales on the supported allowlist may be lazy-generated.
  // Unknown locale-shaped codes fall back to English so an attacker cannot
  // bypass the per-locale day cap by spamming many distinct codes.
  if (!SUPPORTED_LOCALES.has(lang)) {
    return cachedJson(request, { success: true, message: 'i18n fallback to en (locale not supported)', data: EN_CATALOG });
  }

  const rl = await checkRateLimit(env, lang);
  if (!rl.ok) {
    return cachedJson(request, { success: true, message: 'i18n fallback to en (rate limit reached)', data: EN_CATALOG });
  }

  try {
    const data = await generateAndCache(env, lang);
    await bumpRateLimit(env, lang, rl.day);
    return cachedJson(request, { success: true, message: 'Success', data });
  } catch (e) {
    console.error('[i18n] lazy generation failed for', lang, e.message || e);
    return cachedJson(request, { success: true, message: 'i18n fallback to en', data: EN_CATALOG });
  }
}

function cachedJson(request, body) {
  const cors = corsHeaders(request);
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      ...cors,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'CDN-Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}

/**
 * Owner-admin endpoints under /api/admin/i18n/...
 *  GET    /api/admin/i18n/locales            → list cached locales w/ metadata
 *  POST   /api/admin/i18n/regenerate/:lang   → force regen (rate-limited 5/day/lang)
 *  DELETE /api/admin/i18n/locale/:lang       → purge cached copy
 */
export async function handleI18nAdmin(request, env, pathParts) {
  const user = await validateAuth(request, env);
  if (!user) return errorResponse('Unauthorized', 401);
  const owner = await isOwner(user, env);
  if (!owner) return errorResponse('Forbidden', 403);

  const action = pathParts[3];
  const lang = pathParts[4];

  if (request.method === 'GET' && action === 'locales') {
    if (!env.STORAGE) return successResponse({ locales: [] });
    const list = await env.STORAGE.list({ prefix: R2_PREFIX });
    const locales = (list.objects || []).map((o) => ({
      lang: o.key.slice(R2_PREFIX.length).replace(/\.json$/, ''),
      size: o.size,
      uploaded: o.uploaded,
    }));
    return successResponse({ locales });
  }

  if (request.method === 'POST' && action === 'regenerate' && lang) {
    if (!isValidLocale(lang)) return errorResponse('Invalid locale code', 400);
    if (lang === 'en') return errorResponse('English is the source catalog and cannot be regenerated', 400);
    const rl = await checkRateLimit(env, lang);
    if (!rl.ok) {
      return errorResponse(`Rate limit reached (${rl.used}/${rl.limit} per day for ${lang})`, 429);
    }
    try {
      const data = await generateAndCache(env, lang);
      await bumpRateLimit(env, lang, rl.day);
      const keyCount = countKeys(data);
      return successResponse({ ok: true, lang, keyCount });
    } catch (e) {
      return errorResponse(e.message || 'Regeneration failed', 500);
    }
  }

  if (request.method === 'DELETE' && action === 'locale' && lang) {
    if (!isValidLocale(lang)) return errorResponse('Invalid locale code', 400);
    if (env.STORAGE) await env.STORAGE.delete(r2Key(lang));
    return successResponse({ ok: true, lang });
  }

  return errorResponse('i18n admin endpoint not found', 404);
}

function countKeys(obj) {
  let n = 0;
  for (const v of Object.values(obj || {})) {
    if (v && typeof v === 'object') n += countKeys(v);
    else if (typeof v === 'string') n += 1;
  }
  return n;
}
