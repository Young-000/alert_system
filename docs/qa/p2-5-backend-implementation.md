# P2-5 Backend Implementation Summary

> Date: 2026-02-20 | Branch: `feature/ios-live-activity` | Agent: Backend Developer

---

## Tasks Completed

### BE-1: Entity (`live-activity-token.entity.ts`)

**Domain entity:** `backend/src/domain/entities/live-activity-token.entity.ts`
- Immutable domain entity with `create()`, `deactivate()`, `updatePushToken()` methods
- Fields: `id` (UUID), `userId`, `activityId`, `pushToken`, `mode` ('commute' | 'return'), `settingId` (nullable), `isActive`, `createdAt`, `updatedAt`
- Validation in `create()`: requires non-empty activityId, pushToken, valid mode

**TypeORM entity:** `backend/src/infrastructure/persistence/typeorm/live-activity-token.entity.ts`
- Maps to `alert_system.live_activity_tokens` table
- Indexes: `userId`, unique `activityId`, `isActive` (partial)
- Relations: `ManyToOne` to `UserEntity` (CASCADE delete), `ManyToOne` to `SmartDepartureSettingEntity` (SET NULL)

### BE-2: DTOs (`live-activity.dto.ts`)

**File:** `backend/src/application/dto/live-activity.dto.ts`
- `RegisterLiveActivityDto` with class-validator decorators: `pushToken` (required string), `activityId` (required string), `mode` (required, 'commute' | 'return'), `settingId` (optional UUID)
- `RegisterLiveActivityResponseDto`: `{ id: string, registered: boolean }`
- `LiveActivityTokenResponseDto`: full token info for GET responses

### BE-3: Controller (`live-activity.controller.ts`)

**File:** `backend/src/presentation/controllers/live-activity.controller.ts`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/live-activity/register` | Register push token (upserts by activityId, deactivates previous active tokens) |
| DELETE | `/live-activity/:activityId` | Deactivate token (404 if not found or not owned) |
| GET | `/live-activity/active` | Get current user's active Live Activity (null if none) |

- All endpoints protected with `@UseGuards(AuthGuard('jwt'))`
- Uses `@InjectRepository` pattern consistent with PushController

### BE-4: Push Service (`live-activity-push.service.ts`)

**File:** `backend/src/application/services/live-activity-push.service.ts`
- Defines `ILiveActivityPushService` interface with: `sendUpdate()`, `sendEnd()`, `buildContentState()`
- `LiveActivityPushService` implements as **stub/log-only** for MVP
- Detailed TODO comments for actual APNs HTTP/2 implementation
- Injection token: `LIVE_ACTIVITY_PUSH_SERVICE` (Symbol)
- Types exported: `LiveActivityContentState`, `LiveActivityPushPayload`

### BE-5: RecalculateDeparture Integration

**File:** `backend/src/application/use-cases/calculate-departure.use-case.ts` (modified)
- Added `@Optional() @Inject(LIVE_ACTIVITY_PUSH_SERVICE)` as optional dependency
- Added `notifyLiveActivityUpdate()` private method
- Integration point: when existing snapshot is updated and travel time changes by >= 2 minutes, the method is called
- For MVP: builds content-state and logs; actual token lookup and push will be wired when LiveActivityModule is injected into SmartDepartureModule
- No breaking changes to existing behavior (optional dependency, graceful fallback)

### BE-6: Module (`live-activity.module.ts`)

**File:** `backend/src/presentation/modules/live-activity.module.ts`
- Registers: `LiveActivityTokenEntity` (TypeORM), `LiveActivityController`, `LiveActivityPushService`
- Exports: `LIVE_ACTIVITY_PUSH_SERVICE`, `TypeOrmModule`
- Registered in `AppModule`

### BE-7: Unit Tests

| Test File | Tests | Status |
|-----------|-------|--------|
| `domain/entities/live-activity-token.entity.spec.ts` | 11 | PASS |
| `presentation/controllers/live-activity.controller.spec.ts` | 8 | PASS |
| `application/services/live-activity-push.service.spec.ts` | 9 | PASS |
| **Total new tests** | **28** | **ALL PASS** |

Full test suite: 675 passed, 10 skipped (pre-existing), 0 failed.

---

## Files Created

| File | Purpose |
|------|---------|
| `backend/src/domain/entities/live-activity-token.entity.ts` | Domain entity |
| `backend/src/infrastructure/persistence/typeorm/live-activity-token.entity.ts` | TypeORM entity |
| `backend/src/application/dto/live-activity.dto.ts` | Request/Response DTOs |
| `backend/src/application/services/live-activity-push.service.ts` | APNs push service (stub) |
| `backend/src/presentation/controllers/live-activity.controller.ts` | REST controller |
| `backend/src/presentation/modules/live-activity.module.ts` | NestJS module |
| `backend/src/domain/entities/live-activity-token.entity.spec.ts` | Entity tests |
| `backend/src/presentation/controllers/live-activity.controller.spec.ts` | Controller tests |
| `backend/src/application/services/live-activity-push.service.spec.ts` | Service tests |

## Files Modified

| File | Change |
|------|--------|
| `backend/src/presentation/app.module.ts` | Added `LiveActivityModule` import |
| `backend/src/application/use-cases/calculate-departure.use-case.ts` | Added optional `ILiveActivityPushService` dependency and `notifyLiveActivityUpdate()` hook |

---

## Verification

- `tsc --noEmit`: 0 errors
- `jest --passWithNoTests`: 675 passed, 0 failed
- No regressions to existing tests

---

## API Contract for Frontend/Mobile

```typescript
// POST /live-activity/register (201)
// Request:
{ pushToken: string; activityId: string; mode: 'commute' | 'return'; settingId?: string }
// Response:
{ id: string; registered: boolean }

// DELETE /live-activity/:activityId (204)
// No body

// GET /live-activity/active (200)
// Response (or null):
{ id: string; activityId: string; mode: 'commute' | 'return'; settingId: string | null; isActive: boolean; createdAt: string; updatedAt: string }
```

All endpoints require `Authorization: Bearer {jwt_token}` header.

---

## Next Steps

1. **APNs real implementation**: When `.p8` key is configured, replace the stub `LiveActivityPushService` with actual HTTP/2 APNs connection
2. **Wire token lookup**: In `notifyLiveActivityUpdate()`, inject `LiveActivityTokenEntity` repository to look up active tokens for the user/setting and send actual pushes
3. **Inject into SmartDepartureModule**: Add `LiveActivityModule` to SmartDepartureModule imports so the optional `LIVE_ACTIVITY_PUSH_SERVICE` is resolved
