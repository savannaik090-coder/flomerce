import React, { useState, useEffect, useContext } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { getProducts, updateProduct } from '../../services/productService.js';
import { getLocations, getInventoryLevels, setInventoryLevel, createTransfer, getTransfers } from '../../services/inventoryService.js';
import { formatPrice, getAdminCurrency } from '../../utils/priceFormatter.js';

export default function InventorySection() {
  const { siteConfig } = useContext(SiteContext);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [levels, setLevels] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('overview');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [transfers, setTransfers] = useState([]);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferForm, setTransferForm] = useState({ product_id: '', from_location_id: '', to_location_id: '', quantity: 1, notes: '' });
  const [transferSaving, setTransferSaving] = useState(false);

  useEffect(() => {
    if (siteConfig?.id) loadData();
  }, [siteConfig?.id]);

  async function loadData() {
    setLoading(true);
    try {
      const [prodRes, locRes] = await Promise.all([
        getProducts(siteConfig.id),
        getLocations(siteConfig.id).catch(() => ({ data: [] }))
      ]);
      const prods = prodRes.data || prodRes.products || [];
      const locs = locRes.data || [];
      setProducts(prods);
      setLocations(locs);

      if (locs.length > 0) {
        const levelsRes = await getInventoryLevels(siteConfig.id);
        setLevels(levelsRes.data || []);
      }
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

  async function handleLevelUpdate(productId, locationId, newStock) {
    try {
      await setInventoryLevel(siteConfig.id, productId, locationId, parseInt(newStock) || 0);
      const levelsRes = await getInventoryLevels(siteConfig.id);
      setLevels(levelsRes.data || []);
      const prodRes = await getProducts(siteConfig.id);
      setProducts(prodRes.data || prodRes.products || []);
    } catch (err) {
      alert('Failed to update stock level: ' + err.message);
    }
  }

  async function handleShowProductLevels(product) {
    setSelectedProduct(product);
    setViewMode('product-detail');
    try {
      const [levelsRes, transfersRes] = await Promise.all([
        getInventoryLevels(siteConfig.id, product.id),
        getTransfers(siteConfig.id, product.id)
      ]);
      setLevels(prev => {
        const otherLevels = prev.filter(l => l.product_id !== product.id);
        return [...otherLevels, ...(levelsRes.data || [])];
      });
      setTransfers(transfersRes.data || []);
    } catch (err) {
      console.error('Error loading product levels:', err);
    }
  }

  async function handleTransfer(e) {
    e.preventDefault();
    if (!transferForm.product_id || !transferForm.from_location_id || !transferForm.to_location_id) return;
    if (transferForm.from_location_id === transferForm.to_location_id) return alert('Source and destination must be different');
    setTransferSaving(true);
    try {
      await createTransfer(siteConfig.id, transferForm);
      setShowTransfer(false);
      setTransferForm({ product_id: '', from_location_id: '', to_location_id: '', quantity: 1, notes: '' });
      await loadData();
      if (selectedProduct) {
        await handleShowProductLevels(selectedProduct);
      }
    } catch (err) {
      alert(err.message || 'Transfer failed');
    } finally {
      setTransferSaving(false);
    }
  }

  const hasLocations = locations.length > 0;

  const getProductLevels = (productId) => levels.filter(l => l.product_id === productId);
  const getTotalLocationStock = (productId) => {
    const productLevels = getProductLevels(productId);
    return productLevels.reduce((sum, l) => sum + (l.stock || 0), 0);
  };

  const outOfStock = products.filter(p => (parseInt(p.stock) || 0) === 0);
  const lowStock = products.filter(p => { const s = parseInt(p.stock) || 0; return s > 0 && s <= 3; });
  const inStock = products.filter(p => (parseInt(p.stock) || 0) > 3);
  const displayed = activeTab === 'out' ? outOfStock : activeTab === 'low' ? lowStock : activeTab === 'in' ? inStock : products;

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  if (viewMode === 'product-detail' && selectedProduct) {
    const productLevels = getProductLevels(selectedProduct.id);
    return (
      <div>
        <button className="btn btn-outline btn-sm" onClick={() => { setViewMode('overview'); setSelectedProduct(null); }} style={{ marginBottom: '1rem' }}>
          <i className="fas fa-arrow-left" /> Back to Inventory
        </button>

        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="card-title" style={{ marginBottom: 4 }}>{selectedProduct.name}</h3>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Total Stock: {parseInt(selectedProduct.stock) || 0}</span>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => {
              setTransferForm({ ...transferForm, product_id: selectedProduct.id });
              setShowTransfer(true);
            }}>
              <i className="fas fa-exchange-alt" /> Transfer Stock
            </button>
          </div>
          <div className="card-content">
            {showTransfer && (
              <form onSubmit={handleTransfer} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '1.25rem', marginBottom: '1.5rem' }}>
                <h4 style={{ margin: '0 0 1rem', fontSize: '0.95rem' }}>Transfer Stock</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: '0.75rem', alignItems: 'end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4, color: '#374151' }}>From Location</label>
                    <select value={transferForm.from_location_id} onChange={e => setTransferForm({ ...transferForm, from_location_id: e.target.value })} required
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.85rem' }}>
                      <option value="">Select...</option>
                      {locations.map(l => {
                        const lvl = productLevels.find(pl => pl.location_id === l.id);
                        return <option key={l.id} value={l.id}>{l.name} ({lvl?.stock || 0})</option>;
                      })}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4, color: '#374151' }}>To Location</label>
                    <select value={transferForm.to_location_id} onChange={e => setTransferForm({ ...transferForm, to_location_id: e.target.value })} required
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.85rem' }}>
                      <option value="">Select...</option>
                      {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4, color: '#374151' }}>Qty</label>
                    <input type="number" min="1" value={transferForm.quantity} onChange={e => setTransferForm({ ...transferForm, quantity: parseInt(e.target.value) || 1 })} required
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.85rem', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div style={{ marginTop: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4, color: '#374151' }}>Notes (optional)</label>
                  <input type="text" value={transferForm.notes} onChange={e => setTransferForm({ ...transferForm, notes: e.target.value })} placeholder="Reason for transfer"
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.85rem', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: '1rem' }}>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={transferSaving}>{transferSaving ? 'Transferring...' : 'Transfer'}</button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowTransfer(false)}>Cancel</button>
                </div>
              </form>
            )}

            <h4 style={{ fontSize: '0.9rem', margin: '0 0 0.75rem', color: '#374151' }}>Stock by Location</h4>
            {locations.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No locations configured. Add locations from the Locations tab.</p>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Location</th>
                      <th>Stock</th>
                      <th>Update</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locations.map(loc => {
                      const level = productLevels.find(l => l.location_id === loc.id);
                      const stock = level?.stock || 0;
                      return (
                        <tr key={loc.id}>
                          <td>
                            <span style={{ fontWeight: 500 }}>{loc.name}</span>
                            {loc.is_default ? <span style={{ fontSize: '0.6rem', background: '#2563eb', color: 'white', padding: '1px 6px', borderRadius: 8, marginLeft: 6, fontWeight: 600 }}>DEFAULT</span> : null}
                          </td>
                          <td>{stock}</td>
                          <td>
                            <input type="number" min="0" defaultValue={stock} style={{ width: 80, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 14 }}
                              onBlur={e => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val) && val !== stock) handleLevelUpdate(selectedProduct.id, loc.id, val);
                              }}
                              onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {transfers.length > 0 && (
              <div style={{ marginTop: '1.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', margin: '0 0 0.75rem', color: '#374151' }}>Transfer History</h4>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Qty</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transfers.map(t => (
                        <tr key={t.id}>
                          <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{new Date(t.created_at).toLocaleDateString()}</td>
                          <td>{t.from_location_name || '—'}</td>
                          <td>{t.to_location_name || '—'}</td>
                          <td>{t.quantity}</td>
                          <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{t.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

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

      {hasLocations && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button className="btn btn-outline btn-sm" onClick={() => {
            setTransferForm({ product_id: '', from_location_id: '', to_location_id: '', quantity: 1, notes: '' });
            setShowTransfer(!showTransfer);
          }}>
            <i className="fas fa-exchange-alt" /> Quick Transfer
          </button>
        </div>
      )}

      {showTransfer && hasLocations && viewMode === 'overview' && (
        <form onSubmit={handleTransfer} className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
          <h4 style={{ margin: '0 0 1rem', fontSize: '0.95rem' }}>Quick Transfer</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', gap: '0.75rem', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4 }}>Product</label>
              <select value={transferForm.product_id} onChange={e => setTransferForm({ ...transferForm, product_id: e.target.value })} required
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.85rem' }}>
                <option value="">Select product...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4 }}>From</label>
              <select value={transferForm.from_location_id} onChange={e => setTransferForm({ ...transferForm, from_location_id: e.target.value })} required
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.85rem' }}>
                <option value="">Select...</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4 }}>To</label>
              <select value={transferForm.to_location_id} onChange={e => setTransferForm({ ...transferForm, to_location_id: e.target.value })} required
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.85rem' }}>
                <option value="">Select...</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4 }}>Qty</label>
              <input type="number" min="1" value={transferForm.quantity} onChange={e => setTransferForm({ ...transferForm, quantity: parseInt(e.target.value) || 1 })} required
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.85rem', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: '1rem' }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={transferSaving}>{transferSaving ? 'Transferring...' : 'Transfer'}</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowTransfer(false)}>Cancel</button>
          </div>
        </form>
      )}

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
                    <th>Total Stock</th>
                    {hasLocations && <th>Locations</th>}
                    <th>Status</th>
                    {!hasLocations && <th>Update Stock</th>}
                    {hasLocations && <th>Details</th>}
                  </tr>
                </thead>
                <tbody>
                  {displayed.map(product => {
                    const stock = parseInt(product.stock) || 0;
                    const productLevels = getProductLevels(product.id);
                    return (
                      <tr key={product.id}>
                        <td style={{ fontWeight: 500 }}>{product.name}</td>
                        <td>{formatPrice(parseFloat(product.price || 0), getAdminCurrency(siteConfig))}</td>
                        <td>{stock}</td>
                        {hasLocations && (
                          <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {productLevels.length > 0
                              ? productLevels.map(l => `${l.location_name}: ${l.stock}`).join(', ')
                              : <span style={{ color: '#94a3b8' }}>Not assigned</span>}
                          </td>
                        )}
                        <td>
                          {stock === 0 && <span className="status-badge status-cancelled">Out of Stock</span>}
                          {stock > 0 && stock <= 3 && <span className="status-badge status-new">Low Stock</span>}
                          {stock > 3 && <span className="status-badge status-confirmed">In Stock</span>}
                        </td>
                        {!hasLocations && (
                          <td>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <input type="number" min="0" defaultValue={stock}
                                style={{ width: 80, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 14 }}
                                onBlur={e => {
                                  const val = parseInt(e.target.value);
                                  if (!isNaN(val) && val !== stock) handleStockUpdate(product.id, val);
                                }}
                                onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }} />
                            </div>
                          </td>
                        )}
                        {hasLocations && (
                          <td>
                            <button className="btn btn-outline btn-sm" style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                              onClick={() => handleShowProductLevels(product)}>
                              <i className="fas fa-layer-group" /> Manage
                            </button>
                          </td>
                        )}
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
