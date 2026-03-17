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
- **DB Resolution:** `site-db.js` provides `resolveSiteDB(env, site)`, `resolveSiteDBById(env, siteId)`, and `resolveSiteDBBySubdomain(env, subdomain)`. It looks up the shard binding via a JOIN with the shards table. Falls back to `env.DB` if no shard is assigned (backward compatibility for existing sites).
- **Migration Lock:** Sites have a `migration_locked` flag. During shard-to-shard migration, writes are blocked.
- **Backward Compatibility:** Existing sites with `shard_id = NULL` continue to use the platform DB. Legacy `d1_database_id` and `d1_binding_name` columns are still checked as a fallback.
- **Admin Emails:** Both `savannaik090@gmail.com` and `xiyohe3598@indevgo.com` are configured as platform admins in `ADMIN_EMAILS` array in `admin-worker.js`.

### Usage Tracking with Correction Factor
- **Row-Level Tracking:** Every table has a `row_size_bytes` column. `estimateRowBytes()` estimates size at write time.
- **Raw Tracking:** `trackD1Write`, `trackD1Delete`, `trackD1Update` maintain raw byte counts in `site_usage.d1_bytes_used`.
- **Baseline:** When a site migrates between shards, tracked bytes are accumulated into `baseline_bytes` and `d1_bytes_used` resets to 0.
- **Correction Factor:** Per-shard `correction_factor` (clamped 0.8–1.5) is computed during reconciliation by comparing actual DB size (from CF API) to sum of all site estimates. If total estimated < 1MB, factor = 1.0.
- **Display Formula:** `displayed_d1 = (baseline_bytes + d1_bytes_used) * correction_factor`
- **Reconciliation:** Admin-triggered via `POST /api/admin/shards/{shardId}/reconcile`. Updates the shard's correction_factor.
- **R2 Tracking:** Via `site_media` table and `recordMediaFile`/`removeMediaFile` functions.
- **Plan Limits:** Basic 500MB D1/5GB R2, Pro 1.5GB/50GB, Premium 3GB/100GB. Overage available on Premium only.

### Admin Shard Management API
- `GET /api/admin/shards` — List all shards with sizes and site counts
- `POST /api/admin/shards` — Create new shard (creates D1, applies schema, adds binding, redeploys worker)
- `GET /api/admin/shards/{shardId}/sites` — List sites on a shard
- `POST /api/admin/shards/{shardId}/reconcile` — Reconcile shard correction factor
- `POST /api/admin/shards/{shardId}/set-active` — Set shard as the active target for new sites
- `POST /api/admin/shards/move-site` — Move a site between shards (batched copy → verify → switch → delete)
- `DELETE /api/admin/shards/{shardId}` — Delete empty shard

### Platform DB Tables (env.DB)
- users, sessions, sites (with shard_id, migration_locked, d1_database_id, d1_binding_name columns), subscriptions, payments, plans, platform_settings, site_admin_sessions, site_usage (with baseline_bytes, baseline_updated_at), site_media, shards

### Shard DB Tables (SHARD_1, SHARD_2, etc.)
- categories, products, product_variants, orders, guest_orders, carts, wishlists, site_customers, site_customer_sessions, customer_addresses, customer_password_resets, customer_email_verifications, coupons, notifications, reviews, page_seo, site_media, site_usage, activity_log, addresses
- All tables include `row_size_bytes INTEGER DEFAULT 0` column for usage tracking
- All queries filter by `site_id` for tenant isolation

### Key Utility Files
- `backend/utils/d1-manager.js` — Cloudflare API calls: createDatabase, deleteDatabase, getDatabaseSize, runSchemaOnDB, addBindingAndRedeploy, listAllSiteDatabases
- `backend/utils/site-db.js` — DB resolution: resolveSiteDB, resolveSiteDBById, resolveSiteDBBySubdomain (with shard JOIN)
- `backend/utils/site-schema.js` — Site table schema definitions with row_size_bytes + ALTER TABLE migrations
- `backend/utils/usage-tracker.js` — Usage tracking (trackD1Write/Delete/Update), correction factor, reconciliation, limits, overage
- `backend/utils/db-init.js` — Platform DB initialization (includes shards table, shard_id + migration_locked columns)

### Technology Stack
- **Frontend:** React 19 + Vite, deployed on Cloudflare Pages.
- **Backend:** Cloudflare Workers for API endpoints and business logic.
- **Database:** Cloudflare D1 (SQLite-compatible) — shared shard D1 databases for site data, platform D1 for platform data.
- **File Storage:** Cloudflare R2 for images and videos.
- **Authentication:** Custom JWT-based system for platform users and per-site customer accounts. Site admin access uses a verification-code-based system. Customer auth (`customer-auth-worker.js`) supports: signup, login, logout, profile management, addresses, password reset (request + reset via email token, 1hr expiry), email verification (on signup when `SKIP_EMAIL_VERIFICATION !== 'true'`, 24hr token expiry), and resend verification. Password reset invalidates all existing sessions. Email verification blocks login until verified. Tables: `customer_password_resets`, `customer_email_verifications`. Emails sent via `utils/email.js` (Resend/SendGrid).
- **UI/UX:** Templates provide the base design, with extensive customization options through an admin panel. The platform emphasizes a clean, modern aesthetic with responsive design. Template registry lives in `backend/config/templates.js`.
- **Templates:** Dynamic templates are registered in `backend/config/templates.js`. The primary template is `storefront` (formerly `template1`). Each template is an independent React app under `frontend/src/`. SEO configs per template live in `backend/workers/seo/templates/{templateId}/seo-config.js`. Static templates in `frontend/templates/` are unrelated to the dynamic system.
- **SEO:** Dual-layer SEO architecture with server-side injection for crawlers and client-side management for SPA navigation. It includes dynamic sitemap/robots.txt generation, structured data (JSON-LD), and comprehensive admin controls for page, product, category, and site-level SEO.

### Key Features
- **Dynamic Content Management:** Homepage categories, hero sliders, welcome banners, "Watch & Buy" shoppable videos, featured video sections, and customer reviews are fully dynamic and configurable via the admin panel.
- **Product Policies:** Customizable shipping, returns, and care guide policies on product detail pages, with category-based defaults.
- **Navigation & Footer Customization:** Admins can manage navbar menus, custom footer links, social media links, and bottom navigation bar options.
- **Subscription Management:** Account-level 7-day free trial (covers all sites, unlimited creation during trial). After trial expires, all sites are disabled. Paid subscriptions are per-site (each site needs its own plan). Plans are admin-managed via the admin panel. Razorpay integration for payments.
- **Admin Panel:** Centralized "Edit Website" section for managing all site content, policies, and SEO. Includes an iframe preview for real-time changes.
- **Order Flow:** Supports both Cash on Delivery (COD) and Razorpay payments, with distinct flows for order creation, stock management, and email notifications.
- **Customer Addresses:** Server-side storage and management of customer addresses for logged-in users.
- **Storage Usage Tracking:** Row-level byte tracking with per-shard correction factor. R2 tracking via `site_media` table. Plan limits: Basic 500MB D1/5GB R2, Pro 1.5GB/50GB, Premium 3GB/100GB. Basic/Pro hard-block at limit. Premium users must opt-in to overage charges via billing toggle. Overage rates: ₹0.75/GB D1, ₹0.015/GB R2. API: `GET /api/usage?siteId=...` (read), `POST /api/usage?siteId=...` (toggle overage), `POST /api/usage?siteId=...&action=reconcile` (force recalculation).
- **Admin Shard Management:** Create/list/reconcile/move/delete shards via `/api/admin/shards/*` endpoints. Replaces old per-site database management.

## External Dependencies
- **Cloudflare Pages:** Frontend deployment.
- **Cloudflare Workers:** Backend serverless functions.
- **Cloudflare D1:** Primary database (platform + shared shard databases).
- **Cloudflare R2:** Object storage for static assets (images, videos).
- **Cloudflare REST API:** Used for shard D1 database management (create, delete, query size, run schema, manage worker bindings). Requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` environment variables.
- **Razorpay:** Payment gateway for platform subscriptions and storefront transactions.
- **Resend/SendGrid:** Email sending services. `RESEND_API_KEY` must be set as a Cloudflare Worker secret (`wrangler secret put RESEND_API_KEY`) for production. The `sendEmail` utility uses `Fluxe <FROM_EMAIL>` as sender, defaults to `noreply@fluxe.in`. If no email provider is configured, emails are NOT sent and a warning is logged. The `from` field uses Resend's display-name format: `Fluxe <noreply@fluxe.in>`.
