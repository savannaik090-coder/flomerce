import React, { useState, useEffect, useContext, useRef } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { getProducts } from '../../services/productService.js';

const API_BASE = typeof window !== 'undefined' && window.location.hostname.endsWith('fluxe.in') ? '' : 'https://fluxe.in';

export default function WatchBuySection() {
  const { siteConfig } = useContext(SiteContext);
  const [videos, setVideos] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [form, setForm] = useState({ productSku: '', videoUrl: '', videoKey: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [skuLookup, setSkuLookup] = useState(null);
  const [skuSearching, setSkuSearching] = useState(false);
  const fileInputRef = useRef(null);

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
        setVideos(settings.watchAndBuyVideos || []);
      }
    } catch (e) {
      console.error('Failed to load videos:', e);
    } finally {
      setLoading(false);
    }
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

  async function handleVideoUpload(file) {
    if (!file) return;
    const allowed = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowed.includes(file.type)) {
      setError('Please upload an MP4, WebM, or MOV video file.');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError('Video is too large. Maximum size is 100MB.');
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    setError('');

    try {
      const formData = new FormData();
      formData.append('video', file);
      const token = sessionStorage.getItem('site_admin_token');

      setUploadProgress(30);

      const response = await fetch(`${API_BASE}/api/upload/video?siteId=${siteConfig.id}`, {
        method: 'POST',
        headers: { 'Authorization': token ? `SiteAdmin ${token}` : '' },
        body: formData,
      });

      setUploadProgress(80);

      const result = await response.json();
      if (result.success && result.data?.url) {
        setForm(p => ({ ...p, videoUrl: result.data.url, videoKey: result.data.key || '' }));
        setUploadProgress(100);
      } else {
        setError('Upload failed: ' + (result.error || result.message || 'Unknown error'));
      }
    } catch (e) {
      setError('Failed to upload video: ' + e.message);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 500);
    }
  }

  async function saveVideosToSettings(updatedVideos) {
    const token = sessionStorage.getItem('site_admin_token');
    const response = await fetch(`${API_BASE}/api/sites/${siteConfig.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `SiteAdmin ${token}` : '',
      },
      body: JSON.stringify({ settings: { watchAndBuyVideos: updatedVideos } }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to save');
    }
    return result;
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.productSku.trim()) { setError('Product SKU is required.'); return; }
    if (!form.videoUrl) { setError('Please upload a video.'); return; }

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
        updatedVideos = videos.map(v => v.id === editingVideo.id ? videoData : v);
      } else {
        updatedVideos = [...videos, videoData];
      }

      await saveVideosToSettings(updatedVideos);
      setVideos(updatedVideos);
      setShowModal(false);
    } catch (err) {
      setError('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(videoId) {
    if (!window.confirm('Delete this video?')) return;
    try {
      const updatedVideos = videos.filter(v => v.id !== videoId);
      await saveVideosToSettings(updatedVideos);
      setVideos(updatedVideos);
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  }

  function getProductNameForVideo(video) {
    const product = findProductBySku(video.productSku);
    return product?.name || video.title || video.productSku || 'Unknown Product';
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Watch & Buy Videos</h2>
        <button className="btn btn-primary" onClick={openAdd}>
          <i className="fas fa-plus" style={{ marginRight: 8 }} />Upload Video
        </button>
      </div>

      {videos.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-video" />
          <h3>No Videos Yet</h3>
          <p>Upload shoppable videos that link to your products. These appear in the Watch & Buy section on your homepage.</p>
          <button className="btn btn-primary" onClick={openAdd} style={{ marginTop: 16 }}>
            <i className="fas fa-plus" style={{ marginRight: 8 }} />Add First Video
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {videos.map(video => (
            <div key={video.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ width: '100%', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                {video.videoUrl ? (
                  <video src={video.videoUrl} style={{ width: '100%', height: 'auto', maxHeight: 400, objectFit: 'contain', display: 'block' }} muted />
                ) : (
                  <div style={{ width: '100%', height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="fas fa-video" style={{ color: '#64748b', fontSize: 36 }} />
                  </div>
                )}
              </div>
              <div style={{ padding: 16 }}>
                <h4 style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{getProductNameForVideo(video)}</h4>
                <div style={{ fontSize: 12, color: '#2563eb', marginBottom: 12 }}>
                  <i className="fas fa-link" style={{ marginRight: 4 }} />SKU: {video.productSku}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary" style={{ flex: 1, fontSize: 13 }} onClick={() => openEdit(video)}>
                    <i className="fas fa-edit" style={{ marginRight: 4 }} />Edit
                  </button>
                  <button
                    style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#dc2626', cursor: 'pointer', fontSize: 13 }}
                    onClick={() => handleDelete(video.id)}
                  >
                    <i className="fas fa-trash" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 32, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontWeight: 700, fontSize: 18 }}>{editingVideo ? 'Edit Video' : 'Upload Video'}</h3>
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
                          {skuLookup.price && <div style={{ fontSize: 12, color: '#166534' }}>₹{Number(skuLookup.price).toLocaleString()}</div>}
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
                      onClick={() => { setForm(p => ({ ...p, videoUrl: '', videoKey: '' })); }}
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
                        <span style={{ fontSize: 13, color: '#2563eb' }}>Uploading... {uploadProgress}%</span>
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
                  {saving ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }} />Saving...</> : editingVideo ? 'Save Changes' : 'Upload Video'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
