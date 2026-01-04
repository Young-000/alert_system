import { Inject, NotFoundException } from '@nestjs/common';
import { IAlertRepository } from '@domain/repositories/alert.repository';
import { IUserRepository } from '@domain/repositories/user.repository';
import { IWeatherApiClient } from '@infrastructure/external-apis/weather-api.client';
import { IAirQualityApiClient } from '@infrastructure/external-apis/air-quality-api.client';
import { IBusApiClient } from '@infrastructure/external-apis/bus-api.client';
import { ISubwayApiClient } from '@infrastructure/external-apis/subway-api.client';
import { IPushNotificationService } from '@infrastructure/push/push-notification.service';
import { AlertType } from '@domain/entities/alert.entity';
import { IPushSubscriptionRepository } from '@domain/repositories/push-subscription.repository';
import { ISubwayStationRepository } from '@domain/repositories/subway-station.repository';
import { Weather } from '@domain/entities/weather.entity';
import { AirQuality } from '@domain/entities/air-quality.entity';
import { BusArrival } from '@domain/entities/bus-arrival.entity';
import { SubwayArrival } from '@domain/entities/subway-arrival.entity';

interface NotificationData {
  weather?: Weather;
  airQuality?: AirQuality;
  busArrivals?: BusArrival[];
  subwayArrivals?: SubwayArrival[];
  subwayStationName?: string;
}

export class SendNotificationUseCase {
  constructor(
    @Inject('IAlertRepository') private alertRepository: IAlertRepository,
    @Inject('IUserRepository') private userRepository: IUserRepository,
    @Inject('IWeatherApiClient') private weatherApiClient: IWeatherApiClient,
    @Inject('IAirQualityApiClient')
    private airQualityApiClient: IAirQualityApiClient,
    @Inject('IBusApiClient') private busApiClient: IBusApiClient,
    @Inject('ISubwayApiClient') private subwayApiClient: ISubwayApiClient,
    @Inject('IPushNotificationService')
    private pushNotificationService: IPushNotificationService,
    @Inject('IPushSubscriptionRepository')
    private pushSubscriptionRepository: IPushSubscriptionRepository,
    @Inject('ISubwayStationRepository')
    private subwayStationRepository: ISubwayStationRepository,
  ) {}

  async execute(alertId: string): Promise<void> {
    const alert = await this.alertRepository.findById(alertId);
    if (!alert) {
      throw new NotFoundException('알림을 찾을 수 없습니다.');
    }

    if (!alert.enabled) {
      return;
    }

    const user = await this.userRepository.findById(alert.userId);
    if (!user || !user.location) {
      throw new NotFoundException('사용자 위치 정보를 찾을 수 없습니다.');
    }

    const data: NotificationData = {};

    if (alert.alertTypes.includes(AlertType.WEATHER)) {
      const weather = await this.weatherApiClient.getWeather(
        user.location.lat,
        user.location.lng,
      );
      data.weather = weather;
    }

    if (alert.alertTypes.includes(AlertType.AIR_QUALITY)) {
      const airQuality = await this.airQualityApiClient.getAirQuality(
        user.location.lat,
        user.location.lng,
      );
      data.airQuality = airQuality;
    }

    if (alert.alertTypes.includes(AlertType.BUS) && alert.busStopId) {
      const busArrivals = await this.busApiClient.getBusArrival(
        alert.busStopId,
      );
      data.busArrivals = busArrivals;
    }

    if (alert.alertTypes.includes(AlertType.SUBWAY) && alert.subwayStationId) {
      const station = await this.subwayStationRepository.findById(
        alert.subwayStationId,
      );
      const stationName = station?.name;
      if (stationName) {
        const subwayArrivals =
          await this.subwayApiClient.getSubwayArrival(stationName);
        data.subwayArrivals = subwayArrivals;
        data.subwayStationName = stationName;
      }
    }

    const payload = JSON.stringify({
      title: alert.name,
      body: this.buildNotificationBody(data),
      data,
    });

    const subscriptions = await this.pushSubscriptionRepository.findByUserId(
      user.id,
    );
    if (subscriptions.length === 0) {
      return;
    }

    for (const subscription of subscriptions) {
      await this.pushNotificationService.sendNotification(
        { endpoint: subscription.endpoint, keys: subscription.keys },
        payload,
      );
    }
  }

  private buildNotificationBody(data: NotificationData): string {
    const parts: string[] = [];

    if (data.weather) {
      const rainNote = data.weather.condition?.toLowerCase().includes('rain')
        ? 'rain'
        : 'clear';
      parts.push(`Weather ${rainNote}, ${data.weather.temperature}C`);
    }

    if (data.airQuality) {
      parts.push(`Air ${data.airQuality.status} (PM10 ${data.airQuality.pm10})`);
    }

    if (data.subwayArrivals && data.subwayArrivals.length > 0) {
      const first = data.subwayArrivals[0];
      const stationName = data.subwayStationName || 'Subway';
      parts.push(`${stationName} ${first.arrivalTime}min`);
    }

    return parts.length > 0 ? parts.join(' · ') : 'New alert available';
  }
}
