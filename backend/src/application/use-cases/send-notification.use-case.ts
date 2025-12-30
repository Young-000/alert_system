import { Inject, NotFoundException } from '@nestjs/common';
import { IAlertRepository } from '@domain/repositories/alert.repository';
import { IUserRepository } from '@domain/repositories/user.repository';
import { IPushSubscriptionRepository } from '@domain/repositories/push-subscription.repository';
import { IWeatherApiClient } from '@infrastructure/external-apis/weather-api.client';
import { IAirQualityApiClient } from '@infrastructure/external-apis/air-quality-api.client';
import { IBusApiClient } from '@infrastructure/external-apis/bus-api.client';
import { ISubwayApiClient } from '@infrastructure/external-apis/subway-api.client';
import { IPushNotificationService } from '@infrastructure/push/push-notification.service';
import { AlertType } from '@domain/entities/alert.entity';

export class SendNotificationUseCase {
  constructor(
    @Inject('IAlertRepository') private alertRepository: IAlertRepository,
    @Inject('IUserRepository') private userRepository: IUserRepository,
    @Inject('IPushSubscriptionRepository') private pushSubscriptionRepository: IPushSubscriptionRepository,
    @Inject('IWeatherApiClient') private weatherApiClient: IWeatherApiClient,
    @Inject('IAirQualityApiClient') private airQualityApiClient: IAirQualityApiClient,
    @Inject('IBusApiClient') private busApiClient: IBusApiClient,
    @Inject('ISubwayApiClient') private subwayApiClient: ISubwayApiClient,
    @Inject('IPushNotificationService') private pushNotificationService: IPushNotificationService
  ) {}

  async execute(alertId: string): Promise<void> {
    const alert = await this.alertRepository.findById(alertId);
    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    if (!alert.enabled) {
      return;
    }

    const user = await this.userRepository.findById(alert.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.location) {
      throw new NotFoundException('User location not found');
    }

    const data: any = {};

    if (alert.alertTypes.includes(AlertType.WEATHER)) {
      const weather = await this.weatherApiClient.getWeather(
        user.location.lat,
        user.location.lng
      );
      data.weather = weather;
    }

    if (alert.alertTypes.includes(AlertType.AIR_QUALITY)) {
      const airQuality = await this.airQualityApiClient.getAirQuality(
        user.location.lat,
        user.location.lng
      );
      data.airQuality = airQuality;
    }

    if (alert.alertTypes.includes(AlertType.BUS) && alert.busStopId) {
      const busArrivals = await this.busApiClient.getBusArrival(alert.busStopId);
      data.busArrivals = busArrivals;
    }

    if (alert.alertTypes.includes(AlertType.SUBWAY) && alert.subwayStationId) {
      const subwayArrivals = await this.subwayApiClient.getSubwayArrival(alert.subwayStationId);
      data.subwayArrivals = subwayArrivals;
    }

    const subscriptions = await this.pushSubscriptionRepository.findByUserId(user.id);
    
    if (subscriptions.length === 0) {
      return;
    }

    const payload = JSON.stringify({
      title: alert.name,
      body: JSON.stringify(data),
    });

    for (const subscription of subscriptions) {
      try {
        await this.pushNotificationService.sendNotification(subscription, payload);
      } catch (error) {
        console.error(`Failed to send notification to ${subscription.endpoint}:`, error);
      }
    }
  }
}

