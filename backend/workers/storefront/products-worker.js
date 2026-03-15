import { generateId, sanitizeInput, jsonResponse, errorResponse, successResponse, handleCORS } from '../../utils/helpers.js';
import { validateAuth } from '../../utils/auth.js';
import { validateSiteAdmin } from './site-admin-worker.js';

export async function handleProducts(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;

  const url = new URL(request.url);
  const method = request.method;
  const pathParts = path.split('/').filter(Boolean);
  const productId = pathParts[2];

  if (method === 'GET') {
    const siteId = url.searchParams.get('siteId');
    const subdomain = url.searchParams.get('subdomain');
    const category = url.searchParams.get('category');
    const categoryId = url.searchParams.get('categoryId');
    
    if (productId) {
      return getProduct(env, productId);
    }
    return getProducts(env, { siteId, subdomain, category, categoryId, url });
  }

  let user = await validateAuth(request, env);
  let adminSiteId = null;

  if (!user) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('SiteAdmin ')) {
      let siteId = url.searchParams.get('siteId');

      if (!siteId && method === 'POST') {
        try {
          const cloned = request.clone();
          const body = await cloned.json();
          siteId = body.siteId;
        } catch (e) {}
      }

      if (!siteId && (method === 'PUT' || method === 'DELETE') && productId) {
        try {
          const prod = await env.DB.prepare('SELECT site_id FROM products WHERE id = ?').bind(productId).first();
          if (prod) siteId = prod.site_id;
        } catch (e) {}
      }

      if (siteId) {
        const admin = await validateSiteAdmin(request, env, siteId);
        if (admin) {
          adminSiteId = siteId;
          user = { id: admin.userId || 'site-admin', _adminSiteId: siteId };
        }
      }
    }
  }

  if (!user) {
    return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
  }

  switch (method) {
    case 'POST':
      return createProduct(request, env, user);
    case 'PUT':
      return updateProduct(request, env, user, productId);
    case 'DELETE':
      return deleteProduct(env, user, productId);
    default:
      return errorResponse('Method not allowed', 405);
  }
}

async function getProducts(env, { siteId, subdomain, category, categoryId, url }) {
  try {
    if (!siteId && !subdomain) {
      return errorResponse('siteId or subdomain is required to fetch products');
    }

    let query = 'SELECT p.*, c.name as category_name, c.slug as category_slug FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.is_active = 1';
    const bindings = [];

    if (siteId) {
      query += ' AND p.site_id = ?';
      bindings.push(siteId);
    } else if (subdomain) {
      query = `SELECT p.*, c.name as category_name, c.slug as category_slug 
               FROM products p 
               LEFT JOIN categories c ON p.category_id = c.id
               JOIN sites s ON p.site_id = s.id 
               WHERE p.is_active = 1 AND LOWER(s.subdomain) = LOWER(?)`;
      bindings.push(subdomain);
    }

    if (categoryId) {
      query += ' AND p.category_id = ?';
      bindings.push(categoryId);
    } else if (category) {
      query += ' AND (c.slug = ? OR c.name = ?)';
      bindings.push(category, category);
    }

    const featured = url.searchParams.get('featured');
    if (featured === 'true') {
      query += ' AND p.is_featured = 1';
    }

    const limit = parseInt(url.searchParams.get('limit')) || 50;
    const offset = parseInt(url.searchParams.get('offset')) || 0;
    
    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    bindings.push(limit, offset);

    const products = await env.DB.prepare(query).bind(...bindings).all();

    const parsedProducts = products.results.map(product => ({
      ...product,
      images: product.images ? JSON.parse(product.images) : [],
      tags: product.tags ? JSON.parse(product.tags) : [],
    }));

    return successResponse(parsedProducts);
  } catch (error) {
    console.error('Get products error:', error);
    return errorResponse('Failed to fetch products', 500);
  }
}

async function getProduct(env, productId) {
  try {
    const product = await env.DB.prepare(
      `SELECT p.*, c.name as category_name, c.slug as category_slug, s.brand_name, s.subdomain
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id
       JOIN sites s ON p.site_id = s.id
       WHERE p.id = ?`
    ).bind(productId).first();

    if (!product) {
      return errorResponse('Product not found', 404, 'NOT_FOUND');
    }

    let variantResults = [];
    try {
      const variants = await env.DB.prepare(
        'SELECT * FROM product_variants WHERE product_id = ?'
      ).bind(productId).all();
      variantResults = variants.results || [];
    } catch (_) {}

    const parsedProduct = {
      ...product,
      images: product.images ? JSON.parse(product.images) : [],
      tags: product.tags ? JSON.parse(product.tags) : [],
      variants: variantResults.map(v => ({
        ...v,
        attributes: v.attributes ? JSON.parse(v.attributes) : {},
      })),
    };

    return successResponse(parsedProduct);
  } catch (error) {
    console.error('Get product error:', error);
    return errorResponse('Failed to fetch product', 500);
  }
}

async function createProduct(request, env, user) {
  try {
    const data = await request.json();
    const { siteId, name, description, shortDescription, price, comparePrice, costPrice, sku, stock, categoryId, images, thumbnailUrl, mainImageIndex, tags, isFeatured, weight, dimensions } = data;

    if (!siteId || !name || price === undefined) {
      return errorResponse('Site ID, name and price are required');
    }

    let site;
    if (user._adminSiteId && user._adminSiteId === siteId) {
      site = await env.DB.prepare('SELECT id FROM sites WHERE id = ?').bind(siteId).first();
    } else {
      site = await env.DB.prepare(
        'SELECT id FROM sites WHERE id = ? AND user_id = ?'
      ).bind(siteId, user.id).first();
    }

    if (!site) {
      return errorResponse('Site not found or unauthorized', 404);
    }

    let resolvedThumbnail = thumbnailUrl || null;
    if (!resolvedThumbnail && Array.isArray(images) && images.length > 0) {
      const idx = typeof mainImageIndex === 'number' ? mainImageIndex : 0;
      resolvedThumbnail = images[idx] || images[0] || null;
    }

    const slug = name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 100);
    const productId = generateId();

    await env.DB.prepare(
      `INSERT INTO products (id, site_id, category_id, name, slug, description, short_description, price, compare_price, cost_price, sku, stock, low_stock_threshold, weight, dimensions, images, thumbnail_url, tags, is_featured, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      productId,
      siteId,
      categoryId || null,
      sanitizeInput(name),
      slug,
      description || null,
      shortDescription || null,
      price,
      comparePrice || null,
      costPrice || null,
      sku || null,
      stock || 0,
      5,
      weight || null,
      dimensions ? JSON.stringify(dimensions) : null,
      images ? JSON.stringify(images) : '[]',
      resolvedThumbnail,
      tags ? JSON.stringify(tags) : '[]',
      isFeatured ? 1 : 0
    ).run();

    return successResponse({ id: productId, slug }, 'Product created successfully');
  } catch (error) {
    console.error('Create product error:', error);
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return errorResponse('Product slug already exists', 400, 'SLUG_EXISTS');
    }
    return errorResponse('Failed to create product', 500);
  }
}

async function updateProduct(request, env, user, productId) {
  if (!productId) {
    return errorResponse('Product ID is required');
  }

  try {
    let product;
    if (user._adminSiteId) {
      product = await env.DB.prepare(
        'SELECT id, site_id FROM products WHERE id = ? AND site_id = ?'
      ).bind(productId, user._adminSiteId).first();
    } else {
      product = await env.DB.prepare(
        `SELECT p.id, p.site_id FROM products p 
         JOIN sites s ON p.site_id = s.id 
         WHERE p.id = ? AND s.user_id = ?`
      ).bind(productId, user.id).first();
    }

    if (!product) {
      return errorResponse('Product not found or unauthorized', 404);
    }

    const updates = await request.json();
    const allowedFields = ['name', 'description', 'short_description', 'price', 'compare_price', 'cost_price', 'sku', 'stock', 'low_stock_threshold', 'category_id', 'images', 'thumbnail_url', 'tags', 'is_featured', 'is_active', 'weight', 'dimensions'];
    
    if (updates.images && !updates.thumbnailUrl && !updates.thumbnail_url) {
      const imgs = Array.isArray(updates.images) ? updates.images : [];
      const idx = typeof updates.mainImageIndex === 'number' ? updates.mainImageIndex : 0;
      const thumb = imgs[idx] || imgs[0] || null;
      if (thumb) updates.thumbnailUrl = thumb;
    }

    const setClause = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'mainImageIndex' || key === 'siteId') continue;
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbKey)) {
        setClause.push(`${dbKey} = ?`);
        if (Array.isArray(value) || typeof value === 'object') {
          values.push(JSON.stringify(value));
        } else if (typeof value === 'boolean') {
          values.push(value ? 1 : 0);
        } else {
          values.push(value);
        }
      }
    }

    if (setClause.length === 0) {
      return errorResponse('No valid fields to update');
    }

    setClause.push('updated_at = datetime("now")');
    values.push(productId);

    await env.DB.prepare(
      `UPDATE products SET ${setClause.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    return successResponse(null, 'Product updated successfully');
  } catch (error) {
    console.error('Update product error:', error);
    return errorResponse('Failed to update product', 500);
  }
}

async function deleteProduct(env, user, productId) {
  if (!productId) {
    return errorResponse('Product ID is required');
  }

  try {
    let product;
    if (user._adminSiteId) {
      product = await env.DB.prepare(
        'SELECT id FROM products WHERE id = ? AND site_id = ?'
      ).bind(productId, user._adminSiteId).first();
    } else {
      product = await env.DB.prepare(
        `SELECT p.id FROM products p 
         JOIN sites s ON p.site_id = s.id 
         WHERE p.id = ? AND s.user_id = ?`
      ).bind(productId, user.id).first();
    }

    if (!product) {
      return errorResponse('Product not found or unauthorized', 404);
    }

    await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(productId).run();

    return successResponse(null, 'Product deleted successfully');
  } catch (error) {
    console.error('Delete product error:', error);
    return errorResponse('Failed to delete product', 500);
  }
}

export async function updateProductStock(env, productId, quantity, operation = 'decrement') {
  try {
    if (operation === 'decrement') {
      await env.DB.prepare(
        'UPDATE products SET stock = stock - ?, updated_at = datetime("now") WHERE id = ? AND stock >= ?'
      ).bind(quantity, productId, quantity).run();
    } else {
      await env.DB.prepare(
        'UPDATE products SET stock = stock + ?, updated_at = datetime("now") WHERE id = ?'
      ).bind(quantity, productId).run();
    }
    return true;
  } catch (error) {
    console.error('Update stock error:', error);
    return false;
  }
}
