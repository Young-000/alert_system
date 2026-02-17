import { CommuteSession, SessionStatus } from '@domain/entities/commute-session.entity';
import {
  buildWeeklyReport,
  buildDailyStats,
  generateWeeklyInsights,
  determineTrend,
} from './build-weekly-report';
import type { DailyStatsDto, TrendDirection } from '@application/dto/weekly-report.dto';

// ========== Test Helpers ==========

function createSession(
  overrides: {
    startedAt?: Date;
    totalDurationMinutes?: number;
    totalWaitMinutes?: number;
    totalDelayMinutes?: number;
    status?: SessionStatus;
    weatherCondition?: string;
  } = {},
): CommuteSession {
  return new CommuteSession('user-1', 'route-1', {
    id: `session-${Math.random().toString(36).slice(2, 8)}`,
    startedAt: overrides.startedAt ?? new Date('2026-02-16T08:00:00+09:00'),
    completedAt: new Date('2026-02-16T09:00:00+09:00'),
    totalDurationMinutes: overrides.totalDurationMinutes ?? 45,
    totalWaitMinutes: overrides.totalWaitMinutes ?? 8,
    totalDelayMinutes: overrides.totalDelayMinutes ?? 3,
    status: overrides.status ?? SessionStatus.COMPLETED,
    weatherCondition: overrides.weatherCondition ?? '맑음',
    checkpointRecords: [],
  });
}

/** KST 날짜 기준으로 Date 생성 */
function kstDate(dateStr: string, hour = 8): Date {
  return new Date(`${dateStr}T${String(hour).padStart(2, '0')}:00:00+09:00`);
}

// Week: 2026-02-16 (Mon) ~ 2026-02-22 (Sun)
const WEEK_START = '2026-02-16';
const WEEK_END = '2026-02-22';

describe('determineTrend', () => {
  it('null이면 null을 반환한다', () => {
    expect(determineTrend(null)).toBeNull();
  });

  it('3분 이상 개선이면 improving이다', () => {
    expect(determineTrend(-3)).toBe('improving');
    expect(determineTrend(-5)).toBe('improving');
    expect(determineTrend(-10)).toBe('improving');
  });

  it('3분 이상 악화이면 worsening이다', () => {
    expect(determineTrend(3)).toBe('worsening');
    expect(determineTrend(7)).toBe('worsening');
  });

  it('+-3분 이내이면 stable이다', () => {
    expect(determineTrend(0)).toBe('stable');
    expect(determineTrend(2)).toBe('stable');
    expect(determineTrend(-2)).toBe('stable');
    expect(determineTrend(1)).toBe('stable');
    expect(determineTrend(-1)).toBe('stable');
  });
});

describe('buildDailyStats', () => {
  it('세션이 없으면 7일 모두 sessionCount=0으로 반환한다', () => {
    const result = buildDailyStats([], WEEK_START);

    expect(result).toHaveLength(7);
    result.forEach((day) => {
      expect(day.sessionCount).toBe(0);
      expect(day.averageDuration).toBe(0);
      expect(day.weatherCondition).toBeNull();
    });
  });

  it('7일 전체의 날짜가 올바르게 생성된다', () => {
    const result = buildDailyStats([], WEEK_START);

    expect(result[0].date).toBe('2026-02-16'); // Monday
    expect(result[0].dayName).toBe('월요일');
    expect(result[1].date).toBe('2026-02-17'); // Tuesday
    expect(result[1].dayName).toBe('화요일');
    expect(result[2].date).toBe('2026-02-18'); // Wednesday
    expect(result[2].dayName).toBe('수요일');
    expect(result[3].date).toBe('2026-02-19'); // Thursday
    expect(result[3].dayName).toBe('목요일');
    expect(result[4].date).toBe('2026-02-20'); // Friday
    expect(result[4].dayName).toBe('금요일');
    expect(result[5].date).toBe('2026-02-21'); // Saturday
    expect(result[5].dayName).toBe('토요일');
    expect(result[6].date).toBe('2026-02-22'); // Sunday
    expect(result[6].dayName).toBe('일요일');
  });

  it('특정 날짜에 세션이 있으면 해당 날짜에 집계된다', () => {
    const sessions = [
      createSession({ startedAt: kstDate('2026-02-16'), totalDurationMinutes: 40 }),
      createSession({ startedAt: kstDate('2026-02-16'), totalDurationMinutes: 50 }),
    ];

    const result = buildDailyStats(sessions, WEEK_START);
    const monday = result[0];

    expect(monday.sessionCount).toBe(2);
    expect(monday.averageDuration).toBe(45); // (40+50)/2
    expect(monday.totalDuration).toBe(90);   // 40+50
  });

  it('가장 많이 출현한 날씨가 대표 날씨가 된다', () => {
    const sessions = [
      createSession({ startedAt: kstDate('2026-02-17'), weatherCondition: '맑음' }),
      createSession({ startedAt: kstDate('2026-02-17'), weatherCondition: '비' }),
      createSession({ startedAt: kstDate('2026-02-17'), weatherCondition: '맑음' }),
    ];

    const result = buildDailyStats(sessions, WEEK_START);
    const tuesday = result[1];

    expect(tuesday.weatherCondition).toBe('맑음');
  });

  it('날씨 정보가 없으면 null이다', () => {
    // Create a session without weatherCondition by using the CommuteSession constructor directly
    const session = new CommuteSession('user-1', 'route-1', {
      id: 'session-no-weather',
      startedAt: kstDate('2026-02-18'),
      completedAt: new Date('2026-02-18T09:00:00+09:00'),
      totalDurationMinutes: 45,
      totalWaitMinutes: 8,
      totalDelayMinutes: 3,
      status: SessionStatus.COMPLETED,
      // weatherCondition intentionally omitted (defaults to undefined)
      checkpointRecords: [],
    });

    const result = buildDailyStats([session], WEEK_START);
    const wednesday = result[2];

    expect(wednesday.weatherCondition).toBeNull();
  });
});

describe('generateWeeklyInsights', () => {
  const emptyDailyStats: DailyStatsDto[] = Array.from({ length: 7 }, (_, i) => ({
    date: `2026-02-${16 + i}`,
    dayOfWeek: ((1 + i) % 7),
    dayName: ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'][i],
    sessionCount: 0,
    averageDuration: 0,
    totalDuration: 0,
    averageDelay: 0,
    averageWaitTime: 0,
    weatherCondition: null,
  }));

  it('데이터가 없으면 빈 상태 메시지를 반환한다', () => {
    const insights = generateWeeklyInsights(
      emptyDailyStats,
      null,
      null,
      null,
      null,
      [],
    );

    expect(insights).toHaveLength(1);
    expect(insights[0]).toBe('이번 주 기록이 아직 없어요. 출퇴근을 기록해보세요!');
  });

  it('전주 대비 개선되면 빨라졌다는 인사이트가 포함된다', () => {
    const dailyStats: DailyStatsDto[] = [
      { ...emptyDailyStats[0], sessionCount: 2, averageDuration: 45 },
      ...emptyDailyStats.slice(1),
    ];
    const sessions = [
      createSession({ startedAt: kstDate('2026-02-16'), totalDurationMinutes: 45 }),
    ];

    const insights = generateWeeklyInsights(
      dailyStats,
      dailyStats[0],
      dailyStats[0],
      -5,
      'improving',
      sessions,
    );

    expect(insights.some((i) => i.includes('5분 빨라졌어요'))).toBe(true);
  });

  it('전주 대비 악화되면 더 걸렸다는 인사이트가 포함된다', () => {
    const dailyStats: DailyStatsDto[] = [
      { ...emptyDailyStats[0], sessionCount: 2, averageDuration: 55 },
      ...emptyDailyStats.slice(1),
    ];
    const sessions = [
      createSession({ startedAt: kstDate('2026-02-16'), totalDurationMinutes: 55 }),
    ];

    const insights = generateWeeklyInsights(
      dailyStats,
      dailyStats[0],
      dailyStats[0],
      7,
      'worsening',
      sessions,
    );

    expect(insights.some((i) => i.includes('7분 더 걸렸어요'))).toBe(true);
  });

  it('전주와 비슷하면 비슷하다는 인사이트가 포함된다', () => {
    const dailyStats: DailyStatsDto[] = [
      { ...emptyDailyStats[0], sessionCount: 2, averageDuration: 50 },
      ...emptyDailyStats.slice(1),
    ];
    const sessions = [
      createSession({ startedAt: kstDate('2026-02-16'), totalDurationMinutes: 50 }),
    ];

    const insights = generateWeeklyInsights(
      dailyStats,
      dailyStats[0],
      dailyStats[0],
      1,
      'stable',
      sessions,
    );

    expect(insights.some((i) => i.includes('비슷한 출퇴근 시간'))).toBe(true);
  });

  it('베스트/워스트 날이 다르면 인사이트가 포함된다', () => {
    const bestDay: DailyStatsDto = {
      ...emptyDailyStats[1],
      date: '2026-02-17',
      dayName: '화요일',
      sessionCount: 2,
      averageDuration: 40,
    };
    const worstDay: DailyStatsDto = {
      ...emptyDailyStats[3],
      date: '2026-02-19',
      dayName: '목요일',
      sessionCount: 2,
      averageDuration: 60,
      weatherCondition: '비',
    };
    const dailyStats: DailyStatsDto[] = [
      emptyDailyStats[0],
      bestDay,
      emptyDailyStats[2],
      worstDay,
      ...emptyDailyStats.slice(4),
    ];
    const sessions = [
      createSession({ startedAt: kstDate('2026-02-17'), totalDurationMinutes: 40 }),
      createSession({ startedAt: kstDate('2026-02-19'), totalDurationMinutes: 60 }),
    ];

    const insights = generateWeeklyInsights(
      dailyStats,
      bestDay,
      worstDay,
      null,
      null,
      sessions,
    );

    expect(insights.some((i) => i.includes('화요일') && i.includes('빨랐어요'))).toBe(true);
    expect(insights.some((i) => i.includes('비 오는 목요일'))).toBe(true);
  });

  it('지연 2일 이상이면 인사이트가 포함된다', () => {
    const dailyStats: DailyStatsDto[] = [
      { ...emptyDailyStats[0], sessionCount: 1, averageDuration: 50, averageDelay: 6 },
      { ...emptyDailyStats[1], sessionCount: 1, averageDuration: 48, averageDelay: 7 },
      { ...emptyDailyStats[2], sessionCount: 1, averageDuration: 52, averageDelay: 2 },
      ...emptyDailyStats.slice(3),
    ];
    const sessions = [
      createSession({ startedAt: kstDate('2026-02-16'), totalDurationMinutes: 50 }),
      createSession({ startedAt: kstDate('2026-02-17'), totalDurationMinutes: 48 }),
      createSession({ startedAt: kstDate('2026-02-18'), totalDurationMinutes: 52 }),
    ];

    const insights = generateWeeklyInsights(
      dailyStats,
      dailyStats[1],
      dailyStats[2],
      null,
      null,
      sessions,
    );

    expect(insights.some((i) => i.includes('2일이 5분 이상 지연'))).toBe(true);
  });

  it('기록이 2일 미만이면 데이터 부족 메시지가 포함된다', () => {
    const dailyStats: DailyStatsDto[] = [
      { ...emptyDailyStats[0], sessionCount: 1, averageDuration: 50 },
      ...emptyDailyStats.slice(1),
    ];
    const sessions = [
      createSession({ startedAt: kstDate('2026-02-16'), totalDurationMinutes: 50 }),
    ];

    const insights = generateWeeklyInsights(
      dailyStats,
      dailyStats[0],
      dailyStats[0],
      null,
      null,
      sessions,
    );

    expect(insights.some((i) => i.includes('기록이 더 쌓이면'))).toBe(true);
  });

  it('대기시간이 25% 이상이면 인사이트가 포함된다', () => {
    const dailyStats: DailyStatsDto[] = [
      { ...emptyDailyStats[0], sessionCount: 1, averageDuration: 50, averageWaitTime: 15 },
      { ...emptyDailyStats[1], sessionCount: 1, averageDuration: 50, averageWaitTime: 15 },
      { ...emptyDailyStats[2], sessionCount: 1, averageDuration: 50, averageWaitTime: 15 },
      ...emptyDailyStats.slice(3),
    ];
    const sessions = [
      createSession({ startedAt: kstDate('2026-02-16'), totalDurationMinutes: 50, totalWaitMinutes: 15 }),
      createSession({ startedAt: kstDate('2026-02-17'), totalDurationMinutes: 50, totalWaitMinutes: 15 }),
      createSession({ startedAt: kstDate('2026-02-18'), totalDurationMinutes: 50, totalWaitMinutes: 15 }),
    ];

    const insights = generateWeeklyInsights(
      dailyStats,
      dailyStats[0],
      dailyStats[0],
      null,
      null,
      sessions,
    );

    expect(insights.some((i) => i.includes('대기/환승'))).toBe(true);
  });

  it('최대 4개까지만 반환한다', () => {
    const dailyStats: DailyStatsDto[] = [
      { ...emptyDailyStats[0], sessionCount: 1, averageDuration: 40, averageDelay: 6, averageWaitTime: 12 },
      { ...emptyDailyStats[1], sessionCount: 1, averageDuration: 60, averageDelay: 8, averageWaitTime: 18 },
      { ...emptyDailyStats[2], sessionCount: 1, averageDuration: 55, averageDelay: 7, averageWaitTime: 15 },
      ...emptyDailyStats.slice(3),
    ];
    const sessions = [
      createSession({ startedAt: kstDate('2026-02-16'), totalDurationMinutes: 40, totalWaitMinutes: 12 }),
      createSession({ startedAt: kstDate('2026-02-17'), totalDurationMinutes: 60, totalWaitMinutes: 18 }),
      createSession({ startedAt: kstDate('2026-02-18'), totalDurationMinutes: 55, totalWaitMinutes: 15 }),
    ];

    const insights = generateWeeklyInsights(
      dailyStats,
      dailyStats[0],
      dailyStats[1],
      -5,
      'improving',
      sessions,
    );

    expect(insights.length).toBeLessThanOrEqual(4);
  });
});

describe('buildWeeklyReport', () => {
  it('세션이 없으면 빈 리포트를 반환한다', () => {
    const result = buildWeeklyReport([], [], WEEK_START, WEEK_END, 0, 5);

    expect(result.totalSessions).toBe(0);
    expect(result.totalRecordedDays).toBe(0);
    expect(result.averageDuration).toBe(0);
    expect(result.minDuration).toBe(0);
    expect(result.maxDuration).toBe(0);
    expect(result.bestDay).toBeNull();
    expect(result.worstDay).toBeNull();
    expect(result.previousWeekAverage).toBeNull();
    expect(result.changeFromPrevious).toBeNull();
    expect(result.changePercentage).toBeNull();
    expect(result.trend).toBeNull();
    expect(result.dailyStats).toHaveLength(7);
    expect(result.insights).toContain('이번 주 기록이 아직 없어요. 출퇴근을 기록해보세요!');
    expect(result.streakWeeklyCount).toBe(0);
    expect(result.streakWeeklyGoal).toBe(5);
  });

  it('완료된 세션만 집계한다 (in_progress, cancelled 제외)', () => {
    const sessions = [
      createSession({ startedAt: kstDate('2026-02-16'), totalDurationMinutes: 40 }),
      createSession({ startedAt: kstDate('2026-02-17'), status: SessionStatus.IN_PROGRESS, totalDurationMinutes: undefined }),
      createSession({ startedAt: kstDate('2026-02-18'), status: SessionStatus.CANCELLED, totalDurationMinutes: 30 }),
    ];

    const result = buildWeeklyReport(sessions, [], WEEK_START, WEEK_END, 1, 5);

    expect(result.totalSessions).toBe(1);
    expect(result.averageDuration).toBe(40);
  });

  it('단일 세션이 있으면 올바르게 집계한다', () => {
    const sessions = [
      createSession({ startedAt: kstDate('2026-02-16'), totalDurationMinutes: 50 }),
    ];

    const result = buildWeeklyReport(sessions, [], WEEK_START, WEEK_END, 1, 5);

    expect(result.totalSessions).toBe(1);
    expect(result.totalRecordedDays).toBe(1);
    expect(result.averageDuration).toBe(50);
    expect(result.minDuration).toBe(50);
    expect(result.maxDuration).toBe(50);
    expect(result.bestDay).not.toBeNull();
    expect(result.worstDay).not.toBeNull();
    // bestDay === worstDay when only one day
    expect(result.bestDay!.date).toBe(result.worstDay!.date);
  });

  it('여러 날에 세션이 있으면 올바르게 집계한다', () => {
    const sessions = [
      createSession({ startedAt: kstDate('2026-02-16'), totalDurationMinutes: 52 }),
      createSession({ startedAt: kstDate('2026-02-16'), totalDurationMinutes: 48 }),
      createSession({ startedAt: kstDate('2026-02-17'), totalDurationMinutes: 43 }),
      createSession({ startedAt: kstDate('2026-02-18'), totalDurationMinutes: 48 }),
      createSession({ startedAt: kstDate('2026-02-19'), totalDurationMinutes: 62, weatherCondition: '비' }),
      createSession({ startedAt: kstDate('2026-02-20'), totalDurationMinutes: 42 }),
    ];

    const result = buildWeeklyReport(sessions, [], WEEK_START, WEEK_END, 5, 5);

    expect(result.totalSessions).toBe(6);
    expect(result.totalRecordedDays).toBe(5);
    expect(result.minDuration).toBe(42);
    expect(result.maxDuration).toBe(62);
    // bestDay should be Friday (42min)
    expect(result.bestDay!.averageDuration).toBe(42);
    // worstDay should be Thursday (62min)
    expect(result.worstDay!.averageDuration).toBe(62);
  });

  it('전주 세션이 있으면 전주 대비 비교가 포함된다', () => {
    const currentSessions = [
      createSession({ startedAt: kstDate('2026-02-16'), totalDurationMinutes: 45 }),
      createSession({ startedAt: kstDate('2026-02-17'), totalDurationMinutes: 45 }),
    ];
    const previousSessions = [
      createSession({ startedAt: kstDate('2026-02-09'), totalDurationMinutes: 50 }),
      createSession({ startedAt: kstDate('2026-02-10'), totalDurationMinutes: 50 }),
    ];

    const result = buildWeeklyReport(
      currentSessions,
      previousSessions,
      WEEK_START,
      WEEK_END,
      2,
      5,
    );

    expect(result.previousWeekAverage).toBe(50);
    expect(result.changeFromPrevious).toBe(-5);
    expect(result.changePercentage).toBe(-10);
    expect(result.trend).toBe('improving');
  });

  it('전주 세션이 없으면 비교가 null이다', () => {
    const currentSessions = [
      createSession({ startedAt: kstDate('2026-02-16'), totalDurationMinutes: 45 }),
    ];

    const result = buildWeeklyReport(
      currentSessions,
      [],
      WEEK_START,
      WEEK_END,
      1,
      5,
    );

    expect(result.previousWeekAverage).toBeNull();
    expect(result.changeFromPrevious).toBeNull();
    expect(result.changePercentage).toBeNull();
    expect(result.trend).toBeNull();
  });

  it('전주 대비 악화 (worsening) 트렌드', () => {
    const currentSessions = [
      createSession({ startedAt: kstDate('2026-02-16'), totalDurationMinutes: 55 }),
    ];
    const previousSessions = [
      createSession({ startedAt: kstDate('2026-02-09'), totalDurationMinutes: 48 }),
    ];

    const result = buildWeeklyReport(
      currentSessions,
      previousSessions,
      WEEK_START,
      WEEK_END,
      1,
      5,
    );

    expect(result.changeFromPrevious).toBe(7);
    expect(result.trend).toBe('worsening');
  });

  it('전주 대비 안정 (stable) 트렌드 (+-3분 이내)', () => {
    const currentSessions = [
      createSession({ startedAt: kstDate('2026-02-16'), totalDurationMinutes: 50 }),
    ];
    const previousSessions = [
      createSession({ startedAt: kstDate('2026-02-09'), totalDurationMinutes: 48 }),
    ];

    const result = buildWeeklyReport(
      currentSessions,
      previousSessions,
      WEEK_START,
      WEEK_END,
      1,
      5,
    );

    expect(result.changeFromPrevious).toBe(2);
    expect(result.trend).toBe('stable');
  });

  it('모든 세션이 같은 소요시간이면 min=max=avg이다', () => {
    const sessions = [
      createSession({ startedAt: kstDate('2026-02-16'), totalDurationMinutes: 45 }),
      createSession({ startedAt: kstDate('2026-02-17'), totalDurationMinutes: 45 }),
      createSession({ startedAt: kstDate('2026-02-18'), totalDurationMinutes: 45 }),
    ];

    const result = buildWeeklyReport(sessions, [], WEEK_START, WEEK_END, 3, 5);

    expect(result.averageDuration).toBe(45);
    expect(result.minDuration).toBe(45);
    expect(result.maxDuration).toBe(45);
  });

  it('주차 라벨이 올바르게 생성된다', () => {
    const result = buildWeeklyReport([], [], WEEK_START, WEEK_END, 0, 5);

    expect(result.weekLabel).toBe('2월 3주차');
    expect(result.weekStartDate).toBe(WEEK_START);
    expect(result.weekEndDate).toBe(WEEK_END);
  });

  it('스트릭 정보가 올바르게 전달된다', () => {
    const result = buildWeeklyReport([], [], WEEK_START, WEEK_END, 3, 5);

    expect(result.streakWeeklyCount).toBe(3);
    expect(result.streakWeeklyGoal).toBe(5);
  });

  it('dailyStats가 항상 7개 (월~일)이다', () => {
    const sessions = [
      createSession({ startedAt: kstDate('2026-02-17'), totalDurationMinutes: 45 }),
    ];

    const result = buildWeeklyReport(sessions, [], WEEK_START, WEEK_END, 1, 5);

    expect(result.dailyStats).toHaveLength(7);
    // Only Tuesday has data
    expect(result.dailyStats[1].sessionCount).toBe(1);
    // All other days have 0
    expect(result.dailyStats[0].sessionCount).toBe(0);
    expect(result.dailyStats[2].sessionCount).toBe(0);
  });
});
