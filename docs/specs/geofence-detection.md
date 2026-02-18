# P2-1: Geofence 자동 출퇴근 감지

> Spec v1.0 | 2026-02-19 | Cycle 32 | Branch: `feature/geofence-detection`

---

## JTBD

When **매일 같은 경로로 출퇴근하면서 수동으로 출발/도착을 기록해야 할 때**,
I want to **집/회사 위치만 등록하면 출퇴근이 자동으로 감지되고 기록되기를**,
so I can **기록하는 수고 없이 출퇴근 패턴 데이터를 쌓아서 최적의 출발 시각 추천을 받을 수 있다**.

---

## Problem

- **Who:** 매일 대중교통으로 출퇴근하는 수도권 직장인. 이미 경로를 설정하고 수동 트래킹(P1-4)을 사용 중인 사용자.
- **Pain:** 매일 출발 시 앱을 열어 "출발" 버튼을 누르고, 도착 시 "도착" 버튼을 눌러야 한다. 까먹기 쉽고, 기록이 끊기면 패턴 분석 정확도가 떨어진다. (빈도: 매일 2회 x 심각도: 중 = 높음)
- **Current workaround:** 수동으로 commute session을 시작/완료한다. 까먹으면 기록이 빠진다.
- **Success metric:**
  - 자동 감지 성공률 > 90% (집 이탈 + 회사 진입 기준)
  - 수동 트래킹 대비 기록 누락률 50% 이상 감소
  - 장소 등록 완료율 > 80% (설정 화면 진입 사용자 기준)

---

## Solution

### Overview

`expo-location`의 Geofencing API를 사용하여 사용자가 등록한 장소(집, 회사)의 반경 진입/이탈을 백그라운드에서 감지한다. Geofencing은 연속 GPS 추적이 아닌 OS 레벨의 이벤트 기반 감지이므로 배터리 소모가 최소화된다.

감지된 이벤트는 `commute_events` 테이블에 원시 기록되고, 비즈니스 로직에 의해 기존 `commute_sessions` 테이블의 세션으로 변환된다. 수동 트래킹과 자동 감지가 공존하며, 사용자는 설정에서 자동 감지를 켜고/끌 수 있다.

**왜 Geofencing인가?**
- 연속 GPS(`Location.watchPositionAsync`)는 배터리를 빠르게 소모한다.
- Geofencing은 OS가 셀 타워, Wi-Fi, 저전력 위치 등을 활용하여 반경 진입/이탈 시에만 앱에 알린다.
- iOS는 최대 20개, Android는 최대 100개의 동시 Geofence를 지원한다.
- 이 기능은 집/회사 2개만 필요하므로 OS 제한에 여유가 충분하다.

### User Flow

```
[설정 > 장소 관리] → [장소 등록 (집/회사)] → [위치 권한 요청] → [Geofence 활성화]
                                                                      │
                ┌──────────────────────────────────────────────────────┘
                ▼
[평상시: 백그라운드 Geofence 모니터링]
                │
    ┌───────────┼───────────────┐
    ▼           ▼               ▼
[집 이탈]   [회사 진입]    [회사 이탈]
= 출근 시작  = 출근 완료   = 퇴근 시작
    │           │               │
    ▼           ▼               ▼
[commute_events 기록 + commute_sessions 자동 생성/완료]
                │
                ▼
        [알림: "출근 시작을 감지했어요"]
```

#### 상세 시나리오

1. **최초 설정 (1회)**
   - 사용자가 설정 > 장소 관리에 진입
   - "집" 장소 추가: 현재 위치 사용 또는 지도에서 핀 이동
   - "회사" 장소 추가: 동일 방식
   - 반경 설정: 기본 200m, 슬라이더로 100~500m 조절 가능
   - 위치 권한 요청 (백그라운드 포함)
   - 자동 감지 토글 ON

2. **일상적 사용 (매일)**
   - 아침: 사용자가 집에서 나감 → 집 Geofence 이탈 감지 → 출근 시작 이벤트 기록
   - 출근 도착: 회사 Geofence 진입 감지 → 출근 완료 이벤트 기록 → 세션 완료
   - 퇴근: 회사 Geofence 이탈 감지 → 퇴근 시작 이벤트 기록
   - 귀가: 집 Geofence 진입 감지 → 퇴근 완료 이벤트 기록 → 세션 완료

3. **에러/엣지 케이스**
   - 장소 근처 배회 (출입 반복): 5분 이내 재진입 시 동일 이벤트로 처리 (디바운싱)
   - 권한 거부: 기능 비활성화 + "위치 권한이 필요합니다" 메시지 표시
   - 오프라인: 이벤트를 로컬에 저장 후 네트워크 복구 시 서버에 일괄 전송
   - 앱 종료 상태: OS의 Geofence 이벤트가 앱을 깨움 (expo-location background task)

---

## Scope (MoSCoW)

### Must have

1. **장소 CRUD** -- 집/회사 위치 등록, 수정, 삭제
2. **Geofence 모니터링** -- 등록 장소의 반경 진입/이탈 백그라운드 감지
3. **자동 출퇴근 기록** -- Geofence 이벤트를 commute_events 테이블에 저장
4. **세션 자동 생성** -- 출근 시작(집 이탈) 시 commute_sessions 자동 생성, 출근 완료(회사 진입) 시 세션 완료
5. **위치 권한 관리** -- iOS/Android 별 권한 요청 흐름, "항상 허용" 필요
6. **자동 감지 토글** -- 설정에서 ON/OFF 전환 가능
7. **Backend API** -- 장소 CRUD + 출퇴근 이벤트 기록 API
8. **디바운싱** -- 경계선 근처 진입/이탈 반복 방지 (5분 쿨다운)

### Should have

9. **반경 조절** -- 장소별 Geofence 반경 100~500m 슬라이더
10. **감지 알림** -- "출근 시작을 감지했어요" 로컬 푸시 알림
11. **이벤트 히스토리** -- 최근 감지 이벤트 목록 조회 (디버깅/확인용)
12. **오프라인 큐** -- 네트워크 없을 때 이벤트 로컬 저장 후 재전송

### Could have

13. **지도 미리보기** -- 장소 등록 시 지도에서 현재 위치 + 반경 시각화
14. **주소 검색** -- 주소 텍스트로 위치 검색 (Geocoding)
15. **퇴근 세션** -- 퇴근 시작(회사 이탈) + 퇴근 완료(집 진입) 세션
16. **배터리 상태 표시** -- Geofence가 배터리에 미치는 영향 안내

### Won't have (this cycle)

- **Live Activity 연동**: P2-5에서 별도 구현
- **스마트 출발 알림 연동**: P2-2에서 별도 구현
- **경로별 자동 매칭**: 어떤 경로를 타는지까지는 감지하지 않음 (위치 기반 출발/도착만)
- **여러 회사/집 지원**: 이번 사이클에서는 집 1개 + 회사 1개 고정
- **Wi-Fi SSID 기반 감지**: Geofence만 사용
- **패턴 ML 연동**: P3-1에서 구현

---

## Data Model

### New Tables

#### `alert_system.user_places`

사용자가 등록한 장소 (집, 회사 등).

```sql
CREATE TABLE alert_system.user_places (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES alert_system.users(id) ON DELETE CASCADE,
  place_type  VARCHAR(20) NOT NULL,   -- 'home' | 'work'
  label       VARCHAR(100) NOT NULL,  -- "우리집", "회사" 등 사용자 지정 라벨
  latitude    DOUBLE PRECISION NOT NULL,
  longitude   DOUBLE PRECISION NOT NULL,
  address     VARCHAR(500),           -- 역지오코딩된 주소 (표시용)
  radius_m    INTEGER NOT NULL DEFAULT 200,  -- Geofence 반경 (미터)
  is_active   BOOLEAN NOT NULL DEFAULT true, -- Geofence 활성 여부
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX user_places_user_id_idx ON alert_system.user_places(user_id);
CREATE UNIQUE INDEX user_places_user_type_unique ON alert_system.user_places(user_id, place_type);
-- 사용자당 place_type은 하나만 (집 1개, 회사 1개)
```

**Constraints:**
- `place_type`: `home` 또는 `work` (이번 사이클)
- `radius_m`: 100 이상 500 이하
- `user_id + place_type` unique: 사용자당 집 1개, 회사 1개

#### `alert_system.commute_events`

Geofence 이벤트 원시 기록. 디바운싱 전 모든 이벤트를 저장.

```sql
CREATE TABLE alert_system.commute_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES alert_system.users(id) ON DELETE CASCADE,
  place_id        UUID NOT NULL REFERENCES alert_system.user_places(id) ON DELETE CASCADE,
  event_type      VARCHAR(20) NOT NULL,  -- 'enter' | 'exit'
  triggered_at    TIMESTAMPTZ NOT NULL,  -- 디바이스에서 감지된 시각
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),  -- 서버에 기록된 시각
  latitude        DOUBLE PRECISION,      -- 감지 시점 좌표 (정밀도 확인용)
  longitude       DOUBLE PRECISION,
  accuracy_m      DOUBLE PRECISION,      -- 위치 정확도 (미터)
  session_id      UUID REFERENCES alert_system.commute_sessions(id) ON DELETE SET NULL,
  -- 이 이벤트로 생성/완료된 세션
  source          VARCHAR(20) NOT NULL DEFAULT 'geofence',  -- 'geofence' | 'manual'
  is_processed    BOOLEAN NOT NULL DEFAULT false,  -- 비즈니스 로직 처리 완료 여부
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX commute_events_user_id_idx ON alert_system.commute_events(user_id);
CREATE INDEX commute_events_place_id_idx ON alert_system.commute_events(place_id);
CREATE INDEX commute_events_triggered_at_idx ON alert_system.commute_events(triggered_at);
CREATE INDEX commute_events_user_triggered_idx ON alert_system.commute_events(user_id, triggered_at);
CREATE INDEX commute_events_unprocessed_idx ON alert_system.commute_events(user_id, is_processed)
  WHERE is_processed = false;
```

### Existing Tables (Integration)

#### `alert_system.commute_sessions` (기존, 변경 없음)

자동 감지로 생성된 세션은 기존 테이블에 저장된다. 구분을 위해 `notes` 필드에 `[auto]` 접두사를 추가한다. (스키마 변경 최소화)

> 향후 `source` 컬럼 추가를 고려하지만, 이번 사이클에서는 notes 필드 활용으로 충분하다.

### Entity Relationships

```
users (1) ──── (N) user_places
  │                    │
  │                    │
  (1)                 (1)
  │                    │
  (N)                 (N)
commute_sessions    commute_events
  │                    │
  └── (1) ── (N) ──────┘
     session_id FK
```

---

## Backend API

### 장소 관리 (Places)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/places` | 내 장소 목록 조회 |
| `POST` | `/places` | 장소 등록 |
| `PUT` | `/places/:id` | 장소 수정 (위치, 반경, 라벨) |
| `DELETE` | `/places/:id` | 장소 삭제 |
| `PATCH` | `/places/:id/toggle` | 장소 Geofence 활성/비활성 토글 |

#### Request/Response

**POST /places**
```typescript
// Request
interface CreatePlaceDto {
  placeType: 'home' | 'work';
  label: string;          // "우리집", "회사" 등
  latitude: number;       // -90 ~ 90
  longitude: number;      // -180 ~ 180
  address?: string;       // 선택: 주소 텍스트
  radiusM?: number;       // 선택: 기본 200, 범위 100~500
}

// Response (201)
interface PlaceResponseDto {
  id: string;
  userId: string;
  placeType: 'home' | 'work';
  label: string;
  latitude: number;
  longitude: number;
  address?: string;
  radiusM: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

**PUT /places/:id**
```typescript
interface UpdatePlaceDto {
  label?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  radiusM?: number;      // 100~500
}
```

**Error cases:**
- 409 Conflict: 동일 placeType이 이미 존재
- 400 Bad Request: 반경이 100~500 범위를 벗어남
- 403 Forbidden: 다른 사용자의 장소 접근
- 404 Not Found: 장소 ID가 존재하지 않음

### 출퇴근 이벤트 (Commute Events)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/commute/events` | 이벤트 기록 (모바일에서 호출) |
| `POST` | `/commute/events/batch` | 오프라인 이벤트 일괄 전송 |
| `GET` | `/commute/events` | 최근 이벤트 목록 조회 |

#### Request/Response

**POST /commute/events**
```typescript
// Request
interface RecordCommuteEventDto {
  placeId: string;          // UUID
  eventType: 'enter' | 'exit';
  triggeredAt: string;      // ISO 8601
  latitude?: number;        // 감지 시점 좌표
  longitude?: number;
  accuracyM?: number;       // 위치 정확도 (미터)
}

// Response (201)
interface CommuteEventResponseDto {
  id: string;
  userId: string;
  placeId: string;
  placeType: 'home' | 'work';
  eventType: 'enter' | 'exit';
  triggeredAt: string;
  sessionId?: string;       // 이벤트로 인해 생성/완료된 세션 ID
  action?: 'commute_started' | 'commute_completed' | 'return_started' | 'return_completed' | 'ignored';
  // action이 'ignored'이면 디바운싱 등으로 무시됨
}
```

**POST /commute/events/batch**
```typescript
// Request
interface BatchCommuteEventsDto {
  events: RecordCommuteEventDto[];  // 최대 50개
}

// Response (201)
interface BatchCommuteEventsResponseDto {
  processed: number;
  ignored: number;          // 디바운싱으로 무시된 수
  results: CommuteEventResponseDto[];
}
```

### Event Processing Logic (Server-side)

```
이벤트 수신 → 디바운싱 체크 → 비즈니스 로직 → 세션 생성/완료
```

**디바운싱 규칙:**
- 같은 장소 + 같은 이벤트 유형이 5분 이내에 반복되면 무시
- `is_processed = false`인 이벤트 중 동일 조건 확인

**비즈니스 로직 (이벤트 → 세션 변환):**

| 이벤트 | 의미 | 액션 |
|--------|------|------|
| 집(home) exit | 출근 시작 | 새 commute_session 생성 (status: in_progress, notes: '[auto] 출근') |
| 회사(work) enter | 출근 완료 | 진행 중인 출근 세션 완료 (status: completed) |
| 회사(work) exit | 퇴근 시작 | 새 commute_session 생성 (status: in_progress, notes: '[auto] 퇴근') |
| 집(home) enter | 퇴근 완료 | 진행 중인 퇴근 세션 완료 (status: completed) |

**세션 매칭 규칙:**
- "진행 중인 세션"은 같은 날, 같은 사용자의 `status = 'in_progress'` 세션
- 24시간 이상 진행 중인 세션은 자동 취소 (stale session cleanup)
- 출근 세션이 없는 상태에서 회사 진입 시: 세션 없이 이벤트만 기록 (이전에 수동 시작했을 수 있음)

**시간대 규칙:**
- 출근 판정 시간대: 05:00~12:00 (home exit)
- 퇴근 판정 시간대: 14:00~23:59 (work exit)
- 시간대 외 이벤트: 이벤트만 기록, 세션은 생성하지 않음

---

## Mobile Implementation

### expo-location Geofencing

```typescript
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

const GEOFENCE_TASK_NAME = 'commute-geofence-task';

// 1. Background task 등록 (앱 최상위)
TaskManager.defineTask(GEOFENCE_TASK_NAME, ({ data, error }) => {
  if (error) {
    console.error('Geofence task error:', error);
    return;
  }
  const { eventType, region } = data as {
    eventType: Location.GeofencingEventType;
    region: Location.LocationRegion;
  };
  // 이벤트를 서버에 전송 (또는 오프라인 큐에 저장)
  handleGeofenceEvent(eventType, region);
});

// 2. Geofence 시작
async function startGeofencing(places: UserPlace[]): Promise<void> {
  const regions: Location.LocationRegion[] = places
    .filter(p => p.isActive)
    .map(p => ({
      identifier: p.id,
      latitude: p.latitude,
      longitude: p.longitude,
      radius: p.radiusM,
      notifyOnEnter: true,
      notifyOnExit: true,
    }));

  await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, regions);
}

// 3. Geofence 중지
async function stopGeofencing(): Promise<void> {
  await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
}
```

### Permission Flow

#### iOS

```
1. requestForegroundPermissionsAsync() → "앱 사용 중 허용"
2. requestBackgroundPermissionsAsync() → "항상 허용"
   └── iOS 13+: 처음에는 "한 번만 허용" 또는 "앱 사용 중 허용"만 표시
   └── 며칠 후 iOS가 "계속 허용하시겠습니까?" 시스템 다이얼로그 표시
   └── 설정 > 앱 > 위치 > "항상"으로 변경 안내 필요
3. "항상 허용"이 아니면 Geofencing 동작 안 함 → 안내 표시
```

#### Android

```
1. requestForegroundPermissionsAsync() → ACCESS_FINE_LOCATION
2. requestBackgroundPermissionsAsync() → ACCESS_BACKGROUND_LOCATION (Android 10+)
   └── Android 10: "항상 허용" 옵션 직접 표시
   └── Android 11+: "설정에서 항상 허용으로 변경" 안내 필요
   └── Android 12+: 추가로 "정확한 위치" vs "대략적 위치" 선택
3. Battery optimization 예외 설정 안내 (제조사별 다름)
```

#### Permission UI States

```
┌─────────────────────────────────────────────────┐
│ 상태 1: 권한 미요청                              │
│ ┌─────────────────────────────────────┐          │
│ │ 위치 권한이 필요합니다                │          │
│ │ 출퇴근 자동 감지를 위해              │          │
│ │ 위치 권한을 허용해주세요.             │          │
│ │                                     │          │
│ │     [권한 허용하기]                  │          │
│ └─────────────────────────────────────┘          │
├─────────────────────────────────────────────────┤
│ 상태 2: 포그라운드만 허용됨                       │
│ ┌─────────────────────────────────────┐          │
│ │ ⚠️ 백그라운드 위치 권한 필요          │          │
│ │ 앱을 닫아도 출퇴근을 감지하려면       │          │
│ │ "항상 허용"이 필요합니다.             │          │
│ │                                     │          │
│ │     [설정으로 이동]                  │          │
│ └─────────────────────────────────────┘          │
├─────────────────────────────────────────────────┤
│ 상태 3: 항상 허용됨 ✅                            │
│ ┌─────────────────────────────────────┐          │
│ │ ✅ 위치 권한: 항상 허용               │          │
│ │ 자동 출퇴근 감지가 활성화되어 있습니다.│          │
│ └─────────────────────────────────────┘          │
├─────────────────────────────────────────────────┤
│ 상태 4: 권한 거부됨                              │
│ ┌─────────────────────────────────────┐          │
│ │ ❌ 위치 권한 거부됨                   │          │
│ │ 자동 감지를 사용하려면               │          │
│ │ 설정에서 위치 권한을 변경해주세요.     │          │
│ │                                     │          │
│ │     [설정 열기]                      │          │
│ └─────────────────────────────────────┘          │
└─────────────────────────────────────────────────┘
```

### Mobile File Structure

```
mobile/
  app/
    places.tsx                        # 장소 관리 화면 (설정에서 네비게이션)
  src/
    services/
      place.service.ts                # 장소 CRUD API 호출
      geofence.service.ts             # Geofence 시작/중지/이벤트 처리
      commute-event.service.ts        # 출퇴근 이벤트 API 호출
    hooks/
      usePlaces.ts                    # 장소 목록 조회/관리 훅
      useGeofence.ts                  # Geofence 상태/권한 관리 훅
      useLocationPermission.ts        # 위치 권한 상태 관리 훅
    types/
      place.ts                        # 장소 관련 타입
      commute-event.ts                # 출퇴근 이벤트 관련 타입
    components/
      places/
        PlaceCard.tsx                  # 장소 카드 (이름, 주소, 반경, 토글)
        PlaceFormModal.tsx             # 장소 등록/수정 모달
        RadiusSlider.tsx               # 반경 조절 슬라이더
        LocationPermissionBanner.tsx   # 위치 권한 상태 배너
        EmptyPlaceView.tsx             # 장소 미등록 빈 상태
```

### Settings Screen Integration

설정 화면에 "장소 관리" 섹션을 추가한다.

```
설정 화면
  ├── 프로필 카드
  ├── 바로가기 (Quick Links)
  ├── [NEW] 출퇴근 자동 감지     ← 신규 섹션
  │     ├── 자동 감지 토글 (ON/OFF)
  │     ├── 장소 관리 → places.tsx로 이동
  │     └── 위치 권한 상태 표시
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
      user-place.entity.ts
      commute-event.entity.ts
    repositories/
      user-place.repository.ts        # interface
      commute-event.repository.ts      # interface
  application/
    dto/
      place.dto.ts
      commute-event.dto.ts
    use-cases/
      manage-places.use-case.ts
      process-commute-event.use-case.ts
  infrastructure/
    persistence/
      typeorm/
        user-place.entity.ts           # ORM entity
        commute-event.entity.ts        # ORM entity
      repositories/
        user-place.repository.ts       # implementation
        commute-event.repository.ts    # implementation
  presentation/
    controllers/
      places.controller.ts
    modules/
      places.module.ts
```

### Event Processing Use Case (핵심 로직)

```typescript
class ProcessCommuteEventUseCase {
  async execute(userId: string, dto: RecordCommuteEventDto): Promise<CommuteEventResponseDto> {
    // 1. 장소 조회
    const place = await this.placeRepo.findById(dto.placeId);
    if (!place || place.userId !== userId) throw new ForbiddenException();

    // 2. 디바운싱 체크
    const recentEvent = await this.eventRepo.findRecent(
      userId, dto.placeId, dto.eventType, 5 * 60 * 1000 // 5분
    );
    if (recentEvent) {
      return { ...event, action: 'ignored' };
    }

    // 3. 이벤트 저장
    const event = await this.eventRepo.save({ ...dto, userId });

    // 4. 시간대 체크
    const hour = new Date(dto.triggeredAt).getHours();
    const action = this.determineAction(place.placeType, dto.eventType, hour);

    // 5. 세션 생성/완료
    if (action === 'commute_started' || action === 'return_started') {
      const session = await this.sessionRepo.create({
        userId,
        routeId: await this.getPreferredRouteId(userId, place.placeType),
        notes: action === 'commute_started' ? '[auto] 출근' : '[auto] 퇴근',
      });
      event.sessionId = session.id;
    } else if (action === 'commute_completed' || action === 'return_completed') {
      const activeSession = await this.sessionRepo.findInProgress(userId);
      if (activeSession) {
        await this.sessionRepo.complete(activeSession.id);
        event.sessionId = activeSession.id;
      }
    }

    // 6. 이벤트 처리 완료 표시
    await this.eventRepo.markProcessed(event.id);

    return { ...event, action };
  }

  private determineAction(
    placeType: 'home' | 'work',
    eventType: 'enter' | 'exit',
    hour: number
  ): string {
    if (placeType === 'home' && eventType === 'exit' && hour >= 5 && hour < 12) {
      return 'commute_started';      // 출근 시작
    }
    if (placeType === 'work' && eventType === 'enter' && hour >= 5 && hour < 14) {
      return 'commute_completed';    // 출근 완료
    }
    if (placeType === 'work' && eventType === 'exit' && hour >= 14 && hour < 24) {
      return 'return_started';       // 퇴근 시작
    }
    if (placeType === 'home' && eventType === 'enter' && hour >= 14 && hour < 24) {
      return 'return_completed';     // 퇴근 완료
    }
    return 'ignored';                // 시간대 외
  }
}
```

---

## Acceptance Criteria

### 장소 관리

- [ ] Given 로그인된 사용자가 장소 관리 화면에 진입했을 때, When 등록된 장소가 없으면, Then "집과 회사를 등록하면 출퇴근을 자동으로 감지해요" 빈 상태 메시지가 표시된다.
- [ ] Given 장소 등록 폼에서, When "현재 위치 사용" 버튼을 탭하면, Then 현재 GPS 좌표가 위도/경도 필드에 채워지고 역지오코딩된 주소가 표시된다.
- [ ] Given 집 장소를 등록할 때, When 이미 집이 등록되어 있으면, Then "이미 등록된 집이 있습니다. 수정하시겠습니까?" 확인 모달이 표시된다.
- [ ] Given 장소를 수정할 때, When 반경 슬라이더를 200m에서 300m로 변경하고 저장하면, Then 서버에 새 반경이 저장되고 Geofence가 업데이트된다.
- [ ] Given 장소를 삭제할 때, When 확인 버튼을 누르면, Then 해당 장소의 Geofence가 중지되고 서버에서 삭제된다.

### Geofence 모니터링

- [ ] Given 집과 회사가 모두 등록되고 자동 감지가 ON일 때, When 사용자가 집 반경(200m)을 벗어나면, Then "출근 시작을 감지했어요" 로컬 알림이 표시되고 commute_events에 'home/exit' 이벤트가 기록된다.
- [ ] Given 출근 시작 이벤트가 기록된 상태에서, When 사용자가 회사 반경에 진입하면, Then 진행 중인 commute_session이 완료되고 총 소요 시간이 계산된다.
- [ ] Given 사용자가 집 반경 경계선 근처에서 5분 이내에 이탈/진입을 반복할 때, When 두 번째 이탈 이벤트가 발생하면, Then 디바운싱에 의해 무시되고 action이 'ignored'로 응답된다.
- [ ] Given 자동 감지가 OFF일 때, When 사용자가 집을 나가면, Then Geofence 이벤트가 발생하지 않고 세션이 생성되지 않는다.

### 위치 권한

- [ ] Given iOS에서 위치 권한이 "앱 사용 중"만 허용된 상태일 때, When 자동 감지를 켜려 하면, Then "백그라운드 위치 권한이 필요합니다" 배너와 "설정으로 이동" 버튼이 표시된다.
- [ ] Given Android에서 위치 권한이 거부된 상태일 때, When 장소 등록을 시도하면, Then 위치 권한 요청 다이얼로그가 표시된다.
- [ ] Given 위치 권한이 "항상 허용"인 상태에서, When 사용자가 시스템 설정에서 권한을 "사용 중에만"으로 변경하고 앱으로 돌아오면, Then 권한 상태가 업데이트되고 경고 배너가 표시된다.

### 시간대 규칙

- [ ] Given 새벽 3시에, When 사용자가 집 반경을 벗어나면, Then 이벤트는 기록되지만 commute_session은 생성되지 않는다 (action: 'ignored').
- [ ] Given 오후 3시에, When 사용자가 회사 반경을 벗어나면, Then 퇴근 시작 세션이 생성된다 (action: 'return_started').

### 오프라인 처리

- [ ] Given 네트워크가 없는 상태에서, When Geofence 이벤트가 발생하면, Then 이벤트가 로컬 AsyncStorage에 저장되고 네트워크 복구 시 `/commute/events/batch`로 일괄 전송된다.

### 기존 기능 연동

- [ ] Given 자동 감지로 commute_session이 생성/완료되었을 때, When 통근 기록 화면을 조회하면, Then 기존 수동 세션과 함께 자동 세션도 표시되며 '[auto]' 표시로 구분된다.
- [ ] Given 자동 감지로 세션이 완료되었을 때, When 스트릭이 활성화되어 있으면, Then 스트릭 카운트가 자동으로 증가한다.

---

## Task Breakdown

### Backend (BE)

| # | Task | Size | Deps | Description |
|---|------|------|------|-------------|
| BE-1 | user-place 도메인 엔티티 + ORM 엔티티 | S | none | `UserPlace` 도메인 엔티티, TypeORM 엔티티, 리포지토리 인터페이스 |
| BE-2 | commute-event 도메인 엔티티 + ORM 엔티티 | S | none | `CommuteEvent` 도메인 엔티티, TypeORM 엔티티, 리포지토리 인터페이스 |
| BE-3 | user-place 리포지토리 구현 | S | BE-1 | TypeORM 리포지토리 구현 (CRUD + findByUserId + findByUserAndType) |
| BE-4 | commute-event 리포지토리 구현 | S | BE-2 | TypeORM 리포지토리 구현 (save + findRecent + findByUserId + markProcessed + batch) |
| BE-5 | 장소 관리 DTO + Validation | S | none | CreatePlaceDto, UpdatePlaceDto, PlaceResponseDto + class-validator 규칙 |
| BE-6 | 출퇴근 이벤트 DTO + Validation | S | none | RecordCommuteEventDto, BatchDto, ResponseDto |
| BE-7 | ManagePlaces UseCase | M | BE-1, BE-3, BE-5 | 장소 CRUD 비즈니스 로직 (unique 체크, 반경 유효성 등) |
| BE-8 | ProcessCommuteEvent UseCase | L | BE-2, BE-4, BE-6 | 이벤트 처리 핵심 로직 (디바운싱 + 시간대 판단 + 세션 생성/완료) |
| BE-9 | Places Controller + Module | M | BE-7 | REST 엔드포인트 + JWT Guard + 권한 검사 |
| BE-10 | Commute Event Endpoints (기존 Controller 확장) | M | BE-8 | `/commute/events`, `/commute/events/batch` 엔드포인트 추가 |
| BE-11 | Stale Session Cleanup | S | BE-8 | 24시간 이상 in_progress 세션 자동 취소 (cron 또는 이벤트 처리 시) |
| BE-12 | Backend Unit Tests | M | BE-7, BE-8 | UseCase 테스트 (디바운싱, 시간대, 세션 매칭 로직) |

### Mobile (FE)

| # | Task | Size | Deps | Description |
|---|------|------|------|-------------|
| FE-1 | 장소 타입 정의 + API 서비스 | S | BE-9 | `place.ts` 타입, `place.service.ts` API 클라이언트 |
| FE-2 | 출퇴근 이벤트 타입 + API 서비스 | S | BE-10 | `commute-event.ts` 타입, `commute-event.service.ts` API 클라이언트 |
| FE-3 | useLocationPermission 훅 | M | none | 위치 권한 요청/상태 관리 (iOS/Android 분기) |
| FE-4 | useGeofence 훅 | L | FE-1, FE-3 | Geofence 시작/중지, 이벤트 처리, 오프라인 큐 |
| FE-5 | usePlaces 훅 | S | FE-1 | 장소 CRUD 상태 관리 (fetch, create, update, delete) |
| FE-6 | geofence.service.ts | M | FE-2, FE-3 | TaskManager 등록, 이벤트 핸들링, 오프라인 큐 관리 |
| FE-7 | PlaceCard 컴포넌트 | S | none | 장소 카드 UI (라벨, 주소, 반경, 활성 토글) |
| FE-8 | PlaceFormModal 컴포넌트 | M | FE-3 | 장소 등록/수정 모달 (현재 위치, 반경 슬라이더) |
| FE-9 | RadiusSlider 컴포넌트 | S | none | 100~500m 반경 슬라이더 + 숫자 표시 |
| FE-10 | LocationPermissionBanner 컴포넌트 | S | FE-3 | 권한 상태별 배너 (4가지 상태) |
| FE-11 | places.tsx 화면 | M | FE-5, FE-7, FE-8, FE-10 | 장소 관리 전체 화면 (목록 + 추가 + 빈 상태) |
| FE-12 | 설정 화면 통합 | S | FE-11, FE-4 | 설정 화면에 "출퇴근 자동 감지" 섹션 추가 |
| FE-13 | 히스토리 화면 '[auto]' 표시 | S | none | 기존 통근 기록 화면에서 자동 감지 세션 구분 표시 |

---

## Battery & Performance

### 배터리 영향 최소화 전략

| 항목 | 설계 | 이유 |
|------|------|------|
| **위치 추적 방식** | Geofencing only (연속 GPS 사용 안 함) | OS 레벨 최적화, 배터리 1~3% 미만 |
| **Geofence 개수** | 최대 2개 (집, 회사) | iOS 20개 / Android 100개 제한 내에서 여유 |
| **이벤트 전송** | 이벤트 발생 시에만 API 호출 (하루 4회 이하) | 폴링 없음, 배경 네트워크 최소화 |
| **오프라인 처리** | AsyncStorage에 큐잉 후 일괄 전송 | 네트워크 재시도 최소화 |

### expo-location 설정

```typescript
// Geofencing은 별도 accuracy 설정 불필요
// OS가 자체적으로 셀 타워, Wi-Fi, 저전력 위치 활용
// expo-location의 startGeofencingAsync만 호출하면 됨

// 주의: watchPositionAsync, getCurrentPositionAsync는
// 장소 등록 시 "현재 위치" 가져올 때만 1회 사용
```

---

## Open Questions

1. **경로 자동 매칭**: 사용자에게 여러 경로가 있을 때, 자동 세션에 어떤 routeId를 연결할 것인가?
   - **현재 결정**: preferred(기본) 경로 사용. 없으면 가장 최근 생성된 경로 사용.
   - **향후**: P3-1 패턴 분석에서 요일별 경로 자동 매칭 구현.

2. **재택근무 날**: 사용자가 집에서 나가지 않으면 이벤트가 발생하지 않으므로 자연스럽게 기록되지 않음. 별도 처리 불필요.

3. **출장/휴가**: 회사가 아닌 다른 위치로 가면 출근 완료 이벤트가 발생하지 않음. 세션이 24시간 후 자동 취소됨. 수동으로 취소할 수도 있음.

4. **Expo managed workflow 제약**: `expo-location`의 Geofencing은 managed workflow에서 지원됨. 별도 config plugin 불필요.

---

## Out of Scope

- **다중 장소 (3개 이상)**: 이번 사이클에서는 집 1개 + 회사 1개 고정. 커스텀 장소(카페, 헬스장 등)는 향후 확장.
- **Geofence + 모션 센서 결합**: iOS의 CMMotionActivityManager 등을 활용한 이동 수단 판별은 P3에서 검토.
- **실시간 위치 공유**: 이 기능은 "감지"만 하며 위치를 서버에 연속 전송하지 않음.
- **Apple Watch / Wear OS 연동**: 네이티브 위치 API를 별도로 구현해야 하므로 이번 사이클 제외.
- **Geofence 정확도 튜닝**: OS에 의존. 도심에서 50~100m 오차는 예상되며, 반경 조절로 대응.

---

## Risk & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| iOS에서 "항상 허용" 거부율 높음 | High | High | 명확한 가치 설명 + 권한 요청 전 사전 설명 화면 |
| Geofence 감지 지연 (수 분) | Medium | Medium | UX에서 "약간의 지연이 있을 수 있습니다" 안내 |
| 도심 GPS 오차로 잘못된 감지 | Medium | Low | 기본 반경 200m + 디바운싱 5분으로 완화 |
| 배터리 소모 우려 사용자 이탈 | Low | Medium | 배터리 영향 최소 표시 + 토글로 끌 수 있음 |
| Android 제조사별 백그라운드 제한 | High | High | dontkillmyapp.com 참조하여 제조사별 설정 안내 |

---

*v1.0 | 2026-02-19 | PM Agent*
