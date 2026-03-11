import React from 'react';
import { useSiteConfig } from '../hooks/useSiteConfig.js';
import { resolveImageUrl } from '../utils/imageUrl.js';
import '../styles/about.css';

const CATEGORY_DEFAULTS = {
  jewellery: {
    heroSubtitle: 'Discover our story, heritage, and the passion behind every exquisite piece we create',
    storyHeading: 'Our Heritage',
    storyText: 'Welcome to {brandName}. We are dedicated to bringing you the finest jewellery with unmatched quality and craftsmanship that speaks for itself.\n\nOur commitment to authentic craftsmanship and traditional artistry has made us one of the most trusted names in the jewellery industry. Every piece in our collection reflects expertise, artistic brilliance, and timeless beauty.\n\nWe believe in creating experiences, not just jewellery. Each item is carefully curated and crafted to perfection for discerning customers worldwide.',
    valuesHeading: 'What We Offer',
    valuesSubtitle: 'Our commitment to excellence drives everything we do, from sourcing to delivery',
    values: [
      { icon: 'fas fa-certificate', title: 'Authentic & Pure', description: 'Every piece is crafted with original materials and artistry. We guarantee authenticity and purity, ensuring that traditional craftsmanship is preserved and honored.' },
      { icon: 'fas fa-globe-americas', title: 'Worldwide Shipping', description: 'We deliver happiness across borders with a smooth and timely shopping experience. Our global reach ensures that elegance reaches customers worldwide.' },
      { icon: 'fas fa-gem', title: 'Exclusive Designs', description: 'Unique collections that bring luxury and tradition together. Each design is carefully curated to offer something special — pieces that you won\'t find anywhere else.' },
    ],
    missionHeading: 'Our Mission',
    missionText: '{brandName} is more than just a brand – it is a commitment to excellence, quality, and customer satisfaction that drives everything we do.\n\nWe aim to preserve and promote the finest traditions of craftsmanship, creating masterpieces that blend timeless elegance with contemporary appeal.\n\nOur commitment extends beyond creating beautiful products – we are dedicated to supporting artisans, preserving techniques, and ensuring that this heritage continues to shine for generations to come.',
  },
  clothing: {
    heroSubtitle: 'Discover our story and the passion behind every collection we design',
    storyHeading: 'Our Story',
    storyText: 'Welcome to {brandName}. We are passionate about fashion and dedicated to bringing you stylish, high-quality clothing for every occasion.\n\nOur team of designers draws inspiration from global trends while staying true to timeless style. Every garment in our collection is thoughtfully designed and crafted with attention to detail.\n\nWe believe fashion should be accessible, comfortable, and expressive. That\'s why we create versatile pieces that help you look and feel your best.',
    valuesHeading: 'Why Choose Us',
    valuesSubtitle: 'Fashion-forward designs with uncompromising quality',
    values: [
      { icon: 'fas fa-tshirt', title: 'Premium Quality', description: 'We use only the finest fabrics and materials. Every garment goes through rigorous quality checks to ensure comfort, durability, and a perfect fit.' },
      { icon: 'fas fa-shipping-fast', title: 'Fast Delivery', description: 'Quick and reliable shipping so you get your favourite styles without the wait. We deliver across the country with care and speed.' },
      { icon: 'fas fa-paint-brush', title: 'Trending Designs', description: 'Stay ahead of the curve with our latest collections. Our designers create fresh, on-trend styles that keep your wardrobe current and exciting.' },
    ],
    missionHeading: 'Our Mission',
    missionText: '{brandName} is more than just a clothing brand – it is about empowering you to express yourself through style.\n\nWe aim to make fashion accessible and sustainable, creating collections that are as kind to the planet as they are to your wardrobe.\n\nOur commitment goes beyond great clothing – we are building a community of fashion lovers who believe in quality, creativity, and individuality.',
  },
  electronics: {
    heroSubtitle: 'Innovation, quality, and technology at the heart of everything we do',
    storyHeading: 'Our Story',
    storyText: 'Welcome to {brandName}. We are dedicated to bringing you the latest in technology with products that combine innovation, quality, and value.\n\nOur team of tech enthusiasts carefully selects every product in our catalogue, ensuring it meets the highest standards of performance and reliability.\n\nWe believe technology should enhance your life. That\'s why we offer products that are not just cutting-edge, but also user-friendly and built to last.',
    valuesHeading: 'Why Choose Us',
    valuesSubtitle: 'Trusted technology solutions for modern life',
    values: [
      { icon: 'fas fa-microchip', title: 'Latest Technology', description: 'We stock only the newest and most innovative products. Stay ahead with cutting-edge gadgets and devices from top brands.' },
      { icon: 'fas fa-shield-alt', title: 'Genuine Products', description: '100% authentic products with manufacturer warranty. We source directly from authorized distributors to guarantee quality.' },
      { icon: 'fas fa-headset', title: 'Expert Support', description: 'Our tech-savvy team is here to help you choose the right product and provide after-sales support whenever you need it.' },
    ],
    missionHeading: 'Our Mission',
    missionText: '{brandName} is your trusted destination for quality technology products.\n\nWe aim to make the latest technology accessible to everyone, offering genuine products at competitive prices with exceptional service.\n\nOur commitment is to be more than a store – we want to be your go-to tech partner, helping you find the perfect products for your needs.',
  },
};

const GENERIC_DEFAULTS = {
  heroSubtitle: 'Discover our story, heritage, and the passion behind every product we offer',
  storyHeading: 'Our Story',
  storyText: 'Welcome to {brandName}. We are dedicated to bringing you the finest products with unmatched quality and service that speaks for itself.\n\nOur commitment to excellence and attention to detail has made us one of the most trusted names in our industry. Every product in our collection reflects expertise, quality, and care.\n\nWe believe in creating experiences, not just selling products. Each item is carefully curated and selected to perfection for discerning customers worldwide.',
  valuesHeading: 'What We Offer',
  valuesSubtitle: 'Our commitment to excellence drives everything we do, from sourcing to delivery',
  values: [
    { icon: 'fas fa-certificate', title: 'Authentic & Quality', description: 'Every product meets the highest standards of quality. We guarantee authenticity and excellence, ensuring that our customers receive only the best.' },
    { icon: 'fas fa-globe-americas', title: 'Worldwide Shipping', description: 'We deliver happiness across borders with a smooth and timely shopping experience. Our global reach ensures that quality reaches customers worldwide.' },
    { icon: 'fas fa-star', title: 'Exclusive Selection', description: 'Unique collections that bring quality and value together. Each product is carefully curated to offer something special that you won\'t find anywhere else.' },
  ],
  missionHeading: 'Our Mission',
  missionText: '{brandName} is more than just a brand – it is a commitment to excellence, quality, and customer satisfaction that drives everything we do.\n\nWe aim to deliver the finest products, creating an experience that blends quality with exceptional service.\n\nOur commitment extends beyond selling products – we are dedicated to building lasting relationships with our customers and ensuring satisfaction for generations to come.',
};

function getDefaults(category, brandName) {
  const base = CATEGORY_DEFAULTS[category] || GENERIC_DEFAULTS;
  const name = brandName || 'Our Store';
  return {
    heroSubtitle: base.heroSubtitle,
    storyHeading: base.storyHeading,
    storyText: base.storyText.replace(/\{brandName\}/g, name),
    storyImage: '',
    valuesHeading: base.valuesHeading,
    valuesSubtitle: base.valuesSubtitle,
    values: base.values.map(v => ({ ...v })),
    missionHeading: base.missionHeading,
    missionText: base.missionText.replace(/\{brandName\}/g, name),
  };
}

export default function AboutPage() {
  const { siteConfig } = useSiteConfig();
  const brandName = siteConfig?.brandName || siteConfig?.name || 'Our Store';
  const category = siteConfig?.category || '';

  let settings = siteConfig?.settings || {};
  if (typeof settings === 'string') {
    try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
  }
  const aboutPage = settings.aboutPage || {};
  const defaults = getDefaults(category, brandName);

  const heroSubtitle = aboutPage.heroSubtitle || defaults.heroSubtitle;
  const storyHeading = aboutPage.storyHeading || defaults.storyHeading;
  const storyText = aboutPage.storyText || defaults.storyText;
  const storyImage = aboutPage.storyImage || defaults.storyImage;
  const valuesHeading = aboutPage.valuesHeading || defaults.valuesHeading;
  const valuesSubtitle = aboutPage.valuesSubtitle || defaults.valuesSubtitle;
  const missionHeading = aboutPage.missionHeading || defaults.missionHeading;
  const missionText = aboutPage.missionText || defaults.missionText;

  const valuesData = (aboutPage.values && aboutPage.values.length === 3)
    ? aboutPage.values.map((v, i) => ({
        icon: v.icon || defaults.values[i].icon,
        title: v.title || defaults.values[i].title,
        description: v.description || defaults.values[i].description,
      }))
    : defaults.values;

  const storyParagraphs = storyText.split('\n\n').filter(p => p.trim());
  const missionParagraphs = missionText.split('\n\n').filter(p => p.trim());

  const resolvedStoryImage = storyImage ? resolveImageUrl(storyImage) : '';

  return (
    <div className="about-page">
      <section className="about-hero">
        <div className="container">
          <div className="about-hero-content">
            <h1>About {brandName}</h1>
            <p>{heroSubtitle}</p>
          </div>
        </div>
      </section>

      <section className="founder-section">
        <div className="founder-container">
          <div className="founder-image">
            {resolvedStoryImage ? (
              <img src={resolvedStoryImage} alt={brandName} />
            ) : siteConfig?.logoUrl ? (
              <img src={siteConfig.logoUrl} alt={brandName} />
            ) : (
              <div style={{
                width: '100%', maxWidth: 450, height: 400, borderRadius: 8,
                background: 'linear-gradient(135deg, #f9f5f0, #ede5d8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', zIndex: 2,
                fontSize: 64, color: '#d4af37',
              }}>
                <i className="fas fa-store"></i>
              </div>
            )}
          </div>
          <div className="founder-content">
            <h2>{brandName}</h2>
            <div className="title">{storyHeading}</div>
            {storyParagraphs.map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="values-section">
        <div className="container">
          <div className="values-heading">
            <h2>{valuesHeading}</h2>
            <p>{valuesSubtitle}</p>
          </div>
          <div className="values-grid">
            {valuesData.map((val, idx) => (
              <div className="value-card" key={idx}>
                <div className="value-icon">
                  <i className={val.icon}></i>
                </div>
                <h3>{val.title}</h3>
                <p>{val.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mission-section">
        <div className="mission-content">
          <h2>{missionHeading}</h2>
          {missionParagraphs.map((paragraph, idx) => (
            <p key={idx}>{paragraph}</p>
          ))}
        </div>
      </section>
    </div>
  );
}
