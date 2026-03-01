/**
 * BE-10 / BE-11: Integration tests for the full prediction pipeline.
 *
 * These tests verify the end-to-end behavior of the prediction system
 * across all 5 tiers, ensuring that FeatureEngineeringService,
 * EnhancedPatternAnalysisService, and PredictionEngineService
 * work together correctly without N+1 queries or performance issues.
 */
import { FeatureEngineeringService } from './feature-engineering.service';
import { EnhancedPatternAnalysisService } from './enhanced-pattern-analysis.service';
import { PredictionEngineService, PredictionTier } from './prediction-engine.service';
import { CommuteRecord, CommuteType } from '@domain/entities/commute-record.entity';
import { CommuteSession, SessionStatus } from '@domain/entities/commute-session.entity';
import { CheckpointRecord } from '@domain/entities/checkpoint-record.entity';
import { PatternType, UserPattern, DayOfWeekDepartureValue, WeatherSensitivityValue } from '@domain/entities/user-pattern.entity';
import { IUserPatternRepository } from '@domain/repositories/user-pattern.repository';
import { ICommuteRecordRepository } from '@domain/repositories/commute-record.repository';
import { ICommuteSessionRepository } from '@domain/repositories/commute-session.repository';

// ---- Helpers ----

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

const generateWeekdayRecords = (
  count: number,
  baseHour = 8,
  baseMinute = 10,
  weather = 'clear',
): CommuteRecord[] => {
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

const createMockRepos = (): {
  patternRepo: jest.Mocked<IUserPatternRepository>;
  commuteRepo: jest.Mocked<ICommuteRecordRepository>;
  sessionRepo: jest.Mocked<ICommuteSessionRepository>;
} => {
  const patternRepo = {
    save: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    findByUserIdAndType: jest.fn(),
    findByUserIdTypeAndDay: jest.fn(),
    delete: jest.fn(),
    deleteByUserId: jest.fn(),
  } as jest.Mocked<IUserPatternRepository>;

  const commuteRepo = {
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

  const sessionRepo = {
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

  patternRepo.findByUserIdAndType.mockResolvedValue(undefined);

  return { patternRepo, commuteRepo, sessionRepo };
};

describe('Prediction Pipeline Integration', () => {
  let featureService: FeatureEngineeringService;
  let analysisService: EnhancedPatternAnalysisService;
  let predictionEngine: PredictionEngineService;
  let patternRepo: jest.Mocked<IUserPatternRepository>;
  let commuteRepo: jest.Mocked<ICommuteRecordRepository>;
  let sessionRepo: jest.Mocked<ICommuteSessionRepository>;

  beforeEach(() => {
    const repos = createMockRepos();
    patternRepo = repos.patternRepo;
    commuteRepo = repos.commuteRepo;
    sessionRepo = repos.sessionRepo;

    featureService = new FeatureEngineeringService();

    analysisService = new EnhancedPatternAnalysisService(
      featureService,
      patternRepo,
      commuteRepo,
      sessionRepo,
    );

    predictionEngine = new PredictionEngineService(
      featureService,
      patternRepo,
      commuteRepo,
    );
  });

  describe('Tier progression: cold_start → basic → day_aware → weather_aware → full', () => {
    it('0 records: cold_start tier with default prediction', async () => {
      commuteRepo.findByUserIdAndType.mockResolvedValue([]);

      const result = await predictionEngine.predict('user-1');

      expect(result.tier).toBe('cold_start');
      expect(result.confidence).toBe(0.3);
      expect(result.departureTime).toBe('08:00');
      expect(result.dataStatus.totalRecords).toBe(0);
      expect(result.dataStatus.nextTierAt).toBe(5);
    });

    it('5 records: basic tier with Bayesian-estimated departure', async () => {
      const records = generateWeekdayRecords(5, 8, 15); // ~08:15-08:19
      commuteRepo.findByUserIdAndType.mockResolvedValue(records);

      const result = await predictionEngine.predict('user-1');

      expect(result.tier).toBe('basic');
      expect(result.confidence).toBeGreaterThan(0.3);
      expect(result.confidence).toBeLessThan(0.95);
      // Bayesian posterior pulls toward the data
      const [h, m] = result.departureTime.split(':').map(Number);
      const minutes = h * 60 + m;
      expect(minutes).toBeGreaterThanOrEqual(480); // >= 08:00
      expect(minutes).toBeLessThanOrEqual(510);    // <= 08:30
      expect(result.dataStatus.nextTierAt).toBe(10);
    });

    it('12 records: day_aware tier, uses day-of-week when pattern available', async () => {
      const records = generateWeekdayRecords(12, 8, 10);
      commuteRepo.findByUserIdAndType.mockResolvedValue(records);

      // Simulate that EnhancedPatternAnalysis previously ran and stored a pattern
      const dayValue: DayOfWeekDepartureValue = {
        segments: [
          { dayOfWeek: 1, avgMinutes: 500, stdDevMinutes: 3, sampleCount: 5 },
          { dayOfWeek: 2, avgMinutes: 492, stdDevMinutes: 4, sampleCount: 3 },
          { dayOfWeek: 3, avgMinutes: 488, stdDevMinutes: 2, sampleCount: 3 },
        ],
        lastCalculated: new Date().toISOString(),
      };
      patternRepo.findByUserIdAndType.mockImplementation(async (_, type) => {
        if (type === PatternType.DAY_OF_WEEK_DEPARTURE) {
          return new UserPattern('user-1', PatternType.DAY_OF_WEEK_DEPARTURE, dayValue, {
            sampleCount: 12,
            confidence: 0.7,
          });
        }
        return undefined;
      });

      // Predict for a Monday
      const result = await predictionEngine.predict('user-1', {
        targetDate: new Date('2026-03-02'), // Monday
      });

      expect(result.tier).toBe('day_aware');
      expect(result.departureTime).toBeDefined();
      // The day pattern for Monday is 500 min = 08:20
      const [h, m] = result.departureTime.split(':').map(Number);
      const minutes = h * 60 + m;
      expect(minutes).toBeGreaterThanOrEqual(495); // ~ 08:15
      expect(minutes).toBeLessThanOrEqual(505);    // ~ 08:25
    });

    it('25 records with weather: weather_aware tier, applies weather coefficients', async () => {
      const records = generateWeekdayRecords(25);
      commuteRepo.findByUserIdAndType.mockResolvedValue(records);

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
      patternRepo.findByUserIdAndType.mockImplementation(async (_, type) => {
        if (type === PatternType.WEATHER_SENSITIVITY) {
          return new UserPattern('user-1', PatternType.WEATHER_SENSITIVITY, weatherValue, {
            sampleCount: 25,
            confidence: 0.8,
          });
        }
        return undefined;
      });

      const resultClear = await predictionEngine.predict('user-1', { weather: 'clear' });
      const resultRain = await predictionEngine.predict('user-1', { weather: 'rain' });

      expect(resultRain.tier).toBe('weather_aware');

      // Rain should have a weather factor that shifts earlier
      const weatherFactor = resultRain.factors.find(f => f.type === 'weather');
      expect(weatherFactor).toBeDefined();
      expect(weatherFactor!.impact).toBeLessThan(0);

      // Rain prediction should be earlier than clear
      const clearMinutes = parseInt(resultClear.departureTime.split(':')[0]) * 60
        + parseInt(resultClear.departureTime.split(':')[1]);
      const rainMinutes = parseInt(resultRain.departureTime.split(':')[0]) * 60
        + parseInt(resultRain.departureTime.split(':')[1]);
      expect(rainMinutes).toBeLessThan(clearMinutes);
    });

    it('35 records: full tier', async () => {
      const records = generateWeekdayRecords(35, 8, 10);
      commuteRepo.findByUserIdAndType.mockResolvedValue(records);

      const result = await predictionEngine.predict('user-1');

      expect(result.tier).toBe('full');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.dataStatus.nextTierName).toBe('full');
    });
  });

  describe('Analysis → Prediction pipeline', () => {
    it('analyze then predict: day-of-week analysis feeds prediction', async () => {
      // Generate 12 records with varying day-of-week patterns
      const records: CommuteRecord[] = [];
      let date = new Date('2026-02-02'); // Monday
      for (let i = 0; i < 12; i++) {
        while (date.getDay() === 0 || date.getDay() === 6) {
          date = new Date(date.getTime() + 86400000);
        }
        // Monday = earlier, Friday = later
        const dayOfWeek = date.getDay();
        const minute = dayOfWeek === 1 ? 5 : dayOfWeek === 5 ? 25 : 15;
        records.push(createRecord(8, minute, new Date(date)));
        date = new Date(date.getTime() + 86400000);
      }

      commuteRepo.findByUserIdAndType.mockResolvedValue(records);

      // Step 1: Run analysis
      const analysisResult = await analysisService.analyzeDayOfWeekPattern('user-1');
      expect(analysisResult).not.toBeNull();

      // Step 2: Make the saved pattern available for prediction
      const savedPattern = patternRepo.save.mock.calls[0]?.[0];
      if (savedPattern) {
        patternRepo.findByUserIdAndType.mockImplementation(async (_, type) => {
          if (type === PatternType.DAY_OF_WEEK_DEPARTURE) {
            return savedPattern;
          }
          return undefined;
        });
      }

      // Step 3: Predict
      const prediction = await predictionEngine.predict('user-1', {
        targetDate: new Date('2026-03-02'), // Monday
      });

      expect(prediction.tier).toBe('day_aware');
      expect(prediction.departureTime).toBeDefined();
    });

    it('analyze then predict: weather analysis feeds prediction', async () => {
      // Generate 25 records with weather variety
      const dates: Date[] = [];
      let d = new Date('2026-01-05');
      while (dates.length < 25) {
        if (d.getDay() >= 1 && d.getDay() <= 5) dates.push(new Date(d));
        d = new Date(d.getTime() + 86400000);
      }

      const records: CommuteRecord[] = [];
      for (let i = 0; i < 15; i++) records.push(createRecord(8, 15, dates[i], 'clear'));
      for (let i = 15; i < 20; i++) records.push(createRecord(8, 5, dates[i], 'rain'));
      for (let i = 20; i < 25; i++) records.push(createRecord(7, 55, dates[i], 'snow'));

      commuteRepo.findByUserIdAndType.mockResolvedValue(records);

      // Step 1: Run weather analysis
      const weatherResult = await analysisService.analyzeWeatherSensitivity('user-1');
      expect(weatherResult).not.toBeNull();
      expect(weatherResult!.rainCoefficient).toBeLessThan(0);
      expect(weatherResult!.snowCoefficient).toBeLessThan(weatherResult!.rainCoefficient);

      // Step 2: Make saved pattern available
      const savedPattern = patternRepo.save.mock.calls[0]?.[0];
      if (savedPattern) {
        patternRepo.findByUserIdAndType.mockImplementation(async (_, type) => {
          if (type === PatternType.WEATHER_SENSITIVITY) return savedPattern;
          return undefined;
        });
      }

      // Step 3: Predict with rain
      const prediction = await predictionEngine.predict('user-1', { weather: 'rain' });

      expect(prediction.tier).toBe('weather_aware');
      const weatherFactor = prediction.factors.find(f => f.type === 'weather');
      expect(weatherFactor).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('transit delay combined with weather', async () => {
      commuteRepo.findByUserIdAndType.mockResolvedValue([]);

      const result = await predictionEngine.predict('user-1', {
        weather: 'snow',
        transitDelayMinutes: 10,
      });

      // Both weather and transit delay should have factors
      const weatherFactor = result.factors.find(f => f.type === 'weather');
      const transitFactor = result.factors.find(f => f.type === 'transit_delay');
      expect(weatherFactor).toBeDefined();
      expect(transitFactor).toBeDefined();
    });

    it('prediction output always has required fields', async () => {
      commuteRepo.findByUserIdAndType.mockResolvedValue([]);

      const result = await predictionEngine.predict('user-1');

      // All required fields present
      expect(result.departureTime).toMatch(/^\d{2}:\d{2}$/);
      expect(result.departureRange.early).toMatch(/^\d{2}:\d{2}$/);
      expect(result.departureRange.late).toMatch(/^\d{2}:\d{2}$/);
      expect(typeof result.confidence).toBe('number');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.tier).toBeDefined();
      expect(Array.isArray(result.factors)).toBe(true);
      expect(result.factors.length).toBeGreaterThanOrEqual(1);
      expect(typeof result.dataStatus.totalRecords).toBe('number');
    });

    it('insights with no data returns null for optional fields', async () => {
      commuteRepo.findByUserIdAndType.mockResolvedValue([]);

      const insights = await predictionEngine.getInsights('user-1');

      expect(insights.dayOfWeek).toBeNull();
      expect(insights.weatherImpact).toBeNull();
      expect(insights.overallStats.currentTier).toBe('cold_start');
      expect(insights.overallStats.totalRecords).toBe(0);
    });
  });

  describe('BE-11: Performance', () => {
    it('prediction with 100 records completes under 100ms', async () => {
      const records = generateWeekdayRecords(100, 8, 10);
      commuteRepo.findByUserIdAndType.mockResolvedValue(records);

      const start = performance.now();
      const result = await predictionEngine.predict('user-1', {
        weather: 'rain',
        transitDelayMinutes: 8,
        targetDate: new Date('2026-03-02'),
      });
      const duration = performance.now() - start;

      expect(result.tier).toBe('full');
      expect(duration).toBeLessThan(100); // < 100ms
    });

    it('full analysis with 100 records completes under 200ms', async () => {
      const records = generateWeekdayRecords(100, 8, 10);
      commuteRepo.findByUserIdAndType.mockResolvedValue(records);

      const start = performance.now();
      await analysisService.runFullAnalysis('user-1');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(200); // < 200ms
    });

    it('feature extraction for 100 records is O(n)', async () => {
      const records = generateWeekdayRecords(100, 8, 10);

      const start = performance.now();
      const rows = featureService.transformRecordsToFeatureRows(records);
      const duration = performance.now() - start;

      expect(rows.length).toBe(100);
      expect(duration).toBeLessThan(50); // Should be very fast
    });

    it('repository calls are minimal (no N+1)', async () => {
      const records = generateWeekdayRecords(30);
      commuteRepo.findByUserIdAndType.mockResolvedValue(records);

      await predictionEngine.predict('user-1', {
        weather: 'rain',
        targetDate: new Date('2026-03-02'),
      });

      // Prediction should make at most 3 repo calls:
      // 1. findByUserIdAndType (commute records)
      // 2. findByUserIdAndType (day-of-week pattern) — tier >= day_aware
      // 3. findByUserIdAndType (weather pattern) — tier >= weather_aware
      expect(commuteRepo.findByUserIdAndType).toHaveBeenCalledTimes(1);
      expect(patternRepo.findByUserIdAndType).toHaveBeenCalledTimes(2); // day + weather
    });
  });
});
