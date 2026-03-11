import React, { useState, useEffect, useContext, useRef } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { resolveImageUrl } from '../../utils/imageUrl.js';

const API_BASE = typeof window !== 'undefined' && window.location.hostname.endsWith('fluxe.in') ? '' : 'https://fluxe.in';

const CATEGORY_DEFAULTS = {
  jewellery: {
    heroSubtitle: 'Discover our story, heritage, and the passion behind every exquisite piece we create',
    storyHeading: 'Our Heritage',
    storyText: 'Welcome to {brandName}. We are dedicated to bringing you the finest jewellery with unmatched quality and craftsmanship that speaks for itself.\n\nOur commitment to authentic craftsmanship and traditional artistry has made us one of the most trusted names in the jewellery industry. Every piece in our collection reflects expertise, artistic brilliance, and timeless beauty.\n\nWe believe in creating experiences, not just jewellery. Each item is carefully curated and crafted to perfection for discerning customers worldwide.',
    valuesHeading: 'What We Offer',
    valuesSubtitle: 'Our commitment to excellence drives everything we do, from sourcing to delivery',
    values: [
      { icon: 'fas fa-certificate', title: 'Authentic & Pure', description: 'Every piece is crafted with original materials and artistry. We guarantee authenticity and purity, ensuring that traditional craftsmanship is preserved and honored.' },
      { icon: 'fas fa-globe-americas', title: 'Worldwide Shipping', description: 'We deliver happiness across borders with a smooth and timely shopping experience. Our global reach ensures that elegance reaches customers worldwide.' },
      { icon: 'fas fa-gem', title: 'Exclusive Designs', description: 'Unique collections that bring luxury and tradition together. Each design is carefully curated to offer something special — pieces that you won\'t find anywhere else.' },
    ],
    missionHeading: 'Our Mission',
    missionText: '{brandName} is more than just a brand – it is a commitment to excellence, quality, and customer satisfaction that drives everything we do.\n\nWe aim to preserve and promote the finest traditions of craftsmanship, creating masterpieces that blend timeless elegance with contemporary appeal.\n\nOur commitment extends beyond creating beautiful products – we are dedicated to supporting artisans, preserving techniques, and ensuring that this heritage continues to shine for generations to come.',
  },
  clothing: {
    heroSubtitle: 'Discover our story and the passion behind every collection we design',
    storyHeading: 'Our Story',
    storyText: 'Welcome to {brandName}. We are passionate about fashion and dedicated to bringing you stylish, high-quality clothing for every occasion.\n\nOur team of designers draws inspiration from global trends while staying true to timeless style. Every garment in our collection is thoughtfully designed and crafted with attention to detail.\n\nWe believe fashion should be accessible, comfortable, and expressive. That\'s why we create versatile pieces that help you look and feel your best.',
    valuesHeading: 'Why Choose Us',
    valuesSubtitle: 'Fashion-forward designs with uncompromising quality',
    values: [
      { icon: 'fas fa-tshirt', title: 'Premium Quality', description: 'We use only the finest fabrics and materials. Every garment goes through rigorous quality checks to ensure comfort, durability, and a perfect fit.' },
      { icon: 'fas fa-shipping-fast', title: 'Fast Delivery', description: 'Quick and reliable shipping so you get your favourite styles without the wait. We deliver across the country with care and speed.' },
      { icon: 'fas fa-paint-brush', title: 'Trending Designs', description: 'Stay ahead of the curve with our latest collections. Our designers create fresh, on-trend styles that keep your wardrobe current and exciting.' },
    ],
    missionHeading: 'Our Mission',
    missionText: '{brandName} is more than just a clothing brand – it is about empowering you to express yourself through style.\n\nWe aim to make fashion accessible and sustainable, creating collections that are as kind to the planet as they are to your wardrobe.\n\nOur commitment goes beyond great clothing – we are building a community of fashion lovers who believe in quality, creativity, and individuality.',
  },
  electronics: {
    heroSubtitle: 'Innovation, quality, and technology at the heart of everything we do',
    storyHeading: 'Our Story',
    storyText: 'Welcome to {brandName}. We are dedicated to bringing you the latest in technology with products that combine innovation, quality, and value.\n\nOur team of tech enthusiasts carefully selects every product in our catalogue, ensuring it meets the highest standards of performance and reliability.\n\nWe believe technology should enhance your life. That\'s why we offer products that are not just cutting-edge, but also user-friendly and built to last.',
    valuesHeading: 'Why Choose Us',
    valuesSubtitle: 'Trusted technology solutions for modern life',
    values: [
      { icon: 'fas fa-microchip', title: 'Latest Technology', description: 'We stock only the newest and most innovative products. Stay ahead with cutting-edge gadgets and devices from top brands.' },
      { icon: 'fas fa-shield-alt', title: 'Genuine Products', description: '100% authentic products with manufacturer warranty. We source directly from authorized distributors to guarantee quality.' },
      { icon: 'fas fa-headset', title: 'Expert Support', description: 'Our tech-savvy team is here to help you choose the right product and provide after-sales support whenever you need it.' },
    ],
    missionHeading: 'Our Mission',
    missionText: '{brandName} is your trusted destination for quality technology products.\n\nWe aim to make the latest technology accessible to everyone, offering genuine products at competitive prices with exceptional service.\n\nOur commitment is to be more than a store – we want to be your go-to tech partner, helping you find the perfect products for your needs.',
  },
};

const GENERIC_DEFAULTS = {
  heroSubtitle: 'Discover our story, heritage, and the passion behind every product we offer',
  storyHeading: 'Our Story',
  storyText: 'Welcome to {brandName}. We are dedicated to bringing you the finest products with unmatched quality and service that speaks for itself.\n\nOur commitment to excellence and attention to detail has made us one of the most trusted names in our industry. Every product in our collection reflects expertise, quality, and care.\n\nWe believe in creating experiences, not just selling products. Each item is carefully curated and selected to perfection for discerning customers worldwide.',
  valuesHeading: 'What We Offer',
  valuesSubtitle: 'Our commitment to excellence drives everything we do, from sourcing to delivery',
  values: [
    { icon: 'fas fa-certificate', title: 'Authentic & Quality', description: 'Every product meets the highest standards of quality. We guarantee authenticity and excellence, ensuring that our customers receive only the best.' },
    { icon: 'fas fa-globe-americas', title: 'Worldwide Shipping', description: 'We deliver happiness across borders with a smooth and timely shopping experience. Our global reach ensures that quality reaches customers worldwide.' },
    { icon: 'fas fa-star', title: 'Exclusive Selection', description: 'Unique collections that bring quality and value together. Each product is carefully curated to offer something special that you won\'t find anywhere else.' },
  ],
  missionHeading: 'Our Mission',
  missionText: '{brandName} is more than just a brand – it is a commitment to excellence, quality, and customer satisfaction that drives everything we do.\n\nWe aim to deliver the finest products, creating an experience that blends quality with exceptional service.\n\nOur commitment extends beyond selling products – we are dedicated to building lasting relationships with our customers and ensuring satisfaction for generations to come.',
};

function getDefaults(category, brandName) {
  const base = CATEGORY_DEFAULTS[category] || GENERIC_DEFAULTS;
  const name = brandName || 'Our Store';
  return {
    heroSubtitle: base.heroSubtitle,
    storyHeading: base.storyHeading,
    storyText: base.storyText.replace(/\{brandName\}/g, name),
    storyImage: '',
    valuesHeading: base.valuesHeading,
    valuesSubtitle: base.valuesSubtitle,
    values: base.values.map(v => ({ ...v })),
    missionHeading: base.missionHeading,
    missionText: base.missionText.replace(/\{brandName\}/g, name),
  };
}

const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' };
const labelStyle = { display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 };
const textareaStyle = { ...inputStyle, resize: 'vertical' };

export default function AboutUsEditor() {
  const { siteConfig } = useContext(SiteContext);
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [storyHeading, setStoryHeading] = useState('');
  const [storyText, setStoryText] = useState('');
  const [storyImage, setStoryImage] = useState('');
  const [valuesHeading, setValuesHeading] = useState('');
  const [valuesSubtitle, setValuesSubtitle] = useState('');
  const [values, setValues] = useState([
    { icon: '', title: '', description: '' },
    { icon: '', title: '', description: '' },
    { icon: '', title: '', description: '' },
  ]);
  const [missionHeading, setMissionHeading] = useState('');
  const [missionText, setMissionText] = useState('');
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
        setStoryHeading(aboutPage.storyHeading || defaults.storyHeading);
        setStoryText(aboutPage.storyText || defaults.storyText);
        setStoryImage(aboutPage.storyImage || '');
        setValuesHeading(aboutPage.valuesHeading || defaults.valuesHeading);
        setValuesSubtitle(aboutPage.valuesSubtitle || defaults.valuesSubtitle);
        const savedValues = aboutPage.values;
        if (savedValues && savedValues.length === 3) {
          setValues(savedValues.map((v, i) => ({
            icon: v.icon || defaults.values[i].icon,
            title: v.title || defaults.values[i].title,
            description: v.description || defaults.values[i].description,
          })));
        } else {
          setValues(defaults.values);
        }
        setMissionHeading(aboutPage.missionHeading || defaults.missionHeading);
        setMissionText(aboutPage.missionText || defaults.missionText);
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

  function updateValue(index, field, val) {
    setValues(prev => prev.map((v, i) => i === index ? { ...v, [field]: val } : v));
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
              storyHeading,
              storyText,
              storyImage,
              valuesHeading,
              valuesSubtitle,
              values,
              missionHeading,
              missionText,
            }
          }
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setStatus('success');
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
              <label style={labelStyle}>Section Heading</label>
              <input
                type="text"
                value={storyHeading}
                onChange={e => setStoryHeading(e.target.value)}
                maxLength={100}
                style={inputStyle}
              />
            </div>
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

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Values Section</h3>
          </div>
          <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Highlight what makes your business special with up to 3 value cards.
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Section Heading</label>
              <input
                type="text"
                value={valuesHeading}
                onChange={e => setValuesHeading(e.target.value)}
                maxLength={100}
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Section Subtitle</label>
              <input
                type="text"
                value={valuesSubtitle}
                onChange={e => setValuesSubtitle(e.target.value)}
                maxLength={200}
                style={inputStyle}
              />
            </div>

            {values.map((val, idx) => (
              <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 12 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#334155' }}>Value Card {idx + 1}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={labelStyle}>Icon Class</label>
                    <input
                      type="text"
                      value={val.icon}
                      onChange={e => updateValue(idx, 'icon', e.target.value)}
                      maxLength={50}
                      style={inputStyle}
                    />
                    <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>e.g., fas fa-gem</p>
                  </div>
                  <div>
                    <label style={labelStyle}>Title</label>
                    <input
                      type="text"
                      value={val.title}
                      onChange={e => updateValue(idx, 'title', e.target.value)}
                      maxLength={60}
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Description</label>
                  <textarea
                    value={val.description}
                    onChange={e => updateValue(idx, 'description', e.target.value)}
                    rows={3}
                    maxLength={300}
                    style={textareaStyle}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Mission Section</h3>
          </div>
          <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Share your brand mission. Use blank lines to separate paragraphs.
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Section Heading</label>
              <input
                type="text"
                value={missionHeading}
                onChange={e => setMissionHeading(e.target.value)}
                maxLength={100}
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Mission Text</label>
              <textarea
                value={missionText}
                onChange={e => setMissionText(e.target.value)}
                rows={6}
                style={textareaStyle}
              />
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Separate paragraphs with blank lines</p>
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
