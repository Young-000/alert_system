# Q-5: Backend Integration Tests

## Goal
Expand backend test coverage with **service-layer integration tests** using real SQLite database connections (not mocked repositories). Current coverage: 539 unit tests (controllers only). Target: +30 integration tests.

---

## Scope

### Test Type
**Integration tests** - Test service methods with actual TypeORM + SQLite database:
- Use `@nestjs/testing` module
- Real TypeORM repository instances (not mocks)
- In-memory SQLite database per test suite
- Test business logic + database interactions together

### Out of Scope
- Controller tests (already complete: 160 tests)
- E2E tests (separate task)
- External API integration tests (already exists: AirQualityApiClient)

---

## Priority Services (by business criticality)

### Tier 1: Core Business Logic (highest priority)
1. **CommuteRouteService** (if exists) or equivalent
   - Route CRUD operations
   - Template creation
   - Checkpoint management
   - **Tests**: Create route → Find by user → Update → Delete

2. **CommuteSessionService** (if exists) or equivalent
   - Session start/stop
   - Checkpoint recording
   - Session completion
   - **Tests**: Start session → Record checkpoints → Complete → Verify duration

3. **AlertService** (if exists in application layer)
   - Alert CRUD
   - EventBridge scheduling integration
   - Alert activation/deactivation
   - **Tests**: Create alert → Schedule via EventBridge (mock) → Find active alerts → Delete

### Tier 2: Auth & Analytics
4. **AuthService**
   - User registration (hash password)
   - Login (verify password)
   - Token generation
   - **Tests**: Register → Login → Verify token

5. **AnalyticsService** (if exists)
   - Commute stats calculation
   - Streak tracking
   - Pattern analysis
   - **Tests**: Record sessions → Calculate stats → Verify aggregations

---

## Implementation Pattern

### Example Test Structure
```typescript
// src/application/services/__tests__/commute-route.service.integration.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommuteRouteService } from '../commute-route.service';
import { CommuteRoute } from '@domain/entities/commute-route.entity';
import { User } from '@domain/entities/user.entity';
import { DataSource } from 'typeorm';

describe('CommuteRouteService Integration', () => {
  let module: TestingModule;
  let service: CommuteRouteService;
  let dataSource: DataSource;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [CommuteRoute, User, /* all related entities */],
          synchronize: true, // Auto-create schema
        }),
        TypeOrmModule.forFeature([CommuteRoute, User]),
      ],
      providers: [CommuteRouteService],
    }).compile();

    service = module.get<CommuteRouteService>(CommuteRouteService);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(async () => {
    // Clean up DB between tests
    await dataSource.synchronize(true);
  });

  afterAll(async () => {
    await module.close();
  });

  it('should create and retrieve a route', async () => {
    const user = await dataSource.getRepository(User).save({ email: 'test@example.com', ... });
    const route = await service.createRoute(user.id, { name: 'Home to Work', ... });

    expect(route).toBeDefined();
    expect(route.name).toBe('Home to Work');

    const found = await service.findById(route.id);
    expect(found).toBeDefined();
    expect(found.userId).toBe(user.id);
  });

  it('should update route checkpoints', async () => {
    // Test checkpoint CRUD within route
  });

  it('should delete route and cascade checkpoints', async () => {
    // Test deletion + verify related data cleaned up
  });
});
```

### Key Patterns
- **One test suite per service** (e.g., `alert.service.integration.spec.ts`)
- **In-memory SQLite** (`:memory:`) - fast, isolated
- **Synchronize schema** before each test (`synchronize: true` or manual sync)
- **Clean DB** after each test to avoid pollution
- **Test full workflows** (not just single methods)

---

## Test Coverage Goals

| Service | Minimum Tests | Key Scenarios |
|---------|:-------------:|---------------|
| CommuteRouteService | 8 | CRUD, templates, checkpoints, user isolation |
| CommuteSessionService | 8 | Start/stop, checkpoint recording, completion, cancellation |
| AlertService | 7 | CRUD, scheduling, activation toggle, user filter |
| AuthService | 5 | Register, login, password validation, token lifecycle |
| AnalyticsService | 4 | Stats aggregation, streak calculation, date filtering |

**Total**: 32 tests minimum (+30 from current)

---

## Success Criteria

1. **30+ new integration tests** added
2. **All tests pass** with SQLite in-memory DB
3. **No mocked repositories** in integration tests (use real TypeORM)
4. **Fast execution**: Full suite runs <10 seconds
5. **No database pollution**: Each test is isolated (via `afterEach` cleanup)
6. **CI-ready**: Tests run without external dependencies (no Supabase connection required)

---

## Notes

- **Existing unit tests**: Keep controller tests as-is (mocked services)
- **File naming**: `*.integration.spec.ts` to distinguish from unit tests
- **TypeORM entities**: Import all related entities for foreign key relationships
- **External APIs**: Mock EventBridge/Solapi clients in integration tests (focus on DB logic)
- **Jest config**: Ensure `testRegex` matches `*.integration.spec.ts` pattern

---

## References

- Existing integration test: `air-quality-api.client.integration.spec.ts`
- Existing unit test pattern: `auth.service.spec.ts` (mocked JwtService)
- TypeORM Testing Docs: https://docs.nestjs.com/techniques/database#testing
