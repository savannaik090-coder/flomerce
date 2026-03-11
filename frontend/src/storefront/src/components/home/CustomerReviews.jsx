import React, { useRef, useState } from 'react';
import { useSiteConfig } from '../../hooks/useSiteConfig.js';
import { resolveImageUrl } from '../../utils/imageUrl.js';

const defaultReviews = [
  { text: '"Received parcel. Jewelry quality is excellent. Thank you so much!"', rating: 5, image: '' },
  { text: '"Loved my purchase. You have a great collection... will definitely add more!"', rating: 5, image: '' },
  { text: '"Thanks dear I received my parcel. It\'s amazing, very beautiful set"', rating: 5, image: '' },
  { text: '"The craftsmanship is amazing. Jewelry is exactly same as shown in image"', rating: 5, image: '' },
  { text: '"Got this. Good quality and good response fast delivery"', rating: 5, image: '' },
];

export default function CustomerReviews() {
  const { siteConfig } = useSiteConfig();
  const scrollRef = useRef(null);
  const [modalImage, setModalImage] = useState(null);

  const settings = siteConfig?.settings || {};
  const reviews = settings.reviews?.length
    ? settings.reviews
    : defaultReviews;

  const sectionTitle = settings.reviewsSectionTitle || 'What Our Customers Say';
  const sectionSubtitle = settings.reviewsSectionSubtitle || 'Real reviews from our happy customers';
  const phone = siteConfig?.phone || '';

  const scroll = (direction) => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -380 : 380;
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const openWhatsApp = () => {
    const msg = encodeURIComponent('Hi! I would like to share my review.');
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${msg}`, '_blank');
  };

  return (
    <section className="customer-reviews-section" id="customer-reviews">
      <div className="reviews-container">
        <div className="reviews-header">
          <h2 className="section-title">{sectionTitle}</h2>
          <p className="section-subtitle">{sectionSubtitle}</p>
        </div>

        <div className="reviews-wrapper">
          <button
            className="reviews-scroll-arrow reviews-scroll-arrow-left"
            onClick={() => scroll('left')}
          >
            <i className="fas fa-chevron-left"></i>
          </button>

          <div className="reviews-scroll-container" ref={scrollRef}>
            {reviews.map((review, i) => (
              <div key={i} className="review-item">
                {review.image && (
                  <div
                    className="review-image"
                    onClick={() => setModalImage(resolveImageUrl(review.image))}
                  >
                    <img src={resolveImageUrl(review.image)} alt={`Customer Review ${i + 1}`} />
                  </div>
                )}
                <div className="review-content">
                  <div className="review-text">
                    <p>{review.text}</p>
                  </div>
                  <div className="review-rating">
                    <div className="stars">
                      <span>{'⭐'.repeat(review.rating || 5)}</span>
                    </div>
                    {review.name && (
                      <span style={{ fontSize: '0.85rem', color: '#888' }}>
                        — {review.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            className="reviews-scroll-arrow reviews-scroll-arrow-right"
            onClick={() => scroll('right')}
          >
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>

        {phone && (
          <div className="reviews-cta">
            <button className="chat-now-btn" onClick={openWhatsApp}>
              SHARE YOUR REVIEW
            </button>
          </div>
        )}
      </div>

      {modalImage && (
        <div
          className="image-modal"
          style={{ display: 'flex' }}
          onClick={() => setModalImage(null)}
        >
          <span
            className="image-modal-close"
            onClick={() => setModalImage(null)}
          >
            &times;
          </span>
          <div className="image-modal-content">
            <img src={modalImage} alt="Full Size Review" />
          </div>
        </div>
      )}
    </section>
  );
}
