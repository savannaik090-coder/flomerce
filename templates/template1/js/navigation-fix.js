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
        // This helps overcome any internal state that might be trying to append paths or strip subdomains
        if (href.startsWith('/')) {
            e.preventDefault();
            window.location.href = window.location.origin + href;
        }
    }

    // Add click event listener to document
    document.addEventListener('click', handleNavigation, true);
})();
