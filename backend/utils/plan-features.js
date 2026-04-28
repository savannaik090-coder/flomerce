// Shared helpers for plan features.
// Storage: feature_groups (JSON [{heading, items[]}]) is the canonical column;
// features (JSON flat array) is kept in sync for backward compat. normalize/
// flatten/build live here so admin/payments/i18n workers share one contract
// without an import cycle.

export const MAX_FEATURE_GROUPS = 20;
export const MAX_FEATURES_PER_GROUP = 50;
export const MAX_HEADING_LENGTH = 120;
export const MAX_ITEM_LENGTH = 500;

function tryParse(s) {
  if (s == null) return null;
  if (typeof s === 'object') return s;
  try { return JSON.parse(s); } catch { return null; }
}

// Read either column shape and return canonical [{heading, items[]}].
// Legacy flat features collapse to one ungrouped section (heading: '').
export function normalizeFeatureGroups(rawFeatureGroups, rawFeatures) {
  const fg = tryParse(rawFeatureGroups);
  if (Array.isArray(fg) && fg.length > 0) {
    const out = [];
    for (const g of fg) {
      if (!g || typeof g !== 'object') continue;
      const heading = typeof g.heading === 'string' ? g.heading : '';
      const items = Array.isArray(g.items)
        ? g.items.map((i) => (typeof i === 'string' ? i : String(i ?? ''))).filter((i) => i.length > 0)
        : [];
      out.push({ heading, items });
    }
    if (out.length > 0) return out;
  }
  // features may be flat strings or (from early grouped writes) a list of {heading,items}.
  const f = tryParse(rawFeatures);
  if (Array.isArray(f) && f.length > 0) {
    if (typeof f[0] === 'object' && f[0] !== null && ('heading' in f[0] || 'items' in f[0])) {
      const out = [];
      for (const g of f) {
        if (!g || typeof g !== 'object') continue;
        const heading = typeof g.heading === 'string' ? g.heading : '';
        const items = Array.isArray(g.items)
          ? g.items.map((i) => (typeof i === 'string' ? i : String(i ?? ''))).filter((i) => i.length > 0)
          : [];
        out.push({ heading, items });
      }
      if (out.length > 0) return out;
    }
    const flat = f.filter((s) => typeof s === 'string' && s.length > 0);
    return [{ heading: '', items: flat }];
  }
  return [{ heading: '', items: [] }];
}

// Parse a plain-text features string into canonical [{heading, items[]}].
// Convention: a line whose trimmed text ends with `:` starts a new section
// (heading = the line minus the trailing colon, trimmed). Subsequent
// non-heading lines become that section's items. Any items that appear
// BEFORE the first heading line collapse into a leading section with an
// empty heading (so legacy plain-text input keeps producing a single
// ungrouped section). Blank lines are ignored.
export function parseFeaturesPlainText(text) {
  const src = typeof text === 'string' ? text : (text == null ? '' : String(text));
  const groups = [];
  let current = null;
  for (const raw of src.split('\n')) {
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    if (trimmed.endsWith(':')) {
      const heading = trimmed.slice(0, -1).trim();
      current = { heading, items: [] };
      groups.push(current);
    } else {
      if (!current) {
        current = { heading: '', items: [] };
        groups.push(current);
      }
      current.items.push(trimmed);
    }
  }
  return groups;
}

// Serialize canonical [{heading, items[]}] back to plain text using the same
// `Heading:` convention so the round trip Plain ↔ Grouped is lossless.
// A section with a non-empty heading emits a `Heading:` line followed by its
// items (one per line). A section with an empty heading just emits its items.
export function serializeFeatureGroupsToPlainText(groups) {
  if (!Array.isArray(groups)) return '';
  const lines = [];
  for (const g of groups) {
    if (!g || typeof g !== 'object') continue;
    const heading = typeof g.heading === 'string' ? g.heading.trim() : '';
    if (heading.length > 0) lines.push(`${heading}:`);
    if (Array.isArray(g.items)) {
      for (const it of g.items) {
        if (typeof it !== 'string') continue;
        const item = it.trim();
        if (item.length === 0) continue;
        lines.push(item);
      }
    }
  }
  return lines.join('\n');
}

// Flatten groups → flat string[] for the legacy `features` column.
export function flattenFeatureGroups(groups) {
  if (!Array.isArray(groups)) return [];
  const out = [];
  for (const g of groups) {
    if (!g || !Array.isArray(g.items)) continue;
    for (const item of g.items) {
      if (typeof item === 'string' && item.length > 0) out.push(item);
    }
  }
  return out;
}

// Validate inbound payload's feature_groups (preferred) or features (legacy)
// into canonical groups. Throws Error('feature validation: ...') on violations.
export function buildFeatureGroupsFromInput({ feature_groups, features }) {
  if (feature_groups !== undefined && feature_groups !== null) {
    if (!Array.isArray(feature_groups)) {
      throw new Error('feature validation: feature_groups must be an array');
    }
    if (feature_groups.length > MAX_FEATURE_GROUPS) {
      throw new Error(`feature validation: at most ${MAX_FEATURE_GROUPS} groups allowed`);
    }
    const out = [];
    for (let gi = 0; gi < feature_groups.length; gi++) {
      const g = feature_groups[gi];
      if (!g || typeof g !== 'object') {
        throw new Error(`feature validation: group #${gi + 1} is not an object`);
      }
      const heading = typeof g.heading === 'string' ? g.heading.trim() : '';
      if (heading.length > MAX_HEADING_LENGTH) {
        throw new Error(`feature validation: heading too long (max ${MAX_HEADING_LENGTH} chars)`);
      }
      if (!Array.isArray(g.items)) {
        throw new Error(`feature validation: group "${heading}" items must be an array`);
      }
      if (g.items.length > MAX_FEATURES_PER_GROUP) {
        throw new Error(`feature validation: group "${heading}" has too many items (max ${MAX_FEATURES_PER_GROUP})`);
      }
      const items = [];
      for (const it of g.items) {
        if (typeof it !== 'string') {
          throw new Error('feature validation: items must be strings');
        }
        const trimmed = it.trim();
        if (trimmed.length === 0) continue;
        if (trimmed.length > MAX_ITEM_LENGTH) {
          throw new Error(`feature validation: feature too long (max ${MAX_ITEM_LENGTH} chars)`);
        }
        items.push(trimmed);
      }
      out.push({ heading, items });
    }
    const cleaned = out.filter((g) => g.heading.length > 0 || g.items.length > 0);
    // Empty heading is allowed for the single ungrouped section (legacy/plain
    // mode) and for at most one *leading* section in a multi-section list
    // (this lets plain-text mode start with un-headed items before the first
    // `Heading:` line). Any other empty-heading section is rejected so admins
    // can't accidentally produce unnamed sections in the middle of a list.
    if (cleaned.length > 1) {
      for (let i = 1; i < cleaned.length; i++) {
        if (cleaned[i].heading.length === 0) {
          throw new Error('feature validation: only the first section may have an empty heading; every other section must have a heading');
        }
      }
    }
    return cleaned;
  }
  if (features !== undefined && features !== null) {
    if (!Array.isArray(features)) {
      throw new Error('feature validation: features must be an array');
    }
    const items = [];
    for (const it of features) {
      if (typeof it !== 'string') {
        throw new Error('feature validation: features must be strings');
      }
      const trimmed = it.trim();
      if (trimmed.length === 0) continue;
      if (trimmed.length > MAX_ITEM_LENGTH) {
        throw new Error(`feature validation: feature too long (max ${MAX_ITEM_LENGTH} chars)`);
      }
      items.push(trimmed);
    }
    if (items.length > MAX_FEATURES_PER_GROUP * MAX_FEATURE_GROUPS) {
      throw new Error('feature validation: too many features in flat list');
    }
    return [{ heading: '', items }];
  }
  return [];
}
