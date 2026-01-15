const { db } = require('./firebase-admin-config');
const fs = require('fs');
const path = require('path');

exports.handler = async (event) => {
  const pathParts = event.path.split('/').filter(p => p);
  
  // Look for /s/brandname pattern
  if (pathParts[0] === 's' && pathParts[1]) {
    const brandHandle = pathParts[1].toLowerCase();

    try {
      const siteSnapshot = await db.collection('websites')
        .where('subdomain', '==', brandHandle)
        .limit(1)
        .get();

      if (siteSnapshot.empty) {
        return {
          statusCode: 404,
          body: '<h1>Site Not Found</h1><p>The brand you are looking for does not exist.</p>'
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
      console.error('Path Router Error:', error);
      return { statusCode: 500, body: 'Error loading site' };
    }
  }

  // Fallback for everything else
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html' },
    body: '<!-- APP_ENTRY -->'
  };
};
