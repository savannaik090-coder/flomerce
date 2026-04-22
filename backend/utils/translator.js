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
  const creds = await getTranslatorCredentials(env);
  if (!creds) {
    throw new Error('Microsoft Translator credentials are not configured.');
  }
  return translateBatchWithCreds(texts, targetLang, sourceLang, creds);
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
