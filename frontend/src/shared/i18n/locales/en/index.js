// Single import point for the English source catalog. Each JSON file owns
// exactly one i18next namespace and contains that namespace's keys at the
// top level (`landing.json` = `{heroBadge: "..."}`). This is the shape
// react-i18next wants when you call `useTranslation('landing')` and then
// `t('heroBadge')`. The backend (`i18n-worker.js`) wraps each file under
// its namespace name when assembling EN_CATALOG so the per-key SHA
// fingerprints in R2 stay byte-identical to the pre-split layout.
import common from './common.json';
import nav from './nav.json';
import languages from './languages.json';
import landing from './landing.json';
import auth from './auth.json';
import admin from './admin.json';
import owner from './owner.json';
import dashboard from './dashboard.json';
import products from './products.json';
import customers from './customers.json';
import wizard from './wizard.json';
import legal from './legal.json';
import about from './about.json';
import plans from './plans.json';
import storefront from './storefront.json';

export const NAMESPACE_FILES = {
  common,
  nav,
  languages,
  landing,
  auth,
  admin,
  owner,
  dashboard,
  products,
  customers,
  wizard,
  legal,
  about,
  plans,
  storefront,
};

// Subset used by the storefront SPA. Anything outside this list is loaded
// only by the platform/admin SPA.
export const STOREFRONT_NAMESPACES = ['common', 'nav', 'products', 'customers', 'storefront', 'admin'];

export const NAMESPACES = Object.keys(NAMESPACE_FILES);
