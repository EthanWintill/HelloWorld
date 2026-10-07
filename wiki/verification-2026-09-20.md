# Account-flow verification — September 20, 2026

Source: `cb2c042` (Feature fix 1), existing signed iPhone 17 Pro / iOS 26.5 development client with current Metro bundle, live `https://greekgeek.app/` backend.

## Result

The embedded registration change passed the no-payment **test-organization flow**: native welcome → Register your organization → Safari View Controller → Create Test Organization → success/trial prompt → authenticated web organization dashboard → Done → native welcome. The domain remained visible and no external-browser handoff was needed. Dashboard displayed **Trial: Not started**. No payment information was entered, checkout opened, trial started or purchase made.

The live registration page exposes the existing fast-test shortcut, controlled in source by `FAST_TEST_REGISTRATION_ENABLED`. It calls `POST /api/test-fast-org-signup/`, creates a verified test admin and a non-premium organization, and signs the embedded website in. It does **not** grant premium access or bypass paid admin feature gates.

## Test data

- API check created `Test Chapter 2534197f`; authenticated dashboard and organization endpoints returned data. Organization state had `is_premium=false`, null trial dates, and no Stripe customer/subscription.
- In-app button created `Test Chapter c14c5d60`; the embedded dashboard showed the matching name, organization settings and trial-not-started status.
- Both test organizations remain on the live backend. No existing customer data was changed. Tokens are excluded from documentation.

## Limits and findings

The shortcut generates a random password and does not expose it. Its email is an example.com test address. It skips normal form submission/email verification and does not authenticate the native app when Safari View Controller closes. Therefore this pass validates embedded test registration and web dashboard access, **not** normal signup email delivery, native sign-in as the generated admin, or paid features. Regular users still need to sign in natively with their chosen credentials.

Native Sign In → Forgot password also opened the reset form inside Safari View Controller and dismissed back to native Sign In. No reset email or credential change was requested.

## Environment

Mac UI control initially timed out. The disk then ran out of space; removing one regenerable GreekGeek Xcode DerivedData directory freed approximately 2.7 GB. Simulator was restarted. Embedded web accessibility was unavailable and scrolling was unreliable through Device Hub; keyboard capture plus Space successfully revealed the test button. No app implementation was changed. Metro remains running and the simulator was left on native Sign In.
