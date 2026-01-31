import axios, { AxiosInstance } from 'axios';
import { Weather, HourlyForecast, DailyForecast } from '@domain/entities/weather.entity';

export interface IWeatherApiClient {
  getWeather(lat: number, lng: number): Promise<Weather>;
  getWeatherWithForecast(lat: number, lng: number): Promise<Weather>;
}

// OpenWeatherMap API 응답 타입
interface OpenWeatherForecastItem {
  dt: number;
  dt_txt: string;
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
    temp_min: number;
    temp_max: number;
  };
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  pop?: number; // probability of precipitation
  wind: {
    speed: number;
    deg: number;
  };
}

interface OpenWeatherForecastResponse {
  list: OpenWeatherForecastItem[];
  city: {
    name: string;
    country: string;
  };
}

export class WeatherApiClient implements IWeatherApiClient {
  private client: AxiosInstance;

  constructor(private apiKey: string) {
    this.client = axios.create({
      baseURL: 'https://api.openweathermap.org/data/2.5',
      params: {
        appid: this.apiKey,
        units: 'metric',
        lang: 'kr',
      },
    });
  }

  async getWeather(lat: number, lng: number): Promise<Weather> {
    try {
      const response = await this.client.get('/weather', {
        params: { lat, lon: lng },
      });

      return new Weather(
        response.data.name,
        response.data.main.temp,
        response.data.weather[0].main,
        response.data.main.humidity,
        response.data.wind.speed,
        response.data.main.feels_like,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`날씨 정보를 가져오는데 실패했습니다: ${message}`);
    }
  }

  async getWeatherWithForecast(lat: number, lng: number): Promise<Weather> {
    try {
      // 현재 날씨와 예보를 병렬로 가져오기
      const [currentResponse, forecastResponse] = await Promise.all([
        this.client.get('/weather', { params: { lat, lon: lng } }),
        this.client.get('/forecast', { params: { lat, lon: lng } }),
      ]);

      const forecast = this.parseForecast(forecastResponse.data);

      return new Weather(
        currentResponse.data.name,
        currentResponse.data.main.temp,
        currentResponse.data.weather[0].main,
        currentResponse.data.main.humidity,
        currentResponse.data.wind.speed,
        currentResponse.data.main.feels_like,
        forecast,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`날씨 정보를 가져오는데 실패했습니다: ${message}`);
    }
  }

  private parseForecast(data: OpenWeatherForecastResponse): DailyForecast {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // 오늘 날짜의 예보만 필터링
    const todayForecasts = data.list.filter((item: OpenWeatherForecastItem) => {
      const itemDate = item.dt_txt.split(' ')[0];
      return itemDate === todayStr;
    });

    // 시간대별 예보 파싱
    const hourlyForecasts: HourlyForecast[] = todayForecasts.map((item: OpenWeatherForecastItem) => {
      const hour = parseInt(item.dt_txt.split(' ')[1].split(':')[0]);
      const timeSlot = this.getTimeSlot(hour);
      const condition = item.weather[0].main;

      return {
        time: item.dt_txt.split(' ')[1].substring(0, 5),
        timeSlot,
        temperature: Math.round(item.main.temp),
        condition,
        conditionKr: Weather.conditionToKorean(condition),
        icon: item.weather[0].icon,
        rainProbability: Math.round((item.pop || 0) * 100),
      };
    });

    // 내일 예보도 포함하여 최고/최저 기온 계산
    const tomorrowStr = new Date(today.getTime() + 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const relevantForecasts = data.list.filter((item: OpenWeatherForecastItem) => {
      const itemDate = item.dt_txt.split(' ')[0];
      return itemDate === todayStr || itemDate === tomorrowStr;
    });

    // 오늘/내일 기온 중 최고/최저
    const temps = relevantForecasts
      .filter((item: OpenWeatherForecastItem) => item.dt_txt.split(' ')[0] === todayStr)
      .map((item: OpenWeatherForecastItem) => item.main.temp);

    const maxTemp = temps.length > 0 ? Math.round(Math.max(...temps)) : 0;
    const minTemp = temps.length > 0 ? Math.round(Math.min(...temps)) : 0;

    return {
      maxTemp,
      minTemp,
      hourlyForecasts,
    };
  }

  private getTimeSlot(hour: number): string {
    if (hour >= 6 && hour < 12) return '오전';
    if (hour >= 12 && hour < 18) return '오후';
    return '저녁';
  }
}
