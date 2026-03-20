self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'New Notification', body: event.data.text() };
  }

  const title = data.title || 'Notification';
  const options = {
    body: data.body || data.message || '',
    icon: data.icon || undefined,
    image: data.image || undefined,
    data: data.data || {},
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };

  if (data.actions && Array.isArray(data.actions)) {
    options.actions = data.actions;
  }

  if (data.data?.url) {
    options.data.url = data.data.url;
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  let url = event.notification.data?.url;

  if (event.action && event.notification.data?.actionUrls) {
    url = event.notification.data.actionUrls[event.action] || url;
  }

  if (!url) return;

  try {
    url = new URL(url, self.location.origin).href;
  } catch (e) {
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
