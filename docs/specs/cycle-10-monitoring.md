# Cycle 10: 알림 발송 모니터링 대시보드

> Backlog Item: N-10 | Size: L | RICE: 25
> 일자: 2026-02-17

---

## JTBD

When I check my notification history, I want to see an overview of delivery success/failure rates and trends, so I can trust the system is working reliably and quickly spot problems.

## Problem

- **Who:** Active alert_system user who has configured 1+ alerts and receives daily notifications (commuter)
- **Pain:** Medium frequency (checks weekly), Medium severity. Currently the notification history page shows individual log entries but no aggregated view. Users cannot tell at a glance whether their notifications are being delivered reliably. If 3 out of 20 failed, that information is buried in a scrollable list.
- **Current workaround:** Manually scroll through individual notification log entries and mentally count successes vs failures. No trend visibility at all.
- **Success metric:**
  - Users can see delivery success rate within 1 second of page load
  - Failed notifications are highlighted with clear failure reasons
  - Stats section loads without blocking the existing history list

## Solution

### Overview

Add a **stats summary section** at the top of the existing `NotificationHistoryPage`, plus a new **backend aggregation endpoint**. This is NOT a new page -- it enhances the existing notification history page with aggregated statistics displayed above the current list view.

The backend will provide a `GET /notifications/stats` endpoint that aggregates notification logs by status and date range. The frontend will display this as a compact stats card showing total count, success rate, and failure count, with a simple bar breakdown by status.

### Why This Approach

- Reuses existing `notification_logs` table and `NotificationHistoryPage` -- minimal new surface area
- Single new backend endpoint with SQL aggregation -- no new tables or entities needed
- Compact stats card at top of existing page -- no new route, no new navigation item
- Can be fully tested with existing mock patterns

### User Flow

1. User navigates to `/notifications` (existing page)
2. Stats section loads at top, showing aggregated delivery metrics
3. Existing history list loads below (unchanged)
4. User can see at a glance: total sent, success rate %, failure count
5. If failures exist, the failure count is visually highlighted in red
6. User can filter the stats by period (7d / 30d / all) -- reuses existing period filter

### Scope (MoSCoW)

**Must:**
- Backend `GET /notifications/stats` endpoint returning `{ total, success, fallback, failed, successRate }`
- Stats summary card at top of NotificationHistoryPage showing total / success rate / failure count
- Period filter (7d/30d/all) applies to both stats and history list
- Loading skeleton while stats are fetching
- Empty state when no notifications exist (existing behavior unchanged)
- Unit tests for backend endpoint (controller + integration)
- Unit tests for frontend stats component

**Should:**
- Color-coded status breakdown bar (green=success, yellow=fallback, red=failed)
- Success rate shown as percentage with visual indicator (green if > 90%, yellow if > 70%, red otherwise)
- Fallback count shown separately from success (to distinguish "worked but degraded" from "fully successful")

**Could:**
- Daily trend sparkline for last 7 days (tiny chart showing delivery pattern)
- Per-alert breakdown (which alerts fail most)

**Won't (this cycle):**
- Admin-level monitoring (multi-user aggregate) -- this is per-user only
- Real-time WebSocket updates
- Alert/notification when failure rate exceeds threshold
- Separate monitoring page/route
- Email or push notification about monitoring status

## Acceptance Criteria

### Backend

- [ ] Given an authenticated user with notification logs, When `GET /notifications/stats` is called, Then it returns `{ total: number, success: number, fallback: number, failed: number, successRate: number }` for that user's logs
- [ ] Given an authenticated user, When `GET /notifications/stats?days=7` is called, Then only logs from the last 7 days are counted
- [ ] Given an authenticated user with no notification logs, When `GET /notifications/stats` is called, Then it returns `{ total: 0, success: 0, fallback: 0, failed: 0, successRate: 100 }`
- [ ] Given an unauthenticated request, When `GET /notifications/stats` is called, Then it returns 401/403
- [ ] Given an authenticated user with 10 success, 2 fallback, 1 failed, When stats are requested, Then `successRate` equals `76.9` (rounded to 1 decimal: success-only / total * 100)

### Frontend

- [ ] Given the user is on `/notifications` and has notification logs, When the page loads, Then a stats summary card is visible above the history list showing total count, success rate, and failure count
- [ ] Given the stats are loading, When the page renders, Then a skeleton placeholder is shown in the stats area (no layout shift when data arrives)
- [ ] Given the user has 0 notification logs, When the page loads, Then the stats section is NOT shown (existing empty state remains)
- [ ] Given the user clicks a period filter (7d/30d/all), When the filter changes, Then the stats section updates to reflect that period
- [ ] Given the user has failures, When stats are displayed, Then the failure count is highlighted in red/error color
- [ ] Given the user has > 90% success rate, When stats are displayed, Then the success rate indicator is green
- [ ] Given the user has < 70% success rate, When stats are displayed, Then the success rate indicator is red

## Technical Design

### Backend: New endpoint in `NotificationHistoryController`

```typescript
// Add to notification-history.controller.ts
@Get('stats')
async getStats(
  @Request() req: AuthenticatedRequest,
  @Query('days') days?: string,
): Promise<NotificationStatsDto> {
  const daysNum = parseInt(days || '0', 10) || 0;
  // Use raw query or QueryBuilder for COUNT + GROUP BY status
  // Filter by userId and optional date range
}
```

Response DTO:
```typescript
interface NotificationStatsDto {
  total: number;
  success: number;
  fallback: number;
  failed: number;
  successRate: number; // 0-100, 1 decimal
}
```

SQL approach:
```sql
SELECT
  status,
  COUNT(*)::int as count
FROM alert_system.notification_logs
WHERE user_id = $1
  AND ($2::int = 0 OR sent_at >= NOW() - INTERVAL '1 day' * $2)
GROUP BY status
```

### Frontend: New `NotificationStats` component

```
NotificationHistoryPage
  |-- NotificationStats (NEW)
  |     |-- Stats card: total / success rate / failures
  |     |-- Status bar: colored breakdown
  |-- [existing] Filter section
  |-- [existing] History list
```

API client addition:
```typescript
// Add to NotificationApiClient
async getStats(days = 0): Promise<NotificationStatsDto> {
  return this.apiClient.get<NotificationStatsDto>(
    `/notifications/stats${days ? `?days=${days}` : ''}`,
  );
}
```

### CSS: Follows existing patterns

Use existing CSS class patterns from `notification-history.css`:
- `.notif-stats-card` -- main container
- `.notif-stats-rate` -- success rate display
- `.notif-stats-bar` -- horizontal status breakdown
- `.notif-stats-item` -- individual stat (total, success, fallback, failed)

## Task Breakdown

1. **Backend: Add `GET /notifications/stats` endpoint** -- M -- Deps: none
   - Add `getStats` method to `NotificationHistoryController`
   - QueryBuilder aggregation by status with optional `days` filter
   - Calculate `successRate` as `(success / total * 100)`, default 100 when total=0
   - Return `NotificationStatsDto`

2. **Backend: Add controller tests for stats endpoint** -- S -- Deps: [1]
   - Test authenticated access
   - Test unauthenticated rejection
   - Test with various log distributions
   - Test `days` query parameter filtering
   - Test empty state (total=0)

3. **Frontend: Add `getStats` to NotificationApiClient** -- S -- Deps: none
   - Add method + types to `notification-api.client.ts`
   - Export from `index.ts`
   - Add to mock in `__mocks__`

4. **Frontend: Create `NotificationStats` component** -- M -- Deps: [3]
   - Stats card with total / success rate / failure count
   - Color-coded status breakdown bar
   - Success rate color indicator (green/yellow/red)
   - Skeleton loading state
   - CSS styles following existing patterns

5. **Frontend: Integrate stats into NotificationHistoryPage** -- S -- Deps: [4]
   - Fetch stats on mount (parallel with history fetch)
   - Pass period filter state to stats fetch
   - Refetch stats when period filter changes
   - Hide stats section when total=0

6. **Frontend: Add tests for NotificationStats component** -- S -- Deps: [4, 5]
   - Test stats display with various data
   - Test loading skeleton
   - Test hidden when no data
   - Test color coding by success rate
   - Test period filter integration

7. **Verify: Lint + TypeCheck + Test + Build** -- S -- Deps: [1-6]
   - `npm run lint` (both frontend and backend)
   - `tsc --noEmit` (both)
   - `npm test` (both)
   - `npm run build` (frontend)

## Estimated Effort

| Task | Size | Est. Time |
|------|:----:|:---------:|
| Backend endpoint | M | 30 min |
| Backend tests | S | 20 min |
| Frontend API client | S | 10 min |
| Frontend component | M | 40 min |
| Frontend integration | S | 15 min |
| Frontend tests | S | 20 min |
| Verification | S | 10 min |
| **Total** | | **~2.5 hrs** |

## Open Questions

1. **Success rate formula:** Should `fallback` count as success or partial failure? Current spec: `successRate = success / total * 100` (fallback is NOT counted as success). Alternative: `(success + fallback) / total * 100` (fallback is "degraded success"). Decision: Use strict success-only for the rate, but show fallback separately so users understand the nuance.

2. **Per-alert breakdown (Could-have):** If time permits, show which specific alerts fail most. This would need a `GROUP BY alert_id` addition. Deferred to Could-have.

## Out of Scope

- **N-9 (Custom domain):** Pure infrastructure task, not suitable for team loop code verification
- **N-8 (Solapi weekly report):** Blocked by external Kakao template approval
- **N-7 (ElastiCache Redis):** Infrastructure-only, no testable code changes
- **N-6 (Tailwind CSS migration):** Too broad/risky for a single cycle; would touch many files
- **Admin/multi-user monitoring:** This cycle is per-user stats only
- **Historical trend charts:** Sparkline deferred to Could-have; plain numbers are sufficient for MVP

## Project Completion Context

This is **Cycle 10** of the alert_system team loop. After this cycle, all 5 remaining Nice-to-have items will have been either completed or explicitly categorized as infrastructure/external-dependency tasks unsuitable for the team loop pattern:

| Item | Status After Cycle 10 |
|------|----------------------|
| N-10: Monitoring Dashboard | DONE (this cycle) |
| N-9: Custom Domain | SKIP -- infra only, no code |
| N-8: Solapi Weekly Report | SKIP -- external dependency |
| N-7: ElastiCache Redis | SKIP -- infra only, no code |
| N-6: Tailwind CSS | SKIP -- too broad for single cycle |

**Recommendation:** After Cycle 10, the team loop should be concluded. The remaining items are either infrastructure tasks best done manually via AWS CLI/Terraform, or blocked by external approvals. The codebase has reached a mature state with 648+ tests, clean architecture, and comprehensive feature coverage.

---

*Spec written by PM agent | Cycle 10 | 2026-02-17*
