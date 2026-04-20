import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { PanelContext } from '../../../context/PanelContext.jsx';
import { useWishlist } from '../../../hooks/useWishlist.js';
import { useCurrency } from '../../../hooks/useCurrency.js';
import { resolveImageUrl } from '../../../utils/imageUrl.js';
import './modern.css';

export default function ProductCardModern({ product, variant = 'grid', onWishlistToggle, isInWishlist: isInWishlistProp, isDemo = false }) {
  const wishlist = useWishlist();
  const { openWishlist } = useContext(PanelContext);
  const { formatAmount } = useCurrency();

  if (!product) return null;

  const rawImageUrl = product.images?.[0] || product.thumbnail_url || product.image_url || '';
  const imageUrl = resolveImageUrl(rawImageUrl);
  const inWishlist = isInWishlistProp !== undefined ? isInWishlistProp : wishlist.isInWishlist(product.id);
  const isScroll = variant === 'scroll';
  const hasComparePrice = product.compare_at_price && product.compare_at_price > product.price;

  const toggleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onWishlistToggle) {
      onWishlistToggle(product);
      return;
    }
    if (inWishlist) {
      wishlist.removeFromWishlist(product.id);
    } else {
      wishlist.addToWishlist(product);
      openWishlist();
    }
  };

  return (
    <div
      className={`mn-product-card${isScroll ? ' mn-product-card--scroll' : ''}`}
    >
      <Link to={(isDemo || product._isDemo) ? '/' : `/product/${product.id}`} className="mn-product-link">
        <div className="mn-product-image-wrap">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              className="mn-product-img"
              loading="lazy"
            />
          ) : (
            <div className="mn-product-no-image">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21"/>
              </svg>
            </div>
          )}
          {product.stock !== undefined && product.stock <= 0 && (
            <div className="mn-product-oos">Out of Stock</div>
          )}
          <div className="mn-product-hover-overlay">
            <span className="mn-quick-view">Quick View</span>
          </div>
          <button
            className={`mn-wishlist-btn${inWishlist ? ' mn-wishlist-active' : ''}`}
            onClick={toggleWishlist}
            aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={inWishlist ? '#e53e3e' : 'none'} stroke={inWishlist ? '#e53e3e' : 'currentColor'} strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>
        <div className="mn-product-info">
          <h3 className="mn-product-name">{product.name}</h3>
          <div className="mn-product-pricing">
            <span className="mn-product-price">{formatAmount(product.price)}</span>
            {hasComparePrice && (
              <span className="mn-product-compare">{formatAmount(product.compare_at_price)}</span>
            )}
          </div>
          {product.category_name && (
            <span className="mn-product-category">{product.category_name}</span>
          )}
        </div>
      </Link>
    </div>
  );
}
