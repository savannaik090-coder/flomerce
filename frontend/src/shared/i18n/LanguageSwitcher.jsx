import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PRESHIPPED,
  INDIA_LANGUAGES,
  FOREIGN_LANGUAGES,
  markLanguageExplicit,
} from './init.js';

// Native-script labels for every active language. Keep in sync with the
// INDIA_LANGUAGES + FOREIGN_LANGUAGES sets in init.js. A code missing from
// this map renders as the raw locale code, which is intentional fallback so
// no option ever silently disappears.
const LANG_LABELS = {
  en: 'English',
  hi: 'हिन्दी',
  ta: 'தமிழ்',
  te: 'తెలుగు',
  ml: 'മലയാളം',
  kn: 'ಕನ್ನಡ',
  mr: 'मराठी',
  bn: 'বাংলা',
  gu: 'ગુજરાતી',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  nl: 'Nederlands',
  pt: 'Português',
  ja: '日本語',
  ko: '한국어',
  'zh-CN': '简体中文',
};

// Module-level cache so multiple LanguageSwitcher instances on the same page
// (e.g. desktop nav + mobile drawer) share a single /api/i18n/geo round-trip.
let geoPromise = null;
function fetchGeoLanguages() {
  if (geoPromise) return geoPromise;
  geoPromise = (async () => {
    try {
      const res = await fetch('/api/i18n/geo', {
        headers: { Accept: 'application/json' },
        // Geo-by-IP is per-visitor and short-lived; never use a stale browser
        // cache for it. The worker sets `transient: true` so the edge only
        // caches it for 60s, which is fine for our SSR-free SPA path.
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const data = json?.data || {};
      const list = Array.isArray(data.languages) ? data.languages : null;
      if (!list || list.length === 0) throw new Error('empty languages list');
      return { isIndia: !!data.isIndia, languages: list };
    } catch (err) {
      // On any failure (network, CORS, edge issue) fall back to the foreign
      // bucket so a non-Indian visitor never sees an Indian-only dropdown by
      // accident, and an Indian visitor still gets English + Hindi at minimum.
      // We also reset geoPromise so a future mount can retry.
      geoPromise = null;
      console.warn('[i18n] geo fetch failed, falling back to FOREIGN bucket:', err?.message || err);
      return { isIndia: false, languages: FOREIGN_LANGUAGES };
    }
  })();
  return geoPromise;
}

export default function LanguageSwitcher({ className = '', compact = false }) {
  const { i18n, t } = useTranslation('common');
  const current = (i18n.language || 'en').split('-')[0] === 'zh'
    ? 'zh-CN'
    : (i18n.language || 'en');

  // Start in a "loading" state with English-only so SSR/first paint is stable
  // and we never render an Indian dropdown to a US visitor for one frame.
  // The geo fetch then expands the list on resolve.
  const [languages, setLanguages] = useState(['en']);

  useEffect(() => {
    let cancelled = false;
    fetchGeoLanguages().then((res) => {
      if (cancelled) return;
      // Filter to options we actually support in the active set; geo response
      // is the source of truth for ordering, but we sanity-check against
      // PRESHIPPED so a backend mistake can never inject a code that has no
      // catalog (which would then 404 on fetch and get stuck on EN forever).
      const filtered = res.languages.filter((c) => PRESHIPPED.includes(c));
      setLanguages(filtered.length > 0 ? filtered : ['en']);
    });
    return () => { cancelled = true; };
  }, []);

  // If the user's stored choice is for a language NOT in their geo bucket
  // (e.g. they picked Tamil in India then traveled to the US), keep their
  // choice rendered so the <select> doesn't snap to English under them. We
  // append it as an extra option rather than swapping buckets — the user's
  // explicit pick always wins over geo.
  const options = useMemo(() => {
    if (languages.includes(current)) return languages;
    return [...languages, current];
  }, [languages, current]);

  function handleChange(e) {
    const lng = e.target.value;
    markLanguageExplicit();
    i18n.changeLanguage(lng);
    try { localStorage.setItem('flomerce_lang', lng); } catch {}
  }

  return (
    <select
      className={`flomerce-lang-switcher ${className}`}
      value={options.includes(current) ? current : 'en'}
      onChange={handleChange}
      aria-label={t('language', 'Language')}
      style={{
        padding: compact ? '4px 8px' : '6px 10px',
        fontSize: compact ? 12 : 13,
        border: '1px solid #e2e8f0',
        borderRadius: 6,
        background: '#fff',
        color: '#0f172a',
        fontFamily: 'inherit',
        cursor: 'pointer',
      }}
    >
      {options.map((lng) => (
        <option key={lng} value={lng}>{LANG_LABELS[lng] || lng}</option>
      ))}
    </select>
  );
}
