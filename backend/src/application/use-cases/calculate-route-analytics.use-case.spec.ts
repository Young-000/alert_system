import { CalculateRouteAnalyticsUseCase } from './calculate-route-analytics.use-case';
import { CommuteSession, SessionStatus } from '@domain/entities/commute-session.entity';
import { CommuteRoute, RouteType, CheckpointType, TransportMode } from '@domain/entities/commute-route.entity';
import { CheckpointRecord } from '@domain/entities/checkpoint-record.entity';

describe('CalculateRouteAnalyticsUseCase', () => {
  let useCase: CalculateRouteAnalyticsUseCase;
  let mockSessionRepository: any;
  let mockRouteRepository: any;
  let mockAnalyticsRepository: any;

  const mockRoute = new CommuteRoute('user-1', '출근 경로', RouteType.MORNING, {
    id: 'route-1',
    totalExpectedDuration: 45,
    checkpoints: [
      {
        id: 'cp-1',
        routeId: 'route-1',
        sequenceOrder: 1,
        name: '집',
        checkpointType: CheckpointType.HOME,
        expectedWaitTime: 0,
        createdAt: new Date(),
        isTransferRelated: () => false,
        getTotalExpectedTime: () => 0,
      },
      {
        id: 'cp-2',
        routeId: 'route-1',
        sequenceOrder: 2,
        name: '강남역',
        checkpointType: CheckpointType.SUBWAY,
        transportMode: TransportMode.SUBWAY,
        expectedDurationToNext: 20,
        expectedWaitTime: 5,
        createdAt: new Date(),
        isTransferRelated: () => false,
        getTotalExpectedTime: () => 25,
      },
      {
        id: 'cp-3',
        routeId: 'route-1',
        sequenceOrder: 3,
        name: '회사',
        checkpointType: CheckpointType.WORK,
        expectedWaitTime: 0,
        createdAt: new Date(),
        isTransferRelated: () => false,
        getTotalExpectedTime: () => 0,
      },
    ],
  });

  const createMockSession = (
    durationMinutes: number,
    weatherCondition: string,
    dayOffset: number = 0
  ): CommuteSession => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dayOffset);
    startDate.setHours(8, 0, 0, 0);

    return new CommuteSession('user-1', 'route-1', {
      id: `session-${durationMinutes}-${dayOffset}`,
      startedAt: startDate,
      completedAt: new Date(startDate.getTime() + durationMinutes * 60000),
      totalDurationMinutes: durationMinutes,
      totalWaitMinutes: 5,
      totalDelayMinutes: durationMinutes - 45,
      status: SessionStatus.COMPLETED,
      weatherCondition,
      checkpointRecords: [
        new CheckpointRecord(`session-${durationMinutes}`, 'cp-2', new Date(), {
          durationFromPrevious: 15,
          actualWaitTime: 5,
          delayMinutes: 0,
        }),
      ],
    });
  };

  beforeEach(() => {
    mockSessionRepository = {
      findByRouteId: jest.fn(),
    };

    mockRouteRepository = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
    };

    mockAnalyticsRepository = {
      save: jest.fn((analytics) => Promise.resolve(analytics)),
      findByRouteId: jest.fn(),
    };

    useCase = new CalculateRouteAnalyticsUseCase(
      mockSessionRepository,
      mockRouteRepository,
      mockAnalyticsRepository
    );
  });

  describe('execute()', () => {
    it('경로가 없으면 에러를 던져야 한다', async () => {
      mockRouteRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute('route-1')).rejects.toThrow('Route not found');
    });

    it('세션이 없으면 빈 분석 결과를 반환해야 한다', async () => {
      mockRouteRepository.findById.mockResolvedValue(mockRoute);
      mockSessionRepository.findByRouteId.mockResolvedValue([]);

      const result = await useCase.execute('route-1');

      expect(result.totalTrips).toBe(0);
      expect(result.score).toBe(0);
    });

    it('완료된 세션으로 분석을 계산해야 한다', async () => {
      const sessions = [
        createMockSession(42, '맑음', 0),
        createMockSession(48, '맑음', 1),
        createMockSession(45, '비', 2),
        createMockSession(50, '비', 3),
        createMockSession(40, '맑음', 4),
      ];

      mockRouteRepository.findById.mockResolvedValue(mockRoute);
      mockSessionRepository.findByRouteId.mockResolvedValue(sessions);

      const result = await useCase.execute('route-1');

      expect(result.totalTrips).toBe(5);
      expect(result.duration.average).toBeGreaterThan(0);
      expect(result.duration.min).toBe(40);
      expect(result.duration.max).toBe(50);
      expect(result.score).toBeGreaterThan(0);
    });

    it('날씨별 분석을 포함해야 한다', async () => {
      const sessions = [
        createMockSession(42, '맑음', 0),
        createMockSession(45, '맑음', 1),
        createMockSession(55, '비', 2),
        createMockSession(52, '비', 3),
      ];

      mockRouteRepository.findById.mockResolvedValue(mockRoute);
      mockSessionRepository.findByRouteId.mockResolvedValue(sessions);

      const result = await useCase.execute('route-1');

      expect(result.conditionAnalysis.byWeather['맑음']).toBeDefined();
      expect(result.conditionAnalysis.byWeather['비']).toBeDefined();
      expect(result.conditionAnalysis.byWeather['비'].avgDuration).toBeGreaterThan(
        result.conditionAnalysis.byWeather['맑음'].avgDuration
      );
    });

    it('점수 요소를 계산해야 한다', async () => {
      const sessions = [
        createMockSession(45, '맑음', 0),
        createMockSession(46, '맑음', 1),
        createMockSession(44, '맑음', 2),
      ];

      mockRouteRepository.findById.mockResolvedValue(mockRoute);
      mockSessionRepository.findByRouteId.mockResolvedValue(sessions);

      const result = await useCase.execute('route-1');

      expect(result.scoreFactors.speed).toBeGreaterThanOrEqual(0);
      expect(result.scoreFactors.speed).toBeLessThanOrEqual(100);
      expect(result.scoreFactors.reliability).toBeGreaterThanOrEqual(0);
      expect(result.scoreFactors.reliability).toBeLessThanOrEqual(100);
      expect(result.scoreFactors.comfort).toBeGreaterThanOrEqual(0);
      expect(result.scoreFactors.comfort).toBeLessThanOrEqual(100);
    });
  });

  describe('compareRoutes()', () => {
    it('여러 경로를 비교하고 승자를 반환해야 한다', async () => {
      const route2 = new CommuteRoute('user-1', '퇴근 경로', RouteType.EVENING, {
        id: 'route-2',
        totalExpectedDuration: 50,
        checkpoints: mockRoute.checkpoints,
      });

      mockRouteRepository.findById
        .mockResolvedValueOnce(mockRoute)
        .mockResolvedValueOnce(route2);

      mockSessionRepository.findByRouteId
        .mockResolvedValueOnce([
          createMockSession(42, '맑음', 0),
          createMockSession(43, '맑음', 1),
        ])
        .mockResolvedValueOnce([
          createMockSession(55, '맑음', 0),
          createMockSession(58, '맑음', 1),
        ]);

      const result = await useCase.compareRoutes(['route-1', 'route-2']);

      expect(result.routes).toHaveLength(2);
      expect(result.winner.fastest).toBe('route-1');
      expect(result.analysis.timeDifference).toBeGreaterThan(0);
    });
  });

  describe('executeForUser()', () => {
    it('사용자의 모든 경로에 대한 분석을 반환해야 한다', async () => {
      const route2 = new CommuteRoute('user-1', '퇴근 경로', RouteType.EVENING, {
        id: 'route-2',
        totalExpectedDuration: 50,
        checkpoints: mockRoute.checkpoints,
      });

      mockRouteRepository.findByUserId.mockResolvedValue([mockRoute, route2]);
      mockRouteRepository.findById
        .mockResolvedValueOnce(mockRoute)
        .mockResolvedValueOnce(route2);
      mockSessionRepository.findByRouteId.mockResolvedValue([
        createMockSession(45, '맑음', 0),
      ]);

      const results = await useCase.executeForUser('user-1');

      expect(results).toHaveLength(2);
    });
  });

  /**
   * 소유권은 경로 자체가 답을 갖고 있다(`route.userId`). 분석 계산 결과로 대신
   * 판정하면, 한 경로의 계산이 실패한 순간 그 경로가 목록에서 빠지면서
   * **주인에게 "다른 사용자의 경로"라는 403이 나간다** — 장애가 권한 거부로 위장한다.
   */
  describe('findUnownedRouteIds', () => {
    it('본인 경로만 있으면 빈 배열을 돌려준다', async () => {
      mockRouteRepository.findById.mockResolvedValue(mockRoute);

      const result = await useCase.findUnownedRouteIds(['route-1'], 'user-1');

      expect(result).toEqual([]);
    });

    it('다른 사용자의 경로 id를 골라낸다', async () => {
      const othersRoute = new CommuteRoute('user-2', '남의 경로', RouteType.MORNING, {
        id: 'route-9',
        totalExpectedDuration: 30,
        checkpoints: mockRoute.checkpoints,
      });
      mockRouteRepository.findById.mockResolvedValue(othersRoute);

      const result = await useCase.findUnownedRouteIds(['route-9'], 'user-1');

      expect(result).toEqual(['route-9']);
    });

    it('존재하지 않는 경로 id도 골라낸다', async () => {
      mockRouteRepository.findById.mockResolvedValue(null);

      const result = await useCase.findUnownedRouteIds(['ghost'], 'user-1');

      expect(result).toEqual(['ghost']);
    });

    it('소유권 확인에 분석을 계산하지 않는다 (읽기 경로에 쓰기 금지)', async () => {
      mockRouteRepository.findById.mockResolvedValue(mockRoute);

      await useCase.findUnownedRouteIds(['route-1'], 'user-1');

      // 예전에는 executeForUser 로 전 경로 분석을 재계산하고 저장까지 했다.
      expect(mockSessionRepository.findByRouteId).not.toHaveBeenCalled();
      expect(mockAnalyticsRepository.save).not.toHaveBeenCalled();
      expect(mockRouteRepository.findByUserId).not.toHaveBeenCalled();
    });
  });
});
