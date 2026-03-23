import React, { useState, useEffect, useContext } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../services/categoryService.js';

const API_BASE = typeof window !== 'undefined' && window.location.hostname.endsWith('fluxe.in') ? '' : 'https://fluxe.in';

function resolveImageUrl(src) {
  if (!src) return '';
  if (src.startsWith('data:') || src.startsWith('http')) return src;
  if (src.startsWith('/api/')) {
    return `${API_BASE}${src}`;
  }
  return src;
}

export default function CategoriesSection({ onSaved }) {
  const { siteConfig, refetchSite } = useContext(SiteContext);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
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
  const [chooseSaving, setChooseSaving] = useState(false);
  const [chooseUploadingId, setChooseUploadingId] = useState(null);

  const [subcatSections, setSubcatSections] = useState([]);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionSubtitle, setNewSectionSubtitle] = useState('');
  const [newSectionSubcatId, setNewSectionSubcatId] = useState('');
  const [subcatSectionSaving, setSubcatSectionSaving] = useState(false);

  useEffect(() => {
    if (siteConfig?.id) loadCategories();
  }, [siteConfig?.id]);

  useEffect(() => {
    if (siteConfig?.settings) {
      let settings = {};
      try {
        settings = typeof siteConfig.settings === 'string' ? JSON.parse(siteConfig.settings) : (siteConfig.settings || {});
      } catch (e) {
        settings = {};
      }
      const conf = settings.chooseByCategory || {};
      setChooseEnabled(!!conf.enabled);
      setChooseCats(conf.categories || {});
      setSubcatSections(settings.subcategorySections || []);
    }
  }, [siteConfig?.settings]);

  async function loadCategories() {
    setLoading(true);
    try {
      const res = await getCategories(siteConfig.id);
      setCategories(res.data || res.categories || []);
    } catch (e) {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    try {
      const slug = newCategoryName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      await createCategory({
        siteId: siteConfig.id,
        name: newCategoryName.trim(),
        slug,
        subtitle: newCategorySubtitle.trim() || null,
        showOnHome: true,
        displayOrder: categories.length,
      });
      setNewCategoryName('');
      setNewCategorySubtitle('');
      await loadCategories();
      if (onSaved) onSaved();
    } catch (e) {
      alert('Failed to add category: ' + e.message);
    }
  }

  async function handleDeleteCategory(categoryId) {
    if (!window.confirm('Delete this category? Products in this category will not be deleted.')) return;
    try {
      await deleteCategory(categoryId, siteConfig?.id);
      await loadCategories();
      if (onSaved) onSaved();
    } catch (e) {
      alert('Failed to delete category: ' + e.message);
    }
  }

  async function handleUpdateCategory(categoryId) {
    if (!editCategoryName.trim()) return;
    try {
      const slug = editCategoryName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      await updateCategory(categoryId, {
        name: editCategoryName.trim(),
        slug,
        subtitle: editCategorySubtitle.trim() || null,
      }, siteConfig?.id);
      setEditingCategory(null);
      setEditCategoryName('');
      setEditCategorySubtitle('');
      await loadCategories();
      if (onSaved) onSaved();
    } catch (e) {
      alert('Failed to update category: ' + e.message);
    }
  }

  async function handleToggleHomepage(categoryId, currentValue) {
    try {
      await updateCategory(categoryId, { showOnHome: !currentValue }, siteConfig?.id);
      await loadCategories();
      if (onSaved) onSaved();
    } catch (e) {
      alert('Failed to update category: ' + e.message);
    }
  }

  async function handleImageUpload(categoryId, file) {
    if (!file) return;
    setUploadingImage(categoryId);
    try {
      const formData = new FormData();
      formData.append('images', file, file.name || 'category-image.jpg');
      const token = sessionStorage.getItem('site_admin_token');
      const response = await fetch(`${API_BASE}/api/upload/image?siteId=${siteConfig.id}`, {
        method: 'POST',
        headers: { 'Authorization': token ? `SiteAdmin ${token}` : '' },
        body: formData,
      });
      const result = await response.json();
      if (result.success && result.data?.images?.length > 0 && result.data.images[0].url) {
        const imageUrl = result.data.images[0].url;
        await updateCategory(categoryId, { imageUrl }, siteConfig?.id);
        await loadCategories();
        if (onSaved) onSaved();
      } else {
        alert('Image upload failed: ' + (result.error || result.message || 'Unknown error'));
      }
    } catch (e) {
      alert('Failed to upload image: ' + e.message);
    } finally {
      setUploadingImage(null);
    }
  }

  async function handleRemoveImage(categoryId) {
    try {
      await updateCategory(categoryId, { imageUrl: null }, siteConfig?.id);
      await loadCategories();
      if (onSaved) onSaved();
    } catch (e) {
      alert('Failed to remove image: ' + e.message);
    }
  }

  async function handleAddGroup(categoryId) {
    if (!newGroupName.trim()) return;
    setAddingGroup(true);
    try {
      await createCategory({
        siteId: siteConfig.id,
        name: newGroupName.trim(),
        parentId: categoryId,
        showOnHome: false,
      });
      setNewGroupName('');
      await loadCategories();
    } catch (e) {
      alert('Failed to add subcategory group: ' + e.message);
    } finally {
      setAddingGroup(false);
    }
  }

  async function handleAddValue(groupId) {
    if (!newValueName.trim()) return;
    setAddingValue(true);
    try {
      await createCategory({
        siteId: siteConfig.id,
        name: newValueName.trim(),
        parentId: groupId,
        showOnHome: false,
      });
      setNewValueName('');
      setAddingValueTo(null);
      await loadCategories();
    } catch (e) {
      alert('Failed to add value: ' + e.message);
    } finally {
      setAddingValue(false);
    }
  }

  async function handleDeleteSubItem(itemId) {
    if (!window.confirm('Delete this item?')) return;
    try {
      await deleteCategory(itemId, siteConfig?.id);
      await loadCategories();
    } catch (e) {
      alert('Failed to delete: ' + e.message);
    }
  }

  async function saveChooseConfig(enabled, cats) {
    setChooseSaving(true);
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
            chooseByCategory: { enabled, categories: cats },
          },
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        alert('Failed to save: ' + (result.error || 'Unknown error'));
      } else {
        if (onSaved) onSaved();
      }
    } catch (e) {
      alert('Failed to save: ' + e.message);
    } finally {
      setChooseSaving(false);
    }
  }

  async function handleChooseToggleEnabled() {
    const newVal = !chooseEnabled;
    setChooseEnabled(newVal);
    await saveChooseConfig(newVal, chooseCats);
  }

  async function handleChooseCatToggle(catId) {
    const current = chooseCats[catId] || {};
    const updated = { ...chooseCats, [catId]: { ...current, visible: !current.visible } };
    setChooseCats(updated);
    await saveChooseConfig(chooseEnabled, updated);
  }

  async function handleChooseImageUpload(catId, file) {
    if (!file) return;
    setChooseUploadingId(catId);
    try {
      const formData = new FormData();
      formData.append('images', file, file.name || 'browse-category.jpg');
      const token = sessionStorage.getItem('site_admin_token');
      const response = await fetch(`${API_BASE}/api/upload/image?siteId=${siteConfig.id}`, {
        method: 'POST',
        headers: { 'Authorization': token ? `SiteAdmin ${token}` : '' },
        body: formData,
      });
      const result = await response.json();
      if (result.success && result.data?.images?.length > 0 && result.data.images[0].url) {
        const browseImage = result.data.images[0].url;
        const current = chooseCats[catId] || {};
        const updated = { ...chooseCats, [catId]: { ...current, browseImage } };
        setChooseCats(updated);
        await saveChooseConfig(chooseEnabled, updated);
      } else {
        alert('Image upload failed');
      }
    } catch (e) {
      alert('Failed to upload image: ' + e.message);
    } finally {
      setChooseUploadingId(null);
    }
  }

  async function handleChooseImageRemove(catId) {
    const current = chooseCats[catId] || {};
    const updated = { ...chooseCats, [catId]: { ...current, browseImage: null } };
    setChooseCats(updated);
    await saveChooseConfig(chooseEnabled, updated);
  }

  async function saveSubcatSections(sections) {
    setSubcatSectionSaving(true);
    try {
      const token = sessionStorage.getItem('site_admin_token');
      const response = await fetch(`${API_BASE}/api/sites/${siteConfig.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `SiteAdmin ${token}` : '',
        },
        body: JSON.stringify({
          settings: { subcategorySections: sections },
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        alert('Failed to save: ' + (result.error || 'Unknown error'));
      } else {
        if (onSaved) onSaved();
      }
    } catch (e) {
      alert('Failed to save: ' + e.message);
    } finally {
      setSubcatSectionSaving(false);
    }
  }

  function findSubcatInfo(subcatId) {
    for (const cat of categories) {
      for (const group of (cat.children || [])) {
        for (const val of (group.children || [])) {
          if (val.id === subcatId) {
            return { valueName: val.name, groupName: group.name, categoryName: cat.name, categorySlug: cat.slug, categoryId: cat.id };
          }
        }
        if (group.id === subcatId) {
          return { valueName: group.name, groupName: null, categoryName: cat.name, categorySlug: cat.slug, categoryId: cat.id };
        }
      }
    }
    return null;
  }

  async function handleAddSubcatSection() {
    if (!newSectionName.trim() || !newSectionSubcatId) return;
    const info = findSubcatInfo(newSectionSubcatId);
    const section = {
      id: Date.now().toString(),
      name: newSectionName.trim(),
      subtitle: newSectionSubtitle.trim() || null,
      subcategoryId: newSectionSubcatId,
      categorySlug: info?.categorySlug || '',
      categoryId: info?.categoryId || '',
      subcategoryLabel: info ? `${info.categoryName} → ${info.groupName ? info.groupName + ' → ' : ''}${info.valueName}` : '',
    };
    const previous = [...subcatSections];
    const updated = [...subcatSections, section];
    setSubcatSections(updated);
    setNewSectionName('');
    setNewSectionSubtitle('');
    setNewSectionSubcatId('');
    try {
      await saveSubcatSections(updated);
    } catch {
      setSubcatSections(previous);
    }
  }

  async function handleRemoveSubcatSection(sectionId) {
    const previous = [...subcatSections];
    const updated = subcatSections.filter(s => s.id !== sectionId);
    setSubcatSections(updated);
    try {
      await saveSubcatSections(updated);
    } catch {
      setSubcatSections(previous);
    }
  }

  const filtered = categories.filter(c =>
    !searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  return (
    <div>
      <div className="search-bar" style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Search categories..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header"><h3 className="card-title">Add New Category</h3></div>
        <div className="card-content">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="Category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                style={{ flex: 1, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
              <button className="btn btn-primary" onClick={handleAddCategory}>
                <i className="fas fa-plus" style={{ marginRight: 6 }} />Add
              </button>
            </div>
            <input
              type="text"
              placeholder="Subtitle (optional) - shown below the category title on homepage"
              value={newCategorySubtitle}
              onChange={(e) => setNewCategorySubtitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', color: '#64748b' }}
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-folder-open" />
          <h3>{searchTerm ? 'No categories match your search' : 'No categories yet'}</h3>
          <p>Create your first category to organize your products.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Categories ({filtered.length})</h3>
            </div>
          </div>
          {filtered.map(cat => (
            <div className="card" key={cat.id}>
              <div className="card-content" style={{ padding: 16 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ width: 120, flexShrink: 0 }}>
                    {cat.image_url ? (
                      <div style={{ position: 'relative' }}>
                        <img
                          src={resolveImageUrl(cat.image_url)}
                          alt={cat.name}
                          style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0' }}
                        />
                        <button
                          onClick={() => handleRemoveImage(cat.id)}
                          style={{
                            position: 'absolute', top: -6, right: -6,
                            width: 20, height: 20, borderRadius: '50%',
                            background: '#ef4444', color: '#fff', border: 'none',
                            fontSize: 11, cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                          }}
                        >
                          x
                        </button>
                      </div>
                    ) : (
                      <label style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        width: '100%', height: 80, border: '2px dashed #e2e8f0', borderRadius: 6,
                        cursor: 'pointer', color: '#94a3b8', fontSize: 12, textAlign: 'center',
                        transition: 'border-color 0.2s',
                      }}>
                        {uploadingImage === cat.id ? (
                          <span>Uploading...</span>
                        ) : (
                          <>
                            <i className="fas fa-image" style={{ fontSize: 18, marginBottom: 4 }} />
                            <span>Add Image</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => { if (e.target.files[0]) handleImageUpload(cat.id, e.target.files[0]); }}
                          disabled={uploadingImage === cat.id}
                        />
                      </label>
                    )}
                    {cat.image_url && (
                      <label style={{
                        display: 'block', textAlign: 'center', marginTop: 4,
                        fontSize: 11, color: '#3b82f6', cursor: 'pointer',
                      }}>
                        Change
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => { if (e.target.files[0]) handleImageUpload(cat.id, e.target.files[0]); }}
                          disabled={uploadingImage === cat.id}
                        />
                      </label>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {editingCategory === cat.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <input
                          type="text"
                          value={editCategoryName}
                          onChange={(e) => setEditCategoryName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdateCategory(cat.id)}
                          placeholder="Category name"
                          style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }}
                          autoFocus
                        />
                        <input
                          type="text"
                          value={editCategorySubtitle}
                          onChange={(e) => setEditCategorySubtitle(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdateCategory(cat.id)}
                          placeholder="Subtitle (optional)"
                          style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', color: '#64748b' }}
                        />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-primary btn-sm" onClick={() => handleUpdateCategory(cat.id)}>Save</button>
                          <button className="btn btn-outline btn-sm" onClick={() => setEditingCategory(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{cat.name}</div>
                        <div style={{ color: '#64748b', fontSize: 13, marginBottom: 4 }}>{cat.subtitle || 'No subtitle'}</div>
                        <div style={{ color: '#94a3b8', fontSize: 12 }}>/{cat.slug}</div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: '#64748b', textAlign: 'center' }}>Homepage</div>
                    <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={!!cat.show_on_home}
                        onChange={() => handleToggleHomepage(cat.id, !!cat.show_on_home)}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: cat.show_on_home ? '#10b981' : '#cbd5e1',
                        borderRadius: 24, transition: 'background-color 0.2s',
                      }}>
                        <span style={{
                          position: 'absolute', left: cat.show_on_home ? 22 : 2, top: 2,
                          width: 20, height: 20, backgroundColor: '#fff',
                          borderRadius: '50%', transition: 'left 0.2s',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }} />
                      </span>
                    </label>
                  </div>

                  {editingCategory !== cat.id && (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)} title="Manage subcategories">
                        <i className={`fas fa-layer-group`} />
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={() => { setEditingCategory(cat.id); setEditCategoryName(cat.name); setEditCategorySubtitle(cat.subtitle || ''); }}>
                        <i className="fas fa-edit" />
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteCategory(cat.id)}>
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  )}
                </div>

                {expandedCat === cat.id && (
                  <div style={{ marginTop: 16, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#475569' }}>Subcategory Groups</div>
                    </div>

                    {(cat.children || []).length === 0 && (
                      <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 12px' }}>No subcategory groups yet. Add one below.</p>
                    )}

                    {(cat.children || []).map(group => (
                      <div key={group.id} style={{ marginBottom: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', padding: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: '#334155' }}>{group.name}</div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              onClick={() => { setAddingValueTo(addingValueTo === group.id ? null : group.id); setNewValueName(''); }}
                              style={{ padding: '4px 10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}
                            >+ Add Value</button>
                            <button
                              onClick={() => handleDeleteSubItem(group.id)}
                              style={{ padding: '4px 8px', background: 'none', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}
                            ><i className="fas fa-trash" style={{ fontSize: 11 }} /></button>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {(group.children || []).length === 0 && (
                            <span style={{ color: '#94a3b8', fontSize: 12 }}>No values yet</span>
                          )}
                          {(group.children || []).map(val => (
                            <div key={val.id} style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20,
                              padding: '4px 10px', fontSize: 13,
                            }}>
                              <span>{val.name}</span>
                              <button
                                onClick={() => handleDeleteSubItem(val.id)}
                                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}
                                title="Remove"
                              >×</button>
                            </div>
                          ))}
                        </div>

                        {addingValueTo === group.id && (
                          <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                            <input
                              type="text"
                              value={newValueName}
                              onChange={e => setNewValueName(e.target.value)}
                              placeholder={`Add value to ${group.name}`}
                              onKeyDown={e => { if (e.key === 'Enter') handleAddValue(group.id); }}
                              style={{ flex: 1, padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
                              autoFocus
                            />
                            <button
                              onClick={() => handleAddValue(group.id)}
                              disabled={addingValue || !newValueName.trim()}
                              style={{ padding: '6px 14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer', opacity: addingValue || !newValueName.trim() ? 0.5 : 1 }}
                            >{addingValue ? '...' : 'Add'}</button>
                          </div>
                        )}
                      </div>
                    ))}

                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <input
                        type="text"
                        value={newGroupName}
                        onChange={e => setNewGroupName(e.target.value)}
                        placeholder="New group name (e.g. Color Options, Size)"
                        onKeyDown={e => { if (e.key === 'Enter') handleAddGroup(cat.id); }}
                        style={{ flex: 1, padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
                      />
                      <button
                        onClick={() => handleAddGroup(cat.id)}
                        disabled={addingGroup || !newGroupName.trim()}
                        className="btn btn-primary btn-sm"
                        style={{ opacity: addingGroup || !newGroupName.trim() ? 0.5 : 1 }}
                      >{addingGroup ? '...' : 'Add Group'}</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 32 }}>
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title" style={{ margin: 0 }}>Choose by Category Section</h3>
            <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={chooseEnabled}
                onChange={handleChooseToggleEnabled}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: chooseEnabled ? '#10b981' : '#cbd5e1',
                borderRadius: 24, transition: 'background-color 0.2s',
              }}>
                <span style={{
                  position: 'absolute', left: chooseEnabled ? 22 : 2, top: 2,
                  width: 20, height: 20, backgroundColor: '#fff',
                  borderRadius: '50%', transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </span>
            </label>
          </div>
          <div className="card-content" style={{
            padding: 16,
            opacity: chooseEnabled ? 1 : 0.5,
            pointerEvents: chooseEnabled ? 'auto' : 'none',
            transition: 'opacity 0.3s',
          }}>
            <p style={{ color: '#64748b', fontSize: 13, marginTop: 0, marginBottom: 16 }}>
              Select which categories appear in the "Choose by Category" section on your homepage and upload a browse image for each.
            </p>
            {chooseSaving && (
              <div style={{ color: '#3b82f6', fontSize: 13, marginBottom: 12 }}>Saving...</div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {categories.map(cat => {
                const conf = chooseCats[cat.id] || {};
                const isVisible = !!conf.visible;
                const browseImg = conf.browseImage;
                return (
                  <div key={cat.id} style={{
                    border: isVisible ? '2px solid #10b981' : '1px solid #e2e8f0',
                    borderRadius: 12,
                    overflow: 'hidden',
                    background: '#fff',
                    transition: 'border-color 0.2s',
                  }}>
                    <div style={{ position: 'relative', width: '100%', height: 140, background: '#f8f8f5' }}>
                      {browseImg ? (
                        <>
                          <img
                            src={resolveImageUrl(browseImg)}
                            alt={cat.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                          <button
                            onClick={() => handleChooseImageRemove(cat.id)}
                            style={{
                              position: 'absolute', top: 6, right: 6,
                              width: 22, height: 22, borderRadius: '50%',
                              background: '#ef4444', color: '#fff', border: 'none',
                              fontSize: 12, cursor: 'pointer', display: 'flex',
                              alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            x
                          </button>
                          <label style={{
                            position: 'absolute', bottom: 6, right: 6,
                            background: 'rgba(255,255,255,0.9)', borderRadius: 4,
                            padding: '3px 8px', fontSize: 11, color: '#3b82f6',
                            cursor: 'pointer',
                          }}>
                            Change
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={(e) => { if (e.target.files[0]) handleChooseImageUpload(cat.id, e.target.files[0]); }}
                              disabled={chooseUploadingId === cat.id}
                            />
                          </label>
                        </>
                      ) : (
                        <label style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          width: '100%', height: '100%', cursor: 'pointer', color: '#94a3b8', fontSize: 12,
                        }}>
                          {chooseUploadingId === cat.id ? (
                            <span>Uploading...</span>
                          ) : (
                            <>
                              <i className="fas fa-image" style={{ fontSize: 24, marginBottom: 6 }} />
                              <span>Add Browse Image</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => { if (e.target.files[0]) handleChooseImageUpload(cat.id, e.target.files[0]); }}
                            disabled={chooseUploadingId === cat.id}
                          />
                        </label>
                      )}
                    </div>
                    <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 500, fontSize: 14, color: '#333' }}>{cat.name}</span>
                      <label style={{ position: 'relative', display: 'inline-block', width: 36, height: 20, cursor: 'pointer', flexShrink: 0 }}>
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={() => handleChooseCatToggle(cat.id)}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{
                          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                          backgroundColor: isVisible ? '#10b981' : '#cbd5e1',
                          borderRadius: 20, transition: 'background-color 0.2s',
                        }}>
                          <span style={{
                            position: 'absolute', left: isVisible ? 18 : 2, top: 2,
                            width: 16, height: 16, backgroundColor: '#fff',
                            borderRadius: '50%', transition: 'left 0.2s',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                          }} />
                        </span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 32 }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ margin: 0 }}>Subcategory Homepage Sections</h3>
          </div>
          <div className="card-content" style={{ padding: 16 }}>
            <p style={{ color: '#64748b', fontSize: 13, marginTop: 0, marginBottom: 16 }}>
              Create homepage sections that show products filtered by a specific subcategory value. Each section appears as a product carousel on your homepage.
            </p>
            {subcatSectionSaving && (
              <div style={{ color: '#3b82f6', fontSize: 13, marginBottom: 12 }}>Saving...</div>
            )}

            {subcatSections.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {subcatSections.map(section => (
                  <div key={section.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', background: '#f8fafc', borderRadius: 8,
                    border: '1px solid #e2e8f0',
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{section.name}</div>
                      {section.subtitle && <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{section.subtitle}</div>}
                      <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>
                        Filtered by: {section.subcategoryLabel || section.subcategoryId}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveSubcatSection(section.id)}
                      style={{ padding: '6px 10px', background: 'none', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                    ><i className="fas fa-trash" style={{ fontSize: 11 }} /></button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: '#475569' }}>Add New Section</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Section title (e.g. Trending T-Shirts)"
                  value={newSectionName}
                  onChange={e => setNewSectionName(e.target.value)}
                  style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
                <input
                  type="text"
                  placeholder="Subtitle (optional)"
                  value={newSectionSubtitle}
                  onChange={e => setNewSectionSubtitle(e.target.value)}
                  style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', color: '#64748b' }}
                />
                <select
                  value={newSectionSubcatId}
                  onChange={e => setNewSectionSubcatId(e.target.value)}
                  style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, background: 'white', fontFamily: 'inherit', boxSizing: 'border-box' }}
                >
                  <option value="">Select subcategory value...</option>
                  {categories.map(cat => {
                    const groups = cat.children || [];
                    if (groups.length === 0) return null;
                    return groups.map(group => {
                      const values = group.children || [];
                      if (values.length === 0) return (
                        <option key={group.id} value={group.id}>{cat.name} → {group.name}</option>
                      );
                      return (
                        <optgroup key={group.id} label={`${cat.name} → ${group.name}`}>
                          {values.map(val => (
                            <option key={val.id} value={val.id}>{val.name}</option>
                          ))}
                        </optgroup>
                      );
                    });
                  })}
                </select>
                <button
                  className="btn btn-primary"
                  onClick={handleAddSubcatSection}
                  disabled={!newSectionName.trim() || !newSectionSubcatId || subcatSectionSaving}
                  style={{ alignSelf: 'flex-start', opacity: (!newSectionName.trim() || !newSectionSubcatId || subcatSectionSaving) ? 0.5 : 1 }}
                >
                  <i className="fas fa-plus" style={{ marginRight: 6 }} />Add Section
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
