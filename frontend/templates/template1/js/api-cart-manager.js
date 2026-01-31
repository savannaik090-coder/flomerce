/**
 * API Cart Manager - REST API Based
 * Replaces API Cart Manager with Cloudflare Workers API
 * Syncs cart between local storage and server for logged-in users
 */

const ApiCartManager = (function() {
    const API_BASE = '/api/cart';

    /**
     * Initialize cart manager
     */
    function init() {
        console.log('Initializing API Cart Manager...');
        return true;
    }

    /**
     * Get auth token
     */
    function getToken() {
        return localStorage.getItem('auth_token');
    }

    /**
     * Check if user is authenticated
     */
    function isAuthenticated() {
        return !!getToken();
    }

    /**
     * Get cart items from server
     */
    async function getItems() {
        if (!isAuthenticated()) {
            return { success: false, items: [], error: 'Not authenticated' };
        }

        try {
            const response = await fetch(API_BASE, {
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                }
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to fetch cart');
            }

            return { success: true, items: result.data?.items || [] };
        } catch (error) {
            console.error('Get cart error:', error);
            return { success: false, items: [], error: error.message };
        }
    }

    /**
     * Add item to cart
     */
    async function addItem(product) {
        if (!isAuthenticated()) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            const response = await fetch(`${API_BASE}/items`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({
                    productId: product.id,
                    name: product.name,
                    price: product.price,
                    image: product.image,
                    quantity: product.quantity || 1
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to add item');
            }

            return { success: true, cart: result.data };
        } catch (error) {
            console.error('Add to cart error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update item quantity
     */
    async function updateQuantity(productId, quantity) {
        if (!isAuthenticated()) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            const response = await fetch(`${API_BASE}/items/${productId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ quantity })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to update quantity');
            }

            return { success: true, cart: result.data };
        } catch (error) {
            console.error('Update quantity error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Remove item from cart
     */
    async function removeItem(productId) {
        if (!isAuthenticated()) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            const response = await fetch(`${API_BASE}/items/${productId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                }
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to remove item');
            }

            return { success: true, cart: result.data };
        } catch (error) {
            console.error('Remove from cart error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Clear entire cart
     */
    async function clearCart() {
        if (!isAuthenticated()) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            const response = await fetch(API_BASE, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                }
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to clear cart');
            }

            return { success: true };
        } catch (error) {
            console.error('Clear cart error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Sync local cart to server (used after login)
     */
    async function syncCart(localItems) {
        if (!isAuthenticated() || !localItems || localItems.length === 0) {
            return { success: false };
        }

        try {
            const response = await fetch(`${API_BASE}/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ items: localItems })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to sync cart');
            }

            return { success: true, cart: result.data };
        } catch (error) {
            console.error('Sync cart error:', error);
            return { success: false, error: error.message };
        }
    }

    // Public API
    return {
        init,
        getItems,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        syncCart,
        isAuthenticated
    };
})();

// Make available globally
window.ApiCartManager = ApiCartManager;

// Backward compatibility with APICartManager
window.APICartManager = {
    init: () => ApiCartManager.init(),
    getItems: () => ApiCartManager.getItems(),
    addItem: (product) => ApiCartManager.addItem(product),
    updateQuantity: (id, qty) => ApiCartManager.updateQuantity(id, qty),
    removeItem: (id) => ApiCartManager.removeItem(id),
    clearCart: () => ApiCartManager.clearCart(),
    syncCart: (items) => ApiCartManager.syncCart(items)
};
