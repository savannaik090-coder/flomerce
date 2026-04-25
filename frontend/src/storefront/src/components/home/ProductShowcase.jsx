import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSiteConfig } from '../../hooks/useSiteConfig.js';
import { useCart } from '../../hooks/useCart.js';
import { useCurrency } from '../../hooks/useCurrency.js';
import { resolveImageUrl } from '../../utils/imageUrl.js';
import * as productService from '../../services/productService.js';
import TranslatedText from '../TranslatedText.jsx';

export default function ProductShowcase() {
  const { siteConfig } = useSiteConfig();
  const { addToCart } = useCart();
  const { formatAmount } = useCurrency();
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const showcaseImage = siteConfig?.settings?.showcaseImage || '';
  const showcaseTitle = siteConfig?.settings?.showcaseTitle || '';

  useEffect(() => {
    if (!siteConfig?.id) return;
    productService
      .getProducts(siteConfig.id, { featured: true, limit: 4 })
      .then((res) => setProducts(res.data || res.products || []))
      .catch(console.error);
  }, [siteConfig?.id]);

  const dots = siteConfig?.settings?.showcaseDots || [
    { className: 'dot-necklace', top: '40%', left: '50%' },
    { className: 'dot-earrings', top: '27%', left: '34%' },
    { className: 'dot-bangle', bottom: '37%', right: '82%' },
  ];

  if (!showcaseImage && !products.length) return null;

  return (
    <section className="interactive-showcase-section">
      <div className="interactive-showcase-container">
        <div className="showcase-header">
          <h2 className="section-title">
            {showcaseTitle
              ? <TranslatedText text={showcaseTitle} />
              : <TranslatedText text="Lumina Collection" />}
          </h2>
        </div>
        <div className="showcase-content">
          {showcaseImage && (
            <div className="showcase-image-container">
              <img src={showcaseImage} alt={showcaseTitle} className="showcase-main-image" />
              {dots.map((dot, i) => (
                <div
                  key={i}
                  className={`product-dot ${dot.className || ''}`}
                  style={{
                    top: dot.top,
                    left: dot.left,
                    bottom: dot.bottom,
                    right: dot.right,
                  }}
                  onClick={() => products[i] && setSelectedProduct(products[i])}
                />
              ))}
            </div>
          )}

          <div className="showcase-products-wrapper">
            <div className="showcase-product-list">
              {products.slice(0, 4).map((product) => (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  className="showcase-product-item"
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <img
                    src={resolveImageUrl(product.images?.[0] || product.image_url || '')}
                    alt={product.name}
                    className="showcase-product-thumb"
                  />
                  <div className="showcase-product-info">
                    <div className="showcase-product-name"><TranslatedText text={product.name} /></div>
                    <div className="showcase-product-price">{formatAmount(product.price)}</div>
                  </div>
                </Link>
              ))}
            </div>
            {products.length > 0 && (
              <button
                className="add-set-to-bag-btn"
                onClick={() => products.forEach((p) => addToCart(p, 1))}
              >
                <TranslatedText text="Add Set to Bag" />
              </button>
            )}
          </div>
        </div>
      </div>

      {selectedProduct && (
        <div
          className="product-popup-modal active"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedProduct(null);
          }}
        >
          <div className="product-popup-content">
            <button className="popup-close-btn" onClick={() => setSelectedProduct(null)}>
              &times;
            </button>
            <img
              src={selectedProduct.images?.[0] || selectedProduct.image_url || ''}
              alt={selectedProduct.name}
              className="popup-product-image"
            />
            <div className="popup-product-details">
              <h3 className="popup-product-name"><TranslatedText text={selectedProduct.name} /></h3>
              <div className="popup-product-price">{formatAmount(selectedProduct.price)}</div>
              <p className="popup-product-description">
                {selectedProduct.description ? <TranslatedText text={selectedProduct.description} /> : ''}
              </p>
              <div className="popup-action-buttons">
                <button
                  className="popup-add-to-cart-btn"
                  onClick={() => {
                    addToCart(selectedProduct, 1);
                    setSelectedProduct(null);
                  }}
                >
                  <TranslatedText text="Add to Cart" />
                </button>
                <Link
                  to={`/product/${selectedProduct.id}`}
                  className="popup-view-details-btn"
                  style={{ textAlign: 'center', textDecoration: 'none' }}
                  onClick={() => setSelectedProduct(null)}
                >
                  <TranslatedText text="View Details" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
