import { Test, TestingModule } from '@nestjs/testing';
import { WeatherController } from './weather.controller';
import { IWeatherApiClient } from '@infrastructure/external-apis/weather-api.client';

describe('WeatherController', () => {
  let controller: WeatherController;
  let weatherApiClient: jest.Mocked<IWeatherApiClient>;

  beforeEach(async () => {
    weatherApiClient = {
      getWeather: jest.fn(),
      getWeatherWithForecast: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WeatherController],
      providers: [
        { provide: 'IWeatherApiClient', useValue: weatherApiClient },
      ],
    }).compile();

    controller = module.get<WeatherController>(WeatherController);
  });

  describe('getCurrent', () => {
    it('좌표를 전달하여 날씨 조회 성공', async () => {
      const mockWeather = { temperature: 20, condition: '맑음' };
      weatherApiClient.getWeatherWithForecast.mockResolvedValue(mockWeather as any);

      const result = await controller.getCurrent('37.5665', '126.978');

      expect(weatherApiClient.getWeatherWithForecast).toHaveBeenCalledWith(37.5665, 126.978);
      expect(result).toEqual(mockWeather);
    });

    it('좌표 미전달 시 서울 기본값 사용', async () => {
      const mockWeather = { temperature: 15, condition: '흐림' };
      weatherApiClient.getWeatherWithForecast.mockResolvedValue(mockWeather as any);

      const result = await controller.getCurrent(undefined, undefined);

      expect(weatherApiClient.getWeatherWithForecast).toHaveBeenCalledWith(37.5665, 126.978);
      expect(result).toEqual(mockWeather);
    });

    it('유효하지 않은 좌표 시 에러 응답 반환', async () => {
      const result = await controller.getCurrent('invalid', 'coords');

      expect(result).toEqual({ error: 'Invalid coordinates' });
      expect(weatherApiClient.getWeatherWithForecast).not.toHaveBeenCalled();
    });

    it('weatherApiClient 미주입 시 에러 응답 반환', async () => {
      const module = await Test.createTestingModule({
        controllers: [WeatherController],
        providers: [],
      }).compile();
      const ctrl = module.get<WeatherController>(WeatherController);

      const result = await ctrl.getCurrent('37.5665', '126.978');

      expect(result).toEqual({ error: 'Weather API not configured' });
    });

    it('API 클라이언트 에러 시 전파', async () => {
      weatherApiClient.getWeatherWithForecast.mockRejectedValue(new Error('API Error'));

      await expect(controller.getCurrent('37.5665', '126.978')).rejects.toThrow('API Error');
    });
  });
});
