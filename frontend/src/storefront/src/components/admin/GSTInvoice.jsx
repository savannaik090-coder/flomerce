import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../services/api.js';

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

export default function GSTInvoice({ orderId, siteId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInvoiceData();
  }, [orderId, siteId]);

  async function fetchInvoiceData() {
    setLoading(true);
    setError('');
    try {
      const token = sessionStorage.getItem('site_admin_token');
      const res = await fetch(getApiUrl(`/api/orders/${orderId}/invoice?siteId=${siteId}`), {
        headers: { 'Authorization': `SiteAdmin ${token}` },
      });
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || "Failed to load invoice data");
      }
    } catch (e) {
      setError("Failed to load invoice data");
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    const content = document.getElementById('gst-invoice-print-area');
    if (!content) return;
    const html = `<!DOCTYPE html><html><head><title>${`Invoice INV-${order.order_number}`}</title><style>
      body { margin: 0; padding: 20px; font-family: Arial, sans-serif; font-size: 13px; color: #333; }
      table { border-collapse: collapse; width: 100%; }
      @media print { body { padding: 10px; } }
    </style></head><body>${content.innerHTML}</body></html>`;
    let iframe = document.getElementById('gst-print-frame');
    if (iframe) iframe.remove();
    iframe = document.createElement('iframe');
    iframe.id = 'gst-print-frame';
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }, 300);
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
        <div style={{ fontSize: 24, marginBottom: 12 }}>⏳</div>
        <div>Loading invoice...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#dc2626' }}>
        <div style={{ fontSize: 20, marginBottom: 8 }}>⚠️ {error}</div>
        <button onClick={onClose} style={{ marginTop: 16, padding: '8px 20px', borderRadius: 6, border: '1px solid #ddd', background: '#f5f5f5', cursor: 'pointer' }}>Close</button>
      </div>
    );
  }

  const { order, gstConfig } = data;
  const currency = order.currency || 'INR';
  const storeState = gstConfig.state || '';
  const addr = order.shipping_address || {};
  const customerState = addr.state || '';
  const isGSTRegistered = !!gstConfig.gstin;

  let totalTaxable = 0;
  let totalCGST = 0;
  let totalSGST = 0;
  let totalIGST = 0;

  const itemRows = (order.items || []).map((item, idx) => {
    const g = calcGST(item.price, item.quantity, item.gstRate, storeState, customerState);
    totalTaxable += g.taxable;
    totalCGST += g.cgst;
    totalSGST += g.sgst;
    totalIGST += g.igst;
    return { ...item, ...g, idx };
  });

  const invoiceType = isGSTRegistered ? "TAX INVOICE" : "BILL OF SUPPLY";

  return (
    <>
      <style>{`
        @media (max-width: 640px) {
          .inv-details-grid { grid-template-columns: 1fr !important; }
          .inv-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .inv-table-wrap table { min-width: 520px; }
          .inv-summary { min-width: unset !important; width: 100% !important; }
          .inv-header-title { font-size: 18px !important; }
          .inv-actions { flex-direction: column; gap: 8px !important; }
          .inv-actions button { width: 100%; justify-content: center; }
        }
      `}</style>

      <div id="gst-invoice-root">
        <div className="invoice-no-print inv-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>{`Invoice — Order #${order.order_number}`}</h3>
          <div className="inv-actions" style={{ display: 'flex', gap: 10 }}>
            <button onClick={handlePrint} style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: '#0f172a', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="fas fa-print" /> Print / Save PDF
            </button>
            <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 6, border: '1px solid #ddd', background: '#f5f5f5', cursor: 'pointer', fontSize: 14 }}>Close</button>
          </div>
        </div>

        <div id="gst-invoice-print-area" className="invoice-print-wrapper" style={{ fontFamily: 'Arial, sans-serif', fontSize: 13, color: '#333', border: '1px solid #e2e8f0', borderRadius: 8, padding: 24, background: '#fff' }}>
          <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#64748b', marginBottom: 4 }}>{invoiceType}</div>
            <div className="inv-header-title" style={{ fontSize: 22, fontWeight: 700, color: '#0f172a' }}>{gstConfig.brandName}</div>
            {gstConfig.legalName && gstConfig.legalName !== gstConfig.brandName && (
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{gstConfig.legalName}</div>
            )}
            {gstConfig.address && <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{gstConfig.address}</div>}
            {isGSTRegistered && <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginTop: 6 }}>GSTIN: {gstConfig.gstin}</div>}
          </div>

          <div className="inv-details-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: '#64748b', marginBottom: 8, textTransform: 'uppercase' }}>Invoice Details</div>
              <div><span style={{ color: '#64748b' }}>Invoice No:</span> <strong>INV-{order.order_number}</strong></div>
              <div style={{ marginTop: 4 }}><span style={{ color: '#64748b' }}>Date:</span> {formatDate(order.created_at)}</div>
              <div style={{ marginTop: 4 }}><span style={{ color: '#64748b' }}>Order No:</span> #{order.order_number}</div>
              <div style={{ marginTop: 4 }}><span style={{ color: '#64748b' }}>Payment:</span> {order.payment_method === 'cod' ? "Cash on Delivery" : "Online Payment"}</div>
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
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
            <thead>
              <tr style={{ background: '#0f172a', color: '#fff' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>#</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Item</th>
                {isGSTRegistered && <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>HSN</th>}
                <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Qty</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Rate</th>
                {isGSTRegistered && <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Taxable</th>}
                {isGSTRegistered && storeState && customerState && storeState.toLowerCase() === customerState.toLowerCase() ? (
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
              {itemRows.map((item, idx) => {
                const isIntra = isGSTRegistered && storeState && customerState && storeState.toLowerCase() === customerState.toLowerCase();
                return (
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
                          {formatCurrency(item.cgst, currency)}<br/>
                          <span style={{ color: '#94a3b8', fontSize: 11 }}>{item.rate / 2}%</span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12 }}>
                          {formatCurrency(item.sgst, currency)}<br/>
                          <span style={{ color: '#94a3b8', fontSize: 11 }}>{item.rate / 2}%</span>
                        </td>
                      </>
                    ) : isGSTRegistered ? (
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12 }}>
                        {formatCurrency(item.igst, currency)}<br/>
                        <span style={{ color: '#94a3b8', fontSize: 11 }}>{item.rate}%</span>
                      </td>
                    ) : null}
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                      {formatCurrency(item.taxable + item.gstAmount, currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
            <div className="inv-summary" style={{ minWidth: 280, background: '#f8fafc', borderRadius: 6, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                <span style={{ color: '#64748b' }}>Subtotal (before tax)</span>
                <span>{formatCurrency(order.subtotal, currency)}</span>
              </div>
              {isGSTRegistered && storeState && customerState && storeState.toLowerCase() === customerState.toLowerCase() ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                    <span style={{ color: '#64748b' }}>CGST</span>
                    <span>{formatCurrency(totalCGST, currency)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                    <span style={{ color: '#64748b' }}>SGST</span>
                    <span>{formatCurrency(totalSGST, currency)}</span>
                  </div>
                </>
              ) : isGSTRegistered ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: '#64748b' }}>IGST</span>
                  <span>{formatCurrency(totalIGST, currency)}</span>
                </div>
              ) : null}
              {parseFloat(order.discount || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: '#16a34a' }}>
                  <span>Discount{order.coupon_code ? ` (${order.coupon_code})` : ''}</span>
                  <span>−{formatCurrency(order.discount, currency)}</span>
                </div>
              )}
              {parseFloat(order.shipping_cost || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
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
            <div style={{ marginTop: 16, padding: '12px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, fontSize: 12, color: '#78350f' }}>
              This is a computer-generated invoice. No signature required.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
