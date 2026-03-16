# Fluxe SaaS Platform

## Overview
Fluxe is a multi-tenant SaaS platform enabling users to create e-commerce websites from templates, each hosted on a unique subdomain (e.g., `store-name.fluxe.in`). It leverages a Cloudflare-centric serverless architecture to provide scalable and efficient online storefronts. The project aims to empower small businesses and entrepreneurs with an accessible and powerful e-commerce presence, offering a comprehensive solution for online sales and brand building.

## User Preferences
I prefer iterative development with clear communication on significant changes. Please ask before making major architectural decisions or large-scale code overhauls. Provide concise explanations and focus on effective solutions. Do not make changes to files in the `frontend/templates/` folder.

## System Architecture

### Core Design
Fluxe uses a **per-site D1 database architecture**: each site gets its own Cloudflare D1 database created dynamically via the Cloudflare REST API at site creation time. The platform database (`env.DB`) stores platform-level data (users, sites metadata, subscriptions, payments, sessions). Site-specific data (products, categories, orders, carts, wishlists, customers, reviews, etc.) is stored in per-site D1 databases. Worker redeployment is triggered automatically to add new D1 bindings.

### Per-Site D1 Architecture
- **Database Creation:** When a new site is created, `d1-manager.js` calls the Cloudflare API to create a dedicated D1 database named `site-{subdomain}-{shortId}`.
- **Schema Initialization:** `site-schema.js` defines all site-specific tables. Schema is run on the new D1 via the Cloudflare API.
- **Binding Pattern:** Each per-site D1 is bound as `SITE_DB_{shortId.toUpperCase()}` where `shortId = siteId.substring(0, 8)`. Stored in `sites.d1_binding_name` and `sites.d1_database_id` columns.
- **DB Resolution:** `site-db.js` provides `resolveSiteDB(env, site)`, `resolveSiteDBById(env, siteId)`, and `resolveSiteDBBySubdomain(env, subdomain)` to resolve the correct D1 binding for any site. Falls back to `env.DB` if no per-site binding exists (backward compatibility).
- **Auto-Redeploy:** After creating a D1, `addBindingAndRedeploy` in `d1-manager.js` fetches the current worker config, adds the new D1 binding, and redeploys the worker.
- **Usage Tracking:** D1 usage is tracked via the Cloudflare API `file_size` field (exact bytes) rather than row-level estimation. `usage-tracker.js` calls `getDatabaseSize()` from `d1-manager.js`.
- **Admin Management:** Admin panel has database management endpoints (`/api/admin/databases/*`) for listing, provisioning, sizing, and deleting per-site databases.

### Platform DB Tables (env.DB)
- users, sessions, sites (with d1_database_id, d1_binding_name columns), subscriptions, payments, plans, platform_settings, site_admin_sessions, site_usage, site_media

### Per-Site DB Tables (per-site D1)
- categories, products, product_variants, orders, guest_orders, carts, wishlists, site_customers, site_customer_sessions, customer_addresses, customer_password_resets, customer_email_verifications, coupons, notifications, reviews, page_seo, site_media, site_usage, activity_log, addresses

### Key Utility Files
- `backend/utils/d1-manager.js` — Cloudflare API calls: createDatabase, deleteDatabase, getDatabaseSize, runSchemaOnDB, addBindingAndRedeploy, listAllSiteDatabases
- `backend/utils/site-db.js` — DB resolution: resolveSiteDB, resolveSiteDBById, resolveSiteDBBySubdomain
- `backend/utils/site-schema.js` — Per-site table schema definitions (getSiteSchemaStatements)
- `backend/utils/usage-tracker.js` — Usage tracking, limits, overage billing
- `backend/utils/db-init.js` — Platform DB initialization (includes d1_database_id, d1_binding_name columns)

### Technology Stack
- **Frontend:** React 19 + Vite, deployed on Cloudflare Pages.
- **Backend:** Cloudflare Workers for API endpoints and business logic.
- **Database:** Cloudflare D1 (SQLite-compatible) — per-site D1 databases for site data, shared platform D1 for platform data.
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
- **Storage Usage Tracking:** Per-site D1 size is fetched from Cloudflare API (`file_size` field) for exact billing. R2 tracking via `site_media` table. Plan limits: Basic 500MB D1/5GB R2, Pro 1.5GB/50GB, Premium 3GB/100GB. Basic/Pro hard-block at limit. Premium users must opt-in to overage charges via billing toggle. Overage rates: ₹0.75/GB D1, ₹0.015/GB R2. API: `GET /api/usage?siteId=...` (read), `POST /api/usage?siteId=...` (toggle overage), `POST /api/usage?siteId=...&action=reconcile` (force recalculation).
- **Admin Database Management:** `GET /api/admin/databases` (list all sites with DB info), `GET /api/admin/databases/sizes` (fetch exact sizes from CF API), `POST /api/admin/databases/provision` (provision DB for existing site), `DELETE /api/admin/databases/{siteId}` (delete site's DB).

## External Dependencies
- **Cloudflare Pages:** Frontend deployment.
- **Cloudflare Workers:** Backend serverless functions.
- **Cloudflare D1:** Primary database (platform + per-site databases).
- **Cloudflare R2:** Object storage for static assets (images, videos).
- **Cloudflare REST API:** Used for per-site D1 database management (create, delete, query size, run schema, manage worker bindings). Requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` environment variables.
- **Razorpay:** Payment gateway for platform subscriptions and storefront transactions.
- **Resend/SendGrid:** Email sending services. `RESEND_API_KEY` must be set as a Cloudflare Worker secret (`wrangler secret put RESEND_API_KEY`) for production. The `sendEmail` utility uses `Fluxe <FROM_EMAIL>` as sender, defaults to `noreply@fluxe.in`. If no email provider is configured, emails are NOT sent and a warning is logged. The `from` field uses Resend's display-name format: `Fluxe <noreply@fluxe.in>`.
