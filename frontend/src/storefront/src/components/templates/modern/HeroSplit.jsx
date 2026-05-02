import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSiteConfig } from '../../../hooks/useSiteConfig.js';
import { resolveImageUrl } from '../../../utils/imageUrl.js';
import { getHeroSliderDefaults } from '../../../defaults/index.js';
import TranslatedText from '../../TranslatedText';
import { useShopperTranslation } from '../../../context/ShopperTranslationContext.jsx';
import './modern.css';

export default function HeroSplit() {
  const { translate: tx } = useShopperTranslation();
  const { siteConfig } = useSiteConfig();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  const category = siteConfig?.category || 'generic';
  const savedSlides = siteConfig?.settings?.heroSlides;
  const rawSlides = savedSlides?.length ? savedSlides : getHeroSliderDefaults(category);
  const slides = rawSlides.filter(s => s.visible !== false);
  const primaryColor = siteConfig?.primaryColor || '#000000';
  const showScrollButtons = siteConfig?.settings?.heroShowScrollButtons !== false;

  const settings = siteConfig?.settings || {};
  const heroBtnBg = settings.heroBtnBg || '';
  const heroBtnText = settings.heroBtnText || '';
  const heroBtnStyle = settings.heroBtnStyle || '';
  const heroBtnRadius = settings.heroBtnRadius || '';
  const heroTransition = settings.heroTransition || '';
  const heroSpeed = settings.heroSpeed || '';
  const speedMap = { slow: 6000, fast: 2500 };
  const autoPlayInterval = speedMap[heroSpeed] || 5000;
  const animClass = heroTransition === 'slide' ? 'mh-anim-slide' : heroTransition === 'zoom' ? 'mh-anim-zoom' : 'mh-anim-fade';

  const radiusMap = { sharp: '0', rounded: '8px', pill: '999px' };
  const btnRadius = radiusMap[heroBtnRadius] || '4px';

  let btnInlineStyle;
  if (heroBtnStyle === 'outlined') {
    const outlineColor = heroBtnBg || primaryColor;
    btnInlineStyle = {
      backgroundColor: 'transparent',
      color: heroBtnText || outlineColor,
      border: `2px solid ${outlineColor}`,
      borderRadius: btnRadius,
    };
  } else if (heroBtnStyle === 'ghost') {
    btnInlineStyle = {
      backgroundColor: 'rgba(255,255,255,0.15)',
      color: heroBtnText || '#fff',
      border: '1px solid rgba(255,255,255,0.5)',
      borderRadius: btnRadius,
    };
  } else {
    btnInlineStyle = {
      backgroundColor: heroBtnBg || primaryColor,
      ...(heroBtnText ? { color: heroBtnText } : {}),
      borderRadius: btnRadius,
    };
  }

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

  const slide = slides[currentIndex];

  return (
    <section
      className="modern-hero"
      data-hero-height={settings.heroHeight || 'default'}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="modern-hero-inner">
        <div key={`text-${currentIndex}`} className={`modern-hero-text ${animClass}`}>
          <h1 className="modern-hero-title">
            {slide.title
              ? <TranslatedText text={slide.title} />
              : (siteConfig?.brandName || <TranslatedText text="Welcome" />)}
          </h1>
          {(slide.subtitle) && (
            <span className="modern-hero-tag">
              <TranslatedText text={slide.subtitle} />
            </span>
          )}
          <p className="modern-hero-desc">
            {slide.description
              ? <TranslatedText text={slide.description} />
              : <TranslatedText text="Discover our curated collection of premium products." />}
          </p>
          <button
            className="modern-hero-btn"
            style={btnInlineStyle}
            onClick={() => { if (slide.buttonLink) window.location.href = slide.buttonLink; }}
          >
            {slide.buttonText
              ? <TranslatedText text={slide.buttonText} />
              : <TranslatedText text="Shop Now" />}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
          {slides.length > 1 && (
            <div className="modern-hero-dots">
              {slides.map((_, i) => (
                <button
                  key={i}
                  className={`modern-hero-dot${i === currentIndex ? ' active' : ''}`}
                  onClick={() => setCurrentIndex(i)}
                  aria-label={tx("Go to slide {{n}}").replace('{{n}}', String(i + 1))}
                />
              ))}
            </div>
          )}
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
          {showScrollButtons && slides.length > 1 && (
            <>
              <button className="modern-hero-arrow modern-hero-arrow-left" onClick={prevSlide} aria-label={tx("Previous slide")}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </button>
              <button className="modern-hero-arrow modern-hero-arrow-right" onClick={nextSlide} aria-label={tx("Next slide")}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
