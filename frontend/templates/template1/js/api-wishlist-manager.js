/**
 * API Wishlist Manager - REST API Based
 * Replaces API Wishlist Manager with Cloudflare Workers API
 */

const ApiWishlistManager = (function() {
    const API_BASE = '/api/wishlist';

    /**
     * Initialize wishlist manager
     */
    function init() {
        console.log('Initializing API Wishlist Manager...');
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
     * Get wishlist items from server
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
                throw new Error(result.error || 'Failed to fetch wishlist');
            }

            return { success: true, items: result.data?.items || [] };
        } catch (error) {
            console.error('Get wishlist error:', error);
            return { success: false, items: [], error: error.message };
        }
    }

    /**
     * Add item to wishlist
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
                    image: product.image
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to add item');
            }

            return { success: true, wishlist: result.data };
        } catch (error) {
            console.error('Add to wishlist error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Remove item from wishlist
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

            return { success: true, wishlist: result.data };
        } catch (error) {
            console.error('Remove from wishlist error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Clear entire wishlist
     */
    async function clearWishlist() {
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
                throw new Error(result.error || 'Failed to clear wishlist');
            }

            return { success: true };
        } catch (error) {
            console.error('Clear wishlist error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Check if item is in wishlist
     */
    async function isInWishlist(productId) {
        if (!isAuthenticated()) {
            return false;
        }

        try {
            const result = await getItems();
            if (result.success && result.items) {
                return result.items.some(item => item.productId === productId || item.id === productId);
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    /**
     * Sync local wishlist to server (used after login)
     */
    async function syncWishlist(localItems) {
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
                throw new Error(result.error || 'Failed to sync wishlist');
            }

            return { success: true, wishlist: result.data };
        } catch (error) {
            console.error('Sync wishlist error:', error);
            return { success: false, error: error.message };
        }
    }

    // Public API
    return {
        init,
        getItems,
        addItem,
        removeItem,
        clearWishlist,
        isInWishlist,
        syncWishlist,
        isAuthenticated
    };
})();

// Make available globally
window.ApiWishlistManager = ApiWishlistManager;

// Backward compatibility with APIWishlistManager
window.APIWishlistManager = {
    init: () => ApiWishlistManager.init(),
    getItems: () => ApiWishlistManager.getItems(),
    addItem: (product) => ApiWishlistManager.addItem(product),
    removeItem: (id) => ApiWishlistManager.removeItem(id),
    clearWishlist: () => ApiWishlistManager.clearWishlist(),
    isInWishlist: (id) => ApiWishlistManager.isInWishlist(id),
    syncWishlist: (items) => ApiWishlistManager.syncWishlist(items)
};
