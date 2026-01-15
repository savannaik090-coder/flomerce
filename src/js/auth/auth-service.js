import firebaseConfig from './firebase-config.js';

/**
 * Authentication Service for Kreavo SaaS Platform
 * Handles Login, Signup, and Session Management
 */
class AuthService {
  constructor() {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    this.auth = firebase.auth();
    this.db = firebase.firestore();
  }

  /**
   * Register a new SaaS user
   */
  async signUp(name, email, password) {
    try {
      const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;

      // Update profile
      await user.updateProfile({ displayName: name });

      // Create user document in Firestore
      await this.db.collection('users').doc(user.uid).set({
        uid: user.uid,
        name: name,
        email: email,
        plan: 'free',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        siteCount: 0
      });

      // Send verification email
      await user.sendEmailVerification();
      
      return { success: true, user: user };
    } catch (error) {
      console.error("Signup Error:", error);
      throw error;
    }
  }

  /**
   * Log in an existing user
   */
  async login(email, password) {
    try {
      await this.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
      
      const user = userCredential.user;
      
      if (!user.emailVerified) {
        throw new Error("Please verify your email before logging in.");
      }

      return { success: true, user: user };
    } catch (error) {
      console.error("Login Error:", error);
      throw error;
    }
  }

  /**
   * Log out current user
   */
  async logout() {
    await this.auth.signOut();
    window.location.href = '/login.html';
  }

  /**
   * Observe authentication state
   */
  onAuthStateChanged(callback) {
    return this.auth.onAuthStateChanged(callback);
  }
}

export const authService = new AuthService();
