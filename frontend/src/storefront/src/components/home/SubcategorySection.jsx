import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSiteConfig } from '../../hooks/useSiteConfig.js';
import { useTheme } from '../../context/ThemeContext.jsx';
import * as productService from '../../services/productService.js';
import ProductCard from '../product/ProductCard.jsx';
import ProductCardModern from '../templates/modern/ProductCardModern.jsx';
import { getDemoProductsForCategory } from '../../defaults/index.js';
import TranslatedText from '../TranslatedText.jsx';

export default function SubcategorySection({ section }) {
  const { siteConfig } = useSiteConfig();
  const theme = useTheme();
  const Card = theme.id === 'modern' ? ProductCardModern : ProductCard;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!siteConfig?.id || !section?.subcategoryId) {
      setProducts(getDemoProductsForCategory(siteConfig?.category, section?.name));
      setIsDemo(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    productService
      .getProducts(siteConfig.id, { subcategoryId: section.subcategoryId, limit: 20 })
      .then((res) => {
        const list = res.data || res.products || [];
        if (list.length === 0) {
          setProducts(getDemoProductsForCategory(siteConfig?.category, section?.name));
          setIsDemo(true);
        } else {
          setProducts(list);
          setIsDemo(false);
        }
      })
      .catch(() => {
        setProducts(getDemoProductsForCategory(siteConfig?.category, section?.name));
        setIsDemo(true);
      })
      .finally(() => setLoading(false));
  }, [siteConfig?.id, siteConfig?.category, section?.subcategoryId, section?.name]);

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
        <h2 className="section-title"><TranslatedText text={section.name} /></h2>
        {section.subtitle && (
          <p className="section-subtitle"><TranslatedText text={section.subtitle} /></p>
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
          style={{ paddingInlineStart: '20px' }}
        >
          {loading ? (
            <div className="product-loader show">
              <div className="product-loader-spinner"></div>
              <div className="product-loader-text">
                <TranslatedText text="Loading" /> <TranslatedText text={section.name} />...
              </div>
            </div>
          ) : (
            products.map((product) => (
              <Card key={product.id} product={product} variant="scroll" isDemo={isDemo || product._isDemo} />
            ))
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
          <TranslatedText text="VIEW ALL" />
        </Link>
      </div>
    </section>
  );
}
