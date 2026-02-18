# Q-5 Backend Integration/Service Tests — Implementation Notes

## Date: 2026-02-18

## Summary

8 new service test files added, covering all previously untested services.
Total new tests: **98 tests** across 8 files (647 total from 539 baseline).

## Files Created

### Tier 1 — Critical

| File | Tests | Key Patterns |
|------|-------|-------------|
| `infrastructure/scheduler/eventbridge-scheduler.service.spec.ts` | 14 | jest.mock for @aws-sdk/client-scheduler, env var setup/teardown |
| `domain/services/rule-engine.service.spec.ts` | 15 | Real evaluator instances (no mocks), condition combination tests |
| `application/services/pattern-analysis.service.spec.ts` | 10 | Mock repos, weekday date generation, cold start edge cases |
| `infrastructure/messaging/solapi.service.spec.ts` | 14 | jest.mock for solapi lib, ConfigService mock, template ID verification |

### Tier 2 — High

| File | Tests | Key Patterns |
|------|-------|-------------|
| `application/services/data-retention.service.spec.ts` | 10 | Nullable repos (@Optional), date cutoff verification, GDPR deletion |
| `infrastructure/messaging/web-push.service.spec.ts` | 11 | jest.mock for web-push, expired sub cleanup (410/404), partial failure handling |
| `application/services/smart-message-builder.service.spec.ts` | 16 | Weather translation, transit comparison, priority filtering, fake timers |
| `infrastructure/cache/cache-cleanup.service.spec.ts` | 5 | Delegation to ApiCacheService, error isolation |

## Notable Design Decisions

1. **RuleEngine tested with real evaluators** — Since evaluators are pure logic with no external dependencies, using real instances provides more realistic coverage than mocking.

2. **Pattern analysis weekday dates** — Records must be created on actual weekdays (Mon-Fri) because `getRecentRecords` filters by `commuteDate.getDay()`. Initial test used sequential day offsets that landed on weekends, causing filter mismatches.

3. **EventBridge cron conversion** — Tested indirectly through `scheduleNotification` since `convertToEventBridgeCron` is private. Assertions check the `CreateScheduleCommand` input.

4. **Solapi mock strategy** — Used `jest.mock('solapi')` at module level rather than manual class mocking, since the constructor is called in `SolapiService` constructor.

5. **WebPushService expired subscription cleanup** — Verifies both 410 (Gone) and 404 (Not Found) status codes trigger deletion, matching the production error handling pattern.

## Quality Gates

All passed:
- `npm test -- --passWithNoTests` — 59 suites, 647 tests (98 new)
- `npx tsc --noEmit` — 0 errors
- `npm run lint:check` — 0 errors

## Entity Type Corrections Made During Implementation

- `BusArrival` uses `remainingStops` (not `stationOrder`)
- `SubwayArrival` uses `lineId` (not `subwayId`)
- `NoopWebPushService.sendToUser()` takes 0 parameters (rest params)
