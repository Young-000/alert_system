/**
 * 주간 출퇴근 리포트 빌드 순수 함수
 * 모든 함수는 side-effect 없는 순수 함수로, 테스트가 용이하다.
 */

import { CommuteSession, SessionStatus } from '@domain/entities/commute-session.entity';
import { addDays, formatWeekLabel } from '@domain/utils/kst-date';
import type {
  DailyStatsDto,
  TrendDirection,
  WeeklyReportResponseDto,
} from '@application/dto/weekly-report.dto';

const DAY_NAMES = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

// ========== Helper: average ==========

function average(numbers: readonly number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

// ========== Trend determination ==========

/** 전주 대비 트렌드 판단 (음수 = 개선, +-3분 이내 = stable) */
export function determineTrend(changeFromPrevious: number | null): TrendDirection | null {
  if (changeFromPrevious === null) return null;
  if (changeFromPrevious <= -3) return 'improving';
  if (changeFromPrevious >= 3) return 'worsening';
  return 'stable';
}

// ========== Daily Stats 집계 ==========

/** 주간의 각 날짜(월~일)별 세션 통계를 집계한다 */
export function buildDailyStats(
  completedSessions: readonly CommuteSession[],
  weekStartDate: string,
): DailyStatsDto[] {
  const dailyStats: DailyStatsDto[] = [];

  for (let i = 0; i < 7; i++) {
    const dateStr = addDays(weekStartDate, i);
    const kstDate = new Date(dateStr + 'T12:00:00+09:00');
    const kstDayOfWeek = kstDate.getUTCDay();

    // Filter sessions for this date
    const sessionsForDay = completedSessions.filter((s) => {
      const sessionDate = toKSTDateString(s.startedAt);
      return sessionDate === dateStr;
    });

    if (sessionsForDay.length === 0) {
      dailyStats.push({
        date: dateStr,
        dayOfWeek: kstDayOfWeek,
        dayName: DAY_NAMES[kstDayOfWeek],
        sessionCount: 0,
        averageDuration: 0,
        totalDuration: 0,
        averageDelay: 0,
        averageWaitTime: 0,
        weatherCondition: null,
      });
      continue;
    }

    const durations = sessionsForDay.map((s) => s.totalDurationMinutes!);
    const delays = sessionsForDay.map((s) => s.totalDelayMinutes);
    const waits = sessionsForDay.map((s) => s.totalWaitMinutes);

    // 대표 날씨: 가장 많이 출현한 날씨 조건
    const weatherCondition = getMostFrequentWeather(sessionsForDay);

    dailyStats.push({
      date: dateStr,
      dayOfWeek: kstDayOfWeek,
      dayName: DAY_NAMES[kstDayOfWeek],
      sessionCount: sessionsForDay.length,
      averageDuration: Math.round(average(durations)),
      totalDuration: durations.reduce((sum, d) => sum + d, 0),
      averageDelay: Math.round(average(delays)),
      averageWaitTime: Math.round(average(waits)),
      weatherCondition,
    });
  }

  return dailyStats;
}

// ========== Insight generation ==========

export function generateWeeklyInsights(
  dailyStats: readonly DailyStatsDto[],
  bestDay: DailyStatsDto | null,
  worstDay: DailyStatsDto | null,
  changeFromPrevious: number | null,
  trend: TrendDirection | null,
  sessions: readonly CommuteSession[],
): string[] {
  const insights: string[] = [];

  const daysWithData = dailyStats.filter((d) => d.sessionCount > 0);

  // 5. 데이터 없음 처리 (우선 체크)
  if (daysWithData.length === 0) {
    return ['이번 주 기록이 아직 없어요. 출퇴근을 기록해보세요!'];
  }

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
      const reason =
        worstDay.weatherCondition === '비' || worstDay.weatherCondition === '소나기'
          ? `비 오는 ${worstDay.dayName}`
          : worstDay.dayName;
      insights.push(`${reason}에 가장 오래 걸렸어요 (${worstDay.averageDuration}분)`);
    }
  }

  // 3. 지연 패턴
  const daysWithDelay = dailyStats.filter((d) => d.averageDelay >= 5);
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

  // 데이터 부족 안내
  if (daysWithData.length < 3) {
    insights.push('기록이 더 쌓이면 정확한 분석을 드릴 수 있어요');
  }

  return insights.slice(0, 4); // 최대 4개
}

// ========== Main: buildWeeklyReport ==========

export function buildWeeklyReport(
  currentWeekSessions: readonly CommuteSession[],
  previousWeekSessions: readonly CommuteSession[],
  weekStartDate: string,
  weekEndDate: string,
  streakWeeklyCount: number,
  streakWeeklyGoal: number,
): WeeklyReportResponseDto {
  // 1. 완료 세션만 필터
  const completed = currentWeekSessions.filter(
    (s) => s.status === SessionStatus.COMPLETED && s.totalDurationMinutes,
  );
  const prevCompleted = previousWeekSessions.filter(
    (s) => s.status === SessionStatus.COMPLETED && s.totalDurationMinutes,
  );

  // 2. 일별 집계
  const dailyStats = buildDailyStats(completed, weekStartDate);

  // 3. 주간 전체 통계
  const durations = completed.map((s) => s.totalDurationMinutes!);
  const averageDuration = average(durations);
  const minDuration = durations.length > 0 ? Math.min(...durations) : 0;
  const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;

  // 4. 베스트/워스트 날
  const daysWithData = dailyStats.filter((d) => d.sessionCount > 0);
  const bestDay =
    daysWithData.length > 0
      ? daysWithData.reduce((a, b) => (a.averageDuration < b.averageDuration ? a : b))
      : null;
  const worstDay =
    daysWithData.length > 0
      ? daysWithData.reduce((a, b) => (a.averageDuration > b.averageDuration ? a : b))
      : null;

  // 5. 전주 대비
  const prevDurations = prevCompleted.map((s) => s.totalDurationMinutes!);
  const previousWeekAverage = prevDurations.length > 0 ? average(prevDurations) : null;
  const changeFromPrevious =
    previousWeekAverage !== null ? Math.round(averageDuration - previousWeekAverage) : null;
  const changePercentage =
    previousWeekAverage !== null && previousWeekAverage > 0
      ? Math.round(((averageDuration - previousWeekAverage) / previousWeekAverage) * 100)
      : null;
  const trend = determineTrend(changeFromPrevious);

  // 6. 인사이트 생성
  const insights = generateWeeklyInsights(
    dailyStats,
    bestDay,
    worstDay,
    changeFromPrevious,
    trend,
    completed,
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

// ========== Internal helpers ==========

/** Date 객체를 KST 기준 YYYY-MM-DD 문자열로 변환 */
function toKSTDateString(date: Date): string {
  const kstOffset = 9 * 60; // minutes
  const utcMs = date.getTime();
  const kstMs = utcMs + kstOffset * 60 * 1000;
  const kstDate = new Date(kstMs);
  const year = kstDate.getUTCFullYear();
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** 세션 목록에서 가장 많이 출현한 날씨 조건을 반환 */
function getMostFrequentWeather(sessions: readonly CommuteSession[]): string | null {
  const weatherCounts = new Map<string, number>();
  for (const session of sessions) {
    const w = session.weatherCondition;
    if (w) {
      weatherCounts.set(w, (weatherCounts.get(w) ?? 0) + 1);
    }
  }
  if (weatherCounts.size === 0) return null;

  let maxCount = 0;
  let mostFrequent: string | null = null;
  for (const [condition, count] of weatherCounts) {
    if (count > maxCount) {
      maxCount = count;
      mostFrequent = condition;
    }
  }
  return mostFrequent;
}
