import React from 'react';
import { useSiteConfig } from '../hooks/useSiteConfig.js';
import { useSEO } from '../hooks/useSEO.js';
import { useTheme } from '../context/ThemeContext.jsx';
import { resolveImageUrl } from '../utils/imageUrl.js';
import TranslatedText from '../components/TranslatedText.jsx';
import { useShopperTranslation } from '../context/ShopperTranslationContext.jsx';
import '../styles/about.css';

import {
  getAboutPageWithBrand,
  ABOUT_CLASSIC_STYLE_DEFAULTS,
  ABOUT_MODERN_STYLE_DEFAULTS,
} from '../defaults/index.js';

// Map a resolved style object to inline CSS variables on the page wrapper.
// about.css consumes these vars (with the same defaults as fallback) so the
// page renders identically when nothing is set.
function buildStyleVars(style, isModern) {
  const vars = {
    '--about-page-bg': style.pageBg,
    '--about-hero-bg': style.heroBg,
    '--about-hero-title-color': style.heroTitleColor,
    '--about-hero-subtitle-color': style.heroSubtitleColor,
    '--about-story-bg': style.storyBg,
    '--about-story-heading-color': style.storyHeadingColor,
    '--about-story-body-color': style.storyBodyColor,
    '--about-section-heading-color': style.sectionHeadingColor,
    '--about-section-body-color': style.sectionBodyColor,
    '--about-heading-font': style.headingFont,
    '--about-body-font': style.bodyFont,
  };
  if (isModern) {
    vars['--about-accent-color'] = style.accentColor;
    vars['--about-story-card-bg'] = style.storyCardBg;
  }
  return vars;
}

function resolveStyle(saved, defaults) {
  const out = { ...defaults };
  if (saved && typeof saved === 'object') {
    for (const key of Object.keys(defaults)) {
      const v = saved[key];
      if (v !== undefined && v !== null && v !== '') out[key] = v;
    }
  }
  return out;
}

// True when running inside the admin "Edit Website" preview iframe. Used to
// add an "Add an image" affordance on the story image placeholder.
const isInAdminPreview = () => {
  try { return typeof window !== 'undefined' && window.self !== window.top; }
  catch (e) { return true; }
};

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

  const styleDefaults = isModern ? ABOUT_MODERN_STYLE_DEFAULTS : ABOUT_CLASSIC_STYLE_DEFAULTS;
  const savedStyle = isModern ? aboutPage.modernStyle : aboutPage.classicStyle;
  const resolvedStyle = resolveStyle(savedStyle, styleDefaults);
  const styleVars = buildStyleVars(resolvedStyle, isModern);

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
  const showAdminHint = !resolvedStoryImage && isInAdminPreview();

  return (
    <div className={`about-page${isModern ? ' modern-theme' : ''}`} style={styleVars}>
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
            ) : (
              <div className="about-story-placeholder" role="img" aria-label={tx("Story image placeholder")}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <path d="M21 15l-5-5L5 21"/>
                </svg>
                {showAdminHint && (
                  <span className="about-story-placeholder-hint">
                    <TranslatedText text="Add an image" />
                  </span>
                )}
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
