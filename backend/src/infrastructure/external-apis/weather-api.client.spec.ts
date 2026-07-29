import { WeatherApiClient } from './weather-api.client';
import { Weather } from '@domain/entities/weather.entity';

jest.mock('axios', () => {
  const mockGet = jest.fn();
  const mockCreate = jest.fn(() => ({
    get: mockGet,
  }));
  return {
    create: mockCreate,
    default: {
      create: mockCreate,
    },
    __mockGet: mockGet,
  };
});

describe('WeatherApiClient', () => {
  let client: WeatherApiClient;
  let mockGet: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const axiosMock = jest.requireMock('axios') as any;
    mockGet = axiosMock.__mockGet;
    client = new WeatherApiClient('test-api-key');
  });

  it('should fetch weather data from KMA API', async () => {
    // 기상청 API 초단기실황 응답 형식
    const mockCurrentResponse = {
      data: {
        response: {
          header: { resultCode: '00', resultMsg: 'NORMAL_SERVICE' },
          body: {
            items: {
              item: [
                { category: 'T1H', obsrValue: '15' },  // 기온
                { category: 'REH', obsrValue: '60' },  // 습도
                { category: 'WSD', obsrValue: '3.5' }, // 풍속
                { category: 'PTY', obsrValue: '0' },   // 강수형태 (0: 없음)
                { category: 'SKY', obsrValue: '1' },   // 하늘상태 (1: 맑음)
              ],
            },
          },
        },
      },
    };

    // 기상청 API 단기예보 응답 형식
    const mockForecastResponse = {
      data: {
        response: {
          header: { resultCode: '00', resultMsg: 'NORMAL_SERVICE' },
          body: {
            items: {
              item: [
                { category: 'TMP', fcstValue: '18', fcstDate: '20260205', fcstTime: '0900' },
                { category: 'SKY', fcstValue: '1', fcstDate: '20260205', fcstTime: '0900' },
                { category: 'PTY', fcstValue: '0', fcstDate: '20260205', fcstTime: '0900' },
                { category: 'POP', fcstValue: '0', fcstDate: '20260205', fcstTime: '0900' },
              ],
            },
          },
        },
      },
    };

    // 첫 번째 호출: 초단기실황, 두 번째 호출: 단기예보
    mockGet
      .mockResolvedValueOnce(mockCurrentResponse)
      .mockResolvedValueOnce(mockForecastResponse);

    const result = await client.getWeather(37.5665, 126.9780);

    expect(result).toBeInstanceOf(Weather);
    // 서울 좌표 기준으로 '서울' 반환
    expect(result.location).toBe('서울');
    expect(result.temperature).toBe(15);
    expect(result.humidity).toBe(60);
    expect(result.condition).toBe('Clear');
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('should handle Clear sky condition', async () => {
    const mockCurrentResponse = {
      data: {
        response: {
          header: { resultCode: '00', resultMsg: 'NORMAL_SERVICE' },
          body: {
            items: {
              item: [
                { category: 'T1H', obsrValue: '20' },
                { category: 'REH', obsrValue: '50' },
                { category: 'WSD', obsrValue: '2' },
                { category: 'PTY', obsrValue: '0' },  // 강수 없음
                { category: 'SKY', obsrValue: '1' },  // 맑음
              ],
            },
          },
        },
      },
    };

    const mockForecastResponse = {
      data: {
        response: {
          header: { resultCode: '00', resultMsg: 'NORMAL_SERVICE' },
          body: { items: { item: [] } },
        },
      },
    };

    mockGet
      .mockResolvedValueOnce(mockCurrentResponse)
      .mockResolvedValueOnce(mockForecastResponse);

    const result = await client.getWeather(37.5665, 126.9780);

    expect(result.condition).toBe('Clear');
  });

  it('should handle Rain condition', async () => {
    const mockCurrentResponse = {
      data: {
        response: {
          header: { resultCode: '00', resultMsg: 'NORMAL_SERVICE' },
          body: {
            items: {
              item: [
                { category: 'T1H', obsrValue: '12' },
                { category: 'REH', obsrValue: '90' },
                { category: 'WSD', obsrValue: '5' },
                { category: 'PTY', obsrValue: '1' },  // 비
                { category: 'SKY', obsrValue: '4' },  // 흐림
              ],
            },
          },
        },
      },
    };

    const mockForecastResponse = {
      data: {
        response: {
          header: { resultCode: '00', resultMsg: 'NORMAL_SERVICE' },
          body: { items: { item: [] } },
        },
      },
    };

    mockGet
      .mockResolvedValueOnce(mockCurrentResponse)
      .mockResolvedValueOnce(mockForecastResponse);

    const result = await client.getWeather(37.5665, 126.9780);

    expect(result.condition).toBe('Rain');
  });

  it('should handle Snow condition', async () => {
    const mockCurrentResponse = {
      data: {
        response: {
          header: { resultCode: '00', resultMsg: 'NORMAL_SERVICE' },
          body: {
            items: {
              item: [
                { category: 'T1H', obsrValue: '-2' },
                { category: 'REH', obsrValue: '85' },
                { category: 'WSD', obsrValue: '3' },
                { category: 'PTY', obsrValue: '3' },  // 눈
                { category: 'SKY', obsrValue: '4' },
              ],
            },
          },
        },
      },
    };

    const mockForecastResponse = {
      data: {
        response: {
          header: { resultCode: '00', resultMsg: 'NORMAL_SERVICE' },
          body: { items: { item: [] } },
        },
      },
    };

    mockGet
      .mockResolvedValueOnce(mockCurrentResponse)
      .mockResolvedValueOnce(mockForecastResponse);

    const result = await client.getWeather(37.5665, 126.9780);

    expect(result.condition).toBe('Snow');
  });

  it('should handle API errors', async () => {
    mockGet.mockRejectedValue(new Error('API Error'));

    await expect(client.getWeather(37.5665, 126.9780)).rejects.toThrow('날씨 정보를 가져오는데 실패했습니다');
  });

  /**
   * 기상청 API의 base_date·base_time·fcstDate는 모두 KST 기준이다.
   * 프로덕션(ECS)은 컨테이너 TZ가 없어 Node가 UTC로 동작하는데, 로컬 시각으로
   * 기준 시각을 만들면 9시간 과거를 조회해 NO_DATA/과거 데이터를 받는다.
   */
  describe('기상청 기준 시각 — KST', () => {
    const emptyResponse = {
      data: {
        response: {
          header: { resultCode: '00', resultMsg: 'NORMAL_SERVICE' },
          body: { items: { item: [] } },
        },
      },
    };

    afterEach(() => {
      jest.useRealTimers();
    });

    const paramsAt = async (utcInstant: string) => {
      jest.useFakeTimers().setSystemTime(new Date(utcInstant));
      mockGet.mockResolvedValue(emptyResponse);

      await client.getWeather(37.5665, 126.9780);

      const [ncstCall, fcstCall] = mockGet.mock.calls;
      return { ncst: ncstCall[1].params, fcst: fcstCall[1].params };
    };

    it('KST 07:30(UTC 전날 22:30)에 KST 날짜/시각으로 실황을 조회한다', async () => {
      const { ncst } = await paramsAt('2026-07-29T22:30:00Z');

      // 40분 전 = KST 06:50 → base_date 2026-07-30, base_time 0600
      expect(ncst.base_date).toBe('20260730');
      expect(ncst.base_time).toBe('0600');
    });

    it('KST 자정 직후에도 당일 날짜로 조회한다', async () => {
      // UTC 15:10 = KST 00:10 → 40분 전은 KST 전날 23:30
      const { ncst } = await paramsAt('2026-07-29T15:10:00Z');

      expect(ncst.base_date).toBe('20260729');
      expect(ncst.base_time).toBe('2300');
    });

    it('KST 시각으로 단기예보 발표 시각을 고른다', async () => {
      // UTC 전날 22:30 = KST 07:30 → 05시 발표분 사용
      const { fcst } = await paramsAt('2026-07-29T22:30:00Z');

      expect(fcst.base_date).toBe('20260730');
      expect(fcst.base_time).toBe('0500');
    });

    it('KST 02시 이전에는 전날 23시 발표분을 사용한다', async () => {
      // UTC 16:00 = KST 01:00
      const { fcst } = await paramsAt('2026-07-29T16:00:00Z');

      expect(fcst.base_date).toBe('20260729');
      expect(fcst.base_time).toBe('2300');
    });

    it('KST 오늘 날짜의 예보만 시간대별 목록에 담는다', async () => {
      // UTC 전날 22:30 = KST 2026-07-30 07:30
      jest.useFakeTimers().setSystemTime(new Date('2026-07-29T22:30:00Z'));

      const forecastResponse = {
        data: {
          response: {
            header: { resultCode: '00', resultMsg: 'NORMAL_SERVICE' },
            body: {
              items: {
                item: [
                  // KST 오늘(7/30) — 포함돼야 한다.
                  { category: 'TMP', fcstValue: '28', fcstDate: '20260730', fcstTime: '0900' },
                  { category: 'SKY', fcstValue: '1', fcstDate: '20260730', fcstTime: '0900' },
                  { category: 'POP', fcstValue: '10', fcstDate: '20260730', fcstTime: '0900' },
                  // UTC 기준 '오늘'(7/29) — KST로는 어제라 제외돼야 한다.
                  { category: 'TMP', fcstValue: '11', fcstDate: '20260729', fcstTime: '0900' },
                ],
              },
            },
          },
        },
      };

      mockGet
        .mockResolvedValueOnce(emptyResponse)
        .mockResolvedValueOnce(forecastResponse);

      const result = await client.getWeather(37.5665, 126.9780);

      // formatDate()가 로컬(UTC) 날짜를 쓰면 7/30 예보가 전부 걸러져 목록이 빈다.
      expect(result.forecast?.hourlyForecasts).toHaveLength(1);
      expect(result.forecast?.hourlyForecasts[0].temperature).toBe(28);
    });
  });

  it('should handle empty API response gracefully', async () => {
    const mockEmptyResponse = {
      data: {
        response: {
          header: { resultCode: '00', resultMsg: 'NORMAL_SERVICE' },
          body: { items: { item: [] } },
        },
      },
    };

    mockGet
      .mockResolvedValueOnce(mockEmptyResponse)
      .mockResolvedValueOnce(mockEmptyResponse);

    const result = await client.getWeather(37.5665, 126.9780);

    // 빈 응답시 기본값 사용
    expect(result).toBeInstanceOf(Weather);
    expect(result.temperature).toBe(0);
  });
});
