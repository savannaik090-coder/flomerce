import { apiRequest, config, getSessionId } from './config.js';

class CartService {
  constructor() {
    this.siteId = null;
    this.cartListeners = [];
  }

  setSiteId(siteId) {
    this.siteId = siteId;
  }

  async getCart() {
    if (!this.siteId) {
      return { success: false, error: 'Site ID not set', cart: { items: [], itemCount: 0, subtotal: 0 } };
    }

    try {
      const response = await apiRequest(`${config.endpoints.cart}?siteId=${this.siteId}`);
      const cart = response.data || { items: [], itemCount: 0, subtotal: 0 };
      this.notifyListeners(cart);
      return { success: true, cart };
    } catch (error) {
      const localCart = this.getLocalCart();
      return { success: true, cart: localCart };
    }
  }

  async addToCart(productId, quantity = 1, variant = null) {
    if (!this.siteId) {
      return { success: false, error: 'Site ID not set' };
    }

    try {
      const response = await apiRequest(`${config.endpoints.cart}?siteId=${this.siteId}`, {
        method: 'POST',
        body: JSON.stringify({ productId, quantity, variant }),
      });

      this.notifyListeners({ itemCount: response.data?.itemCount || 0 });
      return { success: true, itemCount: response.data?.itemCount };
    } catch (error) {
      if (error.code === 'INSUFFICIENT_STOCK') {
        return { success: false, error: 'Not enough stock available' };
      }
      
      this.addToLocalCart(productId, quantity, variant);
      return { success: true };
    }
  }

  async updateQuantity(productId, quantity, variant = null) {
    if (!this.siteId) {
      return { success: false, error: 'Site ID not set' };
    }

    try {
      const response = await apiRequest(`${config.endpoints.cart}?siteId=${this.siteId}`, {
        method: 'PUT',
        body: JSON.stringify({ productId, quantity, variant }),
      });

      this.notifyListeners({ itemCount: response.data?.itemCount || 0 });
      return { success: true };
    } catch (error) {
      this.updateLocalCartQuantity(productId, quantity, variant);
      return { success: true };
    }
  }

  async removeFromCart(productId, variant = null) {
    if (!this.siteId) {
      return { success: false, error: 'Site ID not set' };
    }

    try {
      const params = new URLSearchParams({
        siteId: this.siteId,
        productId,
      });
      if (variant) {
        params.append('variant', JSON.stringify(variant));
      }

      const response = await apiRequest(`${config.endpoints.cart}?${params}`, {
        method: 'DELETE',
      });

      this.notifyListeners({ itemCount: response.data?.itemCount || 0 });
      return { success: true };
    } catch (error) {
      this.removeFromLocalCart(productId, variant);
      return { success: true };
    }
  }

  async clearCart() {
    const { cart } = await this.getCart();
    for (const item of cart.items) {
      await this.removeFromCart(item.productId, item.variant);
    }
    return { success: true };
  }

  getLocalCart() {
    const key = `cart_${this.siteId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return { items: [], itemCount: 0, subtotal: 0 };
      }
    }
    return { items: [], itemCount: 0, subtotal: 0 };
  }

  saveLocalCart(cart) {
    const key = `cart_${this.siteId}`;
    localStorage.setItem(key, JSON.stringify(cart));
    this.notifyListeners(cart);
  }

  addToLocalCart(productId, quantity, variant) {
    const cart = this.getLocalCart();
    const existingIndex = cart.items.findIndex(item => 
      item.productId === productId && JSON.stringify(item.variant) === JSON.stringify(variant)
    );

    if (existingIndex >= 0) {
      cart.items[existingIndex].quantity += quantity;
    } else {
      cart.items.push({ productId, quantity, variant, addedAt: new Date().toISOString() });
    }

    cart.itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    this.saveLocalCart(cart);
  }

  updateLocalCartQuantity(productId, quantity, variant) {
    const cart = this.getLocalCart();
    const existingIndex = cart.items.findIndex(item => 
      item.productId === productId && JSON.stringify(item.variant) === JSON.stringify(variant)
    );

    if (existingIndex >= 0) {
      if (quantity <= 0) {
        cart.items.splice(existingIndex, 1);
      } else {
        cart.items[existingIndex].quantity = quantity;
      }
    }

    cart.itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    this.saveLocalCart(cart);
  }

  removeFromLocalCart(productId, variant) {
    const cart = this.getLocalCart();
    cart.items = cart.items.filter(item => 
      !(item.productId === productId && JSON.stringify(item.variant) === JSON.stringify(variant))
    );
    cart.itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    this.saveLocalCart(cart);
  }

  onCartChanged(callback) {
    this.cartListeners.push(callback);
    return () => {
      this.cartListeners = this.cartListeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners(cart) {
    this.cartListeners.forEach(callback => callback(cart));
  }
}

export const cartService = new CartService();
export default cartService;
