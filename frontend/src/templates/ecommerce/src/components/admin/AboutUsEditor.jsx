import React, { useState, useEffect, useContext, useRef } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { resolveImageUrl } from '../../utils/imageUrl.js';

const API_BASE = typeof window !== 'undefined' && window.location.hostname.endsWith('fluxe.in') ? '' : 'https://fluxe.in';

const CATEGORY_DEFAULTS = {
  jewellery: {
    heroSubtitle: 'Discover our story, heritage, and the passion behind every exquisite piece we create',
    storyText: 'Welcome to {brandName}. We are dedicated to bringing you the finest jewellery with unmatched quality and craftsmanship that speaks for itself.\n\nOur commitment to authentic craftsmanship and traditional artistry has made us one of the most trusted names in the jewellery industry. Every piece in our collection reflects expertise, artistic brilliance, and timeless beauty.\n\nWe believe in creating experiences, not just jewellery. Each item is carefully curated and crafted to perfection for discerning customers worldwide.',
    sections: [
      { heading: 'Our Mission', text: '{brandName} is more than just a brand – it is a commitment to excellence, quality, and customer satisfaction that drives everything we do.\n\nWe aim to preserve and promote the finest traditions of craftsmanship, creating masterpieces that blend timeless elegance with contemporary appeal.\n\nOur commitment extends beyond creating beautiful products – we are dedicated to supporting artisans, preserving techniques, and ensuring that this heritage continues to shine for generations to come.', visible: true },
    ],
  },
  clothing: {
    heroSubtitle: 'Discover our story and the passion behind every collection we design',
    storyText: 'Welcome to {brandName}. We are passionate about fashion and dedicated to bringing you stylish, high-quality clothing for every occasion.\n\nOur team of designers draws inspiration from global trends while staying true to timeless style. Every garment in our collection is thoughtfully designed and crafted with attention to detail.\n\nWe believe fashion should be accessible, comfortable, and expressive. That\'s why we create versatile pieces that help you look and feel your best.',
    sections: [
      { heading: 'Our Mission', text: '{brandName} is more than just a clothing brand – it is about empowering you to express yourself through style.\n\nWe aim to make fashion accessible and sustainable, creating collections that are as kind to the planet as they are to your wardrobe.\n\nOur commitment goes beyond great clothing – we are building a community of fashion lovers who believe in quality, creativity, and individuality.', visible: true },
    ],
  },
  electronics: {
    heroSubtitle: 'Innovation, quality, and technology at the heart of everything we do',
    storyText: 'Welcome to {brandName}. We are dedicated to bringing you the latest in technology with products that combine innovation, quality, and value.\n\nOur team of tech enthusiasts carefully selects every product in our catalogue, ensuring it meets the highest standards of performance and reliability.\n\nWe believe technology should enhance your life. That\'s why we offer products that are not just cutting-edge, but also user-friendly and built to last.',
    sections: [
      { heading: 'Our Mission', text: '{brandName} is your trusted destination for quality technology products.\n\nWe aim to make the latest technology accessible to everyone, offering genuine products at competitive prices with exceptional service.\n\nOur commitment is to be more than a store – we want to be your go-to tech partner, helping you find the perfect products for your needs.', visible: true },
    ],
  },
};

const GENERIC_DEFAULTS = {
  heroSubtitle: 'Discover our story, heritage, and the passion behind every product we offer',
  storyText: 'Welcome to {brandName}. We are dedicated to bringing you the finest products with unmatched quality and service that speaks for itself.\n\nOur commitment to excellence and attention to detail has made us one of the most trusted names in our industry. Every product in our collection reflects expertise, quality, and care.\n\nWe believe in creating experiences, not just selling products. Each item is carefully curated and selected to perfection for discerning customers worldwide.',
  sections: [
    { heading: 'Our Mission', text: '{brandName} is more than just a brand – it is a commitment to excellence, quality, and customer satisfaction that drives everything we do.\n\nWe aim to deliver the finest products, creating an experience that blends quality with exceptional service.\n\nOur commitment extends beyond selling products – we are dedicated to building lasting relationships with our customers and ensuring satisfaction for generations to come.', visible: true },
  ],
};

function getDefaults(category, brandName) {
  const base = CATEGORY_DEFAULTS[category] || GENERIC_DEFAULTS;
  const name = brandName || 'Our Store';
  return {
    heroSubtitle: base.heroSubtitle,
    storyText: base.storyText.replace(/\{brandName\}/g, name),
    storyImage: '',
    sections: base.sections.map(s => ({
      heading: s.heading,
      text: s.text.replace(/\{brandName\}/g, name),
      visible: s.visible,
    })),
  };
}

const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' };
const labelStyle = { display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 };
const textareaStyle = { ...inputStyle, resize: 'vertical' };

export default function AboutUsEditor({ onSaved }) {
  const { siteConfig } = useContext(SiteContext);
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [storyText, setStoryText] = useState('');
  const [storyImage, setStoryImage] = useState('');
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (siteConfig?.id) loadSettings();
  }, [siteConfig?.id]);

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
        const aboutPage = settings.aboutPage || {};
        const defaults = getDefaults(siteConfig.category, siteConfig.brandName || siteConfig.brand_name);

        setHeroSubtitle(aboutPage.heroSubtitle || defaults.heroSubtitle);
        setStoryText(aboutPage.storyText || defaults.storyText);
        setStoryImage(aboutPage.storyImage || '');

        if (aboutPage.sections && aboutPage.sections.length > 0) {
          setSections(aboutPage.sections.map(s => ({
            heading: s.heading || '',
            text: s.text || '',
            visible: s.visible !== false,
          })));
        } else if (aboutPage.missionHeading || aboutPage.missionText) {
          setSections([{
            heading: aboutPage.missionHeading || defaults.sections[0].heading,
            text: aboutPage.missionText || defaults.sections[0].text,
            visible: true,
          }]);
        } else {
          setSections(defaults.sections);
        }
      }
    } catch (e) {
      console.error('Failed to load about page settings:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleImageUpload(file) {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setStatus('error:Please upload a JPG, PNG, WebP, or GIF image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setStatus('error:Image is too large. Maximum size is 10MB.');
      return;
    }

    setUploading(true);
    setStatus('');
    try {
      const token = sessionStorage.getItem('site_admin_token');
      const formData = new FormData();
      formData.append('images', file, file.name || 'about-story.jpg');
      const response = await fetch(`${API_BASE}/api/upload/image?siteId=${siteConfig.id}`, {
        method: 'POST',
        headers: token ? { 'Authorization': `SiteAdmin ${token}` } : {},
        body: formData,
      });
      const result = await response.json();
      if (response.ok && result.success && result.data?.images?.[0]?.url) {
        setStoryImage(result.data.images[0].url);
      } else {
        setStatus('error:Upload failed: ' + (result.error || result.message || 'Unknown error'));
      }
    } catch (e) {
      setStatus('error:Failed to upload image: ' + e.message);
    } finally {
      setUploading(false);
    }
  }

  function updateSection(index, field, value) {
    setSections(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  }

  function addSection() {
    setSections(prev => [...prev, { heading: 'New Section', text: '', visible: true }]);
  }

  function removeSection(index) {
    if (!window.confirm('Remove this section?')) return;
    setSections(prev => prev.filter((_, i) => i !== index));
  }

  function moveSection(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= sections.length) return;
    setSections(prev => {
      const updated = [...prev];
      [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
      return updated;
    });
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
            aboutPage: {
              heroSubtitle,
              storyText,
              storyImage,
              sections,
            }
          }
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setStatus('success');
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
      <form onSubmit={handleSave}>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Hero Section</h3>
          </div>
          <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              The subtitle text that appears below your brand name on the About Us page hero banner.
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Hero Subtitle</label>
              <input
                type="text"
                value={heroSubtitle}
                onChange={e => setHeroSubtitle(e.target.value)}
                maxLength={200}
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Our Story Section</h3>
          </div>
          <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Tell your brand story. Use blank lines to separate paragraphs.
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Story Text</label>
              <textarea
                value={storyText}
                onChange={e => setStoryText(e.target.value)}
                rows={6}
                style={textareaStyle}
              />
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Separate paragraphs with blank lines</p>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Story Image (Optional)</label>
              {storyImage ? (
                <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', background: '#f8f8f8', marginBottom: 8 }}>
                  <img src={resolveImageUrl(storyImage)} alt="Story" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }} />
                  <button
                    type="button"
                    onClick={() => { setStoryImage(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
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
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Content Sections ({sections.length})</h3>
          <button type="button" className="btn btn-secondary" onClick={addSection} style={{ fontSize: 13 }}>
            <i className="fas fa-plus" style={{ marginRight: 6 }} />Add Section
          </button>
        </div>

        {sections.map((section, index) => (
          <div key={index} className="card" style={{ marginBottom: 16, opacity: section.visible ? 1 : 0.6 }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title" style={{ fontSize: 14 }}>{section.heading || `Section ${index + 1}`}</h3>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  type="button"
                  onClick={() => updateSection(index, 'visible', !section.visible)}
                  title={section.visible ? 'Hide section' : 'Show section'}
                  style={{
                    background: section.visible ? '#f0fdf4' : '#f8fafc',
                    border: `1px solid ${section.visible ? '#bbf7d0' : '#e2e8f0'}`,
                    borderRadius: 4, padding: '4px 8px', cursor: 'pointer',
                    color: section.visible ? '#16a34a' : '#94a3b8', fontSize: 12,
                  }}
                >
                  <i className={`fas ${section.visible ? 'fa-eye' : 'fa-eye-slash'}`} />
                </button>
                <button
                  type="button"
                  onClick={() => moveSection(index, -1)}
                  disabled={index === 0}
                  style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 4, padding: '4px 8px', cursor: index === 0 ? 'not-allowed' : 'pointer', color: index === 0 ? '#cbd5e1' : '#64748b', fontSize: 12 }}
                >
                  <i className="fas fa-arrow-up" />
                </button>
                <button
                  type="button"
                  onClick={() => moveSection(index, 1)}
                  disabled={index === sections.length - 1}
                  style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 4, padding: '4px 8px', cursor: index === sections.length - 1 ? 'not-allowed' : 'pointer', color: index === sections.length - 1 ? '#cbd5e1' : '#64748b', fontSize: 12 }}
                >
                  <i className="fas fa-arrow-down" />
                </button>
                <button
                  type="button"
                  onClick={() => removeSection(index)}
                  style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', color: '#dc2626', fontSize: 12 }}
                >
                  <i className="fas fa-trash" />
                </button>
              </div>
            </div>
            <div className="card-content">
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Section Heading</label>
                <input
                  type="text"
                  value={section.heading}
                  onChange={e => updateSection(index, 'heading', e.target.value)}
                  maxLength={100}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Content</label>
                <textarea
                  value={section.text}
                  onChange={e => updateSection(index, 'text', e.target.value)}
                  rows={5}
                  style={textareaStyle}
                />
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Separate paragraphs with blank lines</p>
              </div>
            </div>
          </div>
        ))}

        {status && (
          <div style={{
            background: status === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${status === 'success' ? '#bbf7d0' : '#fecaca'}`,
            borderRadius: 8, padding: '12px 16px',
            color: status === 'success' ? '#166534' : '#dc2626',
            marginBottom: 16, fontSize: 14,
          }}>
            {status === 'success' ? 'About Us page saved successfully!' : status.replace('error:', '')}
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={saving || uploading} style={{ width: '100%' }}>
          {saving ? 'Saving...' : 'Save About Us Page'}
        </button>
      </form>
    </div>
  );
}
