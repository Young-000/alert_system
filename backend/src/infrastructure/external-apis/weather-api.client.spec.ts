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
