import { BehaviorApiClient } from './behavior-api.client';
import type { ApiClient } from './api-client';

// 상대 경로 import — @infrastructure/api 목 별칭을 타지 않는다.

/**
 * 아래 두 페이로드는 **백엔드 소스에서 그대로 옮긴 것**이다. 화면이 기대하는 모양이 아니라
 * 서버가 실제로 내보내는 모양이어야 이 테스트가 의미를 갖는다.
 *
 * - `GET /behavior/predictions/:userId` → `PredictionResult`
 *   (`prediction-engine.service.ts:44-57`, 반환문 `:148-164`)
 * - `GET /behavior/insights/:userId` → `getInsights()` 반환값
 *   (`prediction-engine.service.ts:257-281`, 반환문 `:353-363`)
 *
 * 이전 픽스처들은 프론트 타입을 보고 지어낸 모양이었다. 그래서 화면이 읽는 키
 * (`contributingFactors`·`summary`·`weatherSensitivity`)가 서버에 아예 없다는 사실을
 * 테스트가 한 번도 보지 못했다.
 */
const SERVER_PREDICTION = {
  departureTime: '08:05',
  departureRange: { early: '07:55', late: '08:15' },
  confidence: 0.72,
  tier: 'day_aware',
  factors: [
    {
      type: 'day_of_week',
      label: '월요일 패턴',
      impact: -3,
      description: '월요일은 평균보다 3분 일찍 출발',
      confidence: 0.8,
    },
  ],
  insights: [],
  dataStatus: {
    totalRecords: 15,
    recordsUsed: 15,
    nextTierAt: 20,
    nextTierName: 'weather_aware',
  },
};

const SERVER_INSIGHTS = {
  dayOfWeek: {
    segments: [
      { day: 1, dayName: '월요일', avgDepartureTime: '08:05', sampleCount: 3, stdDevMinutes: 4 },
      { day: 3, dayName: '수요일', avgDepartureTime: '08:08', sampleCount: 3, stdDevMinutes: 2 },
      { day: 5, dayName: '금요일', avgDepartureTime: '08:20', sampleCount: 3, stdDevMinutes: 9 },
    ],
    mostConsistentDay: 3,
    mostVariableDay: 5,
  },
  weatherImpact: {
    sensitivity: 'medium',
    coefficients: { rain: -8, snow: -14, temperature: -1 },
    description: '비 오는 날 평균 8분 일찍 출발',
  },
  overallStats: {
    totalRecords: 15,
    trackingSince: '2026-08-01T00:00:00.000Z',
    avgDepartureTime: '08:08',
    currentTier: 'day_aware',
    predictionAccuracy: 0.72,
  },
};

function clientReturning(payload: unknown): ApiClient {
  return { get: vi.fn().mockResolvedValue(payload) } as unknown as ApiClient;
}

describe('BehaviorApiClient — 서버 응답을 화면이 읽는 모양으로 옮긴다', () => {
  it('예측의 factors를 contributingFactors로 옮긴다', async () => {
    const result = await new BehaviorApiClient(clientReturning(SERVER_PREDICTION)).getPrediction(
      'user-1',
    );

    // 홈의 패턴 카드가 이 배열을 그대로 인덱싱한다
    // (`PatternInsightsCard.tsx:57`, `:108`). undefined면 홈 화면이 통째로 죽는다.
    expect(result?.contributingFactors).toHaveLength(1);
    expect(result?.contributingFactors[0].label).toBe('월요일 패턴');
    expect(result?.dataStatus.nextTierName).toBe('weather_aware');
  });

  it('인사이트의 overallStats를 summary로 옮긴다', async () => {
    const result = await new BehaviorApiClient(clientReturning(SERVER_INSIGHTS)).getInsights(
      'user-1',
    );

    expect(result?.summary.averageDeparture).toBe('08:08');
    expect(result?.summary.totalRecords).toBe(15);
    expect(result?.summary.tier).toBe('day_aware');
  });

  it('요일 구간의 출발 시각을 분으로 바꾸고 요일 이름을 겹치지 않게 둔다', async () => {
    const result = await new BehaviorApiClient(clientReturning(SERVER_INSIGHTS)).getInsights(
      'user-1',
    );

    const monday = result?.dayOfWeek.segments[0];
    expect(monday?.dayOfWeek).toBe(1);
    expect(monday?.avgMinutes).toBe(485); // 08:05
    // 화면이 `{dayName}요일`로 렌더한다(`PatternAnalysisPage.tsx:222`).
    // 서버가 주는 '월요일'을 그대로 넘기면 "월요일요일"이 된다.
    expect(monday?.dayName).toBe('월');
  });

  it('가장 일관된/변동 큰 요일을 번호가 아니라 화면이 쓰는 형태로 준다', async () => {
    const result = await new BehaviorApiClient(clientReturning(SERVER_INSIGHTS)).getInsights(
      'user-1',
    );

    expect(result?.dayOfWeek.mostConsistentDay).toEqual({
      dayOfWeek: 3,
      dayName: '수',
      stdDevMinutes: 2,
    });
    expect(result?.dayOfWeek.mostVariableDay?.dayName).toBe('금');
  });

  it('날씨 계수를 날씨 탭이 읽는 이름으로 옮긴다', async () => {
    const result = await new BehaviorApiClient(clientReturning(SERVER_INSIGHTS)).getInsights(
      'user-1',
    );

    expect(result?.weatherSensitivity?.level).toBe('medium');
    expect(result?.weatherSensitivity?.rainImpact).toBe(-8);
    expect(result?.weatherSensitivity?.snowImpact).toBe(-14);
    expect(result?.weatherSensitivity?.temperatureImpact).toBe(-1);
  });

  it('기록이 모자라 서버가 요일/날씨를 null로 줄 때도 화면이 읽을 수 있다', async () => {
    const sparse = { ...SERVER_INSIGHTS, dayOfWeek: null, weatherImpact: null };

    const result = await new BehaviorApiClient(clientReturning(sparse)).getInsights('user-1');

    // 요일 탭은 segments가 비면 안내 문구를 띄운다(`PatternAnalysisPage.tsx:146`).
    // null을 그대로 넘기면 그 분기에 닿기 전에 죽는다.
    expect(result?.dayOfWeek.segments).toEqual([]);
    expect(result?.weatherSensitivity).toBeNull();
  });

  it('엔진이 꺼져 있을 때의 error 응답은 데이터로 취급하지 않는다', async () => {
    const engineOff = { error: 'Prediction engine not available' };

    const prediction = await new BehaviorApiClient(clientReturning(engineOff)).getPrediction('u');
    const insights = await new BehaviorApiClient(clientReturning(engineOff)).getInsights('u');

    expect(prediction).toBeNull();
    expect(insights).toBeNull();
  });
});
