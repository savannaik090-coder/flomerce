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

  useEffect(() => {
    if (!siteConfig?.id || !category?.id) return;
    setLoading(true);
    productService
      .getProducts(siteConfig.id, { categoryId: category.id, limit: 20 })
      .then((res) => {
        setProducts(res.data || res.products || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [siteConfig?.id, category?.id]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -350 : 350;
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  return (
    <section className="featured-collection-section">
      <div className="polki-collection-header">
        <h2 className="section-title">{category.name}</h2>
        {category.subtitle && (
          <p className="section-subtitle">{category.subtitle}</p>
        )}
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
              <div className="product-loader-text">Loading {category.name.toLowerCase()}...</div>
            </div>
          ) : products.length > 0 ? (
            products.map((product) => (
              <ProductCard key={product.id} product={product} variant="scroll" />
            ))
          ) : (
            <p style={{ padding: '40px', color: '#999', textAlign: 'center', width: '100%' }}>
              No products in {category.name} yet
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

      <div className="reviews-cta">
        <Link to={`/category/${category.slug}`} className="chat-now-btn" style={{ textDecoration: 'none' }}>
          VIEW ALL
        </Link>
      </div>
    </section>
  );
}
