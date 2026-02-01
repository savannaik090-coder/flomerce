/**
 * Auric Checkout Script
 * Handles the checkout process, including:
 * - Loading cart items from local storage or api (if user is logged in)
 * - Displaying items in the order summary
 * - Authentication requirement for order placement
 * - Order storage in api under users/{userId}/orders
 * - Order form submission with Nodemailer email notifications via the server
 * - Stock management and inventory updates after order placement
 */

// Stock update function for order completion
async function updateStockAfterOrder(orderProducts) {
    try {
        console.log('Updating stock after order placement for products:', orderProducts);

        if (typeof StockManager === 'undefined') {
            console.warn('StockManager not available, skipping stock updates');
            return { success: false, error: 'StockManager not loaded' };
        }

        const result = await StockManager.updateStockAfterOrder(orderProducts);

        if (result.success) {
            console.log('Stock updated successfully:', result.updates);
            if (result.outOfStockProducts.length > 0) {
                console.log('Products now out of stock:', result.outOfStockProducts);
            }
            if (result.lowStockProducts.length > 0) {
                console.log('Products with low stock:', result.lowStockProducts);
            }
        } else {
            console.error('Failed to update stock:', result.error);
        }

        return result;

    } catch (error) {
        console.error('Error in updateStockAfterOrder:', error);
        return { success: false, error: error.message };
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Add global error handler for unhandled promise rejections
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection caught:', event.reason);
        // Prevent the error from propagating and causing issues
        event.preventDefault();

        // Show user-friendly error message for critical errors
        if (event.reason && event.reason.message && event.reason.message.includes('payment')) {
            showErrorModal('Payment processing failed. Please try again or contact support.');
        } else if (event.reason && event.reason.message && event.reason.message.includes('email')) {
            console.warn('Email sending failed but order processing continues');
        } else {
            // For other errors, log but don't show to user unless it's critical
            console.warn('Non-critical error handled silently');
        }
    });

    // Constants
    const STORAGE_KEY = 'auric_cart_items';
    let apiCartModule = null;
    let apiOrdersModule = null;
    let isLoadingCart = false; // Flag to prevent multiple loading operations

    // DOM Elements for Order Summary and Form
    const orderSummaryContainer = document.getElementById('orderSummary');
    const orderSummaryStep2 = document.getElementById('orderSummaryStep2');
    const orderSummaryStep3 = document.getElementById('orderSummaryStep3');
    // 'orderSummaryDetails' has been removed as we no longer have 'Your Items' section
    const orderTotalElement = document.getElementById('orderTotal');
    const orderTotalStep2 = document.getElementById('orderTotalStep2');
    const orderTotalStep3 = document.getElementById('orderTotalStep3');
    const checkoutForm = document.getElementById('checkoutForm');
    const productListContainer = document.getElementById('productList');

    // DOM Elements for Checkout Steps
    const step1 = document.getElementById('checkout-step-1');
    const step2 = document.getElementById('checkout-step-2');
    const step3 = document.getElementById('checkout-step-3');
    const stepIcon1 = document.getElementById('step-icon-1');
    const stepIcon2 = document.getElementById('step-icon-2');
    const stepIcon3 = document.getElementById('step-icon-3');
    const progressBar = document.getElementById('checkout-progress-bar');
    const addressConfirmation = document.getElementById('address-confirmation');

    // DOM Elements for Step Navigation
    const continueToAddressBtn = document.getElementById('continue-to-address');
    const backToSummaryBtn = document.getElementById('back-to-summary');
    const continueToPaymentBtn = document.getElementById('continue-to-payment');
    const backToAddressBtn = document.getElementById('back-to-address');

    // A simplified api integration function that focuses on reliability
    function initializeapiIntegration() {
        console.log('Initializing api integration (simplified version)');

        try {
            // First try to access LocalStorageCart for reliable cart access
            if (typeof LocalStorageCart !== 'undefined' && LocalStorageCart.getItems) {
                console.log('Using LocalStorageCart module for checkout');
            } else {
                console.log('LocalStorageCart module not available');
            }

            // Try to use API-based cart if available
            if (typeof AuthService !== 'undefined' && typeof ApiCartManager !== 'undefined') {
                console.log('AuthService detected, will try to use API cart if user is logged in');

                // Create API cart module wrapper
                apiCartModule = {
                    loadCartFromapi: async function() {
                        try {
                            console.log('Loading cart from API...');
                            const result = await ApiCartManager.getItems();
                            return result;
                        } catch (error) {
                            console.error('Error loading cart from API:', error);
                            return { success: false, items: [] };
                        }
                    },
                    saveCartToapi: async function(items) {
                        try {
                            console.log('Saving cart to API...');
                            const result = await ApiCartManager.syncCart(items);
                            return result;
                        } catch (error) {
                            console.error('Error saving cart to API:', error);
                            return { success: false, error: error.message };
                        }
                    },
                    clearapiCart: async function() {
                        try {
                            console.log('Clearing API cart...');
                            const result = await ApiCartManager.clearCart();
                            return result;
                        } catch (error) {
                            console.error('Error clearing API cart:', error);
                            return { success: false, error: error.message };
                        }
                    }
                };
                console.log('API cart module initialized with all methods');

                // Update checkout button state
                setTimeout(() => {
                    updateCheckoutButtonState();
                }, 100);
            } else {
                console.log('AuthService not available, using local storage only');
            }
        } catch (error) {
            console.error('Error initializing api integration:', error);
        }
    }

    // Fallback to local storage if API not available
    function loadLegacyapiCartModule() {
        console.log('Using local storage for cart management');
        // API-based cart will be used if AuthService and ApiCartManager are available
        if (typeof AuthService !== 'undefined' && AuthService.isLoggedIn()) {
            loadCartFromapi();
        }
    }

    /**
     * Update checkout button state based on authentication
     * Guest checkout is now enabled - button is always enabled for all users
     */
    function updateCheckoutButtonState() {
        console.log('Updating checkout button state');

        const submitButton = checkoutForm?.querySelector('button[type="submit"]');
        if (!submitButton) {
            console.log('Submit button not found');
            return;
        }

        // Check if user is logged in
        const isLoggedIn = typeof AuthService !== 'undefined' && AuthService.isLoggedIn();
        console.log('User authentication status:', isLoggedIn ? 'Logged in' : 'Not logged in');

        // GUEST CHECKOUT ENABLED - Always show "Place Order" button for all users
        submitButton.innerHTML = 'Place Order';
        submitButton.classList.remove('auth-required');
        submitButton.removeEventListener('click', showAuthRequirementModal);
        submitButton.disabled = false;
        submitButton.classList.remove('disabled');

        // Make sure the form uses the standard submit handler
        if (checkoutForm) {
            checkoutForm.removeEventListener('submit', showAuthRequirementModal);
            if (!checkoutForm._hasSubmitHandler) {
                checkoutForm.addEventListener('submit', handleSubmit);
                checkoutForm._hasSubmitHandler = true;
            }
        }

        console.log('Button state updated - guest checkout enabled for all users');
    }

    // Show modal requiring authentication before order placement
    function showAuthRequirementModal(e) {
        e.preventDefault();
        e.stopPropagation();

        console.log('Showing auth requirement modal');
        // Show account creation modal
        showCreateAccountModal();
        return false;
    }

    // Load cart items from api for logged in users - WITH 5 SECOND TIMEOUT
    async function loadCartFromapi() {
        try {
            if (typeof AuthService === 'undefined' || !AuthService.isLoggedIn()) {
                console.log('User not logged in for API cart access');
                return [];
            }

            console.log('Loading cart from api with 5-second timeout...');

            // Create a timeout promise that rejects after 5 seconds
            const timeoutPromise = new Promise((resolve, reject) => {
                setTimeout(() => {
                    reject(new Error('api cart loading timed out after 5 seconds'));
                }, 5000);
            });

            // Try to use apiCartManager directly if available
            if (typeof apiCartManager !== 'undefined' && typeof apiCartManager.getItems === 'function') {
                console.log('Using apiCartManager directly with timeout protection');
                try {
                    // Race between api call and timeout - whichever finishes first wins
                    const result = await Promise.race([
                        apiCartManager.getItems(),
                        timeoutPromise
                    ]);
                    console.log('apiCartManager result received within timeout:', result);

                    if (result && result.success && result.items) {
                        console.log('✅ api cart loaded successfully:', result.items.length, 'items');
                        return result.items;
                    } else if (result && result.items) {
                        // Handle case where success flag might be missing but items exist
                        console.log('✅ api cart loaded (no success flag):', result.items.length, 'items');
                        return result.items;
                    } else {
                        console.log('api cart is empty or failed to load');
                        return [];
                    }
                } catch (timeoutError) {
                    if (timeoutError.message.includes('timed out')) {
                        console.warn('⏱️ api cart loading timed out after 5 seconds, falling back to localStorage');
                        return []; // Will trigger fallback to localStorage in calling function
                    }
                    throw timeoutError;
                }
            }
            // Fallback to apiCartModule if available
            else if (apiCartModule && apiCartModule.loadCartFromapi) {
                console.log('Using apiCartModule wrapper with timeout protection');
                try {
                    const result = await Promise.race([
                        apiCartModule.loadCartFromapi(),
                        timeoutPromise
                    ]);

                    if (result && result.success && result.items) {
                        console.log('✅ Cart loaded from api using wrapper:', result.items.length, 'items');
                        return result.items;
                    } else {
                        console.log('api cart is empty (from wrapper)');
                        return [];
                    }
                } catch (timeoutError) {
                    if (timeoutError.message.includes('timed out')) {
                        console.warn('⏱️ api cart wrapper timed out after 5 seconds, falling back to localStorage');
                        return []; // Will trigger fallback to localStorage in calling function
                    }
                    throw timeoutError;
                }
            } else {
                console.log('No api cart methods available');
                return [];
            }
        } catch (error) {
            console.error('❌ Error in loadCartFromapi:', error.message);
            console.log('📦 Will fallback to localStorage');
            return [];
        }
    }

    // Load cart items from local storage
    function loadCartFromLocalStorage() {
        try {
            // Use LocalStorageCart if available, otherwise fall back to direct localStorage access
            if (typeof LocalStorageCart !== 'undefined') {
                console.log('📥 Using LocalStorageCart module for checkout');
                const cartItems = LocalStorageCart.getItems();
                console.log('📥 LocalStorageCart returned', cartItems.length, 'items');
                cartItems.forEach(item => {
                    console.log(`   📍 Item: ${item.name} - Quantity: ${item.quantity}`);
                });
                return cartItems;
            } else {
                // Fallback to direct localStorage access
                console.log('📥 LocalStorageCart not available, using direct access');
                const savedCart = localStorage.getItem(STORAGE_KEY);

                if (savedCart) {
                    const cartItems = JSON.parse(savedCart);
                    console.log('📥 Direct localStorage returned', cartItems.length, 'items');
                    cartItems.forEach(item => {
                        console.log(`   📍 Item: ${item.name} - Quantity: ${item.quantity}`);
                    });
                    return cartItems;
                } else {
                    console.log('📥 No cart found in localStorage');
                    return [];
                }
            }
        } catch (error) {
            console.error('❌ Error loading cart from storage:', error);
            return [];
        }
    }

    // Load and display cart items - prioritizes api if user is logged in
    async function loadCartItems() {
        console.log('Loading cart items for checkout display...');

        // Prevent multiple simultaneous loading operations
        if (isLoadingCart) {
            console.log('Cart loading already in progress, skipping...');
            return [];
        }

        isLoadingCart = true;

        // Show loading state immediately and keep it visible throughout the entire process
        showLoadingState();
        console.log('Loading state displayed, starting cart loading process...');

        // Ensure loading state is visible for at least 500ms minimum
        const startTime = Date.now();

        // Ensure api integration is initialized
        initializeapiIntegration();

        try {
            // Check if user is logged in first
            const isUserLoggedIn = typeof AuthService !== 'undefined' && AuthService.isLoggedIn();
            console.log('User login status:', isUserLoggedIn ? 'Logged in' : 'Not logged in');

            // Update checkout button state based on login status
            updateCheckoutButtonState();

            let cartItems = [];

            // Use api if available and user is logged in, otherwise use local storage
            if (isUserLoggedIn) {
                console.log('User is logged in, trying api cart first');
                try {
                    // Wait for the api cart to load
                    console.log('Calling loadCartFromapi...');
                    const items = await loadCartFromapi();
                    console.log('api cart items loaded:', items ? items.length : 0);

                    if (items && items.length > 0) {
                        cartItems = items;
                        console.log('Using api cart items:', cartItems.length);
                    } else {
                        console.log('api cart empty, falling back to local storage');
                        cartItems = loadCartFromLocalStorage();
                        console.log('Local storage cart items:', cartItems.length);
                    }
                } catch (apiError) {
                    console.error('Error loading from api, falling back to local storage:', apiError);
                    cartItems = loadCartFromLocalStorage();
                    console.log('Fallback local storage cart items:', cartItems.length);
                }
            } else {
                // Fallback to local storage for non-logged in users
                console.log('Loading cart from local storage');
                cartItems = loadCartFromLocalStorage();
                console.log('Local storage cart items:', cartItems.length);
            }

            // Ensure minimum loading time even for errors
            const elapsedTime = Date.now() - startTime;
            const minimumLoadingTime = 500;

            if (elapsedTime < minimumLoadingTime) {
                console.log(`Loading completed in ${elapsedTime}ms, waiting additional ${minimumLoadingTime - elapsedTime}ms for better UX`);
                await new Promise(resolve => setTimeout(resolve, minimumLoadingTime - elapsedTime));
            }

            // Now display the final result
            if (cartItems && cartItems.length > 0) {
                console.log('Displaying', cartItems.length, 'cart items on checkout page');
                displayCartItems(cartItems);
            } else {
                console.log('No cart items found, showing empty cart message');
                showEmptyCartMessage();
            }

            console.log('Cart loading completed successfully');
            return cartItems;
        } catch (error) {
            console.error('Error in loadCartItems:', error);

            // Ensure minimum loading time even for errors
            const elapsedTime = Date.now() - startTime;
            const minimumLoadingTime = 500;

            if (elapsedTime < minimumLoadingTime) {
                await new Promise(resolve => setTimeout(resolve, minimumLoadingTime - elapsedTime));
            }

            // CRITICAL: Hide loading state on error
            hideLoadingState();
            console.log('🔴 Error occurred - loading state hidden');

            // Ultimate fallback
            console.log('Error encountered, showing empty cart message');
            showEmptyCartMessage();
            return [];
        } finally {
            // Reset loading flag regardless of success or failure
            isLoadingCart = false;
            console.log('Cart loading flag reset');
        }
    }

    // Display cart items in the order summary
    function displayCartItems(items) {
        // Get current currency symbol
        let currencySymbol = '₹';
        if (typeof window.CurrencyConverter !== 'undefined' && window.CurrencyConverter.getCurrencySymbol) {
            currencySymbol = window.CurrencyConverter.getCurrencySymbol();
        }
        let summaryHTML = '';
        // No longer need detailsHTML since we removed the 'Your Items' section
        let total = 0;

        // Clear product list container first to prevent duplicates
        if (productListContainer) {
            productListContainer.innerHTML = '';
        }

        items.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += item.total || itemTotal; // Use item.total if available, otherwise calculate

            // Convert prices for display
            let itemPriceDisplay = item.price;
            let itemTotalDisplay = itemTotal;
            if (typeof window.CurrencyConverter !== 'undefined' && window.CurrencyConverter.convertPrice) {
                itemPriceDisplay = window.CurrencyConverter.convertPrice(item.price);
                itemTotalDisplay = window.CurrencyConverter.convertPrice(itemTotal);
            }

            // HTML for order summary (compact version for sidebar)
            summaryHTML += `
                <div class="card mb-2 cart-item" data-item-id="${item.id}">
                    <div class="card-body">
                        <div class="d-flex align-items-center">
                            ${item.image ? `<div class="me-3" style="width: 60px; height: 60px; overflow: hidden; border-radius: 4px;">
                                <img src="${item.image}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover;">
                            </div>` : ''}
                            <div class="flex-grow-1">
                                <h6 class="mb-0">${item.name}</h6>
                                <div class="d-flex justify-content-between align-items-center mt-2">
                                    <div class="d-flex align-items-center">
                                        <span class="me-2 product-price" data-original-price="${item.price}">${currencySymbol}${itemPriceDisplay.toFixed(2)}</span>
                                        <div class="quantity-controls d-flex align-items-center border rounded">
                                            <button type="button" class="btn btn-sm btn-quantity-minus" data-item-id="${item.id}">-</button>
                                            <span class="px-2 quantity-value" data-item-id="${item.id}">${item.quantity}</span>
                                            <button type="button" class="btn btn-sm btn-quantity-plus" data-item-id="${item.id}">+</button>
                                        </div>
                                    </div>
                                    <span class="fw-bold item-subtotal" data-item-id="${item.id}" data-original-price="${itemTotal}">${currencySymbol}${itemTotalDisplay.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // We no longer need detailsHTML since we removed the 'Your Items' section

            // Add hidden fields for form submission
            const hiddenItem = document.createElement('input');
            hiddenItem.type = 'hidden';
            hiddenItem.name = 'products[]';
            hiddenItem.className = 'product-data';
            hiddenItem.setAttribute('data-item-id', item.id);
            hiddenItem.value = JSON.stringify({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                total: item.total || itemTotal, // Ensure total is included
                image: item.image
            });

            if (productListContainer) {
                productListContainer.appendChild(hiddenItem);
            }
        });

        // Update order summary (sidebar)
        if (orderSummaryContainer) {
            if (items.length > 0) {
                orderSummaryContainer.innerHTML = summaryHTML;
            } else {
                // Don't show empty message during loading - only show when loading is complete
                if (!isLoadingCart) {
                    orderSummaryContainer.innerHTML = '<p>No products added yet.</p>';
                }
                // If loading, keep the existing loading state
            }
        }

        // Update all total price displays
        let totalDisplay = total;
        if (typeof window.CurrencyConverter !== 'undefined' && window.CurrencyConverter.convertPrice) {
            totalDisplay = window.CurrencyConverter.convertPrice(total);
        }
        if (orderTotalElement) {
            orderTotalElement.textContent = `${currencySymbol}${totalDisplay.toFixed(2)}`;
            orderTotalElement.dataset.originalPrice = total; // Store original price for currency conversion
        }

        // Add event listeners to quantity buttons
        setupQuantityControls(items);
        
        console.log('✅ Cart items displayed successfully');
    }

    // Set up quantity control buttons
    function setupQuantityControls(items) {
        // Save items to the global variable to ensure it's up to date
        window.checkoutCartItems = items;

        // Set up controls for the main order summary container
        setupQuantityControlsForContainer(document, items);
    }

    // Helper function to set up quantity controls for a specific container
    function setupQuantityControlsForContainer(container, items) {
        if (!container || !items) return;

        // Get all plus buttons within this container
        const plusButtons = container.querySelectorAll('.btn-quantity-plus');
        plusButtons.forEach(button => {
            // Remove existing listeners to prevent duplicates
            button.replaceWith(button.cloneNode(true));
        });

        // Get all minus buttons within this container
        const minusButtons = container.querySelectorAll('.btn-quantity-minus');
        minusButtons.forEach(button => {
            // Remove existing listeners to prevent duplicates
            button.replaceWith(button.cloneNode(true));
        });

        // Re-get buttons after cloning and add fresh event listeners
        const newPlusButtons = container.querySelectorAll('.btn-quantity-plus');
        newPlusButtons.forEach(button => {
            button.addEventListener('click', async function() {
                const itemId = this.getAttribute('data-item-id');
                await incrementItemQuantity(itemId, window.checkoutCartItems);
            });
        });

        const newMinusButtons = container.querySelectorAll('.btn-quantity-minus');
        newMinusButtons.forEach(button => {
            button.addEventListener('click', async function() {
                const itemId = this.getAttribute('data-item-id');
                await decrementItemQuantity(itemId, window.checkoutCartItems);
            });
        });
    }

    // Increment item quantity
    async function incrementItemQuantity(itemId, items) {
        // Update the items array
        const itemIndex = items.findIndex(item => item.id === itemId);
        if (itemIndex !== -1) {
            items[itemIndex].quantity += 1;

            console.log('📦 Quantity incremented for item:', itemId, 'New quantity:', items[itemIndex].quantity);

            // Update the display
            updateQuantityDisplay(itemId, items[itemIndex]);

            // Update BOTH localStorage and api - MUST WAIT FOR api
            await syncCartToStorage(items);
            
            // Update order total
            updateOrderTotal(items);
        }
    }

    // Decrement item quantity
    async function decrementItemQuantity(itemId, items) {
        // Update the items array
        const itemIndex = items.findIndex(item => item.id === itemId);
        if (itemIndex !== -1 && items[itemIndex].quantity > 1) {
            items[itemIndex].quantity -= 1;

            console.log('📦 Quantity decremented for item:', itemId, 'New quantity:', items[itemIndex].quantity);

            // Update the display
            updateQuantityDisplay(itemId, items[itemIndex]);

            // Update BOTH localStorage and api - MUST WAIT FOR api
            await syncCartToStorage(items);
            
            // Update order total
            updateOrderTotal(items);
        }
    }

    // Sync cart to both localStorage and api (AWAITABLE)
    // This ensures quantity changes are persisted before user navigates away
    async function syncCartToStorage(items) {
        try {
            // Always save to localStorage first (instant)
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
            console.log('💾 Quantity change saved to localStorage');

            // If user is logged in, AWAIT api update
            if (apiCartModule && typeof AuthService !== 'undefined' && AuthService.isLoggedIn()) {
                console.log('🔄 Syncing to api...');
                try {
                    const result = await Promise.race([
                        apiCartModule.saveCartToapi(items),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('api timeout')), 5000)
                        )
                    ]);
                    
                    if (result && result.success) {
                        console.log('☁️ ✅ Quantity change confirmed in api');
                    } else {
                        console.warn('⚠️ api save did not confirm success');
                    }
                } catch (err) {
                    console.error('❌ api save failed:', err.message, '- but localStorage persisted');
                }
            } else {
                console.log('📱 Guest user - quantity saved to localStorage only');
            }
        } catch (error) {
            console.error('❌ Error syncing cart:', error);
            throw error;
        }
    }

    // Update quantity display across all steps
    function updateQuantityDisplay(itemId, item) {
        // Get current currency symbol
        let currencySymbol = '₹';
        if (typeof window.CurrencyConverter !== 'undefined' && window.CurrencyConverter.getCurrencySymbol) {
            currencySymbol = window.CurrencyConverter.getCurrencySymbol();
        }
        
        // Update quantity value in all steps
        const quantityElements = document.querySelectorAll(`.quantity-value[data-item-id="${itemId}"]`);
        quantityElements.forEach(element => {
            element.textContent = item.quantity;
        });

        // Update subtotal in all steps
        const itemTotal = item.price * item.quantity;
        
        // Convert to display currency if available
        let itemTotalDisplay = itemTotal;
        if (typeof window.CurrencyConverter !== 'undefined' && window.CurrencyConverter.convertPrice) {
            itemTotalDisplay = window.CurrencyConverter.convertPrice(itemTotal);
        }
        
        const subtotalElements = document.querySelectorAll(`.item-subtotal[data-item-id="${itemId}"]`);
        subtotalElements.forEach(element => {
            element.textContent = `${currencySymbol}${itemTotalDisplay.toFixed(2)}`;
            element.dataset.originalPrice = itemTotal; // Update data attribute for currency converter
        });

        // Update hidden input field (store original INR for backend)
        const hiddenInput = document.querySelector(`.product-data[data-item-id="${itemId}"]`);
        if (hiddenInput) {
            const productData = JSON.parse(hiddenInput.value);
            productData.quantity = item.quantity;
            productData.total = itemTotal;
            hiddenInput.value = JSON.stringify(productData);
        }
    }

    // Update order total across all steps
    function updateOrderTotal(items) {
        // Get current currency symbol
        let currencySymbol = '₹';
        if (typeof window.CurrencyConverter !== 'undefined' && window.CurrencyConverter.getCurrencySymbol) {
            currencySymbol = window.CurrencyConverter.getCurrencySymbol();
        }
        
        const total = calculateTotal(items);
        
        // Convert to display currency if available
        let totalDisplay = total;
        if (typeof window.CurrencyConverter !== 'undefined' && window.CurrencyConverter.convertPrice) {
            totalDisplay = window.CurrencyConverter.convertPrice(total);
        }

        // Update total in all steps
        if (orderTotalElement) {
            orderTotalElement.textContent = `${currencySymbol}${totalDisplay.toFixed(2)}`;
            orderTotalElement.dataset.originalPrice = total; // Store original price for currency conversion
        }
        if (orderTotalStep2) {
            orderTotalStep2.textContent = `${currencySymbol}${totalDisplay.toFixed(2)}`;
            orderTotalStep2.dataset.originalPrice = total; // Store original price for currency conversion
        }
        if (orderTotalStep3) {
            orderTotalStep3.textContent = `${currencySymbol}${totalDisplay.toFixed(2)}`;
            orderTotalStep3.dataset.originalPrice = total; // Store original price for currency conversion
        }
    }

    // Update localStorage with current cart items
    // Also syncs with api if user is logged in
    function updateLocalStorage(items) {
        try {
            // ALWAYS use direct localStorage for immediate persistence
            // This ensures the cart is saved before any navigation
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
            console.log('💾 Cart persisted to localStorage:', items.length, 'items');
            
            // Also try to use our new cart modules if available
            if (typeof LocalStorageCart !== 'undefined' && LocalStorageCart.saveItems) {
                // Use new LocalStorageCart module as secondary save
                LocalStorageCart.saveItems(items);
                console.log('📦 Cart also updated using LocalStorageCart module');
            }

            // If api cart module is loaded and user is logged in, also save to api
            if (apiCartModule && typeof AuthService !== 'undefined' && AuthService.isLoggedIn()) {
                apiCartModule.saveCartToapi(items)
                    .then(result => {
                        if (result.success) {
                            console.log('☁️ Cart updated in api from checkout page');
                        } else {
                            console.warn('⚠️ Failed to update cart in api:', result.error);
                        }
                    })
                    .catch(err => {
                        console.error('❌ Error updating api cart:', err);
                    });
            }
        } catch (error) {
            console.error('❌ Error saving cart to storage:', error);

            // Always try the most basic fallback method on error
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
                console.log('💾 Cart saved via fallback direct localStorage');
            } catch (fallbackError) {
                console.error('🔴 CRITICAL ERROR: Failed to save cart with fallback method', fallbackError);
            }
        }
    }

    // Show loading state for order summary
    function showLoadingState() {
        console.log('Showing loading state for order summary');

        if (orderSummaryContainer) {
            orderSummaryContainer.innerHTML = `
                <div class="text-center py-4 checkout-loading-state">
                    <div class="spinner-border text-primary" role="status" style="width: 2rem; height: 2rem;">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2 text-muted">Loading your cart items...</p>
                    <small class="text-muted">Please wait while we fetch your products</small>
                </div>
            `;
            console.log('Loading state HTML set in order summary container');
        } else {
            console.warn('orderSummaryContainer not found for loading state');
        }

        if (orderTotalElement) {
            orderTotalElement.textContent = 'Loading...';
            console.log('Order total set to Loading...');
        } else {
            console.warn('orderTotalElement not found for loading state');
        }

        // Also clear any existing product list to prevent showing old data
        if (productListContainer) {
            productListContainer.innerHTML = '';
            console.log('Product list container cleared');
        }
    }

    // Hide loading state for order summary - ONLY clear spinner, not products
    function hideLoadingState() {
        console.log('🔵 Hiding loading state - clearing spinner');
        
        // Find and remove ONLY the spinner element, not the entire container
        const spinner = document.querySelector('.checkout-loading-state');
        if (spinner) {
            spinner.remove();
            console.log('Loading spinner removed');
        }
    }

    // Show empty cart message
    function showEmptyCartMessage() {
        // Don't show empty message during loading - keep the loading state
        if (isLoadingCart) {
            console.log('Skipping empty cart message during loading');
            return;
        }

        // First hide the loading state
        hideLoadingState();

        if (orderSummaryContainer) {
            orderSummaryContainer.innerHTML = '<p class="text-center text-muted">Your cart is empty. Please add some products before checkout.</p>';
        }

        if (orderTotalElement) {
            orderTotalElement.textContent = currencySymbol + '0.00';
        }

        // Disable the submit button
        const submitButton = checkoutForm?.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
        }
    }

    // Handle form submission
    async function handleSubmit(e) {
        e.preventDefault();

        // GUEST CHECKOUT ENABLED - No authentication check required
        console.log('Processing order - guest checkout enabled');

        // Save address if user requested it (before processing order)
        await saveAddressIfRequested();

        // Load cart items
        const cartItems = await loadCartItemsFromStorage();
        if (cartItems.length === 0) {
            showErrorModal('Your cart is empty. Please add products before placing an order.');
            return;
        }

        // Get form data for the order
        const formData = new FormData(checkoutForm);

        // Get payment method selected
        const paymentMethod = formData.get('paymentMethod') || 'Cash on Delivery';

        // Log cart items to see what we're working with
        console.log("Cart items being saved to order:", cartItems);

        // Build the full address from the new address fields
        const houseNumber = formData.get('houseNumber') || '';
        const roadName = formData.get('roadName') || '';
        const city = formData.get('city') || '';
        const state = formData.get('state') || '';
        const pinCode = formData.get('pinCode') || '';
        const fullAddress = `${houseNumber}, ${roadName}, ${city}, ${state} - ${pinCode}`;

        // Prepare order data with customer info and products
        const orderData = {
            customer: {
                firstName: formData.get('firstName') || '',
                lastName: formData.get('lastName') || '',
                email: formData.get('email') || '',
                phone: formData.get('phone') || '',
                address: fullAddress,
                city: city,
                state: state,
                postalCode: pinCode,
                houseNumber: houseNumber,
                roadName: roadName
            },
            paymentMethod: paymentMethod,
            products: cartItems.map(item => {
                // Make sure image property exists and is properly structured
                console.log(`Product ${item.name} - image:`, item.image);
                
                const itemTotal = item.price * item.quantity;
                // Pre-convert prices for email display
                let itemPriceDisplay = item.price;
                let itemTotalDisplay = itemTotal;
                if (typeof window.CurrencyConverter !== 'undefined' && window.CurrencyConverter.convertPrice) {
                    itemPriceDisplay = window.CurrencyConverter.convertPrice(item.price);
                    itemTotalDisplay = window.CurrencyConverter.convertPrice(itemTotal);
                }

                return {
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    total: itemTotal,
                    // Include converted prices for email display
                    priceDisplay: itemPriceDisplay,
                    totalDisplay: itemTotalDisplay,
                    // Only include image if it exists
                    image: item.image || ''
                };
            }),
            orderTotal: calculateTotal(cartItems),
            orderReference: generateOrderReference(),
            orderDate: new Date().toISOString(),
            notes: formData.get('notes') || '',
            // Include user's selected currency for email formatting
            userSelectedCurrency: window.CurrencyConverter ? window.CurrencyConverter.getCurrentCurrency() : 'INR',
            // Pre-convert total for email display
            orderTotalDisplay: (function() {
                let total = calculateTotal(cartItems);
                if (typeof window.CurrencyConverter !== 'undefined' && window.CurrencyConverter.convertPrice) {
                    return window.CurrencyConverter.convertPrice(total);
                }
                return total;
            })()
        };

        // Disable submit button and show loading state
        const submitButton = checkoutForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';

        try {
            // Process payment based on the selected payment method
            if (paymentMethod === 'Razorpay') {
                console.log('Razorpay payment method selected, opening payment gateway...');

                try {
                    // Process payment with Razorpay (this will open the popup)
                    await processRazorpayPayment(orderData);

                    // If we get here, it means the popup didn't open or there was another issue
                    // The actual success handling is in the handleRazorpaySuccess function
                    return;
                } catch (razorpayError) {
                    console.error('Error processing Razorpay payment:', razorpayError);
                    throw new Error('Payment processing failed: ' + razorpayError.message);
                }
            }

            // Only continue with the rest of the flow for non-Razorpay payment methods
            // or if Razorpay processing fails

            // Save order to api if the module is loaded and user is logged in
            if (window.apiOrdersModule && typeof window.apiOrdersModule.saveOrderToapi === 'function') {
                console.log('Saving order to api...');
                try {
                    // Initialize deliveryStatus for the order
                    orderData.deliveryStatus = 'pending'; // Default status for new orders

                    const apiResult = await window.apiOrdersModule.saveOrderToapi(orderData);

                    if (apiResult.success) {
                        console.log('Order saved to api successfully:', apiResult.orderId);
                        orderData.apiOrderId = apiResult.orderId;

                        // Update stock for all products in the order
                        if (window.StockManager && window.StockManager.updateStockAfterOrder) {
                            try {
                                console.log('Updating stock after COD order placement...');
                                const stockResult = await window.StockManager.updateStockAfterOrder(orderData.products);
                                if (stockResult.success) {
                                    console.log('Stock updated successfully after COD order:', stockResult.updates);

                                    // Notifications for out of stock products can be added here if needed
                                } else {
                                    console.error('Stock update failed for COD order:', stockResult.error);
                                }
                            } catch (stockError) {
                                console.error('Error updating stock for COD order:', stockError);
                                // Don't fail the order if stock update fails
                            }
                        } else {
                            console.warn('StockManager not available, skipping stock update for COD order');
                        }

                        // Create admin notification for new pending order
                        try {
                            await createNewOrderNotification(orderData, apiResult.orderId);
                        } catch (notificationError) {
                            console.warn('Failed to create admin notification:', notificationError);
                            // Don't fail the order if notification creation fails
                        }

                        // Create shipment automatically after order is saved
                        await createShipmentAfterOrder(orderData);
                    } else if (apiResult.requiresAuth) {
                        console.log('Authentication required for api order save');
                        // Continue without api save for guest users
                    } else {
                        console.error('Failed to save order to api:', apiResult.error);
                        // Continue with order processing if api save fails
                    }
                } catch (error) {
                    console.error('Error saving order to api:', error);
                    // Continue with order processing if api save fails
                }
            } else {
                console.log('api Orders module not available or saveOrderToapi function missing');
            }

            // Send order confirmation email for COD orders
            try {
                console.log('Sending order confirmation email for COD order...');
                let emailResult = { success: false };

                if (window.netlifyHelpers) {
                    console.log('Using Netlify Functions for COD order email');
                    emailResult = await window.netlifyHelpers.callNetlifyFunction('send-order-email', {
                        method: 'POST',
                        body: JSON.stringify(orderData)
                    });
                } else {
                    console.log('Using Express server for COD order email');
                    const emailResponse = await fetch('/api/send-order-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(orderData)
                    });
                    emailResult = await emailResponse.json();
                }

                if (emailResult.success) {
                    console.log('✅ COD order confirmation emails sent successfully');
                } else {
                    console.warn('⚠️ Failed to send COD order confirmation emails:', emailResult?.message || 'Email service unavailable');
                }
            } catch (emailError) {
                console.error('❌ Error sending COD order emails:', emailError);
                // Continue with order processing even if email sending fails
            }

            // Update button text to show completion for COD orders
            if (orderData.paymentMethod === 'Cash on Delivery') {
                submitButton.innerHTML = '<i class="fas fa-check-circle"></i> Order Complete';
                submitButton.classList.add('btn-success');
                submitButton.classList.remove('btn-primary');
                submitButton.disabled = true;

                console.log('COD order button updated to show completion');

                // Clear cart first, then show modal after delay
                try {
                    console.log('About to clear cart after successful COD order');
                    clearCart();

                    // Forcibly reset the cart display immediately
                    if (orderSummaryContainer) {
                        orderSummaryContainer.innerHTML = '<p>No products added yet.</p>';
                    }
                    if (orderTotalElement) {
                        orderTotalElement.textContent = currencySymbol + '0.00';
                    }
                    if (productListContainer) {
                        productListContainer.innerHTML = '';
                    }

                    // Reset global cart items
                    window.checkoutCartItems = [];

                    console.log('Cart cleared after successful COD order submission');
                } catch (clearError) {
                    console.error('Error clearing cart:', clearError);
                }

                // Keep the completion state for a few seconds before showing modal
                setTimeout(() => {
                    showOrderConfirmation(orderData);
                }, 1500);

                // Reset form
                checkoutForm.reset();

                // DON'T reset button state here for COD - let modal handle it
                return; // Exit early to prevent button reset below
            } else {
                // For online payments, show modal immediately
                showOrderConfirmation(orderData);

                // Clear cart for online payments
                try {
                    console.log('About to clear cart after successful online order');
                    clearCart();

                    // Forcibly reset the cart display immediately
                    if (orderSummaryContainer) {
                        orderSummaryContainer.innerHTML = '<p>No products added yet.</p>';
                    }
                    if (orderTotalElement) {
                        orderTotalElement.textContent = currencySymbol + '0.00';
                    }
                    if (productListContainer) {
                        productListContainer.innerHTML = '';
                    }

                    // Reset global cart items
                    window.checkoutCartItems = [];

                    console.log('Cart cleared after successful online order submission');
                } catch (clearError) {
                    console.error('Error clearing cart:', clearError);
                }

                // Reset form
                checkoutForm.reset();
            }

        } catch (error) {
            console.error('Error processing order:', error);
            showErrorModal('There was an error processing your order. Please try again later.');

            // Reset button state on error
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
            submitButton.classList.remove('btn-success');
            submitButton.classList.add('btn-primary');
        }
    }

    // Clear cart from both localStorage and api
    function clearCart() {
        try {
            console.log('Clearing cart after successful order');

            // Clear the order summary display on the page
            if (orderSummaryContainer) {
                orderSummaryContainer.innerHTML = '<p>No products added yet.</p>';
                console.log('Order summary cleared from UI');
            }

            // Update the order total
            if (orderTotalElement) {
                orderTotalElement.textContent = currencySymbol + '0.00';
                console.log('Order total reset to zero');
            }

            // Clear hidden product list
            if (productListContainer) {
                productListContainer.innerHTML = '';
                console.log('Hidden product list cleared');
            }

            // Reset global cart items
            window.checkoutCartItems = [];

            // Update cart UI if cart-manager.js is available
            if (typeof CartManager !== 'undefined' && typeof CartManager.updateCartUI === 'function') {
                setTimeout(() => {
                    CartManager.updateCartUI();
                    console.log('Cart UI updated after clearing');
                }, 500);
            }

            // First try to use cart-manager.js if available (handles both local and api)
            if (typeof CartManager !== 'undefined' && typeof CartManager.clearCart === 'function') {
                // Use CartManager to clear cart in all storage
                CartManager.clearCart().then(() => {
                    console.log('Cart cleared using CartManager.clearCart()');
                }).catch(err => {
                    console.error('Error clearing cart with CartManager:', err);
                });

                // We still continue with the other methods as backup
            }

            // Try LocalStorageCart module next
            if (typeof LocalStorageCart !== 'undefined' && LocalStorageCart.clearItems) {
                // Use LocalStorageCart module
                LocalStorageCart.clearItems();
                console.log('Cart cleared using LocalStorageCart module');
            } else {
                // Fallback to direct localStorage
                localStorage.removeItem(STORAGE_KEY);
                console.log('Cart cleared using direct localStorage access');
            }

            // Clear api cart if user is logged in
            if (typeof AuthService !== 'undefined' && AuthService.isLoggedIn()) {
                console.log('Clearing api cart...');

                if (typeof apiCartManager !== 'undefined' && typeof apiCartManager.clearItems === 'function') {
                    // Use direct apiCartManager if available
                    apiCartManager.clearItems()
                        .then(() => {
                            console.log('Cart cleared from api using apiCartManager.clearItems()');
                        })
                        .catch(err => {
                            console.error('Error clearing api cart:', err);
                        });
                } else if (apiCartModule && apiCartModule.clearapiCart) {
                    // Use module wrapper
                    apiCartModule.clearapiCart()
                        .then(result => {
                            if (result && result.success) {
                                console.log('Cart cleared from api after order submission');
                            } else {
                                console.warn('Failed to clear api cart:', result ? result.error : 'unknown error');
                            }
                        })
                        .catch(err => {
                            console.error('Error clearing api cart:', err);
                        });
                }
            }


        } catch (error) {
            console.error('Error clearing cart:', error);

            // Always try the most basic fallback method on error
            try {
                localStorage.removeItem(STORAGE_KEY);

                // Also clear the UI as a last resort
                if (orderSummaryContainer) {
                    orderSummaryContainer.innerHTML = '<p>No products added yet.</p>';
                }
                if (orderTotalElement) {
                    orderTotalElement.textContent = currencySymbol + '0.00';
                }
            } catch (fallbackError) {
                console.error('Critical error: Failed to clear cart with fallback method', fallbackError);
            }
        }
    }

    // Show create account modal
    function showCreateAccountModal() {
        // Create the modal HTML if it doesn't exist
        if (!document.getElementById('createAccountModal')) {
            const modalHTML = `
                <div class="modal fade" id="createAccountModal" tabindex="-1" aria-labelledby="createAccountModalLabel" aria-hidden="true">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="createAccountModalLabel">Create Account Required</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <div class="alert alert-info" role="alert">
                                    <i class="fas fa-info-circle me-2"></i>
                                    You need to create an account to complete your purchase.
                                </div>
                                <p>Please create an account or sign in to complete your order. Creating an account allows you to:</p>
                                <ul>
                                    <li>Track your order status</li>
                                    <li>Save your delivery information for future purchases</li>
                                    <li>View your order history</li>
                                    <li>Receive exclusive offers and discounts</li>
                                </ul>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                <a href="/login" class="btn btn-outline-primary">Sign In</a>
                                <a href="/signup" class="btn btn-primary">Create Account</a>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }

        // Show the modal
        const createAccountModal = new bootstrap.Modal(document.getElementById('createAccountModal'));
        createAccountModal.show();
    }

    // Load cart items from storage (utility function)
    // Checks api first if user is logged in, then falls back to localStorage
    async function loadCartItemsFromStorage() {
        try {
            // Try to get cart from api if user is logged in
            if (apiCartModule && typeof AuthService !== 'undefined' && AuthService.isLoggedIn()) {
                try {
                    const result = await apiCartModule.loadCartFromapi();
                    if (result.success && result.items.length > 0) {
                        console.log('Cart loaded from api for order processing');
                        return result.items;
                    }
                } catch (apiError) {
                    console.error('Error loading cart from api:', apiError);
                    // Fall back to local storage
                }
            }

            // Try to use LocalStorageCart if available
            if (typeof LocalStorageCart !== 'undefined' && LocalStorageCart.getItems) {
                try {
                    const cartItems = LocalStorageCart.getItems();
                    console.log('Cart loaded from LocalStorageCart for order processing');
                    return cartItems;
                } catch (localStorageCartError) {
                    console.error('Error loading cart from LocalStorageCart:', localStorageCartError);
                    // Fall back to direct localStorage access
                }
            }

            // Fall back to direct localStorage access
            const savedCart = localStorage.getItem(STORAGE_KEY);
            console.log('Cart loaded from direct localStorage access for order processing');
            return savedCart ? JSON.parse(savedCart) : [];
        } catch (error) {
            console.error('Error loading cart from storage:', error);
            return [];
        }
    }

    // Calculate total price of cart items
    function calculateTotal(items) {
        return items.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    // Generate a random order reference
    function generateOrderReference() {
        const prefix = 'ROYALMEENAKARI';
        const timestamp = new Date().getTime().toString().slice(-6);
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `${prefix}-${timestamp}-${random}`;
    }

    // Show notification function (same as profile page)
    function showNotification(message, type = 'info') {
        // Remove existing notification
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create new notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        // Add notification styles if not already present
        if (!document.getElementById('notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 80px;
                    right: 20px;
                    left: 20px;
                    max-width: 400px;
                    margin: 0 auto;
                    background-color: #333;
                    color: white;
                    padding: 15px 25px;
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                    z-index: 10001;
                    opacity: 0;
                    transform: translateY(-20px);
                    transition: opacity 0.3s, transform 0.3s;
                    font-size: 14px;
                    line-height: 1.4;
                    text-align: center;
                }
                @media (min-width: 768px) {
                    .notification {
                        left: auto;
                        max-width: none;
                        margin: 0;
                        text-align: left;
                    }
                }
                .notification.show {
                    opacity: 1;
                    transform: translateY(0);
                }
                .notification.success {
                    background-color: #4CAF50;
                }
                .notification.error {
                    background-color: #F44336;
                }
            `;
            document.head.appendChild(styles);
        }

        // Add to page
        document.body.appendChild(notification);

        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Hide notification after delay
        const hideDelay = type === 'error' ? 6000 : 4000;
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, hideDelay);
    }

    // Show error modal (legacy function, now uses notifications)
    function showErrorModal(message) {
        showNotification(message, 'error');
    }

    // Show order confirmation modal
    function showOrderConfirmation(orderData) {
        // Get current currency symbol
        let currencySymbol = '₹';
        if (typeof window.CurrencyConverter !== 'undefined' && window.CurrencyConverter.getCurrencySymbol) {
            currencySymbol = window.CurrencyConverter.getCurrencySymbol();
        }
        // Create confirmation modal if it doesn't exist
        if (!document.getElementById('confirmationModal')) {
            const modalHTML = `
                <div class="modal fade" id="confirmationModal" tabindex="-1" aria-labelledby="confirmationModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header bg-success text-white">
                                <h5 class="modal-title" id="confirmationModalLabel">Order Confirmed</h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <div class="alert alert-success" role="alert">
                                    <i class="fas fa-check-circle me-2"></i>
                                    Your order has been placed successfully!
                                </div>
                                <p><strong>Order Reference:</strong> <span id="orderReference"></span></p>
                                <div id="orderDetails"></div>
                                <div id="paymentDetails" class="mt-3">
                                    <p><strong>Payment Method:</strong> <span id="paymentMethod"></span></p>
                                    <div id="paymentIdSection" style="display: none;">
                                        <p><strong>Payment ID:</strong> <span id="paymentId"></span></p>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <a href="/" class="btn btn-primary" style="background-color: #603000; border-color: #603000;">Continue Shopping</a>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }

        const orderReferenceElement = document.getElementById('orderReference');
        const orderDetailsElement = document.getElementById('orderDetails');
        const paymentMethodElement = document.getElementById('paymentMethod');
        const paymentIdSectionElement = document.getElementById('paymentIdSection');
        const paymentIdElement = document.getElementById('paymentId');


        if (orderReferenceElement) {
            orderReferenceElement.textContent = orderData.orderReference;
        }

        if (orderDetailsElement) {
            let detailsHTML = `
                <div class="mt-4">
                    <h5>Order Summary</h5>
                    <div class="card">
                        <div class="card-body">
            `;

            orderData.products.forEach(item => {
                const itemTotal = item.price * item.quantity;
                // Convert prices for display in confirmation modal
                let itemTotalDisplay = itemTotal;
                if (typeof window.CurrencyConverter !== 'undefined' && window.CurrencyConverter.convertPrice) {
                    itemTotalDisplay = window.CurrencyConverter.convertPrice(itemTotal);
                }
                detailsHTML += `
                    <div class="d-flex justify-content-between mb-2">
                        <span>${item.name} × ${item.quantity}</span>
                        <span>${currencySymbol}${itemTotalDisplay.toFixed(2)}</span>
                    </div>
                `;
            });

            // Convert total for display
            let totalDisplay = orderData.orderTotal;
            if (typeof window.CurrencyConverter !== 'undefined' && window.CurrencyConverter.convertPrice) {
                totalDisplay = window.CurrencyConverter.convertPrice(orderData.orderTotal);
            }

            detailsHTML += `
                            <hr>
                            <div class="d-flex justify-content-between">
                                <strong>Total</strong>
                                <strong>${currencySymbol}${totalDisplay.toFixed(2)}</strong>
                            </div>
                        </div>
                    </div>

                    <h5 class="mt-4">Customer Information</h5>
                    <div class="card">
                        <div class="card-body">
                            <p><strong>Name:</strong> ${orderData.customer.firstName} ${orderData.customer.lastName}</p>
                            <p><strong>Email:</strong> ${orderData.customer.email}</p>
                            <p><strong>Phone:</strong> ${orderData.customer.phone}</p>
                            <p><strong>Address:</strong> ${orderData.customer.address}</p>
                        </div>
                    </div>
                </div>
            `;

            orderDetailsElement.innerHTML = detailsHTML;
        }

        // Update payment details
        if (paymentMethodElement) {
            paymentMethodElement.textContent = orderData.paymentMethod;
        }

        if (orderData.paymentMethod === 'razorpay' && orderData.paymentId) {
            if (paymentIdElement) {
                paymentIdElement.textContent = orderData.paymentId;
            }
            if (paymentIdSectionElement) {
                paymentIdSectionElement.style.display = 'block';
            }
        } else {
            if (paymentIdSectionElement) {
                paymentIdSectionElement.style.display = 'none';
            }
        }


        // Create a reference to the modal element
        const confirmationModalElement = document.getElementById('confirmationModal');
        const confirmationModal = new bootstrap.Modal(confirmationModalElement);

        // Handle both "Continue Shopping" link and "Return to Homepage" button
        const continueShoppingBtn = confirmationModalElement.querySelector('.modal-footer a[href="/"]');
        const returnHomepageBtn = confirmationModalElement.querySelector('#closeConfirmationBtn');

        // Function to redirect to homepage
        function redirectToHomepage() {
            console.log('Redirecting to homepage...');
            window.location.href = '/';
        }

        // Handle Continue Shopping link (if exists)
        if (continueShoppingBtn) {
            continueShoppingBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Continue Shopping button clicked');
                redirectToHomepage();
            });
        }

        // Handle Return to Homepage button
        if (returnHomepageBtn) {
            returnHomepageBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Return to Homepage button clicked');
                redirectToHomepage();
            });
        }

        // Handle modal close button (X button)
        const modalCloseBtn = confirmationModalElement.querySelector('.btn-close');
        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', function() {
                console.log('Modal close button clicked - redirecting to homepage');
                setTimeout(() => {
                    redirectToHomepage();
                }, 300);
            });
        }

        // Add an event listener for when the modal is fully shown
        confirmationModalElement.addEventListener('shown.bs.modal', function() {
            console.log('Order confirmation modal shown, ensuring cart is cleared');

            // Keep button in completion state - don't reset
        }, { once: true }); // Only run this event handler once


        // Reset button state when modal is hidden and redirect to homepage
        confirmationModalElement.addEventListener('hidden.bs.modal', function() {
            console.log('Order confirmation modal closed - redirecting to homepage');
            // Redirect to homepage when modal is closed by any means
            setTimeout(() => {
                window.location.href = '/';
            }, 100);
        });

        // Show the modal
        confirmationModal.show();
    }

    // Function to go to a specific checkout step
    function goToStep(stepNumber) {
        console.log('Going to step', stepNumber);

        // Hide all steps
        step1.classList.remove('active');
        step2.classList.remove('active');
        step3.classList.remove('active');

        // Reset step icons
        stepIcon1.classList.remove('active', 'completed');
        stepIcon2.classList.remove('active', 'completed');
        stepIcon3.classList.remove('active', 'completed');

        // Show the current step
        if (stepNumber === 1) {
            step1.classList.add('active');
            stepIcon1.classList.add('active');
            progressBar.style.width = '33%';
        } else if (stepNumber === 2) {
            step2.classList.add('active');
            stepIcon1.classList.add('completed');
            stepIcon2.classList.add('active');
            progressBar.style.width = '66%';

            // Copy order summary to step 2
            if (orderSummaryContainer && orderSummaryStep2) {
                orderSummaryStep2.innerHTML = orderSummaryContainer.innerHTML;
                // Set up quantity controls for step 2
                setupQuantityControlsForContainer(orderSummaryStep2, window.checkoutCartItems);
            }
            if (orderTotalElement && orderTotalStep2) {
                orderTotalStep2.textContent = orderTotalElement.textContent;
            }
        } else if (stepNumber === 3) {
            step3.classList.add('active');
            stepIcon1.classList.add('completed');
            stepIcon2.classList.add('completed');
            stepIcon3.classList.add('active');
            progressBar.style.width = '100%';

            // Copy order summary to step 3
            if (orderSummaryContainer && orderSummaryStep3) {
                orderSummaryStep3.innerHTML = orderSummaryContainer.innerHTML;
                // Set up quantity controls for step 3
                setupQuantityControlsForContainer(orderSummaryStep3, window.checkoutCartItems);
            }
            if (orderTotalElement && orderTotalStep3) {
                orderTotalStep3.textContent = orderTotalElement.textContent;
            }

            // Update address confirmation in payment step
            updateAddressConfirmation();
        }
    }

    // Update the address confirmation display in the payment step
    function updateAddressConfirmation() {
        if (addressConfirmation) {
            const firstName = document.getElementById('firstName').value || '';
            const lastName = document.getElementById('lastName').value || '';
            const phone = document.getElementById('phone').value || '';
            const pinCode = document.getElementById('pinCode').value || '';
            const state = document.getElementById('state').value || '';
            const city = document.getElementById('city').value || '';
            const houseNumber = document.getElementById('houseNumber').value || '';
            const roadName = document.getElementById('roadName').value || '';

            if (firstName && lastName && phone && pinCode && state && city && houseNumber && roadName) {
                addressConfirmation.innerHTML = `
                    <p><strong>${firstName} ${lastName}</strong></p>
                    <p>${houseNumber}, ${roadName}</p>
                    <p>${city}, ${state} - ${pinCode}</p>
                    <p>Phone: ${phone}</p>
                `;
            } else {
                addressConfirmation.innerHTML = '<p>Please complete all address fields.</p>';
            }
        }
    }

    // Set up checkout step navigation
    function setupCheckoutStepNavigation() {
        // Step 1 to Step 2
        if (continueToAddressBtn) {
            continueToAddressBtn.addEventListener('click', function() {
                // Validate that cart has items
                if (window.checkoutCartItems && window.checkoutCartItems.length > 0) {
                    goToStep(2);
                } else {
                    showErrorModal('Your cart is empty. Please add products before continuing.');
                }
            });
        }

        // Step 2 to Step 1
        if (backToSummaryBtn) {
            backToSummaryBtn.addEventListener('click', function() {
                goToStep(1);
            });
        }

        // Step 2 to Step 3
        if (continueToPaymentBtn) {
            continueToPaymentBtn.addEventListener('click', async function() {
                // Show loading state on button
                const originalText = this.innerHTML;
                this.disabled = true;
                this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Validating...';

                try {
                    // Validate all form fields before proceeding
                    const isValid = await validateAllCheckoutFields();
                    if (!isValid) {
                        console.log('Form validation failed');
                        return;
                    }
                } finally {
                    // Reset button state
                    this.disabled = false;
                    this.innerHTML = originalText;
                }

                // Validate PIN code using direct API call
                const pinCode = document.getElementById('pinCode').value;
                if (pinCode && /^\d{6}$/.test(pinCode)) {
                    try {
                        console.log(`Final validation: Checking PIN code ${pinCode}...`);
                        const response = await fetch(`https://api.postalpincode.in/pincode/${pinCode}`);
                        const data = await response.json();

                        if (data && data[0] && data[0].Status === 'Success') {
                            const postOffice = data[0].PostOffice[0];
                            const state = document.getElementById('state').value;

                            if (state) {
                                const normalizeState = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();
                                const apiState = normalizeState(postOffice.State);
                                const userState = normalizeState(state);

                                if (apiState !== userState) {
                                    showErrorModal(`PIN code ${pinCode} belongs to ${postOffice.State}, but you selected ${state}. Please verify your PIN code and state.`);
                                    return;
                                }
                            }
                            console.log(`✅ Final validation passed: PIN code ${pinCode} belongs to ${postOffice.District}, ${postOffice.State}`);
                        } else {
                            showErrorModal(`PIN code ${pinCode} is not valid. Please check and enter a correct PIN code.`);
                            return;
                        }
                    } catch (error) {
                        console.warn('PIN code validation failed during final check:', error);
                        // Continue - don't block if API is down
                    }
                }

                // Use apiAddressManager validation if available for other fields
                if (window.apiAddressManager && window.apiAddressManager.validateAddressData) {
                    const addressData = {
                        firstName: document.getElementById('firstName').value,
                        lastName: document.getElementById('lastName').value,
                        email: document.getElementById('email').value,
                        phone: document.getElementById('phone').value,
                        pinCode: document.getElementById('pinCode').value,
                        state: document.getElementById('state').value,
                        city: document.getElementById('city').value,
                        houseNumber: document.getElementById('houseNumber').value,
                        roadName: document.getElementById('roadName').value
                    };

                    const validation = window.apiAddressManager.validateAddressData(addressData);
                    if (!validation.isValid) {
                        showErrorModal('Please fix the following issues: ' + validation.errors.join('. '));
                        return;
                    }
                } else {
                    // Fallback validation
                    const firstName = document.getElementById('firstName').value;
                    const lastName = document.getElementById('lastName').value;
                    const email = document.getElementById('email').value;
                    const phone = document.getElementById('phone').value;
                    const pinCode = document.getElementById('pinCode').value;
                    const state = document.getElementById('state').value;
                    const city = document.getElementById('city').value;
                    const houseNumber = document.getElementById('houseNumber').value;
                    const roadName = document.getElementById('roadName').value;

                    if (!firstName || !lastName || !email || !phone || !pinCode || !state || !city || !houseNumber || !roadName) {
                        showErrorModal('Please fill in all required address fields.');
                        return;
                    }

                    // Enhanced email validation
                    const strictEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                    if (!strictEmailRegex.test(email)) {
                        showErrorModal('Please enter a valid email address with proper domain extension.');
                        return;
                    }

                    // Check if incomplete domains
                    const domain = email.toLowerCase().split('@')[1];
                    if (domain && (domain.includes('.co') && !domain.includes('.com') && !domain.includes('.co.in') && !domain.includes('.co.uk'))) {
                        if (domain.endsWith('.co')) {
                            showErrorModal('Email domain appears incomplete. Did you mean .com or .co.in?');
                            return;
                        }
                    }

                    // Check for common Gmail typos
                    if (domain && (domain.includes('gmail.co') && !domain.includes('gmail.com'))) {
                        showErrorModal('Invalid Gmail domain. Did you mean @gmail.com?');
                        return;
                    }

                    // Phone validation
                    const phoneRegex = /^\d{10}$/;
                    if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
                        showErrorModal('Please enter a valid 10-digit phone number.');
                        return;
                    }

                    // PIN code validation
                    const pinCodeRegex = /^\d{6}$/;
                    if (!pinCodeRegex.test(pinCode)) {
                        showErrorModal('Please enter a valid 6-digit PIN code.');
                        return;
                    }

                    // Basic length validations
                    if (firstName.trim().length < 2) {
                        showErrorModal('First name must be at least 2 characters long.');
                        return;
                    }

                    if (lastName.trim().length < 2) {
                        showErrorModal('Last name must be at least 2 characters long.');
                        return;
                    }

                    if (city.trim().length < 2) {
                        showErrorModal('City name must be at least 2 characters long.');
                        return;
                    }

                    if (state.trim().length < 2) {
                        showErrorModal('State name must be at least 2 characters long.');
                        return;
                    }

                    if (roadName.trim().length < 5) {
                        showErrorModal('Road name/Area must be at least 5 characters long.');
                        return;
                    }
                }

                // If all validations pass, proceed to step 3
                goToStep(3);
            });
        }

        // Step 3 to Step 2
        if (backToAddressBtn) {
            backToAddressBtn.addEventListener('click', function() {
                goToStep(2);
            });
        }
    }

    // Initialize the page
    async function init() {
        console.log('Initializing checkout page...');

        try {
            // Set up auth state listener to handle login changes
            if (typeof api !== 'undefined' && api.auth) {
                api.auth().onAuthStateChanged(function(user) {
                    console.log('Auth state changed on checkout page:', user ? 'Logged in' : 'Not logged in');

                    // Update checkout button state based on login status
                    updateCheckoutButtonState();

                    // Show save address option if user is logged in and manual form is visible
                    if (user) {
                        const manualForm = document.getElementById('manual-address-form');
                        const saveAddressOption = document.getElementById('save-address-option');
                        if (manualForm && saveAddressOption && manualForm.style.display !== 'none' && !manualForm.classList.contains('hidden')) {
                            saveAddressOption.style.display = 'block';
                            console.log('Save address option shown for newly logged-in user');
                        }
                    } else {
                        // Hide save address option if user logs out
                        const saveAddressOption = document.getElementById('save-address-option');
                        if (saveAddressOption) {
                            saveAddressOption.style.display = 'none';
                        }
                    }

                    // Reload cart items when auth state changes
                    showLoadingState(); // Show loading while reloading

                    // Add delay to ensure loading state is visible
                    setTimeout(async () => {
                        const items = await loadCartItems();
                        console.log('Reloaded cart after auth change, items:', items?.length || 0);
                        // loadCartItems already handles displaying items or empty message
                    }, 100);
                });
            }

            // Initial load of cart items
            const cartItems = await loadCartItems();

            // Store cart items in a global variable for quantity controls
            window.checkoutCartItems = cartItems;

            // Set up event listeners - only if not already set up
            if (checkoutForm && !checkoutForm._hasSubmitHandler) {
                checkoutForm.addEventListener('submit', handleSubmit);
                checkoutForm._hasSubmitHandler = true;
                console.log('Added submit handler to checkout form');
            }

            // Initialize checkout step navigation
            setupCheckoutStepNavigation();

            // Set up address management
            setupAddressManagement();

            // Load saved addresses for both logged-in and guest users
            await loadSavedAddresses();

            // Show save address option for all users (including guests)
            const saveAddressOption = document.getElementById('save-address-option');
            if (saveAddressOption) {
                saveAddressOption.style.display = 'block';
                console.log('Save address option shown for all users');
            }

            // Show guest notice for non-authenticated users
            const isLoggedIn = typeof AuthService !== 'undefined' && AuthService.isLoggedIn();
            const guestNotice = document.getElementById('guest-address-notice');
            if (!isLoggedIn && guestNotice) {
                guestNotice.style.display = 'block';
                console.log('Guest address notice shown');
            }

            // Add refresh button event listener
            const refreshBtn = document.getElementById('refreshOrderSummary');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', async function() {
                    console.log('🔄 User clicked refresh - reloading cart');
                    showLoadingState();
                    await loadCartItems();
                });
            }

            // Start at step 1
            goToStep(1);

            console.log('Checkout page initialized with cart items:', cartItems?.length || 0);
        } catch (error) {
            console.error('Error initializing checkout page:', error);
            showEmptyCartMessage();
        }
    }

    // Validate all checkout fields
    async function validateAllCheckoutFields() {
        const fields = [
            { id: 'firstName', validator: window.validateFirstName },
            { id: 'lastName', validator: window.validateLastName },
            { id: 'email', validator: window.validateEmail },
            { id: 'phone', validator: window.validatePhone },
            { id: 'pinCode', validator: window.validatePinCode, async: true },
            { id: 'houseNumber', validator: window.validateHouseNumber },
            { id: 'roadName', validator: window.validateRoadName },
            { id: 'city', validator: window.validateCity },
            { id: 'state', validator: window.validateState }
        ];

        let allValid = true;
        for (const field of fields) {
            const input = document.getElementById(field.id);
            if (input && field.validator) {
                let isValid;
                if (field.async) {
                    isValid = await field.validator(input);
                } else {
                    isValid = field.validator(input);
                }
                if (!isValid) {
                    allValid = false;
                }
            }
        }

        return allValid;
    }

    // Update validation to show popup errors instead of inline errors
    function showFieldError(input, message) {
        // Show popup notification
        showNotification(message, 'error');

        // Also add visual feedback to input
        input.classList.add('error');
        input.classList.remove('valid');
    }

    function clearFieldError(input) {
        input.classList.remove('error');
        input.classList.add('valid');
    }


    // Initialize the page asynchronously
    init().catch(error => {
        console.error('Failed to initialize checkout page:', error);
        showEmptyCartMessage();
    });

    // Shiprocket Integration - Create shipment after order
    async function createShipmentAfterOrder(orderData) {
        try {
            console.log('Creating shipment for order:', orderData.orderReference);

            // Skip shipment creation for test/demo orders or if no valid data
            if (!orderData || !orderData.customer || !orderData.products) {
                console.log('Skipping shipment creation - incomplete order data');
                return;
            }

            // Create Shiprocket shipment - TEMPORARILY COMMENTED OUT
            /*
            console.log('Creating Shiprocket shipment...');
            const shipmentData = {
                order_id: `AURIC-${orderData.orderId}`,
                order_date: new Date().toISOString().split('T')[0],
                customer: {
                    firstName: orderData.customerName.split(' ')[0] || 'Customer',
                    lastName: orderData.customerName.split(' ').slice(1).join(' ') || 'Name',
                    email: orderData.customerEmail,
                    phone: orderData.customerPhone,
                    address: orderData.shippingAddress.address,
                    city: orderData.shippingAddress.city,
                    state: orderData.shippingAddress.state,
                    pinCode: orderData.shippingAddress.pinCode
                },
                items: orderData.products.map(product => ({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    quantity: product.quantity
                })),
                total: orderData.orderTotal,
                payment_method: orderData.paymentMethod === 'Cash on Delivery' ? 'COD' : 'Prepaid'
            };

            console.log('Shipment data prepared:', shipmentData);

            try {
                const response = await fetch('/api/shipping/create-order', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(shipmentData)
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const result = await response.json();
                console.log('Shipment creation result:', result);

                if (result.success && result.data) {
                    console.log('✅ Shipment created successfully:', result.data);

                    // Store comprehensive shipment details in order data
                    orderData.shipmentDetails = {
                        shipment_id: result.data.shipment_id,
                        order_id: result.data.order_id,
                        channel_order_id: result.data.channel_order_id,
                        status: result.data.status,
                        awb_code: result.data.awb_code || 'Pending',
                        courier_name: result.data.courier_name || 'To be assigned',
                        workflow_completed: result.data.workflow_completed || false,
                        tracking_url: result.data.awb_code ? `https://shiprocket.co/tracking/${result.data.awb_code}` : null,
                        created_at: new Date().toISOString(),
                        // Add workflow completion details
                        awb_data: result.data.awb_data,
                        pickup_data: result.data.pickup_data,
                        label_data: result.data.label_data,
                        workflow_error: result.data.workflow_error
                    };

                    // Add shipment info to order confirmation
                    if (result.data.awb_code) {
                        showConfirmation(`Order placed successfully! 🎉\n\nOrder ID: ROYALMEENAKARI-${orderData.orderId}\nShipment created with AWB: ${result.data.awb_code}\nYou can track your order at: track-order.html`);
                    } else {
                        showConfirmation(`Order placed successfully! 🎉\n\nOrder ID: ROYALMEENAKARI-${orderData.orderId}\nShipment created (AWB pending)\nYou can track your order at: track-order.html`);
                    }
                } else {
                    console.warn('Shipment creation failed but order was placed:', result);
                    showConfirmation(`Order placed successfully! 🎉\n\nOrder ID: ROYALMEENAKARI-${orderData.orderId}\nNote: Shipment will be created manually by admin.`);
                }

            } catch (shipmentError) {
                console.error('Failed to create shipment (order still placed):', shipmentError);
                showConfirmation(`Order placed successfully! 🎉\n\nOrder ID: ROYALMEENAKARI-${orderData.orderId}\nNote: Shipment will be created manually by admin.`);
            }
            */

            // Show order confirmation without shipment creation
            showConfirmation(`Order placed successfully! 🎉\n\nOrder ID: ROYALMEENAKARI-${orderData.orderId}`);
        } catch (shipmentError) {
            console.error('❌ Critical shipment error:', shipmentError);

            // Set error shipment details
            orderData.shipmentDetails = {
                status: 'SHIPMENT_FAILED',
                error: shipmentError.message,
                created_at: new Date().toISOString()
            };

            // Shipment creation is currently disabled, so no need to show error message
            console.log('Shipment creation is disabled - order completed successfully without shipment');
        }
    }

    /**
     * Process Razorpay Payment
     * This function creates a Razorpay order and opens the payment modal
     * @param {Object} orderData - The order data to process
     */
    async function processRazorpayPayment(orderData) {
        try {
            console.log('Processing Razorpay payment for order:', orderData.orderReference);

            // Get the submit button element within this function's scope
            const submitButton = checkoutForm?.querySelector('button[type="submit"]');
            if (!submitButton) {
                console.error('Submit button not found');
                showErrorModal('Payment form not found. Please refresh the page and try again.');
                return;
            }

            // Check if Razorpay SDK is loaded
            if (typeof Razorpay === 'undefined') {
                console.error('Razorpay SDK not loaded!');
                showErrorModal('Payment gateway failed to load. Please refresh the page and try again.');

                // Reset button state
                submitButton.disabled = false;
                submitButton.innerHTML = 'Place Order';
                return;
            }

            // Set a timeout for API calls to prevent infinite loading
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Payment gateway timed out. Please try again.')), 15000);
            });

            // Determine if we're using Netlify Functions or the local Express server
            let apiEndpoint;
            let result;

            console.log('Is Netlify environment:', !!window.netlifyHelpers);

            try {
                // IMPORTANT: orderData.orderTotal is ALWAYS in INR
                // Cart items are stored with INR prices (base currency)
                // CurrencyConverter only changes display formatting, NOT stored values
                // DO NOT convert this amount - Razorpay must receive the raw INR total
                const amountInINR = orderData.orderTotal;
                
                // Validation: Ensure we're sending a valid positive amount
                if (!amountInINR || amountInINR <= 0) {
                    throw new Error('Invalid order amount: ' + amountInINR);
                }
                
                console.log('Creating Razorpay order for amount (INR):', amountInINR);

                // Use Netlify Functions if helper is available
                if (window.netlifyHelpers) {
                    console.log('Using Netlify Functions to create order');
                    result = await Promise.race([
                        window.netlifyHelpers.callNetlifyFunction('create-razorpay-order', {
                            method: 'POST',
                            body: JSON.stringify({
                                amount: amountInINR,
                                currency: 'INR',
                                receipt: orderData.orderReference,
                                notes: {
                                    orderReference: orderData.orderReference
                                }
                            })
                        }),
                        timeoutPromise
                    ]);
                } else {
                    // Fallback to direct API call to Express server
                    console.log('Using local server to create order');
                    apiEndpoint = `${window.location.origin}/api/create-razorpay-order`;

                    const response = await Promise.race([
                        fetch(apiEndpoint, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                amount: amountInINR,
                                currency: 'INR',
                                receipt: orderData.orderReference,
                                notes: {
                                    orderReference: orderData.orderReference
                                }
                            })
                        }),
                        timeoutPromise
                    ]);

                    result = await response.json();
                }
            } catch (apiError) {
                if (apiError.name === 'TypeError' && apiError.message.includes('fetch')) {
                    console.error('Network error:', apiError);
                    throw new Error('Failed to connect to payment server: Network error');
                } else if (apiError.message.includes('timed out')) {
                    console.error('Timeout error:', apiError);
                    throw new Error('Failed to connect to payment server: Request timed out');
                } else if (apiError.message && apiError.message.includes('Razorpay credentials are not configured correctly')) {
                    console.error('Razorpay configuration error:', apiError);
                    throw new Error('Failed to connect to payment server: Razorpay credentials are not configured correctly');
                } else if (apiError instanceof Error) {
                    console.error('API error:', apiError);
                    throw new Error('Failed to connect to payment server: ' + apiError.message);
                }
            }

            console.log('Razorpay order creation result:', result);

            // Validate the response thoroughly
            if (!result || !result.success) {
                const errorMsg = result?.message || 'Failed to create payment order';
                console.error('Order creation failed:', errorMsg);
                throw new Error(errorMsg);
            }

            if (!result.order || !result.order.id || !result.key_id) {
                console.error('Invalid order response:', result);
                throw new Error('Invalid order response from payment gateway. Missing required data.');
            }

            // Update button text
            if (submitButton) {
                submitButton.innerHTML = 'Opening Payment Gateway...';
            }

            // Save order to api first with pending status
            if (orderData.paymentMethod !== 'Cash on Delivery') { // Only save pending if not COD
                if (apiOrdersModule) {
                    console.log('Saving order to api with pending payment status...');
                    orderData.paymentStatus = 'pending';
                    orderData.razorpayOrderId = result.order.id;
                    orderData.paymentMethod = 'razorpay';
                    orderData.deliveryStatus = 'pending'; // Initialize delivery status

                    const saveResult = await apiOrdersModule.saveOrderToapi(orderData);

                    if (!saveResult.success) {
                        if (saveResult.requiresAuth) {
                            // Authentication required but user is not logged in
                            console.log('Authentication required for order placement');
                            showCreateAccountModal();

                            // Reset button state
                            const submitButton = checkoutForm.querySelector('button[type="submit"]');
                            submitButton.disabled = false;
                            submitButton.innerHTML = 'Place Order';
                            return;
                        } else {
                            console.warn('Failed to save order to api:', saveResult.error);
                            // Continue with payment processing
                        }
                    } else {
                        // Store the api order ID
                        orderData.orderId = saveResult.orderId;
                        console.log('Order saved to api with ID:', orderData.orderId);
                    }
                } else {
                    console.log('api Orders module not available for Razorpay payment, proceeding without api save');
                }
            } else {
                // If COD, proceed directly to saving the order (handled in handleSubmit)
                // This section is for Razorpay payments.
            }


            // Configure Razorpay options
            const options = {
                key: result.key_id,
                amount: result.order.amount,
                currency: result.order.currency,
                name: 'Royal Meenakari',
                description: 'Purchase Order: ' + orderData.orderReference,
                order_id: result.order.id,
                handler: async function(response) {
                    await handleRazorpaySuccess(response, orderData);
                },
                prefill: {
                    name: orderData.customer.firstName + ' ' + orderData.customer.lastName,
                    email: orderData.customer.email,
                    contact: orderData.customer.phone
                },
                notes: {
                    address: orderData.customer.address
                },
                theme: {
                    color: '#3399cc'
                }
            };

            console.log('Opening Razorpay payment gateway...');

            try {
                // Create Razorpay instance and open payment modal
                const rzp = new Razorpay(options);
                rzp.open();

                // Backup mechanism: Monitor button state and reset if stuck
                const buttonResetInterval = setInterval(() => {
                    // Check if Razorpay popup is still open
                    const razorpayContainer = document.querySelector('.razorpay-container');
                    const isRazorpayOpen = razorpayContainer && razorpayContainer.style.display !== 'none';

                    if (!isRazorpayOpen && submitButton && submitButton.innerHTML === 'Opening Payment Gateway...') {
                        console.log('Backup mechanism: Resetting stuck button after Razorpay exit');
                        submitButton.disabled = false;
                        submitButton.innerHTML = 'Place Order';
                        clearInterval(buttonResetInterval);
                    }
                }, 1000);

                // Clear the interval after 30 seconds to avoid memory leaks
                setTimeout(() => {
                    clearInterval(buttonResetInterval);
                }, 30000);

                // Handle payment failure
                rzp.on('payment.failed', function (response) {
                    console.error('Razorpay payment failed:', response.error);
                    showErrorModal('Payment failed: ' + response.error.description);

                    // Reset button state
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.innerHTML = 'Place Order';
                    }
                });

                // Handle modal closed/cancelled by user
                rzp.on('payment.cancel', function() {
                    console.log('Razorpay payment cancelled by user');

                    // Immediately reset button state
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.innerHTML = 'Place Order';
                    }
                });

                // Handle modal closed without explicit cancel (including "Yes, exit" confirmation)
                rzp.on('modal.close', function() {
                    console.log('Razorpay modal closed (including exit confirmation)');

                    // Immediately reset button state when modal closes
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.innerHTML = 'Place Order';
                        console.log('Button reset immediately on modal close');
                    }
                });


                // If we get here, it means the popup didn't open or there was another issue
                // The actual success handling is in the handleRazorpaySuccess function
                return;
            } catch (razorpayError) {
                console.error('Error opening Razorpay:', razorpayError);

                // Reset button state on Razorpay error
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.innerHTML = 'Place Order';
                }

                throw new Error('Failed to open payment gateway: ' + razorpayError.message);
            }
        } catch (error) {
            console.error('Error processing Razorpay payment:', error);
            showErrorModal('Payment processing error: ' + error.message);

            // Reset button state
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = 'Place Order';
            }
        }
    }

    /**
     * Handle successful Razorpay payment
     * @param {Object} response - The Razorpay success response
     * @param {Object} orderData - The original order data
     */
    async function handleRazorpaySuccess(response, orderData) {
        try {
            console.log('Razorpay payment successful:', response);

            // Get submit button and update state to processing
            const submitButton = checkoutForm?.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing Payment...';
            }

            // Verify payment signature on the server
            let verificationResult;
            // Set a timeout for API calls to prevent infinite loading
            const verifyTimeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Payment verification timed out but your payment may have gone through. Please check your email for confirmation.')), 15000);
            });

            try {
                if (window.netlifyHelpers) {
                    console.log('Verifying payment via Netlify Functions');
                    verificationResult = await Promise.race([
                        window.netlifyHelpers.callNetlifyFunction('verify-razorpay-payment', {
                            method: 'POST',
                            body: JSON.stringify({
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_signature: response.razorpay_signature
                            })
                        }),
                        verifyTimeoutPromise
                    ]);
                } else {
                    console.log('Verifying payment via Express server');
                    const verifyResponse = await Promise.race([
                        fetch(`${window.location.origin}/api/verify-razorpay-payment`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_signature: response.razorpay_signature
                            })
                        }),
                        verifyTimeoutPromise
                    ]);
                    verificationResult = await verifyResponse.json();
                }
            } catch (verifyError) {
                // Continue with order processing even if verification fails
                // This is safer than leaving the user hanging, as Razorpay has confirmed payment
                console.warn('Proceeding with order despite verification error:', verifyError);
                verificationResult = {
                    success: true, // Assume success if payment was confirmed by Razorpay
                    message: 'Payment accepted, but verification unsuccessful. Order will be processed.'
                };
            }

            if (!verificationResult.success) {
                console.error('Payment verification failed:', verificationResult.message);
                // Show error but mention that payment was successful
                showErrorModal(
                    'Payment was successful but there was an error processing your order',
                    `Please contact support with payment ID: ${response.razorpay_payment_id}`
                );
                return; // Stop further processing if verification failed critically
            }

            console.log('Payment verification successful');

            // Update order data with payment information
            const updatedOrderData = {
                ...orderData,
                paymentMethod: 'razorpay',
                paymentStatus: 'paid', // Payment is confirmed by Razorpay
                paymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                signature: response.razorpay_signature,
                paymentCompletedAt: new Date().toISOString(),
                razorpayOrderCreated: true // Flag to indicate Razorpay order was initiated
            };

            // Save to api if user is authenticated and update order status
            let apiSaveResult = { success: false };
            const user = AuthService?.getCurrentUser();

            if (user) {
                console.log('User authenticated, attempting to update/save order in api');
                try {
                    // Check if order already exists in api (e.g., from pending state)
                    if (orderData.orderId) {
                        // Update existing order
                        console.log('Updating existing order in api with payment details...');
                        const updateResult = await window.apiOrdersModule.updateOrderPaymentStatus(orderData.orderId, {
                            paymentStatus: 'paid',
                            paymentId: response.razorpay_payment_id,
                            razorpayOrderId: response.razorpay_order_id,
                            signature: response.razorpay_signature,
                            paymentCompletedAt: updatedOrderData.paymentCompletedAt,
                            deliveryStatus: 'pending' // Ensure delivery status is set
                        });
                        apiSaveResult = updateResult;
                        if (updateResult.success) {
                            console.log('Order payment status updated in api successfully');

                            // Update stock for all products in the order
                            if (window.StockManager && window.StockManager.updateStockAfterOrder) {
                                try {
                                    console.log('Updating stock after Razorpay payment for logged-in user...');
                                    const stockResult = await window.StockManager.updateStockAfterOrder(orderData.products);
                                    if (stockResult.success) {
                                        console.log('Stock updated successfully after Razorpay payment:', stockResult.updates);
                                    } else {
                                        console.error('Stock update failed for Razorpay order:', stockResult.error);
                                    }
                                } catch (stockError) {
                                    console.error('Error updating stock for Razorpay payment:', stockError);
                                }
                            }
                        } else {
                            console.warn('Failed to update order in api:', updateResult.error);
                        }
                    } else {
                        // Save new order with completed payment status
                        console.log('Saving completed order to api...');
                        updatedOrderData.deliveryStatus = 'pending'; // Set initial delivery status
                        apiSaveResult = await window.apiOrdersModule.saveOrderToapi(updatedOrderData);
                        if (apiSaveResult.success) {
                            console.log('Order saved to api with ID:', apiSaveResult.orderId);
                            updatedOrderData.apiOrderId = apiSaveResult.orderId; // Update local data

                            // Update stock for all products in the order
                            if (window.StockManager && window.StockManager.updateStockAfterOrder) {
                                try {
                                    console.log('Updating stock after Razorpay payment for new order...');
                                    const stockResult = await window.StockManager.updateStockAfterOrder(updatedOrderData.products);
                                    if (stockResult.success) {
                                        console.log('Stock updated successfully after Razorpay payment:', stockResult.updates);
                                    } else {
                                        console.error('Stock update failed for Razorpay order:', stockResult.error);
                                    }
                                } catch (stockError) {
                                    console.error('Error updating stock for Razorpay payment:', stockError);
                                }
                            }

                            // Create shipment automatically after Razorpay payment
                            await createShipmentAfterOrder(updatedOrderData);
                        } else {
                            console.warn('Failed to save order to api:', apiSaveResult.error);
                        }
                    }
                } catch (apiError) {
                    console.error('api operation threw an error:', apiError);
                    // Don't throw error here, continue with email processing
                }
            } else {
                console.log('User not authenticated, attempting to save order without api auth context');
                // If user is not logged in, still try to save the order with payment details
                // This might be for guest checkouts or if api auth state is delayed
                try {
                    updatedOrderData.deliveryStatus = 'pending'; // Set initial delivery status for guest orders
                    apiSaveResult = await window.apiOrdersModule.saveOrderToapi(updatedOrderData);
                    if (apiSaveResult.success) {
                        console.log('Order saved to api without user context:', apiSaveResult.orderId);
                        updatedOrderData.apiOrderId = apiSaveResult.orderId;

                        // Update stock for all products in the order (Razorpay guest order)
                        if (window.StockManager && window.StockManager.updateStockAfterOrder) {
                            try {
                                console.log('Updating stock after Razorpay payment for guest order...');
                                const stockResult = await window.StockManager.updateStockAfterOrder(updatedOrderData.products);
                                if (stockResult.success) {
                                    console.log('Stock updated successfully after Razorpay payment (guest):', stockResult.updates);
                                } else {
                                    console.error('Stock update failed for Razorpay guest order:', stockResult.error);
                                }
                            } catch (stockError) {
                                console.error('Error updating stock for Razorpay guest payment:', stockError);
                            }
                        }

                        // Create shipment automatically for guest orders
                        await createShipmentAfterOrder(updatedOrderData);
                    } else {
                        console.warn('Failed to save order to api without user context:', apiSaveResult.error);
                    }
                } catch (apiError) {
                    console.error('api save without user context threw an error:', apiError);
                }
            }


            // Send order confirmation email
            let emailResult = { success: false };
            try {
                console.log('Attempting to send order confirmation email...');

                if (window.netlifyHelpers) {
                    console.log('Using Netlify Functions for email');
                    emailResult = await window.netlifyHelpers.callNetlifyFunction('send-order-email', {
                        method: 'POST',
                        body: JSON.stringify(updatedOrderData)
                    });
                } else {
                    console.log('Using Express server for email');
                    const emailResponse = await fetch('/api/send-order-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updatedOrderData)
                    });
                    emailResult = await emailResponse.json();
                }

                if (emailResult.success) {
                    console.log('Order confirmation emails sent successfully');
                } else {
                    console.warn('Failed to send order confirmation emails:', emailResult?.message || 'Email service unavailable');
                }
            } catch (emailError) {
                console.error('Error sending order emails:', emailError);
            }

            // Update button to show completion
            if (submitButton) {
                submitButton.innerHTML = '<i class="fas fa-check-circle"></i> Order Complete';
                submitButton.classList.add('btn-success');
                submitButton.classList.remove('btn-primary');
                submitButton.disabled = true;
            }

            // Keep the completion state for a few seconds before showing modal
            setTimeout(() => {
                showOrderConfirmation(updatedOrderData);
            }, 1500);

            // Clear cart after successful order (same as COD flow)
            try {
                console.log('About to clear cart after successful Razorpay order');
                clearCart();

                // Forcibly reset the cart display immediately
                if (orderSummaryContainer) {
                    orderSummaryContainer.innerHTML = '<p>No products added yet.</p>';
                }
                if (orderTotalElement) {
                    orderTotalElement.textContent = currencySymbol + '0.00';
                }
                if (productListContainer) {
                    productListContainer.innerHTML = '';
                }

                // Reset global cart items
                window.checkoutCartItems = [];

                console.log('Cart cleared after successful Razorpay order submission');
            } catch (clearError) {
                console.error('Error clearing cart after Razorpay order:', clearError);
            }



        } catch (error) {
            console.error('Error in handleRazorpaySuccess:', error);

            // Show error but mention that payment was successful
            showErrorMessage(
                'Payment was successful but there was an error processing your order',
                `Please contact support with payment ID: ${response.razorpay_payment_id}`
            );

            // Reset button state on error
            const submitButton = checkoutForm?.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = 'Place Order';
            }
        }
    }

    /**
     * Send order confirmation emails
     * @param {Object} orderData - The order data
     */
    async function sendOrderConfirmationEmails(orderData) {
        try {
            console.log('Sending order confirmation emails via Netlify Functions...');

            // Check if netlify helpers are available
            if (!window.netlifyHelpers || typeof window.netlifyHelpers.callNetlifyFunction !== 'function') {
                console.warn('Netlify helpers not available, skipping email sending');
                return false;
            }

            // Make API call to the Netlify Function with timeout
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Email sending timed out')), 10000);
            });

            const emailResult = await Promise.race([
                window.netlifyHelpers.callNetlifyFunction('send-order-email', {
                    method: 'POST',
                    body: JSON.stringify(orderData)
                }),
                timeoutPromise
            ]);

            if (emailResult && emailResult.success) {
                console.log('Order confirmation emails sent successfully:', emailResult);
                return true;
            } else {
                console.warn('Failed to send order confirmation emails:', emailResult?.message || 'Email service unavailable');
                // Continue with order processing even if email sending fails
                return false;
            }
        } catch (emailError) {
            console.error('Error sending order emails:', emailError);
            console.error('Failed to send order confirmation emails:', emailError.message || emailError);
            // Continue with order processing even if email sending fails
            return false;
        }
    }

    // Create admin notification for new order
    async function createNewOrderNotification(orderData, orderId) {
        try {
            console.log('Creating admin notification for new order:', orderId);

            const notificationData = {
                id: Date.now(),
                message: `New order needs confirmation: ${orderData.customer.firstName} ${orderData.customer.lastName} - ₹${orderData.orderTotal.toLocaleString('en-IN')}`,
                timestamp: new Date().toISOString(),
                type: 'admin-order-pending',
                read: false,
                relatedData: {
                    orderId: orderId,
                    userId: AuthService?.getCurrentUser()?.uid || 'guest',
                    orderReference: orderData.orderReference,
                    customerName: `${orderData.customer.firstName} ${orderData.customer.lastName}`,
                    customerEmail: orderData.customer.email,
                    customerPhone: orderData.customer.phone,
                    customerAddress: orderData.customer.address,
                    amount: orderData.orderTotal,
                    paymentMethod: orderData.paymentMethod,
                    orderDate: orderData.orderDate,
                    status: 'pending',
                    deliveryStatus: orderData.deliveryStatus || 'pending',
                    products: orderData.products,
                    notes: orderData.notes,
                    orderDetails: {
                        formattedDate: new Date(orderData.orderDate).toLocaleDateString('en-IN'),
                        formattedTime: new Date(orderData.orderDate).toLocaleTimeString('en-IN'),
                        formattedAmount: `₹${orderData.orderTotal.toLocaleString('en-IN')}`,
                        itemCount: orderData.products.length,
                        totalItemValue: orderData.products.reduce((sum, item) => sum + (parseFloat(item.price || 0) * parseInt(item.quantity || 1)), 0)
                    }
                },
                category: 'new-order',
                priority: 'high',
                source: 'checkout',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Save notification via API
            const subdomain = getSubdomain();
            await fetch(`/api/notifications`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subdomain, notification: notificationData })
            });

            console.log('✅ Admin notification created for new order:', orderId);
        } catch (error) {
            console.error('Error creating admin notification:', error);
        }
    }

    // Helper function to show a generic success message modal
    function showSuccessMessage(title, message) {
        // Create modal if it doesn't exist
        if (!document.getElementById('successModal')) {
            const modalHTML = `
                <div class="modal fade" id="successModal" tabindex="-1" aria-labelledby="successModalLabel" aria-hidden="true">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header bg-success text-white">
                                <h5 class="modal-title" id="successModalLabel"></h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <p></p>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }

        const successModalElement = document.getElementById('successModal');
        const successModalTitleElement = successModalElement.querySelector('.modal-title');
        const successModalMessageElement = successModalElement.querySelector('.modal-body p');

        if (successModalTitleElement) successModalTitleElement.textContent = title;
        if (successModalMessageElement) successModalMessageElement.textContent = message;

        const successModal = new bootstrap.Modal(successModalElement);
        successModal.show();
    }

    // Helper function to show a generic error message modal
    function showErrorMessage(title, message) {
        // Create modal if it doesn't exist
        if (!document.getElementById('errorModal')) {
            const modalHTML = `
                <div class="modal fade" id="errorModal" tabindex="-1" aria-labelledby="errorModalLabel" aria-hidden="true">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header bg-danger text-white">
                                <h5 class="modal-title" id="errorModalLabel"></h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <p></p>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }

        const errorModalElement = document.getElementById('errorModal');
        const errorModalTitleElement = errorModalElement.querySelector('.modal-title');
        const errorModalMessageElement = errorModalElement.querySelector('.modal-body p');

        if (errorModalTitleElement) errorModalTitleElement.textContent = title;
        if (errorModalMessageElement) errorModalMessageElement.textContent = message;

        const errorModal = new bootstrap.Modal(errorModalElement);
        errorModal.show();
    }

    // Set up address management
    function setupAddressManagement() {
        const useNewAddressBtn = document.getElementById('use-new-address-btn');
        if (useNewAddressBtn) {
            useNewAddressBtn.addEventListener('click', function() {
                showManualAddressForm();
            });
        }
    }

    // Load saved addresses for both logged-in and guest users
    async function loadSavedAddresses() {
        const user = AuthService?.getCurrentUser();

        if (user) {
            console.log('Loading saved addresses for logged-in user:', user.uid);
            await loadapiAddresses();
        } else {
            console.log('Loading saved addresses for guest user from localStorage');
            await loadLocalAddresses();
        }
    }

    // Load addresses from api for logged-in users
    async function loadapiAddresses() {
        const user = AuthService?.getCurrentUser();
        if (!user) {
            console.log('User not logged in, cannot load api addresses');
            return;
        }

        console.log('Loading api addresses for user:', user.uid);

        const savedAddressesSection = document.getElementById('saved-addresses-section');
        const saveAddressOption = document.getElementById('save-address-option');
        const addressContainer = document.getElementById('saved-addresses-container');
        const guestNotice = document.getElementById('guest-address-notice');

        if (!savedAddressesSection || !addressContainer) {
            console.warn('Address UI elements not found');
            return;
        }

        // Hide guest notice for logged-in users
        if (guestNotice) {
            guestNotice.style.display = 'none';
        }

        // Show the save address option for logged in users
        if (saveAddressOption) {
            saveAddressOption.style.display = 'block';
        }

        try {
            // Show loading state
            addressContainer.innerHTML = '<div class="loading-addresses">Loading your saved addresses...</div>';

            const result = await apiAddressManager.loadUserAddresses();

            if (result.success && result.addresses.length > 0) {
                console.log('Loaded', result.addresses.length, 'saved addresses');

                // Show saved addresses section
                savedAddressesSection.style.display = 'block';

                // Display addresses
                addressContainer.innerHTML = '';
                result.addresses.forEach((address, index) => {
                    const addressHTML = `
                        <div class="address-option" data-address-id="${address.id}" onclick="selectSavedAddress('${address.id}')">
                            <input type="radio" name="savedAddress" value="${address.id}" class="address-radio" ${address.isDefault ? 'checked' : ''}>
                            <div class="address-type">
                                ${address.addressType ? address.addressType.charAt(0).toUpperCase() + address.addressType.slice(1) : 'Address'}
                                ${address.isDefault ? '<span class="default-badge">Default</span>' : ''}
                            </div>
                            <div class="address-details">
                                <strong>${address.firstName} ${address.lastName}</strong><br>
                                ${address.houseNumber}, ${address.roadName}<br>
                                ${address.city}, ${address.state} ${address.pinCode}<br>
                                Phone: ${address.phone}
                            </div>
                        </div>
                    `;
                    addressContainer.insertAdjacentHTML('beforeend', addressHTML);
                });

                // If there's a default address, select it and hide manual form
                const defaultAddress = result.addresses.find(addr => addr.isDefault);
                if (defaultAddress) {
                    selectSavedAddress(defaultAddress.id);
                    hideManualAddressForm();
                } else {
                    // Select first address if no default
                    if (result.addresses.length > 0) {
                        selectSavedAddress(result.addresses[0].id);
                        hideManualAddressForm();
                    }
                }

            } else if (result.success && result.addresses.length === 0) {
                console.log('No saved addresses found');
                addressContainer.innerHTML = '<div class="no-addresses">No saved addresses found. Please enter your shipping details below.</div>';
                // Keep manual form visible
                showManualAddressForm();
            } else {
                console.error('Failed to load addresses:', result.error);
                addressContainer.innerHTML = '<div class="no-addresses">Unable to load saved addresses. Please enter your shipping details below.</div>';
                showManualAddressForm();
            }

        } catch (error) {
            console.error('Error loading addresses:', error);
            addressContainer.innerHTML = '<div class="no-addresses">Error loading addresses. Please enter your shipping details below.</div>';
            showManualAddressForm();
        }
    }

    // Load addresses from localStorage for guest users
    async function loadLocalAddresses() {
        const savedAddressesSection = document.getElementById('saved-addresses-section');
        const saveAddressOption = document.getElementById('save-address-option');
        const addressContainer = document.getElementById('saved-addresses-container');
        const guestNotice = document.getElementById('guest-address-notice');

        if (!savedAddressesSection || !addressContainer) {
            console.warn('Address UI elements not found');
            return;
        }

        // Show guest notice
        if (guestNotice) {
            guestNotice.style.display = 'block';
        }

        // Always show save address option for guest users
        if (saveAddressOption) {
            saveAddressOption.style.display = 'block';
            const label = saveAddressOption.querySelector('label');
            if (label) {
                label.textContent = 'Save this address for faster checkout next time';
            }
        }

        try {
            // Check if LocalAddressManager is available
            if (typeof LocalAddressManager === 'undefined') {
                console.warn('LocalAddressManager not available');
                showManualAddressForm();
                return;
            }

            const addresses = LocalAddressManager.getAddresses();

            if (addresses && addresses.length > 0) {
                console.log('Loaded', addresses.length, 'guest addresses from localStorage');

                // Show saved addresses section
                savedAddressesSection.style.display = 'block';

                // Display addresses
                addressContainer.innerHTML = '';
                addresses.forEach((address, index) => {
                    const addressHTML = `
                        <div class="address-option" data-address-id="${address.id}" data-address-type="local" onclick="selectSavedAddress('${address.id}', 'local')">
                            <input type="radio" name="savedAddress" value="${address.id}" class="address-radio" ${address.isDefault ? 'checked' : ''}>
                            <div class="address-type">
                                ${address.addressType ? address.addressType.charAt(0).toUpperCase() + address.addressType.slice(1) : 'Address'}
                                ${address.isDefault ? '<span class="default-badge">Default</span>' : ''}
                            </div>
                            <div class="address-details">
                                <strong>${address.firstName} ${address.lastName}</strong><br>
                                ${address.houseNumber}, ${address.street || address.roadName}<br>
                                ${address.city}, ${address.state} ${address.pinCode}<br>
                                Phone: ${address.phone}
                            </div>
                        </div>
                    `;
                    addressContainer.insertAdjacentHTML('beforeend', addressHTML);
                });

                // If there's a default address, select it and hide manual form
                const defaultAddress = addresses.find(addr => addr.isDefault);
                if (defaultAddress) {
                    selectSavedAddress(defaultAddress.id, 'local');
                    hideManualAddressForm();
                } else {
                    // Select first address if no default
                    if (addresses.length > 0) {
                        selectSavedAddress(addresses[0].id, 'local');
                        hideManualAddressForm();
                    }
                }

            } else {
                console.log('No saved guest addresses found');
                addressContainer.innerHTML = '';
                savedAddressesSection.style.display = 'none';
                // Keep manual form visible
                showManualAddressForm();
            }

        } catch (error) {
            console.error('Error loading local addresses:', error);
            showManualAddressForm();
        }
    }

    // Select a saved address (works for both api and localStorage)
    function selectSavedAddress(addressId, storageType) {
        // Default to api if not specified
        if (!storageType) {
            const user = typeof AuthService !== 'undefined' && AuthService.isLoggedIn();
            storageType = user ? 'api' : 'local';
        }
        // Update radio button selection
        const radios = document.querySelectorAll('input[name="savedAddress"]');
        radios.forEach(radio => {
            radio.checked = radio.value === addressId;
        });

        // Update visual selection
        const addressOptions = document.querySelectorAll('.address-option');
        addressOptions.forEach(option => {
            if (option.dataset.addressId === addressId) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });

        // Load address data into the form (for order confirmation)
        loadAddressIntoForm(addressId, storageType);

        console.log('Selected saved address:', addressId, 'from', storageType);
    }

    // Load address data into form (supports both api and localStorage)
    async function loadAddressIntoForm(addressId, storageType) {
        try {
            let address = null;

            if (storageType === 'local') {
                // Load from localStorage
                if (typeof LocalAddressManager !== 'undefined') {
                    address = LocalAddressManager.getAddressById(addressId);
                }
            } else {
                // Load from api
                const result = await apiAddressManager.loadUserAddresses();
                if (result.success) {
                    address = result.addresses.find(addr => addr.id === addressId);
                }
            }

            if (address) {
                // Fill form fields
                document.getElementById('firstName').value = address.firstName || '';
                document.getElementById('lastName').value = address.lastName || '';
                document.getElementById('email').value = address.email || '';
                document.getElementById('phone').value = address.phone || '';
                document.getElementById('pinCode').value = address.pinCode || '';
                document.getElementById('state').value = address.state || '';
                document.getElementById('city').value = address.city || '';
                document.getElementById('houseNumber').value = address.houseNumber || '';
                document.getElementById('roadName').value = address.street || address.roadName || '';

                console.log('Address data loaded into form from', storageType);
            }
        } catch (error) {
            console.error('Error loading address into form:', error);
        }
    }

    // Show manual address form
    function showManualAddressForm() {
        const manualForm = document.getElementById('manual-address-form');
        if (manualForm) {
            manualForm.classList.remove('hidden');
            manualForm.style.display = 'block';
        }

        // Show save address option for both logged-in and guest users
        const saveAddressOption = document.getElementById('save-address-option');
        if (saveAddressOption) {
            saveAddressOption.style.display = 'block';
            const user = typeof AuthService !== 'undefined' && AuthService.isLoggedIn();
            const label = saveAddressOption.querySelector('label');
            if (label) {
                if (user) {
                    label.textContent = 'Save this address to your account';
                } else {
                    label.textContent = 'Save this address for faster checkout next time';
                }
            }
            console.log('Save address option shown for', user ? 'logged-in user' : 'guest user');
        }

        // Clear all form fields
        const formFields = [
            'firstName', 'lastName', 'email', 'phone',
            'houseNumber', 'pinCode', 'roadName', 'city', 'state', 'notes'
        ];

        formFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = '';
                // Clear any validation classes
                field.classList.remove('error', 'valid');
            }
        });

        // Deselect any saved addresses
        const addressOptions = document.querySelectorAll('.address-option');
        addressOptions.forEach(option => {
            option.classList.remove('selected');
        });

        const radios = document.querySelectorAll('input[name="savedAddress"]');
        radios.forEach(radio => {
            radio.checked = false;
        });

        console.log('Manual address form shown and cleared');
    }

    // Hide manual address form
    function hideManualAddressForm() {
        const manualForm = document.getElementById('manual-address-form');
        if (manualForm) {
            manualForm.classList.add('hidden');
            manualForm.style.display = 'none';
        }
        console.log('Manual address form hidden');
    }

    // Save address during checkout if requested (supports both api and localStorage)
    async function saveAddressIfRequested() {
        const saveAddressCheckbox = document.getElementById('saveAddress');
        if (!saveAddressCheckbox || !saveAddressCheckbox.checked) {
            console.log('Save address checkbox not checked, skipping save');
            return;
        }

        // Check if a saved address is selected instead of manual form
        const selectedSavedAddress = document.querySelector('input[name="savedAddress"]:checked');
        if (selectedSavedAddress) {
            console.log('Using saved address, not saving new one');
            return;
        }

        const user = typeof AuthService !== 'undefined' && AuthService.isLoggedIn();

        try {
            const addressData = {
                firstName: document.getElementById('firstName').value,
                lastName: document.getElementById('lastName').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                houseNumber: document.getElementById('houseNumber').value,
                street: document.getElementById('roadName').value,
                roadName: document.getElementById('roadName').value,
                city: document.getElementById('city').value,
                state: document.getElementById('state').value,
                pinCode: document.getElementById('pinCode').value,
                addressType: 'home', // default type
                isDefault: false // don't set as default automatically
            };

            if (user) {
                // Save to api for logged-in users
                const result = await apiAddressManager.saveAddress(addressData);
                if (result.success) {
                    console.log('✅ Address saved to api successfully for future orders');
                } else {
                    console.warn('Failed to save address to api:', result.error);
                }
            } else {
                // Save to localStorage for guest users
                if (typeof LocalAddressManager !== 'undefined') {
                    const result = LocalAddressManager.saveAddress(addressData);
                    if (result.success) {
                        console.log('✅ Address saved to localStorage successfully for future orders');
                    } else {
                        console.warn('Failed to save address to localStorage:', result.errors);
                    }
                } else {
                    console.warn('LocalAddressManager not available, cannot save guest address');
                }
            }
        } catch (error) {
            console.error('Error saving address:', error);
        }
    }

    // Make functions global so they can be called from HTML
    window.selectSavedAddress = selectSavedAddress;
    window.loadSavedAddresses = loadSavedAddresses;
});