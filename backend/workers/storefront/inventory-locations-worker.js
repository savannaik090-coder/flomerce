import { generateId, jsonResponse, errorResponse, successResponse, handleCORS } from '../../utils/helpers.js';
import { validateSiteAdmin, hasPermission } from './site-admin-worker.js';
import { resolveSiteDBById } from '../../utils/site-db.js';

async function ensureLocationTables(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS inventory_locations (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL,
    name TEXT NOT NULL,
    address TEXT DEFAULT '',
    priority INTEGER DEFAULT 0,
    is_default INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`).run();

  await db.prepare(`CREATE TABLE IF NOT EXISTS inventory_levels (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    stock INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(product_id, location_id)
  )`).run();

  await db.prepare(`CREATE TABLE IF NOT EXISTS inventory_transfers (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    from_location_id TEXT NOT NULL,
    to_location_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    notes TEXT DEFAULT '',
    created_by TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  )`).run();
}

export async function handleInventoryLocations(request, env, path, ctx) {
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;

  const url = new URL(request.url);
  const method = request.method;
  const pathParts = path.split('/').filter(Boolean);
  const segment = pathParts[2];

  const siteId = url.searchParams.get('siteId');
  if (!siteId) return errorResponse('siteId is required', 400);

  const admin = await validateSiteAdmin(request, env, siteId);
  if (!admin) return errorResponse('Unauthorized', 401);
  if (!admin.isOwner && !hasPermission(admin, 'inventory')) {
    return errorResponse('Permission denied', 403);
  }

  const db = await resolveSiteDBById(env, siteId);
  await ensureLocationTables(db);

  if (segment === 'transfers') {
    if (method === 'GET') return getTransfers(db, siteId, url);
    if (method === 'POST') return createTransfer(request, db, siteId, admin);
    return errorResponse('Method not allowed', 405);
  }

  if (segment === 'levels') {
    if (method === 'GET') return getLevels(db, siteId, url);
    if (method === 'PUT') return setLevel(request, db, siteId);
    return errorResponse('Method not allowed', 405);
  }

  if (segment === 'sync') {
    if (method === 'POST') return syncProductStock(db, siteId, url);
    return errorResponse('Method not allowed', 405);
  }

  if (method === 'GET') return getLocations(db, siteId);
  if (method === 'POST') return createLocation(request, db, siteId);
  if (method === 'PUT' && segment) return updateLocation(request, db, siteId, segment);
  if (method === 'DELETE' && segment) return deleteLocation(db, siteId, segment);

  return errorResponse('Method not allowed', 405);
}

async function getLocations(db, siteId) {
  try {
    const result = await db.prepare(
      'SELECT * FROM inventory_locations WHERE site_id = ? AND is_active = 1 ORDER BY priority ASC, name ASC'
    ).bind(siteId).all();
    return successResponse(result.results || []);
  } catch (e) {
    console.error('Get locations error:', e);
    return errorResponse('Failed to fetch locations', 500);
  }
}

async function createLocation(request, db, siteId) {
  try {
    const { name, address, priority, is_default } = await request.json();
    if (!name || !name.trim()) return errorResponse('Location name is required', 400);

    const id = generateId();

    if (is_default) {
      await db.prepare(
        'UPDATE inventory_locations SET is_default = 0 WHERE site_id = ?'
      ).bind(siteId).run();
    }

    const existing = await db.prepare(
      'SELECT COUNT(*) as count FROM inventory_locations WHERE site_id = ? AND is_active = 1'
    ).bind(siteId).first();
    const makeDefault = is_default || (existing?.count === 0);

    await db.prepare(
      `INSERT INTO inventory_locations (id, site_id, name, address, priority, is_default) VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(id, siteId, name.trim(), address || '', priority || 0, makeDefault ? 1 : 0).run();

    return successResponse({ id, name: name.trim(), address: address || '', priority: priority || 0, is_default: makeDefault }, 'Location created');
  } catch (e) {
    console.error('Create location error:', e);
    return errorResponse('Failed to create location', 500);
  }
}

async function updateLocation(request, db, siteId, locationId) {
  try {
    const { name, address, priority, is_default } = await request.json();

    const existing = await db.prepare(
      'SELECT * FROM inventory_locations WHERE id = ? AND site_id = ?'
    ).bind(locationId, siteId).first();
    if (!existing) return errorResponse('Location not found', 404);

    if (is_default) {
      await db.prepare(
        'UPDATE inventory_locations SET is_default = 0 WHERE site_id = ?'
      ).bind(siteId).run();
    }

    await db.prepare(
      `UPDATE inventory_locations SET name = ?, address = ?, priority = ?, is_default = ?, updated_at = datetime('now') WHERE id = ? AND site_id = ?`
    ).bind(
      name !== undefined ? name.trim() : existing.name,
      address !== undefined ? address : existing.address,
      priority !== undefined ? priority : existing.priority,
      is_default ? 1 : (is_default === false ? 0 : existing.is_default),
      locationId, siteId
    ).run();

    return successResponse(null, 'Location updated');
  } catch (e) {
    console.error('Update location error:', e);
    return errorResponse('Failed to update location', 500);
  }
}

async function deleteLocation(db, siteId, locationId) {
  try {
    const loc = await db.prepare(
      'SELECT * FROM inventory_locations WHERE id = ? AND site_id = ?'
    ).bind(locationId, siteId).first();
    if (!loc) return errorResponse('Location not found', 404);

    if (loc.is_default) {
      return errorResponse('Cannot delete the default location. Set another location as default first.', 400);
    }

    const levels = await db.prepare(
      'SELECT SUM(stock) as total FROM inventory_levels WHERE location_id = ? AND site_id = ?'
    ).bind(locationId, siteId).first();

    if (levels?.total > 0) {
      return errorResponse('This location still has stock. Transfer all stock to another location before deleting.', 400);
    }

    await db.prepare(
      'UPDATE inventory_locations SET is_active = 0, updated_at = datetime(\'now\') WHERE id = ? AND site_id = ?'
    ).bind(locationId, siteId).run();

    await db.prepare(
      'DELETE FROM inventory_levels WHERE location_id = ? AND site_id = ?'
    ).bind(locationId, siteId).run();

    return successResponse(null, 'Location deleted');
  } catch (e) {
    console.error('Delete location error:', e);
    return errorResponse('Failed to delete location', 500);
  }
}

async function getLevels(db, siteId, url) {
  try {
    const productId = url.searchParams.get('productId');
    const locationId = url.searchParams.get('locationId');

    let sql = `SELECT il.*, inv.name as location_name
               FROM inventory_levels il
               JOIN inventory_locations inv ON il.location_id = inv.id
               WHERE il.site_id = ? AND inv.is_active = 1`;
    const binds = [siteId];

    if (productId) {
      sql += ' AND il.product_id = ?';
      binds.push(productId);
    }
    if (locationId) {
      sql += ' AND il.location_id = ?';
      binds.push(locationId);
    }

    sql += ' ORDER BY inv.priority ASC, inv.name ASC';

    const result = await db.prepare(sql).bind(...binds).all();
    return successResponse(result.results || []);
  } catch (e) {
    console.error('Get levels error:', e);
    return errorResponse('Failed to fetch inventory levels', 500);
  }
}

async function setLevel(request, db, siteId) {
  try {
    const { product_id, location_id, stock } = await request.json();
    if (!product_id || !location_id) return errorResponse('product_id and location_id are required', 400);
    if (stock === undefined || stock === null || stock < 0) return errorResponse('Stock must be a non-negative number', 400);

    const loc = await db.prepare(
      'SELECT id FROM inventory_locations WHERE id = ? AND site_id = ? AND is_active = 1'
    ).bind(location_id, siteId).first();
    if (!loc) return errorResponse('Location not found', 404);

    const existing = await db.prepare(
      'SELECT id FROM inventory_levels WHERE product_id = ? AND location_id = ?'
    ).bind(product_id, location_id).first();

    if (existing) {
      await db.prepare(
        `UPDATE inventory_levels SET stock = ?, updated_at = datetime('now') WHERE product_id = ? AND location_id = ?`
      ).bind(parseInt(stock), product_id, location_id).run();
    } else {
      const id = generateId();
      await db.prepare(
        `INSERT INTO inventory_levels (id, site_id, product_id, location_id, stock) VALUES (?, ?, ?, ?, ?)`
      ).bind(id, siteId, product_id, location_id, parseInt(stock)).run();
    }

    await syncProductStockFromLevels(db, siteId, product_id);

    return successResponse(null, 'Stock level updated');
  } catch (e) {
    console.error('Set level error:', e);
    return errorResponse('Failed to set inventory level', 500);
  }
}

async function createTransfer(request, db, siteId, user) {
  try {
    const { product_id, from_location_id, to_location_id, quantity, notes } = await request.json();
    if (!product_id || !from_location_id || !to_location_id) {
      return errorResponse('product_id, from_location_id, and to_location_id are required', 400);
    }
    if (!quantity || quantity <= 0) return errorResponse('Quantity must be positive', 400);
    if (from_location_id === to_location_id) return errorResponse('Source and destination must be different', 400);

    const fromLevel = await db.prepare(
      'SELECT stock FROM inventory_levels WHERE product_id = ? AND location_id = ? AND site_id = ?'
    ).bind(product_id, from_location_id, siteId).first();

    if (!fromLevel || fromLevel.stock < quantity) {
      return errorResponse(`Insufficient stock at source location. Available: ${fromLevel?.stock || 0}`, 400);
    }

    await db.prepare(
      `UPDATE inventory_levels SET stock = stock - ?, updated_at = datetime('now') WHERE product_id = ? AND location_id = ? AND site_id = ?`
    ).bind(quantity, product_id, from_location_id, siteId).run();

    const toLevel = await db.prepare(
      'SELECT id FROM inventory_levels WHERE product_id = ? AND location_id = ? AND site_id = ?'
    ).bind(product_id, to_location_id, siteId).first();

    if (toLevel) {
      await db.prepare(
        `UPDATE inventory_levels SET stock = stock + ?, updated_at = datetime('now') WHERE product_id = ? AND location_id = ? AND site_id = ?`
      ).bind(quantity, product_id, to_location_id, siteId).run();
    } else {
      const levelId = generateId();
      await db.prepare(
        `INSERT INTO inventory_levels (id, site_id, product_id, location_id, stock) VALUES (?, ?, ?, ?, ?)`
      ).bind(levelId, siteId, product_id, to_location_id, quantity).run();
    }

    const transferId = generateId();
    await db.prepare(
      `INSERT INTO inventory_transfers (id, site_id, product_id, from_location_id, to_location_id, quantity, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(transferId, siteId, product_id, from_location_id, to_location_id, quantity, notes || '', user.email || user.name || '').run();

    return successResponse({ id: transferId }, 'Stock transferred successfully');
  } catch (e) {
    console.error('Create transfer error:', e);
    return errorResponse('Failed to transfer stock', 500);
  }
}

async function getTransfers(db, siteId, url) {
  try {
    const productId = url.searchParams.get('productId');
    const limit = parseInt(url.searchParams.get('limit')) || 50;

    let sql = `SELECT t.*, 
               fl.name as from_location_name, tl.name as to_location_name,
               p.name as product_name
               FROM inventory_transfers t
               LEFT JOIN inventory_locations fl ON t.from_location_id = fl.id
               LEFT JOIN inventory_locations tl ON t.to_location_id = tl.id
               LEFT JOIN products p ON t.product_id = p.id
               WHERE t.site_id = ?`;
    const binds = [siteId];

    if (productId) {
      sql += ' AND t.product_id = ?';
      binds.push(productId);
    }

    sql += ' ORDER BY t.created_at DESC LIMIT ?';
    binds.push(limit);

    const result = await db.prepare(sql).bind(...binds).all();
    return successResponse(result.results || []);
  } catch (e) {
    console.error('Get transfers error:', e);
    return errorResponse('Failed to fetch transfers', 500);
  }
}

async function syncProductStockFromLevels(db, siteId, productId) {
  try {
    const result = await db.prepare(
      `SELECT COALESCE(SUM(il.stock), 0) as total 
       FROM inventory_levels il 
       JOIN inventory_locations loc ON il.location_id = loc.id 
       WHERE il.product_id = ? AND il.site_id = ? AND loc.is_active = 1`
    ).bind(productId, siteId).first();

    const total = result?.total || 0;
    await db.prepare(
      `UPDATE products SET stock = ?, updated_at = datetime('now') WHERE id = ? AND site_id = ?`
    ).bind(total, productId, siteId).run();
  } catch (e) {
    console.error('Sync product stock error:', e);
  }
}

async function syncProductStock(db, siteId, url) {
  try {
    const productId = url.searchParams.get('productId');
    if (productId) {
      await syncProductStockFromLevels(db, siteId, productId);
    } else {
      const products = await db.prepare(
        'SELECT DISTINCT product_id FROM inventory_levels WHERE site_id = ?'
      ).bind(siteId).all();
      for (const row of (products.results || [])) {
        await syncProductStockFromLevels(db, siteId, row.product_id);
      }
    }
    return successResponse(null, 'Stock synced');
  } catch (e) {
    console.error('Sync stock error:', e);
    return errorResponse('Failed to sync stock', 500);
  }
}

export async function deductStockByLocation(db, siteId, productId, quantity) {
  try {
    const hasLocations = await db.prepare(
      'SELECT COUNT(*) as count FROM inventory_locations WHERE site_id = ? AND is_active = 1'
    ).bind(siteId).first();

    if (!hasLocations || hasLocations.count === 0) return false;

    const levels = await db.prepare(
      `SELECT il.*, loc.priority, loc.name as location_name
       FROM inventory_levels il
       JOIN inventory_locations loc ON il.location_id = loc.id
       WHERE il.product_id = ? AND il.site_id = ? AND loc.is_active = 1 AND il.stock > 0
       ORDER BY loc.is_default DESC, loc.priority ASC`
    ).bind(productId, siteId).all();

    const rows = levels.results || [];
    if (rows.length === 0) {
      await db.prepare(
        `UPDATE products SET stock = MAX(0, stock - ?), updated_at = datetime('now') WHERE id = ? AND site_id = ?`
      ).bind(quantity, productId, siteId).run();
      return true;
    }

    let remaining = quantity;
    for (const row of rows) {
      if (remaining <= 0) break;
      const deduct = Math.min(remaining, row.stock);
      await db.prepare(
        `UPDATE inventory_levels SET stock = stock - ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(deduct, row.id).run();
      remaining -= deduct;
    }

    await syncProductStockFromLevels(db, siteId, productId);
    return true;
  } catch (e) {
    console.error('Deduct stock by location error:', e);
    return false;
  }
}
