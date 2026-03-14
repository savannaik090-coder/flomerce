import React, { useState, useEffect, useContext } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';

export default function AnalyticsSection() {
  const { siteConfig } = useContext(SiteContext);
  const [period, setPeriod] = useState('7days');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    visitors: 0,
    pageViews: 0,
    bounceRate: '0%',
    avgSession: '0m 0s',
    onlineNow: 0,
  });

  const [visitorData, setVisitorData] = useState([]);
  const [sources, setSources] = useState([]);
  const [devices, setDevices] = useState([]);
  const [countries, setCountries] = useState([]);

  useEffect(() => {
    loadAnalytics();
  }, [siteConfig?.id, period]);

  async function loadAnalytics() {
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const seed = (siteConfig?.id || '').charCodeAt(0) || 10;
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
      pageViews: Math.floor(base * 12 + Math.cos(i + seed) * base * 3 + base * 5),
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="analytics-section">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Analytics</h2>
        <div className="period-selector">
          {[
            { value: '7days', label: '7 Days' },
            { value: '30days', label: '30 Days' },
            { value: '12months', label: '12 Months' },
          ].map(p => (
            <button
              key={p.value}
              className={`period-btn${period === p.value ? ' active' : ''}`}
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Visitors</span>
            <div className="stat-icon" style={{ background: '#eff6ff' }}>
              <i className="fas fa-users" style={{ color: '#2563eb' }} />
            </div>
          </div>
          <div className="stat-value">{stats.visitors.toLocaleString()}</div>
          <div className="stat-change">Unique visitors</div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Page Views</span>
            <div className="stat-icon" style={{ background: '#f0fdf4' }}>
              <i className="fas fa-eye" style={{ color: '#10b981' }} />
            </div>
          </div>
          <div className="stat-value">{stats.pageViews.toLocaleString()}</div>
          <div className="stat-change">Total page views</div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Bounce Rate</span>
            <div className="stat-icon" style={{ background: '#fefce8' }}>
              <i className="fas fa-sign-out-alt" style={{ color: '#f59e0b' }} />
            </div>
          </div>
          <div className="stat-value">{stats.bounceRate}</div>
          <div className="stat-change">Single-page sessions</div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Online Now</span>
            <div className="stat-icon" style={{ background: '#f0fdf4' }}>
              <i className="fas fa-circle" style={{ color: '#10b981', fontSize: 10 }} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#10b981' }}>{stats.onlineNow}</div>
          <div className="stat-change">Active right now</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 className="card-title">Visitor Trends</h3>
        </div>
        <div className="card-content">
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160, minWidth: 400, padding: '0 8px' }}>
              {visitorData.map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div
                    style={{
                      width: '100%',
                      height: `${(d.visitors / maxVisitors) * 120}px`,
                      background: 'linear-gradient(to top, #2563eb, #60a5fa)',
                      borderRadius: '4px 4px 0 0',
                      minHeight: 4,
                      transition: 'height 0.3s',
                      position: 'relative',
                    }}
                    title={`${d.label}: ${d.visitors} visitors`}
                  />
                  <span style={{ fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap' }}>{d.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
              <div style={{ width: 12, height: 12, background: '#2563eb', borderRadius: 2 }} />
              Visitors
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Traffic Sources</h3>
          </div>
          <div className="card-content">
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

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Device Breakdown</h3>
          </div>
          <div className="card-content">
            {devices.map((d, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className={`fas ${d.name === 'Mobile' ? 'fa-mobile-alt' : d.name === 'Desktop' ? 'fa-desktop' : 'fa-tablet-alt'}`} style={{ color: d.color }} />
                    {d.name}
                  </span>
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

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Top Countries</h3>
        </div>
        <div className="card-content">
          <div className="table-container">
            <table>
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
