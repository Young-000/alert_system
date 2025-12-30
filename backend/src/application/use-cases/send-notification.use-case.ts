import { IAlertRepository } from '@domain/repositories/alert.repository';
import { IUserRepository } from '@domain/repositories/user.repository';
import { IWeatherApiClient } from '@infrastructure/external-apis/weather-api.client';
import { IAirQualityApiClient } from '@infrastructure/external-apis/air-quality-api.client';
import { IBusApiClient } from '@infrastructure/external-apis/bus-api.client';
import { ISubwayApiClient } from '@infrastructure/external-apis/subway-api.client';
import { IPushNotificationService } from '@infrastructure/push/push-notification.service';
import { AlertType } from '@domain/entities/alert.entity';

export class SendNotificationUseCase {
  constructor(
    private alertRepository: IAlertRepository,
    private userRepository: IUserRepository,
    private weatherApiClient: IWeatherApiClient,
    private airQualityApiClient: IAirQualityApiClient,
    private busApiClient: IBusApiClient,
    private subwayApiClient: ISubwayApiClient,
    private pushNotificationService: IPushNotificationService
  ) {}

  async execute(alertId: string): Promise<void> {
    const alert = await this.alertRepository.findById(alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }

    if (!alert.enabled) {
      return;
    }

    const user = await this.userRepository.findById(alert.userId);
    if (!user || !user.location) {
      throw new Error('User location not found');
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

    const payload = JSON.stringify({
      title: alert.name,
      body: JSON.stringify(data),
    });

    // TODO: Get push subscription from database
    // For now, this is a placeholder
    // const subscription = await this.getPushSubscription(user.id);
    // await this.pushNotificationService.sendNotification(subscription, payload);
  }
}

