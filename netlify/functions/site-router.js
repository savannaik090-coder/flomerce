const admin = require('firebase-admin');
const fetch = require('node-fetch');

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
    
    // Determine template type
    let templateType = siteData.templateId || 'simple';
    if (!siteData.templateId && siteData.category?.toLowerCase() === 'clothing') {
      templateType = 'clothing';
    }

    // Dynamic fetching of template from the static site URL
    const baseUrl = `https://${event.headers.host}`;
    let templateUrl = `${baseUrl}/templates/${templateType}/index.html`;
    
    // Special handling for template1
    if (templateType === 'template1') {
      templateUrl = `${baseUrl}/templates/view/template1/index.html`;
    }

    console.log(`Fetching template from: ${templateUrl}`);
    const response = await fetch(templateUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch template: ${response.statusText}`);
    }
    let html = await response.text();

    // Fix relative paths (CSS, JS, Images)
    // We assume the templates are always in /templates/ or /templates/view/
    const templateBaseUrl = templateUrl.substring(0, templateUrl.lastIndexOf('/'));
    
    // Inject <base> tag to fix relative paths
    if (!html.includes('<base')) {
        html = html.replace('<head>', `<head>\n    <base href="${templateBaseUrl}/">`);
    }

    // Replacement logic
    const brandName = siteData.brandName || siteData.siteName || 'My Business';
    const siteName = siteData.siteName || brandName;
    const category = siteData.category || '';
    const description = siteData.settings?.description || 'Professional business created on Fluxe.';
    const title = siteData.settings?.title || brandName;
    const logoUrl = siteData.logoUrl || '';

    // Standard variables
    html = html.replace(/{{siteName}}/g, siteName);
    html = html.replace(/{{brandName}}/g, brandName);
    html = html.replace(/{{category}}/g, category);
    html = html.replace(/{{title}}/g, title);
    html = html.replace(/{{description}}/g, description);

    // Handle logo replacement
    if (logoUrl) {
      // Replace BOTH the hardcoded path AND a potential placeholder
      html = html.replace(/images\/logos\/royalmeenakari\.png/g, logoUrl);
      html = html.replace(/{{logoUrl}}/g, logoUrl);
    } else {
      // If no logo, ensure any {{logoUrl}} placeholder is cleared or set to empty
      html = html.replace(/{{logoUrl}}/g, '');
    }

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
