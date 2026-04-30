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

  // The dropdown's first entry is a synthetic "Default (use original design)"
  // option. Picking it clears the section's scheme assignment, which makes
  // SchemeScope render the section pristine — no CSS injected, original
  // storefront styling preserved exactly. Picking any named scheme overrides
  // the original colours with that scheme's palette.
  const DEFAULT_VALUE = '__default__';
  const assignments = (themeConfig && themeConfig.sectionAssignments) || {};
  const rawAssignedId = assignments[sectionId] || null;
  // Backend normalises a "missing" assignment by filling it with the
  // default scheme's id, so on reload an unassigned section comes back as
  // assigned-to-default. Treat that case identically to "no assignment" —
  // the dropdown shows "Default (use original design)" and no scoped CSS
  // is emitted by SchemeScope. Only NON-default scheme ids count as an
  // explicit override.
  const defaultScheme = schemes.find(s => s.isDefault) || null;
  const isExplicit = !!(rawAssignedId && (!defaultScheme || rawAssignedId !== defaultScheme.id));
  const currentValue = isExplicit ? rawAssignedId : DEFAULT_VALUE;
  const current = isExplicit ? (schemes.find(s => s.id === rawAssignedId) || null) : null;

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
        background: current ? current.background : 'repeating-linear-gradient(45deg,#f1f5f9 0 6px,#fff 6px 12px)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        {current ? (
          <div style={{
            width: 14, height: 14, borderRadius: '50%',
            background: current.button,
            border: `1px solid ${current.text}`,
          }} />
        ) : (
          <i className="fas fa-undo" style={{ fontSize: 11, color: '#64748b' }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11, fontWeight: 600, color: '#64748b',
          textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4,
        }}>
          {label}
        </div>
        <select
          value={currentValue}
          onChange={(e) => {
            const v = e.target.value;
            // The synthetic "default" option clears the assignment entirely.
            if (!onAssign) return;
            if (v === DEFAULT_VALUE) onAssign(sectionId, null);
            else onAssign(sectionId, v);
          }}
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
          <option value={DEFAULT_VALUE}>Use site default (Brand)</option>
          {schemes.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
