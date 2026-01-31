/**
 * Notification Registration Manager (V2 - Rebuilt for Cloudflare)
 */
const notificationManager = {
    async init() {
        if (!('serviceWorker' in navigator) || !('Notification' in window)) {
            console.warn('Push notifications not supported');
            return;
        }

        try {
            // Simplified for Cloudflare migration
            console.log('Notification system initialized (Cloudflare mode)');
        } catch (error) {
            console.error('Notification init error:', error);
        }
    },

    async requestPermission() {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('Notification permission granted');
            return true;
        }
        return false;
    },

    async saveToken(token) {
        console.log('Saving push token to Cloudflare D1:', token);
        // fetch('/api/notifications/save-token', { method: 'POST', body: JSON.stringify({ token }) })
    }
};

window.addEventListener('load', () => notificationManager.init());
