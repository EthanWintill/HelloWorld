# HelloWorld / GreekGeek venture brief

Updated September 19, 2026.

## Product and stage

GreekGeek is an organization study-hours app for fraternity, sorority and campus chapters. Members join with a code, track approved-location study sessions and view progress; administrators manage requirements, membership and reports. The active source is this `projects/helloworld` checkout.

The product is in launch hardening and App Review remediation. A Guideline 4 rejection prompted an embedded registration/password-recovery fix, verified locally but not yet submitted. A signed iOS 26.5 simulator run passed core smoke checks; this does not establish release readiness.

## Commercial model

The intended package is **$149.99/year per organization with a one-month free trial**. Backend Stripe checkout implements a 30-day trial for verified organization admins. RevenueCat supports mobile purchases and organization-level access. Either active source can grant premium.

The development RevenueCat offering observed September 18 was **$79.99/year without a trial**. Production pricing, trial eligibility and complete purchase/restore behavior need verification before promising the offer. The latest landing page uses registration CTAs and temporarily omits web-payment copy; keep that source decision separate from older trial-first copy plans.

## Next milestone

Produce a validated release candidate and resubmit the account-flow correction to App Review. Resolve the iOS 27 launch issue, push registration failure, reproducible build gaps and billing verification. Exercise complete onboarding, account deletion and real-device study tracking.

See [current state](wiki/current-state.md), [launch checklist](wiki/todo.md) and [verification](wiki/verification-2026-09-19.md). The first paid customer segment and rollout plan remain open decisions.
