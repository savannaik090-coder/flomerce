import React from 'react';
export default function ConfirmModal({ open, title, message, confirmText, cancelText, onConfirm, onCancel, danger }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={onCancel}>
      <div style={{ background: '#fff', borderRadius: 10, padding: 28, width: '90%', maxWidth: 380, boxShadow: '0 10px 40px rgba(0,0,0,0.2)', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>
          {danger ? '⚠️' : 'ℹ️'}
        </div>
        <h3 style={{ margin: '0 0 8px', fontSize: 17, color: '#1a1a1a' }}>{title || "Are you sure?"}</h3>
        {message && <p style={{ margin: '0 0 24px', fontSize: 14, color: '#666', lineHeight: 1.5 }}>{message}</p>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={onCancel}
            style={{ padding: '9px 22px', borderRadius: 6, border: '1px solid #ddd', background: '#f5f5f5', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}
          >
            {cancelText || "Cancel"}
          </button>
          <button
            onClick={onConfirm}
            style={{ padding: '9px 22px', borderRadius: 6, border: 'none', background: danger ? '#ef4444' : '#2196f3', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit' }}
          >
            {confirmText || "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
