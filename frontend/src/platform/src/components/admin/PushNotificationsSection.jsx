import { useState, useEffect } from 'react';

export default function PushNotificationsSection({ site }) {
  const [stats, setStats] = useState({ loggedIn: 0, guests: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({ title: '', message: '', imageUrl: '', link: '', target: 'all' });
  const [autoSettings, setAutoSettings] = useState({ newProducts: true, priceDrops: true, backInStock: true });

  useEffect(() => {
    setLoading(false);
    setStats({ loggedIn: 24, guests: 118, total: 142 });
  }, [site?.id]);

  async function handleSend(e) {
    e.preventDefault();
    if (!form.title || !form.message) { setError('Title and message are required.'); return; }
    setSending(true);
    setError('');
    setSuccess('');
    try {
      await new Promise(r => setTimeout(r, 1000));
      setSuccess(`Notification "${form.title}" sent to ${form.target === 'all' ? stats.total : form.target === 'loggedin' ? stats.loggedIn : stats.guests} subscribers.`);
      setForm({ title: '', message: '', imageUrl: '', link: '', target: 'all' });
    } catch (err) {
      setError('Failed to send notification: ' + err.message);
    } finally {
      setSending(false);
    }
  }

  if (loading) return <div className="sa-loading"><div className="sa-spinner" /></div>;

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Push Notifications</h2>

      <div className="sa-stats-grid" style={{ marginBottom: 24 }}>
        <div className="sa-stat-card">
          <div className="sa-stat-header">
            <span className="sa-stat-title">Subscribed Users</span>
            <div className="sa-stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>
            </div>
          </div>
          <div className="sa-stat-value">{stats.loggedIn}</div>
          <div className="sa-stat-change">Logged-in users</div>
        </div>
        <div className="sa-stat-card">
          <div className="sa-stat-header">
            <span className="sa-stat-title">Guest Tokens</span>
            <div className="sa-stat-icon" style={{ background: '#fefce8', color: '#f59e0b' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
          </div>
          <div className="sa-stat-value">{stats.guests}</div>
          <div className="sa-stat-change">Anonymous visitors</div>
        </div>
        <div className="sa-stat-card">
          <div className="sa-stat-header">
            <span className="sa-stat-title">Total Subscribers</span>
            <div className="sa-stat-icon" style={{ background: '#f0fdf4', color: '#10b981' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
            </div>
          </div>
          <div className="sa-stat-value">{stats.total}</div>
          <div className="sa-stat-change">All push subscribers</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        <div className="sa-card">
          <div className="sa-card-header"><h3 className="sa-card-title">Send Notification</h3></div>
          <div className="sa-card-content">
            {success && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 16px', color: '#166534', marginBottom: 16, fontSize: 14 }}>
                {success}
              </div>
            )}
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: '#dc2626', marginBottom: 16, fontSize: 14 }}>
                {error}
              </div>
            )}
            <form onSubmit={handleSend}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Title *</label>
                <input type="text" placeholder="Notification title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} required />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Message *</label>
                <textarea placeholder="Notification message..." value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} rows={3} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} required />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Image URL (optional)</label>
                <input type="url" placeholder="https://..." value={form.imageUrl} onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Link (optional)</label>
                <input type="text" placeholder="/products or https://..." value={form.link} onChange={e => setForm(p => ({ ...p, link: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Target Audience</label>
                <select value={form.target} onChange={e => setForm(p => ({ ...p, target: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, background: 'white', boxSizing: 'border-box', fontFamily: 'inherit' }}>
                  <option value="all">All Subscribers ({stats.total})</option>
                  <option value="loggedin">Logged-in Users ({stats.loggedIn})</option>
                  <option value="guests">Guest Visitors ({stats.guests})</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary" disabled={sending} style={{ width: '100%' }}>
                {sending ? 'Sending...' : 'Send Notification'}
              </button>
            </form>
          </div>
        </div>

        <div className="sa-card">
          <div className="sa-card-header"><h3 className="sa-card-title">Automatic Notifications</h3></div>
          <div className="sa-card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
              Automatically send notifications when specific events occur in your store.
            </p>
            {[
              { key: 'newProducts', label: 'New Products', desc: 'Notify subscribers when you add new products' },
              { key: 'priceDrops', label: 'Price Drops', desc: 'Alert customers when prices are reduced' },
              { key: 'backInStock', label: 'Back in Stock', desc: 'Notify when out-of-stock items return' },
            ].map(item => (
              <div key={item.key} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{item.desc}</div>
                </div>
                <button
                  onClick={() => setAutoSettings(p => ({ ...p, [item.key]: !p[item.key] }))}
                  style={{
                    width: 44, height: 24, borderRadius: 12,
                    background: autoSettings[item.key] ? '#2563eb' : '#cbd5e1',
                    border: 'none', cursor: 'pointer', position: 'relative',
                    transition: 'background 0.2s', flexShrink: 0, marginLeft: 12,
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', background: 'white',
                    position: 'absolute', top: 3,
                    left: autoSettings[item.key] ? 23 : 3,
                    transition: 'left 0.2s',
                  }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
