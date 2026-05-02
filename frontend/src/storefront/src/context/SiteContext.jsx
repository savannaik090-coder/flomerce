import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import { PLATFORM_DOMAIN, PLATFORM_URL, API_BASE } from '../config.js';

export const SiteContext = createContext(null);

function isCustomDomain() {
  const hostname = window.location.hostname;
  return !hostname.endsWith(PLATFORM_DOMAIN) && !hostname.endsWith('pages.dev') &&
    hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.includes('replit') &&
    !hostname.includes('workers.dev');
}

function getSubdomain() {
  const hostname = window.location.hostname;
  const hostParts = hostname.split('.');

  if (hostname.endsWith(PLATFORM_DOMAIN)) {
    if (hostParts.length >= 3 && hostParts[0] !== 'www') {
      return hostParts[0];
    }
  } else if (hostname.endsWith('pages.dev')) {
    if (hostParts.length >= 4) {
      return hostParts[0];
    }
  }

  const params = new URLSearchParams(window.location.search);
  const subdomainParam = params.get('subdomain');
  if (subdomainParam) return subdomainParam;

  if (isCustomDomain()) {
    return '__custom_domain__';
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('replit')) {
    const stored = localStorage.getItem('dev_subdomain');
    if (stored) return stored;
    return params.get('subdomain') || null;
  }

  return null;
}

export function SiteProvider({ children }) {
  const [siteConfig, setSiteConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subdomain, setSubdomain] = useState(null);
  const [previewSettings, setPreviewSettings] = useState(null);

  useEffect(() => {
    let isInIframe = false;
    try { isInIframe = window.self !== window.top; } catch (e) { isInIframe = true; }
    if (!isInIframe) return;

    const SECTION_SELECTORS = {
      'navbar': ['.header', '.mn-navbar', 'header'],
      'promo-banner': ['.promo-banner', '.announcement-bar'],
      'hero-slider': ['.hero-slider', '.modern-hero'],
      'welcome-banner': ['.welcome-banner', '.first-visit-modal-content'],
      'categories': ['.choose-by-category', '.mn-choose-section', '.home-category-section', '.mn-category-section'],
      'watchbuy': ['.wb-section'],
      'featured-video': ['.fv-section'],
      'shop-the-look': ['.stl-section'],
      'store-locations': ['.store-locations-section'],
      'trending-now': ['.mn-trending-section'],
      'brand-story': ['.mn-brand-section'],
      'customer-reviews': ['#customer-reviews', '.customer-reviews-section', '.mn-customer-reviews'],
      'footer': ['.footer-minimalist', '.mn-footer', 'footer'],
    };

    function findSectionEl(sectionId) {
      const dataMatch = document.querySelector(`[data-flomerce-section="${sectionId}"]`);
      if (dataMatch) return dataMatch;
      const selectors = SECTION_SELECTORS[sectionId] || [];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) return el;
      }
      return null;
    }

    function tryScroll(sectionId, attempt = 0) {
      const el = findSectionEl(sectionId);
      if (el) {
        try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
        return;
      }
      if (attempt < 4) setTimeout(() => tryScroll(sectionId, attempt + 1), 400);
    }

    function handleMessage(event) {
      if (!event.data) return;
      if (event.data.type === 'FLOMERCE_PREVIEW_UPDATE') {
        setPreviewSettings(prev => ({ ...(prev || {}), ...event.data.settings }));
        return;
      }
      if (event.data.type === 'FLOMERCE_SCROLL_TO_SECTION' && event.data.sectionId) {
        tryScroll(event.data.sectionId);
        return;
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    const detected = getSubdomain();
    setSubdomain(detected);

    if (!detected) {
      setError('No store detected. Please access via a store subdomain.');
      setLoading(false);
      return;
    }

    fetchSiteConfig(detected);
  }, []);

  async function fetchSiteConfig(sub, isRefetch = false) {
    try {
      if (!isRefetch) setLoading(true);
      let apiUrl;
      if (sub === '__custom_domain__') {
        apiUrl = `/api/site`;
      } else {
        const apiBase = API_BASE;
        apiUrl = `${apiBase}/api/site?subdomain=${encodeURIComponent(sub)}`;
      }
      const adminToken = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('site_admin_token') : null;
      // Phase 3: SiteContext is the very first fetch on page load and the source
      // of nav/footer/category names. It bypasses apiRequest, so the shopper's
      // chosen language must be appended directly here. Admins are excluded so
      // they always edit against the source-language data.
      if (!adminToken && typeof window !== 'undefined') {
        let shopperLang = null;
        try { shopperLang = window.localStorage?.getItem('flomerce_lang'); } catch (e) { /* ignore */ }
        if (shopperLang && !apiUrl.includes('lang=')) {
          apiUrl += (apiUrl.includes('?') ? '&' : '?') + 'lang=' + encodeURIComponent(shopperLang);
        }
      }
      const fetchOpts = adminToken ? { cache: 'no-store' } : {};
      const response = await fetch(apiUrl, fetchOpts);
      if (!response.ok) {
        throw new Error('Store not found');
      }
      const result = await response.json();
      if (!result.success || !result.data) {
        throw new Error('Invalid store data');
      }

      const data = result.data;
      let parsedSettings = data.settings || {};
      if (typeof parsedSettings === 'string') {
        try { parsedSettings = JSON.parse(parsedSettings); } catch (e) { parsedSettings = {}; }
      }
      const config = {
        id: data.id,
        subdomain: data.subdomain,
        brandName: data.brand_name,
        category: data.category,
        templateId: data.template_id,
        logoUrl: data.logo_url,
        faviconUrl: data.favicon_url,
        primaryColor: data.primary_color || '#000000',
        secondaryColor: data.secondary_color || '#ffffff',
        phone: data.phone || parsedSettings.phone || '',
        whatsapp: parsedSettings.whatsapp || '',
        showFloatingButton: parsedSettings.showFloatingButton !== false,
        email: data.email || parsedSettings.email || '',
        address: data.address || parsedSettings.address || '',
        socialLinks: data.socialLinks || {},
        settings: parsedSettings,
        categories: data.categories || [],
        customDomain: data.custom_domain || null,
        domainStatus: data.domain_status || null,
        subscriptionPlan: data.subscription_plan || null,
        contentLanguage: data.content_language || 'en',
        translatorEnabled: data.translator_enabled === 1 || data.translator_enabled === true,
        translatorLanguages: (() => {
          const raw = data.translator_languages;
          if (Array.isArray(raw)) return raw;
          if (typeof raw === 'string' && raw) {
            try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; }
            catch (e) { return []; }
          }
          return [];
        })(),
      };

      // English-default policy: the storefront intentionally does NOT
      // auto-switch a first-time shopper into the merchant's content_language.
      // Every visitor boots in English and only changes language when they
      // explicitly pick another option from the LanguageSwitcher (System B).
      // The merchant's content_language is still used elsewhere (SEO, server-
      // side product translation), but it no longer drives the shopper UI on
      // first paint.

      config.seo = {
        seo_title: data.seo_title || null,
        seo_description: data.seo_description || null,
        seo_og_image: data.seo_og_image || null,
        seo_robots: data.seo_robots || 'index, follow',
        google_verification: data.google_verification || null,
      };

      config.pageSEO = data.pageSEO || {};
      config.googleClientId = data.googleClientId || null;
      config.vapidPublicKey = data.vapidPublicKey || null;

      setSiteConfig(config);
      setPreviewSettings(null);

      if (config.faviconUrl) {
        const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        link.href = config.faviconUrl;
        document.head.appendChild(link);
      }
    } catch (err) {
      console.error('Failed to load site config:', err);
      setError(err.message || 'Failed to load store');
    } finally {
      if (!isRefetch) setLoading(false);
    }
  }

  const effectiveSiteConfig = useMemo(() => {
    if (!previewSettings || !siteConfig) return siteConfig;
    const { logoUrl: pLogoUrl, _previewCategories, ...settingsOverrides } = previewSettings;
    const merged = { ...siteConfig, settings: { ...(siteConfig.settings || {}), ...settingsOverrides } };
    if (pLogoUrl !== undefined) merged.logoUrl = pLogoUrl || null;
    if (Array.isArray(_previewCategories)) {
      merged.categories = _previewCategories;
      merged.settings._previewCategories = _previewCategories;
    }
    return merged;
  }, [previewSettings, siteConfig]);

  // Per-section color customization — promo banner.
  // Inject merchant-saved values as CSS custom properties on :root so they
  // cascade everywhere the variable is used. We use !important so a saved
  // value beats element-level defaults declared by template overrides
  // (e.g. .promo-banner.modern-theme sets --promo-bg: #111 directly on the
  // element, which would otherwise win over an inherited :root value).
  // When a value is not set, we removeProperty so the CSS defaults from
  // variables.css (and any template-level overrides) take back over.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const settings = effectiveSiteConfig?.settings || {};
    const root = document.documentElement;
    const apply = (cssVar, value) => {
      if (value && typeof value === 'string' && value.trim() !== '') {
        root.style.setProperty(cssVar, value, 'important');
      } else {
        root.style.removeProperty(cssVar);
      }
    };
    apply('--promo-bg', settings.promoBannerBg);
    apply('--promo-text', settings.promoBannerText);
    apply('--promo-font', settings.promoBannerFont);

    // Navigation customization (classic + modern share these).
    apply('--nav-bg', settings.navBg);
    apply('--nav-text', settings.navText);
    apply('--nav-link-text', settings.navLinkText);
    apply('--nav-link-hover', settings.navLinkHover);
    apply('--nav-icon', settings.navIcon);
    apply('--nav-font', settings.navFont);
    apply('--brand-color', settings.brandColor);
    apply('--brand-font', settings.brandFont);
    apply('--nav-transparent-text', settings.navTransparentText);

    // Cart + wishlist side-panel customization (single shared block).
    apply('--panel-bg', settings.panelBg);
    apply('--panel-text', settings.panelText);
    apply('--panel-muted', settings.panelMuted);
    apply('--panel-accent', settings.panelAccent);
    apply('--panel-accent-text', settings.panelAccentText);
    apply('--panel-font', settings.panelFont);

    // Hero section customization — typography, button, overlay.
    // Classic hero reads these CSS vars directly from hero.css.
    // Modern hero (HeroSplit) computes inline styles from siteConfig.settings
    // so it isn't blocked by the CSS variable layer, but title/desc/overlay
    // vars are shared across both themes.
    apply('--hero-title-color', settings.heroTitleColor);
    apply('--hero-title-font', settings.heroTitleFont);
    apply('--hero-desc-color', settings.heroDescColor);

    // Overlay (shared: classic uses .slide::after, modern uses .modern-hero-image::after).
    apply('--hero-overlay-color', settings.heroOverlayColor);
    apply('--hero-overlay-opacity', settings.heroOverlayOpacity);

    // Button — only applied to classic hero (.shop-now-btn).
    // Modern hero button styling is handled inline in HeroSplit.jsx.
    const heroBtnStyle = settings.heroBtnStyle || '';
    const heroBtnBg = settings.heroBtnBg || '';
    const heroBtnText = settings.heroBtnText || '';
    const heroBtnRadius = settings.heroBtnRadius || '';
    const radiusMap = { sharp: '0', rounded: '8px', pill: '999px' };
    apply('--hero-btn-radius', radiusMap[heroBtnRadius] || '');
    if (heroBtnStyle === 'outlined') {
      apply('--hero-btn-bg', 'transparent');
      apply('--hero-btn-text', heroBtnText || heroBtnBg);
      apply('--hero-btn-border', `2px solid ${heroBtnBg || 'currentColor'}`);
    } else if (heroBtnStyle === 'ghost') {
      apply('--hero-btn-bg', 'rgba(255,255,255,0.15)');
      apply('--hero-btn-text', heroBtnText);
      apply('--hero-btn-border', '1px solid rgba(255,255,255,0.5)');
    } else {
      apply('--hero-btn-bg', heroBtnBg);
      apply('--hero-btn-text', heroBtnText);
      root.style.removeProperty('--hero-btn-border');
    }

    // Hero text alignment (Classic .slide-content only)
    const heroTextAlign = settings.heroTextAlign || '';
    if (heroTextAlign && heroTextAlign !== 'center') {
      apply('--hero-text-align', heroTextAlign);
      apply('--hero-content-left', heroTextAlign === 'left' ? '60px' : 'auto');
      apply('--hero-content-right', heroTextAlign === 'right' ? '60px' : 'auto');
      apply('--hero-content-transform', 'none');
    } else {
      root.style.removeProperty('--hero-text-align');
      root.style.removeProperty('--hero-content-left');
      root.style.removeProperty('--hero-content-right');
      root.style.removeProperty('--hero-content-transform');
    }
  }, [effectiveSiteConfig]);

  return (
    <SiteContext.Provider value={{ siteConfig: effectiveSiteConfig, loading, error, subdomain, refetchSite: () => subdomain && fetchSiteConfig(subdomain, true) }}>
      {children}
    </SiteContext.Provider>
  );
}
