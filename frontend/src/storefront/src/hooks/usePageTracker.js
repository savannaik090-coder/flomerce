import { useEffect, useRef, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { SiteContext } from '../context/SiteContext.jsx';

function getVisitorId() {
  const key = 'flx_vid';
  let vid = localStorage.getItem(key);
  if (!vid) {
    vid = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(key, vid);
  }
  return vid;
}

export default function usePageTracker() {
  const location = useLocation();
  const { siteConfig } = useContext(SiteContext);
  const lastTracked = useRef('');

  useEffect(() => {
    if (!siteConfig?.id) return;
    if (location.pathname.startsWith('/admin')) return;

    const trackKey = location.pathname + location.search;
    if (trackKey === lastTracked.current) return;
    lastTracked.current = trackKey;

    const API_BASE = typeof window !== 'undefined' && window.location.hostname.endsWith('fluxe.in') ? '' : 'https://fluxe.in';

    try {
      const payload = {
        siteId: siteConfig.id,
        pagePath: location.pathname,
        referrer: document.referrer || '',
        visitorId: getVisitorId(),
      };

      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          `${API_BASE}/api/analytics/track`,
          new Blob([JSON.stringify(payload)], { type: 'application/json' })
        );
      } else {
        fetch(`${API_BASE}/api/analytics/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {});
      }
    } catch (e) {}
  }, [location.pathname, location.search, siteConfig?.id]);
}
