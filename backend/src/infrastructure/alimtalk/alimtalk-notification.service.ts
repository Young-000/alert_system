import {
  IKakaoAlimtalkClient,
  AlimtalkMessage,
  AlimtalkResult,
} from '../external-apis/kakao-alimtalk.client';

// 알림 템플릿 코드 (카카오 비즈니스에서 승인받은 템플릿)
export const ALIMTALK_TEMPLATES = {
  // 날씨 + 미세먼지 알림
  WEATHER_ALERT: 'WEATHER_001',
  // 출근길 교통 알림
  COMMUTE_MORNING: 'TRAFFIC_001',
  // 퇴근길 교통 알림
  COMMUTE_EVENING: 'TRAFFIC_002',
  // 통합 알림 (날씨 + 교통)
  DAILY_ALERT: 'DAILY_001',
} as const;

export interface WeatherAlertData {
  userName: string;
  date: string;
  temperature: string;
  weather: string;
  pm10: string;
  pm25: string;
  airQualityStatus: string;
}

export interface TrafficAlertData {
  userName: string;
  busInfo?: string;
  subwayInfo?: string;
  estimatedTime?: string;
}

export interface DailyAlertData extends WeatherAlertData, TrafficAlertData {}

export interface IAlimtalkNotificationService {
  sendWeatherAlert(phoneNumber: string, data: WeatherAlertData): Promise<AlimtalkResult>;
  sendTrafficAlert(phoneNumber: string, data: TrafficAlertData): Promise<AlimtalkResult>;
  sendDailyAlert(phoneNumber: string, data: DailyAlertData): Promise<AlimtalkResult>;
}

export class AlimtalkNotificationService implements IAlimtalkNotificationService {
  constructor(private alimtalkClient: IKakaoAlimtalkClient) {}

  async sendWeatherAlert(
    phoneNumber: string,
    data: WeatherAlertData
  ): Promise<AlimtalkResult> {
    const message: AlimtalkMessage = {
      to: phoneNumber,
      templateCode: ALIMTALK_TEMPLATES.WEATHER_ALERT,
      variables: {
        userName: data.userName,
        date: data.date,
        temperature: data.temperature,
        weather: data.weather,
        pm10: data.pm10,
        pm25: data.pm25,
        airQualityStatus: data.airQualityStatus,
      },
    };

    return this.alimtalkClient.sendAlimtalk(message);
  }

  async sendTrafficAlert(
    phoneNumber: string,
    data: TrafficAlertData
  ): Promise<AlimtalkResult> {
    const message: AlimtalkMessage = {
      to: phoneNumber,
      templateCode: ALIMTALK_TEMPLATES.COMMUTE_MORNING,
      variables: {
        userName: data.userName,
        busInfo: data.busInfo || '정보 없음',
        subwayInfo: data.subwayInfo || '정보 없음',
        estimatedTime: data.estimatedTime || '-',
      },
    };

    return this.alimtalkClient.sendAlimtalk(message);
  }

  async sendDailyAlert(
    phoneNumber: string,
    data: DailyAlertData
  ): Promise<AlimtalkResult> {
    const message: AlimtalkMessage = {
      to: phoneNumber,
      templateCode: ALIMTALK_TEMPLATES.DAILY_ALERT,
      variables: {
        userName: data.userName,
        date: data.date,
        temperature: data.temperature,
        weather: data.weather,
        pm10: data.pm10,
        pm25: data.pm25,
        airQualityStatus: data.airQualityStatus,
        busInfo: data.busInfo || '정보 없음',
        subwayInfo: data.subwayInfo || '정보 없음',
      },
    };

    return this.alimtalkClient.sendAlimtalk(message);
  }
}
