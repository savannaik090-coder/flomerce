import React, { useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { SiteContext } from '../context/SiteContext.jsx';
import { useSEO } from '../hooks/useSEO.js';
import { getTermsDefaults } from '../defaults/index.js';

export default function TermsPage() {
  const { t, i18n } = useTranslation('storefront');
  const { siteConfig } = useContext(SiteContext);
  useSEO({ title: t('terms.pageTitle', 'Terms & Conditions'), pageType: 'terms' });
  const brand = siteConfig?.brandName || siteConfig?.brand_name || 'Our Store';
  const email = siteConfig?.email || 'support@example.com';
  const phone = siteConfig?.phone || '';

  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const el = document.querySelector(location.hash);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    }
  }, [location.hash]);

  const termsContent = siteConfig?.settings?.termsContent;
  const hasCustomContent = termsContent && Array.isArray(termsContent.sections) && termsContent.sections.length > 0;
  const defaults = getTermsDefaults(brand, email, phone);

  const intro = hasCustomContent && termsContent.intro
    ? termsContent.intro.replace(/\{brand\}/g, brand).replace(/\{email\}/g, email).replace(/\{phone\}/g, phone)
    : defaults.intro;

  const sections = hasCustomContent
    ? termsContent.sections.map(s => ({
        title: s.title.replace(/\{brand\}/g, brand).replace(/\{email\}/g, email).replace(/\{phone\}/g, phone),
        content: s.content.replace(/\{brand\}/g, brand).replace(/\{email\}/g, email).replace(/\{phone\}/g, phone),
      }))
    : defaults.sections;

  return (
    <div style={{ maxWidth: 800, margin: '40px auto 80px', padding: '0 20px', fontFamily: 'inherit' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>{t('terms.pageTitle', 'Terms & Conditions')}</h1>
      <p style={{ color: '#64748b', marginBottom: 40 }}>{t('terms.lastUpdated', { date: new Date().toLocaleDateString(i18n.language || 'en-IN', { year: 'numeric', month: 'long', day: 'numeric' }), defaultValue: 'Last updated: {{date}}' })}</p>

      <div style={{ lineHeight: 1.8, color: '#374151' }}>
        <p style={{ marginBottom: 24 }}>{intro}</p>

        {sections.map((section, i) => (
          <div key={i} id={`section-${i + 1}`} style={{ marginBottom: 32, scrollMarginTop: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: '#1e293b' }}>{section.title}</h2>
            <p style={{ whiteSpace: 'pre-line', color: '#374151' }}>{section.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
