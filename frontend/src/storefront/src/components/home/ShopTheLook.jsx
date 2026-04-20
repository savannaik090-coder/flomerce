import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSiteConfig } from '../../hooks/useSiteConfig.js';
import { getProducts } from '../../services/productService.js';
import { useCurrency } from '../../hooks/useCurrency.js';
import { resolveImageUrl } from '../../utils/imageUrl.js';
import { getShopTheLookDefaults } from '../../defaults/index.js';

export default function ShopTheLook() {
  const { siteConfig } = useSiteConfig();
  const { formatAmount } = useCurrency();
  const [allProducts, setAllProducts] = useState([]);
  const [popupProduct, setPopupProduct] = useState(null);
  const imgRef = useRef(null);

  const settings = siteConfig?.settings || {};
  const savedConfig = settings.shopTheLook || {};
  const isHidden = settings.showShopTheLook === false;

  const hasSavedData = savedConfig.title || savedConfig.image || (savedConfig.dots && savedConfig.dots.length > 0);
  const defaults = !hasSavedData ? getShopTheLookDefaults(siteConfig?.category || 'generic') : null;
  const config = hasSavedData ? savedConfig : (defaults || {});

  const dots = config.dots || [];
  const title = config.title || '';
  const mainImage = config.image || '';

  const dotsKey = useMemo(() => JSON.stringify(dots), [dots]);

  useEffect(() => {
    if (!siteConfig?.id || !dots.length) return;
    getProducts(siteConfig.id, { limit: 500 })
      .then(res => {
        setAllProducts(res.data || res.products || []);
      })
      .catch(console.error);
  }, [siteConfig?.id]);

  const products = useMemo(() => {
    if (!allProducts.length || !dots.length) return [];
    return dots
      .map(dot => {
        const sku = String(dot.sku || '');
        if (!sku) return { dotX: dot.x, dotY: dot.y, sku, unmatched: true };
        const found = allProducts.find(p => String(p.sku) === sku || String(p.id) === sku);
        if (!found) return { dotX: dot.x, dotY: dot.y, sku, unmatched: true };
        let imgs = found.images;
        if (typeof imgs === 'string') { try { imgs = JSON.parse(imgs); } catch(e) { imgs = []; } }
        const raw = Array.isArray(imgs) ? (typeof imgs[0] === 'string' ? imgs[0] : imgs[0]?.url) : null;
        const image = raw || found.thumbnail_url || found.image_url || found.image || found.mainImage || '';
        return {
          id: found.id,
          name: found.name,
          price: found.price,
          originalPrice: found.compare_at_price || found.originalPrice || null,
          image: resolveImageUrl(image),
          description: found.description || found.name,
          dotX: dot.x,
          dotY: dot.y,
          sku,
        };
      })
      .filter(p => !p.unmatched);
  }, [allProducts, dotsKey]);

  if (isHidden || !mainImage || !dots.length) return null;

  function handleAddAllToCart() {
    if (typeof window !== 'undefined' && window.addToCartFromShopTheLook) {
      products.forEach(p => window.addToCartFromShopTheLook(p));
    }
  }

  return (
    <section className="stl-section" data-flomerce-section="shop-the-look">
      <div className="stl-container">
        {title && (
          <div className="stl-header">
            <h2 className="section-title">{title}</h2>
          </div>
        )}
        <div className="stl-content">
          <div className="stl-image-container">
            <img ref={imgRef} src={resolveImageUrl(mainImage)} alt={title || 'Shop the Look'} className="stl-main-image" />
            {products.map((product, i) => (
              <div
                key={product.id || i}
                className="stl-dot"
                style={{ left: `${product.dotX}%`, top: `${product.dotY}%` }}
                title={product.name}
                onClick={() => setPopupProduct(product)}
              />
            ))}
          </div>
          <div className="stl-products-wrapper">
            <div className="stl-product-list">
              {products.map((product, i) => (
                <Link
                  key={product.id || i}
                  to={`/product/${product.id}`}
                  className="stl-product-item"
                >
                  {product.image && (
                    <img src={product.image} alt={product.name} className="stl-product-thumb" />
                  )}
                  <div className="stl-product-info">
                    <div className="stl-product-name">{product.name}</div>
                    <div className="stl-product-price">
                      {formatAmount(product.price)}
                      {product.originalPrice && Number(product.originalPrice) > Number(product.price) && (
                        <span className="stl-product-original-price">{formatAmount(product.originalPrice)}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {popupProduct && (
        <div className="stl-popup-overlay" onClick={() => setPopupProduct(null)}>
          <div className="stl-popup-content" onClick={e => e.stopPropagation()}>
            <button className="stl-popup-close" onClick={() => setPopupProduct(null)}>&times;</button>
            {popupProduct.image && (
              <img src={popupProduct.image} alt={popupProduct.name} className="stl-popup-image" />
            )}
            <div className="stl-popup-details">
              <h3 className="stl-popup-name">{popupProduct.name}</h3>
              <div className="stl-popup-price">{formatAmount(popupProduct.price)}</div>
              <div className="stl-popup-actions">
                <Link
                  to={`/product/${popupProduct.id}`}
                  className="stl-popup-view-btn"
                  onClick={() => setPopupProduct(null)}
                >
                  View Details
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
