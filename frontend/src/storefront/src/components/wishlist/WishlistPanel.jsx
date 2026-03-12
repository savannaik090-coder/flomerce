import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { WishlistContext } from '../../context/WishlistContext.jsx';
import { useCurrency } from '../../hooks/useCurrency.js';
import { resolveImageUrl } from '../../utils/imageUrl.js';

function getItemImage(item) {
  return item.product_image || item.thumbnail || item.image_url || (item.images && item.images[0]) || '';
}

function getItemPrice(item) {
  return item.product_price || item.price || 0;
}

function getItemName(item) {
  return item.product_name || item.name || '';
}

function getItemProductId(item) {
  return item.product_id || item.productId;
}

export default function WishlistPanel({ isOpen, onClose }) {
  const { items, removeFromWishlist } = useContext(WishlistContext);
  const { formatAmount } = useCurrency();
  const navigate = useNavigate();

  function handleItemClick(item) {
    onClose();
    navigate(`/product/${getItemProductId(item)}`);
  }

  return (
    <>
      <div className={`wishlist-overlay${isOpen ? ' active' : ''}`} onClick={onClose}></div>
      <div className={`wishlist-panel${isOpen ? ' active' : ''}`}>
        <div className="wishlist-panel-header">
          <h3>Your Wishlist ({items.length})</h3>
          <button className="close-wishlist-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="wishlist-items">
          {items.length === 0 ? (
            <div className="empty-cart-message" style={{ textAlign: 'center', padding: '30px 0', color: '#888' }}>
              Your wishlist is empty
            </div>
          ) : (
            items.map((item) => (
              <div
                className="wishlist-item"
                key={item.id || getItemProductId(item)}
                onClick={() => handleItemClick(item)}
                style={{ cursor: 'pointer' }}
              >
                <img
                  className="wishlist-item-image"
                  src={resolveImageUrl(getItemImage(item))}
                  alt={getItemName(item)}
                  onError={(e) => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect fill="%23f0f0f0" width="80" height="80"/></svg>'; }}
                />
                <div className="wishlist-item-details">
                  <div className="wishlist-item-name">{getItemName(item)}</div>
                  <div className="wishlist-item-price">{formatAmount(getItemPrice(item))}</div>
                  <div className="wishlist-item-actions">
                    <button
                      className="remove-from-wishlist"
                      onClick={(e) => { e.stopPropagation(); removeFromWishlist(item.id || getItemProductId(item)); }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="wishlist-panel-footer">
            <div className="wishlist-panel-actions">
              <button className="view-cart-btn" onClick={() => { onClose(); navigate('/wishlist'); }}>View All</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
