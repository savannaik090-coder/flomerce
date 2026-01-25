// Banner rotator script with continuous auto-scroll animation (marquee style)
document.addEventListener('DOMContentLoaded', function() {
    console.log('Banner rotator script loaded');

    // Elements
    const promoBanner = document.querySelector('.promo-banner');
    const bannerText = document.querySelector('.promo-banner .banner-text');

    if (!promoBanner || !bannerText) {
        console.error('Banner elements not found');
        return;
    }

    // Banner content array
    const bannerContents = [
        'Free shipping on orders over ₹50,000',
        'New arrivals for the festive season - <a href="new-arrivals.html">View Collection</a>'
    ];

    // Function to get banner content with translation support
    function getBannerContent(index) {
        // Try to get translations from LanguageTranslator
        if (typeof LanguageTranslator !== 'undefined') {
            const currentLang = LanguageTranslator.getCurrentLanguage();

            // Check if static translations are available
            if (window.staticTranslations && window.staticTranslations[currentLang]) {
                const textKey = `banner_text_${index + 1}`;
                const translatedText = window.staticTranslations[currentLang][textKey];

                if (translatedText) {
                    // For the second banner, add the link
                    if (index === 1) {
                        return `${translatedText} - <a href="new-arrivals.html">View Collection</a>`;
                    }
                    return translatedText;
                }
            }
        }

        // Fallback to default content
        return bannerContents[index];
    }

    // Create continuous scrolling content
    function createScrollingBanner() {
        // Combine both banner messages with separator
        const combinedContent = bannerContents.map((content, index) => getBannerContent(index)).join(' &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ');
        
        // Duplicate the content multiple times to ensure continuous visibility
        const scrollContent = combinedContent + ' &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ' + 
                             combinedContent + ' &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ' + 
                             combinedContent + ' &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ' + 
                             combinedContent;
        
        bannerText.innerHTML = scrollContent;
    }

    // Initialize scrolling banner
    createScrollingBanner();

    // Apply CSS animation for continuous scroll
    bannerText.style.display = 'inline-block';
    bannerText.style.whiteSpace = 'nowrap';
    bannerText.style.animation = 'scroll-left 20s linear infinite';

    // Listen for language change events
    document.addEventListener('languageChanged', function() {
        createScrollingBanner();
    });

    console.log('Banner continuous auto-scroll animation set up');
});