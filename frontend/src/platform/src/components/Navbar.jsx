import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import { LanguageSwitcher } from '../../../shared/i18n/index.js';

export default function Navbar({ showMenu = false }) {
  const { isAuthenticated, logout } = useAuth();
  const { t } = useTranslation('nav');
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const scrollTo = (id) => {
    setMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className="nav">
      <Link to="/" className="logo">
        <img src="/assets/images/flomerce-logo.png" alt={t('logoAlt')} className="logo-img" />
      </Link>

      <button
        className={`nav-hamburger${menuOpen ? ' open' : ''}`}
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label={t('toggleMenu')}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <div className={`nav-links${menuOpen ? ' nav-open' : ''}`}>
        {showMenu && !isAuthenticated && (
          <>
            <a href="#features" className="nav-link" onClick={(e) => { e.preventDefault(); scrollTo('features'); }}>{t('features')}</a>
            <a href="#pricing" className="nav-link" onClick={(e) => { e.preventDefault(); scrollTo('pricing'); }}>{t('pricing')}</a>
            <a href="#contact" className="nav-link" onClick={(e) => { e.preventDefault(); scrollTo('contact'); }}>{t('contact')}</a>
          </>
        )}
        <LanguageSwitcher compact />
        {isAuthenticated ? (
          <>
            <Link to="/dashboard" className="nav-link">{t('dashboard')}</Link>
            <button onClick={() => { setMenuOpen(false); logout(); }} className="btn btn-outline">{t('logout')}</button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link">{t('login')}</Link>
            <Link to="/signup" className="btn btn-primary">{t('getStarted')}</Link>
          </>
        )}
      </div>

      {menuOpen && <div className="nav-overlay" onClick={() => setMenuOpen(false)} />}
    </nav>
  );
}
