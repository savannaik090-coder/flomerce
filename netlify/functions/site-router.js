const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin with credentials from environment variables
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
  // Path is /s/subdomain
  const pathParts = event.path.split('/');
  const subdomain = pathParts[2];

  if (!subdomain) {
    return { statusCode: 400, body: "Subdomain required" };
  }

  try {
    // Check 'sites' collection first
    let snapshot = await db.collection('sites')
      .where('subdomain', '==', subdomain)
      .limit(1)
      .get();

    // Fallback to 'websites' collection
    if (snapshot.empty) {
      snapshot = await db.collection('websites')
        .where('subdomain', '==', subdomain)
        .limit(1)
        .get();
    }

    if (snapshot.empty) {
      return { statusCode: 404, body: "Website not found: " + subdomain };
    }

    const siteData = snapshot.docs[0].data();
    
    // Determine template
    let templateType = 'simple';
    if (siteData.templateId === 'template1' || siteData.category?.toLowerCase() === 'clothing') {
      templateType = 'clothing';
    }

    // RESOLVE TEMPLATE PATH
    const possiblePaths = [
      path.join(__dirname, 'templates', templateType, 'index.html'),
      path.join(__dirname, '..', '..', 'templates', templateType, 'index.html'),
      path.join(process.cwd(), 'templates', templateType, 'index.html'),
      path.join('/var/task', 'templates', templateType, 'index.html'),
      path.join('/var/task', 'netlify/functions', 'templates', templateType, 'index.html')
    ];

    let html = '';
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        html = fs.readFileSync(p, 'utf8');
        break;
      }
    }

    if (!html) {
      return { 
        statusCode: 500, 
        body: "CRITICAL ERROR: Template file not found."
      };
    }

    // Replacement logic - Handles both Clothing and Classic template variables
    const siteName = siteData.siteName || 'My Business';
    const category = siteData.category || '';
    const description = siteData.settings?.description || 'Professional business created on Kreavo.';
    const title = siteData.settings?.title || siteName;

    // Standard variables
    html = html.replace(/{{siteName}}/g, siteName);
    html = html.replace(/{{category}}/g, category);
    html = html.replace(/{{title}}/g, title);
    html = html.replace(/{{description}}/g, description);

    // Classic template specific variables
    html = html.replace(/{{BRAND_NAME}}/g, siteName);
    html = html.replace(/{{SITE_DESCRIPTION}}/g, description);
    html = html.replace(/{{SITE_TITLE}}/g, title);
    html = html.replace(/{{CATEGORY}}/g, category);

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache'
      },
      body: html
    };
  } catch (error) {
    console.error("Router Error:", error);
    return { 
      statusCode: 500, 
      body: "Internal Server Error: " + error.message
    };
  }
};
