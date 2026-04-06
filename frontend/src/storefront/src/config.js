export const PLATFORM_DOMAIN = 'fluxe.in';
export const PLATFORM_URL = `https://${PLATFORM_DOMAIN}`;
export const SUPPORT_EMAIL = `support@${PLATFORM_DOMAIN}`;
export const API_BASE = typeof window !== 'undefined' && window.location.hostname.endsWith(PLATFORM_DOMAIN)
  ? ''
  : PLATFORM_URL;
