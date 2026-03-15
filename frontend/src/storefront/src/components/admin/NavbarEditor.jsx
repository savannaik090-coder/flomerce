import React, { useState, useEffect, useContext, useRef } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { getCategories } from '../../services/categoryService.js';

const API_BASE = typeof window !== 'undefined' && window.location.hostname.endsWith('fluxe.in') ? '' : 'https://fluxe.in';

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [navbarMenus, setNavbarMenus] = useState([]);
  const [categories, setCategories] = useState([]);
  const [expandedMenu, setExpandedMenu] = useState(null);
  const [editingMenuId, setEditingMenuId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (siteConfig?.id) {
      loadNavbarConfig();
      loadCategories();
    }
  }, [siteConfig?.id]);

  useEffect(() => {
    if (!hasLoadedRef.current || !onPreviewUpdate) return;
    onPreviewUpdate({ navbarMenus });
  }, [navbarMenus]);

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
        setNavbarMenus(settings.navbarMenus || []);
      }
    } catch (e) {
      console.error('Failed to load navbar config:', e);
    } finally {
      hasLoadedRef.current = true;
      setLoading(false);
    }
  }

  function validateMenus() {
    for (const menu of navbarMenus) {
      if (!menu.name || !menu.name.trim()) continue;
      for (const link of menu.links) {
        if (link.type === 'custom' && (!link.label.trim() || !link.url.trim())) {
          return 'Please fill in both label and URL for all custom links, or remove empty ones.';
        }
        if (link.url && !link.url.startsWith('/') && !link.url.startsWith('http://') && !link.url.startsWith('https://')) {
          return `Invalid URL "${link.url}". URLs must start with / or http:// or https://.`;
        }
      }
    }
    return null;
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
        body: JSON.stringify({ settings: { navbarMenus: cleanMenus } }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setStatus('success');
        if (refetchSite) refetchSite();
        if (onSaved) onSaved();
      } else {
        setStatus('error:' + (result.error || 'Unknown error'));
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
    setNavbarMenus(prev => prev.filter(m => m.id !== menuId));
    if (expandedMenu === menuId) setExpandedMenu(null);
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
    <div style={{ maxWidth: 750 }}>
      <form onSubmit={handleSave}>
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
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Create named menu groups for your store's navigation bar. Each group shows as a link in the navbar, and clicking it opens a dropdown with the links you add below. Groups without any links will show as a direct link (no dropdown).
            </p>

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
                            {menu.name || 'Untitled Group'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); startEditName(menu); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', color: '#64748b', fontSize: 12 }}
                          >
                            <i className="fas fa-pen" />
                          </button>
                          <span style={{ fontSize: 12, color: '#94a3b8' }}>
                            ({menu.links.length} {menu.links.length === 1 ? 'link' : 'links'})
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
                              const alreadyAdded = menu.links.some(l => l.categorySlug === cat.slug);
                              return (
                                <option key={cat.id} value={cat.slug} disabled={alreadyAdded}>
                                  {cat.name} {alreadyAdded ? '(already added)' : ''}
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

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">How It Works</h3>
          </div>
          <div className="card-content">
            <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7 }}>
              <p style={{ marginBottom: 10 }}><strong>Menu Groups</strong> appear as top-level items in your navbar. Each group can have a dropdown of links.</p>
              <ul style={{ paddingLeft: 20, margin: '0 0 10px 0' }}>
                <li>A group with <strong>multiple links</strong> shows a dropdown when hovered/clicked</li>
                <li>A group with <strong>one link</strong> navigates directly to that link</li>
                <li>A group with <strong>no links</strong> will not appear in the navbar</li>
                <li>If <strong>no menu groups</strong> are defined, the navbar shows your categories directly (default behavior)</li>
              </ul>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: 12 }}>
                <i className="fas fa-info-circle" style={{ marginRight: 4 }} />
                Static links like Home, About, Contact etc. will always appear in the navbar.
              </p>
            </div>
          </div>
        </div>

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
            {status === 'success' ? 'Navbar configuration saved successfully!' : status.replace('error:', 'Failed to save: ')}
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={saving} style={{ width: '100%' }}>
          {saving ? 'Saving...' : 'Save Navbar Configuration'}
        </button>
      </form>
    </div>
  );
}
