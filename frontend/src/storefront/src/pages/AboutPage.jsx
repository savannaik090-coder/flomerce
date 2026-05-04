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

// Map a style object to inline CSS variables on the page wrapper.
// Only keys with a non-empty value are emitted — unset keys let the
// about.css fallback chains (which reference brand identity vars) take over.
function buildStyleVars(style, isModern) {
  const s = style && typeof style === 'object' ? style : {};
  const vars = {};
  const pairs = [
    ['--about-page-bg', s.pageBg],
    ['--about-hero-bg', s.heroBg],
    ['--about-hero-title-color', s.heroTitleColor],
    ['--about-hero-subtitle-color', s.heroSubtitleColor],
    ['--about-story-bg', s.storyBg],
    ['--about-story-heading-color', s.storyHeadingColor],
    ['--about-story-body-color', s.storyBodyColor],
    ['--about-section-heading-color', s.sectionHeadingColor],
    ['--about-section-body-color', s.sectionBodyColor],
    ['--about-heading-font', s.headingFont],
    ['--about-body-font', s.bodyFont],
  ];
  for (const [k, v] of pairs) {
    if (v !== undefined && v !== null && v !== '') vars[k] = v;
  }
  if (isModern) {
    if (s.accentColor) vars['--about-accent-color'] = s.accentColor;
    if (s.storyCardBg) vars['--about-story-card-bg'] = s.storyCardBg;
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
  // Modern: resolve against full defaults so every var is always present.
  // Classic: pass savedStyle directly — unset keys produce no CSS var, letting
  // the about.css brand identity fallback chains (--brand-bg, --color-primary,
  // --font-heading, etc.) take effect automatically.
  const styleForVars = isModern ? resolveStyle(savedStyle, styleDefaults) : (savedStyle || {});
  const styleVars = buildStyleVars(styleForVars, isModern);

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
