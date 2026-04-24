import { generateId, jsonResponse, errorResponse, successResponse, handleCORS } from '../../utils/helpers.js';
import { cachedJsonResponse, purgeStorefrontCache } from '../../utils/cache.js';
import { validateAnyAuth } from '../../utils/auth.js';
import { resolveSiteDBById, checkMigrationLock, getSiteConfig } from '../../utils/site-db.js';
import { estimateRowBytes, trackD1Write, checkFeatureAccess } from '../../utils/usage-tracker.js';
import { translateContentBatch, isTargetSupported } from '../../utils/server-translator.js';

// Translates the user-written portion of each review (title + content). We
// deliberately do NOT translate `customer_name` because that's a person's
// actual name. Errors are swallowed so review listings keep working even if
// the translator is unavailable.
async function translateReviewsInPlace(env, siteId, lang, reviews) {
  if (!Array.isArray(reviews) || reviews.length === 0) return;
  const slots = [];
  for (const r of reviews) {
    if (!r || typeof r !== 'object') continue;
    if (typeof r.title === 'string' && r.title) slots.push({ ref: r, key: 'title', value: r.title });
    if (typeof r.content === 'string' && r.content) slots.push({ ref: r, key: 'content', value: r.content });
  }
  if (slots.length === 0) return;

  const result = await translateContentBatch(env, siteId, slots.map((s) => s.value), lang);
  const translations = result.translations;
  for (let i = 0; i < slots.length; i++) {
    const t = translations[i];
    if (t === undefined || t === null) continue;
    try { slots[i].ref[slots[i].key] = t; } catch (e) {
      console.error('[reviews] splice failed:', slots[i].key, e.message || e);
    }
  }
}

async function ensureReviewColumns(db) {
  try { await db.prepare(`ALTER TABLE reviews ADD COLUMN order_id TEXT`).run(); } catch (e) {}
  try { await db.prepare(`ALTER TABLE reviews ADD COLUMN status TEXT DEFAULT 'pending'`).run(); } catch (e) {}
  try { await db.prepare('CREATE INDEX IF NOT EXISTS idx_reviews_order ON reviews(order_id)').run(); } catch (e) {}
  try { await db.prepare('CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status)').run(); } catch (e) {}
}

async function ensureReviewTokenColumn(db, table) {
  try { await db.prepare(`ALTER TABLE ${table} ADD COLUMN review_token TEXT`).run(); } catch (e) {}
}

function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(48);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => chars[b % chars.length]).join('');
}

export async function handleReviews(request, env, path, ctx) {
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;

  const method = request.method;
  const pathParts = path.split('/').filter(Boolean);
  const action = pathParts[2];
  const subAction = pathParts[3];

  if (action === 'product' && subAction && method === 'GET') {
    return getProductReviews(request, env, subAction);
  }

  if (action === 'eligibility' && method === 'GET') {
    return checkReviewEligibility(request, env);
  }

  if (action === 'submit' && method === 'POST') {
    const url = new URL(request.url);
    let siteId = url.searchParams.get('siteId');
    if (!siteId) {
      try { const b = await request.clone().json(); siteId = b.siteId; } catch (e) {}
    }
    if (siteId) {
      const access = await checkFeatureAccess(env, siteId, 'reviews');
      if (!access.allowed) {
        return errorResponse(`Reviews are available on the ${(access.requiredPlan || 'growth').charAt(0).toUpperCase() + (access.requiredPlan || 'growth').slice(1)} plan.`, 403, 'FEATURE_LOCKED');
      }
    }
    return submitReview(request, env);
  }

  if (action === 'guest-submit' && method === 'POST') {
    const url = new URL(request.url);
    let siteId = url.searchParams.get('siteId');
    if (!siteId) {
      try { const b = await request.clone().json(); siteId = b.siteId; } catch (e) {}
    }
    if (siteId) {
      const access = await checkFeatureAccess(env, siteId, 'reviews');
      if (!access.allowed) {
        return errorResponse(`Reviews are available on the ${(access.requiredPlan || 'growth').charAt(0).toUpperCase() + (access.requiredPlan || 'growth').slice(1)} plan.`, 403, 'FEATURE_LOCKED');
      }
    }
    return submitGuestReview(request, env);
  }

  if (action === 'admin' && method === 'GET') {
    return getAdminReviews(request, env);
  }

  if (action === 'admin' && subAction && method === 'PUT') {
    const url = new URL(request.url);
    let siteId = url.searchParams.get('siteId');
    if (!siteId) {
      try { const b = await request.clone().json(); siteId = b.siteId; } catch (e) {}
    }
    if (siteId) {
      const access = await checkFeatureAccess(env, siteId, 'reviews');
      if (!access.allowed) {
        return errorResponse(`Reviews are available on the ${(access.requiredPlan || 'growth').charAt(0).toUpperCase() + (access.requiredPlan || 'growth').slice(1)} plan.`, 403, 'FEATURE_LOCKED');
      }
    }
    return updateReviewStatus(request, env, subAction, ctx);
  }

  if (action === 'summary' && method === 'GET') {
    return getReviewSummary(request, env);
  }

  return errorResponse('Not found', 404);
}

async function getProductReviews(request, env, productId) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get('siteId');
    const lang = url.searchParams.get('lang');
    if (!siteId) return errorResponse('siteId is required', 400);

    const db = await resolveSiteDBById(env, siteId);
    await ensureReviewColumns(db);

    const sort = url.searchParams.get('sort') || 'recent';
    let orderClause = 'ORDER BY created_at DESC';
    if (sort === 'highest') orderClause = 'ORDER BY rating DESC, created_at DESC';
    if (sort === 'lowest') orderClause = 'ORDER BY rating ASC, created_at DESC';

    const reviews = await db.prepare(
      `SELECT id, product_id, customer_name, rating, title, content, images, is_verified, created_at
       FROM reviews WHERE site_id = ? AND product_id = ? AND status = 'approved' AND is_approved = 1
       ${orderClause} LIMIT 50`
    ).bind(siteId, productId).all();

    const stats = await db.prepare(
      `SELECT COUNT(*) as total, AVG(rating) as avg_rating,
              SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five,
              SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four,
              SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three,
              SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two,
              SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one
       FROM reviews WHERE site_id = ? AND product_id = ? AND status = 'approved' AND is_approved = 1`
    ).bind(siteId, productId).first();

    const reviewsData = (reviews.results || []).map(r => ({
      ...r,
      images: parseJsonSafe(r.images),
    }));

    if (lang) {
      try {
        const supported = await isTargetSupported(env, siteId, lang);
        if (supported.ok) {
          await translateReviewsInPlace(env, siteId, lang, reviewsData);
        }
      } catch (e) {
        console.error('[reviews] translation skipped:', e.message || e);
      }
    }

    return cachedJsonResponse({
      success: true,
      data: {
        reviews: reviewsData,
        stats: {
          total: stats?.total || 0,
          avgRating: stats?.avg_rating ? Math.round(stats.avg_rating * 10) / 10 : 0,
          breakdown: {
            5: stats?.five || 0,
            4: stats?.four || 0,
            3: stats?.three || 0,
            2: stats?.two || 0,
            1: stats?.one || 0,
          },
        },
      },
    });
  } catch (error) {
    console.error('Get product reviews error:', error);
    return errorResponse('Failed to fetch reviews', 500);
  }
}

async function checkReviewEligibility(request, env) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get('siteId');
    const mode = url.searchParams.get('mode');
    if (!siteId) return errorResponse('siteId is required', 400);

    const db = await resolveSiteDBById(env, siteId);
    await ensureReviewColumns(db);

    if (mode === 'guest') {
      const orderId = url.searchParams.get('orderId');
      const token = url.searchParams.get('token');
      if (!orderId || !token) return errorResponse('orderId and token are required for guest mode', 400);

      await ensureReviewTokenColumn(db, 'guest_orders');
      await ensureReviewTokenColumn(db, 'orders');

      let order = null;
      try {
        order = await db.prepare(
          `SELECT id, order_number, customer_name, items FROM guest_orders WHERE id = ? AND site_id = ? AND review_token = ? AND status = 'delivered'`
        ).bind(orderId, siteId, token).first();
      } catch (e) {}

      if (!order) {
        try {
          order = await db.prepare(
            `SELECT id, order_number, customer_name, items FROM orders WHERE id = ? AND site_id = ? AND review_token = ? AND status = 'delivered'`
          ).bind(orderId, siteId, token).first();
        } catch (e) {}
      }

      if (!order) return errorResponse('Invalid or expired review link', 403);

      const items = parseJsonSafe(order.items);
      const reviewedItems = {};
      for (const item of items) {
        const pid = item.productId || item.product_id || item.id;
        const existing = await db.prepare(
          `SELECT id FROM reviews WHERE site_id = ? AND product_id = ? AND order_id = ? LIMIT 1`
        ).bind(siteId, pid, orderId).first();
        if (existing) reviewedItems[pid] = true;
      }

      return jsonResponse({
        success: true,
        data: {
          order: { id: order.id, order_number: order.order_number, customer_name: order.customer_name },
          items: items.map(item => ({
            productId: item.productId || item.product_id || item.id,
            name: item.name,
            image: item.image || item.thumbnail_url || '',
            slug: item.slug || '',
          })),
          reviewedItems,
        },
      });
    }

    const productId = url.searchParams.get('productId');
    if (!productId) return errorResponse('productId is required', 400);

    const user = await validateAnyAuth(request, env, { siteId, db });
    if (!user) return jsonResponse({ success: true, data: { eligible: false, reason: 'not_logged_in' } });

    const userId = user.id;

    const existingReview = await db.prepare(
      `SELECT id FROM reviews WHERE site_id = ? AND product_id = ? AND user_id = ? LIMIT 1`
    ).bind(siteId, productId, userId).first();

    if (existingReview) {
      return jsonResponse({ success: true, data: { eligible: false, reason: 'already_reviewed' } });
    }

    const deliveredOrder = await db.prepare(
      `SELECT id, items FROM orders WHERE site_id = ? AND user_id = ? AND status = 'delivered' ORDER BY created_at DESC`
    ).bind(siteId, userId).all();

    const eligibleOrders = [];
    for (const order of (deliveredOrder.results || [])) {
      let items = parseJsonSafe(order.items);
      const hasProduct = items.some(item => {
        const itemProductId = item.productId || item.product_id || item.id;
        return itemProductId === productId;
      });
      if (hasProduct) {
        eligibleOrders.push(order.id);
      }
    }

    if (eligibleOrders.length === 0) {
      return jsonResponse({ success: true, data: { eligible: false, reason: 'no_purchase' } });
    }

    return jsonResponse({ success: true, data: { eligible: true, orderId: eligibleOrders[0] } });
  } catch (error) {
    console.error('Check review eligibility error:', error);
    return errorResponse('Failed to check eligibility', 500);
  }
}

async function submitReview(request, env) {
  try {
    const data = await request.json();
    const { siteId, productId, orderId, rating, title, content, images } = data;
    if (!siteId || !productId || !rating) return errorResponse('siteId, productId and rating are required', 400);
    if (rating < 1 || rating > 5) return errorResponse('Rating must be between 1 and 5', 400);

    const locked = await checkMigrationLock(env, siteId);
    if (locked) return errorResponse('Site is under maintenance', 503);

    const db = await resolveSiteDBById(env, siteId);
    await ensureReviewColumns(db);

    const user = await validateAnyAuth(request, env, { siteId, db });
    if (!user) return errorResponse('Authentication required', 401);

    const existingReview = await db.prepare(
      `SELECT id FROM reviews WHERE site_id = ? AND product_id = ? AND user_id = ? LIMIT 1`
    ).bind(siteId, productId, user.id).first();

    if (existingReview) return errorResponse('You have already reviewed this product', 400);

    let isVerified = 0;
    if (orderId) {
      const order = await db.prepare(
        `SELECT id, items FROM orders WHERE id = ? AND site_id = ? AND user_id = ? AND status = 'delivered'`
      ).bind(orderId, siteId, user.id).first();
      if (order) {
        const orderItems = parseJsonSafe(order.items);
        if (orderItems.some(item => (item.productId || item.product_id || item.id) === productId)) {
          isVerified = 1;
        }
      }
    } else {
      const deliveredOrder = await db.prepare(
        `SELECT id, items FROM orders WHERE site_id = ? AND user_id = ? AND status = 'delivered'`
      ).bind(siteId, user.id).all();
      for (const order of (deliveredOrder.results || [])) {
        const items = parseJsonSafe(order.items);
        if (items.some(item => (item.productId || item.product_id || item.id) === productId)) {
          isVerified = 1;
          break;
        }
      }
    }

    const siteConfig = await getSiteConfig(env, siteId);
    let settings = {};
    try { settings = typeof siteConfig.settings === 'string' ? JSON.parse(siteConfig.settings) : (siteConfig.settings || {}); } catch (e) {}
    const autoApprove = settings.reviewsAutoApprove === true;

    const reviewId = generateId();
    const customerName = user.name || user.email?.split('@')[0] || 'Customer';
    const imagesJson = images && images.length > 0 ? JSON.stringify(images) : null;
    const status = autoApprove ? 'approved' : 'pending';
    const isApproved = autoApprove ? 1 : 0;

    const rowBytes = estimateRowBytes({ id: reviewId, site_id: siteId, product_id: productId, order_id: orderId, user_id: user.id, customer_name: customerName, rating, title, content, images: imagesJson, status, is_verified: isVerified, is_approved: isApproved });

    await db.prepare(
      `INSERT INTO reviews (id, site_id, product_id, order_id, user_id, customer_name, rating, title, content, images, status, is_verified, is_approved, row_size_bytes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(reviewId, siteId, productId, orderId || null, user.id, customerName, rating, title || null, content || null, imagesJson, status, isVerified, isApproved, rowBytes).run();

    await trackD1Write(env, siteId, rowBytes);

    return successResponse({ id: reviewId, status }, autoApprove ? 'Review published successfully!' : 'Review submitted and pending approval.');
  } catch (error) {
    console.error('Submit review error:', error);
    return errorResponse('Failed to submit review', 500);
  }
}

async function submitGuestReview(request, env) {
  try {
    const data = await request.json();
    const { siteId, orderId, reviewToken, productId, rating, title, content, images, customerName } = data;
    if (!siteId || !orderId || !reviewToken || !productId || !rating) {
      return errorResponse('siteId, orderId, reviewToken, productId, and rating are required', 400);
    }
    if (rating < 1 || rating > 5) return errorResponse('Rating must be between 1 and 5', 400);

    const locked = await checkMigrationLock(env, siteId);
    if (locked) return errorResponse('Site is under maintenance', 503);

    const db = await resolveSiteDBById(env, siteId);
    await ensureReviewColumns(db);
    await ensureReviewTokenColumn(db, 'guest_orders');

    let order = await db.prepare(
      `SELECT id, order_number, customer_name, items FROM guest_orders WHERE id = ? AND site_id = ? AND review_token = ? AND status = 'delivered'`
    ).bind(orderId, siteId, reviewToken).first();

    if (!order) {
      await ensureReviewTokenColumn(db, 'orders');
      order = await db.prepare(
        `SELECT id, order_number, customer_name, items FROM orders WHERE id = ? AND site_id = ? AND review_token = ? AND status = 'delivered'`
      ).bind(orderId, siteId, reviewToken).first();
      if (!order) return errorResponse('Invalid or expired review link', 403);
    }
    const items = parseJsonSafe(order.items);
    const hasProduct = items.some(item => (item.productId || item.product_id || item.id) === productId);
    if (!hasProduct) return errorResponse('This product was not part of the order', 400);

    const existingReview = await db.prepare(
      `SELECT id FROM reviews WHERE site_id = ? AND product_id = ? AND order_id = ? LIMIT 1`
    ).bind(siteId, productId, orderId).first();
    if (existingReview) return errorResponse('This product has already been reviewed for this order', 400);

    const siteConfig = await getSiteConfig(env, siteId);
    let settings = {};
    try { settings = typeof siteConfig.settings === 'string' ? JSON.parse(siteConfig.settings) : (siteConfig.settings || {}); } catch (e) {}
    const autoApprove = settings.reviewsAutoApprove === true;

    const reviewId = generateId();
    const name = customerName || order.customer_name || 'Customer';
    const imagesJson = images && images.length > 0 ? JSON.stringify(images) : null;
    const status = autoApprove ? 'approved' : 'pending';
    const isApproved = autoApprove ? 1 : 0;

    const rowBytes = estimateRowBytes({ id: reviewId, site_id: siteId, product_id: productId, order_id: orderId, customer_name: name, rating, title, content, images: imagesJson, status, is_verified: 1, is_approved: isApproved });

    await db.prepare(
      `INSERT INTO reviews (id, site_id, product_id, order_id, user_id, customer_name, rating, title, content, images, status, is_verified, is_approved, row_size_bytes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(reviewId, siteId, productId, orderId, null, name, rating, title || null, content || null, imagesJson, status, 1, isApproved, rowBytes).run();

    await trackD1Write(env, siteId, rowBytes);

    return successResponse({ id: reviewId, status }, autoApprove ? 'Review published successfully!' : 'Review submitted and pending approval.');
  } catch (error) {
    console.error('Submit guest review error:', error);
    return errorResponse('Failed to submit review', 500);
  }
}

async function getAdminReviews(request, env) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get('siteId');
    if (!siteId) return errorResponse('siteId is required', 400);

    const authHeader = request.headers.get('Authorization');
    let isAdmin = false;

    if (authHeader && authHeader.startsWith('SiteAdmin ')) {
      const { validateSiteAdmin } = await import('./site-admin-worker.js');
      const admin = await validateSiteAdmin(request, env, siteId);
      if (admin) isAdmin = true;
    }

    if (!isAdmin) {
      const user = await validateAnyAuth(request, env, { siteId });
      if (!user) return errorResponse('Authentication required', 401);
      const site = await env.DB.prepare('SELECT id FROM sites WHERE id = ? AND user_id = ?').bind(siteId, user.id).first();
      if (!site) return errorResponse('Unauthorized', 403);
    }

    const db = await resolveSiteDBById(env, siteId);
    await ensureReviewColumns(db);

    const statusFilter = url.searchParams.get('status') || 'all';
    let query = `SELECT r.*, p.name as product_name, p.thumbnail_url as product_image, p.slug as product_slug
                 FROM reviews r LEFT JOIN products p ON r.product_id = p.id AND p.site_id = r.site_id
                 WHERE r.site_id = ?`;
    const bindings = [siteId];

    if (statusFilter !== 'all') {
      query += ` AND r.status = ?`;
      bindings.push(statusFilter);
    }

    query += ` ORDER BY r.created_at DESC LIMIT 200`;

    const reviews = await db.prepare(query).bind(...bindings).all();

    const stats = await db.prepare(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
              SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
              SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
              AVG(CASE WHEN status = 'approved' THEN rating ELSE NULL END) as avg_rating
       FROM reviews WHERE site_id = ?`
    ).bind(siteId).first();

    return jsonResponse({
      success: true,
      data: {
        reviews: (reviews.results || []).map(r => ({ ...r, images: parseJsonSafe(r.images) })),
        stats: {
          total: stats?.total || 0,
          pending: stats?.pending || 0,
          approved: stats?.approved || 0,
          rejected: stats?.rejected || 0,
          avgRating: stats?.avg_rating ? Math.round(stats.avg_rating * 10) / 10 : 0,
        },
      },
    });
  } catch (error) {
    console.error('Get admin reviews error:', error);
    return errorResponse('Failed to fetch reviews', 500);
  }
}

async function updateReviewStatus(request, env, reviewId, ctx) {
  try {
    const data = await request.json();
    const { siteId, status } = data;
    if (!siteId || !status) return errorResponse('siteId and status are required', 400);
    if (!['approved', 'rejected'].includes(status)) return errorResponse('Status must be approved or rejected', 400);

    const authHeader = request.headers.get('Authorization');
    let isAdmin = false;

    if (authHeader && authHeader.startsWith('SiteAdmin ')) {
      const { validateSiteAdmin } = await import('./site-admin-worker.js');
      const admin = await validateSiteAdmin(request, env, siteId);
      if (admin) isAdmin = true;
    }

    if (!isAdmin) {
      const user = await validateAnyAuth(request, env, { siteId });
      if (!user) return errorResponse('Authentication required', 401);
      const site = await env.DB.prepare('SELECT id FROM sites WHERE id = ? AND user_id = ?').bind(siteId, user.id).first();
      if (!site) return errorResponse('Unauthorized', 403);
    }

    const db = await resolveSiteDBById(env, siteId);
    await ensureReviewColumns(db);

    const review = await db.prepare(
      'SELECT product_id FROM reviews WHERE id = ? AND site_id = ?'
    ).bind(reviewId, siteId).first();

    const isApproved = status === 'approved' ? 1 : 0;
    await db.prepare(
      `UPDATE reviews SET status = ?, is_approved = ? WHERE id = ? AND site_id = ?`
    ).bind(status, isApproved, reviewId, siteId).run();

    if (ctx && review) {
      ctx.waitUntil(purgeStorefrontCache(env, siteId, ['reviews'], { productId: review.product_id }));
    }

    return successResponse(null, `Review ${status} successfully`);
  } catch (error) {
    console.error('Update review status error:', error);
    return errorResponse('Failed to update review', 500);
  }
}

async function getReviewSummary(request, env) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get('siteId');
    const productId = url.searchParams.get('productId');
    if (!siteId || !productId) return errorResponse('siteId and productId are required', 400);

    const db = await resolveSiteDBById(env, siteId);
    await ensureReviewColumns(db);

    const stats = await db.prepare(
      `SELECT COUNT(*) as total, AVG(rating) as avg_rating
       FROM reviews WHERE site_id = ? AND product_id = ? AND status = 'approved' AND is_approved = 1`
    ).bind(siteId, productId).first();

    return jsonResponse({
      success: true,
      data: {
        total: stats?.total || 0,
        avgRating: stats?.avg_rating ? Math.round(stats.avg_rating * 10) / 10 : 0,
      },
    });
  } catch (error) {
    console.error('Get review summary error:', error);
    return errorResponse('Failed to fetch review summary', 500);
  }
}

function parseJsonSafe(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { const parsed = JSON.parse(val); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}
