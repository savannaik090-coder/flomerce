// Enhanced Navigation Fix for Extensionless Paths and Subdomains
(function() {
    console.log("Navigation fix initialized - Version 4 (Deep Link Resolution)");
    
    function handleNavigation(e) {
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');
        
        // Skip specialized links and menu toggles
        if (!href || href === '#' || href.startsWith('http') || href.startsWith('//') || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
            return;
        }

        console.log("Processing navigation to:", href);
        
        // Resolve target path to be root-relative
        let targetPath = href;
        if (!targetPath.startsWith('/')) {
            targetPath = '/' + targetPath;
        }

        // Use absolute location for navigation
        const targetUrl = window.location.origin + targetPath;
        console.log("Redirecting to:", targetUrl);
        
        e.preventDefault();
        e.stopPropagation();
        window.location.assign(targetUrl);
    }

    document.addEventListener('click', handleNavigation, true);
})();
