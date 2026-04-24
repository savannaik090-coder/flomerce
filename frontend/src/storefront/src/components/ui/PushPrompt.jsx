import React from 'react';
import TranslatedText from '../TranslatedText';
export default function PushPrompt({ onAllow, onDismiss }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 80,
      left: '50%',
      transform: 'translateX(-50%)',
      background: '#1e293b',
      color: '#fff',
      borderRadius: 14,
      padding: '16px 20px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      maxWidth: 380,
      width: 'calc(100vw - 32px)',
      animation: 'slideUp 0.3s ease',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <i className="fas fa-bell" style={{ fontSize: 18 }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}><TranslatedText text="Stay Updated" /></div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}><TranslatedText text="Get notified about new products and offers" /></div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        <button
          onClick={onAllow}
          style={{
            background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8,
            padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          <TranslatedText text="Allow" />
        </button>
        <button
          onClick={onDismiss}
          style={{
            background: 'transparent', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 8, padding: '7px 14px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          <TranslatedText text="No thanks" />
        </button>
      </div>
      <style>{`@keyframes slideUp { from { opacity:0; transform: translateX(-50%) translateY(20px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }`}</style>
    </div>
  );
}
