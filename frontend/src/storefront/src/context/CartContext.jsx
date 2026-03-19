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

function cartItemKey(item) {
  const pid = item.productId || item.product_id;
  const opts = item.selectedOptions ? JSON.stringify(item.selectedOptions) : '';
  return `${pid}::${opts}`;
}

function itemsMatch(a, b) {
  const pidA = a.productId || a.product_id;
  const pidB = b.productId || b.product_id;
  if (pidA !== pidB) return false;
  return JSON.stringify(a.selectedOptions || null) === JSON.stringify(b.selectedOptions || null);
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

  const addToCart = useCallback(async (product, quantity = 1, selectedOptions = null) => {
    if (!siteConfig?.id) return;
    const opKey = `add-${product.id}-${JSON.stringify(selectedOptions || '')}`;
    if (pendingOps.current.has(opKey)) return;

    let effectivePrice = product.price;
    if (selectedOptions?.pricedOptions) {
      const pricedValues = Object.values(selectedOptions.pricedOptions);
      const lastPriced = pricedValues[pricedValues.length - 1];
      if (lastPriced && Number(lastPriced.price) > 0) {
        effectivePrice = Number(lastPriced.price);
      }
    }

    const optimisticItem = {
      productId: product.id,
      product_id: product.id,
      name: product.name,
      product_name: product.name,
      price: effectivePrice,
      product_price: effectivePrice,
      basePrice: product.price,
      thumbnail: product.images?.[0] || product.thumbnail_url || product.image_url,
      product_image: product.images?.[0] || product.thumbnail_url || product.image_url,
      image_url: product.images?.[0] || product.thumbnail_url || product.image_url,
      quantity,
      selectedOptions: selectedOptions || null,
    };

    if (isAuthenticated) {
      setItems(prev => {
        const existing = prev.find(i => itemsMatch(i, optimisticItem));
        if (existing) {
          return prev.map(i =>
            itemsMatch(i, optimisticItem)
              ? { ...i, quantity: (i.quantity || 1) + quantity }
              : i
          );
        }
        return [...prev, optimisticItem];
      });

      pendingOps.current.add(opKey);
      try {
        await cartService.addToCart(siteConfig.id, product.id, quantity, null, selectedOptions);
      } catch (err) {
        console.error('Failed to add to cart:', err);
        await fetchCart();
      } finally {
        pendingOps.current.delete(opKey);
      }
    } else {
      const local = getLocalCart();
      const existing = local.find(i => itemsMatch(i, optimisticItem));
      if (existing) {
        existing.quantity += quantity;
      } else {
        local.push(optimisticItem);
      }
      setLocalCart(local);
      setItems([...local]);
    }
  }, [siteConfig?.id, isAuthenticated, fetchCart]);

  const updateQuantity = useCallback(async (itemKey, quantity, selectedOptions = null) => {
    if (quantity <= 0) return removeItem(itemKey, selectedOptions);

    if (isAuthenticated && siteConfig?.id) {
      setItems(prev =>
        prev.map(i => {
          const iKey = cartItemKey(i);
          if (iKey === itemKey || ((i.productId || i.product_id) === itemKey && !selectedOptions && !i.selectedOptions)) {
            return { ...i, quantity };
          }
          return i;
        })
      );

      const productId = itemKey.split('::')[0] || itemKey;
      try {
        await cartService.updateCartItem(siteConfig.id, productId, quantity, null, selectedOptions);
      } catch (err) {
        console.error('Failed to update cart:', err);
        await fetchCart();
      }
    } else {
      const local = getLocalCart();
      const item = local.find(i => {
        const iKey = cartItemKey(i);
        return iKey === itemKey || (i.productId === itemKey && !selectedOptions && !i.selectedOptions);
      });
      if (item) {
        item.quantity = quantity;
        setLocalCart(local);
        setItems([...local]);
      }
    }
  }, [isAuthenticated, siteConfig?.id, fetchCart]);

  const removeItem = useCallback(async (itemKey, selectedOptions = null) => {
    const opKey = `remove-${itemKey}`;
    if (pendingOps.current.has(opKey)) return;

    if (isAuthenticated && siteConfig?.id) {
      setItems(prev => prev.filter(i => {
        const iKey = cartItemKey(i);
        if (iKey === itemKey) return false;
        if ((i.productId || i.product_id) === itemKey && !selectedOptions && !i.selectedOptions) return false;
        return true;
      }));

      const productId = itemKey.split('::')[0] || itemKey;
      pendingOps.current.add(opKey);
      try {
        await cartService.removeFromCart(siteConfig.id, productId, selectedOptions);
      } catch (err) {
        console.error('Failed to remove from cart:', err);
        await fetchCart();
      } finally {
        pendingOps.current.delete(opKey);
      }
    } else {
      const local = getLocalCart().filter(i => {
        const iKey = cartItemKey(i);
        if (iKey === itemKey) return false;
        if (i.productId === itemKey && !selectedOptions && !i.selectedOptions) return false;
        return true;
      });
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
    <CartContext.Provider value={{ items, cartCount, subtotal, loading, addToCart, updateQuantity, removeItem, clearAll, refetchCart: fetchCart, cartItemKey }}>
      {children}
    </CartContext.Provider>
  );
}
