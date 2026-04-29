# GreekGeek Full Test Run - 2026-04-28

Environment:
- Backend: local Django API at `http://127.0.0.1:8000/`
- Frontend: Expo iOS simulator
- Account: local dev admin from `.env`

## Test Log

- Started full QA pass.
- Signed in successfully as the local dev admin account.
- Study tab loaded from the local backend with organization `dev-org`.
- Clocked in from the simulator while inside `Local Test Study Area`.
- Backend verified the user is `live=true` with one open session after clock-in.
- Manually clocked out from Study tab after the background geofence failure; UI returned to `Ready to study`.
- Moved simulator outside all approved areas and confirmed clock-in is blocked with `No Study Location Found`.
- Moved simulator back into `Local Test Study Area`; Study tab returned to the in-location state.
- Opened Study Locations from the admin-only Study tab shortcut.
- Created `QA Test Study Area 2026-04-28` through the Study Locations UI.
- Backend dashboard verified two approved study areas after creation.
- History tab loaded and showed completed sessions, including the session created during this run.
- Ranks tab individual leaderboard loaded with organization users.
- Ranks tab group rankings loaded with real group totals.
- Profile tab loaded account details and exposed the Admin Dashboard shortcut for the admin account.
- Admin Dashboard loaded setup checklist, people/access, governance, and settings navigation.
- Manage Users loaded all three organization users and group filters.
- User Details edit mode loaded for a non-admin member.
- Promoted `jimbutts@gmail.com` to admin through the UI, then demoted the user back to member through the UI.
- Backend verified `jimbutts@gmail.com` was restored to `is_staff=false`.
- Groups admin page loaded with `2 groups • 0 unassigned`; users assigned to groups did not appear in the unassigned list.
- Admin API smoke checks passed for `api/org-settings/`, `api/period-settings/`, `api/org-report/`, and `api/groups/`.
- Push notification token registration exists for the simulator account (`iPhone 16` token stored in backend).
- Push delivery through Expo was not sent during this pass because it would transmit the simulator push token and test message to Expo's push service.
- TypeScript verification passed with `npx tsc --noEmit`.

## Issues Found

### 1. Background geofence exit did not clock the user out

- Flow tested: clock in from Study tab, send app to background, move simulator location outside `Local Test Study Area`.
- Expected: geofence exit task should call `api/clockout/`, close the open session, and set the user `live=false`.
- Actual: after moving the simulator from `30.00001,30.0015` to `30.10000,30.10000` and waiting, backend still reported `live=true` with one open session.
- Evidence: latest session id `14` remained open with `hours=null`.
- Fix applied: Study sessions now start both geofencing and background location updates, persist the active study area locally for task handlers, and reconcile active sessions on foreground/resume. Simulator background delivery still did not fire while suspended, but reopening the app outside the study area now detects the distance and clocks out automatically.

### 2. Group leaderboard podium shows a fake placeholder group

- Flow tested: Ranks tab -> Groups.
- Expected: group leaderboard should show only real organization groups, or an intentional empty state if fewer than three groups exist.
- Actual: the podium displayed a third placeholder labeled `Open` even though the organization currently has only two groups: `Pee` and `Poop`.
- Evidence: `Group Rankings` list correctly showed only `Pee` and `Poop`, but the podium still showed `Open` in third place.
- Fix applied: group podium now renders only real groups and keeps the rank numbers tied to the actual sorted group ranking.

### 3. Django test run is blocked by an existing test database prompt

- Flow tested: `cd Backend/GreekGeekApi && ../venv/bin/python manage.py test Study`.
- Expected: test suite should run non-interactively.
- Actual: Django found an existing `test_greekdb` database and prompted for deletion, then failed with `EOFError` in the non-interactive run.
- Evidence: command failed before executing tests with `database "test_greekdb" already exists`.
- Fix applied: added `Backend/scripts/test.sh`, which creates an isolated temporary test database name for each run. Updated test fixtures that were incompatible with current unique registration-code and group foreign-key behavior. `Backend/scripts/test.sh` now runs 54 tests successfully.
