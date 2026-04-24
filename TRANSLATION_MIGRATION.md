# Translation Architecture Migration

**Decision date:** April 24, 2026
**Goal:** Remove System A (static JSON-namespace translation via i18next/react-i18next) entirely. Make System B (per-merchant on-demand Microsoft Translator via `<TranslatedText>`) the single source of all storefront translation. Admin / dashboard / wizard / owner / auth / legal surfaces become English-only.

---

## STATUS AS OF HANDOFF (April 24, 2026)

**Overall progress: ~95% complete.** Both SPAs build cleanly. Login/landing/signup screens render correctly. The remaining work is smoke-testing a few more surfaces and updating two doc files. **READ THE "HANDOFF NOTES FOR NEXT AGENT" SECTION BELOW BEFORE TOUCHING ANYTHING.**

| Phase | Description | Status |
|-------|-------------|--------|
| T001 | Documentation + inventory | ✅ Complete |
| T002 | Migrate storefront chrome to System B | ✅ Complete |
| T003 | Strip translation from admin / dashboard / wizard / owner / auth / legal | ✅ Complete |
| T004 | Wizard simplification (remove language step) | ✅ Complete |
| T005 | Migrate ShopperTranslationContext + storefront LanguageSwitcher off i18next | ✅ Complete |
| T006 | Delete System A files | ✅ Complete |
| T007 | Package cleanup (remove i18next/react-i18next/i18next-browser-languagedetector) | ✅ Complete |
| T008 | Build + smoke test both SPAs + restart workflows | 🟡 IN PROGRESS — see below |

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

## REMAINING WORK FOR T008

These are the only steps left. Do them in order. **Total estimated time: 15-20 minutes.**

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
