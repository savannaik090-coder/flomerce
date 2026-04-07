import React, { useState, useEffect, useContext } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { getLocations, createLocation, updateLocation, deleteLocation } from '../../services/inventoryService.js';
import ConfirmModal from './ConfirmModal.jsx';

export default function LocationsSection() {
  const { siteConfig } = useContext(SiteContext);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', address: '', priority: 0, is_default: false });
  const [saving, setSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);

  useEffect(() => {
    if (siteConfig?.id) loadLocations();
  }, [siteConfig?.id]);

  async function loadLocations() {
    setLoading(true);
    try {
      const res = await getLocations(siteConfig.id);
      setLocations(res.data || []);
    } catch (err) {
      console.error('Error loading locations:', err);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm({ name: '', address: '', priority: 0, is_default: false });
    setEditingId(null);
    setShowForm(false);
  }

  function handleEdit(loc) {
    setForm({ name: loc.name, address: loc.address || '', priority: loc.priority || 0, is_default: !!loc.is_default });
    setEditingId(loc.id);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return alert('Location name is required');
    setSaving(true);
    try {
      if (editingId) {
        await updateLocation(siteConfig.id, editingId, form);
      } else {
        await createLocation(siteConfig.id, form);
      }
      resetForm();
      await loadLocations();
    } catch (err) {
      alert('Failed to save location: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(loc) {
    setConfirmModal({
      title: 'Delete Location',
      message: `Delete location "${loc.name}"? Stock must be zero or transferred first.`,
      danger: true,
      onConfirm: async () => {
        try {
          await deleteLocation(siteConfig.id, loc.id);
          await loadLocations();
        } catch (err) {
          alert(err.message || 'Failed to delete location');
        }
      }
    });
  }

  async function handleSetDefault(loc) {
    try {
      await updateLocation(siteConfig.id, loc.id, { ...loc, is_default: true });
      await loadLocations();
    } catch (err) {
      alert('Failed to set default: ' + err.message);
    }
  }

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  return (
    <>
    <div>
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title">Inventory Locations ({locations.length})</h3>
          <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowForm(true); }}>
            <i className="fas fa-plus" /> Add Location
          </button>
        </div>
        <div className="card-content">
          {showForm && (
            <form onSubmit={handleSubmit} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '1.25rem', marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>{editingId ? 'Edit Location' : 'New Location'}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, color: '#374151' }}>Name *</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Main Warehouse" required
                    style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, color: '#374151' }}>Priority</label>
                  <input type="number" min="0" value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem', boxSizing: 'border-box' }} />
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Lower = higher priority for order fulfillment</span>
                </div>
              </div>
              <div style={{ marginTop: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, color: '#374151' }}>Address</label>
                <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Full address (optional)" rows={2}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.is_default} onChange={e => setForm({ ...form, is_default: e.target.checked })} />
                  Set as default fulfillment location
                </label>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
                <button type="button" className="btn btn-outline btn-sm" onClick={resetForm}>Cancel</button>
              </div>
            </form>
          )}

          {locations.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-map-marker-alt" />
              <h3>No locations yet</h3>
              <p>Add your first inventory location to track stock across multiple places.</p>
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
                      <button className="btn btn-outline btn-sm" onClick={() => handleSetDefault(loc)} title="Set as default"
                        style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                        <i className="fas fa-star" />
                      </button>
                    )}
                    <button className="btn btn-outline btn-sm" onClick={() => handleEdit(loc)} style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                      <i className="fas fa-edit" />
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => handleDelete(loc)}
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
          <p><strong>2. Set stock per location</strong> — Go to the Inventory tab to assign stock for each product at each location.</p>
          <p><strong>3. Transfer stock</strong> — Move inventory between locations from the Inventory tab.</p>
          <p><strong>4. Automatic fulfillment</strong> — When an order is placed, stock is deducted from the default location first, then by priority order. The total stock shown to customers is the sum across all locations.</p>
        </div>
      </div>
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