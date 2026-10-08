# HelloWorld / GreekGeek current state

Updated October 6, 2026. This snapshot describes the current local checkout and dated verification records. It does not establish that all local code is deployed.

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

September 20 follow-up: the [no-payment test-organization flow](verification-2026-09-20.md) passed inside the app through authenticated web dashboard access and dismissal. The shortcut skips email verification and does not sign the native app in or grant premium; ordinary signup/email delivery and native credential submission remain unverified.

The user supplied a Guideline 4 rejection for leaving the app to register/sign in. The September 19 source fix routes organization registration and password recovery through `services/AccountBrowser.ts` and `expo-web-browser.openBrowserAsync`. On iOS this presents Safari View Controller with a visible domain and native dismissal controls. Welcome registration, Sign In recovery, and Profile Change Password use this helper. Sign-in and member code registration remain native.

Profile offers account deletion with confirmation and `DELETE /api/me/`; the backend deletion implementation exists. Deletion was not executed during the latest checks. Registration and recovery presentation/dismissal were verified on the simulator; actual account creation, credential submission and reset-email delivery were not repeated. The fix has not been submitted in a new App Review build, and review acceptance is unknown.

## Billing and onboarding

September 21: [IAP unlock correction](iap-unlock-fix-2026-09-21.md) implemented locally: organization identity checks, known-product access fallback, and server-side RevenueCat verification after purchase/restore. 39 backend and 9 mobile regression tests pass with the limits documented in the linked record. Backend deployment and live RevenueCat subscriber sync passed October 6; production iOS build 17 compiled and uploaded successfully to App Store Connect October 7; Apple processing/TestFlight availability is pending. Real Apple sandbox purchase/restore and webhook configuration remain required before resubmission. See [October 6 release evidence](release-2026-10-06.md).

- Intended offer: **$149.99/year per organization with one month free**. Stripe implements a 30-day subscription trial after verified-admin checkout; account creation/email verification alone does not activate premium.
- Email verification links auto-sign in new admins and lead to the trial prompt. The web dashboard supports basic organization editing; `/billing/` manages subscription status and cancellation at period end.
- Stripe `trialing`/`active` or an active RevenueCat entitlement grants organization premium access. Mobile identifies RevenueCat customers by organization UUID and refreshes subscription state before purchase.
- Unpaid admins encounter the mobile paywall for admin routes and admin-only Study actions. Members retain normal app access. The September 18 development paywall displayed **$79.99/year with no trial**. Production App Store price/trial configuration remains unverified and must be reconciled with the intended offer.
- Development builds use the RevenueCat Test Store. Current release source uses a production App Store SDK-key fallback, which can be overridden with `EXPO_PUBLIC_REVENUECAT_API_KEY`; `EXPO_PUBLIC_REVENUECAT_DISABLED=true` disables initialization. Backend webhook configuration is also required for persistent entitlement updates.

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
5. Physical-device background exit, Apple sandbox purchase/restore, notification delivery, and production billing remain unverified. Simulator GPS clock-in/out and test-flag Pro admin operations passed on October 5; see the dated record below.

Clock-out source includes manual, geofence, background-location and foreground checks, with offline pending retries. These implementations are documented in [Clock Out](clock-out.md); source presence is not a physical-device reliability result.

## Next milestone

Prepare and validate a release candidate containing the account-browser fix, resolve the known runtime/backend issues, verify billing and account lifecycle with test accounts, then resubmit to App Review. See the [launch checklist](todo.md) and [local runbook](local-development.md).

## Location permission wording — September 21

Guideline 5.1.1(iv) correction implemented locally: both Study-screen pre-permission buttons now say **Continue**. Supporting text explains location use without directing users to enable access. The Settings fallback offers Cancel/Open Settings. On a fresh iPadOS 26.5 simulator, the native location prompt appeared, denial left a neutral explanation, and Clock in gave a permission-specific Settings alert. Updated App Review submission remains pending.

## iPad release QA — October 5, 2026

The local Release app runs on iPad Air 11-inch (M3) / iPadOS 26.5 with Xcode 27. Signed-out in-app account pages and the signed-in admin, Study, History, ranking, and report paths were exercised against the live API. A scoped `is_premium=true` test flag on the disposable `Apple Paid` org opened Pro screens without a purchase. GPS clock-in/out worked after setting a simulator position inside Main Library. See [the iPad verification record](verification-2026-10-05-ipad.md) for exact coverage, test data, and limits.

The production test org's Stripe status remains canceled and RevenueCat status remains expired; a billing sync can clear the manual flag. Apple sandbox purchase/restore and physical-device location behavior are still outstanding. Empty sign-in and organization-code form validation was fixed, rebuilt, and verified on the fresh iPad simulator. Profile now refreshes on focus after admin group edits; a rebuilt Release app showed “No group” immediately after the disposable group was deleted. The final authenticated dashboard read confirmed test Pro access, no group, and no open session.
