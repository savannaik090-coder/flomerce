import { generateId, generateToken, jsonResponse, errorResponse, successResponse, handleCORS } from '../../utils/helpers.js';
import { purgeStorefrontCache } from '../../utils/cache.js';
import { validateAuth, hashPassword, verifyPassword } from '../../utils/auth.js';
import { resolveSiteDBById, checkMigrationLock, getSiteConfig } from '../../utils/site-db.js';
import { estimateRowBytes, trackD1Write, trackD1Update } from '../../utils/usage-tracker.js';

const ALL_PERMISSIONS = ['dashboard', 'products', 'inventory', 'orders', 'customers', 'analytics', 'website', 'seo', 'notifications', 'faq', 'settings'];

export async function handleSiteAdmin(request, env, path, ctx) {
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;

  const pathParts = path.split('/').filter(Boolean);
  const action = pathParts[2];

  switch (action) {
    case 'staff-login':
      return staffLogin(request, env);
    case 'validate':
      return validateSiteAdminToken(request, env);
    case 'auto-login':
      return autoLoginSiteAdmin(request, env);
    case 'staff-logout':
      return staffLogout(request, env);
    case 'seo':
      return handleSEO(request, env, pathParts, ctx);
    default:
      return errorResponse('Site admin endpoint not found', 404);
  }
}

async function staffLogin(request, env) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const { siteId, subdomain, email, password } = await request.json();

    if (!email || !password) {
      return errorResponse('Email and password are required');
    }

    if (!siteId && !subdomain) {
      return errorResponse('Site ID or subdomain is required');
    }

    let site;
    if (siteId) {
      site = await env.DB.prepare(
        'SELECT id, subdomain, brand_name FROM sites WHERE id = ? AND is_active = 1'
      ).bind(siteId).first();
    } else {
      site = await env.DB.prepare(
        'SELECT id, subdomain, brand_name FROM sites WHERE LOWER(subdomain) = LOWER(?) AND is_active = 1'
      ).bind(subdomain).first();
    }

    if (!site) {
      return errorResponse('Site not found', 404);
    }

    const siteDB = await resolveSiteDBById(env, site.id);
    await ensureSiteStaffTable(siteDB);

    const staff = await siteDB.prepare(
      'SELECT id, site_id, email, password_hash, name, permissions, is_active, failed_login_attempts, locked_until FROM site_staff WHERE site_id = ? AND LOWER(email) = LOWER(?)'
    ).bind(site.id, email.trim()).first();

    if (!staff) {
      return errorResponse('Invalid email or password', 401);
    }

    if (!staff.is_active) {
      return errorResponse('Your account has been deactivated. Contact the store owner.', 403);
    }

    if (staff.locked_until && new Date(staff.locked_until) > new Date()) {
      const remainingMs = new Date(staff.locked_until) - new Date();
      const remainingMins = Math.ceil(remainingMs / 60000);
      return errorResponse(`Too many failed login attempts. Account locked for ${remainingMins} more minute(s).`, 429);
    }

    const passwordValid = await verifyPassword(password, staff.password_hash);
    if (!passwordValid) {
      const attempts = (staff.failed_login_attempts || 0) + 1;
      const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
      await siteDB.prepare(
        'UPDATE site_staff SET failed_login_attempts = ?, locked_until = ? WHERE id = ?'
      ).bind(attempts, lockedUntil, staff.id).run();
      if (attempts >= 5) {
        return errorResponse('Too many failed login attempts. Account locked for 15 minutes.', 429);
      }
      return errorResponse('Invalid email or password', 401);
    }

    await siteDB.prepare(
      'UPDATE site_staff SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?'
    ).bind(staff.id).run();

    let permissions = [];
    try {
      permissions = typeof staff.permissions === 'string' ? JSON.parse(staff.permissions) : (staff.permissions || []);
    } catch (e) {
      permissions = [];
    }

    const adminToken = generateToken(32);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await env.DB.prepare(
      `INSERT INTO site_admin_sessions (id, site_id, token, staff_id, permissions, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(generateId(), site.id, adminToken, staff.id, JSON.stringify(permissions), expiresAt.toISOString()).run();

    const config = await getSiteConfig(env, site.id);

    return successResponse({
      token: adminToken,
      siteId: site.id,
      subdomain: site.subdomain,
      brandName: config.brand_name || site.brand_name,
      expiresAt: expiresAt.toISOString(),
      permissions,
      staffName: staff.name,
    }, 'Staff login successful');
  } catch (error) {
    console.error('Staff login error:', error);
    return errorResponse('Login failed', 500);
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

    const session = await env.DB.prepare(
      `SELECT id, site_id, staff_id, expires_at FROM site_admin_sessions 
       WHERE token = ? AND site_id = ? AND expires_at > datetime('now')`
    ).bind(token, siteId).first();

    if (!session) {
      return errorResponse('Invalid or expired admin token', 401);
    }

    const isOwner = !session.staff_id;
    let permissions = null;

    if (!isOwner) {
      const siteDB = await resolveSiteDBById(env, siteId);
      await ensureSiteStaffTable(siteDB);
      const staff = await siteDB.prepare(
        'SELECT is_active, permissions FROM site_staff WHERE id = ? AND site_id = ?'
      ).bind(session.staff_id, siteId).first();

      if (!staff || !staff.is_active) {
        await env.DB.prepare('DELETE FROM site_admin_sessions WHERE id = ?').bind(session.id).run();
        return errorResponse('Your account has been deactivated. Contact the store owner.', 403);
      }

      try {
        permissions = typeof staff.permissions === 'string' ? JSON.parse(staff.permissions) : (staff.permissions || []);
      } catch (e) {
        permissions = [];
      }
    }

    return successResponse({
      valid: true,
      siteId: session.site_id,
      permissions,
      isOwner,
    }, 'Token is valid');
  } catch (error) {
    console.error('Validate site admin token error:', error);
    return errorResponse('Validation failed', 500);
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

    const config = await getSiteConfig(env, site.id);

    const adminToken = generateToken(32);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await ensureSiteAdminSessionsTable(env);

    await env.DB.prepare(
      `INSERT INTO site_admin_sessions (id, site_id, token, staff_id, permissions, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(generateId(), site.id, adminToken, null, null, expiresAt.toISOString()).run();

    return successResponse({
      token: adminToken,
      siteId: site.id,
      subdomain: site.subdomain,
      brandName: config.brand_name || site.brand_name,
      expiresAt: expiresAt.toISOString(),
      permissions: null,
      isOwner: true,
    }, 'Auto-login token generated');
  } catch (error) {
    console.error('Auto-login site admin error:', error);
    return errorResponse('Auto-login failed', 500);
  }
}

async function staffLogout(request, env) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const authHeader = request.headers.get('Authorization') || '';
    if (!authHeader.startsWith('SiteAdmin ')) {
      return successResponse(null, 'Logged out');
    }

    const token = authHeader.substring(10);
    await env.DB.prepare('DELETE FROM site_admin_sessions WHERE token = ?').bind(token).run();

    return successResponse(null, 'Logged out successfully');
  } catch (error) {
    console.error('Staff logout error:', error);
    return successResponse(null, 'Logged out');
  }
}

async function ensureSiteStaffTable(siteDB) {
  try {
    await siteDB.prepare(`
      CREATE TABLE IF NOT EXISTS site_staff (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        permissions TEXT DEFAULT '[]',
        is_active INTEGER DEFAULT 1,
        failed_login_attempts INTEGER DEFAULT 0,
        locked_until TEXT,
        row_size_bytes INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(site_id, email)
      )
    `).run();
    await siteDB.prepare('CREATE INDEX IF NOT EXISTS idx_site_staff_site ON site_staff(site_id)').run();
    await siteDB.prepare('CREATE INDEX IF NOT EXISTS idx_site_staff_email ON site_staff(site_id, email)').run();
  } catch (e) {}
}

async function ensureSiteAdminSessionsTable(env) {
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS site_admin_sessions (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        token TEXT NOT NULL,
        staff_id TEXT,
        permissions TEXT,
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

async function handleSEO(request, env, pathParts, ctx) {
  const subResource = pathParts[3];
  const resourceId  = pathParts[4];

  if (!subResource) {
    if (request.method === 'GET') return getSiteSEO(request, env);
    if (request.method === 'PUT') return saveSiteSEO(request, env, ctx);
  }

  if (subResource === 'categories') {
    if (request.method === 'GET') return getCategoriesSEO(request, env);
    if (request.method === 'PUT' && resourceId) return saveCategorySEO(request, env, resourceId, ctx);
  }

  if (subResource === 'products') {
    if (request.method === 'GET') return getProductsSEO(request, env);
    if (request.method === 'PUT' && resourceId) return saveProductSEO(request, env, resourceId, ctx);
  }

  if (subResource === 'pages') {
    if (request.method === 'GET') return getPagesSEO(request, env);
    if (request.method === 'PUT' && resourceId) return savePageSEO(request, env, resourceId, ctx);
  }

  if (subResource === 'social') {
    if (request.method === 'GET') return getSocialTags(request, env);
    if (request.method === 'PUT') return saveSocialTags(request, env, ctx);
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
    if (!hasPermission(admin, 'seo')) return errorResponse('You do not have permission to access SEO settings', 403);

    const config = await getSiteConfig(env, siteId);

    return jsonResponse({ success: true, data: {
      seo_title: config.seo_title || null,
      seo_description: config.seo_description || null,
      seo_og_image: config.seo_og_image || null,
      seo_robots: config.seo_robots || 'index, follow',
      google_verification: config.google_verification || null,
      favicon_url: config.favicon_url || null,
      brand_name: config.brand_name || null,
      category: config.category || 'general',
    }});
  } catch (err) {
    console.error('getSiteSEO error:', err);
    return errorResponse('Failed to fetch SEO settings', 500);
  }
}

async function saveSiteSEO(request, env, ctx) {
  try {
    const { siteId, seo_title, seo_description, seo_og_image, seo_robots, google_verification, favicon_url } = await request.json();
    if (!siteId) return errorResponse('siteId is required');

    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin) return errorResponse('Unauthorized', 401);
    if (!hasPermission(admin, 'seo')) return errorResponse('You do not have permission to modify SEO settings', 403);

    const siteDB = await resolveSiteDBById(env, siteId);
    const existingConfig = await siteDB.prepare(
      'SELECT row_size_bytes FROM site_config WHERE site_id = ?'
    ).bind(siteId).first();
    const oldBytes = existingConfig?.row_size_bytes || 0;

    await siteDB.prepare(
      `UPDATE site_config SET
        seo_title = ?, seo_description = ?, seo_og_image = ?,
        seo_robots = ?, google_verification = ?, favicon_url = ?,
        updated_at = datetime('now')
       WHERE site_id = ?`
    ).bind(
      seo_title || null, seo_description || null, seo_og_image || null,
      seo_robots || 'index, follow', google_verification || null, favicon_url || null,
      siteId
    ).run();

    const updatedConfig = await siteDB.prepare(
      'SELECT * FROM site_config WHERE site_id = ?'
    ).bind(siteId).first();
    if (updatedConfig) {
      const newBytes = estimateRowBytes(updatedConfig);
      await siteDB.prepare('UPDATE site_config SET row_size_bytes = ? WHERE site_id = ?').bind(newBytes, siteId).run();
      await trackD1Update(env, siteId, oldBytes, newBytes);
    }



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
    if (!hasPermission(admin, 'seo')) return errorResponse('You do not have permission to access SEO settings', 403);

    const db = await resolveSiteDBById(env, siteId);
    const result = await db.prepare(
      `SELECT id, name, slug, description, image_url, seo_title, seo_description, seo_og_image
       FROM categories WHERE site_id = ? AND is_active = 1 ORDER BY display_order ASC`
    ).bind(siteId).all();

    return jsonResponse({ success: true, data: result.results || [] });
  } catch (err) {
    console.error('getCategoriesSEO error:', err);
    return errorResponse('Failed to fetch categories', 500);
  }
}

async function saveCategorySEO(request, env, categoryId, ctx) {
  try {
    const { siteId, seo_title, seo_description, seo_og_image } = await request.json();
    if (!siteId) return errorResponse('siteId is required');

    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin) return errorResponse('Unauthorized', 401);
    if (!hasPermission(admin, 'seo')) return errorResponse('You do not have permission to modify SEO settings', 403);

    if (await checkMigrationLock(env, siteId)) {
      return errorResponse('Site is currently being migrated. Please try again shortly.', 423);
    }

    const db = await resolveSiteDBById(env, siteId);

    const oldRow = await db.prepare(
      'SELECT row_size_bytes FROM categories WHERE id = ? AND site_id = ?'
    ).bind(categoryId, siteId).first();
    const oldBytes = oldRow?.row_size_bytes || 0;

    await db.prepare(
      `UPDATE categories SET
        seo_title = ?, seo_description = ?, seo_og_image = ?,
        updated_at = datetime('now')
       WHERE id = ? AND site_id = ?`
    ).bind(seo_title || null, seo_description || null, seo_og_image || null, categoryId, siteId).run();

    const updatedRow = await db.prepare(
      'SELECT * FROM categories WHERE id = ? AND site_id = ?'
    ).bind(categoryId, siteId).first();
    if (updatedRow) {
      const newBytes = estimateRowBytes(updatedRow);
      await db.prepare('UPDATE categories SET row_size_bytes = ? WHERE id = ?').bind(newBytes, categoryId).run();
      await trackD1Update(env, siteId, oldBytes, newBytes);
    }

    if (ctx) ctx.waitUntil(purgeStorefrontCache(env, siteId, ['categories']));

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
    if (!hasPermission(admin, 'seo')) return errorResponse('You do not have permission to access SEO settings', 403);

    const db = await resolveSiteDBById(env, siteId);
    const result = await db.prepare(
      `SELECT id, name, slug, short_description, description, thumbnail_url, images, price, seo_title, seo_description, seo_og_image
       FROM products WHERE site_id = ? AND is_active = 1 ORDER BY created_at DESC`
    ).bind(siteId).all();

    const products = (result.results || []).map(p => {
      if (!p.thumbnail_url && p.images) {
        try {
          const imgs = JSON.parse(p.images);
          if (Array.isArray(imgs) && imgs.length > 0) {
            p.thumbnail_url = imgs[0];
          }
        } catch {}
      }
      return p;
    });

    return jsonResponse({ success: true, data: products });
  } catch (err) {
    console.error('getProductsSEO error:', err);
    return errorResponse('Failed to fetch products', 500);
  }
}

async function saveProductSEO(request, env, productId, ctx) {
  try {
    const { siteId, seo_title, seo_description, seo_og_image } = await request.json();
    if (!siteId) return errorResponse('siteId is required');

    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin) return errorResponse('Unauthorized', 401);
    if (!hasPermission(admin, 'seo')) return errorResponse('You do not have permission to modify SEO settings', 403);

    if (await checkMigrationLock(env, siteId)) {
      return errorResponse('Site is currently being migrated. Please try again shortly.', 423);
    }

    const db = await resolveSiteDBById(env, siteId);

    const oldRow = await db.prepare(
      'SELECT row_size_bytes FROM products WHERE id = ? AND site_id = ?'
    ).bind(productId, siteId).first();
    const oldBytes = oldRow?.row_size_bytes || 0;

    await db.prepare(
      `UPDATE products SET
        seo_title = ?, seo_description = ?, seo_og_image = ?,
        updated_at = datetime('now')
       WHERE id = ? AND site_id = ?`
    ).bind(seo_title || null, seo_description || null, seo_og_image || null, productId, siteId).run();

    const updatedRow = await db.prepare(
      'SELECT * FROM products WHERE id = ? AND site_id = ?'
    ).bind(productId, siteId).first();
    if (updatedRow) {
      const newBytes = estimateRowBytes(updatedRow);
      await db.prepare('UPDATE products SET row_size_bytes = ? WHERE id = ?').bind(newBytes, productId).run();
      await trackD1Update(env, siteId, oldBytes, newBytes);
    }

    if (ctx) ctx.waitUntil(purgeStorefrontCache(env, siteId, ['products']));

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
    if (!hasPermission(admin, 'seo')) return errorResponse('You do not have permission to access SEO settings', 403);

    const db = await resolveSiteDBById(env, siteId);
    const result = await db.prepare(
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

async function savePageSEO(request, env, pageType, ctx) {
  try {
    const { siteId, seo_title, seo_description, seo_og_image } = await request.json();
    if (!siteId) return errorResponse('siteId is required');
    if (!PAGE_TYPES.includes(pageType)) return errorResponse('Invalid page type');

    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin) return errorResponse('Unauthorized', 401);
    if (!hasPermission(admin, 'seo')) return errorResponse('You do not have permission to modify SEO settings', 403);

    if (await checkMigrationLock(env, siteId)) {
      return errorResponse('Site is currently being migrated. Please try again shortly.', 423);
    }

    const db = await resolveSiteDBById(env, siteId);
    const existing = await db.prepare(
      `SELECT id, row_size_bytes FROM page_seo WHERE site_id = ? AND page_type = ?`
    ).bind(siteId, pageType).first();

    if (existing) {
      const oldBytes = existing.row_size_bytes || 0;
      const newData = { id: existing.id, site_id: siteId, page_type: pageType, seo_title, seo_description, seo_og_image };
      const newBytes = estimateRowBytes(newData);

      await db.prepare(
        `UPDATE page_seo SET
          seo_title = ?, seo_description = ?, seo_og_image = ?,
          row_size_bytes = ?,
          updated_at = datetime('now')
         WHERE id = ?`
      ).bind(seo_title || null, seo_description || null, seo_og_image || null, newBytes, existing.id).run();

      await trackD1Update(env, siteId, oldBytes, newBytes);
    } else {
      const id = crypto.randomUUID();
      const rowData = { id, site_id: siteId, page_type: pageType, seo_title, seo_description, seo_og_image };
      const rowBytes = estimateRowBytes(rowData);

      await db.prepare(
        `INSERT INTO page_seo (id, site_id, page_type, seo_title, seo_description, seo_og_image, row_size_bytes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(id, siteId, pageType, seo_title || null, seo_description || null, seo_og_image || null, rowBytes).run();

      await trackD1Write(env, siteId, rowBytes);
    }



    return jsonResponse({ success: true, message: 'Page SEO saved' });
  } catch (err) {
    console.error('savePageSEO error:', err);
    return errorResponse('Failed to save page SEO', 500);
  }
}

async function getSocialTags(request, env) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get('siteId');
    if (!siteId) return errorResponse('siteId is required');

    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin) return errorResponse('Unauthorized', 401);
    if (!hasPermission(admin, 'seo')) return errorResponse('You do not have permission to access SEO settings', 403);

    const config = await getSiteConfig(env, siteId);

    const data = {
      og_title: config.og_title || '',
      og_description: config.og_description || '',
      og_image: config.og_image || '',
      og_type: config.og_type || 'website',
      twitter_card: config.twitter_card || 'summary_large_image',
      twitter_title: config.twitter_title || '',
      twitter_description: config.twitter_description || '',
      twitter_image: config.twitter_image || '',
      twitter_site: config.twitter_site || '',
      defaults: {
        title: config.seo_title || '',
        description: config.seo_description || '',
        image: config.seo_og_image || '',
      },
    };

    return jsonResponse({ success: true, data });
  } catch (err) {
    console.error('getSocialTags error:', err);
    return errorResponse('Failed to fetch social tags', 500);
  }
}

async function saveSocialTags(request, env, ctx) {
  try {
    const { siteId, og_title, og_description, og_image, og_type,
            twitter_card, twitter_title, twitter_description, twitter_image, twitter_site } = await request.json();
    if (!siteId) return errorResponse('siteId is required');

    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin) return errorResponse('Unauthorized', 401);
    if (!hasPermission(admin, 'seo')) return errorResponse('You do not have permission to modify SEO settings', 403);

    const siteDB = await resolveSiteDBById(env, siteId);
    const existingConfig = await siteDB.prepare(
      'SELECT row_size_bytes FROM site_config WHERE site_id = ?'
    ).bind(siteId).first();
    const oldBytes = existingConfig?.row_size_bytes || 0;

    await siteDB.prepare(
      `UPDATE site_config SET
        og_title = ?, og_description = ?, og_image = ?, og_type = ?,
        twitter_card = ?, twitter_title = ?, twitter_description = ?, twitter_image = ?, twitter_site = ?,
        updated_at = datetime('now')
       WHERE site_id = ?`
    ).bind(
      og_title || null, og_description || null, og_image || null, og_type || 'website',
      twitter_card || 'summary_large_image', twitter_title || null, twitter_description || null, twitter_image || null, twitter_site || null,
      siteId
    ).run();

    const updatedConfig = await siteDB.prepare(
      'SELECT * FROM site_config WHERE site_id = ?'
    ).bind(siteId).first();
    if (updatedConfig) {
      const newBytes = estimateRowBytes(updatedConfig);
      await siteDB.prepare('UPDATE site_config SET row_size_bytes = ? WHERE site_id = ?').bind(newBytes, siteId).run();
      await trackD1Update(env, siteId, oldBytes, newBytes);
    }



    return jsonResponse({ success: true, message: 'Social tags saved' });
  } catch (err) {
    console.error('saveSocialTags error:', err);
    return errorResponse('Failed to save social tags', 500);
  }
}

export function hasPermission(admin, section) {
  if (!admin) return false;
  if (admin.isOwner) return true;
  if (!admin.permissions) return false;
  return admin.permissions.includes(section);
}

export async function validateSiteAdmin(request, env, siteId) {
  if (!siteId) return null;

  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('SiteAdmin ')) return null;

  const token = authHeader.substring(10);

  try {
    const session = await env.DB.prepare(
      `SELECT id, site_id, staff_id, expires_at FROM site_admin_sessions 
       WHERE token = ? AND site_id = ? AND expires_at > datetime('now')`
    ).bind(token, siteId).first();

    if (!session) return null;

    const isOwner = !session.staff_id;
    let permissions = null;

    if (!isOwner) {
      const siteDB = await resolveSiteDBById(env, siteId);
      await ensureSiteStaffTable(siteDB);
      const staff = await siteDB.prepare(
        'SELECT is_active, permissions FROM site_staff WHERE id = ? AND site_id = ?'
      ).bind(session.staff_id, siteId).first();

      if (!staff || !staff.is_active) {
        await env.DB.prepare('DELETE FROM site_admin_sessions WHERE id = ?').bind(session.id).run();
        return null;
      }

      try {
        permissions = typeof staff.permissions === 'string' ? JSON.parse(staff.permissions) : (staff.permissions || []);
      } catch (e) {
        permissions = [];
      }
    }

    return { siteId: session.site_id, staffId: session.staff_id || null, isOwner, permissions };
  } catch (error) {
    console.error('Validate site admin error:', error);
    return null;
  }
}

export async function handleStaffCRUD(request, env, siteId, staffAction, staffId) {
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;

  const user = await validateAuth(request, env);
  if (!user) return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');

  const site = await env.DB.prepare(
    'SELECT id FROM sites WHERE id = ? AND user_id = ?'
  ).bind(siteId, user.id).first();
  if (!site) return errorResponse('Site not found or unauthorized', 404);

  const method = request.method;

  if (method === 'GET' && !staffId) {
    return listStaff(env, siteId);
  }

  if (method === 'GET' && staffId) {
    return getStaffMember(env, siteId, staffId);
  }

  if (method === 'POST' && !staffId) {
    return addStaff(request, env, siteId);
  }

  if (method === 'PUT' && staffId) {
    return updateStaff(request, env, siteId, staffId);
  }

  if (method === 'DELETE' && staffId) {
    return deleteStaff(env, siteId, staffId);
  }

  return errorResponse('Method not allowed', 405);
}

async function listStaff(env, siteId) {
  try {
    const siteDB = await resolveSiteDBById(env, siteId);
    await ensureSiteStaffTable(siteDB);
    const result = await siteDB.prepare(
      'SELECT id, site_id, email, name, permissions, is_active, created_at, updated_at FROM site_staff WHERE site_id = ? ORDER BY created_at DESC'
    ).bind(siteId).all();

    const staff = (result.results || []).map(s => ({
      ...s,
      is_active: s.is_active === 1 || s.is_active === true,
      permissions: (() => {
        try { return typeof s.permissions === 'string' ? JSON.parse(s.permissions) : (s.permissions || []); } catch { return []; }
      })(),
    }));

    return successResponse(staff);
  } catch (error) {
    console.error('List staff error:', error);
    return errorResponse('Failed to list staff', 500);
  }
}

async function getStaffMember(env, siteId, staffId) {
  try {
    const siteDB = await resolveSiteDBById(env, siteId);
    await ensureSiteStaffTable(siteDB);
    const staff = await siteDB.prepare(
      'SELECT id, site_id, email, name, permissions, is_active, created_at, updated_at FROM site_staff WHERE id = ? AND site_id = ?'
    ).bind(staffId, siteId).first();

    if (!staff) return errorResponse('Staff member not found', 404);

    let permissions = [];
    try { permissions = typeof staff.permissions === 'string' ? JSON.parse(staff.permissions) : (staff.permissions || []); } catch {}

    return successResponse({ ...staff, is_active: staff.is_active === 1 || staff.is_active === true, permissions });
  } catch (error) {
    console.error('Get staff error:', error);
    return errorResponse('Failed to get staff member', 500);
  }
}

async function addStaff(request, env, siteId) {
  try {
    const { email, name, password, permissions } = await request.json();

    if (!email || !name || !password) {
      return errorResponse('Email, name, and password are required');
    }

    if (password.length < 6) {
      return errorResponse('Password must be at least 6 characters');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse('Invalid email address');
    }

    const validPerms = (permissions || []).filter(p => ALL_PERMISSIONS.includes(p));
    if (validPerms.length === 0) {
      return errorResponse('At least one permission must be selected');
    }

    const siteDB = await resolveSiteDBById(env, siteId);
    await ensureSiteStaffTable(siteDB);

    const existing = await siteDB.prepare(
      'SELECT id FROM site_staff WHERE site_id = ? AND LOWER(email) = LOWER(?)'
    ).bind(siteId, email.trim()).first();

    if (existing) {
      return errorResponse('A staff member with this email already exists for this site', 400);
    }

    const passwordHash = await hashPassword(password);
    const id = generateId();

    await siteDB.prepare(
      `INSERT INTO site_staff (id, site_id, email, password_hash, name, permissions, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`
    ).bind(id, siteId, email.trim().toLowerCase(), passwordHash, name.trim(), JSON.stringify(validPerms)).run();

    return successResponse({
      id,
      site_id: siteId,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      permissions: validPerms,
      is_active: 1,
    }, 'Staff member added successfully');
  } catch (error) {
    console.error('Add staff error:', error);
    if (error.message && error.message.includes('UNIQUE constraint')) {
      return errorResponse('A staff member with this email already exists', 400);
    }
    return errorResponse('Failed to add staff member', 500);
  }
}

async function updateStaff(request, env, siteId, staffId) {
  try {
    const siteDB = await resolveSiteDBById(env, siteId);
    await ensureSiteStaffTable(siteDB);

    const existing = await siteDB.prepare(
      'SELECT id FROM site_staff WHERE id = ? AND site_id = ?'
    ).bind(staffId, siteId).first();

    if (!existing) return errorResponse('Staff member not found', 404);

    const updates = await request.json();
    const setClauses = [];
    const values = [];

    if (updates.name !== undefined) {
      setClauses.push('name = ?');
      values.push(updates.name.trim());
    }

    if (updates.email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updates.email)) {
        return errorResponse('Invalid email address');
      }
      const emailConflict = await siteDB.prepare(
        'SELECT id FROM site_staff WHERE site_id = ? AND LOWER(email) = LOWER(?) AND id != ?'
      ).bind(siteId, updates.email.trim(), staffId).first();
      if (emailConflict) {
        return errorResponse('Another staff member with this email already exists', 400);
      }
      setClauses.push('email = ?');
      values.push(updates.email.trim().toLowerCase());
    }

    if (updates.password !== undefined && updates.password.length > 0) {
      if (updates.password.length < 6) {
        return errorResponse('Password must be at least 6 characters');
      }
      const passwordHash = await hashPassword(updates.password);
      setClauses.push('password_hash = ?');
      values.push(passwordHash);
    }

    if (updates.permissions !== undefined) {
      const validPerms = (updates.permissions || []).filter(p => ALL_PERMISSIONS.includes(p));
      if (validPerms.length === 0) {
        return errorResponse('At least one permission must be selected');
      }
      setClauses.push('permissions = ?');
      values.push(JSON.stringify(validPerms));
    }

    if (updates.is_active !== undefined) {
      setClauses.push('is_active = ?');
      values.push(updates.is_active ? 1 : 0);
    }

    if (setClauses.length === 0) {
      return errorResponse('No valid fields to update');
    }

    setClauses.push('updated_at = datetime("now")');
    values.push(staffId, siteId);

    await siteDB.prepare(
      `UPDATE site_staff SET ${setClauses.join(', ')} WHERE id = ? AND site_id = ?`
    ).bind(...values).run();

    if (updates.permissions !== undefined || updates.is_active === false || updates.password) {
      await env.DB.prepare(
        'DELETE FROM site_admin_sessions WHERE staff_id = ? AND site_id = ?'
      ).bind(staffId, siteId).run();
    }

    const updated = await siteDB.prepare(
      'SELECT id, site_id, email, name, permissions, is_active, created_at, updated_at FROM site_staff WHERE id = ? AND site_id = ?'
    ).bind(staffId, siteId).first();

    let permissions = [];
    try { permissions = typeof updated.permissions === 'string' ? JSON.parse(updated.permissions) : (updated.permissions || []); } catch {}

    return successResponse({ ...updated, permissions }, 'Staff member updated successfully');
  } catch (error) {
    console.error('Update staff error:', error);
    return errorResponse('Failed to update staff member', 500);
  }
}

async function deleteStaff(env, siteId, staffId) {
  try {
    const siteDB = await resolveSiteDBById(env, siteId);
    await ensureSiteStaffTable(siteDB);

    const existing = await siteDB.prepare(
      'SELECT id FROM site_staff WHERE id = ? AND site_id = ?'
    ).bind(staffId, siteId).first();

    if (!existing) return errorResponse('Staff member not found', 404);

    await env.DB.prepare(
      'DELETE FROM site_admin_sessions WHERE staff_id = ? AND site_id = ?'
    ).bind(staffId, siteId).run();

    await siteDB.prepare(
      'DELETE FROM site_staff WHERE id = ? AND site_id = ?'
    ).bind(staffId, siteId).run();

    return successResponse(null, 'Staff member removed successfully');
  } catch (error) {
    console.error('Delete staff error:', error);
    return errorResponse('Failed to remove staff member', 500);
  }
}
