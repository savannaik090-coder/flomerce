/**
 * @file AuthService.js
 * @description handles all user authentication logic using Cloudflare API.
 * @module AuthService
 */

class AuthService {
  /**
   * Initializes the Auth service.
   */
  constructor() {
    this.apiBase = '/api/auth';
  }

  /**
   * Registers a new user.
   * @param {string} name - User's full name.
   * @param {string} email - User's email address.
   * @param {string} password - User's chosen password.
   * @returns {Promise<Object>} The registered user object.
   */
  async signUp(name, email, password) {
    try {
      const response = await fetch(`${this.apiBase}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Signup failed');
      return { success: true, user: result.user };
    } catch (error) {
      console.error("Signup Error:", error);
      throw error;
    }
  }

  /**
   * Logs in a user with email and password.
   * @param {string} email - User's email.
   * @param {string} password - User's password.
   * @returns {Promise<Object>} The authenticated user object.
   */
  async login(email, password) {
    try {
      const response = await fetch(`${this.apiBase}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Login failed');
      return { success: true, user: result.user };
    } catch (error) {
      console.error("Login Error:", error);
      throw error;
    }
  }

  /**
   * Logs out the current user.
   */
  async logout() {
    try {
      await fetch(`${this.apiBase}/logout`, { method: 'POST' });
      window.location.href = '/src/pages/login.html';
    } catch (error) {
      console.error("Logout Error:", error);
      window.location.href = '/src/pages/login.html';
    }
  }

  /**
   * Sets up a listener for authentication state changes.
   * (Simplified for JWT approach - might need actual session check)
   */
  onAuthStateChanged(callback) {
    // In a JWT setup, we might check local storage or a 'me' endpoint
    fetch(`${this.apiBase}/me`)
      .then(res => res.ok ? res.json() : null)
      .then(user => callback(user))
      .catch(() => callback(null));
  }

  /**
   * Returns the currently authenticated user.
   */
  async getCurrentUser() {
    const res = await fetch(`${this.apiBase}/me`);
    return res.ok ? await res.json() : null;
  }
}

export const authService = new AuthService();
