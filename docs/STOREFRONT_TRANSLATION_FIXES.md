# Storefront Translation Fixes — Phased Implementation Plan

**Goal:** Make every shopper-visible surface (storefront UI, API content, SEO, transactional emails, WhatsApp messages) respect the shopper's chosen language end-to-end.

**Out of scope (kept English by design):** Legal page bodies (Terms, Privacy, Refund, Shipping) and the LegalBindingBanner — these stay English so machine translation can never produce wrong/offensive legal copy. Only the chrome around them (LanguageSwitcher, footer links, the small banner heading/body keys already in `common.json` / `landing.json`) translates.

---

## Status (2026-04-25)

- Phase 1 — DONE (`backend/migrations/0022_customer_language_prefs.sql` + `backend/utils/site-schema.js` ALTERs).
- Phase 2 — DONE (extended `DEFAULT_FIELD_RE` in `scripts/extract-i18n.cjs`; manifest = 494 strings).
- Phase 3 — DONE (walker `TRANSLATABLE_SUFFIXES` + `?lang=` translation in `getOrder`/`getOrders`).
- Phase 4 — DONE for the storefront customer surface (cancellation, confirmation, packed, shipped, delivered, cancellation approved/update, return status, return-link, cancel-link). Platform `email-worker.js` (verification/password-reset/contact/appointment) intentionally skipped — verification & reset endpoints have no frontend caller; contact & appointment go to the merchant in English.
- Phase 5 — DONE (`mapToWhatsAppLanguageCode` + `resolveWhatsAppLangCode` in `backend/utils/whatsapp.js`; `targetLang` threaded through `sendOrderWhatsApp` → `sendWhatsAppMessage` → `sendViaMeta` / `sendViaInterakt`; every builder now sets `targetLang` on its returned message data).
- Phase 6 — DONE for high-impact POSTs: `authService.signup` / `requestPasswordReset` / `resendVerification` send `lang`; `orderService.resendReturnLink` / `resendCancelLink` send `lang`; `cart-worker.getCart` persists the active `?lang=` to `carts.language` so the abandoned-cart cron has a hint even before the first order.
- Phase 6 (intentionally skipped) — Contact / appointment forms keep English bodies because they go to the merchant inbox.
- Phase 7 — DONE for ProductReviews sort dropdown (uses `useShopperTranslation().translate`). All other listed surfaces (CheckoutPage, auth pages, OrderTrack, Return, Cancel) already render their state strings through `<TranslatedText text={error} />`, so the existing wraps cover them. The aria-labels in 7d are screen-reader-only and were left as-is.
- Phase 8 — DONE: extraction regenerated (494 strings, hash `2d0f5234797a3958`); storefront + platform builds pass.

## Phase 1 — Schema migrations (foundation)

Add columns so backend code can know the shopper's language at email/WhatsApp send time, even when the shopper has closed the tab.

- **Migration `0022_customer_language_prefs.sql`**
  - `ALTER TABLE site_customers ADD COLUMN preferred_lang TEXT;`
  - `ALTER TABLE carts ADD COLUMN language TEXT;`
- Update `backend/utils/site-schema.js` so newly-created shards include the columns.
- No backfill needed — `NULL` falls back to English (existing behaviour).

**Acceptance:** Migration file exists, schema file updated, both columns appear on new shards.

---

## Phase 2 — Manifest scanner regex (tiny, high impact)

Extend `scripts/extract-i18n.cjs` `DEFAULT_FIELD_RE` to catch the field names found in `defaults/generic.js` that are currently skipped.

- Add: `policy | charges | regions | replacements | mandatory | guide | washing | cleaning | maintenance | story | refund | replacement | approval | termsIntro | privacyIntro | buttonLink`.
- Rebuild — manifest hash auto-bumps and the bundle re-warms; no other action needed.

**Acceptance:** `node scripts/extract-i18n.cjs` shows a higher `count` and the generic.js default policies/care-guide/regions strings appear in `backend/i18n-manifest.json`.

---

## Phase 3 — Backend: walker + storefront API gaps

### 3a. Walker suffixes
In `backend/workers/index.js`, extend `TRANSLATABLE_SUFFIXES` (or equivalent list) used by `walkTranslatableLeaves` to include: `question`, `answer`, `alt`. So FAQ section answers and image alt text on merchant-defined sections translate.

### 3b. Three storefront endpoints become language-aware

- `GET /api/inventory-locations` — read `?lang=`, translate names/addresses/hours via `translateContentBatch`, emit `Cache-Control` + `CDN-Cache-Control` headers (mirror `/api/products`).
- `GET /api/orders/:id` — read `?lang=`, translate order item names + status labels.
- `GET /api/orders/:id/track` — same (tracking notes from merchant).

### 3c. Cache purge fan-out
Add `inventory-locations` (and any new resource type from 3b that the merchant can edit) to the per-language URL fan-out list in `backend/utils/cache.js#runPurgeNow`.

**Acceptance:** Hitting each endpoint with `?lang=hi` returns translated content; subsequent fetches are CDN-cached per language; merchant edits purge all language variants.

---

## Phase 4 — Backend: customer emails (Brevo)

### 4a. Translate order-email subject lines
In `backend/workers/storefront/orders-worker.js`, every `subject` that is a hardcoded English template literal must be passed through `translateString(env, siteId, targetLang, subject)` from `backend/utils/email-i18n.js`.

### 4b. Translate the four currently-English emails
Located in `backend/workers/platform/email-worker.js`:
- Customer email verification
- Customer password reset
- Contact form auto-reply
- Appointment booking confirmation

For each:
- Accept a `lang` parameter on the helper and on the route handler.
- Wrap visible labels in `translateLabels` (already proven pattern from order emails).
- Wrap the subject in `translateString`.
- When `lang` is missing, fall back to `site_customers.preferred_lang` (where applicable) → English.

### 4c. Wire the language hint through every caller
Every call site of every email helper must pass `lang`:
- Order emails — already use `placed_in_language` (no change).
- Customer signup/resend-verification handler — read `data.lang` from POST body and persist to `site_customers.preferred_lang`; pass `lang` to email helper.
- Forgot-password handler — read `data.lang` from POST body; pass to email helper. Optionally update `preferred_lang` if customer supplied one.
- Contact form handler — read `data.lang`; pass to auto-reply helper.
- Appointment booking handler — read `data.lang`; pass to confirmation helper.
- Abandoned-cart cron in `backend/workers/index.js#scheduled` — read `cart.language` first, fall back to `lastOrder.placed_in_language`, fall back to English.

**Acceptance:** Sending each email type to a Hindi shopper produces a Hindi subject and Hindi body. Brevo `subject` payload preview shows translated text.

---

## Phase 5 — Backend: WhatsApp `language.code`

In `backend/utils/whatsapp.js`:
- Add `targetLang` parameter to `sendViaMeta` and `sendViaInterakt`.
- Map `targetLang` to Meta's locale code format (e.g., `hi` → `hi`, `en` → `en_US`, `en_GB` → `en_GB`, `pt` → `pt_BR`, etc. — extend a small map; default to the raw code if unknown).
- Use the mapped code in the Meta `language.code` / Interakt `languageCode` field instead of `settings.whatsappLanguage`.
- Caller in `orders-worker.js` passes `placed_in_language`.
- Caller in abandoned-cart cron passes the resolved language.

**Acceptance:** A Hindi shopper triggers a Meta payload whose `language.code` is `hi`, not `en_US`.

---

## Phase 6 — Frontend: pass `lang` in POST bodies

So the backend has the language hint at email-send time:

- `pages/SignupPage.jsx` — POST body to `/api/customer/signup` includes `lang: localStorage.getItem('flomerce_lang') || 'en'`.
- `pages/ForgotPasswordPage.jsx` — same on `/api/customer/forgot-password`.
- `pages/VerifyEmailPage.jsx` (resend trigger if any) — same.
- `context/CartContext.jsx` (or whichever creates/updates carts) — include `lang` on cart create/update POSTs.
- `pages/ContactPage.jsx` — include `lang` on contact-form POST.
- `pages/BookAppointmentPage.jsx` — include `lang` on appointment POST.

**Acceptance:** Network tab in browser shows `lang` field in the request body for each of these flows.

---

## Phase 7 — Frontend: wrap remaining hardcoded UI strings

Wrap each in `<TranslatedText>` (visible JSX) or use `useShopperTranslate()` for `aria-label` / `placeholder` / `alt`. Approximate count: ~30 strings.

### 7a. Critical — Checkout (`pages/CheckoutPage.jsx`)
- Lines 249, 256, 297, 346, 419 — error/state messages
- Line 518 — split out `Qty:` literal
- Lines 535, 708 — *Free*
- Line 551 — PIN/Postal Code
- Lines 559–567 — payment method names + descriptions + status labels
- Lines 606–608 — stepper labels
- Line 715 — *Free shipping on orders above {amount}*
- Line 765 — *Continue to Address*

### 7b. Major — Auth pages
- `LoginPage.jsx`, `SignupPage.jsx` — Google `alt` text + signup error
- `ForgotPasswordPage.jsx` — validation + send-failed errors
- `ResetPasswordPage.jsx` — invalid-link + password-rule errors
- `VerifyEmailPage.jsx` — invalid-link + verification-failed errors

### 7c. Major — Product / Reviews / Orders
- `components/product/ProductReviews.jsx` — sort dropdown options
- `pages/ProductDetailPage.jsx` — *Product not found*
- `pages/ReviewPage.jsx` — invalid-link errors
- `pages/OrderTrackPage.jsx` — validation + not-found errors
- `pages/ReturnPage.jsx`, `pages/CancelPage.jsx` — submit-failed errors

### 7d. Minor — Accessibility / chrome
- `components/layout/Navbar.jsx` — `aria-label="Show subcategories"` (×2)
- `components/layout/Footer.jsx` — App Store / Play Store `alt`, *UP*
- `components/LanguageSwitcher.jsx` — `aria-label="Choose language"`
- `context/ShopperTranslationContext.jsx` — `aria-label="Loading translations"`

**After all wraps:** run `node scripts/extract-i18n.cjs` then build storefront and platform.

**Acceptance:** Loading the storefront in Hindi shows zero leftover English on the listed surfaces (excluding legal page bodies).

---

## Phase 8 — Build, verify, deploy

1. `node scripts/extract-i18n.cjs` (regenerate manifest with new wraps + scanner regex changes).
2. `cd frontend/src/storefront && npm run build`
3. `cd frontend/src/platform && npm run build`
4. Backend deploy required for: schema migration, walker change, new endpoint translations, email helpers, WhatsApp change.
5. Spot-check: switch storefront to Hindi → place test order → verify confirmation email (subject + body), WhatsApp template language code, abandoned cart reminder language.

---

## Out-of-scope reminders

- Legal page bodies (`TermsPage.jsx`, `PrivacyPolicyPage.jsx`, `RefundPolicyPage.jsx`, `ShippingPolicyPage.jsx`) — body stays English by design. Only the LegalNavbar's LanguageSwitcher, the LegalBindingBanner's already-translated keys, and the LegalFooter's already-translated link names change.
- Brand name (`brand_name`) — never translated (intentional).
- Phone number, email address — universal contact strings, stay literal.
- Owner/admin emails — merchant operates in English.
