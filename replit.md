# Fluxe SaaS Platform

## Overview
Fluxe is a multi-tenant SaaS platform designed to empower small businesses and entrepreneurs by enabling them to create scalable e-commerce websites from templates, each hosted on a unique subdomain (e.g., `store-name.fluxe.in`). It leverages a Cloudflare-centric serverless architecture to provide efficient online storefronts, comprehensive online sales capabilities, and brand-building tools. The project aims to be an accessible and powerful solution for establishing an online presence.

## User Preferences
I prefer iterative development with clear communication on significant changes. Please ask before making major architectural decisions or large-scale code overhauls. Provide concise explanations and focus on effective solutions. Do not make changes to files in the `frontend/templates/` folder.

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
- **SEO:** Dual-layer architecture with server-side rendering and client-side management. SEO data is primarily sourced from shard DBs.
- **Push Notifications:** Full Web Push Protocol (VAPID) implementation using Cloudflare Workers' Web Crypto API, with service worker for client-side handling and admin panel for management and auto-triggers (new product, price drop).
- **Store Logo:** Uploaded during site creation (base64 → R2) or via Admin Panel > Edit Website > Navbar tab. Stored as `logo_url` in `site_config`. Navbar renders the logo image when available, falling back to brand name text. Logo size is configurable via a slider (20–80px, default 44px) and position can be set to left or center, both controlled from the Navbar tab in the admin panel. Settings stored as `logoSize` and `logoPosition` in the `settings` JSON column. On mobile (≤991px), centered logos revert to default left-aligned position. Live preview updates are supported via the postMessage system.

### Key Features
- **Dynamic Content:** Configurable homepage elements (sliders, banners, videos), product policies, navigation, and footer customization.
- **Subscription Management:** Account-level trial, per-site paid plans, Razorpay integration, discount pricing, and a clear site creation flow with plan checks.
- **Admin Panel:** Centralized site content, policy, and SEO management with iframe preview.
- **Product Options:** Supports Color, Custom Selection, and Priced options, impacting cart and order processing.
- **Order Flow:** COD and Razorpay integration, stock management, and email notifications.
- **Storage Usage Tracking:** Detailed D1 and R2 usage tracking, plan limits, and enterprise overage management.
- **Admin Shard Management:** Comprehensive tools for shard lifecycle management.
- **Built-in Analytics:** Lightweight page view tracking, providing aggregated stats on visitors, page views, traffic sources, and more, accessible via the admin panel.

## External Dependencies
- **Cloudflare Pages:** Frontend deployment.
- **Cloudflare Workers:** Backend serverless functions.
- **Cloudflare D1:** Primary database.
- **Cloudflare R2:** Object storage.
- **Cloudflare REST API:** Used for D1 database management and worker binding configurations.
- **Razorpay:** Payment gateway for subscriptions and storefront transactions.
- **Resend/SendGrid:** Email sending services.