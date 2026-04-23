import { handleCORS, successResponse, errorResponse, jsonResponse, corsHeaders } from '../../utils/helpers.js';
import { validateAuth } from '../../utils/auth.js';
import { isOwner } from './admin-worker.js';
import {
  translateCatalogIncremental,
  hashCatalog,
  flattenCatalog,
  protectPlaceholders,
  translateBatch,
  hashString,
} from '../../utils/translator.js';
import { purgeLocaleCache } from '../../utils/cdn-cache.js';
// Each namespace file holds that namespace's keys at the top level
// (`landing.json` is `{ heroBadge: "..." }`, NOT wrapped). Nesting each file
// under its namespace name when assembling EN_CATALOG keeps the per-key SHA
// fingerprints used by the staleness panel byte-identical to the layout
// that existed before the split — so "Refresh all" does not light up every
// cached locale on the deploy that ships the namespace split.
import EN_COMMON from '../../../frontend/src/shared/i18n/locales/en/common.json';
import EN_NAV from '../../../frontend/src/shared/i18n/locales/en/nav.json';
import EN_LANGUAGES from '../../../frontend/src/shared/i18n/locales/en/languages.json';
import EN_LANDING from '../../../frontend/src/shared/i18n/locales/en/landing.json';
import EN_AUTH from '../../../frontend/src/shared/i18n/locales/en/auth.json';
import EN_ADMIN from '../../../frontend/src/shared/i18n/locales/en/admin.json';
import EN_OWNER from '../../../frontend/src/shared/i18n/locales/en/owner.json';
import EN_DASHBOARD from '../../../frontend/src/shared/i18n/locales/en/dashboard.json';
import EN_PRODUCTS from '../../../frontend/src/shared/i18n/locales/en/products.json';
import EN_CUSTOMERS from '../../../frontend/src/shared/i18n/locales/en/customers.json';
import EN_WIZARD from '../../../frontend/src/shared/i18n/locales/en/wizard.json';
import EN_LEGAL from '../../../frontend/src/shared/i18n/locales/en/legal.json';
import EN_ABOUT from '../../../frontend/src/shared/i18n/locales/en/about.json';
import EN_PLANS from '../../../frontend/src/shared/i18n/locales/en/plans.json';
import EN_STOREFRONT from '../../../frontend/src/shared/i18n/locales/en/storefront.json';

const EN_CATALOG = {
  common: EN_COMMON,
  nav: EN_NAV,
  languages: EN_LANGUAGES,
  landing: EN_LANDING,
  auth: EN_AUTH,
  admin: EN_ADMIN,
  owner: EN_OWNER,
  dashboard: EN_DASHBOARD,
  products: EN_PRODUCTS,
  customers: EN_CUSTOMERS,
  wizard: EN_WIZARD,
  legal: EN_LEGAL,
  about: EN_ABOUT,
  plans: EN_PLANS,
  storefront: EN_STOREFRONT,
};

export const SUPPORTED_LOCALES = new Set([
  'en', 'hi', 'es', 'zh-CN', 'ar',
  // Long-tail allowlist of locales the platform will lazy-generate on demand.
  // Anything outside this set falls back to English to bound spend.
  'fr', 'de', 'pt', 'pt-BR', 'it', 'ja', 'ko', 'ru', 'tr', 'pl', 'nl', 'sv',
  'th', 'vi', 'id', 'ms', 'fil', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml',
  'pa', 'ur', 'fa', 'he', 'el', 'cs', 'da', 'fi', 'no', 'ro', 'hu', 'uk',
  'zh-TW', 'en-GB',
]);
const RATE_LIMIT_PER_DAY = 50;
const R2_PREFIX = 'locales/';

// Bumped whenever the translator pipeline itself changes in a way that
// invalidates previously-translated text (placeholder protection, HTML
// handling, prompt tweaks, etc). When a locale's stored pipeline version
// differs from this, the next regenerate will do a FULL re-translation
// instead of incremental, so cached corruption clears itself without the
// admin having to remember to purge.
//   v1 — initial release (textType=plain, no placeholder protection)
//   v2 — textType=html + {{token}} wrapped in <span class="notranslate">
const TRANSLATOR_PIPELINE_VERSION = 2;
// Reserved key inside the hashes JSON object that records which pipeline
// version produced the cached translations. Hidden from staleness diffs.
const PIPELINE_VERSION_KEY = '__pipelineVersion';

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

/* ----------------------------------------------------------------------- */
/* Phase A: per-key manual overrides ("sticky bit").                       */
/* ----------------------------------------------------------------------- */

// Self-heal schema for the two D1-backed i18n features (overrides + TM).
// Mirrors the existing pattern used by `i18n_regen_log` higher up — wrapped
// in try/catch so a CREATE failure (permissions, race) never breaks the
// translation hot path. Idempotent + cheap; safe to call on every entry to
// the override / TM paths so prod environments that never ran the standalone
// migration files still work the moment the code deploys.
//
// Exported because translateBatch() in utils/translator.js needs the same
// guarantee for `translation_memory` before it tries to read or write it.
export async function ensureI18nTables(env) {
  if (!env?.DB) return;
  try {
    await env.DB.batch([
      env.DB.prepare(
        `CREATE TABLE IF NOT EXISTS i18n_overrides (
           lang        TEXT    NOT NULL,
           path        TEXT    NOT NULL,
           value       TEXT    NOT NULL,
           updated_at  INTEGER NOT NULL,
           updated_by  TEXT,
           PRIMARY KEY (lang, path)
         )`,
      ),
      env.DB.prepare(
        `CREATE INDEX IF NOT EXISTS idx_i18n_overrides_lang ON i18n_overrides (lang)`,
      ),
      env.DB.prepare(
        `CREATE TABLE IF NOT EXISTS translation_memory (
           source_hash      TEXT    NOT NULL,
           target_lang      TEXT    NOT NULL,
           source_text      TEXT    NOT NULL,
           translated_text  TEXT    NOT NULL,
           hit_count        INTEGER NOT NULL DEFAULT 1,
           created_at       INTEGER NOT NULL,
           last_used_at     INTEGER NOT NULL,
           PRIMARY KEY (source_hash, target_lang)
         )`,
      ),
      env.DB.prepare(
        `CREATE INDEX IF NOT EXISTS idx_tm_lang ON translation_memory (target_lang)`,
      ),
      env.DB.prepare(
        `CREATE INDEX IF NOT EXISTS idx_tm_last_used ON translation_memory (last_used_at)`,
      ),
    ]);
  } catch (e) {
    console.warn('[i18n] ensureI18nTables failed:', e?.message || e);
  }
}

async function readOverrides(env, lang) {
  if (!env?.DB) return {};
  await ensureI18nTables(env);
  try {
    const { results } = await env.DB.prepare(
      `SELECT path, value FROM i18n_overrides WHERE lang = ?`,
    ).bind(lang).all();
    const out = {};
    for (const r of (results || [])) out[r.path] = r.value;
    return out;
  } catch (e) {
    // Belt-and-braces: even after ensureI18nTables, a brand-new D1 binding
    // could in theory still error here. Behave as if no overrides exist —
    // never break the regenerate path on a missing optional table.
    console.warn('[i18n] readOverrides failed:', lang, e?.message || e);
    return {};
  }
}

function setByPath(obj, dotted, value) {
  const segs = dotted.split('.');
  let cur = obj;
  for (let i = 0; i < segs.length - 1; i++) {
    if (!cur[segs[i]] || typeof cur[segs[i]] !== 'object') cur[segs[i]] = {};
    cur = cur[segs[i]];
  }
  cur[segs[segs.length - 1]] = value;
}

function getByPath(obj, dotted) {
  if (!obj) return undefined;
  const segs = dotted.split('.');
  let cur = obj;
  for (const s of segs) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[s];
  }
  return cur;
}

// Returns a NEW catalog object with overrides layered on top of the supplied
// translation. Caller is expected to use the returned object (the input is
// not mutated) — keeps regenerate idempotent if it ever runs more than once.
function applyOverridesToCatalog(catalog, overrides, namespaceFilter = null) {
  const keys = Object.keys(overrides || {});
  if (keys.length === 0) return catalog;
  const root = JSON.parse(JSON.stringify(catalog || {}));
  for (const path of keys) {
    if (namespaceFilter && path !== namespaceFilter && !path.startsWith(`${namespaceFilter}.`)) {
      continue;
    }
    setByPath(root, path, overrides[path]);
  }
  return root;
}

// Best-effort post-write hook: bust the Cloudflare edge cache for the locale
// URL so shoppers see the new strings within seconds instead of waiting the
// 7-day TTL. Wrapped in try/catch internally — never throws.
async function afterLocaleWrite(env, lang) {
  try {
    await purgeLocaleCache(env, lang);
  } catch (e) {
    console.warn('[i18n] afterLocaleWrite purge failed:', lang, e?.message || e);
  }
}

/**
 * Smart regenerate: only re-translates strings whose English source changed
 * since the previous translation. Falls back to a full translation when no
 * prior version exists. Returns stats and the new catalog.
 *
 * Manual overrides (Phase A) are applied as a final layer on every code
 * path — so a force-regenerate or pipeline-version bump never quietly
 * clobbers a string the operator has manually corrected.
 */
async function regenerateIncremental(env, lang, { force = false, namespace = null } = {}) {
  const prior = await readCachedLocale(env, lang);
  const priorHashesRaw = await readCachedHashes(env, lang);
  // If the stored pipeline version differs from the current one, every
  // existing translation may be subtly corrupt (e.g. placeholders were
  // mangled before v2). Treat that as "no prior" so we re-translate
  // everything cleanly. `force` does the same on demand.
  const priorVersion = priorHashesRaw ? Number(priorHashesRaw[PIPELINE_VERSION_KEY] || 1) : null;
  const pipelineMismatch = priorVersion !== null && priorVersion !== TRANSLATOR_PIPELINE_VERSION;
  const usePrior = !force && !pipelineMismatch;

  // Strip the reserved meta key before passing hashes downstream so the
  // delta math operates on real content paths only.
  let priorHashesForDiff = null;
  if (usePrior && priorHashesRaw) {
    priorHashesForDiff = { ...priorHashesRaw };
    delete priorHashesForDiff[PIPELINE_VERSION_KEY];
  }

  // Namespace-scoped regenerate: only translate keys inside one top-level
  // namespace (e.g. "admin"), keeping all other namespaces untouched both in
  // the translated output AND the stored hash map. Lets owners pay only for
  // the slice they care about when fixing a localized section, instead of
  // re-translating the full platform catalog. The pipeline-version stamp is
  // intentionally NOT bumped on a partial regen — other namespaces still
  // carry the old pipeline output, so a full regen is still required to
  // clear pipelineMismatch.
  if (namespace) {
    if (!Object.prototype.hasOwnProperty.call(EN_CATALOG, namespace)) {
      throw new Error(`Unknown namespace: ${namespace}`);
    }
    const subCatalog = { [namespace]: EN_CATALOG[namespace] };
    const priorSub = (usePrior && prior?.data?.[namespace])
      ? { [namespace]: prior.data[namespace] }
      : null;
    const priorHashesSub = priorHashesForDiff
      ? Object.fromEntries(
          Object.entries(priorHashesForDiff).filter(([p]) => p === namespace || p.startsWith(`${namespace}.`)),
        )
      : null;
    const { translation: nsTranslation, hashes: nsHashes, stats } = await translateCatalogIncremental(
      env, subCatalog, lang, priorSub, priorHashesSub,
    );

    // Merge translation: keep all other namespaces from prior, replace this one.
    const mergedTranslation = { ...(prior?.data || {}), ...nsTranslation };

    // Merge hashes: keep prior hashes for OTHER namespaces (so their staleness
    // badges remain accurate), replace hashes inside this namespace.
    const mergedHashes = { ...(priorHashesRaw || {}) };
    delete mergedHashes[PIPELINE_VERSION_KEY];
    for (const k of Object.keys(mergedHashes)) {
      if (k === namespace || k.startsWith(`${namespace}.`)) delete mergedHashes[k];
    }
    Object.assign(mergedHashes, nsHashes);
    // Preserve whatever pipeline version was already stored (do NOT advance it
    // here — see comment above). If there was no prior, stamp current.
    mergedHashes[PIPELINE_VERSION_KEY] = priorVersion ?? TRANSLATOR_PIPELINE_VERSION;

    // Phase A: layer manual overrides on top so they survive force/regenerate.
    // Scoped to the current namespace so overrides outside it (already preserved
    // via the prior catalog merge above) aren't redundantly re-applied.
    const overrides = await readOverrides(env, lang);
    const finalTranslation = applyOverridesToCatalog(mergedTranslation, overrides, namespace);
    const overridesApplied = Object.keys(overrides).filter(
      (p) => p === namespace || p.startsWith(`${namespace}.`),
    ).length;

    await writeCachedLocale(env, lang, finalTranslation, mergedHashes);
    return {
      data: finalTranslation,
      stats: { ...stats, force, pipelineMismatch, priorVersion: priorVersion ?? null, namespace, overridesApplied },
    };
  }

  const { translation, hashes, stats } = await translateCatalogIncremental(
    env,
    EN_CATALOG,
    lang,
    usePrior && prior ? prior.data : null,
    priorHashesForDiff,
  );
  // Stamp the pipeline version into the hashes file so future regens know
  // whether the stored translations were produced by current code.
  const stampedHashes = { ...hashes, [PIPELINE_VERSION_KEY]: TRANSLATOR_PIPELINE_VERSION };

  // Phase A: re-apply manual overrides over the freshly translated catalog.
  const overrides = await readOverrides(env, lang);
  const finalTranslation = applyOverridesToCatalog(translation, overrides);
  const overridesApplied = Object.keys(overrides).length;

  await writeCachedLocale(env, lang, finalTranslation, stampedHashes);
  return {
    data: finalTranslation,
    stats: { ...stats, force, pipelineMismatch, priorVersion: priorVersion ?? null, namespace: null, overridesApplied },
  };
}

/**
 * Cost preview: compute the exact set of keys that WOULD be sent to Microsoft
 * Translator if the caller invoked regenerate (or force-regenerate) right now,
 * along with the total character count and an estimated USD cost. No API
 * calls are made and no cache is mutated.
 *
 * Microsoft Translator Standard (S1) pricing is $10 per 1M characters. We use
 * that as the baseline; the figure is shown as an estimate so callers
 * understand it does not account for free-tier credits or volume discounts.
 */
const COST_PER_MILLION_CHARS_USD = 10;
async function previewRegenerate(env, lang, { force = false, namespace = null } = {}) {
  const prior = await readCachedLocale(env, lang);
  const priorHashesRaw = await readCachedHashes(env, lang);
  const priorVersion = priorHashesRaw ? Number(priorHashesRaw[PIPELINE_VERSION_KEY] || 1) : null;
  const pipelineMismatch = priorVersion !== null && priorVersion !== TRANSLATOR_PIPELINE_VERSION;
  const neverGenerated = !prior;
  // If forced, pipeline mismatched, or never generated, every key in the
  // target catalog is re-translated. Otherwise it's just the deltas.
  const willFullRetranslate = force || pipelineMismatch || neverGenerated;

  let targetCatalog = EN_CATALOG;
  if (namespace) {
    if (!Object.prototype.hasOwnProperty.call(EN_CATALOG, namespace)) {
      throw new Error(`Unknown namespace: ${namespace}`);
    }
    targetCatalog = { [namespace]: EN_CATALOG[namespace] };
  }

  const { paths, values } = flattenCatalog(targetCatalog);
  let pathsToTranslate = paths;
  let valuesToTranslate = values;

  if (!willFullRetranslate) {
    const fresh = await hashCatalog(targetCatalog);
    const priorHashes = { ...priorHashesRaw };
    delete priorHashes[PIPELINE_VERSION_KEY];
    const priorFlat = flattenCatalog(prior.data || {});
    const priorPathSet = new Set(priorFlat.paths);
    const filteredPaths = [];
    const filteredValues = [];
    for (let i = 0; i < paths.length; i++) {
      const p = paths[i];
      const v = values[i];
      const hadTranslation = priorPathSet.has(p);
      const oldHash = priorHashes[p];
      const newHash = fresh[p];
      if (!hadTranslation || !oldHash || oldHash !== newHash) {
        filteredPaths.push(p);
        filteredValues.push(v);
      }
    }
    pathsToTranslate = filteredPaths;
    valuesToTranslate = filteredValues;
  }

  // Phase D: consult Translation Memory before computing cost. The actual
  // regenerate path skips any string already present in TM for this target
  // language, so the preview must do the same or it will scare operators
  // with worst-case numbers (e.g. Force regen on a fully-cached language
  // would otherwise quote the full catalog cost when the real run pays $0).
  // Lookup is keyed by content hash, exactly as translator.js does it.
  let tmHits = 0;
  let tmHitChars = 0;
  let billablePaths = pathsToTranslate;
  let billableValues = valuesToTranslate;
  if (env?.DB && lang && pathsToTranslate.length > 0) {
    try {
      const stringValues = valuesToTranslate.map((v) => (typeof v === 'string' ? v : ''));
      const hashes = await Promise.all(stringValues.map(hashString));
      const hitSet = new Set();
      // D1 caps bound parameters at 100 per query. 90 hashes + 1 for `lang`
      // stays safely under the limit; a batch of 100 fails with
      // `D1_ERROR: too many SQL variables` and silently returns 0 hits.
      const TM_BATCH = 90;
      for (let i = 0; i < hashes.length; i += TM_BATCH) {
        const group = hashes.slice(i, i + TM_BATCH);
        if (!group.length) continue;
        const placeholders = group.map(() => '?').join(',');
        const { results } = await env.DB.prepare(
          `SELECT source_hash FROM translation_memory
             WHERE target_lang = ? AND source_hash IN (${placeholders})`,
        ).bind(lang, ...group).all();
        for (const r of (results || [])) hitSet.add(r.source_hash);
      }
      const remainPaths = [];
      const remainValues = [];
      for (let i = 0; i < pathsToTranslate.length; i++) {
        if (hitSet.has(hashes[i])) {
          tmHits += 1;
          tmHitChars += stringValues[i] ? protectPlaceholders(stringValues[i]).length : 0;
        } else {
          remainPaths.push(pathsToTranslate[i]);
          remainValues.push(valuesToTranslate[i]);
        }
      }
      billablePaths = remainPaths;
      billableValues = remainValues;
    } catch (e) {
      // TM lookup is non-fatal here too — fall back to worst-case preview.
      console.warn('[i18n preview] TM consult failed:', e?.message || e);
    }
  }

  // Microsoft bills based on the chars actually sent over the wire, which
  // includes the <span class="notranslate"> wrapper that protectPlaceholders
  // adds around every {{token}}. Count post-wrap so the cost estimate
  // matches the real translator input — without this, strings with many
  // placeholders are systematically under-billed in the preview.
  const charCount = billableValues.reduce(
    (sum, v) => sum + (typeof v === 'string' ? protectPlaceholders(v).length : 0),
    0,
  );
  const estimatedCostUSD = (charCount / 1_000_000) * COST_PER_MILLION_CHARS_USD;
  return {
    lang,
    namespace,
    force,
    willFullRetranslate,
    pipelineMismatch,
    neverGenerated,
    keysToTranslate: billablePaths.length,
    keysReused: paths.length - billablePaths.length,
    totalKeysInScope: paths.length,
    tmHits,
    tmCharsAvoided: tmHitChars,
    charCount,
    estimatedCostUSD: Number(estimatedCostUSD.toFixed(4)),
    pricePerMillionCharsUSD: COST_PER_MILLION_CHARS_USD,
  };
}

/**
 * Compute which paths in the EN catalog are out-of-date for a given locale,
 * without calling the translator. Used to power the "X strings need refresh"
 * badge in the owner admin without burning any API quota.
 */
async function diffStaleness(env, lang) {
  const priorHashesRaw = await readCachedHashes(env, lang);
  const fresh = await hashCatalog(EN_CATALOG);
  const stale = [];
  const added = [];
  if (!priorHashesRaw) {
    return {
      stale: 0,
      added: Object.keys(fresh).length,
      removed: 0,
      neverGenerated: true,
      pipelineVersion: null,
      pipelineMismatch: false,
    };
  }
  // Hide the reserved meta key from the diff math so it isn't reported as
  // a stray "removed" entry in every cached locale.
  const priorVersion = Number(priorHashesRaw[PIPELINE_VERSION_KEY] || 1);
  const priorHashes = { ...priorHashesRaw };
  delete priorHashes[PIPELINE_VERSION_KEY];
  for (const [p, h] of Object.entries(fresh)) {
    if (!(p in priorHashes)) added.push(p);
    else if (priorHashes[p] !== h) stale.push(p);
  }
  let removed = 0;
  for (const p of Object.keys(priorHashes)) if (!(p in fresh)) removed += 1;
  return {
    stale: stale.length,
    added: added.length,
    removed,
    neverGenerated: false,
    pipelineVersion: priorVersion,
    pipelineMismatch: priorVersion !== TRANSLATOR_PIPELINE_VERSION,
  };
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
    return cachedJson(request, { success: true, message: 'Success', data: EN_CATALOG }, { lang: 'en' });
  }

  // Try cached first — instant path for any locale ever generated.
  const cached = await readCachedLocale(env, lang);
  if (cached) {
    return cachedJson(request, { success: true, message: 'Success', data: cached.data }, { lang });
  }

  // Bound spend: only locales on the supported allowlist may be lazy-generated.
  // Unknown locale-shaped codes fall back to English so an attacker cannot
  // bypass the per-locale day cap by spamming many distinct codes. Mark the
  // response transient — if the allowlist later expands, we don't want a
  // 7-day-old EN response stuck at the edge.
  if (!SUPPORTED_LOCALES.has(lang)) {
    return cachedJson(
      request,
      { success: true, message: 'i18n fallback to en (locale not supported)', data: EN_CATALOG },
      { lang, transient: true },
    );
  }

  const rl = await checkRateLimit(env, lang);
  if (!rl.ok) {
    return cachedJson(
      request,
      { success: true, message: 'i18n fallback to en (rate limit reached)', data: EN_CATALOG },
      { lang, transient: true },
    );
  }

  try {
    const { data } = await regenerateIncremental(env, lang);
    await bumpRateLimit(env, lang, rl.day);
    // Lazy-gen succeeded — best-effort purge any stale EN fallback the edge
    // may have cached during a prior miss/rate-limit window.
    try { await purgeLocaleCache(env, lang); } catch { /* non-fatal */ }
    return cachedJson(request, { success: true, message: 'Success', data }, { lang });
  } catch (e) {
    console.error('[i18n] lazy generation failed for', lang, e.message || e);
    return cachedJson(
      request,
      { success: true, message: 'i18n fallback to en', data: EN_CATALOG },
      { lang, transient: true },
    );
  }
}

// Two-tier cache (matches the rest of the platform per replit.md):
//   Browser: short max-age so a Refresh All / regenerate is reflected in
//            other tabs / other origins (e.g. merchant admin) within ~60s
//            instead of being pinned in the browser disk cache for 7 days.
//            ETag + must-revalidate keeps the wire cost ~0 (304 Not Modified).
//   CDN:     long max-age so the edge stays hot. The owner-admin regenerate
//            path explicitly purges this cache via purgeLocaleCache(env, lang).
// Fallback responses (rate-limited, unsupported, error) opt out by passing
// `transient: true` so a temporary EN fallback can't get pinned anywhere.
const LOCALE_BROWSER_MAX_AGE = 60; // 1 minute browser cache + revalidate
const LOCALE_EDGE_MAX_AGE = 7 * 24 * 60 * 60; // 604800 CDN edge cache
const LOCALE_CACHE_SWR = 24 * 60 * 60; // 86400 stale-while-revalidate
const FALLBACK_CACHE_MAX_AGE = 60; // 1 minute — recover quickly after fix

async function etagFor(bodyString) {
  // Use the existing 16-hex content fingerprint helper. ETags must be ASCII,
  // wrapped in quotes per RFC 7232.
  const h = await hashString(bodyString);
  return `"${h}"`;
}

async function cachedJson(request, body, opts = {}) {
  const { lang = null, transient = false } = opts;
  const cors = corsHeaders(request);
  const bodyString = JSON.stringify(body);
  const headers = {
    ...cors,
    'Content-Type': 'application/json; charset=utf-8',
    'Vary': 'Accept-Encoding',
  };

  if (transient) {
    headers['Cache-Control'] = `public, max-age=${FALLBACK_CACHE_MAX_AGE}, must-revalidate`;
    headers['CDN-Cache-Control'] = `public, max-age=${FALLBACK_CACHE_MAX_AGE}`;
  } else {
    // Browser revalidates every 60s (cheap 304 via ETag), CDN holds for 7 days.
    headers['Cache-Control'] = `public, max-age=${LOCALE_BROWSER_MAX_AGE}, must-revalidate, stale-while-revalidate=${LOCALE_CACHE_SWR}`;
    headers['CDN-Cache-Control'] = `public, max-age=${LOCALE_EDGE_MAX_AGE}, stale-while-revalidate=${LOCALE_CACHE_SWR}`;
  }

  // Compute a content-derived ETag for every response so browsers can do
  // cheap conditional GETs (304 Not Modified) on subsequent loads.
  try {
    const tag = await etagFor(bodyString);
    headers.ETag = tag;
    if (lang) {
      // Cache-Tag is only honoured by Cloudflare Enterprise but is harmless
      // to emit on lower plans. Useful if the account is upgraded later.
      headers['Cache-Tag'] = `i18n,lang-${lang}`;
    }
    // RFC 7232 conditional GET — return 304 with empty body when ETag matches.
    const inm = request.headers.get('If-None-Match');
    if (inm && inm === tag) {
      return new Response(null, { status: 304, headers });
    }
  } catch (e) {
    // ETag generation must never break the response.
    console.warn('[i18n] etag generation failed:', e?.message || e);
  }

  return new Response(bodyString, { status: 200, headers });
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

  if (request.method === 'GET' && action === 'namespaces') {
    // Top-level namespaces in the EN catalog. Used by the admin UI to populate
    // the "regenerate just this namespace" dropdown.
    const ns = Object.keys(EN_CATALOG).map((name) => {
      const sub = { [name]: EN_CATALOG[name] };
      const { paths } = flattenCatalog(sub);
      return { name, keyCount: paths.length };
    });
    return successResponse({ namespaces: ns });
  }

  if (request.method === 'GET' && action === 'preview' && lang) {
    if (!isValidLocale(lang)) return errorResponse('Invalid locale code', 400);
    if (lang === 'en') return errorResponse('English is the source catalog', 400);
    const url = new URL(request.url);
    const force = url.searchParams.get('force') === '1' || url.searchParams.get('force') === 'true';
    const namespace = url.searchParams.get('namespace') || null;
    try {
      const preview = await previewRegenerate(env, lang, { force, namespace });
      // Explicit no-store so browser + Cloudflare edge never serve a stale
      // preview. TM contents and EN source can change between consecutive
      // clicks, and a cached "$1.02" estimate is worse than a fresh "$0.04".
      // `previewVersion` lets ops verify which code path served the response
      // when debugging "preview number didn't change" reports — bump on any
      // future change to previewRegenerate's contract.
      const body = JSON.stringify({
        success: true,
        message: 'Success',
        data: { ...preview, previewVersion: 'tm-aware-v1' },
      });
      return new Response(body, {
        status: 200,
        headers: {
          ...corsHeaders(request),
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0',
        },
      });
    } catch (e) {
      return errorResponse(e.message || 'Preview failed', 400);
    }
  }

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
        pipelineVersion: diff.pipelineVersion,
        pipelineMismatch: diff.pipelineMismatch,
        // A locale is fully clean only when there are no content deltas AND
        // its translations were produced by the current pipeline version.
        upToDate:
          diff.stale === 0 && diff.added === 0 && diff.removed === 0 && !diff.pipelineMismatch,
      };
    }));
    return successResponse({ locales, currentPipelineVersion: TRANSLATOR_PIPELINE_VERSION });
  }

  if (request.method === 'POST' && action === 'regenerate' && lang) {
    if (!isValidLocale(lang)) return errorResponse('Invalid locale code', 400);
    if (lang === 'en') return errorResponse('English is the source catalog and cannot be regenerated', 400);
    const url = new URL(request.url);
    const namespace = url.searchParams.get('namespace') || null;
    if (namespace && !Object.prototype.hasOwnProperty.call(EN_CATALOG, namespace)) {
      return errorResponse(`Unknown namespace: ${namespace}`, 400);
    }
    const rl = await checkRateLimit(env, lang);
    if (!rl.ok) {
      return errorResponse(`Rate limit reached (${rl.used}/${rl.limit} per day for ${lang})`, 429);
    }
    try {
      const { data, stats } = await regenerateIncremental(env, lang, { namespace });
      await bumpRateLimit(env, lang, rl.day);
      await afterLocaleWrite(env, lang);
      return successResponse({ ok: true, lang, namespace, keyCount: countKeys(data), stats });
    } catch (e) {
      return errorResponse(e.message || 'Regeneration failed', 500);
    }
  }

  // POST /api/admin/i18n/force-regenerate/:lang  — purge + full regenerate in
  // one shot. Bypasses the per-day rate-limit *throttle* (still bounded by
  // Microsoft's account-level quota) and ignores any stored prior so every
  // string is re-translated through the current pipeline. Use after a
  // pipeline change (e.g. placeholder protection fix) or when a locale is
  // visibly corrupted. Still records a rate-limit hit so the day counter
  // remains an accurate audit trail.
  if (request.method === 'POST' && action === 'force-regenerate' && lang) {
    if (!isValidLocale(lang)) return errorResponse('Invalid locale code', 400);
    if (lang === 'en') return errorResponse('English is the source catalog and cannot be regenerated', 400);
    const url = new URL(request.url);
    const namespace = url.searchParams.get('namespace') || null;
    if (namespace && !Object.prototype.hasOwnProperty.call(EN_CATALOG, namespace)) {
      return errorResponse(`Unknown namespace: ${namespace}`, 400);
    }
    const day = new Date().toISOString().slice(0, 10);
    try {
      const { data, stats } = await regenerateIncremental(env, lang, { force: true, namespace });
      // Best-effort log; failures here must not break the response.
      try { await bumpRateLimit(env, lang, day); } catch { /* ignore */ }
      await afterLocaleWrite(env, lang);
      return successResponse({ ok: true, lang, namespace, keyCount: countKeys(data), stats, forced: true });
    } catch (e) {
      return errorResponse(e.message || 'Force regeneration failed', 500);
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
      // Nothing changed AND pipeline version matches → truly up-to-date.
      if (
        !diff.neverGenerated &&
        diff.stale === 0 &&
        diff.added === 0 &&
        diff.removed === 0 &&
        !diff.pipelineMismatch
      ) {
        results.push({ lang: langCode, skipped: true, reason: 'up-to-date' });
        continue;
      }
      // Pure-deletion case (only `removed > 0`, no new/changed strings) needs
      // zero translator calls — just rewriting the file. Bypass rate limit so
      // owners aren't blocked from cleaning up stale keys when at quota. A
      // pipeline mismatch DOES need the translator (full re-translation), so
      // it does not qualify for this bypass.
      const needsTranslator =
        diff.neverGenerated || diff.stale > 0 || diff.added > 0 || diff.pipelineMismatch;
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
        // Phase C: every locale we just rewrote needs its edge entry busted.
        await afterLocaleWrite(env, langCode);
        results.push({ lang: langCode, ok: true, stats });
      } catch (e) {
        results.push({ lang: langCode, error: e.message || 'failed' });
      }
    }
    return successResponse({ ok: true, results });
  }

  // DELETE /api/admin/i18n/locale/:lang  — full reset for a locale: drop the
  // cached JSON, drop its hash sidecar, drop every manual override, and bust
  // the edge cache. After this the next public request lazy-regenerates from
  // scratch (subject to rate limit). The admin UI surfaces this as
  // "Delete & reset" to avoid confusion with the edge-only purge below.
  if (request.method === 'DELETE' && action === 'locale' && lang) {
    if (!isValidLocale(lang)) return errorResponse('Invalid locale code', 400);
    if (env.STORAGE) {
      await env.STORAGE.delete(r2Key(lang));
      await env.STORAGE.delete(r2HashKey(lang));
    }
    if (env.DB) {
      await ensureI18nTables(env);
      try {
        await env.DB.prepare(`DELETE FROM i18n_overrides WHERE lang = ?`).bind(lang).run();
      } catch { /* truly non-fatal — purge already nuked R2 */ }
    }
    await afterLocaleWrite(env, lang);
    return successResponse({ ok: true, lang });
  }

  // POST /api/admin/i18n/purge-edge/:lang  — bust the Cloudflare edge cache
  // for one locale WITHOUT changing R2 / D1. Useful when the cached catalog
  // is correct but a stale 304 chain is hanging on at the edge for some
  // reason, or when the operator explicitly wants to verify a purge round-trip.
  if (request.method === 'POST' && action === 'purge-edge' && lang) {
    if (!isValidLocale(lang)) return errorResponse('Invalid locale code', 400);
    const result = await purgeLocaleCache(env, lang);
    return successResponse({ ok: !!result?.ok, lang, result });
  }

  // GET /api/admin/i18n/strings/:lang?namespace=owner  — listing for the
  // "Edit translations" admin sub-view. Returns one row per leaf key with
  // the EN source, the currently-cached translation (which may itself be an
  // override), and whether an override row exists.
  if (request.method === 'GET' && action === 'strings' && lang) {
    if (!isValidLocale(lang)) return errorResponse('Invalid locale code', 400);
    if (lang === 'en') return errorResponse('English is the source catalog', 400);
    const url = new URL(request.url);
    const ns = url.searchParams.get('namespace') || null;
    if (ns && !Object.prototype.hasOwnProperty.call(EN_CATALOG, ns)) {
      return errorResponse(`Unknown namespace: ${ns}`, 400);
    }
    const scope = ns ? { [ns]: EN_CATALOG[ns] } : EN_CATALOG;
    const { paths, values } = flattenCatalog(scope);
    const cached = await readCachedLocale(env, lang);
    const overrides = await readOverrides(env, lang);
    const rows = paths.map((p, i) => {
      const cur = getByPath(cached?.data, p);
      return {
        path: p,
        en: values[i],
        current: typeof cur === 'string' ? cur : null,
        hasOverride: Object.prototype.hasOwnProperty.call(overrides, p),
      };
    });
    return successResponse({ lang, namespace: ns, rows });
  }

  // POST /api/admin/i18n/translate-key/:lang  body: { path, value? }
  // - value provided  → set as manual override (sticky bit, survives regens)
  // - value omitted   → clear any override AND re-translate just that key
  // Both paths update R2 in-place (no full regen needed) and purge the edge.
  if (request.method === 'POST' && action === 'translate-key' && lang) {
    if (!isValidLocale(lang)) return errorResponse('Invalid locale code', 400);
    if (lang === 'en') return errorResponse('English is the source catalog', 400);
    let body;
    try { body = await request.json(); } catch { return errorResponse('Invalid JSON body', 400); }
    const path = typeof body?.path === 'string' ? body.path : '';
    if (!path || !/^[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*$/.test(path)) {
      return errorResponse('Missing or invalid path', 400);
    }
    const enValue = getByPath(EN_CATALOG, path);
    if (typeof enValue !== 'string') {
      return errorResponse(`Path not found in EN catalog: ${path}`, 404);
    }
    const cached = await readCachedLocale(env, lang);
    if (!cached) {
      return errorResponse(`Locale ${lang} has not been generated yet — run Regenerate first.`, 409);
    }
    const hashesRaw = (await readCachedHashes(env, lang)) || {};

    let newValue;
    let isOverride = false;
    if (typeof body?.value === 'string' && body.value.length > 0) {
      // Manual override path — no translator call, no rate limit charge.
      if (body.value.length > 5000) {
        return errorResponse('Override value too long (max 5000 chars)', 400);
      }
      newValue = body.value;
      isOverride = true;
    } else {
      // Per-key re-translate path. Charge ONE rate-limit unit so spamming
      // single-key calls still respects the per-locale daily cap.
      const rl = await checkRateLimit(env, lang);
      if (!rl.ok) {
        return errorResponse(`Rate limit reached (${rl.used}/${rl.limit} per day for ${lang})`, 429);
      }
      try {
        const [translated] = await translateBatch(env, [enValue], lang, 'en');
        newValue = translated;
        await bumpRateLimit(env, lang, rl.day);
      } catch (e) {
        return errorResponse(e.message || 'Translator failed for that key', 500);
      }
    }

    // Persist the override-row state (set or clear) FIRST, before touching
    // R2. If D1 is unavailable or the migration hasn't run, an "override"
    // request must hard-fail — otherwise the UI would report success for
    // a value that won't survive the next regenerate (sticky-bit broken).
    if (isOverride) {
      if (!env.DB) return errorResponse('Override storage (D1) is not configured', 500);
      await ensureI18nTables(env);
      try {
        await env.DB.prepare(
          `INSERT INTO i18n_overrides (lang, path, value, updated_at, updated_by)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(lang, path) DO UPDATE SET
             value = excluded.value,
             updated_at = excluded.updated_at,
             updated_by = excluded.updated_by`,
        ).bind(lang, path, newValue, Date.now(), user.email || user.uid || null).run();
      } catch (e) {
        return errorResponse(`Failed to persist override: ${e?.message || e}`, 500);
      }
    } else if (env.DB) {
      // Re-translate path: clear any existing override so the catalog reverts
      // to the auto-translated value next regen. A failure here is non-fatal —
      // worst case the row lingers and gets re-applied at next regenerate,
      // which is the safe default for "I didn't really want to clear it".
      await ensureI18nTables(env);
      try {
        await env.DB.prepare(
          `DELETE FROM i18n_overrides WHERE lang = ? AND path = ?`,
        ).bind(lang, path).run();
      } catch (e) {
        console.warn('[i18n] override clear failed:', lang, path, e?.message || e);
      }
    }

    // Now apply to the cached catalog + advance the per-key hash so the
    // staleness diff doesn't mark this key stale on its next read.
    const newCatalog = JSON.parse(JSON.stringify(cached.data || {}));
    setByPath(newCatalog, path, newValue);
    hashesRaw[path] = await hashString(enValue);
    await writeCachedLocale(env, lang, newCatalog, hashesRaw);
    await afterLocaleWrite(env, lang);
    return successResponse({ ok: true, lang, path, value: newValue, isOverride });
  }

  // DELETE /api/admin/i18n/override/:lang?path=foo.bar  — convenience alias
  // that clears the override AND re-translates the key in one call. Mirrors
  // POST translate-key with no body.value, but lets the UI use a DELETE verb
  // for an obviously-destructive action.
  if (request.method === 'DELETE' && action === 'override' && lang) {
    if (!isValidLocale(lang)) return errorResponse('Invalid locale code', 400);
    if (lang === 'en') return errorResponse('English is the source catalog', 400);
    const url = new URL(request.url);
    const path = url.searchParams.get('path') || '';
    if (!path || !/^[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*$/.test(path)) {
      return errorResponse('Missing or invalid path', 400);
    }
    const enValue = getByPath(EN_CATALOG, path);
    if (typeof enValue !== 'string') {
      return errorResponse(`Path not found in EN catalog: ${path}`, 404);
    }
    const cached = await readCachedLocale(env, lang);
    if (!cached) {
      return errorResponse(`Locale ${lang} has not been generated yet`, 409);
    }
    const hashesRaw = (await readCachedHashes(env, lang)) || {};
    const rl = await checkRateLimit(env, lang);
    if (!rl.ok) {
      return errorResponse(`Rate limit reached (${rl.used}/${rl.limit} per day for ${lang})`, 429);
    }
    let translated;
    try {
      [translated] = await translateBatch(env, [enValue], lang, 'en');
    } catch (e) {
      return errorResponse(e.message || 'Translator failed', 500);
    }
    await bumpRateLimit(env, lang, rl.day);
    const newCatalog = JSON.parse(JSON.stringify(cached.data || {}));
    setByPath(newCatalog, path, translated);
    hashesRaw[path] = await hashString(enValue);
    await writeCachedLocale(env, lang, newCatalog, hashesRaw);
    if (env.DB) {
      await ensureI18nTables(env);
      try {
        await env.DB.prepare(`DELETE FROM i18n_overrides WHERE lang = ? AND path = ?`).bind(lang, path).run();
      } catch { /* non-fatal */ }
    }
    await afterLocaleWrite(env, lang);
    return successResponse({ ok: true, lang, path, value: translated, isOverride: false });
  }

  // GET /api/admin/i18n/tm-stats  — Phase D efficiency card. Totals and a
  // small per-language breakdown. `hits` counts reuse-beyond-first-store
  // (i.e. SUM(hit_count - 1)) since the initial INSERT is itself a "miss".
  if (request.method === 'GET' && action === 'tm-stats') {
    if (!env.DB) return successResponse({ rows: 0, hits: 0, charsSaved: 0, costSavedUSD: 0, byLang: [] });
    await ensureI18nTables(env);
    try {
      const totals = await env.DB.prepare(
        `SELECT COUNT(*) AS rows,
                COALESCE(SUM(hit_count - 1), 0) AS hits,
                COALESCE(SUM(LENGTH(source_text) * (hit_count - 1)), 0) AS charsSaved
         FROM translation_memory`,
      ).first();
      const byLangRes = await env.DB.prepare(
        `SELECT target_lang AS lang,
                COUNT(*) AS rows,
                COALESCE(SUM(hit_count - 1), 0) AS hits,
                COALESCE(SUM(LENGTH(source_text) * (hit_count - 1)), 0) AS charsSaved
         FROM translation_memory
         GROUP BY target_lang
         ORDER BY hits DESC
         LIMIT 50`,
      ).all();
      const charsSaved = Number(totals?.charsSaved || 0);
      const costSavedUSD = Number(((charsSaved / 1_000_000) * COST_PER_MILLION_CHARS_USD).toFixed(4));
      return successResponse({
        rows: Number(totals?.rows || 0),
        hits: Number(totals?.hits || 0),
        charsSaved,
        costSavedUSD,
        pricePerMillionCharsUSD: COST_PER_MILLION_CHARS_USD,
        byLang: (byLangRes.results || []).map((r) => ({
          lang: r.lang,
          rows: Number(r.rows || 0),
          hits: Number(r.hits || 0),
          charsSaved: Number(r.charsSaved || 0),
        })),
      });
    } catch (e) {
      // Migration may not have run yet — return empty stats instead of 500
      // so the admin UI degrades gracefully.
      console.warn('[i18n] tm-stats failed:', e?.message || e);
      return successResponse({ rows: 0, hits: 0, charsSaved: 0, costSavedUSD: 0, byLang: [], error: e?.message });
    }
  }

  return errorResponse('i18n admin endpoint not found', 404);
}

/**
 * Best-effort proactive cache warm. If the locale is supported but its R2
 * cache file does not yet exist, attempt a one-shot incremental generation
 * so that callers (e.g. site creation) get localized data instead of the
 * English fallback. Honours the per-locale daily rate limit; on rate-limit
 * hit / translator failure / unsupported locale this resolves silently and
 * the caller continues with the EN fallback path.
 */
export async function ensureLocaleCached(env, lang) {
  if (!lang || lang === 'en' || !isValidLocale(lang)) return;
  if (!SUPPORTED_LOCALES.has(lang)) return;
  try {
    const cached = await readCachedLocale(env, lang);
    if (cached) return; // already warm — nothing to do
    const rl = await checkRateLimit(env, lang);
    if (!rl.ok) return;
    await regenerateIncremental(env, lang);
    await bumpRateLimit(env, lang, rl.day);
    // Phase C: every R2 write must invalidate the edge — otherwise the
    // very first lazy fetch could pin a stale empty/EN response for the
    // full 7-day TTL.
    await afterLocaleWrite(env, lang);
  } catch (e) {
    console.warn('[i18n] ensureLocaleCached failed:', lang, e.message || e);
  }
}

/**
 * Returns localized wizard seed helpers for a given content language.
 * Falls back per-field to the bundled English catalog so partially-translated
 * (or never-generated) locales still produce sensible defaults. Slugs are
 * always derived from the English source so URLs stay ASCII / stable across
 * languages.
 */
export async function getLocalizedWizardSeed(env, lang) {
  let translated = null;
  if (lang && lang !== 'en') {
    try {
      const cached = await readCachedLocale(env, lang);
      translated = (cached && cached.data && cached.data.wizard) || null;
    } catch (e) {
      console.warn('[i18n] getLocalizedWizardSeed read failed:', lang, e.message || e);
    }
  }
  const enT = EN_WIZARD.seoTitleTemplates || {};
  const enD = EN_WIZARD.seoDescriptionTemplates || {};
  const enC = EN_WIZARD.defaultCategories || {};
  const trT = (translated && translated.seoTitleTemplates) || {};
  const trD = (translated && translated.seoDescriptionTemplates || {}) || {};
  const trC = (translated && translated.defaultCategories) || {};

  const sub = (tpl, brand) => String(tpl || '').replace(/\{\{\s*brand\s*\}\}/g, brand);
  const slugify = (s) => String(s || '').toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  return {
    seoTitle: (cat, brand) => sub(trT[cat] || enT[cat] || enT.general || '{{brand}}', brand),
    seoDescription: (cat, brand) => sub(trD[cat] || enD[cat] || enD.general || '', brand),
    defaultCategories: (cat) => {
      const enCats = enC[cat] || enC.general || {};
      const trCats = trC[cat] || {};
      return Object.keys(enCats).map((key) => {
        const enEntry = enCats[key] || {};
        const locEntry = trCats[key] || {};
        return {
          name: locEntry.name || enEntry.name || '',
          subtitle: locEntry.subtitle || enEntry.subtitle || null,
          slug: slugify(enEntry.name || key),
        };
      });
    },
  };
}

function countKeys(obj) {
  let n = 0;
  for (const v of Object.values(obj || {})) {
    if (v && typeof v === 'object') n += countKeys(v);
    else if (typeof v === 'string') n += 1;
  }
  return n;
}
