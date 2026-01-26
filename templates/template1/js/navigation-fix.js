// Enhanced Navigation Fix for Extensionless Paths and Subdomains
(function() {
    console.log("Navigation fix initialized");
    
    // Function to handle link clicks
    function handleNavigation(e) {
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');
        
        // Skip if it's an external link, anchor, or already a full URL
        if (!href || href.startsWith('http') || href.startsWith('//') || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
            return;
        }

        console.log("Navigating to:", href);
        
        // Force the browser to treat the path as a fresh navigation relative to the current subdomain root
        // Use an absolute path from the origin to ensure it works from any nesting level
        if (href.startsWith('/')) {
            e.preventDefault();
            const targetUrl = window.location.origin + href;
            console.log("Redirecting to:", targetUrl);
            window.location.href = targetUrl;
        }
    }

    // Add click event listener to document
    document.addEventListener('click', handleNavigation, true);
})();
