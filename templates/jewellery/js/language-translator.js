/**
 * Language Translator Module
 * Provides multi-language support for the website
 * Uses MyMemory API for dynamic translation
 */

const LanguageTranslator = (function() {
    const BASE_LANGUAGE = 'en';
    const API_URL = 'https://api.mymemory.translated.net/get';
    const CACHE_KEY = 'language_translations_cache';
    const SELECTED_LANGUAGE_KEY = 'selected_language';
    const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;

    const LANGUAGES = {
        'en': { name: 'English', flag: '🇬🇧', nativeName: 'English' },
        'hi': { name: 'Hindi', flag: '🇮🇳', nativeName: 'हिंदी' },
        'es': { name: 'Spanish', flag: '🇪🇸', nativeName: 'Español' },
        'fr': { name: 'French', flag: '🇫🇷', nativeName: 'Français' },
        'ar': { name: 'Arabic', flag: '🇸🇦', nativeName: 'العربية' },
        'de': { name: 'German', flag: '🇩🇪', nativeName: 'Deutsch' }
    };

    let currentLanguage = BASE_LANGUAGE;
    let translationCache = {};
    let staticTranslations = {};
    let isTranslating = false;

    async function init() {
        console.log('Initializing Language Translator...');

        await loadStaticTranslations();
        
        const savedLanguage = localStorage.getItem(SELECTED_LANGUAGE_KEY);
        if (savedLanguage && LANGUAGES[savedLanguage]) {
            currentLanguage = savedLanguage;
        } else {
            detectBrowserLanguage();
        }

        loadTranslationCache();
        
        updateLanguageSelector();
        
        if (currentLanguage !== BASE_LANGUAGE) {
            await translatePage();
        }

        console.log('Language Translator initialized with language:', currentLanguage);
    }

    async function loadStaticTranslations() {
        try {
            const response = await fetch('data/translations.json');
            if (response.ok) {
                staticTranslations = await response.json();
                window.staticTranslations = staticTranslations; // Make globally available
                console.log('Static translations loaded');
            }
        } catch (error) {
            console.warn('Could not load static translations:', error);
            staticTranslations = {};
            window.staticTranslations = {};
        }
    }

    function detectBrowserLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;
        const langCode = browserLang.split('-')[0];
        
        if (LANGUAGES[langCode]) {
            currentLanguage = langCode;
            console.log('Detected browser language:', langCode);
        }
    }

    function loadTranslationCache() {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                const data = JSON.parse(cached);
                if (Date.now() - data.timestamp < CACHE_DURATION) {
                    translationCache = data.cache || {};
                    console.log('Loaded translation cache');
                } else {
                    localStorage.removeItem(CACHE_KEY);
                }
            }
        } catch (error) {
            console.warn('Error loading translation cache:', error);
            translationCache = {};
        }
    }

    function saveTranslationCache() {
        try {
            const data = {
                cache: translationCache,
                timestamp: Date.now()
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        } catch (error) {
            console.warn('Error saving translation cache:', error);
        }
    }

    async function translateText(text, targetLang = currentLanguage) {
        if (!text || targetLang === BASE_LANGUAGE) return text;

        const cacheKey = `${text}_${targetLang}`;
        
        if (translationCache[cacheKey]) {
            return translationCache[cacheKey];
        }

        try {
            const apiKey = '18f9de67d0c3255d0f2f';
            const url = `${API_URL}?q=${encodeURIComponent(text)}&langpair=${BASE_LANGUAGE}|${targetLang}&key=${apiKey}`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.responseStatus === 200 && data.responseData) {
                const translation = data.responseData.translatedText;
                translationCache[cacheKey] = translation;
                saveTranslationCache();
                return translation;
            } else {
                console.warn('Translation API error:', data);
                return text;
            }
        } catch (error) {
            console.error('Translation error:', error);
            return text;
        }
    }

    async function translatePage() {
        if (isTranslating || currentLanguage === BASE_LANGUAGE) return;
        
        isTranslating = true;
        console.log('Translating page to:', currentLanguage);

        try {
            await translateStaticElements();
            await translateDynamicElements();
        } catch (error) {
            console.error('Error translating page:', error);
        } finally {
            isTranslating = false;
        }
    }

    async function translateStaticElements() {
        const elements = document.querySelectorAll('[data-translate]');
        
        for (const element of elements) {
            if (!element.dataset.originalText) {
                element.dataset.originalText = element.textContent.trim();
            }
            
            const key = element.getAttribute('data-translate');
            
            // First check if translation exists in static translations
            if (staticTranslations[key] && staticTranslations[key][currentLanguage]) {
                element.textContent = staticTranslations[key][currentLanguage];
            } else if (staticTranslations[currentLanguage] && staticTranslations[currentLanguage][key]) {
                element.textContent = staticTranslations[currentLanguage][key];
            } else if (element.dataset.originalText) {
                const translated = await translateText(element.dataset.originalText);
                element.textContent = translated;
            }
        }
    }

    async function translateDynamicElements() {
        const productElements = document.querySelectorAll('[data-translate-dynamic]');
        
        const translations = [];
        for (const element of productElements) {
            if (!element.dataset.originalText) {
                element.dataset.originalText = element.textContent.trim();
            }
            translations.push({
                element: element,
                text: element.dataset.originalText
            });
        }

        for (const item of translations) {
            if (item.text) {
                const translated = await translateText(item.text);
                item.element.textContent = translated;
            }
        }
    }

    async function changeLanguage(newLanguage) {
        if (!LANGUAGES[newLanguage] || newLanguage === currentLanguage) return;

        console.log('Changing language to:', newLanguage);
        
        currentLanguage = newLanguage;
        localStorage.setItem(SELECTED_LANGUAGE_KEY, currentLanguage);

        updateLanguageSelector();

        if (currentLanguage === BASE_LANGUAGE) {
            restoreOriginalText();
        } else {
            await translatePage();
        }

        document.documentElement.setAttribute('lang', currentLanguage);
        
        document.dispatchEvent(new CustomEvent('languageChanged', { 
            detail: { language: currentLanguage } 
        }));
    }

    function restoreOriginalText() {
        const allElements = document.querySelectorAll('[data-original-text]');
        allElements.forEach(element => {
            element.textContent = element.dataset.originalText;
        });

        const translateElements = document.querySelectorAll('[data-translate]');
        translateElements.forEach(element => {
            const key = element.getAttribute('data-translate');
            if (staticTranslations[BASE_LANGUAGE] && staticTranslations[BASE_LANGUAGE][key]) {
                element.textContent = staticTranslations[BASE_LANGUAGE][key];
            }
        });
    }

    function updateLanguageSelector() {
        const selector = document.getElementById('language-selector');
        if (selector) {
            selector.value = currentLanguage;
            
            Array.from(selector.options).forEach(option => {
                const langCode = option.value;
                const langInfo = LANGUAGES[langCode];
                if (langInfo) {
                    option.textContent = `${langInfo.flag} ${langCode.toUpperCase()} - ${langInfo.name}`;
                }
            });
        }

        const flagDisplay = document.getElementById('selected-language-flag');
        if (flagDisplay) {
            flagDisplay.textContent = LANGUAGES[currentLanguage].flag;
        }

        const codeDisplay = document.getElementById('selected-language-code');
        if (codeDisplay) {
            codeDisplay.textContent = currentLanguage.toUpperCase();
        }
    }

    function getCurrentLanguage() {
        return currentLanguage;
    }

    function getLanguageFlag(langCode) {
        return LANGUAGES[langCode] ? LANGUAGES[langCode].flag : '🌐';
    }

    function getSupportedLanguages() {
        return { ...LANGUAGES };
    }

    function clearCache() {
        translationCache = {};
        localStorage.removeItem(CACHE_KEY);
        console.log('Translation cache cleared');
    }

    function observeProductChanges() {
        const observer = new MutationObserver((mutations) => {
            if (currentLanguage !== BASE_LANGUAGE) {
                setTimeout(() => {
                    translateDynamicElements();
                }, 100);
            }
        });

        const productContainers = document.querySelectorAll('.product-scroll-container, .new-arrivals-container, .featured-collection-wrapper');
        productContainers.forEach(container => {
            if (container) {
                observer.observe(container, {
                    childList: true,
                    subtree: true
                });
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            init();
            observeProductChanges();
        });
    } else {
        init();
        observeProductChanges();
    }

    document.addEventListener('productsLoaded', function() {
        if (currentLanguage !== BASE_LANGUAGE) {
            setTimeout(() => {
                translateDynamicElements();
            }, 200);
        }
    });

    return {
        init,
        changeLanguage,
        translateText,
        translatePage,
        getCurrentLanguage,
        getLanguageFlag,
        getSupportedLanguages,
        clearCache,
        LANGUAGES
    };
})();
