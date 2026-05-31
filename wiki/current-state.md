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
- New organization admin signup now requires email verification before sign-in. New orgs are created as non-premium, and the one-month trial timestamps start after verification.

## Open Questions

- What is the final GreekGeek App Store product URL for the centralized badge link?
- Which customer segment is the first paid target?
- What is the next concrete milestone?
