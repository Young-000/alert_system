# QA Report: Cycle 10 - Notification Monitoring Dashboard

> Date: 2026-02-17 | QA Agent | Verdict: **PASS** (1 minor finding)

---

## Verdict: PASS

All acceptance criteria met. Build pipeline green. One minor (P3) finding logged for future improvement.

---

## Build Pipeline

| Check | Result |
|-------|--------|
| Backend Tests | **PASS** -- 454 passed, 10 skipped, 0 failed |
| Frontend Tests | **PASS** -- 213 passed, 0 failed |
| Backend TypeCheck | **PASS** -- 0 errors |
| Frontend TypeCheck | **PASS** -- 0 errors |
| Frontend Build | **PASS** -- built successfully |
| Backend Lint | **PASS** -- 0 errors |
| Frontend Lint | **PASS** -- 0 errors |

---

## Acceptance Criteria Verification

### Backend (5/5 PASS)

- [x] **AC-B1**: Authenticated user with logs -> returns `{ total, success, fallback, failed, successRate }`
  - Verified in controller code (lines 30-76): QueryBuilder groups by status, calculates all fields.
  - Test: "모든 알림이 성공인 경우 successRate 100 반환" confirms correct DTO shape.

- [x] **AC-B2**: `GET /notifications/stats?days=7` filters by last 7 days
  - Verified: `daysNum > 0` triggers `andWhere` with `INTERVAL '1 day' * :days` (line 43-45).
  - Test: "days 파라미터가 전달되면 날짜 필터 적용" asserts `andWhere` called with `{ days: 7 }`.

- [x] **AC-B3**: Empty state returns `{ total: 0, success: 0, fallback: 0, failed: 0, successRate: 100 }`
  - Verified: `total === 0` guard returns `successRate: 100` (line 71-72).
  - Test: "알림 기록이 없으면 total 0, successRate 100 반환" confirms exact values.

- [x] **AC-B4**: Unauthenticated request returns 401/403
  - Verified: `@UseGuards(AuthGuard('jwt'))` at controller class level (line 23) protects all endpoints including `/stats`.
  - No explicit test for auth rejection at controller unit level (guard is tested separately), but the class-level decorator is correct.

- [x] **AC-B5**: 10 success, 2 fallback, 1 failed -> `successRate: 76.9`
  - Verified: `Math.round((10/13) * 1000) / 10 = Math.round(769.23) / 10 = 769 / 10 = 76.9`. Correct.
  - Test: "혼합 상태 로그에서 올바른 비율 계산" asserts `successRate: 76.9`.

### Frontend (7/7 PASS)

- [x] **AC-F1**: Stats card visible above history list
  - Verified: `<NotificationStats>` rendered at line 209, before filter section (line 211) and history list (line 259).
  - Component renders `data-testid="notif-stats"` card with total, success rate, failure count.

- [x] **AC-F2**: Skeleton placeholder during loading
  - Verified: `NotificationStats` returns skeleton when `isLoading=true` (lines 20-39).
  - Test: "로딩 중 스켈레톤을 표시한다" confirms `notif-stats-skeleton` testid present.

- [x] **AC-F3**: Stats NOT shown when 0 logs
  - Verified: Component returns `null` when `!stats || stats.total === 0` (line 42).
  - Tests: "total이 0이면 아무것도 렌더링하지 않는다" and "stats가 null이고 로딩이 아니면 아무것도 렌더링하지 않는다".

- [x] **AC-F4**: Period filter updates stats
  - Verified: Second `useEffect` (line 159-177) depends on `[userId, periodFilter]`, refetches stats when period changes.
  - `PERIOD_DAYS` maps `'7d'->7, '30d'->30, 'all'->0` correctly passed to `getStats(days)`.

- [x] **AC-F5**: Failure count highlighted in red
  - Verified: `stats.failed > 0` adds `notif-stats-rate--red` class (line 61).
  - Test: "실패 건수가 있으면 빨간색으로 표시" confirms class presence.
  - Test: "실패 건수가 0이면 빨간색 미적용" confirms class absence.

- [x] **AC-F6**: Success rate > 90% shows green
  - Verified: `getSuccessRateColor` returns `--green` when `rate > 90` (line 9).
  - Test: "성공률 90% 초과일 때 녹색 표시" with 100% rate.

- [x] **AC-F7**: Success rate < 70% shows red
  - Verified: `getSuccessRateColor` returns `--red` as default when `rate <= 70` (line 11).
  - Test: "성공률 70% 이하일 때 빨간색 표시" with 50% rate.

---

## Code Review

### Backend: `notification-history.controller.ts`

**Positives:**
- Clean QueryBuilder usage with proper parameterized queries (no SQL injection risk)
- `userId` properly extracted from JWT-authenticated request
- `Number(row.count)` defensive conversion for count values
- Switch statement with unknown statuses silently ignored (safe -- only known statuses increment counters)
- `successRate` rounding formula `Math.round(x * 1000) / 10` correctly produces 1-decimal precision

**No issues found.**

### Frontend: `NotificationStats.tsx`

**Positives:**
- Clean component with `readonly` props
- Proper `aria-label="발송 상태 비율"` on the status bar
- `title` attributes on bar segments provide tooltip information
- Conditional rendering avoids rendering zero-width segments
- `data-testid` attributes for reliable test targeting
- Skeleton uses existing CSS class patterns (`.skeleton`, `.skeleton-text`)

**No issues found.**

### Frontend: `NotificationHistoryPage.tsx`

**Positives:**
- `Promise.allSettled` for parallel non-blocking fetch (stats failure doesn't block history)
- `isMounted` cleanup prevents state updates after unmount
- `PERIOD_DAYS` mapping cleanly converts filter value to API parameter
- Stats fetch failure is silently handled (non-critical, keeps existing stats)

### Frontend: `notification-history.css`

**Positives:**
- Follows existing naming conventions (`notif-stats-*`)
- Uses CSS variables (`--bg-card`, `--success`, `--error`, etc.) for theming
- Bar segment transition for smooth width changes
- Proper `overflow: hidden` on bar container

**No issues found.**

### Mock File: `__mocks__/infrastructure/api/index.ts`

**Verified:** `getStats` mock added with correct default return shape matching `NotificationStatsDto`.

---

## Test Quality Assessment

### Backend Tests (8 new tests)

| Test | Technique | Assessment |
|------|-----------|------------|
| All success -> rate 100 | EP (valid partition) | Good |
| Mixed 10/2/1 -> rate 76.9 | EP + BVA (spec example) | Good -- exact spec value |
| All failed -> rate 0 | EP (edge partition) | Good |
| Empty -> total 0, rate 100 | BVA (boundary: zero) | Good |
| days=7 filter | EP (valid param) | Good -- asserts SQL param |
| days=0 no filter | BVA (boundary: zero) | Good |
| Invalid days "abc" | EP (invalid partition) | Good |
| User ID filtering | Security (isolation) | Good |

**Coverage assessment:** Strong. Covers happy path, edge cases, boundary values, and invalid input.

### Frontend Tests (11 new tests)

| Test | Technique | Assessment |
|------|-----------|------------|
| Stats data display | Function (happy path) | Good |
| Loading skeleton | State transition | Good |
| Hidden when total=0 | BVA (boundary) | Good |
| Hidden when null | EP (null partition) | Good |
| Green for >90% | BVA (color threshold) | Good |
| Yellow for 70-90% | BVA (color threshold) | Good |
| Red for <=70% | BVA (color threshold) | Good |
| Red failure highlight | EP (nonzero failures) | Good |
| No red for 0 failures | EP (zero failures) | Good |
| Status bar segments | Structure | Good |
| Missing segments | Conditional rendering | Good |

**Coverage assessment:** Thorough for the component. Boundary values for color thresholds well tested.

**Missing test (non-blocking):** NotificationHistoryPage integration tests do not verify stats rendering within the page context (e.g., stats card appears after page load with data). The existing `NotificationHistoryPage.test.tsx` tests were not updated with stats-related assertions. This is acceptable because `NotificationStats` is independently tested, but a future integration test would add confidence.

---

## Accessibility Audit

- [x] Semantic HTML: `<div>` containers are appropriate for data display cards
- [x] `aria-label="발송 상태 비율"` on status bar
- [x] `title` attributes on bar segments for tooltip accessibility
- [x] Color is NOT the only indicator: numeric values (count, percentage) accompany all color-coded elements
- [x] Skeleton uses `data-testid` for test targeting (not blocking for a11y)
- [x] No interactive elements in stats card that need keyboard focus (display-only)
- [x] Filter buttons properly use `aria-pressed` and `aria-label` (existing code)

**No accessibility issues found.**

---

## Security Spot-Check

- [x] Auth guard at class level (`@UseGuards(AuthGuard('jwt'))`) protects `/notifications/stats`
- [x] User isolation: `log.userId = :userId` from JWT-extracted user ID (no user-controlled input)
- [x] Parameterized query (`{ userId: req.user.userId }`, `{ days: daysNum }`) -- no SQL injection
- [x] No hardcoded secrets
- [x] No sensitive data exposed in response (only aggregated counts)
- [x] `days` parameter parsed with `parseInt || 0` -- invalid input defaults safely to "all time"

**No security issues found.**

---

## Findings

### Finding #1: Double stats fetch on initial mount (P3 - Trivial)

**Severity:** Trivial
**Priority:** P3
**Status:** Noted (non-blocking)

**Description:** On initial page load, `getStats()` is called twice:
1. First `useEffect` (line 124, deps: `[userId]`) calls `Promise.allSettled([getHistory(), getStats()])`.
2. Second `useEffect` (line 159, deps: `[userId, periodFilter]`) also calls `getStats()`.

Both effects fire on mount since `userId` and `periodFilter` are both set.

**Impact:** One redundant network request on initial page load. No functional impact -- both calls use the same `periodFilter` default (`'all'` -> days=0) so the result is identical.

**Suggested Fix:** Skip the stats-only effect on initial mount (e.g., use a `useRef` to track whether initial load completed), or remove stats from the first `useEffect` and rely solely on the second. Low priority since the redundant call is harmless and the page still loads fast.

**Test technique:** Code review (Structure heuristic -- SFDPOT)

---

## Techniques Applied

- [x] BVA on success rate thresholds (0, 50, 70, 76.9, 90, 100)
- [x] EP on status distributions (all-success, mixed, all-failed, empty)
- [x] EP on `days` parameter (valid, zero, invalid string)
- [x] State transition on loading/data/empty states
- [x] SFDPOT exploratory (Structure: double fetch; Function: all features verified; Data: edge values; Operations: filter changes)
- [x] Accessibility audit (WCAG AA checklist)
- [x] Security spot-check (auth, SQL injection, data isolation)

---

## Test Coverage Assessment

- **Happy paths:** Fully covered (stats display, loading, filtering)
- **Error paths:** Covered (empty state, null stats, stats fetch failure non-blocking)
- **Edge cases:** Covered (exactly 0 total, boundary colors, invalid days param)
- **Areas not tested:**
  - Integration test for stats within NotificationHistoryPage (component tested independently -- acceptable)
  - Exact 90% and 70% boundary values in frontend tests (tests use 100%, 76.9%, 50% -- boundaries at exactly 90/70 not explicitly tested, but code logic is trivially correct via `> 90` / `> 70`)
  - Period filter change re-fetching stats in integration context (tested via code review; mock setup in page tests does not verify stats refetch on filter change)

---

*Generated by QA Agent | Cycle 10 | 2026-02-17*
