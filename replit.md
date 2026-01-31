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

**Legacy Stack (being phased out):**
- Netlify Functions → Cloudflare Workers
- Firebase Firestore → Cloudflare D1
- Firebase Storage → Cloudflare R2
- Firebase Auth → Custom Auth with Workers

## Project Structure

```
/
├── frontend/                      # Cloudflare Pages (static frontend)
│   ├── index.html                 # Main SaaS landing page
│   ├── src/
│   │   ├── js/api/                # NEW: API services (replaces Firebase)
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
│   │   └── clothing/              # Clothing template
│   ├── admin-panel/               # Admin panel
│   └── dashboard/                 # User dashboard
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
│   ├── migrations/
│   │   └── firebase-export.js     # Firebase data migration script
│   ├── wrangler.toml              # Cloudflare Workers config
│   └── package.json               # Backend dependencies
│
├── templates/view/                # Preview templates (NO MIGRATION NEEDED)
│   └── template1/
│
├── guide/                         # User guide (NO MIGRATION NEEDED)
│
├── src/                           # LEGACY: Old SaaS platform files
├── netlify/                       # LEGACY: Old Netlify functions
│
└── docs/
    └── MIGRATION_PLAN_FIREBASE_TO_CLOUDFLARE.md
```

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
| `/api/categories` | GET, POST | Dynamic categories |
| `/api/email/*` | POST | Transactional emails |
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

**Cloudflare (Already Added):**
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account ID
- `CLOUDFLARE_API_TOKEN` - API token for Wrangler

**To Be Added:**
- `JWT_SECRET` - Secret for JWT token signing
- `RAZORPAY_KEY_ID` - Razorpay public key
- `RAZORPAY_KEY_SECRET` - Razorpay secret key
- `RESEND_API_KEY` or `SENDGRID_API_KEY` - Email service
- `FROM_EMAIL` - Sender email address

## Deployment

### Backend (Cloudflare Workers)
```bash
cd backend
npm install
npm run db:create          # Create D1 database
npm run db:migrate         # Apply schema
npm run r2:create          # Create R2 bucket
npm run deploy             # Deploy workers
```

### Frontend (Cloudflare Pages)
```bash
cd frontend
# Connect to Cloudflare Pages via dashboard or wrangler
wrangler pages deploy . --project-name=saas-frontend
```

## Features

### Dynamic Category System (NEW)
- Users can create/edit/delete their own categories
- Categories are stored per-site in D1 database
- Default categories created based on business type
- Hierarchical categories with parent/child relationships

### Multi-Tenant Architecture
- Each site has unique subdomain
- Data isolation via `site_id` in all tables
- Subdomain routing handled by Workers

### Authentication
- JWT-based session management
- Password hashing with PBKDF2
- Email verification flow
- Password reset flow

## Migration Status

- [x] Backend folder structure created
- [x] D1 database schema designed
- [x] All Cloudflare Workers implemented
- [x] Frontend API services created
- [x] Data migration scripts prepared
- [ ] D1 database created in Cloudflare
- [ ] R2 bucket created
- [ ] Firebase data exported and migrated
- [ ] Frontend pages updated to use new API
- [ ] Testing and verification
- [ ] Firebase decommissioning

## Recent Changes

- **January 31, 2026**: Started migration implementation
  - Created `/backend/` folder with complete Cloudflare Workers
  - Created `/frontend/` folder with new API services
  - D1 database schema with 15+ tables
  - Dynamic category system implemented
  - All workers: auth, sites, products, orders, cart, wishlist, payments, email, categories, site-router

## Notes

- **DO NOT MIGRATE**: `templates/view/` and `guide/` folders
- **Shiprocket Integration**: Skipped in migration (was non-functional)
- **Push Notifications**: To be implemented later with Web Push
