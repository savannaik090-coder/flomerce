import { resolveSiteDBById } from '../../utils/site-db.js';

export async function generateSitemap(env, site, baseUrl) {
  const urls = [];

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

  const urlEntries = urls.map(u => {
    let entry = `  <url>\n    <loc>${u.loc}</loc>`;
    if (u.lastmod) entry += `\n    <lastmod>${u.lastmod}</lastmod>`;
    if (u.changefreq) entry += `\n    <changefreq>${u.changefreq}</changefreq>`;
    if (u.priority) entry += `\n    <priority>${u.priority}</priority>`;
    entry += `\n  </url>`;
    return entry;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
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
