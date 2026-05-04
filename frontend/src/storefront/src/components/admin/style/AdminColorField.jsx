import React from 'react';

// Shared color field used by all section style editors. Composite swatch +
// hex text input + reset, wrapped in a single bordered container so it reads
// as one unified control.
//
// Props:
//  - label: visible field label
//  - value: current saved value (empty string = use template default)
//  - fallback: hex value to render in the swatch when no value is set
//  - onChange: (newValue: string) => void — pass '' to reset
export default function AdminColorField({ label, value, fallback, onChange }) {
  const display = value || fallback;
  return (
    <div>
      <label style={fieldLabelStyle}>{label}</label>
      <div style={containerStyle}>
        <label style={{ ...swatchStyle, background: display }}>
          <input
            type="color"
            value={display}
            onChange={e => onChange(e.target.value)}
            style={hiddenColorInputStyle}
          />
        </label>
        <input
          type="text"
          value={value || fallback}
          onChange={e => {
            const v = e.target.value;
            onChange(v === fallback ? '' : v);
          }}
          style={textInputStyle}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            title="Reset to default"
            style={resetButtonStyle}
          >Reset</button>
        )}
      </div>
    </div>
  );
}

const fieldLabelStyle = { display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 };

const containerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: 6,
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  background: '#fff',
};

const swatchStyle = {
  position: 'relative',
  width: 36,
  height: 36,
  borderRadius: 6,
  border: '1px solid #e2e8f0',
  cursor: 'pointer',
  flexShrink: 0,
  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.4)',
};

const hiddenColorInputStyle = {
  position: 'absolute',
  inset: 0,
  opacity: 0,
  cursor: 'pointer',
  width: '100%',
  height: '100%',
};

const textInputStyle = {
  flex: 1,
  border: 'none',
  padding: '6px 4px',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 13,
  outline: 'none',
  background: 'transparent',
};

const resetButtonStyle = {
  padding: '6px 10px',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  fontSize: 12,
  color: '#475569',
  cursor: 'pointer',
  flexShrink: 0,
};
