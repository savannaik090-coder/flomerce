# Fluxe SaaS Platform

## Overview
Fluxe is a SaaS platform that allows users to create their own e-commerce websites with pre-built templates. The main template (template1) is a fully-featured jewellery website with advanced e-commerce capabilities.

## Current Architecture
- **Frontend Hosting:** Netlify (static files)
- **Backend Functions:** Netlify Functions
- **Database:** Firebase Firestore
- **File Storage:** Firebase Storage
- **Auth:** Firebase Authentication
- **Push Notifications:** Firebase Cloud Messaging
- **Payments:** Razorpay
- **Shipping:** Shiprocket Integration

## Planned Migration
We are planning to migrate from Firebase/Netlify to Cloudflare for cost optimization.
See: `/docs/MIGRATION_PLAN_FIREBASE_TO_CLOUDFLARE.md` for comprehensive migration plan.

**Target Stack:**
- Cloudflare Pages (frontend)
- Cloudflare Workers (backend)
- Cloudflare D1 (database)
- Cloudflare R2 (file storage)

## Security & Secrets
- **IMPORTANT:** All sensitive keys must be stored as **Environment Variables** in Replit (Secrets tab).
- **Public Keys:** `FIREBASE_API_KEY`, etc., are loaded via `/src/common/env-config.js` (which is excluded from Git).
- **Private Keys:** `FIREBASE_PRIVATE_KEY`, `RAZORPAY_KEY_SECRET`, etc., are only accessible in Netlify Functions.

## Project Structure
```
/
├── index.html                    # Main SaaS landing page
├── src/                          # Main SaaS platform files
│   ├── js/auth/                  # SaaS authentication
│   ├── js/dashboard/             # Dashboard services
│   ├── js/payment/               # Payment services
│   └── pages/                    # SaaS pages
├── netlify/functions/            # Root-level Netlify functions
├── templates/
│   ├── template1/                # MAIN TEMPLATE (Jewellery - Complex)
│   ├── clothing/                 # Clothing template
│   ├── simple/                   # Simple template
│   └── view/                     # Preview templates
├── guide/                        # User guide
├── admin-panel/                  # Admin panel
├── dashboard/                    # Dashboard
└── docs/                         # Documentation
```

## Templates

### Template1 (Main Jewellery Template)
The most complex template with full e-commerce features:
- User authentication (login, signup, password reset)
- Shopping cart (guest + logged-in users)
- Wishlist management
- Dynamic product loading from Firebase Storage
- Checkout with Razorpay payments
- Order management (guest + user orders)
- User profiles with multiple addresses
- Multi-currency support
- Multi-language support
- Push notifications
- Admin panel for products/orders
- Currently has HARDCODED category pages (to be made dynamic)

**Note:** Shiprocket/DTDC shipping integration was built for testing but is not functional.

### Current Category Structure (Hardcoded)
```
gold-necklace.html, gold-earrings.html, gold-bangles.html, gold-rings.html
silver-necklace.html, silver-earrings.html, silver-bangles.html, silver-rings.html
meenakari-necklace.html, meenakari-earrings.html, meenakari-bangles.html, meenakari-rings.html
```
These need to be converted to a dynamic category system where users can create their own categories.

## Pending Work
1. **Dynamic Category System** - Allow users to create/manage their own categories
2. **Full Dynamic Content** - Currently only logo and footer name are dynamic
3. **Migration to Cloudflare** - Move all services to Cloudflare stack
4. **Admin Panel Improvements** - Category management UI

## Setup
1. Add all secrets to Replit Environment Variables
2. Ensure `.gitignore` is active
3. Deploy to Netlify using the provided `netlify.toml`

## Recent Changes
- January 31, 2026: Created comprehensive migration plan documentation
