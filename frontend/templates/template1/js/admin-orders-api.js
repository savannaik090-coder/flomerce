/**
 * Admin Orders API Service
 * Replaces Firebase Firestore with REST API calls for admin panel operations
 * Used by admin-panel.html for orders, customers, notifications, analytics, and settings
 */

const AdminOrdersAPI = (function() {
    const API_BASE = '/api/admin';

    /**
     * Get auth token from localStorage
     */
    function getToken() {
        return localStorage.getItem('auth_token') || localStorage.getItem('admin_token');
    }

    /**
     * Get authorization headers
     */
    function getHeaders(includeContentType = true) {
        const headers = {};
        const token = getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        if (includeContentType) {
            headers['Content-Type'] = 'application/json';
        }
        headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        return headers;
    }

    /**
     * Test API connection
     * @returns {Promise<boolean>}
     */
    async function testConnection(retryCount = 0) {
        const maxRetries = 3;
        try {
            console.log(`Testing Admin Orders API connection... (attempt ${retryCount + 1})`);

            const response = await Promise.race([
                fetch(`${API_BASE}/health`, {
                    method: 'GET',
                    headers: getHeaders()
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Connection timeout')), 10000)
                )
            ]);

            if (response.ok) {
                console.log('✅ Admin Orders API connection successful');
                return true;
            }

            throw new Error(`API responded with status ${response.status}`);
        } catch (error) {
            console.error(`❌ Admin Orders API connection failed (attempt ${retryCount + 1}):`, error);

            if (retryCount < maxRetries - 1) {
                console.log(`Retrying in 2 seconds... (${retryCount + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                return testConnection(retryCount + 1);
            }

            return false;
        }
    }

    // =====================
    // USER MANAGEMENT
    // =====================

    /**
     * Get all users
     * @returns {Promise<{success: boolean, users: Array}>}
     */
    async function getUsers() {
        try {
            const response = await fetch(`${API_BASE}/users`, {
                method: 'GET',
                headers: getHeaders(),
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch users: ${response.status}`);
            }

            const data = await response.json();
            return { success: true, users: data.users || [] };
        } catch (error) {
            console.error('Error fetching users:', error);
            return { success: false, users: [], error: error.message };
        }
    }

    /**
     * Get user by ID
     * @param {string} userId
     * @returns {Promise<{success: boolean, user: Object}>}
     */
    async function getUser(userId) {
        try {
            const response = await fetch(`${API_BASE}/users/${encodeURIComponent(userId)}`, {
                method: 'GET',
                headers: getHeaders(),
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch user: ${response.status}`);
            }

            const data = await response.json();
            return { success: true, user: data.user };
        } catch (error) {
            console.error('Error fetching user:', error);
            return { success: false, user: null, error: error.message };
        }
    }

    // =====================
    // ORDER MANAGEMENT
    // =====================

    /**
     * Get all orders (from users and guests)
     * @param {Object} filters - Optional filters
     * @returns {Promise<{success: boolean, orders: Array}>}
     */
    async function getOrders(filters = {}) {
        try {
            const params = new URLSearchParams();
            if (filters.status) params.append('status', filters.status);
            if (filters.userId) params.append('userId', filters.userId);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            params.append('cacheBust', Date.now());

            const response = await fetch(`${API_BASE}/orders?${params.toString()}`, {
                method: 'GET',
                headers: getHeaders(),
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch orders: ${response.status}`);
            }

            const data = await response.json();
            return { success: true, orders: data.orders || [] };
        } catch (error) {
            console.error('Error fetching orders:', error);
            return { success: false, orders: [], error: error.message };
        }
    }

    /**
     * Get order by ID
     * @param {string} orderId
     * @param {boolean} isGuest - Whether it's a guest order
     * @param {string} userId - User ID (for non-guest orders)
     * @returns {Promise<{success: boolean, order: Object}>}
     */
    async function getOrder(orderId, isGuest = false, userId = null) {
        try {
            const params = new URLSearchParams();
            params.append('isGuest', isGuest.toString());
            if (userId) params.append('userId', userId);

            const response = await fetch(`${API_BASE}/orders/${encodeURIComponent(orderId)}?${params.toString()}`, {
                method: 'GET',
                headers: getHeaders(),
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch order: ${response.status}`);
            }

            const data = await response.json();
            return { success: true, order: data.order };
        } catch (error) {
            console.error('Error fetching order:', error);
            return { success: false, order: null, error: error.message };
        }
    }

    /**
     * Update order status
     * @param {string} orderId
     * @param {string} status
     * @param {Object} additionalData - Additional update data (tracking, notes, etc.)
     * @param {boolean} isGuest
     * @param {string} userId
     * @returns {Promise<{success: boolean}>}
     */
    async function updateOrderStatus(orderId, status, additionalData = {}, isGuest = false, userId = null) {
        try {
            const response = await fetch(`${API_BASE}/orders/${encodeURIComponent(orderId)}/status`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({
                    status,
                    isGuest,
                    userId,
                    ...additionalData,
                    updatedAt: new Date().toISOString()
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to update order status: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Order status updated via API');
            return { success: true, ...data };
        } catch (error) {
            console.error('Error updating order status:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update order with any data
     * @param {string} orderId
     * @param {Object} updateData
     * @param {boolean} isGuest
     * @param {string} userId
     * @returns {Promise<{success: boolean}>}
     */
    async function updateOrder(orderId, updateData, isGuest = false, userId = null) {
        try {
            const response = await fetch(`${API_BASE}/orders/${encodeURIComponent(orderId)}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({
                    ...updateData,
                    isGuest,
                    userId,
                    updatedAt: new Date().toISOString()
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to update order: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Order updated via API');
            return { success: true, ...data };
        } catch (error) {
            console.error('Error updating order:', error);
            return { success: false, error: error.message };
        }
    }

    // =====================
    // GUEST TOKENS
    // =====================

    /**
     * Get all guest tokens
     * @returns {Promise<{success: boolean, tokens: Array}>}
     */
    async function getGuestTokens() {
        try {
            const response = await fetch(`${API_BASE}/guest-tokens`, {
                method: 'GET',
                headers: getHeaders(),
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch guest tokens: ${response.status}`);
            }

            const data = await response.json();
            return { success: true, tokens: data.tokens || [] };
        } catch (error) {
            console.error('Error fetching guest tokens:', error);
            return { success: false, tokens: [], error: error.message };
        }
    }

    // =====================
    // NOTIFICATIONS
    // =====================

    /**
     * Get admin notifications
     * @param {Object} options - Query options (limit, orderBy, etc.)
     * @returns {Promise<{success: boolean, notifications: Array}>}
     */
    async function getNotifications(options = {}) {
        try {
            const params = new URLSearchParams();
            if (options.limit) params.append('limit', options.limit);
            if (options.unreadOnly) params.append('unreadOnly', 'true');
            params.append('cacheBust', Date.now());

            const response = await fetch(`${API_BASE}/notifications?${params.toString()}`, {
                method: 'GET',
                headers: getHeaders(),
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch notifications: ${response.status}`);
            }

            const data = await response.json();
            return { success: true, notifications: data.notifications || [] };
        } catch (error) {
            console.error('Error fetching notifications:', error);
            return { success: false, notifications: [], error: error.message };
        }
    }

    /**
     * Create admin notification
     * @param {Object} notification
     * @returns {Promise<{success: boolean}>}
     */
    async function createNotification(notification) {
        try {
            const response = await fetch(`${API_BASE}/notifications`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(notification)
            });

            if (!response.ok) {
                throw new Error(`Failed to create notification: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Notification created via API');
            return { success: true, ...data };
        } catch (error) {
            console.error('Error creating notification:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update notification
     * @param {string} notificationId
     * @param {Object} updateData
     * @returns {Promise<{success: boolean}>}
     */
    async function updateNotification(notificationId, updateData) {
        try {
            const response = await fetch(`${API_BASE}/notifications/${encodeURIComponent(notificationId)}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                throw new Error(`Failed to update notification: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Notification updated via API');
            return { success: true, ...data };
        } catch (error) {
            console.error('Error updating notification:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Mark notification as read
     * @param {string} notificationId
     * @returns {Promise<{success: boolean}>}
     */
    async function markNotificationRead(notificationId) {
        return updateNotification(notificationId, { read: true, readAt: new Date().toISOString() });
    }

    // =====================
    // SETTINGS
    // =====================

    /**
     * Get settings document
     * @param {string} settingKey - e.g., 'notifications', 'watchBuyVideos'
     * @returns {Promise<{success: boolean, data: Object}>}
     */
    async function getSettings(settingKey) {
        try {
            const response = await fetch(`${API_BASE}/settings/${encodeURIComponent(settingKey)}`, {
                method: 'GET',
                headers: getHeaders(),
                cache: 'no-store'
            });

            if (!response.ok) {
                if (response.status === 404) {
                    return { success: true, data: null, exists: false };
                }
                throw new Error(`Failed to fetch settings: ${response.status}`);
            }

            const data = await response.json();
            return { success: true, data: data.settings, exists: true };
        } catch (error) {
            console.error('Error fetching settings:', error);
            return { success: false, data: null, error: error.message };
        }
    }

    /**
     * Update settings document
     * @param {string} settingKey
     * @param {Object} settingsData
     * @param {boolean} merge - Whether to merge with existing data
     * @returns {Promise<{success: boolean}>}
     */
    async function updateSettings(settingKey, settingsData, merge = true) {
        try {
            const response = await fetch(`${API_BASE}/settings/${encodeURIComponent(settingKey)}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({
                    ...settingsData,
                    merge,
                    updatedAt: new Date().toISOString()
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to update settings: ${response.status}`);
            }

            const data = await response.json();
            console.log(`✅ Settings '${settingKey}' updated via API`);
            return { success: true, ...data };
        } catch (error) {
            console.error('Error updating settings:', error);
            return { success: false, error: error.message };
        }
    }

    // =====================
    // ANALYTICS
    // =====================

    /**
     * Record analytics visit
     * @param {Object} visitorData
     * @returns {Promise<{success: boolean}>}
     */
    async function recordVisit(visitorData) {
        try {
            const response = await fetch(`${API_BASE}/analytics/visits`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(visitorData)
            });

            if (!response.ok) {
                throw new Error(`Failed to record visit: ${response.status}`);
            }

            return { success: true };
        } catch (error) {
            console.error('Error recording visit:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get analytics data
     * @param {Object} options - Query options (startDate, endDate, groupBy, etc.)
     * @returns {Promise<{success: boolean, data: Object}>}
     */
    async function getAnalytics(options = {}) {
        try {
            const params = new URLSearchParams();
            if (options.startDate) params.append('startDate', options.startDate);
            if (options.endDate) params.append('endDate', options.endDate);
            if (options.groupBy) params.append('groupBy', options.groupBy);
            if (options.type) params.append('type', options.type);
            params.append('cacheBust', Date.now());

            const response = await fetch(`${API_BASE}/analytics?${params.toString()}`, {
                method: 'GET',
                headers: getHeaders(),
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch analytics: ${response.status}`);
            }

            const data = await response.json();
            return { success: true, data: data.analytics || {} };
        } catch (error) {
            console.error('Error fetching analytics:', error);
            return { success: false, data: {}, error: error.message };
        }
    }

    /**
     * Query analytics visits with filters
     * @param {Object} query - Query parameters
     * @returns {Promise<{success: boolean, visits: Array}>}
     */
    async function queryVisits(query = {}) {
        try {
            const params = new URLSearchParams();
            if (query.startDate) params.append('startDate', query.startDate);
            if (query.endDate) params.append('endDate', query.endDate);
            if (query.page) params.append('page', query.page);
            if (query.source) params.append('source', query.source);
            if (query.orderBy) params.append('orderBy', query.orderBy);
            if (query.limit) params.append('limit', query.limit);
            params.append('cacheBust', Date.now());

            const response = await fetch(`${API_BASE}/analytics/visits?${params.toString()}`, {
                method: 'GET',
                headers: getHeaders(),
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(`Failed to query visits: ${response.status}`);
            }

            const data = await response.json();
            return { success: true, visits: data.visits || [] };
        } catch (error) {
            console.error('Error querying visits:', error);
            return { success: false, visits: [], error: error.message };
        }
    }

    // =====================
    // VIDEO LINKS (Watch & Buy)
    // =====================

    /**
     * Get video links settings
     * @returns {Promise<{success: boolean, videos: Array}>}
     */
    async function getVideoLinks() {
        const result = await getSettings('watchBuyVideos');
        return {
            success: result.success,
            videos: result.data?.videos || [],
            exists: result.exists
        };
    }

    /**
     * Update video links settings
     * @param {Array} videos
     * @returns {Promise<{success: boolean}>}
     */
    async function updateVideoLinks(videos) {
        return updateSettings('watchBuyVideos', {
            videos,
            updatedAt: new Date().toISOString()
        }, false);
    }

    // =====================
    // NOTIFICATION PREFERENCES
    // =====================

    /**
     * Get notification preferences
     * @returns {Promise<{success: boolean, preferences: Object}>}
     */
    async function getNotificationPreferences() {
        const result = await getSettings('notifications');
        return {
            success: result.success,
            preferences: result.data || {},
            exists: result.exists
        };
    }

    /**
     * Update notification preferences
     * @param {Object} preferences
     * @returns {Promise<{success: boolean}>}
     */
    async function updateNotificationPreferences(preferences) {
        return updateSettings('notifications', preferences, true);
    }

    // Public API
    return {
        testConnection,
        
        // Users
        getUsers,
        getUser,
        
        // Orders
        getOrders,
        getOrder,
        updateOrderStatus,
        updateOrder,
        
        // Guest Tokens
        getGuestTokens,
        
        // Notifications
        getNotifications,
        createNotification,
        updateNotification,
        markNotificationRead,
        
        // Settings
        getSettings,
        updateSettings,
        
        // Analytics
        recordVisit,
        getAnalytics,
        queryVisits,
        
        // Video Links
        getVideoLinks,
        updateVideoLinks,
        
        // Notification Preferences
        getNotificationPreferences,
        updateNotificationPreferences
    };
})();

/**
 * Compatibility function for testFirebaseConnection
 */
async function testFirebaseConnection() {
    return AdminOrdersAPI.testConnection();
}

/**
 * Compatibility function for API connection test
 */
async function testAPIConnection() {
    return AdminOrdersAPI.testConnection();
}

console.log('✅ AdminOrdersAPI service loaded (Firebase replacement)');
