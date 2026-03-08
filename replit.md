# Fluxe SaaS Platform

## Overview
Fluxe is a multi-tenant SaaS platform that allows users to create their own e-commerce websites using pre-built templates. Each user's website runs on a subdomain (e.g., `store-name.fluxe.in`). The platform uses a Cloudflare-centric serverless architecture.

## Technology Stack
- **Frontend:** React 19 + Vite (Cloudflare Pages for deployment)
- **Backend:** Cloudflare Workers (API endpoints, business logic)
- **Database:** Cloudflare D1 (SQLite-compatible, shared tables with site_id)
- **File Storage:** Cloudflare R2
- **Authentication:** Custom JWT-based system
- **Payments:** Razorpay integration
- **Email:** Resend/SendGrid

## Project Structure

```
/
├── frontend/                    # All frontend code
│   ├── platform/                # React source - SaaS platform app
│   │   ├── src/
│   │   │   ├── pages/           # LandingPage, LoginPage, DashboardPage, etc.
│   │   │   ├── components/      # Navbar, PlanSelector, SiteCard, etc.
│   │   │   ├── services/        # authService, siteService, paymentService
│   │   │   ├── context/         # AuthContext
│   │   │   └── styles/          # CSS files
│   │   ├── package.json
│   │   └── vite.config.js
│   ├── storefront-src/          # React source - Storefront template app
│   │   ├── src/
│   │   │   ├── pages/           # HomePage, CategoryPage, ProductDetailPage, etc.
│   │   │   ├── components/      # Layout, home, product, cart, admin, UI components
│   │   │   ├── services/        # productService, cartService, orderService, etc.
│   │   │   ├── context/         # AuthContext, CartContext, CurrencyContext, SiteContext
│   │   │   ├── hooks/           # useAuth, useCart, useSiteConfig, etc.
│   │   │   ├── styles/          # CSS files
│   │   │   └── utils/           # priceFormatter, stockChecker
│   │   ├── package.json
│   │   └── vite.config.js
│   ├── index.html               # Built platform output (deployed)
│   ├── assets/                  # Built platform JS/CSS (deployed)
│   ├── storefront/              # Built storefront output (deployed)
│   │   ├── index.html
│   │   └── assets/
│   └── templates/               # Static HTML templates (legacy, do not modify)
│       └── template1/
│
├── backend/                     # All backend code (Cloudflare Workers)
│   ├── workers/
│   │   ├── index.js             # Main router - dispatches to all handlers
│   │   ├── site-router.js       # Subdomain detection and storefront serving
│   │   ├── platform/            # SaaS platform logic
│   │   │   ├── auth-worker.js   # Signup, login, email verify, password reset
│   │   │   ├── sites-worker.js  # Site CRUD, categories
│   │   │   ├── users-worker.js  # Profile, subscription management
│   │   │   ├── payments-worker.js # Razorpay integration, subscriptions
│   │   │   ├── email-worker.js  # Email sending (Resend/SendGrid)
│   │   │   └── admin-worker.js  # Platform super-admin (stats, user blocking)
│   │   └── storefront/          # Storefront/template logic
│   │       ├── products-worker.js   # Product CRUD (site_id scoped)
│   │       ├── orders-worker.js     # Order management
│   │       ├── cart-worker.js       # Cart operations
│   │       ├── categories-worker.js # Category management
│   │       ├── wishlist-worker.js   # Wishlist operations
│   │       └── site-admin-worker.js # Verification-code-based admin access
│   ├── utils/
│   │   ├── auth.js              # JWT, password hashing, auth middleware
│   │   └── helpers.js           # ID generation, CORS, response helpers
│   ├── schema/
│   │   └── d1-schema.sql        # Full database schema
│   ├── migrations/              # D1 migration files
│   ├── wrangler.toml            # Cloudflare Workers config
│   └── package.json
│
├── assets/                      # Global static assets (logo, template previews)
├── .github/workflows/           # GitHub Actions for backend deployment
├── build.js                     # Builds React apps → frontend/ output
├── run-server.js                # Local dev server (Express, port 5000)
└── package.json                 # Root package config
```

## Multi-Tenancy
- All data stored in shared tables with `site_id` column for isolation
- Every API endpoint enforces `site_id` filtering
- Subdomains are detected by the backend worker and routed to storefront
- Products, orders, categories, cart, wishlist are all scoped per site

## Admin Panel Authentication
- **Platform Admin:** Full JWT auth + role check (admin@fluxe.in or admin/owner role)
- **Site Admin:** Simplified verification-code-only access via `/api/site-admin/verify`
  - Store owners set a verification code from their dashboard
  - Code is stored in `sites.settings` JSON field as `adminVerificationCode`
  - Verification returns a `SiteAdmin` token valid for 24 hours

## Build & Deployment

### Build
```bash
node build.js   # Builds both React apps and copies to frontend/
```

### Deployment
- **Frontend:** Push to GitHub → Cloudflare Pages auto-deploys from `frontend/`
- **Backend:** Push to GitHub → GitHub Actions deploys via `wrangler deploy`
  - Action triggers on changes to `backend/**` on the `fluxe` branch

### Required Secrets (Cloudflare Workers)
```bash
wrangler secret put JWT_SECRET          # 32+ character random string
wrangler secret put RAZORPAY_KEY_ID
wrangler secret put RAZORPAY_KEY_SECRET
wrangler secret put RESEND_API_KEY      # Or SENDGRID_API_KEY
```

## Local Development
| Feature | Local (Replit) | Production (Cloudflare) |
|---------|---------------|------------------------|
| Database | SQLite (wrangler local) | Cloudflare D1 |
| Server | Express.js (run-server.js) | Cloudflare Workers |
| Frontend Port | 5000 | N/A (edge) |
| Backend Port | 8000 (wrangler dev) | N/A (edge) |
| API URL | Relative paths | https://fluxe.in/api/* |

## Key API Routes
- `POST /api/auth/signup|login|logout|verify-email|reset-password`
- `GET/POST /api/sites` - Site CRUD (requires auth)
- `GET /api/products?siteId=...` - Products (requires siteId or subdomain)
- `GET/POST /api/orders` - Orders
- `GET/POST /api/cart?siteId=...` - Cart
- `GET/POST /api/categories?siteId=...` - Categories
- `GET /api/site?subdomain=...` - Public site info
- `POST /api/site-admin/verify` - Verify admin code for store admin access
- `POST /api/site-admin/set-code` - Set admin verification code (requires auth)
- `GET /api/admin/stats` - Platform admin stats
- `GET /api/health` - Health check
