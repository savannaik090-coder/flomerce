# Fluxe SaaS Platform

## Overview
Fluxe is a multi-tenant SaaS platform enabling users to create e-commerce websites from templates, each hosted on a unique subdomain (e.g., `store-name.fluxe.in`). It leverages a Cloudflare-centric serverless architecture to provide scalable and efficient online storefronts. The project aims to empower small businesses and entrepreneurs with an accessible and powerful e-commerce presence, offering a comprehensive solution for online sales and brand building.

## User Preferences
I prefer iterative development with clear communication on significant changes. Please ask before making major architectural decisions or large-scale code overhauls. Provide concise explanations and focus on effective solutions. Do not make changes to files in the `frontend/templates/` folder.

## System Architecture

### Core Design
Fluxe operates on a multi-tenant architecture where all user data is stored in shared database tables, isolated by a `site_id` column. Every API endpoint enforces `site_id` filtering to ensure data segregation. Subdomains are dynamically detected by the backend worker and routed to the appropriate storefront.

### Technology Stack
- **Frontend:** React 19 + Vite, deployed on Cloudflare Pages.
- **Backend:** Cloudflare Workers for API endpoints and business logic.
- **Database:** Cloudflare D1 (SQLite-compatible) for shared, `site_id`-partitioned data.
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
- **Storage Usage Tracking:** Per-site D1 (database) and R2 (media) storage tracking across all site-specific operations. All tracking calls are `await`ed (not fire-and-forget) to guarantee execution in Cloudflare Workers. D1 tracking rules: bytes are added ONLY on INSERT operations, subtracted ONLY on DELETE operations — UPDATE operations do NOT change the byte count (fixes inflation bug). Tracked INSERT operations: products (create), categories (create), orders (create/guest create), customer signups, customer addresses (create), wishlists (add), cart creation, page SEO (first save), default category creation on site init. Tracked DELETE operations: products, categories, wishlists (remove), customer addresses (delete), media files (image/video delete). R2 tracking covers: image uploads/deletes and video uploads/deletes via upload-worker — all via `recordMediaFile`/`removeMediaFile` utilities. Platform-level tables (users, sessions, subscriptions, payments) are not tracked per-site. Usage stored in `site_usage` / `site_media` tables. Plan limits: Basic 500MB D1/5GB R2, Pro 1.5GB/50GB, Premium 3GB/100GB. Basic/Pro hard-block at limit. Premium users must opt-in to overage charges via billing toggle (`overageEnabled` in site settings JSON). Overage rates: ₹0.75/GB D1, ₹0.015/GB R2. Reconciliation: auto-backfills on first GET if both D1+R2=0; auto-reconciles R2 from `site_media` table if R2=0 but media files exist; manual reconcile via `POST /api/usage?siteId=...&action=reconcile`. Core logic in `backend/utils/usage-tracker.js`. API: `GET /api/usage?siteId=...` (read), `POST /api/usage?siteId=...` (toggle overage), `POST /api/usage?siteId=...&action=reconcile` (force full recalculation). Works for all current and future templates since tracking is keyed by siteId and all file uploads route through the same upload-worker.

## External Dependencies
- **Cloudflare Pages:** Frontend deployment.
- **Cloudflare Workers:** Backend serverless functions.
- **Cloudflare D1:** Primary database.
- **Cloudflare R2:** Object storage for static assets (images, videos).
- **Razorpay:** Payment gateway for platform subscriptions and storefront transactions.
- **Resend/SendGrid:** Email sending services. `RESEND_API_KEY` must be set as a Cloudflare Worker secret (`wrangler secret put RESEND_API_KEY`) for production. The `sendEmail` utility uses `Fluxe <FROM_EMAIL>` as sender, defaults to `noreply@fluxe.in`. If no email provider is configured, emails are NOT sent and a warning is logged. The `from` field uses Resend's display-name format: `Fluxe <noreply@fluxe.in>`.