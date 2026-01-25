
/**
 * Customer Reviews Horizontal Scroll and Image Modal
 */

document.addEventListener('DOMContentLoaded', function() {
    const leftArrow = document.getElementById('reviewsScrollLeft');
    const rightArrow = document.getElementById('reviewsScrollRight');
    const container = document.getElementById('reviewsScrollContainer');
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const closeModal = document.getElementById('imageModalClose');

    console.log('Customer reviews elements:', {
        leftArrow: leftArrow,
        rightArrow: rightArrow,
        container: container,
        modal: modal
    });

    if (!leftArrow || !rightArrow || !container) {
        console.log('Missing elements for customer reviews scroll arrows');
        return;
    }

    // Calculate scroll amount based on container width
    function getScrollAmount() {
        const containerWidth = container.clientWidth;
        const itemWidth = 370; // Item width plus gap
        return containerWidth * 0.8; // Scroll 80% of container width
    }

    // Update arrow visibility based on scroll position
    function updateArrowVisibility() {
        const maxScrollLeft = container.scrollWidth - container.clientWidth;
        
        if (leftArrow && rightArrow) {
            // Left arrow visibility
            if (container.scrollLeft <= 10) {
                leftArrow.style.opacity = '0.5';
                leftArrow.style.pointerEvents = 'none';
            } else {
                leftArrow.style.opacity = '1';
                leftArrow.style.pointerEvents = 'auto';
            }
            
            // Right arrow visibility
            if (container.scrollLeft >= maxScrollLeft - 10) {
                rightArrow.style.opacity = '0.5';
                rightArrow.style.pointerEvents = 'none';
            } else {
                rightArrow.style.opacity = '1';
                rightArrow.style.pointerEvents = 'auto';
            }
        }
    }

    // Smooth scroll function
    function smoothScroll(element, targetScrollLeft, duration = 400) {
        const startScrollLeft = element.scrollLeft;
        const distance = targetScrollLeft - startScrollLeft;
        const startTime = performance.now();

        function animation(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth animation
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            element.scrollLeft = startScrollLeft + (distance * easeProgress);

            if (progress < 1) {
                requestAnimationFrame(animation);
            } else {
                updateArrowVisibility();
            }
        }

        requestAnimationFrame(animation);
    }

    // Left arrow click handler
    leftArrow.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const scrollAmount = getScrollAmount();
        const targetScrollLeft = Math.max(0, container.scrollLeft - scrollAmount);
        
        console.log('Reviews left arrow clicked:', {
            currentScroll: container.scrollLeft,
            scrollAmount: scrollAmount,
            targetScroll: targetScrollLeft
        });
        
        smoothScroll(container, targetScrollLeft);
    });

    // Right arrow click handler
    rightArrow.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const scrollAmount = getScrollAmount();
        const maxScrollLeft = container.scrollWidth - container.clientWidth;
        const targetScrollLeft = Math.min(maxScrollLeft, container.scrollLeft + scrollAmount);
        
        console.log('Reviews right arrow clicked:', {
            currentScroll: container.scrollLeft,
            scrollAmount: scrollAmount,
            targetScroll: targetScrollLeft,
            maxScroll: maxScrollLeft
        });
        
        smoothScroll(container, targetScrollLeft);
    });

    // Listen to scroll events to update arrow visibility
    container.addEventListener('scroll', updateArrowVisibility);
    
    // Initial arrow visibility update
    updateArrowVisibility();
    
    // Update arrow visibility on window resize
    window.addEventListener('resize', updateArrowVisibility);

    // Image Modal Functionality
    function setupImageModal() {
        // Add click event to all review images
        const reviewImages = document.querySelectorAll('.review-image img');
        
        reviewImages.forEach(function(img) {
            img.addEventListener('click', function() {
                modal.style.display = 'block';
                modalImage.src = this.src;
                modalImage.alt = this.alt;
                document.body.style.overflow = 'hidden'; // Prevent background scroll
            });
        });

        // Close modal when clicking the close button
        if (closeModal) {
            closeModal.addEventListener('click', function() {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto'; // Restore scroll
            });
        }

        // Close modal when clicking outside the image
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto'; // Restore scroll
            }
        });

        // Close modal with Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.style.display === 'block') {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto'; // Restore scroll
            }
        });
    }

    // Initialize image modal functionality
    setupImageModal();

    console.log('Customer reviews scroll and modal functionality fully initialized');
});
