import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SiteContext } from '../../../context/SiteContext.jsx';
import { CartContext } from '../../../context/CartContext.jsx';
import { AuthContext } from '../../../context/AuthContext.jsx';
import { useWishlist } from '../../../hooks/useWishlist.js';
import { isPlanAtLeast } from '../../../utils/plan.js';
import LanguageSwitcher from '../../LanguageSwitcher.jsx';
import TranslatedText from '../../TranslatedText.jsx';
import './modern.css';

export default function NavbarModern({ onSearchOpen, onCartOpen, onWishlistOpen }) {
  const { siteConfig } = useContext(SiteContext);
  const { cartCount } = useContext(CartContext);
  const { isAuthenticated } = useContext(AuthContext);
  const { wishlistCount } = useWishlist();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [openSubGroups, setOpenSubGroups] = useState(new Set());
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
  const appointmentBookingAllowed = isPlanAtLeast(siteConfig?.subscriptionPlan, 'growth');
  const showBookAppointment = settings.showBookAppointment !== false && appointmentBookingAllowed;
  const showContact = settings.showContact !== false;
  const logoSize = Math.min(250, Math.max(40, Number(settings.logoSize) || 60));
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
    setOpenSubGroups(new Set());
  }

  function toggleDropdown(id, e) {
    e.preventDefault();
    e.stopPropagation();
    setOpenDropdown(prev => {
      if (prev === id) return null;
      setOpenSubGroups(new Set());
      return id;
    });
  }

  function toggleSubGroup(id, e) {
    e.preventDefault();
    e.stopPropagation();
    setOpenSubGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const navItems = [];
  if (hasCustomNavbar) {
    validMenus.forEach(menu => {
      const activeLinks = menu.links.filter(l => l.label && l.url);
      if (activeLinks.length === 0) return;
      navItems.push({ type: 'menu', data: menu, links: activeLinks });
    });
  }
  (hasCustomNavbar ? unassignedCategories : categories).forEach(cat => {
    navItems.push({ type: 'category', data: cat });
  });

  const leftItems = navItems.slice(0, Math.ceil(navItems.length / 2));
  const rightItems = navItems.slice(Math.ceil(navItems.length / 2));

  function renderNavItem(item, idx) {
    if (item.type === 'menu') {
      const menu = item.data;
      return (
        <li className={`mn-nav-item mn-dropdown${openDropdown === menu.id ? ' mn-dropdown-open' : ''}`} key={`menu-${menu.id}`}>
          <span className="mn-nav-link" onClick={(e) => toggleDropdown(menu.id, e)}>
            {menu.name}
            <svg className="mn-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
          </span>
          <ul className="mn-dropdown-menu">
            {item.links.map(link => {
              const isSafe = link.url.startsWith('/') || link.url.startsWith('http://') || link.url.startsWith('https://');
              if (!isSafe) return null;
              const isExternal = link.url.startsWith('http://') || link.url.startsWith('https://');
              const linkedCat = link.categorySlug ? categories.find(c => c.slug === link.categorySlug) : null;
              const catChildren = linkedCat?.children || [];
              if (catChildren.length > 0) {
                const directSubs = catChildren.filter(c => !(c.children && c.children.length > 0));
                const groups = catChildren.filter(c => c.children && c.children.length > 0);
                const isExpanded = openSubGroups.has(`grouped-${link.id}`);
                return (
                  <li key={link.id} className={`mn-sub-group${isExpanded ? ' mn-sub-group-open' : ''}`}>
                    <div className="mn-grouped-cat-header">
                      <Link to={link.url} onClick={closeMobileMenu} className="mn-grouped-cat-link">{link.label}</Link>
                      <button className="mn-subcategory-toggle" onClick={(e) => toggleSubGroup(`grouped-${link.id}`, e)} aria-label="Show subcategories">
                        <svg className="mn-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                      </button>
                    </div>
                    <ul className="mn-sub-menu">
                      {directSubs.map(sub => (
                        <li key={sub.id || sub.slug}>
                          <Link to={`/category/${linkedCat.slug}?subcategory=${sub.id}`} onClick={closeMobileMenu}>{sub.name}</Link>
                        </li>
                      ))}
                      {groups.map(group => (
                        <li key={group.id || group.slug} className={`mn-sub-group${openSubGroups.has(group.id) ? ' mn-sub-group-open' : ''}`}>
                          <span className="mn-sub-group-toggle" onClick={(e) => toggleSubGroup(group.id, e)}>
                            {group.name}
                            <svg className="mn-chevron" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6"/></svg>
                          </span>
                          <ul className="mn-sub-menu">
                            {(group.children || []).map(val => (
                              <li key={val.id || val.slug}>
                                <Link to={`/category/${linkedCat.slug}?subcategory=${val.id}`} onClick={closeMobileMenu}>{val.name}</Link>
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              }
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
    }

    const cat = item.data;
    const allChildren = cat.children || [];
    const directSubs = allChildren.filter(c => !(c.children && c.children.length > 0));
    const groups = allChildren.filter(c => c.children && c.children.length > 0);
    const hasSubs = allChildren.length > 0;

    if (hasSubs) {
      return (
        <li className={`mn-nav-item mn-dropdown${openDropdown === (cat.id || cat.slug) ? ' mn-dropdown-open' : ''}`} key={cat.id || cat.slug}>
          <span className="mn-nav-link" onClick={(e) => toggleDropdown(cat.id || cat.slug, e)}>
            <Link to={`/category/${cat.slug}`} onClick={(e) => e.stopPropagation()} style={{ color: 'inherit', textDecoration: 'none' }}>{cat.name}</Link>
            <svg className="mn-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
          </span>
          <ul className="mn-dropdown-menu">
            {directSubs.map(sub => (
              <li key={sub.id || sub.slug}>
                <Link to={`/category/${cat.slug}?subcategory=${sub.id}`} onClick={closeMobileMenu}>{sub.name}</Link>
              </li>
            ))}
            {groups.map(group => (
              <li key={group.id || group.slug} className={`mn-sub-group${openSubGroups.has(group.id) ? ' mn-sub-group-open' : ''}`}>
                <span className="mn-sub-group-toggle" onClick={(e) => toggleSubGroup(group.id, e)}>
                  {group.name}
                  <svg className="mn-chevron" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6"/></svg>
                </span>
                <ul className="mn-sub-menu">
                  {(group.children || []).map(val => (
                    <li key={val.id || val.slug}>
                      <Link to={`/category/${cat.slug}?subcategory=${val.id}`} onClick={closeMobileMenu}>{val.name}</Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </li>
      );
    }

    return (
      <li className="mn-nav-item" key={cat.id || cat.slug}>
        <Link to={`/category/${cat.slug}`} className="mn-nav-link" onClick={closeMobileMenu}>{cat.name}</Link>
      </li>
    );
  }

  function renderExtraLinks() {
    return (
      <>
        {showAbout && <li className="mn-nav-item"><Link to="/about" className="mn-nav-link" onClick={closeMobileMenu}><TranslatedText text="About" /></Link></li>}
        {showBookAppointment && <li className="mn-nav-item"><Link to="/book-appointment" className="mn-nav-link" onClick={closeMobileMenu}><TranslatedText text="Book Appointment" /></Link></li>}
        {showOrderTrack && (
          orderTrackUrl ? (
            <li className="mn-nav-item"><a href={orderTrackUrl} className="mn-nav-link" target="_blank" rel="noopener noreferrer" onClick={closeMobileMenu}><TranslatedText text="Order Track" /></a></li>
          ) : (
            <li className="mn-nav-item"><Link to="/order-track" className="mn-nav-link" onClick={closeMobileMenu}><TranslatedText text="Order Track" /></Link></li>
          )
        )}
        {settings.blogInNavbar && settings.showBlog !== false && <li className="mn-nav-item"><Link to="/blog" className="mn-nav-link" onClick={closeMobileMenu}><TranslatedText text="Blog" /></Link></li>}
        {settings.faqInNavbar && settings.showFaq !== false && <li className="mn-nav-item"><Link to="/faq" className="mn-nav-link" onClick={closeMobileMenu}><TranslatedText text="FAQ" /></Link></li>}
        {showContact && <li className="mn-nav-item"><Link to="/contact" className="mn-nav-link" onClick={closeMobileMenu}><TranslatedText text="Contact" /></Link></li>}
      </>
    );
  }

  return (
    <header className="mn-header">
      <nav className="mn-navbar">
        <div className={`mn-nav-container${!isCentered ? ' mn-logo-left' : ''}`}>
          <button className="mn-hamburger" onClick={() => setMenuOpen(true)} aria-label="Menu">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          {!isCentered && (
            <Link to="/" className="mn-brand">
              {siteConfig?.logoUrl ? (
                <img
                  src={siteConfig.logoUrl}
                  alt={siteConfig?.brandName || 'Store'}
                  className="mn-brand-logo"
                  style={{ width: logoSize, height: 'auto' }}
                  onError={(e) => { e.target.style.display = 'none'; const txt = e.target.nextElementSibling; if (txt) txt.style.display = 'block'; }}
                />
              ) : null}
              <span className="mn-brand-text" style={{ display: siteConfig?.logoUrl ? 'none' : 'block' }}>
                {siteConfig?.brandName || 'Store'}
              </span>
            </Link>
          )}

          <ul className={`${isCentered ? 'mn-nav-left' : 'mn-nav-all'} mn-desktop-only`}>
            {isCentered ? (
              <>
                <li className="mn-nav-item"><Link to="/" className="mn-nav-link" onClick={closeMobileMenu}><TranslatedText text="Home" /></Link></li>
                {leftItems.map((item, i) => renderNavItem(item, i))}
              </>
            ) : (
              <>
                <li className="mn-nav-item"><Link to="/" className="mn-nav-link" onClick={closeMobileMenu}><TranslatedText text="Home" /></Link></li>
                {navItems.map((item, i) => renderNavItem(item, i))}
                {renderExtraLinks()}
              </>
            )}
          </ul>

          {isCentered && (
            <Link to="/" className="mn-brand">
              {siteConfig?.logoUrl ? (
                <img
                  src={siteConfig.logoUrl}
                  alt={siteConfig?.brandName || 'Store'}
                  className="mn-brand-logo"
                  style={{ width: logoSize, height: 'auto' }}
                  onError={(e) => { e.target.style.display = 'none'; const txt = e.target.nextElementSibling; if (txt) txt.style.display = 'block'; }}
                />
              ) : null}
              <span className="mn-brand-text" style={{ display: siteConfig?.logoUrl ? 'none' : 'block' }}>
                {siteConfig?.brandName || 'Store'}
              </span>
            </Link>
          )}

          {isCentered && (
            <ul className="mn-nav-right mn-desktop-only">
              {rightItems.map((item, i) => renderNavItem(item, i))}
              {renderExtraLinks()}
            </ul>
          )}

          <div className="mn-nav-icons">
            <LanguageSwitcher compact />
            <button className="mn-icon-btn" onClick={() => onSearchOpen?.()} aria-label="Search">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
            {showAccountIcon && (
              <Link to={isAuthenticated ? '/profile' : '/login'} className="mn-icon-btn" aria-label="Account">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </Link>
            )}
            <button className="mn-icon-btn mn-icon-badge" onClick={() => onWishlistOpen?.()} aria-label="Wishlist">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              {wishlistCount > 0 && <span className="mn-badge">{wishlistCount}</span>}
            </button>
            {showCartIcon && (
              <button className="mn-icon-btn mn-icon-badge" onClick={() => onCartOpen?.()} aria-label="Cart">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
                {cartCount > 0 && <span className="mn-badge">{cartCount}</span>}
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className={`mn-mobile-menu${menuOpen ? ' mn-mobile-open' : ''}`}>
        <div className="mn-mobile-header">
          <span className="mn-mobile-title">{siteConfig?.brandName || "Menu"}</span>
          <button className="mn-mobile-close" onClick={closeMobileMenu} aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <ul className="mn-mobile-list">
          <li className="mn-nav-item"><Link to="/" className="mn-nav-link" onClick={closeMobileMenu}><TranslatedText text="Home" /></Link></li>
          {navItems.map((item, i) => renderNavItem(item, i))}
          {renderExtraLinks()}
        </ul>
        <div className="mn-mobile-bottom">
          {showAccountIcon && (
            <Link to={isAuthenticated ? '/profile' : '/login'} className="mn-mobile-action" onClick={closeMobileMenu}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <TranslatedText text="Account" />
            </Link>
          )}
          <button className="mn-mobile-action" onClick={() => { closeMobileMenu(); onWishlistOpen?.(); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            <TranslatedText text="Wishlist" /> ({wishlistCount})
          </button>
          {showCartIcon && (
            <button className="mn-mobile-action" onClick={() => { closeMobileMenu(); onCartOpen?.(); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              <TranslatedText text="Cart" /> ({cartCount})
            </button>
          )}
        </div>
      </div>
      {menuOpen && <div className="mn-overlay" onClick={closeMobileMenu}/>}
    </header>
  );
}
