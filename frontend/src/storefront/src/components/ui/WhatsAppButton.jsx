import React, { useState, useEffect, useContext } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';

function getFacebookPageName(facebookUrl) {
  if (!facebookUrl) return null;
  try {
    const url = new URL(facebookUrl.startsWith('http') ? facebookUrl : `https://${facebookUrl}`);
    const parts = url.pathname.replace(/^\/+|\/+$/g, '').split('/');
    return parts[0] || null;
  } catch {
    return null;
  }
}

export default function WhatsAppButton() {
  const { siteConfig } = useContext(SiteContext);
  const [showTooltip, setShowTooltip] = useState(false);

  const whatsapp = siteConfig?.whatsapp || '';
  const showFloatingButton = siteConfig?.showFloatingButton !== false;

  const facebookUrl = siteConfig?.settings?.social?.facebook || siteConfig?.socialLinks?.facebook || '';
  const messengerPage = getFacebookPageName(facebookUrl);

  useEffect(() => {
    const timer = setTimeout(() => setShowTooltip(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!showFloatingButton) return null;

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

  if (messengerPage) {
    const href = `https://m.me/${messengerPage}`;
    return (
      <>
        <a href={href} className="whatsapp-btn messenger-btn" target="_blank" rel="noopener noreferrer">
          <i className="fab fa-facebook-messenger" />
        </a>
        {showTooltip && (
          <div className="whatsapp-tooltip" onClick={() => setShowTooltip(false)}>
            Message us!
          </div>
        )}
      </>
    );
  }

  return null;
}
