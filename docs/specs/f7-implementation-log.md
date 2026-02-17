# F-7: @tanstack/react-query Implementation Log

> Date: 2026-02-17
> Implementer: Developer Agent

## Summary

Introduced `@tanstack/react-query` for server state management. Converted 5 READ APIs from manual `useState` + `useEffect` patterns to `useQuery` hooks across 3 custom hooks (`useHomeData`, `useSettings`, `useAlertCrud`). All existing 214 tests pass, no interface changes to consuming components.

## Changes Made

### Step 1: Infrastructure Setup
- Installed `@tanstack/react-query` v5
- Created `frontend/src/infrastructure/query/`:
  - `query-client.ts` — QueryClient singleton (5min staleTime, 30min gcTime, retry: 1)
  - `query-keys.ts` — Type-safe query key factory for 5 domains
  - `error-utils.ts` — User-friendly error message utility
  - `index.ts` — Barrel export
- Wrapped `main.tsx` with `QueryClientProvider`

### Step 2-3: Query Hooks Created
| Hook | staleTime | Key Features |
|------|-----------|--------------|
| `useAlertsQuery(userId)` | 2min | `enabled: !!userId` |
| `useRoutesQuery(userId)` | 10min | `refetchOnWindowFocus: false` |
| `useWeatherQuery(lat, lng, enabled)` | 10min | Location-dependent |
| `useAirQualityQuery(lat, lng, enabled)` | 10min | Location-dependent |
| `useCommuteStatsQuery(userId, days)` | 15min | `refetchOnWindowFocus: false` |

### Step 4: use-home-data.ts Cleanup
- Removed 5 `useState` declarations (alerts, routes, commuteStats, weather, airQualityData)
- Removed 2 `useEffect` blocks (core data loading, weather/air quality loading)
- Removed 2 error state variables (weatherError, airQualityError) — now derived from query errors
- File reduced from 317 lines to 301 lines
- `UseHomeDataReturn` interface: **unchanged**

### Step 5: Settings & Alert CRUD Conversion
- `use-settings.ts`: Replaced data loading useEffect with `useAlertsQuery` + `useRoutesQuery`; removed `commuteApi` singleton and unused useState
- `use-alert-crud.ts`: Replaced alerts/routes loading useEffects with query hooks; replaced `reloadAlerts()` with `queryClient.invalidateQueries()`; kept local `setAlerts` for optimistic toggle sync
- Created `frontend/src/test-utils.tsx` with `TestProviders` (QueryClientProvider + MemoryRouter)
- Updated 3 test files to use `TestProviders`: HomePage, SettingsPage, AlertSettingsPage

### Mock Infrastructure Updates
- Added `weatherApiClient`, `airQualityApiClient`, `behaviorApiClient` mocks to `__mocks__/infrastructure/api/index.ts`
- Added missing type exports (`WeatherData`, `AirQualityData`, `DeparturePrediction`)
- Added `getArrival` mock to `subwayApiClient` and `busApiClient`
- Added `getWeatherRouteRecommendation` mock to `commuteApiClient`

## Quality Gates

| Check | Result |
|-------|--------|
| `vitest run` | 214 passed (19 test files) |
| `tsc --noEmit` | 0 new errors (pre-existing database.types.ts issue) |
| `eslint` | 0 new errors, 0 warnings |
| `vite build` | Success (78.44 KB gzip) |

## Acceptance Criteria Status

- [x] AC-1: `@tanstack/react-query` in dependencies
- [x] AC-2: QueryClientProvider wraps app root
- [x] AC-3: 5 query key factories defined
- [x] AC-4: 5 custom query hooks created
- [x] AC-5: use-home-data.ts converted to useQuery
- [x] AC-6: use-settings.ts converted
- [x] AC-7: use-alert-crud.ts converted with invalidateQueries
- [x] AC-8: UseHomeDataReturn interface unchanged
- [x] AC-9: All 214 tests pass
- [x] AC-10: lint + typecheck + build pass
- [x] AC-14: TestProviders helper created

## Files Changed

**New files (9):**
- `frontend/src/infrastructure/query/query-client.ts`
- `frontend/src/infrastructure/query/query-keys.ts`
- `frontend/src/infrastructure/query/error-utils.ts`
- `frontend/src/infrastructure/query/index.ts`
- `frontend/src/infrastructure/query/use-alerts-query.ts`
- `frontend/src/infrastructure/query/use-routes-query.ts`
- `frontend/src/infrastructure/query/use-weather-query.ts`
- `frontend/src/infrastructure/query/use-air-quality-query.ts`
- `frontend/src/infrastructure/query/use-commute-stats-query.ts`
- `frontend/src/test-utils.tsx`

**Modified files (7):**
- `frontend/package.json` (dependency added)
- `frontend/src/main.tsx` (QueryClientProvider)
- `frontend/src/presentation/pages/home/use-home-data.ts` (5 queries integrated)
- `frontend/src/presentation/pages/settings/use-settings.ts` (2 queries integrated)
- `frontend/src/presentation/pages/alert-settings/use-alert-crud.ts` (2 queries + invalidateQueries)
- `frontend/src/__mocks__/infrastructure/api/index.ts` (added missing mocks)
- `frontend/src/presentation/pages/home/HomePage.test.tsx` (TestProviders)
- `frontend/src/presentation/pages/SettingsPage.test.tsx` (TestProviders)
- `frontend/src/presentation/pages/AlertSettingsPage.test.tsx` (TestProviders)
