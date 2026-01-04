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
});
