import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSiteConfig } from '../../../hooks/useSiteConfig.js';
import { useCurrency } from '../../../hooks/useCurrency.js';
import { resolveImageUrl } from '../../../utils/imageUrl.js';
import * as productService from '../../../services/productService.js';
import './modern.css';

export default function TrendingNow() {
  const { siteConfig } = useSiteConfig();
  const { formatAmount } = useCurrency();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
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
        if (trendingIds.length > 0) {
          const idMap = {};
          all.forEach(p => { idMap[p.id] = p; });
          const ordered = trendingIds.map(id => idMap[id]).filter(Boolean);
          setProducts(ordered);
        } else {
          const featured = all.filter(p => p.is_featured);
          setProducts(featured.length > 0 ? featured.slice(0, 12) : all.slice(0, 12));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [siteConfig?.id, isHidden, trendingIds.join(',')]);

  if (isHidden) return null;
  if (!loading && products.length === 0) return null;

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    const amount = 320;
    scrollRef.current.scrollBy({ left: dir === 'right' ? amount : -amount, behavior: 'smooth' });
  };

  return (
    <section className="mn-trending-section">
      <div className="mn-trending-header">
        <div className="mn-trending-header-left">
          <h2 className="mn-section-title">Trending Now</h2>
          <p className="mn-section-subtitle">Our most popular picks</p>
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
          <p>Loading trending products...</p>
        </div>
      ) : (
        <div className="mn-trending-track" ref={scrollRef}>
          {products.map((product) => {
            const img = product.images?.[0] || product.image_url || '';
            const hasCompare = product.compare_at_price && Number(product.compare_at_price) > Number(product.price);
            return (
              <Link key={product.id} to={`/product/${product.slug || product.id}`} className="mn-trending-card">
                <div className="mn-trending-img-wrap">
                  <img src={resolveImageUrl(img)} alt={product.name} loading="lazy" />
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
