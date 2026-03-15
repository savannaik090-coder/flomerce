import { jsonResponse, errorResponse, corsHeaders } from '../utils/helpers.js';
import { applySEO, generateSitemap, generateRobots } from './seo/index.js';


export async function handleSiteRouting(request, env) {
  const url = new URL(request.url);
  const hostname = url.hostname;

  const hostParts = hostname.split('.');
  let subdomain = null;

  if (hostname.endsWith('fluxe.in')) {
    if (hostParts.length >= 3 && hostParts[0] !== 'www') {
      subdomain = hostParts[0];
    }
  } else if (hostname.endsWith('pages.dev')) {
    if (hostParts.length >= 4) {
      subdomain = hostParts[0];
    }
  }

  const subdomainParam = url.searchParams.get('subdomain');
  if (subdomainParam) {
    subdomain = subdomainParam;
  }

  const path = url.pathname;

  if (path.startsWith('/api/')) {
    return null;
  }

  let site = null;

  if (subdomain) {
    try {
      site = await env.DB.prepare(
        `SELECT * FROM sites WHERE LOWER(subdomain) = LOWER(?) AND is_active = 1`
      ).bind(subdomain).first();
    } catch (error) {
      console.error('Site routing subdomain lookup error:', error);
    }
  }

  if (!site && !hostname.endsWith('fluxe.in') && !hostname.endsWith('pages.dev') && !hostname.includes('localhost') && !hostname.includes('workers.dev')) {
    try {
      site = await env.DB.prepare(
        `SELECT * FROM sites WHERE custom_domain = ? AND domain_status = 'verified' AND is_active = 1`
      ).bind(hostname.toLowerCase()).first();
    } catch (error) {
      console.error('Site routing custom domain lookup error:', error);
    }
  }

  if (!site) {
    if (!subdomain) return null;
    return new Response('Site not found', {
      status: 404,
      headers: corsHeaders()
    });
  }

  try {
    const isExpired = site.subscription_expires_at && new Date(site.subscription_expires_at) < new Date();
    if (isExpired) {
      return new Response(
        `<html>
          <head>
            <title>Site Disabled - Fluxe</title>
            <style>
              body { font-family: 'Inter', sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; color: #1e293b; }
              .container { text-align: center; padding: 2rem; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); max-width: 400px; }
              h1 { font-size: 1.5rem; margin-bottom: 1rem; color: #ef4444; }
              p { color: #64748b; line-height: 1.6; margin-bottom: 2rem; }
              .btn { background: #2563eb; color: white; padding: 0.75rem 1.5rem; border-radius: 6px; text-decoration: none; font-weight: 600; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Site Disabled</h1>
              <p>The subscription for <strong>${site.brand_name || subdomain}</strong> has expired. Please contact the site owner or renew the plan to restore access.</p>
              <a href="https://fluxe.in" class="btn">Go to Fluxe</a>
            </div>
          </body>
        </html>`,
        {
          status: 402,
          headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders() }
        }
      );
    }

    // ── SEO special routes ───────────────────────────────────────────────────

    if (path === '/sitemap.xml') {
      return handleSitemap(request, env, site);
    }

    if (path === '/robots.txt') {
      return handleRobots(request, env, site);
    }

    // ── Storefront app ───────────────────────────────────────────────────────

    return serveStorefrontApp(request, env, path, site);
  } catch (error) {
    console.error('Site routing error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

// ─── /sitemap.xml ────────────────────────────────────────────────────────────

async function handleSitemap(request, env, site) {
  try {
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.hostname}`;
    const xml = await generateSitemap(env, site, baseUrl);
    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        ...corsHeaders(),
      },
    });
  } catch (err) {
    console.error('[SEO] Sitemap error:', err);
    return new Response('Failed to generate sitemap', { status: 500 });
  }
}

// ─── /robots.txt ─────────────────────────────────────────────────────────────

async function handleRobots(request, env, site) {
  try {
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.hostname}`;
    const txt = generateRobots(site, baseUrl);
    return new Response(txt, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        ...corsHeaders(),
      },
    });
  } catch (err) {
    console.error('[SEO] Robots error:', err);
    return new Response('User-agent: *\nAllow: /\n', { status: 200 });
  }
}

// ─── Storefront HTML (with SEO injection) ────────────────────────────────────

async function serveStorefrontApp(request, env, path, site) {
  const isAsset = path.startsWith('/assets/') || path.match(/\.(js|css|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot|otf|map|json)$/i);

  if (isAsset) {
    const storefrontAssetPath = `/storefront${path}`;

    if (env.ASSETS) {
      try {
        const assetRequest = new Request(`https://placeholder.com${storefrontAssetPath}`);
        const response = await env.ASSETS.fetch(assetRequest);
        if (response.ok) {
          const headers = new Headers(response.headers);
          headers.set('Cache-Control', 'public, max-age=31536000, immutable');
          headers.set('Access-Control-Allow-Origin', '*');
          return new Response(response.body, { status: 200, headers });
        }
      } catch (err) {
        console.error('[Storefront] ASSETS fetch error:', err);
      }
    }

    const domain = env.DOMAIN || 'fluxe.in';
    const response = await fetch(`https://${domain}${storefrontAssetPath}`);
    if (response.ok) {
      const headers = new Headers(response.headers);
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      headers.set('Access-Control-Allow-Origin', '*');
      return new Response(response.body, { status: 200, headers });
    }

    return new Response('Asset not found', { status: 404 });
  }

  // ── Serve index.html with SEO tags injected ───────────────────────────────

  const storefrontIndexPath = '/storefront/index.html';
  let rawHTML = null;

  if (env.ASSETS) {
    try {
      const assetRequest = new Request(`https://placeholder.com${storefrontIndexPath}`);
      const response = await env.ASSETS.fetch(assetRequest);
      if (response.ok) {
        rawHTML = await response.text();
      }
    } catch (err) {
      console.error('[Storefront] ASSETS index fetch error:', err);
    }
  }

  if (!rawHTML) {
    const domain = env.DOMAIN || 'fluxe.in';
    const response = await fetch(`https://${domain}${storefrontIndexPath}`);
    if (!response.ok) {
      return new Response('Storefront not available', { status: 500 });
    }
    rawHTML = await response.text();
  }

  const seoHTML = await applySEO(request, env, site, rawHTML);

  return new Response(seoHTML, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Content-Security-Policy': "frame-ancestors 'self' https://fluxe.in https://www.fluxe.in",
      ...corsHeaders(),
    },
  });
}

export async function resolveSiteFromRequest(request, env) {
  const url = new URL(request.url);
  const hostname = url.hostname;

  const hostParts = hostname.split('.');
  let subdomain = null;

  if (hostname.endsWith('fluxe.in')) {
    if (hostParts.length >= 3 && hostParts[0] !== 'www') {
      subdomain = hostParts[0];
    }
  } else if (hostname.endsWith('pages.dev')) {
    if (hostParts.length >= 4) {
      subdomain = hostParts[0];
    }
  }

  const subdomainParam = url.searchParams.get('subdomain');
  if (subdomainParam) {
    subdomain = subdomainParam;
  }

  if (subdomain) {
    const site = await env.DB.prepare(
      'SELECT * FROM sites WHERE LOWER(subdomain) = LOWER(?) AND is_active = 1'
    ).bind(subdomain).first();
    if (site) return site;
  }

  if (!hostname.endsWith('fluxe.in') && !hostname.endsWith('pages.dev') && !hostname.includes('localhost') && !hostname.includes('workers.dev')) {
    const site = await env.DB.prepare(
      `SELECT * FROM sites WHERE custom_domain = ? AND domain_status = 'verified' AND is_active = 1`
    ).bind(hostname.toLowerCase()).first();
    if (site) return site;
  }

  return null;
}
