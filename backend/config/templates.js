export const TEMPLATES = {
  storefront: {
    id: 'storefront',
    name: 'Storefront',
    description: 'Full-featured e-commerce storefront',
    type: 'dynamic',
    buildPath: 'storefront',
  },
  clothing: {
    id: 'clothing',
    name: 'Clothing',
    description: 'Fashion-focused storefront template',
    type: 'dynamic',
    buildPath: 'clothing',
  },
};

export const THEMES = {
  classic: {
    id: 'classic',
    name: 'Classic',
    description: 'Elegant and traditional — serif fonts, gold accents, full-screen hero slider',
  },
  modern: {
    id: 'modern',
    name: 'Modern',
    description: 'Clean and minimal — sans-serif fonts, split hero, grid categories',
  },
};

export function getTemplate(templateId) {
  return TEMPLATES[templateId] || TEMPLATES['storefront'];
}

export function getAllTemplates() {
  return Object.values(TEMPLATES);
}

export function getTheme(themeId) {
  return THEMES[themeId] || THEMES['classic'];
}

export function getAllThemes() {
  return Object.values(THEMES);
}
