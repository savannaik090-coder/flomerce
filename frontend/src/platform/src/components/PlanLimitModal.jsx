import React from 'react';

export function isPlanError(err) {
  if (!err) return false;
  const code = err.code || '';
  const status = err.status || 0;
  return code === 'PLAN_LIMIT_REACHED' || code === 'FEATURE_LOCKED' || (status === 403 && /upgrade|plan|limit/i.test(err.message || ''));
}

export default function PlanLimitModal({ message, onClose }) {
  if (!message) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16, padding: '2rem',
          maxWidth: 420, width: '90%', textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.25rem',
        }}>
          <i className="fas fa-crown" style={{ fontSize: 28, color: '#d97706' }} />
        </div>

        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
          Upgrade Required
        </h3>

        <p style={{ margin: '0 0 1.5rem', fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6 }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.6rem 1.25rem', borderRadius: 8,
              border: '1px solid #e2e8f0', background: '#fff',
              fontSize: '0.875rem', fontWeight: 500, color: '#64748b',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Maybe Later
          </button>
          <button
            onClick={() => { onClose(); document.querySelector('[data-page="billing"]')?.click(); }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '0.6rem 1.5rem', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: '#fff', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600,
              textDecoration: 'none', border: 'none', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(79,70,229,0.3)', fontFamily: 'inherit',
            }}
          >
            <i className="fas fa-arrow-up" style={{ fontSize: 12 }} />
            Upgrade Plan
          </button>
        </div>
      </div>
    </div>
  );
}
