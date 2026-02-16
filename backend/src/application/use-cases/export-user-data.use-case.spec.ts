import { NotFoundException } from '@nestjs/common';
import { ExportUserDataUseCase } from './export-user-data.use-case';
import { User } from '../../domain/entities/user.entity';
import { Alert, AlertType } from '../../domain/entities/alert.entity';
import { BehaviorEvent, BehaviorEventType } from '../../domain/entities/behavior-event.entity';
import { CommuteRecord, CommuteType } from '../../domain/entities/commute-record.entity';
import { UserPattern, PatternType } from '../../domain/entities/user-pattern.entity';

describe('ExportUserDataUseCase', () => {
  let useCase: ExportUserDataUseCase;
  let mockUserRepository: any;
  let mockAlertRepository: any;
  let mockBehaviorEventRepository: any;
  let mockCommuteRecordRepository: any;
  let mockUserPatternRepository: any;

  const testUser = new User(
    'test@example.com',
    '테스트 사용자',
    '01012345678',
    undefined,
    { address: '서울시 강남구', lat: 37.4979, lng: 127.0276 },
    undefined,
    'user-1',
    new Date('2026-01-01'),
  );

  const testAlert = new Alert(
    'user-1',
    '출근 알림',
    '0 8 * * 1-5',
    [AlertType.WEATHER, AlertType.BUS],
    'bus-stop-123',
    undefined,
    'alert-1',
    true,
  );

  const testEvent = new BehaviorEvent(
    'user-1',
    BehaviorEventType.DEPARTURE_CONFIRMED,
    {
      id: 'event-1',
      alertId: 'alert-1',
      timestamp: new Date('2026-02-10T08:00:00Z'),
      metadata: { source: 'push' },
    },
  );

  const testRecord = new CommuteRecord(
    'user-1',
    new Date('2026-02-10'),
    CommuteType.MORNING,
    {
      id: 'record-1',
      scheduledDeparture: '08:00',
      actualDeparture: new Date('2026-02-10T08:05:00Z'),
      weatherCondition: '맑음',
      transitDelayMinutes: 3,
    },
  );

  const testPattern = new UserPattern(
    'user-1',
    PatternType.DEPARTURE_TIME,
    { averageTime: '08:10', stdDevMinutes: 5, earliestTime: '07:50', latestTime: '08:30' },
    {
      id: 'pattern-1',
      dayOfWeek: 1,
      isWeekday: true,
      confidence: 0.7,
      sampleCount: 15,
    },
  );

  beforeEach(() => {
    mockUserRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByGoogleId: jest.fn(),
      updateGoogleId: jest.fn(),
    };

    mockAlertRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn(),
    };

    mockBehaviorEventRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findByUserIdAndType: jest.fn(),
      findByUserIdInDateRange: jest.fn(),
      countByUserIdAndType: jest.fn(),
      deleteOlderThan: jest.fn(),
      deleteByUserId: jest.fn(),
    };

    mockCommuteRecordRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findByUserIdAndType: jest.fn(),
      findByUserIdInDateRange: jest.fn(),
      findRecentByUserId: jest.fn(),
      countByUserId: jest.fn(),
      deleteOlderThan: jest.fn(),
      deleteByUserId: jest.fn(),
    };

    mockUserPatternRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findByUserIdAndType: jest.fn(),
      findByUserIdTypeAndDay: jest.fn(),
      delete: jest.fn(),
      deleteByUserId: jest.fn(),
    };
  });

  it('모든 리포지토리가 있을 때 사용자 데이터를 내보내야 한다', async () => {
    useCase = new ExportUserDataUseCase(
      mockUserRepository,
      mockAlertRepository,
      mockBehaviorEventRepository,
      mockCommuteRecordRepository,
      mockUserPatternRepository,
    );

    mockUserRepository.findById.mockResolvedValue(testUser);
    mockAlertRepository.findByUserId.mockResolvedValue([testAlert]);
    mockBehaviorEventRepository.findByUserId.mockResolvedValue([testEvent]);
    mockCommuteRecordRepository.findByUserId.mockResolvedValue([testRecord]);
    mockUserPatternRepository.findByUserId.mockResolvedValue([testPattern]);

    const result = await useCase.execute('user-1');

    expect(result.exportedAt).toBeDefined();
    expect(result.user.id).toBe('user-1');
    expect(result.user.email).toBe('test@example.com');
    expect(result.user.name).toBe('테스트 사용자');
    expect(result.alerts).toHaveLength(1);
    expect(result.behaviorEvents).toHaveLength(1);
    expect(result.commuteRecords).toHaveLength(1);
    expect(result.patterns).toHaveLength(1);

    expect(mockUserRepository.findById).toHaveBeenCalledWith('user-1');
    expect(mockAlertRepository.findByUserId).toHaveBeenCalledWith('user-1');
    expect(mockBehaviorEventRepository.findByUserId).toHaveBeenCalledWith('user-1');
    expect(mockCommuteRecordRepository.findByUserId).toHaveBeenCalledWith('user-1');
    expect(mockUserPatternRepository.findByUserId).toHaveBeenCalledWith('user-1');
  });

  it('사용자가 없으면 NotFoundException을 던져야 한다', async () => {
    useCase = new ExportUserDataUseCase(
      mockUserRepository,
      mockAlertRepository,
      mockBehaviorEventRepository,
      mockCommuteRecordRepository,
      mockUserPatternRepository,
    );

    mockUserRepository.findById.mockResolvedValue(undefined);

    await expect(useCase.execute('non-existent')).rejects.toThrow(NotFoundException);
  });

  it('선택적 리포지토리가 없어도 정상 동작해야 한다', async () => {
    useCase = new ExportUserDataUseCase(
      mockUserRepository,
      null,
      null,
      null,
      null,
    );

    mockUserRepository.findById.mockResolvedValue(testUser);

    const result = await useCase.execute('user-1');

    expect(result.user.id).toBe('user-1');
    expect(result.alerts).toEqual([]);
    expect(result.behaviorEvents).toEqual([]);
    expect(result.commuteRecords).toEqual([]);
    expect(result.patterns).toEqual([]);
  });

  it('알림 데이터를 올바른 형식으로 내보내야 한다', async () => {
    useCase = new ExportUserDataUseCase(
      mockUserRepository,
      mockAlertRepository,
      null,
      null,
      null,
    );

    mockUserRepository.findById.mockResolvedValue(testUser);
    mockAlertRepository.findByUserId.mockResolvedValue([testAlert]);

    const result = await useCase.execute('user-1');

    expect(result.alerts[0]).toEqual({
      id: 'alert-1',
      name: '출근 알림',
      schedule: '0 8 * * 1-5',
      alertTypes: [AlertType.WEATHER, AlertType.BUS],
      enabled: true,
      busStopId: 'bus-stop-123',
      subwayStationId: undefined,
      smartSchedulingEnabled: true,
    });
  });

  it('행동 이벤트 데이터를 올바른 형식으로 내보내야 한다', async () => {
    useCase = new ExportUserDataUseCase(
      mockUserRepository,
      null,
      mockBehaviorEventRepository,
      null,
      null,
    );

    mockUserRepository.findById.mockResolvedValue(testUser);
    mockBehaviorEventRepository.findByUserId.mockResolvedValue([testEvent]);

    const result = await useCase.execute('user-1');

    expect(result.behaviorEvents[0].eventType).toBe(BehaviorEventType.DEPARTURE_CONFIRMED);
    expect(result.behaviorEvents[0].timestamp).toBeDefined();
    expect(result.behaviorEvents[0].alertId).toBe('alert-1');
    expect(typeof result.behaviorEvents[0].dayOfWeek).toBe('number');
  });

  it('출퇴근 기록 데이터를 올바른 형식으로 내보내야 한다', async () => {
    useCase = new ExportUserDataUseCase(
      mockUserRepository,
      null,
      null,
      mockCommuteRecordRepository,
      null,
    );

    mockUserRepository.findById.mockResolvedValue(testUser);
    mockCommuteRecordRepository.findByUserId.mockResolvedValue([testRecord]);

    const result = await useCase.execute('user-1');

    expect(result.commuteRecords[0].commuteType).toBe(CommuteType.MORNING);
    expect(result.commuteRecords[0].scheduledDeparture).toBe('08:00');
    expect(result.commuteRecords[0].weatherCondition).toBe('맑음');
    expect(result.commuteRecords[0].transitDelayMinutes).toBe(3);
    expect(result.commuteRecords[0].commuteDate).toBe('2026-02-10');
  });

  it('패턴 데이터를 올바른 형식으로 내보내야 한다', async () => {
    useCase = new ExportUserDataUseCase(
      mockUserRepository,
      null,
      null,
      null,
      mockUserPatternRepository,
    );

    mockUserRepository.findById.mockResolvedValue(testUser);
    mockUserPatternRepository.findByUserId.mockResolvedValue([testPattern]);

    const result = await useCase.execute('user-1');

    expect(result.patterns[0]).toEqual({
      patternType: PatternType.DEPARTURE_TIME,
      dayOfWeek: 1,
      isWeekday: true,
      value: { averageTime: '08:10', stdDevMinutes: 5, earliestTime: '07:50', latestTime: '08:30' },
      confidence: 0.7,
      sampleCount: 15,
    });
  });

  it('사용자 위치 정보를 포함해서 내보내야 한다', async () => {
    useCase = new ExportUserDataUseCase(
      mockUserRepository,
      null,
      null,
      null,
      null,
    );

    mockUserRepository.findById.mockResolvedValue(testUser);

    const result = await useCase.execute('user-1');

    expect(result.user.location).toEqual({
      address: '서울시 강남구',
      lat: 37.4979,
      lng: 127.0276,
    });
    expect(result.user.createdAt).toBe(new Date('2026-01-01').toISOString());
  });
});
