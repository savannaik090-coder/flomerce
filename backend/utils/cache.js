import { jsonResponse } from './helpers.js';
import { PLATFORM_DOMAIN } from '../config.js';

const CACHE_TTL = 604800;
const STALE_WHILE_REVALIDATE = 1209600;

export function cachedJsonResponse(data, status = 200, request = null) {
  const response = jsonResponse(data, status, request);
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', `public, max-age=${CACHE_TTL}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`);
  headers.set('CDN-Cache-Control', `public, max-age=${CACHE_TTL}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`);
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

    const cache = caches.default;
    const urls = [];

    for (const type of types) {
      switch (type) {
        case 'site':
          for (const domain of domains) {
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
          }
          if (resourceIds.postSlug) {
            for (const domain of domains) {
              urls.push(`https://${domain}/api/blog/post/${resourceIds.postSlug}?siteId=${siteId}`);
            }
          }
          break;
        case 'reviews':
          if (resourceIds.productId) {
            for (const domain of domains) {
              urls.push(`https://${domain}/api/reviews/product/${resourceIds.productId}?siteId=${siteId}`);
            }
          }
          break;
      }
    }

    const purgePromises = urls.map(url =>
      cache.delete(new Request(url)).catch(e =>
        console.error(`[Cache] Failed to purge ${url}:`, e.message)
      )
    );

    await Promise.allSettled(purgePromises);
    console.log(`[Cache] Purged ${purgePromises.length} URLs for site ${siteId} (types: ${types.join(', ')})`);
  } catch (e) {
    console.error('[Cache] Purge error:', e.message);
  }
}
