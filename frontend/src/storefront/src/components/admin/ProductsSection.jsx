import React, { useState, useEffect, useContext } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { getProducts, deleteProduct } from '../../services/productService.js';
import { getCategories } from '../../services/categoryService.js';
import { resolveImageUrl } from '../../utils/imageUrl.js';

export default function ProductsSection({ onEditProduct, onAddProduct }) {
  const { siteConfig } = useContext(SiteContext);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (siteConfig?.id) loadData();
  }, [siteConfig?.id]);

  async function loadData() {
    setLoading(true);
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        getProducts(siteConfig.id).catch(() => ({ data: [] })),
        getCategories(siteConfig.id).catch(() => ({ data: [] })),
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
      await deleteProduct(productId, siteConfig?.id);
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

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  return (
    <div>
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <button className="btn btn-primary" onClick={onAddProduct}>
          <i className="fas fa-plus" /> Add Product
        </button>
      </div>

      <div className="tabs">
        <button className={`tab${activeCategory === 'all' ? ' active' : ''}`} onClick={() => setActiveCategory('all')}>
          All ({products.length})
        </button>
        {categories.map(cat => {
          const count = products.filter(p => p.category_id === cat.id || p.category === cat.slug).length;
          return (
            <button
              key={cat.id}
              className={`tab${activeCategory === cat.id ? ' active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.name} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-box-open" />
          <h3>No products found</h3>
          <p>{searchTerm ? 'Try a different search term.' : 'Add your first product to get started.'}</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={onAddProduct}>
            <i className="fas fa-plus" /> Add Product
          </button>
        </div>
      ) : (
        <div className="product-grid">
          {filtered.map(product => {
            const images = product.images ? (typeof product.images === 'string' ? JSON.parse(product.images) : product.images) : [];
            const rawImage = product.image_url || product.imageUrl || (images.length > 0 ? images[0] : null);
            const mainImage = rawImage ? resolveImageUrl(rawImage) : null;
            return (
              <div key={product.id} className="product-card-admin">
                {mainImage ? (
                  <img src={mainImage} alt={product.name} loading="lazy" />
                ) : (
                  <div style={{ height: 180, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                    <i className="fas fa-image" style={{ fontSize: 32 }} />
                  </div>
                )}
                <div className="product-info">
                  <div className="product-name">{product.name}</div>
                  <div className="product-price">₹{parseFloat(product.price || 0).toLocaleString('en-IN')}</div>
                  <div className="product-stock">
                    Stock: {product.stock ?? 0}
                    {(product.stock ?? 0) === 0 && <span style={{ color: '#dc2626', marginLeft: 8 }}>Out of Stock</span>}
                    {(product.stock ?? 0) > 0 && (product.stock ?? 0) <= 5 && <span style={{ color: '#f59e0b', marginLeft: 8 }}>Low Stock</span>}
                  </div>
                </div>
                <div className="product-actions">
                  <button className="btn btn-sm btn-outline" onClick={() => onEditProduct(product)}>
                    <i className="fas fa-edit" /> Edit
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(product.id)}>
                    <i className="fas fa-trash" />
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
