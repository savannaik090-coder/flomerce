import { injectSEOTags } from './meta-injector.js';
import { generateSitemap } from './sitemap-generator.js';
import { generateRobots } from './robots-generator.js';
import {
  buildOrganizationSchema,
  buildProductSchema,
  buildCategorySchema,
  buildBreadcrumbSchema,
  buildWebsiteSchema,
} from './structured-data.js';
import storefrontConfig from './templates/storefront/seo-config.js';

const TEMPLATE_CONFIGS = {
  storefront: storefrontConfig,
  template1: storefrontConfig,
};

function loadTemplateConfig(templateId) {
  return TEMPLATE_CONFIGS[templateId] || TEMPLATE_CONFIGS['storefront'];
}

// ─── Page type detection ─────────────────────────────────────────────────────

function detectPageType(pathname) {
  if (pathname.startsWith('/product/')) return { type: 'product', slug: pathname.split('/product/')[1]?.split('?')[0] };
  if (pathname.startsWith('/category/')) return { type: 'category', slug: pathname.split('/category/')[1]?.split('?')[0] };
  if (pathname === '/about' || pathname === '/about-us') return { type: 'about' };
  if (pathname === '/contact' || pathname === '/contact-us') return { type: 'contact' };
  if (pathname === '/privacy-policy' || pathname === '/privacy') return { type: 'privacy' };
  if (pathname === '/terms' || pathname === '/terms-and-conditions') return { type: 'terms' };
  return { type: 'home' };
}

// ─── Base URL builder ────────────────────────────────────────────────────────

function buildBaseUrl(request, site) {
  const url = new URL(request.url);
  const proto = url.protocol;
  const hostname = url.hostname;
  return `${proto}//${hostname}`;
}

// ─── SEO data fetchers ───────────────────────────────────────────────────────

async function fetchSiteSEO(env, site) {
  let currency = 'INR';
  try {
    const siteRow = await env.DB.prepare(
      `SELECT currency FROM sites WHERE id = ?`
    ).bind(site.id).first();
    if (siteRow?.currency) currency = siteRow.currency;
  } catch {}

  return {
    seo_title: site.seo_title || null,
    seo_description: site.seo_description || null,
    seo_og_image: site.seo_og_image || null,
    seo_robots: site.seo_robots || 'index, follow',
    google_verification: site.google_verification || null,
    currency,
  };
}

async function fetchProductSEO(env, site, slug) {
  try {
    return await env.DB.prepare(
      `SELECT id, name, slug, description, short_description, price, stock,
              images, thumbnail_url, seo_title, seo_description, seo_og_image
       FROM products WHERE site_id = ? AND slug = ? AND is_active = 1`
    ).bind(site.id, slug).first();
  } catch {
    return null;
  }
}

async function fetchCategorySEO(env, site, slug) {
  try {
    const category = await env.DB.prepare(
      `SELECT id, name, slug, description, image_url, seo_title, seo_description, seo_og_image
       FROM categories WHERE site_id = ? AND slug = ? AND is_active = 1`
    ).bind(site.id, slug).first();

    if (!category) return { category: null, products: [] };

    const products = await env.DB.prepare(
      `SELECT name, slug, thumbnail_url FROM products
       WHERE site_id = ? AND category_id = ? AND is_active = 1
       ORDER BY is_featured DESC, created_at DESC LIMIT 10`
    ).bind(site.id, category.id).all();

    return { category, products: products.results || [] };
  } catch {
    return { category: null, products: [] };
  }
}

async function fetchPageSEO(env, site, pageType) {
  try {
    return await env.DB.prepare(
      `SELECT seo_title, seo_description, seo_og_image
       FROM page_seo WHERE site_id = ? AND page_type = ?`
    ).bind(site.id, pageType).first();
  } catch {
    return null;
  }
}

// ─── Tag builder ─────────────────────────────────────────────────────────────

function buildTags({ pageInfo, site, siteSEO, pageData, templateConfig, baseUrl, canonicalUrl }) {
  const { type } = pageInfo;
  const structuredData = [];
  let title, description, ogImage, ogType, breadcrumbs;

  if (templateConfig.includeOrganizationSchema) {
    structuredData.push(buildOrganizationSchema(site, baseUrl));
  }
  structuredData.push(buildWebsiteSchema(site, baseUrl));

  if (type === 'product' && pageData) {
    title = pageData.seo_title || templateConfig.titleFormat
      .replace('{pageTitle}', pageData.name)
      .replace('{brandName}', site.brand_name);
    description = pageData.seo_description || pageData.short_description || pageData.description || templateConfig.fallbackDescription(site);
    ogImage = pageData.seo_og_image || pageData.thumbnail_url || siteSEO.seo_og_image;
    ogType = 'product';

    if (templateConfig.includeProductSchema) {
      structuredData.push(buildProductSchema(pageData, site, baseUrl));
    }
    if (templateConfig.includeBreadcrumbs) {
      structuredData.push(buildBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Products', url: '/products' },
        { name: pageData.name, url: `/product/${pageData.slug}` },
      ], baseUrl));
    }

  } else if (type === 'category' && pageData?.category) {
    const cat = pageData.category;
    title = cat.seo_title || templateConfig.titleFormat
      .replace('{pageTitle}', cat.name)
      .replace('{brandName}', site.brand_name);
    description = cat.seo_description || cat.description || templateConfig.fallbackDescription(site);
    ogImage = cat.seo_og_image || cat.image_url || siteSEO.seo_og_image;

    if (templateConfig.includeCategorySchema) {
      structuredData.push(buildCategorySchema(cat, pageData.products, site, baseUrl));
    }
    if (templateConfig.includeBreadcrumbs) {
      structuredData.push(buildBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: cat.name, url: `/category/${cat.slug}` },
      ], baseUrl));
    }

  } else if (type === 'about') {
    const pageSEO = pageData;
    title = pageSEO?.seo_title || templateConfig.titleFormat
      .replace('{pageTitle}', 'About Us')
      .replace('{brandName}', site.brand_name);
    description = pageSEO?.seo_description || siteSEO.seo_description || templateConfig.fallbackDescription(site);
    ogImage = pageSEO?.seo_og_image || siteSEO.seo_og_image;

  } else if (type === 'contact') {
    const pageSEO = pageData;
    title = pageSEO?.seo_title || templateConfig.titleFormat
      .replace('{pageTitle}', 'Contact Us')
      .replace('{brandName}', site.brand_name);
    description = pageSEO?.seo_description || siteSEO.seo_description || templateConfig.fallbackDescription(site);
    ogImage = pageSEO?.seo_og_image || siteSEO.seo_og_image;

  } else if (type === 'privacy') {
    const pageSEO = pageData;
    title = pageSEO?.seo_title || templateConfig.titleFormat
      .replace('{pageTitle}', 'Privacy Policy')
      .replace('{brandName}', site.brand_name);
    description = pageSEO?.seo_description || siteSEO.seo_description || templateConfig.fallbackDescription(site);
    ogImage = pageSEO?.seo_og_image || siteSEO.seo_og_image;

  } else if (type === 'terms') {
    const pageSEO = pageData;
    title = pageSEO?.seo_title || templateConfig.titleFormat
      .replace('{pageTitle}', 'Terms & Conditions')
      .replace('{brandName}', site.brand_name);
    description = pageSEO?.seo_description || siteSEO.seo_description || templateConfig.fallbackDescription(site);
    ogImage = pageSEO?.seo_og_image || siteSEO.seo_og_image;

  } else {
    const pageSEO = pageData;
    title = pageSEO?.seo_title || siteSEO.seo_title || templateConfig.fallbackTitle(site);
    description = pageSEO?.seo_description || siteSEO.seo_description || templateConfig.fallbackDescription(site);
    ogImage = pageSEO?.seo_og_image || siteSEO.seo_og_image;
  }

  function absUrl(url) {
    if (!url) return url;
    if (url.startsWith('http')) return url;
    return baseUrl + (url.startsWith('/') ? url : '/' + url);
  }

  const finalOgImage = absUrl(ogImage || site.og_image);
  const finalTwImage = absUrl(ogImage || site.twitter_image || site.og_image);

  return {
    title,
    description,
    ogTitle: site.og_title || title,
    ogDescription: site.og_description || description,
    ogImage: finalOgImage,
    ogType: site.og_type || ogType || 'website',
    ogLocale: 'en_US',
    siteName: site.brand_name,
    canonicalUrl,
    robots: siteSEO.seo_robots || 'index, follow',
    favicon: site.favicon_url || null,
    author: site.brand_name,
    googleVerification: siteSEO.google_verification || null,
    twitterCard: site.twitter_card || 'summary_large_image',
    twitterTitle: site.twitter_title || site.og_title || title,
    twitterDescription: site.twitter_description || site.og_description || description,
    twitterImage: finalTwImage,
    twitterSite: site.twitter_site || null,
    structuredData,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function applySEO(request, env, site, rawHTML) {
  try {
    const url = new URL(request.url);
    const baseUrl = buildBaseUrl(request, site);
    const pathname = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname;
    const canonicalUrl = `${baseUrl}${pathname}`;
    const pageInfo = detectPageType(pathname);
    const templateConfig = loadTemplateConfig(site.template_id);
    const siteSEO = await fetchSiteSEO(env, site);

    let pageData = null;
    if (pageInfo.type === 'product') {
      pageData = await fetchProductSEO(env, site, pageInfo.slug);
    } else if (pageInfo.type === 'category') {
      pageData = await fetchCategorySEO(env, site, pageInfo.slug);
    } else {
      pageData = await fetchPageSEO(env, site, pageInfo.type);
    }

    const siteWithCurrency = { ...site, currency: siteSEO.currency || site.currency || 'INR' };
    const tags = buildTags({ pageInfo, site: siteWithCurrency, siteSEO, pageData, templateConfig, baseUrl, canonicalUrl });

    return injectSEOTags(rawHTML, tags);
  } catch (err) {
    console.error('[SEO] applySEO error:', err);
    return rawHTML;
  }
}

export { generateSitemap, generateRobots };
