import { Inject, Injectable, NotFoundException, Optional, Logger } from '@nestjs/common';
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
import { CommuteRoute } from '@domain/entities/commute-route.entity';
import { Weather, HourlyForecast } from '@domain/entities/weather.entity';
import { AirQuality } from '@domain/entities/air-quality.entity';
import { BusArrival } from '@domain/entities/bus-arrival.entity';
import { SubwayArrival } from '@domain/entities/subway-arrival.entity';
import { NotificationContextBuilder } from '@domain/entities/notification-context.entity';
import { RuleCategory } from '@domain/entities/notification-rule.entity';
import { IRuleEngine, RULE_ENGINE } from '@domain/services/rule-engine.service';
import { ISmartMessageBuilder, SMART_MESSAGE_BUILDER } from '@application/services/smart-message-builder.service';
import { INotificationRuleRepository, NOTIFICATION_RULE_REPOSITORY } from '@domain/repositories/notification-rule.repository';
import { Recommendation } from '@domain/entities/recommendation.entity';
import { RecommendBestRouteUseCase } from './recommend-best-route.use-case';
import { RouteScoreDto } from '@application/dto/route-recommendation.dto';
import {
  ISolapiService,
  SOLAPI_SERVICE,
  WeatherAlertVariables,
  TransitAlertVariables,
  CombinedAlertVariables,
  LegacyWeatherVariables,
  AlertTimeType,
} from '@infrastructure/messaging/solapi.service';

interface NotificationData {
  weather?: Weather;
  airQuality?: AirQuality;
  busArrivals?: BusArrival[];
  subwayArrivals?: SubwayArrival[];
  subwayStations?: Array<{ name: string; line: string; arrivals: SubwayArrival[] }>;
  busStops?: Array<{ name: string; arrivals: BusArrival[] }>;
  recommendations?: Recommendation[];
  linkedRoute?: CommuteRoute;
  routeRecommendation?: RouteScoreDto;
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
    @Optional() @Inject(COMMUTE_ROUTE_REPOSITORY) private routeRepository?: ICommuteRouteRepository,
    @Optional() private recommendBestRouteUseCase?: RecommendBestRouteUseCase,
    @Optional() @Inject(RULE_ENGINE) private ruleEngine?: IRuleEngine,
    @Optional() @Inject(SMART_MESSAGE_BUILDER) private smartMessageBuilder?: ISmartMessageBuilder,
    @Optional() @Inject(NOTIFICATION_RULE_REPOSITORY) private ruleRepository?: INotificationRuleRepository,
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

    const contextBuilder = NotificationContextBuilder.create(user.id, alertId);
    const data: NotificationData = {};

    // 날씨 데이터 수집 (외부 API 실패 시 graceful하게 처리)
    const hasWeather = alert.alertTypes.includes(AlertType.WEATHER);
    const hasAirQuality = alert.alertTypes.includes(AlertType.AIR_QUALITY);

    if (hasWeather) {
      try {
        const weather = await this.weatherApiClient.getWeatherWithForecast(
          user.location.lat,
          user.location.lng,
        );
        data.weather = weather;
        contextBuilder.withWeather(weather);
      } catch (error) {
        this.logger.warn(`날씨 API 호출 실패 (계속 진행): ${error instanceof Error ? error.message : error}`);
      }
    }

    if (hasAirQuality) {
      try {
        const airQuality = await this.airQualityApiClient.getAirQuality(
          user.location.lat,
          user.location.lng,
        );
        data.airQuality = airQuality;
        contextBuilder.withAirQuality(airQuality);
      } catch (error) {
        this.logger.warn(`미세먼지 API 호출 실패 (계속 진행): ${error instanceof Error ? error.message : error}`);
      }
    }

    // 교통 데이터 수집 (여러 역/정류장 지원)
    const hasBus = alert.alertTypes.includes(AlertType.BUS);
    const hasSubway = alert.alertTypes.includes(AlertType.SUBWAY);

    if (hasSubway && alert.subwayStationId) {
      try {
        data.subwayStations = await this.collectSubwayData(alert.subwayStationId);
      } catch (error) {
        this.logger.warn(`지하철 API 호출 실패 (계속 진행): ${error instanceof Error ? error.message : error}`);
      }
    }

    if (hasBus && alert.busStopId) {
      try {
        data.busStops = await this.collectBusData(alert.busStopId);
      } catch (error) {
        this.logger.warn(`버스 API 호출 실패 (계속 진행): ${error instanceof Error ? error.message : error}`);
      }
    }

    const context = contextBuilder.build();

    // Smart notification
    if (this.ruleEngine && this.smartMessageBuilder && this.ruleRepository) {
      try {
        const categories = this.getRelevantCategories(alert.alertTypes);
        const rules = await this.ruleRepository.findByCategories(categories);
        const recommendations = this.ruleEngine.evaluate(context, rules);
        data.recommendations = recommendations;
      } catch (error) {
        this.logger.warn(`Smart notification failed: ${error}`);
      }
    }

    // 경로 추천 데이터 수집
    await this.collectRouteData(alert, data);

    // 알림톡 발송
    if (!this.solapiService || !user.phoneNumber) {
      if (!user.phoneNumber) {
        this.logger.warn(`User ${user.id} has no phone number`);
      }
      return;
    }

    // 출근/퇴근 판단 (알림 시간 기준)
    const timeType = this.determineTimeType(alert);

    try {
      await this.sendNotification(user.name, user.phoneNumber, alert, data, timeType);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send notification: ${errorMessage}`);

      // 새 템플릿 실패 시 기존 템플릿으로 폴백
      if (data.weather) {
        try {
          const variables = this.buildLegacyVariables(user.name, data);
          await this.solapiService.sendLegacyWeatherAlert(user.phoneNumber, variables);
          this.logger.log(`Fallback notification sent`);
        } catch (fallbackError) {
          this.logger.error(`Fallback also failed: ${fallbackError}`);
        }
      }
    }
  }

  // 지하철 데이터 수집 (여러 역 지원 - 쉼표로 구분)
  private async collectSubwayData(stationIds: string): Promise<Array<{ name: string; line: string; arrivals: SubwayArrival[] }>> {
    const ids = stationIds.split(',').map(id => id.trim());
    const results: Array<{ name: string; line: string; arrivals: SubwayArrival[] }> = [];

    for (const id of ids.slice(0, 2)) { // 최대 2개
      const station = await this.subwayStationRepository.findById(id);
      if (station) {
        const arrivals = await this.subwayApiClient.getSubwayArrival(station.name);
        results.push({
          name: station.name,
          line: station.line || '',
          arrivals: arrivals.slice(0, 1), // 역당 1개
        });
      }
    }

    return results;
  }

  // 버스 데이터 수집 (여러 정류장 지원 - 쉼표로 구분)
  private async collectBusData(stopIds: string): Promise<Array<{ name: string; arrivals: BusArrival[] }>> {
    const ids = stopIds.split(',').map(id => id.trim());
    const results: Array<{ name: string; arrivals: BusArrival[] }> = [];

    for (const id of ids.slice(0, 2)) { // 최대 2개
      const arrivals = await this.busApiClient.getBusArrival(id);
      results.push({
        name: id,
        arrivals: arrivals.slice(0, 1), // 정류장당 1개
      });
    }

    return results;
  }

  // 경로 데이터 수집 (연결된 경로 + 추천 경로)
  private async collectRouteData(alert: Alert, data: NotificationData): Promise<void> {
    // 연결된 경로 로드
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

    // 경로 추천 (날씨 조건 반영)
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

  // 출근/퇴근 판단 (알림 시간 기준: 오전 = 출근, 오후 = 퇴근)
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
      const variables = this.buildCombinedVariables(userName, data);
      await this.solapiService!.sendCombinedAlert(phoneNumber, variables, timeType);
      this.logger.log(`Combined alert (${timeType}) sent to ${phoneNumber}`);
    } else if (hasWeather) {
      const variables = this.buildWeatherVariables(userName, data);
      await this.solapiService!.sendWeatherAlert(phoneNumber, variables, timeType);
      this.logger.log(`Weather alert (${timeType}) sent to ${phoneNumber}`);
    } else if (hasTransit) {
      const variables = this.buildTransitVariables(userName, data);
      await this.solapiService!.sendTransitAlert(phoneNumber, variables, timeType);
      this.logger.log(`Transit alert (${timeType}) sent to ${phoneNumber}`);
    } else {
      this.logger.warn('No data available for notification');
    }
  }

  // 날씨 알림 변수 생성
  private buildWeatherVariables(userName: string, data: NotificationData): WeatherAlertVariables {
    const weather = data.weather!;
    const airQuality = data.airQuality;
    const forecast = weather.forecast;

    const now = new Date();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

    return {
      userName,
      date: `${now.getMonth() + 1}월 ${now.getDate()}일 ${dayNames[now.getDay()]}요일`,
      currentTemp: `${Math.round(weather.temperature)}`,
      minTemp: forecast ? `${forecast.minTemp}` : `${Math.round(weather.temperature - 5)}`,
      weather: this.buildWeatherString(weather),
      airQuality: this.buildAirQualityString(airQuality),
      tip: this.generateTip(data),
    };
  }

  // 교통 알림 변수 생성
  private buildTransitVariables(userName: string, data: NotificationData): TransitAlertVariables {
    return {
      userName,
      subwayInfo: this.buildSubwayInfo(data.subwayStations),
      busInfo: this.buildBusInfo(data.busStops),
      tip: this.generateTransitTip(data),
    };
  }

  // 종합 알림 변수 생성
  private buildCombinedVariables(userName: string, data: NotificationData): CombinedAlertVariables {
    const weather = data.weather!;
    const forecast = weather.forecast;
    const now = new Date();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

    return {
      userName,
      date: `${now.getMonth() + 1}월 ${now.getDate()}일 ${dayNames[now.getDay()]}요일`,
      currentTemp: `${Math.round(weather.temperature)}`,
      minTemp: forecast ? `${forecast.minTemp}` : `${Math.round(weather.temperature - 5)}`,
      weather: this.buildWeatherString(weather),
      airQuality: data.airQuality?.status || '정보 없음',
      subwayInfo: this.buildSubwayInfo(data.subwayStations),
      busInfo: this.buildBusInfo(data.busStops),
      tip: this.generateTip(data),
    };
  }

  // 기존 템플릿 변수 (하위 호환)
  private buildLegacyVariables(userName: string, data: NotificationData): LegacyWeatherVariables {
    const weather = data.weather;
    const airQuality = data.airQuality;

    return {
      userName,
      temperature: weather ? `${Math.round(weather.temperature)}` : '-',
      condition: weather?.conditionKr || '정보 없음',
      airLevel: airQuality?.status || '정보 없음',
      humidity: weather ? `${weather.humidity}` : '-',
      tip: this.generateTip(data),
    };
  }

  // 날씨 문자열: "오전 맑음 → 오후 구름 → 저녁 맑음"
  private buildWeatherString(weather: Weather): string {
    const forecast = weather.forecast;
    if (!forecast?.hourlyForecasts?.length) {
      return weather.conditionKr;
    }

    const slots = this.extractTimeSlots(forecast.hourlyForecasts);
    return slots.map(s => `${s.slot} ${s.weather}`).join(' → ');
  }

  // 대기질 문자열
  private buildAirQualityString(airQuality?: AirQuality): string {
    if (!airQuality) return '정보 없음';
    const pm10 = airQuality.pm10 ? ` (PM10 ${airQuality.pm10}㎍/㎥)` : '';
    return `${airQuality.status || '정보 없음'}${pm10}`;
  }

  // 지하철 정보 (여러 역)
  private buildSubwayInfo(stations?: Array<{ name: string; line: string; arrivals: SubwayArrival[] }>): string {
    if (!stations?.length) return '정보 없음';

    return stations
      .map(s => {
        const arrival = s.arrivals[0];
        const time = arrival ? this.formatArrivalTime(arrival.arrivalTime) : '정보 없음';
        return `• ${s.name}역 (${s.line}) ${time}`;
      })
      .join('\n');
  }

  // 버스 정보 (여러 정류장)
  private buildBusInfo(stops?: Array<{ name: string; arrivals: BusArrival[] }>): string {
    if (!stops?.length) return '정보 없음';

    return stops
      .map(s => {
        const arrival = s.arrivals[0];
        if (!arrival) return `• ${s.name} - 정보 없음`;
        const time = this.formatArrivalTime(arrival.arrivalTime);
        return `• ${s.name} - ${arrival.routeName}번 ${time}`;
      })
      .join('\n');
  }

  // 시간대별 날씨 추출
  private extractTimeSlots(hourlyForecasts: HourlyForecast[]): Array<{ slot: string; weather: string }> {
    const slots: Array<{ slot: string; weather: string }> = [];
    const seenSlots = new Set<string>();

    for (const forecast of hourlyForecasts) {
      if (!seenSlots.has(forecast.timeSlot)) {
        seenSlots.add(forecast.timeSlot);
        slots.push({ slot: forecast.timeSlot, weather: forecast.conditionKr });
      }
    }

    const defaultSlots = ['오전', '오후', '저녁'];
    for (const slot of defaultSlots) {
      if (!seenSlots.has(slot)) {
        slots.push({ slot, weather: '정보없음' });
      }
    }

    return slots.slice(0, 3);
  }

  // 도착시간 포맷
  private formatArrivalTime(seconds: number): string {
    if (seconds <= 60) return '곧 도착';
    const minutes = Math.floor(seconds / 60);
    return `${minutes}분`;
  }

  // 팁 생성 (경로 추천 포함)
  private generateTip(data: NotificationData): string {
    const weather = data.weather;
    const airQuality = data.airQuality;
    const routeRec = data.routeRecommendation;

    // 경로 추천이 있으면 우선 표시
    if (routeRec && routeRec.totalScore >= 70) {
      const avgMin = routeRec.averageDuration;
      return `추천: "${routeRec.routeName}" (평균 ${avgMin}분)`;
    }

    if (weather) {
      const forecast = weather.forecast;

      if (forecast) {
        const tempDiff = forecast.maxTemp - forecast.minTemp;
        if (tempDiff >= 10) {
          return `낮밤 기온차 ${tempDiff}°C, 겉옷 챙기세요.`;
        }
      }

      const temp = weather.temperature;
      if (temp <= 0) return '영하권 추위, 방한용품 필수.';
      if (temp <= 5) return '두꺼운 외투 챙기세요.';
      if (temp >= 30) return '폭염 주의, 수분 보충하세요.';

      const condition = weather.condition.toLowerCase();
      if (condition.includes('rain') || condition.includes('drizzle')) {
        return '비 예보, 우산 챙기세요.';
      }
      if (condition.includes('snow')) return '눈 예보, 미끄럼 주의.';
    }

    if (airQuality?.status) {
      const status = airQuality.status.toLowerCase();
      if (status === '나쁨' || status.includes('bad')) {
        return '미세먼지 나쁨, 마스크 착용 권장.';
      }
    }

    // 연결된 경로 정보
    if (data.linkedRoute) {
      return `${data.linkedRoute.name} 출발 준비하세요.`;
    }

    return '좋은 하루 보내세요.';
  }

  // 교통 팁
  private generateTransitTip(data: NotificationData): string {
    const hasSubway = data.subwayStations?.some(s => s.arrivals.length > 0);
    const hasBus = data.busStops?.some(s => s.arrivals.length > 0);

    if (hasSubway && hasBus) return '지금 출발하면 딱 좋아요!';
    if (hasSubway) return '지하철 도착 정보 확인하세요.';
    if (hasBus) return '버스 도착 정보 확인하세요.';
    return '교통 정보를 확인하세요.';
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
}
