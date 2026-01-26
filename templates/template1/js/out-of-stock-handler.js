// Out of Stock Product Handler
class OutOfStockHandler {
    constructor() {
        this.outOfStockProducts = new Set();
        this.lowStockProducts = new Set();
        this.stockData = new Map();
        this.initialized = false;
    }

    // Initialize the handler
    async init() {
        if (this.initialized) return;
        
        try {
            console.log('Initializing Out-of-Stock Handler...');
            this.collectStockDataFromProducts();
            this.applyOutOfStockEffects();
            this.initialized = true;
            console.log('Out-of-Stock Handler initialized successfully');
        } catch (error) {
            console.error('Error initializing Out-of-Stock Handler:', error);
        }
    }

    // Collect stock data from products already loaded on the page
    collectStockDataFromProducts() {
        console.log('Collecting stock data from loaded products...');
        
        // Clear existing data
        this.outOfStockProducts.clear();
        this.lowStockProducts.clear();
        this.stockData.clear();

        // Look for products in global product data if available
        const productSources = [
            { name: 'bridal', products: window.bridalProducts || [] },
            { name: 'featuredCollection', products: window.featuredCollectionProducts || [] },
            { name: 'newArrivals', products: window.newArrivalsProducts || [] },
            { name: 'polki', products: window.polkiProducts || [] },
            { name: 'sareeCollection', products: window.sareeCollectionProducts || [] },
            { name: 'allCollection', products: window.allCollectionProducts || [] }
        ];

        let totalProducts = 0;
        productSources.forEach(source => {
            if (Array.isArray(source.products) && source.products.length > 0) {
                console.log(`Processing ${source.name} products:`, source.products.length);
                source.products.forEach(product => {
                    if (product.id && typeof product.stock !== 'undefined') {
                        this.processProductStock(product.id, product.stock);
                        totalProducts++;
                        console.log(`Added stock data for ${product.id}: ${product.stock}`);
                    }
                });
            }
        });

        // Also check for cached product data in localStorage
        const cacheKeys = [
            'featuredCollectionProducts',
            'newArrivalsProducts', 
            'sareeCollectionProducts',
            'allCollectionProducts'
        ];

        cacheKeys.forEach(key => {
            try {
                const cached = localStorage.getItem(key);
                if (cached) {
                    const products = JSON.parse(cached);
                    if (Array.isArray(products)) {
                        console.log(`Processing cached ${key}:`, products.length);
                        products.forEach(product => {
                            if (product.id && typeof product.stock !== 'undefined') {
                                this.processProductStock(product.id, product.stock);
                                totalProducts++;
                            }
                        });
                    }
                }
            } catch (e) {
                console.warn(`Error reading cached ${key}:`, e);
            }
        });

        // If still no data, extract from DOM elements
        if (totalProducts === 0) {
            console.log('No global or cached product data found, extracting from DOM...');
            this.extractStockFromDOM();
        }

        console.log(`Stock data collected: ${this.outOfStockProducts.size} out of stock, ${this.lowStockProducts.size} low stock`);
    }

    // Extract stock data from DOM elements if global data isn't available
    extractStockFromDOM() {
        // This is a fallback method - in a real scenario, we'd need the stock data
        // For now, we'll check localStorage for any cached stock data
        try {
            const localStock = localStorage.getItem('productStock');
            if (localStock) {
                const stockData = JSON.parse(localStock);
                for (const [productId, stock] of Object.entries(stockData)) {
                    this.processProductStock(productId, stock);
                }
                console.log('Stock data loaded from localStorage');
            } else {
                console.log('No stock data available in localStorage');
            }
        } catch (error) {
            console.error('Error loading stock from localStorage:', error);
        }
    }

    // Process stock data for a single product
    processProductStock(productId, stock) {
        this.stockData.set(productId, stock);
        
        if (stock === 0) {
            this.outOfStockProducts.add(productId);
            console.log(`Product ${productId} is out of stock`);
        } else if (stock <= 5) {
            this.lowStockProducts.add(productId);
            console.log(`Product ${productId} has low stock: ${stock}`);
        }
    }

    // Update stock data from product arrays (called when products are loaded)
    updateFromProductData(products, sectionName) {
        console.log(`Updating stock data from ${sectionName} products:`, products.length);
        
        if (Array.isArray(products)) {
            let processedCount = 0;
            products.forEach(product => {
                console.log(`Processing product:`, {id: product.id, stock: product.stock, name: product.name});
                if (product.id && typeof product.stock !== 'undefined') {
                    this.processProductStock(product.id, product.stock);
                    processedCount++;
                }
            });
            console.log(`Processed ${processedCount} products with stock data from ${sectionName}`);
            
            // Set global variables for all sections
            if (sectionName === 'new-arrivals') {
                window.newArrivalsProducts = products;
            } else if (sectionName === 'featured-collection') {
                window.bridalProducts = products;
                window.featuredCollectionProducts = products;
            } else if (sectionName === 'saree-collection') {
                window.polkiProducts = products;
                window.sareeCollectionProducts = products;
            } else if (sectionName === 'all-collection') {
                window.allCollectionProducts = products;
            }
            
            // Also save to localStorage for persistence
            try {
                localStorage.setItem(`${sectionName.replace('-', '')}ProductsStock`, JSON.stringify(
                    products.map(p => ({ id: p.id, stock: p.stock, name: p.name }))
                ));
            } catch (e) {
                console.warn('Failed to save stock data to localStorage:', e);
            }
        }

        // Apply effects after updating data with a slight delay
        setTimeout(() => {
            this.applyOutOfStockEffects();
        }, 100);
    }

    // Apply out-of-stock effects to all product cards
    applyOutOfStockEffects() {
        // Find all product cards on the page
        const productCards = document.querySelectorAll('[data-product-id]');
        
        productCards.forEach(card => {
            let productId = card.getAttribute('data-product-id');
            
            // If no data-product-id, try to find it in nested elements
            if (!productId) {
                const linkElement = card.querySelector('a[href*="/product-detail"]');
                if (linkElement) {
                    const href = linkElement.getAttribute('href');
                    if (href && href.includes('?')) {
                        const urlParams = new URLSearchParams(href.split('?')[1]);
                        const extractedId = urlParams.get('id');
                        
                        // Set the data-product-id for future reference
                        if (extractedId) {
                            card.setAttribute('data-product-id', extractedId);
                            productId = extractedId;
                            console.log(`Set data-product-id="${extractedId}" on product card`);
                        }
                    }
                }
            }
            
            if (productId) {
                console.log(`Checking product ${productId}:`, {
                    isOutOfStock: this.outOfStockProducts.has(productId),
                    isLowStock: this.lowStockProducts.has(productId),
                    stock: this.stockData.get(productId)
                });
                
                if (this.outOfStockProducts.has(productId)) {
                    console.log(`Applying out-of-stock style to product ${productId}`);
                    this.applyOutOfStockStyle(card, 'out-of-stock');
                } else {
                    // Remove any out-of-stock classes if product is back in stock
                    // Low stock products are treated as normal products (no badges or styling)
                    this.removeOutOfStockStyle(card);
                }
            }
        });

        console.log(`Applied out-of-stock effects to ${productCards.length} product cards`);
    }

    // Apply out-of-stock styling to a specific product card
    applyOutOfStockStyle(productCard, stockType) {
        // Only apply styling for truly out-of-stock products (stock = 0)
        if (stockType !== 'out-of-stock') {
            // For low stock products, don't show any badges or indicators
            return;
        }

        // Find or create stock badge
        let stockBadge = productCard.querySelector('.out-of-stock-badge');
        if (!stockBadge) {
            stockBadge = document.createElement('div');
            stockBadge.className = 'out-of-stock-badge';
            
            // Insert badge into product image container
            let imageContainer = productCard.querySelector('.product-image-container') || 
                                 productCard.querySelector('.product-image') ||
                                 productCard.querySelector('.arrival-image') ||
                                 productCard;
            
            // Fallback: try to find img element's parent
            if (!imageContainer || imageContainer === productCard) {
                const imgElement = productCard.querySelector('img');
                if (imgElement && imgElement.parentElement) {
                    imageContainer = imgElement.parentElement;
                }
            }
            
            if (imageContainer) {
                // Make container relative if it isn't already
                imageContainer.style.position = 'relative';
                imageContainer.appendChild(stockBadge);
            }
        }

        // Add out-of-stock class and disable interactions
        productCard.classList.add('out-of-stock');
        stockBadge.textContent = 'Out of Stock';
        stockBadge.classList.remove('low-stock');
        
        // Apply the same filter as collection pages
       productCard.style.filter = 'grayscale(20%) brightness(0.7) contrast(60%)';
        
        // Also apply filter to product images specifically
        const productImages = productCard.querySelectorAll('.product-image, .arrival-image,img');
        productImages.forEach(img => {
            img.style.filter = 'grayscale(80%) brightness(0.7) contrast(160%)';
        });
        
        // Disable add to cart buttons for out-of-stock products
        const addToCartButtons = productCard.querySelectorAll('.add-to-cart-btn, button[onclick*="addToCart"]');
        addToCartButtons.forEach(button => {
            button.disabled = true;
            button.style.opacity = '0.5';
            button.style.cursor = 'not-allowed';
            button.style.backgroundColor = '#ccc';
            button.style.borderColor = '#ccc';
        });
        
        // Disable product links and add click handler for out-of-stock products
        const productLinks = productCard.querySelectorAll('a[href*="/product-detail"]');
        productLinks.forEach(link => {
            link.style.cursor = 'not-allowed';
            link.style.pointerEvents = 'none';
            
            // Remove href and add click handler
            const originalHref = link.getAttribute('href');
            link.removeAttribute('href');
            link.setAttribute('data-original-href', originalHref);
            
            link.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showOutOfStockMessage(stockType);
                return false;
            });
        });

        // Add click handler to entire product card for out-of-stock products
        productCard.style.cursor = 'not-allowed';
        productCard.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showOutOfStockMessage(stockType);
            return false;
        });

        // Create or update stock indicator for out-of-stock only
        let stockIndicator = productCard.querySelector('.stock-indicator');
        if (!stockIndicator) {
            stockIndicator = document.createElement('div');
            stockIndicator.className = 'stock-indicator';
            
            // Find a good place to insert the stock indicator
            const productInfo = productCard.querySelector('.product-info') || 
                              productCard.querySelector('.product-details') ||
                              productCard;
            
            if (productInfo) {
                productInfo.appendChild(stockIndicator);
            }
        }

        // Update stock indicator for out-of-stock only
        stockIndicator.className = 'stock-indicator out-of-stock';
        stockIndicator.innerHTML = '<i class="fas fa-times-circle"></i> Out of Stock';
    }

    // Remove out-of-stock styling from a product card
    removeOutOfStockStyle(productCard) {
        // Remove both out-of-stock and low-stock classes
        productCard.classList.remove('out-of-stock', 'low-stock');
        
        // Remove stock badge
        const stockBadge = productCard.querySelector('.out-of-stock-badge');
        if (stockBadge) {
            stockBadge.remove();
        }
        
        // Re-enable add to cart buttons
        const addToCartButtons = productCard.querySelectorAll('.add-to-cart-btn, button[onclick*="addToCart"]');
        addToCartButtons.forEach(button => {
            button.disabled = false;
            button.style.opacity = '';
            button.style.cursor = '';
            button.style.backgroundColor = '';
            button.style.borderColor = '';
        });
        
        // Re-enable product links
        const productLinks = productCard.querySelectorAll('a[data-original-href]');
        productLinks.forEach(link => {
            const originalHref = link.getAttribute('data-original-href');
            if (originalHref) {
                link.setAttribute('href', originalHref);
                link.removeAttribute('data-original-href');
            }
            link.style.cursor = '';
            link.style.pointerEvents = '';
        });

        // Remove click handler from product card
        productCard.style.cursor = '';
        
        // Remove the filter styling applied for out-of-stock
        productCard.style.filter = '';
        
        // Remove filter from product images as well
        const productImages = productCard.querySelectorAll('.product-image, .arrival-image, img');
        productImages.forEach(img => {
            img.style.filter = '';
        });
        
        // Remove stock indicator
        const stockIndicator = productCard.querySelector('.stock-indicator');
        if (stockIndicator) {
            stockIndicator.remove();
        }
    }

    // Show out-of-stock message when user clicks on disabled product
    showOutOfStockMessage(stockType) {
        // Only show message for truly out-of-stock products
        if (stockType !== 'out-of-stock') {
            return;
        }

        const message = 'This product is currently out of stock. Please check back later!';

        // Create a temporary notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc2626;
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            font-weight: 600;
            max-width: 300px;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Remove notification after 4 seconds
        setTimeout(() => {
            notification.remove();
        }, 4000);
    }

    // Update stock for a specific product
    async updateProductStock(productId, newStock) {
        try {
            this.stockData.set(productId, newStock);
            
            // Update categories
            this.outOfStockProducts.delete(productId);
            this.lowStockProducts.delete(productId);
            
            if (newStock === 0) {
                this.outOfStockProducts.add(productId);
            } else if (newStock <= 5) {
                this.lowStockProducts.add(productId);
            }
            
            // Update display for this product
            const productCards = document.querySelectorAll(`[data-product-id="${productId}"]`);
            productCards.forEach(card => {
                if (newStock === 0) {
                    this.applyOutOfStockStyle(card, 'out-of-stock');
                } else if (newStock <= 5) {
                    this.applyOutOfStockStyle(card, 'low-stock');
                } else {
                    this.removeOutOfStockStyle(card);
                }
            });

            console.log(`Updated stock display for product ${productId}: ${newStock} units`);

        } catch (error) {
            console.error('Error updating product stock display:', error);
        }
    }

    // Refresh stock status (useful after stock updates)
    async refresh() {
        try {
            console.log('Refreshing Out-of-Stock Handler...');
            this.collectStockDataFromProducts();
            this.applyOutOfStockEffects();
            console.log('Out-of-stock handler refreshed');
        } catch (error) {
            console.error('Error refreshing out-of-stock handler:', error);
        }
    }

    // Force refresh (bypass cache)
    async forceRefresh() {
        try {
            this.initialized = false;
            await this.init();
            console.log('Out-of-stock handler force refreshed');
        } catch (error) {
            console.error('Error force refreshing out-of-stock handler:', error);
        }
    }

    // Check if a product is out of stock
    isOutOfStock(productId) {
        return this.outOfStockProducts.has(productId);
    }

    // Check if a product is low stock
    isLowStock(productId) {
        return this.lowStockProducts.has(productId);
    }

    // Get all out-of-stock product IDs
    getOutOfStockProductIds() {
        return Array.from(this.outOfStockProducts);
    }

    // Get all low-stock product IDs
    getLowStockProductIds() {
        return Array.from(this.lowStockProducts);
    }
}

// Create global instance
window.OutOfStockHandler = new OutOfStockHandler();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Delay initialization to allow products to load first
        setTimeout(() => {
            window.OutOfStockHandler.init();
        }, 3000);
        
        // Also set up periodic refresh to catch late-loading products
        setInterval(() => {
            if (window.OutOfStockHandler.initialized) {
                window.OutOfStockHandler.refresh();
            }
        }, 5000);
    });
} else {
    // Delay initialization to allow products to load first
    setTimeout(() => {
        window.OutOfStockHandler.init();
    }, 3000);
    
    // Also set up periodic refresh to catch late-loading products
    setInterval(() => {
        if (window.OutOfStockHandler.initialized) {
            window.OutOfStockHandler.refresh();
        }
    }, 5000);
}

// Set up observer for dynamically loaded products
function setupProductObserver() {
    // Observer for new product elements being added
    const observer = new MutationObserver((mutations) => {
        let hasNewProducts = false;
        
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if new product cards were added
                        if (node.classList && (node.classList.contains('product-item') || node.classList.contains('arrival-item'))) {
                            hasNewProducts = true;
                        }
                        // Also check if any child elements are product cards
                        if (node.querySelectorAll && node.querySelectorAll('[data-product-id], .product-item, .arrival-item').length > 0) {
                            hasNewProducts = true;
                        }
                    }
                });
            }
        });
        
        if (hasNewProducts) {
            console.log('New products detected, refreshing out-of-stock handler...');
            setTimeout(() => {
                window.OutOfStockHandler.refresh();
            }, 500);
        }
    });
    
    // Observe changes to the entire document body
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('Product observer set up for dynamic content loading');
}

// Set up the observer
setTimeout(setupProductObserver, 1000);

// Listen for custom events when products are loaded
document.addEventListener('productsLoaded', (event) => {
    console.log('Products loaded event detected, updating stock data for:', event.detail.section);
    console.log('Event detail:', event.detail);
    setTimeout(() => {
        if (window.OutOfStockHandler && event.detail.products) {
            console.log('Updating OutOfStockHandler with products from event:', event.detail.products.length);
            window.OutOfStockHandler.updateFromProductData(event.detail.products, event.detail.section);
        } else {
            console.warn('OutOfStockHandler or products not available in event');
        }
    }, 500);
});