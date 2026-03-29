import React from 'react';
import { useSiteConfig } from '../../hooks/useSiteConfig.js';

import { getFeaturedVideoDefaults } from '../../defaults/index.js';

export default function FeaturedVideoSection() {
  const { siteConfig } = useSiteConfig();

  const settings = siteConfig?.settings || {};
  const category = siteConfig?.category || '';
  const categoryDefaults = getFeaturedVideoDefaults(category);
  const title = settings.featuredVideoTitle || categoryDefaults.title;
  const description = settings.featuredVideoDescription || categoryDefaults.description;
  const videoUrl = settings.featuredVideoUrl || '';
  const chatLink = settings.featuredVideoChatLink || '';
  const chatButtonText = settings.featuredVideoChatButtonText || 'CHAT NOW';
  const phone = siteConfig?.phone || '';

  const handleChatClick = () => {
    if (chatLink) {
      window.open(chatLink, '_blank');
    } else if (phone) {
      const msg = encodeURIComponent("Hi! I'm interested. Can you help me?");
      window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${msg}`, '_blank');
    }
  };

  if (settings.showFeaturedVideo === false) return null;

  return (
    <section className="fv-section">
      <div className="fv-background">
        {videoUrl ? (
          <video autoPlay muted loop playsInline className="fv-video">
            <source src={videoUrl} type="video/mp4" />
          </video>
        ) : (
          <div className="fv-placeholder-bg"></div>
        )}
        <div className="fv-overlay"></div>
      </div>
      <div className="fv-content">
        {title && <h1 className="fv-title">{title}</h1>}
        {description && <p className="fv-description">{description}</p>}
        {(chatLink || phone) && (
          <button className="fv-chat-btn" onClick={handleChatClick}>
            {chatButtonText}
          </button>
        )}
      </div>
    </section>
  );
}
