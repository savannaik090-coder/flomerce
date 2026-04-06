import React, { useState, useEffect, useContext } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import * as productService from '../../services/productService.js';
import ProductCard from './ProductCard.jsx';
import ProductCardModern from '../templates/modern/ProductCardModern.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';

function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function RelatedProducts({ currentProductId, categoryId, onWishlistToggle, isInWishlist }) {
  const { siteConfig } = useContext(SiteContext);
  const theme = useTheme();
  const Card = theme.id === 'modern' ? ProductCardModern : ProductCard;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!siteConfig?.id) return;
    setLoading(true);

    async function fetchRelated() {
      try {
        let result;
        if (categoryId) {
          result = await productService.getProductsByCategory(siteConfig.id, categoryId);
        } else {
          result = await productService.getProducts(siteConfig.id);
        }
        const allProducts = result.data || result.products || result || [];
        const filtered = allProducts.filter(p => p.id !== currentProductId);
        const shuffled = shuffleArray(filtered).slice(0, 6);
        setProducts(shuffled);
      } catch (err) {
        console.error('Failed to load related products:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchRelated();
  }, [siteConfig?.id, currentProductId, categoryId]);

  if (loading || products.length === 0) return null;

  return (
    <section className="related-products-section">
      <h2 className="section-title">You May Also Like</h2>
      <div className="related-products-scroll">
        {products.map(product => (
          <Card
            key={product.id}
            product={product}
            onWishlistToggle={onWishlistToggle}
            isInWishlist={isInWishlist ? isInWishlist(product.id) : false}
          />
        ))}
      </div>
    </section>
  );
}
