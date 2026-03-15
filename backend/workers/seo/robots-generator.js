export function generateRobots(site, baseUrl) {
  const robots = site.seo_robots || 'index, follow';
  const isBlocked = robots.includes('noindex');

  if (isBlocked) {
    return `User-agent: *\nDisallow: /\n`;
  }

  return `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /cart
Disallow: /checkout
Disallow: /profile
Disallow: /orders

Sitemap: ${baseUrl}/sitemap.xml
`;
}
