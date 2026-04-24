import React, { useContext, useEffect, useState } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { apiRequest } from '../../services/api.js';

function fmtINR(n) {
  const num = Number(n) || 0;
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(num);
  } catch {
    return `₹${num.toFixed(2)}`;
  }
}

function fmtMonth(yearMonth) {
  if (!yearMonth) return '';
  const [y, m] = yearMonth.split('-').map(Number);
  try {
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  } catch { return yearMonth; }
}

function fmtDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return iso; }
}

export default function BillingSection() {
  const { siteConfig } = useContext(SiteContext);
  const [invoices, setInvoices] = useState([]);
  const [quota, setQuota] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!siteConfig?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await apiRequest(`/api/billing/invoices?siteId=${encodeURIComponent(siteConfig.id)}`);
        if (cancelled) return;
        if (res.success) {
          setInvoices(res.data.invoices || []);
          setQuota(res.data.quota || null);
        } else {
          setError(res.error || "Failed to load invoices");
        }
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load invoices");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [siteConfig?.id]);

  if (siteConfig?.subscriptionPlan !== 'enterprise') {
    return (
      <div style={emptyStyle}>
        <h2 style={{ margin: '0 0 8px' }}>Billing</h2>
        <p style={{ margin: 0, color: '#64748b' }}>
          Overage billing is available on the Enterprise plan. Your current plan has fixed pricing — no usage invoices to show here.
        </p>
      </div>
    );
  }

  const unpaid = invoices.filter(i => i.status !== 'paid' && Number(i.totalCostINR || 0) > 0);
  const paid = invoices.filter(i => i.status === 'paid');
  const skipped = invoices.filter(i => i.status !== 'paid' && Number(i.totalCostINR || 0) === 0);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 4px', color: '#0f172a' }}>Billing & overage invoices</h2>
        <p style={{ margin: 0, color: '#64748b' }}>
          Monthly invoices for storage above your enterprise plan's included quota. Invoices are emailed to your owner email on the 1st of each month.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>Loading invoices…</div>
      ) : error ? (
        <div style={{ padding: 16, background: '#fee2e2', color: '#991b1b', borderRadius: 8 }}>{error}</div>
      ) : (
        <>
          {quota && <QuotaBlock quota={quota} />}
          <Group title="Unpaid" tone="warning" empty="No unpaid invoices. You're all caught up.">
            {unpaid.map(inv => <InvoiceRow key={inv.id} inv={inv} />)}
          </Group>
          <Group title="Paid" empty="No paid invoices yet.">
            {paid.map(inv => <InvoiceRow key={inv.id} inv={inv} />)}
          </Group>
          {skipped.length > 0 && (
            <Group title="No-charge months" empty="">
              {skipped.map(inv => <InvoiceRow key={inv.id} inv={inv} muted />)}
            </Group>
          )}
        </>
      )}
    </div>
  );
}

function fmtBytes(b) {
  const n = Number(b) || 0;
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = n / 1024, i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : 2)} ${units[i]}`;
}

function QuotaBlock({ quota, t }) {
  const d1Pct = quota.d1LimitBytes > 0 ? Math.min(100, (quota.d1UsedBytes / quota.d1LimitBytes) * 100) : 0;
  const r2Pct = quota.r2LimitBytes > 0 ? Math.min(100, (quota.r2UsedBytes / quota.r2LimitBytes) * 100) : 0;
  const projected = Number(quota.projectedCurrentMonthCostINR || 0);

  return (
    <section style={{ marginBottom: 28, padding: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 15, color: '#0f172a' }}>Your enterprise plan</h3>
        <div style={{ fontSize: 13, color: '#64748b' }}>
          Projected this month:&nbsp;
          <strong style={{ color: projected > 0 ? '#b45309' : '#166534' }}>{fmtINR(projected)}</strong>
        </div>
      </div>

      <Meter
        label="Database (D1)"
        used={quota.d1UsedBytes}
        limit={quota.d1LimitBytes}
        pct={d1Pct}
        custom={quota.d1OverrideActive}
        rate={`${fmtINR(quota.rates?.d1PerGB || 0)}/GB over quota`}
        customLabel="custom"/>
      <div style={{ height: 12 }} />
      <Meter
        label="File storage (R2)"
        used={quota.r2UsedBytes}
        limit={quota.r2LimitBytes}
        pct={r2Pct}
        custom={quota.r2OverrideActive}
        rate={`${fmtINR(quota.rates?.r2PerGB || 0)}/GB over quota`}
        customLabel="custom"/>

      {(quota.d1OverrideActive || quota.r2OverrideActive) && (
        <div style={{ marginTop: 12, fontSize: 12, color: '#2563eb' }}>
          A custom quota is in effect on your account.
        </div>
      )}
    </section>
  );
}

function Meter({ label, used, limit, pct, custom, rate, customLabel }) {
  const over = used > limit;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span style={{ color: '#0f172a', fontWeight: 600 }}>
          {label}
          {custom && <span style={{ marginInlineStart: 8, fontSize: 11, color: '#2563eb', fontWeight: 500 }}>{customLabel}</span>}
        </span>
        <span style={{ color: over ? '#b45309' : '#64748b' }}>
          {fmtBytes(used)} / {fmtBytes(limit)}
        </span>
      </div>
      <div style={{ height: 8, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: over ? '#f59e0b' : pct > 80 ? '#fbbf24' : '#10b981',
          transition: 'width 200ms ease',
        }} />
      </div>
      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{rate}</div>
    </div>
  );
}

function Group({ title, children, empty, tone }) {
  const items = React.Children.toArray(children);
  return (
    <section style={{ marginBottom: 28 }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 15, color: tone === 'warning' ? '#b45309' : '#0f172a' }}>{title}</h3>
      {items.length === 0 ? (
        empty ? <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, color: '#64748b', fontSize: 14 }}>{empty}</div> : null
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{items}</div>
      )}
    </section>
  );
}

function InvoiceRow({ inv, muted, t }) {
  const isPaid = inv.status === 'paid';
  const hasAmount = Number(inv.totalCostINR || 0) > 0;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      padding: '14px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
      opacity: muted ? 0.7 : 1,
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: '#0f172a' }}>{fmtMonth(inv.yearMonth)}</div>
        <div style={{ fontSize: 13, color: '#64748b' }}>
          {inv.invoiceNumber || '—'}
          {!isPaid && hasAmount && inv.dueDate && <> · {`Due ${fmtDate(inv.dueDate)}`}</>}
          {isPaid && inv.paidAt && <> · {`Paid ${fmtDate(inv.paidAt)}`}{inv.paymentMethod ? ` · ${inv.paymentMethod}` : ''}</>}
        </div>
      </div>
      <div style={{ textAlign: 'end' }}>
        <div style={{ fontWeight: 700, color: '#0f172a' }}>{fmtINR(inv.totalCostINR)}</div>
        <div style={{ fontSize: 12 }}>
          {isPaid ? <span style={pillPaid}>Paid</span> : hasAmount ? <span style={pillUnpaid}>Unpaid</span> : <span style={pillNone}>No charge</span>}
        </div>
      </div>
    </div>
  );
}

const pillPaid = { display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: '#dcfce7', color: '#166534', fontWeight: 600 };
const pillUnpaid = { display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: '#fee2e2', color: '#991b1b', fontWeight: 600 };
const pillNone = { display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: '#f1f5f9', color: '#64748b', fontWeight: 600 };

const emptyStyle = { padding: 24, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 };
