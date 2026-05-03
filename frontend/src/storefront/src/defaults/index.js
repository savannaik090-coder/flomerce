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
