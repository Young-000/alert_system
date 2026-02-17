# QA Report: Cycle 5 — Final Important + High-Value Nice-to-Have

> Date: 2026-02-17
> Scope: I-6, I-2, N-12, N-14, N-5
> QA Agent: Senior QA Engineer

---

## Verdict: PASS (1 advisory note, 0 blockers)

---

## Build Pipeline

| Check | Result | Details |
|-------|--------|---------|
| TypeScript (`tsc --noEmit`) | PASS | Zero errors |
| ESLint (`--max-warnings=0`) | PASS | Zero warnings, zero errors |
| Frontend Tests (`jest`) | PASS | 14 suites, 120 tests passed |
| Backend Tests (`jest`) | PASS | 31 suites, 286 tests passed (3 suites skipped, 10 tests skipped) |
| Vite Build | PASS | Built in 526ms, PWA precache 23 entries (648.78 KiB) |

---

## I-6: useUserLocation Hook

### Acceptance Criteria Verification

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Hook exists at correct path | PASS | `frontend/src/presentation/hooks/useUserLocation.ts` (93 lines) |
| 2 | Uses Geolocation API with localStorage cache | PASS | `navigator.geolocation.getCurrentPosition()` with `{ timeout: 5000, maximumAge: 300000 }` |
| 3 | Seoul fallback (`37.5665, 126.978`) | PASS | `SEOUL_DEFAULT` constant, used when geolocation unavailable or denied |
| 4 | `isDefault` flag distinguishes real vs fallback | PASS | `isDefault: true` for Seoul, `false` for cached/live coords |
| 5 | `isLoading` state transitions | PASS | Starts `true` when geo available, transitions to `false` on success or error |
| 6 | `use-home-data.ts` no longer has hardcoded coords | PASS | Uses `useUserLocation()` hook (line 112), passes `userLocation.latitude`/`userLocation.longitude` to API calls |
| 7 | No remaining hardcoded Seoul coords in `frontend/src/` (outside hook + tests) | PASS | `grep` for `37.5665` or `126.978` returns only `useUserLocation.ts` (definition) and `useUserLocation.test.ts` (fixture) |
| 8 | Weather/air quality APIs receive dynamic coordinates | PASS | Lines 119-128 of `use-home-data.ts` use `userLocation.latitude`/`userLocation.longitude` |
| 9 | Weather effect waits for location resolution | PASS | Guard `if (!userId || userLocation.isLoading) return;` at line 117 |
| 10 | useEffect deps include location values | PASS | `[userId, userLocation.latitude, userLocation.longitude, userLocation.isLoading]` at line 131 |
| 11 | Unit tests exist and pass | PASS | 6 tests, all passing (geolocation available, unavailable, cached, success, error, options) |

### Test Coverage Assessment (useUserLocation)

- [x] Geolocation unavailable (navigator.geolocation undefined) -- Seoul defaults returned
- [x] Cached location from localStorage on mount
- [x] Geolocation success -- updates state and caches to localStorage
- [x] Geolocation denied -- keeps Seoul defaults
- [x] Geolocation timeout with existing cache -- keeps cached location
- [x] getCurrentPosition called with correct options (timeout: 5000, maximumAge: 300000)

### Code Quality Notes

- `getCachedLocation()` properly validates parsed JSON (checks `typeof parsed.latitude === 'number'`)
- `cacheLocation()` handles `localStorage` quota errors silently (acceptable for non-critical cache)
- `geoAvailable` computed outside state initializer to avoid SSR issues (`typeof navigator !== 'undefined'`)
- Error callback preserves `prev.isDefault` correctly (if cached, stays `false`; if Seoul default, stays `true`)

---

## N-5: eslint-disable Resolution

### Acceptance Criteria Verification

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Zero `eslint-disable` in `frontend/src/` | PASS | `grep -r "eslint-disable" frontend/src/` returns zero matches |
| 2 | `AlertSettingsPage.tsx` has proper dependency array | PASS | ESLint reports zero warnings on this file |
| 3 | `CommuteTrackingPage.tsx` has proper dependency array | PASS | ESLint reports zero warnings on this file |
| 4 | No infinite re-render risks | PASS | See analysis below |

### Dependency Array Analysis

**AlertSettingsPage.tsx `handleSubmit` (useCallback, line 87):**

Dependencies declared (line 155-170):
```
userId, wantsWeather, selectedTransports, selectedRouteId, schedule,
alertName, checkDuplicateAlert, setCrudError, setDuplicateAlert,
setIsSubmitting, setCrudSuccess, reloadAlerts, setSelectedTransports,
setTransportSearchQuery
```

Identifiers used but NOT in deps:
- `setWantsWeather`, `setWantsTransport`, `setTransportTypes`, `setSelectedRouteId` -- React `useState` setters (guaranteed stable by React, ESLint plugin recognizes this)
- `wizardSetStepRef` -- a `useRef` (accessed via `.current`, refs are stable by definition)

Verdict: All non-deps are correctly omitted. ESLint confirms zero warnings.

**CommuteTrackingPage.tsx `useEffect` (line 48-111):**

Dependencies declared: `[userId, navigate, commuteApi, navRouteId, searchMode]`

Key design decisions:
- `navRouteId` extracted as primitive from `location.state?.routeId` (line 25) -- avoids object-reference instability
- `searchMode` extracted as primitive from `searchParams.get('mode')` (line 26) -- avoids URLSearchParams reference instability
- `navigate` is stable per React Router guarantee
- `commuteApi` is wrapped in `useMemo(() => ..., [])` (line 16) -- stable singleton

Verdict: No infinite re-render risk. Primitive extraction pattern correctly prevents object reference churn.

---

## N-14: Route Save Toast

### Acceptance Criteria Verification

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | `useToast` and `ToastContainer` imported | PASS | Line 16: `import { useToast, ToastContainer } from '../components/Toast'` |
| 2 | Toast instance created | PASS | Line 34: `const toast = useToast()` |
| 3 | Create route shows success toast | PASS | Line 365: `toast.success('경로가 저장되었습니다')` |
| 4 | Edit route shows distinct message | PASS | Line 342: `toast.success('경로가 수정되었습니다')` |
| 5 | Dual-save (morning + reverse) shows distinct message | PASS | Line 363: `toast.success('출근/퇴근 경로가 저장되었습니다')` |
| 6 | Navigation delayed ~1.5s after toast | PASS | Line 369: `setTimeout(() => navigate('/'), 1500)` |
| 7 | Error message preserved on failure | PASS | Line 371: `setError('저장에 실패했습니다. 다시 시도해주세요.')` (existing behavior unchanged) |
| 8 | `ToastContainer` placed in JSX | PASS | Line 572: `<ToastContainer toasts={toast.toasts} onDismiss={toast.dismissToast} />` |

### Message Matrix

| Scenario | Toast Message | Navigation Delay |
|----------|--------------|:----------------:|
| Edit existing route | "경로가 수정되었습니다" | 1.5s |
| Create morning + reverse | "출근/퇴근 경로가 저장되었습니다" | 1.5s |
| Create single route | "경로가 저장되었습니다" | 1.5s |
| Save failure | (no toast, `setError(...)` displays inline) | No nav |

---

## N-12: Settings Deduplication

### Acceptance Criteria Verification

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | `RoutesTab` is simplified shortcut card | PASS | 38 lines, shows count + "경로 관리 바로가기" link to `/routes` |
| 2 | `AlertsTab` is simplified shortcut card | PASS | 38 lines, shows count + "알림 관리 바로가기" link to `/alerts` |
| 3 | No inline delete/toggle in settings tabs | PASS | Neither tab contains buttons for delete, toggle, or checkpoint summary |
| 4 | Props simplified: `RoutesTab({ routeCount })` | PASS | Interface has single `routeCount: number` prop |
| 5 | Props simplified: `AlertsTab({ alertCount })` | PASS | Interface has single `alertCount: number` prop |
| 6 | `SettingsPage.tsx` passes simplified props | PASS | Line 80: `<RoutesTab routeCount={settings.routes.length} />`, Line 83: `<AlertsTab alertCount={settings.alerts.length} />` |
| 7 | `use-settings.ts` cleaned of unnecessary handlers | PASS | No `deleteModal`, `isDeleting`, `onDeleteRoute`, `onToggleAlert`, `formatScheduleTime` found |
| 8 | Empty state for 0 routes shows link to `/routes` | PASS | "등록된 경로가 없어요" + "경로 추가하기" link |
| 9 | Empty state for 0 alerts shows link to `/alerts` | PASS | "설정된 알림이 없어요" + "알림 설정하기" link |
| 10 | "경로 관리 바로가기" links to `/routes` | PASS | `<Link to="/routes">` |
| 11 | "알림 관리 바로가기" links to `/alerts` | PASS | `<Link to="/alerts">` |

### SettingsPage Test Results

All 16 tests pass (2 suites):
- Login prompt when not logged in
- 4 tabs render when logged in
- Profile tab displays phone number
- Tab switching works
- Empty state for routes (0 routes)
- Empty state for alerts (0 alerts)
- Loading state
- Route count shortcut card (when routes exist)
- Alert count shortcut card (when alerts exist)
- App tab content
- Phone number "미등록" when not set

### Remaining ConfirmModal Usage

`SettingsPage.tsx` still imports `ConfirmModal` -- this is correct. It is used for:
1. Local data reset confirmation (line 102-113)
2. Delete-all-tracking-data confirmation (line 116-128)

These are privacy/data management features unrelated to route/alert deletion. The spec's requirement to "Remove ConfirmModal dependency from SettingsPage (for route/alert deletion)" is satisfied because the route/alert deletion modals are gone.

---

## I-2: CSS Modularization

### Acceptance Criteria Verification

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | `styles/` directory structure exists | PASS | 10 files: `index.css`, `base.css`, `components.css`, 7 page files |
| 2 | Hub `index.css` contains only `@import` statements | PASS | 10 lines: header comment + 9 `@import` statements |
| 3 | `@import` order preserves cascade | PASS | base -> components -> pages (alerts, home, routes, commute, settings, auth, notification-history) |
| 4 | Old `presentation/index.css` removed | PASS | File does not exist |
| 5 | `main.tsx` imports new path | PASS | Line 4: `import './presentation/styles/index.css'` |
| 6 | Build succeeds | PASS | Vite builds in 526ms, CSS bundled to single `index-h1QxR6Sk.css` (224KB) |

### File Size Analysis

| File | Lines | Spec Limit (3000) | Status |
|------|------:|:------------------:|--------|
| `base.css` | 221 | Within | PASS |
| `components.css` | 3,278 | **Exceeds by 278** | ADVISORY |
| `pages/alerts.css` | 2,195 | Within | PASS |
| `pages/auth.css` | 376 | Within | PASS |
| `pages/commute.css` | 3,789 | **Exceeds by 789** | ADVISORY |
| `pages/home.css` | 2,663 | Within | PASS |
| `pages/notification-history.css` | 136 | Within | PASS |
| `pages/routes.css` | 3,786 | **Exceeds by 786** | ADVISORY |
| `pages/settings.css` | 445 | Within | PASS |
| **Total** | **16,899** | — | — |

**Advisory Note:** 3 files exceed the 3,000-line "should" target from the spec:
- `components.css` (3,278 lines) -- slightly over, contains all shared component styles
- `commute.css` (3,789 lines) -- commute tracking has extensive styles across many improvement blocks
- `routes.css` (3,786 lines) -- route setup has many sub-features (DnD, validation, line selection, etc.)

This is a **non-blocking advisory**. The spec classified file size limits as "Should" (not "Must"). The primary goal -- splitting a 16,838-line monolith into navigable, logically organized files -- is achieved. Further splitting is a "Could" item per the spec.

### Spot-Check: Class Definitions in Correct Files

| Class | Expected File | Found In | Correct? |
|-------|--------------|----------|:--------:|
| `.settings-shortcut` | settings.css | settings.css:241 | YES |
| `.page` | components.css | components.css:4 | YES |
| `:root` variables | base.css | base.css:22 | YES |
| `* { box-sizing }` reset | base.css | base.css:15 | YES |

---

## Techniques Applied

- [x] Structured verification against spec acceptance criteria
- [x] Build pipeline validation (lint + typecheck + test + build)
- [x] Dependency array analysis for re-render safety (BVA on effect triggers)
- [x] Code reading for correctness (EP on valid/invalid state transitions)
- [x] File structure verification (glob + existence checks)
- [x] CSS cascade order verification
- [x] Test execution (targeted test suites for modified components)

## Bug Summary

| # | Severity | Title | Status |
|---|----------|-------|--------|
| — | — | No bugs found | — |

## Advisory Notes

| # | Severity | Title | Recommendation |
|---|----------|-------|----------------|
| 1 | Trivial | 3 CSS files exceed 3,000-line target | Consider further splitting `components.css`, `commute.css`, `routes.css` in a future cycle. Non-blocking per spec ("Should" requirement). |

## Areas Not Tested

- **Visual regression** (before/after screenshots): Not performed in this automated verification. CSS modularization is a pure file split with no class renames or style changes, and the build succeeds, so visual regression risk is low. Manual visual inspection recommended before production deploy.
- **Manual flow testing** on live pages (commute tracking, alert creation): Build and unit tests pass, dependency arrays verified safe. Full E2E would add confidence.
- **Geolocation permission prompt UX**: Cannot test browser permission prompts in automated testing. Unit tests cover all code paths (granted, denied, unavailable, cached).

---

*QA verification completed: 2026-02-17 | Cycle 5 | All 5 items PASS*
