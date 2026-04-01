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
import ShopTheLookEditor from './ShopTheLookEditor.jsx';
import CheckoutEditor from './CheckoutEditor.jsx';
import ProductPoliciesEditor from './ProductPoliciesEditor.jsx';
import NavbarEditor from './NavbarEditor.jsx';
import BookAppointmentEditor from './BookAppointmentEditor.jsx';
import ContactEditor from './ContactEditor.jsx';
import FAQSection from './FAQSection.jsx';
import BlogSection from './BlogSection.jsx';
import SectionToggle from './SectionToggle.jsx';
import SaveBar from './SaveBar.jsx';

const TAB_GROUPS = [
  {
    group: 'Homepage',
    icon: 'fa-home',
    tabs: [
      { id: 'navbar',            icon: 'fa-bars',          label: 'Navbar',           page: '/' },
      { id: 'promo-banner',      icon: 'fa-bullhorn',      label: 'Promo Banner',     page: '/' },
      { id: 'hero-slider',       icon: 'fa-images',        label: 'Hero Slider',      page: '/' },
      { id: 'welcome-banner',    icon: 'fa-hand-sparkles', label: 'Welcome Banner',   page: '/' },
      { id: 'categories',        icon: 'fa-folder',        label: 'Categories',       page: '/' },
      { id: 'watchbuy',          icon: 'fa-video',         label: 'Watch & Buy',      page: '/' },
      { id: 'featured-video',    icon: 'fa-film',          label: 'Featured Video',   page: '/' },
      { id: 'customer-reviews',  icon: 'fa-star',          label: 'Customer Reviews', page: '/' },
      { id: 'shop-the-look',     icon: 'fa-crosshairs',    label: 'Shop the Look',    page: '/' },
      { id: 'store-locations',   icon: 'fa-store',         label: 'Store Locations',  page: '/' },
      { id: 'footer',            icon: 'fa-shoe-prints',   label: 'Footer',           page: '/' },
    ],
  },
  {
    group: 'Pages',
    icon: 'fa-file-alt',
    tabs: [
      { id: 'about-us',          icon: 'fa-info-circle',    label: 'About Us',         page: '/about' },
      { id: 'contact-us',        icon: 'fa-envelope',       label: 'Contact Us',       page: '/contact' },
      { id: 'book-appointment',  icon: 'fa-calendar-check', label: 'Book Appointment', page: '/book-appointment' },
      { id: 'faq',               icon: 'fa-question-circle', label: 'FAQ',             page: '/faq' },
      { id: 'blog',              icon: 'fa-pen-fancy',      label: 'Blog',            page: '/blog' },
    ],
  },
  {
    group: 'Checkout & Policies',
    icon: 'fa-shopping-bag',
    tabs: [
      { id: 'checkout',          icon: 'fa-shopping-bag',   label: 'Checkout',         page: '/' },
      { id: 'product-policies',  icon: 'fa-shield-alt',     label: 'Product Policies', page: '/' },
    ],
  },
  {
    group: 'Legal',
    icon: 'fa-gavel',
    tabs: [
      { id: 'terms',             icon: 'fa-file-contract',  label: 'Terms & Conditions', page: '/terms' },
      { id: 'privacy',           icon: 'fa-user-shield',    label: 'Privacy Policy',     page: '/privacy-policy' },
    ],
  },
];

const ALL_TABS = TAB_GROUPS.flatMap(g => g.tabs);

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
  const [activeTab, setActiveTab] = useState('navbar');
  const [showPreview, setShowPreview] = useState(true);
  const [previewKey, setPreviewKey] = useState(0);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const iframeRef = useRef(null);
  const mobileIframeRef = useRef(null);

  const storeBaseUrl = getStoreUrl(siteConfig);
  const currentTab = ALL_TABS.find(t => t.id === activeTab);
  const previewUrl = storeBaseUrl ? `${storeBaseUrl}${currentTab?.page || '/'}` : '';

  const refreshPreview = useCallback(() => {
    setPreviewKey(k => k + 1);
  }, []);

  const accumulatedSettingsRef = useRef({});

  const sendPreviewUpdate = useCallback((settingsPatch) => {
    accumulatedSettingsRef.current = { ...accumulatedSettingsRef.current, ...settingsPatch };
    [iframeRef.current, mobileIframeRef.current].forEach(frame => {
      try {
        if (frame?.contentWindow) {
          frame.contentWindow.postMessage({ type: 'FLUXE_PREVIEW_UPDATE', settings: settingsPatch }, '*');
        }
      } catch (e) {}
    });
  }, []);

  const replayPreviewToMobile = useCallback(() => {
    if (Object.keys(accumulatedSettingsRef.current).length === 0) return;
    const tryPost = (attempts) => {
      try {
        if (mobileIframeRef.current?.contentWindow) {
          mobileIframeRef.current.contentWindow.postMessage(
            { type: 'FLUXE_PREVIEW_UPDATE', settings: accumulatedSettingsRef.current }, '*'
          );
        }
      } catch (e) {}
      if (attempts > 1) setTimeout(() => tryPost(attempts - 1), 600);
    };
    setTimeout(() => tryPost(3), 400);
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
      {isMobile && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setShowMobileNav(true)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                background: '#fff',
                fontSize: 14,
                fontWeight: 500,
                color: '#1e293b',
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className={`fas ${currentTab?.icon || 'fa-bars'}`} style={{ fontSize: 13, color: '#2563eb' }} />
                {currentTab?.label || 'Select Section'}
              </span>
              <i className="fas fa-chevron-down" style={{ fontSize: 11, color: '#94a3b8' }} />
            </button>
            {previewUrl && (
              <button
                type="button"
                onClick={() => { setShowMobilePreview(true); setPreviewKey(k => k + 1); }}
                style={{
                  flexShrink: 0,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: 'none',
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

          {showMobileNav && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
              }}
            >
              <div
                onClick={() => setShowMobileNav(false)}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.4)',
                }}
              />
              <div style={{
                position: 'relative',
                background: '#fff',
                borderRadius: '16px 16px 0 0',
                maxHeight: '75vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 18px 12px',
                  borderBottom: '1px solid #f1f5f9',
                  flexShrink: 0,
                }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Edit Section</span>
                  <button
                    type="button"
                    onClick={() => setShowMobileNav(false)}
                    style={{
                      background: '#f1f5f9',
                      border: 'none',
                      borderRadius: '50%',
                      width: 32,
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#64748b',
                      fontSize: 14,
                    }}
                  >
                    <i className="fas fa-times" />
                  </button>
                </div>

                <div style={{ overflowY: 'auto', padding: '8px 0 16px' }}>
                  {TAB_GROUPS.map((group, gi) => (
                    <div key={group.group}>
                      {gi > 0 && <div style={{ height: 1, background: '#f1f5f9', margin: '6px 18px' }} />}
                      <div style={{
                        padding: '10px 18px 4px',
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: '#94a3b8',
                      }}>
                        <i className={`fas ${group.icon}`} style={{ marginRight: 6, fontSize: 10 }} />
                        {group.group}
                      </div>
                      {group.tabs.map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); setShowMobileNav(false); }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              width: '100%',
                              padding: '12px 18px',
                              border: 'none',
                              background: isActive ? '#eff6ff' : 'transparent',
                              color: isActive ? '#2563eb' : '#334155',
                              fontWeight: isActive ? 600 : 400,
                              fontSize: 14,
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                              textAlign: 'left',
                            }}
                          >
                            <i className={`fas ${tab.icon}`} style={{
                              fontSize: 13,
                              width: 18,
                              textAlign: 'center',
                              color: isActive ? '#2563eb' : '#94a3b8',
                            }} />
                            {tab.label}
                            {isActive && (
                              <i className="fas fa-check" style={{ marginLeft: 'auto', fontSize: 12, color: '#2563eb' }} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {!isMobile && (
          <nav style={{
            width: 200,
            flexShrink: 0,
            position: 'sticky',
            top: 20,
            maxHeight: 'calc(100vh - 40px)',
            overflowY: 'auto',
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
          }}>
            {TAB_GROUPS.map((group, gi) => (
              <div key={group.group}>
                {gi > 0 && <div style={{ height: 1, background: '#e2e8f0' }} />}
                <div style={{
                  padding: '10px 14px 4px',
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#94a3b8',
                }}>
                  <i className={`fas ${group.icon}`} style={{ marginRight: 6, fontSize: 9 }} />
                  {group.group}
                </div>
                {group.tabs.map(tab => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        width: '100%',
                        padding: '8px 14px',
                        border: 'none',
                        background: isActive ? '#eff6ff' : 'transparent',
                        color: isActive ? '#2563eb' : '#475569',
                        fontWeight: isActive ? 600 : 400,
                        fontSize: 13,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        textAlign: 'left',
                        borderLeft: isActive ? '3px solid #2563eb' : '3px solid transparent',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = '#f8fafc'; } }}
                      onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; } }}
                    >
                      <i className={`fas ${tab.icon}`} style={{ fontSize: 11, width: 14, textAlign: 'center', opacity: isActive ? 1 : 0.6 }} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        )}

        <div style={{ flex: '1 1 0', minWidth: 0 }}>
          {activeTab === 'navbar' && <NavbarEditor onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />}
          {activeTab === 'promo-banner' && <PromoBannerEditor onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />}
          {activeTab === 'hero-slider' && <HeroSliderEditor onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />}
          {activeTab === 'welcome-banner' && <WelcomeBannerEditor onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />}
          {activeTab === 'categories' && <CategoriesSection onSaved={refreshPreview} />}
          {activeTab === 'watchbuy' && <WatchBuySection onSaved={refreshPreview} />}
          {activeTab === 'featured-video' && <FeaturedVideoEditor onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />}
          {activeTab === 'customer-reviews' && <CustomerReviewsEditor onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />}
          {activeTab === 'shop-the-look' && <ShopTheLookEditor onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />}
          {activeTab === 'store-locations' && <StoreLocationsEditor onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />}
          {activeTab === 'book-appointment' && <BookAppointmentEditor onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />}
          {activeTab === 'contact-us' && <ContactEditor onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />}
          {activeTab === 'checkout' && <CheckoutEditor onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />}
          {activeTab === 'product-policies' && <ProductPoliciesEditor onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />}
          {activeTab === 'about-us' && <AboutUsEditor onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />}
          {activeTab === 'faq' && <FAQSection />}
          {activeTab === 'blog' && <BlogSection />}
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

      {isMobile && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: '#fff', display: 'flex', flexDirection: 'column',
          visibility: showMobilePreview ? 'visible' : 'hidden',
          pointerEvents: showMobilePreview ? 'auto' : 'none',
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
          {previewUrl && (
            <iframe
              ref={mobileIframeRef}
              key={previewKey}
              src={previewUrl}
              onLoad={replayPreviewToMobile}
              style={{ flex: 1, width: '100%', border: 'none', display: 'block' }}
              title="Store Preview"
            />
          )}
        </div>
      )}
    </div>
  );
}

function PromoBannerEditor({ onSaved, onPreviewUpdate }) {
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
      const API_BASE = typeof window !== 'undefined' && window.location.hostname.endsWith('fluxe.in') ? '' : 'https://fluxe.in';
      const response = await fetch(`${API_BASE}/api/site?subdomain=${encodeURIComponent(siteConfig.subdomain)}`);
      const result = await response.json();
      if (result.success && result.data) {
        let settings = result.data.settings || {};
        if (typeof settings === 'string') {
          try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
        }
        const existing = settings.promoBanner || [];
        const mVal = [
          existing[0] || '',
          existing[1] || '',
          existing[2] || '',
        ];
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

        <SaveBar saving={saving} hasChanges={hasChanges} onSave={(e) => handleSave(e || { preventDefault: () => {} })} />
      </form>
    </div>
  );
}
