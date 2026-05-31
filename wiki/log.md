# HelloWorld Log

## [2026-05-30] feature | Stripe Billing starter

Added a backend Stripe Billing starter for the `$149.99/year` organization subscription: Checkout Session creation for org admins, Stripe webhook signature verification, org-level Stripe customer/subscription fields, premium-state sync, environment placeholders, and focused billing tests. The current app trial remains no-card signup; paid checkout is a separate admin handoff to Stripe-hosted Checkout.

## [2026-05-30] config | Stripe sandbox credentials

Updated the Stripe sandbox env to use the Dashboard-created annual price `price_1TcxhwFdUW1rAvnAxKr9UxvM` under product `prod_UcC6g2cLgVZwOa`, created a sandbox webhook endpoint for `https://greekgeek.app/api/billing/stripe-webhook/`, and populated ignored `Backend/.env` with the sandbox Stripe keys, price ID, redirect URLs, and webhook signing secret.

## [2026-05-30] change | Stripe-managed trial model

Changed the billing flow so email verification does not start the internal trial. Verified admins are prompted after sign-in to start a Stripe Checkout subscription with a 30-day trial and payment method collection; Stripe webhook subscription events now control premium access and trial timestamps.

## [2026-05-30] fix | Trial prompt onboarding

Fixed the post-registration billing prompt flow: valid email verification links now auto-sign in admins and redirect to the trial prompt, non-premium admins see a start-trial action, the misleading dashboard button was replaced with a skip/continue action, and visible copy no longer exposes unnecessary Stripe implementation details.

## [2026-05-30] fix | Visible start-free-trial CTA

Made the `Start Free Trial` CTA visible in the success page HTML instead of depending on a narrow JavaScript state path, and added a `Start Free Trial` link to the logged-in navbar dropdown for non-premium admins.

## [2026-05-30] test | Fast registration shortcut

Added an env-gated `FAST_TEST_REGISTRATION_ENABLED` shortcut for temporary production/sandbox checkout testing. When enabled, the register page shows a warning-only test button that creates a random verified org admin, stores auth tokens, and redirects straight to the start-trial screen. The shortcut is hidden and returns 404 when disabled.

## [2026-05-30] feature | Simple web admin dashboard

Added `/dashboard/` as the lightweight web admin landing page for organization admins. It exposes org name, school, and registration-code edits, sends admins to the mobile app for the full study-hour workflow, and shows the Stripe Checkout free-trial CTA for non-premium orgs.

## [2026-05-30] seo | Product comparison pages

Added a public `/compare/` hub and comparison pages for GreekGeek vs CampusStudy, GreekGeek vs MyGreekStudy, and CampusStudy vs MyGreekStudy. The pages target comparison-search intent with pricing, feature, and decision-guide copy grounded in public competitor claims.

## [2026-05-30] fix | Landing page CTA focus

Removed dead member-code/member-access CTAs from the landing page, made the free trial CTA the primary path, kept app download as the secondary path, and centralized App Store badge destinations behind `APP_STORE_URL` instead of scrolling to a member-access section.

## [2026-05-31] fix | Production landing screenshot static assets

Fixed the reason landing screenshots were missing from production: the broad `screenshots/` ignore rule excluded `Backend/GreekGeekApi/static/screenshots/landing/`, so deploy pulled templates that referenced WebP assets that were never tracked. Unignored the Django static screenshot directory and added a deploy-time `collectstatic` check for the required WebP files.

## [2026-05-30] feature | Admin email verification gate

Added email verification for new organization admin signup. New org-owner accounts are blocked from JWT sign-in until verification, unverified admins can resend the verification email from login, and org trial timestamps now start after verification while `is_premium` remains false.

## [2026-05-30] feature | Public contact form

Added a `/contact/` page with backend validation and ZeptoMail-backed support email delivery. Replaced footer/homepage/support-page contact links with the new contact form and configured recipient routing through `CONTACT_TO_EMAIL`.

## [2026-05-30] seo | Support article pages

Added a public `/support/` hub and five SEO-focused support articles for GreekGeek app workflows: approved-location study hours for fraternity members, sorority GPS study tracking, spreadsheet replacement, chapter study hour requirements, and member chapter-code onboarding. Linked the support hub from the site nav and footer.

## [2026-05-30] seo | CampusStudy-informed landing copy

Tightened the landing page's SEO copy against CampusStudy-style search intent: fraternity and sorority study hour tracking, GPS-verified timers, academic chair workflow, chapter invite codes, approved study locations, progress reports, and spreadsheet replacement. Updated visible headings, metadata, FAQ copy, and structured data in `Backend/GreekGeekApi/templates/landing.html`.

## [2026-05-29] polish | Pre-framed landing screenshots

Replaced the landing page's CSS-built iPhone mock frame with the pre-framed screenshot assets from `screenshots/with_frame/WithFrame Screenshots(1)` and updated the static landing screenshots to use those generated frames directly.

## [2026-05-29] polish | Landing page product screenshots

Replaced landing page screenshot placeholders with high-resolution simulator screenshots, iPhone-framed hero/feature previews, a mobile-friendly workflow section that pairs each step with the relevant screenshot, and App Store-only CTAs in the hero and footer.

## [2026-05-28] todo | Web-to-app purchase funnel research

Added a monetization todo to research combining in-app purchases with a web purchase path that can funnel users into the iOS app while preserving entitlement sync, onboarding handoff, analytics, and App Store compliance.

## [2026-05-28] todo | Onboarding new-organization path

Added a launch-polish todo to fix onboarding navigation so users who choose `Register With Code` can still return to the new-organization registration path instead of getting stuck between sign-in and code registration screens.

## [2026-05-28] todo | Graceful network error states

Added a launch-polish todo to replace raw mobile network error text with graceful degraded UI: populate available content and show placeholders or localized retry states only where network-backed data is missing.

## [2026-05-28] migration | Source cloned into workstation

Cloned `https://github.com/EthanWintill/HelloWorld` into `projects/helloworld`. Verified the new clone matched the legacy parent checkout's tracked files at commit `37586557dfcc615b151cb2281c1ac958648c5b52`. Confirmed the separate parent `startups/helloworld` notes were already duplicated in the repo, so no additional markdown was copied from there.

## [2026-05-28] instruction | Project-local memory policy

Updated `AGENTS.md` to state that project-local `AGENTS.md`, `wiki/`, and `skills/` are intended to be committed with the repo unless they contain secrets, private credentials, or context that should remain outside the repo.

## [2026-05-29] fix | Study location map creation controls

Fixed the admin Study Locations create/edit modal so users can close it from the header, search addresses with suggestions, move the map after searching without GPS snap-back, and adjust radius with a touch slider as well as map zoom.

## [2026-05-29] feature | S3-backed profile pictures

Added the first profile-picture implementation using direct client-to-S3 uploads. The backend now stores a user `profile_picture_key`, generates short-lived S3 PUT/GET presigned URLs, and the mobile profile screen can pick a photo, upload it to S3, and refresh the profile image.

## [2026-05-29] audit | Landing page conversion review

Audited the GreekGeek Django landing page with desktop/mobile screenshots, source inventory, current competitor/SEO research, and remediation artifacts. Added `landing-page-audit-2026-05-29.md`, `landing-page-audit-assets-2026-05-29/`, and issue plans under `landing-page-remediations-2026-05-29/`.

## [2026-05-29] decision | Organization pricing and trial

Documented the launch pricing package: `$149.99` per year per organization with a one-month free trial. Captured that the one-year free trial idea was rejected and should not be used in launch materials.

## [2026-05-30] implementation | Landing page remediation pass

Implemented the first landing-page remediation pass: retained App Store badges as live download CTAs with a centralized placeholder href for the final store URL, replaced misleading member-code CTAs with App Store/chapter-code copy, aligned the organization funnel around a one-month free trial and `$149.99/year` pricing, added trust/support/privacy proof, added SEO/social/favicons, switched landing screenshots to optimized WebP assets, and captured verification screenshots under `landing-page-remediation-assets-2026-05-30/`.

## [2026-05-31] fix | Stale auth tokens on public auth routes

Changed public signup, sign-in, email verification, password reset, chapter-code lookup, and contact API endpoints to skip JWT authentication parsing so stale bearer tokens are treated as anonymous state. Updated the web login and register pages to clear invalid stored browser tokens instead of redirecting away from the forms.
