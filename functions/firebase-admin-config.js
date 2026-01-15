const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "auric-a0c92",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined
    }),
    databaseURL: "https://auric-a0c92.firebaseio.com"
  });
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
