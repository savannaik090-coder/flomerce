import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from '../../context/CartContext.jsx';
import { useCurrency } from '../../hooks/useCurrency.js';
import { resolveImageUrl } from '../../utils/imageUrl.js';

function getItemImage(item) {
  return item.product_image || item.image_url || item.thumbnail || (item.images && item.images[0]) || '';
}

function getItemPrice(item) {
  return item.product_price || item.price || 0;
}

function getItemName(item) {
  return item.product_name || item.name || '';
}

export default function CartPanel({ isOpen, onClose }) {
  const { items, subtotal, updateQuantity, removeItem } = useContext(CartContext);
  const { formatAmount } = useCurrency();
  const navigate = useNavigate();

  return (
    <>
      <div className={`cart-panel-overlay${isOpen ? ' active' : ''}`} onClick={onClose}></div>
      <div className={`cart-panel${isOpen ? ' active' : ''}`}>
        <div className="cart-panel-header">
          <h3>Your Shopping Bag</h3>
          <button className="close-cart-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="cart-items">
          {items.length === 0 ? (
            <div className="empty-cart-message">Your cart is empty</div>
          ) : (
            items.map((item) => (
              <div className="cart-item" key={item.id}>
                <div className="cart-item-image">
                  <img
                    src={resolveImageUrl(getItemImage(item))}
                    alt={getItemName(item)}
                    onError={(e) => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect fill="%23f0f0f0" width="80" height="80"/></svg>'; }}
                  />
                </div>
                <div className="cart-item-details">
                  <div className="cart-item-name">{getItemName(item)}</div>
                  <div className="cart-item-price">{formatAmount(getItemPrice(item))}</div>
                  <div className="cart-item-quantity">
                    <button className="quantity-btn" onClick={() => updateQuantity(item.id, (item.quantity || 1) - 1)}>−</button>
                    <input type="text" className="quantity-input" value={item.quantity || 1} readOnly />
                    <button className="quantity-btn" onClick={() => updateQuantity(item.id, (item.quantity || 1) + 1)}>+</button>
                  </div>
                  <div className="cart-item-total">{formatAmount(getItemPrice(item) * (item.quantity || 1))}</div>
                </div>
                <button className="remove-item-btn" onClick={() => removeItem(item.id)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
            ))
          )}
        </div>

        <div className="cart-panel-footer">
          <div className="cart-panel-subtotal">
            <span>Subtotal:</span>
            <span className="subtotal-amount">{formatAmount(subtotal)}</span>
          </div>
          <div className="cart-panel-buttons">
            <button className="view-cart-btn" onClick={onClose}>Continue Shopping</button>
            <a
              href="#"
              className="checkout-btn"
              onClick={(e) => {
                e.preventDefault();
                onClose();
                navigate('/checkout');
              }}
            >
              Checkout
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
