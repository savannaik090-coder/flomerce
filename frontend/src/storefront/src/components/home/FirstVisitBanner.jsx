import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSiteConfig } from '../../hooks/useSiteConfig.js';
import { resolveImageUrl } from '../../utils/imageUrl.js';

const STORAGE_KEY = 'first_visit_shown';

export default function FirstVisitBanner() {
  const { siteConfig } = useSiteConfig();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const alreadyShown = localStorage.getItem(STORAGE_KEY);
    if (!alreadyShown) {
      const timer = setTimeout(() => {
        setShow(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const close = () => {
    setShow(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  const settings = siteConfig?.settings || {};

  if (!show || settings.showWelcomeBanner === false) return null;

  const brandName = siteConfig?.brandName || siteConfig?.brand_name || 'Our Store';
  const bannerImage = settings.welcomeBannerImage || '';
  const heading = settings.welcomeBannerHeading || `Welcome to ${brandName}!`;
  const message = settings.welcomeBannerMessage || 'Discover our exquisite collection. Sign up today to receive exclusive offers and updates.';
  const buttonText = settings.welcomeBannerButtonText || 'Sign Up Now';
  const buttonLink = settings.welcomeBannerButtonLink || '/signup';

  return (
    <div className={`first-visit-modal ${show ? 'show' : ''}`}>
      <div className="first-visit-modal-content">
        <button className="first-visit-modal-close" onClick={close}>
          &times;
        </button>
        {bannerImage ? (
          <img
            src={resolveImageUrl(bannerImage)}
            alt={heading}
            className="first-visit-banner-image"
          />
        ) : (
          <div className="first-visit-banner-image" style={{ background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="M21 15l-5-5L5 21"/>
            </svg>
          </div>
        )}
        <div className="first-visit-banner-text">
          <h2>{heading}</h2>
          <p>{message}</p>
          <Link to={buttonLink} className="first-visit-cta-button" onClick={close}>
            {buttonText}
          </Link>
        </div>
      </div>
    </div>
  );
}
