// Single import point for the English source catalog. The strings are split
// into per-namespace JSON files for editing convenience; this module merges
// them back into one nested object whose shape is byte-identical to the old
// flat `en.json`. That preserves:
//   - the dotted key paths every `t('...')` call site already uses, and
//   - the per-key hash sidecars stored in R2 for translation staleness, so
//     splitting the file does NOT mark every cached locale as stale.
//
// To add a new namespace, drop a `<name>.json` file in this directory whose
// top-level key matches the namespace, then add it to NAMESPACES below.
import common from './common.json';
import landing from './landing.json';
import auth from './auth.json';
import admin from './admin.json';
import owner from './owner.json';
import dashboard from './dashboard.json';

export const NAMESPACE_FILES = { common, landing, auth, admin, owner, dashboard };

// Each namespace file is wrapped under one or more top-level keys (e.g.
// common.json holds `common`, `nav`, `languages`). i18next consumes them as
// separate namespaces; the merged form below is what gets handed to the
// backend hash routine and to i18next's default-namespace fallback chain.
export const NAMESPACES = Object.keys(NAMESPACE_FILES);

function deepMerge(target, source) {
  for (const [k, v] of Object.entries(source || {})) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      target[k] = deepMerge(target[k] && typeof target[k] === 'object' ? target[k] : {}, v);
    } else {
      target[k] = v;
    }
  }
  return target;
}

const merged = {};
for (const file of Object.values(NAMESPACE_FILES)) deepMerge(merged, file);

export default merged;
