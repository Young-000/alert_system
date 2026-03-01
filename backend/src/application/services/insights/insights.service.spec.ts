import { NotFoundException } from '@nestjs/common';
import { InsightsService } from './insights.service';
import { RegionalInsight } from '@domain/entities/regional-insight.entity';
import { IRegionalInsightRepository } from '@domain/repositories/regional-insight.repository';

describe('InsightsService', () => {
  let service: InsightsService;
  let mockInsightRepo: jest.Mocked<IRegionalInsightRepository>;
  let mockSessionRepo: { createQueryBuilder: jest.Mock };
  let mockUserPlaceRepo: { findOne: jest.Mock };

  beforeEach(() => {
    mockInsightRepo = {
      findByRegionId: jest.fn(),
      findAll: jest.fn(),
      countAll: jest.fn(),
      save: jest.fn(),
      saveMany: jest.fn(),
      deleteAll: jest.fn(),
    };

    mockSessionRepo = {
      createQueryBuilder: jest.fn(),
    };

    mockUserPlaceRepo = {
      findOne: jest.fn(),
    };

    service = new InsightsService(
      mockInsightRepo,
      mockSessionRepo as never,
      mockUserPlaceRepo as never,
    );
  });

  describe('getRegions', () => {
    it('지역 목록을 반환한다', async () => {
      const mockInsights = [
        createMockInsight('grid_37.50_127.00', '신도림역 일대', 15, 120),
        createMockInsight('grid_37.51_127.01', '강남역 일대', 20, 200),
      ];
      mockInsightRepo.findAll.mockResolvedValue(mockInsights);
      mockInsightRepo.countAll.mockResolvedValue(2);

      const result = await service.getRegions({});

      expect(result.regions).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.offset).toBe(0);
      expect(result.meta.totalPages).toBe(1);
    });

    it('빈 데이터에 대해 빈 배열을 반환한다', async () => {
      mockInsightRepo.findAll.mockResolvedValue([]);
      mockInsightRepo.countAll.mockResolvedValue(0);

      const result = await service.getRegions({});

      expect(result.regions).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    it('sortBy가 repository에 전달된다', async () => {
      mockInsightRepo.findAll.mockResolvedValue([]);
      mockInsightRepo.countAll.mockResolvedValue(0);

      await service.getRegions({
        sortBy: 'userCount',
        limit: 10,
        offset: 5,
      });

      expect(mockInsightRepo.findAll).toHaveBeenCalledWith({
        sortBy: 'userCount',
        limit: 10,
        offset: 5,
        minUserCount: 5,
      });
    });

    it('limit 최대값은 100이다', async () => {
      mockInsightRepo.findAll.mockResolvedValue([]);
      mockInsightRepo.countAll.mockResolvedValue(0);

      await service.getRegions({ limit: 200 });

      expect(mockInsightRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100 }),
      );
    });

    it('지역 summary에 weekTrendDirection이 포함된다', async () => {
      mockInsightRepo.findAll.mockResolvedValue([
        createMockInsight('grid_37.50_127.00', '신도림역 일대', 15, 120, { weekTrend: 5 }),
      ]);
      mockInsightRepo.countAll.mockResolvedValue(1);

      const result = await service.getRegions({});

      expect(result.regions[0].weekTrendDirection).toBe('worsening');
    });

    it('지역 summary에 peakHour가 포함된다', async () => {
      mockInsightRepo.findAll.mockResolvedValue([
        createMockInsight('grid_37.50_127.00', '신도림역 일대', 15, 120, {
          peakHourDistribution: { 8: 30, 18: 25 },
        }),
      ]);
      mockInsightRepo.countAll.mockResolvedValue(1);

      const result = await service.getRegions({});

      expect(result.regions[0].peakHour).toBe(8);
    });
  });

  describe('getRegionById', () => {
    it('지역 상세 정보를 반환한다', async () => {
      const mockInsight = createMockInsight('grid_37.50_127.00', '신도림역 일대', 15, 120);
      mockInsightRepo.findByRegionId.mockResolvedValue(mockInsight);

      const result = await service.getRegionById('grid_37.50_127.00');

      expect(result.regionId).toBe('grid_37.50_127.00');
      expect(result.regionName).toBe('신도림역 일대');
      expect(result.userCount).toBe(15);
      expect(result.sessionCount).toBe(120);
      expect(result.weekTrendDirection).toBeDefined();
      expect(result.monthTrendDirection).toBeDefined();
    });

    it('존재하지 않는 지역에 대해 NotFoundException을 던진다', async () => {
      mockInsightRepo.findByRegionId.mockResolvedValue(null);

      await expect(
        service.getRegionById('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getRegionTrends', () => {
    it('트렌드 데이터를 반환한다', async () => {
      const mockInsight = createMockInsight('grid_37.50_127.00', '신도림역 일대', 15, 120, {
        weekTrend: -5,
        monthTrend: 3.5,
      });
      mockInsightRepo.findByRegionId.mockResolvedValue(mockInsight);

      const result = await service.getRegionTrends('grid_37.50_127.00');

      expect(result.weekTrend).toBe(-5);
      expect(result.weekTrendDirection).toBe('improving');
      expect(result.monthTrend).toBe(3.5);
      expect(result.monthTrendDirection).toBe('worsening');
    });

    it('존재하지 않는 지역에 대해 NotFoundException을 던진다', async () => {
      mockInsightRepo.findByRegionId.mockResolvedValue(null);

      await expect(
        service.getRegionTrends('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getRegionPeakHours', () => {
    it('24시간 피크 분포를 반환한다', async () => {
      const mockInsight = createMockInsight('grid_37.50_127.00', '신도림역 일대', 15, 120, {
        peakHourDistribution: { 7: 5, 8: 30, 9: 20, 17: 10, 18: 25 },
      });
      mockInsightRepo.findByRegionId.mockResolvedValue(mockInsight);

      const result = await service.getRegionPeakHours('grid_37.50_127.00');

      expect(result.peakHour).toBe(8);
      expect(result.totalSessions).toBe(120);
      // All 24 hours should be filled
      for (let h = 0; h < 24; h++) {
        expect(result.peakHourDistribution[h]).toBeDefined();
      }
      expect(result.peakHourDistribution[8]).toBe(30);
      expect(result.peakHourDistribution[0]).toBe(0); // No sessions at midnight
    });

    it('존재하지 않는 지역에 대해 NotFoundException을 던진다', async () => {
      mockInsightRepo.findByRegionId.mockResolvedValue(null);

      await expect(
        service.getRegionPeakHours('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMyComparison', () => {
    const userId = 'user-123';

    beforeEach(() => {
      // Mock user stats query
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          avgDuration: 35,
          sessionCount: 10,
        }),
      };
      mockSessionRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    });

    it('사용자와 지역 평균을 비교한다 (사용자가 더 빠른 경우)', async () => {
      // User home place
      mockUserPlaceRepo.findOne.mockResolvedValue({
        userId,
        latitude: 37.5,
        longitude: 127.0,
        placeType: 'home',
      });

      // Regional insight
      const mockInsight = createMockInsight('grid_37.50_127.00', '신도림역 일대', 15, 120, {
        avgDurationMinutes: 42,
        medianDurationMinutes: 40,
      });
      mockInsightRepo.findByRegionId.mockResolvedValue(mockInsight);

      const result = await service.getMyComparison(userId);

      expect(result.userId).toBe(userId);
      expect(result.userAvgDurationMinutes).toBe(35);
      expect(result.regionAvgDurationMinutes).toBe(42);
      expect(result.diffMinutes).toBeCloseTo(-7, 0);
      expect(result.fasterThanRegion).toBe(true);
    });

    it('사용자의 장소가 없으면 지역 데이터 없이 비교한다', async () => {
      mockUserPlaceRepo.findOne.mockResolvedValue(null);

      const result = await service.getMyComparison(userId);

      expect(result.regionId).toBeNull();
      expect(result.regionName).toBe('알 수 없는 지역');
      expect(result.regionAvgDurationMinutes).toBe(0);
    });

    it('지역 인사이트가 없으면 지역 데이터 0으로 반환한다', async () => {
      mockUserPlaceRepo.findOne.mockResolvedValue({
        userId,
        latitude: 37.5,
        longitude: 127.0,
        placeType: 'home',
      });
      mockInsightRepo.findByRegionId.mockResolvedValue(null);

      const result = await service.getMyComparison(userId);

      expect(result.regionAvgDurationMinutes).toBe(0);
      expect(result.regionId).toBeNull();
    });

    it('프라이버시 임계값 미달 지역은 데이터 미제공', async () => {
      mockUserPlaceRepo.findOne.mockResolvedValue({
        userId,
        latitude: 37.5,
        longitude: 127.0,
        placeType: 'home',
      });

      // Region with only 3 users (below privacy threshold)
      const mockInsight = createMockInsight('grid_37.50_127.00', '소규모 지역', 3, 20);
      mockInsightRepo.findByRegionId.mockResolvedValue(mockInsight);

      const result = await service.getMyComparison(userId);

      expect(result.regionAvgDurationMinutes).toBe(0);
      expect(result.regionUserCount).toBe(0);
    });

    it('사용자가 지역보다 느리면 fasterThanRegion이 false이다', async () => {
      // Override user stats to be slower
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          avgDuration: 55,
          sessionCount: 10,
        }),
      };
      mockSessionRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      mockUserPlaceRepo.findOne.mockResolvedValue({
        userId,
        latitude: 37.5,
        longitude: 127.0,
        placeType: 'home',
      });

      const mockInsight = createMockInsight('grid_37.50_127.00', '신도림역 일대', 15, 120, {
        avgDurationMinutes: 42,
      });
      mockInsightRepo.findByRegionId.mockResolvedValue(mockInsight);

      const result = await service.getMyComparison(userId);

      expect(result.diffMinutes).toBeGreaterThan(0);
      expect(result.fasterThanRegion).toBe(false);
    });
  });
});

function createMockInsight(
  regionId: string,
  regionName: string,
  userCount: number,
  sessionCount: number,
  overrides?: Partial<{
    avgDurationMinutes: number;
    medianDurationMinutes: number;
    weekTrend: number;
    monthTrend: number;
    peakHourDistribution: Record<number, number>;
  }>,
): RegionalInsight {
  return new RegionalInsight({
    id: `mock-${regionId}`,
    regionId,
    regionName,
    gridLat: 37.505,
    gridLng: 127.005,
    avgDurationMinutes: overrides?.avgDurationMinutes ?? 42,
    medianDurationMinutes: overrides?.medianDurationMinutes ?? 40,
    userCount,
    sessionCount,
    peakHourDistribution: overrides?.peakHourDistribution ?? { 8: 20, 18: 15 },
    weekTrend: overrides?.weekTrend ?? 0,
    monthTrend: overrides?.monthTrend ?? 0,
    lastCalculatedAt: new Date(),
  });
}
