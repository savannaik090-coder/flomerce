/**
 * Currency Converter Module
 * Provides real-time currency conversion for all prices on the website
 * Uses ExchangeRate-API for live exchange rates
 */

const CurrencyConverter = (function() {
    // Configuration
    const BASE_CURRENCY = 'INR';
    const API_URL = 'https://api.exchangerate-api.com/v4/latest/INR';
    const CACHE_KEY = 'currency_exchange_rates';
    const CACHE_TIMESTAMP_KEY = 'currency_rates_timestamp';
    const SELECTED_CURRENCY_KEY = 'selected_currency';
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    // Supported currencies with symbols and country info
    const CURRENCIES = {
        'INR': { symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳', country: 'India' },
        'USD': { symbol: '$', name: 'US Dollar', flag: '🇺🇸', country: 'United States' },
        'EUR': { symbol: '€', name: 'Euro', flag: '🇪🇺', country: 'Europe' },
        'GBP': { symbol: '£', name: 'British Pound', flag: '🇬🇧', country: 'United Kingdom' },
        'AED': { symbol: 'د.إ', name: 'UAE Dirham', flag: '🇦🇪', country: 'UAE' },
        'CAD': { symbol: 'C$', name: 'Canadian Dollar', flag: '🇨🇦', country: 'Canada' },
        'AUD': { symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺', country: 'Australia' }
    };

    let exchangeRates = {};
    let currentCurrency = BASE_CURRENCY;
    let isLoading = false;
    let userCountry = null;
    let userCurrency = null;
    let isInitialized = false;

    /**
     * Initialize the currency converter
     */
    async function init() {
        if (isInitialized) {
            console.log('✅ Currency Converter already initialized');
            return;
        }

        try {
            console.log('🚀 Starting Currency Converter initialization...');

            // Detect user location (with timeout)
            try {
                await Promise.race([
                    detectUserLocation(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Location detection timeout')), 2000))
                ]);
            } catch (e) {
                console.log('ℹ️ Location detection skipped');
            }

            // CRITICAL: Load and restore saved currency from localStorage
            const savedCurrency = localStorage.getItem(SELECTED_CURRENCY_KEY);
            console.log('📦 Saved currency from localStorage:', savedCurrency);
            
            if (savedCurrency && CURRENCIES[savedCurrency]) {
                currentCurrency = savedCurrency;
                console.log('✅ Restored saved currency:', currentCurrency);
            }

            // Load exchange rates with fallback
            await loadExchangeRatesWithFallback();

            // Set up UI to show restored currency
            updateCurrencySelector();
            
            // Mark as initialized
            isInitialized = true;
            console.log('✅ Currency Converter initialized with currency:', currentCurrency);
            
            // Convert prices if not base currency
            if (currentCurrency !== BASE_CURRENCY) {
                console.log('💱 Converting prices to:', currentCurrency);
                convertAllPrices();
            }

        } catch (error) {
            console.error('❌ Currency Converter initialization error:', error);
            isInitialized = true;
        }
    }

    /**
     * Detect user's location and currency
     */
    async function detectUserLocation() {
        try {
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            
            if (data.country_name && data.currency) {
                userCountry = data.country_name;
                userCurrency = data.currency;
                localStorage.setItem('user_country', userCountry);
                localStorage.setItem('user_detected_currency', userCurrency);
            }
        } catch (error) {
            userCountry = localStorage.getItem('user_country') || 'Unknown';
            userCurrency = localStorage.getItem('user_detected_currency') || 'INR';
        }
    }

    /**
     * Load exchange rates from API or cache
     */
    async function loadExchangeRates() {
        // Check cache first
        const cachedRates = localStorage.getItem(CACHE_KEY);
        const cacheTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
        const now = Date.now();

        if (cachedRates && cacheTimestamp) {
            const age = now - parseInt(cacheTimestamp);
            if (age < CACHE_DURATION) {
                exchangeRates = JSON.parse(cachedRates);
                console.log('💰 Using cached exchange rates');
                return;
            }
        }

        // Fetch new rates
        try {
            const response = await fetch(API_URL);
            const data = await response.json();

            if (data && data.rates) {
                exchangeRates = data.rates;
                localStorage.setItem(CACHE_KEY, JSON.stringify(exchangeRates));
                localStorage.setItem(CACHE_TIMESTAMP_KEY, now.toString());
                console.log('💰 Exchange rates fetched successfully');
            } else {
                throw new Error('Invalid rates data');
            }
        } catch (error) {
            console.error('❌ Exchange rate fetch failed:', error);
            throw error;
        }
    }
    
    /**
     * Load exchange rates with fallback
     */
    async function loadExchangeRatesWithFallback() {
        try {
            await loadExchangeRates();
        } catch (error) {
            console.warn('⚠️ Exchange rate loading failed, using fallback...');
            
            const cachedRates = localStorage.getItem(CACHE_KEY);
            if (cachedRates) {
                try {
                    exchangeRates = JSON.parse(cachedRates);
                    console.log('✅ Using cached exchange rates');
                    return;
                } catch (e) {
                    console.warn('Cached rates are invalid');
                }
            }
            
            // Set default rates
            exchangeRates = {
                'INR': 1,
                'USD': 0.012,
                'EUR': 0.011,
                'GBP': 0.0095,
                'AED': 0.044,
                'CAD': 0.016,
                'AUD': 0.018
            };
            console.log('✅ Using default exchange rates');
        }
    }

    /**
     * Convert price from INR to selected currency
     */
    function convertPrice(priceInINR) {
        if (currentCurrency === BASE_CURRENCY) {
            return priceInINR;
        }

        const rate = exchangeRates[currentCurrency];
        if (!rate) {
            console.error('Exchange rate not found for', currentCurrency);
            return priceInINR;
        }

        return priceInINR * rate;
    }

    /**
     * Format price with currency symbol
     */
    function formatPrice(price) {
        const currencyInfo = CURRENCIES[currentCurrency];
        const symbol = currencyInfo ? currencyInfo.symbol : '₹';

        let formattedPrice;
        if (currentCurrency === 'INR') {
            formattedPrice = Math.round(price).toLocaleString('en-IN');
        } else {
            formattedPrice = price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        }

        return `${symbol}${formattedPrice}`;
    }

    /**
     * Convert all prices on the page
     */
    function convertAllPrices() {
        // CRITICAL FIX: Ensure we have the latest currency from localStorage
        // This handles the case where currency is saved but init() hasn't run yet
        const savedCurrency = localStorage.getItem(SELECTED_CURRENCY_KEY);
        if (savedCurrency && CURRENCIES[savedCurrency] && savedCurrency !== currentCurrency) {
            currentCurrency = savedCurrency;
            console.log('🔄 Updated current currency to:', currentCurrency);
        }

        // If still using base currency, don't convert
        if (currentCurrency === BASE_CURRENCY) {
            return;
        }

        // Ensure exchange rates are loaded
        if (!exchangeRates || Object.keys(exchangeRates).length === 0) {
            console.warn('⚠️ No exchange rates available, skipping conversion');
            return;
        }

        isLoading = true;
        document.body.classList.add('converting-currency');

        const priceSelectors = [
            '.current-price',
            '.original-price',
            '.product-price',
            '.price',
            '.showcase-product-price',
            '.popup-product-price',
            '.cart-item-price',
            '.cart-item-total',
            '.cart-total-price',
            '.subtotal-amount',
            '.checkout-total',
            '.order-total'
        ];

        priceSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                convertPriceElement(element);
            });
        });

        setTimeout(() => {
            document.body.classList.remove('converting-currency');
            isLoading = false;
        }, 300);
    }

    /**
     * Convert a single price element
     */
    function convertPriceElement(element) {
        let priceInINR = parseFloat(element.dataset.originalPrice);
        
        if (!priceInINR) {
            const text = element.textContent.trim();
            if (!element.dataset.originalText) {
                element.dataset.originalText = text;
            }
            
            const match = text.match(/[\d,]+\.?\d*/);
            if (match) {
                priceInINR = parseFloat(match[0].replace(/,/g, ''));
                element.dataset.originalPrice = priceInINR;
            } else {
                return;
            }
        }

        const convertedPrice = convertPrice(priceInINR);
        const formattedPrice = formatPrice(convertedPrice);
        
        const originalText = element.dataset.originalText || element.textContent;
        const originalPriceMatch = originalText.match(/[\d,]+\.?\d*/);
        
        if (originalPriceMatch) {
            const updatedText = originalText.replace(/[₹$€£]?[\d,]+\.?\d*/, formattedPrice);
            element.textContent = updatedText;
        } else {
            element.textContent = formattedPrice;
        }
    }

    /**
     * Change currency
     */
    async function changeCurrency(newCurrency) {
        if (newCurrency === currentCurrency) return;
        
        if (!CURRENCIES[newCurrency]) {
            console.error('Invalid currency:', newCurrency);
            return;
        }

        currentCurrency = newCurrency;
        localStorage.setItem(SELECTED_CURRENCY_KEY, currentCurrency);

        updateCurrencySelector();
        convertAllPrices();

        console.log('✅ Currency changed to:', currentCurrency);
    }

    /**
     * Update currency selector UI
     */
    function updateCurrencySelector() {
        const selector = document.getElementById('currency-selector');
        if (selector) {
            selector.value = currentCurrency;
            
            Array.from(selector.options).forEach(option => {
                const currCode = option.value;
                const currInfo = CURRENCIES[currCode];
                if (currInfo) {
                    option.textContent = `${currInfo.flag} ${currCode} - ${currInfo.name}`;
                }
            });
        }

        const flagDisplay = document.getElementById('selected-currency-flag');
        if (flagDisplay) {
            const currencyInfo = CURRENCIES[currentCurrency];
            flagDisplay.textContent = currencyInfo.flag;
        }

        const codeDisplay = document.getElementById('selected-currency-code');
        if (codeDisplay) {
            codeDisplay.textContent = currentCurrency;
        }

        const selectedDisplay = document.getElementById('selected-currency-display');
        if (selectedDisplay) {
            const currencyInfo = CURRENCIES[currentCurrency];
            selectedDisplay.textContent = `${currencyInfo.flag} ${currentCurrency}`;
        }

        showUserLocation();
    }

    /**
     * Display user's current location with flag
     */
    function showUserLocation() {
        const wrapper = document.querySelector('.currency-selector-wrapper');
        if (!wrapper) return;

        const existingInfo = wrapper.querySelector('.current-location-info');
        if (existingInfo) {
            existingInfo.remove();
        }

        if (userCountry && userCountry !== 'Unknown') {
            const locationInfo = document.createElement('div');
            locationInfo.className = 'current-location-info';
            const userFlag = getCountryFlag(userCountry);
            locationInfo.innerHTML = `<span class="location-flag">${userFlag}</span> ${userCountry}`;
            wrapper.appendChild(locationInfo);
        }
    }

    /**
     * Get flag emoji for country name
     */
    function getCountryFlag(countryName) {
        const flagMap = {
            'India': '🇮🇳',
            'United States': '🇺🇸',
            'United Kingdom': '🇬🇧',
            'Canada': '🇨🇦',
            'Australia': '🇦🇺',
            'Germany': '🇩🇪',
            'France': '🇫🇷',
            'UAE': '🇦🇪',
            'United Arab Emirates': '🇦🇪',
            'Singapore': '🇸🇬',
            'Malaysia': '🇲🇾',
            'Thailand': '🇹🇭',
            'Japan': '🇯🇵',
            'China': '🇨🇳',
            'South Korea': '🇰🇷',
            'Brazil': '🇧🇷',
            'Mexico': '🇲🇽',
            'Spain': '🇪🇸',
            'Italy': '🇮🇹',
            'Netherlands': '🇳🇱',
            'Switzerland': '🇨🇭',
            'Austria': '🇦🇹',
            'Belgium': '🇧🇪',
            'Sweden': '🇸🇪',
            'Norway': '🇳🇴',
            'Denmark': '🇩🇰',
            'Finland': '🇫🇮',
            'Poland': '🇵🇱',
            'Russia': '🇷🇺',
            'Turkey': '🇹🇷',
            'Saudi Arabia': '🇸🇦',
            'Egypt': '🇪🇬',
            'South Africa': '🇿🇦',
            'Nigeria': '🇳🇬',
            'Kenya': '🇰🇪',
            'Pakistan': '🇵🇰',
            'Bangladesh': '🇧🇩',
            'Sri Lanka': '🇱🇰',
            'Nepal': '🇳🇵',
            'Indonesia': '🇮🇩',
            'Philippines': '🇵🇭',
            'Vietnam': '🇻🇳',
            'New Zealand': '🇳🇿',
            'Argentina': '🇦🇷',
            'Chile': '🇨🇱',
            'Colombia': '🇨🇴',
            'Peru': '🇵🇪'
        };
        
        return flagMap[countryName] || '🌍';
    }

    /**
     * Convert price from selected currency back to INR
     */
    function convertToINR(priceInCurrentCurrency) {
        if (currentCurrency === BASE_CURRENCY) {
            return priceInCurrentCurrency;
        }

        const rate = exchangeRates[currentCurrency];
        if (!rate) {
            console.error('Exchange rate not found for', currentCurrency);
            return priceInCurrentCurrency;
        }

        return priceInCurrentCurrency / rate;
    }

    /**
     * Get current currency
     */
    function getCurrentCurrency() {
        return currentCurrency;
    }

    /**
     * Get currency symbol
     */
    function getCurrencySymbol(currency = currentCurrency) {
        const currencyInfo = CURRENCIES[currency];
        return currencyInfo ? currencyInfo.symbol : '₹';
    }

    /**
     * Get all supported currencies
     */
    function getSupportedCurrencies() {
        return CURRENCIES;
    }

    /**
     * Refresh exchange rates
     */
    async function refreshRates() {
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(CACHE_TIMESTAMP_KEY);
        await loadExchangeRates();
        if (currentCurrency !== BASE_CURRENCY) {
            convertAllPrices();
        }
    }

    // Public API
    return {
        init,
        changeCurrency,
        convertPrice,
        convertToINR,
        formatPrice,
        getCurrentCurrency,
        getCurrencySymbol,
        getSupportedCurrencies,
        refreshRates,
        getCountryFlag,
        convertAllPrices,
        CURRENCIES,
        BASE_CURRENCY
    };
})();

// Make globally available FIRST
window.CurrencyConverter = CurrencyConverter;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📱 DOM ready, initializing Currency Converter');
        CurrencyConverter.init();
    });
} else {
    console.log('📱 DOM already loaded, initializing Currency Converter');
    CurrencyConverter.init();
}
