import React, { useState, useEffect, useContext } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../services/categoryService.js';

export default function CategoriesSection() {
  const { siteConfig } = useContext(SiteContext);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editingSubtitle, setEditingSubtitle] = useState(null);
  const [editSubtitleValue, setEditSubtitleValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (siteConfig?.id) loadCategories();
  }, [siteConfig?.id]);

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
        displayOrder: categories.length,
      });
      setNewCategoryName('');
      await loadCategories();
    } catch (e) {
      alert('Failed to add category: ' + e.message);
    }
  }

  async function handleDeleteCategory(categoryId) {
    if (!window.confirm('Delete this category? Products in this category will not be deleted.')) return;
    try {
      await deleteCategory(categoryId);
      await loadCategories();
    } catch (e) {
      alert('Failed to delete category: ' + e.message);
    }
  }

  async function handleUpdateCategory(categoryId) {
    if (!editCategoryName.trim()) return;
    try {
      const slug = editCategoryName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      await updateCategory(categoryId, { name: editCategoryName.trim(), slug });
      setEditingCategory(null);
      setEditCategoryName('');
      await loadCategories();
    } catch (e) {
      alert('Failed to update category: ' + e.message);
    }
  }

  async function handleUpdateSubtitle(categoryId) {
    try {
      await updateCategory(categoryId, { subtitle: editSubtitleValue.trim() });
      setEditingSubtitle(null);
      setEditSubtitleValue('');
      await loadCategories();
    } catch (e) {
      alert('Failed to update subtitle: ' + e.message);
    }
  }

  async function handleToggleShowOnHome(cat) {
    const newValue = cat.show_on_home ? 0 : 1;
    try {
      await updateCategory(cat.id, { showOnHome: newValue });
      setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, show_on_home: newValue } : c));
    } catch (e) {
      alert('Failed to update homepage visibility: ' + e.message);
    }
  }

  const filtered = categories.filter(c =>
    !searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  return (
    <div>
      <style>{`
        .homepage-toggle {
          position: relative;
          width: 44px;
          height: 24px;
          cursor: pointer;
        }
        .homepage-toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .homepage-toggle .toggle-slider {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #cbd5e1;
          border-radius: 24px;
          transition: background-color 0.2s;
        }
        .homepage-toggle .toggle-slider::before {
          content: '';
          position: absolute;
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          border-radius: 50%;
          transition: transform 0.2s;
        }
        .homepage-toggle input:checked + .toggle-slider {
          background-color: var(--admin-primary, #6366f1);
        }
        .homepage-toggle input:checked + .toggle-slider::before {
          transform: translateX(20px);
        }
        .subtitle-text {
          color: #94a3b8;
          font-size: 13px;
          font-style: italic;
          cursor: pointer;
        }
        .subtitle-text:hover {
          color: #64748b;
        }
      `}</style>

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
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-folder-open" />
          <h3>{searchTerm ? 'No categories match your search' : 'No categories yet'}</h3>
          <p>Create your first category to organize your products.</p>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Categories ({filtered.length})</h3>
          </div>
          <div className="card-content" style={{ padding: 0 }}>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Subtitle</th>
                    <th>Slug</th>
                    <th style={{ textAlign: 'center' }}>Show on Homepage</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(cat => (
                    <tr key={cat.id}>
                      <td>
                        {editingCategory === cat.id ? (
                          <input
                            type="text"
                            value={editCategoryName}
                            onChange={(e) => setEditCategoryName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleUpdateCategory(cat.id)}
                            style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 14, width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }}
                            autoFocus
                          />
                        ) : (
                          <span style={{ fontWeight: 500 }}>{cat.name}</span>
                        )}
                      </td>
                      <td>
                        {editingSubtitle === cat.id ? (
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <input
                              type="text"
                              value={editSubtitleValue}
                              onChange={(e) => setEditSubtitleValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateSubtitle(cat.id);
                                if (e.key === 'Escape') setEditingSubtitle(null);
                              }}
                              placeholder="Enter subtitle..."
                              style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 13, width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }}
                              autoFocus
                            />
                            <button className="btn btn-primary btn-sm" onClick={() => handleUpdateSubtitle(cat.id)} style={{ whiteSpace: 'nowrap' }}>Save</button>
                            <button className="btn btn-outline btn-sm" onClick={() => setEditingSubtitle(null)}>Cancel</button>
                          </div>
                        ) : (
                          <span
                            className="subtitle-text"
                            onClick={() => { setEditingSubtitle(cat.id); setEditSubtitleValue(cat.subtitle || ''); }}
                            title="Click to edit subtitle"
                          >
                            {cat.subtitle || 'Click to add subtitle'}
                          </span>
                        )}
                      </td>
                      <td style={{ color: '#64748b', fontSize: 13 }}>/{cat.slug}</td>
                      <td style={{ textAlign: 'center' }}>
                        <label className="homepage-toggle">
                          <input
                            type="checkbox"
                            checked={!!cat.show_on_home}
                            onChange={() => handleToggleShowOnHome(cat)}
                          />
                          <span className="toggle-slider" />
                        </label>
                      </td>
                      <td>
                        {editingCategory === cat.id ? (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-primary btn-sm" onClick={() => handleUpdateCategory(cat.id)}>Save</button>
                            <button className="btn btn-outline btn-sm" onClick={() => setEditingCategory(null)}>Cancel</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-outline btn-sm" onClick={() => { setEditingCategory(cat.id); setEditCategoryName(cat.name); }}>
                              <i className="fas fa-edit" />
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteCategory(cat.id)}>
                              <i className="fas fa-trash" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
