import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  HttpStatus,
  Logger,
  UseGuards,
  Request,
  ForbiddenException,
  HttpCode,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CalculateRouteAnalyticsUseCase } from '@application/use-cases/calculate-route-analytics.use-case';
import { RouteAnalytics } from '@domain/entities/route-analytics.entity';
import { AuthenticatedRequest } from '@infrastructure/auth/authenticated-request';

// DTO types
interface RouteAnalyticsResponseDto {
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
  segmentStats: Array<{
    checkpointName: string;
    transportMode: string;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    variability: string;
    sampleCount: number;
  }>;
  conditionAnalysis: {
    byWeather: Record<string, { avgDuration: number; count: number }>;
    byDayOfWeek: Record<string, { avgDuration: number; count: number }>;
    byTimeSlot: Record<string, { avgDuration: number; count: number }>;
  };
  score: number;
  grade: string;
  scoreFactors: {
    speed: number;
    reliability: number;
    comfort: number;
  };
  summary: string;
  variabilityText: string;
  isRecommended: boolean;
  lastCalculatedAt: string;
}

interface RouteComparisonResponseDto {
  routes: RouteAnalyticsResponseDto[];
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

@Controller('analytics')
@UseGuards(AuthGuard('jwt'))
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(
    private readonly calculateAnalyticsUseCase: CalculateRouteAnalyticsUseCase,
  ) {}

  /**
   * 특정 경로의 분석 데이터 조회
   */
  @Get('routes/:routeId')
  async getRouteAnalytics(
    @Param('routeId') routeId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<RouteAnalyticsResponseDto> {
    this.logger.log(`Getting analytics for route ${routeId}`);

    // 권한 검사: 요청한 경로가 사용자 소유인지 확인
    await this.validateRouteOwnership(req.user.userId, [routeId]);

    const analytics = await this.calculateAnalyticsUseCase.execute(routeId);
    return this.toResponseDto(analytics);
  }

  /**
   * 특정 경로의 분석 데이터 재계산
   */
  @Post('routes/:routeId/recalculate')
  @HttpCode(HttpStatus.OK)
  async recalculateRouteAnalytics(
    @Param('routeId') routeId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<RouteAnalyticsResponseDto> {
    this.logger.log(`Recalculating analytics for route ${routeId}`);

    // 권한 검사: 요청한 경로가 사용자 소유인지 확인
    await this.validateRouteOwnership(req.user.userId, [routeId]);

    const analytics = await this.calculateAnalyticsUseCase.execute(routeId);
    return this.toResponseDto(analytics);
  }

  /**
   * 사용자의 모든 경로 분석 조회
   */
  @Get('user/:userId')
  async getUserAnalytics(
    @Param('userId') userId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<RouteAnalyticsResponseDto[]> {
    // 권한 검사: 자신의 데이터만 조회 가능
    if (userId !== req.user.userId) {
      throw new ForbiddenException('다른 사용자의 분석 데이터에 접근할 수 없습니다.');
    }

    this.logger.log(`Getting analytics for user ${userId}`);
    const analyticsArray = await this.calculateAnalyticsUseCase.executeForUser(userId);
    return analyticsArray.map((a) => this.toResponseDto(a));
  }

  /**
   * 경로 비교 분석
   */
  @Get('compare')
  async compareRoutes(
    @Query('routeIds') routeIds: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<RouteComparisonResponseDto> {
    const ids = routeIds.split(',').map((id) => id.trim());

    if (ids.length < 2) {
      throw new Error('비교할 경로를 2개 이상 선택해주세요.');
    }

    if (ids.length > 5) {
      throw new Error('한 번에 최대 5개 경로까지 비교할 수 있습니다.');
    }

    // 권한 검사: 요청한 모든 경로가 사용자 소유인지 확인
    await this.validateRouteOwnership(req.user.userId, ids);

    this.logger.log(`Comparing routes: ${ids.join(', ')}`);
    const comparison = await this.calculateAnalyticsUseCase.compareRoutes(ids);

    return {
      routes: comparison.routes.map((r) => this.toResponseDto(r)),
      winner: comparison.winner,
      analysis: comparison.analysis,
    };
  }

  /**
   * 사용자의 추천 경로 조회 (점수 상위)
   */
  @Get('recommend/:userId')
  async getRecommendedRoutes(
    @Param('userId') userId: string,
    @Query('limit') limit: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<RouteAnalyticsResponseDto[]> {
    // 권한 검사: 자신의 데이터만 조회 가능
    if (userId !== req.user.userId) {
      throw new ForbiddenException('다른 사용자의 추천 데이터에 접근할 수 없습니다.');
    }

    const limitNum = limit ? parseInt(limit, 10) : 3;
    this.logger.log(`Getting top ${limitNum} recommended routes for user ${userId}`);

    const analyticsArray = await this.calculateAnalyticsUseCase.executeForUser(userId);
    const recommended = analyticsArray
      .filter((a) => a.isRecommended())
      .sort((a, b) => b.score - a.score)
      .slice(0, limitNum);

    return recommended.map((a) => this.toResponseDto(a));
  }

  /**
   * 전체 요약 (대시보드용)
   */
  @Get('summary/:userId')
  async getSummary(
    @Param('userId') userId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<{
    totalRoutes: number;
    totalTrips: number;
    averageScore: number;
    bestRoute?: RouteAnalyticsResponseDto;
    mostUsedRoute?: RouteAnalyticsResponseDto;
    insights: string[];
  }> {
    // 권한 검사: 자신의 데이터만 조회 가능
    if (userId !== req.user.userId) {
      throw new ForbiddenException('다른 사용자의 요약 데이터에 접근할 수 없습니다.');
    }

    this.logger.log(`Getting analytics summary for user ${userId}`);
    const analyticsArray = await this.calculateAnalyticsUseCase.executeForUser(userId);

    if (analyticsArray.length === 0) {
      return {
        totalRoutes: 0,
        totalTrips: 0,
        averageScore: 0,
        insights: ['아직 경로 데이터가 없습니다. 경로를 설정하고 측정을 시작해보세요!'],
      };
    }

    const totalTrips = analyticsArray.reduce((sum, a) => sum + a.totalTrips, 0);
    const averageScore = analyticsArray.reduce((sum, a) => sum + a.score, 0) / analyticsArray.length;

    // 최고 점수 경로
    const bestRoute = analyticsArray.reduce((best, current) =>
      current.score > best.score ? current : best
    );

    // 가장 많이 사용한 경로
    const mostUsedRoute = analyticsArray.reduce((most, current) =>
      current.totalTrips > most.totalTrips ? current : most
    );

    // 인사이트 생성
    const insights = this.generateInsights(analyticsArray);

    return {
      totalRoutes: analyticsArray.length,
      totalTrips,
      averageScore: Math.round(averageScore),
      bestRoute: this.toResponseDto(bestRoute),
      mostUsedRoute: this.toResponseDto(mostUsedRoute),
      insights,
    };
  }

  private async validateRouteOwnership(userId: string, routeIds: string[]): Promise<void> {
    const userAnalytics = await this.calculateAnalyticsUseCase.executeForUser(userId);
    const userRouteIds = new Set(userAnalytics.map((a) => a.routeId));
    const unauthorizedIds = routeIds.filter((id) => !userRouteIds.has(id));
    if (unauthorizedIds.length > 0) {
      throw new ForbiddenException('다른 사용자의 경로에 접근할 수 없습니다.');
    }
  }

  private toResponseDto(analytics: RouteAnalytics): RouteAnalyticsResponseDto {
    return {
      routeId: analytics.routeId,
      routeName: analytics.routeName,
      totalTrips: analytics.totalTrips,
      lastTripDate: analytics.lastTripDate?.toISOString(),
      duration: {
        average: Math.round(analytics.duration.average),
        min: analytics.duration.min,
        max: analytics.duration.max,
        stdDev: Math.round(analytics.duration.stdDev * 10) / 10,
      },
      segmentStats: analytics.segmentStats,
      conditionAnalysis: analytics.conditionAnalysis,
      score: analytics.score,
      grade: analytics.getGrade(),
      scoreFactors: analytics.scoreFactors,
      summary: analytics.getSummary(),
      variabilityText: analytics.getVariabilityText(),
      isRecommended: analytics.isRecommended(),
      lastCalculatedAt: analytics.lastCalculatedAt.toISOString(),
    };
  }

  private generateInsights(analyticsArray: RouteAnalytics[]): string[] {
    const insights: string[] = [];

    // 측정 데이터가 충분한 경로만 필터
    const routesWithData = analyticsArray.filter((a) => a.totalTrips >= 3);

    if (routesWithData.length === 0) {
      insights.push('정확한 분석을 위해 각 경로를 3회 이상 측정해주세요.');
      return insights;
    }

    // 가장 빠른 경로 vs 가장 느린 경로
    if (routesWithData.length >= 2) {
      const fastest = routesWithData.reduce((f, c) =>
        c.duration.average < f.duration.average ? c : f
      );
      const slowest = routesWithData.reduce((s, c) =>
        c.duration.average > s.duration.average ? c : s
      );

      const timeDiff = Math.round(slowest.duration.average - fastest.duration.average);
      if (timeDiff >= 5) {
        insights.push(
          `"${fastest.routeName}"이 "${slowest.routeName}"보다 평균 ${timeDiff}분 빨라요.`
        );
      }
    }

    // 가장 일관된 경로
    const mostReliable = routesWithData.reduce((r, c) =>
      c.scoreFactors.reliability > r.scoreFactors.reliability ? c : r
    );
    if (mostReliable.scoreFactors.reliability >= 80) {
      insights.push(
        `"${mostReliable.routeName}"은 ${mostReliable.getVariabilityText()} 경로예요.`
      );
    }

    // 가장 느린 구간 찾기
    for (const analytics of routesWithData.slice(0, 2)) {
      const slowest = analytics.getSlowestSegment();
      if (slowest && slowest.averageDuration >= 15) {
        insights.push(
          `"${analytics.routeName}"에서 "${slowest.checkpointName}" 구간이 가장 오래 걸려요 (평균 ${Math.round(slowest.averageDuration)}분).`
        );
      }
    }

    // 점수 낮은 경로 개선 제안
    const lowScoreRoutes = routesWithData.filter((a) => a.score < 60);
    if (lowScoreRoutes.length > 0) {
      const worst = lowScoreRoutes[0];
      insights.push(
        `"${worst.routeName}"은 개선이 필요해요. 다른 경로를 고려해보세요.`
      );
    }

    return insights.slice(0, 5);
  }
}
