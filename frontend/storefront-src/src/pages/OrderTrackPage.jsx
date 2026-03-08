import React, { useEffect, useContext } from 'react';
import { SiteContext } from '../context/SiteContext.jsx';

export default function OrderTrackPage() {
  const { siteConfig } = useContext(SiteContext);

  useEffect(() => {
    const trackUrl = siteConfig?.settings?.orderTrackUrl;
    if (trackUrl) {
      window.location.href = trackUrl;
    }
  }, [siteConfig]);

  const trackUrl = siteConfig?.settings?.orderTrackUrl;

  if (trackUrl) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTop: '3px solid #1e293b', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#64748b' }}>Redirecting to order tracking...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <i className="fas fa-truck" style={{ fontSize: 28, color: '#64748b' }} />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Order Tracking</h1>
        <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: 24 }}>
          Order tracking is managed externally. Please contact the store for updates on your order status.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          {siteConfig?.phone && (
            <a
              href={`tel:${siteConfig.phone}`}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 24px', background: '#1e293b', color: 'white', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 15 }}
            >
              <i className="fas fa-phone" />
              Call {siteConfig.phone}
            </a>
          )}
          {siteConfig?.phone && (
            <a
              href={`https://wa.me/${(siteConfig.phone || '').replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 24px', background: '#25d366', color: 'white', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 15 }}
            >
              <i className="fab fa-whatsapp" />
              WhatsApp Us
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
