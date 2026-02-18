// ─── Weather Types ────────────────────────────────

export type HourlyForecast = {
  time: string;
  temperature: number;
  condition: string;
  rainProbability: number;
};

export type WeatherData = {
  location: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  feelsLike?: number;
  conditionKr: string;
  conditionEmoji: string;
  forecast?: {
    maxTemp: number;
    minTemp: number;
    hourlyForecasts: HourlyForecast[];
  };
};

export type AirQualityData = {
  location: string;
  pm10: number;
  pm25: number;
  aqi: number;
  status: string;
};

// ─── Route Types ──────────────────────────────────

export type RouteType = 'morning' | 'evening' | 'custom';

export type CheckpointType =
  | 'home'
  | 'subway'
  | 'bus_stop'
  | 'transfer_point'
  | 'work'
  | 'custom';

export type TransportMode =
  | 'walk'
  | 'subway'
  | 'bus'
  | 'transfer'
  | 'taxi'
  | 'bike';

export type CheckpointResponse = {
  id: string;
  sequenceOrder: number;
  name: string;
  checkpointType: CheckpointType;
  linkedStationId?: string;
  linkedBusStopId?: string;
  lineInfo?: string;
  expectedDurationToNext?: number;
  expectedWaitTime: number;
  transportMode?: TransportMode;
};

export type RouteResponse = {
  id: string;
  userId: string;
  name: string;
  routeType: RouteType;
  isPreferred: boolean;
  totalExpectedDuration?: number;
  checkpoints: CheckpointResponse[];
  createdAt: string;
  updatedAt: string;
};

// ─── Transit Types ────────────────────────────────

export type SubwayArrival = {
  stationId: string;
  lineId: string;
  direction: string;
  arrivalTime: number;
  destination: string;
};

export type BusArrival = {
  stopId: string;
  routeId: string;
  routeName: string;
  arrivalTime: number;
  remainingStops: number;
};

export type TransitArrivalInfo = {
  type: 'bus' | 'subway';
  name: string;
  arrivals: (BusArrival | SubwayArrival)[];
  isLoading: boolean;
  error?: string;
};

// ─── Alert Types ──────────────────────────────────

export type AlertType = 'weather' | 'airQuality' | 'bus' | 'subway';

export type Alert = {
  id: string;
  userId: string;
  name: string;
  schedule: string;
  alertTypes: AlertType[];
  enabled: boolean;
};

// ─── Commute Stats Types ──────────────────────────

export type CommuteStatsResponse = {
  userId: string;
  totalSessions: number;
  overallAverageDuration: number;
  overallAverageWaitTime: number;
  overallAverageDelay: number;
  insights: string[];
};

// ─── AQI Status ───────────────────────────────────

export type AqiStatus = {
  label: string;
  color: string;
  backgroundColor: string;
};

// ─── Time Context ─────────────────────────────────

export type TimeContext = 'morning' | 'evening' | 'tomorrow';

// ─── Briefing ─────────────────────────────────────

export type BriefingData = {
  main: string;
  sub: string;
  contextLabel: string;
};
