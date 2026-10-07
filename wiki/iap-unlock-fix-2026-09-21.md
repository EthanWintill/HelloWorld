# IAP unlock correction — September 21, 2026

## Issue and source findings

App Review reported a completed purchase without Pro access on iPad Air 11-inch (M3), iPadOS 26.5. The exact review transaction has not been inspected. Source at `cb2c042` had these gaps:

- Purchase and restore refreshed the dashboard but did not verify RevenueCat access with the backend. The existing subscription-sync endpoint only queried Stripe, leaving persisted organization access dependent on RevenueCat webhooks.
- Mobile access checked only the exact `GreekGeek Pro` entitlement, even when the configured `yearly` subscription itself was active.
- Dashboard identification was asynchronous and purchase did not await or confirm the organization identity.

These are concrete failure paths consistent with the report; the production entitlement mapping and webhook state remain unverified.

## Implemented changes

- New authenticated admin endpoint `POST /api/billing/sync-revenuecat/` retrieves the authenticated organization's RevenueCat subscriber server-to-server. Client-provided organization IDs and premium flags are not used.
- The configured entitlement or configured Pro subscription can grant access. Expiry/grace dates and refunds are checked; sandbox subscriptions are accepted. Active Stripe access is preserved. Upstream failure does not overwrite stored access.
- Mobile purchase and restore await organization identification and verify the SDK app-user ID before transacting. Entitlement access is scoped to the current organization in UI gates.
- Successful SDK purchase/restore triggers bounded backend verification retries before success UI and dashboard refresh. Verification failure reports a saved purchase and directs the user to Restore Purchases instead of another charge.
- Customer Center also verifies access after dismissal; the old 15-second timeout no longer interrupts a user interacting with its native UI.

## Verification

- 39 Django billing tests passed, including 12 new endpoint regressions: sandbox/production access, persisted dashboard access before webhook delivery, repeated restore, entitlement-mapping fallback, unrelated products, expiration, refunds, grace periods, Stripe preservation, upstream failure, missing key and member denial.
- 9 mobile logic tests passed: organization identity ordering/mismatch, purchase, restore, cancellation, Customer Center, known-product access and verification retries/failure.
- `npx tsc --noEmit` and `git diff --check` passed.
- Django tests used an isolated in-memory SQLite database with migrations. The configured PostgreSQL test run still fails password authentication. This does not verify PostgreSQL concurrency behavior.
- The normal Expo Jest preset cannot resolve `expo-modules-core` in this local install. The focused `jest.billing.config.js` runs billing logic without native modules.
- No real purchase, Apple sandbox transaction, iPad UI run, backend deployment or App Review submission was performed for this correction. Mocked RevenueCat responses and SDK calls are not proof of App Store configuration.

Mobile test command, from `GreekGeekStudy`:

```bash
npx jest --config jest.billing.config.js --runInBand
npx tsc --noEmit
```

Backend normal command, from `Backend/GreekGeekApi`, after PostgreSQL access is repaired:

```bash
../.venv/bin/python manage.py test Study.test_billing --noinput
```

## Required release steps

1. Deploy the new backend route and configure `REVENUECAT_API_KEY` with a RevenueCat API v1-compatible key for the same project as the mobile SDK. The App Store public SDK key supports subscriber lookup; `REVENUECAT_SECRET_API_KEY` remains a legacy fallback. On October 6 the deployed legacy key returned 403, while the existing App Store SDK key returned 200 for the authorized test organization. Server configuration correction is in progress.
2. Confirm the production App Store product and `GreekGeek Pro` entitlement mapping in RevenueCat. Ensure backend `REVENUECAT_PRODUCT_ID` and mobile `REVENUECAT_PRODUCT_IDS.yearly` match the intended product. The current release source has a production SDK-key fallback; it does not require an environment override when that fallback is correct. Development defaults to Test Store, which is distinct from Apple's sandbox.
3. Keep the authorized RevenueCat webhook enabled for later renewal, expiration and refund events; immediate verification complements it.
4. Confirm the Paid Apps Agreement is in effect and product metadata is complete in App Store Connect. Those account states were not accessed in this task.
5. Build with the production App Store SDK key and test a new purchase and Restore Purchases in Apple sandbox on iPadOS 26.5. Check immediate admin access, relaunch, dashboard organization state, cancellation, and no double-charge prompt after a temporary verification failure. Then submit the tested build.

References: [RevenueCat customer status](https://www.revenuecat.com/docs/customers/customer-info), [server API/customer schema](https://www.revenuecat.com/docs/api-v1/customer-info-model), [Apple sandbox testing](https://developer.apple.com/documentation/StoreKit/testing-in-app-purchases-with-sandbox).
