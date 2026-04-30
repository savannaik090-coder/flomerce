import React, { useState, useMemo } from 'react';
import { evaluateScheme, AA_TEXT } from '../../utils/contrast.js';

// 10 color slots, grouped into three buckets so the editor stays scannable
// even though the merchant has full per-slot control. Order within each
// group goes from "biggest visual surface" → "smallest accent" so the
// most-impactful pickers sit at the top of each group.
const SLOT_GROUPS = [
  {
    label: 'Surfaces',
    slots: [
      { key: 'background', label: 'Background', help: 'Section / card surface' },
      { key: 'border', label: 'Border', help: 'Dividers, card borders, lines' },
    ],
  },
  {
    label: 'Text',
    slots: [
      { key: 'headingText', label: 'Heading text', help: 'h1 – h6, product names' },
      { key: 'text', label: 'Body text', help: 'Paragraphs, descriptions' },
      { key: 'mutedText', label: 'Muted text', help: 'Captions, helper text, labels' },
    ],
  },
  {
    label: 'Interactive',
    slots: [
      { key: 'button', label: 'Primary button', help: 'Main CTA background' },
      { key: 'buttonText', label: 'Button text', help: 'Label on primary CTA' },
      { key: 'secondaryButton', label: 'Secondary button', help: 'Outline / quiet CTA' },
      { key: 'link', label: 'Link', help: 'Inline links / highlights' },
      { key: 'accent', label: 'Accent', help: 'Prices, badges, decorative' },
    ],
  },
];

// Flat list kept for any code that iterates every slot (e.g. validation,
// preview, evaluateScheme). Derived from SLOT_GROUPS so the two never
// drift.
const SLOTS = SLOT_GROUPS.flatMap(g => g.slots);

const MAX_SCHEMES = 5;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function genSchemeId(base) {
  const slug = String(base || 'scheme').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
  return `${slug || 'scheme'}-${Math.random().toString(36).slice(2, 7)}`;
}

function emptyScheme(name) {
  // New scheme starts on the classic palette so it's a usable copy of the
  // default look. The merchant tweaks slots from there rather than
  // starting at black/white and having to rebuild a scheme by hand.
  return {
    id: genSchemeId(name),
    name,
    isDefault: false,
    background: '#ffffff',
    text: '#333333',
    headingText: '#333333',
    mutedText: '#888888',
    border: '#eeeeee',
    button: '#603000',
    buttonText: '#ffffff',
    secondaryButton: '#f1f5f9',
    link: '#603000',
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
  onResetBrandToDefault,
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

        {/* Live preview chip — exercises every group of slots so the
            merchant sees heading, body, muted, border, button, and accent
            all painted together before saving. */}
        <div style={{
          padding: 14, borderRadius: 8, marginBottom: 14,
          background: editing.background, color: editing.text,
          border: `1px solid ${editing.border || '#e2e8f0'}`,
        }}>
          <div style={{
            fontSize: 14, fontWeight: 700, marginBottom: 4,
            color: editing.headingText || editing.text,
          }}>
            {editing.name || 'Sample heading'}
          </div>
          <div style={{ fontSize: 12, marginBottom: 4, color: editing.text }}>
            Body text on a {(editing.name || 'sample').toLowerCase()} surface,
            with a <span style={{ color: editing.link, textDecoration: 'underline' }}>link</span>.
          </div>
          <div style={{ fontSize: 11, marginBottom: 10, color: editing.mutedText || '#94a3b8' }}>
            Muted helper text — captions, hints, secondary info.
          </div>
          <div style={{
            paddingTop: 10,
            borderTop: `1px solid ${editing.border || '#e2e8f0'}`,
            display: 'flex', gap: 8, flexWrap: 'wrap',
          }}>
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

        {/* Grouped slot editor — each group has a small caption above so the
            merchant can find the slot they want without scanning all 10. */}
        {SLOT_GROUPS.map(group => (
          <div key={group.label} style={{ marginBottom: 12 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: '#64748b',
              textTransform: 'uppercase', letterSpacing: 0.6,
              marginBottom: 6, padding: '0 2px',
            }}>
              {group.label}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
              {group.slots.map(slot => (
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
        ))}
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

        {/* Two-tier reset zone. The merchant gets two related-but-distinct
            actions; the explainer above makes the difference legible so
            they don't fire the wrong one and lose more than they meant to.
            Both actions are confirmed via window.confirm — destructive
            enough to warrant a click-through, light enough to not need a
            full custom modal component. */}
        {(onResetBrandToDefault || onResetAllToDefault) && (
          <div
            style={{
              marginTop: 16, padding: 12,
              background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: 10, fontSize: 11, color: '#475569',
              lineHeight: 1.5,
            }}
          >
            <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 6, fontSize: 12 }}>
              <i className="fas fa-info-circle" style={{ marginInlineEnd: 6, color: '#3b82f6' }} />
              What's the difference?
            </div>
            <div style={{ marginBottom: 4 }}>
              <strong>Reset Brand colors</strong> — restores the Brand scheme above to the platform's default brown / gold palette. Your scheme assignments and per-section overrides are kept.
            </div>
            <div>
              <strong>Reset entire site</strong> — clears every per-section scheme assignment and every per-section color override. Your saved schemes (including any custom Brand colors) are kept.
            </div>
          </div>
        )}

        {/* New: reset just the Brand scheme to the platform default palette.
            Useful when the merchant has tweaked Brand into a corner and
            wants a clean starting point without losing their per-section
            assignments / overrides. */}
        {onResetBrandToDefault && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Reset the Brand scheme back to the platform default brown / gold colors?\n\nThis only changes the Brand scheme above. Your scheme assignments and per-section color overrides are kept.')) {
                onResetBrandToDefault();
              }
            }}
            style={{
              width: '100%', marginTop: 8, padding: '10px 16px',
              background: '#fff', color: '#0f172a',
              border: '1px solid #cbd5e1', borderRadius: 10,
              fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <i className="fas fa-palette" style={{ marginInlineEnd: 6, fontSize: 10 }} />
            Reset Brand colors to platform default
          </button>
        )}

        {/* Global "back to original design" escape hatch. Wipes every
            section's overrides AND every scheme assignment, returning the
            entire storefront to its pre-feature look. The schemes
            themselves are preserved — only assignments + overrides reset. */}
        {onResetAllToDefault && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Reset every section back to the default design?\n\nThis clears your scheme assignments and per-section color overrides. Your schemes themselves (including custom Brand colors) stay saved.')) {
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
