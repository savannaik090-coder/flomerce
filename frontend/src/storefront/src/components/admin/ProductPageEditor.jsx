import React, { useState, useEffect, useContext, useRef } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import SaveBar from './SaveBar.jsx';
import { API_BASE } from '../../config.js';
import { useDirtyTracker } from '../../hooks/useDirtyTracker.js';

const PDP_SETTING_KEYS = [
  'pdpShowMrp',
  'pdpShowFeaturedBadge',
  'pdpShowLowStockCue',
  'pdpDefaultLowStockThreshold',
  'pdpShowTrustBadges',
  'pdpTrustBadge1Label',
  'pdpTrustBadge2Label',
  'pdpTrustBadge3Label',
  'pdpShowTags',
  'pdpShowSpecsPanel',
  'pdpShowRelatedProducts',
  'pdpRelatedProductsHeading',
];

const DEFAULTS = {
  pdpShowMrp: true,
  pdpShowFeaturedBadge: true,
  pdpShowLowStockCue: true,
  pdpDefaultLowStockThreshold: 3,
  pdpShowTrustBadges: true,
  pdpTrustBadge1Label: 'Free shipping over ₹999',
  pdpTrustBadge2Label: 'Easy 10-day returns',
  pdpTrustBadge3Label: 'Secure checkout',
  pdpShowTags: false,
  pdpShowSpecsPanel: true,
  pdpShowRelatedProducts: true,
  pdpRelatedProductsHeading: 'You may also like',
};

function readFromSettings(settings) {
  const out = {};
  for (const key of PDP_SETTING_KEYS) {
    if (settings[key] === undefined || settings[key] === null) {
      out[key] = DEFAULTS[key];
    } else if (typeof DEFAULTS[key] === 'boolean') {
      out[key] = settings[key] === true || settings[key] === 1 || settings[key] === '1' || settings[key] === 'true';
    } else if (typeof DEFAULTS[key] === 'number') {
      const n = Number(settings[key]);
      out[key] = Number.isFinite(n) && n >= 0 ? n : DEFAULTS[key];
    } else {
      out[key] = String(settings[key]);
    }
  }
  return out;
}

export default function ProductPageEditor({ onSaved, onPreviewUpdate }) {
  const { siteConfig } = useContext(SiteContext);
  const [fields, setFields] = useState(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);

  const dirty = useDirtyTracker({ fields });

  useEffect(() => {
    if (siteConfig?.id) loadSettings();
  }, [siteConfig?.id]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    if (onPreviewUpdate) onPreviewUpdate({ ...fields });
  }, [fields]);

  async function loadSettings() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/site?subdomain=${encodeURIComponent(siteConfig.subdomain)}`);
      const result = await response.json();
      if (result.success && result.data) {
        let settings = result.data.settings || {};
        if (typeof settings === 'string') {
          try { settings = JSON.parse(settings); } catch { settings = {}; }
        }
        const fVal = readFromSettings(settings);
        setFields(fVal);
        dirty.baseline({ fields: fVal });
      }
    } catch (e) {
      console.error('Failed to load product page settings:', e);
    } finally {
      setLoading(false);
      setTimeout(() => { hasLoadedRef.current = true; }, 0);
    }
  }

  function update(key, value) {
    setFields(prev => ({ ...prev, [key]: value }));
  }

  function handleResetDefaults() {
    setFields(DEFAULTS);
  }

  async function handleSave(e) {
    if (e && e.preventDefault) e.preventDefault();
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
        body: JSON.stringify({ settings: { ...fields } }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setStatus('success');
        dirty.markSaved();
        if (onSaved) onSaved();
      } else {
        setStatus('error:' + (result.error || 'Unknown error'));
      }
    } catch (e2) {
      setStatus('error:' + e2.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 };
  const helpStyle = { fontSize: 11, color: '#64748b', margin: '4px 0 0' };
  const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff' };

  function ToggleRow({ k, title, description }) {
    const inputId = `pdp-toggle-${k}`;
    const descId = description ? `${inputId}-desc` : undefined;
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
        <label htmlFor={inputId} style={{ flex: 1, cursor: 'pointer' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{title}</div>
          {description && <div id={descId} style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{description}</div>}
        </label>
        <span style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, flexShrink: 0 }}>
          <input
            id={inputId}
            type="checkbox"
            role="switch"
            aria-checked={!!fields[k]}
            aria-describedby={descId}
            checked={!!fields[k]}
            onChange={e => update(k, e.target.checked)}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              margin: 0, opacity: 0, cursor: 'pointer', zIndex: 1,
            }}
          />
          <span aria-hidden="true" style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: fields[k] ? '#2563eb' : '#cbd5e1',
            borderRadius: 24, transition: 'background 0.2s',
            pointerEvents: 'none',
          }}>
            <span style={{
              position: 'absolute', top: 2, left: fields[k] ? 22 : 2,
              width: 20, height: 20, background: '#fff', borderRadius: '50%',
              transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </span>
        </span>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <SaveBar topBar saving={saving} hasChanges={dirty.hasChanges} onSave={() => handleSave()} />
      <form onSubmit={handleSave}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, color: '#1e293b' }}>Product Page</h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
              Control what shows on every product page across your store.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetDefaults}
            style={{
              padding: '8px 16px', borderRadius: 6, border: '1px solid #e2e8f0',
              background: '#f8fafc', color: '#475569', fontSize: 13, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}
          >
            <i className="fas fa-rotate-left" style={{ marginInlineEnd: 6 }} />
            Reset Defaults
          </button>
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

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h3 className="card-title"><i className="fas fa-tag" style={{ marginInlineEnd: 8, color: '#64748b' }} />Pricing &amp; Highlights</h3></div>
          <div className="card-body" style={{ padding: '0 16px' }}>
            <ToggleRow
              k="pdpShowMrp"
              title="Show MRP / strike-through price"
              description="When you set a 'Compare-at price' on a product, show the strike-through MRP and the auto-calculated discount badge."
            />
            <ToggleRow
              k="pdpShowFeaturedBadge"
              title="Show 'Featured' badge"
              description="Highlight products marked as featured with a small badge on the product page."
            />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h3 className="card-title"><i className="fas fa-bolt" style={{ marginInlineEnd: 8, color: '#64748b' }} />Urgency &amp; Stock</h3></div>
          <div className="card-body" style={{ padding: '0 16px' }}>
            <ToggleRow
              k="pdpShowLowStockCue"
              title="Show low-stock urgency cue"
              description="Display 'Only X left' when stock is at or below the threshold."
            />
            {fields.pdpShowLowStockCue && (
              <div style={{ padding: '12px 0 16px', borderBottom: '1px solid #f1f5f9' }}>
                <label style={labelStyle}>Default low-stock threshold</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={fields.pdpDefaultLowStockThreshold}
                    onChange={e => {
                      const v = e.target.value;
                      update('pdpDefaultLowStockThreshold', v === '' ? 0 : Math.max(0, parseInt(v) || 0));
                    }}
                    style={{ ...inputStyle, width: 100 }}
                  />
                  <span style={{ fontSize: 13, color: '#64748b' }}>units left</span>
                </div>
                <p style={helpStyle}>Used when a product doesn't have its own low-stock threshold set.</p>
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h3 className="card-title"><i className="fas fa-shield-halved" style={{ marginInlineEnd: 8, color: '#64748b' }} />Trust Badges Row</h3></div>
          <div className="card-body" style={{ padding: '0 16px' }}>
            <ToggleRow
              k="pdpShowTrustBadges"
              title="Show trust badges row"
              description="A horizontal row under the Add to Cart button reassuring shoppers about shipping, returns, and security."
            />
            {fields.pdpShowTrustBadges && (
              <div style={{ padding: '12px 0 16px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}><i className="fas fa-truck-fast" style={{ marginInlineEnd: 6, color: '#94a3b8' }} />Badge 1 — Shipping</label>
                  <input type="text" value={fields.pdpTrustBadge1Label} onChange={e => update('pdpTrustBadge1Label', e.target.value)} style={inputStyle} maxLength={60} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}><i className="fas fa-rotate-left" style={{ marginInlineEnd: 6, color: '#94a3b8' }} />Badge 2 — Returns</label>
                  <input type="text" value={fields.pdpTrustBadge2Label} onChange={e => update('pdpTrustBadge2Label', e.target.value)} style={inputStyle} maxLength={60} />
                </div>
                <div>
                  <label style={labelStyle}><i className="fas fa-lock" style={{ marginInlineEnd: 6, color: '#94a3b8' }} />Badge 3 — Security</label>
                  <input type="text" value={fields.pdpTrustBadge3Label} onChange={e => update('pdpTrustBadge3Label', e.target.value)} style={inputStyle} maxLength={60} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h3 className="card-title"><i className="fas fa-list-ul" style={{ marginInlineEnd: 8, color: '#64748b' }} />Product Details</h3></div>
          <div className="card-body" style={{ padding: '0 16px' }}>
            <ToggleRow
              k="pdpShowSpecsPanel"
              title="Show specifications panel"
              description="A small panel under the description showing the product's weight and dimensions when set."
            />
            <ToggleRow
              k="pdpShowTags"
              title="Show product tags"
              description="Display the comma-separated tags from the product as small chips."
            />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h3 className="card-title"><i className="fas fa-grip" style={{ marginInlineEnd: 8, color: '#64748b' }} />Related Products</h3></div>
          <div className="card-body" style={{ padding: '0 16px' }}>
            <ToggleRow
              k="pdpShowRelatedProducts"
              title="Show 'You may also like' section"
              description="A grid of related products from the same category at the bottom of every product page."
            />
            {fields.pdpShowRelatedProducts && (
              <div style={{ padding: '12px 0 16px', borderBottom: '1px solid #f1f5f9' }}>
                <label style={labelStyle}>Section heading</label>
                <input
                  type="text"
                  value={fields.pdpRelatedProductsHeading}
                  onChange={e => update('pdpRelatedProductsHeading', e.target.value)}
                  style={inputStyle}
                  maxLength={60}
                  placeholder="You may also like"
                />
              </div>
            )}
          </div>
        </div>

        <SaveBar saving={saving} hasChanges={dirty.hasChanges} onSave={() => handleSave()} />
      </form>
    </div>
  );
}
