import React, { useState, useEffect, useContext, useRef } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import SectionToggle from './SectionToggle.jsx';
import SaveBar from './SaveBar.jsx';
import AdminColorField from './style/AdminColorField.jsx';
import AdminFontPicker from './style/AdminFontPicker.jsx';

import { getFeaturedVideoPlaceholders, getFeaturedVideoDefaults } from '../../defaults/index.js';
import { API_BASE } from '../../config.js';
import { usePendingMedia } from '../../hooks/usePendingMedia.js';

export default function FeaturedVideoEditor({ onSaved, onPreviewUpdate, sectionVisible = true, onToggleVisibility }) {
  const { siteConfig } = useContext(SiteContext);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoKey, setVideoKey] = useState('');
  const [chatLink, setChatLink] = useState('');
  const [chatButtonText, setChatButtonText] = useState("CHAT NOW");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [fvTitleColor, setFvTitleColor] = useState('');
  const [fvTitleFont, setFvTitleFont] = useState('');
  const [fvDescColor, setFvDescColor] = useState('');
  const [fvDescFont, setFvDescFont] = useState('');
  const [fvBtnBg, setFvBtnBg] = useState('');
  const [fvBtnText, setFvBtnText] = useState('');
  const [fvBtnRadius, setFvBtnRadius] = useState('');
  const [activeView, setActiveView] = useState('content');
  const fileInputRef = useRef(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    if (onPreviewUpdate) onPreviewUpdate({
      fvTitleColor: fvTitleColor || undefined,
      fvTitleFont: fvTitleFont || undefined,
      fvDescColor: fvDescColor || undefined,
      fvDescFont: fvDescFont || undefined,
      fvBtnBg: fvBtnBg || undefined,
      fvBtnText: fvBtnText || undefined,
      fvBtnRadius: fvBtnRadius || undefined,
    });
  }, [fvTitleColor, fvTitleFont, fvDescColor, fvDescFont, fvBtnBg, fvBtnText, fvBtnRadius]);
  const serverValuesRef = useRef(null);
  const { markUploaded, markForDeletion, commit } = usePendingMedia(siteConfig?.id);

  const placeholders = getFeaturedVideoPlaceholders(siteConfig?.category);

  useEffect(() => {
    if (siteConfig?.id) loadSettings();
  }, [siteConfig?.id]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    const current = JSON.stringify({ title, description, videoUrl, chatLink, chatButtonText });
    setHasChanges(current !== serverValuesRef.current);
    if (onPreviewUpdate) onPreviewUpdate({ featuredVideoTitle: title, featuredVideoDescription: description, featuredVideoUrl: videoUrl, featuredVideoChatLink: chatLink, featuredVideoChatButtonText: chatButtonText || "CHAT NOW" });
  }, [title, description, videoUrl, chatLink, chatButtonText]);

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
        const catDefaults = getFeaturedVideoDefaults(siteConfig?.category);
        const tVal = settings.featuredVideoTitle || catDefaults.title || '';
        const dVal = settings.featuredVideoDescription || catDefaults.description || '';
        const vVal = settings.featuredVideoUrl || '';
        const clVal = settings.featuredVideoChatLink || '';
        const cbVal = settings.featuredVideoChatButtonText || "CHAT NOW";
        setTitle(tVal);
        setDescription(dVal);
        setVideoUrl(vVal);
        setVideoKey(settings.featuredVideoKey || '');
        setChatLink(clVal);
        setChatButtonText(cbVal);
        setFvTitleColor(settings.fvTitleColor || '');
        setFvTitleFont(settings.fvTitleFont || '');
        setFvDescColor(settings.fvDescColor || '');
        setFvDescFont(settings.fvDescFont || '');
        setFvBtnBg(settings.fvBtnBg || '');
        setFvBtnText(settings.fvBtnText || '');
        setFvBtnRadius(settings.fvBtnRadius || '');
        serverValuesRef.current = JSON.stringify({ title: tVal, description: dVal, videoUrl: vVal, chatLink: clVal, chatButtonText: cbVal });
      }
    } catch (e) {
      console.error('Failed to load featured video settings:', e);
    } finally {
      setLoading(false);
      setTimeout(() => { hasLoadedRef.current = true; }, 0);
    }
  }

  function handleVideoUpload(file) {
    if (!file) return;
    const allowed = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowed.includes(file.type)) {
      setStatus('error:' + "Please upload an MP4, WebM, or MOV video file.");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setStatus('error:' + "Video is too large. Maximum size is 100MB.");
      return;
    }

    const oldVideo = videoUrl;
    setUploading(true);
    setUploadProgress(0);
    setStatus('');

    const formData = new FormData();
    formData.append('video', file);
    const token = sessionStorage.getItem('site_admin_token');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/api/upload/video?siteId=${siteConfig.id}`);
    if (token) xhr.setRequestHeader('Authorization', `SiteAdmin ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setUploadProgress(Math.round((e.loaded / e.total) * 95));
      }
    };

    xhr.onload = () => {
      try {
        const result = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && result.success && result.data?.url) {
          setVideoUrl(result.data.url);
          setVideoKey(result.data.key || '');
          setUploadProgress(100);
          markUploaded(result.data.url);
          if (oldVideo) markForDeletion(oldVideo);
        } else {
          setStatus('error:' + `Upload failed: ${result.error || result.message || "Unknown error"}`);
        }
      } catch (e) {
        setStatus('error:' + "Upload failed: invalid server response");
      }
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 800);
    };

    xhr.onerror = () => {
      setStatus('error:' + "Failed to upload video. Please check your connection.");
      setUploading(false);
      setUploadProgress(0);
    };

    xhr.send(formData);
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
            featuredVideoTitle: title,
            featuredVideoDescription: description,
            featuredVideoUrl: videoUrl,
            featuredVideoKey: videoKey,
            featuredVideoChatLink: chatLink,
            featuredVideoChatButtonText: chatButtonText || "CHAT NOW",
            fvTitleColor,
            fvTitleFont,
            fvDescColor,
            fvDescFont,
            fvBtnBg,
            fvBtnText,
            fvBtnRadius,
          }
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setStatus('success');
        serverValuesRef.current = JSON.stringify({ title, description, videoUrl, chatLink, chatButtonText });
        setHasChanges(false);
        commit(videoUrl ? [videoUrl] : []);
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
          label="Show Featured Video"
          description="Toggle the featured video section on your homepage"
        />
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e2e8f0' }}>
          {[{ key: 'content', icon: 'fa-bars', label: 'Content' }, { key: 'appearance', icon: 'fa-paint-brush', label: 'Appearance' }].map(tab => (
            <button key={tab.key} type="button" onClick={() => setActiveView(tab.key)} style={{ padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, color: activeView === tab.key ? '#2563eb' : '#64748b', borderBottom: `2px solid ${activeView === tab.key ? '#2563eb' : 'transparent'}`, marginBottom: -2, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', transition: 'color 0.15s ease' }}>
              <i className={`fas ${tab.icon}`} />{tab.label}
            </button>
          ))}
        </div>
        {activeView === 'content' && <>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Featured Video Section</h3>
          </div>
          <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              A full-screen video section with text overlay and a chat button. This appears on your homepage below the Watch & Buy section.
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Video</label>
              {videoUrl ? (
                <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', background: '#000', marginBottom: 8 }}>
                  <video
                    src={videoUrl}
                    style={{ width: '100%', maxHeight: 220, objectFit: 'contain', display: 'block' }}
                    playsInline
                    controls
                  />
                  <button
                    type="button"
                    onClick={() => { if (videoUrl) markForDeletion(videoUrl); setVideoUrl(''); setVideoKey(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
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
                    if (file) handleVideoUpload(file);
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
                      <span style={{ fontSize: 13, color: '#2563eb' }}>{`Uploading... ${uploadProgress}%`}</span>
                      <div style={{ width: '80%', margin: '8px auto 0', height: 4, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${uploadProgress}%`, height: '100%', background: '#2563eb', borderRadius: 4, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  ) : (
                    <>
                      <i className="fas fa-cloud-upload-alt" style={{ fontSize: 28, marginBottom: 8, display: 'block' }} />
                      <span style={{ fontSize: 13, display: 'block' }}>Click or drag to upload video</span>
                      <span style={{ fontSize: 11, color: '#b0b8c4', marginTop: 4, display: 'block' }}>MP4, WebM, MOV — max 100MB</span>
                    </>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files[0]) handleVideoUpload(e.target.files[0]); e.target.value = ''; }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={placeholders.title}
                maxLength={100}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={placeholders.description}
                maxLength={300}
                rows={3}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Chat Button Text</label>
                <input
                  type="text"
                  value={chatButtonText}
                  onChange={e => setChatButtonText(e.target.value)}
                  placeholder="CHAT NOW"
                  maxLength={30}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Chat Button Link</label>
                <input
                  type="url"
                  value={chatLink}
                  onChange={e => setChatLink(e.target.value)}
                  placeholder="https://wa.me/919999999999"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Leave empty to use your store's WhatsApp number</p>
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
            {status === 'success' ? "Featured video section saved successfully!" : status.replace('error:', '')}
          </div>
        )}

        <SaveBar saving={saving} hasChanges={hasChanges} onSave={(e) => handleSave(e || { preventDefault: () => {} })} />
        </>}

        {activeView === 'appearance' && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <h3 className="card-title">Appearance</h3>
            </div>
            <div className="card-content">
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
                Customize colors, fonts, and the action button style for the Featured Video section.
              </p>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Title</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                <AdminColorField label="Title Color" value={fvTitleColor} fallback="#d4af37" onChange={v => { setFvTitleColor(v); setHasChanges(true); }} />
                <AdminFontPicker label="Title Font" value={fvTitleFont} onChange={v => { setFvTitleFont(v); setHasChanges(true); }} />
              </div>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                <AdminColorField label="Description Color" value={fvDescColor} fallback="#ffffff" onChange={v => { setFvDescColor(v); setHasChanges(true); }} />
                <AdminFontPicker label="Description Font" value={fvDescFont} onChange={v => { setFvDescFont(v); setHasChanges(true); }} />
              </div>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Button</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                <AdminColorField label="Button Background" value={fvBtnBg} fallback="#ffffff" onChange={v => { setFvBtnBg(v); setHasChanges(true); }} />
                <AdminColorField label="Button Text" value={fvBtnText} fallback="#333333" onChange={v => { setFvBtnText(v); setHasChanges(true); }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Button Shape</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[{ v: '', label: 'Default' }, { v: 'sharp', label: 'Sharp' }, { v: 'rounded', label: 'Rounded' }, { v: 'pill', label: 'Pill' }].map(opt => (
                    <button key={opt.v} type="button" onClick={() => { setFvBtnRadius(opt.v); setHasChanges(true); }} style={{ padding: '8px 16px', border: `2px solid ${fvBtnRadius === opt.v ? '#2563eb' : '#e2e8f0'}`, borderRadius: 6, background: fvBtnRadius === opt.v ? '#eff6ff' : '#fff', color: fvBtnRadius === opt.v ? '#2563eb' : '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <SaveBar saving={saving} hasChanges={hasChanges} onSave={(e) => handleSave(e || { preventDefault: () => {} })} />
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
