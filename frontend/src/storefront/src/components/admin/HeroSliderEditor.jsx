import React, { useState, useEffect, useContext, useRef } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { resolveImageUrl } from '../../utils/imageUrl.js';
import SaveBar from './SaveBar.jsx';

const API_BASE = typeof window !== 'undefined' && window.location.hostname.endsWith('fluxe.in') ? '' : 'https://fluxe.in';

function compressImage(file, maxWidth = 1400, quality = 0.85) {
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

export default function HeroSliderEditor({ onSaved, onPreviewUpdate }) {
  const { siteConfig } = useContext(SiteContext);
  const [slides, setSlides] = useState([
    { title: '', subtitle: '', description: '', buttonText: 'SHOP NOW', buttonLink: '', image: '' },
    { title: '', subtitle: '', description: '', buttonText: 'SHOP NOW', buttonLink: '', image: '' },
    { title: '', subtitle: '', description: '', buttonText: 'SHOP NOW', buttonLink: '', image: '' },
  ]);
  const [showScrollButtons, setShowScrollButtons] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState([false, false, false]);
  const [hasChanges, setHasChanges] = useState(false);
  const fileRefs = [useRef(null), useRef(null), useRef(null)];
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (siteConfig?.id) loadHeroSettings();
  }, [siteConfig?.id]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    setHasChanges(true);
    const filtered = slides.filter(s => s.title.trim() || s.subtitle.trim() || s.description.trim() || s.image);
    if (onPreviewUpdate) onPreviewUpdate({ heroSlides: filtered.length > 0 ? filtered : [], heroShowScrollButtons: showScrollButtons });
  }, [slides, showScrollButtons]);

  async function loadHeroSettings() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/site?subdomain=${encodeURIComponent(siteConfig.subdomain)}`);
      const result = await response.json();
      if (result.success && result.data) {
        let settings = result.data.settings || {};
        if (typeof settings === 'string') {
          try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
        }
        const existing = settings.heroSlides || [];
        const merged = [0, 1, 2].map(i => ({
          title: existing[i]?.title || '',
          subtitle: existing[i]?.subtitle || '',
          description: existing[i]?.description || '',
          buttonText: existing[i]?.buttonText || 'SHOP NOW',
          buttonLink: existing[i]?.buttonLink || '',
          image: existing[i]?.image || '',
        }));
        setSlides(merged);
        setShowScrollButtons(settings.heroShowScrollButtons !== false);
      }
    } catch (e) {
      console.error('Failed to load hero settings:', e);
    } finally {
      setLoading(false);
      setTimeout(() => { hasLoadedRef.current = true; }, 0);
    }
  }

  function updateSlide(index, field, value) {
    setSlides(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  async function handleImageUpload(index, file) {
    if (!file) return;
    setUploading(prev => { const u = [...prev]; u[index] = true; return u; });
    try {
      const blob = await compressImage(file);
      const formData = new FormData();
      formData.append('images', blob, 'hero-slide.jpg');
      const token = sessionStorage.getItem('site_admin_token');
      const response = await fetch(`${API_BASE}/api/upload/image?siteId=${siteConfig.id}`, {
        method: 'POST',
        headers: { 'Authorization': token ? `SiteAdmin ${token}` : '' },
        body: formData,
      });
      const result = await response.json();
      if (result.success && result.data?.images?.length > 0 && result.data.images[0].url) {
        updateSlide(index, 'image', result.data.images[0].url);
      }
    } catch (e) {
      console.error('Failed to upload image:', e);
    } finally {
      setUploading(prev => { const u = [...prev]; u[index] = false; return u; });
    }
  }

  function removeImage(index) {
    updateSlide(index, 'image', '');
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setStatus('');
    try {
      const token = sessionStorage.getItem('site_admin_token');
      const filteredSlides = slides.filter(s => s.title.trim() || s.subtitle.trim() || s.description.trim() || s.image);
      const response = await fetch(`${API_BASE}/api/sites/${siteConfig.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `SiteAdmin ${token}` : '',
        },
        body: JSON.stringify({
          settings: {
            heroSlides: filteredSlides.length > 0 ? filteredSlides : [],
            heroShowScrollButtons: showScrollButtons,
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
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Hero Slider</h3>
          </div>
          <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Configure up to 3 slides for the hero section on your homepage. Leave all fields empty to use the default slides.
            </p>

            {[0, 1, 2].map(index => (
              <div key={index} style={{
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: 16,
                marginBottom: 16,
                background: '#fafafa',
              }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#334155' }}>
                  Slide {index + 1} {index === 0 ? '' : '(optional)'}
                </h4>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 12, color: '#64748b' }}>
                    Image
                  </label>
                  {slides[index].image ? (
                    <div style={{ position: 'relative', marginBottom: 8 }}>
                      <img
                        src={resolveImageUrl(slides[index].image)}
                        alt={`Slide ${index + 1}`}
                        style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0' }}
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
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
                      onClick={() => fileRefs[index].current?.click()}
                      style={{
                        border: '2px dashed #cbd5e1', borderRadius: 6, padding: '20px 0',
                        textAlign: 'center', cursor: 'pointer', color: '#94a3b8', marginBottom: 8,
                        background: '#fff',
                      }}
                    >
                      {uploading[index] ? (
                        <span style={{ fontSize: 13 }}>Uploading...</span>
                      ) : (
                        <>
                          <i className="fas fa-cloud-upload-alt" style={{ fontSize: 24, marginBottom: 4, display: 'block' }} />
                          <span style={{ fontSize: 12 }}>Click to upload image</span>
                        </>
                      )}
                    </div>
                  )}
                  <input
                    ref={fileRefs[index]}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => { if (e.target.files[0]) handleImageUpload(index, e.target.files[0]); }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 12, color: '#64748b' }}>Title</label>
                    <input
                      type="text"
                      value={slides[index].title}
                      onChange={e => updateSlide(index, 'title', e.target.value)}
                      placeholder="e.g., ELEGANT"
                      maxLength={50}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 12, color: '#64748b' }}>Subtitle</label>
                    <input
                      type="text"
                      value={slides[index].subtitle}
                      onChange={e => updateSlide(index, 'subtitle', e.target.value)}
                      placeholder="e.g., Collection"
                      maxLength={50}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 12, color: '#64748b' }}>Description</label>
                  <input
                    type="text"
                    value={slides[index].description}
                    onChange={e => updateSlide(index, 'description', e.target.value)}
                    placeholder="e.g., SUMMER CELEBRATIONS 2025"
                    maxLength={100}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 12, color: '#64748b' }}>Button Text</label>
                    <input
                      type="text"
                      value={slides[index].buttonText}
                      onChange={e => updateSlide(index, 'buttonText', e.target.value)}
                      placeholder="SHOP NOW"
                      maxLength={30}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 12, color: '#64748b' }}>Button Link</label>
                    <input
                      type="text"
                      value={slides[index].buttonLink}
                      onChange={e => updateSlide(index, 'buttonLink', e.target.value)}
                      placeholder="/category/new-arrivals"
                      maxLength={100}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit' }}
                    />
                  </div>
                </div>
              </div>
            ))}

            <div style={{
              border: '1px solid #e2e8f0', borderRadius: 8, padding: 14,
              background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <label style={{ fontWeight: 600, fontSize: 13, color: '#334155' }}>Show Scroll Buttons</label>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>Display left/right arrows on the hero slider</p>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showScrollButtons}
                  onChange={e => setShowScrollButtons(e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: showScrollButtons ? '#2563eb' : '#cbd5e1',
                  borderRadius: 12, transition: '0.3s',
                }} />
                <span style={{
                  position: 'absolute', top: 2, left: showScrollButtons ? 22 : 2,
                  width: 20, height: 20, backgroundColor: '#fff',
                  borderRadius: '50%', transition: '0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </label>
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
            {status === 'success' ? 'Hero slider saved successfully!' : status.replace('error:', 'Failed to save: ')}
          </div>
        )}

        <SaveBar saving={saving} hasChanges={hasChanges} onSave={(e) => handleSave(e || { preventDefault: () => {} })} />
      </form>
    </div>
  );
}
