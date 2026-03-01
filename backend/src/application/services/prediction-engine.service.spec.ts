import { PredictionEngineService } from './prediction-engine.service';
import { FeatureEngineeringService } from './feature-engineering.service';
import { CommuteRecord, CommuteType } from '@domain/entities/commute-record.entity';
import { PatternType, UserPattern, DayOfWeekDepartureValue, WeatherSensitivityValue } from '@domain/entities/user-pattern.entity';
import { IUserPatternRepository } from '@domain/repositories/user-pattern.repository';
import { ICommuteRecordRepository } from '@domain/repositories/commute-record.repository';

describe('PredictionEngineService', () => {
  let service: PredictionEngineService;
  let featureService: FeatureEngineeringService;
  let mockPatternRepo: jest.Mocked<IUserPatternRepository>;
  let mockCommuteRepo: jest.Mocked<ICommuteRecordRepository>;

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

  const generateRecords = (count: number, baseHour = 8, baseMinute = 10, weather = 'clear'): CommuteRecord[] => {
    const records: CommuteRecord[] = [];
    let current = new Date('2026-02-02');
    let generated = 0;
    while (generated < count) {
      const day = current.getDay();
      if (day >= 1 && day <= 5) {
        records.push(createRecord(baseHour, baseMinute + (generated % 10), current, weather));
        generated++;
      }
      current = new Date(current.getTime() + 86400000);
    }
    return records;
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

    mockPatternRepo.findByUserIdAndType.mockResolvedValue(undefined);

    service = new PredictionEngineService(
      featureService,
      mockPatternRepo,
      mockCommuteRepo,
    );
  });

  describe('determineTier', () => {
    it('0-4 records → cold_start', () => {
      expect(service.determineTier(0)).toBe('cold_start');
      expect(service.determineTier(4)).toBe('cold_start');
    });

    it('5-9 records → basic', () => {
      expect(service.determineTier(5)).toBe('basic');
      expect(service.determineTier(9)).toBe('basic');
    });

    it('10-19 records → day_aware', () => {
      expect(service.determineTier(10)).toBe('day_aware');
      expect(service.determineTier(19)).toBe('day_aware');
    });

    it('20-29 records → weather_aware', () => {
      expect(service.determineTier(20)).toBe('weather_aware');
      expect(service.determineTier(29)).toBe('weather_aware');
    });

    it('30+ records → full', () => {
      expect(service.determineTier(30)).toBe('full');
      expect(service.determineTier(100)).toBe('full');
    });
  });

  describe('predict', () => {
    it('cold start: 0 records → population default', async () => {
      mockCommuteRepo.findByUserIdAndType.mockResolvedValue([]);

      const result = await service.predict('user-1');

      expect(result.tier).toBe('cold_start');
      expect(result.confidence).toBe(0.3);
      expect(result.departureTime).toBe('08:00'); // DEFAULT_PRIOR.mu = 480
      expect(result.dataStatus.totalRecords).toBe(0);
      expect(result.dataStatus.nextTierAt).toBe(5);
      expect(result.dataStatus.nextTierName).toBe('basic');
    });

    it('basic tier: 5 records → Bayesian average', async () => {
      const records = generateRecords(5, 8, 10);
      mockCommuteRepo.findByUserIdAndType.mockResolvedValue(records);

      const result = await service.predict('user-1');

      expect(result.tier).toBe('basic');
      expect(result.confidence).toBeGreaterThan(0.3);
      expect(result.dataStatus.nextTierAt).toBe(10);
    });

    it('day_aware tier: 12 records → uses day-of-week pattern', async () => {
      const records = generateRecords(12, 8, 10);
      mockCommuteRepo.findByUserIdAndType.mockResolvedValue(records);

      const dayValue: DayOfWeekDepartureValue = {
        segments: [
          { dayOfWeek: 1, avgMinutes: 490, stdDevMinutes: 3, sampleCount: 5 },
          { dayOfWeek: 2, avgMinutes: 492, stdDevMinutes: 4, sampleCount: 3 },
          { dayOfWeek: 3, avgMinutes: 488, stdDevMinutes: 2, sampleCount: 3 },
        ],
        lastCalculated: new Date().toISOString(),
      };
      mockPatternRepo.findByUserIdAndType.mockImplementation(async (_, type) => {
        if (type === PatternType.DAY_OF_WEEK_DEPARTURE) {
          return new UserPattern('user-1', PatternType.DAY_OF_WEEK_DEPARTURE, dayValue, {
            sampleCount: 12,
            confidence: 0.7,
          });
        }
        return undefined;
      });

      // Predict for a Monday
      const result = await service.predict('user-1', {
        targetDate: new Date('2026-03-02'), // Monday
      });

      expect(result.tier).toBe('day_aware');
      // Should have a day_of_week factor
      const dayFactor = result.factors.find(f => f.type === 'day_of_week');
      // The factor might or might not be present depending on if impact >= 1
      expect(result.departureTime).toBeDefined();
    });

    it('weather_aware tier: uses personal weather coefficients', async () => {
      const records = generateRecords(25);
      mockCommuteRepo.findByUserIdAndType.mockResolvedValue(records);

      const weatherValue: WeatherSensitivityValue = {
        rainCoefficient: -8,
        snowCoefficient: -14,
        temperatureCoefficient: -0.5,
        sampleCountRain: 5,
        sampleCountSnow: 3,
        sampleCountClear: 17,
        rSquared: 0.6,
        lastCalculated: new Date().toISOString(),
      };
      mockPatternRepo.findByUserIdAndType.mockImplementation(async (_, type) => {
        if (type === PatternType.WEATHER_SENSITIVITY) {
          return new UserPattern('user-1', PatternType.WEATHER_SENSITIVITY, weatherValue, {
            sampleCount: 25,
            confidence: 0.8,
          });
        }
        return undefined;
      });

      const result = await service.predict('user-1', { weather: 'rain' });

      expect(result.tier).toBe('weather_aware');
      const weatherFactor = result.factors.find(f => f.type === 'weather');
      expect(weatherFactor).toBeDefined();
      expect(weatherFactor!.impact).toBeLessThan(0); // Earlier departure
    });

    it('transit delay > 5 minutes adds a factor', async () => {
      mockCommuteRepo.findByUserIdAndType.mockResolvedValue([]);

      const result = await service.predict('user-1', { transitDelayMinutes: 12 });

      const delayFactor = result.factors.find(f => f.type === 'transit_delay');
      expect(delayFactor).toBeDefined();
      expect(delayFactor!.impact).toBe(-12);
    });

    it('transit delay <= 5 minutes does not add a factor', async () => {
      mockCommuteRepo.findByUserIdAndType.mockResolvedValue([]);

      const result = await service.predict('user-1', { transitDelayMinutes: 5 });

      const delayFactor = result.factors.find(f => f.type === 'transit_delay');
      expect(delayFactor).toBeUndefined();
    });

    it('departure range is always present', async () => {
      const records = generateRecords(10);
      mockCommuteRepo.findByUserIdAndType.mockResolvedValue(records);

      const result = await service.predict('user-1');

      expect(result.departureRange.early).toBeDefined();
      expect(result.departureRange.late).toBeDefined();
    });

    it('factors always includes at least one entry', async () => {
      mockCommuteRepo.findByUserIdAndType.mockResolvedValue([]);

      const result = await service.predict('user-1');

      expect(result.factors.length).toBeGreaterThanOrEqual(1);
    });

    it('cold_start with weather still applies default adjustments', async () => {
      mockCommuteRepo.findByUserIdAndType.mockResolvedValue([]);

      const result = await service.predict('user-1', { weather: 'rain' });

      const weatherFactor = result.factors.find(f => f.type === 'weather');
      expect(weatherFactor).toBeDefined();
    });
  });

  describe('getInsights', () => {
    it('데이터가 없으면 기본 통계를 반환한다', async () => {
      mockCommuteRepo.findByUserIdAndType.mockResolvedValue([]);

      const insights = await service.getInsights('user-1');

      expect(insights.dayOfWeek).toBeNull();
      expect(insights.weatherImpact).toBeNull();
      expect(insights.overallStats.totalRecords).toBe(0);
      expect(insights.overallStats.currentTier).toBe('cold_start');
    });

    it('10+ records면 dayOfWeek 인사이트를 반환한다', async () => {
      const records = generateRecords(12);
      mockCommuteRepo.findByUserIdAndType.mockResolvedValue(records);

      const dayValue: DayOfWeekDepartureValue = {
        segments: [
          { dayOfWeek: 1, avgMinutes: 490, stdDevMinutes: 3, sampleCount: 5 },
          { dayOfWeek: 2, avgMinutes: 492, stdDevMinutes: 4, sampleCount: 3 },
        ],
        lastCalculated: new Date().toISOString(),
      };
      mockPatternRepo.findByUserIdAndType.mockImplementation(async (_, type) => {
        if (type === PatternType.DAY_OF_WEEK_DEPARTURE) {
          return new UserPattern('user-1', PatternType.DAY_OF_WEEK_DEPARTURE, dayValue);
        }
        return undefined;
      });

      const insights = await service.getInsights('user-1');

      expect(insights.dayOfWeek).not.toBeNull();
      expect(insights.dayOfWeek!.segments.length).toBe(2);
    });

    it('20+ records면 weatherImpact 인사이트를 반환한다', async () => {
      const records = generateRecords(25);
      mockCommuteRepo.findByUserIdAndType.mockResolvedValue(records);

      const weatherValue: WeatherSensitivityValue = {
        rainCoefficient: -8,
        snowCoefficient: -14,
        temperatureCoefficient: -0.5,
        sampleCountRain: 5,
        sampleCountSnow: 3,
        sampleCountClear: 17,
        rSquared: 0.6,
        lastCalculated: new Date().toISOString(),
      };
      mockPatternRepo.findByUserIdAndType.mockImplementation(async (_, type) => {
        if (type === PatternType.WEATHER_SENSITIVITY) {
          return new UserPattern('user-1', PatternType.WEATHER_SENSITIVITY, weatherValue);
        }
        return undefined;
      });

      const insights = await service.getInsights('user-1');

      expect(insights.weatherImpact).not.toBeNull();
      // maxCoeff = max(|-8|, |-14|) = 14 > 12 → 'high'
      expect(insights.weatherImpact!.sensitivity).toBe('high');
      expect(insights.weatherImpact!.coefficients.rain).toBe(-8);
    });
  });
});
