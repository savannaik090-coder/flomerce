/**
 * New Arrivals Page Loader
 * Loads all new arrivals products for the dedicated new arrivals page
 * Uses the same product loader but displays all products in a grid layout
 */

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Loading New Arrivals page...');

    const productsGrid = document.getElementById('new-arrivals-products-grid');

    if (!productsGrid) {
        console.error('New arrivals products grid not found - looking for element with ID: new-arrivals-products-grid');
        return;
    }

    console.log('Found products grid element:', productsGrid);

    try {
        // Load products directly from Firebase without depending on external loaders
        const products = await loadNewArrivalsProductsDirect();

        console.log('Raw products received:', products);
        console.log('Products array length:', products ? products.length : 'null/undefined');

        if (products && products.length > 0) {
            console.log(`Loaded ${products.length} new arrivals products for page`);
            displayAllProducts(products);
            setupSortUI(products);
        } else {
            console.log('No new arrivals products found - showing empty state');
            console.log('Products value:', products);
            showEmptyState();
        }
    } catch (error) {
        console.error('Error loading new arrivals products:', error);
        console.error('Error stack:', error.stack);
        showEmptyState();
    }
});

/**
 * Setup sort UI for new arrivals page
 */
function setupSortUI(products) {
    const sortSelect = document.getElementById('sortSelect');
    
    if (!sortSelect) {
        console.log('Sort select not found');
        return;
    }

    sortSelect.addEventListener('change', function() {
        const sortBy = this.value;
        console.log('Sort changed to:', sortBy);
        
        const sortedProducts = sortProducts(products, sortBy);
        displayAllProducts(sortedProducts);
        
        // Convert prices after sorting
        if (typeof window.CurrencyConverter !== 'undefined') {
            window.CurrencyConverter.convertAllPrices();
        }
    });
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
 * Load new arrivals products directly from Firebase (without external dependencies)
 */
async function loadNewArrivalsProductsDirect() {
    try {
        console.log('Loading products directly from Netlify function...');

        const cacheBust = Date.now();
        const endpoint = `/.netlify/functions/load-products?category=new-arrivals&cacheBust=${cacheBust}`;

        console.log('Making request to:', endpoint);

        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });

        if (!response.ok) {
            console.error('Response not OK:', response.status, response.statusText);
            return [];
        }

        const data = await response.json();
        console.log('Response data:', data);

        if (!data.success) {
            console.error('Server returned error:', data.error);
            return data.products || [];
        }

        const products = data.products || [];
        console.log(`Successfully loaded ${products.length} products directly`);

        // Filter and validate products
    const validProducts = products.filter(product => {
        // Check if product has required fields
        if (!product.id || !product.name || !product.price) {
            console.log('Skipping product with missing basic fields:', product);
            return false;
        }

        // Check if product has valid image (either single image or images array)
        const hasValidImage = product.image || 
                             (product.mainImage) || 
                             (product.images && Array.isArray(product.images) && product.images.length > 0);

        if (!hasValidImage) {
            console.log('Skipping product with no valid image:', product);
            return false;
        }

        return true;
    }).map(product => {
        // Normalize product data structure - handle different image formats
        let productImage = product.image;

        if (!productImage && product.mainImage) {
            productImage = product.mainImage;
        } else if (!productImage && product.images && Array.isArray(product.images) && product.images.length > 0) {
            // Find main image or use first image
            const mainImageObj = product.images.find(img => img.isMain);
            productImage = mainImageObj ? mainImageObj.url : product.images[0].url;
        }

        return {
            id: product.id,
            name: product.name,
            price: product.price,
            image: productImage,
            category: product.category,
            stock: product.stock,
            description: product.description
        };
    });

        console.log(`${validProducts.length} valid products after filtering`);
        return validProducts;

    } catch (error) {
        console.error('Error loading products directly:', error);
        return [];
    }
}

/**
 * Display all products in the grid layout
 */
function displayAllProducts(products) {
    const productsGrid = document.getElementById('new-arrivals-products-grid');

    if (!productsGrid) {
        console.error('Products grid not found');
        return;
    }

    // Remove loading state
    productsGrid.classList.remove('loading');

    // Clear existing content
    productsGrid.innerHTML = '';

    // Create product HTML for each product
    products.forEach((product, index) => {
        const productHTML = createProductHTML(product);
        productsGrid.insertAdjacentHTML('beforeend', productHTML);
    });

    // Set up wishlist event listeners for newly added products
    if (typeof WishlistManager !== 'undefined' && WishlistManager.updateWishlistUI) {
        setTimeout(() => {
            WishlistManager.updateWishlistUI();
            console.log(`Set up wishlist listeners for ${products.length} products`);
        }, 100);
    }

    // Convert prices to user's selected currency
    if (typeof window.CurrencyConverter !== 'undefined') {
        window.CurrencyConverter.convertAllPrices();
    }

    console.log(`Displayed ${products.length} products in grid layout`);
}

/**
 * Create HTML for a single product (matching the design from home page)
 */
function createProductHTML(product) {
    // Format price - CRITICAL: Store the original INR price for wishlist extraction
    const originalPrice = parseFloat(product.price) || 0;
    const price = typeof product.price === 'number' ? 
        `₹${product.price.toLocaleString('en-IN')}` : 
        `₹${product.price}`;

    // Use the image URL directly as provided by the backend
    // The backend already processes Firebase Storage URLs and provides CDN-optimized proxy URLs
    let imageUrl = product.image || product.imageUrl || '';

    return `
        <div class="product-item" data-product-id="${product.id}" data-product-price="${originalPrice}" style="background: none;">
            <a href="product-detail.html?id=${product.id}" style="text-decoration: none; color: inherit;">
                <div class="product-image">
                    ${imageUrl ? `<img src="${imageUrl}" alt="${product.name}" loading="lazy">` : ''}
                    <button class="add-to-wishlist" data-product-id="${product.id}" data-product-price="${originalPrice}">
                        <i class="far fa-heart"></i>
                    </button>
                </div>
                <div class="product-details">
                    <h3 class="product-name">${product.name}</h3>
                    <div class="product-pricing">
                        <span class="current-price" data-original-price="${originalPrice}">${price}</span>
                    </div>
                </div>
            </a>
        </div>
    `;
}

/**
 * Show empty state when no products are found
 */
function showEmptyState() {
    const productsGrid = document.getElementById('new-arrivals-products-grid');

    if (!productsGrid) {
        return;
    }

    // Remove loading state
    productsGrid.classList.remove('loading');

    productsGrid.innerHTML = `
        <div class="empty-state">
            <h3>No New Arrivals Yet</h3>
            <p>We're constantly adding new beautiful pieces to our collection. Check back soon!</p>
            <a href="shop.html" class="browse-btn">Browse All Products</a>
        </div>
    `;
}

/**
 * Format Indian Rupee price
 */
function formatPrice(price) {
    if (typeof price === 'number') {
        return `₹${price.toLocaleString('en-IN')}`;
    }
    return `₹${price}`;
}