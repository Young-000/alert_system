import { RuleEngine } from './rule-engine.service';
import { WeatherConditionEvaluator } from './evaluators/weather-evaluator';
import { AirQualityConditionEvaluator } from './evaluators/air-quality-evaluator';
import { TransitConditionEvaluator } from './evaluators/transit-evaluator';
import { NotificationContext } from '@domain/entities/notification-context.entity';
import { NotificationRule, RuleCategory, RulePriority } from '@domain/entities/notification-rule.entity';
import {
  DataSource,
  ComparisonOperator,
  LogicalOperator,
  RuleCondition,
} from '@domain/entities/rule-condition.entity';
import { Weather } from '@domain/entities/weather.entity';
import { AirQuality } from '@domain/entities/air-quality.entity';

describe('RuleEngine', () => {
  let ruleEngine: RuleEngine;

  const createContext = (overrides?: Partial<NotificationContext>): NotificationContext => ({
    userId: 'user-1',
    alertId: 'alert-1',
    timestamp: new Date('2026-02-18T08:00:00Z'),
    weather: new Weather('서울', 5, 'Clear', 40, 3.5),
    airQuality: new AirQuality('서울', 45, 22, 65, 'moderate'),
    busArrivals: [
      { stopId: 'stop-1', routeId: 'r1', routeName: '146', arrivalTime: 3, remainingStops: 5 },
    ],
    subwayArrivals: [
      { stationId: 'st-1', lineId: '2', direction: '상행', arrivalTime: 5, destination: '강남' },
    ],
    ...overrides,
  });

  const createRule = (
    conditions: RuleCondition[],
    overrides?: Partial<{
      category: RuleCategory;
      priority: RulePriority;
      enabled: boolean;
      messageTemplate: string;
    }>,
  ): NotificationRule => {
    return new NotificationRule(
      '테스트 규칙',
      overrides?.category || RuleCategory.WEATHER,
      overrides?.priority || RulePriority.MEDIUM,
      conditions,
      overrides?.messageTemplate || '날씨: {{weather.temperature}}도',
      { enabled: overrides?.enabled ?? true },
    );
  };

  beforeEach(() => {
    ruleEngine = new RuleEngine(
      new WeatherConditionEvaluator(),
      new AirQualityConditionEvaluator(),
      new TransitConditionEvaluator(),
    );
  });

  describe('evaluate', () => {
    it('조건에 맞는 규칙의 추천을 반환한다', () => {
      const rule = createRule([
        {
          dataSource: DataSource.WEATHER,
          field: 'temperature',
          operator: ComparisonOperator.LESS_THAN,
          value: 10,
        },
      ]);

      const context = createContext();
      const results = ruleEngine.evaluate(context, [rule]);

      expect(results).toHaveLength(1);
      expect(results[0].message).toContain('5');
    });

    it('조건에 맞지 않으면 빈 배열을 반환한다', () => {
      const rule = createRule([
        {
          dataSource: DataSource.WEATHER,
          field: 'temperature',
          operator: ComparisonOperator.GREATER_THAN,
          value: 30,
        },
      ]);

      const results = ruleEngine.evaluate(createContext(), [rule]);

      expect(results).toHaveLength(0);
    });

    it('비활성화된 규칙은 평가하지 않는다', () => {
      const rule = createRule(
        [
          {
            dataSource: DataSource.WEATHER,
            field: 'temperature',
            operator: ComparisonOperator.LESS_THAN,
            value: 100,
          },
        ],
        { enabled: false },
      );

      const results = ruleEngine.evaluate(createContext(), [rule]);

      expect(results).toHaveLength(0);
    });

    it('우선순위 내림차순으로 정렬한다', () => {
      const lowRule = createRule(
        [
          {
            dataSource: DataSource.WEATHER,
            field: 'temperature',
            operator: ComparisonOperator.LESS_THAN,
            value: 100,
          },
        ],
        { priority: RulePriority.LOW },
      );
      const highRule = createRule(
        [
          {
            dataSource: DataSource.WEATHER,
            field: 'temperature',
            operator: ComparisonOperator.LESS_THAN,
            value: 100,
          },
        ],
        { priority: RulePriority.CRITICAL },
      );

      const results = ruleEngine.evaluate(createContext(), [lowRule, highRule]);

      expect(results).toHaveLength(2);
      expect(results[0].priority).toBe(RulePriority.CRITICAL);
      expect(results[1].priority).toBe(RulePriority.LOW);
    });

    it('빈 규칙 배열이면 빈 결과를 반환한다', () => {
      const results = ruleEngine.evaluate(createContext(), []);

      expect(results).toHaveLength(0);
    });

    it('빈 조건의 규칙은 매칭하지 않는다', () => {
      const rule = createRule([]);

      const results = ruleEngine.evaluate(createContext(), [rule]);

      expect(results).toHaveLength(0);
    });
  });

  describe('조건 조합 평가', () => {
    it('AND 조건이 모두 참이면 매칭한다', () => {
      const rule = createRule([
        {
          dataSource: DataSource.WEATHER,
          field: 'temperature',
          operator: ComparisonOperator.LESS_THAN,
          value: 10,
          logicalOperator: LogicalOperator.AND,
        },
        {
          dataSource: DataSource.WEATHER,
          field: 'humidity',
          operator: ComparisonOperator.GREATER_THAN,
          value: 30,
        },
      ]);

      const results = ruleEngine.evaluate(createContext(), [rule]);

      expect(results).toHaveLength(1);
    });

    it('AND 조건 중 하나가 거짓이면 매칭하지 않는다', () => {
      const rule = createRule([
        {
          dataSource: DataSource.WEATHER,
          field: 'temperature',
          operator: ComparisonOperator.LESS_THAN,
          value: 10,
          logicalOperator: LogicalOperator.AND,
        },
        {
          dataSource: DataSource.WEATHER,
          field: 'humidity',
          operator: ComparisonOperator.GREATER_THAN,
          value: 90, // humidity is 40, so this fails
        },
      ]);

      const results = ruleEngine.evaluate(createContext(), [rule]);

      expect(results).toHaveLength(0);
    });

    it('OR 조건 중 하나가 참이면 매칭한다', () => {
      const rule = createRule([
        {
          dataSource: DataSource.WEATHER,
          field: 'temperature',
          operator: ComparisonOperator.GREATER_THAN,
          value: 100, // false
          logicalOperator: LogicalOperator.OR,
        },
        {
          dataSource: DataSource.WEATHER,
          field: 'humidity',
          operator: ComparisonOperator.GREATER_THAN,
          value: 30, // true
        },
      ]);

      const results = ruleEngine.evaluate(createContext(), [rule]);

      expect(results).toHaveLength(1);
    });
  });

  describe('메시지 템플릿 빌드', () => {
    it('날씨 변수를 치환한다', () => {
      const rule = createRule(
        [
          {
            dataSource: DataSource.WEATHER,
            field: 'temperature',
            operator: ComparisonOperator.LESS_THAN,
            value: 100,
          },
        ],
        { messageTemplate: '온도 {{weather.temperature}}도, {{weather.condition}}' },
      );

      const results = ruleEngine.evaluate(createContext(), [rule]);

      expect(results[0].message).toBe('온도 5도, Clear');
    });

    it('미세먼지 변수를 치환한다', () => {
      const rule = createRule(
        [
          {
            dataSource: DataSource.AIR_QUALITY,
            field: 'pm10',
            operator: ComparisonOperator.GREATER_THAN,
            value: 0,
          },
        ],
        {
          category: RuleCategory.AIR_QUALITY,
          messageTemplate: 'PM10: {{airQuality.pm10}}, 상태: {{airQuality.status}}',
        },
      );

      const results = ruleEngine.evaluate(createContext(), [rule]);

      expect(results[0].message).toBe('PM10: 45, 상태: moderate');
    });

    it('교통 비교 메시지를 생성한다', () => {
      const rule = createRule(
        [
          {
            dataSource: DataSource.BUS_ARRIVAL,
            field: 'arrivalTime',
            operator: ComparisonOperator.LESS_THAN,
            value: 10,
          },
        ],
        {
          category: RuleCategory.TRANSIT_COMPARISON,
          messageTemplate: '{{transit.comparison}}',
        },
      );

      const context = createContext();
      const results = ruleEngine.evaluate(context, [rule]);

      // bus 3min, subway 5min, diff=2 -> 비슷
      expect(results[0].message).toBe('버스와 지하철 도착 시간이 비슷해요');
    });

    it('버스가 지하철보다 빠르면 비교 메시지에 반영한다', () => {
      const rule = createRule(
        [
          {
            dataSource: DataSource.BUS_ARRIVAL,
            field: 'arrivalTime',
            operator: ComparisonOperator.LESS_THAN,
            value: 10,
          },
        ],
        {
          category: RuleCategory.TRANSIT_COMPARISON,
          messageTemplate: '{{transit.comparison}}',
        },
      );

      const context = createContext({
        busArrivals: [{ stopId: 's1', routeId: 'r1', routeName: '146', arrivalTime: 2, remainingStops: 5 }],
        subwayArrivals: [{ stationId: 'st1', lineId: '2', direction: '상행', arrivalTime: 8, destination: '강남' }],
      });
      const results = ruleEngine.evaluate(context, [rule]);

      expect(results[0].message).toBe('버스가 지하철보다 6분 빨라요!');
    });
  });

  describe('데이터 소스 없는 경우', () => {
    it('날씨 데이터가 없으면 날씨 조건은 false를 반환한다', () => {
      const rule = createRule([
        {
          dataSource: DataSource.WEATHER,
          field: 'temperature',
          operator: ComparisonOperator.LESS_THAN,
          value: 100,
        },
      ]);

      const context = createContext({ weather: undefined });
      const results = ruleEngine.evaluate(context, [rule]);

      expect(results).toHaveLength(0);
    });

    it('미세먼지 데이터가 없으면 미세먼지 조건은 false를 반환한다', () => {
      const rule = createRule([
        {
          dataSource: DataSource.AIR_QUALITY,
          field: 'pm10',
          operator: ComparisonOperator.GREATER_THAN,
          value: 0,
        },
      ]);

      const context = createContext({ airQuality: undefined });
      const results = ruleEngine.evaluate(context, [rule]);

      expect(results).toHaveLength(0);
    });

    it('알 수 없는 데이터 소스 필드는 false를 반환한다', () => {
      const rule = createRule([
        {
          dataSource: DataSource.WEATHER,
          field: 'unknownField',
          operator: ComparisonOperator.EQUALS,
          value: 'test',
        },
      ]);

      const results = ruleEngine.evaluate(createContext(), [rule]);

      expect(results).toHaveLength(0);
    });
  });

  describe('metadata 추출', () => {
    it('추천 결과에 metadata를 포함한다', () => {
      const rule = createRule(
        [
          {
            dataSource: DataSource.WEATHER,
            field: 'temperature',
            operator: ComparisonOperator.LESS_THAN,
            value: 100,
          },
        ],
        { category: RuleCategory.WEATHER },
      );

      const results = ruleEngine.evaluate(createContext(), [rule]);

      expect(results[0].metadata).toBeDefined();
      expect(results[0].metadata!.ruleCategory).toBe(RuleCategory.WEATHER);
      expect(results[0].metadata!.weatherData).toEqual({
        temperature: 5,
        condition: 'Clear',
      });
    });

    it('아이콘이 카테고리에 맞게 설정된다', () => {
      const weatherRule = createRule(
        [
          {
            dataSource: DataSource.WEATHER,
            field: 'temperature',
            operator: ComparisonOperator.LESS_THAN,
            value: 100,
          },
        ],
        { category: RuleCategory.WEATHER },
      );

      const results = ruleEngine.evaluate(createContext(), [weatherRule]);

      expect(results[0].icon).toBeDefined();
    });
  });
});
