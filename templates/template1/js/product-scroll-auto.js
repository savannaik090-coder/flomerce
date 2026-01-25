                    /**
                     * Auto-scroll Product Category Section
                     * Automatically scrolls the product category section to center the second product card
                     */

                    document.addEventListener('DOMContentLoaded', function() {
                        // Wait for content to load before scrolling
                        setTimeout(function() {
                            autoScrollProductCategory();
                            autoScrollNewArrivalsSection();
                        }, 1500); // Increased timeout to ensure all content is loaded
                    });

                    // Also try when window is fully loaded
                    window.addEventListener('load', function() {
                        setTimeout(function() {
                            autoScrollProductCategory();
                            autoScrollNewArrivalsSection();
                        }, 1000);
                    });

                    // Try again after products are likely loaded
                    setTimeout(function() {
                        autoScrollProductCategory();
                        autoScrollNewArrivalsSection();
                    }, 3000);

                    // Listen for new arrivals products being loaded
                    document.addEventListener('newArrivalsProductsLoaded', function() {
                        console.log('New arrivals products loaded event received, attempting auto-scroll...');
                        setTimeout(() => {
                            autoScrollNewArrivalsSection();
                        }, 500);
                    });

                    function autoScrollProductCategory() {
                        const productScrollContainer = document.querySelector('.you-may-also-like .product-scroll-container');

                        if (!productScrollContainer) {
                            console.log('Product scroll container not found');
                            return;
                        }

                        const productItems = productScrollContainer.querySelectorAll('.product-item');

                        if (productItems.length < 3) {
                            console.log('Not enough products to scroll - found:', productItems.length);
                            return;
                        }

                        console.log('Starting auto-scroll for product category section');

                        // Calculate scroll position to show 2 products scrolled past
                        const firstProduct = productItems[0];
                        const secondProduct = productItems[1];

                        if (firstProduct && secondProduct) {
                            // Ensure elements are rendered before calculating dimensions
                            setTimeout(() => {
                                const firstProductWidth = firstProduct.offsetWidth;
                                const secondProductWidth = secondProduct.offsetWidth;

                                console.log('First product width:', firstProductWidth);
                                console.log('Second product width:', secondProductWidth);

                                if (firstProductWidth === 0 || secondProductWidth === 0) {
                                    console.log('Product dimensions not ready, retrying...');
                                    setTimeout(autoScrollProductCategory, 500);
                                    return;
                                }

                                // Calculate gap between products
                                const containerStyles = window.getComputedStyle(productScrollContainer);
                                const gap = parseInt(containerStyles.gap) || 5; // Default gap from CSS

                                // Calculate scroll position to center the second product card
                                const containerWidth = productScrollContainer.clientWidth;

                                // Responsive calculation based on screen size
                                let scrollAmount;
                                if (containerWidth <= 480) {
                                    // Small mobile devices - show more of the second product
                                    scrollAmount = firstProductWidth + gap + (secondProductWidth * 0.67);
                                } else if (containerWidth <= 768) {
                                    // Medium mobile devices and tablets
                                    scrollAmount = firstProductWidth + gap + (secondProductWidth * 0.67);
                                } else {
                                    // Desktop - your original calculation works fine
                                    scrollAmount = firstProductWidth + gap + (secondProductWidth / 0);
                                }

                                console.log('Container width:', containerWidth);
                                console.log('Device type:', containerWidth <= 480 ? 'Small mobile' : containerWidth <= 768 ? 'Medium mobile' : 'Desktop');
                                console.log('Calculated scroll amount:', scrollAmount);

                                // Smooth scroll to the calculated position
                                productScrollContainer.scrollTo({
                                    left: Math.max(0, scrollAmount),
                                    behavior: 'smooth'
                                });

                                console.log('Auto-scrolled product category section to center second product');
                            }, 100);
                        }
                    }

                    function autoScrollNewArrivalsSection() {
                        // Try both possible container selectors
                        let newArrivalsScrollContainer = document.querySelector('.new-arrivals-edit .product-scroll-container');
                        if (!newArrivalsScrollContainer) {
                            newArrivalsScrollContainer = document.querySelector('.new-arrivals-edit .arrivals-grid');
                        }

                        if (!newArrivalsScrollContainer) {
                            console.log('New arrivals scroll container not found - checking for products loading...');
                            // Retry after products might be loaded
                            setTimeout(() => {
                                let retryContainer = document.querySelector('.new-arrivals-edit .product-scroll-container');
                                if (!retryContainer) {
                                    retryContainer = document.querySelector('.new-arrivals-edit .arrivals-grid');
                                }
                                if (retryContainer) {
                                    console.log('New arrivals container found on retry, attempting scroll...');
                                    autoScrollNewArrivalsSection();
                                } else {
                                    console.log('New arrivals container still not found after retry');
                                }
                            }, 2000);
                            return;
                        }

                        const productItems = newArrivalsScrollContainer.querySelectorAll('.product-item, .arrival-item');

                        if (productItems.length < 2) {
                            console.log('Not enough new arrivals products to scroll - found:', productItems.length);
                            // Retry after a delay in case products are still loading
                            setTimeout(() => {
                                const retryItems = newArrivalsScrollContainer.querySelectorAll('.product-item, .arrival-item');
                                if (retryItems.length >= 2) {
                                    console.log('Products loaded on retry, attempting scroll...');
                                    autoScrollNewArrivalsSection();
                                }
                            }, 1500);
                            return;
                        }

                        console.log('Starting auto-scroll for new arrivals section with', productItems.length, 'products');

                        // Calculate scroll position to center the 3rd product
                        const firstProduct = productItems[0];
                        const secondProduct = productItems[1];
                        const thirdProduct = productItems[2];

                        if (firstProduct && secondProduct && thirdProduct) {
                            // Ensure elements are rendered before calculating dimensions
                            setTimeout(() => {
                                const firstProductWidth = firstProduct.offsetWidth;
                                const secondProductWidth = secondProduct.offsetWidth;
                                const thirdProductWidth = thirdProduct.offsetWidth;

                                console.log('New arrivals - First product width:', firstProductWidth);
                                console.log('New arrivals - Second product width:', secondProductWidth);
                                console.log('New arrivals - Third product width:', thirdProductWidth);

                                if (firstProductWidth === 0 || secondProductWidth === 0 || thirdProductWidth === 0) {
                                    console.log('New arrivals product dimensions not ready, retrying...');
                                    setTimeout(autoScrollNewArrivalsSection, 500);
                                    return;
                                }

                                // Calculate gap between products
                                const containerStyles = window.getComputedStyle(newArrivalsScrollContainer);
                                const gap = parseInt(containerStyles.gap) || 15; // Default gap from CSS

                                // Calculate scroll position to center the third product card
                                const containerWidth = newArrivalsScrollContainer.clientWidth;

                                // To center the 3rd product: align the center of the 3rd product with the center of the viewport
                                // Position of 3rd product center from left = first + gap + second + gap + (third/2)
                                // Subtract half the container width to align centers
                                const thirdProductCenterPosition = firstProductWidth + gap + secondProductWidth + gap + (thirdProductWidth / 2);
                                const scrollAmount = thirdProductCenterPosition - (containerWidth / 2);

                                console.log('New arrivals - Container width:', containerWidth);
                                console.log('New arrivals - First product width:', firstProductWidth);
                                console.log('New arrivals - Second product width:', secondProductWidth);
                                console.log('New arrivals - Third product width:', thirdProductWidth);
                                console.log('New arrivals - Gap:', gap);
                                console.log('New arrivals - Calculated scroll amount:', scrollAmount);

                                // Smooth scroll to the calculated position
                                newArrivalsScrollContainer.scrollTo({
                                    left: Math.max(0, scrollAmount),
                                    behavior: 'smooth'
                                });

                                console.log('Auto-scrolled new arrivals section to center third product');
                            }, 200);
                        }
                    }

                    // Make functions globally available
                    window.autoScrollProductCategory = autoScrollProductCategory;
                    window.autoScrollNewArrivalsSection = autoScrollNewArrivalsSection;