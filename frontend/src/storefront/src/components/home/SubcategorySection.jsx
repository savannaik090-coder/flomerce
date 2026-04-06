import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSiteConfig } from '../../hooks/useSiteConfig.js';
import { useTheme } from '../../context/ThemeContext.jsx';
import * as productService from '../../services/productService.js';
import ProductCard from '../product/ProductCard.jsx';
import ProductCardModern from '../templates/modern/ProductCardModern.jsx';

export default function SubcategorySection({ section }) {
  const { siteConfig } = useSiteConfig();
  const theme = useTheme();
  const Card = theme.id === 'modern' ? ProductCardModern : ProductCard;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!siteConfig?.id || !section?.subcategoryId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    productService
      .getProducts(siteConfig.id, { subcategoryId: section.subcategoryId, limit: 20 })
      .then((res) => {
        setProducts(res.data || res.products || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [siteConfig?.id, section?.subcategoryId]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -350 : 350;
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const viewAllUrl = section.categorySlug
    ? `/category/${section.categorySlug}?subcategory=${section.subcategoryId}`
    : '#';

  return (
    <section className="home-category-section">
      <div className="home-category-header">
        <h2 className="section-title">{section.name}</h2>
        {section.subtitle && (
          <p className="section-subtitle">{section.subtitle}</p>
        )}
      </div>

      <div className="home-category-products" style={{ position: 'relative' }}>
        {!loading && products.length > 0 && (
          <button
            className="home-category-scroll-arrow home-category-scroll-left"
            onClick={() => scroll('left')}
          >
            <i className="fas fa-chevron-left"></i>
          </button>
        )}

        <div
          className="product-scroll-container"
          ref={scrollRef}
          style={{ paddingLeft: '20px' }}
        >
          {loading ? (
            <div className="product-loader show">
              <div className="product-loader-spinner"></div>
              <div className="product-loader-text">Loading {section.name.toLowerCase()}...</div>
            </div>
          ) : products.length > 0 ? (
            products.map((product) => (
              <Card key={product.id} product={product} variant="scroll" />
            ))
          ) : (
            <p style={{ padding: '40px', color: '#999', textAlign: 'center', width: '100%' }}>
              No products in {section.name} yet
            </p>
          )}
        </div>

        {!loading && products.length > 0 && (
          <button
            className="home-category-scroll-arrow home-category-scroll-right"
            onClick={() => scroll('right')}
          >
            <i className="fas fa-chevron-right"></i>
          </button>
        )}
      </div>

      <div className="home-category-cta">
        <Link to={viewAllUrl} className="home-category-view-all" style={{ textDecoration: 'none' }}>
          VIEW ALL
        </Link>
      </div>
    </section>
  );
}
