import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSiteConfig } from '../../hooks/useSiteConfig.js';
import * as productService from '../../services/productService.js';
import ProductCard from '../product/ProductCard.jsx';

export default function NewArrivals() {
  const { siteConfig } = useSiteConfig();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!siteConfig?.id) return;
    setLoading(true);
    productService
      .getProducts(siteConfig.id, { sort: 'newest', limit: 12 })
      .then((res) => {
        setProducts(res.data || res.products || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [siteConfig?.id]);

  return (
    <>
      <div className="new-arrivals-header">
        <h2 className="section-title">New Arrivals</h2>
        <p className="section-subtitle">Discover our latest exquisite collections</p>
      </div>

      <section className="new-arrivals-edit full-width-section" style={{ marginBottom: '5px' }}>
        <div className="product-scroll-container" ref={scrollRef}>
          {loading ? (
            <div className="product-loader show">
              <div className="product-loader-spinner"></div>
              <div className="product-loader-text">Loading new arrivals...</div>
            </div>
          ) : products.length > 0 ? (
            products.map((product) => (
              <ProductCard key={product.id} product={product} variant="scroll" />
            ))
          ) : (
            <p style={{ padding: '40px', color: '#999', textAlign: 'center', width: '100%' }}>
              No new arrivals yet
            </p>
          )}
        </div>
        <div className="reviews-cta">
          <Link to="/category/new-arrivals" className="chat-now-btn" style={{ textDecoration: 'none' }}>
            VIEW ALL
          </Link>
        </div>
      </section>
    </>
  );
}
