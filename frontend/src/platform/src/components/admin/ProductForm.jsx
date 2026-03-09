import { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../../services/api.js';

const DEFAULT_FORM = {
  name: '',
  price: '',
  stock: '',
  category_id: '',
  description: '',
  images: [],
  mainImageIndex: 0,
};

function compressImage(file, quality = 0.8, maxWidth = 1200) {
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
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      }, 'image/jpeg', quality);
    };
    img.src = url;
  });
}

export default function ProductForm({ site, product, onSave, onCancel }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [imageQuality, setImageQuality] = useState(0.8);
  const [compressing, setCompressing] = useState(false);
  const fileInputRef = useRef(null);

  const isEdit = !!product;

  useEffect(() => {
    if (site?.id) loadCategories();
  }, [site?.id]);

  useEffect(() => {
    if (product) {
      const imgs = product.images
        ? (Array.isArray(product.images) ? product.images : JSON.parse(product.images || '[]'))
        : [];
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
      const res = await apiRequest(`/api/categories?siteId=${site.id}`);
      setCategories(res.data || res.categories || []);
    } catch {}
  }

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Product name is required.';
    if (!form.price || parseFloat(form.price) < 1) errs.price = 'Price must be at least \u20B91.';
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
        siteId: site.id,
        name: form.name.trim(),
        price: parseFloat(form.price),
        stock: parseInt(form.stock),
        categoryId: form.category_id,
        description: form.description.trim(),
        images: form.images,
        mainImageIndex: form.mainImageIndex,
      };
      if (isEdit) {
        await apiRequest(`/api/products/${product.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/api/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
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
    setCompressing(true);
    try {
      const compressed = await Promise.all(files.map(f => compressImage(f, imageQuality)));
      setForm(prev => ({ ...prev, images: [...prev.images, ...compressed] }));
    } finally {
      setCompressing(false);
    }
    e.target.value = '';
  }

  function handleDrop(e) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    setCompressing(true);
    Promise.all(files.map(f => compressImage(f, imageQuality))).then(compressed => {
      setForm(prev => ({ ...prev, images: [...prev.images, ...compressed] }));
      setCompressing(false);
    });
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

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '6px 0', fontSize: 14, fontFamily: 'inherit' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8, verticalAlign: 'middle' }}><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          Back
        </button>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>{isEdit ? 'Edit Product' : 'Add New Product'}</h2>
      </div>

      {errors.submit && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: '#dc2626', marginBottom: 20, fontSize: 14 }}>
          {errors.submit}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="sa-card" style={{ marginBottom: 20 }}>
          <div className="sa-card-header"><h3 className="sa-card-title">Basic Information</h3></div>
          <div className="sa-card-content">
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Product Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Gold Diamond Necklace"
                style={{ width: '100%', padding: '10px 12px', border: `1px solid ${errors.name ? '#ef4444' : '#e2e8f0'}`, borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
              {errors.name && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.name}</p>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Price ({'\u20B9'}) *</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={form.price}
                  onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                  placeholder="0.00"
                  style={{ width: '100%', padding: '10px 12px', border: `1px solid ${errors.price ? '#ef4444' : '#e2e8f0'}`, borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
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
                  style={{ width: '100%', padding: '10px 12px', border: `1px solid ${errors.stock ? '#ef4444' : '#e2e8f0'}`, borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
                {errors.stock && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.stock}</p>}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Category *</label>
              <select
                value={form.category_id}
                onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', border: `1px solid ${errors.category_id ? '#ef4444' : '#e2e8f0'}`, borderRadius: 6, fontSize: 14, background: 'white', boxSizing: 'border-box', fontFamily: 'inherit' }}
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

        <div className="sa-card" style={{ marginBottom: 20 }}>
          <div className="sa-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="sa-card-title">Product Images</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <label style={{ color: '#64748b' }}>Quality:</label>
              <input type="range" min="0.3" max="1" step="0.1" value={imageQuality} onChange={e => setImageQuality(parseFloat(e.target.value))} style={{ width: 80 }} />
              <span style={{ color: '#64748b', minWidth: 30 }}>{Math.round(imageQuality * 100)}%</span>
            </div>
          </div>
          <div className="sa-card-content">
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              style={{ border: '2px dashed #e2e8f0', borderRadius: 8, padding: 32, textAlign: 'center', cursor: 'pointer', background: '#f8fafc', transition: 'border-color 0.2s', marginBottom: 16 }}
            >
              {compressing ? (
                <p style={{ color: '#2563eb', fontSize: 14 }}>Compressing images...</p>
              ) : (
                <>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" style={{ marginBottom: 12 }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <p style={{ color: '#64748b', fontSize: 14 }}>Drop images here or click to upload</p>
                  <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>Supports JPG, PNG, WebP</p>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFilesSelected} style={{ display: 'none' }} />

            {form.images.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
                {form.images.map((img, idx) => (
                  <div key={idx} style={{ position: 'relative', border: `2px solid ${form.mainImageIndex === idx ? '#2563eb' : '#e2e8f0'}`, borderRadius: 8, overflow: 'hidden' }}>
                    <img src={img} alt={`Product ${idx + 1}`} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                    {form.mainImageIndex === idx && (
                      <div style={{ position: 'absolute', top: 4, left: 4, background: '#2563eb', color: 'white', fontSize: 10, padding: '2px 6px', borderRadius: 4 }}>Main</div>
                    )}
                    <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 2 }}>
                      <button type="button" onClick={() => setForm(p => ({ ...p, mainImageIndex: idx }))} title="Set as main" style={{ width: 22, height: 22, borderRadius: 4, background: 'white', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: form.mainImageIndex === idx ? '#f59e0b' : '#94a3b8' }}>&#9733;</span>
                      </button>
                      <button type="button" onClick={() => removeImage(idx)} title="Remove" style={{ width: 22, height: 22, borderRadius: 4, background: 'white', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                        &#10005;
                      </button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 2, padding: '4px 2px', background: '#f8fafc' }}>
                      <button type="button" onClick={() => moveImage(idx, -1)} disabled={idx === 0} style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'not-allowed' : 'pointer', fontSize: 12, color: idx === 0 ? '#cbd5e1' : '#64748b', padding: '0 4px' }}>&#9664;</button>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{idx + 1}</span>
                      <button type="button" onClick={() => moveImage(idx, 1)} disabled={idx === form.images.length - 1} style={{ background: 'none', border: 'none', cursor: idx === form.images.length - 1 ? 'not-allowed' : 'pointer', fontSize: 12, color: idx === form.images.length - 1 ? '#cbd5e1' : '#64748b', padding: '0 4px' }}>&#9654;</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="button" className="btn btn-outline" onClick={onCancel} style={{ flex: 1 }}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2 }}>
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  );
}
