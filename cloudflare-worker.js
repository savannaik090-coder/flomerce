export default {
  async fetch(request) {
    const url = new URL(request.url)
    const hostname = url.hostname
    const parts = hostname.split('.')

    // Detect subdomain: mysite.kreavo.in
    if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'kreavo') {
      const subdomain = parts[0]

      // Rewrite to Netlify origin
      const targetUrl = new URL(request.url)
      targetUrl.hostname = 'kreavo.netlify.app'
      targetUrl.pathname = `/s/${subdomain}${targetUrl.pathname}`

      const newRequest = new Request(targetUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.method === 'GET' ? null : request.body,
        redirect: 'follow',
      })

      return fetch(newRequest)
    }

    // Main domain → normal Netlify site
    const mainUrl = new URL(request.url)
    mainUrl.hostname = 'kreavo.netlify.app'

    return fetch(
      new Request(mainUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.method === 'GET' ? null : request.body,
        redirect: 'follow',
      })
    )
  },
}
