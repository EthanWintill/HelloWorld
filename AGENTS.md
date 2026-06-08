# HelloWorld Agent Instructions

This project is the migrated source tree for the HelloWorld app, formerly known as Greek Geek. Start with the top-level workstation context, then use this file for project-local behavior.

## Read Order

1. Top-level workstation: `../../AGENTS.md`, `../../wiki/index.md`, `../../wiki/00-compass.md`, and `../../wiki/projects/helloworld.md`.
2. Project-local context: `wiki/index.md`, `wiki/current-state.md`, and this file.
3. Product docs as needed: `README.md`, `venture.md`, `landing-page-prd-2026-04-28.md`, `QA_FULL_TEST_RUN_2026-04-28.md`, and `DESIGN.md`.

## Current Goal

Finish launch-critical product, backend, onboarding, deployment, and operational work so the app can be tested, distributed, and monetized with confidence.

## Local Rules

- Treat this directory as the active HelloWorld source tree inside `01_WORKSTATION`.
- Preserve repo history and do product-code git operations from this directory.
- Do not copy local ignored environment files, caches, build outputs, or app bundles from the legacy parent checkout.
- Keep product implementation docs close to the repo, and keep cross-project synthesis in the top-level workstation wiki.
- Update `wiki/log.md` after meaningful project-local context changes.
- Project-local `AGENTS.md`, `wiki/`, and `skills/` are intended to be committed with this repo unless they contain secrets, private credentials, or context that should remain outside the repo.
- For app launch assets, use the source SVG/vector logo when available. Do not reconstruct the GreekGeek mark from low-resolution PNGs or generated approximations.

## Verification Bias

For backend changes, prefer narrow Django checks or tests from `Backend/GreekGeekApi` when practical.

For frontend changes, verify the Expo/React Native target from `GreekGeekStudy` when practical.
