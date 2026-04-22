import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { SiteContext } from './SiteContext.jsx';
import { API_BASE } from '../config.js';

/**
 * System B (per-site shopper translation) client. Wraps the storefront
 * with a lightweight runtime that batches every <TranslatedText> render
 * into one POST per render cycle, caches results in sessionStorage
 * keyed by ${siteId}:${target}:${textHash}, and gracefully falls back
 * to the original on cache miss until the proxy responds.
 *
 * Source-of-truth language: the SiteContext + i18n hold the active
 * language. We re-read i18n.language on every render via the language
 * state below, so language changes trigger re-renders of all consumers.
 */

export const ShopperTranslationContext = createContext(null);

const STORAGE_PREFIX = 'flomerce_xlt_';
function storageKey(siteId, target, hash) {
  return `${STORAGE_PREFIX}${siteId}:${target}:${hash}`;
}

// Cheap, non-cryptographic hash. Microsoft Translator cache rows use a real
// SHA-256 server-side; the client hash is only a localStorage key, so we
// don't need crypto-grade collision resistance.
function clientHash(s) {
  let h = 5381;
  const str = String(s ?? '');
  for (let i = 0; i < str.length; i++) {
    h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

function readSessionCache(siteId, target, hash) {
  try { return sessionStorage.getItem(storageKey(siteId, target, hash)); }
  catch (e) { return null; }
}
function writeSessionCache(siteId, target, hash, value) {
  try { sessionStorage.setItem(storageKey(siteId, target, hash), value); }
  catch (e) { /* quota — ignore */ }
}

export function ShopperTranslationProvider({ children }) {
  const { siteConfig } = useContext(SiteContext) || {};
  const siteId = siteConfig?.id || null;
  const contentLanguage = siteConfig?.contentLanguage || siteConfig?.content_language || 'en';
  const enabled = !!(siteConfig?.translatorEnabled || siteConfig?.translator_enabled);
  const allowedLanguages = useMemo(() => {
    const raw = siteConfig?.translatorLanguages || siteConfig?.translator_languages;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; }
      catch (e) { return []; }
    }
    return [];
  }, [siteConfig?.translatorLanguages, siteConfig?.translator_languages]);

  // Track i18n language. We import lazily so this provider doesn't drag the
  // i18n init code into route bundles that don't already use it.
  const [language, setLanguage] = useState(() => {
    try { return (typeof window !== 'undefined' && window.localStorage?.getItem('flomerce_lang')) || contentLanguage; }
    catch (e) { return contentLanguage; }
  });
  useEffect(() => {
    let mounted = true;
    let i18nRef = null;
    let onChange = null;
    (async () => {
      try {
        const mod = await import('../../../shared/i18n/init.js');
        if (!mounted) return;
        i18nRef = mod.default;
        setLanguage(i18nRef.language || contentLanguage);
        onChange = (lng) => setLanguage(lng);
        i18nRef.on('languageChanged', onChange);
      } catch (e) { /* ignore */ }
    })();
    return () => {
      mounted = false;
      try { if (i18nRef && onChange) i18nRef.off('languageChanged', onChange); } catch (e) {}
    };
  }, [contentLanguage]);

  // The active *target* language for shopper-facing translation. If the
  // shopper picked the merchant's content language (or a language not in
  // the merchant's allow-list, or translation is off), target = null which
  // means "show originals."
  const target = useMemo(() => {
    if (!enabled) return null;
    if (!language || language === contentLanguage) return null;
    if (!allowedLanguages.includes(language)) return null;
    return language;
  }, [enabled, language, contentLanguage, allowedLanguages]);

  // In-memory translation map for *this* render cycle's target. Persists
  // across renders so we don't re-fetch what we already know.
  const cacheRef = useRef(new Map()); // hash -> translated string
  const pendingRef = useRef(new Map()); // hash -> { text, resolvers: [] }
  const flushTimerRef = useRef(null);
  const [, forceTick] = useState(0);

  // Reset in-memory cache whenever target changes (we still keep the
  // sessionStorage layer; this just ensures stale-target lookups don't
  // accidentally return previous-language strings). Also cancel any
  // pending flush — its results would belong to the previous target.
  useEffect(() => {
    cacheRef.current = new Map();
    pendingRef.current = new Map();
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    forceTick((n) => n + 1);
  }, [target, siteId]);

  // Cancel any pending flush on unmount to avoid setState-after-unmount
  // warnings if the provider is torn down mid-batch.
  useEffect(() => () => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  }, []);

  const flush = useCallback(async () => {
    flushTimerRef.current = null;
    if (!siteId || !target) return;
    const pending = pendingRef.current;
    if (pending.size === 0) return;
    // Snapshot and clear so re-entrant calls during fetch start a new batch.
    const batch = Array.from(pending.entries());
    pendingRef.current = new Map();

    const texts = batch.map(([, v]) => v.text);
    try {
      const res = await fetch(`${API_BASE}/api/storefront/${siteId}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts, target }),
      });
      const json = await res.json().catch(() => null);
      const translations = json?.data?.translations;
      if (Array.isArray(translations) && translations.length === texts.length) {
        for (let i = 0; i < batch.length; i++) {
          const [hash, entry] = batch[i];
          const xlated = translations[i] ?? entry.text;
          cacheRef.current.set(hash, xlated);
          writeSessionCache(siteId, target, hash, xlated);
        }
      } else {
        // Bad response shape — fall back to originals so consumers don't loop.
        for (const [hash, entry] of batch) cacheRef.current.set(hash, entry.text);
      }
    } catch (e) {
      // Network error — cache originals to break the retry loop for this
      // session. Reload will retry.
      for (const [hash, entry] of batch) cacheRef.current.set(hash, entry.text);
    }
    forceTick((n) => n + 1);
  }, [siteId, target]);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) return;
    // 30ms is short enough to feel instant on the first paint but long
    // enough to coalesce dozens of <TranslatedText> mounts on a single
    // page render into one POST.
    flushTimerRef.current = setTimeout(flush, 30);
  }, [flush]);

  /**
   * Synchronous lookup used by <TranslatedText>. Returns the translated
   * string if known, otherwise queues a fetch and returns the original
   * (so the page renders immediately, then re-renders when the batch
   * resolves).
   */
  const translate = useCallback((text) => {
    if (text == null || text === '') return text;
    if (!target) return text;
    const hash = clientHash(text);
    const mem = cacheRef.current.get(hash);
    if (mem != null) return mem;
    const persisted = readSessionCache(siteId, target, hash);
    if (persisted != null) {
      cacheRef.current.set(hash, persisted);
      return persisted;
    }
    if (!pendingRef.current.has(hash)) {
      pendingRef.current.set(hash, { text });
      scheduleFlush();
    }
    return text;
  }, [target, siteId, scheduleFlush]);

  const value = useMemo(() => ({
    translate,
    enabled: !!target,
    target,
    contentLanguage,
    allowedLanguages,
    siteId,
  }), [translate, target, contentLanguage, allowedLanguages, siteId]);

  return (
    <ShopperTranslationContext.Provider value={value}>
      {children}
    </ShopperTranslationContext.Provider>
  );
}

export function useShopperTranslation() {
  return useContext(ShopperTranslationContext) || { translate: (t) => t, enabled: false, target: null, contentLanguage: 'en', allowedLanguages: [], siteId: null };
}
