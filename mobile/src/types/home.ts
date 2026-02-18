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

// ─── Widget Data Types ───────────────────────────

export type WidgetWeatherData = {
  temperature: number;
  condition: string;
  conditionEmoji: string;
  conditionKr: string;
  feelsLike?: number;
  maxTemp?: number;
  minTemp?: number;
};

export type WidgetAirQualityData = {
  pm10: number;
  pm25: number;
  status: string;
  statusLevel: 'good' | 'moderate' | 'unhealthy' | 'veryUnhealthy';
};

export type WidgetNextAlertData = {
  time: string;
  label: string;
  alertTypes: string[];
};

export type WidgetSubwayData = {
  stationName: string;
  lineInfo: string;
  arrivalMinutes: number;
  destination: string;
};

export type WidgetBusData = {
  stopName: string;
  routeName: string;
  arrivalMinutes: number;
  remainingStops: number;
};

export type WidgetTransitData = {
  subway: WidgetSubwayData | null;
  bus: WidgetBusData | null;
};

export type WidgetDataResponse = {
  weather: WidgetWeatherData | null;
  airQuality: WidgetAirQualityData | null;
  nextAlert: WidgetNextAlertData | null;
  transit: WidgetTransitData;
  updatedAt: string;
};

// ─── Time Context ─────────────────────────────────

export type TimeContext = 'morning' | 'evening' | 'tomorrow';

// ─── Briefing ─────────────────────────────────────

export type BriefingData = {
  main: string;
  sub: string;
  contextLabel: string;
};
