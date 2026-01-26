export default {
  async fetch(request) {
    const url = new URL(request.url)
    const hostname = url.hostname
    const parts = hostname.split('.')

    // Detect subdomain: mysite.fluxe.in
    if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'fluxe') {
      const subdomain = parts[0]
      const originalPath = url.pathname === '/' ? '' : url.pathname

      // Rewrite to Netlify origin with /w/ prefix for wildcard-router
      const targetUrl = new URL(request.url)
      targetUrl.hostname = 'fluxee.netlify.app'
      targetUrl.pathname = `/w/${subdomain}${originalPath}`

      // Preserve query string
      targetUrl.search = url.search

      const newRequest = new Request(targetUrl.toString(), {
        method: request.method,
        headers: new Headers(request.headers),
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
        redirect: 'follow',
      })

      // Pass original host for reference
      newRequest.headers.set('X-Original-Host', hostname)
      newRequest.headers.set('X-Subdomain', subdomain)

      return fetch(newRequest)
    }

    // Main domain → normal Netlify site
    const mainUrl = new URL(request.url)
    mainUrl.hostname = 'fluxee.netlify.app'
    
    // Add header to tell Netlify this is the root domain
    const mainRequest = new Request(mainUrl.toString(), {
      method: request.method,
      headers: new Headers(request.headers),
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
      redirect: 'follow',
    })
    mainRequest.headers.set('X-Forwarded-Host', hostname)

    return fetch(mainRequest)
  },
}
