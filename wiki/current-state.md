# HelloWorld / GreekGeek current state

Updated September 19, 2026. This snapshot describes source at `442a2a3` plus the uncommitted account-browser fix and the September 18–19 local checks. It does not establish that all local code is deployed.

## Product and implementation

GreekGeek is the app's user-facing name; HelloWorld is the repository/workstation name. It tracks organization study hours at approved locations, supports member registration by chapter code, session history, individual/group rankings, and admin management of members, groups, locations, periods, and reports.

| Surface | Current implementation |
| --- | --- |
| Mobile | `GreekGeekStudy`: Expo 56, React Native 0.85.3, React 19.2.3, Expo Router, TypeScript; native development client required |
| Backend and website | `Backend/GreekGeekApi`: Django/DRF, JWT, PostgreSQL; landing, registration, email verification, support/contact, comparison, dashboard and billing pages |
| Integrations | ZeptoMail HTTP email, S3 media configuration, Stripe web subscriptions, RevenueCat mobile subscriptions, Expo notifications |
| API target | `GreekGeekStudy/constants/api.js` currently uses `https://greekgeek.app/` |
| Native projects | Expo Prebuild/CNG; generated `ios/` and `android/` are ignored |

## Accounts and App Review

The user supplied a Guideline 4 rejection for leaving the app to register/sign in. The September 19 source fix routes organization registration and password recovery through `services/AccountBrowser.ts` and `expo-web-browser.openBrowserAsync`. On iOS this presents Safari View Controller with a visible domain and native dismissal controls. Welcome registration, Sign In recovery, and Profile Change Password use this helper. Sign-in and member code registration remain native.

Profile offers account deletion with confirmation and `DELETE /api/me/`; the backend deletion implementation exists. Deletion was not executed during the latest checks. Registration and recovery presentation/dismissal were verified on the simulator; actual account creation, credential submission and reset-email delivery were not repeated. The fix has not been submitted in a new App Review build, and review acceptance is unknown.

## Billing and onboarding

- Intended offer: **$149.99/year per organization with one month free**. Stripe implements a 30-day subscription trial after verified-admin checkout; account creation/email verification alone does not activate premium.
- Email verification links auto-sign in new admins and lead to the trial prompt. The web dashboard supports basic organization editing; `/billing/` manages subscription status and cancellation at period end.
- Stripe `trialing`/`active` or an active RevenueCat entitlement grants organization premium access. Mobile identifies RevenueCat customers by organization UUID and refreshes subscription state before purchase.
- Unpaid admins encounter the mobile paywall for admin routes and admin-only Study actions. Members retain normal app access. The September 18 development paywall displayed **$79.99/year with no trial**. Production App Store price/trial configuration remains unverified and must be reconciled with the intended offer.
- Development builds use the RevenueCat Test Store. Release/TestFlight requires a production `EXPO_PUBLIC_REVENUECAT_API_KEY`; `EXPO_PUBLIC_REVENUECAT_DISABLED=true` disables initialization. Backend webhook configuration is also required for persistent entitlement updates.

## Website and assets

The latest merge temporarily removed web-payment copy from the landing page: primary CTAs now say **Register organization**. Do not restore old trial-first landing copy simply because it appears in April/May plans. Registration and backend billing still contain the trial flow. Support, contact, comparison pages, SEO/social metadata, self-hosted vendor assets, and WebP landing screenshots exist in source.

`APP_STORE_URL` still defaults to App Store search; the deployed override/final product URL is unverified. Approved customer proof and remaining static-asset cleanup are tracked in the [landing checklist](../landing-page-remaining-remediations-2026-05-31.md). Active app icons/splash are under `GreekGeekStudy/assets`; use the source SVG mark for changes. `bordered-logo-assets` is an alternate set.

## Verified and blocked

The signed Debug app ran on **iPhone 17 Pro / iOS 26.5 using Xcode 27.0** with temporary local dependency edits. Study/map, History/filtering, rankings, Profile and unpaid-admin paywall checks passed. TypeScript and iOS JavaScript bundling passed. See the [dated verification record](verification-2026-09-19.md) for scope.

Known unresolved issues:

1. iOS 27 terminates the app with `UIScene life cycle is required for apps built with this SDK`.
2. Push-token registration returned HTTP 500 from a duplicate user/device database constraint.
3. Native build workarounds live in ignored Pods/node_modules and can disappear on regeneration; clean build reproducibility remains open.
4. Local backend tests are blocked by PostgreSQL authentication.
5. Successful session creation/clock-out, physical-device background exit, paid admin operations, purchase/restore, notification delivery, and production billing remain unverified in the latest run.

Clock-out source includes manual, geofence, background-location and foreground checks, with offline pending retries. These implementations are documented in [Clock Out](clock-out.md); source presence is not a physical-device reliability result.

## Next milestone

Prepare and validate a release candidate containing the account-browser fix, resolve the known runtime/backend issues, verify billing and account lifecycle with test accounts, then resubmit to App Review. See the [launch checklist](todo.md) and [local runbook](local-development.md).
