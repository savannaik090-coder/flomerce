import React, { useState, useEffect, useContext } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { SiteContext } from '../../../context/SiteContext.jsx';
import { apiRequest } from '../../../services/api.js';
import TranslatedText from '../../TranslatedText';
import { useShopperTranslation } from '../../../context/ShopperTranslationContext.jsx';
import { translateApiError } from '../../../services/errorMessages.js';

const STAR_FULL = '\u2605';

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

export default function ReviewPageModern() {
  const { translate: tx } = useShopperTranslation();
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { siteConfig } = useContext(SiteContext);
  const siteId = siteConfig?.id;

  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewedItems, setReviewedItems] = useState({});
  const [activeItem, setActiveItem] = useState(null);
  const [formData, setFormData] = useState({ rating: 0, title: '', content: '', customerName: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState(null);

  useEffect(() => {
    if (!siteId || !orderId || !token) {
      setError(tx("Invalid review link"));
      setLoading(false);
      return;
    }
    loadOrderItems();
  }, [siteId, orderId, token]);

  async function loadOrderItems() {
    setLoading(true);
    try {
      const res = await apiRequest(`/api/reviews/eligibility?siteId=${siteId}&orderId=${orderId}&token=${token}&mode=guest`);
      const data = res.data || res;
      if (data.error) {
        setError(data.error);
        return;
      }
      setOrder(data.order || {});
      setItems(data.items || []);
      setReviewedItems(data.reviewedItems || {});
    } catch (err) {
      setError(translateApiError(err, tx, tx("Invalid or expired review link")));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!activeItem || formData.rating === 0) return;
    setSubmitting(true);
    setSubmitMessage(null);
    try {
      const res = await apiRequest('/api/reviews/guest-submit', {
        method: 'POST',
        body: JSON.stringify({
          siteId,
          orderId,
          reviewToken: token,
          productId: activeItem.productId || activeItem.product_id || activeItem.id,
          rating: formData.rating,
          title: formData.title || undefined,
          content: formData.content || undefined,
          customerName: formData.customerName || undefined,
        }),
      });
      setSubmitMessage({ type: 'success', text: res.message || tx("Review submitted!") });
      setReviewedItems(prev => ({ ...prev, [activeItem.productId || activeItem.product_id || activeItem.id]: true }));
      setActiveItem(null);
      setFormData({ rating: 0, title: '', content: '', customerName: '' });
    } catch (err) {
      setSubmitMessage({ type: 'error', text: translateApiError(err, tx, tx("Failed to submit review")) });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mn-review-page">
        <div className="mn-review-page-inner">
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div className="spinner" style={{ borderTopColor: '#111' }} />
            <p style={{ marginTop: 15, color: '#666', fontFamily: "'Inter', sans-serif" }}><TranslatedText text="Loading..." /></p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mn-review-page">
        <div className="mn-review-page-inner">
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>&#128533;</div>
            <h2 style={{ color: '#111', marginBottom: 8, fontFamily: "'Inter', sans-serif", fontWeight: 700 }}><TranslatedText text="Unable to Load Review" /></h2>
            <p style={{ color: '#64748b', fontFamily: "'Inter', sans-serif" }}><TranslatedText text={error} /></p>
            <button
              onClick={() => navigate('/')}
              style={{ marginTop: 20, padding: '10px 24px', background: '#111', color: '#fff', border: 'none', borderRadius: 0, cursor: 'pointer', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}
            >
              <TranslatedText text="Go to Store" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const unreviewedItems = items.filter(item => {
    const pid = item.productId || item.product_id || item.id;
    return !reviewedItems[pid];
  });
  const allReviewed = unreviewedItems.length === 0 && items.length > 0;

  return (
    <div className="mn-review-page">
      <div className="mn-review-page-inner">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>&#11088;</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', margin: '0 0 8px', fontFamily: "'Inter', sans-serif", letterSpacing: '-0.01em' }}>
            {allReviewed ? tx("Thank You!") : tx("How was your order?")}
          </h1>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0, fontFamily: "'Inter', sans-serif" }}>
            {allReviewed
              ? tx("You have reviewed all items from this order.")
              : tx("Select a product below to leave a review.")}
          </p>
        </div>

        {submitMessage && (
          <div className={`mn-review-message mn-review-message-${submitMessage.type}`}>
            {submitMessage.text}
          </div>
        )}

        <div className="mn-review-page-items">
          {items.map((item, idx) => {
            const pid = item.productId || item.product_id || item.id;
            const reviewed = reviewedItems[pid];
            const isActive = activeItem && (activeItem.productId || activeItem.product_id || activeItem.id) === pid;
            return (
              <div key={idx} className={`mn-review-page-item${isActive ? ' active' : ''}${reviewed ? ' reviewed' : ''}`}>
                <div className="mn-review-page-item-row" onClick={() => !reviewed && setActiveItem(isActive ? null : item)}>
                  {(item.image || item.thumbnail_url) && (
                    <img src={item.image || item.thumbnail_url} alt={item.name} className="mn-review-page-item-img" />
                  )}
                  <div className="mn-review-page-item-info">
                    <span className="mn-review-page-item-name">{item.name}</span>
                    {reviewed && <span className="mn-review-page-item-badge"><TranslatedText text="✓ Reviewed" /></span>}
                  </div>
                  {!reviewed && (
                    <button type="button" className="mn-write-review-btn" style={{ padding: '8px 16px', fontSize: 13 }}>
                      {isActive ? tx("Close") : tx("Review")}
                    </button>
                  )}
                </div>

                {isActive && (
                  <form className="mn-review-form" style={{ marginTop: 16 }} onSubmit={handleSubmit}>
                    <div className="mn-review-form-field">
                      <label><TranslatedText text="Your Rating *" /></label>
                      <StarInput value={formData.rating} onChange={r => setFormData(prev => ({ ...prev, rating: r }))} />
                    </div>
                    <div className="mn-review-form-field">
                      <label><TranslatedText text="Your Name" /></label>
                      <input
                        type="text"
                        value={formData.customerName}
                        onChange={e => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                        placeholder={tx("Your name (optional)")}
                        maxLength={80}
                      />
                    </div>
                    <div className="mn-review-form-field">
                      <label><TranslatedText text="Review Title" /></label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder={tx("Summarize your experience")}
                        maxLength={120}
                      />
                    </div>
                    <div className="mn-review-form-field">
                      <label><TranslatedText text="Your Review" /></label>
                      <textarea
                        value={formData.content}
                        onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                        placeholder={tx("Share your thoughts...")}
                        rows={3}
                        maxLength={2000}
                      />
                    </div>
                    <div className="mn-review-form-actions">
                      <button type="submit" className="mn-review-submit-btn" disabled={submitting || formData.rating === 0}>
                        {submitting ? tx("Submitting...") : tx("Submit Review")}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
