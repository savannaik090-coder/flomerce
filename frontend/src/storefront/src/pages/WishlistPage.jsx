import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { CurrencyContext } from '../context/CurrencyContext.jsx';
import { useWishlist } from '../hooks/useWishlist.js';
import { useTheme } from '../context/ThemeContext.jsx';
import { resolveImageUrl } from '../utils/imageUrl.js';
import '../components/templates/modern/modern.css';

function ClassicWishlistPage({ items, removeFromWishlist, formatAmount }) {
  return (
    <div style={{ maxWidth: 1000, margin: '40px auto 60px', padding: '0 20px' }}>
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
          {items.map(item => {
            const pid = item.productId || item.product_id;
            const name = item.name || item.product_name;
            const price = item.price || item.product_price || 0;
            const image = resolveImageUrl(item.thumbnail || item.product_image || '');
            return (
              <div key={pid} style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden', transition: 'box-shadow 0.3s ease', position: 'relative' }}>
                <Link to={`/product/${pid}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                  <div style={{ height: 280, overflow: 'hidden', background: '#f5f5f5' }}>
                    {image ? (
                      <img src={image} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>No Image</div>
                    )}
                  </div>
                  <div style={{ padding: 16 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: '#333' }}>{name}</h3>
                    <p style={{ color: '#c8a97e', fontWeight: 'bold', fontSize: 16, margin: 0 }}>{formatAmount(price)}</p>
                  </div>
                </Link>
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeFromWishlist(pid); }} style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', color: '#e74c3c', border: 'none', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}>x</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ModernWishlistPage({ items, removeFromWishlist, formatAmount }) {
  return (
    <div className="mn-wishlist-page">
      <h1>My Wishlist</h1>
      {items.length === 0 ? (
        <div className="mn-wishlist-empty">
          <h2>Your wishlist is empty</h2>
          <p>Browse our products and add your favorites here.</p>
          <Link to="/">Browse Products</Link>
        </div>
      ) : (
        <div className="mn-wishlist-grid">
          {items.map(item => {
            const pid = item.productId || item.product_id;
            const name = item.name || item.product_name;
            const price = item.price || item.product_price || 0;
            const image = resolveImageUrl(item.thumbnail || item.product_image || '');
            return (
              <div key={pid} className="mn-wishlist-card">
                <Link to={`/product/${pid}`}>
                  <div className="mn-wishlist-card-img">
                    {image ? (
                      <img src={image} alt={name} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>No Image</div>
                    )}
                  </div>
                  <div className="mn-wishlist-card-info">
                    <h3>{name}</h3>
                    <p>{formatAmount(price)}</p>
                  </div>
                </Link>
                <button className="mn-wishlist-remove" onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeFromWishlist(pid); }}>×</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function WishlistPage() {
  const { items, removeFromWishlist, loading } = useWishlist();
  const { formatAmount } = useContext(CurrencyContext);
  const { isModern } = useTheme();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ width: 40, height: 40, border: '4px solid #f3f3f3', borderTop: `4px solid ${isModern ? '#111' : '#c8a97e'}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const pageProps = { items, removeFromWishlist, formatAmount };

  return isModern
    ? <ModernWishlistPage {...pageProps} />
    : <ClassicWishlistPage {...pageProps} />;
}
