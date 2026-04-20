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
import FeatureGate, { isFeatureAvailable, getRequiredPlan, PlanBadge } from './FeatureGate.jsx';
import { API_BASE, PLATFORM_DOMAIN } from '../../config.js';

function getStoreUrl(siteConfig) {
  if (!siteConfig?.subdomain) return '';
  const host = window.location.hostname;
  if (host.endsWith(PLATFORM_DOMAIN)) {
    return `https://${siteConfig.subdomain}.${PLATFORM_DOMAIN}`;
  }
  return `${window.location.protocol}//${window.location.host}`;
}

function getHomepageSections(theme) {
  const isModern = theme === 'modern';
  const sections = [
    { id: 'navbar', label: 'Navigation', icon: 'fa-bars', showKey: null, fixed: true },
    { id: 'promo-banner', label: 'Promo Banner', icon: 'fa-bullhorn', showKey: 'showPromoBanner' },
    { id: 'hero-slider', label: 'Hero Banner', icon: 'fa-images', showKey: null, fixed: true },
    { id: 'welcome-banner', label: 'Welcome Banner', icon: 'fa-hand-sparkles', showKey: 'showWelcomeBanner' },
    { id: 'categories', label: 'Categories', icon: 'fa-th-large', showKey: null, fixed: true },
  ];

  if (!isModern) {
    sections.push(
      { id: 'watchbuy', label: 'Watch & Buy', icon: 'fa-video', showKey: 'showWatchAndBuy' },
      { id: 'featured-video', label: 'Featured Video', icon: 'fa-film', showKey: 'showFeaturedVideo' },
      { id: 'shop-the-look', label: 'Shop the Look', icon: 'fa-crosshairs', showKey: 'showShopTheLook' },
      { id: 'store-locations', label: 'Store Locations', icon: 'fa-map-marker-alt', showKey: 'showStoreLocations' },
    );
  } else {
    sections.push(
      { id: 'trending-now', label: 'Trending Now', icon: 'fa-fire', showKey: 'showTrendingNow' },
      { id: 'brand-story', label: 'Brand Story', icon: 'fa-book-open', showKey: 'showBrandStory' },
    );
  }

  sections.push(
    { id: 'customer-reviews', label: 'Customer Reviews', icon: 'fa-star', showKey: 'showCustomerReviews' },
    { id: 'footer', label: 'Footer', icon: 'fa-columns', showKey: null, fixed: true },
  );

  return sections;
}

const PAGE_SECTIONS = [
  { id: 'about-us', label: 'About Us', icon: 'fa-info-circle', page: '/about' },
  { id: 'contact-us', label: 'Contact Us', icon: 'fa-envelope', page: '/contact' },
  { id: 'book-appointment', label: 'Book Appointment', icon: 'fa-calendar-check', page: '/book-appointment' },
  { id: 'faq', label: 'FAQ', icon: 'fa-question-circle', page: '/faq' },
  { id: 'blog', label: 'Blog', icon: 'fa-pen-fancy', page: '/blog', gated: 'blog' },
];

const SETTINGS_SECTIONS = [
  { id: 'checkout', label: 'Checkout', icon: 'fa-shopping-bag' },
  { id: 'product-policies', label: 'Product Policies', icon: 'fa-shield-alt' },
  { id: 'terms', label: 'Terms & Conditions', icon: 'fa-file-contract', page: '/terms' },
  { id: 'privacy', label: 'Privacy Policy', icon: 'fa-user-shield', page: '/privacy-policy' },
];

const GATED_TABS = { 'blog': 'blog', 'customer-reviews': 'reviews' };

function getViewport() {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

export default function VisualCustomizer({ currentPlan, onBack }) {
  const { siteConfig } = useContext(SiteContext);
  const [activeSection, setActiveSection] = useState(null);
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [previewKey, setPreviewKey] = useState(0);
  const [sidebarTab, setSidebarTab] = useState('sections');
  const [dragOverId, setDragOverId] = useState(null);
  const [sectionOrder, setSectionOrder] = useState([]);
  const [sectionVisibility, setSectionVisibility] = useState({});
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [viewport, setViewport] = useState(getViewport);
  // On compact viewports (mobile/tablet) the side panel is a slide-up sheet
  // that overlays the preview. `sheetOpen` controls visibility; `sheetExpanded`
  // controls half-screen vs full-screen. Default sheet auto-opens to the section
  // list on first load so users immediately see what they can edit.
  const [sheetOpen, setSheetOpen] = useState(() => getViewport() !== 'desktop');
  const [sheetExpanded, setSheetExpanded] = useState(false);
  // Custom user-chosen sheet height percentage (20–80). null = use the default
  // 60% (or 100% when sheetExpanded). Set when the user drags the handle bar.
  const [sheetCustomHeight, setSheetCustomHeight] = useState(null);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);
  const iframeRef = useRef(null);
  const dragItemRef = useRef(null);
  const accumulatedSettingsRef = useRef({});
  const sheetContainerRef = useRef(null);
  const dragStateRef = useRef(null);

  const isCompact = viewport !== 'desktop';
  const isMobile = viewport === 'mobile';

  useEffect(() => {
    function handleResize() {
      const next = getViewport();
      setViewport(prev => {
        if (prev !== next) {
          // Normalize sheet state across breakpoint transitions:
          //  desktop → compact: open the sheet so the user can see editing controls.
          //  compact → desktop: collapse the sheet (it's irrelevant on desktop).
          if (next === 'desktop') {
            setSheetOpen(false);
            setSheetExpanded(false);
          } else if (prev === 'desktop') {
            setSheetOpen(true);
            setSheetExpanded(false);
          }
        }
        return next;
      });
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Escape key: close the sheet on compact viewports (or close the editor
  // first if one is open). On desktop, close the active section.
  useEffect(() => {
    function handleKey(e) {
      if (e.key !== 'Escape') return;
      if (isCompact) {
        if (sheetOpen) {
          // Minimize the sheet — keep activeSection so the floating Edit pill
          // resumes the user where they left off.
          setSheetOpen(false);
          setSheetExpanded(false);
        }
      } else if (activeSection) {
        setActiveSection(null);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isCompact, activeSection, sheetOpen]);

  const resolvedTheme = useMemo(() => {
    let settings = siteConfig?.settings || {};
    if (typeof settings === 'string') {
      try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
    }
    return settings.theme || siteConfig?.templateId || 'classic';
  }, [siteConfig?.settings, siteConfig?.templateId]);

  const homepageSections = useMemo(() => getHomepageSections(resolvedTheme), [resolvedTheme]);

  const storeBaseUrl = getStoreUrl(siteConfig);
  const currentPage = useMemo(() => {
    if (!activeSection) return '/';
    const page = PAGE_SECTIONS.find(p => p.id === activeSection);
    if (page) return page.page;
    const settingsPage = SETTINGS_SECTIONS.find(s => s.id === activeSection);
    if (settingsPage?.page) return settingsPage.page;
    return '/';
  }, [activeSection]);
  const previewUrl = storeBaseUrl ? `${storeBaseUrl}${currentPage}` : '';

  useEffect(() => {
    if (!siteConfig?.settings) return;
    let settings = siteConfig.settings;
    if (typeof settings === 'string') {
      try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
    }
    const vis = {};
    homepageSections.forEach(sec => {
      if (sec.showKey) {
        const val = settings[sec.showKey];
        if (sec.id === 'store-locations') {
          vis[sec.id] = val === true;
        } else {
          vis[sec.id] = val !== false;
        }
      }
    });
    setSectionVisibility(vis);
  }, [siteConfig?.settings, homepageSections]);

  const refreshPreview = useCallback(() => {
    setPreviewKey(Date.now());
  }, []);

  const sendPreviewUpdate = useCallback((settingsPatch) => {
    accumulatedSettingsRef.current = { ...accumulatedSettingsRef.current, ...settingsPatch };
    try {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage({ type: 'FLOMERCE_PREVIEW_UPDATE', settings: settingsPatch }, '*');
      }
    } catch (e) {}
  }, []);

  const sendScrollToSection = useCallback((sectionId) => {
    try {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage({ type: 'FLOMERCE_SCROLL_TO_SECTION', sectionId }, '*');
      }
    } catch (e) {}
  }, []);

  // Auto-scroll the preview iframe to whichever section the user starts editing.
  // Page-level sections (about/contact/blog/etc.) navigate the iframe URL instead,
  // so they don't need a scroll — the page itself is the section.
  useEffect(() => {
    if (!activeSection) return;
    const isPageSection =
      PAGE_SECTIONS.some(p => p.id === activeSection) ||
      SETTINGS_SECTIONS.some(s => s.id === activeSection && s.page);
    if (isPageSection) return;
    sendScrollToSection(activeSection);
    // The iframe may still be navigating from a previous page or the section may
    // not be mounted yet; retry once shortly after to handle that race.
    const t = setTimeout(() => sendScrollToSection(activeSection), 700);
    return () => clearTimeout(t);
  }, [activeSection, previewKey, sendScrollToSection]);

  // ===== Bottom-sheet drag-to-resize ==========================================
  // Lets the user pull the top edge of the sheet up or down to set any custom
  // editor/preview split (clamped to 20–80%). Tap-only on the handle still
  // works as a half/full toggle.
  // We attach the move/up listeners to `window` (not the handle element) so the
  // drag keeps working even if the user's finger or cursor drifts off the small
  // 44×5 handle bar — this was the cause of "drag missing in some sections".
  const startSheetDrag = useCallback((e) => {
    if (!sheetContainerRef.current) return;
    const rect = sheetContainerRef.current.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    // When dragging out of full-screen mode, start the baseline at the max custom
    // height (80) so the first move frame doesn't snap down jarringly.
    const startHeightPct = sheetExpanded ? 80 : (sheetCustomHeight ?? 60);
    dragStateRef.current = {
      startY: point.clientY,
      startHeightPct,
      containerHeight: rect.height,
      moved: false,
      startedExpanded: sheetExpanded,
    };
    setIsDraggingSheet(true);
    e.preventDefault();
    e.stopPropagation();
  }, [sheetExpanded, sheetCustomHeight]);

  // While dragging, listen on the window so move/end events fire no matter
  // where the pointer goes (over the iframe, off-screen, etc.).
  useEffect(() => {
    if (!isDraggingSheet) return;

    const handleMove = (ev) => {
      const state = dragStateRef.current;
      if (!state) return;
      const point = ev.touches ? ev.touches[0] : ev;
      const dy = point.clientY - state.startY;
      if (Math.abs(dy) > 4) state.moved = true;
      const deltaPct = -(dy / state.containerHeight) * 100;
      let next = state.startHeightPct + deltaPct;
      next = Math.max(20, Math.min(80, next));
      setSheetCustomHeight(next);
      if (state.startedExpanded) {
        // Once the user has moved, leave full-screen so the drag actually shrinks.
        setSheetExpanded(false);
        state.startedExpanded = false;
      }
      // Prevent the page/iframe from scrolling along with the drag.
      if (ev.cancelable) ev.preventDefault();
    };

    const handleEnd = () => {
      const state = dragStateRef.current;
      dragStateRef.current = null;
      setIsDraggingSheet(false);
      if (state && !state.moved) {
        // Tap-only on the handle behaves like the half/full toggle button.
        setSheetCustomHeight(null);
        setSheetExpanded(e => !e);
      }
    };

    window.addEventListener('pointermove', handleMove, { passive: false });
    window.addEventListener('pointerup', handleEnd);
    window.addEventListener('pointercancel', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('touchcancel', handleEnd);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleEnd);
      window.removeEventListener('pointercancel', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('touchcancel', handleEnd);
    };
  }, [isDraggingSheet]);

  async function toggleSectionVisibility(sectionId, showKey) {
    const newVal = !sectionVisibility[sectionId];
    setSectionVisibility(prev => ({ ...prev, [sectionId]: newVal }));

    sendPreviewUpdate({ [showKey]: newVal });

    setSavingVisibility(true);
    try {
      const token = sessionStorage.getItem('site_admin_token');
      await fetch(`${API_BASE}/api/sites/${siteConfig.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `SiteAdmin ${token}` : '',
        },
        body: JSON.stringify({ settings: { [showKey]: newVal } }),
      });
    } catch (e) {
      console.error('Failed to toggle section:', e);
      setSectionVisibility(prev => ({ ...prev, [sectionId]: !newVal }));
    } finally {
      setSavingVisibility(false);
    }
  }

  function handleDragStart(e, sectionId) {
    dragItemRef.current = sectionId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', sectionId);
    e.currentTarget.style.opacity = '0.4';
  }

  function handleDragEnd(e) {
    e.currentTarget.style.opacity = '1';
    dragItemRef.current = null;
    setDragOverId(null);
  }

  function handleDragOver(e, sectionId) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (sectionId !== dragItemRef.current) {
      setDragOverId(sectionId);
    }
  }

  function handleDrop(e, targetId) {
    e.preventDefault();
    setDragOverId(null);
    const sourceId = dragItemRef.current;
    if (!sourceId || sourceId === targetId) return;

    const currentOrder = homepageSections.map(s => s.id);
    const sourceIdx = currentOrder.indexOf(sourceId);
    const targetIdx = currentOrder.indexOf(targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const newOrder = [...currentOrder];
    newOrder.splice(sourceIdx, 1);
    newOrder.splice(targetIdx, 0, sourceId);
    setSectionOrder(newOrder);
  }

  const orderedSections = useMemo(() => {
    if (sectionOrder.length === 0) return homepageSections;
    const ordered = [];
    const remaining = [...homepageSections];
    for (const id of sectionOrder) {
      const idx = remaining.findIndex(s => s.id === id);
      if (idx !== -1) {
        ordered.push(remaining.splice(idx, 1)[0]);
      }
    }
    return [...ordered, ...remaining];
  }, [homepageSections, sectionOrder]);

  function renderEditor() {
    if (!activeSection) return null;
    const props = { onSaved: refreshPreview, onPreviewUpdate: sendPreviewUpdate };

    switch (activeSection) {
      case 'navbar': return <NavbarEditor {...props} />;
      case 'promo-banner': return <PromoBannerEditor {...props} />;
      case 'hero-slider': return <HeroSliderEditor {...props} />;
      case 'welcome-banner': return <WelcomeBannerEditor {...props} />;
      case 'categories': return <CategoriesSection {...props} />;
      case 'watchbuy': return <WatchBuySection {...props} />;
      case 'featured-video': return <FeaturedVideoEditor {...props} />;
      case 'customer-reviews': {
        const gated = GATED_TABS['customer-reviews'];
        const locked = gated && !isFeatureAvailable(currentPlan, gated);
        if (locked) return <FeatureGate currentPlan={currentPlan} requiredPlan="growth" featureName="Customer Reviews"><CustomerReviewsEditor {...props} /></FeatureGate>;
        return <CustomerReviewsEditor {...props} />;
      }
      case 'shop-the-look': return <ShopTheLookEditor {...props} />;
      case 'trending-now': return <TrendingNowEditor {...props} />;
      case 'brand-story': return <BrandStoryEditor {...props} />;
      case 'store-locations': return <StoreLocationsEditor {...props} />;
      case 'book-appointment': return <BookAppointmentEditor {...props} />;
      case 'contact-us': return <ContactEditor {...props} />;
      case 'checkout': return <CheckoutEditor {...props} />;
      case 'product-policies': return <ProductPoliciesEditor {...props} />;
      case 'about-us': return <AboutUsEditor {...props} />;
      case 'faq': return <FAQSection />;
      case 'blog': {
        const gated = GATED_TABS['blog'];
        const locked = gated && !isFeatureAvailable(currentPlan, gated);
        if (locked) return <FeatureGate currentPlan={currentPlan} requiredPlan="growth" featureName="Blog"><BlogSection /></FeatureGate>;
        return <BlogSection />;
      }
      case 'terms': return <TermsEditor {...props} />;
      case 'privacy': return <PrivacyEditor {...props} />;
      case 'footer': return <FooterEditor {...props} />;
      default: return null;
    }
  }

  function getSectionLabel(id) {
    const hp = homepageSections.find(s => s.id === id);
    if (hp) return hp.label;
    const pg = PAGE_SECTIONS.find(s => s.id === id);
    if (pg) return pg.label;
    const st = SETTINGS_SECTIONS.find(s => s.id === id);
    if (st) return st.label;
    return id;
  }

  // ===== Reusable subviews =====================================================
  // SectionListView and EditorView are rendered inside either the desktop sidebar
  // or the mobile/tablet bottom sheet, so we extract them once.

  const renderSectionList = () => (
    <div style={{ overflowY: 'auto', flex: 1 }}>
              <div style={{ padding: '12px 16px 4px' }}>
                <div style={{
                  display: 'flex', background: '#f1f5f9', borderRadius: 8,
                  padding: 3, gap: 2,
                }}>
                  {[
                    { id: 'sections', label: 'Sections', icon: 'fa-layer-group' },
                    { id: 'pages', label: 'Pages', icon: 'fa-file-alt' },
                    { id: 'settings', label: 'Settings', icon: 'fa-cog' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSidebarTab(tab.id)}
                      style={{
                        flex: 1, padding: '7px 8px', border: 'none',
                        borderRadius: 6, fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'inherit',
                        background: sidebarTab === tab.id ? '#fff' : 'transparent',
                        color: sidebarTab === tab.id ? '#0f172a' : '#64748b',
                        boxShadow: sidebarTab === tab.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        transition: 'all 0.15s ease',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                      }}
                    >
                      <i className={`fas ${tab.icon}`} style={{ fontSize: 10 }} />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {sidebarTab === 'sections' && (
                <div style={{ padding: '8px 12px' }}>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 10px', padding: '0 4px' }}>
                    Click a section to edit it. Toggle visibility with the eye icon.
                  </p>
                  {orderedSections.map((section) => {
                    const isVisible = section.fixed || sectionVisibility[section.id] !== false;
                    const gatedFeature = GATED_TABS[section.id];
                    const isLocked = gatedFeature && !isFeatureAvailable(currentPlan, gatedFeature);
                    const isDraggedOver = dragOverId === section.id;

                    return (
                      <div
                        key={section.id}
                        draggable={!section.fixed}
                        onDragStart={(e) => handleDragStart(e, section.id)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(e, section.id)}
                        onDrop={(e) => handleDrop(e, section.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '9px 10px', marginBottom: 2,
                          borderRadius: 8, cursor: 'pointer',
                          background: isDraggedOver ? '#eff6ff' : '#fff',
                          border: isDraggedOver ? '1px dashed #2563eb' : '1px solid transparent',
                          transition: 'all 0.12s ease',
                          opacity: isVisible ? 1 : 0.5,
                        }}
                        onMouseEnter={e => { if (!isDraggedOver) e.currentTarget.style.background = '#f8fafc'; }}
                        onMouseLeave={e => { if (!isDraggedOver) e.currentTarget.style.background = isDraggedOver ? '#eff6ff' : '#fff'; }}
                      >
                        {!section.fixed && (
                          <i className="fas fa-grip-vertical" style={{
                            fontSize: 10, color: '#cbd5e1', cursor: 'grab',
                            width: 12, textAlign: 'center', flexShrink: 0,
                          }} />
                        )}
                        {section.fixed && <div style={{ width: 12, flexShrink: 0 }} />}

                        <div
                          onClick={() => !isLocked && setActiveSection(section.id)}
                          style={{
                            flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                            cursor: isLocked ? 'default' : 'pointer',
                          }}
                        >
                          <div style={{
                            width: 28, height: 28, borderRadius: 6,
                            background: isVisible ? '#eff6ff' : '#f8fafc',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            <i className={`fas ${isLocked ? 'fa-lock' : section.icon}`} style={{
                              fontSize: 11,
                              color: isLocked ? '#94a3b8' : isVisible ? '#2563eb' : '#94a3b8',
                            }} />
                          </div>
                          <span style={{
                            fontSize: 13, fontWeight: 500,
                            color: isLocked ? '#94a3b8' : '#334155',
                          }}>
                            {section.label}
                          </span>
                          {isLocked && <PlanBadge plan={getRequiredPlan(gatedFeature)} small />}
                        </div>

                        {section.showKey && !isLocked && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSectionVisibility(section.id, section.showKey);
                            }}
                            title={isVisible ? 'Hide section' : 'Show section'}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              padding: '4px 6px', borderRadius: 4, flexShrink: 0,
                              color: isVisible ? '#2563eb' : '#cbd5e1', fontSize: 13,
                              transition: 'color 0.15s ease',
                            }}
                          >
                            <i className={`fas ${isVisible ? 'fa-eye' : 'fa-eye-slash'}`} />
                          </button>
                        )}

                        {!section.showKey && !isLocked && (
                          <button
                            type="button"
                            onClick={() => setActiveSection(section.id)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              padding: '4px 6px', color: '#cbd5e1', fontSize: 11,
                              flexShrink: 0,
                            }}
                          >
                            <i className="fas fa-chevron-right" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {sidebarTab === 'pages' && (
                <div style={{ padding: '8px 12px' }}>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 10px', padding: '0 4px' }}>
                    Edit your store's standalone pages.
                  </p>
                  {PAGE_SECTIONS.map(page => {
                    const gatedFeature = GATED_TABS[page.id];
                    const isLocked = gatedFeature && !isFeatureAvailable(currentPlan, gatedFeature);
                    return (
                      <button
                        key={page.id}
                        type="button"
                        onClick={() => !isLocked && setActiveSection(page.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                          padding: '10px 10px', marginBottom: 2, border: 'none',
                          borderRadius: 8, background: '#fff', cursor: isLocked ? 'default' : 'pointer',
                          fontFamily: 'inherit', textAlign: 'left',
                          transition: 'background 0.12s ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                      >
                        <div style={{
                          width: 28, height: 28, borderRadius: 6, background: '#f8fafc',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <i className={`fas ${isLocked ? 'fa-lock' : page.icon}`} style={{
                            fontSize: 11, color: isLocked ? '#94a3b8' : '#64748b',
                          }} />
                        </div>
                        <span style={{
                          fontSize: 13, fontWeight: 500,
                          color: isLocked ? '#94a3b8' : '#334155', flex: 1,
                        }}>
                          {page.label}
                        </span>
                        {isLocked && <PlanBadge plan={getRequiredPlan(gatedFeature)} small />}
                        {!isLocked && (
                          <i className="fas fa-chevron-right" style={{ fontSize: 10, color: '#cbd5e1' }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {sidebarTab === 'settings' && (
                <div style={{ padding: '8px 12px' }}>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 10px', padding: '0 4px' }}>
                    Checkout, policies, and legal pages.
                  </p>
                  {SETTINGS_SECTIONS.map(section => (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveSection(section.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                        padding: '10px 10px', marginBottom: 2, border: 'none',
                        borderRadius: 8, background: '#fff', cursor: 'pointer',
                        fontFamily: 'inherit', textAlign: 'left',
                        transition: 'background 0.12s ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: 6, background: '#f8fafc',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <i className={`fas ${section.icon}`} style={{ fontSize: 11, color: '#64748b' }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#334155', flex: 1 }}>
                        {section.label}
                      </span>
                      <i className="fas fa-chevron-right" style={{ fontSize: 10, color: '#cbd5e1' }} />
                    </button>
                  ))}
                </div>
              )}
    </div>
  );
  // ----- end SectionListView -----

  const renderEditorPanel = (onEditorBack) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 16px', borderBottom: '1px solid #f1f5f9',
        flexShrink: 0,
      }}>
        <button
          type="button"
          onClick={onEditorBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 10px', background: '#f8fafc', border: '1px solid #e2e8f0',
            borderRadius: 5, fontSize: 12, color: '#64748b', cursor: 'pointer',
            fontFamily: 'inherit', fontWeight: 500,
          }}
        >
          <i className="fas fa-chevron-left" style={{ fontSize: 9 }} />
          Back
        </button>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
          {getSectionLabel(activeSection)}
        </span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {renderEditor()}
      </div>
    </div>
  );

  const renderPreview = (allowMobileFrame = true) => {
    // On a real mobile device the "fake mobile frame" inside the preview is silly —
    // the iframe is already on a phone. Only show the framed mobile preview on
    // desktop/tablet when the user explicitly toggled it.
    const useMobileFrame = allowMobileFrame && previewDevice === 'mobile' && !isMobile;
    return (
      <div style={{
        // On compact viewports the parent uses absolute positioning + explicit
        // height, so we need to fill it explicitly. On desktop the parent is a
        // flex row, so flex:1 works.
        flex: isCompact ? undefined : 1,
        width: isCompact ? '100%' : undefined,
        height: isCompact ? '100%' : undefined,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: isCompact ? 0 : 20, overflow: 'hidden',
        background: '#f1f5f9',
      }}>
        {previewUrl ? (
          <div style={{
            width: useMobileFrame ? 390 : '100%',
            height: '100%',
            maxWidth: useMobileFrame ? 390 : '100%',
            transition: 'all 0.3s ease',
            borderRadius: useMobileFrame ? 24 : (isCompact ? 0 : 12),
            overflow: 'hidden',
            boxShadow: useMobileFrame
              ? '0 0 0 8px #1e293b, 0 20px 60px rgba(0,0,0,0.2)'
              : (isCompact ? 'none' : '0 4px 24px rgba(0,0,0,0.08)'),
            background: '#fff',
            position: 'relative',
          }}>
            {useMobileFrame && (
              <div style={{
                height: 28, background: '#1e293b', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  width: 60, height: 6, borderRadius: 3, background: '#334155',
                }} />
              </div>
            )}
            <iframe
              ref={iframeRef}
              key={`${previewKey}-${previewDevice}`}
              src={`${previewUrl}${previewUrl.includes('?') ? '&' : '?'}_t=${previewKey}`}
              style={{
                width: useMobileFrame ? 390 : '100%',
                height: useMobileFrame ? 'calc(100% - 28px)' : '100%',
                border: 'none', display: 'block',
              }}
              title="Store Preview"
            />
          </div>
        ) : (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', color: '#94a3b8',
          }}>
            <i className="fas fa-globe" style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }} />
            <p style={{ fontSize: 15, fontWeight: 500 }}>Preview not available</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Store URL could not be determined</p>
          </div>
        )}
      </div>
    );
  };

  // ===== Top bar ===============================================================
  const renderTopBar = () => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: isMobile ? '0 10px' : '0 16px', height: isMobile ? 48 : 52, background: '#fff',
      borderBottom: '1px solid #e2e8f0', flexShrink: 0, zIndex: 10, gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12, minWidth: 0, flex: 1 }}>
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to admin"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: isMobile ? '6px 10px' : '6px 12px',
            background: '#f1f5f9', border: '1px solid #e2e8f0',
            borderRadius: 6, fontSize: 13, color: '#475569', cursor: 'pointer',
            fontWeight: 500, fontFamily: 'inherit', flexShrink: 0,
          }}
        >
          <i className="fas fa-arrow-left" style={{ fontSize: 11 }} />
          {!isMobile && 'Admin'}
        </button>
        {!isMobile && <div style={{ width: 1, height: 24, background: '#e2e8f0' }} />}
        <span style={{
          fontSize: isMobile ? 14 : 15, fontWeight: 700, color: '#0f172a',
          letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          <i className="fas fa-palette" style={{ marginRight: 8, color: '#2563eb', fontSize: 14 }} />
          {isMobile ? 'Edit' : 'Visual Customizer'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 8, flexShrink: 0 }}>
        {savingVisibility && !isMobile && (
          <span style={{ fontSize: 12, color: '#64748b' }}>
            <i className="fas fa-circle-notch fa-spin" style={{ marginRight: 4, fontSize: 10 }} />
            Saving...
          </span>
        )}
        {savingVisibility && isMobile && (
          <i className="fas fa-circle-notch fa-spin" style={{ fontSize: 12, color: '#64748b' }} title="Saving" />
        )}
        {/* Device toggle: meaningful on desktop/tablet (where we can fake a phone frame); hidden on mobile */}
        {!isMobile && (
          <div style={{
            display: 'flex', background: '#f1f5f9', borderRadius: 6,
            border: '1px solid #e2e8f0', overflow: 'hidden',
          }}>
            <button
              type="button"
              onClick={() => setPreviewDevice('desktop')}
              style={{
                padding: '6px 12px', border: 'none', fontSize: 13, cursor: 'pointer',
                background: previewDevice === 'desktop' ? '#2563eb' : 'transparent',
                color: previewDevice === 'desktop' ? '#fff' : '#64748b',
                fontFamily: 'inherit', fontWeight: 500,
                transition: 'all 0.15s ease',
              }}
              title="Desktop preview"
            >
              <i className="fas fa-desktop" />
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice('mobile')}
              style={{
                padding: '6px 12px', border: 'none', fontSize: 13, cursor: 'pointer',
                background: previewDevice === 'mobile' ? '#2563eb' : 'transparent',
                color: previewDevice === 'mobile' ? '#fff' : '#64748b',
                fontFamily: 'inherit', fontWeight: 500,
                transition: 'all 0.15s ease',
              }}
              title="Mobile preview"
            >
              <i className="fas fa-mobile-alt" />
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={refreshPreview}
          title="Refresh preview"
          aria-label="Refresh preview"
          style={{
            padding: isMobile ? '6px 8px' : '6px 10px',
            background: '#f1f5f9', border: '1px solid #e2e8f0',
            borderRadius: 6, cursor: 'pointer', color: '#64748b', fontSize: 13,
          }}
        >
          <i className="fas fa-sync-alt" />
        </button>
        {storeBaseUrl && !isMobile && (
          <a
            href={storeBaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '6px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0',
              borderRadius: 6, color: '#64748b', fontSize: 12, textDecoration: 'none',
              fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <i className="fas fa-external-link-alt" style={{ fontSize: 10 }} />
            Visit Store
          </a>
        )}
      </div>
    </div>
  );

  // ===== Layout ================================================================
  // Desktop (≥1024): classic side-by-side with resizable-feel sidebar.
  // Tablet (768-1023) & Mobile (<768): preview is the canvas; the panel is a
  // bottom sheet that can be hidden, half-screen, or full-screen.
  // On mobile in particular this gives the "see your store, tap edit, work in
  // a sheet, see changes live above" flow the user asked for.

  if (!isCompact) {
    // ----- DESKTOP -----
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', flexDirection: 'column',
        background: '#f1f5f9',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}>
        {renderTopBar()}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div style={{
            width: activeSection ? 400 : 280,
            flexShrink: 0,
            background: '#fff',
            borderRight: '1px solid #e2e8f0',
            display: 'flex', flexDirection: 'column',
            transition: 'width 0.2s ease',
            overflow: 'hidden',
          }}>
            {activeSection
              ? renderEditorPanel(() => setActiveSection(null))
              : renderSectionList()}
          </div>
          {renderPreview()}
        </div>
      </div>
    );
  }

  // ----- MOBILE / TABLET -----
  // Three sheet states:
  //   closed       → preview full-screen, floating "Edit" pill visible
  //   half (open)  → preview at top (~40%), sheet at bottom (~60%) — split view
  //                  with live changes visible above
  //   full         → sheet covers entire screen (preview hidden behind it) for
  //                  long forms like the hero slider
  const baseSheetHeight = sheetExpanded ? 100 : (sheetCustomHeight ?? 60);
  const sheetHeightPct = sheetOpen ? baseSheetHeight : 0;
  const previewVisualPct = sheetOpen ? (100 - baseSheetHeight) : 100;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', flexDirection: 'column',
      background: '#f1f5f9',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      overscrollBehavior: 'contain',
    }}>
      {renderTopBar()}

      <div ref={sheetContainerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Preview area — stays mounted so the iframe doesn't reload when the sheet opens/closes */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 0,
          height: `${previewVisualPct}%`,
          transition: isDraggingSheet ? 'none' : 'height 0.28s ease',
          overflow: 'hidden',
          background: '#f1f5f9',
        }}>
          {renderPreview(false)}
        </div>

        {/* Bottom sheet — slides up from the bottom over the preview */}
        <div
          role={sheetOpen ? 'dialog' : undefined}
          aria-modal={sheetOpen ? 'true' : undefined}
          aria-label={activeSection ? `Edit ${getSectionLabel(activeSection)}` : 'Choose a section to edit'}
          aria-hidden={sheetOpen ? undefined : 'true'}
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            height: `${sheetHeightPct}%`,
            background: '#fff',
            borderRadius: sheetExpanded ? '0' : '18px 18px 0 0',
            boxShadow: '0 -6px 24px rgba(0,0,0,0.15)',
            transition: isDraggingSheet ? 'border-radius 0.2s ease' : 'height 0.28s ease, border-radius 0.2s ease',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* IMPORTANT: the sheet contents are *always* rendered (never
              conditionally mounted on `sheetOpen`). When the user minimizes the
              sheet, the parent slides it off-screen via height:0 + overflow:
              hidden — but the form components below stay mounted, so any
              in-progress edits the user typed survive a minimize/restore. */}
          <div
            inert={sheetOpen ? undefined : ''}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              minHeight: 0,
              pointerEvents: sheetOpen ? 'auto' : 'none',
              opacity: sheetOpen ? 1 : 0,
              transition: 'opacity 0.18s ease',
            }}
          >
              {/* Drag handle / sheet toolbar */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px 4px', flexShrink: 0,
                borderBottom: '1px solid #f1f5f9',
              }}>
                <button
                  type="button"
                  onClick={() => setSheetExpanded(e => !e)}
                  aria-label={sheetExpanded ? 'Collapse editor' : 'Expand editor'}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '6px 10px', borderRadius: 6, color: '#94a3b8',
                    fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <i className={`fas ${sheetExpanded ? 'fa-compress-alt' : 'fa-expand-alt'}`} />
                </button>
                {/* Centered draggable handle — drag up/down to resize, tap to toggle half/full */}
                <div
                  role="slider"
                  aria-label="Resize editor sheet"
                  aria-valuemin={20}
                  aria-valuemax={80}
                  aria-valuenow={Math.round(baseSheetHeight)}
                  onPointerDown={startSheetDrag}
                  style={{
                    position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 0,
                    padding: '10px 28px',
                    cursor: isDraggingSheet ? 'grabbing' : 'grab',
                    touchAction: 'none',
                    userSelect: 'none',
                  }}
                >
                  <div style={{
                    width: 44, height: 5, borderRadius: 3,
                    background: isDraggingSheet ? '#2563eb' : '#cbd5e1',
                    transition: 'background 0.15s ease',
                  }} />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    // Always just minimize the sheet — keep the user's editing
                    // context (activeSection) alive so the floating Edit pill
                    // can resume them right where they left off.
                    setSheetOpen(false);
                    setSheetExpanded(false);
                  }}
                  aria-label="Minimize editor"
                  style={{
                    background: '#f1f5f9', border: 'none', borderRadius: '50%',
                    width: 32, height: 32, cursor: 'pointer', color: '#64748b',
                    fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <i className="fas fa-chevron-down" />
                </button>
              </div>

              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {activeSection
                  ? renderEditorPanel(() => setActiveSection(null))
                  : renderSectionList()}
              </div>
          </div>
        </div>
      </div>

      {/* Floating "Edit" pill — pinned to the viewport (position:fixed) so it
          stays visible regardless of iframe scroll position or any parent
          stacking context. Only shown when the bottom sheet is closed. */}
      {!sheetOpen && (
        <button
          type="button"
          onClick={() => { setSheetOpen(true); setSheetExpanded(false); }}
          className="vc-edit-fab"
          style={{
            position: 'fixed',
            // Sit above the storefront's mobile bottom nav (65px tall) plus
            // any device safe-area inset, with breathing room. This guarantees
            // the Edit pill is always visible regardless of preview chrome.
            bottom: `calc(85px + env(safe-area-inset-bottom, 0px))`,
            left: '50%', transform: 'translateX(-50%)',
            padding: '14px 26px', borderRadius: 999,
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            color: '#fff', border: 'none',
            fontSize: 15, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 10px 28px rgba(37,99,235,0.5), 0 2px 6px rgba(0,0,0,0.12)',
            display: 'flex', alignItems: 'center', gap: 10,
            fontFamily: 'inherit',
            zIndex: 2000,
            whiteSpace: 'nowrap',
            maxWidth: 'calc(100vw - 32px)',
            overflow: 'hidden', textOverflow: 'ellipsis',
          }}
        >
          <i className="fas fa-pen" style={{ fontSize: 13 }} />
          {activeSection ? `Edit ${getSectionLabel(activeSection)}` : 'Edit Website'}
        </button>
      )}
    </div>
  );
}
