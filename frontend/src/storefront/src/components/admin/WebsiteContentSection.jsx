import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import CategoriesSection from './CategoriesSection.jsx';
import WatchBuySection from './WatchBuySection.jsx';
import HeroSliderEditor from './HeroSliderEditor.jsx';
import WelcomeBannerEditor from './WelcomeBannerEditor.jsx';
import FeaturedVideoEditor from './FeaturedVideoEditor.jsx';
import CustomerReviewsEditor from './CustomerReviewsEditor.jsx';
import AboutUsEditor from './AboutUsEditor.jsx';
import TermsEditor from './TermsEditor.jsx';
import PrivacyEditor from './PrivacyEditor.jsx';
import FooterEditor from './FooterEditor.jsx';
import StoreLocationsEditor from './StoreLocationsEditor.jsx';

const SUB_TABS = [
  { id: 'promo-banner', icon: 'fa-bullhorn', label: 'Promo Banner', page: '/' },
  { id: 'hero-slider', icon: 'fa-images', label: 'Hero Slider', page: '/' },
  { id: 'welcome-banner', icon: 'fa-hand-sparkles', label: 'Welcome Banner', page: '/' },
  { id: 'categories', icon: 'fa-folder', label: 'Categories', page: '/' },
  { id: 'watchbuy', icon: 'fa-video', label: 'Watch & Buy', page: '/' },
  { id: 'featured-video', icon: 'fa-film', label: 'Featured Video', page: '/' },
  { id: 'customer-reviews', icon: 'fa-star', label: 'Customer Reviews', page: '/' },
  { id: 'store-locations', icon: 'fa-store', label: 'Store Locations', page: '/' },
  { id: 'about-us', icon: 'fa-info-circle', label: 'About Us', page: '/about' },
  { id: 'terms', icon: 'fa-file-contract', label: 'Terms & Conditions', page: '/terms' },
  { id: 'privacy', icon: 'fa-user-shield', label: 'Privacy Policy', page: '/privacy-policy' },
  { id: 'footer', icon: 'fa-shoe-prints', label: 'Footer', page: '/' },
];

function getStoreUrl(siteConfig) {
  if (!siteConfig?.subdomain) return '';
  const host = window.location.hostname;
  if (host.endsWith('fluxe.in')) {
    return `https://${siteConfig.subdomain}.fluxe.in`;
  }
  return `${window.location.protocol}//${window.location.host}`;
}

export default function WebsiteContentSection() {
  const { siteConfig } = useContext(SiteContext);
  const [activeTab, setActiveTab] = useState('promo-banner');
  const [showPreview, setShowPreview] = useState(true);
  const [previewKey, setPreviewKey] = useState(0);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const iframeRef = useRef(null);
  const mobileIframeRef = useRef(null);

  const storeBaseUrl = getStoreUrl(siteConfig);
  const currentTab = SUB_TABS.find(t => t.id === activeTab);
  const previewUrl = storeBaseUrl ? `${storeBaseUrl}${currentTab?.page || '/'}` : '';

  const refreshPreview = useCallback(() => {
    setPreviewKey(k => k + 1);
  }, []);

  const sendPreviewUpdate = useCallback((settingsPatch) => {
    [iframeRef.current, mobileIframeRef.current].forEach(frame => {
      try {
        if (frame?.contentWindow) {
          frame.contentWindow.postMessage({ type: 'FLUXE_PREVIEW_UPDATE', settings: settingsPatch }, '*');
        }
      } catch (e) {}
    });
  }, []);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 900);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
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

        {isMobile && previewUrl && (
          <button
            type="button"
            onClick={() => { setShowMobilePreview(true); setPreviewKey(k => k + 1); }}
            style={{
              flexShrink: 0,
              padding: '8px 14px',
              borderRadius: 6,
              border: '2px solid #2563eb',
              background: '#2563eb',
              color: '#fff',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'inherit',
            }}
          >
            <i className="fas fa-eye" style={{ fontSize: 12 }} />
            Preview
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 0', minWidth: 0 }}>
          {activeTab === 'promo-banner' && <PromoBannerEditor onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />}
          {activeTab === 'hero-slider' && <HeroSliderEditor onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />}
          {activeTab === 'welcome-banner' && <WelcomeBannerEditor onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />}
          {activeTab === 'categories' && <CategoriesSection onSaved={refreshPreview} />}
          {activeTab === 'watchbuy' && <WatchBuySection onSaved={refreshPreview} />}
          {activeTab === 'featured-video' && <FeaturedVideoEditor onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />}
          {activeTab === 'customer-reviews' && <CustomerReviewsEditor onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />}
          {activeTab === 'store-locations' && <StoreLocationsEditor onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />}
          {activeTab === 'about-us' && <AboutUsEditor onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />}
          {activeTab === 'terms' && <TermsEditor onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />}
          {activeTab === 'privacy' && <PrivacyEditor onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />}
          {activeTab === 'footer' && <FooterEditor onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />}
        </div>

        {!isMobile && showPreview && previewUrl && (
          <div style={{ width: 380, flexShrink: 0, position: 'sticky', top: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                <i className="fas fa-eye" style={{ marginRight: 6, fontSize: 12 }} />
                Live Preview
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={refreshPreview}
                  title="Refresh preview"
                  style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 4, cursor: 'pointer', padding: '4px 8px', fontSize: 12, color: '#64748b' }}
                >
                  <i className="fas fa-sync-alt" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  title="Hide preview"
                  style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 4, cursor: 'pointer', padding: '4px 8px', fontSize: 12, color: '#64748b' }}
                >
                  <i className="fas fa-times" />
                </button>
              </div>
            </div>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
              <iframe
                ref={iframeRef}
                key={previewKey}
                src={previewUrl}
                style={{ width: '100%', height: 600, border: 'none', display: 'block' }}
                title="Store Preview"
              />
            </div>
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, textAlign: 'center' }}>
              Preview updates as you type. Save to make changes permanent.
            </p>
          </div>
        )}
      </div>

      {!isMobile && !showPreview && previewUrl && (
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          style={{
            position: 'fixed', bottom: 20, right: 20, zIndex: 100,
            background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8,
            padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <i className="fas fa-eye" /> Show Preview
        </button>
      )}

      {isMobile && showMobilePreview && previewUrl && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: '#fff', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderBottom: '1px solid #e2e8f0',
            background: '#fff', flexShrink: 0,
          }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
              <i className="fas fa-eye" style={{ marginRight: 6, color: '#2563eb' }} />
              Live Preview
            </span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                type="button"
                onClick={refreshPreview}
                title="Refresh preview"
                style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 4, cursor: 'pointer', padding: '6px 10px', fontSize: 13, color: '#64748b' }}
              >
                <i className="fas fa-sync-alt" />
              </button>
              <button
                type="button"
                onClick={() => setShowMobilePreview(false)}
                title="Close preview"
                style={{
                  background: '#f1f5f9', border: 'none', borderRadius: 4, cursor: 'pointer',
                  padding: '6px 12px', fontSize: 13, color: '#334155', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <i className="fas fa-arrow-left" /> Back
              </button>
            </div>
          </div>
          <iframe
            ref={mobileIframeRef}
            key={previewKey}
            src={previewUrl}
            style={{ flex: 1, width: '100%', border: 'none', display: 'block' }}
            title="Store Preview"
          />
        </div>
      )}
    </div>
  );
}

function PromoBannerEditor({ onSaved, onPreviewUpdate }) {
  const { siteConfig } = useContext(SiteContext);
  const [messages, setMessages] = useState(['', '', '']);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (siteConfig?.id) loadPromoBanner();
  }, [siteConfig?.id]);

  useEffect(() => {
    if (!hasLoadedRef.current || !onPreviewUpdate) return;
    onPreviewUpdate({ promoBanner: messages.filter(m => m.trim() !== '') });
  }, [messages]);

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
      hasLoadedRef.current = true;
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
