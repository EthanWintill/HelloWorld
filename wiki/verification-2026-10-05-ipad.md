# iPad Air 11-inch (M3) release QA — October 5–6, 2026

## Environment

- Xcode 27, iPadOS 26.5 simulator, Release configuration, live `https://greekgeek.app/` API.
- Tested the existing signed-in `admin@apple2.com` account in the `Apple Paid` organization (ID 16) after the owner confirmed it is disposable test data.
- Used a second fresh 11-inch iPad simulator for signed-out screens, preserving the existing login.
- The app was built from the current local checkout, including the uncommitted account-browser, purchase-unlock, and location-copy changes. It is not evidence of a submitted App Store build.

## Verified in the iPad UI

- Welcome, native sign-in, native member-code registration, embedded Safari View Controller for organization registration and password recovery, and return to the app. The embedded browser displays the `greekgeek.app` host. Organization registration was viewed but a second account was not created in this run.
- Profile, account deletion confirmation (canceled), notification settings (viewed), and photo permission denial with a clear alert. Password recovery also opened inside the app from Profile.
- Free organization gating opened the Pro offer for admin routes and Study actions. Restore Purchases reported no purchases. No Apple transaction was initiated.
- After setting `is_premium=true` for test org 16, Profile showed Active Pro access and admin routes opened. Member directory/search/details, organization details save, group creation and deletion, study periods, settings, reports, and CSV export share sheet worked.
- With the simulator positioned at the approved Main Library coordinates, the map loaded, clock-in and clock-out completed, and no session remained open. A 0.1-hour manual entry appeared as 6 minutes in History and as 0.1 hours on Study, the leaderboard, and reports. The brief clocked session appeared as 0 minutes because it lasted under a minute.
- A disposable `iPad QA` group was created with the admin, appeared in group rankings and reports, then was deleted. The group count returned to zero and all three members were unassigned.
- On the fresh simulator, both pre-permission actions read “Continue.” The native iOS location prompt appeared, and denying it left Study with a neutral “Location access off” explanation. Clock in then showed “Location Permission Required” with Cancel and Open Settings, rather than claiming no approved study area was found.

## Findings and limits

- Empty sign-in and empty organization-code submissions displayed misleading “not found” messages. Fixed both locally, rebuilt the Release app successfully, and verified the fresh iPad now says “Enter your email and password,” “Enter a valid email address,” and “Enter your organization code” as appropriate. TypeScript also passes. The updated build is installed on both iPad simulators; the signed-in app relaunched successfully with its account preserved.
- After deleting the disposable group, Profile initially retained the old label because Profile and Admin use separate dashboard providers. Profile now refreshes its dashboard data on focus. In the rebuilt Release app, returning from group deletion immediately showed “No group” in Profile without an app relaunch; Admin showed zero groups and three unassigned members.
- Add Location failed to obtain a position before a simulator location was configured. The Study map likewise stayed on “Loading map...” until a simulated position was set. Once set, location verification, map, clock-in, and the Add Location form worked. The form was closed without creating an area. Physical iPad background geofence behavior is still unverified.
- The Pro access change is a **test flag**, not a payment. Existing Stripe status remains `canceled` with billing IDs; RevenueCat status remains `expired`. A later provider billing sync can recompute `is_premium` to false. Do not cite this as Apple sandbox purchase verification or a durable complimentary plan.
- Apple sandbox purchase/restore, notification delivery, background location exit, physical iPad behavior, and App Review acceptance remain unverified.

## Production test data and operational cleanup

- `Apple Paid` org ID 16: `is_premium` changed from false to true; Stripe and RevenueCat records were not changed. A subsequent authenticated dashboard read confirmed true.
- Final authenticated dashboard read confirmed `is_premium=true`, group `null`, and zero open sessions. One 0.1-hour manual study entry and one brief clocked session remain in the disposable org.
- A temporary GitHub Actions manual workflow used the existing droplet SSH secrets for a scoped inspection and update. It was removed from `main` after the run. The workflow run records are [inspection](https://github.com/EthanWintill/HelloWorld/actions/runs/37398097341) and [grant](https://github.com/EthanWintill/HelloWorld/actions/runs/37398201616). All workflow commits used `[skip ci]`; the deployment workflow was not intentionally run.
