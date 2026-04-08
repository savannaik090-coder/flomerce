import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { getProducts } from '../../services/productService.js';
import { resolveImageUrl } from '../../utils/imageUrl.js';
import { formatPrice, getAdminCurrency } from '../../utils/priceFormatter.js';
import SectionToggle from './SectionToggle.jsx';
import SaveBar from './SaveBar.jsx';
import { getShopTheLookDefaults } from '../../defaults/index.js';
import { API_BASE } from '../../config.js';

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

export default function ShopTheLookEditor({ onSaved, onPreviewUpdate }) {
  const { siteConfig } = useContext(SiteContext);
  const [title, setTitle] = useState('');
  const [mainImage, setMainImage] = useState('');
  const [mainImageKey, setMainImageKey] = useState('');
  const [dots, setDots] = useState([]);
  const [showSection, setShowSection] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [products, setProducts] = useState([]);
  const [skuSearch, setSkuSearch] = useState('');
  const [editDotIndex, setEditDotIndex] = useState(null);
  const [placingDot, setPlacingDot] = useState(false);
  const [error, setError] = useState('');
  const [usingDefaults, setUsingDefaults] = useState(false);

  const hasLoadedRef = useRef(false);
  const serverValuesRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageContainerRef = useRef(null);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const dragStartPosRef = useRef(null);

  useEffect(() => {
    if (siteConfig?.id) {
      loadSettings();
      loadProducts();
    }
  }, [siteConfig?.id]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    const current = JSON.stringify({ title, mainImage, mainImageKey, dots, showSection });
    setHasChanges(current !== serverValuesRef.current);
    if (onPreviewUpdate) {
      onPreviewUpdate({
        shopTheLook: { title, image: mainImage, imageKey: mainImageKey, dots },
        showShopTheLook: showSection,
      });
    }
  }, [title, mainImage, mainImageKey, dots, showSection]);

  async function loadProducts() {
    try {
      const res = await getProducts(siteConfig.id, { limit: 500 });
      setProducts(res.data || res.products || []);
    } catch (e) {
      console.error('Failed to load products:', e);
    }
  }

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
        const config = settings.shopTheLook || {};
        const hasSavedData = config.title || config.image || (config.dots && config.dots.length > 0);
        if (hasSavedData) {
          setTitle(config.title || '');
          setMainImage(config.image || '');
          setMainImageKey(config.imageKey || '');
          setDots(config.dots || []);
          setUsingDefaults(false);
        } else {
          const category = siteConfig?.category || 'generic';
          const defaults = getShopTheLookDefaults(category);
          setTitle(defaults.title || 'Shop the Look');
          setMainImage(defaults.image || '');
          setMainImageKey('');
          setDots(defaults.dots || []);
          setUsingDefaults(true);
        }
        const sv = settings.showShopTheLook !== false;
        setShowSection(sv);
        serverValuesRef.current = JSON.stringify({
          title: config.title || '',
          mainImage: config.image || '',
          mainImageKey: config.imageKey || '',
          dots: config.dots || [],
          showSection: sv,
        });
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    } finally {
      setLoading(false);
      hasLoadedRef.current = true;
    }
  }

  async function handleImageUpload(file) {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setError('Please upload a JPG, PNG, WebP, or GIF image.');
      return;
    }
    const oldImage = mainImage;
    setUploading(true);
    setError('');
    try {
      const blob = await compressImage(file);
      const formData = new FormData();
      formData.append('images', blob, 'shop-the-look.jpg');
      const token = sessionStorage.getItem('site_admin_token');
      const response = await fetch(`${API_BASE}/api/upload/image?siteId=${siteConfig.id}`, {
        method: 'POST',
        headers: { 'Authorization': token ? `SiteAdmin ${token}` : '' },
        body: formData,
      });
      const result = await response.json();
      if (result.success && result.data?.images?.[0]) {
        setMainImage(result.data.images[0].url);
        setMainImageKey(result.data.images[0].key || '');
        if (oldImage) {
          import('../../services/api.js').then(({ deleteMediaFromR2 }) => {
            deleteMediaFromR2(siteConfig.id, oldImage);
          });
        }
      } else {
        setError(result.error || 'Failed to upload image');
      }
    } catch (e) {
      setError('Failed to upload image: ' + e.message);
    } finally {
      setUploading(false);
    }
  }

  function handleImageClick(e) {
    if (!placingDot || !imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setDots(prev => [...prev, { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, sku: '' }]);
    setPlacingDot(false);
    setEditDotIndex(dots.length);
  }

  function handleDotPointerDown(e, index) {
    if (placingDot) return;
    e.stopPropagation();
    e.target.setPointerCapture(e.pointerId);
    dragStartPosRef.current = { x: e.clientX, y: e.clientY, moved: false };
    setDraggingIndex(index);
  }

  function handleDotPointerMove(e, index) {
    if (draggingIndex !== index || !imageContainerRef.current || !dragStartPosRef.current) return;
    const dx = Math.abs(e.clientX - dragStartPosRef.current.x);
    const dy = Math.abs(e.clientY - dragStartPosRef.current.y);
    if (!dragStartPosRef.current.moved && dx < 3 && dy < 3) return;
    dragStartPosRef.current.moved = true;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const nx = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const ny = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    const rx = Math.round(nx * 10) / 10;
    const ry = Math.round(ny * 10) / 10;
    setDots(prev => prev.map((d, i) => i === index ? { ...d, x: rx, y: ry } : d));
  }

  function handleDotPointerUp(e, index) {
    if (draggingIndex !== index) return;
    if (dragStartPosRef.current && !dragStartPosRef.current.moved) {
      setEditDotIndex(index);
    }
    setDraggingIndex(null);
    dragStartPosRef.current = null;
  }

  function updateDot(index, field, value) {
    setDots(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
  }

  function removeDot(index) {
    setDots(prev => prev.filter((_, i) => i !== index));
    if (editDotIndex === index) setEditDotIndex(null);
    else if (editDotIndex !== null && editDotIndex > index) setEditDotIndex(editDotIndex - 1);
  }

  function findProductBySku(sku) {
    if (!sku || !products.length) return null;
    return products.find(p => p.sku === sku || p.id === sku) || null;
  }

  function getProductImage(product) {
    if (!product) return '';
    let imgs = product.images;
    if (typeof imgs === 'string') { try { imgs = JSON.parse(imgs); } catch(e) { imgs = []; } }
    const raw = Array.isArray(imgs) ? (typeof imgs[0] === 'string' ? imgs[0] : imgs[0]?.url) : null;
    return resolveImageUrl(raw || product.thumbnail_url || product.image_url || product.image || '');
  }

  async function handleSave() {
    setSaving(true);
    setError('');
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
            shopTheLook: { title, image: mainImage, imageKey: mainImageKey, dots },
            showShopTheLook: showSection,
          },
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        serverValuesRef.current = JSON.stringify({ title, mainImage, mainImageKey, dots, showSection });
        setHasChanges(false);
        setUsingDefaults(false);
        if (onSaved) onSaved();
      } else {
        setError(result.error || 'Failed to save');
      }
    } catch (e) {
      setError('Failed to save: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  const currency = getAdminCurrency(siteConfig);
  const filteredProducts = skuSearch.trim()
    ? products.filter(p =>
        (p.sku && p.sku.toLowerCase().includes(skuSearch.toLowerCase())) ||
        (p.name && p.name.toLowerCase().includes(skuSearch.toLowerCase()))
      ).slice(0, 8)
    : [];

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>;
  }

  return (
    <div>
      <SaveBar topBar saving={saving} hasChanges={hasChanges} onSave={handleSave} />
      <SectionToggle
        enabled={showSection}
        onChange={v => setShowSection(v)}
        label="Show Shop the Look"
        description="Display interactive product showcase on homepage"
      />

      {usingDefaults && (
        <div style={{
          background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8,
          padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400e',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <i className="fas fa-info-circle" />
          Showing default placeholder content. Upload your own image and assign products, then save to make it live.
        </div>
      )}

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#dc2626', fontSize: 13 }}>
          <i className="fas fa-exclamation-circle" style={{ marginRight: 6 }} />{error}
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fas fa-heading" style={{ color: '#2563eb', fontSize: 14 }} />
          Section Title
        </h3>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g., Shop the Look"
          style={{
            width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8,
            fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fas fa-image" style={{ color: '#2563eb', fontSize: 14 }} />
          Main Image
        </h3>
        <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
          Upload the look/collection image. Click "Place a Dot" to add markers, then drag any dot to reposition it.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => { if (e.target.files[0]) handleImageUpload(e.target.files[0]); e.target.value = ''; }}
        />

        {mainImage ? (
          <div style={{ position: 'relative' }}>
            <div
              ref={imageContainerRef}
              style={{
                position: 'relative',
                borderRadius: 8,
                overflow: 'hidden',
                cursor: placingDot ? 'crosshair' : 'default',
                border: placingDot ? '2px dashed #2563eb' : '1px solid #e2e8f0',
              }}
              onClick={handleImageClick}
            >
              <img
                src={resolveImageUrl(mainImage)}
                alt="Shop the Look"
                draggable="false"
                onDragStart={e => e.preventDefault()}
                style={{ width: '100%', height: 'auto', display: 'block', userSelect: 'none' }}
              />
              {dots.map((dot, i) => (
                <div
                  key={i}
                  onPointerDown={e => handleDotPointerDown(e, i)}
                  onPointerMove={e => handleDotPointerMove(e, i)}
                  onPointerUp={e => handleDotPointerUp(e, i)}
                  onPointerCancel={() => { setDraggingIndex(null); dragStartPosRef.current = null; }}
                  style={{
                    position: 'absolute',
                    left: `${dot.x}%`,
                    top: `${dot.y}%`,
                    width: 30,
                    height: 30,
                    marginLeft: -15,
                    marginTop: -15,
                    borderRadius: '50%',
                    background: draggingIndex === i ? '#1d4ed8' : (editDotIndex === i ? '#2563eb' : 'rgba(255,255,255,0.9)'),
                    border: `2px solid ${editDotIndex === i || draggingIndex === i ? '#2563eb' : '#5a3f2a'}`,
                    cursor: placingDot ? 'crosshair' : (draggingIndex === i ? 'grabbing' : 'grab'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    color: editDotIndex === i || draggingIndex === i ? '#fff' : '#5a3f2a',
                    boxShadow: draggingIndex === i ? '0 4px 12px rgba(0,0,0,0.35)' : '0 2px 8px rgba(0,0,0,0.25)',
                    zIndex: draggingIndex === i ? 20 : (editDotIndex === i ? 10 : 5),
                    userSelect: 'none',
                    touchAction: 'none',
                  }}
                >
                  {i + 1}
                </div>
              ))}
              {placingDot && (
                <div style={{
                  position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
                  background: '#2563eb', color: '#fff', padding: '6px 14px', borderRadius: 6,
                  fontSize: 12, fontWeight: 600, zIndex: 20,
                  boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                }}>
                  Click on the image to place a dot
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{
                  padding: '8px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0',
                  borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
                }}
              >
                <i className="fas fa-sync-alt" /> {uploading ? 'Uploading...' : 'Change Image'}
              </button>
              <button
                type="button"
                onClick={() => setPlacingDot(!placingDot)}
                style={{
                  padding: '8px 16px',
                  background: placingDot ? '#2563eb' : '#f1f5f9',
                  color: placingDot ? '#fff' : '#334155',
                  border: placingDot ? 'none' : '1px solid #e2e8f0',
                  borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
                }}
              >
                <i className="fas fa-map-marker-alt" /> {placingDot ? 'Cancel Placing' : 'Place a Dot'}
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            style={{
              border: '2px dashed #e2e8f0', borderRadius: 8, padding: 40,
              textAlign: 'center', cursor: 'pointer', background: '#fafafa',
            }}
          >
            {uploading ? (
              <div style={{ color: '#64748b' }}>
                <div className="spinner" style={{ margin: '0 auto 10px' }} />
                <span style={{ fontSize: 13 }}>Uploading...</span>
              </div>
            ) : (
              <div style={{ color: '#94a3b8' }}>
                <i className="fas fa-cloud-upload-alt" style={{ fontSize: 28, marginBottom: 8, display: 'block' }} />
                <span style={{ fontSize: 13, display: 'block' }}>Click to upload the look image</span>
                <span style={{ fontSize: 11, color: '#cbd5e1', marginTop: 4, display: 'block' }}>
                  JPG, PNG, WebP, GIF up to 10MB
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {dots.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fas fa-map-pin" style={{ color: '#2563eb', fontSize: 14 }} />
            Product Dots ({dots.length})
          </h3>
          <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
            Drag dots on the image to reposition them. Click a dot to select it and assign a product below.
          </p>

          {dots.map((dot, i) => {
            const matched = findProductBySku(dot.sku);
            return (
              <div
                key={i}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 8, padding: 14, marginBottom: 12,
                  background: '#fafafa',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: '#e2e8f0',
                      color: '#64748b',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700,
                    }}>
                      {i + 1}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>
                      Dot at ({dot.x}%, {dot.y}%)
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => removeDot(i)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 13 }}
                      title="Remove dot"
                    >
                      <i className="fas fa-trash-alt" />
                    </button>
                  </div>
                </div>

                {matched ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: 10, background: '#fff', borderRadius: 6, border: '1px solid #e2e8f0',
                  }}>
                    {getProductImage(matched) && (
                      <img src={getProductImage(matched)} alt={matched.name} style={{
                        width: 44, height: 44, borderRadius: 6, objectFit: 'cover', flexShrink: 0,
                      }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {matched.name}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        SKU: {matched.sku || dot.sku} · {formatPrice(matched.price, currency)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateDot(i, 'sku', '')}
                      style={{
                        padding: '4px 10px', background: '#fef2f2', border: '1px solid #fecaca',
                        borderRadius: 4, fontSize: 11, color: '#dc2626', cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={dot.sku}
                      onChange={e => { updateDot(i, 'sku', e.target.value); setSkuSearch(e.target.value); }}
                      placeholder="Enter product SKU or search by name..."
                      style={{
                        width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6,
                        fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box',
                      }}
                    />
                    {dot.sku && !matched && findProductBySku(dot.sku) === null && dot.sku.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        {(skuSearch.trim() ? filteredProducts : []).map(p => (
                          <div
                            key={p.id}
                            onClick={() => { updateDot(i, 'sku', p.sku || p.id); setSkuSearch(''); }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: '8px 10px', cursor: 'pointer', borderRadius: 4,
                              border: '1px solid #e2e8f0', marginBottom: 4, background: '#fff',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                          >
                            {getProductImage(p) && (
                              <img src={getProductImage(p)} alt={p.name} style={{
                                width: 32, height: 32, borderRadius: 4, objectFit: 'cover',
                              }} />
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 500, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {p.name}
                              </div>
                              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                {p.sku || p.id} · {formatPrice(p.price, currency)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ marginTop: 10, display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>X Position (%)</label>
                    <input
                      type="number"
                      min="0" max="100" step="0.5"
                      value={dot.x}
                      onChange={e => updateDot(i, 'x', parseFloat(e.target.value) || 0)}
                      style={{
                        width: '100%', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6,
                        fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Y Position (%)</label>
                    <input
                      type="number"
                      min="0" max="100" step="0.5"
                      value={dot.y}
                      onChange={e => updateDot(i, 'y', parseFloat(e.target.value) || 0)}
                      style={{
                        width: '100%', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6,
                        fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SaveBar saving={saving} hasChanges={hasChanges} onSave={handleSave} />
    </div>
  );
}
