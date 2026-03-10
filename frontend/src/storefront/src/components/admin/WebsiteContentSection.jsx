import React, { useState, useEffect, useContext } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import CategoriesSection from './CategoriesSection.jsx';
import WatchBuySection from './WatchBuySection.jsx';
import HeroSliderEditor from './HeroSliderEditor.jsx';
import WelcomeBannerEditor from './WelcomeBannerEditor.jsx';

const SUB_TABS = [
  { id: 'promo-banner', icon: 'fa-bullhorn', label: 'Promo Banner' },
  { id: 'hero-slider', icon: 'fa-images', label: 'Hero Slider' },
  { id: 'welcome-banner', icon: 'fa-hand-sparkles', label: 'Welcome Banner' },
  { id: 'categories', icon: 'fa-folder', label: 'Categories' },
  { id: 'watchbuy', icon: 'fa-video', label: 'Watch & Buy' },
];

export default function WebsiteContentSection() {
  const { siteConfig, refetchSite } = useContext(SiteContext);
  const [activeTab, setActiveTab] = useState('promo-banner');

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {SUB_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: activeTab === tab.id ? '2px solid #2563eb' : '1px solid #e2e8f0',
              background: activeTab === tab.id ? '#eff6ff' : '#fff',
              color: activeTab === tab.id ? '#2563eb' : '#64748b',
              fontWeight: activeTab === tab.id ? 600 : 400,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'inherit',
            }}
          >
            <i className={`fas ${tab.icon}`} style={{ fontSize: 12 }} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'promo-banner' && <PromoBannerEditor />}
      {activeTab === 'hero-slider' && <HeroSliderEditor />}
      {activeTab === 'welcome-banner' && <WelcomeBannerEditor />}
      {activeTab === 'categories' && <CategoriesSection />}
      {activeTab === 'watchbuy' && <WatchBuySection />}
    </div>
  );
}

function PromoBannerEditor() {
  const { siteConfig } = useContext(SiteContext);
  const [messages, setMessages] = useState(['', '', '']);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (siteConfig?.id) loadPromoBanner();
  }, [siteConfig?.id]);

  async function loadPromoBanner() {
    setLoading(true);
    try {
      const API_BASE = typeof window !== 'undefined' && window.location.hostname.endsWith('fluxe.in') ? '' : 'https://fluxe.in';
      const response = await fetch(`${API_BASE}/api/site?subdomain=${encodeURIComponent(siteConfig.subdomain)}`);
      const result = await response.json();
      if (result.success && result.data) {
        let settings = result.data.settings || {};
        if (typeof settings === 'string') {
          try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
        }
        const existing = settings.promoBanner || [];
        setMessages([
          existing[0] || '',
          existing[1] || '',
          existing[2] || '',
        ]);
      }
    } catch (e) {
      console.error('Failed to load promo banner:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setStatus('');
    try {
      const API_BASE = typeof window !== 'undefined' && window.location.hostname.endsWith('fluxe.in') ? '' : 'https://fluxe.in';
      const token = sessionStorage.getItem('site_admin_token');

      const filtered = messages.filter(m => m.trim() !== '');

      const response = await fetch(`${API_BASE}/api/sites/${siteConfig.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `SiteAdmin ${token}` : '',
        },
        body: JSON.stringify({ settings: { promoBanner: filtered } }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setStatus('success');
      } else {
        setStatus('error:' + (result.error || 'Unknown error'));
      }
    } catch (e) {
      setStatus('error:' + e.message);
    } finally {
      setSaving(false);
    }
  }

  function updateMessage(index, value) {
    setMessages(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  }

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  const hasMessages = messages.some(m => m.trim() !== '');

  return (
    <div style={{ maxWidth: 700 }}>
      <form onSubmit={handleSave}>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Promo Banner Messages</h3>
          </div>
          <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Add up to 3 messages that scroll horizontally across the top of your store. Leave empty to show the default welcome message.
            </p>

            {[0, 1, 2].map(index => (
              <div key={index} style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
                  Message {index + 1} {index === 0 ? '' : '(optional)'}
                </label>
                <input
                  type="text"
                  value={messages[index]}
                  onChange={e => updateMessage(index, e.target.value)}
                  placeholder={index === 0 ? 'e.g., Free shipping on orders above ₹999' : index === 1 ? 'e.g., New collection now available!' : 'e.g., Use code SAVE10 for 10% off'}
                  maxLength={120}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    fontSize: 14,
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
                <div style={{ textAlign: 'right', fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                  {messages[index].length}/120
                </div>
              </div>
            ))}

            {hasMessages && (
              <div style={{ marginTop: 8 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, fontSize: 13 }}>Preview</label>
                <div style={{
                  background: '#b3a681',
                  color: '#333',
                  padding: '7px 0',
                  borderRadius: 6,
                  overflow: 'hidden',
                  position: 'relative',
                }}>
                  <p style={{
                    margin: 0,
                    display: 'inline-block',
                    whiteSpace: 'nowrap',
                    willChange: 'transform',
                    animation: 'scroll-left 12s linear infinite',
                    fontSize: 13,
                    letterSpacing: '1.5px',
                    wordSpacing: '4px',
                  }}>
                    {(() => {
                      const filtered = messages.filter(m => m.trim());
                      const sep = <span style={{ padding: '0 30px', opacity: 0.5 }}>{'\u2726'}</span>;
                      const block = filtered.flatMap((m, i) => i < filtered.length - 1 ? [m, sep] : [m]);
                      return <>{block}{sep}{block}{sep}{block}{sep}{block}</>;
                    })()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {status && (
          <div style={{
            background: status === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${status === 'success' ? '#bbf7d0' : '#fecaca'}`,
            borderRadius: 8,
            padding: '12px 16px',
            color: status === 'success' ? '#166534' : '#dc2626',
            marginBottom: 16,
            fontSize: 14,
          }}>
            {status === 'success' ? 'Promo banner saved successfully!' : status.replace('error:', 'Failed to save: ')}
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={saving} style={{ width: '100%' }}>
          {saving ? 'Saving...' : 'Save Promo Banner'}
        </button>
      </form>
    </div>
  );
}
