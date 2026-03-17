import React, { createContext, useState, useEffect, useCallback, useContext, useRef } from 'react';
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
  const pendingOps = useRef(new Set());

  const fetchCart = useCallback(async () => {
    if (!siteConfig?.id) return;

    if (isAuthenticated) {
      try {
        setLoading(true);
        const result = await cartService.getCart(siteConfig.id);
        const cartItems = result.data?.items || result.data || result.items || [];
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
    if (pendingOps.current.has(`add-${product.id}`)) return;

    const optimisticItem = {
      productId: product.id,
      product_id: product.id,
      name: product.name,
      product_name: product.name,
      price: product.price,
      product_price: product.price,
      thumbnail: product.images?.[0] || product.thumbnail_url || product.image_url,
      product_image: product.images?.[0] || product.thumbnail_url || product.image_url,
      image_url: product.images?.[0] || product.thumbnail_url || product.image_url,
      quantity,
    };

    if (isAuthenticated) {
      setItems(prev => {
        const existing = prev.find(i => (i.productId || i.product_id) === product.id);
        if (existing) {
          return prev.map(i =>
            (i.productId || i.product_id) === product.id
              ? { ...i, quantity: (i.quantity || 1) + quantity }
              : i
          );
        }
        return [...prev, optimisticItem];
      });

      pendingOps.current.add(`add-${product.id}`);
      try {
        await cartService.addToCart(siteConfig.id, product.id, quantity);
      } catch (err) {
        console.error('Failed to add to cart:', err);
        await fetchCart();
      } finally {
        pendingOps.current.delete(`add-${product.id}`);
      }
    } else {
      const local = getLocalCart();
      const existing = local.find(i => i.productId === product.id);
      if (existing) {
        existing.quantity += quantity;
      } else {
        local.push(optimisticItem);
      }
      setLocalCart(local);
      setItems([...local]);
    }
  }, [siteConfig?.id, isAuthenticated, fetchCart]);

  const updateQuantity = useCallback(async (productId, quantity) => {
    if (quantity <= 0) return removeItem(productId);

    if (isAuthenticated && siteConfig?.id) {
      setItems(prev =>
        prev.map(i =>
          (i.productId || i.product_id) === productId
            ? { ...i, quantity }
            : i
        )
      );

      try {
        await cartService.updateCartItem(siteConfig.id, productId, quantity);
      } catch (err) {
        console.error('Failed to update cart:', err);
        await fetchCart();
      }
    } else {
      const local = getLocalCart();
      const item = local.find(i => i.productId === productId);
      if (item) {
        item.quantity = quantity;
        setLocalCart(local);
        setItems([...local]);
      }
    }
  }, [isAuthenticated, siteConfig?.id, fetchCart]);

  const removeItem = useCallback(async (productId) => {
    if (pendingOps.current.has(`remove-${productId}`)) return;

    if (isAuthenticated && siteConfig?.id) {
      setItems(prev => prev.filter(i => (i.productId || i.product_id) !== productId));

      pendingOps.current.add(`remove-${productId}`);
      try {
        await cartService.removeFromCart(siteConfig.id, productId);
      } catch (err) {
        console.error('Failed to remove from cart:', err);
        await fetchCart();
      } finally {
        pendingOps.current.delete(`remove-${productId}`);
      }
    } else {
      const local = getLocalCart().filter(i => i.productId !== productId);
      setLocalCart(local);
      setItems([...local]);
    }
  }, [isAuthenticated, siteConfig?.id, fetchCart]);

  const clearAll = useCallback(async () => {
    setItems([]);
    setLocalCart([]);

    if (isAuthenticated && siteConfig?.id) {
      try {
        await cartService.clearCart(siteConfig.id);
      } catch (err) {
        console.error('Failed to clear cart:', err);
        await fetchCart();
      }
    }
  }, [isAuthenticated, siteConfig?.id, fetchCart]);

  const subtotal = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);

  return (
    <CartContext.Provider value={{ items, cartCount, subtotal, loading, addToCart, updateQuantity, removeItem, clearAll, refetchCart: fetchCart }}>
      {children}
    </CartContext.Provider>
  );
}
