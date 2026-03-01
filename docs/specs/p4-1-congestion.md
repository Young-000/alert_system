# P4-1: Segment Congestion -- Crowdsourced Congestion Levels from User Commute Data

## Executive Summary

Users track their commutes daily through checkpoint-based sessions, generating rich segment-level data (wait times, durations, delays) -- but this data lives in individual silos. No user can see how their experience compares to the broader picture. By aggregating checkpoint_records across all users (anonymized), we can compute per-segment congestion levels grouped by time slot (morning rush, evening rush, off-peak). The result: a congestion overlay on route detail pages, color-coded chips on the home page, and small indicators on checkpoint lists -- so users can **see at a glance which segments are slow before they leave**. This is the first "data flywheel" feature: more users tracking = more accurate congestion = more reason to track.

Expected impact: Users who see congestion data before departure report higher perceived accuracy and are 30%+ more likely to check the app daily (leading metric: daily home page visits).

---

## Discovery Context

### Desired Outcome (Measurable)
Increase daily active user engagement by surfacing congestion insights that make the home page and route detail pages more informative. Target: 20%+ increase in route detail page views per active user per week.

### Opportunity Solution Tree
```
Outcome: Users see real-time-ish congestion before departing
  |
  +-- Opportunity A: Users don't know which segments are slow TODAY
  |     +-- Solution: Aggregate checkpoint_records into per-segment congestion levels
  |     +-- Solution: (rejected) Use external transit API only -- no personalization
  |
  +-- Opportunity B: Congestion varies by time of day (rush vs off-peak)
  |     +-- Solution: Time-slot grouping (morning rush, evening rush, off-peak)
  |
  +-- Opportunity C: Small dataset (~100 sessions) makes raw averages noisy
  |     +-- Solution: Bayesian smoothing with population priors (reuse P3-1 stats library)
  |
  +-- Opportunity D: Users want to see congestion for THEIR specific route
        +-- Solution: Route congestion overlay endpoint that maps segments to congestion data
```

### Evidence
- `checkpoint_records` table contains `actualWaitTime`, `durationFromPrevious`, `isDelayed`, `delayMinutes`, `waitDelayMinutes` per checkpoint per session.
- `commute_sessions` table has `startedAt` (for time-slot classification) and `weatherCondition`.
- Existing `CommuteStatsResponse` computes per-route averages but does NOT aggregate across users.
- `RouteCheckpoint` entity has `name`, `lineInfo`, `checkpointType`, `linkedStationId` -- sufficient for segment identification.
- P3-1 delivered `bayesian-estimator.ts` (Normal-Normal conjugate prior), `descriptive-stats.ts` (mean, stdDev, percentile, exponentialWeightedMean), and `linear-regression.ts` -- all reusable.
- P3-5 delivered delay detection per route segment -- congestion data would enhance that signal.

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|-----------------|
| External congestion API only (e.g., TOPIS) | No checkpoint-level granularity; can't map to user's specific route segments |
| Per-user-only congestion (no aggregation) | Defeats the flywheel goal; insufficient data per individual |
| Real-time only (no batch) | With ~100 sessions, batch aggregation gives better statistical quality |

---

## Impact Map

```
Goal: 20%+ increase in route detail page views / active user / week
  |
  +-- Actor: Daily commuter (5+ trips/week)
  |     |
  |     +-- Impact: Checks route congestion before departing
  |     |     +-- Deliverable: GET /congestion/routes/:routeId endpoint (BE)
  |     |     +-- Deliverable: Congestion overlay on route detail page (FE)
  |     |
  |     +-- Impact: Sees at-a-glance congestion on home page
  |           +-- Deliverable: GET /congestion/segments endpoint (BE)
  |           +-- Deliverable: Color-coded congestion chips on CommuteSection (FE)
  |
  +-- Actor: System administrator
        |
        +-- Impact: Can trigger full recalculation when data quality issues arise
              +-- Deliverable: POST /congestion/recalculate admin endpoint (BE)
```

---

## JTBD (Jobs-to-be-Done)

**Primary Job:**
> When I'm about to leave for my commute, I want to see which segments on my route are congested right now, so I can mentally prepare for delays or consider leaving earlier.

**Secondary Job:**
> When I'm reviewing my route options, I want to compare congestion levels across different time slots, so I can choose whether to shift my departure time.

**Forces of Progress:**
| Force | Description |
|-------|-------------|
| **Push (pain)** | "I always get surprised by delays at Sindorim transfer -- wish I'd known beforehand" |
| **Pull (attraction)** | "If I could see 'Sindorim: HIGH congestion at 8am' before leaving, I'd feel more in control" |
| **Anxiety** | "Is the congestion data accurate with so few users?" -- mitigated by Bayesian smoothing + showing sample count |
| **Inertia** | "I already know which segments are slow" -- overcome by showing time-slot variations they didn't know |

---

## Problem Statement

### Who
All users who have saved routes with 2+ checkpoints and track commute sessions.

### Pain (Frequency x Severity)
- **Frequency**: Every commute day (5-10x/week including return trips)
- **Severity**: Medium -- unexpected congestion causes stress and tardiness. Users who could see congestion ahead of time would feel significantly more prepared.

### Current Workaround
- Users rely on P3-5 delay detection (real-time transit API), which only works for subway/bus stops with live data.
- Walking segments, transfer corridors, and custom checkpoints have NO congestion signal.
- Per-user stats exist (`CommuteStatsResponse`) but don't aggregate across users and aren't surfaced as "congestion."

### Why Now
1. Phase 3 is complete -- P3-1 (prediction engine + stats library) and P3-5 (delay detection) provide the foundation.
2. ~100+ commute sessions exist as seed data -- enough for Bayesian smoothing to produce useful estimates.
3. This is the Phase 4 entry point -- the "data flywheel" starts here.
4. Checkpoint-level data is accumulating daily but is only used for individual session history.

---

## Solution Overview

### Architecture

```
checkpoint_records (all users, anonymized)
         |
         v
  [CongestionAggregationService]
    - Group by: normalized_checkpoint_name + time_slot
    - Apply Bayesian smoothing (reuse bayesian-estimator.ts)
    - Calculate congestion_level thresholds
         |
         v
  segment_congestion table (materialized aggregates)
         |
         v
  [CongestionService]
    - Serve cached aggregates via API
    - Incremental update on session completion
    - Daily full recalculation (cron or manual)
         |
    +----+----+
    |         |
    v         v
  REST API   Frontend
  endpoints   overlay
```

### Segment Identification (Normalization)

Checkpoint names across users may vary (e.g., "신도림역" vs "신도림" vs "Sindorim"). We normalize by:

1. **Primary key**: `linkedStationId` (if present) -- most reliable for subway/bus.
2. **Secondary key**: `linkedBusStopId` (if present).
3. **Fallback**: Normalized `name` (lowercase, strip "역", "정류장" suffixes, trim whitespace) + `lineInfo`.

This produces a `segment_key` that groups the same physical location across different users' routes.

### Time Slot Classification

| Slot | Hours | Label (KO) |
|------|-------|------------|
| `morning_rush` | 07:00 - 09:00 | 오전 러시 |
| `morning_late` | 09:00 - 11:00 | 오전 |
| `afternoon` | 11:00 - 17:00 | 오후 |
| `evening_rush` | 17:00 - 19:00 | 저녁 러시 |
| `evening_late` | 19:00 - 22:00 | 저녁 |
| `off_peak` | 22:00 - 07:00 | 심야/새벽 |

Time slot is determined from `commute_session.startedAt`.

### Congestion Level Thresholds

Congestion is derived from the **delay ratio** = `avg_delay_minutes / expected_wait_time` combined with absolute delay:

| Level | Delay Ratio | Absolute Delay | Color | Emoji |
|-------|-------------|----------------|-------|-------|
| `low` | < 0.2 | < 2 min | Green (#22C55E) | -- |
| `moderate` | 0.2 - 0.5 | 2 - 5 min | Yellow (#EAB308) | -- |
| `high` | 0.5 - 1.0 | 5 - 10 min | Orange (#F97316) | -- |
| `severe` | > 1.0 | > 10 min | Red (#EF4444) | -- |

For checkpoints with no `expectedWaitTime` (e.g., walking segments), use absolute delay only.

### Bayesian Smoothing Strategy

With ~100 total sessions, raw averages per segment per time slot will have high variance. We apply the same Normal-Normal conjugate model from P3-1:

```typescript
// Prior: population-wide average wait time
const CONGESTION_PRIOR: BayesianPrior = {
  mu: 3,      // 3 min average delay across all segments
  sigma: 5,   // wide prior -- we're uncertain
};

// For each (segment_key, time_slot):
const observations = delayMinutesForSegmentAndSlot;
const posterior = updatePosterior(CONGESTION_PRIOR, observations);
// posterior.mu = smoothed average delay
// posterior.confidence = how much we trust the estimate
```

**Cold start behavior**: With 0-2 observations, the posterior stays close to the prior (mu=3, low confidence). As data accumulates, the posterior converges on the true segment congestion. This means:
- New segments show "moderate" by default (conservative, not alarming).
- Segments with 10+ observations show data-driven levels with high confidence.

### Update Strategy

| Trigger | Action | Scope |
|---------|--------|-------|
| Session completed | Incremental update for affected segments | Only segments in the completed session |
| Daily cron (03:00 KST) | Full recalculation | All segments |
| Admin POST /congestion/recalculate | Full recalculation | All segments |

Incremental update: On session completion, fetch existing `segment_congestion` row, append new observation to running statistics, recompute posterior. No need to re-scan all historical data.

---

## New Entity: SegmentCongestion

### Domain Entity

```typescript
// backend/src/domain/entities/segment-congestion.entity.ts

export type TimeSlot =
  | 'morning_rush'
  | 'morning_late'
  | 'afternoon'
  | 'evening_rush'
  | 'evening_late'
  | 'off_peak';

export type CongestionLevel = 'low' | 'moderate' | 'high' | 'severe';

export class SegmentCongestion {
  readonly id: string;
  readonly segmentKey: string;           // normalized checkpoint identifier
  readonly checkpointName: string;       // display name (most common name seen)
  readonly checkpointType: string;       // subway, bus_stop, transfer_point, etc.
  readonly lineInfo?: string;            // e.g., "2호선", "7호선"
  readonly linkedStationId?: string;     // if subway
  readonly linkedBusStopId?: string;     // if bus
  readonly timeSlot: TimeSlot;
  readonly avgWaitMinutes: number;       // Bayesian posterior mean of actual wait times
  readonly avgDelayMinutes: number;      // Bayesian posterior mean of delay minutes
  readonly stdDevMinutes: number;        // posterior sigma
  readonly sampleCount: number;          // total observations
  readonly congestionLevel: CongestionLevel;
  readonly confidence: number;           // Bayesian confidence [0.3, 0.95]
  readonly lastUpdatedAt: Date;
  readonly createdAt: Date;
}
```

### Database Table

```sql
CREATE TABLE alert_system.segment_congestion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_key VARCHAR(255) NOT NULL,
  checkpoint_name VARCHAR(255) NOT NULL,
  checkpoint_type VARCHAR(50) NOT NULL,
  line_info VARCHAR(100),
  linked_station_id VARCHAR(255),
  linked_bus_stop_id VARCHAR(255),
  time_slot VARCHAR(30) NOT NULL,
  avg_wait_minutes REAL NOT NULL DEFAULT 0,
  avg_delay_minutes REAL NOT NULL DEFAULT 0,
  std_dev_minutes REAL NOT NULL DEFAULT 0,
  sample_count INTEGER NOT NULL DEFAULT 0,
  congestion_level VARCHAR(20) NOT NULL DEFAULT 'moderate',
  confidence REAL NOT NULL DEFAULT 0.3,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT segment_congestion_segment_slot_unique
    UNIQUE (segment_key, time_slot)
);

CREATE INDEX segment_congestion_segment_key_idx
  ON alert_system.segment_congestion (segment_key);

CREATE INDEX segment_congestion_time_slot_idx
  ON alert_system.segment_congestion (time_slot);

CREATE INDEX segment_congestion_level_idx
  ON alert_system.segment_congestion (congestion_level);
```

### Repository Interface

```typescript
// backend/src/domain/repositories/segment-congestion.repository.ts

export const SEGMENT_CONGESTION_REPOSITORY = Symbol('ISegmentCongestionRepository');

export interface ISegmentCongestionRepository {
  findBySegmentKeyAndTimeSlot(
    segmentKey: string,
    timeSlot: TimeSlot,
  ): Promise<SegmentCongestion | null>;

  findByTimeSlot(timeSlot: TimeSlot): Promise<SegmentCongestion[]>;

  findBySegmentKeys(
    segmentKeys: string[],
    timeSlot?: TimeSlot,
  ): Promise<SegmentCongestion[]>;

  save(congestion: SegmentCongestion): Promise<SegmentCongestion>;

  saveMany(congestions: SegmentCongestion[]): Promise<void>;

  deleteAll(): Promise<void>;
}
```

---

## API Endpoints

### 1. GET /congestion/segments

List all segments with congestion data for a given time slot.

**Query Parameters:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `timeSlot` | TimeSlot | No | auto-detect from current time | Filter by time slot |
| `level` | CongestionLevel | No | -- | Filter by congestion level |
| `limit` | number | No | 50 | Max results |

**Response (200):**
```json
{
  "timeSlot": "morning_rush",
  "timeSlotLabel": "오전 러시 (07:00-09:00)",
  "segments": [
    {
      "segmentKey": "subway_sindorim_2",
      "checkpointName": "신도림역",
      "checkpointType": "subway",
      "lineInfo": "2호선",
      "timeSlot": "morning_rush",
      "avgWaitMinutes": 7.2,
      "avgDelayMinutes": 4.8,
      "stdDevMinutes": 2.1,
      "sampleCount": 23,
      "congestionLevel": "high",
      "confidence": 0.78,
      "lastUpdatedAt": "2026-03-02T03:00:00Z"
    }
  ],
  "totalCount": 15,
  "lastCalculatedAt": "2026-03-02T03:00:00Z"
}
```

### 2. GET /congestion/routes/:routeId

Get congestion overlay for a specific route's checkpoints.

**Query Parameters:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `timeSlot` | TimeSlot | No | auto-detect | Time slot for congestion data |

**Response (200):**
```json
{
  "routeId": "abc-123",
  "routeName": "집 → 사무실",
  "timeSlot": "morning_rush",
  "timeSlotLabel": "오전 러시 (07:00-09:00)",
  "checkpoints": [
    {
      "checkpointId": "cp-1",
      "checkpointName": "집",
      "sequenceOrder": 0,
      "congestion": null
    },
    {
      "checkpointId": "cp-2",
      "checkpointName": "신도림역",
      "sequenceOrder": 1,
      "congestion": {
        "segmentKey": "subway_sindorim_2",
        "avgWaitMinutes": 7.2,
        "avgDelayMinutes": 4.8,
        "congestionLevel": "high",
        "confidence": 0.78,
        "sampleCount": 23
      }
    },
    {
      "checkpointId": "cp-3",
      "checkpointName": "강남역",
      "sequenceOrder": 2,
      "congestion": {
        "segmentKey": "subway_gangnam_2",
        "avgWaitMinutes": 3.1,
        "avgDelayMinutes": 1.2,
        "congestionLevel": "low",
        "confidence": 0.65,
        "sampleCount": 18
      }
    }
  ],
  "overallCongestion": "moderate",
  "totalEstimatedDelay": 6.0,
  "lastCalculatedAt": "2026-03-02T03:00:00Z"
}
```

### 3. POST /congestion/recalculate

Admin-only endpoint to trigger full recalculation.

**Headers:** `Authorization: Bearer <admin-jwt>`

**Response (202):**
```json
{
  "status": "accepted",
  "message": "Full recalculation started",
  "estimatedDurationSeconds": 30
}
```

**Response body after completion (GET /congestion/segments):**
Updated `lastCalculatedAt` reflects the recalculation time.

---

## Scope (MoSCoW)

### Must Have (~60% effort)
- [ ] `SegmentCongestion` entity + TypeORM schema + migration
- [ ] `ISegmentCongestionRepository` + TypeORM implementation
- [ ] `CongestionAggregationService` -- full recalculation from checkpoint_records
- [ ] Segment key normalization logic
- [ ] Time slot classification from session startedAt
- [ ] Bayesian smoothing using existing `updatePosterior()`
- [ ] Congestion level threshold calculation
- [ ] `GET /congestion/segments` endpoint
- [ ] `GET /congestion/routes/:routeId` endpoint
- [ ] `POST /congestion/recalculate` admin endpoint
- [ ] Frontend: congestion chips on route detail page checkpoint list
- [ ] Backend unit tests for aggregation service + normalization

### Should Have
- [ ] Incremental update on session completion (event-driven)
- [ ] Frontend: congestion indicator on home page CommuteSection
- [ ] Time slot auto-detection from current time
- [ ] Confidence indicator (e.g., "based on 23 records" vs "limited data")

### Could Have
- [ ] Daily cron job for full recalculation (03:00 KST)
- [ ] Frontend: time slot selector dropdown on route detail page
- [ ] Weather-conditioned congestion (congestion by weather+time_slot)
- [ ] Historical congestion trend (is this segment getting better or worse?)

### Won't Have (This Cycle)
- [ ] P4-2 regional insights dashboard (separate backlog item)
- [ ] Real-time congestion streaming (WebSocket) -- overkill for current user count
- [ ] External congestion API integration (TOPIS) -- future enhancement
- [ ] Map visualization of congestion -- complex; chips/badges are sufficient for MVP

---

## Riskiest Assumptions

| # | Category | Assumption | Risk | Test Method |
|---|----------|-----------|------|-------------|
| 1 | **Feasibility** | Checkpoint names can be reliably normalized across users | High | Unit test: normalize 20+ real checkpoint names from seed data; verify grouping accuracy |
| 2 | **Desirability** | Users will find segment congestion useful before departure | Medium | Track route detail page views before/after launch; survey 5 users |
| 3 | **Feasibility** | ~100 sessions yield statistically meaningful aggregates with Bayesian smoothing | High | Simulate: generate 100 sessions, compute posteriors, verify confidence > 0.5 for top-10 segments |
| 4 | **Usability** | Color-coded congestion chips are immediately understandable | Medium | Show mockup to 3 users; ask "what does the orange chip mean?" |
| 5 | **Viability** | Aggregation service runs in < 5 seconds for full recalculation | Low | Benchmark: time full recalculation with 1000 checkpoint_records |

**Test order:** #1 (normalization) -> #3 (statistical validity) -> #5 (performance) -> #4 (usability) -> #2 (desirability)

---

## Success Metrics

### OKR
**Objective:** Make commute congestion visible and actionable.

| Key Result | Baseline | Target | Measurement |
|-----------|----------|--------|-------------|
| Route detail page views / active user / week | TBD (measure week before launch) | +20% | Analytics event: `page_view(route_detail)` |
| Users who view congestion data / total active users | 0% | 40%+ within 2 weeks | Analytics event: `congestion_viewed` |
| Congestion data accuracy (user-reported) | N/A | 70%+ "accurate" or "somewhat accurate" | In-app micro-survey after 2 weeks |

### North Star Connection
"By building segment congestion, we expect **daily home page visits** to increase by 15% because users have a new reason to check the app before departing -- seeing congestion data they can't get elsewhere."

### Leading Indicator
- Congestion chip click-through rate on home page (> 10% of views result in route detail navigation)

### Guardrails (Must NOT Regress)
- Home page load time stays < 2 seconds (congestion data loaded async, not blocking)
- Existing commute stats API response time stays < 500ms
- No individual user data exposed in congestion endpoints (privacy)

---

## Acceptance Criteria

### AC-1: Full Recalculation Produces Valid Congestion Data
```
Given: 10+ completed commute sessions exist with checkpoint_records
When: POST /congestion/recalculate is called
Then:
  - segment_congestion table is populated with one row per (segment_key, time_slot) pair
  - Each row has congestion_level in ['low', 'moderate', 'high', 'severe']
  - Each row has confidence in [0.3, 0.95]
  - sampleCount matches the actual number of observations for that segment+slot
  - avgWaitMinutes and avgDelayMinutes are Bayesian-smoothed values (not raw means)
```

### AC-2: Segment Key Normalization Groups Same Locations
```
Given: User A has checkpoint "신도림역" with linkedStationId "ST001"
  And: User B has checkpoint "신도림" with linkedStationId "ST001"
When: Aggregation runs
Then: Both checkpoints map to the same segment_key
  And: checkpointName shows the most frequently used name
```

### AC-3: Time Slot Classification Is Correct
```
Given: A session started at 08:15 KST
When: Its checkpoint_records are aggregated
Then: They contribute to the "morning_rush" time slot
  And: A session started at 18:30 contributes to "evening_rush"
  And: A session started at 14:00 contributes to "afternoon"
```

### AC-4: Route Congestion Overlay Maps Correctly
```
Given: Route "집→사무실" has checkpoints [집, 신도림역, 강남역, 사무실]
  And: segment_congestion has data for 신도림역 (high) and 강남역 (low)
When: GET /congestion/routes/:routeId is called
Then:
  - Response contains 4 checkpoint entries in sequence order
  - 집 and 사무실 have congestion: null (no transit data for home/work)
  - 신도림역 has congestion.congestionLevel = "high"
  - 강남역 has congestion.congestionLevel = "low"
  - overallCongestion is the worst level among all checkpoints
```

### AC-5: Frontend Shows Congestion Chips on Route Detail
```
Given: User navigates to route detail page for a route with congestion data
When: The page loads
Then:
  - Each checkpoint with congestion shows a color-coded chip (green/yellow/orange/red)
  - The chip displays the congestion level text ("혼잡" for high, "원활" for low, etc.)
  - Tapping a chip shows a tooltip with avgWaitMinutes and sampleCount
  - Checkpoints without congestion data show no chip
```

### AC-6: Empty State (No Congestion Data)
```
Given: No completed sessions exist yet
When: GET /congestion/segments is called
Then: Response returns empty segments array with totalCount: 0
  And: Frontend shows "아직 혼잡도 데이터가 없어요" empty state
```

### AC-7: Privacy -- No Individual User Data Exposed
```
Given: Congestion endpoints are called
When: Response is inspected
Then:
  - No userId field appears anywhere in the response
  - sampleCount is the only indicator of data volume
  - Individual session IDs are never exposed
  - Minimum sampleCount to show congestion is 3 (below 3 → show as "insufficient data")
```

### AC-8: Bayesian Smoothing With Small Samples
```
Given: A segment has only 2 observations with delay = [15, 20] minutes
When: Congestion is calculated
Then:
  - avgDelayMinutes is pulled toward the prior (mu=3), not raw mean (17.5)
  - confidence is low (< 0.5)
  - congestionLevel reflects the smoothed value, not the raw outlier
```

---

## User Flow

### Flow 1: Viewing Congestion on Home Page

```
1. User opens app → Home page loads
2. CommuteSection shows their preferred route
3. Next to each transit checkpoint, a small congestion chip appears:
   - "원활" (green) / "보통" (yellow) / "혼잡" (orange) / "매우혼잡" (red)
4. User taps a chip → navigates to route detail page with congestion overlay
```

### Flow 2: Route Detail Page with Congestion Overlay

```
1. User navigates to /routes/:id (or taps from home)
2. Checkpoint list loads normally
3. Congestion overlay loads async (separate API call, does not block page)
4. Each checkpoint with congestion data shows:
   - Color-coded left border or badge
   - Text: "평균 대기 7.2분 · 23건 데이터"
5. Top of page shows overall congestion level for the route
6. Time slot selector (optional Should-have): switch between morning_rush / evening_rush
```

### Flow 3: Session Completion Updates Congestion (Should-Have)

```
1. User completes a commute session
2. Backend session completion handler triggers incremental congestion update
3. For each checkpoint in the completed session:
   - Find matching segment_congestion row
   - Add new observation to running statistics
   - Recompute posterior and congestion level
4. Next time any user views that segment, updated congestion is visible
```

### Error / Edge Cases

| Case | Behavior |
|------|----------|
| No congestion data for a checkpoint | Show nothing (no chip, no indicator) |
| Less than 3 samples for a segment | Show "데이터 수집 중" in gray, not a congestion level |
| All checkpoints are "home" or "work" type | No congestion chips shown (these types are excluded) |
| User has no saved routes | Congestion section not shown on home page |
| API returns error | Congestion overlay silently fails; rest of page works normally |
| Very old data (>30 days since last update) | Show stale indicator: "30일 전 데이터" |

---

## Task Breakdown

### Phase A: Backend -- Entity & Repository (2 tasks)

| # | Task | Size | Depends On | Parallel? |
|---|------|------|-----------|-----------|
| A1 | Create `SegmentCongestion` domain entity with `TimeSlot` and `CongestionLevel` types | S | -- | Yes |
| A2 | Create `ISegmentCongestionRepository` interface + TypeORM implementation + migration SQL | M | A1 | No |

### Phase B: Backend -- Aggregation Service (4 tasks)

| # | Task | Size | Depends On | Parallel? |
|---|------|------|-----------|-----------|
| B1 | Implement `normalizeSegmentKey()` utility function + unit tests | S | -- | Yes |
| B2 | Implement `classifyTimeSlot()` utility function + unit tests | S | -- | Yes |
| B3 | Implement `CongestionAggregationService.recalculateAll()` -- full pipeline from checkpoint_records to segment_congestion | L | A2, B1, B2 | No |
| B4 | Write integration tests for aggregation service (mock data, verify Bayesian output) | M | B3 | No |

### Phase C: Backend -- API Endpoints (3 tasks)

| # | Task | Size | Depends On | Parallel? |
|---|------|------|-----------|-----------|
| C1 | `GET /congestion/segments` controller + service + DTO | M | A2 | Yes (after A2) |
| C2 | `GET /congestion/routes/:routeId` controller + service + DTO (map route checkpoints to congestion data) | M | A2 | Yes (after A2) |
| C3 | `POST /congestion/recalculate` admin endpoint (JWT guard, triggers B3) | S | B3 | No |

### Phase D: Backend -- Incremental Update (1 task, Should-Have)

| # | Task | Size | Depends On | Parallel? |
|---|------|------|-----------|-----------|
| D1 | Hook into session completion event to trigger incremental congestion update for affected segments | M | B3 | No |

### Phase E: Frontend -- Congestion Display (3 tasks)

| # | Task | Size | Depends On | Parallel? |
|---|------|------|-----------|-----------|
| E1 | Add congestion API client methods + React Query hooks (`useCongestionSegments`, `useRouteCongestion`) | S | C1, C2 | No |
| E2 | Build `CongestionChip` component (color-coded badge, tooltip on tap) + unit test | S | -- | Yes |
| E3 | Integrate congestion overlay on route detail page (checkpoint list + overall level) | M | E1, E2 | No |

### Phase F: Frontend -- Home Page Integration (1 task, Should-Have)

| # | Task | Size | Depends On | Parallel? |
|---|------|------|-----------|-----------|
| F1 | Add congestion chips to home page CommuteSection next to checkpoint names | M | E1, E2 | No |

### Phase G: NestJS Module Wiring (1 task)

| # | Task | Size | Depends On | Parallel? |
|---|------|------|-----------|-----------|
| G1 | Create `CongestionModule` -- register service, controller, repository, import dependencies | S | C1, C2, C3 | No |

**Total: 14 tasks. Estimated: 1 dev cycle (5-7 working days for Must + Should)**

**Critical path:** A1 -> A2 -> B3 -> C1/C2/C3 -> E1 -> E3

---

## Technical Notes

### Reusable Code from P3-1

| Module | Reuse |
|--------|-------|
| `bayesian-estimator.ts` | `updatePosterior()`, `credibleInterval()`, `BayesianPrior` type |
| `descriptive-stats.ts` | `mean()`, `stdDev()`, `percentile()`, `clamp()` |

No modifications needed to existing stats library. Define a new `CONGESTION_PRIOR` constant in the congestion module.

### TypeORM Entity Registration

Add `SegmentCongestionEntity` to the TypeORM entity list in the app module. Use `synchronize: true` for dev, migration SQL for production.

### Frontend Bundle Impact

- `CongestionChip` component: ~2KB (tiny)
- API client additions: ~1KB
- React Query hooks: ~1KB
- Total: ~4KB uncompressed, negligible gzip delta

### Privacy Implementation

- Aggregation queries use `GROUP BY` on normalized segment keys -- no `userId` in SELECT.
- Repository methods never expose individual checkpoint_record IDs.
- API DTOs explicitly exclude user-identifying fields.
- Minimum `sampleCount` threshold (3) prevents de-anonymization of small groups.

### Database Query Pattern

Full recalculation query:

```sql
SELECT
  -- segment identification
  COALESCE(rc.linked_station_id, rc.linked_bus_stop_id, LOWER(TRIM(rc.name))) AS segment_key,
  MODE() WITHIN GROUP (ORDER BY rc.name) AS checkpoint_name,
  MODE() WITHIN GROUP (ORDER BY rc.checkpoint_type) AS checkpoint_type,
  MODE() WITHIN GROUP (ORDER BY rc.line_info) AS line_info,
  -- time slot (classified in application layer from session.started_at)
  -- aggregates
  ARRAY_AGG(cr.actual_wait_time) AS wait_times,
  ARRAY_AGG(cr.delay_minutes) AS delay_values,
  COUNT(*) AS sample_count
FROM alert_system.checkpoint_records cr
JOIN alert_system.commute_sessions cs ON cr.session_id = cs.id
JOIN alert_system.route_checkpoints rc ON cr.checkpoint_id = rc.id
WHERE cs.status = 'completed'
GROUP BY segment_key;
```

The application layer then classifies time slots and applies Bayesian smoothing per group.

---

## Decision Log

| Date | Decision | Alternatives | Rationale |
|------|----------|-------------|-----------|
| 2026-03-02 | Use Bayesian smoothing for small datasets | Raw averages; Wilson score interval | Normal-Normal conjugate is already implemented in P3-1 stats library; gracefully handles small samples by pulling toward prior |
| 2026-03-02 | Aggregate across ALL users (anonymized) | Per-user only | Flywheel effect: more users = better data. Privacy preserved by aggregation + sampleCount threshold |
| 2026-03-02 | 6 time slots (not just 2) | morning_rush + evening_rush only | More granular = more useful. Off-peak users exist. Cost is low (just grouping) |
| 2026-03-02 | Chips/badges (not map overlay) for MVP | Map visualization | Map is high-effort, low-value for checkpoint-based routes. Chips are immediately understandable |
| 2026-03-02 | Normalize by linkedStationId first, name fallback | Name only; Geo coordinates | Station IDs are reliable and already present on most transit checkpoints. Geo coords not tracked |
| 2026-03-02 | Minimum 3 samples to show congestion level | Show all (even 1 sample) | 1-2 samples are statistically unreliable even with Bayesian smoothing; showing them would erode trust |

---

## Open Questions

1. **Checkpoint name normalization coverage**: How many real checkpoints in the DB have `linkedStationId` set? If most are null, the fallback normalization becomes critical.
2. **Congestion refresh UX**: Should we show a "last updated 3h ago" timestamp, or is this noise for users?
3. **Future P4-4 integration**: When prediction accuracy improves from congestion data, should we feed congestion levels back into the PredictionEngine as an additional factor? (Likely yes, but deferred.)
