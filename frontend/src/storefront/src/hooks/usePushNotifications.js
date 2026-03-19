import { useState, useEffect, useContext, useRef } from 'react';
import { SiteContext } from '../context/SiteContext.jsx';
import { AuthContext } from '../context/AuthContext.jsx';
import { getApiUrl } from '../services/api.js';

const STORAGE_KEY = 'push_subscription_state';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function usePushNotifications() {
  const { siteConfig } = useContext(SiteContext);
  const authCtx = useContext(AuthContext);
  const customer = authCtx?.user || null;

  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [swReady, setSwReady] = useState(false);
  const registrationRef = useRef(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (!siteConfig?.vapidPublicKey) return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'denied' || stored === 'subscribed') {
      if (stored === 'subscribed') setIsSubscribed(true);
      return;
    }

    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        registrationRef.current = reg;
        setSwReady(true);

        return reg.pushManager.getSubscription();
      })
      .then((existing) => {
        if (existing) {
          setIsSubscribed(true);
          localStorage.setItem(STORAGE_KEY, 'subscribed');
        } else {
          setPermission(Notification.permission);
          if (Notification.permission === 'default') {
            setTimeout(() => setShowPrompt(true), 5000);
          }
        }
      })
      .catch((err) => {
        console.warn('[Push] Service worker registration failed:', err);
      });
  }, [siteConfig?.vapidPublicKey]);

  async function subscribe() {
    if (!registrationRef.current || !siteConfig?.vapidPublicKey || !siteConfig?.id) return false;

    try {
      const appServerKey = urlBase64ToUint8Array(siteConfig.vapidPublicKey);
      const subscription = await registrationRef.current.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey,
      });

      const keys = subscription.toJSON().keys;

      await fetch(getApiUrl('/api/notifications/subscribe'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: siteConfig.id,
          endpoint: subscription.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userId: customer?.id || null,
        }),
      });

      setIsSubscribed(true);
      setShowPrompt(false);
      localStorage.setItem(STORAGE_KEY, 'subscribed');
      return true;
    } catch (err) {
      console.warn('[Push] Subscribe failed:', err);
      if (Notification.permission === 'denied') {
        setPermission('denied');
        localStorage.setItem(STORAGE_KEY, 'denied');
      }
      return false;
    }
  }

  async function unsubscribe() {
    if (!registrationRef.current || !siteConfig?.id) return false;

    try {
      const existing = await registrationRef.current.pushManager.getSubscription();
      if (existing) {
        const endpoint = existing.endpoint;
        await existing.unsubscribe();
        await fetch(getApiUrl('/api/notifications/unsubscribe'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteId: siteConfig.id, endpoint }),
        });
      }
      setIsSubscribed(false);
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (err) {
      console.warn('[Push] Unsubscribe failed:', err);
      return false;
    }
  }

  function dismissPrompt() {
    setShowPrompt(false);
    localStorage.setItem(STORAGE_KEY, 'denied');
  }

  return { permission, isSubscribed, showPrompt, subscribe, unsubscribe, dismissPrompt };
}
