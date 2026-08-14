import { BriefingApiClient } from './briefing-api.client';
import type { ApiClient } from './api-client';
import type { BriefingResponse } from './briefing-api.client';

// 상대 경로로 import 하므로 vitest.config.ts의 @infrastructure/api 목 별칭을 타지 않는다.
// (@infrastructure/api를 vi.mock 하면 네임스페이스 전체가 접혀 다른 export가 undefined가 된다)

/**
 * 이 파일의 목적은 GET /briefing 의 **응답 계약**을 타입 수준에서 고정하는 것이다.
 * 아래 payload는 backend/src/presentation/controllers/briefing.controller.ts의
 * BriefingEndpointResponse가 실제로 내보내는 형태를 그대로 옮긴 것이다
 * (BriefingAdviceDto + WidgetWeatherDto + WidgetAirQualityDto + WidgetTransitDto
 *  + WidgetDepartureDataDto — backend/src/application/dto/*.dto.ts).
 * 프론트 타입이 서버와 어긋나면 tsc가 여기서 깨진다.
 */
const SERVER_PAYLOAD: BriefingResponse = {
  advices: [
    {
      category: 'umbrella',
      severity: 'warning',
      icon: '☂️',
      message: '우산 챙기세요',
      detail: '오후에 비 소식이 있어요',
    },
    {
      category: 'mask',
      severity: 'info',
      icon: '😷',
      message: '미세먼지 보통이에요',
    },
  ],
  weather: {
    temperature: 21,
    condition: 'Rain',
    conditionEmoji: '🌧️',
    conditionKr: '비',
    feelsLike: 19,
    maxTemp: 24,
    minTemp: 17,
  },
  airQuality: {
    pm10: 42,
    pm25: 18,
    status: '보통',
    statusLevel: 'moderate',
  },
  transit: {
    subway: {
      stationName: '강남',
      lineInfo: '2호선',
      arrivalMinutes: 4,
      destination: '삼성',
    },
    bus: null,
  },
  departure: {
    departureType: 'commute',
    optimalDepartureAt: '2026-08-14T08:10:00.000Z',
    minutesUntilDeparture: 12,
    estimatedTravelMin: 38,
    arrivalTarget: '2026-08-14T09:00:00.000Z',
    status: 'onTime',
    hasTrafficDelay: false,
  },
  contextLabel: '출근길',
  summary: '비가 와요. 우산 챙기세요.',
  updatedAt: '2026-08-14T08:00:00.000Z',
};

function createApiClientStub(): {
  client: ApiClient;
  getMock: ReturnType<typeof vi.fn>;
} {
  const getMock = vi.fn().mockResolvedValue(SERVER_PAYLOAD);
  return { client: { get: getMock } as unknown as ApiClient, getMock };
}

describe('BriefingApiClient — 서버 응답 계약', () => {
  it('조언은 서버 BriefingAdviceDto 형태(category/severity/icon/message/detail)로 읽힌다', async () => {
    const { client } = createApiClientStub();

    const result = await new BriefingApiClient(client).getBriefing();

    expect(result.advices[0].category).toBe('umbrella');
    expect(result.advices[0].icon).toBe('☂️');
    expect(result.advices[0].message).toBe('우산 챙기세요');
    expect(result.advices[0].detail).toBe('오후에 비 소식이 있어요');
    expect(result.advices[1].detail).toBeUndefined();
  });

  it('날씨는 WidgetWeatherDto 형태(conditionEmoji 포함)로 읽힌다', async () => {
    const { client } = createApiClientStub();

    const result = await new BriefingApiClient(client).getBriefing();

    expect(result.weather?.conditionEmoji).toBe('🌧️');
    expect(result.weather?.conditionKr).toBe('비');
    expect(result.weather?.temperature).toBe(21);
  });

  it('대기질은 statusLevel을 함께 노출한다', async () => {
    const { client } = createApiClientStub();

    const result = await new BriefingApiClient(client).getBriefing();

    expect(result.airQuality?.statusLevel).toBe('moderate');
  });

  it('transit·departure를 그대로 노출한다', async () => {
    const { client } = createApiClientStub();

    const result = await new BriefingApiClient(client).getBriefing();

    expect(result.transit.subway?.stationName).toBe('강남');
    expect(result.transit.bus).toBeNull();
    expect(result.departure?.minutesUntilDeparture).toBe(12);
  });

  // ── 대조군: 타입만 고쳐서 통과시키는 길을 막는다 (수정 전후 모두 통과해야 한다) ──

  it('좌표가 없으면 쿼리스트링 없이 /briefing을 호출한다', async () => {
    const { client, getMock } = createApiClientStub();

    await new BriefingApiClient(client).getBriefing();

    expect(getMock).toHaveBeenCalledWith('/briefing');
  });

  it('좌표가 있으면 lat·lng를 쿼리스트링으로 붙인다', async () => {
    const { client, getMock } = createApiClientStub();

    await new BriefingApiClient(client).getBriefing(37.5, 127.03);

    expect(getMock).toHaveBeenCalledWith('/briefing?lat=37.5&lng=127.03');
  });
});
