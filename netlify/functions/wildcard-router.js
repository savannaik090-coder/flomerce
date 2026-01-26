const admin = require('firebase-admin');
const fetch = require('node-fetch');

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

const PAGE_MAP = {
  '': 'index.html',
  '/': 'index.html',
  '/index': 'index.html',
  '/new-arrivals': 'new-arrivals.html',
  '/all-collection': 'all-collection.html',
  '/featured-collection': 'featured-collection.html',
  '/login': 'login.html',
  '/signup': 'signup.html',
  '/profile': 'profile.html',
  '/checkout': 'checkout.html',
  '/cart': 'cart.html',
  '/product-detail': 'product-detail.html',
  '/about-us': 'about-us.html',
  '/contact-us': 'contact-us.html',
  '/terms-conditions': 'terms-conditions.html',
  '/privacy-policy': 'privacy-policy.html',
  '/book-appointment': 'book-appointment.html',
  '/saree-collection': 'saree-collection.html',
  '/gold-necklace': 'gold-necklace.html',
  '/gold-earrings': 'gold-earrings.html',
  '/gold-rings': 'gold-rings.html',
  '/gold-bangles': 'gold-bangles.html',
  '/silver-necklace': 'silver-necklace.html',
  '/silver-earrings': 'silver-earrings.html',
  '/silver-rings': 'silver-rings.html',
  '/silver-bangles': 'silver-bangles.html',
  '/meenakari-necklace': 'meenakari-necklace.html',
  '/meenakari-earrings': 'meenakari-earrings.html',
  '/meenakari-rings': 'meenakari-rings.html',
  '/meenakari-bangles': 'meenakari-bangles.html',
  '/order-track': 'order-track.html',
  '/wishlist': 'wishlist.html',
  '/reset-password': 'reset-password.html',
  '/verify-email': 'verify-email.html'
};

exports.handler = async (event, context) => {
  const fullPath = event.path;
  
  const match = fullPath.match(/^\/w\/([^\/]+)(\/.*)?$/);
  
  if (!match) {
    return { 
      statusCode: 400, 
      headers: { 'Content-Type': 'text/html' },
      body: '<!DOCTYPE html><html><body><h1>Invalid Request</h1></body></html>' 
    };
  }
  
  const subdomain = match[1];
  const pagePath = match[2] || '/';
  
  console.log(`Wildcard Router: subdomain=${subdomain}, pagePath=${pagePath}`);

  try {
    let snapshot = await db.collection('sites')
      .where('subdomain', '==', subdomain)
      .limit(1)
      .get();

    if (snapshot.empty) {
      snapshot = await db.collection('websites')
        .where('subdomain', '==', subdomain)
        .limit(1)
        .get();
    }

    if (snapshot.empty) {
      return { 
        statusCode: 404, 
        headers: { 'Content-Type': 'text/html' },
        body: `<!DOCTYPE html><html><head><title>Not Found</title></head><body style="font-family: sans-serif; text-align: center; padding: 50px;"><h1>Website not found</h1><p>The subdomain <strong>${subdomain}</strong> is not registered.</p></body></html>` 
      };
    }

    const siteData = snapshot.docs[0].data();
    let templateType = siteData.templateId || 'template1';

    let htmlFile = PAGE_MAP[pagePath];
    
    if (!htmlFile) {
      const cleanPath = pagePath.replace(/^\//, '');
      if (PAGE_MAP['/' + cleanPath]) {
        htmlFile = PAGE_MAP['/' + cleanPath];
      } else {
        htmlFile = 'index.html';
      }
    }

    const templateUrl = `https://fluxee.netlify.app/templates/${templateType}/${htmlFile}`;
    console.log(`Fetching template: ${templateUrl}`);
    
    const response = await fetch(templateUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch template: ${response.statusText}`);
    }
    
    let html = await response.text();

    const templateBaseUrl = `https://fluxee.netlify.app/templates/${templateType}`;
    if (!html.includes('<base')) {
      html = html.replace('<head>', `<head>\n    <base href="${templateBaseUrl}/">`);
    }

    const brandName = siteData.brandName || siteData.siteName || 'My Business';
    const siteName = siteData.siteName || brandName;
    const category = siteData.category || '';
    const description = siteData.settings?.description || 'Professional business created on Fluxe.';
    const title = siteData.settings?.title || brandName;
    const logoUrl = siteData.logoUrl || '';

    html = html.replace(/{{siteName}}/g, siteName);
    html = html.replace(/{{brandName}}/g, brandName);
    html = html.replace(/{{category}}/g, category);
    html = html.replace(/{{title}}/g, title);
    html = html.replace(/{{description}}/g, description);

    if (logoUrl) {
      html = html.replace(/images\/logos\/royalmeenakari\.png/g, logoUrl);
      html = html.replace(/{{logoUrl}}/g, logoUrl);
    } else {
      html = html.replace(/{{logoUrl}}/g, '');
    }

    html = html.replace(/{{BRAND_NAME}}/g, siteName);
    html = html.replace(/{{SITE_DESCRIPTION}}/g, description);
    html = html.replace(/{{SITE_TITLE}}/g, title);
    html = html.replace(/{{CATEGORY}}/g, category);

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      body: html
    };
  } catch (error) {
    console.error("Wildcard Router Error:", error);
    return { 
      statusCode: 500, 
      headers: { 'Content-Type': 'text/html' },
      body: `<!DOCTYPE html><html><head><title>Error</title></head><body style="font-family: sans-serif; text-align: center; padding: 50px;"><h1>Server Error</h1><p>Something went wrong. Please try again later.</p></body></html>`
    };
  }
};
