// Navigation Fix Version 5 - Absolute Origin Locking
(function() {
    console.log("Navigation fix V5 initialized");
    
    // Use the origin from the current window location
    const currentOrigin = window.location.origin;
    console.log("Current origin locked to:", currentOrigin);

    function handleNavigation(e) {
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');
        
        // Ignore hashes, externals, and special protocols
        if (!href || href === '#' || href.startsWith('http') || href.startsWith('//') || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
            return;
        }

        console.log("Processing link click:", href);
        
        // Ensure path starts with /
        let path = href;
        if (!path.startsWith('/')) {
            path = '/' + path;
        }

        // Create absolute URL using the locked origin
        const finalUrl = currentOrigin + path;
        console.log("Forcing navigation to:", finalUrl);
        
        e.preventDefault();
        e.stopImmediatePropagation();
        window.location.href = finalUrl;
    }

    // Use capture phase (true) to intercept before other scripts
    document.addEventListener('click', handleNavigation, true);
})();
