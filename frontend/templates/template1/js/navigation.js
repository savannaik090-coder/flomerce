/**
 * Auric Responsive Navigation System
 * Complete rewrite with responsive design
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Navigation system initialized');

    // Main navigation elements
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    const menuOverlay = document.getElementById('menuOverlay');
    const closeMenuBtn = document.getElementById('closeMenu');

    // Dropdown navigation elements
    const dropdownItems = document.querySelectorAll('.dropdown');
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');

    // Log what elements we found (for debugging)
    console.log('Navigation elements found:', {
        menuButton: navToggle ? true : false,
        closeButton: closeMenuBtn ? true : false,
        mobileMenu: navMenu ? true : false,
        menuLinks: document.querySelectorAll('.nav-link').length
    });

    /**
     * Toggle mobile menu open/closed
     */
    function toggleMobileMenu() {
        navToggle.classList.toggle('open');
        navMenu.classList.toggle('active');

        if (menuOverlay) {
            menuOverlay.classList.toggle('active');
        }

        // Toggle body scroll
        if (navMenu.classList.contains('active')) {
            document.body.style.overflow = 'hidden';

            // Show mobile account links when menu is active
            const mobileAccountLinks = document.querySelector('.mobile-account-links');
            if (mobileAccountLinks) {
                mobileAccountLinks.style.display = 'flex';
            }
        } else {
            document.body.style.overflow = '';
        }
    }

    /**
     * Close mobile menu
     */
    function closeMobileMenu() {
        navToggle.classList.remove('open');
        navMenu.classList.remove('active');

        if (menuOverlay) {
            menuOverlay.classList.remove('active');
        }

        // Restore body scroll
        document.body.style.overflow = '';

        // Hide mobile account links when menu is closed
        const mobileAccountLinks = document.querySelector('.mobile-account-links');
        if (mobileAccountLinks) {
            // Hide only on mobile viewport
            if (window.innerWidth <= 991) {
                mobileAccountLinks.style.display = 'none';
            }
        }
    }

    /**
     * Toggle dropdown menus on mobile
     */
    function toggleDropdown(e) {
        // Only apply for mobile view
        if (window.innerWidth <= 991) {
            e.preventDefault();

            const dropdown = this.closest('.dropdown');

            // Close all other dropdowns first
            document.querySelectorAll('.dropdown.active').forEach(item => {
                if (item !== dropdown) {
                    item.classList.remove('active');
                }
            });

            // Toggle active class on dropdown
            dropdown.classList.toggle('active');
        }
    }

    /**
     * Toggle submenu dropdowns on mobile
     */
    function toggleSubmenu(e) {
        // Only apply for mobile view
        if (window.innerWidth <= 991) {
            e.preventDefault();
            e.stopPropagation();

            const submenu = this.closest('.dropdown-submenu');

            if (submenu) {
                // Close other open submenus in the same parent dropdown
                const parentDropdown = submenu.closest('.dropdown-menu');
                if (parentDropdown) {
                    parentDropdown.querySelectorAll('.dropdown-submenu.active').forEach(item => {
                        if (item !== submenu) {
                            item.classList.remove('active');
                            const otherList = item.querySelector('.dropdown-submenu-list');
                            if (otherList) {
                                otherList.style.display = 'none';
                            }
                        }
                    });
                }

                // Toggle active class on submenu
                submenu.classList.toggle('active');

                // Toggle the submenu list visibility with explicit display
                const submenuList = submenu.querySelector('.dropdown-submenu-list');
                if (submenuList) {
                    if (submenu.classList.contains('active')) {
                        submenuList.style.display = 'block';
                        submenuList.style.visibility = 'visible';
                        submenuList.style.opacity = '1';
                    } else {
                        // Delay hiding to allow closing animation to complete
                        setTimeout(() => {
                            if (!submenu.classList.contains('active')) {
                                submenuList.style.display = 'none';
                                submenuList.style.visibility = 'hidden';
                                submenuList.style.opacity = '0';
                            }
                        }, 300); // Match animation duration
                    }
                }
            }
        }
    }

    // Event listeners
    if (navToggle) {
        navToggle.addEventListener('click', toggleMobileMenu);
    }

    if (menuOverlay) {
        menuOverlay.addEventListener('click', closeMobileMenu);
    }

    // Close button event listener
    if (closeMenuBtn) {
        closeMenuBtn.addEventListener('click', closeMobileMenu);
    }

    // Make closeMobileMenu available globally for inline onclick handlers
    window.closeMobileMenu = closeMobileMenu;

    // Add click events to dropdown toggles for mobile
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', toggleDropdown);
    });

    // Add click events to submenu toggles for mobile
    const submenuToggles = document.querySelectorAll('.dropdown-submenu > a');
    submenuToggles.forEach(toggle => {
        toggle.addEventListener('click', toggleSubmenu);
    });

    // Close navMenu when clicking a nav link on mobile
    const navLinks = document.querySelectorAll('.nav-link:not(.dropdown-toggle)');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href && (href === '#' || href.startsWith('#'))) {
                // It's an anchor or toggle link, let it stay on the same page
            } else if (window.innerWidth <= 991) {
                closeMobileMenu();
            }
        });
    });

    // Handle window resize - reset mobile menu state on desktop
    window.addEventListener('resize', function() {
        if (window.innerWidth > 991) {
            navMenu.classList.remove('active');
            menuOverlay.classList.remove('active');
            navToggle.classList.remove('open');
            document.body.style.overflow = '';

            // Reset all dropdown states
            dropdownItems.forEach(item => {
                item.classList.remove('active');
            });
        }
    });

    /**
     * Update account icon based on login status
     */
    function updateAccountIcon() {
        const accountIconLink = document.querySelector('#user-icon');
        if (!accountIconLink) return;

        // Check if user is logged in using the proper FirebaseAuth method
        let isLoggedIn = false;

        if (window.FirebaseAuth && typeof window.FirebaseAuth.isLoggedIn === 'function') {
            // Use the proper authentication check that includes email verification
            isLoggedIn = window.FirebaseAuth.isLoggedIn();
        } else if (window.firebase && window.firebase.auth && window.firebase.auth().currentUser) {
            // Fallback to basic Firebase auth check (but this doesn't check email verification)
            const user = window.firebase.auth().currentUser;
            // For now, assume logged in if user exists (the login function handles verification)
            isLoggedIn = !!user;
        }

        if (isLoggedIn) {
            // User is logged in and verified, show profile link
            accountIconLink.href = 'profile.html';
            accountIconLink.classList.add('logged-in');
        } else {
            // User is not logged in or not verified, show login link
            accountIconLink.href = '/login';
            accountIconLink.classList.remove('logged-in');
        }
    }


    // Wait for Firebase to initialize before checking auth state
    function initializeAuthStateCheck() {
        if (window.firebase && window.firebase.auth) {
            // Initial check
            updateAccountIcon();

            // Set up auth state observer
            firebase.auth().onAuthStateChanged((user) => {
                console.log('Auth state changed in navigation:', user ? 'logged in' : 'logged out');
                updateAccountIcon();
            });
        } else {
            // Retry after a short delay if Firebase isn't ready
            setTimeout(initializeAuthStateCheck, 200);
        }
    }

    // Start initialization check
    initializeAuthStateCheck();

    /**
     * Setup search functionality
     */
    function setupSearchIcon() {
        // Find search icon in navigation - using the correct selector
        const searchIcon = document.querySelector('.search-icon');

        if (searchIcon) {
            searchIcon.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Search icon clicked');

                // Open search overlay if SearchUI is available
                if (typeof SearchUI !== 'undefined' && SearchUI.openSearch) {
                    SearchUI.openSearch();
                } else {
                    console.warn('SearchUI not available');
                }
            });
            console.log('Search icon functionality attached');
        } else {
            console.warn('Search icon not found in navigation');
        }
    }

    // Setup search icon after DOM is loaded
    setupSearchIcon();

    // User icon authentication state management
    const userIcon = document.getElementById('user-icon');

    // Check auth state immediately without observer to prevent race conditions
    if (userIcon) {
        // Use synchronous session check first
        const isLoggedIn = typeof FirebaseAuth !== 'undefined' && FirebaseAuth.isLoggedIn();

        if (isLoggedIn) {
            userIcon.href = "/profile";
            userIcon.classList.add('logged-in');
            console.log("Auth state changed in navigation:", "logged in");
        } else {
            userIcon.href = "/login";
            userIcon.classList.remove('logged-in');
            console.log("Auth state changed in navigation:", "logged out");
        }

        // Set up auth state observer for real-time updates
        if (typeof FirebaseAuth !== 'undefined' && FirebaseAuth.observeAuthState) {
            FirebaseAuth.observeAuthState(function(user) {
                if (user) {
                    // User is signed in, update icon to go to profile
                    console.log("Auth state updated in navigation:", "logged in");
                    userIcon.href = "/profile";
                    userIcon.classList.add('logged-in');
                } else {
                    // User is not signed in, update icon to go to login
                    console.log("Auth state updated in navigation:", "logged out");
                    userIcon.href = "/login";
                    userIcon.classList.remove('logged-in');
                }
            });
        }
    }
});