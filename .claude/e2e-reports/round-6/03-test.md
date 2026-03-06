# 03. Test Report — Round 6

**Date**: 2026-03-04
**Branch**: `feature/e2e-auto-review-20260304`
**Status**: PASS

---

## Summary

| Area | Test Files | Tests | Passed | Failed | Skipped | Result |
|------|-----------|-------|--------|--------|---------|--------|
| **Frontend** | 48 | 607 | 607 | 0 | 0 | PASS |
| **Backend** | 104 | 1,358 | 1,348 | 0 | 10 | PASS |
| **Total** | 152 | 1,965 | 1,955 | 0 | 10 | PASS |

---

## Frontend (Vitest)

- **Framework**: Vitest 4.0.18
- **Test Files**: 48 passed (48 total)
- **Tests**: 607 passed (607 total)
- **Duration**: ~8.2s

### Coverage Areas

| Category | Files | Tests |
|----------|-------|-------|
| Domain logic (utils, validators) | 14 | 198 |
| Presentation (components, pages) | 22 | 283 |
| Infrastructure (API, hooks, monitoring) | 8 | 89 |
| Integration (hooks + components) | 4 | 37 |

### Notable Test Suites
- `weather-utils.test.ts` — 48 tests (comprehensive weather logic)
- `BriefingSection.test.ts` — 37 tests (briefing composition)
- `build-briefing.test.ts` — 25 tests (briefing builder)
- `CongestionChips.test.tsx` — 13 tests (congestion UI)
- `ModeBadge.test.tsx` — 12 tests (commute mode)
- `use-commute-mode.test.ts` — 11 tests (commute mode hook)
- `alert-schedule-utils.test.ts` — 11 tests (schedule formatting)

### Observations
- No flaky tests detected across multiple runs
- React Router v6 future flag warnings present (v7 migration prep) — non-blocking
- Node.js `--localstorage-file` warnings from Vitest worker threads — cosmetic, non-blocking

---

## Backend (Jest)

- **Framework**: Jest 29
- **Test Suites**: 101 passed, 3 skipped (104 total)
- **Tests**: 1,348 passed, 10 skipped (1,358 total)
- **Duration**: ~48s

### Skipped Suites (intentional, environment-dependent)

| Suite | Reason |
|-------|--------|
| `postgres-alert.repository.spec.ts` | Requires `TEST_DB=true` (live PostgreSQL) |
| `postgres-user.repository.spec.ts` | Requires `TEST_DB=true` (live PostgreSQL) |
| `air-quality-api.client.integration.spec.ts` | Requires `TEST_INTEGRATION=true` (live API key) |

These are intentionally gated behind environment flags and correctly skip in CI/local environments.

### Coverage Areas

| Category | Suites | Tests |
|----------|--------|-------|
| Domain (entities, utils, services) | 24 | ~250 |
| Application (use-cases, services) | 38 | ~580 |
| Infrastructure (APIs, auth, cache, scheduler) | 16 | ~220 |
| Presentation (controllers) | 23 | ~300 |

### Notable Test Suites
- `commute.controller.spec.ts` — comprehensive commute API tests
- `eventbridge-scheduler.service.spec.ts` — EventBridge schedule CRUD
- `send-notification.use-case.spec.ts` — notification delivery logic
- `community.service.spec.ts` / `tips.service.spec.ts` — community features
- `prediction-engine.service.spec.ts` — ML prediction logic
- `congestion.service.spec.ts` — congestion data processing
- `insights-aggregation.service.spec.ts` — analytics aggregation

### Observations
- Worker process force-exit warning detected (likely from timer leaks in scheduler tests) — non-critical
- No test failures
- NestJS logger output visible in tests (expected from `Logger` usage in services)

---

## Changes Made

**No fixes required.** All tests pass cleanly.

---

## Comparison with Previous Round

| Metric | Round 5 (known) | Round 6 |
|--------|----------------|---------|
| Frontend tests | 394 | 607 (+54%) |
| Backend tests | 837 | 1,348 (+61%) |
| Total | 1,231 | 1,955 (+59%) |
| Failures | 0 | 0 |

Test count has grown significantly since the last recorded baseline, reflecting new features (community, congestion, insights, predictions).

---

## Verdict

**PASS** — All 1,955 active tests pass across frontend and backend. No fixes needed. 3 backend integration test suites are intentionally skipped (require live DB/API access). Test health is excellent.
