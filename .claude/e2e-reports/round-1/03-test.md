# Test Report

Date: 2026-02-24

---

## Summary

| Area | Status | Details |
|------|--------|---------|
| **Frontend Unit Tests** | PASS | 28 files, 381 tests passed |
| **Backend Unit Tests** | PASS | 68 suites passed (3 skipped), 767 tests passed (10 skipped) |
| **Frontend TypeCheck** | PASS | `tsc --noEmit` - no errors |
| **Backend TypeCheck** | PASS | `tsc --noEmit` - no errors |

---

## Frontend Tests (Vitest)

- **Test Files**: 28 passed (28 total)
- **Tests**: 381 passed (381 total)
- **Duration**: 8.84s
- **Warnings**: React Router v7 future flag warnings (non-blocking, informational only)
- **Issues**: None

## Backend Tests (Jest)

- **Test Suites**: 68 passed, 3 skipped, 71 total
- **Tests**: 767 passed, 10 skipped, 777 total
- **Duration**: 33.14s
- **Warnings**:
  - Worker process force-exited (likely timer leak in tests - non-critical)
  - `--detectOpenHandles` suggested for debugging timer leaks
- **Skipped Suites (3)**: Pre-existing skips, not new failures
- **Issues**: None

## TypeScript Type Check

- **Frontend**: `npx tsc --noEmit` passed with zero errors
- **Backend**: `npx tsc --noEmit` passed with zero errors

---

## Minor Observations (Non-blocking)

1. **Backend `npm test` script**: Uses bare `jest` command which is not in PATH. Works via `npx jest`. Consider updating `package.json` test script to use the full path or ensure jest is in the project's local bin.
2. **Jest worker leak warning**: A worker process did not exit gracefully. This is typically caused by uncleared timers or open handles in test teardown. Not a test failure, but worth investigating with `--detectOpenHandles`.
3. **React Router v7 future flags**: Multiple warnings about upcoming v7 changes (`v7_startTransition`, `v7_relativeSplatPath`). Non-blocking but should be addressed before upgrading to React Router v7.

---

## Fixes Applied

None required. All tests pass.
