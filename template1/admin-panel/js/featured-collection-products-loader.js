/**
 * Bridal Products Loader
 * Dynamically loads products EXCLUSIVELY from Firebase Cloud Storage
 */

const BridalProductsLoader = (function() {
    let storage;
    let isInitialized = false;
    let cachedProducts = null;
    let lastFetchTime = 0;
    let cachedETag = null;
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours cache for optimal CDN usage
    const SHORT_CACHE_DURATION = 60 * 60 * 1000; // 1 hour for localStorage to reduce bandwidth
    const MAX_PRODUCTS_TO_FETCH = 6; // Limit products fetched

    /**
     * Initialize Firebase Storage connection
     */
    function init() {
        try {
            console.log('Initializing Bridal Products Loader...');
            console.log('Firebase available:', typeof firebase !== 'undefined');

            if (typeof firebase !== 'undefined') {
                console.log('Firebase object:', firebase);
                console.log('Firebase apps:', firebase.apps);

                storage = firebase.storage();
                console.log('Storage instance:', storage);

                isInitialized = true;
                console.log('Bridal Products Loader initialized successfully');
                return true;
            } else {
                console.error('Firebase not available - make sure Firebase scripts are loaded');
                return false;
            }
        } catch (error) {
            console.error('Error initializing Bridal Products Loader:', error);
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
        console.log('Clearing bridal products cache...');
        cachedProducts = null;
        lastFetchTime = 0;
        try {
            localStorage.removeItem('featuredCollectionProducts');
            localStorage.removeItem('featuredCollectionProductsTime');
            localStorage.removeItem('featuredCollectionProductsETag');
        } catch (e) {
            console.warn('Error clearing localStorage cache:', e);
        }
    }

    /**
     * Load bridal products EXCLUSIVELY from Firebase Cloud Storage
     */
    async function loadBridalProducts(forceRefresh = false) {
        if (!isInitialized) {
            console.error('Bridal Products Loader not initialized - Firebase connection failed');
            return [];
        }

        // Check if admin panel has invalidated cache by setting lastProductUpdate
        const lastProductUpdate = localStorage.getItem('lastProductUpdate');
        let cacheInvalidated = false;

        if (lastProductUpdate) {
            const updateTime = parseInt(lastProductUpdate);
            const cacheTime = parseInt(localStorage.getItem('featuredCollectionProductsTime') || '0');

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
            console.log('Using memory cached bridal products');
            return cachedProducts;
        }

        // Check localStorage cache with ETag validation
        if (!forceRefresh && !cacheInvalidated) {
            try {
                const stored = localStorage.getItem('featuredCollectionProducts');
                const storedTime = localStorage.getItem('featuredCollectionProductsTime');
                const storedETag = localStorage.getItem('featuredCollectionProductsETag');

                if (stored && storedTime && (now - parseInt(storedTime)) < SHORT_CACHE_DURATION) {
                    console.log('Using localStorage cached bridal products (ETag:', storedETag?.substring(0, 8) + ')');
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
            console.log('Loading bridal products from Cloud Storage...');

            let response;

            // Use Netlify function for proper CDN caching (works on both deployed and development)
            if (true) { // Always use Netlify function for CDN optimization
                console.log('Deployed site detected - using Netlify function endpoint');

                // Use Netlify function endpoint for proper cache control
                // ALWAYS add cache busting timestamp to ensure fresh products
                const cacheBustTimestamp = Date.now();
                let netlifyEndpoint = `/.netlify/functions/load-products?category=featured-collection&cacheBust=${cacheBustTimestamp}`;

                // Add cache busting parameter if force refresh or cache invalidated
                if (forceRefresh || cacheInvalidated) {
                    console.log('Added cache busting parameter:', cacheBustTimestamp);
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
                const storedETag = localStorage.getItem('featuredCollectionProductsETag');
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
                    const stored = localStorage.getItem('featuredCollectionProducts');
                    if (stored) {
                        try {
                            cachedProducts = JSON.parse(stored);
                            lastFetchTime = now;
                            console.log('Returning cached products from 304:', cachedProducts.length);
                            return cachedProducts;
                        } catch (e) {
                            console.warn('Error parsing cached products, forcing fresh load');
                            return await loadBridalProducts(true); // Force refresh
                        }
                    } else {
                        console.warn('304 received but no cached products available, forcing fresh load');
                        return await loadBridalProducts(true); // Force refresh
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
                    throw new Error(data.message || 'Failed to load bridal products from Netlify function');
                }

                products = data.products || [];
                console.log('Successfully loaded products via Netlify function:', products.length);
            } else {
                // Local development - use server endpoint
                console.log('Local development detected - using server endpoint');

                const apiEndpoint = '/api/load-products/bridal';

                // Prepare headers for cache validation
                const requestHeaders = {
                    'Content-Type': 'application/json'
                };

                // Add ETag for cache validation if we have one
                const storedETag = localStorage.getItem('featuredCollectionProductsETag');
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
                    const stored = localStorage.getItem('featuredCollectionProducts');
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
                    localStorage.setItem('featuredCollectionProductsETag', responseETag);
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
                    console.warn('Skipping invalid bridal product from Storage:', {
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
            window.bridalProducts = products;
            window.featuredCollectionProducts = products;

            try {
                localStorage.setItem('featuredCollectionProducts', JSON.stringify(products));
                localStorage.setItem('featuredCollectionProductsTime', now.toString());
                if (cachedETag) {
                    localStorage.setItem('featuredCollectionProductsETag', cachedETag);
                }
                console.log('Cached', products.length, 'products with ETag:', cachedETag?.substring(0, 8) + '...');

                // Clear the product update flag since we've successfully loaded fresh data
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
            console.error('Error loading bridal products:', error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                stack: error.stack
            });
            return [];
        }
    }

    /**
     * Generate HTML for a product item (horizontal scrolling layout)
     */
    function generateProductHTML(product) {
        const formattedPrice = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0
        }).format(product.price);

        return `
            <div class="product-item" data-product-id="${product.id}" data-product-price="${product.price}" data-product-name="${product.name}" data-product-image="${product.image}">
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
     * REMOVED: Duplicate wishlist event listener setup
     * Root cause: These functions were adding duplicate listeners on top of wishlist-manager.js
     * Bug: Extracted prices from converted DOM textContent instead of data attributes
     * Fix: Let wishlist-manager.js handle ALL button clicks uniformly with 5-level defense
     * LEGACY CODE - DO NOT RESTORE
     */

    /**
     * Update the Bridal Collection section with loaded products
     */
    async function updateProductsGrid(forceRefresh = false) {
        const featuredCollectionContainer = document.getElementById('featuredCollectionProductContainer');

        if (!featuredCollectionContainer) {
            console.warn('Bridal product container not found');
            return;
        }

        try {
            // Load products from Firebase
            const products = await loadBridalProducts(forceRefresh);

            if (products.length > 0) {
                // Firebase products found - show only these
                console.log('Firebase products found, showing only Firebase products');
                const firebaseProductsHTML = products.map(product => generateProductHTML(product)).join('');
                featuredCollectionContainer.innerHTML = firebaseProductsHTML;
                
                // Hide loader after products are loaded
                const loader = document.getElementById('featuredCollectionLoader');
                if (loader) {
                    loader.classList.remove('show');
                }
                
                // CRITICAL: Populate global price cache BEFORE currency conversion
                // This ensures Level 0 price extraction works in wishlist-manager
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
            } else {
                // Hide loader when no products
                const loader = document.getElementById('featuredCollectionLoader');
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

                featuredCollectionContainer.innerHTML = `
                    <div class="no-products-message" style="display: flex; flex-direction: column; align-items: center; text-align: center; padding: 40px 20px; min-width: 100%;">
                        <i class="fas fa-gem" style="font-size: 48px; color: #5a3f2a; margin-bottom: 20px;"></i>
                        <h3 style="color: #5a3f2a; margin-bottom: 10px;">No Products Available</h3>
                        <p style="color: #666;">${messageText}</p>
                    </div>
                `;
            }

            // Reinitialize event listeners for dynamically generated product cards

            // Update OutOfStockHandler with the loaded products
            if (window.OutOfStockHandler && products.length > 0) {
                console.log('Updating OutOfStockHandler with featured collection products:', products.length);
                window.OutOfStockHandler.updateFromProductData(products, 'featured-collection');
            }

            // Dispatch custom event to notify that products have been loaded
            document.dispatchEvent(new CustomEvent('productsLoaded', {
                detail: { 
                    section: 'featured-collection', 
                    count: products.length,
                    products: products
                }
            }));

            // Refresh out-of-stock handler for newly loaded products
            if (window.OutOfStockHandler) {
                setTimeout(() => {
                    console.log('Refreshing OutOfStockHandler for featured collection...');
                    if (window.OutOfStockHandler.forceRefresh) {
                        window.OutOfStockHandler.forceRefresh();
                    } else if (window.OutOfStockHandler.refresh) {
                        window.OutOfStockHandler.refresh();
                    } else {
                        window.OutOfStockHandler.init();
                    }
                }, 1500);
            } else {
                console.warn('OutOfStockHandler not available');
            }
            // Reinitialize any other event listeners if needed
            if (window.reinitializeProductEvents) {
                window.reinitializeProductEvents();
            }

            console.log('Bridal section updated with', products.length, 'products');
        } catch (error) {
            console.error('Error updating bridal section:', error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                stack: error.stack
            });

            // Show detailed error message
            const loadingElements = featuredCollectionContainer.querySelectorAll('.loading-products');
            loadingElements.forEach(el => el.remove());

            const existingErrorMsg = featuredCollectionContainer.querySelector('.loading-error');
            if (!existingErrorMsg) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'loading-error';
                errorDiv.style.cssText = 'color: red; padding: 10px; margin: 10px; border: 1px solid red; background: #ffe6e6; min-width: 100%;';
                errorDiv.innerHTML = `
                    <strong>Error loading bridal products:</strong><br>
                    ${error.message}<br>
                    <small>Check console for details. Showing default collection.</small>
                `;
                featuredCollectionContainer.insertBefore(errorDiv, featuredCollectionContainer.firstChild);
            }
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
     * Setup sort UI for featured collection page
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

            // Reload products to ensure we're sorting the most up-to-date list
            // If cache is still valid, this will return cached data quickly.
            const products = await loadBridalProducts(false); // Use cache if available
            const sortedProducts = sortProducts(products, sortBy);
            displaySortedProducts(sortedProducts);
        });
    }

    /**
     * Display sorted products
     */
    async function displaySortedProducts(products) {
        const productsGrid = document.getElementById('featured-collection-products-grid');

        if (!productsGrid) {
            console.warn('Featured collection products grid not found');
            return;
        }

        if (products.length > 0) {
            const productsHTML = products.map(product => generateProductHTML(product)).join('');
            productsGrid.innerHTML = productsHTML;

            // CRITICAL: Populate global price cache BEFORE currency conversion
            products.forEach(product => {
                if (window.PRODUCT_PRICES_CACHE) {
                    window.PRODUCT_PRICES_CACHE.set(product.id, product.price);
                    console.log('📦 Cached price for', product.id, ':', product.price, 'INR');
                }
            });

            // Setup wishlist event listeners

            // Update wishlist button states
            if (typeof window.WishlistManager !== 'undefined') {
                setTimeout(() => {
                    window.WishlistManager.updateWishlistButtonsState();
                }, 100);
            }
        } else {
            productsGrid.innerHTML = '<p>No products found for this category.</p>';
        }
    }

    /**
     * Clear cached products (useful after adding/editing products)
     */
    function clearCache() {
        console.log('Clearing all bridal products cache...');
        cachedProducts = null;
        lastFetchTime = 0;
        cachedETag = null;
        try {
            localStorage.removeItem('featuredCollectionProducts');
            localStorage.removeItem('featuredCollectionProductsTime');
            localStorage.removeItem('featuredCollectionProductsETag');
            console.log('localStorage cache cleared');
        } catch (e) {
            console.warn('Error clearing localStorage cache:', e);
        }
        console.log('All bridal products cache cleared');
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
                    BridalProductsLoader.updateProductsGrid();
                }
            }
        }, 1000); // Check every second
    }

    // Public API
    return {
        init,
        loadBridalProducts,
        updateProductsGrid,
        setupSortUI,
        watchForCacheInvalidation
    };
})();

// Auto-initialize and load when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (BridalProductsLoader.init()) {
            BridalProductsLoader.updateProductsGrid();
            BridalProductsLoader.setupSortUI();
            BridalProductsLoader.watchForCacheInvalidation();
        }
    }, 1000);
});