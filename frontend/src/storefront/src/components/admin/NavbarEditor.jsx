import React, { useState, useEffect, useContext, useRef } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { getCategories } from '../../services/categoryService.js';
import SaveBar from './SaveBar.jsx';
import ConfirmModal from './ConfirmModal.jsx';
import { API_BASE } from '../../config.js';
import { usePendingMedia } from '../../hooks/usePendingMedia.js';
import AdminColorField from './style/AdminColorField.jsx';
import AdminFontPicker from './style/AdminFontPicker.jsx';

function generateId() {
  return 'nav_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
}

function flattenCategories(categories, prefix = '') {
  let result = [];
  for (const cat of categories) {
    result.push({ id: cat.id, name: prefix + cat.name, slug: cat.slug });
    const subs = cat.subcategories || cat.sub_categories || [];
    if (subs.length > 0) {
      result = result.concat(flattenCategories(subs, prefix + cat.name + ' → '));
    }
  }
  return result;
}

export default function NavbarEditor({ onSaved, onPreviewUpdate }) {
  const { siteConfig, refetchSite } = useContext(SiteContext);
  const { isModern } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [confirmModal, setConfirmModal] = useState(null);
  const [navbarMenus, setNavbarMenus] = useState([]);
  const [categories, setCategories] = useState([]);
  const [expandedMenu, setExpandedMenu] = useState(null);
  const [editingMenuId, setEditingMenuId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const hasLoadedRef = useRef(false);
  const serverValuesRef = useRef(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [logoSize, setLogoSize] = useState(60);
  const [logoPosition, setLogoPosition] = useState('left');
  const [showAccountIcon, setShowAccountIcon] = useState(true);
  const [showCartIcon, setShowCartIcon] = useState(true);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoLoadError, setLogoLoadError] = useState(false);

  // Reset the load error whenever the URL itself changes — ensures a fresh
  // upload (or remove) gets a clean shot at rendering instead of being stuck
  // in the broken-image branch from a previous URL.
  useEffect(() => { setLogoLoadError(false); }, [logoUrl]);
  const [hasChanges, setHasChanges] = useState(false);
  // Navigation Style — color/font customization (mirrors promo banner mechanism).
  // Empty string means "use default": SiteContext skips setProperty so the CSS
  // var fallback (the existing template default) takes over.
  const [navBg, setNavBg] = useState('');
  const [navLinkText, setNavLinkText] = useState('');
  const [navLinkHover, setNavLinkHover] = useState('');
  const [navIcon, setNavIcon] = useState('');
  const [navFont, setNavFont] = useState('');
  const [brandColor, setBrandColor] = useState('');
  const [brandFont, setBrandFont] = useState('');
  const [panelBg, setPanelBg] = useState('');
  const [panelText, setPanelText] = useState('');
  const [panelMuted, setPanelMuted] = useState('');
  const [panelAccent, setPanelAccent] = useState('');
  const [panelAccentText, setPanelAccentText] = useState('');
  const [panelFont, setPanelFont] = useState('');
  const [navTransparent, setNavTransparent] = useState(false);
  const [navTransparentText, setNavTransparentText] = useState('');
  const [activeView, setActiveView] = useState('content');
  const logoInputRef = useRef(null);
  const pendingMedia = usePendingMedia(siteConfig?.id);

  useEffect(() => {
    if (siteConfig?.id) {
      loadNavbarConfig();
      loadCategories();
    }
  }, [siteConfig?.id]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    const current = JSON.stringify({
      navbarMenus, logoUrl, logoSize, logoPosition, showAccountIcon, showCartIcon,
      navBg, navLinkText, navLinkHover, navIcon, navFont, brandColor, brandFont,
      panelBg, panelText, panelMuted, panelAccent, panelAccentText, panelFont,
      navTransparent, navTransparentText,
    });
    setHasChanges(current !== serverValuesRef.current);
    if (onPreviewUpdate) onPreviewUpdate({
      logoUrl,
      navbarMenus, logoSize, logoPosition, showAccountIcon, showCartIcon,
      navBg, navLinkText, navLinkHover, navIcon, navFont, brandColor, brandFont,
      panelBg, panelText, panelMuted, panelAccent, panelAccentText, panelFont,
      navTransparent, navTransparentText,
    });
  }, [
    navbarMenus, logoUrl, logoSize, logoPosition, showAccountIcon, showCartIcon,
    navBg, navLinkText, navLinkHover, navIcon, navFont, brandColor, brandFont,
    panelBg, panelText, panelMuted, panelAccent, panelAccentText, panelFont,
    navTransparent, navTransparentText,
  ]);

  async function loadCategories() {
    try {
      const res = await getCategories(siteConfig.id);
      setCategories(res.data || res.categories || []);
    } catch (e) {
      setCategories([]);
    }
  }

  async function loadNavbarConfig() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/site?subdomain=${encodeURIComponent(siteConfig.subdomain)}`);
      const result = await response.json();
      if (result.success && result.data) {
        let settings = result.data.settings || {};
        if (typeof settings === 'string') {
          try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
        }
        const menusVal = settings.navbarMenus || [];
        const logoVal = result.data.logo_url || '';
        const sizeVal = settings.logoSize || 60;
        const posVal = settings.logoPosition || 'left';
        const accVal = settings.showAccountIcon !== false;
        const cartVal = settings.showCartIcon !== false;
        const navBgVal = settings.navBg || '';
        const navLinkTextVal = settings.navLinkText || '';
        const navLinkHoverVal = settings.navLinkHover || '';
        const navIconVal = settings.navIcon || '';
        const navFontVal = settings.navFont || '';
        const brandColorVal = settings.brandColor || '';
        const brandFontVal = settings.brandFont || '';
        const panelBgVal = settings.panelBg || '';
        const panelTextVal = settings.panelText || '';
        const panelMutedVal = settings.panelMuted || '';
        const panelAccentVal = settings.panelAccent || '';
        const panelAccentTextVal = settings.panelAccentText || '';
        const panelFontVal = settings.panelFont || '';
        const navTransparentVal = settings.navTransparent === true;
        const navTransparentTextVal = settings.navTransparentText || '';
        setNavbarMenus(menusVal);
        setLogoUrl(logoVal);
        setLogoSize(sizeVal);
        setLogoPosition(posVal);
        setShowAccountIcon(accVal);
        setShowCartIcon(cartVal);
        setNavBg(navBgVal);
        setNavLinkText(navLinkTextVal);
        setNavLinkHover(navLinkHoverVal);
        setNavIcon(navIconVal);
        setNavFont(navFontVal);
        setBrandColor(brandColorVal);
        setBrandFont(brandFontVal);
        setPanelBg(panelBgVal);
        setPanelText(panelTextVal);
        setPanelMuted(panelMutedVal);
        setPanelAccent(panelAccentVal);
        setPanelAccentText(panelAccentTextVal);
        setPanelFont(panelFontVal);
        setNavTransparent(navTransparentVal);
        setNavTransparentText(navTransparentTextVal);
        serverValuesRef.current = JSON.stringify({
          navbarMenus: menusVal, logoUrl: logoVal, logoSize: sizeVal, logoPosition: posVal,
          showAccountIcon: accVal, showCartIcon: cartVal,
          navBg: navBgVal, navLinkText: navLinkTextVal, navLinkHover: navLinkHoverVal,
          navIcon: navIconVal, navFont: navFontVal, brandColor: brandColorVal, brandFont: brandFontVal,
          panelBg: panelBgVal, panelText: panelTextVal, panelMuted: panelMutedVal,
          panelAccent: panelAccentVal, panelAccentText: panelAccentTextVal, panelFont: panelFontVal,
          navTransparent: navTransparentVal, navTransparentText: navTransparentTextVal,
        });
      }
    } catch (e) {
      console.error('Failed to load navbar config:', e);
    } finally {
      setLoading(false);
      setTimeout(() => { hasLoadedRef.current = true; }, 0);
    }
  }

  function validateMenus() {
    for (const menu of navbarMenus) {
      if (!menu.name || !menu.name.trim()) continue;
      for (const link of menu.links) {
        if (link.type === 'custom' && (!link.label.trim() || !link.url.trim())) {
          return "Please fill in both label and URL for all custom links, or remove empty ones.";
        }
        if (link.url && !link.url.startsWith('/') && !link.url.startsWith('http://') && !link.url.startsWith('https://')) {
          return `Invalid URL "${link.url}". URLs must start with / or http:// or https://.`;
        }
      }
    }
    return null;
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowed.includes(file.type)) {
      setStatus('error:' + "Please upload a valid image file (JPG, PNG, WebP, GIF, or SVG)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setStatus('error:' + "Image must be less than 10MB");
      return;
    }
    const oldLogo = logoUrl;
    setUploadingLogo(true);
    setStatus('');
    try {
      const token = sessionStorage.getItem('site_admin_token');
      const formData = new FormData();
      formData.append('images', file, file.name);
      const res = await fetch(`${API_BASE}/api/upload/image?siteId=${siteConfig.id}`, {
        method: 'POST',
        headers: { 'Authorization': token ? `SiteAdmin ${token}` : '' },
        body: formData,
      });
      const result = await res.json();
      if (result.success && result.data?.images?.[0]?.url) {
        const newUrl = result.data.images[0].url;
        setLogoUrl(newUrl);
        if (onPreviewUpdate) onPreviewUpdate({ logoUrl: newUrl });
        // Track new upload for cleanup-on-cancel; defer old logo deletion to save.
        pendingMedia.markUploaded(newUrl);
        if (oldLogo) pendingMedia.markForDeletion(oldLogo);
      } else {
        setStatus('error:' + (result.error || "Failed to upload logo"));
      }
    } catch (err) {
      setStatus('error:' + `Failed to upload logo: ${err.message}`);
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  }

  function handleRemoveLogo() {
    // Defer deletion to save; if user cancels, live site keeps its logo.
    if (logoUrl) pendingMedia.markForDeletion(logoUrl);
    setLogoUrl('');
    if (onPreviewUpdate) onPreviewUpdate({ logoUrl: '' });
  }

  async function handleSave(e) {
    e.preventDefault();
    const validationError = validateMenus();
    if (validationError) {
      setStatus('error:' + validationError);
      return;
    }
    setSaving(true);
    setStatus('');
    try {
      const token = sessionStorage.getItem('site_admin_token');
      const cleanMenus = navbarMenus.filter(m => m.name && m.name.trim()).map(m => ({
        ...m,
        name: m.name.trim(),
        links: m.links.filter(l => l.label && l.url),
      }));
      const response = await fetch(`${API_BASE}/api/sites/${siteConfig.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `SiteAdmin ${token}` : '',
        },
        body: JSON.stringify({
          settings: {
            navbarMenus: cleanMenus, logoSize, logoPosition, showAccountIcon, showCartIcon,
            navBg, navLinkText, navLinkHover, navIcon, navFont, brandColor, brandFont,
            panelBg, panelText, panelMuted, panelAccent, panelAccentText, panelFont,
            navTransparent, navTransparentText,
          },
          logoUrl: logoUrl || null,
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setStatus('success');
        serverValuesRef.current = JSON.stringify({
          navbarMenus, logoUrl, logoSize, logoPosition, showAccountIcon, showCartIcon,
          navBg, navLinkText, navLinkHover, navIcon, navFont, brandColor, brandFont,
          panelBg, panelText, panelMuted, panelAccent, panelAccentText, panelFont,
          navTransparent, navTransparentText,
        });
        setHasChanges(false);
        // Save succeeded — clean up R2 (delete replaced original logo + any
        // intermediate uploads not in the final state).
        const cleanup = await pendingMedia.commit([logoUrl]);
        if (!cleanup.ok) console.warn('Some images failed to delete from storage:', cleanup.failed);
        if (refetchSite) refetchSite();
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

  function addMenu() {
    const newMenu = {
      id: generateId(),
      name: '',
      links: [],
      order: navbarMenus.length,
    };
    setNavbarMenus(prev => [...prev, newMenu]);
    setExpandedMenu(newMenu.id);
    setEditingMenuId(newMenu.id);
    setEditingName('');
  }

  function removeMenu(menuId) {
    setConfirmModal({
      title: "Delete Menu Group",
      message: "Delete this menu group? All links inside it will be removed.",
      danger: true,
      onConfirm: () => {
        setNavbarMenus(prev => prev.filter(m => m.id !== menuId));
        if (expandedMenu === menuId) setExpandedMenu(null);
      }
    });
  }

  function updateMenuName(menuId, name) {
    setNavbarMenus(prev => prev.map(m => m.id === menuId ? { ...m, name } : m));
  }

  function startEditName(menu) {
    setEditingMenuId(menu.id);
    setEditingName(menu.name);
  }

  function saveEditName(menuId) {
    if (editingName.trim()) {
      updateMenuName(menuId, editingName.trim());
    }
    setEditingMenuId(null);
    setEditingName('');
  }

  function addLinkToMenu(menuId, category) {
    setNavbarMenus(prev => prev.map(m => {
      if (m.id !== menuId) return m;
      const exists = m.links.some(l => l.categorySlug === category.slug);
      if (exists) return m;
      return {
        ...m,
        links: [...m.links, {
          id: generateId(),
          label: category.name,
          categorySlug: category.slug,
          url: `/category/${category.slug}`,
          type: 'category',
        }],
      };
    }));
  }

  function addCustomLinkToMenu(menuId) {
    setNavbarMenus(prev => prev.map(m => {
      if (m.id !== menuId) return m;
      return {
        ...m,
        links: [...m.links, {
          id: generateId(),
          label: '',
          url: '',
          type: 'custom',
        }],
      };
    }));
  }

  function updateLink(menuId, linkId, field, value) {
    setNavbarMenus(prev => prev.map(m => {
      if (m.id !== menuId) return m;
      return {
        ...m,
        links: m.links.map(l => l.id === linkId ? { ...l, [field]: value } : l),
      };
    }));
  }

  function removeLink(menuId, linkId) {
    setNavbarMenus(prev => prev.map(m => {
      if (m.id !== menuId) return m;
      return { ...m, links: m.links.filter(l => l.id !== linkId) };
    }));
  }

  function moveLinkUp(menuId, linkIndex) {
    if (linkIndex === 0) return;
    setNavbarMenus(prev => prev.map(m => {
      if (m.id !== menuId) return m;
      const links = [...m.links];
      [links[linkIndex - 1], links[linkIndex]] = [links[linkIndex], links[linkIndex - 1]];
      return { ...m, links };
    }));
  }

  function moveLinkDown(menuId, linkIndex) {
    setNavbarMenus(prev => prev.map(m => {
      if (m.id !== menuId) return m;
      if (linkIndex >= m.links.length - 1) return m;
      const links = [...m.links];
      [links[linkIndex], links[linkIndex + 1]] = [links[linkIndex + 1], links[linkIndex]];
      return { ...m, links };
    }));
  }

  function moveMenuUp(index) {
    if (index === 0) return;
    setNavbarMenus(prev => {
      const arr = [...prev];
      [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
      return arr;
    });
  }

  function moveMenuDown(index) {
    setNavbarMenus(prev => {
      if (index >= prev.length - 1) return prev;
      const arr = [...prev];
      [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
      return arr;
    });
  }

  const flatCats = flattenCategories(categories);

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  return (
    <>
    <div style={{ maxWidth: 750 }}>
      <SaveBar topBar saving={saving} hasChanges={hasChanges} onSave={(e) => handleSave(e || { preventDefault: () => {} })} />
      <form onSubmit={handleSave}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e2e8f0' }}>
          {[{ key: 'content', icon: 'fa-bars', label: 'Content' }, { key: 'appearance', icon: 'fa-paint-brush', label: 'Appearance' }].map(tab => (
            <button key={tab.key} type="button" onClick={() => setActiveView(tab.key)} style={{ padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, color: activeView === tab.key ? '#2563eb' : '#64748b', borderBottom: `2px solid ${activeView === tab.key ? '#2563eb' : 'transparent'}`, marginBottom: -2, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', transition: 'color 0.15s ease' }}>
              <i className={`fas ${tab.icon}`} />{tab.label}
            </button>
          ))}
        </div>

        {activeView === 'content' && <>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Store Logo</h3>
          </div>
          <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Upload a logo to display in the navbar instead of your brand name. For best results, use a transparent PNG or SVG.
            </p>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
              onChange={handleLogoUpload}
              style={{ display: 'none' }}
            />
            {logoUrl && !logoLoadError ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ flex: '0 0 auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 50, maxWidth: 200 }}>
                  <img
                    src={logoUrl}
                    alt="Store logo"
                    style={{ maxHeight: 48, maxWidth: 180, objectFit: 'contain' }}
                    onError={() => setLogoLoadError(true)}
                  />
                </div>
                <div style={{ flex: 1, fontSize: 13, color: '#475569' }}>
                  Logo is active. It will display in the navbar instead of your brand name.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                    style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#334155', fontWeight: 500, fontSize: 12, cursor: uploadingLogo ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: uploadingLogo ? 0.7 : 1 }}
                  >
                    {uploadingLogo ? (
                      <><i className="fas fa-spinner fa-spin" style={{ marginInlineEnd: 5, fontSize: 10 }} />Replacing...</>
                    ) : (
                      <><i className="fas fa-sync-alt" style={{ marginInlineEnd: 5, fontSize: 10 }} />Replace</>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid #fecaca', background: '#fff', color: '#ef4444', fontWeight: 500, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    <i className="fas fa-trash" style={{ marginInlineEnd: 5, fontSize: 10 }} />
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => !uploadingLogo && logoInputRef.current?.click()}
                style={{
                  textAlign: 'center',
                  padding: '30px 20px',
                  color: '#94a3b8',
                  border: '2px dashed #e2e8f0',
                  borderRadius: 8,
                  cursor: uploadingLogo ? 'default' : 'pointer',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
                onMouseEnter={e => { if (!uploadingLogo) { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.background = '#f0f9ff'; } }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = 'transparent'; }}
              >
                {uploadingLogo ? (
                  <>
                    <div className="spinner" style={{ margin: '0 auto 12px' }} />
                    <p style={{ fontSize: 13, margin: 0 }}>Uploading logo...</p>
                  </>
                ) : (
                  <>
                    <i className="fas fa-image" style={{ fontSize: 28, marginBottom: 10, display: 'block' }} />
                    <p style={{ fontSize: 14, margin: '0 0 4px 0', fontWeight: 500 }}>Click to upload a logo</p>
                    <p style={{ fontSize: 12, margin: 0 }}>PNG, SVG, JPG, WebP, or GIF (max 10MB). Currently showing your brand name as text.</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {logoUrl && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <h3 className="card-title">Logo Settings</h3>
            </div>
            <div className="card-content">
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#334155', marginBottom: 8 }}>
                  Logo Size
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>Small</span>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input
                      type="range"
                      min="40"
                      max="250"
                      step="1"
                      value={logoSize}
                      onChange={(e) => setLogoSize(Number(e.target.value))}
                      style={{ width: '100%', cursor: 'pointer', accentColor: '#2563eb' }}
                    />
                  </div>
                  <span style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>Large</span>
                  <div style={{
                    background: '#f1f5f9',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontWeight: 600,
                    fontSize: 13,
                    color: '#334155',
                    minWidth: 44,
                    textAlign: 'center',
                  }}>
                    {logoSize}px
                  </div>
                </div>
                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 6, marginBottom: 0 }}>
                  <i className="fas fa-info-circle" style={{ marginInlineEnd: 4 }} />
                  Controls the logo width. If your logo has transparent space around it, try cropping it before uploading for best results.
                </p>
                <div style={{
                  marginTop: 12,
                  padding: 12,
                  background: '#f8fafc',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 60,
                }}>
                  <img
                    src={logoUrl}
                    alt="Size preview"
                    style={{ width: logoSize, height: 'auto', maxWidth: '100%', objectFit: 'contain' }}
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#334155', marginBottom: 8 }}>
                  Logo Position
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[
                    { value: 'left', label: "Left", icon: 'fa-align-left' },
                    { value: 'center', label: "Center", icon: 'fa-align-center' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setLogoPosition(opt.value)}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        borderRadius: 8,
                        border: `2px solid ${logoPosition === opt.value ? '#2563eb' : '#e2e8f0'}`,
                        background: logoPosition === opt.value ? '#eff6ff' : '#fff',
                        color: logoPosition === opt.value ? '#2563eb' : '#64748b',
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        fontFamily: 'inherit',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <i className={`fas ${opt.icon}`} style={{ fontSize: 14 }} />
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8, marginBottom: 0 }}>
                  <i className="fas fa-info-circle" style={{ marginInlineEnd: 4 }} />
                  {logoPosition === 'center'
                    ? "Logo will be centered in the navbar. On mobile, it stays in its default position."
                    : "Logo will appear on the left side of the navbar (default)."}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Navbar Icons</h3>
          </div>
          <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Choose which icons to show in the navbar. Search and Wishlist icons are always visible.
            </p>
            {[
              { label: "Account Icon", desc: "User/profile icon for login and account access", value: showAccountIcon, setter: setShowAccountIcon, icon: 'fa-user' },
              { label: "Cart Icon", desc: "Shopping bag icon with item count badge", value: showCartIcon, setter: setShowCartIcon, icon: 'fa-shopping-bag' },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: '#f8fafc',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  marginBottom: i === 0 ? 10 : 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <i className={`fas ${item.icon}`} style={{ fontSize: 16, color: item.value ? '#2563eb' : '#cbd5e1', width: 20, textAlign: 'center' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#334155' }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{item.desc}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => item.setter(!item.value)}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    border: 'none',
                    background: item.value ? '#2563eb' : '#cbd5e1',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background 0.2s ease',
                    flexShrink: 0,
                  }}
                >
                  <div style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: '#fff',
                    position: 'absolute',
                    top: 3,
                    left: item.value ? 23 : 3,
                    transition: 'left 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                  }} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title">Navbar Menu Groups</h3>
            <button
              type="button"
              onClick={addMenu}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: '2px solid #2563eb',
                background: '#2563eb',
                color: '#fff',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: 'inherit',
              }}
            >
              <i className="fas fa-plus" style={{ fontSize: 11 }} />
              Add Menu Group
            </button>
          </div>
          <div className="card-content">
            <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, marginBottom: 16 }}>
              <p style={{ marginBottom: 8 }}>
                <strong>Menu Groups</strong> appear as top-level items in your navbar. Each group can have a dropdown of links.
              </p>
              <ul style={{ paddingInlineStart: 20, margin: '0 0 8px 0' }}>
                <li>A group with <strong>multiple links</strong> shows a dropdown when hovered/clicked</li>
                <li>A group with <strong>one link</strong> navigates directly to that link</li>
                <li>A group with <strong>no links</strong> will not appear in the navbar</li>
                <li><strong>Categories not assigned</strong> to any group will still appear as individual links in the navbar (just like before)</li>
              </ul>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: 12 }}>
                <i className="fas fa-info-circle" style={{ marginInlineEnd: 4 }} />
                Static links like Home, About, Contact etc. will always appear in the navbar. A category can only belong to one group — it will be marked if already used elsewhere.
              </p>
            </div>

            {navbarMenus.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#94a3b8',
                border: '2px dashed #e2e8f0',
                borderRadius: 8,
              }}>
                <i className="fas fa-bars" style={{ fontSize: 32, marginBottom: 12, display: 'block' }} />
                <p style={{ fontSize: 14, margin: 0 }}>No menu groups yet. Click "Add Menu Group" to get started.</p>
                <p style={{ fontSize: 12, margin: '8px 0 0 0' }}>When no menu groups are defined, the navbar will show your categories directly.</p>
              </div>
            )}

            {navbarMenus.map((menu, menuIndex) => {
              const isExpanded = expandedMenu === menu.id;
              const isEditing = editingMenuId === menu.id;

              return (
                <div
                  key={menu.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    marginBottom: 12,
                    background: '#fff',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 16px',
                      background: isExpanded ? '#f8fafc' : '#fff',
                      cursor: 'pointer',
                      gap: 10,
                    }}
                    onClick={() => setExpandedMenu(isExpanded ? null : menu.id)}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); moveMenuUp(menuIndex); }}
                        disabled={menuIndex === 0}
                        style={{ background: 'none', border: 'none', cursor: menuIndex === 0 ? 'default' : 'pointer', padding: 0, fontSize: 10, color: menuIndex === 0 ? '#cbd5e1' : '#64748b', lineHeight: 1 }}
                      >
                        <i className="fas fa-chevron-up" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); moveMenuDown(menuIndex); }}
                        disabled={menuIndex === navbarMenus.length - 1}
                        style={{ background: 'none', border: 'none', cursor: menuIndex === navbarMenus.length - 1 ? 'default' : 'pointer', padding: 0, fontSize: 10, color: menuIndex === navbarMenus.length - 1 ? '#cbd5e1' : '#64748b', lineHeight: 1 }}
                      >
                        <i className="fas fa-chevron-down" />
                      </button>
                    </div>

                    <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'}`} style={{ fontSize: 12, color: '#94a3b8', width: 16 }} />

                    <div style={{ flex: 1 }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={() => saveEditName(menu.id)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveEditName(menu.id); } }}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                          placeholder="Enter menu group name..."
                          style={{
                            padding: '4px 8px',
                            border: '1px solid #2563eb',
                            borderRadius: 4,
                            fontSize: 14,
                            fontWeight: 600,
                            width: '100%',
                            maxWidth: 300,
                            fontFamily: 'inherit',
                            outline: 'none',
                          }}
                        />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: 14, color: menu.name ? '#1e293b' : '#94a3b8' }}>
                            {menu.name || "Untitled Group"}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); startEditName(menu); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', color: '#64748b', fontSize: 12 }}
                          >
                            <i className="fas fa-pen" />
                          </button>
                          <span style={{ fontSize: 12, color: '#94a3b8' }}>
                            ({menu.links.length} {menu.links.length === 1 ? "link" : "links"})
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeMenu(menu.id); }}
                      style={{
                        background: 'none',
                        border: '1px solid #fecaca',
                        borderRadius: 4,
                        cursor: 'pointer',
                        padding: '4px 8px',
                        color: '#ef4444',
                        fontSize: 12,
                      }}
                      title="Delete menu group"
                    >
                      <i className="fas fa-trash" />
                    </button>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: '0 16px 16px', borderTop: '1px solid #e2e8f0' }}>
                      {menu.links.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Dropdown Links
                          </label>
                          {menu.links.map((link, linkIndex) => (
                            <div
                              key={link.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '8px 10px',
                                background: '#f8fafc',
                                borderRadius: 6,
                                marginBottom: 6,
                                border: '1px solid #f1f5f9',
                              }}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <button
                                  type="button"
                                  onClick={() => moveLinkUp(menu.id, linkIndex)}
                                  disabled={linkIndex === 0}
                                  style={{ background: 'none', border: 'none', cursor: linkIndex === 0 ? 'default' : 'pointer', padding: 0, fontSize: 9, color: linkIndex === 0 ? '#cbd5e1' : '#64748b', lineHeight: 1 }}
                                >
                                  <i className="fas fa-chevron-up" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveLinkDown(menu.id, linkIndex)}
                                  disabled={linkIndex === menu.links.length - 1}
                                  style={{ background: 'none', border: 'none', cursor: linkIndex === menu.links.length - 1 ? 'default' : 'pointer', padding: 0, fontSize: 9, color: linkIndex === menu.links.length - 1 ? '#cbd5e1' : '#64748b', lineHeight: 1 }}
                                >
                                  <i className="fas fa-chevron-down" />
                                </button>
                              </div>

                              {link.type === 'custom' ? (
                                <div style={{ flex: 1, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                  <input
                                    type="text"
                                    value={link.label}
                                    onChange={(e) => updateLink(menu.id, link.id, 'label', e.target.value)}
                                    placeholder="Link label"
                                    style={{
                                      flex: '1 1 120px',
                                      padding: '6px 8px',
                                      border: '1px solid #e2e8f0',
                                      borderRadius: 4,
                                      fontSize: 13,
                                      fontFamily: 'inherit',
                                    }}
                                  />
                                  <input
                                    type="text"
                                    value={link.url}
                                    onChange={(e) => updateLink(menu.id, link.id, 'url', e.target.value)}
                                    placeholder="/page-url or https://..."
                                    style={{
                                      flex: '1 1 180px',
                                      padding: '6px 8px',
                                      border: '1px solid #e2e8f0',
                                      borderRadius: 4,
                                      fontSize: 13,
                                      fontFamily: 'inherit',
                                    }}
                                  />
                                </div>
                              ) : (
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <i className="fas fa-tag" style={{ fontSize: 11, color: '#94a3b8' }} />
                                  <span style={{ fontSize: 13, color: '#334155' }}>{link.label}</span>
                                  <span style={{ fontSize: 11, color: '#94a3b8' }}>→ {link.url}</span>
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() => removeLink(menu.id, link.id)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '4px',
                                  color: '#ef4444',
                                  fontSize: 12,
                                  flexShrink: 0,
                                }}
                                title="Remove link"
                              >
                                <i className="fas fa-times" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ marginTop: 14 }}>
                        <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Add Links
                        </label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                          <select
                            onChange={(e) => {
                              if (!e.target.value) return;
                              const cat = flatCats.find(c => c.slug === e.target.value);
                              if (cat) addLinkToMenu(menu.id, cat);
                              e.target.value = '';
                            }}
                            style={{
                              flex: '1 1 200px',
                              padding: '8px 10px',
                              border: '1px solid #e2e8f0',
                              borderRadius: 6,
                              fontSize: 13,
                              fontFamily: 'inherit',
                              background: '#fff',
                              cursor: 'pointer',
                            }}
                          >
                            <option value="">+ Add a category link...</option>
                            {flatCats.map(cat => {
                              const alreadyInThisGroup = menu.links.some(l => l.categorySlug === cat.slug);
                              const usedInGroup = navbarMenus.find(m => m.id !== menu.id && m.links.some(l => l.categorySlug === cat.slug));
                              const usedLabel = alreadyInThisGroup
                                ? "(already added)"
                                : usedInGroup
                                  ? `(used in "${usedInGroup.name || "Untitled Group"}")`
                                  : '';
                              return (
                                <option key={cat.id} value={cat.slug} disabled={alreadyInThisGroup}>
                                  {cat.name} {usedLabel}
                                </option>
                              );
                            })}
                          </select>

                          <button
                            type="button"
                            onClick={() => addCustomLinkToMenu(menu.id)}
                            style={{
                              padding: '8px 14px',
                              borderRadius: 6,
                              border: '1px solid #e2e8f0',
                              background: '#fff',
                              color: '#334155',
                              fontWeight: 500,
                              fontSize: 13,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              fontFamily: 'inherit',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <i className="fas fa-link" style={{ fontSize: 11 }} />
                            Custom Link
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Transparent on hero ──────────────────────────────── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Transparent on hero</h3>
          </div>
          <div className="card-content">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                background: '#f8fafc',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                marginBottom: navTransparent ? 14 : 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <i className="fas fa-image" style={{ fontSize: 16, color: navTransparent ? '#2563eb' : '#cbd5e1', width: 20, textAlign: 'center' }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#334155' }}>Transparent on hero</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>Navbar starts transparent over the hero image, fades solid on scroll</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNavTransparent(v => !v)}
                style={{
                  width: 44, height: 24, borderRadius: 12, border: 'none',
                  background: navTransparent ? '#2563eb' : '#cbd5e1',
                  cursor: 'pointer', position: 'relative',
                  transition: 'background 0.2s ease', flexShrink: 0,
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3,
                  left: navTransparent ? 23 : 3,
                  transition: 'left 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                }} />
              </button>
            </div>
            {navTransparent && (
              <AdminColorField
                label="Transparent text / icon color"
                value={navTransparentText}
                fallback="#ffffff"
                onChange={setNavTransparentText}
              />
            )}
          </div>
        </div>

        </>}

        {activeView === 'appearance' && <>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Navigation Style</h3>
          </div>
          <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Customize the navigation bar's colors and fonts. Leave a field blank to use the template default.
            </p>

            <div style={{
              padding: 16,
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              marginBottom: 24,
              background: navBg || '#f8f8f5',
              transition: 'background 0.2s ease',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{
                  fontFamily: brandFont || "'Playfair Display', serif",
                  fontSize: 22,
                  fontWeight: 600,
                  color: brandColor || '#000',
                }}>
                  {siteConfig?.name || 'Your Brand'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                  {['Shop', 'About', 'Contact'].map((label, i) => (
                    <span
                      key={label}
                      style={{
                        fontFamily: navFont || 'inherit',
                        color: i === 1 ? (navLinkHover || (isModern ? '#000000' : '#c59d5f')) : (navLinkText || '#333'),
                        fontSize: 13,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}
                    >
                      {label}
                    </span>
                  ))}
                  <i className="fas fa-shopping-bag" style={{ color: navIcon || navLinkText || '#333', fontSize: 16 }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
              <AdminColorField
                label="Navbar Background"
                value={navBg}
                fallback={isModern ? '#ffffff' : '#f8f8f5'}
                onChange={setNavBg}
              />
              <AdminColorField
                label="Logo / Brand Color"
                value={brandColor}
                fallback="#000000"
                onChange={setBrandColor}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <AdminFontPicker
                label="Logo / Brand Font"
                value={brandFont}
                onChange={setBrandFont}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
              <AdminColorField
                label="Nav Link Color"
                value={navLinkText}
                fallback="#333333"
                onChange={setNavLinkText}
              />
              <AdminColorField
                label="Nav Link Hover"
                value={navLinkHover}
                fallback={isModern ? '#000000' : '#c59d5f'}
                onChange={setNavLinkHover}
              />
              <AdminColorField
                label="Icon Color"
                value={navIcon}
                fallback="#333333"
                onChange={setNavIcon}
              />
            </div>

            <AdminFontPicker
              label="Nav Menu Font"
              value={navFont}
              onChange={setNavFont}
            />

            <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 12, marginBottom: 0 }}>
              <i className="fas fa-info-circle" style={{ marginInlineEnd: 4 }} />
              The mobile menu inherits these colors and fonts automatically.
            </p>
          </div>
        </div>

        {/* ── Cart & Wishlist Panels ── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Cart &amp; Wishlist Panels</h3>
          </div>
          <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              These colors and font apply to both the cart and wishlist panels.
              Leave any field blank to use the template default.
            </p>

            {/* Live mini-preview */}
            {(() => {
              const prevBg = panelBg || '#ffffff';
              const prevText = panelText || '#333333';
              const prevMuted = panelMuted || '#888888';
              const prevAccent = panelAccent || (isModern ? '#111111' : '#c8a97e');
              const prevAccentText = panelAccentText || '#ffffff';
              const prevFont = panelFont || 'inherit';
              return (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', marginBottom: 24, background: prevBg, fontFamily: prevFont, boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: `1px solid ${prevMuted}` }}>
                    <div style={{ color: prevText, fontSize: 17, fontWeight: 500 }}>Cart</div>
                    <div style={{ background: '#f5f5f5', color: '#555', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>×</div>
                  </div>
                  <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: '60px 1fr', gap: 12 }}>
                    <div style={{ width: 60, height: 60, borderRadius: 8, background: '#f1f5f9' }} />
                    <div>
                      <div style={{ color: prevText, fontWeight: 500, fontSize: 14, marginBottom: 4 }}>Sample item</div>
                      <div style={{ color: prevMuted, fontSize: 13, marginBottom: 6 }}>Qty 1</div>
                      <div style={{ color: prevAccent, fontWeight: 600, fontSize: 14 }}>$49.00</div>
                    </div>
                  </div>
                  <div style={{ padding: '12px 16px', borderTop: `1px solid ${prevMuted}`, background: prevBg }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: prevText, fontWeight: 500, fontSize: 14, marginBottom: 10 }}>
                      <span>Subtotal</span><span>$49.00</span>
                    </div>
                    <button type="button" disabled style={{ display: 'block', width: '100%', padding: '10px 14px', border: 'none', borderRadius: 4, background: prevAccent, color: prevAccentText, fontWeight: 500, fontSize: 14, fontFamily: 'inherit', cursor: 'default' }}>
                      Checkout
                    </button>
                  </div>
                </div>
              );
            })()}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
              <AdminColorField label="Background" value={panelBg} fallback="#ffffff" onChange={setPanelBg} />
              <AdminColorField label="Text Color" value={panelText} fallback="#333333" onChange={setPanelText} />
              <AdminColorField label="Muted Text / Borders" value={panelMuted} fallback="#888888" onChange={setPanelMuted} />
              <AdminColorField label="Accent (Buttons, Price)" value={panelAccent} fallback={isModern ? '#111111' : '#c8a97e'} onChange={setPanelAccent} />
              <AdminColorField label="Accent Text" value={panelAccentText} fallback="#ffffff" onChange={setPanelAccentText} />
            </div>
            <AdminFontPicker label="Panel Font" value={panelFont} onChange={setPanelFont} />
          </div>
        </div>
        </>}

        {status && (
          <div style={{
            background: status === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${status === 'success' ? '#bbf7d0' : '#fecaca'}`,
            borderRadius: 8,
            padding: '12px 16px',
            color: status === 'success' ? '#166534' : '#dc2626',
            marginBottom: 16,
            fontSize: 14,
          }}>
            {status === 'success' ? "Navbar configuration saved successfully!" : status.replace('error:', "Failed to save: ")}
          </div>
        )}

        <SaveBar saving={saving} hasChanges={hasChanges} onSave={(e) => handleSave(e || { preventDefault: () => {} })} />
      </form>
    </div>

      <ConfirmModal
        open={!!confirmModal}
        title={confirmModal?.title || ''}
        message={confirmModal?.message || ''}
        confirmText={confirmModal?.confirmText}
        cancelText={confirmModal?.cancelText}
        danger={confirmModal?.danger}
        onConfirm={() => { confirmModal?.onConfirm?.(); setConfirmModal(null); }}
        onCancel={() => setConfirmModal(null)}
      />
    </>
  );
}