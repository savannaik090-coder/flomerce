import React, { useState, useContext } from 'react';
import { SiteContext } from '../context/SiteContext.jsx';
import { useSEO } from '../hooks/useSEO.js';
import '../styles/faq.css';

export default function FaqPage() {
  const { siteConfig } = useContext(SiteContext);
  const [openIndex, setOpenIndex] = useState(null);
  useSEO({ title: 'FAQ', pageType: 'faq' });

  let settings = siteConfig?.settings || {};
  if (typeof settings === 'string') {
    try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
  }

  const faqItems = settings.faq || [];
  const showFaq = settings.showFaq !== false;
  const brandName = siteConfig?.brandName || siteConfig?.brand_name || 'Our Store';

  if (!showFaq) {
    return (
      <div className="faq-page" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <h2>This page is currently unavailable</h2>
        <p style={{ color: '#64748b', marginTop: 12 }}>Please check back later.</p>
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
    <div className="faq-page">
      {faqStructuredData && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData).replace(/</g, '\\u003c') }} />
      )}

      <div className="faq-header">
        <h1>Frequently Asked Questions</h1>
        <p>Find answers to common questions about {brandName}.</p>
      </div>

      {faqItems.length === 0 ? (
        <div className="faq-empty">
          <i className="fas fa-question-circle"></i>
          <p>No frequently asked questions yet.</p>
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
