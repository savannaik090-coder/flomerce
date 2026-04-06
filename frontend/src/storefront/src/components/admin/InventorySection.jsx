import React, { useState, useEffect, useContext } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { getProducts, updateProduct } from '../../services/productService.js';
import { getLocations, createLocation, updateLocation, deleteLocation, getInventoryLevels, setInventoryLevel, createTransfer, getTransfers } from '../../services/inventoryService.js';
import { formatPrice, getAdminCurrency } from '../../utils/priceFormatter.js';

export default function InventorySection() {
  const { siteConfig } = useContext(SiteContext);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [levels, setLevels] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('stock');
  const [subTab, setSubTab] = useState('stock');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [transfers, setTransfers] = useState([]);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferForm, setTransferForm] = useState({ product_id: '', from_location_id: '', to_location_id: '', quantity: 1, notes: '' });
  const [transferSaving, setTransferSaving] = useState(false);

  const [locForm, setLocForm] = useState({ name: '', address: '', priority: 0, is_default: false });
  const [locEditingId, setLocEditingId] = useState(null);
  const [locShowForm, setLocShowForm] = useState(false);
  const [locSaving, setLocSaving] = useState(false);

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

  function resetLocForm() {
    setLocForm({ name: '', address: '', priority: 0, is_default: false });
    setLocEditingId(null);
    setLocShowForm(false);
  }

  async function handleLocSubmit(e) {
    e.preventDefault();
    if (!locForm.name.trim()) return alert('Location name is required');
    setLocSaving(true);
    try {
      if (locEditingId) {
        await updateLocation(siteConfig.id, locEditingId, locForm);
      } else {
        await createLocation(siteConfig.id, locForm);
      }
      resetLocForm();
      await loadData();
    } catch (err) {
      alert('Failed to save location: ' + err.message);
    } finally {
      setLocSaving(false);
    }
  }

  async function handleLocDelete(loc) {
    if (!window.confirm(`Delete location "${loc.name}"? Stock must be zero or transferred first.`)) return;
    try {
      await deleteLocation(siteConfig.id, loc.id);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete location');
    }
  }

  async function handleLocSetDefault(loc) {
    try {
      await updateLocation(siteConfig.id, loc.id, { ...loc, is_default: true });
      await loadData();
    } catch (err) {
      alert('Failed to set default: ' + err.message);
    }
  }

  const hasLocations = locations.length > 0;
  const getProductLevels = (productId) => levels.filter(l => l.product_id === productId);

  const outOfStock = products.filter(p => (parseInt(p.stock) || 0) === 0);
  const lowStock = products.filter(p => { const s = parseInt(p.stock) || 0; return s > 0 && s <= 3; });
  const inStock = products.filter(p => (parseInt(p.stock) || 0) > 3);
  const displayed = activeTab === 'out' ? outOfStock : activeTab === 'low' ? lowStock : activeTab === 'in' ? inStock : products;

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  if (viewMode === 'product-detail' && selectedProduct) {
    const productLevels = getProductLevels(selectedProduct.id);
    return (
      <div>
        <button className="btn btn-outline btn-sm" onClick={() => { setViewMode('stock'); setSelectedProduct(null); }} style={{ marginBottom: '1rem' }}>
          <i className="fas fa-arrow-left" /> Back to Inventory
        </button>

        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
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
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No locations configured. Go to the Locations tab above to add locations.</p>
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
      <div style={{ display: 'flex', gap: 0, marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0' }}>
        {['stock', 'locations'].map(tab => (
          <button key={tab} onClick={() => setSubTab(tab)}
            style={{
              padding: '10px 20px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
              border: 'none', background: 'none', color: subTab === tab ? '#2563eb' : '#64748b',
              borderBottom: subTab === tab ? '2px solid #2563eb' : '2px solid transparent',
              marginBottom: -2, transition: 'all 0.2s'
            }}>
            <i className={`fas ${tab === 'stock' ? 'fa-warehouse' : 'fa-map-marker-alt'}`} style={{ marginRight: 6 }} />
            {tab === 'stock' ? 'Stock Overview' : `Locations (${locations.length})`}
          </button>
        ))}
      </div>

      {subTab === 'locations' && (
        <div>
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title">Inventory Locations ({locations.length})</h3>
              <button className="btn btn-primary btn-sm" onClick={() => { resetLocForm(); setLocShowForm(true); }}>
                <i className="fas fa-plus" /> Add Location
              </button>
            </div>
            <div className="card-content">
              {locShowForm && (
                <form onSubmit={handleLocSubmit} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '1.25rem', marginBottom: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>{locEditingId ? 'Edit Location' : 'New Location'}</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, color: '#374151' }}>Name *</label>
                      <input type="text" value={locForm.name} onChange={e => setLocForm({ ...locForm, name: e.target.value })} placeholder="e.g. Main Warehouse" required
                        style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, color: '#374151' }}>Priority</label>
                      <input type="number" min="0" value={locForm.priority} onChange={e => setLocForm({ ...locForm, priority: parseInt(e.target.value) || 0 })}
                        style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem', boxSizing: 'border-box' }} />
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Lower = higher priority for order fulfillment</span>
                    </div>
                  </div>
                  <div style={{ marginTop: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, color: '#374151' }}>Address</label>
                    <textarea value={locForm.address} onChange={e => setLocForm({ ...locForm, address: e.target.value })} placeholder="Full address (optional)" rows={2}
                      style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ marginTop: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={locForm.is_default} onChange={e => setLocForm({ ...locForm, is_default: e.target.checked })} />
                      Set as default fulfillment location
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: '1rem' }}>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={locSaving}>
                      {locSaving ? 'Saving...' : locEditingId ? 'Update' : 'Create'}
                    </button>
                    <button type="button" className="btn btn-outline btn-sm" onClick={resetLocForm}>Cancel</button>
                  </div>
                </form>
              )}

              {locations.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-map-marker-alt" />
                  <h3>No locations yet</h3>
                  <p>Add your first inventory location to track stock across warehouses, stores, or fulfillment centers.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {locations.map(loc => (
                    <div key={loc.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '1rem 1.25rem', border: '1px solid #e2e8f0', borderRadius: 8,
                      background: loc.is_default ? '#f0f9ff' : 'white',
                      borderColor: loc.is_default ? '#93c5fd' : '#e2e8f0'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{loc.name}</span>
                          {loc.is_default ? (
                            <span style={{ fontSize: '0.65rem', background: '#2563eb', color: 'white', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>DEFAULT</span>
                          ) : null}
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Priority: {loc.priority}</span>
                        </div>
                        {loc.address ? <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>{loc.address}</div> : null}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {!loc.is_default && (
                          <button className="btn btn-outline btn-sm" onClick={() => handleLocSetDefault(loc)} title="Set as default"
                            style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                            <i className="fas fa-star" />
                          </button>
                        )}
                        <button className="btn btn-outline btn-sm" onClick={() => {
                          setLocForm({ name: loc.name, address: loc.address || '', priority: loc.priority || 0, is_default: !!loc.is_default });
                          setLocEditingId(loc.id);
                          setLocShowForm(true);
                        }} style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                          <i className="fas fa-edit" />
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={() => handleLocDelete(loc)}
                          style={{ fontSize: '0.75rem', padding: '4px 10px', color: '#dc2626', borderColor: '#fecaca' }}>
                          <i className="fas fa-trash" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card" style={{ marginTop: '1.5rem' }}>
            <div className="card-header">
              <h3 className="card-title">How Inventory Locations Work</h3>
            </div>
            <div className="card-content" style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.7 }}>
              <p><strong>1. Create locations</strong> — Add your warehouses, stores, or fulfillment centers.</p>
              <p><strong>2. Set stock per location</strong> — When adding or editing products, assign stock to each location. You can also manage stock from the Stock Overview tab.</p>
              <p><strong>3. Transfer stock</strong> — Move inventory between locations from the Stock Overview tab.</p>
              <p><strong>4. Automatic fulfillment</strong> — When an order is placed, stock is deducted from the default location first, then by priority order. The total stock shown to customers is the sum across all locations.</p>
            </div>
          </div>
        </div>
      )}

      {subTab === 'stock' && (
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

          {showTransfer && hasLocations && (
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
                                <input type="number" min="0" defaultValue={stock}
                                  style={{ width: 80, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 14 }}
                                  onBlur={e => {
                                    const val = parseInt(e.target.value);
                                    if (!isNaN(val) && val !== stock) handleStockUpdate(product.id, val);
                                  }}
                                  onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }} />
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
      )}
    </div>
  );
}
