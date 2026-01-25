
// Footer Toggle Functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('Footer toggle script loaded');
    
    // Footer section toggles
    const footerToggles = document.querySelectorAll('.footer-toggle');
    
    footerToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section');
            const content = document.getElementById(sectionId);
            const icon = this.querySelector('i');

            if (!content) {
                console.warn('Footer content not found for:', sectionId);
                return;
            }

            // Toggle active class
            this.classList.toggle('active');

            // Toggle content visibility
            content.classList.toggle('show');

            // Close other sections (accordion behavior)
            footerToggles.forEach(otherToggle => {
                if (otherToggle !== this) {
                    const otherSectionId = otherToggle.getAttribute('data-section');
                    const otherContent = document.getElementById(otherSectionId);
                    if (otherContent) {
                        otherToggle.classList.remove('active');
                        otherContent.classList.remove('show');
                    }
                }
            });
        });
    });

    // Category Subcategory Toggle Functionality
    const categoryToggleIcons = document.querySelectorAll('.category-toggle-icon');

    categoryToggleIcons.forEach(icon => {
        icon.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            // Toggle active class on icon
            this.classList.toggle('active');

            // Find the subcategory list
            const categoryItem = this.closest('.category-with-sub');
            if (!categoryItem) return;
            
            const subcategoryList = categoryItem.querySelector('.subcategory-list');

            // Toggle subcategory visibility
            if (subcategoryList) {
                subcategoryList.classList.toggle('show');
            }
        });
    });

    // Prevent category link from navigating when clicking on the category name
    const categoryHeaders = document.querySelectorAll('.category-item-header a');
    categoryHeaders.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            // Trigger the icon click instead
            const icon = this.parentElement.querySelector('.category-toggle-icon');
            if (icon) {
                icon.click();
            }
        });
    });

    console.log('Footer toggle initialized with', footerToggles.length, 'toggles');
});
