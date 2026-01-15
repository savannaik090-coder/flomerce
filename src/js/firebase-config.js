// Firebase Configuration for Kreavo SaaS Platform
const firebaseConfig = {
  apiKey: window.KREAVO_CONFIG?.FIREBASE_API_KEY,
  authDomain: window.KREAVO_CONFIG?.FIREBASE_AUTH_DOMAIN,
  projectId: window.KREAVO_CONFIG?.FIREBASE_PROJECT_ID,
  storageBucket: window.KREAVO_CONFIG?.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: window.KREAVO_CONFIG?.FIREBASE_MESSAGING_SENDER_ID,
  appId: window.KREAVO_CONFIG?.FIREBASE_APP_ID,
  measurementId: window.KREAVO_CONFIG?.FIREBASE_MEASUREMENT_ID
};

export default firebaseConfig;
