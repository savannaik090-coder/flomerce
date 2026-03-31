import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar({ showMenu = false }) {
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

  const mobileMenu = createPortal(
    <>
      {menuOpen && <div className="nav-overlay" onClick={() => setMenuOpen(false)} />}
      <div className={`nav-mobile-panel${menuOpen ? ' nav-open' : ''}`}>
        {showMenu && !isAuthenticated && (
          <>
            <a href="#features" className="nav-link" onClick={(e) => { e.preventDefault(); scrollTo('features'); }}>Features</a>
            <a href="#pricing" className="nav-link" onClick={(e) => { e.preventDefault(); scrollTo('pricing'); }}>Pricing</a>
            <a href="#contact" className="nav-link" onClick={(e) => { e.preventDefault(); scrollTo('contact'); }}>Contact</a>
          </>
        )}
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
    </>,
    document.body
  );

  return (
    <>
      <nav className="nav">
        <Link to="/" className="logo">
          <img src="/assets/images/fluxe-logo.png" alt="Fluxe" className="logo-img" />
        </Link>

        <div className="nav-links nav-desktop">
          {showMenu && !isAuthenticated && (
            <>
              <a href="#features" className="nav-link" onClick={(e) => { e.preventDefault(); scrollTo('features'); }}>Features</a>
              <a href="#pricing" className="nav-link" onClick={(e) => { e.preventDefault(); scrollTo('pricing'); }}>Pricing</a>
              <a href="#contact" className="nav-link" onClick={(e) => { e.preventDefault(); scrollTo('contact'); }}>Contact</a>
            </>
          )}
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              <button onClick={logout} className="btn btn-outline">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/signup" className="btn btn-primary">Get Started</Link>
            </>
          )}
        </div>

        <button
          className={`nav-hamburger${menuOpen ? ' open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </nav>

      {mobileMenu}
    </>
  );
}
