# HelloWorld / GreekGeek

GreekGeek helps fraternity, sorority and campus organizations manage study requirements: members join with a chapter code, track sessions at approved locations, and view progress and rankings. Administrators manage members, groups, study areas, periods and reports.

## Current status — September 19, 2026

The app runs in a signed iOS 26.5 simulator development build. The App Review Guideline 4 fix now opens organization registration and password recovery inside Safari View Controller; sign-in and member signup are native. A new review build has not been submitted.

Known gaps include iOS 27 scene-lifecycle launch failure, push-token registration HTTP 500, temporary native dependency build patches, local database test access, and unverified production purchase/trial behavior. See [current state](wiki/current-state.md) and [latest verification](wiki/verification-2026-09-19.md) before treating the app as release-ready.

## Repository

| Path | Purpose |
| --- | --- |
| `GreekGeekStudy/` | Expo 56 / React Native 0.85.3 mobile app with Expo Router |
| `Backend/GreekGeekApi/` | Django/DRF API and public/admin website |
| `Backend/requirements.txt` | Python dependencies |
| `wiki/` | Current state, runbook, feature behavior, release checklist and history |
| `newlogoassets/`, `bordered-logo-assets/` | Source logo and alternate launch assets |

The backend uses PostgreSQL, JWT authentication, ZeptoMail email, Stripe subscriptions and RevenueCat entitlement synchronization. The mobile API URL is committed in `GreekGeekStudy/constants/api.js` and currently targets the live service.

## Development and documentation

- [Mobile setup](GreekGeekStudy/README.md)
- [Local backend and simulator runbook](wiki/local-development.md)
- [Launch checklist](wiki/todo.md)
- [Product and pricing brief](venture.md)
- [Documentation index](wiki/index.md)

April/May audits and plans are retained as dated history with current-status notes. Their test counts and planned behavior are not current verification. Keep environment secrets and generated native/build outputs out of git.
