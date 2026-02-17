# Cycle 4: Quality Depth — Silent Failures, Settings Split, Business Logic Tests

> Date: 2026-02-17
> Scope: I-3, I-7, I-5
> Dependency order: I-3 (independent) | I-7 (independent) | I-5 (depends on I-3 for clean catch blocks)

---

## JTBD

When **a user encounters an error while using the app** (network failure, API timeout, bad data), they want to **know what went wrong and what to do next**, so they can **either retry or adjust their action instead of staring at a broken screen with no feedback**.

When **a developer needs to modify settings functionality**, they want to **open a small, focused file for the tab they are editing**, so they can **make changes quickly without reading 678 lines of unrelated UI code**.

When **a developer changes business logic** (weather checklist rules, AQI thresholds, route recommendation), they want to **run tests that validate the exact rules**, so they can **catch regressions before they reach users**.

---

## Problem

- **Who:** End users (silent failures), developers (SettingsPage monolith, untested logic)
- **Pain:**
  - **I-3:** 23+ catch blocks silently swallow errors. Users see blank data or stuck UI with zero feedback. This was the highest-RICE Important item (400) identified in Cycle 1.
  - **I-7:** SettingsPage.tsx is 678 lines — the largest remaining monolith after HomePage was split in Cycle 3. Every settings change requires reading the entire file.
  - **I-5:** Core business functions (weather checklist generation, AQI level mapping, route recommendation, notification message building) have zero unit tests. Any change to these rules is a blind deployment.
- **Current workaround:** Users refresh the page when something fails silently. Developers grep through SettingsPage for the tab they need. Business logic changes are tested manually.
- **Success metric:**
  - Zero `.catch(() => {})` calls in user-facing data flows (infrastructure/preload exceptions excluded)
  - SettingsPage.tsx orchestrator < 120 lines; each tab component < 200 lines
  - 25+ new unit tests covering weather-utils, route-utils, notification-message-builder, and AQI logic

---

## I-3: Silent Failure Audit & Fix (23 Remaining)

### Current State — Full Catch Block Inventory

**Frontend — 44 catch blocks total across `frontend/src/` (excluding test files):**

#### CATEGORY: FIX — Silent failures that need user feedback (15 sites)

| # | File | Line | Current Behavior | Required Fix |
|---|------|------|-----------------|--------------|
| 1 | `pages/route-setup/use-station-search.ts` | 54 | Silently empties results on search error | Add `setSearchError('검색에 실패했습니다')` state, show inline error |
| 2 | `pages/home/use-home-data.ts` | 115 | `.catch(() => {})` on weather API | Show "날씨 정보를 불러올 수 없습니다" in WeatherHeroSection |
| 3 | `pages/home/use-home-data.ts` | 119 | `.catch(() => {})` on air quality API | Show "미세먼지 정보 없음" label in AQI badge |
| 4 | `pages/home/use-home-data.ts` | 203-206 | `.catch(() => {...})` silently stops loading subway arrivals | Show "조회 실패" in transit info card |
| 5 | `pages/home/use-home-data.ts` | 222-225 | `.catch(() => {...})` silently stops loading bus arrivals | Show "조회 실패" in transit info card |
| 6 | `pages/commute-dashboard/use-commute-dashboard.ts` | 94 | `.catch(() => [])` on analytics — user sees empty analytics | Show "분석 데이터를 불러올 수 없습니다" |
| 7 | `pages/commute-dashboard/use-commute-dashboard.ts` | 110 | `.catch(() => {})` on route comparison | Show "비교 데이터 없음" placeholder |
| 8 | `pages/commute-dashboard/use-commute-dashboard.ts` | 122 | `.catch(() => {})` on behavior patterns | Show "패턴 분석 실패" message |
| 9 | `pages/commute-dashboard/use-commute-dashboard.ts` | 125 | `.catch(() => {})` on nested behavior load | (Covered by #8 parent handler) |
| 10 | `pages/RouteSetupPage.tsx` | 115 | `.catch(() => [] as Alert[])` on alerts load | Show "알림 정보를 불러올 수 없습니다" notice |
| 11 | `pages/RouteSetupPage.tsx` | 122-124 | `.catch(() => {...})` only sets loading false, no error message | Add `setError('경로 목록을 불러올 수 없습니다')` |
| 12 | `pages/RouteSetupPage.tsx` | 300-302 | Silent catch after alert auto-creation fails | Show toast: "경로는 저장되었지만 알림 생성에 실패했습니다" |
| 13 | `pages/SettingsPage.tsx` | 67-68 | `.catch(() => [])` on both API calls inside Promise.all | (Partially mitigated by outer catch on line 77; acceptable but could add `console.warn`) |
| 14 | `pages/SettingsPage.tsx` | 333 | `navigator.clipboard.writeText(userId).catch(() => {})` | Show brief "복사 실패" feedback or fallback |
| 15 | `pages/alert-settings/use-alert-crud.ts` | 98 | `.catch(() => {})` on saved routes load | Show "저장된 경로를 불러올 수 없습니다" |

#### CATEGORY: ACCEPTABLE_SILENT — Intentionally silent, add `console.warn` only (6 sites)

| # | File | Line | Rationale |
|---|------|------|-----------|
| 16 | `pages/alert-settings/use-alert-crud.ts` | 108-110 | Reload failure after successful operation — comment says "non-critical". Add `console.warn`. |
| 17 | `pages/home/use-home-data.ts` | 86-88 | Individual `.catch(() => [])` inside Promise.all — outer catch handles total failure. Add `console.warn` for observability. |
| 18 | `pages/CommuteTrackingPage.tsx` | 52 | `.catch(() => null)` on in-progress session check — fallback is "start new". Add `console.warn`. |
| 19 | `pages/LoginPage.tsx` | 35-37 | Google status check failure — graceful degradation. Already has comment. OK as-is. |
| 20 | `pages/home/use-home-data.ts` | 142 | `console.warn` already present. OK. |
| 21 | `pages/home/use-home-data.ts` | 159 | `console.warn` already present. OK. |

#### CATEGORY: SKIP — Infrastructure/framework, silent by design (10 sites)

| # | File | Line | Rationale |
|---|------|------|-----------|
| 22-24 | `App.tsx` | 35-37 | Preload `import()` failures — doesn't affect functionality |
| 25 | `main.tsx` | 17 | SW update check — offline is expected |
| 26-28 | `infrastructure/analytics/behavior-collector.ts` | 76, 98, 118 | Tracking failures — explicitly non-critical |
| 29 | `infrastructure/push/push-manager.ts` | 63 | Unsubscribe cleanup — subscription already removed |
| 30 | `infrastructure/storage/safe-storage.ts` | 9 | Storage full — already logs with `console.warn` |
| 31 | `infrastructure/api/api-client.ts` | 81 | Retry loop inner catch — rethrows after retries |

#### CATEGORY: GOOD — Already has proper user feedback (13 sites)

| File | Line | Feedback |
|------|------|----------|
| `OnboardingPage.tsx` | 135 | `setError('경로 생성에 실패했습니다...')` |
| `NotificationHistoryPage.tsx` | 108, 128 | `setError('알림 기록을 불러올 수 없습니다')` |
| `RouteSetupPage.tsx` | 168, 357, 441 | `setError(...)` with specific messages |
| `AlertSettingsPage.tsx` | 126 | Full error classification with 401 handling |
| `SettingsPage.tsx` | 77, 97, 116, 142, 167, 183 | `setActionError(...)` or `setPrivacyMessage(...)` |
| `commute-dashboard/LoadMoreButton.tsx` | 23 | `setLoadError(...)` |
| `commute-dashboard/use-commute-dashboard.ts` | 126 | `setLoadError(...)` |
| `CommuteTrackingPage.tsx` | 100, 189, 203 | `setError(...)` with specific messages |
| `LoginPage.tsx` | 78 | Full error classification |
| `home/use-home-data.ts` | 94, 305 | `setLoadError(...)` or fallback navigation |
| `alert-settings/use-alert-crud.ts` | 74, 148, 186, 201, 248 | `setError(...)` with specific messages |
| `home/weather-utils.tsx` | 80 | JSON parse fallback — returns empty Set (data utility, not user-facing) |
| `commute-dashboard/types.ts` | 17 | JSON parse fallback — returns empty array (data utility) |

**Backend — 28 catch blocks total across `backend/src/` (excluding test files):**

All backend catch blocks are **GOOD** — they either:
- Log with `this.logger.error()` / `this.logger.warn()` and re-throw (18 sites)
- Log and return error response to client (4 sites: controllers)
- Log and continue with degraded data (6 sites: send-notification.use-case.ts graceful degradation)

No backend fixes required for silent failures.

### Scope (MoSCoW)

**Must:**
- Fix all 15 FIX-category frontend catch blocks with user-visible feedback
- Each fix uses either: (a) existing error state + `role="alert"`, (b) inline "실패" label, or (c) `console.warn` for observability

**Should:**
- Add `console.warn` to 4 ACCEPTABLE_SILENT sites (#16-18) for better debugging

**Could:**
- Add retry buttons on weather/air quality fetch failures

**Won't (this cycle):**
- Global error boundary with toast system (separate feature)
- Backend catch block changes (already good)

### Task Breakdown

| # | Task | Size | Deps |
|---|------|------|------|
| 3.1 | Add `weatherError`/`airQualityError` states to `use-home-data.ts`; display in `WeatherHeroSection.tsx` | M | none |
| 3.2 | Add `transitError` field to `TransitArrivalInfo`; display "조회 실패" in `CommuteSection.tsx` | S | none |
| 3.3 | Add error states to `use-commute-dashboard.ts` for analytics/comparison/patterns | M | none |
| 3.4 | Fix `RouteSetupPage.tsx` silent catches (lines 115, 122, 300) | S | none |
| 3.5 | Fix `use-station-search.ts` search error (line 54) | S | none |
| 3.6 | Fix `SettingsPage.tsx` clipboard catch (line 333) | S | none |
| 3.7 | Fix `use-alert-crud.ts` silent routes load (line 98) | S | none |
| 3.8 | Add `console.warn` to 4 ACCEPTABLE_SILENT sites | S | none |

### Acceptance Criteria

- [ ] Given a network failure when loading weather, When the HomePage renders, Then the weather section shows "날씨 정보를 불러올 수 없습니다" instead of empty/loading forever
- [ ] Given a network failure when loading air quality, When the HomePage renders, Then the AQI badge shows "-" with "정보 없음" label
- [ ] Given a subway API failure, When transit arrivals load, Then the transit card shows "조회 실패" instead of staying in loading state
- [ ] Given a search API failure in route setup station search, When the user types a station name, Then an inline error "검색에 실패했습니다" appears below the search field
- [ ] Given a clipboard write failure on SettingsPage, When the user clicks the ID copy button, Then a brief "복사 실패" or fallback text-selection prompt appears
- [ ] Given `grep -rn "\.catch(() => {})" frontend/src/ --include="*.ts" --include="*.tsx"`, When executed after all fixes, Then only infrastructure/preload catches remain (App.tsx preloads, main.tsx SW update)

---

## I-7: SettingsPage.tsx Tab Component Extraction

### Current State

`frontend/src/presentation/pages/SettingsPage.tsx` — **678 lines**, a single component containing:

| Section | Lines | Description |
|---------|-------|-------------|
| Imports | 1-11 | 10 imports |
| Types + constants | 12-14 | `SettingsTab` type, `TOAST_DURATION_MS` |
| State declarations | 16-51 | 18 `useState` calls, 1 `useMemo` |
| Data loading (useEffect) | 54-87 | Core data fetch |
| Event handlers | 89-201 | 7 async handlers + 1 sync (logout) + 1 utility (formatScheduleTime) |
| Auth guard | 213-222 | `AuthRequired` early return |
| Tab bar JSX | 224-283 | 4 tab buttons with inline SVGs |
| Loading state | 285-291 | Loading spinner |
| Error display | 293-298 | Action error banner |
| Profile tab JSX | 304-351 | Phone number, user ID, logout |
| Routes tab JSX | 355-409 | Route list with actions |
| Alerts tab JSX | 413-477 | Alert list with toggle/delete |
| App tab JSX | 481-614 | Version, local data, push, privacy, footer |
| Modals | 619-668 | Delete modal, local reset modal, delete all data modal |
| Toast | 670-675 | Reset success toast |

### Proposed Structure

```
frontend/src/presentation/pages/settings/
  SettingsPage.tsx          (~100 lines) — orchestrator: tabs, loading, error
  ProfileTab.tsx            (~80 lines)  — phone, userId, logout
  RoutesTab.tsx             (~90 lines)  — route list, delete route
  AlertsTab.tsx             (~100 lines) — alert list, toggle, delete
  AppTab.tsx                (~180 lines) — version, local data, push, privacy, footer
  use-settings.ts           (~130 lines) — all state + handlers extracted
  index.ts                  (~1 line)    — barrel export
```

### Extraction Plan

**`use-settings.ts`** extracts:
- All 18 state variables
- `commuteApi` memo
- Data loading `useEffect` (lines 54-87)
- Push notification check `useEffect` (lines 125-128)
- All 8 handlers: `handleToggleAlert`, `handleDeleteConfirm`, `handleTogglePush`, `handleExportData`, `handleDeleteAllData`, `handleLogout`
- `formatScheduleTime` utility
- Returns a single typed object consumed by the orchestrator

**`SettingsPage.tsx` (orchestrator)** keeps:
- `useAuth()` for auth guard
- `useSettings()` for all state
- Tab bar with `role="tablist"` and ARIA attributes
- Loading/error display
- Conditional tab rendering via `{activeTab === 'profile' && <ProfileTab ... />}`
- Modal rendering (modals are cross-tab, stay in orchestrator)
- Toast rendering

**Each tab component** receives:
- Only the props it needs (no prop-drilling of entire settings state)
- Tab panel wrapper with `role="tabpanel"`, `id`, `aria-labelledby`

### Scope (MoSCoW)

**Must:**
- Extract 4 tab components + 1 custom hook
- Maintain all existing functionality (zero behavior change)
- Keep ARIA tab/tabpanel attributes intact
- All existing tests pass unchanged

**Should:**
- Move `formatScheduleTime` to a shared util or keep in `use-settings.ts`
- Type the hook return value explicitly

**Could:**
- Extract modals into a `SettingsModals.tsx` component

**Won't (this cycle):**
- Change any styling or CSS classes
- Add new features to settings
- Move SettingsPage tests (update imports only)

### Task Breakdown

| # | Task | Size | Deps |
|---|------|------|------|
| 7.1 | Create `use-settings.ts` — extract all state + handlers + effects | M | none |
| 7.2 | Create `ProfileTab.tsx` — extract lines 304-351 | S | 7.1 |
| 7.3 | Create `RoutesTab.tsx` — extract lines 355-409 | S | 7.1 |
| 7.4 | Create `AlertsTab.tsx` — extract lines 413-477 | S | 7.1 |
| 7.5 | Create `AppTab.tsx` — extract lines 481-614 | M | 7.1 |
| 7.6 | Rewrite `SettingsPage.tsx` as orchestrator (~100 lines) | M | 7.1-7.5 |
| 7.7 | Create `index.ts` barrel export; update all imports (router, test file) | S | 7.6 |
| 7.8 | Verify existing `SettingsPage.test.tsx` passes with updated imports | S | 7.7 |

### Acceptance Criteria

- [ ] Given the new `settings/` directory, When `wc -l SettingsPage.tsx` is run, Then it is under 120 lines
- [ ] Given each tab file, When `wc -l {Tab}.tsx` is run, Then each is under 200 lines
- [ ] Given the full extraction, When `npm run build` is run, Then it succeeds with zero errors
- [ ] Given the existing `SettingsPage.test.tsx`, When tests run, Then all existing tests pass
- [ ] Given the settings page in the browser, When a user switches tabs, Then ARIA `role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-controls`, `aria-labelledby` attributes are all present and correct
- [ ] Given the settings page, When a user performs any action (toggle alert, delete route, export data, etc.), Then the behavior is identical to the current monolith

---

## I-5: Core Business Logic Test Suite

### Current State — Test Coverage Gaps

**Frontend test files:** 10 test files exist in `frontend/src/`, all are page-level integration tests (render + mock API). **Zero pure function unit tests.**

**Backend test files:** 33 `.spec.ts` files exist. Key untested files:
- `notification-message-builder.service.ts` (308 lines, 15 methods) — **0 tests**
- `pattern-analysis.service.ts` — **0 tests**

### Target Functions & Test Plan

#### A. `weather-utils.tsx` (177 lines, 8 exported functions)

| Function | Lines | Test Cases | Expected Tests |
|----------|-------|------------|:-------------:|
| `getWeatherType(condition)` | 24-31 | 'clear'->sunny, 'cloudy'->cloudy, 'rain'->rainy, 'snow'->snowy, '맑음'->sunny, '구름많음'->cloudy, '비'->rainy, '눈'->snowy, 'thunderstorm'->rainy, 'unknown'->default | 10 |
| `getWeatherChecklist(weather, airQuality)` | 33-66 | rain+umbrella, snow+umbrella, highRainProb+umbrella, badAir+mask, veryBadAir+mask, cold+coat, hot+sunscreen, tempDiff+scarf, highHumidity+spare, sunny+no items, multiple items combined | 11 |
| `getAqiStatus(pm10)` | 171-177 | null->dash, 0->좋음, 30->좋음, 31->보통, 80->보통, 81->나쁨, 150->나쁨, 151->매우나쁨 | 8 |
| `getGreeting()` | 92-101 | All 7 time brackets (hour 0-5, 6-8, 9-11, 12-13, 14-17, 18-20, 21-23) | 7 |
| `getWeatherAdvice(weather, airQuality)` | 160-169 | rainy->우산, snowy->눈길, badAir->마스크, freezing->방한, hot->더위, sunny->쾌적, default->좋은하루 | 7 |
| `getTodayKey()` | 68-71 | Returns `YYYY-M-D` format | 1 |

**Subtotal: 44 tests** in `weather-utils.test.ts`

#### B. `route-utils.ts` (31 lines, 1 exported function)

| Function | Lines | Test Cases | Expected Tests |
|----------|-------|------------|:-------------:|
| `getActiveRoute(routes, forceType)` | 11-31 | empty array->null, single route->returns it, morning preferred first, evening preferred first, forceType='morning' overrides time, forceType='evening' overrides time, auto mode morning (hour<14), auto mode evening (hour>=14), no preferred falls back to type match, no type match falls back to first route | 10 |

**Subtotal: 10 tests** in `route-utils.test.ts`

#### C. `notification-message-builder.service.ts` (308 lines, 15 methods) — Backend

| Method | Test Cases | Expected Tests |
|--------|------------|:-------------:|
| `buildWeatherString(weather)` | No forecast->conditionKr, with forecast slots, rainy slot shows %, dry slots no % | 3 |
| `isRainyCondition(condition)` | '비'->true, 'rain'->true, '맑음'->false, '소나기'->true, 'snow'->true | 5 |
| `buildAirQualityString(airQuality)` | undefined->'정보 없음', with pm10 shows value, without pm10 shows status only | 3 |
| `formatArrivalTime(seconds)` | 0->'곧 도착', 60->'곧 도착', 61->'1분', 600->'10분' | 4 |
| `buildSummary(data)` | weather only, weather+airQuality, weather+subway+bus, all combined, empty data | 5 |
| `generateTip(data)` | rain highlight->umbrella tip, cold->coat tip, hot->heat tip, bad air->mask tip, route rec->route tip, linked route->departure tip, default->좋은하루 | 7 |
| `generateTransitTip(data)` | both->지금출발, subway only, bus only, neither | 4 |
| `buildWeatherHighlights(weather, airQuality)` | rain forecast->우산, temp diff>=10->겉옷, freezing->방한, heatwave->수분, bad air->마스크 | 5 |
| `extractTimeSlotsWithRain(hourlyForecasts)` | 3 slots normal, rainy slot overrides, missing slots filled, empty array | 4 |
| `buildSubwayInfo/buildBusInfo` | empty->정보없음, single station, multiple stations | 4 |

**Subtotal: 44 tests** in `notification-message-builder.service.spec.ts`

#### D. `use-home-data.ts` — `nextAlert` computation (lines 240-275)

| Logic | Test Cases | Expected Tests |
|-------|------------|:-------------:|
| `nextAlert` memo logic | No enabled alerts->null, single alert today, single alert tomorrow (past time), multiple alerts picks soonest today, cron parsing with comma-separated hours | 5 |

This is embedded in the hook; extract the `computeNextAlert` function to a utility for testing.

**Subtotal: 5 tests** in `alert-schedule-utils.test.ts` (new file with extracted function)

### Total Expected Tests: 103

### Scope (MoSCoW)

**Must:**
- `weather-utils.test.ts` (44 tests)
- `route-utils.test.ts` (10 tests)
- `notification-message-builder.service.spec.ts` (44 tests)

**Should:**
- Extract `computeNextAlert` from `use-home-data.ts` and test (5 tests)

**Could:**
- Add snapshot tests for `WeatherIcon` SVG output

**Won't (this cycle):**
- E2E tests for settings page
- Integration tests for API clients
- `pattern-analysis.service` tests (low RICE relative to effort)

### Task Breakdown

| # | Task | Size | Deps |
|---|------|------|------|
| 5.1 | Create `weather-utils.test.ts` — 44 tests for 6 pure functions | L | none |
| 5.2 | Create `route-utils.test.ts` — 10 tests for `getActiveRoute` (mock `Date` for time-based logic) | S | none |
| 5.3 | Create `notification-message-builder.service.spec.ts` — 44 tests for 10+ methods | L | none |
| 5.4 | Extract `computeNextAlert` to `alert-schedule-utils.ts`; create `alert-schedule-utils.test.ts` — 5 tests | M | none |

### Acceptance Criteria

- [ ] Given `weather-utils.test.ts`, When `npm test -- weather-utils` runs, Then all 44 tests pass
- [ ] Given `route-utils.test.ts`, When `npm test -- route-utils` runs, Then all 10 tests pass
- [ ] Given `notification-message-builder.service.spec.ts`, When `npm test -- notification-message-builder` runs, Then all 44 tests pass
- [ ] Given the extracted `computeNextAlert`, When tested with various cron schedules and times, Then all 5 tests pass
- [ ] Given all new test files, When `npm test` runs in CI, Then total test count increases by 100+ and all pass
- [ ] Given `getWeatherChecklist({ temperature: 3, humidity: 85, condition: 'rain', forecast: { hourlyForecasts: [...] } }, { label: '나쁨', className: 'aqi-bad' })`, When called, Then it returns items for umbrella, mask, coat, and spare clothes (4 items)
- [ ] Given `getActiveRoute([], 'auto')`, When called, Then it returns `null`
- [ ] Given `formatArrivalTime(0)`, When called, Then it returns '곧 도착'

---

## Dependency Order

```
I-3 (Silent Failures) ──────────────────────► I-5 (Tests)
       │                                         │
       │  catch blocks cleaned up first           │  tests validate both old & new error states
       │                                         │
I-7 (Settings Split) ── independent ─────────────┘
```

**Recommended execution order:**

1. **I-7 first** — Pure refactoring, no behavior change, lowest risk. Creates the `settings/` directory pattern. Easy to verify (existing tests pass, build succeeds).

2. **I-3 second** — Changes catch block behavior across 8+ files. Should be done before I-5 so tests can validate the new error states.

3. **I-5 last** — Tests validate both existing pure functions AND the new error handling patterns from I-3. Writing tests last means they test the final state of the code.

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|:-----------:|:------:|------------|
| I-3 error states cause re-renders in hot paths | Low | Medium | Use `useState` with guards; don't set error on every render |
| I-7 breaks existing SettingsPage tests | Medium | Low | Run tests after each extraction step; keep prop interfaces stable |
| I-5 tests are flaky due to Date mocking | Medium | Low | Use `vi.useFakeTimers()` and `vi.setSystemTime()` for deterministic time |
| I-3 introduces new UI elements that break layout | Low | Medium | Error messages use existing CSS classes (`.notice.error`, inline text) |
| I-5 backend tests need complex mocking | Low | Medium | `NotificationMessageBuilderService` has no DI deps — pure methods, easy to test |

---

## Out of Scope

- CSS changes or new design patterns (use existing `.notice.error`, inline text)
- Backend catch block modifications (all already have logging)
- Global error boundary / toast notification system
- E2E tests for the settings page
- `pattern-analysis.service` tests (deferred to Cycle 5+)
- Integration tests for API calls
- Any feature additions to settings

---

## Open Questions

1. **Should weather/air quality errors show a retry button?** — Recommendation: No for this cycle. Just show the error state. Retry button is a separate UX enhancement (log as N-level backlog item).

2. **Should `computeNextAlert` extraction touch the hook's public API?** — Recommendation: Yes, extract to `alert-schedule-utils.ts` and import into `use-home-data.ts`. The hook's return type does not change.

---

*Estimated cycle effort: M+M+M = L (one full development cycle)*
*Total new/modified files: ~18 (8 new test files, 6 new settings components, ~10 modified for error states)*
