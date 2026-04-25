import React, { useState, useEffect, useContext } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { SiteContext } from '../context/SiteContext.jsx';
import { apiRequest } from '../services/api.js';
import TranslatedText from '../components/TranslatedText';
import { useShopperTranslation } from '../context/ShopperTranslationContext.jsx';

const STAR_FULL = '\u2605';
const STAR_EMPTY = '\u2606';

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

export default function ReviewPage() {
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
      setError("Invalid review link");
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
      setError(err.message || "Invalid or expired review link");
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
      setSubmitMessage({ type: 'success', text: res.message || "Review submitted!" });
      setReviewedItems(prev => ({ ...prev, [activeItem.productId || activeItem.product_id || activeItem.id]: true }));
      setActiveItem(null);
      setFormData({ rating: 0, title: '', content: '', customerName: '' });
    } catch (err) {
      setSubmitMessage({ type: 'error', text: err.message || "Failed to submit review" });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="review-page">
        <div className="review-page-inner">
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div className="spinner" />
            <p style={{ marginTop: 15, color: '#666' }}><TranslatedText text="Loading..." /></p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="review-page">
        <div className="review-page-inner">
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>&#128533;</div>
            <h2 style={{ color: '#0f172a', marginBottom: 8 }}><TranslatedText text="Unable to Load Review" /></h2>
            <p style={{ color: '#64748b' }}><TranslatedText text={error} /></p>
            <button
              onClick={() => navigate('/')}
              style={{ marginTop: 20, padding: '10px 24px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
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
    <div className="review-page">
      <div className="review-page-inner">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>&#11088;</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>
            {allReviewed ? <TranslatedText text="Thank You!" /> : <TranslatedText text="How was your order?" />}
          </h1>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            {allReviewed
              ? <TranslatedText text="You have reviewed all items from this order." />
              : <TranslatedText text="Select a product below to leave a review." />}
          </p>
        </div>

        {submitMessage && (
          <div className={`review-message review-message-${submitMessage.type}`}>
            {submitMessage.text}
          </div>
        )}

        <div className="review-page-items">
          {items.map((item, idx) => {
            const pid = item.productId || item.product_id || item.id;
            const reviewed = reviewedItems[pid];
            const isActive = activeItem && (activeItem.productId || activeItem.product_id || activeItem.id) === pid;
            return (
              <div key={idx} className={`review-page-item${isActive ? ' active' : ''}${reviewed ? ' reviewed' : ''}`}>
                <div className="review-page-item-row" onClick={() => !reviewed && setActiveItem(isActive ? null : item)}>
                  {(item.image || item.thumbnail_url) && (
                    <img src={item.image || item.thumbnail_url} alt={item.name} className="review-page-item-img" />
                  )}
                  <div className="review-page-item-info">
                    <span className="review-page-item-name">{item.name}</span>
                    {reviewed && <span className="review-page-item-badge"><TranslatedText text="✓ Reviewed" /></span>}
                  </div>
                  {!reviewed && (
                    <button type="button" className="write-review-btn" style={{ padding: '8px 16px', fontSize: 13 }}>
                      {isActive ? <TranslatedText text="Close" /> : <TranslatedText text="Review" />}
                    </button>
                  )}
                </div>

                {isActive && (
                  <form className="review-form" style={{ marginTop: 16 }} onSubmit={handleSubmit}>
                    <div className="review-form-field">
                      <label><TranslatedText text="Your Rating *" /></label>
                      <StarInput value={formData.rating} onChange={r => setFormData(prev => ({ ...prev, rating: r }))} />
                    </div>
                    <div className="review-form-field">
                      <label><TranslatedText text="Your Name" /></label>
                      <input
                        type="text"
                        value={formData.customerName}
                        onChange={e => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                        placeholder={tx("Your name (optional)")}
                        maxLength={80}
                      />
                    </div>
                    <div className="review-form-field">
                      <label><TranslatedText text="Review Title" /></label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder={tx("Summarize your experience")}
                        maxLength={120}
                      />
                    </div>
                    <div className="review-form-field">
                      <label><TranslatedText text="Your Review" /></label>
                      <textarea
                        value={formData.content}
                        onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                        placeholder={tx("Share your thoughts...")}
                        rows={3}
                        maxLength={2000}
                      />
                    </div>
                    <div className="review-form-actions">
                      <button type="submit" className="review-submit-btn" disabled={submitting || formData.rating === 0}>
                        {submitting ? <TranslatedText text="Submitting..." /> : <TranslatedText text="Submit Review" />}
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
