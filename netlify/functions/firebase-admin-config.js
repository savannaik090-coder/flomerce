const admin = require('firebase-admin');

if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "auric-a0c92",
      clientEmail: "firebase-adminsdk-fbsvc@auric-a0c92.iam.gserviceaccount.com",
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, '')
    })
  });
}

const db = admin.firestore();
module.exports = { db };
