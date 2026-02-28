import { Inject, Injectable, NotFoundException, Optional, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IAlertRepository } from '@domain/repositories/alert.repository';
import { IUserRepository } from '@domain/repositories/user.repository';
import { IWeatherApiClient } from '@infrastructure/external-apis/weather-api.client';
import { IAirQualityApiClient } from '@infrastructure/external-apis/air-quality-api.client';
import { IBusApiClient } from '@infrastructure/external-apis/bus-api.client';
import { ISubwayApiClient } from '@infrastructure/external-apis/subway-api.client';
import { Alert, AlertType } from '@domain/entities/alert.entity';
import { ISubwayStationRepository } from '@domain/repositories/subway-station.repository';
import {
  ICommuteRouteRepository,
  COMMUTE_ROUTE_REPOSITORY,
} from '@domain/repositories/commute-route.repository';
import { SubwayArrival } from '@domain/entities/subway-arrival.entity';
import { NotificationContext, NotificationContextBuilder } from '@domain/entities/notification-context.entity';
import { RuleCategory } from '@domain/entities/notification-rule.entity';
import { IRuleEngine, RULE_ENGINE } from '@domain/services/rule-engine.service';
import { ISmartMessageBuilder, SMART_MESSAGE_BUILDER } from '@application/services/smart-message-builder.service';
import { INotificationRuleRepository, NOTIFICATION_RULE_REPOSITORY } from '@domain/repositories/notification-rule.repository';
import { RecommendBestRouteUseCase } from './recommend-best-route.use-case';
import { Repository } from 'typeorm';
import { NotificationLogEntity } from '@infrastructure/persistence/typeorm/notification-log.entity';
import { IWebPushService, WEB_PUSH_SERVICE } from '@infrastructure/messaging/web-push.service';
import { IExpoPushService, EXPO_PUSH_SERVICE } from '@infrastructure/messaging/expo-push.service';
import {
  ISolapiService,
  SOLAPI_SERVICE,
  AlertTimeType,
} from '@infrastructure/messaging/solapi.service';
import { NotificationMessageBuilderService, NotificationData } from '@application/services/notification-message-builder.service';

// B-7: Delay detection threshold — if all arrivals exceed this, suspect delay
const DELAY_THRESHOLD_SECONDS = 600; // 10 minutes

interface DelayInfo {
  stationName: string;
  type: 'no_arrivals' | 'long_wait';
}

@Injectable()
export class SendNotificationUseCase {
  private readonly logger = new Logger(SendNotificationUseCase.name);

  constructor(
    @Inject('IAlertRepository') private alertRepository: IAlertRepository,
    @Inject('IUserRepository') private userRepository: IUserRepository,
    @Inject('IWeatherApiClient') private weatherApiClient: IWeatherApiClient,
    @Inject('IAirQualityApiClient') private airQualityApiClient: IAirQualityApiClient,
    @Inject('IBusApiClient') private busApiClient: IBusApiClient,
    @Inject('ISubwayApiClient') private subwayApiClient: ISubwayApiClient,
    @Inject('ISubwayStationRepository') private subwayStationRepository: ISubwayStationRepository,
    private messageBuilder: NotificationMessageBuilderService,
    @Optional() @Inject(COMMUTE_ROUTE_REPOSITORY) private routeRepository?: ICommuteRouteRepository,
    @Optional() private recommendBestRouteUseCase?: RecommendBestRouteUseCase,
    @Optional() @Inject(RULE_ENGINE) private ruleEngine?: IRuleEngine,
    @Optional() @Inject(SMART_MESSAGE_BUILDER) private smartMessageBuilder?: ISmartMessageBuilder,
    @Optional() @Inject(NOTIFICATION_RULE_REPOSITORY) private ruleRepository?: INotificationRuleRepository,
    @Optional() @Inject(SOLAPI_SERVICE) private solapiService?: ISolapiService,
    @Optional() @InjectRepository(NotificationLogEntity) private notificationLogRepo?: Repository<NotificationLogEntity>,
    @Optional() @Inject(WEB_PUSH_SERVICE) private webPushService?: IWebPushService,
    @Optional() @Inject(EXPO_PUSH_SERVICE) private expoPushService?: IExpoPushService,
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
    const contextBuilder = NotificationContextBuilder.create(user.id, alertId);

    // 데이터 수집 — weather/transit/route를 병렬로 호출 (독립적 API)
    await Promise.all([
      this.collectWeatherData(alert, user.location, data, contextBuilder),
      this.collectTransitData(alert, data),
      this.collectRouteData(alert, data),
    ]);
    // smart notification은 weather context에 의존하므로 순차 실행
    await this.collectSmartNotificationData(alert, contextBuilder.build(), data);

    // 알림톡 발송
    if (!this.solapiService || !user.phoneNumber) {
      if (!user.phoneNumber) {
        this.logger.warn(`User ${user.id} has no phone number`);
      }
      return;
    }

    const timeType = this.determineTimeType(alert);
    const logSummary = this.messageBuilder.buildSummary(data);

    try {
      await this.sendNotification(user.name, user.phoneNumber, alert, data, timeType);
      await this.saveNotificationLog(alert, 'success', logSummary);
      this.sendWebPush(alert, logSummary);
      this.sendExpoPush(alert, logSummary);
    } catch (error) {
      await this.handleSendFailure(error, alert, user.name, user.phoneNumber, data, logSummary);
    }
  }

  private async collectWeatherData(
    alert: Alert,
    location: { lat: number; lng: number },
    data: NotificationData,
    contextBuilder: NotificationContextBuilder,
  ): Promise<void> {
    const tasks: Promise<void>[] = [];

    if (alert.alertTypes.includes(AlertType.WEATHER)) {
      tasks.push(
        this.weatherApiClient.getWeatherWithForecast(location.lat, location.lng)
          .then((weather) => { data.weather = weather; contextBuilder.withWeather(weather); })
          .catch((error) => { this.logger.warn(`날씨 API 호출 실패 (계속 진행): ${error instanceof Error ? error.message : error}`); }),
      );
    }

    if (alert.alertTypes.includes(AlertType.AIR_QUALITY)) {
      tasks.push(
        this.airQualityApiClient.getAirQuality(location.lat, location.lng)
          .then((airQuality) => { data.airQuality = airQuality; contextBuilder.withAirQuality(airQuality); })
          .catch((error) => { this.logger.warn(`미세먼지 API 호출 실패 (계속 진행): ${error instanceof Error ? error.message : error}`); }),
      );
    }

    await Promise.all(tasks);
  }

  private async collectTransitData(alert: Alert, data: NotificationData): Promise<void> {
    if (alert.alertTypes.includes(AlertType.SUBWAY) && alert.subwayStationId) {
      try {
        data.subwayStations = await this.collectSubwayData(alert.subwayStationId);

        // B-7: Detect subway delays and send urgent push notifications
        if (data.subwayStations.length > 0 && (this.webPushService || this.expoPushService)) {
          const delayInfo = this.detectSubwayDelay(data.subwayStations);
          if (delayInfo) {
            this.sendDelayAlert(alert, delayInfo, data).catch(err =>
              this.logger.warn(`Delay alert push failed: ${err}`),
            );
            this.sendDelayAlertExpo(alert, delayInfo, data).catch(err =>
              this.logger.warn(`Delay alert expo push failed: ${err}`),
            );
          }
        }
      } catch (error) {
        this.logger.warn(`지하철 API 호출 실패 (계속 진행): ${error instanceof Error ? error.message : error}`);
      }
    }

    if (alert.alertTypes.includes(AlertType.BUS) && alert.busStopId) {
      try {
        data.busStops = await this.collectBusData(alert.busStopId);
      } catch (error) {
        this.logger.warn(`버스 API 호출 실패 (계속 진행): ${error instanceof Error ? error.message : error}`);
      }
    }
  }

  private async collectSmartNotificationData(
    alert: Alert,
    context: NotificationContext,
    data: NotificationData,
  ): Promise<void> {
    if (!this.ruleEngine || !this.smartMessageBuilder || !this.ruleRepository) return;

    try {
      const categories = this.getRelevantCategories(alert.alertTypes);
      const rules = await this.ruleRepository.findByCategories(categories);
      const recommendations = this.ruleEngine.evaluate(context, rules);
      data.recommendations = recommendations;
    } catch (error) {
      this.logger.warn(`Smart notification failed: ${error}`);
    }
  }

  private async collectSubwayData(stationIds: string): Promise<Array<{ name: string; line: string; arrivals: SubwayArrival[] }>> {
    const ids = stationIds.split(',').map(id => id.trim()).slice(0, 2);

    const settled = await Promise.allSettled(
      ids.map(async (id) => {
        const station = await this.subwayStationRepository.findById(id);
        if (!station) return null;
        const arrivals = await this.subwayApiClient.getSubwayArrival(station.name);
        return { name: station.name, line: station.line || '', arrivals: arrivals.slice(0, 1) };
      }),
    );

    return settled
      .filter((r): r is PromiseFulfilledResult<{ name: string; line: string; arrivals: SubwayArrival[] }> =>
        r.status === 'fulfilled' && r.value != null)
      .map((r) => r.value);
  }

  private async collectBusData(stopIds: string): Promise<Array<{ name: string; arrivals: import('@domain/entities/bus-arrival.entity').BusArrival[] }>> {
    const ids = stopIds.split(',').map(id => id.trim()).slice(0, 2);

    const settled = await Promise.allSettled(
      ids.map(async (id) => {
        const arrivals = await this.busApiClient.getBusArrival(id);
        return { name: id, arrivals: arrivals.slice(0, 1) };
      }),
    );

    return settled
      .filter((r): r is PromiseFulfilledResult<{ name: string; arrivals: import('@domain/entities/bus-arrival.entity').BusArrival[] }> =>
        r.status === 'fulfilled')
      .map((r) => r.value);
  }

  private async collectRouteData(alert: Alert, data: NotificationData): Promise<void> {
    if (alert.routeId && this.routeRepository) {
      try {
        const route = await this.routeRepository.findById(alert.routeId);
        if (route) {
          data.linkedRoute = route;
          this.logger.debug(`Loaded linked route: ${route.name}`);
        }
      } catch (error) {
        this.logger.warn(`Failed to load linked route: ${error}`);
      }
    }

    if (this.recommendBestRouteUseCase) {
      try {
        const weatherCondition = data.weather?.conditionKr;
        const recommendation = await this.recommendBestRouteUseCase.execute(
          alert.userId,
          weatherCondition,
        );
        if (recommendation.recommendation) {
          data.routeRecommendation = recommendation.recommendation;
          this.logger.debug(`Route recommendation: ${recommendation.recommendation.routeName}`);
        }
      } catch (error) {
        this.logger.warn(`Failed to get route recommendation: ${error}`);
      }
    }
  }

  private determineTimeType(alert: Alert): AlertTimeType {
    const time = alert.notificationTime || '08:00';
    const hour = parseInt(time.split(':')[0], 10);
    return hour < 12 ? 'morning' : 'evening';
  }

  private async sendNotification(
    userName: string,
    phoneNumber: string,
    alert: Alert,
    data: NotificationData,
    timeType: AlertTimeType,
  ): Promise<void> {
    const hasWeather = alert.alertTypes.includes(AlertType.WEATHER) && data.weather;
    const hasTransit = (data.subwayStations?.length || data.busStops?.length);

    if (hasWeather && hasTransit) {
      const variables = this.messageBuilder.buildCombinedVariables(userName, data);
      await this.solapiService!.sendCombinedAlert(phoneNumber, variables, timeType);
      this.logger.log(`Combined alert (${timeType}) sent to ${phoneNumber}`);
    } else if (hasWeather) {
      const variables = this.messageBuilder.buildWeatherVariables(userName, data);
      await this.solapiService!.sendWeatherAlert(phoneNumber, variables, timeType);
      this.logger.log(`Weather alert (${timeType}) sent to ${phoneNumber}`);
    } else if (hasTransit) {
      const variables = this.messageBuilder.buildTransitVariables(userName, data);
      await this.solapiService!.sendTransitAlert(phoneNumber, variables, timeType);
      this.logger.log(`Transit alert (${timeType}) sent to ${phoneNumber}`);
    } else {
      this.logger.warn('No data available for notification');
    }
  }

  private sendWebPush(alert: Alert, summary: string): void {
    if (!this.webPushService) return;
    this.webPushService.sendToUser(
      alert.userId,
      `${alert.name}`,
      summary,
      '/',
    ).catch(err => this.logger.warn(`Web push failed: ${err}`));
  }

  private sendExpoPush(alert: Alert, summary: string): void {
    if (!this.expoPushService) return;
    this.expoPushService.sendToUser(
      alert.userId,
      alert.name,
      summary,
      { url: '/', alertId: alert.id },
    ).catch(err => this.logger.warn(`Expo push failed: ${err}`));
  }

  private async handleSendFailure(
    error: unknown,
    alert: Alert,
    userName: string,
    phoneNumber: string,
    data: NotificationData,
    logSummary: string,
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Failed to send notification: ${errorMessage}`);

    if (data.weather && this.solapiService) {
      try {
        const variables = this.messageBuilder.buildLegacyVariables(userName, data);
        await this.solapiService.sendLegacyWeatherAlert(phoneNumber, variables);
        this.logger.log(`Fallback notification sent`);
        await this.saveNotificationLog(alert, 'fallback', logSummary);
      } catch (fallbackError) {
        this.logger.error(`Fallback also failed: ${fallbackError}`);
        await this.saveNotificationLog(alert, 'failed', errorMessage);
      }
    } else {
      await this.saveNotificationLog(alert, 'failed', errorMessage);
    }
  }

  private async saveNotificationLog(alert: Alert, status: string, summary: string): Promise<void> {
    if (!this.notificationLogRepo) return;
    try {
      await this.notificationLogRepo.save({
        userId: alert.userId,
        alertId: alert.id,
        alertName: alert.name,
        alertTypes: alert.alertTypes,
        status,
        summary,
      });
    } catch (err) {
      this.logger.warn(`Failed to save notification log: ${err}`);
    }
  }

  private getRelevantCategories(alertTypes: AlertType[]): RuleCategory[] {
    const categories: RuleCategory[] = [];
    if (alertTypes.includes(AlertType.WEATHER)) categories.push(RuleCategory.WEATHER);
    if (alertTypes.includes(AlertType.AIR_QUALITY)) categories.push(RuleCategory.AIR_QUALITY);
    if (alertTypes.includes(AlertType.BUS) || alertTypes.includes(AlertType.SUBWAY)) {
      categories.push(RuleCategory.TRANSIT);
    }
    return categories;
  }

  // B-7: Detect subway delays
  private detectSubwayDelay(
    stations: Array<{ name: string; line: string; arrivals: SubwayArrival[] }>,
  ): DelayInfo | null {
    for (const station of stations) {
      if (station.arrivals.length === 0) {
        return { stationName: station.name, type: 'no_arrivals' };
      }
      const allLongWait = station.arrivals.every(
        a => a.arrivalTime >= DELAY_THRESHOLD_SECONDS,
      );
      if (allLongWait) {
        return { stationName: station.name, type: 'long_wait' };
      }
    }
    return null;
  }

  // B-7: Send urgent delay Web Push notification
  private async sendDelayAlert(
    alert: Alert,
    delayInfo: DelayInfo,
    data: NotificationData,
  ): Promise<void> {
    if (!this.webPushService) return;

    const title = '\u26A0\uFE0F 지하철 지연 감지';
    const timeType = this.determineTimeType(alert);
    const modeParam = timeType === 'morning' ? 'morning' : 'evening';

    let body: string;
    if (delayInfo.type === 'no_arrivals') {
      body = `${delayInfo.stationName}역 도착 예정 열차 없음`;
    } else {
      body = `${delayInfo.stationName}역 열차 10분 이상 대기`;
    }

    if (data.routeRecommendation) {
      body += `. ${data.routeRecommendation.routeName} 경로를 고려해보세요`;
    }

    const url = `/commute?mode=${modeParam}`;
    await this.webPushService.sendToUser(alert.userId, title, body, url);
    this.logger.log(`Delay alert sent for ${delayInfo.stationName}역 (${delayInfo.type})`);
  }

  // B-7: Send urgent delay Expo Push notification
  private async sendDelayAlertExpo(
    alert: Alert,
    delayInfo: DelayInfo,
    data: NotificationData,
  ): Promise<void> {
    if (!this.expoPushService) return;

    const title = '\u26A0\uFE0F 지하철 지연 감지';
    const timeType = this.determineTimeType(alert);
    const modeParam = timeType === 'morning' ? 'morning' : 'evening';

    let body: string;
    if (delayInfo.type === 'no_arrivals') {
      body = `${delayInfo.stationName}역 도착 예정 열차 없음`;
    } else {
      body = `${delayInfo.stationName}역 열차 10분 이상 대기`;
    }

    if (data.routeRecommendation) {
      body += `. ${data.routeRecommendation.routeName} 경로를 고려해보세요`;
    }

    const url = `/commute?mode=${modeParam}`;
    await this.expoPushService.sendToUser(alert.userId, title, body, { url });
    this.logger.log(`Delay alert (expo) sent for ${delayInfo.stationName}역 (${delayInfo.type})`);
  }
}
