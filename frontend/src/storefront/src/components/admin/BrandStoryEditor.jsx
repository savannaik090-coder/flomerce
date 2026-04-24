import React, { useState, useEffect, useContext, useRef } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import SectionToggle from './SectionToggle.jsx';
import SaveBar from './SaveBar.jsx';
import { API_BASE } from '../../config.js';
import { usePendingMedia } from '../../hooks/usePendingMedia.js';

function resolveImg(src) {
  if (!src) return '';
  if (src.startsWith('data:') || src.startsWith('http')) return src;
  if (src.startsWith('/api/')) return `${API_BASE}${src}`;
  return src;
}

export default function BrandStoryEditor({ onSaved, onPreviewUpdate, sectionVisible = true, onToggleVisibility }) {
  const { siteConfig } = useContext(SiteContext);
  const [headline, setHeadline] = useState("Our Story");
  const [text, setText] = useState('');
  const [image, setImage] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [ctaLink, setCtaLink] = useState('/about');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef(null);
  const hasLoadedRef = useRef(false);
  const serverValuesRef = useRef(null);
  const pendingMedia = usePendingMedia(siteConfig?.id);

  useEffect(() => {
    if (siteConfig?.id) loadSettings();
  }, [siteConfig?.id]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    const current = JSON.stringify({ headline, text, image, ctaText, ctaLink });
    setHasChanges(current !== serverValuesRef.current);
    if (onPreviewUpdate) onPreviewUpdate({
      brandStoryHeadline: headline,
      brandStoryText: text,
      brandStoryImage: image,
      brandStoryCtaText: ctaText,
      brandStoryCtaLink: ctaLink,
    });
  }, [headline, text, image, ctaText, ctaLink]);

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
        const hVal = settings.brandStoryHeadline || "Our Story";
        const tVal = settings.brandStoryText || '';
        const iVal = settings.brandStoryImage || '';
        const ctVal = settings.brandStoryCtaText || '';
        const clVal = settings.brandStoryCtaLink || '/about';
        setHeadline(hVal);
        setText(tVal);
        setImage(iVal);
        setCtaText(ctVal);
        setCtaLink(clVal);
        serverValuesRef.current = JSON.stringify({ headline: hVal, text: tVal, image: iVal, ctaText: ctVal, ctaLink: clVal });
      }
    } catch (e) {
      console.error('Failed to load brand story settings:', e);
    } finally {
      setLoading(false);
      setTimeout(() => { hasLoadedRef.current = true; }, 0);
    }
  }

  function handleImageUpload(file) {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setStatus('error:' + "Please upload a JPG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setStatus('error:' + "Image is too large. Maximum size is 10MB.");
      return;
    }

    setUploading(true);
    setStatus('');
    const formData = new FormData();
    formData.append('image', file);
    const token = sessionStorage.getItem('site_admin_token');

    fetch(`${API_BASE}/api/upload/image?siteId=${siteConfig.id}`, {
      method: 'POST',
      headers: token ? { 'Authorization': `SiteAdmin ${token}` } : {},
      body: formData,
    })
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data?.url) {
          if (image) pendingMedia.markForDeletion(image);
          pendingMedia.markUploaded(result.data.url);
          setImage(result.data.url);
        } else {
          setStatus('error:' + `Upload failed: ${result.error || "Unknown error"}`);
        }
      })
      .catch(e => setStatus('error:' + `Upload failed: ${e.message}`))
      .finally(() => setUploading(false));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setStatus('');
    try {
      const token = sessionStorage.getItem('site_admin_token');
      const response = await fetch(`${API_BASE}/api/sites/${siteConfig.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `SiteAdmin ${token}` : '',
        },
        body: JSON.stringify({
          settings: {
            brandStoryHeadline: headline,
            brandStoryText: text,
            brandStoryImage: image,
            brandStoryCtaText: ctaText,
            brandStoryCtaLink: ctaLink,
          }
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setStatus('success');
        serverValuesRef.current = JSON.stringify({ headline, text, image, ctaText, ctaLink });
        setHasChanges(false);
        const cleanup = await pendingMedia.commit([image]);
        if (!cleanup.ok) console.warn('Some images failed to delete from storage:', cleanup.failed);
        if (onSaved) onSaved();
      } else {
        setStatus('error:' + (result.error || "Unknown error"));
      }
    } catch (e) {
      setStatus('error:' + e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  return (
    <div style={{ maxWidth: 700 }}>
      <SaveBar topBar saving={saving} hasChanges={hasChanges} onSave={(e) => handleSave(e || { preventDefault: () => {} })} />
      <form onSubmit={handleSave}>
        <SectionToggle
          enabled={sectionVisible}
          onChange={() => onToggleVisibility?.()}
          label="Show Brand Story"
          description="Display a brand narrative section with image and text on your homepage"
        />
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Brand Story Section</h3>
          </div>
          <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Tell your brand's story with a beautiful split layout — an image on one side and your narrative on the other. This section helps build emotional connection with customers.
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Image</label>
              {image ? (
                <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', background: '#f5f5f5', marginBottom: 8 }}>
                  <img
                    src={resolveImg(image)}
                    alt="Brand story"
                    style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (image) pendingMedia.markForDeletion(image);
                      setImage('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
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
                    border: '2px dashed #cbd5e1', borderRadius: 8, padding: '28px 16px',
                    textAlign: 'center', cursor: uploading ? 'not-allowed' : 'pointer',
                    color: '#94a3b8', background: '#fafafa', marginBottom: 8,
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
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                If no image is uploaded, the section will show a centered text-only layout.
              </p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Headline</label>
              <input
                type="text"
                value={headline}
                onChange={e => setHeadline(e.target.value)}
                placeholder="Our Story"
                maxLength={100}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Story Text</label>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Tell your brand's story here — what drives you, what makes your products special, and why customers should care..."
                maxLength={500}
                rows={4}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
              />
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{`${text.length}/500 characters`}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Button Text</label>
                <input
                  type="text"
                  value={ctaText}
                  onChange={e => setCtaText(e.target.value)}
                  placeholder="Leave empty to hide button"
                  maxLength={30}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Button Link</label>
                <input
                  type="text"
                  value={ctaLink}
                  onChange={e => setCtaLink(e.target.value)}
                  placeholder="/about"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>
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
            {status === 'success' ? "Brand story section saved successfully!" : status.replace('error:', '')}
          </div>
        )}

        <SaveBar saving={saving} hasChanges={hasChanges} onSave={(e) => handleSave(e || { preventDefault: () => {} })} />
      </form>
    </div>
  );
}
