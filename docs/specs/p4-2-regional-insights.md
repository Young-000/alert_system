# P4-2: Regional Commute Insights -- Statistics Dashboard for Aggregated Commute Patterns

## Executive Summary

Users track individual commutes but have no way to see how their experience compares to others in the same area. P4-2 creates a regional insights dashboard (`/insights`) that aggregates commute data across users by geographic region (derived from checkpoint clustering), surfaces peak-hour patterns, trend analysis (week-over-week, month-over-month), and a personal-vs-regional comparison. This is the second "data flywheel" feature after P4-1 (segment congestion): it transforms raw commute logs into community-level intelligence, giving users a reason to both track more and return to the app to see evolving patterns. Privacy is preserved by only showing aggregated stats for regions with 5+ distinct users.

Expected impact: 25%+ increase in weekly return visits among active users, driven by curiosity about regional patterns and competitive comparison against regional averages.

---

## Discovery Context

### Desired Outcome (Measurable)
Increase weekly active user retention by making commute data socially comparative and trend-aware. Target: 25%+ increase in weekly return visits (users who open the app 3+ days/week).

### Opportunity Solution Tree
```
Outcome: Users understand their commute in a broader regional context
  |
  +-- Opportunity A: Users can't compare their commute to others in the area
  |     +-- Solution: Aggregate commute times by region, show "your avg vs regional avg"
  |     +-- Solution: (rejected) Leaderboard -- gamification adds complexity, privacy risk
  |
  +-- Opportunity B: Users don't know if commute times are improving or worsening over time
  |     +-- Solution: Week-over-week and month-over-month trend indicators per region
  |     +-- Solution: (rejected) Raw time-series graph -- too complex for mobile-first UI
  |
  +-- Opportunity C: Users don't know peak hours for their region
  |     +-- Solution: Peak hour visualization with hourly distribution chart
  |
  +-- Opportunity D: Aggregated data is noisy with small sample sizes
  |     +-- Solution: Minimum N=5 users per region; Bayesian smoothing (reuse P3-1/P4-1)
  |     +-- Solution: Show confidence indicator so users trust the data
```

### Evidence
- `commute_sessions` table contains `startedAt`, `completedAt`, `totalDurationMinutes`, `weatherCondition` per session per user.
- `route_checkpoints` table has `name`, `checkpointType`, `linkedStationId`, `linkedBusStopId`, `lineInfo` -- sufficient for geographic clustering into regions.
- `user_places` table has `latitude`, `longitude`, `placeType` (home, work) -- can derive region from user's home/work location.
- `segment_congestion` (P4-1) already groups checkpoints into normalized segments by `segmentKey` -- we can cluster these into higher-level regions.
- `route_analytics` table has per-route `avgDurationMinutes`, `conditionAnalysis.byTimeSlot`, `conditionAnalysis.byDayOfWeek` -- useful as building blocks.
- P3-1 delivered Bayesian estimator and descriptive stats libraries -- fully reusable.
- ~100+ completed sessions exist as seed data; with 5+ user minimum per region, we need at least a few active regions to be meaningful.

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|-----------------|
| External regional transit data (e.g., Seoul Open Data) | Doesn't reflect actual user commute experience; different granularity |
| Per-user trends only (no regional) | Users already have personal stats in `/commute/dashboard`; no new value |
| Full map-based visualization | High effort, requires geocoding; checkpoint-based clustering is sufficient for MVP |
| Leaderboard / ranking system | Privacy concerns; creates negative social pressure; too gamified for utility app |

---

## Impact Map

```
Goal: 25%+ increase in weekly return visits (3+ days/week active users)
  |
  +-- Actor: Daily commuter (3+ trips/week)
  |     |
  |     +-- Impact: Compares their commute time against regional average
  |     |     +-- Deliverable: GET /insights/regions endpoint (BE)
  |     |     +-- Deliverable: GET /insights/me/comparison endpoint (BE)
  |     |     +-- Deliverable: Regional comparison cards on /insights page (FE)
  |     |
  |     +-- Impact: Checks if commute times in their region are trending better or worse
  |     |     +-- Deliverable: GET /insights/regions/:regionId/trends endpoint (BE)
  |     |     +-- Deliverable: Trend indicators (arrows + percentages) on insight cards (FE)
  |     |
  |     +-- Impact: Plans departure time based on peak hour data
  |           +-- Deliverable: GET /insights/regions/:regionId/peak-hours endpoint (BE)
  |           +-- Deliverable: Peak hours bar chart on /insights page (FE)
  |
  +-- Actor: New user (< 5 sessions)
  |     |
  |     +-- Impact: Sees community data even before building personal history
  |           +-- Deliverable: Regional overview cards available without personal data
  |           +-- Deliverable: "Start tracking to compare" CTA when no personal data
  |
  +-- Actor: System (automated)
        |
        +-- Impact: Pre-computes aggregates for fast reads
              +-- Deliverable: regional_insights aggregate table (materialized)
              +-- Deliverable: Daily recalculation cron + manual recalculate endpoint
```

---

## JTBD (Jobs-to-be-Done)

**Primary Job:**
> When I've been commuting for a few weeks and want to understand my experience in context, I want to see how my commute time compares to others in my area, so I can know if my route is efficient or if I should try something different.

**Secondary Job:**
> When I'm deciding what time to leave in the morning, I want to see when peak hours are in my region, so I can choose a departure time that avoids the worst congestion.

**Tertiary Job:**
> When I check the app at the end of the week, I want to see if commute times in my area are getting better or worse, so I can feel informed about trends that affect my daily life.

**Forces of Progress:**
| Force | Description |
|-------|-------------|
| **Push (pain)** | "I track every commute but I don't know if 45 minutes is good or bad for my area" |
| **Pull (attraction)** | "If I could see 'your commute is 8 minutes faster than the regional average' I'd feel validated" |
| **Anxiety** | "Is the data accurate? Are there enough people in my region?" -- mitigated by showing sample sizes and confidence |
| **Inertia** | "I already know my commute time from the dashboard" -- overcome by adding regional context they can't get elsewhere |

---

## Problem Statement

### Who
All users who have completed 1+ commute sessions (for viewing regional data) or 5+ sessions (for personal comparison). Regional data is shown to everyone; personal comparison requires minimum personal history.

### Pain (Frequency x Severity)
- **Frequency**: Weekly (users check dashboard/stats roughly 1-2x/week)
- **Severity**: Low-Medium -- not a blocking pain, but a missed engagement opportunity. Users who can contextualize their data are more engaged and more likely to keep tracking.

### Current Workaround
- Users view personal stats on `/commute/dashboard` (average duration, weekly report).
- No way to compare against other users or regional norms.
- No trend analysis beyond current vs previous week in the weekly report.
- Users manually compare anecdotal experiences with coworkers ("How long does your commute take?").

### Why Now
1. P4-1 (segment congestion) established the aggregation pipeline and privacy patterns -- we extend, not rebuild.
2. Enough session data exists to make regional aggregates meaningful in at least 2-3 regions.
3. This is the natural Phase 4 progression: P4-1 (segment-level) -> P4-2 (region-level) -> P4-4 (prediction from network effects).
4. Engagement metrics show users check personal stats but don't return frequently enough -- regional context is the missing hook.

---

## Solution Overview

### Region Definition (Geographic Clustering)

Regions are derived from checkpoint data, not arbitrary administrative boundaries. The approach:

1. **Primary clustering**: Group `route_checkpoints` by their terminal checkpoints (type `home` or `work`). Since `user_places` has `latitude`/`longitude`, we cluster users whose home OR work locations fall within the same geographic cell.

2. **Grid-based regions**: Divide the Seoul metro area into a grid of ~3km x 3km cells (approximately 0.027 degrees latitude x 0.034 degrees longitude). Each cell = one region. This granularity balances:
   - Enough users per cell (5+ minimum) for statistical validity
   - Enough geographic specificity to be meaningful ("강남 area" vs "신도림 area")

3. **Region naming**: Derive human-readable region names from the most common checkpoint names within the cell. Example: if most checkpoints in a cell reference "강남역", "역삼역", the region is labeled "강남/역삼 지역".

4. **Fallback**: For users without `user_places` data, derive region from their route's first checkpoint (type `home`) or last checkpoint (type `work`).

```
Grid cell calculation:
  regionLat = FLOOR(latitude / 0.027) * 0.027
  regionLng = FLOOR(longitude / 0.034) * 0.034
  regionKey = `${regionLat}_${regionLng}`
```

### Architecture

```
commute_sessions + checkpoint_records + user_places + route_checkpoints
                        |
                        v
            [RegionalInsightsAggregationService]
              - Cluster users into regions (grid cells)
              - Aggregate commute durations per region per time slot
              - Calculate trends (WoW, MoM)
              - Apply Bayesian smoothing (reuse P3-1)
              - Enforce privacy threshold (N >= 5 users per region)
                        |
                        v
              regional_insights table (pre-computed aggregates)
              regional_peak_hours table (hourly distributions)
                        |
                        v
              [RegionalInsightsService]
              - Serve cached aggregates via API
              - Compute personal-vs-regional comparison on-the-fly
              - Daily full recalculation (cron or manual)
                        |
                   +----+----+
                   |         |
                   v         v
                REST API   Frontend
                endpoints   /insights page
```

### Pre-Computed Aggregates Strategy

Due to the computational cost of cross-user aggregation, we pre-compute and store results:

| Table | Granularity | Update Frequency |
|-------|-------------|-----------------|
| `regional_insights` | Per region, per time_slot | Daily (03:30 KST, after congestion recalc at 03:00) |
| `regional_peak_hours` | Per region, per hour-of-day | Daily (same batch) |

Personal comparison (`GET /insights/me/comparison`) joins the user's personal stats (from `commute_sessions`) against the pre-computed regional aggregate at query time -- no pre-computation needed since it's per-request.

---

## New Entities

### Domain Entity: RegionalInsight

```typescript
// backend/src/domain/entities/regional-insight.entity.ts

export type TrendDirection = 'improving' | 'stable' | 'worsening';

export class RegionalInsight {
  readonly id: string;
  readonly regionKey: string;           // grid cell key, e.g., "37.497_126.980"
  readonly regionName: string;          // human-readable, e.g., "강남/역삼 지역"
  readonly centerLat: number;           // center latitude of grid cell
  readonly centerLng: number;           // center longitude of grid cell

  // Aggregate stats
  readonly totalUsers: number;          // distinct users with sessions in this region
  readonly totalSessions: number;       // total completed sessions
  readonly avgDurationMinutes: number;  // Bayesian-smoothed average
  readonly medianDurationMinutes: number;
  readonly minDurationMinutes: number;
  readonly maxDurationMinutes: number;
  readonly stdDevMinutes: number;

  // Time slot breakdown
  readonly timeSlot: string;            // 'all' | 'morning_rush' | 'evening_rush' | ...

  // Trends
  readonly weekOverWeekChange: number;  // percentage change (negative = improving)
  readonly monthOverMonthChange: number;
  readonly trend: TrendDirection;

  // Confidence
  readonly confidence: number;          // Bayesian confidence [0.3, 0.95]
  readonly sampleCount: number;
  readonly lastCalculatedAt: Date;
  readonly periodStart: Date;           // aggregation window start
  readonly periodEnd: Date;             // aggregation window end
  readonly createdAt: Date;
}
```

### Domain Entity: RegionalPeakHour

```typescript
// backend/src/domain/entities/regional-peak-hour.entity.ts

export class RegionalPeakHour {
  readonly id: string;
  readonly regionKey: string;
  readonly hourOfDay: number;           // 0-23
  readonly avgDurationMinutes: number;
  readonly sessionCount: number;
  readonly userCount: number;
  readonly isPeakHour: boolean;         // top 3 hours by session count
  readonly lastCalculatedAt: Date;
  readonly createdAt: Date;
}
```

### Database Tables

```sql
-- Pre-computed regional aggregates
CREATE TABLE alert_system.regional_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_key VARCHAR(50) NOT NULL,
  region_name VARCHAR(200) NOT NULL,
  center_lat DOUBLE PRECISION NOT NULL,
  center_lng DOUBLE PRECISION NOT NULL,

  -- Aggregate stats
  total_users INTEGER NOT NULL DEFAULT 0,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  avg_duration_minutes DECIMAL(10, 2) NOT NULL DEFAULT 0,
  median_duration_minutes DECIMAL(10, 2) NOT NULL DEFAULT 0,
  min_duration_minutes INTEGER NOT NULL DEFAULT 0,
  max_duration_minutes INTEGER NOT NULL DEFAULT 0,
  std_dev_minutes DECIMAL(10, 2) NOT NULL DEFAULT 0,

  -- Time slot
  time_slot VARCHAR(30) NOT NULL DEFAULT 'all',

  -- Trends
  week_over_week_change DECIMAL(10, 2) DEFAULT 0,
  month_over_month_change DECIMAL(10, 2) DEFAULT 0,
  trend VARCHAR(20) NOT NULL DEFAULT 'stable',

  -- Confidence
  confidence REAL NOT NULL DEFAULT 0.3,
  sample_count INTEGER NOT NULL DEFAULT 0,
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT regional_insights_region_slot_unique
    UNIQUE (region_key, time_slot)
);

CREATE INDEX regional_insights_region_key_idx
  ON alert_system.regional_insights (region_key);
CREATE INDEX regional_insights_trend_idx
  ON alert_system.regional_insights (trend);
CREATE INDEX regional_insights_total_users_idx
  ON alert_system.regional_insights (total_users);

-- Hourly distribution per region
CREATE TABLE alert_system.regional_peak_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_key VARCHAR(50) NOT NULL,
  hour_of_day INTEGER NOT NULL CHECK (hour_of_day >= 0 AND hour_of_day <= 23),
  avg_duration_minutes DECIMAL(10, 2) NOT NULL DEFAULT 0,
  session_count INTEGER NOT NULL DEFAULT 0,
  user_count INTEGER NOT NULL DEFAULT 0,
  is_peak_hour BOOLEAN NOT NULL DEFAULT FALSE,
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT regional_peak_hours_region_hour_unique
    UNIQUE (region_key, hour_of_day)
);

CREATE INDEX regional_peak_hours_region_key_idx
  ON alert_system.regional_peak_hours (region_key);
CREATE INDEX regional_peak_hours_is_peak_idx
  ON alert_system.regional_peak_hours (is_peak_hour);
```

### Repository Interfaces

```typescript
// backend/src/domain/repositories/regional-insights.repository.ts

export const REGIONAL_INSIGHTS_REPOSITORY = Symbol('IRegionalInsightsRepository');

export interface IRegionalInsightsRepository {
  findByRegionKey(regionKey: string, timeSlot?: string): Promise<RegionalInsight | null>;
  findAll(options?: { minUsers?: number; timeSlot?: string }): Promise<RegionalInsight[]>;
  findByRegionKeys(regionKeys: string[], timeSlot?: string): Promise<RegionalInsight[]>;
  save(insight: RegionalInsight): Promise<RegionalInsight>;
  saveMany(insights: RegionalInsight[]): Promise<void>;
  deleteAll(): Promise<void>;
}

export const REGIONAL_PEAK_HOURS_REPOSITORY = Symbol('IRegionalPeakHoursRepository');

export interface IRegionalPeakHoursRepository {
  findByRegionKey(regionKey: string): Promise<RegionalPeakHour[]>;
  findPeakHoursByRegionKey(regionKey: string): Promise<RegionalPeakHour[]>;
  saveMany(peakHours: RegionalPeakHour[]): Promise<void>;
  deleteAll(): Promise<void>;
}
```

---

## API Endpoints

### 1. GET /insights/regions

List all regions with aggregated commute insights. Only regions with 5+ users are returned.

**Query Parameters:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `timeSlot` | string | No | `all` | Filter by time slot (`all`, `morning_rush`, `evening_rush`, etc.) |
| `sortBy` | string | No | `totalUsers` | Sort field: `totalUsers`, `avgDuration`, `trend` |
| `limit` | number | No | 20 | Max results |

**Response (200):**
```json
{
  "regions": [
    {
      "regionKey": "37.497_126.980",
      "regionName": "강남/역삼 지역",
      "centerLat": 37.497,
      "centerLng": 126.980,
      "totalUsers": 23,
      "totalSessions": 412,
      "avgDurationMinutes": 42.5,
      "medianDurationMinutes": 40.0,
      "stdDevMinutes": 8.3,
      "timeSlot": "all",
      "weekOverWeekChange": -3.2,
      "monthOverMonthChange": -1.8,
      "trend": "improving",
      "confidence": 0.85,
      "lastCalculatedAt": "2026-03-02T03:30:00Z"
    },
    {
      "regionKey": "37.508_126.891",
      "regionName": "신도림/구로 지역",
      "centerLat": 37.508,
      "centerLng": 126.891,
      "totalUsers": 15,
      "totalSessions": 187,
      "avgDurationMinutes": 51.2,
      "medianDurationMinutes": 48.0,
      "stdDevMinutes": 12.1,
      "timeSlot": "all",
      "weekOverWeekChange": 2.5,
      "monthOverMonthChange": 4.1,
      "trend": "worsening",
      "confidence": 0.72,
      "lastCalculatedAt": "2026-03-02T03:30:00Z"
    }
  ],
  "totalRegions": 8,
  "lastCalculatedAt": "2026-03-02T03:30:00Z"
}
```

### 2. GET /insights/regions/:regionKey

Get detailed insights for a specific region.

**Response (200):**
```json
{
  "regionKey": "37.497_126.980",
  "regionName": "강남/역삼 지역",
  "centerLat": 37.497,
  "centerLng": 126.980,
  "totalUsers": 23,
  "totalSessions": 412,
  "overview": {
    "avgDurationMinutes": 42.5,
    "medianDurationMinutes": 40.0,
    "minDurationMinutes": 22,
    "maxDurationMinutes": 78,
    "stdDevMinutes": 8.3
  },
  "byTimeSlot": [
    {
      "timeSlot": "morning_rush",
      "label": "오전 러시 (07:00-09:00)",
      "avgDurationMinutes": 48.2,
      "sessionCount": 185,
      "trend": "stable"
    },
    {
      "timeSlot": "evening_rush",
      "label": "저녁 러시 (17:00-19:00)",
      "avgDurationMinutes": 45.8,
      "sessionCount": 142,
      "trend": "improving"
    }
  ],
  "trends": {
    "weekOverWeekChange": -3.2,
    "monthOverMonthChange": -1.8,
    "trend": "improving",
    "trendDescription": "지난주 대비 3.2% 빨라졌어요"
  },
  "confidence": 0.85,
  "lastCalculatedAt": "2026-03-02T03:30:00Z"
}
```

### 3. GET /insights/regions/:regionKey/peak-hours

Get hourly commute distribution for a region.

**Response (200):**
```json
{
  "regionKey": "37.497_126.980",
  "regionName": "강남/역삼 지역",
  "hours": [
    { "hour": 6, "label": "06시", "avgDurationMinutes": 35.2, "sessionCount": 12, "isPeakHour": false },
    { "hour": 7, "label": "07시", "avgDurationMinutes": 42.1, "sessionCount": 48, "isPeakHour": true },
    { "hour": 8, "label": "08시", "avgDurationMinutes": 52.3, "sessionCount": 89, "isPeakHour": true },
    { "hour": 9, "label": "09시", "avgDurationMinutes": 44.8, "sessionCount": 56, "isPeakHour": true },
    { "hour": 10, "label": "10시", "avgDurationMinutes": 38.5, "sessionCount": 23, "isPeakHour": false }
  ],
  "peakHourSummary": {
    "peakHours": [7, 8, 9],
    "peakLabel": "07시-09시",
    "peakAvgDuration": 48.4,
    "offPeakAvgDuration": 36.8,
    "peakPenaltyMinutes": 11.6,
    "peakPenaltyPercent": 31.5
  },
  "lastCalculatedAt": "2026-03-02T03:30:00Z"
}
```

### 4. GET /insights/me/comparison

Get the authenticated user's commute stats compared to their region's average. Requires JWT.

**Response (200):**
```json
{
  "userId": "user-123",
  "userRegion": {
    "regionKey": "37.497_126.980",
    "regionName": "강남/역삼 지역"
  },
  "personal": {
    "totalSessions": 34,
    "avgDurationMinutes": 38.2,
    "medianDurationMinutes": 36.0,
    "trend": "improving",
    "weekOverWeekChange": -5.1
  },
  "regional": {
    "avgDurationMinutes": 42.5,
    "medianDurationMinutes": 40.0,
    "totalUsers": 23,
    "trend": "improving"
  },
  "comparison": {
    "differenceMinutes": -4.3,
    "differencePercent": -10.1,
    "fasterThanPercent": 68,
    "verdict": "faster_than_average",
    "verdictText": "이 지역 평균보다 4.3분(10.1%) 빠릅니다",
    "verdictEmoji": "speedup"
  },
  "insights": [
    "당신의 출퇴근 시간은 이 지역 상위 32%입니다",
    "지난주보다 5.1% 빨라졌어요",
    "오전 러시(07-09시)를 피하면 평균 11분 절약할 수 있어요"
  ],
  "hasEnoughData": true,
  "minimumSessionsRequired": 5
}
```

**When user has insufficient data (< 5 sessions):**
```json
{
  "userId": "user-456",
  "userRegion": {
    "regionKey": "37.497_126.980",
    "regionName": "강남/역삼 지역"
  },
  "personal": null,
  "regional": {
    "avgDurationMinutes": 42.5,
    "medianDurationMinutes": 40.0,
    "totalUsers": 23,
    "trend": "improving"
  },
  "comparison": null,
  "insights": [
    "출퇴근 기록을 5회 이상 쌓으면 지역 평균과 비교할 수 있어요",
    "현재 2회 기록됨 — 3회 더 필요합니다"
  ],
  "hasEnoughData": false,
  "minimumSessionsRequired": 5,
  "currentSessionCount": 2
}
```

### 5. GET /insights/regions/:regionKey/trends

Get detailed trend data for a region (week-over-week for last 8 weeks).

**Response (200):**
```json
{
  "regionKey": "37.497_126.980",
  "regionName": "강남/역삼 지역",
  "weeklyTrends": [
    { "weekLabel": "2/17 - 2/23", "avgDurationMinutes": 43.8, "sessionCount": 52, "userCount": 18 },
    { "weekLabel": "2/24 - 3/2", "avgDurationMinutes": 42.5, "sessionCount": 58, "userCount": 21 }
  ],
  "monthlyTrends": [
    { "monthLabel": "2026년 1월", "avgDurationMinutes": 44.1, "sessionCount": 198, "userCount": 19 },
    { "monthLabel": "2026년 2월", "avgDurationMinutes": 42.8, "sessionCount": 214, "userCount": 22 }
  ],
  "overallTrend": "improving",
  "overallTrendDescription": "최근 2개월 간 평균 출퇴근 시간이 1.3분 줄었어요",
  "lastCalculatedAt": "2026-03-02T03:30:00Z"
}
```

### 6. POST /insights/recalculate

Admin-only endpoint to trigger full recalculation.

**Headers:** `Authorization: Bearer <admin-jwt>`

**Response (200):**
```json
{
  "status": "completed",
  "message": "Regional insights recalculation completed",
  "regionsCalculated": 8,
  "regionsWithEnoughData": 5,
  "elapsedMs": 2340
}
```

---

## Scope (MoSCoW)

### Must Have (~60% effort)
- [ ] `RegionalInsight` + `RegionalPeakHour` domain entities + TypeORM entities + migration SQL
- [ ] `IRegionalInsightsRepository` + `IRegionalPeakHoursRepository` + TypeORM implementations
- [ ] `RegionalInsightsAggregationService` -- full recalculation pipeline
- [ ] Region key calculation from `user_places` (grid-based clustering)
- [ ] Region name derivation from most common checkpoint names
- [ ] Privacy threshold enforcement (N >= 5 users per region)
- [ ] Bayesian smoothing for regional averages (reuse P3-1 library)
- [ ] Trend calculation (week-over-week, month-over-month)
- [ ] `GET /insights/regions` endpoint
- [ ] `GET /insights/regions/:regionKey` endpoint
- [ ] `GET /insights/regions/:regionKey/peak-hours` endpoint
- [ ] `GET /insights/me/comparison` endpoint
- [ ] `POST /insights/recalculate` admin endpoint
- [ ] Frontend: `/insights` page with regional overview cards
- [ ] Frontend: personal-vs-regional comparison section
- [ ] Frontend: peak hours bar chart (CSS-based, no chart library)
- [ ] Frontend: trend indicators (arrow icons + percentage text)
- [ ] Frontend: empty state for insufficient data
- [ ] Backend unit tests (aggregation, clustering, trend calculation)
- [ ] Frontend: add `/insights` route to App.tsx + navigation

### Should Have
- [ ] `GET /insights/regions/:regionKey/trends` endpoint (8-week history)
- [ ] Frontend: weekly trend mini-chart (CSS bar chart for 8 weeks)
- [ ] Frontend: time slot selector on region detail (morning rush vs evening rush)
- [ ] Confidence indicator on all cards ("23명 기준" / "데이터 수집 중")
- [ ] Insights text generation (natural language summaries)
- [ ] Daily cron job for recalculation (03:30 KST)

### Could Have
- [ ] Region-to-region comparison (side-by-side)
- [ ] Weather-conditioned regional insights ("비 오는 날 강남 지역 평균 +12분")
- [ ] Push notification on significant trend changes ("이번 주 강남 지역 출퇴근 5% 빨라졌어요")
- [ ] Frontend: expandable region detail (inline on the list, no separate page)
- [ ] Export insights as image (shareable to social media)

### Won't Have (This Cycle)
- [ ] Map visualization of regions (requires map library -- defer to future)
- [ ] P4-3 social features (community, chat -- separate backlog item)
- [ ] Real-time regional updates (WebSocket -- overkill for daily aggregates)
- [ ] Machine learning prediction of regional trends (P4-4 scope)
- [ ] Admin dashboard for managing regions (manual region definitions)

---

## Riskiest Assumptions

| # | Category | Assumption | Risk | Test Method |
|---|----------|-----------|------|-------------|
| 1 | **Feasibility** | `user_places` has enough lat/lng data to cluster users into regions | High | Query: `SELECT COUNT(*) FROM alert_system.user_places WHERE latitude IS NOT NULL`. If < 50%, need fallback to checkpoint-based clustering |
| 2 | **Feasibility** | 3km grid produces regions with 5+ users each | High | Simulate: with current data, how many grid cells have 5+ distinct users? Adjust grid size if too few |
| 3 | **Desirability** | Users care about regional comparison (not just personal stats) | Medium | Track `/insights` page visits in first 2 weeks; target 30%+ of active users visiting at least once |
| 4 | **Usability** | CSS-only bar chart is readable on mobile for peak hours | Medium | Build chart component first; test on 3 device sizes before full integration |
| 5 | **Feasibility** | Aggregation query runs in < 10 seconds for full recalculation | Low | Benchmark: time query with current dataset; add indexes if needed |
| 6 | **Privacy** | N=5 user minimum is sufficient to prevent de-anonymization | Medium | Review: with 5 users, can you infer individual routes? If users have unique commute times, N may need to be higher |

**Test order:** #1 (data availability) -> #2 (grid sizing) -> #5 (performance) -> #4 (chart usability) -> #6 (privacy) -> #3 (desirability -- post-launch)

---

## Success Metrics

### OKR
**Objective:** Make commute data socially contextualized and trend-aware.

| Key Result | Baseline | Target | Measurement |
|-----------|----------|--------|-------------|
| Weekly return visits (3+ days/week users) | TBD (measure week before launch) | +25% | Analytics event: `app_open` per user per week |
| /insights page views / active user / week | 0 (new page) | 1.5+ views/user/week | Analytics event: `page_view(insights)` |
| Personal comparison engagement | 0 | 50%+ of eligible users view comparison within 2 weeks | Analytics event: `insights_comparison_viewed` |

### North Star Connection
"By building regional commute insights, we expect **weekly return visits** to increase by 25% because users now have a unique, regularly-updating reason to open the app -- seeing how their commute compares to their neighborhood and whether trends are improving."

### Leading Indicator
- `/insights` page visit rate within 7 days of launch (target: 30%+ of active users)
- Average time on `/insights` page (target: > 15 seconds -- indicates actual engagement, not bounce)

### Guardrails (Must NOT Regress)
- Home page load time stays < 2 seconds (insights data NOT loaded on home page)
- Existing `/commute/dashboard` and `/commute/stats` endpoints stay < 500ms
- No individual user data exposed in any insights endpoint (privacy audit)
- Aggregation cron job completes in < 30 seconds (does not impact API server performance)

---

## Acceptance Criteria

### AC-1: Region Clustering Produces Valid Regions
```
Given: 20+ users have user_places entries with latitude and longitude
When: RegionalInsightsAggregationService.recalculateAll() runs
Then:
  - Regions are created based on 3km grid cells
  - Each returned region has totalUsers >= 5
  - Regions with < 5 users are excluded from results
  - regionName is derived from the most common checkpoint names in the cell
  - centerLat and centerLng are the center point of the grid cell
```

### AC-2: Aggregated Stats Are Accurate and Bayesian-Smoothed
```
Given: A region has 15 users with 200 total completed sessions
When: GET /insights/regions returns data for that region
Then:
  - avgDurationMinutes is a Bayesian-smoothed value (not raw mean)
  - medianDurationMinutes is the actual median of session durations
  - stdDevMinutes reflects the actual standard deviation
  - totalUsers counts DISTINCT users, not duplicate sessions
  - totalSessions counts only status='completed' sessions
```

### AC-3: Trend Calculation Is Correct
```
Given: Region "강남" had avg duration 45 min last week and 42.5 min this week
When: The insight is calculated
Then:
  - weekOverWeekChange = -5.56 (percentage, negative = faster)
  - trend = "improving" (because duration decreased)
  - And: If the change is within +/- 2%, trend = "stable"
  - And: If duration increased > 2%, trend = "worsening"
```

### AC-4: Personal vs Regional Comparison Works
```
Given: User has 10 completed sessions with avg duration 38 min
  And: User's home region has regional avg 42.5 min
When: GET /insights/me/comparison is called
Then:
  - differenceMinutes = -4.5
  - differencePercent = -10.6
  - verdict = "faster_than_average"
  - verdictText contains the time difference in Korean
  - fasterThanPercent indicates percentile rank
```

### AC-5: Insufficient Data Handling
```
Given: User has only 2 completed sessions
When: GET /insights/me/comparison is called
Then:
  - hasEnoughData = false
  - personal = null
  - comparison = null
  - insights array contains guidance text about how many more sessions are needed
  - Regional data is still returned (if the region has 5+ users)
```

### AC-6: Peak Hours Are Correctly Calculated
```
Given: A region has sessions distributed across hours 6-22
When: GET /insights/regions/:regionKey/peak-hours is called
Then:
  - hours array contains entries for each hour with session data
  - isPeakHour = true for the top 3 hours by session count
  - peakPenaltyMinutes = peakAvgDuration - offPeakAvgDuration
  - peakPenaltyPercent is the percentage difference
```

### AC-7: Privacy -- No Individual User Data Exposed
```
Given: Any insights endpoint is called
When: Response is inspected
Then:
  - No userId field appears in region-level responses
  - No individual session IDs are exposed
  - Regions with < 5 distinct users are NOT returned
  - Only the authenticated user's own data appears in /insights/me/comparison
```

### AC-8: Frontend /insights Page Loads and Displays Data
```
Given: User navigates to /insights
When: The page loads
Then:
  - Region cards are displayed with name, avg duration, trend indicator, user count
  - Each card shows a trend arrow (green down-arrow for improving, red up-arrow for worsening)
  - "내 출퇴근 비교" section shows personal vs regional comparison (if eligible)
  - If user has insufficient data, shows CTA: "출퇴근 기록 3회 더 쌓으면 비교할 수 있어요"
  - If no regions have enough data, shows empty state: "아직 충분한 데이터가 없어요"
```

### AC-9: Peak Hours Visualization
```
Given: User views a region's peak hours
When: The peak hours section renders
Then:
  - A horizontal bar chart shows hours 6-22 with bar height proportional to session count
  - Bar color intensity reflects avg duration (darker = longer commute)
  - Peak hours are visually highlighted (bold border or different color)
  - Summary text shows: "피크 시간: 07-09시, 평균 11분 더 걸려요"
```

### AC-10: Navigation Integration
```
Given: User is on any page with navigation
When: User taps the "인사이트" navigation item
Then: User is navigated to /insights
  And: The insights page is lazy-loaded (code-split)
  And: Navigation item shows "인사이트" with a chart/graph icon
```

---

## User Flow

### Flow 1: Viewing Regional Insights Overview

```
1. User taps "인사이트" in navigation bar
2. /insights page loads with Skeleton loader
3. Regional overview section shows:
   - Section title: "지역별 출퇴근 현황"
   - Cards for each region (sorted by totalUsers desc)
   - Each card shows:
     * Region name (e.g., "강남/역삼 지역")
     * Average commute time (e.g., "평균 42분")
     * Trend arrow + percentage (e.g., "▼ 3.2% 지난주 대비")
     * User count (e.g., "23명 기준")
4. User taps a region card → expands or navigates to region detail
```

### Flow 2: Personal Comparison

```
1. On /insights page, "내 출퇴근 비교" section loads
2. If user has 5+ sessions:
   - Shows: "당신의 평균 출퇴근: 38분"
   - Shows: "강남/역삼 지역 평균: 42.5분"
   - Shows: "4.3분 빠릅니다 (상위 32%)" with green highlight
   - Shows 1-2 actionable insights as text
3. If user has < 5 sessions:
   - Shows: "출퇴근 기록을 3회 더 쌓으면 비교할 수 있어요"
   - Shows progress indicator: "2/5 기록 완료"
   - CTA button: "출퇴근 기록하기" → navigates to /commute
```

### Flow 3: Peak Hours

```
1. User taps a region card or scrolls to peak hours section
2. Bar chart renders showing hours 6-22
3. Peak hours are highlighted (e.g., 7, 8, 9 AM)
4. Summary: "07-09시는 평균 11분 더 걸려요. 가능하면 06시 이전 출발을 추천해요."
```

### Error / Edge Cases

| Case | Behavior |
|------|----------|
| No regions meet 5-user threshold | Show: "아직 충분한 데이터가 모이지 않았어요. 출퇴근 기록이 쌓이면 지역별 인사이트를 볼 수 있습니다." |
| User has no home/work place set | Cannot determine user's region; show all regions without personal comparison. Show CTA: "장소를 등록하면 내 지역 인사이트를 볼 수 있어요" |
| User not logged in | Show regional data (public), hide personal comparison. Show login CTA. |
| API error loading insights | Show error state with retry button: "데이터를 불러오지 못했어요" |
| Region has data but all sessions are old (>30 days) | Show stale indicator: "30일 이상 전 데이터입니다" |
| Only 1 region meets threshold | Show that one region; no comparison possible between regions |
| Trend data insufficient (< 2 weeks of history) | trend = "stable", hide trend section. Show: "2주 이상 데이터가 쌓이면 트렌드를 볼 수 있어요" |

---

## Frontend Component Structure

```
/insights (InsightsPage)
  |
  +-- InsightsHeader
  |     - Page title: "출퇴근 인사이트"
  |     - Subtitle: "지역 통근 데이터 분석"
  |
  +-- PersonalComparisonCard
  |     - User's avg vs regional avg
  |     - Verdict text + emoji indicator
  |     - If insufficient data: progress bar + CTA
  |
  +-- RegionalOverviewSection
  |     - Section title: "지역별 현황"
  |     +-- RegionCard (repeated)
  |           - Region name
  |           - Avg duration
  |           - TrendIndicator (arrow + percentage)
  |           - User count badge
  |           - onClick: expand to show peak hours
  |
  +-- PeakHoursChart (inside expanded RegionCard or separate section)
  |     - CSS-only horizontal bar chart
  |     - Peak hours highlighted
  |     - Summary text
  |
  +-- TrendSection (Should-Have)
        - 8-week mini bar chart
        - Month-over-month comparison
```

### CSS-Only Bar Chart Approach

Since this project uses React + CSS (no Tailwind, no chart library), the peak hours chart uses CSS grid/flexbox:

```css
.peak-hours-chart {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 120px;
  padding: 8px 0;
}

.peak-hours-chart__bar {
  flex: 1;
  min-width: 16px;
  border-radius: 4px 4px 0 0;
  transition: height 0.3s ease;
}

.peak-hours-chart__bar--peak {
  background-color: var(--color-primary);
}

.peak-hours-chart__bar--normal {
  background-color: var(--color-muted);
}
```

Bar height is calculated as `(barValue / maxValue) * 100%` via inline style (the only acceptable use of inline styles per project conventions -- dynamic calculated values).

---

## Task Breakdown

### Phase A: Backend -- Entities & Repositories (3 tasks)

| # | Task | Size | Depends On | Parallel? |
|---|------|------|-----------|-----------|
| A1 | Create `RegionalInsight` + `RegionalPeakHour` domain entities with types (`TrendDirection`, etc.) | S | -- | Yes |
| A2 | Create TypeORM entities (`RegionalInsightEntity`, `RegionalPeakHourEntity`) + migration SQL | M | A1 | No |
| A3 | Create repository interfaces + TypeORM implementations | M | A2 | No |

### Phase B: Backend -- Aggregation Service (5 tasks)

| # | Task | Size | Depends On | Parallel? |
|---|------|------|-----------|-----------|
| B1 | Implement `calculateRegionKey(lat, lng)` and `deriveRegionName(checkpoints)` utility functions + unit tests | S | -- | Yes |
| B2 | Implement `getUserRegionKey(userId)` -- lookup user's region from `user_places` + fallback to route checkpoints | S | -- | Yes |
| B3 | Implement `RegionalInsightsAggregationService.recalculateAll()` -- full pipeline: cluster users -> aggregate durations -> Bayesian smoothing -> trend calculation -> save | L | A3, B1, B2 | No |
| B4 | Implement peak hours aggregation within the same service | M | B3 | No |
| B5 | Write unit tests for aggregation service (mock data, verify Bayesian output, verify trend direction, verify privacy threshold) | M | B3, B4 | No |

### Phase C: Backend -- API Endpoints (5 tasks)

| # | Task | Size | Depends On | Parallel? |
|---|------|------|-----------|-----------|
| C1 | `GET /insights/regions` controller + service + DTO | M | A3 | Yes (after A3) |
| C2 | `GET /insights/regions/:regionKey` controller + service + DTO | M | A3 | Yes (after A3) |
| C3 | `GET /insights/regions/:regionKey/peak-hours` controller + service + DTO | S | A3 | Yes (after A3) |
| C4 | `GET /insights/me/comparison` controller + service + DTO (auth required, user region lookup + comparison logic) | L | A3, B2 | No |
| C5 | `POST /insights/recalculate` admin endpoint (triggers B3) + `GET /insights/regions/:regionKey/trends` | S | B3 | No |

### Phase D: Backend -- Module Wiring (1 task)

| # | Task | Size | Depends On | Parallel? |
|---|------|------|-----------|-----------|
| D1 | Create `InsightsModule` -- register services, controllers, repositories, import CommuteModule | S | C1-C5 | No |

### Phase E: Frontend -- API Client & Hooks (2 tasks)

| # | Task | Size | Depends On | Parallel? |
|---|------|------|-----------|-----------|
| E1 | Add `insights-api.client.ts` with all endpoint methods + TypeScript types | M | C1-C5 API design | Yes (can start from DTO definitions) |
| E2 | Create React Query hooks: `useRegionalInsights`, `useRegionDetail`, `usePeakHours`, `useMyComparison` | M | E1 | No |

### Phase F: Frontend -- Components (5 tasks)

| # | Task | Size | Depends On | Parallel? |
|---|------|------|-----------|-----------|
| F1 | Build `TrendIndicator` component (arrow icon + percentage + color) + unit test | S | -- | Yes |
| F2 | Build `RegionCard` component (region name, avg time, trend, user count) + unit test | S | F1 | No |
| F3 | Build `PersonalComparisonCard` component (personal vs regional, verdict, progress bar for insufficient data) + unit test | M | F1 | Yes (after F1) |
| F4 | Build `PeakHoursChart` component (CSS-only bar chart) + unit test | M | -- | Yes |
| F5 | Build `InsightsPage` -- compose all components, wire React Query hooks, handle loading/error/empty states | L | E2, F2, F3, F4 | No |

### Phase G: Frontend -- Integration (2 tasks)

| # | Task | Size | Depends On | Parallel? |
|---|------|------|-----------|-----------|
| G1 | Add `/insights` route to App.tsx + lazy loading + navigation item | S | F5 | No |
| G2 | Write integration tests for InsightsPage (mock API, verify render states) | M | F5, G1 | No |

**Total: 23 tasks. Estimated: 1.5 dev cycles (7-10 working days for Must + Should)**

**Critical path:** A1 -> A2 -> A3 -> B3 -> C1/C4 -> E1 -> E2 -> F5 -> G1

---

## Technical Notes

### Reusable Code

| Module | Source | Reuse |
|--------|--------|-------|
| `bayesian-estimator.ts` | P3-1 | `updatePosterior()`, `BayesianPrior` type -- for smoothing regional averages |
| `descriptive-stats.ts` | P3-1 | `mean()`, `stdDev()`, `median()`, `percentile()` |
| `classifyTimeSlot()` | P4-1 | Time slot classification from session startedAt |
| `CongestionModule` pattern | P4-1 | Module structure (controller + service + repository pattern) |

### Database Query Pattern -- Full Recalculation

```sql
-- Step 1: Assign users to regions via user_places
WITH user_regions AS (
  SELECT
    up.user_id,
    FLOOR(up.latitude / 0.027) * 0.027 AS region_lat,
    FLOOR(up.longitude / 0.034) * 0.034 AS region_lng,
    CONCAT(FLOOR(up.latitude / 0.027) * 0.027, '_', FLOOR(up.longitude / 0.034) * 0.034) AS region_key
  FROM alert_system.user_places up
  WHERE up.latitude IS NOT NULL
    AND up.longitude IS NOT NULL
    AND up.place_type IN ('home', 'work')
    AND up.is_active = true
),

-- Step 2: Join sessions to regions
regional_sessions AS (
  SELECT
    ur.region_key,
    ur.region_lat,
    ur.region_lng,
    cs.user_id,
    cs.total_duration_minutes,
    cs.started_at,
    EXTRACT(HOUR FROM cs.started_at AT TIME ZONE 'Asia/Seoul') AS start_hour
  FROM alert_system.commute_sessions cs
  JOIN user_regions ur ON cs.user_id = ur.user_id
  WHERE cs.status = 'completed'
    AND cs.total_duration_minutes IS NOT NULL
    AND cs.started_at >= NOW() - INTERVAL '90 days'
)

-- Step 3: Aggregate per region
SELECT
  region_key,
  region_lat,
  region_lng,
  COUNT(DISTINCT user_id) AS total_users,
  COUNT(*) AS total_sessions,
  AVG(total_duration_minutes) AS avg_duration,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_duration_minutes) AS median_duration,
  MIN(total_duration_minutes) AS min_duration,
  MAX(total_duration_minutes) AS max_duration,
  STDDEV_POP(total_duration_minutes) AS std_dev
FROM regional_sessions
GROUP BY region_key, region_lat, region_lng
HAVING COUNT(DISTINCT user_id) >= 5;
```

The application layer then:
1. Applies Bayesian smoothing to `avg_duration`
2. Calculates trends by running the same query for previous periods
3. Derives region names from checkpoint data
4. Saves to `regional_insights` table

### Region Name Derivation

```sql
-- Get most common checkpoint names per region
SELECT
  ur.region_key,
  rc.name AS checkpoint_name,
  COUNT(*) AS usage_count
FROM alert_system.route_checkpoints rc
JOIN alert_system.commute_routes cr ON rc.route_id = cr.id
JOIN user_regions ur ON cr.user_id = ur.user_id
WHERE rc.checkpoint_type IN ('subway', 'bus_stop', 'transfer_point')
GROUP BY ur.region_key, rc.name
ORDER BY ur.region_key, usage_count DESC;
```

Take top 2 names per region, join with "/". Example: "강남역" + "역삼역" = "강남/역삼 지역".

### Privacy Implementation

- All aggregate queries use `GROUP BY region_key` -- no `userId` in SELECT for public endpoints.
- `HAVING COUNT(DISTINCT user_id) >= 5` enforces minimum user threshold at the query level.
- `/insights/me/comparison` is the ONLY endpoint that returns user-specific data, and it requires JWT authentication.
- Individual session IDs, route IDs, and checkpoint records are never exposed.
- Percentile ranking (`fasterThanPercent`) is computed from the aggregate distribution, not by listing individual users.

### Frontend Bundle Impact

- `InsightsPage` (lazy-loaded): ~8KB uncompressed
- `PeakHoursChart` component: ~3KB
- `RegionCard` + `TrendIndicator` + `PersonalComparisonCard`: ~5KB
- API client + React Query hooks: ~3KB
- CSS: ~2KB
- Total: ~21KB uncompressed, ~6KB gzip -- well within budget

### Bayesian Prior for Regional Averages

```typescript
const REGIONAL_DURATION_PRIOR: BayesianPrior = {
  mu: 45,     // 45 min -- Seoul metro area average commute
  sigma: 15,  // wide prior -- high uncertainty
};
```

With 5+ users and 30+ sessions, the posterior converges quickly to the observed mean. The prior only matters for regions near the threshold boundary.

---

## Decision Log

| Date | Decision | Alternatives | Rationale |
|------|----------|-------------|-----------|
| 2026-03-02 | Use grid-based geographic clustering (3km cells) | K-means clustering; administrative district boundaries; user-defined regions | Grid is deterministic, simple, and doesn't require tuning K. Admin districts (gu/dong) are too coarse or too fine. Grid can be adjusted later by changing cell size |
| 2026-03-02 | Minimum N=5 users per region for privacy | N=3 (too low, risk of identification); N=10 (too restrictive with current user base) | N=5 balances privacy and data availability. With 5+ users, individual commute patterns cannot be easily inferred from aggregates |
| 2026-03-02 | Pre-computed aggregates (materialized table) over real-time queries | Real-time aggregation on each request; Redis-cached query results | Pre-computed is simplest, fastest reads, and decouples heavy queries from API response time. Daily refresh is sufficient for regional trends |
| 2026-03-02 | CSS-only bar chart (no chart library) | Chart.js; Recharts; D3 | Project convention is React + CSS (no Tailwind). Adding a chart library increases bundle by 30-100KB for one component. CSS bars are sufficient for a simple hourly distribution |
| 2026-03-02 | Derive region names from checkpoint names (not geocoding API) | Google Geocoding API; Kakao Local API; hardcoded region names | No external API dependency; checkpoint names already contain meaningful location info (station names). Avoids API costs and latency |
| 2026-03-02 | 90-day aggregation window (not all-time) | 30 days (too narrow, fewer samples); all-time (stale data from months ago) | 90 days balances recency and sample size. Older data is less relevant for trend analysis |
| 2026-03-02 | Comparison requires 5+ personal sessions | 1 session (too noisy); 10 sessions (too restrictive for new users) | 5 sessions give a reasonable personal average. Below 5, standard deviation is too high for meaningful comparison |
| 2026-03-02 | Public regional data, authenticated personal comparison | All data requires auth; all data public | Regional aggregates are anonymized and safe to show. Personal comparison inherently requires knowing who the user is |

---

## Open Questions

1. **Grid cell size calibration**: The 3km cell size is estimated. With actual `user_places` data, we may need to adjust to ensure at least 3-5 regions meet the 5-user threshold. If too few regions qualify, increase cell size to 5km.

2. **Region name quality**: Deriving names from checkpoint names may produce awkward labels if checkpoints are generic (e.g., "집", "회사"). Filtering to only subway/bus stop names should help, but edge cases may need manual override.

3. **Trend window**: Week-over-week comparison may be noisy if a region has 5-10 sessions per week. Consider using a 2-week rolling average instead of strict weekly comparison if data is sparse.

4. **`user_places` data completeness**: How many users have set their home/work location? If most haven't, the fallback to route checkpoint clustering becomes critical. May need to add an onboarding prompt: "Set your home location to see regional insights."

5. **Future P4-4 integration**: Regional insights could feed into the prediction engine (P4-4) as a macro-level signal. Deferred but worth noting in the architecture that `regional_insights` table is a potential input for predictions.
