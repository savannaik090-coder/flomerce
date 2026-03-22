import React, { useState, useEffect, useContext } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { getProducts, updateProduct } from '../../services/productService.js';
import { formatPrice, getAdminCurrency } from '../../utils/priceFormatter.js';

export default function InventorySection() {
  const { siteConfig } = useContext(SiteContext);
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (siteConfig?.id) loadProducts();
  }, [siteConfig?.id]);

  async function loadProducts() {
    setLoading(true);
    try {
      const res = await getProducts(siteConfig.id);
      setProducts(res.data || res.products || []);
    } catch (err) {
      console.error('Error loading inventory:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStockUpdate(productId, newStock) {
    try {
      await updateProduct(productId, { stock: parseInt(newStock) || 0 }, siteConfig?.id);
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: parseInt(newStock) || 0 } : p));
    } catch (err) {
      alert('Failed to update stock: ' + err.message);
    }
  }

  const outOfStock = products.filter(p => (parseInt(p.stock) || 0) === 0);
  const lowStock = products.filter(p => { const s = parseInt(p.stock) || 0; return s > 0 && s <= 5; });
  const inStock = products.filter(p => (parseInt(p.stock) || 0) > 5);

  const displayed = activeTab === 'out' ? outOfStock : activeTab === 'low' ? lowStock : activeTab === 'in' ? inStock : products;

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  return (
    <div>
      <div className="inventory-summary">
        <div className={`inventory-card out-of-stock${activeTab === 'out' ? ' active' : ''}`} onClick={() => setActiveTab('out')}>
          <div className="count" style={{ color: '#dc2626' }}>{outOfStock.length}</div>
          <div className="label">Out of Stock</div>
        </div>
        <div className={`inventory-card low-stock${activeTab === 'low' ? ' active' : ''}`} onClick={() => setActiveTab('low')}>
          <div className="count" style={{ color: '#f59e0b' }}>{lowStock.length}</div>
          <div className="label">Low Stock</div>
        </div>
        <div className={`inventory-card in-stock${activeTab === 'in' ? ' active' : ''}`} onClick={() => setActiveTab('in')}>
          <div className="count" style={{ color: '#059669' }}>{inStock.length}</div>
          <div className="label">In Stock</div>
        </div>
        <div className={`inventory-card total${activeTab === 'all' ? ' active' : ''}`} onClick={() => setActiveTab('all')}>
          <div className="count" style={{ color: '#2563eb' }}>{products.length}</div>
          <div className="label">Total Products</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            {activeTab === 'out' ? 'Out of Stock' : activeTab === 'low' ? 'Low Stock' : activeTab === 'in' ? 'In Stock' : 'All Products'} ({displayed.length})
          </h3>
        </div>
        <div className="card-content">
          {displayed.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-check-circle" />
              <h3>No products in this category</h3>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Current Stock</th>
                    <th>Status</th>
                    <th>Update Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map(product => {
                    const stock = parseInt(product.stock) || 0;
                    return (
                      <tr key={product.id}>
                        <td style={{ fontWeight: 500 }}>{product.name}</td>
                        <td>{formatPrice(parseFloat(product.price || 0), getAdminCurrency(siteConfig))}</td>
                        <td>{stock}</td>
                        <td>
                          {stock === 0 && <span className="status-badge status-cancelled">Out of Stock</span>}
                          {stock > 0 && stock <= 5 && <span className="status-badge status-new">Low Stock</span>}
                          {stock > 5 && <span className="status-badge status-confirmed">In Stock</span>}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input
                              type="number"
                              min="0"
                              defaultValue={stock}
                              style={{ width: 80, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 14 }}
                              onBlur={e => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val) && val !== stock) handleStockUpdate(product.id, val);
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') e.target.blur();
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
