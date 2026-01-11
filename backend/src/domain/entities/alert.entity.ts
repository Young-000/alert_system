export enum AlertType {
  WEATHER = 'weather',
  AIR_QUALITY = 'airQuality',
  BUS = 'bus',
  SUBWAY = 'subway',
}

import { v4 as uuidv4 } from 'uuid';

export class Alert {
  public readonly id: string;
  public readonly userId: string;
  private _name: string;
  private _schedule: string;
  public alertTypes: AlertType[];
  public enabled: boolean;
  public busStopId?: string;
  public subwayStationId?: string;

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
    id?: string
  ) {
    this.id = id || uuidv4();
    this.userId = userId;
    this._name = name;
    this._schedule = schedule;
    this.alertTypes = alertTypes;
    this.enabled = true;
    this.busStopId = busStopId;
    this.subwayStationId = subwayStationId;
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
}

