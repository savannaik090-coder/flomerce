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
