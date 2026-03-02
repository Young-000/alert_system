# F-5: 출퇴근 스트릭 & 도전 (Commute Streak & Challenges)

> 작성일: 2026-02-17
> 작성자: PM Agent
> 상태: Draft
> RICE Score: 85 (Reach: 80, Impact: 2, Confidence: 80%, Effort: 1.5 사이클)

---

## JTBD

**When** 매일 출퇴근을 반복하지만 기록할 동기가 부족할 때,
**I want to** 연속 기록 일수와 달성 배지로 성취감을 느끼고 싶어서,
**So I can** 꾸준히 기록하는 습관을 만들고, 쌓인 데이터로 더 나은 출퇴근 인사이트를 얻을 수 있다.

---

## 문제 정의

### Who
- **김지수 (29세, 직장인)**: 매일 지하철+버스로 편도 50분 출퇴근. 앱을 설치했지만 트래킹을 1-2번 하고 잊어버림.
- **공통 특성**: 출퇴근 메이트 앱을 설치한 모든 사용자. 기록을 시작했지만 지속하지 못하는 이탈 위험군.

### Pain (빈도 x 심각도)
- **빈도**: 매일 (주 5회 출퇴근)
- **심각도**: 중간 — 기록 안 해도 출퇴근은 하지만, 기록이 없으면 대시보드/분석/최적 출발 예측 등 앱의 핵심 가치가 작동하지 않음
- **결과**: 3회 미만 기록 시 인사이트 제공 불가 -> 앱 가치 미체감 -> 이탈

### 현재 워크어라운드
- 기록 동기가 없어 "그냥 안 함"
- 대시보드 빈 상태("출퇴근 기록을 시작하면 통계를 볼 수 있어요") 반복 노출
- 알림톡만 받고 앱을 열지 않음

### 성공 지표
| 지표 | 현재 추정 | 목표 (출시 4주 후) |
|------|----------|-------------------|
| 주간 트래킹 기록 횟수 | 평균 1-2회/주 | 평균 4회/주 |
| 7일 연속 스트릭 달성율 | 0% (기능 없음) | 40% |
| DAU (앱 일일 방문) | 낮음 | 30% 증가 |
| 트래킹 완료율 (시작 -> 완료) | 측정 필요 | 80% 이상 유지 |

---

## 솔루션

### 개요

출퇴근 세션 완료 시 자동으로 스트릭(연속 기록 일수)을 갱신하는 시스템을 구축한다. 홈 화면 상단에 스트릭 카운터를 배치하여 매일 앱을 열었을 때 진행 상황을 확인하게 하고, 마일스톤(7일, 30일, 100일) 달성 시 배지를 획득하여 성취감을 제공한다. 주간 목표 프로그레스 바로 이번 주 기록 현황을 시각화하고, 스트릭 끊길 위험 시 저녁 알림으로 리마인더를 보낸다.

**핵심 설계 원칙:**
- 스트릭 계산은 **서버에서만** 수행 (클라이언트 시계 조작 방지)
- 날짜 기준은 **한국 시간(UTC+9)** (자정 기준 하루 단위)
- 기존 commute session 완료 플로우에 자연스럽게 통합
- @tanstack/react-query 활용 (Cycle 12에서 도입된 인프라)

### 사용자 플로우

```
[홈 화면 진입] → 스트릭 카운터 확인 ("연속 12일")
                → 주간 목표 확인 ("이번 주 3/5")
                ↓
[출발하기 클릭] → 트래킹 시작
                ↓
[트래킹 완료] → 서버에서 스트릭 갱신
              → 오늘 첫 완료 시 스트릭 +1
              → 마일스톤 달성 시 축하 모달 표시
              → 주간 진행률 갱신
                ↓
[저녁 21시] → 오늘 기록 없으면 리마인더 알림
             "스트릭 12일이 끊길 수 있어요! 오늘 기록을 남겨보세요"
```

**에러/엣지 케이스:**
```
[스트릭 끊김] → "이전 최고: 12일" 표시 + "다시 시작" 격려 메시지
[하루 복수 완료] → 첫 완료만 스트릭에 반영 (중복 방지)
[자정 전후 완료] → UTC+9 기준 날짜로 판단
[주말 기록] → 주말도 스트릭에 포함 (선택적 — Should have)
```

---

## 스코프 (MoSCoW)

### Must have (이것 없으면 기능이 안 됨)
- 스트릭 카운터: 연속 기록 일수 표시 (홈 상단)
- 스트릭 자동 갱신: 세션 완료 시 서버에서 계산
- 주간 목표 프로그레스 바: 이번 주 N/5 표시
- 마일스톤 배지: 7일, 30일, 100일 달성 시 표시
- 스트릭 API: GET /commute/streak/:userId

### Should have (중요하지만 없어도 작동)
- 마일스톤 달성 축하 모달 (애니메이션)
- 스트릭 끊길 위험 시 저녁 리마인더 알림 (기존 알림 인프라 활용)
- 최고 스트릭 기록 보존 및 표시
- 주말 제외 옵션 (평일만 스트릭)

### Could have (시간 여유 시)
- 스트릭 프리즈: 1회 면제권 (30일 달성 시 보상)
- 배지 컬렉션 페이지 (설정 내)
- 스트릭 공유 기능 (SNS)

### Won't have (이번 사이클 제외)
- 리더보드/랭킹 (소셜 기능은 추후)
- 포인트/보상 시스템 (복잡도 과다)
- 커스텀 도전 생성 (사용자 정의 목표)

---

## DB 스키마

### 새 테이블: `alert_system.commute_streaks`

```sql
CREATE TABLE alert_system.commute_streaks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES alert_system.users(id) ON DELETE CASCADE,

  -- 현재 스트릭
  current_streak  INTEGER NOT NULL DEFAULT 0,
  streak_start_date DATE,          -- 현재 스트릭 시작일 (KST 날짜)
  last_record_date  DATE,          -- 마지막 기록일 (KST 날짜)

  -- 최고 기록
  best_streak     INTEGER NOT NULL DEFAULT 0,
  best_streak_start DATE,
  best_streak_end   DATE,

  -- 주간 통계
  weekly_goal     INTEGER NOT NULL DEFAULT 5,   -- 주간 목표 (기본 5회)
  weekly_count    INTEGER NOT NULL DEFAULT 0,   -- 이번 주 기록 횟수
  week_start_date DATE,                         -- 이번 주 시작일 (월요일)

  -- 마일스톤
  milestones_achieved TEXT[] NOT NULL DEFAULT '{}',  -- ['7d', '30d', '100d']
  latest_milestone    TEXT,                          -- 가장 최근 달성한 마일스톤

  -- 설정
  exclude_weekends BOOLEAN NOT NULL DEFAULT false,  -- 주말 제외 여부
  reminder_enabled BOOLEAN NOT NULL DEFAULT true,   -- 리마인더 알림 활성화

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT commute_streaks_user_id_unique UNIQUE (user_id)
);

-- 인덱스
CREATE INDEX commute_streaks_user_id_idx ON alert_system.commute_streaks(user_id);
CREATE INDEX commute_streaks_last_record_date_idx ON alert_system.commute_streaks(last_record_date);
```

### 새 테이블: `alert_system.streak_daily_logs`

스트릭 일별 기록 추적 (디버깅 및 통계 용도).

```sql
CREATE TABLE alert_system.streak_daily_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES alert_system.users(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,           -- KST 기준 날짜
  session_id  UUID NOT NULL,           -- 해당 날짜 첫 완료 세션 ID
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT streak_daily_logs_user_date_unique UNIQUE (user_id, record_date)
);

CREATE INDEX streak_daily_logs_user_id_idx ON alert_system.streak_daily_logs(user_id);
CREATE INDEX streak_daily_logs_record_date_idx ON alert_system.streak_daily_logs(record_date);
```

### 기존 테이블 변경: 없음

기존 `commute_sessions` 테이블은 변경하지 않는다. 세션 완료 시 스트릭 갱신 로직은 use-case 레벨에서 연결한다.

---

## API 엔드포인트

### 1. GET /commute/streak/:userId — 스트릭 정보 조회

**요청:**
```
GET /commute/streak/{userId}
Authorization: Bearer {jwt}
```

**응답 (200):**
```json
{
  "userId": "uuid",
  "currentStreak": 12,
  "bestStreak": 25,
  "lastRecordDate": "2026-02-16",
  "streakStartDate": "2026-02-05",
  "weeklyGoal": 5,
  "weeklyCount": 3,
  "weekStartDate": "2026-02-17",
  "milestonesAchieved": ["7d"],
  "latestMilestone": "7d",
  "nextMilestone": {
    "type": "30d",
    "label": "30일 연속",
    "daysRemaining": 18,
    "progress": 0.4
  },
  "streakStatus": "active",
  "excludeWeekends": false,
  "reminderEnabled": true,
  "todayRecorded": false
}
```

**`streakStatus` 값:**
- `"active"`: 오늘 또는 어제 기록 있음 (스트릭 유지 중)
- `"at_risk"`: 어제 기록 없음 + 오늘 아직 기록 안 함 (끊길 위험)
- `"broken"`: 2일 이상 기록 없음 (스트릭 끊김)
- `"new"`: 기록 없음 (처음 시작)

**권한:** JWT 인증 + 본인 데이터만 조회

---

### 2. PATCH /commute/streak/:userId/settings — 스트릭 설정 변경

**요청:**
```
PATCH /commute/streak/{userId}/settings
Authorization: Bearer {jwt}
Content-Type: application/json

{
  "weeklyGoal": 4,
  "excludeWeekends": true,
  "reminderEnabled": false
}
```

**응답 (200):**
```json
{
  "success": true,
  "weeklyGoal": 4,
  "excludeWeekends": true,
  "reminderEnabled": false
}
```

---

### 3. GET /commute/streak/:userId/milestones — 마일스톤 목록 조회

**요청:**
```
GET /commute/streak/{userId}/milestones
Authorization: Bearer {jwt}
```

**응답 (200):**
```json
{
  "milestones": [
    { "type": "7d", "label": "7일 연속", "achieved": true, "achievedAt": "2026-02-12" },
    { "type": "30d", "label": "30일 연속", "achieved": false, "progress": 0.4, "daysRemaining": 18 },
    { "type": "100d", "label": "100일 연속", "achieved": false, "progress": 0.12, "daysRemaining": 88 }
  ],
  "currentStreak": 12
}
```

---

### 4. 기존 엔드포인트 변경: POST /commute/complete

기존 세션 완료 응답에 스트릭 갱신 결과를 포함한다.

**기존 응답에 추가되는 필드:**
```json
{
  "...기존 SessionResponseDto 필드들",
  "streakUpdate": {
    "currentStreak": 13,
    "isNewRecord": false,
    "milestoneAchieved": null,
    "todayFirstCompletion": true,
    "weeklyCount": 4,
    "weeklyGoal": 5
  }
}
```

`streakUpdate`가 `null`이면 이미 오늘 기록이 있어 스트릭이 갱신되지 않았음을 의미한다.

---

## 컴포넌트 설계

### 1. StreakBadge (홈 상단)

**위치:** `HomePage` 상단, `<header>` 바로 아래, `MorningBriefing` 위에 배치

```
┌──────────────────────────────────────┐
│  🔥 연속 12일                  최고 25일  │
│  ■■■■■■■■■■■■□□□□□□□□□□□□□□□□□□  │
│  이번 주 3/5                          │
│  ● ● ● ○ ○                         │
└──────────────────────────────────────┘
```

**Props:**
```typescript
interface StreakBadgeProps {
  currentStreak: number;
  bestStreak: number;
  weeklyCount: number;
  weeklyGoal: number;
  streakStatus: 'active' | 'at_risk' | 'broken' | 'new';
  todayRecorded: boolean;
  nextMilestone: {
    type: string;
    label: string;
    daysRemaining: number;
    progress: number;
  } | null;
}
```

**파일:** `frontend/src/presentation/pages/home/StreakBadge.tsx`

**동작:**
- `streakStatus === 'active'` + `todayRecorded === true`: "오늘 기록 완료" 체크 표시
- `streakStatus === 'at_risk'`: 경고색 + "오늘 기록하면 스트릭 유지!"
- `streakStatus === 'broken'`: "다시 시작해보세요" 격려 메시지
- `streakStatus === 'new'`: "첫 기록을 시작하세요" 온보딩 메시지
- `nextMilestone` 존재 시: "30일까지 18일 남았어요" 프로그레스

---

### 2. WeeklyProgress (StreakBadge 하위)

주간 목표 달성 현황을 도트(원형)로 표시.

```
이번 주 3/5
● ● ● ○ ○
월 화 수 목 금
```

**Props:**
```typescript
interface WeeklyProgressProps {
  weeklyCount: number;
  weeklyGoal: number;
  todayRecorded: boolean;
}
```

**파일:** `frontend/src/presentation/pages/home/WeeklyProgress.tsx`

**동작:**
- 채워진 도트 = 기록한 날
- 빈 도트 = 아직 기록 안 한 날
- 오늘 해당 도트에 현재 상태 강조 (테두리 또는 펄스 애니메이션)
- 주간 목표 달성 시 전체 도트 강조색

---

### 3. MilestoneModal (배지 획득 축하)

마일스톤 달성 시 표시되는 축하 모달.

```
┌────────────────────────────┐
│                            │
│      🏅 7일 연속 달성!      │
│                            │
│   꾸준히 기록하고 있네요!    │
│   다음 목표: 30일 연속      │
│                            │
│      [ 확인 ]              │
│                            │
└────────────────────────────┘
```

**Props:**
```typescript
interface MilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestone: {
    type: string;       // '7d' | '30d' | '100d'
    label: string;      // '7일 연속'
  };
  currentStreak: number;
  nextMilestone: {
    label: string;
    daysRemaining: number;
  } | null;
}
```

**파일:** `frontend/src/presentation/components/MilestoneModal.tsx`

**동작:**
- 기존 ConfirmModal 패턴 재사용 (포커스 트랩, ESC 닫기)
- 배지 아이콘은 마일스톤 타입별 구분 (7d: 동메달, 30d: 은메달, 100d: 금메달)
- 닫기 시 `localStorage`에 확인 상태 저장 (중복 표시 방지)

---

### 4. 기존 컴포넌트 통합

**HomePage.tsx 변경:**
```tsx
// MorningBriefing 위에 StreakBadge 추가
{streakData && (
  <StreakBadge
    currentStreak={streakData.currentStreak}
    bestStreak={streakData.bestStreak}
    weeklyCount={streakData.weeklyCount}
    weeklyGoal={streakData.weeklyGoal}
    streakStatus={streakData.streakStatus}
    todayRecorded={streakData.todayRecorded}
    nextMilestone={streakData.nextMilestone}
  />
)}
```

**use-home-data.ts 변경:**
- `useStreakQuery(userId)` 추가 — react-query 훅
- 세션 완료 후 `queryClient.invalidateQueries(queryKeys.streak.byUser(userId))` 호출

---

## 백엔드 구현 상세

### 도메인 엔티티: CommuteStreak

**파일:** `backend/src/domain/entities/commute-streak.entity.ts`

```typescript
type StreakStatus = 'active' | 'at_risk' | 'broken' | 'new';

type MilestoneType = '7d' | '30d' | '100d';

const MILESTONES: { type: MilestoneType; days: number; label: string }[] = [
  { type: '7d', days: 7, label: '7일 연속' },
  { type: '30d', days: 30, label: '30일 연속' },
  { type: '100d', days: 100, label: '100일 연속' },
];

class CommuteStreak {
  // ...fields

  /**
   * 스트릭 갱신 로직 (핵심)
   * - todayKST: 한국 시간 기준 오늘 날짜
   * - sessionId: 완료된 세션 ID
   * - 반환: { updated: boolean, milestoneAchieved: MilestoneType | null }
   */
  recordCompletion(todayKST: string, sessionId: string): {
    updated: boolean;
    milestoneAchieved: MilestoneType | null;
  } {
    // 이미 오늘 기록됨 → 스킵
    if (this.lastRecordDate === todayKST) {
      return { updated: false, milestoneAchieved: null };
    }

    const yesterday = subtractDays(todayKST, 1);

    if (this.lastRecordDate === yesterday) {
      // 어제 기록 있음 → 스트릭 연장
      this.currentStreak += 1;
    } else {
      // 어제 기록 없음 → 새 스트릭 시작
      this.currentStreak = 1;
      this.streakStartDate = todayKST;
    }

    this.lastRecordDate = todayKST;

    // 최고 기록 갱신
    if (this.currentStreak > this.bestStreak) {
      this.bestStreak = this.currentStreak;
      this.bestStreakEnd = todayKST;
    }

    // 주간 카운트 갱신
    this.weeklyCount += 1;

    // 마일스톤 확인
    const milestoneAchieved = this.checkMilestone();

    return { updated: true, milestoneAchieved };
  }

  getStatus(todayKST: string): StreakStatus { ... }
}
```

### Use Case: UpdateStreakUseCase

**파일:** `backend/src/application/use-cases/update-streak.use-case.ts`

- `ManageCommuteSessionUseCase.completeSession()` 호출 후 자동 실행
- `CommuteStreak` 도메인 엔티티의 `recordCompletion()` 호출
- `StreakDailyLog` 기록 저장
- 마일스톤 달성 여부 반환

### Use Case: GetStreakUseCase

**파일:** `backend/src/application/use-cases/get-streak.use-case.ts`

- 사용자의 스트릭 정보 조회
- `todayKST` 기준으로 `streakStatus` 계산
- `nextMilestone` 계산 (다음 미달성 마일스톤까지 남은 일수)
- 주간 카운트가 이번 주가 아니면 리셋

### 타임존 처리

```typescript
// 한국 시간 기준 오늘 날짜 (YYYY-MM-DD)
function getTodayKST(): string {
  const now = new Date();
  const kstOffset = 9 * 60; // UTC+9
  const kst = new Date(now.getTime() + (kstOffset + now.getTimezoneOffset()) * 60000);
  return kst.toISOString().split('T')[0];
}

// 주간 시작일 (월요일) 계산
function getWeekStartKST(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00+09:00');
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1; // 월요일 기준
  date.setDate(date.getDate() - diff);
  return date.toISOString().split('T')[0];
}
```

---

## react-query 통합

### Query Key

```typescript
// query-keys.ts 추가
streak: {
  all: ['streak'] as const,
  byUser: (userId: string) => ['streak', 'user', userId] as const,
  milestones: (userId: string) => ['streak', 'milestones', userId] as const,
},
```

### Query Hook

**파일:** `frontend/src/infrastructure/query/use-streak-query.ts`

```typescript
export function useStreakQuery(userId: string) {
  return useQuery<StreakResponse>({
    queryKey: queryKeys.streak.byUser(userId),
    queryFn: () => getCommuteApiClient().getStreak(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,       // 5분 — 세션 완료 시 invalidate
    refetchOnWindowFocus: true,      // 앱 복귀 시 최신 상태 확인
  });
}
```

### Mutation (세션 완료 시 자동 갱신)

```typescript
// 기존 completeSession 호출 후
const queryClient = useQueryClient();

const completeMutation = useMutation({
  mutationFn: (dto: CompleteSessionDto) =>
    getCommuteApiClient().completeSession(dto),
  onSuccess: (data) => {
    // 스트릭 쿼리 무효화 → 자동 리페치
    queryClient.invalidateQueries({
      queryKey: queryKeys.streak.byUser(userId),
    });
    // 통계 쿼리도 무효화
    queryClient.invalidateQueries({
      queryKey: queryKeys.commuteStats.all,
    });

    // 마일스톤 달성 시 모달 표시
    if (data.streakUpdate?.milestoneAchieved) {
      setMilestoneToShow(data.streakUpdate.milestoneAchieved);
    }
  },
});
```

---

## 프론트엔드 API 클라이언트 확장

**파일:** `frontend/src/infrastructure/api/commute-api.client.ts` 추가

```typescript
// ========== Streak Types ==========

export type StreakStatus = 'active' | 'at_risk' | 'broken' | 'new';
export type MilestoneType = '7d' | '30d' | '100d';

export interface NextMilestone {
  type: MilestoneType;
  label: string;
  daysRemaining: number;
  progress: number;
}

export interface StreakResponse {
  userId: string;
  currentStreak: number;
  bestStreak: number;
  lastRecordDate: string | null;
  streakStartDate: string | null;
  weeklyGoal: number;
  weeklyCount: number;
  weekStartDate: string;
  milestonesAchieved: MilestoneType[];
  latestMilestone: MilestoneType | null;
  nextMilestone: NextMilestone | null;
  streakStatus: StreakStatus;
  excludeWeekends: boolean;
  reminderEnabled: boolean;
  todayRecorded: boolean;
}

export interface StreakUpdateResult {
  currentStreak: number;
  isNewRecord: boolean;
  milestoneAchieved: MilestoneType | null;
  todayFirstCompletion: boolean;
  weeklyCount: number;
  weeklyGoal: number;
}

export interface StreakSettingsDto {
  weeklyGoal?: number;
  excludeWeekends?: boolean;
  reminderEnabled?: boolean;
}

export interface MilestoneInfo {
  type: MilestoneType;
  label: string;
  achieved: boolean;
  achievedAt?: string;
  progress?: number;
  daysRemaining?: number;
}

export interface MilestonesResponse {
  milestones: MilestoneInfo[];
  currentStreak: number;
}

// ========== CommuteApiClient에 메서드 추가 ==========

// class CommuteApiClient 내부:

async getStreak(userId: string): Promise<StreakResponse> {
  return this.apiClient.get<StreakResponse>(`/commute/streak/${userId}`);
}

async updateStreakSettings(
  userId: string,
  dto: StreakSettingsDto,
): Promise<{ success: boolean }> {
  return this.apiClient.patch<{ success: boolean }>(
    `/commute/streak/${userId}/settings`,
    dto,
  );
}

async getMilestones(userId: string): Promise<MilestonesResponse> {
  return this.apiClient.get<MilestonesResponse>(
    `/commute/streak/${userId}/milestones`,
  );
}
```

---

## 기존 코드 변경 요약

### Backend 변경

| 파일 | 변경 내용 |
|------|----------|
| `domain/entities/commute-streak.entity.ts` | **신규** — 스트릭 도메인 엔티티 |
| `domain/entities/streak-daily-log.entity.ts` | **신규** — 일별 기록 엔티티 |
| `domain/repositories/commute-streak.repository.ts` | **신규** — 리포지토리 인터페이스 |
| `infrastructure/persistence/typeorm/commute-streak.entity.ts` | **신규** — TypeORM 엔티티 |
| `infrastructure/persistence/typeorm/streak-daily-log.entity.ts` | **신규** — TypeORM 엔티티 |
| `infrastructure/persistence/repositories/commute-streak.repository.ts` | **신규** — 리포지토리 구현 |
| `application/use-cases/update-streak.use-case.ts` | **신규** — 스트릭 갱신 유스케이스 |
| `application/use-cases/get-streak.use-case.ts` | **신규** — 스트릭 조회 유스케이스 |
| `application/dto/streak.dto.ts` | **신규** — DTO 정의 |
| `presentation/controllers/commute.controller.ts` | **수정** — 스트릭 엔드포인트 3개 추가 |
| `presentation/modules/commute.module.ts` | **수정** — 스트릭 관련 provider 등록 |
| `application/use-cases/manage-commute-session.use-case.ts` | **수정** — completeSession에서 스트릭 갱신 호출 |

### Frontend 변경

| 파일 | 변경 내용 |
|------|----------|
| `presentation/pages/home/StreakBadge.tsx` | **신규** — 스트릭 카운터 컴포넌트 |
| `presentation/pages/home/WeeklyProgress.tsx` | **신규** — 주간 목표 컴포넌트 |
| `presentation/components/MilestoneModal.tsx` | **신규** — 마일스톤 달성 모달 |
| `infrastructure/api/commute-api.client.ts` | **수정** — 스트릭 타입 + API 메서드 추가 |
| `infrastructure/query/query-keys.ts` | **수정** — streak 키 추가 |
| `infrastructure/query/use-streak-query.ts` | **신규** — react-query 훅 |
| `presentation/pages/home/HomePage.tsx` | **수정** — StreakBadge 통합 |
| `presentation/pages/home/use-home-data.ts` | **수정** — useStreakQuery 추가 |

---

## 구현 단계 (Baby Steps)

### Phase 1: 백엔드 도메인 + 스토리지 (S)

| # | 태스크 | 복잡도 | 의존성 |
|---|--------|:------:|--------|
| 1 | `CommuteStreak` 도메인 엔티티 생성 (recordCompletion, getStatus, checkMilestone 메서드) | S | 없음 |
| 2 | `StreakDailyLog` 도메인 엔티티 생성 | S | 없음 |
| 3 | `CommuteStreak` 도메인 엔티티 단위 테스트 (스트릭 연장/끊김/마일스톤 케이스) | S | 1 |
| 4 | TypeORM 엔티티 + 리포지토리 인터페이스 생성 | S | 1, 2 |
| 5 | 리포지토리 구현 (findByUserId, save, update) | M | 4 |

### Phase 2: 백엔드 유스케이스 + API (M)

| # | 태스크 | 복잡도 | 의존성 |
|---|--------|:------:|--------|
| 6 | `GetStreakUseCase` 구현 (스트릭 조회 + streakStatus 계산 + nextMilestone) | M | 5 |
| 7 | `UpdateStreakUseCase` 구현 (세션 완료 시 스트릭 갱신) | M | 5 |
| 8 | DTO 정의 (StreakResponseDto, StreakSettingsDto 등) | S | 없음 |
| 9 | CommuteController에 스트릭 엔드포인트 3개 추가 | M | 6, 7, 8 |
| 10 | ManageCommuteSessionUseCase.completeSession에 스트릭 갱신 통합 | M | 7 |
| 11 | CommuteModule에 스트릭 관련 provider 등록 | S | 9 |
| 12 | 백엔드 유스케이스 단위 테스트 (GetStreak, UpdateStreak) | M | 6, 7 |
| 13 | 컨트롤러 통합 테스트 (스트릭 CRUD + 권한 검사) | M | 9 |

### Phase 3: 프론트엔드 컴포넌트 (M)

| # | 태스크 | 복잡도 | 의존성 |
|---|--------|:------:|--------|
| 14 | commute-api.client.ts에 스트릭 타입 + API 메서드 추가 | S | 9 |
| 15 | query-keys.ts에 streak 키 추가 + use-streak-query.ts 작성 | S | 14 |
| 16 | StreakBadge 컴포넌트 구현 (상태별 UI 분기) | M | 15 |
| 17 | WeeklyProgress 컴포넌트 구현 (도트 표시) | S | 없음 |
| 18 | MilestoneModal 컴포넌트 구현 (기존 ConfirmModal 패턴 활용) | M | 없음 |
| 19 | HomePage.tsx에 StreakBadge 통합 + use-home-data.ts 수정 | M | 15, 16 |
| 20 | 세션 완료 후 스트릭 갱신 연동 (invalidateQueries + MilestoneModal 트리거) | M | 15, 18 |

### Phase 4: CSS + 테스트 + 접근성 (S)

| # | 태스크 | 복잡도 | 의존성 |
|---|--------|:------:|--------|
| 21 | StreakBadge / WeeklyProgress CSS 스타일링 (기존 home.css 패턴 따라) | S | 16, 17 |
| 22 | MilestoneModal CSS + 애니메이션 | S | 18 |
| 23 | StreakBadge 컴포넌트 테스트 (각 streakStatus별 렌더링) | M | 16 |
| 24 | MilestoneModal 테스트 (열기/닫기, 포커스 트랩, ESC) | S | 18 |
| 25 | 접근성 검증 (aria-label, 스크린 리더 테스트, 키보드 탐색) | S | 21, 22 |

**총 예상 소요: 25개 태스크, ~1.5 사이클**

---

## 인수 조건 (Acceptance Criteria)

### 스트릭 카운터

- [ ] Given 로그인한 사용자가 홈 화면에 진입했을 때, When 스트릭 데이터가 로드되면, Then 현재 연속 기록 일수가 홈 상단에 표시된다
- [ ] Given 사용자가 어제와 오늘 연속으로 기록했을 때, When 홈 화면을 확인하면, Then currentStreak이 실제 연속 일수와 일치한다
- [ ] Given 사용자가 하루를 건너뛰었을 때, When 홈 화면을 확인하면, Then currentStreak이 0 또는 1로 리셋되고 "다시 시작해보세요" 메시지가 표시된다

### 스트릭 갱신

- [ ] Given 사용자가 출퇴근 세션을 완료했을 때, When 오늘 첫 완료인 경우, Then currentStreak이 1 증가하고 lastRecordDate가 오늘(KST)로 갱신된다
- [ ] Given 사용자가 같은 날 두 번째 세션을 완료했을 때, When completeSession을 호출하면, Then 스트릭은 변경되지 않고 streakUpdate.todayFirstCompletion이 false다
- [ ] Given 서버 시간이 UTC 기준 오후 3시(KST 자정)일 때, When 세션을 완료하면, Then KST 기준 정확한 날짜로 스트릭이 기록된다

### 주간 목표

- [ ] Given 이번 주(월-금) 중 3회 기록한 사용자가, When 홈 화면을 확인하면, Then "이번 주 3/5" 프로그레스가 정확히 표시된다
- [ ] Given 월요일이 시작되었을 때, When 새로운 주가 시작되면, Then weeklyCount가 0으로 리셋된다

### 마일스톤

- [ ] Given 사용자가 7일 연속 기록을 달성했을 때, When 세션 완료 응답을 받으면, Then streakUpdate.milestoneAchieved가 "7d"이고 축하 모달이 표시된다
- [ ] Given 이미 7일 마일스톤을 달성한 사용자가, When 다시 7일이 되어도, Then 마일스톤이 중복 표시되지 않는다
- [ ] Given 마일스톤 달성 모달이 표시될 때, When 사용자가 확인을 누르거나 ESC를 누르면, Then 모달이 닫히고 다시 표시되지 않는다

### 권한 & 보안

- [ ] Given 인증되지 않은 요청이, When /commute/streak/:userId를 호출하면, Then 401 Unauthorized가 반환된다
- [ ] Given 사용자 A가, When 사용자 B의 스트릭을 조회하려 하면, Then 403 Forbidden이 반환된다

### 접근성

- [ ] Given 스크린 리더를 사용하는 사용자가, When StreakBadge를 탐색하면, Then "연속 12일 기록 중, 이번 주 5회 중 3회 완료"가 읽힌다
- [ ] Given 키보드만 사용하는 사용자가, When MilestoneModal이 표시되면, Then 포커스가 모달 내부에 갇히고 ESC로 닫을 수 있다

---

## 테스트 전략

### 단위 테스트 (Unit)

| 대상 | 테스트 항목 | 예상 수 |
|------|-----------|:-------:|
| `CommuteStreak` 엔티티 | recordCompletion (연장/끊김/중복/마일스톤), getStatus, checkMilestone, 주간 리셋 | 12 |
| `GetStreakUseCase` | 조회, streakStatus 계산, nextMilestone, 주간 리셋, 없는 사용자 | 6 |
| `UpdateStreakUseCase` | 갱신 성공, 중복 방지, 마일스톤 달성, 주간 카운트 | 6 |
| 타임존 유틸 | getTodayKST, getWeekStartKST, subtractDays | 4 |

### 컴포넌트 테스트 (Frontend)

| 대상 | 테스트 항목 | 예상 수 |
|------|-----------|:-------:|
| `StreakBadge` | active/at_risk/broken/new 상태별 렌더링, 카운터 표시, 주간 진행 | 6 |
| `WeeklyProgress` | 도트 렌더링, 목표 달성 강조 | 3 |
| `MilestoneModal` | 열기/닫기, 포커스 트랩, ESC, 마일스톤 타입별 표시 | 4 |

### 통합 테스트 (Controller)

| 대상 | 테스트 항목 | 예상 수 |
|------|-----------|:-------:|
| 스트릭 API | GET/PATCH/milestones, 권한 검사, 404 처리 | 8 |
| 세션 완료 + 스트릭 | 완료 시 스트릭 갱신, 응답에 streakUpdate 포함 | 3 |

**총 예상 테스트: ~52개**

---

## 오픈 질문

1. **주말 포함/제외 기본값**: 기본값을 주말 포함(`false`)으로 설정했는데, 대부분의 사용자가 주 5일 근무자라면 주말 제외가 더 나을 수 있음. -> **결정: 기본값 포함(false), 설정에서 변경 가능 (Should have)**
2. **스트릭 프리즈 (면제권)**: 30일 달성 시 1회 면제권 제공은 게이미피케이션 효과가 높지만, 구현 복잡도가 올라감. -> **결정: Could have (이번 사이클에서 시간 여유 시 구현)**
3. **스톱워치 모드와 스트릭**: 현재 스톱워치 모드로 기록한 것도 스트릭에 포함할지? -> **결정: 포함. CommuteSession status가 'completed'이면 모두 스트릭에 반영**

---

## 명시적 제외 사항

- **리더보드/소셜 랭킹**: 사용자 기반이 충분해진 후 별도 기능으로 기획 (F-9 후보)
- **포인트/리워드 시스템**: 실물 보상은 비즈니스 모델 확정 후 (비용 발생)
- **커스텀 도전 생성**: "이번 주 4번 30분 이내 출근" 같은 사용자 정의 목표는 복잡도 과다
- **푸시 알림 리마인더**: 기존 EventBridge + Solapi 인프라 연동은 Should have로 분류. 이번 사이클에서 PWA push 기반 간단 리마인더만 고려
- **데이터 마이그레이션**: 기존 완료된 세션으로 과거 스트릭 소급 계산은 하지 않음. 기능 활성화 시점부터 기록 시작

---

*작성 완료: 2026-02-17*
*다음 단계: Dev 에이전트에게 전달 -> Phase 1부터 구현 시작*
