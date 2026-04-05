import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../services/api.js';

function formatCurrency(amount, currency = 'INR') {
  const num = parseFloat(amount) || 0;
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(num);
  } catch (e) {
    return `${currency} ${num.toFixed(2)}`;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

function calcGST(price, qty, gstRate, storeState, customerState) {
  const taxable = parseFloat(price) * parseInt(qty || 1);
  const rate = parseFloat(gstRate) || 0;
  const gstAmount = (taxable * rate) / 100;
  const isIntraState = storeState && customerState && storeState.toLowerCase() === customerState.toLowerCase();
  return {
    taxable,
    rate,
    gstAmount,
    cgst: isIntraState ? gstAmount / 2 : 0,
    sgst: isIntraState ? gstAmount / 2 : 0,
    igst: isIntraState ? 0 : gstAmount,
    isIntraState,
  };
}

export default function InvoicePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const order = params.get('order');
    const t = params.get('t');
    const subdomain = params.get('subdomain');

    if (!order || !t || !subdomain) {
      setError('Invalid invoice link. Please use the link sent in your order confirmation email.');
      setLoading(false);
      return;
    }

    fetchInvoice(order, t, subdomain);
  }, []);

  async function fetchInvoice(orderNumber, token, subdomain) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(getApiUrl(`/api/orders/public-invoice?orderNumber=${encodeURIComponent(orderNumber)}&t=${encodeURIComponent(token)}&subdomain=${encodeURIComponent(subdomain)}`));
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Invoice not found or link has expired.');
      }
    } catch (e) {
      setError('Failed to load invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
          <div style={{ fontSize: 16 }}>Loading your invoice...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ textAlign: 'center', padding: 40, maxWidth: 480 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#dc2626', marginBottom: 8 }}>Invoice Unavailable</div>
          <div style={{ color: '#64748b', fontSize: 14 }}>{error}</div>
        </div>
      </div>
    );
  }

  const { order, gstConfig } = data;
  const currency = order.currency || 'INR';
  const storeState = gstConfig.state || '';
  const addr = order.shipping_address || {};
  const customerState = addr.state || '';
  const isGSTRegistered = !!gstConfig.gstin;

  let totalCGST = 0;
  let totalSGST = 0;
  let totalIGST = 0;

  const itemRows = (order.items || []).map((item, idx) => {
    const g = calcGST(item.price, item.quantity, item.gstRate, storeState, customerState);
    totalCGST += g.cgst;
    totalSGST += g.sgst;
    totalIGST += g.igst;
    return { ...item, ...g, idx };
  });

  const invoiceType = isGSTRegistered ? 'TAX INVOICE' : 'BILL OF SUPPLY';
  const isIntra = storeState && customerState && storeState.toLowerCase() === customerState.toLowerCase();

  return (
    <>
      <style>{`
        @media print {
          html, body { height: auto !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; background: white !important; }
          body * { visibility: hidden !important; height: 0 !important; overflow: hidden !important; margin: 0 !important; padding: 0 !important; position: static !important; }
          .inv-card, .inv-card * { visibility: visible !important; height: auto !important; overflow: visible !important; position: static !important; }
          .inv-card { display: block !important; width: 100% !important; padding: 10px !important; box-sizing: border-box !important; box-shadow: none !important; border-radius: 0 !important; }
          .invoice-no-print, .inv-top-bar { display: none !important; }
          .inv-table-wrap { overflow: visible !important; }
          .inv-table-wrap table { min-width: unset !important; width: 100% !important; }
        }
        body { margin: 0; padding: 0; background: #f0f4f8; font-family: Arial, sans-serif; }
        @media (max-width: 640px) {
          .inv-details-grid { grid-template-columns: 1fr !important; }
          .inv-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .inv-table-wrap table { min-width: 520px; }
          .inv-summary { min-width: unset !important; width: 100% !important; }
          .inv-header-title { font-size: 18px !important; }
          .inv-top-bar { flex-direction: column; gap: 10px !important; align-items: flex-start !important; }
          .inv-top-bar button { width: 100%; }
          .inv-card { padding: 16px !important; }
        }
      `}</style>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '20px 16px' }}>
        <div className="invoice-no-print inv-top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: '#64748b' }}>Order #{order.order_number} — {gstConfig.brandName}</div>
          <button
            onClick={() => window.print()}
            style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: '#0f172a', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
          >
            🖨️ Print / Save PDF
          </button>
        </div>

        <div className="inv-card" style={{ background: '#fff', borderRadius: 10, padding: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', color: '#333', fontSize: 13 }}>
          <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: 16, marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#64748b', marginBottom: 4 }}>{invoiceType}</div>
            <div className="inv-header-title" style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{gstConfig.brandName}</div>
            {gstConfig.legalName && gstConfig.legalName !== gstConfig.brandName && (
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{gstConfig.legalName}</div>
            )}
            {gstConfig.address && <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{gstConfig.address}</div>}
            {isGSTRegistered && <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginTop: 6 }}>GSTIN: {gstConfig.gstin}</div>}
          </div>

          <div className="inv-details-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: '#64748b', marginBottom: 8, textTransform: 'uppercase' }}>Invoice Details</div>
              <div><span style={{ color: '#64748b' }}>Invoice No:</span> <strong>INV-{order.order_number}</strong></div>
              <div style={{ marginTop: 4 }}><span style={{ color: '#64748b' }}>Date:</span> {formatDate(order.created_at)}</div>
              <div style={{ marginTop: 4 }}><span style={{ color: '#64748b' }}>Order No:</span> #{order.order_number}</div>
              <div style={{ marginTop: 4 }}><span style={{ color: '#64748b' }}>Payment:</span> {order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</div>
            </div>
            <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: '#64748b', marginBottom: 8, textTransform: 'uppercase' }}>Bill To</div>
              <div style={{ fontWeight: 600 }}>{order.customer_name}</div>
              {order.customer_email && <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{order.customer_email}</div>}
              {order.customer_phone && <div style={{ color: '#64748b', fontSize: 12 }}>{order.customer_phone}</div>}
              {addr.address && <div style={{ marginTop: 4 }}>{addr.address}</div>}
              {(addr.city || addr.state) && <div>{[addr.city, addr.state].filter(Boolean).join(', ')}{addr.pinCode || addr.pin_code ? ' – ' + (addr.pinCode || addr.pin_code) : ''}</div>}
              {addr.country && <div>{addr.country}</div>}
              {order.customer_gstin && <div style={{ marginTop: 4, fontWeight: 600 }}>GSTIN: {order.customer_gstin}</div>}
            </div>
          </div>

          <div className="inv-table-wrap">
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
            <thead>
              <tr style={{ background: '#0f172a', color: '#fff' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>#</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Item</th>
                {isGSTRegistered && <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>HSN</th>}
                <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Qty</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Rate</th>
                {isGSTRegistered && <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Taxable</th>}
                {isGSTRegistered && isIntra ? (
                  <>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>CGST</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>SGST</th>
                  </>
                ) : isGSTRegistered ? (
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>IGST</th>
                ) : null}
                <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {itemRows.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '10px 12px', color: '#64748b' }}>{idx + 1}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 500 }}>{item.name}</div>
                    {item.variant && <div style={{ fontSize: 11, color: '#94a3b8' }}>{item.variant}</div>}
                  </td>
                  {isGSTRegistered && <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b' }}>{item.hsnCode || '—'}</td>}
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatCurrency(item.price, currency)}</td>
                  {isGSTRegistered && <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatCurrency(item.taxable, currency)}</td>}
                  {isGSTRegistered && isIntra ? (
                    <>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12 }}>
                        {formatCurrency(item.cgst, currency)}<br />
                        <span style={{ color: '#94a3b8', fontSize: 11 }}>{item.rate / 2}%</span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12 }}>
                        {formatCurrency(item.sgst, currency)}<br />
                        <span style={{ color: '#94a3b8', fontSize: 11 }}>{item.rate / 2}%</span>
                      </td>
                    </>
                  ) : isGSTRegistered ? (
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12 }}>
                      {formatCurrency(item.igst, currency)}<br />
                      <span style={{ color: '#94a3b8', fontSize: 11 }}>{item.rate}%</span>
                    </td>
                  ) : null}
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                    {formatCurrency(item.taxable + item.gstAmount, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
            <div className="inv-summary" style={{ minWidth: 280, background: '#f8fafc', borderRadius: 6, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#64748b' }}>Subtotal (before tax)</span>
                <span>{formatCurrency(order.subtotal, currency)}</span>
              </div>
              {isGSTRegistered && isIntra ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: '#64748b' }}>CGST</span>
                    <span>{formatCurrency(totalCGST, currency)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: '#64748b' }}>SGST</span>
                    <span>{formatCurrency(totalSGST, currency)}</span>
                  </div>
                </>
              ) : isGSTRegistered ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: '#64748b' }}>IGST</span>
                  <span>{formatCurrency(totalIGST, currency)}</span>
                </div>
              ) : null}
              {parseFloat(order.discount || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#16a34a' }}>
                  <span>Discount{order.coupon_code ? ` (${order.coupon_code})` : ''}</span>
                  <span>−{formatCurrency(order.discount, currency)}</span>
                </div>
              )}
              {parseFloat(order.shipping_cost || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: '#64748b' }}>Shipping</span>
                  <span>{formatCurrency(order.shipping_cost, currency)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '2px solid #e2e8f0', fontWeight: 700, fontSize: 16 }}>
                <span>Total</span>
                <span>{formatCurrency(order.total, currency)}</span>
              </div>
            </div>
          </div>

          {isGSTRegistered && (
            <div style={{ padding: '12px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, fontSize: 12, color: '#78350f' }}>
              This is a computer-generated invoice. No signature required.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
