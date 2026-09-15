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
import { parseCronHours } from '@domain/utils/cron-hours';

const DEFAULT_LAT = 37.5665;
const DEFAULT_LNG = 126.9780;

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const MINUTES_PER_DAY = 24 * 60;
const DAYS_PER_WEEK = 7;
const DAY_NAMES_KR = ['일', '월', '화', '수', '목', '금', '토'] as const;
const ALL_DAYS_OF_WEEK: ReadonlySet<number> = new Set([0, 1, 2, 3, 4, 5, 6]);

/**
 * Day-of-week set from a standard 5-field cron ("min hour dom month dow"),
 * where dow is 0=Sunday..6=Saturday. Supports `*`, ranges ("1-5") and
 * comma lists ("0,6") — the same forms `cron-utils.ts` renders on the client
 * and `convertToEventBridgeCron()` forwards to EventBridge.
 *
 * Anything unparsable (e.g. a bare "08:00" schedule) falls back to every day,
 * which preserves the previous behaviour rather than dropping the alert.
 */
function parseCronDaysOfWeek(schedule: string): ReadonlySet<number> {
  const fields = schedule.trim().split(/\s+/);
  if (fields.length !== 5) return ALL_DAYS_OF_WEEK;

  const dowField = fields[4];
  if (dowField === '*') return ALL_DAYS_OF_WEEK;

  const days = new Set<number>();
  for (const part of dowField.split(',')) {
    const range = part.trim().match(/^(\d)-(\d)$/);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      if (start > end || end > 6) return ALL_DAYS_OF_WEEK;
      for (let day = start; day <= end; day++) days.add(day);
      continue;
    }

    const day = Number(part.trim());
    if (!Number.isInteger(day) || day < 0 || day > 6) return ALL_DAYS_OF_WEEK;
    days.add(day);
  }

  return days.size > 0 ? days : ALL_DAYS_OF_WEEK;
}

/** 자정 기준 분 → "HH:mm". 위젯에 찍히는 문자열이다. */
function formatMinutesOfDay(minutesOfDay: number): string {
  const hour = Math.floor(minutesOfDay / 60);
  const minute = minutesOfDay % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

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
    mode?: 'commute' | 'return',
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

    const briefing = this.generateBriefing(weather, airQuality, transit, departure, mode);

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
   * to the current time (KST). The alert's cron day-of-week field is honored:
   * EventBridge carries that field through to the real schedule
   * (`eventbridge-scheduler.service.ts:276`), so ignoring it here would make the
   * widget announce a day the alert never fires on.
   */
  computeNextAlert(alerts: Alert[]): WidgetNextAlertDto | null {
    const enabledAlerts = alerts.filter((a) => a.enabled && a.notificationTime);
    if (enabledAlerts.length === 0) return null;

    // Anchor everything to KST regardless of the container's own timezone.
    const kstNow = new Date(Date.now() + KST_OFFSET_MS);
    const kstDayOfWeek = kstNow.getUTCDay();
    const kstMinutes = kstNow.getUTCHours() * 60 + kstNow.getUTCMinutes();

    let earliest: {
      alert: Alert;
      minutesUntil: number;
      dayOffset: number;
      alertMinutes: number;
    } | null = null;

    for (const alert of enabledAlerts) {
      const activeDays = parseCronDaysOfWeek(alert.schedule);

      for (const alertMinutes of this.candidateMinutesOfDay(alert)) {
        const dayOffset = this.findNextActiveDayOffset(
          activeDays,
          kstDayOfWeek,
          alertMinutes > kstMinutes,
        );
        if (dayOffset === null) continue;

        const minutesUntil = dayOffset * MINUTES_PER_DAY + alertMinutes - kstMinutes;

        if (!earliest || minutesUntil < earliest.minutesUntil) {
          earliest = { alert, minutesUntil, dayOffset, alertMinutes };
        }
      }
    }

    if (!earliest) return null;

    const dto = new WidgetNextAlertDto();
    dto.time = this.formatAlertTime(
      formatMinutesOfDay(earliest.alertMinutes),
      earliest.dayOffset,
      kstDayOfWeek,
    );
    dto.label = this.buildAlertLabel(earliest.alert);
    dto.alertTypes = earliest.alert.alertTypes;
    return dto;
  }

  /**
   * 이 알림이 하루 중 발화하는 분(자정 기준) 전부.
   *
   * `alert.notificationTime`은 크론의 **첫 시각**만 담는다
   * (`alert.entity.ts:152`). 그것만 보면 `0 7,18 * * *`(출근+퇴근)의 저녁
   * 발화가 위젯에서 통째로 사라져, 오전 발화가 지난 뒤에도 "내일 07:00"이라
   * 말한다. 분 필드는 모든 시각에 공통 적용된다.
   */
  private candidateMinutesOfDay(alert: Alert): number[] {
    const [hourStr, minuteStr] = alert.notificationTime!.split(':');
    const minute = parseInt(minuteStr, 10);
    const firstHour = parseInt(hourStr, 10);
    if (!Number.isFinite(minute) || !Number.isFinite(firstHour)) return [];

    const scheduledHours = parseCronHours(alert.schedule);
    const hours = scheduledHours.length > 0 ? scheduledHours : [firstHour];

    return hours.map((hour) => hour * 60 + minute);
  }

  /**
   * Days ahead (0 = today) until the alert's next active weekday.
   * Today only counts when the alert time has not passed yet.
   *
   * offset 6까지만 훑으면 **주 1회 알림이 그날 시각을 넘긴 순간 사라진다.**
   * `0 8 * * 1`(월요일만)을 월요일 09:00에 보면 오늘은 이미 지났고 화~일요일은
   * 활성일이 아니라 후보가 없다 — 실제로는 7일 뒤에 울리는데 위젯에는
   * 아무것도 뜨지 않는다. 모바일과 같이 다음 주 같은 요일(offset 7)까지 본다
   * (`mobile/src/utils/alert-schedule.ts:34`).
   */
  private findNextActiveDayOffset(
    activeDays: ReadonlySet<number>,
    kstDayOfWeek: number,
    isStillUpcomingToday: boolean,
  ): number | null {
    for (let offset = 0; offset <= DAYS_PER_WEEK; offset++) {
      if (offset === 0 && !isStillUpcomingToday) continue;
      if (activeDays.has((kstDayOfWeek + offset) % DAYS_PER_WEEK)) return offset;
    }
    return null;
  }

  private formatAlertTime(
    timeStr: string,
    dayOffset: number,
    kstDayOfWeek: number,
  ): string {
    if (dayOffset === 0) return timeStr;
    if (dayOffset === 1) return `내일 ${timeStr}`;

    const dayLabel = DAY_NAMES_KR[(kstDayOfWeek + dayOffset) % DAYS_PER_WEEK];
    // offset 7 = 오늘과 같은 요일. "월 08:00"이라고만 하면 월요일에 보는
    // 사용자가 오늘로 오해한다 (`mobile/src/utils/alert-schedule.ts:52`).
    if (dayOffset === DAYS_PER_WEEK) return `다음 주 ${dayLabel} ${timeStr}`;
    return `${dayLabel} ${timeStr}`;
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
    _checkpointName: string,
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
    mode?: 'commute' | 'return',
  ): BriefingResponseDto | null {
    if (!this.briefingAdviceService) return null;

    // Mode override: commute→morning, return→evening
    const timeContext = mode
      ? (mode === 'commute' ? 'morning' : 'evening')
      : BriefingAdviceService.getTimeContext();

    return this.briefingAdviceService.generate({
      weather,
      airQuality,
      transit,
      departure,
      timeContext,
    });
  }
}
