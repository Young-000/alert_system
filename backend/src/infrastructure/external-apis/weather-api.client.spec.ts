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

  it('should fetch weather data', async () => {
    const mockResponse = {
      data: {
        name: 'Seoul',
        main: {
          temp: 15,
          humidity: 60,
        },
        weather: [
          {
            main: 'Clear',
          },
        ],
        wind: {
          speed: 10,
        },
      },
    };
    mockGet.mockResolvedValue(mockResponse);

    const result = await client.getWeather(37.5665, 126.9780);

    expect(result).toBeInstanceOf(Weather);
    expect(result.location).toBe('Seoul');
    expect(result.temperature).toBe(15);
    expect(mockGet).toHaveBeenCalled();
  });

  it('should handle API errors', async () => {
    mockGet.mockRejectedValue(new Error('API Error'));

    await expect(client.getWeather(37.5665, 126.9780)).rejects.toThrow('API Error');
  });
});
