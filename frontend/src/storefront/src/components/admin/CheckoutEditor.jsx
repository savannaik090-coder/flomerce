import React, { useState, useEffect, useContext, useRef } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';

const API_BASE = typeof window !== 'undefined' && window.location.hostname.endsWith('fluxe.in') ? '' : 'https://fluxe.in';

const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' };
const labelStyle = { display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#334155' };

function newCoupon() {
  return { id: Date.now().toString(), code: '', type: 'percent', value: '', minOrder: '', expiryDate: '', active: true };
}

export default function CheckoutEditor({ onSaved, onPreviewUpdate }) {
  const { siteConfig } = useContext(SiteContext);
  const [codEnabled, setCodEnabled] = useState(true);
  const [coupons, setCoupons] = useState([]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedCoupon, setExpandedCoupon] = useState(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (siteConfig?.id) loadSettings();
  }, [siteConfig?.id]);

  useEffect(() => {
    if (!hasLoadedRef.current || !onPreviewUpdate) return;
    onPreviewUpdate({ codEnabled, coupons });
  }, [codEnabled, coupons]);

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
        setCodEnabled(settings.codEnabled !== false);
        setCoupons(Array.isArray(settings.coupons) ? settings.coupons : []);
      }
    } catch (e) {
      console.error('Failed to load checkout settings:', e);
    } finally {
      hasLoadedRef.current = true;
      setLoading(false);
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
        body: JSON.stringify({ settings: { codEnabled, coupons: cleaned } }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setStatus('success');
        setCoupons(cleaned);
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

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  return (
    <div style={{ maxWidth: 700 }}>
      <form onSubmit={handleSave}>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Payment Methods</h3>
          </div>
          <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Control which payment options are available to customers at checkout.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 12, background: codEnabled ? '#f0fdf4' : '#f8fafc' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>Cash on Delivery (COD)</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Customer pays when the order is delivered</div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, flexShrink: 0 }}>
                <input type="checkbox" checked={codEnabled} onChange={e => setCodEnabled(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{
                  position: 'absolute', cursor: 'pointer', inset: 0, borderRadius: 24, transition: '0.3s',
                  background: codEnabled ? '#22c55e' : '#cbd5e1',
                }}>
                  <span style={{
                    position: 'absolute', left: codEnabled ? 22 : 2, top: 2, width: 20, height: 20,
                    background: '#fff', borderRadius: '50%', transition: '0.3s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </span>
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>Pay Online (Razorpay)</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Credit/Debit Card, UPI, Net Banking — managed in Store Settings</div>
              </div>
              <span style={{ fontSize: 12, background: '#e0f2fe', color: '#0369a1', padding: '3px 10px', borderRadius: 20, fontWeight: 600, flexShrink: 0 }}>Always On</span>
            </div>
          </div>
        </div>

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
                        <span style={{ marginLeft: 10, fontSize: 12, color: '#64748b' }}>
                          {coupon.type === 'percent' ? `${coupon.value}% off` : `₹${coupon.value} off`}
                          {coupon.minOrder ? ` (min ₹${coupon.minOrder})` : ''}
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
                          <option value="flat">Flat Amount (₹)</option>
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
                          placeholder={coupon.type === 'percent' ? 'e.g. 10' : 'e.g. 50'}
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Minimum Order Amount (₹)</label>
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
                          {coupon.active ? '✓ Active — customers can use this code' : '✗ Disabled — code will not work'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="submit" disabled={saving} className="btn-save" style={{ opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {status === 'success' && <span style={{ color: '#22c55e', fontSize: 14, fontWeight: 600 }}>✓ Saved successfully</span>}
          {status.startsWith('error:') && <span style={{ color: '#ef4444', fontSize: 14 }}>Error: {status.slice(6)}</span>}
        </div>
      </form>
    </div>
  );
}
