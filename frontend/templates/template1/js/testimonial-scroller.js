/**
 * Auric Video Player Functionality
 * 
 * This script adds functionality to video sections:
 * 1. Buy and Watch video section
 * 2. Customer Testimonials section
 * with custom play button controls and ensuring only one video plays at a time
 */

console.log('🎬 testimonial-scroller.js loaded');

/**
 * Load Watch & Buy videos from Firestore (dynamic unlimited version)
 */
async function loadWatchBuyVideos() {
    const videoContainer = document.getElementById('dynamic-watch-buy-videos');
    if (!videoContainer) return;

    try {
        // First try the collection used by admin panel
        let snapshot = await db.collection('watch_buy_videos').orderBy('createdAt', 'desc').get();
        
        // If empty, try the other possible collection name
        if (snapshot.empty) {
            snapshot = await db.collection('watchBuyVideos').orderBy('uploadedAt', 'desc').get();
        }
        
        const loadingSpinner = document.getElementById('watch-buy-loading-spinner');
        if (loadingSpinner) loadingSpinner.remove();

        // Clear EVERYTHING inside the container before adding new items
        // This ensures no hardcoded demo data from HTML remains
        videoContainer.innerHTML = '';

        if (snapshot.empty) {
            videoContainer.innerHTML = '<div style="width: 100%; text-align: center; padding: 20px;">Coming soon...</div>';
            return;
        }

        snapshot.forEach((doc, index) => {
            const videoData = doc.data();
            const sku = videoData.productSKU || videoData.sku || '';
            const videoItem = document.createElement('div');
            videoItem.className = 'testimonial-item';
            videoItem.innerHTML = `
                <div class="video-container">
                    <div class="play-button-overlay">
                        <div class="play-button">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M8 5.14v14l11-7-11-7z" fill="#ffffff"/>
                            </svg>
                        </div>
                    </div>
                    <video class="testimonial-video" loop playsinline>
                        <source src="${videoData.videoUrl}" type="video/mp4">
                    </video>
                    <div class="video-product-link-placeholder" style="position: absolute; bottom: 20px; left: 20px; background: rgba(255, 255, 255, 0.95); padding: 12px 16px; border-radius: 8px; min-width: 250px; z-index: 5;">
                        <span style="font-size: 12px; color: #666;">⏳ Loading product link...</span>
                    </div>
                </div>
            `;
            videoContainer.appendChild(videoItem);
            
            // Link product after adding to DOM
            if (sku) {
                updateDynamicVideoProductLink(videoItem, sku);
            }
        });

        // Re-initialize video controls for newly added elements
        initBuyAndWatchVideos();

    } catch (error) {
        console.error('Error loading dynamic videos:', error);
    }
}

async function updateDynamicVideoProductLink(container, sku) {
    try {
        const categories = [
            'featured-collection', 'new-arrivals', 'saree-collection',
            'gold-necklace', 'silver-necklace', 'meenakari-necklace',
            'gold-earrings', 'silver-earrings', 'meenakari-earrings',
            'gold-bangles', 'silver-bangles', 'meenakari-bangles',
            'gold-rings', 'silver-rings', 'meenakari-rings'
        ];
        
        let productDetails = null;

        // Use the categories parameter to fetch all at once for better performance and reliability
        const categoriesQuery = categories.join(',');
        const response = await fetch(`/.netlify/functions/load-products?categories=${categoriesQuery}`);
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.products) {
                // Find by id (SKU)
                productDetails = data.products.find(p => p.id === sku);
            }
        }

        const placeholder = container.querySelector('.video-product-link-placeholder');
        if (!placeholder) return;

        const productLinkAnchor = document.createElement('a');
        productLinkAnchor.className = 'video-product-link';
        productLinkAnchor.href = `product-detail.html?id=${encodeURIComponent(sku)}`;
        productLinkAnchor.style.cssText = `
            position: absolute; bottom: 20px; left: 20px;
            background: rgba(255, 255, 255, 0.95); padding: 12px 16px;
            border-radius: 8px; cursor: pointer; transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 250px;
            text-decoration: none; display: block; z-index: 10;
        `;

        if (productDetails) {
            const productImage = productDetails.image || productDetails.mainImage || (productDetails.images && productDetails.images[0]?.url) || 'images/logos/royalmeenakari.png';
            const productPrice = productDetails.price ? `₹${productDetails.price.toLocaleString()}` : 'Price on request';
            
            productLinkAnchor.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${productImage}" 
                         style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">
                    <div style="flex: 1;">
                        <div style="font-weight: 600; font-size: 14px; color: #333; margin-bottom: 4px;">${productDetails.name}</div>
                        <div style="font-size: 13px; color: #693208; font-weight: 500;">${productPrice}</div>
                    </div>
                </div>
            `;
        } else {
            productLinkAnchor.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 50px; height: 50px; background: #f8f9fa; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                        <img src="images/logos/royalmeenakari.png" style="width: 30px; height: 30px; object-fit: contain;">
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; font-size: 14px; color: #333;">View Product</div>
                        <div style="font-size: 12px; color: #666;">SKU: ${sku}</div>
                    </div>
                </div>
            `;
        }
        
        // Add click handler to ensure link works even if nested
        productLinkAnchor.addEventListener('click', (e) => {
            window.location.href = productLinkAnchor.href;
        });
        
        placeholder.replaceWith(productLinkAnchor);

    } catch (error) {
        console.error('Error updating product link:', error);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    initBuyAndWatchVideos();
    initCustomerTestimonialVideos();
    
    let apiCheckAttempts = 0;
    function waitForapiAndLoad() {
        if (typeof api !== 'undefined' && typeof db !== 'undefined') {
            loadWatchBuyVideos();
        } else if (apiCheckAttempts < 20) {
            apiCheckAttempts++;
            setTimeout(waitForapiAndLoad, 200);
        }
    }
    waitForapiAndLoad();
});


/**
 * Update a video's product link
 */
async function updateVideoProductLink(videoNumber, sku, productName) {
    // Find the video container
    const videoContainers = document.querySelectorAll('.testimonial-item');
    if (!videoContainers[videoNumber - 1]) {
        console.warn(`Video container ${videoNumber} not found`);
        return;
    }

    const videoContainer = videoContainers[videoNumber - 1];

    // Fetch product details to get image and price
    try {
        // Search in all possible categories
        const categories = [
            'featured-collection', 
            'new-arrivals', 
            'saree-collection',
            'gold-necklace',
            'silver-necklace',
            'meenakari-necklace',
            'gold-earrings',
            'silver-earrings',
            'meenakari-earrings',
            'gold-bangles',
            'silver-bangles',
            'meenakari-bangles',
            'gold-rings',
            'silver-rings',
            'meenakari-rings'
        ];
        let productDetails = null;

        for (const category of categories) {
            try {
                const response = await fetch(`/.netlify/functions/load-products?category=${category}`);
                if (response.ok) {
                    const data = await response.json();

                    if (data.success && data.products && data.products.length > 0) {
                        // Find the product with matching SKU
                        productDetails = data.products.find(p => p.id === sku);

                        if (productDetails) {
                            console.log(`Found product ${sku} in category ${category}:`, productDetails);
                            // Ensure the product has all necessary fields
                            if (!productDetails.image && productDetails.mainImage) {
                                productDetails.image = productDetails.mainImage;
                            } else if (!productDetails.image && productDetails.images && productDetails.images.length > 0) {
                                productDetails.image = productDetails.images[0].url;
                            }
                            break;
                        }
                    }
                }
            } catch (error) {
                console.error(`Error loading from category ${category}:`, error);
                continue;
            }
        }

        // Remove any existing product link first
        const existingProductLink = videoContainer.querySelector('.video-product-link');
        if (existingProductLink) {
            existingProductLink.remove();
        }

        // Create product link with SKU - even if full details aren't found
        // This ensures the link always works and navigates to product detail page
        const productLinkAnchor = document.createElement('a');
        productLinkAnchor.className = 'video-product-link';
        productLinkAnchor.href = `product-detail.html?id=${encodeURIComponent(sku)}`;
        productLinkAnchor.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 20px;
            background: rgba(255, 255, 255, 0.95);
            padding: 12px 16px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            max-width: 250px;
            text-decoration: none;
            display: block;
            z-index: 10;
        `;

        // If we have full product details, show them. Otherwise show fallback with product name from Firestore
        if (productDetails) {
            console.log(`✓ Found product details for ${sku}`);
            productLinkAnchor.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${productDetails.image || productDetails.mainImage}" alt="${productDetails.name}" 
                         style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">
                    <div style="flex: 1;">
                        <div style="font-weight: 600; font-size: 14px; color: #333; margin-bottom: 4px;">
                            ${productDetails.name}
                        </div>
                        <div style="font-size: 13px; color: #693208; font-weight: 500;">
                            ₹${productDetails.price.toLocaleString()}
                        </div>
                    </div>
                </div>
            `;
        } else {
            console.warn(`⚠️ Product details not found for SKU ${sku}, using fallback display`);
            // Use product name from Firestore or a generic message
            const displayName = productName || 'View Product';
            productLinkAnchor.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-gem" style="color: white; font-size: 20px;"></i>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; font-size: 14px; color: #333; margin-bottom: 4px;">
                            ${displayName}
                        </div>
                        <div style="font-size: 12px; color: #666;">
                            SKU: ${sku}
                        </div>
                    </div>
                </div>
            `;
        }

        // Add click handler with multiple fallback methods for reliable navigation
        productLinkAnchor.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const targetUrl = `product-detail.html?id=${encodeURIComponent(sku)}`;
            
            console.log('🔗 VIDEO PRODUCT LINK CLICKED');
            console.log('📹 Video Number:', videoNumber);
            console.log('📦 Product SKU:', sku);
            console.log('📝 Product Name:', productName || 'Not found');
            console.log('🎯 Target URL:', targetUrl);
            console.log('🌐 Current Page:', window.location.href);
            
            // Try immediate navigation first
            try {
                // Method 1: Direct assignment (most reliable)
                window.location.href = targetUrl;
                console.log('✅ Navigation initiated via location.href');
            } catch (navError) {
                console.error('❌ Navigation error:', navError);
                // Method 2: Fallback with timeout
                setTimeout(() => {
                    try {
                        window.location.assign(targetUrl);
                        console.log('✅ Navigation initiated via location.assign (fallback)');
                    } catch (fallbackError) {
                        console.error('❌ Fallback navigation error:', fallbackError);
                        // Method 3: Last resort - open in new tab
                        window.open(targetUrl, '_self');
                    }
                }, 10);
            }
        });

        // Append to video container
        const videoWrapper = videoContainer.querySelector('.video-container');
        if (videoWrapper) {
            console.log(`📍 Found video wrapper for video ${videoNumber}`);
            
            // First append the new link
            videoWrapper.appendChild(productLinkAnchor);
            console.log(`➕ New product link appended for video ${videoNumber}`);
            
            // Then remove any old links (but not the one we just added)
            const existingLinks = videoWrapper.querySelectorAll('.video-product-link');
            let removedCount = 0;
            existingLinks.forEach(link => {
                if (link !== productLinkAnchor) {
                    link.remove();
                    removedCount++;
                }
            });
            if (removedCount > 0) {
                console.log(`🗑️ Removed ${removedCount} old product link(s)`);
            }
            
            // Remove placeholder after new link is added
            const placeholder = videoWrapper.querySelector('.video-product-link-placeholder');
            if (placeholder) {
                placeholder.remove();
                console.log(`🗑️ Placeholder removed for video ${videoNumber}`);
            }
            
            console.log(`✅ Product link added for video ${videoNumber}, SKU: ${sku}`);
            console.log(`🔗 Link href:`, productLinkAnchor.href);
            console.log(`🎨 Link styles:`, productLinkAnchor.style.cssText);
        } else {
            console.error(`❌ Video wrapper not found for video ${videoNumber}`);
            console.log(`❌ Video container structure:`, videoContainer.innerHTML.substring(0, 200));
        }

    } catch (error) {
        console.error(`❌ Error fetching product details for video ${videoNumber}:`, error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
    }
}

function initBuyAndWatchVideos() {
    const scrollContainer = document.querySelector('.testimonials-scroll');

    // Exit if the container doesn't exist on this page
    if (!scrollContainer) return;

    const videoContainers = scrollContainer.querySelectorAll('.video-container');
    const videos = scrollContainer.querySelectorAll('.testimonial-video');

    // Navigation buttons removed - using natural scroll behavior

    // Add scroll focus detection for video transitions
    const addScrollFocusEffect = () => {
        const observerOptions = {
            root: scrollContainer,
            rootMargin: '0px',
            threshold: 0.7 // Video needs to be 70% visible to be considered "in focus"
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const videoItem = entry.target;
                if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
                    // Video is in focus
                    videoItem.classList.add('in-focus');
                } else {
                    // Video is out of focus
                    videoItem.classList.remove('in-focus');
                }
            });
        }, observerOptions);

        // Observe all video items
        const videoItems = scrollContainer.querySelectorAll('.testimonial-item');
        videoItems.forEach(item => {
            observer.observe(item);
        });
    };

    // Initialize scroll focus effect
    addScrollFocusEffect();

    // Initially center the second video
    setTimeout(() => {
        const videoItems = scrollContainer.querySelectorAll('.testimonial-item');
        if (videoItems.length >= 2) {
            const secondVideo = videoItems[1];
            const containerCenter = scrollContainer.clientWidth / 2;
            const videoCenter = secondVideo.offsetLeft + (secondVideo.offsetWidth / 2);
            const scrollPosition = videoCenter - containerCenter;

            scrollContainer.scrollTo({
                left: scrollPosition,
                behavior: 'smooth'
            });
            console.log('Initially centering second video at position:', scrollPosition);
        }
    }, 500); // Short delay to ensure elements are rendered

    // Set up play button functionality
    videoContainers.forEach((container, index) => {
        const video = container.querySelector('.testimonial-video');
        const playButton = container.querySelector('.play-button');
        const playButtonOverlay = container.querySelector('.play-button-overlay');

        // Add initial transition setup
        container.classList.remove('playing');

        // Click on play button or video container plays the video
        container.addEventListener('click', function(e) {
            // Don't trigger if clicking on the link icon
            if (e.target.closest('.video-link-icon')) return;

            if (video.paused) {
                // First pause all other videos and remove playing class
                videos.forEach(v => {
                    if (v !== video && !v.paused) {
                        v.pause();
                        // Show play button on other videos
                        v.closest('.video-container').querySelector('.play-button-overlay').style.display = 'flex';
                        // Remove playing class
                        v.closest('.video-container').classList.remove('playing');
                    }
                });

                // Add playing class with smooth transition
                container.classList.add('playing');

                // Then play this video
                video.play();
                // Hide play button when playing
                playButtonOverlay.style.display = 'none';
            } else {
                // Pause the video
                video.pause();
                // Show play button when paused
                playButtonOverlay.style.display = 'flex';
                // Remove playing class
                container.classList.remove('playing');
            }
        });

        // When video ends, show play button again
        video.addEventListener('ended', function() {
            playButtonOverlay.style.display = 'flex';
        });

        // Make testimonial videos play one at a time
        video.addEventListener('play', function() {
            // Hide play button when playing
            playButtonOverlay.style.display = 'none';

            // Pause all other videos
            videos.forEach(v => {
                if (v !== video && !v.paused) {
                    v.pause();
                    // Show play button on other videos
                    v.closest('.video-container').querySelector('.play-button-overlay').style.display = 'flex';
                }
            });
        });

        // Show play button when video is paused
        video.addEventListener('pause', function() {
            playButtonOverlay.style.display = 'flex';
        });
    });
}

function initCustomerTestimonialVideos() {
    const scrollContainer = document.querySelector('.customer-testimonials-scroll');

    // Exit if the container doesn't exist on this page
    if (!scrollContainer) return;

    const videoContainers = scrollContainer.querySelectorAll('.video-container');
    const videos = scrollContainer.querySelectorAll('.testimonial-video');

    // Navigation buttons removed - using swipe gestures only

    // Get all testimonial items
    let currentIndex = 0;
    const getTestimonialItems = () => scrollContainer.querySelectorAll('.customer-testimonial-item');

    // Function to scroll to specific testimonial with precise positioning
    const scrollToTestimonial = (index) => {
        const items = getTestimonialItems();
        if (index >= 0 && index < items.length) {
            const targetItem = items[index];
            const containerWidth = scrollContainer.clientWidth;
            const itemWidth = targetItem.offsetWidth;
            const gap = 20;

            // Calculate exact center position
            const itemLeft = targetItem.offsetLeft;
            const scrollPosition = itemLeft - (containerWidth / 2) + (itemWidth / 2);

            // Use immediate positioning to prevent multiple scrolls
            scrollContainer.style.scrollBehavior = 'auto';
            scrollContainer.scrollLeft = Math.max(0, scrollPosition);

            // Re-enable smooth scrolling after positioning
            setTimeout(() => {
                scrollContainer.style.scrollBehavior = 'smooth';
            }, 50);

            currentIndex = index;
        }
    };

    // Disable default scroll behavior completely and handle all touch events manually
    let startX = 0;
    let startY = 0;
    let isSwipeDetected = false;
    let swipeThreshold = 30; // Minimum distance for swipe
    let isProcessingSwipe = false;

    // Disable native scrolling
    scrollContainer.style.overflowX = 'hidden';

    scrollContainer.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isSwipeDetected = false;
        isProcessingSwipe = false;
    }, { passive: true });

    scrollContainer.addEventListener('touchmove', (e) => {
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const diffX = Math.abs(currentX - startX);
        const diffY = Math.abs(currentY - startY);

        // Check if this is a horizontal swipe
        if (diffX > diffY && diffX > 10) {
            e.preventDefault(); // Prevent any default scrolling
            isSwipeDetected = true;
        }
    }, { passive: false });

    scrollContainer.addEventListener('touchend', (e) => {
        if (!isSwipeDetected || isProcessingSwipe) return;

        const endX = e.changedTouches[0].clientX;
        const diffX = startX - endX;

        // Check if swipe distance meets threshold
        if (Math.abs(diffX) > swipeThreshold) {
            isProcessingSwipe = true;
            const items = getTestimonialItems();

            if (diffX > 0 && currentIndex < items.length - 1) {
                // Swiped left - go to next video
                scrollToTestimonial(currentIndex + 1);
            } else if (diffX < 0 && currentIndex > 0) {
                // Swiped right - go to previous video
                scrollToTestimonial(currentIndex - 1);
            }

            // Reset processing flag after animation completes
            setTimeout(() => {
                isProcessingSwipe = false;
            }, 500);
        }

        isSwipeDetected = false;
    }, { passive: true });

    // Also disable mouse wheel scrolling for consistency
    scrollContainer.addEventListener('wheel', (e) => {
        e.preventDefault();

        if (isProcessingSwipe) return;

        isProcessingSwipe = true;
        const items = getTestimonialItems();

        if (e.deltaX > 0 && currentIndex < items.length - 1) {
            // Scroll right - go to next video
            scrollToTestimonial(currentIndex + 1);
        } else if (e.deltaX < 0 && currentIndex > 0) {
            // Scroll left - go to previous video
            scrollToTestimonial(currentIndex - 1);
        }

        setTimeout(() => {
            isProcessingSwipe = false;
        }, 500);
    }, { passive: false });

    // Initial scroll position - center on the first video
    setTimeout(() => {
        scrollToTestimonial(0);
    }, 300);

    // Navigation is now handled purely through swipe gestures
    // Track current position for scroll snap behavior
    let scrollTimeout;
    scrollContainer.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            // Find which testimonial is most visible
            const items = getTestimonialItems();
            const containerLeft = scrollContainer.scrollLeft;
            const containerCenter = containerLeft + scrollContainer.clientWidth / 2;

            let closestIndex = 0;
            let closestDistance = Infinity;

            items.forEach((item, index) => {
                const itemCenter = item.offsetLeft + item.offsetWidth / 2;
                const distance = Math.abs(containerCenter - itemCenter);

                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestIndex = index;
                }
            });

            currentIndex = closestIndex;
        }, 100);
    });

    // Set up play button functionality
    videoContainers.forEach((container, index) => {
        const video = container.querySelector('.testimonial-video');
        const playButton = container.querySelector('.customer-play-button');
        const playButtonOverlay = container.querySelector('.play-button-overlay');

        // Click on play button or video container plays the video
        container.addEventListener('click', function(e) {
            if (video.paused) {
                // First pause all other videos
                videos.forEach(v => {
                    if (v !== video && !v.paused) {
                        v.pause();
                        // Show play button on other videos
                        v.closest('.video-container').querySelector('.play-button-overlay').style.display = 'flex';
                    }
                });

                // Then play this video
                video.play();
                // Hide play button when playing
                playButtonOverlay.style.display = 'none';
            } else {
                // Pause the video
                video.pause();
                // Show play button when paused
                playButtonOverlay.style.display = 'flex';
            }
        });

        // When video ends, show play button again
        video.addEventListener('ended', function() {
            playButtonOverlay.style.display = 'flex';
        });

        // Make testimonial videos play one at a time
        video.addEventListener('play', function() {
            // Hide play button when playing
            playButtonOverlay.style.display = 'none';

            // Pause all other videos
            videos.forEach(v => {
                if (v !== video && !v.paused) {
                    v.pause();
                    // Show play button on other videos
                    v.closest('.video-container').querySelector('.play-button-overlay').style.display = 'flex';
                }
            });
        });

        // Show play button when video is paused
        video.addEventListener('pause', function() {
            playButtonOverlay.style.display = 'flex';
        });
    });
}