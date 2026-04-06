import { jsonResponse } from './helpers.js';
import { PLATFORM_DOMAIN } from '../config.js';

const CDN_CACHE_TTL = 604800;
const CDN_STALE_WHILE_REVALIDATE = 1209600;
const BROWSER_CACHE_TTL = 60;

export function cachedJsonResponse(data, status = 200, request = null) {
  const response = jsonResponse(data, status, request);
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', `public, max-age=${BROWSER_CACHE_TTL}, stale-while-revalidate=${BROWSER_CACHE_TTL * 2}`);
  headers.set('CDN-Cache-Control', `public, max-age=${CDN_CACHE_TTL}, stale-while-revalidate=${CDN_STALE_WHILE_REVALIDATE}`);
  headers.set('Vary', 'Accept-Encoding');
  return new Response(response.body, { status: response.status, headers });
}

export async function purgeStorefrontCache(env, siteId, types = [], resourceIds = {}) {
  try {
    const site = await env.DB.prepare(
      'SELECT subdomain, custom_domain, domain_status FROM sites WHERE id = ?'
    ).bind(siteId).first();

    if (!site) return;

    const domains = [];
    const rootDomain = env.DOMAIN || PLATFORM_DOMAIN;
    if (site.subdomain) domains.push(`${site.subdomain}.${rootDomain}`);
    if (site.custom_domain && site.domain_status === 'verified') domains.push(site.custom_domain);
    domains.push(rootDomain);

    const urls = [];

    for (const type of types) {
      switch (type) {
        case 'site':
          for (const domain of domains) {
            urls.push(`https://${domain}/api/site`);
            urls.push(`https://${domain}/api/site?subdomain=${site.subdomain}`);
          }
          break;
        case 'products':
          for (const domain of domains) {
            urls.push(`https://${domain}/api/products?siteId=${siteId}`);
            urls.push(`https://${domain}/api/products?subdomain=${site.subdomain}`);
          }
          if (resourceIds.productId) {
            for (const domain of domains) {
              urls.push(`https://${domain}/api/products/${resourceIds.productId}?siteId=${siteId}`);
              urls.push(`https://${domain}/api/products/${resourceIds.productId}?subdomain=${site.subdomain}`);
            }
          }
          break;
        case 'categories':
          for (const domain of domains) {
            urls.push(`https://${domain}/api/categories?siteId=${siteId}`);
            urls.push(`https://${domain}/api/categories?subdomain=${site.subdomain}`);
          }
          if (resourceIds.categoryId) {
            for (const domain of domains) {
              urls.push(`https://${domain}/api/categories/${resourceIds.categoryId}?siteId=${siteId}`);
              urls.push(`https://${domain}/api/categories/${resourceIds.categoryId}?subdomain=${site.subdomain}`);
            }
          }
          break;
        case 'blog':
          for (const domain of domains) {
            urls.push(`https://${domain}/api/blog/posts?siteId=${siteId}`);
            urls.push(`https://${domain}/api/blog/posts?subdomain=${site.subdomain}`);
          }
          if (resourceIds.postSlug) {
            for (const domain of domains) {
              urls.push(`https://${domain}/api/blog/post/${resourceIds.postSlug}?siteId=${siteId}`);
              urls.push(`https://${domain}/api/blog/post/${resourceIds.postSlug}?subdomain=${site.subdomain}`);
            }
          }
          break;
        case 'reviews':
          if (resourceIds.productId) {
            for (const domain of domains) {
              urls.push(`https://${domain}/api/reviews/product/${resourceIds.productId}?siteId=${siteId}`);
              urls.push(`https://${domain}/api/reviews/product/${resourceIds.productId}?subdomain=${site.subdomain}`);
            }
          }
          break;
      }
    }

    const cache = caches.default;
    const cachePromises = urls.map(url =>
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
        for (let i = 0; i < urls.length; i += batchSize) {
          const batch = urls.slice(i, i + batchSize);
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
    }

    console.log(`[Cache] Purged ${urls.length} URLs for site ${siteId} (types: ${types.join(', ')})`);
  } catch (e) {
    console.error('[Cache] Purge error:', e.message);
  }
}
