
// First Visit Banner Modal Handler
(function() {
    'use strict';

    // Check if user has visited before
    const hasVisited = localStorage.getItem('hasVisitedBefore');

    if (!hasVisited) {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', showBanner);
        } else {
            showBanner();
        }
    }

    function showBanner() {
        // Show modal after a short delay for better UX
        setTimeout(() => {
            const modal = document.getElementById('firstVisitModal');
            if (modal) {
                modal.classList.add('show');
            }
        }, 1000);
    }

    // Close modal function
    window.closeFirstVisitModal = function() {
        const modal = document.getElementById('firstVisitModal');
        if (modal) {
            modal.classList.remove('show');
            // Mark as visited
            localStorage.setItem('hasVisitedBefore', 'true');
        }
    };

    // Close on overlay click
    document.addEventListener('click', function(e) {
        const modal = document.getElementById('firstVisitModal');
        if (e.target === modal) {
            closeFirstVisitModal();
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeFirstVisitModal();
        }
    });
})();
