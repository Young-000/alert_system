# P4-3: Social Features -- Same Route Community (Anonymous Route Neighbors)

## Executive Summary

Users commute alone. Even when thousands of people share the same subway-to-bus transfer every morning, each person's experience is isolated. P4-3 introduces an anonymous, route-based micro-community -- "route neighbors" -- where users who share 2+ common checkpoints can see aggregated stats (neighbor count, average times) and exchange short, anonymous tips about specific checkpoints (e.g., "exit 4 is faster at this station"). This is NOT a social network: no profiles, no DMs, no identifiable information. It is a thin layer of community intelligence on top of existing commute data. The feature is optional (Phase 4 backlog, marked "선택") so scope is intentionally lean: 2 new DB tables, 1 new NestJS module, 1 new frontend section on the commute dashboard, and a tips list per checkpoint.

Expected impact: 15%+ increase in tips-per-checkpoint data density within 4 weeks, creating a positive feedback loop where better tips attract more tracking, and more tracking generates better tips.

---

## Discovery Context

### Desired Outcome (Measurable)
Create route-level community intelligence that gives users a reason to both contribute and return. Target: 15%+ of active users (3+ sessions/week) read at least 1 tip per week within 4 weeks of launch.

### Opportunity Solution Tree
```
Outcome: Users get value from other commuters' experience on their route
  |
  +-- Opportunity A: Users don't know how many others share their route
  |     +-- Solution: Show "N neighbors" count on commute dashboard [SELECTED]
  |     +-- Solution: (rejected) Show actual user profiles -- privacy violation
  |
  +-- Opportunity B: Users discover local tips by trial and error
  |     +-- Solution: Anonymous tip system per checkpoint (100 char max) [SELECTED]
  |     +-- Solution: (rejected) Chat/forum per route -- too heavy, moderation nightmare
  |
  +-- Opportunity C: Users want to know if their route is fast vs neighbors
  |     +-- Solution: Show "your avg vs neighbor avg" comparison [SELECTED]
  |     +-- Solution: (rejected) Full leaderboard -- privacy risk, negative pressure
  |
  +-- Opportunity D: Tips can be low-quality or inappropriate
  |     +-- Solution: Rate limit (3/day) + report button + simple flag moderation [SELECTED]
  |     +-- Solution: (rejected) Full content moderation pipeline -- overkill for 100-char tips
```

### Evidence
- `commute_routes` + `route_checkpoints` tables already store user routes with named checkpoints, station IDs, and line info -- sufficient for route similarity matching.
- `commute_sessions` table has `totalDurationMinutes` -- can compute neighbor average commute times.
- P4-1 (congestion) and P4-2 (regional insights) already aggregate cross-user data, so the privacy model and aggregation patterns exist.
- No competitor in Korean commute apps offers route-specific anonymous tips. Closest analogue: Waze's road-specific hazard reports.

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|-----------------|
| Full social network (profiles, follows, DMs) | Massive scope, privacy risk, moderation burden; opposite of "lean optional feature" |
| Route-level chat rooms | Real-time moderation impossible at this team size; tips are async and manageable |
| AI-generated tips from session data | Interesting but requires ML pipeline; manual tips are simpler and more trustworthy |
| Integration with external community (Naver Cafe, etc.) | Breaks in-app experience; can't match to specific checkpoints |

---

## Impact Map

```
Goal: 15%+ of active users read 1+ tip/week within 4 weeks
  |
  +-- Actor: Daily commuter (3+ sessions/week)
  |     |
  |     +-- Impact: Sees they are not commuting alone (neighbor count)
  |     |     +-- Deliverable: GET /community/neighbors (BE)
  |     |     +-- Deliverable: Neighbor summary card on /commute dashboard (FE)
  |     |
  |     +-- Impact: Reads tips that save time at specific checkpoints
  |     |     +-- Deliverable: GET /community/tips?checkpointId=xxx (BE)
  |     |     +-- Deliverable: Tips list per checkpoint on commute detail (FE)
  |     |
  |     +-- Impact: Contributes tips from their own experience
  |     |     +-- Deliverable: POST /community/tips (BE, rate-limited)
  |     |     +-- Deliverable: Tip submission form (FE, 100 char max)
  |     |
  |     +-- Impact: Reports inappropriate content
  |           +-- Deliverable: POST /community/tips/:id/report (BE)
  |           +-- Deliverable: Report button on each tip card (FE)
  |
  +-- Actor: New user (< 3 sessions)
  |     |
  |     +-- Impact: Sees neighbor count and tips even before building history
  |           +-- Deliverable: Tips are read-only accessible without minimum sessions
  |           +-- Deliverable: Tip writing requires 3+ completed sessions (anti-spam)
  |
  +-- Actor: System (automated)
        |
        +-- Impact: Maintains neighbor relationships and tip quality
              +-- Deliverable: Neighbor detection query (on-demand, cached)
              +-- Deliverable: Auto-hide tips with 3+ reports
```

---

## JTBD (Jobs-to-be-Done)

**Primary Job:**
> When I'm commuting on my usual route and arrive at a checkpoint, I want to see tips from other commuters who use the same stations, so I can discover faster exits, less crowded cars, or timing tricks I didn't know about.

**Secondary Job:**
> When I discover a useful shortcut or tip at a checkpoint, I want to share it anonymously with others on the same route, so I can help fellow commuters without revealing who I am.

**Tertiary Job:**
> When I look at my commute dashboard, I want to know how many others share a similar route and how my time compares to theirs, so I can feel connected and benchmark my performance.

**Forces of Progress:**
| Force | Description |
|-------|-------------|
| **Push (pain)** | "I've been taking exit 2 for months but maybe exit 4 is faster -- I have no way to know without trying" |
| **Pull (attraction)** | "23 other people commute like me and their avg is 42min -- mine is 38min, nice!" |
| **Anxiety** | "Will my commute data be visible to others?" -- mitigated by strict anonymity (no user IDs exposed, aggregated stats only) |
| **Inertia** | "I already know my route well enough" -- overcome by showing specific tips users hadn't considered |

---

## Problem Statement

### Who
All users with saved commute routes that have 2+ checkpoints. Tip contribution requires 3+ completed sessions (to prevent spam from new/bot accounts).

### Pain (Frequency x Severity)
- **Frequency**: Daily (every commute is an opportunity to discover or share a tip)
- **Severity**: Low -- this is a "nice to have" enrichment, not a core pain point. But it creates stickiness and community value that compounds over time.

### Current Workaround
Users ask coworkers, search Naver/community forums, or discover tips by accident through trial and error. None of these are checkpoint-specific or integrated into their commute flow.

### Why Now
- P4-1 (congestion) and P4-2 (regional insights) established cross-user data aggregation patterns.
- Route/checkpoint data model is mature and stable.
- This is the final Phase 4 item; building on all prior infrastructure.

---

## Solution

### Overview

Two concepts:

1. **Route Neighbors**: Users whose routes share 2+ common checkpoints (matched by `checkpoint_type` + `linked_station_id` or `linked_bus_stop_id` or normalized `name`). Neighbor relationships are computed on-demand and cached. Users see: neighbor count and average commute duration comparison.

2. **Checkpoint Tips**: Short anonymous text notes (max 100 characters) attached to a specific checkpoint identifier. Any user with 3+ completed sessions on a route containing that checkpoint can write a tip. Tips are visible to all users whose routes include that checkpoint. Rate limit: 3 tips per user per day. Tips with 3+ reports are auto-hidden.

### Route Similarity Detection

Two checkpoints are "similar" if they match on ANY of:
- Same `linked_station_id` (both reference the same subway station)
- Same `linked_bus_stop_id` (both reference the same bus stop)
- Same normalized `name` + `checkpoint_type` (fallback for custom checkpoints without linked IDs)

Two users are "neighbors" if their routes share 2+ similar checkpoints.

**Checkpoint normalization key** (for matching):
```
station:{linked_station_id}       -- if subway station linked
bus:{linked_bus_stop_id}           -- if bus stop linked
name:{normalize(name)}:{type}     -- fallback (lowercase, trim, remove spaces)
```

This key is stored in a new `checkpoint_key` column on `route_checkpoints` (computed on route save), enabling efficient JOIN-based neighbor detection.

### User Flow

**Reading neighbor stats (commute dashboard):**
1. User opens `/commute` dashboard
2. Below existing route info, a new "이웃" (Neighbors) card appears
3. Card shows: "이 경로의 이웃 N명 | 평균 소요시간 MM분" (N neighbors | Avg MM min)
4. If user has enough sessions: "내 평균 XX분 (이웃 평균 대비 +/-YY분)"
5. If fewer than 3 neighbors exist: card shows "아직 이웃 데이터가 부족해요" (Not enough neighbor data yet)

**Reading tips (per checkpoint):**
1. User taps a checkpoint in their route detail view
2. Below checkpoint info, tips section shows (newest first, max 20)
3. Each tip: text + relative time ("2시간 전") + report button (flag icon)
4. Empty state: "아직 팁이 없어요. 첫 번째 팁을 남겨보세요!" (No tips yet)

**Writing a tip:**
1. At the bottom of the tips list, a text input with placeholder "이 구간 팁을 남겨보세요 (100자)"
2. Character counter shows remaining chars
3. Submit button (disabled when empty or over limit)
4. On submit: POST /community/tips -> success toast "팁이 등록되었어요!"
5. Rate limit hit: toast "오늘은 팁을 3개까지 남길 수 있어요" (Max 3 tips per day)

**Reporting a tip:**
1. User taps flag icon on a tip
2. Confirm modal: "이 팁을 신고하시겠어요?" (Report this tip?)
3. On confirm: POST /community/tips/:id/report -> toast "신고되었습니다"
4. User can report each tip only once

### Error & Edge Cases

| Case | Handling |
|------|----------|
| User has no saved routes | Neighbor section hidden entirely |
| Route has < 2 checkpoints | Neighbor section hidden (minimum for matching) |
| Fewer than 3 neighbors | Show card with "데이터 부족" message instead of stats |
| User not logged in | Tips are read-only; write/report requires login |
| User has < 3 completed sessions | Tips are read-only; write button shows "3회 이상 출퇴근 기록 후 팁을 남길 수 있어요" |
| Tip exceeds 100 chars | Client-side validation prevents submit; server rejects with 400 |
| Rate limit exceeded (3/day) | Server returns 429; client shows friendly message |
| Tip has 3+ reports | Auto-hidden from all users (soft delete: `is_hidden = true`) |
| Network error on tip submit | Error toast with retry option |
| Checkpoint has 100+ tips | Paginate (20 per page), newest first |

### Scope (MoSCoW)

**Must Have (~60% effort):**
- Route neighbor detection (checkpoint_key computation + neighbor query)
- Neighbor count + avg time display on commute dashboard
- Personal vs neighbor avg comparison
- Tips CRUD (create, read per checkpoint)
- Rate limiting (3/day per user)
- Report tip functionality
- Auto-hide at 3+ reports

**Should Have:**
- Tips pagination (20 per page)
- "Helpful" count on tips (simple upvote, no downvote)
- Tip sorting (newest / most helpful)

**Could Have:**
- Push notification: "새로운 팁이 등록되었어요" when a tip is added to a checkpoint on your route
- Neighbor count trend over time
- "Top tips" section showing most helpful tips across all user's checkpoints

**Won't Have (this cycle):**
- User profiles or any form of user identification to neighbors
- Direct messaging between neighbors
- Real-time chat
- Tip categories/tags
- Admin moderation panel (rely on auto-hide for MVP)
- Tip editing after submission
- Photo/image tips

---

## Riskiest Assumptions

| # | Category | Assumption | Risk | Test Method |
|---|----------|-----------|------|-------------|
| 1 | **Desirability** | Users want to see neighbor stats on their commute dashboard | High | Monitor click-through rate on neighbor card; target >30% of dashboard viewers |
| 2 | **Desirability** | Users will contribute tips without incentive | High | Track tip creation rate; target 10%+ of eligible users write 1+ tip in first month |
| 3 | **Usability** | 100-char limit is sufficient for useful tips | Medium | Monitor avg tip length; if most tips hit 100 chars, limit may be too low |
| 4 | **Feasibility** | Checkpoint-key matching produces meaningful neighbor groups (not too broad, not too narrow) | Medium | Validate with existing data: avg neighbor count per user should be 5-50 |
| 5 | **Viability** | Tip quality stays acceptable with simple report-based moderation | Medium | Monitor report rate; if >10% of tips get reported, need stronger moderation |

---

## Success Metrics

### OKR Connection
**Objective**: Build community intelligence layer on commute data.
**Key Results**:
- KR1: 15%+ of active users (3+ sessions/week) read 1+ tip per week within 4 weeks
- KR2: 10%+ of eligible users (3+ completed sessions) write 1+ tip within 4 weeks
- KR3: Average neighbor group size is 5-50 users (validated within 2 weeks)

### North Star Connection
> "By building anonymous route communities, we expect weekly active retention to increase by 10% because users gain a new reason to return (checking tips and neighbor stats)."

### Metrics Table

| Type | Metric | Baseline | Target | Measurement |
|------|--------|----------|--------|-------------|
| **Primary** | % active users reading 1+ tip/week | 0% (new feature) | 15% | `community_tip_view` event / weekly active users |
| **Primary** | Tip contribution rate (writers / eligible users) | 0% | 10% | `community_tip_create` event / users with 3+ sessions |
| **Leading** | Neighbor card view rate (views / dashboard loads) | 0% | 50% | `community_neighbor_view` event |
| **Leading** | Tips section open rate (opens / checkpoint detail views) | 0% | 30% | `community_tips_section_open` event |
| **Guardrail** | Dashboard load time | < 500ms | < 600ms | p95 latency must not regress by >100ms |
| **Guardrail** | Tip report rate | 0% | < 10% | reported tips / total tips |
| **Guardrail** | Existing commute tracking usage | current baseline | no regression | sessions/week per active user |

---

## Acceptance Criteria

### AC1: Neighbor Detection
```
Given a user with a saved route containing checkpoints at "강남역 2호선" and "삼성역 2호선"
When another user has a route containing the same two stations (matched by linked_station_id)
Then both users are counted as neighbors of each other
```

### AC2: Neighbor Stats Display
```
Given a user on the commute dashboard with 5+ neighbors
When the dashboard loads
Then a neighbor card shows "이웃 N명 | 평균 MM분" with accurate aggregated data
```

### AC3: Personal Comparison
```
Given a user with 5+ completed sessions and 5+ neighbors
When the neighbor card renders
Then it shows "내 평균 XX분 (이웃 평균 대비 +/-YY분)"
```

### AC4: Insufficient Data
```
Given a user whose route has fewer than 3 neighbors
When the dashboard loads
Then the neighbor card shows "아직 이웃 데이터가 부족해요" instead of stats
```

### AC5: Tip Creation
```
Given a logged-in user with 3+ completed sessions
When they submit a tip (1-100 chars) for a checkpoint on their route
Then the tip is saved and appears in the tips list for that checkpoint
```

### AC6: Tip Rate Limiting
```
Given a user who has already submitted 3 tips today
When they attempt to submit a 4th tip
Then the server returns 429 and the client shows "오늘은 팁을 3개까지 남길 수 있어요"
```

### AC7: Tip Reporting
```
Given a user viewing a tip
When they tap the report button and confirm
Then the tip's report count increments by 1
And the user cannot report the same tip again
```

### AC8: Auto-Hide on Reports
```
Given a tip with 2 existing reports
When a 3rd user reports the tip
Then the tip's is_hidden is set to true
And the tip no longer appears in any user's tips list
```

### AC9: Read-Only for Ineligible Users
```
Given a user with fewer than 3 completed sessions
When they view tips for a checkpoint
Then tips are visible but the submission form shows a disabled state with "3회 이상 출퇴근 후 팁 작성 가능"
```

### AC10: Privacy Guarantee
```
Given any API response from /community/* endpoints
When inspected
Then no user IDs, names, emails, or any personally identifiable information is present
(only aggregated counts, averages, and anonymous tip text with timestamps)
```

---

## Database Schema

### New Tables

```sql
-- 1. Community Tips: anonymous tips per checkpoint
CREATE TABLE alert_system.community_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkpoint_key VARCHAR(200) NOT NULL,   -- normalized key (e.g., "station:uuid" or "name:강남역:subway")
  author_id UUID NOT NULL REFERENCES alert_system.users(id) ON DELETE CASCADE,
  content VARCHAR(100) NOT NULL,
  report_count INTEGER NOT NULL DEFAULT 0,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX community_tips_checkpoint_key_idx
  ON alert_system.community_tips (checkpoint_key, is_hidden, created_at DESC);
CREATE INDEX community_tips_author_daily_idx
  ON alert_system.community_tips (author_id, created_at);

-- 2. Tip Reports: track who reported what (prevent duplicates)
CREATE TABLE alert_system.community_tip_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tip_id UUID NOT NULL REFERENCES alert_system.community_tips(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES alert_system.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT community_tip_reports_unique UNIQUE (tip_id, reporter_id)
);
```

### Modified Tables

```sql
-- Add checkpoint_key to route_checkpoints for efficient neighbor matching
ALTER TABLE alert_system.route_checkpoints
  ADD COLUMN checkpoint_key VARCHAR(200);

-- Backfill existing data
UPDATE alert_system.route_checkpoints
SET checkpoint_key = CASE
  WHEN linked_station_id IS NOT NULL THEN 'station:' || linked_station_id::text
  WHEN linked_bus_stop_id IS NOT NULL THEN 'bus:' || linked_bus_stop_id
  ELSE 'name:' || lower(trim(name)) || ':' || checkpoint_type
END;

-- Index for neighbor detection JOIN
CREATE INDEX route_checkpoints_checkpoint_key_idx
  ON alert_system.route_checkpoints (checkpoint_key);
```

### Neighbor Query (Core Logic)

```sql
-- Find neighbors for a given user's route (routes sharing 2+ checkpoint_keys)
WITH my_keys AS (
  SELECT DISTINCT rc.checkpoint_key
  FROM alert_system.route_checkpoints rc
  JOIN alert_system.commute_routes cr ON cr.id = rc.route_id
  WHERE cr.user_id = :userId
    AND rc.checkpoint_key IS NOT NULL
),
neighbor_routes AS (
  SELECT cr.user_id, COUNT(DISTINCT rc.checkpoint_key) AS shared_count
  FROM alert_system.route_checkpoints rc
  JOIN alert_system.commute_routes cr ON cr.id = rc.route_id
  JOIN my_keys mk ON mk.checkpoint_key = rc.checkpoint_key
  WHERE cr.user_id != :userId
  GROUP BY cr.user_id
  HAVING COUNT(DISTINCT rc.checkpoint_key) >= 2
)
SELECT
  COUNT(DISTINCT user_id) AS neighbor_count,
  AVG(cs.total_duration_minutes) AS avg_duration
FROM neighbor_routes nr
JOIN alert_system.commute_sessions cs ON cs.user_id = nr.user_id
WHERE cs.status = 'completed'
  AND cs.completed_at > now() - INTERVAL '30 days';
```

---

## API Design

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/community/neighbors` | Required | Neighbor count + avg time for current user's preferred route |
| GET | `/community/neighbors?routeId=xxx` | Required | Neighbor stats for a specific route |
| GET | `/community/tips?checkpointKey=xxx` | Optional | Tips for a checkpoint (paginated) |
| POST | `/community/tips` | Required | Create a tip (rate-limited) |
| POST | `/community/tips/:id/report` | Required | Report a tip |

### Request/Response Examples

**GET /community/neighbors**
```json
{
  "routeId": "uuid",
  "neighborCount": 23,
  "avgDurationMinutes": 42,
  "myAvgDurationMinutes": 38,
  "diffMinutes": -4,
  "dataStatus": "sufficient"
}
```
When insufficient data:
```json
{
  "routeId": "uuid",
  "neighborCount": 2,
  "avgDurationMinutes": null,
  "myAvgDurationMinutes": null,
  "diffMinutes": null,
  "dataStatus": "insufficient"
}
```

**GET /community/tips?checkpointKey=station:uuid&page=1&limit=20**
```json
{
  "tips": [
    {
      "id": "uuid",
      "content": "4번 출구가 에스컬레이터 있어서 빨라요",
      "createdAt": "2026-03-01T08:30:00Z",
      "isReportedByMe": false
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 20,
  "hasNext": true
}
```
Note: `author_id` is NEVER included in responses.

**POST /community/tips**
Request:
```json
{
  "checkpointKey": "station:uuid",
  "content": "4번 출구가 에스컬레이터 있어서 빨라요"
}
```
Response (201):
```json
{
  "id": "uuid",
  "content": "4번 출구가 에스컬레이터 있어서 빨라요",
  "createdAt": "2026-03-02T08:30:00Z"
}
```

**POST /community/tips/:id/report**
Response (200):
```json
{
  "message": "신고되었습니다"
}
```
Duplicate report (409):
```json
{
  "message": "이미 신고한 팁입니다"
}
```

---

## Task Breakdown

Tasks are ordered top-to-bottom with dependencies noted. Each task is estimated at <1 hour unless marked otherwise.

### Backend (BE)

| # | Task | Est. | Depends On | Parallelizable |
|---|------|------|------------|----------------|
| BE-1 | Create `CommunityTipEntity` and `CommunityTipReportEntity` TypeORM entities | 30m | -- | Yes |
| BE-2 | Add `checkpoint_key` column to `RouteCheckpointEntity` + migration | 20m | -- | Yes (with BE-1) |
| BE-3 | Write checkpoint-key computation logic (service method) + backfill existing data | 30m | BE-2 | No |
| BE-4 | Hook checkpoint-key computation into route creation/update flow | 20m | BE-3 | No |
| BE-5 | Create `CommunityModule` (module, controller, service structure) | 20m | -- | Yes (with BE-1) |
| BE-6 | Implement `GET /community/neighbors` -- neighbor detection query + caching | 45m | BE-3, BE-5 | No |
| BE-7 | Write tests for neighbor detection (unit + integration) | 30m | BE-6 | No |
| BE-8 | Implement `GET /community/tips` -- paginated tips query | 30m | BE-1, BE-5 | Yes (with BE-6) |
| BE-9 | Implement `POST /community/tips` -- create tip with validation + rate limit | 30m | BE-1, BE-5 | Yes (with BE-6) |
| BE-10 | Implement `POST /community/tips/:id/report` -- report + auto-hide logic | 30m | BE-1, BE-5 | Yes (with BE-9) |
| BE-11 | Write tests for tips CRUD + rate limiting + reporting | 45m | BE-8, BE-9, BE-10 | No |
| BE-12 | Add `community` module to `AppModule` imports | 10m | BE-5 | No |

### Frontend (FE)

| # | Task | Est. | Depends On | Parallelizable |
|---|------|------|------------|----------------|
| FE-1 | Create `CommunityApiClient` class (all 4 endpoints) | 30m | BE API contract | Yes |
| FE-2 | Create React Query hooks: `useNeighborStats`, `useTips`, `useCreateTip`, `useReportTip` | 30m | FE-1 | No |
| FE-3 | Build `NeighborCard` component (count + avg + comparison) | 30m | FE-2 | Yes (with FE-4) |
| FE-4 | Build `TipsList` component (tip cards + pagination) | 30m | FE-2 | Yes (with FE-3) |
| FE-5 | Build `TipForm` component (input + char counter + submit) | 30m | FE-2 | Yes (with FE-3) |
| FE-6 | Build `TipCard` component (content + time + report button) | 20m | -- | Yes |
| FE-7 | Integrate `NeighborCard` into commute dashboard page | 20m | FE-3 | No |
| FE-8 | Integrate tips section (TipsList + TipForm) into checkpoint detail view | 20m | FE-4, FE-5 | No |
| FE-9 | Write tests for NeighborCard, TipsList, TipForm, TipCard | 45m | FE-3 to FE-6 | No |
| FE-10 | Add mock API client entries for community endpoints | 20m | FE-1 | Yes |

### Total Estimate
- Backend: ~5.5 hours
- Frontend: ~4.5 hours
- **Total: ~10 hours (2 dev-days)**

---

## Technical Notes

### Caching Strategy
- Neighbor stats are cached per `routeId` for 1 hour (TTL). Invalidated when any route in the system is created/updated/deleted.
- Tips are not cached (simple DB query, low volume expected).

### Privacy Implementation
- `CommunityController` endpoints NEVER return `author_id` or any user-identifying field.
- The `author_id` column exists only for rate-limiting enforcement and is stripped before response serialization.
- Neighbor stats only show aggregated count and averages -- no individual user data.
- `GET /community/tips` includes `isReportedByMe` (boolean) derived from the requesting user's ID, but no other user references.

### Rate Limiting
- 3 tips per user per day, enforced at the service level by counting `community_tips` where `author_id = currentUser AND created_at >= start of today (KST)`.
- Uses `timezone.localdate()` equivalent (KST) to avoid midnight boundary issues.

### Moderation
- Tips with `report_count >= 3` are set to `is_hidden = true` automatically.
- Hidden tips are excluded from all GET queries.
- No admin UI for MVP -- if needed, direct DB queries suffice.
- Future: add admin panel in a later cycle if tip volume warrants it.

### checkpoint_key Format
```
station:{linked_station_id}                    -- subway station match
bus:{linked_bus_stop_id}                       -- bus stop match
name:{lowercase_trimmed_name}:{checkpoint_type} -- fallback for custom checkpoints
```
Computed on route save (create/update) and stored in `route_checkpoints.checkpoint_key`.

---

## Decision Log

| Date | Decision | Alternatives | Rationale |
|------|----------|-------------|-----------|
| 2026-03-02 | Anonymous-only community (no profiles, no DMs) | Social network features | Privacy-first design; lean scope for optional feature; moderation burden |
| 2026-03-02 | 2+ shared checkpoints = neighbor | 1 checkpoint / 3+ checkpoints | 1 is too loose (everyone at Gangnam station); 3+ is too strict (few matches). 2 balances signal and reach. |
| 2026-03-02 | 100-char tip limit | 280 chars (tweet-like) / unlimited | Tips should be quick, scannable, one-liner advice. 100 chars forces brevity. |
| 2026-03-02 | Rate limit 3 tips/day | No limit / 1/day / 5/day | 3 allows meaningful contribution without spam; low enough to not need complex anti-abuse |
| 2026-03-02 | Auto-hide at 3 reports (no admin review) | Manual moderation / 5 reports / ML classifier | Simple and sufficient for MVP volume; manual review can be added later if needed |
| 2026-03-02 | `checkpoint_key` stored on route_checkpoints | Compute on-the-fly in queries | Pre-computed key enables efficient indexed JOINs; small storage cost, big query benefit |
| 2026-03-02 | Tip creation requires 3+ completed sessions | No minimum / 1 session / 5 sessions | Prevents drive-by spam from new accounts while keeping barrier low for real commuters |
| 2026-03-02 | No "helpful" upvote in Must-Have | Include upvote in MVP | Upvote adds complexity (new table, new UI); defer to Should-Have to keep scope lean |
