import React, { createContext, useState, useCallback } from 'react';

export const PanelContext = createContext(null);

export function PanelProvider({ children }) {
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const openCart = useCallback(() => setCartOpen(true), []);
  const closeCart = useCallback(() => setCartOpen(false), []);
  const openWishlist = useCallback(() => setWishlistOpen(true), []);
  const closeWishlist = useCallback(() => setWishlistOpen(false), []);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  return (
    <PanelContext.Provider value={{
      cartOpen, openCart, closeCart,
      wishlistOpen, openWishlist, closeWishlist,
      searchOpen, openSearch, closeSearch,
    }}>
      {children}
    </PanelContext.Provider>
  );
}
