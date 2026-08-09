import { AirQualityApiClient } from './air-quality-api.client';
import { AirQuality } from '@domain/entities/air-quality.entity';

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

describe('AirQualityApiClient', () => {
  let client: AirQualityApiClient;
  let mockGet: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const axiosMock = jest.requireMock('axios') as any;
    mockGet = axiosMock.__mockGet;
    client = new AirQualityApiClient('test-api-key');
  });

  it('should fetch air quality data', async () => {
    const mockResponse = {
      data: {
        response: {
          body: {
            items: [
              {
                pm10Value: '50',
                pm25Value: '25',
              },
            ],
          },
        },
      },
    };
    mockGet.mockResolvedValue(mockResponse);

    const result = await client.getAirQuality(37.5665, 126.9780);

    expect(result).toBeInstanceOf(AirQuality);
    expect(result.pm10).toBe(50);
    expect(result.pm25).toBe(25);
    expect(mockGet).toHaveBeenCalled();
  });

  it('should handle API errors', async () => {
    mockGet.mockRejectedValue(new Error('API Error'));

    await expect(client.getAirQuality(37.5665, 126.9780)).rejects.toThrow('API Error');
  });

  describe('시도명 결정', () => {
    function sidoNameOfLastCall(): string {
      return mockGet.mock.calls[0][1].params.sidoName;
    }

    beforeEach(() => {
      mockGet.mockResolvedValue({
        data: {
          response: { body: { items: [{ pm10Value: '30', pm25Value: '15' }] } },
        },
      });
    });

    it('서울 좌표는 서울로 조회한다', async () => {
      await client.getAirQuality(37.5665, 126.978);

      expect(sidoNameOfLastCall()).toBe('서울');
    });

    it('인천 좌표는 인천으로 조회한다', async () => {
      // 인천 부평 (37.4894, 126.7247) — 경기 범위에도 포함되는 좌표다.
      await client.getAirQuality(37.4894, 126.7247);

      expect(sidoNameOfLastCall()).toBe('인천');
    });

    it('경기 좌표는 경기로 조회한다', async () => {
      // 수원 (37.2636, 127.0286) — 인천 위도 범위 밖.
      await client.getAirQuality(37.2636, 127.0286);

      expect(sidoNameOfLastCall()).toBe('경기');
    });
  });
});
