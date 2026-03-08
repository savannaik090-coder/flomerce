import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSiteConfig } from '../../hooks/useSiteConfig.js';

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

  if (!show) return null;

  const brandName = siteConfig?.brandName || 'Our Store';
  const bannerImage = siteConfig?.settings?.welcomeBannerImage || '';

  return (
    <div className={`first-visit-modal ${show ? 'show' : ''}`}>
      <div className="first-visit-modal-content">
        <button className="first-visit-modal-close" onClick={close}>
          &times;
        </button>
        {bannerImage && (
          <img
            src={bannerImage}
            alt={`Welcome to ${brandName}`}
            className="first-visit-banner-image"
          />
        )}
        <div className="first-visit-banner-text">
          <h2>Welcome to {brandName}!</h2>
          <p>
            Discover our exquisite collection. Sign up today to receive exclusive
            offers and updates.
          </p>
          <Link to="/signup" className="first-visit-cta-button" onClick={close}>
            Sign Up Now
          </Link>
        </div>
      </div>
    </div>
  );
}
