import React from 'react';
import { useSiteConfig } from '../../hooks/useSiteConfig.js';

const CATEGORY_DEFAULTS = {
  jewellery: {
    title: "Let's Create Your Perfect Bridal Jewelry",
    description: "Dreaming of something truly elegant? Discover our exquisite jewelry collection. Connect with our designers and create your perfect bridal ensemble",
  },
  clothing: {
    title: "Discover Your Perfect Style",
    description: "Explore our latest fashion collection crafted for every occasion. Connect with our stylists and find the perfect outfit that defines you",
  },
  electronics: {
    title: "Experience Next-Gen Technology",
    description: "Discover cutting-edge gadgets and smart devices. Connect with our tech experts and find the perfect product for your needs",
  },
};

const GENERIC_DEFAULTS = {
  title: "Discover Our Collection",
  description: "Explore our curated selection of premium products. Connect with us and find exactly what you're looking for",
};

export default function FeaturedVideoSection() {
  const { siteConfig } = useSiteConfig();

  const settings = siteConfig?.settings || {};
  const category = siteConfig?.category || '';
  const categoryDefaults = CATEGORY_DEFAULTS[category] || GENERIC_DEFAULTS;
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

  if (!videoUrl) return null;

  return (
    <section className="fv-section">
      <div className="fv-background">
        <video autoPlay muted loop playsInline className="fv-video">
          <source src={videoUrl} type="video/mp4" />
        </video>
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
