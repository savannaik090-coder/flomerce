import { apiRequest, setAuthToken, getAuthToken, config } from './config.js';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.authStateListeners = [];
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    const token = getAuthToken();
    if (token) {
      try {
        const response = await apiRequest(config.endpoints.auth.me);
        if (response.success && response.data) {
          this.currentUser = response.data;
          this.notifyListeners(this.currentUser);
        }
      } catch (error) {
        setAuthToken(null);
        this.currentUser = null;
      }
    }
    
    this.initialized = true;
  }

  async signUp(name, email, password) {
    try {
      const response = await apiRequest(config.endpoints.auth.signup, {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });

      if (response.success && response.data) {
        setAuthToken(response.data.token);
        this.currentUser = response.data.user;
        this.notifyListeners(this.currentUser);
        
        // Don't await verification email to speed up UI response
        this.sendVerificationEmail().catch(err => console.error('Verification email failed:', err));
        
        return { success: true, user: this.currentUser };
      }
      
      throw new Error(response.message || response.error || 'Signup failed');
    } catch (error) {
      throw error;
    }
  }

  async signIn(email, password) {
    try {
      const response = await apiRequest(config.endpoints.auth.login, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (response.success && response.data) {
        setAuthToken(response.data.token);
        this.currentUser = response.data.user;
        this.notifyListeners(this.currentUser);
        
        return { success: true, user: this.currentUser };
      }
      
      throw new Error(response.message || response.error || 'Login failed');
    } catch (error) {
      if (error.code === 'INVALID_CREDENTIALS') {
        throw new Error('Invalid email or password');
      }
      throw error;
    }
  }

  async signOut() {
    try {
      await apiRequest(config.endpoints.auth.logout, {
        method: 'POST',
      });
    } catch (error) {
      console.warn('Logout request failed:', error);
    }
    
    setAuthToken(null);
    this.currentUser = null;
    this.notifyListeners(null);
    
    return { success: true };
  }

  async sendVerificationEmail() {
    try {
      const response = await apiRequest(config.endpoints.auth.sendVerification, {
        method: 'POST',
      });
      
      if (response.success && response.data?.verificationToken) {
        await apiRequest(`${config.endpoints.email}/verification`, {
          method: 'POST',
          body: JSON.stringify({
            email: this.currentUser.email,
            token: response.data.verificationToken,
            name: this.currentUser.name,
          }),
        });
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async verifyEmail(token) {
    try {
      const response = await apiRequest(config.endpoints.auth.verifyEmail, {
        method: 'POST',
        body: JSON.stringify({ token }),
      });

      if (response.success && this.currentUser) {
        this.currentUser.emailVerified = true;
        this.notifyListeners(this.currentUser);
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async requestPasswordReset(email) {
    try {
      const response = await apiRequest(config.endpoints.auth.requestReset, {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      if (response.success && response.data?.resetToken) {
        await apiRequest(`${config.endpoints.email}/password-reset`, {
          method: 'POST',
          body: JSON.stringify({
            email,
            token: response.data.resetToken,
          }),
        });
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async resetPassword(token, newPassword) {
    try {
      const response = await apiRequest(config.endpoints.auth.resetPassword, {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      });

      return { success: response.success };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async updateProfile(data) {
    try {
      const response = await apiRequest(config.endpoints.auth.updateProfile, {
        method: 'PUT',
        body: JSON.stringify(data),
      });

      if (response.success) {
        this.currentUser = { ...this.currentUser, ...response.data };
        this.notifyListeners(this.currentUser);
      }
      
      return { success: response.success, user: this.currentUser };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isAuthenticated() {
    return !!this.currentUser && !!getAuthToken();
  }

  isEmailVerified() {
    return this.currentUser?.emailVerified === true;
  }

  onAuthStateChanged(callback) {
    this.authStateListeners.push(callback);
    
    if (this.initialized) {
      callback(this.currentUser);
    }
    
    return () => {
      this.authStateListeners = this.authStateListeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners(user) {
    this.authStateListeners.forEach(callback => callback(user));
  }
}

export const authService = new AuthService();
export default authService;
