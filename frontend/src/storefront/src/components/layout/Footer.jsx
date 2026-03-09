import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { SiteContext } from '../../context/SiteContext.jsx';

export default function Footer() {
  const { siteConfig } = useContext(SiteContext);
  const [openSections, setOpenSections] = useState({});
  const categories = siteConfig?.categories || [];
  const socialLinks = siteConfig?.socialLinks || {};

  const hasSocialLinks = socialLinks.instagram || socialLinks.facebook || socialLinks.twitter || socialLinks.youtube;

  function toggleSection(section) {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  return (
    <footer className="footer-minimalist">
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
              <li><a href="#">Shipping Policy</a></li>
              <li><a href="#">Returns & Exchanges</a></li>
              <li><a href="#">Terms and Conditions</a></li>
              <li><a href="#">Privacy Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-section">
          <button className="footer-toggle" onClick={() => toggleSection('categories')}>
            <span className="footer-title">Categories</span>
            <i className={`fas fa-chevron-down`} style={openSections.categories ? { transform: 'rotate(180deg)' } : {}}></i>
          </button>
          <div className={`footer-content${openSections.categories ? ' show' : ''}`}>
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
          <button className="footer-toggle" onClick={() => toggleSection('collection')}>
            <span className="footer-title">Collection</span>
            <i className={`fas fa-chevron-down`} style={openSections.collection ? { transform: 'rotate(180deg)' } : {}}></i>
          </button>
          <div className={`footer-content${openSections.collection ? ' show' : ''}`}>
            <ul>
              <li><Link to="/category/all">All Collection</Link></li>
              <li><Link to="/category/featured">Featured Collection</Link></li>
              <li><Link to="/category/new-arrivals">New Arrivals</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-section">
          <button className="footer-toggle" onClick={() => toggleSection('benefits')}>
            <span className="footer-title">Exclusive benefits</span>
            <i className={`fas fa-chevron-down`} style={openSections.benefits ? { transform: 'rotate(180deg)' } : {}}></i>
          </button>
          <div className={`footer-content${openSections.benefits ? ' show' : ''}`}>
            <ul>
              <li><a href="#">Personal Styling</a></li>
            </ul>
          </div>
        </div>

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

        <div className="footer-app-section">
          <h3 className="app-section-title">Download Our App</h3>
          <div className="app-buttons-container">
            <a href="#" className="app-store-button">
              <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="Download on App Store" />
            </a>
            <a href="#" className="google-play-button">
              <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Get it on Google Play" />
            </a>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-info">
            <div className="copyright">
              <p>&copy; {new Date().getFullYear()} {siteConfig?.brandName || 'Store'}. All rights reserved. Powered by <a href="https://fluxe.in" target="_blank" rel="noopener noreferrer" className="powered-by-link">Fluxe</a></p>
            </div>
            <div className="footer-links">
              <a href="#">Terms and Conditions</a>
              <a href="#">Privacy Policy</a>
            </div>
            <div className="payment-methods">
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
