
/**
 * Filter and Sort Handler
 * Handles filter and sort functionality for all product pages
 */

const FilterSortHandler = (function() {
    let currentSort = 'featured';
    let currentFilter = 'featured';

    /**
     * Initialize filter and sort UI
     */
    function init() {
        console.log('Initializing Filter and Sort Handler...');

        // Sort dropdown toggle
        const sortOption = document.getElementById('sortOption');
        const sortDropdown = document.getElementById('sortDropdown');

        if (sortOption && sortDropdown) {
            sortOption.addEventListener('click', function(e) {
                e.stopPropagation();
                
                if (sortDropdown.classList.contains('active')) {
                    // Closing - add closing class for animation
                    sortDropdown.classList.add('closing');
                    sortOption.classList.remove('active');
                    
                    setTimeout(() => {
                        sortDropdown.classList.remove('active', 'closing');
                    }, 300); // Match animation duration
                } else {
                    // Opening - remove closing class if present
                    sortDropdown.classList.remove('closing');
                    sortDropdown.classList.add('active');
                    sortOption.classList.add('active');
                }
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', function(e) {
                if (!sortOption.contains(e.target) && !sortDropdown.contains(e.target)) {
                    if (sortDropdown.classList.contains('active')) {
                        sortDropdown.classList.add('closing');
                        sortOption.classList.remove('active');
                        
                        setTimeout(() => {
                            sortDropdown.classList.remove('active', 'closing');
                        }, 300);
                    }
                }
            });

            // Prevent dropdown from closing when clicking inside it
            sortDropdown.addEventListener('click', function(e) {
                e.stopPropagation();
            });

            // Sort option clicks
            const sortOptions = sortDropdown.querySelectorAll('.sort-dropdown-option');
            sortOptions.forEach(option => {
                option.addEventListener('click', function(e) {
                    e.stopPropagation();
                    
                    // Remove active class from all options
                    sortOptions.forEach(opt => opt.classList.remove('active'));
                    
                    // Add active class to clicked option
                    this.classList.add('active');
                    
                    // Get sort value
                    currentSort = this.dataset.sort;
                    
                    // Close dropdown with animation
                    if (sortDropdown.classList.contains('active')) {
                        sortDropdown.classList.add('closing');
                        sortOption.classList.remove('active');
                        
                        setTimeout(() => {
                            sortDropdown.classList.remove('active', 'closing');
                        }, 300);
                    }
                    
                    // Apply sort
                    applySort(currentSort);
                });
            });
        }

        // Filter modal
        const filterOption = document.getElementById('filterOption');
        const filterModal = document.getElementById('filterModal');
        const closeFilterModal = document.getElementById('closeFilterModal');
        const applyFilterBtn = document.getElementById('applyFilterBtn');
        const clearFilterBtn = document.getElementById('clearFilterBtn');

        if (filterOption && filterModal) {
            filterOption.addEventListener('click', function() {
                filterModal.classList.add('active');
            });
        }

        if (closeFilterModal && filterModal) {
            closeFilterModal.addEventListener('click', function() {
                if (filterModal.classList.contains('active')) {
                    filterModal.classList.add('closing');
                    
                    setTimeout(() => {
                        filterModal.classList.remove('active', 'closing');
                    }, 300); // Match animation duration
                }
            });
        }

        if (filterModal) {
            // Close when clicking on the overlay (background)
            filterModal.addEventListener('click', function(e) {
                if (e.target === filterModal || e.target.classList.contains('filter-modal')) {
                    if (filterModal.classList.contains('active')) {
                        filterModal.classList.add('closing');
                        
                        setTimeout(() => {
                            filterModal.classList.remove('active', 'closing');
                        }, 300);
                    }
                }
            });

            // Prevent modal content clicks from closing the modal
            const filterModalContent = filterModal.querySelector('.filter-modal-content');
            if (filterModalContent) {
                filterModalContent.addEventListener('click', function(e) {
                    e.stopPropagation();
                });
            }

            // Close filter modal when clicking outside (on document)
            document.addEventListener('click', function(e) {
                if (filterModal.classList.contains('active')) {
                    // Check if click is outside both the filter button and modal content
                    const filterModalContent = filterModal.querySelector('.filter-modal-content');
                    const isClickInsideModalContent = filterModalContent && filterModalContent.contains(e.target);
                    const isClickOnFilterButton = filterOption && filterOption.contains(e.target);
                    
                    if (!isClickInsideModalContent && !isClickOnFilterButton) {
                        filterModal.classList.add('closing');
                        
                        setTimeout(() => {
                            filterModal.classList.remove('active', 'closing');
                        }, 300);
                    }
                }
            });
        }

        if (applyFilterBtn) {
            applyFilterBtn.addEventListener('click', function() {
                const selectedFilter = document.querySelector('input[name="filter-sort"]:checked');
                if (selectedFilter) {
                    currentFilter = selectedFilter.value;
                    applySort(currentFilter);
                }
                if (filterModal && filterModal.classList.contains('active')) {
                    filterModal.classList.add('closing');
                    
                    setTimeout(() => {
                        filterModal.classList.remove('active', 'closing');
                    }, 300);
                }
            });
        }

        if (clearFilterBtn) {
            clearFilterBtn.addEventListener('click', function() {
                const featuredOption = document.querySelector('input[name="filter-sort"][value="featured"]');
                if (featuredOption) {
                    featuredOption.checked = true;
                }
                currentFilter = 'featured';
                applySort('featured');
                if (filterModal && filterModal.classList.contains('active')) {
                    filterModal.classList.add('closing');
                    
                    setTimeout(() => {
                        filterModal.classList.remove('active', 'closing');
                    }, 300);
                }
            });
        }

        console.log('Filter and Sort Handler initialized');
    }

    /**
     * Apply sort to products (only for price sorting from dropdown)
     */
    async function applySort(sortBy) {
        console.log('Applying sort:', sortBy);

        // Determine which loader to use based on page
        const pageName = window.location.pathname.split('/').pop().replace('.html', '');
        
        let products = [];
        
        // Get products from appropriate loader
        if (pageName === 'all-collection') {
            if (typeof AllCollectionLoader !== 'undefined') {
                products = await AllCollectionLoader.loadAllProducts();
            }
        } else if (pageName === 'featured-collection') {
            if (typeof FeaturedCollectionLoader !== 'undefined') {
                products = await FeaturedCollectionLoader.loadFeaturedProducts();
            }
        } else if (pageName === 'new-arrivals') {
            if (typeof NewArrivalsPageLoader !== 'undefined') {
                products = await NewArrivalsPageLoader.loadNewArrivalsProducts();
            }
        } else {
            // Subcategory pages
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
            if (category && typeof SubcategoryProductsLoader !== 'undefined') {
                products = await SubcategoryProductsLoader.loadSubcategoryProducts(category);
            }
        }

        if (products.length === 0) {
            console.warn('No products to sort');
            return;
        }

        // Sort products (only price sorting, featured/newest handled by filter modal)
        const sortedProducts = sortProducts(products, sortBy);
        
        // Display sorted products
        displayProducts(sortedProducts);
    }

    /**
     * Sort products by criteria
     */
    function sortProducts(products, sortBy) {
        const productsCopy = [...products];

        switch (sortBy) {
            case 'price-low-high':
                return productsCopy.sort((a, b) => {
                    const priceA = parseFloat(a.price) || 0;
                    const priceB = parseFloat(b.price) || 0;
                    return priceA - priceB;
                });

            case 'price-high-low':
                return productsCopy.sort((a, b) => {
                    const priceA = parseFloat(a.price) || 0;
                    const priceB = parseFloat(b.price) || 0;
                    return priceB - priceA;
                });

            case 'newest':
                return productsCopy.sort((a, b) => {
                    // Use uploadedAt timestamp if available, otherwise use createdAt or id
                    const dateA = a.uploadedAt || a.createdAt || a.timestamp || 0;
                    const dateB = b.uploadedAt || b.createdAt || b.timestamp || 0;
                    return dateB - dateA; // Newest first
                });

            case 'featured':
            default:
                // Return original order (featured)
                return productsCopy;
        }
    }

    /**
     * Display sorted products
     */
    function displayProducts(products) {
        // Find the products grid
        const grids = [
            'all-collection-products-grid',
            'featured-collection-products-grid',
            'new-arrivals-products-grid',
            'gold-necklace-products-grid',
            'products-grid'
        ];

        let productsGrid = null;
        for (const gridId of grids) {
            productsGrid = document.getElementById(gridId);
            if (productsGrid) break;
        }

        if (!productsGrid) {
            productsGrid = document.querySelector('.products-grid');
        }

        if (!productsGrid) {
            console.warn('Products grid not found');
            return;
        }

        if (products.length === 0) {
            productsGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 40px;">No products found</p>';
            return;
        }

        // Generate product HTML
        const productsHTML = products.map(product => generateProductHTML(product)).join('');
        productsGrid.innerHTML = productsHTML;

        // CRITICAL: Populate global price cache BEFORE currency conversion
        // This ensures Level 0 price extraction works in wishlist-manager
        products.forEach(product => {
            if (window.PRODUCT_PRICES_CACHE) {
                window.PRODUCT_PRICES_CACHE.set(product.id, product.price);
                console.log('📦 Cached price for', product.id, ':', product.price, 'INR');
            }
        });

        // Reinitialize wishlist listeners
        if (typeof window.WishlistManager !== 'undefined') {
            setTimeout(() => {
                window.WishlistManager.updateWishlistButtonsState();
            }, 100);
        }
    }

    /**
     * Generate product HTML
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

    // Public API
    return {
        init,
        applySort
    };
})();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    FilterSortHandler.init();
});
