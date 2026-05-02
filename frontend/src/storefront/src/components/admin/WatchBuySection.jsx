import React, { useState, useEffect, useContext, useRef } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { getProducts } from '../../services/productService.js';
import SectionToggle from './SectionToggle.jsx';
import SaveBar from './SaveBar.jsx';
import ConfirmModal from './ConfirmModal.jsx';
import AdminColorField from './style/AdminColorField.jsx';
import AdminFontPicker from './style/AdminFontPicker.jsx';
import { formatPrice, getAdminCurrency } from '../../utils/priceFormatter.js';
import { getWatchAndBuyDefaults } from '../../defaults/index.js';
import { API_BASE } from '../../config.js';
import { usePendingMedia } from '../../hooks/usePendingMedia.js';
import { useToast } from '../../../../shared/ui/Toast.jsx';

export default function WatchBuySection({ onSaved, onPreviewUpdate }) {
  const { siteConfig } = useContext(SiteContext);
  const [videos, setVideos] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const [editingVideo, setEditingVideo] = useState(null);
  const [form, setForm] = useState({ productSku: '', videoUrl: '', videoKey: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [showSection, setShowSection] = useState(true);
  const [skuLookup, setSkuLookup] = useState(null);
  const [skuSearching, setSkuSearching] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [usingDefaults, setUsingDefaults] = useState(false);
  const [wbHeadingColor, setWbHeadingColor] = useState('');
  const [wbHeadingFont, setWbHeadingFont] = useState('');
  const [wbDividerColor, setWbDividerColor] = useState('');
  const [wbCardBorder, setWbCardBorder] = useState('');
  const [activeView, setActiveView] = useState('content');
  const fileInputRef = useRef(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    if (onPreviewUpdate) onPreviewUpdate({
      wbHeadingColor: wbHeadingColor || undefined,
      wbHeadingFont: wbHeadingFont || undefined,
      wbDividerColor: wbDividerColor || undefined,
      wbCardBorder: wbCardBorder || undefined,
    });
  }, [wbHeadingColor, wbHeadingFont, wbDividerColor, wbCardBorder]);
  const skipNextChangeRef = useRef(false);
  const serverShowRef = useRef(true);
  const { markUploaded, markForDeletion, commit } = usePendingMedia(siteConfig?.id);

  useEffect(() => {
    if (siteConfig?.id) {
      loadVideos();
      loadProducts();
    }
  }, [siteConfig?.id]);

  async function loadProducts() {
    try {
      const res = await getProducts(siteConfig.id, { limit: 500 });
      const prods = res.data || res.products || [];
      setProducts(prods);
    } catch (e) {
      console.error('Failed to load products:', e);
    }
  }

  async function loadVideos() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/site?subdomain=${encodeURIComponent(siteConfig.subdomain)}`);
      const result = await response.json();
      if (result.success && result.data) {
        let settings = result.data.settings || {};
        if (typeof settings === 'string') {
          try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
        }
        const savedVideos = settings.watchAndBuyVideos || [];
        if (savedVideos.length > 0) {
          setVideos(savedVideos);
          setUsingDefaults(false);
        } else {
          const category = siteConfig?.category || 'generic';
          setVideos(getWatchAndBuyDefaults(category));
          setUsingDefaults(true);
        }
        const val = settings.showWatchAndBuy !== false;
        setShowSection(val);
        serverShowRef.current = val;
        setWbHeadingColor(settings.wbHeadingColor || '');
        setWbHeadingFont(settings.wbHeadingFont || '');
        setWbDividerColor(settings.wbDividerColor || '');
        setWbCardBorder(settings.wbCardBorder || '');
      }
    } catch (e) {
      console.error('Failed to load videos:', e);
    } finally {
      setLoading(false);
      skipNextChangeRef.current = true;
      hasLoadedRef.current = true;
    }
  }

  function handleToggleChange(val) {
    setShowSection(val);
    setHasChanges(val !== serverShowRef.current);
  }

  function findProductBySku(sku) {
    if (!sku || !products.length) return null;
    return products.find(p => p.sku === sku || p.id === sku) || null;
  }

  function handleSkuChange(sku) {
    setForm(p => ({ ...p, productSku: sku }));
    if (sku.trim()) {
      setSkuSearching(true);
      const found = findProductBySku(sku.trim());
      setSkuLookup(found);
      setSkuSearching(false);
    } else {
      setSkuLookup(null);
    }
  }

  function openAdd() {
    setEditingVideo(null);
    setForm({ productSku: '', videoUrl: '', videoKey: '' });
    setSkuLookup(null);
    setError('');
    setShowModal(true);
  }

  function openEdit(video) {
    setEditingVideo(video);
    setForm({ productSku: video.productSku || '', videoUrl: video.videoUrl || '', videoKey: video.videoKey || '' });
    if (video.productSku) {
      const found = findProductBySku(video.productSku);
      setSkuLookup(found);
    } else {
      setSkuLookup(null);
    }
    setError('');
    setShowModal(true);
  }

  function handleVideoUpload(file) {
    if (!file) return;
    const allowed = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowed.includes(file.type)) {
      setError("Please upload an MP4, WebM, or MOV video file.");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError("Video is too large. Maximum size is 100MB.");
      return;
    }

    const oldVideo = form.videoUrl;
    setUploading(true);
    setUploadProgress(0);
    setError('');

    const formData = new FormData();
    formData.append('video', file);
    const token = sessionStorage.getItem('site_admin_token');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/api/upload/video?siteId=${siteConfig.id}`);
    if (token) xhr.setRequestHeader('Authorization', `SiteAdmin ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 95);
        setUploadProgress(pct);
      }
    };

    xhr.onload = () => {
      try {
        const result = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && result.success && result.data?.url) {
          setForm(p => ({ ...p, videoUrl: result.data.url, videoKey: result.data.key || '' }));
          setUploadProgress(100);
          markUploaded(result.data.url);
          if (oldVideo) markForDeletion(oldVideo);
        } else {
          setError(`Upload failed: ${result.error || result.message || "Unknown error"}`);
        }
      } catch (e) {
        setError("Upload failed: invalid server response");
      }
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 800);
    };

    xhr.onerror = () => {
      setError("Failed to upload video. Please check your connection.");
      setUploading(false);
      setUploadProgress(0);
    };

    xhr.send(formData);
  }

  async function saveVideosToSettings(updatedVideos) {
    const token = sessionStorage.getItem('site_admin_token');
    const response = await fetch(`${API_BASE}/api/sites/${siteConfig.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `SiteAdmin ${token}` : '',
      },
      body: JSON.stringify({ settings: { watchAndBuyVideos: updatedVideos, showWatchAndBuy: showSection, wbHeadingColor, wbHeadingFont, wbDividerColor, wbCardBorder } }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to save');
    }
    return result;
  }

  async function handleSaveAll() {
    setSaving(true);
    try {
      const token = sessionStorage.getItem('site_admin_token');
      const response = await fetch(`${API_BASE}/api/sites/${siteConfig.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `SiteAdmin ${token}` : '',
        },
        body: JSON.stringify({ settings: { watchAndBuyVideos: videos, showWatchAndBuy: showSection, wbHeadingColor, wbHeadingFont, wbDividerColor, wbCardBorder } }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        serverShowRef.current = showSection;
        setHasChanges(false);
        const keepUrls = videos.map(v => v.videoUrl).filter(Boolean);
        commit(keepUrls);
        if (onSaved) onSaved();
      }
    } catch (e) {
      console.error('Failed to save:', e);
    } finally {
      setSaving(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.productSku.trim()) { setError("Product SKU is required."); return; }
    if (!form.videoUrl) { setError("Please upload a video."); return; }

    setSaving(true);
    setError('');
    try {
      const productInfo = findProductBySku(form.productSku.trim());
      const videoData = {
        id: editingVideo ? editingVideo.id : Date.now().toString(),
        productSku: form.productSku.trim(),
        productId: productInfo?.id || '',
        videoUrl: form.videoUrl,
        videoKey: form.videoKey || '',
        title: productInfo?.name || form.productSku.trim(),
        createdAt: editingVideo ? editingVideo.createdAt : new Date().toISOString(),
      };

      let updatedVideos;
      if (editingVideo) {
        if (usingDefaults) {
          updatedVideos = [videoData];
        } else {
          updatedVideos = videos.map(v => v.id === editingVideo.id ? videoData : v);
        }
      } else {
        if (usingDefaults) {
          updatedVideos = [videoData];
        } else {
          updatedVideos = [...videos, videoData];
        }
      }

      await saveVideosToSettings(updatedVideos);
      setVideos(updatedVideos);
      setUsingDefaults(false);
      serverShowRef.current = showSection;
      setHasChanges(false);
      setShowModal(false);
      // Only after the settings PUT succeeds do we actually clean up any
      // replaced/removed video files from R2.
      const keepUrls = updatedVideos.map(v => v.videoUrl).filter(Boolean);
      commit(keepUrls);
      if (onSaved) onSaved();
    } catch (err) {
      setError(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(videoId) {
    setConfirmModal({
      title: "Delete Video",
      message: "Delete this video?",
      danger: true,
      onConfirm: async () => {
        const deletedVideo = videos.find(v => v.id === videoId);
        try {
          const updatedVideos = videos.filter(v => v.id !== videoId);
          if (deletedVideo?.videoUrl) markForDeletion(deletedVideo.videoUrl);
          await saveVideosToSettings(updatedVideos);
          setVideos(updatedVideos);
          serverShowRef.current = showSection;
          setHasChanges(false);
          const keepUrls = updatedVideos.map(v => v.videoUrl).filter(Boolean);
          commit(keepUrls);
          if (onSaved) onSaved();
        } catch (err) {
          toast.error(`Failed to delete: ${err.message}`);
        }
      }
    });
  }

  function getProductNameForVideo(video) {
    const product = findProductBySku(video.productSku);
    return product?.name || video.title || video.productSku || "Unknown Product";
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>;
  }

  return (
    <>
    <div>
      <SaveBar topBar saving={saving} hasChanges={hasChanges} onSave={handleSaveAll} />
      <SectionToggle
        enabled={showSection}
        onChange={handleToggleChange}
        label="Show Watch & Buy"
        description="Toggle the shoppable video section on your homepage"
      />
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e2e8f0' }}>
        {[{ key: 'content', icon: 'fa-bars', label: 'Content' }, { key: 'appearance', icon: 'fa-paint-brush', label: 'Appearance' }].map(tab => (
          <button key={tab.key} type="button" onClick={() => setActiveView(tab.key)} style={{ padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, color: activeView === tab.key ? '#2563eb' : '#64748b', borderBottom: `2px solid ${activeView === tab.key ? '#2563eb' : 'transparent'}`, marginBottom: -2, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', transition: 'color 0.15s ease' }}>
            <i className={`fas ${tab.icon}`} />{tab.label}
          </button>
        ))}
      </div>

      {activeView === 'content' && <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Watch & Buy Videos</h2>
        <button className="btn btn-primary" onClick={openAdd}>
          <i className="fas fa-plus" style={{ marginInlineEnd: 8 }} />Upload Video
        </button>
      </div>

      {usingDefaults && (
        <div style={{ background: '#fffbeb', border: '1px solid #fed7aa', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fas fa-info-circle" />
          <span>Showing default placeholder content. Upload videos and link products to customize this section.</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        {videos.map(video => (
          <div key={video.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ width: '100%', background: video.videoUrl ? '#1e293b' : '#ffffff', position: 'relative', border: video.videoUrl ? 'none' : '1px solid #e2e8f0' }}>
              {video.videoUrl ? (
                <video src={video.videoUrl} style={{ width: '100%', height: 'auto', maxHeight: 400, objectFit: 'contain', display: 'block' }} playsInline loop controls />
              ) : (
                <div style={{ width: '100%', height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
                  <i className="fas fa-video" style={{ color: '#cbd5e1', fontSize: 32 }} />
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>No video uploaded</span>
                </div>
              )}
            </div>
            <div style={{ padding: 16 }}>
              <h4 style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{video.title || getProductNameForVideo(video)}</h4>
              {video.productSku ? (
                <div style={{ fontSize: 12, color: '#2563eb', marginBottom: 12 }}>
                  <i className="fas fa-link" style={{ marginInlineEnd: 4 }} />SKU: {video.productSku}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
                  <i className="fas fa-link" style={{ marginInlineEnd: 4 }} />No product linked
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" style={{ flex: 1, fontSize: 13 }} onClick={() => openEdit(video)}>
                  <i className="fas fa-edit" style={{ marginInlineEnd: 4 }} />Edit
                </button>
                {!usingDefaults && (
                  <button
                    style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#dc2626', cursor: 'pointer', fontSize: 13 }}
                    onClick={() => handleDelete(video.id)}
                  >
                    <i className="fas fa-trash" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <SaveBar saving={saving} hasChanges={hasChanges} onSave={handleSaveAll} />
      </>}

      {activeView === 'appearance' && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Appearance</h3>
          </div>
          <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
              Customize the colors and typography of the Watch &amp; Buy section heading and video cards.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <AdminColorField label="Heading Color" value={wbHeadingColor} fallback="#333333" onChange={v => { setWbHeadingColor(v); setHasChanges(true); }} />
              <AdminFontPicker label="Heading Font" value={wbHeadingFont} onChange={v => { setWbHeadingFont(v); setHasChanges(true); }} />
              <AdminColorField label="Divider Color" value={wbDividerColor} fallback="#d4af37" onChange={v => { setWbDividerColor(v); setHasChanges(true); }} />
              <AdminColorField label="Card Border Color" value={wbCardBorder} fallback="#d4af37" onChange={v => { setWbCardBorder(v); setHasChanges(true); }} />
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 32, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontWeight: 700, fontSize: 18 }}>{editingVideo ? "Edit Video" : "Upload Video"}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}>
                <i className="fas fa-times" />
              </button>
            </div>
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', marginBottom: 16, fontSize: 13 }}>
                {error}
              </div>
            )}
            <form onSubmit={handleSave}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Product SKU *</label>
                <input
                  type="text"
                  placeholder="e.g., NKL-001"
                  value={form.productSku}
                  onChange={e => handleSkuChange(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
                  required
                />
                {form.productSku.trim() && (
                  <div style={{ marginTop: 6, padding: '8px 12px', borderRadius: 6, fontSize: 13, background: skuLookup ? '#f0fdf4' : '#fffbeb', border: `1px solid ${skuLookup ? '#bbf7d0' : '#fed7aa'}` }}>
                    {skuSearching ? (
                      <span style={{ color: '#64748b' }}>Searching...</span>
                    ) : skuLookup ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {skuLookup.images?.[0]?.url && (
                          <img src={skuLookup.images[0].url} alt="" style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover' }} />
                        )}
                        <div>
                          <div style={{ fontWeight: 600, color: '#166534' }}>{skuLookup.name}</div>
                          {skuLookup.price && <div style={{ fontSize: 12, color: '#166534' }}>{formatPrice(Number(skuLookup.price), getAdminCurrency(siteConfig))}</div>}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: '#92400e' }}>No product found with this SKU. The video will still be saved.</span>
                    )}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Video *</label>
                {form.videoUrl ? (
                  <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', background: '#000' }}>
                    <video
                      src={form.videoUrl}
                      style={{ width: '100%', maxHeight: 240, objectFit: 'contain' }}
                      muted
                      playsInline
                      controls
                    />
                    <button
                      type="button"
                      onClick={() => { if (form.videoUrl) markForDeletion(form.videoUrl); setForm(p => ({ ...p, videoUrl: '', videoKey: '' })); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      style={{
                        position: 'absolute', top: 8, right: 8,
                        background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none',
                        borderRadius: '50%', width: 32, height: 32, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
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
                      border: '2px dashed #cbd5e1', borderRadius: 8, padding: '32px 16px',
                      textAlign: 'center', cursor: uploading ? 'not-allowed' : 'pointer',
                      color: '#94a3b8', background: '#fafafa',
                      transition: 'border-color 0.2s',
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
                        <i className="fas fa-cloud-upload-alt" style={{ fontSize: 32, marginBottom: 8, display: 'block' }} />
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

              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving || uploading}>
                  {saving ? <><i className="fas fa-spinner fa-spin" style={{ marginInlineEnd: 8 }} />Saving...</> : editingVideo ? "Save Changes" : "Upload Video"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
