import { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api.js';

export default function ProductsSection({ site, onEditProduct, onAddProduct }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (site?.id) loadData();
  }, [site?.id]);

  async function loadData() {
    setLoading(true);
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        apiRequest(`/api/products?siteId=${site.id}`).catch(() => ({ data: [] })),
        apiRequest(`/api/categories?siteId=${site.id}`).catch(() => ({ data: [] })),
      ]);
      setProducts(productsRes.data || productsRes.products || []);
      setCategories(categoriesRes.data || categoriesRes.categories || []);
    } catch (err) {
      console.error('Error loading products:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(productId) {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await apiRequest(`/api/products/${productId}`, { method: 'DELETE' });
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (err) {
      alert('Failed to delete product: ' + err.message);
    }
  }

  const filtered = products.filter(p => {
    const matchesCategory = activeCategory === 'all' || p.category_id === activeCategory || p.category === activeCategory;
    const matchesSearch = !searchTerm || (p.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) return <div className="sa-loading"><div className="sa-spinner" /></div>;

  return (
    <div>
      <div className="sa-search-bar">
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <button className="btn btn-primary" onClick={onAddProduct}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Product
        </button>
      </div>

      <div className="sa-tabs">
        <button className={`sa-tab${activeCategory === 'all' ? ' active' : ''}`} onClick={() => setActiveCategory('all')}>
          All ({products.length})
        </button>
        {categories.map(cat => {
          const count = products.filter(p => p.category_id === cat.id || p.category === cat.slug).length;
          return (
            <button
              key={cat.id}
              className={`sa-tab${activeCategory === cat.id ? ' active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.name} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="sa-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
          <h3>No products found</h3>
          <p>{searchTerm ? 'Try a different search term.' : 'Add your first product to get started.'}</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={onAddProduct}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Product
          </button>
        </div>
      ) : (
        <div className="sa-product-grid">
          {filtered.map(product => {
            const images = product.images ? (typeof product.images === 'string' ? JSON.parse(product.images) : product.images) : [];
            const mainImage = product.image_url || product.imageUrl || (images.length > 0 ? images[0] : null);
            return (
              <div key={product.id} className="sa-product-card">
                {mainImage ? (
                  <img src={mainImage} alt={product.name} loading="lazy" />
                ) : (
                  <div className="sa-product-placeholder">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  </div>
                )}
                <div className="sa-product-info">
                  <div className="sa-product-name">{product.name}</div>
                  <div className="sa-product-price">{'\u20B9'}{parseFloat(product.price || 0).toLocaleString('en-IN')}</div>
                  <div className="sa-product-stock">
                    Stock: {product.stock ?? 0}
                    {(product.stock ?? 0) === 0 && <span style={{ color: '#dc2626', marginLeft: 8 }}>Out of Stock</span>}
                    {(product.stock ?? 0) > 0 && (product.stock ?? 0) <= 5 && <span style={{ color: '#f59e0b', marginLeft: 8 }}>Low Stock</span>}
                  </div>
                </div>
                <div className="sa-product-actions">
                  <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '6px 12px' }} onClick={() => onEditProduct(product)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Edit
                  </button>
                  <button className="btn btn-danger" style={{ fontSize: '0.75rem', padding: '6px 12px' }} onClick={() => handleDelete(product.id)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
