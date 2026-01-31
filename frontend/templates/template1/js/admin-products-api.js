/**
 * Admin Products API Service
 * Replaces Firebase Storage with REST API calls for product management
 * Used by products-admin-panel.html and admin-panel.html
 */

const AdminProductsAPI = (function() {
    const API_BASE = '/api/admin/products';
    const UPLOAD_API = '/api/admin/upload';

    /**
     * Get auth token from localStorage
     */
    function getToken() {
        return localStorage.getItem('auth_token') || localStorage.getItem('admin_token');
    }

    /**
     * Get authorization headers
     */
    function getHeaders(includeContentType = true) {
        const headers = {};
        const token = getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        if (includeContentType) {
            headers['Content-Type'] = 'application/json';
        }
        return headers;
    }

    /**
     * Test API connection
     * @returns {Promise<boolean>}
     */
    async function testConnection(retryCount = 0) {
        const maxRetries = 3;
        try {
            console.log(`Testing API connection... (attempt ${retryCount + 1})`);

            const response = await Promise.race([
                fetch(`${API_BASE}/health`, {
                    method: 'GET',
                    headers: getHeaders()
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Connection timeout')), 10000)
                )
            ]);

            if (response.ok) {
                console.log('✅ API connection successful');
                return true;
            }

            throw new Error(`API responded with status ${response.status}`);
        } catch (error) {
            console.error(`❌ API connection failed (attempt ${retryCount + 1}):`, error);

            if (retryCount < maxRetries - 1) {
                console.log(`Retrying in 2 seconds... (${retryCount + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                return testConnection(retryCount + 1);
            }

            return false;
        }
    }

    /**
     * Load products for a category
     * @param {string} category - Category slug
     * @returns {Promise<{success: boolean, products: Array}>}
     */
    async function loadProducts(category) {
        try {
            const cacheBust = Date.now();
            const response = await fetch(
                `${API_BASE}?category=${encodeURIComponent(category)}&cacheBust=${cacheBust}`,
                {
                    method: 'GET',
                    headers: {
                        ...getHeaders(),
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache'
                    },
                    cache: 'no-store'
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to load products');
            }

            return {
                success: true,
                products: data.products || []
            };
        } catch (error) {
            console.error('Error loading products:', error);
            return {
                success: false,
                products: [],
                error: error.message
            };
        }
    }

    /**
     * Upload a single image
     * @param {File} file - Image file to upload
     * @param {string} productId - Product ID for naming
     * @param {number} index - Image index
     * @param {number} total - Total number of images
     * @param {function} onProgress - Progress callback
     * @returns {Promise<string>} - Image URL
     */
    async function uploadImage(file, productId, index = 0, total = 1, onProgress = null) {
        try {
            const formData = new FormData();
            formData.append('image', file);
            formData.append('productId', productId);
            formData.append('index', index.toString());

            const response = await fetch(`${UPLOAD_API}/image`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                },
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to upload image');
            }

            if (onProgress) {
                onProgress(index + 1, total, 100);
            }

            console.log(`Image ${index + 1}/${total} uploaded successfully:`, result.url);
            return result.url;
        } catch (error) {
            console.error(`Upload error for image ${index + 1}:`, error);
            throw error;
        }
    }

    /**
     * Upload multiple images
     * @param {Array<File>} files - Array of image files
     * @param {string} productId - Product ID
     * @param {function} onProgress - Progress callback (current, total, percent)
     * @returns {Promise<Array<string>>} - Array of image URLs
     */
    async function uploadMultipleImages(files, productId, onProgress = null) {
        const urls = [];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const url = await uploadImage(file, productId, i, files.length, onProgress);
                urls.push(url);
            } catch (error) {
                console.error(`Failed to upload image ${i + 1}:`, error);
                throw error;
            }
        }

        return urls;
    }

    /**
     * Save product data (create new product)
     * @param {Object} productData - Product data
     * @param {string} category - Category slug
     * @returns {Promise<{success: boolean}>}
     */
    async function saveProduct(productData, category) {
        try {
            const response = await fetch(API_BASE, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    ...productData,
                    category
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to save product');
            }

            console.log('Product saved successfully:', result);
            
            invalidateCache(category);
            
            return { success: true, product: result.product };
        } catch (error) {
            console.error('Error saving product:', error);
            throw error;
        }
    }

    /**
     * Update existing product
     * @param {Object} productData - Updated product data
     * @param {string} category - Category slug
     * @returns {Promise<{success: boolean}>}
     */
    async function updateProduct(productData, category) {
        try {
            const response = await fetch(`${API_BASE}/${productData.id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({
                    ...productData,
                    category
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to update product');
            }

            console.log('Product updated successfully:', result);
            
            invalidateCache(category);
            
            return { success: true, product: result.product };
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    }

    /**
     * Delete a product
     * @param {string} productId - Product ID
     * @param {string} category - Category slug
     * @returns {Promise<{success: boolean}>}
     */
    async function deleteProduct(productId, category) {
        try {
            const response = await fetch(`${API_BASE}/${productId}?category=${encodeURIComponent(category)}`, {
                method: 'DELETE',
                headers: getHeaders()
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to delete product');
            }

            console.log('Product deleted successfully');
            
            invalidateCache(category);
            
            return { success: true };
        } catch (error) {
            console.error('Error deleting product:', error);
            throw error;
        }
    }

    /**
     * Update product stock
     * @param {string} productId - Product ID
     * @param {number} stock - New stock value
     * @param {string} category - Category slug
     * @returns {Promise<{success: boolean}>}
     */
    async function updateStock(productId, stock, category) {
        try {
            const response = await fetch(`${API_BASE}/${productId}/stock`, {
                method: 'PATCH',
                headers: getHeaders(),
                body: JSON.stringify({ stock, category })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to update stock');
            }

            invalidateCache(category);
            
            return { success: true };
        } catch (error) {
            console.error('Error updating stock:', error);
            throw error;
        }
    }

    /**
     * Update product price
     * @param {string} productId - Product ID
     * @param {number} price - New price value
     * @param {string} category - Category slug
     * @returns {Promise<{success: boolean}>}
     */
    async function updatePrice(productId, price, category) {
        try {
            const response = await fetch(`${API_BASE}/${productId}/price`, {
                method: 'PATCH',
                headers: getHeaders(),
                body: JSON.stringify({ price, category })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to update price');
            }

            invalidateCache(category);
            
            return { success: true };
        } catch (error) {
            console.error('Error updating price:', error);
            throw error;
        }
    }

    /**
     * Invalidate local cache for a category
     * @param {string} category - Category slug
     */
    function invalidateCache(category) {
        try {
            const cacheKeys = [
                `${category.replace(/-/g, '')}Products`,
                `${category.replace(/-/g, '')}ProductsTime`,
                `${category.replace(/-/g, '')}ProductsETag`
            ];
            cacheKeys.forEach(key => localStorage.removeItem(key));
            localStorage.setItem('lastProductUpdate', Date.now().toString());
            console.log(`✅ Invalidated cache for ${category} category`);
        } catch (e) {
            console.warn('Could not clear cache:', e);
        }
    }

    /**
     * Generate unique product ID
     * @param {string} category - Category slug
     * @param {string} name - Product name
     * @param {number} price - Product price
     * @returns {string} - Unique product ID
     */
    function generateProductId(category, name, price) {
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 10);
        const randomNum = Math.random().toString().substring(2, 8);
        const prefix = category.toUpperCase().substring(0, 3);
        return `${prefix}-${timestamp}-${randomStr}-${randomNum}`;
    }

    /**
     * Trigger notification for product events
     * @param {string} type - Notification type (back-in-stock, low-stock, price-drop, new-product)
     * @param {Object} data - Notification data
     */
    async function triggerNotification(type, data) {
        try {
            const response = await fetch(`/api/admin/notifications/${type}`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });

            const result = await response.json();
            console.log(`✅ ${type} notification triggered:`, result);
            return result;
        } catch (error) {
            console.error(`⚠️ Error triggering ${type} notification:`, error);
            return null;
        }
    }

    return {
        testConnection,
        loadProducts,
        uploadImage,
        uploadMultipleImages,
        saveProduct,
        updateProduct,
        deleteProduct,
        updateStock,
        updatePrice,
        invalidateCache,
        generateProductId,
        triggerNotification,
        getToken,
        API_BASE
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminProductsAPI;
}
