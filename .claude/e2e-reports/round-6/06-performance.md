# Performance Review -- Round 6

**Reviewer**: Performance Checker
**Date**: 2026-03-04
**Branch**: `feature/e2e-auto-review-20260304`

---

## 1. Bundle Size Analysis

### Build Output Summary (Vite production build)

| Category | Raw Size | Gzip Size |
|----------|----------|-----------|
| **Main CSS** (`index-*.css`) | 305.75 KB | 49.07 KB |
| **Vendor React** (`vendor-react-*.js`) | 142.21 KB | 45.56 KB |
| **RouteSetupPage** | 84.28 KB | 25.99 KB |
| **HomePage** | 59.90 KB | 17.68 KB |
| **AlertSettingsPage** | 45.98 KB | 12.24 KB |
| **Main JS** (`index-*.js`) | 42.18 KB | 13.81 KB |
| **CommuteDashboardPage** | 41.50 KB | 9.12 KB |
| **Vendor Query** | 38.99 KB | 11.64 KB |
| **SettingsPage** | 28.68 KB | 7.40 KB |
| **Vendor Router** | 21.12 KB | 7.91 KB |

**Total JS (gzip)**: ~182 KB
**Total CSS (gzip)**: ~56 KB
**Grand Total (gzip)**: ~238 KB

**Verdict**: PASS -- Total gzip is well under the 500 KB target for apps-in-toss apps.

### Observations

- Main CSS (49 KB gzip) is the single largest asset. All 22,000+ lines of CSS are bundled into one file because `postcss-import` inlines all `@import` statements at build time. This is acceptable since CSS is render-blocking anyway, but could be improved with CSS modules or CSS-in-JS for truly page-specific styles.
- `RouteSetupPage` (26 KB gzip) is the heaviest JS chunk -- 625 lines with DnD, station search, route CRUD, validation, and toast management. Consider splitting sub-features into separate chunks.
- `vendor-react` (46 KB gzip) is expected for React 18 + ReactDOM.

---

## 2. Code Splitting & Lazy Loading

**Status**: PASS -- All 16 route-level pages use `React.lazy()`.

```typescript
// frontend/src/presentation/App.tsx (lines 8-23)
const HomePage = lazy(() => import('./pages/home/HomePage').then(...));
const LoginPage = lazy(() => import('./pages/LoginPage').then(...));
// ... all 16 pages lazy-loaded
```

**Idle Preload**: Key pages are preloaded after 3 seconds via `useIdlePreload()`:
- RouteSetupPage, AlertSettingsPage, SettingsPage, MissionsPage, ReportPage, InsightsPage

**Suspense**: Single `<Suspense>` wrapper with skeleton fallback (`PageLoader`). This is appropriate for the current page count.

---

## 3. Vendor Chunking

**Status**: PASS -- Proper manual chunks configured.

```typescript
// vite.config.ts manualChunks
vendor-react  -> react, react-dom, scheduler
vendor-router -> react-router-dom
vendor-query  -> @tanstack/react-query
```

These three vendor chunks benefit from long-term caching since they change infrequently.

---

## 4. React.memo / useMemo / useCallback Usage

**Status**: PASS -- Appropriate usage where needed.

### React.memo applied to:
- `SortableStopItem` (DnD list item, re-renders on drag)
- `PatternInsightsCard` (expensive computation)
- `AlertSection` (pure props)
- `StreakBadge` (pure props)
- `DeparturePrediction` (pure props)

### useMemo/useCallback usage:
- 60+ instances across the codebase
- `useHomeData` hook properly memoizes derived values from react-query data
- Route filtering/sorting in `RouteSetupPage` correctly uses `useMemo`
- Event handlers in forms/modals use `useCallback` appropriately
- No cases of premature optimization observed

### Not needed (correctly omitted):
- Simple components with few props are not wrapped in `React.memo` -- correct decision per project conventions.

---

## 5. Image Optimization

**Status**: N/A -- No `<img>` tags found in the frontend source.

The app uses:
- SVG inline icons (custom icon components in `components/icons/`)
- CSS-based UI (gradients, borders, shadows)
- Emoji for visual indicators

No image optimization issues since there are no raster images.

---

## 6. API Call Patterns

**Status**: PASS -- Good parallel patterns with one fix applied.

### Frontend (Positive Findings)

**Parallel API calls correctly used**:
- `CommuteDashboardPage`: `Promise.all([statsData, historyData, analyticsData])` (line 104)
- `NotificationHistoryPage`: `Promise.allSettled([historyResult, statsResult])` (line 133)
- `RouteSetupPage`: `Promise.all([loadRoutes, loadStations])` (line 118)
- `CommuteTrackingPage`: `Promise.all(unrecorded.map(cp => ...))` (line 187)
- `useTransitQuery`: `Promise.all([...subwayPromises, ...busPromises])` (line 53)

**React Query caching**: Well-configured `staleTime` per data type:
- Transit data: 30s stale, 30s refetch interval
- Weather: 10min stale
- Routes: 10min stale (rarely changes)
- Commute stats: 15min stale
- Weekly report: 10min stale

### Backend (Fix Applied)

**FIXED**: `InsightsService.getMyComparison()` had two independent DB queries running sequentially.

```typescript
// BEFORE: sequential (wasted ~50ms)
const userStats = await this.getUserStats(userId);
const userRegionId = await this.getUserRegionId(userId);

// AFTER: parallel
const [userStats, userRegionId] = await Promise.all([
  this.getUserStats(userId),
  this.getUserRegionId(userId),
]);
```

**File**: `backend/src/application/services/insights/insights.service.ts`

### Sequential Loops (Accepted)

- `WebPushService.sendToUser()`: Sequential `for...of` with `await webPush.sendNotification()`. This is intentional -- push notifications need individual error handling (delete expired subs on 410/404).
- `ExpoPushService.sendToUser()`: Uses `expo.chunkPushNotifications()` which batches correctly.
- `AlternativeSuggestionService`: Sequential loop over delayed segments. Each iteration calls `findAlternativesForSegment()` which needs the mapping result. Low iteration count (filtered to significant delays only).

---

## 7. Dependency Analysis

**Status**: PASS -- No unnecessary large dependencies.

| Dependency | Size (approx) | Necessity |
|-----------|---------------|-----------|
| `react` + `react-dom` | 46 KB gzip | Core framework |
| `react-router-dom` | 8 KB gzip | Routing |
| `@tanstack/react-query` | 12 KB gzip | Server state |
| `@dnd-kit/core` + `sortable` + `utilities` | Included in RouteSetupPage chunk | DnD for route stops |
| `@supabase/supabase-js` | Part of main chunk | Auth only (minimal usage) |
| `clsx` + `tailwind-merge` | <1 KB gzip | Utility |

**Tree-shaking**: Named imports used throughout (`import { specific } from 'lib'`). No default library imports that would prevent tree-shaking.

**@dnd-kit**: Only imported in `RouteSetupPage` and its sub-components, so it's correctly code-split into the RouteSetupPage chunk.

---

## 8. Backend Query Optimization

**Status**: PASS -- TypeORM relations properly loaded.

### Relations Loading
- `CommuteSessionRepository`: All queries that need checkpoint records use `relations: ['checkpointRecords']`.
- `CommuteRouteRepository`: All queries use `relations: ['checkpoints']`.
- `InsightsService.getRegions()`: Uses `Promise.all` for parallel queries.

### No N+1 Issues Found
- No loops that load related entities one-by-one.
- `findByIds()` uses `In(ids)` for batch loading.
- Query builders use proper aggregation (`AVG`, `COUNT`) instead of loading all records.

### Efficient Patterns
- `InsightsAggregationService` uses `createQueryBuilder` with aggregation.
- `NotificationHistoryController` uses pagination with `take`/`skip`.
- Session queries are filtered by `userId` and `status` with proper indexes.

---

## 9. CSS Bundle Analysis

**Status**: WARNING (non-blocking) -- All CSS bundled into single 306 KB (49 KB gzip) file.

### Issue: Global CSS Bundle
All 22,000+ lines of CSS are imported via a single hub file (`styles/index.css`) and compiled into one output file. This includes page-specific CSS (routes: 3,788 lines, home: 4,512 lines, commute: 3,789 lines) that could theoretically be code-split.

### Fix Applied: Redundant CSS Imports Removed

Three page components had redundant CSS imports (already included via the global hub):

| File | Removed Import |
|------|---------------|
| `MissionsPage.tsx` | `import '../styles/pages/missions.css'` |
| `MissionSettingsPage.tsx` | `import '../../styles/pages/mission-settings.css'` |
| `PatternAnalysisPage.tsx` | `import '../../styles/pages/patterns.css'` |

These were duplicates of what's already in `styles/index.css` via `@import`. While `postcss-import` deduplicates at build time (no actual size impact), having the same file imported in two places creates confusion about the intended CSS loading strategy.

**Note**: `DelayAlertBanner.tsx` imports `delay-alert.css` at the component level, which is the correct pattern for CSS that is NOT in the global hub.

---

## 10. PWA / Service Worker

**Status**: WARNING (build issue) -- Service worker build fails with `source-map` module error.

The main Vite build succeeds (all JS/CSS output correctly), but the `vite-plugin-pwa` post-build step (`injectManifest`) fails:
```
Error: Cannot find module './lib/source-map-generator'
```

This is a dependency issue in `workbox-build/node_modules/source-map`. The app itself builds and runs fine; only the SW source-map generation fails. This should be addressed by updating `vite-plugin-pwa` or its `workbox-build` dependency.

---

## Summary

| Check | Status | Notes |
|-------|--------|-------|
| Bundle size | PASS | 238 KB gzip total (well under 500 KB) |
| Lazy loading | PASS | All 16 pages use React.lazy() |
| Vendor chunking | PASS | React/Router/Query properly split |
| React.memo usage | PASS | Applied where beneficial |
| Image optimization | N/A | No raster images used |
| API call patterns | PASS | Parallel where possible, 1 fix applied |
| Large dependencies | PASS | All dependencies justified |
| Backend queries | PASS | Relations loaded, no N+1 |
| CSS bundle | WARNING | Single 49 KB gzip file, 3 redundant imports removed |
| PWA build | WARNING | workbox source-map error (non-blocking) |

### Fixes Applied: 2건

1. **`backend/src/application/services/insights/insights.service.ts`**: Parallelized `getUserStats()` and `getUserRegionId()` in `getMyComparison()` using `Promise.all()`. Saves ~one DB round-trip latency.

2. **Frontend CSS imports**: Removed 3 redundant CSS imports from `MissionsPage.tsx`, `MissionSettingsPage.tsx`, and `PatternAnalysisPage.tsx` that were already loaded via the global `styles/index.css` hub.
