import React, { useContext } from 'react';
import { CurrencyContext } from '../../context/CurrencyContext.jsx';

const CURRENCIES = [
  { code: 'INR', flag: '🇮🇳', name: 'Indian Rupee' },
  { code: 'USD', flag: '🇺🇸', name: 'US Dollar' },
  { code: 'EUR', flag: '🇪🇺', name: 'Euro' },
  { code: 'GBP', flag: '🇬🇧', name: 'British Pound' },
  { code: 'AED', flag: '🇦🇪', name: 'UAE Dirham' },
  { code: 'CAD', flag: '🇨🇦', name: 'Canadian Dollar' },
  { code: 'AUD', flag: '🇦🇺', name: 'Australian Dollar' },
];

export default function CurrencySelector() {
  const { currency, setCurrency } = useContext(CurrencyContext);
  const current = CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0];

  return (
    <div className="currency-selector-wrapper">
      <span className="currency-flag-display">{current.flag}</span>
      <span className="currency-code-display">{current.code}</span>
      <select
        className="currency-select"
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
      >
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>{c.code}</option>
        ))}
      </select>
    </div>
  );
}
