import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { SiteContext } from '../context/SiteContext.jsx';
import * as orderService from '../services/orderService.js';

const RETURN_REASONS = [
  'Received wrong item',
  'Item damaged or defective',
  'Item does not match description',
  'Size/fit issue',
  'Changed my mind',
  'Other',
];

const IMAGE_REQUIRED_REASONS = ['Received wrong item', 'Item damaged or defective'];

function getApiBase() {
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('fluxe.in')) return '';
  return 'https://fluxe.in';
}

export default function ReturnPage() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { siteConfig } = useContext(SiteContext);

  const [mode, setMode] = useState(orderId && token ? 'form' : 'lookup');
  const [lookupOrderId, setLookupOrderId] = useState('');
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupMessage, setLookupMessage] = useState('');

  const [returnReason, setReturnReason] = useState('');
  const [returnDetail, setReturnDetail] = useState('');
  const [resolution, setResolution] = useState('refund');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [photos, setPhotos] = useState([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const fileInputRef = useRef(null);

  const [existingReturn, setExistingReturn] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  let settings = {};
  try {
    const s = siteConfig?.settings;
    settings = typeof s === 'string' ? JSON.parse(s) : (s || {});
  } catch {}
  const replacementEnabled = settings.replacementEnabled === true;
  const imageRequired = IMAGE_REQUIRED_REASONS.includes(returnReason);

  useEffect(() => {
    if (orderId && siteConfig?.id) {
      setCheckingStatus(true);
      orderService.getReturnStatus(orderId, siteConfig.id, token)
        .then(res => { if (res.data) setExistingReturn(res.data); })
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
      await orderService.resendReturnLink(lookupOrderId.trim(), { siteId: siteConfig.id, email: lookupEmail.trim() });
      setLookupMessage('A return link has been sent to your email. Please check your inbox.');
    } catch (err) {
      setLookupMessage(err.message || 'Could not find this order. Please check your order number and email.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    if (photos.length + files.length > 5) {
      alert('You can upload a maximum of 5 photos.');
      return;
    }
    setUploadingPhotos(true);
    try {
      const API_BASE = getApiBase();
      const newPhotos = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('photo', file);
        const resp = await fetch(`${API_BASE}/api/upload/return-photo?siteId=${siteConfig.id}`, {
          method: 'POST',
          body: formData,
        });
        const result = await resp.json();
        if (result.success && result.data?.url) {
          newPhotos.push(result.data.url);
        }
      }
      setPhotos(prev => [...prev, ...newPhotos]);
    } catch {
      alert('Failed to upload one or more images. Please try again.');
    } finally {
      setUploadingPhotos(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePhoto = (idx) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const isFormValid = () => {
    if (!returnReason) return false;
    if (!returnDetail.trim()) return false;
    if (imageRequired && photos.length === 0) return false;
    return true;
  };

  const handleSubmit = async () => {
    if (!isFormValid()) return;
    setSubmitting(true);
    setError('');
    try {
      await orderService.createReturnRequest(orderId, {
        siteId: siteConfig.id,
        reason: returnReason,
        reasonDetail: returnDetail,
        photos: photos.length > 0 ? photos : undefined,
        resolution: replacementEnabled ? resolution : 'refund',
        returnToken: token,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Failed to submit return request');
    } finally {
      setSubmitting(false);
    }
  };

  const statusColors = { requested: '#ff9800', approved: '#2196f3', rejected: '#e53935', refunded: '#27ae60' };
  const statusLabels = { requested: 'Requested', approved: 'Approved', rejected: 'Rejected', refunded: 'Refunded' };

  return (
    <div style={{ minHeight: '80vh', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '40px 16px' }}>
      <div style={{ maxWidth: 560, width: '100%', background: '#fff', borderRadius: 12, boxShadow: '0 2px 20px rgba(0,0,0,0.08)', padding: 32 }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, margin: '0 0 8px', color: '#1e293b' }}>Return Order</h1>

        {mode === 'lookup' && !orderId && (
          <>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              Enter your order number and email address to receive a return link.
            </p>
            <form onSubmit={handleLookup}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#334155' }}>Order Number</label>
                <input type="text" value={lookupOrderId} onChange={e => setLookupOrderId(e.target.value)} placeholder="e.g. FX-123456" style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} required />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#334155' }}>Email Address</label>
                <input type="email" value={lookupEmail} onChange={e => setLookupEmail(e.target.value)} placeholder="your@email.com" style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} required />
              </div>
              {lookupMessage && (
                <div style={{ padding: '12px 16px', borderRadius: 8, marginBottom: 16, background: lookupMessage.includes('sent') ? '#f0fdf4' : '#fef2f2', color: lookupMessage.includes('sent') ? '#166534' : '#991b1b', fontSize: 14 }}>
                  {lookupMessage}
                </div>
              )}
              <button type="submit" disabled={lookupLoading} style={{ width: '100%', padding: '12px 24px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: lookupLoading ? 'not-allowed' : 'pointer', opacity: lookupLoading ? 0.7 : 1 }}>
                {lookupLoading ? 'Sending...' : 'Send Return Link'}
              </button>
            </form>
          </>
        )}

        {orderId && checkingStatus && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ width: 40, height: 40, border: '4px solid #f3f3f3', borderTop: '4px solid #c8a97e', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: '#777' }}>Checking return status...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {orderId && !checkingStatus && existingReturn && (
          <div style={{ marginTop: 16 }}>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16 }}>
              Order <strong>#{existingReturn.order_number || orderId}</strong>
            </p>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>Return Status</div>
              <span style={{ display: 'inline-block', background: statusColors[existingReturn.status] || '#757575', color: '#fff', borderRadius: 20, padding: '6px 20px', fontSize: 15, fontWeight: 600 }}>
                {statusLabels[existingReturn.status] || existingReturn.status}
              </span>
              {existingReturn.resolution && (
                <div style={{ marginTop: 12, fontSize: 13, color: '#64748b' }}>
                  Requested: <strong style={{ color: '#334155' }}>{existingReturn.resolution === 'replacement' ? 'Replacement' : 'Refund'}</strong>
                </div>
              )}
              {existingReturn.admin_note && (
                <div style={{ marginTop: 16, padding: '12px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, textAlign: 'left' }}>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>Note from store</div>
                  <div style={{ fontSize: 14, color: '#334155' }}>{existingReturn.admin_note}</div>
                </div>
              )}
              {existingReturn.status === 'refunded' && existingReturn.refund_amount && (
                <div style={{ marginTop: 12, fontSize: 14, color: '#334155' }}>Refund amount: <strong>{existingReturn.refund_amount}</strong></div>
              )}
            </div>
          </div>
        )}

        {orderId && !checkingStatus && !existingReturn && !submitted && (
          <div style={{ marginTop: 16 }}>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
              Submit a return request for order <strong>#{orderId}</strong>
            </p>
            {error && (
              <div style={{ padding: '12px 16px', borderRadius: 8, marginBottom: 16, background: '#fef2f2', color: '#991b1b', fontSize: 14 }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 10, fontSize: 14, color: '#334155' }}>Reason for return *</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {RETURN_REASONS.map(reason => (
                  <label key={reason} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 14px', borderRadius: 6, border: `1.5px solid ${returnReason === reason ? '#0f172a' : '#e2e8f0'}`, background: returnReason === reason ? '#f8fafc' : '#fff', transition: 'all 0.15s' }}>
                    <input type="radio" name="returnReason" value={reason} checked={returnReason === reason} onChange={() => setReturnReason(reason)} style={{ accentColor: '#0f172a' }} />
                    <span style={{ fontSize: 14, color: '#334155', fontWeight: returnReason === reason ? 600 : 400 }}>{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 14, color: '#334155' }}>
                Additional notes *
              </label>
              <textarea
                value={returnDetail}
                onChange={e => setReturnDetail(e.target.value)}
                rows={3}
                placeholder={imageRequired ? 'Please describe the issue in detail (e.g. what is wrong, when was it noticed)...' : 'Tell us more about your return request...'}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
              {returnReason && !returnDetail.trim() && (
                <p style={{ fontSize: 12, color: '#e53935', marginTop: 4 }}>Please provide details before submitting.</p>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 14, color: '#334155' }}>
                Photos {imageRequired ? '*' : '(optional)'} {photos.length > 0 ? `(${photos.length}/5)` : ''}
              </label>
              {imageRequired && (
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 10, lineHeight: 1.5 }}>
                  Please upload clear photos showing the issue. This helps us process your request faster.
                </p>
              )}

              {photos.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {photos.map((url, idx) => (
                    <div key={idx} style={{ position: 'relative', width: 80, height: 80 }}>
                      <img src={url} alt={`Return photo ${idx + 1}`} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0' }} />
                      <button
                        onClick={() => removePhoto(idx)}
                        style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#e53935', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}

              {photos.length < 5 && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhotos}
                    style={{ padding: '10px 16px', border: '1.5px dashed #cbd5e1', borderRadius: 8, background: '#f8fafc', color: '#475569', cursor: uploadingPhotos ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <i className="fas fa-camera" />
                    {uploadingPhotos ? 'Uploading...' : 'Upload Photos'}
                  </button>
                </>
              )}
              {imageRequired && photos.length === 0 && returnReason && (
                <p style={{ fontSize: 12, color: '#e53935', marginTop: 4 }}>At least 1 photo is required for this return reason.</p>
              )}
            </div>

            {replacementEnabled && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 10, fontSize: 14, color: '#334155' }}>Preferred resolution *</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[
                    { value: 'refund', label: 'Refund', icon: 'fa-money-bill-wave', desc: 'Get your money back' },
                    { value: 'replacement', label: 'Replacement', icon: 'fa-exchange-alt', desc: 'Send me a new item' },
                  ].map(opt => (
                    <label
                      key={opt.value}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '14px 12px', borderRadius: 8, border: `1.5px solid ${resolution === opt.value ? '#0f172a' : '#e2e8f0'}`, background: resolution === opt.value ? '#f8fafc' : '#fff', textAlign: 'center', transition: 'all 0.15s' }}
                    >
                      <input type="radio" name="resolution" value={opt.value} checked={resolution === opt.value} onChange={() => setResolution(opt.value)} style={{ display: 'none' }} />
                      <i className={`fas ${opt.icon}`} style={{ fontSize: 20, color: resolution === opt.value ? '#0f172a' : '#94a3b8' }} />
                      <span style={{ fontWeight: 600, fontSize: 14, color: '#334155' }}>{opt.label}</span>
                      <span style={{ fontSize: 12, color: '#64748b' }}>{opt.desc}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || !isFormValid()}
              style={{ width: '100%', padding: '12px 24px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: (submitting || !isFormValid()) ? 0.6 : 1 }}
            >
              {submitting ? 'Submitting...' : 'Submit Return Request'}
            </button>
          </div>
        )}

        {submitted && (
          <div style={{ marginTop: 16, textAlign: 'center', padding: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, margin: '0 0 8px', color: '#166534' }}>Return Request Submitted</h2>
            <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>
              We've received your return request. You'll receive an email update once it's reviewed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
