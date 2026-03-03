# 03 — Test Results

**Date**: 2026-02-28
**Branch**: `main`

---

## Summary

| Area | Suites | Tests | Passed | Failed | Skipped |
|------|-------:|------:|-------:|-------:|--------:|
| **Frontend** | 35 | 480 | 480 | 0 | 0 |
| **Backend** | 78 | 902 | 892 | 0 | 10 |
| **Total** | 113 | 1,382 | 1,372 | 0 | 10 |

**Result: ALL TESTS PASS (0 failures, 2 fixes applied)**

---

## Frontend (Vitest 4.0.18)

**Command**: `cd frontend && npx vitest run`

```
Test Files:  35 passed (35)
Tests:       480 passed (480)
Duration:    6.96s
```

No failures. No skipped tests. No time-dependent issues.

---

## Backend (Jest 29)

**Command**: `cd backend && npm test`

```
Test Suites: 3 skipped, 75 passed, 75 of 78 total
Tests:       10 skipped, 892 passed, 902 total
Duration:    ~12.6s
```

### Skipped Suites (3) — intentional, env-gated

| File | Skip Condition | Reason |
|------|----------------|--------|
| `infrastructure/external-apis/air-quality-api.client.integration.spec.ts` | `RUN_INTEGRATION_TESTS=true` + API key | External API integration test |
| `infrastructure/persistence/postgres-alert.repository.spec.ts` | `RUN_DB_TESTS=true` | Requires live PostgreSQL |
| `infrastructure/persistence/postgres-user.repository.spec.ts` | `RUN_DB_TESTS=true` | Requires live PostgreSQL |

---

## Fixes Applied (2)

### Fix 1: `predict-optimal-departure.use-case.spec.ts`

**Problem**: Test file passed 3 constructor arguments but the source class only accepts 2. The `patternAnalysisService` parameter was removed from the source during a previous refactoring, but the spec was not updated.

**Error**: `TS2554: Expected 2 arguments, but got 3.` (7 locations)

**Changes**:
- Removed `mockPatternAnalysisService` variable declaration and mock setup
- Changed `new PredictOptimalDepartureUseCase(null, null, null)` to `(null, null)`
- Changed `new PredictOptimalDepartureUseCase(repo, analysisService, alertRepo)` to `(repo, alertRepo)` at 6 call sites

### Fix 2: `generate-weekly-report.use-case.spec.ts`

**Problem**: Test file passed 6 constructor arguments but the source class only accepts 5. The `notificationLogRepo` parameter was removed from the source during a previous refactoring, but the spec was not updated.

**Error**: `TS2554: Expected 1-5 arguments, but got 6.` (7 locations)

**Changes**:
- Removed `mockNotificationLogRepo` variable declaration and mock setup
- Removed `mockNotificationLogRepo` from all 6 `new GenerateWeeklyReportUseCase(...)` calls
- Updated the "without services" test from 6 `undefined` args to 5

---

## Time-Dependent Tests

| Test | Status | Note |
|------|--------|------|
| `use-commute-mode.test.ts` (`getAutoMode`) | SAFE | Passes explicit hour parameter, no system clock dependency |
| `use-commute-mode.test.ts` (`useCommuteMode`) | SAFE | Compares against same function call, consistent at any time |

---

## Test Growth

| Metric | Previous (2026-02-12) | Current (2026-02-28) | Delta |
|--------|----------------------:|---------------------:|------:|
| FE Suites | 8 | 35 | +27 |
| FE Tests | 25 | 480 | +455 |
| BE Suites | 27 | 75 | +48 |
| BE Tests | 194 | 892 | +698 |
| **Total Tests** | **219** | **1,372** | **+1,153** |
