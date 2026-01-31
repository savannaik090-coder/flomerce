/**
 * Auth Service - REST API Based
 * Replaces Firebase Authentication with Cloudflare Workers API
 */

const AuthService = (function() {
    const SESSION_KEY = 'user_session';
    const TOKEN_KEY = 'auth_token';
    let currentUser = null;
    let authStateListeners = [];

    /**
     * Initialize auth service
     */
    function init() {
        console.log('Initializing Auth Service...');
        loadSession();
        return true;
    }

    /**
     * Sign up a new user
     */
    async function signUp(name, email, password) {
        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Signup failed');
            }

            // Save session
            saveSession(result.data);
            notifyAuthStateChange(currentUser);

            return { success: true, user: currentUser };
        } catch (error) {
            console.error('Signup error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Log in an existing user
     */
    async function login(email, password) {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Login failed');
            }

            // Save session
            saveSession(result.data);
            notifyAuthStateChange(currentUser);

            return { success: true, user: currentUser };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Log out the current user
     */
    async function logout() {
        try {
            const token = getToken();
            if (token) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });
            }
        } catch (error) {
            console.error('Logout API error:', error);
        }

        // Clear local session regardless
        clearSession();
        notifyAuthStateChange(null);

        return { success: true };
    }

    /**
     * Request password reset
     */
    async function resetPassword(email) {
        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Password reset request failed');
            }

            return { success: true, message: 'Password reset email sent' };
        } catch (error) {
            console.error('Password reset error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Verify email with token
     */
    async function verifyEmail(token) {
        try {
            const response = await fetch(`/api/auth/verify-email?token=${token}`, {
                method: 'GET'
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Email verification failed');
            }

            // Update local session if user is logged in
            if (currentUser) {
                currentUser.emailVerified = true;
                saveSession({ user: currentUser, token: getToken() });
            }

            return { success: true };
        } catch (error) {
            console.error('Email verification error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get current user profile
     */
    async function getProfile() {
        try {
            const token = getToken();
            if (!token) {
                return { success: false, error: 'Not authenticated' };
            }

            const response = await fetch('/api/auth/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to fetch profile');
            }

            currentUser = { ...currentUser, ...result.data };
            return { success: true, user: currentUser };
        } catch (error) {
            console.error('Get profile error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update user profile
     */
    async function updateProfile(data) {
        try {
            const token = getToken();
            if (!token) {
                return { success: false, error: 'Not authenticated' };
            }

            const response = await fetch('/api/auth/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to update profile');
            }

            currentUser = { ...currentUser, ...result.data };
            saveSession({ user: currentUser, token: getToken() });
            
            return { success: true, user: currentUser };
        } catch (error) {
            console.error('Update profile error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Save session to local storage
     */
    function saveSession(data) {
        if (data.user) {
            currentUser = data.user;
            localStorage.setItem(SESSION_KEY, JSON.stringify(data.user));
        }
        if (data.token) {
            localStorage.setItem(TOKEN_KEY, data.token);
        }
    }

    /**
     * Load session from local storage
     */
    function loadSession() {
        try {
            const sessionData = localStorage.getItem(SESSION_KEY);
            const token = localStorage.getItem(TOKEN_KEY);

            if (sessionData && token) {
                currentUser = JSON.parse(sessionData);
                // Verify token is still valid
                validateToken(token);
            }
        } catch (error) {
            console.error('Error loading session:', error);
            clearSession();
        }
    }

    /**
     * Validate token with server
     */
    async function validateToken(token) {
        try {
            const response = await fetch('/api/auth/validate', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                clearSession();
                notifyAuthStateChange(null);
            } else {
                notifyAuthStateChange(currentUser);
            }
        } catch (error) {
            console.error('Token validation error:', error);
        }
    }

    /**
     * Clear session
     */
    function clearSession() {
        currentUser = null;
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(TOKEN_KEY);
    }

    /**
     * Get auth token
     */
    function getToken() {
        return localStorage.getItem(TOKEN_KEY);
    }

    /**
     * Check if user is logged in
     */
    function isLoggedIn() {
        return !!currentUser && !!getToken();
    }

    /**
     * Get current user
     */
    function getCurrentUser() {
        return currentUser;
    }

    /**
     * Add auth state change listener
     */
    function onAuthStateChange(callback) {
        authStateListeners.push(callback);
        // Immediately call with current state
        callback(currentUser);
    }

    /**
     * Notify all listeners of auth state change
     */
    function notifyAuthStateChange(user) {
        authStateListeners.forEach(callback => {
            try {
                callback(user);
            } catch (error) {
                console.error('Auth state listener error:', error);
            }
        });
    }

    /**
     * Observe auth state (alias for onAuthStateChange)
     */
    function observeAuthState(callback) {
        return onAuthStateChange(callback);
    }

    // Initialize on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Public API
    return {
        init,
        signUp,
        login,
        logout,
        resetPassword,
        verifyEmail,
        getProfile,
        updateProfile,
        isLoggedIn,
        getCurrentUser,
        getToken,
        onAuthStateChange,
        observeAuthState,
        saveSession
    };
})();

// Make available globally
window.AuthService = AuthService;

// Backward compatibility with FirebaseAuth
window.FirebaseAuth = {
    isLoggedIn: () => AuthService.isLoggedIn(),
    getCurrentUser: () => AuthService.getCurrentUser(),
    observeAuthState: (cb) => AuthService.onAuthStateChange(cb),
    saveSession: (data) => AuthService.saveSession({ user: data }),
    login: (email, password) => AuthService.login(email, password),
    logout: () => AuthService.logout()
};
