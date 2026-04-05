import React, { useState, useEffect, useContext, useMemo } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { apiRequest } from '../../services/api.js';
import { formatPrice } from '../../utils/priceFormatter.js';

const RANGE_OPTIONS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All Time' },
  { key: 'custom', label: 'Custom' },
];

function getDateRange(key) {
  const now = new Date();
  const fmt = d => d.toISOString().slice(0, 10);
  switch (key) {
    case 'today': return { from: fmt(now), to: fmt(now) };
    case 'week': {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      return { from: fmt(start), to: fmt(now) };
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: fmt(start), to: fmt(now) };
    }
    case 'all': return { from: '', to: '' };
    default: return { from: '', to: '' };
  }
}

const STATUS_COLORS = {
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  packed: '#8b5cf6',
  shipped: '#06b6d4',
  delivered: '#22c55e',
  cancelled: '#ef4444',
  returned: '#f97316',
  return_requested: '#fb923c',
  cancellation_requested: '#fbbf24',
};

function MiniBarChart({ data, currency }) {
  if (!data || data.length === 0) return <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 40 }}>No data for this period</div>;
  const maxRevenue = Math.max(...data.map(d => d.revenue || 0), 1);
  const barWidth = Math.max(Math.min(Math.floor((100 / data.length) - 1), 40), 4);

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, minHeight: 180, padding: '10px 0' , minWidth: data.length * (barWidth + 4) }}>
        {data.map((d, i) => {
          const h = Math.max((d.revenue / maxRevenue) * 150, 2);
          const label = d.day ? d.day.slice(5) : '';
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: `0 0 ${barWidth}px` }}>
              <div title={`${label}: ${formatPrice(d.revenue, currency)} (${d.orders} orders)`}
                style={{ width: barWidth, height: h, background: 'linear-gradient(180deg, #3b82f6, #1d4ed8)', borderRadius: '3px 3px 0 0', cursor: 'pointer', transition: 'height 0.3s' }} />
              {data.length <= 31 && <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 4, transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>{label}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusBar({ breakdown, total }) {
  if (!breakdown || breakdown.length === 0) return null;
  return (
    <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', height: 28, marginBottom: 16 }}>
      {breakdown.map((s, i) => {
        const pct = total > 0 ? (s.count / total) * 100 : 0;
        if (pct === 0) return null;
        return (
          <div key={i} title={`${s.status}: ${s.count}`}
            style={{ width: `${pct}%`, background: STATUS_COLORS[s.status] || '#94a3b8', minWidth: pct > 0 ? 4 : 0, transition: 'width 0.3s' }} />
        );
      })}
    </div>
  );
}

export default function RevenueSection() {
  const { siteConfig } = useContext(SiteContext);
  const [range, setRange] = useState('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const gstEnabled = siteConfig?.settings?.gstEnabled === true;
  const currency = siteConfig?.settings?.defaultCurrency || 'INR';

  const dateRange = useMemo(() => {
    if (range === 'custom') return { from: customFrom, to: customTo };
    return getDateRange(range);
  }, [range, customFrom, customTo]);

  useEffect(() => {
    if (!siteConfig?.id) return;
    if (range === 'custom' && (!customFrom || !customTo)) return;
    fetchAnalytics();
  }, [siteConfig?.id, dateRange.from, dateRange.to]);

  async function fetchAnalytics() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ siteId: siteConfig.id });
      if (dateRange.from) params.set('from', dateRange.from);
      if (dateRange.to) params.set('to', dateRange.to);
      const res = await apiRequest(`/api/orders/analytics?${params}`);
      if (res.success) setData(res.data);
    } catch (e) {
      console.error('Failed to load analytics:', e);
    } finally {
      setLoading(false);
    }
  }

  const cardStyle = { background: '#fff', borderRadius: 10, padding: 20, border: '1px solid #e2e8f0' };
  const statCardStyle = { ...cardStyle, textAlign: 'center', flex: 1, minWidth: 140 };

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20, alignItems: 'center' }}>
        {RANGE_OPTIONS.map(opt => (
          <button key={opt.key} onClick={() => setRange(opt.key)}
            style={{ padding: '8px 16px', borderRadius: 6, border: range === opt.key ? '2px solid #2563eb' : '1px solid #e2e8f0', background: range === opt.key ? '#eff6ff' : '#fff', color: range === opt.key ? '#2563eb' : '#334155', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {opt.label}
          </button>
        ))}
        {range === 'custom' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit' }} />
            <span style={{ color: '#94a3b8' }}>to</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit' }} />
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <div>Loading analytics...</div>
        </div>
      ) : !data ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>No data available</div>
      ) : (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
            <div style={statCardStyle}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Revenue</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{formatPrice(data.summary.totalRevenue, currency)}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{data.summary.revenueOrders} paid orders</div>
            </div>
            <div style={statCardStyle}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Orders</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{data.summary.totalOrders}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>all statuses</div>
            </div>
            <div style={statCardStyle}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Avg Order Value</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{formatPrice(data.summary.avgOrderValue, currency)}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>per paid order</div>
            </div>
            {gstEnabled && (
              <div style={statCardStyle}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>GST Collected</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{formatPrice(data.gstBreakdown.total, currency)}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>total tax</div>
              </div>
            )}
          </div>

          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Revenue Trend</h3>
            <MiniBarChart data={data.dailyRevenue} currency={currency} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Payment Methods</h3>
              {data.paymentMethodSplit.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: 13 }}>No data</div>
              ) : (
                <div>
                  {data.paymentMethodSplit.map((pm, i) => {
                    const totalPmRevenue = data.paymentMethodSplit.reduce((s, p) => s + (p.revenue || 0), 0);
                    const pct = totalPmRevenue > 0 ? Math.round(((pm.revenue || 0) / totalPmRevenue) * 100) : 0;
                    const label = (pm.payment_method || 'Unknown').replace('razorpay', 'Razorpay').replace('cod', 'COD').replace('COD', 'Cash on Delivery');
                    return (
                      <div key={i} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                          <span style={{ fontWeight: 600, color: '#334155' }}>{label}</span>
                          <span style={{ color: '#64748b' }}>{formatPrice(pm.revenue || 0, currency)} ({pm.order_count} orders)</span>
                        </div>
                        <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: i === 0 ? '#3b82f6' : '#22c55e', borderRadius: 4, transition: 'width 0.3s' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Order Status</h3>
              <StatusBar breakdown={data.statusBreakdown} total={data.summary.totalOrders} />
              {data.statusBreakdown.map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < data.statusBreakdown.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLORS[s.status] || '#94a3b8' }} />
                    <span style={{ fontSize: 13, color: '#334155', fontWeight: 500, textTransform: 'capitalize' }}>{(s.status || 'unknown').replace(/_/g, ' ')}</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{s.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Top Selling Products</h3>
            {data.topProducts.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 20 }}>No product data</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontWeight: 600 }}>#</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontWeight: 600 }}>Product</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px', color: '#64748b', fontWeight: 600 }}>Qty Sold</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px', color: '#64748b', fontWeight: 600 }}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topProducts.map((p, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{i + 1}</td>
                        <td style={{ padding: '10px 12px', color: '#0f172a', fontWeight: 500 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {p.image && <img src={p.image} alt="" style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover' }} />}
                            <span>{p.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{p.quantity}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>{formatPrice(p.revenue, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {gstEnabled && data.gstBreakdown.total > 0 && (
            <div style={{ ...cardStyle, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>GST Breakdown</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div style={{ textAlign: 'center', padding: 16, background: '#f8fafc', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>CGST</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{formatPrice(data.gstBreakdown.cgst, currency)}</div>
                </div>
                <div style={{ textAlign: 'center', padding: 16, background: '#f8fafc', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>SGST</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{formatPrice(data.gstBreakdown.sgst, currency)}</div>
                </div>
                <div style={{ textAlign: 'center', padding: 16, background: '#f8fafc', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>IGST</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{formatPrice(data.gstBreakdown.igst, currency)}</div>
                </div>
              </div>
              <div style={{ textAlign: 'center', marginTop: 12, padding: 12, background: '#f0fdf4', borderRadius: 8 }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>Total GST Collected: </span>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#16a34a' }}>{formatPrice(data.gstBreakdown.total, currency)}</span>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div style={{ ...cardStyle, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>Shipping Collected</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{formatPrice(data.summary.totalShipping, currency)}</div>
            </div>
            <div style={{ ...cardStyle, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>Discounts Given</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#ef4444' }}>-{formatPrice(data.summary.totalDiscount, currency)}</div>
            </div>
            <div style={{ ...cardStyle, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>Tax Collected</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{formatPrice(data.summary.totalTax, currency)}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
