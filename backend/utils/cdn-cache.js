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
import { SUPPORTED_LOCALES } from '../workers/platform/i18n-worker.js';

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

/**
 * Purge cached `/api/i18n/plans/:lang` responses from R2 + Cloudflare's edge
 * for every language we've ever lazy-generated. Called by every admin code
 * path that mutates subscription_plans rows or enterprise_* settings, so
 * non-English visitors always see the freshest plan names / taglines /
 * features within seconds of the owner clicking Save in the admin panel.
 *
 * The `/api/i18n/plans/:lang` endpoint long-caches at the edge (CDN-Cache-
 * Control: max-age=7d) specifically to keep worker invocations near zero in
 * steady state — the trade-off is that every plan/enterprise mutation must
 * call this purge, otherwise visitors keep seeing stale strings until the
 * 7-day TTL expires. R2 acts as the authoritative cache; the CDN URL purge
 * is the fast-path so the next non-English visitor doesn't have to wait for
 * a re-translate either.
 *
 * Languages are discovered by listing the `platform-plans/` R2 prefix, so
 * we never purge URLs that were never generated (saves CF API quota).
 *
 * Failures are logged but never thrown — a stuck purge would otherwise
 * surface to the admin as a save failure, which is misleading. Stale data
 * self-heals at the 7-day TTL in the worst case.
 */
export const PLATFORM_PLANS_R2_PREFIX = 'platform-plans/';

export async function purgePlansLocaleCache(env) {
  if (!env?.STORAGE) {
    console.warn('[cdn-cache] STORAGE binding missing; skipping plans purge');
    return { ok: false, reason: 'no-r2' };
  }

  // Discover which language overlays have been generated so we know which
  // R2 objects to delete and which CDN URLs to purge. The R2 list is the
  // primary source of truth (only generated languages need purging — saves
  // CF API quota), but R2.list itself can fail (transient network blip,
  // throttling, etc.). When that happens we fall back to purging *every*
  // SUPPORTED_LOCALE — bigger purge surface, but it's the only way to
  // guarantee no stale edge entry survives an admin save. The R2 list is
  // the optimization; the SUPPORTED_LOCALES fallback is the correctness
  // net.
  let langs = [];
  let listFailed = false;
  try {
    const list = await env.STORAGE.list({ prefix: PLATFORM_PLANS_R2_PREFIX });
    for (const obj of (list?.objects || [])) {
      const tail = obj.key.slice(PLATFORM_PLANS_R2_PREFIX.length);
      if (tail.endsWith('.json')) {
        const lang = tail.slice(0, -'.json'.length);
        if (lang) langs.push(lang);
      }
    }
  } catch (e) {
    listFailed = true;
    console.warn('[cdn-cache] R2 list failed for plans purge:', e?.message || e);
  }

  // Always delete every R2 object we DID discover — independent of CDN
  // outcome below — so the next worker invocation translates fresh.
  for (const lang of langs) {
    try { await env.STORAGE.delete(`${PLATFORM_PLANS_R2_PREFIX}${lang}.json`); } catch (e) {
      console.warn('[cdn-cache] R2 delete failed for', lang, e?.message || e);
    }
  }

  if (!env?.CF_API_TOKEN || !env?.CF_ZONE_ID) {
    console.warn('[cdn-cache] CF_API_TOKEN or CF_ZONE_ID missing; skipping plans edge purge');
    return { ok: false, reason: 'missing-credentials', langs };
  }

  // Compute the URL purge set. If R2 list failed we have NO knowledge of
  // which langs have edge cache entries, so we fall back to the full
  // SUPPORTED_LOCALES set as a safety net — the previous behavior of
  // purging zero URLs in this case meant a successful admin save could
  // leave stale plan strings at the edge for the full 7d TTL.
  let purgeLangs = langs;
  if (listFailed) {
    purgeLangs = Array.from(SUPPORTED_LOCALES);
    console.warn(
      '[cdn-cache] R2 list failed — falling back to full SUPPORTED_LOCALES purge',
      { count: purgeLangs.length },
    );
  }

  if (purgeLangs.length === 0) {
    return { ok: true, langs: [], skipped: 'no-cached-langs' };
  }

  const host = env.PUBLIC_HOST || env.DOMAIN || PLATFORM_DOMAIN;
  const urls = uniqueUrls(
    purgeLangs.flatMap((lang) => ([
      `https://${host}/api/i18n/plans/${encodeURIComponent(lang)}`,
      `https://www.${host}/api/i18n/plans/${encodeURIComponent(lang)}`,
    ])),
  );

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
    console.log('[cdn-cache] plans purge', {
      ok,
      status: res.status,
      latencyMs: Date.now() - t0,
      langs: purgeLangs.length,
      urls: urls.length,
      listFailed,
      errors: json?.errors,
    });
    return { ok, status: res.status, langs: purgeLangs, listFailed, latencyMs: Date.now() - t0 };
  } catch (e) {
    console.error('[cdn-cache] plans purge threw', { langs: purgeLangs, error: e?.message || e });
    return { ok: false, reason: 'exception', error: e?.message, langs: purgeLangs };
  }
}
