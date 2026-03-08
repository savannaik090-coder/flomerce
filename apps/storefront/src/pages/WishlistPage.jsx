import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { CartContext } from '../context/CartContext.jsx';
import { CurrencyContext } from '../context/CurrencyContext.jsx';
import { useWishlist } from '../hooks/useWishlist.js';

export default function WishlistPage() {
  const { items, removeFromWishlist, loading } = useWishlist();
  const { addToCart } = useContext(CartContext);
  const { formatAmount } = useContext(CurrencyContext);

  const handleMoveToCart = (item) => {
    addToCart({
      id: item.product_id,
      name: item.product_name,
      price: item.product_price,
      images: [item.product_image],
      image_url: item.product_image,
    });
    removeFromWishlist(item.id);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ width: 40, height: 40, border: '4px solid #f3f3f3', borderTop: '4px solid #c8a97e', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: '140px auto 60px', padding: '0 20px' }}>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, marginBottom: 30, textAlign: 'center' }}>My Wishlist</h1>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 60, marginBottom: 20 }}>♡</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", marginBottom: 10, color: '#333' }}>Your wishlist is empty</h2>
          <p style={{ color: '#777', marginBottom: 24 }}>Browse our products and add your favorites here.</p>
          <Link to="/" style={{ display: 'inline-block', background: '#c8a97e', color: '#fff', padding: '12px 24px', borderRadius: 4, textDecoration: 'none', fontWeight: 600 }}>Browse Products</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 20 }}>
          {items.map(item => (
            <div key={item.id} style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden', transition: 'box-shadow 0.3s ease' }}>
              <Link to={`/product/${item.product_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ height: 280, overflow: 'hidden', background: '#f5f5f5' }}>
                  {item.product_image ? (
                    <img src={item.product_image} alt={item.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>No Image</div>
                  )}
                </div>
              </Link>
              <div style={{ padding: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: '#333' }}>{item.product_name}</h3>
                <p style={{ color: '#c8a97e', fontWeight: 'bold', fontSize: 16, marginBottom: 12 }}>{formatAmount(item.product_price)}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleMoveToCart(item)} style={{ flex: 1, padding: '8px 12px', background: '#c8a97e', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Move to Cart</button>
                  <button onClick={() => removeFromWishlist(item.id)} style={{ padding: '8px 12px', background: '#fff', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
