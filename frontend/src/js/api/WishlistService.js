import { apiRequest, config } from './config.js';

class WishlistService {
  constructor() {
    this.siteId = null;
    this.wishlistListeners = [];
  }

  setSiteId(siteId) {
    this.siteId = siteId;
  }

  async getWishlist() {
    if (!this.siteId) {
      return { success: false, error: 'Site ID not set', wishlist: { items: [], count: 0 } };
    }

    try {
      const response = await apiRequest(`${config.endpoints.wishlist}?siteId=${this.siteId}`);
      const wishlist = response.data || { items: [], count: 0 };
      this.notifyListeners(wishlist);
      return { success: true, wishlist };
    } catch (error) {
      const localWishlist = this.getLocalWishlist();
      return { success: true, wishlist: localWishlist };
    }
  }

  async addToWishlist(productId) {
    if (!this.siteId) {
      return { success: false, error: 'Site ID not set' };
    }

    try {
      const response = await apiRequest(`${config.endpoints.wishlist}?siteId=${this.siteId}`, {
        method: 'POST',
        body: JSON.stringify({ productId }),
      });

      const { wishlist } = await this.getWishlist();
      this.notifyListeners(wishlist);
      return { success: true };
    } catch (error) {
      if (error.code === 'ALREADY_EXISTS') {
        return { success: false, error: 'Product already in wishlist' };
      }
      
      this.addToLocalWishlist(productId);
      return { success: true };
    }
  }

  async removeFromWishlist(productId) {
    if (!this.siteId) {
      return { success: false, error: 'Site ID not set' };
    }

    try {
      await apiRequest(`${config.endpoints.wishlist}?siteId=${this.siteId}&productId=${productId}`, {
        method: 'DELETE',
      });

      const { wishlist } = await this.getWishlist();
      this.notifyListeners(wishlist);
      return { success: true };
    } catch (error) {
      this.removeFromLocalWishlist(productId);
      return { success: true };
    }
  }

  async isInWishlist(productId) {
    const { wishlist } = await this.getWishlist();
    return wishlist.items.some(item => item.productId === productId);
  }

  async toggleWishlist(productId) {
    const inWishlist = await this.isInWishlist(productId);
    if (inWishlist) {
      return this.removeFromWishlist(productId);
    } else {
      return this.addToWishlist(productId);
    }
  }

  getLocalWishlist() {
    const key = `wishlist_${this.siteId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return { items: [], count: 0 };
      }
    }
    return { items: [], count: 0 };
  }

  saveLocalWishlist(wishlist) {
    const key = `wishlist_${this.siteId}`;
    localStorage.setItem(key, JSON.stringify(wishlist));
    this.notifyListeners(wishlist);
  }

  addToLocalWishlist(productId) {
    const wishlist = this.getLocalWishlist();
    if (!wishlist.items.some(item => item.productId === productId)) {
      wishlist.items.push({ productId, addedAt: new Date().toISOString() });
      wishlist.count = wishlist.items.length;
      this.saveLocalWishlist(wishlist);
    }
  }

  removeFromLocalWishlist(productId) {
    const wishlist = this.getLocalWishlist();
    wishlist.items = wishlist.items.filter(item => item.productId !== productId);
    wishlist.count = wishlist.items.length;
    this.saveLocalWishlist(wishlist);
  }

  onWishlistChanged(callback) {
    this.wishlistListeners.push(callback);
    return () => {
      this.wishlistListeners = this.wishlistListeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners(wishlist) {
    this.wishlistListeners.forEach(callback => callback(wishlist));
  }
}

export const wishlistService = new WishlistService();
export default wishlistService;
