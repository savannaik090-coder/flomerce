import { generateId, generateSubdomain, sanitizeInput, jsonResponse, errorResponse, successResponse, handleCORS } from '../../utils/helpers.js';
import { validateAuth } from '../../utils/auth.js';
import { validateSiteAdmin } from '../storefront/site-admin-worker.js';

export async function handleSites(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;

  const method = request.method;
  const pathParts = path.split('/').filter(Boolean);
  const siteId = pathParts[2];

  if (method === 'PUT' && siteId) {
    const user = await validateAuth(request, env);
    if (user) {
      return updateSite(request, env, user, siteId);
    }
    const siteAdmin = await validateSiteAdmin(request, env, siteId);
    if (siteAdmin) {
      return updateSiteAsAdmin(request, env, siteId);
    }
    return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const user = await validateAuth(request, env);
  if (!user) {
    return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
  }

  switch (method) {
    case 'GET':
      return siteId ? getSite(env, user, siteId) : getUserSites(env, user);
    case 'POST':
      return createSite(request, env, user);
    case 'DELETE':
      return deleteSite(env, user, siteId);
    default:
      return errorResponse('Method not allowed', 405);
  }
}

async function getUserSites(env, user) {
  try {
    const sites = await env.DB.prepare(
      `SELECT id, subdomain, brand_name, category, template_id, logo_url, 
              primary_color, is_active, subscription_plan, created_at
       FROM sites 
       WHERE user_id = ? 
       ORDER BY created_at DESC`
    ).bind(user.id).all();

    return successResponse(sites.results);
  } catch (error) {
    console.error('Get sites error:', error);
    return errorResponse('Failed to fetch sites', 500);
  }
}

async function getSite(env, user, siteId) {
  try {
    const site = await env.DB.prepare(
      `SELECT * FROM sites WHERE id = ? AND user_id = ?`
    ).bind(siteId, user.id).first();

    if (!site) {
      return errorResponse('Site not found', 404, 'NOT_FOUND');
    }

    const categories = await env.DB.prepare(
      `SELECT * FROM categories WHERE site_id = ? ORDER BY display_order`
    ).bind(siteId).all();

    return successResponse({ ...site, categories: categories.results });
  } catch (error) {
    console.error('Get site error:', error);
    return errorResponse('Failed to fetch site', 500);
  }
}

async function createSite(request, env, user) {
  let siteId = null;
  let finalSubdomain = null;
  
  try {
    const body = await request.json();
    const { brandName, categories, templateId, logoUrl, phone, email, address, primaryColor, secondaryColor } = body;
    const category = body.category || 'general';
    const subdomain = (body.subdomain || generateSubdomain(brandName)).toLowerCase().trim();

    if (!brandName) {
      return errorResponse('Brand name is required');
    }

    const existingSubdomain = await env.DB.prepare(
      'SELECT id FROM sites WHERE LOWER(subdomain) = ?'
    ).bind(subdomain).first();

    if (existingSubdomain) {
      return errorResponse('This subdomain is already taken. Please choose a different brand name.', 400, 'SUBDOMAIN_TAKEN');
    }

    finalSubdomain = subdomain;
    siteId = generateId();
    
    await env.DB.prepare(
      `INSERT INTO sites (id, user_id, subdomain, brand_name, category, template_id, logo_url, phone, email, address, primary_color, secondary_color, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      siteId, 
      user.id, 
      finalSubdomain, 
      sanitizeInput(brandName), 
      category, 
      templateId || 'template1',
      logoUrl || null,
      phone || null,
      email || null,
      address || null,
      primaryColor || '#000000',
      secondaryColor || '#ffffff'
    ).run();

    // Try to create categories but don't fail if it errors
    try {
      if (categories && categories.length > 0) {
        await createUserCategories(env, siteId, categories);
      } else if (category) {
        await createDefaultCategories(env, siteId, category);
      }
    } catch (catError) {
      console.error('Category creation failed, attempting to auto-create table:', catError);
      
      try {
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            site_id TEXT NOT NULL,
            name TEXT NOT NULL,
            slug TEXT NOT NULL,
            parent_id TEXT,
            description TEXT,
            image_url TEXT,
            display_order INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            subtitle TEXT DEFAULT NULL,
            show_on_home INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
            FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
            UNIQUE(site_id, slug)
          )
        `).run();
        
        await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_categories_site ON categories(site_id)').run();
        await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(site_id, slug)').run();
        await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id)').run();

        // Retry creation
        if (categories && categories.length > 0) {
          await createUserCategories(env, siteId, categories);
        } else if (category) {
          await createDefaultCategories(env, siteId, category);
        }
      } catch (retryError) {
        console.error('Retry category creation failed:', retryError);
      }
    }

    return successResponse({ id: siteId, subdomain: finalSubdomain }, 'Site created successfully');
  } catch (error) {
    console.error('Create site error:', error);
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return errorResponse('Subdomain already taken', 400, 'SUBDOMAIN_TAKEN');
    }
    return errorResponse('Failed to create site: ' + error.message, 500);
  }
}

async function createDefaultCategories(env, siteId, businessCategory) {
  const categoryTemplates = {
    jewellery: [
      { name: 'Gold', slug: 'gold', subtitle: 'Explore our gold collection', children: ['Necklace', 'Earrings', 'Bangles', 'Rings'] },
      { name: 'Silver', slug: 'silver', subtitle: 'Discover elegant silver pieces', children: ['Necklace', 'Earrings', 'Bangles', 'Rings'] },
      { name: 'Featured Collection', slug: 'featured-collection', subtitle: 'Our handpicked favourites', children: [] },
      { name: 'New Arrivals', slug: 'new-arrivals', subtitle: 'Latest additions to our store', children: [] },
    ],
    clothing: [
      { name: 'Men', slug: 'men', subtitle: 'Shop men\'s fashion', children: ['Shirts', 'Pants', 'Suits', 'Accessories'] },
      { name: 'Women', slug: 'women', subtitle: 'Shop women\'s fashion', children: ['Dresses', 'Tops', 'Bottoms', 'Accessories'] },
      { name: 'New Arrivals', slug: 'new-arrivals', subtitle: 'Latest additions to our store', children: [] },
      { name: 'Sale', slug: 'sale', subtitle: 'Great deals and discounts', children: [] },
    ],
    electronics: [
      { name: 'Phones', slug: 'phones', subtitle: 'Latest smartphones and accessories', children: [] },
      { name: 'Laptops', slug: 'laptops', subtitle: 'Powerful laptops for every need', children: [] },
      { name: 'Accessories', slug: 'accessories', subtitle: 'Essential tech accessories', children: [] },
      { name: 'New Arrivals', slug: 'new-arrivals', subtitle: 'Latest additions to our store', children: [] },
    ],
  };

  const categories = categoryTemplates[businessCategory] || categoryTemplates.jewellery;
  let order = 0;

  for (const cat of categories) {
    const parentId = generateId();
    await env.DB.prepare(
      `INSERT INTO categories (id, site_id, name, slug, display_order, subtitle, show_on_home, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(parentId, siteId, cat.name, cat.slug, order++, cat.subtitle || null, 1).run();

    for (const childName of cat.children) {
      const childSlug = `${cat.slug}-${childName.toLowerCase().replace(/\s+/g, '-')}`;
      await env.DB.prepare(
        `INSERT INTO categories (id, site_id, name, slug, parent_id, display_order, show_on_home, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      ).bind(generateId(), siteId, childName, childSlug, parentId, order++, 0).run();
    }
  }
}

async function createUserCategories(env, siteId, categories) {
  let order = 0;
  // Handle both array of strings and array of objects
  for (let cat of categories) {
    let categoryName = typeof cat === 'string' ? cat : (cat.name || cat.label);
    if (!categoryName) continue;
    
    const slug = categoryName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    
    await env.DB.prepare(
      `INSERT INTO categories (id, site_id, name, slug, display_order, show_on_home, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(generateId(), siteId, categoryName, slug, order++, 1).run();
  }
}

async function updateSite(request, env, user, siteId) {
  if (!siteId) {
    return errorResponse('Site ID is required');
  }

  try {
    const site = await env.DB.prepare(
      'SELECT id FROM sites WHERE id = ? AND user_id = ?'
    ).bind(siteId, user.id).first();

    if (!site) {
      return errorResponse('Site not found', 404, 'NOT_FOUND');
    }

    const updates = await request.json();
    const allowedFields = ['brand_name', 'logo_url', 'favicon_url', 'primary_color', 'secondary_color', 'phone', 'email', 'address', 'social_links', 'settings'];
    
    const setClause = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbKey)) {
        if (dbKey === 'settings' && typeof value === 'object') {
          let existingSettings = {};
          try {
            const siteRow = await env.DB.prepare('SELECT settings FROM sites WHERE id = ?').bind(siteId).first();
            if (siteRow && siteRow.settings) {
              existingSettings = JSON.parse(siteRow.settings);
            }
          } catch (e) {}
          const mergedSettings = { ...existingSettings, ...value };
          setClause.push(`${dbKey} = ?`);
          values.push(JSON.stringify(mergedSettings));
        } else {
          setClause.push(`${dbKey} = ?`);
          values.push(typeof value === 'object' ? JSON.stringify(value) : value);
        }
      }
    }

    if (setClause.length === 0) {
      return errorResponse('No valid fields to update');
    }

    setClause.push('updated_at = datetime("now")');
    values.push(siteId);

    await env.DB.prepare(
      `UPDATE sites SET ${setClause.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    return successResponse(null, 'Site updated successfully');
  } catch (error) {
    console.error('Update site error:', error);
    return errorResponse('Failed to update site', 500);
  }
}

async function updateSiteAsAdmin(request, env, siteId) {
  try {
    const updates = await request.json();
    const allowedFields = ['brand_name', 'logo_url', 'favicon_url', 'primary_color', 'secondary_color', 'phone', 'email', 'address', 'social_links', 'settings'];
    
    const setClause = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbKey)) {
        if (dbKey === 'settings' && typeof value === 'object') {
          let existingSettings = {};
          try {
            const site = await env.DB.prepare('SELECT settings FROM sites WHERE id = ?').bind(siteId).first();
            if (site && site.settings) {
              existingSettings = JSON.parse(site.settings);
            }
          } catch (e) {}
          const mergedSettings = { ...existingSettings, ...value };
          setClause.push(`${dbKey} = ?`);
          values.push(JSON.stringify(mergedSettings));
        } else {
          setClause.push(`${dbKey} = ?`);
          values.push(typeof value === 'object' ? JSON.stringify(value) : value);
        }
      }
    }

    if (setClause.length === 0) {
      return errorResponse('No valid fields to update');
    }

    setClause.push('updated_at = datetime("now")');
    values.push(siteId);

    await env.DB.prepare(
      `UPDATE sites SET ${setClause.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    return successResponse(null, 'Site updated successfully');
  } catch (error) {
    console.error('Update site as admin error:', error);
    return errorResponse('Failed to update site', 500);
  }
}

async function deleteSite(env, user, siteId) {
  if (!siteId) {
    return errorResponse('Site ID is required');
  }

  try {
    const site = await env.DB.prepare(
      'SELECT id, subdomain FROM sites WHERE id = ? AND user_id = ?'
    ).bind(siteId, user.id).first();

    if (!site) {
      return errorResponse('Site not found', 404, 'NOT_FOUND');
    }

    await env.DB.prepare('DELETE FROM sites WHERE id = ?').bind(siteId).run();

    return successResponse({ subdomain: site.subdomain }, 'Site deleted successfully');
  } catch (error) {
    console.error('Delete site error:', error);
    return errorResponse('Failed to delete site', 500);
  }
}

export async function getSiteBySubdomain(env, subdomain) {
  try {
    const site = await env.DB.prepare(
      `SELECT * FROM sites WHERE LOWER(subdomain) = LOWER(?) AND is_active = 1`
    ).bind(subdomain).first();

    return site;
  } catch (error) {
    console.error('Get site by subdomain error:', error);
    return null;
  }
}
