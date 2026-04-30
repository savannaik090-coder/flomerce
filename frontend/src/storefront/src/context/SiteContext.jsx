import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import { PLATFORM_DOMAIN, PLATFORM_URL, API_BASE } from '../config.js';
import { schemeToCssVars } from '../components/theme/SchemeScope.jsx';

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
        // Shallow-merge top-level keys, but `_overridesPatch` needs per-section
        // accumulation: editing navbar after promo must not drop the unsaved
        // promo preview. Each per-section value is the FULL replacement state
        // for that section (or null = remove that section's overrides).
        setPreviewSettings(prev => {
          const next = { ...(prev || {}), ...event.data.settings };
          const incoming = event.data.settings || {};
          if (incoming._overridesPatch && typeof incoming._overridesPatch === 'object') {
            const prevPatch = (prev && prev._overridesPatch) || {};
            next._overridesPatch = { ...prevPatch, ...incoming._overridesPatch };
          }
          return next;
        });
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
      // Backend always returns a structurally valid theme_config (parsed
      // object), but we still defend against a string payload (older API
      // builds) and silently fall back to nothing — SiteContext's resolver
      // synthesises a Brand-only theme from primary/secondary in that case.
      let parsedTheme = data.theme_config || null;
      if (typeof parsedTheme === 'string') {
        try { parsedTheme = JSON.parse(parsedTheme); } catch (e) { parsedTheme = null; }
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
        themeConfig: parsedTheme,
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
    const {
      logoUrl: pLogoUrl,
      _previewCategories,
      _themePatch,
      ...settingsOverrides
    } = previewSettings;
    const merged = { ...siteConfig, settings: { ...(siteConfig.settings || {}), ...settingsOverrides } };
    if (pLogoUrl !== undefined) merged.logoUrl = pLogoUrl || null;
    if (Array.isArray(_previewCategories)) {
      merged.categories = _previewCategories;
      merged.settings._previewCategories = _previewCategories;
    }
    // Theme patches arriving over postMessage replace either the schemes
    // array, the assignments map, or both. Anything not in the patch falls
    // back to the saved theme so the live preview shows exactly what the
    // merchant is editing without losing the rest of their config.
    if (_themePatch && typeof _themePatch === 'object') {
      const baseTheme = siteConfig.themeConfig || {};
      merged.themeConfig = {
        ...baseTheme,
        ...(Array.isArray(_themePatch.schemes) ? { schemes: _themePatch.schemes } : {}),
        ...(_themePatch.sectionAssignments && typeof _themePatch.sectionAssignments === 'object'
          ? { sectionAssignments: { ...(baseTheme.sectionAssignments || {}), ...(_themePatch.sectionAssignments || {}) } }
          : {}),
      };
    }
    // Per-section color overrides live in settings.sectionColorOverrides.
    // Live-preview patches arrive as `_overridesPatch: { sectionId: {...} }`.
    // Each per-section value is the FULL intended state for that section
    // (the customizer always sends the complete next slots map computed
    // from its local draft), so we REPLACE rather than slot-merge — that
    // way clearing a slot in the customizer actually removes it from the
    // preview. `null` means "drop all overrides for this section".
    const overridesPatch = settingsOverrides && settingsOverrides._overridesPatch;
    if (overridesPatch && typeof overridesPatch === 'object') {
      const baseOverrides = (siteConfig.settings && siteConfig.settings.sectionColorOverrides) || {};
      const mergedOverrides = { ...baseOverrides };
      for (const [secId, slots] of Object.entries(overridesPatch)) {
        if (slots && typeof slots === 'object' && Object.keys(slots).length > 0) {
          mergedOverrides[secId] = { ...slots };
        } else {
          delete mergedOverrides[secId];
        }
      }
      merged.settings = { ...merged.settings, sectionColorOverrides: mergedOverrides };
    }
    return merged;
  }, [previewSettings, siteConfig]);

  // Resolve the theme bundle that the storefront actually consumes. If the
  // merchant has no theme_config yet (super-old site, brand new SDK paint
  // before the API answers), synthesize Brand + Inverse + Accent from
  // primary/secondary/accent — same shape the backend seeds on new sites
  // — so SchemeScope renders correctly AND the visual customizer's Theme
  // tab + per-section dropdowns have real schemes to switch between
  // without requiring a backend migration of legacy rows.
  const resolvedTheme = useMemo(() => {
    const cfg = effectiveSiteConfig;
    if (!cfg) return null;
    const tc = cfg.themeConfig;
    if (tc && Array.isArray(tc.schemes) && tc.schemes.length > 0) {
      return tc;
    }
    const primary = cfg.primaryColor || '#603000';
    const accent = '#b08c4c';
    const pickReadable = (bg) => {
      if (typeof bg !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(bg)) return '#ffffff';
      const n = parseInt(bg.slice(1), 16);
      const r = ((n >> 16) & 0xff) / 255;
      const g = ((n >> 8) & 0xff) / 255;
      const b = (n & 0xff) / 255;
      return (0.299 * r + 0.587 * g + 0.114 * b) > 0.55 ? '#111111' : '#ffffff';
    };
    const shift = (hex, factor) => {
      if (typeof hex !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
      const n = parseInt(hex.slice(1), 16);
      let r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
      if (factor >= 0) {
        r = Math.round(r + (255 - r) * factor);
        g = Math.round(g + (255 - g) * factor);
        b = Math.round(b + (255 - b) * factor);
      } else {
        const f = 1 + factor;
        r = Math.round(r * f); g = Math.round(g * f); b = Math.round(b * f);
      }
      return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    };
    const brand = {
      id: 'brand', name: 'Brand', isDefault: true,
      background: '#ffffff', text: '#111111',
      button: primary, buttonText: pickReadable(primary),
      secondaryButton: shift(primary, 0.85),
      link: primary, accent,
    };
    const inverseBg = shift(primary, -0.4);
    const inverse = {
      id: 'inverse', name: 'Inverse', isDefault: false,
      background: inverseBg, text: '#ffffff',
      button: '#ffffff', buttonText: '#111111',
      secondaryButton: shift(inverseBg, 0.15),
      link: '#f5deb3', accent,
    };
    const accentScheme = {
      id: 'accent', name: 'Accent', isDefault: false,
      background: '#fdfaf3', text: '#1f1a14',
      button: accent, buttonText: pickReadable(accent),
      secondaryButton: shift(accent, 0.78),
      link: primary, accent,
    };
    return { schemes: [brand, inverse, accentScheme], sectionAssignments: {} };
  }, [effectiveSiteConfig]);

  // Inject the Brand (default) scheme into the document root so the very
  // first paint already uses the merchant's colors. SchemeScope still wraps
  // each section to override per-section, but elements that aren't inside a
  // SchemeScope (loading screens, error pages, mid-page modals…) stay on
  // brand. This is what stops the "flash of unstyled colors".
  useEffect(() => {
    if (typeof document === 'undefined' || !resolvedTheme) return;
    const brand = resolvedTheme.schemes.find(s => s.isDefault) || resolvedTheme.schemes[0];
    if (!brand) return;
    const vars = schemeToCssVars(brand);
    const root = document.documentElement;
    for (const [k, v] of Object.entries(vars)) {
      root.style.setProperty(k, v);
    }
  }, [resolvedTheme]);

  // Helper used by SchemeScope to look up the scheme assigned to a given
  // section. Falls back to the default scheme when the section has no
  // explicit assignment, so newly-added sections render correctly without
  // requiring a migration of existing theme_config blobs.
  const getSchemeForSection = useMemo(() => {
    return (sectionId) => {
      if (!resolvedTheme || !Array.isArray(resolvedTheme.schemes)) return null;
      const assignments = resolvedTheme.sectionAssignments || {};
      const targetId = (sectionId && assignments[sectionId]) || null;
      const found = targetId ? resolvedTheme.schemes.find(s => s.id === targetId) : null;
      if (found) return found;
      return resolvedTheme.schemes.find(s => s.isDefault) || resolvedTheme.schemes[0];
    };
  }, [resolvedTheme]);

  // Per-section colour overrides live alongside the assigned scheme. These
  // are arbitrary { background?, text?, button?, ... } maps that take
  // precedence over the assigned scheme on a per-slot basis. Source of
  // truth: settings.sectionColorOverrides[sectionId].
  const getOverridesForSection = useMemo(() => {
    return (sectionId) => {
      if (!sectionId) return null;
      const settings = effectiveSiteConfig?.settings;
      if (!settings || !settings.sectionColorOverrides) return null;
      const found = settings.sectionColorOverrides[sectionId];
      return (found && typeof found === 'object') ? found : null;
    };
  }, [effectiveSiteConfig]);

  return (
    <SiteContext.Provider value={{
      siteConfig: effectiveSiteConfig,
      loading,
      error,
      subdomain,
      refetchSite: () => subdomain && fetchSiteConfig(subdomain, true),
      themeConfig: resolvedTheme,
      getSchemeForSection,
      getOverridesForSection,
    }}>
      {children}
    </SiteContext.Provider>
  );
}
