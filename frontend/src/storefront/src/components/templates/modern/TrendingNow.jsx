import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSiteConfig } from '../../../hooks/useSiteConfig.js';
import { useCurrency } from '../../../hooks/useCurrency.js';
import { resolveImageUrl } from '../../../utils/imageUrl.js';
import * as productService from '../../../services/productService.js';
import { getTrendingProductsDefaults } from '../../../defaults/index.js';
import './modern.css';
import TranslatedText from '../../TranslatedText';

export default function TrendingNow() {
  const { siteConfig } = useSiteConfig();
  const { formatAmount } = useCurrency();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const scrollRef = useRef(null);

  const settings = siteConfig?.settings || {};
  const isHidden = settings.showTrendingNow === false;

  const trendingIds = settings.trendingProductIds || [];

  useEffect(() => {
    if (!siteConfig?.id || isHidden) return;
    setLoading(true);
    productService
      .getProducts(siteConfig.id, { limit: 500 })
      .then((res) => {
        const all = res.data || res.products || [];
        let picked = [];
        if (trendingIds.length > 0) {
          const idMap = {};
          all.forEach(p => { idMap[p.id] = p; });
          picked = trendingIds.map(id => idMap[id]).filter(Boolean);
        } else {
          const featured = all.filter(p => p.is_featured);
          picked = featured.length > 0 ? featured.slice(0, 12) : all.slice(0, 12);
        }
        if (picked.length === 0) {
          setProducts(getTrendingProductsDefaults(siteConfig?.category));
          setIsDemo(true);
        } else {
          setProducts(picked);
          setIsDemo(false);
        }
      })
      .catch(() => {
        setProducts(getTrendingProductsDefaults(siteConfig?.category));
        setIsDemo(true);
      })
      .finally(() => setLoading(false));
  }, [siteConfig?.id, siteConfig?.category, isHidden, trendingIds.join(',')]);

  if (isHidden) return null;

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    const amount = 320;
    scrollRef.current.scrollBy({ left: dir === 'right' ? amount : -amount, behavior: 'smooth' });
  };

  return (
    <section className="mn-trending-section">
      <div className="mn-trending-header">
        <div className="mn-trending-header-left">
          <h2 className="mn-section-title"><TranslatedText text="Trending Now" /></h2>
          <p className="mn-section-subtitle"><TranslatedText text="Our most popular picks" /></p>
        </div>
        <div className="mn-trending-nav">
          <button className="mn-trending-arrow" onClick={() => scroll('left')} aria-label="Scroll left">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <button className="mn-trending-arrow" onClick={() => scroll('right')} aria-label="Scroll right">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mn-category-loader">
          <div className="product-loader-spinner"></div>
          <p><TranslatedText text="Loading trending products..." /></p>
        </div>
      ) : (
        <div className="mn-trending-track" ref={scrollRef}>
          {products.map((product) => {
            const img = product.images?.[0] || product.image_url || '';
            const hasCompare = product.compare_at_price && Number(product.compare_at_price) > Number(product.price);
            const linkTo = (isDemo || product._isDemo) ? '/' : `/product/${product.slug || product.id}`;
            return (
              <Link key={product.id} to={linkTo} className="mn-trending-card">
                <div className="mn-trending-img-wrap">
                  {img ? (
                    <img src={resolveImageUrl(img)} alt={product.name} loading="lazy" />
                  ) : (
                    <div style={{ width: '100%', height: '100%', minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <path d="M21 15l-5-5L5 21"/>
                      </svg>
                    </div>
                  )}
                </div>
                <div className="mn-trending-info">
                  <span className="mn-trending-name">{product.name}</span>
                  <div className="mn-trending-price-row">
                    <span className="mn-trending-price">{formatAmount(product.price)}</span>
                    {hasCompare && (
                      <span className="mn-trending-compare">{formatAmount(product.compare_at_price)}</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
