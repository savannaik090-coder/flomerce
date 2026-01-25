/**
 * Currency Formatter for Emails
 * Handles currency conversion for order confirmation emails
 * This module provides formatting functions for email templates
 */

const EmailCurrencyFormatter = (function() {
    // Currency symbols
    const CURRENCY_SYMBOLS = {
        'INR': { symbol: '₹', decimals: 0 },
        'USD': { symbol: '$', decimals: 2 },
        'EUR': { symbol: '€', decimals: 2 },
        'GBP': { symbol: '£', decimals: 2 },
        'AED': { symbol: 'د.إ', decimals: 2 },
        'CAD': { symbol: 'C$', decimals: 2 },
        'AUD': { symbol: 'A$', decimals: 2 }
    };

    // Exchange rates (same as currency-converter.js)
    const EXCHANGE_RATES = {
        'INR': 1,
        'USD': 0.012,
        'EUR': 0.011,
        'GBP': 0.0095,
        'AED': 0.044,
        'CAD': 0.016,
        'AUD': 0.018
    };

    /**
     * Convert price from INR to target currency
     */
    function convertPrice(priceInINR, targetCurrency = 'INR') {
        if (targetCurrency === 'INR') {
            return priceInINR;
        }

        const rate = EXCHANGE_RATES[targetCurrency];
        if (!rate) {
            console.error('Exchange rate not found for', targetCurrency);
            return priceInINR;
        }

        return priceInINR * rate;
    }

    /**
     * Format price with currency symbol
     */
    function formatPrice(priceInINR, currency = 'INR') {
        const convertedPrice = convertPrice(priceInINR, currency);
        const currencyInfo = CURRENCY_SYMBOLS[currency] || CURRENCY_SYMBOLS['INR'];
        const { symbol, decimals } = currencyInfo;

        let formattedPrice;
        if (decimals === 0) {
            // For INR - no decimals
            formattedPrice = Math.round(convertedPrice).toLocaleString('en-IN');
        } else {
            // For other currencies - 2 decimals
            formattedPrice = convertedPrice.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        }

        return `${symbol}${formattedPrice}`;
    }

    /**
     * Get currency symbol
     */
    function getSymbol(currency = 'INR') {
        const currencyInfo = CURRENCY_SYMBOLS[currency];
        return currencyInfo ? currencyInfo.symbol : '₹';
    }

    // Public API
    return {
        convertPrice,
        formatPrice,
        getSymbol,
        CURRENCY_SYMBOLS,
        EXCHANGE_RATES
    };
})();

// Export for Node.js (server-side)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmailCurrencyFormatter;
}
