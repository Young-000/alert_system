import axios, { AxiosInstance } from 'axios';
import { AirQuality } from '@domain/entities/air-quality.entity';

export interface IAirQualityApiClient {
  getAirQuality(lat: number, lng: number): Promise<AirQuality>;
}

export class AirQualityApiClient implements IAirQualityApiClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: 'https://apis.data.go.kr/B552584/ArpltnInforInqireSvc',
    });
  }

  async getAirQuality(lat: number, lng: number): Promise<AirQuality> {
    try {
      // 위도/경도로 시도명 결정 (간단한 로직, 필요시 개선)
      const sidoName = this.getSidoName(lat, lng);

      // 공공데이터 API는 serviceKey를 URL에 직접 포함해야 함
      const response = await this.client.get('/getCtprvnRltmMesureDnsty', {
        params: {
          serviceKey: this.apiKey,
          returnType: 'json',
          numOfRows: 1,
          pageNo: 1,
          sidoName: sidoName,
          ver: '1.0',
        },
        // paramsSerializer로 serviceKey를 인코딩하지 않도록 설정
        paramsSerializer: (params) => {
          const searchParams = new URLSearchParams();
          Object.keys(params).forEach((key) => {
            searchParams.append(key, params[key]);
          });
          return searchParams.toString();
        },
      });

      if (!response.data.response || !response.data.response.body || !response.data.response.body.items) {
        throw new Error('Invalid API response structure');
      }

      const items = response.data.response.body.items;
      if (!items || items.length === 0) {
        throw new Error('No air quality data found');
      }

      const item = items[0];
      
      // 값이 '-'인 경우 처리
      const pm10Value = item.pm10Value === '-' || !item.pm10Value ? '0' : item.pm10Value;
      const pm25Value = item.pm25Value === '-' || !item.pm25Value ? '0' : item.pm25Value;

      const pm10 = parseFloat(pm10Value);
      const pm25 = parseFloat(pm25Value);
      const aqi = this.calculateAQI(pm10, pm25);
      const status = this.getStatus(aqi);

      return new AirQuality(
        item.stationName || sidoName,
        pm10,
        pm25,
        aqi,
        status
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`미세먼지 정보를 가져오는데 실패했습니다: ${message}`);
    }
  }

  private getSidoName(lat: number, lng: number): string {
    // 간단한 지역 판단 로직 (필요시 개선)
    // 서울: 37.5~37.7, 126.9~127.1
    if (lat >= 37.4 && lat <= 37.7 && lng >= 126.8 && lng <= 127.2) {
      return '서울';
    }
    // 경기: 37.0~38.0, 126.5~127.5
    if (lat >= 37.0 && lat <= 38.0 && lng >= 126.5 && lng <= 127.5) {
      return '경기';
    }
    // 인천: 37.4~37.6, 126.5~126.8
    if (lat >= 37.4 && lat <= 37.6 && lng >= 126.5 && lng <= 126.8) {
      return '인천';
    }
    // 기본값: 서울
    return '서울';
  }

  private calculateAQI(pm10: number, pm25: number): number {
    return Math.max(pm10 / 50, pm25 / 25) * 50;
  }

  private getStatus(aqi: number): string {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive';
    return 'Unhealthy';
  }
}

