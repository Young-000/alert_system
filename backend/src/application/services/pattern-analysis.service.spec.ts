import { PatternAnalysisService } from './pattern-analysis.service';
import { CommuteRecord, CommuteType } from '@domain/entities/commute-record.entity';
import { PatternType, CONFIDENCE_LEVELS, DEFAULT_PATTERNS, UserPattern } from '@domain/entities/user-pattern.entity';
import { IUserPatternRepository } from '@domain/repositories/user-pattern.repository';
import { ICommuteRecordRepository } from '@domain/repositories/commute-record.repository';

describe('PatternAnalysisService', () => {
  let service: PatternAnalysisService;
  let mockPatternRepo: jest.Mocked<IUserPatternRepository>;
  let mockCommuteRepo: jest.Mocked<ICommuteRecordRepository>;

  const createRecord = (
    hour: number,
    minute: number,
    dayOffset: number,
    isWeekday = true,
  ): CommuteRecord => {
    // dayOffset 0 = next Monday, -1 = previous day, etc.
    const date = new Date('2026-02-16T00:00:00'); // Monday
    date.setDate(date.getDate() + dayOffset);
    if (!isWeekday) {
      // Set to Saturday
      date.setDate(date.getDate() + (6 - date.getDay()));
    }

    const departure = new Date(date);
    departure.setHours(hour, minute, 0, 0);

    return new CommuteRecord('user-1', date, CommuteType.MORNING, {
      id: `record-${dayOffset}`,
      actualDeparture: departure,
    });
  };

  beforeEach(() => {
    mockPatternRepo = {
      findByUserIdTypeAndDay: jest.fn(),
      save: jest.fn(),
      findByUserId: jest.fn(),
      deleteByUserId: jest.fn(),
    } as unknown as jest.Mocked<IUserPatternRepository>;

    mockCommuteRepo = {
      findByUserIdAndType: jest.fn(),
      findByUserId: jest.fn(),
      save: jest.fn(),
      deleteOlderThan: jest.fn(),
      deleteByUserId: jest.fn(),
    } as unknown as jest.Mocked<ICommuteRecordRepository>;

    service = new PatternAnalysisService(mockPatternRepo, mockCommuteRepo);
  });

  describe('analyzeDeparturePattern', () => {
    it('데이터가 5개 미만이면 기본값(cold start)을 반환한다', async () => {
      mockCommuteRepo.findByUserIdAndType.mockResolvedValue([
        createRecord(8, 0, 0),
        createRecord(8, 10, -1),
      ]);

      const result = await service.analyzeDeparturePattern('user-1', CommuteType.MORNING, true);

      expect(result.confidence).toBe(CONFIDENCE_LEVELS.COLD_START);
      expect(result.averageTime).toBe(DEFAULT_PATTERNS.departureTime.morning.weekday);
      expect(result.stdDevMinutes).toBe(15);
      expect(result.sampleCount).toBeLessThan(5);
    });

    it('충분한 데이터가 있으면 가중 평균을 계산한다', async () => {
      // 5 weekday records around 8:00-8:20
      // Use offsets that land on weekdays (Mon Feb 16, then previous Mon-Fri)
      const records = [
        createRecord(8, 0, 0),     // Mon Feb 16
        createRecord(8, 10, -7),   // Mon Feb 9
        createRecord(8, 5, -8),    // Sun... need to be careful
        createRecord(8, 15, -9),
        createRecord(8, 20, -10),
      ];
      // Instead, mock the repo to return records that will pass the weekday filter
      // The filter checks r.commuteDate.getDay() is 1-5
      const weekdayRecords: CommuteRecord[] = [];
      for (let i = 0; i < 5; i++) {
        // Create dates that are always weekdays (Mon-Fri of the same week)
        const date = new Date('2026-02-16T00:00:00'); // Monday
        date.setDate(date.getDate() + i); // Mon, Tue, Wed, Thu, Fri
        const departure = new Date(date);
        departure.setHours(8, i * 5, 0, 0); // 08:00, 08:05, 08:10, 08:15, 08:20
        weekdayRecords.push(new CommuteRecord('user-1', date, CommuteType.MORNING, {
          id: `rec-${i}`,
          actualDeparture: departure,
        }));
      }
      mockCommuteRepo.findByUserIdAndType.mockResolvedValue(weekdayRecords);

      const result = await service.analyzeDeparturePattern('user-1', CommuteType.MORNING, true);

      expect(result.confidence).toBe(CONFIDENCE_LEVELS.LEARNING);
      expect(result.sampleCount).toBe(5);
      // Average should be around 08:08 (weighted toward earlier entries)
      const avgMinutes = parseInt(result.averageTime.split(':')[0]) * 60 +
        parseInt(result.averageTime.split(':')[1]);
      expect(avgMinutes).toBeGreaterThanOrEqual(480); // 08:00
      expect(avgMinutes).toBeLessThanOrEqual(500);    // 08:20
    });

    it('주말 데이터가 5개 미만이면 주말 기본값을 반환한다', async () => {
      mockCommuteRepo.findByUserIdAndType.mockResolvedValue([]);

      const result = await service.analyzeDeparturePattern('user-1', CommuteType.MORNING, false);

      expect(result.averageTime).toBe(DEFAULT_PATTERNS.departureTime.morning.weekend);
      expect(result.confidence).toBe(CONFIDENCE_LEVELS.COLD_START);
    });

    it('저녁 통근의 기본값을 반환한다', async () => {
      mockCommuteRepo.findByUserIdAndType.mockResolvedValue([]);

      const result = await service.analyzeDeparturePattern('user-1', CommuteType.EVENING, true);

      expect(result.averageTime).toBe(DEFAULT_PATTERNS.departureTime.evening.weekday);
    });

    it('commuteRepository가 없으면 빈 레코드로 기본값을 반환한다', async () => {
      const serviceWithoutRepo = new PatternAnalysisService(mockPatternRepo, undefined);

      const result = await serviceWithoutRepo.analyzeDeparturePattern(
        'user-1', CommuteType.MORNING, true,
      );

      expect(result.confidence).toBe(CONFIDENCE_LEVELS.COLD_START);
      expect(result.sampleCount).toBe(0);
    });
  });

  describe('updatePatternFromRecord', () => {
    it('기존 패턴이 있으면 업데이트한다', async () => {
      const existingPattern = new UserPattern('user-1', PatternType.DEPARTURE_TIME, {
        averageTime: '08:00',
        stdDevMinutes: 10,
        earliestTime: '07:40',
        latestTime: '08:20',
      }, { sampleCount: 5 });

      mockPatternRepo.findByUserIdTypeAndDay.mockResolvedValue(existingPattern);
      mockCommuteRepo.findByUserIdAndType.mockResolvedValue([
        createRecord(8, 0, 0),
        createRecord(8, 10, -1),
        createRecord(8, 5, -2),
        createRecord(8, 15, -3),
        createRecord(8, 20, -4),
      ]);

      const record = createRecord(8, 10, 0);
      await service.updatePatternFromRecord(record);

      expect(mockPatternRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          patternType: PatternType.DEPARTURE_TIME,
        }),
      );
    });

    it('기존 패턴이 없으면 새로 생성한다', async () => {
      mockPatternRepo.findByUserIdTypeAndDay.mockResolvedValue(undefined);
      mockCommuteRepo.findByUserIdAndType.mockResolvedValue([
        createRecord(8, 0, 0),
      ]);

      const record = createRecord(8, 10, 0);
      await service.updatePatternFromRecord(record);

      expect(mockPatternRepo.save).toHaveBeenCalled();
    });

    it('actualDeparture가 없는 레코드는 무시한다', async () => {
      const record = new CommuteRecord('user-1', new Date(), CommuteType.MORNING, {
        id: 'rec-1',
      });

      await service.updatePatternFromRecord(record);

      expect(mockPatternRepo.save).not.toHaveBeenCalled();
    });

    it('patternRepository가 없으면 아무것도 하지 않는다', async () => {
      const serviceWithoutRepo = new PatternAnalysisService(undefined, mockCommuteRepo);

      const record = createRecord(8, 0, 0);
      await serviceWithoutRepo.updatePatternFromRecord(record);

      // No error thrown
    });
  });

  describe('getOrCreatePattern', () => {
    it('기존 패턴이 있으면 반환한다', async () => {
      const existingPattern = new UserPattern('user-1', PatternType.DEPARTURE_TIME, {
        averageTime: '08:00',
        stdDevMinutes: 10,
        earliestTime: '07:40',
        latestTime: '08:20',
      });
      mockPatternRepo.findByUserIdTypeAndDay.mockResolvedValue(existingPattern);

      const result = await service.getOrCreatePattern('user-1', PatternType.DEPARTURE_TIME, true);

      expect(result).toBe(existingPattern);
    });

    it('패턴이 없으면 기본 패턴을 생성한다', async () => {
      mockPatternRepo.findByUserIdTypeAndDay.mockResolvedValue(undefined);

      const result = await service.getOrCreatePattern('user-1', PatternType.DEPARTURE_TIME, true);

      expect(result.userId).toBe('user-1');
      expect(result.patternType).toBe(PatternType.DEPARTURE_TIME);
      expect(result.confidence).toBe(CONFIDENCE_LEVELS.COLD_START);
    });

    it('patternRepository가 없으면 기본 패턴을 반환한다', async () => {
      const serviceWithoutRepo = new PatternAnalysisService(undefined, mockCommuteRepo);

      const result = await serviceWithoutRepo.getOrCreatePattern(
        'user-1', PatternType.DEPARTURE_TIME, true,
      );

      expect(result.userId).toBe('user-1');
      expect(result.confidence).toBe(CONFIDENCE_LEVELS.COLD_START);
    });

    it('NOTIFICATION_LEAD_TIME 패턴 타입의 기본값을 생성한다', async () => {
      mockPatternRepo.findByUserIdTypeAndDay.mockResolvedValue(undefined);

      const result = await service.getOrCreatePattern(
        'user-1', PatternType.NOTIFICATION_LEAD_TIME, true,
      );

      expect(result.patternType).toBe(PatternType.NOTIFICATION_LEAD_TIME);
      const value = result.value as { optimalMinutes: number };
      expect(value.optimalMinutes).toBe(DEFAULT_PATTERNS.notificationLeadTime);
    });
  });
});
