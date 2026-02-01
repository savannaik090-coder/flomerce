
/**
 * Auric Search Manager
 * Handles search functionality across all product collections
 */

const SearchManager = (function() {
    let allProducts = [];
    let searchResults = [];
    let isLoading = false;
    let searchHistory = JSON.parse(localStorage.getItem('auric_search_history') || '[]');
    
    // Search settings
    const settings = {
        category: 'all',
        minScore: 0.3, // Minimum relevance score for fuzzy matching
        maxResults: 50
    };

    /**
     * Initialize search manager
     */
    function init() {
        console.log('Initializing Search Manager...');
        loadAllProductData();
        setupSearchHistory();
    }

    /**
     * Load all products from different collections
     */
    async function loadAllProductData() {
        if (isLoading) return;
        
        isLoading = true;
        console.log('Loading all product data for search...');
        
        try {
            // Load from all collections including jewelry subcategories
            const collections = [
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
            const productPromises = collections.map(category => loadProductsFromCategory(category));
            
            const results = await Promise.allSettled(productPromises);
            allProducts = [];
            
            results.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                    const products = result.value.map(product => ({
                        ...product,
                        searchCategory: collections[index]
                    }));
                    allProducts.push(...products);
                }
            });
            
            console.log(`Loaded ${allProducts.length} products for search`);
            
        } catch (error) {
            console.error('Error loading product data for search:', error);
        } finally {
            isLoading = false;
        }
    }

    /**
     * Load products from a specific category
     */
    async function loadProductsFromCategory(category) {
        try {
            const response = await fetch(`/api/products?category=${category}&cacheBust=${Date.now()}`);
            
            if (!response.ok) {
                console.warn(`Failed to load ${category} products:`, response.status);
                return [];
            }
            
            const data = await response.json();
            return data.products || [];
            
        } catch (error) {
            console.warn(`Error loading ${category} products:`, error);
            return [];
        }
    }

    /**
     * Perform search with fuzzy matching
     */
    function search(query, categoryFilter = 'all') {
        if (!query.trim()) {
            return [];
        }

        console.log(`Searching for: "${query}" in category: ${categoryFilter}`);
        
        // Filter by category first
        let productsToSearch = allProducts;
        if (categoryFilter !== 'all') {
            productsToSearch = allProducts.filter(product => 
                product.searchCategory === categoryFilter
            );
        }

        // Score each product based on relevance
        const scoredResults = productsToSearch.map(product => {
            const score = calculateRelevanceScore(product, query);
            return { product, score };
        });

        // Filter and sort by relevance score
        searchResults = scoredResults
            .filter(item => item.score >= settings.minScore)
            .sort((a, b) => b.score - a.score)
            .slice(0, settings.maxResults)
            .map(item => item.product);

        console.log(`Found ${searchResults.length} results for "${query}"`);
        
        // Save to search history
        saveSearchHistory(query);
        
        return searchResults;
    }

    /**
     * Calculate relevance score for a product
     */
    function calculateRelevanceScore(product, query) {
        const queryLower = query.toLowerCase();
        let score = 0;

        // Product name match (highest weight)
        if (product.name) {
            const name = product.name.toLowerCase();
            if (name.includes(queryLower)) {
                score += 1.0;
                // Exact match gets bonus
                if (name === queryLower) {
                    score += 0.5;
                }
                // Starting with query gets bonus
                if (name.startsWith(queryLower)) {
                    score += 0.3;
                }
            }
        }

        // Description match (medium weight)
        if (product.description) {
            const description = product.description.toLowerCase();
            if (description.includes(queryLower)) {
                score += 0.6;
            }
        }

        // Category match (low weight)
        if (product.searchCategory) {
            const category = product.searchCategory.toLowerCase();
            if (category.includes(queryLower)) {
                score += 0.4;
            }
        }

        // Price range search (if query is numeric)
        const numericQuery = parseFloat(query.replace(/[^0-9.]/g, ''));
        if (!isNaN(numericQuery) && product.price) {
            const productPrice = parseFloat(product.price);
            const priceDiff = Math.abs(productPrice - numericQuery);
            const maxPrice = Math.max(productPrice, numericQuery);
            
            // If within 20% of the searched price
            if (priceDiff / maxPrice <= 0.2) {
                score += 0.3;
            }
        }

        // Fuzzy matching for typos
        if (score === 0 && product.name) {
            const fuzzyScore = fuzzyMatch(product.name.toLowerCase(), queryLower);
            if (fuzzyScore > 0.7) {
                score += fuzzyScore * 0.4;
            }
        }

        return score;
    }

    /**
     * Simple fuzzy matching algorithm
     */
    function fuzzyMatch(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    /**
     * Calculate Levenshtein distance
     */
    function levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    /**
     * Save search query to history
     */
    function saveSearchHistory(query) {
        const trimmedQuery = query.trim();
        if (!trimmedQuery || searchHistory.includes(trimmedQuery)) return;
        
        searchHistory.unshift(trimmedQuery);
        
        // Keep only last 10 searches
        if (searchHistory.length > 10) {
            searchHistory = searchHistory.slice(0, 10);
        }
        
        localStorage.setItem('auric_search_history', JSON.stringify(searchHistory));
    }

    /**
     * Get search history
     */
    function getSearchHistory() {
        return searchHistory;
    }

    /**
     * Clear search history
     */
    function clearSearchHistory() {
        searchHistory = [];
        localStorage.removeItem('auric_search_history');
    }

    /**
     * Setup search history from localStorage
     */
    function setupSearchHistory() {
        searchHistory = JSON.parse(localStorage.getItem('auric_search_history') || '[]');
    }

    /**
     * Get current search results
     */
    function getCurrentResults() {
        return searchResults;
    }

    /**
     * Force refresh product data
     */
    async function refreshProductData() {
        console.log('Refreshing search product data...');
        await loadAllProductData();
    }

    // Public API
    return {
        init,
        search,
        getCurrentResults,
        getSearchHistory,
        clearSearchHistory,
        refreshProductData,
        isLoading: () => isLoading
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    SearchManager.init();
});
