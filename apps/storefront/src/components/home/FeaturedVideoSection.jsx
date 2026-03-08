import React, { useRef, useContext } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';

export default function FeaturedVideoSection() {
  const { siteConfig } = useContext(SiteContext);
  const videoRef = useRef(null);

  const videoUrl = siteConfig?.settings?.featuredVideoUrl;
  const title = siteConfig?.settings?.featuredVideoTitle || siteConfig?.brand_name || 'Our Story';
  const description = siteConfig?.settings?.featuredVideoDesc || 'Discover our exclusive collection';
  const phone = siteConfig?.phone || '';
  const whatsappNumber = phone.replace(/\D/g, '');

  if (!videoUrl) return null;

  return (
    <section className="featured-video-section" style={{ position: 'relative', overflow: 'hidden', minHeight: 400 }}>
      <video
        ref={videoRef}
        src={videoUrl}
        autoPlay
        loop
        muted
        playsInline
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
      />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1 }} />
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, padding: '60px 20px', textAlign: 'center' }}>
        <div>
          <h2 style={{ fontSize: 'clamp(24px, 5vw, 48px)', fontWeight: 700, color: 'white', marginBottom: 16, lineHeight: 1.2 }}>{title}</h2>
          <p style={{ fontSize: 'clamp(14px, 2vw, 18px)', color: 'rgba(255,255,255,0.85)', marginBottom: 32, maxWidth: 600, margin: '0 auto 32px' }}>{description}</p>
          {whatsappNumber && (
            <a
              href={`https://wa.me/${whatsappNumber}?text=Hello! I'd like to know more about your products.`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '14px 32px',
                background: '#25d366',
                color: 'white',
                borderRadius: 50,
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: 16,
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 4px 20px rgba(37,211,102,0.4)',
              }}
            >
              <i className="fab fa-whatsapp" style={{ fontSize: 20 }} />
              CHAT NOW
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
