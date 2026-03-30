const categoryDescriptions = {
  jewellery: (name) => `Shop exquisite jewellery at ${name}. Explore rings, necklaces, earrings, bracelets & more. Secure payments & nationwide delivery.`,
  clothing: (name) => `Discover the latest fashion at ${name}. Shop clothing, accessories & more with easy returns & fast shipping.`,
  beauty: (name) => `Shop premium beauty & cosmetics at ${name}. Skincare, makeup & more with secure checkout & fast delivery.`,
  general: (name) => `Shop online at ${name}. Explore our curated collection with secure checkout, easy returns & fast delivery.`,
};

export function getDefaultTitle(brandName) {
  return `${brandName} - Online Store`;
}

export function getDefaultDescription(brandName, category) {
  const gen = categoryDescriptions[category] || categoryDescriptions.general;
  return gen(brandName);
}

export default {
  titleFormat: '{pageTitle} | {brandName}',

  fallbackTitle(site) {
    return getDefaultTitle(site.brand_name);
  },

  fallbackDescription(site) {
    const category = site.category || 'general';
    return getDefaultDescription(site.brand_name, category);
  },

  includeOrganizationSchema: true,
  includeProductSchema: true,
  includeCategorySchema: true,
  includeBreadcrumbs: true,
};
