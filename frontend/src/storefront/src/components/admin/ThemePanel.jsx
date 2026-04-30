import React, { useState, useMemo } from 'react';
import { evaluateScheme, AA_TEXT } from '../../utils/contrast.js';

const SLOTS = [
  { key: 'background', label: 'Background', help: 'Section surface' },
  { key: 'text', label: 'Text', help: 'Body copy on background' },
  { key: 'button', label: 'Button', help: 'Primary CTA' },
  { key: 'buttonText', label: 'Button text', help: 'Label on primary CTA' },
  { key: 'secondaryButton', label: 'Secondary button', help: 'Outline / quiet CTA' },
  { key: 'link', label: 'Link', help: 'Inline links / highlights' },
  { key: 'accent', label: 'Accent', help: 'Borders, badges, decorative' },
];

const MAX_SCHEMES = 5;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function genSchemeId(base) {
  const slug = String(base || 'scheme').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
  return `${slug || 'scheme'}-${Math.random().toString(36).slice(2, 7)}`;
}

function emptyScheme(name) {
  return {
    id: genSchemeId(name),
    name,
    isDefault: false,
    background: '#ffffff',
    text: '#111111',
    button: '#000000',
    buttonText: '#ffffff',
    secondaryButton: '#f1f5f9',
    link: '#1d4ed8',
    accent: '#b08c4c',
  };
}

// ThemePanel manages the merchant's 1–5 named color schemes. Owns no
// persistence state itself — the parent (VisualCustomizer) holds the live
// `themeConfig` and re-renders on every change so the live preview stays in
// sync. Save is a single explicit button at the bottom.
export default function ThemePanel({
  themeConfig,
  saving,
  hasChanges,
  onChange,
  onSave,
  onDirty,
  onResetAllToDefault,
}) {
  const schemes = (themeConfig && themeConfig.schemes) || [];
  const [editingId, setEditingId] = useState(() => schemes[0]?.id || null);

  const editing = useMemo(() => schemes.find(s => s.id === editingId) || schemes[0] || null, [schemes, editingId]);
  const checks = useMemo(() => evaluateScheme(editing), [editing]);

  function patchSchemes(next) {
    onChange({ ...(themeConfig || {}), schemes: next });
    if (onDirty) onDirty();
  }

  function updateField(slot, value) {
    if (!editing) return;
    const next = schemes.map(s => s.id === editing.id ? { ...s, [slot]: value } : s);
    patchSchemes(next);
  }

  function rename(name) {
    if (!editing) return;
    const next = schemes.map(s => s.id === editing.id ? { ...s, name: name.slice(0, 60) } : s);
    patchSchemes(next);
  }

  function addScheme() {
    if (schemes.length >= MAX_SCHEMES) return;
    const created = emptyScheme(`Scheme ${schemes.length + 1}`);
    patchSchemes([...schemes, created]);
    setEditingId(created.id);
  }

  function deleteScheme(id) {
    const target = schemes.find(s => s.id === id);
    if (!target || target.isDefault) return;
    const next = schemes.filter(s => s.id !== id);
    patchSchemes(next);
    if (editingId === id) setEditingId(next[0]?.id || null);
  }

  function makeDefault(id) {
    const next = schemes.map(s => ({ ...s, isDefault: s.id === id }));
    patchSchemes(next);
  }

  if (!editing) {
    return (
      <div style={{ padding: 24, fontSize: 13, color: '#64748b' }}>
        No schemes available. Refresh the page to reload your theme.
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 16px 100px' }}>
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 10px', padding: '0 4px' }}>
          Color schemes let every section pick its own palette. The default scheme is applied site-wide; assign others per section.
        </p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {schemes.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setEditingId(s.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 10px',
                border: editingId === s.id ? '2px solid #2563eb' : '1px solid #e2e8f0',
                borderRadius: 8, background: '#fff', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, color: '#0f172a',
                fontFamily: 'inherit',
              }}
            >
              <span style={{
                display: 'inline-block', width: 16, height: 16, borderRadius: 4,
                background: s.background, border: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden',
              }}>
                <span style={{
                  position: 'absolute', inset: 0, background: `linear-gradient(135deg, transparent 50%, ${s.button} 50%)`,
                }} />
              </span>
              {s.name}
              {s.isDefault && (
                <span style={{ fontSize: 9, color: '#2563eb', fontWeight: 700, textTransform: 'uppercase' }}>·default</span>
              )}
            </button>
          ))}
          {schemes.length < MAX_SCHEMES && (
            <button
              type="button"
              onClick={addScheme}
              style={{
                padding: '6px 10px', border: '1px dashed #cbd5e1', borderRadius: 8,
                background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                color: '#64748b', fontFamily: 'inherit',
              }}
            >
              <i className="fas fa-plus" style={{ marginInlineEnd: 4, fontSize: 10 }} />
              Add scheme
            </button>
          )}
        </div>
        <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, padding: '0 4px' }}>
          Up to {MAX_SCHEMES} schemes. The default is used for sections that haven't been assigned a specific scheme.
        </p>
      </div>

      <div style={{
        background: '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 16,
        border: '1px solid #e2e8f0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <input
            type="text"
            value={editing.name}
            onChange={(e) => rename(e.target.value)}
            placeholder="Scheme name"
            style={{
              flex: 1, padding: '7px 10px', border: '1px solid #cbd5e1',
              borderRadius: 6, fontSize: 14, fontWeight: 600, color: '#0f172a',
              fontFamily: 'inherit',
            }}
          />
          {!editing.isDefault && (
            <>
              <button
                type="button"
                onClick={() => makeDefault(editing.id)}
                title="Make default"
                style={{
                  padding: '6px 10px', background: '#fff', border: '1px solid #cbd5e1',
                  borderRadius: 6, fontSize: 12, color: '#475569', cursor: 'pointer',
                  fontFamily: 'inherit', fontWeight: 500,
                }}
              >
                <i className="fas fa-star" style={{ marginInlineEnd: 4, fontSize: 10 }} />
                Default
              </button>
              <button
                type="button"
                onClick={() => deleteScheme(editing.id)}
                title="Delete scheme"
                style={{
                  padding: '6px 10px', background: '#fef2f2', border: '1px solid #fecaca',
                  borderRadius: 6, fontSize: 12, color: '#dc2626', cursor: 'pointer',
                  fontFamily: 'inherit', fontWeight: 500,
                }}
              >
                <i className="fas fa-trash" style={{ fontSize: 10 }} />
              </button>
            </>
          )}
        </div>

        {/* Live preview chip — uses the same vars SchemeScope writes so the
            merchant gets a ground-truth render of how the scheme looks. */}
        <div style={{
          padding: 14, borderRadius: 8, marginBottom: 14,
          background: editing.background, color: editing.text,
          border: '1px solid #e2e8f0',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>The quick brown fox</div>
          <div style={{ fontSize: 12, marginBottom: 10, opacity: 0.85 }}>
            Body text on a {editing.name.toLowerCase()} surface, with a <span style={{ color: editing.link, textDecoration: 'underline' }}>link</span>.
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-block', padding: '6px 14px',
              background: editing.button, color: editing.buttonText,
              borderRadius: 6, fontSize: 12, fontWeight: 600,
            }}>Buy now</span>
            <span style={{
              display: 'inline-block', padding: '6px 14px',
              background: editing.secondaryButton, color: editing.text,
              borderRadius: 6, fontSize: 12, fontWeight: 600,
              border: `1px solid ${editing.accent}`,
            }}>Learn more</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
          {SLOTS.map(slot => (
            <ColorSlotRow
              key={slot.key}
              label={slot.label}
              help={slot.help}
              value={editing[slot.key]}
              onChange={(v) => updateField(slot.key, v)}
            />
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Accessibility
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {checks.map((c, i) => (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 10px',
                background: c.passes ? '#f0fdf4' : '#fffbeb',
                border: `1px solid ${c.passes ? '#bbf7d0' : '#fde68a'}`,
                borderRadius: 6, fontSize: 12,
              }}
            >
              <i
                className={c.passes ? 'fas fa-check-circle' : 'fas fa-exclamation-triangle'}
                style={{ color: c.passes ? '#16a34a' : '#d97706', fontSize: 13 }}
              />
              <span style={{ color: '#0f172a', flex: 1 }}>{c.label}</span>
              <span style={{
                color: c.passes ? '#16a34a' : '#b45309', fontWeight: 600, fontSize: 11,
              }}>
                {c.ratio.toFixed(2)} : 1
              </span>
              {!c.passes && (
                <span style={{ color: '#92400e', fontSize: 10 }}>
                  needs ≥ {c.threshold}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: 'sticky', bottom: 0, background: '#fff', paddingTop: 10, marginTop: 8 }}>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !hasChanges}
          style={{
            width: '100%', padding: '12px 20px',
            background: hasChanges ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : '#e2e8f0',
            color: hasChanges ? '#fff' : '#94a3b8',
            border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
            cursor: hasChanges && !saving ? 'pointer' : 'default',
            opacity: saving ? 0.7 : 1,
            fontFamily: 'inherit',
            boxShadow: hasChanges ? '0 4px 12px rgba(59,130,246,0.3)' : 'none',
          }}
        >
          {saving ? "Saving..." : hasChanges ? "Save Theme" : "All Changes Saved"}
        </button>

        {/* Global "back to original design" escape hatch. Wipes every
            section's overrides AND every scheme assignment, returning the
            entire storefront to its pre-feature look. The schemes
            themselves are preserved — only assignments + overrides reset. */}
        {onResetAllToDefault && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Reset every section back to the original design? This clears your scheme assignments and per-section colour overrides. Your schemes themselves stay saved.')) {
                onResetAllToDefault();
              }
            }}
            style={{
              width: '100%', marginTop: 8, padding: '10px 16px',
              background: '#fff', color: '#dc2626',
              border: '1px solid #fecaca', borderRadius: 10,
              fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <i className="fas fa-undo" style={{ marginInlineEnd: 6, fontSize: 10 }} />
            Reset entire site to default design
          </button>
        )}
      </div>
    </div>
  );
}

function ColorSlotRow({ label, help, value, onChange }) {
  const valid = HEX_RE.test(value || '');
  const safeValue = valid ? value : '#000000';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 10px', background: '#fff',
      border: '1px solid #e2e8f0', borderRadius: 8,
    }}>
      <input
        type="color"
        value={safeValue}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: 38, height: 38, border: 'none', borderRadius: 6,
          padding: 0, cursor: 'pointer', background: 'transparent',
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{label}</div>
        {help && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{help}</div>}
      </div>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => {
          let v = e.target.value.trim();
          if (v && !v.startsWith('#')) v = '#' + v;
          onChange(v);
        }}
        spellCheck={false}
        style={{
          width: 92, padding: '6px 8px',
          border: `1px solid ${valid ? '#cbd5e1' : '#fca5a5'}`,
          borderRadius: 6, fontSize: 12, color: '#0f172a',
          fontFamily: 'monospace', textAlign: 'center',
        }}
      />
    </div>
  );
}
