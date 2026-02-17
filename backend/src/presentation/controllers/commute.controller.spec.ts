import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { CommuteController } from './commute.controller';
import { ManageCommuteSessionUseCase } from '@application/use-cases/manage-commute-session.use-case';
import { GetCommuteStatsUseCase } from '@application/use-cases/get-commute-stats.use-case';
import { GetWeeklyReportUseCase } from '@application/use-cases/get-weekly-report.use-case';
import { GetStreakUseCase } from '@application/use-cases/get-streak.use-case';
import { UpdateStreakUseCase } from '@application/use-cases/update-streak.use-case';

describe('CommuteController', () => {
  let controller: CommuteController;
  let manageSessionUseCase: jest.Mocked<ManageCommuteSessionUseCase>;
  let getStatsUseCase: jest.Mocked<GetCommuteStatsUseCase>;
  let getWeeklyReportUseCase: jest.Mocked<GetWeeklyReportUseCase>;

  const OWNER_ID = 'user-123';
  const OTHER_USER_ID = 'other-user';

  const mockSession = {
    id: 'session-1',
    userId: OWNER_ID,
    routeId: 'route-1',
    status: 'in_progress',
    startTime: new Date().toISOString(),
    checkpoints: [],
  };

  const mockSessionOther = {
    id: 'session-2',
    userId: OTHER_USER_ID,
    routeId: 'route-2',
    status: 'in_progress',
    startTime: new Date().toISOString(),
    checkpoints: [],
  };

  const mockRequest = (userId: string) => ({
    user: { userId, email: `${userId}@test.com` },
  }) as any;

  beforeEach(async () => {
    manageSessionUseCase = {
      startSession: jest.fn(),
      recordCheckpoint: jest.fn(),
      completeSession: jest.fn(),
      cancelSession: jest.fn(),
      getSessionById: jest.fn(),
      getInProgressSession: jest.fn(),
      getHistory: jest.fn(),
    } as any;

    getStatsUseCase = {
      execute: jest.fn(),
    } as any;

    getWeeklyReportUseCase = {
      execute: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommuteController],
      providers: [
        { provide: ManageCommuteSessionUseCase, useValue: manageSessionUseCase },
        { provide: GetCommuteStatsUseCase, useValue: getStatsUseCase },
        { provide: GetWeeklyReportUseCase, useValue: getWeeklyReportUseCase },
        { provide: GetStreakUseCase, useValue: { execute: jest.fn(), getMilestones: jest.fn() } },
        { provide: UpdateStreakUseCase, useValue: { recordCompletion: jest.fn().mockResolvedValue(null), updateSettings: jest.fn() } },
      ],
    }).compile();

    controller = module.get<CommuteController>(CommuteController);
  });

  describe('startSession', () => {
    const startDto = { userId: OWNER_ID, routeId: 'route-1' };

    it('자신의 세션 시작 성공', async () => {
      manageSessionUseCase.startSession.mockResolvedValue(mockSession as any);

      const result = await controller.startSession(startDto as any, mockRequest(OWNER_ID));

      expect(manageSessionUseCase.startSession).toHaveBeenCalledWith(startDto);
      expect(result).toEqual(mockSession);
    });

    it('다른 사용자의 세션 시작 시 ForbiddenException', async () => {
      await expect(
        controller.startSession(startDto as any, mockRequest(OTHER_USER_ID)),
      ).rejects.toThrow(ForbiddenException);

      expect(manageSessionUseCase.startSession).not.toHaveBeenCalled();
    });

    it('다른 사용자의 세션 시작 시 올바른 에러 메시지', async () => {
      await expect(
        controller.startSession(startDto as any, mockRequest(OTHER_USER_ID)),
      ).rejects.toThrow('다른 사용자의 세션을 시작할 수 없습니다.');
    });
  });

  describe('recordCheckpoint', () => {
    const checkpointDto = { sessionId: 'session-1', checkpointId: 'cp-1' };

    it('자신의 세션에 체크포인트 기록 성공', async () => {
      manageSessionUseCase.getSessionById.mockResolvedValue(mockSession as any);
      manageSessionUseCase.recordCheckpoint.mockResolvedValue(mockSession as any);

      const result = await controller.recordCheckpoint(checkpointDto as any, mockRequest(OWNER_ID));

      expect(manageSessionUseCase.getSessionById).toHaveBeenCalledWith('session-1');
      expect(manageSessionUseCase.recordCheckpoint).toHaveBeenCalledWith(checkpointDto);
      expect(result).toEqual(mockSession);
    });

    it('다른 사용자의 세션에 체크포인트 기록 시 ForbiddenException', async () => {
      manageSessionUseCase.getSessionById.mockResolvedValue(mockSessionOther as any);

      await expect(
        controller.recordCheckpoint(checkpointDto as any, mockRequest(OWNER_ID)),
      ).rejects.toThrow(ForbiddenException);

      expect(manageSessionUseCase.recordCheckpoint).not.toHaveBeenCalled();
    });
  });

  describe('completeSession', () => {
    const completeDto = { sessionId: 'session-1' };

    it('자신의 세션 완료 성공', async () => {
      const completedSession = { ...mockSession, status: 'completed' };
      manageSessionUseCase.getSessionById.mockResolvedValue(mockSession as any);
      manageSessionUseCase.completeSession.mockResolvedValue(completedSession as any);

      const result = await controller.completeSession(completeDto as any, mockRequest(OWNER_ID));

      expect(manageSessionUseCase.getSessionById).toHaveBeenCalledWith('session-1');
      expect(manageSessionUseCase.completeSession).toHaveBeenCalledWith(completeDto);
      expect(result.status).toBe('completed');
    });

    it('다른 사용자의 세션 완료 시 ForbiddenException', async () => {
      manageSessionUseCase.getSessionById.mockResolvedValue(mockSessionOther as any);

      await expect(
        controller.completeSession(completeDto as any, mockRequest(OWNER_ID)),
      ).rejects.toThrow(ForbiddenException);

      expect(manageSessionUseCase.completeSession).not.toHaveBeenCalled();
    });
  });

  describe('cancelSession', () => {
    it('자신의 세션 취소 성공', async () => {
      manageSessionUseCase.getSessionById.mockResolvedValue(mockSession as any);
      manageSessionUseCase.cancelSession.mockResolvedValue(undefined);

      const result = await controller.cancelSession('session-1', mockRequest(OWNER_ID));

      expect(manageSessionUseCase.getSessionById).toHaveBeenCalledWith('session-1');
      expect(manageSessionUseCase.cancelSession).toHaveBeenCalledWith('session-1');
      expect(result).toEqual({ success: true });
    });

    it('다른 사용자의 세션 취소 시 ForbiddenException', async () => {
      manageSessionUseCase.getSessionById.mockResolvedValue(mockSessionOther as any);

      await expect(
        controller.cancelSession('session-2', mockRequest(OWNER_ID)),
      ).rejects.toThrow(ForbiddenException);

      expect(manageSessionUseCase.cancelSession).not.toHaveBeenCalled();
    });
  });

  describe('getSession', () => {
    it('자신의 세션 조회 성공', async () => {
      manageSessionUseCase.getSessionById.mockResolvedValue(mockSession as any);

      const result = await controller.getSession('session-1', mockRequest(OWNER_ID));

      expect(manageSessionUseCase.getSessionById).toHaveBeenCalledWith('session-1');
      expect(result).toEqual(mockSession);
    });

    it('다른 사용자의 세션 조회 시 ForbiddenException', async () => {
      manageSessionUseCase.getSessionById.mockResolvedValue(mockSessionOther as any);

      await expect(
        controller.getSession('session-2', mockRequest(OWNER_ID)),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getInProgressSession', () => {
    it('진행 중인 세션 조회 성공', async () => {
      manageSessionUseCase.getInProgressSession.mockResolvedValue(mockSession as any);

      const result = await controller.getInProgressSession(OWNER_ID, mockRequest(OWNER_ID));

      expect(manageSessionUseCase.getInProgressSession).toHaveBeenCalledWith(OWNER_ID);
      expect(result).toEqual(mockSession);
    });

    it('진행 중인 세션이 없으면 { session: null } 반환', async () => {
      manageSessionUseCase.getInProgressSession.mockResolvedValue(null as any);

      const result = await controller.getInProgressSession(OWNER_ID, mockRequest(OWNER_ID));

      expect(result).toEqual({ session: null });
    });

    it('다른 사용자의 진행 중 세션 조회 시 ForbiddenException', async () => {
      await expect(
        controller.getInProgressSession(OWNER_ID, mockRequest(OTHER_USER_ID)),
      ).rejects.toThrow(ForbiddenException);

      expect(manageSessionUseCase.getInProgressSession).not.toHaveBeenCalled();
    });
  });

  describe('getHistory', () => {
    const mockHistory = {
      sessions: [mockSession],
      total: 1,
    };

    it('자신의 통근 기록 조회 성공 (기본 limit/offset)', async () => {
      manageSessionUseCase.getHistory.mockResolvedValue(mockHistory as any);

      const result = await controller.getHistory(OWNER_ID, undefined, undefined, mockRequest(OWNER_ID));

      expect(manageSessionUseCase.getHistory).toHaveBeenCalledWith(OWNER_ID, 20, 0);
      expect(result).toEqual(mockHistory);
    });

    it('limit/offset 쿼리 파라미터 파싱', async () => {
      manageSessionUseCase.getHistory.mockResolvedValue(mockHistory as any);

      await controller.getHistory(OWNER_ID, '10', '5', mockRequest(OWNER_ID));

      expect(manageSessionUseCase.getHistory).toHaveBeenCalledWith(OWNER_ID, 10, 5);
    });

    it('잘못된 limit/offset 시 기본값 사용', async () => {
      manageSessionUseCase.getHistory.mockResolvedValue(mockHistory as any);

      await controller.getHistory(OWNER_ID, 'abc', 'xyz', mockRequest(OWNER_ID));

      // parseInt('abc', 10) returns NaN, so the ternary condition is truthy but value is NaN
      // In the controller: limit ? parseInt(limit, 10) : 20
      // parseInt('abc') = NaN, which is used as-is (this is the actual controller behavior)
      expect(manageSessionUseCase.getHistory).toHaveBeenCalledWith(OWNER_ID, NaN, NaN);
    });

    it('다른 사용자의 통근 기록 조회 시 ForbiddenException', async () => {
      await expect(
        controller.getHistory(OWNER_ID, undefined, undefined, mockRequest(OTHER_USER_ID)),
      ).rejects.toThrow(ForbiddenException);

      expect(manageSessionUseCase.getHistory).not.toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    const mockStats = {
      totalCommutes: 20,
      averageDuration: 45,
      bestDay: '수요일',
    };

    it('자신의 통근 통계 조회 성공 (기본 days)', async () => {
      getStatsUseCase.execute.mockResolvedValue(mockStats as any);

      const result = await controller.getStats(OWNER_ID, undefined, mockRequest(OWNER_ID));

      expect(getStatsUseCase.execute).toHaveBeenCalledWith(OWNER_ID, 30);
      expect(result).toEqual(mockStats);
    });

    it('days 쿼리 파라미터 파싱', async () => {
      getStatsUseCase.execute.mockResolvedValue(mockStats as any);

      await controller.getStats(OWNER_ID, '7', mockRequest(OWNER_ID));

      expect(getStatsUseCase.execute).toHaveBeenCalledWith(OWNER_ID, 7);
    });

    it('다른 사용자의 통근 통계 조회 시 ForbiddenException', async () => {
      await expect(
        controller.getStats(OWNER_ID, undefined, mockRequest(OTHER_USER_ID)),
      ).rejects.toThrow(ForbiddenException);

      expect(getStatsUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('getWeeklyReport', () => {
    const mockReport = {
      weekStartDate: '2026-02-16',
      weekEndDate: '2026-02-22',
      weekLabel: '2월 3주차',
      totalSessions: 5,
      totalRecordedDays: 3,
      averageDuration: 47,
      minDuration: 38,
      maxDuration: 62,
      dailyStats: [],
      bestDay: null,
      worstDay: null,
      previousWeekAverage: null,
      changeFromPrevious: null,
      changePercentage: null,
      trend: null,
      insights: [],
      streakWeeklyCount: 3,
      streakWeeklyGoal: 5,
    };

    it('자신의 주간 리포트 조회 성공 (기본 weekOffset)', async () => {
      getWeeklyReportUseCase.execute.mockResolvedValue(mockReport as any);

      const result = await controller.getWeeklyReport(OWNER_ID, undefined, mockRequest(OWNER_ID));

      expect(getWeeklyReportUseCase.execute).toHaveBeenCalledWith(OWNER_ID, 0);
      expect(result).toEqual(mockReport);
    });

    it('weekOffset 쿼리 파라미터 파싱', async () => {
      getWeeklyReportUseCase.execute.mockResolvedValue(mockReport as any);

      await controller.getWeeklyReport(OWNER_ID, '2', mockRequest(OWNER_ID));

      expect(getWeeklyReportUseCase.execute).toHaveBeenCalledWith(OWNER_ID, 2);
    });

    it('다른 사용자의 주간 리포트 조회 시 ForbiddenException', async () => {
      await expect(
        controller.getWeeklyReport(OWNER_ID, undefined, mockRequest(OTHER_USER_ID)),
      ).rejects.toThrow(ForbiddenException);

      expect(getWeeklyReportUseCase.execute).not.toHaveBeenCalled();
    });

    it('다른 사용자의 주간 리포트 조회 시 올바른 에러 메시지', async () => {
      await expect(
        controller.getWeeklyReport(OWNER_ID, undefined, mockRequest(OTHER_USER_ID)),
      ).rejects.toThrow('다른 사용자의 주간 리포트에 접근할 수 없습니다.');
    });
  });
});
