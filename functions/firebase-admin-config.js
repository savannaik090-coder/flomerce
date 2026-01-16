const admin = require('firebase-admin');

if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "auric-a0c92",
      clientEmail: "firebase-adminsdk-p7p3f@auric-a0c92.iam.gserviceaccount.com",
      // Robust newline handling for environment variables
      privateKey: privateKey ? privateKey.split(String.raw`\n`).join('\n') : undefined
    })
  });
}

const db = admin.firestore();
module.exports = { db };
