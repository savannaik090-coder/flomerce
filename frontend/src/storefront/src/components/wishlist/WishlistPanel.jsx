import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from '../../context/CartContext.jsx';
import { useWishlist } from '../../hooks/useWishlist.js';
import { useCurrency } from '../../hooks/useCurrency.js';

export default function WishlistPanel({ isOpen, onClose }) {
  const { items, removeFromWishlist } = useWishlist();
  const { addToCart } = useContext(CartContext);
  const { formatAmount } = useCurrency();
  const navigate = useNavigate();

  function handleMoveToCart(item) {
    addToCart({
      id: item.product_id,
      name: item.product_name,
      price: item.product_price,
      images: [item.product_image],
      image_url: item.product_image,
    });
    removeFromWishlist(item.id);
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
              <div className="wishlist-item" key={item.id}>
                <img
                  className="wishlist-item-image"
                  src={item.product_image || ''}
                  alt={item.product_name || ''}
                  onError={(e) => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect fill="%23f0f0f0" width="80" height="80"/></svg>'; }}
                  onClick={() => { onClose(); navigate(`/product/${item.product_id}`); }}
                  style={{ cursor: 'pointer' }}
                />
                <div className="wishlist-item-details">
                  <div className="wishlist-item-name">{item.product_name}</div>
                  <div className="wishlist-item-price">{formatAmount(item.product_price)}</div>
                  <div className="wishlist-item-actions">
                    <button className="remove-from-wishlist" onClick={() => removeFromWishlist(item.id)}>Remove</button>
                    <button className="move-to-cart" onClick={() => handleMoveToCart(item)}>Move to Cart</button>
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
