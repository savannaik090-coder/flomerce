export default async (request, context) => {
  const url = new URL(request.url);
  const hostname = url.hostname;
  
  // Check if this is a wildcard subdomain request (*.fluxe.in)
  if (hostname.endsWith('.fluxe.in') && hostname !== 'fluxe.in' && hostname !== 'www.fluxe.in') {
    const subdomain = hostname.split('.')[0];
    
    // Skip if accessing API or Netlify functions
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/.netlify/')) {
      // Rewrite API calls to template1 functions
      const newPath = `/templates/template1${url.pathname}`;
      return context.rewrite(newPath);
    }
    
    // Skip static assets - let them pass through with rewrite
    if (url.pathname.startsWith('/css/') || 
        url.pathname.startsWith('/js/') || 
        url.pathname.startsWith('/images/') ||
        url.pathname.startsWith('/fonts/')) {
      const newPath = `/templates/template1${url.pathname}`;
      return context.rewrite(newPath);
    }
    
    // Handle service workers and manifest
    if (url.pathname === '/service-worker.js' || 
        url.pathname === '/firebase-messaging-sw.js' ||
        url.pathname === '/manifest.json') {
      const newPath = `/templates/template1${url.pathname}`;
      return context.rewrite(newPath);
    }
    
    // Handle root path
    if (url.pathname === '/' || url.pathname === '') {
      return context.rewrite('/templates/template1/index.html');
    }
    
    // Handle clean URLs (pages without .html extension)
    const pageName = url.pathname.slice(1); // Remove leading slash
    
    // Check if it's a known page
    const pages = [
      'new-arrivals', 'all-collection', 'featured-collection', 'login', 'signup',
      'profile', 'checkout', 'cart', 'product-detail', 'about-us', 'contact-us',
      'terms-conditions', 'privacy-policy', 'book-appointment', 'saree-collection',
      'gold-necklace', 'gold-earrings', 'gold-rings', 'gold-bangles',
      'silver-necklace', 'silver-earrings', 'silver-rings', 'silver-bangles',
      'meenakari-necklace', 'meenakari-earrings', 'meenakari-rings', 'meenakari-bangles',
      'order-track', 'wishlist', 'reset-password', 'verify-email'
    ];
    
    // If it's a known page, serve the HTML file
    if (pages.includes(pageName) || pages.includes(pageName.split('?')[0])) {
      const cleanPageName = pageName.split('?')[0];
      return context.rewrite(`/templates/template1/${cleanPageName}.html${url.search}`);
    }
    
    // For any other path, try to serve from template1 directory
    let newPath = `/templates/template1${url.pathname}`;
    
    // If path doesn't end with a file extension, try adding .html
    if (!url.pathname.includes('.')) {
      newPath = `/templates/template1${url.pathname}.html`;
    }
    
    return context.rewrite(newPath);
  }
  
  // For non-subdomain requests, continue normally
  return context.next();
};

export const config = {
  path: "/*"
};
