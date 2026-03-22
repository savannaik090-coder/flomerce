import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { SiteContext } from './SiteContext.jsx';
import { getExchangeRates, detectUserCurrency, formatPrice as formatPriceFn, convertPrice } from '../services/currencyService.js';

export const CurrencyContext = createContext(null);

const CURRENCY_PREF_KEY = 'preferred_currency';
const CURRENCY_DEFAULT_KEY = 'site_default_currency';

export function CurrencyProvider({ children }) {
  const { siteConfig } = useContext(SiteContext);
  const siteDefaultCurrency = siteConfig?.settings?.defaultCurrency || 'INR';

  const [currency, setCurrencyState] = useState(() => {
    const savedDefault = localStorage.getItem(CURRENCY_DEFAULT_KEY);
    const savedPref = localStorage.getItem(CURRENCY_PREF_KEY);
    if (savedDefault && savedDefault !== siteDefaultCurrency) {
      return siteDefaultCurrency;
    }
    return savedPref || siteDefaultCurrency;
  });
  const [rates, setRates] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedDefault = localStorage.getItem(CURRENCY_DEFAULT_KEY);
    if (savedDefault !== siteDefaultCurrency) {
      setCurrencyState(siteDefaultCurrency);
      localStorage.setItem(CURRENCY_DEFAULT_KEY, siteDefaultCurrency);
      localStorage.removeItem(CURRENCY_PREF_KEY);
    } else if (!localStorage.getItem(CURRENCY_PREF_KEY)) {
      setCurrencyState(siteDefaultCurrency);
    }
  }, [siteDefaultCurrency]);

  useEffect(() => {
    async function init() {
      try {
        const fetchedRates = await getExchangeRates(siteDefaultCurrency);
        setRates(fetchedRates);
      } catch (err) {
        console.error('Currency init error:', err);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [siteDefaultCurrency]);

  const setCurrency = useCallback((newCurrency) => {
    setCurrencyState(newCurrency);
    localStorage.setItem(CURRENCY_PREF_KEY, newCurrency);
  }, []);

  const formatAmount = useCallback((amount, overrideCurrency) => {
    const targetCurrency = overrideCurrency || currency;
    if (!rates || targetCurrency === siteDefaultCurrency) {
      return formatPriceFn(amount, targetCurrency);
    }
    const converted = convertPrice(amount, siteDefaultCurrency, targetCurrency, rates);
    return formatPriceFn(converted, targetCurrency);
  }, [currency, rates, siteDefaultCurrency]);

  const convert = useCallback((amount, from, to) => {
    const fromCurrency = from || siteDefaultCurrency;
    const targetCurrency = to || currency;
    if (!rates) return amount;
    return convertPrice(amount, fromCurrency, targetCurrency, rates);
  }, [currency, rates, siteDefaultCurrency]);

  return (
    <CurrencyContext.Provider value={{ currency, siteDefaultCurrency, rates, loading, setCurrency, formatAmount, convert }}>
      {children}
    </CurrencyContext.Provider>
  );
}
