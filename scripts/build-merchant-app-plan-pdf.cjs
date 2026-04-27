#!/usr/bin/env node
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'merchant-app-implementation-plan.pdf');

const COLORS = {
  ink: '#0f172a',
  muted: '#475569',
  rule: '#cbd5e1',
  accent: '#1d4ed8',
  bgSoft: '#f1f5f9',
};

const FONT = {
  body: 'Helvetica',
  bodyBold: 'Helvetica-Bold',
  bodyItalic: 'Helvetica-Oblique',
  mono: 'Courier',
  monoBold: 'Courier-Bold',
};

const PAGE = {
  size: 'A4',
  margins: { top: 64, bottom: 72, left: 64, right: 64 },
};

function makeDoc() {
  return new PDFDocument({
    size: PAGE.size,
    margins: PAGE.margins,
    bufferPages: true,
    info: {
      Title: 'Flomerce — Merchant App Implementation Plan',
      Author: 'Flomerce Engineering',
      Subject: 'PWA + Per-merchant Android CLI build plan',
      Keywords: 'flomerce, pwa, android, capacitor, multi-tenant, ecommerce',
    },
  });
}

const SECTIONS = [
  {
    id: 's1',
    title: '1. Executive Summary',
    blocks: [
      { type: 'p', text: 'Flomerce is a multi-tenant ecommerce SaaS where every merchant gets their own storefront on a subdomain (or custom domain). Today shoppers reach those storefronts through a normal mobile browser. This plan describes how we give each merchant a real "app" presence on their shoppers\' phones, in two complementary layers that share the same per-merchant branding pipeline.' },
      { type: 'h3', text: 'Layer 1 — Progressive Web App per merchant (primary)' },
      { type: 'p', text: 'Every merchant subdomain (and custom domain) becomes an installable Progressive Web App. The shopper sees a branded "Install app" prompt; once installed, the home-screen icon, app name, splash colour and standalone window all reflect the merchant\'s identity, not Flomerce\'s. Push notifications continue to work, and the storefront is browsable offline for previously visited pages. This works on Android, iOS and desktop with no app store involvement.' },
      { type: 'h3', text: 'Layer 2 — Per-merchant Android build CLI (Play Store)' },
      { type: 'p', text: 'For merchants who want a real Play Store listing, we ship an operator-run CLI: pnpm mobile:build --merchant={slug} produces a signed Android App Bundle (.aab), a debug APK, the merchant\'s signing keystore, and a README the merchant can hand to whoever uploads to Play Console. The Android app is a thin Capacitor shell that loads the merchant\'s storefront over HTTPS — no JavaScript is bundled — so updates ship through the normal web pipeline rather than through Play review.' },
      { type: 'h3', text: 'What this gets us' },
      { type: 'ul', items: [
        'Every merchant — including ones who never ask for an app — silently gains a credible installable PWA on day one.',
        'Merchants who want a Play Store listing get one without paying an agency, and without waiting for a per-store native build.',
        'iOS shoppers are covered by the PWA today; native iOS is deliberately deferred (see §3 for the App Store policy reasoning).',
        'The same per-merchant branding pipeline (logo, colour, name) drives both layers, so there is one source of truth.',
      ]},
      { type: 'p', text: 'The rest of this document recaps the Flomerce architecture this lands on, lays out the PWA and Android plans in detail, and lists the operational walkthrough, scope boundaries, files affected and open decisions that must be answered before implementation begins.' },
    ],
  },
  {
    id: 's2',
    title: '2. Current Flomerce Architecture Recap',
    blocks: [
      { type: 'p', text: 'This section captures the parts of the existing platform that the merchant-app work depends on or has to extend. Nothing here is being changed by this plan — it is the baseline.' },
      { type: 'h3', text: 'Edge runtime and storage' },
      { type: 'ul', items: [
        'All backend logic runs in Cloudflare Workers. There is one root Worker (backend/workers/index.js) that dispatches to subsystem workers (storefront, admin, notifications, shipping, etc.).',
        'Persistence lives in Cloudflare D1 (SQLite). The schema is sharded: a control-plane database holds the site/merchant directory, and three sharded site databases (SHARD_1, SHARD_2, SHARD_3) hold per-merchant tenant data. The shard for a given site is recorded on the site row.',
        'Binary assets (logos, product images, generated icons) live in a single R2 bucket (STORAGE), keyed by site.',
        'The frontend (storefront SPA + platform admin SPA) is built with Vite and served from Cloudflare Pages. The same Pages deployment serves all merchants; per-merchant branding happens at render time, driven by host header and site config.',
      ]},
      { type: 'h3', text: 'Multi-tenant routing' },
      { type: 'ul', items: [
        'Every merchant has a primary subdomain ({slug}.flomerce.com) and may attach one or more custom domains. The site router (backend/workers/storefront/site-router.js) resolves the host header to a site_id and loads that site\'s public configuration before serving HTML or API responses.',
        'The storefront HTML shell is the same for every merchant. Per-merchant strings (store name, theme colour, favicon) are injected at the edge before the response is returned to the shopper.',
        'API calls from the storefront SPA are scoped to the resolved site automatically; the SPA never has to know its own siteId.',
      ]},
      { type: 'h3', text: 'Shopper authentication' },
      { type: 'ul', items: [
        'Each store has its own customer table (site_customers). A shopper account on Store A is independent of an account on Store B — passwords, sessions and order history do not cross stores.',
        'Sessions are tracked by a session_id cookie and an optional bearer token (used by the SPA for authenticated calls).',
        'Google sign-in is supported and recently gained a guest-cart-merge step so a shopper who signs in mid-session keeps the cart they built while anonymous (this matters for the abandoned-cart pipeline and for any future native push targeting).',
      ]},
      { type: 'h3', text: 'Push notifications today' },
      { type: 'ul', items: [
        'A first-party Web Push pipeline already exists. The storefront registers a service worker (frontend/src/storefront/public/sw.js) which subscribes to push and forwards events to a notifications worker on the backend.',
        'VAPID keys are configured via env vars (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT). Subscriptions are persisted per (site, customer) so order/abandoned-cart events can target the right device.',
        'The current sw.js is intentionally minimal — it handles push and notification clicks, and nothing else. There is no offline cache yet and no app-shell precache. The PWA plan in §4 extends this file rather than replacing it.',
      ]},
      { type: 'h3', text: 'Implications for the app plan' },
      { type: 'p', text: 'Because branding, routing and push are already per-merchant at the edge, the PWA layer is mostly about exposing what already exists in the right shape (a manifest, the right meta tags, a richer service worker). The Android CLI layer is mostly about wrapping the existing storefront URL in a Capacitor shell and bridging FCM into the existing notifications worker — there is no parallel mobile backend to build.' },
    ],
  },
  {
    id: 's3',
    title: '3. Approach Decision and Rationale',
    blocks: [
      { type: 'p', text: 'Several reasonable architectures were on the table. This section records why we landed on "PWA-everywhere + operator-run Android CLI" rather than the alternatives, so a future implementer does not relitigate decisions that were already made.' },
      { type: 'h3', text: 'Why PWA per merchant is the foundation' },
      { type: 'ul', items: [
        'Zero per-merchant operational cost. A new merchant signs up, points DNS, and their storefront is already an installable PWA — no build step, no human in the loop, no Play Console.',
        'Covers iOS reasonably well today. iOS Safari supports PWA install (Add to Home Screen), home-screen icon, splash, standalone display and Web Push (since iOS 16.4 for installed PWAs). It is not perfect, but it is a credible mobile-app experience for the vast majority of iOS shoppers without needing an App Store presence.',
        'Updates are instantaneous. Because the PWA loads from the live storefront, there is no review queue and no per-version rollout.',
        'Reuses existing infrastructure. The branding pipeline, the auth model and the push subscription flow all already exist; we are mostly exposing them in PWA-shaped form.',
      ]},
      { type: 'h3', text: 'Why Android-only via an operator-run CLI (for now)' },
      { type: 'ul', items: [
        'Play Store has an explicit, well-documented WebView wrapper allowance for ecommerce. Apps that load a real ecommerce site over HTTPS, with deep links, are routinely accepted. This makes a CLI-driven thin shell low-risk on Android.',
        'The App Store does not. Apple App Store guideline 4.2.6 explicitly targets "spam apps" produced from a template or app-generation service and reserves the right to reject them en masse, particularly when many apps from the same publisher look near-identical. A per-merchant single-store iOS app, built and submitted under a Flomerce-controlled developer account, is exactly the pattern 4.2.6 was written to reject. We choose to defer iOS native rather than build a pipeline that could be torpedoed by a single Apple policy review.',
        'Operator-run rather than self-serve removes the support burden of teaching merchants the CLI, managing keystores at scale, and triaging Gradle failures from non-technical users. We can move that to a merchant dashboard later, once we know the CLI is stable.',
        'No Play Developer API auto-submission in v1. Auto-submission requires either a centralized Flomerce developer account (which re-introduces the 4.2.6-style "spam apps" risk on Google\'s side, less aggressively enforced but still real) or per-merchant API credentials on Play Console. Manual upload by the merchant under their own developer account avoids both.',
      ]},
      { type: 'h3', text: 'Trade-offs we accepted' },
      { type: 'ul', items: [
        'Signing-key responsibility sits with the operator (us) initially. The CLI generates and stores per-merchant keystores on disk. If a keystore is lost, that merchant can never publish updates to their existing Play listing — they would have to re-publish under a new applicationId. Backup policy for keystores is an open question (see §9).',
        'Merchants who want iOS now will be told "not yet, but the PWA works on iOS." Some will be unhappy. The alternative is a much riskier and more expensive iOS pipeline that may be killed by Apple anyway.',
        'No merchant-facing build dashboard in v1. Triggering a build is an operator task. This is acceptable while merchant counts are small; it becomes a bottleneck around the low hundreds of merchants and will need to be revisited then.',
        'Capacitor was chosen over React Native, native Android, and TWA. Capacitor lets the Android app load the live storefront URL without bundling a JS build, which is exactly what we want for instant updates. React Native would require maintaining a parallel native UI; pure native would be even more work; Trusted Web Activities (TWA) are tempting but lock us out of the FCM bridge and some store-listing flexibility we want.',
      ]},
    ],
  },
  {
    id: 's4',
    title: '4. PWA Layer — Detailed Plan',
    blocks: [
      { type: 'p', text: 'The goal of this layer is that every merchant subdomain is a credible installable PWA, branded as the merchant rather than as Flomerce, with offline browsing and the existing push notifications.' },
      { type: 'h3', text: '4.1 Dynamic per-merchant manifest endpoint' },
      { type: 'ul', items: [
        'New route: GET /manifest.webmanifest, served by the storefront site router.',
        'Handler resolves the merchant from the host header (same logic the router already uses for HTML branding injection) and returns a JSON manifest with: name, short_name, theme_color, background_color, start_url ("/"), scope ("/"), display ("standalone"), orientation ("portrait"), and an icons array pointing at the merchant\'s logo at standard PWA sizes (192, 512, plus a maskable 512).',
        'Cache-Control: short-lived public cache (e.g. 5 minutes) — the manifest changes when the merchant updates their branding.',
        'For sites with no logo uploaded yet, fall back to a default Flomerce icon so the manifest is always valid.',
      ]},
      { type: 'h3', text: '4.2 Edge-side meta-tag injection' },
      { type: 'p', text: 'The storefront HTML shell is shared. For PWA installability and iOS parity, the following tags must be present in the served HTML and must reflect the resolved merchant:' },
      { type: 'ul', items: [
        '<link rel="manifest" href="/manifest.webmanifest"> — links to the dynamic endpoint above.',
        '<meta name="theme-color" content="{merchant brand colour}"> — drives the browser chrome colour and the splash background on Android.',
        '<meta name="apple-mobile-web-app-capable" content="yes">',
        '<meta name="apple-mobile-web-app-status-bar-style" content="default"> (or "black-translucent" depending on whether the storefront has its own header).',
        '<meta name="apple-mobile-web-app-title" content="{merchant short name}"> — controls the iOS home-screen label.',
        '<link rel="apple-touch-icon" sizes="180x180" href="/pwa-icon-180.png"> — iOS does not honour the manifest icons array; it requires this tag.',
      ]},
      { type: 'p', text: 'These tags are injected by the existing edge HTML rewriter on the storefront site router rather than by client-side patching, so they are present on the very first paint and visible to the install prompt logic.' },
      { type: 'h3', text: '4.3 Icon generation pipeline' },
      { type: 'ul', items: [
        'New backend utility (e.g. backend/utils/pwa-icons.js) that takes a merchant logo from R2 and produces, on demand, the four required icon variants: 192x192, 512x512, maskable 512x512 (with the safe-zone padding the W3C maskable spec calls for), and apple-touch-icon 180x180.',
        'Generated icons are cached in R2 under a deterministic key (e.g. sites/{siteId}/pwa/icon-{size}.png) so subsequent requests are pure object reads, not regenerations.',
        'When the merchant uploads a new logo, the cached icons for that site are invalidated.',
        'If the merchant has no logo, a default Flomerce icon is served at the same URL — the manifest never points at a 404.',
        'Icons are served by the storefront site router under stable URLs (/pwa-icon-{size}.png) so the manifest and the apple-touch-icon link are simple static paths.',
      ]},
      { type: 'h3', text: '4.4 Service worker upgrade — offline shell' },
      { type: 'p', text: 'The existing sw.js handles push only. It is extended (not replaced) with three new responsibilities, taking care to keep the push handlers intact and to bump the SW version so old caches are evicted on activation:' },
      { type: 'ul', items: [
        'Install-time precache of the app shell: index.html, the main CSS bundle, the main JS bundle, the default font files, and the default icons. This is the bundle the storefront needs to render anything at all.',
        'Runtime stale-while-revalidate cache for product images, category images, and the small set of safe-to-cache GET API endpoints (e.g. site config, public catalog). Mutating endpoints (cart, checkout, auth) are network-only and never cached.',
        'A branded offline fallback page (offline.html, served from the precache) that uses the merchant\'s name and brand colour. Reached when the network is fully unavailable and the requested route is not in cache.',
        'Cache name versioning so that on activation, any cache whose name does not match the current version is deleted. This prevents stale shells from sticking around after a deploy.',
      ]},
      { type: 'h3', text: '4.5 Install-prompt UX' },
      { type: 'ul', items: [
        'On Android Chrome, listen for the beforeinstallprompt event, stash the prompt, and show a small, dismissible "Install {merchant name}" banner near the bottom of the storefront.',
        'On iOS Safari (no install event), detect "iOS && standalone === false" and show a one-time hint: "Tap the Share button, then Add to Home Screen." Only ever shown once per device per dismissal.',
        'Both banners persist their dismissed state in localStorage so they do not nag the shopper.',
        'Banner styling reuses the merchant\'s brand colour so it does not look like a third-party overlay.',
      ]},
      { type: 'h3', text: '4.6 Success criteria for the PWA layer' },
      { type: 'ul', items: [
        'Visiting any merchant subdomain in mobile Chrome shows the install affordance within a few seconds.',
        'Once installed, the home-screen icon is the merchant\'s logo, the app name is the merchant\'s short_name, and launching it opens in standalone mode (no browser chrome).',
        'On iOS, the same is true via Add to Home Screen, with the merchant\'s apple-touch-icon and apple-mobile-web-app-title.',
        'Opening the installed PWA with no internet shows the branded offline page; previously visited product pages and images render from cache.',
        'Existing push notifications continue to fire and open the right product/order page on tap.',
        'A Lighthouse PWA audit on a sample merchant subdomain reports the "Installable" criterion as passing, with no manifest or service worker warnings.',
      ]},
    ],
  },
  {
    id: 's5',
    title: '5. Android CLI Layer — Detailed Plan',
    blocks: [
      { type: 'p', text: 'This layer produces a real Play-Store-uploadable Android App Bundle for any merchant who asks for one, using a single CLI command. It does not auto-submit to Play and it does not include any iOS work.' },
      { type: 'h3', text: '5.1 Capacitor workspace scaffold' },
      { type: 'ul', items: [
        'A new top-level workspace at mobile/ in the repo. It is a Capacitor project configured for Android only (the iOS platform is intentionally not added).',
        'Capacitor is configured with server.url pointing at the merchant\'s domain at runtime — the app loads the live storefront over HTTPS rather than bundling a web build. This is the key reason updates ship through the normal web pipeline.',
        'Android App Links (assetlinks.json) are wired so that tapping a link like https://{merchant}/product/abc on a device with the app installed opens the product page inside the app, not in the browser.',
        'A small native Android module bridges Capacitor Push Notifications (FCM) into the existing notifications worker (see §5.4).',
      ]},
      { type: 'h3', text: '5.2 Per-merchant config schema' },
      { type: 'p', text: 'A per-merchant build is fully described by one JSON file at mobile/merchants/{slug}.json. The schema is small and stable so future automation can write it without humans:' },
      { type: 'ul', items: [
        'slug — must match the file name; the merchant\'s Flomerce slug.',
        'displayName — the human app name shown on the home screen and in Play listings.',
        'applicationId — the Java package id, e.g. com.flomerce.acme. Immutable after first publish.',
        'targetUrl — the storefront the app should load (subdomain or custom domain), with HTTPS.',
        'brandColor — hex, used for the splash screen background and the Android status bar.',
        'logoPath — path to the merchant\'s source logo (PNG with transparency preferred), relative to mobile/merchants/{slug}/.',
        'fcm — { googleServicesJsonPath } pointing at the merchant\'s google-services.json for FCM credentials.',
        'versionName / versionCode — bumped per build; the CLI auto-increments versionCode if not set.',
      ]},
      { type: 'h3', text: '5.3 The pnpm mobile:build --merchant={slug} flow' },
      { type: 'p', text: 'Running the CLI for a given merchant performs these steps in order, failing fast on any error:' },
      { type: 'ul', items: [
        'Validate the merchant config file (schema, mandatory fields, that targetUrl resolves to a 200 over HTTPS, that the logo file exists).',
        'Regenerate Android icons (all densities — mdpi through xxxhdpi — plus the adaptive-icon foreground/background pair) and the splash screen from the merchant\'s logo and brand colour.',
        'Write Capacitor config with displayName, applicationId and server.url for this merchant. Drop the FCM google-services.json into the right Android module folder.',
        'Generate or reuse a per-merchant signing keystore. If a new keystore is generated, the password is written to a sibling secrets file (gitignored) and the SHA-1 fingerprint is captured for the README.',
        'Run npx cap sync android to push web/Capacitor config into the native project.',
        'Build a signed release Android App Bundle ({slug}-release.aab) and an unsigned debug APK ({slug}-debug.apk) using Gradle.',
        'Write a README.txt next to the artifacts containing: what to upload to Play Console, the app\'s applicationId, the keystore SHA-1 (the merchant will need this for App Links assetlinks.json verification), the keystore-safety warning, and the version bumped.',
      ]},
      { type: 'h3', text: '5.4 Output artifacts' },
      { type: 'p', text: 'After a successful build, mobile/dist/{slug}/ contains:' },
      { type: 'ul', items: [
        '{slug}-release.aab — the signed App Bundle for Play Console upload.',
        '{slug}-debug.apk — a debug APK the operator can sideload for testing.',
        '{slug}.keystore + {slug}.keystore.password — the per-merchant signing key (gitignored).',
        'README.txt — operator-and-merchant-facing instructions, generated freshly each build.',
      ]},
      { type: 'h3', text: '5.5 FCM push bridge' },
      { type: 'ul', items: [
        'On app launch, the Capacitor Push Notifications plugin requests notification permission and obtains an FCM device token.',
        'The token is POSTed to the existing notifications worker, tagged with siteId and the logged-in customer id (if any), so order/abandoned-cart events can target the device.',
        'Inbound FCM payloads use the same shape the web service worker already accepts (title, body, deep link), so the merchant\'s notification logic does not need a parallel branch for native.',
        'When the shopper taps a notification, the app opens the deep link via the App Links handler, landing them on the right product/order page in the embedded storefront.',
      ]},
      { type: 'h3', text: '5.6 App Links / deep linking' },
      { type: 'ul', items: [
        'The merchant\'s domain serves a /.well-known/assetlinks.json that pins the app\'s package name and signing-key SHA-256 fingerprint. The icon-generation pipeline already serves files from the storefront router, so this is one more endpoint on the same router — no new infrastructure.',
        'The Android manifest declares intent filters for the merchant\'s domain so HTTPS links open in the app once installed.',
        'For custom-domain merchants, the assetlinks.json must be served from the custom domain too. The site router resolves the host header before serving assetlinks, so this falls out of the existing routing logic.',
      ]},
      { type: 'h3', text: '5.7 Success criteria for the Android CLI layer' },
      { type: 'ul', items: [
        'pnpm mobile:build --merchant={slug} on a clean checkout produces all four artifacts in under a few minutes, with no manual prompts.',
        'The debug APK installs on an Android emulator or device, opens to the merchant\'s storefront over HTTPS, and the storefront looks identical to the mobile-browser experience.',
        'Logging in inside the app works (cookies and the bearer token round-trip correctly through the WebView).',
        'Tapping a deep link like https://{merchant}/product/abc on the device opens the product page inside the app rather than in Chrome.',
        'A test push fired from the notifications worker arrives on the device and, when tapped, opens the correct deep link inside the app.',
        'The .aab uploads to Play Console without a signing or manifest error and passes Play\'s pre-launch checks for at least one sample merchant.',
      ]},
    ],
  },
  {
    id: 's6',
    title: '6. End-to-end Operational Walkthrough',
    blocks: [
      { type: 'h3', text: '6.1 What the merchant does' },
      { type: 'ul', items: [
        'For the PWA layer: nothing. They sign up for Flomerce, upload their logo, and their storefront is already an installable PWA on every shopper device.',
        'For the Android app: they create their own Google Play Developer account ($25 one-time fee), confirm the app name and applicationId they want, and provide a google-services.json from a Firebase project they own (so push notifications are signed by their FCM credentials, not ours).',
        'Once the operator hands them the .aab and README, they upload to Play Console, fill in the listing copy, screenshots and privacy-policy URL themselves, and submit for review.',
      ]},
      { type: 'h3', text: '6.2 What the operator does' },
      { type: 'ul', items: [
        'Drops the merchant\'s google-services.json into mobile/merchants/{slug}/.',
        'Writes the per-merchant config file (mobile/merchants/{slug}.json) — five or six fields.',
        'Runs pnpm mobile:build --merchant={slug}.',
        'Sends the merchant the resulting .aab and README via whatever channel is normal for that merchant.',
        'Files the keystore safely in the operator\'s backup location (see §9 — backup policy is an open question).',
      ]},
      { type: 'h3', text: '6.3 What the shopper experiences' },
      { type: 'ul', items: [
        'PWA path: visits the storefront on their phone, sees a small "Install" banner, accepts, and the merchant\'s logo appears on their home screen. Launching it opens a standalone window of the storefront. Push notifications work as before.',
        'Native Android path: searches for the merchant on Play Store, installs, opens to the merchant\'s storefront. Push notifications arrive via FCM. Tapping a link the merchant shares (in WhatsApp, SMS, etc.) opens directly inside the app.',
        'iOS path: same as PWA path, with the Add-to-Home-Screen flow instead of an install prompt.',
      ]},
      { type: 'h3', text: '6.4 Per-scenario effort' },
      { type: 'table', columns: [
        { header: 'Scenario', width: 240 },
        { header: 'Operator effort', width: 110 },
        { header: 'Merchant effort', width: 110 },
      ], rows: [
        ['New merchant — PWA only',                 'None',                          'None'],
        ['New merchant — Android app',              '~15 min CLI run + handoff',     'Play Console setup + upload'],
        ['Logo update (PWA)',                       'None — auto via icon pipeline', 'Re-upload logo in admin'],
        ['Logo update (Android)',                   '~15 min — rerun CLI, send new .aab', 'Upload new .aab to Play Console'],
        ['Custom domain switch (PWA)',              'None — manifest is dynamic',    'Configure DNS + add domain in admin'],
        ['Custom domain switch (Android)',          '~15 min — rebuild with new targetUrl + republish', 'Upload new .aab to Play Console'],
        ['Scaling to 100 merchant Android apps',    'Bottleneck: this CLI is operator-run. Needs a small queue / dashboard before this scale.', 'Each merchant runs their own Play Console workflow.'],
      ]},
      { type: 'p', text: 'The takeaway is that PWA onboarding has effectively zero per-merchant cost, while Android onboarding is a fixed ~15-minute operator task plus the merchant\'s own Play Console workflow. The only bad scaling cliff is the operator-run CLI itself, which is by design (see §3) and is the first thing to revisit once we are actively serving Android apps to a few dozen merchants.' },
    ],
  },
  {
    id: 's7',
    title: '7. Out of Scope / Future Phases',
    blocks: [
      { type: 'p', text: 'These are deliberately deferred. They are recorded here so that a future implementer knows what was considered and rejected for v1, and what the natural follow-up phases look like.' },
      { type: 'ul', items: [
        'iOS native app. Reasoning is in §3 — Apple guideline 4.2.6. Revisited only if Apple\'s policy stance softens, or if a single high-value merchant is willing to fund and own a dedicated iOS submission under their own developer account.',
        'Auto-submission to Google Play via the Play Developer API. Possible once we have a credentials story we are happy with (per-merchant API tokens are operationally heavy; a centralized Flomerce account re-introduces spam-app policy risk on Google\'s side).',
        'Merchant-facing dashboard for triggering builds. The CLI is operator-run in v1. A self-serve dashboard becomes worthwhile once Android demand is steady and the CLI has stabilised.',
        'Signing-key vault / KMS. v1 stores keystores on disk in a gitignored folder. Encryption at rest, escrow with the merchant, or a managed KMS are all reasonable v2 directions; the choice depends on the backup policy decided in §9.',
        'Listing-asset auto-generation (screenshots, store description, privacy policy URL). v1 leaves this to the merchant. v2 could generate Play-Console-ready screenshots from the storefront and a draft listing description from the merchant\'s store config.',
        'Background sync of cart and orders while offline. v1 only supports browse-while-offline (the SWR cache for catalog + product pages). True offline cart mutation is a much larger piece of work and is out of scope.',
        'A unified "Flomerce Marketplace" app that lists every merchant. Every Android app produced by this plan is single-merchant. A marketplace shell would be a separate product, not an evolution of this one.',
      ]},
    ],
  },
  {
    id: 's8',
    title: '8. Files That Will Be Touched',
    blocks: [
      { type: 'p', text: 'From the source plan. New files are marked NEW; existing files are extended in the way described in §4 and §5.' },
      { type: 'h3', text: 'Backend (Cloudflare Workers)' },
      { type: 'ul', items: [
        'backend/workers/site-router.js — add the dynamic /manifest.webmanifest route, the /pwa-icon-{size}.png routes, and the /.well-known/assetlinks.json route.',
        'backend/workers/notifications-worker.js — accept FCM device tokens (in addition to Web Push subscriptions) and dispatch via FCM when the recorded transport is native.',
        'backend/workers/customer-auth-worker.js — no functional change expected; verify cookie/bearer flows behave correctly inside an Android WebView.',
        'backend/workers/upload-worker.js — invalidate cached PWA icons in R2 when a new logo is uploaded.',
        'backend/utils/pwa-icons.js — NEW. Icon-generation utility (resize + maskable padding + cache in R2).',
      ]},
      { type: 'h3', text: 'Storefront frontend' },
      { type: 'ul', items: [
        'frontend/src/storefront/index.html — add the manifest link, theme-color, and apple-* meta tags (or, more likely, leave the HTML clean and have the edge rewriter inject these per merchant).',
        'frontend/src/storefront/public/sw.js — extend with install-time precache, runtime SWR cache for images and safe GETs, branded offline fallback, version-bumped cache cleanup. Push handlers preserved.',
        'frontend/src/storefront/public/offline.html — NEW. Branded offline fallback page rendered with merchant strings via the same edge injection used for the main shell.',
        'frontend/src/storefront/vite.config.js — ensure sw.js and offline.html are emitted to the storefront build output unmodified.',
        'frontend/src/storefront/package.json — possibly add a small workbox-style helper if the SW logic grows enough to warrant it; otherwise unchanged.',
      ]},
      { type: 'h3', text: 'Mobile workspace' },
      { type: 'ul', items: [
        'mobile/ — NEW workspace. Contains the Capacitor Android project, the per-merchant build CLI, and the per-merchant config and artifacts directories.',
        'mobile/merchants/{slug}.json — NEW per-merchant config files.',
        'mobile/merchants/{slug}/google-services.json — NEW per-merchant FCM credentials (gitignored).',
        'mobile/dist/{slug}/ — NEW build output directory (gitignored).',
      ]},
      { type: 'h3', text: 'Repo root and docs' },
      { type: 'ul', items: [
        'package.json — add the mobile:build script that delegates to the CLI in mobile/.',
        'docs/merchant-android-app.md — NEW. One-page operator-and-merchant guide covering CLI usage, handoff, and Play Console steps.',
        'DATABASE_ARCHITECTURE.md — minor note that notification subscriptions now have a "transport" column (web | fcm), if and when that schema change lands.',
      ]},
    ],
  },
  {
    id: 's9',
    title: '9. Open Questions / Decisions Needed Before Implementation',
    blocks: [
      { type: 'p', text: 'These must be answered before code is written. They are policy questions, not engineering questions — engineering can implement either side of each, but cannot pick a side.' },
      { type: 'h3', text: '9.1 FCM credential storage policy' },
      { type: 'p', text: 'Each Android app needs an FCM google-services.json. Two approaches:' },
      { type: 'ul', items: [
        'Per-merchant FCM project. Each merchant creates their own Firebase project and gives us the google-services.json. Push messages are signed under the merchant\'s own credentials. Pro: no shared blast-radius if a key leaks; merchant owns their analytics and their FCM quota. Con: more onboarding friction.',
        'Centralized Flomerce FCM project. We host all merchant push under one Firebase project, scoped by topic or by app. Pro: zero onboarding friction. Con: a single leaked key affects every merchant; quotas and analytics are shared; merchants who later want to take their app independent cannot easily migrate device tokens.',
      ]},
      { type: 'p', text: 'Decision needed: which model are we shipping in v1, and where does the credential file live in the repo / in our secrets store?' },
      { type: 'h3', text: '9.2 Keystore backup policy' },
      { type: 'p', text: 'A lost keystore = a permanently un-updatable Play listing. Options:' },
      { type: 'ul', items: [
        'Operator holds the only copy, on disk in a backed-up location. Simple, but a single backup failure ruins the merchant.',
        'Operator holds the working copy and emails an encrypted copy to the merchant on first build, with the password sent through a separate channel. The merchant becomes the disaster-recovery owner.',
        'Operator stores keystores in a managed KMS / vault from day one. Most robust, most operational overhead.',
      ]},
      { type: 'p', text: 'Decision needed: which of these is the v1 default, and is the merchant told about the policy in writing as part of onboarding?' },
      { type: 'h3', text: '9.3 Who owns merchant communication' },
      { type: 'p', text: 'When an Android build is ready, who tells the merchant, and through what channel? When a Play review fails for content reasons (e.g. missing privacy policy), who handles that conversation? This affects how much of the README we put in the artifact vs. how much lives in our support documentation.' },
      { type: 'p', text: 'Decision needed: name the role / team that owns each step of the merchant handoff before the CLI ships, and update docs/merchant-android-app.md to reflect that ownership.' },
      { type: 'h3', text: 'Smaller open items' },
      { type: 'ul', items: [
        'Default brand colour when a merchant has not set one — currently Flomerce blue, but could be a neutral grey to make "unbranded" obvious.',
        'Default app name when displayName is not set — currently the slug, but the slug is often ugly; should this fall back to the storefront\'s site name field?',
        'Whether the install banner is enabled by default for every merchant or behind an admin toggle.',
        'Whether assetlinks.json is rebuilt when a merchant changes their custom domain — yes, but who triggers the rebuild and where the SHA-256 fingerprints are recorded.',
      ]},
    ],
  },
];

function drawTitlePage(doc) {
  const { width } = doc.page;
  const cx = width / 2;

  doc.save();
  doc.rect(0, 0, width, 220).fill(COLORS.bgSoft);
  doc.restore();

  doc.fillColor(COLORS.muted)
    .font(FONT.bodyBold)
    .fontSize(11)
    .text('FLOMERCE  ·  ENGINEERING PLAN', PAGE.margins.left, 96, {
      width: width - PAGE.margins.left - PAGE.margins.right,
      align: 'center',
      characterSpacing: 2,
    });

  doc.moveDown(0.6);
  doc.fillColor(COLORS.ink)
    .font(FONT.bodyBold)
    .fontSize(28)
    .text('Merchant App Implementation Plan', PAGE.margins.left, doc.y, {
      width: width - PAGE.margins.left - PAGE.margins.right,
      align: 'center',
    });

  doc.moveDown(0.4);
  doc.fillColor(COLORS.muted)
    .font(FONT.bodyItalic)
    .fontSize(14)
    .text('PWA per merchant + per-merchant Android CLI build', PAGE.margins.left, doc.y, {
      width: width - PAGE.margins.left - PAGE.margins.right,
      align: 'center',
    });

  // Decorative rule
  doc.moveTo(cx - 40, 270).lineTo(cx + 40, 270).lineWidth(1.5).strokeColor(COLORS.accent).stroke();

  // Body abstract
  doc.fillColor(COLORS.ink)
    .font(FONT.body)
    .fontSize(11)
    .text(
      'This document is the reference implementation plan for adding installable app support to every Flomerce merchant storefront. It is structured so an engineer picking it up months from now can scope, sequence and deliver the work without needing to reconstruct the surrounding decisions from chat history.',
      PAGE.margins.left + 50,
      320,
      {
        width: width - PAGE.margins.left - PAGE.margins.right - 100,
        align: 'justify',
        lineGap: 3,
      }
    );

  doc.moveDown(1.2);
  doc.text(
    'It covers two layers: a Progressive Web App (PWA) experience that every merchant gains automatically, and an operator-run command-line tool that produces a signed Android App Bundle for any merchant who wants a Play Store listing. iOS native and self-serve build dashboards are deliberately out of scope for v1; both are recorded as future phases.',
    {
      width: width - PAGE.margins.left - PAGE.margins.right - 100,
      align: 'justify',
      lineGap: 3,
    }
  );

  // Footer block on title page
  const footerY = doc.page.height - 130;
  doc.moveTo(PAGE.margins.left, footerY).lineTo(width - PAGE.margins.right, footerY)
    .lineWidth(0.5).strokeColor(COLORS.rule).stroke();

  const today = new Date().toISOString().slice(0, 10);
  doc.fillColor(COLORS.muted).font(FONT.body).fontSize(10);
  doc.text('Document version', PAGE.margins.left, footerY + 14);
  doc.font(FONT.bodyBold).fillColor(COLORS.ink).text('1.0', PAGE.margins.left, footerY + 28);

  doc.font(FONT.body).fillColor(COLORS.muted).text('Date', PAGE.margins.left + 160, footerY + 14);
  doc.font(FONT.bodyBold).fillColor(COLORS.ink).text(today, PAGE.margins.left + 160, footerY + 28);

  doc.font(FONT.body).fillColor(COLORS.muted).text('Status', PAGE.margins.left + 320, footerY + 14);
  doc.font(FONT.bodyBold).fillColor(COLORS.ink).text('Plan — not yet implemented', PAGE.margins.left + 320, footerY + 28);
}

function drawSectionHeading(doc, title) {
  if (doc.y > doc.page.height - PAGE.margins.bottom - 120) {
    doc.addPage();
  }
  doc.moveDown(0.5);
  doc.fillColor(COLORS.accent)
    .font(FONT.bodyBold)
    .fontSize(18)
    .text(title, { lineGap: 2 });
  const y = doc.y + 4;
  doc.moveTo(PAGE.margins.left, y)
    .lineTo(doc.page.width - PAGE.margins.right, y)
    .lineWidth(0.6)
    .strokeColor(COLORS.rule)
    .stroke();
  doc.moveDown(0.8);
}

function drawH3(doc, text) {
  if (doc.y > doc.page.height - PAGE.margins.bottom - 80) doc.addPage();
  doc.x = PAGE.margins.left;
  doc.moveDown(0.4);
  doc.fillColor(COLORS.ink).font(FONT.bodyBold).fontSize(12.5).text(text);
  doc.moveDown(0.25);
}

function drawParagraph(doc, text) {
  doc.x = PAGE.margins.left;
  doc.fillColor(COLORS.ink).font(FONT.body).fontSize(11).text(text, {
    align: 'justify',
    lineGap: 3,
    paragraphGap: 6,
  });
}

function drawBullets(doc, items) {
  const indent = 14;
  const bulletGap = 4;
  doc.fillColor(COLORS.ink).font(FONT.body).fontSize(11);

  items.forEach((item) => {
    if (doc.y > doc.page.height - PAGE.margins.bottom - 30) doc.addPage();
    const startY = doc.y;
    doc.text('•', PAGE.margins.left, startY, { continued: false });
    doc.text(item, PAGE.margins.left + indent, startY, {
      width: doc.page.width - PAGE.margins.left - PAGE.margins.right - indent,
      align: 'left',
      lineGap: 3,
    });
    doc.moveDown(bulletGap / 12);
  });
  doc.moveDown(0.4);
}

function drawTable(doc, columns, rows) {
  const startX = PAGE.margins.left;
  const totalWidth = columns.reduce((a, c) => a + c.width, 0);
  const usable = doc.page.width - PAGE.margins.left - PAGE.margins.right;
  const scale = usable / totalWidth;
  const widths = columns.map((c) => c.width * scale);

  function rowHeight(cells, padding = 6) {
    return Math.max(...cells.map((cell, i) => doc.heightOfString(cell, {
      width: widths[i] - padding * 2,
      align: 'left',
    }))) + padding * 2;
  }

  // Header
  if (doc.y > doc.page.height - PAGE.margins.bottom - 80) doc.addPage();
  let y = doc.y;
  const headerH = rowHeight(columns.map(c => c.header));
  doc.save();
  doc.rect(startX, y, usable, headerH).fill(COLORS.bgSoft);
  doc.restore();
  let x = startX;
  doc.fillColor(COLORS.ink).font(FONT.bodyBold).fontSize(10);
  columns.forEach((c, i) => {
    doc.text(c.header, x + 6, y + 6, { width: widths[i] - 12, align: 'left' });
    x += widths[i];
  });
  y += headerH;
  doc.moveTo(startX, y).lineTo(startX + usable, y).lineWidth(0.5).strokeColor(COLORS.rule).stroke();

  // Body rows
  doc.font(FONT.body).fontSize(10).fillColor(COLORS.ink);
  rows.forEach((row, idx) => {
    const h = rowHeight(row);
    if (y + h > doc.page.height - PAGE.margins.bottom - 20) {
      doc.addPage();
      y = PAGE.margins.top;
    }
    if (idx % 2 === 1) {
      doc.save();
      doc.rect(startX, y, usable, h).fill('#fafafa');
      doc.restore();
    }
    x = startX;
    row.forEach((cell, i) => {
      doc.fillColor(COLORS.ink).text(cell, x + 6, y + 6, {
        width: widths[i] - 12,
        align: 'left',
      });
      x += widths[i];
    });
    y += h;
    doc.moveTo(startX, y).lineTo(startX + usable, y).lineWidth(0.3).strokeColor(COLORS.rule).stroke();
  });
  doc.y = y + 8;
  doc.x = PAGE.margins.left;
  doc.moveDown(0.4);
}

function renderSections(doc) {
  const tocEntries = [];
  SECTIONS.forEach((section, idx) => {
    doc.addPage();
    tocEntries.push({ title: section.title, page: doc.bufferedPageRange().start + doc.bufferedPageRange().count - 1 });
    drawSectionHeading(doc, section.title);
    section.blocks.forEach((block) => {
      switch (block.type) {
        case 'p':
          drawParagraph(doc, block.text);
          break;
        case 'h3':
          drawH3(doc, block.text);
          break;
        case 'ul':
          drawBullets(doc, block.items);
          break;
        case 'table':
          drawTable(doc, block.columns, block.rows);
          break;
        default:
          throw new Error('Unknown block type: ' + block.type);
      }
    });
  });
  return tocEntries;
}

function drawTOC(doc, tocEntries) {
  doc.fillColor(COLORS.ink).font(FONT.bodyBold).fontSize(20).text('Contents');
  doc.moveDown(0.6);
  doc.moveTo(PAGE.margins.left, doc.y)
    .lineTo(doc.page.width - PAGE.margins.right, doc.y)
    .lineWidth(0.6).strokeColor(COLORS.rule).stroke();
  doc.moveDown(0.8);

  const usableWidth = doc.page.width - PAGE.margins.left - PAGE.margins.right;

  tocEntries.forEach((entry) => {
    const y = doc.y;
    doc.fillColor(COLORS.ink).font(FONT.body).fontSize(12);
    const titleW = usableWidth - 50;
    doc.text(entry.title, PAGE.margins.left, y, { width: titleW, continued: false });
    // Page number right-aligned (1-indexed for human reading)
    const pageLabel = String(entry.page + 1);
    doc.font(FONT.bodyBold)
      .text(pageLabel, doc.page.width - PAGE.margins.right - 30, y, { width: 30, align: 'right' });
    doc.moveDown(0.5);
  });
}

function addFooters(doc) {
  const range = doc.bufferedPageRange();
  const total = range.count;
  for (let i = 0; i < total; i++) {
    doc.switchToPage(range.start + i);
    if (i === 0) continue; // skip footer on title page

    const yFooter = doc.page.height - 40;
    const x1 = PAGE.margins.left;
    const x2 = doc.page.width - PAGE.margins.right;

    doc.moveTo(x1, yFooter - 10).lineTo(x2, yFooter - 10)
      .lineWidth(0.4).strokeColor(COLORS.rule).stroke();

    // PDFKit auto-adds new pages if text() would overflow the bottom margin.
    // Footer sits inside the bottom margin region by design, so disable the
    // overflow check by zeroing the bottom margin only while writing the footer.
    const savedBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.fontSize(9).font(FONT.body).fillColor(COLORS.muted)
      .text('Flomerce — Merchant App Implementation Plan', x1, yFooter, {
        width: x2 - x1,
        align: 'left',
        lineBreak: false,
      });
    doc.text(`Page ${i + 1} of ${total}`, x1, yFooter, {
      width: x2 - x1,
      align: 'right',
      lineBreak: false,
    });
    doc.page.margins.bottom = savedBottom;
  }
}

async function main() {
  const doc = makeDoc();
  const stream = fs.createWriteStream(OUT);
  doc.pipe(stream);

  // Page 1: title page
  drawTitlePage(doc);

  // Page 2: TOC placeholder — we'll fill in after we know section pages
  doc.addPage();
  const tocPageIndex = doc.bufferedPageRange().start + doc.bufferedPageRange().count - 1;

  // Body sections — capture the page each section starts on
  const tocEntries = renderSections(doc);

  // Switch back to TOC page and write it now that we know the page numbers
  doc.switchToPage(tocPageIndex);
  doc.x = PAGE.margins.left;
  doc.y = PAGE.margins.top;
  drawTOC(doc, tocEntries);

  // Add footers across all pages now that the total page count is final
  addFooters(doc);

  doc.end();
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  const stats = fs.statSync(OUT);
  console.log(`Wrote ${OUT} (${(stats.size / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
