/**
 * Jewelry Subcategories Products Loader
 * Dynamically loads random products from all jewelry subcategories via Netlify CDN
 */

const JewelrySubcategoriesLoader = (function() {
    let storage;
    let isInitialized = false;
    let cachedProducts = null;
    let lastFetchTime = 0;
    let cachedETag = null;
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours cache for optimal CDN usage
    const SHORT_CACHE_DURATION = 60 * 60 * 1000; // 1 hour for localStorage to reduce bandwidth
    const MAX_PRODUCTS_TO_DISPLAY = 6; // Number of random products to display
    
    // All jewelry subcategories to load from
    const JEWELRY_SUBCATEGORIES = [
        'gold-necklace', 'silver-necklace', 'meenakari-necklace',
        'gold-earrings', 'silver-earrings', 'meenakari-earrings',
        'gold-bangles', 'silver-bangles', 'meenakari-bangles',
        'gold-rings', 'silver-rings', 'meenakari-rings'
    ];

    /**
     * Initialize Firebase Storage connection
     */
    function init() {
        try {
            console.log('Initializing Jewelry Subcategories Loader...');
            console.log('Firebase available:', typeof firebase !== 'undefined');

            if (typeof firebase !== 'undefined') {
                console.log('Firebase object:', firebase);
                console.log('Firebase apps:', firebase.apps);

                storage = firebase.storage();
                console.log('Storage instance:', storage);

                isInitialized = true;
                console.log('Jewelry Subcategories Loader initialized successfully');
                return true;
            } else {
                console.error('Firebase not available - make sure Firebase scripts are loaded');
                return false;
            }
        } catch (error) {
            console.error('Error initializing Jewelry Subcategories Loader:', error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                stack: error.stack
            });
            return false;
        }
    }

    /**
     * Fisher-Yates shuffle algorithm for randomizing products
     */
    function shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * Clear all caches - called when products are updated
     */
    function clearCache() {
        console.log('Clearing jewelry subcategories cache...');
        cachedProducts = null;
        lastFetchTime = 0;
        try {
            localStorage.removeItem('jewelrySubcategoriesProducts');
            localStorage.removeItem('jewelrySubcategoriesProductsTime');
            localStorage.removeItem('jewelrySubcategoriesProductsETag');
        } catch (e) {
            console.warn('Error clearing localStorage cache:', e);
        }
    }

    /**
     * Load random products from all jewelry subcategories via Netlify CDN
     */
    async function loadJewelryProducts(forceRefresh = false) {
        if (!isInitialized) {
            console.error('Jewelry Subcategories Loader not initialized - Firebase connection failed');
            return [];
        }

        const lastProductUpdate = localStorage.getItem('lastProductUpdate');
        let cacheInvalidated = false;

        if (lastProductUpdate) {
            const updateTime = parseInt(lastProductUpdate);
            const cacheTime = parseInt(localStorage.getItem('jewelrySubcategoriesProductsTime') || '0');

            if (updateTime > cacheTime) {
                console.log('🚨 Cache invalidated by admin panel update:', new Date(updateTime));
                cacheInvalidated = true;
                forceRefresh = true;
            }
        }

        // Check memory cache first
        const now = Date.now();

        if (!forceRefresh && !cacheInvalidated && cachedProducts && (now - lastFetchTime) < CACHE_DURATION) {
            console.log('Using memory cached jewelry products');
            const shuffled = shuffleArray(cachedProducts);
            return shuffled.slice(0, MAX_PRODUCTS_TO_DISPLAY);
        }

        // Check localStorage cache with ETag validation
        if (!forceRefresh && !cacheInvalidated) {
            try {
                const stored = localStorage.getItem('jewelrySubcategoriesProducts');
                const storedTime = localStorage.getItem('jewelrySubcategoriesProductsTime');
                const storedETag = localStorage.getItem('jewelrySubcategoriesProductsETag');

                if (stored && storedTime && (now - parseInt(storedTime)) < SHORT_CACHE_DURATION) {
                    console.log('Using localStorage cached jewelry products (ETag:', storedETag?.substring(0, 8) + ')');
                    cachedProducts = JSON.parse(stored);
                    cachedETag = storedETag;
                    lastFetchTime = parseInt(storedTime);
                    const shuffled = shuffleArray(cachedProducts);
                    return shuffled.slice(0, MAX_PRODUCTS_TO_DISPLAY);
                }
            } catch (e) {
                console.warn('Error reading from localStorage cache:', e);
            }
        }

        let products = [];

        try {
            console.log('Loading jewelry products from all subcategories via Netlify CDN...');

            let response;

            if (true) {
                console.log('Using Netlify function endpoint with multiple categories');

                const categoriesParam = JEWELRY_SUBCATEGORIES.join(',');
                let netlifyEndpoint = `/.netlify/functions/load-products?categories=${encodeURIComponent(categoriesParam)}`;

                if (forceRefresh || cacheInvalidated) {
                    const timestamp = Date.now();
                    netlifyEndpoint += `&cacheBust=${timestamp}`;
                    console.log('Added cache busting parameter:', timestamp);
                }

                const netlifyHeaders = {
                    'Content-Type': 'application/json'
                };

                if (forceRefresh || cacheInvalidated) {
                    netlifyHeaders['Cache-Control'] = 'no-cache, no-store, must-revalidate';
                    netlifyHeaders['Pragma'] = 'no-cache';
                    netlifyHeaders['Expires'] = '0';
                }

                const storedETag = localStorage.getItem('jewelrySubcategoriesProductsETag');
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

                if (response.status === 304 && !forceRefresh && !cacheInvalidated) {
                    console.log('304 Not Modified - using cached products');
                    const stored = localStorage.getItem('jewelrySubcategoriesProducts');
                    if (stored) {
                        try {
                            cachedProducts = JSON.parse(stored);
                            lastFetchTime = now;
                            console.log('Returning cached products from 304:', cachedProducts.length);
                            const shuffled = shuffleArray(cachedProducts);
                            return shuffled.slice(0, MAX_PRODUCTS_TO_DISPLAY);
                        } catch (e) {
                            console.warn('Error parsing cached products, forcing fresh load');
                            return await loadJewelryProducts(true);
                        }
                    } else {
                        console.warn('304 received but no cached products available, forcing fresh load');
                        return await loadJewelryProducts(true);
                    }
                }

                if (!response.ok) {
                    throw new Error(`Netlify function error: ${response.status} ${response.statusText}`);
                }

                const newETag = response.headers.get('etag');
                if (newETag) {
                    cachedETag = newETag;
                    console.log('Stored new ETag:', newETag.substring(0, 12) + '...');
                }

                const data = await response.json();
                if (!data.success) {
                    throw new Error(data.message || 'Failed to load jewelry products from Netlify function');
                }

                products = data.products || [];
                console.log('Successfully loaded products via Netlify function:', products.length);
            } else {
                // Local development - use server endpoint
                console.log('Local development detected - using server endpoint');

                const apiEndpoint = '/api/load-products/polki';

                // Prepare headers for cache validation
                const requestHeaders = {
                    'Content-Type': 'application/json'
                };

                // Add ETag for cache validation if we have one
                const storedETag = localStorage.getItem('sareeCollectionProductsETag');
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
                    const stored = localStorage.getItem('sareeCollectionProducts');
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
                    localStorage.setItem('sareeCollectionProductsETag', responseETag);
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

            // Validate and normalize products, remove duplicates by ID
            const productMap = new Map();
            products.forEach(product => {
                if (!product.image && product.mainImage) {
                    product.image = product.mainImage;
                } else if (!product.image && product.images && product.images.length > 0) {
                    product.image = product.images[0].url;
                }

                const isValid = product.id && product.name && product.price && product.image;
                if (isValid && !productMap.has(product.id)) {
                    productMap.set(product.id, product);
                } else if (!isValid) {
                    console.warn('Skipping invalid jewelry product:', {
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        image: product.image
                    });
                }
            });

            const allProducts = Array.from(productMap.values());
            console.log('Loaded', allProducts.length, 'unique products from all subcategories');

            // Cache ALL products for future randomization
            cachedProducts = allProducts;
            lastFetchTime = now;
            
            // Set global variables for compatibility
            window.jewelrySubcategoriesProducts = allProducts;

            try {
                localStorage.setItem('jewelrySubcategoriesProducts', JSON.stringify(allProducts));
                localStorage.setItem('jewelrySubcategoriesProductsTime', now.toString());
                if (cachedETag) {
                    localStorage.setItem('jewelrySubcategoriesProductsETag', cachedETag);
                }
                console.log('Cached', allProducts.length, 'products with ETag:', cachedETag?.substring(0, 8) + '...');

                if (cacheInvalidated) {
                    localStorage.removeItem('lastProductUpdate');
                    console.log('✅ Cleared cache invalidation flag after successful fresh load');
                }

                localStorage.removeItem('lastProductUpdate');
                console.log('✅ Cleared cache invalidation flag to restore CDN caching');
            } catch (e) {
                console.warn('Error saving to localStorage cache:', e);
            }

            // Return randomized subset of products
            const shuffled = shuffleArray(allProducts);
            const selectedProducts = shuffled.slice(0, MAX_PRODUCTS_TO_DISPLAY);
            console.log('Returning', selectedProducts.length, 'randomized products for display');
            return selectedProducts;

        } catch (error) {
            console.error('Error loading jewelry products:', error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                stack: error.stack
            });
            return [];
        }
    }

    /**
     * Generate HTML for a product item
     */
    function generateProductHTML(product) {
        const formattedPrice = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0
        }).format(product.price);

        return `
            <div class="arrival-item polki-card" data-product-id="${product.id}" data-product-price="${product.price}" data-product-name="${product.name}" data-product-image="${product.image}">
                <a href="product-detail.html?id=${product.id}" style="text-decoration: none; color: inherit;">
                    <div class="arrival-image">
                        <img src="${product.image}" alt="${product.name}" loading="lazy">
                        <button class="add-to-wishlist" data-product-id="${product.id}" data-product-name="${product.name}" data-product-price="${product.price}" data-product-image="${product.image}" >
                            <i class="far fa-heart"></i>
                        </button>
                    </div>
                    <div class="arrival-details">
                        <h3 class="arrival-title">${product.name}</h3>
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
     * Update the Jewelry Collection section with loaded products
     */
    async function updateJewelrySection() {
        const jewelryGrid = document.querySelector('.polki-edit .arrivals-grid');

        if (!jewelryGrid) {
            console.warn('Jewelry grid element not found');
            return;
        }

        try {
            const products = await loadJewelryProducts();

            if (products.length > 0) {
                console.log('Jewelry products loaded, displaying', products.length, 'random items');
                
                // Hide loader before replacing innerHTML
                const loader = document.getElementById('jewelryCollectionLoader');
                if (loader) {
                    console.log('🎬 Hiding jewelry loader');
                    loader.style.display = 'none';
                }
                
                const productsHTML = products.map(product => generateProductHTML(product)).join('');
                jewelryGrid.innerHTML = productsHTML;
                
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
                const loader = document.getElementById('jewelryCollectionLoader');
                if (loader) {
                    loader.style.display = 'none';
                }
                
                console.log('No products found in subcategories');

                const isNetlify = window.location.hostname.includes('netlify') || window.location.hostname.includes('.app');
                const messageText = isNetlify
                    ? 'If you recently deployed to Netlify, please ensure Firebase Admin credentials are configured in your Netlify environment variables.'
                    : 'Products will appear here once they are added through the admin panel.';

                jewelryGrid.innerHTML = `
                    <div class="no-products-message" style="grid-column: 1 / -1; text-align: center; padding: 40px 20px;">
                        <i class="fas fa-gem" style="font-size: 48px; color: #5a3f2a; margin-bottom: 20px;"></i>
                        <h3 style="color: #5a3f2a; margin-bottom: 10px;">No Products Available</h3>
                        <p style="color: #666;">${messageText}</p>
                    </div>
                `;
            }


            if (window.reinitializeProductEvents) {
                window.reinitializeProductEvents();
            }

            if (window.OutOfStockHandler && products.length > 0) {
                console.log('Updating OutOfStockHandler with jewelry products:', products.length);
                window.OutOfStockHandler.updateFromProductData(products, 'jewelry-subcategories');
            }

            document.dispatchEvent(new CustomEvent('productsLoaded', {
                detail: { 
                    section: 'jewelry-subcategories', 
                    count: products.length,
                    products: products
                }
            }));

            if (window.OutOfStockHandler) {
                setTimeout(() => {
                    console.log('Refreshing OutOfStockHandler for jewelry collection...');
                    if (window.OutOfStockHandler.forceRefresh) {
                        window.OutOfStockHandler.forceRefresh();
                    } else if (window.OutOfStockHandler.refresh) {
                        window.OutOfStockHandler.refresh();
                    }
                }, 1500);
            }

            console.log('Jewelry section updated with', products.length, 'products');
        } catch (error) {
            console.error('Error updating jewelry section:', error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                stack: error.stack
            });

            const loadingElements = jewelryGrid.querySelectorAll('.loading-products');
            loadingElements.forEach(el => el.remove());

            const existingErrorMsg = jewelryGrid.querySelector('.loading-error');
            if (!existingErrorMsg) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'loading-error';
                errorDiv.style.cssText = 'color: red; padding: 10px; margin: 10px; border: 1px solid red; background: #ffe6e6;';
                errorDiv.innerHTML = `
                    <strong>Error loading jewelry products:</strong><br>
                    ${error.message}<br>
                    <small>Check console for details.</small>
                `;
                jewelryGrid.insertBefore(errorDiv, jewelryGrid.firstChild);
            }
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
                    updateJewelrySection();
                }
            }
        }, 1000); // Check every second
    }

    // Public API
    return {
        init,
        loadJewelryProducts,
        updateJewelrySection,
        clearCache,
        watchForCacheInvalidation
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (JewelrySubcategoriesLoader.init()) {
            JewelrySubcategoriesLoader.loadJewelryProducts(true).then(products => {
                console.log('Initial jewelry load completed with', products.length, 'products');
                JewelrySubcategoriesLoader.updateJewelrySection();
            }).catch(error => {
                console.error('Initial jewelry load failed:', error);
                JewelrySubcategoriesLoader.updateJewelrySection();
            });
            JewelrySubcategoriesLoader.watchForCacheInvalidation();
        }
    }, 1000);
});