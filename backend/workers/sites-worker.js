import { generateId, generateSubdomain, sanitizeInput, jsonResponse, errorResponse, successResponse, handleCORS } from '../utils/helpers.js';
import { validateAuth } from '../utils/auth.js';

export async function handleSites(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;

  const user = await validateAuth(request, env);
  if (!user) {
    return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const method = request.method;
  const pathParts = path.split('/').filter(Boolean);
  const siteId = pathParts[2];

  switch (method) {
    case 'GET':
      return siteId ? getSite(env, user, siteId) : getUserSites(env, user);
    case 'POST':
      return createSite(request, env, user);
    case 'PUT':
      return updateSite(request, env, user, siteId);
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
  try {
    const body = await request.json();
    const { brandName, categories, templateId, logoUrl, phone, email, address, primaryColor, secondaryColor } = body;
    const category = body.category || 'general';
    const subdomain = body.subdomain || generateSubdomain(brandName);

    if (!brandName) {
      return errorResponse('Brand name is required');
    }

    const existingSubdomain = await env.DB.prepare(
      'SELECT id FROM sites WHERE subdomain = ?'
    ).bind(subdomain).first();

    let finalSubdomain = subdomain;
    if (existingSubdomain) {
      finalSubdomain = `${subdomain}-${Date.now().toString(36)}`;
    }

    const siteId = generateId();
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

    if (categories && categories.length > 0) {
      await createUserCategories(env, siteId, categories);
    } else if (category) {
      await createDefaultCategories(env, siteId, category);
    }

    return successResponse({ id: siteId, subdomain }, 'Site created successfully');
  } catch (error) {
    console.error('Create site error:', error);
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return errorResponse('Subdomain already taken', 400, 'SUBDOMAIN_TAKEN');
    }
    return errorResponse('Failed to create site', 500);
  }
}

async function createDefaultCategories(env, siteId, businessCategory) {
  const categoryTemplates = {
    jewellery: [
      { name: 'Gold', slug: 'gold', children: ['Necklace', 'Earrings', 'Bangles', 'Rings'] },
      { name: 'Silver', slug: 'silver', children: ['Necklace', 'Earrings', 'Bangles', 'Rings'] },
      { name: 'Featured Collection', slug: 'featured-collection', children: [] },
      { name: 'New Arrivals', slug: 'new-arrivals', children: [] },
    ],
    clothing: [
      { name: 'Men', slug: 'men', children: ['Shirts', 'Pants', 'Suits', 'Accessories'] },
      { name: 'Women', slug: 'women', children: ['Dresses', 'Tops', 'Bottoms', 'Accessories'] },
      { name: 'New Arrivals', slug: 'new-arrivals', children: [] },
      { name: 'Sale', slug: 'sale', children: [] },
    ],
    electronics: [
      { name: 'Phones', slug: 'phones', children: [] },
      { name: 'Laptops', slug: 'laptops', children: [] },
      { name: 'Accessories', slug: 'accessories', children: [] },
      { name: 'New Arrivals', slug: 'new-arrivals', children: [] },
    ],
  };

  const categories = categoryTemplates[businessCategory] || categoryTemplates.jewellery;
  let order = 0;

  for (const cat of categories) {
    const parentId = generateId();
    await env.DB.prepare(
      `INSERT INTO categories (id, site_id, name, slug, display_order, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    ).bind(parentId, siteId, cat.name, cat.slug, order++).run();

    for (const childName of cat.children) {
      const childSlug = `${cat.slug}-${childName.toLowerCase().replace(/\s+/g, '-')}`;
      await env.DB.prepare(
        `INSERT INTO categories (id, site_id, name, slug, parent_id, display_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
      ).bind(generateId(), siteId, childName, childSlug, parentId, order++).run();
    }
  }
}

async function createUserCategories(env, siteId, categoryNames) {
  let order = 0;
  for (const categoryName of categoryNames) {
    const slug = categoryName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    
    await env.DB.prepare(
      `INSERT INTO categories (id, site_id, name, slug, display_order, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    ).bind(generateId(), siteId, categoryName, slug, order++).run();
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
        setClause.push(`${dbKey} = ?`);
        values.push(typeof value === 'object' ? JSON.stringify(value) : value);
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
      `SELECT * FROM sites WHERE subdomain = ? AND is_active = 1`
    ).bind(subdomain).first();

    return site;
  } catch (error) {
    console.error('Get site by subdomain error:', error);
    return null;
  }
}
