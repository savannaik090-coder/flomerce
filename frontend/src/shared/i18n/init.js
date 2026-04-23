import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { NAMESPACE_FILES, NAMESPACES, STOREFRONT_NAMESPACES } from './locales/en/index.js';

// English is bundled into the JS payload — it is the source catalog and must
// always be available as the fallback language. Every other language is
// fetched from the platform's locale API on demand; the worker serves the
// seed translation instantly on first hit and the smart-refreshed version
// after that. The fetch response is one merged catalog whose top-level keys
// ARE the namespace names, so per-namespace `read()` slices it locally.
const BUNDLED_NS = { en: NAMESPACE_FILES };

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

// Cache of merged catalogs already fetched from the worker, so each
// per-namespace `read()` only triggers ONE HTTP request per locale.
const localeCache = new Map();

// Per-locale version stamps from /api/i18n/manifest. We append `?v=<hash>`
// to each locale URL so a regenerate on the backend produces a NEW URL —
// guaranteeing a cache miss in the browser disk cache (the locale endpoint
// itself is served with a 7-day Cache-Control for cold-start speed).
//
// versions is the latest manifest snapshot. manifestPromise is the in-flight
// fetch (if any), so concurrent boots don't fan out duplicate manifest requests.
const versions = new Map();
let manifestPromise = null;
let manifestLastFetchedAt = 0;
const MANIFEST_REFETCH_MIN_MS = 5_000; // throttle focus refetches

async function fetchManifest() {
  try {
    const res = await fetch('/api/i18n/manifest', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const next = json?.versions || {};
    const changed = [];
    for (const [lang, v] of Object.entries(next)) {
      const prev = versions.get(lang);
      if (prev !== v) {
        // A locale we already fetched into the in-memory catalog cache must
        // be refreshed whenever its version stamp moves — including the case
        // where the locale was previously absent from the manifest (newly
        // generated since boot) but we already have a stale unversioned
        // entry sitting in localeCache. Without this, `?v=` only kicks in
        // after the next page reload, defeating live refresh.
        if (localeCache.has(lang)) changed.push(lang);
        versions.set(lang, v);
      }
    }
    manifestLastFetchedAt = Date.now();
    return { versions: next, changed };
  } catch (err) {
    console.warn('[i18n] manifest fetch failed:', err);
    return { versions: {}, changed: [] };
  }
}

function ensureManifest() {
  if (manifestPromise) return manifestPromise;
  manifestPromise = fetchManifest().finally(() => { manifestPromise = null; });
  return manifestPromise;
}

// `forceNetwork=true` is used by the admin refresh path. The locale endpoint
// is served with a 7-day Cache-Control so first loads are instant offline-friendly,
// but that same header would otherwise make the browser hand back a stale copy
// from disk for a week after a regenerate — even though R2 and the Cloudflare
// edge have already been purged. Passing `cache: 'reload'` forces a full
// network round-trip (the server's ETag still keeps it cheap on the wire).
async function loadMergedLocale(lng, { forceNetwork = false } = {}) {
  if (!forceNetwork && localeCache.has(lng)) return localeCache.get(lng);
  const promise = (async () => {
    try {
      // Wait for the in-flight manifest (if any) so the very first locale
      // fetch on cold boot already carries a version stamp. Once cached,
      // ensureManifest() is a no-op pointing at the resolved promise.
      if (!versions.has(lng)) {
        try { await ensureManifest(); } catch { /* ignore */ }
      }
      const v = versions.get(lng);
      const url = v
        ? `/api/i18n/locale/${encodeURIComponent(lng)}?v=${encodeURIComponent(v)}`
        : `/api/i18n/locale/${encodeURIComponent(lng)}`;
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        cache: forceNetwork ? 'reload' : 'default',
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
  })();
  localeCache.set(lng, promise);
  return promise;
}

const backendPlugin = {
  type: 'backend',
  init: () => {},
  read: async (lng, ns, callback) => {
    // Normalize regional/variant codes (en-US, en-GB, pt-BR, fr-FR, ...) up-front
    // so we never try to fetch a non-existent /api/i18n/locale/en-US that would
    // return SPA HTML and crash init.
    const norm = normalizeLocale(lng);
    if (norm === 'en') {
      callback(null, NAMESPACE_FILES[ns] || {});
      return;
    }
    // Worker response is one merged catalog whose top-level keys are the
    // namespace names. Slice out the requested namespace.
    const merged = await loadMergedLocale(norm);
    if (merged && Object.prototype.hasOwnProperty.call(merged, ns)) {
      callback(null, merged[ns]);
    } else {
      // Always succeed with the English slice so init completes and t() resolves.
      callback(null, NAMESPACE_FILES[ns] || {});
    }
  },
};

let initPromise = null;

// Capture whether the user has an *explicit* saved language preference BEFORE
// the language detector runs. The detector caches its detection result into
// `flomerce_lang` on init, so checking localStorage after init can't tell
// "shopper picked this" apart from "browser default got autosaved". The
// SiteContext relies on this to decide whether to override with the merchant's
// content_language on a true first visit.
// We track "did the shopper EXPLICITLY pick a language?" with a dedicated
// localStorage marker (`flomerce_lang_explicit`) instead of inferring from
// the existence of `flomerce_lang`. The browser language detector below
// caches its detected value into `flomerce_lang` on every visit, so
// presence of that key cannot distinguish "user picked Hindi" from
// "browser auto-detected English on first load and got cached". Language
// switcher components call `markLanguageExplicit()` on user action, which
// persists the marker. This keeps merchant-language seeding (below) working
// across return visits where the user never made an explicit choice.
const EXPLICIT_KEY = 'flomerce_lang_explicit';
let hadExplicitLangAtBoot = false;
try {
  if (typeof localStorage !== 'undefined') {
    hadExplicitLangAtBoot = !!localStorage.getItem(EXPLICIT_KEY);
  }
} catch (e) { /* ignore */ }

// On any storefront visit (first or returning), if the shopper has NOT
// explicitly chosen a language, seed `flomerce_lang` with the merchant's
// content_language we cached on the previous load for this host. This runs
// BEFORE i18next initializes, so the detector picks it up and the UI boots
// directly into the merchant's language with no flicker.
try {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && !hadExplicitLangAtBoot) {
    const cached = localStorage.getItem(`flomerce_site_lang:${window.location.hostname}`);
    if (cached && cached !== 'en') {
      localStorage.setItem('flomerce_lang', cached);
    }
  }
} catch (e) { /* ignore */ }

export function hasExplicitLanguagePreference() {
  return hadExplicitLangAtBoot;
}

export function markLanguageExplicit() {
  hadExplicitLangAtBoot = true;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(EXPLICIT_KEY, '1');
    }
  } catch (e) { /* ignore */ }
}

function buildResources(namespaces) {
  // Only bundle the English slices for namespaces actually in use, so the
  // storefront SPA does not pay the bytes for admin/owner/wizard catalogs.
  const slice = {};
  for (const ns of namespaces) {
    if (NAMESPACE_FILES[ns]) slice[ns] = NAMESPACE_FILES[ns];
  }
  return { en: slice };
}

function initWithNamespaces(namespaces, options = {}) {
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
      // Each source file owns one i18next namespace; `common` is the default
      // so `t('save')` resolves there without a prefix. Components that read
      // from another bundle declare it with `useTranslation('<ns>')` and
      // call short keys (`t('heroBadge')`). Cross-namespace access uses the
      // explicit `ns:` prefix syntax — `t('common:save')`.
      ns: namespaces,
      defaultNS: 'common',
      resources: buildResources(namespaces),
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
      // bindI18n: re-render React components on languageChanged AND `loaded`,
      // so that `refreshLocale()` (which calls reloadResources) instantly
      // re-paints the UI without a manual page refresh after the admin
      // regenerates a locale.
      react: { useSuspense: false, bindI18n: 'languageChanged loaded' },
      ...options,
    })
    .then(() => {
      applyDirection(i18n.language);
      i18n.on('languageChanged', applyDirection);
      // Open the cross-tab channel exactly once, after init succeeds, so that
      // a regenerate in the admin tab triggers refresh in shopper / dashboard
      // tabs that already have i18next live.
      ensureI18nChannel();
      // Cross-origin admin tabs (different host than the storefront) cannot
      // see BroadcastChannel pings, so we ALSO refetch the manifest whenever
      // the tab regains focus and refresh any locale whose version changed.
      // This is what makes "Refresh All" actually visible to merchants whose
      // admin sits at a different origin without forcing them to incognito.
      installManifestRefreshOnFocus();
      return i18n;
    });
  return initPromise;
}

// --- Live update layer (Phase B) ---------------------------------------------
//
// `refreshLocale(lang)` clears the in-memory merged-catalog cache and asks
// i18next to re-fetch the namespaces for that language. Combined with the
// `bindI18n: 'languageChanged loaded'` option above, every component using
// `useTranslation()` re-renders the moment the new strings land.
//
// A single same-origin BroadcastChannel keeps additional tabs in sync without
// polling. The originating tab marks the message so we never refresh twice in
// the same tab if the broadcast loops back.

let i18nChannel = null;
function ensureI18nChannel() {
  if (i18nChannel) return i18nChannel;
  if (typeof BroadcastChannel === 'undefined') return null;
  try {
    i18nChannel = new BroadcastChannel('flomerce-i18n');
    i18nChannel.addEventListener('message', (ev) => {
      const data = ev?.data || {};
      if (data.type !== 'invalidate') return;
      // Skip messages we sent ourselves to avoid an echo refresh.
      if (data.origin && data.origin === channelOriginId) return;
      if (data.lang) _refreshLocaleInternal(data.lang, /* broadcast */ false);
    });
  } catch (e) {
    console.warn('[i18n] BroadcastChannel init failed:', e);
    i18nChannel = null;
  }
  return i18nChannel;
}

let manifestFocusInstalled = false;
let focusRefreshInFlight = false;
function installManifestRefreshOnFocus() {
  if (manifestFocusInstalled) return;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  manifestFocusInstalled = true;

  const onFocus = async () => {
    // `focus` and `visibilitychange` both fire on tab return. Without this
    // guard we'd run two manifest checks back-to-back and double-trigger
    // _refreshLocaleInternal() for any locale whose version moved.
    if (focusRefreshInFlight) return;
    if (Date.now() - manifestLastFetchedAt < MANIFEST_REFETCH_MIN_MS) return;
    focusRefreshInFlight = true;
    try {
      const { changed } = await ensureManifest();
      for (const lang of changed) {
        // Same internal path as the in-tab refresh — drops the cache,
        // refetches with the new version stamp, and re-emits `loaded` so
        // React repaints.
        _refreshLocaleInternal(lang, /* broadcast */ false);
      }
    } finally {
      focusRefreshInFlight = false;
    }
  };

  window.addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') onFocus();
  });
}

// Random per-tab origin id used to filter out our own broadcast echoes.
const channelOriginId = (typeof crypto !== 'undefined' && crypto.randomUUID)
  ? crypto.randomUUID()
  : `${Date.now()}-${Math.random()}`;

async function _refreshLocaleInternal(lang, broadcast) {
  const norm = normalizeLocale(lang);
  // English is bundled and always fresh — nothing to refetch.
  if (!norm || norm === 'en') return;
  localeCache.delete(norm);
  try {
    // Pre-populate localeCache with a forced-network fetch BEFORE
    // reloadResources runs. The backend plugin's read() hits the cache and
    // gets the fresh catalog without us having to plumb forceNetwork through
    // i18next's internal call chain. Without this, the browser's HTTP disk
    // cache (max-age=604800) would serve a stale copy for up to 7 days.
    await loadMergedLocale(norm, { forceNetwork: true });
    // reloadResources triggers backendPlugin.read() for every loaded namespace
    // of `norm`, which in turn re-fetches the merged catalog from the worker.
    await i18n.reloadResources(norm);
    // If the user is currently viewing this language, fire a `loaded` event
    // so `bindI18n` repaints right now (some i18next versions debounce).
    if (i18n.resolvedLanguage === norm || i18n.language === norm) {
      i18n.emit('loaded');
    }
  } catch (e) {
    console.warn('[i18n] reloadResources failed for', norm, e);
  }
  if (broadcast) {
    const ch = ensureI18nChannel();
    try {
      ch?.postMessage({ type: 'invalidate', lang: norm, origin: channelOriginId });
    } catch (e) {
      console.warn('[i18n] BroadcastChannel postMessage failed:', e);
    }
  }
}

/**
 * Public API: refresh a single language's catalog in-place. Call this from the
 * owner admin after a regenerate / per-key edit so the UI updates instantly,
 * with no manual reload. Other open tabs receive a BroadcastChannel ping and
 * refresh themselves the same way.
 */
export async function refreshLocale(lang) {
  return _refreshLocaleInternal(lang, /* broadcast */ true);
}

export function initI18n(options = {}) {
  return initWithNamespaces(NAMESPACES, options);
}

export function initStorefrontI18n(options = {}) {
  return initWithNamespaces(STOREFRONT_NAMESPACES, options);
}

export { PRESHIPPED, RTL_LOCALES, normalizeLocale, STOREFRONT_NAMESPACES };
export default i18n;
