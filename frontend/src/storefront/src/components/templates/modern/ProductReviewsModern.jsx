import React, { useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { SiteContext } from '../../../context/SiteContext.jsx';
import { apiRequest, getAuthToken } from '../../../services/api.js';

const STAR_FULL = '\u2605';
const STAR_EMPTY = '\u2606';

function StarRating({ rating, size = 16 }) {
  return (
    <span className="mn-review-stars" style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i}>{i <= rating ? STAR_FULL : STAR_EMPTY}</span>
      ))}
    </span>
  );
}

function StarInput({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="mn-star-input" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          className={`mn-star-input-star${i <= (hover || value) ? ' active' : ''}`}
          onMouseEnter={() => setHover(i)}
          onClick={() => onChange(i)}
        >
          {STAR_FULL}
        </span>
      ))}
    </div>
  );
}

function RatingBreakdown({ stats }) {
  const { t } = useTranslation('storefront');
  if (!stats || stats.total === 0) return null;
  const { total, avgRating, breakdown } = stats;
  return (
    <div className="mn-rating-breakdown">
      <div className="mn-rating-summary">
        <div className="mn-rating-big">{avgRating}</div>
        <div className="mn-rating-summary-detail">
          <StarRating rating={Math.round(avgRating)} size={20} />
          <span className="mn-rating-count">{total} {total === 1 ? t('productReviews.reviewSingular', 'review') : t('productReviews.reviewPlural', 'reviews')}</span>
        </div>
      </div>
      <div className="mn-rating-bars">
        {[5, 4, 3, 2, 1].map(star => {
          const count = breakdown[star] || 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={star} className="mn-rating-bar-row">
              <span className="mn-rating-bar-label">{star} {STAR_FULL}</span>
              <div className="mn-rating-bar-track">
                <div className="mn-rating-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="mn-rating-bar-count">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ProductReviewsModern({ productId }) {
  const { t } = useTranslation('storefront');
  const { siteConfig } = useContext(SiteContext);
  const siteId = siteConfig?.id;

  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('recent');
  const [eligibility, setEligibility] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ rating: 0, title: '', content: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState(null);
  const [reviewImageModal, setReviewImageModal] = useState(null);

  const settings = siteConfig?.settings || {};
  const reviewsEnabled = settings.reviewsEnabled !== false;

  useEffect(() => {
    if (!siteId || !productId || !reviewsEnabled) return;
    loadReviews();
  }, [siteId, productId, sort, reviewsEnabled]);

  useEffect(() => {
    if (!siteId || !productId || !reviewsEnabled) return;
    checkEligibility();
  }, [siteId, productId, reviewsEnabled]);

  async function loadReviews() {
    setLoading(true);
    try {
      const res = await apiRequest(`/api/reviews/product/${productId}?siteId=${siteId}&sort=${sort}`);
      const data = res.data || res;
      setReviews(data.reviews || []);
      setStats(data.stats || null);
    } catch (e) {
      console.error('Failed to load reviews:', e);
    } finally {
      setLoading(false);
    }
  }

  async function checkEligibility() {
    const token = getAuthToken();
    if (!token) {
      setEligibility({ eligible: false, reason: 'not_logged_in' });
      return;
    }
    try {
      const res = await apiRequest(`/api/reviews/eligibility?siteId=${siteId}&productId=${productId}`);
      setEligibility(res.data || res);
    } catch {
      setEligibility({ eligible: false });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (formData.rating === 0) return;
    setSubmitting(true);
    setSubmitMessage(null);
    try {
      const res = await apiRequest('/api/reviews/submit', {
        method: 'POST',
        body: JSON.stringify({
          siteId,
          productId,
          orderId: eligibility?.orderId,
          rating: formData.rating,
          title: formData.title || undefined,
          content: formData.content || undefined,
        }),
      });
      setSubmitMessage({ type: 'success', text: res.message || t('productReviews.toasts.submitted', 'Review submitted!') });
      setShowForm(false);
      setFormData({ rating: 0, title: '', content: '' });
      await loadReviews();
      await checkEligibility();
    } catch (err) {
      setSubmitMessage({ type: 'error', text: err.message || t('productReviews.errors.submitFail', 'Failed to submit review') });
    } finally {
      setSubmitting(false);
    }
  }

  if (!reviewsEnabled) return null;

  return (
    <div className="mn-product-reviews">
      <h2 className="mn-product-reviews-title">{t('productReviews.title', 'Customer Reviews')}</h2>

      {loading && reviews.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
          <div className="spinner" style={{ margin: '0 auto 12px', borderTopColor: '#111' }} />
          {t('productReviews.loading', 'Loading reviews...')}
        </div>
      ) : (
        <>
          <RatingBreakdown stats={stats} />

          {submitMessage && (
            <div className={`mn-review-message mn-review-message-${submitMessage.type}`}>
              {submitMessage.text}
            </div>
          )}

          {eligibility?.eligible && !showForm && (
            <div className="mn-review-cta">
              <button className="mn-write-review-btn" onClick={() => setShowForm(true)}>
                <i className="fas fa-pen" style={{ marginInlineEnd: 8 }} />
                {t('productReviews.writeReview', 'Write a Review')}
              </button>
            </div>
          )}

          {eligibility?.reason === 'already_reviewed' && (
            <div className="mn-review-notice">{t('productReviews.alreadyReviewed', 'You have already reviewed this product.')}</div>
          )}

          {showForm && (
            <form className="mn-review-form" onSubmit={handleSubmit}>
              <h3 className="mn-review-form-title">{t('productReviews.form.title', 'Write Your Review')}</h3>
              <div className="mn-review-form-field">
                <label>{t('review.form.rating', 'Your Rating *')}</label>
                <StarInput value={formData.rating} onChange={r => setFormData(prev => ({ ...prev, rating: r }))} />
                {formData.rating === 0 && <span className="mn-review-form-hint">{t('productReviews.form.selectRating', 'Select a rating')}</span>}
              </div>
              <div className="mn-review-form-field">
                <label>{t('review.form.title', 'Review Title')}</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder={t('review.form.titlePlaceholder', 'Summarize your experience')}
                  maxLength={120}
                />
              </div>
              <div className="mn-review-form-field">
                <label>{t('review.form.content', 'Your Review')}</label>
                <textarea
                  value={formData.content}
                  onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder={t('productReviews.form.contentPlaceholder', 'Share your thoughts about this product...')}
                  rows={4}
                  maxLength={2000}
                />
              </div>
              <div className="mn-review-form-actions">
                <button type="submit" className="mn-review-submit-btn" disabled={submitting || formData.rating === 0}>
                  {submitting ? t('review.buttons.submitting', 'Submitting...') : t('review.buttons.submit', 'Submit Review')}
                </button>
                <button type="button" className="mn-review-cancel-btn" onClick={() => setShowForm(false)}>
                  {t('productReviews.cancel', 'Cancel')}
                </button>
              </div>
            </form>
          )}

          {sort && reviews.length > 1 && (
            <div className="mn-review-sort">
              <label>{t('productReviews.sortBy', 'Sort by:')}</label>
              <select value={sort} onChange={e => setSort(e.target.value)}>
                <option value="recent">{t('productReviews.sort.recent', 'Most Recent')}</option>
                <option value="highest">{t('productReviews.sort.highest', 'Highest Rated')}</option>
                <option value="lowest">{t('productReviews.sort.lowest', 'Lowest Rated')}</option>
              </select>
            </div>
          )}

          {reviews.length === 0 && !loading && (
            <div className="mn-review-empty">
              <p>{t('productReviews.noReviews', 'No reviews yet.')} {eligibility?.eligible ? t('productReviews.beFirst', 'Be the first to review this product!') : ''}</p>
            </div>
          )}

          {reviews.map(review => (
            <div key={review.id} className="mn-review-card">
              <div className="mn-review-header">
                <StarRating rating={review.rating} />
                <span className="mn-review-author">{review.customer_name || t('productReviews.customer', 'Customer')}</span>
                {review.is_verified === 1 && <span className="mn-verified-badge">{t('productReviews.verifiedPurchase', 'Verified Purchase')}</span>}
                <span className="mn-review-date">
                  {review.created_at ? new Date(review.created_at).toLocaleDateString() : ''}
                </span>
              </div>
              {review.title && <p className="mn-review-title-text">{review.title}</p>}
              {review.content && <p className="mn-review-text">{review.content}</p>}
              {review.images && review.images.length > 0 && (
                <div className="mn-review-images">
                  {review.images.map((img, i) => (
                    <img
                      key={i}
                      className="mn-review-image-thumb"
                      src={img}
                      alt={t('productReviews.reviewImageAlt', 'Review {{index}}', { index: i + 1 })}
                      onClick={() => setReviewImageModal(img)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {reviewImageModal && (
        <div className="review-image-modal" onClick={() => setReviewImageModal(null)}>
          <button className="close-modal" onClick={() => setReviewImageModal(null)} aria-label={t('review.buttons.close', 'Close')}>&times;</button>
          <img src={reviewImageModal} alt={t('productReviews.reviewAlt', 'Review')} />
        </div>
      )}
    </div>
  );
}
