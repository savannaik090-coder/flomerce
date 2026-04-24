import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PRESHIPPED,
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
// (e.g. desktop nav + mobile drawer) share a single /api/i18n/geo round-trip,
// AND so the result survives re-mounts during the same session — every shopper
// only ever pays for one geo lookup, not one per page navigation.
let geoPromise = null;
let geoResolved = null;
function fetchGeoLanguages() {
  if (geoResolved) return Promise.resolve(geoResolved);
  if (geoPromise) return geoPromise;
  geoPromise = (async () => {
    try {
      const res = await fetch('/api/i18n/geo', {
        headers: { Accept: 'application/json' },
        // Geo-by-IP is per-visitor and short-lived; never use a stale browser
        // cache for it. The worker sets short edge cache (60s) keyed per
        // country via Vary: cf-ipcountry.
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const data = json?.data || {};
      const list = Array.isArray(data.languages) ? data.languages : null;
      if (!list || list.length === 0) throw new Error('empty languages list');
      const result = { isIndia: !!data.isIndia, languages: list };
      geoResolved = result;
      return result;
    } catch (err) {
      // On any failure (network, CORS, edge issue) fall back to the foreign
      // bucket so a non-Indian visitor never sees an Indian-only dropdown by
      // accident, and an Indian visitor still gets English + Hindi at minimum.
      // Reset geoPromise so a future interaction can retry, but do NOT cache
      // the fallback in geoResolved — we want a real answer next time.
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

  // Lazy-on-interaction: do NOT call /api/i18n/geo on mount. The vast majority
  // of visitors never open the language dropdown, so we save one network round
  // trip per page load by waiting until the user actually hovers/focuses/taps
  // the picker. Initial state seeds from the module-level cache when available
  // (e.g. the user already opened the picker once this session) so subsequent
  // mounts feel instant.
  const [languages, setLanguages] = useState(() => {
    if (geoResolved?.languages) {
      const filtered = geoResolved.languages.filter((c) => PRESHIPPED.includes(c));
      return filtered.length > 0 ? filtered : ['en'];
    }
    return ['en'];
  });
  const [loading, setLoading] = useState(false);

  // Unmount guard: a user can navigate away (or React can re-render the parent
  // and unmount this instance) between firing the geo fetch and its resolution.
  // Without this ref, setLanguages/setLoading would write into an unmounted
  // component and trigger a React warning. We can't use AbortController on the
  // shared module-level promise (other instances may still need the result),
  // so we just ignore the resolution locally if we've unmounted.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  function triggerGeoFetch() {
    // Idempotent — once we have a real answer, never refetch this session.
    if (geoResolved || loading) return;
    setLoading(true);
    fetchGeoLanguages().then((res) => {
      if (!isMountedRef.current) return;
      // Filter to options we actually support in the active set; geo response
      // is the source of truth for ordering, but we sanity-check against
      // PRESHIPPED so a backend mistake can never inject a code that has no
      // catalog (which would then 404 on fetch and get stuck on EN forever).
      const filtered = res.languages.filter((c) => PRESHIPPED.includes(c));
      setLanguages(filtered.length > 0 ? filtered : ['en']);
      setLoading(false);
    });
  }

  // If the user's stored choice is for a language NOT in their geo bucket
  // (e.g. they picked Tamil in India then traveled to the US), keep their
  // choice rendered so the <select> doesn't snap to English under them. We
  // append it as an extra option rather than swapping buckets — the user's
  // explicit pick always wins over geo. This also means a returning visitor
  // who already chose a language sees that choice in the dropdown immediately,
  // before geo even resolves.
  const options = useMemo(() => {
    if (languages.includes(current)) return languages;
    return [...languages, current];
  }, [languages, current]);

  function handleChange(e) {
    const lng = e.target.value;
    if (lng === '__loading__') return;
    markLanguageExplicit();
    i18n.changeLanguage(lng);
    try { localStorage.setItem('flomerce_lang', lng); } catch {}
  }

  return (
    <select
      className={`flomerce-lang-switcher ${className}`}
      value={options.includes(current) ? current : 'en'}
      onChange={handleChange}
      // Trigger the lazy geo fetch on the first sign of intent. Using all
      // four events covers mouse users (hover before click), keyboard users
      // (tab focus), and touch users (tap). The fetch is module-cached, so
      // firing multiple events in the same gesture is harmless.
      onMouseEnter={triggerGeoFetch}
      onMouseDown={triggerGeoFetch}
      onFocus={triggerGeoFetch}
      onTouchStart={triggerGeoFetch}
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
      {/* Show a disabled "Loading…" row only when the user has actually
          opened the dropdown for the first time AND the fetch hasn't returned
          yet. This is the rare case (instant click before hover) — most
          interactions resolve before the dropdown popup paints. */}
      {loading && languages.length <= 1 && (
        <option value="__loading__" disabled>…</option>
      )}
    </select>
  );
}
