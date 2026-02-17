# F-2: 주간 출퇴근 리포트 (Weekly Commute Report)

> 작성일: 2026-02-17
> 작성자: PM Agent
> 상태: Draft
> RICE Score: 72 (Reach: 80, Impact: 2, Confidence: 90%, Effort: 2 사이클)

---

## JTBD

**When** 매일 출퇴근을 기록하고 있지만 "이번 주에 내 출퇴근이 어땠는지" 전체 그림을 모를 때,
**I want to** 주간 단위로 평균 소요시간, 최고/최악의 날, 추세를 한눈에 확인하고 싶어서,
**So I can** 출퇴근 패턴을 이해하고, 더 나은 출발 시간이나 경로를 스스로 결정할 수 있다.

---

## 문제 정의

### Who
- **김지수 (29세, 직장인)**: 매일 지하철+버스로 편도 50분 출퇴근. F-5 스트릭으로 매일 기록을 남기기 시작했으나, 쌓인 데이터가 "그래서 뭐?"인 상태.
- **공통 특성**: 출퇴근 기록을 3일 이상 남긴 모든 사용자. 기록은 하는데 인사이트를 얻지 못하는 사용자.

### Pain (빈도 x 심각도)
- **빈도**: 주 1회 (매주 금요일이나 월요일에 "이번 주 어땠지?" 궁금)
- **심각도**: 중간 — 현재 `/commute/stats` API가 30일 전체 통계를 제공하지만, "이번 주"에 집중된 요약이 없어 체감이 안 됨
- **결과**: 기록 동기 약화. "기록해봤자 뭐가 달라지나?" -> 스트릭 이탈 위험

### 현재 워크어라운드
- `GET /commute/stats/:userId?days=7` 호출 시 최근 7일 통계를 받을 수 있으나:
  - 프론트엔드에서 이 데이터를 **주간 리포트** 형태로 보여주는 UI가 없음
  - "이번 주 월~금"이 아닌 "오늘 기준 7일"이라 주간 경계가 맞지 않음
  - 일별 소요시간 목록, 전주 대비 트렌드, 베스트/워스트 날 등 핵심 인사이트 없음
- 홈 화면 StatsSection에 30일 평균만 표시 -> 주간 단위 변화를 알 수 없음

### 성공 지표
| 지표 | 현재 추정 | 목표 (출시 4주 후) |
|------|----------|-------------------|
| 주간 리포트 조회율 | 0% (기능 없음) | 활성 사용자의 60%+ 주 1회 이상 조회 |
| 스트릭 7일+ 유지율 | F-5 출시 후 측정 | 15% 상승 (인사이트가 기록 동기 강화) |
| 주간 리포트 내 "인사이트" 읽음 시간 | 0 | 평균 8초+ (스크롤해서 읽는 수준) |
| 주간 리포트 -> 홈 -> 출발하기 전환율 | 0% | 10%+ |

---

## 솔루션

### 개요

매주 월~금(또는 월~일) 단위로 출퇴근 세션 데이터를 집계하여 **주간 리포트**를 생성한다. 백엔드에서 주간 경계(월요일~일요일, KST 기준)로 세션을 조회하고, 일별 소요시간/지연/날씨 데이터를 집계한 뒤 전주 대비 변화량과 텍스트 인사이트를 포함한 리포트 DTO를 반환한다.

프론트엔드에서는 홈 화면 하단 또는 별도 섹션으로 **주간 리포트 카드**를 배치하고, 탭으로 확장하면 일별 막대 차트, 베스트/워스트 날, 전주 대비 트렌드, 인사이트 목록을 표시한다. 외부 차팅 라이브러리 없이 CSS 기반 간단한 막대 차트를 사용하여 번들 사이즈를 유지한다.

**핵심 설계 원칙:**
- **기존 데이터 재사용**: `commute_sessions` + `streak_daily_logs` 테이블에서 모든 데이터를 얻음. 새 테이블 불필요
- **새 외부 API 없음**: 모든 계산은 서버사이드에서 기존 세션 데이터로 수행
- **순수 함수 기반 집계**: `buildWeeklyReport()` 순수 함수로 테스트 용이성 확보 (F-1 MorningBriefing 패턴 답습)
- **CSS-only 차트**: recharts/chart.js 등 무거운 라이브러리 대신 CSS `width%` 막대 차트 사용
- **F-5 스트릭 통합**: 주간 리포트 상단에 이번 주 스트릭 진행률 연동

### 사용자 플로우

```
[홈 화면 하단] → "이번 주 리포트" 카드 요약 확인
                  "평균 47분 · 전주 대비 -3분"
                  ↓
[카드 탭/클릭] → 주간 리포트 상세 펼침 (accordion)
                  ↓
[상세 뷰]      → 일별 막대 차트 (월~금)
               → 베스트/워스트 날 하이라이트
               → 전주 대비 트렌드 (개선/악화/유지)
               → 인사이트 목록 (2-3개)
               → 스트릭 주간 현황 (F-5 연동)
                  ↓
[주 선택]      → 좌우 화살표로 이전 주 리포트 탐색 (최대 4주)
```

**에러/엣지 케이스:**
```
[데이터 없음]      → "이번 주 기록이 없어요. 출퇴근을 기록해보세요!" (빈 상태 카드)
[1-2건만 있음]     → 차트 표시하되 "데이터가 부족해 정확도가 낮을 수 있어요" 안내
[전주 데이터 없음]  → 전주 비교 섹션 숨김, "이번 주가 첫 리포트예요!" 표시
[주말 포함/제외]    → F-5 스트릭 설정의 excludeWeekends와 연동
```

---

## 스코프 (MoSCoW)

### Must have (이것 없으면 기능이 안 됨)
- 주간 리포트 API: `GET /commute/weekly-report/:userId` — 이번 주 + 전주 데이터
- 일별 소요시간 목록 (월~일, 각 날짜별 평균 소요시간 + 세션 수)
- 주간 평균 소요시간
- 전주 대비 변화량 (분 단위 + 퍼센트)
- 베스트/워스트 날 하이라이트
- 홈 화면 하단 주간 리포트 요약 카드
- 카드 확장 시 일별 막대 차트 (CSS-only)

### Should have (중요하지만 없어도 작동)
- 이전 주 탐색 (최대 4주 뒤까지)
- 인사이트 텍스트 자동 생성 ("화요일이 가장 빨랐어요", "비 오는 날 5분 더 걸렸어요")
- 전주 대비 트렌드 아이콘 (개선/악화/유지)
- F-5 스트릭 주간 현황 통합 표시

### Could have (시간 여유 시)
- 날씨별 소요시간 비교 (맑음 vs 비)
- 출발 시간대별 소요시간 비교 (이른 출발 vs 늦은 출발)
- 주간 리포트 공유 기능 (이미지 캡처)
- 주간 리포트 알림 (매주 월요일 아침 "지난주 리포트가 준비됐어요")

### Won't have (이번 사이클 제외)
- 월간/연간 리포트 (주간 안정화 후 추후 확장)
- 경로별 주간 비교 리포트 (복잡도 과다)
- PDF/CSV 내보내기 (사용 빈도 불확실)
- 실시간 주간 목표 설정 (F-5 주간 목표와 중복)

---

## 백엔드 설계

### 새 테이블: 없음

기존 테이블만으로 충분하다:
- `alert_system.commute_sessions`: 세션별 소요시간, 지연, 날씨, 시작/완료 시각
- `alert_system.streak_daily_logs`: 날짜별 기록 여부 (스트릭 연동)
- `alert_system.commute_routes`: 경로 이름 (리포트에 경로명 표시)

주간 리포트는 **실시간 집계**(조회 시 계산)로 구현한다. 사용자 수가 소규모이므로 캐싱 없이 직접 쿼리로 충분하며, 향후 사용자 증가 시 주간 스냅샷 테이블로 전환 가능하다.

### 기존 리포지토리 인터페이스 확장

#### `ICommuteSessionRepository` 추가 메서드

```typescript
// 기존 인터페이스에 추가
findCompletedByUserIdInDateRange(
  userId: string,
  startDate: Date,
  endDate: Date,
): Promise<CommuteSession[]>;
```

> 기존 `findByUserIdInDateRange`가 이미 존재하므로, 유스케이스 내에서 `status === 'completed'` 필터링으로도 충분하다. 새 메서드 추가 대신 기존 메서드를 활용한다.

### 도메인 로직: 순수 함수 `buildWeeklyReport`

**파일:** `backend/src/domain/services/weekly-report.service.ts`

```typescript
import { CommuteSession, SessionStatus } from '@domain/entities/commute-session.entity';

// ========== Types ==========

type TrendDirection = 'improving' | 'stable' | 'worsening';

interface DailyStats {
  date: string;               // 'YYYY-MM-DD'
  dayOfWeek: number;          // 0=일, 1=월, ..., 6=토
  dayName: string;            // '월요일', '화요일', ...
  sessionCount: number;
  averageDuration: number;    // 평균 소요시간 (분)
  totalDuration: number;      // 총 소요시간 (분)
  averageDelay: number;       // 평균 지연 (분)
  averageWaitTime: number;    // 평균 대기시간 (분)
  weatherCondition?: string;  // 대표 날씨 (가장 많은 조건)
}

interface WeeklyReportData {
  weekStartDate: string;      // 'YYYY-MM-DD' (월요일)
  weekEndDate: string;        // 'YYYY-MM-DD' (일요일)
  weekLabel: string;          // '2월 3주차' 형태

  // 핵심 지표
  totalSessions: number;
  totalRecordedDays: number;
  averageDuration: number;    // 주간 평균 소요시간 (분)
  minDuration: number;        // 최소 소요시간
  maxDuration: number;        // 최대 소요시간

  // 일별 상세
  dailyStats: DailyStats[];

  // 베스트/워스트
  bestDay: DailyStats | null;   // 가장 빨랐던 날
  worstDay: DailyStats | null;  // 가장 느렸던 날

  // 전주 대비
  previousWeekAverage: number | null;
  changeFromPrevious: number | null;      // 분 단위 변화량 (음수 = 개선)
  changePercentage: number | null;        // 퍼센트 변화 (음수 = 개선)
  trend: TrendDirection | null;           // null = 전주 데이터 없음

  // 인사이트
  insights: string[];

  // 스트릭 연동 (F-5)
  streakWeeklyCount: number;
  streakWeeklyGoal: number;
}

// ========== 순수 함수 ==========

const DAY_NAMES = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

function buildWeeklyReport(
  currentWeekSessions: CommuteSession[],
  previousWeekSessions: CommuteSession[],
  weekStartDate: string,          // 'YYYY-MM-DD' (월요일, KST)
  weekEndDate: string,            // 'YYYY-MM-DD' (일요일, KST)
  streakWeeklyCount: number,
  streakWeeklyGoal: number,
): WeeklyReportData {
  // 1. 완료 세션만 필터
  const completed = currentWeekSessions.filter(
    s => s.status === SessionStatus.COMPLETED && s.totalDurationMinutes
  );
  const prevCompleted = previousWeekSessions.filter(
    s => s.status === SessionStatus.COMPLETED && s.totalDurationMinutes
  );

  // 2. 일별 집계
  const dailyStats = buildDailyStats(completed, weekStartDate);

  // 3. 주간 전체 통계
  const durations = completed.map(s => s.totalDurationMinutes!);
  const averageDuration = average(durations);
  const minDuration = durations.length > 0 ? Math.min(...durations) : 0;
  const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;

  // 4. 베스트/워스트 날
  const daysWithData = dailyStats.filter(d => d.sessionCount > 0);
  const bestDay = daysWithData.length > 0
    ? daysWithData.reduce((a, b) => a.averageDuration < b.averageDuration ? a : b)
    : null;
  const worstDay = daysWithData.length > 0
    ? daysWithData.reduce((a, b) => a.averageDuration > b.averageDuration ? a : b)
    : null;

  // 5. 전주 대비
  const prevDurations = prevCompleted.map(s => s.totalDurationMinutes!);
  const previousWeekAverage = prevDurations.length > 0 ? average(prevDurations) : null;
  const changeFromPrevious = previousWeekAverage !== null
    ? Math.round(averageDuration - previousWeekAverage)
    : null;
  const changePercentage = previousWeekAverage !== null && previousWeekAverage > 0
    ? Math.round(((averageDuration - previousWeekAverage) / previousWeekAverage) * 100)
    : null;
  const trend = determineTrend(changeFromPrevious);

  // 6. 인사이트 생성
  const insights = generateWeeklyInsights(
    dailyStats, bestDay, worstDay, changeFromPrevious, trend, completed,
  );

  // 7. 주차 라벨
  const weekLabel = formatWeekLabel(weekStartDate);

  return {
    weekStartDate,
    weekEndDate,
    weekLabel,
    totalSessions: completed.length,
    totalRecordedDays: daysWithData.length,
    averageDuration: Math.round(averageDuration),
    minDuration,
    maxDuration,
    dailyStats,
    bestDay,
    worstDay,
    previousWeekAverage: previousWeekAverage !== null ? Math.round(previousWeekAverage) : null,
    changeFromPrevious,
    changePercentage,
    trend,
    insights,
    streakWeeklyCount,
    streakWeeklyGoal,
  };
}
```

### API 엔드포인트

#### 1. GET /commute/weekly-report/:userId — 주간 리포트 조회

**요청:**
```
GET /commute/weekly-report/{userId}?weekOffset=0
Authorization: Bearer {jwt}
```

**파라미터:**
- `weekOffset` (선택, 기본값 0): 이번 주 = 0, 지난주 = 1, 2주 전 = 2 (최대 4)

**응답 (200):**
```json
{
  "weekStartDate": "2026-02-10",
  "weekEndDate": "2026-02-16",
  "weekLabel": "2월 3주차",

  "totalSessions": 8,
  "totalRecordedDays": 5,
  "averageDuration": 47,
  "minDuration": 38,
  "maxDuration": 62,

  "dailyStats": [
    {
      "date": "2026-02-10",
      "dayOfWeek": 1,
      "dayName": "월요일",
      "sessionCount": 2,
      "averageDuration": 52,
      "totalDuration": 104,
      "averageDelay": 5,
      "averageWaitTime": 8,
      "weatherCondition": "맑음"
    },
    {
      "date": "2026-02-11",
      "dayOfWeek": 2,
      "dayName": "화요일",
      "sessionCount": 2,
      "averageDuration": 43,
      "totalDuration": 86,
      "averageDelay": -2,
      "averageWaitTime": 5,
      "weatherCondition": "맑음"
    }
  ],

  "bestDay": {
    "date": "2026-02-11",
    "dayOfWeek": 2,
    "dayName": "화요일",
    "sessionCount": 2,
    "averageDuration": 43,
    "totalDuration": 86,
    "averageDelay": -2,
    "averageWaitTime": 5,
    "weatherCondition": "맑음"
  },
  "worstDay": {
    "date": "2026-02-13",
    "dayOfWeek": 4,
    "dayName": "목요일",
    "sessionCount": 2,
    "averageDuration": 62,
    "totalDuration": 124,
    "averageDelay": 12,
    "averageWaitTime": 15,
    "weatherCondition": "비"
  },

  "previousWeekAverage": 50,
  "changeFromPrevious": -3,
  "changePercentage": -6,
  "trend": "improving",

  "insights": [
    "전주보다 평균 3분 빨라졌어요!",
    "화요일이 가장 빨랐어요 (43분)",
    "비 오는 목요일에 가장 오래 걸렸어요 (62분)"
  ],

  "streakWeeklyCount": 5,
  "streakWeeklyGoal": 5
}
```

**`trend` 값:**
- `"improving"`: 전주 대비 3분 이상 개선
- `"stable"`: 전주 대비 ±3분 이내
- `"worsening"`: 전주 대비 3분 이상 악화
- `null`: 전주 데이터 없음

**빈 데이터 응답 (200) — 세션 없음:**
```json
{
  "weekStartDate": "2026-02-17",
  "weekEndDate": "2026-02-23",
  "weekLabel": "2월 4주차",
  "totalSessions": 0,
  "totalRecordedDays": 0,
  "averageDuration": 0,
  "minDuration": 0,
  "maxDuration": 0,
  "dailyStats": [
    { "date": "2026-02-17", "dayOfWeek": 1, "dayName": "월요일", "sessionCount": 0, "averageDuration": 0, "totalDuration": 0, "averageDelay": 0, "averageWaitTime": 0, "weatherCondition": null },
    ...
  ],
  "bestDay": null,
  "worstDay": null,
  "previousWeekAverage": null,
  "changeFromPrevious": null,
  "changePercentage": null,
  "trend": null,
  "insights": ["이번 주 기록이 아직 없어요. 출퇴근을 기록해보세요!"],
  "streakWeeklyCount": 0,
  "streakWeeklyGoal": 5
}
```

**권한:** JWT 인증 + 본인 데이터만 조회 (403 if userId !== req.user.userId)

---

### DTO 정의

**파일:** `backend/src/application/dto/weekly-report.dto.ts`

```typescript
import { IsOptional, IsNumber, Min, Max } from 'class-validator';

// ========== Query DTO ==========

export class WeeklyReportQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(4)
  weekOffset?: number;
}

// ========== Response DTOs (interfaces) ==========

export interface DailyStatsDto {
  date: string;
  dayOfWeek: number;
  dayName: string;
  sessionCount: number;
  averageDuration: number;
  totalDuration: number;
  averageDelay: number;
  averageWaitTime: number;
  weatherCondition: string | null;
}

export type TrendDirection = 'improving' | 'stable' | 'worsening';

export interface WeeklyReportResponseDto {
  weekStartDate: string;
  weekEndDate: string;
  weekLabel: string;

  totalSessions: number;
  totalRecordedDays: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;

  dailyStats: DailyStatsDto[];

  bestDay: DailyStatsDto | null;
  worstDay: DailyStatsDto | null;

  previousWeekAverage: number | null;
  changeFromPrevious: number | null;
  changePercentage: number | null;
  trend: TrendDirection | null;

  insights: string[];

  streakWeeklyCount: number;
  streakWeeklyGoal: number;
}
```

### Use Case: GetWeeklyReportUseCase

**파일:** `backend/src/application/use-cases/get-weekly-report.use-case.ts`

```typescript
@Injectable()
export class GetWeeklyReportUseCase {
  constructor(
    @Inject(COMMUTE_SESSION_REPOSITORY)
    private readonly sessionRepository: ICommuteSessionRepository,
    @Inject(COMMUTE_STREAK_REPOSITORY)
    private readonly streakRepository: ICommuteStreakRepository,
  ) {}

  async execute(userId: string, weekOffset = 0): Promise<WeeklyReportResponseDto> {
    const todayKST = getTodayKST();

    // 1. 주간 경계 계산 (월요일~일요일, KST)
    const { weekStart, weekEnd } = getWeekBounds(todayKST, weekOffset);

    // 2. 이번 주 세션 조회
    const currentWeekSessions = await this.sessionRepository.findByUserIdInDateRange(
      userId,
      toDateKST(weekStart),
      toDateKST(weekEnd, true), // 일요일 23:59:59
    );

    // 3. 전주 세션 조회 (전주 대비 비교용)
    const { weekStart: prevStart, weekEnd: prevEnd } = getWeekBounds(todayKST, weekOffset + 1);
    const previousWeekSessions = await this.sessionRepository.findByUserIdInDateRange(
      userId,
      toDateKST(prevStart),
      toDateKST(prevEnd, true),
    );

    // 4. 스트릭 주간 현황 조회
    const streak = await this.streakRepository.findByUserId(userId);
    const streakWeeklyCount = streak?.weeklyCount ?? 0;
    const streakWeeklyGoal = streak?.weeklyGoal ?? 5;

    // 5. 순수 함수로 리포트 빌드
    return buildWeeklyReport(
      currentWeekSessions,
      previousWeekSessions,
      weekStart,
      weekEnd,
      streakWeeklyCount,
      streakWeeklyGoal,
    );
  }
}
```

### 타임존 유틸 확장

**파일:** `backend/src/domain/utils/kst-date.ts` (기존 파일에 추가)

```typescript
// 기존 getTodayKST, subtractDays, getWeekStartKST에 추가

/** 주어진 날짜 기준 weekOffset만큼 이전 주의 월요일~일요일 범위 반환 */
function getWeekBounds(todayKST: string, weekOffset: number): {
  weekStart: string;  // 월요일 YYYY-MM-DD
  weekEnd: string;    // 일요일 YYYY-MM-DD
} {
  const currentWeekStart = getWeekStartKST(todayKST);
  const offsetDays = weekOffset * 7;
  const weekStart = subtractDays(currentWeekStart, offsetDays);
  const weekEnd = addDays(weekStart, 6);
  return { weekStart, weekEnd };
}

/** 주차 라벨 생성: "2월 3주차" 형태 */
function formatWeekLabel(weekStartDate: string): string {
  const date = new Date(weekStartDate + 'T00:00:00+09:00');
  const month = date.getMonth() + 1;
  const weekOfMonth = Math.ceil(date.getDate() / 7);
  return `${month}월 ${weekOfMonth}주차`;
}

/** YYYY-MM-DD 문자열을 Date 객체로 변환 (KST 기준) */
function toDateKST(dateStr: string, endOfDay = false): Date {
  const time = endOfDay ? 'T23:59:59+09:00' : 'T00:00:00+09:00';
  return new Date(dateStr + time);
}

/** 날짜에 N일 추가 */
function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T00:00:00+09:00');
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}
```

### 인사이트 생성 로직

**파일:** `backend/src/domain/services/weekly-report.service.ts` 내부

```typescript
function generateWeeklyInsights(
  dailyStats: DailyStats[],
  bestDay: DailyStats | null,
  worstDay: DailyStats | null,
  changeFromPrevious: number | null,
  trend: TrendDirection | null,
  sessions: CommuteSession[],
): string[] {
  const insights: string[] = [];

  // 1. 전주 대비 변화
  if (changeFromPrevious !== null && trend !== null) {
    if (trend === 'improving') {
      insights.push(`전주보다 평균 ${Math.abs(changeFromPrevious)}분 빨라졌어요!`);
    } else if (trend === 'worsening') {
      insights.push(`전주보다 평균 ${Math.abs(changeFromPrevious)}분 더 걸렸어요`);
    } else {
      insights.push('전주와 비슷한 출퇴근 시간이에요');
    }
  }

  // 2. 베스트/워스트 날
  if (bestDay && worstDay && bestDay.date !== worstDay.date) {
    insights.push(`${bestDay.dayName}이 가장 빨랐어요 (${bestDay.averageDuration}분)`);
    if (worstDay.averageDuration - bestDay.averageDuration >= 5) {
      const reason = worstDay.weatherCondition === '비' || worstDay.weatherCondition === '소나기'
        ? `비 오는 ${worstDay.dayName}`
        : worstDay.dayName;
      insights.push(`${reason}에 가장 오래 걸렸어요 (${worstDay.averageDuration}분)`);
    }
  }

  // 3. 지연 패턴
  const daysWithDelay = dailyStats.filter(d => d.averageDelay >= 5);
  if (daysWithDelay.length >= 2) {
    insights.push(`이번 주 ${daysWithDelay.length}일이 5분 이상 지연됐어요`);
  }

  // 4. 대기시간 비율
  const totalDuration = sessions.reduce((s, sess) => s + (sess.totalDurationMinutes ?? 0), 0);
  const totalWait = sessions.reduce((s, sess) => s + sess.totalWaitMinutes, 0);
  if (totalDuration > 0) {
    const waitPct = Math.round((totalWait / totalDuration) * 100);
    if (waitPct >= 25) {
      insights.push(`이번 주 출퇴근 시간의 ${waitPct}%가 대기/환승이에요`);
    }
  }

  // 5. 데이터 부족 안내
  const daysWithData = dailyStats.filter(d => d.sessionCount > 0);
  if (daysWithData.length === 0) {
    return ['이번 주 기록이 아직 없어요. 출퇴근을 기록해보세요!'];
  }
  if (daysWithData.length < 3) {
    insights.push('기록이 더 쌓이면 정확한 분석을 드릴 수 있어요');
  }

  return insights.slice(0, 4); // 최대 4개
}
```

---

## 프론트엔드 설계

### 1. WeeklyReportCard (홈 화면 하단)

**위치:** `HomePage` 하단, `StatsSection` 아래에 배치

```
┌────────────────────────────────────────────────┐
│  이번 주 리포트                    ◀ 2월 3주차 ▶  │
│                                                │
│  평균 47분  ·  전주 대비 -3분 ↓ 개선            │
│  기록 5일 / 목표 5일  ✅                        │
│                                                │
│  [펼치기 ▼]                                    │
└────────────────────────────────────────────────┘

── 펼친 상태 ──────────────────────────────────────

┌────────────────────────────────────────────────┐
│  이번 주 리포트                    ◀ 2월 3주차 ▶  │
│                                                │
│  평균 47분  ·  전주 대비 -3분 ↓ 개선            │
│  기록 5일 / 목표 5일  ✅                        │
│                                                │
│  ── 일별 소요시간 ──────────────────            │
│                                                │
│  월  ████████████████████  52분                 │
│  화  ██████████████  43분  ⭐ 최고             │
│  수  ████████████████  48분                     │
│  목  ██████████████████████████  62분  😓       │
│  금  ██████████████  42분                       │
│                                                │
│  ── 인사이트 ────────────────────               │
│  · 전주보다 평균 3분 빨라졌어요!               │
│  · 화요일이 가장 빨랐어요 (43분)               │
│  · 비 오는 목요일에 가장 오래 걸렸어요          │
│                                                │
│  [접기 ▲]                                      │
└────────────────────────────────────────────────┘
```

**Props:**
```typescript
interface WeeklyReportCardProps {
  report: WeeklyReportResponse | null;
  isLoading: boolean;
  error: string;
  weekOffset: number;
  onWeekChange: (offset: number) => void;
}
```

**파일:** `frontend/src/presentation/pages/home/WeeklyReportCard.tsx`

**동작:**
- 기본 접힌 상태: 요약만 표시 (평균 시간 + 전주 대비 + 기록 일수)
- 탭하면 accordion 펼침 (일별 차트 + 인사이트)
- 좌우 화살표로 `weekOffset` 변경 (0~4)
- `weekOffset=0`이면 오른쪽 화살표 비활성화
- `weekOffset=4`이면 왼쪽 화살표 비활성화
- 데이터 없으면 빈 상태 메시지 표시

---

### 2. DailyBarChart (일별 막대 차트)

CSS-only 가로 막대 차트. 외부 라이브러리 없음.

```
월  ████████████████████  52분
화  ██████████████  43분  ⭐
수  ████████████████  48분
목  ██████████████████████████  62분
금  ██████████████  42분
```

**Props:**
```typescript
interface DailyBarChartProps {
  dailyStats: DailyStatsDto[];
  bestDayDate: string | null;
  worstDayDate: string | null;
  maxDuration: number;  // 차트 최대값 (스케일링 기준)
}
```

**파일:** `frontend/src/presentation/pages/home/DailyBarChart.tsx`

**동작:**
- 각 막대의 `width`는 `(duration / maxDuration) * 100%`
- 베스트 날: 녹색 막대 + 별 아이콘
- 워스트 날: 주황색 막대 + 느림 아이콘
- 일반 날: 기본 파란색 막대
- 데이터 없는 날: 회색 점선 막대 + "기록 없음"
- 각 막대 오른쪽에 소요시간(분) 텍스트

**CSS 패턴:**
```css
.daily-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}
.daily-bar__label {
  width: 24px;
  text-align: right;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}
.daily-bar__track {
  flex: 1;
  height: 24px;
  background: var(--color-bg-secondary);
  border-radius: 4px;
  overflow: hidden;
}
.daily-bar__fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}
.daily-bar__fill--best { background: var(--color-success); }
.daily-bar__fill--worst { background: var(--color-warning); }
.daily-bar__fill--normal { background: var(--color-primary); }
.daily-bar__fill--empty { background: transparent; border: 1px dashed var(--color-border); }
.daily-bar__value {
  min-width: 48px;
  font-size: 0.8rem;
  font-weight: 600;
}
```

---

### 3. TrendIndicator (전주 대비 트렌드)

```
↓ -3분 (6% 개선)     ← improving
→ 변화 없음           ← stable
↑ +5분 (10% 악화)    ← worsening
```

**Props:**
```typescript
interface TrendIndicatorProps {
  changeFromPrevious: number | null;
  changePercentage: number | null;
  trend: TrendDirection | null;
}
```

**파일:** `frontend/src/presentation/pages/home/TrendIndicator.tsx`

---

### 4. InsightList (인사이트 목록)

```
· 전주보다 평균 3분 빨라졌어요!
· 화요일이 가장 빨랐어요 (43분)
· 비 오는 목요일에 가장 오래 걸렸어요
```

**Props:**
```typescript
interface InsightListProps {
  insights: string[];
}
```

**파일:** `frontend/src/presentation/pages/home/InsightList.tsx`

---

### 5. react-query 통합

#### Query Key 추가

```typescript
// query-keys.ts 추가
weeklyReport: {
  all: ['weeklyReport'] as const,
  byUser: (userId: string, weekOffset: number) =>
    ['weeklyReport', userId, weekOffset] as const,
},
```

#### Query Hook

**파일:** `frontend/src/infrastructure/query/use-weekly-report-query.ts`

```typescript
export function useWeeklyReportQuery(userId: string, weekOffset = 0) {
  return useQuery<WeeklyReportResponse>({
    queryKey: queryKeys.weeklyReport.byUser(userId, weekOffset),
    queryFn: () => getCommuteApiClient().getWeeklyReport(userId, weekOffset),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,       // 10분 — 주간 데이터라 자주 안 바뀜
    refetchOnWindowFocus: false,      // 비용 대비 효용 낮음
  });
}
```

### 6. API 클라이언트 확장

**파일:** `frontend/src/infrastructure/api/commute-api.client.ts` 추가

```typescript
// ========== Weekly Report Types ==========

export type TrendDirection = 'improving' | 'stable' | 'worsening';

export interface DailyStatsResponse {
  date: string;
  dayOfWeek: number;
  dayName: string;
  sessionCount: number;
  averageDuration: number;
  totalDuration: number;
  averageDelay: number;
  averageWaitTime: number;
  weatherCondition: string | null;
}

export interface WeeklyReportResponse {
  weekStartDate: string;
  weekEndDate: string;
  weekLabel: string;
  totalSessions: number;
  totalRecordedDays: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  dailyStats: DailyStatsResponse[];
  bestDay: DailyStatsResponse | null;
  worstDay: DailyStatsResponse | null;
  previousWeekAverage: number | null;
  changeFromPrevious: number | null;
  changePercentage: number | null;
  trend: TrendDirection | null;
  insights: string[];
  streakWeeklyCount: number;
  streakWeeklyGoal: number;
}

// ========== CommuteApiClient에 메서드 추가 ==========

async getWeeklyReport(userId: string, weekOffset = 0): Promise<WeeklyReportResponse> {
  return this.apiClient.get<WeeklyReportResponse>(
    `/commute/weekly-report/${userId}?weekOffset=${weekOffset}`,
  );
}
```

### 7. 홈 화면 통합

**HomePage.tsx 변경:**
```tsx
// StatsSection 아래에 WeeklyReportCard 추가
{isLoggedIn && (
  <WeeklyReportCard
    report={weeklyReport}
    isLoading={weeklyReportLoading}
    error={weeklyReportError}
    weekOffset={weekOffset}
    onWeekChange={setWeekOffset}
  />
)}
```

**use-home-data.ts 변경:**
- `useWeeklyReportQuery(userId, weekOffset)` 추가
- `weekOffset` 상태 + `setWeekOffset` 핸들러 추가
- `weeklyReport`, `weeklyReportLoading`, `weeklyReportError` 반환값 추가

---

## 기존 코드 변경 요약

### Backend 변경

| 파일 | 변경 내용 |
|------|----------|
| `domain/services/weekly-report.service.ts` | **신규** — `buildWeeklyReport` 순수 함수 + `buildDailyStats` + `generateWeeklyInsights` |
| `domain/utils/kst-date.ts` | **수정** — `getWeekBounds`, `formatWeekLabel`, `toDateKST`, `addDays` 추가 |
| `application/use-cases/get-weekly-report.use-case.ts` | **신규** — 주간 리포트 유스케이스 |
| `application/dto/weekly-report.dto.ts` | **신규** — DTO 정의 |
| `presentation/controllers/commute.controller.ts` | **수정** — `GET /commute/weekly-report/:userId` 엔드포인트 추가 |
| `presentation/modules/commute.module.ts` | **수정** — `GetWeeklyReportUseCase` provider 등록 |

### Frontend 변경

| 파일 | 변경 내용 |
|------|----------|
| `presentation/pages/home/WeeklyReportCard.tsx` | **신규** — 주간 리포트 카드 (접기/펼치기) |
| `presentation/pages/home/DailyBarChart.tsx` | **신규** — CSS-only 일별 막대 차트 |
| `presentation/pages/home/TrendIndicator.tsx` | **신규** — 전주 대비 트렌드 표시 |
| `presentation/pages/home/InsightList.tsx` | **신규** — 인사이트 목록 |
| `infrastructure/api/commute-api.client.ts` | **수정** — WeeklyReport 타입 + API 메서드 추가 |
| `infrastructure/query/query-keys.ts` | **수정** — weeklyReport 키 추가 |
| `infrastructure/query/use-weekly-report-query.ts` | **신규** — react-query 훅 |
| `presentation/pages/home/HomePage.tsx` | **수정** — WeeklyReportCard 통합 |
| `presentation/pages/home/use-home-data.ts` | **수정** — useWeeklyReportQuery + weekOffset 상태 추가 |
| `presentation/pages/home/home.css` | **수정** — 주간 리포트 카드 + 막대 차트 스타일 추가 |

---

## 구현 단계 (Baby Steps)

### Phase 1: 백엔드 도메인 로직 + 유틸 (S)

| # | 태스크 | 복잡도 | 의존성 |
|---|--------|:------:|--------|
| 1 | `kst-date.ts`에 `getWeekBounds`, `addDays`, `formatWeekLabel`, `toDateKST` 추가 | S | 없음 |
| 2 | `kst-date` 새 함수 단위 테스트 (주간 경계, 주차 라벨, 엣지 케이스) | S | 1 |
| 3 | `weekly-report.service.ts` 순수 함수 구현 (`buildWeeklyReport`, `buildDailyStats`, `generateWeeklyInsights`) | M | 1 |
| 4 | `weekly-report.service.ts` 단위 테스트 (다양한 데이터 조합, 빈 데이터, 전주 비교, 인사이트 생성) | M | 3 |

### Phase 2: 백엔드 유스케이스 + API (M)

| # | 태스크 | 복잡도 | 의존성 |
|---|--------|:------:|--------|
| 5 | DTO 정의 (`weekly-report.dto.ts`) | S | 없음 |
| 6 | `GetWeeklyReportUseCase` 구현 | M | 1, 3, 5 |
| 7 | `CommuteController`에 `GET /commute/weekly-report/:userId` 추가 | S | 6 |
| 8 | `CommuteModule`에 provider 등록 | S | 7 |
| 9 | `GetWeeklyReportUseCase` 단위 테스트 | M | 6 |
| 10 | Controller 통합 테스트 (정상 응답, 권한 검사, weekOffset 파라미터, 빈 데이터) | M | 7 |

### Phase 3: 프론트엔드 API + 훅 (S)

| # | 태스크 | 복잡도 | 의존성 |
|---|--------|:------:|--------|
| 11 | `commute-api.client.ts`에 WeeklyReport 타입 + `getWeeklyReport` 메서드 추가 | S | 7 |
| 12 | `query-keys.ts`에 `weeklyReport` 키 추가 + `use-weekly-report-query.ts` 작성 | S | 11 |

### Phase 4: 프론트엔드 컴포넌트 (M)

| # | 태스크 | 복잡도 | 의존성 |
|---|--------|:------:|--------|
| 13 | `DailyBarChart` 컴포넌트 구현 (CSS-only 막대 차트) | M | 없음 |
| 14 | `TrendIndicator` 컴포넌트 구현 | S | 없음 |
| 15 | `InsightList` 컴포넌트 구현 | S | 없음 |
| 16 | `WeeklyReportCard` 컴포넌트 구현 (접기/펼치기, 주 이동, 요약) | M | 12, 13, 14, 15 |
| 17 | `HomePage.tsx`에 `WeeklyReportCard` 통합 + `use-home-data.ts` 수정 | M | 12, 16 |

### Phase 5: CSS + 테스트 + 접근성 (S)

| # | 태스크 | 복잡도 | 의존성 |
|---|--------|:------:|--------|
| 18 | `home.css`에 주간 리포트 카드 + 막대 차트 CSS 추가 | S | 16 |
| 19 | `DailyBarChart` 컴포넌트 테스트 (렌더링, 베스트/워스트 하이라이트, 빈 데이터) | S | 13 |
| 20 | `WeeklyReportCard` 컴포넌트 테스트 (접기/펼치기, 주 이동, 로딩/에러 상태, 빈 데이터) | M | 16 |
| 21 | 접근성 검증 (aria-label, 스크린 리더, 키보드 탐색) | S | 18 |

**총 예상 소요: 21개 태스크, ~2 사이클**

---

## 인수 조건 (Acceptance Criteria)

### 주간 리포트 API

- [ ] Given 로그인한 사용자가, When `GET /commute/weekly-report/{userId}` 를 호출하면, Then 이번 주(월~일, KST) 기준의 리포트 데이터가 반환된다
- [ ] Given `weekOffset=1`로 요청하면, When API가 응답하면, Then 지난주 리포트가 반환되고 `weekStartDate`가 지난주 월요일이다
- [ ] Given `weekOffset=5`로 요청하면, When API가 응답하면, Then 400 Bad Request가 반환된다 (최대 4)
- [ ] Given 이번 주 완료된 세션이 5건일 때, When 리포트를 조회하면, Then `totalSessions`이 5이고 `dailyStats`에 각 날짜별 집계가 정확하다
- [ ] Given 이번 주 세션이 없을 때, When 리포트를 조회하면, Then `totalSessions`이 0이고 `insights`에 "기록이 아직 없어요" 메시지가 포함된다

### 전주 대비 트렌드

- [ ] Given 이번 주 평균 45분, 전주 평균 50분일 때, When 리포트를 조회하면, Then `changeFromPrevious`가 -5이고 `trend`가 "improving"이다
- [ ] Given 이번 주 평균 50분, 전주 평균 48분일 때, When 리포트를 조회하면, Then `changeFromPrevious`가 2이고 `trend`가 "stable"이다 (±3분 이내)
- [ ] Given 이번 주 평균 55분, 전주 평균 48분일 때, When 리포트를 조회하면, Then `changeFromPrevious`가 7이고 `trend`가 "worsening"이다
- [ ] Given 전주에 세션이 없을 때, When 리포트를 조회하면, Then `previousWeekAverage`가 null이고 `trend`가 null이다

### 베스트/워스트 날

- [ ] Given 화요일 평균 40분, 목요일 평균 60분인 주간 데이터가 있을 때, When 리포트를 조회하면, Then `bestDay.dayName`이 "화요일"이고 `worstDay.dayName`이 "목요일"이다
- [ ] Given 기록이 하루만 있을 때, When 리포트를 조회하면, Then `bestDay`와 `worstDay`가 같은 날이다

### UI 카드

- [ ] Given 홈 화면에 진입하면, When 주간 리포트 데이터가 로드되면, Then 평균 소요시간과 전주 대비 변화가 요약 카드에 표시된다
- [ ] Given 카드가 접힌 상태에서, When "펼치기"를 탭하면, Then 일별 막대 차트와 인사이트가 부드럽게 펼쳐진다
- [ ] Given 카드가 펼쳐진 상태에서, When "접기"를 탭하면, Then 상세 영역이 접힌다
- [ ] Given `weekOffset=0`인 상태에서, When 왼쪽 화살표를 탭하면, Then `weekOffset`이 1로 변경되고 지난주 리포트가 로드된다
- [ ] Given `weekOffset=0`인 상태에서, When 오른쪽 화살표를 확인하면, Then 비활성화(disabled) 상태이다

### 막대 차트

- [ ] Given 일별 소요시간 데이터가 있을 때, When 차트를 렌더링하면, Then 각 막대의 길이가 소요시간에 비례한다
- [ ] Given `bestDay`가 화요일일 때, When 차트를 확인하면, Then 화요일 막대가 녹색이고 별 아이콘이 표시된다
- [ ] Given 수요일에 기록이 없을 때, When 차트를 확인하면, Then 수요일 행에 "기록 없음" 텍스트가 표시된다

### 인사이트

- [ ] Given 전주 대비 5분 개선되었을 때, When 인사이트를 확인하면, Then "전주보다 평균 5분 빨라졌어요!" 텍스트가 포함된다
- [ ] Given 기록 일수가 2일 미만일 때, When 인사이트를 확인하면, Then "기록이 더 쌓이면 정확한 분석을 드릴 수 있어요" 텍스트가 포함된다

### 권한 & 보안

- [ ] Given 인증되지 않은 요청이, When `/commute/weekly-report/:userId`를 호출하면, Then 401 Unauthorized가 반환된다
- [ ] Given 사용자 A가, When 사용자 B의 주간 리포트를 조회하려 하면, Then 403 Forbidden이 반환된다

### 접근성

- [ ] Given 스크린 리더를 사용하는 사용자가, When 주간 리포트 카드를 탐색하면, Then "이번 주 평균 47분, 전주 대비 3분 개선" 정보가 읽힌다
- [ ] Given 막대 차트를 스크린 리더로 탐색하면, When 각 막대에 도달하면, Then "월요일 52분"과 같은 정보가 aria-label로 읽힌다
- [ ] Given 키보드만 사용하는 사용자가, When 주간 이동 버튼에 도달하면, Then Enter/Space로 주 이동이 가능하다

### F-5 스트릭 통합

- [ ] Given 주간 리포트 카드에서, When 스트릭 정보가 있으면, Then "기록 3일 / 목표 5일" 형태로 주간 스트릭 현황이 표시된다
- [ ] Given 주간 목표를 달성했을 때 (5/5), When 카드를 확인하면, Then 체크마크와 강조색으로 목표 달성이 표시된다

---

## 테스트 전략

### 단위 테스트 (Unit)

| 대상 | 테스트 항목 | 예상 수 |
|------|-----------|:-------:|
| `kst-date` 유틸 확장 | `getWeekBounds` (정상/주초/주말/weekOffset), `formatWeekLabel`, `addDays`, `toDateKST` | 8 |
| `buildWeeklyReport` 순수 함수 | 정상 데이터, 빈 데이터, 1건만, 전주 없음, 전주 대비 트렌드 3종, 주말 포함/제외 | 10 |
| `buildDailyStats` | 일별 집계, 다중 세션 날, 빈 날, 날씨 대표값 | 5 |
| `generateWeeklyInsights` | 트렌드별 메시지, 베스트/워스트, 지연 패턴, 대기시간, 데이터 부족, 최대 4개 제한 | 8 |
| `GetWeeklyReportUseCase` | 정상 조회, weekOffset, 빈 데이터, 스트릭 연동, 레포지토리 에러 | 6 |

### 컴포넌트 테스트 (Frontend)

| 대상 | 테스트 항목 | 예상 수 |
|------|-----------|:-------:|
| `DailyBarChart` | 정상 렌더링, 베스트/워스트 하이라이트, 빈 날 처리, aria-label 존재 | 5 |
| `TrendIndicator` | improving/stable/worsening/null 4가지 상태 렌더링 | 4 |
| `InsightList` | 정상 렌더링, 빈 목록 처리 | 2 |
| `WeeklyReportCard` | 접기/펼치기, 주 이동, 로딩 상태, 에러 상태, 빈 데이터, 스트릭 표시 | 8 |

### 통합 테스트 (Controller)

| 대상 | 테스트 항목 | 예상 수 |
|------|-----------|:-------:|
| 주간 리포트 API | GET 정상, weekOffset 0-4, 잘못된 offset, 권한 검사, 빈 데이터 | 6 |

**총 예상 테스트: ~62개**

---

## 오픈 질문

1. **주간 경계**: 월~일요일(국제 표준, ISO 8601)로 설정했다. 한국에서는 월~금 근무가 일반적이므로 "평일만 보기" 필터가 필요한지? -> **결정: Must에서는 월~일 전체 포함, 주말 데이터가 있으면 표시. "평일만 보기" 토글은 Should로 분류**
2. **이전 주 탐색 범위**: 최대 4주(약 1개월)로 제한했다. 더 오래된 데이터는 기존 `/commute/stats` API에서 30일 통계로 제공 -> **결정: 4주 유지. 월간 리포트는 Won't have**
3. **주간 리포트 페이지 vs 홈 내 카드**: 별도 `/report` 페이지 vs 홈 하단 accordion -> **결정: 홈 하단 accordion으로 시작. 데이터가 많아지면 별도 페이지 분리 (Could have)**
4. **차트 라이브러리**: CSS-only vs recharts/lightweight-charts -> **결정: CSS-only. 막대 차트만 필요하고 번들 사이즈 유지가 중요. 향후 더 복잡한 차트 필요 시 lightweight 라이브러리 도입 검토**

---

## 명시적 제외 사항

- **월간/연간 리포트**: 주간 리포트 안정화 후 별도 기능으로 기획 (F-10 후보)
- **경로별 주간 비교**: 하나의 경로만 사용하는 사용자가 대부분일 것으로 예상. 다중 경로 사용자가 늘면 추후 확장
- **PDF/CSV 내보내기**: 사용 빈도 불확실. 실제 요청 있을 때 추가
- **차트 라이브러리 도입**: CSS-only 막대 차트로 충분. 꺾은선/원형 차트 필요 시점에 검토
- **주간 리포트 푸시 알림**: "지난주 리포트가 준비됐어요" 알림은 Could have. 기존 EventBridge 인프라 활용 가능하지만 이번 사이클에서는 제외
- **소셜 공유/비교**: 사용자 기반 충분해진 후

---

*작성 완료: 2026-02-17*
*다음 단계: Dev 에이전트에게 전달 -> Phase 1부터 구현 시작*
