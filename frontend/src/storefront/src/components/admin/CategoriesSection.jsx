import React, { useState, useEffect, useContext, useRef } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../services/categoryService.js';

const API_BASE = typeof window !== 'undefined' && window.location.hostname.endsWith('fluxe.in') ? '' : 'https://fluxe.in';

function resolveImageUrl(src) {
  if (!src) return '';
  if (src.startsWith('data:') || src.startsWith('http')) return src;
  if (src.startsWith('/api/')) return `${API_BASE}${src}`;
  return src;
}

function Toggle({ checked, onChange, size = 'normal' }) {
  const w = size === 'small' ? 36 : 44;
  const h = size === 'small' ? 20 : 24;
  const dot = size === 'small' ? 16 : 20;
  const onLeft = size === 'small' ? 18 : 22;
  return (
    <label style={{ position: 'relative', display: 'inline-block', width: w, height: h, cursor: 'pointer', flexShrink: 0 }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ opacity: 0, width: 0, height: 0 }} />
      <span style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: checked ? '#10b981' : '#cbd5e1', borderRadius: h, transition: 'background-color 0.2s' }}>
        <span style={{ position: 'absolute', left: checked ? onLeft : 2, top: 2, width: dot, height: dot, backgroundColor: '#fff', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
      </span>
    </label>
  );
}

export default function CategoriesSection({ onSaved }) {
  const { siteConfig, refetchSite } = useContext(SiteContext);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySubtitle, setNewCategorySubtitle] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategorySubtitle, setEditCategorySubtitle] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadingImage, setUploadingImage] = useState(null);

  const [expandedCat, setExpandedCat] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [addingGroup, setAddingGroup] = useState(false);
  const [newValueName, setNewValueName] = useState('');
  const [addingValueTo, setAddingValueTo] = useState(null);
  const [addingValue, setAddingValue] = useState(false);

  const [chooseEnabled, setChooseEnabled] = useState(false);
  const [chooseCats, setChooseCats] = useState({});
  const [chooseUploadingId, setChooseUploadingId] = useState(null);

  const [subcatSections, setSubcatSections] = useState([]);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionSubtitle, setNewSectionSubtitle] = useState('');
  const [newSectionSubcatId, setNewSectionSubcatId] = useState('');

  const [sectionOrder, setSectionOrder] = useState([]);

  const [chooseChanged, setChooseChanged] = useState(false);
  const [subcatChanged, setSubcatChanged] = useState(false);
  const [orderChanged, setOrderChanged] = useState(false);
  const dirtyRef = useRef(false);
  dirtyRef.current = chooseChanged || subcatChanged || orderChanged;

  useEffect(() => {
    if (siteConfig?.id) loadCategories();
  }, [siteConfig?.id]);

  useEffect(() => {
    if (siteConfig?.settings) {
      if (dirtyRef.current) return;
      let settings = {};
      try {
        settings = typeof siteConfig.settings === 'string' ? JSON.parse(siteConfig.settings) : (siteConfig.settings || {});
      } catch (e) { settings = {}; }
      const conf = settings.chooseByCategory || {};
      setChooseEnabled(!!conf.enabled);
      setChooseCats(conf.categories || {});
      setSubcatSections(settings.subcategorySections || []);
      setSectionOrder(settings.homepageSectionOrder || []);
    }
  }, [siteConfig?.settings]);

  async function loadCategories() {
    setLoading(true);
    try {
      const res = await getCategories(siteConfig.id);
      setCategories(res.data || res.categories || []);
    } catch (e) { setCategories([]); }
    finally { setLoading(false); }
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    try {
      const slug = newCategoryName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      await createCategory({ siteId: siteConfig.id, name: newCategoryName.trim(), slug, subtitle: newCategorySubtitle.trim() || null, showOnHome: true, displayOrder: categories.length });
      setNewCategoryName('');
      setNewCategorySubtitle('');
      await loadCategories();
      if (onSaved) onSaved();
    } catch (e) { alert('Failed to add category: ' + e.message); }
  }

  async function handleDeleteCategory(categoryId) {
    if (!window.confirm('Delete this category? Products in this category will not be deleted.')) return;
    try {
      await deleteCategory(categoryId, siteConfig?.id);
      await loadCategories();
      if (onSaved) onSaved();
    } catch (e) { alert('Failed to delete category: ' + e.message); }
  }

  async function handleUpdateCategory(categoryId) {
    if (!editCategoryName.trim()) return;
    try {
      const slug = editCategoryName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      await updateCategory(categoryId, { name: editCategoryName.trim(), slug, subtitle: editCategorySubtitle.trim() || null }, siteConfig?.id);
      setEditingCategory(null);
      setEditCategoryName('');
      setEditCategorySubtitle('');
      await loadCategories();
      if (onSaved) onSaved();
    } catch (e) { alert('Failed to update category: ' + e.message); }
  }

  async function handleToggleHomepage(categoryId, currentValue) {
    try {
      await updateCategory(categoryId, { showOnHome: !currentValue }, siteConfig?.id);
      await loadCategories();
      if (onSaved) onSaved();
    } catch (e) { alert('Failed to update: ' + e.message); }
  }

  async function handleImageUpload(categoryId, file) {
    if (!file) return;
    setUploadingImage(categoryId);
    try {
      const formData = new FormData();
      formData.append('images', file, file.name || 'category-image.jpg');
      const token = sessionStorage.getItem('site_admin_token');
      const response = await fetch(`${API_BASE}/api/upload/image?siteId=${siteConfig.id}`, { method: 'POST', headers: { 'Authorization': token ? `SiteAdmin ${token}` : '' }, body: formData });
      const result = await response.json();
      if (result.success && result.data?.images?.length > 0 && result.data.images[0].url) {
        await updateCategory(categoryId, { imageUrl: result.data.images[0].url }, siteConfig?.id);
        await loadCategories();
        if (onSaved) onSaved();
      } else { alert('Image upload failed'); }
    } catch (e) { alert('Failed to upload image: ' + e.message); }
    finally { setUploadingImage(null); }
  }

  async function handleRemoveImage(categoryId) {
    try {
      await updateCategory(categoryId, { imageUrl: null }, siteConfig?.id);
      await loadCategories();
      if (onSaved) onSaved();
    } catch (e) { alert('Failed to remove image: ' + e.message); }
  }

  async function handleAddGroup(categoryId) {
    if (!newGroupName.trim()) return;
    setAddingGroup(true);
    try {
      await createCategory({ siteId: siteConfig.id, name: newGroupName.trim(), parentId: categoryId, showOnHome: false });
      setNewGroupName('');
      await loadCategories();
    } catch (e) { alert('Failed to add group: ' + e.message); }
    finally { setAddingGroup(false); }
  }

  async function handleAddValue(groupId) {
    if (!newValueName.trim()) return;
    setAddingValue(true);
    try {
      await createCategory({ siteId: siteConfig.id, name: newValueName.trim(), parentId: groupId, showOnHome: false });
      setNewValueName('');
      setAddingValueTo(null);
      await loadCategories();
    } catch (e) { alert('Failed to add value: ' + e.message); }
    finally { setAddingValue(false); }
  }

  async function handleDeleteSubItem(itemId) {
    if (!window.confirm('Delete this item?')) return;
    try {
      await deleteCategory(itemId, siteConfig?.id);
      await loadCategories();
    } catch (e) { alert('Failed to delete: ' + e.message); }
  }

  function handleChooseToggle() {
    setChooseEnabled(!chooseEnabled);
    setChooseChanged(true);
  }

  function handleChooseCatToggle(catId) {
    setChooseCats(prev => {
      const current = prev[catId] || {};
      return { ...prev, [catId]: { ...current, visible: !current.visible } };
    });
    setChooseChanged(true);
  }

  async function handleChooseImageUpload(catId, file) {
    if (!file) return;
    setChooseUploadingId(catId);
    try {
      const formData = new FormData();
      formData.append('images', file, file.name || 'browse-category.jpg');
      const token = sessionStorage.getItem('site_admin_token');
      const response = await fetch(`${API_BASE}/api/upload/image?siteId=${siteConfig.id}`, { method: 'POST', headers: { 'Authorization': token ? `SiteAdmin ${token}` : '' }, body: formData });
      const result = await response.json();
      if (result.success && result.data?.images?.length > 0 && result.data.images[0].url) {
        setChooseCats(prev => {
          const current = prev[catId] || {};
          return { ...prev, [catId]: { ...current, browseImage: result.data.images[0].url } };
        });
        setChooseChanged(true);
      } else { alert('Image upload failed'); }
    } catch (e) { alert('Failed to upload: ' + e.message); }
    finally { setChooseUploadingId(null); }
  }

  function handleChooseImageRemove(catId) {
    setChooseCats(prev => {
      const current = prev[catId] || {};
      return { ...prev, [catId]: { ...current, browseImage: null } };
    });
    setChooseChanged(true);
  }

  function findSubcatInfo(subcatId) {
    for (const cat of categories) {
      for (const group of (cat.children || [])) {
        for (const val of (group.children || [])) {
          if (val.id === subcatId) return { valueName: val.name, groupName: group.name, categoryName: cat.name, categorySlug: cat.slug, categoryId: cat.id };
        }
        if (group.id === subcatId) return { valueName: group.name, groupName: null, categoryName: cat.name, categorySlug: cat.slug, categoryId: cat.id };
      }
    }
    return null;
  }

  function handleAddSubcatSection() {
    if (!newSectionName.trim() || !newSectionSubcatId) return;
    const info = findSubcatInfo(newSectionSubcatId);
    const section = {
      id: Date.now().toString(),
      name: newSectionName.trim(),
      subtitle: newSectionSubtitle.trim() || null,
      subcategoryId: newSectionSubcatId,
      categorySlug: info?.categorySlug || '',
      categoryId: info?.categoryId || '',
      subcategoryLabel: info ? `${info.categoryName} > ${info.groupName ? info.groupName + ' > ' : ''}${info.valueName}` : '',
    };
    setSubcatSections([...subcatSections, section]);
    setNewSectionName('');
    setNewSectionSubtitle('');
    setNewSectionSubcatId('');
    setSubcatChanged(true);
  }

  function handleRemoveSubcatSection(sectionId) {
    setSubcatSections(subcatSections.filter(s => s.id !== sectionId));
    setSectionOrder(sectionOrder.filter(s => !(s.type === 'subcategory' && s.id === sectionId)));
    setSubcatChanged(true);
    setOrderChanged(true);
  }

  function buildUnifiedSections() {
    const homeCats = categories.filter(c => c.show_on_home === 1 && !c.parent_id);
    const allItems = [];
    homeCats.forEach(cat => allItems.push({ type: 'category', id: cat.id, name: cat.name }));
    subcatSections.forEach(sec => allItems.push({ type: 'subcategory', id: sec.id, name: sec.name, subtitle: sec.subtitle, label: sec.subcategoryLabel }));
    if (sectionOrder.length === 0) return allItems;
    const ordered = [];
    const remaining = [...allItems];
    for (const entry of sectionOrder) {
      const idx = remaining.findIndex(item => item.type === entry.type && item.id === entry.id);
      if (idx !== -1) ordered.push(remaining.splice(idx, 1)[0]);
    }
    return [...ordered, ...remaining];
  }

  function handleMoveSection(index, direction) {
    const unified = buildUnifiedSections();
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= unified.length) return;
    const newArr = [...unified];
    [newArr[index], newArr[newIndex]] = [newArr[newIndex], newArr[index]];
    setSectionOrder(newArr.map(item => ({ type: item.type, id: item.id })));
    setOrderChanged(true);
  }

  const hasUnsavedChanges = chooseChanged || subcatChanged || orderChanged;

  async function handleSaveAllSettings() {
    setSaving(true);
    try {
      const token = sessionStorage.getItem('site_admin_token');
      const settingsPayload = {};
      if (chooseChanged) settingsPayload.chooseByCategory = { enabled: chooseEnabled, categories: chooseCats };
      if (subcatChanged) settingsPayload.subcategorySections = subcatSections;
      if (orderChanged) settingsPayload.homepageSectionOrder = sectionOrder;
      const response = await fetch(`${API_BASE}/api/sites/${siteConfig.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': token ? `SiteAdmin ${token}` : '' },
        body: JSON.stringify({ settings: settingsPayload }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        alert('Failed to save: ' + (result.error || 'Unknown error'));
      } else {
        setChooseChanged(false);
        setSubcatChanged(false);
        setOrderChanged(false);
        if (onSaved) onSaved();
      }
    } catch (e) { alert('Failed to save: ' + e.message); }
    finally { setSaving(false); }
  }

  const filtered = categories.filter(c => !searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const unifiedSections = buildUnifiedSections();

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  return (
    <div>
      {hasUnsavedChanges && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 20,
          background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff',
          padding: '12px 20px', borderRadius: 10, marginBottom: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fas fa-info-circle" />
            <span style={{ fontSize: 14, fontWeight: 500 }}>You have unsaved changes</span>
          </div>
          <button
            onClick={handleSaveAllSettings}
            disabled={saving}
            style={{
              padding: '8px 24px', background: '#fff', color: '#2563eb',
              border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
              cursor: 'pointer', opacity: saving ? 0.7 : 1,
            }}
          >{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Search categories..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', background: '#f8fafc' }}
        />
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Create New Category</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            type="text" placeholder="Category name (e.g. New Arrivals, Best Sellers)"
            value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            style={{ padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
          <input
            type="text" placeholder="Short description (optional)"
            value={newCategorySubtitle} onChange={(e) => setNewCategorySubtitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            style={{ padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', color: '#64748b' }}
          />
          <button className="btn btn-primary" onClick={handleAddCategory} style={{ alignSelf: 'flex-start' }}>
            <i className="fas fa-plus" style={{ marginRight: 6 }} />Add Category
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
          <i className="fas fa-folder-open" style={{ fontSize: 40, marginBottom: 12, display: 'block' }} />
          <h3 style={{ margin: '0 0 8px', color: '#64748b' }}>{searchTerm ? 'No categories match your search' : 'No categories yet'}</h3>
          <p style={{ margin: 0, fontSize: 14 }}>Create your first category to organize your products.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Your Categories ({filtered.length})</h3>
          {filtered.map(cat => (
            <div key={cat.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: 16, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ width: 100, flexShrink: 0 }}>
                  {cat.image_url ? (
                    <div style={{ position: 'relative' }}>
                      <img src={resolveImageUrl(cat.image_url)} alt={cat.name} style={{ width: '100%', height: 70, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }} />
                      <button onClick={() => handleRemoveImage(cat.id)} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>x</button>
                      <label style={{ display: 'block', textAlign: 'center', marginTop: 4, fontSize: 11, color: '#3b82f6', cursor: 'pointer' }}>
                        Change
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { if (e.target.files[0]) handleImageUpload(cat.id, e.target.files[0]); }} disabled={uploadingImage === cat.id} />
                      </label>
                    </div>
                  ) : (
                    <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: 70, border: '2px dashed #e2e8f0', borderRadius: 8, cursor: 'pointer', color: '#94a3b8', fontSize: 11 }}>
                      {uploadingImage === cat.id ? <span>Uploading...</span> : <><i className="fas fa-image" style={{ fontSize: 16, marginBottom: 2 }} /><span>Add Image</span></>}
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { if (e.target.files[0]) handleImageUpload(cat.id, e.target.files[0]); }} disabled={uploadingImage === cat.id} />
                    </label>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingCategory === cat.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input type="text" value={editCategoryName} onChange={(e) => setEditCategoryName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUpdateCategory(cat.id)} placeholder="Category name" style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} autoFocus />
                      <input type="text" value={editCategorySubtitle} onChange={(e) => setEditCategorySubtitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUpdateCategory(cat.id)} placeholder="Short description (optional)" style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', color: '#64748b' }} />
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-primary btn-sm" onClick={() => handleUpdateCategory(cat.id)}>Save</button>
                        <button className="btn btn-outline btn-sm" onClick={() => setEditingCategory(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15, color: '#1e293b', marginBottom: 2 }}>{cat.name}</div>
                      {cat.subtitle && <div style={{ color: '#64748b', fontSize: 13, marginBottom: 4 }}>{cat.subtitle}</div>}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Show on Home</div>
                    <Toggle checked={!!cat.show_on_home} onChange={() => handleToggleHomepage(cat.id, !!cat.show_on_home)} size="small" />
                  </div>
                  {editingCategory !== cat.id && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)} title="Subcategories" style={{ padding: '6px 8px', background: expandedCat === cat.id ? '#eff6ff' : 'none', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', color: expandedCat === cat.id ? '#3b82f6' : '#64748b', fontSize: 13 }}>
                        <i className="fas fa-layer-group" />
                      </button>
                      <button onClick={() => { setEditingCategory(cat.id); setEditCategoryName(cat.name); setEditCategorySubtitle(cat.subtitle || ''); }} style={{ padding: '6px 8px', background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', color: '#64748b', fontSize: 13 }}>
                        <i className="fas fa-edit" />
                      </button>
                      <button onClick={() => handleDeleteCategory(cat.id)} style={{ padding: '6px 8px', background: 'none', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', color: '#ef4444', fontSize: 13 }}>
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {expandedCat === cat.id && (
                <div style={{ borderTop: '1px solid #f1f5f9', padding: 16, background: '#fafbfc' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#475569', marginBottom: 12 }}>Subcategory Groups</div>
                  {(cat.children || []).length === 0 && (
                    <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 12px' }}>No subcategory groups yet. Create one below to organize product variants like Color, Size, etc.</p>
                  )}
                  {(cat.children || []).map(group => (
                    <div key={group.id} style={{ marginBottom: 12, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#334155' }}>{group.name}</div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => { setAddingValueTo(addingValueTo === group.id ? null : group.id); setNewValueName(''); }} style={{ padding: '4px 10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>+ Add Value</button>
                          <button onClick={() => handleDeleteSubItem(group.id)} style={{ padding: '4px 8px', background: 'none', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}><i className="fas fa-trash" style={{ fontSize: 11 }} /></button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {(group.children || []).length === 0 && <span style={{ color: '#94a3b8', fontSize: 12 }}>No values yet</span>}
                        {(group.children || []).map(val => (
                          <div key={val.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 20, padding: '4px 10px', fontSize: 13 }}>
                            <span>{val.name}</span>
                            <button onClick={() => handleDeleteSubItem(val.id)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }} title="Remove">x</button>
                          </div>
                        ))}
                      </div>
                      {addingValueTo === group.id && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                          <input type="text" value={newValueName} onChange={e => setNewValueName(e.target.value)} placeholder={`Add value to ${group.name}`} onKeyDown={e => { if (e.key === 'Enter') handleAddValue(group.id); }} style={{ flex: 1, padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} autoFocus />
                          <button onClick={() => handleAddValue(group.id)} disabled={addingValue || !newValueName.trim()} style={{ padding: '6px 14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', opacity: addingValue || !newValueName.trim() ? 0.5 : 1 }}>{addingValue ? '...' : 'Add'}</button>
                        </div>
                      )}
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <input type="text" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="New group name (e.g. Color, Size, Material)" onKeyDown={e => { if (e.key === 'Enter') handleAddGroup(cat.id); }} style={{ flex: 1, padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                    <button onClick={() => handleAddGroup(cat.id)} disabled={addingGroup || !newGroupName.trim()} className="btn btn-primary btn-sm" style={{ opacity: addingGroup || !newGroupName.trim() ? 0.5 : 1 }}>{addingGroup ? '...' : 'Add Group'}</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Featured Subcategory Sections</h3>
        <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 16px' }}>
          Add product sections to your homepage that show items from a specific subcategory. For example, show only "T-Shirts" or "Gold Jewellery" as a featured section.
        </p>

        {subcatSections.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {subcatSections.map(section => (
              <div key={section.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{section.name}</div>
                  {section.subtitle && <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{section.subtitle}</div>}
                  <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>
                    Shows products from: {section.subcategoryLabel || 'Selected subcategory'}
                  </div>
                </div>
                <button onClick={() => handleRemoveSubcatSection(section.id)} style={{ padding: '6px 10px', background: 'none', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}><i className="fas fa-trash" style={{ fontSize: 11 }} /></button>
              </div>
            ))}
          </div>
        )}

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: '#475569' }}>Add New Featured Section</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input type="text" placeholder="Section title (e.g. Trending T-Shirts)" value={newSectionName} onChange={e => setNewSectionName(e.target.value)} style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff' }} />
            <input type="text" placeholder="Short description (optional)" value={newSectionSubtitle} onChange={e => setNewSectionSubtitle(e.target.value)} style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', color: '#64748b', background: '#fff' }} />
            <select value={newSectionSubcatId} onChange={e => setNewSectionSubcatId(e.target.value)} style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, background: '#fff', fontFamily: 'inherit', boxSizing: 'border-box' }}>
              <option value="">Choose which products to show...</option>
              {categories.map(cat => {
                const groups = cat.children || [];
                if (groups.length === 0) return null;
                return groups.map(group => {
                  const values = group.children || [];
                  if (values.length === 0) return <option key={group.id} value={group.id}>{cat.name} &gt; {group.name}</option>;
                  return (
                    <optgroup key={group.id} label={`${cat.name} > ${group.name}`}>
                      {values.map(val => <option key={val.id} value={val.id}>{val.name}</option>)}
                    </optgroup>
                  );
                });
              })}
            </select>
            <button className="btn btn-primary" onClick={handleAddSubcatSection} disabled={!newSectionName.trim() || !newSectionSubcatId} style={{ alignSelf: 'flex-start', opacity: (!newSectionName.trim() || !newSectionSubcatId) ? 0.5 : 1 }}>
              <i className="fas fa-plus" style={{ marginRight: 6 }} />Add Section
            </button>
          </div>
        </div>
      </div>

      {unifiedSections.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Homepage Display Order</h3>
          <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 16px' }}>
            Arrange the order in which product sections appear on your homepage. The first section shows right after the hero banner.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {unifiedSections.map((item, idx) => (
              <div key={`${item.type}-${item.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                  <button onClick={() => handleMoveSection(idx, 'up')} disabled={idx === 0} style={{ padding: '3px 7px', background: idx === 0 ? '#f8fafc' : '#fff', border: '1px solid #e2e8f0', borderRadius: 4, cursor: idx === 0 ? 'default' : 'pointer', fontSize: 10, color: idx === 0 ? '#cbd5e1' : '#64748b' }}><i className="fas fa-chevron-up" /></button>
                  <button onClick={() => handleMoveSection(idx, 'down')} disabled={idx === unifiedSections.length - 1} style={{ padding: '3px 7px', background: idx === unifiedSections.length - 1 ? '#f8fafc' : '#fff', border: '1px solid #e2e8f0', borderRadius: 4, cursor: idx === unifiedSections.length - 1 ? 'default' : 'pointer', fontSize: 10, color: idx === unifiedSections.length - 1 ? '#cbd5e1' : '#64748b' }}><i className="fas fa-chevron-down" /></button>
                </div>
                <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, background: '#e2e8f0', color: '#475569', flexShrink: 0 }}>{idx + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{item.name}</div>
                  {item.label && <div style={{ color: '#94a3b8', fontSize: 11 }}>{item.label}</div>}
                </div>
                <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: item.type === 'category' ? '#dbeafe' : '#fae8ff', color: item.type === 'category' ? '#2563eb' : '#a21caf', flexShrink: 0 }}>
                  {item.type === 'category' ? 'Category' : 'Subcategory'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Browse by Category Circles</h3>
          <Toggle checked={chooseEnabled} onChange={handleChooseToggle} />
        </div>
        <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 16px' }}>
          Show circular category icons on your homepage so customers can quickly browse by category.
        </p>
        <div style={{ opacity: chooseEnabled ? 1 : 0.4, pointerEvents: chooseEnabled ? 'auto' : 'none', transition: 'opacity 0.3s' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {categories.map(cat => {
              const conf = chooseCats[cat.id] || {};
              const isVisible = !!conf.visible;
              const browseImg = conf.browseImage;
              return (
                <div key={cat.id} style={{ border: isVisible ? '2px solid #10b981' : '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', background: '#fff', transition: 'border-color 0.2s' }}>
                  <div style={{ position: 'relative', width: '100%', height: 120, background: '#f8f8f5' }}>
                    {browseImg ? (
                      <>
                        <img src={resolveImageUrl(browseImg)} alt={cat.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        <button onClick={() => handleChooseImageRemove(cat.id)} style={{ position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>x</button>
                        <label style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(255,255,255,0.9)', borderRadius: 4, padding: '2px 8px', fontSize: 11, color: '#3b82f6', cursor: 'pointer' }}>
                          Change
                          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { if (e.target.files[0]) handleChooseImageUpload(cat.id, e.target.files[0]); }} disabled={chooseUploadingId === cat.id} />
                        </label>
                      </>
                    ) : (
                      <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', cursor: 'pointer', color: '#94a3b8', fontSize: 11 }}>
                        {chooseUploadingId === cat.id ? <span>Uploading...</span> : <><i className="fas fa-image" style={{ fontSize: 22, marginBottom: 4 }} /><span>Add Image</span></>}
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { if (e.target.files[0]) handleChooseImageUpload(cat.id, e.target.files[0]); }} disabled={chooseUploadingId === cat.id} />
                      </label>
                    )}
                  </div>
                  <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 500, fontSize: 13, color: '#333' }}>{cat.name}</span>
                    <Toggle checked={isVisible} onChange={() => handleChooseCatToggle(cat.id)} size="small" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {hasUnsavedChanges && (
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button
            onClick={handleSaveAllSettings}
            disabled={saving}
            style={{
              padding: '12px 40px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600,
              cursor: 'pointer', opacity: saving ? 0.7 : 1, boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
            }}
          >{saving ? 'Saving...' : 'Save All Changes'}</button>
        </div>
      )}
    </div>
  );
}
