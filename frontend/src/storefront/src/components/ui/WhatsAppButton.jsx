import React, { useState, useEffect, useContext } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';

export default function WhatsAppButton() {
  const { siteConfig } = useContext(SiteContext);
  const [showTooltip, setShowTooltip] = useState(false);

  const whatsapp = siteConfig?.whatsapp || '';
  const phone = siteConfig?.phone || '';
  const showFloatingButton = siteConfig?.showFloatingButton !== false;

  useEffect(() => {
    const timer = setTimeout(() => setShowTooltip(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!showFloatingButton) return null;
  if (!whatsapp && !phone) return null;

  if (whatsapp) {
    const href = `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent("Hi! I would like to know more about your products. Can you help me?")}`;
    return (
      <>
        <a href={href} className="whatsapp-btn" target="_blank" rel="noopener noreferrer">
          <i className="fab fa-whatsapp" />
        </a>
        {showTooltip && (
          <div className="whatsapp-tooltip" onClick={() => setShowTooltip(false)}>
            Chat with us!
          </div>
        )}
      </>
    );
  }

  const smsHref = `sms:${phone.replace(/[^0-9+]/g, '')}`;
  return (
    <>
      <a href={smsHref} className="whatsapp-btn sms-btn">
        <i className="fas fa-comment" />
      </a>
      {showTooltip && (
        <div className="whatsapp-tooltip" onClick={() => setShowTooltip(false)}>
          Message us!
        </div>
      )}
    </>
  );
}
