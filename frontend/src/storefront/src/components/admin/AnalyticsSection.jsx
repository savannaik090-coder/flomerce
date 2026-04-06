import React, { useState, useEffect, useContext } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { formatDateShortForAdmin } from '../../utils/dateFormatter.js';
import { API_BASE } from '../../config.js';

const COUNTRY_NAMES = {
  IN: 'India', US: 'United States', GB: 'United Kingdom', AE: 'UAE',
  CA: 'Canada', AU: 'Australia', DE: 'Germany', FR: 'France',
  SA: 'Saudi Arabia', SG: 'Singapore', JP: 'Japan', BR: 'Brazil',
  NL: 'Netherlands', IT: 'Italy', ES: 'Spain', MX: 'Mexico',
  KR: 'South Korea', RU: 'Russia', ZA: 'South Africa', NG: 'Nigeria',
  PK: 'Pakistan', BD: 'Bangladesh', PH: 'Philippines', ID: 'Indonesia',
  MY: 'Malaysia', TH: 'Thailand', VN: 'Vietnam', EG: 'Egypt',
  KE: 'Kenya', TR: 'Turkey', SE: 'Sweden', NO: 'Norway',
  NZ: 'New Zealand', IE: 'Ireland', PT: 'Portugal', QA: 'Qatar',
  KW: 'Kuwait', BH: 'Bahrain', OM: 'Oman', LK: 'Sri Lanka',
  NP: 'Nepal', MM: 'Myanmar', CN: 'China', HK: 'Hong Kong', TW: 'Taiwan',
};

const SOURCE_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#64748b'];
const DEVICE_COLORS = { Mobile: '#2563eb', Desktop: '#10b981', Tablet: '#f59e0b', Unknown: '#64748b' };

function formatDateLabel(dateStr, period, timezone) {
  if (!dateStr) return '';
  if (period === '12months') {
    const [y, m] = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[parseInt(m, 10) - 1] || dateStr;
  }
  try {
    const d = new Date(dateStr + 'T00:00:00');
    const opts = { weekday: 'short', day: 'numeric' };
    if (timezone) opts.timeZone = timezone;
    return d.toLocaleDateString('en-US', opts);
  } catch {
    return dateStr;
  }
}

export default function AnalyticsSection() {
  const { siteConfig } = useContext(SiteContext);
  const [period, setPeriod] = useState('7days');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (siteConfig?.id) loadAnalytics();
  }, [siteConfig?.id, period]);

  async function loadAnalytics() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/analytics/stats?siteId=${siteConfig.id}&period=${period}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Failed to load analytics:', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 60, flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontSize: 14, color: '#64748b' }}>Loading analytics...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const stats = data?.stats || { pageViews: 0, visitors: 0, bounceRate: 0 };
  const trends = data?.trends || [];
  const sources = data?.sources || [];
  const devices = data?.devices || [];
  const countries = data?.countries || [];
  const topPages = data?.topPages || [];
  const hasData = stats.pageViews > 0;

  const maxVisitors = Math.max(...trends.map(d => d.visitors || 0), 1);

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
          <div className="stat-value">{stats.bounceRate}%</div>
          <div className="stat-change">Single-page sessions</div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Avg. Pages/Visit</span>
            <div className="stat-icon" style={{ background: '#f5f3ff' }}>
              <i className="fas fa-layer-group" style={{ color: '#8b5cf6' }} />
            </div>
          </div>
          <div className="stat-value">
            {stats.visitors > 0 ? (stats.pageViews / stats.visitors).toFixed(1) : '0'}
          </div>
          <div className="stat-change">Pages per visitor</div>
        </div>
      </div>

      {!hasData && (
        <div className="card" style={{ marginBottom: 24, textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No analytics data yet</h3>
          <p style={{ fontSize: 13, color: '#64748b', maxWidth: 400, margin: '0 auto' }}>
            Analytics data will appear here as visitors browse your store. Page views, traffic sources, devices, and countries are tracked automatically.
          </p>
        </div>
      )}

      {hasData && (
        <>
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h3 className="card-title">Visitor Trends</h3>
            </div>
            <div className="card-content">
              <div style={{ overflowX: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160, minWidth: 400, padding: '0 8px' }}>
                  {trends.map((d, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div
                        style={{
                          width: '100%',
                          height: `${(d.visitors / maxVisitors) * 120}px`,
                          background: 'linear-gradient(to top, #2563eb, #60a5fa)',
                          borderRadius: '4px 4px 0 0',
                          minHeight: 4,
                          transition: 'height 0.3s',
                        }}
                        title={`${formatDateLabel(d.date_label, period, siteConfig?.settings?.timezone)}: ${d.visitors} visitors, ${d.views} views`}
                      />
                      <span style={{ fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        {formatDateLabel(d.date_label, period, siteConfig?.settings?.timezone)}
                      </span>
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
                {sources.length > 0 ? sources.map((s, i) => (
                  <div key={i} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                      <span>{s.name}</span>
                      <span style={{ fontWeight: 600 }}>{s.pct}%</span>
                    </div>
                    <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3 }}>
                      <div style={{ height: '100%', width: `${s.pct}%`, background: SOURCE_COLORS[i % SOURCE_COLORS.length], borderRadius: 3 }} />
                    </div>
                  </div>
                )) : (
                  <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: 16 }}>No source data yet</p>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Device Breakdown</h3>
              </div>
              <div className="card-content">
                {devices.length > 0 ? devices.map((d, i) => (
                  <div key={i} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className={`fas ${d.name === 'Mobile' ? 'fa-mobile-alt' : d.name === 'Desktop' ? 'fa-desktop' : d.name === 'Tablet' ? 'fa-tablet-alt' : 'fa-question-circle'}`} style={{ color: DEVICE_COLORS[d.name] || '#64748b' }} />
                        {d.name}
                      </span>
                      <span style={{ fontWeight: 600 }}>{d.pct}%</span>
                    </div>
                    <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3 }}>
                      <div style={{ height: '100%', width: `${d.pct}%`, background: DEVICE_COLORS[d.name] || '#64748b', borderRadius: 3 }} />
                    </div>
                  </div>
                )) : (
                  <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: 16 }}>No device data yet</p>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 24 }}>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Top Countries</h3>
              </div>
              <div className="card-content">
                {countries.length > 0 ? (
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
                            <td>{COUNTRY_NAMES[c.code] || c.code}</td>
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
                ) : (
                  <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: 16 }}>No country data yet</p>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Top Pages</h3>
              </div>
              <div className="card-content">
                {topPages.length > 0 ? (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Page</th>
                          <th>Views</th>
                          <th>Visitors</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topPages.map((p, i) => (
                          <tr key={i}>
                            <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.page_path}>
                              {p.page_path === '/' ? 'Home' : p.page_path}
                            </td>
                            <td>{p.views.toLocaleString()}</td>
                            <td>{p.visitors.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: 16 }}>No page data yet</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
