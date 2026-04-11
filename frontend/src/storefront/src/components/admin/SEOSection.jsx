import React, { useState, useEffect, useContext, useCallback } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import './SEOSection.css';
import { API_BASE, PLATFORM_DOMAIN } from '../../config.js';

function getAuthHeader() {
  const token = sessionStorage.getItem('site_admin_token');
  return token ? { Authorization: `SiteAdmin ${token}` } : {};
}

function getStoreUrl(siteConfig) {
  if (siteConfig?.customDomain && siteConfig?.domainStatus === 'verified') {
    return `https://${siteConfig.customDomain}`;
  }
  if (siteConfig?.subdomain) {
    return `https://${siteConfig.subdomain}.${PLATFORM_DOMAIN}`;
  }
  return window.location.origin;
}

function CharCounter({ value, max }) {
  const len = (value || '').length;
  const cls = len > max ? 'over' : len > max * 0.85 ? 'warn' : '';
  return <div className={`seo-char-counter ${cls}`}>{len} / {max}</div>;
}

function ImageUploadField({ label, hint, value, onChange, siteId }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const imgSrc = value ? (value.startsWith('/') ? `${API_BASE}${value}` : value) : null;

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setError('Use JPG, PNG, WebP, or GIF.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB.');
      return;
    }

    const oldValue = value;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('images', file, file.name);
      const res = await fetch(`${API_BASE}/api/upload/image?siteId=${siteId}`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: formData,
      });
      const result = await res.json();
      const data = result.data || result;
      const urls = data.urls || (data.images || []).filter(r => r.url).map(r => r.url);
      if (result.success && urls.length > 0) {
        onChange(urls[0]);
        if (oldValue && siteId) {
          import('../../services/api.js').then(({ deleteMediaFromR2 }) => {
            deleteMediaFromR2(siteId, oldValue);
          });
        }
      } else {
        setError(result.error || 'Upload failed');
      }
    } catch {
      setError('Upload failed');
    }
    setUploading(false);
    e.target.value = '';
  }

  return (
    <div className="seo-field">
      <label>{label}</label>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {imgSrc ? (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img src={imgSrc} alt="" style={{ width: 120, height: 63, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0' }} onError={e => e.target.style.display = 'none'} />
            <button type="button" onClick={() => { if (value && siteId) { import('../../services/api.js').then(({ deleteMediaFromR2 }) => { deleteMediaFromR2(siteId, value); }); } onChange(''); }} style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&times;</button>
          </div>
        ) : null}
        <div style={{ flex: 1 }}>
          <label className="btn btn-outline" style={{ fontSize: 13, padding: '8px 16px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: uploading ? 0.6 : 1 }}>
            <i className={`fas ${uploading ? 'fa-spinner fa-spin' : 'fa-upload'}`} />
            {uploading ? 'Uploading...' : value ? 'Change Image' : 'Upload Image'}
            <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" onChange={handleUpload} disabled={uploading} style={{ display: 'none' }} />
          </label>
          {error && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{error}</div>}
        </div>
      </div>
      <div className="seo-hint">{hint}</div>
    </div>
  );
}

function SearchPreview({ title, description, url }) {
  const displayTitle = title || 'Page Title';
  const displayDesc = description || 'Meta description will appear here.';
  const displayUrl = url || window.location.origin;

  return (
    <div className="seo-preview">
      <div className="seo-preview-label">Google Search Preview</div>
      <div className="seo-preview-title">{displayTitle}</div>
      <div className="seo-preview-url">{displayUrl}</div>
      <div className="seo-preview-desc">{displayDesc}</div>
    </div>
  );
}

const SEO_CATEGORY_DESCRIPTIONS = {
  jewellery: (name) => `Shop exquisite jewellery at ${name}. Explore rings, necklaces, earrings, bracelets & more. Secure payments & nationwide delivery.`,
  clothing: (name) => `Discover the latest fashion at ${name}. Shop clothing, accessories & more with easy returns & fast shipping.`,
  beauty: (name) => `Shop premium beauty & cosmetics at ${name}. Skincare, makeup & more with secure checkout & fast delivery.`,
  general: (name) => `Shop online at ${name}. Explore our curated collection with secure checkout, easy returns & fast delivery.`,
};

function getDefaultSEOTitle(brandName) {
  return `${brandName || 'Your Store'} - Online Store`;
}

function getDefaultSEODescription(brandName, category) {
  const gen = SEO_CATEGORY_DESCRIPTIONS[category] || SEO_CATEGORY_DESCRIPTIONS.general;
  return gen(brandName || 'Your Store');
}

function SiteSEOTab({ siteConfig }) {
  const siteId = siteConfig?.id;
  const storeUrl = getStoreUrl(siteConfig);

  const [form, setForm] = useState({
    seo_title: '',
    seo_description: '',
    seo_og_image: '',
    seo_keywords: '',
    seo_robots: 'index, follow',
    google_verification: '',
    favicon_url: '',
  });
  const [siteCategory, setSiteCategory] = useState(siteConfig?.category || 'general');
  const [apiBrandName, setApiBrandName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [faviconUploading, setFaviconUploading] = useState(false);

  const brandName = apiBrandName || siteConfig?.brandName || siteConfig?.brand_name || 'Your Store';
  const defaultTitle = getDefaultSEOTitle(brandName);
  const defaultDescription = getDefaultSEODescription(brandName, siteCategory);

  useEffect(() => {
    if (!siteId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/site-admin/seo?siteId=${siteId}`, {
          headers: getAuthHeader(),
        });
        const result = await res.json();
        if (result.success && result.data) {
          const { brand_name, category, ...seoFields } = result.data;
          setForm(prev => ({ ...prev, ...seoFields }));
          if (brand_name) setApiBrandName(brand_name);
          if (category) setSiteCategory(category);
        }
      } catch {}
      setLoading(false);
    })();
  }, [siteId]);

  async function handleFaviconUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/png', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/svg+xml', 'image/webp', 'image/jpeg', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setMsg({ type: 'error', text: 'Invalid file type. Use PNG, ICO, SVG, or WebP.' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMsg({ type: 'error', text: 'Favicon must be under 2MB.' });
      return;
    }

    const oldFavicon = form.favicon_url;
    setFaviconUploading(true);
    setMsg(null);
    try {
      const formData = new FormData();
      formData.append('images', file, file.name);
      const res = await fetch(`${API_BASE}/api/upload/image?siteId=${siteId}`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: formData,
      });
      const result = await res.json();
      const data = result.data || result;
      const urls = data.urls || (data.images || []).filter(r => r.url).map(r => r.url);
      if (result.success && urls.length > 0) {
        setForm(prev => ({ ...prev, favicon_url: urls[0] }));
        setMsg({ type: 'success', text: 'Favicon uploaded! Click "Save SEO Settings" to apply.' });
        setTimeout(() => setMsg(null), 4000);
        if (oldFavicon && siteId) {
          import('../../services/api.js').then(({ deleteMediaFromR2 }) => {
            deleteMediaFromR2(siteId, oldFavicon);
          });
        }
      } else {
        setMsg({ type: 'error', text: result.error || 'Upload failed' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Failed to upload favicon' });
    }
    setFaviconUploading(false);
    e.target.value = '';
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/site-admin/seo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ siteId, ...form }),
      });
      const result = await res.json();
      setMsg(result.success
        ? { type: 'success', text: 'SEO settings saved successfully!' }
        : { type: 'error', text: result.error || 'Failed to save' });
    } catch {
      setMsg({ type: 'error', text: 'Failed to save SEO settings' });
    }
    setSaving(false);
  }

  function set(field) {
    return e => setForm(prev => ({ ...prev, [field]: e.target.value }));
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  return (
    <form onSubmit={handleSave}>
      <SearchPreview
        title={form.seo_title || defaultTitle}
        description={form.seo_description || defaultDescription}
        url={storeUrl}
      />

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><h3 className="card-title">Favicon</h3></div>
        <div className="card-content">
          <div className="seo-field">
            <label>Site Favicon</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {form.favicon_url ? (
                <div style={{ position: 'relative', width: 48, height: 48, borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', flexShrink: 0 }}>
                  <img
                    src={form.favicon_url.startsWith('/') ? `${API_BASE}${form.favicon_url}` : form.favicon_url}
                    alt="Favicon"
                    style={{ maxWidth: 32, maxHeight: 32, objectFit: 'contain' }}
                  />
                  <button
                    type="button"
                    onClick={() => { if (form.favicon_url && siteId) { import('../../services/api.js').then(({ deleteMediaFromR2 }) => { deleteMediaFromR2(siteId, form.favicon_url); }); } setForm(prev => ({ ...prev, favicon_url: '' })); }}
                    style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                  >
                    &times;
                  </button>
                </div>
              ) : (
                <div style={{ width: 48, height: 48, borderRadius: 8, border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', flexShrink: 0 }}>
                  <i className="fas fa-image" />
                </div>
              )}
              <div style={{ flex: 1 }}>
                <label
                  className="btn btn-outline"
                  style={{ fontSize: 13, padding: '8px 16px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: faviconUploading ? 0.6 : 1 }}
                >
                  <i className={`fas ${faviconUploading ? 'fa-spinner fa-spin' : 'fa-upload'}`} />
                  {faviconUploading ? 'Uploading...' : form.favicon_url ? 'Change Favicon' : 'Upload Favicon'}
                  <input
                    type="file"
                    accept=".png,.ico,.svg,.webp,.jpg,.jpeg"
                    onChange={handleFaviconUpload}
                    disabled={faviconUploading}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>
            <div className="seo-hint">Recommended: 32x32 or 64x64 PNG. This icon appears in browser tabs and bookmarks.</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><h3 className="card-title">Site-Wide SEO Defaults</h3></div>
        <div className="card-content">

          <div className="seo-field">
            <label>Site Title</label>
            <input
              type="text"
              value={form.seo_title || defaultTitle}
              onChange={e => setForm(prev => ({ ...prev, seo_title: e.target.value === defaultTitle ? '' : e.target.value }))}
              maxLength={70}
            />
            <CharCounter value={form.seo_title || defaultTitle} max={60} />
            <div className="seo-hint">Recommended: 50-60 characters. Shown in Google results and browser tab.</div>
          </div>

          <div className="seo-field">
            <label>Meta Description</label>
            <textarea
              value={form.seo_description || defaultDescription}
              onChange={e => setForm(prev => ({ ...prev, seo_description: e.target.value === defaultDescription ? '' : e.target.value }))}
              maxLength={200}
              rows={3}
            />
            <CharCounter value={form.seo_description || defaultDescription} max={160} />
            <div className="seo-hint">Recommended: 120-160 characters. Affects click-through rate from Google.</div>
          </div>

          <div className="seo-field">
            <label>Meta Keywords</label>
            <input
              type="text"
              value={form.seo_keywords}
              onChange={set('seo_keywords')}
              placeholder={`e.g. ${brandName.toLowerCase()}, online store, shop online`}
              maxLength={200}
            />
            <div className="seo-hint">Comma-separated keywords for your store. Helps some search engines and social platforms understand your content.</div>
          </div>

        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><h3 className="card-title">Advanced Settings</h3></div>
        <div className="card-content">

          <div className="seo-field">
            <label>Search Engine Indexing</label>
            <select value={form.seo_robots} onChange={set('seo_robots')}>
              <option value="index, follow">Allow indexing (recommended)</option>
              <option value="noindex, follow">Hide from search engines (noindex)</option>
              <option value="index, nofollow">Index but don't follow links</option>
              <option value="noindex, nofollow">Block all crawlers</option>
            </select>
            <div className="seo-hint">Controls whether Google can find and index your store.</div>
          </div>

          <div className="seo-field">
            <label>Google Verification Code</label>
            <input
              type="text"
              value={form.google_verification}
              onChange={set('google_verification')}
              placeholder="Paste your Google Search Console verification code here"
            />
            <div className="seo-hint">
              Get this from <strong>Google Search Console</strong> &rarr; Verify ownership &rarr; HTML tag method. Paste only the content value (not the full tag).
            </div>
          </div>

        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><h3 className="card-title">Sitemap & Robots</h3></div>
        <div className="card-content">
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
            These files are generated automatically. Submit your sitemap URL to Google Search Console so Google can discover all your pages.
          </p>

          <div className="seo-sitemap-box">
            <span className="seo-sitemap-url">{storeUrl}/sitemap.xml</span>
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: 12, padding: '6px 12px', whiteSpace: 'nowrap' }}
              onClick={() => copyToClipboard(`${storeUrl}/sitemap.xml`)}
            >
              Copy URL
            </button>
          </div>

          <div className="seo-sitemap-box" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
            <span className="seo-sitemap-url" style={{ color: '#1e40af' }}>{storeUrl}/robots.txt</span>
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: 12, padding: '6px 12px', whiteSpace: 'nowrap', borderColor: '#bfdbfe', color: '#1e40af' }}
              onClick={() => copyToClipboard(`${storeUrl}/robots.txt`)}
            >
              Copy URL
            </button>
          </div>
        </div>
      </div>

      {msg && <div className={`seo-msg ${msg.type}`}>{msg.text}</div>}

      <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: 8 }}>
        {saving ? 'Saving...' : 'Save SEO Settings'}
      </button>
    </form>
  );
}

function CategoriesSEOTab({ siteConfig }) {
  const siteId = siteConfig?.id;
  const brandName = siteConfig?.brandName || siteConfig?.brand_name || 'Store';
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!siteId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/site-admin/seo/categories?siteId=${siteId}`, {
          headers: getAuthHeader(),
        });
        const result = await res.json();
        if (result.success) setCategories(result.data || []);
      } catch {}
      setLoading(false);
    })();
  }, [siteId]);

  function getAutoTitle(cat) {
    return `${cat.name} | ${brandName}`;
  }

  function getAutoDesc(cat) {
    return cat.description || `Browse our ${cat.name} collection.`;
  }

  function startEdit(cat) {
    setEditingId(cat.id);
    setEditForm({
      seo_title: cat.seo_title || getAutoTitle(cat),
      seo_description: cat.seo_description || getAutoDesc(cat),
      seo_og_image: cat.seo_og_image || cat.image_url || '',
      seo_keywords: cat.seo_keywords || '',
    });
    setMsg(null);
  }

  async function handleSave(catId) {
    setSaving(true);
    setMsg(null);
    try {
      const cat = categories.find(c => c.id === catId);
      const autoTitle = cat ? getAutoTitle(cat) : '';
      const autoDesc = cat ? getAutoDesc(cat) : '';
      const payload = {
        siteId,
        seo_title: editForm.seo_title === autoTitle ? '' : editForm.seo_title,
        seo_description: editForm.seo_description === autoDesc ? '' : editForm.seo_description,
        seo_og_image: editForm.seo_og_image,
        seo_keywords: editForm.seo_keywords,
      };
      const res = await fetch(`${API_BASE}/api/site-admin/seo/categories/${catId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success) {
        setCategories(prev => prev.map(c => c.id === catId ? { ...c, seo_title: payload.seo_title, seo_description: payload.seo_description, seo_og_image: payload.seo_og_image, seo_keywords: payload.seo_keywords } : c));
        setEditingId(null);
        setMsg({ type: 'success', text: 'Category SEO saved!' });
        setTimeout(() => setMsg(null), 3000);
      } else {
        setMsg({ type: 'error', text: result.error || 'Failed to save' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Failed to save' });
    }
    setSaving(false);
  }

  function getCatImgSrc(cat) {
    const url = cat.seo_og_image || cat.image_url;
    if (!url) return null;
    return url.startsWith('/') ? `${API_BASE}${url}` : url;
  }

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  if (categories.length === 0) {
    return (
      <div className="card">
        <div className="card-content" style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
          <i className="fas fa-folder-open" style={{ fontSize: 32, marginBottom: 12, display: 'block' }} />
          No categories found. Add categories from the Products section first.
        </div>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
        Customize SEO for each category page. Fields are auto-filled from your category data — edit to override.
      </p>

      {msg && <div className={`seo-msg ${msg.type}`} style={{ marginBottom: 12 }}>{msg.text}</div>}

      {categories.map(cat => {
        const catImgSrc = getCatImgSrc(cat);
        const autoTitle = getAutoTitle(cat);
        const autoDesc = getAutoDesc(cat);
        return (
          <div key={cat.id} className="card" style={{ marginBottom: 12 }}>
            <div className="card-content" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editingId === cat.id ? 14 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                  {catImgSrc ? (
                    <img src={catImgSrc} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0', flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: 6, border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', flexShrink: 0, fontSize: 16 }}>
                      <i className="fas fa-folder" />
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{cat.name}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
                      <span>/category/{cat.slug}</span>
                      <span style={{ color: '#64748b', fontStyle: 'italic' }} title={cat.seo_title || autoTitle}>
                        {cat.seo_title ? 'Custom' : 'Auto'}: {(cat.seo_title || autoTitle).substring(0, 35)}{(cat.seo_title || autoTitle).length > 35 ? '...' : ''}
                      </span>
                    </div>
                  </div>
                </div>
                {editingId !== cat.id && (
                  <button className="btn btn-outline btn-sm" onClick={() => startEdit(cat)} style={{ flexShrink: 0 }}>
                    <i className="fas fa-pen" /> Edit SEO
                  </button>
                )}
              </div>

              {editingId === cat.id && (
                <div>
                  <SearchPreview
                    title={editForm.seo_title}
                    description={editForm.seo_description}
                    url={`${getStoreUrl(siteConfig)}/category/${cat.slug}`}
                  />
                  <div className="seo-field">
                    <label>SEO Title</label>
                    <input
                      type="text"
                      value={editForm.seo_title}
                      onChange={e => setEditForm(p => ({ ...p, seo_title: e.target.value }))}
                      maxLength={70}
                    />
                    <CharCounter value={editForm.seo_title} max={60} />
                  </div>
                  <div className="seo-field">
                    <label>Meta Description</label>
                    <textarea
                      value={editForm.seo_description}
                      onChange={e => setEditForm(p => ({ ...p, seo_description: e.target.value }))}
                      rows={2}
                      maxLength={200}
                    />
                    <CharCounter value={editForm.seo_description} max={160} />
                  </div>
                  <div className="seo-field">
                    <label>Meta Keywords</label>
                    <input
                      type="text"
                      value={editForm.seo_keywords}
                      onChange={e => setEditForm(p => ({ ...p, seo_keywords: e.target.value }))}
                      placeholder={`e.g. ${cat.name.toLowerCase()}, ${brandName.toLowerCase()}, shop ${cat.name.toLowerCase()}`}
                      maxLength={200}
                    />
                    <div className="seo-hint">Comma-separated keywords for this category.</div>
                  </div>
                  <ImageUploadField
                    label="OG Image (for social sharing)"
                    hint="This image appears when the category is shared on WhatsApp, Facebook, Twitter, etc. Recommended: 1200x630px."
                    value={editForm.seo_og_image}
                    onChange={url => setEditForm(p => ({ ...p, seo_og_image: url }))}
                    siteId={siteId}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleSave(cat.id)}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProductsSEOTab({ siteConfig }) {
  const siteId = siteConfig?.id;
  const brandName = siteConfig?.brandName || siteConfig?.brand_name || 'Store';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!siteId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/site-admin/seo/products?siteId=${siteId}`, {
          headers: getAuthHeader(),
        });
        const result = await res.json();
        if (result.success) setProducts(result.data || []);
      } catch {}
      setLoading(false);
    })();
  }, [siteId]);

  function getAutoTitle(product) {
    return `${product.name} | ${brandName}`;
  }

  function getAutoDesc(product) {
    return product.short_description || product.description || '';
  }

  function startEdit(product) {
    setEditingId(product.id);
    setEditForm({
      seo_title: product.seo_title || getAutoTitle(product),
      seo_description: product.seo_description || getAutoDesc(product),
      seo_og_image: product.seo_og_image || product.thumbnail_url || '',
      seo_keywords: product.seo_keywords || '',
    });
    setMsg(null);
  }

  async function handleSave(productId) {
    setSaving(true);
    setMsg(null);
    try {
      const product = products.find(p => p.id === productId);
      const autoTitle = product ? getAutoTitle(product) : '';
      const autoDesc = product ? getAutoDesc(product) : '';
      const payload = {
        siteId,
        seo_title: editForm.seo_title === autoTitle ? '' : editForm.seo_title,
        seo_description: editForm.seo_description === autoDesc ? '' : editForm.seo_description,
        seo_og_image: editForm.seo_og_image,
        seo_keywords: editForm.seo_keywords,
      };
      const res = await fetch(`${API_BASE}/api/site-admin/seo/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success) {
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, seo_title: payload.seo_title, seo_description: payload.seo_description, seo_og_image: payload.seo_og_image, seo_keywords: payload.seo_keywords } : p));
        setEditingId(null);
        setMsg({ type: 'success', text: 'Product SEO saved!' });
        setTimeout(() => setMsg(null), 3000);
      } else {
        setMsg({ type: 'error', text: result.error || 'Failed to save' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Failed to save' });
    }
    setSaving(false);
  }

  function getProductImgSrc(product) {
    const url = product.seo_og_image || product.thumbnail_url;
    if (!url) return null;
    return url.startsWith('/') ? `${API_BASE}${url}` : url;
  }

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  if (products.length === 0) {
    return (
      <div className="card">
        <div className="card-content" style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
          <i className="fas fa-box-open" style={{ fontSize: 32, marginBottom: 12, display: 'block' }} />
          No products found. Add products from the Products section first.
        </div>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        SEO fields are pre-filled from your product data. Edit to customize how each product appears in Google and social media.
      </p>

      <div className="seo-field" style={{ marginBottom: 16 }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products..."
        />
      </div>

      {msg && <div className={`seo-msg ${msg.type}`} style={{ marginBottom: 12 }}>{msg.text}</div>}

      {filtered.map(product => {
        const thumbSrc = getProductImgSrc(product);
        const autoTitle = getAutoTitle(product);
        return (
          <div key={product.id} className="card" style={{ marginBottom: 12 }}>
            <div className="card-content" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editingId === product.id ? 14 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                  {thumbSrc ? (
                    <img src={thumbSrc} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0', flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: 6, border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', flexShrink: 0, fontSize: 16 }}>
                      <i className="fas fa-image" />
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{product.name}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
                      <span>/product/{product.slug}</span>
                      <span style={{ color: '#64748b', fontStyle: 'italic' }} title={product.seo_title || autoTitle}>
                        {product.seo_title ? 'Custom' : 'Auto'}: {(product.seo_title || autoTitle).substring(0, 35)}{(product.seo_title || autoTitle).length > 35 ? '...' : ''}
                      </span>
                    </div>
                  </div>
                </div>
                {editingId !== product.id && (
                  <button className="btn btn-outline btn-sm" onClick={() => startEdit(product)} style={{ flexShrink: 0 }}>
                    <i className="fas fa-pen" /> Edit SEO
                  </button>
                )}
              </div>

              {editingId === product.id && (
                <div>
                  <SearchPreview
                    title={editForm.seo_title}
                    description={editForm.seo_description}
                    url={`${getStoreUrl(siteConfig)}/product/${product.slug}`}
                  />
                  <div className="seo-field">
                    <label>SEO Title</label>
                    <input
                      type="text"
                      value={editForm.seo_title}
                      onChange={e => setEditForm(p => ({ ...p, seo_title: e.target.value }))}
                      maxLength={70}
                    />
                    <CharCounter value={editForm.seo_title} max={60} />
                  </div>
                  <div className="seo-field">
                    <label>Meta Description</label>
                    <textarea
                      value={editForm.seo_description}
                      onChange={e => setEditForm(p => ({ ...p, seo_description: e.target.value }))}
                      rows={2}
                      maxLength={200}
                    />
                    <CharCounter value={editForm.seo_description} max={160} />
                  </div>
                  <div className="seo-field">
                    <label>Meta Keywords</label>
                    <input
                      type="text"
                      value={editForm.seo_keywords}
                      onChange={e => setEditForm(p => ({ ...p, seo_keywords: e.target.value }))}
                      placeholder={`e.g. ${product.name.toLowerCase()}, buy ${product.name.toLowerCase()}, ${brandName.toLowerCase()}`}
                      maxLength={200}
                    />
                    <div className="seo-hint">Comma-separated keywords for this product.</div>
                  </div>
                  <ImageUploadField
                    label="OG Image (for social sharing)"
                    hint="This image appears when the product is shared on WhatsApp, Facebook, Twitter, etc. Recommended: 1200x630px."
                    value={editForm.seo_og_image}
                    onChange={url => setEditForm(p => ({ ...p, seo_og_image: url }))}
                    siteId={siteId}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleSave(product.id)}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: 24 }}>No products match your search.</div>
      )}
    </div>
  );
}

const PAGE_LABELS = {
  home: { label: 'Homepage', icon: 'fa-home', path: '/' },
  about: { label: 'About Us', icon: 'fa-info-circle', path: '/about' },
  contact: { label: 'Contact Us', icon: 'fa-envelope', path: '/contact' },
  privacy: { label: 'Privacy Policy', icon: 'fa-shield-alt', path: '/privacy-policy' },
  terms: { label: 'Terms & Conditions', icon: 'fa-file-contract', path: '/terms' },
};

const PAGE_DEFAULT_DESCS = {
  home: (b) => `Welcome to ${b}. Shop our latest collection with secure payments and fast delivery.`,
  about: (b) => `Learn about ${b} — our story, mission, and what makes us different.`,
  contact: (b) => `Get in touch with ${b}. We'd love to hear from you.`,
  privacy: (b) => `Privacy Policy for ${b}. Learn how we protect your data.`,
  terms: (b) => `Terms and Conditions for ${b}. Read our policies before shopping.`,
};

function PagesSEOTab({ siteConfig }) {
  const siteId = siteConfig?.id;
  const brandName = siteConfig?.brandName || siteConfig?.brand_name || 'Store';
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!siteId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/site-admin/seo/pages?siteId=${siteId}`, {
          headers: getAuthHeader(),
        });
        const result = await res.json();
        if (result.success) setPages(result.data || []);
      } catch {}
      setLoading(false);
    })();
  }, [siteId]);

  function getAutoTitle(pageType) {
    const meta = PAGE_LABELS[pageType];
    return meta ? `${meta.label} | ${brandName}` : `${pageType} | ${brandName}`;
  }

  function getAutoDesc(pageType) {
    const gen = PAGE_DEFAULT_DESCS[pageType];
    return gen ? gen(brandName) : '';
  }

  function startEdit(page) {
    setEditingId(page.page_type);
    setEditForm({
      seo_title: page.seo_title || getAutoTitle(page.page_type),
      seo_description: page.seo_description || getAutoDesc(page.page_type),
      seo_og_image: page.seo_og_image || '',
      seo_keywords: page.seo_keywords || '',
    });
    setMsg(null);
  }

  async function handleSave(pageType) {
    setSaving(true);
    setMsg(null);
    try {
      const autoTitle = getAutoTitle(pageType);
      const autoDesc = getAutoDesc(pageType);
      const payload = {
        siteId,
        seo_title: editForm.seo_title === autoTitle ? '' : editForm.seo_title,
        seo_description: editForm.seo_description === autoDesc ? '' : editForm.seo_description,
        seo_og_image: editForm.seo_og_image,
        seo_keywords: editForm.seo_keywords,
      };
      const res = await fetch(`${API_BASE}/api/site-admin/seo/pages/${pageType}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success) {
        setPages(prev => prev.map(p => p.page_type === pageType ? { ...p, seo_title: payload.seo_title, seo_description: payload.seo_description, seo_og_image: payload.seo_og_image, seo_keywords: payload.seo_keywords } : p));
        setEditingId(null);
        setMsg({ type: 'success', text: 'Page SEO saved!' });
        setTimeout(() => setMsg(null), 3000);
      } else {
        setMsg({ type: 'error', text: result.error || 'Failed to save' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Failed to save' });
    }
    setSaving(false);
  }

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  return (
    <div>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
        Set custom SEO title and description for each static page. Fields are pre-filled with auto-generated defaults — edit to override.
      </p>

      {msg && <div className={`seo-msg ${msg.type}`} style={{ marginBottom: 12 }}>{msg.text}</div>}

      {pages.map(page => {
        const meta = PAGE_LABELS[page.page_type] || { label: page.page_type, icon: 'fa-file', path: `/${page.page_type}` };
        const autoTitle = getAutoTitle(page.page_type);
        return (
          <div key={page.page_type} className="card" style={{ marginBottom: 12 }}>
            <div className="card-content" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editingId === page.page_type ? 14 : 0 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    <i className={`fas ${meta.icon}`} style={{ marginRight: 6, color: '#64748b' }} />
                    {meta.label}
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
                    <span>{meta.path}</span>
                    <span style={{ color: '#64748b', fontStyle: 'italic' }} title={page.seo_title || autoTitle}>
                      {page.seo_title ? 'Custom' : 'Auto'}: {(page.seo_title || autoTitle).substring(0, 35)}{(page.seo_title || autoTitle).length > 35 ? '...' : ''}
                    </span>
                  </div>
                </div>
                {editingId !== page.page_type && (
                  <button className="btn btn-outline btn-sm" onClick={() => startEdit(page)}>
                    <i className="fas fa-pen" /> Edit SEO
                  </button>
                )}
              </div>

              {editingId === page.page_type && (
                <div>
                  <div className="seo-field">
                    <label>SEO Title</label>
                    <input
                      type="text"
                      value={editForm.seo_title}
                      onChange={e => setEditForm(p => ({ ...p, seo_title: e.target.value }))}
                      maxLength={70}
                    />
                    <CharCounter value={editForm.seo_title} max={60} />
                  </div>
                  <div className="seo-field">
                    <label>Meta Description</label>
                    <textarea
                      value={editForm.seo_description}
                      onChange={e => setEditForm(p => ({ ...p, seo_description: e.target.value }))}
                      rows={2}
                      maxLength={200}
                    />
                    <CharCounter value={editForm.seo_description} max={160} />
                  </div>
                  <div className="seo-field">
                    <label>Meta Keywords</label>
                    <input
                      type="text"
                      value={editForm.seo_keywords}
                      onChange={e => setEditForm(p => ({ ...p, seo_keywords: e.target.value }))}
                      placeholder={`e.g. ${meta.label.toLowerCase()}, ${brandName.toLowerCase()}`}
                      maxLength={200}
                    />
                    <div className="seo-hint">Comma-separated keywords for this page.</div>
                  </div>
                  <ImageUploadField
                    label="OG Image (for social sharing)"
                    hint="Upload an image for social sharing (1200x630px recommended)."
                    value={editForm.seo_og_image}
                    onChange={url => setEditForm(p => ({ ...p, seo_og_image: url }))}
                    siteId={siteId}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleSave(page.page_type)}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SocialPreview({ type, title, description, image, url, siteName }) {
  if (type === 'twitter') {
    return (
      <div className="seo-preview" style={{ borderLeft: '3px solid #1da1f2' }}>
        <div className="seo-preview-label" style={{ color: '#1da1f2' }}>Twitter Card Preview</div>
        {image && <div style={{ background: '#f1f5f9', borderRadius: 8, height: 120, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <img src={image} alt="" style={{ maxHeight: 120, maxWidth: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
        </div>}
        <div style={{ fontSize: 14, fontWeight: 600 }}>{title || 'Page Title'}</div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{description || 'Description will appear here.'}</div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{url || 'yoursite.com'}</div>
      </div>
    );
  }
  return (
    <div className="seo-preview" style={{ borderLeft: '3px solid #1877f2' }}>
      <div className="seo-preview-label" style={{ color: '#1877f2' }}>Facebook / Open Graph Preview</div>
      {image && <div style={{ background: '#f1f5f9', borderRadius: 8, height: 120, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <img src={image} alt="" style={{ maxHeight: 120, maxWidth: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
      </div>}
      <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>{siteName || 'Your Site'}</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{title || 'Page Title'}</div>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{description || 'Description will appear here.'}</div>
    </div>
  );
}

function SocialMediaTab({ siteConfig }) {
  const siteId = siteConfig?.id;
  const [form, setForm] = useState({
    og_title: '',
    og_description: '',
    og_image: '',
    og_type: 'website',
    twitter_card: 'summary_large_image',
    twitter_title: '',
    twitter_description: '',
    twitter_image: '',
    twitter_site: '',
  });
  const [defaults, setDefaults] = useState({ title: '', description: '', image: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const set = key => e => setForm(prev => ({ ...prev, [key]: e.target.value }));

  useEffect(() => {
    if (!siteId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/site-admin/seo/social?siteId=${siteId}`, {
          headers: getAuthHeader(),
        });
        const result = await res.json();
        if (result.success && result.data) {
          const d = result.data;
          setForm({
            og_title: d.og_title || '',
            og_description: d.og_description || '',
            og_image: d.og_image || '',
            og_type: d.og_type || 'website',
            twitter_card: d.twitter_card || 'summary_large_image',
            twitter_title: d.twitter_title || '',
            twitter_description: d.twitter_description || '',
            twitter_image: d.twitter_image || '',
            twitter_site: d.twitter_site || '',
          });
          if (d.defaults) setDefaults(d.defaults);
        }
      } catch {}
      setLoading(false);
    })();
  }, [siteId]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/site-admin/seo/social`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ siteId, ...form }),
      });
      const result = await res.json();
      setMsg(result.success
        ? { type: 'success', text: 'Social media tags saved!' }
        : { type: 'error', text: result.error || 'Failed to save' });
    } catch {
      setMsg({ type: 'error', text: 'Failed to save social media tags' });
    }
    setSaving(false);
    if (msg?.type === 'success') setTimeout(() => setMsg(null), 4000);
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading social media settings...</div>;

  const ogTitle = form.og_title || defaults.title;
  const ogDesc = form.og_description || defaults.description;
  const ogImg = form.og_image || defaults.image;
  const twTitle = form.twitter_title || form.og_title || defaults.title;
  const twDesc = form.twitter_description || form.og_description || defaults.description;
  const twImg = form.twitter_image || form.og_image || defaults.image;
  const storeUrl = getStoreUrl(siteConfig);

  return (
    <form onSubmit={handleSave}>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
        Control how your site appears when shared on Facebook, WhatsApp, Twitter/X, and other platforms. If left empty, values from your Site SEO settings are used as defaults.
      </p>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><h3 className="card-title"><i className="fab fa-facebook" style={{ marginRight: 8, color: '#1877f2' }} />Open Graph Tags</h3></div>
        <div className="card-content">
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 320px' }}>
              <div className="seo-field">
                <label>OG Title</label>
                <input type="text" value={form.og_title} onChange={set('og_title')} placeholder={defaults.title || 'Site title'} maxLength={70} />
                <div className="seo-hint">Leave empty to use your site SEO title.</div>
              </div>
              <div className="seo-field">
                <label>OG Description</label>
                <textarea value={form.og_description} onChange={set('og_description')} placeholder={defaults.description || 'Site description'} rows={2} maxLength={200} />
                <div className="seo-hint">Leave empty to use your site meta description.</div>
              </div>
              <div className="seo-field">
                <label>OG Type</label>
                <select value={form.og_type} onChange={set('og_type')}>
                  <option value="website">website</option>
                  <option value="article">article</option>
                  <option value="product">product</option>
                </select>
                <div className="seo-hint">Default type for your homepage. Product pages automatically use "product".</div>
              </div>
              <ImageUploadField
                label="OG Image"
                hint="Appears when your site is shared on Facebook, WhatsApp, etc. (1200x630px recommended)"
                value={form.og_image}
                onChange={url => setForm(prev => ({ ...prev, og_image: url }))}
                siteId={siteId}
              />
            </div>
            <div style={{ flex: '0 0 280px' }}>
              <SocialPreview type="og" title={ogTitle} description={ogDesc} image={ogImg ? (ogImg.startsWith('/') ? `${API_BASE}${ogImg}` : ogImg) : null} url={storeUrl} siteName={siteConfig?.brandName || siteConfig?.brand_name} />
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><h3 className="card-title"><i className="fab fa-twitter" style={{ marginRight: 8, color: '#1da1f2' }} />Twitter Card Tags</h3></div>
        <div className="card-content">
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 320px' }}>
              <div className="seo-field">
                <label>Card Type</label>
                <select value={form.twitter_card} onChange={set('twitter_card')}>
                  <option value="summary_large_image">Large Image (recommended)</option>
                  <option value="summary">Summary</option>
                </select>
              </div>
              <div className="seo-field">
                <label>Twitter Title</label>
                <input type="text" value={form.twitter_title} onChange={set('twitter_title')} placeholder={form.og_title || defaults.title || 'Same as OG title'} maxLength={70} />
                <div className="seo-hint">Leave empty to use OG title.</div>
              </div>
              <div className="seo-field">
                <label>Twitter Description</label>
                <textarea value={form.twitter_description} onChange={set('twitter_description')} placeholder={form.og_description || defaults.description || 'Same as OG description'} rows={2} maxLength={200} />
              </div>
              <div className="seo-field">
                <label>Twitter @handle</label>
                <input type="text" value={form.twitter_site} onChange={set('twitter_site')} placeholder="@yourbrand" maxLength={50} />
                <div className="seo-hint">Your Twitter/X handle (e.g. @fluxe_in)</div>
              </div>
              <ImageUploadField
                label="Twitter Image"
                hint="Leave empty to use OG image."
                value={form.twitter_image}
                onChange={url => setForm(prev => ({ ...prev, twitter_image: url }))}
                siteId={siteId}
              />
            </div>
            <div style={{ flex: '0 0 280px' }}>
              <SocialPreview type="twitter" title={twTitle} description={twDesc} image={twImg ? (twImg.startsWith('/') ? `${API_BASE}${twImg}` : twImg) : null} url={storeUrl} />
            </div>
          </div>
        </div>
      </div>

      {msg && <div className={`seo-msg ${msg.type}`}>{msg.text}</div>}

      <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: 8 }}>
        {saving ? 'Saving...' : 'Save Social Media Tags'}
      </button>
    </form>
  );
}

function SEOOverviewTab({ siteConfig }) {
  const brandName = siteConfig?.brandName || siteConfig?.brand_name || 'Your Store';
  const logoUrl = siteConfig?.logoUrl || siteConfig?.logo_url || null;
  const email = siteConfig?.email || null;
  const phone = siteConfig?.phone || null;
  const primaryColor = siteConfig?.primaryColor || siteConfig?.primary_color || '#000000';
  const storeUrl = getStoreUrl(siteConfig);

  let socialLinks = [];
  try {
    const rawLinks = siteConfig?.socialLinks || siteConfig?.social_links;
    if (rawLinks) {
      const links = typeof rawLinks === 'string' ? JSON.parse(rawLinks) : rawLinks;
      socialLinks = Object.values(links).filter(Boolean);
    }
  } catch {}

  const autoManaged = [
    { tag: 'Viewport', detail: '<meta name="viewport" content="width=device-width, initial-scale=1.0">', icon: 'fa-mobile-alt' },
    { tag: 'Charset', detail: '<meta charset="UTF-8">', icon: 'fa-font' },
    { tag: 'Canonical URL', detail: `Auto-set for every page (e.g. ${storeUrl}/product/your-product)`, icon: 'fa-link' },
    { tag: 'Theme Color', detail: `<meta name="theme-color" content="${primaryColor}"> — colors the mobile browser bar`, icon: 'fa-palette' },
  ];

  const schemaItems = [
    {
      tag: 'Organization Schema',
      icon: 'fa-building',
      values: [
        { label: 'Name', value: brandName },
        { label: 'Logo', value: logoUrl ? 'Set' : 'Not set — add a logo in Store Settings' },
        { label: 'Email', value: email || 'Not set' },
        { label: 'Phone', value: phone || 'Not set' },
        { label: 'Social Links', value: socialLinks.length > 0 ? `${socialLinks.length} linked` : 'None — add in Store Settings' },
      ],
      editHint: 'Edit in Store Settings',
    },
    {
      tag: 'WebSite Schema',
      icon: 'fa-globe',
      values: [
        { label: 'Site Name', value: brandName },
        { label: 'URL', value: storeUrl },
        { label: 'Search Action', value: `${storeUrl}/search?q={query}` },
      ],
    },
    {
      tag: 'Product Schema',
      icon: 'fa-box',
      values: [
        { label: 'Includes', value: 'Name, price, currency, availability, images, SKU, barcode' },
        { label: 'Reviews', value: 'AggregateRating + individual reviews (when available)' },
        { label: 'Shipping', value: 'Delivery time, handling time, destination country' },
        { label: 'Returns', value: '7-day return window, free returns' },
      ],
      editHint: 'Data comes from your product details',
    },
    {
      tag: 'BreadcrumbList Schema',
      icon: 'fa-sitemap',
      values: [
        { label: 'Example', value: 'Home > Category > Product Name' },
      ],
    },
    {
      tag: 'Category Schema (ItemList)',
      icon: 'fa-folder-open',
      values: [
        { label: 'Includes', value: 'Category name, product list with URLs' },
      ],
    },
    {
      tag: 'Article Schema',
      icon: 'fa-newspaper',
      values: [
        { label: 'Includes', value: 'Headline, excerpt, author, published date, modified date' },
      ],
      editHint: 'Data comes from your blog posts',
    },
  ];

  const editableItems = [
    { item: 'Site Title & Description', where: 'Site SEO tab', icon: 'fa-heading' },
    { item: 'Meta Keywords', where: 'Site SEO, Products, Categories, Pages tabs', icon: 'fa-tags' },
    { item: 'Robots (index/noindex)', where: 'Site SEO tab > Advanced Settings', icon: 'fa-robot' },
    { item: 'Author', where: 'Auto-set from your brand name', icon: 'fa-user', value: brandName },
    { item: 'OG Title, Description, Image', where: 'Social Media tab', icon: 'fa-share-alt' },
    { item: 'OG Type', where: 'Social Media tab (auto "product" on product pages)', icon: 'fa-share-nodes' },
    { item: 'OG Locale', where: 'Currently set to en_US', icon: 'fa-language', value: 'en_US' },
    { item: 'Twitter Card, Title, Image', where: 'Social Media tab', icon: 'fa-hashtag' },
    { item: 'Google Verification', where: 'Site SEO tab > Advanced Settings', icon: 'fa-check-double' },
    { item: 'Per-Page SEO', where: 'Products, Categories, Pages tabs', icon: 'fa-file-alt' },
    { item: 'OG Image per Product/Category', where: 'Products & Categories tabs (auto-uses product image if not set)', icon: 'fa-image' },
  ];

  return (
    <div>
      <div className="seo-overview-section">
        <div className="seo-overview-header">
          <i className="fas fa-check-circle" style={{ color: '#22c55e', marginRight: 8 }} />
          Auto-Managed Tags
        </div>
        <p className="seo-overview-desc">
          These tags are set automatically for every page. No action needed.
        </p>
        <div className="seo-overview-grid">
          {autoManaged.map(item => (
            <div key={item.tag} className="seo-overview-item">
              <div className="seo-overview-item-header">
                <i className={`fas ${item.icon}`} />
                <span>{item.tag}</span>
              </div>
              <div className="seo-overview-item-detail">{item.detail}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="seo-overview-section" style={{ marginTop: 24 }}>
        <div className="seo-overview-header">
          <i className="fas fa-code" style={{ color: '#8b5cf6', marginRight: 8 }} />
          Structured Data (JSON-LD Schemas)
        </div>
        <p className="seo-overview-desc">
          Rich data that helps Google understand your store. Generated from your store information — verify the values below are correct.
        </p>
        <div className="seo-overview-grid">
          {schemaItems.map(item => (
            <div key={item.tag} className="seo-overview-item" style={{ background: '#faf5ff', borderColor: '#e9d5ff' }}>
              <div className="seo-overview-item-header">
                <i className={`fas ${item.icon}`} />
                <span>{item.tag}</span>
              </div>
              <div style={{ paddingLeft: 24, marginTop: 4 }}>
                {item.values.map(v => (
                  <div key={v.label} style={{ fontSize: 12, color: '#374151', marginBottom: 3, display: 'flex', gap: 6 }}>
                    <span style={{ color: '#94a3b8', minWidth: 80, flexShrink: 0 }}>{v.label}:</span>
                    <span style={{ color: v.value === 'Not set' || v.value?.includes('Not set') ? '#f59e0b' : '#374151' }}>{v.value}</span>
                  </div>
                ))}
                {item.editHint && (
                  <div style={{ fontSize: 11, color: '#8b5cf6', marginTop: 4, fontStyle: 'italic' }}>{item.editHint}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="seo-overview-section" style={{ marginTop: 24 }}>
        <div className="seo-overview-header">
          <i className="fas fa-pen" style={{ color: '#3b82f6', marginRight: 8 }} />
          Customizable by You
        </div>
        <p className="seo-overview-desc">
          These fields can be customized using the other tabs. Smart defaults are used automatically if left empty.
        </p>
        <div className="seo-overview-grid">
          {editableItems.map(item => (
            <div key={item.item} className="seo-overview-item seo-overview-item-custom">
              <div className="seo-overview-item-header">
                <i className={`fas ${item.icon}`} />
                <span>{item.item}</span>
              </div>
              <div className="seo-overview-item-detail">
                {item.value ? (
                  <span>Current: <strong>{item.value}</strong> — {item.where}</span>
                ) : (
                  item.where
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'fa-info-circle' },
  { id: 'site', label: 'Site SEO', icon: 'fa-globe' },
  { id: 'social', label: 'Social Media', icon: 'fa-share-alt' },
  { id: 'pages', label: 'Pages', icon: 'fa-file-alt' },
  { id: 'categories', label: 'Categories', icon: 'fa-folder' },
  { id: 'products', label: 'Products', icon: 'fa-box' },
];

export default function SEOSection() {
  const { siteConfig } = useContext(SiteContext);
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="seo-section">
      <div className="seo-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`seo-tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <i className={`fas ${tab.icon}`} style={{ marginRight: 6 }} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <SEOOverviewTab siteConfig={siteConfig} />}
      {activeTab === 'site' && <SiteSEOTab siteConfig={siteConfig} />}
      {activeTab === 'social' && <SocialMediaTab siteConfig={siteConfig} />}
      {activeTab === 'pages' && <PagesSEOTab siteConfig={siteConfig} />}
      {activeTab === 'categories' && <CategoriesSEOTab siteConfig={siteConfig} />}
      {activeTab === 'products' && <ProductsSEOTab siteConfig={siteConfig} />}
    </div>
  );
}
