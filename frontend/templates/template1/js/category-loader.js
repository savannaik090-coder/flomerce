/**
 * Dynamic Category Loader
 * Loads category info and products from API based on URL slug
 * Works for any category - no hardcoded category names
 */

const CategoryLoader = (function() {
    let categorySlug = null;
    let categoryData = null;
    let products = [];
    let isLoading = false;

    /**
     * Initialize the category loader
     */
    function init() {
        console.log('Initializing Category Loader...');
        
        // Get category slug from URL
        categorySlug = getCategorySlugFromURL();
        
        if (!categorySlug) {
            showError('No category specified');
            return false;
        }

        console.log('Loading category:', categorySlug);
        
        // Load category data and products
        loadCategory();
        
        return true;
    }

    /**
     * Extract category slug from URL
     * Supports: /category/gold-necklace, /gold-necklace, ?category=gold-necklace
     */
    function getCategorySlugFromURL() {
        const url = new URL(window.location.href);
        const path = url.pathname;
        
        // Check for /category/slug format
        const categoryMatch = path.match(/\/category\/([a-z0-9-]+)/i);
        if (categoryMatch) {
            return categoryMatch[1].toLowerCase();
        }
        
        // Check for query parameter
        const querySlug = url.searchParams.get('category') || url.searchParams.get('slug');
        if (querySlug) {
            return querySlug.toLowerCase();
        }
        
        // Check for direct /slug format (e.g., /gold-necklace)
        const directMatch = path.match(/\/([a-z0-9-]+)\.html$/i);
        if (directMatch) {
            return directMatch[1].toLowerCase();
        }
        
        // Check for /slug without .html
        const pathParts = path.split('/').filter(Boolean);
        if (pathParts.length === 1 && pathParts[0] !== 'category') {
            return pathParts[0].toLowerCase();
        }
        
        return null;
    }

    /**
     * Load category data from API
     */
    async function loadCategory() {
        if (isLoading) return;
        isLoading = true;

        try {
            // Get subdomain for multi-tenant support
            const subdomain = getSubdomain();
            
            // Fetch category info
            const categoryResponse = await fetch(`/api/categories?slug=${categorySlug}&subdomain=${subdomain}`);
            
            if (!categoryResponse.ok) {
                throw new Error('Category not found');
            }
            
            const categoryResult = await categoryResponse.json();
            categoryData = categoryResult.data?.[0] || categoryResult.data || categoryResult;
            
            if (!categoryData || !categoryData.id) {
                throw new Error('Category not found');
            }

            // Update page with category info
            updatePageMeta();
            
            // Load products for this category
            await loadProducts();
            
        } catch (error) {
            console.error('Error loading category:', error);
            showError(error.message || 'Failed to load category');
        } finally {
            isLoading = false;
        }
    }

    /**
     * Get subdomain from current URL
     */
    function getSubdomain() {
        const hostname = window.location.hostname;
        const parts = hostname.split('.');
        
        // For localhost or IP, return default
        if (parts.length <= 2 || hostname === 'localhost') {
            return 'demo';
        }
        
        return parts[0];
    }

    /**
     * Update page metadata with category info
     */
    function updatePageMeta() {
        if (!categoryData) return;

        const categoryName = categoryData.name || formatSlugToTitle(categorySlug);
        const brandName = categoryData.brand_name || 'Shop';
        const description = categoryData.description || `Explore our ${categoryName} collection`;

        // Update title
        document.title = `${categoryName} - ${brandName}`;
        document.getElementById('page-title')?.setAttribute('content', document.title);
        
        // Update meta description
        const metaDesc = document.getElementById('page-description');
        if (metaDesc) metaDesc.setAttribute('content', description);

        // Update hero section
        const heroTitle = document.getElementById('category-title');
        const heroSubtitle = document.getElementById('category-subtitle');
        
        if (heroTitle) heroTitle.textContent = categoryName;
        if (heroSubtitle) heroSubtitle.textContent = description;

        // Update loader text
        const loaderText = document.getElementById('loader-text');
        if (loaderText) loaderText.textContent = `Loading ${categoryName}...`;

        // Update Open Graph tags
        document.getElementById('og-title')?.setAttribute('content', `${categoryName} - ${brandName}`);
        document.getElementById('og-description')?.setAttribute('content', description);
        
        // Update hero background if category has image
        if (categoryData.image_url) {
            const heroSection = document.getElementById('category-hero');
            if (heroSection) {
                heroSection.style.backgroundImage = `url(${categoryData.image_url})`;
            }
        }

        // Update footer brand
        const footerBrand = document.getElementById('footer-brand-name');
        const footerCopyright = document.getElementById('footer-copyright-brand');
        if (footerBrand) footerBrand.textContent = brandName;
        if (footerCopyright) footerCopyright.textContent = brandName;
    }

    /**
     * Load products for the category
     */
    async function loadProducts() {
        try {
            const subdomain = getSubdomain();
            const response = await fetch(`/api/products?category=${categorySlug}&subdomain=${subdomain}`);
            
            if (!response.ok) {
                throw new Error('Failed to load products');
            }
            
            const result = await response.json();
            products = result.data || result.products || result || [];
            
            // Render products
            renderProducts();
            
        } catch (error) {
            console.error('Error loading products:', error);
            showNoProducts();
        }
    }

    /**
     * Render products to the grid
     */
    function renderProducts() {
        const productsGrid = document.getElementById('products-grid');
        const loader = document.getElementById('category-loader');
        
        // Hide loader
        if (loader) {
            loader.classList.remove('show');
            loader.style.display = 'none';
        }

        if (!productsGrid) {
            console.warn('Products grid not found');
            return;
        }

        if (!products || products.length === 0) {
            showNoProducts();
            return;
        }

        // Generate HTML for products
        const productsHTML = products.map(product => generateProductHTML(product)).join('');
        productsGrid.innerHTML = productsHTML;

        // Convert prices to user's selected currency
        if (typeof window.CurrencyConverter !== 'undefined') {
            window.CurrencyConverter.convertAllPrices();
        }

        // Update wishlist button states
        if (typeof window.WishlistManager !== 'undefined') {
            setTimeout(() => {
                window.WishlistManager.updateWishlistButtonsState();
            }, 100);
        }

        console.log(`Loaded ${products.length} products for ${categorySlug}`);
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

        const imageUrl = product.thumbnail_url || product.image || (product.images ? JSON.parse(product.images)[0] : '') || 'images/placeholder.jpg';

        return `
            <div class="product-item" data-product-id="${product.id}" data-product-price="${product.price}" data-product-name="${product.name}" data-product-image="${imageUrl}">
                <a href="product-detail.html?id=${product.id}" style="text-decoration: none; color: inherit;">
                    <div class="product-image">
                        <img src="${imageUrl}" alt="${product.name}" loading="lazy">
                        <button class="add-to-wishlist" data-product-id="${product.id}" data-product-name="${product.name}" data-product-price="${product.price}" data-product-image="${imageUrl}">
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
     * Show no products message
     */
    function showNoProducts() {
        const productsGrid = document.getElementById('products-grid');
        const loader = document.getElementById('category-loader');
        
        if (loader) {
            loader.classList.remove('show');
            loader.style.display = 'none';
        }

        if (productsGrid) {
            const categoryName = categoryData?.name || formatSlugToTitle(categorySlug);
            productsGrid.innerHTML = `
                <div class="no-products-message" style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; text-align: center; padding: 60px 20px;">
                    <i class="fas fa-box-open" style="font-size: 48px; color: #6D3E25; margin-bottom: 20px;"></i>
                    <h3 style="color: #6D3E25; margin-bottom: 10px;">No Products in ${categoryName}</h3>
                    <p style="color: #666;">Products will appear here once they are added through the admin panel.</p>
                    <a href="/all-collection" style="margin-top: 20px; padding: 10px 20px; background: #6D3E25; color: white; text-decoration: none; border-radius: 4px;">Browse All Products</a>
                </div>
            `;
        }
    }

    /**
     * Show error message
     */
    function showError(message) {
        const productsGrid = document.getElementById('products-grid');
        const loader = document.getElementById('category-loader');
        const heroTitle = document.getElementById('category-title');
        
        if (loader) {
            loader.classList.remove('show');
            loader.style.display = 'none';
        }

        if (heroTitle) {
            heroTitle.textContent = 'Category Not Found';
        }

        document.title = 'Category Not Found';

        if (productsGrid) {
            productsGrid.innerHTML = `
                <div class="error-message" style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; text-align: center; padding: 60px 20px;">
                    <i class="fas fa-exclamation-circle" style="font-size: 48px; color: #dc3545; margin-bottom: 20px;"></i>
                    <h3 style="color: #dc3545; margin-bottom: 10px;">Category Not Found</h3>
                    <p style="color: #666;">${message}</p>
                    <a href="/all-collection" style="margin-top: 20px; padding: 10px 20px; background: #6D3E25; color: white; text-decoration: none; border-radius: 4px;">Browse All Products</a>
                </div>
            `;
        }
    }

    /**
     * Format slug to readable title
     */
    function formatSlugToTitle(slug) {
        if (!slug) return '';
        return slug
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Get current category data
     */
    function getCategoryData() {
        return categoryData;
    }

    /**
     * Get loaded products
     */
    function getProducts() {
        return products;
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Public API
    return {
        init,
        getCategoryData,
        getProducts,
        loadProducts
    };
})();

// Make available globally
window.CategoryLoader = CategoryLoader;
