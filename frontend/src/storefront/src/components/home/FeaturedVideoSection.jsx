import React from 'react';
import { useSiteConfig } from '../../hooks/useSiteConfig.js';

import { getFeaturedVideoDefaults } from '../../defaults/index.js';
import TranslatedText from '../TranslatedText.jsx';

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
        {title && <h1 className="fv-title"><TranslatedText text={title} /></h1>}
        {description && <p className="fv-description"><TranslatedText text={description} /></p>}
        <button className="fv-chat-btn" onClick={handleChatClick}>
          <TranslatedText text={chatButtonText} />
        </button>
      </div>
    </section>
  );
}
