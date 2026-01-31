
/**
 * Subcategory Products Loader
 * Dynamically loads products from API Cloud Storage for subcategory pages
 * (gold-necklace, silver-earrings, etc.)
 */

const SubcategoryProductsLoader = (function() {
    let storage;
    let isInitialized = false;
    let cachedProducts = {};
    let lastFetchTime = {};
    let cachedETags = {};
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
    const SHORT_CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours for localStorage to reduce bandwidth

    /**
     * Initialize connection
     */
    function init() {
        console.log('Initializing Subcategory Products Loader...');
        isInitialized = true;
        return true;
    }

    /**
     * Load products for a specific subcategory
     */
    async function loadSubcategoryProducts(category, forceRefresh = false) {
        try {
            console.log(`Loading ${category} products from API...`);
            const response = await fetch(`/api/products?category=${category}`);
            if (!response.ok) throw new Error(`Failed to load ${category}`);
            const data = await response.json();
            return data.products || [];
        } catch (error) {
            console.error(`Error loading ${category} products:`, error);
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
            <div class="product-item" data-product-id="${product.id}" data-product-price="${product.price}" data-product-name="${product.name}" data-product-image="${product.image}">
                <a href="product-detail.html?id=${product.id}" style="text-decoration: none; color: inherit;">
                    <div class="product-image">
                        <img src="${product.image}" alt="${product.name}" loading="lazy">
                        <button class="add-to-wishlist" data-product-id="${product.id}" data-product-name="${product.name}" data-product-price="${product.price}" data-product-image="${product.image}" >
                            <i class="far fa-heart"></i>
                        </button>
                    </div>
                    <div class="product-details">
                        <h3 class="product-name">${product.name}</h3>
                        <div class="current-price" data-original-price="${product.price}">${formattedPrice}</div>
                    </div>
                </a>
            </div>
        `;
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
                // Hide loader before showing products - dynamic category ID
                const loaderPage = document.getElementById(`${category}-loader`);
                if (loaderPage) {
                    loaderPage.classList.remove('show');
                    loaderPage.style.display = 'none';
                }
                
                const productsHTML = products.map(product => generateProductHTML(product)).join('');
                productsGrid.innerHTML = productsHTML;

                // Convert prices to user's selected currency
                if (typeof window.CurrencyConverter !== 'undefined') {
                    window.CurrencyConverter.convertAllPrices();
                }

                // Setup wishlist event listeners

                // Update wishlist button states
                if (typeof window.WishlistManager !== 'undefined') {
                    setTimeout(() => {
                        window.WishlistManager.updateWishlistButtonsState();
                    }, 100);
                }
            } else {
                // Hide loader when no products
                const loaderPage = document.getElementById(`${category}-loader`);
                if (loaderPage) {
                    loaderPage.classList.remove('show');
                    loaderPage.style.display = 'none';
                }
                
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
            // Hide loader on error
            const loaderPage = document.getElementById(`${category}-loader`);
            if (loaderPage) {
                loaderPage.classList.remove('show');
                loaderPage.style.display = 'none';
            }
            
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
     * REMOVED: Duplicate wishlist event listener setup
     * Root cause: These functions were adding duplicate listeners on top of wishlist-manager.js
     * Bug: Extracted prices from converted DOM textContent instead of data attributes
     * Fix: Let wishlist-manager.js handle ALL button clicks uniformly with 5-level defense
     * LEGACY CODE - DO NOT RESTORE
     */

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
     * Setup sort UI for subcategory pages
     */
    function setupSortUI(category) {
        const sortSelect = document.getElementById('sortSelect');
        
        if (!sortSelect) {
            console.log('Sort select not found');
            return;
        }

        sortSelect.addEventListener('change', async function() {
            const sortBy = this.value;
            console.log('Sort changed to:', sortBy);
            
            const products = await loadSubcategoryProducts(category);
            const sortedProducts = sortProducts(products, sortBy);
            displaySortedProducts(sortedProducts);
        });
    }

    /**
     * Display sorted products
     */
    function displaySortedProducts(products) {
        const productsGrid = document.getElementById('products-grid') || document.querySelector('.products-grid');
        
        if (!productsGrid) {
            console.warn('Products grid not found');
            return;
        }

        if (products.length > 0) {
            const productsHTML = products.map(product => generateProductHTML(product)).join('');
            productsGrid.innerHTML = productsHTML;

            // Setup wishlist event listeners

            // Update wishlist button states
            if (typeof window.WishlistManager !== 'undefined') {
                setTimeout(() => {
                    window.WishlistManager.updateWishlistButtonsState();
                }, 100);
            }
        }
    }

    /**
     * Auto-detect category from page URL and load products
     */
    function autoLoadForCurrentPage() {
        const pageName = window.location.pathname.split('/').pop().replace('.html', '');
        
        // Map of page names to their API Storage category names
        const categoryMap = {
            'gold-necklace': 'gold-necklace',
            'silver-necklace': 'silver-necklace',
            'meenakari-necklace': 'meenakari-necklace',
            'gold-earrings': 'gold-earrings',
            'silver-earrings': 'silver-earrings',
            'meenakari-earrings': 'meenakari-earrings',
            'gold-bangles': 'gold-bangles',
            'silver-bangles': 'silver-bangles',
            'meenakari-bangles': 'meenakari-bangles',
            'gold-rings': 'gold-rings',
            'silver-rings': 'silver-rings',
            'meenakari-rings': 'meenakari-rings'
        };

        const category = categoryMap[pageName];
        
        if (category) {
            console.log(`Auto-loading products for category: ${category}`);
            updateProductsGrid(category);
            setupSortUI(category);
        } else {
            console.log(`No category mapping found for page: ${pageName}`);
        }
    }

    /**
     * Monitor for cache invalidation flag set by admin panel
     * Uses longer interval to reduce unnecessary checks
     */
    function watchForCacheInvalidation() {
        let lastCheckedUpdate = null;
        
        setInterval(() => {
            const lastProductUpdate = localStorage.getItem('lastProductUpdate');
            if (lastProductUpdate && lastProductUpdate !== lastCheckedUpdate) {
                const updateTime = parseInt(lastProductUpdate);
                const now = Date.now();
                // If flag was set recently (within last 30 seconds) and we haven't processed it
                if (now - updateTime < 30000) {
                    console.log('🔄 Detected cache invalidation, reloading products...');
                    lastCheckedUpdate = lastProductUpdate;
                    SubcategoryProductsLoader.autoLoadForCurrentPage();
                }
            }
        }, 5000); // Check every 5 seconds instead of 1 second
    }

    // Public API
    return {
        init,
        loadSubcategoryProducts,
        updateProductsGrid,
        autoLoadForCurrentPage,
        watchForCacheInvalidation
    };
})();

// Auto-initialize and load when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (SubcategoryProductsLoader.init()) {
            SubcategoryProductsLoader.autoLoadForCurrentPage();
            SubcategoryProductsLoader.watchForCacheInvalidation();
        }
    }, 1000);
});
