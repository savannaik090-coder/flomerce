import React, { useContext, useEffect, useRef, useState } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import AdminColorField from './style/AdminColorField.jsx';
import AdminFontPicker from './style/AdminFontPicker.jsx';
import SaveBar from './SaveBar.jsx';
import { API_BASE } from '../../config.js';
import { useDirtyTracker } from '../../hooks/useDirtyTracker.js';

export default function BrandIdentityEditor({ onSaved, onPreviewUpdate }) {
  const { siteConfig } = useContext(SiteContext);

  const [brandPrimary,         setBrandPrimary]         = useState('');
  const [brandSecondary,       setBrandSecondary]       = useState('');
  const [brandAccent,          setBrandAccent]          = useState('');
  const [brandBg,              setBrandBg]              = useState('');
  const [sectionTitleColor,    setSectionTitleColor]    = useState('');
  const [sectionSubtitleColor, setSectionSubtitleColor] = useState('');
  const [brandHeadingFont,     setBrandHeadingFont]     = useState('');
  const [brandBodyFont,        setBrandBodyFont]        = useState('');
  const [brandNavFont,         setBrandNavFont]         = useState('');

  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  const savedRef = useRef({});

  const dirty = useDirtyTracker({
    brandPrimary, brandSecondary, brandAccent, brandBg,
    sectionTitleColor, sectionSubtitleColor,
    brandHeadingFont, brandBodyFont, brandNavFont,
  });

  useEffect(() => {
    if (!siteConfig?.subdomain) return;
    (async () => {
      try {
        const res  = await fetch(`${API_BASE}/api/site?subdomain=${encodeURIComponent(siteConfig.subdomain)}`);
        const json = await res.json();
        let s = json.data?.settings || {};
        if (typeof s === 'string') { try { s = JSON.parse(s); } catch { s = {}; } }
        const snap = {
          brandPrimary:         s.brandPrimary         || '',
          brandSecondary:       s.brandSecondary       || '',
          brandAccent:          s.brandAccent          || '',
          brandBg:              s.brandBg              || '',
          sectionTitleColor:    s.sectionTitleColor    || '',
          sectionSubtitleColor: s.sectionSubtitleColor || '',
          brandHeadingFont:     s.brandHeadingFont     || '',
          brandBodyFont:        s.brandBodyFont        || '',
          brandNavFont:         s.brandNavFont         || '',
        };
        setBrandPrimary(snap.brandPrimary);
        setBrandSecondary(snap.brandSecondary);
        setBrandAccent(snap.brandAccent);
        setBrandBg(snap.brandBg);
        setSectionTitleColor(snap.sectionTitleColor);
        setSectionSubtitleColor(snap.sectionSubtitleColor);
        setBrandHeadingFont(snap.brandHeadingFont);
        setBrandBodyFont(snap.brandBodyFont);
        setBrandNavFont(snap.brandNavFont);
        savedRef.current = snap;
        requestAnimationFrame(() => dirty.baseline(snap));
      } catch (e) {
        console.error('BrandIdentityEditor load error:', e);
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteConfig?.subdomain]);

  function preview(patch) {
    onPreviewUpdate?.({
      brandPrimary, brandSecondary, brandAccent, brandBg,
      sectionTitleColor, sectionSubtitleColor,
      brandHeadingFont, brandBodyFont, brandNavFont,
      ...patch,
    });
  }

  function handleColor(setter, key, val) { setter(val); preview({ [key]: val }); }
  function handleFont(setter, key, val)  { setter(val); preview({ [key]: val }); }

  async function handleSave() {
    setSaving(true);
    try {
      const token = sessionStorage.getItem('site_admin_token');
      const res = await fetch(`${API_BASE}/api/sites/${siteConfig.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `SiteAdmin ${token}` } : {}),
        },
        body: JSON.stringify({
          settings: {
            brandPrimary, brandSecondary, brandAccent, brandBg,
            sectionTitleColor, sectionSubtitleColor,
            brandHeadingFont, brandBodyFont, brandNavFont,
          },
        }),
      });
      if (!res.ok) throw new Error('save failed');
      const snap = {
        brandPrimary, brandSecondary, brandAccent, brandBg,
        sectionTitleColor, sectionSubtitleColor,
        brandHeadingFont, brandBodyFont, brandNavFont,
      };
      savedRef.current = snap;
      dirty.markSaved();
      onSaved?.();
    } catch (e) {
      console.error('BrandIdentityEditor save error:', e);
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    const s = savedRef.current;
    setBrandPrimary(s.brandPrimary               || '');
    setBrandSecondary(s.brandSecondary           || '');
    setBrandAccent(s.brandAccent                 || '');
    setBrandBg(s.brandBg                         || '');
    setSectionTitleColor(s.sectionTitleColor     || '');
    setSectionSubtitleColor(s.sectionSubtitleColor || '');
    setBrandHeadingFont(s.brandHeadingFont       || '');
    setBrandBodyFont(s.brandBodyFont             || '');
    setBrandNavFont(s.brandNavFont               || '');
    onPreviewUpdate?.({
      brandPrimary:         s.brandPrimary         || '',
      brandSecondary:       s.brandSecondary       || '',
      brandAccent:          s.brandAccent          || '',
      brandBg:              s.brandBg              || '',
      sectionTitleColor:    s.sectionTitleColor    || '',
      sectionSubtitleColor: s.sectionSubtitleColor || '',
      brandHeadingFont:     s.brandHeadingFont     || '',
      brandBodyFont:        s.brandBodyFont        || '',
      brandNavFont:         s.brandNavFont         || '',
    });
    requestAnimationFrame(() => dirty.baseline(s));
  }

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
        Loading brand settings…
      </div>
    );
  }

  const swatches = [
    { label: 'Primary',   color: brandPrimary         || '#5a3f2a' },
    { label: 'Secondary', color: brandSecondary       || '#b3a68e' },
    { label: 'Accent',    color: brandAccent          || '#d4af37' },
    { label: 'BG',        color: brandBg              || '#f8f8f5' },
    { label: 'Title',     color: sectionTitleColor    || brandPrimary || '#5a3f2a' },
    { label: 'Subtitle',  color: sectionSubtitleColor || '#8B7355' },
  ];

  const sectionHead = (label) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, marginTop: 22 }}>
      <div style={{ width: 3, height: 18, background: '#b08c4c', borderRadius: 2, flexShrink: 0 }} />
      <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: 0, letterSpacing: 0.2 }}>{label}</p>
    </div>
  );

  return (
    <div style={{ paddingBottom: 80 }}>
      <div style={{
        background: 'linear-gradient(135deg, #fef9f0 0%, #f8f3e8 100%)',
        border: '1px solid #e8d9b8',
        borderRadius: 10,
        padding: '14px 16px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: 'linear-gradient(135deg, #d4af37, #b08c4c)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <i className="fas fa-palette" style={{ color: '#fff', fontSize: 15 }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
            Global Brand Identity
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#78716c', lineHeight: 1.4 }}>
            Colors and fonts that cascade across every section of your store.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 22 }}>
        {swatches.map(s => (
          <div key={s.label} style={{ flex: '1 1 28%', textAlign: 'center' }}>
            <div style={{
              height: 28, borderRadius: 6, background: s.color,
              border: '1px solid rgba(0,0,0,0.08)', marginBottom: 4,
            }} />
            <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 500 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {sectionHead('Colors')}

      <AdminColorField
        label="Primary Color"
        value={brandPrimary}
        fallback="#5a3f2a"
        onChange={v => handleColor(setBrandPrimary, 'brandPrimary', v)}
      />
      <AdminColorField
        label="Secondary Color"
        value={brandSecondary}
        fallback="#b3a68e"
        onChange={v => handleColor(setBrandSecondary, 'brandSecondary', v)}
      />
      <AdminColorField
        label="Accent"
        value={brandAccent}
        fallback="#d4af37"
        onChange={v => handleColor(setBrandAccent, 'brandAccent', v)}
      />
      <AdminColorField
        label="Page Background"
        value={brandBg}
        fallback="#f8f8f5"
        onChange={v => handleColor(setBrandBg, 'brandBg', v)}
      />
      <AdminColorField
        label="Section Title Color"
        value={sectionTitleColor}
        fallback={brandPrimary || '#5a3f2a'}
        onChange={v => handleColor(setSectionTitleColor, 'sectionTitleColor', v)}
      />
      <AdminColorField
        label="Subtitle / Muted Text Color"
        value={sectionSubtitleColor}
        fallback="#8B7355"
        onChange={v => handleColor(setSectionSubtitleColor, 'sectionSubtitleColor', v)}
      />

      {sectionHead('Typography')}

      <AdminFontPicker
        label="Heading Font"
        value={brandHeadingFont}
        onChange={v => handleFont(setBrandHeadingFont, 'brandHeadingFont', v)}
      />
      <AdminFontPicker
        label="Body Font"
        value={brandBodyFont}
        onChange={v => handleFont(setBrandBodyFont, 'brandBodyFont', v)}
      />
      <AdminFontPicker
        label="Nav / Link Font"
        value={brandNavFont}
        onChange={v => handleFont(setBrandNavFont, 'brandNavFont', v)}
      />

      <p style={{ fontSize: 11, color: '#94a3b8', margin: '12px 0 0', lineHeight: 1.5 }}>
        Per-section overrides always take priority over these global defaults.
      </p>

      <SaveBar
        hasChanges={dirty.hasChanges}
        saving={saving}
        onSave={handleSave}
      />
    </div>
  );
}
