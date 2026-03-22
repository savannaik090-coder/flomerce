const CURRENCY_SYMBOLS = {
  INR: '₹', USD: '$', EUR: '€', GBP: '£', JPY: '¥',
  CAD: 'CA$', AUD: 'A$', SGD: 'S$', AED: 'د.إ', SAR: '﷼',
  MYR: 'RM', BDT: '৳', PKR: '₨', LKR: 'Rs', NPR: 'रू',
  KWD: 'د.ك', BHD: 'BD', OMR: 'ر.ع', QAR: 'ر.ق',
};

const CURRENCY_LOCALES = {
  INR: 'en-IN', USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB', JPY: 'ja-JP',
  CAD: 'en-CA', AUD: 'en-AU', SGD: 'en-SG', AED: 'ar-AE', SAR: 'ar-SA',
};

export function getCurrencySymbol(currencyCode) {
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode || '₹';
}

export function formatPrice(amount, currencyCode = 'INR') {
  const locale = CURRENCY_LOCALES[currencyCode] || 'en-US';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (e) {
    const sym = getCurrencySymbol(currencyCode);
    return `${sym}${Number(amount).toLocaleString()}`;
  }
}

export function getAdminCurrency(siteConfig) {
  const settings = siteConfig?.settings || {};
  return settings.defaultCurrency || 'INR';
}

export function formatINR(amount) {
  return formatPrice(amount, 'INR');
}

export function formatNumber(number) {
  return new Intl.NumberFormat('en-IN').format(number);
}
