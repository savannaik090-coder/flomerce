import React, { useState, useEffect, useContext, useRef } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { formatPrice, getCurrencySymbol, getAdminCurrency } from '../../utils/priceFormatter.js';
import SaveBar from './SaveBar.jsx';
import { API_BASE } from '../../config.js';
import { useDirtyTracker } from '../../hooks/useDirtyTracker.js';
import { CHECKOUT_CLASSIC_STYLE_DEFAULTS } from '../../defaults/index.js';
import AdminColorField from './style/AdminColorField.jsx';
import AdminFontPicker from './style/AdminFontPicker.jsx';

const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' };
const labelStyle = { display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#334155' };

const STYLE_FIELDS = [
  { kind: 'color', key: 'pageBg',        label: 'Page Background' },
  { kind: 'color', key: 'cardBg',        label: 'Card / Form Background' },
  { kind: 'color', key: 'borderColor',   label: 'Border Color' },
  { kind: 'color', key: 'accentColor',   label: 'Accent Color (active step, input focus, checkboxes)' },
  { kind: 'color', key: 'accentAltColor',label: 'Accent Alt Color (step done, gold highlights)' },
  { kind: 'color', key: 'textDark',      label: 'Dark Text Color' },
  { kind: 'color', key: 'textBody',      label: 'Body Text Color' },
  { kind: 'color', key: 'textMuted',     label: 'Muted Text Color' },
  { kind: 'color', key: 'btnBg',         label: 'Button Background' },
  { kind: 'color', key: 'btnText',       label: 'Button Text Color' },
  { kind: 'font',  key: 'headingFont',   label: 'Heading Font (card titles, order total)' },
  { kind: 'font',  key: 'bodyFont',      label: 'Body Font (labels, fields, descriptions)' },
];

function newCoupon() {
  return { id: Date.now().toString(), code: '', type: 'percent', value: '', minOrder: '', expiryDate: '', active: true };
}

export default function CheckoutEditor({ onSaved, onPreviewUpdate }) {
  const { siteConfig } = useContext(SiteContext);
  const [activeTab, setActiveTab] = useState('coupons');
  const [coupons, setCoupons] = useState([]);
  const [classicStyle, setClassicStyle] = useState({});
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedCoupon, setExpandedCoupon] = useState(null);
  const hasLoadedRef = useRef(false);

  const dirty = useDirtyTracker({ coupons, classicStyle });

  useEffect(() => {
    if (siteConfig?.id) loadSettings();
  }, [siteConfig?.id]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    if (onPreviewUpdate) {
      onPreviewUpdate({ coupons, checkoutPage: { classicStyle } });
    }
  }, [coupons, classicStyle]);

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
        const cVal = Array.isArray(settings.coupons) ? settings.coupons : [];
        const checkoutPage = settings.checkoutPage || {};
        const cs = (checkoutPage.classicStyle && typeof checkoutPage.classicStyle === 'object') ? checkoutPage.classicStyle : {};
        setCoupons(cVal);
        setClassicStyle(cs);
        dirty.baseline({ coupons: cVal, classicStyle: cs });
      }
    } catch (e) {
      console.error('Failed to load checkout settings:', e);
    } finally {
      setLoading(false);
      setTimeout(() => { hasLoadedRef.current = true; }, 0);
    }
  }

  async function handleSave(e) {
    if (e && e.preventDefault) e.preventDefault();
    setSaving(true);
    setStatus('');
    const cleaned = coupons
      .filter(c => c.code.trim())
      .map(c => ({ ...c, code: c.code.trim().toUpperCase(), value: parseFloat(c.value) || 0, minOrder: parseFloat(c.minOrder) || 0 }));
    try {
      const token = sessionStorage.getItem('site_admin_token');
      const response = await fetch(`${API_BASE}/api/sites/${siteConfig.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': token ? `SiteAdmin ${token}` : '' },
        body: JSON.stringify({
          settings: {
            coupons: cleaned,
            checkoutPage: { classicStyle },
          },
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setStatus('success');
        setCoupons(cleaned);
        dirty.markSaved({ coupons: cleaned, classicStyle });
        if (onSaved) onSaved();
      } else {
        setStatus('error:' + (result.error || "Unknown error"));
      }
    } catch (e) {
      setStatus('error:' + e.message);
    } finally {
      setSaving(false);
    }
  }

  function addCoupon() {
    const c = newCoupon();
    setCoupons(prev => [...prev, c]);
    setExpandedCoupon(c.id);
  }

  function updateCoupon(id, field, value) {
    setCoupons(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  }

  function deleteCoupon(id) {
    setCoupons(prev => prev.filter(c => c.id !== id));
    if (expandedCoupon === id) setExpandedCoupon(null);
  }

  function updateStyleField(key, value) {
    setClassicStyle(prev => {
      const next = { ...prev };
      if (value === '' || value === null || value === undefined) delete next[key];
      else next[key] = value;
      return next;
    });
  }

  function resetAllStyles() {
    setClassicStyle({});
  }

  const hasAnyStyleOverride = STYLE_FIELDS.some(f => classicStyle[f.key]);

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  const sym = getCurrencySymbol(getAdminCurrency(siteConfig));

  return (
    <div style={{ maxWidth: 700 }}>
      <SaveBar topBar saving={saving} hasChanges={dirty.hasChanges} onSave={(e) => handleSave(e || { preventDefault: () => {} })} />
      <form onSubmit={handleSave}>

        <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: 20, gap: 0 }}>
          {[
            { id: 'coupons',    label: 'Coupon Codes',  icon: 'fa-ticket-alt' },
            { id: 'appearance', label: 'Appearance',    icon: 'fa-palette' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 20px', border: 'none', background: 'transparent',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                color: activeTab === tab.id ? '#2563eb' : '#64748b',
                borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
                marginBottom: -2,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <i className={`fas ${tab.icon}`} style={{ fontSize: 11 }} />
              {tab.label}
            </button>
          ))}
        </div>

        {status === 'success' && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            <i className="fas fa-check-circle" style={{ marginInlineEnd: 8 }} />Saved successfully.
          </div>
        )}
        {status.startsWith('error:') && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            <i className="fas fa-circle-exclamation" style={{ marginInlineEnd: 8 }} />{status.slice(6)}
          </div>
        )}

        {activeTab === 'coupons' && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 className="card-title">Coupon Codes</h3>
              <button
                type="button"
                onClick={addCoupon}
                style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <i className="fas fa-plus" style={{ fontSize: 11 }} /> Add Coupon
              </button>
            </div>
            <div className="card-content">
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                Create discount coupons customers can apply at checkout. Codes are case-insensitive.
              </p>

              {coupons.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: 8 }}>
                  <i className="fas fa-ticket-alt" style={{ fontSize: 28, marginBottom: 10, display: 'block' }} />
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>No coupon codes yet</div>
                  <div style={{ fontSize: 13 }}>Click "Add Coupon" to create your first discount code</div>
                </div>
              )}

              {coupons.map((coupon, idx) => (
                <div key={coupon.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 12, overflow: 'hidden' }}>
                  <div
                    onClick={() => setExpandedCoupon(expandedCoupon === coupon.id ? null : coupon.id)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', cursor: 'pointer', background: expandedCoupon === coupon.id ? '#f1f5f9' : '#fff', userSelect: 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <label onClick={e => e.stopPropagation()} style={{ position: 'relative', display: 'inline-block', width: 36, height: 20, flexShrink: 0 }}>
                        <input type="checkbox" checked={coupon.active} onChange={e => updateCoupon(coupon.id, 'active', e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                        <span style={{ position: 'absolute', cursor: 'pointer', inset: 0, borderRadius: 20, background: coupon.active ? '#22c55e' : '#cbd5e1', transition: '0.3s' }}>
                          <span style={{ position: 'absolute', left: coupon.active ? 18 : 2, top: 2, width: 16, height: 16, background: '#fff', borderRadius: '50%', transition: '0.3s' }} />
                        </span>
                      </label>
                      <div>
                        <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 14, color: coupon.code ? '#1e293b' : '#94a3b8' }}>
                          {coupon.code || `Coupon ${idx + 1}`}
                        </span>
                        {coupon.value && (
                          <span style={{ marginInlineStart: 10, fontSize: 12, color: '#64748b' }}>
                            {coupon.type === 'percent' ? `${coupon.value}% off` : `${sym}${coupon.value} off`}
                            {coupon.minOrder ? ` ${`(min ${sym}${coupon.minOrder})`}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); deleteCoupon(coupon.id); }}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px 6px', fontSize: 14 }}
                        title="Delete coupon"
                      >
                        <i className="fas fa-trash-alt" />
                      </button>
                      <i className={`fas fa-chevron-${expandedCoupon === coupon.id ? 'up' : 'down'}`} style={{ color: '#94a3b8', fontSize: 12 }} />
                    </div>
                  </div>

                  {expandedCoupon === coupon.id && (
                    <div style={{ padding: '16px', borderTop: '1px solid #e2e8f0', background: '#fafafa' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div>
                          <label style={labelStyle}>Coupon Code *</label>
                          <input
                            type="text"
                            value={coupon.code}
                            onChange={e => updateCoupon(coupon.id, 'code', e.target.value.toUpperCase())}
                            placeholder="e.g. SAVE10"
                            style={{ ...inputStyle, fontFamily: 'monospace', fontWeight: 600, letterSpacing: 1 }}
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>Discount Type</label>
                          <select value={coupon.type} onChange={e => updateCoupon(coupon.id, 'type', e.target.value)} style={inputStyle}>
                            <option value="percent">Percentage (%)</option>
                            <option value="flat">{`Flat Amount (${sym})`}</option>
                          </select>
                        </div>
                        <div>
                          <label style={labelStyle}>Discount Value *</label>
                          <input
                            type="number"
                            min="0"
                            max={coupon.type === 'percent' ? 100 : undefined}
                            value={coupon.value}
                            onChange={e => updateCoupon(coupon.id, 'value', e.target.value)}
                            placeholder={coupon.type === 'percent' ? "e.g. 10" : "e.g. 50"}
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>{`Minimum Order Amount (${sym})`}</label>
                          <input
                            type="number"
                            min="0"
                            value={coupon.minOrder}
                            onChange={e => updateCoupon(coupon.id, 'minOrder', e.target.value)}
                            placeholder="e.g. 500 (optional)"
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>Expiry Date (optional)</label>
                          <input
                            type="date"
                            value={coupon.expiryDate || ''}
                            onChange={e => updateCoupon(coupon.id, 'expiryDate', e.target.value)}
                            style={inputStyle}
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                          <div style={{ padding: '10px 14px', background: coupon.active ? '#f0fdf4' : '#fef2f2', borderRadius: 6, border: `1px solid ${coupon.active ? '#bbf7d0' : '#fecaca'}`, fontSize: 13, fontWeight: 600, color: coupon.active ? '#15803d' : '#dc2626', width: '100%', textAlign: 'center' }}>
                            {coupon.active ? "✓ Active — customers can use this code" : "✗ Disabled — code will not work"}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'appearance' && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 className="card-title" style={{ margin: 0 }}>Classic Checkout Appearance</h3>
                <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>
                  Applies only to the Classic template checkout page.
                </p>
              </div>
              {hasAnyStyleOverride && (
                <button
                  type="button"
                  onClick={resetAllStyles}
                  style={{
                    background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                    fontSize: 12, color: '#475569', textDecoration: 'underline', fontFamily: 'inherit',
                  }}
                >
                  Reset all to default
                </button>
              )}
            </div>
            <div className="card-content">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {STYLE_FIELDS.map(f =>
                  f.kind === 'color' ? (
                    <AdminColorField
                      key={f.key}
                      label={f.label}
                      value={classicStyle[f.key] || ''}
                      fallback={CHECKOUT_CLASSIC_STYLE_DEFAULTS[f.key]}
                      onChange={v => updateStyleField(f.key, v)}
                    />
                  ) : (
                    <AdminFontPicker
                      key={f.key}
                      label={f.label}
                      value={classicStyle[f.key] || ''}
                      fallback={CHECKOUT_CLASSIC_STYLE_DEFAULTS[f.key]}
                      onChange={v => updateStyleField(f.key, v)}
                    />
                  )
                )}
              </div>
            </div>
          </div>
        )}

        <SaveBar saving={saving} hasChanges={dirty.hasChanges} onSave={(e) => handleSave(e || { preventDefault: () => {} })} />
      </form>
    </div>
  );
}
