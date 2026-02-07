import { RouteAnalytics } from '@domain/entities/route-analytics.entity';

export const ROUTE_ANALYTICS_REPOSITORY = Symbol('ROUTE_ANALYTICS_REPOSITORY');

export interface IRouteAnalyticsRepository {
  // 저장/업데이트
  save(analytics: RouteAnalytics): Promise<RouteAnalytics>;

  // 조회
  findByRouteId(routeId: string): Promise<RouteAnalytics | undefined>;

  // 사용자의 모든 경로 분석 조회
  findByUserId(userId: string): Promise<RouteAnalytics[]>;

  // 여러 경로 분석 조회 (비교용)
  findByRouteIds(routeIds: string[]): Promise<RouteAnalytics[]>;

  // 삭제
  deleteByRouteId(routeId: string): Promise<void>;

  // 점수 상위 N개 조회
  findTopScored(userId: string, limit: number): Promise<RouteAnalytics[]>;
}
