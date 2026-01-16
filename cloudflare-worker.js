export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const hostname = url.hostname;
    const parts = hostname.split('.');
    
    // 1. Detect if it's a subdomain (e.g., mysite.kreavo.in)
    // For .in domain, parts.length 3 means [sub, kreavo, in]
    if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'kreavo') {
      const subdomain = parts[0];
      
      // 2. Rewrite the path to Netlify's internal site-router path
      // If user visits mysite.kreavo.in/contact, we proxy to kreavo.in/s/mysite/contact
      url.hostname = 'kreavo.in'; // Your main Netlify domain
      url.pathname = `/s/${subdomain}${url.pathname}`;
      
      // 3. Proxy the request to Netlify
      return fetch(url.toString(), request);
    }

    // 4. Default: Just pass through to the main site
    return fetch(request);
  },
};
