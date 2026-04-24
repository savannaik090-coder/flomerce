import { jsonResponse } from './helpers.js';
import { PLATFORM_DOMAIN } from '../config.js';

const CDN_CACHE_TTL = 86400;
const CDN_STALE_WHILE_REVALIDATE = 604800;
const BROWSER_CACHE_TTL = 60;

const DEFAULT_DEBOUNCE_MS = 30_000;
const PENDING_PURGES = new Map();

function getDebounceMs(env) {
  const raw = Number(env?.PURGE_DEBOUNCE_MS);
  if (Number.isFinite(raw) && raw >= 0) return raw;
  return DEFAULT_DEBOUNCE_MS;
}

export function cachedJsonResponse(data, status = 200, request = null) {
  const response = jsonResponse(data, status, request);
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', `public, max-age=${BROWSER_CACHE_TTL}, stale-while-revalidate=${BROWSER_CACHE_TTL * 2}`);
  headers.set('CDN-Cache-Control', `public, max-age=${CDN_CACHE_TTL}, stale-while-revalidate=${CDN_STALE_WHILE_REVALIDATE}`);
  headers.set('Vary', 'Accept-Encoding');
  return new Response(response.body, { status: response.status, headers });
}

/**
 * Purge storefront edge + Workers caches for a site.
 *
 * By default the actual purge is deferred by `env.PURGE_DEBOUNCE_MS`
 * (default 30s) so that bursts of admin edits collapse into a single
 * Cloudflare API call. The first purge for a site starts a fixed
 * 30s window; every additional call within that window for the same
 * site adds its `types` / `resourceIds` to the pending entry and
 * shares the same eventual flush. The window is NOT reset by later
 * edits, so `ctx.waitUntil()` is bounded to at most one window.
 *
 * Pass `{ immediate: true }` to bypass debouncing for events that must
 * purge instantly (e.g. site deletion, manual admin "purge now" action).
 *
 * In-memory state is per Worker isolate. Two concurrent admin requests
 * landing on different isolates each run their own debouncer — worst
 * case is "one purge per isolate per window per site", which is still
 * dramatically better than one per edit and avoids the latency of a
 * Durable Object or KV round-trip on every write path.
 *
 * Returns a Promise that resolves when the eventual purge completes.
 * Existing callers using `ctx.waitUntil(purgeStorefrontCache(...))`
 * keep working unchanged.
 */
export function purgeStorefrontCache(env, siteId, types = [], resourceIds = {}, options = {}) {
  if (!siteId) return Promise.resolve();

  const debounceMs = options?.immediate ? 0 : getDebounceMs(env);
  const typesArr = Array.isArray(types) ? types : [];

  if (debounceMs <= 0) {
    return runPurgeNow(env, siteId, typesArr, normalizeResourceIds(resourceIds));
  }

  let entry = PENDING_PURGES.get(siteId);
  if (!entry) {
    let resolveDeferred;
    const deferred = new Promise((r) => { resolveDeferred = r; });
    entry = {
      env,
      types: new Set(),
      resources: {
        productIds: new Set(),
        categoryIds: new Set(),
        postSlugs: new Set(),
      },
      deferred,
      resolveDeferred,
      firstScheduledAt: Date.now(),
      timer: null,
    };
    PENDING_PURGES.set(siteId, entry);
    entry.timer = setTimeout(() => { void flushPending(siteId); }, debounceMs);
  } else {
    entry.env = env;
  }

  for (const t of typesArr) entry.types.add(t);
  if (resourceIds?.productId) entry.resources.productIds.add(resourceIds.productId);
  if (resourceIds?.categoryId) entry.resources.categoryIds.add(resourceIds.categoryId);
  if (resourceIds?.postSlug) entry.resources.postSlugs.add(resourceIds.postSlug);

  return entry.deferred;
}

async function flushPending(siteId) {
  const entry = PENDING_PURGES.get(siteId);
  if (!entry) return;
  PENDING_PURGES.delete(siteId);
  try {
    await runPurgeNow(entry.env, siteId, [...entry.types], {
      productIds: [...entry.resources.productIds],
      categoryIds: [...entry.resources.categoryIds],
      postSlugs: [...entry.resources.postSlugs],
    });
  } catch (e) {
    console.error('[Cache] Debounced purge flush failed:', e.message || e);
  } finally {
    try { entry.resolveDeferred(); } catch (e) { /* ignore */ }
  }
}

function normalizeResourceIds(r) {
  return {
    productIds: r?.productId ? [r.productId] : [],
    categoryIds: r?.categoryId ? [r.categoryId] : [],
    postSlugs: r?.postSlug ? [r.postSlug] : [],
  };
}

async function runPurgeNow(env, siteId, types, resources) {
  try {
    const site = await env.DB.prepare(
      'SELECT subdomain, custom_domain, domain_status FROM sites WHERE id = ?'
    ).bind(siteId).first();

    if (!site) return;

    const rootDomain = env.DOMAIN || PLATFORM_DOMAIN;
    const storeDomains = [];
    if (site.subdomain) storeDomains.push(`${site.subdomain}.${rootDomain}`);
    if (site.custom_domain && site.domain_status === 'verified') storeDomains.push(site.custom_domain);

    const allDomains = [...storeDomains, rootDomain];

    const urls = [];

    for (const type of types) {
      switch (type) {
        case 'products':
          for (const domain of allDomains) {
            urls.push(`https://${domain}/api/products?siteId=${siteId}`);
            if (site.subdomain) {
              urls.push(`https://${domain}/api/products?subdomain=${site.subdomain}`);
            }
          }
          for (const productId of resources.productIds) {
            for (const domain of allDomains) {
              urls.push(`https://${domain}/api/products/${productId}?siteId=${siteId}`);
              if (site.subdomain) {
                urls.push(`https://${domain}/api/products/${productId}?subdomain=${site.subdomain}`);
              }
            }
          }
          break;
        case 'categories':
          for (const domain of allDomains) {
            urls.push(`https://${domain}/api/categories?siteId=${siteId}`);
            if (site.subdomain) {
              urls.push(`https://${domain}/api/categories?subdomain=${site.subdomain}`);
            }
          }
          for (const categoryId of resources.categoryIds) {
            for (const domain of allDomains) {
              urls.push(`https://${domain}/api/categories/${categoryId}?siteId=${siteId}`);
              if (site.subdomain) {
                urls.push(`https://${domain}/api/categories/${categoryId}?subdomain=${site.subdomain}`);
              }
            }
          }
          break;
        case 'blog':
          for (const domain of allDomains) {
            urls.push(`https://${domain}/api/blog/posts?siteId=${siteId}`);
            if (site.subdomain) {
              urls.push(`https://${domain}/api/blog/posts?subdomain=${site.subdomain}`);
            }
          }
          for (const postSlug of resources.postSlugs) {
            for (const domain of allDomains) {
              urls.push(`https://${domain}/api/blog/post/${postSlug}?siteId=${siteId}`);
              if (site.subdomain) {
                urls.push(`https://${domain}/api/blog/post/${postSlug}?subdomain=${site.subdomain}`);
              }
            }
          }
          break;
        case 'reviews':
          for (const productId of resources.productIds) {
            for (const domain of allDomains) {
              urls.push(`https://${domain}/api/reviews/product/${productId}?siteId=${siteId}`);
              if (site.subdomain) {
                urls.push(`https://${domain}/api/reviews/product/${productId}?subdomain=${site.subdomain}`);
              }
            }
          }
          break;
        case 'site':
          for (const domain of allDomains) {
            urls.push(`https://${domain}/api/site?siteId=${siteId}`);
            if (site.subdomain) {
              urls.push(`https://${domain}/api/site?subdomain=${site.subdomain}`);
            }
          }
          break;
      }
    }

    const uniqueUrls = [...new Set(urls)];

    const cache = caches.default;
    const cachePromises = uniqueUrls.map(url =>
      cache.delete(new Request(url)).catch(e =>
        console.error(`[Cache] Workers Cache API purge failed for ${url}:`, e.message)
      )
    );
    await Promise.allSettled(cachePromises);

    const token = env.CF_API_TOKEN;
    const zoneId = env.CF_ZONE_ID;
    if (token && zoneId) {
      try {
        const batchSize = 30;
        for (let i = 0; i < uniqueUrls.length; i += batchSize) {
          const batch = uniqueUrls.slice(i, i + batchSize);
          const resp = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ files: batch }),
          });
          if (!resp.ok) {
            const errText = await resp.text().catch(() => '');
            console.error(`[Cache] Cloudflare API purge failed (batch ${i}):`, resp.status, errText);
          }
        }
      } catch (apiErr) {
        console.error('[Cache] Cloudflare API purge error:', apiErr.message);
      }
    } else {
      console.warn(`[Cache] CF_API_TOKEN not configured — Cloudflare CDN purge skipped for site ${siteId}. Only Workers Cache API purge was performed.`);
    }

    console.log(`[Cache] Purged ${uniqueUrls.length} URLs for site ${siteId} (types: ${types.join(', ')})`);
  } catch (e) {
    console.error('[Cache] Purge error:', e.message);
  }
}
