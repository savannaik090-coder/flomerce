import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSiteConfig } from '../../hooks/useSiteConfig.js';
import { resolveImageUrl } from '../../utils/imageUrl.js';

const defaultSlides = [
  {
    title: 'IN THE',
    subtitle: 'folds',
    description: 'SUMMER CELEBRATIONS 2025',
    buttonText: 'SHOP NOW',
    buttonLink: '/category/new-arrivals',
  },
  {
    title: 'ELEGANT',
    subtitle: 'Collection',
    description: 'TIMELESS BEAUTY 2025',
    buttonText: 'SHOP NOW',
    buttonLink: '/category/featured',
  },
  {
    title: 'LUXURY',
    subtitle: 'Series',
    description: 'PREMIUM COLLECTION 2025',
    buttonText: 'SHOP NOW',
    buttonLink: '/category/all',
  },
];

export default function HeroSlider() {
  const { siteConfig } = useSiteConfig();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  const slides = siteConfig?.settings?.heroSlides?.length
    ? siteConfig.settings.heroSlides
    : defaultSlides;

  const showScrollButtons = siteConfig?.settings?.heroShowScrollButtons !== false;

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (isPaused) return;
    timerRef.current = setInterval(nextSlide, 4000);
    return () => clearInterval(timerRef.current);
  }, [isPaused, nextSlide]);

  return (
    <section
      className="hero-slider"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="slider-container">
        {slides.map((slide, i) => (
          <div key={i} className={`slide ${i === currentIndex ? 'active' : ''}`}>
            {slide.image && (
              <img src={resolveImageUrl(slide.image)} alt={slide.title || ''} className="slide-image" />
            )}
            {!slide.image && (
              <div className="slide-fallback-bg">
                <div className="slide-fallback-shape slide-fallback-shape-1" />
                <div className="slide-fallback-shape slide-fallback-shape-2" />
                <div className="slide-fallback-shape slide-fallback-shape-3" />
              </div>
            )}
            <div className="slide-content">
              <h1 className="slide-title">{slide.title}</h1>
              <h2 className="slide-subtitle">{slide.subtitle}</h2>
              <p className="slide-description">{slide.description}</p>
              <button
                className="shop-now-btn"
                onClick={() => {
                  if (slide.buttonLink) window.location.href = slide.buttonLink;
                }}
              >
                {slide.buttonText || 'SHOP NOW'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {showScrollButtons && slides.length > 1 && (
        <div className="slider-nav">
          <button className="slider-prev" onClick={prevSlide}>
            <i className="fas fa-chevron-left"></i>
          </button>
          <button className="slider-next" onClick={nextSlide}>
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>
      )}

      {slides.length > 1 && (
        <div className="slider-dots">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`dot ${i === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
