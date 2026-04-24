import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { resolveImageUrl } from '../../utils/imageUrl.js';
import TranslatedText from '../TranslatedText';

export default function ProductGallery({ images, productName, filteredImageIndices }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(0);
  const mainImageRef = useRef(null);
  const touchStartX = useRef(null);

  const allParsedImages = React.useMemo(() => {
    if (!images || images.length === 0) return [];
    return images.map((img, i) => {
      const rawUrl = typeof img === 'string' ? img : (img.url || img);
      return { url: resolveImageUrl(rawUrl), alt: (typeof img === 'object' && img.alt) || `${productName || "Product"} ${i + 1}`, originalIndex: i };
    }).filter(img => img.url);
  }, [images, productName, t]);

  const parsedImages = React.useMemo(() => {
    if (!filteredImageIndices || filteredImageIndices.length === 0) return allParsedImages;
    return allParsedImages.filter(img => filteredImageIndices.includes(img.originalIndex));
  }, [allParsedImages, filteredImageIndices]);

  useEffect(() => {
    setActiveIndex(0);
  }, [filteredImageIndices]);

  const hasMultipleImages = parsedImages.length > 1;

  const goToImage = useCallback((index) => {
    if (index >= 0 && index < parsedImages.length) {
      setActiveIndex(index);
    }
  }, [parsedImages.length]);

  const goToZoomImage = useCallback((index) => {
    if (index >= 0 && index < parsedImages.length) {
      setZoomIndex(index);
    }
  }, [parsedImages.length]);

  useEffect(() => {
    if (!zoomOpen) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') setZoomOpen(false);
      if (e.key === 'ArrowLeft') goToZoomImage(zoomIndex - 1);
      if (e.key === 'ArrowRight') goToZoomImage(zoomIndex + 1);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomOpen, zoomIndex, goToZoomImage]);

  function handleMainImageClick() {
    setZoomIndex(activeIndex);
    setZoomOpen(true);
  }

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && activeIndex < parsedImages.length - 1) {
        goToImage(activeIndex + 1);
      } else if (diff < 0 && activeIndex > 0) {
        goToImage(activeIndex - 1);
      }
    }
    touchStartX.current = null;
  }

  const zoomOverlay = zoomOpen ? ReactDOM.createPortal(
    <div className="image-zoom-overlay" onClick={() => setZoomOpen(false)}>
      <button className="zoom-close" onClick={(e) => { e.stopPropagation(); setZoomOpen(false); }}><TranslatedText text="✕ Close" /></button>
      {hasMultipleImages && (
        <>
          <button className="zoom-nav prev" onClick={(e) => { e.stopPropagation(); goToZoomImage(zoomIndex - 1); }} disabled={zoomIndex === 0} aria-label="Previous image">‹</button>
          <button className="zoom-nav next" onClick={(e) => { e.stopPropagation(); goToZoomImage(zoomIndex + 1); }} disabled={zoomIndex === parsedImages.length - 1} aria-label="Next image">›</button>
        </>
      )}
      <img
        className="zoomed-image"
        src={parsedImages[zoomIndex]?.url}
        alt={parsedImages[zoomIndex]?.alt}
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  ) : null;

  if (parsedImages.length === 0) {
    return (
      <div className="product-detail-left">
        <div className="main-image-container">
          <div style={{ color: '#999', fontSize: 16 }}><TranslatedText text="No image available" /></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="product-detail-left">
        <div
          className="main-image-container"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          ref={mainImageRef}
        >
          {hasMultipleImages && (
            <button
              className="gallery-nav gallery-nav-prev"
              onClick={() => goToImage(activeIndex - 1)}
              disabled={activeIndex === 0}
              aria-label="Previous image"
            >
              ‹
            </button>
          )}

          <img
            className="product-main-image"
            src={parsedImages[activeIndex]?.url}
            alt={parsedImages[activeIndex]?.alt}
            onClick={handleMainImageClick}
            style={{ display: 'block' }}
          />

          {hasMultipleImages && (
            <button
              className="gallery-nav gallery-nav-next"
              onClick={() => goToImage(activeIndex + 1)}
              disabled={activeIndex === parsedImages.length - 1}
              aria-label="Next image"
            >
              ›
            </button>
          )}
        </div>

        {hasMultipleImages && (
          <div className="product-detail-images">
            <div className="product-thumbnails">
              {parsedImages.map((img, index) => (
                <img
                  key={index}
                  className={`product-thumbnail${index === activeIndex ? ' active' : ''}`}
                  src={img.url}
                  alt={img.alt}
                  onClick={() => goToImage(index)}
                  loading="lazy"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {zoomOverlay}
    </>
  );
}
