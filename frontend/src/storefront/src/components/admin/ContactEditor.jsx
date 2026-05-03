import React, { useState, useEffect, useContext, useRef } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import SectionToggle from './SectionToggle.jsx';
import SaveBar from './SaveBar.jsx';
import { API_BASE } from '../../config.js';
import { useDirtyTracker } from '../../hooks/useDirtyTracker.js';
import {
  CONTACT_CLASSIC_STYLE_DEFAULTS,
  CONTACT_MODERN_STYLE_DEFAULTS,
} from '../../defaults/index.js';
import AdminColorField from './style/AdminColorField.jsx';
import AdminFontPicker from './style/AdminFontPicker.jsx';

export default function ContactEditor({ onSaved, onPreviewUpdate }) {
  const { siteConfig, refetchSite } = useContext(SiteContext);
  const { isModern } = useTheme();
  const [showContact, setShowContact] = useState(true);
  // Both templates' style overrides are tracked side-by-side so editing one
  // template never disturbs the other's saved values.
  const [classicStyle, setClassicStyle] = useState({});
  const [modernStyle, setModernStyle] = useState({});
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const hasLoadedRef = useRef(false);

  const dirty = useDirtyTracker({ showContact, classicStyle, modernStyle });

  useEffect(() => {
    if (!siteConfig?.settings) return;
    let settings = siteConfig.settings;
    if (typeof settings === 'string') {
      try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
    }
    const sc = settings.showContact !== false;
    const contactPage = settings.contactPage || {};
    const cs = (contactPage.classicStyle && typeof contactPage.classicStyle === 'object') ? contactPage.classicStyle : {};
    const ms = (contactPage.modernStyle && typeof contactPage.modernStyle === 'object') ? contactPage.modernStyle : {};
    setShowContact(sc);
    setClassicStyle(cs);
    setModernStyle(ms);
    dirty.baseline({ showContact: sc, classicStyle: cs, modernStyle: ms });
    setTimeout(() => { hasLoadedRef.current = true; }, 0);
  }, [siteConfig?.id]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    if (onPreviewUpdate) {
      onPreviewUpdate({
        showContact,
        contactPage: { classicStyle, modernStyle },
      });
    }
  }, [showContact, classicStyle, modernStyle]);

  function updateStyleField(template, key, value) {
    const setter = template === 'modern' ? setModernStyle : setClassicStyle;
    setter(prev => {
      const next = { ...prev };
      if (value === '' || value === null || value === undefined) delete next[key];
      else next[key] = value;
      return next;
    });
  }

  function resetStyleGroup(template, keys) {
    const setter = template === 'modern' ? setModernStyle : setClassicStyle;
    setter(prev => {
      const next = { ...prev };
      for (const k of keys) delete next[k];
      return next;
    });
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
        body: JSON.stringify({
          settings: {
            showContact,
            contactPage: { classicStyle, modernStyle },
          },
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setStatus('success');
        dirty.markSaved();
        if (refetchSite) refetchSite();
        if (onSaved) onSaved();
      } else {
        setStatus('error:' + (result.error || "Failed to save"));
      }
    } catch (err) {
      setStatus('error:' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <SaveBar topBar saving={saving} hasChanges={dirty.hasChanges} onSave={(e) => handleSave(e || { preventDefault: () => {} })} />
      <form onSubmit={handleSave}>
        <SectionToggle
          enabled={showContact}
          onChange={setShowContact}
          label="Show Contact in Footer"
          description="Display 'Contact' link in the footer's customer service section"
        />

        <StyleGroup
          title="Classic styling"
          template="classic"
          style={classicStyle}
          defaults={CONTACT_CLASSIC_STYLE_DEFAULTS}
          updateField={updateStyleField}
          resetGroup={resetStyleGroup}
          defaultOpen={!isModern}
          fields={CLASSIC_FIELDS}
        />

        <StyleGroup
          title="Modern styling"
          template="modern"
          style={modernStyle}
          defaults={CONTACT_MODERN_STYLE_DEFAULTS}
          updateField={updateStyleField}
          resetGroup={resetStyleGroup}
          defaultOpen={isModern}
          fields={MODERN_FIELDS}
        />

        {status.startsWith('error:') && (
          <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13, marginBottom: 16 }}>
            {status.replace('error:', '')}
          </div>
        )}
        {status === 'success' && (
          <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, color: '#16a34a', fontSize: 13, marginBottom: 16 }}>
            Saved successfully!
          </div>
        )}

        <SaveBar saving={saving} hasChanges={dirty.hasChanges} onSave={(e) => handleSave(e || { preventDefault: () => {} })} />
      </form>
    </div>
  );
}

const CLASSIC_FIELDS = [
  { kind: 'color', key: 'pageBg', label: 'Page Background' },
  { kind: 'color', key: 'infoCardBg', label: 'Info Card Background' },
  { kind: 'color', key: 'accentColor', label: 'Accent Color (Dividers / Icons / Submit Button)' },
  { kind: 'font',  key: 'headingFont', label: 'Heading Font' },
  { kind: 'color', key: 'headingColor', label: 'Heading Color' },
  { kind: 'font',  key: 'bodyFont', label: 'Body Font' },
  { kind: 'color', key: 'bodyColor', label: 'Body Text Color (applies to all body / form text)' },
];

const MODERN_FIELDS = [
  { kind: 'color', key: 'pageBg', label: 'Page Background (form section)' },
  { kind: 'color', key: 'accentColor', label: 'Accent Color (Buttons / Icons)' },
  { kind: 'color', key: 'formBorderColor', label: 'Form Field Border & Focus Color' },
  { kind: 'font',  key: 'headingFont', label: 'Heading Font' },
  { kind: 'color', key: 'headingColor', label: 'Heading Color' },
  { kind: 'font',  key: 'bodyFont', label: 'Body Font' },
  { kind: 'color', key: 'bodyColor', label: 'Body Text Color (applies to all body / form text)' },
];

// Collapsible per-template style group. The group matching the merchant's
// active template (defaultOpen=true) is expanded on first render so the
// most-relevant controls are visible without an extra click.
function StyleGroup({ title, template, style, defaults, updateField, resetGroup, defaultOpen, fields }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const allKeys = fields.map(f => f.key);
  const hasAnyOverride = allKeys.some(k => style[k]);

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="card-header"
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
          padding: '14px 16px', textAlign: 'left',
        }}
      >
        <h3 className="card-title" style={{ margin: 0 }}>{title}</h3>
        <i className={`fas fa-chevron-${open ? 'up' : 'down'}`} style={{ color: '#64748b', fontSize: 12 }} />
      </button>
      {open && (
        <div className="card-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
              These settings apply only to the <strong>{template === 'modern' ? 'Modern' : 'Classic'}</strong> template.
            </p>
            {hasAnyOverride && (
              <button
                type="button"
                onClick={() => resetGroup(template, allKeys)}
                style={{
                  background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                  fontSize: 12, color: '#475569', textDecoration: 'underline',
                }}
              >
                Reset all to default
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {fields.map(f => (
              f.kind === 'color' ? (
                <AdminColorField
                  key={f.key}
                  label={f.label}
                  value={style[f.key] || ''}
                  fallback={defaults[f.key]}
                  onChange={(v) => updateField(template, f.key, v)}
                />
              ) : (
                <AdminFontPicker
                  key={f.key}
                  label={f.label}
                  value={style[f.key] || ''}
                  onChange={(v) => updateField(template, f.key, v)}
                />
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
