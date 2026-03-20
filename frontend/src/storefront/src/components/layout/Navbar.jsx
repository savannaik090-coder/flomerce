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
  const [openDropdown, setOpenDropdown] = useState(null);
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
  const settings = siteConfig?.settings || {};
  const navbarMenus = settings.navbarMenus || [];
  const validMenus = navbarMenus.filter(menu => menu.name && menu.links && menu.links.length > 0 && menu.links.some(l => l.label && l.url));
  const hasCustomNavbar = validMenus.length > 0;
  const showAbout = settings.showAboutUs !== false;
  const showOrderTrack = settings.showOrderTrack !== false;
  const orderTrackUrl = settings.orderTrackUrl || '';
  const showBookAppointment = settings.showBookAppointment !== false;
  const showContact = settings.showContact !== false;
  const logoSize = Math.min(250, Math.max(40, Number(settings.logoSize) || 120));
  const logoPosition = settings.logoPosition || 'left';
  const isCentered = logoPosition === 'center';
  const showAccountIcon = settings.showAccountIcon !== false;
  const showCartIcon = settings.showCartIcon !== false;

  const assignedCategorySlugs = new Set();
  if (hasCustomNavbar) {
    validMenus.forEach(menu => {
      menu.links.forEach(link => {
        if (link.categorySlug) assignedCategorySlugs.add(link.categorySlug);
      });
    });
  }
  const unassignedCategories = hasCustomNavbar
    ? categories.filter(cat => !assignedCategorySlugs.has(cat.slug))
    : [];

  function closeMobileMenu() {
    setMenuOpen(false);
    setOpenDropdown(null);
  }

  function toggleDropdown(id, e) {
    e.preventDefault();
    e.stopPropagation();
    setOpenDropdown(prev => prev === id ? null : id);
  }

  return (
    <header className="header">
      {siteConfig?.settings?.showPromoBanner !== false && (() => {
        const msgs = siteConfig?.settings?.promoBanner;
        const validMsgs = msgs && Array.isArray(msgs) ? msgs.filter(m => m.trim()) : [];
        const isSingle = validMsgs.length <= 1;
        const sep = <span style={{ padding: '0 30px', opacity: 0.5 }}>{'\u2726'}</span>;

        if (isSingle) {
          const text = validMsgs.length === 1 ? validMsgs[0] : `Welcome to ${siteConfig?.brandName || 'Our Store'}`;
          return (
            <div className="promo-banner" style={{ justifyContent: 'center' }}>
              <p className="banner-text" style={{ animation: 'none', textAlign: 'center' }}>{text}</p>
            </div>
          );
        }

        const block = validMsgs.flatMap((m, i) => i < validMsgs.length - 1 ? [m, sep] : [m]);
        return (
          <div className="promo-banner">
            <p className="banner-text">
              {block}{sep}{block}{sep}{block}{sep}{block}
            </p>
          </div>
        );
      })()}

      <nav className="navbar">
        <div className={`nav-container${isCentered ? ' nav-container--logo-center' : ''}`}>
          <div className="hamburger" onClick={() => setMenuOpen(true)}>
            <img src="/images/icons/bars-staggered (2).png" alt="Menu" style={{ width: 25, height: 25 }} />
          </div>

          <Link to="/" className={`brand${isCentered ? ' brand--center' : ''}`}>
            {siteConfig?.logoUrl ? (
              <img
                src={siteConfig.logoUrl}
                alt={siteConfig?.brandName || 'Store'}
                className="brand-logo"
                style={{ width: logoSize, height: 'auto' }}
                onError={(e) => { e.target.style.display = 'none'; const txt = e.target.nextElementSibling; if (txt) txt.style.display = 'block'; }}
              />
            ) : null}
            <span className="brand-text" style={{ display: siteConfig?.logoUrl ? 'none' : 'block' }}>
              {siteConfig?.brandName || 'Store'}
            </span>
          </Link>

          <div className={`nav-menu${menuOpen ? ' active' : ''}`} id="navMenu">
            <i className="fa-solid fa-xmark meenu-close" onClick={closeMobileMenu} style={{ fontSize: 24, color: '#333', cursor: 'pointer' }}></i>

            <ul className="nav-list">
              <li className="nav-item"><Link to="/" className="nav-link" onClick={closeMobileMenu}>Home</Link></li>
              {hasCustomNavbar && validMenus.map((menu) => {
                const activeLinks = menu.links.filter(l => l.label && l.url);
                if (activeLinks.length === 0) return null;
                return (
                  <li className={`nav-item dropdown${openDropdown === menu.id ? ' active' : ''}`} key={menu.id}>
                    <span className="nav-link dropdown-toggle" style={{ cursor: 'pointer' }} onClick={(e) => toggleDropdown(menu.id, e)}>
                      {menu.name} <i className="fas fa-chevron-down"></i>
                    </span>
                    <ul className="dropdown-menu">
                      {activeLinks.map((link) => {
                        const isSafe = link.url.startsWith('/') || link.url.startsWith('http://') || link.url.startsWith('https://');
                        if (!isSafe) return null;
                        const isExternal = link.url.startsWith('http://') || link.url.startsWith('https://');
                        return (
                          <li key={link.id}>
                            {isExternal ? (
                              <a href={link.url} target="_blank" rel="noopener noreferrer" onClick={closeMobileMenu}>{link.label}</a>
                            ) : (
                              <Link to={link.url} onClick={closeMobileMenu}>{link.label}</Link>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                );
              })}
              {(hasCustomNavbar ? unassignedCategories : categories).map((cat) => {
                const subCategories = cat.subcategories || cat.sub_categories || [];
                if (subCategories.length > 0) {
                  return (
                    <li className={`nav-item dropdown${openDropdown === (cat.id || cat.slug) ? ' active' : ''}`} key={cat.id || cat.slug}>
                      <span className="nav-link dropdown-toggle" style={{ cursor: 'pointer' }} onClick={(e) => toggleDropdown(cat.id || cat.slug, e)}>
                        {cat.name} <i className="fas fa-chevron-down"></i>
                      </span>
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
              {showAbout && <li className="nav-item"><Link to="/about" className="nav-link" onClick={closeMobileMenu}>About</Link></li>}
              {showBookAppointment && <li className="nav-item"><Link to="/book-appointment" className="nav-link" onClick={closeMobileMenu}>Book Appointment</Link></li>}
              {showOrderTrack && (
                orderTrackUrl ? (
                  <li className="nav-item"><a href={orderTrackUrl} className="nav-link" target="_blank" rel="noopener noreferrer" onClick={closeMobileMenu}>Order Track</a></li>
                ) : (
                  <li className="nav-item"><Link to="/order-track" className="nav-link" onClick={closeMobileMenu}>Order Track</Link></li>
                )
              )}
              {showContact && <li className="nav-item"><Link to="/contact" className="nav-link" onClick={closeMobileMenu}>Contact</Link></li>}
            </ul>

            <div className="mobile-account-links mobile-special">
              {showAccountIcon && (
                <Link to={isAuthenticated ? '/profile' : '/login'} className="mobile-account-link" onClick={closeMobileMenu}>
                  <img src="/images/icons/user.png" alt="Account" style={{ width: 16, height: 16, marginRight: 8 }} /> Account
                </Link>
              )}
              <a href="#" className="mobile-account-link wishlist-toggle" onClick={(e) => { e.preventDefault(); closeMobileMenu(); onWishlistOpen?.(); }}>
                <img src="/images/icons/heart.png" alt="Wishlist" style={{ width: 16, height: 16, marginRight: 8 }} /> Wishlist ({wishlistCount})
              </a>
              {showCartIcon && (
                <a href="#" className="mobile-account-link mobile-cart-toggle" onClick={(e) => { e.preventDefault(); closeMobileMenu(); onCartOpen?.(); }}>
                  <img src="/images/icons/cart-minus.png" alt="Cart" style={{ width: 16, height: 16, marginRight: 8 }} /> Shopping Bag ({cartCount})
                </a>
              )}
            </div>
          </div>

          <div className="nav-icons">
            <a href="#" className="icon-link search-icon" onClick={(e) => { e.preventDefault(); onSearchOpen?.(); }}>
              <img src="/images/icons/search.png" alt="Search" style={{ width: 20, height: 20 }} />
            </a>
            {showAccountIcon && (
              <Link to={isAuthenticated ? '/profile' : '/login'} className="icon-link account-icon">
                <img src="/images/icons/user.png" alt="Account" style={{ width: 25, height: 25 }} />
              </Link>
            )}
            <a href="#" className="icon-link wishlist-icon-container wishlist-toggle" onClick={(e) => { e.preventDefault(); onWishlistOpen?.(); }}>
              <img src="/images/icons/heart.png" alt="Wishlist" style={{ width: 20, height: 20 }} />
              <div className="wishlist-count">{wishlistCount}</div>
            </a>
            {showCartIcon && (
              <a href="#" className="icon-link cart-icon-container cart-toggle" onClick={(e) => { e.preventDefault(); onCartOpen?.(); }}>
                <img src="/images/icons/cart-minus.png" alt="Cart" style={{ width: 20, height: 20 }} />
                <div className="cart-count">{cartCount}</div>
              </a>
            )}
          </div>
        </div>
      </nav>

      {menuOpen && <div className="menu-overlay active" onClick={closeMobileMenu}></div>}
    </header>
  );
}
