import React, { useState, useEffect, useContext } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { getProducts, deleteProduct } from '../../services/productService.js';
import { getCategories } from '../../services/categoryService.js';
import { resolveImageUrl } from '../../utils/imageUrl.js';
import { formatPrice, getAdminCurrency } from '../../utils/priceFormatter.js';
import ConfirmModal from './ConfirmModal.jsx';
import { useToast } from '../../../../shared/ui/Toast.jsx';

export default function ProductsSection({ onEditProduct, onAddProduct }) {
  const { siteConfig } = useContext(SiteContext);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const toast = useToast();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState(null);

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

  function handleDelete(productId) {
    setConfirmModal({
      title: "Delete Product",
      message: "Are you sure you want to delete this product?",
      danger: true,
      onConfirm: async () => {
        try {
          await deleteProduct(productId, siteConfig?.id);
          setProducts(prev => prev.filter(p => p.id !== productId));
        } catch (err) {
          toast.error(`Failed to delete product: ${err.message}`);
        }
      }
    });
  }

  const filtered = products.filter(p => {
    const matchesCategory = activeCategory === 'all' || p.category_id === activeCategory || p.category === activeCategory;
    const matchesSearch = !searchTerm || (p.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  return (
    <>
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
          <p>{searchTerm ? "Try a different search term." : "Add your first product to get started."}</p>
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
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>SKU: {product.sku || '—'}</div>
                  <div className="product-price">{formatPrice(parseFloat(product.price || 0), getAdminCurrency(siteConfig))}</div>
                  <div className="product-stock">
                    Stock: {product.stock ?? 0}
                    {(product.stock ?? 0) === 0 && <span style={{ color: '#dc2626', marginInlineStart: 8 }}>Out of Stock</span>}
                    {(product.stock ?? 0) > 0 && (product.stock ?? 0) <= 3 && <span style={{ color: '#f59e0b', marginInlineStart: 8 }}>Low Stock</span>}
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

      <button className="floating-add-btn" onClick={onAddProduct}>
        <i className="fas fa-plus" /> Add Product
      </button>
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