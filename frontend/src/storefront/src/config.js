export const PLATFORM_DOMAIN = 'flomerce.com';
export const PLATFORM_URL = `https://${PLATFORM_DOMAIN}`;
export const SUPPORT_EMAIL = `support@${PLATFORM_DOMAIN}`;
export const API_BASE = typeof window !== 'undefined' && window.location.hostname.endsWith(PLATFORM_DOMAIN)
  ? ''
  : PLATFORM_URL;

// Returns the public-facing base URL for a tenant store. Prefers the
// merchant's verified custom domain (e.g. https://shop.example.com), falling
// back to https://<subdomain>.flomerce.com, then to PLATFORM_URL. Used for
// merchant-facing webhook URLs (Razorpay, Shiprocket) so they paste their
// own branded domain into third-party dashboards rather than the platform
// subdomain.
export function getMerchantBaseUrl(siteConfig) {
  if (!siteConfig) return PLATFORM_URL;
  const customDomain = siteConfig.custom_domain || siteConfig.customDomain;
  const domainStatus = siteConfig.domain_status || siteConfig.domainStatus;
  if (customDomain && domainStatus === 'verified') {
    return `https://${customDomain}`;
  }
  if (siteConfig.subdomain) {
    return `https://${siteConfig.subdomain}.${PLATFORM_DOMAIN}`;
  }
  return PLATFORM_URL;
}
