
/**
 * Auric Search UI Manager
 * Handles search overlay UI interactions and animations
 */

const SearchUI = (function() {
    let searchOverlay = null;
    let searchInput = null;
    let searchResultsGrid = null;
    let searchResultsCount = null;
    let searchFilters = null;
    let searchContent = null;
    let searchRecentSection = null;
    let currentCategoryFilter = 'all';
    let searchTimeout = null;

    /**
     * Initialize search UI
     */
    function init() {
        console.log('Initializing Search UI...');
        createSearchOverlay();
        setupEventListeners();
        setupKeyboardShortcuts();
    }

    /**
     * Create search overlay HTML structure
     */
    function createSearchOverlay() {
        // Check if overlay already exists
        let existingOverlay = document.getElementById('searchOverlay');
        if (existingOverlay) {
            console.log('Search overlay already exists, using existing one');
            // Get references to existing elements
            searchOverlay = existingOverlay;
            searchInput = document.getElementById('searchInput');
            searchResultsGrid = document.getElementById('searchResultsGrid');
            searchResultsCount = document.querySelector('.search-results-count');
            searchFilters = document.querySelectorAll('.search-filter-btn');
            searchContent = document.querySelector('.search-content');
            searchRecentSection = document.getElementById('searchRecentSection');
            return;
        }

        // Create overlay HTML
        const overlayHTML = `
            <div id="searchOverlay" class="search-overlay">
                <div class="search-container">
                    <div class="search-header">
                        <div class="search-input-container">
                            <input type="text" id="searchInput" class="search-input" placeholder="Search for products, categories, or styles...">
                            <i class="fas fa-search search-input-icon"></i>
                        </div>
                        <button id="searchCloseBtn" class="search-close-btn">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="search-filters">
                        <button class="search-filter-btn active" data-category="all">All</button>
                        <button class="search-filter-btn" data-category="featured-collection">Featured</button>
                        <button class="search-filter-btn" data-category="new-arrivals">New Arrivals</button>
                        <button class="search-filter-btn" data-category="saree-collection">Sarees</button>
                    </div>
                    
                    <div class="search-content">
                        <div class="search-results-header" style="display: none;">
                            <div class="search-results-count">0 results found</div>
                            <button id="searchClearBtn" class="search-clear-btn">Clear</button>
                        </div>
                        
                        <div id="searchResultsGrid" class="search-results-grid"></div>
                        
                        <div id="searchRecentSection" class="search-recent-section">
                            <div class="search-recent-title">Recent Searches</div>
                            <div id="searchRecentItems" class="search-recent-items"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add to body
        document.body.insertAdjacentHTML('beforeend', overlayHTML);

        // Get references to elements
        searchOverlay = document.getElementById('searchOverlay');
        searchInput = document.getElementById('searchInput');
        searchResultsGrid = document.getElementById('searchResultsGrid');
        searchResultsCount = document.querySelector('.search-results-count');
        searchFilters = document.querySelectorAll('.search-filter-btn');
        searchContent = document.querySelector('.search-content');
        searchRecentSection = document.getElementById('searchRecentSection');

        console.log('Search overlay created successfully');
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Search input with debouncing
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                const query = this.value.trim();
                
                // Clear previous timeout
                if (searchTimeout) {
                    clearTimeout(searchTimeout);
                }
                
                // Debounce search
                searchTimeout = setTimeout(() => {
                    if (query.length >= 2) {
                        performSearch(query);
                    } else {
                        showRecentSearches();
                    }
                }, 300);
            });

            // Clear search on escape
            searchInput.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    closeSearch();
                }
            });
        }

        // Category filters
        searchFilters.forEach(filter => {
            filter.addEventListener('click', function() {
                // Update active filter
                searchFilters.forEach(f => f.classList.remove('active'));
                this.classList.add('active');
                
                currentCategoryFilter = this.dataset.category;
                
                // Re-search with new filter if there's a query
                const query = searchInput.value.trim();
                if (query.length >= 2) {
                    performSearch(query);
                }
            });
        });

        // Close button
        const closeBtn = document.getElementById('searchCloseBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeSearch);
        }

        // Clear button
        const clearBtn = document.getElementById('searchClearBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', function() {
                searchInput.value = '';
                showRecentSearches();
            });
        }

        // Close on overlay click (but not on content click)
        if (searchOverlay) {
            searchOverlay.addEventListener('click', function(e) {
                if (e.target === searchOverlay) {
                    closeSearch();
                }
            });
        }

        // Setup search icon click handler
        setupSearchIconHandler();
    }

    /**
     * Setup search icon click handler
     */
    function setupSearchIconHandler() {
        // Find search icon in navigation - using the correct selector
        const searchIcon = document.querySelector('.search-icon');
        
        if (searchIcon) {
            searchIcon.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Search icon clicked from SearchUI');
                openSearch();
            });
            console.log('Search icon handler attached');
        } else {
            console.warn('Search icon not found in navigation');
            // Try alternative selectors
            const altSearchIcon = document.querySelector('.icon-link.search-icon');
            if (altSearchIcon) {
                altSearchIcon.addEventListener('click', function(e) {
                    e.preventDefault();
                    console.log('Search icon clicked from SearchUI (alternative selector)');
                    openSearch();
                });
                console.log('Search icon handler attached (alternative selector)');
            }
        }
    }

    /**
     * Setup keyboard shortcuts
     */
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', function(e) {
            // Ctrl/Cmd + K to open search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                openSearch();
            }
            
            // Escape to close search
            if (e.key === 'Escape' && searchOverlay && searchOverlay.classList.contains('active')) {
                closeSearch();
            }
        });
    }

    /**
     * Open search overlay
     */
    function openSearch() {
        if (!searchOverlay) return;
        
        console.log('Opening search overlay');
        searchOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Focus search input
        setTimeout(() => {
            if (searchInput) {
                searchInput.focus();
            }
        }, 100);
        
        // Show recent searches if no query
        showRecentSearches();
    }

    /**
     * Close search overlay
     */
    function closeSearch() {
        if (!searchOverlay) return;
        
        console.log('Closing search overlay');
        searchOverlay.classList.remove('active');
        document.body.style.overflow = '';
        
        // Clear search input
        if (searchInput) {
            searchInput.value = '';
        }
    }

    /**
     * Perform search and display results
     */
    async function performSearch(query) {
        console.log(`Performing search for: "${query}"`);
        
        // Show loading state
        showLoading();
        
        // Ensure product data is loaded
        if (SearchManager.isLoading()) {
            await new Promise(resolve => {
                const checkLoading = setInterval(() => {
                    if (!SearchManager.isLoading()) {
                        clearInterval(checkLoading);
                        resolve();
                    }
                }, 100);
            });
        }
        
        // Perform search
        const results = SearchManager.search(query, currentCategoryFilter);
        
        // Display results
        displaySearchResults(results, query);
    }

    /**
     * Display search results
     */
    function displaySearchResults(results, query) {
        if (!searchResultsGrid || !searchResultsCount) return;
        
        console.log(`Displaying ${results.length} search results`);
        
        // Update results count and show header
        searchResultsCount.textContent = `${results.length} result${results.length !== 1 ? 's' : ''} found`;
        document.querySelector('.search-results-header').style.display = 'flex';
        
        // Hide recent searches
        if (searchRecentSection) {
            searchRecentSection.style.display = 'none';
        }
        
        // Clear previous results
        searchResultsGrid.innerHTML = '';
        
        if (results.length === 0) {
            showNoResults(query);
            return;
        }
        
        // Create product items
        results.forEach(product => {
            const productElement = createSearchProductElement(product);
            searchResultsGrid.appendChild(productElement);
        });
    }

    /**
     * Create search product element
     */
    function createSearchProductElement(product) {
        const productDiv = document.createElement('div');
        productDiv.className = 'search-product-item';
        productDiv.dataset.productId = product.id;
        
        // Handle different image property names
        const productImage = product.mainImage || product.image || (product.images && product.images[0]?.url) || '/images/product-placeholder.jpg';
        
        productDiv.innerHTML = `
            <div class="search-product-image">
                <img src="${productImage}" alt="${product.name}" loading="lazy">
                ${product.badge ? `<div class="search-product-badge">${product.badge}</div>` : ''}
            </div>
            <div class="search-product-details">
                <div class="search-product-name">${product.name}</div>
                <div class="search-product-price">₹${parseFloat(product.price).toLocaleString('en-IN')}</div>
                <div class="search-product-category">${formatCategoryName(product.searchCategory)}</div>
            </div>
        `;
        
        // Add click handler to navigate to product detail
        productDiv.addEventListener('click', () => {
            window.location.href = `product-detail.html?id=${product.id}`;
        });
        
        return productDiv;
    }

    /**
     * Format category name for display
     */
    function formatCategoryName(category) {
        switch (category) {
            case 'featured-collection':
                return 'Featured';
            case 'new-arrivals':
                return 'New Arrivals';
            case 'saree-collection':
                return 'Sarees';
            default:
                return category;
        }
    }

    /**
     * Show no results message
     */
    function showNoResults(query) {
        searchResultsGrid.innerHTML = `
            <div class="search-no-results">
                <h3>No results found for "${query}"</h3>
                <p>Try different keywords or browse our collections</p>
            </div>
        `;
    }

    /**
     * Show loading state
     */
    function showLoading() {
        if (searchResultsGrid) {
            searchResultsGrid.innerHTML = `
                <div class="search-loading">
                    <i class="fas fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 10px;"></i>
                    <p>Searching products...</p>
                </div>
            `;
        }
    }

    /**
     * Show recent searches
     */
    function showRecentSearches() {
        if (!searchRecentSection) return;
        
        // Hide results header
        document.querySelector('.search-results-header').style.display = 'none';
        
        // Clear results grid
        if (searchResultsGrid) {
            searchResultsGrid.innerHTML = '';
        }
        
        // Show recent searches section
        searchRecentSection.style.display = 'block';
        
        const recentSearches = SearchManager.getSearchHistory();
        const recentItemsContainer = document.getElementById('searchRecentItems');
        
        if (recentItemsContainer) {
            if (recentSearches.length === 0) {
                recentItemsContainer.innerHTML = '<div style="color: rgba(255,255,255,0.6); font-style: italic;">No recent searches</div>';
            } else {
                recentItemsContainer.innerHTML = recentSearches.map(search => 
                    `<div class="search-recent-item" data-query="${search}">${search}</div>`
                ).join('');
                
                // Add click handlers to recent items
                recentItemsContainer.querySelectorAll('.search-recent-item').forEach(item => {
                    item.addEventListener('click', function() {
                        const query = this.dataset.query;
                        searchInput.value = query;
                        performSearch(query);
                    });
                });
            }
        }
    }

    // Public API
    return {
        init,
        openSearch,
        closeSearch
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    SearchUI.init();
});
