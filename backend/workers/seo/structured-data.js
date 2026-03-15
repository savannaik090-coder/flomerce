function absUrl(url, baseUrl) {
  if (!url) return url;
  if (url.startsWith('http')) return url;
  return baseUrl + (url.startsWith('/') ? url : '/' + url);
}

export function buildOrganizationSchema(site, baseUrl) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.brand_name,
    url: baseUrl,
  };

  if (site.logo_url) schema.logo = absUrl(site.logo_url, baseUrl);
  if (site.email) schema.email = site.email;
  if (site.phone) schema.telephone = site.phone;
  if (site.address) schema.address = { '@type': 'PostalAddress', streetAddress: site.address };

  let socialLinks = [];
  try {
    if (site.social_links) {
      const links = typeof site.social_links === 'string' ? JSON.parse(site.social_links) : site.social_links;
      socialLinks = Object.values(links).filter(Boolean);
    }
  } catch {}

  if (socialLinks.length > 0) schema.sameAs = socialLinks;

  return JSON.stringify(schema);
}

export function buildProductSchema(product, site, baseUrl) {
  let images = [];
  try {
    if (product.images) {
      images = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
    }
  } catch {}

  if (product.thumbnail_url && !images.includes(product.thumbnail_url)) {
    images.unshift(product.thumbnail_url);
  }

  images = images.map(img => absUrl(img, baseUrl)).filter(Boolean);

  const currency = site.currency || 'INR';

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || product.short_description || '',
    url: `${baseUrl}/product/${product.slug}`,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: currency,
      availability: product.stock > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `${baseUrl}/product/${product.slug}`,
    },
  };

  if (images.length > 0) schema.image = images;
  if (product.sku) schema.sku = product.sku;
  if (product.barcode) schema.gtin = product.barcode;
  if (product.compare_price && product.compare_price > product.price) {
    schema.offers.priceValidUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  }

  return JSON.stringify(schema);
}

export function buildCategorySchema(category, products, site, baseUrl) {
  const items = (products || []).slice(0, 10).map((p, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    url: `${baseUrl}/product/${p.slug}`,
    name: p.name,
  }));

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: category.name,
    description: category.description || '',
    url: `${baseUrl}/category/${category.slug}`,
    numberOfItems: items.length,
    itemListElement: items,
  };

  return JSON.stringify(schema);
}

export function buildBreadcrumbSchema(items, baseUrl) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${baseUrl}${item.url}`,
    })),
  };

  return JSON.stringify(schema);
}

export function buildWebsiteSchema(site, baseUrl) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.brand_name,
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  });
}
