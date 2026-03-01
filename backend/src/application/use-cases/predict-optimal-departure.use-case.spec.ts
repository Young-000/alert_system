import { PredictOptimalDepartureUseCase, CurrentConditions } from './predict-optimal-departure.use-case';
import { PatternType, DEFAULT_PATTERNS } from '../../domain/entities/user-pattern.entity';

describe('PredictOptimalDepartureUseCase', () => {
  let useCase: PredictOptimalDepartureUseCase;
  let mockPatternRepository: any;
  let mockAlertRepository: any;

  beforeEach(() => {
    mockPatternRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findByUserIdAndType: jest.fn(),
      findByUserIdTypeAndDay: jest.fn(),
      delete: jest.fn(),
      deleteByUserId: jest.fn(),
    };

    mockAlertRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn(),
    };
  });

  it('리포지토리가 없으면 기본 시간을 반환해야 한다', async () => {
    useCase = new PredictOptimalDepartureUseCase(null, null, null);

    const result = await useCase.execute('user-1', 'alert-1');

    expect(result.baseTime).toBeDefined();
    expect(result.recommendedTime).toBeDefined();
    expect(result.adjustments).toEqual([]);
    expect(result.confidence).toBe(0.3);

    // Should be one of the default patterns
    const validDefaults = [
      DEFAULT_PATTERNS.departureTime.morning.weekday,
      DEFAULT_PATTERNS.departureTime.morning.weekend,
      DEFAULT_PATTERNS.departureTime.evening.weekday,
    ];
    expect(validDefaults).toContain(result.baseTime);
  });

  it('신뢰도 0.5 이상인 학습된 패턴을 사용해야 한다', async () => {
    useCase = new PredictOptimalDepartureUseCase(
      mockPatternRepository,
      mockAlertRepository,
      null, // no ML engine — test legacy logic
    );

    mockPatternRepository.findByUserIdAndType.mockResolvedValue({
      userId: 'user-1',
      patternType: PatternType.DEPARTURE_TIME,
      value: { averageTime: '07:45' },
      confidence: 0.7,
      sampleCount: 15,
    });

    const result = await useCase.execute('user-1', 'alert-1');

    expect(result.baseTime).toBe('07:45');
    expect(result.confidence).toBe(0.7);
    expect(mockPatternRepository.findByUserIdAndType).toHaveBeenCalledWith(
      'user-1',
      PatternType.DEPARTURE_TIME,
    );
  });

  it('비 조건에서 출발 시간을 조정해야 한다', async () => {
    useCase = new PredictOptimalDepartureUseCase(
      mockPatternRepository,
      mockAlertRepository,
      null, // no ML engine — test legacy logic
    );

    mockPatternRepository.findByUserIdAndType.mockResolvedValue({
      userId: 'user-1',
      patternType: PatternType.DEPARTURE_TIME,
      value: { averageTime: '08:00' },
      confidence: 0.7,
      sampleCount: 15,
    });

    const conditions: CurrentConditions = {
      isRaining: true,
    };

    const result = await useCase.execute('user-1', 'alert-1', conditions);

    expect(result.baseTime).toBe('08:00');
    expect(result.recommendedTime).toBe('07:50'); // 10분 일찍
    expect(result.adjustments).toHaveLength(1);
    expect(result.adjustments[0].reason).toBe('비 예보');
    expect(result.adjustments[0].minutes).toBe(-10);
  });

  it('눈 조건에서 출발 시간을 조정해야 한다', async () => {
    useCase = new PredictOptimalDepartureUseCase(
      mockPatternRepository,
      mockAlertRepository,
      null, // no ML engine — test legacy logic
    );

    mockPatternRepository.findByUserIdAndType.mockResolvedValue({
      userId: 'user-1',
      patternType: PatternType.DEPARTURE_TIME,
      value: { averageTime: '08:00' },
      confidence: 0.7,
      sampleCount: 15,
    });

    const conditions: CurrentConditions = {
      isSnowing: true,
    };

    const result = await useCase.execute('user-1', 'alert-1', conditions);

    expect(result.baseTime).toBe('08:00');
    expect(result.recommendedTime).toBe('07:45'); // 15분 일찍
    expect(result.adjustments).toHaveLength(1);
    expect(result.adjustments[0].reason).toBe('눈 예보');
    expect(result.adjustments[0].minutes).toBe(-15);
  });

  it('5분 초과 대중교통 지연 시 출발 시간을 조정해야 한다', async () => {
    useCase = new PredictOptimalDepartureUseCase(
      mockPatternRepository,
      mockAlertRepository,
      null, // no ML engine — test legacy logic
    );

    mockPatternRepository.findByUserIdAndType.mockResolvedValue({
      userId: 'user-1',
      patternType: PatternType.DEPARTURE_TIME,
      value: { averageTime: '08:00' },
      confidence: 0.7,
      sampleCount: 15,
    });

    const conditions: CurrentConditions = {
      transitDelayMinutes: 12,
    };

    const result = await useCase.execute('user-1', 'alert-1', conditions);

    expect(result.recommendedTime).toBe('07:48'); // 12분 일찍
    expect(result.adjustments).toHaveLength(1);
    expect(result.adjustments[0].reason).toBe('대중교통 지연');
    expect(result.adjustments[0].minutes).toBe(-12);
  });

  it('극한 온도에서 출발 시간을 조정해야 한다', async () => {
    useCase = new PredictOptimalDepartureUseCase(
      mockPatternRepository,
      mockAlertRepository,
      null, // no ML engine — test legacy logic
    );

    mockPatternRepository.findByUserIdAndType.mockResolvedValue({
      userId: 'user-1',
      patternType: PatternType.DEPARTURE_TIME,
      value: { averageTime: '08:00' },
      confidence: 0.7,
      sampleCount: 15,
    });

    // 한파
    const coldConditions: CurrentConditions = {
      temperature: -15,
    };

    const coldResult = await useCase.execute('user-1', 'alert-1', coldConditions);

    expect(coldResult.recommendedTime).toBe('07:55'); // 5분 일찍
    expect(coldResult.adjustments).toHaveLength(1);
    expect(coldResult.adjustments[0].reason).toBe('한파 주의');

    // 폭염
    const hotConditions: CurrentConditions = {
      temperature: 38,
    };

    const hotResult = await useCase.execute('user-1', 'alert-1', hotConditions);

    expect(hotResult.recommendedTime).toBe('07:55'); // 5분 일찍
    expect(hotResult.adjustments).toHaveLength(1);
    expect(hotResult.adjustments[0].reason).toBe('폭염 주의');
  });

  it('5분 이하 대중교통 지연 시 조정하지 않아야 한다', async () => {
    useCase = new PredictOptimalDepartureUseCase(
      mockPatternRepository,
      mockAlertRepository,
      null, // no ML engine — test legacy logic
    );

    mockPatternRepository.findByUserIdAndType.mockResolvedValue({
      userId: 'user-1',
      patternType: PatternType.DEPARTURE_TIME,
      value: { averageTime: '08:00' },
      confidence: 0.7,
      sampleCount: 15,
    });

    const conditions: CurrentConditions = {
      transitDelayMinutes: 5,
    };

    const result = await useCase.execute('user-1', 'alert-1', conditions);

    expect(result.recommendedTime).toBe('08:00'); // 조정 없음
    expect(result.adjustments).toHaveLength(0);
  });

  it('시간을 유효 범위(00:00~23:59)로 클램핑해야 한다', async () => {
    useCase = new PredictOptimalDepartureUseCase(
      mockPatternRepository,
      mockAlertRepository,
      null, // no ML engine — test legacy logic
    );

    // 이른 아침에 큰 조정이 들어오면 00:00으로 클램핑
    mockPatternRepository.findByUserIdAndType.mockResolvedValue({
      userId: 'user-1',
      patternType: PatternType.DEPARTURE_TIME,
      value: { averageTime: '00:10' },
      confidence: 0.7,
      sampleCount: 15,
    });

    const conditions: CurrentConditions = {
      isSnowing: true,
      transitDelayMinutes: 20,
    };

    const result = await useCase.execute('user-1', 'alert-1', conditions);

    // 00:10 - 15(snow) - 20(transit) = -25분 -> 00:00으로 클램핑
    expect(result.recommendedTime).toBe('00:00');
  });

  it('알림 스케줄 시간으로 대체(fallback)해야 한다', async () => {
    useCase = new PredictOptimalDepartureUseCase(
      mockPatternRepository,
      mockAlertRepository,
      null, // no ML engine — test legacy logic
    );

    // 패턴 신뢰도가 낮음
    mockPatternRepository.findByUserIdAndType.mockResolvedValue({
      userId: 'user-1',
      patternType: PatternType.DEPARTURE_TIME,
      value: { averageTime: '07:30' },
      confidence: 0.3, // 0.5 미만
      sampleCount: 2,
    });

    // 알림에 notificationTime이 설정됨
    mockAlertRepository.findById.mockResolvedValue({
      id: 'alert-1',
      notificationTime: '08:30',
    });

    const result = await useCase.execute('user-1', 'alert-1');

    expect(result.baseTime).toBe('08:30');
  });

  it('여러 조건이 동시에 적용되어야 한다', async () => {
    useCase = new PredictOptimalDepartureUseCase(
      mockPatternRepository,
      mockAlertRepository,
      null, // no ML engine — test legacy logic
    );

    mockPatternRepository.findByUserIdAndType.mockResolvedValue({
      userId: 'user-1',
      patternType: PatternType.DEPARTURE_TIME,
      value: { averageTime: '08:30' },
      confidence: 0.7,
      sampleCount: 15,
    });

    const conditions: CurrentConditions = {
      isRaining: true,
      transitDelayMinutes: 10,
      temperature: -15,
    };

    const result = await useCase.execute('user-1', 'alert-1', conditions);

    // 08:30 - 10(rain) - 10(transit) - 5(cold) = 08:05
    expect(result.recommendedTime).toBe('08:05');
    expect(result.adjustments).toHaveLength(3);
  });
});
