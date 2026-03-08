import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { SiteContext } from './SiteContext.jsx';
import { AuthContext } from './AuthContext.jsx';
import * as cartService from '../services/cartService.js';

export const CartContext = createContext(null);

const LOCAL_CART_KEY = 'storefront_cart';

function getLocalCart() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_CART_KEY) || '[]');
  } catch {
    return [];
  }
}

function setLocalCart(items) {
  localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items));
}

export function CartProvider({ children }) {
  const { siteConfig } = useContext(SiteContext);
  const { isAuthenticated } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  const fetchCart = useCallback(async () => {
    if (!siteConfig?.id) return;

    if (isAuthenticated) {
      try {
        setLoading(true);
        const result = await cartService.getCart(siteConfig.id);
        const cartItems = result.data || result.items || [];
        setItems(cartItems);
      } catch (err) {
        console.error('Failed to fetch cart:', err);
        setItems(getLocalCart());
      } finally {
        setLoading(false);
      }
    } else {
      setItems(getLocalCart());
    }
  }, [siteConfig?.id, isAuthenticated]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  useEffect(() => {
    setCartCount(items.reduce((sum, item) => sum + (item.quantity || 1), 0));
  }, [items]);

  useEffect(() => {
    if (isAuthenticated && siteConfig?.id) {
      cartService.mergeCarts(siteConfig.id).then(fetchCart).catch(console.error);
    }
  }, [isAuthenticated, siteConfig?.id]);

  const addToCart = useCallback(async (product, quantity = 1) => {
    if (!siteConfig?.id) return;

    if (isAuthenticated) {
      try {
        await cartService.addToCart(siteConfig.id, product.id, quantity);
        await fetchCart();
      } catch (err) {
        console.error('Failed to add to cart:', err);
      }
    } else {
      const local = getLocalCart();
      const existing = local.find(i => i.product_id === product.id);
      if (existing) {
        existing.quantity += quantity;
      } else {
        local.push({
          id: crypto.randomUUID(),
          product_id: product.id,
          product_name: product.name,
          product_price: product.price,
          product_image: product.images?.[0] || product.image_url,
          quantity,
        });
      }
      setLocalCart(local);
      setItems([...local]);
    }
  }, [siteConfig?.id, isAuthenticated, fetchCart]);

  const updateQuantity = useCallback(async (itemId, quantity) => {
    if (quantity <= 0) return removeItem(itemId);

    if (isAuthenticated) {
      try {
        await cartService.updateCartItem(itemId, quantity);
        await fetchCart();
      } catch (err) {
        console.error('Failed to update cart:', err);
      }
    } else {
      const local = getLocalCart();
      const item = local.find(i => i.id === itemId);
      if (item) {
        item.quantity = quantity;
        setLocalCart(local);
        setItems([...local]);
      }
    }
  }, [isAuthenticated, fetchCart]);

  const removeItem = useCallback(async (itemId) => {
    if (isAuthenticated) {
      try {
        await cartService.removeFromCart(itemId);
        await fetchCart();
      } catch (err) {
        console.error('Failed to remove from cart:', err);
      }
    } else {
      const local = getLocalCart().filter(i => i.id !== itemId);
      setLocalCart(local);
      setItems([...local]);
    }
  }, [isAuthenticated, fetchCart]);

  const clearAll = useCallback(async () => {
    if (isAuthenticated && siteConfig?.id) {
      try {
        await cartService.clearCart(siteConfig.id);
      } catch (err) {
        console.error('Failed to clear cart:', err);
      }
    }
    setLocalCart([]);
    setItems([]);
  }, [isAuthenticated, siteConfig?.id]);

  const subtotal = items.reduce((sum, item) => sum + (item.product_price || item.price || 0) * (item.quantity || 1), 0);

  return (
    <CartContext.Provider value={{ items, cartCount, subtotal, loading, addToCart, updateQuantity, removeItem, clearAll, refetchCart: fetchCart }}>
      {children}
    </CartContext.Provider>
  );
}
