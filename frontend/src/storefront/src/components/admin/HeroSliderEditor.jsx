import React, { useState, useEffect, useContext, useRef, createRef } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { resolveImageUrl } from '../../utils/imageUrl.js';
import SaveBar from './SaveBar.jsx';
import LinkSelector from './LinkSelector.jsx';
import { getHeroSliderDefaults } from '../../defaults/index.js';
import { API_BASE } from '../../config.js';
import { usePendingMedia } from '../../hooks/usePendingMedia.js';
const currentYear = new Date().getFullYear();

const MAX_SLIDES = 10;

function newSlide(buttonText = 'SHOP NOW') {
  return { title: '', subtitle: '', description: '', buttonText, buttonLink: '', image: '', visible: true };
}

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
  const defaultButtonText = "SHOP NOW";
  const [slides, setSlides] = useState(() => [newSlide(defaultButtonText), newSlide(defaultButtonText), newSlide(defaultButtonText)]);
  const [showScrollButtons, setShowScrollButtons] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [usingDefaults, setUsingDefaults] = useState(false);
  const fileRefsMap = useRef({});
  const hasLoadedRef = useRef(false);
  const serverValuesRef = useRef(null);
  const pendingMedia = usePendingMedia(siteConfig?.id);

  function getFileRef(index) {
    if (!fileRefsMap.current[index]) {
      fileRefsMap.current[index] = createRef();
    }
    return fileRefsMap.current[index];
  }

  useEffect(() => {
    if (siteConfig?.id) loadHeroSettings();
  }, [siteConfig?.id]);

  useEffect(() => {
    if (serverValuesRef.current === null) return;
    const current = JSON.stringify({ slides, showScrollButtons });
    setHasChanges(current !== serverValuesRef.current);
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
        let merged;
        if (existing.length > 0) {
          merged = existing.map(s => ({
            title: s.title || '',
            subtitle: s.subtitle || '',
            description: s.description || '',
            buttonText: s.buttonText || defaultButtonText,
            buttonLink: s.buttonLink || '',
            image: s.image || '',
            visible: s.visible !== false,
          }));
          setUsingDefaults(false);
        } else {
          const category = siteConfig?.category || 'generic';
          const defaults = getHeroSliderDefaults(category);
          merged = [0, 1, 2].map(i => ({
            title: defaults[i]?.title || '',
            subtitle: defaults[i]?.subtitle || '',
            description: defaults[i]?.description || '',
            buttonText: defaults[i]?.buttonText || defaultButtonText,
            buttonLink: defaults[i]?.buttonLink || '',
            image: '',
            visible: defaults[i]?.visible !== false,
          }));
          setUsingDefaults(true);
        }
        setSlides(merged);
        const scrollVal = settings.heroShowScrollButtons !== false;
        setShowScrollButtons(scrollVal);
        serverValuesRef.current = JSON.stringify({ slides: merged, showScrollButtons: scrollVal });
      } else {
        setStatus('error:' + "Failed to load hero slider settings. Please refresh the page before making changes.");
      }
    } catch (e) {
      console.error('Failed to load hero settings:', e);
      setStatus('error:' + "Failed to load hero slider settings. Please refresh the page before making changes.");
    } finally {
      setLoading(false);
      // Note: if load failed (serverValuesRef.current is still null), the
      // change-detection useEffect early-returns and hasChanges stays false,
      // so the Save button is disabled. This prevents accidentally
      // overwriting the real saved slides with the in-memory default 3.
      // The user sees the error banner above and is told to refresh.
    }
  }

  function updateSlide(index, field, value) {
    setSlides(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function toggleSlideVisibility(index) {
    setSlides(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], visible: !updated[index].visible };
      return updated;
    });
  }

  function addSlide() {
    if (slides.length >= MAX_SLIDES) return;
    setSlides(prev => [...prev, newSlide(defaultButtonText)]);
  }

  function removeSlide(index) {
    if (slides.length <= 1) return;
    const slide = slides[index];
    // Defer R2 deletion until the user actually saves; if they cancel, the
    // image remains live on the saved site config.
    if (slide.image) pendingMedia.markForDeletion(slide.image);
    setSlides(prev => prev.filter((_, i) => i !== index));
    setUploading(prev => {
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });
  }

  function moveSlide(index, direction) {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= slides.length) return;
    setSlides(prev => {
      const updated = [...prev];
      [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
      return updated;
    });
  }

  async function handleImageUpload(index, file) {
    if (!file) return;
    const oldImage = slides[index]?.image;
    setUploading(prev => ({ ...prev, [index]: true }));
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
        const newUrl = result.data.images[0].url;
        updateSlide(index, 'image', newUrl);
        // Track for cleanup on cancel; defer the old image's deletion until save.
        pendingMedia.markUploaded(newUrl);
        if (oldImage) pendingMedia.markForDeletion(oldImage);
      }
    } catch (e) {
      console.error('Failed to upload image:', e);
    } finally {
      setUploading(prev => ({ ...prev, [index]: false }));
    }
  }

  function removeImage(index) {
    const oldImage = slides[index]?.image;
    // Defer R2 deletion until the user saves; preserves live site if they cancel.
    if (oldImage) pendingMedia.markForDeletion(oldImage);
    updateSlide(index, 'image', '');
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setStatus('');
    try {
      const token = sessionStorage.getItem('site_admin_token');
      const filteredSlides = slides.filter(s => s.title.trim() || s.subtitle.trim() || s.description.trim() || s.image);
      const slidesWithVisibility = filteredSlides.map(s => ({
        ...s,
        visible: s.visible !== false,
      }));
      const response = await fetch(`${API_BASE}/api/sites/${siteConfig.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `SiteAdmin ${token}` : '',
        },
        body: JSON.stringify({
          settings: {
            heroSlides: slidesWithVisibility.length > 0 ? slidesWithVisibility : [],
            heroShowScrollButtons: showScrollButtons,
          }
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setStatus('success');
        setUsingDefaults(false);
        serverValuesRef.current = JSON.stringify({ slides, showScrollButtons });
        setHasChanges(false);
        // Save succeeded — now safe to remove old/orphan R2 files.
        // keepUrls = the slide images that are actually saved.
        const keepUrls = slidesWithVisibility.map(s => s.image).filter(Boolean);
        const cleanup = await pendingMedia.commit(keepUrls);
        if (!cleanup.ok) {
          console.warn('Some images failed to delete from storage:', cleanup.failed);
        }
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

  const visibleCount = slides.filter(s => s.visible !== false).length;

  return (
    <div style={{ maxWidth: 700 }}>
      <SaveBar topBar saving={saving} hasChanges={hasChanges} onSave={(e) => handleSave(e || { preventDefault: () => {} })} />
      <form onSubmit={handleSave}>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Hero Slider</h3>
          </div>
          <div className="card-content">
            {usingDefaults && (
              <div style={{ background: '#fffbeb', border: '1px solid #fed7aa', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-info-circle" />
                <span>Showing default content. Edit and save to customize your hero slides.</span>
              </div>
            )}
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              {`Configure slides for the hero section (up to ${MAX_SLIDES}). Use the eye icon to show or hide individual slides.`}
            </p>

            {slides.map((slide, index) => {
              const isVisible = slide.visible !== false;
              const fileRef = getFileRef(index);
              return (
                <div key={index} style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 16,
                  background: isVisible ? '#fafafa' : '#f1f5f9',
                  opacity: isVisible ? 1 : 0.6,
                  transition: 'all 0.2s ease',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 600, color: '#334155', margin: 0 }}>
                      {`Slide ${index + 1}`} {index === 0 ? '' : "(optional)"}
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {index > 0 && (
                        <button type="button" onClick={() => moveSlide(index, 'up')} title="Move up" style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#64748b', fontSize: 12 }}>
                          <i className="fas fa-chevron-up" />
                        </button>
                      )}
                      {index < slides.length - 1 && (
                        <button type="button" onClick={() => moveSlide(index, 'down')} title="Move down" style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#64748b', fontSize: 12 }}>
                          <i className="fas fa-chevron-down" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleSlideVisibility(index)}
                        title={isVisible ? "Hide this slide" : "Show this slide"}
                        style={{
                          background: isVisible ? '#eff6ff' : '#fef2f2',
                          border: `1px solid ${isVisible ? '#bfdbfe' : '#fecaca'}`,
                          borderRadius: 6,
                          padding: '5px 10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 12,
                          color: isVisible ? '#2563eb' : '#dc2626',
                          fontWeight: 500,
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <i className={`fas ${isVisible ? 'fa-eye' : 'fa-eye-slash'}`} />
                        {isVisible ? "Visible" : "Hidden"}
                      </button>
                      {slides.length > 1 && (
                        <button type="button" onClick={() => removeSlide(index)} title="Remove slide" style={{ background: 'none', border: '1px solid #fecaca', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#ef4444', fontSize: 12 }}>
                          <i className="fas fa-trash" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 12, color: '#64748b' }}>
                      Image
                    </label>
                    {slide.image ? (
                      <div style={{ position: 'relative', marginBottom: 8 }}>
                        <img
                          src={resolveImageUrl(slide.image)}
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
                        onClick={() => !uploading[index] && fileRef.current?.click()}
                        style={{
                          border: '2px dashed #cbd5e1', borderRadius: 6, padding: '20px 0',
                          textAlign: 'center', cursor: uploading[index] ? 'not-allowed' : 'pointer', color: '#94a3b8', marginBottom: 8,
                          background: '#fff',
                        }}
                      >
                        {uploading[index] ? (
                          <><i className="fas fa-spinner fa-spin" style={{ fontSize: 24, color: '#2563eb', marginBottom: 4, display: 'block' }} /><span style={{ fontSize: 13, color: '#2563eb' }}>Uploading...</span></>
                        ) : (
                          <>
                            <i className="fas fa-cloud-upload-alt" style={{ fontSize: 24, marginBottom: 4, display: 'block' }} />
                            <span style={{ fontSize: 12 }}>Click to upload image</span>
                          </>
                        )}
                      </div>
                    )}
                    <input
                      ref={fileRef}
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
                        value={slide.title}
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
                        value={slide.subtitle}
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
                      value={slide.description}
                      onChange={e => updateSlide(index, 'description', e.target.value)}
                      placeholder="e.g., SUMMER CELEBRATIONS"
                      maxLength={100}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit' }}
                    />
                    <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, display: 'block' }}>
                      {`Year (${currentYear}) is added automatically on the storefront`}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 12, color: '#64748b' }}>Button Text</label>
                      <input
                        type="text"
                        value={slide.buttonText}
                        onChange={e => updateSlide(index, 'buttonText', e.target.value)}
                        placeholder="SHOP NOW"
                        maxLength={30}
                        style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit' }}
                      />
                    </div>
                    <div>
                      <LinkSelector
                        label="Button Link"
                        value={slide.buttonLink}
                        onChange={val => updateSlide(index, 'buttonLink', val)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {slides.length < MAX_SLIDES && (
              <button
                type="button"
                onClick={addSlide}
                style={{
                  width: '100%',
                  padding: '12px 0',
                  border: '2px dashed #cbd5e1',
                  borderRadius: 8,
                  background: '#fff',
                  color: '#3b82f6',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginBottom: 16,
                  transition: 'all 0.2s ease',
                }}
              >
                <i className="fas fa-plus" />
                {`Add Slide (${slides.length}/${MAX_SLIDES})`}
              </button>
            )}

            {visibleCount === 0 && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-exclamation-triangle" />
                <span>All slides are hidden. At least one slide should be visible for the hero section to appear.</span>
              </div>
            )}

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
            {status === 'success' ? "Hero slider saved successfully!" : status.replace('error:', "Failed to save: ")}
          </div>
        )}

        <SaveBar saving={saving} hasChanges={hasChanges} onSave={(e) => handleSave(e || { preventDefault: () => {} })} />
      </form>
    </div>
  );
}
