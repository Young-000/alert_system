# Performance Review - Round 1 (Updated)

**Status**: PASS
**Fixes Applied**: 3 (backend API parallelization)
**Date**: 2026-02-28

---

## 1. Frontend Bundle Size

### Build Output (Vite production build)

| Chunk | Raw | Gzip |
|-------|-----|------|
| **vendor-react** (react+react-dom) | 142.21 KB | 45.56 KB |
| **RouteSetupPage** (largest page) | 84.26 KB | 25.97 KB |
| **HomePage** | 48.15 KB | 14.94 KB |
| **AlertSettingsPage** | 45.98 KB | 12.24 KB |
| **index.js** (main entry) | 40.81 KB | 13.54 KB |
| **CommuteDashboardPage** | 41.48 KB | 9.16 KB |
| **vendor-query** (@tanstack/react-query) | 38.99 KB | 11.64 KB |
| **SettingsPage** | 28.68 KB | 7.40 KB |
| **vendor-router** (react-router) | 21.12 KB | 7.91 KB |
| **index.css** (all styles) | 280 KB raw | ~36 KB gzip |
| **sw.js** (service worker) | 67.35 KB | 18.12 KB |
| **Total dist/** | **~1.0 MB raw** | **~230 KB gzip** |

### Assessment: PASS

- Total gzip **~230 KB** -- well under the 500 KB target for PWA apps
- `manualChunks` in `vite.config.ts` properly splits vendor-react, vendor-router, vendor-query for long-term caching
- PWA precache: 41 entries, 883 KB -- acceptable for offline-capable PWA
- RouteSetupPage is the largest page chunk (26 KB gzip) due to @dnd-kit, but it is lazy-loaded so no impact on initial load

---

## 2. Lazy Loading / Code Splitting

### Assessment: PASS -- properly implemented

All 13 pages are lazy-loaded via `React.lazy()`:
- HomePage, LoginPage, AlertSettingsPage, AuthCallbackPage, NotFoundPage, SettingsPage
- RouteSetupPage, CommuteTrackingPage, CommuteDashboardPage, OnboardingPage
- NotificationHistoryPage, MissionsPage, MissionSettingsPage, ReportPage

Additional optimizations present:
- **Idle preload** (`useIdlePreload`): After 3 seconds, preloads RouteSetupPage, AlertSettingsPage, SettingsPage, MissionsPage, ReportPage in background
- **BottomNavigation prefetch**: `handlePrefetch` on hover/touchstart preloads the target page
- **Skeleton fallback**: `PageLoader` component renders skeleton UI during lazy chunk loading
- **react-router v7 future flags**: `v7_startTransition` and `v7_relativeSplatPath` enabled

---

## 3. Re-render Analysis (useMemo/useCallback)

### Assessment: PASS -- well balanced

Reviewed all `useMemo`/`useCallback`/`React.memo` usage across the codebase:

**Proper usage (not excessive):**
- `useMemo` for derived/computed state: `filteredRoutes`, `sortedRoutes`, `activeRoute`, `nextAlert`, `airQuality`, `briefing`, `weekData`, `filteredLogs`, `commuteMissions`, `returnMissions`
- `useMemo` for API client stabilization: `getCommuteApiClient()` wrapped in useMemo across pages
- `useCallback` for event handlers passed to child components or used in dependency arrays
- Custom hooks properly use `useCallback`/`useMemo` for their return values

**No signs of:**
- Unnecessary `useMemo` on primitive values or trivial computations
- `useCallback` wrapping every function indiscriminately
- Missing memoization causing measurable re-render problems

---

## 4. Image Optimization

### Assessment: PASS -- not applicable

- No `<img>` tags found in the codebase
- All visuals are inline SVGs, CSS-based graphics, or emoji characters
- No external image assets to optimize
- Font loading uses non-blocking pattern with preconnect for cdn.jsdelivr.net

---

## 5. Backend N+1 Query Patterns

### Assessment: PASS -- with 3 fixes applied

**Already well-structured:**
- `commute-route.repository.ts`: All queries use `relations: ['checkpoints']` (eager JOIN)
- `commute-session.repository.ts`: All queries use `relations: ['checkpointRecords']` (eager JOIN)
- `widget-data.service.ts`: Uses `Promise.allSettled` for parallel weather/transit/departure fetches
- `calculate-route-analytics.use-case.ts`: Uses `Promise.allSettled` for parallel route analytics
- `export-user-data.use-case.ts`: Uses `Promise.all` for parallel data fetching
- `daily-check.use-case.ts`: Uses `Promise.all` for parallel mission/records/streak loading

**Fixed -- sequential API calls parallelized (3 fixes):**

See Section 8 below for details.

---

## 6. Caching Strategy (React Query)

### Assessment: PASS -- well configured

**Global defaults** (`query-client.ts`):
- `staleTime`: 5 min (reasonable default)
- `gcTime`: 30 min (garbage collection)
- `retry`: 1 (avoids stacking with api-client retries)
- `refetchOnWindowFocus`: true (auto-refresh on tab return)
- `refetchOnReconnect`: true (refresh after network recovery)

**Per-query overrides** (appropriate granularity):

| Query | staleTime | Rationale |
|-------|-----------|-----------|
| Routes | 10 min | Routes rarely change |
| Weather | 10 min | Weather updates slowly |
| Air quality | 10 min | Same cadence as weather |
| Briefing | 10 min | Same cadence as weather |
| Commute stats | 15 min | Only changes after session completion |
| Weekly report | 15 min | Weekly data, rarely changes |
| Alerts | 2 min | User may change alerts frequently |
| Mission daily records | 30 sec | Needs to reflect check-ins quickly |
| Mission score | 30 sec | Same as daily records |
| Streak | 5 min | Changes on session completion |
| Places | 5 min | Rarely modified |
| Smart departure | 2-5 min | Departure times need freshness |

All queries properly use `invalidateQueries` on mutations, ensuring cache freshness.

---

## 7. CSS Performance

### Assessment: PASS -- acceptable with note

- **20,391 total CSS lines** across 12 files -- output gzip ~36 KB
- CSS is **not** code-split per page (all bundled into single `index.css`)
- This is a known trade-off: single CSS file caches well, but initial load includes unused styles
- `prefers-reduced-motion` media query is implemented for accessibility
- No `will-change` abuse, no heavy box-shadow animations
- **Future optimization**: Consider CSS code splitting per lazy-loaded page (not urgent at current size)

---

## 8. Fixes Applied

### Fix 1: Parallelize main data collection in SendNotificationUseCase

**File**: `backend/src/application/use-cases/send-notification.use-case.ts`

**Before** (sequential -- each await blocks the next):
```typescript
await this.collectWeatherData(alert, user.location, data, contextBuilder);
await this.collectTransitData(alert, data);
await this.collectSmartNotificationData(alert, contextBuilder.build(), data);
await this.collectRouteData(alert, data);
```

**After** (parallel where possible):
```typescript
await Promise.all([
  this.collectWeatherData(alert, user.location, data, contextBuilder),
  this.collectTransitData(alert, data),
  this.collectRouteData(alert, data),
]);
// smart notification depends on weather context, so runs after
await this.collectSmartNotificationData(alert, contextBuilder.build(), data);
```

**Impact**: Weather API (~500ms), transit API (~300ms), and route lookup (~100ms) now run concurrently instead of sequentially. Estimated savings: ~400-600ms per notification.

### Fix 2: Parallelize subway station lookups

**File**: `backend/src/application/use-cases/send-notification.use-case.ts` (collectSubwayData)

**Before** (sequential for loop with await):
```typescript
for (const id of ids.slice(0, 2)) {
  const station = await this.subwayStationRepository.findById(id);
  if (station) {
    const arrivals = await this.subwayApiClient.getSubwayArrival(station.name);
    results.push({ ... });
  }
}
```

**After** (parallel with Promise.allSettled):
```typescript
const settled = await Promise.allSettled(
  ids.map(async (id) => {
    const station = await this.subwayStationRepository.findById(id);
    if (!station) return null;
    const arrivals = await this.subwayApiClient.getSubwayArrival(station.name);
    return { name: station.name, line: station.line || '', arrivals: arrivals.slice(0, 1) };
  }),
);
```

**Impact**: When a user has 2 subway stations, both lookups + API calls run concurrently. Estimated savings: ~200-400ms.

### Fix 3: Parallelize bus stop lookups

**File**: `backend/src/application/use-cases/send-notification.use-case.ts` (collectBusData)

**Before**: Same sequential for-loop pattern as subway.

**After**: Same `Promise.allSettled` pattern, running bus arrival API calls concurrently.

**Impact**: Similar to subway -- concurrent API calls for 2 bus stops.

### Fix 4 (within Fix 1): Parallelize weather + air quality API calls

**File**: `backend/src/application/use-cases/send-notification.use-case.ts` (collectWeatherData)

**Before**: Sequential `await` for weather API, then air quality API.

**After**: Both API calls collected into `tasks[]` array and run with `Promise.all(tasks)`.

**Impact**: Weather API and air quality API now run concurrently. Estimated savings: ~200-300ms when both alert types are active.

---

## 9. Verification

| Check | Result |
|-------|--------|
| Backend tests (send-notification) | 13/13 passed |
| Backend type check (`tsc --noEmit`) | 0 errors |
| Frontend build | Success (1.74s) |
| Frontend bundle size | ~230 KB gzip (under 500 KB target) |

---

## Summary

| Area | Status | Notes |
|------|--------|-------|
| Bundle size | PASS | ~230 KB gzip, well under 500 KB target |
| Lazy loading | PASS | All 13 pages lazy-loaded + idle preload + prefetch on hover |
| Re-render optimization | PASS | Appropriate useMemo/useCallback usage, no excess or deficit |
| Image optimization | N/A | No images in codebase (all SVG/CSS/emoji) |
| Backend N+1 queries | PASS | TypeORM relations properly used; sequential API calls parallelized |
| Caching strategy | PASS | Per-query staleTime tuned appropriately; proper invalidation on mutations |
| CSS performance | PASS | ~36 KB gzip; single bundle tradeoff acceptable at this size |
| PWA caching | PASS | Workbox precache (41 entries) + runtime cache (fonts, API) |
