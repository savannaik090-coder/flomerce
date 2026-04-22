import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { SiteContext } from '../../context/SiteContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';

export default function AnnouncementBar({ text }) {
  const { siteConfig } = useContext(SiteContext);
  const { isModern } = useTheme();
  const { t } = useTranslation('storefront');
  const bannerText = text || t('nav.welcomeFallback', { brandName: siteConfig?.brandName || 'Our Store' });

  return (
    <div className={`promo-banner${isModern ? ' modern-theme' : ''}`}>
      <p className="banner-text">
        {bannerText}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{bannerText}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{bannerText}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{bannerText}
      </p>
    </div>
  );
}
