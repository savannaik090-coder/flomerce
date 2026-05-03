import React, { useState, useEffect, useContext, useRef } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { resolveImageUrl } from '../../utils/imageUrl.js';
import SectionToggle from './SectionToggle.jsx';
import SaveBar from './SaveBar.jsx';
import LinkSelector from './LinkSelector.jsx';
import AdminColorField from './style/AdminColorField.jsx';
import AdminFontPicker from './style/AdminFontPicker.jsx';
import { API_BASE } from '../../config.js';
import { usePendingMedia } from '../../hooks/usePendingMedia.js';
import { useDirtyTracker } from '../../hooks/useDirtyTracker.js';

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

const SECTION_STYLE = { marginBottom: 24 };
function SectionHeading({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <div style={{ width: 3, height: 18, background: '#2563eb', borderRadius: 2, flexShrink: 0 }} />
      <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: 0, letterSpacing: 0.2 }}>{children}</p>
    </div>
  );
}

export default function WelcomeBannerEditor({ onSaved, onPreviewUpdate, sectionVisible = true, visibilityKey, onVisibilitySaved }) {
  const { siteConfig } = useContext(SiteContext);
  const [pendingVisible, setPendingVisible] = useState(sectionVisible);
  useEffect(() => { setPendingVisible(sectionVisible); }, [sectionVisible]);
  const visDirty = !!visibilityKey && pendingVisible !== sectionVisible;

  // Content
  const [heading, setHeading] = useState('');
  const [message, setMessage] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [buttonLink, setButtonLink] = useState('');
  const [bannerImage, setBannerImage] = useState('');

  // Style
  const [wbBgColor, setWbBgColor] = useState('');
  const [wbHeadingColor, setWbHeadingColor] = useState('');
  const [wbHeadingFont, setWbHeadingFont] = useState('');
  const [wbTextColor, setWbTextColor] = useState('');
  const [wbBtnBg, setWbBtnBg] = useState('');
  const [wbBtnText, setWbBtnText] = useState('');
  const [wbBtnFont, setWbBtnFont] = useState('');
  const [wbTextFont, setWbTextFont] = useState('');
  const [wbBtnRadius, setWbBtnRadius] = useState('');

  // Behavior
  const [wbDelay, setWbDelay] = useState('3');
  const [wbShowAgain, setWbShowAgain] = useState('never');

  // Coupon
  const [wbCouponCode, setWbCouponCode] = useState('');
  const [wbCouponLabel, setWbCouponLabel] = useState('');

  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeView, setActiveView] = useState('content');
  const fileRef = useRef(null);
  const hasLoadedRef = useRef(false);
  const pendingMedia = usePendingMedia(siteConfig?.id);

  const brandName = siteConfig?.brand_name || siteConfig?.brandName || "Our Store";

  const dirty = useDirtyTracker({
    heading, message, buttonText, buttonLink, bannerImage,
    wbBgColor, wbHeadingColor, wbHeadingFont, wbTextColor, wbTextFont,
    wbBtnBg, wbBtnText, wbBtnFont, wbBtnRadius,
    wbDelay, wbShowAgain, wbCouponCode, wbCouponLabel,
  });

  useEffect(() => {
    if (siteConfig?.id) loadSettings();
  }, [siteConfig?.id]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    if (onPreviewUpdate) onPreviewUpdate({
      welcomeBannerImage: bannerImage, welcomeBannerHeading: heading,
      welcomeBannerMessage: message, welcomeBannerButtonText: buttonText,
      welcomeBannerButtonLink: buttonLink,
      wbBgColor, wbHeadingColor, wbHeadingFont, wbTextColor, wbTextFont,
      wbBtnBg, wbBtnText, wbBtnFont, wbBtnRadius,
      wbDelay, wbShowAgain, wbCouponCode, wbCouponLabel,
    });
  }, [heading, message, buttonText, buttonLink, bannerImage,
      wbBgColor, wbHeadingColor, wbHeadingFont, wbTextColor, wbTextFont,
      wbBtnBg, wbBtnText, wbBtnFont, wbBtnRadius,
      wbDelay, wbShowAgain, wbCouponCode, wbCouponLabel]);

  async function loadSettings() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/site?subdomain=${encodeURIComponent(siteConfig.subdomain)}`);
      const result = await response.json();
      if (result.success && result.data) {
        let s = result.data.settings || {};
        if (typeof s === 'string') { try { s = JSON.parse(s); } catch { s = {}; } }
        const bn = siteConfig?.brand_name || siteConfig?.brandName || "Our Store";
        const hVal = s.welcomeBannerHeading || `Welcome to ${bn}!`;
        const mVal = s.welcomeBannerMessage || "Discover our exquisite collection. Sign up today to receive exclusive offers and updates.";
        const btVal = s.welcomeBannerButtonText || "Sign Up Now";
        const blVal = s.welcomeBannerButtonLink || '/signup';
        const biVal = s.welcomeBannerImage || '';
        setHeading(hVal); setMessage(mVal); setButtonText(btVal);
        setButtonLink(blVal); setBannerImage(biVal);
        setWbBgColor(s.wbBgColor || '');
        setWbHeadingColor(s.wbHeadingColor || '');
        setWbHeadingFont(s.wbHeadingFont || '');
        setWbTextColor(s.wbTextColor || '');
        setWbBtnBg(s.wbBtnBg || '');
        setWbBtnText(s.wbBtnText || '');
        setWbBtnFont(s.wbBtnFont || '');
        setWbTextFont(s.wbTextFont || '');
        setWbBtnRadius(s.wbBtnRadius || '');
        setWbDelay(s.wbDelay !== undefined ? String(s.wbDelay) : '3');
        setWbShowAgain(s.wbShowAgain || 'never');
        setWbCouponCode(s.wbCouponCode || '');
        setWbCouponLabel(s.wbCouponLabel || '');
        dirty.baseline({
          heading: hVal, message: mVal, buttonText: btVal, buttonLink: blVal, bannerImage: biVal,
          wbBgColor: s.wbBgColor || '', wbHeadingColor: s.wbHeadingColor || '',
          wbHeadingFont: s.wbHeadingFont || '', wbTextColor: s.wbTextColor || '', wbTextFont: s.wbTextFont || '',
          wbBtnBg: s.wbBtnBg || '', wbBtnText: s.wbBtnText || '', wbBtnFont: s.wbBtnFont || '', wbBtnRadius: s.wbBtnRadius || '',
          wbDelay: s.wbDelay !== undefined ? String(s.wbDelay) : '3',
          wbShowAgain: s.wbShowAgain || 'never',
          wbCouponCode: s.wbCouponCode || '', wbCouponLabel: s.wbCouponLabel || '',
        });
      }
    } catch (e) {
      console.error('Failed to load welcome banner settings:', e);
    } finally {
      setLoading(false);
      setTimeout(() => { hasLoadedRef.current = true; }, 0);
    }
  }

  async function handleImageUpload(file) {
    if (!file) return;
    const oldImage = bannerImage;
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
        const newUrl = result.data.images[0].url;
        setBannerImage(newUrl);
        pendingMedia.markUploaded(newUrl);
        if (oldImage) pendingMedia.markForDeletion(oldImage);
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
        headers: { 'Content-Type': 'application/json', 'Authorization': token ? `SiteAdmin ${token}` : '' },
        body: JSON.stringify({
          settings: {
            welcomeBannerImage: bannerImage,
            welcomeBannerHeading: heading,
            welcomeBannerMessage: message,
            welcomeBannerButtonText: buttonText,
            welcomeBannerButtonLink: buttonLink,
            wbBgColor, wbHeadingColor, wbHeadingFont, wbTextColor, wbTextFont,
            wbBtnBg, wbBtnText, wbBtnFont, wbBtnRadius,
            wbDelay, wbShowAgain, wbCouponCode, wbCouponLabel,
            ...(visibilityKey ? { [visibilityKey]: pendingVisible } : {}),
          }
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setStatus('success');
        dirty.markSaved();
        if (visibilityKey && onVisibilitySaved) onVisibilitySaved(pendingVisible);
        const cleanup = await pendingMedia.commit([bannerImage]);
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

  const radiusOptions = [
    { value: '', label: 'Default', preview: 4 },
    { value: 'sharp', label: 'Sharp', preview: 0 },
    { value: 'rounded', label: 'Rounded', preview: 8 },
    { value: 'pill', label: 'Pill', preview: 999 },
  ];

  const delayOptions = [
    { value: '0', label: 'Instant' },
    { value: '3', label: '3 sec' },
    { value: '5', label: '5 sec' },
    { value: '10', label: '10 sec' },
  ];

  const showAgainOptions = [
    { value: 'never', label: 'Never' },
    { value: '7', label: 'After 7 days' },
    { value: '30', label: 'After 30 days' },
    { value: 'always', label: 'Every visit' },
  ];

  return (
    <div style={{ maxWidth: 700 }}>
      <SaveBar topBar saving={saving} hasChanges={dirty.hasChanges || visDirty} onSave={(e) => handleSave(e || { preventDefault: () => {} })} />
      <form onSubmit={handleSave}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e2e8f0' }}>
          {[{ key: 'content', icon: 'fa-edit', label: 'Content' }, { key: 'appearance', icon: 'fa-paint-brush', label: 'Appearance' }].map(tab => (
            <button key={tab.key} type="button" onClick={() => setActiveView(tab.key)} style={{ padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, color: activeView === tab.key ? '#2563eb' : '#64748b', borderBottom: `2px solid ${activeView === tab.key ? '#2563eb' : 'transparent'}`, marginBottom: -2, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', transition: 'color 0.15s ease' }}>
              <i className={`fas ${tab.icon}`} />{tab.label}
            </button>
          ))}
        </div>

        {activeView === 'content' && <>
        {visibilityKey && (
        <SectionToggle
          enabled={pendingVisible}
          onChange={() => {
            const next = !pendingVisible;
            setPendingVisible(next);
            if (onPreviewUpdate && visibilityKey) onPreviewUpdate({ [visibilityKey]: next });
          }}
          label="Show Welcome Banner"
          description="Toggle the first-visit popup banner for new customers"
        />
        )}

        {/* ── Content Card ─────────────────────────────────────── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h3 className="card-title">Content</h3></div>
          <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              This popup banner appears once for first-time visitors. Customize the image, text, and button.
            </p>

            {/* Image */}
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
                    onClick={() => { if (bannerImage) pendingMedia.markForDeletion(bannerImage); setBannerImage(''); }}
                    style={{
                      position: 'absolute', top: 6, right: 6,
                      background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none',
                      borderRadius: '50%', width: 28, height: 28, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                    }}
                  ><i className="fas fa-times" /></button>
                </div>
              ) : (
                <div
                  onClick={() => !uploading && fileRef.current?.click()}
                  style={{
                    border: '2px dashed #cbd5e1', borderRadius: 6, padding: '24px 0',
                    textAlign: 'center', cursor: uploading ? 'not-allowed' : 'pointer',
                    color: '#94a3b8', marginBottom: 8, background: '#fff',
                  }}
                >
                  {uploading ? (
                    <><i className="fas fa-spinner fa-spin" style={{ fontSize: 24, color: '#2563eb', marginBottom: 4, display: 'block' }} /><span style={{ fontSize: 13, color: '#2563eb' }}>Uploading...</span></>
                  ) : (
                    <><i className="fas fa-cloud-upload-alt" style={{ fontSize: 24, marginBottom: 4, display: 'block' }} /><span style={{ fontSize: 12 }}>Click to upload banner image</span></>
                  )}
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { if (e.target.files[0]) handleImageUpload(e.target.files[0]); }} />
            </div>

            {/* Heading */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Heading</label>
              <input type="text" value={heading} onChange={e => setHeading(e.target.value)}
                placeholder={`Welcome to ${brandName}!`} maxLength={80}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
              <div style={{ textAlign: 'end', fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{heading.length}/80</div>
            </div>

            {/* Message */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Message</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Discover our exquisite collection..." maxLength={200} rows={3}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }} />
              <div style={{ textAlign: 'end', fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{message.length}/200</div>
            </div>

            {/* Button */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Button Text</label>
                <input type="text" value={buttonText} onChange={e => setButtonText(e.target.value)}
                  placeholder="Sign Up Now" maxLength={30}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>
              <div>
                <LinkSelector label="Button Link" value={buttonLink} onChange={val => setButtonLink(val)} />
              </div>
            </div>

            {/* Coupon */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
              <SectionHeading>Coupon Code (optional)</SectionHeading>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Code</label>
                  <input type="text" value={wbCouponCode} onChange={e => setWbCouponCode(e.target.value.toUpperCase())}
                    placeholder="WELCOME10" maxLength={20}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'monospace', letterSpacing: 1 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Label above code</label>
                  <input type="text" value={wbCouponLabel} onChange={e => setWbCouponLabel(e.target.value)}
                    placeholder="Use code for 10% off" maxLength={50}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
                </div>
              </div>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 10, marginBottom: 0 }}>
                Visitors can tap to copy the code. Leave blank to hide the coupon box.
              </p>
            </div>
          </div>
        </div>

        </>}

        {activeView === 'appearance' && <>
        {/* ── Style Card ───────────────────────────────────────── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h3 className="card-title">Style</h3></div>
          <div className="card-content">

            {/* Colors */}
            <div style={SECTION_STYLE}>
              <SectionHeading>Colors</SectionHeading>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <AdminColorField label="Background Color" value={wbBgColor} fallback="#ffffff" onChange={setWbBgColor} />
                <AdminColorField label="Heading Color" value={wbHeadingColor} fallback="#333333" onChange={setWbHeadingColor} />
                <AdminColorField label="Body Text Color" value={wbTextColor} fallback="#666666" onChange={setWbTextColor} />
              </div>
            </div>

            {/* Typography */}
            <div style={SECTION_STYLE}>
              <SectionHeading>Typography</SectionHeading>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <AdminFontPicker label="Heading Font" value={wbHeadingFont} onChange={setWbHeadingFont} />
                <AdminFontPicker label="Body Text Font" value={wbTextFont} onChange={setWbTextFont} />
              </div>
            </div>

            {/* CTA button */}
            <div style={SECTION_STYLE}>
              <SectionHeading>CTA Button</SectionHeading>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                <AdminColorField label="Button Background" value={wbBtnBg} fallback="#b3a681" onChange={setWbBtnBg} />
                <AdminColorField label="Button Text" value={wbBtnText} fallback="#ffffff" onChange={setWbBtnText} />
                <AdminFontPicker label="Button Font" value={wbBtnFont} onChange={setWbBtnFont} />
              </div>

              {/* Radius */}
              <SectionHeading>Button Shape</SectionHeading>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {radiusOptions.map(opt => {
                  const active = wbBtnRadius === opt.value;
                  return (
                    <button key={opt.value} type="button" onClick={() => setWbBtnRadius(opt.value)}
                      style={{
                        padding: '10px 8px', border: `2px solid ${active ? '#0f172a' : '#e2e8f0'}`,
                        borderRadius: 8, background: active ? '#0f172a' : '#fff',
                        color: active ? '#fff' : '#334155', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        transition: 'all 0.15s ease',
                      }}>
                      <div style={{ width: 40, height: 18, background: active ? '#fff' : '#334155', borderRadius: opt.preview, opacity: active ? 1 : 0.5 }} />
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Behavior Card ────────────────────────────────────── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h3 className="card-title">Behavior</h3></div>
          <div className="card-content">

            {/* Delay */}
            <div style={SECTION_STYLE}>
              <SectionHeading>Popup Delay</SectionHeading>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {delayOptions.map(opt => {
                  const active = wbDelay === opt.value;
                  return (
                    <button key={opt.value} type="button" onClick={() => setWbDelay(opt.value)}
                      style={{
                        padding: '12px 8px', border: `2px solid ${active ? '#0f172a' : '#e2e8f0'}`,
                        borderRadius: 8, background: active ? '#0f172a' : '#fff',
                        color: active ? '#fff' : '#334155', cursor: 'pointer',
                        fontWeight: 600, fontSize: 13, transition: 'all 0.15s ease',
                      }}>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Show again */}
            <div style={{ marginBottom: 0 }}>
              <SectionHeading>Show Again</SectionHeading>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {showAgainOptions.map(opt => {
                  const active = wbShowAgain === opt.value;
                  return (
                    <button key={opt.value} type="button" onClick={() => setWbShowAgain(opt.value)}
                      style={{
                        padding: '12px 8px', border: `2px solid ${active ? '#0f172a' : '#e2e8f0'}`,
                        borderRadius: 8, background: active ? '#0f172a' : '#fff',
                        color: active ? '#fff' : '#334155', cursor: 'pointer',
                        fontWeight: 600, fontSize: 13, transition: 'all 0.15s ease',
                      }}>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 10, marginBottom: 0 }}>
                Controls how often a visitor sees the banner. "Never" means once per browser.
              </p>
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
            {status === 'success' ? "Welcome banner saved successfully!" : `Failed to save: ${status.replace('error:', '')}`}
          </div>
        )}
        <SaveBar saving={saving} hasChanges={dirty.hasChanges || visDirty} onSave={(e) => handleSave(e || { preventDefault: () => {} })} />
      </form>
    </div>
  );
}
