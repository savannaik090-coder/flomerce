import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSiteConfig } from '../../../hooks/useSiteConfig.js';
import * as productService from '../../../services/productService.js';
import ProductCardModern from './ProductCardModern.jsx';
import { API_BASE } from '../../../config.js';
import './modern.css';

function resolveImg(src) {
  if (!src) return '';
  if (src.startsWith('data:') || src.startsWith('http')) return src;
  if (src.startsWith('/api/')) return `${API_BASE}${src}`;
  return src;
}

export default function CategoryGrid({ category }) {
  const { siteConfig } = useSiteConfig();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!siteConfig?.id || !category?.id) return;
    setLoading(true);
    productService
      .getProducts(siteConfig.id, { categoryId: category.id, limit: 8 })
      .then((res) => {
        setProducts(res.data || res.products || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [siteConfig?.id, category?.id]);

  const hasImage = !!category.image_url;

  return (
    <section className="mn-category-section">
      <div className="mn-category-header">
        <h2 className="mn-section-title">{category.name}</h2>
        {category.subtitle && (
          <p className="mn-section-subtitle">{category.subtitle}</p>
        )}
        <Link to={`/category/${category.slug}`} className="mn-view-all-link">
          View All
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </Link>
      </div>

      {hasImage && (
        <Link to={`/category/${category.slug}`} className="mn-category-banner">
          <img
            src={resolveImg(category.image_url)}
            alt={category.name}
            className="mn-category-banner-img"
          />
          <div className="mn-category-banner-overlay">
            <span className="mn-category-banner-text">Shop {category.name}</span>
          </div>
        </Link>
      )}

      <div className="mn-category-products">
        {loading ? (
          <div className="mn-category-loader">
            <div className="product-loader-spinner"></div>
            <p>Loading {category.name.toLowerCase()}...</p>
          </div>
        ) : products.length > 0 ? (
          <div className="mn-product-grid">
            {products.map((product) => (
              <ProductCardModern key={product.id} product={product} variant="grid" />
            ))}
          </div>
        ) : (
          <p className="mn-category-empty">No products in {category.name} yet</p>
        )}
      </div>
    </section>
  );
}
