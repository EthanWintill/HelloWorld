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

## Open Questions

- What launch channel comes first: TestFlight, internal beta, App Store, or direct web onboarding?
- What payment or subscription flow is required for launch?
- Which customer segment is the first paid target?
- What is the next concrete milestone?
