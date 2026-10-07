# Launch checklist

Updated October 6, 2026. [Current iPad evidence](verification-2026-10-05-ipad.md).

## Completed locally

- [x] Embed organization registration and password recovery with Safari View Controller.
- [x] Verify browser presentation/dismissal, native auth entry screens, and TypeScript.
- [x] Run signed simulator app on iOS 26.5 and smoke-check primary tabs and unpaid-admin gates.
- [x] Verify GPS clock-in/out, manual study time, paid test-org admin routes, groups, rankings, and reports on iPadOS 26.5 simulator without an Apple purchase.
- [x] Fix and verify empty sign-in and organization-code validation on the iPad Release app.
- [x] Verify location pre-permission wording, native request, denial path, and corrected clock-in error on the iPad Release app.
- [x] Refresh Profile after admin group membership changes; create/delete and immediate Profile return were exercised on the iPad.

## Release candidate

- [x] Implement immediate RevenueCat purchase/restore verification and regression tests for Guideline 2.1(b); see [release requirements](iap-unlock-fix-2026-09-21.md).
- [ ] Deploy the verification endpoint/key and verify a real Apple sandbox purchase/restore on iPadOS 26.5.

- [ ] Fix iOS 27 UIScene lifecycle launch failure.
- [ ] Make native dependency fixes reproducible through supported upgrades or durable patches; prove a clean build.
- [ ] Fix duplicate-device push-token registration HTTP 500 and verify notification delivery.
- [ ] Restore local PostgreSQL test access and run relevant backend tests; repair test script venv path.
- [ ] Verify actual sign-in, member signup, organization signup/email verification, reset-email completion and account deletion with disposable test accounts.
- [ ] Verify onboarding can return to new-organization registration from every auth path; the full navigation loop has not been retested.
- [ ] Verify offline pending clock-out retry and physical-device background location exit.
- [ ] Verify Apple sandbox purchase/restore, real provider entitlement persistence, and paid admin access in the submitted build. The manually set test-org `is_premium` flag can be reset by billing sync.
- [ ] Reconcile intended $149.99/year + one-month trial with the development offering ($79.99/year, no trial); verify production product, entitlement and webhook setup.
- [ ] Check release configuration and prepare a new App Review build with the Guideline 4 fix and clear review instructions; submit and track the outcome.

## Launch polish and operations

- [ ] Review network-error states across mobile screens; preserve loaded data and provide useful retry actions.
- [ ] Confirm final `APP_STORE_URL`; current source fallback is App Store search.
- [ ] Complete remaining [landing tasks](../landing-page-remaining-remediations-2026-05-31.md), including approved customer proof and asset cleanup.
- [ ] Validate deployed backend/environment configuration and end-to-end Stripe/RevenueCat access synchronization.
- [ ] Review the combined web/mobile purchase funnel against the actual release configuration; historical funnel plans are not proof of store acceptance.
- [ ] Choose the first paid customer segment and record the release rollout plan.
