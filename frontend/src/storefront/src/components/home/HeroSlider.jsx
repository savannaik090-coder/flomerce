import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSiteConfig } from '../../hooks/useSiteConfig.js';
import { resolveImageUrl } from '../../utils/imageUrl.js';
import { getHeroSliderDefaults } from '../../defaults/index.js';
import TranslatedText from '../TranslatedText.jsx';

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
  const heroTransition = siteConfig?.settings?.heroTransition || '';
  const heroSpeed = siteConfig?.settings?.heroSpeed || '';
  const heroHeight = siteConfig?.settings?.heroHeight || '';
  const speedMap = { slow: 6000, fast: 2500 };
  const heightMap = { compact: '70vh', tall: '100vh' };
  const autoPlayInterval = speedMap[heroSpeed] || 4000;
  const sectionStyle = heightMap[heroHeight] ? { height: heightMap[heroHeight] } : {};

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    timerRef.current = setInterval(nextSlide, autoPlayInterval);
    return () => clearInterval(timerRef.current);
  }, [isPaused, nextSlide, slides.length, autoPlayInterval]);

  useEffect(() => {
    if (currentIndex >= slides.length) setCurrentIndex(0);
  }, [slides.length, currentIndex]);

  if (!slides.length) return null;

  return (
    <section
      className="hero-slider"
      data-transition={heroTransition || 'fade'}
      style={sectionStyle}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="slider-container">
        {slides.map((slide, i) => {
          const rawDesc = slide.description || '';
          const strippedDesc = rawDesc.replace(/\s*\d{4}\s*$/, '');
          return (
            <div key={i} className={`slide ${i === currentIndex ? 'active' : ''}`}>
              {slide.image && (
                <img src={resolveImageUrl(slide.image)} alt={slide.title || ''} className="slide-image" />
              )}
              {!slide.image && (
                <div
                  className="slide-image"
                  style={{
                    background: '#f5f5f5',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <path d="M21 15l-5-5L5 21"/>
                  </svg>
                </div>
              )}
              <div className="slide-content">
                <h1 className="slide-title">{slide.title ? <TranslatedText text={slide.title} /> : null}</h1>
                <h2 className="slide-subtitle">{slide.subtitle ? <TranslatedText text={slide.subtitle} /> : null}</h2>
                <p className="slide-description">
                  {strippedDesc ? <TranslatedText text={strippedDesc} /> : null}
                  {strippedDesc ? ` ${currentYear}` : ''}
                </p>
                <button
                  className="shop-now-btn"
                  onClick={() => {
                    if (slide.buttonLink) window.location.href = slide.buttonLink;
                  }}
                >
                  {slide.buttonText
                    ? <TranslatedText text={slide.buttonText} />
                    : <TranslatedText text="SHOP NOW" />}
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
