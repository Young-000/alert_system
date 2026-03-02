# Round 3 - Test Report

## 1. Frontend Tests

### 1-1. `npx vitest run` (Vitest)

**Result: 10 suites FAILED / 0 tests ran**

| Suite | Error | Root Cause |
|-------|-------|------------|
| `AlertSettingsPage.test.tsx` | `ReferenceError: describe is not defined` | Jest globals used without Vitest `globals: true` |
| `CommuteDashboardPage.test.tsx` | `ReferenceError: jest is not defined` | `jest.fn()`, `jest.mock()` are Jest-only APIs |
| `CommuteTrackingPage.test.tsx` | `ReferenceError: jest is not defined` | Same |
| `HomePage.test.tsx` | `ReferenceError: describe is not defined` | Same |
| `LoginPage.test.tsx` | `ReferenceError: jest is not defined` | Same |
| `NotFoundPage.test.tsx` | `ReferenceError: describe is not defined` | Same |
| `OnboardingPage.test.tsx` | `ReferenceError: jest is not defined` | Same |
| `RouteSetupPage.test.tsx` | `ReferenceError: jest is not defined` | Same |
| `e2e/alert-system.spec.ts` | `Playwright test.describe() not expected` | Playwright test picked up by Vitest |
| `e2e/auth.spec.ts` | `Playwright test.describe() not expected` | Same |

**Analysis**: The project does NOT use Vitest. There is no `vitest` in `devDependencies`, no `vitest.config.ts`, and no vitest setup. All test files are written with **Jest** API (`jest.fn()`, `jest.mock()`, `jest.requireActual()`, implicit globals). Running `npx vitest run` downloads vitest on-the-fly and fails because:
1. Test files use `jest.*` APIs (not available in Vitest without `vi` compat)
2. Vitest requires `globals: true` config for implicit `describe`/`it`
3. Vitest picks up `e2e/*.spec.ts` (Playwright) files that Jest ignores via `testPathIgnorePatterns`

### 1-2. `npm test` (Jest - correct command)

**Result: 8 suites PASSED / 25 tests PASSED**

| Suite | Tests | Status |
|-------|-------|--------|
| `AlertSettingsPage.test.tsx` | 5 | PASS |
| `CommuteDashboardPage.test.tsx` | 2 | PASS |
| `CommuteTrackingPage.test.tsx` | 2 | PASS |
| `HomePage.test.tsx` | 1 | PASS |
| `LoginPage.test.tsx` | 8 | PASS |
| `NotFoundPage.test.tsx` | 2 | PASS |
| `OnboardingPage.test.tsx` | 2 | PASS |
| `RouteSetupPage.test.tsx` | 3 | PASS |

**Warnings (non-blocking)**:
- `ts-jest` globals config deprecated (recommend `transform` config)
- React Router v7 future flag warnings
- `act(...)` warnings in CommuteTrackingPage, RouteSetupPage (async state updates after unmount)

**Config**: `jest.config.js` correctly:
- Uses `ts-jest` preset with `jsdom` environment
- Excludes `e2e/` via `testPathIgnorePatterns`
- Maps path aliases (`@domain`, `@infrastructure`, etc.)
- Uses mock API clients from `src/__mocks__/infrastructure/api/index.ts`

---

## 2. Backend Tests

### `npm test` (Jest)

**Result: 27 suites PASSED (3 skipped) / 194 tests PASSED (10 skipped) / 0 FAILED**

| Category | Suites | Tests |
|----------|--------|-------|
| Domain entities | 3 | PASS |
| Domain repositories | 2 | PASS |
| Application use-cases | 12 | PASS |
| Infrastructure (APIs, cache, auth, queue, messaging) | 10 | PASS |
| Presentation (controllers) | 1 | PASS |
| **Skipped suites** | 3 | 10 tests |

---

## 3. Summary

| Area | Runner | Suites | Tests | Failures |
|------|--------|--------|-------|----------|
| Frontend (Vitest) | `npx vitest run` | 10 | 0 | **10 suite errors** (wrong runner) |
| Frontend (Jest) | `npm test` | 8 | 25 | 0 |
| Backend (Jest) | `npm test` | 27 (+3 skip) | 194 (+10 skip) | 0 |

## 4. Fixes Applied

**0 code fixes needed** - all tests pass with the correct runner (`npm test` / Jest).

## 5. Recommendation

The `npx vitest run` command is incorrect for this project. The frontend test runner is **Jest** (configured in `jest.config.js`, `package.json "test": "jest"`). To avoid confusion:
- Use `npm test` or `npx jest` to run frontend tests
- E2E tests (`e2e/`) use Playwright and should be run separately via `npx playwright test`
