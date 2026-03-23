import React, { useState, useEffect, useContext, useRef } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { createProduct, updateProduct, getOptionsTemplate, saveOptionsTemplate } from '../../services/productService.js';
import { getCategories } from '../../services/categoryService.js';
import { getApiUrl } from '../../services/api.js';

const DEFAULT_FORM = {
  name: '',
  price: '',
  stock: '',
  category_id: '',
  subcategory_id: '',
  description: '',
  images: [],
  mainImageIndex: 0,
};

const DEFAULT_OPTIONS = {
  colors: [],
  imageColorMap: {},
  customOptions: [],
  pricedOptions: [],
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

function hasAnyOptions(opts) {
  if (!opts) return false;
  return (opts.colors && opts.colors.length > 0) ||
    (opts.customOptions && opts.customOptions.length > 0) ||
    (opts.pricedOptions && opts.pricedOptions.length > 0);
}

export default function ProductForm({ product, onSave, onCancel }) {
  const { siteConfig } = useContext(SiteContext);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [imageQuality, setImageQuality] = useState(0.8);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [showColors, setShowColors] = useState(false);
  const [showCustomOptions, setShowCustomOptions] = useState(false);
  const [showPricedOptions, setShowPricedOptions] = useState(false);

  const isEdit = !!product;

  useEffect(() => {
    if (siteConfig?.id) loadCategories();
  }, [siteConfig?.id]);

  useEffect(() => {
    if (form.category_id && categories.length > 0) {
      const selectedCat = categories.find(c => c.id === form.category_id);
      setSubcategories(selectedCat?.children || []);
    } else {
      setSubcategories([]);
      setForm(p => ({ ...p, subcategory_id: '' }));
    }
  }, [form.category_id, categories]);

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
        subcategory_id: product.subcategory_id || '',
        description: product.description || '',
        images: imgs,
        mainImageIndex: product.main_image_index || 0,
      });
      if (product.options && typeof product.options === 'object') {
        const opts = {
          colors: product.options.colors || [],
          imageColorMap: product.options.imageColorMap || {},
          customOptions: product.options.customOptions || [],
          pricedOptions: product.options.pricedOptions || [],
        };
        setOptions(opts);
        setShowColors(opts.colors.length > 0);
        setShowCustomOptions(opts.customOptions.length > 0);
        setShowPricedOptions(opts.pricedOptions.length > 0);
      } else {
        setOptions(DEFAULT_OPTIONS);
        setShowColors(false);
        setShowCustomOptions(false);
        setShowPricedOptions(false);
      }
    } else {
      setForm(DEFAULT_FORM);
      setOptions(DEFAULT_OPTIONS);
      setShowColors(false);
      setShowCustomOptions(false);
      setShowPricedOptions(false);
      if (siteConfig?.id) {
        getOptionsTemplate(siteConfig.id).then(res => {
          const tmpl = res?.template;
          if (tmpl) {
            const opts = {
              colors: tmpl.colors || [],
              imageColorMap: {},
              customOptions: tmpl.customOptions || [],
              pricedOptions: tmpl.pricedOptions || [],
            };
            setOptions(opts);
            setShowColors(opts.colors.length > 0);
            setShowCustomOptions(opts.customOptions.length > 0);
            setShowPricedOptions(opts.pricedOptions.length > 0);
          }
        }).catch(() => {});
      }
    }
  }, [product, siteConfig?.id]);

  async function loadCategories() {
    try {
      const res = await getCategories(siteConfig.id);
      setCategories(res.data || res.categories || []);
    } catch {}
  }

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Product name is required.';
    if (!form.price || parseFloat(form.price) < 1) errs.price = 'Price must be at least 1.';
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
      const effectiveOptions = {
        colors: showColors ? options.colors : [],
        imageColorMap: showColors ? options.imageColorMap : {},
        customOptions: showCustomOptions ? options.customOptions : [],
        pricedOptions: showPricedOptions ? options.pricedOptions : [],
      };
      const cleanedOptions = hasAnyOptions(effectiveOptions) ? {
        ...effectiveOptions,
        pricedOptions: effectiveOptions.pricedOptions.map(opt => ({
          ...opt,
          values: opt.values.map(v => ({ ...v, price: Number(v.price) || 0 })),
        })),
      } : null;
      const payload = {
        siteId: siteConfig.id,
        name: form.name.trim(),
        price: parseFloat(form.price),
        stock: parseInt(form.stock),
        categoryId: form.category_id,
        subcategoryId: form.subcategory_id || null,
        description: form.description.trim(),
        images: form.images,
        mainImageIndex: form.mainImageIndex,
        options: cleanedOptions,
      };
      if (isEdit) {
        await updateProduct(product.id, payload, siteConfig?.id);
      } else {
        await createProduct(payload);
      }
      if (siteConfig?.id) {
        saveOptionsTemplate(siteConfig.id, {
          colors: showColors ? options.colors : [],
          customOptions: showCustomOptions ? options.customOptions : [],
          pricedOptions: showPricedOptions ? options.pricedOptions : [],
        }).catch(() => {});
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
    setOptions(prev => {
      const newMap = { ...prev.imageColorMap };
      delete newMap[String(idx)];
      const remapped = {};
      for (const [k, v] of Object.entries(newMap)) {
        const ki = parseInt(k);
        if (ki > idx) remapped[String(ki - 1)] = v;
        else remapped[k] = v;
      }
      return { ...prev, imageColorMap: remapped };
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
    setOptions(prev => {
      const newIdx = idx + dir;
      const newMap = { ...prev.imageColorMap };
      const aColors = newMap[String(idx)];
      const bColors = newMap[String(newIdx)];
      if (aColors) newMap[String(newIdx)] = aColors;
      else delete newMap[String(newIdx)];
      if (bColors) newMap[String(idx)] = bColors;
      else delete newMap[String(idx)];
      return { ...prev, imageColorMap: newMap };
    });
  }

  function getImageSrc(img) {
    if (img.startsWith('data:') || img.startsWith('http://') || img.startsWith('https://')) {
      return img;
    }
    return getApiUrl(img);
  }

  const sectionCardStyle = { marginBottom: 20 };
  const sectionHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const addBtnStyle = { background: 'none', border: '1px dashed #94a3b8', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13, color: '#64748b', fontWeight: 500 };
  const removeBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 14, padding: '2px 6px' };
  const chipStyle = (active) => ({ display: 'inline-block', padding: '4px 10px', borderRadius: 20, border: `1px solid ${active ? '#2563eb' : '#e2e8f0'}`, background: active ? '#eff6ff' : '#f8fafc', cursor: 'pointer', fontSize: 12, fontWeight: active ? 600 : 400, color: active ? '#2563eb' : '#64748b', marginRight: 4, marginBottom: 4 });

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
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Price *</label>
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

            {form.category_id && subcategories.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Subcategory</label>
                <select
                  value={form.subcategory_id}
                  onChange={e => setForm(p => ({ ...p, subcategory_id: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, background: 'white', boxSizing: 'border-box' }}
                >
                  <option value="">None</option>
                  {subcategories.map(group => (
                    group.children && group.children.length > 0 ? (
                      <optgroup key={group.id} label={group.name}>
                        {group.children.map(val => (
                          <option key={val.id} value={val.id}>{val.name}</option>
                        ))}
                      </optgroup>
                    ) : (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    )
                  ))}
                </select>
                <p style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>Manage subcategory groups in the Categories section</p>
                {errors.subcategory && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.subcategory}</p>}
              </div>
            )}

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
                {form.images.map((img, idx) => {
                  const imgColors = options.imageColorMap[String(idx)] || [];
                  return (
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
                      {options.colors.length > 0 && (
                        <div style={{ padding: '4px 6px', background: '#f0f4ff', borderTop: '1px solid #e2e8f0' }}>
                          <select
                            value={imgColors[0] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setOptions(prev => {
                                const map = { ...prev.imageColorMap };
                                if (val) {
                                  map[String(idx)] = [val];
                                } else {
                                  delete map[String(idx)];
                                }
                                return { ...prev, imageColorMap: map };
                              });
                            }}
                            style={{ width: '100%', padding: '3px 4px', fontSize: 11, border: '1px solid #cbd5e1', borderRadius: 4, background: 'white', cursor: 'pointer' }}
                          >
                            <option value="">Assign Color</option>
                            {options.colors.filter(c => c.name).map(c => (
                              <option key={c.name} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="card" style={sectionCardStyle}>
          <div className="card-header" style={sectionHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ position: 'relative', display: 'inline-block', width: 40, height: 22, flexShrink: 0 }}>
                <input type="checkbox" checked={showColors} onChange={e => {
                  const checked = e.target.checked;
                  setShowColors(checked);
                  if (!checked) setOptions(prev => ({ ...prev, colors: [], imageColorMap: {} }));
                }} style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
                <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, background: showColors ? '#2563eb' : '#cbd5e1', borderRadius: 22, transition: 'background 0.2s' }}>
                  <span style={{ position: 'absolute', height: 16, width: 16, left: showColors ? 20 : 3, bottom: 3, background: 'white', borderRadius: '50%', transition: 'left 0.2s' }} />
                </span>
              </label>
              <h3 className="card-title" style={{ margin: 0 }}>Color Options</h3>
            </div>
            {showColors && (
              <button
                type="button"
                style={addBtnStyle}
                onClick={() => setOptions(prev => ({ ...prev, colors: [...prev.colors, { name: '', hex: '#000000' }] }))}
              >
                <i className="fas fa-plus" style={{ marginRight: 6 }} />Add Color
              </button>
            )}
          </div>
          {showColors && (
            <div className="card-content">
              {options.colors.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>No colors defined. Add colors to let customers filter images by color.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {options.colors.map((color, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="color"
                        value={color.hex || '#000000'}
                        onChange={e => {
                          const newColors = [...options.colors];
                          newColors[idx] = { ...newColors[idx], hex: e.target.value };
                          setOptions(prev => ({ ...prev, colors: newColors }));
                        }}
                        style={{ width: 36, height: 36, border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', padding: 2 }}
                      />
                      <input
                        type="text"
                        value={color.name}
                        onChange={e => {
                          const oldName = options.colors[idx].name;
                          const newName = e.target.value;
                          const newColors = [...options.colors];
                          newColors[idx] = { ...newColors[idx], name: newName };
                          const newMap = { ...options.imageColorMap };
                          for (const [k, v] of Object.entries(newMap)) {
                            newMap[k] = v.map(n => n === oldName ? newName : n);
                          }
                          setOptions(prev => ({ ...prev, colors: newColors, imageColorMap: newMap }));
                        }}
                        placeholder="Color name (e.g. Rose Gold)"
                        style={{ flex: 1, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}
                      />
                      <button
                        type="button"
                        style={removeBtnStyle}
                        onClick={() => {
                          const removedName = options.colors[idx].name;
                          const newColors = options.colors.filter((_, i) => i !== idx);
                          const newMap = { ...options.imageColorMap };
                          for (const [k, v] of Object.entries(newMap)) {
                            newMap[k] = v.filter(n => n !== removedName);
                          }
                          setOptions(prev => ({ ...prev, colors: newColors, imageColorMap: newMap }));
                        }}
                      >
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  ))}
                  {form.images.length > 0 && options.colors.some(c => c.name) && (
                    <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>
                      <i className="fas fa-info-circle" style={{ marginRight: 4 }} />
                      Use the "Assign Color" dropdown on each image above to tag it with a color.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          {!showColors && (
            <div className="card-content">
              <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>Enable to add color options for this product.</p>
            </div>
          )}
        </div>

        <div className="card" style={sectionCardStyle}>
          <div className="card-header" style={sectionHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ position: 'relative', display: 'inline-block', width: 40, height: 22, flexShrink: 0 }}>
                <input type="checkbox" checked={showCustomOptions} onChange={e => {
                  const checked = e.target.checked;
                  setShowCustomOptions(checked);
                  if (!checked) setOptions(prev => ({ ...prev, customOptions: [] }));
                }} style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
                <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, background: showCustomOptions ? '#2563eb' : '#cbd5e1', borderRadius: 22, transition: 'background 0.2s' }}>
                  <span style={{ position: 'absolute', height: 16, width: 16, left: showCustomOptions ? 20 : 3, bottom: 3, background: 'white', borderRadius: '50%', transition: 'left 0.2s' }} />
                </span>
              </label>
              <h3 className="card-title" style={{ margin: 0 }}>Custom Options</h3>
            </div>
            {showCustomOptions && (
              <button
                type="button"
                style={addBtnStyle}
                onClick={() => setOptions(prev => ({ ...prev, customOptions: [...prev.customOptions, { label: '', values: [''] }] }))}
              >
                <i className="fas fa-plus" style={{ marginRight: 6 }} />Add Option Group
              </button>
            )}
          </div>
          {showCustomOptions && (
            <div className="card-content">
              {options.customOptions.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>No custom options. Add options like Size, Weight, etc. that don't affect price.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {options.customOptions.map((opt, gIdx) => (
                    <div key={gIdx} style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fafbfc' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <input
                          type="text"
                          value={opt.label}
                          onChange={e => {
                            const newOpts = [...options.customOptions];
                            newOpts[gIdx] = { ...newOpts[gIdx], label: e.target.value };
                            setOptions(prev => ({ ...prev, customOptions: newOpts }));
                          }}
                          placeholder="Option name (e.g. Size, Weight)"
                          style={{ flex: 1, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, fontWeight: 600, boxSizing: 'border-box' }}
                        />
                        <button type="button" style={removeBtnStyle} onClick={() => {
                          setOptions(prev => ({ ...prev, customOptions: prev.customOptions.filter((_, i) => i !== gIdx) }));
                        }}>
                          <i className="fas fa-trash" />
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                        {opt.values.map((val, vIdx) => (
                          <div key={vIdx} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <input
                              type="text"
                              value={val}
                              onChange={e => {
                                const newOpts = [...options.customOptions];
                                const newVals = [...newOpts[gIdx].values];
                                newVals[vIdx] = e.target.value;
                                newOpts[gIdx] = { ...newOpts[gIdx], values: newVals };
                                setOptions(prev => ({ ...prev, customOptions: newOpts }));
                              }}
                              placeholder="Value"
                              style={{ width: 80, padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 12, boxSizing: 'border-box' }}
                            />
                            {opt.values.length > 1 && (
                              <button type="button" onClick={() => {
                                const newOpts = [...options.customOptions];
                                newOpts[gIdx] = { ...newOpts[gIdx], values: newOpts[gIdx].values.filter((_, i) => i !== vIdx) };
                                setOptions(prev => ({ ...prev, customOptions: newOpts }));
                              }} style={{ ...removeBtnStyle, fontSize: 11, padding: '0 2px' }}>
                                <i className="fas fa-times" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button type="button" onClick={() => {
                          const newOpts = [...options.customOptions];
                          newOpts[gIdx] = { ...newOpts[gIdx], values: [...newOpts[gIdx].values, ''] };
                          setOptions(prev => ({ ...prev, customOptions: newOpts }));
                        }} style={{ ...addBtnStyle, padding: '4px 10px', fontSize: 11 }}>+ Value</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {!showCustomOptions && (
            <div className="card-content">
              <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>Enable to add custom options like Size, Weight, etc.</p>
            </div>
          )}
        </div>

        <div className="card" style={sectionCardStyle}>
          <div className="card-header" style={sectionHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ position: 'relative', display: 'inline-block', width: 40, height: 22, flexShrink: 0 }}>
                <input type="checkbox" checked={showPricedOptions} onChange={e => {
                  const checked = e.target.checked;
                  setShowPricedOptions(checked);
                  if (!checked) setOptions(prev => ({ ...prev, pricedOptions: [] }));
                }} style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
                <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, background: showPricedOptions ? '#2563eb' : '#cbd5e1', borderRadius: 22, transition: 'background 0.2s' }}>
                  <span style={{ position: 'absolute', height: 16, width: 16, left: showPricedOptions ? 20 : 3, bottom: 3, background: 'white', borderRadius: '50%', transition: 'left 0.2s' }} />
                </span>
              </label>
              <h3 className="card-title" style={{ margin: 0 }}>Priced Options</h3>
            </div>
            {showPricedOptions && (
              <button
                type="button"
                style={addBtnStyle}
                onClick={() => setOptions(prev => ({ ...prev, pricedOptions: [...prev.pricedOptions, { label: '', values: [{ name: '', price: '' }] }] }))}
              >
                <i className="fas fa-plus" style={{ marginRight: 6 }} />Add Priced Option Group
              </button>
            )}
          </div>
          {showPricedOptions && (
            <div className="card-content">
              {options.pricedOptions.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>No priced options. Add options like Dupatta, Chain Type, etc. that add to the base price.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {options.pricedOptions.map((opt, gIdx) => (
                    <div key={gIdx} style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fafbfc' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <input
                          type="text"
                          value={opt.label}
                          onChange={e => {
                            const newOpts = [...options.pricedOptions];
                            newOpts[gIdx] = { ...newOpts[gIdx], label: e.target.value };
                            setOptions(prev => ({ ...prev, pricedOptions: newOpts }));
                          }}
                          placeholder="Option name (e.g. Dupatta, Chain Type)"
                          style={{ flex: 1, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, fontWeight: 600, boxSizing: 'border-box' }}
                        />
                        <button type="button" style={removeBtnStyle} onClick={() => {
                          setOptions(prev => ({ ...prev, pricedOptions: prev.pricedOptions.filter((_, i) => i !== gIdx) }));
                        }}>
                          <i className="fas fa-trash" />
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {opt.values.map((val, vIdx) => (
                          <div key={vIdx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <input
                              type="text"
                              value={val.name}
                              onChange={e => {
                                const newOpts = [...options.pricedOptions];
                                const newVals = [...newOpts[gIdx].values];
                                newVals[vIdx] = { ...newVals[vIdx], name: e.target.value };
                                newOpts[gIdx] = { ...newOpts[gIdx], values: newVals };
                                setOptions(prev => ({ ...prev, pricedOptions: newOpts }));
                              }}
                              placeholder="Name (e.g. Silk Dupatta)"
                              style={{ flex: 1, padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 12, boxSizing: 'border-box' }}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <input
                                type="number"
                                min="0"
                                value={val.price === 0 || val.price === '' ? '' : val.price}
                                onChange={e => {
                                  const newOpts = [...options.pricedOptions];
                                  const newVals = [...newOpts[gIdx].values];
                                  const raw = e.target.value;
                                  newVals[vIdx] = { ...newVals[vIdx], price: raw === '' ? '' : parseFloat(raw) || 0 };
                                  newOpts[gIdx] = { ...newOpts[gIdx], values: newVals };
                                  setOptions(prev => ({ ...prev, pricedOptions: newOpts }));
                                }}
                                placeholder="Price"
                                style={{ width: 80, padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 12, boxSizing: 'border-box' }}
                              />
                            </div>
                            {opt.values.length > 1 && (
                              <button type="button" onClick={() => {
                                const newOpts = [...options.pricedOptions];
                                newOpts[gIdx] = { ...newOpts[gIdx], values: newOpts[gIdx].values.filter((_, i) => i !== vIdx) };
                                setOptions(prev => ({ ...prev, pricedOptions: newOpts }));
                              }} style={removeBtnStyle}>
                                <i className="fas fa-times" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button type="button" onClick={() => {
                          const newOpts = [...options.pricedOptions];
                          newOpts[gIdx] = { ...newOpts[gIdx], values: [...newOpts[gIdx].values, { name: '', price: '' }] };
                          setOptions(prev => ({ ...prev, pricedOptions: newOpts }));
                        }} style={{ ...addBtnStyle, alignSelf: 'flex-start', padding: '4px 10px', fontSize: 11 }}>+ Value</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {!showPricedOptions && (
            <div className="card-content">
              <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>Enable to add priced options that affect the product price.</p>
            </div>
          )}
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
