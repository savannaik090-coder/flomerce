import { getTranslatorCredentials } from '../workers/platform/admin-worker.js';

const TRANSLATE_ENDPOINT = 'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0';
const MAX_BATCH = 100;

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function translateBatch(env, texts, targetLang, sourceLang = 'en') {
  if (!Array.isArray(texts) || texts.length === 0) return [];

  // Phase D: Translation Memory short-circuit. Only applies when translating
  // FROM English (the bundled platform catalog source) — System B's per-site
  // shopper translations bypass this path entirely by calling
  // translateBatchWithCreds directly. We also require D1 access; in tests or
  // any worker that doesn't bind DB we silently fall through to the plain
  // translator path so behavior is unchanged.
  const useTM = sourceLang === 'en' && !!env?.DB;

  let hashes = [];
  let hits = new Map(); // hash -> translated_text
  let missIndexes;
  if (useTM) {
    const r = await tmLookup(env, texts, targetLang);
    hashes = r.hashes;
    hits = r.hits;
    missIndexes = r.missIndexes;
  } else {
    missIndexes = texts.map((_, i) => i);
  }

  // Translate only the misses through Microsoft. If TM covered everything
  // (every key already known for this target), we skip the API call AND the
  // credential check entirely — that's the steady-state cost win.
  let missTranslations = [];
  if (missIndexes.length > 0) {
    const creds = await getTranslatorCredentials(env);
    if (!creds) throw new Error('Microsoft Translator credentials are not configured.');
    const missTexts = missIndexes.map((i) => texts[i]);
    missTranslations = await translateBatchWithCreds(missTexts, targetLang, sourceLang, creds);
  }

  // Reassemble in original index order so callers (e.g. inflateCatalog) see
  // each translation aligned with its source path.
  const out = new Array(texts.length);
  if (useTM) {
    for (let i = 0; i < texts.length; i++) {
      if (hits.has(hashes[i])) out[i] = hits.get(hashes[i]);
    }
    for (let k = 0; k < missIndexes.length; k++) {
      out[missIndexes[k]] = missTranslations[k];
    }
    // Persist newly translated misses + bump hit counters on the rows we
    // reused, so admin TM stats (rows, hits, chars saved) stay accurate.
    // Dedupe by hash within this batch so duplicate source strings don't
    // produce redundant INSERTs / inflated hit increments — the SQL UPDATE
    // path can only credit one bump per hash per call regardless.
    const seenMissHashes = new Set();
    const newEntries = [];
    for (let k = 0; k < missIndexes.length; k++) {
      const idx = missIndexes[k];
      const h = hashes[idx];
      if (seenMissHashes.has(h)) continue;
      seenMissHashes.add(h);
      newEntries.push({ hash: h, source: texts[idx], translated: missTranslations[k] });
    }
    await tmStore(env, newEntries, targetLang);
    const reusedHashes = [];
    const seenHitHashes = new Set();
    for (let i = 0; i < texts.length; i++) {
      const h = hashes[i];
      if (!hits.has(h) || seenHitHashes.has(h)) continue;
      seenHitHashes.add(h);
      reusedHashes.push(h);
    }
    await tmBumpHits(env, reusedHashes, targetLang);
  } else {
    for (let k = 0; k < missIndexes.length; k++) {
      out[missIndexes[k]] = missTranslations[k];
    }
  }
  return out;
}

/* ------------------------------------------------------------------------ */
/* Translation Memory (TM) — D1-backed cache of source→target translations.  */
/* ------------------------------------------------------------------------ */

// SQLite parameter binding gets unwieldy past ~100 args; chunk lookups so a
// catalog of thousands of strings still uses tight `IN (?, ?, …)` queries.
const TM_LOOKUP_BATCH = 100;

// Self-heal the TM schema on first lookup so production environments that
// deployed the worker without running the standalone migration file still
// get TM benefits as soon as the code goes live. Mirrors the pattern used
// for `i18n_regen_log` and `i18n_overrides` in i18n-worker.js. We can't
// simply import that helper here because translator.js ⇄ i18n-worker.js
// are circular, so the schema lives inline. Idempotent + cheap.
async function ensureTmTable(env) {
  if (!env?.DB) return;
  try {
    await env.DB.batch([
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
    console.warn('[tm] ensureTmTable failed:', e?.message || e);
  }
}

async function tmLookup(env, texts, targetLang) {
  await ensureTmTable(env);
  // Compute every hash up-front in parallel (cheap on Workers) so we can
  // build batched lookups without re-hashing per chunk.
  const hashes = await Promise.all(texts.map(hashString));
  const hits = new Map();
  for (const group of chunk(hashes, TM_LOOKUP_BATCH)) {
    if (group.length === 0) continue;
    const placeholders = group.map(() => '?').join(',');
    try {
      const { results } = await env.DB.prepare(
        `SELECT source_hash, translated_text FROM translation_memory
         WHERE target_lang = ? AND source_hash IN (${placeholders})`,
      ).bind(targetLang, ...group).all();
      for (const r of (results || [])) hits.set(r.source_hash, r.translated_text);
    } catch (e) {
      // TM is a non-fatal optimization. A failed lookup degrades to "treat
      // everything as a miss" — correctness is unchanged, the call just
      // costs full Microsoft quota for this run.
      console.warn('[tm] lookup failed:', e?.message || e);
      return { hashes, hits: new Map(), missIndexes: texts.map((_, i) => i) };
    }
  }
  const missIndexes = [];
  for (let i = 0; i < texts.length; i++) {
    if (!hits.has(hashes[i])) missIndexes.push(i);
  }
  return { hashes, hits, missIndexes };
}

async function tmStore(env, entries, targetLang) {
  if (!entries || entries.length === 0) return;
  const now = Date.now();
  // Use D1 batch for atomic, low-latency multi-row insert. ON CONFLICT lets
  // two concurrent calls translating the same string race safely — the
  // second one just bumps hit_count + last_used_at instead of failing.
  const stmts = entries.map((e) =>
    env.DB.prepare(
      `INSERT INTO translation_memory
         (source_hash, target_lang, source_text, translated_text, hit_count, created_at, last_used_at)
       VALUES (?, ?, ?, ?, 1, ?, ?)
       ON CONFLICT(source_hash, target_lang) DO UPDATE SET
         translated_text = excluded.translated_text,
         hit_count       = hit_count + 1,
         last_used_at    = excluded.last_used_at`,
    ).bind(e.hash, targetLang, e.source, e.translated, now, now),
  );
  try {
    await env.DB.batch(stmts);
  } catch (err) {
    console.warn('[tm] store failed:', err?.message || err);
  }
}

async function tmBumpHits(env, hashes, targetLang) {
  if (!hashes || hashes.length === 0) return;
  const now = Date.now();
  for (const group of chunk(hashes, TM_LOOKUP_BATCH)) {
    if (group.length === 0) continue;
    const placeholders = group.map(() => '?').join(',');
    try {
      await env.DB.prepare(
        `UPDATE translation_memory
         SET hit_count = hit_count + 1, last_used_at = ?
         WHERE target_lang = ? AND source_hash IN (${placeholders})`,
      ).bind(now, targetLang, ...group).run();
    } catch (err) {
      console.warn('[tm] hit-bump failed:', err?.message || err);
    }
  }
}

/**
 * Per-call translator that takes EXPLICIT merchant credentials rather than
 * reading from platform_settings. This is used by System B (per-site shopper
 * translation proxy + the settings "Test" button) so a merchant's key is
 * never confused with the platform-owned key used by System A.
 */
export async function translateBatchWithCreds(texts, targetLang, sourceLang, creds) {
  if (!Array.isArray(texts) || texts.length === 0) return [];
  if (!creds) throw new Error('Translator credentials missing.');
  const { apiKey, region } = creds;
  if (!apiKey) throw new Error('Translator API key missing.');

  const fromParam = (!sourceLang || sourceLang === 'auto')
    ? ''
    : `&from=${encodeURIComponent(sourceLang)}`;
  // textType=html lets us mark interpolation placeholders as untranslatable
  // via <span class="notranslate">…</span>. Without this, Microsoft happily
  // translates the variable name inside `{{date}}` → `{{दिनांक}}`, which
  // breaks i18next interpolation at render time. See protectPlaceholders /
  // restorePlaceholders below — every leaf string is wrapped on the way in
  // and unwrapped on the way out so callers see plain text both sides.
  const url = `${TRANSLATE_ENDPOINT}${fromParam}&to=${encodeURIComponent(targetLang)}&textType=html`;
  const out = [];

  for (const group of chunk(texts, MAX_BATCH)) {
    const headers = {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': apiKey,
    };
    if (region) headers['Ocp-Apim-Subscription-Region'] = region;

    const protectedTexts = group.map(protectPlaceholders);

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(protectedTexts.map((t) => ({ Text: t }))),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Translator HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }
    const data = await res.json();
    for (const item of data) {
      const raw = item?.translations?.[0]?.text ?? '';
      out.push(restorePlaceholders(raw));
    }
  }
  return out;
}

// i18next interpolation tokens look like `{{name}}` or `{{count, number}}`.
// Wrap each one in a no-translate span so Microsoft leaves the contents alone
// when textType=html is used. The span is stripped again on the way back so
// callers (and i18next) see the original `{{...}}` syntax untouched.
const PLACEHOLDER_RE = /\{\{[^{}]+\}\}/g;
const PROTECT_OPEN = '<span class="notranslate" translate="no">';
const PROTECT_CLOSE = '</span>';

export function protectPlaceholders(text) {
  if (typeof text !== 'string' || text.indexOf('{{') === -1) return text;
  return text.replace(PLACEHOLDER_RE, (m) => `${PROTECT_OPEN}${m}${PROTECT_CLOSE}`);
}

export function restorePlaceholders(text) {
  if (typeof text !== 'string') return text;
  // Strip our exact wrapper plus any whitespace the translator may have
  // inserted around it, and also unescape HTML entities Microsoft emits when
  // it sees `{`/`}` in HTML mode.
  let out = text;
  // Tolerate altered attribute order or extra whitespace: match any
  // <span ... class="notranslate" ...> ... </span> wrapping a {{...}} token.
  out = out.replace(
    /<span\b[^>]*\bclass=["']notranslate["'][^>]*>\s*(\{\{[^{}]+\}\})\s*<\/span>/gi,
    '$1',
  );
  // HTML entity decoding for the characters Microsoft escapes inside text
  // nodes when textType=html. Only the safe minimum.
  out = out
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return out;
}

/**
 * Walk a nested catalog object, collecting every string leaf with its
 * dotted-path key. Returns { paths: string[], values: string[] }.
 */
export function flattenCatalog(obj, prefix = '', acc = { paths: [], values: [] }) {
  for (const [k, v] of Object.entries(obj || {})) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      flattenCatalog(v, p, acc);
    } else if (typeof v === 'string') {
      acc.paths.push(p);
      acc.values.push(v);
    }
  }
  return acc;
}

/** Reconstruct a nested object from dotted-path keys + values. */
export function inflateCatalog(paths, values) {
  const root = {};
  for (let i = 0; i < paths.length; i++) {
    const segs = paths[i].split('.');
    let cur = root;
    for (let j = 0; j < segs.length - 1; j++) {
      cur[segs[j]] = cur[segs[j]] || {};
      cur = cur[segs[j]];
    }
    cur[segs[segs.length - 1]] = values[i];
  }
  return root;
}

/**
 * Short, fast, non-cryptographic content fingerprint used to detect when
 * an English source string has changed between translations. We only need
 * collision resistance against typo-level edits, not adversarial input —
 * SHA-256 truncated to 16 hex chars is overkill but cheap on Workers.
 */
export async function hashString(text) {
  const data = new TextEncoder().encode(String(text ?? ''));
  const buf = await crypto.subtle.digest('SHA-256', data);
  const arr = Array.from(new Uint8Array(buf));
  return arr.slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Build a { path: hash } map for every leaf string in a catalog. */
export async function hashCatalog(catalog) {
  const { paths, values } = flattenCatalog(catalog);
  const hashes = {};
  // crypto.subtle.digest is async but cheap; do them in parallel.
  const hashed = await Promise.all(values.map(hashString));
  for (let i = 0; i < paths.length; i++) hashes[paths[i]] = hashed[i];
  return hashes;
}

/**
 * Translate a full catalog from English into targetLang. Used for the very
 * first time a language is generated (no prior translation exists yet).
 */
export async function translateCatalog(env, sourceCatalog, targetLang) {
  const { paths, values } = flattenCatalog(sourceCatalog);
  if (paths.length === 0) return {};
  const translated = await translateBatch(env, values, targetLang, 'en');
  return inflateCatalog(paths, translated);
}

/**
 * Incremental translator. Given the latest English catalog, the previously
 * stored translation, and the previously stored source-hash map, returns:
 *   - merged translation (only changed/new keys re-translated)
 *   - fresh hashes (matching the latest English)
 *   - stats describing what changed
 *
 * Behavior:
 *   - New paths in EN  → translate them.
 *   - Paths whose EN hash differs from the stored hash → re-translate.
 *   - Paths unchanged  → keep the existing translation as-is.
 *   - Paths removed in EN → drop them from the output.
 *
 * If `priorTranslation` is null (locale not generated yet), this falls back
 * to a full translation, equivalent to translateCatalog.
 */
export async function translateCatalogIncremental(env, sourceCatalog, targetLang, priorTranslation, priorHashes) {
  const { paths: enPaths, values: enValues } = flattenCatalog(sourceCatalog);
  const enPathSet = new Set(enPaths);

  // Compute fresh hashes for the latest EN.
  const freshHashes = {};
  const freshHashList = await Promise.all(enValues.map(hashString));
  for (let i = 0; i < enPaths.length; i++) freshHashes[enPaths[i]] = freshHashList[i];

  // No prior data → first-time translation.
  if (!priorTranslation || !priorHashes) {
    if (enPaths.length === 0) {
      return { translation: {}, hashes: freshHashes, stats: { translated: 0, kept: 0, deleted: 0 } };
    }
    const translated = await translateBatch(env, enValues, targetLang, 'en');
    return {
      translation: inflateCatalog(enPaths, translated),
      hashes: freshHashes,
      stats: { translated: enPaths.length, kept: 0, deleted: 0 },
    };
  }

  // Flatten the prior translation so we can look up existing translated values.
  const { paths: priorPaths, values: priorValues } = flattenCatalog(priorTranslation);
  const priorMap = {};
  for (let i = 0; i < priorPaths.length; i++) priorMap[priorPaths[i]] = priorValues[i];

  // Decide which keys to re-translate vs reuse.
  const toTranslatePaths = [];
  const toTranslateValues = [];
  const reuseMap = {}; // path -> kept translation
  let kept = 0;

  for (let i = 0; i < enPaths.length; i++) {
    const p = enPaths[i];
    const v = enValues[i];
    const oldHash = priorHashes[p];
    const newHash = freshHashes[p];
    const hadTranslation = Object.prototype.hasOwnProperty.call(priorMap, p);
    if (hadTranslation && oldHash && oldHash === newHash) {
      reuseMap[p] = priorMap[p];
      kept += 1;
    } else {
      toTranslatePaths.push(p);
      toTranslateValues.push(v);
    }
  }

  // Count deletions for stats.
  let deleted = 0;
  for (const p of priorPaths) if (!enPathSet.has(p)) deleted += 1;

  // Translate only the deltas.
  const translatedDeltas = toTranslatePaths.length
    ? await translateBatch(env, toTranslateValues, targetLang, 'en')
    : [];

  // Merge: every EN path gets either its kept or freshly-translated value.
  const finalPaths = enPaths;
  const finalValues = enPaths.map((p) => {
    const idx = toTranslatePaths.indexOf(p);
    return idx >= 0 ? translatedDeltas[idx] : reuseMap[p];
  });

  return {
    translation: inflateCatalog(finalPaths, finalValues),
    hashes: freshHashes,
    stats: { translated: toTranslatePaths.length, kept, deleted },
  };
}
