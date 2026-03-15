import React, { useState, useEffect, useContext, useCallback } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import './SEOSection.css';

const API_BASE = typeof window !== 'undefined' && window.location.hostname.endsWith('fluxe.in') ? '' : 'https://fluxe.in';

function getAuthHeader() {
  const token = sessionStorage.getItem('site_admin_token');
  return token ? { Authorization: `SiteAdmin ${token}` } : {};
}

function CharCounter({ value, max }) {
  const len = (value || '').length;
  const cls = len > max ? 'over' : len > max * 0.85 ? 'warn' : '';
  return <div className={`seo-char-counter ${cls}`}>{len} / {max}</div>;
}

// ─── Google Search Preview ────────────────────────────────────────────────────

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

// ─── Site SEO Tab ─────────────────────────────────────────────────────────────

function SiteSEOTab({ siteConfig }) {
  const siteId = siteConfig?.id;
  const subdomain = siteConfig?.subdomain;
  const storeUrl = subdomain ? `https://${subdomain}.fluxe.in` : window.location.origin;

  const [form, setForm] = useState({
    seo_title: '',
    seo_description: '',
    seo_og_image: '',
    seo_robots: 'index, follow',
    google_verification: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

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
          setForm(prev => ({ ...prev, ...result.data }));
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
        title={form.seo_title}
        description={form.seo_description}
        url={storeUrl}
      />

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><h3 className="card-title">Homepage SEO</h3></div>
        <div className="card-content">

          <div className="seo-field">
            <label>Site Title</label>
            <input
              type="text"
              value={form.seo_title}
              onChange={set('seo_title')}
              placeholder={`${siteConfig?.brand_name || 'Your Store'} | Fluxe Store`}
              maxLength={70}
            />
            <CharCounter value={form.seo_title} max={60} />
            <div className="seo-hint">Recommended: 50–60 characters. Shown in Google results and browser tab.</div>
          </div>

          <div className="seo-field">
            <label>Meta Description</label>
            <textarea
              value={form.seo_description}
              onChange={set('seo_description')}
              placeholder="Describe your store in 1–2 sentences. This appears under your title in Google."
              maxLength={200}
              rows={3}
            />
            <CharCounter value={form.seo_description} max={160} />
            <div className="seo-hint">Recommended: 120–160 characters. Affects click-through rate from Google.</div>
          </div>

          <div className="seo-field">
            <label>OG Image URL <span style={{ fontWeight: 400, color: '#94a3b8' }}>(for social sharing)</span></label>
            <input
              type="url"
              value={form.seo_og_image}
              onChange={set('seo_og_image')}
              placeholder="https://cdn.example.com/og-image.jpg"
            />
            <div className="seo-hint">Recommended size: 1200 × 630px. Shown when your link is shared on WhatsApp, Facebook, Twitter.</div>
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
              Get this from <strong>Google Search Console</strong> → Verify ownership → HTML tag method. Paste only the content value (not the full tag).
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

// ─── Categories SEO Tab ───────────────────────────────────────────────────────

function CategoriesSEOTab({ siteConfig }) {
  const siteId = siteConfig?.id;
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

  function startEdit(cat) {
    setEditingId(cat.id);
    setEditForm({
      seo_title: cat.seo_title || '',
      seo_description: cat.seo_description || '',
      seo_og_image: cat.seo_og_image || '',
    });
    setMsg(null);
  }

  async function handleSave(catId) {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/site-admin/seo/categories/${catId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ siteId, ...editForm }),
      });
      const result = await res.json();
      if (result.success) {
        setCategories(prev => prev.map(c => c.id === catId ? { ...c, ...editForm } : c));
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
        Set custom SEO title and description for each category page. Leave blank to use the category name with your brand name.
      </p>

      {msg && <div className={`seo-msg ${msg.type}`} style={{ marginBottom: 12 }}>{msg.text}</div>}

      {categories.map(cat => (
        <div key={cat.id} className="card" style={{ marginBottom: 12 }}>
          <div className="card-content" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editingId === cat.id ? 14 : 0 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{cat.name}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>/category/{cat.slug}</div>
              </div>
              {editingId !== cat.id && (
                <button className="btn btn-outline btn-sm" onClick={() => startEdit(cat)}>
                  <i className="fas fa-pen" /> Edit SEO
                </button>
              )}
            </div>

            {editingId === cat.id && (
              <div>
                <div className="seo-field">
                  <label>SEO Title</label>
                  <input
                    type="text"
                    value={editForm.seo_title}
                    onChange={e => setEditForm(p => ({ ...p, seo_title: e.target.value }))}
                    placeholder={`${cat.name} | ${siteConfig?.brand_name || 'Store'}`}
                    maxLength={70}
                  />
                  <CharCounter value={editForm.seo_title} max={60} />
                </div>
                <div className="seo-field">
                  <label>Meta Description</label>
                  <textarea
                    value={editForm.seo_description}
                    onChange={e => setEditForm(p => ({ ...p, seo_description: e.target.value }))}
                    placeholder={`Browse our ${cat.name} collection...`}
                    rows={2}
                    maxLength={200}
                  />
                  <CharCounter value={editForm.seo_description} max={160} />
                </div>
                <div className="seo-field">
                  <label>OG Image URL</label>
                  <input
                    type="url"
                    value={editForm.seo_og_image}
                    onChange={e => setEditForm(p => ({ ...p, seo_og_image: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
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
      ))}
    </div>
  );
}

// ─── Products SEO Tab ─────────────────────────────────────────────────────────

function ProductsSEOTab({ siteConfig }) {
  const siteId = siteConfig?.id;
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

  function startEdit(product) {
    setEditingId(product.id);
    setEditForm({
      seo_title: product.seo_title || '',
      seo_description: product.seo_description || '',
      seo_og_image: product.seo_og_image || '',
    });
    setMsg(null);
  }

  async function handleSave(productId) {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/site-admin/seo/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ siteId, ...editForm }),
      });
      const result = await res.json();
      if (result.success) {
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...editForm } : p));
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
        Set custom SEO title and description for each product. Leave blank to use the product name automatically.
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

      {filtered.map(product => (
        <div key={product.id} className="card" style={{ marginBottom: 12 }}>
          <div className="card-content" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editingId === product.id ? 14 : 0 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{product.name}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex', gap: 10, marginTop: 2 }}>
                  <span>/product/{product.slug}</span>
                  {product.seo_title && <span style={{ color: '#22c55e' }}>✓ SEO set</span>}
                </div>
              </div>
              {editingId !== product.id && (
                <button className="btn btn-outline btn-sm" onClick={() => startEdit(product)}>
                  <i className="fas fa-pen" /> Edit SEO
                </button>
              )}
            </div>

            {editingId === product.id && (
              <div>
                <div className="seo-field">
                  <label>SEO Title</label>
                  <input
                    type="text"
                    value={editForm.seo_title}
                    onChange={e => setEditForm(p => ({ ...p, seo_title: e.target.value }))}
                    placeholder={`${product.name} | ${siteConfig?.brand_name || 'Store'}`}
                    maxLength={70}
                  />
                  <CharCounter value={editForm.seo_title} max={60} />
                </div>
                <div className="seo-field">
                  <label>Meta Description</label>
                  <textarea
                    value={editForm.seo_description}
                    onChange={e => setEditForm(p => ({ ...p, seo_description: e.target.value }))}
                    placeholder="Describe this product for search engines..."
                    rows={2}
                    maxLength={200}
                  />
                  <CharCounter value={editForm.seo_description} max={160} />
                </div>
                <div className="seo-field">
                  <label>OG Image URL <span style={{ fontWeight: 400, color: '#94a3b8' }}>(for social sharing)</span></label>
                  <input
                    type="url"
                    value={editForm.seo_og_image}
                    onChange={e => setEditForm(p => ({ ...p, seo_og_image: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
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
      ))}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: 24 }}>No products match your search.</div>
      )}
    </div>
  );
}

// ─── Pages SEO Tab ───────────────────────────────────────────────────────────

const PAGE_LABELS = {
  home: { label: 'Homepage', icon: 'fa-home', path: '/' },
  about: { label: 'About Us', icon: 'fa-info-circle', path: '/about' },
  contact: { label: 'Contact Us', icon: 'fa-envelope', path: '/contact' },
  privacy: { label: 'Privacy Policy', icon: 'fa-shield-alt', path: '/privacy-policy' },
  terms: { label: 'Terms & Conditions', icon: 'fa-file-contract', path: '/terms' },
};

function PagesSEOTab({ siteConfig }) {
  const siteId = siteConfig?.id;
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

  function startEdit(page) {
    setEditingId(page.page_type);
    setEditForm({
      seo_title: page.seo_title || '',
      seo_description: page.seo_description || '',
      seo_og_image: page.seo_og_image || '',
    });
    setMsg(null);
  }

  async function handleSave(pageType) {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/site-admin/seo/pages/${pageType}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ siteId, ...editForm }),
      });
      const result = await res.json();
      if (result.success) {
        setPages(prev => prev.map(p => p.page_type === pageType ? { ...p, ...editForm } : p));
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
        Set custom SEO title and description for each static page. Leave blank to use the default page name with your brand name.
      </p>

      {msg && <div className={`seo-msg ${msg.type}`} style={{ marginBottom: 12 }}>{msg.text}</div>}

      {pages.map(page => {
        const meta = PAGE_LABELS[page.page_type] || { label: page.page_type, icon: 'fa-file', path: `/${page.page_type}` };
        return (
          <div key={page.page_type} className="card" style={{ marginBottom: 12 }}>
            <div className="card-content" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editingId === page.page_type ? 14 : 0 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    <i className={`fas ${meta.icon}`} style={{ marginRight: 6, color: '#64748b' }} />
                    {meta.label}
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex', gap: 10, marginTop: 2 }}>
                    <span>{meta.path}</span>
                    {page.seo_title && <span style={{ color: '#22c55e' }}>✓ SEO set</span>}
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
                      placeholder={`${meta.label} | ${siteConfig?.brand_name || 'Store'}`}
                      maxLength={70}
                    />
                    <CharCounter value={editForm.seo_title} max={60} />
                  </div>
                  <div className="seo-field">
                    <label>Meta Description</label>
                    <textarea
                      value={editForm.seo_description}
                      onChange={e => setEditForm(p => ({ ...p, seo_description: e.target.value }))}
                      placeholder={`Describe your ${meta.label.toLowerCase()} page for search engines...`}
                      rows={2}
                      maxLength={200}
                    />
                    <CharCounter value={editForm.seo_description} max={160} />
                  </div>
                  <div className="seo-field">
                    <label>OG Image URL</label>
                    <input
                      type="url"
                      value={editForm.seo_og_image}
                      onChange={e => setEditForm(p => ({ ...p, seo_og_image: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
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

// ─── Main SEO Section ─────────────────────────────────────────────────────────

const TABS = [
  { id: 'site', label: 'Site SEO', icon: 'fa-globe' },
  { id: 'pages', label: 'Pages', icon: 'fa-file-alt' },
  { id: 'categories', label: 'Categories', icon: 'fa-folder' },
  { id: 'products', label: 'Products', icon: 'fa-box' },
];

export default function SEOSection() {
  const { siteConfig } = useContext(SiteContext);
  const [activeTab, setActiveTab] = useState('site');

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

      {activeTab === 'site' && <SiteSEOTab siteConfig={siteConfig} />}
      {activeTab === 'pages' && <PagesSEOTab siteConfig={siteConfig} />}
      {activeTab === 'categories' && <CategoriesSEOTab siteConfig={siteConfig} />}
      {activeTab === 'products' && <ProductsSEOTab siteConfig={siteConfig} />}
    </div>
  );
}
