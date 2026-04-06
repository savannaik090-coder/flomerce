# Fluxe SaaS Platform

## Overview
Fluxe is a multi-tenant SaaS platform designed to empower small businesses and entrepreneurs by enabling them to create scalable e-commerce websites from templates, each hosted on a unique subdomain (e.g., `store-name.fluxe.in`). It leverages a Cloudflare-centric serverless architecture to provide efficient online storefronts, comprehensive online sales capabilities, and brand-building tools. The project aims to be an accessible and powerful solution for establishing an online presence.

## User Preferences
I prefer iterative development with clear communication on significant changes. Please ask before making major architectural decisions or large-scale code overhauls. Provide concise explanations and focus on effective solutions. Do not make changes to files in the `frontend/templates/` folder.

## Recent Major Features

### GST Invoicing System (Apr 2026)
- **DB Schema:** Added `hsn_code TEXT`, `gst_rate REAL` to `products`; `invoice_token TEXT`, `customer_gstin TEXT` to `orders` and `guest_orders` (migrations in `site-schema.js`).
- **Products:** `products-worker.js` saves `hsnCode`/`gstRate` fields on create/update.
- **Orders:** `orders-worker.js` has two new endpoints:
  - `GET /api/orders/:id/invoice` — admin-authenticated invoice data with product GST enrichment and site GST config.
  - `GET /api/invoice/public` — token-authenticated public invoice view (uses `invoice_token` + `order_number` + `subdomain` query params).
- **Invoice token:** Generated when order status → `confirmed` if `gstInvoiceEmailEnabled` is true in settings; stored in `orders.invoice_token`; invoice URL appended to confirmation email.
- **Tax logic:** Intra-state (store state == customer state) → CGST + SGST (half each); Inter-state → IGST.
- **Frontend (admin):**
  - `SettingsSection.jsx` — GST & Invoicing card: GSTIN, legal name, registered state, business address, and email invoice toggle.
  - `ProductForm.jsx` — HSN/SAC code + GST rate (0/3/5/12/18/28%) per product.
  - `OrdersSection.jsx` — "Download Invoice" button in order detail modal, opens `GSTInvoice.jsx` modal.
  - `GSTInvoice.jsx` — printable invoice component (Tax Invoice or Bill of Supply depending on GSTIN presence), fetches from admin endpoint, browser print/PDF.
- **Frontend (storefront):** `InvoicePage.jsx` at `/invoice` route (standalone, no header/footer) — public invoice via token link from email.

## System Architecture

### Core Design
Fluxe employs a shared shard-based D1 database architecture where multiple sites utilize a small number of Cloudflare D1 databases (shards) with `site_id`-based row isolation. A platform database (`env.DB`) stores global data (users, site metadata, subscriptions), while site-specific data (products, orders) resides in shared shard D1 databases, always filtered by `site_id`.

### Shared Shard Architecture
- **Shards Registry:** A `shards` table in the platform DB tracks all shard databases.
- **Site Assignment:** New sites are assigned to an active shard, linking via `shard_id`.
- **Binding Pattern:** Shards are dynamically bound to workers (e.g., `SHARD_1`, `SHARD_2`).
- **DB Resolution:** Utilities resolve the correct shard DB based on site information.
- **Migration Lock:** A `migration_locked` flag prevents writes during shard-to-shard site migration.
- **Enterprise Plan Protection:** SQL updates to `subscription_plan` for sites include `AND COALESCE(subscription_plan, '') != 'enterprise'` to safeguard enterprise status.
- **Subscription Management:** Plan names are preserved on expiry. Subscription priority ensures correct trial reporting. Frontend displays detailed subscription statuses (e.g., "Pro - Expired"). Cancellation uses `cancel_at_cycle_end: 1`. Enterprise assignment auto-cancels existing Razorpay subscriptions. Plan upgrades also auto-cancel old subscriptions to prevent double billing.

### Usage Tracking with Correction Factor
- **Row-Level Tracking:** `row_size_bytes` in tables, estimated at write time, contributes to `site_usage.d1_bytes_used`.
- **Correction Factor:** A per-shard `correction_factor` reconciles estimated usage with actual DB size from Cloudflare API.
- **Display Formula:** `displayed_d1 = (baseline_bytes + d1_bytes_used) * correction_factor`.
- **R2 Tracking:** Managed via the `site_media` table.
- **Plan Limits:** Basic/Standard/Pro plans have hard limits (e.g., 500MB D1/5GB R2). Enterprise plans allow overage.

### Admin Shard Management API
- Provides endpoints for listing, creating, reconciling, activating, moving, and deleting shards.

### Database Tables
- **Platform DB (`env.DB`):** `users`, `sessions`, `sites`, `subscriptions`, `payments`, `shards`, `enterprise_sites`, `enterprise_usage_monthly`, etc.
- **Shard DBs (e.g., `SHARD_1`):** `site_config`, `categories`, `products`, `orders`, `carts`, `site_customers`, `reviews`, `page_views`, `site_media`, etc. All tables include `row_size_bytes` and are filtered by `site_id`.

### Technology Stack
- **Frontend:** React 19 + Vite, Cloudflare Pages.
- **Backend:** Cloudflare Workers.
- **Database:** Cloudflare D1 (platform + shared shard data).
- **File Storage:** Cloudflare R2.
- **Authentication:** Custom JWT for platform users, verification-code for site admins, and custom customer auth for storefronts, supporting Google Sign-In. All customer-related data is stored in shard DBs.
- **UI/UX:** Templates with extensive admin customization.
- **SEO:** Server-side meta tag injection into the SPA shell before serving. The meta-injector strips any existing SEO tags (favicon, canonical, description, viewport, robots, OG, Twitter, JSON-LD) to prevent duplicates, then injects fresh tags. OG image fallback chain: page-specific image → site OG image → site logo. Product pages include `og:image:secure_url`, `og:image:alt`, and `og:image:type` for Instagram/WhatsApp compatibility. Product structured data includes `brand`, `seller`, `aggregateRating`, `review`, `priceValidUntil` (1 year), `hasMerchantReturnPolicy` (7-day return window), and `shippingDetails` (1-3 day handling, 3-7 day transit) for Google Product rich results and Merchant Listings eligibility. Blog posts have `Article` structured data with author, publisher, and breadcrumbs. Dynamic sitemap.xml includes products, categories, and blog posts. robots.txt per tenant. SEO data is primarily sourced from shard DBs. Default SEO title format: `{BrandName} - Online Store` (no "Fluxe Store" branding). Default meta descriptions are category-aware (jewellery/clothing/beauty/general) and generated from `seo-config.js`. Admin SEO panel placeholders mirror the actual backend defaults so merchants see what Google will display when fields are left empty. The SEO API returns `brand_name` and `category` for frontend default computation.
- **CDN Edge Caching:** Storefront GET endpoints serve `Cache-Control: public, max-age=604800, stale-while-revalidate=1209600` (7-day TTL + 14-day stale-while-revalidate). Cached endpoints: `/api/site`, `/api/products`, `/api/categories`, `/api/blog/posts`, `/api/blog/post/:slug`, `/api/reviews/product/:id`. All admin write operations (create/update/delete for products, categories, blog posts, reviews, site config, SEO) trigger `purgeStorefrontCache()` via `ctx.waitUntil()` to invalidate stale cache entries. Cache utility in `backend/utils/cache.js` exports `cachedJsonResponse()` and `purgeStorefrontCache()`. Admin/auth/cart/checkout/orders endpoints are NOT cached. HTML stays no-cache for SEO injection.
- **Push Notifications:** Full Web Push Protocol (VAPID) implementation using Cloudflare Workers' Web Crypto API, with service worker for client-side handling and admin panel for management and auto-triggers (new product, price drop, back in stock). Auto notifications use `ctx.waitUntil()` in Cloudflare Workers to ensure delivery completes after the API response is returned.
- **Store Logo:** Uploaded during site creation (base64 → R2) or via Admin Panel > Edit Website > Navbar tab. Stored as `logo_url` in `site_config`. Navbar renders the logo image when available, falling back to brand name text. Logo size is configurable via a slider (20–80px, default 44px) and position can be set to left or center, both controlled from the Navbar tab in the admin panel. Settings stored as `logoSize` and `logoPosition` in the `settings` JSON column. On mobile (≤991px), centered logos revert to default left-aligned position. Live preview updates are supported via the postMessage system.
- **Platform Landing Page:** Full landing page with hero section, features grid (6 cards), pricing section (fetched from API via `LandingPricing.jsx`), contact section (address, phone, email), and structured footer. Navbar uses Fluxe logo image (`/assets/images/fluxe-logo.png`) with smooth-scroll links to Features, Pricing, Contact. Styles in `landing.css`. On mobile, section nav links are hidden but auth links remain visible.
- **Legal/Policy Pages:** Terms & Conditions (`/terms`), Privacy Policy (`/privacy-policy`), Refund & Cancellation Policy (`/refund-policy`), and Shipping & Delivery Policy (`/shipping-policy`) — all include Digital Delivery section, physical address (Karwar, Karnataka, India — 581400), phone (+91 9901954610), and Razorpay-compliant content (payment processing, refund timelines, data handling).
- **About Us Page:** Dedicated About page (`/about`) describing the platform, mission, features, how it works, and values. Required for Razorpay merchant account compliance.
- **Terms Agreement:** Signup page and Site Creation Wizard both require "I agree to Terms & Conditions, Privacy Policy, and Refund Policy" checkbox before proceeding. Google auth signup also blocked until terms are accepted.

### Key Features
- **Dynamic Content:** Configurable homepage elements (sliders, banners, videos), product policies, navigation, and footer customization. Default content (policies, about page, featured video, terms, privacy, order notes) is centralized in `frontend/src/storefront/src/defaults/` with per-category files (jewellery, clothing, beauty, generic) and a single `index.js` entry point. Business categories available in the site creation wizard: Jewellery, Clothing/Fashion, Beauty/Cosmetics.
- **Subscription Management:** Account-level trial, per-site paid plans, Razorpay integration, discount pricing, and a clear site creation flow with plan checks.
- **Admin Panel:** Centralized site content, policy, and SEO management with iframe preview. Includes "Shop the Look" tab for interactive product showcase management.
- **Shop the Look (Lumina):** Interactive product showcase section on homepage. Admin uploads a main "look" image, clicks to place pulsing dots on the image, and assigns product SKUs to each dot. Storefront shows the image with animated dots — clicking a dot opens a product popup with "View Details" link. Product list rendered below the image. Config stored in `site_config.settings.shopTheLook` (`title`, `image`, `imageKey`, `dots[]` with `{x, y, sku}`). Visibility toggle via `showShopTheLook`. Placed after the 3rd category section on homepage. Components: `ShopTheLook.jsx` (storefront), `ShopTheLookEditor.jsx` (admin), `shop-the-look.css` (styles).
- **Product Options:** Supports Color, Custom Selection, and Priced options, impacting cart and order processing.
- **Subcategories:** Three-level category hierarchy via `parent_id`: Category → Subcategory Group (e.g., "Color Options") → Values (e.g., "Red", "Blue"). Admin manages groups/values in CategoriesSection via expandable panel per category. Products store `subcategory_id` referencing a leaf-level value. ProductForm shows grouped dropdown (`<optgroup>`) when subcategories exist. Storefront category pages show each group as a separate filter section with its values. Backend `getCategories` fetches 3 levels deep (parents → children → grandchildren). Column auto-migration via `ensureProductSubcategoryColumn()`. Category deletion cascades to null both `category_id` and `subcategory_id` on products.
- **Subcategory Homepage Sections:** Admins can create homepage product carousel sections filtered by a specific subcategory value via CategoriesSection → "Subcategory Homepage Sections" panel. Config stored in `site_config.settings.subcategorySections[]` with `{id, name, subtitle, subcategoryId, categorySlug, categoryId, subcategoryLabel}`. Rendered on homepage via `SubcategorySection.jsx` component. "View All" links to `/category/:slug?subcategory=:id` which pre-applies the filter on CategoryPage via URL query params.
- **Homepage Section Ordering:** Unified ordering system for both category and subcategory homepage sections. Stored in `site_config.settings.homepageSectionOrder[]` as `{type, id}` entries. Admin UI shows "Homepage Section Order" panel with up/down arrows in CategoriesSection. HomePage.jsx uses `useMemo` to merge categories + subcategory sections in the stored order, maintaining the existing interleave pattern (1st section → ChooseByCategory → 2nd section → WatchAndBuy → FeaturedVideo → remaining).
- **Multi-Currency Support:** Product prices are stored in the admin's configured `defaultCurrency` (settings). The `currency` column on `orders` and `guest_orders` tables records the currency at order creation time. Frontend `CurrencyContext` handles exchange rate conversion for customer-facing display. Admin components use `formatPrice`/`getAdminCurrency` from `priceFormatter.js`. All email flows use the order's stored currency. Exchange rates fetched from `api.exchangerate-api.com` (free tier, cached 24h, no API key needed).
- **Order Flow:** Full order lifecycle: Pending → Confirmed → Packed → Shipped → Delivered (+ Cancelled). COD and Razorpay integration, stock management. On order placement, only the store owner gets a "Review Required" email. Customer receives confirmation email only when admin confirms the order (with tracking link). Packed and shipped status changes also send customer notification emails. Order tracking page (`/order-track`) supports searching by order number with a visual status timeline, or redirects to external tracking URL if configured. Order tracking settings managed under Admin Panel > Settings (show/hide toggle + external URL).
- **Order Cancellation:** Opt-in cancellation system (off by default). Configurable via Settings (`cancellationEnabled`, `cancellationWindowHours`). Customers can request cancellation of pending/confirmed orders within the configured time window. Admin manages cancellation requests via Orders section "Cancellations" sub-tab with approve/reject workflow. Approval auto-cancels the order and restores stock. Customers request via Profile page (logged-in) or tokenized `/cancel/:orderId?token=xxx` links (guests). Cancel link included in order confirmation emails when enabled. Backend: `cancellation_requests` table auto-created in shard DBs, `cancel_token` column on orders/guest_orders, endpoints under `/api/orders/` namespace. State transition guard prevents re-processing.
- **Return Orders:** Opt-in return system (off by default). Configurable via Settings (`returnsEnabled`, `returnWindowDays`, `replacementEnabled`). Admin manages returns via Orders section "Returns" sub-tab with approve/reject/refund workflow. Customers request returns from Profile page (logged-in) or via tokenized `/return/:orderId?token=xxx` links (guests). Return link included in delivery emails when enabled. Status update emails sent on approve/reject/refund. Backend: `return_requests` table auto-created in shard DBs with `resolution` and `photos` columns, endpoints under `/api/orders/` namespace. Return form requires mandatory notes for all reasons, photo uploads (required for damage/wrong item reasons, optional for others, max 5), and resolution preference (Refund/Replacement) when `replacementEnabled` is on. Admin can view photos and resolution preference in the return request detail modal.
- **Order Help Page:** Unified `/order-help/:orderId` page replacing separate cancel/return links. Emails now contain a single "Get Help With This Order" CTA instead of separate cancel/return links. The help page shows contextual actions (Track, Cancel, Return, Contact) based on order status and site settings. Profile page orders use a "Need Help?" expandable section instead of direct cancel/return buttons. Footer includes a "Track / Manage Order" link. Order tracking page shows a "Need help with this order?" button linking to the help page.
- **Product Reviews:** Per-product customer review system with full lifecycle. Customers write reviews from product pages (with eligibility gating for verified purchases) or profile order history. Guest customers review via tokenized email links (`/review/:orderId?token=xxx`). Admin manages reviews under Orders > Reviews sub-tab with approve/reject workflow, stats display, and auto-approve setting. Reviews include star ratings (1-5), title, content, optional images, and verified purchase badge. SEO structured data includes `aggregateRating` and individual `Review` schema for approved reviews. Review tokens generated on delivery for both `orders` and `guest_orders`. Backend: `reviews` table in shard DBs, endpoints under `/api/reviews/` namespace in `reviews-worker.js`. Settings: `reviewsEnabled` (default true), `reviewsAutoApprove` (default false).
- **Storage Usage Tracking:** Detailed D1 and R2 usage tracking, plan limits, and enterprise overage management.
- **Admin Shard Management:** Comprehensive tools for shard lifecycle management.
- **Built-in Analytics:** Lightweight page view tracking, providing aggregated stats on visitors, page views, traffic sources, and more, accessible via the admin panel.
- **Delivery Charges (Global Shipping):** Configurable shipping fee system managed via Admin Panel > Settings > "Shipping & Delivery Charges". Features: master toggle (off = free shipping for all), base flat rate, free-above-threshold toggle with minimum order value, and country/region-based rate overrides. Config stored in `site_config.settings.deliveryConfig` as `{ enabled, flatRate, freeAboveEnabled, freeAbove, regionRates: [{country, state, rate}] }`. Admin sets overrides per country (country-wide rate) or per country+state (specific state rate). Shipping cost calculated on both frontend (CheckoutPage) and backend (orders-worker.js) using identical priority logic: check enabled → free-above threshold → country+state match → country-only match → legacy state-only match → flat rate fallback. Applied to both authenticated and guest orders. Shipping line shown in checkout summaries, order confirmation display, and all email templates. Checkout address form supports 65+ countries with dynamic state/province dropdowns (from `countryStates.js`) — selecting a country updates the state options automatically. PIN code auto-validation only for India; other countries use flexible postal/ZIP code validation. Phone validation relaxed to 7–15 digits for international numbers.

## Build Scripts
After making changes to frontend source files, you **must** run the build scripts for the changes to take effect. The server serves pre-built files, not the source directly.

- **Build Storefront:** `cd frontend/src/storefront && npm run build`
- **Build Platform:** `cd frontend/src/platform && npm run build`
- **Build Both:** `npm run build` (runs `node build.js`)

The storefront Vite build outputs to `frontend/storefront/` and the platform build outputs to `frontend/platform/`. After building, restart the `Start Website` workflow to serve the updated files.

## External Dependencies
- **Cloudflare Pages:** Frontend deployment.
- **Cloudflare Workers:** Backend serverless functions.
- **Cloudflare D1:** Primary database.
- **Cloudflare R2:** Object storage.
- **Cloudflare REST API:** Used for D1 database management and worker binding configurations.
- **Razorpay:** Payment gateway for subscriptions and storefront transactions.
- **Brevo:** Transactional email service (API: `https://api.brevo.com/v3/smtp/email`, `api-key` header auth via `BREVO_API_KEY`). From address: `noreply@fluxe.in`.