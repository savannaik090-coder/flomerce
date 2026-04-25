// Shiprocket integration worker.
//
// Routes:
//   /api/shipping/connect             POST   merchant connect (validates + saves encrypted creds)
//   /api/shipping/disconnect          POST   wipe creds + token cache
//   /api/shipping/status              GET    masked creds + connection state + saved settings
//   /api/shipping/settings            PUT    save non-credential settings (auto-ship toggles, weight, dims, pickup nickname)
//   /api/shipping/pickup-locations    GET    refresh + return pickup locations from Shiprocket
//   /api/shipping/orders/:id/ship     POST   manual "Ship Now" — full create→AWB→pickup→label flow
//   /api/shipping/orders/:id/cancel   POST   cancel shipment (and Shiprocket order if not yet AWB-assigned)
//   /api/shipping/orders/:id/label    GET    return label_url, regenerating if needed
//   /api/shipping/orders/:id/track    GET    live tracking status from Shiprocket
//
// Webhook (separate dispatcher):
//   /api/webhooks/shiprocket/:siteId  POST   status updates from Shiprocket; auth via X-Api-Key header.
//
// All admin endpoints require a valid SiteAdmin session for the given siteId
// (passed as ?siteId=... query). Settings-mutating actions require the
// 'settings' permission; ship/cancel/label/track require the 'orders' permission.
//
// Persistence:
//   site_config.settings.shiprocket = {
//     enabled: bool, emailEncrypted, passwordEncrypted, webhookToken,
//     pickupLocationNickname, defaultWeight, defaultLength, defaultBreadth, defaultHeight,
//     autoShipOnPayment, autoShipOnConfirmCod,
//     _tokenCache: { token, expiresAt }
//   }
//
// Token cache lives inside the same JSON column. Shiprocket tokens last ~10 days;
// we lazily re-login when expired or close to expiry.

import { errorResponse, successResponse, generateToken } from '../../utils/helpers.js';
import { getSiteConfig, resolveSiteDBById } from '../../utils/site-db.js';
import { encryptSecret, decryptSecret, maskSecret } from '../../utils/crypto.js';
import { validateSiteAdmin, hasPermission } from './site-admin-worker.js';
import {
  loginShiprocket,
  getPickupLocations,
  createOrder as srCreateOrder,
  getServiceability,
  assignAwb,
  generatePickup,
  generateLabel,
  trackShipment,
  cancelShipment,
  cancelOrder as srCancelOrder,
  ShiprocketError,
} from '../../utils/shiprocket.js';

// Re-login if token expires within this many minutes.
const TOKEN_REFRESH_BUFFER_MIN = 60 * 24; // 1 day buffer (token lasts ~10 days).

// ---------- Settings read/write (site_config.settings, lives on shard DB) ----------

async function readShiprocketSettings(env, siteId) {
  const siteDB = await resolveSiteDBById(env, siteId);
  const config = await siteDB.prepare(
    'SELECT * FROM site_config WHERE site_id = ?'
  ).bind(siteId).first();
  if (!config) return null;
  let settings = {};
  try {
    if (config.settings) {
      settings = typeof config.settings === 'string' ? JSON.parse(config.settings) : config.settings;
    }
  } catch {
    settings = {};
  }
  const sr = settings.shiprocket || {};
  return { siteDB, config, settings, sr };
}

async function writeShiprocketSettings(env, siteId, mutator) {
  const ctx = await readShiprocketSettings(env, siteId);
  if (!ctx) throw new Error('Site config not found');
  const { siteDB, settings, sr } = ctx;
  const newSr = await mutator(sr);
  settings.shiprocket = newSr;
  await siteDB.prepare(
    `UPDATE site_config SET settings = ?, updated_at = datetime('now') WHERE site_id = ?`
  ).bind(JSON.stringify(settings), siteId).run();
  return newSr;
}

// Atomically persist the cached Shiprocket token without read-modify-writing
// the whole settings JSON. Uses SQLite's json_set so concurrent ship/cancel
// requests refreshing the token can't clobber unrelated settings.
async function persistTokenCache(env, siteId, token, expiresAt) {
  const siteDB = await resolveSiteDBById(env, siteId);
  const cacheJson = JSON.stringify({ token, expiresAt });
  await siteDB.prepare(
    `UPDATE site_config
        SET settings = json_set(
              COALESCE(settings, '{}'),
              '$.shiprocket._tokenCache',
              json(?)
            ),
            updated_at = datetime('now')
      WHERE site_id = ?`
  ).bind(cacheJson, siteId).run();
}

// Returns a usable Shiprocket token, refreshing via login if missing/expired.
// Throws ShiprocketError on failure.
async function ensureShiprocketToken(env, siteId, sr) {
  const cache = sr?._tokenCache;
  const now = Date.now();
  if (cache?.token && cache.expiresAt) {
    const expMs = new Date(cache.expiresAt).getTime();
    if (Number.isFinite(expMs) && expMs - now > TOKEN_REFRESH_BUFFER_MIN * 60 * 1000) {
      return cache.token;
    }
  }
  if (!sr?.emailEncrypted || !sr?.passwordEncrypted) {
    throw new ShiprocketError('Shiprocket not connected', { code: 'NOT_CONNECTED' });
  }
  const email = await decryptSecret(env, sr.emailEncrypted);
  const password = await decryptSecret(env, sr.passwordEncrypted);
  const login = await loginShiprocket(email, password);
  // Shiprocket tokens are valid for 240 hours (10 days).
  const expiresAt = new Date(now + 240 * 60 * 60 * 1000).toISOString();
  await persistTokenCache(env, siteId, login.token, expiresAt);
  return login.token;
}

// Build a public-safe settings view (masked creds, no token).
function publicShiprocketView(sr, emailPlain) {
  return {
    enabled: !!sr?.enabled,
    connected: !!(sr?.emailEncrypted && sr?.passwordEncrypted),
    email: emailPlain || (sr?.emailMasked || ''),
    pickupLocationNickname: sr?.pickupLocationNickname || '',
    defaultWeight: sr?.defaultWeight || 500,
    defaultLength: sr?.defaultLength || 10,
    defaultBreadth: sr?.defaultBreadth || 10,
    defaultHeight: sr?.defaultHeight || 10,
    autoShipOnPayment: !!sr?.autoShipOnPayment,
    autoShipOnConfirmCod: !!sr?.autoShipOnConfirmCod,
    webhookToken: sr?.webhookToken || '',
  };
}

// ---------- Endpoint: connect ----------

async function handleConnect(request, env, siteId) {
  let body;
  try { body = await request.json(); } catch { return errorResponse('Invalid JSON body', 400); }

  const email = (body.email || '').trim();
  const password = body.password || '';
  if (!email || !password) {
    return errorResponse('Email and password are required', 400, 'MISSING_CREDS');
  }

  // Validate by attempting a real login BEFORE persisting.
  let login;
  try {
    login = await loginShiprocket(email, password);
  } catch (e) {
    if (e instanceof ShiprocketError) {
      return errorResponse(`Shiprocket rejected the credentials: ${e.message}`, 400, e.code);
    }
    return errorResponse(`Failed to reach Shiprocket: ${e.message || e}`, 502, 'NETWORK');
  }

  let emailEnc, passwordEnc;
  try {
    emailEnc = await encryptSecret(env, email);
    passwordEnc = await encryptSecret(env, password);
  } catch (e) {
    if (String(e.message || '').includes('SETTINGS_ENCRYPTION_KEY')) {
      return errorResponse('Server is missing SETTINGS_ENCRYPTION_KEY. Configure it before saving Shiprocket credentials.', 500, 'MISSING_ENCRYPTION_KEY');
    }
    throw e;
  }

  const expiresAt = new Date(Date.now() + 240 * 60 * 60 * 1000).toISOString();

  const newSr = await writeShiprocketSettings(env, siteId, async (current) => ({
    ...current,
    enabled: true,
    emailEncrypted: emailEnc,
    emailMasked: maskSecret(email, 4),
    passwordEncrypted: passwordEnc,
    webhookToken: current.webhookToken || generateToken(48),
    pickupLocationNickname: current.pickupLocationNickname || '',
    defaultWeight: current.defaultWeight || 500,
    defaultLength: current.defaultLength || 10,
    defaultBreadth: current.defaultBreadth || 10,
    defaultHeight: current.defaultHeight || 10,
    autoShipOnPayment: !!current.autoShipOnPayment,
    autoShipOnConfirmCod: !!current.autoShipOnConfirmCod,
    _tokenCache: { token: login.token, expiresAt },
  }));

  // Return view + pickup locations so the UI can render the dropdown immediately.
  let pickup = [];
  try { pickup = await getPickupLocations(login.token); } catch (e) {
    console.warn('Shiprocket pickup-locations fetch after connect failed:', e.message || e);
  }

  return successResponse({
    ...publicShiprocketView(newSr, email),
    pickupLocations: pickup,
    accountFirstName: login.first_name || '',
    accountLastName: login.last_name || '',
  }, 'Shiprocket connected');
}

// ---------- Endpoint: disconnect ----------

async function handleDisconnect(env, siteId) {
  await writeShiprocketSettings(env, siteId, async (current) => ({
    enabled: false,
    autoShipOnPayment: false,
    autoShipOnConfirmCod: false,
    pickupLocationNickname: current.pickupLocationNickname || '',
    defaultWeight: current.defaultWeight || 500,
    defaultLength: current.defaultLength || 10,
    defaultBreadth: current.defaultBreadth || 10,
    defaultHeight: current.defaultHeight || 10,
    webhookToken: current.webhookToken || '',
    // Wipe credentials and token cache.
  }));
  return successResponse(null, 'Shiprocket disconnected');
}

// ---------- Endpoint: status ----------

async function handleStatus(env, siteId) {
  const ctx = await readShiprocketSettings(env, siteId);
  if (!ctx) return errorResponse('Site not found', 404);
  return successResponse(publicShiprocketView(ctx.sr, ctx.sr?.emailMasked));
}

// ---------- Endpoint: settings (non-credential) ----------

async function handleSaveSettings(request, env, siteId) {
  let body;
  try { body = await request.json(); } catch { return errorResponse('Invalid JSON body', 400); }

  const num = (v, def) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : def;
  };

  const newSr = await writeShiprocketSettings(env, siteId, async (current) => ({
    ...current,
    enabled: typeof body.enabled === 'boolean' ? body.enabled : !!current.enabled,
    pickupLocationNickname: typeof body.pickupLocationNickname === 'string'
      ? body.pickupLocationNickname.trim()
      : (current.pickupLocationNickname || ''),
    defaultWeight: num(body.defaultWeight, current.defaultWeight || 500),
    defaultLength: num(body.defaultLength, current.defaultLength || 10),
    defaultBreadth: num(body.defaultBreadth, current.defaultBreadth || 10),
    defaultHeight: num(body.defaultHeight, current.defaultHeight || 10),
    autoShipOnPayment: !!body.autoShipOnPayment,
    autoShipOnConfirmCod: !!body.autoShipOnConfirmCod,
  }));

  return successResponse(publicShiprocketView(newSr, newSr?.emailMasked), 'Shipping settings saved');
}

// ---------- Endpoint: pickup-locations (live refresh) ----------

async function handlePickupLocations(env, siteId) {
  const ctx = await readShiprocketSettings(env, siteId);
  if (!ctx) return errorResponse('Site not found', 404);
  if (!ctx.sr?.emailEncrypted) {
    return errorResponse('Shiprocket not connected', 400, 'NOT_CONNECTED');
  }
  try {
    const token = await ensureShiprocketToken(env, siteId, ctx.sr);
    const list = await getPickupLocations(token);
    return successResponse({ pickupLocations: list });
  } catch (e) {
    if (e instanceof ShiprocketError) {
      return errorResponse(e.message, e.status === 401 ? 401 : 502, e.code);
    }
    return errorResponse(`Failed to fetch pickup locations: ${e.message || e}`, 500);
  }
}

// ---------- Internal: load order from either orders or guest_orders table ----------

async function loadOrderForShipping(env, siteId, orderId) {
  const siteDB = await resolveSiteDBById(env, siteId);
  let table = 'orders';
  let order = await siteDB.prepare('SELECT * FROM orders WHERE id = ? AND site_id = ?').bind(orderId, siteId).first();
  if (!order) {
    table = 'guest_orders';
    order = await siteDB.prepare('SELECT * FROM guest_orders WHERE id = ? AND site_id = ?').bind(orderId, siteId).first();
  }
  return { siteDB, table, order };
}

// Build the Shiprocket "create custom order" payload from our internal order row.
function buildShiprocketOrderPayload(order, sr, brandConfig) {
  let items = [];
  try { items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []); } catch {}

  let shipping = {};
  try { shipping = typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : (order.shipping_address || {}); } catch {}

  let billing = shipping;
  try {
    if (order.billing_address) {
      const b = typeof order.billing_address === 'string' ? JSON.parse(order.billing_address) : order.billing_address;
      if (b && Object.keys(b).length) billing = b;
    }
  } catch {}

  // Split full name into first/last for Shiprocket.
  const fullName = (order.customer_name || '').trim();
  const nameParts = fullName.split(/\s+/);
  const firstName = nameParts[0] || 'Customer';
  const lastName = nameParts.slice(1).join(' ') || '';

  const orderItems = (items || []).map((it) => ({
    name: String(it.name || it.product_name || 'Item').slice(0, 100),
    sku: String(it.sku || it.productId || it.product_id || it.id || 'SKU').slice(0, 50),
    units: Number(it.quantity || it.units || 1),
    selling_price: Number(it.price || it.unit_price || 0),
    discount: 0,
    tax: it.gst_rate ? Number(it.gst_rate) : 0,
    hsn: it.hsn_code || '',
  }));

  const totalWeight = (() => {
    // Use stored default; if items have per-item weight in future, sum those.
    return Number(sr?.defaultWeight || 500) / 1000; // grams → kg
  })();

  const paymentMethod = (() => {
    const pm = (order.payment_method || '').toLowerCase();
    if (pm === 'cod' || pm === 'cash' || pm === 'cash_on_delivery') return 'COD';
    return 'Prepaid';
  })();

  return {
    order_id: String(order.order_number || order.id),
    order_date: (order.created_at || new Date().toISOString()).replace('T', ' ').slice(0, 19),
    pickup_location: sr.pickupLocationNickname || 'Primary',
    channel_id: '',
    comment: order.notes || '',
    billing_customer_name: firstName,
    billing_last_name: lastName,
    billing_address: String(billing.line1 || billing.address || billing.street || '').slice(0, 100),
    billing_address_2: String(billing.line2 || billing.address2 || '').slice(0, 100),
    billing_city: String(billing.city || ''),
    billing_pincode: String(billing.postalCode || billing.pincode || billing.pin || billing.zip || ''),
    billing_state: String(billing.state || ''),
    billing_country: String(billing.country || 'India'),
    billing_email: order.customer_email || '',
    billing_phone: String(order.customer_phone || '').replace(/\D/g, '').slice(-10),
    shipping_is_billing: billing === shipping,
    shipping_customer_name: firstName,
    shipping_last_name: lastName,
    shipping_address: String(shipping.line1 || shipping.address || shipping.street || '').slice(0, 100),
    shipping_address_2: String(shipping.line2 || shipping.address2 || '').slice(0, 100),
    shipping_city: String(shipping.city || ''),
    shipping_pincode: String(shipping.postalCode || shipping.pincode || shipping.pin || shipping.zip || ''),
    shipping_country: String(shipping.country || 'India'),
    shipping_state: String(shipping.state || ''),
    shipping_email: order.customer_email || '',
    shipping_phone: String(order.customer_phone || '').replace(/\D/g, '').slice(-10),
    order_items: orderItems,
    payment_method: paymentMethod,
    shipping_charges: Number(order.shipping_cost || 0),
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: Number(order.discount || 0),
    sub_total: Number(order.subtotal || order.total || 0),
    length: Number(sr?.defaultLength || 10),
    breadth: Number(sr?.defaultBreadth || 10),
    height: Number(sr?.defaultHeight || 10),
    weight: totalWeight,
  };
}

// ---------- Internal: full ship-now flow (used by manual + auto-ship) ----------

export async function shipOrderViaShiprocket(env, siteId, orderId, options = {}) {
  const ctx = await readShiprocketSettings(env, siteId);
  if (!ctx) return { ok: false, code: 'SITE_NOT_FOUND', message: 'Site not found' };
  if (!ctx.sr?.enabled || !ctx.sr?.emailEncrypted) {
    return { ok: false, code: 'NOT_CONNECTED', message: 'Shiprocket not connected' };
  }

  const { siteDB, table, order } = await loadOrderForShipping(env, siteId, orderId);
  if (!order) return { ok: false, code: 'ORDER_NOT_FOUND', message: 'Order not found' };

  if (order.shiprocket_awb && !options.force) {
    return {
      ok: true,
      alreadyShipped: true,
      awb: order.shiprocket_awb,
      shipmentId: order.shiprocket_shipment_id,
      labelUrl: order.shiprocket_label_url,
    };
  }

  let token;
  try {
    token = await ensureShiprocketToken(env, siteId, ctx.sr);
  } catch (e) {
    const msg = e instanceof ShiprocketError ? e.message : (e.message || String(e));
    await siteDB.prepare(`UPDATE ${table} SET shiprocket_status = 'failed', shiprocket_error = ? WHERE id = ?`).bind(msg, orderId).run();
    return { ok: false, code: e?.code || 'AUTH_FAILED', message: msg };
  }

  // Resume from where the last attempt left off. If a previous attempt
  // already created the Shiprocket order/shipment but failed at AWB assign,
  // skip the create step to avoid duplicate orders in Shiprocket.
  let shiprocketOrderId = order.shiprocket_order_id || '';
  let shipmentId = order.shiprocket_shipment_id || '';

  if (!shipmentId) {
    const payload = buildShiprocketOrderPayload(order, ctx.sr, ctx.config);

    let createRes;
    try {
      createRes = await srCreateOrder(token, payload);
    } catch (e) {
      const msg = e instanceof ShiprocketError ? e.message : (e.message || String(e));
      await siteDB.prepare(`UPDATE ${table} SET shiprocket_status = 'failed', shiprocket_error = ? WHERE id = ?`).bind(msg, orderId).run();
      return { ok: false, code: e?.code || 'CREATE_FAILED', message: msg };
    }

    shiprocketOrderId = createRes.order_id || createRes.data?.order_id || '';
    shipmentId = createRes.shipment_id || createRes.data?.shipment_id || '';

    if (!shipmentId) {
      const msg = 'Shiprocket did not return a shipment_id: ' + JSON.stringify(createRes);
      await siteDB.prepare(`UPDATE ${table} SET shiprocket_status = 'failed', shiprocket_error = ? WHERE id = ?`).bind(msg, orderId).run();
      return { ok: false, code: 'NO_SHIPMENT_ID', message: msg };
    }

    // Persist what we have so far in case the next steps fail.
    await siteDB.prepare(
      `UPDATE ${table} SET shiprocket_order_id = ?, shiprocket_shipment_id = ?, shiprocket_status = 'order_created', shiprocket_error = NULL WHERE id = ?`
    ).bind(String(shiprocketOrderId || ''), String(shipmentId), orderId).run();
  }

  // Assign AWB (auto-pick recommended courier).
  let awbInfo = null;
  try {
    const awbRes = await assignAwb(token, shipmentId);
    awbInfo = awbRes?.response?.data || awbRes?.data || null;
  } catch (e) {
    const msg = e instanceof ShiprocketError ? e.message : (e.message || String(e));
    await siteDB.prepare(`UPDATE ${table} SET shiprocket_status = 'awb_failed', shiprocket_error = ? WHERE id = ?`).bind(msg, orderId).run();
    return { ok: false, code: e?.code || 'AWB_FAILED', message: msg, shiprocketOrderId, shipmentId };
  }

  const awbCode = awbInfo?.awb_code || '';
  const courierName = awbInfo?.courier_name || '';

  // Schedule pickup (best-effort; failure here doesn't fail the whole flow).
  try {
    await generatePickup(token, shipmentId);
  } catch (e) {
    console.warn(`[Shiprocket] pickup schedule failed for shipment ${shipmentId}:`, e.message || e);
  }

  // Generate label (best-effort).
  let labelUrl = '';
  try {
    const labelRes = await generateLabel(token, shipmentId);
    labelUrl = labelRes?.label_url || '';
  } catch (e) {
    console.warn(`[Shiprocket] label generation failed for shipment ${shipmentId}:`, e.message || e);
  }

  await siteDB.prepare(
    `UPDATE ${table}
       SET shiprocket_awb = ?,
           shiprocket_courier = ?,
           shiprocket_label_url = ?,
           shiprocket_status = 'awb_assigned',
           shiprocket_error = NULL,
           tracking_number = COALESCE(tracking_number, ?),
           carrier = COALESCE(carrier, ?),
           updated_at = datetime('now')
     WHERE id = ?`
  ).bind(
    awbCode || null,
    courierName || null,
    labelUrl || null,
    awbCode || null,
    courierName || null,
    orderId
  ).run();

  return {
    ok: true,
    shiprocketOrderId,
    shipmentId,
    awb: awbCode,
    courier: courierName,
    labelUrl,
  };
}

// ---------- Endpoint: manual Ship Now ----------

async function handleShipNow(request, env, siteId, orderId) {
  const result = await shipOrderViaShiprocket(env, siteId, orderId, { force: false });
  if (!result.ok) {
    const status = result.code === 'NOT_CONNECTED' ? 400
      : result.code === 'ORDER_NOT_FOUND' ? 404
      : result.code === 'AUTH_FAILED' || result.code === 'SHIPROCKET_AUTH' ? 401
      : 502;
    return errorResponse(result.message || 'Ship-now failed', status, result.code || 'SHIP_FAILED');
  }
  return successResponse(result, result.alreadyShipped ? 'Order already shipped via Shiprocket' : 'Order shipped via Shiprocket');
}

// ---------- Endpoint: cancel shipment ----------

async function handleCancelShipment(env, siteId, orderId) {
  const ctx = await readShiprocketSettings(env, siteId);
  if (!ctx) return errorResponse('Site not found', 404);
  if (!ctx.sr?.emailEncrypted) return errorResponse('Shiprocket not connected', 400, 'NOT_CONNECTED');

  const { siteDB, table, order } = await loadOrderForShipping(env, siteId, orderId);
  if (!order) return errorResponse('Order not found', 404);

  const awb = order.shiprocket_awb;
  const shiprocketOrderId = order.shiprocket_order_id;
  if (!awb && !shiprocketOrderId) {
    return errorResponse('No Shiprocket shipment to cancel for this order', 400, 'NOT_SHIPPED');
  }

  let token;
  try { token = await ensureShiprocketToken(env, siteId, ctx.sr); }
  catch (e) {
    return errorResponse(e.message || 'Auth failed', 401, e.code || 'AUTH_FAILED');
  }

  try {
    if (awb) {
      await cancelShipment(token, awb);
    } else if (shiprocketOrderId) {
      await srCancelOrder(token, shiprocketOrderId);
    }
  } catch (e) {
    const msg = e instanceof ShiprocketError ? e.message : (e.message || String(e));
    return errorResponse(`Shiprocket rejected the cancellation: ${msg}`, 502, e?.code || 'CANCEL_FAILED');
  }

  await siteDB.prepare(
    `UPDATE ${table} SET shiprocket_status = 'cancelled', updated_at = datetime('now') WHERE id = ?`
  ).bind(orderId).run();

  return successResponse({ cancelled: true });
}

// ---------- Endpoint: get/regenerate label ----------

async function handleGetLabel(env, siteId, orderId) {
  const ctx = await readShiprocketSettings(env, siteId);
  if (!ctx) return errorResponse('Site not found', 404);
  if (!ctx.sr?.emailEncrypted) return errorResponse('Shiprocket not connected', 400, 'NOT_CONNECTED');

  const { siteDB, table, order } = await loadOrderForShipping(env, siteId, orderId);
  if (!order) return errorResponse('Order not found', 404);
  if (!order.shiprocket_shipment_id) return errorResponse('No shipment for this order', 400, 'NOT_SHIPPED');

  if (order.shiprocket_label_url) {
    return successResponse({ labelUrl: order.shiprocket_label_url, cached: true });
  }

  let token;
  try { token = await ensureShiprocketToken(env, siteId, ctx.sr); }
  catch (e) { return errorResponse(e.message || 'Auth failed', 401, e.code || 'AUTH_FAILED'); }

  try {
    const labelRes = await generateLabel(token, order.shiprocket_shipment_id);
    const labelUrl = labelRes?.label_url || '';
    if (labelUrl) {
      await siteDB.prepare(`UPDATE ${table} SET shiprocket_label_url = ? WHERE id = ?`).bind(labelUrl, orderId).run();
    }
    return successResponse({ labelUrl });
  } catch (e) {
    const msg = e instanceof ShiprocketError ? e.message : (e.message || String(e));
    return errorResponse(`Failed to generate label: ${msg}`, 502, e?.code || 'LABEL_FAILED');
  }
}

// ---------- Endpoint: live tracking ----------

async function handleTrack(env, siteId, orderId) {
  const ctx = await readShiprocketSettings(env, siteId);
  if (!ctx) return errorResponse('Site not found', 404);
  if (!ctx.sr?.emailEncrypted) return errorResponse('Shiprocket not connected', 400, 'NOT_CONNECTED');

  const { order } = await loadOrderForShipping(env, siteId, orderId);
  if (!order) return errorResponse('Order not found', 404);
  if (!order.shiprocket_awb) return errorResponse('No AWB for this order', 400, 'NO_AWB');

  let token;
  try { token = await ensureShiprocketToken(env, siteId, ctx.sr); }
  catch (e) { return errorResponse(e.message || 'Auth failed', 401, e.code || 'AUTH_FAILED'); }

  try {
    const tr = await trackShipment(token, order.shiprocket_awb);
    return successResponse({ tracking: tr });
  } catch (e) {
    const msg = e instanceof ShiprocketError ? e.message : (e.message || String(e));
    return errorResponse(`Failed to fetch tracking: ${msg}`, 502, e?.code || 'TRACK_FAILED');
  }
}

// ---------- Top-level admin dispatcher ----------

export async function handleShipping(request, env, path, ctx) {
  const url = new URL(request.url);
  const parts = path.split('/').filter(Boolean); // ['api', 'shipping', ...]
  const action = parts[2];
  const method = request.method;

  if (method === 'OPTIONS') return new Response(null, { status: 204 });

  const siteId = url.searchParams.get('siteId');
  if (!siteId) return errorResponse('siteId is required', 400, 'MISSING_SITE_ID');

  const admin = await validateSiteAdmin(request, env, siteId);
  if (!admin) return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');

  try {
    if (action === 'connect' && method === 'POST') {
      if (!hasPermission(admin, 'settings')) return errorResponse('Forbidden: settings permission required', 403, 'FORBIDDEN');
      return await handleConnect(request, env, siteId);
    }
    if (action === 'disconnect' && method === 'POST') {
      if (!hasPermission(admin, 'settings')) return errorResponse('Forbidden: settings permission required', 403, 'FORBIDDEN');
      return await handleDisconnect(env, siteId);
    }
    if (action === 'status' && method === 'GET') {
      return await handleStatus(env, siteId);
    }
    if (action === 'settings' && method === 'PUT') {
      if (!hasPermission(admin, 'settings')) return errorResponse('Forbidden: settings permission required', 403, 'FORBIDDEN');
      return await handleSaveSettings(request, env, siteId);
    }
    if (action === 'pickup-locations' && method === 'GET') {
      return await handlePickupLocations(env, siteId);
    }
    if (action === 'orders' && parts[3]) {
      if (!hasPermission(admin, 'orders')) return errorResponse('Forbidden: orders permission required', 403, 'FORBIDDEN');
      const orderId = parts[3];
      const op = parts[4];
      if (op === 'ship' && method === 'POST') return await handleShipNow(request, env, siteId, orderId);
      if (op === 'cancel' && method === 'POST') return await handleCancelShipment(env, siteId, orderId);
      if (op === 'label' && method === 'GET') return await handleGetLabel(env, siteId, orderId);
      if (op === 'track' && method === 'GET') return await handleTrack(env, siteId, orderId);
    }

    return errorResponse('Not found', 404);
  } catch (e) {
    console.error('Shipping worker error:', e);
    return errorResponse(`Shipping error: ${e.message || 'Unknown'}`, 500);
  }
}

// ---------- Webhook dispatcher ----------
// Path: /api/webhooks/shiprocket/:siteId
// Auth: X-Api-Key header must match site_config.settings.shiprocket.webhookToken.

export async function handleShiprocketWebhook(request, env, path) {
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405);

  const parts = path.split('/').filter(Boolean); // ['api','webhooks','shiprocket', siteId]
  const siteId = parts[3];
  if (!siteId) return errorResponse('siteId missing in path', 400, 'MISSING_SITE_ID');

  let ctx;
  try {
    ctx = await readShiprocketSettings(env, siteId);
  } catch (e) {
    return errorResponse('Site not found', 404, 'SITE_NOT_FOUND');
  }
  if (!ctx) return errorResponse('Site not found', 404, 'SITE_NOT_FOUND');

  const expectedToken = ctx.sr?.webhookToken;
  const provided = request.headers.get('X-Api-Key') || request.headers.get('x-api-key') || '';
  if (!expectedToken || !provided || provided !== expectedToken) {
    return errorResponse('Invalid webhook token', 401, 'BAD_WEBHOOK_TOKEN');
  }

  let payload;
  try { payload = await request.json(); } catch { return errorResponse('Invalid JSON', 400); }

  // Shiprocket webhook payload typically contains awb, current_status, order_id (the merchant's order_id we sent).
  const awb = String(payload.awb || payload.awb_code || '').trim();
  const merchantOrderId = String(payload.order_id || payload.merchant_order_id || '').trim();
  const currentStatus = String(payload.current_status || payload.status || '').trim();
  const eventTime = payload.current_timestamp || payload.event_time || new Date().toISOString();

  if (!awb && !merchantOrderId) {
    return errorResponse('Webhook missing awb and order_id', 400, 'MISSING_IDENTIFIER');
  }

  const { siteDB } = ctx;
  const findInTable = async (table) => {
    if (awb) {
      const row = await siteDB.prepare(`SELECT id, status, shiprocket_last_event_at FROM ${table} WHERE site_id = ? AND shiprocket_awb = ? LIMIT 1`).bind(siteId, awb).first();
      if (row) return { row, table };
    }
    if (merchantOrderId) {
      const row = await siteDB.prepare(`SELECT id, status, shiprocket_last_event_at FROM ${table} WHERE site_id = ? AND order_number = ? LIMIT 1`).bind(siteId, merchantOrderId).first();
      if (row) return { row, table };
    }
    return null;
  };

  const found = (await findInTable('orders')) || (await findInTable('guest_orders'));
  if (!found) return errorResponse('Order not found for AWB', 404, 'ORDER_NOT_FOUND');

  const { row, table } = found;

  // Idempotency: skip if we already processed an event at >= this timestamp.
  if (row.shiprocket_last_event_at && row.shiprocket_last_event_at >= eventTime) {
    return successResponse({ deduped: true });
  }

  // Map Shiprocket statuses to our internal order statuses.
  const sl = currentStatus.toLowerCase();
  let newStatus = null;
  if (/(in.?transit|shipped|out.?for.?pickup|pickup.?scheduled|pickup.?generated|pickup.?completed)/.test(sl)) {
    newStatus = 'shipped';
  } else if (/(out.?for.?delivery)/.test(sl)) {
    newStatus = 'shipped'; // keep as shipped, customer-facing label still says shipped
  } else if (/(delivered)/.test(sl)) {
    newStatus = 'delivered';
  } else if (/(cancell?ed|rto|return)/.test(sl)) {
    newStatus = null; // don't auto-cancel customer-side; just record shiprocket_status
  }

  // Update the row (status fields + shiprocket meta).
  const setClauses = ['shiprocket_status = ?', 'shiprocket_last_event_at = ?', 'updated_at = datetime("now")'];
  const values = [currentStatus, eventTime];
  if (newStatus && row.status !== newStatus) {
    setClauses.push('status = ?');
    values.push(newStatus);
    if (newStatus === 'shipped') setClauses.push('shipped_at = COALESCE(shipped_at, datetime("now"))');
    if (newStatus === 'delivered') setClauses.push('delivered_at = COALESCE(delivered_at, datetime("now"))');
  }
  values.push(row.id);
  await siteDB.prepare(`UPDATE ${table} SET ${setClauses.join(', ')} WHERE id = ?`).bind(...values).run();

  // If status flipped to shipped/delivered, fire customer notifications via the
  // existing path. We do this by importing the email helper directly so we
  // don't have to fake an admin auth header.
  if (newStatus && row.status !== newStatus) {
    try {
      const { sendShiprocketStatusNotification } = await import('./orders-worker.js');
      if (typeof sendShiprocketStatusNotification === 'function') {
        await sendShiprocketStatusNotification(env, siteId, row.id, newStatus, table);
      }
    } catch (e) {
      console.warn('[Shiprocket webhook] notification trigger failed:', e.message || e);
    }
  }

  return successResponse({ ok: true, newStatus, shiprocketStatus: currentStatus });
}
