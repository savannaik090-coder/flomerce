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
import ProductPageEditor from './ProductPageEditor.jsx';
import NavbarEditor from './NavbarEditor.jsx';
import BookAppointmentEditor from './BookAppointmentEditor.jsx';
import ContactEditor from './ContactEditor.jsx';
import FAQSection from './FAQSection.jsx';
import BlogSection from './BlogSection.jsx';
import PromoBannerEditor from './PromoBannerEditor.jsx';
import FeatureGate, { isFeatureAvailable, getRequiredPlan, PlanBadge } from './FeatureGate.jsx';
import ThemePanel from './ThemePanel.jsx';
import SchemeAssignmentBar from './SchemeAssignmentBar.jsx';
import SectionColorOverrides from './SectionColorOverrides.jsx';
import { SECTION_SLOTS } from '../theme/sectionSelectors.js';
import { API_BASE, PLATFORM_DOMAIN } from '../../config.js';
import { isEditorDirty, clearEditorDirty } from '../../admin/editorDirtyStore.js';
import { useConfirm } from '../../../../shared/ui/ConfirmDialog.jsx';

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
  { id: 'book-appointment', label: 'Book Appointment', icon: 'fa-calendar-check', page: '/book-appointment', gated: 'appointmentBooking' },
  { id: 'faq', label: 'FAQ', icon: 'fa-question-circle', page: '/faq' },
  { id: 'blog', label: 'Blog', icon: 'fa-pen-fancy', page: '/blog' },
];

const SETTINGS_SECTIONS = [
  { id: 'checkout', label: 'Checkout', icon: 'fa-shopping-bag' },
  { id: 'product-page', label: 'Product Page', icon: 'fa-box-open' },
  { id: 'product-policies', label: 'Product Policies', icon: 'fa-shield-alt' },
  { id: 'terms', label: 'Terms & Conditions', icon: 'fa-file-contract', page: '/terms' },
  { id: 'privacy', label: 'Privacy Policy', icon: 'fa-user-shield', page: '/privacy-policy' },
];

const GATED_TABS = { 'book-appointment': 'appointmentBooking' };

function getViewport() {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

function deepClone(value) {
  if (value === null || value === undefined) return value;
  try { return JSON.parse(JSON.stringify(value)); } catch (e) { return value; }
}

// Sections that can carry a per-section color scheme. Page-level surfaces
// (about/contact/faq/blog) and settings-driven surfaces (checkout/PDP/
// policies/terms/privacy) are included so the merchant can theme them too.
const SCHEMEABLE_SECTIONS = new Set([
  'navbar', 'promo-banner', 'hero-slider', 'welcome-banner',
  'categories', 'watchbuy', 'featured-video', 'shop-the-look',
  'store-locations', 'trending-now', 'brand-story',
  'customer-reviews', 'footer',
  'about-us', 'contact-us', 'book-appointment', 'faq', 'blog',
  'checkout', 'product-page', 'product-policies', 'terms', 'privacy',
]);

export default function VisualCustomizer({ currentPlan, onBack }) {
  // CRITICAL: pull `themeConfig` (the *resolved* theme) from context instead
  // of reaching into `siteConfig.themeConfig` directly. The resolved value is
  // never null — if a legacy site has no `theme_config` row in the DB,
  // SiteContext synthesizes Brand + Inverse + Accent on the fly so the
  // customizer's Theme tab and per-section dropdowns always have real
  // schemes to work with. Reading from `siteConfig.themeConfig` would leave
  // `themeDraft` null on those legacy sites and the SchemeAssignmentBar
  // would never render — which is exactly the bug a merchant would describe
  // as "I can't see any color customization in per-section editors".
  const { siteConfig, themeConfig } = useContext(SiteContext);
  const confirm = useConfirm();

  // Theme draft: starts as a deep copy of the resolved theme so per-section
  // dropdowns and the Theme tab can mutate it freely without touching the
  // server. The Theme tab has its own Save button; per-section assignment
  // changes auto-save (parallels the visibility-toggle behavior).
  const [themeDraft, setThemeDraft] = useState(() => deepClone(themeConfig));
  const themeSavedRef = useRef(JSON.stringify(siteConfig?.themeConfig || themeConfig || {}));
  // Mirror of themeDraft kept in a ref so async callbacks (like the
  // post-save dirty re-check after an assignment auto-save) read the
  // latest value rather than the closed-over snapshot from when the
  // callback was scheduled.
  const themeDraftRef = useRef(themeConfig || null);
  const [themeHasChanges, setThemeHasChanges] = useState(false);
  const [themeSaving, setThemeSaving] = useState(false);

  // Resync the draft whenever the canonical theme changes (saved or
  // recomputed). We compare against the saved baseline only — if the
  // merchant has unsaved edits, we don't stomp them.
  useEffect(() => {
    const incoming = siteConfig?.themeConfig || themeConfig;
    if (!incoming) return;
    const incomingStr = JSON.stringify(incoming);
    if (incomingStr !== themeSavedRef.current && !themeHasChanges) {
      themeSavedRef.current = incomingStr;
      const cloned = deepClone(incoming);
      setThemeDraft(cloned);
      themeDraftRef.current = cloned;
    }
  }, [siteConfig?.themeConfig, themeConfig, themeHasChanges]);

  // Keep the ref synced on every draft change.
  useEffect(() => { themeDraftRef.current = themeDraft; }, [themeDraft]);

  const [activeSection, setActiveSection] = useState(null);
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [previewKey, setPreviewKey] = useState(0);
  const [sidebarTab, setSidebarTab] = useState('sections');
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
  const iframeLoadedRef = useRef(false);
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
        changeActiveSection(null);
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
  // Holds the path to a representative product page, used when the user opens
  // the "Product Page" settings editor so the preview iframe lands on an
  // actual PDP instead of the homepage. Resolved lazily once per site.
  const [previewProductPath, setPreviewProductPath] = useState(null);
  const previewProductFetchRef = useRef(false);

  useEffect(() => {
    if (activeSection !== 'product-page') return;
    if (previewProductPath || previewProductFetchRef.current) return;
    if (!siteConfig?.id) return;
    previewProductFetchRef.current = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/products?siteId=${encodeURIComponent(siteConfig.id)}&limit=1`);
        const json = await res.json();
        const list = json?.data || json?.products || (Array.isArray(json) ? json : []);
        const first = Array.isArray(list) ? list[0] : null;
        if (first?.id) setPreviewProductPath(`/product/${first.id}`);
      } catch (e) {
        console.warn('[customizer] could not load preview product:', e);
      }
    })();
  }, [activeSection, siteConfig?.id, previewProductPath]);

  const currentPage = useMemo(() => {
    if (!activeSection) return '/';
    const page = PAGE_SECTIONS.find(p => p.id === activeSection);
    if (page) return page.page;
    const settingsPage = SETTINGS_SECTIONS.find(s => s.id === activeSection);
    if (settingsPage?.page) return settingsPage.page;
    if (activeSection === 'product-page' && previewProductPath) return previewProductPath;
    return '/';
  }, [activeSection, previewProductPath]);
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
        vis[sec.id] = val !== false;
      }
    });
    setSectionVisibility(vis);
  }, [siteConfig?.settings, homepageSections]);

  const refreshPreview = useCallback(() => {
    // Explicit remount of the iframe — mark as not-yet-loaded so
    // handleIframeLoad re-signals readiness after the reload finishes.
    iframeLoadedRef.current = false;
    setPreviewKey(Date.now());
  }, []);

  const sendPreviewUpdate = useCallback((settingsPatch) => {
    // Most keys shallow-merge, but `_overridesPatch` needs per-section
    // accumulation so editing a second section doesn't drop the first
    // section's unsaved preview when the iframe reloads and we replay
    // accumulatedSettingsRef.
    const prev = accumulatedSettingsRef.current || {};
    const next = { ...prev, ...settingsPatch };
    if (settingsPatch && settingsPatch._overridesPatch && typeof settingsPatch._overridesPatch === 'object') {
      next._overridesPatch = { ...(prev._overridesPatch || {}), ...settingsPatch._overridesPatch };
    }
    accumulatedSettingsRef.current = next;
    try {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage({ type: 'FLOMERCE_PREVIEW_UPDATE', settings: settingsPatch }, '*');
      }
    } catch (e) { console.warn('[preview] postMessage failed:', e); }
  }, []);

  // Push the current theme draft into the live preview as a `_themePatch`.
  // SiteContext recognises this key and overlays the theme on top of the
  // saved one, so the storefront recolors immediately as the merchant edits
  // schemes or reassigns sections.
  const pushThemePreview = useCallback((draft) => {
    if (!draft) return;
    sendPreviewUpdate({
      _themePatch: {
        schemes: draft.schemes,
        sectionAssignments: draft.sectionAssignments,
      },
    });
  }, [sendPreviewUpdate]);

  // Persist the entire theme blob. Called by the Theme tab's Save button and
  // by per-section assignment changes (which auto-save like visibility).
  const saveThemeConfig = useCallback(async (theme) => {
    if (!siteConfig?.id || !theme) return false;
    setThemeSaving(true);
    try {
      const token = sessionStorage.getItem('site_admin_token');
      const res = await fetch(`${API_BASE}/api/sites/${siteConfig.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `SiteAdmin ${token}` : '',
        },
        body: JSON.stringify({ themeConfig: theme }),
      });
      if (!res.ok) throw new Error('save failed');
      themeSavedRef.current = JSON.stringify(theme);
      setThemeHasChanges(false);
      return true;
    } catch (e) {
      console.error('Failed to save theme:', e);
      return false;
    } finally {
      setThemeSaving(false);
    }
  }, [siteConfig?.id]);

  // Per-section assignment change: optimistic UI update + preview push +
  // serialized auto-save (mirrors toggleSectionVisibility's pattern so two
  // rapid changes don't race the server).
  //
  // CRITICAL: the auto-save payload is built from the *saved* theme + the
  // new assignments only, NOT from the live themeDraft. If we sent the
  // full draft, a merchant who is mid-edit on a color in the Theme tab
  // would have those uncommitted color changes silently persisted by an
  // unrelated dropdown click — surprising and not what they asked for.
  const themeAssignSaveRef = useRef({ inflight: false, queued: null });
  const setSchemeForSection = useCallback((sectionId, schemeId) => {
    setThemeDraft(prev => {
      if (!prev) return prev;
      // schemeId === '' (or null/undefined) means "use the default design" —
      // remove the assignment entirely so SchemeScope renders the section
      // pristine (no CSS injected, original storefront design wins).
      const isClear = !schemeId;
      const buildAssignments = (base) => {
        const a = { ...(base || {}) };
        if (isClear) delete a[sectionId]; else a[sectionId] = schemeId;
        return a;
      };
      const next = {
        ...prev,
        sectionAssignments: buildAssignments(prev.sectionAssignments),
      };

      // Build a save payload that:
      // (a) uses the last-saved theme as the base, NOT the live themeDraft,
      //     so we don't commit pending Theme-tab color edits.
      // (b) merges into ANY already-queued payload from a previous rapid
      //     dropdown change, so two clicks in quick succession don't drop
      //     the first one. Without this, the second queued payload would
      //     re-derive from themeSavedRef and overwrite the first
      //     assignment back to its original value.
      const queuedAlready = themeAssignSaveRef.current.queued;
      let savedBase = queuedAlready;
      if (!savedBase || !Array.isArray(savedBase.schemes)) {
        try { savedBase = JSON.parse(themeSavedRef.current || '{}'); } catch (e) { savedBase = null; }
      }
      if (!savedBase || !Array.isArray(savedBase.schemes)) {
        // Fallback: if we somehow have no saved baseline yet (very early
        // first paint), use the draft minus any in-flight changes — at
        // worst the merchant's first action saves what they currently see.
        savedBase = next;
      }
      const savePayload = {
        ...savedBase,
        sectionAssignments: buildAssignments(savedBase.sectionAssignments),
      };

      themeAssignSaveRef.current.queued = savePayload;
      (async () => {
        if (themeAssignSaveRef.current.inflight) return;
        themeAssignSaveRef.current.inflight = true;
        try {
          while (themeAssignSaveRef.current.queued) {
            const toSave = themeAssignSaveRef.current.queued;
            themeAssignSaveRef.current.queued = null;
            await saveThemeConfig(toSave);
          }
        } finally {
          themeAssignSaveRef.current.inflight = false;
          // Preserve "has unsaved color edits" dirty flag — saveThemeConfig
          // clears themeHasChanges, but if the live draft still differs
          // from the saved baseline (because the merchant is mid-color-edit
          // in the Theme tab) we must restore the dirty indicator so the
          // Save Theme button stays clickable. Reading from the ref ensures
          // we see the LATEST draft, not the snapshot from when the
          // callback was scheduled.
          const draftStr = JSON.stringify(themeDraftRef.current || {});
          setThemeHasChanges(draftStr !== themeSavedRef.current);
        }
      })();
      pushThemePreview(next);
      return next;
    });
  }, [saveThemeConfig, pushThemePreview]);

  // Theme tab: applies a draft (e.g. an edited scheme), updates the dirty
  // flag, and pushes a live preview without saving.
  const applyThemeDraft = useCallback((next) => {
    setThemeDraft(next);
    setThemeHasChanges(JSON.stringify(next || {}) !== themeSavedRef.current);
    pushThemePreview(next);
  }, [pushThemePreview]);

  const handleThemeSave = useCallback(async () => {
    if (!themeDraft) return;
    await saveThemeConfig(themeDraft);
    refreshPreview();
  }, [themeDraft, saveThemeConfig]);

  // ===== Per-section colour overrides =========================================
  // Lives in settings.sectionColorOverrides[sectionId][slotKey]. Auto-saves on
  // each edit (parallels toggleSectionVisibility) so the merchant doesn't need
  // a separate Save button — feedback is the live preview itself.
  //
  // The serialized save pattern below ensures rapid colour-picker drags don't
  // queue dozens of requests; we always send the LATEST full overrides map.
  const sectionOverrides = useMemo(() => {
    const settings = siteConfig?.settings;
    if (!settings || typeof settings !== 'object') return {};
    const ov = settings.sectionColorOverrides;
    return (ov && typeof ov === 'object') ? ov : {};
  }, [siteConfig?.settings]);

  // Local optimistic copy so the customizer reflects edits instantly even
  // though `siteConfig` only updates after the save round-trip finishes.
  const [overridesDraft, setOverridesDraft] = useState({});

  const overridesQueueRef = useRef(null);
  const overridesInflightRef = useRef(false);
  // Marks the draft as dirty (user-edited locally). While dirty, we DO NOT
  // overwrite the draft with whatever siteConfig.settings reports, otherwise
  // a stale refetch could snap the inputs back to old values mid-edit.
  const overridesDirtyRef = useRef(false);

  useEffect(() => {
    if (overridesDirtyRef.current) return;
    if (overridesQueueRef.current || overridesInflightRef.current) return;
    setOverridesDraft(sectionOverrides);
  }, [sectionOverrides]);

  const flushOverridesSave = useCallback(async () => {
    if (overridesInflightRef.current) return;
    if (!siteConfig?.id) return;
    overridesInflightRef.current = true;
    try {
      while (overridesQueueRef.current) {
        const toSave = overridesQueueRef.current;
        overridesQueueRef.current = null;
        try {
          const token = sessionStorage.getItem('site_admin_token');
          const res = await fetch(`${API_BASE}/api/sites/${siteConfig.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': token ? `SiteAdmin ${token}` : '',
            },
            body: JSON.stringify({ settings: { sectionColorOverrides: toSave } }),
          });
          if (!res.ok) throw new Error('save failed');
        } catch (e) {
          console.error('[overrides] save failed:', e);
        }
      }
      // Once the queue fully drains we can let server-side state win again,
      // unblocking the resync useEffect for any future siteConfig refetches.
      overridesDirtyRef.current = false;
    } finally {
      overridesInflightRef.current = false;
    }
  }, [siteConfig?.id]);

  const setOverrideForSection = useCallback((sectionId, slotKey, value) => {
    if (!sectionId || !slotKey) return;
    const allowed = SECTION_SLOTS[sectionId] || [];
    if (!allowed.includes(slotKey)) return;
    overridesDirtyRef.current = true;
    setOverridesDraft(prev => {
      const sectionPrev = (prev && prev[sectionId]) || {};
      let nextSection;
      if (value === null || value === undefined || value === '') {
        const { [slotKey]: _, ...rest } = sectionPrev;
        nextSection = rest;
      } else {
        nextSection = { ...sectionPrev, [slotKey]: value };
      }
      const next = { ...(prev || {}) };
      if (Object.keys(nextSection).length === 0) {
        delete next[sectionId];
      } else {
        next[sectionId] = nextSection;
      }
      // Live preview: send a tiny patch with just the section that changed.
      // SiteContext merges per-section so other unrelated overrides survive.
      sendPreviewUpdate({
        _overridesPatch: {
          [sectionId]: Object.keys(nextSection).length === 0 ? null : nextSection,
        },
      });
      // Queue the FULL map for save (backend shallow-merges settings, so we
      // must send the entire sectionColorOverrides blob, not a diff).
      overridesQueueRef.current = next;
      flushOverridesSave();
      return next;
    });
  }, [sendPreviewUpdate, flushOverridesSave]);

  // "Reset to default design" for one section. Clears BOTH the per-section
  // colour overrides AND any explicit scheme assignment, so SchemeScope
  // renders the section pristine (no CSS injected → original storefront
  // design wins). Both flows save independently so the merchant sees the
  // section snap back to original immediately.
  const resetSectionToDefault = useCallback((sectionId) => {
    if (!sectionId) return;
    overridesDirtyRef.current = true;
    setOverridesDraft(prev => {
      const next = { ...(prev || {}) };
      delete next[sectionId];
      sendPreviewUpdate({ _overridesPatch: { [sectionId]: null } });
      overridesQueueRef.current = next;
      flushOverridesSave();
      return next;
    });
    // Clearing the scheme assignment goes through setSchemeForSection's
    // own queued/save path — it knows how to delete the key cleanly and
    // pushes its own theme preview message.
    setSchemeForSection(sectionId, null);
  }, [sendPreviewUpdate, flushOverridesSave, setSchemeForSection]);

  // Backwards-compat alias for any callers still using the old name.
  const resetOverridesForSection = resetSectionToDefault;

  // "Reset entire site to default design" — wipes every section's
  // overrides AND every scheme assignment in one shot. Schemes themselves
  // are preserved (the merchant might still want to use them later); only
  // the assignments and overrides are cleared.
  const resetAllSectionsToDefault = useCallback(() => {
    overridesDirtyRef.current = true;

    // CRITICAL: do BOTH the patch computation AND the clear inside ONE
    // setState updater. React guarantees `prev` here is the live current
    // value. The previous bug was calling setOverridesDraft({}) and then
    // a second setOverridesDraft(prev=>...) — by the time the second ran,
    // prev was already {} and no null patches were sent.
    setOverridesDraft(prev => {
      const wipePatch = {};
      for (const k of Object.keys(prev || {})) wipePatch[k] = null;
      if (Object.keys(wipePatch).length > 0) {
        sendPreviewUpdate({ _overridesPatch: wipePatch });
      }
      return {};
    });

    // Drop the accumulator's stored override patches so an iframe reload
    // doesn't replay them back into existence.
    if (accumulatedSettingsRef.current) {
      accumulatedSettingsRef.current = {
        ...accumulatedSettingsRef.current,
        _overridesPatch: {},
      };
    }

    // Queue the empty save.
    overridesQueueRef.current = {};
    flushOverridesSave();

    // Clear all assignments via the same save path used by setSchemeForSection.
    setThemeDraft(prev => {
      if (!prev) return prev;
      const next = { ...prev, sectionAssignments: {} };
      const queuedAlready = themeAssignSaveRef.current.queued;
      let savedBase = queuedAlready;
      if (!savedBase || !Array.isArray(savedBase.schemes)) {
        try { savedBase = JSON.parse(themeSavedRef.current || '{}'); } catch (e) { savedBase = null; }
      }
      if (!savedBase || !Array.isArray(savedBase.schemes)) savedBase = next;
      const savePayload = { ...savedBase, sectionAssignments: {} };
      themeAssignSaveRef.current.queued = savePayload;
      (async () => {
        if (themeAssignSaveRef.current.inflight) return;
        themeAssignSaveRef.current.inflight = true;
        try {
          while (themeAssignSaveRef.current.queued) {
            const toSave = themeAssignSaveRef.current.queued;
            themeAssignSaveRef.current.queued = null;
            await saveThemeConfig(toSave);
          }
        } finally {
          themeAssignSaveRef.current.inflight = false;
          const draftStr = JSON.stringify(themeDraftRef.current || {});
          setThemeHasChanges(draftStr !== themeSavedRef.current);
        }
      })();
      pushThemePreview(next);
      return next;
    });
  }, [sendPreviewUpdate, flushOverridesSave, saveThemeConfig, pushThemePreview]);

  const sendScrollToSection = useCallback((sectionId) => {
    try {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage({ type: 'FLOMERCE_SCROLL_TO_SECTION', sectionId }, '*');
      }
    } catch (e) { console.warn('[preview] scroll postMessage failed:', e); }
  }, []);

  // When the iframe URL changes (page navigation — e.g. switching from a
  // homepage section to /about), mark it as not-yet-loaded so subsequent
  // scroll messages wait for the new page's load event instead of being
  // posted to the doc that's mid-unloading.
  useEffect(() => {
    iframeLoadedRef.current = false;
  }, [previewUrl]);

  // Auto-scroll the preview iframe to whichever section the user starts editing.
  // Page-level sections (about/contact/blog/etc.) navigate the iframe URL instead,
  // so they don't need a scroll — the page itself is the section.
  //
  // Race we're avoiding: posting a message to an iframe that hasn't finished
  // loading its new page silently drops the message. Rather than a 700ms
  // guess, we send immediately AND let handleIframeLoad re-send after the
  // iframe's own load event fires — whichever happens later wins.
  useEffect(() => {
    if (!activeSection) return;
    const isPageSection =
      PAGE_SECTIONS.some(p => p.id === activeSection) ||
      SETTINGS_SECTIONS.some(s => s.id === activeSection && s.page);
    if (isPageSection) return;
    if (iframeLoadedRef.current) sendScrollToSection(activeSection);
  }, [activeSection, previewKey, sendScrollToSection]);

  const handleIframeLoad = useCallback(() => {
    iframeLoadedRef.current = true;
    // Replay any preview-only state we accumulated before the iframe
    // reload (refresh button, route change, theme save → preview refresh)
    // so unsaved theme/scheme/visibility patches survive across reloads.
    // Without this, a merchant editing colors then triggering any preview
    // refresh would lose all in-flight previews and see the saved state.
    try {
      const accumulated = accumulatedSettingsRef.current;
      if (accumulated && Object.keys(accumulated).length > 0 && iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          { type: 'FLOMERCE_PREVIEW_UPDATE', settings: accumulated },
          '*',
        );
      }
    } catch (e) { console.warn('[preview] replay on load failed:', e); }
    if (!activeSection) return;
    const isPageSection =
      PAGE_SECTIONS.some(p => p.id === activeSection) ||
      SETTINGS_SECTIONS.some(s => s.id === activeSection && s.page);
    if (isPageSection) return;
    sendScrollToSection(activeSection);
  }, [activeSection, sendScrollToSection]);

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

  // Per-section save queue: rapid toggles can race because each click fires its
  // own PUT and the server applies them in network-arrival order, not click
  // order. We serialize per section, always sending the LATEST desired value,
  // so the final server state matches what the user sees.
  const visibilityQueueRef = useRef({});
  const visibilityInflightRef = useRef({});

  async function toggleSectionVisibility(sectionId, showKey) {
    const newVal = !sectionVisibility[sectionId];
    setSectionVisibility(prev => ({ ...prev, [sectionId]: newVal }));
    sendPreviewUpdate({ [showKey]: newVal });

    visibilityQueueRef.current[sectionId] = { val: newVal, showKey };
    if (visibilityInflightRef.current[sectionId]) return;
    visibilityInflightRef.current[sectionId] = true;
    setSavingVisibility(true);

    try {
      while (visibilityQueueRef.current[sectionId]) {
        const { val, showKey: sk } = visibilityQueueRef.current[sectionId];
        visibilityQueueRef.current[sectionId] = null;
        try {
          const token = sessionStorage.getItem('site_admin_token');
          const res = await fetch(`${API_BASE}/api/sites/${siteConfig.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': token ? `SiteAdmin ${token}` : '',
            },
            body: JSON.stringify({ settings: { [sk]: val } }),
          });
          if (!res.ok) throw new Error('save failed');
        } catch (e) {
          console.error('Failed to toggle section:', e);
          // Only revert UI if the user hasn't queued a newer click. If they
          // have, the next loop iteration will send that new value and the
          // server-vs-UI mismatch will resolve naturally.
          if (!visibilityQueueRef.current[sectionId]) {
            setSectionVisibility(prev => ({ ...prev, [sectionId]: !val }));
            sendPreviewUpdate({ [sk]: !val });
          }
        }
      }
    } finally {
      visibilityInflightRef.current[sectionId] = false;
      // Only clear the global "saving" indicator when no other section is
      // still mid-save. Two sections can be toggled concurrently and we don't
      // want one finishing first to falsely show "saved" while another is in
      // flight.
      const stillSaving = Object.values(visibilityInflightRef.current).some(Boolean);
      if (!stillSaving) setSavingVisibility(false);
    }
  }

  // Guarded section change: prompts the user before discarding unsaved edits
  // in the currently active editor. SaveBar publishes the dirty flag into a
  // tiny external store as it renders, so we can read it synchronously here
  // without prop-drilling through every editor.
  async function changeActiveSection(next) {
    if (next === activeSection) return;
    if (isEditorDirty()) {
      const ok = await confirm({
        title: "Discard unsaved changes?",
        message: "You have unsaved changes in this section. Discard them?",
        variant: 'danger',
        confirmText: "Discard",
      });
      if (!ok) return;
    }
    clearEditorDirty();
    setActiveSection(next);
  }

  function renderEditor() {
    if (!activeSection) return null;
    const sec = homepageSections.find(s => s.id === activeSection);
    const props = {
      onSaved: refreshPreview,
      onPreviewUpdate: sendPreviewUpdate,
      // Visibility is owned by the outer customizer so the eye icon and the
      // inner SectionToggle are always in sync. Editors that show a toggle
      // should call onToggleVisibility() instead of managing local state.
      sectionVisible: sec?.fixed ? true : (sectionVisibility[activeSection] !== false),
      onToggleVisibility: sec?.showKey
        ? () => toggleSectionVisibility(activeSection, sec.showKey)
        : null,
    };

    // `key={activeSection}` forces a fresh mount each time the user switches
    // sections — prevents a previously-opened editor from staying mounted and
    // republishing stale preview updates that would override the eye-icon
    // toggle (the original "hide works, show doesn't" bug).
    const inner = (() => { switch (activeSection) {
      case 'navbar': return <NavbarEditor {...props} />;
      case 'promo-banner': return <PromoBannerEditor {...props} />;
      case 'hero-slider': return <HeroSliderEditor {...props} />;
      case 'welcome-banner': return <WelcomeBannerEditor {...props} />;
      case 'categories': return <CategoriesSection {...props} />;
      case 'watchbuy': return <WatchBuySection {...props} />;
      case 'featured-video': return <FeaturedVideoEditor {...props} />;
      case 'customer-reviews': return <CustomerReviewsEditor {...props} />;
      case 'shop-the-look': return <ShopTheLookEditor {...props} />;
      case 'trending-now': return <TrendingNowEditor {...props} />;
      case 'brand-story': return <BrandStoryEditor {...props} />;
      case 'store-locations': return <StoreLocationsEditor {...props} />;
      case 'book-appointment': {
        const locked = !isFeatureAvailable(currentPlan, 'appointmentBooking');
        if (locked) return <FeatureGate currentPlan={currentPlan} requiredPlan="growth" featureName="Appointment Booking"><BookAppointmentEditor {...props} /></FeatureGate>;
        return <BookAppointmentEditor {...props} />;
      }
      case 'contact-us': return <ContactEditor {...props} />;
      case 'checkout': return <CheckoutEditor {...props} />;
      case 'product-page': return <ProductPageEditor {...props} />;
      case 'product-policies': return <ProductPoliciesEditor {...props} />;
      case 'about-us': return <AboutUsEditor {...props} />;
      case 'faq': return <FAQSection />;
      case 'blog': return <BlogSection />;
      case 'terms': return <TermsEditor {...props} />;
      case 'privacy': return <PrivacyEditor {...props} />;
      case 'footer': return <FooterEditor {...props} />;
      default: return null;
    } })();
    return <React.Fragment key={activeSection}>{inner}</React.Fragment>;
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
                    { id: 'sections', label: "Sections", icon: 'fa-layer-group' },
                    { id: 'pages', label: "Pages", icon: 'fa-file-alt' },
                    { id: 'settings', label: "Settings", icon: 'fa-cog' },
                    { id: 'theme', label: "Theme", icon: 'fa-palette' },
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
                  {homepageSections.map((section) => {
                    const isVisible = section.fixed || sectionVisibility[section.id] !== false;
                    const gatedFeature = GATED_TABS[section.id];
                    const isLocked = gatedFeature && !isFeatureAvailable(currentPlan, gatedFeature);

                    return (
                      <div
                        key={section.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '9px 10px', marginBottom: 2,
                          borderRadius: 8, cursor: 'pointer',
                          background: '#fff',
                          border: '1px solid transparent',
                          transition: 'all 0.12s ease',
                          opacity: isVisible ? 1 : 0.5,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                      >
                        <div style={{ width: 12, flexShrink: 0 }} />

                        <div
                          onClick={() => !isLocked && changeActiveSection(section.id)}
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
                            title={isVisible ? "Hide section" : "Show section"}
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
                            onClick={() => changeActiveSection(section.id)}
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
                        onClick={() => !isLocked && changeActiveSection(page.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                          padding: '10px 10px', marginBottom: 2, border: 'none',
                          borderRadius: 8, background: '#fff', cursor: isLocked ? 'default' : 'pointer',
                          fontFamily: 'inherit', textAlign: 'start',
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

              {sidebarTab === 'theme' && (
                <ThemePanel
                  themeConfig={themeDraft}
                  saving={themeSaving}
                  hasChanges={themeHasChanges}
                  onChange={applyThemeDraft}
                  onSave={handleThemeSave}
                  onResetAllToDefault={resetAllSectionsToDefault}
                />
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
                      onClick={() => changeActiveSection(section.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                        padding: '10px 10px', marginBottom: 2, border: 'none',
                        borderRadius: 8, background: '#fff', cursor: 'pointer',
                        fontFamily: 'inherit', textAlign: 'start',
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
        {/* Per-section color scheme dropdown — sits at the top of every
            editor so the merchant can switch this section's palette without
            navigating to the Theme tab. Only shown for sections we know how
            to theme. */}
        {activeSection && SCHEMEABLE_SECTIONS.has(activeSection) && themeDraft && (
          <SchemeAssignmentBar
            sectionId={activeSection}
            themeConfig={themeDraft}
            onAssign={setSchemeForSection}
          />
        )}
        {/* Per-section colour overrides — collapsible, lives below the
            scheme dropdown. Lets the merchant tweak individual slots (e.g.
            promo banner background) without redefining a whole scheme. */}
        {activeSection && SECTION_SLOTS[activeSection] && themeDraft && (() => {
          // Mirror SiteContext.getExplicitSchemeForSection: only treat the
          // section as "themed" when it's been assigned a NON-default scheme.
          // When it's on Default, scheme is null — the panel then says
          // "this section uses the original design" and shows no scheme hex.
          const assignments = themeDraft.sectionAssignments || {};
          const targetId = assignments[activeSection];
          const def = themeDraft.schemes?.find(s => s.isDefault) || null;
          const isExplicit = !!(targetId && (!def || def.id !== targetId));
          const explicitScheme = isExplicit
            ? (themeDraft.schemes?.find(s => s.id === targetId) || null)
            : null;
          return (
            <SectionColorOverrides
              sectionId={activeSection}
              scheme={explicitScheme}
              hasExplicitAssignment={isExplicit}
              overrides={overridesDraft[activeSection] || {}}
              onChange={(slot, val) => setOverrideForSection(activeSection, slot, val)}
              onResetToDefault={() => resetSectionToDefault(activeSection)}
            />
          );
        })()}
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
              key={previewKey}
              src={`${previewUrl}${previewUrl.includes('?') ? '&' : '?'}_t=${previewKey}`}
              onLoad={handleIframeLoad}
              style={{
                width: useMobileFrame ? 390 : '100%',
                height: useMobileFrame ? 'calc(100% - 28px)' : '100%',
                border: 'none', display: 'block',
                transition: 'width 0.2s ease',
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
          {!isMobile && "Admin"}
        </button>
        {!isMobile && <div style={{ width: 1, height: 24, background: '#e2e8f0' }} />}
        <span style={{
          fontSize: isMobile ? 14 : 15, fontWeight: 700, color: '#0f172a',
          letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          <i className="fas fa-palette" style={{ marginInlineEnd: 8, color: '#2563eb', fontSize: 14 }} />
          {isMobile ? "Edit" : "Visual Customizer"}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 8, flexShrink: 0 }}>
        {savingVisibility && !isMobile && (
          <span style={{ fontSize: 12, color: '#64748b' }}>
            <i className="fas fa-circle-notch fa-spin" style={{ marginInlineEnd: 4, fontSize: 10 }} />
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
            borderInlineEnd: '1px solid #e2e8f0',
            display: 'flex', flexDirection: 'column',
            transition: 'width 0.2s ease',
            overflow: 'hidden',
          }}>
            {activeSection
              ? renderEditorPanel(() => changeActiveSection(null))
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
          aria-label={activeSection ? `Edit ${getSectionLabel(activeSection)}` : "Choose a section to edit"}
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
                  aria-label={sheetExpanded ? "Collapse editor" : "Expand editor"}
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
                  ? renderEditorPanel(() => changeActiveSection(null))
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
          {activeSection ? `Edit ${getSectionLabel(activeSection)}` : "Edit Website"}
        </button>
      )}
    </div>
  );
}
