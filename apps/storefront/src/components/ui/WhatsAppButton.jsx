import React, { useState, useEffect, useContext } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';

export default function WhatsAppButton() {
  const { siteConfig } = useContext(SiteContext);
  const [showTooltip, setShowTooltip] = useState(false);

  const phone = siteConfig?.phone || '';

  useEffect(() => {
    const timer = setTimeout(() => setShowTooltip(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!phone) return null;

  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent("Hi! I would like to know more about your products. Can you help me?")}`;

  return (
    <>
      <a href={whatsappUrl} className="whatsapp-btn" target="_blank" rel="noopener noreferrer">
        <i className="fab fa-whatsapp"></i>
      </a>
      {showTooltip && (
        <div className="whatsapp-tooltip" onClick={() => setShowTooltip(false)}>
          How can I help you?
        </div>
      )}
    </>
  );
}
