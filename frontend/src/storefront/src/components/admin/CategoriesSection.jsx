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
                    <th>Slug</th>
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
                      <td style={{ color: '#64748b', fontSize: 13 }}>/{cat.slug}</td>
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
