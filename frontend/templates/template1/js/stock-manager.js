/**
 * Stock Management System
 * Handles stock updates, validation, and notifications for Auric Jewelry
 */

window.StockManager = (function() {
    'use strict';

    // Stock threshold for low stock alerts
    const LOW_STOCK_THRESHOLD = 3;
    const OUT_OF_STOCK_THRESHOLD = 0;

    /**
     * Update product stock after successful order placement
     * @param {Array} orderItems - Array of order items with id and quantity
     * @returns {Promise<Object>} Result object with success status
     */
    async function updateStockAfterOrder(orderItems) {
        try {
            console.log('Updating stock for order items:', orderItems);
            
            const stockUpdates = [];
            const outOfStockProducts = [];
            const lowStockProducts = [];

            // Process each order item
            for (const item of orderItems) {
                try {
                    const result = await updateProductStock(item.id, item.quantity, item.image, item.name);
                    if (result.success) {
                        stockUpdates.push({
                            productId: item.id,
                            productName: item.name,
                            previousStock: result.previousStock,
                            newStock: result.newStock,
                            quantity: item.quantity
                        });

                        // Check for stock alerts
                        if (result.newStock <= OUT_OF_STOCK_THRESHOLD) {
                            outOfStockProducts.push({
                                id: item.id,
                                name: item.name,
                                stock: result.newStock
                            });
                        } else if (result.newStock <= LOW_STOCK_THRESHOLD) {
                            lowStockProducts.push({
                                id: item.id,
                                name: item.name,
                                stock: result.newStock
                            });
                        }
                    } else {
                        console.error(`Failed to update stock for product ${item.id}:`, result.error);
                    }
                } catch (error) {
                    console.error(`Error updating stock for product ${item.id}:`, error);
                }
            }

            // Send notifications for stock alerts
            if (outOfStockProducts.length > 0) {
                await sendStockAlertNotification('out_of_stock', outOfStockProducts);
            }
            if (lowStockProducts.length > 0) {
                await sendStockAlertNotification('low_stock', lowStockProducts);
            }

            console.log('Stock updates completed:', stockUpdates);
            return {
                success: true,
                updates: stockUpdates,
                outOfStockProducts,
                lowStockProducts
            };

        } catch (error) {
            console.error('Error in updateStockAfterOrder:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Update stock for a single product
     * @param {string} productId - Product ID
     * @param {number} quantity - Quantity to subtract from stock
     * @param {string} productImage - Product image URL from cart (fallback)
     * @param {string} productName - Product name from cart (fallback)
     * @returns {Promise<Object>} Result with success status and stock info
     */
    async function updateProductStock(productId, quantity, productImage = '', productName = '') {
        try {
            // Get all possible categories to search (matching product-detail-loader.js logic)
            const categoriesToSearch = getCategoriesForProduct(productId);
            console.log(`Updating stock for product ${productId}. Searching categories:`, categoriesToSearch);

            let products = [];
            let foundCategory = null;
            let productIndex = -1;

            // Try each category until we find the product
            for (const category of categoriesToSearch) {
                try {
                    const response = await fetch(`/.netlify/functions/load-products?category=${category}&cacheBust=${Date.now()}`);
                    
                    if (!response.ok) {
                        console.log(`Category ${category} not available (${response.status})`);
                        continue;
                    }

                    const data = await response.json();
                    products = data.products || [];

                    // Try to find the product in this category
                    productIndex = products.findIndex(p => p.id === productId);
                    if (productIndex !== -1) {
                        foundCategory = category;
                        console.log(`✅ Found product ${productId} in category: ${category}`);
                        break;
                    }
                } catch (error) {
                    console.log(`Error searching category ${category}:`, error.message);
                    continue;
                }
            }

            if (productIndex === -1) {
                throw new Error(`Product ${productId} not found in any category. Searched: ${categoriesToSearch.join(', ')}`);
            }

            const product = products[productIndex];
            const previousStock = product.stock || 0;
            const newStock = Math.max(0, previousStock - quantity);

            console.log(`Product ${productId}: ${previousStock} -> ${newStock} (reduced by ${quantity}) in category: ${foundCategory}`);

            // Update product stock
            products[productIndex].stock = newStock;
            products[productIndex].updatedAt = new Date().toISOString();

            // Save updated products back to API
            const updateResponse = await fetch('/.netlify/functions/update-product-stock', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    category: foundCategory,
                    products,
                    productId,
                    previousStock,
                    newStock,
                    quantityReduced: quantity,
                    cartProductImage: productImage,
                    cartProductName: productName
                })
            });

            if (!updateResponse.ok) {
                throw new Error(`Failed to update product stock: ${updateResponse.status}`);
            }

            const updateResult = await updateResponse.json();
            if (!updateResult.success) {
                throw new Error(updateResult.error || 'Unknown error updating stock');
            }

            return {
                success: true,
                previousStock,
                newStock,
                quantityReduced: quantity
            };

        } catch (error) {
            console.error(`Error updating stock for product ${productId}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get all possible categories to search for a product (matching product-detail-loader.js)
     * @param {string} productId - Product ID
     * @returns {Array} Array of category names to search, ordered by priority
     */
    function getCategoriesForProduct(productId) {
        // Define all possible categories including subcategories
        const allCategories = [
            'featured-collection',
            'new-arrivals',
            'saree-collection',
            'gold-necklace',
            'silver-necklace',
            'meenakari-necklace',
            'gold-earrings',
            'silver-earrings',
            'meenakari-earrings',
            'gold-bangles',
            'silver-bangles',
            'meenakari-bangles',
            'gold-rings',
            'silver-rings',
            'meenakari-rings'
        ];

        if (!productId) return allCategories;

        console.log('🔍 Determining search categories for product ID:', productId);

        // Check product ID prefix to prioritize search order (ACTUAL prefixes used in API data)
        if (productId.startsWith('FEA-')) {
            console.log('📂 Product is from Featured Collection');
            return ['featured-collection', ...allCategories.filter(c => c !== 'featured-collection')];
        }
        if (productId.startsWith('NEW-')) {
            console.log('📂 Product is from New Arrivals');
            return ['new-arrivals', ...allCategories.filter(c => c !== 'new-arrivals')];
        }
        if (productId.startsWith('SAR-')) {
            console.log('📂 Product is from Saree Collection');
            return ['saree-collection', ...allCategories.filter(c => c !== 'saree-collection')];
        }
        if (productId.startsWith('GOL-')) {
            // Gold products - prioritize gold categories
            console.log('📂 Product is Gold category');
            return ['gold-necklace', 'gold-earrings', 'gold-bangles', 'gold-rings', ...allCategories.filter(c => !c.startsWith('gold'))];
        }
        if (productId.startsWith('SIL-')) {
            // Silver products - prioritize silver categories
            console.log('📂 Product is Silver category');
            return ['silver-necklace', 'silver-earrings', 'silver-bangles', 'silver-rings', ...allCategories.filter(c => !c.startsWith('silver'))];
        }
        if (productId.startsWith('MEE-')) {
            // Meenakari products - prioritize meenakari categories
            console.log('📂 Product is Meenakari category');
            return ['meenakari-necklace', 'meenakari-earrings', 'meenakari-bangles', 'meenakari-rings', ...allCategories.filter(c => !c.startsWith('meenakari'))];
        }

        // If no prefix match, search all categories
        console.log('📂 No prefix match, searching all categories');
        return allCategories;
    }

    /**
     * Send stock alert notification to admin dashboard
     * @param {string} type - Type of alert ('out_of_stock' or 'low_stock')
     * @param {Array} products - Array of affected products
     */
    async function sendStockAlertNotification(type, products) {
        try {
            console.log(`Sending ${type} notification for products:`, products);

            const notification = {
                id: `stock-alert-${Date.now()}`,
                type: type,
                title: type === 'out_of_stock' ? 'Products Out of Stock' : 'Low Stock Alert',
                message: `${products.length} product(s) require attention`,
                products: products,
                timestamp: new Date().toISOString(),
                read: false,
                priority: type === 'out_of_stock' ? 'high' : 'medium'
            };

            // Send notification to admin dashboard
            const response = await fetch('/.netlify/functions/admin-notifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'add',
                    notification: notification
                })
            });

            if (response.ok) {
                console.log(`${type} notification sent successfully`);
            } else {
                console.error(`Failed to send ${type} notification:`, response.status);
            }

        } catch (error) {
            console.error(`Error sending ${type} notification:`, error);
        }
    }

    /**
     * Check if product is available for purchase
     * @param {string} productId - Product ID
     * @param {number} requestedQuantity - Requested quantity
     * @returns {Promise<Object>} Availability status
     */
    async function checkProductAvailability(productId, requestedQuantity) {
        try {
            const categoriesToSearch = getCategoriesForProduct(productId);
            
            // Try each category until we find the product
            for (const category of categoriesToSearch) {
                try {
                    const response = await fetch(`/.netlify/functions/load-products?category=${category}&cacheBust=${Date.now()}`);
                    
                    if (!response.ok) {
                        continue;
                    }

                    const data = await response.json();
                    const products = data.products || [];
                    const product = products.find(p => p.id === productId);

                    if (product) {
                        const currentStock = product.stock || 0;
                        const available = currentStock >= requestedQuantity;

                        return {
                            available,
                            stock: currentStock,
                            requestedQuantity,
                            productName: product.name,
                            category: category
                        };
                    }
                } catch (error) {
                    continue;
                }
            }

            // Product not found in any category
            return {
                available: false,
                error: 'Product not found in any category',
                stock: 0
            };

        } catch (error) {
            console.error(`Error checking availability for product ${productId}:`, error);
            return {
                available: false,
                error: error.message,
                stock: 0
            };
        }
    }

    /**
     * Get out of stock products for admin dashboard
     * @returns {Promise<Array>} Array of out of stock products
     */
    async function getOutOfStockProducts() {
        try {
            const categories = [
                'featured-collection', 
                'new-arrivals', 
                'saree-collection',
                'gold-necklace',
                'silver-necklace',
                'meenakari-necklace',
                'gold-earrings',
                'silver-earrings',
                'meenakari-earrings',
                'gold-bangles',
                'silver-bangles',
                'meenakari-bangles',
                'gold-rings',
                'silver-rings',
                'meenakari-rings'
            ];
            const outOfStockProducts = [];

            for (const category of categories) {
                const response = await fetch(`/.netlify/functions/load-products?category=${category}&cacheBust=${Date.now()}`);
                
                if (response.ok) {
                    const data = await response.json();
                    const products = data.products || [];
                    
                    const categoryOutOfStock = products.filter(product => {
                        const stock = product.stock || 0;
                        return stock <= OUT_OF_STOCK_THRESHOLD;
                    }).map(product => ({
                        ...product,
                        category,
                        stock: product.stock || 0
                    }));

                    outOfStockProducts.push(...categoryOutOfStock);
                }
            }

            console.log('Out of stock products found:', outOfStockProducts.length);
            return outOfStockProducts;

        } catch (error) {
            console.error('Error getting out of stock products:', error);
            return [];
        }
    }

    /**
     * Get low stock products for admin dashboard
     * @returns {Promise<Array>} Array of low stock products
     */
    async function getLowStockProducts() {
        try {
            const categories = [
                'featured-collection', 
                'new-arrivals', 
                'saree-collection',
                'gold-necklace',
                'silver-necklace',
                'meenakari-necklace',
                'gold-earrings',
                'silver-earrings',
                'meenakari-earrings',
                'gold-bangles',
                'silver-bangles',
                'meenakari-bangles',
                'gold-rings',
                'silver-rings',
                'meenakari-rings'
            ];
            const lowStockProducts = [];

            for (const category of categories) {
                const response = await fetch(`/.netlify/functions/load-products?category=${category}&cacheBust=${Date.now()}`);
                
                if (response.ok) {
                    const data = await response.json();
                    const products = data.products || [];
                    
                    const categoryLowStock = products.filter(product => {
                        const stock = product.stock || 0;
                        return stock > 0 && stock <= 3;
                    }).map(product => ({
                        ...product,
                        category,
                        stock: product.stock || 0
                    }));

                    lowStockProducts.push(...categoryLowStock);
                }
            }

            console.log('Low stock products found:', lowStockProducts.length);
            return lowStockProducts;

        } catch (error) {
            console.error('Error getting low stock products:', error);
            return [];
        }
    }

    // Public API
    return {
        updateStockAfterOrder,
        updateProductStock,
        checkProductAvailability,
        getOutOfStockProducts,
        getLowStockProducts,
        sendStockAlertNotification
    };

})();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Stock Manager initialized');
});