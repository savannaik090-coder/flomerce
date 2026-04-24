import { resolveSiteDBById } from '../../utils/site-db.js';

export async function generateSitemap(env, site, baseUrl) {
  const urls = [];

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

  urls.push({
    loc: `${baseUrl}/`,
    changefreq: 'daily',
    priority: '1.0',
  });

  urls.push({
    loc: `${baseUrl}/about`,
    changefreq: 'monthly',
    priority: '0.5',
  });

  urls.push({
    loc: `${baseUrl}/contact`,
    changefreq: 'monthly',
    priority: '0.5',
  });

  urls.push({
    loc: `${baseUrl}/blog`,
    changefreq: 'weekly',
    priority: '0.6',
  });

  const db = await resolveSiteDBById(env, site.id);

  try {
    const categories = await db.prepare(
      `SELECT slug, updated_at FROM categories WHERE site_id = ? AND is_active = 1 ORDER BY display_order ASC`
    ).bind(site.id).all();

    for (const cat of categories.results || []) {
      urls.push({
        loc: `${baseUrl}/category/${cat.slug}`,
        lastmod: formatDate(cat.updated_at),
        changefreq: 'weekly',
        priority: '0.7',
      });
    }
  } catch {}

  try {
    const products = await db.prepare(
      `SELECT slug, updated_at FROM products WHERE site_id = ? AND is_active = 1 ORDER BY created_at DESC`
    ).bind(site.id).all();

    for (const product of products.results || []) {
      urls.push({
        loc: `${baseUrl}/product/${product.slug}`,
        lastmod: formatDate(product.updated_at),
        changefreq: 'weekly',
        priority: '0.8',
      });
    }
  } catch {}

  try {
    const blogPosts = await db.prepare(
      `SELECT slug, updated_at FROM blog_posts WHERE site_id = ? AND status = 'published' ORDER BY published_at DESC`
    ).bind(site.id).all();

    for (const post of blogPosts.results || []) {
      urls.push({
        loc: `${baseUrl}/blog/${post.slug}`,
        lastmod: formatDate(post.updated_at),
        changefreq: 'monthly',
        priority: '0.6',
      });
    }
  } catch {}

  const xmlEscape = (s) => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  const includeAlternates = enabledLangs.length > 0;

  const buildAlternates = (loc) => {
    if (!includeAlternates) return '';
    const lines = [];
    lines.push(`    <xhtml:link rel="alternate" hreflang="${xmlEscape(contentLang)}" href="${xmlEscape(loc)}" />`);
    for (const lang of enabledLangs) {
      const sep = loc.includes('?') ? '&' : '?';
      const altHref = `${loc}${sep}lang=${encodeURIComponent(lang)}`;
      lines.push(`    <xhtml:link rel="alternate" hreflang="${xmlEscape(lang)}" href="${xmlEscape(altHref)}" />`);
    }
    lines.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(loc)}" />`);
    return '\n' + lines.join('\n');
  };

  const urlEntries = urls.map(u => {
    let entry = `  <url>\n    <loc>${xmlEscape(u.loc)}</loc>`;
    if (u.lastmod) entry += `\n    <lastmod>${u.lastmod}</lastmod>`;
    if (u.changefreq) entry += `\n    <changefreq>${u.changefreq}</changefreq>`;
    if (u.priority) entry += `\n    <priority>${u.priority}</priority>`;
    entry += buildAlternates(u.loc);
    entry += `\n  </url>`;
    return entry;
  });

  const xhtmlNs = includeAlternates ? ' xmlns:xhtml="http://www.w3.org/1999/xhtml"' : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${xhtmlNs}>
${urlEntries.join('\n')}
</urlset>`;
}

function formatDate(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  try {
    return new Date(dateStr).toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}
