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
  public readonly name: string;
  public readonly schedule: string;
  public alertTypes: AlertType[];
  public enabled: boolean;
  public busStopId?: string;
  public subwayStationId?: string;

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
    this.name = name;
    this.schedule = schedule;
    this.alertTypes = alertTypes;
    this.enabled = true;
    this.busStopId = busStopId;
    this.subwayStationId = subwayStationId;
  }

  disable(): void {
    this.enabled = false;
  }

  enable(): void {
    this.enabled = true;
  }
}

