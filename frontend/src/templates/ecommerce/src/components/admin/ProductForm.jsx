import React, { useState, useEffect, useContext, useRef } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { createProduct, updateProduct } from '../../services/productService.js';
import { getCategories } from '../../services/categoryService.js';
import { getApiUrl } from '../../services/api.js';

const DEFAULT_FORM = {
  name: '',
  price: '',
  stock: '',
  category_id: '',
  description: '',
  images: [],
  mainImageIndex: 0,
};

function compressImageToBlob(file, quality = 0.8, maxWidth = 1200) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => {
        resolve(blob);
      }, 'image/jpeg', quality);
    };
    img.src = url;
  });
}

async function uploadImagesToR2(files, siteId, quality) {
  const formData = new FormData();
  for (const file of files) {
    const compressed = await compressImageToBlob(file, quality);
    formData.append('images', compressed, file.name || 'image.jpg');
  }

  const adminToken = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('site_admin_token') : null;
  const headers = {};
  if (adminToken) {
    headers['Authorization'] = `SiteAdmin ${adminToken}`;
  }

  const response = await fetch(getApiUrl(`/api/upload/image?siteId=${siteId}`), {
    method: 'POST',
    body: formData,
    headers,
    mode: 'cors',
    credentials: 'omit',
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Upload failed');
  }

  const result = await response.json();
  const data = result.data || result;
  const images = data.images || [];
  const errors = images.filter(img => img.error).map(img => img.error);
  const urls = images.filter(img => img.url).map(img => img.url);
  if (urls.length === 0 && errors.length > 0) {
    throw new Error(errors.join(', '));
  }
  return urls;
}

export default function ProductForm({ product, onSave, onCancel }) {
  const { siteConfig } = useContext(SiteContext);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [imageQuality, setImageQuality] = useState(0.8);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const isEdit = !!product;

  useEffect(() => {
    if (siteConfig?.id) loadCategories();
  }, [siteConfig?.id]);

  useEffect(() => {
    if (product) {
      let imgs = [];
      if (product.images) {
        imgs = Array.isArray(product.images) ? product.images : JSON.parse(product.images || '[]');
      }
      setForm({
        name: product.name || '',
        price: product.price || '',
        stock: product.stock ?? '',
        category_id: product.category_id || '',
        description: product.description || '',
        images: imgs,
        mainImageIndex: product.main_image_index || 0,
      });
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [product]);

  async function loadCategories() {
    try {
      const res = await getCategories(siteConfig.id);
      setCategories(res.data || res.categories || []);
    } catch {}
  }

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Product name is required.';
    if (!form.price || parseFloat(form.price) < 1) errs.price = 'Price must be at least ₹1.';
    if (form.stock === '' || parseInt(form.stock) < 0) errs.stock = 'Stock quantity is required.';
    if (!form.category_id) errs.category_id = 'Please select a category.';
    if (!form.description.trim()) errs.description = 'Description is required.';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    setErrors({});
    try {
      const payload = {
        siteId: siteConfig.id,
        name: form.name.trim(),
        price: parseFloat(form.price),
        stock: parseInt(form.stock),
        categoryId: form.category_id,
        description: form.description.trim(),
        images: form.images,
        mainImageIndex: form.mainImageIndex,
      };
      if (isEdit) {
        await updateProduct(product.id, payload);
      } else {
        await createProduct(payload);
      }
      onSave && onSave();
    } catch (err) {
      setErrors({ submit: 'Failed to save product: ' + err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleFilesSelected(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    setErrors(prev => ({ ...prev, upload: undefined }));
    try {
      const urls = await uploadImagesToR2(files, siteConfig.id, imageQuality);
      setForm(prev => ({ ...prev, images: [...prev.images, ...urls] }));
    } catch (err) {
      setErrors(prev => ({ ...prev, upload: 'Upload failed: ' + err.message }));
    } finally {
      setUploading(false);
    }
    e.target.value = '';
  }

  async function handleDrop(e) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    setUploading(true);
    setErrors(prev => ({ ...prev, upload: undefined }));
    try {
      const urls = await uploadImagesToR2(files, siteConfig.id, imageQuality);
      setForm(prev => ({ ...prev, images: [...prev.images, ...urls] }));
    } catch (err) {
      setErrors(prev => ({ ...prev, upload: 'Upload failed: ' + err.message }));
    } finally {
      setUploading(false);
    }
  }

  function removeImage(idx) {
    setForm(prev => {
      const imgs = prev.images.filter((_, i) => i !== idx);
      return { ...prev, images: imgs, mainImageIndex: Math.min(prev.mainImageIndex, imgs.length - 1) };
    });
  }

  function moveImage(idx, dir) {
    setForm(prev => {
      const imgs = [...prev.images];
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= imgs.length) return prev;
      [imgs[idx], imgs[newIdx]] = [imgs[newIdx], imgs[idx]];
      return {
        ...prev,
        images: imgs,
        mainImageIndex: prev.mainImageIndex === idx ? newIdx : prev.mainImageIndex === newIdx ? idx : prev.mainImageIndex,
      };
    });
  }

  function getImageSrc(img) {
    if (img.startsWith('data:') || img.startsWith('http://') || img.startsWith('https://')) {
      return img;
    }
    return getApiUrl(img);
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '6px 0', fontSize: 14 }}>
          <i className="fas fa-arrow-left" style={{ marginRight: 8 }} />Back
        </button>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>{isEdit ? 'Edit Product' : 'Add New Product'}</h2>
      </div>

      {errors.submit && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: '#dc2626', marginBottom: 20, fontSize: 14 }}>
          {errors.submit}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h3 className="card-title">Basic Information</h3></div>
          <div className="card-content">
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Product Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Gold Diamond Necklace"
                style={{ width: '100%', padding: '10px 12px', border: `1px solid ${errors.name ? '#ef4444' : '#e2e8f0'}`, borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
              />
              {errors.name && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.name}</p>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Price (₹) *</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={form.price}
                  onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                  placeholder="0.00"
                  style={{ width: '100%', padding: '10px 12px', border: `1px solid ${errors.price ? '#ef4444' : '#e2e8f0'}`, borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
                />
                {errors.price && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.price}</p>}
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Stock Quantity *</label>
                <input
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={e => setForm(p => ({ ...p, stock: e.target.value }))}
                  placeholder="0"
                  style={{ width: '100%', padding: '10px 12px', border: `1px solid ${errors.stock ? '#ef4444' : '#e2e8f0'}`, borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
                />
                {errors.stock && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.stock}</p>}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Category *</label>
              <select
                value={form.category_id}
                onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', border: `1px solid ${errors.category_id ? '#ef4444' : '#e2e8f0'}`, borderRadius: 6, fontSize: 14, background: 'white', boxSizing: 'border-box' }}
              >
                <option value="">Select a category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.category_id && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.category_id}</p>}
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Description *</label>
              <textarea
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Describe the product..."
                rows={5}
                style={{ width: '100%', padding: '10px 12px', border: `1px solid ${errors.description ? '#ef4444' : '#e2e8f0'}`, borderRadius: 6, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
              />
              {errors.description && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.description}</p>}
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title">Product Images</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <label style={{ color: '#64748b' }}>Quality:</label>
              <input
                type="range"
                min="0.3"
                max="1"
                step="0.1"
                value={imageQuality}
                onChange={e => setImageQuality(parseFloat(e.target.value))}
                style={{ width: 80 }}
              />
              <span style={{ color: '#64748b', minWidth: 30 }}>{Math.round(imageQuality * 100)}%</span>
            </div>
          </div>
          <div className="card-content">
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => !uploading && fileInputRef.current?.click()}
              style={{
                border: '2px dashed #e2e8f0',
                borderRadius: 8,
                padding: 32,
                textAlign: 'center',
                cursor: uploading ? 'not-allowed' : 'pointer',
                background: '#f8fafc',
                transition: 'border-color 0.2s',
                marginBottom: 16,
                opacity: uploading ? 0.7 : 1,
              }}
            >
              {uploading ? (
                <><i className="fas fa-spinner fa-spin" style={{ fontSize: 24, color: '#2563eb', marginBottom: 8 }} /><p style={{ color: '#2563eb', fontSize: 14 }}>Uploading images...</p></>
              ) : (
                <>
                  <i className="fas fa-cloud-upload-alt" style={{ fontSize: 32, color: '#94a3b8', marginBottom: 12 }} />
                  <p style={{ color: '#64748b', fontSize: 14 }}>Drop images here or click to upload</p>
                  <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>Supports JPG, PNG, WebP — compressed & uploaded to cloud storage</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFilesSelected}
              style={{ display: 'none' }}
            />

            {errors.upload && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', marginBottom: 12, fontSize: 13 }}>
                {errors.upload}
              </div>
            )}

            {form.images.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
                {form.images.map((img, idx) => (
                  <div key={idx} style={{ position: 'relative', border: `2px solid ${form.mainImageIndex === idx ? '#2563eb' : '#e2e8f0'}`, borderRadius: 8, overflow: 'hidden' }}>
                    <img src={getImageSrc(img)} alt={`Product ${idx + 1}`} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                    {form.mainImageIndex === idx && (
                      <div style={{ position: 'absolute', top: 4, left: 4, background: '#2563eb', color: 'white', fontSize: 10, padding: '2px 6px', borderRadius: 4 }}>Main</div>
                    )}
                    <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 2 }}>
                      <button type="button" onClick={() => setForm(p => ({ ...p, mainImageIndex: idx }))} title="Set as main" style={{ width: 22, height: 22, borderRadius: 4, background: 'white', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="fas fa-star" style={{ color: form.mainImageIndex === idx ? '#f59e0b' : '#94a3b8' }} />
                      </button>
                      <button type="button" onClick={() => removeImage(idx)} title="Remove" style={{ width: 22, height: 22, borderRadius: 4, background: 'white', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="fas fa-times" style={{ color: '#ef4444' }} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 2, padding: '4px 2px', background: '#f8fafc' }}>
                      <button type="button" onClick={() => moveImage(idx, -1)} disabled={idx === 0} style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'not-allowed' : 'pointer', fontSize: 12, color: idx === 0 ? '#cbd5e1' : '#64748b', padding: '0 4px' }}>
                        <i className="fas fa-chevron-left" />
                      </button>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{idx + 1}</span>
                      <button type="button" onClick={() => moveImage(idx, 1)} disabled={idx === form.images.length - 1} style={{ background: 'none', border: 'none', cursor: idx === form.images.length - 1 ? 'not-allowed' : 'pointer', fontSize: 12, color: idx === form.images.length - 1 ? '#cbd5e1' : '#64748b', padding: '0 4px' }}>
                        <i className="fas fa-chevron-right" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel} style={{ flex: 1 }}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving || uploading} style={{ flex: 2 }}>
            {saving ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }} />Saving...</> : isEdit ? 'Save Changes' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  );
}
