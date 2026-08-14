import { renderHook, waitFor } from '@testing-library/react';
import { TestProviders } from '../../../test-utils';
import { behaviorApiClient, commuteApiClient } from '@infrastructure/api';
import type { Alert, DeparturePrediction, WeatherData } from '@infrastructure/api';
import type {
  RouteResponse,
  RouteRecommendationResponse,
  RouteScoreResponse,
} from '@infrastructure/api/commute-api.client';
import { useHomeData } from './use-home-data';

// 훅이 소비하는 서버 상태를 테스트가 직접 쥔다.
// 재할당한 뒤 rerender() 하면 "사용자가 알림을 껐다 / 경로를 지웠다 / 날씨가 바뀌었다"가 재현된다.
let mockAlerts: Alert[] = [];
let mockRoutes: RouteResponse[] = [];
let mockWeather: WeatherData | null = null;

vi.mock('@presentation/hooks/useAuth', () => ({
  useAuth: () => ({ userId: 'u-1', userName: '테스터', isLoggedIn: true }),
}));

vi.mock('@presentation/hooks/useUserLocation', () => ({
  useUserLocation: () => ({
    latitude: 37.5, longitude: 127.0, isLoading: false, isDefault: false,
  }),
}));

const idleQuery = { isLoading: false, error: null, refetch: vi.fn() };

vi.mock('@infrastructure/query/use-alerts-query', () => ({
  useAlertsQuery: () => ({ ...idleQuery, data: mockAlerts }),
}));
vi.mock('@infrastructure/query/use-routes-query', () => ({
  useRoutesQuery: () => ({ ...idleQuery, data: mockRoutes }),
}));
vi.mock('@infrastructure/query/use-weather-query', () => ({
  useWeatherQuery: () => ({ ...idleQuery, data: mockWeather }),
}));
vi.mock('@infrastructure/query/use-air-quality-query', () => ({
  useAirQualityQuery: () => ({ ...idleQuery, data: null }),
}));
vi.mock('@infrastructure/query/use-commute-stats-query', () => ({
  useCommuteStatsQuery: () => ({ ...idleQuery, data: null }),
}));
vi.mock('@infrastructure/query/use-streak-query', () => ({
  useStreakQuery: () => ({ ...idleQuery, data: null }),
}));
vi.mock('@infrastructure/query/use-weekly-report-query', () => ({
  useWeeklyReportQuery: () => ({ ...idleQuery, data: null }),
}));
vi.mock('@infrastructure/query/use-transit-query', () => ({
  useTransitQuery: () => ({ ...idleQuery, data: [], isFetching: false, dataUpdatedAt: 0 }),
}));

function makeAlert(enabled: boolean): Alert {
  return {
    id: 'a-1',
    userId: 'u-1',
    name: '출근 알림',
    schedule: '30 7 * * 1-5',
    alertTypes: ['weather'],
    enabled,
  };
}

function makeRoute(id: string): RouteResponse {
  return {
    id,
    userId: 'u-1',
    name: `경로 ${id}`,
    routeType: 'morning',
    isPreferred: false,
    checkpoints: [],
  } as unknown as RouteResponse;
}

function makeWeather(condition: string): WeatherData {
  return {
    location: 'Seoul',
    temperature: 20,
    condition,
    humidity: 50,
    windSpeed: 3,
    conditionKr: '맑음',
    conditionEmoji: '',
  };
}

const CONFIDENT_PREDICTION: DeparturePrediction = {
  baseTime: '07:40',
  recommendedTime: '07:32',
  adjustments: [{ reason: '비 예보', minutes: 8 }],
  explanation: '비 오는 날은 평소보다 8분 일찍 나가세요',
  confidence: 0.9,
};

const RECOMMENDED_ROUTE: RouteScoreResponse = {
  routeId: 'r-1',
  routeName: '경로 r-1',
  totalScore: 88,
  scores: { speed: 90, reliability: 85, weatherResilience: 90 },
  averageDuration: 42,
  variability: 4,
  sampleCount: 12,
  reasons: ['비 올 때 더 빠름'],
};

const CONFIDENT_RECOMMENDATION: RouteRecommendationResponse = {
  recommendedRouteId: 'r-1',
  recommendation: RECOMMENDED_ROUTE,
  alternatives: [],
  confidence: 0.9,
  insights: ['비 예보에는 이 경로가 안정적이에요'],
};

function renderHomeData() {
  return renderHook(() => useHomeData(), { wrapper: TestProviders });
}

describe('useHomeData — 전제가 사라진 추천을 화면에 남기지 않는다', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAlerts = [makeAlert(true)];
    mockRoutes = [makeRoute('r-1'), makeRoute('r-2')];
    mockWeather = makeWeather('Rain');
    vi.mocked(behaviorApiClient.getOptimalDeparture).mockResolvedValue(CONFIDENT_PREDICTION);
    vi.mocked(commuteApiClient.getWeatherRouteRecommendation).mockResolvedValue(
      CONFIDENT_RECOMMENDATION,
    );
  });

  it('알림을 모두 끄면 출발 예측이 사라진다', async () => {
    const { result, rerender } = renderHomeData();
    await waitFor(() => expect(result.current.departurePrediction).not.toBeNull());

    // 사용자가 /alerts 에서 유일한 알림을 껐다.
    mockAlerts = [makeAlert(false)];
    rerender();

    await waitFor(() => expect(result.current.departurePrediction).toBeNull());
  });

  it('새 예측의 신뢰도가 낮으면 이전 예측을 지운다', async () => {
    const { result, rerender } = renderHomeData();
    await waitFor(() => expect(result.current.departurePrediction).not.toBeNull());

    // 날씨가 바뀌었고, 그 조건에서는 서버가 자신 없다고 답한다.
    vi.mocked(behaviorApiClient.getOptimalDeparture).mockResolvedValue({
      ...CONFIDENT_PREDICTION,
      confidence: 0.1,
    });
    mockWeather = makeWeather('Clear');
    rerender();

    await waitFor(() => expect(result.current.departurePrediction).toBeNull());
  });

  it('경로가 2개 미만이 되면 경로 추천이 사라진다', async () => {
    const { result, rerender } = renderHomeData();
    await waitFor(() => expect(result.current.routeRecommendation).not.toBeNull());

    // 사용자가 경로 하나를 삭제했다 — 비교 대상이 없으니 추천의 전제가 무너진다.
    mockRoutes = [makeRoute('r-1')];
    rerender();

    await waitFor(() => expect(result.current.routeRecommendation).toBeNull());
  });

  // 대조군 — 조회 실패는 "추천이 없다"가 아니다. 직전 값을 그대로 둔다.
  it('조회가 실패해도 마지막 예측은 유지한다', async () => {
    const { result, rerender } = renderHomeData();
    await waitFor(() => expect(result.current.departurePrediction).not.toBeNull());

    vi.mocked(behaviorApiClient.getOptimalDeparture).mockRejectedValue(new Error('network'));
    mockWeather = makeWeather('Clouds');
    rerender();

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current.departurePrediction).toEqual(CONFIDENT_PREDICTION);
  });
});
