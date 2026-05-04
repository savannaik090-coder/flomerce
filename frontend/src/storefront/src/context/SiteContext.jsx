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
    // ── Global Brand Identity (Classic template) ─────────────────────
    // We set both the --brand-* bridge vars AND the concrete semantic vars
    // (--color-primary, --color-secondary, etc.) directly via JS with
    // !important. This is necessary because global.css also declares these
    // same semantic vars on :root (for admin-panel UI defaults) and, due to
    // CSS source order, would otherwise win over the variables.css cascade
    // chain. Inline !important beats any stylesheet rule regardless of order.
    // Per-section overrides (set below in this same effect) also use !important
    // inline styles, so they continue to take precedence over brand-level values
    // wherever a merchant has explicitly set a section-specific colour.
    apply('--brand-primary',      settings.brandPrimary);
    apply('--brand-accent',       settings.brandAccent);
    apply('--brand-promo',        settings.brandPromo);
    apply('--brand-bg',           settings.brandBg);
    apply('--brand-heading-font', settings.brandHeadingFont);
    apply('--brand-body-font',    settings.brandBodyFont);

    // Directly write concrete semantic vars so the brand colour wins even
    // when global.css or modern.css redefines the same :root keys.
    // --color-secondary uses brandSecondary when set, falls back to brandPrimary.
    apply('--color-primary',     settings.brandPrimary);
    apply('--color-secondary',   settings.brandSecondary || settings.brandPrimary);
    apply('--color-accent',      settings.brandAccent);
    apply('--color-accent-gold', settings.brandAccent);
    apply('--color-bg',          settings.brandBg);
    apply('--font-heading',      settings.brandHeadingFont);
    apply('--font-primary',      settings.brandBodyFont);

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
    // Transparent-mode per-element colour sources (each maps to its own
    // appearance control; CSS fallback is #ffffff for visibility over hero).
    apply('--nav-transparent-link', settings.navLinkText);
    apply('--nav-transparent-brand', settings.brandColor);
    apply('--nav-transparent-icon', settings.navIcon);

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
    apply('--hero-desc-font',  settings.heroDescFont);

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
    apply('--hero-btn-font',   settings.heroBtnFont);
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

    // ── Category section appearance ──────────────────────────────────
    apply('--cat-title-color', settings.catTitleColor);
    apply('--cat-title-font', settings.catTitleFont);
    apply('--cat-subtitle-color', settings.catSubtitleColor);
    apply('--cat-subtitle-font', settings.catSubtitleFont);
    apply('--cat-divider-color', settings.catDividerColor);
    apply('--cat-banner-overlay-color', settings.catBannerOverlayColor);
    if (settings.catBannerOverlayOpacity !== undefined && settings.catBannerOverlayOpacity !== '') {
      root.style.setProperty('--cat-banner-overlay-opacity', settings.catBannerOverlayOpacity);
    } else {
      root.style.removeProperty('--cat-banner-overlay-opacity');
    }
    // Classic-template overlay banner text & button (CategoriesSection.jsx
    // gates these to the Classic template; the variables are still applied
    // here unconditionally so a value set on Classic continues to apply if
    // the merchant later switches templates and back).
    apply('--cat-banner-title-color',   settings.catBannerTitleColor);
    apply('--cat-banner-title-font',    settings.catBannerTitleFont);
    apply('--cat-banner-divider-color', settings.catBannerDividerColor);
    apply('--cat-banner-btn-bg',        settings.catBannerBtnBg);
    apply('--cat-banner-btn-text',      settings.catBannerBtnText);
    apply('--cat-banner-btn-font',      settings.catBannerBtnFont);
    // When the merchant gives the "VIEW ALL" button a background, also
    // align its border with the new background so we don't leave the
    // default white border floating around a coloured fill. When no
    // background is set, fall back to the existing white border.
    if (settings.catBannerBtnBg) {
      root.style.setProperty('--cat-banner-btn-border-color', settings.catBannerBtnBg);
    } else {
      root.style.removeProperty('--cat-banner-btn-border-color');
    }
    // Modern-template overlay banner text ("Shop {name}" hover label).
    apply('--mn-cat-banner-text-color', settings.catBannerTextColorModern);
    apply('--mn-cat-banner-text-font',  settings.catBannerTextFontModern);
    // Classic-template product card + carousel arrow button styles. Each
    // var falls back to the existing hardcoded default in the consuming
    // CSS / inline style, so unset values render exactly as before.
    apply('--cat-product-name-color',  settings.catProductNameColor);
    apply('--cat-product-name-font',   settings.catProductNameFont);
    apply('--cat-product-price-color', settings.catProductPriceColor);
    apply('--cat-product-price-font',  settings.catProductPriceFont);
    apply('--cat-arrow-bg',            settings.catArrowBg);
    apply('--cat-arrow-color',         settings.catArrowColor);
    apply('--cat-arrow-border-color',  settings.catArrowColor);
    apply('--cat-arrow-hover-bg',      settings.catArrowHoverBg);
    // Modern-template product card styles (scoped via .mn-category-section
    // in modern.css so they only apply inside the Categories grid, not on
    // product listing or search pages).
    apply('--mn-cat-product-name-color',  settings.catProductNameColorModern);
    apply('--mn-cat-product-name-font',   settings.catProductNameFontModern);
    apply('--mn-cat-product-price-color', settings.catProductPriceColorModern);
    apply('--mn-cat-product-price-font',  settings.catProductPriceFontModern);
    // View All button style
    const catViewAllStyle = settings.catViewAllStyle || '';
    const catViewAllBg    = settings.catViewAllBg    || '';
    const catViewAllText  = settings.catViewAllText  || '';
    if (catViewAllStyle === 'filled') {
      apply('--cat-view-all-bg',     catViewAllBg);
      apply('--cat-view-all-text',   catViewAllText);
      root.style.removeProperty('--cat-view-all-border');
    } else if (catViewAllStyle === 'outlined') {
      root.style.setProperty('--cat-view-all-bg',   'transparent');
      apply('--cat-view-all-text',  catViewAllText || catViewAllBg);
      apply('--cat-view-all-border', `2px solid ${catViewAllBg || 'currentColor'}`);
    } else {
      // text-link or unset
      root.style.removeProperty('--cat-view-all-bg');
      apply('--cat-view-all-text',  catViewAllText || catViewAllBg);
      root.style.removeProperty('--cat-view-all-border');
    }

    // ── Category page (/category/:slug) appearance ───────────────────
    // Two independent style sets keyed by template:
    //   classicStyle → --cat-page-*    (consumed by category.css)
    //   modernStyle  → --mn-cat-page-* (consumed by modern.css + category.css)
    // Both var sets coexist on :root because each one is consumed by
    // selectors scoped to their own theme (`.category-page:not(.modern-theme)`
    // for Classic, `.modern-theme.category-page` for Modern), so they never
    // collide. Unset keys are removed so CSS fallbacks render today's look.
    const applyCategoryPageStyle = (style, prefix) => {
      const s = style && typeof style === 'object' ? style : {};
      const px = (v, suffix) => (v !== undefined && v !== null && v !== '' ? `${v}${suffix || ''}` : '');
      apply(`--${prefix}-bg`,                      s.pageBg);
      apply(`--${prefix}-hero-title-color`,        s.heroTitleColor);
      apply(`--${prefix}-hero-title-font`,         s.heroTitleFont);
      apply(`--${prefix}-hero-title-size`,         px(s.heroTitleSize, 'px'));
      apply(`--${prefix}-hero-title-weight`,       s.heroTitleWeight);
      apply(`--${prefix}-hero-subtitle-color`,     s.heroSubtitleColor);
      apply(`--${prefix}-hero-subtitle-font`,      s.heroSubtitleFont);
      apply(`--${prefix}-hero-subtitle-size`,      px(s.heroSubtitleSize, 'px'));
      apply(`--${prefix}-hero-subtitle-style`,     s.heroSubtitleItalic === false ? 'normal' : (s.heroSubtitleItalic === true ? 'italic' : ''));
      apply(`--${prefix}-hero-overlay-color`,      s.heroOverlayColor);
      if (s.heroOverlayOpacity !== undefined && s.heroOverlayOpacity !== '' && s.heroOverlayOpacity !== null) {
        root.style.setProperty(`--${prefix}-hero-overlay-opacity`, String(s.heroOverlayOpacity), 'important');
      } else {
        root.style.removeProperty(`--${prefix}-hero-overlay-opacity`);
      }
      apply(`--${prefix}-chip-strip-bg`,           s.chipStripBg);
      apply(`--${prefix}-chip-strip-border`,       s.chipStripBorderColor);
      apply(`--${prefix}-chip-bg`,                 s.chipBg);
      apply(`--${prefix}-chip-border`,             s.chipBorderColor);
      apply(`--${prefix}-chip-text`,               s.chipTextColor);
      apply(`--${prefix}-chip-font`,               s.chipFont);
      apply(`--${prefix}-chip-active-bg`,          s.chipActiveBg);
      apply(`--${prefix}-chip-active-text`,        s.chipActiveTextColor);
      apply(`--${prefix}-chip-active-border`,      s.chipActiveBorderColor);
      apply(`--${prefix}-filter-strip-bg`,         s.filterStripBg);
      apply(`--${prefix}-filter-strip-border`,     s.filterStripBorderColor);
      apply(`--${prefix}-filter-strip-text`,       s.filterStripTextColor);
      apply(`--${prefix}-filter-strip-font`,       s.filterStripFont);
      apply(`--${prefix}-count-color`,             s.productCountColor);
      apply(`--${prefix}-count-font`,              s.productCountFont);
    };
    applyCategoryPageStyle(settings.categoryPage?.classicStyle, 'cat-page');
    applyCategoryPageStyle(settings.categoryPage?.modernStyle,  'mn-cat-page');

    // ── Choose by Category appearance ────────────────────────────────
    apply('--choose-overlay-color', settings.chooseOverlayColor);
    if (settings.chooseOverlayOpacity !== undefined && settings.chooseOverlayOpacity !== '') {
      root.style.setProperty('--choose-overlay-opacity', settings.chooseOverlayOpacity);
    } else {
      root.style.removeProperty('--choose-overlay-opacity');
    }
    apply('--choose-label-color', settings.chooseLabelColor);
    apply('--choose-label-font',  settings.chooseLabelFont);
    // Classic-template label pill background (Modern's label sits directly
    // on the gradient with no pill, so this var is unused there). Falls back
    // to the existing rgba(255,255,255,0.98) when unset.
    apply('--choose-label-bg',    settings.chooseLabelBg);
    apply('--choose-explore-color', settings.chooseExploreColor);
    apply('--choose-explore-font',  settings.chooseExploreFont);
    const chooseCardShape = settings.chooseCardShape || '';
    root.style.setProperty('--choose-card-radius', chooseCardShape === 'sharp' ? '0px' : '25px');

    // ── Watch & Buy appearance ───────────────────────────────────────
    apply('--wb-heading-color', settings.wbHeadingColor);
    apply('--wb-heading-font', settings.wbHeadingFont);
    apply('--wb-divider-color', settings.wbDividerColor);
    apply('--wb-card-border', settings.wbCardBorder);

    // ── Featured Video appearance ────────────────────────────────────
    apply('--fv-title-color', settings.fvTitleColor);
    apply('--fv-title-font', settings.fvTitleFont);
    apply('--fv-desc-color', settings.fvDescColor);
    apply('--fv-desc-font', settings.fvDescFont);
    apply('--fv-btn-bg', settings.fvBtnBg);
    apply('--fv-btn-text', settings.fvBtnText);
    const fvBtnRadiusMap = { sharp: '0px', rounded: '8px', pill: '999px' };
    apply('--fv-btn-radius', fvBtnRadiusMap[settings.fvBtnRadius] || '');

    // ── Shop the Look appearance ─────────────────────────────────────
    apply('--stl-heading-color', settings.stlHeadingColor);
    apply('--stl-heading-font', settings.stlHeadingFont);
    apply('--stl-divider-color', settings.stlDividerColor);
    apply('--stl-accent-color', settings.stlAccentColor);

    // ── Store Locations appearance (Classic) ─────────────────────────
    apply('--sl-classic-section-bg',     settings.slClassicSectionBg);
    apply('--sl-classic-title-color',    settings.slClassicTitleColor);
    apply('--sl-classic-title-font',     settings.slClassicTitleFont);
    apply('--sl-classic-subtitle-color', settings.slClassicSubtitleColor);
    apply('--sl-classic-subtitle-font',  settings.slClassicSubtitleFont);
    apply('--sl-classic-card-bg',        settings.slClassicCardBg);
    apply('--sl-classic-storename-color',settings.slClassicStoreNameColor);
    apply('--sl-classic-storename-font', settings.slClassicStoreNameFont);
    apply('--sl-classic-info-color',     settings.slClassicInfoTextColor);
    apply('--sl-classic-accent-color',   settings.slClassicAccentColor);
    apply('--sl-classic-bookbtn-bg',     settings.slClassicBookBtnBg);
    apply('--sl-classic-bookbtn-text',   settings.slClassicBookBtnText);
    apply('--sl-classic-arrow-bg',       settings.slClassicArrowBg);
    apply('--sl-classic-arrow-icon',     settings.slClassicArrowIcon);

    // ── Store Locations appearance (Modern) ──────────────────────────
    apply('--sl-modern-section-bg',     settings.slModernSectionBg);
    apply('--sl-modern-title-color',    settings.slModernTitleColor);
    apply('--sl-modern-title-font',     settings.slModernTitleFont);
    apply('--sl-modern-subtitle-color', settings.slModernSubtitleColor);
    apply('--sl-modern-subtitle-font',  settings.slModernSubtitleFont);
    apply('--sl-modern-card-bg',        settings.slModernCardBg);
    apply('--sl-modern-storename-color',settings.slModernStoreNameColor);
    apply('--sl-modern-storename-font', settings.slModernStoreNameFont);
    apply('--sl-modern-info-color',     settings.slModernInfoTextColor);
    apply('--sl-modern-accent-color',   settings.slModernAccentColor);
    apply('--sl-modern-bookbtn-bg',     settings.slModernBookBtnBg);
    apply('--sl-modern-bookbtn-text',   settings.slModernBookBtnText);
    apply('--sl-modern-arrow-bg',       settings.slModernArrowBg);
    apply('--sl-modern-arrow-icon',     settings.slModernArrowIcon);

    // ── Customer Reviews appearance (Classic) ────────────────────────
    apply('--cr-classic-section-bg',     settings.crClassicSectionBg);
    apply('--cr-classic-title-color',    settings.crClassicTitleColor);
    apply('--cr-classic-title-font',     settings.crClassicTitleFont);
    apply('--cr-classic-subtitle-color', settings.crClassicSubtitleColor);
    apply('--cr-classic-subtitle-font',  settings.crClassicSubtitleFont);
    apply('--cr-classic-card-bg',        settings.crClassicCardBg);
    apply('--cr-classic-card-border',    settings.crClassicCardBorder);
    apply('--cr-classic-text-color',     settings.crClassicTextColor);
    apply('--cr-classic-text-font',      settings.crClassicTextFont);
    apply('--cr-classic-name-color',     settings.crClassicNameColor);
    apply('--cr-classic-stars-color',    settings.crClassicStarsColor);
    apply('--cr-classic-quote-color',    settings.crClassicQuoteColor);
    apply('--cr-classic-cta-bg',         settings.crClassicCtaBtnBg);
    apply('--cr-classic-cta-text',       settings.crClassicCtaBtnText);
    apply('--cr-classic-arrow-bg',       settings.crClassicArrowBg);
    apply('--cr-classic-arrow-icon',     settings.crClassicArrowIcon);

    // ── Footer appearance (Classic) ──────────────────────────────────
    apply('--footer-classic-bg',                  settings.footerClassicFooterBg);
    apply('--footer-classic-section-title-color', settings.footerClassicSectionTitleColor);
    apply('--footer-classic-section-title-font',  settings.footerClassicSectionTitleFont);
    apply('--footer-classic-link-color',          settings.footerClassicLinkColor);
    apply('--footer-classic-link-font',           settings.footerClassicLinkFont);
    apply('--footer-classic-follow-title-color',  settings.footerClassicFollowTitleColor);
    apply('--footer-classic-contact-color',       settings.footerClassicContactColor);
    apply('--footer-classic-contact-font',        settings.footerClassicContactFont);
    apply('--footer-classic-social-icon-bg',      settings.footerClassicSocialIconBg);
    apply('--footer-classic-social-icon-color',   settings.footerClassicSocialIconColor);
    apply('--footer-classic-social-icon-border',  settings.footerClassicSocialIconBorder);
    apply('--footer-classic-app-title-color',     settings.footerClassicAppTitleColor);
    apply('--footer-classic-app-title-font',      settings.footerClassicAppTitleFont);
    apply('--footer-classic-app-banner-bg',       settings.footerClassicAppBannerBg);
    apply('--footer-classic-bottom-bg',           settings.footerClassicBottomBg);
    apply('--footer-classic-copyright-color',     settings.footerClassicCopyrightColor);
    apply('--footer-classic-bottom-links-color',  settings.footerClassicBottomLinksColor);
    apply('--footer-classic-powered-by-color',    settings.footerClassicPoweredByColor);

    // ── Footer appearance (Modern) ───────────────────────────────────
    apply('--footer-modern-bg',                  settings.footerModernFooterBg);
    apply('--footer-modern-heading-color',       settings.footerModernHeadingColor);
    apply('--footer-modern-heading-font',        settings.footerModernHeadingFont);
    apply('--footer-modern-contact-color',       settings.footerModernContactColor);
    apply('--footer-modern-social-icon-color',   settings.footerModernSocialIconColor);
    apply('--footer-modern-social-icon-border',  settings.footerModernSocialIconBorder);
    apply('--footer-modern-social-hover-bg',     settings.footerModernSocialHoverBg);
    apply('--footer-modern-col-title-color',     settings.footerModernColTitleColor);
    apply('--footer-modern-col-title-font',      settings.footerModernColTitleFont);
    apply('--footer-modern-link-color',          settings.footerModernLinkColor);
    apply('--footer-modern-link-font',           settings.footerModernLinkFont);
    apply('--footer-modern-app-label-color',     settings.footerModernAppLabelColor);
    apply('--footer-modern-bottom-bg',           settings.footerModernBottomBg);
    apply('--footer-modern-bottom-divider-color',settings.footerModernBottomDividerColor);
    apply('--footer-modern-copyright-color',     settings.footerModernCopyrightColor);
    apply('--footer-modern-bottom-link-color',   settings.footerModernBottomLinkColor);

    // ── Customer Reviews appearance (Modern) ─────────────────────────
    apply('--cr-modern-section-bg',     settings.crModernSectionBg);
    apply('--cr-modern-title-color',    settings.crModernTitleColor);
    apply('--cr-modern-title-font',     settings.crModernTitleFont);
    apply('--cr-modern-subtitle-color', settings.crModernSubtitleColor);
    apply('--cr-modern-subtitle-font',  settings.crModernSubtitleFont);
    apply('--cr-modern-card-bg',        settings.crModernCardBg);
    apply('--cr-modern-card-border',    settings.crModernCardBorder);
    apply('--cr-modern-text-color',     settings.crModernTextColor);
    apply('--cr-modern-text-font',      settings.crModernTextFont);
    apply('--cr-modern-name-color',     settings.crModernNameColor);
    apply('--cr-modern-stars-color',    settings.crModernStarsColor);
    apply('--cr-modern-cta-bg',         settings.crModernCtaBtnBg);
    apply('--cr-modern-cta-text',       settings.crModernCtaBtnText);
    apply('--cr-modern-arrow-bg',       settings.crModernArrowBg);
    apply('--cr-modern-arrow-icon',     settings.crModernArrowIcon);

    // Arrow button customization (shared by classic + modern).
    apply('--hero-arrow-bg',    settings.heroArrowBg);
    apply('--hero-arrow-color', settings.heroArrowColor);

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
