# Performance Review - Round 1 (Updated 2026-03-14)

**Status**: PASS
**Fixes Applied**: 4 (3 from previous round + 1 new)
**Date**: 2026-03-14

---

## 1. Frontend Bundle Size

### Build Output (Vite production build)

| Chunk | Raw | Gzip |
|-------|-----|------|
| **vendor-react** (react+react-dom) | 142.21 KB | 45.56 KB |
| **RouteSetupPage** (largest page) | 84.60 KB | 26.09 KB |
| **HomePage** | 60.10 KB | 17.72 KB |
| **AlertSettingsPage** | 46.43 KB | 12.40 KB |
| **CommuteDashboardPage** | 42.05 KB | 9.30 KB |
| **index.js** (main entry) | 42.04 KB | 13.75 KB |
| **vendor-query** (@tanstack/react-query) | 38.99 KB | 11.64 KB |
| **SettingsPage** | 29.57 KB | 7.62 KB |
| **vendor-router** (react-router) | 21.12 KB | 7.91 KB |
| **index.css** (all styles) | 305.92 KB raw | 49.13 KB gzip |
| **sw.js** (service worker) | 67.35 KB | 18.12 KB |
| **Total JS+CSS (gzip)** | — | **233.9 KB** |

### Assessment: PASS

- Total gzip **233.9 KB** — well under the 500 KB target for PWA apps
- `manualChunks` in `vite.config.ts` properly splits vendor-react, vendor-router, vendor-query for long-term caching
- PWA precache: 43 entries, 933.83 KB — acceptable for offline-capable PWA
- RouteSetupPage is the largest page chunk (26 KB gzip) due to @dnd-kit, but it is lazy-loaded

---

## 2. Lazy Loading / Code Splitting

### Assessment: PASS — properly implemented

All 14 pages are lazy-loaded via `React.lazy()`:
- HomePage, LoginPage, AlertSettingsPage, AuthCallbackPage, NotFoundPage, SettingsPage
- RouteSetupPage, CommuteTrackingPage, CommuteDashboardPage, OnboardingPage
- NotificationHistoryPage, MissionsPage, MissionSettingsPage, ReportPage, PatternAnalysisPage, InsightsPage

Additional optimizations present:
- **Idle preload** (`useIdlePreload`): After 3 seconds, preloads RouteSetupPage, AlertSettingsPage, SettingsPage, MissionsPage, ReportPage, InsightsPage in background
- **BottomNavigation prefetch**: `handlePrefetch` on hover/touchstart preloads the target page
- **Skeleton fallback**: `PageLoader` component renders skeleton UI during lazy chunk loading
- **react-router v7 future flags**: `v7_startTransition` and `v7_relativeSplatPath` enabled
- `DelayAlertBanner.tsx` imports `delay-alert.css` directly, correctly code-splitting that CSS into the `HomePage` chunk

---

## 3. Re-render Analysis (useMemo/useCallback)

### Assessment: PASS — well balanced

Reviewed all `useMemo`/`useCallback`/`React.memo` usage:

**Proper usage:**
- `useMemo` for derived state: `filteredRoutes`, `sortedRoutes`, `filteredLogs`, `commuteMissions`, `returnMissions`, `schedule`, `alertName`, `notificationTimes`, `weekData`, `groupedSubwayResults`, `routeNameMap`
- `useCallback` for stable event handlers passed to child components (`handleSelectStopDirect`, `handleDragEnd`, `loadRoutes`, `handleSubmit`, `handlePrefetch`, etc.)
- `React.memo` used on re-render-sensitive components: `SortableStopItem`, `AlertSection`, `DeparturePrediction`, `StreakBadge`, `PatternInsightsCard`

**Notable observations:**
- `getTransferInfo` useCallback with empty deps (`[]`) is a pure utility passed as prop — appropriate
- `getCommuteApiClient()` is a singleton (module-level instance) — safe to call in component bodies without useMemo
- No unnecessary memoization of primitive values detected
- `eslint-disable-line react-hooks/exhaustive-deps` used in 2 places (`HomePage.tsx` and `NotificationHistoryPage.tsx`) with justifying comments — both intentional

---

## 4. Image Optimization

### Assessment: PASS — not applicable

- No `<img>` tags found in the codebase (confirmed: `grep -rn '<img '` returns no results)
- All visuals are inline SVGs, CSS-based graphics, or emoji characters
- No external image assets to optimize

---

## 5. Backend N+1 Query Patterns

### Assessment: PASS — 1 new fix applied this round

**Already well-structured:**
- `commute-route.repository.ts`: All queries use `relations: ['checkpoints']` (eager JOIN)
- `commute-session.repository.ts`: All queries use `relations: ['checkpointRecords']` (eager JOIN)
- `widget-data.service.ts`: Uses `Promise.allSettled` for parallel weather/transit/departure fetches
- `calculate-route-analytics.use-case.ts`: Uses `Promise.allSettled` for parallel route analytics
- `export-user-data.use-case.ts`: Uses `Promise.all` for parallel data fetching
- `enhanced-pattern-analysis.service.ts`: Loops are over in-memory data only (no DB calls inside loops)
- `analytics.controller.ts`: Loops over in-memory arrays only

**Noted but acceptable (background/low-frequency operations):**
- `congestion-aggregation.service.ts#updateForSession`: N+1 pattern in incremental session update
  (`findBySegmentKeyAndTimeSlot` + optional `fetchObservationsForSegment` + `save` per segment).
  Context: background analysis service, triggered after session completion, loop size is 3–8 items (checkpoints per session). Impact is minimal.
- `alternative-suggestion.service.ts#findAlternatives`: DB query per significant-delay segment.
  Context: only triggered for segments with ≥5 min delay, loop size typically 1–3 items.

**Fixed this round (Fix 4):**
- `challenge-seed.service.ts#seedTemplates`: Was performing `findOneBy` + optional `save` per seed template (6 templates × 2 queries = 12 queries at startup). Fixed to single query for all existing IDs + batch insert.

**Previously fixed (rounds 1–2):**
- `send-notification.use-case.ts`: Sequential weather/transit/route collection → parallelized with `Promise.all`
- `send-notification.use-case.ts (collectSubwayData)`: Sequential for-loop → `Promise.allSettled`
- `send-notification.use-case.ts (collectBusData)`: Sequential for-loop → `Promise.allSettled`

---

## 6. Large Library Imports

### Assessment: PASS — clean dependencies

No banned/large libraries detected:
- No `lodash` full import (`lodash-es` or direct implementation used)
- No `moment.js` (standard `Date` used throughout)
- No heavy UI library imports
- `@dnd-kit` used for drag-and-drop (necessary, included in RouteSetupPage chunk only)
- `@supabase/supabase-js` in dependencies — used for DB client
- All imports use named exports (tree-shaking compatible)

---

## 7. Search Debounce

### Assessment: PASS — correctly implemented

Both station search hooks use 300ms debounce:

- `use-station-search.ts` (RouteSetupPage): `SEARCH_DEBOUNCE_MS = 300` with `useRef`-based timer
- `use-transport-search.ts` (AlertSettingsPage): `SEARCH_DEBOUNCE_MS` constant via `useEffect` cleanup + `controller.abort()` for request cancellation

---

## 8. List Virtualization

### Assessment: PASS — not needed at current data volumes

All list sizes are bounded by pagination:
- Notification history: max 20 items per page (load-more with `history.hasMore`)
- Commute sessions: paginated with `hasMore` flag
- Routes: typically 2–5 per user
- Alerts: typically 1–5 per user
- Missions: max 3 per type (enforced by `MAX_MISSIONS_PER_TYPE = 3`)

No list exceeds 50 visible items. Virtualization (`react-virtual`) not required.

---

## 9. CSS Performance

### Assessment: PASS — acceptable with note

- **22,418 total CSS lines** across 15 files — output gzip 49.13 KB
- CSS is not code-split per page (all bundled into single `index.css` via global import in main.tsx)
- Single CSS bundle cached long-term; only `delay-alert.css` is split into `HomePage` chunk via component-level import
- No `will-change` abuse, no heavy CSS animations
- `prefers-reduced-motion` implemented
- **Future optimization**: migrate remaining page CSS to component-level imports for per-route code splitting

---

## 10. useEffect Dependencies

### Assessment: PASS — with verified exceptions

Two `eslint-disable` on `react-hooks/exhaustive-deps`:

1. **`HomePage.tsx:35`**: Excludes `data.setForceRouteType` — this is a `setState` setter (stable reference). Correct.
2. **`NotificationHistoryPage.tsx:157`**: Excludes `periodFilter` from first useEffect — intentional two-effect pattern where second useEffect handles period changes. Correct.

---

## 11. Fixes Applied This Round

### Fix 4: ChallengeSeedService — N+1 → batch query

**File**: `backend/src/infrastructure/persistence/seeds/challenge-seed.service.ts`

**Before** (N+1: 2 queries × 6 seeds = 12 DB calls at startup):
```typescript
for (const seed of CHALLENGE_TEMPLATE_SEEDS) {
  const exists = await this.templateRepo.findOneBy({ id: seed.id });
  if (!exists) {
    await this.templateRepo.save({ ... });
  }
}
```

**After** (1 SELECT + 1 batch INSERT):
```typescript
const existingIds = await this.templateRepo
  .createQueryBuilder('t').select('t.id').getMany()
  .then((rows) => new Set(rows.map((r) => r.id)));

const toInsert = CHALLENGE_TEMPLATE_SEEDS.filter((s) => !existingIds.has(s.id));
if (toInsert.length === 0) return;

await this.templateRepo.save(toInsert.map((seed) => ({ ... })));
```

**Impact**: Reduces startup DB queries from 12 → 2 (1 SELECT + 1 batch INSERT when new seeds exist, or 1 SELECT when all seeded).

---

## Summary

| Area | Status | Notes |
|------|--------|-------|
| Bundle size | PASS | 233.9 KB gzip (JS+CSS), under 500 KB target |
| Lazy loading | PASS | All 14 pages lazy-loaded + idle preload + hover prefetch |
| Re-render optimization | PASS | Appropriate useMemo/useCallback/memo usage |
| Image optimization | N/A | No images — all SVG/CSS/emoji |
| Large library imports | PASS | No lodash, moment.js, or banned packages |
| Search debounce | PASS | 300ms debounce on both station search hooks |
| List virtualization | N/A | All lists paginated, max 20 items visible |
| Backend N+1 queries | PASS | Challenge seed N+1 fixed; background services acceptable |
| CSS performance | PASS | 49 KB gzip; single bundle tradeoff acceptable |
| useEffect dependencies | PASS | Two intentional eslint-disables with justification |
