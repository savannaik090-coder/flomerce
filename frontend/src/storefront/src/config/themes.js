export const THEME_CLASSIC = 'classic';
export const THEME_MODERN = 'modern';

export const THEMES = {
  [THEME_CLASSIC]: {
    id: THEME_CLASSIC,
    name: 'Classic',
    description: 'Elegant and traditional — serif fonts, gold accents, full-screen hero slider',
    hero: 'slider',
    navbar: 'classic',
    footer: 'accordion',
    productCard: 'classic',
    categorySection: 'scroll',
    defaults: {
      showWatchAndBuy: true,
      showFeaturedVideo: true,
      showShopTheLook: true,
      showProductShowcase: true,
      showCustomerReviews: true,
      showStoreLocations: true,
    },
  },
  [THEME_MODERN]: {
    id: THEME_MODERN,
    name: 'Modern',
    description: 'Clean and minimal — sans-serif fonts, split hero, grid categories',
    hero: 'split',
    navbar: 'modern',
    footer: 'columns',
    productCard: 'modern',
    categorySection: 'grid',
    defaults: {
      showWatchAndBuy: false,
      showFeaturedVideo: false,
      showShopTheLook: false,
      showProductShowcase: true,
      showCustomerReviews: true,
      showStoreLocations: false,
    },
  },
};

export function getTheme(themeId) {
  return THEMES[themeId] || THEMES[THEME_CLASSIC];
}

export function getThemeDefaults(themeId) {
  const theme = getTheme(themeId);
  return theme.defaults || {};
}

export function getAllThemes() {
  return Object.values(THEMES);
}
