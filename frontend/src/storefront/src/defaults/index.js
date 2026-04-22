import i18n from '../../../shared/i18n/init.js';
import * as generic from './generic.js';

const POLICY_KEYS = [
  'shippingRegions', 'shippingCharges', 'shippingDeliveryTime', 'shippingTracking',
  'returnPolicy', 'returnReplacements', 'returnMandatory',
  'careGuideWashing', 'careGuideCleaning', 'careGuideMaintenance',
];

function tDefaults(key, fallback, opts) {
  return i18n.t(`storefront:defaults.${key}`, { defaultValue: fallback, ...(opts || {}) });
}

function tDefaultsWithCategory(category, sub, fallback, opts) {
  if (category && ['jewellery', 'clothing', 'beauty'].includes(category)) {
    const v = i18n.t(`storefront:defaults.${category}.${sub}`, {
      defaultValue: '__missing__',
      ...(opts || {}),
    });
    if (v !== '__missing__') return v;
  }
  return tDefaults(sub, fallback, opts);
}

function tCategoryArray(category, sub, fallbackArray) {
  if (category && ['jewellery', 'clothing', 'beauty'].includes(category)) {
    const v = i18n.t(`storefront:defaults.${category}.${sub}`, { returnObjects: true, defaultValue: null });
    if (Array.isArray(v) && v.length) return v;
  }
  const v = i18n.t(`storefront:defaults.${sub}`, { returnObjects: true, defaultValue: null });
  return Array.isArray(v) && v.length ? v : fallbackArray;
}

function tCategoryObject(category, sub, fallbackObj, opts) {
  if (category && ['jewellery', 'clothing', 'beauty'].includes(category)) {
    const v = i18n.t(`storefront:defaults.${category}.${sub}`, { returnObjects: true, defaultValue: null, ...(opts || {}) });
    if (v && typeof v === 'object') return v;
  }
  const v = i18n.t(`storefront:defaults.${sub}`, { returnObjects: true, defaultValue: null, ...(opts || {}) });
  return v && typeof v === 'object' ? v : fallbackObj;
}

function buildPolicyMap(category, kind) {
  const out = {};
  for (const key of POLICY_KEYS) {
    out[key] = tDefaultsWithCategory(category, `${kind}.${key}`, generic[kind]?.[key] || '');
  }
  return out;
}

export function getPolicies(category) {
  return buildPolicyMap(category, 'policies');
}

export function getPolicyPlaceholders(category) {
  return buildPolicyMap(category, 'policyPlaceholders');
}

export function getAboutPageDefaults(category) {
  const fallback = generic.aboutPage;
  const heroSubtitle = tDefaultsWithCategory(category, 'aboutPage.heroSubtitle', fallback.heroSubtitle);
  return {
    heroSubtitle,
    storyText: fallback.storyText,
    sections: fallback.sections,
  };
}

export function getFeaturedVideoDefaults(category) {
  return tCategoryObject(category, 'featuredVideo', generic.featuredVideo);
}

export function getFeaturedVideoPlaceholders(category) {
  return tCategoryObject(category, 'featuredVideoPlaceholders', generic.featuredVideoPlaceholders);
}

export function getWatchAndBuyDefaults(category) {
  const titles = tCategoryArray(category, 'watchAndBuy', null);
  const baseTitles = titles || generic.watchAndBuyDefaults.map(d => d.title);
  return baseTitles.slice(0, 6).map((title, i) => ({
    id: `default-${i + 1}`,
    title,
    productSku: '',
    videoUrl: '',
  }));
}

export function getHeroSliderDefaults(category) {
  const fallback = generic.heroSliderDefaults;
  const slides = tCategoryArray(category, 'heroSlider', null);
  if (!slides) return fallback;
  return slides.map((s, i) => ({
    title: s.title,
    subtitle: s.subtitle,
    description: s.description,
    buttonText: s.buttonText,
    buttonLink: fallback[i]?.buttonLink || '/category/all',
    visible: true,
  }));
}

export function getAboutPageWithBrand(category, brandName) {
  const name = brandName || 'Our Store';
  const heroSubtitle = tDefaultsWithCategory(category, 'aboutPage.heroSubtitle', generic.aboutPage.heroSubtitle);
  const storyText = tDefaultsWithCategory(category, 'aboutPage.storyText', generic.aboutPage.storyText, { brandName: name });
  const missionHeading = tDefaultsWithCategory(category, 'aboutPage.missionHeading', 'Our Mission');
  const missionText = tDefaultsWithCategory(category, 'aboutPage.missionText', generic.aboutPage.sections[0].text, { brandName: name });
  return {
    heroSubtitle,
    storyText,
    storyImage: '',
    sections: [
      { heading: missionHeading, text: missionText, visible: true },
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
  const intro = i18n.t('storefront:defaults.termsIntro', { defaultValue: generic.termsIntro, brand: b });
  const sections = i18n.t('storefront:defaults.termsSections', { returnObjects: true, defaultValue: generic.termsSections });
  const arr = Array.isArray(sections) ? sections : generic.termsSections;
  return {
    intro: applyContactPlaceholders(intro, b, e, p),
    sections: arr.map(s => ({
      title: applyContactPlaceholders(s.title, b, e, p),
      content: applyContactPlaceholders(s.content, b, e, p),
    })),
  };
}

export function getPrivacyDefaults(brand, email, phone) {
  const b = brand || 'Our Store';
  const e = email || 'support@example.com';
  const p = phone || '';
  const intro = i18n.t('storefront:defaults.privacyIntro', { defaultValue: generic.privacyIntro });
  const sections = i18n.t('storefront:defaults.privacySections', { returnObjects: true, defaultValue: generic.privacySections });
  const arr = Array.isArray(sections) ? sections : generic.privacySections;
  return {
    intro: applyContactPlaceholders(intro, b, e, p),
    sections: arr.map(s => ({
      title: applyContactPlaceholders(s.title, b, e, p),
      content: applyContactPlaceholders(s.content, b, e, p),
    })),
  };
}

export function getOrderActionNotes() {
  const obj = i18n.t('storefront:defaults.orderActionNotes', { returnObjects: true, defaultValue: generic.orderActionNotes });
  return obj && typeof obj === 'object' ? obj : generic.orderActionNotes;
}

export function getShopTheLookDefaults(category) {
  const fallback = generic.shopTheLookDefaults;
  const title = i18n.t('storefront:defaults.shopTheLook.title', { defaultValue: fallback.title });
  return { ...fallback, title };
}

export function getDefaultReviews(category) {
  const fallbackReviews = generic.defaultReviews;
  const texts = tCategoryArray(category, 'defaultReviews', null);
  if (!texts) return fallbackReviews;
  return texts.map((text, i) => ({
    text,
    rating: fallbackReviews[i]?.rating ?? 5,
    image: fallbackReviews[i]?.image || '',
  }));
}

export function getTrendingProductsDefaults(category) {
  const fallback = generic.trendingProductsDefaults;
  const names = tCategoryArray(category, 'trendingProducts', null);
  if (!names) return fallback;
  return names.map((name, i) => {
    const base = fallback[i] || fallback[fallback.length - 1];
    return { ...base, name };
  });
}

export function getDemoCategoriesDefaults(category) {
  const fallback = generic.demoCategoriesDefaults;
  const items = tCategoryArray(category, 'demoCategories', null);
  if (!items) return fallback;
  return items.map((it, i) => {
    const base = fallback[i] || fallback[fallback.length - 1];
    return { ...base, name: it.name, subtitle: it.subtitle };
  });
}

export function getDemoProductsForCategory(category, categoryName) {
  const products = getTrendingProductsDefaults(category);
  return products.slice(0, 6).map((p, i) => ({
    ...p,
    id: `${p.id}-${(categoryName || 'cat').toLowerCase().replace(/\s+/g, '-')}-${i}`,
  }));
}
