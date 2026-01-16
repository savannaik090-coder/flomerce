const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    })
  });
}

const db = admin.firestore();

exports.handler = async (event, context) => {
  const pathParts = event.path.split('/');
  const subdomain = pathParts[2]; // /s/subdomain

  if (!subdomain) {
    return { statusCode: 400, body: "Subdomain required" };
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
    
    // Read the template file (you might want to handle multiple templates)
    const templatePath = path.resolve(__dirname, '../../templates/simpletemplate1/index.html');
    let html = fs.readFileSync(templatePath, 'utf8');

    // Simple replacement logic for the template
    html = html.replace(/{{siteName}}/g, siteData.siteName);
    html = html.replace(/{{category}}/g, siteData.category);
    html = html.replace(/{{title}}/g, siteData.settings?.title || siteData.siteName);
    html = html.replace(/{{description}}/g, siteData.settings?.description || '');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: html
    };
  } catch (error) {
    return { statusCode: 500, body: error.message };
  }
};
