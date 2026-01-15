
// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCrLCButDevLeILcBjrUCd9e7amXVjW-uI",
  authDomain: "auric-a0c92.firebaseapp.com",
  projectId: "auric-a0c92",
  storageBucket: "auric-a0c92.firebasestorage.app",
  messagingSenderId: "878979958342",
  appId: "1:878979958342:web:e6092f7522488d21eaec47",
  measurementId: "G-ZYZ750JHMB"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

window.SaaSAuth = {
    signup: async (email, password, name) => {
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            await db.collection("users").doc(user.uid).set({
                uid: user.uid,
                email: email,
                name: name,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                role: 'user'
            });
            
            return { success: true, user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    login: async (email, password) => {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    logout: () => auth.signOut(),
    onAuthStateChanged: (callback) => auth.onAuthStateChanged(callback)
};
