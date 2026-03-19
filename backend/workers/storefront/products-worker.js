import { generateId, sanitizeInput, jsonResponse, errorResponse, successResponse, handleCORS } from '../../utils/helpers.js';
import { validateAuth } from '../../utils/auth.js';
import { validateSiteAdmin, hasPermission } from './site-admin-worker.js';
import { checkUsageLimit, estimateRowBytes, trackD1Write, trackD1Delete, trackD1Update } from '../../utils/usage-tracker.js';
import { resolveSiteDBById, resolveSiteDBBySubdomain, checkMigrationLock } from '../../utils/site-db.js';

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
      return getProduct(env, productId, siteId, subdomain);
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

      if (!siteId && method === 'PUT' && productId) {
        try {
          const cloned = request.clone();
          const body = await cloned.json();
          siteId = body.siteId;
        } catch (e) {}
      }

      if (siteId) {
        const admin = await validateSiteAdmin(request, env, siteId);
        if (admin) {
          adminSiteId = siteId;
          user = { id: admin.staffId || 'site-admin', _adminSiteId: siteId, _adminPermissions: admin };
        }
      }
    }
  }

  if (!user) {
    return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const adminPerms = user._adminPermissions;

  switch (method) {
    case 'POST':
      if (adminPerms && !hasPermission(adminPerms, 'products')) return errorResponse('You do not have permission to manage products', 403);
      return createProduct(request, env, user);
    case 'PUT':
      if (adminPerms && !hasPermission(adminPerms, 'products')) return errorResponse('You do not have permission to manage products', 403);
      return updateProduct(request, env, user, productId);
    case 'DELETE':
      if (adminPerms && !hasPermission(adminPerms, 'products')) return errorResponse('You do not have permission to manage products', 403);
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

    let db;
    if (siteId) {
      db = await resolveSiteDBById(env, siteId);
    } else if (subdomain) {
      const site = await env.DB.prepare(
        'SELECT id FROM sites WHERE LOWER(subdomain) = LOWER(?)'
      ).bind(subdomain).first();
      if (site) {
        siteId = site.id;
      }
      db = await resolveSiteDBBySubdomain(env, subdomain);
    }

    let query = 'SELECT p.*, c.name as category_name, c.slug as category_slug FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.is_active = 1';
    const bindings = [];

    if (siteId) {
      query += ' AND p.site_id = ?';
      bindings.push(siteId);
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

    const products = await db.prepare(query).bind(...bindings).all();

    const parsedProducts = products.results.map(product => ({
      ...product,
      images: product.images ? JSON.parse(product.images) : [],
      tags: product.tags ? JSON.parse(product.tags) : [],
      options: product.options ? JSON.parse(product.options) : null,
    }));

    return successResponse(parsedProducts);
  } catch (error) {
    console.error('Get products error:', error);
    return errorResponse('Failed to fetch products', 500);
  }
}

async function getProduct(env, productId, siteId, subdomain) {
  try {
    if (!siteId && subdomain) {
      const site = await env.DB.prepare(
        'SELECT id FROM sites WHERE LOWER(subdomain) = LOWER(?)'
      ).bind(subdomain).first();
      if (site) siteId = site.id;
    }

    const db = await resolveSiteDBById(env, siteId);

    let product = null;

    let productQuery = `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = ?`;
    const productBindings = [productId];
    if (siteId) {
      productQuery += ' AND p.site_id = ?';
      productBindings.push(siteId);
    }
    product = await db.prepare(productQuery).bind(...productBindings).first();

    if (!product) {
      let slugQuery = `SELECT p.*, c.name as category_name, c.slug as category_slug
         FROM products p 
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.slug = ?`;
      const slugBindings = [productId];
      if (siteId) {
        slugQuery += ' AND p.site_id = ?';
        slugBindings.push(siteId);
      }
      product = await db.prepare(slugQuery).bind(...slugBindings).first();
    }

    if (!product) {
      return errorResponse('Product not found', 404, 'NOT_FOUND');
    }

    const siteInfo = await env.DB.prepare(
      'SELECT brand_name, subdomain FROM sites WHERE id = ?'
    ).bind(product.site_id).first();
    if (siteInfo) {
      product.brand_name = siteInfo.brand_name;
      product.subdomain = siteInfo.subdomain;
    }

    let variantResults = [];
    try {
      const variants = await db.prepare(
        'SELECT * FROM product_variants WHERE product_id = ?'
      ).bind(product.id).all();
      variantResults = variants.results || [];
    } catch (_) {}

    const parsedProduct = {
      ...product,
      images: product.images ? JSON.parse(product.images) : [],
      tags: product.tags ? JSON.parse(product.tags) : [],
      options: product.options ? JSON.parse(product.options) : null,
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
    const { siteId, name, description, shortDescription, price, comparePrice, costPrice, sku, stock, categoryId, images, thumbnailUrl, mainImageIndex, tags, isFeatured, weight, dimensions, options } = data;

    if (!siteId || !name || price === undefined) {
      return errorResponse('Site ID, name and price are required');
    }

    if (await checkMigrationLock(env, siteId)) {
      return errorResponse('Site is currently being migrated. Please try again shortly.', 423);
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

    const db = await resolveSiteDBById(env, siteId);

    let resolvedThumbnail = thumbnailUrl || null;
    if (!resolvedThumbnail && Array.isArray(images) && images.length > 0) {
      const idx = typeof mainImageIndex === 'number' ? mainImageIndex : 0;
      resolvedThumbnail = images[idx] || images[0] || null;
    }

    const slug = name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 100);
    const productId = generateId();

    const optionsStr = options ? JSON.stringify(options) : null;
    const rowData = { id: productId, site_id: siteId, category_id: categoryId, name, slug, description, short_description: shortDescription, price, compare_price: comparePrice, cost_price: costPrice, sku, stock, images, thumbnail_url: resolvedThumbnail, tags, is_featured: isFeatured, weight, dimensions, options: optionsStr };
    const rowBytes = estimateRowBytes(rowData);

    const usageCheck = await checkUsageLimit(env, siteId, 'd1', rowBytes);
    if (!usageCheck.allowed) {
      return errorResponse(usageCheck.reason, 403, 'STORAGE_LIMIT');
    }

    await db.prepare(
      `INSERT INTO products (id, site_id, category_id, name, slug, description, short_description, price, compare_price, cost_price, sku, stock, low_stock_threshold, weight, dimensions, images, thumbnail_url, tags, is_featured, options, row_size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
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
      isFeatured ? 1 : 0,
      optionsStr,
      rowBytes
    ).run();

    await trackD1Write(env, siteId, rowBytes);

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
    let siteId = user._adminSiteId || null;

    if (user._adminSiteId) {
      const db = await resolveSiteDBById(env, user._adminSiteId);
      product = await db.prepare(
        'SELECT id, site_id, row_size_bytes FROM products WHERE id = ? AND site_id = ?'
      ).bind(productId, user._adminSiteId).first();
    } else {
      const userSites = await env.DB.prepare(
        'SELECT id FROM sites WHERE user_id = ?'
      ).bind(user.id).all();
      
      for (const s of (userSites.results || [])) {
        const db = await resolveSiteDBById(env, s.id);
        product = await db.prepare(
          'SELECT id, site_id, row_size_bytes FROM products WHERE id = ? AND site_id = ?'
        ).bind(productId, s.id).first();
        if (product) {
          siteId = s.id;
          break;
        }
      }
    }

    if (!product) {
      return errorResponse('Product not found or unauthorized', 404);
    }

    const resolvedSiteId = siteId || product.site_id;

    if (await checkMigrationLock(env, resolvedSiteId)) {
      return errorResponse('Site is currently being migrated. Please try again shortly.', 423);
    }

    const db = await resolveSiteDBById(env, resolvedSiteId);

    const updates = await request.json();
    const allowedFields = ['name', 'description', 'short_description', 'price', 'compare_price', 'cost_price', 'sku', 'stock', 'low_stock_threshold', 'category_id', 'images', 'thumbnail_url', 'tags', 'is_featured', 'is_active', 'weight', 'dimensions', 'options'];
    
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

    const oldBytes = product.row_size_bytes || 0;

    setClause.push('updated_at = datetime("now")');
    values.push(productId);

    await db.prepare(
      `UPDATE products SET ${setClause.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    const updatedProdRow = await db.prepare('SELECT * FROM products WHERE id = ?').bind(productId).first();
    const newBytes = updatedProdRow ? estimateRowBytes(updatedProdRow) : oldBytes;
    if (updatedProdRow) {
      await db.prepare('UPDATE products SET row_size_bytes = ? WHERE id = ?').bind(newBytes, productId).run();
    }
    await trackD1Update(env, resolvedSiteId, oldBytes, newBytes);

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
    let siteId = user._adminSiteId || null;

    if (user._adminSiteId) {
      const db = await resolveSiteDBById(env, user._adminSiteId);
      product = await db.prepare(
        'SELECT id, site_id, row_size_bytes FROM products WHERE id = ? AND site_id = ?'
      ).bind(productId, user._adminSiteId).first();
    } else {
      const userSites = await env.DB.prepare(
        'SELECT id FROM sites WHERE user_id = ?'
      ).bind(user.id).all();
      
      for (const s of (userSites.results || [])) {
        const db = await resolveSiteDBById(env, s.id);
        product = await db.prepare(
          'SELECT id, site_id, row_size_bytes FROM products WHERE id = ? AND site_id = ?'
        ).bind(productId, s.id).first();
        if (product) {
          siteId = s.id;
          break;
        }
      }
    }

    if (!product) {
      return errorResponse('Product not found or unauthorized', 404);
    }

    const resolvedSiteId = siteId || product.site_id;

    if (await checkMigrationLock(env, resolvedSiteId)) {
      return errorResponse('Site is currently being migrated. Please try again shortly.', 423);
    }

    const db = await resolveSiteDBById(env, resolvedSiteId);
    const bytesToRemove = product.row_size_bytes || 0;

    await db.prepare('DELETE FROM products WHERE id = ?').bind(productId).run();

    if (bytesToRemove > 0) {
      await trackD1Delete(env, resolvedSiteId, bytesToRemove);
    }

    return successResponse(null, 'Product deleted successfully');
  } catch (error) {
    console.error('Delete product error:', error);
    return errorResponse('Failed to delete product', 500);
  }
}

export async function updateProductStock(env, productId, quantity, operation = 'decrement', siteId = null) {
  try {
    if (siteId && await checkMigrationLock(env, siteId)) {
      console.error('Stock update blocked: site migration in progress');
      return false;
    }

    const db = await resolveSiteDBById(env, siteId);
    const oldRow = await db.prepare('SELECT row_size_bytes FROM products WHERE id = ?').bind(productId).first();
    const oldBytes = oldRow?.row_size_bytes || 0;

    if (operation === 'decrement') {
      await db.prepare(
        'UPDATE products SET stock = stock - ?, updated_at = datetime("now") WHERE id = ? AND stock >= ?'
      ).bind(quantity, productId, quantity).run();
    } else {
      await db.prepare(
        'UPDATE products SET stock = stock + ?, updated_at = datetime("now") WHERE id = ?'
      ).bind(quantity, productId).run();
    }

    const updatedRow = await db.prepare('SELECT * FROM products WHERE id = ?').bind(productId).first();
    if (updatedRow && siteId) {
      const newBytes = estimateRowBytes(updatedRow);
      await db.prepare('UPDATE products SET row_size_bytes = ? WHERE id = ?').bind(newBytes, productId).run();
      await trackD1Update(env, siteId, oldBytes, newBytes);
    }

    return true;
  } catch (error) {
    console.error('Update stock error:', error);
    return false;
  }
}
