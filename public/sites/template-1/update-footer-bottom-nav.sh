
#!/bin/bash

# Complete Footer and Bottom Nav HTML
read -r -d '' FOOTER_HTML << 'EOF'
    <!-- Minimalist Collapsible Footer -->
    <footer class="footer-minimalist">
        <div class="container">
            <!-- Info Section -->
            <div class="footer-section">
                <button class="footer-toggle" data-section="info-content">
                    <span class="footer-title">Info</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="footer-content" id="info-content">
                    <ul>
                        <li><a href="about-us.html">About Us</a></li>
                        <li><a href="contact-us.html">Contact Us</a></li>
                        <li><a href="book-appointment.html">Book Appointment</a></li>
                    </ul>
                </div>
            </div>

            <!-- Categories Section -->
            <div class="footer-section">
                <button class="footer-toggle" data-section="categories-content">
                    <span class="footer-title">Categories</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="footer-content" id="categories-content">
                    <ul>
                        <li class="category-with-sub">
                            <div class="category-item-header">
                                <a href="gold-necklace.html">Gold</a>
                                <i class="fas fa-plus category-toggle-icon"></i>
                            </div>
                            <ul class="subcategory-list">
                                <li><a href="gold-necklace.html">Necklace</a></li>
                                <li><a href="gold-earrings.html">Earrings</a></li>
                                <li><a href="gold-rings.html">Rings</a></li>
                                <li><a href="gold-bangles.html">Bangles</a></li>
                            </ul>
                        </li>
                        <li class="category-with-sub">
                            <div class="category-item-header">
                                <a href="silver-necklace.html">Silver</a>
                                <i class="fas fa-plus category-toggle-icon"></i>
                            </div>
                            <ul class="subcategory-list">
                                <li><a href="silver-necklace.html">Necklace</a></li>
                                <li><a href="silver-earrings.html">Earrings</a></li>
                                <li><a href="silver-rings.html">Rings</a></li>
                                <li><a href="silver-bangles.html">Bangles</a></li>
                            </ul>
                        </li>
                        <li class="category-with-sub">
                            <div class="category-item-header">
                                <a href="meenakari-necklace.html">Meenakari</a>
                                <i class="fas fa-plus category-toggle-icon"></i>
                            </div>
                            <ul class="subcategory-list">
                                <li><a href="meenakari-necklace.html">Necklace</a></li>
                                <li><a href="meenakari-earrings.html">Earrings</a></li>
                                <li><a href="meenakari-rings.html">Rings</a></li>
                                <li><a href="meenakari-bangles.html">Bangles</a></li>
                            </ul>
                        </li>
                    </ul>
                </div>
            </div>

            <!-- Collection Section -->
            <div class="footer-section">
                <button class="footer-toggle" data-section="collection-content">
                    <span class="footer-title">Collection</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="footer-content" id="collection-content">
                    <ul>
                        <li><a href="all-collection.html">All Collection</a></li>
                        <li><a href="featured-collection.html">Featured Collection</a></li>
                        <li><a href="new-arrivals.html">New Arrivals</a></li>
                        <li><a href="saree-collection.html">Saree Collection</a></li>
                    </ul>
                </div>
            </div>

            <!-- Exclusive Benefits Section -->
            <div class="footer-section">
                <button class="footer-toggle" data-section="benefits-content">
                    <span class="footer-title">Exclusive benefits</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="footer-content" id="benefits-content">
                    <ul>
                        <li><a href="book-appointment.html">Book an Appointment</a></li>
                        <li><a href="#">Free Shipping on Orders Over ₹5000</a></li>
                        <li><a href="#">Easy Returns & Exchanges</a></li>
                        <li><a href="#">Lifetime Warranty</a></li>
                    </ul>
                </div>
            </div>

            <!-- Social Media Section -->
            <div class="footer-social-section">
                <h4 class="social-section-title">Follow us on social media</h4>
                <div class="social-icons-container">
                    <a href="#" class="social-icon-link" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>
                    <a href="#" class="social-icon-link" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
                    <a href="#" class="social-icon-link" aria-label="Twitter"><i class="fab fa-twitter"></i></a>
                    <a href="#" class="social-icon-link" aria-label="Pinterest"><i class="fab fa-pinterest-p"></i></a>
                </div>
            </div>

            <!-- Download App Section -->
            <div class="footer-app-section">
                <h3 class="app-section-title">Download Our App</h3>
                <div class="app-buttons-container">
                    <a href="#" class="app-store-button">
                        <img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="Download on App Store">
                    </a>
                    <a href="#" class="google-play-button">
                        <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt="Get it on Google Play">
                    </a>
                </div>
            </div>
        </div>

        <!-- Footer Bottom -->
        <div class="footer-bottom">
            <div class="footer-info">
                <div class="copyright">
                    <p>&copy; 2025 Royal Meenakari. All rights reserved. | Developed by <a href="#">Savan Naik</a></p>
                </div>
                <div class="footer-links">
                    <a href="terms-conditions.html">Terms and Conditions</a>
                    <a href="privacy-policy.html">Privacy Policy</a>
                </div>
            </div>
        </div>
    </footer>

    <!-- Bottom Navigation Bar (Mobile Only) -->
    <nav class="bottom-nav">
        <a href="index.html" class="bottom-nav-item">
            <i class="fi fi-rs-home"></i>
            <span>Home</span>
        </a>
        <a href="all-collection.html" class="bottom-nav-item">
            <i class="fi fi-rs-shopping-cart"></i>
            <span>Shop</span>
        </a>
        <a href="profile.html" class="bottom-nav-item">
            <i class="fi fi-rs-user"></i>
            <span>Account</span>
        </a>
        <div class="bottom-nav-item currency-selector-wrapper">
            <span id="selected-currency-flag" class="currency-flag-display">🇮🇳</span>
            <span id="selected-currency-code" class="currency-code-display">INR</span>
            <select id="currency-selector" class="currency-select" onchange="CurrencyConverter.changeCurrency(this.value)">
                <option value="INR">🇮🇳 INR - Indian Rupee</option>
                <option value="USD">🇺🇸 USD</option>
                <option value="EUR">🇪🇺 EUR</option>
                <option value="GBP">🇬🇧 GBP</option>
            </select>
        </div>
        <div class="bottom-nav-item language-selector-wrapper">
            <span id="selected-language-flag" class="language-flag-display">🇬🇧</span>
            <span id="selected-language-code" class="language-code-display">EN</span>
            <select id="language-selector" class="language-select" onchange="LanguageTranslator.changeLanguage(this.value)">
                <option value="en">🇬🇧 EN - English</option>
                <option value="hi">🇮🇳 HI</option>
                <option value="es">🇪🇸 ES</option>
                <option value="fr">🇫🇷 FR</option>
                <option value="ar">🇦🇪 AR</option>
                <option value="de">🇩🇪 DE</option>
            </select>
        </div>
        <a href="#" class="bottom-nav-item" id="bottomNavCart">
            <i class="fi fi-rs-shopping-bag"></i>
            <span>Bag</span>
        </a>
    </nav>

    <!-- Footer Toggle Script -->
    <script src="js/footer-toggle.js"></script>
EOF

# List of files to update
files=(
    "login.html"
    "signup.html"
    "profile.html"
    "book-appointment.html"
    "all-collection.html"
    "featured-collection.html"
    "new-arrivals.html"
    "saree-collection.html"
    "gold-necklace.html"
    "gold-earrings.html"
    "gold-rings.html"
    "gold-bangles.html"
    "silver-necklace.html"
    "silver-earrings.html"
    "silver-rings.html"
    "silver-bangles.html"
    "meenakari-necklace.html"
    "meenakari-earrings.html"
    "meenakari-rings.html"
    "meenakari-bangles.html"
    "about-us.html"
    "contact-us.html"
)

echo "Starting footer and bottom nav update..."

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "Processing $file..."
        
        # Remove old footer if exists
        sed -i '/<footer class="footer-minimalist">/,/<\/footer>/d' "$file"
        sed -i '/<nav class="bottom-nav">/,/<\/nav>/d' "$file"
        sed -i '/<script src="js\/footer-toggle.js"><\/script>/d' "$file"
        
        # Add new footer before closing body tag
        sed -i "s|</body>|$FOOTER_HTML\n</body>|" "$file"
        
        echo "✅ Updated $file"
    else
        echo "⚠️  File not found: $file"
    fi
done

echo ""
echo "✨ Footer and bottom nav update complete!"
