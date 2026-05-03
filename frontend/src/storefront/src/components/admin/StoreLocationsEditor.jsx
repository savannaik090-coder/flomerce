import React, { useState, useEffect, useContext, useRef } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import SaveBar from './SaveBar.jsx';
import SectionToggle from './SectionToggle.jsx';
import AdminColorField from './style/AdminColorField.jsx';
import AdminFontPicker from './style/AdminFontPicker.jsx';
import { API_BASE } from '../../config.js';
import PhoneInput from '../ui/PhoneInput.jsx';
import { usePendingMedia } from '../../hooks/usePendingMedia.js';
import { useDirtyTracker } from '../../hooks/useDirtyTracker.js';

const EMPTY_STORE = { name: '', address: '', hours: '', phone: '', mapLink: '', image: '' };

// Per-template field definitions for the Appearance tab.
// `key` = settings key suffix; full key is `sl{Template}{Key}` so e.g. SectionBg → slClassicSectionBg.
const APPEARANCE_FIELDS = [
  { key: 'SectionBg',      label: 'Section Background',  type: 'color' },
  { key: 'TitleColor',     label: 'Title Color',         type: 'color' },
  { key: 'TitleFont',      label: 'Title Font',          type: 'font'  },
  { key: 'SubtitleColor',  label: 'Subtitle Color',      type: 'color' },
  { key: 'SubtitleFont',   label: 'Subtitle Font',       type: 'font'  },
  { key: 'CardBg',         label: 'Card Background',     type: 'color' },
  { key: 'StoreNameColor', label: 'Store Name Color',    type: 'color' },
  { key: 'StoreNameFont',  label: 'Store Name Font',     type: 'font'  },
  { key: 'InfoTextColor',  label: 'Info Text Color (address / hours / phone)', type: 'color' },
  { key: 'AccentColor',    label: 'Accent Color (underline / icons)',          type: 'color' },
  { key: 'BookBtnBg',      label: '"Book Appointment" Button Color',           type: 'color' },
  { key: 'BookBtnText',    label: '"Book Appointment" Button Text Color',      type: 'color' },
  { key: 'ArrowBg',        label: 'Scroll Arrow Background',                   type: 'color' },
  { key: 'ArrowIcon',      label: 'Scroll Arrow Icon Color',                   type: 'color' },
];

// Template-specific defaults shown in the swatch when nothing is saved.
// These must match the CSS fallbacks in locations.css / modern.css.
const TEMPLATE_DEFAULTS = {
  classic: {
    SectionBg: '#f8f8f5',
    TitleColor: '#333333',
    SubtitleColor: '#666666',
    CardBg: '#ffffff',
    StoreNameColor: '#333333',
    InfoTextColor: '#666666',
    AccentColor: '#B08C4C',
    BookBtnBg: '#333333',
    BookBtnText: '#ffffff',
    ArrowBg: '#ffffff',
    ArrowIcon: '#333333',
  },
  modern: {
    SectionBg: '#ffffff',
    TitleColor: '#111111',
    SubtitleColor: '#666666',
    CardBg: '#ffffff',
    StoreNameColor: '#111111',
    InfoTextColor: '#666666',
    AccentColor: '#111111',
    BookBtnBg: '#111111',
    BookBtnText: '#ffffff',
    ArrowBg: '#ffffff',
    ArrowIcon: '#111111',
  },
};

function buildEmptyAppearance() {
  const out = {};
  for (const tmpl of ['Classic', 'Modern']) {
    for (const f of APPEARANCE_FIELDS) {
      out[`sl${tmpl}${f.key}`] = '';
    }
  }
  return out;
}

function compressImage(file, maxWidth = 1200, quality = 0.85) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function StoreLocationsEditor({ onSaved, onPreviewUpdate, sectionVisible = true, visibilityKey, onVisibilitySaved }) {
  const { siteConfig } = useContext(SiteContext);
  const [pendingVisible, setPendingVisible] = useState(sectionVisible);
  useEffect(() => { setPendingVisible(sectionVisible); }, [sectionVisible]);
  const visDirty = !!visibilityKey && pendingVisible !== sectionVisible;
  const [stores, setStores] = useState([{ ...EMPTY_STORE }]);
  const [appearance, setAppearance] = useState(() => buildEmptyAppearance());
  const [activeView, setActiveView] = useState('content');
  const activeTemplate = (() => {
    let s = siteConfig?.settings || {};
    if (typeof s === 'string') { try { s = JSON.parse(s); } catch { s = {}; } }
    return s.theme === 'modern' ? 'Modern' : 'Classic';
  })();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState({});
  const [status, setStatus] = useState('');
  const fileInputRefs = useRef({});
  const hasLoadedRef = useRef(false);
  const pendingMedia = usePendingMedia(siteConfig?.id);

  const dirty = useDirtyTracker({ stores, appearance });

  useEffect(() => {
    if (siteConfig?.id) loadSettings();
  }, [siteConfig?.id]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    if (onPreviewUpdate) {
      onPreviewUpdate({
        storeLocations: stores.filter(s => s.name || s.address),
        ...appearance,
      });
    }
  }, [stores, appearance]);

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
        const saved = settings.storeLocations || [];
        let storesVal;
        if (saved.length > 0) {
          storesVal = saved;
        } else {
          storesVal = [{
            name: result.data.brand_name ? `${result.data.brand_name} Store` : '',
            address: settings.address || result.data.address || '',
            hours: "Monday to Saturday 11:00 am - 08:00 pm",
            phone: settings.phone || result.data.phone || '',
            mapLink: '',
            image: '',
          }];
        }
        const appearanceVal = buildEmptyAppearance();
        for (const k of Object.keys(appearanceVal)) {
          if (typeof settings[k] === 'string') appearanceVal[k] = settings[k];
        }
        setStores(storesVal);
        setAppearance(appearanceVal);
        dirty.baseline({ stores: storesVal, appearance: appearanceVal });
      }
    } catch (e) {
      console.error('Failed to load store locations:', e);
    } finally {
      setLoading(false);
      setTimeout(() => { hasLoadedRef.current = true; }, 0);
    }
  }

  function updateStore(index, field, value) {
    setStores(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  }

  function updateAppearance(key, value) {
    setAppearance(prev => ({ ...prev, [key]: value }));
  }

  function addStore() {
    setStores(prev => [...prev, { ...EMPTY_STORE }]);
  }

  function removeStore(index) {
    if (stores.length <= 1) return;
    const removedStore = stores[index];
    if (removedStore?.image) pendingMedia.markForDeletion(removedStore.image);
    setStores(prev => prev.filter((_, i) => i !== index));
  }

  async function handleImageUpload(index, file) {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      setStatus('error:' + "Please upload a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setStatus('error:' + "Image is too large. Maximum size is 10MB.");
      return;
    }
    const oldImage = stores[index]?.image;
    setUploading(prev => ({ ...prev, [index]: true }));
    setStatus('');
    try {
      const blob = await compressImage(file);
      const formData = new FormData();
      formData.append('images', blob, 'store-location.jpg');
      const token = sessionStorage.getItem('site_admin_token');
      const response = await fetch(`${API_BASE}/api/upload/image?siteId=${siteConfig.id}`, {
        method: 'POST',
        headers: { 'Authorization': token ? `SiteAdmin ${token}` : '' },
        body: formData,
      });
      const result = await response.json();
      if (result.success && result.data?.images?.length > 0 && result.data.images[0].url) {
        const newUrl = result.data.images[0].url;
        updateStore(index, 'image', newUrl);
        pendingMedia.markUploaded(newUrl);
        if (oldImage) pendingMedia.markForDeletion(oldImage);
      } else {
        setStatus('error:' + "Image upload failed. Please try again.");
      }
    } catch (e) {
      console.error('Failed to upload store image:', e);
      setStatus('error:' + "Failed to upload image. Please check your connection.");
    } finally {
      setUploading(prev => ({ ...prev, [index]: false }));
    }
  }

  async function handleSave(e) {
    if (e && e.preventDefault) e.preventDefault();
    setSaving(true);
    setStatus('');
    try {
      const token = sessionStorage.getItem('site_admin_token');
      const persistedStores = stores.filter(s => s.name || s.address);
      const response = await fetch(`${API_BASE}/api/sites/${siteConfig.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `SiteAdmin ${token}` : '',
        },
        body: JSON.stringify({
          settings: {
            storeLocations: persistedStores,
            ...appearance,
            ...(visibilityKey ? { [visibilityKey]: pendingVisible } : {}),
          },
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setStatus('success');
        dirty.markSaved();
        if (visibilityKey && onVisibilitySaved) onVisibilitySaved(pendingVisible);
        const cleanup = await pendingMedia.commit(persistedStores.map(s => s.image).filter(Boolean));
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

  const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' };
  const labelStyle = { display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 };

  return (
    <div style={{ maxWidth: 700 }}>
      <SaveBar topBar saving={saving} hasChanges={dirty.hasChanges || visDirty} onSave={(e) => handleSave(e || { preventDefault: () => {} })} />
      <form onSubmit={handleSave}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e2e8f0' }}>
          {[{ key: 'content', icon: 'fa-edit', label: 'Content' }, { key: 'appearance', icon: 'fa-paint-brush', label: 'Appearance' }].map(tab => (
            <button key={tab.key} type="button" onClick={() => setActiveView(tab.key)} style={{ padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, color: activeView === tab.key ? '#2563eb' : '#64748b', borderBottom: `2px solid ${activeView === tab.key ? '#2563eb' : 'transparent'}`, marginBottom: -2, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', transition: 'color 0.15s ease' }}>
              <i className={`fas ${tab.icon}`} />{tab.label}
            </button>
          ))}
        </div>

        {activeView === 'content' && <>
          {visibilityKey && (
            <SectionToggle
              enabled={pendingVisible}
              onChange={() => {
                const next = !pendingVisible;
                setPendingVisible(next);
                if (onPreviewUpdate && visibilityKey) onPreviewUpdate({ [visibilityKey]: next });
              }}
              label="Store Locations Section"
            />
          )}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <h3 className="card-title">Come Visit Us at Our Store</h3>
            </div>
            <div className="card-content">
              {stores.map((store, index) => (
                <div key={index} style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 16, background: '#fafbfc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>
                      <i className="fas fa-store" style={{ marginInlineEnd: 6, color: '#2563eb' }} />
                      {stores.length > 1 ? `Store #${index + 1}` : "Store"}
                    </span>
                    {stores.length > 1 && (
                      <button type="button" onClick={() => removeStore(index)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
                        <i className="fas fa-trash" style={{ marginInlineEnd: 4 }} />Remove
                      </button>
                    )}
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>Store Image</label>
                    {store.image ? (
                      <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
                        <img src={store.image} alt={store.name || "Store"} style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block', borderRadius: 8 }} />
                        <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => { if (!uploading[index] && fileInputRefs.current[index]) fileInputRefs.current[index].click(); }}
                            disabled={uploading[index]}
                            style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: uploading[index] ? 'not-allowed' : 'pointer', fontSize: 12, fontFamily: 'inherit', opacity: uploading[index] ? 0.7 : 1 }}
                          >
                            {uploading[index] ? (
                              <><i className="fas fa-spinner fa-spin" style={{ marginInlineEnd: 4 }} />Changing...</>
                            ) : (
                              <><i className="fas fa-camera" style={{ marginInlineEnd: 4 }} />Change</>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => { const oldImg = stores[index]?.image; if (oldImg) pendingMedia.markForDeletion(oldImg); updateStore(index, 'image', ''); }}
                            style={{ background: 'rgba(220,38,38,0.8)', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}
                          >
                            <i className="fas fa-trash" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => { if (!uploading[index] && fileInputRefs.current[index]) fileInputRefs.current[index].click(); }}
                        style={{ border: '2px dashed #cbd5e1', borderRadius: 8, padding: '28px 16px', textAlign: 'center', cursor: uploading[index] ? 'not-allowed' : 'pointer', background: '#fff', transition: 'border-color 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#2563eb'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                      >
                        {uploading[index] ? (
                          <span style={{ fontSize: 13, color: '#64748b' }}>
                            <i className="fas fa-spinner fa-spin" style={{ marginInlineEnd: 6 }} />Uploading...
                          </span>
                        ) : (
                          <>
                            <i className="fas fa-cloud-upload-alt" style={{ fontSize: 24, color: '#94a3b8', display: 'block', marginBottom: 6 }} />
                            <span style={{ fontSize: 13, color: '#64748b' }}>Click to upload store image</span>
                            <span style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginTop: 4 }}>JPG, PNG, or WebP (max 10MB)</span>
                          </>
                        )}
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      ref={(el) => { fileInputRefs.current[index] = el; }}
                      onChange={(e) => { handleImageUpload(index, e.target.files[0]); e.target.value = ''; }}
                      style={{ display: 'none' }}
                    />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>Store Name</label>
                    <input type="text" value={store.name} onChange={(e) => updateStore(index, 'name', e.target.value)} placeholder="e.g., Main Showroom" style={inputStyle} />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>Address</label>
                    <textarea value={store.address} onChange={(e) => updateStore(index, 'address', e.target.value)} rows={2} placeholder="Full store address" style={{ ...inputStyle, resize: 'vertical' }} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={labelStyle}>Business Hours</label>
                      <input type="text" value={store.hours} onChange={(e) => updateStore(index, 'hours', e.target.value)} placeholder="e.g., Mon-Sat 11am - 8pm" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Phone</label>
                      <PhoneInput value={store.phone} onChange={val => updateStore(index, 'phone', val)} countryCode="IN" />
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Google Maps Link</label>
                    <input type="text" value={store.mapLink} onChange={(e) => updateStore(index, 'mapLink', e.target.value)} placeholder="https://maps.google.com/..." style={inputStyle} />
                  </div>
                </div>
              ))}

              <button type="button" onClick={addStore} style={{ width: '100%', padding: '10px 16px', border: '2px dashed #cbd5e1', borderRadius: 8, background: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'inherit' }}>
                <i className="fas fa-plus" style={{ marginInlineEnd: 6 }} />Add Another Store
              </button>
            </div>
          </div>
        </>}

        {activeView === 'appearance' && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <h3 className="card-title">Section Style</h3>
            </div>
            <div className="card-content">
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                Customize colors and fonts for your {activeTemplate} template. Leave any field blank to use the default.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {APPEARANCE_FIELDS.map(field => {
                  const settingKey = `sl${activeTemplate}${field.key}`;
                  const value = appearance[settingKey] || '';
                  const fallback = TEMPLATE_DEFAULTS[activeTemplate.toLowerCase()][field.key];
                  if (field.type === 'color') {
                    return (
                      <AdminColorField
                        key={settingKey}
                        label={field.label}
                        value={value}
                        fallback={fallback}
                        onChange={v => updateAppearance(settingKey, v)}
                      />
                    );
                  }
                  return (
                    <AdminFontPicker
                      key={settingKey}
                      label={field.label}
                      value={value}
                      onChange={v => updateAppearance(settingKey, v)}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {status && (
          <div style={{ padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13, background: status === 'success' ? '#f0fdf4' : '#fef2f2', color: status === 'success' ? '#16a34a' : '#dc2626', border: `1px solid ${status === 'success' ? '#bbf7d0' : '#fecaca'}` }}>
            {status === 'success' ? "Store locations saved successfully!" : status.replace('error:', '')}
          </div>
        )}

        <SaveBar saving={saving} hasChanges={dirty.hasChanges || visDirty} onSave={(e) => handleSave(e || { preventDefault: () => {} })} />
      </form>
    </div>
  );
}
