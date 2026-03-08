import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SiteContext } from '../context/SiteContext.jsx';
import { useCart } from '../hooks/useCart.js';
import { useWishlist } from '../hooks/useWishlist.js';
import { formatINR } from '../utils/priceFormatter.js';
import * as productService from '../services/productService.js';
import ProductGallery from '../components/product/ProductGallery.jsx';
import RelatedProducts from '../components/product/RelatedProducts.jsx';
import '../styles/product-detail.css';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { siteConfig } = useContext(SiteContext);
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewImageModal, setReviewImageModal] = useState(null);

  useEffect(() => {
    if (!id) return;

    async function loadProduct() {
      setLoading(true);
      setError(null);
      try {
        const result = await productService.getProductById(id);
        const prod = result.data || result.product || result;
        if (!prod || !prod.id) {
          setError('Product not found');
          return;
        }

        if (prod.images && typeof prod.images === 'string') {
          try {
            prod.images = JSON.parse(prod.images);
          } catch {
            prod.images = prod.images ? [prod.images] : [];
          }
        }

        if (!prod.images || !Array.isArray(prod.images)) {
          prod.images = [];
        }

        if (prod.image_url && prod.images.length === 0) {
          prod.images = [prod.image_url];
        }
        if (prod.thumbnail_url && !prod.images.includes(prod.thumbnail_url)) {
          prod.images.unshift(prod.thumbnail_url);
        }

        setProduct(prod);
      } catch (err) {
        console.error('Failed to load product:', err);
        setError('Failed to load product');
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [id]);

  useEffect(() => {
    if (product?.name && siteConfig?.brandName) {
      document.title = `${product.name} - ${siteConfig.brandName}`;
    }
  }, [product?.name, siteConfig?.brandName]);

  function handleAddToCart() {
    if (!product) return;
    addToCart(product, 1);
  }

  function handleBuyNow() {
    if (!product) return;
    addToCart(product, 1);
    navigate('/checkout');
  }

  function handleWishlistToggle() {
    if (!product) return;
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  }

  if (loading) {
    return (
      <div className="product-detail-loading">
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" />
          <p style={{ marginTop: 15, color: '#666' }}>Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="product-not-found">
        <h2>Product Not Found</h2>
        <p>Sorry, we couldn't find the product you're looking for.</p>
        <a href="/" className="back-btn">Return to Homepage</a>
      </div>
    );
  }

  const isOutOfStock = product.stock !== undefined && product.stock !== null && product.stock <= 0;
  const productInWishlist = isInWishlist(product.id);

  const categoryName = product.category
    ? product.category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    : 'Uncategorized';

  const reviews = product.reviews || [];

  return (
    <div>
      <div className="product-detail-container">
        <ProductGallery
          images={product.images}
          productName={product.name}
        />

        <div className="product-detail-right">
          <div className="product-detail-info">
            <h1 className="product-title">{product.name}</h1>
            <div className="price">
              <span className="product-price">{formatINR(product.price)}</span>
            </div>

            <div className="product-meta">
              <div className="meta-item">
                <span className="meta-label">Brand:</span>
                <span className="meta-value">{siteConfig?.brandName || 'Store'}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Availability:</span>
                <span className={`meta-value ${isOutOfStock ? 'out-of-stock' : 'in-stock'}`}>
                  {isOutOfStock ? 'Out of Stock ✗' : 'In Stock ✓'}
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-label">SKU:</span>
                <span className="meta-value">{product.sku || product.id}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Category:</span>
                <span className="meta-value">{categoryName}</span>
              </div>
            </div>

            <div className="product-actions">
              <button
                className="add-to-cart-btn"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
              >
                {isOutOfStock ? 'OUT OF STOCK' : 'ADD TO CART'}
              </button>
              <button
                className="buy-now-btn"
                onClick={handleBuyNow}
                disabled={isOutOfStock}
              >
                BUY NOW
              </button>
              <button
                className={`add-to-wishlist-btn${productInWishlist ? ' active' : ''}`}
                onClick={handleWishlistToggle}
              >
                <i className="fas fa-heart" />
                {productInWishlist ? 'REMOVE FROM WISHLIST' : 'ADD TO WISHLIST'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {product.description && (
        <div className="product-description-section">
          <h3>Product Description</h3>
          <p>{product.description}</p>
        </div>
      )}

      {reviews.length > 0 && (
        <div className="product-reviews-section">
          <h2 className="section-title">Customer Reviews</h2>
          {reviews.map((review, idx) => (
            <div key={idx} className="review-card">
              <div className="review-header">
                <div className="review-stars">
                  {[...Array(5)].map((_, i) => (
                    <span key={i}>{i < (review.rating || 5) ? '★' : '☆'}</span>
                  ))}
                </div>
                <span className="review-author">{review.author || 'Customer'}</span>
                {review.verified && <span className="verified-badge">Verified Purchase</span>}
              </div>
              <p className="review-text">{review.text}</p>
              {review.images && review.images.length > 0 && (
                <div className="review-images">
                  {review.images.map((img, i) => (
                    <img
                      key={i}
                      className="review-image"
                      src={img}
                      alt={`Review ${i + 1}`}
                      onClick={() => setReviewImageModal(img)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {reviewImageModal && (
        <div className="review-image-modal" onClick={() => setReviewImageModal(null)}>
          <button className="close-modal" onClick={() => setReviewImageModal(null)}>×</button>
          <img src={reviewImageModal} alt="Review" />
        </div>
      )}

      <RelatedProducts
        currentProductId={product.id}
        categoryId={product.category_id}
        onWishlistToggle={(p) => {
          if (isInWishlist(p.id)) {
            removeFromWishlist(p.id);
          } else {
            addToWishlist(p);
          }
        }}
        isInWishlist={isInWishlist}
      />
    </div>
  );
}
