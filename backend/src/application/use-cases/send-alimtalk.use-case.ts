import { IAlertRepository } from '@domain/repositories/alert.repository';
import { IUserRepository } from '@domain/repositories/user.repository';
import { IWeatherApiClient } from '@infrastructure/external-apis/weather-api.client';
import { IAirQualityApiClient } from '@infrastructure/external-apis/air-quality-api.client';
import { IBusApiClient } from '@infrastructure/external-apis/bus-api.client';
import { ISubwayApiClient } from '@infrastructure/external-apis/subway-api.client';
import {
  IAlimtalkNotificationService,
  DailyAlertData,
} from '@infrastructure/alimtalk/alimtalk-notification.service';
import { AlertType } from '@domain/entities/alert.entity';
import { AlimtalkResult } from '@infrastructure/external-apis/kakao-alimtalk.client';

export interface SendAlimtalkInput {
  alertId: string;
}

export interface SendAlimtalkOutput {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class SendAlimtalkUseCase {
  constructor(
    private alertRepository: IAlertRepository,
    private userRepository: IUserRepository,
    private weatherApiClient: IWeatherApiClient,
    private airQualityApiClient: IAirQualityApiClient,
    private busApiClient: IBusApiClient,
    private subwayApiClient: ISubwayApiClient,
    private alimtalkService: IAlimtalkNotificationService
  ) {}

  async execute(input: SendAlimtalkInput): Promise<SendAlimtalkOutput> {
    const alert = await this.alertRepository.findById(input.alertId);
    if (!alert) {
      return { success: false, error: 'Alert not found' };
    }

    if (!alert.enabled) {
      return { success: false, error: 'Alert is disabled' };
    }

    const user = await this.userRepository.findById(alert.userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (!user.phoneNumber) {
      return { success: false, error: 'User phone number not found' };
    }

    if (!user.location) {
      return { success: false, error: 'User location not found' };
    }

    // 데이터 수집
    const alertData = await this.collectAlertData(alert, user);

    // 알림톡 발송
    const result = await this.alimtalkService.sendDailyAlert(
      user.phoneNumber,
      alertData
    );

    return {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    };
  }

  private async collectAlertData(alert: any, user: any): Promise<DailyAlertData> {
    const today = new Date();
    const dateStr = `${today.getMonth() + 1}월 ${today.getDate()}일`;

    const data: DailyAlertData = {
      userName: user.name,
      date: dateStr,
      temperature: '-',
      weather: '-',
      pm10: '-',
      pm25: '-',
      airQualityStatus: '-',
    };

    // 날씨 정보
    if (alert.alertTypes.includes(AlertType.WEATHER)) {
      try {
        const weather = await this.weatherApiClient.getWeather(
          user.location.lat,
          user.location.lng
        );
        data.temperature = `${weather.temperature}°C`;
        data.weather = weather.condition;
      } catch (error) {
        console.error('Failed to fetch weather:', error);
      }
    }

    // 미세먼지 정보
    if (alert.alertTypes.includes(AlertType.AIR_QUALITY)) {
      try {
        const airQuality = await this.airQualityApiClient.getAirQuality(
          user.location.lat,
          user.location.lng
        );
        data.pm10 = `${airQuality.pm10}㎍/㎥`;
        data.pm25 = `${airQuality.pm25}㎍/㎥`;
        data.airQualityStatus = this.getAirQualityStatusKorean(airQuality.status);
      } catch (error) {
        console.error('Failed to fetch air quality:', error);
      }
    }

    // 버스 정보
    if (alert.alertTypes.includes(AlertType.BUS) && alert.busStopId) {
      try {
        const busArrivals = await this.busApiClient.getBusArrival(alert.busStopId);
        if (busArrivals.length > 0) {
          data.busInfo = busArrivals
            .slice(0, 3)
            .map((b) => `${b.routeName}: ${b.arrivalTime}분`)
            .join(', ');
        }
      } catch (error) {
        console.error('Failed to fetch bus arrivals:', error);
      }
    }

    // 지하철 정보
    if (alert.alertTypes.includes(AlertType.SUBWAY) && alert.subwayStationId) {
      try {
        const subwayArrivals = await this.subwayApiClient.getSubwayArrival(
          alert.subwayStationId
        );
        if (subwayArrivals.length > 0) {
          data.subwayInfo = subwayArrivals
            .slice(0, 3)
            .map((s) => `${s.lineId} ${s.direction}: ${s.arrivalTime}분`)
            .join(', ');
        }
      } catch (error) {
        console.error('Failed to fetch subway arrivals:', error);
      }
    }

    return data;
  }

  private getAirQualityStatusKorean(status: string): string {
    const statusMap: Record<string, string> = {
      Good: '좋음',
      Moderate: '보통',
      'Unhealthy for Sensitive': '민감군 주의',
      Unhealthy: '나쁨',
      'Very Unhealthy': '매우 나쁨',
      Hazardous: '위험',
    };
    return statusMap[status] || status;
  }
}
