import { Inject, Injectable, NotFoundException, Optional, Logger } from '@nestjs/common';
import { IAlertRepository } from '@domain/repositories/alert.repository';
import { IUserRepository } from '@domain/repositories/user.repository';
import { IWeatherApiClient } from '@infrastructure/external-apis/weather-api.client';
import { IAirQualityApiClient } from '@infrastructure/external-apis/air-quality-api.client';
import { IBusApiClient } from '@infrastructure/external-apis/bus-api.client';
import { ISubwayApiClient } from '@infrastructure/external-apis/subway-api.client';
import { AlertType } from '@domain/entities/alert.entity';
import { ISubwayStationRepository } from '@domain/repositories/subway-station.repository';
import { Weather } from '@domain/entities/weather.entity';
import { AirQuality } from '@domain/entities/air-quality.entity';
import { BusArrival } from '@domain/entities/bus-arrival.entity';
import { SubwayArrival } from '@domain/entities/subway-arrival.entity';
import { NotificationContextBuilder } from '@domain/entities/notification-context.entity';
import { RuleCategory } from '@domain/entities/notification-rule.entity';
import { IRuleEngine, RULE_ENGINE } from '@domain/services/rule-engine.service';
import { ISmartMessageBuilder, SMART_MESSAGE_BUILDER } from '@application/services/smart-message-builder.service';
import { INotificationRuleRepository, NOTIFICATION_RULE_REPOSITORY } from '@domain/repositories/notification-rule.repository';
import { Recommendation } from '@domain/entities/recommendation.entity';
import { ISolapiService, SOLAPI_SERVICE, WeatherAlimtalkVariables } from '@infrastructure/messaging/solapi.service';

interface NotificationData {
  weather?: Weather;
  airQuality?: AirQuality;
  busArrivals?: BusArrival[];
  subwayArrivals?: SubwayArrival[];
  subwayStationName?: string;
  recommendations?: Recommendation[];
}

@Injectable()
export class SendNotificationUseCase {
  private readonly logger = new Logger(SendNotificationUseCase.name);

  constructor(
    @Inject('IAlertRepository') private alertRepository: IAlertRepository,
    @Inject('IUserRepository') private userRepository: IUserRepository,
    @Inject('IWeatherApiClient') private weatherApiClient: IWeatherApiClient,
    @Inject('IAirQualityApiClient')
    private airQualityApiClient: IAirQualityApiClient,
    @Inject('IBusApiClient') private busApiClient: IBusApiClient,
    @Inject('ISubwayApiClient') private subwayApiClient: ISubwayApiClient,
    @Inject('ISubwayStationRepository')
    private subwayStationRepository: ISubwayStationRepository,
    // Smart Notification dependencies (optional for backward compatibility)
    @Optional() @Inject(RULE_ENGINE) private ruleEngine?: IRuleEngine,
    @Optional() @Inject(SMART_MESSAGE_BUILDER) private smartMessageBuilder?: ISmartMessageBuilder,
    @Optional() @Inject(NOTIFICATION_RULE_REPOSITORY) private ruleRepository?: INotificationRuleRepository,
    // Solapi Alimtalk service
    @Optional() @Inject(SOLAPI_SERVICE) private solapiService?: ISolapiService,
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

    // Build notification context
    const contextBuilder = NotificationContextBuilder.create(user.id, alertId);
    const data: NotificationData = {};

    if (alert.alertTypes.includes(AlertType.WEATHER)) {
      const weather = await this.weatherApiClient.getWeather(
        user.location.lat,
        user.location.lng,
      );
      data.weather = weather;
      contextBuilder.withWeather(weather);
    }

    if (alert.alertTypes.includes(AlertType.AIR_QUALITY)) {
      const airQuality = await this.airQualityApiClient.getAirQuality(
        user.location.lat,
        user.location.lng,
      );
      data.airQuality = airQuality;
      contextBuilder.withAirQuality(airQuality);
    }

    if (alert.alertTypes.includes(AlertType.BUS) && alert.busStopId) {
      const busArrivals = await this.busApiClient.getBusArrival(
        alert.busStopId,
      );
      data.busArrivals = busArrivals;
      contextBuilder.withBusArrivals(busArrivals);
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
        contextBuilder.withSubwayArrivals(subwayArrivals, stationName);
      }
    }

    const context = contextBuilder.build();

    // Smart notification: evaluate rules and build message
    let title = alert.name;
    let body: string;
    let recommendations: Recommendation[] = [];

    if (this.ruleEngine && this.smartMessageBuilder && this.ruleRepository) {
      try {
        const categories = this.getRelevantCategories(alert.alertTypes);
        const rules = await this.ruleRepository.findByCategories(categories);

        recommendations = this.ruleEngine.evaluate(context, rules);
        data.recommendations = recommendations;

        title = this.smartMessageBuilder.buildTitle(context);
        body = this.smartMessageBuilder.build(context, recommendations);

        this.logger.log(`Smart notification: ${recommendations.length} recommendations generated`);
      } catch (error) {
        this.logger.warn(`Smart notification failed, falling back: ${error}`);
        body = this.buildNotificationBody(data);
      }
    } else {
      // Fallback to legacy message builder
      body = this.buildNotificationBody(data);
    }

    // Send Alimtalk if user has phone number and weather data is available
    if (this.solapiService && user.phoneNumber && data.weather) {
      try {
        const variables = this.buildAlimtalkVariables(user.name, data);
        await this.solapiService.sendWeatherAlert(user.phoneNumber, variables);
        this.logger.log(`Alimtalk sent to ${user.phoneNumber}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to send Alimtalk: ${errorMessage}`);
      }
    } else if (!user.phoneNumber) {
      this.logger.warn(`User ${user.id} has no phone number, skipping notification`);
    } else if (!data.weather) {
      this.logger.warn(`No weather data available for alert ${alertId}`);
    }
  }

  private getRelevantCategories(alertTypes: AlertType[]): RuleCategory[] {
    const categories: RuleCategory[] = [];

    if (alertTypes.includes(AlertType.WEATHER)) {
      categories.push(RuleCategory.WEATHER);
    }
    if (alertTypes.includes(AlertType.AIR_QUALITY)) {
      categories.push(RuleCategory.AIR_QUALITY);
    }
    if (alertTypes.includes(AlertType.BUS) || alertTypes.includes(AlertType.SUBWAY)) {
      categories.push(RuleCategory.TRANSIT);
    }
    if (alertTypes.includes(AlertType.BUS) && alertTypes.includes(AlertType.SUBWAY)) {
      categories.push(RuleCategory.TRANSIT_COMPARISON);
    }

    return categories;
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

  private buildAlimtalkVariables(userName: string, data: NotificationData): WeatherAlimtalkVariables {
    const weather = data.weather;
    const airQuality = data.airQuality;

    // Generate tip based on weather and air quality
    const tip = this.generateTip(weather, airQuality);

    return {
      userName,
      temperature: weather ? `${Math.round(weather.temperature)}°C` : '-',
      condition: weather?.condition || '정보 없음',
      airLevel: airQuality?.status || '정보 없음',
      humidity: weather ? `${weather.humidity}%` : '-',
      tip,
    };
  }

  private generateTip(weather?: Weather, airQuality?: AirQuality): string {
    const tips: string[] = [];

    // Weather-based tips
    if (weather) {
      const condition = weather.condition?.toLowerCase() || '';
      const temp = weather.temperature;

      if (condition.includes('rain') || condition.includes('비')) {
        tips.push('우산을 챙기세요! ☔');
      } else if (condition.includes('snow') || condition.includes('눈')) {
        tips.push('눈이 와요, 따뜻하게 입으세요! ❄️');
      }

      if (temp <= 5) {
        tips.push('많이 추워요, 두꺼운 외투 필수! 🧥');
      } else if (temp <= 10) {
        tips.push('쌀쌀해요, 겉옷을 챙기세요.');
      } else if (temp >= 30) {
        tips.push('폭염 주의! 시원하게 입으세요. 🌡️');
      } else if (temp >= 25) {
        tips.push('더워요, 가볍게 입으세요.');
      }
    }

    // Air quality-based tips
    if (airQuality) {
      const status = airQuality.status?.toLowerCase() || '';

      if (status === '나쁨' || status.includes('bad')) {
        tips.push('미세먼지가 나빠요, 마스크 필수! 😷');
      } else if (status === '매우나쁨' || status.includes('very bad')) {
        tips.push('미세먼지 매우 나쁨! 외출을 자제하세요. 🚫');
      }
    }

    return tips.length > 0 ? tips.join(' ') : '좋은 하루 보내세요! 😊';
  }
}
