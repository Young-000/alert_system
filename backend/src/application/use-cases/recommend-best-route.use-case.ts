import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import {
  ICommuteSessionRepository,
  COMMUTE_SESSION_REPOSITORY,
} from '@domain/repositories/commute-session.repository';
import {
  ICommuteRouteRepository,
  COMMUTE_ROUTE_REPOSITORY,
} from '@domain/repositories/commute-route.repository';
import { CommuteSession, SessionStatus } from '@domain/entities/commute-session.entity';
import {
  RouteRecommendationResponseDto,
  RouteScoreDto,
} from '@application/dto/route-recommendation.dto';

/**
 * 최적 경로 추천 Use Case
 *
 * 3가지 차원으로 경로를 점수화:
 * - 속도 점수 (40%): 평균 소요시간 기반
 * - 안정성 점수 (40%): 변동성 기반
 * - 날씨 영향 점수 (20%): 날씨별 추가 소요시간
 */
@Injectable()
export class RecommendBestRouteUseCase {
  private readonly logger = new Logger(RecommendBestRouteUseCase.name);

  // 점수 가중치
  private readonly WEIGHT_SPEED = 0.4;
  private readonly WEIGHT_RELIABILITY = 0.4;
  private readonly WEIGHT_WEATHER = 0.2;

  // 최소 샘플 수 (신뢰도 계산용)
  private readonly MIN_SAMPLES_HIGH_CONFIDENCE = 10;
  private readonly MIN_SAMPLES_MEDIUM_CONFIDENCE = 5;

  constructor(
    @Optional()
    @Inject(COMMUTE_SESSION_REPOSITORY)
    private readonly sessionRepository?: ICommuteSessionRepository,
    @Optional()
    @Inject(COMMUTE_ROUTE_REPOSITORY)
    private readonly routeRepository?: ICommuteRouteRepository,
  ) {}

  /**
   * 사용자의 최적 경로를 추천합니다.
   * @param userId 사용자 ID
   * @param weatherCondition 현재/예상 날씨 조건 (선택)
   * @param days 분석 기간 (기본 30일)
   */
  async execute(
    userId: string,
    weatherCondition?: string,
    days = 30
  ): Promise<RouteRecommendationResponseDto> {
    if (!this.sessionRepository || !this.routeRepository) {
      return this.emptyResponse('필요한 저장소가 사용 불가능합니다.');
    }

    // 1. 기간 내 완료된 세션 조회
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sessions = await this.sessionRepository.findByUserIdInDateRange(
      userId,
      startDate,
      endDate
    );

    const completedSessions = sessions.filter(
      (s) => s.status === SessionStatus.COMPLETED && s.totalDurationMinutes
    );

    if (completedSessions.length === 0) {
      return this.emptyResponse('아직 통근 데이터가 없어요. 출퇴근을 기록해주세요!');
    }

    // 2. 경로별로 세션 그룹화
    const sessionsByRoute = this.groupSessionsByRoute(completedSessions);

    if (sessionsByRoute.size === 0) {
      return this.emptyResponse('분석할 경로가 없습니다.');
    }

    // 3. Batch-fetch all routes to avoid N+1 query
    const allRoutes = await this.routeRepository.findByUserId(userId);
    const routeMap = new Map(allRoutes.map((r) => [r.id, r]));

    const routeScores: RouteScoreDto[] = [];

    for (const [routeId, routeSessions] of sessionsByRoute) {
      const route = routeMap.get(routeId);
      if (!route) continue;

      const score = this.calculateRouteScore(
        routeId,
        route.name,
        routeSessions,
        weatherCondition,
        sessionsByRoute
      );

      routeScores.push(score);
    }

    // 4. 점수 순 정렬
    routeScores.sort((a, b) => b.totalScore - a.totalScore);

    // 5. 신뢰도 계산
    const totalSamples = completedSessions.length;
    const confidence = this.calculateConfidence(totalSamples);

    // 6. 인사이트 생성
    const insights = this.generateInsights(routeScores, weatherCondition);

    // 7. 응답 구성
    const [best, ...alternatives] = routeScores;

    return {
      recommendedRouteId: best?.routeId || null,
      recommendation: best || null,
      alternatives,
      confidence,
      insights,
      weatherCondition,
    };
  }

  private groupSessionsByRoute(sessions: CommuteSession[]): Map<string, CommuteSession[]> {
    const map = new Map<string, CommuteSession[]>();

    for (const session of sessions) {
      const existing = map.get(session.routeId) || [];
      existing.push(session);
      map.set(session.routeId, existing);
    }

    return map;
  }

  private calculateRouteScore(
    routeId: string,
    routeName: string,
    sessions: CommuteSession[],
    weatherCondition: string | undefined,
    allSessionsByRoute: Map<string, CommuteSession[]>
  ): RouteScoreDto {
    const durations = sessions.map((s) => s.totalDurationMinutes!);

    // 기본 통계
    const averageDuration = this.average(durations);
    const variability = this.standardDeviation(durations);
    const sampleCount = sessions.length;

    // 전체 경로의 평균/최소/최대 계산 (정규화용)
    const allRouteStats = this.calculateAllRouteStats(allSessionsByRoute);

    // 속도 점수 (평균 소요시간이 짧을수록 높은 점수)
    const speedScore = this.normalizeToScore(
      averageDuration,
      allRouteStats.minDuration,
      allRouteStats.maxDuration,
      true // 역순: 낮을수록 좋음
    );

    // 안정성 점수 (변동성이 낮을수록 높은 점수)
    const reliabilityScore = this.normalizeToScore(
      variability,
      allRouteStats.minVariability,
      allRouteStats.maxVariability,
      true // 역순: 낮을수록 좋음
    );

    // 날씨 영향 점수
    const weatherScore = this.calculateWeatherScore(sessions, weatherCondition);

    // 종합 점수
    const totalScore = Math.round(
      speedScore * this.WEIGHT_SPEED +
      reliabilityScore * this.WEIGHT_RELIABILITY +
      weatherScore * this.WEIGHT_WEATHER
    );

    // 추천 이유 생성
    const reasons = this.generateReasons(
      averageDuration,
      variability,
      speedScore,
      reliabilityScore,
      weatherScore,
      allRouteStats
    );

    return {
      routeId,
      routeName,
      totalScore,
      scores: {
        speed: Math.round(speedScore),
        reliability: Math.round(reliabilityScore),
        weatherResilience: Math.round(weatherScore),
      },
      averageDuration: Math.round(averageDuration),
      variability: Math.round(variability * 10) / 10,
      sampleCount,
      reasons,
    };
  }

  private calculateAllRouteStats(sessionsByRoute: Map<string, CommuteSession[]>) {
    const allDurations: number[] = [];
    const allVariabilities: number[] = [];

    for (const sessions of sessionsByRoute.values()) {
      const durations = sessions.map((s) => s.totalDurationMinutes!);
      const avg = this.average(durations);
      const variance = this.standardDeviation(durations);

      allDurations.push(avg);
      allVariabilities.push(variance);
    }

    return {
      minDuration: Math.min(...allDurations),
      maxDuration: Math.max(...allDurations),
      avgDuration: this.average(allDurations),
      minVariability: Math.min(...allVariabilities),
      maxVariability: Math.max(...allVariabilities),
    };
  }

  private normalizeToScore(
    value: number,
    min: number,
    max: number,
    inverse: boolean
  ): number {
    if (max === min) return 75; // 동일하면 기본 점수

    // 0-100 범위로 정규화
    let normalized = ((value - min) / (max - min)) * 100;

    // 역순인 경우 (낮을수록 좋은 경우)
    if (inverse) {
      normalized = 100 - normalized;
    }

    // 50-100 범위로 조정 (너무 낮은 점수 방지)
    return 50 + (normalized * 0.5);
  }

  private calculateWeatherScore(
    sessions: CommuteSession[],
    weatherCondition?: string
  ): number {
    if (!weatherCondition) {
      // 날씨 조건이 없으면 기본 점수
      return 75;
    }

    // 해당 날씨 조건의 세션들
    const weatherSessions = sessions.filter(
      (s) => s.weatherCondition === weatherCondition
    );

    // 맑은 날 세션들 (기준)
    const clearSessions = sessions.filter(
      (s) => s.weatherCondition === '맑음' || !s.weatherCondition
    );

    if (weatherSessions.length < 2 || clearSessions.length < 2) {
      return 75; // 데이터 부족
    }

    const weatherAvg = this.average(weatherSessions.map((s) => s.totalDurationMinutes!));
    const clearAvg = this.average(clearSessions.map((s) => s.totalDurationMinutes!));

    // 날씨로 인한 추가 소요시간
    const weatherImpact = weatherAvg - clearAvg;

    // 영향이 적을수록 높은 점수 (-10분 ~ +10분 범위를 50-100점으로 매핑)
    const clampedImpact = Math.max(-10, Math.min(10, weatherImpact));
    const score = 75 - (clampedImpact * 2.5); // 영향 1분당 ±2.5점

    return Math.max(50, Math.min(100, score));
  }

  private generateReasons(
    avgDuration: number,
    variability: number,
    speedScore: number,
    reliabilityScore: number,
    weatherScore: number,
    allRouteStats: { minDuration: number; avgDuration: number }
  ): string[] {
    const reasons: string[] = [];

    // 속도 관련
    if (speedScore >= 80) {
      reasons.push(`평균 소요 시간이 가장 짧아요 (${Math.round(avgDuration)}분)`);
    } else if (avgDuration <= allRouteStats.avgDuration) {
      reasons.push(`평균 ${Math.round(avgDuration)}분 소요돼요`);
    }

    // 안정성 관련
    if (reliabilityScore >= 80) {
      reasons.push('시간 변동성이 낮아 예측 가능해요');
    } else if (variability <= 5) {
      reasons.push(`소요 시간이 일정해요 (±${Math.round(variability)}분)`);
    }

    // 날씨 영향 관련
    if (weatherScore >= 85) {
      reasons.push('날씨 영향을 적게 받아요');
    }

    // 최소 1개 이유 보장
    if (reasons.length === 0) {
      reasons.push(`평균 ${Math.round(avgDuration)}분 소요돼요`);
    }

    return reasons;
  }

  private generateInsights(
    routeScores: RouteScoreDto[],
    weatherCondition?: string
  ): string[] {
    const insights: string[] = [];

    if (routeScores.length === 0) return insights;

    // 경로 비교 인사이트
    if (routeScores.length >= 2) {
      const [best, second] = routeScores;
      const timeDiff = second.averageDuration - best.averageDuration;

      if (timeDiff > 0) {
        insights.push(
          `"${best.routeName}"이 "${second.routeName}"보다 평균 ${Math.round(timeDiff)}분 빨라요`
        );
      }

      // 안정성 비교
      if (best.scores.reliability - second.scores.reliability >= 15) {
        insights.push(
          `"${best.routeName}"이 시간 예측이 더 잘 돼요`
        );
      }
    }

    // 날씨 영향 인사이트
    if (weatherCondition) {
      const bestWeatherRoute = routeScores.reduce((best, current) =>
        current.scores.weatherResilience > best.scores.weatherResilience ? current : best
      );

      if (bestWeatherRoute.scores.weatherResilience >= 80) {
        insights.push(
          `${weatherCondition} 날에는 "${bestWeatherRoute.routeName}"이 덜 영향받아요`
        );
      }
    }

    // 데이터 부족 경고
    const lowSampleRoutes = routeScores.filter((r) => r.sampleCount < this.MIN_SAMPLES_MEDIUM_CONFIDENCE);
    if (lowSampleRoutes.length > 0) {
      insights.push('일부 경로는 데이터가 부족해 정확도가 낮을 수 있어요');
    }

    return insights.slice(0, 4); // 최대 4개
  }

  private calculateConfidence(totalSamples: number): number {
    if (totalSamples >= this.MIN_SAMPLES_HIGH_CONFIDENCE) {
      return 0.9;
    } else if (totalSamples >= this.MIN_SAMPLES_MEDIUM_CONFIDENCE) {
      return 0.7;
    } else if (totalSamples >= 2) {
      return 0.5;
    }
    return 0.3;
  }

  private emptyResponse(message: string): RouteRecommendationResponseDto {
    return {
      recommendedRouteId: null,
      recommendation: null,
      alternatives: [],
      confidence: 0,
      insights: [message],
    };
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
