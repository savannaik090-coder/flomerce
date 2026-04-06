# Fluxe SaaS Platform

## Overview
Fluxe is a multi-tenant SaaS platform designed for small businesses and entrepreneurs to create scalable e-commerce websites from templates, each hosted on a unique subdomain (e.g., `store-name.fluxe.in`). It provides efficient online storefronts, comprehensive sales capabilities, and brand-building tools through a Cloudflare-centric serverless architecture. The platform aims to be an accessible and powerful solution for establishing an online presence. Key features include dynamic content, subscription management, an admin panel with an iframe preview, product options, subcategories, multi-currency support, a robust order flow with cancellation and return systems, product reviews, inventory locations, storage usage tracking, admin shard management, built-in analytics, and global shipping configurations.

## User Preferences
I prefer iterative development with clear communication on significant changes. Please ask before making major architectural decisions or large-scale code overhauls. Provide concise explanations and focus on effective solutions. Do not make changes to files in the `frontend/templates/` folder.

## System Architecture

### Core Design
Fluxe utilizes a shared shard-based D1 database architecture where multiple sites share Cloudflare D1 databases (shards) with `site_id`-based row isolation. A platform database (`env.DB`) stores global data (users, site metadata, subscriptions), while site-specific data (products, orders) resides in shard D1 databases, always filtered by `site_id`.

### Shared Shard Architecture
- **Shards Registry:** `shards` table in the platform DB tracks all shard databases.
- **Site Assignment:** New sites are assigned to an active shard.
- **Binding Pattern:** Shards are dynamically bound to workers.
- **DB Resolution:** Utilities resolve the correct shard DB.
- **Subscription Management:** Plan names are preserved on expiry, and subscription priority ensures correct trial reporting. Enterprise plan safeguards prevent accidental downgrades.

### Usage Tracking
- **Row-Level Tracking:** Estimated `row_size_bytes` contributes to `site_usage.d1_bytes_used`.
- **Correction Factor:** A per-shard `correction_factor` reconciles estimated usage with actual DB size.
- **R2 Tracking:** Managed via the `site_media` table.
- **Plan Limits:** Hard limits for Basic/Standard/Pro plans, with enterprise plans allowing overage.

### Admin Shard Management API
- Provides endpoints for managing shards (listing, creating, reconciling, activating, moving, deleting).

### Database Tables
- **Platform DB:** `users`, `sessions`, `sites`, `subscriptions`, `payments`, `shards`, `enterprise_sites`, `enterprise_usage_monthly`.
- **Shard DBs:** `site_config`, `categories`, `products`, `orders`, `carts`, `site_customers`, `reviews`, `page_views`, `site_media`. All tables include `row_size_bytes` and are filtered by `site_id`.

### Technology Stack
- **Frontend:** React 19 + Vite, Cloudflare Pages.
- **Backend:** Cloudflare Workers.
- **Database:** Cloudflare D1.
- **File Storage:** Cloudflare R2.
- **Authentication:** Custom JWT for platform users, verification-code for site admins, and custom customer auth for storefronts, including Google Sign-In.
- **UI/UX:** Theme-based template system with extensive admin controls. Classic (default) and Modern themes share one React SPA; theme-specific component variants live in `frontend/src/storefront/src/components/templates/<theme>/`. ThemeContext reads `settings.theme` from site config to select variants (hero, navbar, footer, product card, category section). Shared sections (WatchAndBuy, FeaturedVideo, ShopTheLook, etc.) work across all themes unchanged. CheckoutPage, ReviewPage, ProductReviews, and CustomerReviews all support Modern theme via `useTheme()` hook + `.modern-theme` class wrapper. Modern overrides are in `modern.css` (Inter font, #111 accent, 0 border-radius, flat/borderless design). CheckoutPage uses conditional inline style variables (`accent`, `headingFont`, `btnRadius`, `cardRadius`, etc.) since it's heavily inline-styled.
- **SEO:** Server-side meta tag injection, dynamic sitemap.xml, robots.txt per tenant, and structured data for products, articles, and reviews. Default SEO titles and meta descriptions are category-aware and generated.
- **CDN Edge Caching:** Two-tier caching strategy. Browser: `max-age=60` (60s). CDN: `CDN-Cache-Control: max-age=604800` (7 days) with stale-while-revalidate. Admin requests bypass browser cache entirely (`cache: 'no-store'` in `api.js` and `SiteContext.jsx`). Write operations trigger `purgeStorefrontCache()` which purges both Workers Cache API and Cloudflare CDN edge globally (via Cloudflare API using `CF_API_TOKEN` + `CF_ZONE_ID`). Purge covers both `siteId` and `subdomain` URL variants. Cached endpoints: `/api/site`, `/api/products`, `/api/categories`, `/api/blog/posts`, `/api/blog/post/:slug`, `/api/reviews/product/:id`.
- **Push Notifications:** Full Web Push Protocol (VAPID) implementation using Cloudflare Workers, with service worker for client-side handling and admin panel for management and auto-triggers.
- **Store Logo:** Configurable logo upload, sizing, and positioning in the admin panel.
- **Platform Landing Page:** Full landing page with hero, features, pricing, contact, and footer sections.
- **Legal/Policy Pages:** Standard legal pages (T&C, Privacy, Refund, Shipping) with Razorpay compliance.
- **Terms Agreement:** Mandatory agreement to terms during signup and site creation.

### Key Features
- **Dynamic Content:** Configurable homepage elements and centralized default content per business category.
- **Template/Theme System:** Theme infrastructure with Classic (serif/gold/slider) and Modern (sans-serif/minimal/grid) variants. Config: `frontend/src/storefront/src/config/themes.js`. Context: `frontend/src/storefront/src/context/ThemeContext.jsx`. Modern components: `frontend/src/storefront/src/components/templates/modern/`. Theme is stored in `site_config.settings.theme` and selected during site creation. `useTheme()` hook returns `{ ...themeConfig, isModern }` for easy conditional rendering. ALL storefront pages now have Modern variants: CategoryPage, ProductDetailPage, CartPage, WishlistPage, AboutPage, ContactPage, CartPanel, WishlistPanel, FilterSortBar, SearchOverlay, MobileBottomNav, AnnouncementBar. CSS-class pages use `.modern-theme` wrapper + descendant selectors in `modern.css`; inline-style pages (Cart, Wishlist, Contact) render separate Modern/Classic components conditionally.
- **Admin Panel:** Centralized site content, policy, and SEO management with iframe preview and "Shop the Look" tab.
- **Shop the Look:** Interactive product showcase on the homepage with clickable dots linked to products.
- **Product Options:** Supports Color, Custom Selection, and Priced options.
- **Subcategories:** Three-level category hierarchy with associated homepage sections.
- **Multi-Currency Support:** Product prices stored in default currency, with frontend conversion using `exchangerate-api.com`.
- **Order Flow:** Full order lifecycle (Pending to Delivered) with COD and Razorpay, stock management, customer notifications, and order tracking.
- **Order Cancellation:** Opt-in customer-initiated order cancellation with admin approval workflow.
- **Return Orders:** Opt-in customer-initiated return system with admin approval/refund workflow, supporting photos and resolution preferences.
- **Order Help Page:** Unified page for order-related actions (Track, Cancel, Return, Contact).
- **Product Reviews:** Per-product customer review system with star ratings, optional images, and admin moderation.
- **Inventory Locations:** Multi-location inventory tracking with stock transfers and fulfillment priority.
- **Delivery Charges:** Configurable global shipping fees with flat rates, free-above thresholds, and country/region-based overrides. Checkout address forms support international countries with dynamic state dropdowns.

## External Dependencies
- **Cloudflare Pages:** Frontend hosting.
- **Cloudflare Workers:** Backend serverless compute.
- **Cloudflare D1:** Primary database.
- **Cloudflare R2:** Object storage.
- **Cloudflare REST API:** D1 database management and worker configuration.
- **Razorpay:** Payment gateway.
- **Brevo:** Transactional email service (`https://api.brevo.com/v3/smtp/email`).
- **api.exchangerate-api.com:** Exchange rate data for multi-currency support.