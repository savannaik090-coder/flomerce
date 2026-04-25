import React, { useState, useEffect, useContext } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { SiteContext } from '../context/SiteContext.jsx';
import * as orderService from '../services/orderService.js';
import TranslatedText from '../components/TranslatedText';
import { useShopperTranslation } from '../context/ShopperTranslationContext.jsx';

const CANCEL_REASONS = [
  'Changed my mind',
  'Found a better price elsewhere',
  'Ordered by mistake',
  'Shipping is taking too long',
  'Item no longer needed',
  'Other',
];

export default function CancelPage() {
  const { translate: tx } = useShopperTranslation();
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { siteConfig } = useContext(SiteContext);

  const [mode, setMode] = useState(orderId && token ? 'form' : 'lookup');
  const [lookupOrderId, setLookupOrderId] = useState('');
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupMessage, setLookupMessage] = useState('');
  const [lookupSuccess, setLookupSuccess] = useState(false);

  const [cancelReason, setCancelReason] = useState('');
  const [cancelDetail, setCancelDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [existingCancel, setExistingCancel] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  useEffect(() => {
    if (orderId && siteConfig?.id) {
      setCheckingStatus(true);
      orderService.getCancelStatus(orderId, siteConfig.id, token)
        .then(res => {
          if (res.data) {
            setExistingCancel(res.data);
          }
        })
        .catch(() => {})
        .finally(() => setCheckingStatus(false));
    }
  }, [orderId, siteConfig?.id, token]);

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!lookupOrderId.trim() || !lookupEmail.trim()) return;
    setLookupLoading(true);
    setLookupMessage('');
    try {
      await orderService.resendCancelLink(lookupOrderId.trim(), {
        siteId: siteConfig.id,
        email: lookupEmail.trim(),
      });
      setLookupMessage(tx("A cancellation link has been sent to your email. Please check your inbox."));
      setLookupSuccess(true);
    } catch (err) {
      setLookupMessage(err.message || tx("Could not find this order. Please check your order number and email."));
      setLookupSuccess(false);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!cancelReason) return;
    if (!cancelDetail.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await orderService.createCancelRequest(orderId, {
        siteId: siteConfig.id,
        reason: cancelReason,
        reasonDetail: cancelReason === 'Other' ? cancelDetail : cancelDetail || undefined,
        cancelToken: token,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || tx("Failed to submit cancellation request"));
    } finally {
      setSubmitting(false);
    }
  };

  const statusColors = { requested: '#ff9800', approved: '#27ae60', rejected: '#e53935' };
  const statusLabels = {
    requested: tx("Pending Review"),
    approved: tx("Approved (Cancelled)"),
    rejected: tx("Rejected"),
  };

  return (
    <div style={{ minHeight: '80vh', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '40px 16px' }}>
      <div style={{ maxWidth: 520, width: '100%', background: '#fff', borderRadius: 12, boxShadow: '0 2px 20px rgba(0,0,0,0.08)', padding: 32 }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, margin: '0 0 8px', color: '#1e293b' }}><TranslatedText text="Cancel Order" /></h1>

        {mode === 'lookup' && !orderId && (
          <>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              <TranslatedText text="Enter your order number and email address to receive a cancellation link." />
            </p>
            <form onSubmit={handleLookup}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#334155' }}><TranslatedText text="Order Number" /></label>
                <input type="text" value={lookupOrderId} onChange={e => setLookupOrderId(e.target.value)} placeholder={tx("e.g. FX-123456")} style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} required />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#334155' }}><TranslatedText text="Email Address" /></label>
                <input type="email" value={lookupEmail} onChange={e => setLookupEmail(e.target.value)} placeholder={tx("your@email.com")} style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} required />
              </div>
              {lookupMessage && (
                <div style={{ padding: '12px 16px', borderRadius: 8, marginBottom: 16, background: lookupSuccess ? '#f0fdf4' : '#fef2f2', color: lookupSuccess ? '#166534' : '#991b1b', fontSize: 14 }}>
                  {lookupMessage}
                </div>
              )}
              <button type="submit" disabled={lookupLoading} style={{ width: '100%', padding: '12px 24px', background: '#e53935', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: lookupLoading ? 'not-allowed' : 'pointer', opacity: lookupLoading ? 0.7 : 1 }}>
                {lookupLoading ? <TranslatedText text="Sending..." /> : <TranslatedText text="Send Cancellation Link" />}
              </button>
            </form>
          </>
        )}

        {orderId && checkingStatus && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ width: 40, height: 40, border: '4px solid #f3f3f3', borderTop: '4px solid #c8a97e', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: '#777' }}><TranslatedText text="Checking cancellation status..." /></p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {orderId && !checkingStatus && existingCancel && (
          <div style={{ marginTop: 16 }}>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16 }}>
              <TranslatedText text="Order" /> <strong>#{existingCancel.order_number || orderId}</strong>
            </p>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}><TranslatedText text="Cancellation Status" /></div>
              <span style={{ display: 'inline-block', background: statusColors[existingCancel.status] || '#757575', color: '#fff', borderRadius: 20, padding: '6px 20px', fontSize: 15, fontWeight: 600 }}>
                {statusLabels[existingCancel.status] || existingCancel.status}
              </span>
              {existingCancel.admin_note && (
                <div style={{ marginTop: 16, padding: '12px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, textAlign: 'start' }}>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 4 }}><TranslatedText text="Note from store" /></div>
                  <div style={{ fontSize: 14, color: '#334155' }}>{existingCancel.admin_note}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {orderId && !checkingStatus && !existingCancel && !submitted && (
          <div style={{ marginTop: 16 }}>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
              <TranslatedText text="Submit a cancellation request for order" /> <strong>#{orderId}</strong>
            </p>
            {error && (
              <div style={{ padding: '12px 16px', borderRadius: 8, marginBottom: 16, background: '#fef2f2', color: '#991b1b', fontSize: 14 }}>
                <TranslatedText text={error} />
              </div>
            )}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 10, fontSize: 14, color: '#334155' }}><TranslatedText text="Reason for cancellation *" /></label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {CANCEL_REASONS.map(reason => (
                  <label key={reason} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 14px', borderRadius: 6, border: `1.5px solid ${cancelReason === reason ? '#e53935' : '#e2e8f0'}`, background: cancelReason === reason ? '#fff5f5' : '#fff', transition: 'all 0.15s' }}>
                    <input type="radio" name="cancelReason" value={reason} checked={cancelReason === reason} onChange={() => setCancelReason(reason)} style={{ accentColor: '#e53935' }} />
                    <span style={{ fontSize: 14, color: '#334155', fontWeight: cancelReason === reason ? 600 : 400 }}><TranslatedText text={reason} /></span>
                  </label>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 14, color: '#334155' }}>
                <TranslatedText text="Additional notes *" />
              </label>
              <textarea value={cancelDetail} onChange={e => setCancelDetail(e.target.value)} rows={3} placeholder={tx("Please provide more details about your cancellation...")} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              {cancelReason && !cancelDetail.trim() && <p style={{ fontSize: 12, color: '#e53935', marginTop: 4 }}><TranslatedText text="Please provide additional details before submitting." /></p>}
            </div>
            <button onClick={handleSubmit} disabled={submitting || !cancelReason || !cancelDetail.trim()} style={{ width: '100%', padding: '12px 24px', background: '#e53935', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
              {submitting ? <TranslatedText text="Submitting..." /> : <TranslatedText text="Submit Cancellation Request" />}
            </button>
          </div>
        )}

        {submitted && (
          <div style={{ marginTop: 16, textAlign: 'center', padding: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, margin: '0 0 8px', color: '#166534' }}><TranslatedText text="Cancellation Request Submitted" /></h2>
            <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>
              <TranslatedText text="We've received your cancellation request. You'll receive an email update once it's reviewed by the store." />
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
