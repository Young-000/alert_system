import { SmartMessageBuilder } from './smart-message-builder.service';
import { NotificationContext } from '@domain/entities/notification-context.entity';
import { Recommendation } from '@domain/entities/recommendation.entity';
import { RuleCategory, RulePriority } from '@domain/entities/notification-rule.entity';
import { Weather } from '@domain/entities/weather.entity';
import { AirQuality } from '@domain/entities/air-quality.entity';

describe('SmartMessageBuilder', () => {
  let builder: SmartMessageBuilder;

  const createContext = (overrides?: Partial<NotificationContext>): NotificationContext => ({
    userId: 'user-1',
    alertId: 'alert-1',
    timestamp: new Date('2026-02-18T08:00:00Z'),
    ...overrides,
  });

  const createRecommendation = (overrides?: Partial<Recommendation>): Recommendation => ({
    ruleId: 'rule-1',
    ruleName: '테스트',
    category: RuleCategory.WEATHER,
    priority: overrides?.priority ?? RulePriority.HIGH,
    message: overrides?.message ?? '우산을 챙기세요!',
    icon: '🌧️',
  });

  beforeEach(() => {
    builder = new SmartMessageBuilder();
  });

  describe('build', () => {
    it('날씨 정보를 포함한 메시지를 생성한다', () => {
      const context = createContext({
        weather: new Weather('서울', 5, 'Clear', 40, 3.5),
      });

      const result = builder.build(context, []);

      expect(result).toContain('맑음');
      expect(result).toContain('5°C');
    });

    it('미세먼지 정보를 포함한 메시지를 생성한다', () => {
      const context = createContext({
        airQuality: new AirQuality('서울', 45, 22, 65, 'moderate'),
      });

      const result = builder.build(context, []);

      expect(result).toContain('미세먼지');
      expect(result).toContain('보통');
    });

    it('날씨와 미세먼지를 함께 표시한다', () => {
      const context = createContext({
        weather: new Weather('서울', 5, 'Clear', 40, 3.5),
        airQuality: new AirQuality('서울', 45, 22, 65, 'good'),
      });

      const result = builder.build(context, []);

      expect(result).toContain('맑음');
      expect(result).toContain('미세먼지');
      expect(result).toContain('좋음');
    });

    it('지하철 도착 정보를 포함한다', () => {
      const context = createContext({
        subwayArrivals: [
          { stationId: 'st1', lineId: '2', direction: '상행', arrivalTime: 3, destination: '강남' },
        ],
        subwayStationName: '역삼역',
      });

      const result = builder.build(context, []);

      expect(result).toContain('역삼역');
      expect(result).toContain('3분 후');
      expect(result).toContain('강남');
    });

    it('버스 도착 정보를 포함한다', () => {
      const context = createContext({
        busArrivals: [
          { stopId: 's1', routeId: 'r1', routeName: '146', arrivalTime: 5, remainingStops: 3 },
        ],
        busStopName: '강남역 정류장',
      });

      const result = builder.build(context, []);

      expect(result).toContain('146');
      expect(result).toContain('5분 후');
      expect(result).toContain('강남역 정류장');
    });

    it('버스와 지하철 비교 메시지를 포함한다 (버스가 빠를 때)', () => {
      const context = createContext({
        busArrivals: [
          { stopId: 's1', routeId: 'r1', routeName: '146', arrivalTime: 2, remainingStops: 3 },
        ],
        subwayArrivals: [
          { stationId: 'st1', lineId: '2', direction: '상행', arrivalTime: 8, destination: '강남' },
        ],
      });

      const result = builder.build(context, []);

      expect(result).toContain('버스');
      expect(result).toContain('6분 빨라요');
    });

    it('도착 시간이 비슷하면(차이 2분 이내) 비교 메시지를 넣지 않는다', () => {
      const context = createContext({
        busArrivals: [
          { stopId: 's1', routeId: 'r1', routeName: '146', arrivalTime: 4, remainingStops: 3 },
        ],
        subwayArrivals: [
          { stationId: 'st1', lineId: '2', direction: '상행', arrivalTime: 5, destination: '강남' },
        ],
      });

      const result = builder.build(context, []);

      expect(result).not.toContain('빨라요');
    });

    it('높은 우선순위 추천을 최대 2개까지 포함한다', () => {
      const context = createContext({
        weather: new Weather('서울', 5, 'Clear', 40, 3.5),
      });
      const recommendations = [
        createRecommendation({ priority: RulePriority.HIGH, message: '우산을 챙기세요!' }),
        createRecommendation({ priority: RulePriority.HIGH, message: '마스크를 착용하세요!' }),
        createRecommendation({ priority: RulePriority.HIGH, message: '따뜻하게 입으세요!' }),
      ];

      const result = builder.build(context, recommendations);

      expect(result).toContain('우산을 챙기세요!');
      expect(result).toContain('마스크를 착용하세요!');
      expect(result).not.toContain('따뜻하게 입으세요!');
    });

    it('중간/낮은 우선순위 추천은 포함하지 않는다', () => {
      const context = createContext({
        weather: new Weather('서울', 5, 'Clear', 40, 3.5),
      });
      const recommendations = [
        createRecommendation({ priority: RulePriority.MEDIUM, message: '산책하기 좋은 날씨' }),
        createRecommendation({ priority: RulePriority.LOW, message: '참고 정보' }),
      ];

      const result = builder.build(context, recommendations);

      expect(result).not.toContain('산책하기 좋은 날씨');
      expect(result).not.toContain('참고 정보');
    });

    it('데이터가 없으면 기본 메시지를 반환한다', () => {
      const context = createContext();

      const result = builder.build(context, []);

      expect(result).toBe('오늘도 좋은 하루 되세요!');
    });
  });

  describe('buildTitle', () => {
    it('오전(5-12시)에는 출근 알림을 반환한다', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-02-18T08:00:00'));

      const result = builder.buildTitle(createContext());

      expect(result).toContain('출근');

      jest.useRealTimers();
    });

    it('오후(12-18시)에는 오후 알림을 반환한다', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-02-18T14:00:00'));

      const result = builder.buildTitle(createContext());

      expect(result).toContain('오후');

      jest.useRealTimers();
    });

    it('저녁(18시 이후)에는 퇴근 알림을 반환한다', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-02-18T19:00:00'));

      const result = builder.buildTitle(createContext());

      expect(result).toContain('퇴근');

      jest.useRealTimers();
    });
  });

  describe('날씨 조건 번역', () => {
    it('영문 날씨를 한글로 번역한다', () => {
      const testCases = [
        { input: 'Rain', expected: '비' },
        { input: 'Snow', expected: '눈' },
        { input: 'Clouds', expected: '흐림' },
        { input: 'Thunderstorm', expected: '뇌우' },
        { input: 'Mist', expected: '안개' },
      ];

      for (const { input, expected } of testCases) {
        const context = createContext({
          weather: new Weather('서울', 5, input, 40, 3.5),
        });

        const result = builder.build(context, []);

        expect(result).toContain(expected);
      }
    });

    it('알 수 없는 날씨 조건은 원본을 사용한다', () => {
      const context = createContext({
        weather: new Weather('서울', 5, 'Tornado', 40, 3.5),
      });

      const result = builder.build(context, []);

      expect(result).toContain('Tornado');
    });
  });

  describe('미세먼지 상태 이모지', () => {
    it('좋음 상태에 적절한 이모지를 표시한다', () => {
      const context = createContext({
        airQuality: new AirQuality('서울', 20, 10, 30, 'good'),
      });

      const result = builder.build(context, []);

      expect(result).toContain('좋음');
    });

    it('나쁨 상태에 적절한 이모지를 표시한다', () => {
      const context = createContext({
        airQuality: new AirQuality('서울', 120, 60, 150, 'unhealthy'),
      });

      const result = builder.build(context, []);

      expect(result).toContain('나쁨');
    });
  });
});
