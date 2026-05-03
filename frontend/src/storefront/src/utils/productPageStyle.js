import {
  PRODUCT_CLASSIC_STYLE_DEFAULTS,
  PRODUCT_MODERN_STYLE_DEFAULTS,
} from '../defaults/index.js';

export function getProductPageStyleDefaults(isModern) {
  return isModern ? PRODUCT_MODERN_STYLE_DEFAULTS : PRODUCT_CLASSIC_STYLE_DEFAULTS;
}

// Returns ONLY the merchant-supplied overrides for the active template.
// We deliberately do not merge in defaults so that the per-selector CSS
// `var(--pdp-X, fallback)` rules keep their existing fallbacks for any
// field the merchant hasn't customized — this preserves pixel-equivalent
// rendering on uncustomized stores.
export function resolveProductPageStyle(productPage, isModern) {
  const saved = productPage && (isModern ? productPage.modernStyle : productPage.classicStyle);
  return (saved && typeof saved === 'object') ? saved : {};
}

const VAR_MAP = {
  pageBg: '--pdp-page-bg',
  titleColor: '--pdp-title-color',
  titleFont: '--pdp-title-font',
  shortDescColor: '--pdp-short-desc-color',
  bodyFont: '--pdp-body-font',
  priceColor: '--pdp-price-color',
  priceFont: '--pdp-price-font',
  mrpColor: '--pdp-mrp-color',
  discountBadgeBg: '--pdp-discount-bg',
  discountBadgeText: '--pdp-discount-text',
  chipBorderColor: '--pdp-chip-border',
  chipSelectedBg: '--pdp-chip-selected-bg',
  chipSelectedText: '--pdp-chip-selected-text',
  buyNowBg: '--pdp-buy-now-bg',
  buyNowText: '--pdp-buy-now-text',
  addToCartBg: '--pdp-add-cart-bg',
  addToCartText: '--pdp-add-cart-text',
  addToCartBorder: '--pdp-add-cart-border',
  wishlistIconColor: '--pdp-wishlist-color',
  trustBadgesBg: '--pdp-trust-bg',
  trustBadgesIconColor: '--pdp-trust-icon',
  trustBadgesTextColor: '--pdp-trust-text',
  specsBg: '--pdp-specs-bg',
  specsHeadingColor: '--pdp-specs-heading-color',
  specsLabelColor: '--pdp-specs-label-color',
  specsValueColor: '--pdp-specs-value-color',
  tagChipBg: '--pdp-tag-chip-bg',
  tagChipText: '--pdp-tag-chip-text',
  relatedHeadingColor: '--pdp-related-heading-color',
  inStockColor: '--pdp-in-stock-color',
  outOfStockColor: '--pdp-out-stock-color',
  buttonFont: '--pdp-button-font',
};

// Only emit a CSS variable when the merchant has explicitly set a value.
// Unset keys leave product-detail.css / modern.css per-selector fallbacks
// in effect, so an uncustomized PDP renders pixel-equivalent to before.
export function buildProductPageStyleVars(saved) {
  const vars = {};
  if (!saved || typeof saved !== 'object') return vars;
  for (const [key, cssVar] of Object.entries(VAR_MAP)) {
    const v = saved[key];
    if (v !== undefined && v !== null && v !== '') vars[cssVar] = v;
  }
  return vars;
}
