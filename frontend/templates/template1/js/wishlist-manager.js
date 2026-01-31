/**
 * GLOBAL PRODUCT PRICES CACHE
 * Stores original INR prices for ALL products to prevent DOM-based price corruption
 * Populated by product loaders when they load products
 * Accessed by wishlist manager to get guaranteed correct prices
 */
window.PRODUCT_PRICES_CACHE = window.PRODUCT_PRICES_CACHE || new Map();

/**
 * Auric Wishlist Manager
 * 
 * A wishlist management system that handles both local storage and Firebase.
 * - Uses local storage when user is not logged in
 * - Uses Firebase when user is logged in
 * - Automatically switches between storage methods on login/logout
 * - Firebase wishlist data is stored at path: users/{userId}/wishlist/current
 */

const WishlistManager = (function() {
    // Private wishlist data storage
    let wishlistItems = [];
    let isAuthListenerSet = false;
    let isInitializing = true;

    // Debounce wishlist UI updates
    let wishlistUpdateTimeout;
    function updateWishlistUI() {
        if (wishlistUpdateTimeout) {
            clearTimeout(wishlistUpdateTimeout);
        }

        wishlistUpdateTimeout = setTimeout(() => {
            updateWishlistUIImmediate();
        }, 50); // 50ms debounce
    }

    /**
     * Immediate wishlist UI update (internal use)
     */
    function updateWishlistUIImmediate() {
        requestAnimationFrame(() => {
            const itemCount = wishlistItems.length;

            // Update wishlist count badges efficiently
            const wishlistCountElements = document.querySelectorAll('.wishlist-count');
            wishlistCountElements.forEach(element => {
                if (element.textContent !== itemCount.toString()) {
                    element.textContent = itemCount;
                }
            });

            // Update mobile wishlist count
            const mobileWishlistCount = document.querySelector('.mobile-wishlist-count');
            if (mobileWishlistCount && mobileWishlistCount.textContent !== itemCount.toString()) {
                mobileWishlistCount.textContent = itemCount;
            }
        });

        // Update wishlist items display only when panel is open
        const wishlistPanel = document.querySelector('.wishlist-panel');
        if (wishlistPanel && wishlistPanel.classList.contains('active')) {
            updateWishlistItemsDisplay();
        }

        // Update button states (lightweight operation)
        updateWishlistButtonsState();
    }

    /**
     * Update wishlist items display (optimized DOM operation)
     */
    function updateWishlistItemsDisplay() {
        const wishlistItemsContainer = document.querySelector('.wishlist-items');
        if (!wishlistItemsContainer) return;

        if (wishlistItems.length === 0) {
            wishlistItemsContainer.innerHTML = '<div class="empty-wishlist-message" data-translate="your_wishlist_empty">Your wishlist is empty</div>';
            
            // Trigger translation for the newly added element
            if (typeof LanguageTranslator !== 'undefined' && LanguageTranslator.getCurrentLanguage() !== 'en') {
                setTimeout(() => LanguageTranslator.translatePage(), 100);
            }
            return;
        }

        // Clear existing content and force reflow to reset animations
        wishlistItemsContainer.innerHTML = '';
        void wishlistItemsContainer.offsetWidth; // Force reflow

        // Use DocumentFragment for efficient DOM updates
        const fragment = document.createDocumentFragment();

        wishlistItems.forEach(item => {
            const wishlistItemDiv = document.createElement('div');
            wishlistItemDiv.className = 'wishlist-item';
            wishlistItemDiv.setAttribute('data-product-id', item.id);

            // Get current currency symbol and apply conversion from CurrencyConverter
            let currencySymbol = '₹'; // Default to rupee
            let displayPrice = item.price; // Default to stored INR price
            
            if (typeof window.CurrencyConverter !== 'undefined') {
                if (window.CurrencyConverter.getCurrencySymbol) {
                    currencySymbol = window.CurrencyConverter.getCurrencySymbol();
                }
                // Convert price from INR to selected currency
                // CRITICAL: convertPrice only takes ONE parameter (priceInINR)
                if (window.CurrencyConverter.convertPrice) {
                    try {
                        // Pass only the price in INR - convertPrice handles the conversion internally
                        displayPrice = window.CurrencyConverter.convertPrice(item.price);
                        console.log('Wishlist: Converted price', item.price, 'to', displayPrice, 'with symbol', currencySymbol);
                    } catch (e) {
                        console.error('Error converting price in wishlist:', e);
                        displayPrice = item.price; // Fall back to original
                    }
                } 
                // If conversion still failed, just use the original price in INR
                if (displayPrice === item.price && window.CurrencyConverter.getCurrentCurrency && window.CurrencyConverter.getCurrentCurrency() !== 'INR') {
                    console.warn('Wishlist: Could not convert price, using original INR price');
                }
            }

            wishlistItemDiv.innerHTML = `
                <img src="${item.image}" alt="${item.name}" class="wishlist-item-image" loading="lazy" decoding="async">
                <div class="wishlist-item-details">
                    <div class="wishlist-item-name" data-translate-dynamic>${item.name}</div>
                    <div class="wishlist-item-price" data-translate-dynamic>${currencySymbol}${displayPrice.toFixed(2)}</div>
                    <div class="wishlist-item-actions">
                        <button class="remove-from-wishlist" data-translate-dynamic>Remove</button>
                        <button class="move-to-cart" data-translate-dynamic>Move to Cart</button>
                    </div>
                </div>
            `;

            fragment.appendChild(wishlistItemDiv);
        });

        // Add all items to the container in one operation
        wishlistItemsContainer.appendChild(fragment);
    }


    /**
     * Initialize the wishlist system
     * This runs when the page loads
     */
    function init() {
        console.log('Initializing wishlist system...');

        // Set up wishlist UI elements first
        setupWishlistPanel();

        // Load wishlist data initially
        loadWishlist();

        // Set up event listeners after everything is loaded
        setTimeout(() => {
            setupEventListeners();
            updateWishlistUI();
            // Set up periodic checks to update button states after products load
            setupPeriodicButtonUpdate();
        }, 500);

        // Set up authentication listener
        setupAuthListener();

        // Mark initialization as complete after a delay to allow products to load
        setTimeout(() => {
            isInitializing = false;
        }, 3000);

        console.log('Wishlist system initialized with', wishlistItems.length, 'items');
    }

    /**
     * Set up authentication state listener
     * This handles switching between local storage and API on login/logout
     */
    function setupAuthListener() {
        if (isAuthListenerSet) return;

        // Use AuthService if available (API-based auth)
        if (typeof AuthService !== 'undefined') {
            AuthService.onAuthStateChange(async (user) => {
                if (user) {
                    console.log('User logged in, switching to API storage for wishlist');

                    // Check if ApiWishlistManager is available
                    if (typeof ApiWishlistManager !== 'undefined') {
                        try {
                            // First try to get items from API
                            const result = await ApiWishlistManager.getItems();

                            if (result.success) {
                                // If user had items in local storage, we need to handle the merge
                                const localItems = LocalStorageWishlist.getItems();

                                if (localItems.length > 0 && result.items.length > 0) {
                                    console.log('Merging local and API wishlists');
                                    // Merge wishlists, preserving all unique items from both sources
                                    const mergedItems = mergeWishlistItems(localItems, result.items);
                                    wishlistItems = mergedItems;

                                    // Sync merged wishlist to API
                                    await ApiWishlistManager.syncWishlist(mergedItems);
                                } else if (localItems.length > 0) {
                                    console.log('Moving local wishlist to API');
                                    // User has items in local storage but not in API
                                    wishlistItems = localItems;
                                    await ApiWishlistManager.syncWishlist(localItems);
                                } else {
                                    console.log('Using existing API wishlist');
                                    // User has items in API but not in local storage
                                    wishlistItems = result.items;
                                }

                                // Clear local storage as we're now using API
                                LocalStorageWishlist.clearItems();
                            } else {
                                console.warn('Failed to load wishlist from API:', result.error);
                                // Fall back to local storage
                                wishlistItems = LocalStorageWishlist.getItems();
                            }
                        } catch (error) {
                            console.error('Error during wishlist synchronization:', error);
                            // Keep using local storage if sync fails
                            wishlistItems = LocalStorageWishlist.getItems();
                        }
                    } else {
                        console.warn('ApiWishlistManager not available, using local storage');
                        wishlistItems = LocalStorageWishlist.getItems();
                    }
                } else {
                    console.log('User logged out, switching to local storage for wishlist');
                    // Load from local storage on logout
                    wishlistItems = LocalStorageWishlist.getItems();
                }

                // Update UI after login/logout
                updateWishlistUI();
            });

            isAuthListenerSet = true;
        } else {
            console.log('AuthService not available, using local storage only for wishlist');
            wishlistItems = LocalStorageWishlist.getItems();
            updateWishlistUI();
        }
    }

    /**
     * Merge two wishlist arrays, preserving all unique items
     * @param {Array} list1 - First wishlist array
     * @param {Array} list2 - Second wishlist array
     * @returns {Array} Merged wishlist array
     */
    function mergeWishlistItems(list1, list2) {
        const mergedMap = new Map();

        // Add all items from first list
        list1.forEach(item => {
            mergedMap.set(item.id, {...item});
        });

        // Add all unique items from second list
        list2.forEach(item => {
            if (!mergedMap.has(item.id)) {
                mergedMap.set(item.id, {...item});
            }
        });

        return Array.from(mergedMap.values());
    }

    /**
     * Load wishlist data from the appropriate storage
     * Uses Firebase if logged in, otherwise tries sessionStorage cache, then local storage
     */
    async function loadWishlist() {
        if (isUserLoggedIn()) {
            console.log('User logged in, loading wishlist from Firebase');
            try {
                // Make sure FirebaseWishlistManager is loaded and initialized
                if (typeof FirebaseWishlistManager !== 'undefined') {
                    const result = await FirebaseWishlistManager.getItems();
                    if (result.success) {
                        wishlistItems = result.items;
                    } else {
                        console.warn('Failed to load wishlist from Firebase:', result.error);
                        wishlistItems = [];
                    }
                } else {
                    console.warn('FirebaseWishlistManager not available, falling back to local storage');
                    wishlistItems = LocalStorageWishlist.getItems();
                }
            } catch (error) {
                console.error('Error loading wishlist from Firebase:', error);
                wishlistItems = [];
            }
        } else {
            console.log('User not logged in, checking for cached Firebase data');

            // Try to load from sessionStorage cache first (contains Firebase data)
            let foundCachedData = false;
            try {
                const cachedWishlist = sessionStorage.getItem('firebase_wishlist_cache');
                if (cachedWishlist) {
                    const cacheData = JSON.parse(cachedWishlist);

                    // Validate cache structure and user ID
                    if (cacheData && typeof cacheData === 'object' && 
                        cacheData.items && Array.isArray(cacheData.items) &&
                        cacheData.userId && cacheData.timestamp) {

                        // Check if cache is from a recent session (not older than 24 hours)
                        const cacheAge = Date.now() - cacheData.timestamp;
                        const maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours

                        // Try to get session user ID to validate
                        let sessionUserId = null;
                        try {
                            const session = localStorage.getItem('userSession');
                            if (session) {
                                const sessionData = JSON.parse(session);
                                sessionUserId = sessionData.uid;
                            }
                        } catch (sessionError) {
                            console.warn('Could not get session user ID:', sessionError);
                        }

                        if (cacheAge < maxCacheAge && 
                            (sessionUserId === cacheData.userId || !sessionUserId)) {

                            console.log('Found cached Firebase wishlist data:', cacheData.items.length, 'items for user:', cacheData.userId);
                            wishlistItems = cacheData.items;
                            foundCachedData = true;

                            // Show user a helpful message
                            console.log('ℹ️ Loaded your wishlist from recent session. Items from your account are available.');
                        } else {
                            console.log('Cache is stale or for different user, ignoring');
                            // Clear stale cache
                            sessionStorage.removeItem('firebase_wishlist_cache');
                        }
                    } else {
                        console.log('Invalid cache format, clearing');
                        sessionStorage.removeItem('firebase_wishlist_cache');
                    }
                }
            } catch (error) {
                console.warn('Error loading cached wishlist data:', error);
                sessionStorage.removeItem('firebase_wishlist_cache');
            }

            // If no cached data found, load from local storage
            if (!foundCachedData) {
                console.log('No cached data found, loading wishlist from local storage');
                wishlistItems = LocalStorageWishlist.getItems();
            }
        }

        // Update UI after loading
        updateWishlistUI();
    }

    /**
     * Save wishlist data to the appropriate storage
     * Uses Firebase if logged in, otherwise local storage
     */
    async function saveWishlist() {
        if (isUserLoggedIn()) {
            console.log('User logged in, saving wishlist to Firebase');
            try {
                // Make sure FirebaseWishlistManager is loaded and initialized
                if (typeof FirebaseWishlistManager !== 'undefined') {
                    await FirebaseWishlistManager.saveItems(wishlistItems);
                } else {
                    console.warn('FirebaseWishlistManager not available, saving to local storage only');
                    LocalStorageWishlist.saveItems(wishlistItems);
                }
            } catch (error) {
                console.error('Error saving wishlist to Firebase:', error);
                // Fallback to local storage
                LocalStorageWishlist.saveItems(wishlistItems);
            }
        } else {
            console.log('User not logged in, saving wishlist to local storage');
            LocalStorageWishlist.saveItems(wishlistItems);
        }

        // Update UI after saving
        updateWishlistUI();
    }

    /**
     * Check if user is currently logged in
     * @returns {Boolean} True if user is logged in
     */
    function isUserLoggedIn() {
        return typeof AuthService !== 'undefined' && AuthService.isLoggedIn();
    }

    // ======================================================
    // SECTION: WISHLIST OPERATIONS
    // ======================================================

    /**
     * Add a product to the wishlist
     * @param {Object} product - Product to add
     */
    async function addToWishlist(product) {
        if (!product || !product.id) {
            console.error('Invalid product', product);
            return;
        }

        // Double-check if the item already exists in the wishlist (strict comparison)
        const existingItemIndex = wishlistItems.findIndex(item => String(item.id) === String(product.id));

        if (existingItemIndex >= 0) {
            // Item already exists in wishlist
            console.log('Product already in wishlist:', product.name);
            showToast(`${product.name} is already in your wishlist`);
            return { success: false, message: 'Already in wishlist' };
        } else {
            // Add new item to wishlist
            const newItem = {
                id: String(product.id), // Ensure ID is string for consistency
                name: product.name,
                price: parseFloat(product.price) || 0,
                image: product.image,
                addedAt: new Date().toISOString()
            };

            wishlistItems.push(newItem);
            console.log('Added new item to wishlist:', product.name, 'Total items:', wishlistItems.length);
            showToast(`${product.name} added to your wishlist`);
        }

        // Save wishlist
        await saveWishlist();

        // Only show the wishlist panel if it was a user-initiated action
        // Don't show during initialization or product loading
        if (!isInitializing) {
            openWishlistPanel();
        }

        return { success: true, message: 'Added to wishlist' };
    }

    /**
     * Remove a product from the wishlist
     * @param {String} productId - ID of the product to remove
     */
    async function removeFromWishlist(productId) {
        const initialLength = wishlistItems.length;
        const removedItem = wishlistItems.find(item => item.id === productId);
        wishlistItems = wishlistItems.filter(item => item.id !== productId);

        if (wishlistItems.length !== initialLength) {
            console.log('Item removed from wishlist');
            if (removedItem) {
                showToast(`${removedItem.name} removed from your wishlist`);
            }
            await saveWishlist();
        }
    }

    /**
     * Check if a product is in the wishlist
     * @param {String} productId - ID of the product to check
     * @returns {Boolean} True if product is in the wishlist
     */
    function isInWishlist(productId) {
        if (!productId) return false;
        const result = wishlistItems.some(item => String(item.id) === String(productId));
        console.log('Checking if product', productId, 'is in wishlist:', result);
        return result;
    }

    /**
     * Move product from wishlist to cart
     * @param {String} productId - ID of the product to move
     */
    async function moveToCart(productId) {
        const item = wishlistItems.find(item => item.id === productId);

        if (item && typeof CartManager !== 'undefined') {
            // Add to cart
            await CartManager.addToCart(item);

            // Remove from wishlist
            await removeFromWishlist(productId);

            showToast(`${item.name} moved to your cart`);
        }
    }

    /**
     * Clear all items from the wishlist
     */
    async function clearWishlist() {
        wishlistItems = [];
        console.log('Wishlist cleared');
        showToast('Wishlist has been cleared');
        await saveWishlist();
    }

    /**
     * Get all wishlist items
     * @returns {Array} Array of wishlist items
     */
    function getWishlistItems() {
        return [...wishlistItems];
    }

    // ======================================================
    // SECTION: UI OPERATIONS
    // ======================================================

    /**
     * Set up the wishlist panel UI
     */
    function setupWishlistPanel() {
        // Use existing wishlist panel from HTML or create if it doesn't exist
        let panel = document.querySelector('.wishlist-panel');
        let overlay = document.querySelector('.wishlist-overlay');

        if (!panel) {
            const wishlistPanelHTML = `
                <div class="wishlist-overlay"></div>
                <div class="wishlist-panel">
                    <div class="wishlist-panel-header">
                        <h3 data-translate="wishlist">Your Wishlist</h3>
                        <button class="close-wishlist-btn">&times;</button>
                    </div>
                    <div class="wishlist-items">
                        <!-- Wishlist items will be generated here -->
                    </div>
                    <div class="wishlist-panel-footer">
                        <div class="wishlist-panel-actions">
                            <button class="clear-wishlist-btn" data-translate-dynamic>Clear Wishlist</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', wishlistPanelHTML);
            panel = document.querySelector('.wishlist-panel');
            overlay = document.querySelector('.wishlist-overlay');
        }

        // Ensure the panel uses consistent CSS by removing any conflicting inline styles
        if (panel) {
            panel.style.right = '';
            panel.style.display = '';
            panel.classList.remove('open', 'active');
        }

        if (overlay) {
            overlay.style.display = '';
            overlay.classList.remove('open', 'active');
        }

        // Update wishlist icon in navigation (already exists in the HTML)
        const wishlistIcon = document.querySelector('.nav-icons a[href="#"] i.fa-heart');
        if (wishlistIcon) {
            const iconLink = wishlistIcon.closest('a');
            iconLink.classList.add('wishlist-toggle');

            // Add wishlist counter if it doesn't exist
            if (!iconLink.querySelector('.wishlist-count')) {
                const countHTML = `<div class="wishlist-count">0</div>`;
                iconLink.insertAdjacentHTML('beforeend', countHTML);
            }

            // Make sure the container has the right class
            iconLink.classList.add('wishlist-icon-container');
        }

        // Wishlist CSS is now handled entirely by css/cart.css
        if (false) { // Disable CSS injection
            const wishlistStyles = `
                <style id="wishlist-styles">
                    .wishlist-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0, 0, 0, 0.5);
                        z-index: 999;
                        opacity: 0;
                        visibility: hidden;
                        backdrop-filter: blur(2px);
                        transition: opacity 0.3s ease-out,
                                    visibility 0s linear 0.3s;
                    }

                    .wishlist-panel {
                        position: fixed;
                        top: 0;
                        right: 0;
                        width: 350px;
                        max-width: 90vw;
                        height: 100%;
                        background: #fff;
                        z-index: 1000;
                        display: flex;
                        flex-direction: column;
                        box-shadow: -2px 0 5px rgba(0, 0, 0, 0.1);
                        /* Proper transform-based transitions */
                        transform: translateX(100%) translateZ(0);
                        opacity: 0;
                        visibility: hidden;
                        pointer-events: none;
                        transition: transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94),
                                    opacity 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94),
                                    visibility 0s linear 0.35s;
                    }

                    .wishlist-panel.active,
                    .wishlist-panel.open {
                        transform: translateX(0) translateZ(0);
                        opacity: 1;
                        visibility: visible;
                        pointer-events: auto;
                        transition-delay: 0s;
                    }

                    .wishlist-panel.closing {
                        transform: translateX(100%) translateZ(0);
                        opacity: 0;
                        visibility: hidden;
                        pointer-events: none;
                        transition: transform 0.35s cubic-bezier(0.55, 0.085, 0.68, 0.53),
                                    opacity 0.35s cubic-bezier(0.55, 0.085, 0.68, 0.53),
                                    visibility 0s linear 0.35s;
                    }

                    .wishlist-overlay.active,
                    .wishlist-overlay.open {
                        opacity: 1;
                        visibility: visible;
                        transition-delay: 0s;
                    }

                    .wishlist-overlay.closing {
                        opacity: 0;
                        visibility: hidden;
                        transition: opacity 0.3s ease-out,
                                    visibility 0s linear 0.3s;
                    }

                    .wishlist-panel-header {
                        padding: 15px;
                        border-bottom: 1px solid #eee;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }

                    .wishlist-panel-header h3 {
                        margin: 0;
                        font-size: 18px;
                    }

                    .close-wishlist-btn {
                        background: none;
                        border: none;
                        font-size: 24px;
                        cursor: pointer;
                        color: #777;
                    }

                    .wishlist-items {
                        flex: 1;
                        overflow-y: auto;
                        padding: 15px;
                    }

                    .wishlist-item {
                        display: flex;
                        margin-bottom: 15px;
                        border-bottom: 1px solid #f5f5f5;
                        padding-bottom: 15px;
                        position: relative;
                    }

                    .wishlist-item-image {
                        width: 80px;
                        height: 80px;
                        object-fit: cover;
                        margin-right: 15px;
                    }

                    .wishlist-item-details {
                        flex: 1;
                    }

                    .wishlist-item-name {
                        font-weight: 500;
                        margin-bottom: 5px;
                    }

                    .wishlist-item-price {
                        color: #666;
                        margin-bottom: 10px;
                    }

                    .wishlist-item-actions {
                        display: flex;
                        gap: 10px;
                    }

                    .remove-from-wishlist, 
                    .move-to-cart {
                        background: none;
                        border: 1px solid #ddd;
                        padding: 5px 10px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                        transition: all 0.2s;
                    }

                    .remove-from-wishlist:hover {
                        background: #f5f5f5;
                    }

                    .move-to-cart {
                        background: #000;
                        color: #fff;
                        border-color: #000;
                    }

                    .move-to-cart:hover {
                        background: #333;
                    }

                    .wishlist-panel-footer {
                        padding: 15px;
                        border-top: 1px solid #eee;
                    }

                    .wishlist-panel-actions {
                        display: flex;
                        justify-content: flex-end;
                    }

                    .clear-wishlist-btn {
                        background: none;
                        border: 1px solid #ddd;
                        padding: 8px 15px;
                        border-radius: 4px;
                        cursor: pointer;
                    }

                    .clear-wishlist-btn:hover {
                        background: #f5f5f5;
                    }

                    .empty-wishlist-message {
                        text-align: center;
                        padding: 30px;
                        color: #888;
                    }

                    .wishlist-count {
                        /* Badge styling is now handled entirely by navbar.css */
                    }

                    /* Styling for the heart button on product cards */
                    .add-to-wishlist {
                        background-color: white; /* Default background */
                        border-radius: 50%; /* Makes it circular */
                        width: 30px; /* Diameter */
                        height: 30px; /* Diameter */
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        border: 1px solid #ccc; /* Border for visibility */
                        cursor: pointer;
                        transition: background-color 0.3s ease, border-color 0.3s ease;
                    }

                    .add-to-wishlist.active {
                        background-color: white; /* White background when active */
                        border-color: white; /* Match border to background */
                    }

                    .add-to-wishlist .fa-heart {
                        font-size: 16px; /* Size of the heart icon */
                        color: #333; /* Default color of the heart */
                    }

                    .add-to-wishlist.active .fa-heart {
                        color: #ff3e6c; /* Active color of the heart (pink) */
                        font-weight: 900; /* Solid heart */
                    }


                    /* Toast notification */
                    .toast {
                        position: fixed;
                        bottom: 20px;
                        left: 50%;
                        transform: translateX(-50%);
                        background: rgba(0, 0, 0, 0.8);
                        color: white;
                        padding: 10px 20px;
                        border-radius: 4px;
                        z-index: 1100;
                        opacity: 0;
                        transition: opacity 0.3s;
                        pointer-events: none;
                    }

                    .toast.show {
                        opacity: 1;
                    }
                </style>
            `;

            document.head.insertAdjacentHTML('beforeend', wishlistStyles);
        }
    }

    /**
     * Set up all event listeners for wishlist functionality
     */
    function setupEventListeners() {
        console.log('Setting up wishlist event listeners using event delegation');

        // Use event delegation on document level to catch both existing and dynamically added buttons
        // This runs ONCE and handles ALL .add-to-wishlist clicks, including future ones
        document.addEventListener('click', function(event) {
            // DEBUG: Log every click to ensure the listener is working
            if (event.target.closest('.add-to-wishlist') || event.target.classList.contains('add-to-wishlist') || event.target.tagName === 'BUTTON') {
                console.log('🔵 CLICK DETECTED - Target:', event.target.tagName, 'Classes:', event.target.className);
            }
            
            const button = event.target.closest('.add-to-wishlist');
            if (!button) {
                // DEBUG: Check if we're clicking on the icon inside the button
                const icon = event.target.closest('i');
                if (icon) {
                    const iconButton = icon.closest('.add-to-wishlist');
                    if (iconButton) {
                        console.log('🟡 Found button through icon parent');
                        event.target = iconButton;
                    }
                }
                if (!button && !event.target.closest('.add-to-wishlist')) return;
            }

            event.preventDefault();
            event.stopPropagation();
            console.log('Wishlist button clicked via delegation');

            // For bridal cards, also prevent the parent link from being clicked
            const parentLink = button.closest('a');
            if (parentLink) {
                event.preventDefault();
                event.stopPropagation();
                console.log('Prevented parent link navigation');
            }

            // Handle product-item, arrival-item, and bridal-card structures
            const productItem = button.closest('.product-item') || button.closest('.arrival-item') || button.closest('.bridal-card');
            console.log('Found product container:', productItem);

            if (productItem) {
                const productId = productItem.dataset.productId;
                console.log('Product ID:', productId);

                // Handle different product name selectors
                const productNameEl = productItem.querySelector('.product-name') || 
                                     productItem.querySelector('.arrival-title') ||
                                     productItem.querySelector('.product-title');
                const productName = productNameEl ? productNameEl.textContent.trim() : 'Unknown Product';
                console.log('Product name:', productName);

                // CRITICAL FIX: Multi-Level Price Extraction with Strict Validation
                // ALWAYS use data attributes first - NEVER fall back to DOM text parsing
                // This prevents reading converted prices when currency is already changed
                let productPrice = 0;
                let priceFound = false;
                
                console.log('🔍 PRICE EXTRACTION DEBUG - Starting for product:', productId);
                console.log('   Button data attributes:', button.dataset);
                console.log('   Product item data attributes:', productItem?.dataset);
                
                // CRITICAL FIX: LEVEL 0 - Check global price cache FIRST
                // This cache is populated by product loaders and is immune to DOM modifications
                if (productId && window.PRODUCT_PRICES_CACHE && window.PRODUCT_PRICES_CACHE.has(productId)) {
                    productPrice = window.PRODUCT_PRICES_CACHE.get(productId);
                    priceFound = true;
                    console.log('✅ LEVEL 0 (CACHE): Got price from global cache:', productPrice, 'for product:', productId);
                } 
                
                // LEVEL 1: Check button's data-product-price attribute (SECOND PRIORITY)
                if (!priceFound && button.dataset.productPrice) {
                    const buttonPrice = parseFloat(button.dataset.productPrice);
                    if (!isNaN(buttonPrice) && buttonPrice > 0) {
                        productPrice = buttonPrice;
                        priceFound = true;
                        console.log('✅ Level 1: Got price from button data-product-price:', productPrice);
                    }
                } 
                
                // LEVEL 2: Check product container's data-product-price attribute
                if (!priceFound && productItem.dataset.productPrice) {
                    const containerPrice = parseFloat(productItem.dataset.productPrice);
                    if (!isNaN(containerPrice) && containerPrice > 0) {
                        productPrice = containerPrice;
                        priceFound = true;
                        console.log('✅ Level 2: Got price from product-item data-product-price:', productPrice);
                    }
                }
                
                // LEVEL 3: Check price element's data attributes ONLY (NOT textContent)
                if (!priceFound) {
                    const priceElement = productItem.querySelector('.current-price') || 
                                       productItem.querySelector('.original-price') ||
                                       productItem.querySelector('.product-pricing .current-price');

                    if (priceElement) {
                        // Check data-original-price attribute first
                        if (priceElement.dataset.originalPrice) {
                            const attrPrice = parseFloat(priceElement.dataset.originalPrice);
                            if (!isNaN(attrPrice) && attrPrice > 0) {
                                productPrice = attrPrice;
                                priceFound = true;
                                console.log('✅ Level 3a: Got price from data-original-price attribute:', productPrice);
                            }
                        } 
                        // Check data-price attribute
                        if (!priceFound && priceElement.dataset.price) {
                            const attrPrice = parseFloat(priceElement.dataset.price);
                            if (!isNaN(attrPrice) && attrPrice > 0) {
                                productPrice = attrPrice;
                                priceFound = true;
                                console.log('✅ Level 3b: Got price from data-price attribute:', productPrice);
                            }
                        }
                    }
                }
                
                // LEVEL 4: Hardcoded prices for KNOWN PROBLEMATIC PRODUCTS (last resort only)
                if (!priceFound || productPrice === 0) {
                    console.log('⚠️ Price extraction failed for product:', productId, '- checking hardcoded prices');
                    const hardcodedPrices = {
                        'CHRM-07': 15550.00,
                        'GSSE-11': 17750.00,
                        'RBC-01': 32500,
                        'EBS-02': 28900,
                        'TBE-03': 24500,
                        'CBJ-04': 19800,
                        'PKN-01': 245000,
                        'PKB-02': 185000,
                        'PKE-03': 95000,
                        'PKR-04': 75000,
                        'PCS-05': 325000,
                        'PNC-01': 245000,
                        'PBG-02': 185000,
                        'PER-03': 95000,
                        'PRG-04': 75000,
                        'NBMFE-12': 21300,
                        'BMFE-09': 21300,
                        'PDRE-10': 19980,
                        'GSSE-11': 17750
                    };
                    
                    if (hardcodedPrices[productId]) {
                        productPrice = hardcodedPrices[productId];
                        priceFound = true;
                        console.log('✅ Level 4: Applied hardcoded price for', productId, ':', productPrice);
                    }
                }
                
                // SAFETY CHECK: Ensure we have a valid price
                if (!priceFound || isNaN(productPrice) || productPrice <= 0) {
                    console.error('❌ CRITICAL: Failed to extract valid price for product:', productId, 'Final price:', productPrice);
                    console.error('Button dataset:', button.dataset);
                    console.error('Product item dataset:', productItem.dataset);
                    // Set to 0 and continue - this will be caught downstream
                    productPrice = 0;
                }

                // Handle different image selectors: .product-image img (new arrivals), .arrival-image img (bridal cards)
                const imageElement = productItem.querySelector('.product-image img') || 
                                    productItem.querySelector('.arrival-image img') ||
                                    productItem.querySelector('img');
                const productImage = imageElement ? imageElement.src : '';

                console.log('Product found:', { id: productId, name: productName, price: productPrice, image: productImage });

                const product = {
                    id: productId,
                    name: productName,
                    price: productPrice,
                    image: productImage
                };

                // Toggle wishlist status
                if (isInWishlist(productId)) {
                    removeFromWishlist(productId);
                    // Don't add active class to maintain original appearance
                    // Only change icon type to indicate status
                    const icon = button.querySelector('i');
                    if (icon) {
                        icon.classList.add('far');
                        icon.classList.remove('fas');
                        // Don't add active class to prevent color change
                    }
                } else {
                    addToWishlist(product);
                    // Don't add active class to maintain original appearance
                    // Only change icon type to indicate status
                    const icon = button.querySelector('i');
                    if (icon) {
                        icon.classList.remove('far');
                        icon.classList.add('fas');
                        // Don't add active class to prevent color change
                    }
                }
            }
        });

        // Add direct event listener to product detail page wishlist button
        const detailWishlistBtn = document.querySelector('.add-to-wishlist-btn');
        if (detailWishlistBtn) {
            console.log('Found product detail wishlist button:', detailWishlistBtn);
            detailWishlistBtn.addEventListener('click', function(event) {
                event.preventDefault();
                event.stopPropagation();
                console.log('Detail page wishlist button clicked');

                const detailContainer = document.querySelector('.product-detail-container');
                if (detailContainer) {
                    const productId = detailContainer.dataset.productId;
                    const productNameEl = detailContainer.querySelector('.product-title');
                    const productName = productNameEl ? productNameEl.textContent : 'Unknown Product';
                    
                    // CRITICAL FIX: ALWAYS use window.productDetails.price (original INR price from database)
                    // This is set by product-detail-loader.js and contains the true INR price
                    // NEVER read prices from DOM when currency conversion is active
                    let productPrice = 0;
                    
                    if (window.productDetails && window.productDetails.price && window.productDetails.price > 0) {
                        productPrice = window.productDetails.price;
                        console.log('✅ [WISHLIST] Using original INR price from window.productDetails:', productPrice);
                    } else {
                        console.error('❌ [WISHLIST] CRITICAL ERROR: window.productDetails.price not available. Cannot add to wishlist safely.');
                        showToast('Error: Product price not found. Please refresh the page.');
                        return;
                    }

                    // Fix for image selector - the image is directly on the element with class main-product-image
                    const productImageEl = document.querySelector('.main-image-container img');
                    const productImage = productImageEl ? productImageEl.src : '';

                    console.log('[WISHLIST] Detail product found:', { id: productId, name: productName, price: productPrice, image: productImage });

                    const product = {
                        id: productId,
                        name: productName,
                        price: productPrice,
                        image: productImage
                    };

                    // Toggle wishlist status - check current state first
                    const currentlyInWishlist = isInWishlist(productId);
                    console.log('[WISHLIST] Product currently in wishlist:', currentlyInWishlist);

                    if (currentlyInWishlist) {
                        console.log('[WISHLIST] Removing product from wishlist:', productName);
                        removeFromWishlist(productId);
                        // Update text to show correct action
                        this.innerHTML = '<i class="fas fa-heart"></i> ADD TO WISHLIST';
                    } else {
                        console.log('[WISHLIST] Adding product to wishlist:', productName, 'with price:', productPrice);
                        addToWishlist(product);
                        // Update text to show correct action
                        this.innerHTML = '<i class="fas fa-heart"></i> REMOVE FROM WISHLIST';
                    }
                }
            });
        }

        // Wishlist panel toggle
        document.addEventListener('click', function(e) {
            console.log('Click detected:', e.target);

            // Toggle wishlist panel
            if (e.target.closest('.wishlist-toggle')) {
                e.preventDefault();
                toggleWishlistPanel();
            }

            // Close wishlist panel
            if (e.target.closest('.close-wishlist-btn') || e.target.closest('.wishlist-overlay')) {
                closeWishlistPanel();
            }

            // Add to wishlist buttons on product cards - LEGACY HANDLER REMOVED
            // This is now handled by the direct event listeners in setupEventListeners() (line 860+)
            // DO NOT add another handler here - it will conflict and cause incorrect price extraction!

            // Remove from wishlist
            if (e.target.closest('.remove-from-wishlist')) {
                const wishlistItem = e.target.closest('.wishlist-item');
                if (wishlistItem) {
                    const productId = wishlistItem.dataset.productId;
                    removeFromWishlist(productId);
                }
            }

            // Move to cart
            if (e.target.closest('.move-to-cart')) {
                const wishlistItem = e.target.closest('.wishlist-item');
                if (wishlistItem) {
                    const productId = wishlistItem.dataset.productId;
                    moveToCart(productId);
                }
            }

            // Clear wishlist
            if (e.target.closest('.clear-wishlist-btn')) {
                if (confirm('Are you sure you want to clear your wishlist?')) {
                    clearWishlist();
                }
            }
        });

        // Update wishlist icons on page load
        document.addEventListener('DOMContentLoaded', function() {
            updateWishlistButtonsState();
        });

        // Listen for products being loaded (custom events)
        document.addEventListener('productsLoaded', function() {
            console.log('Products loaded event detected, updating wishlist button states');
            setTimeout(updateWishlistButtonsState, 100);
        });

        // Listen for specific product sections being updated
        document.addEventListener('bridalProductsLoaded', function() {
            setTimeout(updateWishlistButtonsState, 100);
        });

        document.addEventListener('polkiProductsLoaded', function() {
            setTimeout(updateWishlistButtonsState, 100);
        });

        document.addEventListener('newArrivalsProductsLoaded', function() {
            setTimeout(updateWishlistButtonsState, 100);
        });
    }

    /**
     * Update all wishlist UI elements
     */
    // The original updateWishlistUI function is replaced by the debounced version above.
    // This function is kept here for clarity that it's been replaced.
    // function updateWishlistUI() { ... }


    /**
     * Update the state of all wishlist buttons on the page
     * to reflect whether items are in the wishlist
     */
    function updateWishlistButtonsState() {
        // Update product card wishlist buttons (including bridal cards)
        document.querySelectorAll('.product-item, .product-card, .arrival-item, .bridal-card').forEach(card => {
            const productId = card.dataset.productId || card.dataset.id;
            const wishlistButton = card.querySelector('.add-to-wishlist');

            if (productId && wishlistButton) {
                console.log('Updating wishlist button state for product ID:', productId, 'In wishlist:', isInWishlist(productId));

                const icon = wishlistButton.querySelector('i');
                if (icon) {
                    if (isInWishlist(productId)) {
                        // Use solid icon for items in wishlist and add active class for white background
                        icon.classList.remove('far');
                        icon.classList.add('fas');
                        wishlistButton.classList.add('active');
                    } else {
                        // Use regular icon for items not in wishlist and remove active class
                        icon.classList.add('far');
                        icon.classList.remove('fas');
                        wishlistButton.classList.remove('active');
                    }
                }
            }
        });

        // Update product detail wishlist button
        const detailSection = document.querySelector('.product-detail-section') || document.querySelector('.product-detail-container');
        if (detailSection) {
            const productId = detailSection.dataset.productId;
            const wishlistButton = document.querySelector('.add-to-wishlist-btn');

            if (productId && wishlistButton) {
                const inWishlist = isInWishlist(productId);
                console.log('Updating detail page button for product:', productId, 'inWishlist:', inWishlist);

                // Update the text to show correct action
                if (inWishlist) {
                    wishlistButton.innerHTML = '<i class="fas fa-heart"></i> REMOVE FROM WISHLIST';
                } else {
                    wishlistButton.innerHTML = '<i class="fas fa-heart"></i> ADD TO WISHLIST';
                }
            }
        }

        // Update navigation wishlist icon - don't change the color
        const navWishlistIcon = document.querySelector('.nav-icons .fa-heart');
        if (navWishlistIcon) {
            // No longer adding 'active' class to avoid color change
            // Only update the count indicator
            if (wishlistItems.length > 0) {
                // Don't add active class to keep original color
                // navWishlistIcon.classList.add('active');
            } else {
                navWishlistIcon.classList.remove('active');
            }
        }
    }

    /**
     * Open the wishlist panel with smooth transitions
     */
    function openWishlistPanel() {
        const wishlistPanel = document.querySelector('.wishlist-panel');
        const wishlistOverlay = document.querySelector('.wishlist-overlay');

        if (wishlistPanel && wishlistOverlay) {
            // Remove any closing animation class
            wishlistPanel.classList.remove('closing');
            wishlistOverlay.classList.remove('closing');
            
            // Prevent body scrolling
            document.body.style.overflow = 'hidden';
            
            // Add active classes immediately to start transition
            requestAnimationFrame(() => {
                wishlistOverlay.classList.add('active');
                wishlistPanel.classList.add('active');
                
                // Load content after a brief delay
                setTimeout(() => {
                    updateWishlistItemsDisplay();
                }, 100);
            });

            console.log('Wishlist panel opened with smooth transition');
        }
    }

    /**
     * Close the wishlist panel with smooth transitions
     */
    function closeWishlistPanel() {
        const wishlistPanel = document.querySelector('.wishlist-panel');
        const wishlistOverlay = document.querySelector('.wishlist-overlay');

        if (wishlistPanel) {
            // Start closing animation sequence
            wishlistPanel.classList.remove('active');
            wishlistPanel.classList.add('closing');

            // Start overlay fade out
            if (wishlistOverlay) {
                wishlistOverlay.classList.remove('active');
                wishlistOverlay.classList.add('closing');
            }

            // Restore body scrolling immediately
            document.body.style.overflow = '';

            // Clean up after transition completes - match CSS timing (350ms)
            setTimeout(() => {
                if (!wishlistPanel.classList.contains('active')) {
                    wishlistPanel.classList.remove('closing');
                    
                    // Clean up overlay classes
                    if (wishlistOverlay) {
                        wishlistOverlay.classList.remove('closing');
                    }
                    
                    // Clear heavy content when panel is closed to save memory
                    const wishlistItemsContainer = wishlistPanel.querySelector('.wishlist-items');
                    if (wishlistItemsContainer && wishlistItems.length > 5) {
                        wishlistItemsContainer.innerHTML = '<div class="loading-message">Loading wishlist...</div>';
                    }
                }
            }, 350); // Match CSS transition timing exactly

            console.log('Wishlist panel closed with smooth transition');
        }
    }

    /**
     * Toggle the wishlist panel open/closed
     */
    function toggleWishlistPanel() {
        const panel = document.querySelector('.wishlist-panel');

        if (panel) {
            if (panel.classList.contains('active') || panel.classList.contains('open')) {
                closeWishlistPanel();
            } else {
                openWishlistPanel();
            }
        }
    }

    /**
     * Show a toast notification
     * @param {String} message - Message to show
     * @param {Number} duration - Duration in ms (default: 3000)
     */
    function showToast(message, duration = 3000) {
        // Remove existing toast
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        // Create new toast
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;

        // Add to document
        document.body.appendChild(toast);

        // Show toast
        setTimeout(() => toast.classList.add('show'), 10);

        // Hide toast after duration
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /**
     * Set up periodic button state updates to handle async product loading
     */
    function setupPeriodicButtonUpdate() {
        let attempts = 0;
        const maxAttempts = 20; // Check for 10 seconds

        const intervalId = setInterval(() => {
            attempts++;

            // Check if there are any product elements on the page
            const productElements = document.querySelectorAll('.product-item, .product-card, .arrival-item, .bridal-card');

            if (productElements.length > 0) {
                console.log('Found product elements, updating wishlist button states');
                updateWishlistButtonsState();
                clearInterval(intervalId);
            } else if (attempts >= maxAttempts) {
                console.log('Max attempts reached for finding product elements');
                clearInterval(intervalId);
            }
        }, 500);
    }

    // Public API
    return {
        init,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        moveToCart,
        clearWishlist,
        getWishlistItems,
        openWishlistPanel,
        closeWishlistPanel,
        toggleWishlistPanel,
        updateWishlistButtonsState
    };
})();

// Make WishlistManager globally available
window.WishlistManager = WishlistManager;

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', function() {
    WishlistManager.init();
});