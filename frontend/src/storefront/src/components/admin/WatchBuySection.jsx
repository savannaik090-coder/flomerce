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
import { useDirtyTracker } from '../../hooks/useDirtyTracker.js';
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
  const [form, setForm] = useState({ productSku: '', productId: '', videoUrl: '', videoKey: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [showSection, setShowSection] = useState(true);
  // Product picker state. `pickerOpen` controls dropdown visibility,
  // `pickerQuery` is the live search string, `pickerHighlight` is the
  // keyboard-highlighted result index.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerHighlight, setPickerHighlight] = useState(0);
  const pickerRef = useRef(null);
  const pickerInputRef = useRef(null);
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
  const { markUploaded, markForDeletion, commit } = usePendingMedia(siteConfig?.id);

  const dirty = useDirtyTracker({
    videos, showSection,
    wbHeadingColor, wbHeadingFont, wbDividerColor, wbCardBorder,
  });

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
        // Treat only entries with an actual videoUrl as "real" content.
        // Older sites may have persisted placeholder default entries
        // (no videoUrl) before the no-mix fix landed; filtering here
        // drops them so defaults can never appear alongside uploads.
        const realSaved = savedVideos.filter(v => v && v.videoUrl);
        if (realSaved.length > 0) {
          setVideos(realSaved);
          setUsingDefaults(false);
        } else {
          const category = siteConfig?.category || 'generic';
          setVideos(getWatchAndBuyDefaults(category));
          setUsingDefaults(true);
        }
        const val = settings.showWatchAndBuy !== false;
        setShowSection(val);
        setWbHeadingColor(settings.wbHeadingColor || '');
        setWbHeadingFont(settings.wbHeadingFont || '');
        setWbDividerColor(settings.wbDividerColor || '');
        setWbCardBorder(settings.wbCardBorder || '');
        const baselineVideos = realSaved.length > 0
          ? realSaved
          : getWatchAndBuyDefaults(siteConfig?.category || 'generic');
        dirty.baseline({
          videos: baselineVideos,
          showSection: val,
          wbHeadingColor: settings.wbHeadingColor || '',
          wbHeadingFont: settings.wbHeadingFont || '',
          wbDividerColor: settings.wbDividerColor || '',
          wbCardBorder: settings.wbCardBorder || '',
        });
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
  }

  function findProductBySku(sku) {
    if (!sku || !products.length) return null;
    return products.find(p => p.sku === sku || p.id === sku) || null;
  }

  function findProductById(id) {
    if (!id || !products.length) return null;
    return products.find(p => p.id === id) || null;
  }

  // Resolve the linked product for the modal form. Prefer matching by the
  // stored productId (stable across SKU edits), then fall back to SKU.
  function resolveLinkedProduct() {
    return findProductById(form.productId) || findProductBySku(form.productSku);
  }

  function selectProduct(product) {
    setForm(p => ({ ...p, productSku: product.sku || product.id || '', productId: product.id || '' }));
    setPickerOpen(false);
    setPickerQuery('');
    setPickerHighlight(0);
  }

  function clearProduct() {
    setForm(p => ({ ...p, productSku: '', productId: '' }));
    setPickerOpen(true);
    setPickerQuery('');
    setPickerHighlight(0);
    setTimeout(() => pickerInputRef.current?.focus(), 0);
  }

  // Filter products by case-insensitive name/SKU match, capped at 10.
  function getPickerResults() {
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return products.slice(0, 10);
    return products
      .filter(p => (p.name || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q))
      .slice(0, 10);
  }

  // Close the picker dropdown when the user clicks outside it.
  useEffect(() => {
    if (!pickerOpen) return;
    function onDocClick(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [pickerOpen]);

  function openAdd() {
    setEditingVideo(null);
    setForm({ productSku: '', productId: '', videoUrl: '', videoKey: '' });
    setPickerOpen(false);
    setPickerQuery('');
    setPickerHighlight(0);
    setError('');
    setShowModal(true);
  }

  function openEdit(video) {
    setEditingVideo(video);
    setForm({
      productSku: video.productSku || '',
      productId: video.productId || '',
      videoUrl: video.videoUrl || '',
      videoKey: video.videoKey || '',
    });
    setPickerOpen(false);
    setPickerQuery('');
    setPickerHighlight(0);
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

  async function handleSaveAll() {
    setSaving(true);
    try {
      const token = sessionStorage.getItem('site_admin_token');
      // Never persist placeholder defaults (no videoUrl). When the
      // editor is still showing defaults (usingDefaults), save an empty
      // array so the storefront falls back to defaults; otherwise save
      // only the merchant's real entries so storage can never end up in
      // a "mixed" state where defaults sit alongside uploads.
      const videosToPersist = usingDefaults ? [] : videos.filter(v => v && v.videoUrl);
      const response = await fetch(`${API_BASE}/api/sites/${siteConfig.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `SiteAdmin ${token}` : '',
        },
        body: JSON.stringify({ settings: { watchAndBuyVideos: videosToPersist, showWatchAndBuy: showSection, wbHeadingColor, wbHeadingFont, wbDividerColor, wbCardBorder } }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        // Sync local videos state to what we actually persisted so the
        // dirty tracker baseline (captured in markSaved) matches; if we
        // saved defaults-as-empty, leave the displayed defaults alone.
        const newVideosState = usingDefaults ? videos : videosToPersist;
        if (!usingDefaults) setVideos(videosToPersist);
        dirty.markSaved({
          videos: newVideosState,
          showSection,
          wbHeadingColor, wbHeadingFont, wbDividerColor, wbCardBorder,
        });
        const keepUrls = newVideosState.map(v => v.videoUrl).filter(Boolean);
        commit(keepUrls);
        if (onSaved) onSaved();
      }
    } catch (e) {
      console.error('Failed to save:', e);
    } finally {
      setSaving(false);
    }
  }

  // Modal "Save" stages the change locally; the PUT happens only when the
  // merchant clicks the global Save bar (handleSaveAll). Pending media files
  // (uploads/removals) stay tracked via usePendingMedia and are committed
  // after handleSaveAll succeeds.
  function handleSave(e) {
    e.preventDefault();
    if (!form.productSku.trim() && !form.productId) { setError("Please link a product."); return; }
    if (!form.videoUrl) { setError("Please upload a video."); return; }

    const productInfo = findProductById(form.productId) || findProductBySku(form.productSku.trim());
    const videoData = {
      id: editingVideo ? editingVideo.id : Date.now().toString(),
      productSku: form.productSku.trim(),
      productId: form.productId || productInfo?.id || '',
      videoUrl: form.videoUrl,
      videoKey: form.videoKey || '',
      title: productInfo?.name || form.productSku.trim(),
      createdAt: editingVideo ? editingVideo.createdAt : new Date().toISOString(),
    };

    let updatedVideos;
    if (editingVideo) {
      updatedVideos = usingDefaults ? [videoData] : videos.map(v => v.id === editingVideo.id ? videoData : v);
    } else {
      updatedVideos = usingDefaults ? [videoData] : [...videos, videoData];
    }

    setVideos(updatedVideos);
    setUsingDefaults(false);
    setError('');
    setShowModal(false);
  }

  function handleDelete(videoId) {
    setConfirmModal({
      title: "Delete Video",
      message: "Delete this video?",
      danger: true,
      onConfirm: () => {
        const deletedVideo = videos.find(v => v.id === videoId);
        const updatedVideos = videos.filter(v => v.id !== videoId);
        if (deletedVideo?.videoUrl) markForDeletion(deletedVideo.videoUrl);
        setVideos(updatedVideos);
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
      <SaveBar topBar saving={saving} hasChanges={dirty.hasChanges} onSave={handleSaveAll} />
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

      <SaveBar saving={saving} hasChanges={dirty.hasChanges} onSave={handleSaveAll} />
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
              <AdminColorField label="Heading Color" value={wbHeadingColor} fallback="#333333" onChange={setWbHeadingColor} />
              <AdminFontPicker label="Heading Font" value={wbHeadingFont} onChange={setWbHeadingFont} />
              <AdminColorField label="Divider Color" value={wbDividerColor} fallback="#d4af37" onChange={setWbDividerColor} />
              <AdminColorField label="Card Border Color" value={wbCardBorder} fallback="#d4af37" onChange={setWbCardBorder} />
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
              <div style={{ marginBottom: 16 }} ref={pickerRef}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Link Product *</label>
                {(() => {
                  const linked = resolveLinkedProduct();
                  // Selected product chip — shown when picker is closed
                  // and we have a valid linked product (matched by id or
                  // sku against the loaded products list).
                  if (linked && !pickerOpen) {
                    const img = linked.images?.[0]?.url || linked.thumbnail_url || linked.image_url || '';
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
                        {img ? (
                          <img src={img} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 40, height: 40, borderRadius: 6, background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <i className="fas fa-image" style={{ color: '#94a3b8' }} />
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: '#166534', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{linked.name}</div>
                          <div style={{ fontSize: 12, color: '#166534', display: 'flex', gap: 8 }}>
                            {linked.price ? <span>{formatPrice(Number(linked.price), getAdminCurrency(siteConfig))}</span> : null}
                            {linked.sku ? <span style={{ color: '#65a30d' }}>SKU: {linked.sku}</span> : null}
                          </div>
                        </div>
                        <button type="button" onClick={clearProduct} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4, fontSize: 14 }} aria-label="Unlink product">
                          <i className="fas fa-times" />
                        </button>
                      </div>
                    );
                  }
                  // Stale stored SKU (editing an old video whose product
                  // is gone): show the raw SKU plus a "Search to replace"
                  // affordance that opens the picker.
                  if (!linked && form.productSku.trim() && !pickerOpen) {
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#fffbeb', border: '1px solid #fed7aa', borderRadius: 8 }}>
                        <i className="fas fa-exclamation-triangle" style={{ color: '#92400e' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, color: '#92400e', fontSize: 13 }}>Stored SKU: {form.productSku}</div>
                          <div style={{ fontSize: 12, color: '#92400e' }}>This SKU no longer matches any product.</div>
                        </div>
                        <button type="button" onClick={() => { setPickerOpen(true); setPickerQuery(''); setPickerHighlight(0); setTimeout(() => pickerInputRef.current?.focus(), 0); }} style={{ background: '#fff', border: '1px solid #fed7aa', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, color: '#92400e', fontWeight: 600 }}>
                          Search to replace
                        </button>
                      </div>
                    );
                  }
                  // Search input + dropdown of matching products.
                  const results = getPickerResults();
                  return (
                    <div style={{ position: 'relative' }}>
                      <input
                        ref={pickerInputRef}
                        type="text"
                        placeholder="Search by product name or SKU..."
                        value={pickerQuery}
                        onChange={e => { setPickerQuery(e.target.value); setPickerOpen(true); setPickerHighlight(0); }}
                        onFocus={() => setPickerOpen(true)}
                        onKeyDown={e => {
                          if (e.key === 'ArrowDown') { e.preventDefault(); setPickerHighlight(i => results.length === 0 ? 0 : Math.min(i + 1, results.length - 1)); }
                          else if (e.key === 'ArrowUp') { e.preventDefault(); setPickerHighlight(i => Math.max(i - 1, 0)); }
                          else if (e.key === 'Enter') { e.preventDefault(); if (results[pickerHighlight]) selectProduct(results[pickerHighlight]); }
                          else if (e.key === 'Escape') { e.preventDefault(); setPickerOpen(false); }
                        }}
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
                      />
                      {pickerOpen && (
                        <div style={{ position: 'absolute', top: '100%', insetInlineStart: 0, insetInlineEnd: 0, marginTop: 4, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 320, overflowY: 'auto', zIndex: 10 }}>
                          {results.length === 0 ? (
                            <div style={{ padding: 16, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No products match</div>
                          ) : (
                            results.map((p, idx) => {
                              const img = p.images?.[0]?.url || p.thumbnail_url || p.image_url || '';
                              const isHi = idx === pickerHighlight;
                              return (
                                <div
                                  key={p.id}
                                  onMouseEnter={() => setPickerHighlight(idx)}
                                  onMouseDown={e => { e.preventDefault(); selectProduct(p); }}
                                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', background: isHi ? '#eff6ff' : 'transparent', borderBottom: '1px solid #f1f5f9' }}
                                >
                                  {img ? (
                                    <img src={img} alt="" style={{ width: 36, height: 36, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                                  ) : (
                                    <div style={{ width: 36, height: 36, borderRadius: 4, background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                      <i className="fas fa-image" style={{ color: '#94a3b8', fontSize: 12 }} />
                                    </div>
                                  )}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                                    <div style={{ fontSize: 11, color: '#64748b', display: 'flex', gap: 8 }}>
                                      {p.price ? <span>{formatPrice(Number(p.price), getAdminCurrency(siteConfig))}</span> : null}
                                      {p.sku ? <span>SKU: {p.sku}</span> : null}
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
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
