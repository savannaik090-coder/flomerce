# Fluxe SaaS Platform

## Overview
Fluxe is a SaaS platform designed to empower users to effortlessly create their own e-commerce websites using pre-built templates. The flagship template (template1) offers a comprehensive jewellery e-commerce experience. The project aims to provide a robust, scalable, and customizable solution for online businesses, leveraging a modern cloud-native architecture.

## User Preferences
The user prefers clear and concise information. The AI should prioritize iterative development and ask for confirmation before making significant architectural changes or introducing new dependencies. When implementing features, the AI should favor a modular and API-driven approach.

## System Architecture

Fluxe operates on a Cloudflare-centric serverless architecture for enhanced scalability and performance.

**Technology Stack:**
- **Frontend:** Cloudflare Pages (static assets, user interface)
- **Backend:** Cloudflare Workers (API endpoints, business logic)
- **Database:** Cloudflare D1 (SQLite-compatible)
- **File Storage:** Cloudflare R2
- **Authentication:** Custom JWT-based system
- **Payments:** Razorpay integration

**Core Design Principles:**
- **API-Driven:** All frontend functionalities interact with the backend via RESTful APIs.
- **Multi-tenancy:** The platform supports multiple user-created websites, each potentially with its own subdomain.
- **Dynamic Content:** A dynamic category system allows users to define and manage categories for their e-commerce sites, replacing hardcoded pages with a single, versatile template (`category.html`) powered by `category-loader.js`.
- **Modular Backend:** Cloudflare Workers are organized into distinct services (e.g., `auth-worker.js`, `products-worker.js`) for better maintainability and scalability.
- **Frontend Structure:** The frontend is organized into main SaaS pages, templates, an admin panel, and a user dashboard.
- **Subdomain Routing:** Cloudflare Workers handle routing for user subdomains (e.g., `*.fluxe.in`) to their respective sites.

**Key Features:**
- User authentication and authorization.
- Website creation and management for individual users.
- Product catalog management (CRUD operations).
- Order processing and management.
- Shopping cart and wishlist functionalities.
- Dynamic, user-defined categories for e-commerce sites.
- Payment processing via Razorpay.
- Transactional email services.
- Admin panels for managing products, orders, users, and analytics.

**Database Schema:**
The D1 database schema includes tables for `users`, `sites`, `products`, `categories`, `orders`, `guest_orders`, `carts`, `wishlists`, `subscriptions`, and `payment_transactions`, supporting the core e-commerce and SaaS functionalities.

## External Dependencies

- **Cloudflare Pages:** For hosting the static frontend.
- **Cloudflare Workers:** For serverless backend API execution.
- **Cloudflare D1:** For the primary database.
- **Cloudflare R2:** For object storage (e.g., product images).
- **Razorpay:** For payment gateway integration.
- **Resend/SendGrid:** For transactional email services (API keys are required).
- **GitHub:** For version control and deployment via Cloudflare's integrations.

## Recent Changes (February 2026)

### Dynamic Content & Page Routing Fixes (Feb 2 - Latest)
**Fixed Issues:**
1. **Logo Display**: Site logos now render correctly via `{{logo}}` placeholder replacement
2. **Dynamic Categories**: Categories now load dynamically from `window.FLUXE_SITE_DATA` object
3. **Page Routing**: Added page mapping to handle hyphenated URLs (about-us → about-us.html)

**Implementation:**
- All template files now have `window.FLUXE_SITE_DATA = {{siteData}};` injected after `<body>` tag
- Templates with this feature: index, category, about-us, contact-us, checkout, login, signup, profile
- Site router replaces `{{siteData}}` with JSON containing site info, categories, and settings
- Page mapper handles URL-to-file mapping for consistent routing

**REQUIRES DEPLOYMENT:** Run `wrangler deploy` in the backend folder to apply changes to production.

### Static Asset Routing Fix for Subdomains (Feb 2)
**Issue:** When users created subdomain sites (e.g., `shop-name.fluxe.in`), the CSS, JS, and image files weren't loading because the paths weren't being rewritten to the template folder.

**Root Cause:** The HTML templates use relative paths like `css/styles.css` and `js/main.js`. When a subdomain loads these files, the browser requests `shop-name.fluxe.in/css/styles.css`, but the worker wasn't routing these requests to `/templates/template1/css/styles.css`.

**Fix Applied (`backend/workers/site-router.js`):**
1. Added `isStaticAsset()` function to detect CSS, JS, images, fonts, and data files
2. Added `getContentType()` function to return proper MIME types for all file types
3. Added `serveStaticAsset()` function that rewrites paths to `/templates/{templateId}/...`
4. Modified `handleSiteRouting()` to intercept static asset requests and serve them from the correct template folder

**Supported Asset Types:**
- CSS: `.css`
- JavaScript: `.js`, `.map`
- Images: `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp`, `.ico`
- Fonts: `.woff`, `.woff2`, `.ttf`, `.eot`, `.otf`
- Data: `.json`

**REQUIRES DEPLOYMENT:** Run `wrangler deploy` in the backend folder to apply changes to production.

### Site Preview & Production Fixes (Feb 2)
**Fixed Issues:**
1. **Site Preview Routes**: Added `/site/:subdomain` routes to server.js for previewing user-created websites
2. **Template Static Assets**: Fixed CSS/JS/image serving for template sites with proper URL rewriting
3. **API Configuration Simplified**: Removed all local development environment checks from config.js - now uses relative URLs everywhere
4. **Dashboard Site URLs**: Updated to use `/site/subdomain` format for visiting created websites
5. **Removed Confusing Files**: Deleted `backend/dev-server.js` which was causing confusion between environments

**New API Endpoints:**
- `GET /api/site?subdomain=xxx` - Fetch site info by subdomain with categories
- `GET /site/:subdomain` - Serve the site homepage with template
- `GET /site/:subdomain/*` - Serve site pages and static assets

**Architecture Notes:**
- Currently using Replit's server.js + SQLite for all operations
- Site previews work via `/site/subdomain` path instead of actual subdomains
- For production Cloudflare deployment, data needs to be synced to D1 database

### Dashboard & API Fixes (Feb 2)
**Fixed Issues:**
1. **Plan Selection Overlay**: Now displays all 4 plans (Trial, Basic, Premium, Pro) in a 2x2 grid layout
2. **Duration Selector**: Added working Monthly/6 Months/Yearly buttons that update plan prices dynamically
3. **Upgrade Buttons**: Added click handlers for billing section upgrade buttons to initiate Razorpay payments
4. **Website Creation API**: Fixed `category` field error - backend now defaults to 'general' if not provided
5. **Custom Subdomain**: Backend now accepts subdomain from frontend request for custom website URLs

**Files Updated:**
- `frontend/src/pages/dashboard.html` - Plan overlay UI and JavaScript handlers
- `backend/workers/sites-worker.js` - Category defaulting and subdomain handling
- `server.js` - Same fixes for local development

### Profile Endpoint Fix (Feb 2)
**Issue:** Production `/api/users/profile` returning 500 error.
**Root Cause:** The `subscriptions` table may not exist in production D1.
**Fix:** Updated `backend/workers/users-worker.js`:
- Split profile query to fetch user and subscription separately
- Added graceful fallback when subscriptions table doesn't exist
- Added `ensureSubscriptionsTable()` function that auto-creates table if missing
- Now returns `{ plan: null, status: 'none' }` when no subscription exists

**REQUIRES DEPLOYMENT:** Push to GitHub or run `wrangler deploy` in backend folder.

### Production Configuration Fixes
1. **API URL Configuration** (`frontend/src/js/api/config.js`):
   - Fixed API base URL handling for all environments (local, Replit, production, subdomains)
   - Added proper handling for fluxe.in main domain
   - Added support for Replit development environment
   - Added fallback for Cloudflare Pages default URLs

2. **CORS Configuration** (`backend/utils/helpers.js`):
   - Updated `getAllowedOrigin` to properly handle:
     - Main domain (fluxe.in)
     - All subdomains (*.fluxe.in)
     - Cloudflare Pages URLs
     - Cloudflare Workers URLs
     - Replit development environment

3. **JWT_SECRET Requirement** (`backend/wrangler.toml`):
   - Added documentation for setting JWT_SECRET as a Cloudflare secret
   - This is critical for production authentication to work!

## Deployment Checklist for Production

### Required Secrets (set via `wrangler secret put`)
Run these commands in the `backend` folder:
```bash
wrangler secret put JWT_SECRET      # Required: 32+ character random string
wrangler secret put RAZORPAY_KEY_ID
wrangler secret put RAZORPAY_KEY_SECRET
```

### SSH Key for GitHub
SSH key has been configured at `~/.ssh/github_key`. To push code:
1. Add the public key to GitHub (Settings > SSH Keys)
2. Use `git push` to deploy

## Local Development vs Production

| Feature | Local (Replit) | Production (Cloudflare) |
|---------|---------------|------------------------|
| Database | SQLite (better-sqlite3) | Cloudflare D1 |
| Server | Express.js (server.js) | Cloudflare Workers |
| Port | 5000 | N/A (edge) |
| API URL | Relative paths | https://fluxe.in/api/* |