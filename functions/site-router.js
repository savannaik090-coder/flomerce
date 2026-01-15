const { db } = require('./firebase-admin-config');
const fs = require('fs');
const path = require('path');

exports.handler = async (event) => {
  const host = event.headers.host || '';
  const subdomain = host.split('.')[0];

  // If visiting the main domain or a local environment, DO NOT route to template
  if (subdomain === 'kreavo' || subdomain === 'www' || subdomain === 'localhost' || host.includes('netlify.app') || !subdomain) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: '<!-- MAIN_SITE_PROXY -->' // This is a fallback
    };
  }

  try {
    const siteSnapshot = await db.collection('websites')
      .where('subdomain', '==', subdomain)
      .limit(1)
      .get();

    if (siteSnapshot.empty) {
      return {
        statusCode: 404,
        body: '<h1>Site Not Found</h1><p>Check the brand name and try again.</p>'
      };
    }

    const siteData = siteSnapshot.docs[0].data();
    const templatePath = path.resolve(__dirname, '../templates/simple/index.html');
    let html = fs.readFileSync(templatePath, 'utf8');

    html = html.replace(/\{\{SITE_TITLE\}\}/g, siteData.siteName || 'My Website')
               .replace(/\{\{BRAND_NAME\}\}/g, siteData.siteName || 'My Brand')
               .replace(/\{\{SITE_DESCRIPTION\}\}/g, siteData.settings?.description || 'Welcome to our professional website.')
               .replace(/\{\{CATEGORY\}\}/g, siteData.category || 'Business');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: html
    };
  } catch (error) {
    console.error('Router error:', error);
    return { statusCode: 500, body: 'Error loading site' };
  }
};
