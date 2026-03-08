import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { CartContext } from '../context/CartContext.jsx';
import { CurrencyContext } from '../context/CurrencyContext.jsx';

export default function CartPage() {
  const { items, subtotal, updateQuantity, removeItem, loading } = useContext(CartContext);
  const { formatAmount } = useContext(CurrencyContext);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ width: 40, height: 40, border: '4px solid #f3f3f3', borderTop: '4px solid #c8a97e', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '140px auto 60px', padding: '0 20px' }}>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, marginBottom: 30, textAlign: 'center' }}>Shopping Cart</h1>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 60, marginBottom: 20 }}>🛒</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", marginBottom: 10, color: '#333' }}>Your cart is empty</h2>
          <p style={{ color: '#777', marginBottom: 24 }}>Looks like you haven't added anything to your cart yet.</p>
          <Link to="/" style={{ display: 'inline-block', background: '#c8a97e', color: '#fff', padding: '12px 24px', borderRadius: 4, textDecoration: 'none', fontWeight: 600 }}>Continue Shopping</Link>
        </div>
      ) : (
        <>
          <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            {items.map((item, idx) => {
              const price = item.product_price || item.price || 0;
              const qty = item.quantity || 1;
              const name = item.product_name || item.name;
              const image = item.product_image || item.image_url;
              return (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: idx < items.length - 1 ? '1px solid #f0f0f0' : 'none', gap: 16 }}>
                  <Link to={`/product/${item.product_id || item.id}`} style={{ flexShrink: 0 }}>
                    <div style={{ width: 80, height: 80, borderRadius: 6, overflow: 'hidden', background: '#f5f5f5' }}>
                      {image ? <img src={image} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 12 }}>No img</div>}
                    </div>
                  </Link>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 4px', color: '#333' }}>{name}</h3>
                    <p style={{ margin: 0, fontSize: 14, color: '#c8a97e', fontWeight: 600 }}>{formatAmount(price)}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #dee2e6', borderRadius: 4, overflow: 'hidden', height: 34 }}>
                    <button onClick={() => updateQuantity(item.id, qty - 1)} style={{ width: 32, height: 32, border: 'none', background: '#f8f9fa', cursor: 'pointer', fontWeight: 'bold', fontSize: 16 }}>-</button>
                    <span style={{ padding: '0 12px', fontSize: 14, fontWeight: 500, minWidth: 20, textAlign: 'center' }}>{qty}</span>
                    <button onClick={() => updateQuantity(item.id, qty + 1)} style={{ width: 32, height: 32, border: 'none', background: '#f8f9fa', cursor: 'pointer', fontWeight: 'bold', fontSize: 16 }}>+</button>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 80 }}>
                    <span style={{ fontWeight: 700, color: '#333' }}>{formatAmount(price * qty)}</span>
                  </div>
                  <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 20, padding: '4px 8px' }}>×</button>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, padding: '20px 0', borderTop: '2px solid #eee' }}>
            <span style={{ fontSize: 18, fontWeight: 600, fontFamily: "'Playfair Display', serif" }}>Subtotal</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#c8a97e' }}>{formatAmount(subtotal)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, gap: 16, flexWrap: 'wrap' }}>
            <Link to="/" style={{ padding: '12px 24px', border: '1px solid #c8a97e', color: '#c8a97e', borderRadius: 4, textDecoration: 'none', fontWeight: 500, textAlign: 'center' }}>Continue Shopping</Link>
            <Link to="/checkout" style={{ padding: '12px 32px', background: '#c8a97e', color: '#fff', borderRadius: 4, textDecoration: 'none', fontWeight: 600, textAlign: 'center' }}>Proceed to Checkout</Link>
          </div>
        </>
      )}
    </div>
  );
}
