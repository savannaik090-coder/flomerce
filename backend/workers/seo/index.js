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
import { resolveSiteDBById } from '../../utils/site-db.js';
import { normalizePlanName, getPlanLimitsConfig } from '../../utils/usage-tracker.js';
import { translateContentBatch } from '../../utils/server-translator.js';

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
  if (pathname.startsWith('/blog/')) return { type: 'blog', slug: pathname.split('/blog/')[1]?.split('?')[0] };
  if (pathname === '/blog') return { type: 'blogList' };
  if (pathname === '/about' || pathname === '/about-us') return { type: 'about' };
  if (pathname === '/contact' || pathname === '/contact-us') return { type: 'contact' };
  if (pathname === '/privacy-policy' || pathname === '/privacy') return { type: 'privacy' };
  if (pathname === '/terms' || pathname === '/terms-and-conditions') return { type: 'terms' };
  return { type: 'home' };
}

// ─── Base URL builder ────────────────────────────────────────────────────────

function buildBaseUrl(request, site) {
  if (site.custom_domain && site.domain_status === 'verified') {
    return `https://${site.custom_domain}`;
  }
  const url = new URL(request.url);
  return `${url.protocol}//${url.hostname}`;
}

// ─── SEO data fetchers ───────────────────────────────────────────────────────

async function fetchSiteSEO(env, site) {
  return {
    seo_title: site.seo_title || null,
    seo_description: site.seo_description || null,
    seo_og_image: site.seo_og_image || null,
    seo_robots: site.seo_robots || 'index, follow',
    seo_keywords: site.seo_keywords || null,
    google_verification: site.google_verification || null,
    currency: site.currency || 'INR',
  };
}

async function fetchProductSEO(db, site, slug) {
  try {
    return await db.prepare(
      `SELECT id, name, slug, description, short_description, price, compare_price, stock,
              images, thumbnail_url, sku, barcode, seo_title, seo_description, seo_og_image, seo_keywords
       FROM products WHERE site_id = ? AND slug = ? AND is_active = 1`
    ).bind(site.id, slug).first();
  } catch {
    return null;
  }
}

async function fetchProductReviewData(db, site, productId) {
  try {
    const stats = await db.prepare(
      `SELECT COUNT(*) as total, AVG(rating) as avg_rating
       FROM reviews WHERE site_id = ? AND product_id = ? AND status = 'approved' AND is_approved = 1`
    ).bind(site.id, productId).first();

    if (!stats || !stats.total || stats.total === 0) return null;

    const recentReviews = await db.prepare(
      `SELECT customer_name, rating, title, content, created_at
       FROM reviews WHERE site_id = ? AND product_id = ? AND status = 'approved' AND is_approved = 1
       ORDER BY created_at DESC LIMIT 5`
    ).bind(site.id, productId).all();

    return {
      total: stats.total,
      avgRating: stats.avg_rating ? Math.round(stats.avg_rating * 10) / 10 : 0,
      reviews: recentReviews.results || [],
    };
  } catch {
    return null;
  }
}

async function fetchCategorySEO(db, site, slug) {
  try {
    const category = await db.prepare(
      `SELECT id, name, slug, description, image_url, seo_title, seo_description, seo_og_image, seo_keywords
       FROM categories WHERE site_id = ? AND slug = ? AND is_active = 1`
    ).bind(site.id, slug).first();

    if (!category) return { category: null, products: [] };

    const products = await db.prepare(
      `SELECT name, slug, thumbnail_url FROM products
       WHERE site_id = ? AND category_id = ? AND is_active = 1
       ORDER BY is_featured DESC, created_at DESC LIMIT 10`
    ).bind(site.id, category.id).all();

    return { category, products: products.results || [] };
  } catch {
    return { category: null, products: [] };
  }
}

async function fetchBlogPostSEO(db, site, slug) {
  try {
    return await db.prepare(
      `SELECT id, title, slug, excerpt, content,
              COALESCE(featured_image, cover_image) as featured_image,
              COALESCE(seo_title, meta_title) as seo_title,
              COALESCE(seo_description, meta_description) as seo_description,
              seo_og_image, seo_keywords,
              COALESCE(author_name, author) as author_name,
              published_at, updated_at
       FROM blog_posts WHERE site_id = ? AND slug = ? AND status = 'published'`
    ).bind(site.id, slug).first();
  } catch {
    return null;
  }
}

async function fetchPageSEO(db, site, pageType) {
  try {
    return await db.prepare(
      `SELECT seo_title, seo_description, seo_og_image, seo_keywords
       FROM page_seo WHERE site_id = ? AND page_type = ?`
    ).bind(site.id, pageType).first();
  } catch {
    return null;
  }
}

// ─── Tag builder ─────────────────────────────────────────────────────────────

function buildTags({ pageInfo, site, siteSEO, pageData, templateConfig, baseUrl, canonicalUrl, reviewData, hasAdvancedSeo = true }) {
  const { type } = pageInfo;
  const structuredData = [];
  let title, description, ogImage, ogType, breadcrumbs, keywords;

  function absUrl(url) {
    if (!url) return url;
    if (url.startsWith('http')) return url;
    return baseUrl + (url.startsWith('/') ? url : '/' + url);
  }

  if (hasAdvancedSeo) {
    if (templateConfig.includeOrganizationSchema) {
      structuredData.push(buildOrganizationSchema(site, baseUrl));
    }
    structuredData.push(buildWebsiteSchema(site, baseUrl));
  }

  if (type === 'product' && pageData) {
    title = pageData.seo_title || templateConfig.titleFormat
      .replace('{pageTitle}', pageData.name)
      .replace('{brandName}', site.brand_name);
    description = pageData.seo_description || pageData.short_description || pageData.description || templateConfig.fallbackDescription(site);
    ogImage = pageData.seo_og_image || pageData.thumbnail_url || siteSEO.seo_og_image;
    ogType = 'product';
    keywords = pageData.seo_keywords || null;

    if (hasAdvancedSeo && templateConfig.includeProductSchema) {
      structuredData.push(buildProductSchema(pageData, site, baseUrl, reviewData));
    }
    if (hasAdvancedSeo && templateConfig.includeBreadcrumbs) {
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
    keywords = cat.seo_keywords || null;

    if (hasAdvancedSeo && templateConfig.includeCategorySchema) {
      structuredData.push(buildCategorySchema(cat, pageData.products, site, baseUrl));
    }
    if (hasAdvancedSeo && templateConfig.includeBreadcrumbs) {
      structuredData.push(buildBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: cat.name, url: `/category/${cat.slug}` },
      ], baseUrl));
    }

  } else if (type === 'blog' && pageData) {
    title = pageData.seo_title || templateConfig.titleFormat
      .replace('{pageTitle}', pageData.title)
      .replace('{brandName}', site.brand_name);
    description = pageData.seo_description || pageData.excerpt || (pageData.content ? pageData.content.replace(/<[^>]*>/g, '').substring(0, 160).trim() : '') || templateConfig.fallbackDescription(site);
    ogImage = pageData.seo_og_image || pageData.featured_image || siteSEO.seo_og_image;
    ogType = 'article';
    keywords = pageData.seo_keywords || null;

    if (hasAdvancedSeo) {
      const articleSchema = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: pageData.title,
        description: pageData.excerpt || '',
        url: `${baseUrl}/blog/${pageData.slug}`,
        datePublished: pageData.published_at || undefined,
        dateModified: pageData.updated_at || pageData.published_at || undefined,
        author: { '@type': 'Person', name: pageData.author_name || site.brand_name },
        publisher: { '@type': 'Organization', name: site.brand_name },
      };
      if (pageData.featured_image) {
        articleSchema.image = absUrl(pageData.featured_image);
      }
      structuredData.push(JSON.stringify(articleSchema));

      if (templateConfig.includeBreadcrumbs) {
        structuredData.push(buildBreadcrumbSchema([
          { name: 'Home', url: '/' },
          { name: 'Blog', url: '/blog' },
          { name: pageData.title, url: `/blog/${pageData.slug}` },
        ], baseUrl));
      }
    }

  } else if (type === 'blogList') {
    title = templateConfig.titleFormat
      .replace('{pageTitle}', 'Blog')
      .replace('{brandName}', site.brand_name);
    description = siteSEO.seo_description || templateConfig.fallbackDescription(site);
    ogImage = siteSEO.seo_og_image;

  } else if (type === 'about') {
    const pageSEO = pageData;
    title = pageSEO?.seo_title || templateConfig.titleFormat
      .replace('{pageTitle}', 'About Us')
      .replace('{brandName}', site.brand_name);
    description = pageSEO?.seo_description || siteSEO.seo_description || templateConfig.fallbackDescription(site);
    ogImage = pageSEO?.seo_og_image || siteSEO.seo_og_image;
    keywords = pageSEO?.seo_keywords || null;

  } else if (type === 'contact') {
    const pageSEO = pageData;
    title = pageSEO?.seo_title || templateConfig.titleFormat
      .replace('{pageTitle}', 'Contact Us')
      .replace('{brandName}', site.brand_name);
    description = pageSEO?.seo_description || siteSEO.seo_description || templateConfig.fallbackDescription(site);
    ogImage = pageSEO?.seo_og_image || siteSEO.seo_og_image;
    keywords = pageSEO?.seo_keywords || null;

  } else if (type === 'privacy') {
    const pageSEO = pageData;
    title = pageSEO?.seo_title || templateConfig.titleFormat
      .replace('{pageTitle}', 'Privacy Policy')
      .replace('{brandName}', site.brand_name);
    description = pageSEO?.seo_description || siteSEO.seo_description || templateConfig.fallbackDescription(site);
    ogImage = pageSEO?.seo_og_image || siteSEO.seo_og_image;
    keywords = pageSEO?.seo_keywords || null;

  } else if (type === 'terms') {
    const pageSEO = pageData;
    title = pageSEO?.seo_title || templateConfig.titleFormat
      .replace('{pageTitle}', 'Terms & Conditions')
      .replace('{brandName}', site.brand_name);
    description = pageSEO?.seo_description || siteSEO.seo_description || templateConfig.fallbackDescription(site);
    ogImage = pageSEO?.seo_og_image || siteSEO.seo_og_image;
    keywords = pageSEO?.seo_keywords || null;

  } else {
    const pageSEO = pageData;
    title = pageSEO?.seo_title || siteSEO.seo_title || templateConfig.fallbackTitle(site);
    description = pageSEO?.seo_description || siteSEO.seo_description || templateConfig.fallbackDescription(site);
    ogImage = pageSEO?.seo_og_image || siteSEO.seo_og_image;
    keywords = pageSEO?.seo_keywords || siteSEO.seo_keywords || null;
  }

  const resolvedOgImage = ogImage || site.og_image || site.logo_url || null;
  const finalOgImage = absUrl(resolvedOgImage);
  const finalTwImage = absUrl(ogImage || site.twitter_image || site.og_image || site.logo_url || null);

  return {
    title,
    description,
    keywords: keywords || siteSEO.seo_keywords || null,
    ogTitle: site.og_title || title,
    ogDescription: site.og_description || description,
    ogImage: finalOgImage,
    ogType: ogType || site.og_type || 'website',
    ogLocale: 'en_US',
    siteName: site.brand_name,
    canonicalUrl,
    robots: siteSEO.seo_robots || 'index, follow',
    favicon: site.favicon_url || site.logo_url || null,
    author: site.brand_name,
    themeColor: site.primary_color || '#000000',
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
    const pageInfo = detectPageType(pathname);
    const templateConfig = loadTemplateConfig(site.template_id);
    const siteSEO = await fetchSiteSEO(env, site);

    const planKey = normalizePlanName(site.subscription_plan);
    const planConfig = getPlanLimitsConfig(planKey);
    const hasAdvancedSeo = planConfig.advancedSeo;

    const db = await resolveSiteDBById(env, site.id);

    let pageData = null;
    let reviewData = null;
    if (pageInfo.type === 'product') {
      pageData = await fetchProductSEO(db, site, pageInfo.slug);
      if (pageData?.id) {
        reviewData = await fetchProductReviewData(db, site, pageData.id);
      }
    } else if (pageInfo.type === 'category') {
      pageData = await fetchCategorySEO(db, site, pageInfo.slug);
    } else if (pageInfo.type === 'blog') {
      pageData = await fetchBlogPostSEO(db, site, pageInfo.slug);
    } else {
      pageData = await fetchPageSEO(db, site, pageInfo.type);
    }

    const contentLang = (site.content_language || 'en').trim();
    let enabledLangs = [];
    if (site.translator_enabled) {
      try {
        const parsed = site.translator_languages ? JSON.parse(site.translator_languages) : [];
        if (Array.isArray(parsed)) {
          enabledLangs = parsed
            .map((l) => (typeof l === 'string' ? l.trim() : ''))
            .filter((l) => l && l !== contentLang);
        }
      } catch { /* ignore */ }
    }

    const requestedLangRaw = url.searchParams.get('lang');
    const requestedLang = requestedLangRaw ? requestedLangRaw.trim() : '';
    const activeLang = (requestedLang && requestedLang !== contentLang && enabledLangs.includes(requestedLang))
      ? requestedLang
      : contentLang;

    const baseSearchParams = new URLSearchParams(url.search);
    baseSearchParams.delete('lang');
    const baseQuery = baseSearchParams.toString();
    const buildLangUrl = (lang) => {
      const sp = new URLSearchParams(baseQuery);
      if (lang && lang !== contentLang) sp.set('lang', lang);
      const qs = sp.toString();
      return `${baseUrl}${pathname}${qs ? `?${qs}` : ''}`;
    };

    const canonicalUrl = buildLangUrl(activeLang);

    const siteWithCurrency = { ...site, currency: siteSEO.currency || site.currency || 'INR' };
    const tags = buildTags({ pageInfo, site: siteWithCurrency, siteSEO, pageData, templateConfig, baseUrl, canonicalUrl, reviewData, hasAdvancedSeo });

    if (enabledLangs.length > 0) {
      const alts = [];
      alts.push({ lang: contentLang, href: buildLangUrl(contentLang) });
      for (const lang of enabledLangs) {
        alts.push({ lang, href: buildLangUrl(lang) });
      }
      alts.push({ lang: 'x-default', href: buildLangUrl(contentLang) });
      tags.hreflangAlternates = alts;
    }

    tags.htmlLang = activeLang;
    tags.ogLocale = ogLocaleFor(activeLang);

    if (activeLang !== contentLang) {
      await translateTagsInPlace(env, site.id, tags, activeLang);
    }

    return injectSEOTags(rawHTML, tags);
  } catch (err) {
    console.error('[SEO] applySEO error:', err);
    return rawHTML;
  }
}

function ogLocaleFor(lang) {
  if (!lang) return 'en_US';
  const m = String(lang).split(/[-_]/);
  const base = (m[0] || '').toLowerCase();
  const region = (m[1] || '').toUpperCase();
  if (region) return `${base}_${region}`;
  const defaults = { en: 'en_US', hi: 'hi_IN', es: 'es_ES', fr: 'fr_FR', de: 'de_DE', it: 'it_IT', pt: 'pt_BR', ja: 'ja_JP', zh: 'zh_CN', ar: 'ar_AR', ru: 'ru_RU', ko: 'ko_KR' };
  return defaults[base] || `${base}_${base.toUpperCase()}`;
}

async function translateTagsInPlace(env, siteId, tags, targetLang) {
  const stringFields = ['title', 'description', 'ogTitle', 'ogDescription', 'twitterTitle', 'twitterDescription', 'siteName', 'author'];
  const inputs = [];
  const inputKeys = [];
  for (const f of stringFields) {
    if (typeof tags[f] === 'string' && tags[f].trim().length > 0) {
      inputKeys.push(f);
      inputs.push(tags[f]);
    }
  }

  const schemaItems = [];
  if (Array.isArray(tags.structuredData)) {
    for (let i = 0; i < tags.structuredData.length; i++) {
      try {
        const obj = JSON.parse(tags.structuredData[i]);
        const fields = collectSchemaTranslatableFields(obj);
        if (fields.length > 0) {
          schemaItems.push({ index: i, obj, fields });
          for (const f of fields) inputs.push(f.value);
        }
      } catch { /* skip non-JSON */ }
    }
  }

  if (inputs.length === 0) return;

  const result = await translateContentBatch(env, siteId, inputs, targetLang);
  if (!result || !Array.isArray(result.translations) || result.translations.length !== inputs.length) {
    return;
  }

  let cursor = 0;
  for (let i = 0; i < inputKeys.length; i++) {
    tags[inputKeys[i]] = result.translations[cursor++];
  }
  for (const item of schemaItems) {
    for (const f of item.fields) {
      f.set(result.translations[cursor++]);
    }
    try {
      tags.structuredData[item.index] = JSON.stringify(item.obj);
    } catch { /* leave original */ }
  }
}

function collectSchemaTranslatableFields(obj) {
  const out = [];
  const TRANSLATE_KEYS = new Set(['name', 'headline', 'description', 'alternateName']);
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (TRANSLATE_KEYS.has(k) && typeof v === 'string' && v.trim().length > 0) {
        out.push({
          value: v,
          set: (newVal) => { node[k] = newVal; },
        });
      } else if (v && typeof v === 'object') {
        walk(v);
      }
    }
  }
  walk(obj);
  return out;
}

export { generateSitemap, generateRobots };
