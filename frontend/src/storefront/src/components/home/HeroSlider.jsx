import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSiteConfig } from '../../hooks/useSiteConfig.js';
import { resolveImageUrl } from '../../utils/imageUrl.js';
import { getHeroSliderDefaults } from '../../defaults/index.js';

const currentYear = new Date().getFullYear();

export default function HeroSlider() {
  const { siteConfig } = useSiteConfig();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  const category = siteConfig?.category || 'generic';
  const savedSlides = siteConfig?.settings?.heroSlides;
  const rawSlides = savedSlides?.length ? savedSlides : getHeroSliderDefaults(category);
  const slides = rawSlides.filter(s => s.visible !== false);

  const showScrollButtons = siteConfig?.settings?.heroShowScrollButtons !== false;

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    timerRef.current = setInterval(nextSlide, 4000);
    return () => clearInterval(timerRef.current);
  }, [isPaused, nextSlide, slides.length]);

  useEffect(() => {
    if (currentIndex >= slides.length) setCurrentIndex(0);
  }, [slides.length, currentIndex]);

  if (!slides.length) return null;

  return (
    <section
      className="hero-slider"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="slider-container">
        {slides.map((slide, i) => {
          const rawDesc = slide.description || '';
          const strippedDesc = rawDesc.replace(/\s*\d{4}\s*$/, '');
          const desc = strippedDesc ? `${strippedDesc} ${currentYear}` : '';
          return (
            <div key={i} className={`slide ${i === currentIndex ? 'active' : ''}`}>
              {slide.image && (
                <img src={resolveImageUrl(slide.image)} alt={slide.title || ''} className="slide-image" />
              )}
              {!slide.image && (
                <div
                  className="slide-image"
                  style={{
                    background: 'linear-gradient(135deg, #2c2c2c 0%, #1a1a2e 100%)',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                  }}
                />
              )}
              <div className="slide-content">
                <h1 className="slide-title">{slide.title}</h1>
                <h2 className="slide-subtitle">{slide.subtitle}</h2>
                <p className="slide-description">{desc}</p>
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
          );
        })}
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
