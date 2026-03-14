import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { SiteContext } from './SiteContext.jsx';
import { getAuthToken, setAuthToken } from '../services/api.js';
import { getProfile, logout as logoutService } from '../services/authService.js';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { siteConfig } = useContext(SiteContext);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const fetchUser = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const result = await getProfile();
      if (result.data || result.customer) {
        const userData = result.data || result.customer;
        setUser(userData);
        setIsAuthenticated(true);
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      setAuthToken(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = useCallback((userData, token) => {
    if (token) setAuthToken(token);
    setUser(userData);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    await logoutService();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated, login, logout, refetchUser: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}
