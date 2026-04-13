import React, { useState, useEffect, useContext, useRef, useCallback, useMemo } from 'react';
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
import TrendingNowEditor from './TrendingNowEditor.jsx';
import BrandStoryEditor from './BrandStoryEditor.jsx';
import CheckoutEditor from './CheckoutEditor.jsx';
import ProductPoliciesEditor from './ProductPoliciesEditor.jsx';
import NavbarEditor from './NavbarEditor.jsx';
import BookAppointmentEditor from './BookAppointmentEditor.jsx';
import ContactEditor from './ContactEditor.jsx';
import FAQSection from './FAQSection.jsx';
import BlogSection from './BlogSection.jsx';
import PromoBannerEditor from './PromoBannerEditor.jsx';
import SectionToggle from './SectionToggle.jsx';
import SaveBar from './SaveBar.jsx';
import FeatureGate, { isFeatureAvailable, getRequiredPlan, PlanBadge } from './FeatureGate.jsx';
import VisualCustomizer from './VisualCustomizer.jsx';
import { API_BASE, PLATFORM_DOMAIN } from '../../config.js';

function buildTabGroups(templateId) {
  const isModern = templateId === 'modern';
  const isClassic = !isModern;

  const homepageTabs = [
    { id: 'navbar',            icon: 'fa-bars',          label: 'Navbar',           page: '/' },
    { id: 'promo-banner',      icon: 'fa-bullhorn',      label: 'Promo Banner',     page: '/' },
    { id: 'hero-slider',       icon: 'fa-images',        label: 'Hero Slider',      page: '/' },
    { id: 'welcome-banner',    icon: 'fa-hand-sparkles', label: 'Welcome Banner',   page: '/' },
    { id: 'categories',        icon: 'fa-folder',        label: 'Categories',       page: '/' },
    { id: 'customer-reviews',  icon: 'fa-star',          label: 'Customer Reviews', page: '/' },
    { id: 'footer',            icon: 'fa-shoe-prints',   label: 'Footer',           page: '/' },
  ];

  const classicTabs = [
    { id: 'watchbuy',          icon: 'fa-video',         label: 'Watch & Buy',      page: '/' },
    { id: 'featured-video',    icon: 'fa-film',          label: 'Featured Video',   page: '/' },
    { id: 'shop-the-look',     icon: 'fa-crosshairs',    label: 'Shop the Look',    page: '/' },
    { id: 'store-locations',   icon: 'fa-store',         label: 'Store Locations',  page: '/' },
  ];

  const modernTabs = [
    { id: 'trending-now',      icon: 'fa-fire',          label: 'Trending Now',     page: '/' },
    { id: 'brand-story',       icon: 'fa-book-open',     label: 'Brand Story',      page: '/' },
  ];

  const groups = [
    { group: 'Homepage', icon: 'fa-home', tabs: homepageTabs },
  ];

  if (isClassic) {
    groups.push({ group: 'Classic Theme', icon: 'fa-gem', tabs: classicTabs });
  }
  if (isModern) {
    groups.push({ group: 'Modern Theme', icon: 'fa-wand-magic-sparkles', tabs: modernTabs });
  }

  return groups;
}

const STATIC_GROUPS = [
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

function getStoreUrl(siteConfig) {
  if (!siteConfig?.subdomain) return '';
  const host = window.location.hostname;
  if (host.endsWith(PLATFORM_DOMAIN)) {
    return `https://${siteConfig.subdomain}.${PLATFORM_DOMAIN}`;
  }
  return `${window.location.protocol}//${window.location.host}`;
}

const GATED_TABS = { 'blog': 'blog', 'customer-reviews': 'reviews' };

export default function WebsiteContentSection({ currentPlan }) {
  const { siteConfig } = useContext(SiteContext);
  const [activeTab, setActiveTab] = useState('navbar');
  const [showPreview, setShowPreview] = useState(true);
  const [previewKey, setPreviewKey] = useState(0);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [showVisualCustomizer, setShowVisualCustomizer] = useState(false);
  const iframeRef = useRef(null);
  const mobileIframeRef = useRef(null);

  const resolvedTheme = useMemo(() => {
    let settings = siteConfig?.settings || {};
    if (typeof settings === 'string') {
      try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
    }
    return settings.theme || siteConfig?.templateId || 'classic';
  }, [siteConfig?.settings, siteConfig?.templateId]);
  const TAB_GROUPS = useMemo(() => [...buildTabGroups(resolvedTheme), ...STATIC_GROUPS], [resolvedTheme]);
  const ALL_TABS = useMemo(() => TAB_GROUPS.flatMap(g => g.tabs), [TAB_GROUPS]);

  const storeBaseUrl = getStoreUrl(siteConfig);
  const currentTab = ALL_TABS.find(t => t.id === activeTab);
  const previewUrl = storeBaseUrl ? `${storeBaseUrl}${currentTab?.page || '/'}` : '';

  const refreshPreview = useCallback(() => {
    setPreviewKey(Date.now());
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

  if (showVisualCustomizer && !isMobile) {
    return <VisualCustomizer currentPlan={currentPlan} onBack={() => setShowVisualCustomizer(false)} />;
  }

  return (
    <div>
      {!isMobile && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16, padding: '12px 16px',
          background: 'linear-gradient(135deg, #eff6ff, #f0f9ff)',
          borderRadius: 10, border: '1px solid #bfdbfe',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fas fa-palette" style={{ fontSize: 16, color: '#2563eb' }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1e40af' }}>Visual Customizer</div>
              <div style={{ fontSize: 12, color: '#3b82f6', marginTop: 1 }}>
                Full-screen editor with live preview, section toggles, and device preview
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowVisualCustomizer(true)}
            style={{
              padding: '8px 18px',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
              display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: 'inherit',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(37,99,235,0.3)'; }}
          >
            <i className="fas fa-external-link-alt" style={{ fontSize: 11 }} />
            Open
          </button>
        </div>
      )}

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
                        const gatedFeature = GATED_TABS[tab.id];
                        const isLocked = gatedFeature && !isFeatureAvailable(currentPlan, gatedFeature);
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
                              color: isLocked ? '#94a3b8' : isActive ? '#2563eb' : '#334155',
                              fontWeight: isActive ? 600 : 400,
                              fontSize: 14,
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                              textAlign: 'left',
                            }}
                          >
                            <i className={`fas ${isLocked ? 'fa-lock' : tab.icon}`} style={{
                              fontSize: 13,
                              width: 18,
                              textAlign: 'center',
                              color: isLocked ? '#94a3b8' : isActive ? '#2563eb' : '#94a3b8',
                            }} />
                            {tab.label}
                            {isLocked && <PlanBadge plan={getRequiredPlan(gatedFeature)} small />}
                            {!isLocked && isActive && (
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
                  const gatedFeature = GATED_TABS[tab.id];
                  const isLocked = gatedFeature && !isFeatureAvailable(currentPlan, gatedFeature);
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
                        color: isLocked ? '#94a3b8' : isActive ? '#2563eb' : '#475569',
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
                      <i className={`fas ${isLocked ? 'fa-lock' : tab.icon}`} style={{ fontSize: 11, width: 14, textAlign: 'center', opacity: isLocked ? 0.5 : isActive ? 1 : 0.6 }} />
                      {tab.label}
                      {isLocked && <PlanBadge plan={getRequiredPlan(gatedFeature)} small />}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        )}

        <div style={{ flex: '1 1 0', minWidth: 0 }}>
          {activeTab === 'navbar' && <NavbarEditor onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />}
          {activeTab === 'promo-banner' && <PromoBannerEditor key="promo-banner-editor" onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />}
          {activeTab === 'hero-slider' && <HeroSliderEditor onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />}
          {activeTab === 'welcome-banner' && <WelcomeBannerEditor onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />}
          {activeTab === 'categories' && <CategoriesSection onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />}
          {activeTab === 'watchbuy' && <WatchBuySection onSaved={refreshPreview} />}
          {activeTab === 'featured-video' && <FeaturedVideoEditor onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />}
          {activeTab === 'customer-reviews' && (
            <FeatureGate currentPlan={currentPlan} requiredPlan="growth" featureName="Customer Reviews">
              <CustomerReviewsEditor onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />
            </FeatureGate>
          )}
          {activeTab === 'shop-the-look' && <ShopTheLookEditor onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />}
          {activeTab === 'trending-now' && <TrendingNowEditor onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />}
          {activeTab === 'brand-story' && <BrandStoryEditor onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />}
          {activeTab === 'store-locations' && <StoreLocationsEditor onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />}
          {activeTab === 'book-appointment' && <BookAppointmentEditor onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />}
          {activeTab === 'contact-us' && <ContactEditor onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />}
          {activeTab === 'checkout' && <CheckoutEditor onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />}
          {activeTab === 'product-policies' && <ProductPoliciesEditor onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />}
          {activeTab === 'about-us' && <AboutUsEditor onSaved={refreshPreview} onPreviewUpdate={sendPreviewUpdate} />}
          {activeTab === 'faq' && <FAQSection />}
          {activeTab === 'blog' && (
            <FeatureGate currentPlan={currentPlan} requiredPlan="growth" featureName="Blog">
              <BlogSection />
            </FeatureGate>
          )}
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
                src={`${previewUrl}${previewUrl.includes('?') ? '&' : '?'}_t=${previewKey}`}
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
              src={`${previewUrl}${previewUrl.includes('?') ? '&' : '?'}_t=${previewKey}`}
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

