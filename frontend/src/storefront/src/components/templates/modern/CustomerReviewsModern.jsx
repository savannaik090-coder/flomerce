import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSiteConfig } from '../../../hooks/useSiteConfig.js';
import { resolveImageUrl } from '../../../utils/imageUrl.js';
import { getDefaultReviews } from '../../../defaults/index.js';

export default function CustomerReviewsModern() {
  const { t } = useTranslation('storefront');
  const { siteConfig } = useSiteConfig();
  const scrollRef = useRef(null);
  const [modalImage, setModalImage] = useState(null);

  const settings = siteConfig?.settings || {};

  if (settings.showCustomerReviews === false) return null;

  const reviews = settings.reviews?.length
    ? settings.reviews
    : getDefaultReviews(siteConfig?.category);

  const sectionTitle = settings.reviewsSectionTitle || t('home.reviewsModern.defaultTitle', 'What Our Customers Say');
  const sectionSubtitle = settings.reviewsSectionSubtitle || t('home.reviewsModern.defaultSubtitle', 'Real reviews from our happy customers');
  const phone = siteConfig?.phone || '';

  const scroll = (direction) => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -380 : 380;
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const openWhatsApp = () => {
    const msg = encodeURIComponent(t('home.reviewsModern.whatsappMessage', 'Hi! I would like to share my review.'));
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${msg}`, '_blank');
  };

  return (
    <section className="mn-customer-reviews" id="customer-reviews">
      <div className="mn-customer-reviews-container">
        <div className="mn-customer-reviews-header">
          <h2 className="mn-customer-reviews-title">{sectionTitle}</h2>
          <p className="mn-customer-reviews-subtitle">{sectionSubtitle}</p>
        </div>

        <div className="mn-customer-reviews-wrapper">
          <button
            className="mn-customer-reviews-arrow mn-customer-reviews-arrow-left"
            onClick={() => scroll('left')}
          >
            <i className="fas fa-chevron-left"></i>
          </button>

          <div className="mn-customer-reviews-scroll" ref={scrollRef}>
            {reviews.map((review, i) => (
              <div key={i} className="mn-customer-review-card">
                {review.image && (
                  <div
                    className="mn-customer-review-image"
                    onClick={() => setModalImage(resolveImageUrl(review.image))}
                  >
                    <img src={resolveImageUrl(review.image)} alt={t('home.reviewsModern.imageAlt', 'Customer Review {{index}}', { index: i + 1 })} />
                  </div>
                )}
                <div className="mn-customer-review-body">
                  <div className="mn-customer-review-text">
                    <p>{review.text}</p>
                  </div>
                  <div className="mn-customer-review-footer">
                    <div className="mn-customer-review-stars">
                      <span>{'★'.repeat(review.rating || 5)}</span>
                    </div>
                    {review.name && (
                      <span className="mn-customer-review-author">
                        {review.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            className="mn-customer-reviews-arrow mn-customer-reviews-arrow-right"
            onClick={() => scroll('right')}
          >
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>

        {phone && (
          <div className="mn-customer-reviews-cta">
            <button className="mn-customer-reviews-cta-btn" onClick={openWhatsApp}>
              {t('home.reviewsModern.shareButton', 'SHARE YOUR REVIEW')}
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
            <img src={modalImage} alt={t('home.reviewsModern.fullSizeAlt', 'Full Size Review')} />
          </div>
        </div>
      )}
    </section>
  );
}
