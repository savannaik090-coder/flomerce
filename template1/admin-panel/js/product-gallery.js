/**
 * Product Gallery - Thumbnail Image Gallery Functionality
 * Allows users to click on thumbnail images to change the main product image
 */

document.addEventListener('DOMContentLoaded', function() {
    // Get all thumbnail elements
    const thumbnails = document.querySelectorAll('.thumbnail');
    const mainImage = document.querySelector('.main-product-image');
    
    if (thumbnails.length > 0 && mainImage) {
        // Add click event listener to each thumbnail
        thumbnails.forEach(thumbnail => {
            thumbnail.addEventListener('click', function() {
                // Remove active class from all thumbnails
                thumbnails.forEach(thumb => thumb.classList.remove('active'));
                
                // Add active class to the clicked thumbnail
                this.classList.add('active');
                
                // Get the image path from the data attribute
                const imagePath = this.getAttribute('data-image');
                
                // Update the main image source
                mainImage.src = imagePath;
                
                // Add a subtle animation to show the image is changing
                mainImage.style.opacity = '0.7';
                setTimeout(() => {
                    mainImage.style.opacity = '1';
                }, 200);
            });
        });
        
        // Add hover effect for better user experience
        thumbnails.forEach(thumbnail => {
            thumbnail.addEventListener('mouseenter', function() {
                if (!this.classList.contains('active')) {
                    this.style.transform = 'scale(1.05)';
                    this.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                }
            });
            
            thumbnail.addEventListener('mouseleave', function() {
                if (!this.classList.contains('active')) {
                    this.style.transform = 'scale(1)';
                    this.style.boxShadow = 'none';
                }
            });
        });
        
        console.log('Product gallery thumbnail functionality initialized');
    }
});
/**
 * Product Gallery Enhancement
 * Handles image zoom, navigation, and interactive features
 */

class ProductGallery {
    constructor() {
        this.currentImageIndex = 0;
        this.images = [];
        this.isZoomed = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupKeyboardNavigation();
        this.setupTouchGestures();
    }

    setImages(images) {
        this.images = images || [];
        this.currentImageIndex = 0;
        this.updateGallery();
    }

    setupEventListeners() {
        // Main image click for zoom
        document.addEventListener('click', (e) => {
            if (e.target.closest('.main-image img')) {
                this.toggleZoom();
            }
        });

        // Thumbnail clicks
        document.addEventListener('click', (e) => {
            const thumbnail = e.target.closest('.thumbnail');
            if (thumbnail) {
                const index = Array.from(thumbnail.parentNode.children).indexOf(thumbnail);
                this.showImage(index);
            }
        });

        // Close zoom on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isZoomed) {
                this.closeZoom();
            }
        });
    }

    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            if (this.images.length <= 1) return;

            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.previousImage();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.nextImage();
                    break;
            }
        });
    }

    setupTouchGestures() {
        let startX = 0;
        let startY = 0;

        const mainImage = document.querySelector('.main-image');
        if (!mainImage) return;

        mainImage.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }, { passive: true });

        mainImage.addEventListener('touchend', (e) => {
            if (!startX || !startY) return;

            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;

            const diffX = startX - endX;
            const diffY = startY - endY;

            // Ignore if vertical swipe
            if (Math.abs(diffY) > Math.abs(diffX)) return;

            // Minimum swipe distance
            if (Math.abs(diffX) < 50) return;

            if (diffX > 0) {
                this.nextImage();
            } else {
                this.previousImage();
            }

            startX = 0;
            startY = 0;
        }, { passive: true });
    }

    showImage(index) {
        if (index < 0 || index >= this.images.length) return;

        this.currentImageIndex = index;
        const image = this.images[index];

        // Update main image
        const mainImg = document.querySelector('.main-image img');
        if (mainImg && image) {
            mainImg.src = this.getImageUrl(image.url);
            mainImg.alt = image.alt || 'Product image';
        }

        // Update active thumbnail
        document.querySelectorAll('.thumbnail').forEach((thumb, i) => {
            thumb.classList.toggle('active', i === index);
        });
    }

    nextImage() {
        if (this.images.length <= 1) return;
        const nextIndex = (this.currentImageIndex + 1) % this.images.length;
        this.showImage(nextIndex);
    }

    previousImage() {
        if (this.images.length <= 1) return;
        const prevIndex = (this.currentImageIndex - 1 + this.images.length) % this.images.length;
        this.showImage(prevIndex);
    }

    toggleZoom() {
        const mainImageContainer = document.querySelector('.main-image');
        if (!mainImageContainer) return;

        if (this.isZoomed) {
            this.closeZoom();
        } else {
            this.openZoom();
        }
    }

    openZoom() {
        const mainImageContainer = document.querySelector('.main-image');
        if (!mainImageContainer) return;

        mainImageContainer.classList.add('zoom');
        this.isZoomed = true;

        // Add overlay
        const overlay = document.createElement('div');
        overlay.className = 'zoom-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 1000;
            cursor: zoom-out;
        `;

        overlay.addEventListener('click', () => this.closeZoom());
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';
    }

    closeZoom() {
        const mainImageContainer = document.querySelector('.main-image');
        const overlay = document.querySelector('.zoom-overlay');

        if (mainImageContainer) {
            mainImageContainer.classList.remove('zoom');
        }

        if (overlay) {
            overlay.remove();
        }

        this.isZoomed = false;
        document.body.style.overflow = '';
    }

    getImageUrl(imagePath) {
        if (!imagePath) return '';
        
        // If it's already a full URL, return as is
        if (imagePath.startsWith('http')) {
            return imagePath;
        }
        
        // Use image proxy for Firebase Storage images
        return `/.netlify/functions/image-proxy?path=${encodeURIComponent(imagePath)}`;
    }

    updateGallery() {
        if (this.images.length > 0) {
            this.showImage(0);
        }
    }
}

// Initialize gallery when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.productGallery = new ProductGallery();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProductGallery;
}
