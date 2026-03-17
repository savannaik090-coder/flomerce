import React, { createContext, useState, useEffect, useCallback, useContext, useRef } from 'react';
import { SiteContext } from './SiteContext.jsx';
import { AuthContext } from './AuthContext.jsx';
import * as wishlistService from '../services/wishlistService.js';

export const WishlistContext = createContext(null);

const LOCAL_WISHLIST_KEY = 'storefront_wishlist';

function getLocalWishlist() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_WISHLIST_KEY) || '[]');
  } catch {
    return [];
  }
}

function setLocalWishlist(items) {
  localStorage.setItem(LOCAL_WISHLIST_KEY, JSON.stringify(items));
}

export function WishlistProvider({ children }) {
  const { siteConfig } = useContext(SiteContext);
  const { isAuthenticated } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const pendingOps = useRef(new Set());

  const fetchWishlist = useCallback(async () => {
    if (!siteConfig?.id) return;

    if (isAuthenticated) {
      try {
        setLoading(true);
        const result = await wishlistService.getWishlist(siteConfig.id);
        setItems(result.data?.items || result.data || result.items || []);
      } catch (err) {
        console.error('Failed to fetch wishlist:', err);
        setItems(getLocalWishlist());
      } finally {
        setLoading(false);
      }
    } else {
      setItems(getLocalWishlist());
    }
  }, [siteConfig?.id, isAuthenticated]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const addToWishlist = useCallback(async (product) => {
    if (!siteConfig?.id) return;
    if (pendingOps.current.has(`add-${product.id}`)) return;

    const optimisticItem = {
      id: crypto.randomUUID(),
      productId: product.id,
      product_id: product.id,
      name: product.name,
      product_name: product.name,
      price: product.price,
      product_price: product.price,
      thumbnail: product.images?.[0] || product.thumbnail_url || product.image_url,
      product_image: product.images?.[0] || product.thumbnail_url || product.image_url,
    };

    if (isAuthenticated) {
      setItems(prev => {
        if (prev.some(i => i.productId === product.id || i.product_id === product.id)) return prev;
        return [...prev, optimisticItem];
      });

      pendingOps.current.add(`add-${product.id}`);
      try {
        await wishlistService.addToWishlist(siteConfig.id, product.id);
      } catch (err) {
        console.error('Failed to add to wishlist:', err);
        setItems(prev => prev.filter(i => i.id !== optimisticItem.id));
      } finally {
        pendingOps.current.delete(`add-${product.id}`);
      }
    } else {
      const local = getLocalWishlist();
      if (!local.find(i => i.productId === product.id)) {
        local.push(optimisticItem);
        setLocalWishlist(local);
        setItems([...local]);
      }
    }
  }, [siteConfig?.id, isAuthenticated]);

  const removeFromWishlist = useCallback(async (productId) => {
    if (!siteConfig?.id) return;
    if (pendingOps.current.has(`remove-${productId}`)) return;

    if (isAuthenticated) {
      setItems(prev => prev.filter(i => i.productId !== productId && i.product_id !== productId && i.id !== productId));

      pendingOps.current.add(`remove-${productId}`);
      try {
        await wishlistService.removeFromWishlist(siteConfig.id, productId);
      } catch (err) {
        console.error('Failed to remove from wishlist:', err);
        await fetchWishlist();
      } finally {
        pendingOps.current.delete(`remove-${productId}`);
      }
    } else {
      const local = getLocalWishlist().filter(i => i.productId !== productId && i.id !== productId);
      setLocalWishlist(local);
      setItems([...local]);
    }
  }, [siteConfig?.id, isAuthenticated, fetchWishlist]);

  const isInWishlist = useCallback((productId) => {
    return items.some(i => i.productId === productId || i.product_id === productId);
  }, [items]);

  const wishlistCount = items.length;

  return (
    <WishlistContext.Provider value={{ items, wishlistCount, loading, addToWishlist, removeFromWishlist, isInWishlist, refetchWishlist: fetchWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}
