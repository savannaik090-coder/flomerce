// Firebase Messaging Service Worker
// Standard FCM implementation for background notifications
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyCrLCButDevLeILcBjrUCd9e7amXVjW-uI",
    authDomain: "auric-a0c92.firebaseapp.com",
    projectId: "auric-a0c92",
    storageBucket: "auric-a0c92.firebasestorage.app",
    messagingSenderId: "878979958342",
    appId: "1:878979958342:web:e6092f7522488d21eaec47"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification click received');
    console.log('[SW] Action:', event.action);
    console.log('[SW] Data:', event.notification.data);
    
    // CRITICAL: Close notification manually
    // Chrome Android bug: action buttons dismiss instead of executing
    event.notification.close();

    // Handle explicit dismiss action
    if (event.action === 'close') {
        console.log('[SW] User clicked Dismiss button');
        return;
    }

    // Prepare target URL from notification data
    let targetUrl = '/';
    try {
        targetUrl = event.notification?.data?.link || '/';
    } catch (e) {
        console.error('[SW] Error parsing notification data:', e);
    }

    // Ensure absolute URL (required for clients.openWindow)
    if (targetUrl.startsWith('/')) {
        targetUrl = self.location.origin + targetUrl;
    }

    console.log('[SW] Target URL:', targetUrl);
    console.log('[SW] Action Button Clicked - attempting to navigate...');

    // Use event.waitUntil to keep the service worker alive
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                console.log('[SW] Found', clientList.length, 'open windows');
                
                // 1. Try to focus an existing window already on target URL
                for (const client of clientList) {
                    console.log('[SW] Checking window:', client.url);
                    if (client.url === targetUrl && 'focus' in client) {
                        console.log('[SW] Found matching window, focusing it');
                        return client.focus();
                    }
                }

                // 2. No matching window found, try to open new one
                if (clients.openWindow) {
                    console.log('[SW] No matching window, opening new one');
                    return clients.openWindow(targetUrl)
                        .then((newClient) => {
                            if (newClient) {
                                console.log('[SW] New window opened successfully');
                                return newClient;
                            } else {
                                console.warn('[SW] ⚠️  clients.openWindow returned NULL');
                                console.warn('[SW] This is a known Chrome Android bug (crbug.com/463146)');
                                console.warn('[SW] Action buttons on Android may not provide transient activation token');
                                
                                // Fallback: Focus first available window
                                if (clientList.length > 0) {
                                    console.log('[SW] Fallback: focusing first available window');
                                    return clientList[0].focus();
                                }
                                return null;
                            }
                        });
                } else {
                    console.error('[SW] clients.openWindow is not available');
                }
            })
            .catch((error) => {
                console.error('[SW] Error handling notification click:', error);
            })
    );
});

// Function to display notification with image and button
function displayNotification(payload) {
    console.log('[firebase-messaging-sw.js] DISPLAYING NOTIFICATION');
    console.log('[firebase-messaging-sw.js] Full payload:', JSON.stringify(payload, null, 2));
    
    // In FCM v1, data arrives in payload.data
    const data = payload.data || {};
    
    const notificationId = data.timestamp || Date.now().toString();
    
    const title = data.title || 'Royal Meenakari';
    const body = data.body || 'New update from Royal Meenakari';
    const image = data.imageUrl || data.image || '';
    const buttonText = data.buttonText || 'View';
    const icon = data.icon || '/images/logos/royalmeenakari.png';
    const link = data.link || '/';
    
    const options = {
        body: body,
        icon: icon,
        badge: icon,
        image: image,
        tag: notificationId,
        data: {
            link: link
        },
        actions: [
            { 
                action: 'view', 
                title: buttonText
            },
            {
                action: 'close',
                title: 'Dismiss'
            }
        ]
    };
    
    console.log('[firebase-messaging-sw.js] Final Options:', JSON.stringify(options, null, 2));
    
    return self.registration.showNotification(title, options);
}

// Handle background messages (app is closed/not in focus)
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] onBackgroundMessage triggered');
    return displayNotification(payload);
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
    console.log('[firebase-messaging-sw.js] Notification closed by user');
});
