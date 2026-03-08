import React from 'react';
import ProductCard from './ProductCard.jsx';

export default function ProductGrid({ products, onWishlistToggle, isInWishlist }) {
  if (!products || products.length === 0) {
    return (
      <div className="empty-state">
        <h3>No Products Found</h3>
        <p>No products are available in this category yet.</p>
        <a href="/" className="browse-btn">Browse All Products</a>
      </div>
    );
  }

  return (
    <div className="products-grid">
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          onWishlistToggle={onWishlistToggle}
          isInWishlist={isInWishlist ? isInWishlist(product.id) : false}
        />
      ))}
    </div>
  );
}
