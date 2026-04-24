import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
// LanguageSwitcher is intentionally imported here even though the legal pages
// themselves stay hard-coded English — visitors need to be able to switch
// language from a legal page and have that choice take effect when they
// navigate back to Landing or About. Only the switcher is included; no other
// useTranslation() / t() calls belong in this file or in the legal page
// bodies that consume it.
import { LanguageSwitcher } from '../../../shared/i18n/index.js';

export default function LegalNavbar({ showMenu = false }) {
  const { isAuthenticated, logout } = useAuth();
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
        <img src="/assets/images/flomerce-logo.png" alt="Flomerce logo" className="logo-img" />
      </Link>

      <button
        className={`nav-hamburger${menuOpen ? ' open' : ''}`}
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <div className={`nav-links${menuOpen ? ' nav-open' : ''}`}>
        {showMenu && !isAuthenticated && (
          <>
            <a href="#features" className="nav-link" onClick={(e) => { e.preventDefault(); scrollTo('features'); }}>Features</a>
            <a href="#pricing" className="nav-link" onClick={(e) => { e.preventDefault(); scrollTo('pricing'); }}>Pricing</a>
            <a href="#contact" className="nav-link" onClick={(e) => { e.preventDefault(); scrollTo('contact'); }}>Contact</a>
          </>
        )}
        <LanguageSwitcher compact />
        {isAuthenticated ? (
          <>
            <Link to="/dashboard" className="nav-link">Dashboard</Link>
            <button onClick={() => { setMenuOpen(false); logout(); }} className="btn btn-outline">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link">Login</Link>
            <Link to="/signup" className="btn btn-primary">Get Started</Link>
          </>
        )}
      </div>

      {menuOpen && <div className="nav-overlay" onClick={() => setMenuOpen(false)} />}
    </nav>
  );
}
