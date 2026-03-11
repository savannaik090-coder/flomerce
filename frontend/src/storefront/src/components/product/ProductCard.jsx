import React from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../../hooks/useWishlist.js';
import { formatINR } from '../../utils/priceFormatter.js';
import { resolveImageUrl } from '../../utils/imageUrl.js';

export default function ProductCard({ product, variant = 'grid', onWishlistToggle, isInWishlist: isInWishlistProp }) {
  const wishlist = useWishlist();

  if (!product) return null;

  const rawImageUrl = product.images?.[0] || product.thumbnail_url || product.image_url || '';
  const imageUrl = resolveImageUrl(rawImageUrl);
  const inWishlist = isInWishlistProp !== undefined ? isInWishlistProp : wishlist.isInWishlist(product.id);

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
    }
  };

  const isScroll = variant === 'scroll';

  return (
    <div
      className="product-item"
      style={{
        background: 'none',
        ...(isScroll
          ? {
              width: '280px',
              minWidth: '280px',
              maxWidth: '280px',
              flex: '0 0 280px',
            }
          : {}),
      }}
    >
      <Link
        to={`/product/${product.id}`}
        style={{ textDecoration: 'none', color: 'inherit' }}
      >
        <div className="product-image" style={{ position: 'relative', overflow: 'hidden' }}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              style={{
                width: '100%',
                height: isScroll ? '380px' : 'var(--product-image-height, 480px)',
                objectFit: 'cover',
                display: 'block',
              }}
              loading="lazy"
            />
          ) : (
            <div style={{
              width: '100%',
              height: isScroll ? '380px' : '480px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#999',
              fontSize: 14,
              background: '#f5f5f5',
            }}>
              No image
            </div>
          )}
          {product.discount_percentage > 0 && (
            <div
              className="product-badge"
              style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                background: '#e53e3e',
                color: '#fff',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '3px',
              }}
            >
              SAVE {product.discount_percentage}%
            </div>
          )}
          {product.stock !== undefined && product.stock <= 0 && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 600,
                fontSize: '14px',
                textTransform: 'uppercase',
              }}
            >
              Out of Stock
            </div>
          )}
          <button
            className={`add-to-wishlist${inWishlist ? ' active' : ''}`}
            onClick={toggleWishlist}
            aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: 'rgba(255,255,255,0.9)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '16px',
              transition: 'all 0.3s ease',
            }}
          >
            <i className={`${inWishlist ? 'fas' : 'far'} fa-heart`}
              style={{ color: inWishlist ? '#e53e3e' : '#333' }}
            ></i>
          </button>
        </div>
        <div className="product-details" style={{ textAlign: 'center', padding: '12px 8px' }}>
          <h3
            className="product-name"
            style={{
              fontFamily: "var(--font-product, 'Futura PT', sans-serif)",
              fontSize: '14px',
              fontWeight: 500,
              color: '#333',
              margin: '0 0 6px 0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {product.name}
          </h3>
          <div className="product-pricing">
            <span
              className="current-price"
              style={{
                fontFamily: "var(--font-primary, 'Lato', sans-serif)",
                fontSize: '15px',
                fontWeight: 600,
                color: '#333',
              }}
            >
              {formatINR(product.price)}
            </span>
            {product.original_price && product.original_price > product.price && (
              <>
                <span
                  className="original-price"
                  style={{
                    fontSize: '13px',
                    color: '#999',
                    textDecoration: 'line-through',
                    marginLeft: '8px',
                  }}
                >
                  {formatINR(product.original_price)}
                </span>
                <span
                  className="discount-tag"
                  style={{
                    fontSize: '12px',
                    color: '#e53e3e',
                    marginLeft: '6px',
                    fontWeight: 600,
                  }}
                >
                  -{Math.round(((product.original_price - product.price) / product.original_price) * 100)}%
                </span>
              </>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
