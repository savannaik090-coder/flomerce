import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CartContext } from '../../context/CartContext.jsx';
import { AuthContext } from '../../context/AuthContext.jsx';
import { CurrencyContext } from '../../context/CurrencyContext.jsx';
import { SiteContext } from '../../context/SiteContext.jsx';

const CURRENCY_FLAGS = {
  INR: '🇮🇳', USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', AED: '🇦🇪', CAD: '🇨🇦', AUD: '🇦🇺',
};

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'CAD', 'AUD'];

export default function MobileBottomNav({ onCartOpen }) {
  const location = useLocation();
  const { cartCount } = useContext(CartContext);
  const { isAuthenticated } = useContext(AuthContext);
  const { currency, setCurrency } = useContext(CurrencyContext);
  const { siteConfig } = useContext(SiteContext);

  const footerSettings = siteConfig?.settings?.footer || {};
  const bottomNav = footerSettings.bottomNav || {};
  const shopRedirect = bottomNav.shopRedirect || '/';
  const showCurrency = siteConfig?.settings?.showCurrencySelector !== false;

  return (
    <nav className="bottom-nav">
      <Link to="/" className={`bottom-nav-item${location.pathname === '/' ? ' active' : ''}`}>
        <i className="fi fi-rs-home"></i>
        <span>Home</span>
      </Link>
      <Link to={shopRedirect} className="bottom-nav-item">
        <i className="fi fi-rs-shop"></i>
        <span>Shop</span>
      </Link>
      <Link to={isAuthenticated ? '/profile' : '/login'} className="bottom-nav-item">
        <i className="fi fi-rs-user"></i>
        <span>Account</span>
      </Link>
      {showCurrency && (
        <div className="bottom-nav-item currency-selector-wrapper">
          <span className="currency-flag-display">{CURRENCY_FLAGS[currency] || '🌐'}</span>
          <span className="currency-code-display">{currency}</span>
          <select
            className="currency-select"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      )}
      <a href="#" className="bottom-nav-item" onClick={(e) => { e.preventDefault(); onCartOpen?.(); }}>
        <i className="fi fi-rs-shopping-bag"></i>
        <span>Bag</span>
        {cartCount > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: '50%', transform: 'translateX(12px)',
            background: '#c8a97e', color: '#fff', fontSize: 10, width: 16, height: 16,
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600,
          }}>{cartCount}</span>
        )}
      </a>
    </nav>
  );
}
