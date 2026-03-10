import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSiteConfig } from '../../hooks/useSiteConfig.js';
import * as productService from '../../services/productService.js';
import ProductCard from '../product/ProductCard.jsx';

export default function CategorySection({ category }) {
  const { siteConfig } = useSiteConfig();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  const name = typeof category === 'string' ? category : category.name || '';
  const subtitle = typeof category === 'object' ? category.subtitle : null;
  const slug = typeof category === 'string'
    ? category.toLowerCase().replace(/\s+/g, '-')
    : category.slug || name.toLowerCase().replace(/\s+/g, '-');
  const categoryId = typeof category === 'object' ? category.id : null;

  useEffect(() => {
    if (!siteConfig?.id || !name) return;
    setLoading(true);
    const idOrSlug = categoryId || slug;
    productService
      .getProductsByCategory(siteConfig.id, idOrSlug, { limit: 12 })
      .then((res) => {
        setProducts(res.data || res.products || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [siteConfig?.id, categoryId, slug, name]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -350 : 350;
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  if (!loading && products.length === 0) return null;

  return (
    <section className="featured-collection-section">
      <div className="polki-collection-header">
        <h2 className="section-title">{name}</h2>
        {subtitle && <p className="section-subtitle">{subtitle}</p>}
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
              <div className="product-loader-text">Loading {name.toLowerCase()}...</div>
            </div>
          ) : (
            products.map((product) => (
              <ProductCard key={product.id} product={product} variant="scroll" />
            ))
          )}
        </div>

        <button
          className="reviews-scroll-arrow reviews-scroll-arrow-right"
          onClick={() => scroll('right')}
        >
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>

      <div className="reviews-cta">
        <Link to={`/category/${slug}`} className="chat-now-btn" style={{ textDecoration: 'none' }}>
          VIEW ALL
        </Link>
      </div>
    </section>
  );
}
