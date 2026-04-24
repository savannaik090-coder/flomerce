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
