# Flomerce SaaS Platform

## Overview
Flomerce is a multi-tenant SaaS platform empowering small businesses to create scalable e-commerce websites from templates, hosted on unique subdomains. It offers efficient online storefronts, comprehensive sales tools, and brand-building functionalities through a Cloudflare-centric serverless architecture. Key capabilities include dynamic content, subscription management, an admin panel with iframe preview, product options, subcategories, multi-currency support, a robust order flow with cancellation and return systems, product reviews, inventory locations, storage usage tracking, built-in analytics, and global shipping configurations. The platform aims to be an accessible and powerful solution for establishing an online presence.

## User Preferences
I prefer iterative development with clear communication on significant changes. Please ask before making major architectural decisions or large-scale code overhauls. Provide concise explanations and focus on effective solutions. Do not make changes to files in the `frontend/templates/` folder.

## System Architecture

### Core Design
Flomerce utilizes a shared shard-based D1 database architecture, isolating `site_id`-based rows within Cloudflare D1 databases. A platform database (`env.DB`) stores global data, while site-specific data resides in shard D1 databases, always filtered by `site_id`.

### Shared Shard Architecture
- **Shards Registry:** `shards` table tracks shard databases.
- **Site Assignment:** New sites are assigned to active shards.
- **Binding Pattern:** Shards are dynamically bound to workers.
- **DB Resolution:** Utilities resolve the correct shard DB.

### Usage Tracking
- **Row-Level Tracking:** Estimated `row_size_bytes` contributes to `site_usage.d1_bytes_used`.
- **R2 Tracking:** Managed via `site_media` table.
- **Plan Limits:** Hard limits for Basic/Standard/Pro plans, with enterprise plans allowing overage.

### Plan-Based Feature Gating
- **Plan hierarchy:** Trial → Starter → Growth → Pro → Enterprise.
- **Count limits:** Enforced for sites, staff, and inventory locations.
- **Feature flags:** Backend enforcement via `checkFeatureAccess` and `checkCountLimit`. Frontend gating uses `FeatureGate` component with upgrade prompts.

### Admin Shard Management API
- Provides endpoints for managing shards (listing, creating, reconciling, activating, moving, deleting).

### Translation Architecture
- **Platform (System A):** `react-i18next` for public landing surfaces (LandingPage, Navbar, Pricing, Contact, About). Other platform pages remain hard-coded English.
- **Storefront (System B):** Hybrid server + client model using Microsoft Translator.
    - **Server-composed payloads:** Storefront API endpoints accept `?lang=` parameter, translate merchant content server-side, and are CDN-cached.
    - **Pre-translated bundle:** Static literals and default content served from a pre-translated dictionary by `/api/storefront/:siteId/translations/:lang`.
- **Language Control:** Shopper-controlled via `localStorage.flomerce_lang` and `LanguageSwitcher`.
- **Caching:** Per-site `translation_cache` shard table, cross-site `translation_memory` table. Enforces per-site daily character cap.

### Per-Section Color Scheme System
- **Concept:** Merchant-defined, reusable bundles of 7 role-based colors assigned to storefront sections. Max 5 schemes, one is always the default.
- **Storage:** `theme_config` TEXT column on `site_config` stores schemes and section assignments.
- **`applyBrandAsDefault` flag:** Distinguishes legacy sites from merchant-engaged sites for theme application to unassigned sections.
- **SchemeScope wrapper:** Applies recoloring using CSS variables and scoped `!important` CSS rules to section elements.
- **Per-section overrides:** Individual color slots can be overridden per section.
- **Admin UI:** Visual Customizer includes a "Theme" tab for managing schemes and per-section customization.

### Database Tables
- **Platform DB:** `users`, `sessions`, `sites`, `subscriptions`, `payments`, `shards`, `enterprise_sites`, `enterprise_usage_monthly`, `pending_subscriptions`, `processed_webhooks`.
- **Shard DBs:** `site_config`, `categories`, `products`, `orders`, `carts`, `site_customers`, `reviews`, `page_views`, `site_media`, `translation_cache`, `i18n_overrides`.

### Technology Stack
- **Frontend:** React 19 + Vite, Cloudflare Pages.
- **Backend:** Cloudflare Workers.
- **Database:** Cloudflare D1.
- **File Storage:** Cloudflare R2.
- **Authentication:** Custom JWT for platform users, verification-code for site admins, customer auth with Google Sign-In.
- **UI/UX:** Theme-based template system (Classic, Modern) with admin controls and Visual Customizer.
- **SEO:** Server-side meta tag injection, dynamic sitemap.xml, robots.txt, structured data.
- **CDN Edge Caching:** Two-tier caching (browser and CDN) with cache invalidation on write operations.

### Key Features
- **Dynamic Content:** Configurable homepage elements and default content.
- **Template/Theme System:** Classic and Modern themes with theme-specific components.
- **Admin Panel:** Centralized content, policy, SEO management, iframe preview, Visual Customizer.
- **Payment-First Site Creation:** Wizard data persisted server-side before payment, site auto-created on subscription activation, dashboard reconciliation.
- **Duplicate Subscription Prevention:** Unique index on `subscriptions.razorpay_subscription_id`.
- **Plan Downgrade Flow:** Scheduled to take effect at current plan's cycle end.
- **Trial & Subscription Cleanup:** Cron job for expiring trials and subscriptions.
- **Order-Before-Payment:** Storefront checkout creates order before payment, updated upon verification.
- **Stock Reservation:** Stock decremented at order creation.
- **Customer Session Optimization:** Efficient customer auth validation.
- **Shop the Look:** Interactive product showcase.
- **Product Options:** Color, custom selection, priced options.
- **Subcategories:** Three-level category hierarchy.
- **Multi-Currency Support:** Frontend conversion via `exchangerate-api.com`.
- **Additional Notification Recipients:** Up to 5 staff emails for order notifications (Growth+).
- **WhatsApp Business Notifications:** Automated order updates (Growth+).
- **Order Flow:** Full order lifecycle.
- **Order Cancellation:** Customer-initiated with admin approval.
- **Return Orders:** Customer-initiated with admin approval/refund.
- **Order Help Page:** Unified page for order actions.
- **Product Reviews:** Per-product reviews with star ratings and moderation.
- **Inventory Locations:** Multi-location tracking.
- **Delivery Charges:** Configurable global shipping fees.
- **International Phone Input:** Country code dropdown with E.164 formatting.
- **Shiprocket Shipping Integration:** India-specific, per-tenant opt-in for automated order shipping, AWB assignment, label generation. Includes dynamic per-courier pricing markup, default-courier opt-in, per-order picker, and Shiprocket webhook processing. Hardened with token management, payload correctness, lease-based claims, and HMAC-signed quotes.
- **PDP Conversion-Sticky Layout:** Two layouts (classic/sticky) with visual identity overhaul (Lora font, cream/brown palette). Flexible product specifications (`products.specifications TEXT`). Product Page Editor in Visual Customizer for PDP behavior control.
- **Landing Industry Showcase:** Rich section showcasing industry-specific features between hero and features grid.
- **Abandoned Cart Reminders:** Automated reminders via WhatsApp/email for logged-in customers. Configurable delay, max reminders, and channels. Cron-triggered.

### Shared UI Components
- **`frontend/src/shared/ui/`:** `Modal.jsx`, `AlertModal.jsx`, `ConfirmDialog.jsx`, `Toast.jsx`, `styles.css`. Providers mounted at top-level `App.jsx` for both platform and storefront.

## External Dependencies
- **Cloudflare Pages:** Frontend hosting.
- **Cloudflare Workers:** Backend serverless compute.
- **Cloudflare D1:** Primary database.
- **Cloudflare R2:** Object storage.
- **Cloudflare REST API:** D1 database management and worker configuration.
- **Razorpay:** Payment gateway.
- **Brevo:** Transactional email service (`https://api.brevo.com/v3/smtp/email`).
- **WhatsApp Business API:** Meta Cloud API (`graph.facebook.com/v21.0`) or Interakt (`api.interakt.ai/v1`).
- **api.exchangerate-api.com:** Exchange rate data.