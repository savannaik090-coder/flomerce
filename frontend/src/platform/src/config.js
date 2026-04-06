export const PLATFORM_DOMAIN = 'fluxe.in';
export const PLATFORM_URL = `https://${PLATFORM_DOMAIN}`;
export const SUPPORT_EMAIL = `support@${PLATFORM_DOMAIN}`;
export const ENTERPRISE_EMAIL = `enterprise@${PLATFORM_DOMAIN}`;
export const API_BASE_URL = (() => {
  if (typeof window === 'undefined') return `https://${PLATFORM_DOMAIN}`;
  const host = window.location.hostname;
  if (host === PLATFORM_DOMAIN || host === `www.${PLATFORM_DOMAIN}`) return '';
  if (host.endsWith(`.${PLATFORM_DOMAIN}`)) return `https://${PLATFORM_DOMAIN}`;
  return 'http://localhost:8000';
})();
