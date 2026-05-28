# HelloWorld Log

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
