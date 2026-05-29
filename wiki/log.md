# HelloWorld Log

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
