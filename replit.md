# Fluxe SaaS Platform

## Overview
Fluxe is a multi-tenant SaaS platform enabling users to create e-commerce websites from templates, each hosted on a unique subdomain (e.g., `store-name.fluxe.in`). It leverages a Cloudflare-centric serverless architecture to provide scalable and efficient online storefronts. The project aims to empower small businesses and entrepreneurs with an accessible and powerful e-commerce presence, offering a comprehensive solution for online sales and brand building.

## User Preferences
I prefer iterative development with clear communication on significant changes. Please ask before making major architectural decisions or large-scale code overhauls. Provide concise explanations and focus on effective solutions. Do not make changes to files in the `frontend/templates/` folder.

## System Architecture

### Core Design
Fluxe uses a **shared shard-based D1 database architecture**: multiple sites share a small number of Cloudflare D1 databases (shards) with `site_id`-based row isolation. The platform database (`env.DB`) stores platform-level data (users, sites metadata, subscriptions, payments, sessions, shards registry, site_usage). Site-specific data (products, categories, orders, carts, wishlists, customers, reviews, etc.) is stored in shared shard D1 databases with site_id filtering on every query.

### Shared Shard Architecture
- **Shards Registry:** The `shards` table in the platform DB tracks all shard databases: `id, binding_name (SHARD_1, SHARD_2...), database_id, database_name, is_active, correction_factor, last_reconciled_at`.
- **Site Assignment:** When a new site is created, it is assigned to the currently active shard (`is_active = 1`). The `shard_id` column on the `sites` table links a site to its shard.
- **Binding Pattern:** Shards use sequential bindings: `SHARD_1`, `SHARD_2`, etc. Added to the worker via `addBindingAndRedeploy` in `d1-manager.js`.
- **DB Resolution:** `site-db.js` provides `resolveSiteDB(env, site)`, `resolveSiteDBById(env, siteId)`, and `resolveSiteDBBySubdomain(env, subdomain)`. It looks up the shard binding via a JOIN with the shards table. Throws an error if no shard is assigned — every site must have a valid `shard_id`.
- **Frontend siteId Routing:** All frontend service functions (`orderService`, `categoryService`, `productService`) accept and pass `siteId` via query params and/or request body. Admin panel callers pass `siteConfig?.id` from `SiteContext`. Backend workers extract `siteId` from query params (GET/DELETE) or body (POST/PUT) for direct shard resolution — no scanning all sites.
- **Migration Lock:** Sites have a `migration_locked` flag. During shard-to-shard migration, writes are blocked. All storefront workers check `checkMigrationLock()` before write operations and return HTTP 423 if locked.
- **No Fallback:** Sites without a `shard_id` will throw an error — the platform DB is never used as a fallback for site data. Legacy `d1_database_id` and `d1_binding_name` columns are still checked as a secondary lookup before erroring.
- **Admin Emails:** Both `savannaik090@gmail.com` and `xiyohe3598@indevgo.com` are configured as platform admins in `ADMIN_EMAILS` array in `admin-worker.js`.
- **Enterprise Plan Protection:** All SQL queries that update `subscription_plan` or `subscription_expires_at` on the `sites` table use `AND COALESCE(subscription_plan, '') != 'enterprise'` (NULL-safe) to prevent overwriting enterprise status. This applies to: trial activation, trial expiry, paid plan activation, subscription cancellation/pause webhooks, subscription renewal/charged webhooks, and site-level expiry checks. Enterprise sites are always protected.
- **Plan Name Preservation:** When a paid subscription expires, is cancelled, or is paused, only `subscription_expires_at` is updated on the sites table — the original `subscription_plan` name (e.g., "Pro", "Standard") is preserved. The `subscriptions` table tracks the status change independently. This allows the frontend to display "Pro - Expired" instead of just "Expired". Trial expiry is the exception: trial plan is overwritten to 'expired' since trial isn't a real plan name worth preserving.
- **Subscription Priority:** `checkAndExpireSubscription` prioritizes trial (account-level) subscriptions first, then falls back to other active subscriptions. This ensures the profile correctly reports trial status.
- **Frontend Plan Resolution Order:** `getSiteSubscriptionInfo` checks enterprise first (always active), then cancelled-but-still-within-period (shows "Cancelling" state), then paid active subscriptions, then falls back to account-level trial status only for sites without their own active paid plan.
- **Subscription Cancellation:** Users can cancel paid subscriptions from the Billing section. The `POST /api/payments/cancel-subscription` endpoint calls Razorpay's cancel API with `cancel_at_cycle_end: 1` (user keeps access until period end), then marks the DB subscription as cancelled. The `cancelRazorpaySubscription()` helper is exported from `payments-worker.js` and also used by admin enterprise assignment.
- **Enterprise Auto-Cancel:** When admin assigns a site as enterprise, any active Razorpay subscription is cancelled first via the API. If the Razorpay cancellation fails, the entire enterprise assignment is aborted to prevent billing leakage. Only after successful cancellation (or if no Razorpay sub exists) does the site get upgraded to enterprise. When enterprise is removed, the site goes to inactive (no plan) — the old subscription was already cancelled on Razorpay, so it cannot be restored. The user must subscribe fresh.
- **Plan Upgrade Auto-Cancel:** When a user upgrades/changes their plan (e.g., Basic → Pro), `activateSubscription()` cancels the old Razorpay subscription via the API before activating the new one. This prevents double billing where both old and new plans charge simultaneously. The check skips the new subscription's own Razorpay ID to avoid self-cancellation.

### Usage Tracking with Correction Factor
- **Row-Level Tracking:** Every table has a `row_size_bytes` column. `estimateRowBytes()` estimates size at write time.
- **Raw Tracking:** `trackD1Write`, `trackD1Delete`, `trackD1Update` maintain raw byte counts in `site_usage.d1_bytes_used`.
- **Baseline:** When a site migrates between shards, tracked bytes are accumulated into `baseline_bytes` and `d1_bytes_used` resets to 0.
- **Correction Factor:** Per-shard `correction_factor` (clamped 0.8–1.5) is computed during reconciliation by comparing actual DB size (from CF API) to sum of all site estimates. If total estimated < 1MB, factor = 1.0.
- **Display Formula:** `displayed_d1 = (baseline_bytes + d1_bytes_used) * correction_factor`
- **Reconciliation:** Admin-triggered via `POST /api/admin/shards/{shardId}/reconcile`. Updates the shard's correction_factor.
- **R2 Tracking:** Via `site_media` table and `recordMediaFile`/`removeMediaFile` functions.
- **Plan Limits:** Basic 500MB D1/5GB R2, Standard 1GB/15GB, Pro 2GB/50GB, Enterprise 2GB/50GB (with overage). Enterprise sites are manually assigned by admin — not self-serve.

### Admin Shard Management API
- `GET /api/admin/shards` — List all shards with sizes and site counts
- `POST /api/admin/shards` — Create new shard (creates D1, applies schema, adds binding, redeploys worker)
- `GET /api/admin/shards/{shardId}/sites` — List sites on a shard
- `POST /api/admin/shards/{shardId}/reconcile` — Reconcile shard correction factor
- `POST /api/admin/shards/{shardId}/set-active` — Set shard as the active target for new sites
- `POST /api/admin/shards/move-site` — Move a site between shards (batched copy → verify → switch → delete)
- `DELETE /api/admin/shards/{shardId}` — Delete empty shard

### Platform DB Tables (env.DB)
- users, sessions, sites (with shard_id, migration_locked, d1_database_id, d1_binding_name columns), subscriptions, payments, plans, platform_settings, site_admin_sessions, site_usage (with baseline_bytes, baseline_updated_at), site_media, shards, enterprise_sites, enterprise_usage_monthly, staff_members

### Shard DB Tables (SHARD_1, SHARD_2, etc.)
- **site_config** (site_id PK) — All site branding, settings, SEO, and social tag data. Holds: brand_name, category, logo_url, favicon_url, primary_color, secondary_color, phone, email, address, social_links, settings (JSON), currency, seo_title, seo_description, seo_og_image, seo_robots, google_verification, og_title, og_description, og_image, og_type, twitter_card, twitter_title, twitter_description, twitter_image, twitter_site
- categories, products, product_variants, orders, guest_orders, carts, wishlists, site_customers, site_customer_sessions, customer_addresses, customer_password_resets, customer_email_verifications, coupons, notifications, reviews, page_seo, site_media, site_usage, activity_log, addresses
- All tables include `row_size_bytes INTEGER DEFAULT 0` column for usage tracking
- All queries filter by `site_id` for tenant isolation
- **Note:** The platform `sites` table was migrated to remove all old branding/SEO/settings columns (auto-migration in `db-init.js`). Only routing/billing columns remain: id, user_id, subdomain, brand_name, category, template_id, is_active, subscription_plan, subscription_expires_at, custom_domain, domain_status, domain_verification_token, cf_hostname_id, shard_id, migration_locked, d1_database_id, d1_binding_name, created_at, updated_at. All site config data goes through `site_config` in the shard.

### Key Utility Files
- `backend/utils/d1-manager.js` — Cloudflare API calls: createDatabase, deleteDatabase, getDatabaseSize, runSchemaOnDB, addBindingAndRedeploy, listAllSiteDatabases
- `backend/utils/site-db.js` — DB resolution: resolveSiteDB, resolveSiteDBById, resolveSiteDBBySubdomain (with shard JOIN), checkMigrationLock (used by all storefront workers to block writes during migration), getSiteConfig (fetches site_config from shard), getSiteWithConfig (merges platform site row with shard config)
- `backend/utils/site-schema.js` — Site table schema definitions with row_size_bytes + ALTER TABLE migrations
- `backend/utils/usage-tracker.js` — Usage tracking (trackD1Write/Delete/Update), correction factor, reconciliation, limits, overage
- `backend/utils/db-init.js` — Platform DB initialization (includes shards table, shard_id + migration_locked columns)

### Technology Stack
- **Frontend:** React 19 + Vite, deployed on Cloudflare Pages.
- **Backend:** Cloudflare Workers for API endpoints and business logic.
- **Database:** Cloudflare D1 (SQLite-compatible) — shared shard D1 databases for site data, platform D1 for platform data.
- **File Storage:** Cloudflare R2 for images and videos.
- **Authentication:** Custom JWT-based system for platform users and per-site customer accounts. Site admin access uses a verification-code-based system. Customer auth (`customer-auth-worker.js`) supports: signup, login, Google Sign-In (`google-login`), logout, profile management, addresses, password reset (request + reset via email token, 1hr expiry), email verification (on signup when `SKIP_EMAIL_VERIFICATION !== 'true'`, 24hr token expiry), and resend verification. Password reset invalidates all existing sessions. Email verification blocks login until verified. Tables: `customer_password_resets`, `customer_email_verifications`. Emails sent via `utils/email.js` (Resend/SendGrid). **All customer data (customers, sessions, addresses, password resets, email verifications) is stored in the shard DB, not the platform DB.** The `validateCustomerAuth` export scans shards to find the session token. The `validateAnyAuth` function in `auth.js` also resolves customer sessions from shard DBs — uses `siteId` query param for direct lookup (fast path), falls back to scanning all sites with per-site error resilience and shard deduplication. All session/customer queries enforce `site_id` filtering for tenant isolation. Token-based endpoints (`reset-password`, `verify-email`) accept optional `siteId` for fast lookup; without it they scan all shards.
- **Google Sign-In:** Both platform auth and storefront customer auth support Google Sign-In via Google Identity Services (GIS). Uses the platform-level `env.GOOGLE_CLIENT_ID`. The `/api/site` endpoint exposes `googleClientId` so storefronts can initialize the GIS library. Token validation enforces `aud`, `iss` (accounts.google.com), and `email_verified` claims. Google-only customers (empty `password_hash`) are blocked from password login with a `USE_GOOGLE_LOGIN` error code. New Google users are auto-created with `email_verified = 1` and empty `password_hash`. Existing users logging in via Google get their `email_verified` set to 1 if not already.
- **UI/UX:** Templates provide the base design, with extensive customization options through an admin panel. The platform emphasizes a clean, modern aesthetic with responsive design. Template registry lives in `backend/config/templates.js`.
- **Templates:** Dynamic templates are registered in `backend/config/templates.js`. The primary template is `storefront` (formerly `template1`). Each template is an independent React app under `frontend/src/`. SEO configs per template live in `backend/workers/seo/templates/{templateId}/seo-config.js`. Static templates in `frontend/templates/` are unrelated to the dynamic system.
- **SEO:** Dual-layer SEO architecture with server-side injection for crawlers and client-side management for SPA navigation. It includes dynamic sitemap/robots.txt generation, structured data (JSON-LD), and comprehensive admin controls for page, product, category, and site-level SEO. **SEO data fetchers (`fetchProductSEO`, `fetchCategorySEO`, `fetchPageSEO`) and the sitemap generator read from the shard DB, not the platform DB.** Site-level SEO fields (`seo_title`, `seo_description`, etc.) are still read from the platform `sites` table.
- **Payments Worker:** `payment_transactions`, `subscriptions`, `subscription_plans`, `pending_subscriptions` stay in the platform DB. Order lookups in `verifyPayment` search shard DBs for `orders` and `guest_orders`.
- **Cleanup:** The worker exports a `scheduled` handler that cleans up expired platform sessions/tokens and expired shard customer sessions/password resets/email verifications. Configure via Cloudflare cron triggers (e.g., daily).

### Key Features
- **Dynamic Content Management:** Homepage categories, hero sliders, welcome banners, "Watch & Buy" shoppable videos, featured video sections, and customer reviews are fully dynamic and configurable via the admin panel.
- **Product Policies:** Customizable shipping, returns, and care guide policies on product detail pages, with category-based defaults.
- **Navigation & Footer Customization:** Admins can manage navbar menus, custom footer links, social media links, and bottom navigation bar options.
- **Subscription Management:** Account-level 7-day free trial (covers all sites, unlimited creation during trial). After trial expires, all sites are disabled. Paid subscriptions are per-site (each site needs its own plan). Plans are admin-managed via the admin panel. Razorpay integration for payments. **Discount pricing:** Plans support an optional `original_price` field — when set, the PlanSelector shows the original price with a strikethrough, the discounted price, and a "% OFF" badge. Admin panel validates `original_price > display_price`. **Site creation flow:** "Create Website" always opens the wizard (no plan check upfront). After filling in all details and clicking "Create Website", if the user is NOT on an active trial, a plan overlay (without trial option) is shown so they can subscribe for the new site. Trial users create freely.
- **Admin Panel:** Centralized "Edit Website" section for managing all site content, policies, and SEO. Includes an iframe preview for real-time changes.
- **Product Options:** Products support 3 types of options stored as JSON in the `options` TEXT column: **Color Options** (with hex codes, image tagging via `imageColorMap`, and gallery filtering), **Custom Selection Options** (size/weight/etc., no price impact), and **Priced Options** (add-ons like Dupatta that modify the effective price). All options must be selected before Add to Cart / Buy Now. Selected options are stored in cart items (`selectedOptions`), passed to orders, and displayed in cart panel, checkout, order confirmation, admin order details, and email templates. Cart item uniqueness = `productId` + `JSON.stringify(selectedOptions)`.
- **Order Flow:** Supports both Cash on Delivery (COD) and Razorpay payments, with distinct flows for order creation, stock management, and email notifications.
- **Customer Addresses:** Server-side storage and management of customer addresses for logged-in users.
- **Storage Usage Tracking:** Row-level byte tracking with per-shard correction factor. R2 tracking via `site_media` table. Plan limits: Basic 500MB/5GB, Standard 1GB/15GB, Pro 2GB/50GB, Enterprise 2GB/50GB. Basic/Standard/Pro hard-block at limit. API: `GET /api/usage?siteId=...` (read), `POST /api/usage?siteId=...&action=reconcile` (force recalculation). No self-serve overage toggle — enterprise overage is fully admin-managed.
- **Enterprise Management:** Admin assigns sites to enterprise plan via `enterprise_sites` table (search by subdomain/brand name in admin panel, `GET /api/admin/enterprise/search?q=...`). Enterprise sites always allow overage (never blocked). Monthly overage snapshots in `enterprise_usage_monthly`. Admin can configure overage rates (defaults: ₹0.75/GB D1, ₹0.015/GB R2), view per-site usage/invoices, and mark invoices paid. Enterprise sites show overage cost breakdown (D1 + R2 separately) and payment history in user dashboard billing section. Enterprise tables (`enterprise_sites`, `enterprise_usage_monthly`) are initialized in `db-init.js`.
- **Admin Shard Management:** Create/list/reconcile/move/delete shards via `/api/admin/shards/*` endpoints. Replaces old per-site database management.

## External Dependencies
- **Cloudflare Pages:** Frontend deployment.
- **Cloudflare Workers:** Backend serverless functions.
- **Cloudflare D1:** Primary database (platform + shared shard databases).
- **Cloudflare R2:** Object storage for static assets (images, videos).
- **Cloudflare REST API:** Used for shard D1 database management (create, delete, query size, run schema, manage worker bindings). Requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as Cloudflare Worker secrets (set via `wrangler secret put`). Schema application batches SQL statements (15 per batch) to stay under Cloudflare's 50-subrequest limit per Worker invocation.
- **Active Shards:** SHARD_1 = `saas-sites-db` (database_id: `da11d91d-13da-43a5-9360-321d880a90d1`). New sites are automatically assigned to the active shard.
- **Razorpay:** Payment gateway for platform subscriptions and storefront transactions.
- **Resend/SendGrid:** Email sending services. `RESEND_API_KEY` must be set as a Cloudflare Worker secret (`wrangler secret put RESEND_API_KEY`) for production. The `sendEmail` utility uses `Fluxe <FROM_EMAIL>` as sender, defaults to `noreply@fluxe.in`. If no email provider is configured, emails are NOT sent and a warning is logged. The `from` field uses Resend's display-name format: `Fluxe <noreply@fluxe.in>`.
