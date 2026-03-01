import { EnhancedPatternAnalysisService } from './enhanced-pattern-analysis.service';
import { FeatureEngineeringService } from './feature-engineering.service';
import { CommuteRecord, CommuteType } from '@domain/entities/commute-record.entity';
import { CommuteSession, SessionStatus } from '@domain/entities/commute-session.entity';
import { CheckpointRecord } from '@domain/entities/checkpoint-record.entity';
import { PatternType } from '@domain/entities/user-pattern.entity';
import { IUserPatternRepository } from '@domain/repositories/user-pattern.repository';
import { ICommuteRecordRepository } from '@domain/repositories/commute-record.repository';
import { ICommuteSessionRepository } from '@domain/repositories/commute-session.repository';

describe('EnhancedPatternAnalysisService', () => {
  let service: EnhancedPatternAnalysisService;
  let featureService: FeatureEngineeringService;
  let mockPatternRepo: jest.Mocked<IUserPatternRepository>;
  let mockCommuteRepo: jest.Mocked<ICommuteRecordRepository>;
  let mockSessionRepo: jest.Mocked<ICommuteSessionRepository>;

  const createRecord = (
    hour: number,
    minute: number,
    date: Date,
    weather = 'clear',
  ): CommuteRecord => {
    const departure = new Date(date);
    departure.setHours(hour, minute, 0, 0);
    return new CommuteRecord('user-1', date, CommuteType.MORNING, {
      id: `rec-${date.getTime()}-${Math.random().toString(36).slice(2)}`,
      actualDeparture: departure,
      weatherCondition: weather,
    });
  };

  // Generate weekday dates spread across Mon-Fri
  const generateWeekdayDates = (count: number, startDate = '2026-02-02'): Date[] => {
    const dates: Date[] = [];
    const current = new Date(startDate);
    while (dates.length < count) {
      const day = current.getDay();
      if (day >= 1 && day <= 5) {
        dates.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  beforeEach(() => {
    featureService = new FeatureEngineeringService();

    mockPatternRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findByUserIdAndType: jest.fn(),
      findByUserIdTypeAndDay: jest.fn(),
      delete: jest.fn(),
      deleteByUserId: jest.fn(),
    } as jest.Mocked<IUserPatternRepository>;

    mockCommuteRepo = {
      findByUserIdAndType: jest.fn(),
      findByUserId: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      findByUserIdInDateRange: jest.fn(),
      findRecentByUserId: jest.fn(),
      countByUserId: jest.fn(),
      deleteOlderThan: jest.fn(),
      deleteByUserId: jest.fn(),
    } as jest.Mocked<ICommuteRecordRepository>;

    mockSessionRepo = {
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
    } as jest.Mocked<ICommuteSessionRepository>;

    mockPatternRepo.findByUserIdAndType.mockResolvedValue(undefined);

    service = new EnhancedPatternAnalysisService(
      featureService,
      mockPatternRepo,
      mockCommuteRepo,
      mockSessionRepo,
    );
  });

  describe('analyzeDayOfWeekPattern', () => {
    it('10개 미만 레코드면 null을 반환한다', async () => {
      mockCommuteRepo.findByUserIdAndType.mockResolvedValue([
        createRecord(8, 0, new Date('2026-03-02')),
      ]);

      const result = await service.analyzeDayOfWeekPattern('user-1');
      expect(result).toBeNull();
    });

    it('10개 이상 레코드면 요일별 세그먼트를 생성한다', async () => {
      const dates = generateWeekdayDates(12);
      const records = dates.map((d, i) =>
        createRecord(8, i * 2, d), // 08:00, 08:02, 08:04, ...
      );

      mockCommuteRepo.findByUserIdAndType.mockResolvedValue(records);

      const result = await service.analyzeDayOfWeekPattern('user-1');

      expect(result).not.toBeNull();
      expect(result!.segments.length).toBeGreaterThan(0);
      expect(result!.lastCalculated).toBeDefined();

      // Each segment should have valid fields
      for (const seg of result!.segments) {
        expect(seg.dayOfWeek).toBeGreaterThanOrEqual(0);
        expect(seg.dayOfWeek).toBeLessThanOrEqual(6);
        expect(seg.avgMinutes).toBeGreaterThan(0);
        expect(seg.sampleCount).toBeGreaterThanOrEqual(2);
      }
    });

    it('패턴을 리포지토리에 저장한다', async () => {
      const dates = generateWeekdayDates(12);
      const records = dates.map((d, i) => createRecord(8, i * 2, d));
      mockCommuteRepo.findByUserIdAndType.mockResolvedValue(records);

      await service.analyzeDayOfWeekPattern('user-1');

      expect(mockPatternRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          patternType: PatternType.DAY_OF_WEEK_DEPARTURE,
        }),
      );
    });

    it('commuteRepository가 없으면 null을 반환한다', async () => {
      const serviceNoRepo = new EnhancedPatternAnalysisService(
        featureService,
        mockPatternRepo,
        undefined,
        mockSessionRepo,
      );

      const result = await serviceNoRepo.analyzeDayOfWeekPattern('user-1');
      expect(result).toBeNull();
    });
  });

  describe('analyzeWeatherSensitivity', () => {
    it('20개 미만 레코드면 null을 반환한다', async () => {
      const dates = generateWeekdayDates(10);
      const records = dates.map(d => createRecord(8, 0, d, 'rain'));
      mockCommuteRepo.findByUserIdAndType.mockResolvedValue(records);

      const result = await service.analyzeWeatherSensitivity('user-1');
      expect(result).toBeNull();
    });

    it('날씨 다양성이 2 미만이면 null을 반환한다', async () => {
      const dates = generateWeekdayDates(25);
      const records = dates.map(d => createRecord(8, 0, d, 'clear'));
      mockCommuteRepo.findByUserIdAndType.mockResolvedValue(records);

      const result = await service.analyzeWeatherSensitivity('user-1');
      expect(result).toBeNull();
    });

    it('충분한 데이터로 날씨 계수를 계산한다', async () => {
      const dates = generateWeekdayDates(25);
      const records: CommuteRecord[] = [];

      // Clear days: leave at 08:10
      for (let i = 0; i < 15; i++) {
        records.push(createRecord(8, 10, dates[i], 'clear'));
      }
      // Rain days: leave at 08:00 (10 min earlier)
      for (let i = 15; i < 20; i++) {
        records.push(createRecord(8, 0, dates[i], 'rain'));
      }
      // Snow days: leave at 07:50 (20 min earlier)
      for (let i = 20; i < 25; i++) {
        records.push(createRecord(7, 50, dates[i], 'snow'));
      }

      mockCommuteRepo.findByUserIdAndType.mockResolvedValue(records);

      const result = await service.analyzeWeatherSensitivity('user-1');

      expect(result).not.toBeNull();
      // Rain coefficient should be negative (leave earlier)
      expect(result!.rainCoefficient).toBeLessThan(0);
      // Snow coefficient should be more negative
      expect(result!.snowCoefficient).toBeLessThan(result!.rainCoefficient);
      expect(result!.sampleCountRain).toBe(5);
      expect(result!.sampleCountSnow).toBe(5);
      expect(result!.sampleCountClear).toBe(15);
    });
  });

  describe('analyzeSeasonalTrend', () => {
    it('30개 미만 레코드면 null을 반환한다', async () => {
      const dates = generateWeekdayDates(20);
      const records = dates.map(d => createRecord(8, 0, d));
      mockCommuteRepo.findByUserIdAndType.mockResolvedValue(records);

      const result = await service.analyzeSeasonalTrend('user-1');
      expect(result).toBeNull();
    });

    it('2개 미만 월이면 null을 반환한다', async () => {
      // All records in same month
      const records: CommuteRecord[] = [];
      for (let i = 1; i <= 30; i++) {
        const d = new Date(`2026-03-${i.toString().padStart(2, '0')}`);
        if (d.getDay() >= 1 && d.getDay() <= 5) {
          records.push(createRecord(8, 0, d));
        }
      }
      // Pad to 30
      while (records.length < 30) {
        records.push(createRecord(8, 0, new Date('2026-03-02')));
      }
      mockCommuteRepo.findByUserIdAndType.mockResolvedValue(records);

      const result = await service.analyzeSeasonalTrend('user-1');
      expect(result).toBeNull();
    });

    it('충분한 데이터로 계절 추세를 감지한다', async () => {
      const records: CommuteRecord[] = [];

      // January: leave at 08:00
      for (let i = 0; i < 15; i++) {
        const d = new Date('2026-01-06'); // Monday
        d.setDate(d.getDate() + i);
        records.push(createRecord(8, 0, d));
      }
      // February: leave at 08:10 (getting later)
      for (let i = 0; i < 15; i++) {
        const d = new Date('2026-02-02'); // Monday
        d.setDate(d.getDate() + i);
        records.push(createRecord(8, 10, d));
      }

      mockCommuteRepo.findByUserIdAndType.mockResolvedValue(records);

      const result = await service.analyzeSeasonalTrend('user-1');

      expect(result).not.toBeNull();
      expect(result!.monthlyAverages.length).toBe(2);
      expect(result!.trendDirection).toBe('later');
      expect(result!.trendMinutesPerMonth).toBeGreaterThan(0);
    });
  });

  describe('analyzeRouteSegments', () => {
    it('5개 미만 세션이면 null을 반환한다', async () => {
      mockSessionRepo.findByRouteId.mockResolvedValue([]);

      const result = await service.analyzeRouteSegments('user-1', 'route-1');
      expect(result).toBeNull();
    });

    it('충분한 세션으로 구간 통계를 계산한다', async () => {
      const sessions = Array(6).fill(null).map((_, i) =>
        new CommuteSession('user-1', 'route-1', {
          id: `session-${i}`,
          status: SessionStatus.COMPLETED,
          totalDurationMinutes: 40 + i,
          checkpointRecords: [
            new CheckpointRecord(`session-${i}`, 'cp-1', new Date(), {
              durationFromPrevious: 10 + (i % 3),
              actualWaitTime: 3,
            }),
            new CheckpointRecord(`session-${i}`, 'cp-2', new Date(), {
              durationFromPrevious: 15 + (i % 5),
              actualWaitTime: 5,
            }),
          ],
        }),
      );

      mockSessionRepo.findByRouteId.mockResolvedValue(sessions);

      const result = await service.analyzeRouteSegments('user-1', 'route-1');

      expect(result).not.toBeNull();
      expect(result!.routeId).toBe('route-1');
      expect(result!.segments.length).toBe(2);
      expect(result!.segments[0].checkpointId).toBe('cp-1');
      expect(result!.segments[0].avgDuration).toBeGreaterThan(0);
    });

    it('sessionRepository가 없으면 null을 반환한다', async () => {
      const serviceNoRepo = new EnhancedPatternAnalysisService(
        featureService,
        mockPatternRepo,
        mockCommuteRepo,
        undefined,
      );

      const result = await serviceNoRepo.analyzeRouteSegments('user-1', 'route-1');
      expect(result).toBeNull();
    });
  });

  describe('runFullAnalysis', () => {
    it('모든 분석을 병렬로 실행한다', async () => {
      mockCommuteRepo.findByUserIdAndType.mockResolvedValue([]);

      const result = await service.runFullAnalysis('user-1');

      expect(result.dayOfWeek).toBeNull();
      expect(result.weatherSensitivity).toBeNull();
      expect(result.seasonalTrend).toBeNull();
    });
  });

  describe('getCachedDayOfWeekPattern', () => {
    it('캐시된 패턴을 반환한다', async () => {
      const mockValue = {
        segments: [{ dayOfWeek: 1, avgMinutes: 490, stdDevMinutes: 5, sampleCount: 10 }],
        lastCalculated: '2026-03-02',
      };
      mockPatternRepo.findByUserIdAndType.mockResolvedValue({
        value: mockValue,
      } as any);

      const result = await service.getCachedDayOfWeekPattern('user-1');
      expect(result).toEqual(mockValue);
    });

    it('캐시가 없으면 null을 반환한다', async () => {
      mockPatternRepo.findByUserIdAndType.mockResolvedValue(undefined);

      const result = await service.getCachedDayOfWeekPattern('user-1');
      expect(result).toBeNull();
    });
  });

  describe('getDayName', () => {
    it('요일 번호를 한국어 이름으로 변환한다', () => {
      expect(service.getDayName(0)).toBe('일요일');
      expect(service.getDayName(1)).toBe('월요일');
      expect(service.getDayName(5)).toBe('금요일');
      expect(service.getDayName(6)).toBe('토요일');
    });
  });
});
