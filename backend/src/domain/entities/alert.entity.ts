export enum AlertType {
  WEATHER = 'weather',
  AIR_QUALITY = 'airQuality',
  BUS = 'bus',
  SUBWAY = 'subway',
}

import { v4 as uuidv4 } from 'uuid';

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
  ) {
    this.id = id || uuidv4();
    this.userId = userId;
    this._name = name;
    this._schedule = schedule;
    this.alertTypes = alertTypes;
    this.enabled = true;
    this.busStopId = busStopId;
    this.subwayStationId = subwayStationId;

    // Smart scheduling initialization
    this.smartSchedulingEnabled = smartSchedulingEnabled;
    this.smartSchedulingConfig = {
      ...DEFAULT_SMART_SCHEDULING_CONFIG,
      ...smartSchedulingConfig,
    };
    this.notificationTime = this.extractTimeFromSchedule(schedule);
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
      smartSchedulingEnabled: this.smartSchedulingEnabled,
      smartSchedulingConfig: this.smartSchedulingConfig,
      notificationTime: this.notificationTime,
    };
  }
}

