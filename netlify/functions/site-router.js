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
    // Check both 'websites' (original) and 'sites' (new) collections for better compatibility
    let snapshot = await db.collection('sites')
      .where('subdomain', '==', subdomain)
      .limit(1)
      .get();

    // Fallback to 'websites' collection if not found in 'sites'
    if (snapshot.empty) {
      snapshot = await db.collection('websites')
        .where('subdomain', '==', subdomain)
        .limit(1)
        .get();
    }

    if (snapshot.empty) {
      return { statusCode: 404, body: "Website not found" };
    }

    const siteData = snapshot.docs[0].data();
    
    // Determine which template to use
    let templateType = 'simple'; // default
    if (siteData.templateId === 'template1') {
      templateType = 'clothing';
    } else if (siteData.category?.toLowerCase() === 'clothing') {
      templateType = 'clothing';
    }

    // Read the template file
    const templatePath = path.resolve(__dirname, '../../templates/' + templateType + '/index.html');
    
    if (!fs.existsSync(templatePath)) {
        return { 
            statusCode: 500, 
            body: "Template not found at: " + templatePath + ". Available templates: clothing, simple"
        };
    }

    let html = fs.readFileSync(templatePath, 'utf8');

    // Replacement logic for the template
    html = html.replace(/{{siteName}}/g, siteData.siteName || 'My Business');
    html = html.replace(/{{category}}/g, siteData.category || '');
    html = html.replace(/{{title}}/g, siteData.settings?.title || siteData.siteName || 'My Business');
    html = html.replace(/{{description}}/g, siteData.settings?.description || 'Professional website created on Kreavo.');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: html
    };
  } catch (error) {
    console.error("Router Error:", error);
    return { statusCode: 500, body: "Internal Server Error: " + error.message };
  }
};
