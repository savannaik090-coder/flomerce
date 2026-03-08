import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getProfile, logout as logoutService } from '../services/authService.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(true);

  const saveToken = useCallback((newToken) => {
    if (newToken) {
      localStorage.setItem('auth_token', newToken);
    } else {
      localStorage.removeItem('auth_token');
    }
    setToken(newToken);
  }, []);

  const login = useCallback((tokenValue, userData) => {
    saveToken(tokenValue);
    setUser(userData);
  }, [saveToken]);

  const logout = useCallback(async () => {
    try {
      await logoutService();
    } catch (e) {
    }
    saveToken(null);
    setUser(null);
  }, [saveToken]);

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await getProfile();
        setUser(data.user || data);
      } catch (e) {
        saveToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [token, saveToken]);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
