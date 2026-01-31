# Fluxe SaaS Platform

## Overview
Fluxe is a SaaS platform that allows users to create their own e-commerce websites with pre-built templates. The main template (template1) is a fully-featured jewellery website with advanced e-commerce capabilities.

## Current Architecture (MIGRATED TO CLOUDFLARE)

**New Stack (Cloudflare-based):**
- **Frontend:** Cloudflare Pages (`/frontend/`)
- **Backend:** Cloudflare Workers (`/backend/workers/`)
- **Database:** Cloudflare D1 (SQLite)
- **File Storage:** Cloudflare R2
- **Auth:** Custom JWT-based authentication
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
│   │   │   │   ├── category-loader.js  # Loads category based on URL slug
│   │   │   │   ├── auth-service.js     # API-based authentication
│   │   │   │   ├── api-cart-manager.js # API-based cart
│   │   │   │   ├── api-wishlist-manager.js # API-based wishlist
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

## Migration Status

**Completed:**
- [x] Backend folder structure created
- [x] D1 database schema designed
- [x] All Cloudflare Workers implemented
- [x] Frontend API services created
- [x] Dynamic category system with single template
- [x] Firebase code removed from cart-manager.js, wishlist-manager.js
- [x] Firebase code removed from checkout-script-simplified.js
- [x] Firebase code removed from order-track.js, testimonial-scroller.js
- [x] Hardcoded collection pages removed (new-arrivals, featured-collection, saree-collection, all-collection)
- [x] Collection-specific loaders removed
- [x] Firebase documentation removed
- [x] Duplicate admin-panel/js folder removed
- [x] Legacy files removed (firebase.json, firestore.rules, netlify folder)

**Pending (HTML Files - Needs Manual Update):**
- [ ] product-detail.html - Firebase SDK script tags (non-functional, need removal)
- [ ] verify-email.html - Firebase SDK script tags (non-functional)
- [ ] reset-password.html - Firebase SDK script tags (non-functional)
- [ ] contact-us.html - Firebase SDK script tags (non-functional)
- [ ] profile.html - Inline Firebase Firestore code (needs refactor to API)
- [ ] products-admin-panel.html - Extensive Firebase code (needs major refactor)
- [ ] admin-panel.html - Firebase code (needs refactor)

**Backend Deployment:**
- [ ] D1 database created in Cloudflare
- [ ] R2 bucket created
- [ ] Firebase data exported and migrated
- [ ] Workers deployed to Cloudflare
- [ ] Testing and verification

## Recent Changes

- **January 31, 2026**: Comprehensive Firebase cleanup
  - Removed hardcoded collection HTML pages (new-arrivals, featured-collection, saree-collection, all-collection)
  - Removed collection-specific JS loaders
  - Updated order-track.js, checkout-script-simplified.js, testimonial-scroller.js to use API
  - Removed duplicate admin-panel/js folder
  - Removed Firebase documentation from frontend/src/docs/
  - Removed old documents folder from template1

- **Previous**: Firebase to Cloudflare migration foundation
  - Created API services (auth, cart, wishlist, products, categories)
  - Created dynamic category.html template
  - Updated cart-manager.js, wishlist-manager.js to use API
  - Updated product loaders to use API
  - Backend workers structure created

## Notes

- **HTML Files**: Still contain Firebase SDK script tags that reference non-existent files. These cause 404 errors but don't break functionality since JS uses API calls now.
- **Admin Panels**: profile.html and products-admin-panel.html have extensive inline Firebase code that requires significant refactoring to migrate to API.
- **Shiprocket Integration**: Skipped in migration (was non-functional)
- **Push Notifications**: To be implemented later with Web Push
