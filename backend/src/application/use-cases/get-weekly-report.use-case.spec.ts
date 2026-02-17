import { BadRequestException } from '@nestjs/common';
import { GetWeeklyReportUseCase } from './get-weekly-report.use-case';
import { CommuteSession, SessionStatus } from '@domain/entities/commute-session.entity';
import type { ICommuteSessionRepository } from '@domain/repositories/commute-session.repository';
import type { ICommuteStreakRepository } from '@domain/repositories/commute-streak.repository';
import { CommuteStreak } from '@domain/entities/commute-streak.entity';
import * as kstDate from '@domain/utils/kst-date';

// Mock getTodayKST to return a fixed date
jest.spyOn(kstDate, 'getTodayKST').mockReturnValue('2026-02-17');

function createSession(
  startedAt: Date,
  totalDurationMinutes: number,
  status: SessionStatus = SessionStatus.COMPLETED,
): CommuteSession {
  return new CommuteSession('user-1', 'route-1', {
    id: `session-${Math.random().toString(36).slice(2, 8)}`,
    startedAt,
    completedAt: new Date(startedAt.getTime() + totalDurationMinutes * 60000),
    totalDurationMinutes,
    totalWaitMinutes: 5,
    totalDelayMinutes: 2,
    status,
    weatherCondition: '맑음',
    checkpointRecords: [],
  });
}

describe('GetWeeklyReportUseCase', () => {
  let useCase: GetWeeklyReportUseCase;
  let mockSessionRepo: jest.Mocked<ICommuteSessionRepository>;
  let mockStreakRepo: jest.Mocked<ICommuteStreakRepository>;

  beforeEach(() => {
    mockSessionRepo = {
      findByUserIdInDateRange: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
      findById: jest.fn(),
      findByIdWithRecords: jest.fn(),
      findByUserId: jest.fn(),
      findByUserIdAndStatus: jest.fn(),
      findInProgressByUserId: jest.fn(),
      findByRouteId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteByUserId: jest.fn(),
    };

    mockStreakRepo = {
      findByUserId: jest.fn().mockResolvedValue(undefined),
      save: jest.fn(),
      update: jest.fn(),
      saveDailyLog: jest.fn(),
      findDailyLog: jest.fn(),
    };

    useCase = new GetWeeklyReportUseCase(mockSessionRepo, mockStreakRepo);
  });

  it('weekOffset=0에서 이번 주 리포트를 반환한다', async () => {
    const sessions = [
      createSession(new Date('2026-02-16T08:00:00+09:00'), 45),
      createSession(new Date('2026-02-17T08:00:00+09:00'), 50),
    ];
    mockSessionRepo.findByUserIdInDateRange
      .mockResolvedValueOnce(sessions)   // current week
      .mockResolvedValueOnce([]);        // previous week

    const result = await useCase.execute('user-1', 0);

    expect(result.weekStartDate).toBe('2026-02-16');
    expect(result.weekEndDate).toBe('2026-02-22');
    expect(result.totalSessions).toBe(2);
    expect(result.averageDuration).toBe(48); // (45+50)/2 rounded
    expect(mockSessionRepo.findByUserIdInDateRange).toHaveBeenCalledTimes(2);
  });

  it('weekOffset이 범위를 벗어나면 BadRequestException을 던진다', async () => {
    await expect(useCase.execute('user-1', 5)).rejects.toThrow(BadRequestException);
    await expect(useCase.execute('user-1', -1)).rejects.toThrow(BadRequestException);
  });

  it('세션이 없으면 빈 리포트를 반환한다', async () => {
    const result = await useCase.execute('user-1', 0);

    expect(result.totalSessions).toBe(0);
    expect(result.totalRecordedDays).toBe(0);
    expect(result.insights).toContain('이번 주 기록이 아직 없어요. 출퇴근을 기록해보세요!');
  });

  it('스트릭 정보가 있으면 리포트에 포함된다', async () => {
    const streak = new CommuteStreak('user-1', {
      weeklyCount: 3,
      weeklyGoal: 5,
    });
    mockStreakRepo.findByUserId.mockResolvedValue(streak);

    const result = await useCase.execute('user-1', 0);

    expect(result.streakWeeklyCount).toBe(3);
    expect(result.streakWeeklyGoal).toBe(5);
  });

  it('스트릭 정보가 없으면 기본값을 사용한다', async () => {
    mockStreakRepo.findByUserId.mockResolvedValue(undefined);

    const result = await useCase.execute('user-1', 0);

    expect(result.streakWeeklyCount).toBe(0);
    expect(result.streakWeeklyGoal).toBe(5);
  });

  it('weekOffset=1이면 지난주 데이터를 조회한다', async () => {
    await useCase.execute('user-1', 1);

    // First call: weekOffset=1 -> week of 2026-02-09 ~ 2026-02-15
    expect(mockSessionRepo.findByUserIdInDateRange).toHaveBeenCalledTimes(2);
    const firstCall = mockSessionRepo.findByUserIdInDateRange.mock.calls[0];
    expect(firstCall[0]).toBe('user-1');
    // startDate should be Monday Feb 9 KST
    const startDate = firstCall[1] as Date;
    expect(startDate.toISOString()).toBe('2026-02-08T15:00:00.000Z'); // KST Feb 9 00:00
  });

  it('전주 대비 비교가 올바르게 계산된다', async () => {
    const currentSessions = [
      createSession(new Date('2026-02-16T08:00:00+09:00'), 45),
    ];
    const previousSessions = [
      createSession(new Date('2026-02-09T08:00:00+09:00'), 50),
    ];
    mockSessionRepo.findByUserIdInDateRange
      .mockResolvedValueOnce(currentSessions)
      .mockResolvedValueOnce(previousSessions);

    const result = await useCase.execute('user-1', 0);

    expect(result.previousWeekAverage).toBe(50);
    expect(result.changeFromPrevious).toBe(-5);
    expect(result.trend).toBe('improving');
  });
});
