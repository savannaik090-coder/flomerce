/**
 * Notification Registration Manager (V2 - Rebuilt)
 */
const notificationManager = {
    VAPID_KEY: 'BENFZQbE3p9n6YnjBdDwOySmVUao9Y9ryEH4_PJhsAKUMcUUfYDZV_c3BlZai6G77Rojwy2f0Ab540bfo5w2Mys',

    async init() {
        if (!('serviceWorker' in navigator) || !('Notification' in window)) {
            console.warn('Push notifications not supported');
            return;
        }

        try {
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log('SW registered:', registration.scope);
            
            const messaging = firebase.messaging();
            
            // Handle token refresh
            messaging.onTokenRefresh(async () => {
                const refreshedToken = await messaging.getToken();
                console.log('Token refreshed.');
                await this.saveToken(refreshedToken);
            });

            // Handle foreground messages
            messaging.onMessage((payload) => {
                console.log('Foreground message:', payload);
                // Only show if we haven't already shown it
                const title = payload.notification?.title || payload.data?.title || 'New Message';
                const body = payload.notification?.body || payload.data?.body;
                const options = {
                    body: body,
                    icon: '/images/logos/royalmeenakari.png',
                    data: { link: payload.data?.link || '/' }
                };
                new Notification(title, options);
            });

        } catch (error) {
            console.error('Notification init error:', error);
        }
    },

    async requestPermission() {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const messaging = firebase.messaging();
            try {
                const token = await messaging.getToken({ vapidKey: this.VAPID_KEY });
                if (token) {
                    console.log('Token obtained:', token);
                    await this.saveToken(token);
                    return true;
                }
            } catch (err) {
                console.error('Token error:', err);
            }
        }
        return false;
    },

    async saveToken(token) {
        const user = firebase.auth().currentUser;
        const db = firebase.firestore();
        const data = {
            token: token,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            platform: 'web'
        };

        if (user) {
            await db.collection('users').doc(user.uid).set({
                pushTokens: firebase.firestore.FieldValue.arrayUnion(token)
            }, { merge: true });
        } else {
            await db.collection('guest_tokens').doc(token.substring(0, 20)).set(data);
        }
    }
};

window.addEventListener('load', () => notificationManager.init());
