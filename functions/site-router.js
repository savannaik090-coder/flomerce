const { db } = require('./firebase-admin-config');
const fs = require('fs');
const path = require('path');

exports.handler = async (event) => {
  const pathParts = event.path.split('/').filter(p => p);
  
  // Look for /s/brandname pattern
  if (pathParts[0] === 's' && pathParts[1]) {
    const brandHandle = pathParts[1].toLowerCase();

    try {
      console.log('Fetching brand:', brandHandle);
      const siteSnapshot = await db.collection('websites')
        .where('subdomain', '==', brandHandle)
        .limit(1)
        .get();

      if (siteSnapshot.empty) {
        console.warn('Brand not found in DB:', brandHandle);
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'text/html' },
          body: '<h1>Site Not Found</h1><p>The brand you are looking for does not exist.</p>'
        };
      }

      const siteData = siteSnapshot.docs[0].data();
      console.log('Site data loaded:', siteData.siteName);

      // Robust pathing for Netlify functions
      const templatePath = path.resolve(__dirname, '../templates/simple/index.html');
      
      let html;
      try {
        html = fs.readFileSync(templatePath, 'utf8');
      } catch (readErr) {
        console.error('Template read error:', readErr);
        // Fallback simple template
        html = `<!DOCTYPE html><html><body><h1>{{BRAND_NAME}}</h1><p>{{SITE_DESCRIPTION}}</p></body></html>`;
      }

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
      console.error('Path Router Error Detail:', error);
      return { 
        statusCode: 500, 
        headers: { 'Content-Type': 'text/html' },
        body: `<h1>Error Loading Site</h1><p>Details: ${error.message}</p>` 
      };
    }
  }

  // Fallback
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html' },
    body: '<!-- APP_ENTRY -->'
  };
};
