// Mock API clients for Vitest
export const apiClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
};

// ApiClient class mock
export class ApiClient {
  constructor(_baseUrl: string) {
    // Mock - baseUrl not used
  }
  get = vi.fn();
  post = vi.fn();
  put = vi.fn();
  delete = vi.fn();
  patch = vi.fn();
}

export const alertApiClient = {
  createAlert: vi.fn().mockResolvedValue({}),
  getAlertsByUser: vi.fn().mockResolvedValue([]),
  getAlert: vi.fn().mockResolvedValue(null),
  deleteAlert: vi.fn().mockResolvedValue(undefined),
  toggleAlert: vi.fn().mockResolvedValue(undefined),
  updateAlert: vi.fn().mockResolvedValue({}),
};

export const userApiClient = {
  createUser: vi.fn(),
  getUser: vi.fn(),
  updateLocation: vi.fn(),
  exportData: vi.fn().mockResolvedValue({}),
  deleteAllData: vi.fn().mockResolvedValue({ success: true }),
};

export const weatherApiClient = {
  getCurrentWeather: vi.fn().mockResolvedValue({
    location: 'Seoul',
    temperature: 20,
    condition: 'Clear',
    humidity: 50,
    windSpeed: 3,
    conditionKr: '맑음',
    conditionEmoji: '',
  }),
};

export const airQualityApiClient = {
  getByLocation: vi.fn().mockResolvedValue({
    location: 'Seoul',
    pm10: 30,
    pm25: 15,
    aqi: 50,
    status: 'good',
  }),
};

export const subwayApiClient = {
  searchStations: vi.fn(),
  getArrival: vi.fn().mockResolvedValue([]),
};

export const busApiClient = {
  searchStops: vi.fn(),
  getArrival: vi.fn().mockResolvedValue([]),
};

export const behaviorApiClient = {
  getOptimalDeparture: vi.fn().mockResolvedValue(null),
  getPatterns: vi.fn().mockResolvedValue([]),
  recordEvent: vi.fn().mockResolvedValue(undefined),
};

export const getBehaviorApiClient = vi.fn(() => behaviorApiClient);

export interface SubwayStation {
  id: string;
  name: string;
  line: string;
}

export interface BusStop {
  id: string;
  name: string;
  arsId: string;
}

export const commuteApiClient = {
  getUserRoutes: vi.fn().mockResolvedValue([]),
  createRoute: vi.fn().mockResolvedValue({}),
  updateRoute: vi.fn().mockResolvedValue({}),
  deleteRoute: vi.fn().mockResolvedValue(undefined),
  getInProgressSession: vi.fn().mockResolvedValue(null),
  startSession: vi.fn().mockResolvedValue({}),
  recordCheckpoint: vi.fn().mockResolvedValue({}),
  completeSession: vi.fn().mockResolvedValue({}),
  cancelSession: vi.fn().mockResolvedValue(undefined),
  getStats: vi.fn().mockResolvedValue({
    userId: 'test-user-id',
    totalSessions: 0,
    recentSessions: 0,
    overallAverageDuration: 0,
    overallAverageWaitTime: 0,
    overallAverageDelay: 0,
    waitTimePercentage: 0,
    routeStats: [],
    dayOfWeekStats: [],
    weatherImpact: [],
    insights: [],
  }),
  getHistory: vi.fn().mockResolvedValue([]),
  getUserAnalytics: vi.fn().mockResolvedValue([]),
  getWeatherRouteRecommendation: vi.fn().mockResolvedValue({ confidence: 0, recommendation: null }),
  getWeeklyReport: vi.fn().mockResolvedValue({
    weekStartDate: '2026-02-17',
    weekEndDate: '2026-02-23',
    weekLabel: '2월 4주차',
    totalSessions: 0,
    totalRecordedDays: 0,
    averageDuration: 0,
    minDuration: 0,
    maxDuration: 0,
    dailyStats: [],
    bestDay: null,
    worstDay: null,
    previousWeekAverage: null,
    changeFromPrevious: null,
    changePercentage: null,
    trend: null,
    insights: [],
    streakWeeklyCount: 0,
    streakWeeklyGoal: 5,
  }),
};

// Factory function for CommuteApiClient
export const getCommuteApiClient = vi.fn(() => commuteApiClient);

// Type exports
export type RouteType = 'commute_to_work' | 'commute_to_home' | 'other';
export type TransportMode = 'walk' | 'subway' | 'bus' | 'taxi';
export type CheckpointType = 'home' | 'subway' | 'bus' | 'transfer' | 'company' | 'other';

export interface CreateRouteDto {
  userId: string;
  name: string;
  type: RouteType;
  isDefault: boolean;
  checkpoints: {
    name: string;
    type: CheckpointType;
    travelTime: number;
    waitTime: number;
    transportMode: TransportMode;
    stationId?: string;
    stationName?: string;
  }[];
}

export interface RouteResponse {
  id: string;
  userId: string;
  name: string;
  type: RouteType;
  isDefault: boolean;
  checkpoints: {
    id: string;
    name: string;
    type: CheckpointType;
    travelTime: number;
    waitTime: number;
    transportMode: TransportMode;
    sequence: number;
  }[];
}

export const notificationApiClient = {
  getHistory: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  getStats: vi.fn().mockResolvedValue({
    total: 0,
    success: 0,
    fallback: 0,
    failed: 0,
    successRate: 100,
  }),
};

export interface NotificationLog {
  id: string;
  alertId: string;
  alertName: string;
  alertTypes: string[];
  status: string;
  summary: string;
  sentAt: string;
}

export interface NotificationStatsDto {
  total: number;
  success: number;
  fallback: number;
  failed: number;
  successRate: number;
}

// Weekly Report types (re-exported for tests)
export type TrendDirection = 'improving' | 'stable' | 'worsening';

export interface DailyStatsResponse {
  date: string;
  dayOfWeek: number;
  dayName: string;
  sessionCount: number;
  averageDuration: number;
  totalDuration: number;
  averageDelay: number;
  averageWaitTime: number;
  weatherCondition: string | null;
}

export interface WeeklyReportResponse {
  weekStartDate: string;
  weekEndDate: string;
  weekLabel: string;
  totalSessions: number;
  totalRecordedDays: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  dailyStats: DailyStatsResponse[];
  bestDay: DailyStatsResponse | null;
  worstDay: DailyStatsResponse | null;
  previousWeekAverage: number | null;
  changeFromPrevious: number | null;
  changePercentage: number | null;
  trend: TrendDirection | null;
  insights: string[];
  streakWeeklyCount: number;
  streakWeeklyGoal: number;
}

export const authApiClient = {
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  verify: vi.fn(),
};

export type AlertType = 'weather' | 'airQuality' | 'bus' | 'subway';

export interface Alert {
  id: string;
  userId: string;
  name: string;
  schedule: string;
  alertTypes: AlertType[];
  enabled: boolean;
  busStopId?: string;
  subwayStationId?: string;
  routeId?: string;
}

export interface CreateAlertDto {
  userId: string;
  name: string;
  schedule: string;
  alertTypes: AlertType[];
  busStopId?: string;
  subwayStationId?: string;
}

export interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  feelsLike?: number;
  conditionKr: string;
  conditionEmoji: string;
}

export interface AirQualityData {
  location: string;
  pm10: number;
  pm25: number;
  aqi: number;
  status: string;
}

export interface DeparturePrediction {
  suggestedDepartureTime: string;
  confidence: number;
  reason: string;
}
