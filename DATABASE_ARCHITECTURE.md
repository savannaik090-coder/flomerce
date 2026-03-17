# Fluxe Database Architecture

Complete reference for how data is stored, routed, and managed across the platform.

---

## Database Overview

Fluxe uses **two types of D1 databases**:

| Database | Binding | Purpose |
|----------|---------|---------|
| **Platform DB** | `env.DB` | Platform-level data: users, sites metadata, billing, authentication |
| **Shard DBs** | `SHARD_1`, `SHARD_2`, etc. | Site-specific operational data: products, orders, customers, etc. |

Each site is assigned to one shard. The `sites.shard_id` column points to the shard. All site-specific queries are routed through `resolveSiteDBById(env, siteId)` which looks up the correct shard binding.

---

## How Data Routing Works

```
Request comes in
    |
    v
sites table (platform DB) --> lookup shard_id
    |
    v
shards table (platform DB) --> get binding_name (e.g., "SHARD_1")
    |
    v
env[binding_name] --> actual shard D1 database
```

**Key utility:** `backend/utils/site-db.js`
- `resolveSiteDBById(env, siteId)` — async, looks up site -> shard -> binding
- `resolveSiteDB(env, site)` — sync, uses pre-loaded site object
- `resolveSiteDBBySubdomain(env, subdomain)` — async, resolves via subdomain
- All fall back to `env.DB` if no shard is assigned (backward compatibility)

---

## Platform DB Tables (`env.DB`)

These tables store platform-wide data and MUST stay in the platform DB.

### `users`
Platform user accounts (site owners/admins).

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Unique user ID |
| email | TEXT UNIQUE | Login email |
| password_hash | TEXT | Bcrypt password hash |
| name | TEXT | Display name |
| phone | TEXT | Phone number |
| role | TEXT | `user` or `admin` |
| email_verified | INTEGER | 0 or 1 |
| created_at | TEXT | Account creation timestamp |
| updated_at | TEXT | Last update timestamp |

### `sessions`
Platform user login sessions.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Session ID |
| user_id | TEXT FK → users | Owner |
| token | TEXT | Auth token |
| expires_at | TEXT | Expiry timestamp |
| created_at | TEXT | Creation timestamp |

### `sites`
The central routing table — maps subdomains to shards and stores site configuration.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Site ID |
| user_id | TEXT FK → users | Site owner |
| subdomain | TEXT UNIQUE | e.g., `my-store` → `my-store.fluxe.in` |
| brand_name | TEXT | Store display name |
| category | TEXT | Store category |
| template_id | TEXT | Template used (default: `storefront`) |
| logo_url | TEXT | Brand logo URL |
| favicon_url | TEXT | Favicon URL |
| primary_color | TEXT | Brand primary color |
| secondary_color | TEXT | Brand secondary color |
| phone | TEXT | Store contact phone |
| email | TEXT | Store contact email |
| address | TEXT | Store address |
| social_links | TEXT (JSON) | Social media links |
| settings | TEXT (JSON) | **All site-specific settings** (Razorpay keys, store config, social settings, etc.) |
| is_active | INTEGER | Whether site is live |
| subscription_plan | TEXT | Current plan name |
| subscription_expires_at | TEXT | When subscription expires |
| custom_domain | TEXT | Custom domain (e.g., `shop.example.com`) |
| domain_status | TEXT | `pending`, `verified`, etc. |
| domain_verification_token | TEXT | DNS verification token |
| cf_hostname_id | TEXT | Cloudflare hostname ID |
| shard_id | TEXT | **Points to which shard DB this site uses** |
| migration_locked | INTEGER | 1 = writes blocked during migration |
| d1_database_id | TEXT | Legacy: per-site DB ID (deprecated) |
| d1_binding_name | TEXT | Legacy: per-site DB binding (deprecated) |
| currency | TEXT | Store currency (default: INR) |
| seo_title | TEXT | Site-wide SEO title |
| seo_description | TEXT | Site-wide SEO description |
| seo_og_image | TEXT | Site-wide OG image |
| seo_robots | TEXT | Robots directive |
| google_verification | TEXT | Google Search Console verification |
| og_title, og_description, og_image, og_type | TEXT | Open Graph overrides |
| twitter_card, twitter_title, twitter_description, twitter_image, twitter_site | TEXT | Twitter card overrides |
| created_at | TEXT | Creation timestamp |
| updated_at | TEXT | Last update timestamp |

**The `settings` JSON column contains:**
- `razorpayKeyId` — Site-specific Razorpay public key
- `razorpayKeySecret` — Site-specific Razorpay secret key
- `adminVerificationCode` — Code for site admin access
- `social` — Social media link overrides
- Other per-site configuration

### `shards`
Registry of all shard databases.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Shard ID (e.g., `shard_1`) |
| binding_name | TEXT UNIQUE | Worker binding name (e.g., `SHARD_1`) |
| database_id | TEXT UNIQUE | Cloudflare D1 database UUID |
| database_name | TEXT | Human-readable name |
| is_active | INTEGER | 1 = new sites go to this shard |
| correction_factor | REAL | Usage estimation correction (0.8–1.5) |
| last_reconciled_at | TEXT | Last reconciliation timestamp |
| created_at | TEXT | Creation timestamp |

### `subscriptions`
Platform billing subscriptions (Razorpay).

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Subscription ID |
| user_id | TEXT FK → users | Subscriber |
| site_id | TEXT FK → sites | Which site this subscription covers |
| plan | TEXT | Plan name |
| billing_cycle | TEXT | `3months`, `6months`, `yearly`, `lifetime` |
| amount | REAL | Payment amount |
| currency | TEXT | Currency (default: INR) |
| status | TEXT | `active`, `cancelled`, `expired`, `paused` |
| razorpay_subscription_id | TEXT | Razorpay subscription ID |
| current_period_start | TEXT | Current billing period start |
| current_period_end | TEXT | Current billing period end |
| cancelled_at | TEXT | Cancellation timestamp |
| created_at | TEXT | Creation timestamp |
| updated_at | TEXT | Last update timestamp |

### `subscription_plans`
Available subscription plans (managed by admin).

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Plan ID |
| plan_name | TEXT | Display name (e.g., `Basic`, `Pro`) |
| billing_cycle | TEXT | Billing frequency |
| display_price | REAL | Price shown to users |
| razorpay_plan_id | TEXT | Razorpay plan ID for auto-billing |
| features | TEXT (JSON) | Feature list for plan card |
| is_popular | INTEGER | Highlight as popular |
| is_active | INTEGER | Available for purchase |
| display_order | INTEGER | Sort order |
| plan_tier | INTEGER | Tier hierarchy |
| created_at | TEXT | Creation timestamp |
| updated_at | TEXT | Last update timestamp |

### `pending_subscriptions`
Temporary records for in-progress subscription signups (before Razorpay confirms).

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Record ID |
| user_id | TEXT | User starting subscription |
| site_id | TEXT | Target site |
| plan_id | TEXT | Selected plan |
| razorpay_subscription_id | TEXT UNIQUE | Razorpay subscription ID |
| created_at | TEXT | Creation timestamp |

### `payment_transactions`
Log of all payment attempts and completions.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Transaction ID |
| site_id | TEXT | Associated site |
| user_id | TEXT | Associated user |
| order_id | TEXT | Associated order (in shard DB) |
| subscription_id | TEXT | Associated subscription |
| razorpay_order_id | TEXT | Razorpay order ID |
| razorpay_payment_id | TEXT | Razorpay payment ID |
| razorpay_signature | TEXT | Payment signature |
| amount | REAL | Payment amount |
| currency | TEXT | Currency |
| status | TEXT | `pending`, `completed`, `failed` |
| payment_method | TEXT | e.g., `razorpay` |
| error_code | TEXT | Error code if failed |
| error_description | TEXT | Error details |
| created_at | TEXT | Creation timestamp |

### `platform_settings`
Global platform-wide key-value settings.

| Column | Type | Description |
|--------|------|-------------|
| setting_key | TEXT PK | Setting name (e.g., `razorpay_key_id`) |
| setting_value | TEXT | Setting value |
| updated_at | TEXT | Last update timestamp |

**Current keys:** `razorpay_key_id` (platform Razorpay public key)

### `site_admin_sessions`
Sessions for the "Edit Website" admin access (verification-code-based auth).

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Session ID |
| site_id | TEXT | Which site is being administered |
| token | TEXT | Auth token |
| expires_at | TEXT | Expiry timestamp |
| created_at | TEXT | Creation timestamp |

### `email_verifications`
Platform user email verification tokens (NOT customer verification).

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Record ID |
| user_id | TEXT FK → users | User being verified |
| token | TEXT | Verification token |
| expires_at | TEXT | Token expiry |
| created_at | TEXT | Creation timestamp |

### `password_resets`
Platform user password reset tokens (NOT customer resets).

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Record ID |
| user_id | TEXT FK → users | User resetting password |
| token | TEXT | Reset token |
| expires_at | TEXT | Token expiry |
| used | INTEGER | 0 or 1 |
| created_at | TEXT | Creation timestamp |

### `site_usage`
Per-site storage usage tracking.

| Column | Type | Description |
|--------|------|-------------|
| site_id | TEXT PK | Site ID |
| d1_bytes_used | INTEGER | Estimated D1 bytes for this site |
| r2_bytes_used | INTEGER | R2 bytes used |
| baseline_bytes | INTEGER | Accumulated bytes from previous shards |
| baseline_updated_at | TEXT | When baseline was last updated |
| last_updated | TEXT | Last tracking update |

**Display formula:** `displayed_d1 = (baseline_bytes + d1_bytes_used) * shard.correction_factor`

### `site_media`
Tracks R2 media files per site for usage accounting.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment ID |
| site_id | TEXT | Owning site |
| storage_key | TEXT UNIQUE | R2 object key |
| size_bytes | INTEGER | File size |
| media_type | TEXT | `image` or `video` |
| row_size_bytes | INTEGER | Row size estimate |
| created_at | TEXT | Upload timestamp |

---

## Shard DB Tables (`SHARD_1`, `SHARD_2`, etc.)

These tables store all site-specific operational data. Every row has a `site_id` column for tenant isolation. Schema is defined in `backend/utils/site-schema.js`.

### `categories`
Product categories for stores.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Category ID |
| site_id | TEXT | Owning site |
| name | TEXT | Category name |
| slug | TEXT | URL slug (unique per site) |
| parent_id | TEXT | Parent category (for nesting) |
| description | TEXT | Category description |
| subtitle | TEXT | Display subtitle |
| show_on_home | INTEGER | Show on homepage |
| image_url | TEXT | Category image |
| display_order | INTEGER | Sort order |
| is_active | INTEGER | Visible in storefront |
| seo_title | TEXT | SEO title override |
| seo_description | TEXT | SEO description override |
| seo_og_image | TEXT | SEO OG image override |
| row_size_bytes | INTEGER | Usage tracking |
| created_at | TEXT | Creation timestamp |
| updated_at | TEXT | Last update timestamp |

### `products`
Store products.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Product ID |
| site_id | TEXT | Owning site |
| category_id | TEXT | Parent category |
| name | TEXT | Product name |
| slug | TEXT | URL slug (unique per site) |
| description | TEXT | Full description (HTML) |
| short_description | TEXT | Summary text |
| price | REAL | Selling price |
| compare_price | REAL | Original/compare-at price |
| cost_price | REAL | Cost price (internal) |
| sku | TEXT | Stock keeping unit |
| barcode | TEXT | Barcode |
| stock | INTEGER | Inventory count |
| low_stock_threshold | INTEGER | Low stock alert threshold |
| weight | REAL | Shipping weight |
| dimensions | TEXT | Product dimensions |
| images | TEXT (JSON) | Array of image URLs |
| thumbnail_url | TEXT | Primary thumbnail |
| tags | TEXT | Product tags |
| is_featured | INTEGER | Featured on homepage |
| is_active | INTEGER | Visible in storefront |
| seo_title | TEXT | SEO title override |
| seo_description | TEXT | SEO description override |
| seo_og_image | TEXT | SEO OG image override |
| row_size_bytes | INTEGER | Usage tracking |
| created_at | TEXT | Creation timestamp |
| updated_at | TEXT | Last update timestamp |

### `product_variants`
Product variations (size, color, etc.).

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Variant ID |
| product_id | TEXT | Parent product |
| name | TEXT | Variant name (e.g., "Large / Red") |
| sku | TEXT | Variant SKU |
| price | REAL | Variant price |
| compare_price | REAL | Compare-at price |
| stock | INTEGER | Variant inventory |
| attributes | TEXT (JSON) | Variant attributes |
| image_url | TEXT | Variant image |
| is_active | INTEGER | Available for purchase |
| row_size_bytes | INTEGER | Usage tracking |
| created_at | TEXT | Creation timestamp |

### `orders`
Customer orders (from logged-in customers).

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Order ID |
| site_id | TEXT | Owning site |
| user_id | TEXT | Customer user ID |
| order_number | TEXT UNIQUE | Human-readable order number |
| status | TEXT | `pending`, `paid`, `processing`, `shipped`, `delivered`, `cancelled` |
| items | TEXT (JSON) | Array of order items |
| subtotal | REAL | Before discounts/shipping/tax |
| discount | REAL | Discount amount |
| shipping_cost | REAL | Shipping charge |
| tax | REAL | Tax amount |
| total | REAL | Final total |
| currency | TEXT | Currency code |
| payment_method | TEXT | `cod`, `razorpay` |
| payment_status | TEXT | `pending`, `paid` |
| payment_id | TEXT | Payment reference |
| razorpay_order_id | TEXT | Razorpay order ID |
| razorpay_payment_id | TEXT | Razorpay payment ID |
| razorpay_signature | TEXT | Payment signature |
| shipping_address | TEXT (JSON) | Delivery address |
| billing_address | TEXT (JSON) | Billing address |
| customer_name | TEXT | Customer name |
| customer_email | TEXT | Customer email |
| customer_phone | TEXT | Customer phone |
| coupon_code | TEXT | Applied coupon |
| notes | TEXT | Order notes |
| tracking_number | TEXT | Shipment tracking |
| carrier | TEXT | Shipping carrier |
| shipped_at | TEXT | Ship timestamp |
| delivered_at | TEXT | Delivery timestamp |
| cancelled_at | TEXT | Cancellation timestamp |
| cancellation_reason | TEXT | Why cancelled |
| row_size_bytes | INTEGER | Usage tracking |
| created_at | TEXT | Order creation timestamp |
| updated_at | TEXT | Last update timestamp |

### `guest_orders`
Orders from non-logged-in (guest) customers. Same structure as `orders` but without `user_id`, `billing_address`, `notes`, `cancellation_reason` columns.

### `carts`
Shopping carts.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Cart ID |
| site_id | TEXT | Owning site |
| user_id | TEXT | Customer ID (if logged in) |
| session_id | TEXT | Session ID (if guest) |
| items | TEXT (JSON) | Cart items array |
| subtotal | REAL | Cart subtotal |
| row_size_bytes | INTEGER | Usage tracking |
| created_at | TEXT | Creation timestamp |
| updated_at | TEXT | Last update timestamp |

### `wishlists`
Customer wishlists.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Wishlist entry ID |
| site_id | TEXT | Owning site |
| user_id | TEXT | Customer ID |
| product_id | TEXT | Wishlisted product |
| row_size_bytes | INTEGER | Usage tracking |
| created_at | TEXT | Creation timestamp |

### `site_customers`
Customer accounts for individual stores (separate from platform users).

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Customer ID |
| site_id | TEXT | Which store this customer belongs to |
| email | TEXT | Login email (unique per site) |
| password_hash | TEXT | Bcrypt password hash |
| name | TEXT | Customer name |
| phone | TEXT | Phone number |
| email_verified | INTEGER | 0 or 1 |
| row_size_bytes | INTEGER | Usage tracking |
| created_at | TEXT | Registration timestamp |
| updated_at | TEXT | Last update timestamp |

### `site_customer_sessions`
Customer login sessions.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Session ID |
| customer_id | TEXT | Customer |
| site_id | TEXT | Site |
| token | TEXT | Auth token (sent as `SiteCustomer {token}` header) |
| expires_at | TEXT | Expiry (7 days from login) |
| row_size_bytes | INTEGER | Usage tracking |
| created_at | TEXT | Creation timestamp |

### `customer_addresses`
Saved delivery addresses for customers.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Address ID |
| site_id | TEXT | Site |
| customer_id | TEXT | Customer |
| label | TEXT | e.g., `Home`, `Work` |
| first_name | TEXT | First name |
| last_name | TEXT | Last name |
| phone | TEXT | Phone |
| house_number | TEXT | House/flat number |
| road_name | TEXT | Street/road |
| city | TEXT | City |
| state | TEXT | State |
| pin_code | TEXT | PIN/ZIP code |
| is_default | INTEGER | Default address flag |
| row_size_bytes | INTEGER | Usage tracking |
| created_at | TEXT | Creation timestamp |
| updated_at | TEXT | Last update timestamp |

### `customer_password_resets`
Customer password reset tokens.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Record ID |
| site_id | TEXT | Site |
| customer_id | TEXT | Customer |
| token | TEXT UNIQUE | Reset token (sent via email link) |
| expires_at | TEXT | 1 hour expiry |
| used | INTEGER | 0 or 1 |
| row_size_bytes | INTEGER | Usage tracking |
| created_at | TEXT | Creation timestamp |

### `customer_email_verifications`
Customer email verification tokens.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Record ID |
| site_id | TEXT | Site |
| customer_id | TEXT | Customer |
| token | TEXT UNIQUE | Verification token (sent via email link) |
| expires_at | TEXT | 24 hour expiry |
| used | INTEGER | 0 or 1 |
| row_size_bytes | INTEGER | Usage tracking |
| created_at | TEXT | Creation timestamp |

### `coupons`
Discount coupons per store.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Coupon ID |
| site_id | TEXT | Owning site |
| code | TEXT | Coupon code (unique per site) |
| type | TEXT | `percentage` or `fixed` |
| value | REAL | Discount value |
| min_order_value | REAL | Minimum order to apply |
| max_discount | REAL | Cap on discount amount |
| usage_limit | INTEGER | Max total uses |
| used_count | INTEGER | Times used so far |
| starts_at | TEXT | Valid from |
| expires_at | TEXT | Valid until |
| is_active | INTEGER | Enabled |
| row_size_bytes | INTEGER | Usage tracking |
| created_at | TEXT | Creation timestamp |

### `notifications`
Push notification subscriptions.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Record ID |
| site_id | TEXT | Site |
| user_id | TEXT | Subscriber |
| push_token | TEXT | Push notification token |
| endpoint | TEXT | Web push endpoint |
| p256dh | TEXT | Web push key |
| auth | TEXT | Web push auth |
| is_active | INTEGER | Active subscription |
| row_size_bytes | INTEGER | Usage tracking |
| created_at | TEXT | Creation timestamp |

### `reviews`
Product reviews and ratings.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Review ID |
| site_id | TEXT | Site |
| product_id | TEXT | Reviewed product |
| user_id | TEXT | Reviewer |
| customer_name | TEXT | Display name |
| rating | INTEGER | 1–5 stars |
| title | TEXT | Review title |
| content | TEXT | Review body |
| images | TEXT (JSON) | Review images |
| is_verified | INTEGER | Verified purchase |
| is_approved | INTEGER | Admin approved |
| row_size_bytes | INTEGER | Usage tracking |
| created_at | TEXT | Creation timestamp |

### `page_seo`
Per-page SEO settings for stores.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Record ID |
| site_id | TEXT | Site |
| page_type | TEXT | `home`, `about`, `contact`, `privacy`, `terms` |
| seo_title | TEXT | Page title |
| seo_description | TEXT | Meta description |
| seo_og_image | TEXT | OG image |
| row_size_bytes | INTEGER | Usage tracking |
| created_at | TEXT | Creation timestamp |
| updated_at | TEXT | Last update timestamp |

### `activity_log`
Audit trail for admin actions.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Log entry ID |
| site_id | TEXT | Site |
| user_id | TEXT | Actor |
| action | TEXT | Action name |
| entity_type | TEXT | What was affected |
| entity_id | TEXT | Affected entity ID |
| details | TEXT | Additional context |
| ip_address | TEXT | Client IP |
| user_agent | TEXT | Client user agent |
| row_size_bytes | INTEGER | Usage tracking |
| created_at | TEXT | Timestamp |

### `addresses`
Generic address book (legacy, used by platform users).

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Address ID |
| user_id | TEXT | Platform user |
| name | TEXT | Recipient name |
| phone | TEXT | Phone |
| line1 | TEXT | Address line 1 |
| line2 | TEXT | Address line 2 |
| city | TEXT | City |
| state | TEXT | State |
| pincode | TEXT | PIN code |
| country | TEXT | Country (default: India) |
| is_default | INTEGER | Default flag |
| row_size_bytes | INTEGER | Usage tracking |
| created_at | TEXT | Creation timestamp |
| updated_at | TEXT | Last update timestamp |

### `site_usage` (shard copy)
Duplicate of platform site_usage in each shard for local tracking operations.

### `site_media` (shard copy)
Duplicate of platform site_media in each shard for local tracking operations.

---

## Data Flow Summary

### Where each type of data lives:

| Data Type | Database | Why |
|-----------|----------|-----|
| User accounts, login sessions | Platform DB | Platform-level auth, not site-specific |
| Site configuration, branding, settings | Platform DB (`sites` table) | Needed for routing before shard is known |
| Subscription billing | Platform DB | Platform-level billing |
| Payment transaction logs | Platform DB | Cross-site payment processing |
| Shard registry | Platform DB | Needed to resolve which shard to use |
| Products, categories, variants | Shard DB | Site-specific store content |
| Orders, guest orders | Shard DB | Site-specific transactions |
| Customer accounts, sessions | Shard DB | Site-specific customer auth |
| Customer addresses | Shard DB | Site-specific customer data |
| Carts, wishlists | Shard DB | Site-specific shopping data |
| Reviews, coupons | Shard DB | Site-specific store features |
| SEO page settings | Shard DB | Site-specific content |
| Activity logs | Shard DB | Site-specific audit trail |

### Usage Tracking Flow:
1. Every write estimates row bytes via `estimateRowBytes()`
2. `trackD1Write/Update/Delete` updates `site_usage.d1_bytes_used` in platform DB
3. Each shard has a `correction_factor` (actual DB size vs estimated)
4. Display: `(baseline_bytes + d1_bytes_used) * correction_factor`
5. Plan limits: Basic 500MB, Pro 1.5GB, Premium 3GB D1

### Cleanup (Scheduled):
A cron trigger runs daily at 3 AM UTC and deletes:
- Platform DB: expired `sessions`, used/expired `email_verifications`, used/expired `password_resets`
- Each shard: expired `site_customer_sessions`, used/expired `customer_password_resets`, used/expired `customer_email_verifications`

---

## Key Files

| File | Purpose |
|------|---------|
| `backend/utils/db-init.js` | Creates all platform DB tables on first request |
| `backend/utils/site-schema.js` | Defines shard DB table schema |
| `backend/utils/site-db.js` | DB routing: resolves site ID → correct shard DB |
| `backend/utils/usage-tracker.js` | Storage usage tracking and limits |
| `backend/utils/d1-manager.js` | Cloudflare API calls for shard management |
| `backend/wrangler.toml` | Worker config, DB bindings, cron triggers |
