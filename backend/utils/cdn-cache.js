/**
 * CDN cache helpers for the i18n locale endpoint (Phase C).
 *
 * The platform serves locale JSON from `/api/i18n/locale/:lang`. Once we tell
 * Cloudflare to cache that response for a week, every per-tab fetch is a
 * lightweight edge HIT instead of a Worker invocation. The cost of long-TTL
 * caching is invalidation: every code path that mutates the cached catalog
 * MUST call `purgeLocaleCache(env, lang)` so shoppers see the new strings
 * within seconds — never wait out the 7-day TTL.
 *
 * Cloudflare's free plan does NOT support Cache-Tag-based purges, so we use
 * URL-based purge here. Each locale lives at exactly one URL (the public
 * locale endpoint), so purging it by URL is functionally identical to a
 * tag-based purge for our case.
 */

import { PLATFORM_DOMAIN } from '../config.js';

/**
 * Purge the cached `/api/i18n/locale/:lang` response from Cloudflare's edge.
 *
 * Failure modes are non-fatal — if the purge call fails (network blip,
 * expired token, missing creds) we log but never throw. Stale content will
 * self-heal at the 7-day TTL, and the user's regenerate response succeeds
 * regardless. Returns a result object so callers can include it in admin
 * telemetry if desired.
 */
export async function purgeLocaleCache(env, lang) {
  if (!lang || typeof lang !== 'string') {
    return { ok: false, reason: 'invalid-lang' };
  }
  if (!env?.CF_API_TOKEN || !env?.CF_ZONE_ID) {
    console.warn('[cdn-cache] CF_API_TOKEN or CF_ZONE_ID missing; skipping i18n edge purge for', lang);
    return { ok: false, reason: 'missing-credentials' };
  }
  const host = env.PUBLIC_HOST || env.DOMAIN || PLATFORM_DOMAIN;
  // Build every URL variant Cloudflare may have keyed the response under.
  // The public endpoint is the canonical one, but a few callers may hit it
  // via the bare apex too — purge both to be safe.
  const urls = uniqueUrls([
    `https://${host}/api/i18n/locale/${encodeURIComponent(lang)}`,
    `https://www.${host}/api/i18n/locale/${encodeURIComponent(lang)}`,
  ]);

  const t0 = Date.now();
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/purge_cache`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.CF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files: urls }),
      },
    );
    const json = await res.json().catch(() => ({}));
    const ok = res.ok && json.success !== false;
    console.log('[cdn-cache] i18n purge', {
      lang,
      ok,
      status: res.status,
      latencyMs: Date.now() - t0,
      urls: urls.length,
      errors: json?.errors,
    });
    return { ok, status: res.status, body: json, latencyMs: Date.now() - t0 };
  } catch (e) {
    console.error('[cdn-cache] i18n purge threw', { lang, latencyMs: Date.now() - t0, error: e?.message || e });
    return { ok: false, reason: 'exception', error: e?.message };
  }
}

function uniqueUrls(urls) {
  return [...new Set(urls.filter(Boolean))];
}
