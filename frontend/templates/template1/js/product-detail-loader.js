/**
 * Product Detail Loader
 * Loads individual product details from API Storage
 */

const ProductDetailLoader = (function() {
    let isInitialized = false;

    /**
     * Initialize the product detail loader
     */
    function init() {
        console.log('Initializing Product Detail Loader...');
        isInitialized = true;
        return true;
    }

    /**
     * Get product ID from URL with comprehensive logging
     */
    function getProductIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');

        console.log('=== PRODUCT DETAIL PAGE LOADING ===');
        console.log('📍 Current URL:', window.location.href);
        console.log('🔍 All URL params:', Array.from(urlParams.entries()));
        console.log('📦 Product ID from URL:', productId);

        if (!productId) {
            console.error('❌ No product ID found in URL');
            console.log('💡 URL should be: product-detail.html?id=YOUR_SKU');
            updatePlaceholders();
            return;
        }

        console.log('✅ Product ID detected:', productId);
        console.log('🔄 Starting product search across all categories...');
        return productId;
    }

    /**
     * Determine all possible categories to search
     */
    function getCategoriesForProduct(productId) {
        // Define all possible categories including subcategories
        const allCategories = [
            'featured-collection',
            'new-arrivals',
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

        // Check product ID prefix to prioritize search order
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
     * Load product data from API
     */
    async function loadProductData(productId) {
        if (!productId) {
            console.error('No product ID provided');
            return null;
        }

        try {
            console.log(`🔍 Fetching product ${productId} from API`);
            const response = await fetch(`/api/products/${productId}`);

            if (!response.ok) {
                console.warn(`⚠️ Failed to load product ${productId}:`, response.status);
                return null;
            }

            const data = await response.json();
            return data.product || data;
        } catch (error) {
            console.error(`Error loading product ${productId}:`, error);
            return null;
        }
    }

    /**
     * Update the product detail page with loaded data
     */
    function updateProductDetailPage(product) {
        if (!product) {
            console.error('No product data to display');
            showErrorState();
            return;
        }

        // Make product data available globally for cart functionality
        window.productDetails = {
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image || product.mainImage || (product.images && product.images[0] ? product.images[0].url : '')
        };
        console.log('Made product details available globally:', window.productDetails);

        // Normalize product data structure for admin panel compatibility
        if (!product.image && product.mainImage) {
            product.image = product.mainImage;
            console.log('Normalized product.image from mainImage:', product.image);
        } else if (!product.image && product.images && product.images.length > 0) {
            product.image = product.images[0].url;
            console.log('Normalized product.image from images array:', product.image);
        }

        console.log('Updating page with product:', product);

        // Update product name
        const nameElements = document.querySelectorAll('.product-title, .product-name, h1');
        nameElements.forEach(element => {
            element.textContent = product.name;
            console.log('Updated product name element');
        });

        // Update product price
        const priceElements = document.querySelectorAll('.product-price, .current-price, .price');
        if (priceElements.length > 0) {
            const formattedPrice = new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                minimumFractionDigits: 0
            }).format(product.price);

            priceElements.forEach(element => {
                element.textContent = formattedPrice;
                console.log('Updated product price element:', formattedPrice);
            });
        }

        // Update product description
        const descriptionSection = document.querySelector('.product-description');
        if (descriptionSection) {
            // Find or create the description paragraph
            let descriptionPara = descriptionSection.querySelector('p');
            if (!descriptionPara) {
                descriptionPara = document.createElement('p');
                descriptionSection.appendChild(descriptionPara);
            }
            descriptionPara.textContent = product.description || 'No description available.';

            // Ensure the heading exists
            let descriptionHeading = descriptionSection.querySelector('h3');
            if (!descriptionHeading) {
                descriptionHeading = document.createElement('h3');
                descriptionHeading.textContent = 'Product Description';
                descriptionSection.insertBefore(descriptionHeading, descriptionPara);
            }
            console.log('Updated product description with heading and content');
        }

        // Update main product image - check multiple possible image properties
        const imageUrl = product.image || product.imageUrl || product.mainImage || (product.images && product.images[0] && product.images[0].url);
        const mainImageElements = document.querySelectorAll('.product-main-image, .main-image img, .product-image img, .gallery-main img');

        if (mainImageElements.length > 0 && imageUrl) {
            mainImageElements.forEach(img => {
                img.src = imageUrl;
                img.alt = product.name;
                img.style.display = 'block';
                console.log('Updated main product image element with URL:', imageUrl);
            });
        } else {
            // Hide image elements when no image is available
            mainImageElements.forEach(img => {
                img.style.display = 'none';
                img.src = '';
                img.alt = '';
            });
            console.log('No image URL found, hiding image elements');
        }

        // Handle multiple images if available - avoid calling gallery update multiple times
        if (product.images && Array.isArray(product.images) && product.images.length > 0) {
            console.log('Product has multiple images:', product.images.length);
            // Check for duplicate images in the array
            const uniqueImages = product.images.filter((image, index, self) => 
                index === self.findIndex(img => img.url === image.url)
            );
            if (uniqueImages.length !== product.images.length) {
                console.log(`Removed ${product.images.length - uniqueImages.length} duplicate images from product data`);
            }
            updateImageGallery(uniqueImages);
        } else if (product.image) {
            // Single image fallback
            console.log('Product has single image, creating gallery');
            updateImageGallery([{
                url: product.image,
                isMain: true,
                alt: product.name
            }]);
        } else if (product.mainImage) {
            // Admin panel single image fallback
            console.log('Product has mainImage, creating gallery');
            updateImageGallery([{
                url: product.mainImage,
                isMain: true,
                alt: product.name
            }]);
        }

        // Update category information
        const categoryElements = document.querySelectorAll('.meta-value');
        if (categoryElements.length > 0) {
            // Find the category meta item (usually the 4th meta item based on the HTML structure)
            const categoryMetaItem = document.querySelector('.meta-item:nth-child(4) .meta-value');
            if (categoryMetaItem) {
                // Determine category from product ID or use the category from search
                let categoryName = 'Unknown';

                if (product.category) {
                    categoryName = product.category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
                } else if (product.id) {
                    // Determine category from product ID prefix
                    if (product.id.startsWith('BRI-')) {
                        categoryName = 'Featured Collection';
                    } else if (product.id.startsWith('NEW-')) {
                        categoryName = 'New Arrivals';
                    } else if (product.id.startsWith('POL-')) {
                        categoryName = 'Saree Collection';
                    } else {
                        // Use the category that was searched to find this product
                        const searchCategories = getCategoriesForProduct(product.id);
                        if (searchCategories.length > 0) {
                            categoryName = searchCategories[0].replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
                        }
                    }
                }

                categoryMetaItem.textContent = categoryName;
                console.log('Updated category to:', categoryName);
            } else {
                console.log('Category meta item not found, searching for all meta values');
                // Fallback: try to find category element by content
                const allMetaValues = document.querySelectorAll('.meta-value');
                allMetaValues.forEach((metaValue, index) => {
                    const parentItem = metaValue.closest('.meta-item');
                    if (parentItem && parentItem.textContent.includes('Category:')) {
                        metaValue.textContent = categoryName;
                        console.log('Updated category via fallback method to:', categoryName);
                    }
                });
            }
        }

        // Update SKU information
        const skuElements = document.querySelectorAll('.meta-item:nth-child(3) .meta-value');
        if (skuElements.length > 0) {
            const skuValue = product.id || 'N/A';
            skuElements[0].textContent = skuValue;
            console.log('Updated SKU to:', skuValue);
        }

        // Update page title
        if (product.name) {
            document.title = `${product.name} - Nazakat Jewellers`;
        }

        // Set the product ID on the detail container for wishlist functionality
        const detailContainer = document.querySelector('.product-detail-container');
        if (detailContainer && product.id) {
            detailContainer.dataset.productId = product.id;
        }

        // Update wishlist button state after page loads
        setTimeout(() => {
            updateWishlistButtonState(product.id);
        }, 500);

        console.log('Product detail page updated successfully');
    }

    /**
     * Update image gallery with multiple images
     */
    function updateImageGallery(images) {
        console.log('Updating image gallery with', images.length, 'images');

        // Find main image element directly and in containers
        const directMainImages = document.querySelectorAll('.product-main-image');
        const mainImageContainers = document.querySelectorAll('.main-image, .gallery-main');

        if (images.length > 0) {
            const mainImage = images.find(img => img.isMain) || images[0];

            // Update direct main image elements
            directMainImages.forEach(img => {
                if (mainImage.url) {
                    img.src = mainImage.url;
                    img.alt = mainImage.alt || 'Product image';
                    img.style.display = 'block';
                    console.log('Updated direct main image element');
                } else {
                    img.style.display = 'none';
                    img.src = '';
                    img.alt = '';
                }
            });

            // Update main images in containers
            mainImageContainers.forEach(container => {
                const mainImg = container.querySelector('img');
                if (mainImg) {
                    if (mainImage.url) {
                        mainImg.src = mainImage.url;
                        mainImg.alt = mainImage.alt || 'Product image';
                        mainImg.style.display = 'block';
                        console.log('Updated main image in container');
                    } else {
                        mainImg.style.display = 'none';
                        mainImg.src = '';
                        mainImg.alt = '';
                    }
                }
            });
        } else {
            // Hide all images when no images are provided
            directMainImages.forEach(img => {
                img.style.display = 'none';
                img.src = '';
                img.alt = '';
            });

            mainImageContainers.forEach(container => {
                const mainImg = container.querySelector('img');
                if (mainImg) {
                    mainImg.style.display = 'none';
                    mainImg.src = '';
                    mainImg.alt = '';
                }
            });
        }

        // Find thumbnail container and handle multiple images
        const thumbnailContainers = document.querySelectorAll('.thumbnail-gallery, .product-thumbnails, .gallery-thumbs');
        console.log('Found thumbnail containers:', thumbnailContainers.length);

        if (thumbnailContainers.length > 0) {
            thumbnailContainers.forEach((container, containerIndex) => {
                // Clear existing thumbnails to prevent duplicates
                container.innerHTML = '';
                console.log(`Cleared thumbnail container ${containerIndex + 1}`);

                // Only show thumbnails if there are multiple images
                if (images.length > 1) {
                    // Remove duplicate images based on URL
                    const uniqueImages = images.filter((image, index, self) => 
                        index === self.findIndex(img => img.url === image.url)
                    );

                    console.log(`Creating ${uniqueImages.length} unique thumbnails out of ${images.length} total images`);

                    uniqueImages.forEach((image, index) => {
                        const thumbnailElement = document.createElement('div');
                        thumbnailElement.className = `thumbnail ${image.isMain ? 'active' : ''}`;
                        thumbnailElement.innerHTML = `
                            ${image.url ? `<img src="${image.url}" alt="${image.alt || `View ${index + 1}`}" loading="lazy">` : ''}
                        `;

                        // Add click handler to change main image
                        thumbnailElement.addEventListener('click', () => {
                            // Update main image - include direct .product-main-image selector
                            const allMainImgs = document.querySelectorAll('.product-main-image, .main-image img, .gallery-main img');
                            allMainImgs.forEach(img => {
                                img.src = image.url;
                                img.alt = image.alt || 'Product image';
                            });

                            // Update active thumbnail
                            document.querySelectorAll('.thumbnail').forEach(thumb => thumb.classList.remove('active'));
                            thumbnailElement.classList.add('active');

                            console.log('Thumbnail clicked, updated main image to:', image.url);
                        });

                        container.appendChild(thumbnailElement);
                    });

                    console.log(`Updated thumbnail gallery in container ${containerIndex + 1} with ${uniqueImages.length} thumbnails`);
                } else {
                    console.log(`Only one image, not showing thumbnails in container ${containerIndex + 1}`);
                }
            });
        } else {
            console.log('No thumbnail containers found');
        }
    }

    /**
     * Update wishlist button state on product detail page
     */
    function updateWishlistButtonState(productId) {
        if (!productId) return;

        const wishlistButton = document.querySelector('.add-to-wishlist-btn');
        if (!wishlistButton) return;

        // Check if WishlistManager is available and if product is in wishlist
        if (typeof window.WishlistManager !== 'undefined') {
            const isInWishlist = window.WishlistManager.isInWishlist(productId);
            console.log('Updating wishlist button state for product', productId, 'isInWishlist:', isInWishlist);

            if (isInWishlist) {
                wishlistButton.innerHTML = '<i class="fas fa-heart"></i> REMOVE FROM WISHLIST';
            } else {
                wishlistButton.innerHTML = '<i class="fas fa-heart"></i> ADD TO WISHLIST';
            }
        }
    }

    /**
     * Update placeholders when no product data is available
     */
    function updatePlaceholders() {
        // Update loading placeholders to show "Not Available"
        const skuElements = document.querySelectorAll('.meta-item:nth-child(3) .meta-value');
        if (skuElements.length > 0) {
            skuElements[0].textContent = 'Not Available';
        }

        const categoryElements = document.querySelectorAll('.meta-item:nth-child(4) .meta-value');
        if (categoryElements.length > 0) {
            categoryElements[0].textContent = 'Not Available';
        }

        console.log('Updated placeholders to show "Not Available"');
    }

    /**
     * Show error state when product cannot be loaded
     */
    function showErrorState() {
        updatePlaceholders();
        const mainContainers = document.querySelectorAll('.product-detail-container, .product-container, main');
        if (mainContainers.length > 0) {
            mainContainers[0].innerHTML = `
                <div class="error-state" style="text-align: center; padding: 50px 20px;">
                    <h2>Product Not Found</h2>
                    <p>Sorry, we couldn't find the product you're looking for.</p>
                    <a href="/" class="btn btn-primary" style="display: inline-block; padding: 10px 20px; background: #5a3f2a; color: white; text-decoration: none; border-radius: 5px;">Return to Homepage</a>
                </div>
            `;
        }
    }

    /**
     * Load and display product details
     */
    async function loadAndDisplayProduct() {
        console.log('Starting product detail loading process...');

        const productId = getProductIdFromURL();
        if (!productId) {
            // Error already logged in getProductIdFromURL
            showErrorState();
            return;
        }

        console.log('Loading product with ID:', productId);

        // Show loading state
        const mainContainers = document.querySelectorAll('.product-detail-container, .product-container, main');
        if (mainContainers.length > 0) {
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'loading-state';
            loadingDiv.style.cssText = 'text-align: center; padding: 50px 20px;';
            loadingDiv.innerHTML = `
                <div class="spinner" style="width: 40px; height: 40px; border: 3px solid #f3f3f3; border-top: 3px solid #5a3f2a; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 15px;"></div>
                <p>Loading product details...</p>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
            mainContainers[0].appendChild(loadingDiv);
        }

        try {
            const product = await loadProductData(productId);

            // Remove loading state
            const loadingState = document.querySelector('.loading-state');
            if (loadingState) {
                loadingState.remove();
            }

            if (product) {
                updateProductDetailPage(product);
            } else {
                showErrorState();
            }
        } catch (error) {
            console.error('Error in loadAndDisplayProduct:', error);

            // Remove loading state
            const loadingState = document.querySelector('.loading-state');
            if (loadingState) {
                loadingState.remove();
            }

            showErrorState();
        }
    }

    // Public API
    return {
        init,
        loadAndDisplayProduct,
        getProductIdFromURL,
        loadProductData
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing Product Detail Loader...');

    if (ProductDetailLoader.init()) {
        ProductDetailLoader.loadAndDisplayProduct();
    }
});