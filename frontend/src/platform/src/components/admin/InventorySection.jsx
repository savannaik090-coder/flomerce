import { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api.js';

export default function InventorySection({ site }) {
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (site?.id) loadProducts();
  }, [site?.id]);

  async function loadProducts() {
    setLoading(true);
    try {
      const res = await apiRequest(`/api/products?siteId=${site.id}`);
      setProducts(res.data || res.products || []);
    } catch (err) {
      console.error('Error loading inventory:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStockUpdate(productId, newStock) {
    try {
      await apiRequest(`/api/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({ stock: parseInt(newStock) || 0 }),
      });
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: parseInt(newStock) || 0 } : p));
    } catch (err) {
      alert('Failed to update stock: ' + err.message);
    }
  }

  const outOfStock = products.filter(p => (parseInt(p.stock) || 0) === 0);
  const lowStock = products.filter(p => { const s = parseInt(p.stock) || 0; return s > 0 && s <= 5; });
  const inStock = products.filter(p => (parseInt(p.stock) || 0) > 5);

  const displayed = activeTab === 'out' ? outOfStock : activeTab === 'low' ? lowStock : activeTab === 'in' ? inStock : products;

  if (loading) return <div className="sa-loading"><div className="sa-spinner" /></div>;

  return (
    <div>
      <div className="sa-inventory-summary">
        <div className={`sa-inventory-card sa-inv-out${activeTab === 'out' ? ' active' : ''}`} onClick={() => setActiveTab('out')}>
          <div className="sa-inv-count" style={{ color: '#dc2626' }}>{outOfStock.length}</div>
          <div className="sa-inv-label">Out of Stock</div>
        </div>
        <div className={`sa-inventory-card sa-inv-low${activeTab === 'low' ? ' active' : ''}`} onClick={() => setActiveTab('low')}>
          <div className="sa-inv-count" style={{ color: '#f59e0b' }}>{lowStock.length}</div>
          <div className="sa-inv-label">Low Stock</div>
        </div>
        <div className={`sa-inventory-card sa-inv-in${activeTab === 'in' ? ' active' : ''}`} onClick={() => setActiveTab('in')}>
          <div className="sa-inv-count" style={{ color: '#059669' }}>{inStock.length}</div>
          <div className="sa-inv-label">In Stock</div>
        </div>
        <div className={`sa-inventory-card sa-inv-total${activeTab === 'all' ? ' active' : ''}`} onClick={() => setActiveTab('all')}>
          <div className="sa-inv-count" style={{ color: '#2563eb' }}>{products.length}</div>
          <div className="sa-inv-label">Total Products</div>
        </div>
      </div>

      <div className="sa-card">
        <div className="sa-card-header">
          <h3 className="sa-card-title">
            {activeTab === 'out' ? 'Out of Stock' : activeTab === 'low' ? 'Low Stock' : activeTab === 'in' ? 'In Stock' : 'All Products'} ({displayed.length})
          </h3>
        </div>
        <div className="sa-card-content">
          {displayed.length === 0 ? (
            <div className="sa-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <h3>No products in this category</h3>
            </div>
          ) : (
            <div className="sa-table-wrap">
              <table className="sa-table">
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
                        <td>{'\u20B9'}{parseFloat(product.price || 0).toLocaleString('en-IN')}</td>
                        <td>{stock}</td>
                        <td>
                          {stock === 0 && <span className="sa-status-badge sa-status-cancelled">Out of Stock</span>}
                          {stock > 0 && stock <= 5 && <span className="sa-status-badge sa-status-new">Low Stock</span>}
                          {stock > 5 && <span className="sa-status-badge sa-status-confirmed">In Stock</span>}
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            defaultValue={stock}
                            style={{ width: 80, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 14 }}
                            onBlur={e => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val) && val !== stock) handleStockUpdate(product.id, val);
                            }}
                            onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                          />
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
