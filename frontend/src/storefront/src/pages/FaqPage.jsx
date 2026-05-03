import React, { useState, useContext } from 'react';
import { SiteContext } from '../context/SiteContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useSEO } from '../hooks/useSEO.js';
import '../styles/faq.css';
import TranslatedText from '../components/TranslatedText';
import { useShopperTranslation } from '../context/ShopperTranslationContext.jsx';
import {
  FAQ_CLASSIC_STYLE_DEFAULTS,
  FAQ_MODERN_STYLE_DEFAULTS,
} from '../defaults/index.js';

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

function buildFaqStyleVars(style, isModern) {
  const vars = {
    '--faq-page-bg': style.pageBg,
    '--faq-heading-font': style.headingFont,
    '--faq-heading-size': style.headingSize,
    '--faq-heading-weight': style.headingWeight,
    '--faq-heading-color': style.headingColor,
    '--faq-subtitle-color': style.subtitleColor,
    '--faq-question-font': style.questionFont,
    '--faq-question-size': style.questionSize,
    '--faq-question-weight': style.questionWeight,
    '--faq-question-color': style.questionColor,
    '--faq-answer-font': style.answerFont,
    '--faq-answer-size': style.answerSize,
    '--faq-answer-color': style.answerColor,
    '--faq-accent-color': style.accentColor,
  };
  if (isModern) {
    vars['--faq-card-bg'] = style.cardBg;
    vars['--faq-card-border-color'] = style.cardBorderColor;
  } else {
    vars['--faq-divider-color'] = style.dividerColor;
  }
  return vars;
}

export default function FaqPage() {
  const { translate: tx } = useShopperTranslation();
  const { siteConfig } = useContext(SiteContext);
  const { isModern } = useTheme();
  const [openIndex, setOpenIndex] = useState(null);
  useSEO({ title: tx("FAQ"), pageType: 'faq' });

  let settings = siteConfig?.settings || {};
  if (typeof settings === 'string') {
    try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
  }

  const faqItems = settings.faq || [];
  const showFaq = settings.showFaq !== false;
  const brandName = siteConfig?.brandName || siteConfig?.brand_name || 'Our Store';

  const faqPage = settings.faqPage || {};
  const styleDefaults = isModern ? FAQ_MODERN_STYLE_DEFAULTS : FAQ_CLASSIC_STYLE_DEFAULTS;
  const savedStyle = isModern ? faqPage.modernStyle : faqPage.classicStyle;
  const resolvedStyle = resolveStyle(savedStyle, styleDefaults);
  const styleVars = buildFaqStyleVars(resolvedStyle, isModern);

  if (!showFaq) {
    return (
      <div className={`faq-page${isModern ? ' modern-theme' : ''}`} style={{ ...styleVars, textAlign: 'center', padding: '80px 20px' }}>
        <h2><TranslatedText text="This page is currently unavailable" /></h2>
        <p style={{ color: '#64748b', marginTop: 12 }}><TranslatedText text="Please check back later." /></p>
      </div>
    );
  }

  function toggleItem(index) {
    setOpenIndex(prev => prev === index ? null : index);
  }

  const faqStructuredData = faqItems.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  } : null;

  return (
    <div className={`faq-page${isModern ? ' modern-theme' : ''}`} style={styleVars}>
      {faqStructuredData && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData).replace(/</g, '\\u003c') }} />
      )}

      <div className="faq-header">
        <h1><TranslatedText text="Frequently Asked Questions" /></h1>
        <p><TranslatedText text="Find answers to common questions about" /> {brandName}.</p>
      </div>

      {faqItems.length === 0 ? (
        <div className="faq-empty">
          <i className="fas fa-question-circle"></i>
          <p><TranslatedText text="No frequently asked questions yet." /></p>
        </div>
      ) : (
        <div className="faq-list">
          {faqItems.map((item, index) => (
            <div key={item.id || index} className={`faq-item${openIndex === index ? ' open' : ''}`}>
              <button className="faq-question" onClick={() => toggleItem(index)}>
                <span className="faq-question-text">{item.question}</span>
                <span className="faq-question-icon">
                  <i className="fas fa-chevron-down"></i>
                </span>
              </button>
              <div className="faq-answer">
                <p className="faq-answer-text">{item.answer}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
