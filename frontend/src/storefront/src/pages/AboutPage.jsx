import React from 'react';
import { useSiteConfig } from '../hooks/useSiteConfig.js';
import { useSEO } from '../hooks/useSEO.js';
import { resolveImageUrl } from '../utils/imageUrl.js';
import '../styles/about.css';

const CATEGORY_DEFAULTS = {
  jewellery: {
    heroSubtitle: 'Discover our story, heritage, and the passion behind every exquisite piece we create',
    storyText: 'Welcome to {brandName}. We are dedicated to bringing you the finest jewellery with unmatched quality and craftsmanship that speaks for itself.\n\nOur commitment to authentic craftsmanship and traditional artistry has made us one of the most trusted names in the jewellery industry. Every piece in our collection reflects expertise, artistic brilliance, and timeless beauty.\n\nWe believe in creating experiences, not just jewellery. Each item is carefully curated and crafted to perfection for discerning customers worldwide.',
    sections: [
      { heading: 'Our Mission', text: '{brandName} is more than just a brand – it is a commitment to excellence, quality, and customer satisfaction that drives everything we do.\n\nWe aim to preserve and promote the finest traditions of craftsmanship, creating masterpieces that blend timeless elegance with contemporary appeal.\n\nOur commitment extends beyond creating beautiful products – we are dedicated to supporting artisans, preserving techniques, and ensuring that this heritage continues to shine for generations to come.', visible: true },
    ],
  },
  clothing: {
    heroSubtitle: 'Discover our story and the passion behind every collection we design',
    storyText: 'Welcome to {brandName}. We are passionate about fashion and dedicated to bringing you stylish, high-quality clothing for every occasion.\n\nOur team of designers draws inspiration from global trends while staying true to timeless style. Every garment in our collection is thoughtfully designed and crafted with attention to detail.\n\nWe believe fashion should be accessible, comfortable, and expressive. That\'s why we create versatile pieces that help you look and feel your best.',
    sections: [
      { heading: 'Our Mission', text: '{brandName} is more than just a clothing brand – it is about empowering you to express yourself through style.\n\nWe aim to make fashion accessible and sustainable, creating collections that are as kind to the planet as they are to your wardrobe.\n\nOur commitment goes beyond great clothing – we are building a community of fashion lovers who believe in quality, creativity, and individuality.', visible: true },
    ],
  },
  electronics: {
    heroSubtitle: 'Innovation, quality, and technology at the heart of everything we do',
    storyText: 'Welcome to {brandName}. We are dedicated to bringing you the latest in technology with products that combine innovation, quality, and value.\n\nOur team of tech enthusiasts carefully selects every product in our catalogue, ensuring it meets the highest standards of performance and reliability.\n\nWe believe technology should enhance your life. That\'s why we offer products that are not just cutting-edge, but also user-friendly and built to last.',
    sections: [
      { heading: 'Our Mission', text: '{brandName} is your trusted destination for quality technology products.\n\nWe aim to make the latest technology accessible to everyone, offering genuine products at competitive prices with exceptional service.\n\nOur commitment is to be more than a store – we want to be your go-to tech partner, helping you find the perfect products for your needs.', visible: true },
    ],
  },
};

const GENERIC_DEFAULTS = {
  heroSubtitle: 'Discover our story, heritage, and the passion behind every product we offer',
  storyText: 'Welcome to {brandName}. We are dedicated to bringing you the finest products with unmatched quality and service that speaks for itself.\n\nOur commitment to excellence and attention to detail has made us one of the most trusted names in our industry. Every product in our collection reflects expertise, quality, and care.\n\nWe believe in creating experiences, not just selling products. Each item is carefully curated and selected to perfection for discerning customers worldwide.',
  sections: [
    { heading: 'Our Mission', text: '{brandName} is more than just a brand – it is a commitment to excellence, quality, and customer satisfaction that drives everything we do.\n\nWe aim to deliver the finest products, creating an experience that blends quality with exceptional service.\n\nOur commitment extends beyond selling products – we are dedicated to building lasting relationships with our customers and ensuring satisfaction for generations to come.', visible: true },
  ],
};

function getDefaults(category, brandName) {
  const base = CATEGORY_DEFAULTS[category] || GENERIC_DEFAULTS;
  const name = brandName || 'Our Store';
  return {
    heroSubtitle: base.heroSubtitle,
    storyText: base.storyText.replace(/\{brandName\}/g, name),
    storyImage: '',
    sections: base.sections.map(s => ({
      heading: s.heading,
      text: s.text.replace(/\{brandName\}/g, name),
      visible: s.visible,
    })),
  };
}

export default function AboutPage() {
  const { siteConfig } = useSiteConfig();
  useSEO({ title: 'About Us', pageType: 'about' });
  const brandName = siteConfig?.brandName || siteConfig?.name || 'Our Store';
  const category = siteConfig?.category || '';

  let settings = siteConfig?.settings || {};
  if (typeof settings === 'string') {
    try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
  }

  if (settings.showAboutUs === false) {
    return (
      <div className="about-page" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <h2>This page is currently unavailable</h2>
        <p style={{ color: '#64748b', marginTop: 12 }}>Please check back later.</p>
      </div>
    );
  }

  const aboutPage = settings.aboutPage || {};
  const defaults = getDefaults(category, brandName);

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
    <div className="about-page">
      <section className="about-hero">
        <div className="about-hero-overlay" />
        <div className="about-hero-inner">
          <span className="about-hero-label">Our Story</span>
          <h1>About {brandName}</h1>
          <p>{heroSubtitle}</p>
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
              <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>

      {visibleSections.map((section, idx) => {
        const paragraphs = (section.text || '').split('\n\n').filter(p => p.trim());
        return (
          <section className="about-content-section" key={idx}>
            <div className="about-content-section-inner">
              <span className="about-content-section-eyebrow">{section.heading}</span>
              <h2>{section.heading}</h2>
              <div className="about-content-section-divider" />
              <div className="about-content-section-text">
                {paragraphs.map((paragraph, pIdx) => (
                  <p key={pIdx}>{paragraph}</p>
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
