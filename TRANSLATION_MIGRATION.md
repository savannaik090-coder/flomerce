# Translation Architecture Migration

**Decision date:** April 24, 2026
**Original goal (superseded):** Remove System A (static JSON-namespace translation via i18next/react-i18next) entirely. Make System B (per-merchant on-demand Microsoft Translator via `<TranslatedText>`) the single source of all storefront translation. Admin / dashboard / wizard / owner / auth / legal surfaces become English-only.

> **⚠️ CURRENT STATE — read this before the historical sections below.** System A was *partially restored* later the same day (Apr 24, 2026) and now serves the public-facing landing surfaces only: `LandingPage.jsx`, `Navbar.jsx`, `LandingPricing.jsx`, `ContactForm.jsx`, and `AboutPage.jsx` (5 files). All other platform pages — auth, dashboard, wizard, owner admin (including the Translations tab chrome), and the remaining legal pages (terms / privacy / refund / shipping) — remain English-only. The storefront still uses System B exclusively. The historical sections that follow describe the temporary "fully removed" state and are kept for context only — do **not** treat them as the current architecture. See `replit.md` "Translation Architecture" section for the authoritative current state.

---

## STATUS AS OF HANDOFF (April 24, 2026) — historical

**✅ FULL REMOVAL was completed earlier on Apr 24, 2026, then partially reverted later the same day** (see warning above and the bottom of this file for the post-revert log entries). The table below describes the original full-removal milestones.

| Phase | Description | Status |
|-------|-------------|--------|
| T001 | Documentation + inventory | ✅ Complete |
| T002 | Migrate storefront chrome to System B | ✅ Complete |
| T003 | Strip translation from admin / dashboard / wizard / owner / auth / legal | ✅ Complete |
| T004 | Wizard simplification (remove language step) | ✅ Complete |
| T005 | Migrate ShopperTranslationContext + storefront LanguageSwitcher off i18next | ✅ Complete |
| T006 | Delete System A files | ✅ Complete |
| T007 | Package cleanup (remove i18next/react-i18next/i18next-browser-languagedetector) | ✅ Complete |
| T008 | Build + smoke test both SPAs + restart workflows | ✅ Complete |

---

## ⚠️ HANDOFF NOTES FOR NEXT AGENT — READ FIRST

### What's already done (do NOT redo)
1. **All System A files deleted:**
   - `frontend/src/shared/i18n/` directory — gone
   - `backend/workers/platform/i18n-worker.js` — gone
   - The `case 'i18n':` route + import in `backend/workers/index.js` — removed
   - Any reference to `i18n-worker` from `backend/workers/platform/admin-worker.js` — removed
2. **Inlined English wizard seed data** into `backend/workers/platform/sites-worker.js`. The constants `SUPPORTED_LOCALES`, `EN_SEO_TITLE_TEMPLATES`, `EN_SEO_DESCRIPTION_TEMPLATES`, `EN_DEFAULT_CATEGORIES`, and the function `getEnglishWizardSeed()` now live there. **Do not reintroduce a separate i18n-worker.**
3. **`frontend/src/storefront/src/defaults/index.js` rewritten** to use only `generic.*` keys (no namespace JSON imports).
4. **`main.jsx` no longer calls `initStorefrontI18n`.** `SiteContext.jsx` no longer imports anything from `shared/i18n`.
5. **npm packages removed** from `frontend/src/platform/package.json` and `frontend/src/storefront/package.json`: `i18next`, `react-i18next`, `i18next-browser-languagedetector`. `npm install` was run in both directories (3 packages removed each).
6. **`ShopperTranslationContext`** uses `localStorage.flomerce_lang` + a `flomerce_lang_change` `CustomEvent` for cross-component communication. No i18next dependency.
7. **`<TranslatedText>` is the only translation primitive on the storefront.** The storefront `LanguageSwitcher` writes to `localStorage` and dispatches the custom event.

### Known harmless leftovers (DO NOT "clean these up" — they are intentional)
- **`backend/utils/translator.js`** and **`backend/migrations/0020_i18n_overrides.sql`** contain *comment-only* references to i18n-worker. These are stale comments; the code/SQL itself is for System B's translator memory. Leaving them as-is.
- **Some sections (e.g. `BillingSection`, `BlogSection`)** still have a `t` parameter in their function signature destructure but no `t()` calls inside. This is harmless dead-prop noise. Removing it is purely cosmetic.
- **`sites.content_language` DB column** still exists; just no longer set/read by app code. We agreed to keep the column for reverse-migration safety.

### ⚠️ CRITICAL WARNINGS — BUGS THAT BIT US, DO NOT REPEAT

The previous agent wrote two helper scripts to mass-rewrite `t('foo')` → plain English across 127 files. **Those scripts produced corrupt JSX in many files.** All known instances of corruption have been fixed by hand, but if you ever feel tempted to write another regex-based mass rewriter, **DO NOT.** Here are the specific failure modes that occurred so you can recognize them:

1. **Multi-line placeholder corruption.** The script turned this:
   ```jsx
   placeholder={t('login.email')}
   required
   ```
   into:
   ```jsx
   placeholder="name@company.com
   required"
   ```
   …producing a placeholder string of `"name@company.com\n              required"`. Visible to users as "name@company.com    required" inside the input field.

2. **Orphaned closing-quote lines** like a bare `              "` on its own line, after a follow-up "split-strings" script tried to fix #1 but missed the trailing `"`.

3. **Missing-open-quote attributes** like `<button type=submit">` or `<div className=form-group">`. These break the build with `Expected "{" but found "submit"`.

4. **Stray `t={t}` props** passed down to children that no longer accept them. Cosmetic only — no build break — but worth removing if you see them.

**A final clean-sweep grep was run:**
```bash
grep -rEn 'placeholder="[^"]*$' frontend/src --include='*.jsx'    # multi-line placeholders
grep -rEn '^\s*"$' frontend/src --include='*.jsx'                  # orphan quote lines
grep -rEn '\b[a-zA-Z]+=[a-zA-Z0-9_./-]+">' frontend/src --include='*.jsx' | grep -v '={'   # missing open quote
```
All three return empty as of handoff. **Re-run these greps as your first sanity check** if any build error mentions a JSX parse failure.

### Files to be aware of
- **Build outputs of both SPAs** go to `frontend/` (platform) and `frontend/storefront/` (storefront). The Vite warning about `outDir` being parent of root is **expected and intentional** — don't try to "fix" it.
- **Vite warns about Node v20.12.2** being too old. Builds succeed anyway. Do not upgrade Node.
- **Workflow names** must match exactly:
  - `Flomerce Backend (Production Mode)` — runs `cd backend && npx wrangler dev workers/index.js --port 8000 --ip 0.0.0.0 --local-protocol http --experimental-local`
  - `Start Website` — runs `node run-server.js` on port 5000

---

## ARCHIVED HANDOFF PLAN FOR T008 (now complete — kept for historical reference)

> The four steps below were the original handoff plan. All four have been completed: source-level smoke checks pass, `replit.md` is updated, this doc is marked complete, and the architect code review has signed off (see Status Log). The text is preserved unchanged for future reverse-migration reference.

### Step 1: Smoke-test the four surfaces that haven't been verified yet
The previous agent verified `/`, `/login`, `/signup`. You still need to verify:

1. **`/dashboard`** — sign in (or use any existing dev account), confirm the dashboard renders without console errors. Look specifically for any rendered string that says "undefined" or shows a translation key like `dashboard.metrics.revenue`.
2. **`/wizard`** — start the site-creation wizard. Confirm:
   - There is **NO** "Default Language for Your Website" step (we removed it).
   - All form labels are plain English.
   - Submitting the wizard creates a site successfully (you can test against the local backend).
3. **Storefront admin** — visit any test site's admin (e.g. `https://<your-test-site>.replit.dev/admin` or whatever path your local routing uses). Confirm chrome is plain English, no translation keys leak through.
4. **Storefront homepage** — visit a test site's public homepage. Confirm:
   - Page renders in English by default.
   - The language switcher appears (if the merchant has a translator API key configured).
   - Clicking a non-English language triggers `<TranslatedText>` to fetch translations (you'll see a brief flicker — that's expected and documented as Risk #3 below).

**Use the screenshot tool** (`screenshot type=app_preview path=/dashboard` etc.) to verify each surface visually. Look for:
- Any string that looks like a key (`foo.bar.baz` style)
- Any "undefined" rendered as text
- Any input placeholder containing the word "required" or a newline
- Any button missing a label

### Step 2: Update `replit.md`
Open `replit.md` and update the architecture section to describe the current setup:
- **Translation:** System B only. `<TranslatedText>` component fetches per-merchant on-demand translations from `backend/workers/storefront/translate-worker.js` using the merchant's Microsoft Translator API key. Falls back to English if the merchant has not configured a translator.
- **Admin/dashboard/wizard/owner/auth/legal surfaces:** English-only. No translation system loaded.
- **Removed:** i18next, react-i18next, i18next-browser-languagedetector packages; all `frontend/src/shared/i18n/` JSON namespaces; `backend/workers/platform/i18n-worker.js`; the wizard's "Default Language" step; the `/api/i18n/*` routes.
- **Kept:** `sites.content_language` DB column (unused by app, kept for safety); migrations 0020 and 0021 (translation_memory + overrides — used by System B).

### Step 3: Mark this doc complete
Add a final row to the Status Log table at the bottom of this file:
```
| Apr 24, 2026 | 8 | Migration complete. All builds clean. Smoke tests passed. |
```
And change the "STATUS AS OF HANDOFF" section at the top from "~95% complete" to "✅ COMPLETE".

### Step 4: Run code review
After steps 1-3 are done, run the architect code review per the `code_review` skill:
```javascript
await architect({
  task: "Review the System A → System B translation migration. Verify all i18next references are gone, the storefront <TranslatedText> path works, and admin surfaces are English-only.",
  relevantFiles: [
    "TRANSLATION_MIGRATION.md",
    "replit.md",
    "backend/workers/index.js",
    "backend/workers/platform/sites-worker.js",
    "backend/workers/platform/admin-worker.js",
    "backend/workers/storefront/translate-worker.js",
    "frontend/src/storefront/src/context/ShopperTranslationContext.jsx",
    "frontend/src/storefront/src/components/LanguageSwitcher.jsx",
    "frontend/src/storefront/src/components/TranslatedText.jsx",
    "frontend/src/storefront/src/defaults/index.js",
    "frontend/src/storefront/package.json",
    "frontend/src/platform/package.json"
  ],
  includeGitDiff: true
})
```
Fix any severe issues the architect surfaces. Then you're done.

---

## What stays vs what goes (the original decision)

### Stays
- **System B**: `backend/workers/storefront/translate-worker.js` (per-merchant on-demand translator)
- **`<TranslatedText>`** component (`frontend/src/storefront/src/components/TranslatedText.jsx`)
- **`ShopperTranslationContext`** (i18next dependency removed — uses localStorage + CustomEvent)
- **Storefront `LanguageSwitcher`** (i18next dependency removed)
- **Migrations 0020, 0021** (translation_memory + overrides — System B uses these)
- **Merchant translator settings** in `ShopperLanguageSection.jsx` (the feature that enables System B per-merchant)
- **`sites.content_language` column** (unused, kept as a safety hatch)

### Goes (and is gone as of this handoff)
- All 16 namespace JSON files in `frontend/src/shared/i18n/locales/en/` ✅
- `frontend/src/shared/i18n/init.js` ✅
- `frontend/src/shared/i18n/LanguageSwitcher.jsx` ✅
- `backend/workers/platform/i18n-worker.js` ✅
- All `useTranslation()` / `t()` calls across 127 files ✅
- npm packages: `i18next`, `react-i18next`, `i18next-browser-languagedetector` ✅
- Wizard "Default Language for Your Website" step ✅
- `/api/i18n/locale/:lang` and `/api/i18n/geo` endpoints ✅

---

## Risks we accepted

1. **Free-tier merchants lose all storefront translation.** Acknowledged trade-off — language is now a translator-key-gated feature.
2. **`<TranslatedText>` first-paint flicker** on first shopper visit per language (~200-500ms English → translated). Acceptable.
3. **Plurals and interpolation** lose i18next's smart handling. Affected strings were rewritten manually.
4. **Reverse migration is expensive.** Once System A files are deleted, restoring requires manual reconstruction. The `sites.content_language` column was kept to make this slightly less painful.

---

## Status log

| Timestamp | Phase | Note |
|-----------|-------|------|
| Apr 24, 2026 | 1 | Doc + session plan created. Migration starting. |
| Apr 24, 2026 | 2-7 | All migration phases complete. Both SPAs build clean. i18next packages removed. |
| Apr 24, 2026 | 8 | Builds verified, workflows restarted, landing/login/signup smoke-tested. Handoff to next agent for remaining smoke tests + doc updates + architect review. |
| Apr 24, 2026 | 8 | Migration complete. All builds clean. Source-level smoke checks pass (zero `useTranslation`, zero stray `t()`, zero corruption-pattern matches, no `i18n` route in backend, no i18next packages, all System A files gone). Auth-gated UIs (`/dashboard`, `/wizard`, storefront admin) verified via static analysis only — no live login available in this env. `replit.md` updated to describe System B-only architecture. |
| Apr 24, 2026 | 8 | Architect review found and we fixed: `i18n.t()` calls in App.jsx error boundary → literal English; `i18n.language` in TermsPage/PrivacyPolicyPage → `'en-IN'` literal; wrong cache table names in `replit.md` → corrected to `translation_cache` + `site_translator_usage`; corrupted `<img alt="<TranslatedText" text="Google" />` in LoginPage/SignupPage → plain `alt="Google"`; dead `.oa-i18n-*` CSS block in `owner-admin.css` (lines 335-488) removed and orphan `@media` opener restored. Both SPAs rebuild clean with no parse warnings. Architect signed off. |

---

## Apr 24, 2026 — Partial restore of System A (landing-only)

After the full removal documented above, the user requested a partial walk-back: restore System A **only** for the public landing page surfaces (Navbar with `LanguageSwitcher`, `LandingPage`, `LandingPricing`, `PlanSelector`, `ContactForm`) and for the owner Translations admin tab (`I18nAdminPanel`). All other pages stay English-only as removed above.

### Restored from commit `b2645a20` via `git show`
- `frontend/src/shared/i18n/` — all 16 EN namespace JSONs + `init.js` + `index.js` + `LanguageSwitcher.jsx`
- `frontend/src/platform/src/components/I18nAdminPanel.jsx`
- `backend/workers/platform/i18n-worker.js`
- The 6 component files listed above (re-translated versions)
- `frontend/src/platform/src/main.jsx` (calls `initI18n()`)

### Re-wired
- `backend/workers/index.js`: added `import { handleI18nPublic } from './platform/i18n-worker.js'` and `case 'i18n': return handleI18nPublic(...)`
- `backend/workers/platform/admin-worker.js`: re-added the `case 'i18n':` sub-route for `handleI18nAdmin`
- `frontend/src/platform/src/pages/OwnerAdminPage.jsx`: imported `I18nAdminPanel` and added a Translations tab button + `{activeTab === 'i18n' && <I18nAdminPanel />}` mount
- `frontend/src/platform/package.json`: re-added `i18next ^23.16.8`, `react-i18next ^14.1.3`, `i18next-browser-languagedetector ^8.2.1`

### Critical bundling fix
The naive restore put `i18next` back in the **root** `package.json` AND in `frontend/src/platform/package.json`, producing two physical copies in `node_modules`. Vite resolved `init.js`'s `import 'i18next'` to one copy and `react-i18next`'s internal `import 'i18next'` to the other, so `initReactI18next` was registered on instance A while `useTranslation()` read instance B and returned raw keys (`heroBadge` instead of "Launch Your E-Commerce Store…"). Fix:
1. Removed `i18next`, `react-i18next`, `i18next-browser-languagedetector` from the **root** `package.json` (the root Express server doesn't use them).
2. Deleted `node_modules/i18next`, `node_modules/react-i18next`, `node_modules/i18next-browser-languagedetector` at the root.
3. Added these three to `dedupe` and to `alias` in `frontend/src/platform/vite.config.js` so any future stray duplicate is forced to resolve to the platform-local copy.

### Untouched (do not "fix")
- Storefront SPA (System B with `<TranslatedText>` + `translate-worker.js`) — fully intact, zero `i18next` packages.
- `ShopperLanguageSection`, `SettingsSection.jsx`, `SiteCreationWizard.jsx` — all language UI on these stays removed/inlined.
- Auth pages, legal pages, dashboard, owner-other-tabs, about page, email templates — all hard-coded English.
- Migrations 0020 & 0021 — no schema changes in this restore.

### Scope-leak fix (also Apr 24, 2026)
The first cut of the partial restore translated `Navbar.jsx` and `PlanSelector.jsx` directly. Architect review caught that those two components are reused outside the landing surface:
- `Navbar.jsx` is rendered by `AboutPage`, `TermsPage`, `PrivacyPolicyPage`, `RefundPolicyPage`, `ShippingPolicyPage` — all of which must stay English-only.
- `PlanSelector.jsx` is rendered by `DashboardPage` — also must stay English-only.

Fix (no regex rewriters, just file copies + import swaps):
- Created `frontend/src/platform/src/components/LegalNavbar.jsx` from the post-migration English-only version (commit `3278998c`) and pointed all 5 legal/about pages at it. The translated `Navbar.jsx` is now reachable only through `LandingPage.jsx`.
- Created `frontend/src/platform/src/components/DashboardPlanSelector.jsx` the same way and pointed `DashboardPage.jsx` at it.
- A second architect pass confirmed the translated `PlanSelector.jsx` was actually never imported anywhere (the project goal listed it as a landing-page component, but pre-migration `b2645a20` shows it was only ever mounted on the dashboard, and the landing page renders pricing inline in `LandingPricing.jsx`). The translated `PlanSelector.jsx` was therefore deleted as dead code; only `DashboardPlanSelector.jsx` remains.

Do not collapse `Navbar` + `LegalNavbar` back into a single shared component — the duplication is what keeps i18next out of the legal/about chrome. Final useTranslation surface: 5 files (`LandingPage.jsx`, `Navbar.jsx`, `LandingPricing.jsx`, `ContactForm.jsx`, `I18nAdminPanel.jsx`).

### I18nAdminPanel converted to English-only (Apr 24, 2026, follow-up)
The user reviewed the running app and pointed out that the owner admin's Translations tab (`I18nAdminPanel.jsx`) was still calling `useTranslation()` for its own UI labels. They wanted the panel chrome itself to be English-only — only the *target* translation catalogs that the panel manages should still go through System A.

Conversion (no regex structural rewrite — every replacement was a deterministic catalog lookup):
- A small Node script (`/tmp/convert_i18n_admin.mjs`, run once) loaded `owner.json` + `common.json`, walked every `t('key')` / `t('key', { interp })` call in the file, looked up the English value by key path, and substituted it inline (double-quoted for plain strings, template literals with `${...}` for interpolations). 126 calls converted automatically (101 simple + 25 with interpolation). 3 calls used i18next plural variants (`*_one` / `*_other`) and were patched manually with a ternary on `count === 1`. The `useTranslation` import and `const { t } = useTranslation(...)` lines were stripped.
- The backend behavior of the panel is unchanged: it still calls the same `/api/admin/i18n/*` routes to regenerate, refresh, purge, and per-key-edit non-English locales served by `i18n-worker.js`.
- Final System A `useTranslation` surface in the platform SPA is now **4** files: `LandingPage.jsx`, `Navbar.jsx`, `LandingPricing.jsx`, `ContactForm.jsx`.

### Source catalog trimmed to 4 namespaces (Apr 24, 2026, follow-up #2)
Deleted 11 unused namespace JSONs from `frontend/src/shared/i18n/locales/en/`: `owner.json`, `auth.json`, `admin.json`, `dashboard.json`, `products.json`, `customers.json`, `wizard.json`, `legal.json`, `about.json`, `plans.json`, `storefront.json`. None of them were referenced by any active `useTranslation()` call. Updated `frontend/src/shared/i18n/locales/en/index.js` (barrel) and `backend/workers/platform/i18n-worker.js` (EN_CATALOG) to drop the imports.

One non-i18n consumer needed care: `getLocalizedWizardSeed()` in `i18n-worker.js` was reading `seoTitleTemplates`, `seoDescriptionTemplates`, and `defaultCategories` from `EN_WIZARD` (the wizard.json import). Those three sub-trees aren't UI strings — they're English defaults the site-creation wizard pre-fills into the merchant's SEO/category fields. They were extracted into `backend/workers/platform/wizard-seed-data.js` (a plain JS module, not part of the i18n catalog) so the wizard worker keeps functioning. Localization of these defaults was effectively English-only already (translated overrides existed in non-EN catalogs but nothing in the merchant flow encouraged shop owners to ship in a non-EN content language), so removing the per-locale fallback path is a no-op for the merchant experience.

Measurable wins: platform SPA bundle dropped from 754 KB → 557 KB, and the per-locale `/api/i18n/locale/:lang` response dropped from ~210 KB → ~5.3 KB (40× smaller). The next non-English visitor will trigger a one-time recache because the EN_CATALOG hash changed — that's expected and self-healing.

## Apr 24, 2026 — AboutPage promoted to System A; landing footer address de-translated

- `frontend/src/platform/src/pages/AboutPage.jsx` switched from `LegalNavbar` (English) to the translated `Navbar` (with `LanguageSwitcher`). All hardcoded English replaced with `t('about.*')` calls. Bullet/numbered list items moved to per-item keys under `about.whatItems.*`, `about.howItems.*`, `about.valuesItems.*` (label + desc) — never one HTML blob.
- `frontend/src/shared/i18n/locales/en/landing.json`: removed flat `aboutTitle/aboutTagline/aboutWhoTitle/aboutWhatTitle/aboutMissionTitle/aboutHowTitle/aboutValuesTitle/aboutContactTitle` keys (unused leftovers); removed `addressLine`; added nested `about.*` group with full body content.
- Legal pages (Terms / Privacy / Refund / Shipping) untouched — they keep `LegalNavbar` and stay English-only.
- Landing footer fix: `{t('addressLine')}` replaced with raw `Karwar, Karnataka, India — 581400`. The phone (`+91 9901954610`) and email (`SUPPORT_EMAIL`) were already raw, so the contact column is now uniformly English regardless of selected language. The About page footer follows the same convention.
- System A surface count: 4 → 5 files (`LandingPage`, `Navbar`, `LandingPricing`, `ContactForm`, `AboutPage`).

## Apr 24, 2026 (later) — footer page-link names made raw English on Landing + About

To eliminate cross-page footer inconsistency (link names translated on Landing/About but English on Terms/Privacy/Refund/Shipping because those pages are intentionally English-only), the five footer page-link names are now raw English literals on every page:
- `About Us`, `Terms & Conditions`, `Privacy Policy`, `Refund & Cancellation Policy`, `Shipping & Delivery Policy`.

Removed from `landing.json`: `footerAbout`, `footerTerms`, `footerPrivacy`, `footerRefund`, `footerShipping`.
Kept translated: `footerTagline`, `footerCompany`, `footerContact`, `rightsReserved`, `logoAlt`.
