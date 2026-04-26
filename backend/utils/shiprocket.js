// Shiprocket API client.
// Pure HTTP wrapper — no env / DB / encryption logic. Callers pass plaintext
// credentials (already decrypted upstream) and get back parsed JSON or a
// thrown ShiprocketError with { status, code, message, raw }.
//
// API docs: https://apiv2.shiprocket.in/v1/external

const BASE = 'https://apiv2.shiprocket.in/v1/external';

export class ShiprocketError extends Error {
  constructor(message, { status, code, raw } = {}) {
    super(message);
    this.name = 'ShiprocketError';
    this.status = status || 0;
    this.code = code || 'SHIPROCKET_ERROR';
    this.raw = raw;
  }
}

async function srFetch(token, path, opts = {}) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.headers) Object.assign(headers, opts.headers);

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: opts.method || 'GET',
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch (e) {
    throw new ShiprocketError(`Network error reaching Shiprocket: ${e.message || e}`, { code: 'NETWORK' });
  }

  let body = null;
  const text = await res.text();
  if (text) {
    try { body = JSON.parse(text); } catch { body = { raw: text }; }
  }

  if (!res.ok) {
    const msg = body?.message || body?.error || body?.errors || `Shiprocket HTTP ${res.status}`;
    let code = 'SHIPROCKET_ERROR';
    if (res.status === 401) code = 'SHIPROCKET_AUTH';
    else if (res.status === 403) code = 'SHIPROCKET_FORBIDDEN';
    else if (res.status === 404) code = 'SHIPROCKET_NOT_FOUND';
    else if (res.status === 422) code = 'SHIPROCKET_VALIDATION';
    else if (res.status >= 500) code = 'SHIPROCKET_UPSTREAM';
    throw new ShiprocketError(typeof msg === 'string' ? msg : JSON.stringify(msg), {
      status: res.status, code, raw: body,
    });
  }

  return body;
}

/**
 * Login with merchant Shiprocket credentials.
 * Returns { token, expires_in_days, first_name, last_name, email, company_id }
 */
export async function loginShiprocket(email, password) {
  if (!email || !password) {
    throw new ShiprocketError('Shiprocket email and password are required', { code: 'MISSING_CREDS' });
  }
  const body = await srFetch(null, '/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  if (!body?.token) {
    throw new ShiprocketError('Shiprocket login did not return a token', { code: 'SHIPROCKET_AUTH', raw: body });
  }
  return body;
}

/**
 * Get pickup locations registered on the merchant's Shiprocket account.
 * Returns array of pickup-location objects.
 */
export async function getPickupLocations(token) {
  const body = await srFetch(token, '/settings/company/pickup');
  // Shape: { data: { shipping_address: [...] } }
  const list = body?.data?.shipping_address || body?.shipping_address || [];
  return Array.isArray(list) ? list : [];
}

/**
 * Create a Shiprocket "Custom" order. payload should include order_id (ours),
 * order_date, pickup_location, billing/shipping fields, order_items, and
 * package weight + dimensions.
 *
 * Returns { order_id (shiprocket), shipment_id, status, status_code, ... }
 */
export async function createOrder(token, payload) {
  return srFetch(token, '/orders/create/adhoc', {
    method: 'POST',
    body: payload,
  });
}

/**
 * Check serviceability + recommended courier for a shipment.
 * params: { pickup_postcode, delivery_postcode, weight, cod, declared_value }
 * Returns the full data block; we typically pick recommended_courier_company_id
 * (Shiprocket's documented field name; the older alias `recommended_courier_id`
 * is read as a fallback for accounts still on the legacy response shape).
 *
 * Not currently called by the live ship flow (AWB is assigned with auto-pick),
 * but kept available for surfacing pre-shipment ETAs / serviceability checks
 * to merchants and buyers.
 */
export async function getServiceability(token, params) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null) continue;
    qs.set(k, String(v));
  }
  return srFetch(token, `/courier/serviceability/?${qs.toString()}`);
}

/**
 * Assign an AWB (waybill number) to a shipment, optionally for a specific courier.
 * Returns { awb_assign_status, response: { data: { awb_code, courier_name, ... } } }
 */
export async function assignAwb(token, shipmentId, courierId) {
  const body = { shipment_id: Number(shipmentId) };
  if (courierId) body.courier_id = Number(courierId);
  return srFetch(token, '/courier/assign/awb', {
    method: 'POST',
    body,
  });
}

/**
 * Schedule pickup for one or more shipment IDs.
 */
export async function generatePickup(token, shipmentIds) {
  const ids = Array.isArray(shipmentIds) ? shipmentIds : [shipmentIds];
  return srFetch(token, '/courier/generate/pickup', {
    method: 'POST',
    body: { shipment_id: ids.map(Number) },
  });
}

/**
 * Generate a shipping label PDF for one or more shipments.
 * Returns { label_created: 1, response: 'ok', label_url: '...' }
 */
export async function generateLabel(token, shipmentIds) {
  const ids = Array.isArray(shipmentIds) ? shipmentIds : [shipmentIds];
  return srFetch(token, '/courier/generate/label', {
    method: 'POST',
    body: { shipment_id: ids.map(Number) },
  });
}

/**
 * Track a shipment by AWB. Returns the live status payload.
 */
export async function trackShipment(token, awb) {
  return srFetch(token, `/courier/track/awb/${encodeURIComponent(awb)}`);
}

/**
 * Cancel one or more shipments by AWB.
 */
export async function cancelShipment(token, awbs) {
  const list = Array.isArray(awbs) ? awbs : [awbs];
  return srFetch(token, '/orders/cancel/shipment/awbs', {
    method: 'POST',
    body: { awbs: list },
  });
}

/**
 * Fetch the merchant's full courier list (everything they have enabled in
 * their Shiprocket panel — not just couriers serviceable for a specific
 * route). Used by the admin Settings UI to let the merchant build their
 * preferred-courier fallback chain.
 *
 * Returns an array of `{ id, name }`. Shiprocket's response shape varies
 * between accounts so we normalize defensively.
 */
export async function listAllCouriers(token) {
  const res = await srFetch(token, '/courier/courierListWithCounts');
  // Shiprocket returns either `{ courier_data: [...] }` or `{ data: { courier_data: [...] } }`
  // depending on account type. Normalize.
  const arr = Array.isArray(res?.courier_data)
    ? res.courier_data
    : Array.isArray(res?.data?.courier_data)
      ? res.data.courier_data
      : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
          ? res
          : [];
  const out = [];
  const seen = new Set();
  for (const c of arr) {
    const id = Number(c?.id ?? c?.courier_company_id ?? c?.courier_id);
    const name = String(c?.name ?? c?.courier_name ?? '').trim();
    if (!Number.isFinite(id) || id <= 0 || !name || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, name });
  }
  // Stable alphabetical order for predictable UI.
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

/**
 * Cancel a Shiprocket order (only valid before AWB assignment).
 */
export async function cancelOrder(token, shiprocketOrderIds) {
  const list = Array.isArray(shiprocketOrderIds) ? shiprocketOrderIds : [shiprocketOrderIds];
  return srFetch(token, '/orders/cancel', {
    method: 'POST',
    body: { ids: list.map(Number) },
  });
}

// ---------- Helpers (pure — no IO) ----------

/**
 * Constant-time string compare. Returns true iff `a` and `b` are the same
 * UTF-16 string. Length is intentionally compared first so we never iterate
 * past the shorter input — but the loop below ALWAYS runs to `len` so the
 * branch path doesn't leak which prefix matched. Used for webhook tokens.
 */
export function constantTimeEqual(a, b) {
  const sa = typeof a === 'string' ? a : '';
  const sb = typeof b === 'string' ? b : '';
  if (sa.length !== sb.length) return false;
  let diff = 0;
  for (let i = 0; i < sa.length; i++) {
    diff |= sa.charCodeAt(i) ^ sb.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Parse a Shiprocket webhook timestamp into milliseconds-since-epoch (UTC).
 * Shiprocket's `current_timestamp` field is documented as
 * `"DD MM YYYY HH:MM:SS"` (Indian Standard Time, UTC+5:30) but the platform
 * has historically also sent `"YYYY-MM-DD HH:MM:SS"` and full ISO-8601 in
 * different webhook generations. We normalise all three so the dedupe key
 * stays comparable regardless of the wire format.
 *
 * Returns `Number.NaN` when the input cannot be parsed — callers should
 * fall back to `Date.now()` in that case so the event is still recorded.
 */
export function parseShiprocketTimestamp(raw) {
  const s = String(raw || '').trim();
  if (!s) return Number.NaN;

  // Try the documented "DD MM YYYY HH:MM:SS" form first (IST).
  const m1 = s.match(/^(\d{2})\s+(\d{2})\s+(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (m1) {
    const [, dd, mm, yyyy, hh, mi, ss] = m1;
    const utcMs = Date.UTC(+yyyy, +mm - 1, +dd, +hh, +mi, +ss);
    if (Number.isFinite(utcMs)) return utcMs - 5.5 * 60 * 60 * 1000;
  }

  // SQLite-style "YYYY-MM-DD HH:MM:SS" — Shiprocket sends this in IST too.
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/);
  if (m2) {
    const [, yyyy, mm, dd, hh, mi, ss] = m2;
    const utcMs = Date.UTC(+yyyy, +mm - 1, +dd, +hh, +mi, +ss);
    if (Number.isFinite(utcMs)) return utcMs - 5.5 * 60 * 60 * 1000;
  }

  // Fall back to the JS parser for ISO-8601 with explicit Z/offset.
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : Number.NaN;
}

/**
 * Format a JS-parseable date into the `YYYY-MM-DD HH:MM` shape Shiprocket
 * expects in `order_date`, converted to Indian Standard Time. SQLite UTC
 * naive timestamps (e.g. "2026-04-26 08:00:00") are accepted as well as
 * ISO-8601 strings. Falls back to "now" in IST on unparseable input.
 */
export function formatISTOrderDate(raw) {
  const candidate = String(raw || '').trim();
  let t = Number.NaN;
  if (candidate) {
    // Treat naked SQLite timestamps as UTC (which they are — datetime('now')
    // returns UTC) by tagging them with Z before parsing.
    const tagged = /[zZ]|[+-]\d{2}:?\d{2}$/.test(candidate)
      ? candidate.replace(' ', 'T')
      : candidate.replace(' ', 'T') + 'Z';
    t = Date.parse(tagged);
  }
  if (!Number.isFinite(t)) t = Date.now();
  const ist = new Date(t + 5.5 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())} ${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}`;
}

/**
 * HMAC-SHA256 a payload with the given secret using SubtleCrypto and return
 * a URL-safe base64 string. Available everywhere because Workers, Node 18+,
 * and Cloudflare runtimes all expose `crypto.subtle`.
 */
export async function hmacSha256B64u(secret, payload) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(String(secret || '')),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(String(payload || '')));
  // Base64URL encode without padding.
  let bin = '';
  const bytes = new Uint8Array(sig);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
