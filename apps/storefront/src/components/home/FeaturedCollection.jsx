import React, { useState, useEffect, useRef } from 'react';
import { useSiteConfig } from '../../hooks/useSiteConfig.js';
import * as productService from '../../services/productService.js';
import ProductCard from '../product/ProductCard.jsx';

export default function FeaturedCollection() {
  const { siteConfig } = useSiteConfig();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!siteConfig?.id) return;
    setLoading(true);
    productService
      .getProducts(siteConfig.id, { featured: true, limit: 20 })
      .then((res) => {
        setProducts(res.data || res.products || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [siteConfig?.id]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -350 : 350;
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  return (
    <section className="featured-collection-section">
      <div className="polki-collection-header">
        <h2 className="section-title">Featured Collection</h2>
        <p className="section-subtitle">Exquisite pieces for your special day</p>
      </div>

      <div className="featured-collection-wrapper" style={{ position: 'relative' }}>
        <button
          className="reviews-scroll-arrow reviews-scroll-arrow-left"
          onClick={() => scroll('left')}
        >
          <i className="fas fa-chevron-left"></i>
        </button>

        <div
          className="product-scroll-container"
          ref={scrollRef}
          style={{ paddingLeft: '40px' }}
        >
          {loading ? (
            <div className="product-loader show">
              <div className="product-loader-spinner"></div>
              <div className="product-loader-text">Loading featured collection...</div>
            </div>
          ) : products.length > 0 ? (
            products.map((product) => (
              <ProductCard key={product.id} product={product} variant="scroll" />
            ))
          ) : (
            <p style={{ padding: '40px', color: '#999', textAlign: 'center', width: '100%' }}>
              No featured products yet
            </p>
          )}
        </div>

        <button
          className="reviews-scroll-arrow reviews-scroll-arrow-right"
          onClick={() => scroll('right')}
        >
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>
    </section>
  );
}
