// Enhanced Navigation Fix for Extensionless Paths and Subdomains
(function() {
    console.log("Navigation fix initialized - improved for deep links");
    
    // Function to handle link clicks
    function handleNavigation(e) {
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');
        
        // Skip if it's an external link, anchor, or already a full URL
        // CRITICAL: If href is just "#", it might be a menu toggle, DON'T intercept it
        if (!href || href === '#' || href.startsWith('http') || href.startsWith('//') || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
            return;
        }

        console.log("Navigating to:", href);
        
        // Handle path resolution
        let targetPath = href;
        if (!targetPath.startsWith('/')) {
            // Convert relative path to absolute-like based on current origin root
            // This prevents nesting like /about-us/new-arrivals
            targetPath = '/' + targetPath;
        }

        // Force navigation to stay within the current subdomain origin
        e.preventDefault();
        const targetUrl = window.location.origin + targetPath;
        console.log("Redirecting to:", targetUrl);
        window.location.href = targetUrl;
    }

    // Add click event listener to document
    document.addEventListener('click', handleNavigation, true);
})();
