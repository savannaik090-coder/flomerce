import * as jewellery from './jewellery.js';
import * as clothing from './clothing.js';
import * as electronics from './electronics.js';
import * as generic from './generic.js';

const categoryMap = {
  jewellery,
  clothing,
  electronics,
};

function getCategory(category) {
  return categoryMap[category] || generic;
}

export function getPolicies(category) {
  return getCategory(category).policies;
}

export function getPolicyPlaceholders(category) {
  return getCategory(category).policyPlaceholders;
}

export function getAboutPageDefaults(category) {
  return getCategory(category).aboutPage;
}

export function getFeaturedVideoDefaults(category) {
  return getCategory(category).featuredVideo;
}

export function getFeaturedVideoPlaceholders(category) {
  return getCategory(category).featuredVideoPlaceholders;
}

export function getAboutPageWithBrand(category, brandName) {
  const base = getAboutPageDefaults(category);
  const name = brandName || 'Our Store';
  return {
    heroSubtitle: base.heroSubtitle,
    storyText: base.storyText.replace(/\{brandName\}/g, name),
    storyImage: '',
    sections: base.sections.map(s => ({
      heading: s.heading,
      text: s.text.replace(/\{brandName\}/g, name),
      visible: s.visible,
    })),
  };
}

function replacePlaceholders(text, brand, email, phone) {
  const phoneClause = phone ? ` or ${phone}` : '';
  return text
    .replace(/\{brand\}/g, brand)
    .replace(/\{email\}/g, email)
    .replace(/\{phoneClause\}/g, phoneClause)
    .replace(/\{phone\}/g, phone);
}

export function getTermsDefaults(brand, email, phone) {
  const b = brand || 'Our Store';
  const e = email || 'support@example.com';
  const p = phone || '';
  return {
    intro: replacePlaceholders(generic.termsIntro, b, e, p),
    sections: generic.termsSections.map(s => ({
      title: replacePlaceholders(s.title, b, e, p),
      content: replacePlaceholders(s.content, b, e, p),
    })),
  };
}

export function getPrivacyDefaults(brand, email, phone) {
  const b = brand || 'Our Store';
  const e = email || 'support@example.com';
  const p = phone || '';
  return {
    intro: replacePlaceholders(generic.privacyIntro, b, e, p),
    sections: generic.privacySections.map(s => ({
      title: replacePlaceholders(s.title, b, e, p),
      content: replacePlaceholders(s.content, b, e, p),
    })),
  };
}

export function getOrderActionNotes() {
  return generic.orderActionNotes;
}
