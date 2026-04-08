import React, { useState, useEffect, useContext } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { apiRequest, getAuthToken } from '../../services/api.js';

const STAR_FULL = '\u2605';
const STAR_EMPTY = '\u2606';

function StarRating({ rating, size = 16 }) {
  return (
    <span className="review-stars" style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i}>{i <= rating ? STAR_FULL : STAR_EMPTY}</span>
      ))}
    </span>
  );
}

function StarInput({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="star-input" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          className={`star-input-star${i <= (hover || value) ? ' active' : ''}`}
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
  if (!stats || stats.total === 0) return null;
  const { total, avgRating, breakdown } = stats;
  return (
    <div className="rating-breakdown">
      <div className="rating-summary">
        <div className="rating-big">{avgRating}</div>
        <div className="rating-summary-detail">
          <StarRating rating={Math.round(avgRating)} size={20} />
          <span className="rating-count">{total} {total === 1 ? 'review' : 'reviews'}</span>
        </div>
      </div>
      <div className="rating-bars">
        {[5, 4, 3, 2, 1].map(star => {
          const count = breakdown[star] || 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={star} className="rating-bar-row">
              <span className="rating-bar-label">{star} {STAR_FULL}</span>
              <div className="rating-bar-track">
                <div className="rating-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="rating-bar-count">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ProductReviews({ productId }) {
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
      setSubmitMessage({ type: 'success', text: res.message || 'Review submitted!' });
      setShowForm(false);
      setFormData({ rating: 0, title: '', content: '' });
      await loadReviews();
      await checkEligibility();
    } catch (err) {
      setSubmitMessage({ type: 'error', text: err.message || 'Failed to submit review' });
    } finally {
      setSubmitting(false);
    }
  }

  if (!reviewsEnabled) return null;

  return (
    <div className="product-reviews-section">
      <h2 className="section-title">Customer Reviews</h2>

      {loading && reviews.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          Loading reviews...
        </div>
      ) : (
        <>
          <RatingBreakdown stats={stats} />

          {submitMessage && (
            <div className={`review-message review-message-${submitMessage.type}`}>
              {submitMessage.text}
            </div>
          )}

          {eligibility?.eligible && !showForm && (
            <div className="review-cta">
              <button className="write-review-btn" onClick={() => setShowForm(true)}>
                <i className="fas fa-pen" style={{ marginRight: 8 }} />
                Write a Review
              </button>
            </div>
          )}

          {eligibility?.reason === 'already_reviewed' && (
            <div className="review-notice">You have already reviewed this product.</div>
          )}

          {showForm && (
            <form className="review-form" onSubmit={handleSubmit}>
              <h3 className="review-form-title">Write Your Review</h3>
              <div className="review-form-field">
                <label>Your Rating *</label>
                <StarInput value={formData.rating} onChange={r => setFormData(prev => ({ ...prev, rating: r }))} />
                {formData.rating === 0 && <span className="review-form-hint">Select a rating</span>}
              </div>
              <div className="review-form-field">
                <label>Review Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Summarize your experience"
                  maxLength={120}
                />
              </div>
              <div className="review-form-field">
                <label>Your Review</label>
                <textarea
                  value={formData.content}
                  onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Share your thoughts about this product..."
                  rows={4}
                  maxLength={2000}
                />
              </div>
              <div className="review-form-actions">
                <button type="submit" className="review-submit-btn" disabled={submitting || formData.rating === 0}>
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </button>
                <button type="button" className="review-cancel-btn" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          {sort && reviews.length > 1 && (
            <div className="review-sort">
              <label>Sort by:</label>
              <select value={sort} onChange={e => setSort(e.target.value)}>
                <option value="recent">Most Recent</option>
                <option value="highest">Highest Rated</option>
                <option value="lowest">Lowest Rated</option>
              </select>
            </div>
          )}

          {reviews.length === 0 && !loading && (
            <div className="review-empty">
              <p>No reviews yet. {eligibility?.eligible ? 'Be the first to review this product!' : ''}</p>
            </div>
          )}

          {reviews.map(review => (
            <div key={review.id} className="review-card">
              <div className="review-header">
                <StarRating rating={review.rating} />
                <span className="review-author">{review.customer_name || 'Customer'}</span>
                {review.is_verified === 1 && <span className="verified-badge">Verified Purchase</span>}
                <span className="review-date">
                  {review.created_at ? new Date(review.created_at).toLocaleDateString() : ''}
                </span>
              </div>
              {review.title && <p className="review-title-text">{review.title}</p>}
              {review.content && <p className="review-text">{review.content}</p>}
              {review.images && review.images.length > 0 && (
                <div className="review-images">
                  {review.images.map((img, i) => (
                    <img
                      key={i}
                      className="review-image-thumb"
                      src={img}
                      alt={`Review ${i + 1}`}
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
          <button className="close-modal" onClick={() => setReviewImageModal(null)}>&times;</button>
          <img src={reviewImageModal} alt="Review" />
        </div>
      )}
    </div>
  );
}
