import React, { useState, useEffect, useContext, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { SiteContext } from '../../context/SiteContext.jsx';
import { getProducts, updateProduct } from '../../services/productService.js';
import { getLocations, createLocation, updateLocation, deleteLocation, getInventoryLevels, setInventoryLevel, createTransfer, getTransfers } from '../../services/inventoryService.js';
import { formatPrice, getAdminCurrency } from '../../utils/priceFormatter.js';
import ConfirmModal from './ConfirmModal.jsx';
import { useToast } from '../../../../shared/ui/Toast.jsx';

const stepBtnStyle = {
  width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
  border: '1px solid #d1d5db', background: '#f8fafc', borderRadius: 4, cursor: 'pointer',
  fontSize: 16, fontWeight: 700, color: '#374151', lineHeight: 1, padding: 0, fontFamily: 'inherit'
};

function StockStepper({ value, onChange, min = 0 }) {
  const [localVal, setLocalVal] = useState(value);
  const committed = useRef(value);
  useEffect(() => { setLocalVal(value); committed.current = value; }, [value]);
  function commit(v) { const n = Math.max(min, parseInt(v) || 0); setLocalVal(n); if (n !== committed.current) { committed.current = n; onChange(n); } }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button type="button" style={stepBtnStyle} onClick={() => commit(localVal - 1)} disabled={localVal <= min}>−</button>
      <input type="number" min={min} value={localVal}
        onChange={e => setLocalVal(parseInt(e.target.value) || 0)}
        onBlur={() => commit(localVal)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit(localVal); } }}
        style={{ width: 60, padding: '5px 4px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 14, textAlign: 'center', boxSizing: 'border-box' }} />
      <button type="button" style={stepBtnStyle} onClick={() => commit(localVal + 1)}>+</button>
    </div>
  );
}

export default function InventorySection() {
  const { t } = useTranslation('admin');
  const { siteConfig } = useContext(SiteContext);
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [levels, setLevels] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState(null);
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
      toast.error(t('inventory.updateStockFail', { error: err.message }));
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
      toast.error(t('inventory.updateStockLevelFail', { error: err.message }));
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
    if (transferForm.from_location_id === transferForm.to_location_id) return toast.warning(t('inventory.transferDifferent'));
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
      toast.error(err.message || t('inventory.transferFailed'));
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
    if (!locForm.name.trim()) return toast.warning(t('inventory.locNameRequired'));
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
      toast.error(t('inventory.saveLocationFail', { error: err.message }));
    } finally {
      setLocSaving(false);
    }
  }

  function handleLocDelete(loc) {
    setConfirmModal({
      title: t('inventory.deleteLocationTitle'),
      message: t('inventory.deleteLocationMsg', { name: loc.name }),
      danger: true,
      onConfirm: async () => {
        try {
          await deleteLocation(siteConfig.id, loc.id);
          await loadData();
        } catch (err) {
          toast.error(err.message || t('inventory.deleteLocationFail'));
        }
      }
    });
  }

  async function handleLocSetDefault(loc) {
    try {
      await updateLocation(siteConfig.id, loc.id, { ...loc, is_default: true });
      await loadData();
    } catch (err) {
      toast.error(t('inventory.setDefaultFail', { error: err.message }));
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
          <i className="fas fa-arrow-left" /> {t('inventory.backToInventory')}
        </button>

        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 className="card-title" style={{ marginBottom: 4 }}>{selectedProduct.name}</h3>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{t('inventory.totalStock', { count: parseInt(selectedProduct.stock) || 0 })}</span>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => {
              setTransferForm({ ...transferForm, product_id: selectedProduct.id });
              setShowTransfer(true);
            }}>
              <i className="fas fa-exchange-alt" /> {t('inventory.transferStock')}
            </button>
          </div>
          <div className="card-content">
            {showTransfer && (
              <form onSubmit={handleTransfer} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '1.25rem', marginBottom: '1.5rem' }}>
                <h4 style={{ margin: '0 0 1rem', fontSize: '0.95rem' }}>{t('inventory.transferStock')}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: '0.75rem', alignItems: 'end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4, color: '#374151' }}>{t('inventory.fromLocation')}</label>
                    <select value={transferForm.from_location_id} onChange={e => setTransferForm({ ...transferForm, from_location_id: e.target.value })} required
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.85rem' }}>
                      <option value="">{t('inventory.selectPlaceholder')}</option>
                      {locations.map(l => {
                        const lvl = productLevels.find(pl => pl.location_id === l.id);
                        return <option key={l.id} value={l.id}>{l.name} ({lvl?.stock || 0})</option>;
                      })}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4, color: '#374151' }}>{t('inventory.toLocation')}</label>
                    <select value={transferForm.to_location_id} onChange={e => setTransferForm({ ...transferForm, to_location_id: e.target.value })} required
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.85rem' }}>
                      <option value="">{t('inventory.selectPlaceholder')}</option>
                      {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4, color: '#374151' }}>{t('inventory.qty')}</label>
                    <StockStepper value={transferForm.quantity} min={1} onChange={v => setTransferForm({ ...transferForm, quantity: v })} />
                  </div>
                </div>
                <div style={{ marginTop: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4, color: '#374151' }}>{t('inventory.notesOptional')}</label>
                  <input type="text" value={transferForm.notes} onChange={e => setTransferForm({ ...transferForm, notes: e.target.value })} placeholder={t('inventory.transferReasonPlaceholder')}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.85rem', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: '1rem' }}>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={transferSaving}>{transferSaving ? t('inventory.transferring') : t('inventory.transfer')}</button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowTransfer(false)}>{t('inventory.cancel')}</button>
                </div>
              </form>
            )}

            <h4 style={{ fontSize: '0.9rem', margin: '0 0 0.75rem', color: '#374151' }}>{t('inventory.stockByLocation')}</h4>
            {locations.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{t('inventory.noLocationsConfigured')}</p>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>{t('inventory.colLocation')}</th>
                      <th>{t('inventory.colStock')}</th>
                      <th>{t('inventory.colUpdate')}</th>
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
                            {loc.is_default ? <span style={{ fontSize: '0.6rem', background: '#2563eb', color: 'white', padding: '1px 6px', borderRadius: 8, marginInlineStart: 6, fontWeight: 600 }}>{t('inventory.defaultBadge')}</span> : null}
                          </td>
                          <td>{stock}</td>
                          <td>
                            <StockStepper value={stock} onChange={val => handleLevelUpdate(selectedProduct.id, loc.id, val)} />
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
                <h4 style={{ fontSize: '0.9rem', margin: '0 0 0.75rem', color: '#374151' }}>{t('inventory.transferHistory')}</h4>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>{t('inventory.colDate')}</th>
                        <th>{t('inventory.colFrom')}</th>
                        <th>{t('inventory.colTo')}</th>
                        <th>{t('inventory.qty')}</th>
                        <th>{t('inventory.colNotes')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transfers.map(t2 => (
                        <tr key={t2.id}>
                          <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{new Date(t2.created_at).toLocaleDateString()}</td>
                          <td>{t2.from_location_name || '—'}</td>
                          <td>{t2.to_location_name || '—'}</td>
                          <td>{t2.quantity}</td>
                          <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{t2.notes || '—'}</td>
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
    <>
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
            <i className={`fas ${tab === 'stock' ? 'fa-warehouse' : 'fa-map-marker-alt'}`} style={{ marginInlineEnd: 6 }} />
            {tab === 'stock' ? t('inventory.tabStockOverview') : t('inventory.tabLocationsCount', { count: locations.length })}
          </button>
        ))}
      </div>

      {subTab === 'locations' && (
        <div>
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title">{t('inventory.locationsTitle', { count: locations.length })}</h3>
              <button className="btn btn-primary btn-sm" onClick={() => { resetLocForm(); setLocShowForm(true); }}>
                <i className="fas fa-plus" /> {t('inventory.addLocation')}
              </button>
            </div>
            <div className="card-content">
              {locShowForm && (
                <form onSubmit={handleLocSubmit} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '1.25rem', marginBottom: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>{locEditingId ? t('inventory.editLocation') : t('inventory.newLocation')}</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, color: '#374151' }}>{t('inventory.nameLabel')}</label>
                      <input type="text" value={locForm.name} onChange={e => setLocForm({ ...locForm, name: e.target.value })} placeholder={t('inventory.namePlaceholder')} required
                        style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, color: '#374151' }}>{t('inventory.priorityLabel')}</label>
                      <input type="number" min="0" value={locForm.priority} onChange={e => setLocForm({ ...locForm, priority: parseInt(e.target.value) || 0 })}
                        style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem', boxSizing: 'border-box' }} />
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{t('inventory.priorityHelp')}</span>
                    </div>
                  </div>
                  <div style={{ marginTop: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, color: '#374151' }}>{t('inventory.addressLabel')}</label>
                    <textarea value={locForm.address} onChange={e => setLocForm({ ...locForm, address: e.target.value })} placeholder={t('inventory.addressPlaceholder')} rows={2}
                      style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ marginTop: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={locForm.is_default} onChange={e => setLocForm({ ...locForm, is_default: e.target.checked })} />
                      {t('inventory.setAsDefault')}
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: '1rem' }}>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={locSaving}>
                      {locSaving ? t('inventory.saving') : locEditingId ? t('inventory.update') : t('inventory.create')}
                    </button>
                    <button type="button" className="btn btn-outline btn-sm" onClick={resetLocForm}>{t('inventory.cancel')}</button>
                  </div>
                </form>
              )}

              {locations.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-map-marker-alt" />
                  <h3>{t('inventory.noLocationsTitle')}</h3>
                  <p>{t('inventory.noLocationsDesc')}</p>
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
                            <span style={{ fontSize: '0.65rem', background: '#2563eb', color: 'white', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{t('inventory.defaultBadge')}</span>
                          ) : null}
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{t('inventory.priorityValue', { value: loc.priority })}</span>
                        </div>
                        {loc.address ? <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>{loc.address}</div> : null}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {!loc.is_default && (
                          <button className="btn btn-outline btn-sm" onClick={() => handleLocSetDefault(loc)} title={t('inventory.setAsDefaultTitle')}
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
              <h3 className="card-title">{t('inventory.howItWorksTitle')}</h3>
            </div>
            <div className="card-content" style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.7 }}>
              <p><strong>{t('inventory.howStep1Label')}</strong> {t('inventory.howStep1Text')}</p>
              <p><strong>{t('inventory.howStep2Label')}</strong> {t('inventory.howStep2Text')}</p>
              <p><strong>{t('inventory.howStep3Label')}</strong> {t('inventory.howStep3Text')}</p>
              <p><strong>{t('inventory.howStep4Label')}</strong> {t('inventory.howStep4Text')}</p>
            </div>
          </div>
        </div>
      )}

      {subTab === 'stock' && (
        <div>
          <div className="inventory-summary">
            <div className={`inventory-card out-of-stock${activeTab === 'out' ? ' active' : ''}`} onClick={() => setActiveTab('out')}>
              <div className="count" style={{ color: '#dc2626' }}>{outOfStock.length}</div>
              <div className="label">{t('inventory.cardOutOfStock')}</div>
            </div>
            <div className={`inventory-card low-stock${activeTab === 'low' ? ' active' : ''}`} onClick={() => setActiveTab('low')}>
              <div className="count" style={{ color: '#f59e0b' }}>{lowStock.length}</div>
              <div className="label">{t('inventory.cardLowStock')}</div>
            </div>
            <div className={`inventory-card in-stock${activeTab === 'in' ? ' active' : ''}`} onClick={() => setActiveTab('in')}>
              <div className="count" style={{ color: '#059669' }}>{inStock.length}</div>
              <div className="label">{t('inventory.cardInStock')}</div>
            </div>
            <div className={`inventory-card total${activeTab === 'all' ? ' active' : ''}`} onClick={() => setActiveTab('all')}>
              <div className="count" style={{ color: '#2563eb' }}>{products.length}</div>
              <div className="label">{t('inventory.cardTotalProducts')}</div>
            </div>
          </div>

          {hasLocations && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
              <button className="btn btn-outline btn-sm" onClick={() => {
                setTransferForm({ product_id: '', from_location_id: '', to_location_id: '', quantity: 1, notes: '' });
                setShowTransfer(!showTransfer);
              }}>
                <i className="fas fa-exchange-alt" /> {t('inventory.quickTransfer')}
              </button>
            </div>
          )}

          {showTransfer && hasLocations && (
            <form onSubmit={handleTransfer} className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
              <h4 style={{ margin: '0 0 1rem', fontSize: '0.95rem' }}>{t('inventory.quickTransfer')}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', gap: '0.75rem', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4 }}>{t('inventory.product')}</label>
                  <select value={transferForm.product_id} onChange={e => setTransferForm({ ...transferForm, product_id: e.target.value })} required
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.85rem' }}>
                    <option value="">{t('inventory.selectProduct')}</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4 }}>{t('inventory.colFrom')}</label>
                  <select value={transferForm.from_location_id} onChange={e => setTransferForm({ ...transferForm, from_location_id: e.target.value })} required
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.85rem' }}>
                    <option value="">{t('inventory.selectPlaceholder')}</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4 }}>{t('inventory.colTo')}</label>
                  <select value={transferForm.to_location_id} onChange={e => setTransferForm({ ...transferForm, to_location_id: e.target.value })} required
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.85rem' }}>
                    <option value="">{t('inventory.selectPlaceholder')}</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4 }}>{t('inventory.qty')}</label>
                  <StockStepper value={transferForm.quantity} min={1} onChange={v => setTransferForm({ ...transferForm, quantity: v })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary btn-sm" disabled={transferSaving}>{transferSaving ? t('inventory.transferring') : t('inventory.transfer')}</button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowTransfer(false)}>{t('inventory.cancel')}</button>
              </div>
            </form>
          )}

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                {activeTab === 'out' ? t('inventory.headingOutOfStock', { count: displayed.length }) : activeTab === 'low' ? t('inventory.headingLowStock', { count: displayed.length }) : activeTab === 'in' ? t('inventory.headingInStock', { count: displayed.length }) : t('inventory.headingAllProducts', { count: displayed.length })}
              </h3>
            </div>
            <div className="card-content">
              {displayed.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-check-circle" />
                  <h3>{t('inventory.noProductsInCategory')}</h3>
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>{t('inventory.colProduct')}</th>
                        <th>{t('inventory.colPrice')}</th>
                        <th>{t('inventory.colTotalStock')}</th>
                        {hasLocations && <th>{t('inventory.colLocations')}</th>}
                        <th>{t('inventory.colStatus')}</th>
                        {!hasLocations && <th>{t('inventory.colUpdateStock')}</th>}
                        {hasLocations && <th>{t('inventory.colDetails')}</th>}
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
                                  : <span style={{ color: '#e09030', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => handleShowProductLevels(product)}>{t('inventory.notAssigned')}</span>}
                              </td>
                            )}
                            <td>
                              {stock === 0 && <span className="status-badge status-cancelled">{t('inventory.cardOutOfStock')}</span>}
                              {stock > 0 && stock <= 3 && <span className="status-badge status-new">{t('inventory.cardLowStock')}</span>}
                              {stock > 3 && <span className="status-badge status-confirmed">{t('inventory.cardInStock')}</span>}
                            </td>
                            {!hasLocations && (
                              <td>
                                <StockStepper value={stock} onChange={val => handleStockUpdate(product.id, val)} />
                              </td>
                            )}
                            {hasLocations && (
                              <td>
                                <button className="btn btn-outline btn-sm" style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                                  onClick={() => handleShowProductLevels(product)}>
                                  <i className="fas fa-layer-group" /> {t('inventory.manage')}
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
