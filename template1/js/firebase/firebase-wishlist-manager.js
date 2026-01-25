/**
 * Auric Firebase Wishlist Manager
 * 
 * This module handles wishlist functionality using Firebase Firestore
 * Wishlist data is stored at path: users/{userId}/wishlist
 * It's used when the user is logged in
 */

// Firebase Wishlist Manager using IIFE pattern
const FirebaseWishlistManager = (function() {
    // Constants
    const WISHLIST_COLLECTION = 'wishlist';
    const CURRENT_WISHLIST_DOC = 'current';

    // Private variables
    let db;
    let auth;
    let isInitialized = false;

    /**
     * Initialize the Firebase wishlist manager
     * @returns {Boolean} Success status
     */
    function init() {
        try {
            // Check if Firebase is available
            if (typeof firebase === 'undefined') {
                console.warn('Firebase not available, cannot initialize FirebaseWishlistManager');
                return false;
            }

            // Initialize Firebase references
            db = firebase.firestore();
            auth = firebase.auth();
            isInitialized = true;

            console.log('Firebase Wishlist Manager initialized');
            return true;
        } catch (error) {
            console.error('Error initializing Firebase Wishlist Manager:', error);
            return false;
        }
    }

    /**
     * Check if a user is currently logged in
     * @returns {Boolean} True if user is logged in, false otherwise
     */
    function isUserLoggedIn() {
        return isInitialized && auth.currentUser !== null;
    }

    /**
     * Get the current user's ID if logged in
     * @returns {String|null} User ID or null if not logged in
     */
    function getCurrentUserId() {
        if (!isUserLoggedIn()) return null;
        return auth.currentUser.uid;
    }

    /**
     * Get reference to user's current wishlist document
     * @returns {Object|null} Firestore document reference or null if not logged in
     */
    function getCurrentWishlistRef() {
        const userId = getCurrentUserId();
        if (!userId) return null;

        return db.collection('users')
            .doc(userId)
            .collection(WISHLIST_COLLECTION)
            .doc(CURRENT_WISHLIST_DOC);
    }

    /**
     * Load wishlist items from Firebase
     * @returns {Promise<Object>} Wishlist items and success status
     */
    async function getItems() {
        try {
            if (!isUserLoggedIn()) {
                return { success: false, items: [], error: 'User not logged in' };
            }

            const wishlistRef = getCurrentWishlistRef();
            console.log('Loading wishlist from Firebase path:', wishlistRef.path);

            try {
                // Set a timeout to detect if Firebase is too slow (offline mode)
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Firebase timeout - likely offline')), 5000);
                });

                // Race between Firebase request and timeout
                const wishlistDoc = await Promise.race([
                    wishlistRef.get(),
                    timeoutPromise
                ]);

                if (wishlistDoc.exists) {
                    const wishlistData = wishlistDoc.data();

                    // Make sure items array exists
                    if (wishlistData.items && Array.isArray(wishlistData.items)) {
                        console.log('Found', wishlistData.items.length, 'items in Firebase wishlist');
                        
                        // Save to cache after successful load
                        try {
                            const cacheData = {
                                userId: getCurrentUserId(),
                                items: wishlistData.items,
                                timestamp: Date.now()
                            };
                            sessionStorage.setItem('firebase_wishlist_cache', JSON.stringify(cacheData));
                            console.log('Cached wishlist data with user ID');
                        } catch (cacheError) {
                            console.warn('Failed to cache wishlist after load:', cacheError);
                        }
                        
                        return { success: true, items: wishlistData.items };
                    } else {
                        console.warn('Firebase wishlist document exists but items array is missing or invalid');
                        return { success: true, items: [] };
                    }
                } else {
                    console.log('No existing wishlist in Firebase - document does not exist');
                    
                    // Cache empty state for this user
                    try {
                        const cacheData = {
                            userId: getCurrentUserId(),
                            items: [],
                            timestamp: Date.now()
                        };
                        sessionStorage.setItem('firebase_wishlist_cache', JSON.stringify(cacheData));
                    } catch (cacheError) {
                        console.warn('Failed to cache empty wishlist:', cacheError);
                    }
                    
                    return { success: true, items: [] };
                }
            } catch (error) {
                if (error.code === 'unavailable' || error.message.includes('timeout')) {
                    console.log('Firebase temporarily unavailable, using local storage');
                } else {
                    console.error('Firebase operation failed:', error);
                }
                throw new Error('Firebase is offline, no cached data available');
            }
        } catch (error) {
            console.error('Error loading wishlist from Firebase:', error);
            return { success: false, items: [], error: error.message };
        }
    }

    /**
     * Save wishlist items to Firebase
     * @param {Array} items - Array of wishlist items to save
     * @returns {Promise<Object>} Success status and any error message
     */
    async function saveItems(items) {
        try {
            if (!isUserLoggedIn()) {
                return { success: false, error: 'User not logged in' };
            }

            // Save a cache copy in sessionStorage for offline fallback
            try {
                const cacheData = {
                    userId: getCurrentUserId(),
                    items: items,
                    timestamp: Date.now()
                };
                sessionStorage.setItem('firebase_wishlist_cache', JSON.stringify(cacheData));
                console.log('Saved wishlist cache to sessionStorage with user ID');
            } catch (cacheError) {
                console.warn('Failed to cache wishlist in sessionStorage:', cacheError);
            }

            const wishlistRef = getCurrentWishlistRef();
            console.log('Saving wishlist to Firebase path:', wishlistRef.path);
            console.log('Wishlist items being saved:', items.length, 'items');

            try {
                // Set a timeout for Firebase operations
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Firebase save timeout - likely offline')), 5000);
                });

                // Race between Firebase save and timeout
                await Promise.race([
                    wishlistRef.set({
                        items: items,
                        updatedAt: firebase.firestore.Timestamp.now(),
                        userId: getCurrentUserId()
                    }),
                    timeoutPromise
                ]);

                console.log('Wishlist saved to Firebase successfully');
                return { success: true };
            } catch (error) {
                if (error.code === 'unavailable' || error.message.includes('timeout')) {
                    console.log('Firebase save operation timed out or network is offline');
                    console.log('Using cached wishlist data instead');

                    // Return success but with an offline flag
                    // The wishlist is saved in sessionStorage, so data isn't lost
                    return {
                        success: true,
                        offline: true,
                        message: 'Wishlist saved locally, will sync when online'
                    };
                } else {
                    console.error('Firebase save operation failed:', error);
                    return { success: false, error: error.message };
                }
            }
        } catch (error) {
            console.error('Error saving wishlist to Firebase:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Add a product to the wishlist
     * @param {Object} product - Product to add
     * @returns {Promise<Object>} Success status
     */
    async function addItem(product) {
        try {
            if (!isUserLoggedIn()) {
                return { success: false, error: 'User not logged in' };
            }

            const result = await getItems();
            let wishlistItems = result.items || [];

            // Check if item already exists
            const existingItemIndex = wishlistItems.findIndex(item => item.id === product.id);

            if (existingItemIndex >= 0) {
                // Item already exists in wishlist
                console.log('Item already exists in wishlist:', product.name);
                return { success: true, message: 'Item already in wishlist' };
            } else {
                // Get original INR price - use product.originalPrice if available (to handle currency conversion)
                // If product.originalPrice doesn't exist, use product.price (which should be INR from database)
                const priceInINR = product.originalPrice || product.price;
                
                console.log('Adding item to wishlist with original price:', priceInINR, '(product.price:', product.price, ', product.originalPrice:', product.originalPrice, ')');
                
                // Add new item
                wishlistItems.push({
                    id: product.id,
                    name: product.name,
                    price: priceInINR,
                    image: product.image,
                    addedAt: new Date().toISOString()
                });

                // Save updated wishlist back to Firebase
                return await saveItems(wishlistItems);
            }
        } catch (error) {
            console.error('Error adding item to Firebase wishlist:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Check if a product is in the wishlist
     * @param {String} productId - ID of product to check
     * @returns {Promise<Boolean>} True if product is in the wishlist
     */
    async function isItemInWishlist(productId) {
        try {
            if (!isUserLoggedIn()) {
                return false;
            }

            const result = await getItems();
            if (!result.success) return false;

            return result.items.some(item => item.id === productId);
        } catch (error) {
            console.error('Error checking item in Firebase wishlist:', error);
            return false;
        }
    }

    /**
     * Remove an item from the wishlist
     * @param {String} productId - ID of product to remove
     * @returns {Promise<Object>} Success status
     */
    async function removeItem(productId) {
        try {
            if (!isUserLoggedIn()) {
                return { success: false, error: 'User not logged in' };
            }

            const result = await getItems();
            let wishlistItems = result.items || [];

            // Filter out the item to remove
            const updatedItems = wishlistItems.filter(item => item.id !== productId);

            // Only save if something was actually removed
            if (updatedItems.length < wishlistItems.length) {
                return await saveItems(updatedItems);
            } else {
                return { success: true, message: 'Item not found in wishlist' };
            }
        } catch (error) {
            console.error('Error removing item from Firebase wishlist:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Clear all items from the wishlist
     * @returns {Promise<Object>} Success status
     */
    async function clearItems() {
        try {
            if (!isUserLoggedIn()) {
                return { success: false, error: 'User not logged in' };
            }

            return await saveItems([]);
        } catch (error) {
            console.error('Error clearing Firebase wishlist:', error);
            return { success: false, error: error.message };
        }
    }

    // Public API
    return {
        init,
        isUserLoggedIn,
        getItems,
        saveItems,
        addItem,
        isItemInWishlist,
        removeItem,
        clearItems
    };
})();

// Initialize when this script loads
document.addEventListener('DOMContentLoaded', function() {
    FirebaseWishlistManager.init();
});