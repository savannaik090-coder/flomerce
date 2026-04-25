import { errorResponse, handleCORS } from '../../utils/helpers.js';
import { translateContentBatch } from '../../utils/server-translator.js';
import manifest from '../../i18n-manifest.json';

/**
 * Pre-translated chrome+defaults bundle for the storefront.
 *
 * GET /api/storefront/:siteId/translations/:lang?v=<bundleVersion>
 *
 * Returns the entire dictionary of source → translated strings the
 * storefront client could ever need to render its chrome (button labels,
 * empty states, modal copy, ~440 hard-coded literals) plus the
 * placeholder default content (sample products, demo reviews, hero
 * fallbacks). Merchant-specific settings text is translated separately
 * inside /api/site, so this bundle does NOT include settings — chrome
 * and defaults change only with code deploys, which means this response
 * is safe to cache hard at the Cloudflare edge.
 *
 * Cache strategy: URL is versioned by the i18n manifest hash (bumped on
 * every deploy that adds/changes a literal) AND by the merchant's
 * translator config (so toggling the feature off invalidates). Headers
 * tell the edge to keep it for a year, browsers for 5 minutes (so a
 * shopper rotating through pages isn't paying repeated fetches but a
 * fresh tab still verifies version freshness).
 *
 * On cold cache: walks every manifest string through
 * translateContentBatch which D1-caches per (site, target_lang, hash).
 * On a fully-warm D1 cache the response is ~50ms with zero MS API
 * calls; on a totally cold cache it's one MS API round-trip per ~1000
 * strings, then permanently warm.
 *
 * Failure modes:
 *   - target == site content_language: returns identity dict (no-op,
 *     still cached)
 *   - merchant translator disabled / language not allowed: returns
 *     identity dict + X-Translator-Disabled: 1 (still cached so we
 *     don't hammer the worker on every page load)
 *   - translator API error mid-bundle: returns originals for the
 *     un-translated subset (graceful — shopper sees English instead of
 *     blank, which is better than crashing)
 */

function djb2Hash(s) {
  let h = 5381;
  const str = String(s ?? '');
  for (let i = 0; i < str.length; i++) {
    h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

function buildIdentityDict(strings) {
  const dict = {};
  for (const s of strings) dict[djb2Hash(s)] = s;
  return dict;
}

function bundleResponse(payload, { cacheable, status = 200, extraHeaders = {} } = {}) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Vary': 'Accept-Encoding',
    ...extraHeaders,
  };
  if (cacheable) {
    headers['Cache-Control'] = 'public, max-age=300, s-maxage=2592000';
    headers['CDN-Cache-Control'] = 'public, s-maxage=31536000, immutable';
    headers['Cloudflare-CDN-Cache-Control'] = 'public, s-maxage=31536000, immutable';
  } else {
    headers['Cache-Control'] = 'no-store';
  }
  return new Response(JSON.stringify(payload), { status, headers });
}

export const TRANSLATIONS_MANIFEST_HASH = manifest.hash;

export async function handleTranslationsBundle(request, env, path /*, ctx */) {
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;
  if (request.method !== 'GET') return errorResponse('Method not allowed', 405);

  const parts = path.split('/').filter(Boolean);
  // Expected: ['api', 'storefront', '<siteId>', 'translations', '<lang>']
  const siteId = parts[2];
  const lang = (parts[4] || '').trim().toLowerCase();
  if (!siteId || !lang) return errorResponse('siteId and lang are required', 400);

  const language = lang;
  const bundle = {
    language,
    manifestHash: manifest.hash,
    count: manifest.count,
    dict: {},
  };

  let siteRow = null;
  try {
    siteRow = await env.DB.prepare(
      `SELECT id, content_language, translator_enabled, translator_languages
       FROM sites WHERE id = ? AND is_active = 1`
    ).bind(siteId).first();
  } catch (e) {
    console.error('[translations-bundle] site lookup failed:', e?.message || e);
  }

  if (!siteRow) {
    return bundleResponse(
      { ...bundle, dict: buildIdentityDict(manifest.strings), warning: 'site_not_found' },
      { cacheable: false, status: 404 },
    );
  }

  const contentLanguage = (siteRow.content_language || 'en').toLowerCase();
  // No-op when target equals source — return identity dict so the client
  // can still mount synchronously without a separate code path.
  if (language === contentLanguage) {
    return bundleResponse(
      { ...bundle, dict: buildIdentityDict(manifest.strings), identity: true },
      { cacheable: true },
    );
  }

  const enabled = !!siteRow.translator_enabled;
  let allowed = [];
  try {
    const raw = siteRow.translator_languages;
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) allowed = parsed.map((l) => String(l).toLowerCase());
    }
  } catch {}

  if (!enabled || !allowed.includes(language)) {
    return bundleResponse(
      { ...bundle, dict: buildIdentityDict(manifest.strings), disabled: true },
      { cacheable: true, extraHeaders: { 'X-Translator-Disabled': '1' } },
    );
  }

  // Pump the manifest through the standard translation pipeline. The
  // server-translator handles D1 caching + MS API + daily cap + usage
  // accounting for us, so this loop is just batching.
  const BATCH = 200;
  const dict = {};
  let capped = false;
  let translatorError = null;

  for (let i = 0; i < manifest.strings.length; i += BATCH) {
    const slice = manifest.strings.slice(i, i + BATCH);
    let result;
    try {
      // bypassDailyCap: chrome+defaults bundle warming is one-time per
      // (site,lang) and forever D1-cached after — must not consume the
      // merchant's product-translation budget.
      result = await translateContentBatch(env, siteId, slice, language, { bypassDailyCap: true });
    } catch (e) {
      console.error('[translations-bundle] batch failed:', e?.message || e);
      translatorError = 'translator_error';
      for (const s of slice) dict[djb2Hash(s)] = s;
      continue;
    }
    if (result?.error && !result.translations) {
      translatorError = result.error;
      for (const s of slice) dict[djb2Hash(s)] = s;
      continue;
    }
    if (result?.capped) capped = true;
    const out = Array.isArray(result?.translations) ? result.translations : [];
    for (let j = 0; j < slice.length; j++) {
      const src = slice[j];
      const xlated = (out[j] != null && out[j] !== '') ? out[j] : src;
      dict[djb2Hash(src)] = xlated;
    }
    if (result?.error === 'translator_disabled' || result?.error === 'target_not_allowed') {
      // Settings changed between the row read above and this call —
      // serve identity for the remainder.
      for (let k = i + BATCH; k < manifest.strings.length; k++) {
        dict[djb2Hash(manifest.strings[k])] = manifest.strings[k];
      }
      translatorError = result.error;
      break;
    }
  }

  return bundleResponse(
    {
      ...bundle,
      dict,
      capped,
      ...(translatorError ? { warning: translatorError } : {}),
    },
    { cacheable: true },
  );
}
