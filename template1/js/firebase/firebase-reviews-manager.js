
/**
 * Firebase Reviews Manager
 * Handles saving and loading product reviews in Firestore
 * Reviews are stored at path: products/{productId}/reviews/{reviewId}
 */

window.FirebaseReviewsManager = (function() {
    let db, auth;
    let initialized = false;

    function init() {
        if (initialized) return true;
        
        if (!window.firebase) {
            console.error('Firebase not available for Reviews Manager');
            return false;
        }

        try {
            db = firebase.firestore();
            auth = firebase.auth();
            initialized = true;
            console.log('Firebase Reviews Manager initialized');
            return true;
        } catch (error) {
            console.error('Error initializing Firebase Reviews Manager:', error);
            return false;
        }
    }

    /**
     * Submit a product review
     * @param {Object} reviewData - Review information
     * @returns {Promise<Object>} - Success status and review ID
     */
    async function submitReview(reviewData) {
        if (!init()) return { success: false, error: 'Firebase not initialized' };
        
        const user = auth.currentUser;
        if (!user) {
            console.error('No authenticated user found');
            return { success: false, error: 'User not authenticated' };
        }

        console.log('submitReview called with data:', reviewData);

        // Comprehensive validation with detailed error messages
        if (!reviewData.productId || reviewData.productId.trim() === '') {
            console.error('Product ID is missing or empty:', reviewData.productId);
            return { success: false, error: 'Product ID is required' };
        }

        // Check if at least one field is provided (rating, comment, or images)
        const hasRating = reviewData.rating && reviewData.rating > 0;
        const hasComment = reviewData.comment && reviewData.comment.trim().length > 0;
        const hasImages = reviewData.images && reviewData.images.length > 0;

        if (!hasRating && !hasComment && !hasImages) {
            console.error('No review content provided');
            return { success: false, error: 'Please provide at least a rating, comment, or images' };
        }

        // Validate rating if provided
        if (reviewData.rating && (reviewData.rating < 0 || reviewData.rating > 5)) {
            console.error('Invalid rating value:', reviewData.rating);
            return { success: false, error: 'Rating must be between 1 and 5' };
        }

        try {
            // Use existing review ID if editing, otherwise generate a new one
            const reviewId = reviewData.id || db.collection('temp').doc().id;
            const isEditing = !!reviewData.id;
            console.log(isEditing ? 'Updating existing review ID:' : 'Creating new review ID:', reviewId);
            
            const reviewToSave = {
                id: reviewId,
                productId: reviewData.productId.trim(),
                productName: reviewData.productName || '',
                orderId: reviewData.orderId || '',
                userId: user.uid,
                userEmail: user.email,
                userName: reviewData.userName || user.displayName || user.email.split('@')[0],
                rating: reviewData.rating ? parseInt(reviewData.rating) : 0,
                comment: reviewData.comment ? reviewData.comment.trim() : '',
                images: reviewData.images || [],
                verified: true, // Mark as verified purchase
                updatedAt: firebase.firestore.Timestamp.now()
            };

            // Only set createdAt for new reviews
            if (!isEditing) {
                reviewToSave.createdAt = firebase.firestore.Timestamp.now();
            }

            console.log('Review object to save:', reviewToSave);
            console.log('Target product ID:', reviewData.productId);

            // First, ensure the product document exists or create a placeholder
            const productRef = db.collection('products').doc(reviewData.productId.trim());
            console.log('Product reference path:', productRef.path);
            
            try {
                const productDoc = await productRef.get();
                
                if (!productDoc.exists) {
                    // Create a minimal product document if it doesn't exist
                    console.log('Creating product document for reviews:', reviewData.productId);
                    await productRef.set({
                        id: reviewData.productId,
                        name: reviewData.productName || 'Product',
                        createdAt: firebase.firestore.Timestamp.now(),
                        hasReviews: true
                    });
                    console.log('Product document created successfully');
                }
            } catch (productError) {
                console.warn('Could not create product document (non-critical):', productError);
                // Continue anyway - the review collection might work without parent document
            }

            // Save or update review in Firestore
            if (isEditing) {
                // Update existing review, merging with existing data
                console.log('Updating review at path:', `products/${reviewData.productId}/reviews/${reviewId}`);
                await productRef.collection('reviews').doc(reviewId).update(reviewToSave);
                console.log('Review updated successfully:', reviewId);
            } else {
                // Create new review
                console.log('Creating review at path:', `products/${reviewData.productId}/reviews/${reviewId}`);
                await productRef.collection('reviews').doc(reviewId).set(reviewToSave);
                console.log('Review created successfully:', reviewId);
            }
            
            return { success: true, reviewId: reviewId, review: reviewToSave };
        } catch (error) {
            console.error('Error saving review:', error);
            console.error('Error name:', error.name);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            console.error('Review data that failed:', reviewData);
            
            return { 
                success: false, 
                error: error.message,
                errorCode: error.code,
                errorName: error.name
            };
        }
    }

    /**
     * Load reviews for a product
     * @param {String} productId - Product ID
     * @returns {Promise<Object>} - Success status and reviews array
     */
    async function loadProductReviews(productId) {
        if (!init()) return { success: false, error: 'Firebase not initialized' };

        try {
            const reviewsSnapshot = await db.collection('products')
                .doc(productId)
                .collection('reviews')
                .orderBy('createdAt', 'desc')
                .get();

            const reviews = [];
            reviewsSnapshot.forEach(doc => {
                reviews.push({ id: doc.id, ...doc.data() });
            });

            console.log(`Loaded ${reviews.length} reviews for product ${productId}`);
            return { success: true, reviews: reviews };
        } catch (error) {
            console.error('Error loading reviews:', error);
            return { success: false, error: error.message, reviews: [] };
        }
    }

    /**
     * Check if user has already reviewed a product in an order
     * @param {String} productId - Product ID
     * @param {String} orderId - Order ID
     * @returns {Promise<Boolean>} - True if review exists
     */
    async function hasUserReviewed(productId, orderId) {
        if (!init()) return false;
        
        const user = auth.currentUser;
        if (!user) return false;

        try {
            const reviewsSnapshot = await db.collection('products')
                .doc(productId)
                .collection('reviews')
                .where('userId', '==', user.uid)
                .where('orderId', '==', orderId)
                .limit(1)
                .get();

            return !reviewsSnapshot.empty;
        } catch (error) {
            console.error('Error checking review status:', error);
            return false;
        }
    }

    // Initialize when script loads
    init();

    return {
        submitReview,
        loadProductReviews,
        hasUserReviewed,
        init
    };
})();
