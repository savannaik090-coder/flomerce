/**
 * @file AuthService.js
 * @description handles all user authentication logic using Firebase Auth and Firestore.
 * @module AuthService
 */

import firebaseConfig from './FirebaseConfig.js';

class AuthService {
  /**
   * Initializes Firebase and the Auth/Firestore services.
   */
  constructor() {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    this.auth = firebase.auth();
    this.db = firebase.firestore();
  }

  /**
   * Registers a new user and creates their profile in Firestore.
   * @param {string} name - User's full name.
   * @param {string} email - User's email address.
   * @param {string} password - User's chosen password.
   * @returns {Promise<Object>} The registered user object.
   */
  async signUp(name, email, password) {
    try {
      const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      await user.updateProfile({ displayName: name });
      await this.db.collection('users').doc(user.uid).set({
        uid: user.uid,
        name: name,
        email: email,
        plan: 'trial',
        trialStartDate: firebase.firestore.FieldValue.serverTimestamp(),
        siteCount: 0,
        status: 'active'
      });
      await user.sendEmailVerification();
      return { success: true, user: user };
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
      await this.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;
      await user.reload();
      const reloadedUser = this.auth.currentUser;
      if (!reloadedUser.emailVerified) {
        throw new Error("Please verify your email before logging in.");
      }
      return { success: true, user: reloadedUser };
    } catch (error) {
      console.error("Login Error:", error);
      throw error;
    }
  }

  /**
   * Logs out the current user and redirects to the login page.
   */
  async logout() {
    await this.auth.signOut();
    window.location.href = '/src/pages/login.html';
  }

  /**
   * Sets up a listener for authentication state changes.
   * @param {Function} callback - Function to call when auth state changes.
   */
  onAuthStateChanged(callback) {
    return this.auth.onAuthStateChanged(callback);
  }
}

export const authService = new AuthService();
