// Billing endpoints for enterprise overage invoices.
//
// Routes:
//   GET  /api/billing/invoices?siteId=...      site-admin auth, lists invoices
//   GET  /api/billing/invoice?invoice=&t=&site=  PUBLIC, token-gated single invoice
//   POST /api/billing/invoices/:id/pay         token-gated, mints a Razorpay order
//
// All Razorpay orders for overages use PLATFORM credentials — merchants are
// paying Flomerce, not themselves. Confirmation happens asynchronously through
// the Razorpay webhook (`payment.captured` -> handleOverageInvoicePaid in
// payments-worker.js); this worker never trusts the client to mark paid.

import { errorResponse, successResponse, jsonResponse, handleCORS } from '../../utils/helpers.js';
import { getPlatformRazorpayKeyId } from './payments-worker.js';

export async function handleBilling(request, env, path) {
  if (request.method === 'OPTIONS') return handleCORS();

  const parts = path.split('/').filter(Boolean); // ['api','billing',...]
  const sub = parts[2] || '';

  try {
    if (request.method === 'GET' && sub === 'invoice') {
      return getPublicInvoice(request, env);
    }
    if (request.method === 'GET' && sub === 'invoices') {
      return listInvoicesForSite(request, env);
    }
    if (request.method === 'POST' && sub === 'invoices' && parts[3] && parts[4] === 'pay') {
      return createInvoiceOrder(request, env, parts[3]);
    }
    return errorResponse('Billing endpoint not found', 404);
  } catch (err) {
    console.error('Billing worker error:', err);
    return errorResponse('Billing request failed: ' + (err.message || err), 500);
  }
}

// ---------------------------------------------------------------------------
// Public token-gated single invoice fetch.
// ---------------------------------------------------------------------------
async function getPublicInvoice(request, env) {
  const url = new URL(request.url);
  const invoiceNumber = url.searchParams.get('invoice');
  const token = url.searchParams.get('t');
  if (!invoiceNumber || !token) {
    return errorResponse('invoice and t are required', 400);
  }

  const row = await env.DB.prepare(`
    SELECT eum.*, s.subdomain, s.brand_name, s.id as site_id_full
    FROM enterprise_usage_monthly eum
    JOIN sites s ON eum.site_id = s.id
    WHERE eum.invoice_number = ? AND eum.invoice_token = ?
    LIMIT 1
  `).bind(invoiceNumber, token).first();

  if (!row) return errorResponse('Invoice not found or token invalid', 404);

  const platformKeyId = (await getPlatformRazorpayKeyId(env)) || env.RAZORPAY_KEY_ID || null;

  return successResponse({
    invoice: shapeInvoice(row),
    razorpayKeyId: platformKeyId,
    platformName: 'Flomerce',
  });
}

// ---------------------------------------------------------------------------
// Site-admin authenticated invoice list (used by the merchant Billing tab).
// ---------------------------------------------------------------------------
async function listInvoicesForSite(request, env) {
  const url = new URL(request.url);
  const siteId = url.searchParams.get('siteId');
  if (!siteId) return errorResponse('siteId is required', 400);

  const { validateSiteAdmin } = await import('../storefront/site-admin-worker.js');
  const admin = await validateSiteAdmin(request, env, siteId);
  if (!admin) return errorResponse('Unauthorized', 401);

  const result = await env.DB.prepare(`
    SELECT eum.*, s.subdomain, s.brand_name
    FROM enterprise_usage_monthly eum
    JOIN sites s ON eum.site_id = s.id
    WHERE eum.site_id = ?
    ORDER BY eum.year_month DESC
    LIMIT 36
  `).bind(siteId).all();

  const invoices = (result.results || []).map(shapeInvoice);
  return successResponse({ invoices });
}

// ---------------------------------------------------------------------------
// Create a Razorpay order for an unpaid invoice (token-gated, public).
// ---------------------------------------------------------------------------
// Uses platform Razorpay credentials. Reuses an existing order_id if one
// exists and Razorpay still considers it open — for simplicity here we always
// reuse if present. (Razorpay accepts repeat checkouts on an open order.)
async function createInvoiceOrder(request, env, invoiceNumber) {
  let token;
  try {
    const body = await request.json();
    token = body.token;
  } catch {
    return errorResponse('Request body must be JSON with { token }', 400);
  }
  if (!invoiceNumber || !token) return errorResponse('invoice and token are required', 400);

  const invoice = await env.DB.prepare(`
    SELECT eum.*, s.subdomain, s.brand_name
    FROM enterprise_usage_monthly eum
    JOIN sites s ON eum.site_id = s.id
    WHERE eum.invoice_number = ? AND eum.invoice_token = ?
    LIMIT 1
  `).bind(invoiceNumber, token).first();
  if (!invoice) return errorResponse('Invoice not found or token invalid', 404);

  if (invoice.status === 'paid') {
    return errorResponse('Invoice is already paid', 409);
  }
  const totalCost = Number(invoice.total_cost_inr || 0);
  if (!(totalCost > 0)) {
    return errorResponse('Invoice has no amount due', 400);
  }

  // Reuse an existing order if we already minted one (avoids duplicate orders
  // when the user clicks pay twice). Razorpay charges per attempt, not per
  // order, so this is safe.
  if (invoice.razorpay_order_id) {
    const platformKeyId = (await getPlatformRazorpayKeyId(env)) || env.RAZORPAY_KEY_ID || null;
    return successResponse({
      orderId: invoice.razorpay_order_id,
      amount: Math.round(totalCost * 100),
      currency: 'INR',
      razorpayKeyId: platformKeyId,
      invoiceNumber: invoice.invoice_number,
      brandName: invoice.brand_name,
      reused: true,
    });
  }

  const platformKeyId = (await getPlatformRazorpayKeyId(env)) || env.RAZORPAY_KEY_ID;
  const platformKeySecret = env.RAZORPAY_KEY_SECRET;
  if (!platformKeyId || !platformKeySecret) {
    return errorResponse('Razorpay platform credentials are not configured', 500);
  }

  const amountPaise = Math.round(totalCost * 100);
  const receipt = `inv_${invoice.id}_${Date.now()}`.slice(0, 40);
  const orderPayload = {
    amount: amountPaise,
    currency: 'INR',
    receipt,
    notes: {
      type: 'enterprise_overage_invoice',
      overageInvoiceId: String(invoice.id),
      invoiceNumber: invoice.invoice_number,
      siteId: invoice.site_id,
      yearMonth: invoice.year_month,
    },
  };

  const auth = btoa(`${platformKeyId}:${platformKeySecret}`);
  const resp = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
    },
    body: JSON.stringify(orderPayload),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data.id) {
    console.error('Razorpay order create failed for overage invoice', invoice.id, ':', data);
    return errorResponse('Failed to create payment order: ' + (data?.error?.description || resp.statusText), 502);
  }

  await env.DB.prepare(
    `UPDATE enterprise_usage_monthly SET razorpay_order_id = ? WHERE id = ?`
  ).bind(data.id, invoice.id).run();

  return successResponse({
    orderId: data.id,
    amount: amountPaise,
    currency: 'INR',
    razorpayKeyId: platformKeyId,
    invoiceNumber: invoice.invoice_number,
    brandName: invoice.brand_name,
    reused: false,
  });
}

function shapeInvoice(row) {
  return {
    id: row.id,
    siteId: row.site_id,
    subdomain: row.subdomain,
    brandName: row.brand_name,
    invoiceNumber: row.invoice_number,
    yearMonth: row.year_month,
    status: row.status,
    totalCostINR: Number(row.total_cost_inr || 0),
    d1CostINR: Number(row.d1_cost_inr || 0),
    r2CostINR: Number(row.r2_cost_inr || 0),
    d1OverageBytes: Number(row.d1_overage_bytes || 0),
    r2OverageBytes: Number(row.r2_overage_bytes || 0),
    d1LimitBytes: row.d1_limit_bytes != null ? Number(row.d1_limit_bytes) : null,
    r2LimitBytes: row.r2_limit_bytes != null ? Number(row.r2_limit_bytes) : null,
    snapshotAt: row.snapshot_at,
    dueDate: row.due_date,
    paidAt: row.paid_at,
    paymentRef: row.payment_ref,
    paymentMethod: row.payment_method,
    razorpayOrderId: row.razorpay_order_id,
    emailedAt: row.emailed_at,
    notes: row.notes,
  };
}
