import { useState, useEffect } from 'react';
import { updateSite, getSite } from '../services/siteService.js';
import { apiRequest } from '../services/api.js';

export default function SiteAdminPanel({ site, onClose, onUpdated }) {
  const [activeTab, setActiveTab] = useState('settings');
  const [siteData, setSiteData] = useState(site);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [brandName, setBrandName] = useState(site.brand_name || site.brandName || '');
  const [phone, setPhone] = useState(site.settings?.phone || '');
  const [email, setEmail] = useState(site.settings?.email || '');
  const [address, setAddress] = useState(site.settings?.address || '');
  const [instagram, setInstagram] = useState(site.settings?.social?.instagram || '');
  const [facebook, setFacebook] = useState(site.settings?.social?.facebook || '');
  const [twitter, setTwitter] = useState(site.settings?.social?.twitter || '');
  const [youtube, setYoutube] = useState(site.settings?.social?.youtube || '');
  const [razorpayKeyId, setRazorpayKeyId] = useState(site.settings?.razorpayKeyId || '');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState(site.settings?.razorpayKeySecret || '');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationCodeMsg, setVerificationCodeMsg] = useState('');

  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  useEffect(() => {
    loadFullSite();
    loadCategories();
  }, [site.id]);

  const loadFullSite = async () => {
    try {
      const result = await getSite(site.id);
      const fullSite = result.data || result;
      let settings = fullSite.settings || {};
      if (typeof settings === 'string') {
        try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
      }
      let socialLinks = fullSite.social_links || {};
      if (typeof socialLinks === 'string') {
        try { socialLinks = JSON.parse(socialLinks); } catch (e) { socialLinks = {}; }
      }
      setSiteData({ ...fullSite, settings, socialLinks });
      setBrandName(fullSite.brand_name || fullSite.brandName || '');
      setPhone(settings.phone || fullSite.phone || '');
      setEmail(settings.email || fullSite.email || '');
      setAddress(settings.address || fullSite.address || '');
      setInstagram(settings.social?.instagram || socialLinks.instagram || '');
      setFacebook(settings.social?.facebook || socialLinks.facebook || '');
      setTwitter(settings.social?.twitter || socialLinks.twitter || '');
      setYoutube(settings.social?.youtube || socialLinks.youtube || '');
      setRazorpayKeyId(settings.razorpayKeyId || '');
      setRazorpayKeySecret(settings.razorpayKeySecret || '');
    } catch (e) {}
  };

  const loadCategories = async () => {
    try {
      const res = await apiRequest(`/api/categories?siteId=${site.id}`);
      setCategories(res.categories || res.data || []);
    } catch (e) {
      setCategories([]);
    }
  };

  const handleSetVerificationCode = async () => {
    if (!verificationCode.trim()) return;
    if (verificationCode.length < 4 || verificationCode.length > 20) {
      setVerificationCodeMsg('Code must be 4–20 characters.');
      return;
    }
    setVerificationCodeMsg('');
    try {
      await apiRequest('/api/site-admin/set-code', {
        method: 'POST',
        body: JSON.stringify({ siteId: site.id, verificationCode: verificationCode.trim() }),
      });
      setVerificationCode('');
      setVerificationCodeMsg('Verification code set successfully!');
    } catch (e) {
      setVerificationCodeMsg('Failed: ' + e.message);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setMessage('');
    try {
      const settings = {
        ...(siteData.settings || {}),
        phone,
        email: email,
        address,
        social: { instagram, facebook, twitter, youtube },
        razorpayKeyId,
        razorpayKeySecret,
      };
      await updateSite(site.id, {
        brandName,
        settings,
      });
      setMessage('Settings saved successfully!');
      onUpdated?.();
    } catch (e) {
      setMessage('Failed to save settings: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const slug = newCategoryName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      await apiRequest('/api/categories', {
        method: 'POST',
        body: JSON.stringify({
          siteId: site.id,
          name: newCategoryName.trim(),
          slug,
          displayOrder: categories.length,
        }),
      });
      setNewCategoryName('');
      await loadCategories();
    } catch (e) {
      alert('Failed to add category: ' + e.message);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await apiRequest(`/api/categories/${categoryId}`, { method: 'DELETE' });
      await loadCategories();
    } catch (e) {
      alert('Failed to delete category: ' + e.message);
    }
  };

  const handleUpdateCategory = async (categoryId) => {
    if (!editCategoryName.trim()) return;
    try {
      const slug = editCategoryName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      await apiRequest(`/api/categories/${categoryId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: editCategoryName.trim(), slug }),
      });
      setEditingCategory(null);
      setEditCategoryName('');
      await loadCategories();
    } catch (e) {
      alert('Failed to update category: ' + e.message);
    }
  };

  const tabs = [
    { id: 'settings', label: 'Settings' },
    { id: 'categories', label: 'Categories' },
    { id: 'products', label: 'Products' },
    { id: 'orders', label: 'Orders' },
  ];

  return (
    <div className="admin-panel-overlay">
      <div className="admin-panel-header">
        <button className="btn btn-outline" onClick={onClose} style={{ padding: '0.5rem 0.75rem' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
        </button>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>
          Manage: {brandName || site.subdomain}
        </h2>
      </div>

      <div className="admin-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`admin-tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="admin-content">
        {activeTab === 'settings' && (
          <div>
            <div className="admin-section-card">
              <h3>Brand Information</h3>
              <div className="form-group">
                <label>Brand Name</label>
                <input type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} />
              </div>
            </div>

            <div className="admin-section-card">
              <h3>Contact Information</h3>
              <div className="form-group">
                <label>Phone</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9876543210" />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@store.com" />
              </div>
              <div className="form-group">
                <label>Address</label>
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} placeholder="Store address" />
              </div>
            </div>

            <div className="admin-section-card">
              <h3>Social Links</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Instagram</label>
                  <input type="text" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/..." />
                </div>
                <div className="form-group">
                  <label>Facebook</label>
                  <input type="text" value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="https://facebook.com/..." />
                </div>
                <div className="form-group">
                  <label>Twitter</label>
                  <input type="text" value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="https://twitter.com/..." />
                </div>
                <div className="form-group">
                  <label>YouTube</label>
                  <input type="text" value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="https://youtube.com/..." />
                </div>
              </div>
            </div>

            <div className="admin-section-card">
              <h3>Razorpay Payment Credentials</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Enter your Razorpay credentials to enable online payments on your store.
              </p>
              <div className="form-group">
                <label>Razorpay Key ID</label>
                <input type="text" value={razorpayKeyId} onChange={(e) => setRazorpayKeyId(e.target.value)} placeholder="rzp_live_..." />
              </div>
              <div className="form-group">
                <label>Razorpay Key Secret</label>
                <input type="password" value={razorpayKeySecret} onChange={(e) => setRazorpayKeySecret(e.target.value)} placeholder="Enter secret key" />
              </div>
            </div>

            <div className="admin-section-card">
              <h3>Store Admin Panel Access</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Set a verification code to access your store's admin panel at <strong>{site.subdomain}.fluxe.in/admin</strong>. Keep this code private.
              </p>
              <div className="form-group">
                <label>New Verification Code (4–20 characters)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="e.g. mycode123"
                    maxLength={20}
                    style={{ flex: 1 }}
                  />
                  <button className="btn btn-primary" onClick={handleSetVerificationCode} style={{ whiteSpace: 'nowrap' }}>
                    Set Code
                  </button>
                </div>
              </div>
              {verificationCodeMsg && (
                <p style={{ color: verificationCodeMsg.includes('success') ? '#16a34a' : '#ef4444', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  {verificationCodeMsg}
                </p>
              )}
            </div>

            {message && (
              <p style={{ color: message.includes('success') ? '#16a34a' : '#ef4444', fontSize: '0.875rem', marginBottom: '1rem' }}>
                {message}
              </p>
            )}
            <button className="btn btn-primary" onClick={handleSaveSettings} disabled={saving} style={{ width: '100%' }}>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )}

        {activeTab === 'categories' && (
          <div>
            <div className="admin-section-card">
              <h3>Categories</h3>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input
                  type="text"
                  placeholder="New category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                  style={{ flex: 1, padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem', fontSize: '0.875rem', fontFamily: 'inherit' }}
                />
                <button className="btn btn-primary" onClick={handleAddCategory}>Add</button>
              </div>

              {categories.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No categories yet</p>
              ) : (
                categories.map(cat => (
                  <div key={cat.id} className="category-list-item">
                    {editingCategory === cat.id ? (
                      <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                        <input
                          type="text"
                          value={editCategoryName}
                          onChange={(e) => setEditCategoryName(e.target.value)}
                          style={{ flex: 1, padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '0.25rem', fontSize: '0.875rem' }}
                        />
                        <button className="btn btn-primary" style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleUpdateCategory(cat.id)}>Save</button>
                        <button className="btn btn-outline" style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }} onClick={() => setEditingCategory(null)}>Cancel</button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <span style={{ fontWeight: 600 }}>{cat.name}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>/{cat.slug}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button
                            className="btn btn-outline"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                            onClick={() => { setEditingCategory(cat.id); setEditCategoryName(cat.name); }}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                            onClick={() => handleDeleteCategory(cat.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div>
            <div className="admin-section-card">
              <h3>Products Overview</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Manage your products directly from your store's admin panel.
              </p>
              <a
                href={`https://${site.subdomain}.fluxe.in/admin/products`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                Open Products Admin →
              </a>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div>
            <div className="admin-section-card">
              <h3>Orders Overview</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                View and manage orders from your store's admin panel.
              </p>
              <a
                href={`https://${site.subdomain}.fluxe.in/admin`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                Open Orders Admin →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
