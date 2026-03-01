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
  getAnalytics: vi.fn().mockResolvedValue({
    totalPatterns: 0,
    totalCommuteRecords: 0,
    averageConfidence: 0,
    hasEnoughData: false,
  }),
  getPrediction: vi.fn().mockResolvedValue({
    departureTime: '08:05',
    confidence: 0.72,
    tier: 'day_aware',
    departureRange: { early: '07:55', late: '08:15' },
    contributingFactors: [
      { type: 'day_of_week', label: '월요일 패턴', impact: -3, description: '월요일은 평균보다 3분 일찍 출발', confidence: 0.8 },
    ],
    dataStatus: { totalRecords: 15, tier: 'day_aware', nextTierAt: 20, nextTierName: 'weather_aware' },
  }),
  getInsights: vi.fn().mockResolvedValue({
    dayOfWeek: {
      segments: [
        { dayOfWeek: 1, dayName: '월', avgMinutes: 485, stdDevMinutes: 4, sampleCount: 3 },
        { dayOfWeek: 2, dayName: '화', avgMinutes: 490, stdDevMinutes: 3, sampleCount: 3 },
        { dayOfWeek: 3, dayName: '수', avgMinutes: 488, stdDevMinutes: 2, sampleCount: 3 },
        { dayOfWeek: 4, dayName: '목', avgMinutes: 492, stdDevMinutes: 5, sampleCount: 3 },
        { dayOfWeek: 5, dayName: '금', avgMinutes: 500, stdDevMinutes: 9, sampleCount: 3 },
      ],
      mostConsistentDay: { dayOfWeek: 3, dayName: '수', stdDevMinutes: 2 },
      mostVariableDay: { dayOfWeek: 5, dayName: '금', stdDevMinutes: 9 },
    },
    weatherSensitivity: {
      level: 'medium',
      rainImpact: -8,
      snowImpact: -14,
      temperatureImpact: -1,
      comparedToAverage: { rainDelta: -2, description: '비 영향이 평균보다 2분 적음' },
    },
    summary: {
      totalRecords: 15,
      tier: 'day_aware',
      averageDeparture: '08:05',
      overallStdDev: 6,
      confidence: 0.72,
    },
  }),
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
  compareRoutes: vi.fn().mockResolvedValue(null),
  getWeatherRouteRecommendation: vi.fn().mockResolvedValue({ confidence: 0, recommendation: null }),
  getAnalyticsSummary: vi.fn().mockResolvedValue({
    totalRoutes: 0,
    totalTrips: 0,
    averageScore: 0,
    insights: [],
  }),
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

export type CheckpointType = 'home' | 'subway' | 'bus_stop' | 'transfer_point' | 'work' | 'custom';

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

export const briefingApiClient = {
  getBriefing: vi.fn().mockResolvedValue({
    advices: [],
    weather: null,
    airQuality: null,
    contextLabel: '출근 브리핑',
    summary: '',
    updatedAt: new Date().toISOString(),
  }),
};

export type AdviceSeverity = 'info' | 'warning' | 'danger';

export interface AdviceChip {
  emoji: string;
  text: string;
  severity: AdviceSeverity;
}

export interface BriefingResponse {
  advices: AdviceChip[];
  weather: unknown;
  airQuality: unknown;
  contextLabel: string;
  summary: string;
  updatedAt: string;
}

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

// Types needed by commute-dashboard hook — must match commute-api.client.ts exactly
export interface CheckpointStats {
  checkpointId: string;
  checkpointName: string;
  checkpointType: CheckpointType;
  expectedDuration: number;
  expectedWaitTime: number;
  averageActualDuration: number;
  averageActualWaitTime: number;
  averageDelay: number;
  sampleCount: number;
  variability: number;
  isBottleneck: boolean;
}

export interface RouteStats {
  routeId: string;
  routeName: string;
  totalSessions: number;
  averageTotalDuration: number;
  averageTotalWaitTime: number;
  averageDelay: number;
  waitTimePercentage: number;
  checkpointStats: CheckpointStats[];
  bottleneckCheckpoint?: string;
  mostVariableCheckpoint?: string;
}

export interface DayOfWeekStats {
  dayOfWeek: number;
  dayName: string;
  averageDuration: number;
  averageWaitTime: number;
  averageDelay: number;
  sampleCount: number;
}

export interface WeatherImpact {
  condition: string;
  averageDuration: number;
  sampleCount: number;
}

export interface CommuteStatsResponse {
  userId: string;
  totalSessions: number;
  recentSessions: number;
  overallAverageDuration: number;
  overallAverageWaitTime: number;
  overallAverageDelay: number;
  waitTimePercentage: number;
  routeStats: RouteStats[];
  dayOfWeekStats: DayOfWeekStats[];
  weatherImpact: WeatherImpact[];
  insights: string[];
}

// Keep deprecated aliases for backward compat
export type RouteStatResponse = RouteStats;
export type DayOfWeekStatResponse = DayOfWeekStats;
export type WeatherImpactResponse = WeatherImpact;

export interface CommuteHistoryResponse {
  userId: string;
  sessions: SessionSummary[];
  totalCount: number;
  hasMore: boolean;
}

export interface SessionSummary {
  id: string;
  routeId: string;
  routeName?: string;
  startedAt: string;
  completedAt?: string;
  totalDurationMinutes?: number;
  totalWaitMinutes: number;
  totalDelayMinutes: number;
  status: SessionStatus;
  weatherCondition?: string;
  delayStatus: string;
}

export type SessionStatus = 'in_progress' | 'completed' | 'cancelled';

export interface CheckpointRecordResponse {
  id: string;
  checkpointId: string;
  checkpointName?: string;
  arrivedAt: string;
  arrivalTimeString: string;
  durationFromPrevious?: number;
  actualWaitTime: number;
  isDelayed: boolean;
  delayMinutes: number;
  waitDelayMinutes: number;
  delayStatus: string;
  waitDelayStatus: string;
  totalDuration: number;
  notes?: string;
}

export interface SessionResponse {
  id: string;
  userId: string;
  routeId: string;
  startedAt: string;
  completedAt?: string;
  totalDurationMinutes?: number;
  totalWaitMinutes: number;
  totalDelayMinutes: number;
  status: SessionStatus;
  weatherCondition?: string;
  notes?: string;
  progress: number;
  delayStatus: string;
  pureMovementTime: number;
  waitTimePercentage: number;
  checkpointRecords: CheckpointRecordResponse[];
}

export interface ScoreFactors {
  speed: number;
  reliability: number;
  comfort: number;
}

export interface SegmentStats {
  checkpointName: string;
  transportMode: string;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  variability: 'stable' | 'variable' | 'unpredictable';
  sampleCount: number;
}

export interface ConditionAnalysis {
  byWeather: Record<string, { avgDuration: number; count: number }>;
  byDayOfWeek: Record<string, { avgDuration: number; count: number }>;
  byTimeSlot: Record<string, { avgDuration: number; count: number }>;
}

export interface RouteAnalyticsResponse {
  routeId: string;
  routeName: string;
  totalTrips: number;
  lastTripDate?: string;
  duration: {
    average: number;
    min: number;
    max: number;
    stdDev: number;
  };
  segmentStats: SegmentStats[];
  conditionAnalysis: ConditionAnalysis;
  score: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  scoreFactors: ScoreFactors;
  summary: string;
  variabilityText: string;
  isRecommended: boolean;
  lastCalculatedAt: string;
}

export interface AnalyticsSummaryResponse {
  totalRoutes: number;
  totalTrips: number;
  averageScore: number;
  bestRoute?: RouteAnalyticsResponse;
  mostUsedRoute?: RouteAnalyticsResponse;
  insights: string[];
}

export interface RouteComparisonResponse {
  routes: unknown[];
  recommendation: string | null;
}

// Pattern ML types
export type PredictionTier = 'cold_start' | 'basic' | 'day_aware' | 'weather_aware' | 'full';

export interface ContributingFactor {
  type: string;
  label: string;
  impact: number;
  description: string;
  confidence: number;
}

export interface DataStatus {
  totalRecords: number;
  tier: PredictionTier;
  nextTierAt: number;
  nextTierName: string;
}

export interface DepartureRange {
  early: string;
  late: string;
}

export interface PredictionResponse {
  departureTime: string;
  confidence: number;
  tier: PredictionTier;
  departureRange: DepartureRange;
  contributingFactors: ContributingFactor[];
  dataStatus: DataStatus;
}

export interface DaySegment {
  dayOfWeek: number;
  dayName: string;
  avgMinutes: number;
  stdDevMinutes: number;
  sampleCount: number;
}

export interface DayOfWeekInsights {
  segments: DaySegment[];
  mostConsistentDay: { dayOfWeek: number; dayName: string; stdDevMinutes: number } | null;
  mostVariableDay: { dayOfWeek: number; dayName: string; stdDevMinutes: number } | null;
}

export type SensitivityLevel = 'low' | 'medium' | 'high';

export interface WeatherSensitivity {
  level: SensitivityLevel;
  rainImpact: number;
  snowImpact: number;
  temperatureImpact: number;
  comparedToAverage: { rainDelta: number; description: string } | null;
}

export interface InsightsSummary {
  totalRecords: number;
  tier: PredictionTier;
  averageDeparture: string;
  overallStdDev: number;
  confidence: number;
}

export interface InsightsResponse {
  dayOfWeek: DayOfWeekInsights;
  weatherSensitivity: WeatherSensitivity | null;
  summary: InsightsSummary;
}

// Types needed by behavior-api.client
export interface BehaviorAnalytics {
  totalPatterns: number;
  totalCommuteRecords: number;
  averageConfidence: number;
  hasEnoughData: boolean;
}

export interface UserPattern {
  id: string;
  userId: string;
  patternType: string;
  confidence: number;
  description: string;
}

// Types needed by commute-api.client
export interface CreateCheckpointDto {
  sequenceOrder: number;
  name: string;
  checkpointType: CheckpointType;
  linkedStationId?: string;
  linkedBusStopId?: string;
  lineInfo?: string;
  transportMode?: string;
}
