# Cycle 9 — Backend Controller Tests: Developer Output

## Summary

| Metric | Value |
|--------|-------|
| **Task** | Backend Controller Unit Tests (XL) |
| **New Test Files** | 16 |
| **New Tests** | 160 |
| **Existing Tests** | 286 (across 31 suites) |
| **Total Tests After** | 446 (across 47 suites + 3 skipped) |
| **Pass Rate** | 100% (0 failures) |
| **Date** | 2026-02-17 |

## Test Files Created (16)

| # | File | Tests | Tier |
|---|------|------:|------|
| 1 | `health.controller.spec.ts` | 2 | Warmup |
| 2 | `auth.controller.spec.ts` | 10 | 1 |
| 3 | `user.controller.spec.ts` | 9 | 1 |
| 4 | `route.controller.spec.ts` | 17 | 1 |
| 5 | `commute.controller.spec.ts` | 21 | 1 |
| 6 | `scheduler-trigger.controller.spec.ts` | 12 | 1 |
| 7 | `behavior.controller.spec.ts` | 24 | 2 |
| 8 | `analytics.controller.spec.ts` | 18 | 2 |
| 9 | `push.controller.spec.ts` | 5 | 2 |
| 10 | `notification-history.controller.spec.ts` | 5 | 2 |
| 11 | `privacy.controller.spec.ts` | 7 | 2 |
| 12 | `weather.controller.spec.ts` | 5 | 3 |
| 13 | `air-quality.controller.spec.ts` | 5 | 3 |
| 14 | `subway.controller.spec.ts` | 5 | 3 |
| 15 | `bus.controller.spec.ts` | 5 | 3 |
| 16 | `dev.controller.spec.ts` | 10 | 3 |
| | **Total** | **160** | |

## Coverage by Test Category

### Authorization Tests (ForbiddenException)
Every auth-protected endpoint has an ownership check test:
- `auth.controller`: N/A (public endpoints)
- `user.controller`: findOne, updateLocation (2 tests)
- `route.controller`: getRoute, updateRoute, deleteRoute, getUserRoutes (4 tests)
- `commute.controller`: startSession, recordCheckpoint, completeSession, cancelSession, getSession, getHistory, getStats (7 tests)
- `behavior.controller`: trackEvent, confirmDeparture, notificationOpened, getUserPatterns, getCommuteHistory, predictOptimalDeparture, getBehaviorAnalytics (7 tests)
- `analytics.controller`: getRouteAnalytics, recalculateRouteAnalytics, getUserAnalytics, compareRoutes, getRecommendedRoutes, getSummary (6 tests)
- `push.controller`: subscribe, unsubscribe (2 tests)
- `notification-history.controller`: getHistory (1 test)
- `privacy.controller`: exportUserData, deleteAllUserData (2 tests)

### UnauthorizedException Tests
- `scheduler-trigger.controller`: 5 tests (missing secret, wrong secret, length mismatch, unconfigured, weekly report)

### Optional Dependency Fallback Tests
- `behavior.controller`: 3 tests (pattern repo, commute repo, predict service)
- `weather.controller`: 1 test (weather API client)
- `subway.controller`: 1 test (subway API client)
- `bus.controller`: 1 test (bus API client)
- `auth.controller`: 1 test (Google OAuth use case)

### Edge Case / Error Tests
- `route.controller`: route not found (NotFoundException)
- `commute.controller`: query param parsing (limit, offset, days), in-progress session null
- `analytics.controller`: too few routes, too many routes, empty data
- `notification-history.controller`: limit capping at 50, invalid limit string
- `weather.controller`: invalid coordinates
- `dev.controller`: production environment guard (4 tests), seed/clear failure recovery

## Issues Encountered & Fixed

### Issue 1: `variability` type mismatch (analytics.controller.spec.ts)
- **Symptom**: TypeScript compile error — `Type '"low"' is not assignable to type '"stable" | "variable" | "unpredictable"'`
- **Root Cause**: Mock data used `variability: 'low'` but the `SegmentStats` type in `route-analytics.entity.ts` only allows `'stable' | 'variable' | 'unpredictable'`
- **Fix**: Changed to `variability: 'stable'`

### Issue 2: `@Optional()` DI resolution in NestJS TestingModule (behavior.controller.spec.ts)
- **Symptom**: `predictOptimalDepartureUseCase.execute` not being called (0 calls) even though the mock was provided via `{ provide: PredictOptimalDepartureUseCase, useValue: mockPredictUseCase }`
- **Root Cause**: NestJS `@Optional()` decorator on class-based (non-token) constructor parameters can silently fail to inject in `TestingModule`, resulting in `undefined` at runtime even when explicitly provided
- **Fix**: Directly instantiate `BehaviorController` via `new BehaviorController(...)` instead of using NestJS DI for tests that require the optional dependency to be present. Tests for "service not available" still use `TestingModule` without the provider.

## Testing Pattern Used

All test files follow the established codebase pattern from `alert.controller.spec.ts`:

```typescript
// 1. NestJS TestingModule setup
const module: TestingModule = await Test.createTestingModule({
  controllers: [XxxController],
  providers: [
    { provide: SomeUseCase, useValue: mockUseCase },
    { provide: 'SOME_TOKEN', useValue: mockService },
  ],
}).compile();

// 2. Mock request helper for auth checks
const mockRequest = (userId: string) => ({
  user: { userId, email: `${userId}@test.com` },
}) as any;

// 3. Korean test naming
it('자신의 경로 조회 성공', async () => { ... });
it('다른 사용자의 경로 조회 시 ForbiddenException', async () => { ... });
```

## Test Run Output

```
Test Suites: 3 skipped, 47 passed, 47 of 50 total
Tests:       10 skipped, 446 passed, 456 total
Snapshots:   0 total
Time:        ~7s
```

All 16 new test files pass. No existing tests were broken. No source code was modified.
