import { ApiClient } from './api-client';

// ========== Types ==========

export interface DepartureAdjustment {
  reason: string;
  minutes: number;
}

export interface DeparturePrediction {
  baseTime: string;
  recommendedTime: string;
  adjustments: DepartureAdjustment[];
  explanation: string;
  confidence: number;
}

export interface UserPattern {
  id: string;
  userId: string;
  patternType: string;
  dayOfWeek?: number;
  weatherCondition?: string;
  averageDepartureTime?: string;
  confidence: number;
  sampleCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BehaviorAnalytics {
  totalPatterns: number;
  totalCommuteRecords: number;
  averageConfidence: number;
  hasEnoughData: boolean;
}

// ========== Pattern ML Types ==========

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

// ========== API Client ==========

export class BehaviorApiClient {
  constructor(private apiClient: ApiClient) {}

  async getOptimalDeparture(
    userId: string,
    alertId: string,
    conditions?: {
      weather?: string;
      temperature?: number;
      isRaining?: boolean;
    },
  ): Promise<DeparturePrediction | null> {
    const params = new URLSearchParams();
    if (conditions?.weather) params.set('weather', conditions.weather);
    if (conditions?.temperature != null) params.set('temperature', String(conditions.temperature));
    if (conditions?.isRaining != null) params.set('isRaining', String(conditions.isRaining));

    const query = params.toString();
    const url = `/behavior/optimal-departure/${userId}/${alertId}${query ? `?${query}` : ''}`;

    const result = await this.apiClient.get<DeparturePrediction | { error: string }>(url);
    if ('error' in result) return null;
    return result;
  }

  async getAnalytics(userId: string): Promise<BehaviorAnalytics> {
    return this.apiClient.get<BehaviorAnalytics>(`/behavior/analytics/${userId}`);
  }

  async getPatterns(userId: string): Promise<UserPattern[]> {
    const result = await this.apiClient.get<{ patterns: UserPattern[] }>(
      `/behavior/patterns/${userId}`,
    );
    return result.patterns;
  }

  async getPrediction(userId: string): Promise<PredictionResponse> {
    return this.apiClient.get<PredictionResponse>(`/behavior/predictions/${userId}`);
  }

  async getInsights(userId: string): Promise<InsightsResponse> {
    return this.apiClient.get<InsightsResponse>(`/behavior/insights/${userId}`);
  }
}

// Singleton
let behaviorApiClientInstance: BehaviorApiClient | null = null;

export function getBehaviorApiClient(): BehaviorApiClient {
  if (!behaviorApiClientInstance) {
    behaviorApiClientInstance = new BehaviorApiClient(new ApiClient());
  }
  return behaviorApiClientInstance;
}
