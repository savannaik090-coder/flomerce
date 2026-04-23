import React, { useState, useEffect, useContext } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { SiteContext } from '../../context/SiteContext.jsx';
import { getLocations, createLocation, updateLocation, deleteLocation } from '../../services/inventoryService.js';
import ConfirmModal from './ConfirmModal.jsx';
import AlertModal, { isPlanError } from '../../../../shared/ui/AlertModal.jsx';
import { useToast } from '../../../../shared/ui/Toast.jsx';

export default function LocationsSection() {
  const { t } = useTranslation('admin');
  const { siteConfig } = useContext(SiteContext);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', address: '', priority: 0, is_default: false });
  const [saving, setSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const [planLimitMsg, setPlanLimitMsg] = useState(null);

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
    if (!form.name.trim()) return toast.warning(t('locationsSection.nameRequired'));
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
      if (isPlanError(err)) {
        setPlanLimitMsg(err.message);
      } else {
        toast.error(t('locationsSection.failedSave', { error: err.message }));
      }
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(loc) {
    setConfirmModal({
      title: t('locationsSection.deleteTitle'),
      message: t('locationsSection.deleteConfirm', { name: loc.name }),
      danger: true,
      onConfirm: async () => {
        try {
          await deleteLocation(siteConfig.id, loc.id);
          await loadLocations();
        } catch (err) {
          toast.error(err.message || t('locationsSection.failedDelete'));
        }
      }
    });
  }

  async function handleSetDefault(loc) {
    try {
      await updateLocation(siteConfig.id, loc.id, { ...loc, is_default: true });
      await loadLocations();
    } catch (err) {
      toast.error(t('locationsSection.failedSetDefault', { error: err.message }));
    }
  }

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  return (
    <>
    <div>
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title">{t('locationsSection.title', { count: locations.length })}</h3>
          <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowForm(true); }}>
            <i className="fas fa-plus" /> {t('locationsSection.addLocation')}
          </button>
        </div>
        <div className="card-content">
          {showForm && (
            <form onSubmit={handleSubmit} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '1.25rem', marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>{editingId ? t('locationsSection.editLocation') : t('locationsSection.newLocation')}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, color: '#374151' }}>{t('locationsSection.nameLabel')}</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t('locationsSection.namePh')} required
                    style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, color: '#374151' }}>{t('locationsSection.priorityLabel')}</label>
                  <input type="number" min="0" value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem', boxSizing: 'border-box' }} />
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{t('locationsSection.priorityHelp')}</span>
                </div>
              </div>
              <div style={{ marginTop: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, color: '#374151' }}>{t('locationsSection.addressLabel')}</label>
                <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder={t('locationsSection.addressPh')} rows={2}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.is_default} onChange={e => setForm({ ...form, is_default: e.target.checked })} />
                  {t('locationsSection.defaultCheckbox')}
                </label>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                  {saving ? t('locationsSection.saving') : editingId ? t('locationsSection.update') : t('locationsSection.create')}
                </button>
                <button type="button" className="btn btn-outline btn-sm" onClick={resetForm}>{t('locationsSection.cancel')}</button>
              </div>
            </form>
          )}

          {locations.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-map-marker-alt" />
              <h3>{t('locationsSection.emptyTitle')}</h3>
              <p>{t('locationsSection.emptyDesc')}</p>
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
                        <span style={{ fontSize: '0.65rem', background: '#2563eb', color: 'white', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{t('locationsSection.defaultBadge')}</span>
                      ) : null}
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{t('locationsSection.priorityBadge', { value: loc.priority })}</span>
                    </div>
                    {loc.address ? <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>{loc.address}</div> : null}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {!loc.is_default && (
                      <button className="btn btn-outline btn-sm" onClick={() => handleSetDefault(loc)} title={t('locationsSection.setDefaultTitle')}
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
          <h3 className="card-title">{t('locationsSection.howItWorksTitle')}</h3>
        </div>
        <div className="card-content" style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.7 }}>
          <p><Trans i18nKey="locationsSection.howItWorks1" t={t} components={{ b: <strong /> }} /></p>
          <p><Trans i18nKey="locationsSection.howItWorks2" t={t} components={{ b: <strong /> }} /></p>
          <p><Trans i18nKey="locationsSection.howItWorks3" t={t} components={{ b: <strong /> }} /></p>
          <p><Trans i18nKey="locationsSection.howItWorks4" t={t} components={{ b: <strong /> }} /></p>
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
      <AlertModal
        open={!!planLimitMsg}
        variant="upgrade"
        title={t('locationsSection.upgradeTitle')}
        message={planLimitMsg}
        onClose={() => setPlanLimitMsg(null)}
        secondaryAction={{ label: t('locationsSection.maybeLater') }}
        primaryAction={{
          label: t('locationsSection.upgradePlan'),
          icon: 'fa-arrow-up',
          variant: 'upgrade',
          href: 'https://flomerce.com/dashboard/billing',
          target: '_blank',
        }}
      />
    </>
  );
}
