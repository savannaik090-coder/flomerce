import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enCatalog, { NAMESPACE_FILES, NAMESPACES } from './locales/en/index.js';

// Only English is bundled into the JS payload — it is the source catalog and
// must always be available for fallback. Every other language (including the
// four hand-curated launch languages) is fetched from the platform's locale
// API on demand. The API serves the seed translation instantly on first hit
// and the smart-refreshed version after that, so editing English in one place
// (the EN files imported below) is the only change needed when copy changes.
const BUNDLED = {
  en: enCatalog,
};

// PRESHIPPED is what the language switcher offers out of the box. These are
// fetched (not bundled) — the worker has the seeds.
const PRESHIPPED = ['en', 'hi', 'es', 'zh-CN', 'ar'];
const NORMALIZABLE = new Set(PRESHIPPED);
const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur']);

// Map from base/regional codes to our pre-shipped locale codes so things like
// `zh`, `zh-Hans`, `zh-TW`, `es-ES`, `hi-IN`, `pt-BR` resolve to a real bundled
// catalog instead of triggering a lazy fetch.
function normalizeLocale(lng) {
  if (!lng) return 'en';
  if (NORMALIZABLE.has(lng)) return lng;
  const lower = String(lng).toLowerCase();
  if (lower === 'zh' || lower.startsWith('zh-hans') || lower === 'zh-cn' || lower === 'zh-sg') return 'zh-CN';
  if (lower.startsWith('zh')) return 'zh-CN';
  if (lower.startsWith('es')) return 'es';
  if (lower.startsWith('hi')) return 'hi';
  if (lower.startsWith('ar')) return 'ar';
  if (lower.startsWith('en')) return 'en';
  // For other base codes, return as-is so the lazy-gen path can attempt them.
  const base = lower.split('-')[0];
  return base;
}

function applyDirection(lng) {
  if (typeof document === 'undefined') return;
  const dir = RTL_LOCALES.has(lng) ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lng);
}

async function loadLocale(lng) {
  if (BUNDLED[lng]) return BUNDLED[lng];
  try {
    const res = await fetch(`/api/i18n/locale/${encodeURIComponent(lng)}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ct = res.headers.get('content-type') || '';
    if (!ct.toLowerCase().includes('application/json')) {
      throw new Error('non-json response from locale endpoint');
    }
    const json = await res.json();
    return json.data || json;
  } catch (err) {
    console.warn(`[i18n] Failed to load locale ${lng}, falling back to en:`, err);
    return null;
  }
}

const backendPlugin = {
  type: 'backend',
  init: () => {},
  read: async (lng, _ns, callback) => {
    // Normalize regional/variant codes (en-US, en-GB, pt-BR, fr-FR, ...) up-front
    // so we never try to fetch a non-existent /api/i18n/locale/en-US that would
    // return SPA HTML and crash init.
    const norm = normalizeLocale(lng);
    if (norm === 'en') {
      callback(null, BUNDLED.en);
      return;
    }
    // Every non-English locale comes from the worker — single source of truth.
    // The worker serves a hand-curated seed instantly on first hit and the
    // smart-refreshed version after that, so editing English in one place
    // automatically propagates everywhere on the next refresh.
    const data = await loadLocale(norm);
    if (data) {
      callback(null, data);
    } else {
      // Always succeed with English so init completes and t() resolves keys.
      callback(null, BUNDLED.en);
    }
  },
};

let initPromise = null;

export function initI18n(options = {}) {
  if (initPromise) return initPromise;
  initPromise = i18n
    .use(backendPlugin)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      fallbackLng: 'en',
      supportedLngs: false,
      load: 'currentOnly',
      cleanCode: true,
      nonExplicitSupportedLngs: true,
      // Each English source file owns one i18next namespace. Non-English
      // locales arrive from the worker as one merged catalog (the smart-
      // refresh pipeline serves them under the `translation` namespace), so
      // we register that name too and treat it as the default. fallbackNS
      // walks every namespace, which lets pre-existing call sites such as
      // `t('landing.heroBadge')` keep working without any code changes —
      // when the lookup misses in `translation` it falls through to the
      // namespace that actually owns the key.
      ns: ['translation', ...NAMESPACES],
      defaultNS: 'translation',
      fallbackNS: ['translation', ...NAMESPACES],
      resources: Object.fromEntries(
        Object.entries(BUNDLED).map(([lng, merged]) => [
          lng,
          { translation: merged, ...NAMESPACE_FILES },
        ])
      ),
      partialBundledLanguages: true,
      interpolation: { escapeValue: false },
      detection: {
        order: ['localStorage', 'navigator', 'htmlTag'],
        lookupLocalStorage: 'flomerce_lang',
        caches: ['localStorage'],
        // Normalize browser-detected codes so regional variants
        // (en-US, en-GB, zh-Hans, es-ES, hi-IN, pt-BR, ar-SA, ...) resolve to
        // a bundled pre-shipped catalog instead of triggering a lazy fetch
        // against an endpoint that returns SPA HTML on Pages and crashes init.
        convertDetectedLanguage: (lng) => normalizeLocale(lng),
      },
      react: { useSuspense: false },
      ...options,
    })
    .then(() => {
      applyDirection(i18n.language);
      i18n.on('languageChanged', applyDirection);
      return i18n;
    });
  return initPromise;
}

export { PRESHIPPED, RTL_LOCALES, normalizeLocale };
export default i18n;
