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
- First landing-page remediation pass is implemented: landing copy assumes App Store availability, App Store badges are retained with a centralized placeholder href for the final store URL, one-month trial pricing, trust/support section, SEO/social metadata, favicon, and optimized WebP landing screenshots.

## Open Questions

- What is the final GreekGeek App Store product URL for the centralized badge link?
- Which customer segment is the first paid target?
- What is the next concrete milestone?
