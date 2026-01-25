/**
 * Auric Cart Manager
 * 
 * A simplified cart management system that handles both local storage and Firebase.
 * - Uses local storage when user is not logged in
 * - Uses Firebase when user is logged in
 * - Automatically switches between storage methods on login/logout
 * - Firebase cart data is stored at path: users/{userId}/carts/current
 */

// Make the CartManager available as a global variable
window.CartManager = (function() {
    // Private cart data storage
    let cartItems = [];
    let isAuthListenerSet = false;

    /**
     * Initialize the cart system
     * This runs when the page loads
     */
    function init() {
        console.log('Initializing cart system...');

        // Load cart data initially
        loadCart();

        // Set up cart UI elements
        setupCartPanel();

        // Set up event listeners
        setupEventListeners();

        // Set up authentication listener
        setupAuthListener();

        // Create global functions for direct HTML access
        window.openCart = openCartPanel;
        window.closeCart = closeCartPanel;
        window.toggleCart = toggleCartPanel;

        console.log('Cart system initialized with', cartItems.length, 'items');
        console.log('Global cart functions created: openCart, closeCart, toggleCart');
    }

    /**
     * Set up authentication state listener
     * This handles switching between local storage and Firebase on login/logout
     */
    function setupAuthListener() {
        if (isAuthListenerSet) return;

        // Only setup if Firebase is available
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged(async (user) => {
                if (user) {
                    console.log('User logged in, switching to Firebase storage');

                    // Make sure FirebaseCartManager is available
                    if (typeof FirebaseCartManager === 'undefined') {
                        console.warn('FirebaseCartManager not available, loading module dynamically');

                        try {
                            // Dynamically load the Firebase cart manager if not already loaded
                            const script = document.createElement('script');
                            script.src = '/js/firebase/firebase-cart-manager.js';
                            document.head.appendChild(script);

                            // Wait for script to load
                            await new Promise((resolve) => {
                                script.onload = resolve;
                                script.onerror = () => {
                                    console.error('Failed to load FirebaseCartManager');
                                    resolve();
                                };
                            });

                            // Initialize if loaded
                            if (typeof FirebaseCartManager !== 'undefined') {
                                FirebaseCartManager.init();
                            }
                        } catch (error) {
                            console.error('Error loading FirebaseCartManager:', error);
                        }
                    }

                    // Check if FirebaseCartManager is now available
                    if (typeof FirebaseCartManager !== 'undefined') {
                        try {
                            // First try to get items from Firebase
                            const result = await FirebaseCartManager.getItems();

                            if (result.success) {
                                // If user had items in local storage, we need to handle the merge
                                const localItems = LocalStorageCart.getItems();

                                if (localItems.length > 0 && result.items.length > 0) {
                                    console.log('Merging local and Firebase carts');
                                    // Merge carts, preferring the higher quantity for duplicate items
                                    const mergedItems = mergeCartItems(localItems, result.items);
                                    cartItems = mergedItems;

                                    // Save merged cart to Firebase (local storage will be cleared)
                                    await FirebaseCartManager.saveItems(mergedItems);
                                } else if (localItems.length > 0) {
                                    console.log('Moving local cart to Firebase');
                                    // User has items in local storage but not in Firebase
                                    cartItems = localItems;
                                    await FirebaseCartManager.saveItems(localItems);
                                } else {
                                    console.log('Using existing Firebase cart');
                                    // User has items in Firebase but not in local storage
                                    cartItems = result.items;
                                }

                                // Clear local storage as we're now using Firebase
                                LocalStorageCart.clearItems();
                            } else {
                                console.warn('Failed to load cart from Firebase:', result.error);
                            }
                        } catch (error) {
                            console.error('Error during cart synchronization:', error);
                            // Keep using local storage if sync fails
                        }
                    } else {
                        console.warn('FirebaseCartManager still not available after loading attempt');
                    }
                } else {
                    console.log('User logged out, switching to local storage');
                    // Load from local storage on logout
                    cartItems = LocalStorageCart.getItems();
                }

                // Update UI after login/logout
                updateCartUI();
            });

            isAuthListenerSet = true;
        }
    }

    /**
     * Merge two cart arrays, preserving the higher quantity for duplicate items
     * @param {Array} cart1 - First cart array
     * @param {Array} cart2 - Second cart array
     * @returns {Array} Merged cart array
     */
    function mergeCartItems(cart1, cart2) {
        const mergedMap = new Map();

        // Add all items from first cart
        cart1.forEach(item => {
            mergedMap.set(item.id, {...item});
        });

        // Merge with second cart, taking higher quantity
        cart2.forEach(item => {
            if (mergedMap.has(item.id)) {
                const existingItem = mergedMap.get(item.id);
                existingItem.quantity = Math.max(existingItem.quantity, item.quantity);
            } else {
                mergedMap.set(item.id, {...item});
            }
        });

        return Array.from(mergedMap.values());
    }

    /**
     * Load cart data from the appropriate storage
     * Uses Firebase if logged in, otherwise tries sessionStorage cache, then local storage
     */
    async function loadCart() {
        if (isUserLoggedIn()) {
            console.log('User logged in, loading cart from Firebase');
            try {
                // Make sure FirebaseCartManager is loaded and initialized
                if (typeof FirebaseCartManager !== 'undefined') {
                    const result = await FirebaseCartManager.getItems();
                    if (result.success) {
                        cartItems = result.items;
                    } else {
                        console.warn('Failed to load cart from Firebase:', result.error);
                        cartItems = [];
                    }
                } else {
                    console.warn('FirebaseCartManager not available, falling back to local storage');
                    cartItems = LocalStorageCart.getItems();
                }
            } catch (error) {
                console.error('Error loading cart from Firebase:', error);
                cartItems = [];
            }
        } else {
            console.log('User not logged in, checking for cached Firebase data');

            // Try to load from sessionStorage cache first (contains Firebase data)
            let foundCachedData = false;
            try {
                const cachedCart = sessionStorage.getItem('firebase_cart_cache');
                if (cachedCart) {
                    const cacheData = JSON.parse(cachedCart);

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

                            console.log('Found cached Firebase cart data:', cacheData.items.length, 'items for user:', cacheData.userId);
                            cartItems = cacheData.items;
                            foundCachedData = true;

                            // Show user a helpful message
                            console.log('ℹ️ Loaded your cart from recent session. Items from your account are available.');
                        } else {
                            console.log('Cache is stale or for different user, ignoring');
                            // Clear stale cache
                            sessionStorage.removeItem('firebase_cart_cache');
                        }
                    } else {
                        console.log('Invalid cache format, clearing');
                        sessionStorage.removeItem('firebase_cart_cache');
                    }
                }
            } catch (error) {
                console.warn('Error loading cached cart data:', error);
                sessionStorage.removeItem('firebase_cart_cache');
            }

            // If no cached data found, load from local storage
            if (!foundCachedData) {
                console.log('No cached data found, loading cart from local storage');
                cartItems = LocalStorageCart.getItems();
            }
        }

        // Update UI after loading
        updateCartUI();
    }

    /**
     * Save cart data to the appropriate storage
     * Uses Firebase if logged in, otherwise local storage
     */
    async function saveCart() {
        if (isUserLoggedIn()) {
            console.log('User logged in, saving cart to Firebase');
            try {
                // Make sure FirebaseCartManager is loaded and initialized
                if (typeof FirebaseCartManager !== 'undefined') {
                    await FirebaseCartManager.saveItems(cartItems);
                } else {
                    console.warn('FirebaseCartManager not available, saving to local storage only');
                    LocalStorageCart.saveItems(cartItems);
                }
            } catch (error) {
                console.error('Error saving cart to Firebase:', error);
                // Fallback to local storage
                LocalStorageCart.saveItems(cartItems);
            }
        } else {
            console.log('User not logged in, saving cart to local storage');
            LocalStorageCart.saveItems(cartItems);
        }

        // Update UI after saving
        updateCartUI();
    }

    /**
     * Check if user is currently logged in
     * @returns {Boolean} True if user is logged in
     */
    function isUserLoggedIn() {
        return typeof firebase !== 'undefined' && 
               firebase.auth && 
               firebase.auth().currentUser !== null;
    }

    // ======================================================
    // SECTION: CART OPERATIONS
    // ======================================================

    /**
     * Add a product to the cart
     * @param {Object} product - Product to add
     * @param {Number} quantity - Quantity to add (default: 1)
     */
    async function addToCart(product, quantity = 1) {
        if (!product || !product.id) {
            console.error('Invalid product', product);
            return;
        }

        // Check if the item already exists in the cart
        const existingItemIndex = cartItems.findIndex(item => item.id === product.id);

        if (existingItemIndex >= 0) {
            // Update quantity if item already exists
            cartItems[existingItemIndex].quantity += quantity;
            console.log('Updated quantity for', product.name);
        } else {
            // Add new item to cart
            cartItems.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                quantity: quantity
            });
            console.log('Added new item to cart:', product.name);
        }

        // Save cart
        await saveCart();

        // Show the cart panel
        openCartPanel();
    }

    /**
     * Remove a product from the cart
     * @param {String} productId - ID of the product to remove
     */
    async function removeFromCart(productId) {
        const initialLength = cartItems.length;
        cartItems = cartItems.filter(item => item.id !== productId);

        if (cartItems.length !== initialLength) {
            console.log('Item removed from cart');
            await saveCart();
        }
    }

    /**
     * Update the quantity of a product in the cart
     * @param {String} productId - ID of the product to update
     * @param {Number} newQuantity - New quantity (must be > 0)
     */
    async function updateQuantity(productId, newQuantity) {
        const item = cartItems.find(item => item.id === productId);

        if (item) {
            // Ensure quantity is at least 1
            item.quantity = Math.max(1, newQuantity);
            console.log('Updated quantity for', item.name, 'to', item.quantity);
            await saveCart();
        }
    }

    /**
     * Increment the quantity of a product in the cart
     * @param {String} productId - ID of the product to increment
     */
    async function incrementQuantity(productId) {
        const item = cartItems.find(item => item.id === productId);
        if (item) {
            await updateQuantity(productId, item.quantity + 1);
        }
    }

    /**
     * Decrement the quantity of a product in the cart
     * @param {String} productId - ID of the product to decrement
     */
    async function decrementQuantity(productId) {
        const item = cartItems.find(item => item.id === productId);
        if (item && item.quantity > 1) {
            await updateQuantity(productId, item.quantity - 1);
        }
    }

    /**
     * Clear all items from the cart
     */
    async function clearCart() {
        cartItems = [];
        console.log('Cart cleared');
        await saveCart();
    }

    /**
     * Calculate the total price of all items in the cart
     * @returns {Number} Total price
     */
    function calculateTotal() {
        return cartItems.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);
    }

    /**
     * Get the total number of items in the cart
     * @returns {Number} Total item count
     */
    function getItemCount() {
        return cartItems.reduce((count, item) => count + item.quantity, 0);
    }

    // ======================================================
    // SECTION: UI OPERATIONS
    // ======================================================

    /**
     * Set up the cart panel UI
     */
    function setupCartPanel() {
        // First check for overlay
        if (!document.querySelector('.cart-panel-overlay')) {
            document.body.insertAdjacentHTML('beforeend', '<div class="cart-panel-overlay"></div>');
        }

        // Check if the cart panel exists but don't create a new one if it already exists
        // This ensures we respect the existing cart panel in pages like index.html
        const existingCartPanel = document.querySelector('.cart-panel');

        if (!existingCartPanel) {
            // Create cart panel HTML if it doesn't exist
            const cartPanelHTML = `
                <div class="cart-panel">
                    <div class="cart-panel-header">
                        <h3>Your Cart</h3>
                        <button class="close-cart-btn">&times;</button>
                    </div>
                    <div class="cart-items">
                        <!-- Cart items will be generated here -->
                    </div>
                    <div class="cart-panel-footer">
                        <div class="cart-panel-subtotal">
                            <span>Subtotal:</span>
                            <span class="subtotal-amount">$0.00</span>
                        </div>
                        <div class="cart-panel-buttons">
                            <a href="#" class="view-cart-btn">Continue Shopping</a>
                            <a href="checkout.html" class="checkout-btn">Checkout</a>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', cartPanelHTML);
        }

        // Add cart icon to navigation
        const navIcons = document.querySelector('.nav-icons');
        if (navIcons) {
            // Check if cart icon already exists
            if (!navIcons.querySelector('.cart-icon-container')) {
                const cartIconHTML = `
                    <a href="#" class="icon-link cart-toggle">
                        <div class="cart-icon-container">
                            <i class="fas fa-shopping-cart"></i>
                            <span class="cart-count">0</span>
                        </div>
                    </a>
                `;

                navIcons.insertAdjacentHTML('beforeend', cartIconHTML);
            }
        }
    }

    /**
     * Set up all event listeners for cart functionality
     */
    function setupEventListeners() {
        // Delegate events to document to handle dynamically added elements
        document.addEventListener('click', function(e) {
            // Open cart panel when cart icon is clicked (from main nav or mobile nav)
            if (e.target.closest('.cart-toggle') || e.target.closest('.mobile-cart-toggle')) {
                e.preventDefault();
                toggleCartPanel();
            }

            // Close cart panel when close button or overlay is clicked
            if (e.target.closest('.close-cart-btn') || e.target.classList.contains('cart-panel-overlay')) {
                closeCartPanel();
            }

            // Add to cart button click for all pages including product detail pages
            if (e.target.closest('.add-to-cart-btn-small') || e.target.closest('.add-to-cart-btn'))
            {
                e.preventDefault();

                const button = e.target.closest('.add-to-cart-btn') || e.target.closest('.add-to-cart-btn-small');
                const productContainer = button.closest('[data-product-id]');

                if (productContainer) {
                    const productId = productContainer.dataset.productId;

                    // Check if we're on a product detail page
                    const isProductDetailPage = document.querySelector('.product-detail-container') !== null;

                    // Get product name - avoid placeholder text
                    let productName = '';
                    const nameElements = [
                        productContainer.querySelector('.product-name'),
                        productContainer.querySelector('.product-title'), 
                        document.querySelector('.product-title'),
                        document.querySelector('h1')
                    ].filter(el => el);

                    for (const nameEl of nameElements) {
                        const name = nameEl.textContent?.trim();
                        if (name && name !== 'Loading Product...' && name !== 'Product') {
                            productName = name;
                            break;
                        }
                    }

                    // Check if we have valid product name and it's not a loading placeholder
                    if (!productName || productName.trim() === '' || 
                        productName === 'Loading Product...' || 
                        productName === 'Product' ||
                        productName === 'Loading...' ||
                        productName.includes('Loading')) {
                        console.warn('Product not fully loaded yet, please wait...');

                        if (isProductDetailPage) {
                            // Try to show a toast notification if available
                            const showToast = window.showToast || function(msg, type) {
                                alert(msg);
                            };
                            showToast('Please wait for product details to load completely', 'info');
                        }

                        return;
                    }

                    // Get price - CRITICAL: ALWAYS use original INR price, never converted display price!
                    let price = 0;

                    // CRITICAL FIX: Priority 1 - Use global product details (product detail page)
                    if (isProductDetailPage && window.productDetails && window.productDetails.price) {
                        price = window.productDetails.price;
                        console.log('✅ CART: Using global product details ORIGINAL INR price:', price);
                    }
                    // Priority 2 - Check for data-original-price attribute (has original INR)
                    else if (productContainer.dataset.originalPrice) {
                        price = parseFloat(productContainer.dataset.originalPrice);
                        console.log('✅ CART: Using data-original-price from container:', price);
                    }
                    // Priority 3 - Check for data-product-price attribute on the product container
                    else if (productContainer.dataset.productPrice) {
                        price = parseFloat(productContainer.dataset.productPrice);
                        console.log('✅ CART: Using data-product-price from container:', price);
                    } 
                    // Priority 4 - Check price cache for original prices
                    else if (productId && window.PRODUCT_PRICES_CACHE && window.PRODUCT_PRICES_CACHE.has(productId)) {
                        price = window.PRODUCT_PRICES_CACHE.get(productId);
                        console.log('✅ CART: Using cached original price:', price);
                    }
                    // Priority 5 - Fallback: Check for data-original-price on price element
                    else {
                        let priceElem = null;

                        if (isProductDetailPage) {
                            // For product detail pages, check multiple selectors
                            priceElem = document.querySelector('.price-value') || 
                                       document.querySelector('.current-price') ||
                                       document.querySelector('.product-price') ||
                                       productContainer.querySelector('.price-value') ||
                                       productContainer.querySelector('.current-price');
                        } else {
                            // For other pages (shop, collections)
                            priceElem = productContainer.querySelector('.current-price') || 
                                       productContainer.querySelector('.price-value');
                        }

                        if (priceElem) {
                            // Check for data-original-price attribute first (stores original INR)
                            if (priceElem.dataset.originalPrice) {
                                price = parseFloat(priceElem.dataset.originalPrice);
                                console.log('✅ CART: Got price from price element data-original-price:', price);
                            } else {
                                // Last resort: parse text content (may be converted!)
                                price = parseFloat(priceElem.textContent.replace(/[^0-9.]/g, ''));
                                console.warn('⚠️ CART: Parsing text content for price (may be converted):', price);
                            }
                        }
                    }

                    // Find image source - enhanced selectors for product detail pages
                    let imageSrc = '';

                    if (isProductDetailPage) {
                        // For product detail pages, check multiple selectors
                        const imageElem = document.querySelector('.main-product-image') ||
                                         document.querySelector('.main-image-container img') ||
                                         document.querySelector('.product-gallery img') ||
                                         productContainer.querySelector('.product-image img') ||
                                         productContainer.querySelector('.main-product-image');

                        if (imageElem) {
                            imageSrc = imageElem.src;
                        }

                        // Use global product data if available
                        if (window.productDetails && window.productDetails.image) {
                            imageSrc = window.productDetails.image || imageSrc;
                            console.log('Using global product details image:', imageSrc);
                        }
                    } else {
                        // For other pages (shop, collections)
                        const imageElem = productContainer.querySelector('.product-image img') || 
                                         productContainer.querySelector('.main-product-image');

                        if (imageElem) {
                            imageSrc = imageElem.src;
                        }
                    }

                    // Get quantity if available (for product detail page)
                    let quantity = 1;
                    const quantityInput = productContainer.querySelector('.quantity-input') ||
                                         document.querySelector('.quantity-input');
                    if (quantityInput) {
                        quantity = parseInt(quantityInput.value) || 1;
                    }

                    // Create product object
                    const product = {
                        id: productId,
                        name: productName,
                        price: price,
                        image: imageSrc
                    };

                    console.log('Adding product to cart:', product);

                    // Add to cart
                    addToCart(product, quantity);
                }
            }

            // Quantity increment button click
            if (e.target.closest('.quantity-btn.increment')) {
                const productId = e.target.closest('.cart-item').dataset.productId;
                if (productId) {
                    incrementQuantity(productId);
                }
            }

            // Quantity decrement button click
            if (e.target.closest('.quantity-btn.decrement')) {
                const productId = e.target.closest('.cart-item').dataset.productId;
                if (productId) {
                    decrementQuantity(productId);
                }
            }

            // Remove item button click
            if (e.target.closest('.remove-item-btn')) {
                const productId = e.target.closest('.cart-item').dataset.productId;
                if (productId) {
                    removeFromCart(productId);
                }
            }
        });
    }

    // Debounce UI updates to prevent excessive re-renders
    let updateUITimeout;
    function updateCartUI() {
        // Clear previous timeout to debounce
        if (updateUITimeout) {
            clearTimeout(updateUITimeout);
        }

        updateUITimeout = setTimeout(() => {
            updateCartUIImmediate();
        }, 50); // 50ms debounce
    }

    /**
     * Immediate cart UI update (internal use)
     */
    function updateCartUIImmediate() {
        // Update cart count display with requestAnimationFrame for smooth updates
        requestAnimationFrame(() => {
            const itemCount = getItemCount();

            // Update cart count badges efficiently
            const cartCountElements = document.querySelectorAll('.cart-count');
            cartCountElements.forEach(element => {
                if (element.textContent !== itemCount.toString()) {
                    element.textContent = itemCount;
                    element.style.display = 'flex';
                }
            });

            // Update mobile cart count
            const mobileCountElement = document.querySelector('.mobile-cart-count');
            if (mobileCountElement && mobileCountElement.textContent !== itemCount.toString()) {
                mobileCountElement.textContent = itemCount;
            }

            // Update subtotal immediately (it's always visible)
            const subtotalElement = document.querySelector('.subtotal-amount');
            if (subtotalElement) {
                // Get current currency symbol from CurrencyConverter
                let currencySymbol = '₹';
                let totalINR = calculateTotal();
                let displayTotal = totalINR;
                
                if (typeof window.CurrencyConverter !== 'undefined' && window.CurrencyConverter.getCurrencySymbol) {
                    currencySymbol = window.CurrencyConverter.getCurrencySymbol();
                    // Convert INR total to current currency
                    if (window.CurrencyConverter.convertPrice) {
                        displayTotal = window.CurrencyConverter.convertPrice(totalINR);
                    }
                }
                const total = `${currencySymbol}${displayTotal.toFixed(2)}`;
                if (subtotalElement.textContent !== total) {
                    subtotalElement.textContent = total;
                    // Store original INR price for currency converter to use
                    subtotalElement.dataset.originalPrice = totalINR;
                }
            }

            // Update checkout button visibility
            const checkoutBtn = document.querySelector('.checkout-btn');
            if (checkoutBtn) {
                const shouldShow = cartItems.length > 0;
                const currentlyVisible = checkoutBtn.style.display !== 'none';
                if (shouldShow !== currentlyVisible) {
                    checkoutBtn.style.display = shouldShow ? 'block' : 'none';
                }
            }
        });

        // Update cart items display only when panel is open (defer when closed)
        const cartPanel = document.querySelector('.cart-panel');
        if (cartPanel && cartPanel.classList.contains('active')) {
            updateCartItemsDisplay();
        }
    }

    /**
     * Update cart items display (heavy DOM operation)
     */
    function updateCartItemsDisplay() {
        const cartItemsContainer = document.querySelector('.cart-items');
        if (!cartItemsContainer) return;

        if (cartItems.length === 0) {
            cartItemsContainer.innerHTML = '<div class="empty-cart-message" data-translate="your_cart_empty">Your cart is empty</div>';
            
            // Trigger translation for the newly added element
            if (typeof LanguageTranslator !== 'undefined' && LanguageTranslator.getCurrentLanguage() !== 'en') {
                setTimeout(() => LanguageTranslator.translatePage(), 100);
            }
            return;
        }

        // Use DocumentFragment for efficient DOM updates
        const fragment = document.createDocumentFragment();

        cartItems.forEach(item => {
            // Get current currency symbol from CurrencyConverter
            let currencySymbol = '₹';
            let itemPriceDisplay = item.price;
            
            if (typeof window.CurrencyConverter !== 'undefined' && window.CurrencyConverter.getCurrencySymbol) {
                currencySymbol = window.CurrencyConverter.getCurrencySymbol();
                // Convert item price from INR to current currency
                if (window.CurrencyConverter.convertPrice) {
                    itemPriceDisplay = window.CurrencyConverter.convertPrice(item.price);
                }
            }
            
            // Calculate item total in current currency
            const itemTotalDisplay = (itemPriceDisplay * item.quantity).toFixed(2);

            const cartItemDiv = document.createElement('div');
            cartItemDiv.className = 'cart-item';
            cartItemDiv.setAttribute('data-product-id', item.id);

            cartItemDiv.innerHTML = `
                <div class="cart-item-image">
                    <img src="${item.image}" alt="${item.name}" loading="lazy">
                </div>
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price" data-original-price="${item.price}">${currencySymbol}${itemPriceDisplay.toFixed(2)}</div>
                    <div class="cart-item-quantity">
                        <button class="quantity-btn decrement">-</button>
                        <input type="text" class="quantity-input" value="${item.quantity}" readonly>
                        <button class="quantity-btn increment">+</button>
                    </div>
                    <div class="cart-item-total" data-original-price="${item.price * item.quantity}">${currencySymbol}${itemTotalDisplay}</div>
                </div>
                <button class="remove-item-btn">&times;</button>
            `;

            fragment.appendChild(cartItemDiv);
        });

        // Single DOM update
        cartItemsContainer.innerHTML = '';
        cartItemsContainer.appendChild(fragment);
    }

    /**
     * Open the cart panel with smooth transitions
     */
    function openCartPanel() {
        const cartPanel = document.querySelector('.cart-panel');
        const cartOverlay = document.querySelector('.cart-panel-overlay');

        console.log('Opening cart panel:', cartPanel ? 'Panel found' : 'Panel NOT found');

        if (cartPanel && cartOverlay) {
            // Check if already open
            if (cartPanel.classList.contains('active')) {
                console.log('Cart already open, just updating display');
                updateCartItemsDisplay();
                return;
            }

            // Clean state - remove any closing classes
            cartOverlay.classList.remove('closing');

            // Prevent body scrolling immediately
            document.body.style.overflow = 'hidden';

            // Update cart display first (before opening)
            updateCartItemsDisplay();

            // Use double requestAnimationFrame for smoother transition
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    // Show overlay and panel with CSS classes
                    cartOverlay.classList.add('active');
                    cartPanel.classList.add('active');
                });
            });

            console.log('Cart panel opened with smooth transition');
        } else {
            console.error('Cart panel or overlay not found');

            // Fallback creation
            if (!cartPanel) {
                setupCartPanel();
                setTimeout(() => openCartPanel(), 50);
                return;
            }

            if (!cartOverlay) {
                document.body.insertAdjacentHTML('beforeend', '<div class="cart-panel-overlay"></div>');
                setTimeout(() => openCartPanel(), 50);
                return;
            }
        }
    }

    /**
     * Close the cart panel with smooth transitions
     */
    function closeCartPanel() {
        const cartPanel = document.querySelector('.cart-panel');
        const cartOverlay = document.querySelector('.cart-panel-overlay');

        console.log('Closing cart panel:', cartPanel ? 'Panel found' : 'Panel NOT found');

        if (cartPanel) {
            // Simply remove active class - CSS will handle smooth transition
            cartPanel.classList.remove('active');

            // Hide overlay
            if (cartOverlay) {
                cartOverlay.classList.remove('active');
                cartOverlay.classList.add('closing');
            }

            // Wait for CSS transition to complete (400ms)
            setTimeout(() => {
                // Only cleanup if panel is still closed (not reopened)
                if (!cartPanel.classList.contains('active')) {
                    // Restore body scrolling
                    document.body.style.overflow = '';
                    
                    // Clean up overlay closing class
                    if (cartOverlay) {
                        cartOverlay.classList.remove('closing');
                    }
                }
            }, 450); // Match CSS transition duration (0.4s) + small buffer

            console.log('Cart panel closing with smooth transition');
        }

        // Ensure global function exists
        if (typeof window.closeCart !== 'function') {
            window.closeCart = closeCartPanel;
        }
    }

    /**
     * Toggle the cart panel open/closed
     */
    function toggleCartPanel() {
        const cartPanel = document.querySelector('.cart-panel');

        if (cartPanel && cartPanel.classList.contains('active')) {
            closeCartPanel();
        } else {
            openCartPanel();
        }
    }

    // Public API
    return {
        init: init,
        addToCart: addToCart,
        removeFromCart: removeFromCart,
        updateQuantity: updateQuantity,
        incrementQuantity: incrementQuantity,
        decrementQuantity: decrementQuantity,
        clearCart: clearCart,
        getCartItems: () => [...cartItems], // Return copy of items array
        getItemCount: getItemCount,
        calculateTotal: calculateTotal,
        openCartPanel: openCartPanel,
        closeCartPanel: closeCartPanel,
        toggleCartPanel: toggleCartPanel,
        saveCart: saveCart // Expose saveCart for external bulk operations
    };
})();

// We'll initialize CartManager from main.js to ensure a single initialization point
// This prevents double initialization issues