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
 * Source-of-truth language: localStorage `flomerce_lang`. The
 * LanguageSwitcher writes it and dispatches a `flomerce_lang_change`
 * event so this provider re-renders with the new target language.
 */

export const ShopperTranslationContext = createContext(null);

const STORAGE_PREFIX = 'flomerce_xlt_';
function storageKey(siteId, target, hash) {
  return `${STORAGE_PREFIX}${siteId}:${target}:${hash}`;
}

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

function readStoredLanguage(fallback) {
  try {
    if (typeof window === 'undefined') return fallback;
    return window.localStorage?.getItem('flomerce_lang') || fallback;
  } catch (e) {
    return fallback;
  }
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

  const target = useMemo(() => {
    if (!enabled) return null;
    if (!language || language === contentLanguage) return null;
    if (!allowedLanguages.includes(language)) return null;
    return language;
  }, [enabled, language, contentLanguage, allowedLanguages]);

  const cacheRef = useRef(new Map());
  const pendingRef = useRef(new Map());
  const flushTimerRef = useRef(null);
  const [, forceTick] = useState(0);

  useEffect(() => {
    cacheRef.current = new Map();
    pendingRef.current = new Map();
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    forceTick((n) => n + 1);
  }, [target, siteId]);

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
        for (const [hash, entry] of batch) cacheRef.current.set(hash, entry.text);
      }
    } catch (e) {
      for (const [hash, entry] of batch) cacheRef.current.set(hash, entry.text);
    }
    forceTick((n) => n + 1);
  }, [siteId, target]);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) return;
    flushTimerRef.current = setTimeout(flush, 30);
  }, [flush]);

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
