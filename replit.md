# Flomerce SaaS Platform

## Overview
Flomerce is a multi-tenant SaaS platform designed for small businesses and entrepreneurs to create scalable e-commerce websites from templates, each hosted on a unique subdomain (e.g., `store-name.flomerce.com`). It provides efficient online storefronts, comprehensive sales capabilities, and brand-building tools through a Cloudflare-centric serverless architecture. The platform aims to be an accessible and powerful solution for establishing an online presence. Key features include dynamic content, subscription management, an admin panel with an iframe preview, product options, subcategories, multi-currency support, a robust order flow with cancellation and return systems, product reviews, inventory locations, storage usage tracking, admin shard management, built-in analytics, and global shipping configurations.

## User Preferences
I prefer iterative development with clear communication on significant changes. Please ask before making major architectural decisions or large-scale code overhauls. Provide concise explanations and focus on effective solutions. Do not make changes to files in the `frontend/templates/` folder.

## Build Instructions (IMPORTANT)
**After every frontend code change, you MUST run the build scripts before finishing:**
- Storefront: `cd frontend/src/storefront && npm run build`
- Platform: `cd frontend/src/platform && npm run build`
Both builds output to the `frontend/` directory (storefront to `frontend/storefront/`, platform to `frontend/`). Always run both builds after any change to files in `frontend/src/`.

## System Architecture

### Core Design
Flomerce utilizes a shared shard-based D1 database architecture where multiple sites share Cloudflare D1 databases (shards) with `site_id`-based row isolation. A platform database (`env.DB`) stores global data (users, site metadata, subscriptions), while site-specific data (products, orders) resides in shard D1 databases, always filtered by `site_id`.

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

### Plan-Based Feature Gating
- **Plan hierarchy:** Trial (full Pro access, 5 sites max, 7-day expiry) → Starter → Growth → Pro → Enterprise.
- **Count limits:** Sites (trial: 5), Staff (starter: 5, growth: 25), Inventory locations (starter: 2, growth: 50). Enforced in `sites-worker.js`, `site-admin-worker.js`, `inventory-locations-worker.js`.
- **Feature flags:** Reviews, Blog, Advanced SEO (incl. per-page/category/product SEO), and Coupons are available from Starter onwards (matches Shopify/Wix/Dukaan industry norms). Push Notifications (manual), Revenue analytics, Appointment Booking, and Remove "Powered by Flomerce" branding require Growth+. Push Notifications (automated) requires Pro+.
- **Backend enforcement:** `checkFeatureAccess(env, siteId, feature)` and `checkCountLimit(env, siteId, limitType)` in `backend/utils/usage-tracker.js`. Feature checks use `request.clone().json()` fallback to extract `siteId` from body when query param is missing. `GET /api/plan-limits` endpoint returns all limits for a site (incl. `appointmentBooking`, `removeBranding`). Storefront appointment endpoint (`POST /api/email/appointment`) gates on `appointmentBooking` when `siteId` is provided in the body. Removing branding is enforced storefront-side: the Footer renders "Powered by Flomerce" unless `settings.footer.hideBranding === true` AND `siteConfig.subscriptionPlan` is Growth+, so a downgraded merchant automatically loses the toggle's effect.
- **Frontend gating:** `FeatureGate` overlay component (`frontend/src/storefront/src/components/admin/FeatureGate.jsx`) wraps locked sections with upgrade prompt; normalization helpers are extracted to `frontend/src/storefront/src/utils/plan.js` (`normalizePlan`, `isPlanAtLeast`) so storefront components share the same plan logic as the admin. `AdminSidebar` shows lock icons and plan badges. `VisualCustomizer` gates the Book Appointment section (Growth+); Blog, Customer Reviews, and SEO subtabs are unlocked from Starter. The Footer editor (Edit Website → Footer tab) has a "Branding" card with a `Hide "Powered by Flomerce"` toggle gated at Growth+. Storefront `Navbar`, `NavbarModern`, `StoreLocations`, and `BookAppointmentPage` hide/redirect the appointment booking flow when the site plan is below Growth. `DashboardPage` enforces trial site creation limit and staff count limits with disabled buttons.
- **Trial expiry:** Enforced just-in-time by `reconcileSiteSubscription()` in `backend/workers/platform/sites-worker.js`, called on every site fetch. Sites with `subscription_plan='trial'` and a past `subscription_expires_at` are cleared (plan and expiry reset to NULL) and treated as `free` until the user upgrades. Active subscriptions and the `enterprise` admin override are preserved.
- **`subscription_plan`** is included in site info response and mapped as `siteConfig.subscriptionPlan` in `SiteContext.jsx`.

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
- **UI/UX:** Theme-based template system with extensive admin controls. Classic (default) and Modern themes share one React SPA; theme-specific component variants live in `frontend/src/storefront/src/components/templates/<theme>/`. ThemeContext reads `settings.theme` from site config to select variants. Shared sections (WatchAndBuy, FeaturedVideo, ShopTheLook, etc.) work across all themes unchanged. Modern theme uses separate component files (not CSS overrides on shared components): `NavbarModern`, `FooterModern`, `ProductCardModern`, `HeroSplit`, `CategoryGrid`, `CheckoutPageModern`, `ReviewPageModern`, `ProductReviewsModern`, `CustomerReviewsModern`, `TrendingNow`, `BrandStory`, `ChooseByCategoryModern`. Parent components use `const Active = isModern ? ModernVariant : ClassicVariant` pattern for switching. Modern CSS uses `mn-` prefixed classes (self-contained per component) in `modern.css`. Design: Inter font, `#111` accent, sharp corners (borderRadius: 0), flat/no shadows. Modern homepage replaces Classic sections (WatchAndBuy, FeaturedVideo, ShopTheLook) with `TrendingNow` (horizontal scrollable product row), `BrandStory` (split image/text brand narrative), and `ChooseByCategoryModern` (edge-to-edge grid with hover reveals). Some pages (CategoryPage, ProductDetailPage, etc.) still use `.modern-theme` CSS class wrapper with descendant selectors in `modern.css` for their overrides.
- **SEO:** Server-side meta tag injection, dynamic sitemap.xml, robots.txt per tenant, and structured data for products, articles, and reviews. Default SEO titles and meta descriptions are category-aware and generated.
- **CDN Edge Caching:** Two-tier caching strategy. Browser: `max-age=60` (60s). CDN: `CDN-Cache-Control: max-age=604800` (7 days) with stale-while-revalidate. Admin requests bypass browser cache entirely (`cache: 'no-store'` in `api.js` and `SiteContext.jsx`). Write operations trigger `purgeStorefrontCache()` which purges both Workers Cache API and Cloudflare CDN edge globally (via Cloudflare API using `CF_API_TOKEN` + `CF_ZONE_ID`). Purge covers both `siteId` and `subdomain` URL variants. Cached endpoints: `/api/site`, `/api/products`, `/api/categories`, `/api/blog/posts`, `/api/blog/post/:slug`, `/api/reviews/product/:id`.
- **Push Notifications:** Full Web Push Protocol (VAPID) implementation using Cloudflare Workers, with service worker for client-side handling and admin panel for management and auto-triggers.
- **Store Logo:** Configurable logo upload, sizing, and positioning in the admin panel.
- **Platform Landing Page:** Full landing page with hero, features, pricing, contact, and footer sections.
- **Legal/Policy Pages:** Standard legal pages (T&C, Privacy, Refund, Shipping) with Razorpay compliance.
- **Terms Agreement:** Mandatory agreement to terms during signup and site creation.

### Key Features
- **Dynamic Content:** Configurable homepage elements and centralized default content per business category.
- **Template/Theme System:** Theme infrastructure with Classic (serif/gold/slider) and Modern (sans-serif/minimal/grid) variants. Config: `frontend/src/storefront/src/config/themes.js`. Context: `frontend/src/storefront/src/context/ThemeContext.jsx`. Modern components: `frontend/src/storefront/src/components/templates/modern/`. Theme is stored in `site_config.settings.theme` and selected during site creation. `useTheme()` hook returns `{ ...themeConfig, isModern }` for easy conditional rendering. ALL storefront pages now have Modern variants. Separate Modern component files (`*Modern.jsx`) are used for: Navbar, Footer, ProductCard, Hero, CategoryGrid, CheckoutPage, ReviewPage, ProductReviews, CustomerReviews. Parents switch via `const Active = isModern ? ModernVariant : ClassicVariant`. Remaining pages (CategoryPage, ProductDetailPage, etc.) use `.modern-theme` CSS class wrapper + descendant selectors in `modern.css`. Modern CSS classes use `mn-` prefix (self-contained per component).
- **Admin Panel:** Centralized site content, policy, and SEO management with iframe preview and "Shop the Look" tab. Edit Website tabs are template-aware: shared sections (Navbar, Hero, Categories, etc.) appear for all themes, while template-specific sections (Classic: Watch & Buy, Featured Video, Shop the Look, Store Locations; Modern: Trending Now, Brand Story) only appear when the matching theme is active. **Visual Customizer** (`VisualCustomizer.jsx`): Full-screen preview-first editing experience accessible from the "Edit Website" page on desktop. Features: large live iframe preview, slim left sidebar with Sections/Pages/Settings tabs, section show/hide toggles (eye icon), drag-and-drop section reordering, desktop/mobile device preview toggle, click-to-edit section editors in a sliding panel. Sections visibility changes auto-save to backend. Launched via the blue "Open" button banner at the top of the classic editor; the classic tab-based editor remains available. PromoBannerEditor was extracted to its own file (`PromoBannerEditor.jsx`).
- **Payment-First Site Creation:** When a non-trial user creates a site, the site is only created in the database AFTER payment is confirmed. The wizard collects all data, passes it to the PlanSelector, which creates a Razorpay subscription without a siteId. Only after payment verification succeeds does the frontend call `onCreateSite()`. The backend auto-links unlinked active subscriptions to newly created sites.
- **Duplicate Subscription Prevention:** Unique index on `subscriptions.razorpay_subscription_id` prevents duplicate records. `activateSubscription()` uses `INSERT OR IGNORE` (atomic) and reconciles existing rows on conflict. Webhook events are deduped through the `processed_webhooks(event_id PK)` table — `handleRazorpayWebhook` inserts the event id (header `x-razorpay-event-id` / `payload.id`) once and returns early if already seen. `handleSubscriptionCharged` also skips no-op renewals when `current_period_end` is unchanged.
- **Plan Downgrade Flow (scheduled, not immediate):** When a user picks a lower-tier plan for a site that already has an active higher-tier subscription, `createRazorpaySubscription` keeps the current plan running until its `current_period_end`. It creates the new Razorpay subscription with `start_at = current_period_end` (epoch seconds) and asks Razorpay to cancel the higher plan at cycle end (`cancel_at_cycle_end: 1`). The new sub is stored locally with `status='scheduled'` (via `activateSubscription`, which detects future `start_at`). `sites.subscription_plan` does NOT change yet, so paid features remain available until the cycle ends. The `getUserSites` API returns `subscription.scheduledPlan / scheduledStartAt` for the dashboard. To prevent stacking, a second downgrade attempt while one is already scheduled returns `409 PLAN_CHANGE_PENDING`. The cron (`cleanupExpiredData`) and the `subscription.cancelled` webhook both promote due-scheduled subs to `active` and update the cached `sites.subscription_plan`. Upgrades and same-tier swaps still take effect immediately.
- **Trial & Subscription Cleanup (cron):** `cleanupExpiredData` runs on the scheduled handler and: marks `active` subs whose `current_period_end < now` as `expired`; activates due `scheduled` subs (downgrades) and updates `sites.subscription_plan`; sets `is_active = 0` on trial sites whose `subscription_expires_at` has passed; clears the cached `sites.subscription_plan` when no active sub exists; deletes orphan `pending_subscriptions` older than 24h; trims `processed_webhooks` rows older than 30 days. `getUserSites` no longer trusts a stale `sites.subscription_plan` when the `subscriptions` table has no active row.
- **Subscription Cancel Webhook:** With `cancel_at_cycle_end: 1`, Razorpay fires `subscription.cancelled` after the cycle ends naturally. The handler now marks the row cancelled, clears `sites.subscription_plan`, sets `subscription_expires_at` to the actual period end (not `now`), and immediately promotes any waiting `scheduled` sub for the site.
- **Order-Before-Payment:** Storefront checkout creates the order with `pending_payment` status before opening Razorpay. Payment verification updates the existing order to `paid`. If payment fails, the stale order is auto-cancelled after 30 minutes by the scheduled cleanup.
- **Stock Reservation:** Stock is decremented at order creation (not after payment), preventing overselling. Stock is restored when orders are cancelled. Stale `pending_payment` orders older than 30 minutes are auto-cancelled with stock restored.
- **Customer Session Optimization:** `validateCustomerAuth` first checks `siteId` from URL params for direct DB lookup, falling back to shard scan only when needed.
- **Shop the Look:** Interactive product showcase on the homepage with clickable dots linked to products.
- **Product Options:** Supports Color, Custom Selection, and Priced options.
- **Subcategories:** Three-level category hierarchy with associated homepage sections.
- **Multi-Currency Support:** Product prices stored in default currency, with frontend conversion using `exchangerate-api.com`.
- **Additional Notification Recipients:** Owners can add up to 5 staff/team email addresses (Settings → Contact → "Additional notification emails") to receive the same owner-bound order notifications (new order, cancellation request, return request, order cancelled, order delivered). Stored in `site_config.settings.notificationCcEmails` (array). Helper `getOwnerRecipients(settings, config)` in `backend/utils/email.js` returns the deduped, validated list (primary owner email + CC emails). Gated as a Growth+ feature in the admin UI; backend sanitizes/caps to 5 valid emails. Customer-facing emails are unaffected.
- **WhatsApp Business Notifications:** Automated order updates via WhatsApp Business API (Meta Cloud API or Interakt). Store owners bring their own API credentials, stored in `sites.settings` JSON. Supports template and plain text messages. Order notifications: confirmed, packed, shipped (with tracking), delivered (with review link), cancelled. Customers opt-in at checkout. Backend: `backend/utils/whatsapp.js`. Schema: `whatsapp_opted_in` column on `orders` and `guest_orders`. Gated as a Growth+ feature (credential-based).
- **Order Flow:** Full order lifecycle (Pending to Delivered) with COD and Razorpay, stock management, customer notifications, and order tracking.
- **Order Cancellation:** Opt-in customer-initiated order cancellation with admin approval workflow.
- **Return Orders:** Opt-in customer-initiated return system with admin approval/refund workflow, supporting photos and resolution preferences.
- **Order Help Page:** Unified page for order-related actions (Track, Cancel, Return, Contact).
- **Product Reviews:** Per-product customer review system with star ratings, optional images, and admin moderation.
- **Inventory Locations:** Multi-location inventory tracking with stock transfers and fulfillment priority.
- **Delivery Charges:** Configurable global shipping fees with flat rates, free-above thresholds, and country/region-based overrides. Checkout address forms support international countries with dynamic state dropdowns.
- **International Phone Input:** Phone fields use a country code dropdown with flag emoji + dial code (e.g., 🇮🇳 +91) and searchable country selector. Auto-selects dial code based on selected country. Phone stored in E.164 format (e.g., `+919876543210`). Shared `PhoneInput` component at `frontend/src/storefront/src/components/ui/PhoneInput.jsx`. Country dial codes in `countryStates.js` (`COUNTRIES[].dial`, `COUNTRY_FLAGS`, `getDialCode()`). Phone field is also included in customer signup form (optional).
- **Abandoned Cart Reminders:** Automated reminders via WhatsApp and/or email for logged-in customers who leave items in their cart. Settings in admin panel under "Abandoned Cart Reminders": enable/disable, delay hours (1/3/6/12/24h), max reminders (1-3), channel selection (email/WhatsApp). Processed by Cloudflare Cron Trigger (`scheduled` handler in `index.js`). Cart table has `reminder_sent_at` and `reminder_count` columns — reset when cart is updated. Subsequent reminders use exponential backoff (delay doubles each time). Skips carts where the customer has placed an order since the cart was last updated. WhatsApp template: `abandoned_cart_reminder`. Email template: `buildAbandonedCartEmail()` in `email.js`. WhatsApp builder: `buildAbandonedCartWA()` in `whatsapp.js`. Config stored in `site_config.settings.abandonedCartConfig`.

### Shared UI Components (Alerts / Confirms / Toasts)
- **Single source of truth:** `frontend/src/shared/ui/` (imported by both the storefront and platform apps).
  - `Modal.jsx` — base overlay/box primitive (Esc to close, scroll lock, backdrop click).
  - `AlertModal.jsx` — declarative alert dialog with variants (`info`, `success`, `warning`, `error`, `upgrade`); supports `primaryAction`/`secondaryAction` (button or link). Also exports `isPlanError(err)`.
  - `ConfirmDialog.jsx` — `<ConfirmProvider>` + `useConfirm()` promise-based hook: `const ok = await confirm({ title, message, confirmText, cancelText, variant: 'danger' })`.
  - `Toast.jsx` — `<ToastProvider>` + `useToast()` with `.success/.error/.warning/.info(msg, { title?, duration? })`.
  - `styles.css` — all styling (BEM-style `flo-ui-*` classes, mobile-responsive, font-awesome icons).
  - `index.js` — barrel re-exports.
- **Providers** are mounted at the top of both `App.jsx` files (`<ToastProvider><ConfirmProvider>...`).
- **Legacy `PlanLimitModal.jsx`** in `platform/src/components/` and `storefront/src/components/admin/` are now thin wrappers over the shared `AlertModal` (variant `upgrade`) — keeps existing call sites working unchanged. Prefer importing `AlertModal` directly from `shared/ui` for new code.
- **Storefront vite config** has a `resolve.alias` block pointing `react`, `react-dom`, and the JSX runtimes back to its own `node_modules/` so files in `frontend/src/shared/` resolve React correctly.
- **Migration goal:** progressively replace remaining `window.alert(...)` / `window.confirm(...)` / one-off inline modals with `useToast()` / `useConfirm()` / `<AlertModal>`.

## External Dependencies
- **Cloudflare Pages:** Frontend hosting.
- **Cloudflare Workers:** Backend serverless compute.
- **Cloudflare D1:** Primary database.
- **Cloudflare R2:** Object storage.
- **Cloudflare REST API:** D1 database management and worker configuration.
- **Razorpay:** Payment gateway.
- **Brevo:** Transactional email service (`https://api.brevo.com/v3/smtp/email`).
- **WhatsApp Business API:** Meta Cloud API (`graph.facebook.com/v21.0`) or Interakt (`api.interakt.ai/v1`) for order notifications. Per-store credentials.
- **api.exchangerate-api.com:** Exchange rate data for multi-currency support.