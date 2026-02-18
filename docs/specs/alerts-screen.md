# P1-3: 알림 설정 화면 (CRUD + 토글)

> Cycle 26 | Branch: `feature/alerts-screen` | 2026-02-19

---

## JTBD

**When** 매일 아침/저녁 출퇴근 시간에 날씨, 미세먼지, 교통 정보가 필요할 때,
**I want to** 원하는 시간과 요일에 알림을 설정하고 간편하게 관리하고 싶다,
**So I can** 앱을 매번 열지 않아도 필요한 정보를 자동으로 받아볼 수 있다.

---

## Problem

- **Who:** 대중교통으로 출퇴근하는 수도권 직장인 (25~45세)
- **Pain:** 매일 아침 날씨/미세먼지/교통 앱 3~4개를 열어 확인해야 한다 (빈도: 매일 2회, 심각도: 중)
- **Current workaround:** 직접 앱을 열거나, 기상 알람 후 감으로 판단
- **Success metric:** 알림 생성 완료율 > 90%, 토글/삭제 조작 시간 < 1초

---

## Solution

### Overview

기존 PWA 알림 설정의 핵심 기능(CRUD + 토글)을 React Native로 재구현한다. PWA의 위저드 패턴(5단계)은 모바일에서 과도하므로, **단일 모달 폼 + 직관적 피커**로 단순화한다. 알림 목록은 FlatList로 구현하고, 토글은 네이티브 Switch, 삭제는 스와이프 제스처를 지원한다.

기존 백엔드 API(`/alerts/*`)를 100% 재사용하며, 모바일 API 클라이언트(`apiClient`)를 통해 호출한다.

### 사용자 플로우

```
[알림 탭 진입]
     │
     ├─ 비로그인 → GuestView (로그인 유도 메시지)
     │
     ├─ 로그인 + 알림 0개 → EmptyState ("알림이 없어요" + "새 알림 추가" 버튼)
     │
     └─ 로그인 + 알림 있음 → AlertList (FlatList)
              │
              ├─ FAB(+) 탭 → CreateModal (새 알림 생성 폼)
              │     └─ 저장 → API POST → 목록 갱신 → 모달 닫힘
              │
              ├─ 알림 카드 탭 → EditModal (수정 폼, 기존 데이터 프리필)
              │     └─ 저장 → API PATCH → 목록 갱신 → 모달 닫힘
              │
              ├─ Switch 토글 → 낙관적 업데이트 → API PATCH /toggle
              │     └─ 실패 시 → 롤백 + 에러 토스트
              │
              └─ 왼쪽 스와이프 → 삭제 버튼 노출 → 탭 → 확인 Alert
                    └─ 확인 → API DELETE → 목록에서 제거
```

---

## 데이터 모델

### Alert (모바일 타입 정의)

기존 `mobile/src/types/home.ts`의 `Alert` 타입을 확장한다.

```typescript
// mobile/src/types/alert.ts

export type AlertType = 'weather' | 'airQuality' | 'bus' | 'subway';

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;
// 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토

export type Alert = {
  id: string;
  userId: string;
  name: string;
  schedule: string;        // cron 표현식: "0 8 * * 1-5"
  alertTypes: AlertType[];
  enabled: boolean;
  busStopId?: string;
  subwayStationId?: string;
  routeId?: string;
};

export type CreateAlertPayload = {
  userId: string;
  name: string;
  schedule: string;        // cron 표현식
  alertTypes: AlertType[];
  busStopId?: string;
  subwayStationId?: string;
  routeId?: string;
};

export type UpdateAlertPayload = {
  name?: string;
  schedule?: string;
  alertTypes?: AlertType[];
  enabled?: boolean;
};
```

### Schedule (Cron) 파싱 유틸

시간/요일 정보를 cron 표현식으로 변환하고, 사람이 읽을 수 있는 형태로 역변환한다.

```typescript
// cron 형식: "분 시 * * 요일"
// 예: "0 8 * * 1-5"  → 평일 08:00
// 예: "30 7 * * *"   → 매일 07:30
// 예: "0 8 * * 1,3,5" → 월,수,금 08:00

// 모바일 폼 → cron 변환
function toCron(hour: number, minute: number, days: DayOfWeek[]): string;

// cron → 사람이 읽는 한국어 변환 (기존 cron-utils.ts 로직 재사용)
function cronToHuman(cron: string): string;
```

---

## API Contract

기존 백엔드 API를 그대로 사용한다. 모든 요청에 JWT `Authorization: Bearer {token}` 헤더 필수.

### 1. 알림 목록 조회

```
GET /alerts/user/:userId

Headers:
  Authorization: Bearer {token}

Response: 200 OK
[
  {
    "id": "uuid",
    "userId": "uuid",
    "name": "아침 날씨 알림",
    "schedule": "0 8 * * 1-5",
    "alertTypes": ["weather", "airQuality"],
    "enabled": true,
    "busStopId": null,
    "subwayStationId": null,
    "routeId": null
  }
]

Errors:
  401 Unauthorized — 토큰 만료/무효
  403 Forbidden — 다른 사용자의 알림 조회 시도
```

### 2. 알림 생성

```
POST /alerts

Headers:
  Authorization: Bearer {token}
  Content-Type: application/json

Body:
{
  "userId": "uuid",
  "name": "출근 교통 알림",
  "schedule": "0 7 * * 1-5",
  "alertTypes": ["subway", "weather"]
}

Response: 201 Created
{
  "id": "new-uuid",
  "userId": "uuid",
  "name": "출근 교통 알림",
  "schedule": "0 7 * * 1-5",
  "alertTypes": ["subway", "weather"],
  "enabled": true,
  ...
}

Errors:
  400 Bad Request — 유효성 검증 실패 (이름 빈값, 잘못된 cron, alertTypes 비어있음)
  401 Unauthorized
  403 Forbidden — userId 불일치
```

### 3. 알림 수정

```
PATCH /alerts/:id

Headers:
  Authorization: Bearer {token}
  Content-Type: application/json

Body (모두 optional):
{
  "name": "수정된 이름",
  "schedule": "30 7 * * *",
  "alertTypes": ["weather"]
}

Response: 200 OK
{ ...updatedAlert }

Errors:
  400 Bad Request — 유효성 검증 실패
  401 Unauthorized
  403 Forbidden — 다른 사용자의 알림
  404 Not Found — 존재하지 않는 알림 ID
```

### 4. 알림 토글

```
PATCH /alerts/:id/toggle

Headers:
  Authorization: Bearer {token}

Body: {} (빈 객체)

Response: 200 OK
{ ...alertWithToggledEnabled }

Errors:
  401 Unauthorized
  403 Forbidden
  404 Not Found
```

### 5. 알림 삭제

```
DELETE /alerts/:id

Headers:
  Authorization: Bearer {token}

Response: 200 OK
{ "message": "Alert deleted" }

Errors:
  401 Unauthorized
  403 Forbidden
  404 Not Found
```

---

## 화면 상태 (Screen States)

### 1. 비로그인 상태 (Guest View)

```
┌──────────────────────────────────┐
│  알림 설정                        │
│                                  │
│         🔔                       │
│   로그인이 필요합니다              │
│   알림을 설정하려면                │
│   먼저 로그인해주세요              │
│                                  │
│     [ 로그인하기 ]                │
│                                  │
└──────────────────────────────────┘
```

- "로그인하기" 버튼 → `/(auth)/login` 으로 이동

### 2. 로딩 상태 (Loading)

```
┌──────────────────────────────────┐
│  알림 설정                        │
│                                  │
│  ┌──────────────────────────┐    │
│  │ ░░░░░░░░  ░░░░░░  ░░░░ │    │  ← SkeletonCard x 3
│  └──────────────────────────┘    │
│  ┌──────────────────────────┐    │
│  │ ░░░░░░░░  ░░░░░░  ░░░░ │    │
│  └──────────────────────────┘    │
│  ┌──────────────────────────┐    │
│  │ ░░░░░░░░  ░░░░░░  ░░░░ │    │
│  └──────────────────────────┘    │
└──────────────────────────────────┘
```

- 기존 `SkeletonCard` 컴포넌트 재사용 (3개)

### 3. 빈 상태 (Empty State)

```
┌──────────────────────────────────┐
│  알림 설정                        │
│                                  │
│         🔔                       │
│    알림이 없어요                   │
│    출퇴근 알림을 추가해보세요        │
│                                  │
│     [ + 새 알림 추가 ]            │
│                                  │
└──────────────────────────────────┘
```

- "새 알림 추가" 버튼 → 생성 모달 열기

### 4. 에러 상태 (Error)

```
┌──────────────────────────────────┐
│  알림 설정                        │
│                                  │
│         ⚠️                       │
│    알림을 불러올 수 없어요          │
│    네트워크 연결을 확인해주세요      │
│                                  │
│     [ 다시 시도 ]                 │
│                                  │
└──────────────────────────────────┘
```

### 5. 알림 목록 (List View) — 핵심 화면

```
┌──────────────────────────────────┐
│  알림 설정                 2/3 활성│
│                                  │
│  ┌──────────────────────────┐    │
│  │ 07:00  아침 날씨 알림    [ON]│    │
│  │ 평일 · 날씨, 미세먼지         │
│  └──────────────────────────┘    │
│                                  │
│  ┌──────────────────────────┐    │
│  │ 07:30  출근 교통 알림    [ON]│    │
│  │ 평일 · 지하철              │
│  └──────────────────────────┘    │
│                                  │
│  ┌──────────────────────────┐    │
│  │ 18:00  퇴근 알림        [OFF]│    │  ← 비활성: 회색 처리
│  │ 매일 · 날씨, 지하철          │
│  └──────────────────────────┘    │
│                                  │
│                           [+]    │  ← FAB (FloatingActionButton)
└──────────────────────────────────┘
```

**카드 구성 요소:**
- 시간 (크게, bold) — cron에서 추출한 HH:MM
- 알림 이름 — 사용자 지정 이름
- Switch 토글 — 활성/비활성
- 요일 라벨 — "매일", "평일", "주말", "월,수,금"
- 알림 유형 태그 — "날씨", "미세먼지", "지하철", "버스"

**인터랙션:**
- 카드 탭 → 수정 모달 열기
- Switch 탭 → 낙관적 토글
- 왼쪽 스와이프 → 삭제 버튼 노출

### 6. 생성/수정 모달 (Create/Edit Modal)

```
┌──────────────────────────────────┐
│  ━━━━                            │  ← 드래그 핸들 (bottom sheet)
│                                  │
│  새 알림 추가  (또는 "알림 수정")   │
│                                  │
│  알림 이름                        │
│  ┌──────────────────────────┐    │
│  │ 아침 날씨 알림             │    │
│  └──────────────────────────┘    │
│                                  │
│  알림 시간                        │
│  ┌────────┬─:─┬────────┐        │
│  │  07    │   │  00    │        │  ← 시/분 스크롤 피커
│  │ [08]   │   │ [00]   │        │
│  │  09    │   │  30    │        │
│  └────────┴───┴────────┘        │
│                                  │
│  반복 요일                        │
│  ┌─┬─┬─┬─┬─┬─┬─┐               │
│  │일│월│화│수│목│금│토│               │  ← 개별 토글 버튼
│  │  │■│■│■│■│■│  │               │  ← 선택된 요일 = 파란색
│  └─┴─┴─┴─┴─┴─┴─┘               │
│  [ 평일 ]  [ 매일 ]  [ 주말 ]    │  ← 프리셋 버튼
│                                  │
│  알림 유형                        │
│  ┌─────────┐ ┌─────────┐        │
│  │ ☀ 날씨  │ │ 😷 미세  │        │  ← 멀티 선택 칩
│  │  [선택됨]│ │  먼지   │        │
│  └─────────┘ └─────────┘        │
│  ┌─────────┐ ┌─────────┐        │
│  │ 🚇 지하철│ │ 🚌 버스  │        │
│  └─────────┘ └─────────┘        │
│                                  │
│  ┌──────────────────────────┐    │
│  │          저장             │    │  ← Primary 버튼
│  └──────────────────────────┘    │
│                                  │
└──────────────────────────────────┘
```

---

## UX 상세 설계

### 1. 시간 피커 (Time Picker)

**구현 방식:** React Native의 `@react-native-community/datetimepicker` 또는 커스텀 스크롤 피커

**동작:**
- 기본값: 생성 시 08:00, 수정 시 기존 시간
- 시 선택: 0~23 (24시간 형식)
- 분 선택: 0, 5, 10, 15, ... 55 (5분 단위) 또는 0~59 (1분 단위)
- iOS: 네이티브 DatePicker (mode="time")
- Android: 네이티브 TimePicker 또는 커스텀 스크롤 피커

**추천:** iOS/Android 모두 플랫폼 네이티브 타임피커 사용 (`@react-native-community/datetimepicker`). 사용자에게 가장 익숙한 인터페이스.

### 2. 요일 선택기 (Day of Week Selector)

**구현:** 7개의 원형 토글 버튼 + 3개 프리셋 버튼

**요일 버튼:**
- 원형 (40x40) 버튼 7개, 가로 정렬
- 비선택: 회색 테두리, 회색 글씨
- 선택됨: 파란색 배경, 흰색 글씨
- 최소 1개 선택 필수 (전부 해제 시 "최소 1개 요일을 선택해주세요" 안내)

**프리셋 버튼:**
- `평일` → 월~금 (1,2,3,4,5) 선택
- `매일` → 일~토 (0,1,2,3,4,5,6) 전체 선택
- `주말` → 토,일 (0,6) 선택
- 프리셋 탭 시 해당 요일들만 선택 상태로 변경 (기존 선택 초기화)

**cron 변환 규칙:**
| 선택 | cron 요일 필드 |
|------|---------------|
| 매일 (0-6 전체) | `*` |
| 평일 (1-5) | `1-5` |
| 주말 (0,6) | `0,6` |
| 개별 (예: 1,3,5) | `1,3,5` |

### 3. 알림 유형 선택기 (Alert Type Selector)

**구현:** 4개의 멀티 선택 칩 (2x2 그리드)

| 타입 | 라벨 | 아이콘 |
|------|------|--------|
| `weather` | 날씨 | 해 아이콘 |
| `airQuality` | 미세먼지 | 마스크 아이콘 |
| `subway` | 지하철 | 지하철 아이콘 |
| `bus` | 버스 | 버스 아이콘 |

**동작:**
- 복수 선택 가능
- 최소 1개 선택 필수
- 선택됨: 파란색 테두리 + 파란색 배경 (연한) + 체크마크
- 비선택: 회색 테두리

### 4. 스와이프 삭제 UX

**구현:** `react-native-gesture-handler`의 Swipeable 또는 `react-native-reanimated` 기반 커스텀

**동작:**
1. 알림 카드를 왼쪽으로 80px 이상 스와이프
2. 빨간색 "삭제" 버튼이 오른쪽에서 노출
3. "삭제" 버튼 탭 → `Alert.alert()` 확인 다이얼로그
4. 확인 → API DELETE → 목록에서 애니메이션과 함께 제거
5. 취소 → 카드 원위치 복귀

**확인 다이얼로그:**
```
"알림 삭제"
"아침 날씨 알림"을 삭제하시겠습니까?

[취소]  [삭제]
```

### 5. 토글 스위치 동작

**구현:** React Native `Switch` 컴포넌트

**낙관적 업데이트 패턴:**
1. Switch 탭 → 즉시 UI 업데이트 (로컬 상태 반전)
2. API 호출: `PATCH /alerts/:id/toggle`
3. 성공 → 상태 유지
4. 실패 → UI 롤백 + 에러 토스트 ("알림 상태 변경에 실패했습니다")

**중복 탭 방지:** 토글 중인 알림 ID를 Set으로 관리, 진행 중이면 무시

**비활성 카드 스타일:**
- 전체 카드 opacity: 0.5
- 시간/이름 텍스트 색상: gray400

---

## Scope (MoSCoW)

### Must have (이번 사이클 필수)
- 알림 목록 조회 (FlatList, pull-to-refresh)
- 알림 생성 모달 (이름, 시간, 요일, 유형)
- 알림 수정 모달 (기존 데이터 프리필)
- 알림 삭제 (스와이프 + 확인 다이얼로그)
- 알림 토글 (Switch + 낙관적 업데이트)
- 빈 상태 / 로딩 상태 / 에러 상태
- 비로그인 → 로그인 유도 화면
- TypeScript 에러 0개

### Should have (중요, 없어도 동작)
- FAB(+) 애니메이션 (scale bounce)
- 스와이프 삭제 시 카드 사라지는 애니메이션
- 요일 프리셋 버튼 (평일/매일/주말)
- 알림 카드 정렬 (시간순)
- 헤더에 "N/M 활성" 카운터

### Could have (시간 여유 시)
- 생성 완료 시 햅틱 피드백 (`expo-haptics`)
- 스와이프 삭제 시 되돌리기 (Undo) 토스트
- 알림 유형별 아이콘 색상 구분
- 카드 롱프레스 → 삭제/수정 ActionSheet

### Won't have (이번 사이클 제외)
- 알림 기록(히스토리) 조회 — 별도 기능 (P2)
- 교통정보 연동 알림 생성 위저드 (PWA의 5단계 위저드) — 모바일에서는 단순 폼
- 경로 연결 (`routeId`) 설정 — 경로 화면 완성 후 추가
- 스마트 스케줄링 설정 — Phase 2 기능
- 푸시 알림 수신/표시 — 별도 사이클

---

## Acceptance Criteria

### 목록 조회
- [ ] Given 로그인된 사용자가 알림 탭에 진입, When 알림이 2개 이상 등록됨, Then FlatList에 모든 알림이 시간순으로 표시되고 각 카드에 시간, 이름, 요일, 유형 태그, Switch가 보인다
- [ ] Given 로그인된 사용자가 알림 탭에 진입, When 알림이 0개, Then "알림이 없어요" 빈 상태와 "새 알림 추가" 버튼이 표시된다
- [ ] Given 비로그인 사용자가 알림 탭에 진입, When 화면 로드, Then "로그인이 필요합니다" 메시지와 "로그인하기" 버튼이 표시된다
- [ ] Given API 호출 중, When 데이터 로딩 중, Then SkeletonCard 3개가 표시된다
- [ ] Given 네트워크 에러 발생, When API 실패, Then 에러 메시지와 "다시 시도" 버튼이 표시된다

### 알림 생성
- [ ] Given 로그인된 사용자, When FAB(+) 버튼을 탭하면, Then 생성 모달이 바텀 시트로 올라오며 이름, 시간 피커, 요일 선택기, 유형 선택기가 표시된다
- [ ] Given 생성 모달에서 이름 "아침 알림", 시간 08:00, 평일, 날씨+미세먼지 선택 후 저장, When API 호출 성공, Then 모달이 닫히고 목록에 새 알림이 추가된다
- [ ] Given 생성 모달에서 이름이 빈 값, When 저장 버튼 탭, Then "알림 이름을 입력해주세요" 에러 표시되고 저장되지 않는다
- [ ] Given 생성 모달에서 알림 유형을 하나도 선택하지 않음, When 저장 버튼 탭, Then "최소 1개 알림 유형을 선택해주세요" 에러 표시

### 알림 수정
- [ ] Given 알림 목록에서 카드를 탭, When 수정 모달 열림, Then 기존 이름, 시간, 요일, 유형이 프리필되어 있다
- [ ] Given 수정 모달에서 이름을 변경하고 저장, When API 호출 성공, Then 모달 닫히고 목록에서 변경된 이름이 즉시 반영된다

### 알림 삭제
- [ ] Given 알림 카드를 왼쪽으로 스와이프, When 80px 이상 이동, Then 빨간색 "삭제" 버튼이 노출된다
- [ ] Given 삭제 버튼을 탭, When 확인 다이얼로그에서 "삭제" 선택, Then API DELETE 호출 후 카드가 목록에서 제거된다
- [ ] Given 확인 다이얼로그에서 "취소" 선택, When 다이얼로그 닫힘, Then 카드가 원래 위치로 복귀하고 아무 일도 일어나지 않는다

### 알림 토글
- [ ] Given 활성화된 알림의 Switch를 탭, When 즉시 UI에서 OFF로 변경, Then API `PATCH /toggle` 호출이 발생하고, 성공 시 상태 유지
- [ ] Given 토글 API 호출 실패, When 네트워크 에러, Then Switch가 원래 상태로 롤백되고 "알림 상태 변경에 실패했습니다" 토스트 표시
- [ ] Given 비활성화된 알림 카드, When 화면에 표시될 때, Then 카드 전체가 흐리게(opacity 0.5) 표시된다

### Pull-to-Refresh
- [ ] Given 알림 목록 화면, When 아래로 당기기(pull-to-refresh), Then 목록이 새로고침되고 최신 데이터가 반영된다

---

## Task Breakdown

### 1단계: 기반 코드 (서비스 + 타입)

| # | Task | Complexity | Dependencies |
|---|------|-----------|-------------|
| 1 | `mobile/src/types/alert.ts` — Alert, CreateAlertPayload, UpdateAlertPayload, DayOfWeek 타입 정의 | S | none |
| 2 | `mobile/src/services/alert.service.ts` — CRUD + 토글 API 함수 5개 (apiClient 활용) | S | 1 |
| 3 | `mobile/src/utils/cron.ts` — toCron(hour, minute, days), cronToHuman(cron), parseCronTime(cron), parseCronDays(cron) 유틸 함수 | M | 1 |

### 2단계: 커스텀 Hook

| # | Task | Complexity | Dependencies |
|---|------|-----------|-------------|
| 4 | `mobile/src/hooks/useAlerts.ts` — 알림 CRUD 훅 (목록 조회, 생성, 수정, 삭제, 토글, 낙관적 업데이트, 에러/로딩 상태) | L | 2, 3 |

### 3단계: UI 컴포넌트

| # | Task | Complexity | Dependencies |
|---|------|-----------|-------------|
| 5 | `mobile/src/components/alerts/AlertCard.tsx` — 개별 알림 카드 (시간, 이름, 요일, 유형 태그, Switch) | M | 3 |
| 6 | `mobile/src/components/alerts/SwipeableAlertCard.tsx` — Swipeable 래퍼 (스와이프 삭제 버튼) | M | 5 |
| 7 | `mobile/src/components/alerts/DayOfWeekPicker.tsx` — 요일 선택기 (7개 토글 + 3개 프리셋) | M | 1 |
| 8 | `mobile/src/components/alerts/AlertTypePicker.tsx` — 알림 유형 멀티 선택 칩 (2x2 그리드) | S | 1 |
| 9 | `mobile/src/components/alerts/AlertFormModal.tsx` — 생성/수정 통합 모달 (이름 입력, 시간 피커, 요일 선택, 유형 선택, 저장/취소) | L | 7, 8, 3 |
| 10 | `mobile/src/components/alerts/EmptyAlertView.tsx` — 빈 상태 화면 | S | none |
| 11 | `mobile/src/components/alerts/GuestAlertView.tsx` — 비로그인 상태 화면 | S | none |

### 4단계: 메인 화면 조립

| # | Task | Complexity | Dependencies |
|---|------|-----------|-------------|
| 12 | `mobile/app/(tabs)/alerts.tsx` — 알림 탭 메인 화면 (FlatList + FAB + 모든 상태 통합) | L | 4, 5, 6, 9, 10, 11 |

### 5단계: 검증

| # | Task | Complexity | Dependencies |
|---|------|-----------|-------------|
| 13 | Cron 유틸 단위 테스트 (`cron.test.ts`) | S | 3 |
| 14 | TypeScript 빌드 검증 (`npx tsc --noEmit`) | S | 12 |

**예상 총 소요:** 4~6시간

---

## Open Questions

1. **시간 피커 라이브러리:** `@react-native-community/datetimepicker`를 사용할지, 커스텀 스크롤 피커를 만들지? 네이티브 피커가 UX적으로 더 자연스럽지만, Expo managed workflow에서 호환성 확인 필요.
2. **스와이프 제스처 라이브러리:** `react-native-gesture-handler`의 `Swipeable`을 사용할지, `react-native-reanimated`로 직접 구현할지? Expo SDK 54에서 두 라이브러리 모두 기본 포함.
3. **알림 최대 개수:** 사용자당 알림 수 제한이 필요한가? 현재 백엔드에 제한 없음. Phase 1에서는 제한 없이 진행하되, UX적으로 10개 이상 시 스크롤이 불편할 수 있음.

---

## Out of Scope

- **알림 수신/표시 (Push Notification):** FCM/APNs 연동은 별도 사이클 (P1-4 또는 P1-5)
- **교통정보 연동 위저드:** PWA의 5단계 위저드는 모바일에서 재현하지 않음. 단순 유형 선택만 지원
- **경로 연결 설정:** `routeId` 연결은 경로 설정 화면(P1-4) 완성 후 추가
- **스마트 스케줄링:** `smartSchedulingEnabled`, `targetArrivalTime` 등은 Phase 2 범위
- **알림 히스토리:** 발송 기록 조회는 P2 기능
- **알림톡 vs 네이티브 푸시 전환:** 백엔드 채널 로직은 이 사이클과 무관

---

## 참고: PWA vs 모바일 비교

| 항목 | PWA (현재) | 모바일 (이번 구현) |
|------|-----------|------------------|
| 알림 생성 | 5단계 위저드 | **단일 모달 폼** (더 빠름) |
| 알림 삭제 | 아이콘 버튼 + 확인 모달 | **스와이프 + 확인 다이얼로그** (더 네이티브) |
| 토글 | HTML checkbox | **네이티브 Switch** |
| 목록 | CSS div 리스트 | **FlatList** (가상화, 성능 우수) |
| 시간 선택 | HTML `<input type="time">` | **네이티브 TimePicker** |
| 요일 선택 | 위저드 내 cron 자동 생성 | **7개 토글 + 프리셋** (직관적) |
| 에러 처리 | 토스트 | **토스트 + 인라인 에러** |

---

*이 스펙은 `docs/cycle-brief-alerts-screen.md`와 기존 백엔드 API(`backend/src/presentation/controllers/alert.controller.ts`)를 기반으로 작성되었습니다.*
