import { FeatureEngineeringService } from './feature-engineering.service';
import { CommuteRecord, CommuteType } from '@domain/entities/commute-record.entity';
import { CommuteSession, SessionStatus } from '@domain/entities/commute-session.entity';

describe('FeatureEngineeringService', () => {
  let service: FeatureEngineeringService;

  beforeEach(() => {
    service = new FeatureEngineeringService();
  });

  const createRecord = (
    hour: number,
    minute: number,
    date: Date,
    weather?: string,
  ): CommuteRecord => {
    const departure = new Date(date);
    departure.setHours(hour, minute, 0, 0);
    return new CommuteRecord('user-1', date, CommuteType.MORNING, {
      id: `rec-${Date.now()}-${Math.random()}`,
      actualDeparture: departure,
      weatherCondition: weather,
    });
  };

  describe('extractDayFeatures', () => {
    it('월요일의 특성을 추출한다', () => {
      const monday = new Date('2026-03-02'); // Monday
      const features = service.extractDayFeatures(monday);

      expect(features.dayOfWeek).toBe(1);
      expect(features.isWeekday).toBe(true);
      expect(features.isMonday).toBe(true);
      expect(features.isFriday).toBe(false);
    });

    it('금요일의 특성을 추출한다', () => {
      const friday = new Date('2026-03-06'); // Friday
      const features = service.extractDayFeatures(friday);

      expect(features.dayOfWeek).toBe(5);
      expect(features.isWeekday).toBe(true);
      expect(features.isMonday).toBe(false);
      expect(features.isFriday).toBe(true);
    });

    it('일요일은 주말이다', () => {
      const sunday = new Date('2026-03-01'); // Sunday
      const features = service.extractDayFeatures(sunday);

      expect(features.dayOfWeek).toBe(0);
      expect(features.isWeekday).toBe(false);
    });
  });

  describe('extractWeatherFeatures', () => {
    it('비 조건을 감지한다', () => {
      expect(service.extractWeatherFeatures('rain').isRaining).toBe(true);
      expect(service.extractWeatherFeatures('비').isRaining).toBe(true);
      expect(service.extractWeatherFeatures('heavy rain').isRaining).toBe(true);
    });

    it('눈 조건을 감지한다', () => {
      expect(service.extractWeatherFeatures('snow').isSnowing).toBe(true);
      expect(service.extractWeatherFeatures('눈').isSnowing).toBe(true);
    });

    it('맑은 날씨를 감지한다', () => {
      const features = service.extractWeatherFeatures('clear');
      expect(features.isRaining).toBe(false);
      expect(features.isSnowing).toBe(false);
    });

    it('온도 편차를 계산한다 (기준: 15도)', () => {
      expect(service.extractWeatherFeatures('clear', 25).temperatureDeviation).toBe(10);
      expect(service.extractWeatherFeatures('clear', 5).temperatureDeviation).toBe(-10);
      expect(service.extractWeatherFeatures('clear', 15).temperatureDeviation).toBe(0);
    });

    it('온도 미제공 시 편차 0', () => {
      expect(service.extractWeatherFeatures('clear').temperatureDeviation).toBe(0);
    });

    it('날씨 조건 미제공 시 기본값', () => {
      const features = service.extractWeatherFeatures(undefined);
      expect(features.isRaining).toBe(false);
      expect(features.isSnowing).toBe(false);
    });
  });

  describe('extractSessionFeatures', () => {
    it('세션 특성을 추출한다', () => {
      const session = new CommuteSession('user-1', 'route-1', {
        id: 's-1',
        totalDurationMinutes: 45,
        totalWaitMinutes: 10,
        totalDelayMinutes: 5,
        status: SessionStatus.COMPLETED,
        checkpointRecords: [],
      });

      const features = service.extractSessionFeatures(session);

      expect(features.totalDurationMinutes).toBe(45);
      expect(features.totalWaitMinutes).toBe(10);
      expect(features.totalDelayMinutes).toBe(5);
      expect(features.segmentCount).toBe(0);
    });

    it('미완료 세션은 totalDurationMinutes가 0이다', () => {
      const session = new CommuteSession('user-1', 'route-1', {
        status: SessionStatus.IN_PROGRESS,
      });

      const features = service.extractSessionFeatures(session);
      expect(features.totalDurationMinutes).toBe(0);
    });
  });

  describe('transformRecordsToFeatureRows', () => {
    it('레코드를 특성 행으로 변환한다', () => {
      const monday = new Date('2026-03-02');
      const records = [
        createRecord(8, 10, monday, 'rain'),
        createRecord(8, 20, monday, 'clear'),
      ];

      const rows = service.transformRecordsToFeatureRows(records);

      expect(rows).toHaveLength(2);
      expect(rows[0].departureMinutes).toBe(490); // 8*60 + 10
      expect(rows[0].isRaining).toBe(1);
      expect(rows[0].dayOfWeek).toBe(1);
      expect(rows[1].isRaining).toBe(0);
    });

    it('actualDeparture 없는 레코드를 필터링한다', () => {
      const records = [
        new CommuteRecord('user-1', new Date(), CommuteType.MORNING, { id: 'no-dep' }),
        createRecord(8, 0, new Date('2026-03-02')),
      ];

      const rows = service.transformRecordsToFeatureRows(records);
      expect(rows).toHaveLength(1);
    });

    it('빈 배열이면 빈 결과를 반환한다', () => {
      expect(service.transformRecordsToFeatureRows([])).toEqual([]);
    });
  });

  describe('groupByDayOfWeek', () => {
    it('요일별로 그룹핑한다', () => {
      const monday = new Date('2026-03-02'); // Monday
      const tuesday = new Date('2026-03-03'); // Tuesday
      const records = [
        createRecord(8, 0, monday),
        createRecord(8, 10, monday),
        createRecord(8, 5, tuesday),
      ];

      const rows = service.transformRecordsToFeatureRows(records);
      const groups = service.groupByDayOfWeek(rows);

      expect(groups.get(1)?.length).toBe(2); // Monday
      expect(groups.get(2)?.length).toBe(1); // Tuesday
    });
  });

  describe('buildWeatherRegressionData', () => {
    it('회귀 데이터를 구성한다', () => {
      const monday = new Date('2026-03-02');
      const records = [
        createRecord(8, 0, monday, 'clear'),
        createRecord(7, 50, monday, 'rain'),
      ];

      const rows = service.transformRecordsToFeatureRows(records);
      const overallMean = 485; // 약 08:05

      const { X, Y } = service.buildWeatherRegressionData(rows, overallMean);

      expect(X).toHaveLength(2);
      expect(Y).toHaveLength(2);
      // clear: [0, 0, 0]
      expect(X[0]).toEqual([0, 0, 0]);
      // rain: [1, 0, 0]
      expect(X[1]).toEqual([1, 0, 0]);
      // Y = departureMinutes - overallMean
      expect(Y[0]).toBe(480 - 485); // -5
      expect(Y[1]).toBe(470 - 485); // -15
    });
  });

  describe('countWeatherVariety', () => {
    it('다양한 날씨 조건을 카운트한다', () => {
      const monday = new Date('2026-03-02');
      const records = [
        createRecord(8, 0, monday, 'clear'),
        createRecord(8, 0, monday, 'clear'),
        createRecord(8, 0, monday, 'rain'),
        createRecord(8, 0, monday, 'snow'),
      ];

      const rows = service.transformRecordsToFeatureRows(records);
      const variety = service.countWeatherVariety(rows);

      expect(variety.clearCount).toBe(2);
      expect(variety.rainCount).toBe(1);
      expect(variety.snowCount).toBe(1);
      expect(variety.totalDistinctConditions).toBe(3);
    });

    it('한 종류만 있으면 distinctConditions는 1이다', () => {
      const monday = new Date('2026-03-02');
      const records = [
        createRecord(8, 0, monday, 'clear'),
        createRecord(8, 5, monday, 'clear'),
      ];

      const rows = service.transformRecordsToFeatureRows(records);
      const variety = service.countWeatherVariety(rows);

      expect(variety.totalDistinctConditions).toBe(1);
    });
  });
});
