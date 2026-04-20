import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { SiteContext } from '../../context/SiteContext.jsx';
import { PLATFORM_URL } from '../../config.js';

export default function Footer() {
  const { siteConfig } = useContext(SiteContext);
  const [openSections, setOpenSections] = useState({});
  const categories = siteConfig?.categories || [];

  let settings = siteConfig?.settings || {};
  if (typeof settings === 'string') {
    try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
  }
  const footerConfig = settings.footer || {};
  const customLinks = footerConfig.customLinks || [];
  const cancellationEnabled = settings.cancellationEnabled === true;
  const returnsEnabled = settings.returnsEnabled === true;

  const socialLinks = footerConfig.social
    ? footerConfig.social
    : (siteConfig?.socialLinks || settings.social || {});

  const hasSocialLinks = socialLinks.instagram || socialLinks.facebook || socialLinks.twitter || socialLinks.youtube;

  const appBanner = footerConfig.appBanner || {};
  const showAppBanner = appBanner.show === true;
  const showAppStore = appBanner.showAppStore !== false;
  const showPlayStore = appBanner.showPlayStore !== false;

  function toggleSection(section) {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  return (
    <footer className="footer-minimalist" data-flomerce-section="footer">
      <div className="container">
        <div className="footer-section">
          <button className="footer-toggle" onClick={() => toggleSection('info')}>
            <span className="footer-title">Info</span>
            <i className={`fas fa-chevron-down`} style={openSections.info ? { transform: 'rotate(180deg)' } : {}}></i>
          </button>
          <div className={`footer-content${openSections.info ? ' show' : ''}`}>
            <ul>
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/contact">Contact Us</Link></li>
              <li><Link to="/terms#section-4">Shipping Policy</Link></li>
              <li><Link to="/terms#section-5">Returns & Exchanges</Link></li>
              {settings.showBlog !== false && <li><Link to="/blog">Blog</Link></li>}
              {settings.showFaq !== false && <li><Link to="/faq">FAQ</Link></li>}
              <li><Link to="/terms">Terms and Conditions</Link></li>
              <li><Link to="/privacy-policy">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-section">
          <button className="footer-toggle" onClick={() => toggleSection('categories')}>
            <span className="footer-title">Categories</span>
            <i className={`fas fa-chevron-down`} style={openSections.categories ? { transform: 'rotate(180deg)' } : {}}></i>
          </button>
          <div className={`footer-content${openSections.categories ? ' show' : ''}`}>
            {categories.map((cat) => {
              const allChildren = cat.children || [];
              const directSubs = allChildren.filter(c => !(c.children && c.children.length > 0));
              const groups = allChildren.filter(c => c.children && c.children.length > 0);
              const hasSubs = allChildren.length > 0;
              if (!hasSubs) {
                return (
                  <ul key={cat.id || cat.slug}>
                    <li><Link to={`/category/${cat.slug}`}>{cat.name}</Link></li>
                  </ul>
                );
              }
              const catKey = `cat-${cat.id || cat.slug}`;
              return (
                <div key={cat.id || cat.slug} style={{ marginBottom: 8 }}>
                  <button
                    className="footer-toggle"
                    onClick={() => toggleSection(catKey)}
                    style={{ padding: '4px 0', fontSize: 13 }}
                  >
                    <span>{cat.name}</span>
                    <i className={`fas fa-chevron-down`} style={{ fontSize: 10, ...(openSections[catKey] ? { transform: 'rotate(180deg)' } : {}) }}></i>
                  </button>
                  <div className={`footer-content${openSections[catKey] ? ' show' : ''}`}>
                    <ul style={{ paddingLeft: 8 }}>
                      {directSubs.map(sub => (
                        <li key={sub.id || sub.slug}>
                          <Link to={`/category/${cat.slug}?subcategory=${sub.id}`}>{sub.name}</Link>
                        </li>
                      ))}
                      {groups.map(group => {
                        const groupKey = `grp-${cat.id || cat.slug}-${group.id || group.slug}`;
                        return (
                          <li key={group.id || group.slug} style={{ marginBottom: 6, listStyle: 'none' }}>
                            <button
                              className="footer-toggle"
                              onClick={() => toggleSection(groupKey)}
                              style={{ padding: '3px 0', fontSize: 12 }}
                            >
                              <span>{group.name}</span>
                              <i className={`fas fa-chevron-down`} style={{ fontSize: 9, ...(openSections[groupKey] ? { transform: 'rotate(180deg)' } : {}) }}></i>
                            </button>
                            <div className={`footer-content${openSections[groupKey] ? ' show' : ''}`}>
                              <ul style={{ paddingLeft: 8 }}>
                                {(group.children || []).map(val => (
                                  <li key={val.id || val.slug}>
                                    <Link to={`/category/${cat.slug}?subcategory=${val.id}`}>{val.name}</Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="footer-section">
          <button className="footer-toggle" onClick={() => toggleSection('collection')}>
            <span className="footer-title">Collection</span>
            <i className={`fas fa-chevron-down`} style={openSections.collection ? { transform: 'rotate(180deg)' } : {}}></i>
          </button>
          <div className={`footer-content${openSections.collection ? ' show' : ''}`}>
            <ul>
              {categories.map((cat) => (
                <li key={cat.id || cat.slug}>
                  <Link to={`/category/${cat.slug}`}>{cat.name}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="footer-section">
          <button className="footer-toggle" onClick={() => toggleSection('help')}>
            <span className="footer-title">Need Help?</span>
            <i className={`fas fa-chevron-down`} style={openSections.help ? { transform: 'rotate(180deg)' } : {}}></i>
          </button>
          <div className={`footer-content${openSections.help ? ' show' : ''}`}>
            <ul>
              <li><Link to="/order-track">Track / Manage Order</Link></li>
              {cancellationEnabled && <li><Link to="/order-help">Cancellation</Link></li>}
              {returnsEnabled && <li><Link to="/order-help">Return / Refund</Link></li>}
            </ul>
          </div>
        </div>

        {customLinks.length > 0 && (
          <div className="footer-section">
            <button className="footer-toggle" onClick={() => toggleSection('benefits')}>
              <span className="footer-title">Exclusive benefits</span>
              <i className={`fas fa-chevron-down`} style={openSections.benefits ? { transform: 'rotate(180deg)' } : {}}></i>
            </button>
            <div className={`footer-content${openSections.benefits ? ' show' : ''}`}>
              <ul>
                {customLinks.map((link, idx) => (
                  <li key={idx}>
                    {link.url && link.url.startsWith('http') ? (
                      <a href={link.url} target="_blank" rel="noopener noreferrer">{link.name}</a>
                    ) : (
                      <Link to={link.url || '#'}>{link.name}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {hasSocialLinks && (
          <div className="footer-social-section">
            <h3 className="social-section-title">Follow us on social media</h3>
            <div className="social-icons-container">
              {socialLinks.instagram && (
                <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="social-icon-link">
                  <i className="fab fa-instagram"></i>
                </a>
              )}
              {socialLinks.facebook && (
                <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="social-icon-link">
                  <i className="fab fa-facebook-f"></i>
                </a>
              )}
              {socialLinks.twitter && (
                <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="social-icon-link">
                  <i className="fab fa-twitter"></i>
                </a>
              )}
              {socialLinks.youtube && (
                <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="social-icon-link">
                  <i className="fab fa-youtube"></i>
                </a>
              )}
            </div>
          </div>
        )}

        {showAppBanner && (showAppStore || showPlayStore) && (
          <div className="footer-app-section">
            <h3 className="app-section-title">Download Our App</h3>
            <div className="app-buttons-container">
              {showAppStore && (
                <a href={appBanner.appStoreUrl || '#'} target="_blank" rel="noopener noreferrer" className="app-store-button">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="Download on App Store" />
                </a>
              )}
              {showPlayStore && (
                <a href={appBanner.playStoreUrl || '#'} target="_blank" rel="noopener noreferrer" className="google-play-button">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Get it on Google Play" />
                </a>
              )}
            </div>
          </div>
        )}

        <div className="footer-bottom">
          <div className="footer-info">
            <div className="copyright">
              <p>&copy; {new Date().getFullYear()} {siteConfig?.brandName || 'Store'}. All rights reserved. Powered by <a href={PLATFORM_URL} target="_blank" rel="noopener noreferrer" className="powered-by-link">Flomerce</a></p>
            </div>
            <div className="footer-links">
              <Link to="/terms">Terms and Conditions</Link>
              <Link to="/privacy-policy">Privacy Policy</Link>
            </div>
            <div className="footer-payment-icons">
              <span><i className="fab fa-cc-amex"></i></span>
              <span><i className="fab fa-cc-discover"></i></span>
              <span><i className="fab fa-google-pay"></i></span>
              <span><i className="fab fa-cc-mastercard"></i></span>
              <span><i className="fab fa-cc-paypal"></i></span>
              <span className="union-pay">UP</span>
              <span><i className="fab fa-cc-visa"></i></span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
