import { handleCORS, successResponse, errorResponse, jsonResponse, corsHeaders } from '../../utils/helpers.js';
import { validateAuth } from '../../utils/auth.js';
import { isOwner } from './admin-worker.js';
import { translateCatalogIncremental, hashCatalog } from '../../utils/translator.js';
// Single source of truth for all catalogs lives under shared/i18n/locales/en/.
// English is the source for translation; every non-English locale is lazy-
// generated via Microsoft Translator on first request and then cached in R2.
// The English catalog is now split into per-namespace JSON files that we
// deep-merge here into the same nested shape we used to ship as one big
// `en.json`. Keeping the merged shape byte-identical means the per-key SHA
// fingerprints already stored in R2 stay valid — splitting the source files
// does NOT mark every previously-up-to-date locale as stale.
import EN_COMMON from '../../../frontend/src/shared/i18n/locales/en/common.json';
import EN_LANDING from '../../../frontend/src/shared/i18n/locales/en/landing.json';
import EN_AUTH from '../../../frontend/src/shared/i18n/locales/en/auth.json';
import EN_ADMIN from '../../../frontend/src/shared/i18n/locales/en/admin.json';
import EN_OWNER from '../../../frontend/src/shared/i18n/locales/en/owner.json';
import EN_DASHBOARD from '../../../frontend/src/shared/i18n/locales/en/dashboard.json';

function deepMergeCatalog(target, source) {
  for (const [k, v] of Object.entries(source || {})) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      target[k] = deepMergeCatalog(
        target[k] && typeof target[k] === 'object' ? target[k] : {},
        v,
      );
    } else {
      target[k] = v;
    }
  }
  return target;
}

const EN_CATALOG = [EN_COMMON, EN_LANDING, EN_AUTH, EN_ADMIN, EN_OWNER, EN_DASHBOARD]
  .reduce((acc, file) => deepMergeCatalog(acc, file), {});

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
function r2HashKey(lang) {
  return `${R2_PREFIX}${lang}.hashes.json`;
}

function isValidLocale(lang) {
  return typeof lang === 'string' && /^[a-zA-Z]{2,3}(-[a-zA-Z]{2,4})?$/.test(lang) && lang.length <= 12;
}

async function readJsonFromR2(env, key) {
  if (!env.STORAGE) return null;
  try {
    const obj = await env.STORAGE.get(key);
    if (!obj) return null;
    const text = await obj.text();
    return { data: JSON.parse(text), uploaded: obj.uploaded, size: obj.size };
  } catch (e) {
    console.warn('[i18n] readJsonFromR2 error:', key, e.message || e);
    return null;
  }
}

async function readCachedLocale(env, lang) {
  return readJsonFromR2(env, r2Key(lang));
}

async function readCachedHashes(env, lang) {
  const r = await readJsonFromR2(env, r2HashKey(lang));
  return r ? r.data : null;
}

async function writeCachedLocale(env, lang, data, hashes) {
  if (!env.STORAGE) throw new Error('R2 STORAGE binding missing');
  await env.STORAGE.put(r2Key(lang), JSON.stringify(data), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
  });
  if (hashes) {
    await env.STORAGE.put(r2HashKey(lang), JSON.stringify(hashes), {
      httpMetadata: { contentType: 'application/json; charset=utf-8' },
    });
  }
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

/**
 * Smart regenerate: only re-translates strings whose English source changed
 * since the previous translation. Falls back to a full translation when no
 * prior version exists. Returns stats and the new catalog.
 */
async function regenerateIncremental(env, lang) {
  const prior = await readCachedLocale(env, lang);
  const priorHashes = await readCachedHashes(env, lang);
  const { translation, hashes, stats } = await translateCatalogIncremental(
    env,
    EN_CATALOG,
    lang,
    prior ? prior.data : null,
    priorHashes,
  );
  await writeCachedLocale(env, lang, translation, hashes);
  return { data: translation, stats };
}

/**
 * Compute which paths in the EN catalog are out-of-date for a given locale,
 * without calling the translator. Used to power the "X strings need refresh"
 * badge in the owner admin without burning any API quota.
 */
async function diffStaleness(env, lang) {
  const priorHashes = await readCachedHashes(env, lang);
  const fresh = await hashCatalog(EN_CATALOG);
  const stale = [];
  const added = [];
  if (!priorHashes) {
    return { stale: 0, added: Object.keys(fresh).length, removed: 0, neverGenerated: true };
  }
  for (const [p, h] of Object.entries(fresh)) {
    if (!(p in priorHashes)) added.push(p);
    else if (priorHashes[p] !== h) stale.push(p);
  }
  let removed = 0;
  for (const p of Object.keys(priorHashes)) if (!(p in fresh)) removed += 1;
  return { stale: stale.length, added: added.length, removed, neverGenerated: false };
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
    const { data } = await regenerateIncremental(env, lang);
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
 *  GET    /api/admin/i18n/locales            → list cached locales w/ metadata + staleness
 *  POST   /api/admin/i18n/regenerate/:lang   → smart regen (rate-limited 5/day/lang)
 *  POST   /api/admin/i18n/refresh-all        → smart regen for every cached locale
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
    // Only translation files, not the .hashes.json sidecars.
    const objects = (list.objects || []).filter((o) => !o.key.endsWith('.hashes.json'));
    const locales = await Promise.all(objects.map(async (o) => {
      const langCode = o.key.slice(R2_PREFIX.length).replace(/\.json$/, '');
      const diff = await diffStaleness(env, langCode);
      return {
        lang: langCode,
        size: o.size,
        uploaded: o.uploaded,
        stale: diff.stale,
        added: diff.added,
        removed: diff.removed,
        upToDate: diff.stale === 0 && diff.added === 0 && diff.removed === 0,
      };
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
      const { data, stats } = await regenerateIncremental(env, lang);
      await bumpRateLimit(env, lang, rl.day);
      return successResponse({ ok: true, lang, keyCount: countKeys(data), stats });
    } catch (e) {
      return errorResponse(e.message || 'Regeneration failed', 500);
    }
  }

  // POST /api/admin/i18n/refresh-all  — incremental refresh for every cached
  // locale. Skips locales that are already up-to-date (no translator call,
  // no rate-limit charge). For locales with deltas, runs the smart regen and
  // charges one rate-limit unit per locale that actually called the translator.
  if (request.method === 'POST' && action === 'refresh-all') {
    if (!env.STORAGE) return successResponse({ ok: true, results: [] });
    const list = await env.STORAGE.list({ prefix: R2_PREFIX });
    const objects = (list.objects || []).filter((o) => !o.key.endsWith('.hashes.json'));
    const results = [];
    for (const o of objects) {
      const langCode = o.key.slice(R2_PREFIX.length).replace(/\.json$/, '');
      if (!isValidLocale(langCode) || langCode === 'en') continue;
      const diff = await diffStaleness(env, langCode);
      // Nothing changed → skip entirely. No translator call, no rate-limit charge.
      if (!diff.neverGenerated && diff.stale === 0 && diff.added === 0 && diff.removed === 0) {
        results.push({ lang: langCode, skipped: true, reason: 'up-to-date' });
        continue;
      }
      // Pure-deletion case (only `removed > 0`, no new/changed strings) needs
      // zero translator calls — just rewriting the file. Bypass rate limit so
      // owners aren't blocked from cleaning up stale keys when at quota.
      const needsTranslator = diff.neverGenerated || diff.stale > 0 || diff.added > 0;
      let rl = { ok: true, day: new Date().toISOString().slice(0, 10) };
      if (needsTranslator) {
        rl = await checkRateLimit(env, langCode);
        if (!rl.ok) {
          results.push({ lang: langCode, skipped: true, reason: `rate-limit ${rl.used}/${rl.limit}` });
          continue;
        }
      }
      try {
        const { stats } = await regenerateIncremental(env, langCode);
        // Only count against rate limit if we actually called the translator.
        if (stats.translated > 0) await bumpRateLimit(env, langCode, rl.day);
        results.push({ lang: langCode, ok: true, stats });
      } catch (e) {
        results.push({ lang: langCode, error: e.message || 'failed' });
      }
    }
    return successResponse({ ok: true, results });
  }

  if (request.method === 'DELETE' && action === 'locale' && lang) {
    if (!isValidLocale(lang)) return errorResponse('Invalid locale code', 400);
    if (env.STORAGE) {
      await env.STORAGE.delete(r2Key(lang));
      await env.STORAGE.delete(r2HashKey(lang));
    }
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
