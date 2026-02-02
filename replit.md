# Fluxe SaaS Platform
## Overview
Fluxe is a SaaS platform that allows users to create their own e-commerce websites with pre-built templates. The main template (template1) is a fully-featured jewellery website with advanced e-commerce capabilities.

## Current Architecture (MIGRATED TO CLOUDFLARE)

**New Stack (Cloudflare-based):**
- **Frontend:** Cloudflare Pages (`/frontend/`)
- **Backend:** Cloudflare Workers (`/backend/workers/`)
- **Database:** Cloudflare D1 (SQLite)
- **File Storage:** Cloudflare R2
- **Auth:** Custom JWT-based authentication via `auth-service.js`
- **Payments:** Razorpay (unchanged)

## Project Structure

```
/
├── frontend/                      # Cloudflare Pages (static frontend)
│   ├── index.html                 # Main SaaS landing page
│   ├── src/
│   │   ├── js/api/                # API services (replaces Firebase)
│   │   │   ├── AuthService.js     # Authentication API
│   │   │   ├── SiteService.js     # Site management API
│   │   │   ├── ProductService.js  # Products API
│   │   │   ├── CartService.js     # Cart API
│   │   │   ├── OrderService.js    # Orders API
│   │   │   ├── WishlistService.js # Wishlist API
│   │   │   ├── PaymentService.js  # Razorpay integration
│   │   │   ├── CategoryService.js # Dynamic categories API
│   │   │   └── config.js          # API configuration
│   │   ├── css/                   # Stylesheets
│   │   └── pages/                 # SaaS pages (login, signup, dashboard)
│   ├── templates/
│   │   ├── template1/             # MAIN TEMPLATE (Jewellery)
│   │   │   ├── category.html      # DYNAMIC - Single template for all categories
│   │   │   ├── js/
│   │   │   │   ├── category-loader.js     # Loads category based on URL slug
│   │   │   │   ├── auth-service.js        # API-based authentication
│   │   │   │   ├── api-cart-manager.js    # API-based cart
│   │   │   │   ├── api-wishlist-manager.js # API-based wishlist
│   │   │   │   ├── admin-products-api.js  # Admin products management API
│   │   │   │   ├── admin-orders-api.js    # Admin orders/users/analytics API
│   │   │   │   └── ... (other scripts)
│   │   │   └── ... (other pages)
│   │   └── clothing/              # Clothing template
│   ├── admin-panel/               # Admin panel
│   ├── dashboard/                 # User dashboard
│   └── public/                    # Static assets
│
├── backend/                       # Cloudflare Workers (API)
│   ├── workers/
│   │   ├── index.js               # Main worker entry point
│   │   ├── auth-worker.js         # Authentication endpoints
│   │   ├── sites-worker.js        # Site CRUD operations
│   │   ├── products-worker.js     # Products management
│   │   ├── orders-worker.js       # Order management
│   │   ├── cart-worker.js         # Shopping cart
│   │   ├── wishlist-worker.js     # Wishlist management
│   │   ├── payments-worker.js     # Razorpay integration
│   │   ├── email-worker.js        # Transactional emails
│   │   ├── categories-worker.js   # Dynamic categories
│   │   └── site-router.js         # Subdomain routing
│   ├── utils/
│   │   ├── helpers.js             # Utility functions
│   │   └── auth.js                # JWT & password utilities
│   ├── schema/
│   │   └── d1-schema.sql          # D1 database schema
│   ├── wrangler.toml              # Cloudflare Workers config
│   └── package.json               # Backend dependencies
│
└── docs/
    └── MIGRATION_PLAN_FIREBASE_TO_CLOUDFLARE.md
```

## Dynamic Category System

The dynamic category system replaces all hardcoded category pages:

- **Single Template**: `category.html` with `category-loader.js` handles ALL categories
- **URL Structure**: `/category/{slug}` (e.g., `/category/gold-necklace`, `/category/new-arrivals`)
- **User-Defined**: Categories are created by users during website setup
- **Admin Management**: Users can add/edit/delete categories from their admin panel

**Removed Files (Hardcoded Categories):**
- new-arrivals.html, featured-collection.html, saree-collection.html, all-collection.html
- gold-necklace.html, silver-necklace.html, meenakari-necklace.html
- gold-earrings.html, silver-earrings.html, meenakari-earrings.html
- gold-bangles.html, silver-bangles.html, meenakari-bangles.html
- gold-rings.html, silver-rings.html, meenakari-rings.html

## API Endpoints (Cloudflare Workers)

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/auth/*` | POST | Authentication (signup, login, logout, verify, reset) |
| `/api/sites` | GET, POST | User websites management |
| `/api/sites/:id` | GET, PUT, DELETE | Single site operations |
| `/api/products` | GET, POST | Products listing/creation |
| `/api/products/:id` | GET, PUT, DELETE | Single product operations |
| `/api/orders` | GET, POST | Order management |
| `/api/orders/:id` | GET, PUT | Single order operations |
| `/api/cart` | GET, POST, PUT, DELETE | Shopping cart |
| `/api/wishlist` | GET, POST, DELETE | Wishlist management |
| `/api/payments/*` | POST | Razorpay payment processing |
| `/api/categories` | GET, POST, PUT, DELETE | Dynamic categories |
| `/api/email/*` | POST | Transactional emails |
| `/api/notifications` | GET, POST | Admin notifications |
| `/api/videos/watch-buy` | GET | Watch & Buy videos |
| `/api/health` | GET | Health check |

## Database Schema (D1)

Main tables:
- `users` - User accounts with hashed passwords
- `sites` - Multi-tenant websites
- `products` - Product catalog per site
- `categories` - Dynamic categories per site
- `orders` / `guest_orders` - Order management
- `carts` / `wishlists` - Shopping features
- `subscriptions` - SaaS subscription plans
- `payment_transactions` - Payment records

## Environment Variables Required

**To Be Added:**
- `JWT_SECRET` - Secret for JWT token signing
- `RAZORPAY_KEY_ID` - Razorpay public key
- `RAZORPAY_KEY_SECRET` - Razorpay secret key
- `RESEND_API_KEY` or `SENDGRID_API_KEY` - Email service
- `FROM_EMAIL` - Sender email address

## Custom Domain Configuration

**Production Domains:**
- **Main Frontend**: `https://fluxe.in`
- **Backend API**: `https://fluxe.in/api/*`
- **User Subdomains**: `https://*.fluxe.in/*` (e.g., `nazakat.fluxe.in`)

**Cloudflare URLs:**
- Frontend (Pages): `https://fluxe-8x1.pages.dev`
- Backend (Workers): `https://saas-platform.savannaik090.workers.dev`

**Routing:**
- All `/api/*` requests → Cloudflare Workers
- Wildcard subdomains → Workers site-router.js
- Main domain → Cloudflare Pages static frontend

## Git & Deployment Strategy

- **Git Remote**: `git@github.com:savannaik090-coder/Fluxein.git`
- **Branch**: `fluxe`
- **Deployment**:
  - **Backend**: Cloudflare Workers (via `backend/wrangler.toml`)
  - **Frontend**: Cloudflare Pages (via manual GitHub connection in Cloudflare Dashboard)
- **Note**: SSH key configured at `~/.ssh/id_ed25519_github`. Add the public key to GitHub account settings for push access.

**Completed:**
- [x] Backend folder structure created
- [x] D1 database schema designed
- [x] All Cloudflare Workers implemented
- [x] Frontend API services created
- [x] Dynamic category system with single template
- [x] All JS files migrated to API (no Firebase in /js/ folder)
- [x] Hardcoded collection pages removed
- [x] Collection-specific loaders removed
- [x] Firebase documentation removed
- [x] Duplicate admin-panel/js folder removed
- [x] Legacy files removed (firebase.json, firestore.rules, netlify folder)
- [x] Core pages migrated: product-detail, contact-us, verify-email, reset-password, about-us, checkout, book-appointment

**Completed (Admin Panels):**
- [x] login.html - Migrated to use auth-service.js (REST API)
- [x] signup.html - Migrated to use auth-service.js (REST API)
- [x] profile.html - Migrated to use REST API (auth, orders, file uploads)
- [x] products-admin-panel.html - Migrated to use admin-products-api.js (2,382 lines, 0 Firebase ops)
- [x] admin-panel.html - Migrated to use admin-orders-api.js (11,356 lines, 0 Firebase ops)

**Backend Deployment:**
- [ ] D1 database created in Cloudflare
- [ ] R2 bucket created
- [ ] Firebase data exported and migrated
- [ ] Workers deployed to Cloudflare
- [ ] Testing and verification

## Recent Changes

- **February 2, 2026**: Dashboard plan popup and dynamic categories fix
  - Created `backend/workers/users-worker.js` for `/api/users/profile` and `/api/users/subscription` endpoints
  - Added `/api/users` route to `backend/workers/index.js`
  - Fixed `dashboard.html` to show plan selection overlay when user has no active subscription
  - Updated `sites-worker.js` to accept dynamic categories array from frontend during site creation
  - Added `createUserCategories()` function to process user-defined category names with proper slugs
  - Generated SSH deploy key at `~/.ssh/github_deploy_key` for GitHub access

- **February 2, 2026**: Cloudflare custom domain migration completed
  - Updated API base URL in `frontend/src/js/api/config.js` to use `https://fluxe.in`
  - Updated CORS settings in `backend/utils/helpers.js` to allow fluxe.in and subdomains
  - Replaced all `.netlify/functions` references with `/api` endpoints
  - Updated site URL generation to use `*.fluxe.in` for user subdomains
  - Added custom domain routes in `backend/wrangler.toml`
  - Generated SSH key for GitHub push access

- **February 1, 2026**: Custom domain setup guide created
  - Created comprehensive `docs/CUSTOM_DOMAIN_SETUP.md` for fluxe.in setup
  - Covers wildcard subdomain configuration for user-created websites
  - Includes Cloudflare DNS, Pages, and Workers configuration steps
  - Fixed signup redirect to go to SaaS dashboard (not admin-panel)
  - Disabled email verification - users are verified by default

- **January 31, 2026**: Admin panels fully migrated
  - products-admin-panel.html: Reduced from 2,647 to 2,382 lines (0 Firebase operations)
  - admin-panel.html: Reduced from 11,469 to 11,356 lines (0 Firebase operations, down from 149)
  - Created admin-products-api.js: Product CRUD, image upload, notifications
  - Created admin-orders-api.js: Orders, users, analytics, settings, video links
  - All operations now use REST API endpoints at `/api/admin/*`

- **January 31, 2026**: Profile page migration completed
  - Migrated profile.html to use REST API instead of Firebase SDK
  - Replaced firebase.auth().currentUser with FirebaseAuth.getCurrentUser()
  - Replaced firebase.firestore() calls with /api/auth/profile and /api/orders endpoints
  - Replaced firebase.storage() uploads with /api/upload endpoint
  - Removed all Firebase SDK references from profile.html

- **January 31, 2026**: Login & Signup migration completed
  - Migrated login.html to use REST API via auth-service.js
  - Migrated signup.html to use REST API via auth-service.js
  - Removed direct Firebase SDK calls from signup.html (Google Auth, Firebase checks)
  - Updated error handling to work with API responses
  - Both pages now fully use the FirebaseAuth alias backed by REST API

- **January 31, 2026**: Comprehensive Firebase cleanup
  - Removed Firebase SDK script tags from: product-detail, contact-us, verify-email, reset-password, about-us, checkout, book-appointment
  - Updated all pages to use auth-service.js instead of firebase/*.js files
  - Updated cart/wishlist references to use api-*.js files
  - Added FirebaseAuth alias to auth-service.js for backward compatibility
  - Removed old documents folder from template1
  - Removed Firebase documentation from frontend/src/docs/
  - Cleaned up commented Firebase code in checkout.html

- **Previous**: Firebase to Cloudflare migration foundation
  - Created API services (auth, cart, wishlist, products, categories)
  - Created dynamic category.html template
  - Updated cart-manager.js, wishlist-manager.js to use API
  - Updated product loaders to use API
  - Backend workers structure created

## Notes

- **FirebaseAuth Alias**: auth-service.js provides a `window.FirebaseAuth` alias for backward compatibility with legacy code
- **Admin Panels**: products-admin-panel.html and admin-panel.html require significant refactoring (thousands of lines of Firebase code)
- **Profile Page**: Fully migrated to use REST API for auth, orders, and file uploads
- **Login/Signup**: Fully migrated to use REST API via auth-service.js
- **Google OAuth**: Requires backend OAuth setup - currently returns user-friendly message
- **Shiprocket Integration**: Skipped in migration (was non-functional)
- **Push Notifications**: Pending Web Push implementation
