# Firebase to Cloudflare Migration Plan

## Document Version: 1.1
## Date: January 31, 2026

---

# Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Architecture Overview](#current-architecture-overview)
3. [Template1 Features Analysis](#template1-features-analysis)
4. [Firebase Services Being Used](#firebase-services-being-used)
5. [Netlify Functions Inventory](#netlify-functions-inventory)
6. [Cloudflare Equivalents Mapping](#cloudflare-equivalents-mapping)
7. [Dynamic Category System Design](#dynamic-category-system-design)
8. [Multi-Tenant Scalability Architecture](#multi-tenant-scalability-architecture)
9. [Firebase Decommissioning & Cleanup](#firebase-decommissioning--cleanup)
10. [Migration Strategy](#migration-strategy)
11. [Implementation Roadmap](#implementation-roadmap)
12. [Risk Assessment](#risk-assessment)
13. [Coding Standards & Documentation](#coding-standards--documentation)

---

# Executive Summary

## Current Stack
- **Frontend Hosting**: Netlify (static files)
- **Backend Functions**: Netlify Functions
- **Database**: Firebase Firestore
- **File Storage**: Firebase Storage
- **Authentication**: Firebase Auth
- **Push Notifications**: Firebase Cloud Messaging (FCM)
- **Payments**: Razorpay (for subscriptions + e-commerce)

**Note:** Shiprocket/DTDC shipping integration was built for testing but is not functional. Should be removed or rebuilt.

## Target Stack
- **Frontend Hosting**: Cloudflare Pages (unlimited bandwidth)
- **Backend Functions**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite-based SQL database)
- **File Storage**: Cloudflare R2 (S3-compatible, zero egress fees)
- **Authentication**: Custom auth with Workers + D1, or third-party (Clerk/Auth0)
- **Push Notifications**: Web Push via Workers (self-managed)
- **Payments**: Razorpay (stays the same)
- **Shipping**: Shiprocket (stays the same)

## Why Migrate?
1. **Bandwidth Costs**: Firebase charges for bandwidth; Cloudflare Pages has unlimited bandwidth
2. **Read/Write Limits**: Firestore has daily read/write limits on free/spark plans
3. **Egress Fees**: Firebase Storage charges egress; R2 has zero egress fees
4. **Edge Performance**: Cloudflare Workers run at edge locations globally

---

# Current Architecture Overview

## Project Structure
```
/
├── index.html                    # Main SaaS landing page
├── src/                          # Main SaaS platform files
│   ├── js/auth/                  # SaaS authentication
│   │   ├── FirebaseConfig.js     # Firebase configuration
│   │   └── AuthService.js        # Auth service
│   ├── js/dashboard/             # Dashboard services
│   ├── js/payment/               # Payment services (Razorpay)
│   └── pages/                    # SaaS pages (login, signup, dashboard)
├── netlify/functions/            # Root-level Netlify functions
│   ├── site-router.js            # Dynamic site routing
│   ├── wildcard-router.js        # Subdomain routing
│   ├── create-payment.js         # Payment creation
│   ├── send-email.js             # Email sending
│   └── resolve-subdomain.js      # Subdomain resolution
├── templates/
│   ├── template1/                # MAIN TEMPLATE (Jewellery - Complex)
│   ├── clothing/                 # Clothing template (simpler)
│   ├── simple/                   # Simple template
│   └── view/                     # Preview templates (no migration needed)
├── guide/                        # User guide (no migration needed)
├── admin-panel/                  # Admin panel
└── dashboard/                    # Dashboard
```

## How the System Works
1. Users sign up on the SaaS platform
2. They create a website with a subdomain (e.g., `shop-name`)
3. The site-router.js fetches their site data from Firestore
4. It loads the appropriate template and replaces placeholders ({{brandName}}, {{logoUrl}}, etc.)
5. Products, orders, and user data are stored in Firestore
6. Images are stored in Firebase Storage

---

# Main SaaS Platform (src folder)

The `src/` folder contains the core SaaS platform that users interact with before their websites are created.

## Platform Structure
```
src/
├── common/
│   └── EnvConfig.js              # Environment configuration loader
├── css/
│   ├── index.css                 # Global styles
│   ├── login.css                 # Login page styles
│   ├── signup.css                # Signup page styles
│   └── dashboard.css             # Dashboard styles
├── js/
│   ├── auth/
│   │   ├── FirebaseConfig.js     # Firebase configuration
│   │   └── AuthService.js        # Authentication service class
│   ├── dashboard/
│   │   └── SiteService.js        # Website CRUD operations
│   ├── payment/
│   │   └── RazorpayService.js    # Subscription payment handling
│   └── firebase-config.js        # Firebase config (duplicate)
├── pages/
│   ├── login.html                # User login page
│   ├── signup.html               # User registration page
│   ├── dashboard.html            # Main user dashboard
│   └── admin.html                # Admin page (if exists)
└── cloudflare-worker.js          # Cloudflare worker template (unused)
```

## SaaS Platform Features

### 1. User Authentication (AuthService.js)
**Current Implementation:**
- Uses Firebase Authentication
- Email/password signup with email verification
- Login with session persistence
- Logout functionality
- Auth state change listener

**Migration to Cloudflare:**
```javascript
// Current (Firebase)
await this.auth.createUserWithEmailAndPassword(email, password);

// After Migration (Cloudflare Workers + D1)
// POST /api/auth/signup
const hashedPassword = await hashPassword(password);
await env.DB.prepare(
  'INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)'
).bind(generateId(), email, hashedPassword, name).run();
// Send verification email via email service
// Return JWT token
```

### 2. Website Management (SiteService.js)
**Current Implementation:**
- `getUserSites(uid)` - Fetch all websites owned by user
- `createSite(uid, siteData)` - Create new website with subdomain
- `deleteSite(siteId)` - Delete website and release subdomain
- Uses Firestore transactions for subdomain uniqueness
- Subdomain registry in separate collection

**Migration to Cloudflare:**
```javascript
// Current (Firestore)
await this.db.collection('sites').where('ownerId', '==', uid).get();

// After Migration (D1)
const sites = await env.DB.prepare(
  'SELECT * FROM sites WHERE user_id = ?'
).bind(uid).all();
```

**Subdomain Registry Migration:**
```sql
-- D1 approach: Use UNIQUE constraint instead of separate collection
CREATE TABLE sites (
  id TEXT PRIMARY KEY,
  subdomain TEXT UNIQUE NOT NULL,  -- UNIQUE ensures no duplicates
  ...
);
```

### 3. Subscription Management (RazorpayService.js)
**Current Implementation:**
- Three plans: Basic (₹99), Premium (₹299), Pro (₹999)
- Monthly, 6-month, and yearly billing cycles
- Razorpay checkout integration
- Client-side order creation (should be server-side)

**Migration Notes:**
- Razorpay integration stays the same
- Move order creation to Cloudflare Workers (security)
- Store subscription status in D1 database

### 4. Dashboard (dashboard.html)
**Current Features:**
- View all user's websites
- Create new website (name, category, template selection)
- Subscription plan selection and upgrade
- Account settings

**Key Dashboard Sections:**
1. **My Websites** - Grid of created sites with visit/edit/delete
2. **Subscriptions** - Plan selection (Basic/Premium/Pro)
3. **Settings** - Account management

## SaaS Platform Migration Plan

### Phase 1: Authentication Migration

**Option A: Custom Auth (Recommended for cost)**
```
1. Create auth Workers endpoints:
   - POST /api/auth/signup
   - POST /api/auth/login
   - POST /api/auth/logout
   - POST /api/auth/verify-email
   - POST /api/auth/reset-password

2. Implement JWT session management:
   - Generate JWT on login
   - Store in httpOnly cookie
   - Validate on each request

3. Create D1 tables:
   - users (id, email, password_hash, name, email_verified, ...)
   - sessions (id, user_id, token, expires_at)
   - email_verifications (id, user_id, token, expires_at)
```

**Option B: Third-Party Auth (Easier but adds cost)**
- Clerk: $0.02/MAU after free tier
- Auth0: Free up to 7,500 MAU
- Better Auth: Open source, self-hosted

### Phase 2: Site Service Migration

```javascript
// Cloudflare Worker: /api/sites

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const user = await validateAuth(request, env);
    
    // GET /api/sites - List user's sites
    if (request.method === 'GET') {
      const sites = await env.DB.prepare(
        'SELECT * FROM sites WHERE user_id = ? ORDER BY created_at DESC'
      ).bind(user.id).all();
      return Response.json(sites.results);
    }
    
    // POST /api/sites - Create new site
    if (request.method === 'POST') {
      const { siteName, category, templateId, logoUrl } = await request.json();
      const subdomain = generateSubdomain(siteName);
      
      try {
        await env.DB.prepare(
          `INSERT INTO sites (id, user_id, subdomain, brand_name, category, template_id, logo_url, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
        ).bind(generateId(), user.id, subdomain, siteName, category, templateId, logoUrl).run();
        
        return Response.json({ success: true, subdomain });
      } catch (e) {
        if (e.message.includes('UNIQUE constraint failed')) {
          return Response.json({ error: 'Subdomain already taken' }, { status: 400 });
        }
        throw e;
      }
    }
  }
};
```

### Phase 3: Payment Integration

```javascript
// Cloudflare Worker: /api/payments/create-order

export default {
  async fetch(request, env) {
    const { planId, billingCycle } = await request.json();
    const user = await validateAuth(request, env);
    
    const amounts = {
      basic: { monthly: 9900, '6months': 49900, yearly: 89900 },
      premium: { monthly: 29900, '6months': 149900, yearly: 249900 },
      pro: { monthly: 99900, '6months': 499900, yearly: 899900 }
    };
    
    const amount = amounts[planId][billingCycle];
    
    // Create Razorpay order via their API
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(env.RAZORPAY_KEY_ID + ':' + env.RAZORPAY_KEY_SECRET),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount,
        currency: 'INR',
        receipt: `sub_${user.id}_${Date.now()}`
      })
    });
    
    return Response.json(await response.json());
  }
};
```

### Phase 4: Frontend Updates

**Changes needed in HTML/JS files:**

```javascript
// Before (Firebase)
import { authService } from '/src/js/auth/AuthService.js';
await authService.signUp(name, email, password);

// After (Cloudflare API)
const response = await fetch('/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name, email, password })
});
const result = await response.json();
```

**Files to Update:**
| File | Changes Needed |
|------|----------------|
| `src/pages/login.html` | Replace Firebase auth with fetch API calls |
| `src/pages/signup.html` | Replace Firebase auth with fetch API calls |
| `src/pages/dashboard.html` | Replace Firestore calls with fetch API calls |
| `src/js/auth/AuthService.js` | Rewrite to use REST API instead of Firebase SDK |
| `src/js/dashboard/SiteService.js` | Rewrite to use REST API instead of Firestore |
| `src/js/payment/RazorpayService.js` | Update to call Worker endpoint for order creation |

---

# Template1 Features Analysis

## Template1 is the primary jewellery template with these features:

### 1. User-Facing Features

#### Authentication System
- **Files**: `login.html`, `signup.html`, `reset-password.html`, `verify-email.html`
- **JS**: `js/firebase/firebase-auth.js`, `js/firebase/firebase-init.js`
- **Features**: 
  - User registration with email verification
  - Login with email/password
  - Password reset via email
  - Session persistence

#### Shopping Cart
- **Files**: `js/firebase/firebase-cart.js`, `js/firebase/firebase-cart-manager.js`, `js/cart-local-storage.js`
- **Features**:
  - Local storage cart for guests
  - Firebase sync for logged-in users
  - Cart merge on login
  - Quantity management
  - Cart persistence across devices

#### Wishlist
- **Files**: `js/firebase/firebase-wishlist-manager.js`, `js/wishlist-local-storage.js`, `js/wishlist-manager.js`
- **Features**:
  - Local storage wishlist for guests
  - Firebase sync for logged-in users
  - Wishlist to cart conversion

#### Product Display
- **Files**: `js/subcategory-products-loader.js`, `js/product-detail-loader.js`, `js/shop.js`
- **Features**:
  - Dynamic product loading from Firebase Storage
  - Product filtering and sorting
  - Product detail pages
  - Image gallery with zoom
  - Out of stock handling

#### Checkout System
- **Files**: `checkout.html`, `js/checkout-script-simplified.js`
- **Features**:
  - Guest checkout support
  - Address management
  - Order summary
  - Payment integration (Razorpay)
  - Order confirmation

#### Order Management
- **Files**: `js/firebase/firebase-orders.js`
- **Features**:
  - Order creation and storage
  - Order history for users
  - Guest order support

**Note:** Order tracking with Shiprocket/DTDC was implemented for testing purposes but is not functional. These functions should be removed or rebuilt during migration.

#### User Profile
- **Files**: `profile.html`, `js/firebase/firebase-address-manager.js`
- **Features**:
  - Profile information management
  - Multiple address storage
  - Order history view
  - Wishlist management

#### Search
- **Files**: `js/search-manager.js`, `js/search-ui.js`
- **Features**:
  - Full-text product search
  - Search suggestions
  - Category filtering

#### Multi-Currency Support
- **Files**: `js/currency-converter.js`, `js/currency-email-formatter.js`
- **Features**:
  - Currency selection (INR, USD, GBP, EUR, etc.)
  - Real-time price conversion
  - Currency persistence

#### Multi-Language Support
- **Files**: `js/language-translator.js`, `data/translations.json`
- **Features**:
  - Language selection
  - Dynamic text translation

#### Push Notifications
- **Files**: `js/firebase/notification-manager.js`, `js/notification-registration.js`, `firebase-messaging-sw.js`
- **Features**:
  - FCM token generation
  - Push notification subscription
  - Notification preferences

### 2. Admin Panel Features

#### Product Management
- **Files**: `admin-panel.html`, `products-admin-panel.html`
- **Features**:
  - Add/Edit/Delete products
  - Image upload to Firebase Storage
  - Category assignment
  - Stock management
  - Price updates
  - Bulk operations

#### Order Management
- **Files**: `admin-panel.html`
- **Features**:
  - View all orders (user + guest)
  - Order status updates
  - Shiprocket order creation
  - AWB generation
  - Label printing
  - Pickup scheduling

#### Customer Management
- View all users
- Customer order history

#### Notification Sending
- Send push notifications to all users
- Custom notification messages

#### Analytics Dashboard
- Total products count
- Inventory value
- Order statistics

### 3. Category Pages (Currently Hardcoded)

**Current Hardcoded Category Files:**
```
gold-necklace.html
gold-earrings.html
gold-bangles.html
gold-rings.html
silver-necklace.html
silver-earrings.html
silver-bangles.html
silver-rings.html
meenakari-necklace.html
meenakari-earrings.html
meenakari-bangles.html
meenakari-rings.html
```

**Current Category Structure:**
```
Main Categories (Material):
├── Gold
├── Silver
└── Meenakari

Sub-Categories (Type):
├── Necklace
├── Earrings
├── Bangles
└── Rings

Special Collections:
├── All Collection
├── Featured Collection
├── Saree Collection
├── New Arrivals
└── Bridal Collection
```

---

# Firebase Services Being Used

## 1. Firebase Authentication
**Current Usage:**
- Email/password authentication
- Email verification
- Password reset
- Session management
- Auth state persistence

**Data Structure:**
```javascript
// Firebase Auth User Object
{
  uid: "user-unique-id",
  email: "user@example.com",
  emailVerified: true,
  displayName: "User Name",
  photoURL: "...",
  createdAt: timestamp
}
```

## 2. Firebase Firestore

**Collections Structure:**
```
Firestore Database
├── users/
│   └── {userId}/
│       ├── profile: { name, email, phone, ... }
│       ├── addresses/
│       │   └── {addressId}: { line1, city, state, pincode, ... }
│       ├── carts/
│       │   └── current: { items: [...], updatedAt }
│       ├── wishlist/
│       │   └── current: { items: [...], updatedAt }
│       ├── orders/
│       │   └── {orderId}: { products, total, status, ... }
│       └── tests/
│           └── connection-test
├── guest-orders/
│   └── {orderId}: { products, customer, total, ... }
├── sites/
│   └── {siteId}: { subdomain, brandName, templateId, settings, ... }
├── websites/
│   └── {websiteId}: { subdomain, category, logoUrl, ... }
└── notifications/
    └── {notificationId}: { token, userId, ... }
```

## 3. Firebase Storage

**Storage Structure:**
```
Firebase Storage Bucket
├── products/
│   ├── gold-necklace/
│   │   └── products.json
│   ├── gold-earrings/
│   │   └── products.json
│   ├── featured-collection/
│   │   └── products.json
│   └── [category-name]/
│       └── products.json
├── images/
│   └── products/
│       └── {productId}/
│           └── image-files
├── logos/
│   └── {siteId}/
│       └── logo-files
└── orders/
    └── orders.json
```

## 4. Firebase Cloud Messaging (FCM)
- VAPID key configuration
- Token generation and storage
- Push notification delivery
- Service worker registration

---

# Netlify Functions Inventory

## Root Level Functions (`/netlify/functions/`)

| Function | Purpose | Migration Complexity |
|----------|---------|---------------------|
| `site-router.js` | Routes subdomain requests to correct template | Medium |
| `wildcard-router.js` | Handles wildcard subdomain routing | Medium |
| `create-payment.js` | Creates Razorpay payment orders | Low |
| `send-email.js` | Sends transactional emails | Low |
| `resolve-subdomain.js` | Resolves subdomain to site data | Medium |
| `firebase-admin-config.js` | Firebase Admin SDK setup | High (needs replacement) |

## Template1 Functions (`/templates/template1/netlify/functions/`)

### Product Management
| Function | Purpose | Complexity |
|----------|---------|------------|
| `load-products.js` | Load products from Firebase Storage | Medium |
| `upload-products.js` | Upload products to Firebase Storage | Medium |
| `delete-product.js` | Delete product from storage | Medium |
| `update-product-price.js` | Update product pricing | Low |
| `update-product-stock.js` | Update stock levels | Low |
| `image-proxy.js` | Proxy images for CORS | Low |

### Email Functions
| Function | Purpose | Complexity |
|----------|---------|------------|
| `send-order-email.js` | Order confirmation emails | Low |
| `send-contact-email.js` | Contact form emails | Low |
| `send-appointment-email.js` | Appointment booking emails | Low |
| `send-verification-email.js` | Email verification | Low |
| `send-password-reset-email.js` | Password reset emails | Low |

### Payment Functions
| Function | Purpose | Complexity |
|----------|---------|------------|
| `create-razorpay-order.js` | Create Razorpay orders | Low |

### Shipping Functions (Shiprocket) - TO BE REMOVED/REBUILT
**Note:** These functions were for testing and are not functional. Consider removing during migration.

| Function | Purpose | Status |
|----------|---------|--------|
| `shiprocket-create-order.js` | Create shipping orders | Not functional |
| `shiprocket-track-order.js` | Track shipments | Not functional |
| `shiprocket-generate-awb.js` | Generate AWB | Not functional |
| `shiprocket-generate-label.js` | Generate shipping labels | Not functional |
| `shiprocket-schedule-pickup.js` | Schedule pickup | Not functional |
| `shiprocket-courier-services.js` | Get courier options | Not functional |
| `dtdc-track-order.js` | DTDC tracking | Not functional |
| `comprehensive-order-track.js` | Multi-carrier tracking | Not functional |

### Notification Functions
| Function | Purpose | Complexity |
|----------|---------|------------|
| `send-notifications.js` | Send push notifications | Medium |
| `admin-notifications.js` | Admin notification management | Medium |
| `get-vapid-key.js` | Get FCM VAPID key | Low |
| `auto-back-in-stock-alerts.js` | Stock alert automation | Medium |
| `auto-low-stock-alerts.js` | Low stock alerts | Medium |
| `auto-new-product-alerts.js` | New product notifications | Medium |
| `auto-price-drop-alerts.js` | Price drop alerts | Medium |

### Utility Functions
| Function | Purpose | Complexity |
|----------|---------|------------|
| `health.js` | Health check endpoint | Low |
| `comprehensive-order-track.js` | Multi-carrier tracking | Low |

---

# Cloudflare Equivalents Mapping

## Service Mapping

| Firebase Service | Cloudflare Equivalent | Notes |
|-----------------|----------------------|-------|
| Firebase Auth | Custom Auth + D1 / Clerk / Auth0 | Need to implement JWT handling |
| Firestore | Cloudflare D1 (SQL) | Schema migration needed (NoSQL → SQL) |
| Firebase Storage | Cloudflare R2 | S3-compatible, easy migration |
| Firebase Functions | Cloudflare Workers | Similar serverless model |
| Firebase Hosting | Cloudflare Pages | Better performance, unlimited bandwidth |
| FCM | Web Push API + Workers | Self-managed push notifications |

## Database Schema Design (D1)

### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  email_verified INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
```

### Addresses Table
```sql
CREATE TABLE addresses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  label TEXT,
  line1 TEXT NOT NULL,
  line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT DEFAULT 'India',
  pincode TEXT NOT NULL,
  phone TEXT,
  is_default INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_addresses_user ON addresses(user_id);
```

### Cart Table
```sql
CREATE TABLE cart_items (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  session_id TEXT, -- For guest carts
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  price REAL NOT NULL,
  quantity INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cart_user ON cart_items(user_id);
CREATE INDEX idx_cart_session ON cart_items(session_id);
```

### Wishlist Table
```sql
CREATE TABLE wishlist_items (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  price REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_wishlist_user ON wishlist_items(user_id);
```

### Orders Table
```sql
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  order_reference TEXT UNIQUE NOT NULL,
  is_guest_order INTEGER DEFAULT 0,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  shipping_address TEXT NOT NULL, -- JSON
  billing_address TEXT, -- JSON
  products TEXT NOT NULL, -- JSON array
  subtotal REAL NOT NULL,
  shipping_cost REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  total REAL NOT NULL,
  currency TEXT DEFAULT 'INR',
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending',
  payment_id TEXT,
  order_status TEXT DEFAULT 'pending',
  shiprocket_order_id TEXT,
  awb_number TEXT,
  tracking_url TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_reference ON orders(order_reference);
CREATE INDEX idx_orders_status ON orders(order_status);
```

### Sites Table
```sql
CREATE TABLE sites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  brand_name TEXT NOT NULL,
  template_id TEXT DEFAULT 'template1',
  category TEXT,
  logo_url TEXT,
  settings TEXT, -- JSON for flexible settings
  custom_domain TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_sites_subdomain ON sites(subdomain);
CREATE INDEX idx_sites_user ON sites(user_id);
```

### Categories Table (NEW - For Dynamic Categories)
```sql
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  parent_id TEXT, -- For subcategories
  description TEXT,
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE INDEX idx_categories_site ON categories(site_id);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE UNIQUE INDEX idx_categories_slug_site ON categories(slug, site_id);
```

### Products Table
```sql
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  category_id TEXT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  compare_at_price REAL, -- Original price for discounts
  sku TEXT,
  stock_quantity INTEGER DEFAULT 0,
  is_in_stock INTEGER DEFAULT 1,
  images TEXT, -- JSON array of image URLs
  main_image TEXT,
  weight REAL,
  dimensions TEXT, -- JSON {length, width, height}
  tags TEXT, -- JSON array
  is_featured INTEGER DEFAULT 0,
  is_new_arrival INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE INDEX idx_products_site ON products(site_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_featured ON products(is_featured);
CREATE INDEX idx_products_new ON products(is_new_arrival);
```

### Push Notification Tokens Table
```sql
CREATE TABLE push_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  token TEXT UNIQUE NOT NULL,
  endpoint TEXT,
  p256dh TEXT,
  auth TEXT,
  user_agent TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_push_tokens_user ON push_tokens(user_id);
```

---

# Dynamic Category System Design

## The Problem (Current State)
Currently, category pages (gold-necklace.html, silver-earrings.html, etc.) are:
1. **Hardcoded HTML files** - Each category needs a separate file
2. **Not dynamic** - Adding new categories requires creating new files
3. **Template-specific** - Categories are tied to the jewellery template
4. **Not user-configurable** - Users can't create their own categories

## The Solution (Proposed Architecture)

### 1. Single Dynamic Category Page
Create ONE template file that handles ALL categories dynamically within the main template folder:

**File: `templates/template1/category.html`** (replaces all individual category files like `gold-necklace.html`, `silver-earrings.html`, etc.)
```html
<!-- Dynamic category page that loads based on URL parameter -->
<!-- Location: templates/template1/category.html -->
```

### 2. URL Routing
```
Old URLs (to be deprecated):
/gold-necklace.html
/silver-earrings.html

New URLs:
/category/gold-necklace
/category/silver-earrings
/category/custom-user-category

Or with pretty URLs:
/collections/necklaces/gold
/collections/earrings/silver
```

### 3. Category Management Flow

#### During Website Creation:
```
Step 1: User selects template type (Jewellery, Clothing, etc.)
Step 2: System suggests default categories for that template
Step 3: User can:
        - Accept default categories
        - Remove unwanted categories
        - Add custom categories
Step 4: Categories are saved to database with site_id
Step 5: Category pages are generated dynamically
```

## 5. Multi-Tenant Category Pre-population
To support multiple business niches (Jewelry, Clothing, Electronics) without manual file creation:

1. **Niche Templates Table**:
   Create a system table `niche_defaults` that stores standard category structures for different business types.
   - `niche_id`: 'jewellery', 'clothing'
   - `default_categories`: JSON array of categories (e.g., `["Necklaces", "Earrings"]` for jewelry; `["Shirts", "Pants"]` for clothing)

2. **Creation Logic**:
   When a user creates their site and selects "Clothing":
   - The system queries `niche_defaults`.
   - It automatically inserts those default categories into the `categories` table linked to the new `site_id`.
   - This makes the store "ready to use" with industry-standard categories immediately.

3. **Universal Rendering**:
   The `category.html` file uses data-attributes and the `CategoryLoader.js` to render niche-specific products based on the category ID, ensuring the same code works for both jewelry and clothing.

#### Category Admin Panel Features:
```
1. Add Category
   - Name (e.g., "Diamond Rings")
   - Slug (auto-generated: "diamond-rings")
   - Parent Category (optional, for subcategories)
   - Image
   - Description
   - Display Order

2. Edit Category
   - Modify all fields
   - Reorder categories

3. Delete Category
   - Option to move products to another category
   - Or delete products with category

4. Category Hierarchy
   Main Categories → Subcategories → Products
   Example:
   ├── Rings (main)
   │   ├── Diamond Rings (sub)
   │   ├── Gold Rings (sub)
   │   └── Silver Rings (sub)
```

### 4. Dynamic Page Generation with Cloudflare Workers

```javascript
// Cloudflare Worker: category-router.js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Match category URLs
    const categoryMatch = path.match(/^\/category\/([a-z0-9-]+)$/);
    if (categoryMatch) {
      const categorySlug = categoryMatch[1];
      
      // Get site from subdomain
      const subdomain = url.hostname.split('.')[0];
      
      // Fetch category data from D1
      const category = await env.DB.prepare(`
        SELECT c.*, s.brand_name, s.template_id
        FROM categories c
        JOIN sites s ON c.site_id = s.id
        WHERE s.subdomain = ? AND c.slug = ?
      `).bind(subdomain, categorySlug).first();
      
      if (!category) {
        return new Response('Category not found', { status: 404 });
      }
      
      // Fetch template and inject category data
      const template = await env.ASSETS.fetch('/templates/template1/category-template.html');
      let html = await template.text();
      
      // Replace placeholders
      html = html.replace('{{categoryName}}', category.name);
      html = html.replace('{{categoryDescription}}', category.description || '');
      html = html.replace('{{brandName}}', category.brand_name);
      
      return new Response(html, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // Continue to static assets
    return env.ASSETS.fetch(request);
  }
};
```

### 5. Frontend Category Loader

```javascript
// Dynamic category products loader
class CategoryLoader {
  async loadCategoryProducts(categorySlug) {
    const response = await fetch(`/api/products?category=${categorySlug}`);
    const data = await response.json();
    return data.products;
  }
  
  async loadCategoryInfo(categorySlug) {
    const response = await fetch(`/api/category/${categorySlug}`);
    return response.json();
  }
  
  renderProducts(products) {
    // Generate product grid HTML
  }
}
```

---

# Multi-Tenant Scalability Architecture

To ensure the platform can scale to thousands of independent stores, the following architectural patterns will be implemented:

## 1. Database Isolation (Cloudflare D1)
- **Tenant ID Pattern**: Every table (except system globals) must include a `tenant_id` (or `site_id`) column.
- **Strict Filtering**: All Worker queries must include `WHERE tenant_id = ?` to prevent cross-tenant data leakage.
- **Indexing**: Composite indexes on `(tenant_id, created_at)` or `(tenant_id, slug)` for performance.

## 2. Resource Isolation (Cloudflare R2)
- **Prefix-Based Namespacing**: Store files at `{tenant_id}/{resource_type}/{file_name}`.
- **Signed URLs**: Use Workers to generate short-lived R2 pre-signed URLs for private assets (e.g., invoices).

## 3. Worker Routing & Scalability
- **Subdomain Routing**: Use the `site-router.js` logic in a Cloudflare Worker to resolve subdomains to `tenant_id` early in the request lifecycle.
- **Edge Caching**: Leverage Cloudflare KV or Cache API for frequently accessed tenant configuration (logo, brand colors, etc.) to minimize D1 hits.

---

# Firebase Decommissioning & Cleanup

Properly removing Firebase is critical to reducing technical debt and avoiding accidental billing.

## 1. Code Removal Policy
- **SDK Removal**: Remove all `firebase` and `firebase-admin` dependencies from `package.json`.
- **File Deletion**:
  - `src/js/auth/FirebaseConfig.js` (Delete)
  - `src/js/firebase-config.js` (Delete)
  - All files in `templates/template1/js/firebase/` (Delete after migration)
- **Logic Replacement**: 
  - Replace `AuthService.js` Firebase calls with REST fetch calls to the new Worker API.
  - Replace `SiteService.js` Firestore calls with D1-backed Worker API calls.

## 2. Environment Cleanup
- Remove all `FIREBASE_*` environment variables from Replit/Cloudflare/Netlify secrets.
- Revoke all Firebase Service Account JSON keys.
- Delete Firebase projects once migration is confirmed 100% stable (post Phase 8).

---

# Migration Strategy

## Phase 1: Infrastructure Setup (Week 1)
1. Create Cloudflare account and project
2. Set up Cloudflare Pages for frontend
3. Set up Cloudflare D1 database
4. Set up Cloudflare R2 bucket
5. Create initial database schema
6. Set up environment variables/secrets

## Phase 2: Data Migration (Week 2)
1. Export all data from Firestore
2. Transform data to SQL format
3. Import to D1 database
4. Export files from Firebase Storage
5. Upload to R2 bucket
6. Verify data integrity

## Phase 3: Authentication Migration (Week 2-3)
1. Implement custom auth with Workers
   - JWT-based sessions
   - Password hashing (bcrypt/argon2)
   - Email verification flow
   - Password reset flow
2. OR integrate third-party auth (Clerk/Auth0)
3. Migrate existing users
4. Test auth flows thoroughly

## Phase 4: Worker Functions Development (Week 3-4)
1. Convert Netlify Functions to Workers
2. Update API endpoints
3. Implement database queries
4. Test all endpoints

## Phase 5: Frontend Updates (Week 4-5)
1. Update API calls to new endpoints
2. Update Firebase SDK calls to fetch API
3. Implement dynamic category loading
4. Update asset URLs to R2
5. Test all user flows

## Phase 6: Dynamic Category Implementation (Week 5-6)
1. Create category management UI
2. Implement dynamic category routing
3. Create category template page
4. Add category CRUD API
5. Website creation wizard updates

## Phase 7: Testing & Transition (Week 6-7)
1. Parallel run both systems
2. Thorough testing
3. Performance benchmarking
4. Bug fixes
5. Gradual traffic migration

## Phase 8: Cutover & Cleanup (Week 7-8)
1. DNS switch to Cloudflare
2. Final verification
3. Disable Firebase services
4. Monitor for issues
5. Documentation updates

---

# Implementation Roadmap

## Priority 1: Critical Path (Must Have)
- [ ] D1 database schema implementation
- [ ] R2 bucket setup and file migration
- [ ] Authentication system
- [ ] Product loading API
- [ ] Order management API
- [ ] Site routing worker

## Priority 2: Core Features (Should Have)
- [ ] Cart API
- [ ] Wishlist API
- [ ] User profile API
- [ ] Email sending (via Cloudflare Email Workers or external)
- [ ] Payment integration (Razorpay - stays same)
- [ ] Shipping integration (Shiprocket - stays same)

## Priority 3: Enhanced Features (Nice to Have)
- [ ] Dynamic category system
- [ ] Push notifications (Web Push)
- [ ] Search functionality
- [ ] Analytics
- [ ] Automated alerts

## Priority 4: Future Improvements
- [ ] Multi-tenant improvements
- [ ] Performance optimizations
- [ ] Advanced caching with KV
- [ ] CDN configuration

---

# Risk Assessment

## High Risk
1. **Data Migration**: Potential data loss during migration
   - Mitigation: Multiple backups, staged migration, verification scripts

2. **Authentication Migration**: Users may need to reset passwords
   - Mitigation: Careful planning, user communication, or password hash migration if compatible

3. **Downtime**: Service interruption during cutover
   - Mitigation: Blue-green deployment, parallel running

## Medium Risk
1. **API Compatibility**: Frontend may break with new endpoints
   - Mitigation: Maintain same API structure, thorough testing

2. **Performance Differences**: D1 may have different query patterns
   - Mitigation: Query optimization, proper indexing

## Low Risk
1. **File Migration**: Images may have different URLs
   - Mitigation: URL rewriting, redirects

2. **Third-party Integrations**: Razorpay/Shiprocket should work unchanged
   - Mitigation: Testing in staging environment

---

# Coding Standards & Documentation

To maintain high quality and scalability, all new code must adhere to these standards:

## 1. JSDoc Requirements
Every file and function must include JSDoc comments:
```javascript
/**
 * Handles product retrieval for a specific tenant.
 * @param {string} tenantId - The unique ID of the store.
 * @param {object} env - Cloudflare environment bindings.
 * @returns {Promise<Array>} List of products.
 */
async function getProducts(tenantId, env) { ... }
```

## 2. Error Handling
- Use structured error responses (e.g., `{ success: false, error: "MESSAGE", code: "ENUM" }`).
- Never expose raw SQL or system errors to the frontend.

## 3. Modularization
- Split utility logic (email, payments, validation) into separate modules/files to allow independent scaling and testing.

---

# Cost Comparison

## Current Costs (Firebase + Netlify)

| Service | Free Tier | Paid Usage |
|---------|-----------|------------|
| Firestore | 50K reads/day, 20K writes/day | $0.06/100K reads |
| Firebase Storage | 5GB storage, 1GB/day download | $0.026/GB storage, $0.12/GB download |
| Firebase Auth | 10K verifications/month | $0.01-0.06/verification |
| Netlify Functions | 125K requests/month | $25/1M requests |
| Netlify Bandwidth | 100GB/month | $55/100GB additional |

## Projected Costs (Cloudflare)

| Service | Free Tier | Paid Usage |
|---------|-----------|------------|
| Pages | Unlimited bandwidth | Free |
| Workers | 100K requests/day | $5/10M requests |
| D1 | 5M reads/day, 100K writes/day | $0.75/1B reads |
| R2 | 10GB storage, unlimited egress | $0.015/GB storage |
| Custom Domains | Included | Free |

## Estimated Monthly Savings
For a medium-traffic site (100GB bandwidth, 500K reads/day):
- **Firebase**: ~$50-100/month
- **Cloudflare**: ~$5-15/month
- **Savings**: 70-85%

---

# Next Steps

1. **Review this document** and confirm understanding
2. **Decide on auth approach** (custom vs third-party)
3. **Set up Cloudflare account** and project
4. **Begin Phase 1** infrastructure setup
5. **Create detailed task breakdown** for each phase

---

*Document maintained by: Development Team*
*Last Updated: January 31, 2026*
