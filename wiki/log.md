# HelloWorld Log

## [2026-05-30] seo | Product comparison pages

Added a public `/compare/` hub and comparison pages for GreekGeek vs CampusStudy, GreekGeek vs MyGreekStudy, and CampusStudy vs MyGreekStudy. The pages target comparison-search intent with pricing, feature, and decision-guide copy grounded in public competitor claims.

## [2026-05-30] fix | Landing page CTA focus

Removed dead member-code/member-access CTAs from the landing page, made the free trial CTA the primary path, kept app download as the secondary path, and centralized App Store badge destinations behind `APP_STORE_URL` instead of scrolling to a member-access section.

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
