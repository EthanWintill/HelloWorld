# Clock Out Feature

## Triggers

There are four ways a clock-out can happen:

### 1. Manual (user-initiated)
User taps the "Clock out" button on the Study screen. Calls `clockOut()`.
- **File:** `app/(tabs)/study.tsx`

### 2. Geofence exit (background)
`GEOFENCE_TASK` fires when the user leaves the study location boundary — works even when the app is backgrounded. Calls `clockOutFromBackgroundLocation()`.
- **File:** `app/(tabs)/study.tsx` — `TaskManager.defineTask(GEOFENCE_TASK, ...)`

### 3. Background location polling
`BACKGROUND_LOCATION_TASK` runs every 30s and checks if the user has exceeded `activeLocation.gps_radius` using haversine distance. Auto-clocks out if threshold is crossed.
- **File:** `app/(tabs)/study.tsx` — `TaskManager.defineTask(BACKGROUND_LOCATION_TASK, ...)`

### 4. Foreground location check
`clockOutIfOutsideActiveStudyLocation()` runs every 30s while the app is in the foreground and the user is actively studying.
- **File:** `app/(tabs)/study.tsx`

---

## What Happens on Clock Out

### API Call
```
POST https://greekgeek.app/api/clockout/
Authorization: Bearer <token>
Body: {} or { end_time: "<ISO datetime>" }
```
Backend closes the active session and records elapsed hours. If `end_time` is provided and is earlier than the current time, it uses that instead of `now` — critical for backdated clock-outs after network recovery (see Offline Handling below).

### Backend Response
- **200** `{ detail: "Successfully clocked out.", start_time, hours }` — success
- **400** `{ detail: "You are not clocked in" }` — no active session
- **400** `{ detail: "Must be apart of an org to clock out" }` — user not in org
- **403** `{ detail: "Your organization is temporarily in maintenance mode" }` — org paused

### Background Monitoring Stopped
`stopBackgroundStudyMonitoring()` is called, which:
- `Location.stopGeofencingAsync(GEOFENCE_TASK)`
- `Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)`
- Clears `ACTIVE_STUDY_LOCATION_KEY` from AsyncStorage

### Events Emitted
- `EVENTS.CLOCK_OUT` — picked up by `ClockEventListener.tsx`
- `EVENTS.DASHBOARD_REFRESH` — triggers `DashboardContext` to re-fetch sessions from `GET /api/dashboard/`

### UI
Stopwatch stops and resets.

---

## Offline Handling (Pending Clock Out)

If the device has no internet when a clock-out is triggered, the app stores a pending clock-out in AsyncStorage and retries once connectivity returns.

### AsyncStorage Key
`pendingClockOut` — stores `{ timestamp: "<ISO datetime>" }` set at the moment the clock-out was originally triggered.

### What Happens Offline
1. Clock-out API call fails with a network error (no `.response` on the `AxiosError`).
2. `PENDING_CLOCK_OUT_KEY` is written to AsyncStorage with the current timestamp.
3. `stopBackgroundStudyMonitoring()` is called immediately — the user has left the zone regardless of connectivity.
4. UI reflects "not studying" / "Syncing..." (see UI section below).

### Retry Triggers
The retry (`retryPendingClockOut()`) is attempted on:
- **App foregrounded** — `AppState` listener detects `background → active` transition
- **Screen focused** — `useFocusEffect` on the study screen
- **Connectivity restored** — `NetInfo.addEventListener` fires when `isConnected && isInternetReachable`

### Retry Logic
On retry, the stored `timestamp` is sent as `end_time` in the request body so the backend records the correct clock-out time — not the later retry time.

| Response | Action |
|---|---|
| 200 success | Clear pending, emit `DASHBOARD_REFRESH` + `CLOCK_OUT` |
| 400 "You are not clocked in" | Session already closed — clear pending, emit `DASHBOARD_REFRESH` |
| 403 maintenance mode | Leave pending — retry again later |
| Other server error | Leave pending |
| Network error (no response) | Still offline — leave pending |

### Pre-emption Guard
`clockOut()` returns early if `pendingClockOut` is already `true` (prevents a second manual clock-out from overwriting the pending).

`clockOutIfOutsideActiveStudyLocation()` checks AsyncStorage directly (not React state) for the pending key before doing anything — this is critical because React state resets when the app backgrounds, but AsyncStorage persists.

### Logging
All pending clock-out events log with the `[PendingClockOut]` prefix so they're easy to grep:
- `[PendingClockOut] background: network error — storing pending clock-out at <ts>`
- `[PendingClockOut] manual clockOut: network error — storing pending at <ts>`
- `[PendingClockOut] retry: attempting clock-out for pending stored at <ts>`
- `[PendingClockOut] retry: success — pending cleared with end_time <ts>`
- `[PendingClockOut] retry: session already closed on server — pending cleared`
- `[PendingClockOut] retry: still offline — pending remains`
- `[PendingClockOut] foreground: found pending clock-out, retrying`
- `[PendingClockOut] focus: found pending clock-out, retrying`
- `[PendingClockOut] NetInfo: connectivity restored — attempting retry`
- `[PendingClockOut] clockOutIfOutside: skipping — pending clock-out already stored`

---

## UI During Pending Clock Out

`effectiveIsStudying = isStudying && !pendingClockOut` is computed at render time and used in place of `isStudying` in all JSX. This means the screen immediately shows "not studying" even though the backend session is still technically open.

| State | Status label | Button label | Button |
|---|---|---|---|
| Studying, online | Studying | Clock out | Active (red) |
| Pending clock-out | Syncing... | Syncing... | Disabled (dimmed) |
| Not studying | Ready to study | Clock in | Active |

The 30s foreground location check interval is also suppressed when `pendingClockOut` is true.

---

## Session Data Model

```typescript
interface Session {
  id: number;
  start_time: string;   // set on clock-in
  hours: number | null; // null while active, populated on clock-out
  location: number | Location | null;
}
```

Active sessions are identified by `hours === null` (`context/DashboardContext.tsx`).

---

## Offline Error Screen Pattern

`DashboardContext` preserves `prev.data` when a fetch fails — it never clears stale data on network error. All tab screens use `if (error && !data)` (not `if (error)`) to gate the full-screen error view. This means a network drop while the user already has data just silently fails; the error screen only shows on a first-load failure with no cached data.

Screens that follow this pattern: `study.tsx`, `history.tsx`, `leaderboard.tsx`, `profile.tsx`.

---

## Key Files

| File | Role |
|---|---|
| `app/(tabs)/study.tsx` | All clock-in/out logic, background tasks, pending clock-out |
| `context/DashboardContext.tsx` | Session state, refresh on clock events, offline data preservation |
| `services/DashboardService.ts` | `notifyClockOut()` / `onClockOut()` helpers |
| `services/EventEmitter.ts` | `EVENTS` enum definition |
| `components/ClockEventListener.tsx` | Subscribes to clock events across the app |

---

## Settings That Affect Clock Out

| Setting | Effect |
|---|---|
| `require_location_verification` | If `false`, no geofence/location-based auto clock-out |
| `maintenance_mode` | If `true`, prevents clock in/out entirely; pending clock-outs are NOT cleared until maintenance lifts |
