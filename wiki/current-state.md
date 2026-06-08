# HelloWorld Current State

## Migration Status

HelloWorld has been cloned into the workstation at `projects/helloworld` from `https://github.com/EthanWintill/HelloWorld`.

At migration time, the new clone and the legacy parent checkout at `../../../../HelloWorld` were both on `main` at commit `37586557dfcc615b151cb2281c1ac958648c5b52`.

## What Was Checked

- Tracked files in the legacy checkout and new clone matched.
- `../../../../startups/helloworld/venture.md` matched `../venture.md`.
- `../../../../startups/helloworld/landing-page-prd-2026-04-28.md` matched `../landing-page-prd-2026-04-28.md`.
- Ignored local files from the legacy checkout were not migrated.

## Current Goal

Finish launch-critical product, backend, onboarding, and operational work so the app can be tested, distributed, and monetized with confidence.

## Known Context

- Backend lives under `Backend/GreekGeekApi`.
- React Native / Expo app lives under `GreekGeekStudy`.
- Previous local bring-up used local Postgres on `localhost:5432`.
- Frontend API target is controlled by `GreekGeekStudy/constants/api.js`.
- Backend environment values are expected from `Backend/.env`.
- Confirmed organization pricing is `$149.99` per year per organization.
- Confirmed launch trial is one month free; do not use a one-year free trial.
- First landing-page remediation pass is implemented: landing copy assumes App Store availability, App Store badges are retained with a centralized placeholder href for the final store URL, one-month trial pricing, trust/support section, SEO/social metadata, favicon, optimized WebP landing screenshots, and CampusStudy-informed SEO language for fraternity/sorority GPS study hour tracking.
- SEO support pages are live in the Django site under `/support/`, covering approved-location study hours, sorority GPS study tracking, spreadsheet replacement, chapter study hour requirements, and member chapter-code onboarding.
- Public contact form is live under `/contact/`, linked from the footer, landing support section, and support pages, and sends to `CONTACT_TO_EMAIL` through the existing ZeptoMail-backed email service.
- Landing CTAs are focused on starting a free organization trial first and downloading the mobile app second; member-code CTA buttons were removed, and App Store badge links are controlled by `APP_STORE_URL`.
- Product comparison pages are live under `/compare/`, covering GreekGeek vs CampusStudy, GreekGeek vs MyGreekStudy, and CampusStudy vs MyGreekStudy with a GreekGeek alternative angle.
- New organization admin signup now requires email verification before sign-in. New orgs are created as non-premium, and email verification does not start the free trial.
- Valid email verification links now auto-sign in the admin and send them to the start-trial prompt; admins should not have to manually sign in after clicking a valid verification link.
- Stripe Billing starter is implemented as backend-managed annual subscription Checkout for verified org admins. The app should not collect raw card fields; admins should be sent to Stripe-hosted Checkout through `/api/billing/checkout-session/`, Stripe should collect payment details, and Stripe webhooks should sync `Org.is_premium`.
- The intended trial model is Stripe-managed: the admin starts a 30-day Stripe subscription trial after sign-in, the org is premium while Stripe status is `trialing` or `active`, and Stripe automatically charges the annual plan after the trial if the payment method remains valid.
- A simple web admin dashboard now lives at `/dashboard/`. It lets organization admins edit org name, school, and registration code, points admins to the mobile app for the full workflow, and links to `/billing/` for full org billing management. The billing page owns trial/subscription status, billing source, renewal/end date, subscription id, free-trial CTA for non-premium orgs, and cancellation scheduled at period end.
- Stripe sandbox setup uses product `prod_UcC6g2cLgVZwOa`, annual price `price_1TcxhwFdUW1rAvnAxKr9UxvM`, and a test webhook endpoint pointed at `https://greekgeek.app/api/billing/stripe-webhook/`. Secrets stay in ignored env files or Stripe Dashboard only.
- The Expo app now has org-level RevenueCat support: `react-native-purchases` and `react-native-purchases-ui` are installed, the root app configures RevenueCat with the current Test Store SDK key only in dev builds, and dashboard users are identified to RevenueCat by `Org.revenuecat_app_user_id` rather than individual user id. Profile checks the `GreekGeek Pro` entitlement for product `yearly`; unpaid org admins see Start Free Trial CTAs across the app, admin routes and admin-only Study actions are blocked behind the paywall, premium org admins can open the in-app billing modal for active billing management, and members in unpaid orgs keep normal app access. The paywall is custom React Native UI that fetches the current RevenueCat offering and purchases the selected package with `Purchases.purchasePackage`. Release/TestFlight builds skip RevenueCat unless `EXPO_PUBLIC_REVENUECAT_API_KEY` is set to a production RevenueCat App Store SDK key; `EXPO_PUBLIC_REVENUECAT_DISABLED=true` can force it off temporarily.
- Expo release assets are configured for App Store preparation: `assets/icon.png`, `assets/adaptive-icon.png`, `assets/splash.png`, `assets/favicon.png`, and the runtime loading logo are rendered from the source SVG GreekGeek pillar mark. EAS should generate native app icon and splash assets from `app.json` through Expo Prebuild / CNG.
- The Expo app is upgraded to Expo SDK 56 (`expo@56.0.9`, React Native `0.85.3`, React `19.2.3`) with Node `22.13.1` recorded in `GreekGeekStudy/.nvmrc`. SDK 56 requires Xcode 26.4+ for iOS builds; this Mac now uses Xcode 26.5. The app now uses Expo Prebuild / CNG for EAS builds: `GreekGeekStudy/.gitignore` ignores `/ios/` and `/android/`, and generated native projects should stay out of version control.
- Stripe and RevenueCat both feed the org premium source of truth. `Org.is_premium` remains true when either Stripe is `trialing`/`active` or RevenueCat has an active entitlement, so Stripe-web premium orgs do not see the mobile paywall and RevenueCat expiration does not revoke access while Stripe is still active. Before the mobile app opens or completes the RevenueCat paywall, it calls `/api/billing/sync-subscription/` to refresh Stripe state and blocks RevenueCat purchase if the org is already premium. RevenueCat backend persistence requires the webhook at `/api/billing/revenuecat-webhook/` with `REVENUECAT_WEBHOOK_AUTHORIZATION` configured.
- RevenueCat webhook handling is intentionally limited to access-changing or billing-state events: `INITIAL_PURCHASE`, `RENEWAL`, `PRODUCT_CHANGE`, `CANCELLATION`, `BILLING_ISSUE`, `UNCANCELLATION`, `TRANSFER`, `SUBSCRIPTION_PAUSED`, `EXPIRATION`, `SUBSCRIPTION_EXTENDED`, `TEMPORARY_ENTITLEMENT_GRANT`, and `REFUND_REVERSED`. `CANCELLATION` keeps org premium until expiration unless it is a customer-support refund; `EXPIRATION` removes RevenueCat access unless Stripe is still active.

## Background Clock-Out System

The mobile app uses a layered system to detect when a member leaves a study location and clock them out automatically.

**Exit detection (two redundant mechanisms):**
- `GEOFENCE_TASK` — primary, iOS-native `CLLocationManager` geofencing. Fires an exit event when the device crosses the registered region boundary.


The backend `ClockOut` view accepts an `end_time` ISO string and backdates the session hours to the stored exit timestamp, clamped to no earlier than the session start time.

## Open Questions

- What is the final GreekGeek App Store product URL for the centralized badge link?
- Which customer segment is the first paid target?
- What is the next concrete milestone?
