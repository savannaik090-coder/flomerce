export default {
  titleFormat: '{pageTitle} | {brandName}',

  fallbackTitle(site) {
    return `${site.brand_name} | Fluxe Store`;
  },

  fallbackDescription(site) {
    return `Shop at ${site.brand_name}. Browse our collection of products with fast delivery.`;
  },

  includeOrganizationSchema: true,
  includeProductSchema: true,
  includeCategorySchema: true,
  includeBreadcrumbs: true,
};
