import React, { useState, useEffect, useContext } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { getCategories } from '../../services/categoryService.js';

const API_BASE = typeof window !== 'undefined' && window.location.hostname.endsWith('fluxe.in') ? '' : 'https://fluxe.in';

export default function FooterEditor() {
  const { siteConfig, refetchSite } = useContext(SiteContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  const [customLinks, setCustomLinks] = useState([]);
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [twitter, setTwitter] = useState('');
  const [youtube, setYoutube] = useState('');

  const [shopRedirect, setShopRedirect] = useState('/category/all');
  const [showCurrency, setShowCurrency] = useState(true);

  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (siteConfig?.id) {
      loadFooterConfig();
      loadCategories();
    }
  }, [siteConfig?.id]);

  async function loadCategories() {
    try {
      const res = await getCategories(siteConfig.id);
      setCategories(res.data || res.categories || []);
    } catch (e) {
      setCategories([]);
    }
  }

  async function loadFooterConfig() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/site?subdomain=${encodeURIComponent(siteConfig.subdomain)}`);
      const result = await response.json();
      if (result.success && result.data) {
        let settings = result.data.settings || {};
        if (typeof settings === 'string') {
          try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
        }
        const footer = settings.footer || {};
        setCustomLinks(footer.customLinks || []);

        let socialLinks = result.data.social_links || result.data.socialLinks || {};
        if (typeof socialLinks === 'string') {
          try { socialLinks = JSON.parse(socialLinks); } catch (e) { socialLinks = {}; }
        }
        const social = footer.social || {};
        setInstagram(social.instagram || settings.social?.instagram || socialLinks.instagram || '');
        setFacebook(social.facebook || settings.social?.facebook || socialLinks.facebook || '');
        setTwitter(social.twitter || settings.social?.twitter || socialLinks.twitter || '');
        setYoutube(social.youtube || settings.social?.youtube || socialLinks.youtube || '');

        const bottomNav = footer.bottomNav || {};
        setShopRedirect(bottomNav.shopRedirect || '/category/all');
        setShowCurrency(bottomNav.showCurrency !== false);
      }
    } catch (e) {
      console.error('Failed to load footer config:', e);
    } finally {
      setLoading(false);
    }
  }

  async function saveFooterConfig() {
    setSaving(true);
    setStatus('');
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
            social: { instagram, facebook, twitter, youtube },
            footer: {
              customLinks,
              social: { instagram, facebook, twitter, youtube },
              bottomNav: { shopRedirect, showCurrency },
            },
          },
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setStatus('success');
        if (refetchSite) refetchSite();
      } else {
        setStatus('error:' + (result.error || 'Unknown error'));
      }
    } catch (e) {
      setStatus('error:' + e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleAddLink() {
    if (!newLinkName.trim()) return;
    const link = { name: newLinkName.trim(), url: newLinkUrl.trim() || '#' };
    const updated = [...customLinks, link];
    setCustomLinks(updated);
    setNewLinkName('');
    setNewLinkUrl('');
  }

  function handleRemoveLink(index) {
    setCustomLinks(prev => prev.filter((_, i) => i !== index));
  }

  function handleUpdateLink(index, field, value) {
    setCustomLinks(prev => prev.map((link, i) => i === index ? { ...link, [field]: value } : link));
  }

  const shopRedirectOptions = [
    { value: '/category/all', label: 'All Products' },
    { value: '/category/featured', label: 'Featured Collection' },
    { value: '/category/new-arrivals', label: 'New Arrivals' },
    ...categories.map(cat => ({ value: `/category/${cat.slug}`, label: cat.name })),
  ];

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  return (
    <div style={{ maxWidth: 700 }}>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h3 className="card-title">Footer Navigation Links</h3></div>
        <div className="card-content">
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 0, marginBottom: 16 }}>
            Add custom links that appear in the "Exclusive Benefits" section of your footer. Enter a link name and URL for each.
          </p>

          {customLinks.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {customLinks.map((link, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    value={link.name}
                    onChange={(e) => handleUpdateLink(idx, 'name', e.target.value)}
                    placeholder="Link name"
                    style={{ flex: 1, padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                  <input
                    type="text"
                    value={link.url}
                    onChange={(e) => handleUpdateLink(idx, 'url', e.target.value)}
                    placeholder="URL (e.g. /about or https://...)"
                    style={{ flex: 1, padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                  <button
                    onClick={() => handleRemoveLink(idx)}
                    style={{
                      width: 30, height: 30, borderRadius: '50%', border: 'none',
                      background: '#fee2e2', color: '#ef4444', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, flexShrink: 0,
                    }}
                  >
                    <i className="fas fa-times" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              value={newLinkName}
              onChange={(e) => setNewLinkName(e.target.value)}
              placeholder="Link name"
              onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
              style={{ flex: 1, padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
            <input
              type="text"
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              placeholder="URL"
              onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
              style={{ flex: 1, padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
            <button className="btn btn-primary btn-sm" onClick={handleAddLink} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
              <i className="fas fa-plus" style={{ marginRight: 4 }} />Add
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h3 className="card-title">Social Media Links</h3></div>
        <div className="card-content">
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 0, marginBottom: 16 }}>
            Add your social media profile URLs. These will appear as icons in the footer.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
                <i className="fab fa-instagram" style={{ marginRight: 6, color: '#E1306C' }} />Instagram
              </label>
              <input type="text" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
                <i className="fab fa-facebook-f" style={{ marginRight: 6, color: '#1877F2' }} />Facebook
              </label>
              <input type="text" value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="https://facebook.com/..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
                <i className="fab fa-twitter" style={{ marginRight: 6, color: '#1DA1F2' }} />Twitter
              </label>
              <input type="text" value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="https://twitter.com/..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
                <i className="fab fa-youtube" style={{ marginRight: 6, color: '#FF0000' }} />YouTube
              </label>
              <input type="text" value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="https://youtube.com/..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h3 className="card-title">Bottom Navigation Bar</h3></div>
        <div className="card-content">
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 0, marginBottom: 16 }}>
            Configure the mobile bottom navigation bar that appears on your store.
          </p>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
              <i className="fi fi-rs-shop" style={{ marginRight: 6 }} />Shop Icon Redirects To
            </label>
            <select
              value={shopRedirect}
              onChange={(e) => setShopRedirect(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff' }}
            >
              {shopRedirectOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <label style={{ fontWeight: 600, fontSize: 13, display: 'block' }}>Show Currency Selector</label>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>Toggle the currency icon on the bottom navigation</span>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showCurrency}
                onChange={() => setShowCurrency(!showCurrency)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: showCurrency ? '#10b981' : '#cbd5e1',
                borderRadius: 24, transition: 'background-color 0.2s',
              }}>
                <span style={{
                  position: 'absolute', left: showCurrency ? 22 : 2, top: 2,
                  width: 20, height: 20, backgroundColor: '#fff',
                  borderRadius: '50%', transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </span>
            </label>
          </div>
        </div>
      </div>

      {status && (
        <div style={{
          background: status === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${status === 'success' ? '#bbf7d0' : '#fecaca'}`,
          borderRadius: 8, padding: '12px 16px',
          color: status === 'success' ? '#166534' : '#dc2626',
          marginBottom: 16, fontSize: 14,
        }}>
          {status === 'success' ? 'Footer settings saved successfully!' : status.replace('error:', 'Failed to save: ')}
        </div>
      )}

      <button className="btn btn-primary" onClick={saveFooterConfig} disabled={saving} style={{ width: '100%' }}>
        {saving ? 'Saving...' : 'Save Footer Settings'}
      </button>
    </div>
  );
}
