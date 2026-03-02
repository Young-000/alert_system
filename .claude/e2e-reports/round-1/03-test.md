# 03 — Test Results

**Date**: 2026-03-03
**Branch**: `feature/e2e-auto-review-20260303`

---

## Summary

| Area | Suites | Tests | Passed | Failed | Skipped |
|------|-------:|------:|-------:|-------:|--------:|
| **Frontend** | 48 | 607 | 607 | 0 | 0 |
| **Backend** | 101 | 1,358 | 1,348 | 0 | 10 |
| **Total** | 149 | 1,965 | 1,955 | 0 | 10 |

**Result: ALL TESTS PASS (0 failures, 0 fixes needed)**

---

## Frontend (Vitest 4.0.18)

**Command**: `cd frontend && npm test -- --run`

```
Test Files:  48 passed (48)
Tests:       607 passed (607)
Duration:    11.11s
```

No failures. No skipped tests. No time-dependent issues.

---

## Backend (Jest 29)

**Command**: `cd backend && npm test`

```
Test Suites: 3 skipped, 101 passed, 101 of 104 total
Tests:       10 skipped, 1,348 passed, 1,358 total
Duration:    ~35.9s
```

### Skipped Suites (3) — intentional, env-gated

| File | Skip Condition | Reason |
|------|----------------|--------|
| `infrastructure/external-apis/air-quality-api.client.integration.spec.ts` | `RUN_INTEGRATION_TESTS=true` + API key | External API integration test |
| `infrastructure/persistence/postgres-alert.repository.spec.ts` | `RUN_DB_TESTS=true` | Requires live PostgreSQL |
| `infrastructure/persistence/postgres-user.repository.spec.ts` | `RUN_DB_TESTS=true` | Requires live PostgreSQL |

### Note: Worker Exit Warning

```
A worker process has failed to exit gracefully and has been force exited.
This is likely caused by tests leaking due to improper teardown.
```

This warning appears at the end of the Jest run but does not cause any test failures. It indicates a timer or open handle is not properly cleaned up in one of the test suites. Not blocking.

---

## Time-Dependent Tests

| Test | Status | Note |
|------|--------|------|
| `use-commute-mode.test.ts` (`getAutoMode`) | SAFE | Passes explicit hour parameter, no system clock dependency |
| `use-commute-mode.test.ts` (`useCommuteMode`) | SAFE | Compares against same function call, consistent at any time |

---

## Test Growth

| Metric | Round 5 (2026-02-28) | Previous Auto (2026-03-02) | Current (2026-03-03) | Delta (vs R5) |
|--------|---------------------:|---------------------------:|---------------------:|--------------:|
| FE Suites | 35 | 46 | 48 | +13 |
| FE Tests | 480 | 594 | 607 | +127 |
| BE Suites | 75 | 101 | 101 | +26 |
| BE Tests | 892 | 1,348 | 1,348 | +456 |
| **Total Tests** | **1,372** | **1,942** | **1,955** | **+583** |

---

## Fixes Applied

None required. All 1,955 tests pass without modification.
