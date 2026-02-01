# Custom Domain Setup Guide for Fluxe

## Overview

This guide explains how to set up `fluxe.in` as your main domain with wildcard subdomains like `nazakat.fluxe.in`, `shop123.fluxe.in`, etc. for user-created websites.

## Architecture

```
fluxe.in (main SaaS platform)
├── fluxe.in                    → Cloudflare Pages (SaaS landing page)
├── fluxe.in/src/pages/*        → Dashboard, login, signup
├── nazakat.fluxe.in            → User's store (via Workers + site-router)
├── shop123.fluxe.in            → Another user's store
└── *.fluxe.in                  → Wildcard routing for all subdomains
```

---

## Step 1: Add Domain to Cloudflare

### 1.1 Add Domain
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click **Add a Site**
3. Enter `fluxe.in`
4. Select a plan (Free works for this setup)
5. Cloudflare will scan existing DNS records

### 1.2 Update Nameservers at Registrar
1. Cloudflare will provide 2 nameservers (e.g., `anna.ns.cloudflare.com`, `bob.ns.cloudflare.com`)
2. Go to your domain registrar (where you bought fluxe.in)
3. Update nameservers to point to Cloudflare
4. Wait for propagation (can take up to 24 hours, usually 1-2 hours)

---

## Step 2: Configure DNS Records

Go to **DNS** → **Records** in Cloudflare Dashboard for fluxe.in:

### 2.1 Root Domain (fluxe.in)
| Type | Name | Content | Proxy Status | TTL |
|------|------|---------|--------------|-----|
| CNAME | @ | fluxe-8x1.pages.dev | Proxied (orange) | Auto |

### 2.2 WWW Subdomain
| Type | Name | Content | Proxy Status | TTL |
|------|------|---------|--------------|-----|
| CNAME | www | fluxe-8x1.pages.dev | Proxied (orange) | Auto |

### 2.3 Wildcard Subdomain (CRITICAL for user sites)
| Type | Name | Content | Proxy Status | TTL |
|------|------|---------|--------------|-----|
| CNAME | * | saas-platform.savannaik090.workers.dev | Proxied (orange) | Auto |

**Note:** The wildcard `*` record points to your Workers backend which handles subdomain routing.

---

## Step 3: Configure Cloudflare Pages

### 3.1 Add Custom Domain to Pages Project
1. Go to **Workers & Pages** → **fluxe-8x1** project
2. Click **Custom domains** tab
3. Click **Set up a custom domain**
4. Enter `fluxe.in`
5. Click **Activate domain**
6. Repeat for `www.fluxe.in`

### 3.2 Verify Domain is Active
- Status should show "Active" with a green checkmark
- SSL certificate will be automatically provisioned

---

## Step 4: Configure Cloudflare Workers for Subdomains

### 4.1 Add Custom Domain to Workers
1. Go to **Workers & Pages** → **saas-platform** (your backend worker)
2. Click **Settings** → **Triggers** → **Custom Domains**
3. Click **Add Custom Domain**
4. Add: `*.fluxe.in` (wildcard subdomain)

**Important:** Cloudflare Workers supports wildcard custom domains, which is essential for your multi-tenant setup.

### 4.2 Verify Worker Routes
In Workers Settings → Triggers → Routes, you should have:
- `*.fluxe.in/*` → saas-platform (your worker)

---

## Step 5: Update Site Router Configuration

Your `backend/workers/site-router.js` already handles subdomain routing. Here's how it works:

```javascript
// Extracts subdomain from hostname
const hostParts = hostname.split('.');
if (hostParts.length >= 3 && hostParts[0] !== 'www') {
  subdomain = hostParts[0];
}

// Example: nazakat.fluxe.in
// hostParts = ['nazakat', 'fluxe', 'in']
// subdomain = 'nazakat'
```

The router then:
1. Looks up the subdomain in D1 database (`sites` table)
2. Fetches the site configuration
3. Serves the appropriate template with placeholders replaced

---

## Step 6: Backend Worker Configuration (wrangler.toml)

Update your `backend/wrangler.toml` to include custom domain routes:

```toml
name = "saas-platform"
main = "workers/index.js"
compatibility_date = "2024-01-01"

# Custom routes for subdomain handling
routes = [
  { pattern = "*.fluxe.in/*", custom_domain = true }
]

# D1 Database binding
[[d1_databases]]
binding = "DB"
database_name = "fluxe-db"
database_id = "your-database-id"

# R2 Storage binding
[[r2_buckets]]
binding = "STORAGE"
bucket_name = "fluxe-storage"

# Environment variables
[vars]
FRONTEND_URL = "https://fluxe.in"
```

---

## Step 7: Frontend API Configuration

Update your frontend to use the correct API URL for the custom domain.

### frontend/src/js/api/config.js
```javascript
const config = {
  // Use relative URLs for API calls (works with both domains)
  apiBaseUrl: '/api',
  
  // Or use environment-specific URLs
  // apiBaseUrl: window.location.hostname.endsWith('fluxe.in') 
  //   ? 'https://saas-platform.savannaik090.workers.dev/api'
  //   : '/api',
  
  endpoints: {
    auth: {
      signup: '/api/auth/signup',
      login: '/api/auth/login',
      logout: '/api/auth/logout',
      me: '/api/auth/me',
      // ... other endpoints
    },
    sites: '/api/sites',
    // ... other endpoints
  }
};
```

---

## Step 8: SSL/TLS Configuration

### 8.1 Enable Full SSL
1. Go to **SSL/TLS** → **Overview**
2. Set encryption mode to **Full (strict)**

### 8.2 Edge Certificates
1. Go to **SSL/TLS** → **Edge Certificates**
2. Enable **Always Use HTTPS**
3. Enable **Automatic HTTPS Rewrites**

### 8.3 Verify Wildcard Certificate
Cloudflare automatically provisions a wildcard certificate for your domain that covers:
- `fluxe.in`
- `*.fluxe.in` (all subdomains)

---

## Step 9: Page Rules (Optional but Recommended)

### 9.1 Force HTTPS
1. Go to **Rules** → **Page Rules**
2. Create rule:
   - URL: `http://*fluxe.in/*`
   - Setting: **Always Use HTTPS**

### 9.2 Cache Rules for Static Assets
Create rule for template static files:
- URL: `*.fluxe.in/images/*`
- Setting: **Cache Level: Standard**
- Setting: **Edge Cache TTL: 1 month**

---

## How User Websites Work

### Website Creation Flow:
1. User signs up on `fluxe.in`
2. User goes to dashboard (`fluxe.in/src/pages/dashboard.html`)
3. User clicks "Create New Site"
4. User enters:
   - **Brand Name**: "Nazakat Sarees"
   - **Subdomain**: "nazakat" (becomes nazakat.fluxe.in)
   - **Template**: "template1"
   - **Category**: "Clothing" or custom categories
5. Site is saved to D1 database in `sites` table:
   ```sql
   INSERT INTO sites (subdomain, brand_name, template_id, ...)
   VALUES ('nazakat', 'Nazakat Sarees', 'template1', ...)
   ```
6. User can now access their store at `nazakat.fluxe.in`

### Subdomain Routing Flow:
1. Customer visits `nazakat.fluxe.in`
2. DNS resolves to Cloudflare (wildcard CNAME)
3. Cloudflare Workers receives request
4. `site-router.js` extracts subdomain "nazakat"
5. Queries D1: `SELECT * FROM sites WHERE subdomain = 'nazakat'`
6. Fetches template from Pages (template1)
7. Replaces placeholders ({{brandName}}, {{logoUrl}}, etc.)
8. Returns customized HTML to customer

---

## Verification Checklist

After completing setup, verify each step:

- [ ] Domain `fluxe.in` added to Cloudflare
- [ ] Nameservers updated at registrar
- [ ] DNS records configured (root, www, wildcard)
- [ ] Custom domain added to Cloudflare Pages
- [ ] Wildcard domain added to Cloudflare Workers
- [ ] SSL certificate active (check padlock in browser)
- [ ] `https://fluxe.in` loads SaaS landing page
- [ ] `https://www.fluxe.in` redirects to fluxe.in
- [ ] Creating a test site works
- [ ] `https://testsite.fluxe.in` loads the test store

---

## Troubleshooting

### Issue: Subdomain returns "Site not found"
- Check D1 database: `SELECT * FROM sites WHERE subdomain = 'xxx'`
- Verify `is_active = 1` in the sites table
- Check worker logs in Cloudflare Dashboard

### Issue: SSL certificate error on subdomains
- Wait for Cloudflare to provision wildcard certificate (can take 15-30 mins)
- Verify wildcard DNS record is proxied (orange cloud)

### Issue: API calls fail from subdomain sites
- Ensure CORS headers are configured in Workers
- Check `handleCORS` function in helpers.js
- Verify API routes are working

### Issue: Subdomain shows main site instead of user's store
- Verify Workers route pattern: `*.fluxe.in/*`
- Check that site-router.js is being called
- Add console.log to debug subdomain extraction

---

## Current URLs Reference

| Purpose | URL |
|---------|-----|
| Frontend (Pages) | https://fluxe-8x1.pages.dev → https://fluxe.in |
| Backend (Workers) | https://saas-platform.savannaik090.workers.dev |
| User Sites | https://[subdomain].fluxe.in |
| SaaS Dashboard | https://fluxe.in/src/pages/dashboard.html |
| Login | https://fluxe.in/src/pages/login.html |
| Signup | https://fluxe.in/src/pages/signup.html |
