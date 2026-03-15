import { generateId, generateToken, jsonResponse, errorResponse, successResponse, handleCORS } from '../../utils/helpers.js';
import { validateAuth } from '../../utils/auth.js';

export async function handleSiteAdmin(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;

  const pathParts = path.split('/').filter(Boolean);
  const action = pathParts[2];

  switch (action) {
    case 'verify':
      return verifySiteAdminCode(request, env);
    case 'validate':
      return validateSiteAdminToken(request, env);
    case 'set-code':
      return setSiteAdminCode(request, env);
    case 'auto-login':
      return autoLoginSiteAdmin(request, env);
    case 'seo':
      return handleSEO(request, env, pathParts);
    default:
      return errorResponse('Site admin endpoint not found', 404);
  }
}

async function verifySiteAdminCode(request, env) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const { siteId, subdomain, verificationCode } = await request.json();

    if (!verificationCode) {
      return errorResponse('Verification code is required');
    }

    if (!siteId && !subdomain) {
      return errorResponse('Site ID or subdomain is required');
    }

    let site;
    if (siteId) {
      site = await env.DB.prepare(
        'SELECT id, subdomain, brand_name, settings FROM sites WHERE id = ? AND is_active = 1'
      ).bind(siteId).first();
    } else {
      site = await env.DB.prepare(
        'SELECT id, subdomain, brand_name, settings FROM sites WHERE LOWER(subdomain) = LOWER(?) AND is_active = 1'
      ).bind(subdomain).first();
    }

    if (!site) {
      return errorResponse('Site not found', 404);
    }

    let settings = {};
    try {
      if (site.settings) settings = JSON.parse(site.settings);
    } catch (e) {}

    const storedCode = settings.adminVerificationCode;
    if (!storedCode) {
      return errorResponse('Admin verification code not set for this site. Please set it from your dashboard.', 400);
    }

    if (verificationCode !== storedCode) {
      return errorResponse('Invalid verification code', 401);
    }

    const adminToken = generateToken(32);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await ensureSiteAdminSessionsTable(env);

    await env.DB.prepare(
      `INSERT INTO site_admin_sessions (id, site_id, token, expires_at, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    ).bind(generateId(), site.id, adminToken, expiresAt.toISOString()).run();

    return successResponse({
      token: adminToken,
      siteId: site.id,
      subdomain: site.subdomain,
      brandName: site.brand_name,
      expiresAt: expiresAt.toISOString(),
    }, 'Admin access granted');
  } catch (error) {
    console.error('Verify site admin code error:', error);
    return errorResponse('Verification failed', 500);
  }
}

async function validateSiteAdminToken(request, env) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const { token, siteId } = await request.json();

    if (!token || !siteId) {
      return errorResponse('Token and site ID are required');
    }

    await ensureSiteAdminSessionsTable(env);

    const session = await env.DB.prepare(
      `SELECT id, site_id, expires_at FROM site_admin_sessions 
       WHERE token = ? AND site_id = ? AND expires_at > datetime('now')`
    ).bind(token, siteId).first();

    if (!session) {
      return errorResponse('Invalid or expired admin token', 401);
    }

    return successResponse({ valid: true, siteId: session.site_id }, 'Token is valid');
  } catch (error) {
    console.error('Validate site admin token error:', error);
    return errorResponse('Validation failed', 500);
  }
}

async function setSiteAdminCode(request, env) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const { siteId, verificationCode } = await request.json();

    if (!siteId || !verificationCode) {
      return errorResponse('Site ID and verification code are required');
    }

    if (verificationCode.length < 4 || verificationCode.length > 20) {
      return errorResponse('Verification code must be between 4 and 20 characters');
    }

    const user = await validateAuth(request, env);
    let site = null;

    if (user) {
      site = await env.DB.prepare(
        'SELECT id, settings FROM sites WHERE id = ? AND user_id = ?'
      ).bind(siteId, user.id).first();
    }

    if (!site) {
      const siteAdmin = await validateSiteAdmin(request, env, siteId);
      if (siteAdmin) {
        site = await env.DB.prepare(
          'SELECT id, settings FROM sites WHERE id = ?'
        ).bind(siteId).first();
      }
    }

    if (!site) {
      return errorResponse('Site not found or unauthorized', 404);
    }

    let settings = {};
    try {
      if (site.settings) settings = JSON.parse(site.settings);
    } catch (e) {}

    settings.adminVerificationCode = verificationCode;

    await env.DB.prepare(
      `UPDATE sites SET settings = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(JSON.stringify(settings), siteId).run();

    return successResponse(null, 'Admin verification code set successfully');
  } catch (error) {
    console.error('Set site admin code error:', error);
    return errorResponse('Failed to set verification code', 500);
  }
}

async function autoLoginSiteAdmin(request, env) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const user = await validateAuth(request, env);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    const { siteId } = await request.json();
    if (!siteId) {
      return errorResponse('Site ID is required');
    }

    const site = await env.DB.prepare(
      'SELECT id, subdomain, brand_name FROM sites WHERE id = ? AND user_id = ?'
    ).bind(siteId, user.id).first();

    if (!site) {
      return errorResponse('Site not found or unauthorized', 404);
    }

    const adminToken = generateToken(32);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await ensureSiteAdminSessionsTable(env);

    await env.DB.prepare(
      `INSERT INTO site_admin_sessions (id, site_id, token, expires_at, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    ).bind(generateId(), site.id, adminToken, expiresAt.toISOString()).run();

    return successResponse({
      token: adminToken,
      siteId: site.id,
      subdomain: site.subdomain,
      brandName: site.brand_name,
      expiresAt: expiresAt.toISOString(),
    }, 'Auto-login token generated');
  } catch (error) {
    console.error('Auto-login site admin error:', error);
    return errorResponse('Auto-login failed', 500);
  }
}

async function ensureSiteAdminSessionsTable(env) {
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS site_admin_sessions (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        token TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
      )
    `).run();

    await env.DB.prepare(
      'CREATE INDEX IF NOT EXISTS idx_site_admin_sessions_token ON site_admin_sessions(token)'
    ).run();

    await env.DB.prepare(
      'CREATE INDEX IF NOT EXISTS idx_site_admin_sessions_site ON site_admin_sessions(site_id)'
    ).run();
  } catch (error) {
    console.error('Error ensuring site_admin_sessions table:', error);
  }
}

// ─── SEO Handler ─────────────────────────────────────────────────────────────
// Routes:
//   GET  /api/site-admin/seo?siteId=xxx          → get site SEO settings
//   PUT  /api/site-admin/seo                      → save site SEO settings
//   GET  /api/site-admin/seo/categories?siteId=x → get all categories with SEO
//   PUT  /api/site-admin/seo/categories/:id       → save category SEO
//   GET  /api/site-admin/seo/products?siteId=xxx  → get all products with SEO
//   PUT  /api/site-admin/seo/products/:id         → save product SEO

async function handleSEO(request, env, pathParts) {
  const subResource = pathParts[3];
  const resourceId  = pathParts[4];

  if (!subResource) {
    if (request.method === 'GET') return getSiteSEO(request, env);
    if (request.method === 'PUT') return saveSiteSEO(request, env);
  }

  if (subResource === 'categories') {
    if (request.method === 'GET') return getCategoriesSEO(request, env);
    if (request.method === 'PUT' && resourceId) return saveCategorySEO(request, env, resourceId);
  }

  if (subResource === 'products') {
    if (request.method === 'GET') return getProductsSEO(request, env);
    if (request.method === 'PUT' && resourceId) return saveProductSEO(request, env, resourceId);
  }

  if (subResource === 'pages') {
    if (request.method === 'GET') return getPagesSEO(request, env);
    if (request.method === 'PUT' && resourceId) return savePageSEO(request, env, resourceId);
  }

  return errorResponse('SEO endpoint not found', 404);
}

async function getSiteSEO(request, env) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get('siteId');
    if (!siteId) return errorResponse('siteId is required');

    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin) return errorResponse('Unauthorized', 401);

    const site = await env.DB.prepare(
      `SELECT seo_title, seo_description, seo_og_image, seo_robots, google_verification, favicon_url FROM sites WHERE id = ?`
    ).bind(siteId).first();

    return jsonResponse({ success: true, data: site || {} });
  } catch (err) {
    console.error('getSiteSEO error:', err);
    return errorResponse('Failed to fetch SEO settings', 500);
  }
}

async function saveSiteSEO(request, env) {
  try {
    const { siteId, seo_title, seo_description, seo_og_image, seo_robots, google_verification, favicon_url } = await request.json();
    if (!siteId) return errorResponse('siteId is required');

    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin) return errorResponse('Unauthorized', 401);

    await env.DB.prepare(
      `UPDATE sites SET
        seo_title = ?, seo_description = ?, seo_og_image = ?,
        seo_robots = ?, google_verification = ?, favicon_url = ?,
        updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      seo_title || null, seo_description || null, seo_og_image || null,
      seo_robots || 'index, follow', google_verification || null, favicon_url || null,
      siteId
    ).run();

    return jsonResponse({ success: true, message: 'SEO settings saved' });
  } catch (err) {
    console.error('saveSiteSEO error:', err);
    return errorResponse('Failed to save SEO settings', 500);
  }
}

async function getCategoriesSEO(request, env) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get('siteId');
    if (!siteId) return errorResponse('siteId is required');

    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin) return errorResponse('Unauthorized', 401);

    const result = await env.DB.prepare(
      `SELECT id, name, slug, seo_title, seo_description, seo_og_image
       FROM categories WHERE site_id = ? AND is_active = 1 ORDER BY display_order ASC`
    ).bind(siteId).all();

    return jsonResponse({ success: true, data: result.results || [] });
  } catch (err) {
    console.error('getCategoriesSEO error:', err);
    return errorResponse('Failed to fetch categories', 500);
  }
}

async function saveCategorySEO(request, env, categoryId) {
  try {
    const { siteId, seo_title, seo_description, seo_og_image } = await request.json();
    if (!siteId) return errorResponse('siteId is required');

    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin) return errorResponse('Unauthorized', 401);

    await env.DB.prepare(
      `UPDATE categories SET
        seo_title = ?, seo_description = ?, seo_og_image = ?,
        updated_at = datetime('now')
       WHERE id = ? AND site_id = ?`
    ).bind(seo_title || null, seo_description || null, seo_og_image || null, categoryId, siteId).run();

    return jsonResponse({ success: true, message: 'Category SEO saved' });
  } catch (err) {
    console.error('saveCategorySEO error:', err);
    return errorResponse('Failed to save category SEO', 500);
  }
}

async function getProductsSEO(request, env) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get('siteId');
    if (!siteId) return errorResponse('siteId is required');

    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin) return errorResponse('Unauthorized', 401);

    const result = await env.DB.prepare(
      `SELECT id, name, slug, seo_title, seo_description, seo_og_image
       FROM products WHERE site_id = ? AND is_active = 1 ORDER BY created_at DESC`
    ).bind(siteId).all();

    return jsonResponse({ success: true, data: result.results || [] });
  } catch (err) {
    console.error('getProductsSEO error:', err);
    return errorResponse('Failed to fetch products', 500);
  }
}

async function saveProductSEO(request, env, productId) {
  try {
    const { siteId, seo_title, seo_description, seo_og_image } = await request.json();
    if (!siteId) return errorResponse('siteId is required');

    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin) return errorResponse('Unauthorized', 401);

    await env.DB.prepare(
      `UPDATE products SET
        seo_title = ?, seo_description = ?, seo_og_image = ?,
        updated_at = datetime('now')
       WHERE id = ? AND site_id = ?`
    ).bind(seo_title || null, seo_description || null, seo_og_image || null, productId, siteId).run();

    return jsonResponse({ success: true, message: 'Product SEO saved' });
  } catch (err) {
    console.error('saveProductSEO error:', err);
    return errorResponse('Failed to save product SEO', 500);
  }
}

const PAGE_TYPES = ['home', 'about', 'contact', 'privacy', 'terms'];

async function getPagesSEO(request, env) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get('siteId');
    if (!siteId) return errorResponse('siteId is required');

    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin) return errorResponse('Unauthorized', 401);

    const result = await env.DB.prepare(
      `SELECT id, page_type, seo_title, seo_description, seo_og_image
       FROM page_seo WHERE site_id = ? ORDER BY page_type ASC`
    ).bind(siteId).all();

    const existing = result.results || [];
    const pages = PAGE_TYPES.map(pt => {
      const found = existing.find(e => e.page_type === pt);
      return found || { id: null, page_type: pt, seo_title: '', seo_description: '', seo_og_image: '' };
    });

    return jsonResponse({ success: true, data: pages });
  } catch (err) {
    console.error('getPagesSEO error:', err);
    return errorResponse('Failed to fetch page SEO', 500);
  }
}

async function savePageSEO(request, env, pageType) {
  try {
    const { siteId, seo_title, seo_description, seo_og_image } = await request.json();
    if (!siteId) return errorResponse('siteId is required');
    if (!PAGE_TYPES.includes(pageType)) return errorResponse('Invalid page type');

    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin) return errorResponse('Unauthorized', 401);

    const existing = await env.DB.prepare(
      `SELECT id FROM page_seo WHERE site_id = ? AND page_type = ?`
    ).bind(siteId, pageType).first();

    if (existing) {
      await env.DB.prepare(
        `UPDATE page_seo SET
          seo_title = ?, seo_description = ?, seo_og_image = ?,
          updated_at = datetime('now')
         WHERE id = ?`
      ).bind(seo_title || null, seo_description || null, seo_og_image || null, existing.id).run();
    } else {
      const id = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO page_seo (id, site_id, page_type, seo_title, seo_description, seo_og_image)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(id, siteId, pageType, seo_title || null, seo_description || null, seo_og_image || null).run();
    }

    return jsonResponse({ success: true, message: 'Page SEO saved' });
  } catch (err) {
    console.error('savePageSEO error:', err);
    return errorResponse('Failed to save page SEO', 500);
  }
}

export async function validateSiteAdmin(request, env, siteId) {
  const user = await validateAuth(request, env);
  if (user) {
    const site = await env.DB.prepare(
      'SELECT id FROM sites WHERE id = ? AND user_id = ?'
    ).bind(siteId, user.id).first();
    if (site) return { type: 'owner', userId: user.id };
  }

  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('SiteAdmin ')) {
    const token = authHeader.substring(10);
    
    try {
      await ensureSiteAdminSessionsTable(env);
      const session = await env.DB.prepare(
        `SELECT id, site_id FROM site_admin_sessions 
         WHERE token = ? AND site_id = ? AND expires_at > datetime('now')`
      ).bind(token, siteId).first();

      if (session) return { type: 'site-admin', siteId: session.site_id };
    } catch (error) {
      console.error('Site admin validation error:', error);
    }
  }

  return null;
}
