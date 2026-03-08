import React from 'react';
import { useSiteConfig } from '../../hooks/useSiteConfig.js';

export default function BridalSection() {
  const { siteConfig } = useSiteConfig();

  const title = siteConfig?.settings?.bridalTitle || "Let's Create Your Perfect Bridal Jewelry";
  const description =
    siteConfig?.settings?.bridalDescription ||
    'Dreaming of something truly elegant? Discover our exquisite jewelry collection. Connect with our designers and create your perfect bridal ensemble.';
  const videoUrl = siteConfig?.settings?.bridalVideoUrl || '';
  const phone = siteConfig?.phone || '';

  const openWhatsApp = () => {
    const msg = encodeURIComponent("Hi! I'm interested. Can you help me?");
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${msg}`, '_blank');
  };

  if (!videoUrl && !siteConfig?.settings?.bridalImage) return null;

  return (
    <section className="bridal-jewelry-section">
      <div className="video-background">
        {videoUrl ? (
          <video autoPlay muted loop playsInline className="background-video">
            <source src={videoUrl} type="video/mp4" />
          </video>
        ) : (
          <img
            src={siteConfig.settings.bridalImage}
            alt={title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
        <div className="video-overlay"></div>
      </div>
      <div className="bridal-content">
        <h1 className="bridal-title">{title}</h1>
        <p className="bridal-description">{description}</p>
        {phone && (
          <button className="chat-now-btn" onClick={openWhatsApp}>
            CHAT NOW
          </button>
        )}
      </div>
    </section>
  );
}
