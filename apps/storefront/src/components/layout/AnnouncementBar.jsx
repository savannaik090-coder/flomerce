import React, { useContext } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';

export default function AnnouncementBar({ text }) {
  const { siteConfig } = useContext(SiteContext);
  const bannerText = text || `Welcome to ${siteConfig?.brandName || 'Our Store'}`;

  return (
    <div className="promo-banner">
      <p className="banner-text">
        {bannerText}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{bannerText}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{bannerText}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{bannerText}
      </p>
    </div>
  );
}
