# HelloWorld Log

## [2026-06-11] compliance | App Store privacy/account deletion check

Tightened the privacy policy to match the current in-app account deletion path, disclosed profile pictures in collected account data, and added focused tests for the privacy page and `/api/me/` account deletion behavior.

## [2026-06-11] polish | Softer mobile Pro CTAs

Reduced repeated free-trial language across the mobile admin-gated surfaces. Top-level gated cards now use quieter GreekGeek Pro / View Pro copy, while explicit Start Free Trial wording remains in the purchase modal.

## [2026-06-11] fix | Mobile location permission timing

Changed the Study screen so login no longer triggers foreground/background location permission prompts. The app now checks existing location permission status silently, keeps notification registration as the initial automatic permission path, and exposes location permission through clock-in or inline Enable Location actions in the existing status/map UI.

## [2026-06-07] fix | EAS CNG native folder handling

Added `/ios/` and `/android/` to `GreekGeekStudy/.gitignore` and removed the generated iOS project from Git tracking so EAS can run Expo Prebuild / CNG from `app.json` instead of treating the app as a non-CNG native project.

## [2026-06-07] fix | EAS npm lockfile sync

Regenerated `GreekGeekStudy/package-lock.json` for the Expo SDK 56 dependency set so EAS `npm ci --include=dev` includes the missing peer/transitive packages such as `@testing-library/dom`, `@react-native/jest-preset`, and `react-native-svg`. Verified the clean install command succeeds under the app's Node 22.13.1 runtime.

## [2026-06-07] fix | EAS API constant packaging

Removed the stale root `.gitignore` rule for `GreekGeekStudy/constants/api.js` so EAS build packaging includes the committed API constant that Metro imports from admin screens.

## [2026-06-07] fix | iOS bundle identifier for App Store Connect

Updated the Expo iOS bundle identifier and checked-in Xcode project bundle identifier to `app.greekgeek.GreekGeekStudy` so EAS builds match the App Store Connect app record. Left the Android package as `app.greekgeek.GreekGeekStudy`.

## [2026-06-07] polish | App Store launch assets

Generated GreekGeek-branded Expo release assets for the App Store icon, Android adaptive icon, splash screen, favicon, and runtime loading logo. After the reconstructed mark looked wrong, regenerated the active asset set from the source SVG in `newlogoassets/logo-small.svg`, added a separate bordered test variant under `bordered-logo-assets/`, wired the active assets into `app.json`, updated the checked-in iOS app icon and splash asset catalog, and changed the in-app loading screen to show the branded loading logo.

## [2026-06-07] fix | Mobile landing cleanup and app support links

Condensed the mobile landing page screenshot and feature-card sections, simplified the pricing CTA copy, added more prominent contact CTAs, made comparison tables render as mobile cards, added an above-the-fold trial CTA on the signup success page, and linked Study/Profile help actions to the public contact page.

## [2026-06-07] test | Signed Stripe subscription updated regression

Added a signed Stripe SDK-object regression test for `customer.subscription.updated` payloads that store the billing period on `items.data[0].current_period_end`. This confirms the current webhook handler accepts the same event shape that previously produced the `detail: "get"` 500 when production treated Stripe objects like dictionaries.

## [2026-06-07] fix | Stripe webhook signature and SDK object handling

Fixed the Stripe billing webhook 500 caused by treating signed Stripe SDK events as plain dictionaries. The webhook now follows the current Python quickstart pattern with `StripeClient.construct_event`, rejects missing or invalid Stripe signatures, uses raw request bodies for verification, and handles Stripe SDK event/object access safely.

## [2026-06-07] fix | Stripe invoice webhook coverage

Expanded Stripe webhook handling to sync org billing from invoice success/failure events and additional subscription lifecycle events such as pause/resume/pending update. Invoice webhooks now resolve subscription ids from current invoice payload shapes, refresh the subscription from Stripe, and reuse the existing org premium-state sync.

## [2026-06-07] fix | Stripe subscription webhook period sync

Updated Stripe subscription webhook handling for newer subscription payloads where `current_period_end` lives on the first subscription item instead of the top-level subscription object. The webhook now uses the shared subscription sync path for created/updated/deleted events and has a regression test for `customer.subscription.updated`.

## [2026-06-07] feature | Admin-only free-org paywall gate

Added a shared mobile org subscription gate so non-premium organization admins see Start Free Trial CTAs on Study, History, Ranks, and Profile while members in the same org keep normal app access. The admin stack is blocked behind the paywall, and Study clock-in/manual-time/admin-location actions now open the paywall for unpaid admins instead of adding hours or entering admin setup.

## [2026-06-07] fix | Leaderboard duplicate keys

Fixed duplicate React keys on the mobile leaderboard by namespacing podium and ranking row keys. This prevents the rank page warning when a real user id overlaps with an empty podium slot rank.

## [2026-06-07] fix | Mobile purchase CTA

Changed the mobile Profile subscription action so non-premium organization admins see a direct Start Free Trial button instead of opening an empty billing modal first. The in-app billing modal is now reserved for premium org billing management, and its detail rows use stable keys.

## [2026-06-07] feature | Separate billing page and app billing modal

Moved full web billing management from the dashboard into `/billing/`, leaving the dashboard with a compact billing summary and Manage Billing link. Added an admin-only mobile Profile billing modal that pulls the same org billing state, shows status/source/trial/renewal/subscription details, and keeps purchase, restore, cancellation, refresh, and Customer Center actions behind the org-admin gate.

## [2026-06-07] fix | Dashboard billing refresh warning

Changed dashboard billing refresh so a backend billing-provider permission error returns stored org billing state plus a visible warning instead of failing the billing panel. The dashboard now preserves trial/subscription details already stored locally while making API permission or webhook-delivery problems explicit, and subscription webhooks now persist renewal/end date and cancel-at-period-end state for the dashboard.

## [2026-06-07] fix | Billing success page state

Fixed `/success/` billing returns so a completed trial checkout renders the "Trial Started" state immediately, including when the return URL only has `session_id`. The page still syncs billing in the background, but it no longer flashes or falls back to the organization-created trial prompt after payment.

## [2026-06-07] polish | Billing copy cleanup

Removed customer-facing billing copy that described the plan with org/year phrasing or named the checkout provider. Public signup, success, landing pricing, cookie policy, dashboard billing, and mobile billing-sync log text now use generic trial, billing, and premium-access language.

## [2026-06-06] feature | Dashboard billing management

Moved dashboard billing into a top full-width section that shows trial active/currently paying state, billing source, subscription id, trial and renewal/end dates, and Stripe cancellation controls. Added persisted Stripe `current_period_end` and `cancel_at_period_end` org fields plus an admin-only `/api/billing/cancel-subscription/` endpoint that schedules cancellation at period end. Added `REVENUECAT_SECRET_API_KEY` to backend env configuration.

## [2026-06-06] fix | Stripe success screen trial copy

Updated the post-Stripe Checkout success state so the billing box confirms the trial is active and points admins to dashboard setup instead of showing another "Start Free Trial" prompt.

## [2026-06-06] feature | RevenueCat mobile subscription starter

Installed the RevenueCat React Native SDK and UI package in the Expo app, added a root RevenueCat provider, identified RevenueCat customers by organization, checked the `GreekGeek Pro` entitlement for product `yearly`, and added org-admin-only Profile actions for the custom in-app GreekGeek paywall, purchase restore, and Customer Center. The custom paywall fetches the current RevenueCat offering and purchases the selected package with `Purchases.purchasePackage`. Added backend RevenueCat webhook handling so Stripe and RevenueCat both preserve `Org.is_premium` at the org level.

Expanded the RevenueCat webhook logic for the selected access-changing events: purchase, renewal, product change, cancellation, billing issue, uncancellation, transfer, pause, expiration, extension, temporary entitlement grant, and refund reversal. Cancellation and billing issue preserve access until expiration; customer-support cancellation/refund and expiration revoke RevenueCat access unless Stripe remains active.

Added a mobile pre-paywall billing guard: org admins now call the backend Stripe subscription sync endpoint before opening or completing the RevenueCat paywall, and the app blocks RevenueCat purchase if the org is already premium through Stripe.


## [2026-06-07] feature | Instant pending clock-out retry on network restore

Added `@react-native-community/netinfo` to detect network reconnection in real time and immediately retry any stored pending clock-out. The listener only fires on `false → true` transitions (tracks `prevConnected` to skip the initial event and debounces reconnects within a 3-second window). A 2-second delay before the retry lets the iOS network stack stabilize before hitting the API. Retry is also triggered on every successful dashboard refresh, giving multiple recovery opportunities without polling. Added a temporary `Alert.alert` on reconnect for testing.


## [2026-05-31] legal | Cookie policy page

Added a public `/cookies/` cookie policy page and linked it from the footer Legal section.

## [2026-05-31] polish | Registration success page onboarding

Collapsed the registration success page onboarding into one main card: the trial prompt now links to `Dashboard`, the redundant invite/setup mini cards and separate continue button are gone, and Next Steps now appears inside the main success card.

## [2026-05-30] feature | Stripe Billing starter

Added a backend Stripe Billing starter for the `$149.99/year` organization subscription: Checkout Session creation for org admins, Stripe webhook signature verification, org-level Stripe customer/subscription fields, premium-state sync, environment placeholders, and focused billing tests. The current app trial remains no-card signup; paid checkout is a separate admin handoff to Stripe-hosted Checkout.

## [2026-05-30] config | Stripe sandbox credentials

Updated the Stripe sandbox env to use the Dashboard-created annual price `price_1TcxhwFdUW1rAvnAxKr9UxvM` under product `prod_UcC6g2cLgVZwOa`, created a sandbox webhook endpoint for `https://greekgeek.app/api/billing/stripe-webhook/`, and populated ignored `Backend/.env` with the sandbox Stripe keys, price ID, redirect URLs, and webhook signing secret.

## [2026-05-30] change | Stripe-managed trial model

Changed the billing flow so email verification does not start the internal trial. Verified admins are prompted after sign-in to start a Stripe Checkout subscription with a 30-day trial and payment method collection; Stripe webhook subscription events now control premium access and trial timestamps.

## [2026-05-30] fix | Trial prompt onboarding

Fixed the post-registration billing prompt flow: valid email verification links now auto-sign in admins and redirect to the trial prompt, non-premium admins see a start-trial action, the misleading dashboard button was replaced with a skip/continue action, and visible copy no longer exposes unnecessary Stripe implementation details.

## [2026-05-30] fix | Visible start-free-trial CTA

Made the `Start Free Trial` CTA visible in the success page HTML instead of depending on a narrow JavaScript state path, and added a `Start Free Trial` link to the logged-in navbar dropdown for non-premium admins.

## [2026-05-30] test | Fast registration shortcut

Added an env-gated `FAST_TEST_REGISTRATION_ENABLED` shortcut for temporary production/sandbox checkout testing. When enabled, the register page shows a warning-only test button that creates a random verified org admin, stores auth tokens, and redirects straight to the start-trial screen. The shortcut is hidden and returns 404 when disabled.

## [2026-05-30] fix | Checkout return sync

Added an authenticated checkout-session sync endpoint and wired the dashboard/success return pages to call it when Stripe redirects back with a `session_id`. This lets GreekGeek mark the org premium/trialing immediately after Checkout, instead of relying only on asynchronous webhook delivery.

## [2026-05-30] feature | Reusable billing status sync

Added `POST /api/billing/sync-subscription/` so an authenticated org admin can refresh the org's billing state from Stripe at any time using the stored Stripe subscription ID, or the stored customer ID as a fallback.

## [2026-05-30] feature | Simple web admin dashboard

Added `/dashboard/` as the lightweight web admin landing page for organization admins. It exposes org name, school, and registration-code edits, sends admins to the mobile app for the full study-hour workflow, and shows the Stripe Checkout free-trial CTA for non-premium orgs.

## [2026-05-31] planning | Landing page remaining remediation checklist

Added `landing-page-remaining-remediations-2026-05-31.md` as the working checklist for the seven remaining landing-page items after the follow-up audit pass, and linked it from the project wiki index.

## [2026-05-31] fix | Member chapter-code landing copy

Added explicit member copy to the landing page's mobile app section: members with a chapter code should download GreekGeek, choose Join organization, and enter the code from their chapter admin. Marked the corresponding remaining-remediation checklist item complete while leaving the App Store URL replacement intentionally ignored for now.

## [2026-05-31] fix | Register trial expectation copy

Updated `/register/` so the page explains that admins create an organization account first, verify email, then start the one-month Stripe Checkout trial before configuring the chapter and inviting members. Marked the corresponding remaining-remediation checklist item complete.

## [2026-05-31] fix | Earlier mobile landing CTA

Moved the landing page's mid-page organization trial CTA directly under the problem panel so mobile visitors see the second organization action before the problem-card stack. Marked the corresponding remaining-remediation checklist item complete.

## [2026-05-31] fix | Self-host public web vendor assets

Self-hosted Bootstrap and Font Awesome under Django static assets and replaced the public template CDN references. This keeps the mobile nav, auth dropdown icons, success/dashboard icons, and purchase-page icon styling available without relying on external CDN availability. Marked the corresponding remaining-remediation checklist item complete.

## [2026-05-31] blocked | Landing page social proof

Checked for publishable pilot/customer proof for the remaining landing-page social-proof item. No approved quote, logo, named school/chapter/customer mention, or measured launch result was present in the repo, so the checklist item remains open and marked as waiting on approved real proof.

## [2026-05-30] seo | Product comparison pages

Added a public `/compare/` hub and comparison pages for GreekGeek vs CampusStudy, GreekGeek vs MyGreekStudy, and CampusStudy vs MyGreekStudy. The pages target comparison-search intent with pricing, feature, and decision-guide copy grounded in public competitor claims.

## [2026-05-30] fix | Landing page CTA focus

Removed dead member-code/member-access CTAs from the landing page, made the free trial CTA the primary path, kept app download as the secondary path, and centralized App Store badge destinations behind `APP_STORE_URL` instead of scrolling to a member-access section.

## [2026-05-31] fix | Production landing screenshot static assets

Fixed the reason landing screenshots were missing from production: the broad `screenshots/` ignore rule excluded `Backend/GreekGeekApi/static/screenshots/landing/`, so deploy pulled templates that referenced WebP assets that were never tracked. Unignored the Django static screenshot directory and added a deploy-time `collectstatic` check for the required WebP files.

## [2026-05-30] feature | Admin email verification gate

Added email verification for new organization admin signup. New org-owner accounts are blocked from JWT sign-in until verification, unverified admins can resend the verification email from login, and org trial timestamps now start after verification while `is_premium` remains false.

## [2026-05-30] feature | Public contact form

Added a `/contact/` page with backend validation and ZeptoMail-backed support email delivery. Replaced footer/homepage/support-page contact links with the new contact form and configured recipient routing through `CONTACT_TO_EMAIL`.

## [2026-05-30] seo | Support article pages

Added a public `/support/` hub and five SEO-focused support articles for GreekGeek app workflows: approved-location study hours for fraternity members, sorority GPS study tracking, spreadsheet replacement, chapter study hour requirements, and member chapter-code onboarding. Linked the support hub from the site nav and footer.

## [2026-05-30] seo | CampusStudy-informed landing copy

Tightened the landing page's SEO copy against CampusStudy-style search intent: fraternity and sorority study hour tracking, GPS-verified timers, academic chair workflow, chapter invite codes, approved study locations, progress reports, and spreadsheet replacement. Updated visible headings, metadata, FAQ copy, and structured data in `Backend/GreekGeekApi/templates/landing.html`.

## [2026-05-29] polish | Pre-framed landing screenshots

Replaced the landing page's CSS-built iPhone mock frame with the pre-framed screenshot assets from `screenshots/with_frame/WithFrame Screenshots(1)` and updated the static landing screenshots to use those generated frames directly.

## [2026-05-29] polish | Landing page product screenshots

Replaced landing page screenshot placeholders with high-resolution simulator screenshots, iPhone-framed hero/feature previews, a mobile-friendly workflow section that pairs each step with the relevant screenshot, and App Store-only CTAs in the hero and footer.

## [2026-05-28] todo | Web-to-app purchase funnel research

Added a monetization todo to research combining in-app purchases with a web purchase path that can funnel users into the iOS app while preserving entitlement sync, onboarding handoff, analytics, and App Store compliance.

## [2026-05-28] todo | Onboarding new-organization path

Added a launch-polish todo to fix onboarding navigation so users who choose `Register With Code` can still return to the new-organization registration path instead of getting stuck between sign-in and code registration screens.

## [2026-05-28] todo | Graceful network error states

Added a launch-polish todo to replace raw mobile network error text with graceful degraded UI: populate available content and show placeholders or localized retry states only where network-backed data is missing.

## [2026-05-28] migration | Source cloned into workstation

Cloned `https://github.com/EthanWintill/HelloWorld` into `projects/helloworld`. Verified the new clone matched the legacy parent checkout's tracked files at commit `37586557dfcc615b151cb2281c1ac958648c5b52`. Confirmed the separate parent `startups/helloworld` notes were already duplicated in the repo, so no additional markdown was copied from there.

## [2026-05-28] instruction | Project-local memory policy

Updated `AGENTS.md` to state that project-local `AGENTS.md`, `wiki/`, and `skills/` are intended to be committed with the repo unless they contain secrets, private credentials, or context that should remain outside the repo.

## [2026-05-29] fix | Study location map creation controls

Fixed the admin Study Locations create/edit modal so users can close it from the header, search addresses with suggestions, move the map after searching without GPS snap-back, and adjust radius with a touch slider as well as map zoom.

## [2026-05-29] feature | S3-backed profile pictures

Added the first profile-picture implementation using direct client-to-S3 uploads. The backend now stores a user `profile_picture_key`, generates short-lived S3 PUT/GET presigned URLs, and the mobile profile screen can pick a photo, upload it to S3, and refresh the profile image.

## [2026-05-29] audit | Landing page conversion review

Audited the GreekGeek Django landing page with desktop/mobile screenshots, source inventory, current competitor/SEO research, and remediation artifacts. Added `landing-page-audit-2026-05-29.md`, `landing-page-audit-assets-2026-05-29/`, and issue plans under `landing-page-remediations-2026-05-29/`.

## [2026-05-29] decision | Organization pricing and trial

Documented the launch pricing package: `$149.99` per year per organization with a one-month free trial. Captured that the one-year free trial idea was rejected and should not be used in launch materials.

## [2026-05-30] implementation | Landing page remediation pass

Implemented the first landing-page remediation pass: retained App Store badges as live download CTAs with a centralized placeholder href for the final store URL, replaced misleading member-code CTAs with App Store/chapter-code copy, aligned the organization funnel around a one-month free trial and `$149.99/year` pricing, added trust/support/privacy proof, added SEO/social/favicons, switched landing screenshots to optimized WebP assets, and captured verification screenshots under `landing-page-remediation-assets-2026-05-30/`.

## [2026-05-31] fix | Stale auth tokens on public auth routes

Changed public signup, sign-in, email verification, password reset, chapter-code lookup, and contact API endpoints to skip JWT authentication parsing so stale bearer tokens are treated as anonymous state. Updated the web login and register pages to clear invalid stored browser tokens instead of redirecting away from the forms.

## [2026-06-07] upgrade | Expo SDK 56 for App Store builds

Upgraded the mobile app from Expo SDK 52 to SDK 56 with React Native 0.85.3, React 19.2.3, React Compiler enabled, Node 22.13.1 recorded in `.nvmrc`, and SDK 56-compatible app code/import fixes. Regenerated the checked-in iOS project and `Podfile.lock` for SDK 56 after updating to Xcode 26.5. Local TypeScript, iOS JS export, CocoaPods install, and a native debug simulator build/install now pass.

## [2026-06-07] fix | Study location permission UI

Removed the legacy circular location-permission control from the Study screen, kept the normal clock-in button visible when location permissions are missing, and changed the permission prompt copy so it wraps cleanly in the red warning card.

## [2026-06-07] fix | Disable RevenueCat in TestFlight until App Store key is ready

Changed the mobile RevenueCat configuration so dev builds can keep using the current Test Store SDK key, but release/TestFlight builds do not initialize RevenueCat unless `EXPO_PUBLIC_REVENUECAT_API_KEY` provides a production RevenueCat App Store SDK key. Added `EXPO_PUBLIC_REVENUECAT_DISABLED=true` as a temporary off switch for builds that need to run before App Store subscriptions are fully configured.

## [2026-06-07] config | EAS production auto-increment

Enabled remote EAS app version source and production `autoIncrement` so production/TestFlight builds automatically advance build numbers.

## [2026-06-11] fix | RevenueCat intro eligibility paywall copy

Updated the mobile RevenueCat paywall flow to check iOS introductory offer eligibility before showing custom purchase copy. Eligible App Store accounts see one-month free-trial language; ineligible or unknown accounts see upfront subscription copy while the native purchase sheet remains the final source of terms.

## [2026-06-11] fix | iPadOS 26 dev-client touch blocker

Diagnosed the iPadOS 26 post-login "freeze" in the local dev build as Expo Dev Client's launch-time developer menu overlay capturing touches over the Study screen. Configured `expo-dev-client` to launch the most recent bundle without auto-opening the dev menu, skip onboarding, and hide the floating tools button in future dev-client rebuilds.

## [2026-09-18] local run | Xcode 27 simulator build and launch findings

Built checkout `442a2a3` successfully with Xcode 27 after local ignored-file fixes for RevenueCat, ExpoModulesJSI, old deployment targets, and stale generated Pods paths. Regenerated native config to include the existing dev-menu fix. Expo CLI cannot locate the former Simulator app; use Device Hub and direct Xcode/simctl commands. iOS 27 terminates the app for missing UIScene lifecycle adoption; the same build remains running on iPhone 17 Pro / iOS 26.5. Restarted Metro with IPv4 preferred after identifying an IPv6-only listener. UI and signed-in verification remain pending because the Mac was locked and no test login was selected. Detailed reproduction notes are in `current-state.md`.

## [2026-09-18] verification | Signed simulator app and core screens

Resumed after unlock and used the existing `Apple Paid` simulator login. Rebuilt with simulator signing enabled to remove the unsigned build's Keychain error. Verified Study/dashboard/map, History and period filtering/reset, individual and group rankings, Profile, and unpaid-admin paywall gating. Left the app on Study with Metro running. Runtime logs expose a backend push-registration HTTP 500 from the user/device unique constraint. The development RevenueCat offering shows `$79.99/year` without a trial; production pricing was not checked. Clock-in/out, paid admin workflows, purchase/restore, background geofencing, and notification delivery remain unverified.
## 2026-09-19 | App Review Guideline 4 account browser fix

Replaced the welcome screen's external organization-registration link with an in-app Safari View Controller via the already-installed `expo-web-browser`. Routed Sign In and Profile password recovery through the same small helper, with an error alert if presentation fails. Verified registration and recovery load inside GreekGeek and Done returns to the native screen on iPhone 17 Pro / iOS 26.5; native sign-in and member-registration screens remain available. TypeScript passed and Metro bundled the updated iOS app. Existing account deletion was checked in source (`Profile` -> `DELETE /api/me/`), without deleting an account. No account was created, reset email sent, or App Store submission made. The simulator was signed out to verify the public onboarding path.

## 2026-09-19 | Documentation refresh

Reconciled repository/mobile READMEs, project state, development runbook, verification record, launch checklist, venture brief, design/clock-out notes and workstation project summary with the current source and September 18–19 observations. Annotated April/May audits and remediation plans as historical and recorded the latest landing-copy change. Removed superseded setup/migration claims from active guidance. Documented the unsubmitted App Review fix, iOS 27 failure, push registration error, temporary dependency patches, database test blocker and unverified production billing. Preserved historical results; no new app regression run or deployment was performed for this documentation update.

## 2026-09-20 | No-payment account-flow test

Verified existing fast-test registration endpoint and the complete in-app embedded test-org creation → web dashboard → native dismissal path on iOS 26.5. No checkout, payment or trial was started. Two clearly named test organizations remain on the live backend. Documented shortcut limitations: random inaccessible password, skipped email verification and no native login handoff. Password recovery presentation/dismissal also passed. Freed about 2.7 GB of regenerable GreekGeek Xcode build cache after disk exhaustion. See project `wiki/verification-2026-09-20.md` for exact scope.

## 2026-09-21 | IAP Pro unlock correction

Added authenticated server-to-server RevenueCat subscription verification and mobile post-purchase/restore retries, organization identity checks and configured-Pro-product fallback. Documented required backend key/deployment and Apple sandbox validation. Verified 39 backend billing tests on isolated SQLite, 9 mocked mobile tests, TypeScript and diff whitespace. PostgreSQL remains blocked by authentication; no production deployment or real Apple sandbox purchase was performed. See project `wiki/iap-unlock-fix-2026-09-21.md`.

## 2026-09-21 | Location permission wording

Addressed Guideline 5.1.1(iv) in the Study screen: replaced both Enable Location buttons with Continue, changed explanatory copy to describe location use neutrally, and removed the directive to set Location to Always from the Settings fallback. Existing permission request and denial handling remain. TypeScript and diff checks passed; no simulator walkthrough or submission in this task.

## 2026-09-27 | iPhone preview build and device signing

Built the current mobile working tree through EAS with the `preview` internal-distribution profile, then refreshed the Samuel Bryant Apple team's ad hoc provisioning profile and re-signed the successful build for Ethan's iPhone 16e (UDID ending `401C`). The installable artifact is [EAS build 54503f99](https://expo.dev/accounts/greekgeek/projects/GreekGeekStudy/builds/54503f99-c930-4e6a-ad75-81568e2c83bb). Downloaded the IPA and verified that its embedded profile lists the phone, uses team `28J9M2P8ZN`, and matches bundle ID `app.greekgeek.GreekGeekStudy`. TypeScript and nine mocked mobile billing tests passed before the cloud build. Local Xcode 27 device building remains blocked by missing Xcode signing accounts and old CocoaPods deployment targets. Direct installation was attempted while the phone was locked; a subsequent device check reported Developer Mode off. Device installation and launch remain to be confirmed. This build does not establish backend deployment or a successful Apple sandbox purchase.

## 2026-10-05 | 11-inch iPad simulator install

Built the current mobile working tree as a standalone Release simulator app with Xcode 27, overriding the inherited CocoaPods deployment target to iOS 16.4 and disabling code signing for the simulator. Installed and launched `app.greekgeek.GreekGeekStudy` on the booted iPad Air 11-inch (M3), iPadOS 26.5, in Xcode Device Hub. The welcome screen rendered without an immediate crash. This verifies installation and initial launch only; sign-in, purchase, and study workflows were not repeated in this run.
## [2026-10-05] verification | iPad Air 11-inch release QA and test Pro access

Built and exercised the local Release app on iPad Air 11-inch (M3) / iPadOS 26.5. Verified signed-out account browser flows, free gating, manually granted test Pro access, admin screens, a short manual entry, GPS clock-in/out at a simulated approved study area, History, rankings, group create/delete, reports, and export presentation. The `Apple Paid` test org has `is_premium=true` without changing its canceled Stripe or expired RevenueCat records; billing sync may reset this test flag. Fixed empty sign-in/code error copy locally. See [dated iPad verification](verification-2026-10-05-ipad.md) for scope and remaining limits.

## [2026-10-06] verification | Fresh iPad location denial and Profile group refresh

On a fresh iPad Air 11-inch simulator, verified neutral Continue buttons, the native location prompt, denial state, and the permission-specific Clock in alert. Fixed a false “No Study Location Found” alert after denial. Found that Profile and Admin use separate dashboard providers, so refreshing only the Admin provider left Profile's group label stale. Profile now refreshes on focus; the rebuilt Release app showed “No group” immediately after deleting the disposable group. The final live dashboard read confirmed org 16 is still premium for QA, its group is null, and no study session is open. TypeScript and the native Release build passed. See [iPad verification](verification-2026-10-05-ipad.md).

## [2026-10-06] release | Production deployment and iOS build started

The owner authorized deployment of the App Review fixes and a production build, followed by testing. Re-ran 39 backend billing tests on isolated SQLite, nine mobile billing tests, TypeScript, and diff checks successfully. Preparing the matching backend deployment and production EAS build; live purchase verification and exact-build device testing are still pending.

## 2026-10-06 — Release billing configuration correction

Deployed App Review fixes via GitHub Actions run 37563502298. Live subscriber lookup rejected the existing backend RevenueCat key with HTTP 403. Verified the existing public App Store SDK key returns HTTP 200 for the authorized Apple Paid test organization. Added REVENUECAT_API_KEY with legacy fallback and reran all 39 billing tests successfully. Production iOS build 17 (ed772804-dbc8-4845-bd58-48d8a8448d1b) is compiling. Live configuration correction and sandbox/device verification remain in progress; webhook authorization is absent.

## 2026-10-06 — Production build and live verification

Production build 17 compiled successfully. RevenueCat configuration correction is deployed; authenticated production sync returns 200 and correctly denies expired subscription access. iPad restore without active purchases shows the expected message. Restored the authorized manual test-org Pro flag after billing checks. TestFlight upload is blocked by a missing/expired Apple agreement; physical-device sandbox purchase remains unverified. See [release evidence](release-2026-10-06.md). Temporary operational workflow removed after successful configuration/test runs.

## 2026-10-06 — App Store Connect upload retry

Retried upload of completed production build 17 at the user’s request. [Submission 20a0bd55](https://expo.dev/accounts/greekgeek/projects/GreekGeekStudy/submissions/20a0bd55-c01e-4bbb-a91a-8df7c9f28561) failed with the same required Apple agreement missing/expired error. The Account Holder must resolve the agreement before another upload; no new build is required.
