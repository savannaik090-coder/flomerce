import React, { useEffect } from 'react';
import { setEditorDirty } from '../../admin/editorDirtyStore.js';

export default function SaveBar({ saving, hasChanges, onSave, topBar = false }) {
  useEffect(() => {
    setEditorDirty(hasChanges);
  }, [hasChanges]);

  if (topBar) {
    if (!hasChanges) return null;
    return (
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff',
        padding: '12px 20px', borderRadius: 10, marginBottom: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fas fa-info-circle" />
          <span style={{ fontSize: 14, fontWeight: 500 }}>You have unsaved changes</span>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          style={{
            padding: '8px 24px', background: '#fff', color: '#2563eb',
            border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
            cursor: 'pointer', opacity: saving ? 0.7 : 1,
          }}
        >{saving ? "Saving..." : "Save Changes"}</button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 24, textAlign: 'center' }}>
      <button
        type="button"
        onClick={onSave}
        disabled={saving || !hasChanges}
        style={{
          padding: '12px 40px',
          background: hasChanges ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : '#e2e8f0',
          color: hasChanges ? '#fff' : '#94a3b8',
          border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600,
          cursor: hasChanges ? 'pointer' : 'default',
          opacity: saving ? 0.7 : 1,
          boxShadow: hasChanges ? '0 4px 12px rgba(59,130,246,0.3)' : 'none',
          transition: 'all 0.3s ease',
        }}
      >{saving ? "Saving..." : hasChanges ? "Save All Changes" : "All Changes Saved"}</button>
    </div>
  );
}
