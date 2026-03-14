# 03 — Test Results

**Date**: 2026-03-14
**Branch**: `feature/e2e-auto-review-20260314`

---

## Summary

| Area | Suites | Tests | Passed | Failed | Skipped |
|------|-------:|------:|-------:|-------:|--------:|
| **Frontend** | 48 | 607 | 607 | 0 | 0 |
| **Backend** | 101 | 1,361 | 1,351 | 0 | 10 |
| **Total** | 149 | 1,968 | 1,958 | 0 | 10 |

**Result: ALL TESTS PASS (0 failures, 0 fixes needed)**

---

## Frontend (Vitest 4.x)

**Command**: `cd frontend && ./node_modules/.bin/vitest run`

```
Test Files:  48 passed (48)
Tests:       607 passed (607)
Duration:    9.80s
```

No failures. No skipped tests.

### Note: ErrorBoundary stderr output

`ErrorBoundary.test.tsx` emits `Error: Test render error` to stderr during the test run. This is intentional — the test deliberately throws an error to verify the ErrorBoundary catches and displays it. All 5 tests in that file pass.

---

## Backend (Jest 29)

**Command**: `cd backend && ./node_modules/.bin/jest --passWithNoTests --forceExit`

```
Test Suites: 3 skipped, 101 passed, 101 of 104 total
Tests:       10 skipped, 1351 passed, 1361 total
Duration:    36.3s
```

### Skipped Suites (3) — intentional, env-gated

| File | Skip Condition | Reason |
|------|----------------|--------|
| `infrastructure/external-apis/air-quality-api.client.integration.spec.ts` | `RUN_INTEGRATION_TESTS=true` + API key | External API integration test |
| `infrastructure/persistence/postgres-alert.repository.spec.ts` | `RUN_DB_TESTS=true` | Requires live PostgreSQL |
| `infrastructure/persistence/postgres-user.repository.spec.ts` | `RUN_DB_TESTS=true` | Requires live PostgreSQL |

### Worker Force Exit Warning

Jest reports a worker process was force-exited due to active timers/open handles. This is a pre-existing issue unrelated to test correctness — all tests passed and this warning does not indicate a test failure.

---

## Fixes Applied

None. All tests passed without modification.

---

## Test Growth

| Metric | 2026-02-28 | 2026-03-14 | Delta |
|--------|----------:|----------:|------:|
| FE Suites | 35 | 48 | +13 |
| FE Tests | 480 | 607 | +127 |
| BE Suites | 75 (of 78) | 101 (of 104) | +26 |
| BE Tests | 892 | 1,351 | +459 |
| **Total Tests** | **1,372** | **1,958** | **+586** |
