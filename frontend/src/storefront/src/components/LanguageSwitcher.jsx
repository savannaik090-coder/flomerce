import React, { useContext, useEffect, useMemo, useState } from 'react';
import { SiteContext } from '../context/SiteContext.jsx';

/**
 * Storefront-only shopper language switcher (System B). Writes the chosen
 * language to localStorage `flomerce_lang` and dispatches a
 * `flomerce_lang_change` window event so the ShopperTranslationProvider
 * re-renders with the new target language.
 *
 * Hidden when the merchant has not enabled System B for their site.
 */

const LANGUAGE_LABELS = {
  en: 'English',
  hi: 'हिन्दी',
  es: 'Español',
  ar: 'العربية',
  fr: 'Français',
  de: 'Deutsch',
  pt: 'Português',
  'pt-BR': 'Português (BR)',
  it: 'Italiano',
  ja: '日本語',
  ko: '한국어',
  ru: 'Русский',
  tr: 'Türkçe',
  pl: 'Polski',
  nl: 'Nederlands',
  sv: 'Svenska',
  th: 'ไทย',
  vi: 'Tiếng Việt',
  id: 'Bahasa Indonesia',
  ms: 'Bahasa Melayu',
  fil: 'Filipino',
  bn: 'বাংলা',
  ta: 'தமிழ்',
  te: 'తెలుగు',
  mr: 'मराठी',
  gu: 'ગુજરાતી',
  kn: 'ಕನ್ನಡ',
  ml: 'മലയാളം',
  pa: 'ਪੰਜਾਬੀ',
  ur: 'اردو',
  fa: 'فارسی',
  he: 'עברית',
  el: 'Ελληνικά',
  cs: 'Čeština',
  da: 'Dansk',
  fi: 'Suomi',
  no: 'Norsk',
  ro: 'Română',
  hu: 'Magyar',
  uk: 'Українська',
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
};

function labelFor(code) { return LANGUAGE_LABELS[code] || code; }

function readStoredLanguage(fallback) {
  try {
    if (typeof window === 'undefined') return fallback;
    return window.localStorage?.getItem('flomerce_lang') || fallback;
  } catch (e) {
    return fallback;
  }
}

export default function LanguageSwitcher({ compact = false }) {
  const { siteConfig } = useContext(SiteContext) || {};
  const enabled = !!(siteConfig?.translatorEnabled || siteConfig?.translator_enabled);
  const contentLanguage = siteConfig?.contentLanguage || siteConfig?.content_language || 'en';

  const allowed = useMemo(() => {
    const raw = siteConfig?.translatorLanguages || siteConfig?.translator_languages;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; }
      catch (e) { return []; }
    }
    return [];
  }, [siteConfig?.translatorLanguages, siteConfig?.translator_languages]);

  const options = useMemo(() => {
    const set = new Set();
    const list = [];
    const push = (code) => { if (code && !set.has(code)) { set.add(code); list.push(code); } };
    push(contentLanguage);
    for (const c of allowed) push(c);
    return list;
  }, [contentLanguage, allowed]);

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

  if (!enabled || options.length <= 1) return null;

  const handleChange = (e) => {
    const next = e.target.value;
    setLanguage(next);
    try { window.localStorage?.setItem('flomerce_lang', next); } catch (err) {}
    try { window.localStorage?.setItem('flomerce_lang_explicit', '1'); } catch (err) {}
    try {
      window.dispatchEvent(new CustomEvent('flomerce_lang_change', { detail: { language: next } }));
    } catch (err) {}
  };

  const baseStyle = compact
    ? { fontSize: 12, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 4, background: '#fff', cursor: 'pointer' }
    : { fontSize: 14, padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', cursor: 'pointer' };

  return (
    <select
      aria-label="Choose language"
      value={language}
      onChange={handleChange}
      style={baseStyle}
      className="storefront-language-switcher"
    >
      {options.map((code) => (
        <option key={code} value={code}>{labelFor(code)}</option>
      ))}
    </select>
  );
}
