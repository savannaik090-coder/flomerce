import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { SiteContext } from '../../../context/SiteContext.jsx';
import { PLATFORM_URL } from '../../../config.js';
import './modern.css';

export default function FooterModern() {
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

  const contactInfo = {
    email: siteConfig?.email || settings.email || '',
    phone: siteConfig?.phone || settings.phone || '',
    address: siteConfig?.address || settings.address || '',
  };

  function toggleSection(section) {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  return (
    <footer className="mn-footer">
      <div className="mn-footer-main">
        <div className="mn-footer-grid">
          <div className="mn-footer-col mn-footer-brand-col">
            <h3 className="mn-footer-heading">{siteConfig?.brandName || 'Store'}</h3>
            {contactInfo.address && <p className="mn-footer-address">{contactInfo.address}</p>}
            {contactInfo.email && (
              <a href={`mailto:${contactInfo.email}`} className="mn-footer-contact-link">{contactInfo.email}</a>
            )}
            {contactInfo.phone && (
              <a href={`tel:${contactInfo.phone}`} className="mn-footer-contact-link">{contactInfo.phone}</a>
            )}
            {hasSocialLinks && (
              <div className="mn-footer-social">
                {socialLinks.instagram && (
                  <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                    <i className="fab fa-instagram"></i>
                  </a>
                )}
                {socialLinks.facebook && (
                  <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                    <i className="fab fa-facebook-f"></i>
                  </a>
                )}
                {socialLinks.twitter && (
                  <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                    <i className="fab fa-twitter"></i>
                  </a>
                )}
                {socialLinks.youtube && (
                  <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                    <i className="fab fa-youtube"></i>
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="mn-footer-col">
            <h4 className="mn-footer-col-title mn-footer-col-toggle" onClick={() => toggleSection('info')}>
              Information
              <svg className={`mn-footer-chevron${openSections.info ? ' mn-footer-chevron-open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
            </h4>
            <ul className={`mn-footer-links${openSections.info ? ' mn-footer-links-open' : ''}`}>
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/contact">Contact Us</Link></li>
              <li><Link to="/terms#section-4">Shipping Policy</Link></li>
              <li><Link to="/terms#section-5">Returns & Exchanges</Link></li>
              {settings.showBlog !== false && <li><Link to="/blog">Blog</Link></li>}
              {settings.showFaq !== false && <li><Link to="/faq">FAQ</Link></li>}
            </ul>
          </div>

          <div className="mn-footer-col">
            <h4 className="mn-footer-col-title mn-footer-col-toggle" onClick={() => toggleSection('categories')}>
              Categories
              <svg className={`mn-footer-chevron${openSections.categories ? ' mn-footer-chevron-open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
            </h4>
            <ul className={`mn-footer-links${openSections.categories ? ' mn-footer-links-open' : ''}`}>
              {categories.map((cat) => (
                <li key={cat.id || cat.slug}><Link to={`/category/${cat.slug}`}>{cat.name}</Link></li>
              ))}
            </ul>
          </div>

          <div className="mn-footer-col">
            <h4 className="mn-footer-col-title mn-footer-col-toggle" onClick={() => toggleSection('help')}>
              Need Help?
              <svg className={`mn-footer-chevron${openSections.help ? ' mn-footer-chevron-open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
            </h4>
            <ul className={`mn-footer-links${openSections.help ? ' mn-footer-links-open' : ''}`}>
              <li><Link to="/order-track">Track / Manage Order</Link></li>
              {cancellationEnabled && <li><Link to="/order-help">Cancellation</Link></li>}
              {returnsEnabled && <li><Link to="/order-help">Return / Refund</Link></li>}
              <li><Link to="/terms">Terms and Conditions</Link></li>
              <li><Link to="/privacy-policy">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        {customLinks.length > 0 && (
          <div className="mn-footer-custom">
            {customLinks.map((link, idx) => (
              <span key={idx}>
                {link.url && link.url.startsWith('http') ? (
                  <a href={link.url} target="_blank" rel="noopener noreferrer">{link.name}</a>
                ) : (
                  <Link to={link.url || '#'}>{link.name}</Link>
                )}
              </span>
            ))}
          </div>
        )}

        {showAppBanner && (showAppStore || showPlayStore) && (
          <div className="mn-footer-app">
            <span className="mn-footer-app-label">Download Our App</span>
            <div className="mn-footer-app-buttons">
              {showAppStore && (
                <a href={appBanner.appStoreUrl || '#'} target="_blank" rel="noopener noreferrer">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="App Store" style={{ height: 36 }} />
                </a>
              )}
              {showPlayStore && (
                <a href={appBanner.playStoreUrl || '#'} target="_blank" rel="noopener noreferrer">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Google Play" style={{ height: 36 }} />
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mn-footer-bottom">
        <p>&copy; {new Date().getFullYear()} {siteConfig?.brandName || 'Store'}. All rights reserved. Powered by <a href={PLATFORM_URL} target="_blank" rel="noopener noreferrer">Flomerce</a></p>
        <div className="mn-footer-payment">
          <span><i className="fab fa-cc-visa"></i></span>
          <span><i className="fab fa-cc-mastercard"></i></span>
          <span><i className="fab fa-cc-amex"></i></span>
          <span><i className="fab fa-google-pay"></i></span>
          <span><i className="fab fa-cc-paypal"></i></span>
        </div>
      </div>
    </footer>
  );
}
