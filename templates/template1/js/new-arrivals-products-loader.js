/**
 * New Arrivals Products Loader
 * Dynamically loads products EXCLUSIVELY from Firebase Cloud Storage
 * Uses exact same approach as Kkt-project bridal section
 */

const NewArrivalsProductsLoader = (function() {
    let storage;
    let isInitialized = false;
    let cachedProducts = null;
    let lastFetchTime = 0;
    let cachedETag = null;
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours cache for optimal CDN usage
    const SHORT_CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours for localStorage to reduce bandwidth
    const MAX_PRODUCTS_TO_FETCH = 6; // Limit products fetched

    /**
     * Initialize Firebase Storage connection
     */
    function init() {
        try {
            console.log('Initializing New Arrivals Products Loader...');
            console.log('Firebase available:', typeof firebase !== 'undefined');

            if (typeof firebase !== 'undefined') {
                console.log('Firebase object:', firebase);
                console.log('Firebase apps:', firebase.apps);

                storage = firebase.storage();
                console.log('Storage instance:', storage);

                isInitialized = true;
                console.log('New Arrivals Products Loader initialized successfully');
                return true;
            } else {
                console.error('Firebase not available - make sure Firebase scripts are loaded');
                return false;
            }
        } catch (error) {
            console.error('Error initializing New Arrivals Products Loader:', error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                stack: error.stack
            });
            return false;
        }
    }

    /**
     * Clear all caches - called when products are updated
     */
    function clearCache() {
        console.log('Clearing new arrivals products cache...');
        cachedProducts = null;
        lastFetchTime = 0;
        try {
            localStorage.removeItem('newArrivalsProducts');
            localStorage.removeItem('newArrivalsProductsTime');
            localStorage.removeItem('newArrivalsProductsETag');
        } catch (e) {
            console.warn('Error clearing localStorage cache:', e);
        }
    }

    /**
     * Load new arrivals products EXCLUSIVELY from Firebase Cloud Storage
     */
    async function loadNewArrivalsProducts(forceRefresh = false) {
        if (!isInitialized) {
            console.error('New Arrivals Products Loader not initialized - Firebase connection failed');
            return [];
        }

        // Check if admin panel has invalidated cache by setting lastProductUpdate
        const lastProductUpdate = localStorage.getItem('lastProductUpdate');
        let cacheInvalidated = false;

        if (lastProductUpdate) {
            const updateTime = parseInt(lastProductUpdate);
            const cacheTime = parseInt(localStorage.getItem('newArrivalsProductsTime') || '0');

            if (updateTime > cacheTime) {
                console.log('🚨 Cache invalidated by admin panel update:', new Date(updateTime));
                cacheInvalidated = true;
                forceRefresh = true;
                // Clear the invalidation flag immediately to prevent continuous cache busting
                localStorage.removeItem('lastProductUpdate');
                console.log('✅ Cleared cache invalidation flag to restore CDN caching');
            }
        }

        // Check memory cache first
        const now = Date.now();

        if (!forceRefresh && !cacheInvalidated && cachedProducts && (now - lastFetchTime) < CACHE_DURATION) {
            console.log('Using memory cached new arrivals products');
            return cachedProducts;
        }

        // Check localStorage cache with ETag validation
        if (!forceRefresh && !cacheInvalidated) {
            try {
                const stored = localStorage.getItem('newArrivalsProducts');
                const storedTime = localStorage.getItem('newArrivalsProductsTime');
                const storedETag = localStorage.getItem('newArrivalsProductsETag');

                if (stored && storedTime && (now - parseInt(storedTime)) < SHORT_CACHE_DURATION) {
                    console.log('Using localStorage cached new arrivals products (ETag:', storedETag?.substring(0, 8) + ')');
                    cachedProducts = JSON.parse(stored);
                    cachedETag = storedETag;
                    lastFetchTime = parseInt(storedTime);
                    return cachedProducts;
                }
            } catch (e) {
                console.warn('Error reading from localStorage cache:', e);
            }
        }

        let products = [];

        try {
            // Load products EXCLUSIVELY from Firebase Cloud Storage
            console.log('Loading new arrivals products from Cloud Storage...');

            let response;

            // Use Netlify function for proper CDN caching (works on both deployed and development)
            if (true) { // Always use Netlify function for CDN optimization
                console.log('Deployed site detected - using Netlify function endpoint');

                // Use Netlify function endpoint for proper cache control
                let netlifyEndpoint = '/.netlify/functions/load-products?category=new-arrivals';

                // Add cache busting parameter if force refresh or cache invalidated
                if (forceRefresh || cacheInvalidated) {
                    const timestamp = Date.now();
                    netlifyEndpoint += `&cacheBust=${timestamp}`;
                    console.log('Added cache busting parameter:', timestamp);
                }

                // Prepare headers for cache control
                const netlifyHeaders = {
                    'Content-Type': 'application/json'
                };

                // Add cache control headers for force refresh
                if (forceRefresh || cacheInvalidated) {
                    netlifyHeaders['Cache-Control'] = 'no-cache, no-store, must-revalidate';
                    netlifyHeaders['Pragma'] = 'no-cache';
                    netlifyHeaders['Expires'] = '0';
                }

                // Add ETag for cache validation (only if not forcing refresh and cache not invalidated)
                const storedETag = localStorage.getItem('newArrivalsProductsETag');
                if (!forceRefresh && !cacheInvalidated && storedETag) {
                    netlifyHeaders['If-None-Match'] = storedETag;
                    console.log('Adding If-None-Match header:', storedETag.substring(0, 12) + '...');
                }

                console.log('Netlify endpoint:', netlifyEndpoint);
                console.log('Request headers:', netlifyHeaders);

                response = await fetch(netlifyEndpoint, {
                    method: 'GET',
                    headers: netlifyHeaders,
                    cache: (forceRefresh || cacheInvalidated) ? 'no-store' : 'default'
                });

                // Handle 304 Not Modified (only if we weren't forcing refresh)
                if (response.status === 304 && !forceRefresh && !cacheInvalidated) {
                    console.log('304 Not Modified - using cached products');
                    const stored = localStorage.getItem('newArrivalsProducts');
                    if (stored) {
                        try {
                            cachedProducts = JSON.parse(stored);
                            lastFetchTime = now;
                            console.log('Returning cached products from 304:', cachedProducts.length);
                            return cachedProducts;
                        } catch (e) {
                            console.warn('Error parsing cached products, forcing fresh load');
                            return await loadNewArrivalsProducts(true); // Force refresh
                        }
                    } else {
                        console.warn('304 received but no cached products available, forcing fresh load');
                        return await loadNewArrivalsProducts(true); // Force refresh
                    }
                }

                if (!response.ok) {
                    throw new Error(`Netlify function error: ${response.status} ${response.statusText}`);
                }

                // Store new ETag for next request
                const newETag = response.headers.get('etag');
                if (newETag) {
                    cachedETag = newETag;
                    console.log('Stored new ETag:', newETag.substring(0, 12) + '...');
                }

                const data = await response.json();
                if (!data.success) {
                    throw new Error(data.message || 'Failed to load new arrivals products from Netlify function');
                }

                products = data.products || [];
                console.log('Successfully loaded products via Netlify function:', products.length);
            } else {
                // Local development - use server endpoint
                console.log('Local development detected - using server endpoint');

                const apiEndpoint = '/api/load-products/new-arrivals';

                // Prepare headers for cache validation
                const requestHeaders = {
                    'Content-Type': 'application/json'
                };

                // Add ETag for cache validation if we have one
                const storedETag = localStorage.getItem('newArrivalsProductsETag');
                if (storedETag && !forceRefresh) {
                    requestHeaders['If-None-Match'] = storedETag;
                }

                response = await fetch(apiEndpoint, {
                    method: 'GET',
                    headers: requestHeaders,
                    cache: 'default'
                });

                // Handle 304 Not Modified responses
                if (response.status === 304) {
                    console.log('Products not modified, using local cache');
                    const stored = localStorage.getItem('newArrivalsProducts');
                    if (stored) {
                        cachedProducts = JSON.parse(stored);
                        lastFetchTime = now;
                        return cachedProducts;
                    }
                }

                if (!response.ok) {
                    throw new Error(`Server error: ${response.status} ${response.statusText}`);
                }

                // Store ETag for future requests
                const responseETag = response.headers.get('ETag') || response.headers.get('etag');
                if (responseETag) {
                    localStorage.setItem('newArrivalsProductsETag', responseETag);
                    cachedETag = responseETag;
                    console.log('Stored new ETag:', responseETag.substring(0, 12) + '...');
                }

                const data = await response.json();
                if (!data.success) {
                    console.error('Server returned error:', data.error);
                    console.error('Error message:', data.message);

                    // Check if this is a Firebase configuration error on Netlify
                    if (data.error && data.error.includes('Firebase Admin not configured')) {
                        console.error('NETLIFY DEPLOYMENT ISSUE: Firebase Admin credentials not set up');
                        console.error('Please check NETLIFY_DEPLOYMENT_FIX.md for setup instructions');
                    }

                    products = data.products || [];

                    // If no products and there's an error, show a helpful message
                    if (products.length === 0 && data.error) {
                        console.error('No products loaded due to error:', data.error);
                    }
                } else {
                    products = data.products || [];
                }
                console.log('Successfully loaded products via server:', products.length);
            }

            // Validate and normalize products for different data structures
            products = products.map(product => {
                // Handle different image structures from admin panel vs original data
                if (!product.image && product.mainImage) {
                    product.image = product.mainImage;
                } else if (!product.image && product.images && product.images.length > 0) {
                    product.image = product.images[0].url;
                }

                return product;
            }).filter(product => {
                const isValid = product.name && product.price && product.image;
                if (!isValid) {
                    console.warn('Skipping invalid product from Storage:', {
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        image: product.image,
                        mainImage: product.mainImage,
                        hasImages: product.images && product.images.length > 0
                    });
                }
                return isValid;
            });

            // Limit products if needed
            if (products.length > MAX_PRODUCTS_TO_FETCH) {
                products = products.slice(0, MAX_PRODUCTS_TO_FETCH);
            }

            // Cache the results in memory and localStorage
            cachedProducts = products;
            lastFetchTime = now;

            // Set global variables for OutOfStockHandler
            window.newArrivalsProducts = products;

            try {
                localStorage.setItem('newArrivalsProducts', JSON.stringify(products));
                localStorage.setItem('newArrivalsProductsTime', now.toString());
                if (cachedETag) {
                    localStorage.setItem('newArrivalsProductsETag', cachedETag);
                }
                console.log('Cached', products.length, 'products with ETag:', cachedETag?.substring(0, 8) + '...');

                // Clear the invalidation flag since we've successfully loaded fresh data
                if (cacheInvalidated) {
                    localStorage.removeItem('lastProductUpdate');
                    console.log('✅ Cleared cache invalidation flag after successful fresh load');
                }
            } catch (e) {
                console.warn('Error saving to localStorage cache:', e);
            }

            console.log('Final product count loaded:', products.length);
            return products;

        } catch (error) {
            console.error('Error loading new arrivals products:', error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                stack: error.stack
            });
            return [];
        }
    }

    /**
     * Sort products by selected criteria
     */
    function sortProducts(products, sortBy) {
        console.log('Sorting products by:', sortBy);

        const productsCopy = [...products];

        switch (sortBy) {
            case 'price-low-high':
                return productsCopy.sort((a, b) => {
                    const priceA = parseFloat(a.price);
                    const priceB = parseFloat(b.price);
                    return priceA - priceB;
                });

            case 'price-high-low':
                return productsCopy.sort((a, b) => {
                    const priceA = parseFloat(a.price);
                    const priceB = parseFloat(b.price);
                    return priceB - priceA;
                });

            case 'newest':
                return productsCopy.sort((a, b) => {
                    const dateA = new Date(a.date || 0);
                    const dateB = new Date(b.date || 0);
                    return dateB - dateA;
                });

            case 'featured':
            default:
                return productsCopy;
        }
    }

    /**
     * Setup sort UI
     */
    function setupSortUI() {
        const sortSelect = document.getElementById('sortSelect');

        if (!sortSelect) {
            console.log('Sort select not found');
            return;
        }

        sortSelect.addEventListener('change', async function() {
            const sortBy = this.value;
            console.log('Sort changed to:', sortBy);

            // Directly load products for sorting
            const products = await loadNewArrivalsProducts(true); // Use forceRefresh to get latest data
            const sortedProducts = sortProducts(products, sortBy);
            displayAllProducts(sortedProducts); // Use a generic display function
        });
    }

    /**
     * Load products directly without cache checks (for sorting)
     */
    async function loadNewArrivalsProductsDirect(forceRefresh = false) {
        // This function essentially re-implements the core loading logic
        // to ensure sorting works on the latest data fetched.
        // It might be redundant if loadNewArrivalsProducts is always called with forceRefresh=true during sorting.
        // For clarity, we'll call the main loading function with forceRefresh.
        console.log('Loading new arrivals products directly for sorting...');
        return await loadNewArrivalsProducts(true);
    }

    /**
     * Display products in the grid
     */
    function displayAllProducts(products) {
        const productsGrid = document.getElementById('products-grid') || document.querySelector('.products-grid');

        if (!productsGrid) {
            console.warn('Products grid not found for display');
            return;
        }

        if (products.length > 0) {
            // Hide loader before showing products
            const loaderPage = document.getElementById('newArrivalsPageLoader');
            if (loaderPage) loaderPage.style.display = 'none';
            
            const productsHTML = products.map(product => generateProductHTML(product)).join('');
            productsGrid.innerHTML = productsHTML;

            // CRITICAL: Populate global price cache BEFORE currency conversion
            // This ensures prices are cached before any DOM modifications
            products.forEach(product => {
                if (window.PRODUCT_PRICES_CACHE) {
                    window.PRODUCT_PRICES_CACHE.set(product.id, product.price);
                    console.log('📦 Cached price for', product.id, ':', product.price, 'INR');
                }
            });

            // Convert prices to user's selected currency
            if (typeof window.CurrencyConverter !== 'undefined') {
                window.CurrencyConverter.convertAllPrices();
            }

            // Setup wishlist event listeners
            setupWishlistEventListeners();

            // Update wishlist button states
            if (typeof window.WishlistManager !== 'undefined') {
                setTimeout(() => {
                    window.WishlistManager.updateWishlistButtonsState();
                }, 100);
            }
        } else {
            productsGrid.innerHTML = `
                <div class="no-products-message" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                    <i class="fas fa-gem" style="font-size: 48px; color: #6D3E25; margin-bottom: 20px;"></i>
                    <h3 style="color: #6D3E25; margin-bottom: 10px;">No Products Available</h3>
                    <p style="color: #666;">Products will appear here once they are added through the admin panel.</p>
                </div>
            `;
        }
    }


    /**
     * Update products grid for current page
     */
    async function updateProductsGrid(category) {
        const productsGrid = document.getElementById('products-grid') || document.querySelector('.products-grid');

        if (!productsGrid) {
            console.warn('Products grid not found');
            return;
        }

        try {
            const products = await loadSubcategoryProducts(category);

            if (products.length > 0) {
                // Hide loader before showing products
                const loaderPage = document.getElementById('newArrivalsPageLoader');
                if (loaderPage) loaderPage.style.display = 'none';
                
                const productsHTML = products.map(product => generateProductHTML(product)).join('');
                productsGrid.innerHTML = productsHTML;

                // CRITICAL: Populate global price cache BEFORE currency conversion
                products.forEach(product => {
                    if (window.PRODUCT_PRICES_CACHE) {
                        window.PRODUCT_PRICES_CACHE.set(product.id, product.price);
                        console.log('📦 Cached price for', product.id, ':', product.price, 'INR');
                    }
                });

                // Convert prices to user's selected currency
                if (typeof window.CurrencyConverter !== 'undefined') {
                    window.CurrencyConverter.convertAllPrices();
                }

                // Setup wishlist event listeners
                setupWishlistEventListeners();

                // Update wishlist button states
                if (typeof window.WishlistManager !== 'undefined') {
                    setTimeout(() => {
                        window.WishlistManager.updateWishlistButtonsState();
                    }, 100);
                }
            } else {
                productsGrid.innerHTML = `
                    <div class="no-products-message" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                        <i class="fas fa-gem" style="font-size: 48px; color: #6D3E25; margin-bottom: 20px;"></i>
                        <h3 style="color: #6D3E25; margin-bottom: 10px;">No Products Available</h3>
                        <p style="color: #666;">Products will appear here once they are added through the admin panel.</p>
                    </div>
                `;
            }

            console.log(`${category} section updated with ${products.length} products`);
        } catch (error) {
            console.error(`Error updating ${category} section:`, error);
            productsGrid.innerHTML = `
                <div class="loading-error" style="grid-column: 1 / -1; color: red; padding: 20px; text-align: center;">
                    <strong>Error loading products</strong><br>
                    ${error.message}
                </div>
            `;
        }
    }

    /**
     * Generate HTML for a product item - matching homepage product structure
     */
    function generateProductHTML(product) {
        const formattedPrice = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0
        }).format(product.price);

        return `
            <div class="product-item" data-product-id="${product.id}" data-product-price="${product.price}" data-product-name="${product.name}" data-product-image="${product.image}" style="background: none;">
                <a href="product-detail.html?id=${product.id}" style="text-decoration: none; color: inherit;">
                    <div class="product-image">
                        <img src="${product.image}" alt="${product.name}" loading="lazy">
                        <button class="add-to-wishlist" data-product-id="${product.id}" data-product-name="${product.name}" data-product-price="${product.price}" data-product-image="${product.image}" >
                            <i class="far fa-heart"></i>
                        </button>
                    </div>
                    <div class="product-details" style="text-align: center;">
                        <h3 class="product-name">${product.name}</h3>
                        <div class="product-pricing">
                            <span class="current-price" data-original-price="${product.price}">${formattedPrice}</span>
                        </div>
                    </div>
                </a>
            </div>
        `;
    }

    /**
     * REMOVED: Custom wishlist event listeners
     * 
     * REASON: Duplicate listeners were causing price corruption!
     * - This function was adding ADDITIONAL listeners on top of wishlist-manager.js listeners
     * - When currency changed, textContent showed converted price (e.g., "$300")
     * - parseFloat("$300") extracted 300 instead of original 25000
     * - This corrupted prices in wishlist
     * 
     * SOLUTION: Removed all custom listener code
     * - Let wishlist-manager.js handle ALL button clicks uniformly
     * - It uses 5-level defense with data attributes + global cache
     * - Now prices are extracted BEFORE currency conversion happens
     * 
     * LEGACY CODE - DO NOT RESTORE
     */

    /**
     * Update the New Arrivals section with loaded products
     */
    async function updateNewArrivalsSection() {
        // Try both possible selectors to match the HTML structure
        let newArrivalsGrid = document.querySelector('.new-arrivals-edit .arrivals-grid');
        if (!newArrivalsGrid) {
            newArrivalsGrid = document.querySelector('.new-arrivals-edit .product-scroll-container');
        }

        if (!newArrivalsGrid) {
            console.warn('New arrivals grid element not found');
            return;
        }

        try {
            // Load products from Firebase
            const products = await loadNewArrivalsProducts();

            if (products.length > 0) {
                // Firebase products found - show only these
                console.log('Firebase products found, showing only Firebase products');
                const firebaseProductsHTML = products.map(product => generateProductHTML(product)).join('');
                newArrivalsGrid.innerHTML = firebaseProductsHTML;
                
                // Hide loader after products are loaded
                const loader = document.getElementById('newArrivalsLoader');
                if (loader) {
                    loader.classList.remove('show');
                }
            } else {
                // Hide loader when no products
                const loader = document.getElementById('newArrivalsLoader');
                if (loader) {
                    loader.classList.remove('show');
                }
                
                // No Firebase products found - show message
                console.log('No products found in Firebase');

                // Check if we're on Netlify and show appropriate message
                const isNetlify = window.location.hostname.includes('netlify') || window.location.hostname.includes('.app');
                const messageText = isNetlify
                    ? 'If you recently deployed to Netlify, please ensure Firebase Admin credentials are configured in your Netlify environment variables.'
                    : 'Products will appear here once they are added through the admin panel.';

                newArrivalsGrid.innerHTML = `
                    <div class="no-products-message" style="grid-column: 1 / -1; text-align: center; padding: 40px 20px;">
                        <i class="fas fa-star" style="font-size: 48px; color: #5a3f2a; margin-bottom: 20px;"></i>
                        <h3 style="color: #5a3f2a; margin-bottom: 10px;">No Products Available</h3>
                        <p style="color: #666;">${messageText}</p>
                    </div>
                `;
            }

            // Reinitialize event listeners for dynamically generated product cards
            // Add a small delay to ensure DOM is fully updated
            setTimeout(() => {
                setupWishlistEventListeners();
            }, 100);

            // Update OutOfStockHandler with the loaded products
            if (window.OutOfStockHandler && products.length > 0) {
                console.log('Updating OutOfStockHandler with new arrivals products:', products.length);
                window.OutOfStockHandler.updateFromProductData(products, 'new-arrivals');
            }

            // Dispatch custom event to notify that products have been loaded
            document.dispatchEvent(new CustomEvent('productsLoaded', {
                detail: {
                    section: 'new-arrivals',
                    count: products.length,
                    products: products
                }
            }));

            // Trigger auto-scroll after a delay to ensure DOM is updated
            setTimeout(() => {
                if (window.autoScrollNewArrivalsSection) {
                    console.log('Triggering auto-scroll from products loader...');
                    window.autoScrollNewArrivalsSection();
                }
            }, 1200);

            // Refresh out-of-stock handler for newly loaded products
            if (window.OutOfStockHandler) {
                setTimeout(() => {
                    console.log('Refreshing OutOfStockHandler for new arrivals...');
                    if (window.OutOfStockHandler.forceRefresh) {
                        window.OutOfStockHandler.forceRefresh();
                    } else if (window.OutOfStockHandler.refresh) {
                        window.OutOfStockHandler.refresh();
                    }
                }, 1500);
            }

            // Reinitialize any other event listeners if needed
            if (window.reinitializeProductEvents) {
                window.reinitializeProductEvents();
            }

            console.log('New Arrivals section updated with', products.length, 'products');
        } catch (error) {
            console.error('Error updating New Arrivals section:', error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                stack: error.stack
            });

            // Log error for debugging
            console.log('Error occurred, loader remains visible for user');
        }
    }

    /**
     * Monitor for cache invalidation flag set by admin panel
     */
    function watchForCacheInvalidation() {
        setInterval(() => {
            const lastProductUpdate = localStorage.getItem('lastProductUpdate');
            if (lastProductUpdate) {
                const updateTime = parseInt(lastProductUpdate);
                const now = Date.now();
                // If flag was set recently (within last 10 seconds), reload products
                if (now - updateTime < 10000) {
                    console.log('🔄 Detected cache invalidation, reloading products...');
                    updateNewArrivalsSection();
                }
            }
        }, 1000); // Check every second
    }

    /**
     * Clear cached products (useful after adding/editing products)
     */
    function clearCache() {
        console.log('Clearing all new arrivals products cache...');
        cachedProducts = null;
        lastFetchTime = 0;
        cachedETag = null;
        try {
            localStorage.removeItem('newArrivalsProducts');
            localStorage.removeItem('newArrivalsProductsTime');
            localStorage.removeItem('newArrivalsProductsETag');
            console.log('localStorage cache cleared');
        } catch (e) {
            console.warn('Error clearing localStorage cache:', e);
        }
        console.log('All new arrivals products cache cleared');
    }

    // Public API
    return {
        init,
        loadNewArrivalsProducts,
        updateNewArrivalsSection,
        clearCache,
        setupSortUI,
        displayAllProducts,
        sortProducts,
        watchForCacheInvalidation
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for Firebase to initialize
    setTimeout(() => {
        if (NewArrivalsProductsLoader.init()) {
            // Force refresh to bypass any cache issues
            NewArrivalsProductsLoader.loadNewArrivalsProducts(true).then(products => {
                console.log('Initial load completed with', products.length, 'products');
                NewArrivalsProductsLoader.updateNewArrivalsSection();
                NewArrivalsProductsLoader.setupSortUI(); // Setup sort UI after products are loaded
            }).catch(error => {
                console.error('Initial load failed:', error);
                NewArrivalsProductsLoader.updateNewArrivalsSection(); // Still update section even if initial load fails
                NewArrivalsProductsLoader.setupSortUI(); // Setup sort UI even if initial load fails
            });
            NewArrivalsProductsLoader.watchForCacheInvalidation();
        }
    }, 1000);
});