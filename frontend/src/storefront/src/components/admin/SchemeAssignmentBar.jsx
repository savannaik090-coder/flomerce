import React, { useMemo } from 'react';

// Drop-in dropdown for every section editor. Reads the merchant's schemes
// from the live theme_config and lets them switch which scheme drives the
// section being edited. The save flow is centralized in VisualCustomizer
// (themeConfig.sectionAssignments[sectionId]), and live preview happens via
// the FLOMERCE_PREVIEW_UPDATE postMessage.
//
// `themeConfig` and the change handlers come from VisualCustomizer via
// React context-less prop threading on each editor — this is the lightest-
// touch integration that doesn't force a refactor of every editor's state.
export default function SchemeAssignmentBar({
  sectionId,
  themeConfig,
  onAssign,
  label = 'Color scheme',
}) {
  const schemes = useMemo(() => {
    if (!themeConfig || !Array.isArray(themeConfig.schemes)) return [];
    return themeConfig.schemes;
  }, [themeConfig]);

  if (!sectionId || schemes.length === 0) return null;

  const assignments = (themeConfig && themeConfig.sectionAssignments) || {};
  const defaultScheme = schemes.find(s => s.isDefault) || schemes[0];
  const currentId = assignments[sectionId] || defaultScheme.id;
  const current = schemes.find(s => s.id === currentId) || defaultScheme;

  return (
    <div style={{
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      <div style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        flexShrink: 0,
        background: current.background,
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        <div style={{
          width: 14, height: 14, borderRadius: '50%',
          background: current.button,
          border: `1px solid ${current.text}`,
        }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11, fontWeight: 600, color: '#64748b',
          textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4,
        }}>
          {label}
        </div>
        <select
          value={currentId}
          onChange={(e) => onAssign && onAssign(sectionId, e.target.value)}
          style={{
            width: '100%',
            padding: '7px 10px',
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            fontSize: 13,
            background: '#fff',
            color: '#0f172a',
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          {schemes.map(s => (
            <option key={s.id} value={s.id}>{s.name}{s.isDefault ? ' (default)' : ''}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
