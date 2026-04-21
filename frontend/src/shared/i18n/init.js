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
    if (BUNDLED[lng]) {
      callback(null, BUNDLED[lng]);
      // For pre-shipped locales, fetch the latest translated catalog from the
      // worker in the background so users get real translations once the owner
      // regenerates them — avoids refresh-needed-to-see-new-translations.
      if (lng !== 'en') {
        loadLocale(lng).then((fresh) => {
          if (fresh && fresh !== BUNDLED[lng]) {
            i18n.addResourceBundle(lng, 'translation', fresh, true, true);
          }
        }).catch(() => {});
      }
      return;
    }
    const data = await loadLocale(lng);
    if (data) callback(null, data);
    else callback(new Error('locale fetch failed'), null);
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
      ns: ['translation'],
      defaultNS: 'translation',
      resources: Object.fromEntries(Object.entries(BUNDLED).map(([k, v]) => [k, { translation: v }])),
      partialBundledLanguages: true,
      interpolation: { escapeValue: false },
      detection: {
        order: ['localStorage', 'navigator', 'htmlTag'],
        lookupLocalStorage: 'flomerce_lang',
        caches: ['localStorage'],
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

export { PRESHIPPED, RTL_LOCALES };
export default i18n;
