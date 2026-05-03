import React, { useState, useEffect, useContext, useRef, createRef, useMemo } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { resolveImageUrl } from '../../utils/imageUrl.js';
import SaveBar from './SaveBar.jsx';
import LinkSelector from './LinkSelector.jsx';
import { getHeroSliderDefaults } from '../../defaults/index.js';
import { API_BASE } from '../../config.js';
import { usePendingMedia } from '../../hooks/usePendingMedia.js';
import AdminColorField from './style/AdminColorField.jsx';
import AdminFontPicker from './style/AdminFontPicker.jsx';

const HERO_DEFAULTS = {
  classic: { titleColor: '#ffffff', descColor: '#ffffff', btnBg: '#b49b7d', btnText: '#ffffff', overlayColor: '#000000' },
  modern:  { titleColor: '#111111', descColor: '#666666', btnBg: '#111111', btnText: '#ffffff', overlayColor: '#000000' },
};
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

  const [heroTitleColor, setHeroTitleColor] = useState('');
  const [heroTitleFont, setHeroTitleFont] = useState('');
  const [heroDescColor, setHeroDescColor] = useState('');
  const [heroBtnBg, setHeroBtnBg] = useState('');
  const [heroBtnText, setHeroBtnText] = useState('');
  const [heroBtnStyle, setHeroBtnStyle] = useState('');
  const [heroBtnRadius, setHeroBtnRadius] = useState('');
  const [heroOverlayColor, setHeroOverlayColor] = useState('');
  const [heroOverlayOpacity, setHeroOverlayOpacity] = useState(0);
  const [heroHeight, setHeroHeight] = useState('');
  const [heroTextAlign, setHeroTextAlign] = useState('');
  const [heroTransition, setHeroTransition] = useState('');
  const [heroSpeed, setHeroSpeed] = useState('');
  const [heroArrowBg, setHeroArrowBg] = useState('');
  const [heroArrowColor, setHeroArrowColor] = useState('');
  const [activeView, setActiveView] = useState('content');

  const activeTheme = useMemo(() => {
    const t = siteConfig?.settings?.theme === 'modern' ? 'modern' : 'classic';
    return HERO_DEFAULTS[t] ? t : 'classic';
  }, [siteConfig?.settings?.theme]);
  const themeDefaults = HERO_DEFAULTS[activeTheme];

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
    const current = JSON.stringify({ slides, showScrollButtons, heroTitleColor, heroTitleFont, heroDescColor, heroBtnBg, heroBtnText, heroBtnStyle, heroBtnRadius, heroOverlayColor, heroOverlayOpacity, heroHeight, heroTextAlign, heroTransition, heroSpeed, heroArrowBg, heroArrowColor });
    setHasChanges(current !== serverValuesRef.current);
    const filtered = slides.filter(s => s.title.trim() || s.subtitle.trim() || s.description.trim() || s.image);
    if (onPreviewUpdate) onPreviewUpdate({
      heroSlides: filtered.length > 0 ? filtered : [],
      heroShowScrollButtons: showScrollButtons,
      heroTitleColor,
      heroTitleFont,
      heroDescColor,
      heroBtnBg,
      heroBtnText,
      heroBtnStyle,
      heroBtnRadius,
      heroOverlayColor,
      heroOverlayOpacity: heroOverlayOpacity > 0 ? String((heroOverlayOpacity / 100).toFixed(2)) : '',
      heroHeight,
      heroTextAlign,
      heroTransition,
      heroSpeed,
      heroArrowBg,
      heroArrowColor,
    });
  }, [slides, showScrollButtons, heroTitleColor, heroTitleFont, heroDescColor, heroBtnBg, heroBtnText, heroBtnStyle, heroBtnRadius, heroOverlayColor, heroOverlayOpacity, heroHeight, heroTextAlign, heroTransition, heroSpeed, heroArrowBg, heroArrowColor]);

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

        const titleColorVal = settings.heroTitleColor || '';
        const titleFontVal = settings.heroTitleFont || '';
        const descColorVal = settings.heroDescColor || '';
        const btnBgVal = settings.heroBtnBg || '';
        const btnTextVal = settings.heroBtnText || '';
        const btnStyleVal = settings.heroBtnStyle || '';
        const btnRadiusVal = settings.heroBtnRadius || '';
        const overlayColorVal = settings.heroOverlayColor || '';
        const savedOpacity = settings.heroOverlayOpacity || '';
        const overlayOpacityVal = savedOpacity ? Math.round(parseFloat(savedOpacity) * 100) : 0;

        setHeroTitleColor(titleColorVal);
        setHeroTitleFont(titleFontVal);
        setHeroDescColor(descColorVal);
        setHeroBtnBg(btnBgVal);
        setHeroBtnText(btnTextVal);
        setHeroBtnStyle(btnStyleVal);
        setHeroBtnRadius(btnRadiusVal);
        setHeroOverlayColor(overlayColorVal);
        setHeroOverlayOpacity(overlayOpacityVal);

        const heroHeightVal = settings.heroHeight || '';
        const heroTextAlignVal = settings.heroTextAlign || '';
        const heroTransitionVal = settings.heroTransition || '';
        const heroSpeedVal = settings.heroSpeed || '';
        const heroArrowBgVal = settings.heroArrowBg || '';
        const heroArrowColorVal = settings.heroArrowColor || '';
        setHeroHeight(heroHeightVal);
        setHeroTextAlign(heroTextAlignVal);
        setHeroTransition(heroTransitionVal);
        setHeroSpeed(heroSpeedVal);
        setHeroArrowBg(heroArrowBgVal);
        setHeroArrowColor(heroArrowColorVal);

        serverValuesRef.current = JSON.stringify({
          slides: merged, showScrollButtons: scrollVal,
          heroTitleColor: titleColorVal, heroTitleFont: titleFontVal, heroDescColor: descColorVal,
          heroBtnBg: btnBgVal, heroBtnText: btnTextVal, heroBtnStyle: btnStyleVal, heroBtnRadius: btnRadiusVal,
          heroOverlayColor: overlayColorVal, heroOverlayOpacity: overlayOpacityVal,
          heroHeight: heroHeightVal, heroTextAlign: heroTextAlignVal, heroTransition: heroTransitionVal, heroSpeed: heroSpeedVal,
          heroArrowBg: heroArrowBgVal, heroArrowColor: heroArrowColorVal,
        });
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
            heroTitleColor: heroTitleColor || '',
            heroTitleFont: heroTitleFont || '',
            heroDescColor: heroDescColor || '',
            heroBtnBg: heroBtnBg || '',
            heroBtnText: heroBtnText || '',
            heroBtnStyle: heroBtnStyle || '',
            heroBtnRadius: heroBtnRadius || '',
            heroOverlayColor: heroOverlayColor || '',
            heroOverlayOpacity: heroOverlayOpacity > 0 ? String((heroOverlayOpacity / 100).toFixed(2)) : '',
            heroHeight: heroHeight || '',
            heroTextAlign: heroTextAlign || '',
            heroTransition: heroTransition || '',
            heroSpeed: heroSpeed || '',
            heroArrowBg: heroArrowBg || '',
            heroArrowColor: heroArrowColor || '',
          }
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setStatus('success');
        setUsingDefaults(false);
        serverValuesRef.current = JSON.stringify({
          slides, showScrollButtons,
          heroTitleColor, heroTitleFont, heroDescColor,
          heroBtnBg, heroBtnText, heroBtnStyle, heroBtnRadius,
          heroOverlayColor, heroOverlayOpacity,
          heroHeight, heroTextAlign, heroTransition, heroSpeed,
          heroArrowBg, heroArrowColor,
        });
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
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e2e8f0' }}>
          {[{ key: 'content', icon: 'fa-edit', label: 'Content' }, { key: 'appearance', icon: 'fa-paint-brush', label: 'Appearance' }].map(tab => (
            <button key={tab.key} type="button" onClick={() => setActiveView(tab.key)} style={{ padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, color: activeView === tab.key ? '#2563eb' : '#64748b', borderBottom: `2px solid ${activeView === tab.key ? '#2563eb' : 'transparent'}`, marginBottom: -2, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', transition: 'color 0.15s ease' }}>
              <i className={`fas ${tab.icon}`} />{tab.label}
            </button>
          ))}
        </div>

        {activeView === 'content' && <>
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
        </>}

        {activeView === 'appearance' && <>
        {/* ── Hero Style Card ──────────────────────────────────── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Hero Style</h3>
          </div>
          <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
              Customize colors, fonts, and overlay for the hero section. Leave any field blank to use the theme default.
            </p>

            {/* Typography */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#94a3b8', marginBottom: 14 }}>Typography</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
                <AdminColorField
                  label="Title & Subtitle Color"
                  value={heroTitleColor}
                  fallback={themeDefaults.titleColor}
                  onChange={setHeroTitleColor}
                />
                <AdminColorField
                  label="Description Color"
                  value={heroDescColor}
                  fallback={themeDefaults.descColor}
                  onChange={setHeroDescColor}
                />
              </div>
              <AdminFontPicker label="Title Font" value={heroTitleFont} onChange={setHeroTitleFont} />
            </div>

            {/* CTA Button */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#94a3b8', marginBottom: 14 }}>CTA Button</p>

              {/* Button preview */}
              <div style={{ marginBottom: 16, padding: '14px 16px', background: '#0f172a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {(() => {
                  const resolvedBg = heroBtnBg || themeDefaults.btnBg;
                  const resolvedText = heroBtnText || themeDefaults.btnText;
                  const rMap = { sharp: '0', rounded: '8px', pill: '999px' };
                  const radius = rMap[heroBtnRadius] || (activeTheme === 'modern' ? '4px' : '0');
                  let style;
                  if (heroBtnStyle === 'outlined') {
                    style = { background: 'transparent', color: resolvedBg, border: `2px solid ${resolvedBg}`, borderRadius: radius };
                  } else if (heroBtnStyle === 'ghost') {
                    style = { background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.5)', borderRadius: radius };
                  } else {
                    style = { background: resolvedBg, color: resolvedText, border: 'none', borderRadius: radius };
                  }
                  return (
                    <span style={{ ...style, padding: '10px 28px', fontSize: 13, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', cursor: 'default' }}>
                      SHOP NOW
                    </span>
                  );
                })()}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
                <AdminColorField
                  label="Button Background"
                  value={heroBtnBg}
                  fallback={themeDefaults.btnBg}
                  onChange={setHeroBtnBg}
                />
                <AdminColorField
                  label="Button Text Color"
                  value={heroBtnText}
                  fallback={themeDefaults.btnText}
                  onChange={setHeroBtnText}
                />
              </div>

              {/* Button Style picker */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Button Style</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {[
                    { value: '', label: 'Filled', desc: 'Solid background' },
                    { value: 'outlined', label: 'Outlined', desc: 'Transparent + border' },
                    { value: 'ghost', label: 'Ghost', desc: 'Semi-transparent' },
                  ].map(opt => {
                    const active = heroBtnStyle === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setHeroBtnStyle(opt.value)}
                        style={{
                          padding: '12px 8px', border: `2px solid ${active ? '#0f172a' : '#e2e8f0'}`,
                          borderRadius: 8, background: active ? '#0f172a' : '#fff',
                          color: active ? '#fff' : '#334155', cursor: 'pointer', textAlign: 'center',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{opt.label}</div>
                        <div style={{ fontSize: 11, opacity: 0.7 }}>{opt.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Button Radius picker */}
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Button Corners</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {[
                    { value: '', label: 'Default', preview: activeTheme === 'modern' ? '4px' : '0' },
                    { value: 'rounded', label: 'Rounded', preview: '8px' },
                    { value: 'pill', label: 'Pill', preview: '999px' },
                  ].map(opt => {
                    const active = heroBtnRadius === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setHeroBtnRadius(opt.value)}
                        style={{
                          padding: '10px 8px', border: `2px solid ${active ? '#0f172a' : '#e2e8f0'}`,
                          borderRadius: 8, background: active ? '#0f172a' : '#fff',
                          color: active ? '#fff' : '#334155', cursor: 'pointer',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{
                          width: 40, height: 18, background: active ? '#fff' : '#334155',
                          borderRadius: opt.preview, opacity: active ? 1 : 0.5,
                        }} />
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Overlay */}
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#94a3b8', marginBottom: 14 }}>Image Overlay</p>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>
                Add a color tint over the slide image to improve text readability.
              </p>
              <div style={{ marginBottom: 16 }}>
                <AdminColorField
                  label="Overlay Color"
                  value={heroOverlayColor}
                  fallback={themeDefaults.overlayColor}
                  onChange={setHeroOverlayColor}
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontWeight: 600, fontSize: 13 }}>Overlay Opacity</label>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#334155', background: '#f1f5f9', borderRadius: 6, padding: '2px 10px' }}>
                    {heroOverlayOpacity}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={80}
                  step={5}
                  value={heroOverlayOpacity}
                  onChange={e => setHeroOverlayOpacity(Number(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer', accentColor: '#0f172a' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                  <span>No overlay</span>
                  <span>80% (strong)</span>
                </div>
                {/* Overlay preview strip */}
                <div style={{ marginTop: 12, height: 36, borderRadius: 6, overflow: 'hidden', border: '1px solid #e2e8f0', position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, #6b7280, #374151)' }} />
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: heroOverlayColor || themeDefaults.overlayColor,
                    opacity: heroOverlayOpacity / 100,
                    pointerEvents: 'none',
                  }} />
                </div>
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Preview shows how the tint looks over a dark background image.</p>
              </div>
            </div>

          </div>
        </div>

        {/* ── Layout & Transitions Card ─────────────────────── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Layout &amp; Transitions</h3>
          </div>
          <div className="card-content">

            {/* Hero Height */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#94a3b8', marginBottom: 14 }}>Hero Height</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {[
                  { value: '', label: 'Default', sub: '95vh', preview: 72 },
                  { value: 'compact', label: 'Compact', sub: '70vh', preview: 52 },
                  { value: 'tall', label: 'Tall', sub: '100vh', preview: 88 },
                ].map(opt => {
                  const active = heroHeight === opt.value;
                  return (
                    <button key={opt.value} type="button" onClick={() => setHeroHeight(opt.value)}
                      style={{ padding: '12px 8px', border: `2px solid ${active ? '#0f172a' : '#e2e8f0'}`, borderRadius: 8, background: active ? '#0f172a' : '#fff', color: active ? '#fff' : '#334155', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s ease' }}>
                      <div style={{ width: '100%', height: opt.preview, background: active ? 'rgba(255,255,255,0.15)' : '#e2e8f0', borderRadius: 4, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '60%', height: 4, background: active ? '#fff' : '#94a3b8', borderRadius: 2, opacity: 0.7 }} />
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{opt.label}</div>
                      <div style={{ fontSize: 11, opacity: 0.65, marginTop: 2 }}>{opt.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Text Alignment — Classic only */}
            {activeTheme === 'classic' && (
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#94a3b8', marginBottom: 14 }}>Text Alignment</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {[
                    { value: '', label: 'Center', icon: 'fa-align-center' },
                    { value: 'left', label: 'Left', icon: 'fa-align-left' },
                    { value: 'right', label: 'Right', icon: 'fa-align-right' },
                  ].map(opt => {
                    const active = heroTextAlign === opt.value;
                    return (
                      <button key={opt.value} type="button" onClick={() => setHeroTextAlign(opt.value)}
                        style={{ padding: '14px 8px', border: `2px solid ${active ? '#0f172a' : '#e2e8f0'}`, borderRadius: 8, background: active ? '#0f172a' : '#fff', color: active ? '#fff' : '#334155', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.15s ease' }}>
                        <i className={`fas ${opt.icon}`} style={{ fontSize: 18 }} />
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Transition Style */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#94a3b8', marginBottom: 14 }}>Slide Transition</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {[
                  { value: '', label: 'Fade', desc: 'Smooth opacity' },
                  { value: 'slide', label: 'Slide', desc: 'Horizontal shift' },
                  { value: 'zoom', label: 'Zoom', desc: 'Subtle scale-in' },
                ].map(opt => {
                  const active = heroTransition === opt.value;
                  return (
                    <button key={opt.value} type="button" onClick={() => setHeroTransition(opt.value)}
                      style={{ padding: '12px 8px', border: `2px solid ${active ? '#0f172a' : '#e2e8f0'}`, borderRadius: 8, background: active ? '#0f172a' : '#fff', color: active ? '#fff' : '#334155', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s ease' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{opt.label}</div>
                      <div style={{ fontSize: 11, opacity: 0.7 }}>{opt.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Arrow Button Colors */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#94a3b8', marginBottom: 14 }}>Arrow Buttons</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <AdminColorField
                  label="Button Background"
                  value={heroArrowBg}
                  fallback="#ffffff"
                  onChange={setHeroArrowBg}
                />
                <AdminColorField
                  label="Icon Color"
                  value={heroArrowColor}
                  fallback="#ffffff"
                  onChange={setHeroArrowColor}
                />
              </div>
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>Applies to navigation arrows in the hero slider on both templates.</p>
            </div>

            {/* Auto-play Speed */}
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#94a3b8', marginBottom: 14 }}>Auto-play Speed</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {[
                  { value: 'slow', label: 'Slow', desc: '6 seconds' },
                  { value: '', label: 'Normal', desc: '4 seconds' },
                  { value: 'fast', label: 'Fast', desc: '2.5 seconds' },
                ].map(opt => {
                  const active = heroSpeed === opt.value;
                  return (
                    <button key={opt.value} type="button" onClick={() => setHeroSpeed(opt.value)}
                      style={{ padding: '12px 8px', border: `2px solid ${active ? '#0f172a' : '#e2e8f0'}`, borderRadius: 8, background: active ? '#0f172a' : '#fff', color: active ? '#fff' : '#334155', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s ease' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{opt.label}</div>
                      <div style={{ fontSize: 11, opacity: 0.7 }}>{opt.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
        </>}

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
