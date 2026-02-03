import { generateId, sanitizeInput, jsonResponse, errorResponse, successResponse, handleCORS } from '../utils/helpers.js';
import { validateAuth } from '../utils/auth.js';

export async function handleCategories(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;

  const method = request.method;
  const url = new URL(request.url);
  const pathParts = path.split('/').filter(Boolean);
  const categoryId = pathParts[2];

  if (method === 'GET') {
    const siteId = url.searchParams.get('siteId');
    const subdomain = url.searchParams.get('subdomain');
    const slug = url.searchParams.get('slug');
    
    if (categoryId) {
      return getCategory(env, categoryId);
    }
    return getCategories(env, { siteId, subdomain, slug });
  }

  const user = await validateAuth(request, env);
  if (!user) {
    return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
  }

  switch (method) {
    case 'POST':
      return createCategory(request, env, user);
    case 'PUT':
      return updateCategory(request, env, user, categoryId);
    case 'DELETE':
      return deleteCategory(env, user, categoryId);
    default:
      return errorResponse('Method not allowed', 405);
  }
}

async function getCategories(env, { siteId, subdomain, slug }) {
  try {
    let query = `SELECT c.*, 
                   (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) as product_count
                 FROM categories c WHERE 1=1`;
    const bindings = [];

    if (siteId) {
      query += ' AND c.site_id = ?';
      bindings.push(siteId);
    } else if (subdomain) {
      query = `SELECT c.*, 
                 (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) as product_count
               FROM categories c 
               JOIN sites s ON c.site_id = s.id 
               WHERE s.subdomain = ?`;
      bindings.push(subdomain);
    } else {
      // If neither siteId nor subdomain is provided, we can't fetch site-specific categories
      // But we might want to return nothing instead of all categories
      query += ' AND 1=0';
    }

    if (slug) {
      query += ' AND c.slug = ?';
      bindings.push(slug);
    }

    query += ' ORDER BY c.display_order, c.name';

    const categories = await env.DB.prepare(query).bind(...bindings).all();

    const parentCategories = categories.results.filter(c => !c.parent_id);
    const result = parentCategories.map(parent => ({
      ...parent,
      children: categories.results.filter(c => c.parent_id === parent.id),
    }));

    return successResponse(result);
  } catch (error) {
    console.error('Get categories error:', error);
    return errorResponse('Failed to fetch categories', 500);
  }
}

async function getCategory(env, categoryId) {
  try {
    const category = await env.DB.prepare(
      `SELECT c.*, s.subdomain, s.brand_name
       FROM categories c 
       JOIN sites s ON c.site_id = s.id 
       WHERE c.id = ?`
    ).bind(categoryId).first();

    if (!category) {
      return errorResponse('Category not found', 404, 'NOT_FOUND');
    }

    const children = await env.DB.prepare(
      'SELECT * FROM categories WHERE parent_id = ? ORDER BY display_order'
    ).bind(categoryId).all();

    return successResponse({
      ...category,
      children: children.results,
    });
  } catch (error) {
    console.error('Get category error:', error);
    return errorResponse('Failed to fetch category', 500);
  }
}

async function createCategory(request, env, user) {
  try {
    const { siteId, name, description, parentId, imageUrl, displayOrder } = await request.json();

    if (!siteId || !name) {
      return errorResponse('Site ID and name are required');
    }

    const site = await env.DB.prepare(
      'SELECT id FROM sites WHERE id = ? AND user_id = ?'
    ).bind(siteId, user.id).first();

    if (!site) {
      return errorResponse('Site not found or unauthorized', 404);
    }

    const slug = name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    
    const existing = await env.DB.prepare(
      'SELECT id FROM categories WHERE site_id = ? AND slug = ?'
    ).bind(siteId, slug).first();

    if (existing) {
      return errorResponse('Category with this name already exists', 400, 'SLUG_EXISTS');
    }

    const categoryId = generateId();
    
    await env.DB.prepare(
      `INSERT INTO categories (id, site_id, name, slug, description, parent_id, image_url, display_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      categoryId,
      siteId,
      sanitizeInput(name),
      slug,
      description || null,
      parentId || null,
      imageUrl || null,
      displayOrder || 0
    ).run();

    return successResponse({ id: categoryId, slug }, 'Category created successfully');
  } catch (error) {
    console.error('Create category error:', error);
    return errorResponse('Failed to create category', 500);
  }
}

async function updateCategory(request, env, user, categoryId) {
  if (!categoryId) {
    return errorResponse('Category ID is required');
  }

  try {
    const category = await env.DB.prepare(
      `SELECT c.id, c.site_id FROM categories c 
       JOIN sites s ON c.site_id = s.id 
       WHERE c.id = ? AND s.user_id = ?`
    ).bind(categoryId, user.id).first();

    if (!category) {
      return errorResponse('Category not found or unauthorized', 404);
    }

    const updates = await request.json();
    const allowedFields = ['name', 'description', 'parent_id', 'image_url', 'display_order', 'is_active'];
    
    const setClause = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbKey)) {
        setClause.push(`${dbKey} = ?`);
        if (typeof value === 'boolean') {
          values.push(value ? 1 : 0);
        } else {
          values.push(value);
        }
      }
    }

    if (updates.name) {
      const slug = updates.name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
      setClause.push('slug = ?');
      values.push(slug);
    }

    if (setClause.length === 0) {
      return errorResponse('No valid fields to update');
    }

    setClause.push('updated_at = datetime("now")');
    values.push(categoryId);

    await env.DB.prepare(
      `UPDATE categories SET ${setClause.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    return successResponse(null, 'Category updated successfully');
  } catch (error) {
    console.error('Update category error:', error);
    return errorResponse('Failed to update category', 500);
  }
}

async function deleteCategory(env, user, categoryId) {
  if (!categoryId) {
    return errorResponse('Category ID is required');
  }

  try {
    const category = await env.DB.prepare(
      `SELECT c.id FROM categories c 
       JOIN sites s ON c.site_id = s.id 
       WHERE c.id = ? AND s.user_id = ?`
    ).bind(categoryId, user.id).first();

    if (!category) {
      return errorResponse('Category not found or unauthorized', 404);
    }

    await env.DB.prepare(
      'UPDATE categories SET parent_id = NULL WHERE parent_id = ?'
    ).bind(categoryId).run();

    await env.DB.prepare(
      'UPDATE products SET category_id = NULL WHERE category_id = ?'
    ).bind(categoryId).run();

    await env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(categoryId).run();

    return successResponse(null, 'Category deleted successfully');
  } catch (error) {
    console.error('Delete category error:', error);
    return errorResponse('Failed to delete category', 500);
  }
}
