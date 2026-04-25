import React, { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '../services/api.js';

// Public, token-gated overage invoice page.
// URL: /billing/invoice?invoice=FLM-2026-04-XXXXXX&t=<token>&site=<siteId>
//
// Renders a print-friendly invoice and offers a one-click Razorpay hosted
// checkout when the invoice is unpaid. Confirmation arrives asynchronously
// via the platform Razorpay webhook — we just optimistically poll once after
// the modal closes so the page reflects the new "paid" state.

function fmtINR(n) {
  const num = Number(n) || 0;
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(num);
  } catch {
    return `₹${num.toFixed(2)}`;
  }
}

function fmtGB(bytes) {
  return (Number(bytes || 0) / (1024 * 1024 * 1024)).toFixed(3) + ' GB';
}

function fmtDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
}

function fmtMonth(yearMonth) {
  if (!yearMonth) return '';
  const [y, m] = yearMonth.split('-').map(Number);
  try {
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  } catch {
    return yearMonth;
  }
}

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function OverageInvoicePage() {
  const [data, setData] = useState(null);
  const [keyId, setKeyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const params = new URLSearchParams(window.location.search);
  const invoiceNumber = params.get('invoice');
  const token = params.get('t');

  const fetchInvoice = useCallback(async () => {
    if (!invoiceNumber || !token) {
      setError('Invalid invoice link. Please use the link in your billing email.');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(getApiUrl(
        `/api/billing/invoice?invoice=${encodeURIComponent(invoiceNumber)}&t=${encodeURIComponent(token)}`
      ));
      const json = await res.json();
      if (json.success) {
        setData(json.data.invoice);
        setKeyId(json.data.razorpayKeyId || null);
      } else {
        setError(json.error || 'Invoice not found or link has expired.');
      }
    } catch (e) {
      setError('Failed to load invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [invoiceNumber, token]);

  useEffect(() => { fetchInvoice(); }, [fetchInvoice]);

  async function handlePay() {
    if (!data || paying) return;
    setStatusMsg('');
    setPaying(true);
    try {
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error('Could not load payment library. Check your connection and try again.');

      const orderRes = await fetch(getApiUrl(`/api/billing/invoices/${encodeURIComponent(data.invoiceNumber)}/pay`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const orderJson = await orderRes.json();
      if (!orderJson.success) throw new Error(orderJson.error || 'Could not start payment.');
      const { orderId, amount, razorpayKeyId } = orderJson.data;

      const rzpKey = razorpayKeyId || keyId;
      if (!rzpKey) throw new Error('Payment is not configured. Please contact support.');

      const rzp = new window.Razorpay({
        key: rzpKey,
        amount,
        currency: 'INR',
        name: 'Flomerce',
        description: `Overage invoice ${data.invoiceNumber}`,
        order_id: orderId,
        prefill: { name: data.brandName || '' },
        theme: { color: '#0f172a' },
        handler: function () {
          // Always re-enable the button so the user can retry if the webhook
          // is delayed (paid state will hide the button on its own once the
          // refresh sees status=paid).
          setPaying(false);
          setStatusMsg('Payment received. Updating invoice…');
          setTimeout(() => fetchInvoice().then(() => setStatusMsg('')), 4000);
        },
        modal: {
          ondismiss: function () {
            setPaying(false);
          },
        },
      });
      rzp.on('payment.failed', function (resp) {
        setStatusMsg('Payment failed: ' + (resp?.error?.description || 'Unknown error'));
        setPaying(false);
      });
      rzp.open();
    } catch (e) {
      setStatusMsg(e.message || 'Could not start payment.');
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <div style={shellStyle}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>Loading invoice…</div>
      </div>
    );
  }
  if (error) {
    return (
      <div style={shellStyle}>
        <div style={{ background: '#fff', padding: 32, borderRadius: 12, maxWidth: 480, textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ margin: '0 0 8px', color: '#0f172a' }}>Invoice unavailable</h2>
          <p style={{ margin: 0, color: '#64748b' }}>{error}</p>
        </div>
      </div>
    );
  }

  const inv = data;
  const isPaid = inv.status === 'paid';
  const hasAmount = Number(inv.totalCostINR || 0) > 0;

  return (
    <div style={shellStyle}>
      <style>{printCss}</style>

      <div className="invoice-actions" style={{ width: '100%', maxWidth: 800, marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <button onClick={() => window.print()} style={btnSecondary}>🖨️ Print / Save PDF</button>
        {!isPaid && hasAmount && (
          <button onClick={handlePay} disabled={paying} style={{ ...btnPrimary, opacity: paying ? 0.7 : 1, cursor: paying ? 'wait' : 'pointer' }}>
            {paying ? 'Opening checkout…' : `Pay ${fmtINR(inv.totalCostINR)}`}
          </button>
        )}
      </div>
      {statusMsg && (
        <div className="invoice-actions" style={{ width: '100%', maxWidth: 800, marginBottom: 12, padding: 12, background: '#fef9c3', color: '#854d0e', borderRadius: 8, fontSize: 14 }}>
          {statusMsg}
        </div>
      )}

      <div className="invoice-sheet" style={sheetStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: 20, marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, color: '#0f172a' }}>Flomerce</h1>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>Multi-tenant commerce platform</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ margin: 0, fontSize: 22, color: '#0f172a' }}>INVOICE</h2>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>{inv.invoiceNumber}</p>
            <p style={{ margin: '4px 0 0', fontSize: 13 }}>
              <span style={{
                display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontWeight: 600, fontSize: 12,
                background: isPaid ? '#dcfce7' : '#fee2e2', color: isPaid ? '#166534' : '#991b1b',
              }}>{isPaid ? 'PAID' : 'UNPAID'}</span>
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24, fontSize: 14 }}>
          <div>
            <div style={labelStyle}>Billed to</div>
            <div style={{ fontWeight: 600, color: '#0f172a' }}>{inv.brandName || inv.subdomain}</div>
            <div style={{ color: '#64748b' }}>{inv.subdomain}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={labelStyle}>Billing period</div>
            <div style={{ fontWeight: 600, color: '#0f172a' }}>{fmtMonth(inv.yearMonth)}</div>
            <div style={{ color: '#64748b' }}>Issued {fmtDate(inv.snapshotAt)}</div>
            {!isPaid && inv.dueDate && <div style={{ color: '#64748b' }}>Due {fmtDate(inv.dueDate)}</div>}
            {isPaid && inv.paidAt && <div style={{ color: '#16a34a' }}>Paid {fmtDate(inv.paidAt)}</div>}
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginBottom: 24 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th align="left" style={thStyle}>Resource</th>
              <th align="right" style={thStyle}>Included</th>
              <th align="right" style={thStyle}>Overage</th>
              <th align="right" style={thStyle}>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdStyle}>D1 storage</td>
              <td align="right" style={tdStyle}>{inv.d1LimitBytes != null ? fmtGB(inv.d1LimitBytes) : '—'}</td>
              <td align="right" style={tdStyle}>{fmtGB(inv.d1OverageBytes)}</td>
              <td align="right" style={tdStyle}>{fmtINR(inv.d1CostINR)}</td>
            </tr>
            <tr>
              <td style={tdStyle}>R2 storage</td>
              <td align="right" style={tdStyle}>{inv.r2LimitBytes != null ? fmtGB(inv.r2LimitBytes) : '—'}</td>
              <td align="right" style={tdStyle}>{fmtGB(inv.r2OverageBytes)}</td>
              <td align="right" style={tdStyle}>{fmtINR(inv.r2CostINR)}</td>
            </tr>
            <tr>
              <td colSpan={3} align="right" style={{ ...tdStyle, fontWeight: 700 }}>Total due</td>
              <td align="right" style={{ ...tdStyle, fontWeight: 700, fontSize: 16 }}>{fmtINR(inv.totalCostINR)}</td>
            </tr>
          </tbody>
        </table>

        {isPaid && inv.paymentRef && (
          <div style={{ background: '#f0fdf4', padding: 14, borderRadius: 8, marginBottom: 20, fontSize: 13, color: '#166534' }}>
            <div><strong>Payment reference:</strong> {inv.paymentRef}</div>
            {inv.paymentMethod && <div><strong>Method:</strong> {inv.paymentMethod}</div>}
          </div>
        )}

        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16, fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
          <p style={{ margin: 0 }}>
            This invoice covers usage above your enterprise plan's included quota. Amounts are in Indian Rupees (INR).
            Questions? Reply to your billing email or contact support.
          </p>
          <p style={{ margin: '8px 0 0' }}>Invoice ID: {inv.invoiceNumber} · Site: {inv.siteId}</p>
        </div>
      </div>
    </div>
  );
}

const shellStyle = {
  minHeight: '100vh',
  background: '#f1f5f9',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '32px 16px',
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
};

const sheetStyle = {
  width: '100%',
  maxWidth: 800,
  background: '#fff',
  padding: 40,
  borderRadius: 12,
  boxShadow: '0 4px 24px rgba(15, 23, 42, 0.08)',
};

const labelStyle = { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#94a3b8', marginBottom: 4 };
const thStyle = { padding: '10px 12px', borderBottom: '1px solid #e2e8f0', fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 };
const tdStyle = { padding: '12px', borderBottom: '1px solid #f1f5f9' };
const btnPrimary = { background: '#2563eb', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' };
const btnSecondary = { background: '#fff', color: '#0f172a', border: '1px solid #cbd5e1', padding: '12px 20px', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' };

const printCss = `
  @media print {
    body { background: #fff !important; }
    .invoice-actions { display: none !important; }
    .invoice-sheet { box-shadow: none !important; padding: 0 !important; max-width: none !important; }
  }
`;
