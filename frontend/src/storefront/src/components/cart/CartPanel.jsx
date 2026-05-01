import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from '../../context/CartContext.jsx';
import { useCurrency } from '../../hooks/useCurrency.js';
import { resolveImageUrl } from '../../utils/imageUrl.js';
import { useTheme } from '../../context/ThemeContext.jsx';
import TranslatedText from '../TranslatedText';

function getItemImage(item) {
  return item.product_image || item.image_url || item.thumbnail || (item.images && item.images[0]) || '';
}

function getItemPrice(item) {
  return item.product_price || item.price || 0;
}

function getItemName(item) {
  return item.product_name || item.name || '';
}

function SelectedOptionsDisplay({ selectedOptions }) {
  if (!selectedOptions) return null;
  const parts = [];
  if (selectedOptions.color) {
    parts.push(<><TranslatedText text="Color" />{`: ${selectedOptions.color}`}</>);
  }
  if (selectedOptions.customOptions) {
    for (const [label, value] of Object.entries(selectedOptions.customOptions)) {
      parts.push(<><TranslatedText text={label} />{`: ${value}`}</>);
    }
  }
  if (selectedOptions.pricedOptions) {
    for (const [label, val] of Object.entries(selectedOptions.pricedOptions)) {
      parts.push(<><TranslatedText text={label} />{`: ${val.name}`}</>);
    }
  }
  if (parts.length === 0) return null;
  return (
    <div style={{ fontSize: 11, color: 'var(--panel-muted, #888)', marginTop: 2, lineHeight: 1.4 }}>
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          {i > 0 ? ' \u2022 ' : ''}
          {p}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function CartPanel({ isOpen, onClose }) {
  const { items, subtotal, updateQuantity, removeItem, cartItemKey } = useContext(CartContext);
  const { formatAmount } = useCurrency();
  const navigate = useNavigate();
  const { isModern } = useTheme();
  const themeClass = isModern ? 'modern-theme' : '';

  return (
    <div className={themeClass}>
      <div className={`cart-panel-overlay${isOpen ? ' active' : ''}`} onClick={onClose}></div>
      <div className={`cart-panel${isOpen ? ' active' : ''}`}>
        <div className="cart-panel-header">
          <h3><TranslatedText text="Your Shopping Bag" /></h3>
          <button className="close-cart-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="cart-items">
          {items.length === 0 ? (
            <div className="empty-cart-message"><TranslatedText text="Your cart is empty" /></div>
          ) : (
            items.map((item, idx) => {
              const itemId = item.productId || item.product_id || item.id;
              const itemKey = cartItemKey ? cartItemKey(item) : itemId;
              return (
              <div className="cart-item" key={itemKey || idx}>
                <div className="cart-item-image" style={{ cursor: item.slug ? 'pointer' : 'default' }} onClick={() => { if (item.slug) { onClose(); navigate(`/product/${item.slug}`); } }}>
                  <img
                    src={resolveImageUrl(getItemImage(item))}
                    alt={getItemName(item)}
                    onError={(e) => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect fill="%23f0f0f0" width="80" height="80"/></svg>'; }}
                  />
                </div>
                <div className="cart-item-details">
                  <div className="cart-item-name" style={{ cursor: item.slug ? 'pointer' : 'default' }} onClick={() => { if (item.slug) { onClose(); navigate(`/product/${item.slug}`); } }}>{getItemName(item)}</div>
                  <SelectedOptionsDisplay selectedOptions={item.selectedOptions} />
                  <div className="cart-item-price">{formatAmount(getItemPrice(item))}</div>
                  <div className="cart-item-quantity">
                    <button className="quantity-btn" onClick={() => updateQuantity(itemKey, (item.quantity || 1) - 1, item.selectedOptions)}>-</button>
                    <input type="text" className="quantity-input" value={item.quantity || 1} readOnly />
                    <button className="quantity-btn" onClick={() => updateQuantity(itemKey, (item.quantity || 1) + 1, item.selectedOptions)}>+</button>
                  </div>
                  <div className="cart-item-total">{formatAmount(getItemPrice(item) * (item.quantity || 1))}</div>
                </div>
                <button className="remove-item-btn" onClick={() => removeItem(itemKey, item.selectedOptions)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
            );})
          )}
        </div>

        <div className="cart-panel-footer">
          <div className="cart-panel-subtotal">
            <span><TranslatedText text="Subtotal:" /></span>
            <span className="subtotal-amount">{formatAmount(subtotal)}</span>
          </div>
          <div className="cart-panel-buttons">
            <button className="view-cart-btn" onClick={onClose}><TranslatedText text="Continue Shopping" /></button>
            <a
              href="#"
              className="checkout-btn"
              onClick={(e) => {
                e.preventDefault();
                onClose();
                navigate('/checkout');
              }}
            >
              <TranslatedText text="Checkout" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
