# P2-2: 스마트 출발 알림 (Smart Departure Alert)

> Spec v1.0 | 2026-02-19 | Cycle 33 | Branch: `feature/smart-departure`

---

## JTBD

When **매일 출근 준비를 하면서 "지금 나가면 제시간에 도착할 수 있나?"를 머릿속으로 계산할 때**,
I want to **실시간 교통 상황과 내 준비 시간을 반영한 최적 출발 시각을 자동으로 알려주기를**,
so I can **지각 걱정 없이 여유 있게 준비하고, 정시에 도착하는 출퇴근 루틴을 유지할 수 있다**.

---

## Problem

- **Who:** 매일 대중교통으로 출퇴근하는 수도권 직장인. 이미 경로(P1-4)와 장소(P2-1)를 등록하고 자동 출퇴근 감지를 사용 중인 사용자.
- **Pain:** 매일 아침 "몇 시에 나가야 하지?"를 날씨앱, 교통앱, 시계를 번갈아 보며 머릿속으로 계산한다. 교통 상황이 평소와 다르면(사고, 지연, 폭우) 예상이 틀려서 지각하거나, 불안감에 지나치게 일찍 출발한다. (빈도: 매일 2회 x 심각도: 높음 = 매우 높음)
- **Current workaround:** 고정 시간 알람(매일 07:00)에 의존. 교통 상황 변동을 반영하지 못함. 여유 시간을 과하게 잡거나(15분 일찍 도착) 부족하게 잡는다(5분 지각).
- **Success metric:**
  - 스마트 출발 알림 설정 완료율 > 70% (장소 등록 완료 사용자 기준)
  - 알림 후 10분 이내 실제 출발률 > 60%
  - 도착 시각 오차 +/-5분 이내 비율 > 80% (2주 사용 후)
  - 고정 알람 대비 "제시간 도착" 비율 20% 개선

---

## Solution

### Overview

사용자가 설정한 **도착 희망 시각**, **준비 시간**, **경로 정보**를 기반으로 최적 출발 시각을 자동 계산한다.
계산 공식:

```
최적 출발 시각 = 도착 희망 시각 - 예상 소요시간(실시간 교통 반영) - 준비시간
```

**예상 소요시간**은 3가지 소스를 가중 결합하여 산출한다:
1. **경로 설정 시 입력한 예상 시간** (baseline, 가중치 20%)
2. **최근 출퇴근 히스토리 평균** (commute_sessions 기반, 가중치 50%)
3. **실시간 교통 보정** (지하철 지연, 버스 지연 정보, 가중치 30%)

**왜 서버 기반 계산인가?**
- EventBridge Scheduler로 정확한 시각에 푸시 알림을 보낼 수 있다 (기존 인프라 재사용).
- 실시간 교통 API는 서버에서 호출이 효율적이다 (API 키 관리, 요청 집약).
- 클라이언트 의존 시 앱 종료/백그라운드 상태에서 동작하지 않는 위험이 있다.

**교통 상황 동적 재계산:**
- 출발 60분 전부터 5분 간격으로 소요시간을 재계산한다.
- 소요시간이 5분 이상 변동되면 출발 시각을 업데이트하고, 변동 사실을 푸시 알림으로 통보한다.
- 위젯에 표시되는 카운트다운도 실시간으로 갱신한다.

### User Flow

```
[설정 > 스마트 출발] → [도착 희망 시각 설정 (출근/퇴근)] → [준비시간 설정]
                                                              │
              ┌───────────────────────────────────────────────┘
              ▼
[매일 아침: 서버에서 자동 계산 시작 (출발 60분 전)]
              │
              ├── [5분 간격 재계산] → 소요시간 변동 시 위젯 업데이트
              │
              ├── [출발 30분 전 알림] → "30분 후 출발하세요 (09시 도착 예정)"
              │
              ├── [출발 10분 전 알림] → "10분 후 출발! 현재 소요시간 42분"
              │
              └── [출발 시각 알림] → "지금 출발하세요! 42분 뒤 도착 예상"
                      │
                      ▼
              [위젯: "출발까지 N분" 카운트다운 → "출발 시간이에요!"]
```

#### 상세 시나리오

1. **최초 설정 (1회)**
   - 사용자가 설정 > "스마트 출발" 메뉴 진입
   - 출근 도착 희망 시각 설정: 기본 09:00 (시간 피커)
   - 퇴근 도착 희망 시각 설정: 기본 19:00 (시간 피커, 선택사항)
   - 준비시간 설정: 기본 30분, 슬라이더 10~60분
   - 사전 알림 선택: 30분 전 / 10분 전 / 출발 시각 (다중 선택, 기본 모두 ON)
   - 활성 요일 선택: 기본 월~금 (요일별 토글)
   - 저장 → 서버에 설정 동기화 → EventBridge 스케줄 생성

2. **일상적 사용 (매일)**
   - 서버: 출발 예정 60분 전에 `recalculation job` 시작 (EventBridge one-time schedule)
   - 서버: 5분 간격으로 실시간 교통 + 히스토리를 반영하여 소요시간 재계산
   - 서버: 계산 결과를 `smart_departure_snapshots` 테이블에 저장
   - 서버: 위젯 데이터 API에 `departure` 필드 추가 → 모바일이 폴링/알림으로 갱신
   - 서버: 사전 알림 시각에 Expo Push Notification 발송
   - 모바일: 위젯에 "출발까지 N분" 카운트다운 표시
   - 모바일: 홈 화면에 스마트 출발 카드 표시

3. **교통 변동 시나리오**
   - 서버가 재계산 중 소요시간이 +5분 이상 증가 감지
   - 출발 시각 앞당김 + "교통 지연: 출발 시각이 08:05에서 08:00으로 변경되었습니다" 푸시 알림
   - 위젯 카운트다운 업데이트

4. **에러/엣지 케이스**
   - 경로 미설정: "경로를 먼저 설정해주세요" 안내 → 경로 설정 화면으로 연결
   - 장소 미등록: "집/회사 위치를 먼저 등록해주세요" 안내 → 장소 관리로 연결
   - 출퇴근 기록 없음 (신규 사용자): 경로의 `totalExpectedDuration`을 baseline으로 사용
   - 실시간 교통 API 장애: 히스토리 평균값으로 fallback (교통 정보 미반영 안내)
   - 주말/공휴일: 활성 요일 설정에 따라 자동 건너뜀
   - 이미 출발함 (Geofence 이탈 감지): 잔여 알림 자동 취소

---

## Scope (MoSCoW)

### Must have

1. **스마트 출발 설정 CRUD** -- 도착 희망 시각, 준비시간, 사전 알림 시각, 활성 요일
2. **최적 출발 시각 계산 API** -- (도착 희망 - 소요시간 - 준비시간), 히스토리 + 경로 기반
3. **사전 알림 푸시** -- 설정된 시각(30분 전, 10분 전, 출발 시각)에 Expo Push 발송
4. **위젯 카운트다운** -- "출발까지 N분" 표시 (기존 위젯 데이터에 departure 필드 추가)
5. **홈 화면 스마트 출발 카드** -- 오늘의 출발 시각 + 카운트다운 + 예상 소요시간
6. **출근/퇴근 별도 설정** -- 각각 도착 희망 시각 독립 설정
7. **출퇴근 히스토리 기반 소요시간 추정** -- 최근 2주 commute_sessions의 totalDurationMinutes 평균
8. **EventBridge 스케줄 관리** -- 사전 알림 시각에 one-time schedule 생성/삭제

### Should have

9. **실시간 교통 보정** -- 출발 60분 전~출발 시각까지 5분 간격 재계산
10. **교통 변동 알림** -- 소요시간 5분 이상 변동 시 푸시 알림
11. **Geofence 연동** -- P2-1 home exit 감지 시 잔여 알림 자동 취소
12. **활성 요일 설정** -- 월~일 중 선택 (기본 월~금)
13. **설정 화면 통합** -- 기존 설정 화면에 "스마트 출발" 섹션 추가

### Could have

14. **요일별 다른 도착 시각** -- 월~금 각각 다른 시간 설정
15. **교통 상황 요약 메시지** -- "오늘 2호선 10분 지연, 여유 있게 출발하세요"
16. **푸시 알림 커스텀 메시지** -- 날씨/미세먼지 정보 포함한 브리핑 형태
17. **다음 주 출발 시각 예측** -- 과거 패턴 기반 다음 주 예상 출발 시각

### Won't have (this cycle)

- **ML 기반 소요시간 예측**: P3-1에서 별도 구현 (요일/날씨/계절별 모델)
- **대안 경로 제시**: P3-5에서 구현 ("2호선 지연 시 9호선 환승")
- **Live Activity 연동**: P2-5에서 별도 구현 (ActivityKit)
- **네이버/카카오맵 실시간 교통**: 외부 지도 API 연동은 향후 검토
- **음성 알림**: TTS 기반 음성 브리핑은 이번 사이클 제외
- **Apple Watch 알림**: 네이티브 확장 필요, 향후 검토

---

## RICE Score

| Factor | Score | Rationale |
|--------|-------|-----------|
| **Reach** | 100 | 장소 등록 완료 사용자 전원 (분기당 100명 추정) |
| **Impact** | 3 (Massive) | 매일 2회 사용, 핵심 가치("제시간 도착") 직결 |
| **Confidence** | 80% | 기존 인프라(EventBridge, 푸시, 히스토리) 재사용 가능 |
| **Effort** | 3 person-cycles | BE 1.5 + FE 1.5 |

**RICE = (100 x 3 x 0.8) / 3 = 80**

---

## Data Model

### New Tables

#### `alert_system.smart_departure_settings`

사용자의 스마트 출발 설정. 출근/퇴근 별도 행.

```sql
CREATE TABLE alert_system.smart_departure_settings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES alert_system.users(id) ON DELETE CASCADE,
  route_id          UUID NOT NULL REFERENCES alert_system.commute_routes(id) ON DELETE CASCADE,
  departure_type    VARCHAR(20) NOT NULL,       -- 'commute' | 'return'
  arrival_target    TIME NOT NULL,              -- 도착 희망 시각 (예: '09:00')
  prep_time_minutes INTEGER NOT NULL DEFAULT 30,-- 준비시간 (분), 10~60
  is_enabled        BOOLEAN NOT NULL DEFAULT true,
  active_days       INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}',
  -- 활성 요일: 0=일, 1=월, ..., 6=토 (ISO 8601 기준)
  pre_alerts        INTEGER[] NOT NULL DEFAULT '{30,10,0}',
  -- 사전 알림 (분): 30=30분전, 10=10분전, 0=출발시각
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX smart_departure_settings_user_id_idx
  ON alert_system.smart_departure_settings(user_id);
CREATE UNIQUE INDEX smart_departure_settings_user_type_unique
  ON alert_system.smart_departure_settings(user_id, departure_type);
-- 사용자당 출근/퇴근 각 1개만
```

**Constraints:**
- `departure_type`: `commute` 또는 `return`
- `arrival_target`: HH:mm 형식 TIME 타입
- `prep_time_minutes`: 10 이상 60 이하
- `active_days`: 0~6 범위의 정수 배열
- `pre_alerts`: 0, 5, 10, 15, 30 중 선택 가능한 정수 배열
- `user_id + departure_type` unique: 사용자당 출근 1개, 퇴근 1개

#### `alert_system.smart_departure_snapshots`

매일의 출발 시각 계산 결과 스냅샷. 재계산 시마다 업데이트.

```sql
CREATE TABLE alert_system.smart_departure_snapshots (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES alert_system.users(id) ON DELETE CASCADE,
  setting_id              UUID NOT NULL REFERENCES alert_system.smart_departure_settings(id) ON DELETE CASCADE,
  departure_date          DATE NOT NULL,                 -- 해당 날짜
  departure_type          VARCHAR(20) NOT NULL,          -- 'commute' | 'return'
  arrival_target          TIME NOT NULL,                 -- 해당일의 도착 희망 시각
  estimated_travel_min    INTEGER NOT NULL,              -- 예상 소요시간 (분)
  prep_time_minutes       INTEGER NOT NULL,              -- 준비시간 (분)
  optimal_departure_at    TIMESTAMPTZ NOT NULL,          -- 최적 출발 시각 (날짜+시간)
  -- 소요시간 산출 근거
  baseline_travel_min     INTEGER,                       -- 경로 설정 기반 소요시간
  history_avg_travel_min  INTEGER,                       -- 히스토리 평균 소요시간
  realtime_adjustment_min INTEGER DEFAULT 0,             -- 실시간 보정값 (+/-)
  -- 상태
  status                  VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  -- 'scheduled' | 'notified' | 'departed' | 'cancelled' | 'expired'
  alerts_sent             INTEGER[] DEFAULT '{}',        -- 발송된 사전 알림 (분 단위)
  departed_at             TIMESTAMPTZ,                   -- 실제 출발 시각 (Geofence 연동)
  -- EventBridge 스케줄 ID (취소용)
  schedule_ids            TEXT[] DEFAULT '{}',           -- EventBridge 스케줄 이름 목록
  calculated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX smart_departure_snapshots_user_date_idx
  ON alert_system.smart_departure_snapshots(user_id, departure_date);
CREATE UNIQUE INDEX smart_departure_snapshots_setting_date_unique
  ON alert_system.smart_departure_snapshots(setting_id, departure_date);
CREATE INDEX smart_departure_snapshots_status_idx
  ON alert_system.smart_departure_snapshots(status)
  WHERE status = 'scheduled';
```

**Constraints:**
- `setting_id + departure_date` unique: 설정당 하루 1개
- `status` 전이: `scheduled` -> `notified` -> `departed` / `cancelled` / `expired`
- 당일 자정이 지나면 `status = 'expired'`로 자동 전환 (cleanup)

### Existing Tables (변경 사항)

#### `alert_system.commute_sessions` (기존, 읽기 전용 참조)

소요시간 히스토리 조회에 사용:
```sql
-- 최근 2주 완료된 세션의 평균 소요시간
SELECT AVG(total_duration_minutes)
FROM alert_system.commute_sessions
WHERE user_id = $1
  AND route_id = $2
  AND status = 'completed'
  AND created_at >= NOW() - INTERVAL '14 days';
```

### Entity Relationships

```
users (1) ──── (N) smart_departure_settings
  │                        │
  │                        │
  (1)                     (1)
  │                        │
  (N)                     (N)
smart_departure_snapshots  │
  │                        │
  └── setting_id FK ───────┘

commute_routes (1) ──── (N) smart_departure_settings
                               │
commute_sessions (읽기 전용) ── 소요시간 평균 계산에 참조
```

---

## Backend API

### 스마트 출발 설정 (Smart Departure Settings)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/smart-departure/settings` | 내 설정 조회 (출근 + 퇴근) |
| `POST` | `/smart-departure/settings` | 설정 생성 |
| `PUT` | `/smart-departure/settings/:id` | 설정 수정 |
| `DELETE` | `/smart-departure/settings/:id` | 설정 삭제 |
| `PATCH` | `/smart-departure/settings/:id/toggle` | 활성/비활성 토글 |

#### Request/Response

**POST /smart-departure/settings**
```typescript
// Request
interface CreateSmartDepartureSettingDto {
  routeId: string;                        // UUID, 연결할 경로
  departureType: 'commute' | 'return';    // 출근 or 퇴근
  arrivalTarget: string;                  // 'HH:mm' 형식, 예: '09:00'
  prepTimeMinutes?: number;               // 기본 30, 범위 10~60
  activeDays?: number[];                  // 기본 [1,2,3,4,5] (월~금)
  preAlerts?: number[];                   // 기본 [30,10,0]
}

// Response (201)
interface SmartDepartureSettingResponseDto {
  id: string;
  userId: string;
  routeId: string;
  departureType: 'commute' | 'return';
  arrivalTarget: string;                  // 'HH:mm'
  prepTimeMinutes: number;
  isEnabled: boolean;
  activeDays: number[];
  preAlerts: number[];
  createdAt: string;
  updatedAt: string;
}
```

**PUT /smart-departure/settings/:id**
```typescript
interface UpdateSmartDepartureSettingDto {
  routeId?: string;
  arrivalTarget?: string;                 // 'HH:mm'
  prepTimeMinutes?: number;               // 10~60
  activeDays?: number[];                  // [0-6]
  preAlerts?: number[];                   // [0,5,10,15,30] subset
}
```

**Error cases:**
- 409 Conflict: 동일 departureType이 이미 존재
- 400 Bad Request: prepTimeMinutes 범위 초과, arrivalTarget 형식 오류
- 404 Not Found: routeId가 존재하지 않거나 다른 사용자 소유
- 403 Forbidden: 다른 사용자의 설정 접근

### 스마트 출발 계산/조회 (Smart Departure)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/smart-departure/today` | 오늘의 출발 정보 조회 (출근 + 퇴근) |
| `POST` | `/smart-departure/calculate` | 수동 재계산 요청 |
| `GET` | `/smart-departure/history?days=7` | 최근 N일 출발 기록 |

#### Request/Response

**GET /smart-departure/today**
```typescript
// Response (200)
interface SmartDepartureTodayResponseDto {
  commute?: SmartDepartureSnapshotDto;    // 오늘 출근 정보
  return?: SmartDepartureSnapshotDto;     // 오늘 퇴근 정보
}

interface SmartDepartureSnapshotDto {
  id: string;
  settingId: string;
  departureType: 'commute' | 'return';
  departureDate: string;                  // 'YYYY-MM-DD'
  arrivalTarget: string;                  // 'HH:mm'
  estimatedTravelMin: number;             // 예상 소요시간
  prepTimeMinutes: number;
  optimalDepartureAt: string;             // ISO 8601 datetime
  minutesUntilDeparture: number;          // 출발까지 남은 분 (음수=이미 지남)
  status: 'scheduled' | 'notified' | 'departed' | 'cancelled' | 'expired';
  // 소요시간 근거
  baselineTravelMin?: number;
  historyAvgTravelMin?: number;
  realtimeAdjustmentMin?: number;
  // 알림 상태
  alertsSent: number[];                   // 이미 발송된 사전 알림
  nextAlertMin?: number;                  // 다음 발송 예정 알림 (분)
  // 메타
  calculatedAt: string;
  updatedAt: string;
}
```

**POST /smart-departure/calculate**
```typescript
// Request (body 없음, JWT에서 userId 추출)
// 모든 활성 설정에 대해 오늘의 출발 시각을 재계산

// Response (200)
interface CalculateResponseDto {
  recalculated: SmartDepartureSnapshotDto[];
  message: string;                        // "2개 설정이 재계산되었습니다."
}
```

**GET /smart-departure/history?days=7**
```typescript
// Response (200)
interface SmartDepartureHistoryResponseDto {
  snapshots: SmartDepartureSnapshotDto[];
  summary: {
    totalDays: number;
    departedOnTime: number;               // 출발 시각 +/-5분 이내 출발
    averageTravelMin: number;
    averageAccuracyMin: number;           // 예상 vs 실제 오차 평균
  };
}
```

### 위젯 데이터 (기존 API 확장)

**GET /widget/data** (기존 응답에 departure 필드 추가)

```typescript
// 기존 WidgetDataResponse에 추가
interface WidgetDataResponse {
  weather: WidgetWeatherData | null;
  airQuality: WidgetAirQualityData | null;
  nextAlert: WidgetNextAlertData | null;
  transit: WidgetTransitData;
  departure: WidgetDepartureData | null;    // [NEW] 스마트 출발 정보
  updatedAt: string;
}

interface WidgetDepartureData {
  departureType: 'commute' | 'return';
  optimalDepartureAt: string;              // ISO 8601
  minutesUntilDeparture: number;           // 출발까지 남은 분
  estimatedTravelMin: number;              // 예상 소요시간
  arrivalTarget: string;                   // 도착 희망 시각 'HH:mm'
  status: 'scheduled' | 'notified' | 'departed';
  hasTrafficDelay: boolean;                // 교통 지연 여부
}
```

---

## 내부 로직: 소요시간 계산 알고리즘

### 가중 결합 공식

```typescript
function estimateTravelTime(
  baselineMin: number,            // 경로 설정의 totalExpectedDuration
  historyAvgMin: number | null,   // 최근 2주 세션 평균 (없으면 null)
  realtimeAdjustment: number      // 실시간 교통 보정 (+/- 분)
): number {
  if (historyAvgMin === null) {
    // 히스토리 없음: 경로 baseline + 실시간 보정
    return Math.max(baselineMin + realtimeAdjustment, 5);
  }

  // 가중 결합: baseline 20% + history 50% + realtime 30%
  const weighted =
    baselineMin * 0.2 +
    historyAvgMin * 0.5 +
    (historyAvgMin + realtimeAdjustment) * 0.3;

  return Math.max(Math.round(weighted), 5);  // 최소 5분
}
```

### 실시간 교통 보정

기존 교통 API(지하철/버스 도착 정보)를 활용하여 보정값을 계산:

```typescript
function calculateRealtimeAdjustment(
  route: CommuteRoute,
  subwayArrivals: SubwayArrival[],
  busArrivals: BusArrival[]
): number {
  let adjustment = 0;

  for (const checkpoint of route.checkpoints) {
    if (checkpoint.checkpointType === 'subway' && checkpoint.linkedStationId) {
      const arrival = subwayArrivals.find(
        a => a.stationId === checkpoint.linkedStationId
      );
      if (arrival) {
        // 예상 대기 시간 vs 실제 도착 시간 차이
        const diff = arrival.arrivalTime - checkpoint.expectedWaitTime;
        if (diff > 2) adjustment += diff;  // 2분 초과 지연만 반영
      }
    }

    if (checkpoint.checkpointType === 'bus_stop' && checkpoint.linkedBusStopId) {
      const arrival = busArrivals.find(
        a => a.stopId === checkpoint.linkedBusStopId
      );
      if (arrival) {
        const diff = arrival.arrivalTime - checkpoint.expectedWaitTime;
        if (diff > 3) adjustment += diff;  // 3분 초과 지연만 반영
      }
    }
  }

  return adjustment;
}
```

### 재계산 스케줄링 흐름

```
                       매일 자정 (Cron)
                            │
                            ▼
              ┌── 오늘 활성 설정 목록 조회 ──┐
              │   (활성 + 해당 요일)          │
              ▼                              ▼
        출근 설정                        퇴근 설정
       arrival: 09:00                  arrival: 19:00
       prep: 30분                      prep: 20분
              │                              │
              ▼                              ▼
  baseline 소요시간: 45분          baseline 소요시간: 50분
  → 출발 시각: 07:45              → 출발 시각: 17:50
              │                              │
              ▼                              ▼
  EventBridge 스케줄 생성:        EventBridge 스케줄 생성:
  - 06:45 재계산 시작 job          - 16:50 재계산 시작 job
  - 07:15 pre-alert (30분 전)      - 17:20 pre-alert (30분 전)
  - 07:35 pre-alert (10분 전)      - 17:40 pre-alert (10분 전)
  - 07:45 departure-alert          - 17:50 departure-alert
              │
              ▼
  [06:45~07:45] 5분 간격 재계산
  → 소요시간 변동 시 스케줄 업데이트
```

---

## Mobile Implementation

### 설정 화면 (Smart Departure Settings)

```
┌──────────────────────────────────────────┐
│  ← 스마트 출발                            │
├──────────────────────────────────────────┤
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  🌅 출근 설정                      │  │
│  │                                    │  │
│  │  도착 희망 시각    [09:00]  >      │  │
│  │  준비시간          [30분]   >      │  │
│  │  사전 알림         [30, 10, 0분]   │  │
│  │  활성 요일         [월~금]  >      │  │
│  │  연결 경로         [2호선 출근] >  │  │
│  │                                    │  │
│  │           [활성] ●──────○          │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  🌙 퇴근 설정                      │  │
│  │                                    │  │
│  │  도착 희망 시각    [19:00]  >      │  │
│  │  준비시간          [20분]   >      │  │
│  │  사전 알림         [10, 0분]       │  │
│  │  활성 요일         [월~금]  >      │  │
│  │  연결 경로         [2호선 퇴근] >  │  │
│  │                                    │  │
│  │           [비활성] ○──────●        │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  ℹ️ 스마트 출발 알림은 출퇴근 기록 │  │
│  │  이 많을수록 정확해집니다.          │  │
│  │  최소 5일 이상의 기록이 권장됩니다. │  │
│  └────────────────────────────────────┘  │
│                                          │
└──────────────────────────────────────────┘
```

### 홈 화면 스마트 출발 카드

```
┌──────────────────────────────────────────┐
│  오늘의 스마트 출발                       │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │                                    │  │
│  │  🚀 출발까지    23분               │  │
│  │     ━━━━━━━━━━━━━━━━━━━━          │  │
│  │                                    │  │
│  │  출발 07:45  →  도착 09:00 예정    │  │
│  │  예상 소요 45분 (교통 보통)         │  │
│  │                                    │  │
│  │  [상세 보기]                        │  │
│  └────────────────────────────────────┘  │
│                                          │
└──────────────────────────────────────────┘
```

**상태별 카드 변형:**

```
[출발 30분 이상 전]
"출발까지 N분" + 여유 상태 (회색/파란색)

[출발 30분 ~ 10분 전]
"출발까지 N분" + 주의 상태 (주황색)

[출발 10분 이내]
"곧 출발하세요!" + 긴급 상태 (빨간색)

[출발 시각 경과]
"출발 시각이 N분 지났어요" + 지연 상태 (빨간색)

[교통 지연 감지]
"⚠️ 교통 지연! 출발 시각이 07:45 → 07:40으로 변경" + 경고 표시

[이미 출발 (Geofence 감지)]
"출근 중이에요! 도착 예정 09:03" + 진행 상태 (초록색)

[설정 없음]
"스마트 출발을 설정하면 최적 출발 시각을 알려드려요" + [설정하기] 버튼
```

### 위젯 카운트다운

기존 위젯(Small + Medium)에 스마트 출발 정보 추가:

```
[iOS Small Widget]
┌─────────────────────┐
│  출발까지            │
│     23분             │
│  07:45 출발          │
│  🚀 교통 보통        │
└─────────────────────┘

[iOS Medium Widget]
┌──────────────────────────────────────────┐
│  🌤️ 3℃ 맑음    😷 보통    🚀 출발 23분  │
│  ──────────────────────────────────────  │
│  07:45 출발 → 09:00 도착 | 소요 45분     │
│  🚇 2호선 강남 5분 | 🚌 146번 3분        │
└──────────────────────────────────────────┘

[Android Widget - 동일 레이아웃]
```

### 푸시 알림 메시지 형식

| 시점 | 제목 | 내용 |
|------|------|------|
| 30분 전 | "출발 30분 전" | "07:45에 출발하면 09:00 도착 예정이에요. 예상 소요 45분." |
| 10분 전 | "출발 10분 전" | "곧 출발하세요! 07:45 출발 → 09:00 도착 예정 (45분)" |
| 출발 시각 | "지금 출발하세요!" | "지금 나가면 09:00에 도착할 수 있어요. 소요 45분." |
| 교통 변동 | "출발 시각 변경" | "교통 지연으로 출발 시각이 07:45 → 07:40으로 앞당겨졌어요." |

### Mobile File Structure

```
mobile/
  app/
    smart-departure.tsx                    # 스마트 출발 설정 화면
  src/
    services/
      smart-departure.service.ts           # 설정 CRUD + today/calculate API
    hooks/
      useSmartDeparture.ts                 # 설정 조회/관리 훅
      useSmartDepartureToday.ts            # 오늘의 출발 정보 + 카운트다운 훅
    types/
      smart-departure.ts                   # 타입 정의
    components/
      smart-departure/
        SmartDepartureCard.tsx             # 홈 화면 카드 (카운트다운)
        SmartDepartureSettingForm.tsx      # 설정 폼 (출근/퇴근 공용)
        TimePickerSheet.tsx               # 시간 선택 바텀시트
        PrepTimeSlider.tsx                # 준비시간 슬라이더 (10~60분)
        ActiveDaysPicker.tsx              # 활성 요일 선택 (월~일 토글)
        PreAlertPicker.tsx                # 사전 알림 선택 (다중 선택)
        DepartureCountdown.tsx            # 카운트다운 애니메이션 컴포넌트
        EmptySmartDepartureView.tsx       # 미설정 빈 상태
```

### Settings Screen Integration

```
설정 화면
  ├── 프로필 카드
  ├── 바로가기 (Quick Links)
  ├── 출퇴근 자동 감지 (P2-1)
  ├── [NEW] 스마트 출발           ← 신규 섹션
  │     ├── 출근 설정 → smart-departure.tsx
  │     ├── 퇴근 설정 → smart-departure.tsx
  │     └── 스마트 출발 ON/OFF 토글
  ├── 푸시 알림
  ├── 앱 정보
  └── 로그아웃
```

---

## Backend Implementation

### NestJS Module Structure

```
backend/src/
  domain/
    entities/
      smart-departure-setting.entity.ts
      smart-departure-snapshot.entity.ts
    repositories/
      smart-departure-setting.repository.ts     # interface
      smart-departure-snapshot.repository.ts     # interface
  application/
    dto/
      smart-departure.dto.ts
    use-cases/
      manage-smart-departure.use-case.ts        # 설정 CRUD
      calculate-departure.use-case.ts           # 출발 시각 계산 핵심 로직
      schedule-departure-alerts.use-case.ts     # EventBridge 스케줄 관리
      recalculate-departure.use-case.ts         # 재계산 job (EventBridge trigger)
    ports/
      travel-time-estimator.ts                  # 소요시간 추정 포트
  infrastructure/
    persistence/
      typeorm/
        smart-departure-setting.entity.ts       # ORM entity
        smart-departure-snapshot.entity.ts       # ORM entity
      repositories/
        smart-departure-setting.repository.ts   # implementation
        smart-departure-snapshot.repository.ts  # implementation
    services/
      travel-time-estimator.service.ts          # 소요시간 추정 구현
  presentation/
    controllers/
      smart-departure.controller.ts
    modules/
      smart-departure.module.ts
```

### 핵심 UseCase: CalculateDeparture

```typescript
class CalculateDepartureUseCase {
  async calculateForToday(userId: string): Promise<SmartDepartureSnapshotDto[]> {
    const settings = await this.settingRepo.findActiveByUserId(userId);
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=일, 1=월, ...

    const results: SmartDepartureSnapshotDto[] = [];

    for (const setting of settings) {
      // 1. 활성 요일 체크
      if (!setting.activeDays.includes(dayOfWeek)) continue;

      // 2. 기존 스냅샷 확인 (이미 계산된 경우)
      const existing = await this.snapshotRepo.findBySettingAndDate(
        setting.id, today
      );
      if (existing && existing.status === 'departed') continue;

      // 3. 소요시간 추정
      const route = await this.routeRepo.findById(setting.routeId);
      const baselineMin = route.totalExpectedDuration ?? 30;
      const historyAvgMin = await this.getHistoryAverage(userId, setting.routeId);
      const realtimeAdj = await this.getRealtimeAdjustment(route);
      const estimatedTravelMin = this.estimateTravelTime(
        baselineMin, historyAvgMin, realtimeAdj
      );

      // 4. 최적 출발 시각 계산
      const arrivalTarget = this.parseTimeToDate(setting.arrivalTarget, today);
      const optimalDeparture = new Date(
        arrivalTarget.getTime()
        - estimatedTravelMin * 60_000
        - setting.prepTimeMinutes * 60_000
      );

      // 5. 스냅샷 저장/업데이트
      const snapshot = existing
        ? this.updateSnapshot(existing, { estimatedTravelMin, optimalDeparture, realtimeAdj })
        : this.createSnapshot(setting, today, {
            estimatedTravelMin, optimalDeparture,
            baselineMin, historyAvgMin, realtimeAdj
          });

      const saved = await this.snapshotRepo.save(snapshot);

      // 6. EventBridge 스케줄 생성/업데이트
      await this.scheduleAlerts(saved, setting);

      results.push(this.toDto(saved));
    }

    return results;
  }

  private async getHistoryAverage(userId: string, routeId: string): Promise<number | null> {
    const sessions = await this.sessionRepo.findCompletedRecent(
      userId, routeId, 14 // 최근 14일
    );
    if (sessions.length < 3) return null; // 최소 3회 이상 기록 필요
    const sum = sessions.reduce((acc, s) => acc + (s.totalDurationMinutes ?? 0), 0);
    return Math.round(sum / sessions.length);
  }
}
```

### Daily Calculation Cron

매일 자정(00:05 KST)에 모든 활성 사용자의 당일 출발 시각을 계산:

```typescript
@Cron('5 0 * * *', { timeZone: 'Asia/Seoul' })
async handleDailyDepartureCalculation(): Promise<void> {
  const activeSettings = await this.settingRepo.findAllActive();
  const today = new Date();
  const dayOfWeek = today.getDay();

  for (const setting of activeSettings) {
    if (!setting.activeDays.includes(dayOfWeek)) continue;

    try {
      await this.calculateDepartureUseCase.calculateForToday(setting.userId);
    } catch (error) {
      this.logger.error(
        `Failed to calculate departure for user ${setting.userId}:`, error
      );
    }
  }

  // 전일 expired 스냅샷 정리
  await this.snapshotRepo.expireOldSnapshots(today);
}
```

### Recalculation Job (EventBridge Trigger)

출발 60분 전에 시작되는 재계산 job:

```typescript
// /scheduler/trigger 엔드포인트에서 호출
async handleRecalculation(snapshotId: string): Promise<void> {
  const snapshot = await this.snapshotRepo.findById(snapshotId);
  if (!snapshot || snapshot.status !== 'scheduled') return;

  const setting = await this.settingRepo.findById(snapshot.settingId);
  const route = await this.routeRepo.findById(setting.routeId);

  // 실시간 교통 재조회
  const realtimeAdj = await this.getRealtimeAdjustment(route);
  const newEstimate = this.estimateTravelTime(
    snapshot.baselineTravelMin,
    snapshot.historyAvgTravelMin,
    realtimeAdj
  );

  const diff = newEstimate - snapshot.estimatedTravelMin;

  if (Math.abs(diff) >= 5) {
    // 5분 이상 변동 → 출발 시각 재계산 + 알림 재스케줄 + 변동 푸시
    const newDeparture = /* 재계산 */;
    await this.snapshotRepo.update(snapshot.id, {
      estimatedTravelMin: newEstimate,
      optimalDepartureAt: newDeparture,
      realtimeAdjustmentMin: realtimeAdj,
      calculatedAt: new Date(),
    });
    await this.rescheduleAlerts(snapshot, setting);
    await this.sendTrafficChangeNotification(snapshot, diff);
  }
}
```

---

## Geofence 연동 (P2-1)

### 출발 감지 시 잔여 알림 취소

P2-1의 `ProcessCommuteEventUseCase`에서 `commute_started`(집 이탈) 이벤트 발생 시:

```typescript
// process-commute-event.use-case.ts 확장
if (action === 'commute_started' || action === 'return_started') {
  // ... 기존 세션 생성 로직 ...

  // [NEW] 스마트 출발: 잔여 알림 취소 + 상태 업데이트
  const departureType = action === 'commute_started' ? 'commute' : 'return';
  const snapshot = await this.snapshotRepo.findTodayByUserAndType(
    userId, departureType
  );
  if (snapshot && snapshot.status !== 'departed') {
    await this.snapshotRepo.update(snapshot.id, {
      status: 'departed',
      departedAt: new Date(dto.triggeredAt),
    });
    await this.cancelRemainingAlerts(snapshot.scheduleIds);
  }
}
```

---

## Edge Cases

| 시나리오 | 처리 |
|----------|------|
| **경로 미설정** | 설정 화면에서 "경로를 먼저 설정해주세요" 안내 + 경로 설정 링크 |
| **장소 미등록** | Geofence 연동 불가 안내, 스마트 출발 자체는 동작 (푸시만) |
| **출퇴근 기록 < 3회** | baseline(경로 설정 시간)만 사용, "기록이 쌓이면 더 정확해져요" 안내 |
| **실시간 교통 API 장애** | 히스토리 평균으로 fallback, 교통 보정 0으로 처리 |
| **새벽/심야 출근** | arrival_target이 05:00 이전이면 전날 밤 기준 계산 |
| **준비시간 > (도착 시각 - 현재)** | "이미 출발 시각이 지났습니다" 표시 |
| **주말/공휴일** | active_days 설정으로 자동 건너뜀 (공휴일은 이번 사이클 미지원) |
| **여러 경로 보유** | 설정별 경로 1개 연결, 사용자가 직접 선택 |
| **이미 출발 (Geofence)** | 잔여 알림 취소, 카드 상태 "출근 중" 전환 |
| **앱 미설치/알림 꺼짐** | 설정 시 Expo Push 토큰 확인, 없으면 알림 권한 요청 안내 |
| **시간대 변경 (해외 출장)** | 모든 시간은 서버에서 KST로 처리 (이번 사이클 다중 시간대 미지원) |
| **설정 변경 직후** | 즉시 재계산 + 기존 EventBridge 스케줄 교체 |
| **소요시간이 매우 길어짐 (60분+)** | 최대 소요시간 120분으로 cap, 이상치 알림 |
| **오늘 이미 지난 시각** | 스냅샷 status를 `expired`로 설정, 내일 설정 안내 |

---

## Acceptance Criteria

### 설정 관리

- [ ] Given 로그인된 사용자가 스마트 출발 설정 화면에 진입했을 때, When 설정이 없으면, Then "스마트 출발을 설정하면 최적 출발 시각을 알려드려요" 빈 상태와 [설정하기] 버튼이 표시된다.
- [ ] Given 출근 설정을 생성할 때, When 도착 시각 09:00, 준비시간 30분, 활성 요일 월~금을 선택하고 저장하면, Then 서버에 설정이 저장되고 오늘의 출발 시각이 즉시 계산된다.
- [ ] Given 이미 출근 설정이 존재할 때, When 다시 출근 설정을 생성하면, Then 409 Conflict 에러와 "이미 출근 설정이 존재합니다" 메시지가 표시된다.
- [ ] Given 설정 수정 화면에서, When 도착 시각을 09:00에서 08:30으로 변경하고 저장하면, Then 오늘의 출발 시각이 재계산되고 EventBridge 스케줄이 업데이트된다.
- [ ] Given 스마트 출발이 활성 상태일 때, When 토글을 OFF하면, Then 오늘 잔여 알림이 모두 취소되고 위젯에서 카운트다운이 사라진다.

### 출발 시각 계산

- [ ] Given 경로의 예상 소요시간이 40분이고 최근 2주 출퇴근 평균이 45분일 때, When 오늘의 출발 시각을 계산하면, Then 가중 평균(baseline 20% + history 50% + realtime 30%)으로 산출된 소요시간이 적용된다.
- [ ] Given 출퇴근 기록이 3회 미만인 신규 사용자일 때, When 출발 시각을 계산하면, Then 경로의 totalExpectedDuration이 baseline으로 사용되고 "기록이 쌓이면 더 정확해져요" 안내가 표시된다.
- [ ] Given 도착 희망 09:00, 소요시간 45분, 준비시간 30분일 때, When 출발 시각을 계산하면, Then 최적 출발 시각이 07:45로 산출된다.

### 푸시 알림

- [ ] Given 사전 알림 [30, 10, 0]이 설정되고 출발 시각이 07:45일 때, When 07:15이 되면, Then "출발 30분 전" 푸시 알림이 발송된다.
- [ ] Given 사전 알림이 07:15에 발송된 후, When 07:35이 되면, Then "출발 10분 전" 푸시 알림이 발송된다.
- [ ] Given 출발 시각 07:45일 때, When 07:45이 되면, Then "지금 출발하세요!" 푸시 알림이 발송된다.
- [ ] Given 사전 알림이 아직 남아있는 상태에서, When 사용자가 집 Geofence를 이탈하면(P2-1 연동), Then 잔여 알림이 자동 취소되고 스냅샷 status가 'departed'로 변경된다.

### 위젯 + 홈 화면

- [ ] Given 오늘의 출발 시각이 계산된 상태에서, When 홈 화면에 진입하면, Then 스마트 출발 카드에 "출발까지 N분" 카운트다운과 출발/도착 시각이 표시된다.
- [ ] Given 위젯 데이터를 조회할 때, When 스마트 출발 설정이 활성이면, Then 응답에 `departure` 필드가 포함되고 위젯에 카운트다운이 표시된다.
- [ ] Given 출발 10분 이내일 때, When 홈 화면 카드를 확인하면, Then 카드 배경이 긴급 상태(빨간색 계열)로 변경되고 "곧 출발하세요!" 메시지가 표시된다.
- [ ] Given 출발 시각이 경과했을 때, When 홈 화면을 확인하면, Then "출발 시각이 N분 지났어요" 메시지가 표시된다.

### 실시간 교통 보정 (Should)

- [ ] Given 출발 60분 전부터 재계산이 시작될 때, When 2호선에 10분 지연이 발생하면, Then 소요시간이 +10분 보정되고 출발 시각이 앞당겨진다.
- [ ] Given 소요시간이 5분 이상 증가할 때, When 재계산이 완료되면, Then "교통 지연으로 출발 시각이 변경되었습니다" 푸시 알림이 발송된다.

### 비기능 요구사항

- [ ] TypeScript 에러 0개 (`tsc --noEmit` 통과)
- [ ] Backend API 응답 시간 < 500ms (계산 API 포함)
- [ ] EventBridge 스케줄 생성/삭제 정상 동작
- [ ] 기존 위젯/알림/홈 화면 기능 회귀 없음

---

## Task Breakdown

### Backend (BE)

| # | Task | Size | Deps | Description |
|---|------|------|------|-------------|
| BE-1 | SmartDepartureSetting 도메인 엔티티 + ORM 엔티티 | S | none | 도메인 엔티티, TypeORM 엔티티, 리포지토리 인터페이스 |
| BE-2 | SmartDepartureSnapshot 도메인 엔티티 + ORM 엔티티 | S | none | 도메인 엔티티, TypeORM 엔티티, 리포지토리 인터페이스 |
| BE-3 | SmartDepartureSetting 리포지토리 구현 | S | BE-1 | TypeORM 리포지토리 (CRUD + findActiveByUserId + findByUserAndType) |
| BE-4 | SmartDepartureSnapshot 리포지토리 구현 | S | BE-2 | TypeORM 리포지토리 (save + findBySettingAndDate + findTodayByUser + expireOld) |
| BE-5 | 스마트 출발 DTO + Validation | S | none | Create/Update/Response DTOs + class-validator |
| BE-6 | ManageSmartDeparture UseCase | M | BE-1, BE-3, BE-5 | 설정 CRUD + unique 체크 + 경로 존재 확인 |
| BE-7 | TravelTimeEstimator 서비스 | M | none | 소요시간 가중 결합 로직 (baseline + history + realtime) |
| BE-8 | CalculateDeparture UseCase | L | BE-2, BE-4, BE-7 | 출발 시각 계산 핵심 로직 + 스냅샷 저장 |
| BE-9 | ScheduleDepartureAlerts UseCase | M | BE-8 | EventBridge 스케줄 생성/업데이트/삭제 + 푸시 알림 발송 |
| BE-10 | RecalculateDeparture UseCase | M | BE-8, BE-9 | 재계산 job 로직 (교통 변동 감지 + 스케줄 업데이트) |
| BE-11 | SmartDeparture Controller + Module | M | BE-6, BE-8 | REST 엔드포인트 + JWT Guard + 권한 검사 |
| BE-12 | Widget Data API 확장 | S | BE-8 | 기존 /widget/data에 departure 필드 추가 |
| BE-13 | Daily Calculation Cron | S | BE-8 | 매일 자정 전체 사용자 계산 + expired 정리 |
| BE-14 | Scheduler Trigger 확장 | S | BE-9, BE-10 | 기존 /scheduler/trigger에 departure 이벤트 타입 추가 |
| BE-15 | ProcessCommuteEvent 연동 | S | BE-4 | home exit 시 잔여 알림 취소 + status departed 업데이트 |
| BE-16 | Backend Unit Tests | M | BE-7, BE-8, BE-10 | 계산 로직, 재계산, 스케줄 관리 테스트 |

### Mobile (FE)

| # | Task | Size | Deps | Description |
|---|------|------|------|-------------|
| FE-1 | 스마트 출발 타입 정의 + API 서비스 | S | BE-11 | smart-departure.ts 타입, smart-departure.service.ts API |
| FE-2 | useSmartDeparture 훅 | S | FE-1 | 설정 CRUD 상태 관리 |
| FE-3 | useSmartDepartureToday 훅 | M | FE-1 | 오늘의 출발 정보 + 카운트다운 타이머 (1분 간격 갱신) |
| FE-4 | SmartDepartureCard 컴포넌트 | M | FE-3 | 홈 화면 카드 (카운트다운 + 상태별 색상 + 상세 보기) |
| FE-5 | SmartDepartureSettingForm 컴포넌트 | M | FE-2 | 설정 폼 (시간 피커, 준비시간 슬라이더, 요일 선택 등) |
| FE-6 | TimePickerSheet 컴포넌트 | S | none | 시간 선택 바텀시트 (HH:mm) |
| FE-7 | PrepTimeSlider 컴포넌트 | S | none | 10~60분 슬라이더 + 숫자 표시 |
| FE-8 | ActiveDaysPicker 컴포넌트 | S | none | 월~일 토글 버튼 그룹 |
| FE-9 | PreAlertPicker 컴포넌트 | S | none | 사전 알림 시간 다중 선택 (30, 15, 10, 5, 0분) |
| FE-10 | DepartureCountdown 컴포넌트 | S | none | 분 단위 카운트다운 + 상태별 색상 애니메이션 |
| FE-11 | EmptySmartDepartureView 컴포넌트 | S | none | 미설정 빈 상태 + [설정하기] 버튼 |
| FE-12 | smart-departure.tsx 설정 화면 | M | FE-5~FE-9 | 출근/퇴근 설정 전체 화면 |
| FE-13 | 홈 화면 통합 | S | FE-4 | HomeScreen에 SmartDepartureCard 추가 |
| FE-14 | 위젯 데이터 업데이트 | S | FE-3 | 위젯 departure 필드 반영 + 카운트다운 표시 |
| FE-15 | 설정 화면 통합 | S | FE-12 | 설정 화면에 "스마트 출발" 섹션 추가 |

---

## Open Questions

1. **공휴일 처리**: 대한민국 공휴일을 자동으로 건너뛸 것인가?
   - **현재 결정**: 이번 사이클에서는 요일 기반만 지원. 공휴일 DB/API는 P3에서 검토.
   - **사용자 임시 해결**: 전날 토글 OFF → 다음날 ON.

2. **다중 경로 동시 사용**: 사용자가 출근 경로가 2개일 때 어떤 경로로 계산할 것인가?
   - **현재 결정**: 설정 시 경로 1개를 직접 선택. 사용자 책임.
   - **향후**: P3-1에서 요일별 자동 경로 매칭.

3. **재계산 빈도 최적화**: 5분 간격이 API 호출 비용 대비 적절한가?
   - **현재 결정**: 출발 60~30분 전은 10분 간격, 30~0분 전은 5분 간격으로 단계적 적용.
   - 사용자 수 증가 시 재검토 (EventBridge one-time schedule 비용: $1/100만 건).

4. **푸시 알림 vs 로컬 알림**: 서버 기반 Expo Push vs 클라이언트 로컬 알림 중 어느 것을 사용할 것인가?
   - **현재 결정**: Expo Push (서버에서 정확한 시각에 발송, 재계산 결과 즉시 반영).
   - 오프라인 fallback으로 로컬 알림도 보조적으로 사용 고려.

5. **위젯 갱신 빈도**: iOS WidgetKit의 timeline refresh 제한 (하루 약 40~70회)과의 충돌은?
   - **현재 결정**: 위젯은 앱 포그라운드 시 + 푸시 수신 시에만 갱신. 1분 간격 타이머는 앱 내 카드에서만.

---

## Out of Scope

- **ML 기반 예측 모델**: 요일/날씨/계절 조합 모델은 P3-1에서 구현. 이번 사이클은 단순 평균 + 실시간 보정.
- **네이버/카카오맵 교통 API**: 외부 지도 API 연동 없이 기존 교통 API(지하철/버스 도착 정보)만 활용.
- **대안 경로 자동 전환**: "2호선 지연 시 9호선 환승" 같은 동적 경로 전환은 P3-5.
- **Live Activity**: iOS Dynamic Island 표시는 P2-5에서 별도.
- **음성 브리핑**: TTS 기반 출발 안내는 향후 검토.
- **다중 시간대**: 해외 출장 등 KST 외 시간대는 이번 사이클 미지원.
- **Apple Watch / Wear OS**: 네이티브 위치 API + 컴플리케이션은 별도 사이클.

---

## Risk & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| EventBridge 스케줄 생성/삭제 실패 | Low | High | 재시도 3회 + DLQ + 로컬 알림 fallback |
| 실시간 교통 API 장애/지연 | Medium | Medium | 히스토리 평균으로 fallback, API 장애 시 보정 0 처리 |
| 소요시간 예측 부정확 (초기) | High | Medium | 기록 5일 이상 후 정확도 표시, 점진적 개선 안내 |
| 푸시 알림 미도달 (알림 권한 OFF) | Medium | High | 설정 시 알림 권한 확인, 미허용 시 안내 배너 |
| iOS WidgetKit 갱신 제한 | Medium | Low | 앱 내 카드에서 정확한 카운트다운, 위젯은 근사치 허용 |
| 사용자가 설정을 복잡하게 느낌 | Medium | Medium | 기본값 최적화 (09:00, 30분, 월~금), 최소 입력으로 시작 |
| 재계산 job 누적으로 서버 부하 | Low | Medium | 사용자당 최대 2개(출근/퇴근), 비활성 설정 제외 |

---

*v1.0 | 2026-02-19 | PM Agent*
