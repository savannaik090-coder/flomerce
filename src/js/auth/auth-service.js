import firebaseConfig from './firebase-config.js';

class AuthService {
  constructor() {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    this.auth = firebase.auth();
    this.db = firebase.firestore();
  }

  async signUp(name, email, password) {
    try {
      const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      await user.updateProfile({ displayName: name });
      await this.db.collection('users').doc(email).set({
        uid: user.uid,
        name: name,
        email: email,
        plan: 'free',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        siteCount: 0
      });
      await user.sendEmailVerification();
      return { success: true, user: user };
    } catch (error) {
      console.error("Signup Error:", error);
      throw error;
    }
  }

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

  async logout() {
    await this.auth.signOut();
    window.location.href = '/login.html';
  }

  onAuthStateChanged(callback) {
    return this.auth.onAuthStateChanged(callback);
  }
}

export const authService = new AuthService();
