import { useState, useEffect, useCallback, useContext } from 'react';
import { SiteContext } from '../context/SiteContext.jsx';
import { AuthContext } from '../context/AuthContext.jsx';
import * as wishlistService from '../services/wishlistService.js';

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

export function useWishlist() {
  const { siteConfig } = useContext(SiteContext);
  const { isAuthenticated } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchWishlist = useCallback(async () => {
    if (!siteConfig?.id) return;

    if (isAuthenticated) {
      try {
        setLoading(true);
        const result = await wishlistService.getWishlist(siteConfig.id);
        setItems(result.data || result.items || []);
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

    if (isAuthenticated) {
      try {
        await wishlistService.addToWishlist(siteConfig.id, product.id);
        await fetchWishlist();
      } catch (err) {
        console.error('Failed to add to wishlist:', err);
      }
    } else {
      const local = getLocalWishlist();
      if (!local.find(i => i.product_id === product.id)) {
        local.push({
          id: crypto.randomUUID(),
          product_id: product.id,
          product_name: product.name,
          product_price: product.price,
          product_image: product.images?.[0] || product.image_url,
        });
        setLocalWishlist(local);
        setItems([...local]);
      }
    }
  }, [siteConfig?.id, isAuthenticated, fetchWishlist]);

  const removeFromWishlist = useCallback(async (itemId) => {
    if (isAuthenticated) {
      try {
        await wishlistService.removeFromWishlist(itemId);
        await fetchWishlist();
      } catch (err) {
        console.error('Failed to remove from wishlist:', err);
      }
    } else {
      const local = getLocalWishlist().filter(i => i.id !== itemId);
      setLocalWishlist(local);
      setItems([...local]);
    }
  }, [isAuthenticated, fetchWishlist]);

  const isInWishlist = useCallback((productId) => {
    return items.some(i => i.product_id === productId || i.id === productId);
  }, [items]);

  const wishlistCount = items.length;

  return { items, wishlistCount, loading, addToWishlist, removeFromWishlist, isInWishlist, refetchWishlist: fetchWishlist };
}
