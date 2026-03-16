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

export function getTemplate(templateId) {
  return TEMPLATES[templateId] || TEMPLATES['storefront'];
}

export function getAllTemplates() {
  return Object.values(TEMPLATES);
}
