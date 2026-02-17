# Cycle 9: Backend Controller Tests

## JTBD
When I deploy backend changes to production, I want controller-level test coverage to catch regressions in HTTP routing, authorization, request validation, and error handling, so I can ship with confidence that the API contract is intact.

## Problem
- **Who:** Developer maintaining the alert_system backend
- **Pain:** High frequency (every deploy) x High severity (broken API = broken app). 17 controllers, 0% controller test coverage (only `alert.controller.spec.ts` exists with 20 tests). The existing 286 tests cover domain entities, use-cases, infrastructure services, and repositories -- but never verify that controllers wire everything together correctly: correct HTTP status codes, authorization guards, request parameter parsing, and error-to-response mapping.
- **Current workaround:** Manual testing via curl/Postman or relying on use-case tests to indirectly cover controller behavior. Authorization logic lives inside controllers and is completely untested (except AlertController).
- **Success metric:** Controller test coverage goes from 1/17 (6%) to 17/17 (100%) of controller files covered. Total backend test count increases from 286 to 450+ (estimated ~170 new tests).

## Solution

### Overview
Add unit tests for all 16 untested controllers following the established pattern in `alert.controller.spec.ts`. Each test file mocks service dependencies (use-cases, repositories) and verifies:
1. Correct delegation to the underlying service layer
2. Authorization checks (ownership validation, ForbiddenException for other users)
3. Error paths (NotFoundException, UnauthorizedException for missing/invalid resources)
4. Response shapes match what the frontend expects

This is a unit-test approach (not HTTP-level integration tests with supertest) -- matching the existing codebase convention of using `Test.createTestingModule()` to instantiate controllers with mocked providers.

### Test Pattern (Reference: `alert.controller.spec.ts`)

```typescript
// 1. Setup: NestJS TestingModule with mocked providers
const module: TestingModule = await Test.createTestingModule({
  controllers: [XxxController],
  providers: [
    { provide: SomeUseCase, useValue: { execute: jest.fn() } },
    { provide: 'ISomeRepository', useValue: { findById: jest.fn(), ... } },
  ],
}).compile();

// 2. Test: Call controller method directly with mock request
const mockRequest = { user: { userId: 'user-123', email: 'test@test.com' } };
const result = await controller.someMethod('param', mockRequest);

// 3. Assert: Verify delegation + response
expect(someUseCase.execute).toHaveBeenCalledWith('param');
expect(result).toEqual(expectedResponse);

// 4. Auth test: Verify ForbiddenException for other users
await expect(controller.someMethod('param', otherUserReq)).rejects.toThrow(ForbiddenException);
```

### Scope (MoSCoW)

**Must have:**
- Test files for all 16 untested controllers
- Authorization tests for every endpoint that checks `req.user.userId`
- Happy path tests for every public method on each controller
- Error path tests (NotFoundException, ForbiddenException, UnauthorizedException)
- All existing 286 tests still pass

**Should have:**
- Edge case tests (empty arrays, NaN parsing, missing optional parameters)
- Scheduler-trigger secret validation tests (timing-safe comparison)
- Query parameter parsing tests (limit, offset, days with defaults)

**Could have:**
- DTO validation tests (class-validator decorators) -- requires supertest + full module bootstrap
- Auth guard integration tests (actual JWT validation)
- Response serialization tests (verifying DTO transformation shapes)

**Won't have (this cycle):**
- E2E / HTTP-level tests with supertest (separate effort, requires DB setup)
- Performance / load tests
- Integration tests with real database connections

## Controller Inventory & Priority

### Tier 1: Core Business (Must test first -- highest user impact)

| # | Controller | Lines | Endpoints | Auth | Risk | Est. Tests |
|---|-----------|------:|:---------:|:----:|:----:|:----------:|
| 1 | `auth.controller.ts` | 103 | 5 | Public + Google OAuth | HIGH | 15 |
| 2 | `route.controller.ts` | 151 | 6 | JWT + ownership | HIGH | 20 |
| 3 | `commute.controller.ts` | 180 | 8 | JWT + ownership | HIGH | 25 |
| 4 | `user.controller.ts` | 49 | 3 | Mixed (Public + JWT) | HIGH | 10 |
| 5 | `scheduler-trigger.controller.ts` | 145 | 3 | Custom secret | HIGH | 15 |

### Tier 2: Supporting Features (Important for correctness)

| # | Controller | Lines | Endpoints | Auth | Risk | Est. Tests |
|---|-----------|------:|:---------:|:----:|:----:|:----------:|
| 6 | `behavior.controller.ts` | 259 | 7 | JWT + ownership | MEDIUM | 25 |
| 7 | `analytics.controller.ts` | 340 | 6 | JWT + ownership | MEDIUM | 20 |
| 8 | `push.controller.ts` | 91 | 2 | JWT | MEDIUM | 8 |
| 9 | `notification-history.controller.ts` | 40 | 1 | JWT | MEDIUM | 5 |
| 10 | `privacy.controller.ts` | 67 | 2 | JWT + ownership | MEDIUM | 8 |

### Tier 3: External API Proxies & Dev Tools (Lower risk)

| # | Controller | Lines | Endpoints | Auth | Risk | Est. Tests |
|---|-----------|------:|:---------:|:----:|:----:|:----------:|
| 11 | `weather.controller.ts` | 32 | 1 | Public | LOW | 5 |
| 12 | `air-quality.controller.ts` | 27 | 2 | Mixed | LOW | 6 |
| 13 | `subway.controller.ts` | 28 | 2 | Public | LOW | 5 |
| 14 | `bus.controller.ts` | 28 | 2 | Public | LOW | 5 |
| 15 | `health.controller.ts` | 18 | 1 | Public | LOW | 2 |
| 16 | `dev.controller.ts` | 158 | 4 | Public (dev-only) | LOW | 8 |

**Estimated total: ~182 new tests**

## Acceptance Criteria

### Tier 1 (Must pass)

- [ ] Given a valid JWT user, When calling any CRUD endpoint with their own userId, Then the controller delegates to the correct use-case/repository and returns the expected result
- [ ] Given a valid JWT user, When calling any endpoint with a different user's userId, Then the controller throws ForbiddenException before calling the service layer
- [ ] Given `auth.controller` register endpoint, When called with valid CreateUserDto, Then it returns an AuthResponse with accessToken and user object
- [ ] Given `auth.controller` login endpoint, When called with valid credentials, Then it returns HTTP 200 (not 201) with AuthResponse
- [ ] Given `auth.controller` google/status endpoint, When Google OAuth is not configured, Then it returns `{ enabled: false }` with explanation message
- [ ] Given `scheduler-trigger.controller` trigger endpoint, When called without x-scheduler-secret header, Then it throws UnauthorizedException
- [ ] Given `scheduler-trigger.controller` trigger endpoint, When called with wrong secret, Then it throws UnauthorizedException (timing-safe comparison)
- [ ] Given `scheduler-trigger.controller` trigger endpoint, When called with correct secret and valid payload, Then it calls sendNotificationUseCase.execute with the alertId
- [ ] Given `route.controller` createRoute, When dto.userId does not match req.user.userId, Then ForbiddenException is thrown before any service call
- [ ] Given `commute.controller` getHistory, When limit/offset query params are provided, Then they are parsed as integers with defaults (20, 0)
- [ ] Given `commute.controller` getInProgressSession, When no session is in progress, Then it returns `{ session: null }` (not 404)
- [ ] Given all 17 controller spec files exist, When running `npx jest`, Then all tests pass (286 existing + new tests)

### Tier 2 (Should pass)

- [ ] Given `behavior.controller` trackEvent, When eventType is unknown, Then it returns `{ success: false }` without throwing
- [ ] Given `behavior.controller` getUserPatterns, When userPatternRepository is not injected (Optional), Then it returns `{ patterns: [], message: 'Pattern repository not available' }`
- [ ] Given `analytics.controller` compareRoutes, When fewer than 2 routeIds are provided, Then it throws an error
- [ ] Given `analytics.controller` compareRoutes, When more than 5 routeIds are provided, Then it throws an error
- [ ] Given `analytics.controller` getSummary, When user has no analytics data, Then it returns empty state with insight message
- [ ] Given `push.controller` subscribe, When an existing subscription endpoint is provided, Then it updates (upsert) instead of duplicating
- [ ] Given `weather.controller` getCurrent, When weatherApiClient is not injected, Then it returns `{ error: 'Weather API not configured' }`
- [ ] Given `weather.controller` getCurrent, When lat/lng are invalid (NaN), Then it returns `{ error: 'Invalid coordinates' }`
- [ ] Given `dev.controller` any endpoint, When NODE_ENV is 'production', Then it throws an error

### Tier 3 (Could pass)

- [ ] Given `notification-history.controller` getHistory, When limit exceeds 50, Then it caps at 50
- [ ] Given `privacy.controller` exportUserData, When called by the owner, Then it delegates to exportUserDataUseCase with the userId
- [ ] Given `health.controller` health endpoint, When called, Then it returns `{ status: 'ok', timestamp: <ISO string> }`

## Task Breakdown

### Phase 1: Tier 1 Controllers (Core Business)

| # | Task | Size | Deps | Est. Tests |
|---|------|:----:|:----:|:----------:|
| 1 | Create `health.controller.spec.ts` — warm-up task, simplest controller | S | none | 2 |
| 2 | Create `auth.controller.spec.ts` — register, login, google status, google callback | L | none | 15 |
| 3 | Create `user.controller.spec.ts` — create (public), findOne (auth), updateLocation (auth) | M | none | 10 |
| 4 | Create `route.controller.spec.ts` — full CRUD + recommendation + auth checks | L | none | 20 |
| 5 | Create `commute.controller.spec.ts` — session lifecycle + stats + history + query parsing | L | none | 25 |
| 6 | Create `scheduler-trigger.controller.spec.ts` — secret validation + trigger + weekly-report + health | M | none | 15 |

### Phase 2: Tier 2 Controllers (Supporting Features)

| # | Task | Size | Deps | Est. Tests |
|---|------|:----:|:----:|:----------:|
| 7 | Create `behavior.controller.spec.ts` — 7 endpoints, optional deps, event mapping | L | none | 25 |
| 8 | Create `analytics.controller.spec.ts` — 6 endpoints, validateRouteOwnership, toResponseDto | L | none | 20 |
| 9 | Create `push.controller.spec.ts` — subscribe (upsert logic), unsubscribe | M | none | 8 |
| 10 | Create `notification-history.controller.spec.ts` — pagination, capping | S | none | 5 |
| 11 | Create `privacy.controller.spec.ts` — export, delete-all-data, auth checks | M | none | 8 |

### Phase 3: Tier 3 Controllers (External APIs & Dev Tools)

| # | Task | Size | Deps | Est. Tests |
|---|------|:----:|:----:|:----------:|
| 12 | Create `weather.controller.spec.ts` — optional dep, coordinate parsing | S | none | 5 |
| 13 | Create `air-quality.controller.spec.ts` — getByUser (auth), getByLocation (no auth) | S | none | 6 |
| 14 | Create `subway.controller.spec.ts` — search + arrival, optional API client | S | none | 5 |
| 15 | Create `bus.controller.spec.ts` — search + arrival, optional API client | S | none | 5 |
| 16 | Create `dev.controller.spec.ts` — production guard, seed CRUD, phase2 guide | M | none | 8 |

### Phase 4: Verification

| # | Task | Size | Deps | Est. Tests |
|---|------|:----:|:----:|:----------:|
| 17 | Run full test suite, fix any failures, verify total count 450+ | S | 1-16 | 0 |

## Test File Organization

All controller test files go alongside their source file (colocation pattern):

```
backend/src/presentation/controllers/
  alert.controller.ts
  alert.controller.spec.ts          # existing (20 tests)
  auth.controller.ts
  auth.controller.spec.ts           # NEW
  route.controller.ts
  route.controller.spec.ts          # NEW
  commute.controller.ts
  commute.controller.spec.ts        # NEW
  ... (same pattern for all 16)
```

File naming: `{controller-name}.controller.spec.ts` -- matches Jest `testRegex: '.*\\.spec\\.ts$'`.

## Test Writing Guidelines

### Mock Request Helper (reuse across all files)

```typescript
const mockRequest = (userId: string): AuthenticatedRequest => ({
  user: { userId, email: `${userId}@test.com` },
} as AuthenticatedRequest);

const OWNER_ID = 'user-123';
const OTHER_USER_ID = 'other-user';
```

### Test Naming Convention (Korean, matching existing style)

```typescript
describe('method 이름', () => {
  it('성공 케이스 설명', async () => { ... });
  it('다른 사용자 접근 시 ForbiddenException', async () => { ... });
  it('존재하지 않는 리소스 시 NotFoundException', async () => { ... });
});
```

### Authorization Test Pattern (every auth-protected endpoint must have this)

```typescript
it('다른 사용자의 리소스 접근 시 ForbiddenException', async () => {
  await expect(
    controller.someMethod('resource-id', mockRequest(OTHER_USER_ID)),
  ).rejects.toThrow(ForbiddenException);

  // Verify service was NOT called (authorization is checked BEFORE delegation)
  expect(someUseCase.execute).not.toHaveBeenCalled();
});
```

### Optional Dependency Test Pattern (for @Optional() injected services)

```typescript
it('서비스가 주입되지 않았을 때 폴백 응답 반환', async () => {
  // Create controller without the optional dependency
  const module = await Test.createTestingModule({
    controllers: [WeatherController],
    providers: [], // no IWeatherApiClient provided
  }).compile();

  const ctrl = module.get<WeatherController>(WeatherController);
  const result = await ctrl.getCurrent();
  expect(result).toEqual({ error: 'Weather API not configured' });
});
```

## Coverage Targets

| Metric | Before (Cycle 8) | Target (Cycle 9) | Stretch |
|--------|:-----------------:|:-----------------:|:-------:|
| Controller files with tests | 1/17 (6%) | 17/17 (100%) | -- |
| Controller test count | 20 | 180+ | 200+ |
| Total backend tests | 286 | 450+ | 480+ |
| Controller line coverage | ~5% | 80%+ | 90%+ |

Note: 80% line coverage is realistic because some branches (e.g., Google OAuth callback with real `@Res()` object manipulation, complex `generateInsights` in AnalyticsController) are harder to test at the unit level. Full 90%+ requires supertest integration tests, which is out of scope.

## Open Questions

1. **Should `dev.controller.spec.ts` test the actual seed/clear behavior (requires DataSource mock)?** Recommendation: Yes, but mock the DataSource and the seed functions. The production guard (`assertNotProduction`) is the critical test.

2. **AnalyticsController has private helper methods (`toResponseDto`, `generateInsights`, `validateRouteOwnership`) -- test via public methods or extract?** Recommendation: Test through public methods. If a private method is hard to reach through the public API, that is a code smell to note for refactoring later.

3. **PushController uses `@InjectRepository(PushSubscriptionEntity)` directly -- mock with what?** Recommendation: Mock the TypeORM Repository interface: `{ findOne: jest.fn(), save: jest.fn(), delete: jest.fn() }`, provided as `{ provide: getRepositoryToken(PushSubscriptionEntity), useValue: mockRepo }`.

## Out of Scope

- **HTTP-level integration tests (supertest):** Would require full NestJS app bootstrap, database setup, and auth token generation. Separate XL effort.
- **DTO class-validator tests:** Requires `ValidationPipe` integration. Could be a follow-up item.
- **Guard/interceptor tests:** JwtAuthGuard, ThrottlerGuard, etc. are framework-provided and tested by NestJS.
- **Frontend API client tests:** Separate concern, different codebase.

---

## Secondary Spec: N-8 -- Solapi Weekly Report Template (if time permits)

### JTBD
When Monday morning arrives after a week of commuting, I want to receive a Kakao Alimtalk message summarizing my weekly commute stats, so I can see my commuting patterns without opening the app.

### Current State
- `GenerateWeeklyReportUseCase` already exists and calculates: totalCommutes, avgDuration, bestDay, tip
- `SchedulerTriggerController` has a `POST /scheduler/weekly-report` endpoint
- `ISolapiService.sendWeeklyReport()` interface is defined
- Template variables are defined: `WeeklyReportVariables { userName, weekRange, totalCommutes, avgDuration, bestDay, tip }`
- **Missing:** Actual approved Solapi template. Current template ID (`KA01TP2601181035243285qjwlwSLm5X`) is for the daily alert, not the weekly report.

### What Needs to Happen

1. **Create Solapi Weekly Report Template** (manual, Solapi Console):
   - Template body using the 6 variables above
   - Submit for Kakao review/approval (takes 1-3 business days)

2. **Add template ID to config** once approved:
   - New SSM parameter: `/alert-system/prod/solapi-weekly-template-id`
   - Update `SolapiService` to use the weekly template ID for `sendWeeklyReport()`

3. **Create EventBridge schedule** for weekly trigger:
   - Cron: `cron(0 0 * * 1 *)` (Monday 09:00 KST = 00:00 UTC)
   - Target: `POST /scheduler/weekly-report` with x-scheduler-secret header

### Scope for This Cycle

**Could have (if Tier 1-3 controller tests are done):**
- Draft the Solapi template text (submit for approval is manual)
- Add `SOLAPI_WEEKLY_TEMPLATE_ID` config and update SolapiService
- Add test for `generateWeeklyReportUseCase` weekly-report trigger endpoint (already partially done in scheduler-trigger controller tests)

**Won't have (this cycle):**
- Actual Kakao template approval (external dependency, 1-3 days)
- EventBridge schedule creation (requires approved template first)

---

*Spec written: 2026-02-17 | Cycle 9 | Estimated effort: XL (16 test files, ~180 tests)*
