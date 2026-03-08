const CACHE_KEY = 'currency_rates';
const CACHE_DURATION = 24 * 60 * 60 * 1000;

const DEFAULT_RATES = {
  INR: 1,
  USD: 0.012,
  EUR: 0.011,
  GBP: 0.0095,
  AED: 0.044,
  SAR: 0.045,
};

export async function getExchangeRates() {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const { rates, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_DURATION) {
      return rates;
    }
  }

  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/INR');
    if (response.ok) {
      const data = await response.json();
      const rates = data.rates || DEFAULT_RATES;
      localStorage.setItem(CACHE_KEY, JSON.stringify({ rates, timestamp: Date.now() }));
      return rates;
    }
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error);
  }

  return DEFAULT_RATES;
}

export async function detectUserCurrency() {
  try {
    const response = await fetch('https://ipapi.co/json/');
    if (response.ok) {
      const data = await response.json();
      return data.currency || 'INR';
    }
  } catch (error) {
    console.error('Failed to detect currency:', error);
  }
  return 'INR';
}

export function formatPrice(amount, currency = 'INR') {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export function convertPrice(amount, fromCurrency, toCurrency, rates) {
  if (fromCurrency === toCurrency) return amount;
  const inBase = amount / (rates[fromCurrency] || 1);
  return inBase * (rates[toCurrency] || 1);
}
