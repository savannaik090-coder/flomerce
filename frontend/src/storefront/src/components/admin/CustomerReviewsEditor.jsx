import React, { useState, useEffect, useContext, useRef } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { resolveImageUrl } from '../../utils/imageUrl.js';
import SectionToggle from './SectionToggle.jsx';
import SaveBar from './SaveBar.jsx';

const API_BASE = typeof window !== 'undefined' && window.location.hostname.endsWith('fluxe.in') ? '' : 'https://fluxe.in';

export default function CustomerReviewsEditor({ onSaved, onPreviewUpdate }) {
  const { siteConfig } = useContext(SiteContext);
  const [sectionTitle, setSectionTitle] = useState('What Our Customers Say');
  const [sectionSubtitle, setSectionSubtitle] = useState('Real reviews from our happy customers');
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [form, setForm] = useState({ text: '', name: '', rating: 5, image: '', imageKey: '' });
  const [uploading, setUploading] = useState(false);
  const [showSection, setShowSection] = useState(true);
  const [error, setError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (siteConfig?.id) loadSettings();
  }, [siteConfig?.id]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    setHasChanges(true);
    if (onPreviewUpdate) onPreviewUpdate({ reviewsSectionTitle: sectionTitle, reviewsSectionSubtitle: sectionSubtitle, reviews, showCustomerReviews: showSection });
  }, [sectionTitle, sectionSubtitle, reviews, showSection]);

  async function loadSettings() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/site?subdomain=${encodeURIComponent(siteConfig.subdomain)}`);
      const result = await response.json();
      if (result.success && result.data) {
        let settings = result.data.settings || {};
        if (typeof settings === 'string') {
          try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
        }
        setSectionTitle(settings.reviewsSectionTitle || 'What Our Customers Say');
        setSectionSubtitle(settings.reviewsSectionSubtitle || 'Real reviews from our happy customers');
        setReviews(settings.reviews || []);
        setShowSection(settings.showCustomerReviews !== false);
      }
    } catch (e) {
      console.error('Failed to load reviews settings:', e);
    } finally {
      hasLoadedRef.current = true;
      setLoading(false);
    }
  }

  async function saveToSettings(data) {
    const token = sessionStorage.getItem('site_admin_token');
    const response = await fetch(`${API_BASE}/api/sites/${siteConfig.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `SiteAdmin ${token}` : '',
      },
      body: JSON.stringify({ settings: data }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to save');
    }
    return result;
  }

  async function handleSaveSection(e) {
    e.preventDefault();
    setSaving(true);
    setStatus('');
    try {
      await saveToSettings({
        reviewsSectionTitle: sectionTitle,
        reviewsSectionSubtitle: sectionSubtitle,
        showCustomerReviews: showSection,
      });
      setStatus('success');
      setHasChanges(false);
      if (onSaved) onSaved();
    } catch (e) {
      setStatus('error:' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleImageUpload(file) {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setError('Please upload a JPG, PNG, WebP, or GIF image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image is too large. Maximum size is 10MB.');
      return;
    }

    setUploading(true);
    setError('');
    try {
      const token = sessionStorage.getItem('site_admin_token');
      const formData = new FormData();
      formData.append('images', file, file.name || 'review-image.jpg');
      const response = await fetch(`${API_BASE}/api/upload/image?siteId=${siteConfig.id}`, {
        method: 'POST',
        headers: token ? { 'Authorization': `SiteAdmin ${token}` } : {},
        body: formData,
      });
      const result = await response.json();
      if (response.ok && result.success && result.data?.images?.[0]?.url) {
        const uploaded = result.data.images[0];
        setForm(p => ({ ...p, image: uploaded.url, imageKey: uploaded.key || '' }));
      } else {
        setError('Upload failed: ' + (result.error || result.message || 'Unknown error'));
      }
    } catch (e) {
      setError('Failed to upload image: ' + e.message);
    } finally {
      setUploading(false);
    }
  }

  function openAdd() {
    setEditingIndex(null);
    setForm({ text: '', name: '', rating: 5, image: '', imageKey: '' });
    setError('');
    setShowModal(true);
  }

  function openEdit(index) {
    const review = reviews[index];
    setEditingIndex(index);
    setForm({
      text: review.text || '',
      name: review.name || '',
      rating: review.rating || 5,
      image: review.image || '',
      imageKey: review.imageKey || '',
    });
    setError('');
    setShowModal(true);
  }

  async function handleSaveReview(e) {
    e.preventDefault();
    if (!form.text.trim()) {
      setError('Review text is required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const reviewData = {
        text: form.text.trim(),
        name: form.name.trim(),
        rating: form.rating,
        image: form.image,
        imageKey: form.imageKey,
      };

      let updatedReviews;
      if (editingIndex !== null) {
        updatedReviews = reviews.map((r, i) => i === editingIndex ? reviewData : r);
      } else {
        updatedReviews = [...reviews, reviewData];
      }

      await saveToSettings({ reviews: updatedReviews });
      setReviews(updatedReviews);
      setShowModal(false);
      if (onSaved) onSaved();
    } catch (err) {
      setError('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteReview(index) {
    if (!window.confirm('Delete this review?')) return;
    try {
      const updatedReviews = reviews.filter((_, i) => i !== index);
      await saveToSettings({ reviews: updatedReviews });
      setReviews(updatedReviews);
      if (onSaved) onSaved();
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  }

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  return (
    <div>
      <SaveBar topBar saving={saving} hasChanges={hasChanges} onSave={(e) => handleSaveSection(e || { preventDefault: () => {} })} />
      <SectionToggle
        enabled={showSection}
        onChange={setShowSection}
        label="Show Customer Reviews"
        description="Toggle the customer reviews section on your homepage"
      />
      <form onSubmit={handleSaveSection} style={{ maxWidth: 700, marginBottom: 32 }}>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Section Settings</h3>
          </div>
          <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Customize the title and subtitle that appear above your customer reviews on the homepage.
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Section Title</label>
              <input
                type="text"
                value={sectionTitle}
                onChange={e => setSectionTitle(e.target.value)}
                placeholder="e.g., What Our Customers Say"
                maxLength={100}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Section Subtitle</label>
              <input
                type="text"
                value={sectionSubtitle}
                onChange={e => setSectionSubtitle(e.target.value)}
                placeholder="e.g., Real reviews from our happy customers"
                maxLength={150}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>
          </div>
        </div>

        {status && (
          <div style={{
            background: status === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${status === 'success' ? '#bbf7d0' : '#fecaca'}`,
            borderRadius: 8, padding: '12px 16px',
            color: status === 'success' ? '#166534' : '#dc2626',
            marginBottom: 16, fontSize: 14,
          }}>
            {status === 'success' ? 'Section settings saved successfully!' : status.replace('error:', '')}
          </div>
        )}

        <SaveBar saving={saving} hasChanges={hasChanges} onSave={(e) => handleSaveSection(e || { preventDefault: () => {} })} />
      </form>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Customer Reviews</h2>
        <button className="btn btn-primary" onClick={openAdd}>
          <i className="fas fa-plus" style={{ marginRight: 8 }} />Add Review
        </button>
      </div>

      {reviews.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-star" />
          <h3>No Reviews Yet</h3>
          <p>Add customer reviews with images and ratings. These appear in the "What Our Customers Say" section on your homepage.</p>
          <button className="btn btn-primary" onClick={openAdd} style={{ marginTop: 16 }}>
            <i className="fas fa-plus" style={{ marginRight: 8 }} />Add First Review
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {reviews.map((review, index) => (
            <div key={index} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {review.image && (
                <div style={{ width: '100%', height: 180, overflow: 'hidden', background: '#f8f8f8' }}>
                  <img src={resolveImageUrl(review.image)} alt="Review" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              <div style={{ padding: 16 }}>
                <div style={{ fontSize: 14, marginBottom: 8 }}>
                  {'⭐'.repeat(review.rating || 5)}
                </div>
                <p style={{ fontSize: 13, color: '#555', fontStyle: 'italic', marginBottom: 8, lineHeight: 1.5 }}>
                  {review.text.length > 100 ? review.text.substring(0, 100) + '...' : review.text}
                </p>
                {review.name && (
                  <p style={{ fontSize: 12, color: '#888', fontWeight: 600 }}>— {review.name}</p>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-secondary" style={{ flex: 1, fontSize: 13 }} onClick={() => openEdit(index)}>
                    <i className="fas fa-edit" style={{ marginRight: 4 }} />Edit
                  </button>
                  <button
                    style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#dc2626', cursor: 'pointer', fontSize: 13 }}
                    onClick={() => handleDeleteReview(index)}
                  >
                    <i className="fas fa-trash" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 32, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontWeight: 700, fontSize: 18 }}>{editingIndex !== null ? 'Edit Review' : 'Add Review'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}>
                <i className="fas fa-times" />
              </button>
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', marginBottom: 16, fontSize: 13 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSaveReview}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Review Image (Optional)</label>
                {form.image ? (
                  <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', background: '#f8f8f8', marginBottom: 8 }}>
                    <img src={resolveImageUrl(form.image)} alt="Review" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />
                    <button
                      type="button"
                      onClick={() => { setForm(p => ({ ...p, image: '', imageKey: '' })); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      style={{
                        position: 'absolute', top: 8, right: 8,
                        background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none',
                        borderRadius: '50%', width: 28, height: 28, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
                      }}
                    >
                      <i className="fas fa-times" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer.files[0];
                      if (file) handleImageUpload(file);
                    }}
                    style={{
                      border: '2px dashed #cbd5e1', borderRadius: 8, padding: '24px 16px',
                      textAlign: 'center', cursor: uploading ? 'not-allowed' : 'pointer',
                      color: '#94a3b8', background: '#fafafa',
                    }}
                  >
                    {uploading ? (
                      <div>
                        <i className="fas fa-spinner fa-spin" style={{ fontSize: 24, color: '#2563eb', marginBottom: 8, display: 'block' }} />
                        <span style={{ fontSize: 13, color: '#2563eb' }}>Uploading...</span>
                      </div>
                    ) : (
                      <>
                        <i className="fas fa-cloud-upload-alt" style={{ fontSize: 28, marginBottom: 8, display: 'block' }} />
                        <span style={{ fontSize: 13, display: 'block' }}>Click or drag to upload image</span>
                        <span style={{ fontSize: 11, color: '#b0b8c4', marginTop: 4, display: 'block' }}>JPG, PNG, WebP — max 10MB</span>
                      </>
                    )}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  style={{ display: 'none' }}
                  onChange={e => { if (e.target.files[0]) handleImageUpload(e.target.files[0]); e.target.value = ''; }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Review Text *</label>
                <textarea
                  value={form.text}
                  onChange={e => setForm(p => ({ ...p, text: e.target.value }))}
                  placeholder="e.g., Amazing quality! The jewelry is exactly as shown in the pictures."
                  maxLength={500}
                  rows={3}
                  required
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
                />
                <div style={{ textAlign: 'right', fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                  {form.text.length}/500
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Customer Name (Optional)</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g., Priya S."
                    maxLength={50}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Rating</label>
                  <div style={{ display: 'flex', gap: 4, padding: '8px 0' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setForm(p => ({ ...p, rating: star }))}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, padding: 2,
                          color: star <= form.rating ? '#f59e0b' : '#e2e8f0',
                          transition: 'color 0.15s',
                        }}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving || uploading}>
                  {saving ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }} />Saving...</> : editingIndex !== null ? 'Save Changes' : 'Add Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
