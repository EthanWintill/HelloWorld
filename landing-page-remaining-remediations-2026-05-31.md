# Landing Page Remaining Remediations

Date: 2026-05-31
Source: follow-up review of `landing-page-audit-2026-05-29.md` and `landing-page-remediations-2026-05-29/` against the current local Django landing page.

Use this as the working checklist for the remaining landing-page launch pass.

## Checklist

- [ ] 1. Replace the App Store placeholder destination.

  Status: intentionally ignored for now per 2026-05-31 direction.

  The landing page now treats App Store badges as live download CTAs, but the configured fallback still points to App Store search: `https://apps.apple.com/us/search?term=GreekGeek`.

  Done when:
  - `APP_STORE_URL` points to the final GreekGeek App Store product page or a truthful TestFlight/beta URL.
  - If no live app URL exists yet, the badge is replaced with honest beta/waitlist/download-state copy.
  - Hero, mobile app section, final CTA, footer, dashboard, and comparison pages all use the same centralized destination.

- [x] 2. Add clearer member-code landing-page copy.

  Completed on 2026-05-31 in `Backend/GreekGeekApi/templates/landing.html`.

  Done when:
  - The landing page includes copy like: `Already have a chapter code? Download GreekGeek, choose Join organization, and enter your code.`
  - The copy explains what members without a code should do.
  - The member path remains visually subordinate to the organization trial CTA.

- [x] 3. Tighten the `/register/` expectation match.

  Completed on 2026-05-31 in `Backend/GreekGeekApi/templates/register.html`.

  Done when:
  - `/register/` clearly explains the sequence: create account, verify email, start Stripe trial, configure chapter, invite members.
  - The page keeps the confirmed pricing clear: one month free, then `$149.99/year`.
  - Button and heading copy do not imply billing starts before email verification and Stripe checkout.

- [x] 4. Bring the second mobile organization CTA earlier.

  Completed on 2026-05-31 in `Backend/GreekGeekApi/templates/landing.html`.

  Done when:
  - At `390x844`, users see the hero, proof strip, problem, and a second organization CTA within roughly two mobile scrolls.
  - The CTA does not crowd the hero or create layout overlap.
  - The full-page mobile scan path remains shorter and easier to evaluate than the original audit state.

- [x] 5. Harden or self-host critical CDN dependencies.

  Completed on 2026-05-31 by self-hosting Bootstrap and Font Awesome under `Backend/GreekGeekApi/static/vendor/`.

  Done when:
  - Critical navigation and CTA behavior works if CDN resources fail, or Bootstrap/needed assets are self-hosted.
  - Font Awesome is removed from pages where it is not needed, or self-hosted if still required.
  - A quick browser check confirms the mobile nav still opens and closes correctly.

- [ ] 6. Add real proof when available.

  Status: waiting on approved real proof. A repo search on 2026-05-31 did not find a publishable pilot quote, customer/chapter logo, approved school/chapter mention, or measured launch result.

  The current trust section is truthful, but it is still product proof rather than social proof.

  Needed before implementation:
  - Approved quote, logo, named chapter/school/customer mention, or measured result.
  - Confirmation that the proof can be published on `greekgeek.app`.

  Done when:
  - A real pilot quote, chapter/customer logo, approved school/chapter mention, or measurable launch result is added with permission.
  - No fake testimonials, fake logos, or unverifiable claims are introduced.
  - Proof appears before or near a major organization CTA.

- [ ] 7. Clean up screenshot delivery and static asset weight.

  The rendered landing page uses optimized WebP screenshots, but original PNG screenshots still sit in static assets.

  Done when:
  - Unused PNG screenshot originals are removed from deployable static assets, or intentionally kept outside the shipped static bundle.
  - If useful, landing images get responsive `srcset`/`sizes` so mobile does not download larger assets than needed.
  - A static/link smoke check confirms all referenced landing images still return 200.

## Suggested Verification

After completing any item, run the narrow checks that match the change:

```bash
cd Backend/GreekGeekApi
../.venv/bin/python manage.py check
../.venv/bin/python manage.py runserver 127.0.0.1:8010
```

Then use a browser check at:

- Desktop: `1440x900`
- Mobile: `390x844`

Confirm:

- No horizontal scroll.
- All visible CTAs route to truthful destinations.
- `/`, `/register/`, `/login/`, `/privacy/`, `/terms/`, `/contact/`, `/support/`, `/compare/`, `/favicon.ico`, the social image, CSS, and referenced landing screenshots return 200.
