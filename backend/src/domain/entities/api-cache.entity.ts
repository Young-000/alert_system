/**
 * API 캐시 엔티티들
 * - 외부 API 호출 결과를 DB에 저장하여 rate limit 관리
 * - 캐시 만료 시간까지 DB에서 데이터 반환
 */

export class WeatherCache {
  constructor(
    public readonly id: string,
    public readonly lat: number,
    public readonly lng: number,
    public readonly location: string,
    public readonly temperature: number,
    public readonly condition: string,
    public readonly humidity: number,
    public readonly windSpeed: number,
    public readonly fetchedAt: Date,
    public readonly expiresAt: Date,
  ) {}

  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }
}

export class AirQualityCache {
  constructor(
    public readonly id: string,
    public readonly sidoName: string,
    public readonly stationName: string,
    public readonly pm10: number,
    public readonly pm25: number,
    public readonly aqi: number,
    public readonly status: string,
    public readonly fetchedAt: Date,
    public readonly expiresAt: Date,
  ) {}

  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }
}

export class SubwayArrivalCache {
  constructor(
    public readonly id: string,
    public readonly stationName: string,
    public readonly arrivals: Array<{
      stationId: string;
      subwayId: string;
      direction: string;
      arrivalTime: number;
      destination: string;
    }>,
    public readonly fetchedAt: Date,
    public readonly expiresAt: Date,
  ) {}

  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }
}

export class BusArrivalCache {
  constructor(
    public readonly id: string,
    public readonly stopId: string,
    public readonly arrivals: Array<{
      stopId: string;
      routeId: string;
      routeName: string;
      arrivalTime: number;
      stationOrder: number;
    }>,
    public readonly fetchedAt: Date,
    public readonly expiresAt: Date,
  ) {}

  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }
}

export class ApiCallLog {
  constructor(
    public readonly id: string,
    public readonly apiName: string,
    public readonly endpoint: string,
    public readonly calledAt: Date,
    public readonly success: boolean,
    public readonly responseTimeMs: number,
    public readonly errorMessage?: string,
  ) {}
}
