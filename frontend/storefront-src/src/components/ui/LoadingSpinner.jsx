import React from 'react';

export default function LoadingSpinner({ size = 40, text = 'Loading...' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 20px', flexDirection: 'column', gap: 16 }}>
      <div style={{
        width: size, height: size,
        border: '3px solid #eee', borderTop: '3px solid #000',
        borderRadius: '50%', animation: 'spin 1s linear infinite',
      }} />
      {text && <p style={{ color: '#666', fontSize: 14 }}>{text}</p>}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
