import React, { useState, useEffect, useContext } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { apiRequest } from '../../services/api.js';

export default function PushNotificationsSection() {
  const { siteConfig } = useContext(SiteContext);
  const [stats, setStats] = useState({ loggedIn: 0, guests: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    message: '',
    imageUrl: '',
    link: '',
    target: 'all',
  });

  const [autoSettings, setAutoSettings] = useState({
    newProducts: true,
    priceDrops: true,
    backInStock: true,
  });

  useEffect(() => {
    if (siteConfig?.id) {
      loadStats();
      loadSettings();
    }
  }, [siteConfig?.id]);

  async function loadStats() {
    setLoading(true);
    try {
      const data = await apiRequest(`/api/notifications/stats?siteId=${siteConfig.id}`);
      if (data?.success && data.data) {
        setStats(data.data);
      }
    } catch (err) {
      console.warn('Failed to load push stats:', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadSettings() {
    try {
      const data = await apiRequest(`/api/notifications/settings?siteId=${siteConfig.id}`);
      if (data?.success && data.data) {
        setAutoSettings(data.data);
      }
    } catch (err) {
      console.warn('Failed to load push settings:', err.message);
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!form.title || !form.message) {
      setError('Title and message are required.');
      return;
    }
    setSending(true);
    setError('');
    setSuccess('');
    try {
      const data = await apiRequest('/api/notifications/send', {
        method: 'POST',
        body: JSON.stringify({
          siteId: siteConfig.id,
          title: form.title,
          message: form.message,
          imageUrl: form.imageUrl || undefined,
          link: form.link || undefined,
          target: form.target,
        }),
      });

      if (data?.success) {
        const { sent, failed, total } = data.data || {};
        setSuccess(`Notification sent to ${sent} of ${total} subscriber${total !== 1 ? 's' : ''}${failed > 0 ? ` (${failed} failed)` : ''}.`);
        setForm({ title: '', message: '', imageUrl: '', link: '', target: 'all' });
        loadStats();
      } else {
        setError(data?.message || data?.error || 'Failed to send notification.');
      }
    } catch (err) {
      setError('Failed to send notification: ' + err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleToggleAutoSetting(key) {
    const updated = { ...autoSettings, [key]: !autoSettings[key] };
    setAutoSettings(updated);
    setSavingSettings(true);
    try {
      await apiRequest('/api/notifications/settings', {
        method: 'POST',
        body: JSON.stringify({ siteId: siteConfig.id, ...updated }),
      });
    } catch (err) {
      console.warn('Failed to save push settings:', err.message);
      setAutoSettings(autoSettings);
    } finally {
      setSavingSettings(false);
    }
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>;
  }

  const isConfigured = !!siteConfig?.vapidPublicKey;

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Push Notifications</h2>

      {!isConfigured && (
        <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: 10, padding: '14px 18px', marginBottom: 24, color: '#92400e', fontSize: 14 }}>
          <i className="fas fa-exclamation-triangle" style={{ marginRight: 8 }} />
          Push notifications are not yet configured on this platform. Contact support to enable them.
        </div>
      )}

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Subscribed Users</span>
            <div className="stat-icon" style={{ background: '#eff6ff' }}>
              <i className="fas fa-user-check" style={{ color: '#2563eb' }} />
            </div>
          </div>
          <div className="stat-value">{stats.loggedIn}</div>
          <div className="stat-change">Logged-in users</div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Guest Tokens</span>
            <div className="stat-icon" style={{ background: '#fefce8' }}>
              <i className="fas fa-user-secret" style={{ color: '#f59e0b' }} />
            </div>
          </div>
          <div className="stat-value">{stats.guests}</div>
          <div className="stat-change">Anonymous visitors</div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Total Subscribers</span>
            <div className="stat-icon" style={{ background: '#f0fdf4' }}>
              <i className="fas fa-bell" style={{ color: '#10b981' }} />
            </div>
          </div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-change">All push subscribers</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Send Notification</h3>
          </div>
          <div className="card-content">
            {success && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 16px', color: '#166534', marginBottom: 16, fontSize: 14 }}>
                <i className="fas fa-check-circle" style={{ marginRight: 8 }} />{success}
              </div>
            )}
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: '#dc2626', marginBottom: 16, fontSize: 14 }}>
                <i className="fas fa-exclamation-circle" style={{ marginRight: 8 }} />{error}
              </div>
            )}
            {stats.total === 0 && !error && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', color: '#64748b', marginBottom: 16, fontSize: 13 }}>
                <i className="fas fa-info-circle" style={{ marginRight: 8 }} />No subscribers yet. Customers will see a prompt to subscribe when they visit your store.
              </div>
            )}
            <form onSubmit={handleSend}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Title *</label>
                <input
                  type="text"
                  placeholder="Notification title"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
                  required
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Message *</label>
                <textarea
                  placeholder="Notification message..."
                  value={form.message}
                  onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  required
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Image URL (optional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={form.imageUrl}
                  onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Link (optional)</label>
                <input
                  type="text"
                  placeholder="/products or https://..."
                  value={form.link}
                  onChange={e => setForm(p => ({ ...p, link: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Target Audience</label>
                <select
                  value={form.target}
                  onChange={e => setForm(p => ({ ...p, target: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, background: 'white', boxSizing: 'border-box' }}
                >
                  <option value="all">All Subscribers ({stats.total})</option>
                  <option value="loggedin">Logged-in Users ({stats.loggedIn})</option>
                  <option value="guests">Guest Visitors ({stats.guests})</option>
                </select>
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={sending || !isConfigured}
                style={{ width: '100%' }}
              >
                {sending ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }} />Sending...</> : <><i className="fas fa-paper-plane" style={{ marginRight: 8 }} />Send Notification</>}
              </button>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              Automatic Notifications
              {savingSettings && <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 400, marginLeft: 8 }}><i className="fas fa-spinner fa-spin" style={{ marginRight: 4 }} />Saving...</span>}
            </h3>
          </div>
          <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
              Automatically send notifications when specific events occur in your store.
            </p>
            {[
              { key: 'newProducts', icon: 'fa-box', label: 'New Products', desc: 'Notify subscribers when you add new products' },
              { key: 'priceDrops', icon: 'fa-tag', label: 'Price Drops', desc: 'Alert customers when prices are reduced' },
              { key: 'backInStock', icon: 'fa-redo', label: 'Back in Stock', desc: 'Notify when out-of-stock items return' },
            ].map(item => (
              <div key={item.key} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className={`fas ${item.icon}`} style={{ color: '#2563eb', fontSize: 14 }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{item.desc}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleAutoSetting(item.key)}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    background: autoSettings[item.key] ? '#2563eb' : '#cbd5e1',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background 0.2s',
                    flexShrink: 0,
                    marginLeft: 12,
                  }}
                >
                  <div style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: 'white',
                    position: 'absolute',
                    top: 3,
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
