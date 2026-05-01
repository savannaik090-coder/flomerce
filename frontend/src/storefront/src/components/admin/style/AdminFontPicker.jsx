import React, { useState } from 'react';
import { FONT_GROUPS, FONT_LOOKUP } from './fontCatalog.js';

// Shared font picker — category tabs + grid of cards rendering each font in
// its actual face. Used by promo banner / navigation / side panel editors.
//
// Props:
//  - value: current saved font-family stack (empty string = template default)
//  - onChange: (newValue: string) => void — pass '' to reset
//  - label: visible label (default 'Font Family')
export default function AdminFontPicker({ value, onChange, label = 'Font Family' }) {
  const [activeGroup, setActiveGroup] = useState(() => {
    const found = FONT_LOOKUP.find(f => f.value === value);
    return found ? found.group : FONT_GROUPS[0].label;
  });

  const visibleFonts = FONT_GROUPS.find(g => g.label === activeGroup)?.fonts || [];
  const selectedName = FONT_LOOKUP.find(f => f.value === value)?.name;

  return (
    <div>
      <div style={headerRow}>
        <label style={fieldLabel}>
          {label}
          {selectedName && (
            <span style={{ color: '#64748b', fontWeight: 400, marginLeft: 6 }}>· {selectedName}</span>
          )}
        </label>
        {value && (
          <button type="button" onClick={() => onChange('')} style={resetLink}>
            Use template default
          </button>
        )}
      </div>

      {/* Category tabs */}
      <div style={tabRow}>
        {FONT_GROUPS.map(group => {
          const active = group.label === activeGroup;
          return (
            <button
              key={group.label}
              type="button"
              onClick={() => setActiveGroup(group.label)}
              style={{
                ...tabButton,
                background: active ? '#fff' : 'transparent',
                color: active ? '#0f172a' : '#64748b',
                fontWeight: active ? 600 : 500,
                boxShadow: active ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
            >{group.label}</button>
          );
        })}
      </div>

      {/* Font cards grid */}
      <div style={cardGrid}>
        {visibleFonts.map(font => {
          const selected = font.value === value;
          return (
            <button
              key={font.name}
              type="button"
              onClick={() => onChange(font.value)}
              style={{
                ...fontCard,
                background: selected ? '#0f172a' : '#fff',
                color: selected ? '#fff' : '#0f172a',
                border: `1.5px solid ${selected ? '#0f172a' : '#e2e8f0'}`,
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
              {selected && <div style={checkBadge}>✓</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const fieldLabel = { display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 0 };

const headerRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 6,
};

const resetLink = {
  fontSize: 12,
  color: '#475569',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  padding: 0,
  textDecoration: 'underline',
};

const tabRow = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
  marginBottom: 12,
  padding: 4,
  background: '#f1f5f9',
  borderRadius: 8,
};

const tabButton = {
  flex: '1 1 auto',
  padding: '7px 10px',
  border: 'none',
  borderRadius: 6,
  fontSize: 13,
  cursor: 'pointer',
  transition: 'all 120ms ease',
};

const cardGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
  gap: 10,
};

const fontCard = {
  position: 'relative',
  padding: '14px 12px',
  borderRadius: 8,
  cursor: 'pointer',
  textAlign: 'center',
  transition: 'all 120ms ease',
};

const checkBadge = {
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
};
