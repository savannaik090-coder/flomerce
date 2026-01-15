/**
 * Hero Slider Functionality - Auto-sliding only
 */

let currentSlideIndex = 0;
let slides, totalSlides;
let autoSlideInterval;

/**
 * Show specific slide
 * @param {number} index - Slide index to show
 */
function showSlide(index) {
    if (!slides) return;
    
    // Remove active class from all slides
    slides.forEach(slide => slide.classList.remove('active'));
    
    // Ensure index is within bounds
    if (index >= totalSlides) {
        currentSlideIndex = 0;
    } else if (index < 0) {
        currentSlideIndex = totalSlides - 1;
    } else {
        currentSlideIndex = index;
    }
    
    // Add active class to current slide
    slides[currentSlideIndex].classList.add('active');
}

/**
 * Start automatic sliding
 */
function startAutoSlide() {
    autoSlideInterval = setInterval(() => {
        showSlide(currentSlideIndex + 1);
    }, 4000); // Change slide every 4 seconds
}

/**
 * Initialize slider
 */
function initSlider() {
    // Initialize DOM elements
    slides = document.querySelectorAll('.slide');
    totalSlides = slides.length;
    
    if (totalSlides === 0) {
        console.log('No slides found');
        return;
    }
    
    console.log(`Hero slider initialized with ${totalSlides} slides`);
    
    // Show first slide
    showSlide(0);
    
    // Start auto-slide
    startAutoSlide();
    
    // Pause auto-slide on hover for better user experience
    const heroSlider = document.querySelector('.hero-slider');
    if (heroSlider) {
        heroSlider.addEventListener('mouseenter', () => {
            clearInterval(autoSlideInterval);
        });
        
        heroSlider.addEventListener('mouseleave', () => {
            startAutoSlide();
        });
    }
    
    // Add click event to shop now buttons
    const shopNowButtons = document.querySelectorAll('.shop-now-btn');
    shopNowButtons.forEach(button => {
        button.addEventListener('click', () => {
            console.log('Shop now button clicked');
            // You can redirect to a shop page or scroll to products
            document.querySelector('.new-arrivals')?.scrollIntoView({ behavior: 'smooth' });
        });
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initSlider);