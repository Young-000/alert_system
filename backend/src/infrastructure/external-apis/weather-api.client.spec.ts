import { WeatherApiClient } from './weather-api.client';
import axios from 'axios';
import { Weather } from '@domain/entities/weather.entity';

const mockGet = jest.fn();
const mockCreate = jest.fn(() => ({
  get: mockGet,
}));

jest.mock('axios', () => ({
  create: mockCreate,
  default: {
    create: mockCreate,
  },
}));

describe('WeatherApiClient', () => {
  let client: WeatherApiClient;

  beforeEach(() => {
    jest.clearAllMocks();
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

