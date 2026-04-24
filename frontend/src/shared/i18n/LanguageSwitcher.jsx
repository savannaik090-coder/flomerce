import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PRESHIPPED,
  FOREIGN_LANGUAGES,
  markLanguageExplicit,
} from './init.js';

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

const LANG_ENGLISH_LABELS = {
  en: 'English',
  hi: 'Hindi',
  ta: 'Tamil',
  te: 'Telugu',
  ml: 'Malayalam',
  kn: 'Kannada',
  mr: 'Marathi',
  bn: 'Bengali',
  gu: 'Gujarati',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  nl: 'Dutch',
  pt: 'Portuguese',
  ja: 'Japanese',
  ko: 'Korean',
  'zh-CN': 'Chinese',
};

let geoPromise = null;
let geoResolved = null;
function fetchGeoLanguages() {
  if (geoResolved) return Promise.resolve(geoResolved);
  if (geoPromise) return geoPromise;
  geoPromise = (async () => {
    try {
      const res = await fetch('/api/i18n/geo', {
        headers: { Accept: 'application/json' },
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
      geoPromise = null;
      console.warn('[i18n] geo fetch failed, falling back to FOREIGN bucket:', err?.message || err);
      return { isIndia: false, languages: FOREIGN_LANGUAGES };
    }
  })();
  return geoPromise;
}

function injectStylesOnce() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('flomerce-lang-switcher-styles')) return;
  const style = document.createElement('style');
  style.id = 'flomerce-lang-switcher-styles';
  style.textContent = `
@keyframes flomerce-lang-spin { to { transform: rotate(360deg); } }
@keyframes flomerce-lang-fadein { from { opacity: 0; transform: translateY(-4px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes flomerce-lang-overlay-in { from { opacity: 0; } to { opacity: 1; } }

.flomerce-lang-root { position: relative; display: inline-block; font-family: inherit; }
.flomerce-lang-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 12px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  color: #0f172a;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  line-height: 1;
}
.flomerce-lang-btn:hover:not(:disabled) {
  border-color: #cbd5e1;
  box-shadow: 0 2px 4px rgba(15, 23, 42, 0.06);
  transform: translateY(-1px);
}
.flomerce-lang-btn:focus-visible {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}
.flomerce-lang-btn:disabled { opacity: 0.7; cursor: wait; }
.flomerce-lang-btn[aria-expanded="true"] {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}
.flomerce-lang-btn.compact { padding: 6px 10px; font-size: 12px; gap: 6px; border-radius: 8px; }

.flomerce-lang-globe { width: 16px; height: 16px; flex-shrink: 0; color: #64748b; }
.flomerce-lang-btn.compact .flomerce-lang-globe { width: 14px; height: 14px; }
.flomerce-lang-label { white-space: nowrap; }
.flomerce-lang-chev { width: 14px; height: 14px; flex-shrink: 0; color: #94a3b8; transition: transform 0.2s ease; }
.flomerce-lang-btn[aria-expanded="true"] .flomerce-lang-chev { transform: rotate(180deg); }

.flomerce-lang-spinner {
  width: 14px; height: 14px; flex-shrink: 0;
  border: 2px solid #e2e8f0;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: flomerce-lang-spin 0.7s linear infinite;
}
.flomerce-lang-btn.compact .flomerce-lang-spinner { width: 12px; height: 12px; border-width: 2px; }

.flomerce-lang-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 200px;
  max-height: 320px;
  overflow-y: auto;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12), 0 4px 8px rgba(15, 23, 42, 0.06);
  padding: 6px;
  z-index: 1000;
  animation: flomerce-lang-fadein 0.15s ease-out;
  list-style: none;
  margin: 0;
}
.flomerce-lang-menu.left { right: auto; left: 0; }

.flomerce-lang-option {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  width: 100%;
  padding: 9px 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: #0f172a;
  font-size: 13px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.1s ease;
}
.flomerce-lang-option:hover, .flomerce-lang-option:focus-visible {
  background: #f1f5f9;
  outline: none;
}
.flomerce-lang-option[aria-selected="true"] {
  background: linear-gradient(90deg, rgba(99, 102, 241, 0.08), rgba(168, 85, 247, 0.06));
  color: #4338ca;
  font-weight: 600;
}
.flomerce-lang-option-native { font-size: 14px; }
.flomerce-lang-option-en { font-size: 11px; color: #94a3b8; }
.flomerce-lang-option[aria-selected="true"] .flomerce-lang-option-en { color: #6366f1; }
.flomerce-lang-check { width: 14px; height: 14px; color: #6366f1; }

.flomerce-lang-loading-row {
  display: flex; align-items: center; gap: 10px;
  padding: 12px;
  color: #64748b;
  font-size: 12px;
  justify-content: center;
}

.flomerce-lang-overlay {
  position: fixed; inset: 0;
  background: rgba(15, 23, 42, 0.18);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999;
  animation: flomerce-lang-overlay-in 0.15s ease-out;
}
.flomerce-lang-overlay-card {
  background: #ffffff;
  border-radius: 14px;
  padding: 20px 28px;
  display: flex; align-items: center; gap: 14px;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.2);
}
.flomerce-lang-overlay-spinner {
  width: 22px; height: 22px;
  border: 3px solid #e2e8f0;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: flomerce-lang-spin 0.7s linear infinite;
}
.flomerce-lang-overlay-text {
  font-size: 14px;
  color: #0f172a;
  font-weight: 500;
  font-family: inherit;
}

@media (prefers-reduced-motion: reduce) {
  .flomerce-lang-btn, .flomerce-lang-chev, .flomerce-lang-menu, .flomerce-lang-overlay { animation: none; transition: none; }
  .flomerce-lang-spinner, .flomerce-lang-overlay-spinner { animation-duration: 1.5s; }
}
`;
  document.head.appendChild(style);
}

function GlobeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function ChevronDown({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CheckIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// Per-mount unique listbox id so multiple switcher instances on the same
// page (desktop nav + mobile drawer + footer) don't collide on aria-controls
// references. Counter is module-scoped so it's stable across re-renders of
// the same instance.
let listboxIdCounter = 0;

export default function LanguageSwitcher({ className = '', compact = false, menuAlign = 'right' }) {
  const { i18n, t } = useTranslation('common');
  const current = (i18n.language || 'en').split('-')[0] === 'zh'
    ? 'zh-CN'
    : (i18n.language || 'en');

  // Stable per-instance id used to wire aria-controls (button → listbox)
  // for screen-reader announcement parity with the previous native <select>.
  const listboxId = useMemo(() => `flomerce-lang-listbox-${++listboxIdCounter}`, []);

  useEffect(() => { injectStylesOnce(); }, []);

  const [languages, setLanguages] = useState(() => {
    if (geoResolved?.languages) {
      const filtered = geoResolved.languages.filter((c) => PRESHIPPED.includes(c));
      return filtered.length > 0 ? filtered : ['en'];
    }
    return ['en'];
  });
  const [geoLoading, setGeoLoading] = useState(false);
  const [open, setOpen] = useState(false);
  // Switching state tracks the window between user clicking a language and
  // i18next firing `languageChanged` (which fires after the new catalog has
  // been fetched + namespaces loaded). During this window we show: (a) a
  // small spinner inside the button replacing the chevron, (b) a subtle
  // page-level overlay so the user knows the page is updating instead of
  // wondering if their click registered. The previous implementation showed
  // nothing — a click on Hindi felt like a no-op for the ~300-800ms while
  // the locale catalog was in flight.
  const [switching, setSwitching] = useState(false);

  const isMountedRef = useRef(true);
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  // If a future `languageChanged` event never arrives (edge case: user picks
  // the SAME language they're already on, or i18next debounces), this
  // safety timer hides the overlay so it can never get stuck on screen.
  const switchTimerRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
    };
  }, []);

  // Listen for the i18next `languageChanged` event — it fires after the new
  // catalog is loaded and bound, so it's the correct signal for "the
  // language switch has actually completed". `loaded` would also work but
  // can fire multiple times per language change (once per namespace), so
  // `languageChanged` is cleaner.
  useEffect(() => {
    const handler = () => {
      if (!isMountedRef.current) return;
      setSwitching(false);
      if (switchTimerRef.current) {
        clearTimeout(switchTimerRef.current);
        switchTimerRef.current = null;
      }
    };
    i18n.on('languageChanged', handler);
    return () => { i18n.off('languageChanged', handler); };
  }, [i18n]);

  const triggerGeoFetch = useCallback(() => {
    if (geoResolved || geoLoading) return;
    setGeoLoading(true);
    fetchGeoLanguages().then((res) => {
      if (!isMountedRef.current) return;
      const filtered = res.languages.filter((c) => PRESHIPPED.includes(c));
      setLanguages(filtered.length > 0 ? filtered : ['en']);
      setGeoLoading(false);
    });
  }, [geoLoading]);

  const options = useMemo(() => {
    if (languages.includes(current)) return languages;
    return [...languages, current];
  }, [languages, current]);

  // Click-outside dismissal. Pointerdown is used (not click) so the dropdown
  // closes on the press, before any other element's click handler fires —
  // matches the feel of native dropdowns.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // When the menu opens, focus the currently-selected option so keyboard
  // users land in a sensible place. Arrow keys then walk the list.
  useEffect(() => {
    if (!open || !menuRef.current) return;
    const selectedBtn = menuRef.current.querySelector('[aria-selected="true"]');
    (selectedBtn || menuRef.current.querySelector('button'))?.focus();
  }, [open]);

  const handleToggle = () => {
    if (switching) return;
    triggerGeoFetch();
    setOpen((v) => !v);
  };

  const handleSelect = (lng) => {
    setOpen(false);
    if (lng === current) {
      buttonRef.current?.focus();
      return;
    }
    markLanguageExplicit();
    setSwitching(true);
    // Safety net — if `languageChanged` somehow doesn't fire within 6s
    // (network failure inside the i18next backend, etc.), drop the overlay
    // so the user isn't trapped. The actual switch may still complete in
    // the background; this just stops blocking the UI.
    if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
    switchTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      setSwitching(false);
      switchTimerRef.current = null;
    }, 6000);
    i18n.changeLanguage(lng);
    try { localStorage.setItem('flomerce_lang', lng); } catch {}
    buttonRef.current?.focus();
  };

  // Arrow-key navigation inside the open menu.
  const handleMenuKey = (e) => {
    if (!menuRef.current) return;
    const buttons = Array.from(menuRef.current.querySelectorAll('button[data-lang]'));
    const currentIdx = buttons.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = buttons[Math.min(buttons.length - 1, currentIdx + 1)] || buttons[0];
      next?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = buttons[Math.max(0, currentIdx - 1)] || buttons[buttons.length - 1];
      prev?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      buttons[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      buttons[buttons.length - 1]?.focus();
    }
  };

  const buttonLabel = LANG_LABELS[current] || current;
  // Loader text is intentionally kept SHORT and from the common namespace so
  // it is translated for landing/about visitors. For legal-page consumers
  // (LegalNavbar / LegalFooter) which are deliberately English-only, the
  // common namespace is still loaded so this still resolves correctly —
  // `t('common:loading')` falls back to the literal default if the key is
  // missing in any non-English catalog.
  const loadingText = t('loading', 'Loading…');

  return (
    <>
      <div ref={rootRef} className={`flomerce-lang-root ${className}`}>
        <button
          ref={buttonRef}
          type="button"
          className={`flomerce-lang-btn${compact ? ' compact' : ''}`}
          onClick={handleToggle}
          onMouseEnter={triggerGeoFetch}
          onFocus={triggerGeoFetch}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-label={t('language', 'Language')}
          disabled={switching}
        >
          <GlobeIcon className="flomerce-lang-globe" />
          <span className="flomerce-lang-label">{buttonLabel}</span>
          {switching
            ? <span className="flomerce-lang-spinner" aria-hidden="true" />
            : <ChevronDown className="flomerce-lang-chev" />}
        </button>

        {open && (
          <ul
            ref={menuRef}
            id={listboxId}
            className={`flomerce-lang-menu${menuAlign === 'left' ? ' left' : ''}`}
            role="listbox"
            aria-label={t('language', 'Language')}
            onKeyDown={handleMenuKey}
          >
            {geoLoading && options.length <= 1 && (
              <li className="flomerce-lang-loading-row">
                <span className="flomerce-lang-spinner" aria-hidden="true" />
                <span>{loadingText}</span>
              </li>
            )}
            {options.map((lng) => {
              const isSelected = lng === current;
              const native = LANG_LABELS[lng] || lng;
              const english = LANG_ENGLISH_LABELS[lng];
              const showEnglish = english && english !== native;
              return (
                <li key={lng} role="none">
                  <button
                    type="button"
                    role="option"
                    data-lang={lng}
                    aria-selected={isSelected}
                    className="flomerce-lang-option"
                    onClick={() => handleSelect(lng)}
                  >
                    <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
                      <span className="flomerce-lang-option-native">{native}</span>
                      {showEnglish && <span className="flomerce-lang-option-en">{english}</span>}
                    </span>
                    {isSelected && <CheckIcon className="flomerce-lang-check" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Page-level overlay shown while the new catalog is being fetched.
          Sits above everything (z-index 9999) so the user can't interact
          with stale UI mid-switch. Auto-dismissed by the `languageChanged`
          listener above, with a 6s safety timeout as a backstop. */}
      {switching && (
        <div className="flomerce-lang-overlay" role="status" aria-live="polite">
          <div className="flomerce-lang-overlay-card">
            <span className="flomerce-lang-overlay-spinner" aria-hidden="true" />
            <span className="flomerce-lang-overlay-text">{loadingText}</span>
          </div>
        </div>
      )}
    </>
  );
}
