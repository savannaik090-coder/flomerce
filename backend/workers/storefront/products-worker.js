import { generateId, sanitizeInput, jsonResponse, errorResponse, successResponse, handleCORS } from '../../utils/helpers.js';
import { cachedJsonResponse, purgeStorefrontCache } from '../../utils/cache.js';
import { validateAuth } from '../../utils/auth.js';
import { validateSiteAdmin, hasPermission } from './site-admin-worker.js';
import { checkUsageLimit, estimateRowBytes, trackD1Write, trackD1Delete, trackD1Update, removeMediaFile } from '../../utils/usage-tracker.js';
import { resolveSiteDBById, resolveSiteDBBySubdomain, checkMigrationLock, ensureProductOptionsColumn, ensureProductSubcategoryColumn } from '../../utils/site-db.js';
import { triggerAutoNotification } from './notifications-worker.js';
import { translateContentBatch, isTargetSupported } from '../../utils/server-translator.js';

/**
 * Walk a list of products and collect every translatable string into a flat
 * array, remembering the (productIndex, accessor) for each so we can splice
 * translations back. Then call translateContentBatch once for all products
 * in one Microsoft round-trip (when needed). Mutates products in place.
 *
 * Translatable fields per product:
 *   - name, description, short_description
 *   - category_name, subcategory_name (joined columns)
 *   - tags[] (JSON array of strings)
 *   - options[].name and options[].values[] (JSON)
 *
 * Fields explicitly NOT translated: prices, slugs, IDs, image URLs, dates,
 * SKUs, status enums, brand_name (treated as proper noun).
 */
async function translateProductsInPlace(env, siteId, products, lang) {
  if (!Array.isArray(products) || products.length === 0) return;

  const slots = [];
  for (let pi = 0; pi < products.length; pi++) {
    const p = products[pi];
    if (p.name) slots.push({ pi, kind: 'name', value: String(p.name) });
    if (p.description) slots.push({ pi, kind: 'description', value: String(p.description) });
    if (p.short_description) slots.push({ pi, kind: 'short_description', value: String(p.short_description) });
    if (p.category_name) slots.push({ pi, kind: 'category_name', value: String(p.category_name) });
    if (p.subcategory_name) slots.push({ pi, kind: 'subcategory_name', value: String(p.subcategory_name) });
    if (Array.isArray(p.tags)) {
      for (let ti = 0; ti < p.tags.length; ti++) {
        if (typeof p.tags[ti] === 'string' && p.tags[ti]) {
          slots.push({ pi, kind: 'tag', idx: ti, value: p.tags[ti] });
        }
      }
    }
    if (Array.isArray(p.options)) {
      for (let oi = 0; oi < p.options.length; oi++) {
        const opt = p.options[oi];
        if (opt && typeof opt.name === 'string' && opt.name) {
          slots.push({ pi, kind: 'option_name', oi, value: opt.name });
        }
        if (opt && Array.isArray(opt.values)) {
          for (let vi = 0; vi < opt.values.length; vi++) {
            if (typeof opt.values[vi] === 'string' && opt.values[vi]) {
              slots.push({ pi, kind: 'option_value', oi, vi, value: opt.values[vi] });
            }
          }
        }
      }
    }
  }

  if (slots.length === 0) return;

  const result = await translateContentBatch(env, siteId, slots.map((s) => s.value), lang);
  const translations = result.translations;

  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    const t = translations[i];
    if (t === undefined || t === null) continue;
    const p = products[s.pi];
    if (!p) continue;
    try {
      switch (s.kind) {
        case 'name': p.name = t; break;
        case 'description': p.description = t; break;
        case 'short_description': p.short_description = t; break;
        case 'category_name': p.category_name = t; break;
        case 'subcategory_name': p.subcategory_name = t; break;
        case 'tag':
          if (Array.isArray(p.tags) && s.idx < p.tags.length) p.tags[s.idx] = t;
          break;
        case 'option_name':
          if (Array.isArray(p.options) && p.options[s.oi]) p.options[s.oi].name = t;
          break;
        case 'option_value':
          if (Array.isArray(p.options) && p.options[s.oi] && Array.isArray(p.options[s.oi].values) && s.vi < p.options[s.oi].values.length) {
            p.options[s.oi].values[s.vi] = t;
          }
          break;
      }
    } catch (e) {
      // Defensive: never let a single splice failure break the whole response.
      console.error('[products] splice slot failed:', s.kind, e.message || e);
    }
  }
}

export async function handleProducts(request, env, path, ctx) {
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;

  const url = new URL(request.url);
  const method = request.method;
  const pathParts = path.split('/').filter(Boolean);
  const productId = pathParts[2];

  if (productId === 'options-template') {
    if (method === 'GET') {
      return getOptionsTemplate(request, env, url);
    }
    if (method === 'PUT') {
      return saveOptionsTemplate(request, env);
    }
  }

  if (method === 'GET') {
    const siteId = url.searchParams.get('siteId');
    const subdomain = url.searchParams.get('subdomain');
    const category = url.searchParams.get('category');
    const categoryId = url.searchParams.get('categoryId');
    const subcategoryId = url.searchParams.get('subcategoryId');
    const lang = url.searchParams.get('lang');

    if (productId) {
      return getProduct(env, productId, siteId, subdomain, lang);
    }
    return getProducts(env, { siteId, subdomain, category, categoryId, subcategoryId, url, lang });
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
      return createProduct(request, env, user, ctx);
    case 'PUT':
      if (adminPerms && !hasPermission(adminPerms, 'products')) return errorResponse('You do not have permission to manage products', 403);
      return updateProduct(request, env, user, productId, ctx);
    case 'DELETE':
      if (adminPerms && !hasPermission(adminPerms, 'products')) return errorResponse('You do not have permission to manage products', 403);
      return deleteProduct(env, user, productId);
    default:
      return errorResponse('Method not allowed', 405);
  }
}

async function getProducts(env, { siteId, subdomain, category, categoryId, subcategoryId, url, lang }) {
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

    await ensureProductSubcategoryColumn(db, siteId);

    let query = 'SELECT p.*, c.name as category_name, c.slug as category_slug, sc.name as subcategory_name, sc.slug as subcategory_slug FROM products p LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN categories sc ON p.subcategory_id = sc.id WHERE p.is_active = 1';
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

    if (subcategoryId) {
      query += ' AND p.subcategory_id = ?';
      bindings.push(subcategoryId);
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

    if (lang && siteId) {
      const supported = await isTargetSupported(env, siteId, lang);
      if (supported.ok) {
        try {
          await translateProductsInPlace(env, siteId, parsedProducts, lang);
        } catch (e) {
          console.error('[products] translation failed, returning originals:', e.message || e);
        }
      }
    }

    return cachedJsonResponse({ success: true, message: 'Success', data: parsedProducts });
  } catch (error) {
    console.error('Get products error:', error);
    return errorResponse('Failed to fetch products', 500);
  }
}

async function getProduct(env, productId, siteId, subdomain, lang) {
  try {
    if (!siteId && subdomain) {
      const site = await env.DB.prepare(
        'SELECT id FROM sites WHERE LOWER(subdomain) = LOWER(?)'
      ).bind(subdomain).first();
      if (site) siteId = site.id;
    }

    const db = await resolveSiteDBById(env, siteId);
    await ensureProductSubcategoryColumn(db, siteId);

    let product = null;

    let productQuery = `SELECT p.*, c.name as category_name, c.slug as category_slug, sc.name as subcategory_name, sc.slug as subcategory_slug
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN categories sc ON p.subcategory_id = sc.id
       WHERE p.id = ?`;
    const productBindings = [productId];
    if (siteId) {
      productQuery += ' AND p.site_id = ?';
      productBindings.push(siteId);
    }
    product = await db.prepare(productQuery).bind(...productBindings).first();

    if (!product) {
      let slugQuery = `SELECT p.*, c.name as category_name, c.slug as category_slug, sc.name as subcategory_name, sc.slug as subcategory_slug
         FROM products p 
         LEFT JOIN categories c ON p.category_id = c.id
         LEFT JOIN categories sc ON p.subcategory_id = sc.id
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

    if (lang && product.site_id) {
      const supported = await isTargetSupported(env, product.site_id, lang);
      if (supported.ok) {
        try {
          await translateProductsInPlace(env, product.site_id, [parsedProduct], lang);
        } catch (e) {
          console.error('[product] translation failed, returning originals:', e.message || e);
        }
      }
    }

    return cachedJsonResponse({ success: true, message: 'Success', data: parsedProduct });
  } catch (error) {
    console.error('Get product error:', error);
    return errorResponse('Failed to fetch product', 500);
  }
}

async function createProduct(request, env, user, ctx) {
  try {
    const data = await request.json();
    const { siteId, name, description, shortDescription, price, comparePrice, costPrice, sku, stock, categoryId, subcategoryId, images, thumbnailUrl, mainImageIndex, tags, isFeatured, weight, dimensions, options, hsnCode, gstRate } = data;

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
    await ensureProductOptionsColumn(db, siteId);
    await ensureProductSubcategoryColumn(db, siteId);

    let resolvedThumbnail = thumbnailUrl || null;
    if (!resolvedThumbnail && Array.isArray(images) && images.length > 0) {
      const idx = typeof mainImageIndex === 'number' ? mainImageIndex : 0;
      resolvedThumbnail = images[idx] || images[0] || null;
    }

    let slug = name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 100);
    const existingSlug = await db.prepare(
      'SELECT id FROM products WHERE site_id = ? AND slug = ?'
    ).bind(siteId, slug).first();
    if (existingSlug) {
      slug = slug.substring(0, 90) + '-' + Date.now().toString(36);
    }
    const productId = generateId();

    const autoSku = sku || ('SKU-' + productId.substring(0, 8).toUpperCase());

    const optionsStr = options ? JSON.stringify(options) : null;
    const rowData = { id: productId, site_id: siteId, category_id: categoryId, subcategory_id: subcategoryId, name, slug, description, short_description: shortDescription, price, compare_price: comparePrice, cost_price: costPrice, sku: autoSku, stock, images, thumbnail_url: resolvedThumbnail, tags, is_featured: isFeatured, weight, dimensions, options: optionsStr, hsn_code: hsnCode, gst_rate: gstRate };
    const rowBytes = estimateRowBytes(rowData);

    const usageCheck = await checkUsageLimit(env, siteId, 'd1', rowBytes);
    if (!usageCheck.allowed) {
      return errorResponse(usageCheck.reason, 403, 'STORAGE_LIMIT');
    }

    const runInsert = () => db.prepare(
      `INSERT INTO products (id, site_id, category_id, subcategory_id, name, slug, description, short_description, price, compare_price, cost_price, sku, stock, low_stock_threshold, weight, dimensions, images, thumbnail_url, tags, is_featured, options, hsn_code, gst_rate, row_size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      productId,
      siteId,
      categoryId || null,
      subcategoryId || null,
      sanitizeInput(name),
      slug,
      description || null,
      shortDescription || null,
      price,
      comparePrice || null,
      costPrice || null,
      autoSku,
      stock || 0,
      3,
      weight || null,
      dimensions ? JSON.stringify(dimensions) : null,
      images ? JSON.stringify(images) : '[]',
      resolvedThumbnail,
      tags ? JSON.stringify(tags) : '[]',
      isFeatured ? 1 : 0,
      optionsStr,
      hsnCode || null,
      gstRate != null ? gstRate : 0,
      rowBytes
    ).run();

    try {
      await runInsert();
    } catch (insertErr) {
      if (insertErr.message && (insertErr.message.includes('options') || insertErr.message.includes('hsn_code') || insertErr.message.includes('gst_rate'))) {
        if (insertErr.message.includes('options')) {
          await ensureProductOptionsColumn(db, siteId);
        }
        if (insertErr.message.includes('hsn_code') || insertErr.message.includes('gst_rate')) {
          try { await db.prepare('ALTER TABLE products ADD COLUMN hsn_code TEXT').run(); } catch (e) {}
          try { await db.prepare('ALTER TABLE products ADD COLUMN gst_rate REAL DEFAULT 0').run(); } catch (e) {}
        }
        await runInsert();
      } else {
        throw insertErr;
      }
    }

    await trackD1Write(env, siteId, rowBytes);

    if (ctx) {
      ctx.waitUntil(
        triggerAutoNotification(env, siteId, 'newProduct', {
          title: 'New Arrival!',
          body: `Check out our new product: ${sanitizeInput(name)}`,
          icon: '/icon-192.png',
          image: resolvedThumbnail || null,
          data: { url: `/product/${productId}` },
        }).catch(err => console.error('[Notifications] newProduct auto-trigger failed:', err))
      );
    }

    if (ctx) ctx.waitUntil(purgeStorefrontCache(env, siteId, ['products'], { productId }));

    return successResponse({ id: productId, slug }, 'Product created successfully');
  } catch (error) {
    console.error('Create product error:', error);
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return errorResponse('Product slug already exists', 400, 'SLUG_EXISTS');
    }
    return errorResponse('Failed to create product', 500);
  }
}

async function updateProduct(request, env, user, productId, ctx) {
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
    await ensureProductSubcategoryColumn(db, resolvedSiteId);

    const updates = await request.json();
    const allowedFields = ['name', 'description', 'short_description', 'price', 'compare_price', 'cost_price', 'sku', 'stock', 'low_stock_threshold', 'category_id', 'subcategory_id', 'images', 'thumbnail_url', 'tags', 'is_featured', 'is_active', 'weight', 'dimensions', 'options', 'hsn_code', 'gst_rate'];

    let oldProductData = null;
    const needsOldData = updates.price !== undefined || updates.stock !== undefined;
    if (needsOldData) {
      try {
        oldProductData = await db.prepare('SELECT name, price, stock, thumbnail_url, low_stock_threshold FROM products WHERE id = ?').bind(productId).first();
      } catch (e) {}
    }
    
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
        if (value === null || value === undefined) {
          values.push(null);
        } else if (Array.isArray(value) || typeof value === 'object') {
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

    const runUpdate = () => db.prepare(
      `UPDATE products SET ${setClause.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    try {
      await runUpdate();
    } catch (updateErr) {
      if (updateErr.message && (updateErr.message.includes('options') || updateErr.message.includes('hsn_code') || updateErr.message.includes('gst_rate'))) {
        if (updateErr.message.includes('options')) {
          await ensureProductOptionsColumn(db, resolvedSiteId);
        }
        if (updateErr.message.includes('hsn_code') || updateErr.message.includes('gst_rate')) {
          try { await db.prepare('ALTER TABLE products ADD COLUMN hsn_code TEXT').run(); } catch (e) {}
          try { await db.prepare('ALTER TABLE products ADD COLUMN gst_rate REAL DEFAULT 0').run(); } catch (e) {}
        }
        await runUpdate();
      } else {
        throw updateErr;
      }
    }

    const updatedProdRow = await db.prepare('SELECT * FROM products WHERE id = ?').bind(productId).first();
    const newBytes = updatedProdRow ? estimateRowBytes(updatedProdRow) : oldBytes;
    if (updatedProdRow) {
      await db.prepare('UPDATE products SET row_size_bytes = ? WHERE id = ?').bind(newBytes, productId).run();
    }
    await trackD1Update(env, resolvedSiteId, oldBytes, newBytes);

    if (oldProductData && updatedProdRow) {
      const prodName = updatedProdRow.name || oldProductData.name || 'Product';
      const prodThumb = updatedProdRow.thumbnail_url || oldProductData.thumbnail_url || '/icon-192.png';
      const prodLink = `/product/${productId}`;

      if (updates.price !== undefined && typeof oldProductData.price === 'number' && typeof updatedProdRow.price === 'number' && updatedProdRow.price < oldProductData.price) {
        if (ctx) {
          ctx.waitUntil(
            triggerAutoNotification(env, resolvedSiteId, 'priceDrop', {
              title: 'Price Drop!',
              body: `Great news! ${prodName} just got a price drop. Don't miss out!`,
              icon: '/icon-192.png',
              image: prodThumb !== '/icon-192.png' ? prodThumb : null,
              data: { url: prodLink },
            }).catch(err => console.error('[Notifications] priceDrop auto-trigger failed:', err))
          );
        }
      }

      if (updates.stock !== undefined && (oldProductData.stock === 0 || oldProductData.stock === null) && updatedProdRow.stock > 0) {
        if (ctx) {
          ctx.waitUntil(
            triggerAutoNotification(env, resolvedSiteId, 'backInStock', {
              title: 'Back in Stock!',
              body: `${prodName} is available again. Grab it before it sells out!`,
              icon: '/icon-192.png',
              image: prodThumb !== '/icon-192.png' ? prodThumb : null,
              data: { url: prodLink },
            }).catch(err => console.error('[Notifications] backInStock auto-trigger failed:', err))
          );
        }
      }

      if (updates.stock !== undefined) {
        const oldStk = oldProductData.stock;
        const newStk = updatedProdRow.stock;
        if (newStk > 0 && newStk <= 3 && (oldStk === null || oldStk > 3)) {
          if (ctx) {
            ctx.waitUntil(
              triggerAutoNotification(env, resolvedSiteId, 'lowStock', {
                title: 'Selling Out Fast!',
                body: `Only ${newStk} left in stock for ${prodName}. Hurry up!`,
                icon: '/icon-192.png',
                image: prodThumb !== '/icon-192.png' ? prodThumb : null,
                data: { url: prodLink },
              }).catch(err => console.error('[Notifications] lowStock auto-trigger failed:', err))
            );
          }
        }
      }
    }

    if (ctx) ctx.waitUntil(purgeStorefrontCache(env, resolvedSiteId, ['products'], { productId }));

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
        'SELECT id, site_id, images, thumbnail_url, row_size_bytes FROM products WHERE id = ? AND site_id = ?'
      ).bind(productId, user._adminSiteId).first();
    } else {
      const userSites = await env.DB.prepare(
        'SELECT id FROM sites WHERE user_id = ?'
      ).bind(user.id).all();
      
      for (const s of (userSites.results || [])) {
        const db = await resolveSiteDBById(env, s.id);
        product = await db.prepare(
          'SELECT id, site_id, images, thumbnail_url, row_size_bytes FROM products WHERE id = ? AND site_id = ?'
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

    const imageUrls = [];
    if (product.images) {
      try {
        const parsed = JSON.parse(product.images);
        if (Array.isArray(parsed)) imageUrls.push(...parsed);
      } catch {}
    }
    if (product.thumbnail_url) imageUrls.push(product.thumbnail_url);

    for (const imgUrl of imageUrls) {
      try {
        const keyMatch = imgUrl.match(/[?&]key=([^&]+)/);
        if (keyMatch) {
          const key = decodeURIComponent(keyMatch[1]);
          if (key.startsWith(`sites/${resolvedSiteId}/`)) {
            await env.STORAGE.delete(key);
            await removeMediaFile(env, resolvedSiteId, key);
          }
        }
      } catch (e) {
        console.error('Failed to delete product image from R2:', e);
      }
    }

    purgeStorefrontCache(env, resolvedSiteId, ['products'], { productId }).catch(() => {});

    return successResponse(null, 'Product deleted successfully');
  } catch (error) {
    console.error('Delete product error:', error);
    return errorResponse('Failed to delete product', 500);
  }
}

export async function updateProductStock(env, productId, quantity, operation = 'decrement', siteId = null, ctx = null) {
  try {
    if (siteId && await checkMigrationLock(env, siteId)) {
      console.error('Stock update blocked: site migration in progress');
      return false;
    }

    const db = await resolveSiteDBById(env, siteId);
    const oldRow = await db.prepare('SELECT row_size_bytes, stock FROM products WHERE id = ?').bind(productId).first();
    const oldBytes = oldRow?.row_size_bytes || 0;
    const oldStock = oldRow?.stock ?? null;

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

      if (operation === 'decrement' && updatedRow.stock > 0 && updatedRow.stock <= 3 && (oldStock === null || oldStock > 3)) {
        const prodThumb = updatedRow.thumbnail_url || null;
        const notifPromise = triggerAutoNotification(env, siteId, 'lowStock', {
          title: 'Selling Out Fast!',
          body: `Only ${updatedRow.stock} left in stock for ${updatedRow.name}. Hurry up!`,
          icon: '/icon-192.png',
          image: prodThumb,
          data: { url: `/product/${productId}` },
        }).catch(err => console.error('[Notifications] lowStock auto-trigger failed:', err));

        if (ctx) {
          ctx.waitUntil(notifPromise);
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Update stock error:', error);
    return false;
  }
}

async function getOptionsTemplate(request, env, url) {
  try {
    const siteId = url.searchParams.get('siteId');
    if (!siteId) return errorResponse('siteId is required');

    const user = await validateAuth(request, env);
    const authHeader = request.headers.get('Authorization');
    let authorized = !!user;
    if (!authorized && authHeader && authHeader.startsWith('SiteAdmin ')) {
      const admin = await validateSiteAdmin(request, env, siteId);
      authorized = !!admin;
    }
    if (!authorized) return errorResponse('Unauthorized', 401);

    const db = await resolveSiteDBById(env, siteId);
    const config = await db.prepare('SELECT settings FROM site_config WHERE site_id = ?').bind(siteId).first();
    let settings = {};
    if (config?.settings) {
      try { settings = JSON.parse(config.settings); } catch {}
    }
    return successResponse({ template: settings.productOptionsTemplate || null });
  } catch (error) {
    console.error('Get options template error:', error);
    return errorResponse('Failed to load options template', 500);
  }
}

async function saveOptionsTemplate(request, env) {
  try {
    const { siteId, template } = await request.json();
    if (!siteId) return errorResponse('siteId is required');

    const user = await validateAuth(request, env);
    const authHeader = request.headers.get('Authorization');
    let authorized = !!user;
    if (!authorized && authHeader && authHeader.startsWith('SiteAdmin ')) {
      const admin = await validateSiteAdmin(request, env, siteId);
      authorized = !!admin;
    }
    if (!authorized) return errorResponse('Unauthorized', 401);

    const db = await resolveSiteDBById(env, siteId);
    const config = await db.prepare('SELECT settings FROM site_config WHERE site_id = ?').bind(siteId).first();
    let settings = {};
    if (config?.settings) {
      try { settings = JSON.parse(config.settings); } catch {}
    }
    settings.productOptionsTemplate = template || null;
    await db.prepare('UPDATE site_config SET settings = ?, updated_at = datetime("now") WHERE site_id = ?')
      .bind(JSON.stringify(settings), siteId).run();
    return successResponse(null, 'Options template saved');
  } catch (error) {
    console.error('Save options template error:', error);
    return errorResponse('Failed to save options template', 500);
  }
}
