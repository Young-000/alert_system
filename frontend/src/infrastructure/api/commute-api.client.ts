import { ApiClient } from './api-client';

// ========== Types ==========

export type RouteType = 'morning' | 'evening' | 'custom';
export type CheckpointType = 'home' | 'subway' | 'bus_stop' | 'transfer_point' | 'work' | 'custom';
export type TransportMode = 'walk' | 'subway' | 'bus' | 'transfer' | 'taxi' | 'bike';
export type SessionStatus = 'in_progress' | 'completed' | 'cancelled';

export interface CreateCheckpointDto {
  sequenceOrder: number;
  name: string;
  checkpointType: CheckpointType;
  linkedStationId?: string;
  linkedBusStopId?: string;
  lineInfo?: string;
  expectedDurationToNext?: number;
  expectedWaitTime?: number;
  transportMode?: TransportMode;
}

export interface CreateRouteDto {
  userId: string;
  name: string;
  routeType: RouteType;
  isPreferred?: boolean;
  checkpoints: CreateCheckpointDto[];
}

export interface UpdateRouteDto {
  name?: string;
  routeType?: RouteType;
  isPreferred?: boolean;
  checkpoints?: CreateCheckpointDto[];
}

export interface CheckpointResponse {
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
  totalExpectedTime: number;
  isTransferRelated: boolean;
}

export interface RouteResponse {
  id: string;
  userId: string;
  name: string;
  routeType: RouteType;
  isPreferred: boolean;
  totalExpectedDuration?: number;
  totalTransferTime: number;
  pureMovementTime: number;
  checkpoints: CheckpointResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface StartSessionDto {
  userId: string;
  routeId: string;
  weatherCondition?: string;
}

export interface RecordCheckpointDto {
  sessionId: string;
  checkpointId: string;
  actualWaitTime?: number;
  notes?: string;
}

export interface CompleteSessionDto {
  sessionId: string;
  notes?: string;
}

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

export interface CommuteHistoryResponse {
  userId: string;
  sessions: SessionSummary[];
  totalCount: number;
  hasMore: boolean;
}

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
  averageDelay: number;
  sampleCount: number;
  comparedToNormal: number;
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

// ========== Route Analytics Types ==========

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

export interface ScoreFactors {
  speed: number;
  reliability: number;
  comfort: number;
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

export interface RouteComparisonResponse {
  routes: RouteAnalyticsResponse[];
  winner: {
    fastest: string;
    mostReliable: string;
    recommended: string;
  };
  analysis: {
    timeDifference: number;
    reliabilityDifference: number;
  };
}

export interface AnalyticsSummaryResponse {
  totalRoutes: number;
  totalTrips: number;
  averageScore: number;
  bestRoute?: RouteAnalyticsResponse;
  mostUsedRoute?: RouteAnalyticsResponse;
  insights: string[];
}

// ========== Route Recommendation Types ==========

export interface RouteScoreResponse {
  routeId: string;
  routeName: string;
  totalScore: number;
  scores: {
    speed: number;
    reliability: number;
    weatherResilience: number;
  };
  averageDuration: number;
  variability: number;
  sampleCount: number;
  reasons: string[];
}

export interface RouteRecommendationResponse {
  recommendedRouteId: string | null;
  recommendation: RouteScoreResponse | null;
  alternatives: RouteScoreResponse[];
  confidence: number;
  insights: string[];
  weatherCondition?: string;
}

// ========== Weekly Report Types ==========

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

// ========== Streak Types ==========

export type StreakStatus = 'active' | 'at_risk' | 'broken' | 'new';
export type MilestoneType = '7d' | '14d' | '30d' | '60d' | '100d';

export interface NextMilestone {
  type: MilestoneType;
  label: string;
  daysRemaining: number;
  progress: number;
}

export interface StreakResponse {
  userId: string;
  currentStreak: number;
  bestStreak: number;
  lastRecordDate: string | null;
  streakStartDate: string | null;
  weeklyGoal: number;
  weeklyCount: number;
  weekStartDate: string;
  milestonesAchieved: MilestoneType[];
  latestMilestone: MilestoneType | null;
  nextMilestone: NextMilestone | null;
  streakStatus: StreakStatus;
  excludeWeekends: boolean;
  reminderEnabled: boolean;
  todayRecorded: boolean;
}

export interface StreakUpdateResult {
  currentStreak: number;
  isNewRecord: boolean;
  milestoneAchieved: MilestoneType | null;
  todayFirstCompletion: boolean;
  weeklyCount: number;
  weeklyGoal: number;
}

export interface MilestoneInfo {
  type: MilestoneType;
  label: string;
  achieved: boolean;
  achievedAt?: string;
  progress?: number;
  daysRemaining?: number;
  badge: string;
  badgeName: string;
}

export interface StreakBadgeInfo {
  type: MilestoneType;
  badge: string;
  badgeName: string;
  label: string;
}

export interface MilestonesResponse {
  milestones: MilestoneInfo[];
  currentStreak: number;
  earnedBadges: StreakBadgeInfo[];
}

// ========== Delay Status Types ==========

export type OverallDelayStatus = 'normal' | 'minor_delay' | 'delayed' | 'severe_delay' | 'unavailable';
export type SegmentDelayStatus = 'normal' | 'delayed' | 'severe_delay' | 'unavailable';
export type AlternativeConfidence = 'high' | 'medium' | 'low';

export interface DelaySegmentResponse {
  checkpointId: string;
  checkpointName: string;
  checkpointType: string;
  lineInfo: string;
  status: SegmentDelayStatus;
  expectedWaitMinutes: number;
  estimatedWaitMinutes: number;
  delayMinutes: number;
  source: 'realtime_api' | 'estimated';
  lastUpdated: string;
}

export interface AlternativeStepResponse {
  action: 'walk' | 'subway' | 'bus';
  from: string;
  to?: string;
  line?: string;
  durationMinutes: number;
}

export interface AlternativeSuggestionResponse {
  id: string;
  triggerSegment: string;
  triggerReason: string;
  description: string;
  steps: AlternativeStepResponse[];
  totalDurationMinutes: number;
  originalDurationMinutes: number;
  savingsMinutes: number;
  walkingDistanceMeters?: number;
  confidence: AlternativeConfidence;
}

export interface DelayStatusResponse {
  routeId: string;
  routeName: string;
  checkedAt: string;
  overallStatus: OverallDelayStatus;
  totalExpectedDuration: number;
  totalEstimatedDuration: number;
  totalDelayMinutes: number;
  segments: DelaySegmentResponse[];
  alternatives: AlternativeSuggestionResponse[];
}

// ========== API Client ==========

export class CommuteApiClient {
  constructor(private apiClient: ApiClient) {}

  // ========== Route APIs ==========

  async createRoute(dto: CreateRouteDto): Promise<RouteResponse> {
    return this.apiClient.post<RouteResponse>('/routes', dto);
  }

  async getRoute(id: string): Promise<RouteResponse> {
    return this.apiClient.get<RouteResponse>(`/routes/${id}`);
  }

  async getUserRoutes(userId: string, routeType?: RouteType): Promise<RouteResponse[]> {
    const url = routeType
      ? `/routes/user/${userId}?type=${routeType}`
      : `/routes/user/${userId}`;
    return this.apiClient.get<RouteResponse[]>(url);
  }

  async updateRoute(id: string, dto: UpdateRouteDto): Promise<RouteResponse> {
    return this.apiClient.patch<RouteResponse>(`/routes/${id}`, dto);
  }

  async deleteRoute(id: string): Promise<void> {
    return this.apiClient.delete(`/routes/${id}`);
  }

  // ========== Session APIs ==========

  async startSession(dto: StartSessionDto): Promise<SessionResponse> {
    return this.apiClient.post<SessionResponse>('/commute/start', dto);
  }

  async recordCheckpoint(dto: RecordCheckpointDto): Promise<SessionResponse> {
    return this.apiClient.post<SessionResponse>('/commute/checkpoint', dto);
  }

  async completeSession(dto: CompleteSessionDto): Promise<SessionResponse> {
    return this.apiClient.post<SessionResponse>('/commute/complete', dto);
  }

  async cancelSession(sessionId: string): Promise<{ success: boolean }> {
    return this.apiClient.post<{ success: boolean }>(`/commute/cancel/${sessionId}`);
  }

  async getSession(sessionId: string): Promise<SessionResponse> {
    return this.apiClient.get<SessionResponse>(`/commute/session/${sessionId}`);
  }

  async getInProgressSession(userId: string): Promise<SessionResponse | null> {
    const response = await this.apiClient.get<SessionResponse | { session: null }>(
      `/commute/in-progress/${userId}`
    );
    if ('session' in response && response.session === null) {
      return null;
    }
    return response as SessionResponse;
  }

  // ========== History & Stats APIs ==========

  async getHistory(userId: string, limit = 20, offset = 0): Promise<CommuteHistoryResponse> {
    return this.apiClient.get<CommuteHistoryResponse>(
      `/commute/history/${userId}?limit=${limit}&offset=${offset}`
    );
  }

  async getStats(userId: string, days = 30): Promise<CommuteStatsResponse> {
    return this.apiClient.get<CommuteStatsResponse>(`/commute/stats/${userId}?days=${days}`);
  }

  // ========== Analytics APIs ==========

  async getRouteAnalytics(routeId: string): Promise<RouteAnalyticsResponse> {
    return this.apiClient.get<RouteAnalyticsResponse>(`/analytics/routes/${routeId}`);
  }

  async recalculateRouteAnalytics(routeId: string): Promise<RouteAnalyticsResponse> {
    return this.apiClient.post<RouteAnalyticsResponse>(`/analytics/routes/${routeId}/recalculate`);
  }

  async getUserAnalytics(userId: string): Promise<RouteAnalyticsResponse[]> {
    return this.apiClient.get<RouteAnalyticsResponse[]>(`/analytics/user/${userId}`);
  }

  async compareRoutes(routeIds: string[]): Promise<RouteComparisonResponse> {
    return this.apiClient.get<RouteComparisonResponse>(
      `/analytics/compare?routeIds=${routeIds.join(',')}`
    );
  }

  async getRecommendedRoutes(userId: string, limit = 3): Promise<RouteAnalyticsResponse[]> {
    return this.apiClient.get<RouteAnalyticsResponse[]>(
      `/analytics/recommend/${userId}?limit=${limit}`
    );
  }

  async getAnalyticsSummary(userId: string): Promise<AnalyticsSummaryResponse> {
    return this.apiClient.get<AnalyticsSummaryResponse>(`/analytics/summary/${userId}`);
  }

  // ========== Route Recommendation APIs ==========

  async getWeatherRouteRecommendation(
    userId: string,
    weather?: string,
  ): Promise<RouteRecommendationResponse> {
    const query = weather ? `?weather=${encodeURIComponent(weather)}` : '';
    return this.apiClient.get<RouteRecommendationResponse>(
      `/routes/user/${userId}/recommend${query}`,
    );
  }

  // ========== Weekly Report APIs ==========

  async getWeeklyReport(userId: string, weekOffset = 0): Promise<WeeklyReportResponse> {
    return this.apiClient.get<WeeklyReportResponse>(
      `/commute/weekly-report/${userId}?weekOffset=${weekOffset}`,
    );
  }

  // ========== Streak APIs ==========

  async getStreak(userId: string): Promise<StreakResponse> {
    return this.apiClient.get<StreakResponse>(`/commute/streak/${userId}`);
  }

  async updateStreakSettings(
    userId: string,
    dto: { weeklyGoal?: number; excludeWeekends?: boolean; reminderEnabled?: boolean },
  ): Promise<{ success: boolean }> {
    return this.apiClient.patch<{ success: boolean }>(
      `/commute/streak/${userId}/settings`,
      dto,
    );
  }

  async getMilestones(userId: string): Promise<MilestonesResponse> {
    return this.apiClient.get<MilestonesResponse>(
      `/commute/streak/${userId}/milestones`,
    );
  }

  // ========== Delay Status APIs ==========

  async getRouteDelayStatus(routeId: string): Promise<DelayStatusResponse> {
    return this.apiClient.get<DelayStatusResponse>(`/routes/${routeId}/delay-status`);
  }
}

// Singleton instance
let commuteApiClientInstance: CommuteApiClient | null = null;

export function getCommuteApiClient(): CommuteApiClient {
  if (!commuteApiClientInstance) {
    commuteApiClientInstance = new CommuteApiClient(new ApiClient());
  }
  return commuteApiClientInstance;
}
