# GreekGeek App Audit - Backend, Design, Apple Compliance

Date: 2026-04-28

Scope:
- Screenshots reviewed from `AppScreenshots/`.
- Frontend reviewed under `GreekGeekStudy/app`, `GreekGeekStudy/context`, and `GreekGeekStudy/services`.
- Backend reviewed under `Backend/GreekGeekApi/Study` and `Backend/GreekGeekApi/GreekGeekApi/urls.py`.
- Apple policy checked against current Apple Developer guidance:
  - https://developer.apple.com/app-store/review/guidelines/
  - https://developer.apple.com/support/offering-account-deletion-in-your-app/
  - https://developer.apple.com/app-store/app-privacy-details/

Product decisions:
- Photo/selfie verification is intentionally deferred. Keep any "Require Photos" admin setting clearly marked as unavailable/coming later or hide it until the backend and capture flow are ready.
- Local development should use the Django backend on `http://127.0.0.1:8000/`; hosted API should only be restored intentionally for production/release testing.

Implementation progress:
- 2026-04-28: P0 compliance/backend pass added account deletion, privacy/terms links/pages, App Store-ready permission copy, server-side clock-in GPS validation, UUID period setting detail route, safe clock-out handling, and organization-scoped location modification.
- 2026-04-28: P1 truthfulness pass added persisted org admin settings, kept photo verification disabled as a placeholder, added staff-only user password-reset link creation, and replaced report export placeholder with native share-sheet CSV export.
- 2026-04-28: Follow-up full-stack pass made active admin settings operational: dashboard now includes org settings, location verification can be disabled for clock-in, manual study entry is implemented and setting-gated, maintenance mode blocks non-staff study actions, push token registration no longer crashes before login, and active session detection now handles manual entries correctly.

## Current App Surface

The app currently exposes:
- Landing, registration-code lookup, sign-up, sign-in.
- Main user tabs: Study, History, Leaderboard, Profile.
- Admin stack: Admin Dashboard, Manage Organization, Manage Users, User Detail, Add User, Manage Groups, Study Periods, Reports, Admin Settings.
- Extra route: `GreekGeekStudy/app/search/[query].tsx`, currently a static stub.

## Verified Completed Items

Verified on 2026-04-28 against the local Django backend, local Postgres, and TypeScript build:
- Backend health: `manage.py check` passes.
- Focused backend behavior tests: `Study.tests.ClockInClockOutTestCase` passes.
- Frontend typecheck: `npx tsc --noEmit` passes.
- Local backend smoke: `GET /privacy/` and `GET /terms/` return 200.
- Account deletion: temporary user can call `DELETE /api/me/`; the user record is deleted.
- App permission strings: placeholder/profane location strings were replaced in `GreekGeekStudy/app.json`.
- Profile compliance links: mobile Profile has working Privacy Policy, Terms, Support, Change Password, and Delete Account actions.
- Server-side clock-in GPS validation: far-away GPS clock-in returns 400; location verification can also be disabled through org settings and then clock-in without GPS succeeds.
- Clock-out crash fix: clock-out without an open session returns 400, not a server crash.
- Open-session detection: clock-out correctly finds an open session even after a manual completed session is added.
- Organization-scoped location modification: `ModifyLocation.get_queryset()` is scoped to the admin user's organization.
- Period settings UUID route: detail route now uses `<uuid:pk>`.
- Org admin settings persistence: `GET/PUT/DELETE /api/org-settings/` works.
- Operational admin settings: `require_location_verification`, `allow_manual_entry`, and `maintenance_mode` are enforced by backend/app behavior.
- Inactive admin settings truthfulness: photo verification, email reminder/report settings, password age, session timeout, multiple-device control, and debug mode are disabled or labeled as planned rather than presented as working controls.
- Manual study entry: `POST /api/manual-session/` is blocked when disabled and succeeds when `allow_manual_entry` is enabled.
- Admin reset password: staff-only `POST /api/user/<id>/reset-password/` returns 200 locally with a reset link when email is not configured.
- Report export: mobile Reports export now uses native share-sheet CSV instead of a placeholder alert.
- Push token registration: registration endpoint accepts repeated registration of the same Expo token and updates the existing record; blank tokens still return 400.
- Sign-up confirmation validation: mobile sign-up now checks password and confirmation match before submitting.
- Mobile password reset links: sign-in/profile link to the local forgot-password route.
- Organization registration link: mobile landing links to `${API_URL}register/` instead of Google.

## Backend Incomplete Or Partially Complete Features

Priority 0 means likely App Review blocker or data/security risk. Priority 1 means core product behavior is incomplete. Priority 2 means polish or operational completeness.

### P0 - Account Deletion Is Not Implemented For The Signed-In User

Apple requires apps that support account creation to let users initiate account deletion in the app. The backend has admin deletion of other users, but it explicitly blocks self-delete in `UserDetail.delete`.

Evidence:
- `Backend/GreekGeekApi/Study/views.py:379-390` blocks `same_user`.
- `GreekGeekStudy/app/(tabs)/profile.tsx` has sign out, notification settings, change password, help, but no delete-account flow.

Needed:
- Add authenticated `DELETE /api/me/` or `POST /api/account-deletion-request/`.
- Decide whether deletion is immediate or request-based.
- Delete or anonymize user data: user record, sessions, notification tokens, password reset tokens, possibly org ownership transfer rules.
- Add frontend account deletion entry under Profile > Account.

### P0 - App Permission Strings Are Not App-Store-Ready

Location permission copy is currently placeholder/profane.

Evidence:
- `GreekGeekStudy/app.json:14`, `29-31`: `gimme dat shi`.

Needed:
- Replace with clear copy, for example:
  - When in use: "GreekGeek uses your location to verify that study sessions are started from approved study locations."
  - Always/background: "GreekGeek uses background location to detect when you leave an approved study location and end your active study session."

### P0 - Privacy Policy / Data Deletion UX Is Missing In The App

Apple requires a privacy policy link in App Store Connect and easily accessible in the app. The profile has Help & Support but no handler or privacy link.

Evidence:
- `GreekGeekStudy/app/(tabs)/profile.tsx:165-172` renders Change Password and Help & Support with no handlers.
- Search found no in-app privacy/terms route.

Needed:
- Add Privacy Policy and Terms links in Profile.
- Policy must cover account data, organization membership, precise location, study sessions, push tokens, retention, and deletion/request process.
- Add a support contact route/link that works.

### P0 - Backend Does Not Verify GPS Proximity On Clock-In

The frontend checks geofence distance, but the backend accepts any `location_id` in the user's org. A modified client can clock in anywhere.

Evidence:
- `GreekGeekStudy/app/(tabs)/study.tsx:196-218` performs client-side distance check.
- `Backend/GreekGeekApi/Study/views.py:241-265` only checks that the submitted location belongs to the user's org.

Needed:
- Clock-in should accept current latitude/longitude and validate distance server-side against `gps_lat`, `gps_long`, `gps_radius`.
- Store verification metadata on `Session`: clock-in lat/long, distance, device timestamp, maybe accuracy.
- Return structured error when outside radius.

### P1 - Admin Settings Screen Is Frontend-Only

Admin Settings presents verification, notifications, security, debug, maintenance, session timeout, multiple-device settings, but saving only shows an alert.

Evidence:
- `GreekGeekStudy/app/(admin)/settings.tsx:11-33` local settings state.
- `GreekGeekStudy/app/(admin)/settings.tsx:35-42` save does not call backend.

Needed:
- Add backend model, serializer, API endpoint, and migration for organization settings.
- Connect all toggles/fields to persisted org settings.
- Decide which settings actually affect behavior:
  - require location verification
  - allow manual entry
  - require photos
  - reminder emails
  - progress report emails
  - password reset period
  - session timeout
  - multiple devices
  - maintenance mode

### P1 - Photo Verification Is Modeled But Not Implemented

The app advertises admin settings for required photos, and the backend has session fields, but no upload/storage/capture workflow exists.

Evidence:
- `Backend/GreekGeekApi/Study/models.py` has `Session.before_pic` and `after_pic`.
- `Backend/GreekGeekApi/Study/views.py:259-265` comments `BEFORE PIC, AFTER PIC LATER`.
- `GreekGeekStudy/app/(admin)/settings.tsx:134-163` exposes "Require Photos".

Needed:
- Add media storage decision: S3, local media, or cloud provider.
- Add upload endpoints and session serializer fields.
- Add capture prompts in clock-in/clock-out.
- Add admin review display in user detail and reports.

### P1 - Manual Study Entry Is Advertised But Not Implemented

Admin Settings includes "Allow Manual Entry", but users have no manual log flow and backend has no dedicated endpoint.

Evidence:
- `GreekGeekStudy/app/(admin)/settings.tsx:121-132`.
- Only admins can patch sessions through `api/sessions/<id>/`.

Needed:
- Add user-facing manual session request/add flow if enabled.
- Add backend permission rules: user-created manual entries, admin approval optional, audit trail.
- Add UI to History or Study: "Add study time".

### P1 - Admin Reset Password Endpoint Used By Frontend Does Not Exist

The admin user detail screen calls `api/user/{id}/reset-password/`, but no such route exists. Password reset exists only as email/token endpoints by email.

Evidence:
- `GreekGeekStudy/app/(admin)/user-detail.tsx:301-322`.
- `Backend/GreekGeekApi/GreekGeekApi/urls.py:45-48` only has generic password reset request/confirm/validate.

Needed:
- Either change frontend to call `api/password-reset/request/` with the target user's email, or add a staff-only reset endpoint.
- Add success/error messaging that tells the admin what happened.

### P1 - Report Export Is Placeholder

Reports show an Export Report button, but it only displays a "would export" alert.

Evidence:
- `GreekGeekStudy/app/(admin)/reports.tsx:194-198`, `694-698`.

Needed:
- Implement CSV export locally in app, backend CSV/PDF endpoint, or both.
- Include current filters: lifetime/current period, user/group/location tab.
- Use native share sheet or file save.

### P1 - Period Setting Detail Routes Are Broken For UUID IDs

`PeriodSetting.id` is UUID, but detail/update/delete route uses `<int:pk>`.

Evidence:
- `Backend/GreekGeekApi/Study/models.py:42`.
- `Backend/GreekGeekApi/GreekGeekApi/urls.py:51-57`.
- Frontend type correctly treats `PeriodSetting.id` as string in `GreekGeekStudy/app/(admin)/study-periods.tsx:12-20`.

Needed:
- Change URL converter to `<uuid:pk>`.
- Add tests for retrieve/update/delete.

### P1 - Clock-Out Can Crash If The User Has No Session

`ClockOut` reads `last_session.start_time` before checking if a session exists.

Evidence:
- `Backend/GreekGeekApi/Study/views.py:210-212`.

Needed:
- Guard `if not last_session or last_session.hours is not None` before accessing fields.
- Return a 400 with "You are not clocked in."

### P1 - Location Modification Is Not Scoped To Admin Organization

Admin location update/delete uses `Location.objects.all()` and does not override `get_queryset`, unlike list/detail.

Evidence:
- `Backend/GreekGeekApi/Study/views.py:183-186`.

Needed:
- Scope `ModifyLocation.get_queryset()` to `Location.objects.filter(org=request.user.org)`.
- Add permission tests.

### P1 - Session Editing Has Backend Contract Mismatch Risk

Frontend uses `PATCH /api/sessions/{id}/` with `{ hours }`, while backend custom update calls DRF update logic and is fragile around null/partial behavior.

Evidence:
- `GreekGeekStudy/app/(admin)/user-detail.tsx:348-410`.
- `Backend/GreekGeekApi/Study/views.py:679-717`.

Needed:
- Explicitly implement `patch` for hours-only updates.
- Support ending an in-progress session, editing a completed session, and rejecting "completed -> in progress" unless intentionally supported.
- Add tests for admin session edit/delete.

### P1 - Notification Preferences Are Partially Implemented

User-level notification settings exist and save, but there is no visible notification history, no explicit push opt-in explanation, no backend scheduled settings from Admin Settings, and no unsubscribe/email-preference layer.

Evidence:
- User settings fields in `Backend/GreekGeekApi/Study/models.py:113-115`.
- Profile saves those fields in `GreekGeekStudy/app/(tabs)/profile.tsx:35-59`, `206-229`.
- Admin notification settings are frontend-only in `GreekGeekStudy/app/(admin)/settings.tsx`.

Needed:
- Add push permission explainer and token registration QA.
- Add email notification preferences if reminder/progress emails ship.
- Add server-side settings that control reminders and progress reports.

### P1 - Onboarding And Tutorials Are Missing

The app does not yet guide new users, new org admins, or returning admins through the core workflows. This is a product completeness and activation issue, especially because the app has location permissions, organization registration codes, study periods, study locations, groups, reports, and admin settings.

Needed:
- Add first-run member onboarding screens:
  - Join/confirm organization.
  - Explain location permission and why it is needed.
  - Explain starting/stopping a study session.
  - Explain progress, history, leaderboard, and notification preferences.
- Add lightweight in-app tutorials:
  - Study screen tooltip/coach marks for clock-in, approved study areas, progress, and map.
  - History tutorial for sessions/current period.
  - Profile tutorial for notification settings, support, privacy, and account deletion.
- Add org-admin-specific onboarding:
  - First admin login checklist: organization info, registration code, study locations, study period, groups, users, reports.
  - Explain the difference between active/enforced settings and planned settings.
  - Prompt admins to create at least one study location before inviting users.
  - Prompt admins to configure an active study period before relying on reports/leaderboards.
- Add admin dashboard onboarding:
  - Empty-state widgets with setup actions.
  - Checklist progress component on Admin Dashboard.
  - Contextual help in Manage Organization, Users, Groups, Study Periods, Reports, and Admin Settings.
- Store onboarding completion state per user and per organization.
- Allow users/admins to replay tutorials from Profile/Admin Settings.

### P2 - Sign-Up Validation Is Incomplete

The sign-up screen collects a confirmation password but only checks that it is nonblank. It does not compare password and confirmation before submitting.

Evidence:
- `GreekGeekStudy/app/(auth)/sign-up.tsx:60-89`.
- `GreekGeekStudy/app/(auth)/sign-up.tsx:260-270`.

Needed:
- Add `password === confirmPassword` validation.
- Improve backend error mapping and empty-state errors.

### P2 - Change Password Is Not Wired In Mobile App

Password reset exists through backend web/email routes, but mobile Profile "Change Password" does nothing.

Evidence:
- `GreekGeekStudy/app/(tabs)/profile.tsx:165-168`.
- Backend has password reset request/confirm/validate routes.

Needed:
- Add mobile forgot/change password flow or deep-link to hosted reset flow.
- If using email reset, add "Forgot Password?" on sign-in.

### P2 - Landing "Register Your Organization" Link Is Placeholder

Mobile landing links to Google.

Evidence:
- `GreekGeekStudy/app/index.tsx:40-42`.

Needed:
- Link to hosted registration page or in-app organization registration if allowed.

### P2 - Search Route Is Stub

The dynamic search route exists but only renders static text.

Evidence:
- `GreekGeekStudy/app/search/[query].tsx`.

Needed:
- Remove it if not needed, or implement search for users/locations/admin data.

### P2 - Reports Are Lifetime-Heavy And Need Product Decisions

Reports can show user/group/location tabs and fetch backend org report data, but exports and deeper analytics are missing.

Needed:
- Decide whether reports are for current period, historical period, or lifetime by default.
- Add trend charts, compliance rate, missing-hours list, and export.

### P2 - Admin/User Management Needs More Guardrails

Current user management is useful but unfinished.

Needed:
- Prevent deleting the last admin in an org.
- Add invite flow instead of admin creating passwords directly.
- Add group assignment from user detail.
- Add audit log for admin edits/deletions.

## Visual And UX Refresh Plan

### Global Direction

The current UI is functional but inconsistent: big rounded cards, heavy green headers, mixed spacing, small dense tables, and some playful/placeholder copy make it feel less polished than the product premise. Reposition it as a clean "chapter study operations" app:
- Primary palette: off-white surface, black/charcoal text, GreekGeek green as action/accent only, restrained blue for maps/links.
- Reduce rounded corners to 8-12px on most UI; reserve circles for avatars and clock state.
- Standardize type scale: screen title 20-22, section title 16-18, body 14-15, metadata 12-13.
- Standardize screen padding to 16px and card padding to 14-16px.
- Replace large stacked cards with compact rows where the user is scanning data.
- Use one reusable header pattern across user and admin screens.

### Auth / Onboarding

Current issues from screenshots:
- Too much empty space.
- Logo is oversized.
- Sign-up form feels like a raw form, not a guided onboarding step.
- Error styling on sign-up is visually loud and cramped.
- No first-run onboarding or tutorials exist for members or org admins.

Changes:
- First screen should show brand, one-sentence value prop, and two clear actions without bottom-anchored controls.
- Convert registration-code flow into a two-step card: "Join your organization" -> "Create your account".
- Show organization match as a compact confirmation row with "Change code".
- Add password requirements and confirmation mismatch feedback inline.
- Add "Forgot password?" to sign-in.
- Add post-sign-up member onboarding screens for organization confirmation, location permission rationale, starting a session, tracking progress, and notification preferences.
- Add separate org-admin onboarding after organization registration/first admin login.
- Add persistent onboarding completion flags so tutorials do not repeat unless manually replayed.

### Study Screen

Current issues:
- Start button dominates but lacks context.
- Study Locations blue card and Admin Dashboard green card compete.
- Progress is tiny and low-information.
- Map image appears as a partially clipped strip in screenshots.
- Current location card overlaps visually with map content.

Changes:
- Make the top module a status panel: "Not studying" / "Studying at Ethan-house", elapsed time, clock button.
- Make clock button a full-width primary action, not a large decorative circle, or keep circle but place it inside a cleaner status panel.
- Put progress immediately under status: required, completed, remaining, due date.
- Move admin entry out of Study, or make it a small icon/button in header for staff.
- Make map a stable 16:10 panel with location chips below; do not show a tiny cropped map strip.
- Show clear location state: "You are outside all approved study areas" plus nearest location/distance if feasible.
- Add empty state when no study locations exist: "No approved study areas yet" with admin CTA if staff.

### History

Current issues:
- Mostly empty screen when there are no sessions.
- Progress card duplicates Study but with less context.

Changes:
- Use a period summary header: "This week", required hours, completed hours, deadline.
- For no sessions, show an action-oriented empty state and link to Study.
- For sessions, use compact timeline rows with date, location, duration, status.
- Add filters: current period, all time.

### Leaderboard

Current issues:
- List is very sparse and looks like raw test data.
- Duplicate users are visually confusing.
- Medal icons are text emoji-like and not polished.

Changes:
- Add ranked rows with number, avatar initials, name, group, hours, live badge.
- Add segmented toggle: Individual / Groups.
- Distinguish "You" with subtle outline, not a large green-tinted row.
- Add empty/zero-hour state that explains ranking starts after sessions.

### Profile

Current issues:
- Profile is card-heavy and oversized.
- Placeholder copy "Email Address lil bruh" must be removed.
- Account actions are buried in Organization.
- Change Password and Help & Support do nothing.
- No delete account/privacy links.

Changes:
- Use a compact profile header with initials/avatar, name, role, organization.
- Split into: Account, Organization, Notifications, Support.
- Add working Change Password, Privacy Policy, Terms, Help & Support, Delete Account.
- Make Sign Out a standard destructive row, not a huge card.

### Admin Dashboard

Current issues:
- Admin menu cards are repetitive and consume too much vertical space.
- Green header bars are heavy and inconsistent with tab screens.
- There is no guided setup checklist for new org admins.

Changes:
- Use a compact admin home with sections: Organization, People, Study Rules, Reporting.
- Each row: icon, label, key metric, chevron.
- Add status widgets: active users, active study areas, current period required hours, users behind target.
- Add first-run admin setup checklist: organization info, registration code, locations, study period, users/groups, reports.
- Add contextual admin tutorials and allow replay from Admin Settings.

### Manage Organization

Current issues:
- Registration code field appears disabled/gray and unclear.
- Location row actions are tiny.
- Add Location is buried.

Changes:
- Separate into clear panels: Organization Info, Registration, Study Locations.
- Use "Copy Code" and "Regenerate" buttons with explicit confirmation.
- Location rows should include address, radius, edit, delete, and "View on map".
- Add a full-screen location editor with map pin/radius, not only form fields.

### Manage Users

Current issues:
- User rows are low density but not informative.
- Add New User is a bottom button without invite context.

Changes:
- Show name, email, role, group, current-period hours, live status.
- Add filters: all, admins, users, no group, behind target.
- Rename "Add New User" to "Invite User" if email invite is implemented; otherwise "Create User".

### Manage Groups

Current issues:
- Group screen shows minimal info and assignment affordances are unclear.

Changes:
- Show group cards/rows with member count, total hours, average hours.
- Add drag/select assignment modal with checkboxes and search.
- Add empty group state and no-unassigned-users state.

### Study Periods

Current issues:
- Empty state and create form are plain.
- Weekly day selector is visually clunky.

Changes:
- Show current period status first: required hours, start, due, active period.
- Convert period type into segmented control.
- Use native date picker and weekday chips with consistent selected state.
- Warn when changing active settings affects current tracking.

### Reports

Current issues:
- Tables are cramped and small.
- Export is not real.
- Report scope is unclear.

Changes:
- Add scope selector at top: Current Period / Previous Period / Lifetime.
- Add top stat cards: total hours, completion rate, users behind, active locations.
- Make tabs sticky: Users / Groups / Locations.
- Replace table-heavy layout with sortable rows.
- Implement Export Report or remove the button until ready.

## Apple Compliance Checklist

### Must Fix Before Submission

- Account deletion: required because app supports account creation. Add in-app deletion initiation.
- Privacy policy: add public URL in App Store Connect and an in-app link.
- Location permission copy: replace placeholder strings and explain exact purpose.
- Demo account: App Review needs full access to account-based features. Prepare admin and regular user demo credentials plus seeded org data.
- Backend must be live and reviewable. Hosted API must be stable during review.
- Remove placeholder content: Google registration link, stub search route, fake export, nonfunctional buttons, placeholder copy.
- Ensure location use is directly relevant and consented. It is core to study verification, but background location needs a clear explanation and should only be requested when necessary.

### Likely Needed Depending On Launch Shape

- If organization registration remains web-based, make sure the mobile app still supports account deletion and does not link out awkwardly for core account management.
- If push notifications are used, provide notification permission rationale and allow users to disable relevant categories.
- If the app is used by college students who may include minors, privacy policy should cover minors and organization/admin visibility of study data.
- If subscriptions/payments are added later, add complete IAP flows and App Store metadata disclosure.

## Suggested Implementation Order

1. App Review blockers: account deletion, privacy/support links, permission strings, remove placeholder links/copy.
2. Backend correctness/security: server-side clock-in location validation, clock-out crash fix, location org scoping, period UUID route fix.
3. Feature truthfulness: wire or remove Admin Settings, Reports Export, Change Password, Admin Reset Password. Photo/selfie verification remains deferred by product decision.
4. Product polish and visual refresh: redesign the core Study/Profile/Admin flows first, then History/Leaderboard/Reports, and build shared layout components so the app has stable workflows before onboarding explains them.
5. Product completeness: report improvements, invite flow, admin guardrails, and remaining workflow gaps. Do not implement photo verification yet.
6. Onboarding and activation: member first-run flow, org-admin first-run flow, tutorials, admin setup checklist, onboarding completion persistence, and replay controls based on the polished UI.
