/**
 * Featured Collection Products Loader
 * Loads products from API for the Featured Collection section
 */

const BridalProductsLoader = (function() {
    let isInitialized = false;
    let cachedProducts = null;
    let lastFetchTime = 0;
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
    const MAX_PRODUCTS_TO_FETCH = 6;

    function init() {
        console.log('Initializing Featured Collection Products Loader...');
        isInitialized = true;
        console.log('Featured Collection Products Loader initialized successfully');
        return true;
    }

    function clearCache() {
        console.log('Clearing featured collection products cache...');
        cachedProducts = null;
        lastFetchTime = 0;
        try {
            localStorage.removeItem('featuredCollectionProducts');
            localStorage.removeItem('featuredCollectionProductsTime');
        } catch (e) {
            console.warn('Error clearing localStorage cache:', e);
        }
    }

    async function loadBridalProducts(forceRefresh = false) {
        const now = Date.now();

        if (!forceRefresh && cachedProducts && (now - lastFetchTime) < CACHE_DURATION) {
            console.log('Using cached featured collection products');
            return cachedProducts;
        }

        try {
            const siteId = window.siteData?.id || document.body.dataset.siteId;
            if (!siteId) {
                console.warn('No site ID available, cannot load products');
                return [];
            }

            const apiUrl = `/api/products?site_id=${siteId}&featured=true&limit=${MAX_PRODUCTS_TO_FETCH}`;
            console.log('Fetching featured products from API:', apiUrl);

            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            const products = data.products || data || [];

            cachedProducts = products.slice(0, MAX_PRODUCTS_TO_FETCH);
            lastFetchTime = now;

            console.log(`Loaded ${cachedProducts.length} featured products from API`);
            return cachedProducts;

        } catch (error) {
            console.error('Error loading featured products from API:', error);

            try {
                const stored = localStorage.getItem('featuredCollectionProducts');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    console.log('Using localStorage cached products as fallback');
                    return parsed;
                }
            } catch (e) {
                console.warn('Error reading localStorage cache:', e);
            }

            return [];
        }
    }

    function generateProductHTML(product) {
        const images = product.images ? (typeof product.images === 'string' ? JSON.parse(product.images) : product.images) : [];
        const primaryImage = images[0] || product.image_url || '/images/placeholder.jpg';
        const hoverImage = images[1] || primaryImage;
        const price = parseFloat(product.price) || 0;
        const comparePrice = parseFloat(product.compare_at_price) || 0;
        const discount = comparePrice > price ? Math.round((1 - price / comparePrice) * 100) : 0;

        return `
            <div class="product-item" data-product-id="${product.id}" data-category="${product.category_slug || ''}">
                <a href="/product/${product.slug}" class="product-link">
                    <div class="product-image-wrapper">
                        <img src="${primaryImage}" alt="${product.name}" class="product-image primary" loading="lazy">
                        <img src="${hoverImage}" alt="${product.name}" class="product-image hover" loading="lazy">
                        ${discount > 0 ? `<span class="discount-badge">-${discount}%</span>` : ''}
                        <div class="product-actions">
                            <button class="action-btn wishlist-btn" onclick="event.preventDefault(); WishlistManager.toggleItem(${JSON.stringify(product).replace(/"/g, '&quot;')})" title="Add to Wishlist">
                                <i class="far fa-heart"></i>
                            </button>
                            <button class="action-btn quick-view-btn" onclick="event.preventDefault(); openQuickView(${JSON.stringify(product).replace(/"/g, '&quot;')})" title="Quick View">
                                <i class="far fa-eye"></i>
                            </button>
                        </div>
                    </div>
                    <div class="product-info">
                        <h3 class="product-name">${product.name}</h3>
                        <div class="product-price">
                            ${comparePrice > price ? `<span class="compare-price">₹${comparePrice.toLocaleString('en-IN')}</span>` : ''}
                            <span class="current-price">₹${price.toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </a>
                <button class="add-to-cart-btn" onclick="CartManager.addItem(${JSON.stringify(product).replace(/"/g, '&quot;')})">
                    Add to Cart
                </button>
            </div>
        `;
    }

    async function displayBridalProducts(containerId = 'featuredCollection') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn('Featured collection container not found');
            return;
        }

        const loader = document.getElementById('featuredCollectionLoader');
        if (loader) {
            loader.classList.add('show');
        }

        try {
            const products = await loadBridalProducts();

            if (products && products.length > 0) {
                const productsHTML = products.map(product => generateProductHTML(product)).join('');
                container.innerHTML = productsHTML;

                if (typeof window.PRODUCT_PRICES_CACHE !== 'undefined') {
                    products.forEach(p => {
                        window.PRODUCT_PRICES_CACHE.set(p.id, {
                            price: parseFloat(p.price) || 0,
                            compareAtPrice: parseFloat(p.compare_at_price) || 0
                        });
                    });
                }

                console.log(`Displayed ${products.length} featured collection products`);
            } else {
                container.innerHTML = '<div class="no-products-message">No featured products available</div>';
            }
        } catch (error) {
            console.error('Error displaying featured products:', error);
            container.innerHTML = '<div class="error-message">Failed to load products</div>';
        } finally {
            if (loader) {
                loader.classList.remove('show');
            }
        }
    }

    return {
        init,
        loadBridalProducts,
        displayBridalProducts,
        clearCache,
        generateProductHTML
    };
})();

document.addEventListener('DOMContentLoaded', function() {
    BridalProductsLoader.init();
    BridalProductsLoader.displayBridalProducts();
});
