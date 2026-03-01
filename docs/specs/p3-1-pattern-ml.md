# P3-1: Pattern Analysis ML -- Day-of-Week / Weather / Seasonal Prediction Model

## Executive Summary

The current departure prediction system uses static, one-size-fits-all rule-based adjustments (rain = -10min for everyone, snow = -15min for everyone). It ignores that users have deeply individual commute behaviors -- one person might leave 20 minutes earlier when it rains, another only 3 minutes. By building a personalized statistical prediction engine that learns from each user's actual commute data (CommuteRecord + CommuteSession + CheckpointRecord), we can deliver predictions that feel accurate and build trust in the system. The existing behavior module's biggest gap is that it only uses CommuteRecord data -- rich session/checkpoint data sits unused. This spec closes that gap.

Expected impact: Prediction confidence increases from flat 30-85% tiers to data-driven per-user confidence. Users who see accurate predictions are more likely to trust and continue using the departure recommendation feature.

---

## Discovery Context

### Desired Outcome (Measurable)
Increase the accuracy of departure time predictions so that 70%+ of predictions fall within +/- 5 minutes of the user's actual departure time (for users with 10+ data points).

### Opportunity Solution Tree
```
Outcome: More accurate, personalized departure predictions
  |
  +-- Opportunity A: Users depart at different times by day-of-week (Mon vs Fri)
  |     +-- Solution: Day-of-week segmented pattern analysis
  |
  +-- Opportunity B: Weather impact varies per person (some people barely change)
  |     +-- Solution: Per-user weather sensitivity coefficients
  |
  +-- Opportunity C: Rich route segment data (CommuteSession) is wasted
  |     +-- Solution: Route segment analysis to identify bottleneck segments
  |
  +-- Opportunity D: Users have no visibility into how predictions are made
        +-- Solution: Pattern Insights UI showing contributing factors
```

### Evidence
- Current system uses `PatternAnalysisService` with weighted moving average (decay 0.9, max 30 records) -- treats all days equally.
- `PredictOptimalDepartureUseCase` applies hardcoded weather adjustments: rain=-10, snow=-15, heavySnow=-20, extremeCold=-5, extremeHeat=-5.
- `CommuteSession` and `CheckpointRecord` entities exist with rich data (segment durations, wait times, delays) but are NOT consumed by `PatternAnalysisService`.
- `UserPattern` entity already has `dayOfWeek` and `isWeekday` fields -- infrastructure exists but is underused.

---

## Impact Map

```
Goal: 70%+ prediction accuracy within +/-5 min (for users with 10+ records)
  |
  +-- Actor: Daily commuter (uses the app 5+ days/week)
  |     |
  |     +-- Impact: Trusts the departure recommendation and acts on it
  |     |     +-- Deliverable: Personalized prediction engine (BE)
  |     |     +-- Deliverable: Pattern Insights card on home page (FE)
  |     |
  |     +-- Impact: Understands WHY a time is recommended (transparency)
  |           +-- Deliverable: Contributing factors breakdown in prediction API
  |           +-- Deliverable: Detailed analysis page (FE)
  |
  +-- Actor: New user (< 5 records)
        |
        +-- Impact: Gets reasonable predictions even with little data
              +-- Deliverable: Cold start strategy with population defaults
```

---

## JTBD (Jobs-to-be-Done)

**Primary Job:**
> When I'm getting ready to leave for work in the morning, I want to know exactly when I should depart **given today's specific conditions**, so I can arrive on time without leaving unnecessarily early.

**Forces of Progress:**
| Force | Description |
|-------|-------------|
| **Push (pain)** | Current predictions feel generic -- "leave 10 min early because of rain" doesn't match my experience |
| **Pull (attraction)** | A prediction that says "Based on your pattern, you leave 7 min earlier on rainy Mondays" feels personal and trustworthy |
| **Anxiety** | "Will the AI be wrong and make me late?" -- mitigated by confidence scores and transparent factors |
| **Inertia** | "I already know when to leave" -- overcome by showing insights they didn't know (e.g., "You're 12 min slower on Fridays") |

---

## Problem Statement

### Who
Daily commuters who use the alert system to plan their departure.

### Pain (Frequency x Severity)
- **Frequency**: Every commute day (5x/week for most users)
- **Severity**: Medium -- incorrect predictions erode trust. Users who see "leave at 8:05" but actually need 7:50 stop trusting recommendations.

### Current Workaround
Users ignore the prediction and rely on their own intuition. The departure prediction component exists (`DeparturePrediction.tsx`) but shows generic adjustments.

### Why Now
1. The data infrastructure is already built (CommuteRecord, CommuteSession, CheckpointRecord).
2. The behavior module exists but is underutilized.
3. Phase 2 (smart departure, geofence) is complete -- Phase 3 is the natural progression.
4. Unused `CommuteSession` data will grow stale if not leveraged soon.

---

## Solution Overview

### Architecture

```
                    Existing Data Sources
    +------------------+-------------------+-------------------+
    | CommuteRecord    | CommuteSession    | CheckpointRecord  |
    | (departure time, | (total duration,  | (segment duration,|
    |  weather, delay)  |  wait, delay,     |  wait, delay per  |
    |                   |  weather)          |  checkpoint)      |
    +--------+---------+---------+---------+---------+---------+
             |                   |                   |
             v                   v                   v
    +--------------------------------------------------------+
    |           Feature Engineering Layer (NEW)                |
    |  - DayOfWeekFeature                                      |
    |  - WeatherSensitivityFeature                             |
    |  - SeasonalTrendFeature                                  |
    |  - RouteSegmentFeature                                   |
    |  - TimeOfDayFeature                                      |
    +---------------------------+------------------------------+
                                |
                                v
    +--------------------------------------------------------+
    |         Statistical Prediction Engine (NEW)              |
    |  - Bayesian estimator (per-user priors, updated with     |
    |    each new record)                                      |
    |  - Linear regression for feature coefficients            |
    |  - Confidence intervals from sample variance             |
    +---------------------------+------------------------------+
                                |
                                v
    +--------------------------------------------------------+
    |              Enhanced Prediction API                      |
    |  GET /behavior/predictions/:userId                       |
    |  (existing /optimal-departure enhanced internally)       |
    +--------------------------------------------------------+
```

### Technical Approach: Pure TypeScript Statistical Methods

We use three complementary techniques, all implemented in pure TypeScript:

#### 1. Segmented Weighted Averages (Day-of-Week)
Instead of one global average, maintain separate weighted averages per day-of-week. A user who leaves at 7:50 on Mondays but 8:10 on Fridays gets segmented predictions.

```typescript
// Conceptual -- not production code
type DaySegment = {
  dayOfWeek: number; // 0-6
  weightedAvgMinutes: number;
  sampleCount: number;
  variance: number;
};
```

#### 2. Linear Regression for Weather Sensitivity
For each user, fit a simple linear model: `departureAdjustment = beta_rain * isRaining + beta_temp * tempDeviation + beta_snow * isSnowing`. Coefficients are per-user, learned from their data.

```typescript
// Simple OLS (Ordinary Least Squares) in pure TypeScript
// Input: feature matrix X (weather conditions) and target Y (departure time deviation)
// Output: coefficient vector beta
```

#### 3. Bayesian Estimation for Confidence
Start with population priors (the current default patterns). As user data arrives, update the posterior. Confidence is derived from posterior variance -- more data = tighter distribution = higher confidence.

```
Prior: population average (08:00 +/- 15 min)
Posterior after 5 records: user's data narrows to (08:12 +/- 8 min)
Posterior after 20 records: tight estimate (08:14 +/- 3 min)
```

---

## User Flow

### Home Page -- Pattern Insights Card (NEW)
Visible on the home page between `DeparturePrediction` and `CommuteSection`.

```
+-----------------------------------------------+
| Flow 1: User with enough data (10+ records)   |
+-----------------------------------------------+
  HomePage
    |
    +-- [Pattern Insights Card] -- visible
    |     Shows: "Your pattern" summary
    |     CTA: "Details" -> /patterns
    |
    +-- Click "Details"
          |
          +-- /patterns page
                Tab 1: Overview (summary stats)
                Tab 2: Day Analysis (day-of-week chart)
                Tab 3: Weather Impact (personal coefficients)

+-----------------------------------------------+
| Flow 2: New user (< 5 records)                |
+-----------------------------------------------+
  HomePage
    |
    +-- [Pattern Insights Card] -- cold start state
          Shows: "Keep tracking to unlock insights"
          Progress: "3/5 records collected"
          No CTA link
```

### Detailed Analysis Page (`/patterns`)
New page accessible from the insights card and from the report page.

---

## Scope (MoSCoW)

### Must Have (~60% effort)

| ID | Item | Layer | Description |
|----|------|-------|-------------|
| M1 | Feature Engineering Service | BE | Extract features from CommuteRecord + CommuteSession: day-of-week, weather conditions, season, time-of-day |
| M2 | Day-of-Week Segmented Analysis | BE | Per-day weighted averages instead of global average |
| M3 | Per-User Weather Sensitivity | BE | Linear regression coefficients per user for weather impact |
| M4 | Enhanced Prediction Endpoint | BE | `GET /behavior/predictions/:userId` returning rich prediction with factors |
| M5 | Pattern Insights Card (Home) | FE | Summary card showing top insight + confidence |
| M6 | Cold Start Handling | BE | Graceful fallback with population priors when user data is sparse |
| M7 | Backward Compatibility | BE | Existing `/behavior/optimal-departure` continues to work (delegates to new engine internally) |

### Should Have

| ID | Item | Layer | Description |
|----|------|-------|-------------|
| S1 | Route Segment Analysis | BE | Use CheckpointRecord data to identify which segments are most variable |
| S2 | Detailed Analysis Page | FE | `/patterns` page with day-of-week chart, weather sensitivity, route segments |
| S3 | Seasonal Trend Detection | BE | Detect monthly/seasonal shifts (summer vs winter departure patterns) |
| S4 | Confidence Intervals | BE | Return prediction range (e.g., "08:05 to 08:15") not just point estimate |

### Could Have

| ID | Item | Layer | Description |
|----|------|-------|-------------|
| C1 | Pattern Anomaly Detection | BE | Flag when user's recent behavior deviates significantly from pattern |
| C2 | Weekly Pattern Email/Push | BE | "Your weekly commute insights" summary notification |
| C3 | Comparison with Population | FE | "You leave 5 min earlier than average on rainy days" |

### Won't (This Cycle)

| ID | Item | Reason |
|----|------|--------|
| W1 | Real-time ML model training | Overkill -- statistical methods are sufficient for this dataset size |
| W2 | External ML service (SageMaker, etc.) | Violates constraint -- pure TypeScript only |
| W3 | TensorFlow/scikit-learn integration | Explicitly excluded by project constraints |
| W4 | Social/group pattern analysis | Phase 4 scope (P4-1, P4-2) |
| W5 | Multi-route prediction comparison | Belongs to P3-5 (alternative routes) |
| W6 | New DB tables | Build on existing entities; use `UserPattern` value JSON for new pattern types |

---

## Riskiest Assumptions

| # | Category | Assumption | Risk Level | Test Method |
|---|----------|-----------|------------|-------------|
| 1 | **Feasibility** | Pure TypeScript linear regression is fast enough for real-time predictions | High | Benchmark: <50ms per prediction with 100 records |
| 2 | **Desirability** | Users notice and value more accurate predictions | Medium | Track prediction dismissal rate before/after |
| 3 | **Feasibility** | Existing CommuteSession data has enough weather/day variation to learn from | High | Query production data: count distinct (day, weather) combinations per user |
| 4 | **Usability** | Users understand "contributing factors" without confusion | Medium | Dogfood with 3 team members, check if explanation text is clear |
| 5 | **Viability** | Computation cost of per-user regression is acceptable on ECS Fargate | Low | Load test with 100 concurrent prediction requests |

---

## Data Requirements

### Minimum Data for Each Analysis Tier

| Tier | Records | Capabilities | Confidence |
|------|---------|-------------|------------|
| **Cold Start** | 0-4 | Population defaults only | 30% |
| **Basic** | 5-9 | Global weighted average (current behavior) | 50% |
| **Day-Aware** | 10-19 | Day-of-week segmentation (need 2+ per day) | 65-75% |
| **Weather-Aware** | 20-39 | Weather sensitivity coefficients (need varied weather records) | 75-85% |
| **Full Model** | 40+ | All features including seasonal trends | 85-95% |

### Cold Start Strategy

1. **Population priors**: Use hardcoded defaults as Bayesian priors (existing `DEFAULT_PATTERNS`).
2. **Progressive unlock**: As user accumulates data, each analysis tier unlocks automatically.
3. **Transparent communication**: The UI shows "3 more records needed for day-of-week insights."
4. **Feature gating**: Weather sensitivity only activates when user has records in 2+ distinct weather conditions.

### Required Data Access (Existing Repositories)

| Repository | Method Needed | Exists? |
|-----------|---------------|---------|
| `ICommuteRecordRepository` | `findByUserId(limit: 100)` | Yes |
| `ICommuteRecordRepository` | `findByUserIdAndType(type, limit)` | Yes |
| `ICommuteRecordRepository` | `findByUserIdInDateRange(start, end)` | Yes |
| `ICommuteSessionRepository` | `findByUserId(limit)` | Yes |
| `ICommuteSessionRepository` | `findByRouteId(routeId, limit)` | Yes |
| `IUserPatternRepository` | `findByUserIdTypeAndDay(...)` | Yes |
| `IUserPatternRepository` | `save(pattern)` | Yes |

**No new repository interfaces needed.** All data access uses existing repository methods.

---

## API Contract

### New Endpoint: `GET /behavior/predictions/:userId`

**Purpose**: Rich departure prediction with contributing factors, confidence intervals, and tier information.

**Auth**: JWT required. Users can only access their own predictions.

**Query Parameters**:
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `routeId` | string | No | Specific route to predict for. Defaults to preferred route. |
| `targetDate` | string (ISO) | No | Date to predict for. Defaults to today. |
| `weather` | string | No | Current weather condition (clear, rain, snow, etc.) |
| `temperature` | number | No | Current temperature in Celsius |
| `transitDelay` | number | No | Known transit delay in minutes |

**Response** (200 OK):
```typescript
interface PredictionResponse {
  prediction: {
    departureTime: string;       // "08:12" -- point estimate
    departureRange: {            // confidence interval
      early: string;             // "08:05"
      late: string;              // "08:19"
    };
    confidence: number;          // 0.0-1.0
    tier: 'cold_start' | 'basic' | 'day_aware' | 'weather_aware' | 'full';
  };
  factors: ContributingFactor[];  // what influenced this prediction
  insights: PatternInsight[];     // notable patterns discovered
  dataStatus: {
    totalRecords: number;
    recordsUsed: number;
    nextTierAt: number;          // records needed for next tier
    nextTierName: string;        // "day_aware"
  };
}

interface ContributingFactor {
  type: 'day_of_week' | 'weather' | 'season' | 'transit_delay' | 'base_pattern';
  label: string;                 // "월요일 패턴"
  impact: number;                // minutes adjustment (-10 = 10min earlier)
  description: string;           // "월요일에는 평균 7분 일찍 출발해요"
  confidence: number;            // how reliable this specific factor is
}

interface PatternInsight {
  type: 'day_variation' | 'weather_sensitivity' | 'improving_trend'
      | 'route_bottleneck' | 'seasonal_shift';
  title: string;                 // "금요일이 가장 여유로워요"
  description: string;           // "금요일 평균 출발: 08:22 (평일 평균보다 8분 늦음)"
  data?: Record<string, number>; // optional chart data
}
```

**Error Responses**:
- `403`: Accessing another user's predictions
- `404`: User not found

### Modified Endpoint: `GET /behavior/optimal-departure/:userId/:alertId`

**Change**: Internally delegates to the new prediction engine but maintains the same response shape for backward compatibility. The `confidence` field will now be more granular.

### New Endpoint: `GET /behavior/insights/:userId`

**Purpose**: Standalone insights without prediction context. Used by the detailed analysis page.

**Response** (200 OK):
```typescript
interface InsightsResponse {
  dayOfWeek: {
    segments: Array<{
      day: number;               // 0=Sun, 1=Mon, ..., 6=Sat
      dayName: string;           // "월요일"
      avgDepartureTime: string;  // "08:14"
      sampleCount: number;
      stdDevMinutes: number;
    }>;
    mostConsistentDay: number;
    mostVariableDay: number;
  };
  weatherImpact: {
    sensitivity: 'low' | 'medium' | 'high';
    coefficients: {
      rain: number;              // minutes adjustment
      snow: number;
      temperature: number;       // per degree deviation
    };
    description: string;         // "비 오는 날 평균 8분 일찍 출발"
  } | null;                      // null if insufficient weather data
  seasonal: {
    currentTrend: 'earlier' | 'later' | 'stable';
    trendMinutesPerMonth: number;
    description: string;
  } | null;
  routeSegments: Array<{
    checkpointName: string;
    avgDuration: number;
    variability: number;         // std dev
    isBottleneck: boolean;
  }> | null;                     // null if no session data
  overallStats: {
    totalRecords: number;
    trackingSince: string;       // ISO date
    avgDepartureTime: string;
    currentTier: string;
    predictionAccuracy: number;  // estimated % within 5 min
  };
}
```

---

## UI/UX

### Pattern Insights Card (Home Page)

Positioned after `DeparturePrediction` and before `CommuteSection` in `HomePage.tsx`.

#### State 1: Sufficient Data (10+ records)
```
+-------------------------------------------+
|  Pattern Insights                    >     |
|                                            |
|  +---------+  Today is Monday              |
|  |  MON    |  You usually leave at 08:12   |
|  |  08:12  |  +/- 4 min                    |
|  +---------+                               |
|                                            |
|  Contributing Factors                      |
|  [Rain -8min] [Monday +0min]              |
|                                            |
|  Confidence: ████████░░ 78%               |
|  "Based on 24 commute records"             |
+-------------------------------------------+
```

#### State 2: Cold Start (< 5 records)
```
+-------------------------------------------+
|  Pattern Insights                          |
|                                            |
|  ████░░░░░░  2/5 records                  |
|                                            |
|  Keep tracking your commute to unlock      |
|  personalized departure predictions!       |
|                                            |
|  3 more commutes needed                    |
+-------------------------------------------+
```

#### State 3: Learning (5-9 records)
```
+-------------------------------------------+
|  Pattern Insights                    >     |
|                                            |
|  Your average departure: 08:08             |
|  (based on 7 records)                      |
|                                            |
|  [Day-of-week insights unlock at 10]      |
|                                            |
|  Confidence: █████░░░░░ 50%               |
+-------------------------------------------+
```

### Detailed Analysis Page (`/patterns`)

#### Layout (375px viewport)
```
+-------------------------------------------+
|  <  Pattern Analysis                       |
+-------------------------------------------+
|                                            |
|  Overview                                  |
|  +---------------------------------------+ |
|  | Total Records: 24                      | |
|  | Tracking Since: Jan 5, 2026            | |
|  | Prediction Tier: Weather-Aware         | |
|  | Est. Accuracy: ~82%                    | |
|  +---------------------------------------+ |
|                                            |
|  [Overview] [By Day] [Weather]             |
|  ─────────  ──────── ────────              |
|                                            |
|  === "By Day" tab ===                      |
|                                            |
|  Departure Time by Day                     |
|  +---------------------------------------+ |
|  |  Mon  Tue  Wed  Thu  Fri              | |
|  |  |    |    |    |    |                | |
|  |  |    |    |    |    |                | |
|  |  ■    ■    ■    ■    ■    (bar chart) | |
|  | 08:12 08:10 08:08 08:10 08:22         | |
|  +---------------------------------------+ |
|                                            |
|  Most consistent: Wednesday (+/- 2 min)    |
|  Most variable: Friday (+/- 9 min)         |
|                                            |
|  === "Weather" tab ===                     |
|                                            |
|  Your Weather Sensitivity: Medium          |
|  +---------------------------------------+ |
|  | Rain:  -8 min (leave earlier)          | |
|  | Snow: -14 min (leave earlier)          | |
|  | Temp:  -1 min per 5C below 0           | |
|  +---------------------------------------+ |
|                                            |
|  vs. Population Average:                   |
|  Your rain impact is 2 min less than avg   |
|                                            |
+-------------------------------------------+
|  [Home] [Routes] [Mission] [Alert] [Set]   |
+-------------------------------------------+
```

---

## Success Metrics

### OKR

**Objective**: Make departure predictions feel personal and trustworthy.

| Key Result | Baseline | Target | Measurement |
|-----------|----------|--------|-------------|
| Prediction accuracy (within +/-5 min) for 10+ record users | Unknown (estimated ~40%) | 70% | Compare `prediction.departureTime` vs next `CommuteRecord.actualDeparture` |
| Pattern Insights card click-through rate | N/A (new) | 15%+ | Track CTA clicks / card impressions |
| Prediction confidence (avg for 10+ record users) | 0.70 (flat tier) | 0.78+ (data-driven) | Average `prediction.confidence` across API calls |

### North Star Connection
> "By building personalized statistical predictions, we expect daily active prediction usage to increase by 25% because users who see accurate, explained predictions will trust and rely on them."

### Leading Indicators
- Users with 10+ records who view predictions daily
- Average records per active user (growth = more data = better predictions)
- Pattern Insights card impression count

### Guardrails (Must NOT Regress)
- `/behavior/optimal-departure` response time stays under 200ms
- Existing test suite passes (837 BE + 394 FE)
- No new DB tables (use existing `UserPattern.value` JSON)
- Bundle size increase under 5KB gzip for frontend

---

## Acceptance Criteria

### Must Have

**AC-1: Day-of-week prediction**
```
Given a user with 12+ commute records spread across weekdays
When the prediction engine runs for a Monday
Then the prediction uses Monday-specific average departure time (not global average)
And the response includes a contributing factor with type "day_of_week"
```

**AC-2: Per-user weather sensitivity**
```
Given a user with 20+ commute records including 5+ rainy-day records
When the prediction engine runs with weather="rain"
Then the weather adjustment uses the user's personal rain coefficient (not hardcoded -10)
And the coefficient differs from the default by at least 1 minute
```

**AC-3: Cold start graceful fallback**
```
Given a new user with 0 commute records
When they call GET /behavior/predictions/:userId
Then the response returns tier="cold_start", confidence=0.30
And uses population default departure time
And dataStatus.nextTierAt=5, nextTierName="basic"
```

**AC-4: Backward compatibility**
```
Given the existing /behavior/optimal-departure/:userId/:alertId endpoint
When called with the same parameters as before
Then the response shape (DeparturePrediction) is unchanged
And the baseTime and recommendedTime fields are still present
```

**AC-5: Pattern Insights card (sufficient data)**
```
Given a logged-in user with 10+ commute records
When they view the home page
Then a Pattern Insights card appears below the departure prediction
And it shows their day-specific departure time
And it shows a confidence bar
And clicking ">" navigates to /patterns
```

**AC-6: Pattern Insights card (cold start)**
```
Given a logged-in user with 2 commute records
When they view the home page
Then a Pattern Insights card appears with a progress bar (2/5)
And it shows an encouraging message to keep tracking
And there is no link to /patterns
```

**AC-7: Contributing factors**
```
Given a prediction request for a rainy Monday
When the engine has enough data for day-of-week and weather analysis
Then the response includes at least 2 contributing factors
And each factor has type, label, impact (minutes), description, and confidence
```

### Should Have

**AC-8: Route segment bottleneck**
```
Given a user with 5+ completed CommuteSession records for a specific route
When they view /patterns
Then the route segments tab shows per-segment average duration and variability
And segments with stdDev > 3 minutes are marked as bottlenecks
```

**AC-9: Confidence intervals**
```
Given a prediction for a user with 15+ records
When the prediction response is returned
Then prediction.departureRange.early and .late are present
And the range narrows as confidence increases
```

---

## Technical Implementation

### No New DB Tables

All new pattern data is stored in existing `UserPattern` entities by extending the `PatternValue` union type:

```typescript
// Extend existing PatternType enum
export enum PatternType {
  DEPARTURE_TIME = 'departure_time',
  ROUTE_PREFERENCE = 'route_preference',
  NOTIFICATION_LEAD_TIME = 'notification_lead_time',
  // NEW
  DAY_OF_WEEK_DEPARTURE = 'day_of_week_departure',
  WEATHER_SENSITIVITY = 'weather_sensitivity',
  SEASONAL_TREND = 'seasonal_trend',
  ROUTE_SEGMENT_STATS = 'route_segment_stats',
}

// NEW value types stored as JSON in UserPattern.value
interface DayOfWeekDepartureValue {
  segments: Array<{
    dayOfWeek: number;
    avgMinutes: number;
    stdDevMinutes: number;
    sampleCount: number;
  }>;
  lastCalculated: string; // ISO date
}

interface WeatherSensitivityValue {
  rainCoefficient: number;
  snowCoefficient: number;
  temperatureCoefficient: number;
  sampleCountRain: number;
  sampleCountSnow: number;
  sampleCountClear: number;
  lastCalculated: string;
}

interface SeasonalTrendValue {
  monthlyAverages: Array<{ month: number; avgMinutes: number; sampleCount: number }>;
  trendDirection: 'earlier' | 'later' | 'stable';
  trendMinutesPerMonth: number;
  lastCalculated: string;
}

interface RouteSegmentStatsValue {
  routeId: string;
  segments: Array<{
    checkpointId: string;
    checkpointName: string;
    avgDuration: number;
    stdDevDuration: number;
    avgWaitTime: number;
    sampleCount: number;
  }>;
  lastCalculated: string;
}
```

### Statistical Utilities Module (NEW)

Pure TypeScript math utilities. No external dependencies.

```typescript
// backend/src/application/services/statistics/
//   linear-regression.ts  -- OLS implementation
//   bayesian-estimator.ts -- conjugate prior/posterior updates
//   descriptive-stats.ts  -- mean, stddev, weighted avg, percentiles
```

**Linear Regression (OLS)**:
- Input: feature matrix `X` (N x P), target vector `Y` (N x 1)
- Output: coefficient vector `beta` (P x 1), R-squared
- Implementation: Normal equation `beta = (X'X)^(-1) X'Y` with matrix inversion for small P (P <= 5)
- For P <= 5 features and N <= 100 records, this runs in <1ms

**Bayesian Estimator**:
- Normal-Normal conjugate model for departure time
- Prior: mu=480 (08:00), sigma=15 (from `DEFAULT_PATTERNS`)
- Update rule: posterior_mu = (prior_precision * prior_mu + data_precision * data_mean) / (prior_precision + data_precision)
- Confidence = 1 - (posterior_sigma / prior_sigma), clamped to [0.3, 0.95]

---

## Task Breakdown

### Cycle 1: Backend -- Statistical Engine + Feature Engineering (7-8 tasks)

| # | Task | Est | Depends | Parallelizable |
|---|------|-----|---------|----------------|
| BE-1 | Create `statistics/` module: `descriptive-stats.ts` with mean, weightedMean, stdDev, percentile, variance | 30min | -- | Yes |
| BE-2 | Create `statistics/linear-regression.ts` with OLS implementation + unit tests | 45min | -- | Yes |
| BE-3 | Create `statistics/bayesian-estimator.ts` with Normal-Normal conjugate update + unit tests | 45min | -- | Yes |
| BE-4 | Create `FeatureEngineeringService` that extracts features from CommuteRecord + CommuteSession | 45min | BE-1 | No |
| BE-5 | Extend `PatternType` enum + add new value interfaces (DayOfWeekDeparture, WeatherSensitivity, etc.) | 20min | -- | Yes |
| BE-6 | Create `EnhancedPatternAnalysisService` with day-of-week segmentation + weather sensitivity | 60min | BE-1, BE-2, BE-4, BE-5 | No |
| BE-7 | Create `PredictionEngineService` that combines all analyses into a single prediction | 45min | BE-3, BE-6 | No |
| BE-8 | Add `GET /behavior/predictions/:userId` endpoint + `GET /behavior/insights/:userId` endpoint | 30min | BE-7 | No |
| BE-9 | Update `PredictOptimalDepartureUseCase` to delegate to new engine (backward compat) | 20min | BE-7 | No |
| BE-10 | Integration tests for new prediction flow (cold start, basic, day-aware, weather-aware) | 45min | BE-8 | No |
| BE-11 | Performance benchmark: ensure <100ms per prediction with 100 records | 20min | BE-10 | No |

### Cycle 2: Frontend -- Pattern Insights Card + Analysis Page (6-7 tasks)

| # | Task | Est | Depends | Parallelizable |
|---|------|-----|---------|----------------|
| FE-1 | Add prediction + insights types to `behavior-api.client.ts` | 15min | BE-8 | No |
| FE-2 | Create React Query hooks: `usePrediction`, `usePatternInsights` | 20min | FE-1 | No |
| FE-3 | Create `PatternInsightsCard` component (3 states: cold start, learning, full) | 45min | FE-2 | No |
| FE-4 | Add `PatternInsightsCard` to `HomePage.tsx` between DeparturePrediction and CommuteSection | 15min | FE-3 | No |
| FE-5 | Create `/patterns` route + `PatternAnalysisPage` scaffold (3 tabs) | 30min | FE-2 | Yes (with FE-3) |
| FE-6 | Implement "By Day" tab with bar chart (CSS-only, no chart lib) | 40min | FE-5 | No |
| FE-7 | Implement "Weather" tab with sensitivity display | 30min | FE-5 | No |
| FE-8 | CSS styles for all new components (mobile-first, 375px) | 30min | FE-3, FE-5 | No |
| FE-9 | Unit tests for PatternInsightsCard (3 states) + PatternAnalysisPage | 40min | FE-6, FE-7 | No |

### Cycle 3 (If Needed): Route Segments + Polish

| # | Task | Est | Depends | Parallelizable |
|---|------|-----|---------|----------------|
| S-1 | BE: Route segment analysis using CheckpointRecord data | 45min | BE-6 | Yes |
| S-2 | BE: Seasonal trend detection from monthly aggregates | 30min | BE-6 | Yes |
| S-3 | FE: Route segments bottleneck display on /patterns | 30min | S-1, FE-5 | No |
| S-4 | FE: Confidence interval display in PatternInsightsCard | 20min | BE-7 | Yes |
| S-5 | Integration: Update DeparturePrediction.tsx to show richer factors | 20min | BE-9 | No |
| S-6 | E2E: Manual test of full flow (cold start -> 10+ records -> insights) | 30min | All | No |

---

## Non-Goals

1. **No real-time ML model training** -- Patterns update when new records are created (event-driven), not continuously.
2. **No external ML service** (SageMaker, Vertex AI, etc.) -- everything runs inside NestJS on ECS Fargate.
3. **No heavy ML libraries** (TensorFlow, scikit-learn, brain.js) -- pure TypeScript statistical implementations only.
4. **No new database tables** -- all new pattern types stored as JSON values in existing `UserPattern` entity.
5. **No multi-user/social analysis** -- this is individual pattern analysis only. Population data is used only as Bayesian priors.
6. **No real-time streaming predictions** -- predictions are computed on-demand per API request, cached in `UserPattern` records.
7. **No chart libraries** (Chart.js, D3, Recharts) -- CSS-only bar charts for the day-of-week visualization. Keep bundle under 5KB increase.

---

## Decision Log

| Date | Decision | Alternatives Considered | Rationale |
|------|----------|------------------------|-----------|
| 2026-03-02 | Use OLS linear regression for weather coefficients | Gradient descent, Ridge regression | OLS with normal equation is exact for small P, requires no iterations, <1ms for P<=5 |
| 2026-03-02 | Store new patterns as extended `PatternType` in existing `UserPattern` | New `prediction_model` table | No schema migration needed; JSON values are flexible; existing repository works |
| 2026-03-02 | Bayesian Normal-Normal conjugate for confidence | Heuristic tiers (current), Bootstrap | Conjugate model gives closed-form posterior; naturally expresses "more data = more confident"; graceful cold start |
| 2026-03-02 | CSS-only bar charts | Chart.js, Recharts, D3 | Bundle size constraint (<5KB increase); day-of-week chart only needs 5-7 bars; CSS is sufficient |
| 2026-03-02 | Compute predictions on-demand, cache in UserPattern | Real-time recomputation, separate cache table | Patterns change slowly (per new record); caching in UserPattern avoids cache invalidation complexity |
| 2026-03-02 | 2-3 cycle split (BE engine -> FE UI -> polish) | Single large cycle | Statistical engine needs solid unit tests before UI depends on it; natural BE/FE parallelism in cycle 2-3 |

---

## Appendix: Statistical Method Details

### OLS Linear Regression (Pure TypeScript)

For weather sensitivity with P=3 features (rain, snow, temperature):

```
Y = departure_deviation (minutes from user's average)
X = [isRaining, isSnowing, tempDeviation]

beta = (X^T * X)^(-1) * X^T * Y
```

Matrix inversion for 3x3 is trivial. We implement Cramer's rule or cofactor expansion.

**Minimum data**: 2*P = 6 records with varied weather. If insufficient, fall back to population defaults.

### Bayesian Normal-Normal Conjugate

```
Prior:      mu ~ N(mu_0, sigma_0^2)      -- population average
Likelihood: x_i ~ N(mu, sigma^2)         -- observed departures
Posterior:  mu | data ~ N(mu_n, sigma_n^2)

mu_n = (mu_0/sigma_0^2 + sum(x_i)/sigma^2) / (1/sigma_0^2 + n/sigma^2)
sigma_n^2 = 1 / (1/sigma_0^2 + n/sigma^2)
```

This gives us:
- **Point estimate**: `mu_n` (posterior mean)
- **Confidence interval**: `mu_n +/- 1.96 * sigma_n` (95% CI)
- **Confidence score**: `1 - sigma_n / sigma_0` (how much uncertainty reduced)

### Weighted Moving Average (Enhanced)

Current implementation uses flat exponential decay (0.9^i). Enhancement:
- Apply day-of-week grouping before averaging.
- Weight by recency AND by day-match (same day-of-week gets 2x weight).

---

*Spec authored: 2026-03-02 | Author: PM Agent | Status: Ready for Development*
