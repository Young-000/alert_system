# QA Report: P2-5 iOS Live Activity

> Date: 2026-02-20 | Branch: `feature/ios-live-activity` | QA Agent

---

## Verdict: NEEDS FIXES (5 bugs found)

Overall quality is high. Architecture is clean, graceful degradation is well-implemented, and test coverage is thorough. However, 2 major bugs and 3 warnings require attention before merge.

---

## Acceptance Criteria Verification

| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| AC-1 | Live Activity auto-starts 60 min before departure | PASS | `useSmartDepartureToday.ts` line 144: `minutesUntil <= 60` check |
| AC-2 | Countdown displays in real-time on lock screen | PASS | `Text(timerInterval:)` OS-native timer used |
| AC-3 | Auto-ends on session complete (Geofence enter) | FAIL | Bug #1 — geofence callback is never actually invoked |
| AC-4 | Auto-ends on 30-min timeout | PASS | `LIVE_ACTIVITY_TIMEOUT_MIN = 30` constant, `minutesUntil < -30` check |
| AC-5 | Tap Live Activity → opens app commute screen | PASS | `.widgetURL(URL(string: "commute-mate://commute"))` |
| AC-6 | "preparing" state with blue theme | PASS | `LiveActivityTheme.commuteBlue` |
| AC-7 | "departureSoon" state at 10 min | PASS | `determineStatus()` returns `departureSoon` at `minutesUntil <= 10` |
| AC-8 | "inTransit" on Geofence exit | FAIL | Bug #1 — same root cause |
| AC-9 | Dynamic Island Compact view | PASS | `compactLeading` + `compactTrailing` in `CommuteLiveActivity` |
| AC-10 | Dynamic Island Expanded view | PASS | `DynamicIslandExpandedRegion` with 3 regions |
| AC-11 | Dynamic Island Minimal view | PASS | `minimalView` shows minutes only |
| AC-12 | Commute mode icon + blue/orange theme | PASS | `modeIcon` property, `statusColor` switch |
| AC-13 | Return mode icon + purple theme | PARTIAL | `returnPurple` defined but the `lockScreenBackground` and `statusColor` do not use `returnPurple` for "preparing" state in return mode — both always use `commuteBlue`. Bug #2. |
| AC-14 | Push-to-update token registration | PASS | `registerPushToken()` called after `startActivity()` |
| AC-15 | Push token rotation handled | PASS | `observePushTokenUpdates()` async sequence, re-registers with server |
| AC-16 | TypeScript 0 errors | PASS | Verified by orchestrator |
| AC-17 | No regressions in WidgetKit | PASS | `CommuteWidget.swift` unchanged except `CommuteLiveActivity` addition |
| AC-18 | iOS < 16.1 graceful degradation | PASS | `@available(iOS 16.1, *)` + `#available` guards throughout |
| AC-19 | Battery-efficient (no separate timer) | PASS | `Text(timerInterval:)` used exclusively — no `Timer`/`setInterval` at native level |

---

## Build Pipeline

| Step | Result |
|------|--------|
| TypeScript (backend) | PASS — 0 errors |
| TypeScript (mobile) | PASS — 0 errors |
| Jest (backend) | PASS — 675 passed, 10 skipped, 0 failed (28 new tests) |
| Swift compile | NOT VERIFIED — requires Xcode/EAS build |
| Mobile test suite | NOT VERIFIED |

---

## Bug Reports

### Bug #1 — Geofence Live Activity Callback is Never Invoked (Major / P1)

**Severity:** Major
**Priority:** P1
**Status:** Open

**Description:**
The geofence callback wired in `useGeofence.ts` (lines 82–103) is stored in `geofenceCallbackRef.current`, but the background task defined in `geofence.service.ts` (`TaskManager.defineTask`) has no awareness of this ref. The callback reference lives inside the React hook closure; the Expo TaskManager background task runs in a completely separate JS context and cannot access it. As a result:
- Geofence exit does NOT trigger "inTransit" state transition
- Geofence entry at destination does NOT end the Live Activity
- Acceptance criteria AC-3 and AC-8 are unmet

**Root cause:** Background task runs in a detached context (Expo background task pattern). The `geofenceCallbackRef` approach works only for foreground event dispatch. The background task needs to broadcast an event that the foreground hook can subscribe to (e.g., via `EventEmitter`, `AsyncStorage` polling, or a custom event bus).

**File:** `mobile/src/hooks/useGeofence.ts:82-104` and `mobile/src/services/geofence.service.ts:59-80`

**Test technique:** State Transition Testing — "inTransit" and "arrived" transitions are blocked

**Suggested Fix:**
In `geofence.service.ts`, after processing the geofence event, emit a custom native event or write to `AsyncStorage`. In `useGeofence.ts`, subscribe to that event channel (e.g., via `NativeEventEmitter` or an `AppState`/`AsyncStorage` listener) and invoke `geofenceCallbackRef.current` from foreground context.

---

### Bug #2 — Return Mode Uses Wrong Color (Preparing State) (Minor / P2)

**Severity:** Minor
**Priority:** P2
**Status:** Open

**Description:**
The spec requires "퇴근 모드에서 Live Activity가 시작되면 보라색 컬러 테마로 표시된다" (purple theme for return mode). However:

1. In `CommuteActivityView.swift`, `statusColor` returns `LiveActivityTheme.commuteBlue` for "preparing" regardless of mode. `returnPurple` is defined but never used in `statusColor`.
2. In `CommuteDynamicIsland.swift`, `lockScreenBackground` returns `commuteBlue.opacity(0.9)` for "preparing" regardless of mode.

Return mode only shows purple as `keylineTint` in Dynamic Island and in `modeAccentColor`. Lock screen background and status indicator remain blue even for return mode.

**File:**
- `mobile/targets/widget/Sources/CommuteActivityView.swift:15-29` — `statusColor` property
- `mobile/targets/widget/Sources/CommuteDynamicIsland.swift:43-58` — `lockScreenBackground` method

**Test technique:** Equivalence Partitioning — "commute" and "return" modes should produce distinct visual outputs

**Suggested Fix:**
In `statusColor` (CommuteActivityView) and `lockScreenBackground` (CommuteDynamicIsland), for "preparing" state, check `attributes.mode == "return"` and return `returnPurple` instead of `commuteBlue`.

---

### Bug #3 — `minutesUntilDeparture` Can Be Negative at Activity Start (Warning / P3)

**Severity:** Minor
**Priority:** P3
**Status:** Open

**Description:**
In `LiveActivityModule.swift` line 53:
```swift
minutesUntilDeparture: Int(optimalDepartureAt.timeIntervalSinceNow / 60),
```
`timeIntervalSinceNow` is negative when `optimalDepartureAt` is in the past. This produces a negative `minutesUntilDeparture` in the initial ContentState. The Swift `ContentState` struct accepts `Int` (not `UInt`), so this is structurally valid, but:
- If `minutesUntilDeparture` is used in the lock screen progress bar (`1.0 - Double(state.minutesUntilDeparture) / 60.0`), a value of -5 yields `1.083` — the progress bar overflows beyond 100%.

**File:** `mobile/modules/live-activity/ios/LiveActivityModule.swift:53`

**Test technique:** BVA — departure time at boundary (exactly now, 1 min past)

**Suggested Fix:**
```swift
minutesUntilDeparture: max(0, Int(optimalDepartureAt.timeIntervalSinceNow / 60)),
```

---

### Bug #4 — `registerTokenWithServer` Hardcodes Mode as 'commute' (Warning / P2)

**Severity:** Minor
**Priority:** P2
**Status:** Open

**Description:**
In `useLiveActivity.ts` line 97:
```typescript
mode: 'commute', // Will be overridden by the caller
```
This comment is incorrect — there is no override mechanism. The `registerTokenWithServer` callback is invoked from the push token observer (line 64) when a token rotates. At token rotation time, the mode from the original `start()` call is lost because it was not persisted in hook state.

When a return-mode Live Activity token rotates, it is re-registered with `mode: 'commute'` on the server. This causes the server to store incorrect mode metadata, which will affect push-to-update routing when real APNs implementation lands.

**File:** `mobile/src/hooks/useLiveActivity.ts:93-99`

**Test technique:** State Transition Testing — token rotation during "return" mode activity

**Suggested Fix:**
Store `mode` alongside `settingId` in a ref:
```typescript
const modeRef = useRef<LiveActivityMode | null>(null);
// In start(): modeRef.current = params.mode;
// In registerTokenWithServer: mode: modeRef.current ?? 'commute'
```

---

### Bug #5 — `routeName` Receives Setting ID Instead of Route Name (Info / P3)

**Severity:** Trivial
**Priority:** P3
**Status:** Open

**Description:**
In `useSmartDepartureToday.ts` line 154:
```typescript
routeName: snapshot.id, // routeId not available in snapshot, use setting ID
```
The `CommuteActivityAttributes.routeName` field (displayed on the lock screen as the route description) receives a UUID string instead of a human-readable route name. The lock screen will show something like `"3e4a2f1c-..."` instead of `"2호선 출근 경로"`.

**File:** `mobile/src/hooks/useSmartDepartureToday.ts:154`

**Test technique:** Exploratory — SFDPOT Data heuristic

**Suggested Fix (two options):**
1. Add `routeName` to `SmartDepartureSnapshotDto` and populate it from the backend.
2. For now, use `snapshot.arrivalTarget` as a display fallback (e.g., `"09:00 도착 경로"`) which is at least human-readable.

---

## Additional Findings (Non-Bug)

### Warning: `@DynamicIslandExpandedContentBuilder` on Compact/Minimal Methods

**File:** `mobile/targets/widget/Sources/CommuteDynamicIsland.swift:68, 86, 116`

The `compactLeadingView`, `compactTrailingView`, and `minimalView` methods are decorated with `@DynamicIslandExpandedContentBuilder`. The correct result builder for compact/minimal views is the default SwiftUI `@ViewBuilder`. Using the wrong attribute may cause compilation issues or unexpected behavior.

The `@DynamicIslandExpandedContentBuilder` attribute is only correct for the `expandedView` method. This requires Xcode build verification to confirm whether it causes a compile error or is silently ignored.

**Risk:** Medium — could be a compile error (would block Xcode build) or a silent no-op.

### Info: `SmartDepartureModule` Does Not Import `LiveActivityModule`

**File:** `backend/src/presentation/modules/smart-departure.module.ts`

The `CalculateDepartureUseCase` uses `@Optional() @Inject(LIVE_ACTIVITY_PUSH_SERVICE)` and the push-to-update hook in `notifyLiveActivityUpdate()` builds a content state but cannot send pushes because `LiveActivityTokenEntity` repository is not injected. The developer documents this as "will be wired in a future step."

This is intentional for MVP (push-to-update is a "Should have" feature), but the token lookup is completely absent — not even a TODO for injecting the repository into the use case. When real APNs implementation is added, developers may miss that `LiveActivityTokenEntity` needs to be injected into `SmartDepartureModule` imports.

**Recommendation:** Add a clear TODO comment in `calculate-departure.use-case.ts` noting that `LiveActivityModule` needs to be imported into `SmartDepartureModule` for full push-to-update functionality.

### Info: `LiveActivityManager` Uses `print()` in Production Code

**File:** `mobile/targets/widget/Sources/LiveActivityManager.swift:48, 63, 91, 201`

`print()` statements are present for error/debug logging. In a production widget extension, these are appropriate for MVP but should be replaced with `os_log` or a structured logger before App Store submission for better log filtering.

### Info: Unretained `Task {}` Handles in `LiveActivityManager`

**File:** `mobile/targets/widget/Sources/LiveActivityManager.swift:76, 95, 135`

The `updateActivity` and `endActivity` methods fire-and-forget async work via `Task { await activity.update(...) }`. These are not retained. If the extension is unloaded before the Task completes (rare but possible), the update may not be delivered. This is an acceptable trade-off for the widget extension context and is consistent with iOS WidgetKit patterns, but worth noting.

### Info: Push Token Format Inconsistency in Spec vs Implementation

The spec says `pushToken: string` is "base64 encoded", but the implementation generates a **hex string** (`tokenToHexString` in `LiveActivityManager.swift`). This is consistent between Swift and TypeScript — both use hex — but the spec comment in `live-activity.dto.ts` says "base64" (inherited from spec). When APNs HTTP/2 implementation is built, developers must send the raw binary token (reconstructed from hex), not base64. Annotate the TODO in `live-activity-push.service.ts` to clarify this.

---

## State Transition Analysis (ISTQB)

Expected state machine:
```
idle → preparing → departureSoon → departureNow → inTransit → arrived → ended
```

| Transition | Trigger | Status |
|------------|---------|--------|
| idle → preparing | minutesUntil <= 60 | PASS |
| preparing → departureSoon | minutesUntil <= 10 | PASS |
| departureSoon → departureNow | minutesUntil <= 0 | PASS |
| Any → inTransit | Geofence exit | FAIL (Bug #1) |
| inTransit → arrived | Geofence enter (destination) | FAIL (Bug #1) |
| Any → ended | minutesUntil < -30 | PASS |
| Any → ended | Manual (tap in app) | PASS (via `end()`) |

---

## Security Spot-Check

- [x] No hardcoded API keys or secrets in any file reviewed
- [x] JWT auth guard applied to all `/live-activity/*` endpoints
- [x] User ownership enforced in DELETE endpoint (`userId` in WHERE clause)
- [x] Input validation via class-validator in `RegisterLiveActivityDto`
- [x] Push token stored but not logged (only first 12 chars logged in stub)
- [x] App Group identifier is non-sensitive (`group.com.commutemate.app`)

---

## Test Coverage Assessment

### Backend
- Domain entity: 11 tests — boundary values covered (empty strings, invalid mode) — THOROUGH
- Controller: 8 tests — happy paths, upsert, ownership enforcement, 404 — THOROUGH
- Push service: 9 tests — stub behavior, payload construction, edge cases — ADEQUATE (stub testing only; real APNs not tested by design)
- No test for `notifyLiveActivityUpdate()` in `calculate-departure.use-case.spec.ts` — MISSING (low priority since it is a log-only stub)

### Mobile
- No unit tests for `useLiveActivity.ts` hook — MISSING (P2: hook has complex state and side effects)
- No unit tests for `useSmartDepartureToday.ts` Live Activity integration — MISSING (P2)
- No unit tests for `useGeofence.ts` Live Activity integration — MISSING (coincidentally moot due to Bug #1)
- TypeScript types: well-defined, no `any` usage in new files

---

## Techniques Applied

- [x] BVA on `minutesUntilDeparture` (negative boundary — found Bug #3)
- [x] EP on `mode` field ('commute' vs 'return' — found Bug #2, Bug #4)
- [x] State Transition Testing (5-state Live Activity FSM — found Bug #1)
- [x] SFDPOT exploratory (Data heuristic — found Bug #5)
- [x] Security spot-check
- [x] Regression check (existing WidgetKit, useSmartDepartureToday, useGeofence)

---

## Summary

| # | Severity | Title | Status |
|---|----------|-------|--------|
| 1 | Major (P1) | Geofence callback not connected to background task — inTransit/arrived transitions broken | Open |
| 2 | Minor (P2) | Return mode uses commute blue instead of purple in preparing state | Open |
| 3 | Minor (P3) | `minutesUntilDeparture` can be negative at activity start | Open |
| 4 | Minor (P2) | `registerTokenWithServer` hardcodes mode as 'commute' during token rotation | Open |
| 5 | Trivial (P3) | `routeName` shows UUID instead of human-readable name | Open |

**Blocker:** Bug #1 (P1) — the "inTransit" state transition is a core spec requirement (AC-8). The Geofence → Live Activity integration does not function. This must be fixed before merge.

Bug #2 (P2) is a spec compliance failure for return mode color theming. Fix recommended before merge.

Bugs #3, #4, #5 can be fixed in a follow-up if timeline is tight.

The `@DynamicIslandExpandedContentBuilder` annotation issue (Warning) requires Xcode build verification. If it causes a compile error, it becomes a blocker.
