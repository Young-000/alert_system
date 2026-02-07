import axios, { AxiosInstance } from 'axios';
import { Weather, HourlyForecast, DailyForecast } from '@domain/entities/weather.entity';

export interface IWeatherApiClient {
  getWeather(lat: number, lng: number): Promise<Weather>;
  getWeatherWithForecast(lat: number, lng: number): Promise<Weather>;
}

// 기상청 API 응답 타입
interface KmaItem {
  category: string; // T1H(기온), RN1(강수량), SKY(하늘상태), PTY(강수형태), REH(습도), WSD(풍속)
  obsrValue?: string; // 실황값
  fcstValue?: string; // 예보값
  fcstDate?: string;
  fcstTime?: string;
}

interface KmaResponse {
  response: {
    header: {
      resultCode: string;
      resultMsg: string;
    };
    body?: {
      items?: {
        item?: KmaItem[];
      };
    };
  };
}

/**
 * 기상청 API 클라이언트 (공공데이터포털)
 *
 * 사용 API:
 * - 초단기실황 (getUltraSrtNcst): 현재 날씨
 * - 단기예보 (getVilageFcst): 3일 예보
 */
export class WeatherApiClient implements IWeatherApiClient {
  private client: AxiosInstance;
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0',
      timeout: 10000,
    });
  }

  async getWeather(lat: number, lng: number): Promise<Weather> {
    return this.getWeatherWithForecast(lat, lng);
  }

  async getWeatherWithForecast(lat: number, lng: number): Promise<Weather> {
    try {
      const { nx, ny } = this.convertToGrid(lat, lng);
      const { baseDate, baseTime } = this.getBaseDateTime();
      const { forecastBaseDate, forecastBaseTime } = this.getForecastBaseDateTime();

      // 초단기실황 + 단기예보 병렬 호출
      const [currentResponse, forecastResponse] = await Promise.all([
        this.fetchCurrentWeather(nx, ny, baseDate, baseTime),
        this.fetchForecast(nx, ny, forecastBaseDate, forecastBaseTime),
      ]);

      const currentData = this.parseCurrentWeather(currentResponse);
      const forecast = this.parseForecast(forecastResponse);

      return new Weather(
        this.getLocationName(lat, lng),
        currentData.temperature,
        currentData.condition,
        currentData.humidity,
        currentData.windSpeed,
        currentData.temperature, // 체감온도는 기온과 동일하게 처리
        forecast,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`날씨 정보를 가져오는데 실패했습니다: ${message}`);
    }
  }

  // 초단기실황 조회
  private async fetchCurrentWeather(nx: number, ny: number, baseDate: string, baseTime: string): Promise<KmaResponse> {
    const response = await this.client.get('/getUltraSrtNcst', {
      params: {
        serviceKey: this.apiKey,
        numOfRows: 10,
        pageNo: 1,
        dataType: 'JSON',
        base_date: baseDate,
        base_time: baseTime,
        nx,
        ny,
      },
    });
    return response.data;
  }

  // 단기예보 조회
  private async fetchForecast(nx: number, ny: number, baseDate: string, baseTime: string): Promise<KmaResponse> {
    const response = await this.client.get('/getVilageFcst', {
      params: {
        serviceKey: this.apiKey,
        numOfRows: 100,
        pageNo: 1,
        dataType: 'JSON',
        base_date: baseDate,
        base_time: baseTime,
        nx,
        ny,
      },
    });
    return response.data;
  }

  // 현재 날씨 파싱
  private parseCurrentWeather(response: KmaResponse): {
    temperature: number;
    condition: string;
    humidity: number;
    windSpeed: number;
  } {
    const items = response.response?.body?.items?.item || [];

    let temperature = 0;
    let humidity = 0;
    let windSpeed = 0;
    let pty = '0'; // 강수형태
    let sky = '1'; // 하늘상태

    for (const item of items) {
      const value = item.obsrValue || '0';
      switch (item.category) {
        case 'T1H': temperature = parseFloat(value); break;
        case 'REH': humidity = parseInt(value, 10); break;
        case 'WSD': windSpeed = parseFloat(value); break;
        case 'PTY': pty = value; break;
        case 'SKY': sky = value; break;
      }
    }

    const condition = this.getConditionFromKma(pty, sky);

    return { temperature, condition, humidity, windSpeed };
  }

  // 예보 파싱
  private parseForecast(response: KmaResponse): DailyForecast {
    const items = response.response?.body?.items?.item || [];
    const today = new Date();
    const todayStr = this.formatDate(today);

    // 시간대별로 그룹화
    const hourlyMap = new Map<string, { temp?: number; sky?: string; pty?: string; pop?: number }>();

    for (const item of items) {
      if (item.fcstDate !== todayStr) continue;

      const time = item.fcstTime || '';
      if (!hourlyMap.has(time)) {
        hourlyMap.set(time, {});
      }
      const data = hourlyMap.get(time)!;
      const value = item.fcstValue || '0';

      switch (item.category) {
        case 'TMP': data.temp = parseFloat(value); break;
        case 'SKY': data.sky = value; break;
        case 'PTY': data.pty = value; break;
        case 'POP': data.pop = parseInt(value, 10); break;
      }
    }

    // 시간대별 예보 생성
    const hourlyForecasts: HourlyForecast[] = [];
    const temps: number[] = [];

    for (const [time, data] of hourlyMap) {
      const hour = parseInt(time.substring(0, 2), 10);
      const condition = this.getConditionFromKma(data.pty || '0', data.sky || '1');

      if (data.temp !== undefined) {
        temps.push(data.temp);
        hourlyForecasts.push({
          time: `${time.substring(0, 2)}:${time.substring(2, 4)}`,
          timeSlot: this.getTimeSlot(hour),
          temperature: Math.round(data.temp),
          condition,
          conditionKr: Weather.conditionToKorean(condition),
          icon: this.getIconFromCondition(condition),
          rainProbability: data.pop || 0,
        });
      }
    }

    // 시간순 정렬
    hourlyForecasts.sort((a, b) => a.time.localeCompare(b.time));

    return {
      maxTemp: temps.length > 0 ? Math.round(Math.max(...temps)) : 0,
      minTemp: temps.length > 0 ? Math.round(Math.min(...temps)) : 0,
      hourlyForecasts,
    };
  }

  // 기상청 코드 → 날씨 상태 변환
  private getConditionFromKma(pty: string, sky: string): string {
    // PTY (강수형태): 0=없음, 1=비, 2=비/눈, 3=눈, 4=소나기, 5=빗방울, 6=빗방울눈날림, 7=눈날림
    if (pty !== '0') {
      switch (pty) {
        case '1': case '4': case '5': return 'Rain';
        case '2': case '6': return 'Sleet';
        case '3': case '7': return 'Snow';
        default: return 'Rain';
      }
    }

    // SKY (하늘상태): 1=맑음, 3=구름많음, 4=흐림
    switch (sky) {
      case '1': return 'Clear';
      case '3': return 'Clouds';
      case '4': return 'Overcast';
      default: return 'Clear';
    }
  }

  // 날씨 상태 → 아이콘 변환
  private getIconFromCondition(condition: string): string {
    const hour = new Date().getHours();
    const isDay = hour >= 6 && hour < 18;
    const suffix = isDay ? 'd' : 'n';

    switch (condition) {
      case 'Clear': return `01${suffix}`;
      case 'Clouds': return `03${suffix}`;
      case 'Overcast': return `04${suffix}`;
      case 'Rain': return `10${suffix}`;
      case 'Snow': return `13${suffix}`;
      case 'Sleet': return `13${suffix}`;
      default: return `01${suffix}`;
    }
  }

  // 위경도 → 격자 좌표 변환 (기상청 격자 변환 공식)
  private convertToGrid(lat: number, lng: number): { nx: number; ny: number } {
    const RE = 6371.00877; // 지구 반경(km)
    const GRID = 5.0; // 격자 간격(km)
    const SLAT1 = 30.0; // 투영 위도1(degree)
    const SLAT2 = 60.0; // 투영 위도2(degree)
    const OLON = 126.0; // 기준점 경도(degree)
    const OLAT = 38.0; // 기준점 위도(degree)
    const XO = 43; // 기준점 X좌표(GRID)
    const YO = 136; // 기준점 Y좌표(GRID)

    const DEGRAD = Math.PI / 180.0;

    const re = RE / GRID;
    const slat1 = SLAT1 * DEGRAD;
    const slat2 = SLAT2 * DEGRAD;
    const olon = OLON * DEGRAD;
    const olat = OLAT * DEGRAD;

    let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
    let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
    let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
    ro = (re * sf) / Math.pow(ro, sn);

    let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
    ra = (re * sf) / Math.pow(ra, sn);
    let theta = lng * DEGRAD - olon;
    if (theta > Math.PI) theta -= 2.0 * Math.PI;
    if (theta < -Math.PI) theta += 2.0 * Math.PI;
    theta *= sn;

    const nx = Math.floor(ra * Math.sin(theta) + XO + 0.5);
    const ny = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);

    return { nx, ny };
  }

  // 초단기실황 기준 시각 계산 (매시 정각, 40분 이후 생성)
  private getBaseDateTime(): { baseDate: string; baseTime: string } {
    const now = new Date();
    // 40분 전 시각 기준
    now.setMinutes(now.getMinutes() - 40);

    const baseDate = this.formatDate(now);
    const baseTime = `${String(now.getHours()).padStart(2, '0')}00`;

    return { baseDate, baseTime };
  }

  // 단기예보 기준 시각 계산 (02, 05, 08, 11, 14, 17, 20, 23시)
  private getForecastBaseDateTime(): { forecastBaseDate: string; forecastBaseTime: string } {
    const now = new Date();
    const hour = now.getHours();

    // 단기예보 발표 시각: 02, 05, 08, 11, 14, 17, 20, 23시
    const baseTimes = [2, 5, 8, 11, 14, 17, 20, 23];

    // 현재 시간보다 이전의 가장 최근 발표 시각 찾기
    let baseHour = baseTimes[0];
    let baseDate = now;

    for (let i = baseTimes.length - 1; i >= 0; i--) {
      if (hour >= baseTimes[i] + 1) { // 발표 후 약 1시간 후 데이터 사용 가능
        baseHour = baseTimes[i];
        break;
      }
    }

    // 02시 발표 전이면 전날 23시 데이터 사용
    if (hour < 3) {
      baseDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      baseHour = 23;
    }

    return {
      forecastBaseDate: this.formatDate(baseDate),
      forecastBaseTime: `${String(baseHour).padStart(2, '0')}00`,
    };
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  private getTimeSlot(hour: number): string {
    if (hour >= 6 && hour < 12) return '오전';
    if (hour >= 12 && hour < 18) return '오후';
    return '저녁';
  }

  // 좌표로 지역명 추정 (간단 버전)
  private getLocationName(lat: number, lng: number): string {
    // 서울 중심 좌표 기준 간단 판단
    if (lat >= 37.4 && lat <= 37.7 && lng >= 126.8 && lng <= 127.2) {
      return '서울';
    }
    if (lat >= 37.3 && lat <= 37.5 && lng >= 126.9 && lng <= 127.1) {
      return '강남';
    }
    return '현재위치';
  }
}
