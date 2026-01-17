const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  });
}

const db = admin.firestore();

exports.handler = async (event, context) => {
  const host = event.headers.host;
  // Check if subdomain is passed in query, otherwise parse from host
  const subdomain = event.queryStringParameters.subdomain || host.split('.')[0];
  
  console.log("Resolving subdomain:", subdomain);
  
  // Ignore 'www' or 'kreavo' (main domain)
  if (subdomain === 'www' || subdomain === 'fluxe' || subdomain === 'localhost' || subdomain.includes('netlify')) {
    return {
      statusCode: 200,
      body: JSON.stringify({ isMainSite: true })
    };
  }

  try {
    const snapshot = await db.collection('websites')
      .where('subdomain', '==', subdomain)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return { statusCode: 404, body: "Website not found" };
    }

    const siteData = snapshot.docs[0].data();
    return {
      statusCode: 200,
      body: JSON.stringify({ isMainSite: false, siteData })
    };
  } catch (error) {
    return { statusCode: 500, body: error.message };
  }
};
