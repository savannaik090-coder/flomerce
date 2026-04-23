import React, { useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { SiteContext } from '../../context/SiteContext.jsx';
import './SEOSection.css';
import { API_BASE, PLATFORM_DOMAIN } from '../../config.js';
import { usePendingMedia } from '../../hooks/usePendingMedia.js';

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

function ImageUploadField({ label, hint, value, onChange, siteId, markUploaded, markForDeletion }) {
  const { t } = useTranslation('admin');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const imgSrc = value ? (value.startsWith('/') ? `${API_BASE}${value}` : value) : null;

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setError(t('seoSection.errImageType'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(t('seoSection.errImageSize'));
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
        markUploaded?.(urls[0]);
        if (oldValue) markForDeletion?.(oldValue);
      } else {
        setError(result.error || t('seoSection.uploadFailed'));
      }
    } catch {
      setError(t('seoSection.uploadFailed'));
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
            <button type="button" onClick={() => { if (value) markForDeletion?.(value); onChange(''); }} style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&times;</button>
          </div>
        ) : null}
        <div style={{ flex: 1 }}>
          <label className="btn btn-outline" style={{ fontSize: 13, padding: '8px 16px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: uploading ? 0.6 : 1 }}>
            <i className={`fas ${uploading ? 'fa-spinner fa-spin' : 'fa-upload'}`} />
            {uploading ? t('seoSection.uploading') : value ? t('seoSection.changeImage') : t('seoSection.uploadImage')}
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
  const { t } = useTranslation('admin');
  const displayTitle = title || t('seoSection.previewDefaultTitle');
  const displayDesc = description || t('seoSection.previewDefaultDesc');
  const displayUrl = url || window.location.origin;

  return (
    <div className="seo-preview">
      <div className="seo-preview-label">{t('seoSection.googlePreview')}</div>
      <div className="seo-preview-title">{displayTitle}</div>
      <div className="seo-preview-url">{displayUrl}</div>
      <div className="seo-preview-desc">{displayDesc}</div>
    </div>
  );
}

function getDefaultSEOTitle(brandName, t) {
  return t('seoSection.defaultTitleTpl', { brand: brandName || t('seoSection.defaultBrand') });
}

function getDefaultSEODescription(brandName, category, t) {
  const safeBrand = brandName || t('seoSection.defaultBrand');
  const key = `seoSection.categoryDesc.${category}`;
  const fallback = t('seoSection.categoryDesc.general', { brand: safeBrand });
  return t(key, { brand: safeBrand, defaultValue: fallback });
}

function SiteSEOTab({ siteConfig }) {
  const { t } = useTranslation('admin');
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
  const { markUploaded, markForDeletion, commit } = usePendingMedia(siteId);

  const brandName = apiBrandName || siteConfig?.brandName || siteConfig?.brand_name || t('seoSection.defaultBrand');
  const defaultTitle = getDefaultSEOTitle(brandName, t);
  const defaultDescription = getDefaultSEODescription(brandName, siteCategory, t);

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
      setMsg({ type: 'error', text: t('seoSection.errFaviconType') });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMsg({ type: 'error', text: t('seoSection.errFaviconSize') });
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
        markUploaded(urls[0]);
        if (oldFavicon) markForDeletion(oldFavicon);
        setMsg({ type: 'success', text: t('seoSection.faviconUploaded') });
        setTimeout(() => setMsg(null), 4000);
      } else {
        setMsg({ type: 'error', text: result.error || t('seoSection.uploadFailed') });
      }
    } catch {
      setMsg({ type: 'error', text: t('seoSection.errFaviconUpload') });
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
      if (result.success) {
        setMsg({ type: 'success', text: t('seoSection.savedSeo') });
        commit(form.favicon_url ? [form.favicon_url] : []);
      } else {
        setMsg({ type: 'error', text: result.error || t('seoSection.failedSave') });
      }
    } catch {
      setMsg({ type: 'error', text: t('seoSection.errSaveSeo') });
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
        <div className="card-header"><h3 className="card-title">{t('seoSection.faviconCard')}</h3></div>
        <div className="card-content">
          <div className="seo-field">
            <label>{t('seoSection.siteFavicon')}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {form.favicon_url ? (
                <div style={{ position: 'relative', width: 48, height: 48, borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', flexShrink: 0 }}>
                  <img
                    src={form.favicon_url.startsWith('/') ? `${API_BASE}${form.favicon_url}` : form.favicon_url}
                    alt={t('seoSection.faviconAlt')}
                    style={{ maxWidth: 32, maxHeight: 32, objectFit: 'contain' }}
                  />
                  <button
                    type="button"
                    onClick={() => { if (form.favicon_url) markForDeletion(form.favicon_url); setForm(prev => ({ ...prev, favicon_url: '' })); }}
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
                  {faviconUploading ? t('seoSection.uploading') : form.favicon_url ? t('seoSection.changeFavicon') : t('seoSection.uploadFavicon')}
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
            <div className="seo-hint">{t('seoSection.faviconHint')}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><h3 className="card-title">{t('seoSection.siteWideCard')}</h3></div>
        <div className="card-content">

          <div className="seo-field">
            <label>{t('seoSection.siteTitle')}</label>
            <input
              type="text"
              value={form.seo_title || defaultTitle}
              onChange={e => setForm(prev => ({ ...prev, seo_title: e.target.value === defaultTitle ? '' : e.target.value }))}
              maxLength={70}
            />
            <CharCounter value={form.seo_title || defaultTitle} max={60} />
            <div className="seo-hint">{t('seoSection.siteTitleHint')}</div>
          </div>

          <div className="seo-field">
            <label>{t('seoSection.metaDescription')}</label>
            <textarea
              value={form.seo_description || defaultDescription}
              onChange={e => setForm(prev => ({ ...prev, seo_description: e.target.value === defaultDescription ? '' : e.target.value }))}
              maxLength={200}
              rows={3}
            />
            <CharCounter value={form.seo_description || defaultDescription} max={160} />
            <div className="seo-hint">{t('seoSection.metaDescHint')}</div>
          </div>

          <div className="seo-field">
            <label>{t('seoSection.metaKeywords')}</label>
            <input
              type="text"
              value={form.seo_keywords}
              onChange={set('seo_keywords')}
              placeholder={t('seoSection.siteKeywordsPlaceholder', { brand: brandName.toLowerCase() })}
              maxLength={200}
            />
            <div className="seo-hint">{t('seoSection.siteKeywordsHint')}</div>
          </div>

        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><h3 className="card-title">{t('seoSection.advancedCard')}</h3></div>
        <div className="card-content">

          <div className="seo-field">
            <label>{t('seoSection.indexing')}</label>
            <select value={form.seo_robots} onChange={set('seo_robots')}>
              <option value="index, follow">{t('seoSection.robotsAllow')}</option>
              <option value="noindex, follow">{t('seoSection.robotsNoindex')}</option>
              <option value="index, nofollow">{t('seoSection.robotsIndexNoFollow')}</option>
              <option value="noindex, nofollow">{t('seoSection.robotsBlockAll')}</option>
            </select>
            <div className="seo-hint">{t('seoSection.indexingHint')}</div>
          </div>

          <div className="seo-field">
            <label>{t('seoSection.googleVerification')}</label>
            <input
              type="text"
              value={form.google_verification}
              onChange={set('google_verification')}
              placeholder={t('seoSection.googleVerificationPlaceholder')}
            />
            <div className="seo-hint">
              {t('seoSection.googleVerificationHint')}
            </div>
          </div>

        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><h3 className="card-title">{t('seoSection.sitemapCard')}</h3></div>
        <div className="card-content">
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
            {t('seoSection.sitemapDesc')}
          </p>

          <div className="seo-sitemap-box">
            <span className="seo-sitemap-url">{storeUrl}/sitemap.xml</span>
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: 12, padding: '6px 12px', whiteSpace: 'nowrap' }}
              onClick={() => copyToClipboard(`${storeUrl}/sitemap.xml`)}
            >
              {t('seoSection.copyUrl')}
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
              {t('seoSection.copyUrl')}
            </button>
          </div>
        </div>
      </div>

      {msg && <div className={`seo-msg ${msg.type}`}>{msg.text}</div>}

      <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: 8 }}>
        {saving ? t('seoSection.saving') : t('seoSection.saveSeoSettings')}
      </button>
    </form>
  );
}

function CategoriesSEOTab({ siteConfig }) {
  const { t } = useTranslation('admin');
  const siteId = siteConfig?.id;
  const brandName = siteConfig?.brandName || siteConfig?.brand_name || t('seoSection.fallbackStore');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const { markUploaded, markForDeletion, commit } = usePendingMedia(siteId);

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
    return cat.description || t('seoSection.browseCollection', { name: cat.name });
  }

  function startEdit(cat) {
    setEditingId(cat.id);
    setEditForm({
      seo_title: cat.seo_title || getAutoTitle(cat),
      seo_description: cat.seo_description || getAutoDesc(cat),
      seo_og_image: cat.seo_og_image || '',
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
        const nextCategories = categories.map(c => c.id === catId ? { ...c, seo_title: payload.seo_title, seo_description: payload.seo_description, seo_og_image: payload.seo_og_image, seo_keywords: payload.seo_keywords } : c);
        setCategories(nextCategories);
        setEditingId(null);
        commit(nextCategories.map(c => c.seo_og_image).filter(Boolean));
        setMsg({ type: 'success', text: t('seoSection.savedCategory') });
        setTimeout(() => setMsg(null), 3000);
      } else {
        setMsg({ type: 'error', text: result.error || t('seoSection.failedSave') });
      }
    } catch {
      setMsg({ type: 'error', text: t('seoSection.failedSave') });
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
          {t('seoSection.noCategoriesFound')}
        </div>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
        {t('seoSection.categoriesIntro')}
      </p>

      {msg && <div className={`seo-msg ${msg.type}`} style={{ marginBottom: 12 }}>{msg.text}</div>}

      {categories.map(cat => {
        const catImgSrc = getCatImgSrc(cat);
        const autoTitle = getAutoTitle(cat);
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
                        {cat.seo_title ? t('seoSection.custom') : t('seoSection.auto')}: {(cat.seo_title || autoTitle).substring(0, 35)}{(cat.seo_title || autoTitle).length > 35 ? '...' : ''}
                      </span>
                    </div>
                  </div>
                </div>
                {editingId !== cat.id && (
                  <button className="btn btn-outline btn-sm" onClick={() => startEdit(cat)} style={{ flexShrink: 0 }}>
                    <i className="fas fa-pen" /> {t('seoSection.editSeo')}
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
                    <label>{t('seoSection.seoTitle')}</label>
                    <input
                      type="text"
                      value={editForm.seo_title}
                      onChange={e => setEditForm(p => ({ ...p, seo_title: e.target.value }))}
                      maxLength={70}
                    />
                    <CharCounter value={editForm.seo_title} max={60} />
                  </div>
                  <div className="seo-field">
                    <label>{t('seoSection.metaDescription')}</label>
                    <textarea
                      value={editForm.seo_description}
                      onChange={e => setEditForm(p => ({ ...p, seo_description: e.target.value }))}
                      rows={2}
                      maxLength={200}
                    />
                    <CharCounter value={editForm.seo_description} max={160} />
                  </div>
                  <div className="seo-field">
                    <label>{t('seoSection.metaKeywords')}</label>
                    <input
                      type="text"
                      value={editForm.seo_keywords}
                      onChange={e => setEditForm(p => ({ ...p, seo_keywords: e.target.value }))}
                      placeholder={t('seoSection.categoryKeywordsPlaceholder', { name: cat.name.toLowerCase(), brand: brandName.toLowerCase() })}
                      maxLength={200}
                    />
                    <div className="seo-hint">{t('seoSection.categoryKeywordsHint')}</div>
                  </div>
                  <ImageUploadField
                    label={t('seoSection.ogImageLabel')}
                    hint={t('seoSection.ogImageHintCategory')}
                    value={editForm.seo_og_image}
                    onChange={url => setEditForm(p => ({ ...p, seo_og_image: url }))}
                    siteId={siteId}
                    markUploaded={markUploaded}
                    markForDeletion={markForDeletion}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleSave(cat.id)}
                      disabled={saving}
                    >
                      {saving ? t('seoSection.saving') : t('seoSection.save')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setEditingId(null)}
                    >
                      {t('seoSection.cancel')}
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
  const { t } = useTranslation('admin');
  const siteId = siteConfig?.id;
  const brandName = siteConfig?.brandName || siteConfig?.brand_name || t('seoSection.fallbackStore');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [search, setSearch] = useState('');
  const { markUploaded, markForDeletion, commit } = usePendingMedia(siteId);

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
      seo_og_image: product.seo_og_image || '',
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
        const nextProducts = products.map(p => p.id === productId ? { ...p, seo_title: payload.seo_title, seo_description: payload.seo_description, seo_og_image: payload.seo_og_image, seo_keywords: payload.seo_keywords } : p);
        setProducts(nextProducts);
        setEditingId(null);
        commit(nextProducts.map(p => p.seo_og_image).filter(Boolean));
        setMsg({ type: 'success', text: t('seoSection.savedProduct') });
        setTimeout(() => setMsg(null), 3000);
      } else {
        setMsg({ type: 'error', text: result.error || t('seoSection.failedSave') });
      }
    } catch {
      setMsg({ type: 'error', text: t('seoSection.failedSave') });
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
          {t('seoSection.noProductsFound')}
        </div>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        {t('seoSection.productsIntro')}
      </p>

      <div className="seo-field" style={{ marginBottom: 16 }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('seoSection.searchProducts')}
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
                        {product.seo_title ? t('seoSection.custom') : t('seoSection.auto')}: {(product.seo_title || autoTitle).substring(0, 35)}{(product.seo_title || autoTitle).length > 35 ? '...' : ''}
                      </span>
                    </div>
                  </div>
                </div>
                {editingId !== product.id && (
                  <button className="btn btn-outline btn-sm" onClick={() => startEdit(product)} style={{ flexShrink: 0 }}>
                    <i className="fas fa-pen" /> {t('seoSection.editSeo')}
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
                    <label>{t('seoSection.seoTitle')}</label>
                    <input
                      type="text"
                      value={editForm.seo_title}
                      onChange={e => setEditForm(p => ({ ...p, seo_title: e.target.value }))}
                      maxLength={70}
                    />
                    <CharCounter value={editForm.seo_title} max={60} />
                  </div>
                  <div className="seo-field">
                    <label>{t('seoSection.metaDescription')}</label>
                    <textarea
                      value={editForm.seo_description}
                      onChange={e => setEditForm(p => ({ ...p, seo_description: e.target.value }))}
                      rows={2}
                      maxLength={200}
                    />
                    <CharCounter value={editForm.seo_description} max={160} />
                  </div>
                  <div className="seo-field">
                    <label>{t('seoSection.metaKeywords')}</label>
                    <input
                      type="text"
                      value={editForm.seo_keywords}
                      onChange={e => setEditForm(p => ({ ...p, seo_keywords: e.target.value }))}
                      placeholder={t('seoSection.productKeywordsPlaceholder', { name: product.name.toLowerCase(), brand: brandName.toLowerCase() })}
                      maxLength={200}
                    />
                    <div className="seo-hint">{t('seoSection.productKeywordsHint')}</div>
                  </div>
                  <ImageUploadField
                    label={t('seoSection.ogImageLabel')}
                    hint={t('seoSection.ogImageHintProduct')}
                    value={editForm.seo_og_image}
                    onChange={url => setEditForm(p => ({ ...p, seo_og_image: url }))}
                    siteId={siteId}
                    markUploaded={markUploaded}
                    markForDeletion={markForDeletion}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleSave(product.id)}
                      disabled={saving}
                    >
                      {saving ? t('seoSection.saving') : t('seoSection.save')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setEditingId(null)}
                    >
                      {t('seoSection.cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: 24 }}>{t('seoSection.noSearchMatch')}</div>
      )}
    </div>
  );
}

function PagesSEOTab({ siteConfig }) {
  const { t } = useTranslation('admin');
  const siteId = siteConfig?.id;
  const brandName = siteConfig?.brandName || siteConfig?.brand_name || t('seoSection.fallbackStore');
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const { markUploaded, markForDeletion, commit } = usePendingMedia(siteId);

  const PAGE_LABELS = {
    home: { label: t('seoSection.pageLabels.home'), icon: 'fa-home', path: '/' },
    about: { label: t('seoSection.pageLabels.about'), icon: 'fa-info-circle', path: '/about' },
    contact: { label: t('seoSection.pageLabels.contact'), icon: 'fa-envelope', path: '/contact' },
    privacy: { label: t('seoSection.pageLabels.privacy'), icon: 'fa-shield-alt', path: '/privacy-policy' },
    terms: { label: t('seoSection.pageLabels.terms'), icon: 'fa-file-contract', path: '/terms' },
  };

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
    const key = `seoSection.pageDefaultDesc.${pageType}`;
    const fallback = '';
    return t(key, { brand: brandName, defaultValue: fallback });
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
        const nextPages = pages.map(p => p.page_type === pageType ? { ...p, seo_title: payload.seo_title, seo_description: payload.seo_description, seo_og_image: payload.seo_og_image, seo_keywords: payload.seo_keywords } : p);
        setPages(nextPages);
        setEditingId(null);
        commit(nextPages.map(p => p.seo_og_image).filter(Boolean));
        setMsg({ type: 'success', text: t('seoSection.savedPage') });
        setTimeout(() => setMsg(null), 3000);
      } else {
        setMsg({ type: 'error', text: result.error || t('seoSection.failedSave') });
      }
    } catch {
      setMsg({ type: 'error', text: t('seoSection.failedSave') });
    }
    setSaving(false);
  }

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  return (
    <div>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
        {t('seoSection.pagesIntro')}
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
                    <i className={`fas ${meta.icon}`} style={{ marginInlineEnd: 6, color: '#64748b' }} />
                    {meta.label}
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
                    <span>{meta.path}</span>
                    <span style={{ color: '#64748b', fontStyle: 'italic' }} title={page.seo_title || autoTitle}>
                      {page.seo_title ? t('seoSection.custom') : t('seoSection.auto')}: {(page.seo_title || autoTitle).substring(0, 35)}{(page.seo_title || autoTitle).length > 35 ? '...' : ''}
                    </span>
                  </div>
                </div>
                {editingId !== page.page_type && (
                  <button className="btn btn-outline btn-sm" onClick={() => startEdit(page)}>
                    <i className="fas fa-pen" /> {t('seoSection.editSeo')}
                  </button>
                )}
              </div>

              {editingId === page.page_type && (
                <div>
                  <div className="seo-field">
                    <label>{t('seoSection.seoTitle')}</label>
                    <input
                      type="text"
                      value={editForm.seo_title}
                      onChange={e => setEditForm(p => ({ ...p, seo_title: e.target.value }))}
                      maxLength={70}
                    />
                    <CharCounter value={editForm.seo_title} max={60} />
                  </div>
                  <div className="seo-field">
                    <label>{t('seoSection.metaDescription')}</label>
                    <textarea
                      value={editForm.seo_description}
                      onChange={e => setEditForm(p => ({ ...p, seo_description: e.target.value }))}
                      rows={2}
                      maxLength={200}
                    />
                    <CharCounter value={editForm.seo_description} max={160} />
                  </div>
                  <div className="seo-field">
                    <label>{t('seoSection.metaKeywords')}</label>
                    <input
                      type="text"
                      value={editForm.seo_keywords}
                      onChange={e => setEditForm(p => ({ ...p, seo_keywords: e.target.value }))}
                      placeholder={t('seoSection.pageKeywordsPlaceholder', { label: meta.label.toLowerCase(), brand: brandName.toLowerCase() })}
                      maxLength={200}
                    />
                    <div className="seo-hint">{t('seoSection.pageKeywordsHint')}</div>
                  </div>
                  <ImageUploadField
                    label={t('seoSection.ogImageLabel')}
                    hint={t('seoSection.ogImageHintGeneric')}
                    value={editForm.seo_og_image}
                    onChange={url => setEditForm(p => ({ ...p, seo_og_image: url }))}
                    siteId={siteId}
                    markUploaded={markUploaded}
                    markForDeletion={markForDeletion}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleSave(page.page_type)}
                      disabled={saving}
                    >
                      {saving ? t('seoSection.saving') : t('seoSection.save')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setEditingId(null)}
                    >
                      {t('seoSection.cancel')}
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
  const { t } = useTranslation('admin');
  if (type === 'twitter') {
    return (
      <div className="seo-preview" style={{ borderInlineStart: '3px solid #1da1f2' }}>
        <div className="seo-preview-label" style={{ color: '#1da1f2' }}>{t('seoSection.twitterPreview')}</div>
        {image && <div style={{ background: '#f1f5f9', borderRadius: 8, height: 120, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <img src={image} alt="" style={{ maxHeight: 120, maxWidth: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
        </div>}
        <div style={{ fontSize: 14, fontWeight: 600 }}>{title || t('seoSection.previewDefaultTitle')}</div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{description || t('seoSection.previewSocialDesc')}</div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{url || t('seoSection.previewDefaultUrl')}</div>
      </div>
    );
  }
  return (
    <div className="seo-preview" style={{ borderInlineStart: '3px solid #1877f2' }}>
      <div className="seo-preview-label" style={{ color: '#1877f2' }}>{t('seoSection.facebookPreview')}</div>
      {image && <div style={{ background: '#f1f5f9', borderRadius: 8, height: 120, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <img src={image} alt="" style={{ maxHeight: 120, maxWidth: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
      </div>}
      <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>{siteName || t('seoSection.previewDefaultSite')}</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{title || t('seoSection.previewDefaultTitle')}</div>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{description || t('seoSection.previewSocialDesc')}</div>
    </div>
  );
}

function SocialMediaTab({ siteConfig }) {
  const { t } = useTranslation('admin');
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
  const { markUploaded, markForDeletion, commit } = usePendingMedia(siteId);

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
      if (result.success) {
        setMsg({ type: 'success', text: t('seoSection.savedSocial') });
        commit([form.og_image, form.twitter_image].filter(Boolean));
      } else {
        setMsg({ type: 'error', text: result.error || t('seoSection.failedSave') });
      }
    } catch {
      setMsg({ type: 'error', text: t('seoSection.errSaveSocial') });
    }
    setSaving(false);
    if (msg?.type === 'success') setTimeout(() => setMsg(null), 4000);
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>{t('seoSection.loadingSocial')}</div>;

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
        {t('seoSection.socialIntro')}
      </p>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><h3 className="card-title"><i className="fab fa-facebook" style={{ marginInlineEnd: 8, color: '#1877f2' }} />{t('seoSection.openGraphTags')}</h3></div>
        <div className="card-content">
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 320px' }}>
              <div className="seo-field">
                <label>{t('seoSection.ogTitle')}</label>
                <input type="text" value={form.og_title} onChange={set('og_title')} placeholder={defaults.title || t('seoSection.ogTitlePlaceholder')} maxLength={70} />
                <div className="seo-hint">{t('seoSection.ogTitleHint')}</div>
              </div>
              <div className="seo-field">
                <label>{t('seoSection.ogDescription')}</label>
                <textarea value={form.og_description} onChange={set('og_description')} placeholder={defaults.description || t('seoSection.ogDescPlaceholder')} rows={2} maxLength={200} />
                <div className="seo-hint">{t('seoSection.ogDescHint')}</div>
              </div>
              <div className="seo-field">
                <label>{t('seoSection.ogType')}</label>
                <select value={form.og_type} onChange={set('og_type')}>
                  <option value="website">website</option>
                  <option value="article">article</option>
                  <option value="product">product</option>
                </select>
                <div className="seo-hint">{t('seoSection.ogTypeHint')}</div>
              </div>
              <ImageUploadField
                label={t('seoSection.ogImageLabel')}
                hint={t('seoSection.ogImageHintHome')}
                value={form.og_image}
                onChange={url => setForm(prev => ({ ...prev, og_image: url }))}
                siteId={siteId}
                markUploaded={markUploaded}
                markForDeletion={markForDeletion}
              />
            </div>
            <div style={{ flex: '0 0 280px' }}>
              <SocialPreview type="og" title={ogTitle} description={ogDesc} image={ogImg ? (ogImg.startsWith('/') ? `${API_BASE}${ogImg}` : ogImg) : null} url={storeUrl} siteName={siteConfig?.brandName || siteConfig?.brand_name} />
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><h3 className="card-title"><i className="fab fa-twitter" style={{ marginInlineEnd: 8, color: '#1da1f2' }} />{t('seoSection.twitterTags')}</h3></div>
        <div className="card-content">
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 320px' }}>
              <div className="seo-field">
                <label>{t('seoSection.cardType')}</label>
                <select value={form.twitter_card} onChange={set('twitter_card')}>
                  <option value="summary_large_image">{t('seoSection.cardLarge')}</option>
                  <option value="summary">{t('seoSection.cardSummary')}</option>
                </select>
              </div>
              <div className="seo-field">
                <label>{t('seoSection.twitterTitle')}</label>
                <input type="text" value={form.twitter_title} onChange={set('twitter_title')} placeholder={form.og_title || defaults.title || t('seoSection.sameAsOgTitle')} maxLength={70} />
                <div className="seo-hint">{t('seoSection.twitterTitleHint')}</div>
              </div>
              <div className="seo-field">
                <label>{t('seoSection.twitterDescription')}</label>
                <textarea value={form.twitter_description} onChange={set('twitter_description')} placeholder={form.og_description || defaults.description || t('seoSection.sameAsOgDesc')} rows={2} maxLength={200} />
              </div>
              <div className="seo-field">
                <label>{t('seoSection.twitterHandle')}</label>
                <input type="text" value={form.twitter_site} onChange={set('twitter_site')} placeholder="@yourbrand" maxLength={50} />
                <div className="seo-hint">{t('seoSection.twitterHandleHint')}</div>
              </div>
              <ImageUploadField
                label={t('seoSection.twitterImage')}
                hint={t('seoSection.twitterImageHint')}
                value={form.twitter_image}
                onChange={url => setForm(prev => ({ ...prev, twitter_image: url }))}
                siteId={siteId}
                markUploaded={markUploaded}
                markForDeletion={markForDeletion}
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
        {saving ? t('seoSection.saving') : t('seoSection.saveSocial')}
      </button>
    </form>
  );
}

function SEOOverviewTab({ siteConfig }) {
  const { t } = useTranslation('admin');
  const brandName = siteConfig?.brandName || siteConfig?.brand_name || t('seoSection.defaultBrand');
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

  const NOT_SET = t('seoSection.notSet');
  const SET = t('seoSection.set');

  const autoManaged = [
    { tag: t('seoSection.tags.viewport'), detail: '<meta name="viewport" content="width=device-width, initial-scale=1.0">', icon: 'fa-mobile-alt' },
    { tag: t('seoSection.tags.charset'), detail: '<meta charset="UTF-8">', icon: 'fa-font' },
    { tag: t('seoSection.tags.canonical'), detail: t('seoSection.tags.canonicalDetail', { url: `${storeUrl}/product/your-product` }), icon: 'fa-link' },
    { tag: t('seoSection.tags.themeColor'), detail: t('seoSection.tags.themeColorDetail', { color: primaryColor }), icon: 'fa-palette' },
  ];

  const schemaItems = [
    {
      tag: t('seoSection.schema.organization'),
      icon: 'fa-building',
      values: [
        { label: t('seoSection.schema.name'), value: brandName },
        { label: t('seoSection.schema.logo'), value: logoUrl ? SET : t('seoSection.schema.notSetLogo') },
        { label: t('seoSection.schema.email'), value: email || NOT_SET },
        { label: t('seoSection.schema.phone'), value: phone || NOT_SET },
        { label: t('seoSection.schema.socialLinks'), value: socialLinks.length > 0 ? t('seoSection.schema.socialLinked', { count: socialLinks.length }) : t('seoSection.schema.noneSocial') },
      ],
      editHint: t('seoSection.schema.editStoreSettings'),
    },
    {
      tag: t('seoSection.schema.website'),
      icon: 'fa-globe',
      values: [
        { label: t('seoSection.schema.siteName'), value: brandName },
        { label: t('seoSection.schema.url'), value: storeUrl },
        { label: t('seoSection.schema.searchAction'), value: `${storeUrl}/search?q={query}` },
      ],
    },
    {
      tag: t('seoSection.schema.product'),
      icon: 'fa-box',
      values: [
        { label: t('seoSection.schema.includes'), value: t('seoSection.schema.productIncludes') },
        { label: t('seoSection.schema.reviews'), value: t('seoSection.schema.reviewsValue') },
        { label: t('seoSection.schema.shipping'), value: t('seoSection.schema.shippingValue') },
        { label: t('seoSection.schema.returns'), value: t('seoSection.schema.returnsValue') },
      ],
      editHint: t('seoSection.schema.editProductDetails'),
    },
    {
      tag: t('seoSection.schema.breadcrumb'),
      icon: 'fa-sitemap',
      values: [
        { label: t('seoSection.schema.example'), value: t('seoSection.schema.breadcrumbExample') },
      ],
    },
    {
      tag: t('seoSection.schema.category'),
      icon: 'fa-folder-open',
      values: [
        { label: t('seoSection.schema.includes'), value: t('seoSection.schema.categoryIncludes') },
      ],
    },
    {
      tag: t('seoSection.schema.article'),
      icon: 'fa-newspaper',
      values: [
        { label: t('seoSection.schema.includes'), value: t('seoSection.schema.articleIncludes') },
      ],
      editHint: t('seoSection.schema.editBlogPosts'),
    },
  ];

  const editableItems = [
    { item: t('seoSection.editable.siteTitleDesc'), where: t('seoSection.editable.siteSeoTab'), icon: 'fa-heading' },
    { item: t('seoSection.editable.metaKeywords'), where: t('seoSection.editable.allTabs'), icon: 'fa-tags' },
    { item: t('seoSection.editable.robots'), where: t('seoSection.editable.advancedSettings'), icon: 'fa-robot' },
    { item: t('seoSection.editable.author'), where: t('seoSection.editable.autoFromBrand'), icon: 'fa-user', value: brandName },
    { item: t('seoSection.editable.ogTags'), where: t('seoSection.editable.socialTab'), icon: 'fa-share-alt' },
    { item: t('seoSection.editable.ogType'), where: t('seoSection.editable.socialTabAuto'), icon: 'fa-share-nodes' },
    { item: t('seoSection.editable.ogLocale'), where: t('seoSection.editable.localeEnUs'), icon: 'fa-language', value: 'en_US' },
    { item: t('seoSection.editable.twitterCard'), where: t('seoSection.editable.socialTab'), icon: 'fa-hashtag' },
    { item: t('seoSection.editable.googleVerification'), where: t('seoSection.editable.advancedSettings'), icon: 'fa-check-double' },
    { item: t('seoSection.editable.perPageSeo'), where: t('seoSection.editable.perPageTabs'), icon: 'fa-file-alt' },
    { item: t('seoSection.editable.ogImagePer'), where: t('seoSection.editable.ogImagePerWhere'), icon: 'fa-image' },
  ];

  return (
    <div>
      <div className="seo-overview-section">
        <div className="seo-overview-header">
          <i className="fas fa-check-circle" style={{ color: '#22c55e', marginInlineEnd: 8 }} />
          {t('seoSection.autoManagedHeader')}
        </div>
        <p className="seo-overview-desc">
          {t('seoSection.autoManagedDesc')}
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
          <i className="fas fa-code" style={{ color: '#8b5cf6', marginInlineEnd: 8 }} />
          {t('seoSection.structuredDataHeader')}
        </div>
        <p className="seo-overview-desc">
          {t('seoSection.structuredDataDesc')}
        </p>
        <div className="seo-overview-grid">
          {schemaItems.map(item => (
            <div key={item.tag} className="seo-overview-item" style={{ background: '#faf5ff', borderColor: '#e9d5ff' }}>
              <div className="seo-overview-item-header">
                <i className={`fas ${item.icon}`} />
                <span>{item.tag}</span>
              </div>
              <div style={{ paddingInlineStart: 24, marginTop: 4 }}>
                {item.values.map(v => (
                  <div key={v.label} style={{ fontSize: 12, color: '#374151', marginBottom: 3, display: 'flex', gap: 6 }}>
                    <span style={{ color: '#94a3b8', minWidth: 80, flexShrink: 0 }}>{v.label}:</span>
                    <span style={{ color: v.value === NOT_SET || (typeof v.value === 'string' && v.value.includes(NOT_SET)) ? '#f59e0b' : '#374151' }}>{v.value}</span>
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
          <i className="fas fa-pen" style={{ color: '#3b82f6', marginInlineEnd: 8 }} />
          {t('seoSection.customizableHeader')}
        </div>
        <p className="seo-overview-desc">
          {t('seoSection.customizableDesc')}
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
                  <span>{t('seoSection.editable.currentLabel')} <strong>{item.value}</strong> — {item.where}</span>
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

export default function SEOSection() {
  const { t } = useTranslation('admin');
  const { siteConfig } = useContext(SiteContext);
  const [activeTab, setActiveTab] = useState('overview');

  const TABS = [
    { id: 'overview', label: t('seoSection.tabs.overview'), icon: 'fa-info-circle' },
    { id: 'site', label: t('seoSection.tabs.site'), icon: 'fa-globe' },
    { id: 'social', label: t('seoSection.tabs.social'), icon: 'fa-share-alt' },
    { id: 'pages', label: t('seoSection.tabs.pages'), icon: 'fa-file-alt' },
    { id: 'categories', label: t('seoSection.tabs.categories'), icon: 'fa-folder' },
    { id: 'products', label: t('seoSection.tabs.products'), icon: 'fa-box' },
  ];

  return (
    <div className="seo-section">
      <div className="seo-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`seo-tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <i className={`fas ${tab.icon}`} style={{ marginInlineEnd: 6 }} />
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
