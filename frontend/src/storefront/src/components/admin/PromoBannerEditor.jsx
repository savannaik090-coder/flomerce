import React, { useState, useEffect, useContext, useRef } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import SectionToggle from './SectionToggle.jsx';
import SaveBar from './SaveBar.jsx';
import { API_BASE } from '../../config.js';

export default function PromoBannerEditor({ onSaved, onPreviewUpdate }) {
  const { siteConfig } = useContext(SiteContext);
  const [messages, setMessages] = useState(['', '', '']);
  const [showSection, setShowSection] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const hasLoadedRef = useRef(false);
  const serverValuesRef = useRef(null);

  useEffect(() => {
    if (siteConfig?.id) loadPromoBanner();
  }, [siteConfig?.id]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    const current = JSON.stringify({ messages, showSection });
    setHasChanges(current !== serverValuesRef.current);
    if (onPreviewUpdate) onPreviewUpdate({ promoBanner: messages.filter(m => m.trim() !== ''), showPromoBanner: showSection });
  }, [messages, showSection]);

  async function loadPromoBanner() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/site?subdomain=${encodeURIComponent(siteConfig.subdomain)}`);
      const result = await response.json();
      if (result.success && result.data) {
        let settings = result.data.settings || {};
        if (typeof settings === 'string') {
          try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
        }
        const existing = settings.promoBanner || [];
        const mVal = [existing[0] || '', existing[1] || '', existing[2] || ''];
        const ssVal = settings.showPromoBanner !== false;
        setMessages(mVal);
        setShowSection(ssVal);
        serverValuesRef.current = JSON.stringify({ messages: mVal, showSection: ssVal });
      }
    } catch (e) {
      console.error('Failed to load promo banner:', e);
    } finally {
      setLoading(false);
      setTimeout(() => { hasLoadedRef.current = true; }, 0);
    }
  }

  async function handleSave(e) {
    if (e && e.preventDefault) e.preventDefault();
    setSaving(true);
    setStatus('');
    try {
      const token = sessionStorage.getItem('site_admin_token');
      const filtered = messages.filter(m => m.trim() !== '');
      const response = await fetch(`${API_BASE}/api/sites/${siteConfig.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `SiteAdmin ${token}` : '',
        },
        body: JSON.stringify({ settings: { promoBanner: filtered, showPromoBanner: showSection } }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setStatus('success');
        serverValuesRef.current = JSON.stringify({ messages, showSection });
        setHasChanges(false);
        if (onSaved) onSaved();
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

  return (
    <div style={{ maxWidth: 700 }}>
      <SaveBar topBar saving={saving} hasChanges={hasChanges} onSave={(e) => handleSave(e || { preventDefault: () => {} })} />
      <form onSubmit={handleSave}>
        <SectionToggle
          enabled={showSection}
          onChange={setShowSection}
          label="Show Promo Banner"
          description="Toggle the scrolling promo banner at the top of your store"
        />
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
                    width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0',
                    borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit',
                  }}
                />
                <div style={{ textAlign: 'right', fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                  {messages[index].length}/120
                </div>
              </div>
            ))}
          </div>
        </div>
        {status && (
          <div style={{
            background: status === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${status === 'success' ? '#bbf7d0' : '#fecaca'}`,
            borderRadius: 8, padding: '12px 16px',
            color: status === 'success' ? '#166534' : '#dc2626',
            marginBottom: 16, fontSize: 14,
          }}>
            {status === 'success' ? 'Promo banner saved successfully!' : status.replace('error:', 'Failed to save: ')}
          </div>
        )}
        <SaveBar saving={saving} hasChanges={hasChanges} onSave={(e) => handleSave(e || { preventDefault: () => {} })} />
      </form>
    </div>
  );
}
