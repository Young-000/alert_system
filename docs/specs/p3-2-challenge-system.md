# P3-2: 도전/목표 시스템

> Phase 3 — 출퇴근 코치 | 노력: M | 사이클: 1

---

## JTBD

매일 출퇴근하는 직장인으로서, **구체적인 목표를 세우고 달성 과정을 눈으로 확인**하고 싶다. 그래야 출퇴근 습관을 개선할 **동기**가 생기고, 달성했을 때 **성취감**을 느낄 수 있다.

```
When: 매일 비슷한 경로로 출퇴근하면서 "좀 더 빨리 갈 수 없을까" 생각할 때
I want to: 구체적인 도전 목표를 설정하고 진행 상황을 추적하고 싶다
So I can: 출퇴근 시간 단축에 대한 동기를 유지하고, 달성 시 성취감을 느낄 수 있다
```

---

## Problem

- **Who:** 출퇴근 경로가 등록되어 있고 2회 이상 세션을 완료한 사용자
- **Pain:** 출퇴근 데이터가 쌓이지만 "그래서 뭘 어떻게 개선하라는 거지?"가 없음 (빈도: 매일 / 심각도: 중)
- **Current workaround:** 스트릭 카운터만 있어서 "연속 출퇴근"만 추적 가능. 시간 목표, 주간 빈도 목표 등 구체적 도전은 없음
- **Success metric:**
  - 도전 참여율: 활성 사용자 중 50% 이상이 1개 이상 도전 활성화
  - 도전 완료율: 시작된 도전 중 40% 이상 완료
  - 세션 완료 빈도: 도전 참여자의 주간 세션 완료 횟수가 비참여자 대비 20% 이상 증가

---

## Solution

### Overview

사전 정의된 도전 템플릿(시간 목표, 연속 달성, 주간 빈도)을 제공하고, 사용자가 원하는 도전을 선택하면 출퇴근 세션 완료 시 자동으로 진행 상황이 업데이트된다. 도전 완료 시 배지를 부여하고, 홈 화면에 현재 도전 진행 카드를 표시하여 일상적인 동기부여를 제공한다.

기존 `commute-session` 완료 이벤트에 도전 평가 로직을 연결하는 방식으로, 추가 사용자 액션 없이 자동으로 진행률이 갱신된다. 커스텀 도전 생성은 v2에서 다룬다.

### User Flow

```
[홈 화면] — "도전 시작하기" 카드 (도전 없을 때)
    │
    ▼
[도전 목록 화면] — 카테고리별 도전 템플릿 리스트
    │
    ├── 도전 선택 → 상세 보기 (목표, 기간, 보상 미리보기)
    │       │
    │       └── "도전 시작" 버튼 → 활성 도전 등록
    │
    ▼
[홈 화면] — 활성 도전 진행 카드 (프로그레스 바 + 남은 기간)
    │
    ├── 출퇴근 세션 완료 → 도전 진행률 자동 갱신
    │       │
    │       ├── 진행 중 → 프로그레스 바 업데이트
    │       ├── 달성 임박 (1회 남음) → 축하 알림
    │       └── 달성 완료 → 축하 애니메이션 + 배지 부여
    │
    └── 실패 (기간 만료) → 실패 표시 + 재도전 유도
```

**에러/엣지 케이스:**
- 이미 동일 타입 도전이 활성 상태 → "이미 진행 중인 도전이 있어요" 안내
- 도전 기간 중 세션 데이터 없음 → "아직 출퇴근 기록이 없어요" empty state
- 동시 활성 도전 제한 → 최대 3개

---

## Scope (MoSCoW)

### Must Have (이것 없으면 기능 의미 없음)
- 사전 정의 도전 템플릿 6종 (시간 목표 2 + 연속 달성 2 + 주간 빈도 2)
- 도전 시작/포기 API
- 세션 완료 시 도전 진행률 자동 평가
- 도전 진행 카드 (홈 화면) — 프로그레스 바, 남은 횟수/기간
- 도전 목록 화면 — 카테고리별 분류, 시작 버튼
- 도전 완료 시 배지 부여 및 저장
- 배지 컬렉션 뷰 (설정 화면 내)

### Should Have (중요하지만 없어도 핵심은 동작)
- 도전 달성 시 축하 애니메이션 (confetti / lottie)
- 도전 실패 시 재도전 유도 UI
- 도전 달성 임박 알림 (푸시)
- 도전 히스토리 (완료/실패 이력)

### Could Have (시간 되면 추가)
- 도전 난이도 표시 (쉬움/보통/어려움)
- 도전 완료 통계 (전체 사용자 중 N%가 완료)
- 배지 공유 (이미지 생성)

### Won't Have (이번 사이클 제외)
- 커스텀 도전 생성 (사용자가 직접 목표 수치 입력) → v2
- 소셜/랭킹 (다른 사용자와 비교) → P4
- 보상 시스템 (포인트, 쿠폰 등) → 미정
- 팀 도전 (그룹 목표) → 미정

---

## 도전 템플릿 정의

### 카테고리 1: 시간 목표 (Time Goal)

| ID | 이름 | 조건 | 기간 | 배지 |
|----|------|------|------|------|
| `time-under-40` | 40분 이내 출근 3회 | totalDurationMinutes < 40인 세션 3회 | 7일 | 번개 |
| `time-under-30` | 30분 이내 출근 5회 | totalDurationMinutes < 30인 세션 5회 | 14일 | 로켓 |

### 카테고리 2: 연속 달성 (Streak)

| ID | 이름 | 조건 | 기간 | 배지 |
|----|------|------|------|------|
| `streak-3d` | 3일 연속 출퇴근 | 연속 3일 세션 완료 | 7일 | 불꽃 |
| `streak-5d` | 5일 연속 출퇴근 | 연속 5일 세션 완료 (평일 개근) | 7일 | 왕관 |

### 카테고리 3: 주간 빈도 (Weekly Frequency)

| ID | 이름 | 조건 | 기간 | 배지 |
|----|------|------|------|------|
| `weekly-4` | 이번 주 4일 출퇴근 | 한 주에 세션 4회 이상 완료 | 7일 | 달력 |
| `weekly-perfect` | 완벽한 한 주 | 월~금 매일 세션 완료 | 7일 | 별 |

### 평가 규칙

- **시간 목표**: 세션 완료 시 `totalDurationMinutes`가 목표 이하인지 확인 → 조건 충족 카운트 +1
- **연속 달성**: 기존 streak 로직 재활용. `commute-streak` 엔티티의 `currentStreak`이 목표 이상인지 확인
- **주간 빈도**: 해당 주(월~일)의 완료 세션 수 카운트
- **기간 만료**: 도전 시작일 + 기간(일) 이후 미완료 → 자동 실패 처리 (배치 또는 조회 시 lazy 평가)

---

## DB 설계

### `alert_system.challenge_templates` (시드 데이터)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | VARCHAR PK | 도전 ID (예: `time-under-40`) |
| category | VARCHAR | `time_goal` / `streak` / `weekly_frequency` |
| name | VARCHAR | 도전 이름 |
| description | TEXT | 도전 설명 |
| target_value | INT | 목표 수치 (횟수 또는 연속일) |
| condition_type | VARCHAR | `duration_under` / `consecutive_days` / `weekly_count` / `weekday_complete` |
| condition_value | INT | 조건 수치 (분 또는 일) |
| duration_days | INT | 도전 기한 (일) |
| badge_id | VARCHAR | 완료 시 부여할 배지 ID |
| difficulty | VARCHAR | `easy` / `medium` / `hard` |
| sort_order | INT | 표시 순서 |
| is_active | BOOLEAN | 활성화 여부 (관리용) |
| created_at | TIMESTAMP | |

### `alert_system.user_challenges`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| user_id | UUID FK → users | |
| challenge_template_id | VARCHAR FK → challenge_templates | |
| status | VARCHAR | `active` / `completed` / `failed` / `abandoned` |
| started_at | TIMESTAMP | 도전 시작 시각 |
| deadline_at | TIMESTAMP | 기한 (started_at + duration_days) |
| completed_at | TIMESTAMP NULL | 완료 시각 |
| current_progress | INT | 현재 진행 수치 |
| target_progress | INT | 목표 수치 (template에서 복사) |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**인덱스:**
- `user_challenges_user_id_status_idx` (user_id, status) — 활성 도전 조회
- `user_challenges_user_id_template_id_unique` (user_id, challenge_template_id) WHERE status = 'active' — 동일 도전 중복 방지

### `alert_system.user_badges`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| user_id | UUID FK → users | |
| badge_id | VARCHAR | 배지 식별자 (예: `lightning`, `rocket`) |
| badge_name | VARCHAR | 표시 이름 |
| badge_emoji | VARCHAR | 이모지 (예: "⚡") |
| challenge_id | UUID FK → user_challenges | 어떤 도전으로 획득했는지 |
| earned_at | TIMESTAMP | 획득 시각 |
| created_at | TIMESTAMP | |

**인덱스:**
- `user_badges_user_id_idx` (user_id) — 배지 목록 조회
- `user_badges_user_id_badge_id_unique` (user_id, badge_id) — 배지 중복 방지

---

## API 설계

### 1. 도전 템플릿 목록 조회

```
GET /challenges/templates
Authorization: Bearer {token}

Response 200:
{
  "templates": [
    {
      "id": "time-under-40",
      "category": "time_goal",
      "name": "40분 이내 출근 3회",
      "description": "이번 주 안에 40분 이내로 출근하는 걸 3번 달성해보세요!",
      "targetValue": 3,
      "conditionType": "duration_under",
      "conditionValue": 40,
      "durationDays": 7,
      "difficulty": "easy",
      "badgeEmoji": "⚡",
      "badgeName": "번개",
      "isJoined": false,
      "isCompleted": false
    }
  ],
  "categories": [
    { "key": "time_goal", "label": "시간 목표", "emoji": "⏱" },
    { "key": "streak", "label": "연속 달성", "emoji": "🔥" },
    { "key": "weekly_frequency", "label": "주간 빈도", "emoji": "📅" }
  ]
}
```

### 2. 도전 시작

```
POST /challenges/join
Authorization: Bearer {token}
Body: { "templateId": "time-under-40" }

Response 201:
{
  "id": "uuid",
  "templateId": "time-under-40",
  "status": "active",
  "startedAt": "2026-02-20T09:00:00Z",
  "deadlineAt": "2026-02-27T09:00:00Z",
  "currentProgress": 0,
  "targetProgress": 3
}

Error 409: { "message": "이미 진행 중인 동일 도전이 있습니다." }
Error 400: { "message": "동시 진행 가능한 도전은 최대 3개입니다." }
```

### 3. 활성 도전 목록 조회

```
GET /challenges/active
Authorization: Bearer {token}

Response 200:
{
  "challenges": [
    {
      "id": "uuid",
      "template": { "id": "time-under-40", "name": "40분 이내 출근 3회", ... },
      "status": "active",
      "startedAt": "2026-02-20T09:00:00Z",
      "deadlineAt": "2026-02-27T09:00:00Z",
      "currentProgress": 1,
      "targetProgress": 3,
      "progressPercent": 33,
      "daysRemaining": 5,
      "isCloseToCompletion": false
    }
  ]
}
```

### 4. 도전 포기

```
POST /challenges/:challengeId/abandon
Authorization: Bearer {token}

Response 200: { "success": true }
```

### 5. 도전 히스토리 조회

```
GET /challenges/history?limit=20&offset=0
Authorization: Bearer {token}

Response 200:
{
  "challenges": [ ... ],
  "totalCount": 5,
  "stats": {
    "totalCompleted": 3,
    "totalFailed": 1,
    "totalAbandoned": 1,
    "completionRate": 60
  }
}
```

### 6. 배지 목록 조회

```
GET /badges
Authorization: Bearer {token}

Response 200:
{
  "badges": [
    {
      "id": "uuid",
      "badgeId": "lightning",
      "badgeName": "번개",
      "badgeEmoji": "⚡",
      "earnedAt": "2026-02-25T18:30:00Z",
      "challengeName": "40분 이내 출근 3회"
    }
  ],
  "totalBadges": 6,
  "earnedCount": 1
}
```

### 7. 세션 완료 시 도전 평가 (내부 로직)

기존 `POST /commute/complete` 응답에 도전 업데이트 정보를 추가:

```
// 기존 응답 + 추가
{
  ...sessionResponse,
  "streakUpdate": { ... },
  "challengeUpdates": [
    {
      "challengeId": "uuid",
      "challengeName": "40분 이내 출근 3회",
      "previousProgress": 1,
      "currentProgress": 2,
      "targetProgress": 3,
      "isCompleted": false,
      "isCloseToCompletion": true,
      "badgeEarned": null
    }
  ]
}
```

---

## Mobile UI 설계

### 1. 홈 화면 — ChallengeCard

위치: `SmartDepartureCard` 아래, `WeatherCard` 위

**상태별 표시:**

| 상태 | 표시 내용 |
|------|----------|
| 활성 도전 없음 | "출퇴근 도전을 시작해보세요!" CTA 카드 |
| 활성 도전 1~3개 | 첫 번째 도전의 프로그레스 바 + "N개 더 진행 중" |
| 도전 달성 직후 | 축하 배너 (3초 후 자동 닫힘 또는 탭하여 닫기) |

**카드 레이아웃:**
```
┌──────────────────────────────────────┐
│ 🏆 40분 이내 출근 3회          D-5   │
│ ██████████░░░░░░░░░░░░░  2/3        │
│ "1회만 더 달성하면 ⚡ 배지 획득!"   │
│                      + 2개 더 진행 중 │
└──────────────────────────────────────┘
```

### 2. 도전 목록 화면

진입: 홈 ChallengeCard 탭 또는 설정 > "도전/배지"

**레이아웃:**
```
┌──────────────────────────────────────┐
│ [< 뒤로]     도전 목록               │
├──────────────────────────────────────┤
│ 내 도전 (2/3)                        │
│ ┌────────────────────────────────┐   │
│ │ ⚡ 40분 이내 출근 3회    진행중 │   │
│ │ █████████░░░  2/3  |  D-5     │   │
│ └────────────────────────────────┘   │
│ ┌────────────────────────────────┐   │
│ │ 🔥 3일 연속 출퇴근       진행중 │   │
│ │ ███░░░░░░░░  1/3  |  D-6     │   │
│ └────────────────────────────────┘   │
├──────────────────────────────────────┤
│ ⏱ 시간 목표                         │
│ ┌────────────────────────────────┐   │
│ │ ⚡ 40분 이내 출근 3회    진행중 │   │
│ │ 🚀 30분 이내 출근 5회    시작  │   │
│ └────────────────────────────────┘   │
│ 🔥 연속 달성                         │
│ ...                                  │
│ 📅 주간 빈도                         │
│ ...                                  │
└──────────────────────────────────────┘
```

### 3. 배지 컬렉션 뷰

위치: 설정 탭 > "내 배지" 또는 도전 목록 화면 상단

```
┌──────────────────────────────────────┐
│ 내 배지 (1/6)                        │
│                                      │
│  ⚡      🚀      🔥      👑          │
│ 번개   로켓    불꽃    왕관           │
│ 획득!   잠김    잠김    잠김          │
│                                      │
│  📅      ⭐                          │
│ 달력     별                          │
│ 잠김    잠김                         │
└──────────────────────────────────────┘
```

- 획득한 배지: 풀 컬러 + 획득일 표시
- 미획득 배지: 회색 처리 (잠김) + "어떤 도전을 완료하면 획득" 힌트

### 4. 도전 완료 축하 모달

세션 완료 시 도전이 달성되면 표시:

```
┌──────────────────────────────────────┐
│                                      │
│           🎉 축하합니다! 🎉          │
│                                      │
│              ⚡                       │
│           "번개" 배지                 │
│                                      │
│    "40분 이내 출근 3회" 달성!        │
│                                      │
│         [ 배지 보러 가기 ]           │
│            [ 닫기 ]                  │
│                                      │
└──────────────────────────────────────┘
```

---

## Acceptance Criteria

### 도전 템플릿

- [ ] **AC-1**: Given 로그인한 사용자, When 도전 목록 화면 진입, Then 6개의 사전 정의 도전이 3개 카테고리로 분류되어 표시된다
- [ ] **AC-2**: Given 도전 목록 화면, When 각 도전 카드를 확인, Then 이름, 조건 설명, 기간, 배지 미리보기, 시작 버튼이 보인다

### 도전 시작/관리

- [ ] **AC-3**: Given 활성 도전 0개, When "시작" 버튼을 탭, Then 도전이 `active` 상태로 생성되고 기한(started_at + duration_days)이 설정된다
- [ ] **AC-4**: Given 활성 도전 3개, When 새 도전 시작 시도, Then "동시 진행 가능한 도전은 최대 3개입니다" 에러 메시지가 표시된다
- [ ] **AC-5**: Given 동일 템플릿의 활성 도전 존재, When 같은 도전 시작 시도, Then "이미 진행 중인 동일 도전이 있습니다" 에러 메시지가 표시된다
- [ ] **AC-6**: Given 활성 도전, When "포기" 버튼 탭 + 확인, Then 도전 상태가 `abandoned`로 변경된다

### 자동 진행률 갱신

- [ ] **AC-7**: Given `time-under-40` 도전 활성 + 세션 완료(38분), When 세션 완료 API 호출, Then 도전 currentProgress가 +1 증가한다
- [ ] **AC-8**: Given `time-under-40` 도전 활성 + 세션 완료(45분), When 세션 완료 API 호출, Then 도전 currentProgress가 변하지 않는다 (조건 미충족)
- [ ] **AC-9**: Given `streak-3d` 도전 활성, When 3일 연속 세션 완료, Then 도전 상태가 `completed`로 변경되고 배지가 부여된다
- [ ] **AC-10**: Given `weekly-4` 도전 활성, When 한 주에 4회 세션 완료, Then 도전 상태가 `completed`로 변경된다

### 도전 만료

- [ ] **AC-11**: Given 도전 기한이 지남 + 미완료, When 도전 목록 조회, Then 해당 도전 상태가 `failed`로 표시된다

### 홈 화면 카드

- [ ] **AC-12**: Given 활성 도전 없음, When 홈 화면 진입, Then "출퇴근 도전을 시작해보세요" CTA 카드가 표시된다
- [ ] **AC-13**: Given 활성 도전 2개, When 홈 화면 진입, Then 첫 번째 도전의 프로그레스 바 + "1개 더 진행 중" 텍스트가 표시된다
- [ ] **AC-14**: Given 활성 도전, When 프로그레스 바 확인, Then `currentProgress / targetProgress` 비율이 정확히 반영된다

### 배지

- [ ] **AC-15**: Given 도전 완료, When 배지 목록 조회, Then 해당 배지가 획득 상태(풀 컬러 + 획득일)로 표시된다
- [ ] **AC-16**: Given 배지 목록 화면, When 미획득 배지 확인, Then 회색 잠김 상태 + 획득 조건 힌트가 표시된다

### 도전 완료 축하

- [ ] **AC-17**: Given 세션 완료로 도전 달성, When 완료 응답 수신, Then 축하 모달이 표시되고 배지 이모지와 도전 이름이 포함된다

---

## Task Breakdown

### Backend (NestJS + TypeORM)

| # | Task | 규모 | 의존성 |
|---|------|------|--------|
| B1 | `ChallengeTemplate` 도메인 엔티티 + ORM 엔티티 생성 | S | - |
| B2 | `UserChallenge` 도메인 엔티티 + ORM 엔티티 생성 (상태 머신: active/completed/failed/abandoned) | M | - |
| B3 | `UserBadge` 도메인 엔티티 + ORM 엔티티 생성 | S | - |
| B4 | `ChallengeTemplate` 시드 데이터 생성 (6종) | S | B1 |
| B5 | `ChallengeRepository` 인터페이스 + TypeORM 구현 | M | B1, B2, B3 |
| B6 | `EvaluateChallengeUseCase` — 세션 완료 시 도전 평가 로직 (condition_type별 분기) | L | B2, B5 |
| B7 | `ManageChallengeUseCase` — 시작/포기/목록 조회/히스토리 | M | B5 |
| B8 | `ChallengeController` — REST 엔드포인트 6개 (templates, join, active, abandon, history, badges) | M | B6, B7 |
| B9 | `ManageCommuteSessionUseCase.completeSession`에 도전 평가 연결 | S | B6 |
| B10 | `ChallengeModule` NestJS 모듈 등록 + AppModule 연결 | S | B8 |
| B11 | 단위 테스트 — 엔티티 (ChallengeTemplate, UserChallenge, UserBadge) | M | B1-B3 |
| B12 | 단위 테스트 — EvaluateChallengeUseCase (시간 목표, 연속 달성, 주간 빈도 각 케이스) | M | B6 |
| B13 | 단위 테스트 — ChallengeController | M | B8 |

### Mobile (React Native + Expo)

| # | Task | 규모 | 의존성 |
|---|------|------|--------|
| M1 | `challenge.service.ts` — API 클라이언트 (templates, join, active, abandon, history, badges) | S | B8 |
| M2 | `types/challenge.ts` — TypeScript 타입 정의 | S | - |
| M3 | `useChallenges` 훅 — 활성 도전 + 템플릿 목록 + 시작/포기 액션 | M | M1, M2 |
| M4 | `useBadges` 훅 — 배지 목록 조회 | S | M1, M2 |
| M5 | `ChallengeCard` 컴포넌트 (홈 화면용) — 활성 도전 프로그레스 / 빈 상태 CTA | M | M3 |
| M6 | 홈 화면에 ChallengeCard 통합 (`useHomeData` 또는 별도 fetch) | S | M5 |
| M7 | `ChallengeListScreen` — 도전 목록 화면 (카테고리별 + 내 도전) | M | M3 |
| M8 | `BadgeCollectionView` 컴포넌트 — 배지 그리드 (획득/잠김 상태) | M | M4 |
| M9 | `ChallengeCompleteModal` — 축하 모달 (배지 이모지 + 도전 이름) | S | - |
| M10 | 세션 완료 시 `challengeUpdates` 응답 처리 + 모달 트리거 | S | M9 |
| M11 | Expo Router 네비게이션 등록 (`/challenges` 경로) | S | M7 |

---

## Open Questions

1. **도전 기한 만료 처리**: 서버 배치(EventBridge 스케줄)로 일괄 처리 vs 조회 시 lazy 평가?
   - **권장**: 조회 시 lazy 평가 (MVP에서 배치 불필요, 조회 시 `deadline_at < now`이면 `failed` 처리)

2. **동시 활성 도전 제한 수**: 3개가 적절한가?
   - **권장**: 3개 (선택의 부담 없이 다양한 카테고리 1개씩)

3. **도전 반복**: 완료한 도전을 다시 시작할 수 있는가?
   - **권장**: 가능. `user_challenges`에 이력으로 쌓임. 배지는 중복 부여 안 함.

---

## Out of Scope

- **커스텀 도전 생성** — 사용자가 직접 목표 수치(예: "35분 이내 출근 4회")를 입력하는 기능. 사전 정의 도전으로 MVP 검증 후 v2에서 추가.
- **소셜/랭킹** — 다른 사용자와 도전 진행 비교, 리더보드. Phase 4 소셜 기능에서 다룸.
- **보상 시스템** — 포인트, 쿠폰, 인앱 보상. 배지만 MVP 범위.
- **팀 도전** — 그룹(회사, 동료) 단위 목표. 미래 검토.
- **위젯 연동** — iOS/Android 위젯에 도전 진행률 표시. 별도 사이클.
- **알림 세분화** — "오늘 출퇴근하면 도전 달성!" 같은 세밀한 동기부여 알림. Should Have로 포함하되 시간 부족 시 스킵.

---

*작성: PM Agent | 2026-02-20 | Phase 3 — 출퇴근 코치*
