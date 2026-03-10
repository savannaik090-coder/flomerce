import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSiteConfig } from '../../hooks/useSiteConfig.js';
import * as productService from '../../services/productService.js';
import ProductCard from '../product/ProductCard.jsx';

const API_BASE = typeof window !== 'undefined' && window.location.hostname.endsWith('fluxe.in') ? '' : 'https://fluxe.in';

function resolveImg(src) {
  if (!src) return '';
  if (src.startsWith('data:') || src.startsWith('http')) return src;
  if (src.startsWith('/api/')) return `${API_BASE}${src}`;
  return src;
}

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

  const hasImage = !!category.image_url;

  return (
    <section className="home-category-section">
      <div className="home-category-header">
        <h2 className="section-title">{category.name}</h2>
        {category.subtitle && (
          <p className="section-subtitle">{category.subtitle}</p>
        )}
      </div>

      {hasImage && (
        <div className="home-category-banner">
          <Link to={`/category/${category.slug}`} className="home-category-banner-link">
            <img
              src={resolveImg(category.image_url)}
              alt={category.name}
              className="home-category-banner-img"
            />
            <div className="home-category-banner-overlay" />
            <div className="home-category-banner-content">
              <h3 className="home-category-banner-title">{category.name}</h3>
              <div className="home-category-banner-divider" />
              <span className="home-category-banner-btn">VIEW ALL</span>
            </div>
          </Link>
        </div>
      )}

      <div className="home-category-products" style={{ position: 'relative' }}>
        <button
          className="home-category-scroll-arrow home-category-scroll-left"
          onClick={() => scroll('left')}
        >
          <i className="fas fa-chevron-left"></i>
        </button>

        <div
          className="product-scroll-container"
          ref={scrollRef}
          style={{ paddingLeft: '20px' }}
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
          className="home-category-scroll-arrow home-category-scroll-right"
          onClick={() => scroll('right')}
        >
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>

      <div className="home-category-cta">
        <Link to={`/category/${category.slug}`} className="home-category-view-all" style={{ textDecoration: 'none' }}>
          VIEW ALL
        </Link>
      </div>
    </section>
  );
}
