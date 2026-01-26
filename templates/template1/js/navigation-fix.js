// Navigation Fix Version 7 - Subdomain Routing Optimization
(function() {
    console.log("Navigation fix V7 initialized");
    
    // Set base path for all relative links
    if (!document.querySelector('base')) {
        const base = document.createElement('base');
        base.href = '/';
        document.head.prepend(base);
    }

    function handleNavigation(e) {
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');
        
        // Ignore hashes and UI toggles
        if (!href || href === '#' || href.startsWith('#')) return;
        
        // Skip external protocols and absolute URLs
        if (href.startsWith('http') || href.startsWith('//') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

        console.log("Processing internal link:", href);
        
        // Always resolve to the root of the current subdomain
        const targetUrl = window.location.origin + (href.startsWith('/') ? href : '/' + href);
        
        console.log("Forcing navigation to:", targetUrl);
        e.preventDefault();
        window.location.href = targetUrl;
    }

    document.addEventListener('click', handleNavigation, false);
})();
