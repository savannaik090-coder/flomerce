import React, { useState, useEffect, useContext, useRef } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../services/categoryService.js';
import { API_BASE } from '../../config.js';

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

function SectionCard({ title, subtitle, icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, marginBottom: 20, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '16px 20px', border: 'none', background: 'none', cursor: 'pointer',
          fontFamily: 'inherit', textAlign: 'left',
        }}
      >
        <i className={`fas ${icon}`} style={{ fontSize: 14, color: '#3b82f6', width: 20, textAlign: 'center' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{subtitle}</div>}
        </div>
        <i className={`fas fa-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: 11, color: '#94a3b8' }} />
      </button>
      {open && <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f1f5f9' }}>{children}</div>}
    </div>
  );
}

export default function CategoriesSection({ onSaved, onPreviewUpdate }) {
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

  const [expandedCats, setExpandedCats] = useState({});
  const [newSubName, setNewSubName] = useState('');
  const [newSubGroupName, setNewSubGroupName] = useState('');
  const [newValueName, setNewValueName] = useState('');
  const [addingValueTo, setAddingValueTo] = useState(null);

  const [editingSubItem, setEditingSubItem] = useState(null);
  const [editSubItemName, setEditSubItemName] = useState('');
  const [pendingSubEdits, setPendingSubEdits] = useState({});

  const [pendingSubAdds, setPendingSubAdds] = useState([]);
  const [pendingSubDeletes, setPendingSubDeletes] = useState([]);

  const [chooseEnabled, setChooseEnabled] = useState(false);
  const [chooseCats, setChooseCats] = useState({});
  const [chooseUploadingId, setChooseUploadingId] = useState(null);

  const [subcatSections, setSubcatSections] = useState([]);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionSubtitle, setNewSectionSubtitle] = useState('');
  const [newSectionSubcatId, setNewSectionSubcatId] = useState('');

  const [sectionOrder, setSectionOrder] = useState([]);

  const [pendingHomeToggles, setPendingHomeToggles] = useState({});
  const [pendingNewCats, setPendingNewCats] = useState([]);
  const [pendingDeleteCats, setPendingDeleteCats] = useState([]);
  const [pendingEditCats, setPendingEditCats] = useState({});

  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [chooseChanged, setChooseChanged] = useState(false);
  const [subcatChanged, setSubcatChanged] = useState(false);
  const [orderChanged, setOrderChanged] = useState(false);
  const homeTogglesChanged = Object.keys(pendingHomeToggles).length > 0;
  const catsChanged = pendingNewCats.length > 0 || pendingDeleteCats.length > 0 || Object.keys(pendingEditCats).length > 0;
  const subItemsChanged = pendingSubAdds.length > 0 || pendingSubDeletes.length > 0 || Object.keys(pendingSubEdits).length > 0;
  const dirtyRef = useRef(false);
  dirtyRef.current = chooseChanged || subcatChanged || orderChanged || homeTogglesChanged || catsChanged || subItemsChanged;

  const [activeView, setActiveView] = useState('categories');

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
      setSettingsLoaded(true);
    }
  }, [siteConfig?.settings]);

  useEffect(() => {
    if (!settingsLoaded || !onPreviewUpdate) return;
    onPreviewUpdate({
      chooseByCategory: { enabled: chooseEnabled, categories: chooseCats },
      subcategorySections: subcatSections,
      homepageSectionOrder: sectionOrder,
    });
  }, [settingsLoaded, chooseEnabled, chooseCats, subcatSections, sectionOrder]);

  useEffect(() => {
    if (!onPreviewUpdate || loading) return;
    const previewCats = allDisplayCats.map(cat => {
      const children = cat.children || [];
      const mergedChildren = [
        ...children.filter(c => !pendingSubDeletes.includes(c.id)).map(c => {
          if (pendingSubEdits[c.id]) return { ...c, name: pendingSubEdits[c.id].name || c.name };
          return c;
        }),
        ...pendingSubAdds.filter(s => s.parentId === cat.id).map(s => ({
          id: s.tempId, name: s.name, slug: s.name.toLowerCase().replace(/\s+/g,'-'), parent_id: cat.id, show_on_home: 0, _isPending: true,
          children: pendingSubAdds.filter(v => v.parentId === s.tempId).map(v => ({
            id: v.tempId, name: v.name, slug: v.name.toLowerCase().replace(/\s+/g,'-'), parent_id: s.tempId, show_on_home: 0, _isPending: true, children: []
          }))
        }))
      ];
      return {
        id: cat.id,
        name: cat.name,
        subtitle: cat.subtitle,
        slug: cat.slug,
        show_on_home: getShowOnHome(cat) ? 1 : 0,
        image_url: cat.image_url || null,
        display_order: cat.display_order || 0,
        children: mergedChildren,
        _isPending: !!cat._isPending,
      };
    });
    onPreviewUpdate({ _previewCategories: previewCats });
  }, [pendingHomeToggles, pendingDeleteCats, categories, pendingNewCats, pendingSubAdds, pendingSubDeletes, pendingSubEdits, pendingEditCats, loading]);

  async function loadCategories() {
    setLoading(true);
    try {
      const res = await getCategories(siteConfig.id);
      setCategories(res.data || res.categories || []);
    } catch (e) { setCategories([]); }
    finally { setLoading(false); }
  }

  function toggleExpanded(catId) {
    setExpandedCats(prev => ({ ...prev, [catId]: !prev[catId] }));
  }

  function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    const tempId = 'new_' + Date.now();
    const slug = newCategoryName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setPendingNewCats(prev => [...prev, {
      tempId,
      name: newCategoryName.trim(),
      slug,
      subtitle: newCategorySubtitle.trim() || null,
      showOnHome: true,
      displayOrder: categories.length + pendingNewCats.length,
    }]);
    setNewCategoryName('');
    setNewCategorySubtitle('');
  }

  function handleDeleteCategory(categoryId) {
    if (!window.confirm('Delete this category? Products in this category will not be deleted.')) return;
    const isPending = pendingNewCats.find(c => c.tempId === categoryId);
    if (isPending) {
      setPendingNewCats(prev => prev.filter(c => c.tempId !== categoryId));
    } else {
      setPendingDeleteCats(prev => [...prev, categoryId]);
    }
  }

  function handleUpdateCategory(categoryId) {
    if (!editCategoryName.trim()) return;
    const isPending = pendingNewCats.find(c => c.tempId === categoryId);
    if (isPending) {
      setPendingNewCats(prev => prev.map(c => c.tempId === categoryId ? {
        ...c,
        name: editCategoryName.trim(),
        slug: editCategoryName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        subtitle: editCategorySubtitle.trim() || null,
      } : c));
    } else {
      setPendingEditCats(prev => ({
        ...prev,
        [categoryId]: {
          name: editCategoryName.trim(),
          slug: editCategoryName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          subtitle: editCategorySubtitle.trim() || null,
        }
      }));
    }
    setEditingCategory(null);
    setEditCategoryName('');
    setEditCategorySubtitle('');
  }

  function handleToggleHomepage(categoryId, currentValue) {
    setPendingHomeToggles(prev => {
      const updated = { ...prev };
      const newVal = !currentValue;
      const original = categories.find(c => c.id === categoryId);
      const originalVal = !!(original?.show_on_home);
      if (newVal === originalVal) {
        delete updated[categoryId];
      } else {
        updated[categoryId] = newVal;
      }
      return updated;
    });
  }

  function getShowOnHome(cat) {
    if (cat.id in pendingHomeToggles) return pendingHomeToggles[cat.id];
    return !!cat.show_on_home;
  }

  async function handleImageUpload(categoryId, file) {
    if (!file) return;
    const cat = categories.find(c => c.id === categoryId);
    const oldImage = cat?.image_url;
    setUploadingImage(categoryId);
    try {
      const formData = new FormData();
      formData.append('images', file, file.name || 'category-image.jpg');
      const token = sessionStorage.getItem('site_admin_token');
      const response = await fetch(`${API_BASE}/api/upload/image?siteId=${siteConfig.id}`, { method: 'POST', headers: { 'Authorization': token ? `SiteAdmin ${token}` : '' }, body: formData });
      const result = await response.json();
      if (result.success && result.data?.images?.length > 0 && result.data.images[0].url) {
        await updateCategory(categoryId, { imageUrl: result.data.images[0].url }, siteConfig?.id);
        if (oldImage) {
          import('../../services/api.js').then(({ deleteMediaFromR2 }) => {
            deleteMediaFromR2(siteConfig.id, oldImage);
          });
        }
        await loadCategories();
        if (onSaved) onSaved();
      } else { alert('Image upload failed'); }
    } catch (e) { alert('Failed to upload image: ' + e.message); }
    finally { setUploadingImage(null); }
  }

  async function handleRemoveImage(categoryId) {
    const cat = categories.find(c => c.id === categoryId);
    const oldImage = cat?.image_url;
    try {
      await updateCategory(categoryId, { imageUrl: null }, siteConfig?.id);
      if (oldImage && siteConfig?.id) {
        import('../../services/api.js').then(({ deleteMediaFromR2 }) => {
          deleteMediaFromR2(siteConfig.id, oldImage);
        });
      }
      await loadCategories();
      if (onSaved) onSaved();
    } catch (e) { alert('Failed to remove image: ' + e.message); }
  }

  function handleAddSubcategory(categoryId) {
    if (!newSubName.trim()) return;
    const groupName = newSubGroupName.trim();
    if (!groupName) {
      const tempId = 'sub_' + Date.now();
      setPendingSubAdds(prev => [...prev, { tempId, name: newSubName.trim(), parentId: categoryId }]);
    } else {
      const cat = categories.find(c => c.id === categoryId);
      const serverChildren = cat?.children || [];
      const existingGroup = serverChildren.find(c => c.name.toLowerCase() === groupName.toLowerCase() && !pendingSubDeletes.includes(c.id));
      const pendingGroup = pendingSubAdds.find(s => s.parentId === categoryId && s.name.toLowerCase() === groupName.toLowerCase());
      if (existingGroup) {
        const valTempId = 'sub_' + Date.now();
        setPendingSubAdds(prev => [...prev, { tempId: valTempId, name: newSubName.trim(), parentId: existingGroup.id }]);
      } else if (pendingGroup) {
        const valTempId = 'sub_' + Date.now();
        setPendingSubAdds(prev => [...prev, { tempId: valTempId, name: newSubName.trim(), parentId: pendingGroup.tempId }]);
      } else {
        const groupTempId = 'sub_' + Date.now();
        const valTempId = 'sub_' + (Date.now() + 1);
        setPendingSubAdds(prev => [
          ...prev,
          { tempId: groupTempId, name: groupName, parentId: categoryId },
          { tempId: valTempId, name: newSubName.trim(), parentId: groupTempId },
        ]);
      }
    }
    setNewSubName('');
    setNewSubGroupName('');
  }

  function handleAddValue(groupId) {
    if (!newValueName.trim()) return;
    const tempId = 'sub_' + Date.now();
    setPendingSubAdds(prev => [...prev, { tempId, name: newValueName.trim(), parentId: groupId }]);
    setNewValueName('');
    setAddingValueTo(null);
  }

  function handleDeleteSubItem(itemId) {
    if (!window.confirm('Delete this item?')) return;
    const isPendingAdd = pendingSubAdds.find(s => s.tempId === itemId);
    if (isPendingAdd) {
      setPendingSubAdds(prev => prev.filter(s => s.tempId !== itemId && s.parentId !== itemId));
    } else {
      setPendingSubDeletes(prev => [...prev, itemId]);
      setPendingSubAdds(prev => prev.filter(s => s.parentId !== itemId));
    }
    setPendingSubEdits(prev => {
      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });
    if (editingSubItem === itemId) {
      setEditingSubItem(null);
      setEditSubItemName('');
    }
  }

  function handleStartEditSubItem(item) {
    setEditingSubItem(item.id);
    const pending = pendingSubAdds.find(s => s.tempId === item.id);
    setEditSubItemName(pending ? pending.name : (pendingSubEdits[item.id]?.name || item.name));
  }

  function handleSaveEditSubItem(itemId) {
    if (!editSubItemName.trim()) return;
    const isPendingAdd = pendingSubAdds.find(s => s.tempId === itemId);
    if (isPendingAdd) {
      setPendingSubAdds(prev => prev.map(s => s.tempId === itemId ? { ...s, name: editSubItemName.trim() } : s));
    } else {
      setPendingSubEdits(prev => ({ ...prev, [itemId]: { name: editSubItemName.trim() } }));
    }
    setEditingSubItem(null);
    setEditSubItemName('');
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
    const oldImage = chooseCats[catId]?.browseImage;
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
        if (oldImage) {
          import('../../services/api.js').then(({ deleteMediaFromR2 }) => {
            deleteMediaFromR2(siteConfig.id, oldImage);
          });
        }
      } else { alert('Image upload failed'); }
    } catch (e) { alert('Failed to upload: ' + e.message); }
    finally { setChooseUploadingId(null); }
  }

  function handleChooseImageRemove(catId) {
    const oldImage = chooseCats[catId]?.browseImage;
    if (oldImage && siteConfig?.id) {
      import('../../services/api.js').then(({ deleteMediaFromR2 }) => {
        deleteMediaFromR2(siteConfig.id, oldImage);
      });
    }
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
    const homeCats = categories.filter(c => getShowOnHome(c) && !c.parent_id);
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

  const hasUnsavedChanges = chooseChanged || subcatChanged || orderChanged || homeTogglesChanged || catsChanged || subItemsChanged;

  async function handleSaveAllSettings() {
    setSaving(true);
    try {
      const token = sessionStorage.getItem('site_admin_token');

      if (pendingNewCats.length > 0) {
        for (const cat of pendingNewCats) {
          await createCategory({
            siteId: siteConfig.id, name: cat.name, slug: cat.slug,
            subtitle: cat.subtitle, showOnHome: cat.showOnHome, displayOrder: cat.displayOrder,
          });
        }
        setPendingNewCats([]);
      }

      if (pendingDeleteCats.length > 0) {
        for (const catId of pendingDeleteCats) {
          await deleteCategory(catId, siteConfig?.id);
        }
        setPendingDeleteCats([]);
      }

      if (Object.keys(pendingEditCats).length > 0) {
        for (const [catId, edits] of Object.entries(pendingEditCats)) {
          await updateCategory(catId, edits, siteConfig?.id);
        }
        setPendingEditCats({});
      }

      if (pendingSubDeletes.length > 0) {
        for (const subId of pendingSubDeletes) {
          await deleteCategory(subId, siteConfig?.id);
        }
        setPendingSubDeletes([]);
      }

      if (pendingSubAdds.length > 0) {
        const tempToRealId = {};
        const groups = pendingSubAdds.filter(s => {
          const isChildOfGroup = pendingSubAdds.some(g => g.tempId === s.parentId);
          return !isChildOfGroup;
        });
        const values = pendingSubAdds.filter(s => {
          return pendingSubAdds.some(g => g.tempId === s.parentId);
        });

        for (const sub of groups) {
          const result = await createCategory({ siteId: siteConfig.id, name: sub.name, parentId: sub.parentId, showOnHome: false });
          if (result?.data?.id || result?.id) {
            tempToRealId[sub.tempId] = result?.data?.id || result?.id;
          }
        }

        for (const sub of values) {
          const resolvedParentId = tempToRealId[sub.parentId] || sub.parentId;
          await createCategory({ siteId: siteConfig.id, name: sub.name, parentId: resolvedParentId, showOnHome: false });
        }
        setPendingSubAdds([]);
      }

      if (Object.keys(pendingSubEdits).length > 0) {
        for (const [subId, edits] of Object.entries(pendingSubEdits)) {
          if (pendingSubDeletes.includes(subId)) continue;
          await updateCategory(subId, edits, siteConfig?.id);
        }
        setPendingSubEdits({});
      }

      if (homeTogglesChanged) {
        const togglePromises = Object.entries(pendingHomeToggles).map(([catId, showOnHome]) =>
          updateCategory(catId, { showOnHome }, siteConfig?.id)
        );
        await Promise.all(togglePromises);
        setPendingHomeToggles({});
      }

      if (chooseChanged || subcatChanged || orderChanged) {
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
          setSaving(false);
          return;
        }
      }

      setChooseChanged(false);
      setSubcatChanged(false);
      setOrderChanged(false);
      setPendingHomeToggles({});
      setPendingNewCats([]);
      setPendingDeleteCats([]);
      setPendingEditCats({});
      setPendingSubAdds([]);
      setPendingSubDeletes([]);
      setPendingSubEdits({});
      await loadCategories();
      if (refetchSite) await refetchSite();
      if (onSaved) onSaved();
    } catch (e) { alert('Failed to save: ' + e.message); }
    finally { setSaving(false); }
  }

  function getDisplayCat(cat) {
    if (pendingEditCats[cat.id]) {
      return { ...cat, name: pendingEditCats[cat.id].name, subtitle: pendingEditCats[cat.id].subtitle, slug: pendingEditCats[cat.id].slug };
    }
    return cat;
  }

  const allDisplayCats = [
    ...categories.filter(c => !pendingDeleteCats.includes(c.id)).map(getDisplayCat),
    ...pendingNewCats.map(c => ({ id: c.tempId, name: c.name, subtitle: c.subtitle, slug: c.slug, show_on_home: c.showOnHome ? 1 : 0, image_url: null, children: [], _isPending: true })),
  ];
  const filtered = allDisplayCats.filter(c => !searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const unifiedSections = buildUnifiedSections();

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  return (
    <div style={{ maxWidth: 760 }}>
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

      <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: '#f1f5f9', borderRadius: 10, padding: 4 }}>
        <button
          onClick={() => setActiveView('categories')}
          style={{
            flex: 1, padding: '10px 0', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
            background: activeView === 'categories' ? '#fff' : 'transparent',
            color: activeView === 'categories' ? '#1e293b' : '#64748b',
            boxShadow: activeView === 'categories' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
          }}
        >
          <i className="fas fa-folder" style={{ marginRight: 6, fontSize: 12 }} />
          Your Categories
        </button>
        <button
          onClick={() => setActiveView('homepage')}
          style={{
            flex: 1, padding: '10px 0', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
            background: activeView === 'homepage' ? '#fff' : 'transparent',
            color: activeView === 'homepage' ? '#1e293b' : '#64748b',
            boxShadow: activeView === 'homepage' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
          }}
        >
          <i className="fas fa-home" style={{ marginRight: 6, fontSize: 12 }} />
          Homepage Layout
        </button>
      </div>

      {activeView === 'categories' && (
        <>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <i className="fas fa-lightbulb" style={{ color: '#3b82f6', marginTop: 2, flexShrink: 0 }} />
            <div style={{ fontSize: 13, color: '#1e40af', lineHeight: 1.5 }}>
              <strong>Categories</strong> help customers browse your products. Create main categories (like "Necklaces" or "Rings"), then add subcategories inside them for finer organization (like "Gold", "Silver"). Click on any category to manage its subcategories.
              <br /><span style={{ color: '#3b82f6', fontSize: 12 }}><i className="fas fa-eye" style={{ marginRight: 4, fontSize: 10 }} />The preview will refresh automatically after you save your changes.</span>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
              <i className="fas fa-plus-circle" style={{ marginRight: 8, color: '#3b82f6', fontSize: 14 }} />
              Create New Category
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="text" placeholder="Category name (e.g. Necklaces, Rings, Sarees)"
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
              <button className="btn btn-primary" onClick={handleAddCategory} disabled={!newCategoryName.trim()} style={{ alignSelf: 'flex-start', opacity: !newCategoryName.trim() ? 0.6 : 1 }}>
                <i className="fas fa-plus" style={{ marginRight: 6 }} />Add Category
              </button>
            </div>
          </div>

          {allDisplayCats.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <input
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', background: '#f8fafc' }}
              />
            </div>
          )}

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <i className="fas fa-folder-open" style={{ fontSize: 40, marginBottom: 12, display: 'block' }} />
              <h3 style={{ margin: '0 0 8px', color: '#64748b' }}>{searchTerm ? 'No categories match your search' : 'No categories yet'}</h3>
              <p style={{ margin: 0, fontSize: 14 }}>Create your first category above to organize your products.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map(cat => {
                const isPending = !!cat._isPending;
                const isExpanded = expandedCats[cat.id];
                const serverChildren = (cat.children || []).filter(c => !pendingSubDeletes.includes(c.id));
                const pendingDirectSubs = pendingSubAdds.filter(s => s.parentId === cat.id);
                const allDirectItems = [
                  ...serverChildren,
                  ...pendingDirectSubs.map(s => ({ id: s.tempId, name: s.name, children: [], _isPending: true })),
                ];
                const subCount = allDirectItems.length;

                return (
                  <div key={cat.id} style={{ background: '#fff', border: isPending ? '2px dashed #3b82f6' : '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                    {isPending && (
                      <div style={{ background: '#eff6ff', padding: '6px 16px', fontSize: 12, color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className="fas fa-clock" /> Not saved yet — click "Save Changes" to create
                      </div>
                    )}

                    <div style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <div style={{ width: 80, flexShrink: 0 }}>
                        {isPending ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: 60, border: '2px dashed #e2e8f0', borderRadius: 8, color: '#cbd5e1', fontSize: 11 }}>
                            <i className="fas fa-image" style={{ fontSize: 14, marginBottom: 2 }} />
                            <span>Save first</span>
                          </div>
                        ) : cat.image_url ? (
                          <div style={{ position: 'relative' }}>
                            <img src={resolveImageUrl(cat.image_url)} alt={cat.name} style={{ width: '100%', height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }} />
                            <button onClick={() => handleRemoveImage(cat.id)} style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>x</button>
                            <label style={{ display: 'block', textAlign: 'center', marginTop: 3, fontSize: 10, color: uploadingImage === cat.id ? '#94a3b8' : '#3b82f6', cursor: uploadingImage === cat.id ? 'default' : 'pointer' }}>
                              {uploadingImage === cat.id ? '...' : 'Change'}
                              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { if (e.target.files[0]) handleImageUpload(cat.id, e.target.files[0]); }} disabled={uploadingImage === cat.id} />
                            </label>
                          </div>
                        ) : (
                          <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: 60, border: '2px dashed #e2e8f0', borderRadius: 8, cursor: 'pointer', color: '#94a3b8', fontSize: 11 }}>
                            {uploadingImage === cat.id ? <span style={{ fontSize: 10 }}>...</span> : <><i className="fas fa-image" style={{ fontSize: 14, marginBottom: 2 }} /><span>Image</span></>}
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontWeight: 600, fontSize: 15, color: '#1e293b' }}>{cat.name}</span>
                              {subCount > 0 && (
                                <span style={{ fontSize: 11, background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: 10, fontWeight: 500 }}>
                                  {subCount} subcategor{subCount === 1 ? 'y' : 'ies'}
                                </span>
                              )}
                            </div>
                            {cat.subtitle && <div style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>{cat.subtitle}</div>}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Homepage</div>
                          <Toggle checked={getShowOnHome(cat)} onChange={() => handleToggleHomepage(cat.id, getShowOnHome(cat))} size="small" />
                        </div>
                        {editingCategory !== cat.id && (
                          <div style={{ display: 'flex', gap: 3 }}>
                            <button onClick={() => { setEditingCategory(cat.id); setEditCategoryName(cat.name); setEditCategorySubtitle(cat.subtitle || ''); }} title="Edit" style={{ padding: '5px 7px', background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', color: '#64748b', fontSize: 12 }}>
                              <i className="fas fa-edit" />
                            </button>
                            <button onClick={() => handleDeleteCategory(cat.id)} title="Delete" style={{ padding: '5px 7px', background: 'none', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', color: '#ef4444', fontSize: 12 }}>
                              <i className="fas fa-trash" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {!isPending && (
                      <div style={{ borderTop: '1px solid #f1f5f9' }}>
                        <button
                          type="button"
                          onClick={() => toggleExpanded(cat.id)}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                            padding: '10px 16px', border: 'none', background: isExpanded ? '#f8fafc' : '#fafbfc',
                            cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: '#475569',
                            fontWeight: 500, textAlign: 'left', transition: 'background 0.15s',
                          }}
                        >
                          <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`} style={{ fontSize: 10, color: '#94a3b8', width: 14, textAlign: 'center' }} />
                          <i className="fas fa-sitemap" style={{ fontSize: 11, color: '#3b82f6' }} />
                          <span>Subcategories</span>
                          {subCount > 0 && <span style={{ color: '#94a3b8', fontSize: 12 }}>({subCount})</span>}
                        </button>

                        {isExpanded && (
                          <div style={{ padding: '12px 16px 16px', background: '#fafbfc' }}>
                            {allDirectItems.length === 0 && (
                              <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 12px' }}>No subcategories yet. Add one below.</p>
                            )}

                            {allDirectItems.map(child => {
                              const isPendingChild = !!child._isPending;
                              const displayChildName = pendingSubEdits[child.id]?.name || child.name;
                              const serverValues = (child.children || []).filter(v => !pendingSubDeletes.includes(v.id));
                              const pendingValues = pendingSubAdds.filter(s => s.parentId === child.id);
                              const allValues = [
                                ...serverValues.map(v => ({ ...v, name: pendingSubEdits[v.id]?.name || v.name })),
                                ...pendingValues.map(s => ({ id: s.tempId, name: s.name, _isPending: true })),
                              ];
                              const hasValues = allValues.length > 0;

                              if (!hasValues) {
                                return (
                                  <div key={child.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: isPendingChild ? '#fef3c7' : '#e0f2fe', border: `1px ${isPendingChild ? 'dashed #f59e0b' : 'solid #bae6fd'}`, borderRadius: 20, padding: '5px 12px', fontSize: 13, marginRight: 6, marginBottom: 6 }}>
                                    {editingSubItem === child.id ? (
                                      <>
                                        <input type="text" value={editSubItemName} onChange={e => setEditSubItemName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSaveEditSubItem(child.id); if (e.key === 'Escape') setEditingSubItem(null); }} style={{ padding: '2px 6px', border: '1px solid #bae6fd', borderRadius: 4, fontSize: 13, fontFamily: 'inherit', width: 120, boxSizing: 'border-box' }} autoFocus />
                                        <button onClick={() => handleSaveEditSubItem(child.id)} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: 13, padding: 0 }} title="Save">✓</button>
                                        <button onClick={() => setEditingSubItem(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 13, padding: 0 }} title="Cancel">✕</button>
                                      </>
                                    ) : (
                                      <>
                                        <span>{displayChildName}</span>
                                        {isPendingChild && <i className="fas fa-clock" style={{ fontSize: 10, color: '#f59e0b' }} />}
                                        {(pendingSubEdits[child.id]) && <i className="fas fa-pen" style={{ fontSize: 9, color: '#3b82f6' }} />}
                                        <button onClick={() => handleStartEditSubItem({ ...child, name: displayChildName })} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 12, padding: 0, lineHeight: 1 }} title="Edit"><i className="fas fa-edit" /></button>
                                        <button onClick={() => handleDeleteSubItem(child.id)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }} title="Remove">x</button>
                                      </>
                                    )}
                                  </div>
                                );
                              }

                              return (
                                <div key={child.id} style={{ marginBottom: 10, background: '#fff', borderRadius: 8, border: isPendingChild ? '2px dashed #f59e0b' : '1px solid #e2e8f0', padding: 12 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    {editingSubItem === child.id ? (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <input type="text" value={editSubItemName} onChange={e => setEditSubItemName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSaveEditSubItem(child.id); if (e.key === 'Escape') setEditingSubItem(null); }} style={{ padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', width: 160, boxSizing: 'border-box' }} autoFocus />
                                        <button onClick={() => handleSaveEditSubItem(child.id)} style={{ padding: '4px 8px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Save</button>
                                        <button onClick={() => setEditingSubItem(null)} style={{ padding: '4px 8px', background: 'none', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                                      </div>
                                    ) : (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <i className="fas fa-folder-open" style={{ fontSize: 11, color: '#3b82f6' }} />
                                        <span style={{ fontWeight: 600, fontSize: 14, color: '#334155' }}>{displayChildName}</span>
                                        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>({allValues.length})</span>
                                        {isPendingChild && <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>unsaved</span>}
                                        {(pendingSubEdits[child.id]) && <span style={{ fontSize: 10, color: '#3b82f6', fontWeight: 600 }}>edited</span>}
                                      </div>
                                    )}
                                    <div style={{ display: 'flex', gap: 4 }}>
                                      {editingSubItem !== child.id && <button onClick={() => handleStartEditSubItem({ ...child, name: displayChildName })} style={{ padding: '4px 7px', background: 'none', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}><i className="fas fa-edit" /></button>}
                                      <button onClick={() => { setAddingValueTo(addingValueTo === child.id ? null : child.id); setNewValueName(''); }} style={{ padding: '4px 10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>+ Add</button>
                                      <button onClick={() => handleDeleteSubItem(child.id)} style={{ padding: '4px 7px', background: 'none', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}><i className="fas fa-trash" /></button>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {allValues.map(val => (
                                      <div key={val.id} style={{ display: 'flex', alignItems: 'center', gap: 5, background: val._isPending ? '#fef3c7' : '#f1f5f9', border: `1px ${val._isPending ? 'dashed #f59e0b' : 'solid #e2e8f0'}`, borderRadius: 20, padding: '4px 10px', fontSize: 13 }}>
                                        {editingSubItem === val.id ? (
                                          <>
                                            <input type="text" value={editSubItemName} onChange={e => setEditSubItemName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSaveEditSubItem(val.id); if (e.key === 'Escape') setEditingSubItem(null); }} style={{ padding: '2px 6px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 13, fontFamily: 'inherit', width: 100, boxSizing: 'border-box' }} autoFocus />
                                            <button onClick={() => handleSaveEditSubItem(val.id)} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: 13, padding: 0 }}>✓</button>
                                            <button onClick={() => setEditingSubItem(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 13, padding: 0 }}>✕</button>
                                          </>
                                        ) : (
                                          <>
                                            <span>{val.name}</span>
                                            {val._isPending && <i className="fas fa-clock" style={{ fontSize: 10, color: '#f59e0b' }} />}
                                            {(pendingSubEdits[val.id]) && <i className="fas fa-pen" style={{ fontSize: 9, color: '#3b82f6' }} />}
                                            <button onClick={() => handleStartEditSubItem(val)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 12, padding: 0, lineHeight: 1 }}><i className="fas fa-edit" /></button>
                                            <button onClick={() => handleDeleteSubItem(val.id)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}>x</button>
                                          </>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                  {addingValueTo === child.id && (
                                    <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                                      <input type="text" value={newValueName} onChange={e => setNewValueName(e.target.value)} placeholder={`Add item to ${displayChildName}...`} onKeyDown={e => { if (e.key === 'Enter') handleAddValue(child.id); }} style={{ flex: 1, padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} autoFocus />
                                      <button onClick={() => handleAddValue(child.id)} disabled={!newValueName.trim()} style={{ padding: '6px 14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', opacity: !newValueName.trim() ? 0.5 : 1 }}>Add</button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            <div style={{ marginTop: 10, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', padding: 12 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                                <i className="fas fa-plus" style={{ marginRight: 6, fontSize: 10, color: '#3b82f6' }} />
                                Add Subcategory
                              </div>
                              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                                <input type="text" value={newSubName} onChange={e => setNewSubName(e.target.value)} placeholder="Subcategory name (e.g. Gold, Silver, Diamond)" onKeyDown={e => { if (e.key === 'Enter') handleAddSubcategory(cat.id); }} style={{ flex: 1, padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                              </div>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <input type="text" value={newSubGroupName} onChange={e => setNewSubGroupName(e.target.value)} placeholder="Group name (optional — e.g. Material, Color)" onKeyDown={e => { if (e.key === 'Enter') handleAddSubcategory(cat.id); }} style={{ flex: 1, padding: '8px 10px', border: '1px dashed #cbd5e1', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                                <button onClick={() => handleAddSubcategory(cat.id)} disabled={!newSubName.trim()} style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600, opacity: !newSubName.trim() ? 0.5 : 1, whiteSpace: 'nowrap' }}>Add</button>
                              </div>
                              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, lineHeight: 1.4 }}>
                                <strong>Without group:</strong> adds directly under this category.
                                <br />
                                <strong>With group:</strong> groups similar subcategories together (e.g. group "Material" with items Gold, Silver, Platinum).
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeView === 'homepage' && (
        <>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <i className="fas fa-lightbulb" style={{ color: '#3b82f6', marginTop: 2, flexShrink: 0 }} />
            <div style={{ fontSize: 13, color: '#1e40af', lineHeight: 1.5 }}>
              Control how your categories appear on the store's homepage. You can show product sections for each category, add featured subcategory sections, enable circular browse icons, and reorder everything.
            </div>
          </div>

          <SectionCard
            title="Browse by Category Circles"
            subtitle="Circular icons on homepage for quick browsing"
            icon="fa-th"
            defaultOpen={true}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>Enable this section</span>
              <Toggle checked={chooseEnabled} onChange={handleChooseToggle} />
            </div>
            <div style={{ opacity: chooseEnabled ? 1 : 0.4, pointerEvents: chooseEnabled ? 'auto' : 'none', transition: 'opacity 0.3s' }}>
              {categories.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: 13 }}>Create categories first, then come back here to set up browse circles.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                  {categories.map(cat => {
                    const conf = chooseCats[cat.id] || {};
                    const isVisible = !!conf.visible;
                    const browseImg = conf.browseImage;
                    return (
                      <div key={cat.id} style={{ border: isVisible ? '2px solid #10b981' : '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', background: '#fff', transition: 'border-color 0.2s' }}>
                        <div style={{ position: 'relative', width: '100%', height: 100, background: '#f8f8f5' }}>
                          {browseImg ? (
                            <>
                              <img src={resolveImageUrl(browseImg)} alt={cat.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                              <button onClick={() => handleChooseImageRemove(cat.id)} style={{ position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>x</button>
                              <label style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(255,255,255,0.9)', borderRadius: 4, padding: '2px 6px', fontSize: 10, color: chooseUploadingId === cat.id ? '#94a3b8' : '#3b82f6', cursor: chooseUploadingId === cat.id ? 'default' : 'pointer' }}>
                                {chooseUploadingId === cat.id ? '...' : 'Change'}
                                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { if (e.target.files[0]) handleChooseImageUpload(cat.id, e.target.files[0]); }} disabled={chooseUploadingId === cat.id} />
                              </label>
                            </>
                          ) : (
                            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', cursor: 'pointer', color: '#94a3b8', fontSize: 11 }}>
                              {chooseUploadingId === cat.id ? <span>...</span> : <><i className="fas fa-image" style={{ fontSize: 18, marginBottom: 4 }} /><span>Add Image</span></>}
                              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { if (e.target.files[0]) handleChooseImageUpload(cat.id, e.target.files[0]); }} disabled={chooseUploadingId === cat.id} />
                            </label>
                          )}
                        </div>
                        <div style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 500, fontSize: 12, color: '#333' }}>{cat.name}</span>
                          <Toggle checked={isVisible} onChange={() => handleChooseCatToggle(cat.id)} size="small" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Featured Subcategory Sections"
            subtitle="Highlight specific subcategories on the homepage"
            icon="fa-star"
            defaultOpen={true}
          >
            <div style={{ marginTop: 12 }}>
              <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 14px', lineHeight: 1.5 }}>
                Add product sections that show items from a specific subcategory. For example, show only "Gold Necklaces" or "Cotton Sarees" as a featured section on your homepage.
              </p>

              {subcatSections.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {subcatSections.map(section => (
                    <div key={section.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{section.name}</div>
                        {section.subtitle && <div style={{ color: '#64748b', fontSize: 12, marginTop: 1 }}>{section.subtitle}</div>}
                        <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 3 }}>
                          <i className="fas fa-filter" style={{ marginRight: 4, fontSize: 9 }} />
                          {section.subcategoryLabel || 'Selected subcategory'}
                        </div>
                      </div>
                      <button onClick={() => handleRemoveSubcatSection(section.id)} style={{ padding: '5px 8px', background: 'none', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}><i className="fas fa-trash" /></button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 10, color: '#475569' }}>
                  <i className="fas fa-plus" style={{ marginRight: 6, fontSize: 10, color: '#3b82f6' }} />
                  Add New Featured Section
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input type="text" placeholder="Section title (e.g. Trending Gold Necklaces)" value={newSectionName} onChange={e => setNewSectionName(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff' }} />
                  <input type="text" placeholder="Short description (optional)" value={newSectionSubtitle} onChange={e => setNewSectionSubtitle(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', color: '#64748b', background: '#fff' }} />
                  <select value={newSectionSubcatId} onChange={e => setNewSectionSubcatId(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, background: '#fff', fontFamily: 'inherit', boxSizing: 'border-box' }}>
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
                  <button className="btn btn-primary" onClick={handleAddSubcatSection} disabled={!newSectionName.trim() || !newSectionSubcatId} style={{ alignSelf: 'flex-start', opacity: (!newSectionName.trim() || !newSectionSubcatId) ? 0.5 : 1, fontSize: 13 }}>
                    <i className="fas fa-plus" style={{ marginRight: 6 }} />Add Section
                  </button>
                </div>
              </div>
            </div>
          </SectionCard>

          {unifiedSections.length > 0 && (
            <SectionCard
              title="Section Display Order"
              subtitle="Drag sections up or down to change their homepage order"
              icon="fa-sort"
              defaultOpen={true}
            >
              <div style={{ marginTop: 12 }}>
                <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 14px' }}>
                  Arrange the order in which product sections appear on your homepage. The first section shows right after the hero banner.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {unifiedSections.map((item, idx) => (
                    <div key={`${item.type}-${item.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                        <button onClick={() => handleMoveSection(idx, 'up')} disabled={idx === 0} style={{ padding: '2px 6px', background: idx === 0 ? '#f8fafc' : '#fff', border: '1px solid #e2e8f0', borderRadius: 4, cursor: idx === 0 ? 'default' : 'pointer', fontSize: 9, color: idx === 0 ? '#cbd5e1' : '#64748b' }}><i className="fas fa-chevron-up" /></button>
                        <button onClick={() => handleMoveSection(idx, 'down')} disabled={idx === unifiedSections.length - 1} style={{ padding: '2px 6px', background: idx === unifiedSections.length - 1 ? '#f8fafc' : '#fff', border: '1px solid #e2e8f0', borderRadius: 4, cursor: idx === unifiedSections.length - 1 ? 'default' : 'pointer', fontSize: 9, color: idx === unifiedSections.length - 1 ? '#cbd5e1' : '#64748b' }}><i className="fas fa-chevron-down" /></button>
                      </div>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: '#e2e8f0', color: '#475569', flexShrink: 0 }}>{idx + 1}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{item.name}</div>
                        {item.label && <div style={{ color: '#94a3b8', fontSize: 11 }}>{item.label}</div>}
                      </div>
                      <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, background: item.type === 'category' ? '#dbeafe' : '#fae8ff', color: item.type === 'category' ? '#2563eb' : '#a21caf', flexShrink: 0 }}>
                        {item.type === 'category' ? 'Category' : 'Featured'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>
          )}
        </>
      )}

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <button
          onClick={handleSaveAllSettings}
          disabled={saving || !hasUnsavedChanges}
          style={{
            padding: '12px 40px',
            background: hasUnsavedChanges ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : '#e2e8f0',
            color: hasUnsavedChanges ? '#fff' : '#94a3b8',
            border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600,
            cursor: hasUnsavedChanges ? 'pointer' : 'default',
            opacity: saving ? 0.7 : 1,
            boxShadow: hasUnsavedChanges ? '0 4px 12px rgba(59,130,246,0.3)' : 'none',
            transition: 'all 0.3s ease',
          }}
        >{saving ? 'Saving...' : hasUnsavedChanges ? 'Save All Changes' : 'All Changes Saved'}</button>
      </div>
    </div>
  );
}
