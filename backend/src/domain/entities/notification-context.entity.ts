import { Weather } from './weather.entity';
import { AirQuality } from './air-quality.entity';
import { BusArrival } from './bus-arrival.entity';
import { SubwayArrival } from './subway-arrival.entity';

export interface NotificationContext {
  weather?: Weather;
  airQuality?: AirQuality;
  busArrivals?: BusArrival[];
  subwayArrivals?: SubwayArrival[];
  subwayStationName?: string;
  busStopName?: string;
  timestamp: Date;
  userId: string;
  alertId: string;
}

export class NotificationContextBuilder {
  private context: Partial<NotificationContext> = {
    timestamp: new Date(),
  };

  static create(userId: string, alertId: string): NotificationContextBuilder {
    const builder = new NotificationContextBuilder();
    builder.context.userId = userId;
    builder.context.alertId = alertId;
    return builder;
  }

  withWeather(weather: Weather): NotificationContextBuilder {
    this.context.weather = weather;
    return this;
  }

  withAirQuality(airQuality: AirQuality): NotificationContextBuilder {
    this.context.airQuality = airQuality;
    return this;
  }

  withBusArrivals(arrivals: BusArrival[], stopName?: string): NotificationContextBuilder {
    this.context.busArrivals = arrivals;
    this.context.busStopName = stopName;
    return this;
  }

  withSubwayArrivals(arrivals: SubwayArrival[], stationName?: string): NotificationContextBuilder {
    this.context.subwayArrivals = arrivals;
    this.context.subwayStationName = stationName;
    return this;
  }

  build(): NotificationContext {
    if (!this.context.userId || !this.context.alertId) {
      throw new Error('NotificationContext requires userId and alertId');
    }

    return {
      weather: this.context.weather,
      airQuality: this.context.airQuality,
      busArrivals: this.context.busArrivals,
      subwayArrivals: this.context.subwayArrivals,
      subwayStationName: this.context.subwayStationName,
      busStopName: this.context.busStopName,
      timestamp: this.context.timestamp || new Date(),
      userId: this.context.userId,
      alertId: this.context.alertId,
    };
  }
}

export function hasWeatherData(context: NotificationContext): boolean {
  return context.weather !== undefined;
}

export function hasAirQualityData(context: NotificationContext): boolean {
  return context.airQuality !== undefined;
}

export function hasTransitData(context: NotificationContext): boolean {
  const hasBus = context.busArrivals !== undefined && context.busArrivals.length > 0;
  const hasSubway = context.subwayArrivals !== undefined && context.subwayArrivals.length > 0;
  return hasBus || hasSubway;
}

export function hasBothTransitModes(context: NotificationContext): boolean {
  const hasBus = context.busArrivals !== undefined && context.busArrivals.length > 0;
  const hasSubway = context.subwayArrivals !== undefined && context.subwayArrivals.length > 0;
  return hasBus && hasSubway;
}
