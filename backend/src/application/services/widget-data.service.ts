import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { IWeatherApiClient } from '@infrastructure/external-apis/weather-api.client';
import { IAirQualityApiClient } from '@infrastructure/external-apis/air-quality-api.client';
import { ISubwayApiClient } from '@infrastructure/external-apis/subway-api.client';
import { IBusApiClient } from '@infrastructure/external-apis/bus-api.client';
import { IAlertRepository } from '@domain/repositories/alert.repository';
import {
  ICommuteRouteRepository,
  COMMUTE_ROUTE_REPOSITORY,
} from '@domain/repositories/commute-route.repository';
import { ISubwayStationRepository } from '@domain/repositories/subway-station.repository';
import { Alert, AlertType } from '@domain/entities/alert.entity';
import { Weather } from '@domain/entities/weather.entity';
import { CheckpointType } from '@domain/entities/commute-route.entity';
import {
  WidgetDataResponseDto,
  WidgetWeatherDto,
  WidgetAirQualityDto,
  WidgetNextAlertDto,
  WidgetTransitDto,
  WidgetSubwayDto,
  WidgetBusDto,
  WidgetDepartureDataDto,
} from '@application/dto/widget-data.dto';
import { CalculateDepartureUseCase } from '@application/use-cases/calculate-departure.use-case';
import { BriefingAdviceService } from '@application/services/briefing-advice.service';
import { BriefingResponseDto } from '@application/dto/briefing.dto';

const DEFAULT_LAT = 37.5665;
const DEFAULT_LNG = 126.9780;

@Injectable()
export class WidgetDataService {
  private readonly logger = new Logger(WidgetDataService.name);

  constructor(
    @Optional() @Inject('IWeatherApiClient') private readonly weatherApiClient?: IWeatherApiClient,
    @Optional() @Inject('IAirQualityApiClient') private readonly airQualityApiClient?: IAirQualityApiClient,
    @Optional() @Inject('ISubwayApiClient') private readonly subwayApiClient?: ISubwayApiClient,
    @Optional() @Inject('IBusApiClient') private readonly busApiClient?: IBusApiClient,
    @Optional() @Inject('IAlertRepository') private readonly alertRepository?: IAlertRepository,
    @Optional() @Inject(COMMUTE_ROUTE_REPOSITORY) private readonly routeRepository?: ICommuteRouteRepository,
    @Optional() @Inject('ISubwayStationRepository') private readonly subwayStationRepository?: ISubwayStationRepository,
    @Optional() private readonly calculateDepartureUseCase?: CalculateDepartureUseCase,
    @Optional() private readonly briefingAdviceService?: BriefingAdviceService,
  ) {}

  async getData(
    userId: string,
    lat?: number,
    lng?: number,
  ): Promise<WidgetDataResponseDto> {
    const latitude = lat ?? DEFAULT_LAT;
    const longitude = lng ?? DEFAULT_LNG;

    const [weatherResult, airQualityResult, alertsResult, transitResult, departureResult] =
      await Promise.allSettled([
        this.fetchWeather(latitude, longitude),
        this.fetchAirQuality(latitude, longitude),
        this.fetchAlerts(userId),
        this.fetchTransitData(userId),
        this.fetchDepartureData(userId),
      ]);

    const weather = weatherResult.status === 'fulfilled' ? weatherResult.value : null;
    const airQuality = airQualityResult.status === 'fulfilled' ? airQualityResult.value : null;
    const alerts = alertsResult.status === 'fulfilled' ? alertsResult.value : [];
    const transit = transitResult.status === 'fulfilled'
      ? transitResult.value
      : { subway: null, bus: null };
    const departure = departureResult.status === 'fulfilled'
      ? departureResult.value
      : null;

    if (weatherResult.status === 'rejected') {
      this.logger.warn(`Widget weather fetch failed: ${weatherResult.reason}`);
    }
    if (airQualityResult.status === 'rejected') {
      this.logger.warn(`Widget air quality fetch failed: ${airQualityResult.reason}`);
    }
    if (alertsResult.status === 'rejected') {
      this.logger.warn(`Widget alerts fetch failed: ${alertsResult.reason}`);
    }
    if (transitResult.status === 'rejected') {
      this.logger.warn(`Widget transit fetch failed: ${transitResult.reason}`);
    }
    if (departureResult.status === 'rejected') {
      this.logger.warn(`Widget departure fetch failed: ${departureResult.reason}`);
    }

    const nextAlert = this.computeNextAlert(alerts);

    const briefing = this.generateBriefing(weather, airQuality, transit, departure);

    return {
      weather,
      airQuality,
      nextAlert,
      transit,
      departure,
      briefing,
      updatedAt: new Date().toISOString(),
    };
  }

  private async fetchWeather(lat: number, lng: number): Promise<WidgetWeatherDto | null> {
    if (!this.weatherApiClient) return null;

    const weather = await this.weatherApiClient.getWeatherWithForecast(lat, lng);
    return this.mapWeatherToDto(weather);
  }

  private mapWeatherToDto(weather: Weather): WidgetWeatherDto {
    const dto = new WidgetWeatherDto();
    dto.temperature = Math.round(weather.temperature);
    dto.condition = weather.condition;
    dto.conditionEmoji = Weather.conditionToEmoji(weather.condition);
    dto.conditionKr = Weather.conditionToKorean(weather.condition);
    dto.feelsLike = weather.feelsLike != null ? Math.round(weather.feelsLike) : undefined;
    dto.maxTemp = weather.forecast?.maxTemp;
    dto.minTemp = weather.forecast?.minTemp;
    return dto;
  }

  private async fetchAirQuality(lat: number, lng: number): Promise<WidgetAirQualityDto | null> {
    if (!this.airQualityApiClient) return null;

    const aq = await this.airQualityApiClient.getAirQuality(lat, lng);
    return this.mapAirQualityToDto(aq.pm10, aq.pm25, aq.status);
  }

  private mapAirQualityToDto(
    pm10: number,
    pm25: number,
    status: string,
  ): WidgetAirQualityDto {
    const dto = new WidgetAirQualityDto();
    dto.pm10 = pm10;
    dto.pm25 = pm25;
    dto.status = this.translateAqiStatus(status);
    dto.statusLevel = this.computeAqiStatusLevel(pm10);
    return dto;
  }

  private translateAqiStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'Good': '좋음',
      'Moderate': '보통',
      'Unhealthy for Sensitive': '민감군 나쁨',
      'Unhealthy': '나쁨',
      'Very Unhealthy': '매우 나쁨',
      'Hazardous': '위험',
    };
    return statusMap[status] ?? status;
  }

  private computeAqiStatusLevel(
    pm10: number,
  ): 'good' | 'moderate' | 'unhealthy' | 'veryUnhealthy' {
    if (pm10 <= 30) return 'good';
    if (pm10 <= 80) return 'moderate';
    if (pm10 <= 150) return 'unhealthy';
    return 'veryUnhealthy';
  }

  private async fetchAlerts(userId: string): Promise<Alert[]> {
    if (!this.alertRepository) return [];
    return this.alertRepository.findByUserId(userId);
  }

  /**
   * computeNextAlert -- port of mobile app's computeNextAlert() logic.
   *
   * Finds the next enabled alert by comparing each alert's notificationTime
   * to the current time (KST). If the time has passed today, it is treated
   * as "tomorrow". Returns the earliest upcoming alert.
   */
  computeNextAlert(alerts: Alert[]): WidgetNextAlertDto | null {
    const enabledAlerts = alerts.filter((a) => a.enabled && a.notificationTime);
    if (enabledAlerts.length === 0) return null;

    const now = new Date();
    // Convert to KST (UTC+9)
    const kstOffset = 9 * 60;
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const kstMinutes = (utcMinutes + kstOffset) % (24 * 60);

    let earliest: { alert: Alert; minutesUntil: number; isTomorrow: boolean } | null = null;

    for (const alert of enabledAlerts) {
      const [hourStr, minuteStr] = alert.notificationTime!.split(':');
      const alertMinutes = parseInt(hourStr, 10) * 60 + parseInt(minuteStr, 10);

      let minutesUntil = alertMinutes - kstMinutes;
      let isTomorrow = false;

      if (minutesUntil <= 0) {
        // Alert time has passed today; treat as tomorrow
        minutesUntil += 24 * 60;
        isTomorrow = true;
      }

      if (!earliest || minutesUntil < earliest.minutesUntil) {
        earliest = { alert, minutesUntil, isTomorrow };
      }
    }

    if (!earliest) return null;

    const dto = new WidgetNextAlertDto();
    const timeStr = earliest.alert.notificationTime!;
    dto.time = earliest.isTomorrow ? `내일 ${timeStr}` : timeStr;
    dto.label = this.buildAlertLabel(earliest.alert);
    dto.alertTypes = earliest.alert.alertTypes;
    return dto;
  }

  private buildAlertLabel(alert: Alert): string {
    const parts: string[] = [];
    if (alert.alertTypes.includes(AlertType.WEATHER)) parts.push('날씨');
    if (alert.alertTypes.includes(AlertType.AIR_QUALITY)) parts.push('미세먼지');
    if (alert.alertTypes.includes(AlertType.SUBWAY)) parts.push('지하철');
    if (alert.alertTypes.includes(AlertType.BUS)) parts.push('버스');

    if (parts.length === 0) return alert.name;
    return parts.join(' + ') + ' 알림';
  }

  /**
   * Fetches transit data from the user's preferred route.
   * Looks for the first subway and bus checkpoint on the preferred route
   * and fetches real-time arrival data for each.
   */
  private async fetchTransitData(userId: string): Promise<WidgetTransitDto> {
    const result: WidgetTransitDto = { subway: null, bus: null };

    if (!this.routeRepository) return result;

    const routes = await this.routeRepository.findByUserId(userId);
    if (routes.length === 0) return result;

    // Prefer `isPreferred: true`, fall back to first route
    const preferredRoute =
      routes.find((r) => r.isPreferred) ?? routes[0];

    // Find first subway checkpoint
    const subwayCheckpoint = preferredRoute.checkpoints.find(
      (cp) =>
        cp.checkpointType === CheckpointType.SUBWAY && cp.linkedStationId,
    );

    // Find first bus checkpoint
    const busCheckpoint = preferredRoute.checkpoints.find(
      (cp) =>
        cp.checkpointType === CheckpointType.BUS_STOP && cp.linkedBusStopId,
    );

    const [subwayResult, busResult] = await Promise.allSettled([
      subwayCheckpoint
        ? this.fetchSubwayArrival(subwayCheckpoint.linkedStationId!, subwayCheckpoint.name, subwayCheckpoint.lineInfo)
        : Promise.resolve(null),
      busCheckpoint
        ? this.fetchBusArrival(busCheckpoint.linkedBusStopId!, busCheckpoint.name)
        : Promise.resolve(null),
    ]);

    if (subwayResult.status === 'fulfilled') {
      result.subway = subwayResult.value;
    } else {
      this.logger.warn(`Widget subway arrival fetch failed: ${subwayResult.reason}`);
    }

    if (busResult.status === 'fulfilled') {
      result.bus = busResult.value;
    } else {
      this.logger.warn(`Widget bus arrival fetch failed: ${busResult.reason}`);
    }

    return result;
  }

  private async fetchSubwayArrival(
    stationId: string,
    checkpointName: string,
    lineInfo?: string,
  ): Promise<WidgetSubwayDto | null> {
    if (!this.subwayApiClient || !this.subwayStationRepository) return null;

    const station = await this.subwayStationRepository.findById(stationId);
    if (!station) return null;

    const arrivals = await this.subwayApiClient.getSubwayArrival(station.name);
    if (arrivals.length === 0) return null;

    const firstArrival = arrivals[0];
    const dto = new WidgetSubwayDto();
    dto.stationName = station.name;
    dto.lineInfo = lineInfo ?? station.line ?? '';
    dto.arrivalMinutes = Math.round(firstArrival.arrivalTime / 60);
    dto.destination = firstArrival.destination;
    return dto;
  }

  private async fetchBusArrival(
    busStopId: string,
    checkpointName: string,
  ): Promise<WidgetBusDto | null> {
    if (!this.busApiClient) return null;

    const arrivals = await this.busApiClient.getBusArrival(busStopId);
    if (arrivals.length === 0) return null;

    const firstArrival = arrivals[0];
    const dto = new WidgetBusDto();
    dto.stopName = checkpointName;
    dto.routeName = firstArrival.routeName;
    dto.arrivalMinutes = Math.round(firstArrival.arrivalTime / 60);
    dto.remainingStops = firstArrival.remainingStops;
    return dto;
  }

  /**
   * Fetches smart departure data for the widget.
   * Returns the most relevant upcoming departure (commute or return).
   */
  private async fetchDepartureData(userId: string): Promise<WidgetDepartureDataDto | null> {
    if (!this.calculateDepartureUseCase) return null;

    return this.calculateDepartureUseCase.getWidgetDepartureData(userId);
  }

  /**
   * Generates context-aware briefing advices using the BriefingAdviceService.
   * Combines weather, air quality, transit, and departure data into actionable advice.
   */
  private generateBriefing(
    weather: WidgetWeatherDto | null,
    airQuality: WidgetAirQualityDto | null,
    transit: WidgetTransitDto,
    departure: WidgetDepartureDataDto | null,
  ): BriefingResponseDto | null {
    if (!this.briefingAdviceService) return null;

    return this.briefingAdviceService.generate({
      weather,
      airQuality,
      transit,
      departure,
      timeContext: BriefingAdviceService.getTimeContext(),
    });
  }
}
