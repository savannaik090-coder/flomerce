import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enCatalog from './locales/en.json';
import hiCatalog from './locales/hi.json';
import esCatalog from './locales/es.json';
import zhCnCatalog from './locales/zh-CN.json';
import arCatalog from './locales/ar.json';

const BUNDLED = {
  en: enCatalog,
  hi: hiCatalog,
  es: esCatalog,
  'zh-CN': zhCnCatalog,
  ar: arCatalog,
};

const PRESHIPPED = ['en', 'hi', 'es', 'zh-CN', 'ar'];
const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur']);

// Map from base/regional codes to our pre-shipped locale codes so things like
// `zh`, `zh-Hans`, `zh-TW`, `es-ES`, `hi-IN`, `pt-BR` resolve to a real bundled
// catalog instead of triggering a lazy fetch.
function normalizeLocale(lng) {
  if (!lng) return 'en';
  if (BUNDLED[lng]) return lng;
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
    if (BUNDLED[norm]) {
      callback(null, BUNDLED[norm]);
      // For pre-shipped locales, fetch the latest translated catalog from the
      // worker in the background so users get real translations once the owner
      // regenerates them — avoids refresh-needed-to-see-new-translations.
      if (norm !== 'en') {
        loadLocale(norm).then((fresh) => {
          if (fresh && fresh !== BUNDLED[norm]) {
            i18n.addResourceBundle(norm, 'translation', fresh, true, true);
          }
        }).catch(() => {});
      }
      return;
    }
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
      ns: ['translation'],
      defaultNS: 'translation',
      resources: Object.fromEntries(Object.entries(BUNDLED).map(([k, v]) => [k, { translation: v }])),
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
