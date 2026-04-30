// Per-section theme/color-scheme system.
//
// A `theme_config` is a JSON blob stored on `site_config` that holds:
//   - `schemes`: 1–5 named, reusable bundles of 7 role-based colors
//   - `sectionAssignments`: map of sectionId → schemeId
//
// Schemes are how merchants brand their store; sections "wear" a scheme.
// The first scheme is always the Brand scheme (isDefault). Brand cannot be
// deleted. Other schemes can be added/removed up to a hard cap of 5 total.
//
// Frontend contract: every scheme MUST have all 7 slots as valid hex strings.
// Validators here reject anything else so the storefront never has to defend
// against malformed values.

export const MAX_SCHEMES = 5;

// Platform-default palette. Used when (a) the merchant skips the wizard's
// Brand Colors step, (b) the merchant clicks "Reset Brand to platform
// default" in the Theme tab, or (c) the wizard never collected colors at
// all (legacy entry points). Kept in sync with storefront/styles/variables.css
// so the painted Brand scheme harmonizes with the storefront's chrome.
export const PLATFORM_DEFAULT_PRIMARY = '#603000';
export const PLATFORM_DEFAULT_SECONDARY = '#5a3f2a';
export const PLATFORM_DEFAULT_ACCENT = '#b08c4c';

// Per-slot classic defaults for the additional 3 slots (headingText,
// mutedText, border). These mirror the classic template's CSS variables
// (`--color-text`, `--color-text-muted`, `--color-border`). When an older
// saved scheme is read back without these slots, normalizeThemeConfig
// fills them with these values so the merchant's existing palette stays
// intact and the new slots show the classic look out of the box.
export const PLATFORM_DEFAULT_HEADING_TEXT = '#333333';
export const PLATFORM_DEFAULT_MUTED_TEXT = '#888888';
export const PLATFORM_DEFAULT_BORDER = '#eeeeee';

export const SECTION_IDS = [
  // Homepage / chrome
  'navbar', 'promo-banner', 'hero-slider', 'welcome-banner',
  'categories', 'watchbuy', 'featured-video', 'shop-the-look',
  'store-locations', 'trending-now', 'brand-story',
  'customer-reviews', 'footer',
  // Standalone pages
  'about-us', 'contact-us', 'book-appointment', 'faq', 'blog',
  // Settings-driven sections
  'checkout', 'product-page', 'product-policies', 'terms', 'privacy',
  // Other reachable surfaces (cart, wishlist, login/signup, order track)
  // get the Brand scheme as a fallback via getSchemeForSection.
];

const HEX = /^#[0-9a-fA-F]{6}$/;

export function isHex(v) {
  return typeof v === 'string' && HEX.test(v);
}

function clampHex(v, fallback) {
  return isHex(v) ? v.toLowerCase() : fallback;
}

// Strict hex check — used by the validator path so the API rejects rather
// than silently coerces. Throws with a descriptive message that surfaces
// to the merchant in the 400 response.
function requireHex(v, fieldLabel) {
  if (isHex(v)) return v.toLowerCase();
  throw new Error(`Invalid color for ${fieldLabel}: expected a 6-character hex like #ff0000.`);
}

// Lighten/darken a hex by a 0–1 factor. Used for synthesizing the Inverse
// scheme from a single brand color when we don't have a full palette.
function shiftHex(hex, factor) {
  if (!isHex(hex)) return hex;
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 0xff;
  let g = (n >> 8) & 0xff;
  let b = n & 0xff;
  if (factor >= 0) {
    r = Math.round(r + (255 - r) * factor);
    g = Math.round(g + (255 - g) * factor);
    b = Math.round(b + (255 - b) * factor);
  } else {
    const f = 1 + factor;
    r = Math.round(r * f);
    g = Math.round(g * f);
    b = Math.round(b * f);
  }
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

// Pick black or white text based on a background's perceived luminance, so
// every seeded button text is readable without the merchant touching it.
function pickReadableText(bg) {
  if (!isHex(bg)) return '#ffffff';
  const n = parseInt(bg.slice(1), 16);
  const r = ((n >> 16) & 0xff) / 255;
  const g = ((n >> 8) & 0xff) / 255;
  const b = (n & 0xff) / 255;
  // Quick perceptual luminance — good enough for seeding.
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum > 0.55 ? '#111111' : '#ffffff';
}

export function emptyScheme(name = 'Scheme') {
  return {
    id: '',
    name,
    isDefault: false,
    background: '#ffffff',
    text: '#333333',
    headingText: PLATFORM_DEFAULT_HEADING_TEXT,
    mutedText: PLATFORM_DEFAULT_MUTED_TEXT,
    border: PLATFORM_DEFAULT_BORDER,
    button: '#000000',
    buttonText: '#ffffff',
    secondaryButton: '#f1f5f9',
    link: '#1d4ed8',
    accent: '#b08c4c',
  };
}

// Synthesize the three default schemes (Brand / Inverse / Accent) from a
// merchant's primary + secondary color. Brand uses the merchant's primary as
// the button color on a light surface; Inverse swaps to dark-on-light from
// the secondary; Accent leans on the existing accent color as the dominant
// button.
export function buildDefaultSchemes(primaryColor, secondaryColor, accentColor) {
  const primary = clampHex(primaryColor, PLATFORM_DEFAULT_PRIMARY);
  // `secondary` was historically computed but never used. Kept as the
  // optional 2nd merchant color in case future palettes want it; for now
  // Brand derives secondaryButton from `primary` so the scheme remains
  // visually coherent without forcing the merchant to pick a 3rd color.
  const _secondary = clampHex(secondaryColor, PLATFORM_DEFAULT_SECONDARY);
  const accent = clampHex(accentColor, PLATFORM_DEFAULT_ACCENT);

  // Brand mirrors the classic template's CSS variables exactly so a fresh
  // site looks identical to the platform default. Heading/body text use
  // #333, muted text uses #888, borders use #eee — matching the classic
  // `--color-text`, `--color-text-muted`, `--color-border` defaults.
  const brand = {
    id: 'brand',
    name: 'Brand',
    isDefault: true,
    background: '#ffffff',
    text: '#333333',
    headingText: PLATFORM_DEFAULT_HEADING_TEXT,
    mutedText: PLATFORM_DEFAULT_MUTED_TEXT,
    border: PLATFORM_DEFAULT_BORDER,
    button: primary,
    buttonText: pickReadableText(primary),
    secondaryButton: shiftHex(primary, 0.85),
    link: primary,
    accent,
  };

  const inverseBg = shiftHex(primary, -0.4);
  const inverse = {
    id: 'inverse',
    name: 'Inverse',
    isDefault: false,
    background: inverseBg,
    text: '#ffffff',
    headingText: '#ffffff',
    mutedText: '#d8c8b8',
    border: shiftHex(inverseBg, 0.25),
    button: '#ffffff',
    buttonText: '#111111',
    secondaryButton: shiftHex(inverseBg, 0.15),
    link: '#f5deb3',
    accent,
  };

  const accentScheme = {
    id: 'accent',
    name: 'Accent',
    isDefault: false,
    background: '#fdfaf3',
    text: '#1f1a14',
    headingText: '#1f1a14',
    mutedText: '#8a7a5a',
    border: '#e8dcc6',
    button: accent,
    buttonText: pickReadableText(accent),
    secondaryButton: shiftHex(accent, 0.78),
    link: primary,
    accent,
  };

  return [brand, inverse, accentScheme];
}

// Default assignments: every section gets the Brand scheme until the merchant
// chooses otherwise. Returning a plain object keeps the JSON small.
export function buildDefaultAssignments() {
  const map = {};
  for (const id of SECTION_IDS) map[id] = 'brand';
  return map;
}

export function buildDefaultThemeConfig(primaryColor, secondaryColor, accentColor, options) {
  // `applyBrandAsDefault` controls whether the storefront actively paints
  // the Brand scheme over sections whose assignment === Brand. When the
  // flag is `true`, Brand functions as a real theme (the wizard's "Brand
  // Colors" output, or any merchant who has touched the Theme tab). When
  // `false`/undefined, the storefront falls back to its hardcoded look so
  // legacy sites that never customized stay visually identical.
  const applyBrandAsDefault = !!(options && options.applyBrandAsDefault);
  return {
    schemes: buildDefaultSchemes(primaryColor, secondaryColor, accentColor),
    sectionAssignments: buildDefaultAssignments(),
    applyBrandAsDefault,
  };
}

// Build a fresh Brand scheme using the platform default palette. Used by
// the "Reset Brand to platform default" button in the Theme tab so the
// merchant can wipe their customizations without losing the rest of the
// theme config (other schemes, assignments, overrides).
export function buildPlatformDefaultBrandScheme() {
  const [brand] = buildDefaultSchemes(
    PLATFORM_DEFAULT_PRIMARY,
    PLATFORM_DEFAULT_SECONDARY,
    PLATFORM_DEFAULT_ACCENT,
  );
  return brand;
}

// Validate + normalize incoming theme config. Throws on hard errors so the
// HTTP handler can return a 400. Coerces missing pieces back to the seeded
// defaults rather than silently dropping them, so a partial PUT doesn't
// destroy the merchant's other schemes.
export function normalizeThemeConfig(input, fallbackPrimary, fallbackSecondary, fallbackAccent, options) {
  // `forceApplyBrandAsDefault` (truthy) overrides whatever flag is on the
  // input — used by the merchant PUT path so any save through the Theme
  // tab opts the site in to Brand painting. Read-time backfill calls
  // pass nothing, so legacy untouched sites stay opted-out.
  const forceApply = !!(options && options.forceApplyBrandAsDefault);
  if (!input || typeof input !== 'object') {
    return buildDefaultThemeConfig(fallbackPrimary, fallbackSecondary, fallbackAccent, {
      applyBrandAsDefault: forceApply,
    });
  }

  const schemesIn = Array.isArray(input.schemes) ? input.schemes : [];
  if (schemesIn.length > MAX_SCHEMES) {
    throw new Error(`A site can have at most ${MAX_SCHEMES} color schemes.`);
  }

  // Ensure a default scheme exists. If the merchant somehow strips isDefault
  // off all of them, mark the first one as default to keep the contract.
  const seenIds = new Set();
  const schemes = schemesIn.map((s, idx) => {
    if (!s || typeof s !== 'object') {
      throw new Error('Each scheme must be an object.');
    }
    let id = typeof s.id === 'string' && s.id.trim() ? s.id.trim().slice(0, 64) : `scheme-${idx + 1}`;
    // Avoid duplicate ids.
    while (seenIds.has(id)) id = `${id}-${idx}`;
    seenIds.add(id);
    const name = typeof s.name === 'string' && s.name.trim() ? s.name.trim().slice(0, 60) : `Scheme ${idx + 1}`;
    // Strict: invalid hex values are rejected so the merchant gets a 400
    // with an actionable message instead of a silently mangled palette.
    const label = `scheme "${name}"`;
    const out = {
      id,
      name,
      isDefault: !!s.isDefault,
      background: requireHex(s.background, `${label} → background`),
      text: requireHex(s.text, `${label} → text`),
      button: requireHex(s.button, `${label} → button`),
      buttonText: requireHex(s.buttonText, `${label} → button text`),
      secondaryButton: requireHex(s.secondaryButton, `${label} → secondary button`),
      link: requireHex(s.link, `${label} → link`),
      accent: requireHex(s.accent, `${label} → accent`),
      // New slots added in the 10-slot expansion. Older saved schemes
      // don't carry these — `clampHex` falls back to the classic platform
      // defaults so old data round-trips cleanly without any migration
      // and the merchant's existing palette stays intact. New writes
      // always include real values (the merchant Theme tab sends all 10).
      headingText: clampHex(s.headingText, PLATFORM_DEFAULT_HEADING_TEXT),
      mutedText: clampHex(s.mutedText, PLATFORM_DEFAULT_MUTED_TEXT),
      border: clampHex(s.border, PLATFORM_DEFAULT_BORDER),
    };
    return out;
  });

  if (schemes.length === 0) {
    return buildDefaultThemeConfig(fallbackPrimary, fallbackSecondary, fallbackAccent, {
      applyBrandAsDefault: forceApply || !!input.applyBrandAsDefault,
    });
  }

  // Exactly one default. If multiple flagged, keep the first; if none, mark first.
  let defaulted = false;
  for (const s of schemes) {
    if (s.isDefault) {
      if (defaulted) s.isDefault = false;
      else defaulted = true;
    }
  }
  if (!defaulted) schemes[0].isDefault = true;

  const validIds = new Set(schemes.map(s => s.id));
  const defaultId = schemes.find(s => s.isDefault).id;

  const assignmentsIn = (input.sectionAssignments && typeof input.sectionAssignments === 'object')
    ? input.sectionAssignments : {};
  const sectionAssignments = {};
  // Always seed every known section so the storefront never sees a blank
  // assignment — falls back to the default scheme.
  for (const sid of SECTION_IDS) {
    const target = assignmentsIn[sid];
    if (target !== undefined) {
      // If a value is provided for a known section, it MUST reference a real
      // scheme. Reject rather than silently swap to default — a 400 surfaces
      // the bug instead of producing a confusing "wrong color" experience.
      if (typeof target !== 'string' || !validIds.has(target)) {
        throw new Error(`sectionAssignments["${sid}"] references unknown scheme id "${target}".`);
      }
      sectionAssignments[sid] = target;
    } else {
      sectionAssignments[sid] = defaultId;
    }
  }
  // Reject any keys that are NOT in SECTION_IDS — a client sending an
  // unknown section id is almost certainly a bug or a tampered payload, and
  // silently persisting them would fill the row with junk over time.
  const knownSet = new Set(SECTION_IDS);
  for (const sid of Object.keys(assignmentsIn)) {
    if (!knownSet.has(sid)) {
      throw new Error(`sectionAssignments contains unknown section id "${sid}".`);
    }
  }

  // Preserve the applyBrandAsDefault flag through round-trips. The PUT
  // path passes forceApplyBrandAsDefault=true so any merchant edit opts
  // the site in; read-time backfill leaves the input value untouched
  // (legacy rows have no flag → stays false → pristine look preserved).
  const applyBrandAsDefault = forceApply || !!input.applyBrandAsDefault;

  return { schemes, sectionAssignments, applyBrandAsDefault };
}

// Read-time backfill: if a site's theme_config is null/empty (legacy row
// from before this feature), synthesize it from primary/secondary/accent so
// the storefront always gets a usable theme.
export function ensureThemeConfig(rawJson, primaryColor, secondaryColor, accentColor) {
  if (rawJson) {
    try {
      const parsed = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
      return normalizeThemeConfig(parsed, primaryColor, secondaryColor, accentColor);
    } catch (e) {
      // Corrupt JSON falls through to default seeding.
    }
  }
  return buildDefaultThemeConfig(primaryColor, secondaryColor, accentColor);
}
