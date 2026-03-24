import React, { useState, useEffect, useContext, useRef } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { resolveImageUrl } from '../../utils/imageUrl.js';
import SectionToggle from './SectionToggle.jsx';
import SaveBar from './SaveBar.jsx';

const API_BASE = typeof window !== 'undefined' && window.location.hostname.endsWith('fluxe.in') ? '' : 'https://fluxe.in';

function compressImage(file, maxWidth = 1200, quality = 0.85) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > maxWidth) { h = (maxWidth / w) * h; w = maxWidth; }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(resolve, 'image/jpeg', quality);
    };
    img.src = URL.createObjectURL(file);
  });
}

export default function WelcomeBannerEditor({ onSaved, onPreviewUpdate }) {
  const { siteConfig } = useContext(SiteContext);
  const [heading, setHeading] = useState('');
  const [message, setMessage] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [buttonLink, setButtonLink] = useState('');
  const [bannerImage, setBannerImage] = useState('');
  const [showSection, setShowSection] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const fileRef = useRef(null);
  const hasLoadedRef = useRef(false);
  const skipNextChangeRef = useRef(false);

  const brandName = siteConfig?.brand_name || siteConfig?.brandName || 'Our Store';

  useEffect(() => {
    if (siteConfig?.id) loadSettings();
  }, [siteConfig?.id]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    if (skipNextChangeRef.current) { skipNextChangeRef.current = false; return; }
    setHasChanges(true);
    if (onPreviewUpdate) onPreviewUpdate({ welcomeBannerImage: bannerImage, welcomeBannerHeading: heading, welcomeBannerMessage: message, welcomeBannerButtonText: buttonText, welcomeBannerButtonLink: buttonLink, showWelcomeBanner: showSection });
  }, [heading, message, buttonText, buttonLink, bannerImage, showSection]);

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
        setHeading(settings.welcomeBannerHeading || '');
        setMessage(settings.welcomeBannerMessage || '');
        setButtonText(settings.welcomeBannerButtonText || '');
        setButtonLink(settings.welcomeBannerButtonLink || '');
        setBannerImage(settings.welcomeBannerImage || '');
        setShowSection(settings.showWelcomeBanner !== false);
      }
    } catch (e) {
      console.error('Failed to load welcome banner settings:', e);
    } finally {
      setLoading(false);
      skipNextChangeRef.current = true;
      hasLoadedRef.current = true;
    }
  }

  async function handleImageUpload(file) {
    if (!file) return;
    setUploading(true);
    try {
      const blob = await compressImage(file);
      const formData = new FormData();
      formData.append('images', blob, 'welcome-banner.jpg');
      const token = sessionStorage.getItem('site_admin_token');
      const response = await fetch(`${API_BASE}/api/upload/image?siteId=${siteConfig.id}`, {
        method: 'POST',
        headers: { 'Authorization': token ? `SiteAdmin ${token}` : '' },
        body: formData,
      });
      const result = await response.json();
      if (result.success && result.data?.images?.length > 0 && result.data.images[0].url) {
        setBannerImage(result.data.images[0].url);
      }
    } catch (e) {
      console.error('Failed to upload image:', e);
    } finally {
      setUploading(false);
    }
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
            welcomeBannerImage: bannerImage,
            welcomeBannerHeading: heading,
            welcomeBannerMessage: message,
            welcomeBannerButtonText: buttonText,
            welcomeBannerButtonLink: buttonLink,
            showWelcomeBanner: showSection,
          }
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setStatus('success');
        setHasChanges(false);
        if (onSaved) onSaved();
      } else {
        setStatus('error:' + (result.error || 'Unknown error'));
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
          enabled={showSection}
          onChange={setShowSection}
          label="Show Welcome Banner"
          description="Toggle the first-visit popup banner for new customers"
        />
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Welcome Banner</h3>
          </div>
          <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              This popup banner appears once for first-time visitors after 3 seconds. Customize the image, text, and button to welcome new customers.
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Banner Image</label>
              {bannerImage ? (
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <img
                    src={resolveImageUrl(bannerImage)}
                    alt="Welcome Banner"
                    style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0' }}
                  />
                  <button
                    type="button"
                    onClick={() => setBannerImage('')}
                    style={{
                      position: 'absolute', top: 6, right: 6,
                      background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none',
                      borderRadius: '50%', width: 28, height: 28, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                    }}
                  >
                    <i className="fas fa-times" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: '2px dashed #cbd5e1', borderRadius: 6, padding: '24px 0',
                    textAlign: 'center', cursor: 'pointer', color: '#94a3b8', marginBottom: 8,
                    background: '#fff',
                  }}
                >
                  {uploading ? (
                    <span style={{ fontSize: 13 }}>Uploading...</span>
                  ) : (
                    <>
                      <i className="fas fa-cloud-upload-alt" style={{ fontSize: 24, marginBottom: 4, display: 'block' }} />
                      <span style={{ fontSize: 12 }}>Click to upload banner image</span>
                    </>
                  )}
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files[0]) handleImageUpload(e.target.files[0]); }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Heading</label>
              <input
                type="text"
                value={heading}
                onChange={e => setHeading(e.target.value)}
                placeholder={`Welcome to ${brandName}!`}
                maxLength={80}
                style={{
                  width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0',
                  borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit',
                }}
              />
              <div style={{ textAlign: 'right', fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                {heading.length}/80 {!heading && <span style={{ color: '#64748b' }}>Default: "Welcome to {brandName}!"</span>}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Message</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Discover our exquisite collection. Sign up today to receive exclusive offers and updates."
                maxLength={200}
                rows={3}
                style={{
                  width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0',
                  borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
              <div style={{ textAlign: 'right', fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                {message.length}/200
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Button Text</label>
                <input
                  type="text"
                  value={buttonText}
                  onChange={e => setButtonText(e.target.value)}
                  placeholder="Sign Up Now"
                  maxLength={30}
                  style={{
                    width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0',
                    borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Button Link</label>
                <input
                  type="text"
                  value={buttonLink}
                  onChange={e => setButtonLink(e.target.value)}
                  placeholder="/signup"
                  maxLength={100}
                  style={{
                    width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0',
                    borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>

            <div style={{
              border: '1px solid #e2e8f0', borderRadius: 8, padding: 14,
              background: '#f0f9ff',
            }}>
              <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                <i className="fas fa-info-circle" style={{ marginRight: 6 }} />
                Leave fields empty to use the default text. The banner only shows once per visitor (resets when they clear browser data).
              </p>
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
            {status === 'success' ? 'Welcome banner saved successfully!' : status.replace('error:', 'Failed to save: ')}
          </div>
        )}

        <SaveBar saving={saving} hasChanges={hasChanges} onSave={(e) => handleSave(e || { preventDefault: () => {} })} />
      </form>
    </div>
  );
}
