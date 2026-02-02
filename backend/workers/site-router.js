import { jsonResponse, errorResponse, corsHeaders } from '../utils/helpers.js';

export async function handleSiteRouting(request, env) {
  const url = new URL(request.url);
  const hostname = url.hostname;

  // Split hostname to identify subdomain
  // Case 1: <subdomain>.fluxe.in -> [subdomain, fluxe, in]
  // Case 2: fluxe.in -> [fluxe, in]
  // Case 3: <subdomain>.fluxe-8x1.pages.dev -> [subdomain, fluxe-8x1, pages, dev]
  const hostParts = hostname.split('.');
  let subdomain = null;

  // Detect subdomain for fluxe.in or pages.dev
  if (hostname.endsWith('fluxe.in')) {
    if (hostParts.length >= 3 && hostParts[0] !== 'www') {
      subdomain = hostParts[0];
    }
  } else if (hostname.endsWith('pages.dev')) {
    if (hostParts.length >= 4) {
      subdomain = hostParts[0];
    }
  }

  // Fallback to query param for manual preview
  const subdomainParam = url.searchParams.get('subdomain');
  if (subdomainParam) {
    subdomain = subdomainParam;
  }

  if (!subdomain) {
    return null;
  }

  try {
    const site = await env.DB.prepare(
      `SELECT s.*, u.email as owner_email 
       FROM sites s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.subdomain = ? AND s.is_active = 1`
    ).bind(subdomain).first();

    if (!site) {
      return new Response('Site not found', { 
        status: 404,
        headers: corsHeaders()
      });
    }

    const templateId = site.template_id || 'template1';
    const path = url.pathname;

    if (path.startsWith('/api/')) {
      return null;
    }

    const categories = await env.DB.prepare(
      'SELECT * FROM categories WHERE site_id = ? AND is_active = 1 ORDER BY display_order'
    ).bind(site.id).all();

    const settings = site.settings ? JSON.parse(site.settings) : {};
    const socialLinks = site.social_links ? JSON.parse(site.social_links) : {};

    const siteData = {
      id: site.id,
      subdomain: site.subdomain,
      brandName: site.brand_name,
      category: site.category,
      templateId,
      logoUrl: site.logo_url,
      faviconUrl: site.favicon_url,
      primaryColor: site.primary_color,
      secondaryColor: site.secondary_color,
      phone: site.phone,
      email: site.email,
      address: site.address,
      socialLinks,
      settings,
      categories: categories.results,
      subscriptionPlan: site.subscription_plan,
    };

    if (path === '/' || path === '/index.html') {
      return serveTemplate(env, templateId, 'index.html', siteData);
    }

    const categoryMatch = path.match(/^\/category\/([a-z0-9-]+)\/?$/i);
    if (categoryMatch) {
      const categorySlug = categoryMatch[1];
      const category = categories.results.find(c => c.slug === categorySlug);
      
      if (category) {
        return serveTemplate(env, templateId, 'category.html', {
          ...siteData,
          currentCategory: category,
        });
      }
    }

    const productMatch = path.match(/^\/product\/([a-z0-9-]+)\/?$/i);
    if (productMatch) {
      const productSlug = productMatch[1];
      const product = await env.DB.prepare(
        'SELECT * FROM products WHERE site_id = ? AND slug = ? AND is_active = 1'
      ).bind(site.id, productSlug).first();

      if (product) {
        return serveTemplate(env, templateId, 'product.html', {
          ...siteData,
          currentProduct: {
            ...product,
            images: product.images ? JSON.parse(product.images) : [],
          },
        });
      }
    }

    const staticPages = ['shop', 'cart', 'checkout', 'login', 'signup', 'profile', 'wishlist', 'orders', 'contact', 'about'];
    const pageName = path.replace(/^\/|\/$/g, '').split('/')[0];

    if (staticPages.includes(pageName)) {
      return serveTemplate(env, templateId, `${pageName}.html`, siteData);
    }

    return null;
  } catch (error) {
    console.error('Site routing error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

async function serveTemplate(env, templateId, fileName, siteData) {
  try {
    let html;
    const templatePath = `/templates/${templateId}/${fileName}`;

    // Try to use ASSETS binding first (Cloudflare Pages)
    if (env.ASSETS) {
      try {
        const assetRequest = new Request(`https://placeholder.com${templatePath}`);
        const response = await env.ASSETS.fetch(assetRequest);
        if (response.ok) {
          html = await response.text();
        }
      } catch (assetErr) {
        console.error('[Routing] ASSETS fetch error:', assetErr);
      }
    }

    // Fallback: Try fetching from the configured domain
    if (!html) {
      const domain = env.DOMAIN || 'fluxe.in';
      const baseUrl = `https://${domain}`;
      const response = await fetch(`${baseUrl}${templatePath}`);
      
      if (!response.ok) {
        console.error(`[Routing] Template not found at: ${baseUrl}${templatePath}`);
        return new Response('Page not found', { status: 404 });
      }
      
      html = await response.text();
    }
    
    if (!html) {
      return new Response('Page not found', { status: 404 });
    }

    html = replacePlaceholders(html, siteData);

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
        ...corsHeaders(),
      },
    });
  } catch (error) {
    console.error('Serve template error:', error);
    return new Response('Failed to load page', { status: 500 });
  }
}

function replacePlaceholders(html, siteData) {
  const replacements = {
    '{{brandName}}': siteData.brandName || '',
    '{{logoUrl}}': siteData.logoUrl || '/images/logo.png',
    '{{faviconUrl}}': siteData.faviconUrl || '/favicon.ico',
    '{{primaryColor}}': siteData.primaryColor || '#000000',
    '{{secondaryColor}}': siteData.secondaryColor || '#ffffff',
    '{{phone}}': siteData.phone || '',
    '{{email}}': siteData.email || '',
    '{{address}}': siteData.address || '',
    '{{siteId}}': siteData.id || '',
    '{{subdomain}}': siteData.subdomain || '',
    '{{whatsappNumber}}': siteData.phone ? siteData.phone.replace(/\D/g, '') : '',
    '{{instagramUrl}}': siteData.socialLinks?.instagram || '#',
    '{{facebookUrl}}': siteData.socialLinks?.facebook || '#',
    '{{twitterUrl}}': siteData.socialLinks?.twitter || '#',
    '{{youtubeUrl}}': siteData.socialLinks?.youtube || '#',
  };

  let result = html;

  for (const [placeholder, value] of Object.entries(replacements)) {
    result = result.split(placeholder).join(value);
  }

  if (siteData.currentCategory) {
    result = result.replace('{{categoryName}}', siteData.currentCategory.name || '');
    result = result.replace('{{categoryDescription}}', siteData.currentCategory.description || '');
    result = result.replace('{{categoryImage}}', siteData.currentCategory.image_url || '');
  }

  if (siteData.currentProduct) {
    result = result.replace('{{productName}}', siteData.currentProduct.name || '');
    result = result.replace('{{productDescription}}', siteData.currentProduct.description || '');
    result = result.replace('{{productPrice}}', siteData.currentProduct.price || '');
  }

  const navCategories = siteData.categories
    ?.filter(c => !c.parent_id)
    .map(c => `<li><a href="/category/${c.slug}">${c.name}</a></li>`)
    .join('') || '';
  result = result.replace('{{navigationCategories}}', navCategories);

  result = result.replace(/\{\{siteData\}\}/g, JSON.stringify(siteData));

  return result;
}

export async function resolveSiteFromRequest(request, env) {
  const url = new URL(request.url);
  const hostname = url.hostname;

  // Split hostname to identify subdomain
  const hostParts = hostname.split('.');
  let subdomain = null;

  // Detect subdomain for fluxe.in or pages.dev
  if (hostname.endsWith('fluxe.in')) {
    if (hostParts.length >= 3 && hostParts[0] !== 'www') {
      subdomain = hostParts[0];
    }
  } else if (hostname.endsWith('pages.dev')) {
    if (hostParts.length >= 4) {
      subdomain = hostParts[0];
    }
  }

  // Fallback to query param for manual preview
  const subdomainParam = url.searchParams.get('subdomain');
  if (subdomainParam) {
    subdomain = subdomainParam;
  }

  if (!subdomain) {
    return null;
  }

  const site = await env.DB.prepare(
    'SELECT * FROM sites WHERE subdomain = ? AND is_active = 1'
  ).bind(subdomain).first();

  return site;
}
