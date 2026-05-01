import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import SectionToggle from './SectionToggle.jsx';
import SaveBar from './SaveBar.jsx';
import { API_BASE } from '../../config.js';

// Curated font catalog. Each entry's `value` is the exact CSS font-family stack
// applied to the banner; `face` is the same family used to render the swatch
// preview in the admin picker. All Google Fonts here are loaded in
// frontend/src/storefront/index.html.
const FONT_GROUPS = [
  {
    label: 'Sans-Serif',
    fonts: [
      { name: 'Inter',       value: "'Inter', 'Helvetica Neue', sans-serif" },
      { name: 'Poppins',     value: "'Poppins', sans-serif" },
      { name: 'Lato',        value: "'Lato', sans-serif" },
      { name: 'Montserrat',  value: "'Montserrat', sans-serif" },
      { name: 'Raleway',     value: "'Raleway', sans-serif" },
      { name: 'DM Sans',     value: "'DM Sans', sans-serif" },
      { name: 'Work Sans',   value: "'Work Sans', sans-serif" },
    ],
  },
  {
    label: 'Serif',
    fonts: [
      { name: 'Playfair Display',    value: "'Playfair Display', serif" },
      { name: 'DM Serif Display',    value: "'DM Serif Display', serif" },
      { name: 'Cormorant Garamond',  value: "'Cormorant Garamond', serif" },
      { name: 'Lora',                value: "'Lora', serif" },
      { name: 'Merriweather',        value: "'Merriweather', serif" },
    ],
  },
  {
    label: 'Display',
    fonts: [
      { name: 'Bebas Neue',     value: "'Bebas Neue', sans-serif" },
      { name: 'Oswald',         value: "'Oswald', sans-serif" },
      { name: 'Anton',          value: "'Anton', sans-serif" },
      { name: 'Abril Fatface',  value: "'Abril Fatface', serif" },
      { name: 'Righteous',      value: "'Righteous', sans-serif" },
      { name: 'Archivo Black',  value: "'Archivo Black', sans-serif" },
    ],
  },
  {
    label: 'Handwritten',
    fonts: [
      { name: 'Caveat',           value: "'Caveat', cursive" },
      { name: 'Pacifico',         value: "'Pacifico', cursive" },
      { name: 'Dancing Script',   value: "'Dancing Script', cursive" },
      { name: 'Great Vibes',      value: "'Great Vibes', cursive" },
      { name: 'Sacramento',       value: "'Sacramento', cursive" },
      { name: 'Permanent Marker', value: "'Permanent Marker', cursive" },
    ],
  },
  {
    label: 'Monospace',
    fonts: [
      { name: 'Space Mono',     value: "'Space Mono', monospace" },
      { name: 'JetBrains Mono', value: "'JetBrains Mono', monospace" },
    ],
  },
];

// Flat lookup so we can find a saved value's display name.
const FONT_LOOKUP = FONT_GROUPS.flatMap(g => g.fonts.map(f => ({ ...f, group: g.label })));

// Mirrors the per-template defaults declared in navbar.css / modern.css.
// Used only to populate the color-picker swatch when no custom value is saved
// — the actual rendered defaults come from CSS, not from these constants.
const TEMPLATE_DEFAULTS = {
  modern: { bg: '#111111', text: '#ffffff' },
  classic: { bg: '#b3a681', text: '#ffffff' },
};

export default function PromoBannerEditor({ onSaved, onPreviewUpdate, sectionVisible = true, onToggleVisibility }) {
  const { siteConfig } = useContext(SiteContext);
  const [messages, setMessages] = useState(['', '', '']);
  const [bgColor, setBgColor] = useState('');
  const [textColor, setTextColor] = useState('');
  const [fontFamily, setFontFamily] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const hasLoadedRef = useRef(false);
  const serverValuesRef = useRef(null);

  const activeTemplate = useMemo(() => {
    const id = siteConfig?.settings?.theme || siteConfig?.templateId || 'classic';
    return TEMPLATE_DEFAULTS[id] ? id : 'classic';
  }, [siteConfig?.settings?.theme, siteConfig?.templateId]);
  const defaultBg = TEMPLATE_DEFAULTS[activeTemplate].bg;
  const defaultText = TEMPLATE_DEFAULTS[activeTemplate].text;

  useEffect(() => {
    if (siteConfig?.id) loadPromoBanner();
  }, [siteConfig?.id]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    const current = JSON.stringify({ messages, bgColor, textColor, fontFamily });
    setHasChanges(current !== serverValuesRef.current);
    if (onPreviewUpdate) onPreviewUpdate({
      promoBanner: messages.filter(m => m.trim() !== ''),
      promoBannerBg: bgColor || undefined,
      promoBannerText: textColor || undefined,
      promoBannerFont: fontFamily || undefined,
    });
  }, [messages, bgColor, textColor, fontFamily]);

  async function loadPromoBanner() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/site?subdomain=${encodeURIComponent(siteConfig.subdomain)}`);
      const result = await response.json();
      if (result.success && result.data) {
        let settings = result.data.settings || {};
        if (typeof settings === 'string') {
          try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
        }
        const existing = settings.promoBanner || [];
        const mVal = [existing[0] || '', existing[1] || '', existing[2] || ''];
        const bg = settings.promoBannerBg || '';
        const txt = settings.promoBannerText || '';
        const fnt = settings.promoBannerFont || '';
        setMessages(mVal);
        setBgColor(bg);
        setTextColor(txt);
        setFontFamily(fnt);
        serverValuesRef.current = JSON.stringify({ messages: mVal, bgColor: bg, textColor: txt, fontFamily: fnt });
      }
    } catch (e) {
      console.error('Failed to load promo banner:', e);
    } finally {
      setLoading(false);
      setTimeout(() => { hasLoadedRef.current = true; }, 0);
    }
  }

  async function handleSave(e) {
    if (e && e.preventDefault) e.preventDefault();
    setSaving(true);
    setStatus('');
    try {
      const token = sessionStorage.getItem('site_admin_token');
      const filtered = messages.filter(m => m.trim() !== '');
      const settingsPayload = {
        promoBanner: filtered,
        promoBannerBg: bgColor || '',
        promoBannerText: textColor || '',
        promoBannerFont: fontFamily || '',
      };
      const response = await fetch(`${API_BASE}/api/sites/${siteConfig.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `SiteAdmin ${token}` : '',
        },
        body: JSON.stringify({ settings: settingsPayload }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setStatus('success');
        serverValuesRef.current = JSON.stringify({ messages, bgColor, textColor, fontFamily });
        setHasChanges(false);
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

  function updateMessage(index, value) {
    setMessages(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  }

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  const placeholders = [
    "e.g. Free shipping on orders above ₹999",
    "e.g. New arrivals every Monday",
    "e.g. Use code SAVE10 for 10% off",
  ];

  const fieldLabel = { display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 };
  const inputBase = {
    width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0',
    borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit',
  };

  return (
    <div style={{ maxWidth: 700 }}>
      <SaveBar topBar saving={saving} hasChanges={hasChanges} onSave={(e) => handleSave(e || { preventDefault: () => {} })} />
      <form onSubmit={handleSave}>
        <SectionToggle
          enabled={sectionVisible}
          onChange={() => { if (onToggleVisibility) onToggleVisibility(); }}
          label="Show Promo Banner"
          description="Display the rotating promotional banner at the top of every page"
        />
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Banner Messages</h3>
          </div>
          <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Add up to 3 promotional messages that rotate every 4 seconds at the top of every page.
            </p>
            {[0, 1, 2].map(index => (
              <div key={index} style={{ marginBottom: 16 }}>
                <label style={fieldLabel}>
                  {index === 0 ? `Message ${index + 1}` : `Message ${index + 1} (optional)`}
                </label>
                <input
                  type="text"
                  value={messages[index]}
                  onChange={e => updateMessage(index, e.target.value)}
                  placeholder={placeholders[index]}
                  maxLength={120}
                  style={inputBase}
                />
                <div style={{ textAlign: 'end', fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                  {messages[index].length}/120
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Banner Style</h3>
          </div>
          <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Customize the colors and font of the promo banner. Leave blank to use the template default.
            </p>

            {/* Live preview */}
            <div style={{
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              marginBottom: 20,
              background: '#fafafa',
            }}>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 1,
                color: '#94a3b8',
                padding: '8px 12px',
                borderBottom: '1px solid #e2e8f0',
                background: '#fff',
              }}>Preview</div>
              <div style={{
                background: bgColor || defaultBg,
                color: textColor || defaultText,
                fontFamily: fontFamily || 'inherit',
                padding: '14px 16px',
                textAlign: 'center',
                fontSize: 14,
                fontWeight: 500,
                letterSpacing: 1,
                transition: 'background 150ms ease, color 150ms ease',
              }}>
                {(messages.find(m => m.trim() !== '') || 'Your promo message preview').slice(0, 80)}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <ColorField
                label="Background Color"
                value={bgColor}
                fallback={defaultBg}
                onChange={setBgColor}
                inputBase={inputBase}
                fieldLabel={fieldLabel}
              />
              <ColorField
                label="Text Color"
                value={textColor}
                fallback={defaultText}
                onChange={setTextColor}
                inputBase={inputBase}
                fieldLabel={fieldLabel}
              />
            </div>

            <FontPicker value={fontFamily} onChange={setFontFamily} fieldLabel={fieldLabel} />
          </div>
        </div>

        {status && (
          <div style={{
            background: status === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${status === 'success' ? '#bbf7d0' : '#fecaca'}`,
            borderRadius: 8, padding: '12px 16px',
            color: status === 'success' ? '#166534' : '#dc2626',
            marginBottom: 16, fontSize: 14,
          }}>
            {status === 'success' ? "Promo banner saved successfully!" : `Failed to save: ${status.replace('error:', '')}`}
          </div>
        )}
        <SaveBar saving={saving} hasChanges={hasChanges} onSave={(e) => handleSave(e || { preventDefault: () => {} })} />
      </form>
    </div>
  );
}

// ---------- Subcomponents ----------

function ColorField({ label, value, fallback, onChange, inputBase, fieldLabel }) {
  const display = value || fallback;
  return (
    <div>
      <label style={fieldLabel}>{label}</label>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: 6,
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        background: '#fff',
      }}>
        <label style={{
          position: 'relative',
          width: 36,
          height: 36,
          borderRadius: 6,
          background: display,
          border: '1px solid #e2e8f0',
          cursor: 'pointer',
          flexShrink: 0,
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.4)',
        }}>
          <input
            type="color"
            value={display}
            onChange={e => onChange(e.target.value)}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
          />
        </label>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={`default · ${fallback}`}
          style={{
            ...inputBase,
            flex: 1,
            border: 'none',
            padding: '6px 4px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: 13,
          }}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            title="Reset to default"
            style={{
              padding: '6px 10px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              fontSize: 12,
              color: '#475569',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >Reset</button>
        )}
      </div>
    </div>
  );
}

function FontPicker({ value, onChange, fieldLabel }) {
  const [activeGroup, setActiveGroup] = useState(() => {
    const found = FONT_LOOKUP.find(f => f.value === value);
    return found ? found.group : FONT_GROUPS[0].label;
  });

  const visibleFonts = FONT_GROUPS.find(g => g.label === activeGroup)?.fonts || [];
  const selectedName = FONT_LOOKUP.find(f => f.value === value)?.name;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <label style={{ ...fieldLabel, marginBottom: 0 }}>
          Font Family
          {selectedName && (
            <span style={{ color: '#64748b', fontWeight: 400, marginLeft: 6 }}>· {selectedName}</span>
          )}
        </label>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            style={{
              fontSize: 12,
              color: '#475569',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              textDecoration: 'underline',
            }}
          >Use template default</button>
        )}
      </div>

      {/* Category tabs */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 12,
        padding: 4,
        background: '#f1f5f9',
        borderRadius: 8,
      }}>
        {FONT_GROUPS.map(group => {
          const active = group.label === activeGroup;
          return (
            <button
              key={group.label}
              type="button"
              onClick={() => setActiveGroup(group.label)}
              style={{
                flex: '1 1 auto',
                padding: '7px 10px',
                background: active ? '#fff' : 'transparent',
                color: active ? '#0f172a' : '#64748b',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                cursor: 'pointer',
                boxShadow: active ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 120ms ease',
              }}
            >{group.label}</button>
          );
        })}
      </div>

      {/* Font cards grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: 10,
      }}>
        {visibleFonts.map(font => {
          const selected = font.value === value;
          return (
            <button
              key={font.name}
              type="button"
              onClick={() => onChange(font.value)}
              style={{
                position: 'relative',
                padding: '14px 12px',
                background: selected ? '#0f172a' : '#fff',
                color: selected ? '#fff' : '#0f172a',
                border: `1.5px solid ${selected ? '#0f172a' : '#e2e8f0'}`,
                borderRadius: 8,
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 120ms ease',
                fontFamily: font.value,
              }}
              onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = '#94a3b8'; }}
              onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = '#e2e8f0'; }}
            >
              <div style={{ fontSize: 22, lineHeight: 1.1, marginBottom: 4 }}>Aa</div>
              <div style={{
                fontSize: 12,
                fontFamily: 'system-ui, -apple-system, sans-serif',
                opacity: selected ? 0.85 : 0.7,
                fontWeight: 500,
              }}>{font.name}</div>
              {selected && (
                <div style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: '#fff',
                  color: '#0f172a',
                  fontSize: 11,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'system-ui, sans-serif',
                  fontWeight: 700,
                  lineHeight: 1,
                }}>✓</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
