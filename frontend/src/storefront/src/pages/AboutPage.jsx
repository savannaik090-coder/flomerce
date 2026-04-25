import React from 'react';
import { useSiteConfig } from '../hooks/useSiteConfig.js';
import { useSEO } from '../hooks/useSEO.js';
import { useTheme } from '../context/ThemeContext.jsx';
import { resolveImageUrl } from '../utils/imageUrl.js';
import TranslatedText from '../components/TranslatedText.jsx';
import { useShopperTranslation } from '../context/ShopperTranslationContext.jsx';
import '../styles/about.css';

import { getAboutPageWithBrand } from '../defaults/index.js';

export default function AboutPage() {
  const { translate: tx } = useShopperTranslation();
  const { siteConfig } = useSiteConfig();
  const { isModern } = useTheme();
  useSEO({ title: tx("About Us"), pageType: 'about' });
  const brandName = siteConfig?.brandName || siteConfig?.name || 'Our Store';
  const category = siteConfig?.category || '';

  let settings = siteConfig?.settings || {};
  if (typeof settings === 'string') {
    try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
  }

  if (settings.showAboutUs === false) {
    return (
      <div className="about-page" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <h2><TranslatedText text="This page is currently unavailable" /></h2>
        <p style={{ color: '#64748b', marginTop: 12 }}><TranslatedText text="Please check back later." /></p>
      </div>
    );
  }

  const aboutPage = settings.aboutPage || {};
  const defaults = getAboutPageWithBrand(category, brandName);

  const heroSubtitle = aboutPage.heroSubtitle || defaults.heroSubtitle;
  const storyText = aboutPage.storyText || defaults.storyText;
  const storyImage = aboutPage.storyImage || defaults.storyImage;

  let contentSections;
  if (aboutPage.sections && aboutPage.sections.length > 0) {
    contentSections = aboutPage.sections;
  } else if (aboutPage.missionHeading || aboutPage.missionText) {
    contentSections = [{
      heading: aboutPage.missionHeading || defaults.sections[0].heading,
      text: aboutPage.missionText || defaults.sections[0].text,
      visible: true,
    }];
  } else {
    contentSections = defaults.sections;
  }

  const visibleSections = contentSections.filter(s => s.visible !== false);

  const storyParagraphs = storyText.split('\n\n').filter(p => p.trim());
  const resolvedStoryImage = storyImage ? resolveImageUrl(storyImage) : '';

  return (
    <div className={`about-page${isModern ? ' modern-theme' : ''}`}>
      <section className="about-hero">
        <div className="about-hero-overlay" />
        <div className="about-hero-inner">
          <span className="about-hero-label"><TranslatedText text="Our Story" /></span>
          <h1>{tx("About {{brand}}").replace('{{brand}}', brandName)}</h1>
          <p><TranslatedText text={heroSubtitle} /></p>
          <div className="about-hero-divider" />
        </div>
      </section>

      <section className="about-story">
        <div className="about-story-inner">
          <div className="about-story-image-wrap">
            {resolvedStoryImage ? (
              <img src={resolvedStoryImage} alt={brandName} className="about-story-img" />
            ) : siteConfig?.logoUrl ? (
              <img src={siteConfig.logoUrl} alt={brandName} className="about-story-img" />
            ) : (
              <div className="about-story-placeholder">
                <i className="fas fa-store"></i>
              </div>
            )}
            <div className="about-story-image-accent" />
          </div>
          <div className="about-story-text">
            {storyParagraphs.map((paragraph, idx) => (
              <p key={idx}><TranslatedText text={paragraph} /></p>
            ))}
          </div>
        </div>
      </section>

      {visibleSections.map((section, idx) => {
        const paragraphs = (section.text || '').split('\n\n').filter(p => p.trim());
        return (
          <section className="about-content-section" key={idx}>
            <div className="about-content-section-inner">
              <span className="about-content-section-eyebrow"><TranslatedText text={section.heading} /></span>
              <h2><TranslatedText text={section.heading} /></h2>
              <div className="about-content-section-divider" />
              <div className="about-content-section-text">
                {paragraphs.map((paragraph, pIdx) => (
                  <p key={pIdx}><TranslatedText text={paragraph} /></p>
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
