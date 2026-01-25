/**
 * Auric Navigation Coordinator
 * 
 * This script coordinates between multiple navigation systems:
 * - Mobile menu
 * - Cart panel
 * - Navigation dropdown
 * 
 * It ensures they don't interfere with each other and handles
 * proper state management when one system is activated.
 */

(function() {
  // Run immediately
  console.log('Navigation coordinator initializing');

  // Store navigation states
  let navState = {
    cartOpen: false,
    menuOpen: false,
    wishlistOpen: false,
    modalOpen: false
  };

  // Create safe references to DOM elements
  function getElement(selector) {
    return document.querySelector(selector);
  }

  // Safe element references
  let elements = {
    get cartPanel() { return getElement('.cart-panel'); },
    get cartOverlay() { return getElement('.cart-panel-overlay'); },
    get navMenu() { return getElement('#navMenu'); },
    get menuOverlay() { return getElement('#menuOverlay'); },
    get mobileMenu() { return getElement('#mobileMenu'); },
    get wishlistPanel() { return getElement('.wishlist-panel'); },
    get wishlistOverlay() { return getElement('.wishlist-overlay'); }
  };

  // Open cart reliably
  window.openCartDirectly = function() {
    console.log('Navigation coordinator: Opening cart');
    
    // Close other panels first
    closeMenu();
    closeWishlist();
    
    const { cartPanel, cartOverlay } = elements;
    
    if (!cartPanel || !cartOverlay) {
      console.error('Cart elements not found!');
      return;
    }
    
    // Remove any closing classes first
    cartPanel.classList.remove('closing');
    cartOverlay.classList.remove('closing');
    
    // Use CSS classes for smooth transitions
    requestAnimationFrame(() => {
      cartPanel.classList.add('active');
      cartOverlay.classList.add('active');
    });
    
    // Prevent scrolling
    document.body.style.overflow = 'hidden';
    
    // Update state
    navState.cartOpen = true;
    
    console.log('Cart opened via coordinator');
    return false;
  };

  // Close cart reliably with smooth transition
  window.closeCartDirectly = function() {
    console.log('Navigation coordinator: Closing cart');
    
    const { cartPanel, cartOverlay } = elements;
    
    if (cartPanel) {
      cartPanel.classList.remove('active');
      cartPanel.classList.add('closing');
    }
    
    if (cartOverlay) {
      cartOverlay.classList.remove('active');
      cartOverlay.classList.add('closing');
    }
    
    // Update state
    navState.cartOpen = false;
    
    // Clean up after animation completes
    setTimeout(() => {
      // Only cleanup if panel is still closed (not reopened)
      if (cartPanel && !cartPanel.classList.contains('active')) {
        // Restore scrolling if no other panels are open
        if (!navState.menuOpen && !navState.wishlistOpen && !navState.modalOpen) {
          document.body.style.overflow = '';
        }
        
        // Remove closing classes
        cartPanel.classList.remove('closing');
        if (cartOverlay) cartOverlay.classList.remove('closing');
      }
    }, 350); // Match CSS transition duration (0.35s)
    
    console.log('Cart closed via coordinator');
    return false;
  };

  // Open mobile menu reliably
  function openMenu() {
    console.log('Navigation coordinator: Opening menu');
    
    // Close other panels first
    closeCart();
    closeWishlist();
    
    // Handle both possible menu systems
    const { navMenu, menuOverlay, mobileMenu } = elements;
    
    if (navMenu) {
      navMenu.classList.add('active');
      if (menuOverlay) menuOverlay.classList.add('active');
    }
    
    if (mobileMenu) {
      mobileMenu.classList.add('active');
    }
    
    // Prevent scrolling
    document.body.style.overflow = 'hidden';
    
    // Update state
    navState.menuOpen = true;
    
    console.log('Menu opened via coordinator');
    return false;
  }

  // Close mobile menu reliably
  function closeMenu() {
    console.log('Navigation coordinator: Closing menu');
    
    // Handle both possible menu systems
    const { navMenu, menuOverlay, mobileMenu } = elements;
    
    if (navMenu) {
      navMenu.classList.remove('active');
      if (menuOverlay) menuOverlay.classList.remove('active');
    }
    
    if (mobileMenu) {
      mobileMenu.classList.remove('active');
    }
    
    // Restore scrolling if no other panels are open
    if (!navState.cartOpen && !navState.wishlistOpen && !navState.modalOpen) {
      document.body.style.overflow = '';
    }
    
    // Update state
    navState.menuOpen = false;
    
    console.log('Menu closed via coordinator');
    return false;
  }

  // Open wishlist reliably
  function openWishlist() {
    console.log('Navigation coordinator: Opening wishlist');
    
    // Close other panels first
    closeCart();
    closeMenu();
    
    const { wishlistPanel, wishlistOverlay } = elements;
    
    if (!wishlistPanel || !wishlistOverlay) {
      console.error('Wishlist elements not found!');
      return;
    }
    
    // Remove any closing classes first
    wishlistPanel.classList.remove('closing');
    wishlistOverlay.classList.remove('closing');
    
    // Use CSS classes for smooth transitions
    requestAnimationFrame(() => {
      wishlistPanel.classList.add('active');
      wishlistOverlay.classList.add('active');
    });
    
    // Prevent scrolling
    document.body.style.overflow = 'hidden';
    
    // Update state
    navState.wishlistOpen = true;
    
    console.log('Wishlist opened via coordinator');
    return false;
  }

  // Close wishlist reliably with smooth transition
  function closeWishlist() {
    console.log('Navigation coordinator: Closing wishlist');
    
    const { wishlistPanel, wishlistOverlay } = elements;
    
    if (wishlistPanel) {
      wishlistPanel.classList.remove('active');
      wishlistPanel.classList.add('closing');
    }
    
    if (wishlistOverlay) {
      wishlistOverlay.classList.remove('active');
      wishlistOverlay.classList.add('closing');
    }
    
    // Update state
    navState.wishlistOpen = false;
    
    // Clean up after animation completes
    setTimeout(() => {
      // Only cleanup if panel is still closed (not reopened)
      if (wishlistPanel && !wishlistPanel.classList.contains('active')) {
        // Restore scrolling if no other panels are open
        if (!navState.cartOpen && !navState.menuOpen && !navState.modalOpen) {
          document.body.style.overflow = '';
        }
        
        // Remove closing classes
        wishlistPanel.classList.remove('closing');
        if (wishlistOverlay) wishlistOverlay.classList.remove('closing');
      }
    }, 350); // Match CSS transition duration (0.35s)
    
    console.log('Wishlist closed via coordinator');
    return false;
  }

  // Menu button click handler
  function handleMenuButtonClick(e) {
    if (e) e.preventDefault();
    openMenu();
    return false;
  }

  // Close menu button click handler
  function handleCloseMenuClick(e) {
    if (e) e.preventDefault();
    closeMenu();
    return false;
  }

  // Cart button click handler
  function handleCartButtonClick(e) {
    if (e) e.preventDefault();
    window.openCartDirectly();
    return false;
  }

  // Close cart button click handler
  function handleCloseCartClick(e) {
    if (e) e.preventDefault();
    window.closeCartDirectly();
    return false;
  }

  // Wishlist button click handler
  function handleWishlistButtonClick(e) {
    if (e) e.preventDefault();
    openWishlist();
    return false;
  }

  // Close wishlist button click handler
  function handleCloseWishlistClick(e) {
    if (e) e.preventDefault();
    closeWishlist();
    return false;
  }

  // Set up event handlers
  function setupEventHandlers() {
    console.log('Setting up navigation event handlers');
    
    // Menu buttons
    document.querySelectorAll('#navToggle, #menuButton').forEach(el => {
      if (el) {
        // Remove any existing handlers and replace with our own
        const newEl = el.cloneNode(true);
        if (el.parentNode) el.parentNode.replaceChild(newEl, el);
        newEl.addEventListener('click', handleMenuButtonClick);
      }
    });
    
    // Close menu buttons
    document.querySelectorAll('#closeMenu, #closeButton').forEach(el => {
      if (el) {
        // Remove any existing handlers and replace with our own
        const newEl = el.cloneNode(true);
        if (el.parentNode) el.parentNode.replaceChild(newEl, el);
        newEl.addEventListener('click', handleCloseMenuClick);
      }
    });
    
    // Menu overlays
    document.querySelectorAll('#menuOverlay').forEach(el => {
      if (el) {
        // Remove any existing handlers and replace with our own
        const newEl = el.cloneNode(true);
        if (el.parentNode) el.parentNode.replaceChild(newEl, el);
        newEl.addEventListener('click', handleCloseMenuClick);
      }
    });
    
    // Cart buttons
    document.querySelectorAll('.cart-toggle, .cart-icon-container, #cartToggleButton, .mobile-cart-toggle').forEach(el => {
      if (el) {
        // Remove any existing handlers and replace with our own
        const newEl = el.cloneNode(true);
        if (el.parentNode) el.parentNode.replaceChild(newEl, el);
        newEl.addEventListener('click', handleCartButtonClick);
      }
    });
    
    // Close cart buttons
    document.querySelectorAll('.close-cart-btn').forEach(el => {
      if (el) {
        // Remove any existing handlers and replace with our own
        const newEl = el.cloneNode(true);
        if (el.parentNode) el.parentNode.replaceChild(newEl, el);
        newEl.addEventListener('click', handleCloseCartClick);
      }
    });
    
    // Cart overlays
    document.querySelectorAll('.cart-panel-overlay').forEach(el => {
      if (el) {
        // Remove any existing handlers and replace with our own
        const newEl = el.cloneNode(true);
        if (el.parentNode) el.parentNode.replaceChild(newEl, el);
        newEl.addEventListener('click', handleCloseCartClick);
      }
    });
    
    // Wishlist buttons
    document.querySelectorAll('.wishlist-toggle, .wishlist-icon-container').forEach(el => {
      if (el) {
        // Remove any existing handlers and replace with our own
        const newEl = el.cloneNode(true);
        if (el.parentNode) el.parentNode.replaceChild(newEl, el);
        newEl.addEventListener('click', handleWishlistButtonClick);
      }
    });
    
    // Close wishlist buttons
    document.querySelectorAll('.close-wishlist-btn').forEach(el => {
      if (el) {
        // Remove any existing handlers and replace with our own
        const newEl = el.cloneNode(true);
        if (el.parentNode) el.parentNode.replaceChild(newEl, el);
        newEl.addEventListener('click', handleCloseWishlistClick);
      }
    });
    
    // Wishlist overlays
    document.querySelectorAll('.wishlist-overlay').forEach(el => {
      if (el) {
        // Remove any existing handlers and replace with our own
        const newEl = el.cloneNode(true);
        if (el.parentNode) el.parentNode.replaceChild(newEl, el);
        newEl.addEventListener('click', handleCloseWishlistClick);
      }
    });
    
    console.log('Navigation event handlers set up');
  }

  // Make all functions available globally
  window.openCart = window.openCartDirectly;
  window.closeCart = window.closeCartDirectly;
  window.openMenu = openMenu;
  window.closeMenu = closeMenu;
  window.openMobileMenu = openMenu;
  window.closeMobileMenu = closeMenu;
  window.openWishlist = openWishlist;
  window.closeWishlist = closeWishlist;

  // Initialize when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupEventHandlers);
  } else {
    setupEventHandlers();
  }

  // Also set up on window load
  window.addEventListener('load', setupEventHandlers);
  
  // Run setup now
  setupEventHandlers();
  
  console.log('Navigation coordinator initialized');
})();