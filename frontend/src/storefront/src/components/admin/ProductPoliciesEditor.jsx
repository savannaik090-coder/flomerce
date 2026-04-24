import React, { useState, useEffect, useContext, useRef } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import SectionToggle from './SectionToggle.jsx';
import SaveBar from './SaveBar.jsx';

import { getPolicies, getPolicyPlaceholders } from '../../defaults/index.js';
import { API_BASE } from '../../config.js';

export default function ProductPoliciesEditor({ onSaved, onPreviewUpdate }) {
  const { siteConfig } = useContext(SiteContext);
  const [showSection, setShowSection] = useState(true);
  const [fields, setFields] = useState({
    shippingRegions: '',
    shippingCharges: '',
    shippingDeliveryTime: '',
    shippingTracking: '',
    returnPolicy: '',
    returnReplacements: '',
    returnMandatory: '',
    careGuideCleaning: '',
    careGuideWashing: '',
    careGuideMaintenance: '',
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const hasLoadedRef = useRef(false);
  const serverValuesRef = useRef(null);

  const placeholders = getPolicyPlaceholders(siteConfig?.category);

  useEffect(() => {
    if (siteConfig?.id) loadSettings();
  }, [siteConfig?.id]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    const current = JSON.stringify({ fields, showSection });
    setHasChanges(current !== serverValuesRef.current);
    if (onPreviewUpdate) onPreviewUpdate({ ...fields, showProductPolicies: showSection });
  }, [fields, showSection]);

  async function loadSettings() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/site?subdomain=${encodeURIComponent(siteConfig.subdomain)}`);
      const result = await response.json();
      if (result.success && result.data) {
        let settings = result.data.settings || {};
        if (typeof settings === 'string') {
          try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
        }
        const fVal = {
          shippingRegions: settings.shippingRegions || '',
          shippingCharges: settings.shippingCharges || '',
          shippingDeliveryTime: settings.shippingDeliveryTime || '',
          shippingTracking: settings.shippingTracking || '',
          returnPolicy: settings.returnPolicy || '',
          returnReplacements: settings.returnReplacements || '',
          returnMandatory: settings.returnMandatory || '',
          careGuideCleaning: settings.careGuideCleaning || '',
          careGuideWashing: settings.careGuideWashing || '',
          careGuideMaintenance: settings.careGuideMaintenance || '',
        };
        const ssVal = settings.showProductPolicies !== false;
        setFields(fVal);
        setShowSection(ssVal);
        serverValuesRef.current = JSON.stringify({ fields: fVal, showSection: ssVal });
      }
    } catch (e) {
      console.error('Failed to load product policies settings:', e);
    } finally {
      setLoading(false);
      setTimeout(() => { hasLoadedRef.current = true; }, 0);
    }
  }

  function handleChange(key, value) {
    setFields(prev => ({ ...prev, [key]: value }));
  }

  function handleLoadDefaults() {
    const defaults = getPolicies(siteConfig?.category);
    setFields(defaults);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setStatus('');
    try {
      const token = sessionStorage.getItem('site_admin_token');
      const response = await fetch(`${API_BASE}/api/sites/${siteConfig.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `SiteAdmin ${token}` : '',
        },
        body: JSON.stringify({ settings: { ...fields, showProductPolicies: showSection } }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setStatus('success');
        serverValuesRef.current = JSON.stringify({ fields, showSection });
        setHasChanges(false);
        if (onSaved) onSaved();
      } else {
        setStatus('error:' + (result.error || 'Unknown error'));
      }
    } catch (e) {
      setStatus('error:' + e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    fontSize: 14,
    fontFamily: 'inherit',
    color: '#334155',
    background: '#fff',
    resize: 'vertical',
    minHeight: 42,
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#475569',
    marginBottom: 6,
  };

  const fieldGroupStyle = {
    marginBottom: 16,
  };

  return (
    <div style={{ maxWidth: 700 }}>
      <SaveBar topBar saving={saving} hasChanges={hasChanges} onSave={(e) => handleSave(e || { preventDefault: () => {} })} />
      <form onSubmit={handleSave}>
        <SectionToggle
          enabled={showSection}
          onChange={setShowSection}
          label="Show Product Policies"
          description="Toggle shipping, returns, and care guide sections on product pages"
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, color: '#1e293b' }}>Product Policies</h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
              These details appear as expandable sections on every product page
            </p>
          </div>
          <button
            type="button"
            onClick={handleLoadDefaults}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#475569',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
            }}
          >
            <i className="fas fa-magic" style={{ marginInlineEnd: 6 }} />
            Load Defaults
          </button>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">
              <i className="fas fa-truck" style={{ marginInlineEnd: 8, color: '#64748b' }} />
              Shipping & Delivery Details
            </h3>
          </div>
          <div className="card-body">
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Regions</label>
              <textarea
                value={fields.shippingRegions}
                onChange={(e) => handleChange('shippingRegions', e.target.value)}
                placeholder={placeholders.shippingRegions}
                style={inputStyle}
                rows={2}
              />
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Shipping Charges</label>
              <textarea
                value={fields.shippingCharges}
                onChange={(e) => handleChange('shippingCharges', e.target.value)}
                placeholder={placeholders.shippingCharges}
                style={inputStyle}
                rows={2}
              />
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Delivery Time</label>
              <textarea
                value={fields.shippingDeliveryTime}
                onChange={(e) => handleChange('shippingDeliveryTime', e.target.value)}
                placeholder={placeholders.shippingDeliveryTime}
                style={inputStyle}
                rows={2}
              />
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Tracking</label>
              <textarea
                value={fields.shippingTracking}
                onChange={(e) => handleChange('shippingTracking', e.target.value)}
                placeholder={placeholders.shippingTracking}
                style={inputStyle}
                rows={2}
              />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">
              <i className="fas fa-exchange-alt" style={{ marginInlineEnd: 8, color: '#64748b' }} />
              Return & Exchange
            </h3>
          </div>
          <div className="card-body">
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Policy</label>
              <textarea
                value={fields.returnPolicy}
                onChange={(e) => handleChange('returnPolicy', e.target.value)}
                placeholder={placeholders.returnPolicy}
                style={inputStyle}
                rows={2}
              />
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Replacements</label>
              <textarea
                value={fields.returnReplacements}
                onChange={(e) => handleChange('returnReplacements', e.target.value)}
                placeholder={placeholders.returnReplacements}
                style={inputStyle}
                rows={2}
              />
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Mandatory Requirement</label>
              <textarea
                value={fields.returnMandatory}
                onChange={(e) => handleChange('returnMandatory', e.target.value)}
                placeholder={placeholders.returnMandatory}
                style={inputStyle}
                rows={2}
              />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">
              <i className="fas fa-hand-holding-heart" style={{ marginInlineEnd: 8, color: '#64748b' }} />
              Care Guide
            </h3>
          </div>
          <div className="card-body">
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Cleaning</label>
              <textarea
                value={fields.careGuideCleaning}
                onChange={(e) => handleChange('careGuideCleaning', e.target.value)}
                placeholder={placeholders.careGuideCleaning}
                style={inputStyle}
                rows={2}
              />
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Washing</label>
              <textarea
                value={fields.careGuideWashing}
                onChange={(e) => handleChange('careGuideWashing', e.target.value)}
                placeholder={placeholders.careGuideWashing}
                style={inputStyle}
                rows={2}
              />
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Maintenance</label>
              <textarea
                value={fields.careGuideMaintenance}
                onChange={(e) => handleChange('careGuideMaintenance', e.target.value)}
                placeholder={placeholders.careGuideMaintenance}
                style={inputStyle}
                rows={2}
              />
            </div>
          </div>
        </div>

        <SaveBar saving={saving} hasChanges={hasChanges} onSave={(e) => handleSave(e || { preventDefault: () => {} })} />
      </form>
    </div>
  );
}
