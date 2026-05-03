import React, { useState, useEffect, useContext, useRef } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import SaveBar from './SaveBar.jsx';
import { API_BASE } from '../../config.js';
import AdminColorField from './style/AdminColorField.jsx';
import AdminFontPicker from './style/AdminFontPicker.jsx';
import { useDirtyTracker } from '../../hooks/useDirtyTracker.js';

// Cart + Wishlist side-panel style editor.
//
// One shared block of CSS variables drives both panels (the panels are visually
// twins — same surface, same accent, same typography). Saving here updates
// :root via SiteContext so changes apply to BOTH classic and modern templates.
//
// Persists into settings.{panelBg, panelText, panelMuted, panelAccent,
// panelAccentText, panelFont}. Empty string means "use template default".
export default function SidePanelsEditor({ onSaved, onPreviewUpdate }) {
  const { siteConfig, refetchSite } = useContext(SiteContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [panelBg, setPanelBg] = useState('');
  const [panelText, setPanelText] = useState('');
  const [panelMuted, setPanelMuted] = useState('');
  const [panelAccent, setPanelAccent] = useState('');
  const [panelAccentText, setPanelAccentText] = useState('');
  const [panelFont, setPanelFont] = useState('');
  const [cartTitle, setCartTitle] = useState('');
  const [cartEmptyText, setCartEmptyText] = useState('');
  const [wishlistTitle, setWishlistTitle] = useState('');
  const [wishlistEmptyText, setWishlistEmptyText] = useState('');
  const [subtotalLabel, setSubtotalLabel] = useState('');
  const [continueShoppingLabel, setContinueShoppingLabel] = useState('');
  const [checkoutLabel, setCheckoutLabel] = useState('');
  const hasLoadedRef = useRef(false);

  const dirty = useDirtyTracker({ panelBg, panelText, panelMuted, panelAccent, panelAccentText, panelFont, cartTitle, cartEmptyText, wishlistTitle, wishlistEmptyText, subtotalLabel, continueShoppingLabel, checkoutLabel });

  useEffect(() => {
    if (siteConfig?.id) load();
  }, [siteConfig?.id]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    if (onPreviewUpdate) onPreviewUpdate({ panelBg, panelText, panelMuted, panelAccent, panelAccentText, panelFont });
  }, [panelBg, panelText, panelMuted, panelAccent, panelAccentText, panelFont, cartTitle, cartEmptyText, wishlistTitle, wishlistEmptyText, subtotalLabel, continueShoppingLabel, checkoutLabel]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/site?subdomain=${encodeURIComponent(siteConfig.subdomain)}`);
      const result = await res.json();
      if (result.success && result.data) {
        let settings = result.data.settings || {};
        if (typeof settings === 'string') {
          try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
        }
        const bg = settings.panelBg || '';
        const tx = settings.panelText || '';
        const mu = settings.panelMuted || '';
        const ac = settings.panelAccent || '';
        const at = settings.panelAccentText || '';
        const fn = settings.panelFont || '';
        const ct = settings.cartTitle || '';
        const ce = settings.cartEmptyText || '';
        const wt = settings.wishlistTitle || '';
        const we = settings.wishlistEmptyText || '';
        const sl = settings.subtotalLabel || '';
        const cs = settings.continueShoppingLabel || '';
        const cl = settings.checkoutLabel || '';
        setPanelBg(bg);
        setPanelText(tx);
        setPanelMuted(mu);
        setPanelAccent(ac);
        setPanelAccentText(at);
        setPanelFont(fn);
        setCartTitle(ct);
        setCartEmptyText(ce);
        setWishlistTitle(wt);
        setWishlistEmptyText(we);
        setSubtotalLabel(sl);
        setContinueShoppingLabel(cs);
        setCheckoutLabel(cl);
        dirty.baseline({
          panelBg: bg, panelText: tx, panelMuted: mu, panelAccent: ac,
          panelAccentText: at, panelFont: fn,
          cartTitle: ct, cartEmptyText: ce, wishlistTitle: wt, wishlistEmptyText: we,
          subtotalLabel: sl, continueShoppingLabel: cs, checkoutLabel: cl,
        });
      }
    } catch (e) {
      console.error('Failed to load side-panel config:', e);
    } finally {
      setLoading(false);
      setTimeout(() => { hasLoadedRef.current = true; }, 0);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setStatus('');
    try {
      const token = sessionStorage.getItem('site_admin_token');
      const res = await fetch(`${API_BASE}/api/sites/${siteConfig.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `SiteAdmin ${token}` : '',
        },
        body: JSON.stringify({
          settings: { panelBg, panelText, panelMuted, panelAccent, panelAccentText, panelFont, cartTitle, cartEmptyText, wishlistTitle, wishlistEmptyText, subtotalLabel, continueShoppingLabel, checkoutLabel },
        }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setStatus('success');
        dirty.markSaved();
        if (refetchSite) refetchSite();
        if (onSaved) onSaved();
      } else {
        setStatus('error:' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      setStatus('error:' + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  // Defaults mirror the CSS fallbacks so the preview always reflects the actual
  // rendered surface, even when no custom value is set.
  const previewBg = panelBg || '#ffffff';
  const previewText = panelText || '#333333';
  const previewMuted = panelMuted || '#888888';
  const previewAccent = panelAccent || '#c8a97e';
  const previewAccentText = panelAccentText || '#ffffff';
  const previewFont = panelFont || 'inherit';

  return (
    <div style={{ maxWidth: 750 }}>
      <SaveBar topBar saving={saving} hasChanges={dirty.hasChanges} onSave={(e) => handleSave(e || { preventDefault: () => {} })} />
      <form onSubmit={handleSave}>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Cart &amp; Wishlist Panels</h3>
          </div>
          <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              These colors and font apply to both the cart and wishlist side
              panels (the drawers that slide in from the side). Leave any field
              blank to use the template default.
            </p>

            {/* Live mini-preview */}
            <div style={{
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              overflow: 'hidden',
              marginBottom: 24,
              background: previewBg,
              fontFamily: previewFont,
              boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderBottom: `1px solid ${previewMuted}`,
              }}>
                <div style={{ color: previewText, fontSize: 17, fontWeight: 500 }}>Cart</div>
                <div style={{
                  background: '#f5f5f5',
                  color: '#555',
                  width: 32, height: 32,
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18,
                }}>×</div>
              </div>

              <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: '60px 1fr', gap: 12 }}>
                <div style={{ width: 60, height: 60, borderRadius: 8, background: '#f1f5f9' }} />
                <div>
                  <div style={{ color: previewText, fontWeight: 500, fontSize: 14, marginBottom: 4 }}>
                    Sample item
                  </div>
                  <div style={{ color: previewMuted, fontSize: 13, marginBottom: 6 }}>
                    Qty 1
                  </div>
                  <div style={{ color: previewAccent, fontWeight: 600, fontSize: 14 }}>
                    $49.00
                  </div>
                </div>
              </div>

              <div style={{
                padding: '12px 16px',
                borderTop: `1px solid ${previewMuted}`,
                background: previewBg,
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  color: previewText,
                  fontWeight: 500,
                  fontSize: 14,
                  marginBottom: 10,
                }}>
                  <span>Subtotal</span>
                  <span>$49.00</span>
                </div>
                <button type="button" disabled style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 14px',
                  border: 'none',
                  borderRadius: 4,
                  background: previewAccent,
                  color: previewAccentText,
                  fontWeight: 500,
                  fontSize: 14,
                  fontFamily: 'inherit',
                  cursor: 'default',
                }}>
                  Checkout
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <AdminColorField
                label="Background"
                value={panelBg}
                fallback="#ffffff"
                onChange={setPanelBg}
              />
              <AdminColorField
                label="Text Color"
                value={panelText}
                fallback="#333333"
                onChange={setPanelText}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
              <AdminColorField
                label="Muted Text / Borders"
                value={panelMuted}
                fallback="#888888"
                onChange={setPanelMuted}
              />
              <AdminColorField
                label="Accent (Buttons, Price)"
                value={panelAccent}
                fallback="#c8a97e"
                onChange={setPanelAccent}
              />
              <AdminColorField
                label="Accent Text"
                value={panelAccentText}
                fallback="#ffffff"
                onChange={setPanelAccentText}
              />
            </div>

            <AdminFontPicker
              label="Panel Font"
              value={panelFont}
              onChange={setPanelFont}
            />
          </div>
        </div>

        {status === 'success' && (
          <div style={{
            padding: 12,
            borderRadius: 8,
            background: '#ecfdf5',
            color: '#065f46',
            fontSize: 13,
            marginBottom: 16,
          }}>
            Saved. Cart and wishlist panels updated on both templates.
          </div>
        )}
        {status && status.startsWith('error:') && (
          <div style={{
            padding: 12,
            borderRadius: 8,
            background: '#fef2f2',
            color: '#991b1b',
            fontSize: 13,
            marginBottom: 16,
          }}>
            {status.slice(6)}
          </div>
        )}

        <SaveBar saving={saving} hasChanges={dirty.hasChanges} onSave={(e) => handleSave(e || { preventDefault: () => {} })} />
      </form>
    </div>
  );
}
