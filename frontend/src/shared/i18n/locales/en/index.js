// Single import point for the English source catalog. Each JSON file owns
// exactly one i18next namespace and contains that namespace's keys at the
// top level (`landing.json` = `{heroBadge: "..."}`). This is the shape
// react-i18next wants when you call `useTranslation('landing')` and then
// `t('heroBadge')`. The backend (`i18n-worker.js`) wraps each file under
// its namespace name when assembling EN_CATALOG so the per-key SHA
// fingerprints in R2 stay byte-identical to the pre-split layout.
//
// Active scope (Apr 24, 2026): only the public landing surfaces use
// i18next, so the source catalog is now down to 4 namespaces.
//   - landing.json  → LandingPage, LandingPricing, ContactForm
//   - nav.json      → Navbar
//   - common.json   → LanguageSwitcher (and any future shared chrome)
//   - languages.json → LanguageSwitcher option labels
// Previously-shipped namespaces (auth, admin, owner, dashboard, products,
// customers, wizard, legal, about, plans, storefront) were deleted on
// Apr 24, 2026 because nothing in the current UI calls `t()` for any of
// their keys. Re-introduce them only when you actually wire up
// useTranslation() on the corresponding pages — and treat any old git
// history of those files as a starting template, not a finished catalog.
import common from './common.json';
import nav from './nav.json';
import languages from './languages.json';
import landing from './landing.json';

export const NAMESPACE_FILES = {
  common,
  nav,
  languages,
  landing,
};

// All namespaces shipped to the platform SPA's i18next instance. Identical
// to NAMESPACE_FILES keys — kept as a separate export so call sites can
// import a stable name even if the source layout changes again.
export const NAMESPACES = Object.keys(NAMESPACE_FILES);

// The storefront SPA does NOT use i18next (System B handles its
// translations). This export is retained as a stub for any legacy call
// site so importing it still works; the only namespaces left in the
// catalog that the storefront could conceivably want are `common` + `nav`.
export const STOREFRONT_NAMESPACES = ['common', 'nav'];
