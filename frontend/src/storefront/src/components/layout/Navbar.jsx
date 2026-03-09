import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SiteContext } from '../../context/SiteContext.jsx';
import { CartContext } from '../../context/CartContext.jsx';
import { AuthContext } from '../../context/AuthContext.jsx';
import { useWishlist } from '../../hooks/useWishlist.js';

export default function Navbar({ onSearchOpen, onCartOpen, onWishlistOpen }) {
  const { siteConfig } = useContext(SiteContext);
  const { cartCount } = useContext(CartContext);
  const { isAuthenticated } = useContext(AuthContext);
  const { wishlistCount } = useWishlist();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const categories = siteConfig?.categories || [];

  function closeMobileMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="header">
      <div className="promo-banner">
        <p className="banner-text">
          {(() => {
            const msgs = siteConfig?.settings?.promoBanner;
            if (msgs && Array.isArray(msgs) && msgs.length > 0) {
              const text = msgs.join('  ✦  ');
              return <>{text}{'  ✦  '}{text}{'  ✦  '}{text}{'  ✦  '}{text}</>;
            }
            const defaultMsg = `Welcome to ${siteConfig?.brandName || 'Our Store'}`;
            return <>{defaultMsg}{'     '}{defaultMsg}{'     '}{defaultMsg}{'     '}{defaultMsg}</>;
          })()}
        </p>
      </div>

      <nav className="navbar">
        <div className="nav-container">
          <div className="hamburger" onClick={() => setMenuOpen(true)}>
            <i className="fas fa-bars" style={{ fontSize: 24, color: '#fff' }}></i>
          </div>

          <Link to="/" className="brand">
            {siteConfig?.logoUrl ? (
              <img
                src={siteConfig.logoUrl}
                alt={siteConfig?.brandName || 'Store'}
                className="brand-logo"
                onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'block'; }}
              />
            ) : null}
            <span className="brand-text" style={{ display: siteConfig?.logoUrl ? 'none' : 'block', fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 'bold', color: '#000' }}>
              {siteConfig?.brandName || 'Store'}
            </span>
          </Link>

          <div className="nav-icons">
            <a href="#" className="icon-link search-icon" onClick={(e) => { e.preventDefault(); onSearchOpen?.(); }}>
              <i className="fas fa-search" style={{ fontSize: 18 }}></i>
            </a>
            <Link to={isAuthenticated ? '/profile' : '/login'} className="icon-link account-icon">
              <i className="fas fa-user" style={{ fontSize: 18 }}></i>
            </Link>
            <a href="#" className="icon-link wishlist-icon-container wishlist-toggle" onClick={(e) => { e.preventDefault(); onWishlistOpen?.(); }}>
              <i className="far fa-heart" style={{ fontSize: 18 }}></i>
              <div className="wishlist-count">{wishlistCount}</div>
            </a>
            <a href="#" className="icon-link cart-icon-container cart-toggle" onClick={(e) => { e.preventDefault(); onCartOpen?.(); }}>
              <i className="fas fa-shopping-bag" style={{ fontSize: 18 }}></i>
              <div className="cart-count">{cartCount}</div>
            </a>
          </div>
        </div>
      </nav>

      <div className={`nav-menu${menuOpen ? ' active' : ''}`} id="navMenu">
        <i className="fa-solid fa-xmark meenu-close" onClick={closeMobileMenu} style={{ fontSize: 24, marginLeft: '90%', color: '#333', cursor: 'pointer' }}></i>

        <ul className="nav-list">
          <li className="nav-item"><Link to="/" className="nav-link" onClick={closeMobileMenu}>Home</Link></li>
          {categories.map((cat) => {
            const subCategories = cat.subcategories || cat.sub_categories || [];
            if (subCategories.length > 0) {
              return (
                <li className="nav-item dropdown" key={cat.id || cat.slug}>
                  <Link to={`/category/${cat.slug}`} className="nav-link dropdown-toggle" onClick={closeMobileMenu}>
                    {cat.name} <i className="fas fa-chevron-down"></i>
                  </Link>
                  <ul className="dropdown-menu">
                    {subCategories.map((sub) => (
                      <li key={sub.id || sub.slug}>
                        <Link to={`/category/${sub.slug}`} onClick={closeMobileMenu}>{sub.name}</Link>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            }
            return (
              <li className="nav-item" key={cat.id || cat.slug}>
                <Link to={`/category/${cat.slug}`} className="nav-link" onClick={closeMobileMenu}>{cat.name}</Link>
              </li>
            );
          })}
          <li className="nav-item"><Link to="/about" className="nav-link" onClick={closeMobileMenu}>About</Link></li>
          <li className="nav-item"><Link to="/book-appointment" className="nav-link" onClick={closeMobileMenu}>Book Appointment</Link></li>
          <li className="nav-item"><Link to="/order-track" className="nav-link" onClick={closeMobileMenu}>Order Track</Link></li>
          <li className="nav-item"><Link to="/contact" className="nav-link" onClick={closeMobileMenu}>Contact</Link></li>
        </ul>

        <div className="mobile-account-links mobile-special">
          <Link to={isAuthenticated ? '/profile' : '/login'} className="mobile-account-link" onClick={closeMobileMenu}>
            <i className="fas fa-user" style={{ fontSize: 16, marginRight: 8 }}></i> Account
          </Link>
          <a href="#" className="mobile-account-link wishlist-toggle" onClick={(e) => { e.preventDefault(); closeMobileMenu(); onWishlistOpen?.(); }}>
            <i className="far fa-heart" style={{ fontSize: 16, marginRight: 8 }}></i> Wishlist ({wishlistCount})
          </a>
          <a href="#" className="mobile-account-link mobile-cart-toggle" onClick={(e) => { e.preventDefault(); closeMobileMenu(); onCartOpen?.(); }}>
            <i className="fas fa-shopping-bag" style={{ fontSize: 16, marginRight: 8 }}></i> Shopping Bag ({cartCount})
          </a>
        </div>
      </div>

      {menuOpen && <div className="menu-overlay active" onClick={closeMobileMenu}></div>}
    </header>
  );
}
