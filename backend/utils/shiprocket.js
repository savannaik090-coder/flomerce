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
 * Returns the full data block; we typically pick recommended_courier_id.
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
 * Cancel a Shiprocket order (only valid before AWB assignment).
 */
export async function cancelOrder(token, shiprocketOrderIds) {
  const list = Array.isArray(shiprocketOrderIds) ? shiprocketOrderIds : [shiprocketOrderIds];
  return srFetch(token, '/orders/cancel', {
    method: 'POST',
    body: { ids: list.map(Number) },
  });
}
