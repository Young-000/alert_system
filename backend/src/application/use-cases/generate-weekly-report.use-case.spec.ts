import { GenerateWeeklyReportUseCase } from './generate-weekly-report.use-case';
import { User } from '@domain/entities/user.entity';

describe('GenerateWeeklyReportUseCase', () => {
  let useCase: GenerateWeeklyReportUseCase;
  let mockUserRepository: any;
  let mockSessionRepository: any;
  let mockSessionRepo: any;
  let mockNotificationLogRepo: any;
  let mockSolapiService: any;
  let mockWebPushService: any;

  const testUser = new User(
    'test@example.com',
    '테스트 사용자',
    '01012345678',
    undefined,
    undefined,
    undefined,
    'user-1',
  );

  const createMockSession = (
    durationMinutes: number,
    delayMinutes: number,
    dayOffset: number,
  ) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dayOffset);
    startDate.setHours(8, 0, 0, 0);

    return {
      id: `session-${dayOffset}`,
      userId: 'user-1',
      routeId: 'route-1',
      status: 'completed',
      startedAt: startDate,
      completedAt: new Date(startDate.getTime() + durationMinutes * 60000),
      totalDurationMinutes: durationMinutes,
      totalWaitMinutes: 5,
      totalDelayMinutes: delayMinutes,
    };
  };

  beforeEach(() => {
    mockUserRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByIds: jest.fn().mockResolvedValue([]),
      findByEmail: jest.fn(),
      findByGoogleId: jest.fn(),
      updateGoogleId: jest.fn(),
    };

    mockSessionRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByIdWithRecords: jest.fn(),
      findByUserId: jest.fn(),
      findByUserIdAndStatus: jest.fn(),
      findInProgressByUserId: jest.fn(),
      findByUserIdInDateRange: jest.fn(),
      findByRouteId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteByUserId: jest.fn(),
    };

    mockSessionRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      }),
    };

    mockNotificationLogRepo = {
      save: jest.fn(),
      find: jest.fn(),
    };

    mockSolapiService = {
      sendWeatherAlert: jest.fn(),
      sendTransitAlert: jest.fn(),
      sendCombinedAlert: jest.fn(),
      sendLegacyWeatherNotification: jest.fn(),
      sendWeeklyReport: jest.fn().mockResolvedValue(undefined),
    };

    mockWebPushService = {
      sendToUser: jest.fn().mockResolvedValue(1),
    };
  });

  it('활성 사용자가 없으면 sent=0, skipped=0을 반환해야 한다', async () => {
    useCase = new GenerateWeeklyReportUseCase(
      mockUserRepository,
      mockSessionRepository,
      mockSessionRepo,
      mockNotificationLogRepo,
      mockSolapiService,
      mockWebPushService,
    );

    // sessionRepo returns no active users
    mockSessionRepo.createQueryBuilder().getRawMany.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result.sent).toBe(0);
    expect(result.skipped).toBe(0);
  });

  it('사용자를 찾을 수 없으면 건너뛰어야 한다', async () => {
    useCase = new GenerateWeeklyReportUseCase(
      mockUserRepository,
      mockSessionRepository,
      mockSessionRepo,
      mockNotificationLogRepo,
      mockSolapiService,
      mockWebPushService,
    );

    mockSessionRepo.createQueryBuilder().getRawMany.mockResolvedValue([
      { userId: 'non-existent-user' },
    ]);
    mockUserRepository.findByIds.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result.sent).toBe(0);
    expect(result.skipped).toBe(1);
  });

  it('올바른 통계로 리포트를 생성해야 한다', async () => {
    useCase = new GenerateWeeklyReportUseCase(
      mockUserRepository,
      mockSessionRepository,
      mockSessionRepo,
      mockNotificationLogRepo,
      mockSolapiService,
      mockWebPushService,
    );

    mockSessionRepo.createQueryBuilder().getRawMany.mockResolvedValue([
      { userId: 'user-1' },
    ]);

    mockUserRepository.findByIds.mockResolvedValue([testUser]);

    const sessions = [
      createMockSession(40, 0, 1),
      createMockSession(45, 3, 2),
      createMockSession(50, 5, 3),
    ];
    mockSessionRepository.findByUserIdInDateRange.mockResolvedValue(sessions);

    const result = await useCase.execute();

    expect(result.sent).toBe(1);
    expect(result.skipped).toBe(0);
  });

  it('Solapi 서비스가 있으면 알림톡을 보내야 한다', async () => {
    useCase = new GenerateWeeklyReportUseCase(
      mockUserRepository,
      mockSessionRepository,
      mockSessionRepo,
      mockNotificationLogRepo,
      mockSolapiService,
      mockWebPushService,
    );

    mockSessionRepo.createQueryBuilder().getRawMany.mockResolvedValue([
      { userId: 'user-1' },
    ]);

    mockUserRepository.findByIds.mockResolvedValue([testUser]);

    const sessions = [
      createMockSession(42, 0, 1),
      createMockSession(48, 3, 2),
    ];
    mockSessionRepository.findByUserIdInDateRange.mockResolvedValue(sessions);

    await useCase.execute();

    expect(mockSolapiService.sendWeeklyReport).toHaveBeenCalledWith(
      '01012345678',
      expect.objectContaining({
        userName: '테스트 사용자',
        totalCommutes: '2',
      }),
    );
  });

  it('Web Push 서비스가 있으면 푸시 알림을 보내야 한다', async () => {
    useCase = new GenerateWeeklyReportUseCase(
      mockUserRepository,
      mockSessionRepository,
      mockSessionRepo,
      mockNotificationLogRepo,
      mockSolapiService,
      mockWebPushService,
    );

    mockSessionRepo.createQueryBuilder().getRawMany.mockResolvedValue([
      { userId: 'user-1' },
    ]);

    mockUserRepository.findByIds.mockResolvedValue([testUser]);

    const sessions = [
      createMockSession(42, 0, 1),
      createMockSession(48, 3, 2),
    ];
    mockSessionRepository.findByUserIdInDateRange.mockResolvedValue(sessions);

    await useCase.execute();

    expect(mockWebPushService.sendToUser).toHaveBeenCalledWith(
      'user-1',
      expect.stringContaining('주간'),
      expect.stringContaining('2회'),
      '/dashboard',
    );
  });

  it('에러가 발생해도 정상적으로 처리해야 한다', async () => {
    useCase = new GenerateWeeklyReportUseCase(
      mockUserRepository,
      mockSessionRepository,
      mockSessionRepo,
      mockNotificationLogRepo,
      mockSolapiService,
      mockWebPushService,
    );

    mockSessionRepo.createQueryBuilder().getRawMany.mockResolvedValue([
      { userId: 'user-1' },
      { userId: 'user-2' },
    ]);

    const user2 = new User('user2@example.com', '사용자2', '01098765432', undefined, undefined, undefined, 'user-2');
    mockUserRepository.findByIds.mockResolvedValue([testUser, user2]);

    // user-1: session fetch에서 에러 발생, user-2: 정상
    mockSessionRepository.findByUserIdInDateRange
      .mockRejectedValueOnce(new Error('DB connection error'))
      .mockResolvedValueOnce([createMockSession(45, 0, 1)]);

    const result = await useCase.execute();

    // user-1 skipped due to error, user-2 sent successfully
    expect(result.skipped).toBe(1);
    expect(result.sent).toBe(1);
  });

  it('Solapi/WebPush 서비스 없이도 동작해야 한다', async () => {
    useCase = new GenerateWeeklyReportUseCase(
      mockUserRepository,
      mockSessionRepository,
      mockSessionRepo,
      undefined,
      undefined,
      undefined,
    );

    mockSessionRepo.createQueryBuilder().getRawMany.mockResolvedValue([
      { userId: 'user-1' },
    ]);

    mockUserRepository.findByIds.mockResolvedValue([testUser]);
    mockSessionRepository.findByUserIdInDateRange.mockResolvedValue([
      createMockSession(42, 0, 1),
    ]);

    const result = await useCase.execute();

    // Report is generated but no messaging services available, still counts as sent
    expect(result.sent).toBe(1);
  });

  it('완료된 세션이 없는 사용자를 건너뛰어야 한다', async () => {
    useCase = new GenerateWeeklyReportUseCase(
      mockUserRepository,
      mockSessionRepository,
      mockSessionRepo,
      mockNotificationLogRepo,
      mockSolapiService,
      mockWebPushService,
    );

    mockSessionRepo.createQueryBuilder().getRawMany.mockResolvedValue([
      { userId: 'user-1' },
    ]);

    mockUserRepository.findByIds.mockResolvedValue([testUser]);

    // No completed sessions in date range
    mockSessionRepository.findByUserIdInDateRange.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result.sent).toBe(0);
    expect(result.skipped).toBe(1);
    expect(mockSolapiService.sendWeeklyReport).not.toHaveBeenCalled();
    expect(mockWebPushService.sendToUser).not.toHaveBeenCalled();
  });
});
