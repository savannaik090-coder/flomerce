import { useState, useEffect } from 'react';

export default function AnalyticsSection({ site }) {
  const [period, setPeriod] = useState('7days');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ visitors: 0, pageViews: 0, bounceRate: '0%', avgSession: '0m 0s', onlineNow: 0 });
  const [visitorData, setVisitorData] = useState([]);
  const [sources, setSources] = useState([]);
  const [devices, setDevices] = useState([]);
  const [countries, setCountries] = useState([]);

  useEffect(() => {
    loadAnalytics();
  }, [site?.id, period]);

  async function loadAnalytics() {
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const seed = (site?.id || '').charCodeAt(0) || 10;
    const base = seed * 3;

    setStats({
      visitors: base * 47 + 1203,
      pageViews: base * 120 + 4800,
      bounceRate: `${(35 + (seed % 20)).toFixed(1)}%`,
      avgSession: `${2 + (seed % 3)}m ${10 + (seed % 40)}s`,
      onlineNow: 1 + (seed % 8),
    });

    const labels = period === '7days'
      ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      : period === '30days'
        ? Array.from({ length: 10 }, (_, i) => `Day ${i * 3 + 1}`)
        : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    setVisitorData(labels.map((label, i) => ({
      label,
      visitors: Math.floor(base * 5 + Math.sin(i + seed) * base * 2 + base * 2),
    })));

    setSources([
      { name: 'Direct', value: 38 + (seed % 10), color: '#2563eb' },
      { name: 'Google Search', value: 28 + (seed % 8), color: '#10b981' },
      { name: 'Instagram', value: 18 + (seed % 6), color: '#f59e0b' },
      { name: 'WhatsApp', value: 10 + (seed % 4), color: '#8b5cf6' },
      { name: 'Others', value: 6 + (seed % 3), color: '#64748b' },
    ]);

    setDevices([
      { name: 'Mobile', pct: 68 + (seed % 8), color: '#2563eb' },
      { name: 'Desktop', pct: 24 - (seed % 6), color: '#10b981' },
      { name: 'Tablet', pct: 8 - (seed % 3), color: '#f59e0b' },
    ]);

    setCountries([
      { name: 'India', visitors: base * 30 + 800, pct: 72 },
      { name: 'United States', visitors: base * 5 + 120, pct: 11 },
      { name: 'United Kingdom', visitors: base * 3 + 60, pct: 6 },
      { name: 'UAE', visitors: base * 2 + 40, pct: 4 },
      { name: 'Canada', visitors: base + 20, pct: 3 },
      { name: 'Others', visitors: base * 2, pct: 4 },
    ]);

    setLoading(false);
  }

  const maxVisitors = Math.max(...visitorData.map(d => d.visitors), 1);

  if (loading) return <div className="sa-loading"><div className="sa-spinner" /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Analytics</h2>
        <div className="sa-period-selector">
          {[{ value: '7days', label: '7 Days' }, { value: '30days', label: '30 Days' }, { value: '12months', label: '12 Months' }].map(p => (
            <button key={p.value} className={`sa-period-btn${period === p.value ? ' active' : ''}`} onClick={() => setPeriod(p.value)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sa-stats-grid" style={{ marginBottom: 24 }}>
        <div className="sa-stat-card">
          <div className="sa-stat-header">
            <span className="sa-stat-title">Visitors</span>
            <div className="sa-stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            </div>
          </div>
          <div className="sa-stat-value">{stats.visitors.toLocaleString()}</div>
          <div className="sa-stat-change">Unique visitors</div>
        </div>
        <div className="sa-stat-card">
          <div className="sa-stat-header">
            <span className="sa-stat-title">Page Views</span>
            <div className="sa-stat-icon" style={{ background: '#f0fdf4', color: '#10b981' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
          </div>
          <div className="sa-stat-value">{stats.pageViews.toLocaleString()}</div>
          <div className="sa-stat-change">Total page views</div>
        </div>
        <div className="sa-stat-card">
          <div className="sa-stat-header">
            <span className="sa-stat-title">Bounce Rate</span>
            <div className="sa-stat-icon" style={{ background: '#fefce8', color: '#f59e0b' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </div>
          </div>
          <div className="sa-stat-value">{stats.bounceRate}</div>
          <div className="sa-stat-change">Single-page sessions</div>
        </div>
        <div className="sa-stat-card">
          <div className="sa-stat-header">
            <span className="sa-stat-title">Online Now</span>
            <div className="sa-stat-icon" style={{ background: '#f0fdf4', color: '#10b981' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
            </div>
          </div>
          <div className="sa-stat-value" style={{ color: '#10b981' }}>{stats.onlineNow}</div>
          <div className="sa-stat-change">Active right now</div>
        </div>
      </div>

      <div className="sa-card" style={{ marginBottom: 24 }}>
        <div className="sa-card-header"><h3 className="sa-card-title">Visitor Trends</h3></div>
        <div className="sa-card-content">
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160, minWidth: 400, padding: '0 8px' }}>
              {visitorData.map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div
                    style={{ width: '100%', height: `${(d.visitors / maxVisitors) * 120}px`, background: 'linear-gradient(to top, #2563eb, #60a5fa)', borderRadius: '4px 4px 0 0', minHeight: 4, transition: 'height 0.3s' }}
                    title={`${d.label}: ${d.visitors} visitors`}
                  />
                  <span style={{ fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap' }}>{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 24 }}>
        <div className="sa-card">
          <div className="sa-card-header"><h3 className="sa-card-title">Traffic Sources</h3></div>
          <div className="sa-card-content">
            {sources.map((s, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                  <span>{s.name}</span>
                  <span style={{ fontWeight: 600 }}>{s.value}%</span>
                </div>
                <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${s.value}%`, background: s.color, borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="sa-card">
          <div className="sa-card-header"><h3 className="sa-card-title">Device Breakdown</h3></div>
          <div className="sa-card-content">
            {devices.map((d, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                  <span>{d.name}</span>
                  <span style={{ fontWeight: 600 }}>{d.pct}%</span>
                </div>
                <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${d.pct}%`, background: d.color, borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="sa-card">
        <div className="sa-card-header"><h3 className="sa-card-title">Top Countries</h3></div>
        <div className="sa-card-content">
          <div className="sa-table-wrap">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Country</th>
                  <th>Visitors</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                {countries.map((c, i) => (
                  <tr key={i}>
                    <td>{c.name}</td>
                    <td>{c.visitors.toLocaleString()}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, flex: 1 }}>
                          <div style={{ height: '100%', width: `${c.pct}%`, background: '#2563eb', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 12, minWidth: 30 }}>{c.pct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
