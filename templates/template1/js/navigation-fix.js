// Navigation Fix Version 6 - Ultra-Safe for Menu Toggles and Subdomains
(function() {
    console.log("Navigation fix V6 initialized");
    
    function handleNavigation(e) {
        // Find the closest anchor tag
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');
        
        // 1. CRITICAL: NEVER INTERCEPT MENU TOGGLES OR HASH LINKS
        // If it starts with # or is just #, let the other scripts handle it
        if (!href || href === '#' || href.startsWith('#')) {
            return;
        }

        // 2. SKIP EXTERNAL LINKS
        if (href.startsWith('http') || href.startsWith('//') || href.startsWith('mailto:') || href.startsWith('tel:')) {
            return;
        }

        // 3. LOCK TO SUBDOMAIN
        // If it's a relative path, force it to be absolute from the subdomain origin
        console.log("Processing link click:", href);
        
        let path = href;
        if (!path.startsWith('/')) {
            path = '/' + path;
        }

        // Force browser to stay on current subdomain
        const targetUrl = window.location.origin + path;
        console.log("Redirecting to:", targetUrl);
        
        e.preventDefault();
        // Use assign to ensure a clean history state and bypass some router intercepts
        window.location.assign(targetUrl);
    }

    // Use bubbling phase (false) to allow specific button handlers (like menu toggle) 
    // to stopPropagation if they need to, but we'll catch regular links.
    document.addEventListener('click', handleNavigation, false);
})();
