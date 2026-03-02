# Performance Review - Round 1

**Status**: PASS
**Fixes Applied**: 0
**Date**: 2026-03-03

---

## 1. Frontend Bundle Size

### Build Output (Vite production build)

| Chunk | Raw | Gzip |
|-------|-----|------|
| **vendor-react** (react+react-dom) | 142.21 KB | 45.56 KB |
| **RouteSetupPage** (largest page) | 84.28 KB | 25.99 KB |
| **HomePage** | 59.90 KB | 17.68 KB |
| **AlertSettingsPage** | 45.98 KB | 12.24 KB |
| **index.js** (main entry) | 42.18 KB | 13.81 KB |
| **CommuteDashboardPage** | 41.50 KB | 9.12 KB |
| **vendor-query** (@tanstack/react-query) | 38.99 KB | 11.64 KB |
| **SettingsPage** | 28.68 KB | 7.40 KB |
| **vendor-router** (react-router) | 21.12 KB | 7.91 KB |
| **ReportPage** | 15.87 KB | 3.66 KB |
| **InsightsPage** | 12.97 KB | 3.32 KB |
| **MissionSettingsPage** | 12.54 KB | 3.82 KB |
| **OnboardingPage** | 10.60 KB | 3.41 KB |
| **PatternAnalysisPage** | 10.03 KB | 2.84 KB |
| **index.css** (all styles) | 305.75 KB | 49.07 KB |
| **sw.js** (service worker) | 67.35 KB | 18.12 KB |
| **Total JS (all chunks)** | ~620 KB raw | ~185 KB gzip |
| **Total CSS (all chunks)** | ~338 KB raw | ~55 KB gzip |
| **Total dist/** | ~1.1 MB raw | ~260 KB gzip |

### Assessment: PASS

- Total gzip **~260 KB** -- well under the 500 KB target for PWA apps
- `manualChunks` in `vite.config.ts` properly splits vendor-react, vendor-router, vendor-query for long-term caching
- PWA precache: 46 entries, 958 KB -- acceptable for offline-capable PWA
- RouteSetupPage is the largest page chunk (26 KB gzip) due to @dnd-kit, but it is lazy-loaded so no impact on initial load
- **Comparison to last review**: HomePage grew from 48KB to 60KB raw (new sections: DelayAlertBanner, NeighborSection, CheckpointTips, PatternInsightsCard, RouteRecommendation). Acceptable growth for significant feature additions.

### CSS Size Note

- **index.css** grew from ~280KB/36KB gzip to **306KB/49KB gzip** (+13KB gzip)
- Cause: new page styles added (community.css 334 lines, congestion.css 119 lines, insights.css 581 lines)
- Some pages already use per-component CSS imports for code splitting: `delay-alert.css`, `missions.css`, `mission-settings.css`, `patterns.css` -- these generate separate CSS chunks (good)
- Other page CSS (alerts, home, routes, commute, settings, auth, notification-history, community, congestion, insights) remain bundled in `index.css`
- **Recommendation (advisory, not blocking)**: Move `community.css`, `congestion.css`, `insights.css` from `index.css` to direct imports in their respective page components for better code splitting. Estimated savings: ~1-2KB gzip from initial CSS load.

---

## 2. Lazy Loading / Code Splitting

### Assessment: PASS -- properly implemented

All **15 pages** are lazy-loaded via `React.lazy()`:
- HomePage, LoginPage, AlertSettingsPage, AuthCallbackPage, NotFoundPage, SettingsPage
- RouteSetupPage, CommuteTrackingPage, CommuteDashboardPage, OnboardingPage
- NotificationHistoryPage, MissionsPage, MissionSettingsPage, ReportPage
- PatternAnalysisPage, InsightsPage

Additional optimizations present:
- **Idle preload** (`useIdlePreload`): After 3 seconds, preloads RouteSetupPage, AlertSettingsPage, SettingsPage, MissionsPage, ReportPage, InsightsPage in background
- **BottomNavigation prefetch**: `handlePrefetch` on hover/touchstart preloads the target page
- **Skeleton fallback**: `PageLoader` component renders skeleton UI during lazy chunk loading
- **react-router v7 future flags**: `v7_startTransition` and `v7_relativeSplatPath` enabled

---

## 3. Re-render Analysis (useMemo/useCallback)

### Assessment: PASS -- well balanced

Reviewed all `useMemo`/`useCallback`/`React.memo` usage across the codebase:

**Proper usage (not excessive):**
- `useMemo` for derived/computed state: `filteredRoutes`, `sortedRoutes`, `filteredLogs`, `commuteMissions`, `returnMissions`, `weekData`, `congestionByName`, `briefing advices`
- `useMemo` for API client stabilization: `getCommuteApiClient()` wrapped in useMemo across pages
- `useCallback` for event handlers: form handlers, DnD handlers, toggle handlers, modal handlers
- Custom hooks properly use `useCallback`/`useMemo` for their return values

**No signs of:**
- Unnecessary `useMemo` on primitive values or trivial computations
- `useCallback` wrapping every function indiscriminately
- Missing `React.memo` on frequently re-rendered leaf components (no `React.memo` found, but not needed given the component structure and React Query's caching)

---

## 4. Image Optimization

### Assessment: PASS -- not applicable

- No `<img>` tags found in the codebase
- All visuals are inline SVGs, CSS-based graphics, or emoji characters
- Only image assets: PWA icons (`pwa-192x192.png`, `pwa-512x512.png`) -- not rendered in UI
- No external image assets requiring lazy loading or WebP conversion

---

## 5. List Virtualization

### Assessment: PASS -- not needed at current scale

Reviewed all `.map()` calls rendering lists:
- **HistoryTab**: Renders session history with `LoadMoreButton` pagination (not infinite list)
- **StopwatchTab**: Renders `records.slice(0, 20)` -- capped at 20 items
- **AlertList**: Alerts per user (typically <10)
- **RouteListView**: Routes per user (typically <10)
- **BehaviorTab patterns**: Pattern list (typically <10)
- **Search results**: Station search results (typically <50)
- **Checkpoint list**: Per-route checkpoints (typically <10)

No list is expected to exceed 100 items, so `react-window` or `@tanstack/react-virtual` is not warranted.

---

## 6. Backend N+1 Query Patterns

### Assessment: PASS

**Already well-structured:**
- `commute-route.repository.ts`: All queries use `relations: ['checkpoints']` (eager JOIN) -- prevents N+1
- `commute-session.repository.ts`: All queries use `relations: ['checkpointRecords']` (eager JOIN) -- prevents N+1
- `widget-data.service.ts`: Uses `Promise.allSettled` for parallel weather/transit/departure/alerts/briefing fetches
- `community.service.ts`: Uses `createQueryBuilder` with JOINs for neighbor lookups, followed by targeted aggregate queries -- efficient pattern
- `insights-aggregation.service.ts`: Uses `createQueryBuilder` with aggregate functions (AVG, ARRAY_AGG) -- properly aggregated at DB level
- `congestion-aggregation.service.ts`: Uses `createQueryBuilder` for batch aggregation -- no N+1

**Sequential `await` in loop (acceptable):**
- `web-push.service.ts`: Iterates subscriptions sequentially (`for...of` with `await`). This is intentional -- web-push calls need error handling per subscription to delete expired ones (410/404). Parallelizing could cause rate limiting from push endpoints. Typical user has 1-3 subscriptions, so performance impact is negligible.
- `expo-push.service.ts`: Same pattern as web-push, same rationale.

**Previous fixes still in place:**
- `send-notification.use-case.ts`: Weather/transit/route data collected via `Promise.all` (parallelized in previous review)
- Subway/bus station lookups: `Promise.allSettled` pattern (parallelized in previous review)

---

## 7. Caching Strategy

### Assessment: PASS

#### Frontend (React Query)

**Global defaults** (`query-client.ts`):
- `staleTime`: 5 min (reasonable default)
- `gcTime`: 30 min (garbage collection)
- `retry`: 1 (avoids stacking with api-client retries)
- `refetchOnWindowFocus`: true (auto-refresh on tab return)
- `refetchOnReconnect`: true (refresh after network recovery)

**Polling intervals (appropriate for real-time data):**
- Transit arrivals: 30s refetch, 15s stale, no background refetch
- Delay status: 60s refetch, 30s stale
- CommuteSection timer: 10s tick (UI update only, no API call)

#### Backend (DB-level API cache)

**`ApiCacheService`** with TTL-based caching:
- Weather: 1 hour TTL (appropriate for weather data cadence)
- Air Quality: 1 hour TTL
- Subway arrivals: 30 second TTL (real-time data)
- Bus arrivals: 30 second TTL
- Cache cleanup: Cron job deletes expired cache entries
- API call logging: 7-day retention with cleanup

**No in-memory caching needed** -- cache TTLs are appropriate for the data freshness requirements.

---

## 8. CSS Performance

### Assessment: PASS -- with advisory note

- **22,386 total custom CSS lines** across 16 files -- output gzip ~49 KB
- CSS is partially code-split: 4 page-specific CSS files are imported directly from page components (`delay-alert.css`, `missions.css`, `mission-settings.css`, `patterns.css`)
- Remaining 12 CSS files bundled into single `index.css` -- caches well but initial load includes unused styles
- `prefers-reduced-motion` media query is implemented for accessibility
- No `will-change` abuse, no heavy animations
- No `!important` overuse detected

**Advisory**: Consider migrating `community.css` (334 lines), `congestion.css` (119 lines), and `insights.css` (581 lines) from `index.css` to direct page imports. These are newer features with isolated CSS that would benefit from code splitting. Not blocking -- current 49KB gzip total is acceptable.

---

## 9. PWA Performance

### Assessment: PASS

- Service worker: `injectManifest` strategy with Workbox
- Precache: 46 entries, 958 KB -- reasonable for PWA
- SW update check: 60-second interval (appropriate)
- Controller change: Auto-reload with duplicate prevention (`isRefreshing` flag)
- Glob patterns for precache: `**/*.{js,css,html,ico,png,svg,woff2}` -- covers essential assets

---

## 10. Data Retention

### Assessment: PASS

- `DataRetentionService`: Daily cron (3 AM) cleans up old behavior events and commute records
- `ApiCacheService.cleanupExpiredCache()`: Removes expired cache entries
- `ApiCacheService.cleanupOldLogs()`: Removes API call logs older than 7 days
- GDPR compliance: `deleteAllUserData()` method available for user data deletion

---

## Summary

| Area | Status | Notes |
|------|--------|-------|
| Bundle size | PASS | ~260 KB gzip total, under 500 KB target |
| Lazy loading | PASS | All 15 pages lazy-loaded + idle preload + prefetch on hover |
| Re-render optimization | PASS | Appropriate useMemo/useCallback usage, no excess or deficit |
| Image optimization | N/A | No images in codebase (all SVG/CSS/emoji) |
| List virtualization | PASS | No list exceeds 100 items; pagination used for history |
| Backend N+1 queries | PASS | TypeORM relations used; parallel API calls; aggregate queries at DB level |
| Caching (FE) | PASS | React Query with per-query staleTime tuning; proper invalidation |
| Caching (BE) | PASS | DB-level API cache with TTL; scheduled cleanup |
| CSS performance | PASS | 49 KB gzip; partial code splitting; advisory to split 3 more page CSS files |
| PWA caching | PASS | Workbox precache (46 entries) + auto-update |
| Data retention | PASS | Daily cleanup cron; GDPR-ready |

### Changes from Previous Review

| Metric | Previous (2026-02-28) | Current (2026-03-03) | Delta |
|--------|----------------------|----------------------|-------|
| Total gzip | ~230 KB | ~260 KB | +30 KB |
| CSS gzip | ~36 KB | ~49 KB | +13 KB |
| HomePage chunk | 48 KB raw | 60 KB raw | +12 KB |
| Lazy-loaded pages | 13 | 15 | +2 (PatternAnalysisPage, InsightsPage) |
| PWA precache | 41 entries | 46 entries | +5 |

Growth is proportional to new features added (community, congestion, insights, patterns, delay alerts) and within acceptable bounds.
