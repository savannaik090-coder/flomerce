
const fs = require('fs');
const path = require('path');

const REQUIRED_CSS_LINKS = `
    <!-- Flaticon CSS for bottom nav icons -->
    <link rel='stylesheet' href='https://cdn-uicons.flaticon.com/2.6.0/uicons-thin-straight/css/uicons-thin-straight.css'>
    <link rel='stylesheet' href='https://cdn-uicons.flaticon.com/2.6.0/uicons-solid-straight/css/uicons-solid-straight.css'>
    <link rel='stylesheet' href='https://cdn-uicons.flaticon.com/2.6.0/uicons-regular-straight/css/uicons-regular-straight.css'>
    
    <!-- Currency and Language Selector CSS -->
    <link rel="stylesheet" href="css/currency-converter.css?v=1.0.0">
    <link rel="stylesheet" href="css/language-selector.css?v=1.0.0">`;

const FOOTER_HTML = `
    <!-- Minimalist Collapsible Footer -->
    <footer class="footer-minimalist">
        <div class="container">
            <!-- Info Section -->
            <div class="footer-section">
                <button class="footer-toggle" data-section="info-content">
                    <span class="footer-title" data-translate="info">Info</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="footer-content" id="info-content">
                    <ul>
                        <li><a href="about-us.html" data-translate="about_us">About Us</a></li>
                        <li><a href="terms-conditions.html#shipping-and-delivery" data-translate-dynamic>Shipping Policy</a></li>
                        <li><a href="terms-conditions.html#returns-and-refunds" data-translate-dynamic>Returns & Exchanges</a></li>
                        <li><a href="terms-conditions.html" data-translate-dynamic>Terms and Conditions</a></li>
                        <li><a href="privacy-policy.html" data-translate-dynamic>Privacy Policy</a></li>
                    </ul>
                </div>
            </div>

            <!-- Categories Section -->
            <div class="footer-section">
                <button class="footer-toggle" data-section="categories-content">
                    <span class="footer-title" data-translate="categories">Categories</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="footer-content" id="categories-content">
                    <ul>
                        <li class="category-with-sub">
                            <div class="category-item-header">
                                <a href="#" data-translate="necklaces">Necklace</a>
                                <i class="fas fa-plus category-toggle-icon"></i>
                            </div>
                            <ul class="subcategory-list">
                                <li><a href="gold-necklace.html" data-translate-dynamic>Gold Necklace</a></li>
                                <li><a href="silver-necklace.html" data-translate-dynamic>Silver Necklace</a></li>
                                <li><a href="meenakari-necklace.html" data-translate-dynamic>Meenakari Necklace</a></li>
                            </ul>
                        </li>
                        <li class="category-with-sub">
                            <div class="category-item-header">
                                <a href="#" data-translate="earrings">Earrings</a>
                                <i class="fas fa-plus category-toggle-icon"></i>
                            </div>
                            <ul class="subcategory-list">
                                <li><a href="gold-earrings.html" data-translate-dynamic>Gold Earrings</a></li>
                                <li><a href="silver-earrings.html" data-translate-dynamic>Silver Earrings</a></li>
                                <li><a href="meenakari-earrings.html" data-translate-dynamic>Meenakari Earrings</a></li>
                            </ul>
                        </li>
                        <li class="category-with-sub">
                            <div class="category-item-header">
                                <a href="#" data-translate="bangles">Bangles</a>
                                <i class="fas fa-plus category-toggle-icon"></i>
                            </div>
                            <ul class="subcategory-list">
                                <li><a href="gold-bangles.html" data-translate-dynamic>Gold Bangles</a></li>
                                <li><a href="silver-bangles.html" data-translate-dynamic>Silver Bangles</a></li>
                                <li><a href="meenakari-bangles.html" data-translate-dynamic>Meenakari Bangles</a></li>
                            </ul>
                        </li>
                        <li class="category-with-sub">
                            <div class="category-item-header">
                                <a href="#" data-translate="rings">Rings</a>
                                <i class="fas fa-plus category-toggle-icon"></i>
                            </div>
                            <ul class="subcategory-list">
                                <li><a href="gold-rings.html" data-translate-dynamic>Gold Rings</a></li>
                                <li><a href="silver-rings.html" data-translate-dynamic>Silver Rings</a></li>
                                <li><a href="meenakari-rings.html" data-translate-dynamic>Meenakari Rings</a></li>
                            </ul>
                        </li>
                    </ul>
                </div>
            </div>

            <!-- Collection Section -->
            <div class="footer-section">
                <button class="footer-toggle" data-section="collection-content">
                    <span class="footer-title" data-translate-dynamic>Collection</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="footer-content" id="collection-content">
                    <ul>
                        <li><a href="all-collection.html" data-translate="all_collections">All Collection</a></li>
                        <li><a href="featured-collection.html" data-translate="featured">Featured Collection</a></li>
                        <li><a href="new-arrivals.html" data-translate="new_arrivals">New Arrivals</a></li>
                    </ul>
                </div>
            </div>

            <!-- Exclusive Benefits Section -->
            <div class="footer-section">
                <button class="footer-toggle" data-section="benefits-content">
                    <span class="footer-title" data-translate-dynamic>Exclusive benefits</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="footer-content" id="benefits-content">
                    <ul>
                        <li><a href="#" data-translate-dynamic>Personal Styling</a></li>
                    </ul>
                </div>
            </div>

            <!-- Social Media Icons Section -->
            <div class="footer-social-section">
                <h3 class="social-section-title" data-translate="follow_social">Follow us on social media</h3>
                <div class="social-icons-container">
                    <a href="https://www.instagram.com" target="_blank" class="social-icon-link">
                        <i class="fab fa-instagram"></i>
                    </a>
                    <a href="https://www.facebook.com" target="_blank" class="social-icon-link">
                        <i class="fab fa-facebook-f"></i>
                    </a>
                    <a href="https://www.youtube.com" target="_blank" class="social-icon-link">
                        <i class="fab fa-youtube"></i>
                    </a>
                </div>
            </div>

            <!-- Download Our App Section -->
            <div class="footer-app-section">
                <h3 class="app-section-title" data-translate="download_app">Download Our App</h3>
                <div class="app-buttons-container">
                    <a href="#" class="app-store-button">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="Download on App Store">
                    </a>
                    <a href="#" class="google-play-button">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Get it on Google Play">
                    </a>
                </div>
            </div>

            <div class="footer-bottom">
            <div class="container">
                <div class="footer-info">
                    <div class="copyright">
                        <p data-translate-dynamic>&copy; 2025 Royal Meenakari. All rights reserved. | Developed by <a href="https://savannaik.netlify.app/" target="_blank" style="color: #9c7c38; text-decoration: none; font-weight: 500;">Savan Naik</a></p>
                    </div>

                    <div class="footer-links">
                        <a href="terms-conditions.html" data-translate-dynamic>Terms and Conditions</a>
                        <a href="privacy-policy.html" data-translate-dynamic>Privacy Policy</a>
                    </div>

                    <div class="payment-methods">
                        <span><i class="fab fa-cc-amex"></i></span>
                        <span><i class="fab fa-cc-discover"></i></span>
                        <span><i class="fab fa-google-pay"></i></span>
                        <span><i class="fab fa-cc-mastercard"></i></span>
                        <span><i class="fab fa-cc-paypal"></i></span>
                        <span class="union-pay">UP</span>
                        <span><i class="fab fa-cc-visa"></i></span>
                    </div>
                </div>
            </div>
            </div>
        </div>
    </footer>

    <!-- WhatsApp Button -->
      <a href="https://wa.me/918963815289?text=Hi! I would like to know more about your services. Can you help me?" class="whatsapp-btn">
          <i class="fab fa-whatsapp"></i>
      </a>

    <!-- Bottom Navigation Bar -->
    <nav class="bottom-nav">
        <a href="index.html" class="bottom-nav-item active">
            <i class="fi fi-rs-home"></i>
            <span data-translate="home">Home</span>
        </a>
        <a href="all-collection.html" class="bottom-nav-item">
            <i class="fi fi-rs-shop"></i>
            <span data-translate="shop">Shop</span>
        </a>
        <a href="login.html" class="bottom-nav-item">
            <i class="fi fi-rs-user"></i>
            <span data-translate="account">Account</span>
        </a>
        <div class="bottom-nav-item currency-selector-wrapper">
            <span id="selected-currency-flag" class="currency-flag-display">🇮🇳</span>
            <span id="selected-currency-code" class="currency-code-display">INR</span>
            <select id="currency-selector" class="currency-select" onchange="CurrencyConverter.changeCurrency(this.value)">
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="AED">AED</option>
                <option value="CAD">CAD</option>
                <option value="AUD">AUD</option>
            </select>
        </div>
        <div class="bottom-nav-item language-selector-wrapper">
            <span id="selected-language-flag" class="language-flag-display">🇬🇧</span>
            <span id="selected-language-code" class="language-code-display">EN</span>
            <select id="language-selector" class="language-select" onchange="LanguageTranslator.changeLanguage(this.value)">
                <option value="en">EN</option>
                <option value="hi">HI</option>
                <option value="es">ES</option>
                <option value="fr">FR</option>
                <option value="ar">AR</option>
                <option value="de">DE</option>
            </select>
        </div>
        <a href="#" class="bottom-nav-item" id="bottomNavCart">
            <i class="fi fi-rs-shopping-bag"></i>
            <span data-translate="bag">Bag</span>
        </a>
    </nav>

    <!-- Footer Toggle Script -->
    <script src="js/footer-toggle.js"></script>

    <!-- Bottom Navigation Cart Handler Script -->
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const bottomNavCart = document.getElementById('bottomNavCart');
            if (bottomNavCart) {
                bottomNavCart.addEventListener('click', function(e) {
                    e.preventDefault();
                    if (typeof openCart === 'function') {
                        openCart();
                    } else {
                        window.location.href = 'checkout.html';
                    }
                });
            }
        });
    </script>

    <!-- Currency Converter -->
    <script src="js/currency-converter.js?v=1.0.0"></script>

    <!-- Language Translator -->
    <script src="js/language-translator.js?v=1.0.0"></script>
`;

const files = [
    "login.html",
    "signup.html",
    "profile.html",
    "book-appointment.html",
    "all-collection.html",
    "featured-collection.html",
    "new-arrivals.html",
    "saree-collection.html",
    "gold-necklace.html",
    "gold-earrings.html",
    "gold-rings.html",
    "gold-bangles.html",
    "silver-necklace.html",
    "silver-earrings.html",
    "silver-rings.html",
    "silver-bangles.html",
    "meenakari-necklace.html",
    "meenakari-earrings.html",
    "meenakari-rings.html",
    "meenakari-bangles.html",
    "about-us.html",
    "contact-us.html",
    "terms-conditions.html",
    "privacy-policy.html"
];

console.log('Starting footer and bottom nav update...\n');

files.forEach(file => {
    try {
        if (!fs.existsSync(file)) {
            console.log(`⚠️  File not found: ${file}`);
            return;
        }

        let content = fs.readFileSync(file, 'utf8');
        
        // Add required CSS links if not present
        const headClosingTag = '</head>';
        if (!content.includes('uicons-regular-straight')) {
            content = content.replace(headClosingTag, `${REQUIRED_CSS_LINKS}\n${headClosingTag}`);
            console.log(`   📝 Added missing CSS links to ${file}`);
        }
        
        // Remove old footer, WhatsApp button, and bottom nav
        content = content.replace(/<footer class="footer-minimalist">[\s\S]*?<\/footer>/g, '');
        content = content.replace(/<a href="https:\/\/wa\.me\/[\s\S]*?class="whatsapp-btn">[\s\S]*?<\/a>/g, '');
        content = content.replace(/<nav class="bottom-nav">[\s\S]*?<\/nav>/g, '');
        content = content.replace(/<script src="js\/footer-toggle\.js"><\/script>/g, '');
        
        // Remove duplicate currency/language scripts if present
        content = content.replace(/<script src="js\/currency-converter\.js\?v=1\.0\.0"><\/script>/g, '');
        content = content.replace(/<script src="js\/language-translator\.js\?v=1\.0\.0"><\/script>/g, '');
        
        // Remove bottom nav cart handler if present
        content = content.replace(/<script>[\s\S]*?document\.addEventListener\('DOMContentLoaded', function\(\) \{[\s\S]*?bottomNavCart[\s\S]*?\}\);[\s\S]*?<\/script>/g, '');
        
        // Add new footer before closing body tag
        content = content.replace('</body>', `${FOOTER_HTML}\n</body>`);
        
        fs.writeFileSync(file, content, 'utf8');
        console.log(`✅ Updated ${file}`);
    } catch (error) {
        console.error(`❌ Error updating ${file}:`, error.message);
    }
});

console.log('\n✨ Footer and bottom nav update complete!');
console.log('\nUpdated components:');
console.log('  • Footer with collapsible sections');
console.log('  • Subcategory links with smooth transitions');
console.log('  • WhatsApp button');
console.log('  • Bottom navigation bar with proper icons');
console.log('  • Currency converter');
console.log('  • Language selector');
console.log('  • All required CSS and JS links');
