// Section → CSS selector map for the per-section color scheme system.
//
// Each entry describes which CSS selectors inside a section should respond
// to which scheme slot (background, text, button, buttonText, secondaryButton,
// link, accent). SchemeScope reads this map and emits a high-specificity
// `<style>` block scoped via `[data-flomerce-scope="…"]` so the rules beat the
// existing hardcoded `!important` declarations in the storefront stylesheets
// without rewriting any of those files.
//
// Adding a new section: append a new entry. Each slot is a list of selectors.
// Selectors are scoped at runtime by prefixing `[data-flomerce-scope="X"] `.
// Use `&` if you need the wrapper itself (rare).

export const SLOT_KEYS = [
  'background',
  'text',
  'button',
  'buttonText',
  'secondaryButton',
  'link',
  'accent',
];

// Map slot → CSS property + sub-selector that the slot's color should be
// applied to. Each entry is a list of { selectors, property } records.
//
// Special token "&" means the wrapper element itself (the SchemeScope div).
const RULES = {
  'promo-banner': {
    background: [
      { selectors: ['.promo-banner'], property: 'background-color' },
    ],
    text: [
      { selectors: ['.promo-banner', '.promo-banner .banner-text', '.promo-banner p', '.promo-banner span'], property: 'color' },
    ],
  },

  'navbar': {
    background: [
      // Classic template uses .header > .nav-container; modern uses .mn-header
      // > .mn-navbar. Both need their own backgrounds set or the bar stays
      // its hardcoded colour. We also target plain .navbar for any other
      // theme that follows Bootstrap-ish naming.
      { selectors: ['.header', '.nav-container', '.navbar', '.mn-header', '.mn-navbar'], property: 'background-color' },
      { selectors: ['.header', '.nav-container', '.navbar', '.mn-header', '.mn-navbar'], property: 'background' },
    ],
    text: [
      { selectors: [
        '.brand', '.nav-link', '.icon-link',
        '.dropdown-menu a', '.subcategory-toggle', '.grouped-cat-link',
        '.sub-group-toggle', '.sub-group-menu a',
        '.mn-brand', '.mn-brand-text', '.mn-nav-link', '.mn-dropdown-menu li a',
        '.mn-grouped-cat-link', '.mn-subcategory-toggle',
      ], property: 'color' },
    ],
    link: [
      { selectors: [
        '.nav-link:hover', '.icon-link:hover',
        '.dropdown-menu a:hover', '.subcategory-toggle:hover',
        '.grouped-cat-link:hover', '.sub-group-toggle:hover',
        '.sub-group-menu a:hover', '.brand:hover',
        '.mn-nav-link:hover', '.mn-dropdown-menu li a:hover',
      ], property: 'color' },
    ],
    accent: [
      { selectors: ['.cart-count', '.wishlist-count', '.mn-cart-count', '.mn-wishlist-count'], property: 'background-color' },
    ],
  },

  'hero-slider': {
    background: [
      { selectors: ['.hero-slider', '.modern-hero'], property: 'background-color' },
      { selectors: ['.hero-slider', '.modern-hero'], property: 'background' },
    ],
    text: [
      // Classic uses .slide-*; modern HeroSplit uses .modern-hero-tag/-title/-desc.
      { selectors: [
        '.slide-title', '.slide-subtitle', '.slide-description',
        '.modern-hero-title', '.modern-hero-subtitle', '.modern-hero-eyebrow',
        '.modern-hero-tag', '.modern-hero-desc',
      ], property: 'color' },
    ],
    button: [
      { selectors: ['.shop-now-btn', '.modern-hero-btn', '.modern-hero-cta'], property: 'background-color' },
      { selectors: ['.shop-now-btn', '.modern-hero-btn', '.modern-hero-cta'], property: 'background' },
    ],
    buttonText: [
      { selectors: ['.shop-now-btn', '.modern-hero-btn', '.modern-hero-cta'], property: 'color' },
    ],
    secondaryButton: [
      { selectors: ['.modern-hero-cta-secondary'], property: 'border-color' },
      { selectors: ['.modern-hero-cta-secondary'], property: 'color' },
    ],
  },

  'categories': {
    background: [
      // Classic .home-category-section + modern .mn-category-section +
      // modern Choose-By-Category .mn-choose-section.
      { selectors: ['.home-category-section', '.mn-category-section', '.mn-choose-section'], property: 'background-color' },
      { selectors: ['.home-category-section', '.mn-category-section', '.mn-choose-section'], property: 'background' },
    ],
    text: [
      { selectors: [
        '.home-category-section .section-title',
        '.home-category-section .section-subtitle',
        '.mn-category-section .mn-section-title',
        '.mn-category-section .mn-section-subtitle',
        '.mn-category-banner-text',
        '.mn-choose-label', '.mn-choose-name', '.mn-choose-explore',
      ], property: 'color' },
    ],
    button: [
      { selectors: ['.home-category-view-all', '.mn-view-all-link'], property: 'background-color' },
      { selectors: ['.home-category-view-all', '.mn-view-all-link'], property: 'background' },
    ],
    buttonText: [
      { selectors: ['.home-category-view-all', '.mn-view-all-link'], property: 'color' },
    ],
    accent: [
      { selectors: ['.home-category-scroll-arrow:hover', '.mn-category-banner-overlay'], property: 'background-color' },
    ],
  },

  'footer': {
    background: [
      // Classic .footer-minimalist + modern .mn-footer + their bottom bars.
      { selectors: ['.footer-minimalist', '.footer-bottom', '.mn-footer', '.mn-footer-bottom'], property: 'background-color' },
      { selectors: ['.footer-minimalist', '.footer-bottom', '.mn-footer', '.mn-footer-bottom'], property: 'background' },
    ],
    text: [
      { selectors: [
        '.footer-minimalist',
        '.footer-toggle', '.footer-title',
        '.footer-content ul li a',
        '.footer-bottom', '.footer-copyright',
        '.footer-links a',
        '.mn-footer', '.mn-footer-heading', '.mn-footer-address',
        '.mn-footer-contact-link', '.mn-footer-col-title',
        '.mn-footer-links a', '.mn-footer-bottom',
      ], property: 'color' },
    ],
    link: [
      { selectors: [
        '.footer-content ul li a:hover',
        '.footer-links a:hover',
        '.powered-by-link',
        '.mn-footer a:hover', '.mn-footer-links a:hover',
      ], property: 'color' },
    ],
    accent: [
      { selectors: ['.social-icon-link:hover', '.mn-footer-social a:hover'], property: 'background-color' },
    ],
  },

  'featured-video': {
    background: [
      { selectors: ['.fv-section'], property: 'background-color' },
    ],
    text: [
      { selectors: ['.fv-title', '.fv-subtitle', '.fv-description'], property: 'color' },
    ],
    button: [
      { selectors: ['.fv-chat-btn'], property: 'background-color' },
      { selectors: ['.fv-chat-btn'], property: 'background' },
    ],
    buttonText: [
      { selectors: ['.fv-chat-btn'], property: 'color' },
    ],
  },

  'customer-reviews': {
    background: [
      { selectors: ['.customer-reviews-section', '.mn-customer-reviews'], property: 'background-color' },
      { selectors: ['.customer-reviews-section', '.mn-customer-reviews'], property: 'background' },
    ],
    text: [
      { selectors: [
        '.customer-reviews-section .section-title',
        '.customer-reviews-section .section-subtitle',
        '.review-text',
        '.review-author',
        '.mn-customer-reviews-title',
        '.mn-customer-reviews-subtitle',
        '.mn-customer-review-text',
        '.mn-customer-review-author',
      ], property: 'color' },
    ],
    button: [
      { selectors: ['.reviews-cta .chat-now-btn', '.mn-customer-reviews-cta-btn'], property: 'background-color' },
      { selectors: ['.reviews-cta .chat-now-btn', '.mn-customer-reviews-cta-btn'], property: 'background' },
    ],
    buttonText: [
      { selectors: ['.reviews-cta .chat-now-btn', '.mn-customer-reviews-cta-btn'], property: 'color' },
    ],
    accent: [
      { selectors: ['.reviews-scroll-arrow:hover', '.review-stars', '.mn-customer-review-stars'], property: 'color' },
    ],
  },

  'shop-the-look': {
    background: [
      { selectors: ['.stl-section'], property: 'background-color' },
      { selectors: ['.stl-section'], property: 'background' },
    ],
    text: [
      { selectors: [
        '.stl-header .section-title', '.stl-header h2',
        '.stl-product-name', '.stl-product-price',
      ], property: 'color' },
    ],
    button: [
      { selectors: ['.stl-popup-view-btn'], property: 'background-color' },
      { selectors: ['.stl-popup-view-btn'], property: 'background' },
    ],
    buttonText: [
      { selectors: ['.stl-popup-view-btn'], property: 'color' },
    ],
  },

  'showcase': {
    background: [
      { selectors: ['.product-showcase-section'], property: 'background-color' },
      { selectors: ['.product-showcase-section'], property: 'background' },
    ],
    text: [
      { selectors: ['.product-showcase-section .section-title', '.popup-product-name'], property: 'color' },
    ],
    button: [
      { selectors: ['.add-set-to-bag-btn', '.popup-add-to-cart-btn'], property: 'background-color' },
      { selectors: ['.add-set-to-bag-btn', '.popup-add-to-cart-btn'], property: 'background' },
    ],
    buttonText: [
      { selectors: ['.add-set-to-bag-btn', '.popup-add-to-cart-btn'], property: 'color' },
    ],
  },

  'welcome-banner': {
    background: [
      { selectors: ['.first-visit-modal-content'], property: 'background-color' },
      { selectors: ['.first-visit-modal-content'], property: 'background' },
    ],
    text: [
      { selectors: ['.first-visit-banner-text', '.first-visit-banner-text h2', '.first-visit-banner-text p'], property: 'color' },
    ],
    button: [
      { selectors: ['.first-visit-cta-button'], property: 'background-color' },
      { selectors: ['.first-visit-cta-button'], property: 'background' },
    ],
    buttonText: [
      { selectors: ['.first-visit-cta-button'], property: 'color' },
    ],
  },

  'brand-story': {
    background: [
      { selectors: ['.mn-brand-section'], property: 'background-color' },
      { selectors: ['.mn-brand-section'], property: 'background' },
    ],
    text: [
      { selectors: [
        '.mn-brand-label', '.mn-brand-headline', '.mn-brand-body',
      ], property: 'color' },
    ],
    button: [
      { selectors: ['.mn-brand-cta'], property: 'background-color' },
      { selectors: ['.mn-brand-cta'], property: 'background' },
    ],
    buttonText: [
      { selectors: ['.mn-brand-cta'], property: 'color' },
    ],
  },

  'trending-now': {
    background: [
      { selectors: ['.mn-trending-section'], property: 'background-color' },
      { selectors: ['.mn-trending-section'], property: 'background' },
    ],
    text: [
      { selectors: [
        '.mn-trending-section .mn-section-title',
        '.mn-trending-section .mn-section-subtitle',
        '.mn-trending-name', '.mn-trending-price',
      ], property: 'color' },
    ],
    accent: [
      { selectors: ['.mn-trending-arrow:hover'], property: 'background-color' },
    ],
  },

  'watchbuy': {
    background: [
      { selectors: ['.wb-section'], property: 'background-color' },
      { selectors: ['.wb-section'], property: 'background' },
    ],
    text: [
      { selectors: [
        '.wb-title', '.wb-product-name', '.wb-product-price', '.wb-product-sku',
      ], property: 'color' },
    ],
  },

  'store-locations': {
    background: [
      { selectors: ['.store-locations-section'], property: 'background-color' },
      { selectors: ['.store-locations-section'], property: 'background' },
    ],
    text: [
      // Card text classes each set their own color in locations.css, so we
      // must list them explicitly — recoloring just .store-card alone has
      // no visible effect because the children win on cascade.
      { selectors: [
        '.store-locations-header h2',
        '.store-locations-header p',
        '.store-card',
        '.store-name', '.store-address', '.store-hours', '.store-phone',
      ], property: 'color' },
    ],
  },
};

// Slots that each section actually uses (drives the per-section override UI).
// Computed from RULES so we don't drift.
export const SECTION_SLOTS = Object.fromEntries(
  Object.entries(RULES).map(([sectionId, slotMap]) => [sectionId, Object.keys(slotMap)])
);

// Human-readable labels for the override UI.
export const SLOT_LABELS = {
  background: 'Background',
  text: 'Text',
  button: 'Button',
  buttonText: 'Button text',
  secondaryButton: 'Secondary button',
  link: 'Link / hover',
  accent: 'Accent',
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

// Returns the merged effective colors for a section: scheme as base, overrides
// take precedence per-slot. Both args may be partial.
export function resolveSectionColors(scheme, overrides) {
  const out = {};
  if (scheme) {
    for (const k of SLOT_KEYS) if (scheme[k]) out[k] = scheme[k];
  }
  if (overrides) {
    for (const k of SLOT_KEYS) {
      if (overrides[k] && HEX_RE.test(overrides[k])) out[k] = overrides[k];
    }
  }
  return out;
}

// Build a scoped CSS string for a single section instance.
// scopeId: a unique id (data-flomerce-scope="…"); selectors are prefixed with
//   `[data-flomerce-scope="scopeId"]` to (a) raise specificity above the
//   existing class selectors with !important, and (b) keep one section's rules
//   from leaking into another.
export function buildScopedCSS(scopeId, sectionId, scheme, overrides) {
  const slotMap = RULES[sectionId];
  if (!slotMap) return '';
  const colors = resolveSectionColors(scheme, overrides);
  const lines = [];
  const prefix = `[data-flomerce-scope="${scopeId}"]`;
  for (const slotKey of Object.keys(slotMap)) {
    const color = colors[slotKey];
    if (!color) continue;
    for (const rule of slotMap[slotKey]) {
      const selectorList = rule.selectors
        .map(sel => sel === '&' ? prefix : `${prefix} ${sel}`)
        .join(', ');
      lines.push(`${selectorList} { ${rule.property}: ${color} !important; }`);
    }
  }
  return lines.join('\n');
}

export function getSectionSlotsUsed(sectionId) {
  return SECTION_SLOTS[sectionId] || [];
}
