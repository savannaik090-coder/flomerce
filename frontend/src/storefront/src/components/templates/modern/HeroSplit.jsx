import React from 'react';
import { useSiteConfig } from '../../../hooks/useSiteConfig.js';
import { resolveImageUrl } from '../../../utils/imageUrl.js';
import { getHeroSliderDefaults } from '../../../defaults/index.js';
import './modern.css';

export default function HeroSplit() {
  const { siteConfig } = useSiteConfig();
  const category = siteConfig?.category || 'generic';
  const savedSlides = siteConfig?.settings?.heroSlides;
  const rawSlides = savedSlides?.length ? savedSlides : getHeroSliderDefaults(category);
  const slides = rawSlides.filter(s => s.visible !== false);
  const slide = slides[0];

  if (!slide) return null;

  const primaryColor = siteConfig?.primaryColor || '#000000';

  return (
    <section className="modern-hero">
      <div className="modern-hero-inner">
        <div className="modern-hero-text">
          <span className="modern-hero-tag">{slide.subtitle || 'New Collection'}</span>
          <h1 className="modern-hero-title">{slide.title || siteConfig?.brandName || 'Welcome'}</h1>
          <p className="modern-hero-desc">{slide.description || 'Discover our curated collection of premium products.'}</p>
          <button
            className="modern-hero-btn"
            style={{ backgroundColor: primaryColor }}
            onClick={() => { if (slide.buttonLink) window.location.href = slide.buttonLink; }}
          >
            {slide.buttonText || 'Shop Now'}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
        <div className="modern-hero-image">
          {slide.image ? (
            <img src={resolveImageUrl(slide.image)} alt={slide.title || ''} />
          ) : (
            <div className="modern-hero-placeholder">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21"/>
              </svg>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
