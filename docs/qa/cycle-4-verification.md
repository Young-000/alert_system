# Cycle 4 QA Verification Report

> Date: 2026-02-17
> QA Agent: Senior QA Engineer
> Scope: I-7 (SettingsPage Split), I-3 (Silent Failure Fixes), I-5 (Business Logic Tests)

---

## Overall Verdict: CONDITIONAL PASS (2 MAJOR, 1 MINOR issues)

The build pipeline passes, test count increased significantly (+135), and the core structural work is solid. However, I-3 (Silent Failures) has a systemic defect: error states are created in hooks but not wired to UI components, meaning users still see no feedback on several failure paths.

---

## 1. Build Pipeline

| Check | Result | Output |
|-------|:------:|--------|
| TypeScript (`tsc --noEmit`) | PASS | No errors |
| ESLint (`--max-warnings=0`) | PASS | No warnings |
| Frontend Tests (114) | PASS | 13 suites, 114 passed, 0 failed |
| Backend Tests (286) | PASS | 31 suites passed (3 skipped), 286 passed, 0 failed |
| Frontend Build (`vite build`) | PASS | 65.40 kB gzip, built in 564ms |

**Test count increase:**
- Frontend: 45 -> 114 (+69 tests)
- Backend: 220 -> 286 (+66 tests)
- Total: 265 -> 400 (+135 tests, +51%)

---

## 2. I-7 Verification: SettingsPage Split

### File Structure

| File | Lines | Spec Limit | Status |
|------|------:|:----------:|:------:|
| `settings/SettingsPage.tsx` (orchestrator) | 160 | < 120 | FAIL (see MINOR-1) |
| `settings/use-settings.ts` (hook) | 310 | ~130 | OK (complex but well-typed) |
| `settings/ProfileTab.tsx` | 56 | < 200 | PASS |
| `settings/RoutesTab.tsx` | 66 | < 200 | PASS |
| `settings/AlertsTab.tsx` | 78 | < 200 | PASS |
| `settings/AppTab.tsx` | 161 | < 200 | PASS |
| `settings/index.ts` (barrel) | 1 | - | PASS |
| `pages/SettingsPage.tsx` (re-export) | 1 | - | PASS |

**Total: 832 lines across 7 files** (was 678 in a single file)

### Acceptance Criteria

- [x] `settings/` directory exists with expected files (orchestrator, 4 tabs, hook, barrel)
- [ ] Orchestrator < 120 lines -- **FAIL: 160 lines** (see MINOR-1)
- [x] Each tab component < 200 lines
- [x] Build succeeds with zero errors
- [x] Existing `SettingsPage.test.tsx` passes (16 tests, 2 suites)
- [x] Original `SettingsPage.tsx` re-exports from `settings/`

### ARIA Tab/Tabpanel Verification

| Attribute | Present | Location |
|-----------|:-------:|----------|
| `role="tablist"` | YES | `SettingsPage.tsx:29` |
| `role="tab"` | YES | `SettingsPage.tsx:39` |
| `aria-selected` | YES | `SettingsPage.tsx:41` |
| `id="tab-{id}"` | YES | `SettingsPage.tsx:40` |
| `aria-controls="tabpanel-{id}"` | YES | `SettingsPage.tsx:42` |
| `role="tabpanel"` | YES | All 4 tab components |
| `id="tabpanel-{id}"` | YES | All 4 tab components |
| `aria-labelledby="tab-{id}"` | YES | All 4 tab components |

### Functionality Spot-Check

- [x] ProfileTab: phone number, user ID copy, logout -- all props correctly wired
- [x] RoutesTab: route list, delete, navigation to commute -- all props correctly wired
- [x] AlertsTab: alert list, toggle, delete, schedule formatting -- all props correctly wired
- [x] AppTab: version, local data, push toggle, export, delete all, privacy -- all props correctly wired
- [x] Modals (delete, local reset, delete all data) remain in orchestrator -- correct, they are cross-tab
- [x] Toast (reset success) remains in orchestrator -- correct

### I-7 Result: PASS (with MINOR-1)

---

## 3. I-3 Verification: Silent Failure Fixes

### FIX Category (15 sites) -- Detailed Status

| # | File | Error State Created | Error Displayed in UI | Verdict |
|---|------|:-------------------:|:---------------------:|:-------:|
| 1 | `use-station-search.ts:57-60` | YES (`setSearchError`) | **NO** -- `searchError` not passed to `StationSearchStep` | **FAIL** |
| 2 | `use-home-data.ts:120` | YES (`setWeatherError`) | **NO** -- `weatherError` not consumed by `HomePage.tsx` | **FAIL** |
| 3 | `use-home-data.ts:124` | YES (`setAirQualityError`) | **NO** -- `airQualityError` not consumed by `HomePage.tsx` | **FAIL** |
| 4 | `use-home-data.ts:208-211` | YES (`error: '조회 실패'` on transit info) | **PARTIAL** -- fallback shows "정보 없음" not "조회 실패" | **FAIL** |
| 5 | `use-home-data.ts:227-230` | YES (`error: '조회 실패'` on transit info) | **PARTIAL** -- same as #4 | **FAIL** |
| 6 | `use-commute-dashboard.ts:100-102` | YES (`setAnalyticsError`) | **NO** -- not consumed by any dashboard component | **FAIL** |
| 7 | `use-commute-dashboard.ts:119` | YES (`setComparisonError`) | **NO** -- not consumed by any dashboard component | **FAIL** |
| 8 | `use-commute-dashboard.ts:131` | YES (`setBehaviorError`) | **NO** -- not consumed by any dashboard component | **FAIL** |
| 9 | `use-commute-dashboard.ts:134` | Covered by #8 | Covered by #8 | **FAIL** |
| 10 | `RouteSetupPage.tsx:115-117` | YES (`console.warn` + fallback `[]`) | YES (outer catch sets `setError`) | PASS |
| 11 | `RouteSetupPage.tsx:125-129` | YES (`setError('경로 목록을 불러올 수 없습니다')`) | YES (error rendered in UI) | PASS |
| 12 | `RouteSetupPage.tsx:306-308` | YES (`setWarning(...)`) | YES (warning rendered in AskMoreStep) | PASS |
| 13 | `use-settings.ts:118-119` | NO (inner Promise.all catches still return `[]`) | Mitigated by outer catch line 124 | PASS (acceptable) |
| 14 | `use-settings.ts:252-255` | YES (`setActionError('복사에 실패했습니다.')`) | YES (actionError banner in orchestrator) | PASS |
| 15 | `use-alert-crud.ts:98-100` | YES (`setError('저장된 경로를 불러올 수 없습니다')`) | YES (error state rendered in AlertSettingsPage) | PASS |

**Summary: 6/15 PASS, 9/15 FAIL (error states created but not displayed in UI)**

### ACCEPTABLE_SILENT Category (6 sites) -- Detailed Status

| # | File | `console.warn` Added | Verdict |
|---|------|:--------------------:|:-------:|
| 16 | `use-alert-crud.ts:110-112` | YES | PASS |
| 17 | `use-home-data.ts:91-93` | YES (3 inner catches) | PASS |
| 18 | `CommuteTrackingPage.tsx:52` | YES | PASS |
| 19 | `LoginPage.tsx:35-37` | Already OK | PASS |
| 20 | `use-home-data.ts:142` | Already OK | PASS |
| 21 | `use-home-data.ts:159` | Already OK | PASS |

**Summary: 6/6 PASS**

### Bare `.catch(() => {})` Remaining

After fixes, only infrastructure/preload catches remain:
```
App.tsx:35  import('./pages/RouteSetupPage').catch(() => {});
App.tsx:36  import('./pages/AlertSettingsPage').catch(() => {});
App.tsx:37  import('./pages/SettingsPage').catch(() => {});
main.tsx:17 registration.update().catch(() => {
```
These are all SKIP-category (preload/SW) -- **correct**.

### I-3 Result: FAIL (MAJOR-1)

**Root Cause:** The developer created error states in hooks (correct pattern) but did not wire them through to the UI components that render the data. The error states exist but are invisible to users. This is a "half-done" implementation -- the plumbing is in place but the last mile (UI display) is missing for 9 out of 15 fix sites.

---

## 4. I-5 Verification: Business Logic Tests

### Test Files Created

| File | Tests | All Pass | Quality |
|------|------:|:--------:|:-------:|
| `weather-utils.test.ts` | 48 | YES | Excellent |
| `route-utils.test.ts` | 10 | YES | Excellent |
| `alert-schedule-utils.test.ts` | 11 | YES | Excellent |
| `notification-message-builder.service.spec.ts` | 66 | YES | Excellent |

**Total new tests: 135** (spec target: 103+)

### Coverage

| File | Statements | Branches | Functions | Lines |
|------|:----------:|:--------:|:---------:|:-----:|
| `alert-schedule-utils.ts` | 100% | 91.66% | 100% | 100% |
| `route-utils.ts` | 100% | 100% | 100% | 100% |
| `weather-utils.tsx` | 83.49% | 83.60% | 70% | 81.48% |

`weather-utils.tsx` coverage is lower because the file contains the `WeatherIcon` React component (SVG rendering, lines 104-151) which is not covered by pure function unit tests. The **business logic functions** within the file are fully covered.

### Test Quality Assessment

**Boundary Value Analysis (BVA):**
- `getAqiStatus`: Tests at boundaries 0, 30, 31, 80, 81, 150, 151 -- excellent BVA
- `getGreeting`: Tests all 7 time brackets -- complete coverage
- `formatArrivalTime`: Tests at 0, 60 (boundary), 61, 600 -- good BVA

**Equivalence Partitioning (EP):**
- `getWeatherType`: Tests 4 valid partitions (sunny/cloudy/rainy/snowy) + Korean + English + unknown + case-insensitive
- `getWeatherChecklist`: Tests individual conditions + combined conditions + empty + missing data
- `isRainyCondition`: 11 cases using `it.each` -- comprehensive EP

**Edge Cases:**
- `computeNextAlert`: Empty array, all disabled, comma-separated hours, non-numeric cron parts, malformed schedule
- `getActiveRoute`: Empty array, single route, force override, fallback chain
- `buildWeatherString`: No forecast, empty forecasts, rain probability display logic
- `buildSummary`: Empty data, incremental data additions

**Meaningful Assertions:**
- Tests assert on specific return values (not just "truthy")
- Helper factories (`buildWeather`, `buildRoute`, `buildAlert`) provide clean test data
- `jest.useFakeTimers()` + `jest.setSystemTime()` used correctly for time-dependent logic
- `it.each` used for tabular testing in `isRainyCondition`

### `computeNextAlert` Extraction

- Extracted from `use-home-data.ts` to `alert-schedule-utils.ts` (41 lines, pure function)
- `use-home-data.ts` imports and calls `computeNextAlert` via `useMemo`
- Hook's public API (return type) unchanged
- 11 tests cover all edge cases including comma-separated hours, past/future times, disabled alerts

### I-5 Result: PASS

---

## 5. Bug Report

### MAJOR-1: I-3 Silent failure error states not wired to UI

**Severity:** Major
**Priority:** P1
**Status:** Open

**Description:** Error states (`weatherError`, `airQualityError`, `analyticsError`, `comparisonError`, `behaviorError`, `searchError`, transit `error`) are created in hooks but never consumed by UI components. Users still see no error feedback when weather, air quality, transit, analytics, or search APIs fail.

**Affected files:**
- `pages/home/HomePage.tsx` -- does not destructure or display `weatherError` / `airQualityError` from `useHomeData()`
- `pages/home/WeatherHeroSection.tsx` -- has no error prop
- `pages/home/CommuteSection.tsx` -- does not check `info.error` on `TransitArrivalInfo`
- `pages/commute-dashboard/DashboardTabs.tsx` (and sub-tabs) -- does not consume `analyticsError` / `comparisonError` / `behaviorError`
- `pages/RouteSetupPage.tsx` -- passes page-level `error` to `StationSearchStep`, not `search.searchError`

**Required Fix:** For each error state in the hook:
1. Add the error field to the component's props interface
2. Destructure it in the parent component
3. Render an error message when the error is non-empty (use existing `.notice.error` class or inline text)

**Specifically:**
- `HomePage.tsx`: Pass `weatherError`/`airQualityError` and show fallback UI when weather is null + error is set
- `CommuteSection.tsx`: Check `info.error` and display it instead of "정보 없음"
- Dashboard tabs: Accept and display error props from dashboard hook
- `RouteSetupPage.tsx`: Pass `search.searchError` (or combine with page `error`) to `StationSearchStep`

### MAJOR-2: `searchError` from `use-station-search.ts` not wired to UI

**Severity:** Major
**Priority:** P1
**Status:** Open

**Description:** The `searchError` state in `use-station-search.ts` is set on search API failure (line 60: `setSearchError('검색에 실패했습니다')`) but `RouteSetupPage.tsx` passes its own page-level `error` state to `StationSearchStep`, not the search-specific error.

**File:** `RouteSetupPage.tsx:524`
```tsx
// Current:
error={error}             // page-level error

// Should be:
error={search.searchError || error}  // search error takes priority
```

**Note:** This is technically a sub-issue of MAJOR-1 but called out separately because `StationSearchStep` already has an `error` prop and rendering logic (line 91). Only the wiring is wrong.

### MINOR-1: SettingsPage orchestrator exceeds spec line limit

**Severity:** Minor
**Priority:** P3
**Status:** Open

**Description:** The spec requires orchestrator `SettingsPage.tsx` to be under 120 lines. It is 160 lines. The excess is from 3 `ConfirmModal` instances (44 lines) and inline SVG icons in the tab bar (4 lines each x 4 tabs). The component is well-structured and readable despite being over the limit.

**Suggested Fix (optional):**
- Extract the 3 modals into a `SettingsModals.tsx` component (~50 lines)
- This would bring the orchestrator to ~110 lines

---

## 6. Cross-Cutting Checks

| Check | Result |
|-------|:------:|
| No new ESLint warnings | PASS |
| No TypeScript errors | PASS |
| Build succeeds | PASS |
| No test regressions | PASS |
| No hardcoded secrets | PASS |
| No `console.log` in production code | PASS (only `console.warn` where appropriate) |

---

## 7. Techniques Applied

- [x] Acceptance criteria verification (spec vs implementation)
- [x] Code-level inspection of all 15 FIX sites
- [x] Data flow tracing (hook -> component -> UI render)
- [x] BVA assessment on test quality
- [x] EP assessment on test quality
- [x] ARIA attribute audit on SettingsPage split
- [x] Line count verification against spec targets

---

## 8. Summary

| Item | Verdict | Issues |
|------|:-------:|:------:|
| I-7 (SettingsPage Split) | **PASS** | MINOR-1 (orchestrator 160 > 120 lines) |
| I-3 (Silent Failure Fixes) | **FAIL** | MAJOR-1, MAJOR-2 (error states not wired to UI) |
| I-5 (Business Logic Tests) | **PASS** | None |
| Build Pipeline | **PASS** | None |

### Recommendation

**I-3 requires a follow-up fix before this cycle can be marked complete.** The error state plumbing in hooks is correct -- the developer needs to:

1. Wire `weatherError`/`airQualityError` through `HomePage.tsx` to display when weather data is null
2. Wire transit `info.error` through `CommuteSection.tsx` to show "조회 실패" instead of "정보 없음"
3. Wire `search.searchError` from `useStationSearch` through `RouteSetupPage.tsx` to `StationSearchStep`
4. Wire `analyticsError`/`comparisonError`/`behaviorError` through dashboard tab components

Estimated effort: Small (S) -- props threading and conditional rendering only. No new state logic needed.

I-7 and I-5 are ready to ship as-is. MINOR-1 is cosmetic and can be deferred.

---

*QA verification performed: 2026-02-17*
