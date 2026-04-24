// Wizard SEO seed defaults — extracted from the old wizard.json on Apr 24, 2026
// when the unused i18n namespace JSONs were deleted.
//
// These templates are NOT user-facing UI strings; they're the English
// defaults the site-creation wizard uses to pre-fill the "SEO title",
// "SEO description", and "starter categories" fields when a merchant picks
// a business category during step 3 of the wizard. The merchant can edit
// every field after the wizard generates them, so per-language localization
// of these defaults is not necessary — the merchant types whatever they want
// in their own language.
//
// `{{brand}}` is substituted at runtime by `getLocalizedWizardSeed()` in
// i18n-worker.js. Add a new business category by adding a matching key to
// all three maps below; missing keys fall back to the `general` entry.
export const SEO_TITLE_TEMPLATES = {
  jewellery: '{{brand}} - Jewellery Store Online',
  clothing: '{{brand}} - Fashion & Clothing Store',
  beauty: '{{brand}} - Beauty & Cosmetics Store',
  general: '{{brand}} - Shop Online',
};

export const SEO_DESCRIPTION_TEMPLATES = {
  jewellery: 'Shop exquisite jewellery at {{brand}}. Explore rings, necklaces, earrings, bracelets & more. Secure payments & nationwide delivery.',
  clothing: 'Discover the latest fashion at {{brand}}. Shop clothing, accessories & more with easy returns & fast shipping.',
  beauty: 'Shop premium beauty & cosmetics at {{brand}}. Skincare, makeup & more with secure checkout & fast delivery.',
  general: 'Shop online at {{brand}}. Explore our curated collection with secure checkout, easy returns & fast delivery.',
};

export const DEFAULT_CATEGORIES = {
  jewellery: {
    c1: { name: 'New Arrivals', subtitle: 'Discover our latest exquisite collections' },
    c2: { name: 'Jewellery Collection', subtitle: 'Exquisite pieces for every occasion' },
    c3: { name: 'Featured Collection', subtitle: 'Handpicked favourites just for you' },
  },
  clothing: {
    c1: { name: 'New Arrivals', subtitle: 'Discover our latest fashion trends' },
    c2: { name: 'Clothing Collection', subtitle: 'Stylish wear for every occasion' },
    c3: { name: 'Featured Collection', subtitle: 'Handpicked favourites just for you' },
  },
  beauty: {
    c1: { name: 'New Arrivals', subtitle: 'Discover our latest beauty essentials' },
    c2: { name: 'Skincare', subtitle: 'Nourish and glow with our skincare range' },
    c3: { name: 'Makeup', subtitle: 'Premium makeup for every look' },
  },
  general: {
    c1: { name: 'New Arrivals', subtitle: 'Check out what just landed' },
    c2: { name: 'Our Collection', subtitle: 'Browse our complete product range' },
    c3: { name: 'Featured Products', subtitle: 'Handpicked favourites just for you' },
  },
};
