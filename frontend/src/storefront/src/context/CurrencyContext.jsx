import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { SiteContext } from './SiteContext.jsx';
import { getExchangeRates, detectUserCurrency, formatPrice as formatPriceFn, convertPrice } from '../services/currencyService.js';

export const CurrencyContext = createContext(null);

const CURRENCY_PREF_KEY = 'preferred_currency';

export function CurrencyProvider({ children }) {
  const { siteConfig } = useContext(SiteContext);
  const siteDefaultCurrency = siteConfig?.settings?.defaultCurrency || 'INR';

  const [currency, setCurrencyState] = useState(() => {
    return localStorage.getItem(CURRENCY_PREF_KEY) || siteDefaultCurrency;
  });
  const [rates, setRates] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem(CURRENCY_PREF_KEY)) {
      setCurrencyState(siteDefaultCurrency);
    }
  }, [siteDefaultCurrency]);

  useEffect(() => {
    async function init() {
      try {
        const fetchedRates = await getExchangeRates();
        setRates(fetchedRates);
      } catch (err) {
        console.error('Currency init error:', err);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  const setCurrency = useCallback((newCurrency) => {
    setCurrencyState(newCurrency);
    localStorage.setItem(CURRENCY_PREF_KEY, newCurrency);
  }, []);

  const formatAmount = useCallback((amount, overrideCurrency) => {
    const targetCurrency = overrideCurrency || currency;
    if (!rates || targetCurrency === 'INR') {
      return formatPriceFn(amount, targetCurrency);
    }
    const converted = convertPrice(amount, 'INR', targetCurrency, rates);
    return formatPriceFn(converted, targetCurrency);
  }, [currency, rates]);

  const convert = useCallback((amount, from = 'INR', to) => {
    const targetCurrency = to || currency;
    if (!rates) return amount;
    return convertPrice(amount, from, targetCurrency, rates);
  }, [currency, rates]);

  return (
    <CurrencyContext.Provider value={{ currency, rates, loading, setCurrency, formatAmount, convert }}>
      {children}
    </CurrencyContext.Provider>
  );
}
