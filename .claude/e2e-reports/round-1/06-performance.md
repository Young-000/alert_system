# Performance Review Report

**Date**: 2026-02-24
**Agent**: Performance
**Branch**: feature/e2e-auto-review-20260224

---

## 1. Frontend Bundle Size

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| JS gzip total | 160.77 kB | < 500 kB | PASS |
| CSS gzip | 41.26 kB | - | OK |
| Total (JS+CSS) gzip | 202.03 kB | < 500 kB | PASS |
| SW gzip | 18.12 kB | - | OK |

**Largest chunks (gzip)**:
- `vendor-react`: 45.56 kB (React core)
- `RouteSetupPage`: 25.96 kB (largest page - includes DnD kit)
- `index` (app shell): 13.17 kB
- `AlertSettingsPage`: 12.20 kB
- `HomePage`: 12.37 kB
- `vendor-query`: 11.10 kB (TanStack Query)

Bundle size is well within limits. No action needed.

---

## 2. Code Splitting (lazy + Suspense)

All 11 page components use `lazy()`:
- HomePage, LoginPage, AlertSettingsPage, AuthCallbackPage, NotFoundPage
- SettingsPage, RouteSetupPage, CommuteTrackingPage, CommuteDashboardPage
- OnboardingPage, NotificationHistoryPage

All wrapped in a single `<Suspense fallback={<PageLoader />}>`.

**Status**: PASS - all pages are code-split.

---

## 3. N+1 Query Issues (Backend)

### Previously Fixed (20260221 review) - Verified Intact
- `get-commute-stats.use-case.ts`: Batch prefetch via `findByUserId` (line 122-125) - INTACT
- `calculate-route-analytics.use-case.ts`: `Promise.allSettled` parallel execution (line 83-85) - INTACT

### NEW N+1 Fixes Applied (this review)

| File | Method | Pattern | Fix |
|------|--------|---------|-----|
| `manage-commute-session.use-case.ts` | `getHistory()` | Loop `findById(routeId)` per session | Batch `findByUserId(userId)` + Map lookup |
| `recommend-best-route.use-case.ts` | `execute()` | Loop `findById(routeId)` per route group | Batch `findByUserId(userId)` + Map lookup |
| `process-commute-event.use-case.ts` | `getEventsByUserId()` | Loop `findById(placeId)` per event | Batch `findByUserId(userId)` + Map lookup |
| `manage-challenge.use-case.ts` | `getActiveChallenges()` | Loop `findTemplateById()` per challenge | Batch `findAllTemplates()` + Map lookup |
| `manage-challenge.use-case.ts` | `getChallengeHistory()` | Loop `findTemplateById()` per challenge | Batch `findAllTemplates()` + Map lookup |
| `evaluate-challenge.use-case.ts` | `execute()` | Loop `findTemplateById()` per challenge | Batch `findAllTemplates()` + Map lookup |

All 30 related tests updated and passing.

### Remaining Acceptable Patterns
- `schedule-departure-alerts.use-case.ts`: Loop creates/deletes EventBridge schedules - inherently individual AWS API calls, not DB N+1.
- `challenge-seed.service.ts`: Seed script - only runs at startup, not user-facing.

---

## 4. Unnecessary Re-renders (Frontend)

No significant issues found:
- `useMemo` and `useCallback` are used judiciously (not over-applied).
- TanStack Query handles server state caching with 5min staleTime.
- No large component trees without memoization boundary.

**Status**: PASS

---

## 5. Image/Asset Optimization

No `<img>` tags found in the codebase. App is text/data-driven with SVG icons inline. No image optimization needed.

**Status**: N/A

---

## 6. API Caching

### Frontend
- TanStack Query configured with:
  - `staleTime: 5min` - good balance for commute data
  - `gcTime: 30min` - reasonable garbage collection
  - `refetchOnWindowFocus: true` - auto-refresh stale data
  - `retry: 1` - avoids retry amplification with api-client's own retry

### Backend
- `CachedWeatherApiClient` caches weather API responses (DB-backed).
- External API calls (weather, air quality) properly cached.

**Status**: PASS

---

## 7. Memory Leaks

### Fixed
| File | Issue | Fix |
|------|-------|-----|
| `RouteSetupPage.tsx` | `navigateTimerRef` (setTimeout) not cleaned up on unmount | Added `useEffect` cleanup |

### Verified Clean
- `CommuteTrackingPage.tsx`: setInterval + visibilitychange listener properly cleaned up
- `AuthCallbackPage.tsx`: setTimeout properly cleaned up (line 70)
- `CommuteSection.tsx`: setInterval properly cleaned up
- `use-transport-search.ts`: setTimeout + AbortController properly cleaned up
- `useFocusTrap.ts`: setTimeout properly cleaned up
- `Toast.tsx`: setTimeout properly cleaned up
- `main.tsx`: PWA SW update interval - root level, never unmounts (acceptable)

### Minor (Not Fixed - Low Risk)
- `use-alert-crud.ts` / `use-settings.ts` / `AlertSettingsPage.tsx`: Multiple fire-and-forget `setTimeout` for toast auto-dismiss. These only call `setSuccess('')` or `setError('')` - worst case on unmount is a React dev-mode warning about state update on unmounted component. Low priority since they are short-duration (3-5s) toast timers.

---

## Summary

| Category | Status |
|----------|--------|
| Bundle Size | PASS (202 kB gzip, well under 500 kB limit) |
| Code Splitting | PASS (all 11 pages lazy-loaded) |
| N+1 Queries | FIXED - 6 new N+1 patterns resolved |
| Re-renders | PASS |
| Asset Optimization | N/A |
| API Caching | PASS |
| Memory Leaks | FIXED - 1 timer cleanup added |

**Total fixes**: 7 (6 N+1 query fixes + 1 memory leak fix)
**Test updates**: 30 tests updated and passing
