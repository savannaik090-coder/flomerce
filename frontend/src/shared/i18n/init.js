import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enCatalog from './locales/en.json';

const PRESHIPPED = ['en', 'hi', 'es', 'zh-CN', 'ar'];
const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur']);

function applyDirection(lng) {
  if (typeof document === 'undefined') return;
  const dir = RTL_LOCALES.has(lng) ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lng);
}

async function loadLocale(lng) {
  if (lng === 'en') return enCatalog;
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
    if (lng === 'en') {
      callback(null, enCatalog);
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
      resources: { en: { translation: enCatalog } },
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
