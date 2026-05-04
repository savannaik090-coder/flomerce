import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { SiteContext } from './SiteContext.jsx';
import { API_BASE } from '../config.js';

/**
 * Pre-translated bundle client.
 *
 * On mount (and on language change) this provider does ONE GET to
 *   /api/storefront/<siteId>/translations/<lang>?v=<bundleVersion>
 * which returns the entire dictionary of every chrome literal and every
 * default-content string the storefront could ever render. Once the
 * dict is in memory, every <TranslatedText> is a synchronous
 * `dict[hash(text)] || text` lookup — zero per-render network calls,
 * zero post-mount fetches, zero flicker.
 *
 * NO browser-side caching: no Map outside this React state, no
 * sessionStorage, no localStorage of translations. The Cloudflare edge
 * is the only cache; URL versioning by `bundleVersion` guarantees a
 * cold fetch the moment a deploy or a merchant-config change makes the
 * dict stale.
 *
 * Render is BLOCKED behind a small full-page loader during the (one-
 * time, edge-cached after the first global request) bundle fetch, so
 * shoppers never see English flash before Hindi appears.
 *
 * Source-of-truth language: localStorage `flomerce_lang`. The
 * LanguageSwitcher writes it and dispatches `flomerce_lang_change` so
 * this provider re-fetches with the new target.
 */

export const ShopperTranslationContext = createContext(null);

// Languages that natively render right-to-left. When the active shopper
// language is in this set we flip <html dir="rtl"> so logical CSS
// properties (margin-inline-start, inset-inline-end, text-align: start)
// mirror correctly. Source: ISO 639-1 / 639-3 codes for major RTL scripts.
const RTL_LANGUAGES = new Set([
  'ar',  // Arabic
  'he',  // Hebrew
  'fa',  // Persian / Farsi
  'ur',  // Urdu
  'ps',  // Pashto
  'sd',  // Sindhi
  'ckb', // Central Kurdish (Sorani)
  'dv',  // Divehi / Maldivian
  'yi',  // Yiddish
]);

function isRtlLanguage(lang) {
  if (!lang || typeof lang !== 'string') return false;
  return RTL_LANGUAGES.has(lang.toLowerCase().split('-')[0]);
}

function clientHash(s) {
  // Must match djb2Hash in backend/workers/storefront/translations-bundle.js
  let h = 5381;
  const str = String(s ?? '');
  for (let i = 0; i < str.length; i++) {
    h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

function readStoredLanguage(fallback) {
  try {
    if (typeof window === 'undefined') return fallback;
    return window.localStorage?.getItem('flomerce_lang') || fallback;
  } catch (e) {
    return fallback;
  }
}

function FullPageLoader() {
  const brandName = (() => {
    try { return window.localStorage?.getItem('flomerce_brand_name') || ''; } catch (_) { return ''; }
  })();
  return (
    <div
      role="status"
      aria-label="Loading"
      style={{
        position: 'fixed',
        inset: 0,
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        zIndex: 99999,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div id="flomerce-fpl-ring" style={{
        width: 48,
        height: 48,
        border: '3px solid #eee',
        borderRadius: '50%',
        animation: 'flomerce-xlt-spin 0.8s linear infinite',
      }} />
      {brandName && (
        <p style={{ fontSize: 18, color: '#333', margin: 0 }}>{brandName} Loading…</p>
      )}
      <style>{`
        #flomerce-fpl-ring { border-top-color: #000 !important; }
        @keyframes flomerce-xlt-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export function ShopperTranslationProvider({ children }) {
  const { siteConfig } = useContext(SiteContext) || {};
  const siteId = siteConfig?.id || null;
  const contentLanguage = (siteConfig?.contentLanguage || siteConfig?.content_language || 'en').toLowerCase();
  const enabled = !!(siteConfig?.translatorEnabled || siteConfig?.translator_enabled);
  const bundleVersion = siteConfig?.translationsBundleVersion || siteConfig?.translations_bundle_version || null;

  const allowedLanguages = useMemo(() => {
    const raw = siteConfig?.translatorLanguages || siteConfig?.translator_languages;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; }
      catch (e) { return []; }
    }
    return [];
  }, [siteConfig?.translatorLanguages, siteConfig?.translator_languages]);

  const [language, setLanguage] = useState(() => readStoredLanguage(contentLanguage));

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onLangChange = (e) => {
      const next = e?.detail?.language || readStoredLanguage(contentLanguage);
      setLanguage(next);
    };
    const onStorage = (e) => {
      if (e.key === 'flomerce_lang') setLanguage(e.newValue || contentLanguage);
    };
    window.addEventListener('flomerce_lang_change', onLangChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('flomerce_lang_change', onLangChange);
      window.removeEventListener('storage', onStorage);
    };
  }, [contentLanguage]);

  // Sync <html dir> and <html lang> with the effective shopper language.
  // RTL languages (Arabic, Hebrew, Persian, Urdu, etc.) require dir="rtl"
  // for logical CSS properties to mirror layout correctly. We compute the
  // effective language inline (rather than depending on `target` below)
  // because `target` is null for source-language shoppers — but we still
  // want <html lang> set even when no translation is active.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const effective = (language || contentLanguage || 'en').toLowerCase();
    const dir = isRtlLanguage(effective) ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', effective);
  }, [language, contentLanguage]);

  // Resolve the effective target language. Null means "render source as-is."
  const target = useMemo(() => {
    if (!language) return null;
    if (language.toLowerCase() === contentLanguage) return null;
    if (!enabled) return null;
    if (allowedLanguages.length > 0 && !allowedLanguages.includes(language)) return null;
    return language.toLowerCase();
  }, [enabled, language, contentLanguage, allowedLanguages]);

  // dict: { [hash(source)]: translated }, keyed exclusively by clientHash.
  const [dict, setDict] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadedKey, setLoadedKey] = useState(null);
  // Safety net: if SiteContext never resolves siteId (network failure,
  // backend down, etc.) we MUST NOT block the storefront forever behind
  // the spinner. After SITE_TIMEOUT_MS we unblock with empty dict so
  // the shopper at least sees source-language content instead of a
  // stuck loader.
  const [siteTimedOut, setSiteTimedOut] = useState(false);
  useEffect(() => {
    if (siteId) { setSiteTimedOut(false); return undefined; }
    const SITE_TIMEOUT_MS = 5000;
    const t = setTimeout(() => setSiteTimedOut(true), SITE_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [siteId]);

  useEffect(() => {
    // No siteId yet (SiteContext still loading) → wait, render nothing.
    if (!siteId) {
      setDict(null);
      setLoadedKey(null);
      return undefined;
    }
    // Source-language shopper or translator off → no fetch needed,
    // unblock render with empty dict.
    if (!target) {
      setDict({});
      setLoadedKey(`${siteId}::${contentLanguage}::source`);
      setLoading(false);
      return undefined;
    }

    const key = `${siteId}::${target}::${bundleVersion || 'novers'}`;
    if (loadedKey === key && dict) return undefined;

    let cancelled = false;
    setLoading(true);
    const versionParam = bundleVersion ? `?v=${encodeURIComponent(bundleVersion)}` : '';
    const url = `${API_BASE}/api/storefront/${siteId}/translations/${target}${versionParam}`;
    fetch(url, { method: 'GET' })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const next = (json && json.dict && typeof json.dict === 'object') ? json.dict : {};
        setDict(next);
        setLoadedKey(key);
      })
      .catch(() => {
        if (cancelled) return;
        // Network failure: unblock render with empty dict so shopper sees
        // source text instead of an infinite loader. Never throw.
        setDict({});
        setLoadedKey(key);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [siteId, target, bundleVersion, contentLanguage]); // eslint-disable-line react-hooks/exhaustive-deps

  const translate = useCallback((text) => {
    if (text == null || text === '') return text;
    if (typeof text !== 'string') return text;
    if (!target || !dict) return text;
    const hash = clientHash(text);
    const v = dict[hash];
    return (v != null && v !== '') ? v : text;
  }, [target, dict]);

  const value = useMemo(() => ({
    translate,
    enabled: !!target,
    target,
    contentLanguage,
    allowedLanguages,
    siteId,
    ready: dict != null,
    loading,
  }), [translate, target, contentLanguage, allowedLanguages, siteId, dict, loading]);

  // Block render until the dict is in memory. SiteContext is still
  // resolving (siteId == null) → also show loader. The dict is empty
  // {} for source-language shoppers — that's still "ready", they
  // unblock immediately. If SiteContext takes longer than the safety
  // timeout we unblock anyway with the source language so the storefront
  // never gets stuck behind a permanent spinner.
  const ready = (!!siteId && dict != null) || siteTimedOut;

  return (
    <ShopperTranslationContext.Provider value={value}>
      {ready ? children : <FullPageLoader />}
    </ShopperTranslationContext.Provider>
  );
}

export function useShopperTranslation() {
  return useContext(ShopperTranslationContext) || {
    translate: (t) => t,
    enabled: false,
    target: null,
    contentLanguage: 'en',
    allowedLanguages: [],
    siteId: null,
    ready: true,
    loading: false,
  };
}
