import React from 'react';

const toggleContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 16px',
  background: '#f8fafc',
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  marginBottom: 20,
};

const toggleLabelStyle = {
  fontSize: 14,
  fontWeight: 600,
  color: '#334155',
};

const toggleDescStyle = {
  fontSize: 12,
  color: '#64748b',
  marginTop: 2,
};

const switchStyle = (enabled) => ({
  position: 'relative',
  width: 44,
  height: 24,
  borderRadius: 12,
  background: enabled ? '#2563eb' : '#cbd5e1',
  cursor: 'pointer',
  transition: 'background 0.2s ease',
  border: 'none',
  padding: 0,
  flexShrink: 0,
});

const knobStyle = (enabled) => ({
  position: 'absolute',
  top: 2,
  left: enabled ? 22 : 2,
  width: 20,
  height: 20,
  borderRadius: '50%',
  background: '#fff',
  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  transition: 'left 0.2s ease',
});

export default function SectionToggle({ enabled, onChange, label, description }) {
  return (
    <div style={toggleContainerStyle}>
      <div>
        <div style={toggleLabelStyle}>{label || 'Show this section'}</div>
        {description && <div style={toggleDescStyle}>{description}</div>}
      </div>
      <button
        type="button"
        style={switchStyle(enabled)}
        onClick={() => onChange(!enabled)}
        aria-label={enabled ? 'Disable section' : 'Enable section'}
      >
        <div style={knobStyle(enabled)} />
      </button>
    </div>
  );
}
