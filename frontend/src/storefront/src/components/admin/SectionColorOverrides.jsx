import React, { useState } from 'react';
import { SECTION_SLOTS, SLOT_LABELS, resolveSectionColors } from '../theme/sectionSelectors.js';

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

// Per-section "Customize colors" panel. Lives at the top of every section
// editor, BELOW the scheme dropdown. Lets the merchant override one or more
// of the section's colour slots without redefining a whole scheme.
//
// The component is purely presentational — it receives:
//   * sectionId            (string)
//   * scheme               (the resolved scheme being applied to this section)
//   * overrides            (current overrides for this section, may be {})
//   * onChange(slot, val)  (single-slot edit; called with null to clear)
//   * onResetAll()         (clear every override for this section)
//
// Slot list is derived from sectionSelectors.js so it never drifts from what
// SchemeScope actually knows how to recolor.
export default function SectionColorOverrides({ sectionId, scheme, overrides, onChange, onResetAll }) {
  const [open, setOpen] = useState(false);
  const slots = SECTION_SLOTS[sectionId];
  if (!slots || slots.length === 0) return null;

  const overrideCount = overrides ? Object.keys(overrides).filter(k => overrides[k] && HEX_RE.test(overrides[k])).length : 0;
  const effective = resolveSectionColors(scheme, overrides);

  return (
    <div style={{
      marginBottom: 14,
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      background: '#fff',
      overflow: 'hidden',
    }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 12px', background: '#fff', border: 'none',
          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'inline-start',
        }}
      >
        <i className={`fas fa-${open ? 'chevron-down' : 'chevron-right'}`} style={{ fontSize: 11, color: '#64748b' }} />
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
          Customize colors for this section
        </span>
        {overrideCount > 0 && (
          <span style={{
            background: '#eff6ff', color: '#2563eb',
            fontSize: 10, fontWeight: 700,
            padding: '2px 8px', borderRadius: 10,
          }}>
            {overrideCount} override{overrideCount > 1 ? 's' : ''}
          </span>
        )}
      </button>

      {open && (
        <div style={{ padding: '4px 12px 12px', borderTop: '1px solid #f1f5f9' }}>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '8px 0 12px' }}>
            Override individual colors for this section only. Cleared cells fall
            back to the assigned scheme.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {slots.map(slot => (
              <SlotRow
                key={slot}
                slot={slot}
                label={SLOT_LABELS[slot] || slot}
                schemeColor={scheme ? scheme[slot] : null}
                overrideColor={overrides ? overrides[slot] : null}
                effectiveColor={effective[slot]}
                onChange={(val) => onChange(slot, val)}
              />
            ))}
          </div>

          {overrideCount > 0 && (
            <button
              type="button"
              onClick={onResetAll}
              style={{
                marginTop: 12, padding: '6px 10px',
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 6, fontSize: 11, color: '#dc2626',
                cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit',
              }}
            >
              <i className="fas fa-undo" style={{ marginInlineEnd: 5, fontSize: 9 }} />
              Reset all to scheme
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SlotRow({ slot, label, schemeColor, overrideColor, effectiveColor, onChange }) {
  const hasOverride = overrideColor && HEX_RE.test(overrideColor);
  const value = effectiveColor || '#000000';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 10px', background: '#f8fafc',
      border: '1px solid #e2e8f0', borderRadius: 6,
    }}>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: 32, height: 32, border: 'none', borderRadius: 4,
          padding: 0, cursor: 'pointer', background: 'transparent',
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{label}</div>
        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>
          {hasOverride ? (
            <>Override · scheme is <code style={{ background: '#fff', padding: '0 4px', borderRadius: 3 }}>{schemeColor || '—'}</code></>
          ) : (
            <>Using scheme color</>
          )}
        </div>
      </div>
      <input
        type="text"
        value={overrideColor || ''}
        placeholder={schemeColor || ''}
        onChange={(e) => {
          let v = e.target.value.trim();
          if (v && !v.startsWith('#')) v = '#' + v;
          if (v === '') {
            onChange(null);
          } else {
            onChange(v);
          }
        }}
        spellCheck={false}
        style={{
          width: 88, padding: '5px 7px',
          border: `1px solid ${(!overrideColor || HEX_RE.test(overrideColor)) ? '#cbd5e1' : '#fca5a5'}`,
          borderRadius: 5, fontSize: 11, color: '#0f172a',
          fontFamily: 'monospace', textAlign: 'center',
        }}
      />
      {hasOverride && (
        <button
          type="button"
          onClick={() => onChange(null)}
          title="Reset to scheme"
          style={{
            width: 26, height: 26, padding: 0,
            background: '#fff', border: '1px solid #e2e8f0',
            borderRadius: 5, cursor: 'pointer',
            color: '#94a3b8', fontSize: 10,
          }}
        >
          <i className="fas fa-times" />
        </button>
      )}
    </div>
  );
}
