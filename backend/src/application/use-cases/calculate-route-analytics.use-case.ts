import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import {
  ICommuteSessionRepository,
  COMMUTE_SESSION_REPOSITORY,
} from '@domain/repositories/commute-session.repository';
import {
  ICommuteRouteRepository,
  COMMUTE_ROUTE_REPOSITORY,
} from '@domain/repositories/commute-route.repository';
import {
  IRouteAnalyticsRepository,
  ROUTE_ANALYTICS_REPOSITORY,
} from '@domain/repositories/route-analytics.repository';
import { CommuteSession, SessionStatus } from '@domain/entities/commute-session.entity';
import { CommuteRoute, TransportMode } from '@domain/entities/commute-route.entity';
import {
  RouteAnalytics,
  SegmentStats,
  ConditionAnalysis,
  ScoreFactors,
  RouteComparison,
} from '@domain/entities/route-analytics.entity';

@Injectable()
export class CalculateRouteAnalyticsUseCase {
  private readonly logger = new Logger(CalculateRouteAnalyticsUseCase.name);
  private readonly dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

  constructor(
    @Optional()
    @Inject(COMMUTE_SESSION_REPOSITORY)
    private readonly sessionRepository?: ICommuteSessionRepository,
    @Optional()
    @Inject(COMMUTE_ROUTE_REPOSITORY)
    private readonly routeRepository?: ICommuteRouteRepository,
    @Optional()
    @Inject(ROUTE_ANALYTICS_REPOSITORY)
    private readonly analyticsRepository?: IRouteAnalyticsRepository,
  ) {}

  /**
   * 특정 경로의 분석 데이터 계산
   */
  async execute(routeId: string): Promise<RouteAnalytics> {
    if (!this.sessionRepository || !this.routeRepository) {
      throw new Error('Required repositories not available');
    }

    // 경로 정보 조회
    const route = await this.routeRepository.findById(routeId);
    if (!route) {
      throw new Error(`Route not found: ${routeId}`);
    }

    // 완료된 세션 조회
    const sessions = await this.sessionRepository.findByRouteId(routeId);
    const completedSessions = sessions.filter(
      (s) => s.status === SessionStatus.COMPLETED && s.totalDurationMinutes
    );

    // 분석 데이터 계산
    const analytics = this.calculateAnalytics(route, completedSessions);

    // 저장 (repository가 있는 경우)
    if (this.analyticsRepository) {
      return await this.analyticsRepository.save(analytics);
    }

    return analytics;
  }

  /**
   * 사용자의 모든 경로 분석 계산
   */
  async executeForUser(userId: string): Promise<RouteAnalytics[]> {
    if (!this.routeRepository) {
      throw new Error('Route repository not available');
    }

    const routes = await this.routeRepository.findByUserId(userId);
    const results: RouteAnalytics[] = [];

    for (const route of routes) {
      try {
        const analytics = await this.execute(route.id);
        results.push(analytics);
      } catch (error) {
        this.logger.error(`Failed to calculate analytics for route ${route.id}:`, error);
      }
    }

    return results;
  }

  /**
   * 경로 비교 분석
   */
  async compareRoutes(routeIds: string[]): Promise<RouteComparison> {
    const analyticsPromises = routeIds.map((id) => this.execute(id));
    const routes = await Promise.all(analyticsPromises);

    if (routes.length === 0) {
      throw new Error('No routes to compare');
    }

    // 가장 빠른 경로 찾기
    const fastest = routes.reduce((fast, current) =>
      current.duration.average < fast.duration.average ? current : fast
    );

    // 가장 일관된 경로 찾기
    const mostReliable = routes.reduce((reliable, current) =>
      current.scoreFactors.reliability > reliable.scoreFactors.reliability ? current : reliable
    );

    // 종합 추천 (총 점수 기준)
    const recommended = routes.reduce((best, current) =>
      current.score > best.score ? current : best
    );

    // 시간 차이 계산
    const durations = routes.map((r) => r.duration.average);
    const timeDifference = Math.max(...durations) - Math.min(...durations);

    // 신뢰성 차이 계산
    const reliabilities = routes.map((r) => r.scoreFactors.reliability);
    const reliabilityDifference = Math.max(...reliabilities) - Math.min(...reliabilities);

    return {
      routes,
      winner: {
        fastest: fastest.routeId,
        mostReliable: mostReliable.routeId,
        recommended: recommended.routeId,
      },
      analysis: {
        timeDifference: Math.round(timeDifference),
        reliabilityDifference: Math.round(reliabilityDifference),
      },
    };
  }

  private calculateAnalytics(
    route: CommuteRoute,
    sessions: CommuteSession[]
  ): RouteAnalytics {
    if (sessions.length === 0) {
      return new RouteAnalytics(route.id, route.name, {
        totalTrips: 0,
      });
    }

    // 시간 통계 계산
    const durations = sessions.map((s) => s.totalDurationMinutes!);
    const duration = {
      average: this.average(durations),
      min: Math.min(...durations),
      max: Math.max(...durations),
      stdDev: this.standardDeviation(durations),
    };

    // 구간별 통계 계산
    const segmentStats = this.calculateSegmentStats(route, sessions);

    // 조건별 분석 계산
    const conditionAnalysis = this.calculateConditionAnalysis(sessions);

    // 점수 계산
    const scoreFactors = this.calculateScoreFactors(route, duration, segmentStats, sessions);
    const score = Math.round(
      scoreFactors.speed * 0.4 +
      scoreFactors.reliability * 0.4 +
      scoreFactors.comfort * 0.2
    );

    // 마지막 측정일
    const sortedSessions = [...sessions].sort(
      (a, b) => b.startedAt.getTime() - a.startedAt.getTime()
    );
    const lastTripDate = sortedSessions[0]?.startedAt;

    return new RouteAnalytics(route.id, route.name, {
      totalTrips: sessions.length,
      lastTripDate,
      duration,
      segmentStats,
      conditionAnalysis,
      score,
      scoreFactors,
      lastCalculatedAt: new Date(),
    });
  }

  private calculateSegmentStats(
    route: CommuteRoute,
    sessions: CommuteSession[]
  ): SegmentStats[] {
    const stats: SegmentStats[] = [];

    // 체크포인트별로 그룹화
    const checkpointMap = new Map<string, {
      name: string;
      transportMode: string;
      durations: number[];
    }>();

    // 초기화
    for (const cp of route.checkpoints) {
      checkpointMap.set(cp.id, {
        name: cp.name,
        transportMode: cp.transportMode || TransportMode.WALK,
        durations: [],
      });
    }

    // 세션의 체크포인트 기록 수집
    for (const session of sessions) {
      for (const record of session.checkpointRecords) {
        const cpData = checkpointMap.get(record.checkpointId);
        if (cpData && record.durationFromPrevious !== undefined) {
          cpData.durations.push(record.durationFromPrevious);
        }
      }
    }

    // 통계 계산
    for (const [, cpData] of checkpointMap) {
      if (cpData.durations.length === 0) continue;

      const avgDuration = this.average(cpData.durations);
      const stdDev = this.standardDeviation(cpData.durations);
      const variabilityRatio = avgDuration > 0 ? stdDev / avgDuration : 0;

      let variability: 'stable' | 'variable' | 'unpredictable';
      if (variabilityRatio < 0.15) {
        variability = 'stable';
      } else if (variabilityRatio < 0.3) {
        variability = 'variable';
      } else {
        variability = 'unpredictable';
      }

      stats.push({
        checkpointName: cpData.name,
        transportMode: cpData.transportMode,
        averageDuration: Math.round(avgDuration * 10) / 10,
        minDuration: Math.min(...cpData.durations),
        maxDuration: Math.max(...cpData.durations),
        variability,
        sampleCount: cpData.durations.length,
      });
    }

    return stats;
  }

  private calculateConditionAnalysis(sessions: CommuteSession[]): ConditionAnalysis {
    const byWeather: Record<string, { avgDuration: number; count: number }> = {};
    const byDayOfWeek: Record<string, { avgDuration: number; count: number }> = {};
    const byTimeSlot: Record<string, { avgDuration: number; count: number }> = {};

    // 날씨별 그룹화
    const weatherGroups = new Map<string, number[]>();
    for (const session of sessions) {
      const weather = session.weatherCondition || '맑음';
      if (!weatherGroups.has(weather)) {
        weatherGroups.set(weather, []);
      }
      weatherGroups.get(weather)!.push(session.totalDurationMinutes!);
    }
    for (const [weather, durations] of weatherGroups) {
      byWeather[weather] = {
        avgDuration: Math.round(this.average(durations)),
        count: durations.length,
      };
    }

    // 요일별 그룹화
    const dayGroups = new Map<number, number[]>();
    for (const session of sessions) {
      const dayOfWeek = session.startedAt.getDay();
      if (!dayGroups.has(dayOfWeek)) {
        dayGroups.set(dayOfWeek, []);
      }
      dayGroups.get(dayOfWeek)!.push(session.totalDurationMinutes!);
    }
    for (const [day, durations] of dayGroups) {
      byDayOfWeek[this.dayNames[day]] = {
        avgDuration: Math.round(this.average(durations)),
        count: durations.length,
      };
    }

    // 시간대별 그룹화
    const timeSlotGroups = new Map<string, number[]>();
    for (const session of sessions) {
      const hour = session.startedAt.getHours();
      const timeSlot = this.getTimeSlot(hour);
      if (!timeSlotGroups.has(timeSlot)) {
        timeSlotGroups.set(timeSlot, []);
      }
      timeSlotGroups.get(timeSlot)!.push(session.totalDurationMinutes!);
    }
    for (const [slot, durations] of timeSlotGroups) {
      byTimeSlot[slot] = {
        avgDuration: Math.round(this.average(durations)),
        count: durations.length,
      };
    }

    return { byWeather, byDayOfWeek, byTimeSlot };
  }

  private calculateScoreFactors(
    route: CommuteRoute,
    duration: { average: number; min: number; max: number; stdDev: number },
    segmentStats: SegmentStats[],
    sessions: CommuteSession[]
  ): ScoreFactors {
    // 속도 점수: 예상 시간 대비 실제 시간
    const expectedDuration = route.totalExpectedDuration || 60;
    const speedRatio = duration.average / expectedDuration;
    let speedScore: number;
    if (speedRatio <= 1) {
      speedScore = 100;
    } else if (speedRatio <= 1.2) {
      speedScore = 90 - (speedRatio - 1) * 50;
    } else if (speedRatio <= 1.5) {
      speedScore = 80 - (speedRatio - 1.2) * 100;
    } else {
      speedScore = Math.max(50, 70 - (speedRatio - 1.5) * 40);
    }

    // 신뢰성 점수: 표준편차 기준
    const variabilityRatio = duration.stdDev / duration.average;
    let reliabilityScore: number;
    if (variabilityRatio <= 0.1) {
      reliabilityScore = 100;
    } else if (variabilityRatio <= 0.2) {
      reliabilityScore = 90 - (variabilityRatio - 0.1) * 100;
    } else if (variabilityRatio <= 0.3) {
      reliabilityScore = 80 - (variabilityRatio - 0.2) * 100;
    } else {
      reliabilityScore = Math.max(50, 70 - (variabilityRatio - 0.3) * 100);
    }

    // 편의성 점수: 환승 횟수, 대기 시간 비율
    const transferCount = route.checkpoints.filter(
      (cp) => cp.transportMode === TransportMode.TRANSFER
    ).length;
    const avgWaitTime = sessions.length > 0
      ? this.average(sessions.map((s) => s.totalWaitMinutes))
      : 0;
    const waitRatio = duration.average > 0 ? avgWaitTime / duration.average : 0;

    let comfortScore = 100;
    comfortScore -= transferCount * 10;  // 환승당 -10점
    comfortScore -= waitRatio * 50;       // 대기 비율에 따라 최대 -50점
    comfortScore = Math.max(50, comfortScore);

    return {
      speed: Math.round(speedScore),
      reliability: Math.round(reliabilityScore),
      comfort: Math.round(comfortScore),
    };
  }

  private getTimeSlot(hour: number): string {
    if (hour >= 6 && hour < 9) return '출근 시간 (6-9시)';
    if (hour >= 9 && hour < 12) return '오전 (9-12시)';
    if (hour >= 12 && hour < 14) return '점심 (12-14시)';
    if (hour >= 14 && hour < 18) return '오후 (14-18시)';
    if (hour >= 18 && hour < 21) return '퇴근 시간 (18-21시)';
    return '야간 (21시-6시)';
  }

  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  private standardDeviation(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const avg = this.average(numbers);
    const squareDiffs = numbers.map((n) => Math.pow(n - avg, 2));
    return Math.sqrt(this.average(squareDiffs));
  }
}
