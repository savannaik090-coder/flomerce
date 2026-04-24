# Shopper Translation Refactor — DB + Cloudflare CDN with Auto-Purge

**Status:** In progress
**Started:** April 2026
**Owner:** Backend + Frontend

## What we're building (in plain words)

Today, when a Hindi shopper visits a storefront, they see English first and the
page flickers to Hindi half a second later. Google's crawler and WhatsApp link
previews always see English regardless of the shopper's language.

We're moving the translation work from the **browser** to the **server**, with
each language version cached at the Cloudflare edge for 7 days. Result: shoppers
see Hindi from the very first paint, Google indexes the Hindi version, WhatsApp
previews show Hindi.

## How it will work end-to-end

```
Shopper opens product page (language = 'hi' from localStorage)
   │
   ▼
Browser requests:  GET /api/products?siteId=...&lang=hi
   │
   ▼
Cloudflare CDN — cached 7 days per ?lang= variant
   │ HIT  → served from edge in ~20ms (no Worker invocation)
   │ MISS → falls through to origin Worker
   ▼
Worker:
   1. Fetch English data from D1 shard
   2. Collect translatable strings (product.name, description, category_name)
   3. Bulk-lookup hashes in shard `translation_cache` table
   4. Misses → one Microsoft Translator call (merchant credentials)
   5. Splice translated strings back into the payload
   6. Persist new translations to `translation_cache` for next time
   7. Return with Cache-Control headers (CDN holds for 7d)
   │
   ▼
Shopper sees Hindi page on first paint. No flicker.
```

**Merchant edits a product** → `purgeStorefrontCache` (debounced 30s) loops
through every enabled language and purges all `?lang=` variants of the affected
URLs. Cache repopulates on next shopper visit per language.

## Architecture decisions (locked)

| Decision | Choice | Rationale |
|---|---|---|
| URL format | `?lang=hi` query param | Minimal SPA churn; same SEO with hreflang |
| UI label translation | Keep `<TranslatedText>` for static labels | Shared cache; saves rewriting 40 component files |
| SEO scope | In-scope (Phase 5) | Without it, shoppers gain UX but Google still sees English |
| Cache key | Per-URL, per-language (native query-param caching) | No `Vary` gymnastics needed |
| Fallback when translator disabled / capped | Return original strings | Same graceful degradation as today's `/translate` proxy |
| Source of language | `localStorage flomerce_lang` (existing) | Already populated by language switcher |

## What stays the same

- Cloudflare Workers, D1 shard databases, Microsoft Translator
- Shard `translation_cache` table schema and indexes
- `site_translator_usage` daily cap + char metering
- Merchant-credential model (each merchant pays Microsoft from their own quota)
- React + Vite frontend (no SSR, no Next.js, no rewrite)
- `<TranslatedText>` component for static UI labels ("Add to cart", etc.)
- Language switcher button + localStorage persistence

## What changes

| Layer | Change |
|---|---|
| `backend/utils/server-translator.js` | **NEW** — server-side helper that takes a payload + target language, looks up cache, calls Microsoft on miss, returns translated strings. Reusable from any Worker endpoint. |
| `backend/workers/storefront/products-worker.js` | Reads `?lang=` query, calls server-translator on the response payload, returns translated. Backward compatible (no `?lang=` → English as today). |
| `backend/workers/storefront/categories-worker.js` | Same |
| `backend/workers/storefront/blog-worker.js` | Same |
| `backend/workers/storefront/site-admin-worker.js` (`/api/site`) | Same |
| `backend/workers/storefront/reviews-worker.js` | Same |
| `backend/utils/cache.js` `purgeStorefrontCache` | Loop through enabled languages when building purge URLs |
| `frontend/src/storefront/src/services/api.js` | Append `&lang=...` to storefront API calls based on `localStorage flomerce_lang` |
| Frontend content rendering | Stop wrapping `product.name` etc. in `<TranslatedText>` — API now returns translated. Keep wrapping for static UI labels. |
| `backend/workers/seo/meta-injector.js` | Detect `?lang=` on incoming request, server-side translate `<title>`, meta description, OG tags, JSON-LD. Emit `<link rel="alternate" hreflang>` for every enabled language. |
| `backend/workers/seo/sitemap-generator.js` | Emit `<xhtml:link rel="alternate" hreflang>` entries per URL per enabled language |
| `backend/workers/storefront/translate-worker.js` | **Deprecated in Phase 6** — kept for one release, then removed. |

## Phased rollout

Each phase ships independently and is safe to deploy on its own. No phase
breaks the storefront if subsequent phases are not yet shipped.

### Phase 0 — Server-side translator helper [✅ Done]
Build `backend/utils/server-translator.js` as a standalone reusable helper.
No behavior change, no caller wired in yet. Unblocks Phases 1–2.

### Phase 1 — `?lang=` on `/api/products` and `/api/products/:id` [✅ Done]
Wired the helper into the products endpoint. Fully backward compatible: no
`?lang=` parameter returns English exactly as today. The new
`translateProductsInPlace` helper batches every translatable string across N
products into a single Microsoft round-trip (when needed). Translation errors
are swallowed and originals returned so the storefront never breaks.

### Phase 2 — Roll out to remaining storefront endpoints [✅ Done]
Same `?lang=` pattern applied to `/api/categories` (list + by-id, recursive
through children + grandchildren), `/api/blog/posts` and
`/api/blog/post/:slug` (title, excerpt, content, meta tags, author,
parsed `tags[]`), `/api/reviews/product/:id` (review title + body,
intentionally NOT customer name), and `/api/site` (brand name, tagline,
about, recursive categories, pageSEO entries). Each endpoint stays
fully backward compatible: omit `?lang=` and the response is identical
to today.

### Phase 3 — Frontend: pass `?lang=` and stop wrapping content fields [⏳ Next]
`api.js` reads `localStorage flomerce_lang`, appends `&lang=...` to every
storefront API call. Remove `<TranslatedText>` wrappers from `product.name`,
`category.name`, etc. Keep wrappers for static UI labels.

### Phase 4 — Per-language cache purge
Extend `purgeStorefrontCache` to fan out one purge URL per enabled language
per resource. Builds on the 30s debounce already shipped.

### Phase 5 — SEO: meta tags + hreflang + sitemap
Server-side translate `<title>`, `<meta description>`, OG tags, JSON-LD in
`meta-injector.js`. Emit `hreflang` link tags in head and sitemap.

### Phase 6 — Cleanup
Refactor `translate-worker.js` to delegate to `server-translator.js`
(eliminate duplicated logic). Mark the standalone `/translate` proxy as
deprecated. Update `replit.md`.

## Translatable fields per endpoint

| Endpoint | Fields translated server-side |
|---|---|
| `/api/products` | `name`, `description`, `short_description`, `category_name`, `subcategory_name`, parsed `tags[]`, parsed `options[].name` and `options[].values[]` |
| `/api/products/:id` | Same as above |
| `/api/categories` | `name`, `description`, `subtitle` (recursive through `children[]` and grandchildren) |
| `/api/categories/:id` | Same (recursive) |
| `/api/blog/posts` | `title`, `excerpt`, `author`, parsed `tags[]` |
| `/api/blog/post/:slug` | `title`, `excerpt`, `content`, `meta_title`, `meta_description`, `author`, parsed `tags[]` |
| `/api/reviews/product/:id` | Review `title`, `content` (NOT `customer_name` — that's a real person's name) |
| `/api/site` | `brand_name`, `settings.tagline`, `settings.about`, recursive `categories[].name/description/subtitle`, `pageSEO[*].seo_title/seo_description` |

Fields explicitly NOT translated: prices, currency codes, slugs, IDs, image
URLs, dates, SKUs, status enums.

## Risk + rollback

| Risk | Mitigation |
|---|---|
| Worker CPU spike on cold compose | First shopper per language pays ~500-1500ms; subsequent served from edge in ~20ms |
| Stale-content window during 30s debounce | Same trade-off as already accepted for English-content purges |
| Cache footprint grows N× per language | Cloudflare doesn't bill within fair use; trade for shopper latency win |
| Translatable-fields config drift | Add a JSDoc comment at each endpoint listing translatable fields; update when adding new columns |
| Frontend ships `?lang=` before backend supports it | Phase 1–2 land BEFORE Phase 3. Backward-compatible: backend ignores unknown `?lang=` and returns English. |

Rollback: each phase is an isolated commit. Revert any phase independently
without breaking the others.

## Out of scope (separate work tracks)

- Email translation (14 hardcoded English templates in `backend/utils/email.js`)
- Push notification translation
- Invoice page translation (`InvoicePage.jsx`, `OverageInvoicePage.jsx`)
- Locale-aware date/number formatting
- RTL CSS support for Arabic / Hebrew / Persian / Urdu
- API error string translation (error-code refactor)

These are tracked separately in the storefront translation audit and will be
prioritized after this refactor lands.

## Updates log

- **Phase 0 complete** — server-translator helper created. No production
  behavior change. Validated workflow restart.
