import React, { useState, useEffect, useContext } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';

export default function WhatsAppButton() {
  const { siteConfig } = useContext(SiteContext);
  const [showTooltip, setShowTooltip] = useState(false);

  const phone = siteConfig?.phone || '';
  const whatsapp = siteConfig?.whatsapp || '';
  const showFloatingButton = siteConfig?.showFloatingButton !== false;

  useEffect(() => {
    const timer = setTimeout(() => setShowTooltip(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!showFloatingButton) return null;
  if (!whatsapp && !phone) return null;

  const isWhatsApp = !!whatsapp;
  const contactNumber = whatsapp || phone;

  const href = isWhatsApp
    ? `https://wa.me/${contactNumber.replace(/\D/g, '')}?text=${encodeURIComponent("Hi! I would like to know more about your products. Can you help me?")}`
    : `tel:${contactNumber.replace(/[^0-9+]/g, '')}`;

  return (
    <>
      <a href={href} className={isWhatsApp ? 'whatsapp-btn' : 'whatsapp-btn phone-btn'} target={isWhatsApp ? '_blank' : '_self'} rel="noopener noreferrer">
        <i className={isWhatsApp ? 'fab fa-whatsapp' : 'fas fa-phone'} />
      </a>
      {showTooltip && (
        <div className="whatsapp-tooltip" onClick={() => setShowTooltip(false)}>
          {isWhatsApp ? 'Chat with us!' : 'Call us!'}
        </div>
      )}
    </>
  );
}
