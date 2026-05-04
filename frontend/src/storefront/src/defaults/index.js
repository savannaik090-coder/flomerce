import * as generic from './generic.js';

const POLICY_KEYS = [
  'shippingRegions', 'shippingCharges', 'shippingDeliveryTime', 'shippingTracking',
  'returnPolicy', 'returnReplacements', 'returnMandatory',
  'careGuideWashing', 'careGuideCleaning', 'careGuideMaintenance',
];

function buildPolicyMap(_category, kind) {
  const out = {};
  for (const key of POLICY_KEYS) {
    out[key] = generic[kind]?.[key] || '';
  }
  return out;
}

export function getPolicies(category) {
  return buildPolicyMap(category, 'policies');
}

export function getPolicyPlaceholders(category) {
  return buildPolicyMap(category, 'policyPlaceholders');
}

export function getAboutPageDefaults(_category) {
  const fallback = generic.aboutPage;
  return {
    heroSubtitle: fallback.heroSubtitle,
    storyText: fallback.storyText,
    sections: fallback.sections,
  };
}

export function getFeaturedVideoDefaults(_category) {
  return generic.featuredVideo;
}

export function getFeaturedVideoPlaceholders(_category) {
  return generic.featuredVideoPlaceholders;
}

export function getWatchAndBuyDefaults(_category) {
  const baseTitles = generic.watchAndBuyDefaults.map(d => d.title);
  return baseTitles.slice(0, 6).map((title, i) => ({
    id: `default-${i + 1}`,
    title,
    productSku: '',
    videoUrl: '',
  }));
}

export function getHeroSliderDefaults(_category) {
  return generic.heroSliderDefaults;
}

// About Us style defaults — these reproduce today's Classic and Modern
// looks exactly. Each field corresponds to a CSS variable injected on the
// .about-page wrapper so the storefront page picks up merchant overrides
// without changing existing markup.
export const ABOUT_CLASSIC_STYLE_DEFAULTS = Object.freeze({
  pageBg: '#ffffff',
  heroBg: '#ffffff',
  heroTitleColor: '#1a1a2e',
  heroSubtitleColor: '#777777',
  storyBg: '#ffffff',
  storyHeadingColor: '#d4af37',
  storyBodyColor: '#555555',
  sectionHeadingColor: '#1a1a2e',
  sectionBodyColor: '#555555',
  headingFont: "'Playfair Display', Georgia, serif",
  bodyFont: "'Poppins', sans-serif",
});

export const ABOUT_MODERN_STYLE_DEFAULTS = Object.freeze({
  pageBg: '#ffffff',
  heroBg: '#ffffff',
  heroTitleColor: '#111111',
  heroSubtitleColor: '#666666',
  storyBg: '#ffffff',
  storyHeadingColor: '#888888',
  storyBodyColor: '#555555',
  sectionHeadingColor: '#111111',
  sectionBodyColor: '#555555',
  headingFont: "'Inter', 'Helvetica Neue', sans-serif",
  bodyFont: "'Inter', sans-serif",
  accentColor: '#111111',
  storyCardBg: '#f5f5f5',
});

export function getAboutClassicStyleDefaults() { return { ...ABOUT_CLASSIC_STYLE_DEFAULTS }; }
export function getAboutModernStyleDefaults() { return { ...ABOUT_MODERN_STYLE_DEFAULTS }; }

// Blog style defaults — captured from the existing blog.css rules so that
// merchants who haven't customized anything render exactly as today. Each
// field maps to a CSS variable injected on the .blog-list-page /
// .blog-post-page wrapper.
export const BLOG_CLASSIC_STYLE_DEFAULTS = Object.freeze({
  pageBg: '#ffffff',
  pageHeadingFont: 'inherit',
  pageHeadingSize: '2rem',
  pageHeadingWeight: '700',
  pageHeadingColor: '#0f172a',
  subtitleColor: '#64748b',
  postTitleFont: 'inherit',
  postTitleSize: '1.125rem',
  postTitleWeight: '600',
  postTitleColor: '#0f172a',
  excerptFont: 'inherit',
  excerptSize: '0.875rem',
  excerptColor: '#64748b',
  metaColor: '#94a3b8',
  dividerColor: '#e5e7eb',
  linkColor: '#0f172a',
  cardBg: '#ffffff',
  postContentColor: '#1e293b',
});

export const BLOG_MODERN_STYLE_DEFAULTS = Object.freeze({
  pageBg: '#ffffff',
  pageHeadingFont: 'inherit',
  pageHeadingSize: '2rem',
  pageHeadingWeight: '700',
  pageHeadingColor: '#0f172a',
  subtitleColor: '#64748b',
  postTitleFont: 'inherit',
  postTitleSize: '1.125rem',
  postTitleWeight: '600',
  postTitleColor: '#0f172a',
  excerptFont: 'inherit',
  excerptSize: '0.875rem',
  excerptColor: '#64748b',
  metaColor: '#94a3b8',
  dividerColor: '#e5e7eb',
  linkColor: '#0f172a',
  cardBg: '#ffffff',
  cardShadowColor: 'rgba(0, 0, 0, 0.08)',
  postContentColor: '#1e293b',
});

export function getBlogClassicStyleDefaults() { return { ...BLOG_CLASSIC_STYLE_DEFAULTS }; }
export function getBlogModernStyleDefaults() { return { ...BLOG_MODERN_STYLE_DEFAULTS }; }

// Contact Us style defaults — reproduce today's Classic and Modern looks
// exactly. Classic values come from the inline <style> in ClassicContactPage;
// Modern values come from the .mn-contact-* rules in modern.css. Keys are
// consumed by ContactPage to build CSS variables / interpolate into styles.
export const CONTACT_CLASSIC_STYLE_DEFAULTS = Object.freeze({
  pageBg: '#ffffff',
  headingFont: "'Playfair Display', Georgia, serif",
  headingColor: '#5E2900',
  bodyFont: "'Poppins', sans-serif",
  bodyColor: '#444444',
  accentColor: '#d4af37',
  infoCardBg: '#f9f5f0',
});

export const CONTACT_MODERN_STYLE_DEFAULTS = Object.freeze({
  pageBg: '#ffffff',
  headingFont: "'Inter', 'Helvetica Neue', sans-serif",
  headingColor: '#111111',
  bodyFont: "'Inter', sans-serif",
  bodyColor: '#666666',
  accentColor: '#111111',
  formBorderColor: '#dddddd',
});

export function getContactClassicStyleDefaults() { return { ...CONTACT_CLASSIC_STYLE_DEFAULTS }; }
export function getContactModernStyleDefaults() { return { ...CONTACT_MODERN_STYLE_DEFAULTS }; }

// Product Detail Page (PDP) style defaults — these reproduce today's Classic
// (pdp-layout-sticky) and Modern (modern-theme + pdp-layout-sticky) looks
// exactly. Each key maps to a CSS variable consumed by product-detail.css
// and modern.css through `buildProductPageStyleVars`. Keys are intentionally
// shared between templates so the admin UI and CSS layer can use the same
// shape — only the default values differ.
export const PRODUCT_CLASSIC_STYLE_DEFAULTS = Object.freeze({
  pageBg: '#faf6ef',
  titleColor: '#603000',
  titleFont: "'Lora', Georgia, serif",
  shortDescColor: '#475569',
  bodyFont: "'Lora', Georgia, serif",
  priceColor: '#2a2520',
  priceFont: "'Lora', Georgia, serif",
  mrpColor: '#6b5b48',
  discountBadgeBg: '#dcfce7',
  discountBadgeText: '#166534',
  chipBorderColor: 'rgba(96, 48, 0, 0.20)',
  chipSelectedBg: '#603000',
  chipSelectedText: '#ffffff',
  buyNowBg: '#c8b99a',
  buyNowText: '#2a2520',
  addToCartBg: 'transparent',
  addToCartText: '#603000',
  addToCartBorder: '#603000',
  wishlistIconColor: '#6b5b48',
  trustBadgesBg: 'rgba(255, 255, 255, 0.6)',
  trustBadgesIconColor: '#603000',
  trustBadgesTextColor: '#4a3d2f',
  specsBg: '#ffffff',
  specsHeadingColor: '#603000',
  specsLabelColor: '#6b5b48',
  specsValueColor: '#2a2520',
  tagChipBg: '#f1f5f9',
  tagChipText: '#475569',
  relatedHeadingColor: '#333333',
  inStockColor: '#4a6926',
  outOfStockColor: '#b04a3c',
  buttonFont: "'Lora', Georgia, serif",
});

export const PRODUCT_MODERN_STYLE_DEFAULTS = Object.freeze({
  pageBg: '#faf6ef',
  titleColor: '#111111',
  titleFont: "'Inter', 'Helvetica Neue', sans-serif",
  shortDescColor: '#475569',
  bodyFont: "'Lora', Georgia, serif",
  priceColor: '#111111',
  priceFont: "'Inter', sans-serif",
  mrpColor: '#6b5b48',
  discountBadgeBg: '#dcfce7',
  discountBadgeText: '#166534',
  chipBorderColor: 'rgba(96, 48, 0, 0.20)',
  chipSelectedBg: '#111111',
  chipSelectedText: '#ffffff',
  buyNowBg: '#ffffff',
  buyNowText: '#111111',
  addToCartBg: '#111111',
  addToCartText: '#ffffff',
  addToCartBorder: '#111111',
  wishlistIconColor: '#6b5b48',
  trustBadgesBg: 'rgba(255, 255, 255, 0.6)',
  trustBadgesIconColor: '#603000',
  trustBadgesTextColor: '#4a3d2f',
  specsBg: '#ffffff',
  specsHeadingColor: '#603000',
  specsLabelColor: '#6b5b48',
  specsValueColor: '#2a2520',
  tagChipBg: '#f1f5f9',
  tagChipText: '#475569',
  relatedHeadingColor: '#333333',
  inStockColor: '#4a6926',
  outOfStockColor: '#b04a3c',
  buttonFont: "'Inter', sans-serif",
});

export function getProductClassicStyleDefaults() { return { ...PRODUCT_CLASSIC_STYLE_DEFAULTS }; }
export function getProductModernStyleDefaults() { return { ...PRODUCT_MODERN_STYLE_DEFAULTS }; }

// Book Appointment style defaults — Classic values reproduce today's
// hardcoded warm/serif look (Playfair Display + #9c7c38 accent + #333 text).
// Modern values match the Modern template's baseline (Inter + neutral palette)
// and are consumed by the .mn-appointment-* CSS variables in modern.css.
export const APPOINTMENT_CLASSIC_STYLE_DEFAULTS = Object.freeze({
  pageBg: '#ffffff',
  headingFont: "'Playfair Display', serif",
  headingColor: '#333333',
  bodyFont: "'Lato', sans-serif",
  bodyColor: '#333333',
  accentColor: '#9c7c38',
});

export const APPOINTMENT_MODERN_STYLE_DEFAULTS = Object.freeze({
  pageBg: '#ffffff',
  headingFont: "'Inter', 'Helvetica Neue', sans-serif",
  headingColor: '#111111',
  bodyFont: "'Inter', sans-serif",
  bodyColor: '#444444',
  accentColor: '#111111',
});

export function getAppointmentClassicStyleDefaults() { return { ...APPOINTMENT_CLASSIC_STYLE_DEFAULTS }; }
export function getAppointmentModernStyleDefaults() { return { ...APPOINTMENT_MODERN_STYLE_DEFAULTS }; }

// FAQ page style defaults — captured from the existing faq.css rules so
// merchants who haven't customized anything render exactly as today. Each
// field maps to a CSS variable consumed by faq.css through `buildFaqStyleVars`
// applied on the .faq-page wrapper. Classic and Modern keep separate values
// so editing one template never affects the other.
export const FAQ_CLASSIC_STYLE_DEFAULTS = Object.freeze({
  pageBg: 'transparent',
  headingFont: 'inherit',
  headingSize: '2rem',
  headingWeight: '700',
  headingColor: '#0f172a',
  subtitleColor: '#64748b',
  questionFont: 'inherit',
  questionSize: '1.0625rem',
  questionWeight: '600',
  questionColor: '#0f172a',
  answerFont: 'inherit',
  answerSize: '0.9375rem',
  answerColor: '#475569',
  dividerColor: '#e5e7eb',
  accentColor: '#0f172a',
});

export const FAQ_MODERN_STYLE_DEFAULTS = Object.freeze({
  pageBg: 'transparent',
  headingFont: 'inherit',
  headingSize: '2rem',
  headingWeight: '700',
  headingColor: '#0f172a',
  subtitleColor: '#64748b',
  questionFont: 'inherit',
  questionSize: '1.0625rem',
  questionWeight: '600',
  questionColor: '#0f172a',
  answerFont: 'inherit',
  answerSize: '0.9375rem',
  answerColor: '#475569',
  cardBg: 'transparent',
  cardBorderColor: '#e5e7eb',
  accentColor: '#0f172a',
});

export function getFaqClassicStyleDefaults() { return { ...FAQ_CLASSIC_STYLE_DEFAULTS }; }
export function getFaqModernStyleDefaults() { return { ...FAQ_MODERN_STYLE_DEFAULTS }; }

// Storefront Category page (/category/:slug) style defaults — these
// reproduce today's hardcoded look exactly. Classic values come from the
// `.category-page:not(.modern-theme)` rules in styles/category.css; Modern
// values come from the `.modern-theme.category-page` rules in modern.css and
// the `.modern-theme .subcategory-chip*` rules in category.css. Each key
// maps to a `--cat-page-*` (Classic) or `--mn-cat-page-*` (Modern) CSS
// variable injected by SiteContext, with the same value used as the CSS
// fallback so an unset key renders pixel-identical to today.
export const CATEGORY_PAGE_CLASSIC_STYLE_DEFAULTS = Object.freeze({
  pageBg: '#fbf8f3',
  heroTitleColor: '#ffffff',
  // CSS fallback is var(--font-heading) — theme-dependent. Leave blank so the
  // picker doesn't claim a specific stack the live page may not actually use.
  heroTitleFont: '',
  heroTitleSize: '60',
  heroTitleWeight: '400',
  heroSubtitleColor: '#ffffff',
  heroSubtitleFont: "'Lora', 'Playfair Display', Georgia, serif",
  heroSubtitleSize: '18',
  heroSubtitleItalic: true,
  // Classic hero overlay is a 3-stop black gradient (rgba 0.2 → 0.3 → 0.6)
  // by default, not a flat color. We expose flat color + opacity controls
  // so merchants can override with a single tone, but leave the placeholder
  // empty so the form doesn't misrepresent the current gradient look.
  heroOverlayColor: '',
  heroOverlayOpacity: '',
  chipStripBg: '#fbf8f3',
  chipStripBorderColor: '#ebe2d3',
  chipBg: '#ffffff',
  chipBorderColor: '#e0d6c2',
  chipTextColor: '#603000',
  // CSS fallback is var(--font-primary) — theme-dependent system stack.
  chipFont: '',
  chipActiveBg: '#603000',
  chipActiveTextColor: '#ffffff',
  chipActiveBorderColor: '#603000',
  filterStripBg: '#fbf8f3',
  filterStripBorderColor: '#ebe2d3',
  filterStripTextColor: '#603000',
  filterStripFont: '',
  productCountColor: '#888888',
  productCountFont: '',
});

export const CATEGORY_PAGE_MODERN_STYLE_DEFAULTS = Object.freeze({
  pageBg: '#ffffff',
  heroTitleColor: '#ffffff',
  heroTitleFont: "'Inter', 'Helvetica Neue', sans-serif",
  // Modern hero title size is responsive by default — clamp(2rem, 5vw, 3.5rem).
  // Empty placeholder so the form doesn't misrepresent it as a fixed value.
  heroTitleSize: '',
  heroTitleWeight: '800',
  heroSubtitleColor: '#ffffff',
  heroSubtitleFont: "'Inter', sans-serif",
  // CSS fallback is 1.05rem (~16.8px). Empty so the form doesn't claim 17px.
  heroSubtitleSize: '',
  heroOverlayColor: '#000000',
  heroOverlayOpacity: '0.35',
  chipStripBg: '#ffffff',
  chipStripBorderColor: '#efefef',
  chipBg: '#ffffff',
  chipBorderColor: '#e5e5e5',
  chipTextColor: '#1a1a1a',
  chipFont: "'Inter', sans-serif",
  chipActiveBg: '#1a1a1a',
  chipActiveTextColor: '#ffffff',
  chipActiveBorderColor: '#1a1a1a',
  // Modern .shop-filter-header is dark by default (#111). Defaults must
  // mirror that so the merchant sees the actual current look as a hint.
  filterStripBg: '#111111',
  // CSS fallback is transparent (no visible border) — leave blank so the
  // form doesn't claim a colored border that isn't actually rendered.
  filterStripBorderColor: '',
  filterStripTextColor: '#ffffff',
  filterStripFont: "'Inter', sans-serif",
  productCountColor: '#888888',
  productCountFont: "'Inter', sans-serif",
});

export function getCategoryPageClassicStyleDefaults() { return { ...CATEGORY_PAGE_CLASSIC_STYLE_DEFAULTS }; }
export function getCategoryPageModernStyleDefaults() { return { ...CATEGORY_PAGE_MODERN_STYLE_DEFAULTS }; }

export function getAboutPageWithBrand(_category, brandName) {
  const name = brandName || 'Our Store';
  const fallback = generic.aboutPage;
  return {
    heroSubtitle: fallback.heroSubtitle,
    storyText: String(fallback.storyText).replace(/\{\{brandName\}\}/g, name).replace(/\{brandName\}/g, name),
    storyImage: '',
    sections: [
      {
        heading: 'Our Mission',
        text: String(fallback.sections[0].text).replace(/\{\{brandName\}\}/g, name).replace(/\{brandName\}/g, name),
        visible: true,
      },
    ],
    // Per-template style overrides — empty by default so AboutPage.jsx
    // falls back to ABOUT_*_STYLE_DEFAULTS at read time. Merchant edits
    // populate these objects on save.
    classicStyle: {},
    modernStyle: {},
  };
}

function applyContactPlaceholders(text, brand, email, phone) {
  const phoneClause = phone ? ` or ${phone}` : '';
  return String(text)
    .replace(/\{brand\}/g, brand)
    .replace(/\{\{brand\}\}/g, brand)
    .replace(/\{email\}/g, email)
    .replace(/\{\{email\}\}/g, email)
    .replace(/\{phoneClause\}/g, phoneClause)
    .replace(/\{\{phoneClause\}\}/g, phoneClause)
    .replace(/\{phone\}/g, phone)
    .replace(/\{\{phone\}\}/g, phone);
}

export function getTermsDefaults(brand, email, phone) {
  const b = brand || 'Our Store';
  const e = email || 'support@example.com';
  const p = phone || '';
  return {
    intro: applyContactPlaceholders(generic.termsIntro, b, e, p),
    sections: generic.termsSections.map(s => ({
      title: applyContactPlaceholders(s.title, b, e, p),
      content: applyContactPlaceholders(s.content, b, e, p),
    })),
  };
}

export function getPrivacyDefaults(brand, email, phone) {
  const b = brand || 'Our Store';
  const e = email || 'support@example.com';
  const p = phone || '';
  return {
    intro: applyContactPlaceholders(generic.privacyIntro, b, e, p),
    sections: generic.privacySections.map(s => ({
      title: applyContactPlaceholders(s.title, b, e, p),
      content: applyContactPlaceholders(s.content, b, e, p),
    })),
  };
}

export function getOrderActionNotes() {
  return generic.orderActionNotes;
}

export function getShopTheLookDefaults(_category) {
  return generic.shopTheLookDefaults;
}

export function getDefaultReviews(_category) {
  return generic.defaultReviews;
}

export function getTrendingProductsDefaults(_category) {
  return generic.trendingProductsDefaults;
}

export function getDemoCategoriesDefaults(_category) {
  return generic.demoCategoriesDefaults;
}

export function getDemoProductsForCategory(category, categoryName) {
  const products = getTrendingProductsDefaults(category);
  return products.slice(0, 6).map((p, i) => ({
    ...p,
    id: `${p.id}-${(categoryName || 'cat').toLowerCase().replace(/\s+/g, '-')}-${i}`,
  }));
}
