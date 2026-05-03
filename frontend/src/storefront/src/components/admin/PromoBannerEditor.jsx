import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import SectionToggle from './SectionToggle.jsx';
import SaveBar from './SaveBar.jsx';
import AdminColorField from './style/AdminColorField.jsx';
import AdminFontPicker from './style/AdminFontPicker.jsx';
import { API_BASE } from '../../config.js';
import { useDirtyTracker } from '../../hooks/useDirtyTracker.js';

function SectionHeading({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <div style={{ width: 3, height: 18, background: '#2563eb', borderRadius: 2, flexShrink: 0 }} />
      <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: 0, letterSpacing: 0.2 }}>{children}</p>
    </div>
  );
}

// Mirrors the per-template defaults declared in navbar.css / modern.css.
// Used only to populate the color-picker swatch when no custom value is saved
// — the actual rendered defaults come from CSS, not from these constants.
const TEMPLATE_DEFAULTS = {
  modern: { bg: '#111111', text: '#ffffff' },
  classic: { bg: '#b3a681', text: '#ffffff' },
};

export default function PromoBannerEditor({ onSaved, onPreviewUpdate, sectionVisible = true, visibilityKey, onVisibilitySaved }) {
  const { siteConfig } = useContext(SiteContext);
  const [pendingVisible, setPendingVisible] = useState(sectionVisible);
  useEffect(() => { setPendingVisible(sectionVisible); }, [sectionVisible]);
  const visDirty = !!visibilityKey && pendingVisible !== sectionVisible;
  const [messages, setMessages] = useState(['', '', '']);
  const [bgColor, setBgColor] = useState('');
  const [textColor, setTextColor] = useState('');
  const [fontFamily, setFontFamily] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('content');
  const hasLoadedRef = useRef(false);

  const dirty = useDirtyTracker({ messages, bgColor, textColor, fontFamily });

  const activeTemplate = useMemo(() => {
    const id = siteConfig?.settings?.theme === 'modern' ? 'modern' : 'classic';
    return TEMPLATE_DEFAULTS[id] ? id : 'classic';
  }, [siteConfig?.settings?.theme]);
  const defaultBg = TEMPLATE_DEFAULTS[activeTemplate].bg;
  const defaultText = TEMPLATE_DEFAULTS[activeTemplate].text;

  useEffect(() => {
    if (siteConfig?.id) loadPromoBanner();
  }, [siteConfig?.id]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
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
        dirty.baseline({ messages: mVal, bgColor: bg, textColor: txt, fontFamily: fnt });
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
        ...(visibilityKey ? { [visibilityKey]: pendingVisible } : {}),
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
        dirty.markSaved();
        if (visibilityKey && onVisibilitySaved) onVisibilitySaved(pendingVisible);
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
      <SaveBar topBar saving={saving} hasChanges={dirty.hasChanges || visDirty} onSave={(e) => handleSave(e || { preventDefault: () => {} })} />
      <form onSubmit={handleSave}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e2e8f0' }}>
          {[{ key: 'content', icon: 'fa-edit', label: 'Content' }, { key: 'appearance', icon: 'fa-paint-brush', label: 'Appearance' }].map(tab => (
            <button key={tab.key} type="button" onClick={() => setActiveView(tab.key)} style={{ padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, color: activeView === tab.key ? '#2563eb' : '#64748b', borderBottom: `2px solid ${activeView === tab.key ? '#2563eb' : 'transparent'}`, marginBottom: -2, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', transition: 'color 0.15s ease' }}>
              <i className={`fas ${tab.icon}`} />{tab.label}
            </button>
          ))}
        </div>

        {activeView === 'content' && <>
        {visibilityKey && (
          <SectionToggle
            enabled={pendingVisible}
            onChange={() => {
              const next = !pendingVisible;
              setPendingVisible(next);
              if (onPreviewUpdate && visibilityKey) onPreviewUpdate({ [visibilityKey]: next });
            }}
            label="Show Promotional Banner"
            description="Display the rotating promotional banner at the top of every page"
          />
        )}
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
        </>}

        {activeView === 'appearance' && <>
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

            {/* Colors */}
            <div style={{ marginBottom: 24 }}>
              <SectionHeading>Colors</SectionHeading>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <AdminColorField
                  label="Background Color"
                  value={bgColor}
                  fallback={defaultBg}
                  onChange={setBgColor}
                />
                <AdminColorField
                  label="Text Color"
                  value={textColor}
                  fallback={defaultText}
                  onChange={setTextColor}
                />
              </div>
            </div>

            {/* Typography */}
            <div>
              <SectionHeading>Typography</SectionHeading>
              <AdminFontPicker label="Font Family" value={fontFamily} onChange={setFontFamily} />
            </div>
          </div>
        </div>
        </>}

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
        <SaveBar saving={saving} hasChanges={dirty.hasChanges || visDirty} onSave={(e) => handleSave(e || { preventDefault: () => {} })} />
      </form>
    </div>
  );
}

