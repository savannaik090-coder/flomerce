import React, { useState, useEffect, useContext, useRef } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';

const API_BASE = typeof window !== 'undefined' && window.location.hostname.endsWith('fluxe.in') ? '' : 'https://fluxe.in';

const CATEGORY_PLACEHOLDERS = {
  jewellery: {
    title: "e.g., Let's Create Your Perfect Bridal Jewelry",
    description: "e.g., Dreaming of something truly elegant? Discover our exquisite jewelry collection. Connect with our designers and create your perfect bridal ensemble",
  },
  clothing: {
    title: "e.g., Discover Your Perfect Style",
    description: "e.g., Explore our latest fashion collection crafted for every occasion. Connect with our stylists and find the perfect outfit that defines you",
  },
  electronics: {
    title: "e.g., Experience Next-Gen Technology",
    description: "e.g., Discover cutting-edge gadgets and smart devices. Connect with our tech experts and find the perfect product for your needs",
  },
};

const DEFAULT_PLACEHOLDERS = {
  title: "e.g., Discover Our Collection",
  description: "e.g., Explore our curated selection of premium products. Connect with us and find exactly what you're looking for",
};

export default function FeaturedVideoEditor({ onSaved }) {
  const { siteConfig } = useContext(SiteContext);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoKey, setVideoKey] = useState('');
  const [chatLink, setChatLink] = useState('');
  const [chatButtonText, setChatButtonText] = useState('CHAT NOW');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);

  const placeholders = CATEGORY_PLACEHOLDERS[siteConfig?.category] || DEFAULT_PLACEHOLDERS;

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
        setTitle(settings.featuredVideoTitle || '');
        setDescription(settings.featuredVideoDescription || '');
        setVideoUrl(settings.featuredVideoUrl || '');
        setVideoKey(settings.featuredVideoKey || '');
        setChatLink(settings.featuredVideoChatLink || '');
        setChatButtonText(settings.featuredVideoChatButtonText || 'CHAT NOW');
      }
    } catch (e) {
      console.error('Failed to load featured video settings:', e);
    } finally {
      setLoading(false);
    }
  }

  function handleVideoUpload(file) {
    if (!file) return;
    const allowed = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowed.includes(file.type)) {
      setStatus('error:Please upload an MP4, WebM, or MOV video file.');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setStatus('error:Video is too large. Maximum size is 100MB.');
      return;
    }

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
        } else {
          setStatus('error:Upload failed: ' + (result.error || result.message || 'Unknown error'));
        }
      } catch (e) {
        setStatus('error:Upload failed: invalid server response');
      }
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 800);
    };

    xhr.onerror = () => {
      setStatus('error:Failed to upload video. Please check your connection.');
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
            featuredVideoChatButtonText: chatButtonText || 'CHAT NOW',
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
                    onClick={() => { setVideoUrl(''); setVideoKey(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
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
                      <span style={{ fontSize: 13, color: '#2563eb' }}>Uploading... {uploadProgress}%</span>
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
            {status === 'success' ? 'Featured video section saved successfully!' : status.replace('error:', '')}
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={saving || uploading} style={{ width: '100%' }}>
          {saving ? 'Saving...' : 'Save Featured Video'}
        </button>
      </form>
    </div>
  );
}
