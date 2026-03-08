# Fluxe SaaS Platform — Complete React Migration Plan

## Table of Contents
1. [Overview](#overview)
2. [Current Architecture vs New Architecture](#architecture)
3. [Project Structure](#project-structure)
4. [App A: Fluxe SaaS Platform (fluxe.in)](#app-a)
5. [App B: Dynamic Storefront (*.fluxe.in)](#app-b)
6. [Backend Reorganization](#backend)
7. [Deployment Strategy](#deployment)
8. [What Gets Removed](#removed)
9. [Migration Order](#migration-order)

---

## 1. Overview <a name="overview"></a>

We are rebuilding the entire frontend from vanilla HTML/JS to **React**. The project will be split into **two separate React applications**:

- **App A** — The Fluxe SaaS Platform (`fluxe.in`) — Landing page, auth, dashboard, owner admin
- **App B** — The Dynamic Storefront (`*.fluxe.in`) — The e-commerce template that end-customers see

The backend (Cloudflare Workers + D1 database) stays the same but gets reorganized into cleaner folders.

### Why Two Apps?
- App A is the SaaS management platform — it has its own routing, auth, and UI
- App B is the storefront template — it's a completely different user experience served on subdomains
- Keeping them separate means each app is smaller, loads faster, and can be updated independently
- Adding new templates in the future = creating a new React theme/layout in App B

---

## 2. Current Architecture vs New Architecture <a name="architecture"></a>

### Current (Vanilla JS)
```
User visits fluxe.in → Cloudflare Pages serves static HTML files
User visits shop.fluxe.in → Cloudflare Worker detects subdomain → Reads template HTML from Pages → Replaces {{placeholders}} server-side → Serves final HTML
```

### New (React)
```
User visits fluxe.in → Cloudflare Pages serves App A (React SPA) → React fetches data from API
User visits shop.fluxe.in → Cloudflare Pages serves App B (React SPA) → React detects subdomain → Calls /api/site?subdomain=shop → Renders everything dynamically with real data
```

### Key Difference
- **Before**: Server-side placeholder replacement (`{{brandName}}` → `Savan`) — template is static HTML with injected values
- **After**: Client-side dynamic rendering — React app loads, detects subdomain, fetches site config + data from API, renders everything. No more `{{placeholders}}` needed.

---

## 3. Project Structure <a name="project-structure"></a>

### New Folder Layout
```
fluxe/
├── apps/
│   ├── platform/                    # App A — Fluxe SaaS Platform (fluxe.in)
│   │   ├── public/
│   │   │   ├── index.html
│   │   │   ├── manifest.json
│   │   │   └── assets/              # Logo, favicon, etc.
│   │   ├── src/
│   │   │   ├── App.jsx
│   │   │   ├── main.jsx
│   │   │   ├── index.css
│   │   │   ├── pages/
│   │   │   │   ├── LandingPage.jsx
│   │   │   │   ├── LoginPage.jsx
│   │   │   │   ├── SignupPage.jsx
│   │   │   │   ├── DashboardPage.jsx
│   │   │   │   ├── VerifyEmailPage.jsx
│   │   │   │   ├── ResetPasswordPage.jsx
│   │   │   │   └── OwnerAdminPage.jsx
│   │   │   ├── components/
│   │   │   │   ├── Navbar.jsx
│   │   │   │   ├── Footer.jsx
│   │   │   │   ├── SiteCreationWizard.jsx
│   │   │   │   ├── TemplateSelector.jsx
│   │   │   │   ├── SiteCard.jsx
│   │   │   │   ├── PlanSelector.jsx
│   │   │   │   ├── SiteAdminPanel.jsx     # Embedded admin for managing a created site
│   │   │   │   └── ...
│   │   │   ├── services/
│   │   │   │   ├── api.js                 # Base API client
│   │   │   │   ├── authService.js
│   │   │   │   ├── siteService.js
│   │   │   │   └── paymentService.js
│   │   │   └── context/
│   │   │       └── AuthContext.jsx
│   │   ├── package.json
│   │   └── vite.config.js
│   │
│   └── storefront/                  # App B — Dynamic E-commerce Storefront (*.fluxe.in)
│       ├── public/
│       │   ├── index.html
│       │   └── manifest.json
│       ├── src/
│       │   ├── App.jsx
│       │   ├── main.jsx
│       │   ├── pages/
│       │   │   ├── HomePage.jsx
│       │   │   ├── CategoryPage.jsx
│       │   │   ├── ProductDetailPage.jsx
│       │   │   ├── CartPage.jsx
│       │   │   ├── CheckoutPage.jsx
│       │   │   ├── ProfilePage.jsx
│       │   │   ├── WishlistPage.jsx
│       │   │   ├── LoginPage.jsx
│       │   │   ├── SignupPage.jsx
│       │   │   ├── ForgotPasswordPage.jsx
│       │   │   ├── ResetPasswordPage.jsx
│       │   │   ├── VerifyEmailPage.jsx
│       │   │   ├── AboutPage.jsx
│       │   │   ├── ContactPage.jsx
│       │   │   ├── BookAppointmentPage.jsx
│       │   │   ├── OrderTrackPage.jsx
│       │   │   ├── PrivacyPolicyPage.jsx
│       │   │   ├── TermsPage.jsx
│       │   │   ├── AdminPanel.jsx         # Store admin (orders, products, analytics)
│       │   │   └── ProductsAdminPage.jsx  # Product creation/editing
│       │   ├── components/
│       │   │   ├── layout/
│       │   │   │   ├── Navbar.jsx
│       │   │   │   ├── Footer.jsx
│       │   │   │   ├── MobileBottomNav.jsx
│       │   │   │   ├── AnnouncementBar.jsx
│       │   │   │   └── SearchOverlay.jsx
│       │   │   ├── home/
│       │   │   │   ├── HeroSlider.jsx
│       │   │   │   ├── CategoryCircles.jsx
│       │   │   │   ├── FeaturedCollection.jsx
│       │   │   │   ├── WatchAndBuy.jsx
│       │   │   │   ├── FeaturedVideoSection.jsx
│       │   │   │   ├── ProductShowcase.jsx
│       │   │   │   ├── StoreLocations.jsx
│       │   │   │   ├── CustomerReviews.jsx
│       │   │   │   └── FirstVisitBanner.jsx
│       │   │   ├── product/
│       │   │   │   ├── ProductCard.jsx
│       │   │   │   ├── ProductGrid.jsx
│       │   │   │   ├── ProductGallery.jsx
│       │   │   │   ├── FilterSortBar.jsx
│       │   │   │   └── RelatedProducts.jsx
│       │   │   ├── cart/
│       │   │   │   ├── CartPanel.jsx
│       │   │   │   ├── CartItem.jsx
│       │   │   │   └── CartSummary.jsx
│       │   │   ├── wishlist/
│       │   │   │   ├── WishlistPanel.jsx
│       │   │   │   └── WishlistItem.jsx
│       │   │   ├── checkout/
│       │   │   │   ├── OrderSummary.jsx
│       │   │   │   ├── AddressForm.jsx
│       │   │   │   └── PaymentStep.jsx
│       │   │   ├── auth/
│       │   │   │   ├── LoginForm.jsx
│       │   │   │   └── SignupForm.jsx
│       │   │   ├── admin/
│       │   │   │   ├── AdminSidebar.jsx
│       │   │   │   ├── DashboardSection.jsx
│       │   │   │   ├── OrdersSection.jsx
│       │   │   │   ├── ProductsSection.jsx
│       │   │   │   ├── InventorySection.jsx
│       │   │   │   ├── CustomersSection.jsx
│       │   │   │   ├── AnalyticsSection.jsx
│       │   │   │   ├── PushNotificationsSection.jsx
│       │   │   │   ├── WatchBuySection.jsx
│       │   │   │   └── ProductForm.jsx
│       │   │   └── ui/
│       │   │       ├── WhatsAppButton.jsx
│       │   │       ├── CurrencySelector.jsx
│       │   │       └── LoadingSpinner.jsx
│       │   ├── services/
│       │   │   ├── api.js
│       │   │   ├── authService.js
│       │   │   ├── productService.js
│       │   │   ├── cartService.js
│       │   │   ├── wishlistService.js
│       │   │   ├── orderService.js
│       │   │   ├── categoryService.js
│       │   │   └── currencyService.js
│       │   ├── hooks/
│       │   │   ├── useSiteConfig.js       # Fetches site config based on subdomain
│       │   │   ├── useCart.js
│       │   │   ├── useWishlist.js
│       │   │   ├── useAuth.js
│       │   │   └── useCurrency.js
│       │   ├── context/
│       │   │   ├── SiteContext.jsx         # Provides site config (brand, colors, etc.) to all components
│       │   │   ├── AuthContext.jsx
│       │   │   ├── CartContext.jsx
│       │   │   └── CurrencyContext.jsx
│       │   ├── utils/
│       │   │   ├── priceFormatter.js
│       │   │   └── stockChecker.js
│       │   └── styles/                    # CSS files preserving current template1 design
│       │       ├── global.css
│       │       ├── navbar.css
│       │       ├── footer.css
│       │       ├── home.css
│       │       ├── category.css
│       │       ├── product-detail.css
│       │       ├── checkout.css
│       │       ├── admin.css
│       │       └── ...
│       ├── package.json
│       └── vite.config.js
│
├── backend/                           # Cloudflare Workers (reorganized)
│   ├── workers/
│   │   ├── index.js                   # Main router (updated)
│   │   ├── site-router.js             # Simplified — just serves the React SPA for subdomains
│   │   ├── platform/                  # SaaS-specific APIs
│   │   │   ├── auth-worker.js
│   │   │   ├── sites-worker.js
│   │   │   ├── users-worker.js
│   │   │   └── subscriptions-worker.js
│   │   └── storefront/               # Store-specific APIs
│   │       ├── products-worker.js
│   │       ├── categories-worker.js
│   │       ├── orders-worker.js
│   │       ├── cart-worker.js
│   │       ├── wishlist-worker.js
│   │       ├── payments-worker.js
│   │       └── email-worker.js
│   ├── utils/
│   │   ├── helpers.js
│   │   └── auth.js
│   ├── schema/
│   │   └── d1-schema.sql
│   └── wrangler.toml
│
└── package.json                       # Root package.json (workspace config)
```

---

## 4. App A: Fluxe SaaS Platform (fluxe.in) <a name="app-a"></a>

This is the main platform website where users sign up, create websites, and manage their subscriptions.

### Pages & Features

#### 4.1 Landing Page (`LandingPage.jsx`)
**Exact same design as current `frontend/index.html`**
- FLUXE logo + navigation bar (Login, Get Started buttons)
- Hero section with "Coming Soon" badge
- Headline: "Launch Your Website in minutes."
- Subtext: "A fully automated website platform..."
- Two CTAs: "Start Building" and "View Demo"
- PWA install bar at bottom
- Service worker registration

#### 4.2 Login Page (`LoginPage.jsx`)
**Same design and features as current `frontend/src/pages/login.html`**
- Email and password fields
- Google Sign-In button
- "Forgot Password" link (opens modal with email field)
- "Create an account" link
- Error message display
- Auto-redirect if already logged in
- Email verification check — shows "Verification Required" notice if unverified

#### 4.3 Signup Page (`SignupPage.jsx`)
**Same design and features as current `frontend/src/pages/signup.html`**
- Full Name, Email, Password fields (min 8 chars)
- Google Sign-In button
- On success: shows "Verification Required" box with option to Resend Email
- Validation: password length, matching passwords

#### 4.4 Verify Email Page (`VerifyEmailPage.jsx`)
- Extracts `token` and `email` from URL
- Calls API to verify
- Shows success/error state
- Auto-redirects to login on success

#### 4.5 Reset Password Page (`ResetPasswordPage.jsx`)
- New Password + Confirm Password fields
- Validates token and email from URL
- Submits to API

#### 4.6 Dashboard Page (`DashboardPage.jsx`)
**This is the core of the SaaS platform — significantly enhanced from the current version.**

**My Websites Section:**
- Grid of user's created sites (SiteCard components)
- Each card shows: brand name, subdomain, template, status, creation date
- "Visit Site" button (opens subdomain URL)
- **"Manage Site" button** — opens the embedded Site Admin Panel (NEW — see 4.7)
- "Delete Site" button

**Create New Site Wizard (SiteCreationWizard component):**
- **Step 1 — Template Selection**: Shows available templates with preview images. Currently: Template 1 (jewelry/general) and Clothing. Each shows a preview thumbnail.
- **Step 2 — Website Details**: Domain name (subdomain) input, Brand name input, Logo upload (optional, converted to Base64)
- **Step 3 — Categories**: Add product categories (at least one required). "+ Add Another Category" button. These categories will appear in the store navigation dynamically.
- Creates the site via API call on confirmation

**Billing & Plans Section:**
- Duration toggle: Monthly / 6 Months / Yearly
- Four plan cards displayed in a 2x2 grid:
  - **Free Trial**: 7 days, 1 website, basic templates
  - **Basic**: ₹99/mo (₹499/6mo, ₹899/yr) — 1 website, standard templates, 24/7 support
  - **Premium**: ₹299/mo (₹1499/6mo, ₹2499/yr) — 3 websites, all templates, priority support
  - **Pro**: ₹999/mo (₹4999/6mo, ₹8999/yr) — unlimited websites, custom domain, dedicated manager
- Upgrade via Razorpay payment
- Downgrade prevention until current period ends
- Expired plan forces plan selection overlay

#### 4.7 Site Admin Panel (`SiteAdminPanel.jsx`) — NEW ENHANCED FEATURE
**When a user clicks "Manage Site" on their dashboard, this panel opens. It replaces the need to manually navigate to the admin panel.**

**Settings Tab:**
- Edit brand name, logo, favicon
- Edit contact info (phone, email, address)
- Edit social links (Instagram, Facebook, Twitter, YouTube)
- add content add about us page add about images etc.
- **Razorpay Credentials** (NEW): Input fields for the store owner's Razorpay Key ID and Razorpay Key Secret. These will be stored in the site's `settings` JSON field and used when processing payments on their store.

**Categories Tab:**
- View all categories for this site
- Add new categories (name, slug auto-generated, optional image, display order)
- Add sub-categories under parent categories
- Edit existing categories
- Delete categories
- Drag-and-drop reordering
- Categories added here automatically appear in the storefront navigation

**Products Tab:**
- Quick overview of all products
- Link to the full Products Admin page on the storefront

**Orders Tab:**
- Quick overview of recent orders
- Link to the full Orders section on the storefront admin

#### 4.8 Owner Admin Page (`OwnerAdminPage.jsx`)
**Same as current `frontend/src/pages/admin.html`**
- System overview: total users, total websites
- Users table: name, email, plan, join date, Block action
- Websites table: subdomain, owner, status

---

## 5. App B: Dynamic Storefront (*.fluxe.in) <a name="app-b"></a>

This is the e-commerce store that end-customers visit. It will look **exactly like the current template1 design** but built with React components.

### How It Becomes Dynamic
1. When the React app loads, it reads the hostname (e.g., `savan.fluxe.in`)
2. It extracts the subdomain (`savan`)
3. It calls `/api/site?subdomain=savan` to fetch the site configuration
4. The `SiteContext` stores all site data (brand name, colors, logo, categories, settings)
5. Every component reads from `SiteContext` instead of `{{placeholders}}`

### Categories — Fully Dynamic
- **No more hardcoded collection pages** (no separate new-arrivals.html, gold-necklace.html, etc.)
- Categories are created by the store owner in the Dashboard admin panel
- The navigation menu is dynamically built from the categories API
- Clicking a category navigates to `/category/[slug]` which loads products for that category
- Sub-categories are supported (parent → child)
- Store owner can add products under any created category

### Pages & Features (Exact Match to Current Template1)

#### 5.1 Home Page (`HomePage.jsx`)
**Exact same layout and sections as current `template1/index.html`and all these user can easily manage and edit from thier admin panel:**

1. **Announcement Bar** (`AnnouncementBar.jsx`): Scrolling marquee banner with promotional text. Continuous auto-scroll animation.

2. **Navbar** (`Navbar.jsx`):
   - Brand logo (from site config)
   - Search icon (opens SearchOverlay)
   - User/Account icon
   - Wishlist icon with count badge
   - Cart icon with count badge
   - Desktop menu links: Home, New Arrivals, dynamic categories from API, About, Testimonials, Book Appointment, Order Track, Contact
   - Mobile hamburger menu with slide-out panel

3. **Hero Slider** (`HeroSlider.jsx`): Full-width image carousel. Auto-advances every 4 seconds. Pauses on hover. Smooth transitions. "Shop Now" buttons on slides.

4. **Category Circles** (`CategoryCircles.jsx`): Horizontal scrollable row of circular category icons. Dynamically populated from the site's categories. Each links to `/category/[slug]`.

5. **Watch & Buy Section** (`WatchAndBuy.jsx`): Horizontal scroll of shoppable videos. Each video has an overlaid product link (name, price, image). Only one video plays at a time. Intersection observer for auto-focus.

6. **Feature Video Section** (`FeatureVideoSection.jsx`): Full-width background video. Title, description overlay. "CHAT NOW" WhatsApp button.

7. **Interactive Product Showcase** (`ProductShowcase.jsx`): Large image with clickable "product dots" (e.g., necklace, earrings, bangle). Clicking a dot opens a popup with product details and "Shop Now" link.

9. **Store Locations** (`StoreLocations.jsx`): Showroom address, hours, phone number. "View on Map" link. "Book Appointment" button.

10. **Customer Reviews** (`CustomerReviews.jsx`): Carousel of customer testimonials. Customer photo, name, star rating, review text.

11. **First Visit Banner** (`FirstVisitBanner.jsx`): Welcome modal shown once to new visitors. Uses localStorage to track. Signup CTA.

12. **Footer** (`Footer.jsx`): Collapsible sections: Info, Categories (dynamic), Collection, Exclusive Benefits. Social media links (from site config). Payment method icons.

13. **Mobile Bottom Nav** (`MobileBottomNav.jsx`): Sticky bottom bar (mobile only). Icons: Home, Shop (All Collection), Account, Currency selector, Cart with count.

14. **WhatsApp Button** (`WhatsAppButton.jsx`): Floating green button. Links to WhatsApp with store's phone number (from site config). Tooltip "How can I help you?" after 3 seconds.

15. **Search Overlay** (`SearchOverlay.jsx`): Full-screen overlay with search input. Fuzzy search with Levenshtein distance matching. Search by name, description, category, or price. Search history (last 10 queries in localStorage).

16. **Cart Panel** (`CartPanel.jsx`): Slide-out side panel. List of cart items with quantity controls. Subtotal display. "Continue Shopping" and "Checkout" buttons.

17. **Wishlist Panel** (`WishlistPanel.jsx`): Slide-out side panel. List of wishlist items. "Move to Cart" and "Remove" buttons.

#### 5.2 Category Page (`CategoryPage.jsx`)
**Exact same as current `template1/category.html` + `category-loader.js`:**
- URL: `/category/[slug]` (e.g., `/category/gold-necklace`)
- Hero section with category name and description (if available)
- Product grid with product cards
- **Filter & Sort Bar** (`FilterSortBar.jsx`):
  - Sort by: Price Low→High, Price High→Low, Newest
  - Filter by: Price range (Under ₹5k, ₹5k-₹15k, etc.), Availability (In Stock)
  - Client-side filtering on loaded products
- Each product card shows: image, name, price, "Add to Wishlist" heart icon
- Click on product → navigates to `/product/[slug]`
- Empty state: "No Products Found" with "Browse All" link
- Loading skeleton while data fetches

#### 5.3 Product Detail Page (`ProductDetailPage.jsx`)
**Exact same as current `template1/product-detail.html` + `product-detail-loader.js`:**

- **Image Gallery** (`ProductGallery.jsx`):
  - Large main image (650px height)
  - Thumbnail strip below
  - Click thumbnail → updates main image with fade animation
  - Click main image → zoom overlay (fullscreen)
  - Keyboard navigation (arrow keys)
  - Touch swipe support on mobile
  - Close zoom via X button or Escape key

- **Product Info:**
  - Product name
  - Price (formatted in INR with Intl.NumberFormat)
  - Brand name (from site config)
  - Availability status (In Stock / Out of Stock)
  - SKU
  - Category
  - Full description

- **Action Buttons:**
  - "Add to Cart" — respects stock levels, adds with quantity
  - "Buy Now" — adds to cart and redirects to checkout
  - "Add to Wishlist" / "Remove from Wishlist" — toggles based on current state

- **Related Products** (`RelatedProducts.jsx`):
  - "You May Also Like" section
  - Shows up to 6 shuffled products from the same category
  - Each with image, name, price, wishlist heart, link to detail

- **Customer Reviews Section:**
  - Star ratings (★/☆)
  - Verified Purchase badge
  - Review images (clickable for fullscreen modal)
  - Hidden if no reviews exist

#### 5.4 Checkout Page (`CheckoutPage.jsx`)
**Exact same 3-step flow as current `template1/checkout.html` + `checkout-script-simplified.js`:**

- **Step 1 — Order Summary** (`OrderSummary.jsx`):
  - List of cart items with images, names, prices
  - Quantity adjust controls
  - Remove item buttons
  - Subtotal calculation
  - "Continue to Shipping" button

- **Step 2 — Address & Shipping** (`AddressForm.jsx`):
  - Full Name, Email, Phone fields
  - Address Line 1, Line 2, City, State, PIN Code
  - PIN code validation via external API (api.postalpincode.in) — auto-fills city/state
  - Saved addresses (if logged in) — select from list or add new
  - "Set as Default" option
  - "Continue to Payment" button

- **Step 3 — Payment** (`PaymentStep.jsx`):
  - Payment method selection:
    - **Cash on Delivery (COD)**
    - **Razorpay** (online payment)
  - Final review: shipping address summary + order total
  - **Razorpay Integration**:
    1. Calls backend to create a Razorpay order (using the store owner's Razorpay credentials from site settings)
    2. Opens Razorpay payment popup
    3. On success: sends payment ID + signature to backend for verification
    4. On verification success: order is finalized
  - **Post-Order Actions:**
    - Stock quantities decremented
    - Order confirmation email sent
    - Admin notification created
    - Cart cleared
    - Order confirmation modal shown

#### 5.5 Profile Page (`ProfilePage.jsx`)
**Exact same as current `template1/profile.html`:**

- **Account Details Tab:**
  - User name, email, profile avatar (initials)
  - Address management: add, edit, delete, set default
  - Address form validation (phone, PIN code)

- **Order History Tab:**
  - List of all orders
  - Each shows: Order ID, Date, Total, Items with images
  - Status banner with colors: Pending (yellow), Confirmed (blue), Shipped (orange), Delivered (green)
  - Detailed status tracking

- **Logout:** Confirmation dialog → clears session → redirects to home

#### 5.6 Authentication Pages

**Login Page** (`LoginPage.jsx`):
- Email + Password fields
- "Forgot Password" link (modal)
- Google Sign-In button
- Auth guard: redirects if already logged in
- Verification check: shows notice if email unverified

**Signup Page** (`SignupPage.jsx`):
- Full Name, Email, Password, Confirm Password
- Real-time validation
- Success: shows "Check your email for verification" popup

**Forgot Password** (modal in Login):
- Email input → sends reset link via API

**Reset Password Page** (`ResetPasswordPage.jsx`):
- New Password + Confirm fields
- Token validation from URL

**Verify Email Page** (`VerifyEmailPage.jsx`):
- Auto-verifies token from URL
- Success/error states
- Auto-redirect to login

#### 5.7 Informational Pages

**About Page** (`AboutPage.jsx`):
- Brand story/heritage section
- Founder section with image
- Core values cards (Heritage, Craftsmanship, Quality)
- Mission statement

**Contact Page** (`ContactPage.jsx`):
- Contact form: Name, Email, Phone, Subject dropdown, Message
- Contact info display: address, phone (click-to-call), email
- Social media links
- Working hours
- WhatsApp integration

**Book Appointment Page** (`BookAppointmentPage.jsx`):
- Appointment type: In-Store Visit or Virtual Consultation
- Personal info: Name, Email, Phone
- Date picker
- Time slot selection (interactive)
- Purpose dropdown (Browse, Custom Design, Repair, etc.)
- Additional notes textarea

**Order Track Page** (`OrderTrackPage.jsx`):
- the owner of that subdomain website can enter a link for order page so if any clicks on order page under navigation section then they will be redirected to that order tracking page instead of creating a complete order tracking functionality that would be too complex 
**Privacy Policy & Terms Pages**: Static content pages with the store's legal information. where user can the details from admin panel

#### 5.8 Store Admin Panel (`AdminPanel.jsx`)
**Exact same sections and features as current `template1/admin-panel.html`:**
- Protected by verification code entry

**Admin Sidebar Tabs:**

1. **Dashboard** (`DashboardSection.jsx`):
   - Period selector: Today, This Week, This Month, This Year, Overall
   - Stats grid: Total Orders, Total Revenue (₹), Total Customers, Inventory Value
   - Pending orders table with Confirm/Cancel actions
   - Recent ordejusrs list

2. **Products** (`ProductsSection.jsx`):
   - Search bar to filter products
   - Category tabs for filtering (dynamically populated from site's categories)
   - Product grid with cards: image, title, price, category
   - "Add Product" button → navigates to ProductForm
   - Edit/Delete actions on each product

3. **Inventory** (`InventorySection.jsx`):
   - Summary cards: Out of Stock (red), Low Stock (orange), In Stock (green), Total
   - Tabs: Out of Stock items, Low Stock items, All Products
   - Table view: Product, Category, Price, Stock Level, Status badge, Last Updated

4. **Orders** (`OrdersSection.jsx`):
   - Search by Order ID, Name, Email, Phone
   - Status filter tabs: All, Pending, Confirmed, Cancelled
   - Orders table: Order ID, Customer, Date, Amount, Status
   - Confirm/Cancel action buttons
   - Refresh button

5. **Customers** (`CustomersSection.jsx`):
   - Search by UID, Name, Email
   - Customers table: UID, Name, Email, Phone, Orders count, Total Spent, Last Order date

6. **Analytics** (`AnalyticsSection.jsx`):
   - Engagement metrics: Visitors, Page Views, Bounce Rate, Avg Session Duration
   - Real-time visitors (Online Now)
   - Charts (using Chart.js or Recharts):
     - Visitor trends (line chart)
     - Traffic sources (pie chart)
     - Device & browser breakdown
   - Geographic analytics: countries, cities, breakdown table

7. **Push Notifications** (`PushNotificationsSection.jsx`):
   - Recipient stats: Subscribed Users, Guest Tokens, Total
   - Notification composer: Title, Message, Image upload, Link selector, Targeting (logged-in / guest)
   - Automatic notifications toggles: New Products, Price Drops, Back in Stock

8. **Watch & Buy** (`WatchBuySection.jsx`):
   - Video grid of uploaded shoppable videos
   - Upload modal: video file (max 100MB), Title, Description, Product SKU linkage
   - Edit/Delete video actions

#### 5.9 Product Creation/Editing (`ProductsAdminPage.jsx` / `ProductForm.jsx`)
**Exact same features as current `products-admin-panel.html`:**

- **Mode**: Automatically detects Create vs Edit based on URL params
- **Fields:**
  - Product Name (required)
  - Price in ₹ (required, min 1)
  - Stock Quantity (required, min 0)
  - Category dropdown (populated from site's categories — dynamically, no hardcoded categories)
  - Description (required)
  - Images: multi-upload, drag-and-drop, main image selection, image reordering
- **Image Compression**: Client-side compression with adjustable quality (0.1–1.0), format selection (JPEG/PNG/WebP)
- **Auto Notifications**: New product → notification, back in stock → notification, low stock → alert, price drop → notification
- **Edit Mode**: Pre-fills form, tracks changed fields, retains existing images, allows adding new images
- **Delete**: Confirmation dialog → API delete → cache invalidation

### Cart & Wishlist System

#### Cart (React Context + Custom Hook)
**Exact same behavior as current cart system:**

- **Guest Users**: Cart stored in localStorage (key: `cart_items`)
- **Logged-in Users**: Cart synced with server API (`/api/cart`)
- **Cart Merging on Login**: When a guest logs in:
  1. Fetch items from both localStorage and API
  2. Merge: for duplicate items, keep the higher quantity
  3. Sync merged cart to API
  4. Clear localStorage cart
- **Session cache**: sessionStorage cache for API cart data (quick reload)
- **Cart Panel**: Slide-out panel accessible from any page
- **Price Protection**: Stores original INR prices regardless of displayed currency

#### Wishlist (React Context + Custom Hook)
**Exact same behavior as current wishlist system:**

- **Guest Users**: Wishlist in localStorage (key: `wishlist_items`)
- **Logged-in Users**: Synced with `/api/wishlist`
- **Wishlist Merging on Login**: Combines all unique product IDs from both sources
- **Move to Cart**: Transfer item from wishlist to cart
- **Wishlist Panel**: Slide-out panel with remove and move-to-cart actions

### Utility Features

#### Currency Converter (`CurrencyContext.jsx` + `useCurrency.js`)
- Geo-location detection via ipapi.co to suggest local currency
- Live exchange rates from exchangerate-api.com (cached 24h in localStorage)
- All prices on the page update dynamically when currency changes
- Proper INR formatting (Lakhs/Crores system)
- Currency selector in mobile bottom nav

#### Search (`SearchOverlay.jsx`)
- Fuzzy matching (Levenshtein distance)
- Relevance scoring: Name (1.0), Description (0.6), Category (0.4), Price proximity (0.3)
- Search history (last 10 in localStorage)
- Price-based search (finds products within 20% of searched value)

#### Stock Manager (integrated into services)
- Real-time stock checks before cart addition
- Low stock threshold: 3
- Out of stock threshold: 0
- Admin alerts for low/out of stock
- Auto-decrement on order completion

### Features NOT Being Carried Over
- **Language Translator** (as requested — not needed currently)
- **Hardcoded collection pages** (new-arrivals.html, gold-necklace.html, etc.) — replaced by dynamic `/category/[slug]` routing
- **Firebase/Netlify backend code** — replaced by Cloudflare Workers
- **`guide/` folder** — ignored as requested

---

## 6. Backend Reorganization <a name="backend"></a>

### What Changes
- Worker files reorganized into `platform/` and `storefront/` subfolders
- `site-router.js` simplified — instead of fetching template HTML and replacing placeholders, it now just serves the React app's `index.html` for any subdomain request. The React app handles everything client-side.
- **New: Per-store Razorpay credentials** — The `payments-worker.js` will read Razorpay keys from the site's `settings` JSON instead of using global keys. This means each store owner can accept payments through their own Razorpay account.

### What Stays the Same
- All existing API endpoints and their behavior
- D1 database schema (with minor additions for Razorpay credentials in site settings)
- JWT authentication system
- R2 storage for file uploads
- CORS configuration

### New/Modified API Endpoints
| Endpoint | Change |
|----------|--------|
| `PUT /api/sites/:id` | Accept `razorpayKeyId` and `razorpayKeySecret` in the settings object |
| `POST /api/payments/create-order` | Read Razorpay credentials from site settings instead of global env |
| `POST /api/payments/verify` | Same — use per-site Razorpay credentials |

---

## 7. Deployment Strategy <a name="deployment"></a>

### Build Process
```
# Build App A (Platform)
cd apps/platform && npm run build   → outputs to apps/platform/dist/

# Build App B (Storefront)
cd apps/storefront && npm run build → outputs to apps/storefront/dist/
```

### Cloudflare Deployment

**Cloudflare Pages** serves both apps:
- Main domain (`fluxe.in`) → App A build output
- The storefront build output is placed in a `/storefront/` subfolder within Pages

**Cloudflare Workers** handles routing:
- Requests to `fluxe.in/api/*` → API handlers (unchanged)
- Requests to `*.fluxe.in` (subdomains) → Worker serves App B's `index.html` from Pages
- Static assets (JS/CSS) for App B → served from Pages with proper cache headers

### How Subdomain Routing Changes
**Before (current):**
```
Request to shop.fluxe.in → Worker detects subdomain → Fetches template HTML → Replaces {{placeholders}} → Returns HTML
```

**After (React):**
```
Request to shop.fluxe.in → Worker detects subdomain → Serves storefront React app (index.html) → React app boots → Reads subdomain from hostname → Calls API → Renders dynamically
```

This is simpler and more maintainable. The Worker's site-router becomes much smaller.

---

## 8. What Gets Removed <a name="removed"></a>

| Item | Reason |
|------|--------|
| `frontend/index.html` | Replaced by App A React |
| `frontend/src/` (all pages, JS, CSS) | Replaced by App A React |
| `frontend/templates/template1/` (all files) | Replaced by App B React |
| `frontend/templates/clothing/` | Will be rebuilt as a React theme later |
| `frontend/admin-panel/` | Integrated into App A dashboard |
| `frontend/dashboard/` | Integrated into App A dashboard |
| `frontend/sw.js`, `frontend/manifest.json` | Recreated in React apps |
| `guide/` folder | Ignored/removed |
| Server-side `{{placeholder}}` replacement in `site-router.js` | No longer needed — React handles rendering |
| Hardcoded collection HTML pages | Replaced by dynamic `/category/[slug]` route |
| `language-translator.js` + `translations.json` | Not needed currently |

---

## 9. Migration Order <a name="migration-order"></a>

The work will be done in this order:

### Phase 1: Foundation
1. Set up the monorepo structure with both React apps (Vite + React)
2. Reorganize backend folders
3. Set up React Router, contexts, and services for both apps

### Phase 2: App A — Platform
4. Landing page (exact design match)
5. Auth pages (login, signup, verify email, reset password)
6. Dashboard with site creation wizard
7. Site admin panel (embedded in dashboard) with Razorpay credentials
8. Owner admin page
9. Billing/subscription section

### Phase 3: App B — Storefront Core
10. SiteContext + subdomain detection + API integration
11. Layout components (Navbar with dynamic categories, Footer, Mobile Bottom Nav, Announcement Bar)
12. Home page with all sections (Hero Slider, Category Circles, Featured Collection, Watch & Buy, featured video Section, Product Showcase, Store Locations, Reviews)
13. Category page with dynamic product loading, filtering, sorting
14. Product detail page with gallery, zoom, add to cart/wishlist, related products

### Phase 4: App B — Shopping Features
15. Cart system (localStorage + API, merging on login, cart panel)
16. Wishlist system (localStorage + API, merging, panel)
17. Checkout flow (3 steps, address validation, Razorpay with per-store credentials, COD)
18. Auth pages (login, signup, forgot/reset password, verify email)
19. Profile page (account details, addresses, order history)
20. Currency converter

### Phase 5: App B — Admin & Extras
21. Store admin panel (all 8 sections)
22. Product creation/editing form with image compression
23. Search overlay with fuzzy matching
24. Contact, About, Book Appointment, Order Track pages
25. WhatsApp button, First Visit Banner, Stock Manager
26. Privacy Policy & Terms pages

### Phase 6: Backend Updates & Deployment
27. Update site-router.js for React SPA serving
28. Add per-store Razorpay credential support to payments worker
29. Build both apps and configure Cloudflare Pages deployment
30. Test end-to-end on production

---

## Summary

This migration preserves **every single feature** from the current template1 while making the platform truly dynamic and scalable. The key improvements are:

1. **Fully dynamic categories** — no more hardcoded collection pages
2. **Per-store Razorpay credentials** — each store owner enters their own payment keys
3. **Integrated admin panel in dashboard** — no need to manually navigate to admin URLs
4. **Clean code organization** — React components, contexts, and services instead of 30+ script files
5. **Easy to add new templates** — a new template = a new React theme using the same APIs
6. **Exact same visual design** — the storefront will look identical to current template1
