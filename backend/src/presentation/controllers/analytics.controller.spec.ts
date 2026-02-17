import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { CalculateRouteAnalyticsUseCase } from '@application/use-cases/calculate-route-analytics.use-case';
import { RouteAnalytics } from '@domain/entities/route-analytics.entity';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let calculateAnalyticsUseCase: jest.Mocked<CalculateRouteAnalyticsUseCase>;

  const OWNER_ID = 'user-123';
  const OTHER_USER_ID = 'other-user';

  const mockRequest = (userId: string) => ({
    user: { userId, email: `${userId}@test.com` },
  }) as any;

  const createMockAnalytics = (routeId: string, routeName: string, opts: Partial<{
    totalTrips: number;
    score: number;
    reliability: number;
    average: number;
  }> = {}): RouteAnalytics => {
    return new RouteAnalytics(routeId, routeName, {
      totalTrips: opts.totalTrips ?? 10,
      lastTripDate: new Date('2026-02-15'),
      duration: {
        average: opts.average ?? 45,
        min: 35,
        max: 55,
        stdDev: 5.2,
      },
      segmentStats: [
        {
          checkpointName: '강남역',
          transportMode: 'subway',
          averageDuration: 15,
          minDuration: 12,
          maxDuration: 18,
          variability: 'stable',
          sampleCount: 10,
        },
      ],
      conditionAnalysis: {
        byWeather: {},
        byDayOfWeek: {},
        byTimeSlot: {},
      },
      score: opts.score ?? 75,
      scoreFactors: {
        speed: 80,
        reliability: opts.reliability ?? 70,
        comfort: 65,
      },
    });
  };

  const mockAnalytics = createMockAnalytics('route-1', '출근 경로 A');

  beforeEach(async () => {
    calculateAnalyticsUseCase = {
      execute: jest.fn(),
      executeForUser: jest.fn(),
      compareRoutes: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        { provide: CalculateRouteAnalyticsUseCase, useValue: calculateAnalyticsUseCase },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
  });

  describe('getRouteAnalytics', () => {
    it('자신의 경로 분석 조회 성공', async () => {
      calculateAnalyticsUseCase.executeForUser.mockResolvedValue([mockAnalytics]);
      calculateAnalyticsUseCase.execute.mockResolvedValue(mockAnalytics);

      const result = await controller.getRouteAnalytics('route-1', mockRequest(OWNER_ID));

      expect(calculateAnalyticsUseCase.execute).toHaveBeenCalledWith('route-1');
      expect(result.routeId).toBe('route-1');
      expect(result.routeName).toBe('출근 경로 A');
      expect(result.totalTrips).toBe(10);
    });

    it('다른 사용자의 경로 분석 조회 시 ForbiddenException', async () => {
      calculateAnalyticsUseCase.executeForUser.mockResolvedValue([]); // route-1이 없음

      await expect(
        controller.getRouteAnalytics('route-1', mockRequest(OWNER_ID)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('응답 DTO 변환이 올바른지 확인', async () => {
      calculateAnalyticsUseCase.executeForUser.mockResolvedValue([mockAnalytics]);
      calculateAnalyticsUseCase.execute.mockResolvedValue(mockAnalytics);

      const result = await controller.getRouteAnalytics('route-1', mockRequest(OWNER_ID));

      expect(result.duration).toBeDefined();
      expect(result.duration.average).toBe(Math.round(mockAnalytics.duration.average));
      expect(result.score).toBe(mockAnalytics.score);
      expect(result.grade).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.lastCalculatedAt).toBeDefined();
    });
  });

  describe('recalculateRouteAnalytics', () => {
    it('자신의 경로 분석 재계산 성공', async () => {
      calculateAnalyticsUseCase.executeForUser.mockResolvedValue([mockAnalytics]);
      calculateAnalyticsUseCase.execute.mockResolvedValue(mockAnalytics);

      const result = await controller.recalculateRouteAnalytics('route-1', mockRequest(OWNER_ID));

      expect(calculateAnalyticsUseCase.execute).toHaveBeenCalledWith('route-1');
      expect(result.routeId).toBe('route-1');
    });

    it('다른 사용자의 경로 재계산 시 ForbiddenException', async () => {
      calculateAnalyticsUseCase.executeForUser.mockResolvedValue([]);

      await expect(
        controller.recalculateRouteAnalytics('route-1', mockRequest(OWNER_ID)),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getUserAnalytics', () => {
    it('자신의 전체 경로 분석 조회 성공', async () => {
      const analytics2 = createMockAnalytics('route-2', '퇴근 경로 B');
      calculateAnalyticsUseCase.executeForUser.mockResolvedValue([mockAnalytics, analytics2]);

      const result = await controller.getUserAnalytics(OWNER_ID, mockRequest(OWNER_ID));

      expect(calculateAnalyticsUseCase.executeForUser).toHaveBeenCalledWith(OWNER_ID);
      expect(result).toHaveLength(2);
      expect(result[0].routeId).toBe('route-1');
      expect(result[1].routeId).toBe('route-2');
    });

    it('다른 사용자의 전체 분석 조회 시 ForbiddenException', async () => {
      await expect(
        controller.getUserAnalytics(OWNER_ID, mockRequest(OTHER_USER_ID)),
      ).rejects.toThrow(ForbiddenException);

      expect(calculateAnalyticsUseCase.executeForUser).not.toHaveBeenCalled();
    });

    it('분석 데이터가 없으면 빈 배열 반환', async () => {
      calculateAnalyticsUseCase.executeForUser.mockResolvedValue([]);

      const result = await controller.getUserAnalytics(OWNER_ID, mockRequest(OWNER_ID));

      expect(result).toEqual([]);
    });
  });

  describe('compareRoutes', () => {
    it('2개 이상의 경로 비교 성공', async () => {
      const analytics1 = createMockAnalytics('route-1', '경로 A', { average: 40 });
      const analytics2 = createMockAnalytics('route-2', '경로 B', { average: 50 });

      calculateAnalyticsUseCase.executeForUser.mockResolvedValue([analytics1, analytics2]);
      calculateAnalyticsUseCase.compareRoutes.mockResolvedValue({
        routes: [analytics1, analytics2],
        winner: {
          fastest: 'route-1',
          mostReliable: 'route-1',
          recommended: 'route-1',
        },
        analysis: {
          timeDifference: 10,
          reliabilityDifference: 5,
        },
      } as any);

      const result = await controller.compareRoutes(
        'route-1,route-2',
        mockRequest(OWNER_ID),
      );

      expect(result.routes).toHaveLength(2);
      expect(result.winner.fastest).toBe('route-1');
    });

    it('1개 경로만 제공 시 에러', async () => {
      await expect(
        controller.compareRoutes('route-1', mockRequest(OWNER_ID)),
      ).rejects.toThrow('비교할 경로를 2개 이상 선택해주세요.');
    });

    it('6개 이상 경로 제공 시 에러', async () => {
      await expect(
        controller.compareRoutes('r1,r2,r3,r4,r5,r6', mockRequest(OWNER_ID)),
      ).rejects.toThrow('한 번에 최대 5개 경로까지 비교할 수 있습니다.');
    });

    it('다른 사용자의 경로 비교 시 ForbiddenException', async () => {
      calculateAnalyticsUseCase.executeForUser.mockResolvedValue([]);

      await expect(
        controller.compareRoutes('route-1,route-2', mockRequest(OWNER_ID)),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getRecommendedRoutes', () => {
    it('추천 경로 조회 성공 (기본 limit 3)', async () => {
      const highScore = createMockAnalytics('route-1', '경로 A', { score: 90 });
      const lowScore = createMockAnalytics('route-2', '경로 B', { score: 50 });
      calculateAnalyticsUseCase.executeForUser.mockResolvedValue([highScore, lowScore]);

      const result = await controller.getRecommendedRoutes(
        OWNER_ID,
        undefined as any,
        mockRequest(OWNER_ID),
      );

      expect(calculateAnalyticsUseCase.executeForUser).toHaveBeenCalledWith(OWNER_ID);
      // isRecommended() filters and sorts by score
      expect(result.length).toBeLessThanOrEqual(3);
    });

    it('limit 쿼리 파라미터 적용', async () => {
      const analytics = createMockAnalytics('route-1', '경로 A', { score: 90 });
      calculateAnalyticsUseCase.executeForUser.mockResolvedValue([analytics]);

      await controller.getRecommendedRoutes(
        OWNER_ID,
        '1',
        mockRequest(OWNER_ID),
      );

      expect(calculateAnalyticsUseCase.executeForUser).toHaveBeenCalledWith(OWNER_ID);
    });

    it('다른 사용자의 추천 경로 조회 시 ForbiddenException', async () => {
      await expect(
        controller.getRecommendedRoutes(OWNER_ID, '3', mockRequest(OTHER_USER_ID)),
      ).rejects.toThrow(ForbiddenException);

      expect(calculateAnalyticsUseCase.executeForUser).not.toHaveBeenCalled();
    });
  });

  describe('getSummary', () => {
    it('분석 데이터가 있을 때 요약 반환', async () => {
      const analytics1 = createMockAnalytics('route-1', '경로 A', { score: 80, totalTrips: 15 });
      const analytics2 = createMockAnalytics('route-2', '경로 B', { score: 60, totalTrips: 5 });
      calculateAnalyticsUseCase.executeForUser.mockResolvedValue([analytics1, analytics2]);

      const result = await controller.getSummary(OWNER_ID, mockRequest(OWNER_ID));

      expect(result.totalRoutes).toBe(2);
      expect(result.totalTrips).toBe(20);
      expect(result.averageScore).toBe(70);
      expect(result.bestRoute).toBeDefined();
      expect(result.mostUsedRoute).toBeDefined();
      expect(result.insights).toBeDefined();
    });

    it('데이터가 없으면 빈 상태 메시지 반환', async () => {
      calculateAnalyticsUseCase.executeForUser.mockResolvedValue([]);

      const result = await controller.getSummary(OWNER_ID, mockRequest(OWNER_ID));

      expect(result.totalRoutes).toBe(0);
      expect(result.totalTrips).toBe(0);
      expect(result.averageScore).toBe(0);
      expect(result.bestRoute).toBeUndefined();
      expect(result.insights).toContain(
        '아직 경로 데이터가 없습니다. 경로를 설정하고 측정을 시작해보세요!',
      );
    });

    it('다른 사용자의 요약 조회 시 ForbiddenException', async () => {
      await expect(
        controller.getSummary(OWNER_ID, mockRequest(OTHER_USER_ID)),
      ).rejects.toThrow(ForbiddenException);

      expect(calculateAnalyticsUseCase.executeForUser).not.toHaveBeenCalled();
    });
  });
});
