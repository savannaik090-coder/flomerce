import React, { useState, useEffect, useContext, useRef } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import SectionToggle from './SectionToggle.jsx';
import SaveBar from './SaveBar.jsx';
import { API_BASE } from '../../config.js';
import { useDirtyTracker } from '../../hooks/useDirtyTracker.js';
import {
  APPOINTMENT_CLASSIC_STYLE_DEFAULTS,
  APPOINTMENT_MODERN_STYLE_DEFAULTS,
} from '../../defaults/index.js';
import AdminColorField from './style/AdminColorField.jsx';
import AdminFontPicker from './style/AdminFontPicker.jsx';

export default function BookAppointmentEditor({ onSaved, onPreviewUpdate }) {
  const { siteConfig, refetchSite } = useContext(SiteContext);
  const { isModern } = useTheme();
  const [showBookAppointment, setShowBookAppointment] = useState(true);
  // Both templates' style overrides are tracked side-by-side so editing one
  // template never disturbs the other's saved values.
  const [classicStyle, setClassicStyle] = useState({});
  const [modernStyle, setModernStyle] = useState({});
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const hasLoadedRef = useRef(false);

  const dirty = useDirtyTracker({ showBookAppointment, classicStyle, modernStyle });

  // Only one styling group is expanded by default — the one matching the
  // merchant's current active template.
  const [classicOpen, setClassicOpen] = useState(!isModern);
  const [modernOpen, setModernOpen] = useState(isModern);

  useEffect(() => {
    if (!siteConfig?.settings) return;
    const settings = siteConfig.settings;
    const visVal = settings.showBookAppointment !== false;
    const ap = settings.appointmentPage || {};
    const csVal = (ap.classicStyle && typeof ap.classicStyle === 'object') ? ap.classicStyle : {};
    const msVal = (ap.modernStyle && typeof ap.modernStyle === 'object') ? ap.modernStyle : {};
    setShowBookAppointment(visVal);
    setClassicStyle(csVal);
    setModernStyle(msVal);
    dirty.baseline({ showBookAppointment: visVal, classicStyle: csVal, modernStyle: msVal });
    setTimeout(() => { hasLoadedRef.current = true; }, 0);
  }, [siteConfig?.settings]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    if (onPreviewUpdate) onPreviewUpdate({
      showBookAppointment,
      appointmentPage: { classicStyle, modernStyle },
    });
  }, [showBookAppointment, classicStyle, modernStyle]);

  function setActiveStyleField(forModern, key, value) {
    const setter = forModern ? setModernStyle : setClassicStyle;
    setter(prev => {
      const next = { ...prev };
      if (value === '' || value === null || value === undefined) delete next[key];
      else next[key] = value;
      return next;
    });
  }

  function resetStyleGroup(forModern, keys) {
    const setter = forModern ? setModernStyle : setClassicStyle;
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
            showBookAppointment,
            appointmentPage: { classicStyle, modernStyle },
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
    <div>
      <SaveBar topBar saving={saving} hasChanges={dirty.hasChanges} onSave={handleSave} />
      <form onSubmit={handleSave}>
        <SectionToggle
          enabled={showBookAppointment}
          onChange={setShowBookAppointment}
          label="Show Book Appointment in Footer"
          description="Display 'Book Appointment' link in the footer's customer service section"
        />

        <StyleGroup
          title="Classic styling"
          subtitle="Applies only to sites using the Classic template."
          open={classicOpen}
          onToggle={() => setClassicOpen(o => !o)}
          style={classicStyle}
          defaults={APPOINTMENT_CLASSIC_STYLE_DEFAULTS}
          onUpdate={(k, v) => setActiveStyleField(false, k, v)}
          onReset={(keys) => resetStyleGroup(false, keys)}
        />

        <StyleGroup
          title="Modern styling"
          subtitle="Applies only to sites using the Modern template."
          open={modernOpen}
          onToggle={() => setModernOpen(o => !o)}
          style={modernStyle}
          defaults={APPOINTMENT_MODERN_STYLE_DEFAULTS}
          onUpdate={(k, v) => setActiveStyleField(true, k, v)}
          onReset={(keys) => resetStyleGroup(true, keys)}
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

        <SaveBar saving={saving} hasChanges={dirty.hasChanges} onSave={handleSave} />
      </form>
    </div>
  );
}

// Collapsible per-template styling block. Each group has a "Reset to default"
// link that clears only that group's keys, leaving the other template's
// saved values untouched.
function StyleGroup({ title, subtitle, open, onToggle, style, defaults, onUpdate, onReset }) {
  const groups = [
    {
      title: 'Page',
      keys: ['pageBg'],
      fields: [{ kind: 'color', key: 'pageBg', label: 'Page Background' }],
    },
    {
      title: 'Typography',
      keys: ['headingFont', 'headingColor', 'bodyFont', 'bodyColor'],
      fields: [
        { kind: 'font', key: 'headingFont', label: 'Heading Font' },
        { kind: 'color', key: 'headingColor', label: 'Heading Color' },
        { kind: 'font', key: 'bodyFont', label: 'Body Font' },
        { kind: 'color', key: 'bodyColor', label: 'Body Color' },
      ],
    },
    {
      title: 'Accent',
      keys: ['accentColor'],
      fields: [{ kind: 'color', key: 'accentColor', label: 'Accent Color (Buttons & Highlights)' }],
    },
  ];

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 18px', background: 'transparent', border: 'none', cursor: 'pointer',
          borderBottom: open ? '1px solid #e2e8f0' : 'none',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{title}</span>
        <i className={`fas fa-chevron-${open ? 'up' : 'down'}`} style={{ color: '#64748b', fontSize: 12 }} />
      </button>

      {open && (
        <div style={{ padding: '16px 18px 18px' }}>
          {subtitle && (
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px' }}>{subtitle}</p>
          )}

          {groups.map(group => (
            <div key={group.title} style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h4 style={{ fontSize: 12, fontWeight: 700, margin: 0, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  {group.title}
                </h4>
                {group.keys.some(k => style[k]) && (
                  <button
                    type="button"
                    onClick={() => onReset(group.keys)}
                    style={{
                      background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                      fontSize: 12, color: '#475569', textDecoration: 'underline',
                    }}
                  >
                    Reset to default
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {group.fields.map(f => (
                  f.kind === 'color' ? (
                    <AdminColorField
                      key={f.key}
                      label={f.label}
                      value={style[f.key] || ''}
                      fallback={defaults[f.key]}
                      onChange={(v) => onUpdate(f.key, v)}
                    />
                  ) : (
                    <AdminFontPicker
                      key={f.key}
                      label={f.label}
                      value={style[f.key] || ''}
                      onChange={(v) => onUpdate(f.key, v)}
                    />
                  )
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
