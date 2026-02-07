import { v4 as uuidv4 } from 'uuid';

// 기존 AlertType (하위 호환 유지)
export enum AlertType {
  WEATHER = 'weather',
  AIR_QUALITY = 'airQuality',
  BUS = 'bus',
  SUBWAY = 'subway',
}

// 새로운 알림 카테고리 (명확한 목적 기반)
export enum AlertCategory {
  // 날씨 알림: 오늘 전체 날씨 + 시간대별 변화 + 미세먼지
  DAILY_WEATHER = 'daily_weather',

  // 출발 알림: 경로 첫 구간 출발 알림 (실시간 교통정보 포함)
  DEPARTURE_REMINDER = 'departure_reminder',
}

// 알림 트리거 방식
export enum AlertTriggerType {
  FIXED_TIME = 'fixed_time',           // 고정 시간 (매일 08:00)
  SMART_DEPARTURE = 'smart_departure', // 도착 시간 기준 역산
}

// 출발 알림 설정
export interface DepartureAlertConfig {
  // 연결된 경로 ID (필수)
  routeId: string;

  // 트리거 방식
  triggerType: AlertTriggerType;

  // 고정 시간 모드 설정
  fixedTime?: string;  // "08:00"

  // 스마트 모드 설정
  targetArrivalTime?: string;  // 회사 도착 희망 시간 "09:00"
  bufferMinutes?: number;      // 여유 시간 (기본 10분)

  // 첫 번째 체크포인트 정보 (자동 설정)
  firstCheckpoint?: {
    name: string;
    transportMode: string;
    lineInfo?: string;
  };
}

/**
 * Smart scheduling configuration for adaptive notification timing
 */
export interface SmartSchedulingConfig {
  /** Target arrival time at destination (HH:mm) */
  targetArrivalTime?: string;
  /** Maximum minutes to notify earlier than pattern (default: 30) */
  maxEarlyMinutes: number;
  /** Minimum lead time before departure (default: 10) */
  minLeadTime: number;
  /** Conditions that trigger timing adjustments */
  adaptToConditions: {
    weather: boolean;
    transitDelay: boolean;
  };
}

const DEFAULT_SMART_SCHEDULING_CONFIG: SmartSchedulingConfig = {
  maxEarlyMinutes: 30,
  minLeadTime: 10,
  adaptToConditions: {
    weather: true,
    transitDelay: true,
  },
};

export class Alert {
  public readonly id: string;
  public readonly userId: string;
  private _name: string;
  private _schedule: string;
  public alertTypes: AlertType[];
  public enabled: boolean;
  public busStopId?: string;
  public subwayStationId?: string;
  public routeId?: string;

  // 새로운 카테고리 기반 설정
  public category: AlertCategory;
  public triggerType: AlertTriggerType;
  public departureConfig?: DepartureAlertConfig;

  // Smart scheduling properties
  public smartSchedulingEnabled: boolean;
  public smartSchedulingConfig: SmartSchedulingConfig;
  public notificationTime?: string; // Extracted time from schedule (HH:mm)

  get name(): string {
    return this._name;
  }

  get schedule(): string {
    return this._schedule;
  }

  constructor(
    userId: string,
    name: string,
    schedule: string,
    alertTypes: AlertType[],
    busStopId?: string,
    subwayStationId?: string,
    id?: string,
    smartSchedulingEnabled = false,
    smartSchedulingConfig?: Partial<SmartSchedulingConfig>,
    routeId?: string,
    category?: AlertCategory,
    triggerType?: AlertTriggerType,
    departureConfig?: DepartureAlertConfig,
  ) {
    this.id = id || uuidv4();
    this.userId = userId;
    this._name = name;
    this._schedule = schedule;
    this.alertTypes = alertTypes;
    this.enabled = true;
    this.busStopId = busStopId;
    this.subwayStationId = subwayStationId;
    this.routeId = routeId;

    // 카테고리 자동 추론 (하위 호환성)
    this.category = category || this.inferCategory(alertTypes);
    this.triggerType = triggerType || AlertTriggerType.FIXED_TIME;
    this.departureConfig = departureConfig;

    // Smart scheduling initialization
    this.smartSchedulingEnabled = smartSchedulingEnabled;
    this.smartSchedulingConfig = {
      ...DEFAULT_SMART_SCHEDULING_CONFIG,
      ...smartSchedulingConfig,
    };
    this.notificationTime = this.extractTimeFromSchedule(schedule);
  }

  // 기존 alertTypes에서 카테고리 추론 (하위 호환)
  private inferCategory(alertTypes: AlertType[]): AlertCategory {
    const hasTransit = alertTypes.includes(AlertType.BUS) || alertTypes.includes(AlertType.SUBWAY);
    if (hasTransit && this.routeId) {
      return AlertCategory.DEPARTURE_REMINDER;
    }
    return AlertCategory.DAILY_WEATHER;
  }

  private extractTimeFromSchedule(schedule: string): string | undefined {
    // Extract HH:mm from cron expression or time string
    // Cron format: "0 8 * * *" = 08:00
    const cronMatch = schedule.match(/^(\d+)\s+(\d+)/);
    if (cronMatch) {
      const minute = cronMatch[1].padStart(2, '0');
      const hour = cronMatch[2].padStart(2, '0');
      return `${hour}:${minute}`;
    }
    // Direct time format: "08:00"
    const timeMatch = schedule.match(/^(\d{2}):(\d{2})$/);
    if (timeMatch) {
      return schedule;
    }
    return undefined;
  }

  enableSmartScheduling(): void {
    this.smartSchedulingEnabled = true;
  }

  disableSmartScheduling(): void {
    this.smartSchedulingEnabled = false;
  }

  updateSmartSchedulingConfig(config: Partial<SmartSchedulingConfig>): void {
    this.smartSchedulingConfig = {
      ...this.smartSchedulingConfig,
      ...config,
    };
  }

  updateName(name: string): void {
    this._name = name;
  }

  updateSchedule(schedule: string): void {
    this._schedule = schedule;
  }

  disable(): void {
    this.enabled = false;
  }

  enable(): void {
    this.enabled = true;
  }

  // 날씨 알림인지 확인
  isDailyWeatherAlert(): boolean {
    return this.category === AlertCategory.DAILY_WEATHER;
  }

  // 출발 알림인지 확인
  isDepartureReminderAlert(): boolean {
    return this.category === AlertCategory.DEPARTURE_REMINDER;
  }

  // 출발 알림 설정 업데이트
  updateDepartureConfig(config: Partial<DepartureAlertConfig>): void {
    if (!this.departureConfig) {
      this.departureConfig = config as DepartureAlertConfig;
    } else {
      this.departureConfig = {
        ...this.departureConfig,
        ...config,
      };
    }
  }

  // 카테고리 변경
  updateCategory(category: AlertCategory): void {
    this.category = category;
  }

  // 트리거 타입 변경
  updateTriggerType(triggerType: AlertTriggerType): void {
    this.triggerType = triggerType;
  }

  // 날씨 알림 생성 팩토리 메서드
  static createDailyWeatherAlert(
    userId: string,
    name: string,
    schedule: string,
    includeAirQuality = true,
  ): Alert {
    const alertTypes = includeAirQuality
      ? [AlertType.WEATHER, AlertType.AIR_QUALITY]
      : [AlertType.WEATHER];

    return new Alert(
      userId,
      name,
      schedule,
      alertTypes,
      undefined,
      undefined,
      undefined,
      false,
      undefined,
      undefined,
      AlertCategory.DAILY_WEATHER,
      AlertTriggerType.FIXED_TIME,
    );
  }

  // 출발 알림 생성 팩토리 메서드
  static createDepartureAlert(
    userId: string,
    name: string,
    departureConfig: DepartureAlertConfig,
  ): Alert {
    const schedule = departureConfig.fixedTime || '08:00';
    const alertTypes = [AlertType.SUBWAY, AlertType.BUS]; // 교통 정보 포함

    return new Alert(
      userId,
      name,
      schedule,
      alertTypes,
      undefined,
      undefined,
      undefined,
      departureConfig.triggerType === AlertTriggerType.SMART_DEPARTURE,
      departureConfig.triggerType === AlertTriggerType.SMART_DEPARTURE
        ? { targetArrivalTime: departureConfig.targetArrivalTime }
        : undefined,
      departureConfig.routeId,
      AlertCategory.DEPARTURE_REMINDER,
      departureConfig.triggerType,
      departureConfig,
    );
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      name: this._name,
      schedule: this._schedule,
      alertTypes: this.alertTypes,
      enabled: this.enabled,
      busStopId: this.busStopId,
      subwayStationId: this.subwayStationId,
      routeId: this.routeId,
      category: this.category,
      triggerType: this.triggerType,
      departureConfig: this.departureConfig,
      smartSchedulingEnabled: this.smartSchedulingEnabled,
      smartSchedulingConfig: this.smartSchedulingConfig,
      notificationTime: this.notificationTime,
    };
  }
}

