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
import { getSiteConfig, resolveSiteDBById, ensureShiprocketColumns } from '../../utils/site-db.js';
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
  listAllCouriers,
  ShiprocketError,
  constantTimeEqual,
  parseShiprocketTimestamp,
  formatISTOrderDate,
  hmacSha256B64u,
} from '../../utils/shiprocket.js';
import { sendShiprocketStatusNotification } from '../../utils/shiprocket-notifications.js';

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

// Updates ONLY the $.shiprocket subtree of site_config.settings via SQLite
// json_set, so a concurrent save in another admin section (general, payments,
// abandoned cart, etc.) cannot clobber the shiprocket block — and vice versa.
// (Within-section concurrency on shiprocket itself is still last-writer-wins,
// which is acceptable because all writes go through this single helper.)
async function writeShiprocketSettings(env, siteId, mutator) {
  const ctx = await readShiprocketSettings(env, siteId);
  if (!ctx) throw new Error('Site config not found');
  const { siteDB, sr } = ctx;
  const newSr = await mutator(sr);
  const newSrJson = JSON.stringify(newSr);
  await siteDB.prepare(
    `UPDATE site_config
        SET settings = json_set(
              COALESCE(settings, '{}'),
              '$.shiprocket',
              json(?)
            ),
            updated_at = datetime('now')
      WHERE site_id = ?`
  ).bind(newSrJson, siteId).run();
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
// Throws ShiprocketError on failure. Pass `forceRefresh=true` to bypass the
// cache (used by the 401-retry helper below when a previously-good token
// has been invalidated mid-call by Shiprocket).
async function ensureShiprocketToken(env, siteId, sr, forceRefresh = false) {
  const cache = sr?._tokenCache;
  const now = Date.now();
  if (!forceRefresh && cache?.token && cache.expiresAt) {
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
  // Mutate the in-memory `sr` object so subsequent reads in the same request
  // see the fresh token without re-querying the DB.
  if (sr) sr._tokenCache = { token: login.token, expiresAt };
  return login.token;
}

// Run a Shiprocket API call with automatic 401-retry. If the inner fn throws
// a `ShiprocketError` with code `SHIPROCKET_AUTH` (HTTP 401), we force a
// token refresh and retry once. All other errors propagate immediately.
//
// Usage:
//   const result = await srCall(env, siteId, sr, (token) => srCreateOrder(token, payload));
//
// This sits in front of every wrapper in utils/shiprocket.js so any single
// in-flight token expiry recovers transparently instead of bubbling up to
// the merchant as "Shiprocket auth failed".
async function srCall(env, siteId, sr, fn) {
  let token = await ensureShiprocketToken(env, siteId, sr, false);
  try {
    return await fn(token);
  } catch (e) {
    if (e instanceof ShiprocketError && e.code === 'SHIPROCKET_AUTH') {
      token = await ensureShiprocketToken(env, siteId, sr, true);
      return await fn(token);
    }
    throw e;
  }
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
    // Courier-pick configuration. `auto` lets the server pick a courier from
    // the merchant's preference chain (falling back to Shiprocket's
    // recommended courier). `manual` makes the server stop after creating
    // the Shiprocket order — the merchant must open the order's courier
    // picker modal in the admin and choose explicitly.
    courierPickMode: sr?.courierPickMode === 'manual' ? 'manual' : 'auto',
    preferredCourierIds: sanitizeCourierIds(sr?.preferredCourierIds),
    // ---- Phase 4: dynamic shipping markup ----
    // When `dynamicShippingEnabled` is on AND `courierPickMode === 'auto'`,
    // the storefront/checkout will quote shipping as the cheapest available
    // (preferred → recommended → cheapest) courier rate plus the merchant's
    // markup. Honored only in auto mode because in manual mode we cannot
    // commit to a courier rate before the merchant picks per-order.
    ...sanitizeMarkup(sr),
  };
}

// Sanitize the dynamic-pricing settings into a single object, used by both
// the public view and the save handler so the wire shape never drifts.
// `markupPercent` is clamped to 0–200 (anything above effectively triples
// the rate — beyond that is almost certainly a typo). `markupFlat` is
// clamped to 0–100000 paise-equivalent rupees.
function sanitizeMarkup(sr) {
  const pct = Number(sr?.markupPercent);
  const flat = Number(sr?.markupFlat);
  const mode = sr?.roundingMode;
  return {
    dynamicShippingEnabled: !!sr?.dynamicShippingEnabled,
    markupPercent: Number.isFinite(pct) ? Math.max(0, Math.min(200, pct)) : 0,
    markupFlat: Number.isFinite(flat) ? Math.max(0, Math.min(100000, flat)) : 0,
    roundingMode: (mode === 'nearest5' || mode === 'nearest10') ? mode : 'none',
  };
}

// Strip out anything that isn't a positive integer, de-dupe while preserving
// order, and cap the chain so the server never iterates a pathological list.
const PREFERRED_COURIERS_MAX = 25;
function sanitizeCourierIds(arr) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  const seen = new Set();
  for (const v of arr) {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
    if (out.length >= PREFERRED_COURIERS_MAX) break;
  }
  return out;
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
    courierPickMode: current.courierPickMode === 'manual' ? 'manual' : 'auto',
    preferredCourierIds: sanitizeCourierIds(current.preferredCourierIds),
    // Preserve any markup config a previously-disconnected merchant had set.
    ...sanitizeMarkup(current),
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
    // Preserve the merchant's saved courier preferences so re-connecting
    // doesn't force them to rebuild the chain. Mode resets to 'auto' so a
    // disabled tenant doesn't surprise-block on reconnect.
    courierPickMode: 'auto',
    preferredCourierIds: sanitizeCourierIds(current.preferredCourierIds),
    // Preserve markup config too — merchant likely re-enables soon.
    ...sanitizeMarkup(current),
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

  // If the merchant is enabling Shiprocket they must pick a registered
  // pickup-location nickname. Otherwise create-order calls will be rejected
  // by Shiprocket with a 422 once an order actually tries to ship.
  const requestedNickname = typeof body.pickupLocationNickname === 'string' ? body.pickupLocationNickname.trim() : '';
  if (body.enabled === true) {
    const ctx = await readShiprocketSettings(env, siteId);
    const effectiveNickname = requestedNickname || (ctx?.sr?.pickupLocationNickname || '').trim();
    if (!effectiveNickname) {
      return errorResponse(
        'Choose a pickup location before enabling Shiprocket.',
        400,
        'NO_PICKUP_LOCATION'
      );
    }
  }

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
    courierPickMode: body.courierPickMode === 'manual' ? 'manual'
      : body.courierPickMode === 'auto' ? 'auto'
      : (current.courierPickMode === 'manual' ? 'manual' : 'auto'),
    // Sanitize so we never persist non-numeric / negative / duplicate IDs
    // — the picker logic later iterates this list verbatim.
    preferredCourierIds: 'preferredCourierIds' in body
      ? sanitizeCourierIds(body.preferredCourierIds)
      : sanitizeCourierIds(current.preferredCourierIds),
    // Phase 4: dynamic-pricing fields. Pull from body when present, otherwise
    // keep current. sanitizeMarkup clamps + defaults so an absent/garbage
    // value reduces to the safe defaults (disabled, 0, 0, 'none').
    ...sanitizeMarkup({
      dynamicShippingEnabled: 'dynamicShippingEnabled' in body
        ? !!body.dynamicShippingEnabled
        : !!current.dynamicShippingEnabled,
      markupPercent: 'markupPercent' in body ? body.markupPercent : current.markupPercent,
      markupFlat: 'markupFlat' in body ? body.markupFlat : current.markupFlat,
      roundingMode: 'roundingMode' in body ? body.roundingMode : current.roundingMode,
    }),
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
    const list = await srCall(env, siteId, ctx.sr, (t) => getPickupLocations(t));
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

// Indian Shiprocket accounts require billing_phone/shipping_phone to be a
// 10-digit number; for any other country we keep the full digit sequence so
// couriers can actually reach the buyer.
function normalizePhone(raw, country) {
  const digits = String(raw || '').replace(/\D/g, '');
  const isIndia = /^(india|in|bharat)$/i.test(String(country || 'India').trim());
  return isIndia ? digits.slice(-10) : digits;
}

// Sum item weights (snapshotted in the order's items JSON at order-create time)
// into kilograms. Returns null if any line item is missing weight — callers must
// fail-fast in that case rather than silently fall back to a default that would
// cause weight-discrepancy charges from the courier.
function sumItemsWeightKgStrict(items) {
  if (!Array.isArray(items) || items.length === 0) return null;
  let totalG = 0;
  for (const it of items) {
    const w = Number(it?.weight || 0);
    // Use ?? not || so a quantity of 0 is treated as invalid rather than
    // silently coerced to 1.
    const q = Number(it?.quantity ?? it?.units ?? 1);
    if (!(w > 0) || !Number.isFinite(q) || q <= 0) return null;
    totalG += w * q;
  }
  return totalG > 0 ? totalG / 1000 : null;
}

// Build the Shiprocket "create custom order" payload from our internal order row.
function buildShiprocketOrderPayload(order, sr, brandConfig, siteId, totalWeightKg) {
  let items = [];
  try { items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []); } catch {}

  let shipping = {};
  try { shipping = typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : (order.shipping_address || {}); } catch {}

  let billing = shipping;
  let billingExplicit = false;
  try {
    if (order.billing_address) {
      const b = typeof order.billing_address === 'string' ? JSON.parse(order.billing_address) : order.billing_address;
      if (b && Object.keys(b).length) {
        billing = b;
        billingExplicit = true;
      }
    }
  } catch {}

  // Different parts of the codebase store address fields under different
  // keys: storefront checkout stores `pinCode` (camelCase) + a combined
  // `address` line built from `house_number, road_name`, while admin /
  // profile flows use `pin_code`, `postalCode`, etc. Centralise the lookup
  // so adding a new variant means changing one place.
  const addrLine1 = (a) =>
    a.line1 || a.address1 || a.address_1 || a.address || a.street ||
    [a.house_number || a.houseNumber || '', a.road_name || a.roadName || ''].filter(Boolean).join(', ') ||
    '';
  const addrLine2 = (a) => a.line2 || a.address2 || a.address_2 || '';
  const addrPincode = (a) =>
    a.pinCode || a.pin_code || a.pincode || a.postalCode || a.postal_code || a.pin || a.zip || a.zipCode || a.zip_code || '';

  // Deep-equal address comparison so `shipping_is_billing` flips to false
  // whenever the merchant captured a distinct billing address (even if it
  // happens to share a few fields with shipping). The previous `billing ===
  // shipping` reference check returned false the moment we parsed the JSON
  // even when both addresses were identical, and true only when billing was
  // missing — so Shiprocket got the wrong flag in both directions.
  const sameAddress = !billingExplicit || (
    String(addrLine1(billing)) === String(addrLine1(shipping)) &&
    String(addrLine2(billing)) === String(addrLine2(shipping)) &&
    String(billing.city || '') === String(shipping.city || '') &&
    String(addrPincode(billing)) === String(addrPincode(shipping)) &&
    String(billing.state || '') === String(shipping.state || '') &&
    String(billing.country || 'India') === String(shipping.country || 'India')
  );

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

  // Weight is computed by the caller (shipOrderViaShiprocket) from the
  // per-item snapshot stored on the order. We trust that value here — if it
  // arrived missing/zero, the caller should have already returned a clear
  // NO_ITEM_WEIGHT error before we got here.
  const totalWeight = Number(totalWeightKg) > 0
    ? Number(totalWeightKg)
    : Number(sr?.defaultWeight || 500) / 1000;

  const paymentMethod = (() => {
    const pm = (order.payment_method || '').toLowerCase();
    if (pm === 'cod' || pm === 'cash' || pm === 'cash_on_delivery') return 'COD';
    return 'Prepaid';
  })();

  // Prefix the Shiprocket order_id with a short site-id slice so two Flomerce
  // sites that happen to share one Shiprocket account can't collide on the
  // same merchant order_number (Shiprocket de-dupes order_id account-wide).
  const sitePrefix = String(siteId || '').replace(/-/g, '').slice(0, 8);
  const orderRef = String(order.order_number || order.id);
  const shiprocketOrderRef = sitePrefix ? `${sitePrefix}-${orderRef}` : orderRef;

  // Subtotal: use `??` so a legitimately free order (₹0) still serializes as 0
  // instead of falling through to `order.total`. Same trick on the dimension
  // defaults so a merchant who set `defaultLength: 0` (i.e. an unset value)
  // still gets the 10cm fallback rather than NaN.
  const subTotal = Number(order.subtotal ?? order.total ?? 0);

  return {
    order_id: shiprocketOrderRef,
    // Shiprocket expects the order_date in IST in the form "YYYY-MM-DD HH:mm".
    // Our DB stores UTC ISO strings — converting them via simple string
    // truncation produced a UTC-clock timestamp tagged as IST, mis-dating
    // every order by 5h30m for analytics + label QR codes.
    order_date: formatISTOrderDate(order.created_at || new Date().toISOString()),
    pickup_location: sr.pickupLocationNickname || 'Primary',
    channel_id: '',
    comment: order.notes || '',
    billing_customer_name: firstName,
    billing_last_name: lastName,
    billing_address: String(addrLine1(billing)).slice(0, 100),
    billing_address_2: String(addrLine2(billing)).slice(0, 100),
    billing_city: String(billing.city || ''),
    billing_pincode: String(addrPincode(billing)),
    billing_state: String(billing.state || ''),
    billing_country: String(billing.country || 'India'),
    billing_email: order.customer_email || '',
    billing_phone: normalizePhone(order.customer_phone, billing.country),
    shipping_is_billing: sameAddress,
    shipping_customer_name: firstName,
    shipping_last_name: lastName,
    shipping_address: String(addrLine1(shipping)).slice(0, 100),
    shipping_address_2: String(addrLine2(shipping)).slice(0, 100),
    shipping_city: String(shipping.city || ''),
    shipping_pincode: String(addrPincode(shipping)),
    shipping_country: String(shipping.country || 'India'),
    shipping_state: String(shipping.state || ''),
    shipping_email: order.customer_email || '',
    shipping_phone: normalizePhone(order.customer_phone, shipping.country),
    order_items: orderItems,
    payment_method: paymentMethod,
    shipping_charges: Number(order.shipping_cost || 0),
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: Number(order.discount || 0),
    sub_total: subTotal,
    length: Number(sr?.defaultLength ?? 10) || 10,
    breadth: Number(sr?.defaultBreadth ?? 10) || 10,
    height: Number(sr?.defaultHeight ?? 10) || 10,
    weight: totalWeight,
  };
}

// Pick the best courier_company_id for an order honoring the merchant's
// preference chain. Returns `{ courierId, courierName, available }`. If no
// preference matches and Shiprocket gives no recommendation, courierId is
// `null` and we let Shiprocket auto-pick (current pre-Phase-3 behavior).
//
// `available` is the raw `available_courier_companies` array — surfaced for
// the picker modal endpoint so it can avoid a duplicate Shiprocket call.
async function pickCourierForOrder({ env, siteId, sr, order, totalWeightKg, pickupPincode }) {
  let shipping = {};
  try { shipping = typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : (order.shipping_address || {}); } catch {}
  const deliveryPincode = String(shipping.pinCode || shipping.pin_code || shipping.pincode || shipping.postalCode || shipping.postal_code || shipping.pin || shipping.zip || shipping.zipCode || shipping.zip_code || '').trim();
  if (!/^\d{6}$/.test(deliveryPincode) || !pickupPincode) {
    return { courierId: null, courierName: '', available: [] };
  }
  const codFlag = ((order.payment_method || '').toLowerCase() === 'cod' ||
                   (order.payment_method || '').toLowerCase() === 'cash_on_delivery') ? 1 : 0;

  let resp;
  try {
    resp = await srCall(env, siteId, sr, (t) => getServiceability(t, {
      pickup_postcode: pickupPincode,
      delivery_postcode: deliveryPincode,
      weight: Number(totalWeightKg) || 0.5,
      cod: codFlag,
    }));
  } catch (e) {
    console.warn('[Shiprocket] picker serviceability failed:', e?.message || e);
    return { courierId: null, courierName: '', available: [] };
  }

  const data = resp?.data || resp || {};
  const available = Array.isArray(data?.available_courier_companies)
    ? data.available_courier_companies
    : [];
  if (available.length === 0) {
    return { courierId: null, courierName: '', available: [] };
  }

  const byId = new Map();
  for (const c of available) {
    const id = Number(c?.courier_company_id);
    if (Number.isFinite(id) && id > 0) byId.set(id, c);
  }

  // 1) Walk the merchant's preferred chain in order.
  const preferred = sanitizeCourierIds(sr?.preferredCourierIds);
  for (const id of preferred) {
    const c = byId.get(id);
    if (c) return { courierId: id, courierName: String(c.courier_name || ''), available };
  }

  // 2) Shiprocket's own recommendation (if it points at an available one).
  // The current Shiprocket payload field is `recommended_courier_company_id`;
  // older accounts still expose the legacy alias `recommended_courier_id`,
  // so we read both.
  const recommendedId = Number(data?.recommended_courier_company_id ?? data?.recommended_courier_id);
  if (Number.isFinite(recommendedId) && byId.has(recommendedId)) {
    const c = byId.get(recommendedId);
    return { courierId: recommendedId, courierName: String(c.courier_name || ''), available };
  }

  // 3) No specific pick — let Shiprocket auto-assign at AWB time.
  return { courierId: null, courierName: '', available };
}

// ---------- Internal: full ship-now flow (used by manual + auto-ship) ----------

export async function shipOrderViaShiprocket(env, siteId, orderId, options = {}) {
  const ctx = await readShiprocketSettings(env, siteId);
  if (!ctx) return { ok: false, code: 'SITE_NOT_FOUND', message: 'Site not found' };
  if (!ctx.sr?.enabled || !ctx.sr?.emailEncrypted) {
    return { ok: false, code: 'NOT_CONNECTED', message: 'Shiprocket not connected' };
  }
  // Refuse to call Shiprocket without a confirmed pickup-location nickname —
  // otherwise the create-order request returns a 422 with a confusing message.
  if (!String(ctx.sr?.pickupLocationNickname || '').trim()) {
    return {
      ok: false,
      code: 'NO_PICKUP_LOCATION',
      message: 'No Shiprocket pickup location selected. Choose one in Settings → Shipping.',
    };
  }

  const { siteDB, table, order } = await loadOrderForShipping(env, siteId, orderId);
  if (!order) return { ok: false, code: 'ORDER_NOT_FOUND', message: 'Order not found' };

  // BUG FIX: refuse to ship orders in any terminal state. We check BOTH
  // `status` (which can be 'cancelled' or 'refunded') AND `payment_status`
  // (which can be 'refunded' even when status is still 'paid' — e.g. when
  // a refund webhook arrived but the order-status hasn't been moved yet).
  // Without this gate the merchant could (re-)trigger Shiprocket from the
  // admin UI on a refunded order, mint a fresh AWB, and ship a parcel
  // they've already refunded the buyer for.
  const orderStatusLc = String(order.status || '').toLowerCase();
  const paymentStatusLc = String(order.payment_status || '').toLowerCase();
  if (orderStatusLc === 'cancelled' || orderStatusLc === 'refunded' || paymentStatusLc === 'refunded') {
    return {
      ok: false,
      code: 'ORDER_TERMINAL',
      message: `Cannot ship an order in '${orderStatusLc}' status (payment '${paymentStatusLc}')`,
    };
  }

  // Compute total parcel weight from the per-item snapshot taken at order
  // creation. If any item is missing weight, refuse to ship — sending a
  // default value here would cause Shiprocket to charge weight-discrepancy
  // fees once the courier physically weighs the parcel.
  let parsedItemsForWeight = [];
  try {
    parsedItemsForWeight = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
  } catch {}
  const totalWeightKg = sumItemsWeightKgStrict(parsedItemsForWeight);
  if (!totalWeightKg) {
    return {
      ok: false,
      code: 'NO_ITEM_WEIGHT',
      message: 'One or more items in this order are missing shipping weight. Set the weight in Products → Edit, then retry.',
    };
  }

  if (order.shiprocket_awb) {
    return {
      ok: true,
      alreadyShipped: true,
      awb: order.shiprocket_awb,
      shipmentId: order.shiprocket_shipment_id,
      labelUrl: order.shiprocket_label_url,
      shiprocket_order_id: order.shiprocket_order_id,
      shiprocket_shipment_id: order.shiprocket_shipment_id,
      shiprocket_awb: order.shiprocket_awb,
      shiprocket_courier: order.shiprocket_courier,
      shiprocket_label_url: order.shiprocket_label_url,
      shiprocket_status: order.shiprocket_status || 'awb_assigned',
    };
  }

  // Resume from where the last attempt left off. If a previous attempt
  // already created the Shiprocket order/shipment but failed at AWB assign,
  // skip the create step to avoid duplicate orders in Shiprocket.
  let shiprocketOrderId = order.shiprocket_order_id || '';
  let shipmentId = order.shiprocket_shipment_id || '';
  const needsCreate = !shipmentId;

  // Lease-based claim: write `shiprocket_claimed_at` together with the
  // working status so a stuck/crashed worker doesn't permanently block the
  // order. Other callers can re-claim once the lease expires (10 min).
  // The previous claim allowed re-entry only when status was already
  // failed/cancelled — so a worker crash mid-`creating` left the row
  // wedged forever and the merchant had to manually flip the status in DB.
  const STALE_LEASE_MIN = 10;
  if (needsCreate) {
    const claim = await siteDB.prepare(
      `UPDATE ${table}
          SET shiprocket_status = 'creating',
              shiprocket_error = NULL,
              shiprocket_claimed_at = datetime('now'),
              updated_at = datetime('now')
        WHERE id = ?
          AND shiprocket_shipment_id IS NULL
          AND (shiprocket_status IS NULL
               OR shiprocket_status IN ('failed', 'awb_failed', 'cancelled')
               OR (shiprocket_status IN ('creating', 'awb_assigning')
                   AND (shiprocket_claimed_at IS NULL
                        OR shiprocket_claimed_at < datetime('now', '-' || ? || ' minutes'))))`
    ).bind(orderId, STALE_LEASE_MIN).run();

    if (!claim.meta?.changes) {
      const cur = await siteDB.prepare(
        `SELECT shiprocket_status, shiprocket_shipment_id FROM ${table} WHERE id = ?`
      ).bind(orderId).first();
      if (cur?.shiprocket_shipment_id) {
        return { ok: false, code: 'ALREADY_SHIPPED', message: 'Shipment already created for this order' };
      }
      return { ok: false, code: 'IN_PROGRESS', message: 'Another ship operation is already in progress for this order' };
    }
  } else {
    // Resume path: only AWB assign + pickup + label remain. Claim the AWB
    // step before login so a concurrent retry doesn't double-assign AWBs.
    // `courier_pending` is allowed here so the picker modal can resume an
    // order that was stopped after create-order in manual courier-pick mode.
    const awbClaim = await siteDB.prepare(
      `UPDATE ${table}
          SET shiprocket_status = 'awb_assigning',
              shiprocket_error = NULL,
              shiprocket_claimed_at = datetime('now'),
              updated_at = datetime('now')
        WHERE id = ?
          AND shiprocket_awb IS NULL
          AND (shiprocket_status IS NULL
               OR shiprocket_status IN ('order_created', 'courier_pending', 'failed', 'awb_failed')
               OR (shiprocket_status = 'awb_assigning'
                   AND (shiprocket_claimed_at IS NULL
                        OR shiprocket_claimed_at < datetime('now', '-' || ? || ' minutes'))))`
    ).bind(orderId, STALE_LEASE_MIN).run();

    if (!awbClaim.meta?.changes) {
      const cur = await siteDB.prepare(
        `SELECT shiprocket_status, shiprocket_awb FROM ${table} WHERE id = ?`
      ).bind(orderId).first();
      if (cur?.shiprocket_awb) {
        return { ok: false, code: 'ALREADY_SHIPPED', message: 'Order already has an AWB assigned' };
      }
      return { ok: false, code: 'IN_PROGRESS', message: 'AWB assignment already in progress for this order' };
    }
  }

  if (needsCreate) {
    const payload = buildShiprocketOrderPayload(order, ctx.sr, ctx.config, siteId, totalWeightKg);

    // Pre-validate the most common Shiprocket payload requirements. Their
    // /orders/create/adhoc endpoint returns the unhelpful "Oops! Invalid
    // Data." for any of these and the merchant can't act on that. Surface
    // the missing field directly so they can fix the order and retry.
    const validationErrors = [];
    const phoneDigits = String(payload.shipping_phone || '').replace(/\D/g, '');
    if (!phoneDigits || phoneDigits.length < 10) {
      validationErrors.push("customer phone is missing or invalid (need 10-digit phone)");
    }
    if (!String(payload.shipping_pincode || '').match(/^\d{6}$/)) {
      validationErrors.push(`shipping pincode "${payload.shipping_pincode || ''}" is invalid (need 6-digit Indian pincode)`);
    }
    if (!String(payload.shipping_address || '').trim()) {
      validationErrors.push("shipping address is empty");
    }
    if (!String(payload.shipping_city || '').trim()) {
      validationErrors.push("shipping city is empty");
    }
    if (!String(payload.shipping_state || '').trim()) {
      validationErrors.push("shipping state is empty");
    }
    // Billing fields are separately required by Shiprocket whenever billing
    // differs from shipping. When they're the same (`shipping_is_billing`
    // true), Shiprocket copies from shipping so we don't need to re-check.
    if (payload.shipping_is_billing === false) {
      const billingPhoneDigits = String(payload.billing_phone || '').replace(/\D/g, '');
      if (!billingPhoneDigits || billingPhoneDigits.length < 10) {
        validationErrors.push("billing phone is missing or invalid (need 10-digit phone)");
      }
      if (!String(payload.billing_pincode || '').match(/^\d{6}$/)) {
        validationErrors.push(`billing pincode "${payload.billing_pincode || ''}" is invalid (need 6-digit Indian pincode)`);
      }
      if (!String(payload.billing_address || '').trim()) {
        validationErrors.push("billing address is empty");
      }
      if (!String(payload.billing_city || '').trim()) {
        validationErrors.push("billing city is empty");
      }
      if (!String(payload.billing_state || '').trim()) {
        validationErrors.push("billing state is empty");
      }
    }
    if (!Array.isArray(payload.order_items) || payload.order_items.length === 0) {
      validationErrors.push("order has no items");
    } else {
      for (const it of payload.order_items) {
        if (!it.sku || !String(it.sku).trim()) {
          validationErrors.push(`item "${it.name || 'unknown'}" is missing SKU`);
          break;
        }
        if (!Number.isFinite(Number(it.units)) || Number(it.units) <= 0) {
          validationErrors.push(`item "${it.name || 'unknown'}" has invalid quantity`);
          break;
        }
      }
    }
    if (validationErrors.length) {
      const msg = `Cannot ship — ${validationErrors.join('; ')}. Please fix the order in the admin panel and retry.`;
      await siteDB.prepare(`UPDATE ${table} SET shiprocket_status = 'failed', shiprocket_error = ? WHERE id = ?`).bind(msg, orderId).run();
      return { ok: false, code: 'INVALID_ORDER_DATA', message: msg };
    }

    let createRes;
    try {
      createRes = await srCall(env, siteId, ctx.sr, (t) => srCreateOrder(t, payload));
    } catch (e) {
      const msg = e instanceof ShiprocketError ? e.message : (e.message || String(e));
      // Log the payload (without PII-rich fields) when Shiprocket rejects so
      // the merchant or support can see what we sent. Helps diagnose future
      // "Oops! Invalid Data." cases without needing prod log access.
      console.error('[Shiprocket] create order failed:', msg, JSON.stringify({
        order_id: payload.order_id,
        pickup_location: payload.pickup_location,
        items_count: payload.order_items?.length,
        weight: payload.weight,
        sub_total: payload.sub_total,
        shipping_pincode: payload.shipping_pincode,
        shipping_state: payload.shipping_state,
        payment_method: payload.payment_method,
      }));
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

    // Persist what we have so far in case the next steps fail. We bump the
    // status to 'awb_assigning' here (not 'order_created') because we already
    // hold the AWB claim for this caller — no need to re-claim below.
    await siteDB.prepare(
      `UPDATE ${table} SET shiprocket_order_id = ?, shiprocket_shipment_id = ?, shiprocket_status = 'awb_assigning', shiprocket_error = NULL WHERE id = ?`
    ).bind(String(shiprocketOrderId || ''), String(shipmentId), orderId).run();
  }

  // ---------- Courier selection (Phase 3) ----------
  // Three sources, in priority order:
  //   1. `options.courierId` — explicit pick (the courier-picker modal POSTs
  //      `?courierId=N` for this case and also sets `manualOverride: true`).
  //   2. Merchant's preferred-courier chain → Shiprocket's `recommended_courier_id`.
  //   3. Nothing — let Shiprocket auto-assign at AWB time.
  // In `manual` mode without an explicit pick we STOP here, leave the order
  // created in Shiprocket, and return `COURIER_PICK_REQUIRED` so the admin
  // can open the picker modal. The order row is parked at status
  // `courier_pending`; the resume path above whitelists that state.
  let chosenCourierId = null;
  if (options.courierId) {
    const n = Number(options.courierId);
    if (Number.isFinite(n) && n > 0 && Number.isInteger(n)) chosenCourierId = n;
  }
  const sr = ctx.sr || {};
  if (!chosenCourierId && sr.courierPickMode === 'manual' && !options.manualOverride) {
    await siteDB.prepare(
      `UPDATE ${table} SET shiprocket_status = 'courier_pending', shiprocket_error = NULL, updated_at = datetime('now') WHERE id = ?`
    ).bind(orderId).run();
    return {
      ok: false,
      code: 'COURIER_PICK_REQUIRED',
      message: 'Order created in Shiprocket. Open this order to pick a courier.',
      shiprocketOrderId,
      shipmentId,
      shiprocket_order_id: String(shiprocketOrderId || ''),
      shiprocket_shipment_id: String(shipmentId || ''),
      shiprocket_status: 'courier_pending',
    };
  }
  if (!chosenCourierId) {
    let pickupPin = sr.pickupLocationPincode || null;
    if (!pickupPin) {
      // resolvePickupPincode reads `ctx.sr` for the cached pin / nickname; it
      // does its own token bootstrapping so we don't pass `token` here.
      try { pickupPin = await resolvePickupPincode(env, siteId, { sr }); }
      catch (e) { console.warn('[Shiprocket] resolvePickupPincode for ship failed:', e?.message || e); }
    }
    try {
      const picked = await pickCourierForOrder({
        env, siteId, sr, order, totalWeightKg, pickupPincode: pickupPin,
      });
      if (picked.courierId) chosenCourierId = picked.courierId;
    } catch (e) {
      console.warn('[Shiprocket] courier auto-pick failed, falling back to Shiprocket default:', e?.message || e);
    }
  }

  // Assign AWB (with the chosen courier_id, or null = Shiprocket auto-pick).
  let awbInfo = null;
  try {
    const awbRes = await srCall(env, siteId, ctx.sr, (t) => assignAwb(t, shipmentId, chosenCourierId || undefined));
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
    await srCall(env, siteId, ctx.sr, (t) => generatePickup(t, shipmentId));
  } catch (e) {
    console.warn(`[Shiprocket] pickup schedule failed for shipment ${shipmentId}:`, e.message || e);
  }

  // Generate label (best-effort).
  let labelUrl = '';
  try {
    const labelRes = await srCall(env, siteId, ctx.sr, (t) => generateLabel(t, shipmentId));
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
    shiprocket_order_id: String(shiprocketOrderId || ''),
    shiprocket_shipment_id: String(shipmentId || ''),
    shiprocket_awb: awbCode,
    shiprocket_courier: courierName,
    shiprocket_label_url: labelUrl,
    shiprocket_status: 'awb_assigned',
  };
}

// ---------- Endpoint: manual Ship Now ----------

async function handleShipNow(request, env, siteId, orderId) {
  // The picker modal POSTs `?courierId=N` to ship with an explicit courier.
  // Body is also accepted (and overrides query) so callers can send JSON.
  const url = new URL(request.url);
  let courierId = url.searchParams.get('courierId') || null;
  try {
    const ct = (request.headers.get('content-type') || '').toLowerCase();
    if (ct.includes('application/json')) {
      const body = await request.json();
      if (body && body.courierId != null) courierId = body.courierId;
    }
  } catch { /* body optional */ }

  const opts = {};
  if (courierId != null && String(courierId).trim() !== '') {
    const n = Number(courierId);
    if (Number.isFinite(n) && n > 0 && Number.isInteger(n)) {
      opts.courierId = n;
      // An explicit courier pick from the admin UI bypasses the manual-mode
      // bail-out (the merchant has just made the choice the bail-out asks
      // for).
      opts.manualOverride = true;
    }
  }

  const result = await shipOrderViaShiprocket(env, siteId, orderId, opts);
  if (!result.ok) {
    // COURIER_PICK_REQUIRED is a real, expected outcome in manual mode — it
    // means we successfully created the Shiprocket order but stopped before
    // AWB so the admin can pick. Surface it as 200 with `pickerRequired:true`
    // so the frontend can open the picker modal in one step instead of
    // treating it as an error.
    if (result.code === 'COURIER_PICK_REQUIRED') {
      return successResponse({ ...result, pickerRequired: true }, result.message || 'Pick a courier');
    }
    // Map merchant-actionable client errors to 4xx so the admin UI can show
    // the message inline as a soft failure (and retries don't auto-trigger).
    // Anything we don't recognise stays as 502 — those are upstream issues
    // we can't fix by editing the order.
    const clientErrorCodes = new Set([
      'NOT_CONNECTED',
      'NO_PICKUP_LOCATION',
      'NO_ITEM_WEIGHT',
      'INVALID_ORDER_DATA',
      'ORDER_TERMINAL',
      'ALREADY_SHIPPED',
      'IN_PROGRESS',
      'SHIPROCKET_VALIDATION',
    ]);
    const status = clientErrorCodes.has(result.code) ? 400
      : result.code === 'ORDER_NOT_FOUND' ? 404
      : result.code === 'AUTH_FAILED' || result.code === 'SHIPROCKET_AUTH' ? 401
      : 502;
    return errorResponse(result.message || 'Ship-now failed', status, result.code || 'SHIP_FAILED');
  }
  return successResponse(result, result.alreadyShipped ? 'Order already shipped via Shiprocket' : 'Order shipped via Shiprocket');
}

// ---------- Endpoint: per-order serviceable couriers (for picker modal) ----------

async function handleListServiceableCouriers(env, siteId, orderId) {
  const ctx = await readShiprocketSettings(env, siteId);
  if (!ctx) return errorResponse('Site not found', 404);
  if (!ctx.sr?.enabled || !ctx.sr?.emailEncrypted) {
    return errorResponse('Shiprocket not connected', 400, 'NOT_CONNECTED');
  }

  const { order } = await loadOrderForShipping(env, siteId, orderId);
  if (!order) return errorResponse('Order not found', 404);

  // Need the order's parcel weight to ask Shiprocket which couriers can carry
  // it. Fail fast if the order is missing per-item weights — same posture as
  // shipOrderViaShiprocket so the merchant gets a clear error in the modal.
  let parsedItems = [];
  try { parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []); } catch {}
  const totalWeightKg = sumItemsWeightKgStrict(parsedItems);
  if (!totalWeightKg) {
    return errorResponse(
      'One or more items in this order are missing shipping weight. Set the weight in Products → Edit, then retry.',
      400,
      'NO_ITEM_WEIGHT'
    );
  }

  // Resolve pickup pincode (cached in settings after the first call).
  let pickupPin = ctx.sr.pickupLocationPincode || null;
  if (!pickupPin) {
    // resolvePickupPincode expects the full ctx ({ sr }), not the unwrapped
    // settings object — passing `ctx.sr` made the function read no nickname
    // and always return null on cold caches, blocking the picker.
    try { pickupPin = await resolvePickupPincode(env, siteId, ctx); }
    catch (e) { console.warn('[Shiprocket] resolvePickupPincode for picker failed:', e?.message || e); }
  }
  if (!pickupPin) {
    return errorResponse('Could not resolve pickup pincode. Re-select your pickup location in Settings.', 400, 'NO_PICKUP_LOCATION');
  }

  let shipping = {};
  try { shipping = typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : (order.shipping_address || {}); } catch {}
  const deliveryPincode = String(shipping.pinCode || shipping.pin_code || shipping.pincode || shipping.postalCode || shipping.postal_code || shipping.pin || shipping.zip || shipping.zipCode || shipping.zip_code || '').trim();
  if (!/^\d{6}$/.test(deliveryPincode)) {
    return errorResponse("Order's shipping address has no valid 6-digit pincode.", 400, 'BAD_DELIVERY_PINCODE');
  }
  const codFlag = ((order.payment_method || '').toLowerCase() === 'cod' ||
                   (order.payment_method || '').toLowerCase() === 'cash_on_delivery') ? 1 : 0;

  let resp;
  try {
    resp = await srCall(env, siteId, ctx.sr, (t) => getServiceability(t, {
      pickup_postcode: pickupPin,
      delivery_postcode: deliveryPincode,
      weight: totalWeightKg,
      cod: codFlag,
    }));
  } catch (e) {
    const msg = e instanceof ShiprocketError ? e.message : (e.message || String(e));
    const status = (e instanceof ShiprocketError && e.status === 401) ? 401 : 502;
    return errorResponse(`Failed to fetch serviceable couriers: ${msg}`, status, e?.code || 'UPSTREAM_ERROR');
  }

  const data = resp?.data || resp || {};
  const available = Array.isArray(data?.available_courier_companies) ? data.available_courier_companies : [];
  // Shiprocket's documented field is `recommended_courier_company_id`;
  // some older accounts still serve `recommended_courier_id`.
  const recommendedId = Number(data?.recommended_courier_company_id ?? data?.recommended_courier_id) || null;
  const preferred = sanitizeCourierIds(ctx.sr.preferredCourierIds);
  const preferredRank = new Map(preferred.map((id, i) => [id, i]));

  const couriers = available.map((c) => {
    const id = Number(c?.courier_company_id);
    const name = String(c?.courier_name || '');
    const rate = Number(c?.rate);
    const etaDays = Number(c?.estimated_delivery_days);
    const codSupport = Number(c?.cod) === 1 || c?.cod === true;
    const rank = preferredRank.has(id) ? preferredRank.get(id) : null;
    return {
      id,
      name,
      rate: Number.isFinite(rate) ? rate : null,
      etaDays: Number.isFinite(etaDays) ? etaDays : null,
      etd: c?.etd || null,
      codSupport,
      recommended: id === recommendedId,
      isPreferred: rank !== null,
      preferredRank: rank,
    };
  })
  // Show preferred first (in their merchant-defined order), then recommended,
  // then everything else. Within each group keep cheapest first as a sane
  // default tiebreaker.
  .sort((a, b) => {
    if (a.isPreferred !== b.isPreferred) return a.isPreferred ? -1 : 1;
    if (a.isPreferred && b.isPreferred) return (a.preferredRank ?? 0) - (b.preferredRank ?? 0);
    if (a.recommended !== b.recommended) return a.recommended ? -1 : 1;
    return (a.rate ?? Infinity) - (b.rate ?? Infinity);
  });

  return successResponse({
    couriers,
    recommendedId,
    preferredCourierIds: preferred,
    pickupPincode: pickupPin,
    deliveryPincode,
    weightKg: totalWeightKg,
    codRequested: !!codFlag,
    courierPickMode: ctx.sr.courierPickMode === 'manual' ? 'manual' : 'auto',
  });
}

// ---------- Endpoint: full courier list (for Settings preference picker) ----------

async function handleListAllCouriers(env, siteId) {
  const ctx = await readShiprocketSettings(env, siteId);
  if (!ctx) return errorResponse('Site not found', 404);
  if (!ctx.sr?.emailEncrypted) {
    return errorResponse('Shiprocket not connected', 400, 'NOT_CONNECTED');
  }
  try {
    const list = await srCall(env, siteId, ctx.sr, (t) => listAllCouriers(t));
    return successResponse({ couriers: list });
  } catch (e) {
    const msg = e instanceof ShiprocketError ? e.message : (e.message || String(e));
    const status = (e instanceof ShiprocketError && e.status === 401) ? 401 : 502;
    return errorResponse(`Failed to fetch courier list: ${msg}`, status, e?.code || 'UPSTREAM_ERROR');
  }
}

// ---------- Endpoint: cancel shipment ----------

async function handleCancelShipment(env, siteId, orderId) {
  const ctx = await readShiprocketSettings(env, siteId);
  if (!ctx) return errorResponse('Site not found', 404);
  if (!ctx.sr?.emailEncrypted) return errorResponse('Shiprocket not connected', 400, 'NOT_CONNECTED');

  const { siteDB, table, order } = await loadOrderForShipping(env, siteId, orderId);
  if (!order) return errorResponse('Order not found', 404);

  // Refuse cancel-shipment for any terminal-state order:
  //   * delivered — buyer has the parcel; "cancel" is meaningless
  //   * cancelled / refunded — order's lifecycle is closed; the
  //     cancel-AWB call should have been made at cancellation time,
  //     not as a separate later admin action
  // Per task acceptance criteria, ship/cancel are gated identically.
  const cancelOrderStatusLc = String(order.status || '').toLowerCase();
  const cancelPaymentStatusLc = String(order.payment_status || '').toLowerCase();
  if (cancelOrderStatusLc === 'delivered') {
    return errorResponse('Cannot cancel shipment: order has already been delivered', 400, 'ORDER_DELIVERED');
  }
  if (cancelOrderStatusLc === 'cancelled' || cancelOrderStatusLc === 'refunded' || cancelPaymentStatusLc === 'refunded') {
    return errorResponse(
      `Cannot cancel shipment: order is in '${cancelOrderStatusLc}' status (payment '${cancelPaymentStatusLc}')`,
      400,
      'ORDER_TERMINAL'
    );
  }

  const awb = order.shiprocket_awb;
  const shiprocketOrderId = order.shiprocket_order_id;
  if (!awb && !shiprocketOrderId) {
    return errorResponse('No Shiprocket shipment to cancel for this order', 400, 'NOT_SHIPPED');
  }

  try {
    // Cancel the AWB first (releases the courier slot). Then ALSO cancel the
    // parent Shiprocket order so the manifest doesn't auto-generate a label
    // for it the next morning. Per Shiprocket support — calling only
    // `cancel/shipment` leaves the order in 'NEW'/'PROCESSING' and a
    // background sweep will eventually try to re-pick a courier.
    if (awb) {
      await srCall(env, siteId, ctx.sr, (t) => cancelShipment(t, awb));
    }
    if (shiprocketOrderId) {
      try {
        await srCall(env, siteId, ctx.sr, (t) => srCancelOrder(t, shiprocketOrderId));
      } catch (e) {
        // Non-fatal: AWB is already cancelled, so the buyer is safe. Log and
        // continue so the merchant sees the shipment marked cancelled even
        // if the parent-order cancel call hits an "already cancelled" 4xx.
        console.warn(`[Shiprocket] cancelOrder for SR order ${shiprocketOrderId} failed (non-fatal):`, e?.message || e);
      }
    }
  } catch (e) {
    const msg = e instanceof ShiprocketError ? e.message : (e.message || String(e));
    const status = (e instanceof ShiprocketError && e.status === 401) ? 401 : 502;
    return errorResponse(`Shiprocket rejected the cancellation: ${msg}`, status, e?.code || 'CANCEL_FAILED');
  }

  await siteDB.prepare(
    `UPDATE ${table} SET shiprocket_status = 'cancelled', updated_at = datetime('now') WHERE id = ?`
  ).bind(orderId).run();

  return successResponse({ cancelled: true, shiprocket_status: 'cancelled' });
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
    return successResponse({ labelUrl: order.shiprocket_label_url, shiprocket_label_url: order.shiprocket_label_url, cached: true });
  }

  try {
    const labelRes = await srCall(env, siteId, ctx.sr, (t) => generateLabel(t, order.shiprocket_shipment_id));
    const labelUrl = labelRes?.label_url || '';
    if (labelUrl) {
      await siteDB.prepare(`UPDATE ${table} SET shiprocket_label_url = ? WHERE id = ?`).bind(labelUrl, orderId).run();
    }
    return successResponse({ labelUrl, shiprocket_label_url: labelUrl });
  } catch (e) {
    const msg = e instanceof ShiprocketError ? e.message : (e.message || String(e));
    const status = (e instanceof ShiprocketError && e.status === 401) ? 401 : 502;
    return errorResponse(`Failed to generate label: ${msg}`, status, e?.code || 'LABEL_FAILED');
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

  try {
    const tr = await srCall(env, siteId, ctx.sr, (t) => trackShipment(t, order.shiprocket_awb));
    return successResponse({ tracking: tr });
  } catch (e) {
    const msg = e instanceof ShiprocketError ? e.message : (e.message || String(e));
    const status = (e instanceof ShiprocketError && e.status === 401) ? 401 : 502;
    return errorResponse(`Failed to fetch tracking: ${msg}`, status, e?.code || 'TRACK_FAILED');
  }
}

// ---------- Public endpoint: cart/checkout serviceability ----------
//
// Customer-facing (NO admin auth) — called from cart and checkout pages to
// surface ETA range + COD-availability badges. Returns a small aggregated
// view of Shiprocket's serviceability response (min/max delivery days, COD
// available across any courier, courier count). Heavy-weight: hits Shiprocket
// per (pickup, delivery, weight, cod) tuple — cached in the edge cache for 1h.
//
// COD-availability gating: even if Shiprocket says some courier supports COD
// for this pincode, we ONLY surface `codAvailable: true` when the merchant
// has Cash-on-Delivery enabled in Settings → Payments. The frontend should
// never show a COD badge when the merchant has disabled COD.

const SERVICEABILITY_CACHE_TTL_S = 60 * 60; // 1 hour

// Hard caps to limit abuse of the public endpoint:
//  - per-line qty: a real cart shouldn't have more than this of one SKU.
//  - total weight: anything beyond this is almost certainly an attempt to
//    bust the cache key-space and burn the merchant's Shiprocket quota.
//  - distinct items: enforced separately when parsing (slice(0, 50)).
const SERVICEABILITY_MAX_QTY_PER_ITEM = 999;
const SERVICEABILITY_MAX_TOTAL_WEIGHT_KG = 100;

// In-flight request dedupe (per isolate). When two concurrent shoppers ask
// for the exact same (site, pickup, delivery, weight, cod) tuple we let the
// second one wait on the first one's promise instead of also calling
// Shiprocket. Workers spread requests across isolates so this is only a
// partial mitigation, but it eliminates the worst stampedes within an
// isolate without the operational weight of a Durable Object.
//
// Bounded by INFLIGHT_SERVICEABILITY_MAX. Map iteration order is insertion
// order in V8, so once the map is at capacity we drop the oldest entry —
// which is almost always already settled (the .finally() handler usually
// removes it within milliseconds; the cap is a safety net against runaway
// promises from a misbehaving upstream + an attacker spraying unique cache
// keys to grow the map without bound).
const INFLIGHT_SERVICEABILITY_MAX = 500;
const INFLIGHT_SERVICEABILITY = new Map();
function setInflightServiceability(key, promise) {
  if (INFLIGHT_SERVICEABILITY.size >= INFLIGHT_SERVICEABILITY_MAX) {
    const oldestKey = INFLIGHT_SERVICEABILITY.keys().next().value;
    if (oldestKey !== undefined) INFLIGHT_SERVICEABILITY.delete(oldestKey);
  }
  INFLIGHT_SERVICEABILITY.set(key, promise);
}

// Look up the merchant's pickup pincode. Cached in site_config.settings.shiprocket
// after the first lookup so subsequent serviceability calls don't hit
// Shiprocket's pickup-locations endpoint repeatedly.
async function resolvePickupPincode(env, siteId, ctx) {
  const cached = String(ctx.sr?.pickupLocationPincode || '').trim();
  if (/^\d{6}$/.test(cached)) return cached;

  const nickname = String(ctx.sr?.pickupLocationNickname || '').trim();
  if (!nickname) return null;

  let list;
  try {
    list = await srCall(env, siteId, ctx.sr, (t) => getPickupLocations(t));
  } catch {
    return null;
  }

  const match = (Array.isArray(list) ? list : []).find(
    (l) => String(l?.pickup_location || '').trim().toLowerCase() === nickname.toLowerCase()
  );
  const pin = String(match?.pin_code || '').trim();
  if (!/^\d{6}$/.test(pin)) return null;

  // Persist for future calls (won't clobber other settings — uses json_set on
  // $.shiprocket.pickupLocationPincode).
  try {
    const siteDB = await resolveSiteDBById(env, siteId);
    await siteDB.prepare(
      `UPDATE site_config
          SET settings = json_set(
                COALESCE(settings, '{}'),
                '$.shiprocket.pickupLocationPincode',
                ?
              ),
              updated_at = datetime('now')
        WHERE site_id = ?`
    ).bind(pin, siteId).run();
  } catch (e) {
    console.warn('Failed to cache pickup pincode:', e?.message || e);
  }
  return pin;
}

// Bulk-load product weights (in grams) for the supplied product IDs from the
// site's shard. Returns Map<productId, weightG>. Missing products / null
// weights are simply absent from the map — the caller fail-fasts.
async function loadProductWeightsG(env, siteId, productIds) {
  const ids = [...new Set((productIds || []).map((p) => String(p)).filter(Boolean))];
  if (ids.length === 0) return new Map();
  const siteDB = await resolveSiteDBById(env, siteId);
  const placeholders = ids.map(() => '?').join(',');
  const rows = await siteDB.prepare(
    `SELECT id, weight FROM products WHERE site_id = ? AND id IN (${placeholders})`
  ).bind(siteId, ...ids).all();
  const map = new Map();
  for (const r of (rows?.results || [])) {
    const w = Number(r.weight);
    if (Number.isFinite(w) && w > 0) map.set(String(r.id), w);
  }
  return map;
}

// Reduce Shiprocket's available_courier_companies array to the small view we
// surface to buyers. `merchantCodEnabled` MUST be passed in so we never tell a
// shopper COD is available when the merchant has disabled it in Payments.
function aggregateServiceability(srData, merchantCodEnabled) {
  const couriers = Array.isArray(srData?.available_courier_companies)
    ? srData.available_courier_companies
    : [];
  if (couriers.length === 0) {
    return { serviceable: false, etaMinDays: null, etaMaxDays: null, codAvailable: false, courierCount: 0 };
  }
  const days = couriers
    .map((c) => Number(c?.estimated_delivery_days))
    .filter((n) => Number.isFinite(n) && n > 0);
  const codCourier = couriers.some((c) => Number(c?.cod) === 1 || c?.cod === true);
  return {
    serviceable: true,
    etaMinDays: days.length ? Math.min(...days) : null,
    etaMaxDays: days.length ? Math.max(...days) : null,
    codAvailable: !!(merchantCodEnabled && codCourier),
    courierCount: couriers.length,
  };
}

// ---------- Phase 4: dynamic shipping quote ----------

// Apply the merchant's percent + flat markup to a raw courier rate, then
// round per `roundingMode`. Always returns a non-negative number rounded to
// 2 dp at minimum.
function applyMarkup(baseRate, sr) {
  const m = sanitizeMarkup(sr);
  const raw = (Number(baseRate) || 0) * (1 + m.markupPercent / 100) + m.markupFlat;
  const positive = Math.max(0, raw);
  if (m.roundingMode === 'nearest5') return Math.round(positive / 5) * 5;
  if (m.roundingMode === 'nearest10') return Math.round(positive / 10) * 10;
  return Math.round(positive * 100) / 100;
}

// Pick the courier rate to quote for the customer. Honors the same
// preference chain as `pickCourierForOrder` (preferred[0..n] → recommended →
// cheapest available) so the price the shopper sees matches what we'll
// actually use to ship. Returns `null` if no usable rate is found, which
// signals the caller to fall back to the static delivery config.
function pickQuotableRate(srData, sr) {
  const couriers = Array.isArray(srData?.available_courier_companies)
    ? srData.available_courier_companies
    : [];
  if (couriers.length === 0) return null;

  // Index couriers by id for O(1) preference lookups.
  const byId = new Map();
  for (const c of couriers) {
    const id = Number(c?.courier_company_id);
    const rate = Number(c?.rate);
    if (Number.isFinite(id) && id > 0 && Number.isFinite(rate) && rate >= 0) {
      // If Shiprocket somehow returns the same courier twice, keep the
      // cheaper one — shopper-friendly default.
      const existing = byId.get(id);
      if (!existing || rate < existing.rate) byId.set(id, { id, rate });
    }
  }
  if (byId.size === 0) return null;

  for (const id of sanitizeCourierIds(sr?.preferredCourierIds)) {
    const hit = byId.get(id);
    if (hit) return hit.rate;
  }
  // Same key as `pickCourierForOrder` uses elsewhere in this file — keep
  // them in lockstep so quote and ship-time selection match. Read both the
  // current and legacy field names.
  const recId = Number(srData?.recommended_courier_company_id ?? srData?.recommended_courier_id);
  if (Number.isFinite(recId) && recId > 0) {
    const hit = byId.get(recId);
    if (hit) return hit.rate;
  }
  // Cheapest-overall as the final fallback so we don't return null when
  // there's _some_ serviceable courier — the shopper still gets a quote.
  let cheapest = Infinity;
  for (const { rate } of byId.values()) if (rate < cheapest) cheapest = rate;
  return Number.isFinite(cheapest) ? cheapest : null;
}

// Compute the dynamic shipping quote a checkout/order should charge.
// Returns a number ≥ 0 when all gates are satisfied, otherwise null so the
// caller falls back to the static delivery config. Never throws.
function computeDynamicShippingFee(srData, sr) {
  if (!sr?.dynamicShippingEnabled) return null;
  // Manual courier mode means we cannot commit to a courier (or its rate)
  // until the merchant picks per-order — quoting now would be a lie.
  if (sr?.courierPickMode === 'manual') return null;
  const baseRate = pickQuotableRate(srData, sr);
  if (baseRate == null) return null;
  return applyMarkup(baseRate, sr);
}

async function handlePublicServiceability(request, env, siteId, reqCtx) {
  const url = new URL(request.url);
  const deliveryPincode = (url.searchParams.get('pincode') || '').trim();
  const itemsRaw = (url.searchParams.get('items') || '').trim();
  const codRequested = url.searchParams.get('cod') === '1';

  if (!/^\d{6}$/.test(deliveryPincode)) {
    return errorResponse('Valid 6-digit Indian pincode required', 400, 'BAD_PINCODE');
  }
  if (!itemsRaw) {
    return errorResponse('items query parameter required (format: pid:qty,pid:qty)', 400, 'NO_ITEMS');
  }

  // Parse "pid:qty,pid:qty" — cap at 50 distinct entries and clamp each
  // line's quantity to a sane upper bound to prevent the public endpoint
  // from being abused as a cache-key buster against the merchant's
  // Shiprocket quota.
  const parsedItems = [];
  const seenIds = new Set();
  for (const piece of itemsRaw.split(',').slice(0, 50)) {
    const [pid, qtyStr] = piece.split(':');
    const id = String(pid || '').trim();
    const rawQty = Math.floor(Number(qtyStr));
    if (!id || !Number.isFinite(rawQty) || rawQty <= 0) continue;
    // De-dupe a productId appearing multiple times by summing its quantities,
    // then clamp. This prevents `items=p1:1,p1:1,p1:1,...` from minting
    // unique cache keys per repetition.
    const qty = Math.min(rawQty, SERVICEABILITY_MAX_QTY_PER_ITEM);
    if (seenIds.has(id)) {
      const existing = parsedItems.find((x) => x.productId === id);
      existing.quantity = Math.min(existing.quantity + qty, SERVICEABILITY_MAX_QTY_PER_ITEM);
    } else {
      seenIds.add(id);
      parsedItems.push({ productId: id, quantity: qty });
    }
  }
  if (parsedItems.length === 0) {
    return errorResponse('items must contain at least one valid pid:qty entry', 400, 'NO_ITEMS');
  }

  let ctx;
  try { ctx = await readShiprocketSettings(env, siteId); }
  catch (e) { return errorResponse(`Site lookup failed: ${e.message || e}`, 500, 'SITE_LOOKUP_FAILED'); }
  if (!ctx) return errorResponse('Site not found', 404, 'SITE_NOT_FOUND');

  // Read merchant COD setting from the same settings JSON we already loaded.
  // Default-true matches the storefront default.
  const merchantCodEnabled = ctx.settings?.codEnabled !== false;

  if (!ctx.sr?.enabled || !ctx.sr?.emailEncrypted) {
    return successResponse({
      ok: true,
      serviceable: false,
      etaMinDays: null,
      etaMaxDays: null,
      codAvailable: false,
      courierCount: 0,
      reason: 'NOT_CONFIGURED',
    });
  }

  const pickupPincode = await resolvePickupPincode(env, siteId, ctx);
  if (!pickupPincode) {
    return successResponse({
      ok: true,
      serviceable: false,
      etaMinDays: null,
      etaMaxDays: null,
      codAvailable: false,
      courierCount: 0,
      reason: 'NO_PICKUP_LOCATION',
    });
  }

  // Sum weights from the live products table. Refuse to estimate if any
  // cart product is missing a weight — accurate estimates require accurate
  // input, and Phase 1 already enforces weight at order placement.
  const weightMap = await loadProductWeightsG(env, siteId, parsedItems.map((i) => i.productId));
  let totalG = 0;
  for (const it of parsedItems) {
    const w = weightMap.get(String(it.productId));
    if (!w) {
      return successResponse({
        ok: true,
        serviceable: false,
        etaMinDays: null,
        etaMaxDays: null,
        codAvailable: false,
        courierCount: 0,
        reason: 'MISSING_WEIGHT',
      });
    }
    totalG += w * it.quantity;
  }
  const totalKg = Math.max(0.01, Number((totalG / 1000).toFixed(3)));

  // Reject implausibly large parcels — anything over the cap is almost
  // certainly an attempt to mint unique cache keys to bust the cache.
  if (totalKg > SERVICEABILITY_MAX_TOTAL_WEIGHT_KG) {
    return successResponse({
      ok: true,
      serviceable: false,
      etaMinDays: null,
      etaMaxDays: null,
      codAvailable: false,
      courierCount: 0,
      reason: 'WEIGHT_EXCEEDS_MAX',
    });
  }

  // Edge-cache the upstream response. Key includes everything that affects
  // the answer; `cod=1` and `cod=0` are cached separately because Shiprocket
  // returns a different courier list when filtering for COD-supporting ones.
  const cacheKeyStr =
    `https://flomerce-cache.invalid/srv?site=${encodeURIComponent(siteId)}&p=${pickupPincode}&d=${deliveryPincode}&w=${totalKg}&cod=${codRequested ? 1 : 0}`;
  const cacheKey = new Request(cacheKeyStr, { method: 'GET' });
  const cache = caches.default;
  let srData = null;
  let cacheHit = false;
  try {
    const cached = await cache.match(cacheKey);
    if (cached) {
      srData = await cached.json();
      cacheHit = true;
    }
  } catch (e) {
    console.warn('Serviceability cache read failed:', e?.message || e);
  }

  if (!srData) {
    // Coalesce concurrent identical requests within this isolate so we
    // make exactly one Shiprocket call per (cache-key) tuple instead of N.
    let inflight = INFLIGHT_SERVICEABILITY.get(cacheKeyStr);
    if (!inflight) {
      inflight = (async () => {
        try {
          const resp = await srCall(env, siteId, ctx.sr, (t) => getServiceability(t, {
            pickup_postcode: pickupPincode,
            delivery_postcode: deliveryPincode,
            weight: totalKg,
            cod: codRequested ? 1 : 0,
          }));
          return { reason: null, srData: resp?.data || resp || {} };
        } catch (e) {
          if (e instanceof ShiprocketError && (e.code === 'SHIPROCKET_AUTH' || e.code === 'NOT_CONNECTED')) {
            return { reason: 'AUTH_FAILED', srData: null };
          }
          console.warn('Shiprocket serviceability call failed:', e?.message || e);
          return { reason: 'UPSTREAM_ERROR', srData: null };
        }
      })().finally(() => {
        // Clear the in-flight slot the moment the upstream call settles —
        // subsequent requests will use the now-warm cache, not coalesce on
        // a stale promise.
        INFLIGHT_SERVICEABILITY.delete(cacheKeyStr);
      });
      setInflightServiceability(cacheKeyStr, inflight);
    }
    const { reason, srData: fetched } = await inflight;
    if (reason) {
      return successResponse({
        ok: true,
        serviceable: false,
        etaMinDays: null,
        etaMaxDays: null,
        codAvailable: false,
        courierCount: 0,
        reason,
      });
    }
    srData = fetched;

    // Use waitUntil so the cache write doesn't add latency to the response.
    // Falls back to a fire-and-forget Promise if no execution context was
    // threaded in (defensive — handleShipping always passes ctx today).
    const writeP = (async () => {
      try {
        await cache.put(cacheKey, new Response(JSON.stringify(srData), {
          headers: {
            'content-type': 'application/json',
            'cache-control': `public, max-age=${SERVICEABILITY_CACHE_TTL_S}`,
          },
        }));
      } catch (e) {
        console.warn('Serviceability cache write failed:', e?.message || e);
      }
    })();
    if (reqCtx?.waitUntil) reqCtx.waitUntil(writeP);
  }

  const view = aggregateServiceability(srData, merchantCodEnabled);
  // Phase 4: dynamic shipping quote. Computed off the same `srData` we just
  // resolved (live or cached) so it always matches the ETA/COD signals on
  // the same response. Returns `null` when any gate fails — the storefront
  // then falls back to the static delivery config.
  const dynamicShippingFee = view.serviceable ? computeDynamicShippingFee(srData, ctx.sr) : null;
  // Phase 5: HMAC-signed quote. The buyer's cart shows `dynamicShippingFee`
  // and posts back the matching `signedQuote` at checkout — orders-worker
  // verifies the signature + 5-minute freshness before charging it. If the
  // sig is missing/stale/tampered, orders-worker falls back to a fresh
  // server-side quote so we never charge less than the true rate.
  let signedQuote = null;
  if (dynamicShippingFee != null) {
    try {
      signedQuote = await signShippingQuote(env, siteId, {
        rate: dynamicShippingFee,
        pickupPincode,
        deliveryPincode,
        weightKg: totalKg,
        codRequested: !!codRequested,
      });
    } catch (e) {
      console.warn('[Shipping] signShippingQuote failed:', e?.message || e);
    }
  }
  return successResponse({
    ok: true,
    ...view,
    pickupPincode,
    deliveryPincode,
    weightKg: totalKg,
    cached: cacheHit,
    dynamicShippingFee,
    signedQuote,
  });
}

// ---------- Quote signing (T11) ----------
//
// Per-site HMAC over the shipping quote so the buyer's cart can show the
// dynamic rate AND have orders-worker trust that exact rate at checkout
// without re-running serviceability. Domain-separated by siteId so a leaked
// signature from site A can't be replayed on site B.
//
// Signed payload includes the pickup/delivery/weight/cod context so an
// attacker can't take a quote signed for one cart and re-use it on a heavier
// cart with the same rate (the verify-side recomputes the cart context and
// requires it to match exactly).
const QUOTE_TTL_SECONDS = 5 * 60;

async function _quoteSecret(env, siteId) {
  const base = String(env?.SHIPPING_QUOTE_SECRET || env?.SHIPROCKET_QUOTE_SECRET || 'flomerce-quote-v1');
  return `${base}:${siteId}`;
}

export async function signShippingQuote(env, siteId, payload) {
  const exp = Math.floor(Date.now() / 1000) + QUOTE_TTL_SECONDS;
  const body = {
    rate: Number(payload.rate),
    pickupPincode: String(payload.pickupPincode || ''),
    deliveryPincode: String(payload.deliveryPincode || ''),
    weightKg: Number(payload.weightKg) || 0,
    codRequested: !!payload.codRequested,
    exp,
  };
  const secret = await _quoteSecret(env, siteId);
  // Stable JSON ordering — sign exactly the bytes we send so verify can
  // reproduce them deterministically.
  const data = JSON.stringify(body);
  const sig = await hmacSha256B64u(secret, data);
  return { ...body, sig };
}

// Verify a signed quote sent by the buyer at checkout. Returns the trusted
// `rate` (in INR rupees) on success, or `null` on any failure (missing,
// stale, tampered, or context mismatch). The caller MUST re-quote the rate
// when null is returned — never silently free-shipping.
export async function verifyShippingQuote(env, siteId, quote, context) {
  if (!quote || typeof quote !== 'object') return null;
  const sig = String(quote.sig || '');
  if (!sig) return null;
  const exp = Number(quote.exp);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
  const rate = Number(quote.rate);
  if (!Number.isFinite(rate) || rate < 0) return null;

  // Context must match what the buyer's cart originally signed: the same
  // pickup/delivery pincodes, the same weight (within rounding), and the
  // same COD flag. A different cart can't use the same signature.
  const ctxPickup = String(context.pickupPincode || '');
  const ctxDelivery = String(context.deliveryPincode || '');
  const ctxWeight = Number(context.weightKg) || 0;
  const ctxCod = !!context.codRequested;
  if (String(quote.pickupPincode || '') !== ctxPickup) return null;
  if (String(quote.deliveryPincode || '') !== ctxDelivery) return null;
  // Weight tolerance: accept ±5g / 0.005 kg to absorb floating-point round-trip.
  if (Math.abs(Number(quote.weightKg || 0) - ctxWeight) > 0.005) return null;
  if (!!quote.codRequested !== ctxCod) return null;

  const body = {
    rate,
    pickupPincode: String(quote.pickupPincode || ''),
    deliveryPincode: String(quote.deliveryPincode || ''),
    weightKg: Number(quote.weightKg) || 0,
    codRequested: !!quote.codRequested,
    exp,
  };
  const secret = await _quoteSecret(env, siteId);
  const data = JSON.stringify(body);
  const expected = await hmacSha256B64u(secret, data);
  if (!constantTimeEqual(sig, expected)) return null;
  return rate;
}

// ---------- Top-level dispatcher (mixed public + admin) ----------

export async function handleShipping(request, env, path, ctx) {
  const url = new URL(request.url);
  const parts = path.split('/').filter(Boolean); // ['api', 'shipping', ...]
  const action = parts[2];
  const method = request.method;

  if (method === 'OPTIONS') return new Response(null, { status: 204 });

  const siteId = url.searchParams.get('siteId');
  if (!siteId) return errorResponse('siteId is required', 400, 'MISSING_SITE_ID');

  // Public route — checked BEFORE admin auth so customers (not logged into
  // the admin panel) can call it from cart/checkout. Thread `ctx` so the
  // handler can use ctx.waitUntil(...) for non-blocking edge-cache writes.
  if (action === 'serviceability' && method === 'GET') {
    try {
      return await handlePublicServiceability(request, env, siteId, ctx);
    } catch (e) {
      console.error('Serviceability error:', e);
      return errorResponse(`Serviceability error: ${e.message || 'Unknown'}`, 500);
    }
  }

  const admin = await validateSiteAdmin(request, env, siteId);
  if (!admin) return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');

  try {
    // Older shards don't have the shiprocket_* columns on orders/guest_orders.
    // Run the lazy migration once per worker before any handler that might
    // SELECT/UPDATE those columns (Ship Now, cancel, label, track, ...).
    // Cheap no-op after the first hit thanks to the in-memory cache.
    try {
      const siteDBForMigration = await resolveSiteDBById(env, siteId);
      await ensureShiprocketColumns(siteDBForMigration, `shiprocket-cols:${siteId}`);
    } catch (migErr) {
      console.error('ensureShiprocketColumns (admin) failed:', migErr?.message || migErr);
    }

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
    if (action === 'webhook' && parts[3] === 'rotate' && method === 'POST') {
      // Admin-only token rotation. Returns the new token once for paste-back
      // into Shiprocket's webhook config; never returned again after that.
      if (!hasPermission(admin, 'settings')) return errorResponse('Forbidden: settings permission required', 403, 'FORBIDDEN');
      return await handleRotateWebhookToken(env, siteId);
    }
    if (action === 'couriers' && method === 'GET') {
      // Full courier list for the Settings → Shipping preference picker.
      // Gated by the same permission as the rest of Settings.
      if (!hasPermission(admin, 'settings')) return errorResponse('Forbidden: settings permission required', 403, 'FORBIDDEN');
      return await handleListAllCouriers(env, siteId);
    }
    if (action === 'orders' && parts[3]) {
      if (!hasPermission(admin, 'orders')) return errorResponse('Forbidden: orders permission required', 403, 'FORBIDDEN');
      const orderId = parts[3];
      const op = parts[4];
      if (op === 'ship' && method === 'POST') return await handleShipNow(request, env, siteId, orderId);
      if (op === 'couriers' && method === 'GET') return await handleListServiceableCouriers(env, siteId, orderId);
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

// ---------- Webhook status mapping ----------
//
// Shiprocket exposes a stable numeric `current_status_id` (well-known IDs
// from their API docs) plus a free-text `current_status` label. The numeric
// ID is the source of truth — text labels drift across account types and
// localizations. Map by ID first, fall back to text-pattern when missing.
//
// The map returns `{ orderStatus, group }`:
//   - `orderStatus` is the value we stamp onto the `status` column for the
//     buyer-facing order — only set for transitions buyers care about
//     (shipped / delivered). Leave null for internal/back-office events
//     (manifest, NDR, RTO, lost, damaged) so the merchant sees the rich
//     `shiprocket_status` text without the order moving in the buyer's
//     order list.
//   - `group` is a coarse category used for the dedupe key + observability.
const SHIPROCKET_STATUS_BY_ID = {
  1:  { orderStatus: null,        group: 'new' },
  2:  { orderStatus: null,        group: 'awb_assigned' },
  3:  { orderStatus: null,        group: 'label_generated' },
  4:  { orderStatus: null,        group: 'pickup_scheduled' },
  5:  { orderStatus: null,        group: 'pickup_queued' },
  6:  { orderStatus: 'shipped',   group: 'in_transit' },
  7:  { orderStatus: 'delivered', group: 'delivered' },
  8:  { orderStatus: null,        group: 'cancelled' },
  9:  { orderStatus: 'shipped',   group: 'picked_up' },
  10: { orderStatus: 'shipped',   group: 'out_for_delivery' },
  11: { orderStatus: null,        group: 'ndr' },
  12: { orderStatus: null,        group: 'rto_initiated' },
  13: { orderStatus: null,        group: 'rto_delivered' },
  14: { orderStatus: null,        group: 'lost' },
  15: { orderStatus: null,        group: 'damaged' },
  17: { orderStatus: null,        group: 'out_for_pickup' },
  18: { orderStatus: null,        group: 'pickup_generated' },
  19: { orderStatus: null,        group: 'manifest_generated' },
  21: { orderStatus: null,        group: 'undelivered' },
  22: { orderStatus: null,        group: 'pickup_rescheduled' },
  24: { orderStatus: 'shipped',   group: 'in_transit' },
  27: { orderStatus: 'shipped',   group: 'reached_destination_hub' },
  38: { orderStatus: null,        group: 'rto_in_transit' },
  39: { orderStatus: null,        group: 'rto_out_for_delivery' },
  42: { orderStatus: null,        group: 'pickup_error' },
};

function mapShiprocketStatus(statusId, statusText) {
  const idNum = Number(statusId);
  if (Number.isFinite(idNum) && SHIPROCKET_STATUS_BY_ID[idNum]) {
    return { ...SHIPROCKET_STATUS_BY_ID[idNum], statusId: idNum };
  }
  // Text fallback for older webhooks or accounts that omit current_status_id.
  const sl = String(statusText || '').toLowerCase();
  if (/(delivered)/.test(sl) && !/rto|undeliv|not.?deliv/.test(sl)) {
    return { orderStatus: 'delivered', group: 'delivered', statusId: null };
  }
  if (/(out.?for.?delivery)/.test(sl)) {
    return { orderStatus: 'shipped', group: 'out_for_delivery', statusId: null };
  }
  if (/(in.?transit|shipped|picked.?up|reached)/.test(sl)) {
    return { orderStatus: 'shipped', group: 'in_transit', statusId: null };
  }
  if (/(pickup.?scheduled|pickup.?generated|pickup.?completed|out.?for.?pickup)/.test(sl)) {
    return { orderStatus: null, group: 'pickup', statusId: null };
  }
  if (/(manifest)/.test(sl)) {
    return { orderStatus: null, group: 'manifest_generated', statusId: null };
  }
  if (/(ndr|undeliv)/.test(sl)) {
    return { orderStatus: null, group: 'ndr', statusId: null };
  }
  if (/(rto|return)/.test(sl)) {
    return { orderStatus: null, group: 'rto', statusId: null };
  }
  if (/(cancell?ed)/.test(sl)) {
    return { orderStatus: null, group: 'cancelled', statusId: null };
  }
  if (/(lost)/.test(sl)) {
    return { orderStatus: null, group: 'lost', statusId: null };
  }
  if (/(damaged)/.test(sl)) {
    return { orderStatus: null, group: 'damaged', statusId: null };
  }
  return { orderStatus: null, group: 'unknown', statusId: null };
}

// ---------- Webhook dispatcher ----------
// Path: /api/webhooks/tracking/:siteId   (canonical — surfaced to merchants)
//       /api/webhooks/shiprocket/:siteId (legacy alias, kept for backward compat)
// We do NOT advertise the legacy path because Shiprocket's dashboard rejects
// any URL containing the substrings "shiprocket", "kartrocket", "sr" or "kr"
// (per apidocs.shiprocket.in). Both paths route here via index.js.
// Auth: X-Api-Key header must match site_config.settings.shiprocket.webhookToken.

export async function handleShiprocketWebhook(request, env, path) {
  // Shiprocket's webhook config screen sends a GET probe to the URL when the
  // merchant clicks Save / Test Webhook and requires a 2xx to consider the URL
  // valid. Answer GET/HEAD on this route with a generic OK so the probe
  // succeeds for any well-formed webhook URL — without revealing whether the
  // siteId exists or leaking the token. Real delivery still goes through POST
  // below, fully authenticated.
  if (request.method === 'GET' || request.method === 'HEAD') {
    // Some webhook validators (Shiprocket included) parse the response body
    // and look for a success-shaped JSON like {"status":"success"} — return
    // that exact shape so it works across providers without leaking
    // internals like the service name or whether the siteId exists.
    const body = request.method === 'HEAD'
      ? null
      : JSON.stringify({ status: 'success' });
    return new Response(body, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405);

  const parts = path.split('/').filter(Boolean); // ['api','webhooks','shiprocket', siteId]
  const siteId = parts[3];
  if (!siteId) return errorResponse('siteId missing in path', 400, 'MISSING_SITE_ID');

  // Shiprocket's "Save / Test Webhook" button in the merchant dashboard sends
  // a POST to validate the URL and only checks for a 2xx response — the
  // X-Api-Key header is *not* attached on that probe (the merchant may not
  // have entered the token yet, and Shiprocket's validator runs before the
  // delivery layer that signs requests). If we 401 the probe, Shiprocket
  // shows "Please check your endpoint, unable to send request to mentioned
  // api" and the merchant can't save the webhook at all.
  //
  // Treat any POST that arrives without an X-Api-Key header as a probe and
  // ack with 200. Real webhook deliveries from Shiprocket always carry the
  // X-Api-Key, so they fall through to the authenticated path below. This is
  // safe: probes don't read or write any DB rows and don't leak whether the
  // siteId exists.
  const provided = String(request.headers.get('X-Api-Key') || request.headers.get('x-api-key') || '');
  if (!provided) {
    return new Response(JSON.stringify({ status: 'success' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let ctx;
  try {
    ctx = await readShiprocketSettings(env, siteId);
  } catch (e) {
    return errorResponse('Site not found', 404, 'SITE_NOT_FOUND');
  }
  if (!ctx) return errorResponse('Site not found', 404, 'SITE_NOT_FOUND');

  const expectedToken = String(ctx.sr?.webhookToken || '');
  // Constant-time compare so an attacker can't time-attack the token byte by
  // byte. `constantTimeEqual` short-circuits when lengths differ but does so
  // *before* iterating, which is fine — token length is public knowledge in
  // every webhook system anyway.
  if (!expectedToken || !constantTimeEqual(provided, expectedToken)) {
    return errorResponse('Invalid webhook token', 401, 'BAD_WEBHOOK_TOKEN');
  }

  // Older shards predate the shiprocket_* columns and the SELECTs below
  // would otherwise throw, crashing the worker (Cloudflare error 1101) and
  // making it look like the webhook URL is broken to Shiprocket. Add the
  // columns lazily and once-per-shard.
  try {
    await ensureShiprocketColumns(ctx.siteDB, `shiprocket-cols:${siteId}`);
  } catch (e) {
    console.error('ensureShiprocketColumns failed:', e?.message || e);
  }

  let payload;
  try { payload = await request.json(); } catch { return errorResponse('Invalid JSON', 400); }

  // Wrap the entire processing block in try/catch so any unexpected
  // downstream failure (DB schema drift, malformed Shiprocket payload, etc.)
  // returns a clean 200 OK instead of a Worker exception. Shiprocket retries
  // 5xx forever and shows the merchant an "endpoint broken" error, so a 200
  // with `{ok:true,ignored}` is strictly better than letting the exception
  // bubble up.
  try {
    return await processShiprocketWebhookPayload(env, ctx, siteId, payload);
  } catch (e) {
    console.error('shiprocket webhook processing error:', e?.message || e, e?.stack);
    return successResponse({ ok: true, ignored: 'processing_error' });
  }
}

async function processShiprocketWebhookPayload(env, ctx, siteId, payload) {

  // Shiprocket webhook payload typically contains awb, current_status,
  // current_status_id (numeric — preferred), order_id (the merchant's
  // order_id we sent), and current_timestamp.
  const awb = String(payload.awb || payload.awb_code || '').trim();
  const merchantOrderId = String(payload.order_id || payload.merchant_order_id || '').trim();
  const currentStatus = String(payload.current_status || payload.status || '').trim();
  const currentStatusIdRaw = payload.current_status_id ?? payload.shipment_status_id ?? null;
  const eventTimeRaw = payload.current_timestamp || payload.event_time || new Date().toISOString();
  // Parse to numeric epoch in IST so out-of-order webhooks (which arrive with
  // identical text labels but earlier timestamps) are correctly suppressed
  // and "newer wins" comparisons don't collapse on string-sorting quirks
  // (e.g. "26 04 2026 09:00:00" sorts before "ISO 2026-04-26T09:00:00Z").
  const eventEpochMs = parseShiprocketTimestamp(eventTimeRaw);
  // Fall back to wall-clock when Shiprocket sends an unparseable timestamp
  // (very rare — they've sent us at least one bad payload), so the dedupe
  // key still has a usable monotonic component.
  const eventEpoch = Number.isFinite(eventEpochMs) ? eventEpochMs : Date.now();

  if (!awb && !merchantOrderId) {
    return errorResponse('Webhook missing awb and order_id', 400, 'MISSING_IDENTIFIER');
  }

  const { siteDB } = ctx;
  // buildShiprocketOrderPayload prefixes order_id with an 8-char hex site
  // slice + '-' for collision-safety. Shiprocket echoes that value back in
  // webhooks, so when matching by merchant order_id we need to try both the
  // exact value (for orders shipped before the prefix was introduced) and
  // the stripped suffix (the real order_number).
  const stripSitePrefix = (id) => {
    const m = String(id || '').match(/^[a-f0-9]{8}-(.+)$/i);
    return m ? m[1] : null;
  };
  const findInTable = async (table) => {
    if (awb) {
      const row = await siteDB.prepare(`SELECT id, status, shiprocket_last_event_at FROM ${table} WHERE site_id = ? AND shiprocket_awb = ? LIMIT 1`).bind(siteId, awb).first();
      if (row) return { row, table };
    }
    if (merchantOrderId) {
      let row = await siteDB.prepare(`SELECT id, status, shiprocket_last_event_at FROM ${table} WHERE site_id = ? AND order_number = ? LIMIT 1`).bind(siteId, merchantOrderId).first();
      if (!row) {
        const stripped = stripSitePrefix(merchantOrderId);
        if (stripped) {
          row = await siteDB.prepare(`SELECT id, status, shiprocket_last_event_at FROM ${table} WHERE site_id = ? AND order_number = ? LIMIT 1`).bind(siteId, stripped).first();
        }
      }
      if (!row) {
        // Last-resort: Shiprocket's own numeric order id (we store it on the row).
        row = await siteDB.prepare(`SELECT id, status, shiprocket_last_event_at FROM ${table} WHERE site_id = ? AND shiprocket_order_id = ? LIMIT 1`).bind(siteId, merchantOrderId).first();
      }
      if (row) return { row, table };
    }
    return null;
  };

  const found = (await findInTable('orders')) || (await findInTable('guest_orders'));
  if (!found) {
    // Return 200 OK so Shiprocket stops retrying. The order genuinely doesn't
    // exist on our side (test webhooks, deleted orders, or webhooks meant for
    // a different account routed to ours by mistake) — retrying won't help
    // and the retry storm just wastes both sides' compute.
    return successResponse({ ok: true, ignored: 'order_not_found' });
  }

  const { row, table } = found;

  // Map status (prefer numeric ID, fall back to text).
  const mapped = mapShiprocketStatus(currentStatusIdRaw, currentStatus);

  // Store the dedupe key as `<status_group>:<epoch_ms>` — newer events
  // overwrite older ones, and a stale repeat of the same `<group, epoch>`
  // pair short-circuits without writing.
  const dedupeKey = `${mapped.group}:${eventEpoch}`;
  // Idempotency-gated update of the shiprocket_* meta columns. The compare
  // is on the stored `shiprocket_last_event_at` (which is the dedupe key).
  // Since the key embeds epoch ms, lexicographic SQLite text comparison
  // sorts correctly within the same group; cross-group transitions don't
  // need ordering — they're driven by Shiprocket's monotonic timeline.
  const metaUpdate = await siteDB.prepare(
    `UPDATE ${table}
        SET shiprocket_status = ?,
            shiprocket_last_event_at = ?,
            updated_at = datetime('now')
      WHERE id = ?
        AND (shiprocket_last_event_at IS NULL
             OR shiprocket_last_event_at < ?
             OR shiprocket_last_event_at NOT LIKE ?)`
  ).bind(currentStatus || mapped.group, dedupeKey, row.id, dedupeKey, `${mapped.group}:%`).run();

  if (!metaUpdate.meta?.changes) {
    return successResponse({ ok: true, deduped: true });
  }

  // Conditional status flip — only fires when this caller actually changes
  // the buyer-visible `status` column. `meta.changes === 1` here means THIS
  // caller flipped status, so it owns the customer notification (no risk of
  // two concurrent webhooks both emailing the customer for the same
  // transition).
  const newStatus = mapped.orderStatus;
  let didFlip = false;
  if (newStatus) {
    let stmt;
    if (newStatus === 'shipped') {
      // BUG FIX: also exclude 'refunded' so a delayed Shiprocket shipped/
      // in-transit webhook can't resurrect a refunded order back to
      // 'shipped' (which would re-trigger a "your order is on its way"
      // notification to a buyer who already got their money back).
      stmt = siteDB.prepare(
        `UPDATE ${table}
            SET status = ?, shipped_at = COALESCE(shipped_at, datetime('now'))
          WHERE id = ? AND status != ? AND status NOT IN ('delivered', 'cancelled', 'refunded')`
      ).bind(newStatus, row.id, newStatus);
    } else if (newStatus === 'delivered') {
      // BUG FIX: previously this UPDATE had no terminal-state guard, so a
      // late `delivered` webhook for a cancelled/refunded order would flip
      // status back to 'delivered' and email the customer "your order has
      // been delivered" after we'd already cancelled & refunded them.
      stmt = siteDB.prepare(
        `UPDATE ${table}
            SET status = ?, delivered_at = COALESCE(delivered_at, datetime('now'))
          WHERE id = ? AND status != ? AND status NOT IN ('cancelled', 'refunded')`
      ).bind(newStatus, row.id, newStatus);
    } else {
      stmt = siteDB.prepare(
        `UPDATE ${table} SET status = ? WHERE id = ? AND status != ? AND status NOT IN ('cancelled', 'refunded')`
      ).bind(newStatus, row.id, newStatus);
    }
    const flipRes = await stmt.run();
    didFlip = (flipRes.meta?.changes || 0) === 1;
  }

  if (didFlip) {
    try {
      await sendShiprocketStatusNotification(env, siteId, row.id, newStatus, table);
    } catch (e) {
      console.warn('[Shiprocket webhook] notification trigger failed:', e.message || e);
    }
  }

  return successResponse({
    ok: true,
    newStatus,
    shiprocketStatus: currentStatus,
    statusGroup: mapped.group,
    flipped: didFlip,
  });
}

// ---------- Endpoint: rotate webhook token ----------
//
// Generates a fresh webhook token, persists it into settings, and returns it
// once to the admin. The merchant must paste the new token back into
// Shiprocket's "Webhook Token" field within the dashboard. Old token stops
// working immediately on rotation.
async function handleRotateWebhookToken(env, siteId) {
  const ctx = await readShiprocketSettings(env, siteId);
  if (!ctx) return errorResponse('Site not found', 404);
  if (!ctx.sr?.emailEncrypted) return errorResponse('Shiprocket not connected', 400, 'NOT_CONNECTED');

  const newToken = generateToken(48);
  await writeShiprocketSettings(env, siteId, (sr) => ({
    ...sr,
    webhookToken: newToken,
  }));

  return successResponse({
    webhookToken: newToken,
    message: 'New token generated. Paste it into Shiprocket → Settings → Webhooks. The previous token stops working immediately.',
  });
}

// ---------- Phase 4: server-side quote (used by orders-worker.createOrder) ----------

// Quote a dynamic shipping fee for an order being placed. Returns a
// non-negative number when all gates succeed, otherwise `null` so the
// caller silently falls back to the static `deliveryConfig`-derived cost.
//
// Design contract:
//   - NEVER throws. Network/auth/serviceability failures all return null.
//   - Fail-closed on any signal we can't trust: missing pincode, missing
//     weight, manual courier mode, opt-out, Shiprocket disabled.
//   - Honors the same preference chain as the customer-facing storefront
//     quote (preferred → recommended → cheapest), so the price the buyer
//     was shown will match what we charge here.
//   - Reuses the same edge cache (`caches.default`) as the public
//     serviceability endpoint when warm — same key shape (`/srv?...`).
//
// Args:
//   env, siteId — standard.
//   order: { processedItems, shippingAddress, paymentMethod }
//     - processedItems entries must include `weight` (grams) — Phase 1
//       enforces this at order placement when Shiprocket is on.
//     - shippingAddress.pincode (or .zip) must be a 6-digit Indian PIN.
//     - paymentMethod === 'cod' filters to COD-supporting couriers.
export async function quoteDynamicShipping(env, siteId, order) {
  try {
    if (!order || !Array.isArray(order.processedItems) || order.processedItems.length === 0) return null;

    const ctx = await readShiprocketSettings(env, siteId);
    if (!ctx) return null;
    const sr = ctx.sr || {};

    // Gates: Shiprocket on, opted-in, auto-mode, credentials present.
    if (!sr.enabled) return null;
    if (!sr.dynamicShippingEnabled) return null;
    if (sr.courierPickMode === 'manual') return null;
    if (!sr.emailEncrypted) return null;

    // Delivery pincode — accept any of the field names the storefront and
    // admin paths use (Checkout sends `pinCode` camelCase; older paths use
    // `pincode`/`zip`/`postalCode`/`pin`). Pick the first defined one.
    const addr = order.shippingAddress || {};
    const rawPin = addr.pinCode ?? addr.pincode ?? addr.postalCode ?? addr.pin ?? addr.zip ?? '';
    const deliveryPincode = String(rawPin).trim();
    if (!/^\d{6}$/.test(deliveryPincode)) return null;

    const pickupPincode = await resolvePickupPincode(env, siteId, ctx);
    if (!pickupPincode) return null;

    // Sum weights — every line must carry one. processedItems already had
    // weight enforced by Phase 1 when Shiprocket is enabled; bail if any
    // is missing rather than under-quote.
    let totalG = 0;
    for (const it of order.processedItems) {
      const w = Number(it?.weight);
      const q = Number(it?.quantity);
      if (!Number.isFinite(w) || w <= 0) return null;
      if (!Number.isFinite(q) || q <= 0) return null;
      totalG += w * q;
    }
    const totalKg = Math.max(0.01, Number((totalG / 1000).toFixed(3)));
    if (totalKg > SERVICEABILITY_MAX_TOTAL_WEIGHT_KG) return null;

    const codRequested = order.paymentMethod === 'cod';

    // T11: if the buyer presented a signed quote (issued earlier by the
    // public serviceability endpoint), trust it when valid. The verify
    // function returns the signed `rate` only when ALL of (sig fresh,
    // pickup/delivery/weight/cod context match) pass — otherwise null and
    // we fall through to a fresh server-side quote. Never silently free.
    if (order.signedQuote && typeof order.signedQuote === 'object') {
      try {
        const verified = await verifyShippingQuote(env, siteId, order.signedQuote, {
          pickupPincode,
          deliveryPincode,
          weightKg: totalKg,
          codRequested,
        });
        if (verified != null) return verified;
      } catch (e) {
        console.warn('[quoteDynamicShipping] verifyShippingQuote failed (will re-quote):', e?.message || e);
      }
    }

    // Same cache-key shape as handlePublicServiceability so we get free
    // hits when the storefront just queried the same route.
    const cacheKeyStr =
      `https://flomerce-cache.invalid/srv?site=${encodeURIComponent(siteId)}&p=${pickupPincode}&d=${deliveryPincode}&w=${totalKg}&cod=${codRequested ? 1 : 0}`;
    const cacheKey = new Request(cacheKeyStr, { method: 'GET' });
    const cache = caches.default;

    let srData = null;
    try {
      const cached = await cache.match(cacheKey);
      if (cached) srData = await cached.json();
    } catch (e) {
      console.warn('[quoteDynamicShipping] cache read failed:', e?.message || e);
    }

    if (!srData) {
      try {
        const resp = await srCall(env, siteId, sr, (t) => getServiceability(t, {
          pickup_postcode: pickupPincode,
          delivery_postcode: deliveryPincode,
          weight: totalKg,
          cod: codRequested ? 1 : 0,
        }));
        srData = resp?.data || resp || {};
      } catch (e) {
        console.warn('[quoteDynamicShipping] serviceability fetch failed:', e?.message || e);
        return null;
      }
      // Warm the cache for the next hit (best-effort, fire-and-forget).
      try {
        cache.put(cacheKey, new Response(JSON.stringify(srData), {
          headers: {
            'content-type': 'application/json',
            'cache-control': `public, max-age=${SERVICEABILITY_CACHE_TTL_S}`,
          },
        })).catch(() => {});
      } catch {}
    }

    const fee = computeDynamicShippingFee(srData, sr);
    return (typeof fee === 'number' && Number.isFinite(fee) && fee >= 0) ? fee : null;
  } catch (e) {
    console.warn('[quoteDynamicShipping] unexpected error:', e?.message || e);
    return null;
  }
}
