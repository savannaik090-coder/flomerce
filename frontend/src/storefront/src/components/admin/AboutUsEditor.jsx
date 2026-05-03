import React, { useState, useEffect, useContext, useRef } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { resolveImageUrl } from '../../utils/imageUrl.js';
import SectionToggle from './SectionToggle.jsx';
import SaveBar from './SaveBar.jsx';
import ConfirmModal from './ConfirmModal.jsx';

import {
  getAboutPageWithBrand,
  ABOUT_CLASSIC_STYLE_DEFAULTS,
  ABOUT_MODERN_STYLE_DEFAULTS,
} from '../../defaults/index.js';
import { API_BASE } from '../../config.js';
import { usePendingMedia } from '../../hooks/usePendingMedia.js';
import { useDirtyTracker } from '../../hooks/useDirtyTracker.js';
import AdminColorField from './style/AdminColorField.jsx';
import AdminFontPicker from './style/AdminFontPicker.jsx';

const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' };
const labelStyle = { display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 };
const textareaStyle = { ...inputStyle, resize: 'vertical' };

export default function AboutUsEditor({ onSaved, onPreviewUpdate }) {
  const { siteConfig } = useContext(SiteContext);
  const { isModern } = useTheme();
  const [confirmModal, setConfirmModal] = useState(null);
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [storyText, setStoryText] = useState('');
  const [storyImage, setStoryImage] = useState('');
  const [sections, setSections] = useState([]);
  // Both templates' style overrides are tracked side-by-side so editing one
  // template never disturbs the other's saved values.
  const [classicStyle, setClassicStyle] = useState({});
  const [modernStyle, setModernStyle] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSection, setShowSection] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const fileInputRef = useRef(null);
  const hasLoadedRef = useRef(false);
  const pendingMedia = usePendingMedia(siteConfig?.id);

  const dirty = useDirtyTracker({ heroSubtitle, storyText, storyImage, sections, showSection, classicStyle, modernStyle });

  const activeStyle = isModern ? modernStyle : classicStyle;
  const setActiveStyle = isModern ? setModernStyle : setClassicStyle;
  const styleDefaults = isModern ? ABOUT_MODERN_STYLE_DEFAULTS : ABOUT_CLASSIC_STYLE_DEFAULTS;

  function updateStyleField(key, value) {
    setActiveStyle(prev => {
      const next = { ...prev };
      if (value === '' || value === null || value === undefined) delete next[key];
      else next[key] = value;
      return next;
    });
  }

  function resetStyleGroup(keys) {
    setActiveStyle(prev => {
      const next = { ...prev };
      for (const k of keys) delete next[k];
      return next;
    });
  }

  useEffect(() => {
    if (siteConfig?.id) loadSettings();
  }, [siteConfig?.id]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    if (onPreviewUpdate) onPreviewUpdate({ aboutPage: { heroSubtitle, storyText, storyImage, sections, classicStyle, modernStyle }, showAboutUs: showSection });
  }, [heroSubtitle, storyText, storyImage, sections, showSection, classicStyle, modernStyle]);

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
        const defaults = getAboutPageWithBrand(siteConfig.category, siteConfig.brandName || siteConfig.brand_name);

        const hsVal = aboutPage.heroSubtitle || defaults.heroSubtitle;
        const stVal = aboutPage.storyText || defaults.storyText;
        const siVal = aboutPage.storyImage || '';
        setHeroSubtitle(hsVal);
        setStoryText(stVal);
        setStoryImage(siVal);

        const ssVal = settings.showAboutUs !== false;
        setShowSection(ssVal);

        let sectionsVal;
        if (aboutPage.sections && aboutPage.sections.length > 0) {
          sectionsVal = aboutPage.sections.map(s => ({
            heading: s.heading || '',
            text: s.text || '',
            visible: s.visible !== false,
          }));
        } else if (aboutPage.missionHeading || aboutPage.missionText) {
          sectionsVal = [{
            heading: aboutPage.missionHeading || defaults.sections[0].heading,
            text: aboutPage.missionText || defaults.sections[0].text,
            visible: true,
          }];
        } else {
          sectionsVal = defaults.sections;
        }
        setSections(sectionsVal);

        const csVal = (aboutPage.classicStyle && typeof aboutPage.classicStyle === 'object') ? aboutPage.classicStyle : {};
        const msVal = (aboutPage.modernStyle && typeof aboutPage.modernStyle === 'object') ? aboutPage.modernStyle : {};
        setClassicStyle(csVal);
        setModernStyle(msVal);

        dirty.baseline({ heroSubtitle: hsVal, storyText: stVal, storyImage: siVal, sections: sectionsVal, showSection: ssVal, classicStyle: csVal, modernStyle: msVal });
      }
    } catch (e) {
      console.error('Failed to load about page settings:', e);
    } finally {
      setLoading(false);
      setTimeout(() => { hasLoadedRef.current = true; }, 0);
    }
  }

  async function handleImageUpload(file) {
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

    const oldImage = storyImage;
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
        const newUrl = result.data.images[0].url;
        setStoryImage(newUrl);
        pendingMedia.markUploaded(newUrl);
        if (oldImage) pendingMedia.markForDeletion(oldImage);
      } else {
        setStatus('error:' + `Upload failed: ${result.error || result.message || "Unknown error"}`);
      }
    } catch (e) {
      setStatus('error:' + `Upload failed: ${e.message}`);
    } finally {
      setUploading(false);
    }
  }

  function updateSection(index, field, value) {
    setSections(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  }

  function addSection() {
    setSections(prev => [...prev, { heading: "New Section", text: '', visible: true }]);
  }

  function removeSection(index) {
    setConfirmModal({
      title: "Remove Section",
      message: "Remove this section?",
      danger: true,
      confirmText: "Yes, Remove",
      onConfirm: () => {
        setSections(prev => prev.filter((_, i) => i !== index));
      }
    });
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
              classicStyle,
              modernStyle,
            },
            showAboutUs: showSection,
          }
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setStatus('success');
        dirty.markSaved();
        const cleanup = await pendingMedia.commit([storyImage]);
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
    <>
    <div style={{ maxWidth: 700 }}>
      <SaveBar topBar saving={saving} hasChanges={dirty.hasChanges} onSave={(e) => handleSave(e || { preventDefault: () => {} })} />
      <form onSubmit={handleSave}>
        <SectionToggle
          enabled={showSection}
          onChange={setShowSection}
          label="Show About Us Page"
          description="Toggle the About Us page visibility in your store"
        />
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
                  <img src={resolveImageUrl(storyImage)} alt="Our Story Section" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }} />
                  <button
                    type="button"
                    onClick={() => { if (storyImage) pendingMedia.markForDeletion(storyImage); setStoryImage(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
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
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>{`Content Sections (${sections.length})`}</h3>
          <button type="button" className="btn btn-secondary" onClick={addSection} style={{ fontSize: 13 }}>
            <i className="fas fa-plus" style={{ marginInlineEnd: 6 }} />Add Section
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
                  title={section.visible ? "Hide section" : "Show section"}
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

        <StyleSection
          isModern={isModern}
          style={activeStyle}
          defaults={styleDefaults}
          updateField={updateStyleField}
          resetGroup={resetStyleGroup}
        />

        {status && (
          <div style={{
            background: status === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${status === 'success' ? '#bbf7d0' : '#fecaca'}`,
            borderRadius: 8, padding: '12px 16px',
            color: status === 'success' ? '#166534' : '#dc2626',
            marginBottom: 16, fontSize: 14,
          }}>
            {status === 'success' ? "About Us page saved successfully!" : status.replace('error:', '')}
          </div>
        )}

        <SaveBar saving={saving} hasChanges={dirty.hasChanges} onSave={(e) => handleSave(e || { preventDefault: () => {} })} />
      </form>
    </div>

      <ConfirmModal
        open={!!confirmModal}
        title={confirmModal?.title || ''}
        message={confirmModal?.message || ''}
        confirmText={confirmModal?.confirmText}
        cancelText={confirmModal?.cancelText}
        danger={confirmModal?.danger}
        onConfirm={() => { confirmModal?.onConfirm?.(); setConfirmModal(null); }}
        onCancel={() => setConfirmModal(null)}
      />
    </>
  );
}

// Style controls for the active template (Classic or Modern). Each group
// has a "Reset to default" link that clears only that group's keys, leaving
// the inactive template's saved values untouched (those live in a separate
// state object in the parent).
function StyleSection({ isModern, style, defaults, updateField, resetGroup }) {
  const templateLabel = isModern ? 'Modern' : 'Classic';

  const groups = [
    {
      title: 'Page',
      keys: ['pageBg'],
      fields: [
        { kind: 'color', key: 'pageBg', label: 'Page Background' },
      ],
    },
    {
      title: 'Hero',
      keys: ['heroBg', 'heroTitleColor', 'heroSubtitleColor'],
      fields: [
        { kind: 'color', key: 'heroBg', label: 'Hero Background' },
        { kind: 'color', key: 'heroTitleColor', label: 'Hero Title Color' },
        { kind: 'color', key: 'heroSubtitleColor', label: 'Hero Subtitle Color' },
      ],
    },
    {
      title: 'Our Story',
      keys: isModern
        ? ['storyBg', 'storyHeadingColor', 'storyBodyColor', 'storyCardBg']
        : ['storyBg', 'storyHeadingColor', 'storyBodyColor'],
      fields: [
        { kind: 'color', key: 'storyBg', label: 'Story Section Background' },
        ...(isModern ? [{ kind: 'color', key: 'storyCardBg', label: 'Story Image Background' }] : []),
        { kind: 'color', key: 'storyHeadingColor', label: 'Story Heading Color' },
        { kind: 'color', key: 'storyBodyColor', label: 'Story Body Color' },
      ],
    },
    {
      title: 'Extra Sections',
      keys: ['sectionHeadingColor', 'sectionBodyColor'],
      fields: [
        { kind: 'color', key: 'sectionHeadingColor', label: 'Heading Color' },
        { kind: 'color', key: 'sectionBodyColor', label: 'Body Color' },
      ],
    },
    ...(isModern ? [{
      title: 'Accent',
      keys: ['accentColor'],
      fields: [
        { kind: 'color', key: 'accentColor', label: 'Accent Color (Dividers)' },
      ],
    }] : []),
    {
      title: 'Typography',
      keys: ['headingFont', 'bodyFont'],
      fields: [
        { kind: 'font', key: 'headingFont', label: 'Heading Font' },
        { kind: 'font', key: 'bodyFont', label: 'Body Font' },
      ],
    },
  ];

  return (
    <div className="card" style={{ marginTop: 24, marginBottom: 20 }}>
      <div className="card-header">
        <h3 className="card-title">Style — {templateLabel} template</h3>
      </div>
      <div className="card-content">
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
          Customize colors and fonts for your About Us page. These settings apply only to the
          <strong> {templateLabel}</strong> template — the other template's saved styling is preserved.
          Switch templates in your theme to edit the other set.
        </p>

        {groups.map(group => (
          <div key={group.title} style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                {group.title}
              </h4>
              {group.keys.some(k => style[k]) && (
                <button
                  type="button"
                  onClick={() => resetGroup(group.keys)}
                  style={{
                    background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                    fontSize: 12, color: '#475569', textDecoration: 'underline',
                  }}
                >
                  Reset to default
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {group.fields.map(f => (
                f.kind === 'color' ? (
                  <AdminColorField
                    key={f.key}
                    label={f.label}
                    value={style[f.key] || ''}
                    fallback={defaults[f.key]}
                    onChange={(v) => updateField(f.key, v)}
                  />
                ) : (
                  <AdminFontPicker
                    key={f.key}
                    label={f.label}
                    value={style[f.key] || ''}
                    onChange={(v) => updateField(f.key, v)}
                  />
                )
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
