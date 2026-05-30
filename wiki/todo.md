# HelloWorld Todo

## Launch Polish

- [ ] Replace raw network error displays in the mobile app with graceful degraded states. When a network request fails, keep the rest of the screen populated where possible and show clean placeholders, retry affordances, or loading/error states only in the areas that depend on unavailable network data. Avoid development-artifact copy like `Error: Network Error` in user-facing UI.
- [ ] Fix onboarding navigation so users can always get back to registering a brand new organization. From the starting page, `Register Your Organization` is available, but after choosing `Register With Code`, the user can get stuck cycling between sign-in and register-with-code screens without a clear path back to new-organization registration.

## Monetization And Distribution

- Confirmed pricing package: `$149.99` per year per organization with a one-month free trial. Do not use a one-year free trial.
- [ ] Research web-to-app purchase funnels for iOS. Determine how to combine in-app purchases with a web purchase path that can funnel paid users into the iOS app cleanly, including App Store rule constraints, account linking, onboarding handoff, entitlement sync, and analytics needed to measure conversion.
